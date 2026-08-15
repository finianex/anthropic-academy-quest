/*
 * app/store.js — 狀態單一來源
 *
 * Phase 1 只有 localStorage。Phase 2 會在 commit() 之後追加一個
 * fire-and-forget 的雲端寫入，但 UI 永遠不等網路——commit 先更新畫面，
 * 同步在背景跑。這是為什麼所有變更函式都是同步回傳的。
 */

import { KEYS, NOTE_MAX } from './config.js';
import * as local from './local.js';
import { derive, diff } from './gamify.js';
import { lessonLookup } from './catalog.js';
import { grade } from './srs.js';

export const DEFAULT_AVATAR = {
  body: 'cat',
  tint: 'green',
  hat: null,
  scarf: null,
  hold: null,
  pet: null
};

const state = {
  schema: 1,
  progress: {},   // { [slug]: { lessons: { [id]: { s, at, v } } } }
  notes: {},      // { [lessonId]: { body, updatedAt, courseSlug } }
  game: { avatar: { ...DEFAULT_AVATAR } },
  current: null,  // { courseSlug, lessonId, at }
  seen: {},       // 一次性提示
  srs: {}         // { [itemKey]: { s, due, n, w } } 間隔重複
};

let view = null;
const subs = new Set();

/* ── 生命週期 ────────────────────────────────────────────── */

export function init() {
  state.progress = local.read(KEYS.progress, {}) || {};
  state.notes    = local.read(KEYS.notes, {}) || {};
  state.current  = local.read(KEYS.current, null);
  state.seen     = local.read(KEYS.seen, {}) || {};
  state.srs      = local.read(KEYS.srs, {}) || {};

  /* 排序題（key 前綴 w:）已經移除。舊使用者的 SRS 裡還留著這些項目，
     它們現在出不了題，留著只會讓首頁的「到期題數」多算——那個數字算的是
     key，但複習頁真的去建題時會全部拿到 null，於是承諾 5 題卻只出 3 題。
     一次性清掉，之後就不會再產生。 */
  const stale = Object.keys(state.srs).filter((k) => k.startsWith('w:'));
  if (stale.length) {
    stale.forEach((k) => delete state.srs[k]);
    local.write(KEYS.srs, state.srs);
  }

  const g = local.read(KEYS.game, null);
  state.game = {
    ...g,
    avatar: { ...DEFAULT_AVATAR, ...(g?.avatar || {}) }
  };

  view = derive(state);
  return view;
}

export const get = () => state;
export const derived = () => (view ||= derive(state));

export function subscribe(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}

function notify() {
  subs.forEach((fn) => { try { fn(view, state); } catch (e) { console.error(e); } });
}

/**
 * 套用一次變更：重算衍生值 → 存檔 → 通知 → 回傳這次賺到什麼。
 * 只寫真正動到的鍵，避免每次變更都重寫全部資料。
 */
function commit(keys, mutate) {
  const before = derived();
  mutate();
  view = derive(state);
  for (const k of keys) {
    if (k === KEYS.progress) local.write(k, state.progress);
    else if (k === KEYS.notes) local.write(k, state.notes);
    else if (k === KEYS.current) local.write(k, state.current);
    else if (k === KEYS.game) local.write(k, state.game);
    else if (k === KEYS.seen) local.write(k, state.seen);
    else if (k === KEYS.srs) local.write(k, state.srs);
  }
  notify();
  return diff(before, view);
}

/* ── 進度 ────────────────────────────────────────────────── */

function slot(slug, id) {
  const cp = (state.progress[slug] ||= { lessons: {} });
  return (cp.lessons[id] ||= { s: 0, at: 0, v: 0 });
}

/** 課堂狀態：0 未見 / 1 造訪過 / 2 完成。 */
export const lessonState = (slug, id) => state.progress[slug]?.lessons?.[id]?.s ?? 0;

/**
 * 標記／取消標記一批課堂。
 * 一般課堂傳一個 id；純影片課的章節節點會一次傳該章節全部課堂。
 */
export function markLessons(slug, ids, complete = true, opts = {}) {
  if (!slug || !ids?.length) return [];
  const now = Date.now();
  return commit([KEYS.progress, KEYS.current], () => {
    for (const id of ids) {
      const s = slot(slug, id);
      s.s = complete ? 2 : 1;
      s.at = now;
      // 全對旗標只在達成時寫入，取消完成時清掉——這樣衍生的 XP 才會跟著退回
      if (!complete) delete s.p;
      else if (opts.perfect) s.p = true;
    }
    state.current = { courseSlug: slug, lessonId: ids[ids.length - 1], at: now };
  });
}

/** 複習答對累加的 XP。全站唯一的累加值，原因見 gamify.derive 的註解。 */
export function addReviewXp(n) {
  if (!n) return [];
  return commit([KEYS.game], () => {
    state.game.reviewXp = Math.max(0, (state.game.reviewXp | 0) + n);
  });
}

/** 造訪一堂課：把狀態推到至少 1，並更新「腳色站在哪」。不給 XP。 */
export function visit(slug, id) {
  if (!slug || !id) return [];
  const cur = lessonState(slug, id);
  const sameSpot = state.current?.courseSlug === slug && state.current?.lessonId === id;
  if (cur >= 1 && sameSpot) return [];   // 什麼都沒變，別白寫一次

  const now = Date.now();
  return commit([KEYS.progress, KEYS.current], () => {
    const s = slot(slug, id);
    if (s.s < 1) s.s = 1;
    s.v = (s.v || 0) + 1;
    s.at = s.at || now;
    state.current = { courseSlug: slug, lessonId: id, at: now };
  });
}

export const current = () => state.current;

/* ── 筆記 ────────────────────────────────────────────────── */

export const noteBody = (id) => state.notes[id]?.body ?? '';

export function saveNote(lessonId, body) {
  const trimmed = String(body ?? '').slice(0, NOTE_MAX);
  const existing = state.notes[lessonId];
  if ((existing?.body ?? '') === trimmed) return [];

  const slug = lessonLookup(lessonId)?.slug ?? null;
  return commit([KEYS.notes, KEYS.progress], () => {
    if (!trimmed) {
      delete state.notes[lessonId];
    } else {
      state.notes[lessonId] = { body: trimmed, updatedAt: Date.now(), courseSlug: slug };
    }
    // 在 progress 上留一個「這堂有筆記」的旗標：Phase 2 之後，側欄要顯示筆記圖示
    // 就不必去讀任何一份筆記文件
    if (slug) {
      const s = slot(slug, lessonId);
      s.n = !!trimmed;
      if (s.s < 1) s.s = 1;
    }
  });
}

export const allNotes = () => state.notes;

/* ── 間隔重複 ────────────────────────────────────────────── */

export const srs = () => state.srs;
export const srsOf = (key) => state.srs[key] || null;

/**
 * 記錄一場練習的作答結果。
 * results 來自 session.results()：[{ id, ok }]，ok 表示「第一次就答對」。
 * 只寫 SRS，不動進度與 XP——那由呼叫端另外決定。
 */
export function gradeItems(results) {
  if (!results?.length) return [];
  const now = Date.now();
  return commit([KEYS.srs], () => {
    for (const { id, ok } of results) {
      state.srs[id] = grade(state.srs[id], ok, now);
    }
  });
}

/* ── 腳色 ────────────────────────────────────────────────── */

export const avatar = () => state.game.avatar;

export function setAvatar(patch) {
  return commit([KEYS.game], () => {
    state.game.avatar = { ...state.game.avatar, ...patch };
  });
}

/* ── 一次性提示 ──────────────────────────────────────────── */

export const hasSeen = (key) => !!state.seen[key];

export function markSeen(key) {
  if (state.seen[key]) return [];
  return commit([KEYS.seen], () => { state.seen[key] = Date.now(); });
}

/**
 * 用一份新狀態整個取代目前狀態，並寫回 localStorage。
 * 只有登入合併會用到——合併是唯一一個「整份狀態被重算」的場景，
 * 走 commit() 的逐鍵寫入反而會漏掉沒動到的鍵。
 */
export function replaceAll(next) {
  state.progress = next.progress || {};
  state.notes    = next.notes || {};
  state.srs      = next.srs || {};
  state.seen     = next.seen || {};
  state.current  = next.current || null;
  state.game     = { ...next.game, avatar: { ...DEFAULT_AVATAR, ...(next.game?.avatar || {}) } };

  local.write(KEYS.progress, state.progress);
  local.write(KEYS.notes, state.notes);
  local.write(KEYS.srs, state.srs);
  local.write(KEYS.seen, state.seen);
  local.write(KEYS.current, state.current);
  local.write(KEYS.game, state.game);

  view = derive(state);
  notify();
  return view;
}

/* ── 重設（測試與「清除此裝置資料」用）─────────────────────── */

export function resetAll() {
  local.clearAll();
  state.progress = {};
  state.notes = {};
  state.current = null;
  state.seen = {};
  state.srs = {};
  state.game = { avatar: { ...DEFAULT_AVATAR } };
  view = derive(state);
  notify();
}
