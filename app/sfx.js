/*
 * app/sfx.js — 答題音效
 *
 * 全部用 Web Audio 即時合成，沒有任何音檔。這不只是為了維持「零第三方
 * 請求」——音檔還會有格式相容性（Safari 的 ogg）、快取、離線可用性三個
 * 問題，而我們要的只是幾個 200 毫秒的音，合成反而簡單也精準。
 *
 * 三個設計約束：
 *
 * 1. **答錯的聲音不能是懲罰。** 這個系統刻意沒有愛心、答錯只是排到後面
 *    再問一次。如果配上刺耳的錯誤音，等於用聲音把「你錯了」講得比介面
 *    還重，和整個設計方向牴觸。所以答錯是一個低而短的柔和音，音量還比
 *    答對低——它的功能是「我收到了」，不是「你完蛋了」。
 *
 * 2. **一定要能關，而且要記住。** 沒有 prefers-reduced-sound 這種媒體查詢，
 *    系統層面問不到使用者想不想聽。這個站的使用者很可能在辦公室或圖書館
 *    打開它，突然出聲是會讓人尷尬的事，所以開關必須在練習畫面上看得到，
 *    而不是藏在設定頁。
 *
 * 3. **AudioContext 必須等使用者手勢。** 瀏覽器的自動播放政策會讓在載入
 *    時建立的 context 停在 suspended。這裡改成第一次要發聲時才建立，而
 *    那一定發生在點擊選項之後，所以永遠合法。
 */

import { KEYS } from './config.js';
import * as local from './local.js';

let ctx = null;
let master = null;
let enabled = local.read(KEYS.sfx, null) !== '0';   // 預設開
const listeners = new Set();

export const isOn = () => enabled;

export function setOn(v) {
  enabled = !!v;
  if (enabled) local.remove(KEYS.sfx); else local.write(KEYS.sfx, '0');
  listeners.forEach((fn) => { try { fn(enabled); } catch {} });
  if (enabled) ping();          // 立刻讓人聽到開起來是什麼感覺
}

export function onChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** 第一次發聲時才建立 context。回傳 null 表示這個環境沒有 Web Audio。 */
function audio() {
  if (ctx === null) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { ctx = false; return null; }
    try {
      ctx = new AC();
      master = ctx.createGain();
      // 整體壓得很低。這些音的功能是回饋，不是表演，
      // 在安靜的辦公室裡不該讓人嚇一跳。
      master.gain.value = 0.16;
      master.connect(ctx.destination);
    } catch { ctx = false; return null; }
  }
  if (!ctx) return null;
  // 切分頁回來時 context 會被暫停
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

/**
 * 發一個音。
 * @param {number} freq  頻率（Hz）
 * @param {number} at    相對現在的起始秒數
 * @param {number} dur   長度（秒）
 * @param {object} o     { type, gain, to } to = 滑到的目標頻率
 */
function tone(freq, at, dur, o = {}) {
  const c = audio(); if (!c) return;
  const t = c.currentTime + at;

  const osc = c.createOscillator();
  osc.type = o.type || 'triangle';
  osc.frequency.setValueAtTime(freq, t);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + dur);

  const g = c.createGain();
  const peak = o.gain ?? 1;
  /* 8 毫秒的漸入是必要的：直接從 0 跳到峰值會產生喀噠聲。
     收尾用指數衰減（聽起來像真的樂器），但指數不能收到 0，所以收到
     0.0001 再停。 */
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  osc.connect(g); g.connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

/* ── 對外的四個聲音 ────────────────────────────────────────── */

/** 答對：往上跳一個完全五度。亮、短、乾淨。 */
export function correct() {
  if (!enabled) return;
  tone(880.00, 0,     0.10, { gain: 0.9 });    // A5
  tone(1318.51, 0.07, 0.17, { gain: 0.8 });    // E6
}

/** 答錯：低、短、微微下滑。音量比答對低——是「我收到了」不是「你完蛋了」。 */
export function wrong() {
  if (!enabled) return;
  tone(196.00, 0, 0.20, { type: 'sine', gain: 0.75, to: 155.56 });   // G3 → D#3
}

/** 一整場練習結束：E 大三和弦往上跑。 */
export function finish() {
  if (!enabled) return;
  tone(659.25, 0,    0.11, { gain: 0.75 });    // E5
  tone(830.61, 0.09, 0.11, { gain: 0.75 });    // G#5
  tone(987.77, 0.18, 0.30, { gain: 0.85 });    // B5
}

/** 全對：比 finish 多一個八度收尾。 */
export function perfect() {
  if (!enabled) return;
  tone(659.25, 0,    0.10, { gain: 0.7 });
  tone(830.61, 0.08, 0.10, { gain: 0.7 });
  tone(987.77, 0.16, 0.10, { gain: 0.75 });
  tone(1318.51, 0.24, 0.38, { gain: 0.85 });   // E6
}

/** 打開開關時的試聽音，很輕。 */
export function ping() {
  tone(1046.50, 0, 0.09, { gain: 0.5 });       // C6
}
