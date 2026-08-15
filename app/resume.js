/*
 * app/resume.js — 記住「上次做到哪裡」
 *
 * 兩種不同性質的狀態，所以分開存：
 *
 *   教學卡索引  每堂一個數字，很小 → 用 LRU map 記住很多堂
 *   沒做完的練習  一整場的題目與作答紀錄，約 15–25 KB → 只留一場
 *
 * 為什麼練習只留一場：它必須連題目本體一起存。出題有隨機性（干擾項洗牌、
 * 排序題取連續區間），重新產生會得到不一樣的題目，那就不叫「接著做」。
 * 而人不會同時卡在兩場練習中間，所以一場就夠——多留只是佔配額。
 *
 * 這些狀態刻意**不同步到雲端**。它們是裝置本地的暫態：在手機上做到第 5 題，
 * 到公司用電腦接著做，聽起來很美，實際上跨裝置接續半場練習幾乎不會發生，
 * 卻要為此把 20 KB 的題目塞進使用者文件、還要處理兩邊同時作答的衝突。
 * 進度、筆記、SRS 這些真正值錢的資料都有同步，這裡不划算。
 */

import { KEYS, LIVE_TTL_DAYS, SPOT_MAX } from './config.js';
import * as local from './local.js';

const DAY = 86400000;

/* ── 教學卡：讀到第幾張 ──────────────────────────────────── */

export function getSpot(lessonId) {
  const m = local.read(KEYS.spot, {}) || {};
  const v = m[String(lessonId)];
  return Number.isInteger(v?.i) ? v.i : 0;
}

export function setSpot(lessonId, index) {
  const key = String(lessonId);
  const m = local.read(KEYS.spot, {}) || {};

  if (!index) delete m[key];                        // 回到第一張＝沒什麼好記的
  else m[key] = { i: index, at: Date.now() };

  // 超過上限就淘汰最舊的
  const keys = Object.keys(m);
  if (keys.length > SPOT_MAX) {
    keys.sort((a, b) => (m[a].at || 0) - (m[b].at || 0))
        .slice(0, keys.length - SPOT_MAX)
        .forEach((k) => delete m[k]);
  }
  local.write(KEYS.spot, m);
}

export const clearSpot = (lessonId) => setSpot(lessonId, 0);

/* ── 沒做完的練習 ────────────────────────────────────────── */

/**
 * 讀出還沒做完的那一場。
 * @param {object} want { kind:'lesson'|'review', lessonId? }
 * @returns {object|null} { snapshot, at, ... }，對不上或過期就回 null
 */
export function getLive(want) {
  const v = local.read(KEYS.live, null);
  if (!v || v.v !== 1 || !v.snapshot) return null;

  if (Date.now() - (v.at || 0) > LIVE_TTL_DAYS * DAY) { clearLive(); return null; }
  if (want.kind && v.kind !== want.kind) return null;
  if (want.lessonId && String(v.lessonId) !== String(want.lessonId)) return null;

  // 佇列空了代表其實已經做完，只是沒清乾淨
  if (!v.snapshot.queue?.length) { clearLive(); return null; }
  return v;
}

/** 存下這一場的當前狀態。每答一題呼叫一次。 */
export function saveLive(kind, session, extra = {}) {
  try {
    const snapshot = session.snapshot();
    if (!snapshot.queue.length) { clearLive(); return; }
    local.write(KEYS.live, { v: 1, kind, at: Date.now(), snapshot, ...extra });
  } catch (e) {
    // 存不下來不該影響作答，頂多是下次不能接續
    console.warn('[aaq] 練習進度存檔失敗：', e);
  }
}

export const clearLive = () => local.remove(KEYS.live);

/** 首頁用：現在有沒有可以接續的東西。 */
export function liveSummary() {
  const v = getLive({});
  if (!v) return null;
  const s = v.snapshot;
  return {
    kind: v.kind,
    lessonId: v.lessonId || null,
    courseSlug: v.courseSlug || null,
    cleared: s.cleared | 0,
    total: s.total | 0,
    at: v.at
  };
}
