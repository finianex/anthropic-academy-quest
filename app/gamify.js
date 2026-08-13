/*
 * app/gamify.js — XP、等級、徽章
 *
 * 核心設計決定：**XP 完全是推導值，不是累加值。**
 *
 * 每次狀態變動就從「已完成的課堂集合 + 筆記 + 徽章」整份重算。這樣做的好處：
 *   - 取消完成時 XP 自動退回，不必寫反向邏輯
 *   - 兩個裝置合併時不會把同一堂課算兩次（累加式一定會）
 *   - 調整 XP 規則之後所有人的數字立刻正確，不需要資料遷移
 * 成本是每次重算要跑一遍最多 444 堂 + 20 門課，實測是微秒級，不值得優化。
 */

import { XP, LEVELS, NOTE_MIN } from './config.js';
import { allCourses, allIslands, allBadges, isVideoOnly } from './catalog.js';

/** xp → 等級資訊，含到下一級的進度。 */
export function levelOf(xp) {
  const x = Math.max(0, xp | 0);
  let i = 0;
  for (let k = 0; k < LEVELS.length; k++) if (x >= LEVELS[k].xp) i = k;
  const cur = LEVELS[i];
  const next = LEVELS[i + 1] || null;
  const span = next ? next.xp - cur.xp : 0;
  const into = x - cur.xp;
  return {
    n: cur.n,
    zh: cur.zh,
    xp: x,
    base: cur.xp,
    nextAt: next ? next.xp : null,
    into,
    span,
    pct: next ? Math.min(100, Math.round((into / span) * 100)) : 100,
    isMax: !next
  };
}

/** 判斷一個徽章的條件是否全部滿足（when 裡的欄位全部 AND）。 */
function badgeMet(badge, f) {
  const w = badge.when || {};
  if (w.lessons && !w.lessons.every((id) => f.done.has(id))) return false;
  if (w.courses && !w.courses.every((s) => f.courseDone.has(s))) return false;
  if (w.visitedCourses && f.visitedCourses < w.visitedCourses) return false;
  if (w.notes && f.notesCount < w.notes) return false;
  if (w.islandsAnyCourse && f.islandsAnyCourse < w.islandsAnyCourse) return false;
  return true;
}

/**
 * 從狀態推導所有衍生數字。
 *
 * @param {object} state  { progress, notes }
 * @returns {object} 完整的衍生檢視
 */
export function derive(state) {
  const progress = state?.progress || {};
  const notes = state?.notes || {};

  /* 已完成的課堂編號（s === 2），以及造訪過的課程 */
  const done = new Set();
  const visited = new Set();
  for (const [slug, cp] of Object.entries(progress)) {
    const lessons = cp?.lessons || {};
    let any = false;
    for (const [id, l] of Object.entries(lessons)) {
      if (!l) continue;
      if (l.s >= 1) any = true;
      if (l.s === 2) done.add(id);
    }
    if (any) visited.add(slug);
  }

  let xp = 0;
  let lessonsDone = 0;
  let sectionsDone = 0;
  const courseDone = new Set();
  const perCourse = new Map();

  for (const c of allCourses()) {
    const per = c.videoOnly ? XP.videoLesson : XP.lesson;
    let cDone = 0;
    for (const l of c.lessons) {
      if (done.has(l.id)) { cDone++; xp += per; }
    }
    lessonsDone += cDone;

    let cSections = 0;
    for (const s of c.sections) {
      if (s.lessonIds.length && s.lessonIds.every((id) => done.has(id))) {
        cSections++;
        xp += XP.section;
      }
    }
    sectionsDone += cSections;

    const complete = c.lessonCount > 0 && cDone === c.lessonCount;
    if (complete) { courseDone.add(c.slug); xp += XP.course; }

    perCourse.set(c.slug, {
      done: cDone,
      total: c.lessonCount,
      pct: c.lessonCount ? Math.round((cDone / c.lessonCount) * 100) : 0,
      complete,
      sectionsDone: cSections
    });
  }

  /* 島嶼 */
  const islandsDone = new Set();
  const islandsTouched = new Set();
  const perIsland = new Map();
  for (const isl of allIslands()) {
    const total = isl.slugs.reduce((n, s) => n + (perCourse.get(s)?.total || 0), 0);
    const d = isl.slugs.reduce((n, s) => n + (perCourse.get(s)?.done || 0), 0);
    const coursesComplete = isl.slugs.filter((s) => courseDone.has(s)).length;
    const allComplete = isl.slugs.length > 0 && coursesComplete === isl.slugs.length;
    if (allComplete) { islandsDone.add(isl.key); xp += XP.island; }
    if (coursesComplete > 0) islandsTouched.add(isl.key);
    perIsland.set(isl.key, {
      done: d, total, pct: total ? Math.round((d / total) * 100) : 0,
      coursesComplete, courses: isl.slugs.length, allComplete
    });
  }

  /* 筆記：只有達到最低字數的才算 */
  let notesCount = 0;
  for (const n of Object.values(notes)) {
    if (n && typeof n.body === 'string' && n.body.trim().length >= NOTE_MIN) notesCount++;
  }
  xp += notesCount * XP.note;

  /* 徽章 */
  const facts = {
    done, courseDone,
    visitedCourses: visited.size,
    notesCount,
    islandsAnyCourse: islandsTouched.size
  };
  const badges = new Set();
  for (const b of allBadges()) {
    if (badgeMet(b, facts)) { badges.add(b.id); xp += b.xp || 0; }
  }

  return {
    xp,
    level: levelOf(xp),
    done,
    lessonsDone,
    sectionsDone,
    coursesDone: courseDone.size,
    courseDone,
    visitedCourses: visited.size,
    notesCount,
    badges,
    islandsDone,
    perCourse,
    perIsland
  };
}

/**
 * 比較兩份衍生結果，找出這次動作實際「賺到」什麼，用來決定顯示哪些 toast。
 * 回傳的順序就是 toast 顯示的順序：XP → 徽章 → 升等（最有份量的放最後）。
 */
export function diff(before, after) {
  const events = [];

  const gained = after.xp - before.xp;
  if (gained > 0) events.push({ type: 'xp', amount: gained });

  for (const id of after.badges) {
    if (!before.badges.has(id)) {
      const b = allBadges().find((x) => x.id === id);
      if (b) events.push({ type: 'badge', badge: b });
    }
  }

  if (after.level.n > before.level.n) {
    events.push({ type: 'level', level: after.level });
  }

  return events;
}

/** 一個地圖節點是否完成（它的所有課堂都完成）。 */
export const nodeDone = (node, done) =>
  node.lessonIds.length > 0 && node.lessonIds.every((id) => done.has(id));

/** 一個地圖節點是否已經開始（有任何一堂完成）。 */
export const nodeStarted = (node, done) => node.lessonIds.some((id) => done.has(id));

/** 一堂課完成能拿多少 XP，用於按鈕上的文案。 */
export const lessonXp = (slug) => (isVideoOnly(slug) ? XP.videoLesson : XP.lesson);
