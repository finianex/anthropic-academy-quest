/*
 * app/local.js — localStorage 驅動
 *
 * 三件必須處理的現實：
 *   1. Safari 無痕模式與部分站內瀏覽器會讓 localStorage 直接丟例外
 *      → 退回記憶體 Map，功能不掛，只是關掉分頁就沒了
 *   2. 配額（約 5 MB）是整個 finianex.github.io 網域共用的
 *      → 超出時要「看得見地」失敗，絕不默默丟掉使用者寫的筆記
 *   3. 壞掉的 JSON 不該讓整頁白畫面
 *      → parse 失敗回 fallback
 */

import { NS } from './config.js';

let backend = null;      // 'ls' | 'mem'
const mem = new Map();
const quotaListeners = new Set();

function store() {
  if (backend) return backend;
  try {
    const probe = NS + '__probe';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    backend = 'ls';
  } catch {
    backend = 'mem';
    console.warn('[aaq] localStorage 不可用，改用記憶體儲存（關閉分頁後進度不會保留）。');
  }
  return backend;
}

/** 儲存空間滿了的時候通知 UI。 */
export function onQuotaError(fn) {
  quotaListeners.add(fn);
  return () => quotaListeners.delete(fn);
}

export function read(key, fallback = null) {
  try {
    const raw = store() === 'ls' ? window.localStorage.getItem(key) : mem.get(key);
    if (raw === null || raw === undefined) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('[aaq] 讀取失敗，使用預設值：', key, e);
    return fallback;
  }
}

export function write(key, value) {
  const raw = JSON.stringify(value);
  try {
    if (store() === 'ls') window.localStorage.setItem(key, raw);
    else mem.set(key, raw);
    return true;
  } catch (e) {
    const isQuota = e && (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014);
    if (isQuota) {
      // 明確告訴使用者，而不是假裝存好了
      quotaListeners.forEach((fn) => { try { fn(key); } catch {} });
      console.error('[aaq] 儲存空間已滿，這次變更沒有保存：', key);
    } else {
      console.error('[aaq] 寫入失敗：', key, e);
    }
    return false;
  }
}

export function remove(key) {
  try {
    if (store() === 'ls') window.localStorage.removeItem(key);
    else mem.delete(key);
  } catch {}
}

/** 清掉這個站的所有資料（不動同網域其他專案的鍵）。 */
export function clearAll() {
  try {
    if (store() === 'ls') {
      const kill = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i);
        if (k && k.startsWith(NS)) kill.push(k);
      }
      kill.forEach((k) => window.localStorage.removeItem(k));
    } else {
      [...mem.keys()].filter((k) => k.startsWith(NS)).forEach((k) => mem.delete(k));
    }
  } catch {}
}

export const isPersistent = () => store() === 'ls';
