/*
 * app/cloud.js — Firebase SDK 延遲載入
 *
 * 為什麼是動態 import 而不是 <script>：匿名訪客佔絕大多數，而且這個站
 * 未登入時功能完整。把三個 SDK 模組（約 300 KB）綁在首屏，等於讓所有人
 * 為少數人的登入付費。改成點下去才載之後，匿名訪客為 Firebase 下載
 * 零位元組。
 *
 * 回訪者（authHint === '1'）例外：他們幾乎一定會登入，所以在 idle 時
 * 預先載入，讓「還原登入狀態」不用等網路。
 *
 * 三個 gstatic 檔案的版本號必須一致，否則會出現 duplicate-app：
 * 不同版本的 firebase-app 會各自建立自己的 app registry，
 * getAuth() 拿到的實例與 initializeApp() 建立的不是同一個。
 */

import { FIREBASE, FIREBASE_VERSION, FIREBASE_APP_NAME, KEYS } from './config.js';
import * as local from './local.js';

const BASE = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/`;

/** 設定沒填時整個雲端層關閉，全站退回純 localStorage。 */
export const enabled = () => !!(FIREBASE && FIREBASE.apiKey && FIREBASE.projectId);

let sdkPromise = null;
let ctx = null;

/** 載入三個模組。重複呼叫共用同一個 promise。 */
export function loadSdk() {
  if (!enabled()) return Promise.reject(new Error('Firebase 未設定'));
  return (sdkPromise ||= Promise.all([
    import(/* @vite-ignore */ BASE + 'firebase-app.js'),
    import(/* @vite-ignore */ BASE + 'firebase-auth.js'),
    import(/* @vite-ignore */ BASE + 'firebase-firestore.js')
  ]).then(([app, auth, fs]) => ({ app, auth, fs })));
}

/**
 * 取得 { app, auth, db } 與兩個 SDK 命名空間。
 *
 * 具名 app 實例（'aaq'）不是裝飾：GitHub Pages 與 Firebase Hosting 上
 * 都可能有同網域的其他 Firebase 專案，用預設實例會互相覆蓋。
 */
export async function ctxAsync() {
  if (ctx) return ctx;
  const { app, auth, fs } = await loadSdk();

  const fbApp = app.getApps().find((a) => a.name === FIREBASE_APP_NAME)
    || app.initializeApp(FIREBASE, FIREBASE_APP_NAME);

  const fbAuth = auth.getAuth(fbApp);
  // 登入狀態撐過關閉分頁；失敗（Safari 無痕、部分 webview）就退回記憶體，
  // 使用者只是每次都要重新登入，功能不掛。
  try {
    await auth.setPersistence(fbAuth, auth.browserLocalPersistence);
  } catch {
    try { await auth.setPersistence(fbAuth, auth.inMemoryPersistence); } catch {}
  }

  /* IndexedDB 快取讓離線也能讀寫、回線再送出。多分頁管理器避免兩個分頁
     搶同一份快取而互相踢掉。拒絕 IndexedDB 的環境退回記憶體快取——
     那樣離線就沒有佇列，但線上功能完全一樣。 */
  let db;
  try {
    db = fs.initializeFirestore(fbApp, {
      localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() })
    });
  } catch {
    try {
      db = fs.initializeFirestore(fbApp, { localCache: fs.memoryLocalCache() });
    } catch {
      db = fs.getFirestore(fbApp);   // 已經初始化過，直接取用
    }
  }

  ctx = { fbApp, auth: fbAuth, db, A: auth, F: fs };
  return ctx;
}

/** 回訪者在瀏覽器閒下來時預載，讓還原登入狀態不用等網路。 */
export function warm() {
  if (!enabled() || local.read(KEYS.authHint, null) !== '1') return;
  const go = () => { loadSdk().catch(() => {}); };
  if ('requestIdleCallback' in window) window.requestIdleCallback(go, { timeout: 3000 });
  else setTimeout(go, 1200);
}

/* ── 文件路徑 ─────────────────────────────────────────────────
   規則裡 /users/{uid} 沒有給 list，所以這裡也沒有任何集合查詢的
   輔助函式——那是刻意的，不是遺漏。 */

export const paths = {
  user:     (F, db, uid)       => F.doc(db, 'users', uid),
  progress: (F, db, uid, slug) => F.doc(db, 'users', uid, 'progress', slug),
  note:     (F, db, uid, id)   => F.doc(db, 'users', uid, 'notes', String(id)),
  progressCol: (F, db, uid)    => F.collection(db, 'users', uid, 'progress'),
  noteCol:     (F, db, uid)    => F.collection(db, 'users', uid, 'notes')
};
