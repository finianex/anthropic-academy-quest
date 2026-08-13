/*
 * app/config.js — 常數與調校參數
 *
 * Firebase 設定（Phase 2 才會用到）刻意留空。填進來之後可以直接 commit：
 * apiKey 是識別碼不是密鑰，本來就設計成隨前端原始碼發布。安全性來自
 * Firestore 規則 + 授權網域，不是來自隱藏它。
 */

/** localStorage 前綴。
 *  這個前綴是強制的不是裝飾：GitHub Pages 上所有 repo 共用 finianex.github.io
 *  這一個來源，localStorage 是整個網域共享的。沒有前綴就會和其他專案互撞。 */
export const NS = 'aaq:v1:';

export const KEYS = {
  progress: NS + 'progress',   // { [slug]: { lessons:{ id:{s,at,v,n} } } }
  game:     NS + 'game',       // { xp, avatar, achievements, islands }
  current:  NS + 'current',    // { courseSlug, lessonId, at }
  notes:    NS + 'notes',      // { [lessonId]: { body, updatedAt, courseSlug } }
  noteBase: NS + 'noteBase',   // 合併衝突偵測用
  profile:  NS + 'profile',    // 首次繪製的頭像/名稱快取
  authHint: NS + 'authHint',   // '1' = 上次是登入狀態，用來避免登入狀態閃爍
  uid:      NS + 'uid',
  seen:     NS + 'seen'        // 一次性提示是否已讀（例如跳關提醒）
};

/** 課綱版本：content/catalogs.js 有變動時 +1，方便日後判斷快取是否過期。 */
export const CATALOG_VERSION = 1;

/** XP 規則 */
export const XP = {
  lesson:       10,   // 完成一堂有中文筆記的課堂
  videoLesson:   4,   // 自我回報看完一堂純影片課堂（本站無法驗證，所以權重較低）
  section:      15,   // 完成一個章節
  course:       60,   // 完成一門課
  island:      200,   // 完成一座島
  note:          8    // 寫下自己的筆記（≥ NOTE_MIN 字，每堂只給一次）
};

/** 筆記給 XP 的最低字數，以及硬上限（上限同時在 Firestore 規則裡把關）。 */
export const NOTE_MIN = 30;
export const NOTE_MAX = 20000;

/**
 * 等級門檻。用明確表格而非公式，這樣日後調整不會意外改動別人的等級。
 *
 * 曲線形狀是刻意的：
 *   Lv2 約 3 堂課就到（20 分鐘內就有第一次升等）
 *   Lv4 剛好落在走完「共同基礎」四門課——那是使用者決定要不要繼續的分岔點
 *   Lv8 需要把 444 堂都走完，含兩門雲端課
 */
export const LEVELS = [
  { n: 1, xp:    0, zh: '見習讀者' },
  { n: 2, xp:  120, zh: '學徒' },
  { n: 3, xp:  420, zh: '研習者' },
  { n: 4, xp: 1000, zh: '實踐者' },
  { n: 5, xp: 2000, zh: '建造者' },
  { n: 6, xp: 3400, zh: '導師' },
  { n: 7, xp: 5600, zh: '學者' },
  { n: 8, xp: 9000, zh: '大師' }
];

/** 筆記自動儲存：idle 多久後寫入。 */
export const NOTE_SAVE_DEBOUNCE = 1500;

/** 島嶼路徑的版面斷點：[最小寬度, 欄數, 列高, 節點直徑, 邊距] */
/* PAD 不能小於節點標籤的半寬（66px，見 map-island.js 的 NODE_HALF），
   否則最外側的標籤會超出棋盤，造成整頁橫向捲動。 */
export const LAYOUT_BREAKPOINTS = [
  [1120, 4, 150, 56, 76],
  [ 900, 3, 156, 56, 72],
  [ 650, 2, 160, 54, 70],
  [   0, 2, 140, 48, 68]
];

/** 路段標題（課程名）佔的高度，以及每段課程之間的間距。 */
export const BAND_H = 62;
export const SEG_GAP = 26;

/** Firebase —— Phase 2。留 null 時全站以 localStorage 模式運作。 */
export const FIREBASE = null;
/*  填法：
export const FIREBASE = {
  apiKey: '…', authDomain: '….firebaseapp.com', projectId: '…',
  storageBucket: '…', messagingSenderId: '…', appId: '…'
};
*/

/** 三個 Firebase 模組必須同版本，否則會 duplicate-app。 */
export const FIREBASE_VERSION = '11.6.0';

/** 具名 app 實例：避免和同網域上其他 Firebase 專案衝突。 */
export const FIREBASE_APP_NAME = 'aaq';

export const OFFICIAL_BASE = 'https://anthropic.skilljar.com';
