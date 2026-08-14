/*
 * app/srs.js — 間隔重複排程
 *
 * 這是整個系統裡「學得起來」與「看過就忘」的分界線。單一課堂的練習只證明
 * 你當下讀懂了；真正的保留要靠隔幾天再被問一次。
 *
 * 用 SM-2 的簡化版：熟練度 0–5 配一張固定間隔表，不做 easiness factor。
 * 對這個題量（約 1,050 個項目）完整 SM-2 沒有明顯好處，而固定間隔的行為
 * 好預測、好除錯，也讓「下次什麼時候問」這件事對使用者是可解釋的。
 */

import { SRS_DAYS, SRS_WRONG_DAYS, REVIEW_MAX } from './config.js';

const DAY = 86400000;

/** 一個項目的初始狀態。 */
export const fresh = () => ({ s: 0, due: 0, n: 0, w: 0 });

/**
 * 記錄一次作答，回傳新的項目狀態。
 * @param {object} it   現有狀態（可為 undefined）
 * @param {boolean} ok  是否第一次就答對
 * @param {number} now  時間戳
 */
export function grade(it, ok, now = Date.now()) {
  const cur = it || fresh();
  const n = (cur.n || 0) + 1;

  if (!ok) {
    // 答錯：熟練度退一階，隔天再問。不設成「立刻」——那只會變成
    // 同一場練習裡的第三次，量不到真正的保留。
    return {
      s: Math.max(0, (cur.s || 0) - 1),
      due: now + SRS_WRONG_DAYS * DAY,
      n,
      w: (cur.w || 0) + 1
    };
  }

  const s = Math.min(SRS_DAYS.length - 1, (cur.s || 0) + 1);
  return { s, due: now + SRS_DAYS[s] * DAY, n, w: cur.w || 0 };
}

/** 這個項目現在該複習了嗎？ */
export const isDue = (it, now = Date.now()) => !!it && it.due > 0 && it.due <= now;

/** 熟練度的中文說法，給介面用。 */
export function strengthLabel(s) {
  if (s <= 0) return '待加強';
  if (s === 1) return '剛學會';
  if (s === 2) return '記得了';
  if (s === 3) return '熟悉';
  if (s === 4) return '很熟';
  return '牢記';
}

/**
 * 從 SRS 狀態裡挑出這次複習要考的項目。
 * 最逾期的先考；超過上限就截斷（並讓呼叫端知道還剩幾題）。
 *
 * @param {object} srs   { [key]: {s, due, n, w} }
 * @param {function} keyOk  (key) => boolean，過濾課綱變動後留下的孤兒 key。
 *   複習頁會傳「這個 key 真的做得出題目嗎」（需要 notes.js）；
 *   首頁刻意不載入 401 KB 的 notes.js，所以只驗證 lessonId 存在於課綱。
 */
export function dueKeys(srs, keyOk, now = Date.now(), max = REVIEW_MAX) {
  const due = [];
  for (const [key, it] of Object.entries(srs || {})) {
    if (!isDue(it, now)) continue;
    if (keyOk && !keyOk(key)) continue;
    due.push({ key, over: now - it.due, s: it.s || 0 });
  }
  // 逾期最久的優先，同樣逾期則熟練度低的優先
  due.sort((a, b) => (b.over - a.over) || (a.s - b.s));
  return { keys: due.slice(0, max).map((d) => d.key), total: due.length };
}

/** 距離下一個項目到期還有多久。全部都還沒到期時用來顯示「下次複習」。 */
export function nextDueAt(srs, keyOk) {
  let best = Infinity;
  for (const [key, it] of Object.entries(srs || {})) {
    if (!it || !it.due) continue;
    if (keyOk && !keyOk(key)) continue;
    if (it.due < best) best = it.due;
  }
  return Number.isFinite(best) ? best : null;
}

/** 從項目 key 取出課堂編號。key 格式：<kind>:<lessonId>[:<n>] */
export const lessonIdOf = (key) => String(key).split(':')[1] || '';

/** 把毫秒差說成人話。 */
export function untilLabel(ts, now = Date.now()) {
  if (!ts) return '';
  const d = ts - now;
  if (d <= 0) return '現在';
  const days = Math.round(d / DAY);
  if (days >= 1) return `${days} 天後`;
  const hours = Math.round(d / 3600000);
  if (hours >= 1) return `${hours} 小時後`;
  return '不到 1 小時';
}
