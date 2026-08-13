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

const DEFAULT_AVATAR = {
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
  seen: {}        // 一次性提示
};

let view = null;
const subs = new Set();

/* ── 生命週期 ────────────────────────────────────────────── */

export function init() {
  state.progress = local.read(KEYS.progress, {}) || {};
  state.notes    = local.read(KEYS.notes, {}) || {};
  state.current  = local.read(KEYS.current, null);
  state.seen     = local.read(KEYS.seen, {}) || {};

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
export function markLessons(slug, ids, complete = true) {
  if (!slug || !ids?.length) return [];
  const now = Date.now();
  return commit([KEYS.progress, KEYS.current], () => {
    for (const id of ids) {
      const s = slot(slug, id);
      s.s = complete ? 2 : 1;
      s.at = now;
    }
    state.current = { courseSlug: slug, lessonId: ids[ids.length - 1], at: now };
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

/* ── 重設（測試與「清除此裝置資料」用）─────────────────────── */

export function resetAll() {
  local.clearAll();
  state.progress = {};
  state.notes = {};
  state.current = null;
  state.seen = {};
  state.game = { avatar: { ...DEFAULT_AVATAR } };
  view = derive(state);
  notify();
}
