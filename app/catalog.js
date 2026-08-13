/*
 * app/catalog.js — 對 content/*.js 的唯讀轉接層
 *
 * content/ 底下的檔案是 classic script，直接掛 window 全域。ES module 隱含 defer，
 * 所以模組開始執行時那些全域早就就緒了——這是刻意的設計，讓 590 KB 的資料檔
 * 一行都不用改。
 *
 * 這一層負責三件在原始資料裡沒有的事：
 *   1. 過濾掉 19 個沒有課堂的空章節（全部是尾端的「關於本課程」）
 *   2. 為 2 門「課堂在第一個章節之前」的課補上隱含章節
 *      （introduction-to-agent-skills、introduction-to-subagents）
 *   3. 把 444 堂課摺疊成 199 個地圖節點：有筆記的課一堂一節點，
 *      純影片課一個章節一節點
 */

import { OFFICIAL_BASE } from './config.js';

const zhOf = (o) => (o && (o.zhTitle || o.title)) || '';

let _index = null;

function globals() {
  return {
    courses:   window.ACADEMY_COURSES        || [],
    catalogs:  window.ACADEMY_CATALOGS       || [],
    official:  window.ACADEMY_OFFICIAL       || {},
    videoOnly: window.ACADEMY_VIDEO_ONLY     || [],
    paths:     window.ACADEMY_PATHS          || [],
    notes:     window.ACADEMY_LESSON_NOTES   || null,   // 地圖頁刻意不載入這個
    islandDefs:window.ACADEMY_ISLANDS        || [],
    route:     window.ACADEMY_ROUTE          || [],
    branches:  window.ACADEMY_BRANCHES       || {},
    prereq:    window.ACADEMY_PREREQ         || {},
    badges:    window.ACADEMY_BADGES         || [],
    landmark:  window.ACADEMY_PATH_LANDMARK  || null
  };
}

/** 一次 O(577) 的建索引，之後所有查詢都是 Map 查表，不在渲染迴圈裡跑 find()。 */
export function index() {
  if (_index) return _index;
  const g = globals();

  const routePos = new Map();
  g.route.forEach((r, i) => routePos.set(r.slug, { branch: r.branch, order: i }));

  const bySlug = new Map();
  const byLesson = new Map();

  for (const cat of g.catalogs) {
    const course = g.courses.find((c) => c.slug === cat.slug);
    if (!course) continue;

    const sections = [];
    const lessons = [];
    let cur = null;

    for (const entry of cat.entries) {
      if (entry.type === 'section') {
        // 先開一個章節，等真的有課堂再收進 sections —— 這樣空章節自動被丟掉
        cur = { zh: zhOf(entry), en: entry.title || '', lessonIds: [], implicit: false };
        continue;
      }
      if (!cur) {
        // 課堂出現在任何章節之前：補一個隱含章節
        cur = { zh: '課程開始', en: '', lessonIds: [], implicit: true };
      }
      if (!sections.includes(cur)) sections.push(cur);

      const lesson = {
        id: entry.id,
        zh: zhOf(entry),
        en: entry.title || '',
        sectionIndex: sections.length - 1
      };
      cur.lessonIds.push(entry.id);
      lessons.push(lesson);
      byLesson.set(entry.id, { slug: cat.slug, lesson });
    }

    sections.forEach((s, i) => { s.index = i; });

    const rp = routePos.get(cat.slug);
    const islandDef = g.islandDefs.find((i) => i.category === course.category);

    bySlug.set(cat.slug, {
      slug: cat.slug,
      course,
      official: g.official[cat.slug] || {},
      videoOnly: g.videoOnly.includes(cat.slug),
      islandKey: islandDef ? islandDef.key : null,
      branch: rp ? rp.branch : null,
      routeOrder: rp ? rp.order : 9999,
      lessons,
      sections,
      lessonCount: lessons.length
    });
  }

  const islands = g.islandDefs.map((def) => {
    const slugs = [...bySlug.values()]
      .filter((c) => c.islandKey === def.key)
      .sort((a, b) => a.routeOrder - b.routeOrder)
      .map((c) => c.slug);
    const lessonTotal = slugs.reduce((n, s) => n + bySlug.get(s).lessonCount, 0);
    return { ...def, slugs, lessonTotal };
  });

  _index = {
    bySlug, byLesson, islands,
    route: g.route,
    branches: g.branches,
    prereq: g.prereq,
    badges: g.badges,
    paths: g.paths,
    landmark: g.landmark,
    totalLessons: [...bySlug.values()].reduce((n, c) => n + c.lessonCount, 0)
  };
  return _index;
}

/* ── 課程 ─────────────────────────────────────────────────── */

export const info        = (slug) => index().bySlug.get(slug) || null;
export const allCourses  = () => [...index().bySlug.values()].sort((a, b) => a.routeOrder - b.routeOrder);
export const lessonsOf   = (slug) => info(slug)?.lessons ?? [];
export const sectionsOf  = (slug) => info(slug)?.sections ?? [];
export const lessonCount = (slug) => info(slug)?.lessonCount ?? 0;
export const isVideoOnly = (slug) => info(slug)?.videoOnly ?? false;
export const courseTitle = (slug) => info(slug)?.course.zhTitle ?? slug;

/** 這堂課屬於哪一門課、哪一個章節。 */
export function lessonLookup(lessonId) {
  const hit = index().byLesson.get(lessonId);
  if (!hit) return null;
  const c = info(hit.slug);
  return { ...hit, course: c, section: c.sections[hit.lesson.sectionIndex] || null };
}

/** 在該課程裡的位置與前後鄰居，供課堂頁的上下一課使用。 */
export function positionOf(slug, lessonId) {
  const ls = lessonsOf(slug);
  const i = ls.findIndex((l) => l.id === lessonId);
  if (i < 0) return null;
  return {
    index: i,
    number: i + 1,
    total: ls.length,
    prev: i > 0 ? ls[i - 1] : null,
    next: i < ls.length - 1 ? ls[i + 1] : null
  };
}

/* ── 島嶼 ─────────────────────────────────────────────────── */

export const allIslands = () => index().islands;
export const island     = (key) => index().islands.find((i) => i.key === key) || null;
export const branchInfo = (key) => index().branches[key] || null;
export const landmark   = () => index().landmark;

/* ── 先修 ─────────────────────────────────────────────────── */

export function prereqOf(slug) {
  const p = index().prereq[slug];
  if (!p) return null;
  return { ...p, titles: p.on.map((s) => courseTitle(s)) };
}

export const allBadges = () => index().badges;

/* ── 筆記 ─────────────────────────────────────────────────── */

/**
 * 取得某堂課的中文筆記。
 * 只有 lesson.html 會載入 content/notes.js（401 KB）——地圖頁不載，
 * 所以這裡在 notes 缺席時回 null 而不是報錯。
 */
export function noteOf(lessonId) {
  const n = globals().notes;
  return n ? (n[lessonId] || null) : null;
}

/**
 * 這堂課「應該」有中文筆記嗎？
 * 筆記覆蓋率剛好是 ACADEMY_VIDEO_ONLY 的補集——154 堂非影片課全部有筆記，
 * 290 堂影片課全部沒有。所以只用課程層級就能判斷，不必載入 401 KB 的筆記檔。
 * （若哪天某堂影片課補了筆記，這個不變式就要跟著改。）
 */
export const shouldHaveNote = (slug) => !isVideoOnly(slug);

/* ── 地圖節點 ─────────────────────────────────────────────── */

/**
 * 一門課在地圖上的節點。
 *   有中文筆記的課 → 一堂一節點（kind:'lesson'）
 *   純影片課       → 一個章節一節點（kind:'section'），把 290 堂摺成 45 個節點
 *
 * 兩種節點都帶 lessonIds，所以「這個節點完成了嗎」= 它的 lessonIds 是否全部完成，
 * 上層邏輯完全不用分辨兩者。
 */
export function nodesOf(slug) {
  const c = info(slug);
  if (!c) return [];

  if (c.videoOnly) {
    return c.sections.map((s, i) => ({
      kind: 'section',
      key: `${slug}#${i}`,
      slug,
      sectionIndex: i,
      zh: s.zh,
      en: s.en,
      lessonIds: s.lessonIds.slice(),
      href: `chapter.html?course=${encodeURIComponent(slug)}&section=${i}`
    }));
  }

  return c.lessons.map((l) => ({
    kind: 'lesson',
    key: l.id,
    slug,
    lessonId: l.id,
    zh: l.zh,
    en: l.en,
    lessonIds: [l.id],
    href: `lesson.html?course=${encodeURIComponent(slug)}&lesson=${encodeURIComponent(l.id)}`
  }));
}

/** 一座島上所有課程的節點，依建議路線順序，每門課一段。 */
export function islandSegments(key) {
  const isl = island(key);
  if (!isl) return [];
  return isl.slugs.map((slug) => {
    const c = info(slug);
    return {
      slug,
      course: c.course,
      videoOnly: c.videoOnly,
      branch: c.branch,
      lessonCount: c.lessonCount,
      nodes: nodesOf(slug)
    };
  });
}

/* ── 官方連結 ─────────────────────────────────────────────── */

export const officialCourseUrl = (slug) => `${OFFICIAL_BASE}/${slug}`;
export const officialLessonUrl = (slug, lessonId) => `${OFFICIAL_BASE}/${slug}/${lessonId}`;
