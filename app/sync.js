/*
 * app/sync.js — 雲端同步
 *
 * 兩個階段：
 *   1. 首次以某個帳號登入 → 拉遠端、合併、覆寫本機、整批寫回
 *   2. 之後 → 寫穿式鏡像：本機永遠先變，雲端在背景追上
 *
 * UI 永遠不等網路。所有 store 的變更函式都是同步回傳的，這裡只是在後面
 * 掛一個非阻塞的推送。離線時 Firestore 的本機快取會把寫入排進佇列，
 * 回線自動送出——所以「離線」在這裡不是特例，只是比較慢的線上。
 *
 * 刻意不用 navigator.onLine 判斷同步狀態：它只表示「連著某個網路」，
 * 不表示「連得到 Firestore」。飯店 wifi、公司 proxy、DNS 壞掉都會讓它
 * 說謊。真正的訊號是我們自己送出的 batch 有沒有被 server ack。
 */

import { KEYS } from './config.js';
import * as local from './local.js';
import * as cloud from './cloud.js';
import * as store from './store.js';
import { mergeAll } from './merge.js';

const PUSH_DEBOUNCE = 1200;

let uid = null;
let snap = null;         // 上次推上去的內容，用來算差異
let timer = null;
let inflight = 0;
let lastError = null;
let merging = false;
const listeners = new Set();

/* XP 的歷史最高值。
 *
 * 安全規則要求 game.xp 單調遞增（連擁有者都不能調降），但使用者確實有
 * 辦法讓推導出的 XP 變小：取消勾選一堂課、或把寫過的筆記清空。這時如果
 * 照實寫入，規則會拒絕——而且拒絕的是整個 writeBatch，連同批的進度與
 * 筆記一起失敗。一次取消勾選就會讓這個帳號從此再也同步不了。
 *
 * 所以雲端存的是「歷史最高分」而不是「當前分數」。這不影響任何行為：
 * 畫面上的 XP 一律由 gamify.derive() 從進度即時重算，雲端那個值只是
 * 紀錄，從來沒有被讀回來當作顯示依據。 */
let xpFloor = 0;

export const status = () => ({
  on: !!uid,
  pending: inflight,
  error: lastError,
  merging
});

export function onStatus(fn) {
  listeners.add(fn);
  try { fn(status()); } catch {}
  return () => listeners.delete(fn);
}

const emit = () => listeners.forEach((fn) => { try { fn(status()); } catch {} });

/* ── 讀遠端 ──────────────────────────────────────────────── */

async function pull(F, db, u) {
  const [userSnap, progSnap, noteSnap] = await Promise.all([
    F.getDoc(cloud.paths.user(F, db, u)),
    F.getDocs(cloud.paths.progressCol(F, db, u)),
    F.getDocs(cloud.paths.noteCol(F, db, u))
  ]);

  const progress = {};
  progSnap.forEach((d) => { progress[d.id] = { lessons: d.data()?.lessons || {} }; });

  const notes = {};
  noteSnap.forEach((d) => {
    const v = d.data() || {};
    notes[d.id] = {
      body: v.body || '',
      // serverTimestamp 讀回來是 Timestamp 物件，要轉成毫秒才能和本機比較
      updatedAt: v.updatedAt?.toMillis?.() ?? v.updatedAtMs ?? 0,
      courseSlug: v.courseSlug ?? null
    };
  });

  return { user: userSnap.exists() ? userSnap.data() : null, progress, notes };
}

/* ── 寫遠端 ──────────────────────────────────────────────── */

/** 把目前狀態切成「每門課一份」的快照，用來和上次推送的內容比對。 */
function snapshotOf(state, view) {
  const courses = {};
  for (const [slug, cp] of Object.entries(state.progress || {})) {
    courses[slug] = JSON.stringify(cp.lessons || {});
  }
  const notes = {};
  for (const [id, n] of Object.entries(state.notes || {})) {
    notes[id] = n?.body || '';
  }
  return {
    courses,
    notes,
    user: JSON.stringify({
      xp: view.xp,
      srs: state.srs,
      seen: state.seen,
      current: state.current,
      reviewXp: state.game?.reviewXp || 0,
      avatar: state.game?.avatar
    })
  };
}

function userPayload(F, state, view, profile) {
  const courses = {};
  for (const [slug, pc] of view.perCourse) {
    if (!state.progress?.[slug]) continue;      // 沒動過的課不必佔位置
    courses[slug] = { done: pc.done, total: pc.total, pct: pc.pct };
  }
  const payload = {
    schema: 1,
    courses,
    current: state.current || null,
    seen: state.seen || {},
    srs: state.srs || {},
    stats: {
      lessonsDone: view.lessonsDone,
      coursesDone: view.coursesDone,
      notesCount: view.notesCount
    },
    game: {
      // 寫歷史最高值，不寫當前值。原因見 xpFloor 的註解。
      xp: Math.max(0, view.xp | 0, xpFloor | 0),
      level: view.level.n,
      reviewXp: state.game?.reviewXp || 0,
      avatar: state.game?.avatar || null,
      // 規則裡 game.updatedAt == request.time。用 merge 寫入時
      // request.resource.data 是「合併後」的文件，舊的時間戳會留著並
      // 導致整批被拒——所以每一次寫入都必須重新蓋上 serverTimestamp。
      updatedAt: F.serverTimestamp()
    }
  };
  if (profile) {
    payload.profile = {
      displayName: profile.displayName || '',
      photoURL: profile.photoURL || null,
      // 規則會比對這個值和 request.auth.token.email，寫錯會整批被拒
      email: profile.email || '',
      updatedAt: F.serverTimestamp()
    };
  }
  return payload;
}

function progressPayload(F, slug, lessons, view) {
  const pc = view.perCourse.get(slug) || { done: 0, total: 0, pct: 0 };
  const ids = Object.keys(lessons);
  const last = ids.reduce((a, b) => ((lessons[b]?.at || 0) > (lessons[a]?.at || 0) ? b : a), ids[0] || '');
  return {
    schema: 1,
    courseSlug: slug,
    lessons,
    total: pc.total,
    done: pc.done,
    pct: pc.pct,
    lastLessonId: last || null,
    lastAt: F.serverTimestamp()      // 規則要求 == request.time
  };
}

/** 算出差異並整批送出。沒有差異就什麼都不做。 */
async function push(force = false) {
  if (!uid) return;
  const state = store.get();
  const view = store.derived();
  const next = snapshotOf(state, view);
  const prev = force ? null : snap;

  const { db, F } = await cloud.ctxAsync();
  const batch = F.writeBatch(db);
  let writes = 0;

  for (const [slug, json] of Object.entries(next.courses)) {
    if (prev && prev.courses[slug] === json) continue;
    batch.set(
      cloud.paths.progress(F, db, uid, slug),
      progressPayload(F, slug, state.progress[slug].lessons || {}, view),
      { merge: true }
    );
    writes++;
  }

  for (const [id, body] of Object.entries(next.notes)) {
    if (prev && prev.notes[id] === body) continue;
    batch.set(cloud.paths.note(F, db, uid, id), {
      lessonId: String(id),                       // 規則會比對它和文件 ID
      body: String(body).slice(0, 20000),
      courseSlug: state.notes[id]?.courseSlug ?? null,
      updatedAt: F.serverTimestamp()
    }, { merge: true });
    writes++;
  }
  // 本機刪掉的筆記要跟著刪，否則下次登入合併會把它救回來
  if (prev) {
    for (const id of Object.keys(prev.notes)) {
      if (id in next.notes) continue;
      batch.delete(cloud.paths.note(F, db, uid, id));
      writes++;
    }
  }

  if (force || !prev || prev.user !== next.user) {
    batch.set(cloud.paths.user(F, db, uid), userPayload(F, state, view, null), { merge: true });
    writes++;
  }

  if (!writes) return;

  inflight++; emit();
  try {
    await batch.commit();
    snap = next;
    xpFloor = Math.max(xpFloor, view.xp | 0);
    lastError = null;
  } catch (e) {
    lastError = e?.code || 'unknown';
    console.warn('[aaq] 同步失敗，資料仍安全存在本機：', e);
  } finally {
    inflight--; emit();
  }
}

function schedulePush() {
  if (!uid) return;
  clearTimeout(timer);
  timer = setTimeout(() => push().catch(() => {}), PUSH_DEBOUNCE);
}

/* ── 生命週期 ────────────────────────────────────────────── */

/**
 * 使用者登入。第一次以這個 uid 登入時做合併，之後只還原鏡像基準。
 * @returns {Promise<{merged:boolean, conflicts:string[]}>}
 */
export async function attach(user) {
  if (!user || !cloud.enabled()) return { merged: false, conflicts: [] };
  const sameAccount = local.read(KEYS.uid, null) === user.uid;
  uid = user.uid;
  merging = !sameAccount;
  emit();

  try {
    const { db, F } = await cloud.ctxAsync();
    const remote = await pull(F, db, uid);

    // 規則不允許調降，所以起跳點必須是遠端已經有的值
    xpFloor = Math.max(0, remote.user?.game?.xp | 0);

    let conflicts = [];
    if (!sameAccount || remote.user) {
      const base = local.read(KEYS.noteBase, {}) || {};
      const res = mergeAll(store.get(), remote, base, store.DEFAULT_AVATAR);
      conflicts = res.conflicts;
      store.replaceAll(res.state);
    }

    // 合併後整批寫回，並記下這次同步的基準時間，供下次判斷「誰動過」
    const view = store.derived();
    const state = store.get();
    const batch = F.writeBatch(db);
    batch.set(cloud.paths.user(F, db, uid), userPayload(F, state, view, user), { merge: true });
    for (const [slug, cp] of Object.entries(state.progress || {})) {
      batch.set(cloud.paths.progress(F, db, uid, slug),
        progressPayload(F, slug, cp.lessons || {}, view), { merge: true });
    }
    for (const [id, n] of Object.entries(state.notes || {})) {
      batch.set(cloud.paths.note(F, db, uid, id), {
        lessonId: String(id),
        body: String(n.body || '').slice(0, 20000),
        courseSlug: n.courseSlug ?? null,
        updatedAt: F.serverTimestamp()
      }, { merge: true });
    }

    inflight++; emit();
    try {
      await batch.commit();
      xpFloor = Math.max(xpFloor, view.xp | 0);
      lastError = null;
    } catch (e) {
      lastError = e?.code || 'unknown';
      console.warn('[aaq] 首次同步失敗：', e);
    } finally { inflight--; }

    const now = Date.now();
    const base = {};
    for (const id of Object.keys(store.get().notes || {})) base[id] = { at: now };
    local.write(KEYS.noteBase, base);
    local.write(KEYS.uid, uid);

    snap = snapshotOf(store.get(), store.derived());
    store.subscribe(schedulePush);

    // 分頁要關了：把還沒送出的變更立刻推出去，不等 debounce
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') { clearTimeout(timer); push().catch(() => {}); }
    });

    merging = false; emit();
    return { merged: !sameAccount, conflicts };
  } catch (e) {
    merging = false;
    lastError = e?.code || 'unknown';
    emit();
    console.warn('[aaq] 連接雲端失敗，以本機模式繼續：', e);
    return { merged: false, conflicts: [] };
  }
}

/** 登出：停止同步，但不動本機資料（那由 auth.signOut 決定）。 */
export function detach() {
  clearTimeout(timer);
  uid = null;
  snap = null;
  xpFloor = 0;
  lastError = null;
  emit();
}

/** 手動立刻同步，給「重試」按鈕用。 */
export const flush = () => push(true);
