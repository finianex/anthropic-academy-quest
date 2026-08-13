/*
 * app/progress.js — 路線位置與節點狀態
 *
 * 這裡回答三個問題：
 *   1. 腳色現在站在哪？   → 最後造訪的節點（所以瀏覽就會讓腳色移動）
 *   2. 建議下一步是哪個？ → 建議路線上第一個還沒完成的節點
 *   3. 這個節點該長什麼樣？→ done / now / ahead / open
 *
 * 「目前位置」不另外存一個游標，永遠從 progress 推導，所以它不可能和實際進度不一致。
 */

import { allCourses, nodesOf, prereqOf, info } from './catalog.js';
import { nodeDone, nodeStarted } from './gamify.js';

let _nodes = null;

/** 建議路線上所有節點的平坦清單（跨島、跨課程，共約 199 個）。 */
export function globalNodes() {
  if (_nodes) return _nodes;
  _nodes = [];
  for (const c of allCourses()) {
    for (const n of nodesOf(c.slug)) _nodes.push(n);
  }
  _nodes.forEach((n, i) => { n.order = i; });
  return _nodes;
}

/** 建議下一步：路線順序中第一個還沒完成的節點。全部完成時回最後一個。 */
export function suggestedNode(view) {
  const nodes = globalNodes();
  for (const n of nodes) if (!nodeDone(n, view.done)) return n;
  return nodes[nodes.length - 1] || null;
}

/** 腳色現在站的節點：以最後造訪為準，沒有紀錄時退回建議節點。 */
export function standingNode(view, current) {
  const nodes = globalNodes();
  if (current?.courseSlug) {
    if (current.lessonId) {
      const hit = nodes.find(
        (n) => n.slug === current.courseSlug && n.lessonIds.includes(current.lessonId)
      );
      if (hit) return hit;
    }
    const first = nodes.find((n) => n.slug === current.courseSlug);
    if (first) return first;
  }
  return suggestedNode(view);
}

/**
 * 這門課的先修條件還沒滿足嗎？
 * 只有「完全沒開始這門課」時才算尚早——已經動手的課不該再被勸退。
 */
export function prereqUnmet(slug, view) {
  const p = prereqOf(slug);
  if (!p) return null;
  const started = (view.perCourse.get(slug)?.done || 0) > 0;
  if (started) return null;
  const missing = p.on.filter((s) => !view.courseDone.has(s));
  if (!missing.length) return null;
  return { ...p, missing, missingTitles: missing.map((s) => info(s)?.course.zhTitle || s) };
}

/**
 * 節點的顯示狀態。
 *   done  已完成
 *   now   建議下一步（整個站同時只有一個）
 *   ahead 尚早（先修未滿足且該課還沒開始）—— 仍然可以點
 *   open  可以走
 */
export function nodeState(node, view, suggested) {
  if (nodeDone(node, view.done)) return 'done';
  if (suggested && node.key === suggested.key) return 'now';
  if (nodeStarted(node, view.done)) return 'open';
  if (prereqUnmet(node.slug, view)) return 'ahead';
  return 'open';
}

/** 一個節點裡完成了幾堂（章節節點會 >1）。 */
export const nodeProgress = (node, view) => ({
  done: node.lessonIds.filter((id) => view.done.has(id)).length,
  total: node.lessonIds.length
});

/** 「繼續上一堂」用的連結資訊。 */
export function resumePoint(view, current) {
  const n = standingNode(view, current);
  if (!n) return null;
  const c = info(n.slug);
  return {
    node: n,
    href: n.href,
    courseZh: c?.course.zhTitle || n.slug,
    islandKey: c?.islandKey || null,
    label: n.zh
  };
}
