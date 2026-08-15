/*
 * app/auth.js — Google 登入
 *
 * 為什麼是 popup 不是 redirect：signInWithRedirect 需要從
 * <project>.firebaseapp.com 的第三方情境讀狀態，在限制第三方儲存的
 * 瀏覽器（Safari 16.1+、Firefox ETP strict、Chrome 限制第三方 cookie）
 * 會直接失敗。官方修法是把 /__/auth/** 反向代理到自己的網域——本站
 * 部署在 Firebase Hosting，那條路徑天生就有，但 popup 在所有情境下
 * 都能運作，沒有理由為了 redirect 增加一個會壞的變因。
 *
 * popup 的代價是必須由使用者手勢觸發。SDK 是延遲載入的，await 會切斷
 * 手勢鏈，所以在滑鼠移到按鈕上、或按鈕取得焦點時就先預熱；真的被擋下
 * 就明確告訴使用者再按一次（第二次 SDK 已在快取，不會再 await）。
 */

import { KEYS } from './config.js';
import * as local from './local.js';
import * as cloud from './cloud.js';

const listeners = new Set();
let user = null;          // { uid, displayName, photoURL, email } | null
let ready = false;        // onAuthStateChanged 是否已經回報過一次
let started = false;

export const currentUser = () => user;
export const isReady = () => ready;

/** 只允許 https 的頭像網址。Google 的 photoURL 完全由使用者端控制，
 *  而它會被塞進 <img src>；擋掉 javascript: 這類 scheme 是必要的。 */
export function safePhoto(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' ? u.href : null;
  } catch { return null; }
}

function slim(u) {
  return u && {
    uid: u.uid,
    displayName: u.displayName || '',
    photoURL: safePhoto(u.photoURL),
    email: u.email || ''
  };
}

function emit() {
  listeners.forEach((fn) => { try { fn(user, ready); } catch (e) { console.error(e); } });
}

/** 訂閱登入狀態。註冊當下會立刻收到一次目前狀態。 */
export function onAuth(fn) {
  listeners.add(fn);
  try { fn(user, ready); } catch (e) { console.error(e); }
  return () => listeners.delete(fn);
}

/**
 * 開始監聽登入狀態。沒有設定 Firebase、或使用者從未登入過時，
 * 不會載入任何 SDK——這是匿名訪客零成本的關鍵。
 */
export async function start() {
  if (started || !cloud.enabled()) { ready = true; emit(); return; }
  started = true;

  // 從未登入過就不必載 SDK。之後按下登入按鈕會走 signIn()，那裡會載。
  if (local.read(KEYS.authHint, null) !== '1') { ready = true; emit(); return; }

  try {
    const { auth, A } = await cloud.ctxAsync();
    A.onAuthStateChanged(auth, (u) => {
      user = slim(u);
      ready = true;
      if (user) {
        local.write(KEYS.authHint, '1');
        local.write(KEYS.profile, { name: user.displayName, photo: user.photoURL });
      } else {
        local.remove(KEYS.authHint);
      }
      emit();
    });
  } catch (e) {
    console.warn('[aaq] 登入狀態還原失敗，以未登入狀態繼續：', e);
    ready = true;
    emit();
  }
}

/** 預熱：滑到登入按鈕上就先載 SDK，避免點擊時 await 切斷手勢鏈。 */
export function prewarm() {
  if (cloud.enabled()) cloud.loadSdk().catch(() => {});
}

/**
 * Google 登入。必須從使用者手勢呼叫。
 * @returns {Promise<{ok:boolean, user?:object, code?:string, message?:string}>}
 */
export async function signIn() {
  if (!cloud.enabled()) return { ok: false, code: 'disabled', message: '這個站台沒有設定登入。' };
  try {
    const { auth, A } = await cloud.ctxAsync();
    const provider = new A.GoogleAuthProvider();
    // 每次都問要用哪個帳號：學校或組織的裝置常常同時登著多個 Google 帳號，
    // 預設沉默地挑一個會讓人把進度存到錯的帳號上。
    provider.setCustomParameters({ prompt: 'select_account' });

    const cred = await A.signInWithPopup(auth, provider);
    user = slim(cred.user);
    ready = true;
    local.write(KEYS.authHint, '1');
    local.write(KEYS.profile, { name: user.displayName, photo: user.photoURL });
    if (!started) { started = true; A.onAuthStateChanged(auth, (u) => { user = slim(u); emit(); }); }
    emit();
    return { ok: true, user };
  } catch (e) {
    return { ok: false, code: e?.code || 'unknown', message: friendly(e) };
  }
}

/** 把 Firebase 的錯誤碼翻成使用者看得懂、而且知道下一步怎麼做的句子。 */
function friendly(e) {
  switch (e?.code) {
    case 'auth/popup-blocked':
      return '瀏覽器擋下了登入視窗。請允許這個網站開啟彈出視窗，然後再按一次登入。';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return '登入視窗被關掉了，沒有變更任何資料。';
    case 'auth/network-request-failed':
      return '連不上網路。你的進度仍然存在這台裝置上，等連線恢復再登入即可。';
    case 'auth/unauthorized-domain':
      return '這個網域沒有被授權登入。如果你是從預覽網址進來的，請改用正式網址。';
    case 'auth/operation-not-allowed':
      return '這個專案還沒啟用 Google 登入。';
    default:
      // LINE／FB／IG 的站內瀏覽器會被 Google 主動拒絕，錯誤碼不固定，
      // 但在台灣這是最常見的失敗情境，所以一併提示。
      return `登入失敗（${e?.code || '未知錯誤'}）。如果你是從 LINE 或 Facebook 的內建瀏覽器開啟本站，請改用 Chrome、Safari 或 Edge。`;
  }
}

/**
 * 登出。
 * @param {boolean} wipe true = 連同這台裝置的學習資料一起清掉
 *
 * 預設只清掉帳號相關的鍵，保留進度與遊戲狀態：那些資料不敏感，離線仍然
 * 有用，而且使用者很可能只是想以匿名身分繼續讀。清掉 uid 是下次換帳號
 * 登入時能觸發合併的保證。
 */
export async function signOut(wipe = false) {
  try {
    if (cloud.enabled() && (started || user)) {
      const { auth, A } = await cloud.ctxAsync();
      await A.signOut(auth);
    }
  } catch (e) {
    console.warn('[aaq] 登出時發生錯誤：', e);
  }

  user = null;
  local.remove(KEYS.authHint);
  local.remove(KEYS.profile);
  local.remove(KEYS.uid);
  local.remove(KEYS.noteBase);

  if (wipe) {
    local.clearAll();
    try {
      const { db, F } = await cloud.ctxAsync();
      await F.clearIndexedDbPersistence(db);
    } catch { /* 有分頁還開著就清不掉，這不是錯誤 */ }
  }

  emit();
  return { ok: true, wiped: wipe };
}
