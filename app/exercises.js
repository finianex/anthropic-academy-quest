/*
 * app/exercises.js — 從筆記結構推導練習題
 *
 * 設計上的硬約束：**不編造任何內容。** 每一題的正解都是資料裡本來就有的
 * 事實，不是我推論出來的：
 *   - 排序題的正確順序就是 note.workflow 的陣列順序
 *   - 配對題的配對關係就是 note.concepts 的 [標題, 說明] 配對
 *   - 誤區題的正解就是 note.pitfalls 的其中一項
 * 干擾項一律從別處「已存在的真實句子」取用，不自行造句。
 *
 * 為什麼沒有克漏字題：實測 742 個概念裡，只有 5 個的標題有出現在自己的
 * 說明文字中，所以無法可靠地把關鍵詞挖空。與其用啟發式亂挖，不如不做。
 */

import { QUIZ } from './config.js';
import { allCourses } from './catalog.js';

/* ── 亂數工具 ─────────────────────────────────────────────── */
const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const pick = (arr, n) => shuffle(arr).slice(0, n);
const coin = () => Math.random() < 0.5;

/* ── 概念索引（干擾項的來源）───────────────────────────────── */
let _pool = null;

/**
 * 建立全站概念索引：742 個 {slug, lessonId, idx, title, body}。
 * 需要 content/notes.js 已載入（地圖頁刻意不載，所以那裡不會呼叫這裡）。
 */
function pool() {
  if (_pool) return _pool;
  const notes = window.ACADEMY_LESSON_NOTES || {};
  const all = [];
  const bySlug = new Map();

  for (const c of allCourses()) {
    if (c.videoOnly) continue;
    for (const l of c.lessons) {
      const n = notes[l.id];
      if (!n?.concepts) continue;
      n.concepts.forEach(([title, body], idx) => {
        if (!title || !body) return;
        const item = { slug: c.slug, islandKey: c.islandKey, lessonId: l.id, idx, title, body };
        all.push(item);
        if (!bySlug.has(c.slug)) bySlug.set(c.slug, []);
        bySlug.get(c.slug).push(item);
      });
    }
  }
  _pool = { all, bySlug };
  return _pool;
}

/**
 * 選干擾項。順序刻意是「同一堂 → 同一門課 → 同一座島 → 全站」。
 *
 * 為什麼優先用同一堂課的其他概念：真正的學習目標就是「分辨這一課的
 * A 概念和 B 概念」。從別的課抓來的干擾項太好排除，題目會變成
 * 「哪一個看起來跟這一課有關」，那不是在考理解。
 */
function distractors(target, n, exclude = new Set()) {
  const p = pool();
  const key = (x) => `${x.lessonId}:${x.idx}`;
  const taken = new Set([key(target), ...exclude]);
  const out = [];

  const tiers = [
    p.all.filter((x) => x.lessonId === target.lessonId),
    (p.bySlug.get(target.slug) || []).filter((x) => x.lessonId !== target.lessonId),
    p.all.filter((x) => x.islandKey === target.islandKey && x.slug !== target.slug),
    p.all
  ];

  for (const tier of tiers) {
    for (const cand of shuffle(tier)) {
      if (out.length >= n) return out;
      if (taken.has(key(cand))) continue;
      // 內容一樣的句子不能當干擾項（不同課偶爾會有相同的概念說明）
      if (cand.body === target.body || cand.title === target.title) continue;
      taken.add(key(cand));
      out.push(cand);
    }
    if (out.length >= n) break;
  }
  return out;
}

/* ── 各題型 ──────────────────────────────────────────────── */

/** 給概念名，選出正確的說明。 */
function chooseBody(c, lessonId) {
  const ds = distractors(c, QUIZ.optionCount - 1);
  if (ds.length < QUIZ.optionCount - 1) return null;
  return {
    id: `c:${lessonId}:${c.idx}`,
    type: 'choose',
    prompt: `哪一個描述的是「${c.title}」？`,
    options: shuffle([
      { text: c.body, correct: true },
      ...ds.map((d) => ({ text: d.body, correct: false }))
    ]),
    explain: `${c.title}：${c.body}`
  };
}

/** 給說明，選出概念名。考的是術語回想，比 chooseBody 難一點。 */
function chooseTitle(c, lessonId) {
  const ds = distractors(c, QUIZ.optionCount - 1);
  if (ds.length < QUIZ.optionCount - 1) return null;
  return {
    id: `c:${lessonId}:${c.idx}`,
    type: 'choose',
    prompt: '下面這段在講哪一個概念？',
    passage: c.body,
    options: shuffle([
      { text: c.title, correct: true },
      ...ds.map((d) => ({ text: d.title, correct: false }))
    ]),
    explain: `${c.title}：${c.body}`
  };
}

/** 配對：概念名 ↔ 說明。一次涵蓋多個概念。 */
function matchPairs(concepts, lessonId) {
  const use = pick(concepts, Math.min(QUIZ.matchPairs, concepts.length));
  if (use.length < 3) return null;
  return {
    id: `m:${lessonId}`,
    type: 'match',
    prompt: '把概念和它的說明配起來',
    pairs: use.map((c) => ({ key: String(c.idx), left: c.title, right: c.body })),
    explain: use.map((c) => `${c.title}：${c.body}`).join('\n')
  };
}

/** 排序：把流程步驟排回正確順序。正解直接就是資料的陣列順序。 */
function orderSteps(workflow, lessonId) {
  if (!workflow || workflow.length < 3) return null;
  return {
    id: `w:${lessonId}`,
    type: 'order',
    prompt: '把這些步驟排成正確的順序',
    items: workflow.map((text, i) => ({ text, pos: i })),
    explain: workflow.map((s, i) => `${i + 1}. ${s}`).join('\n')
  };
}

/**
 * 誤區辨識。兩個方向隨機出：
 *   正向 → 一個誤區 + 三個建議做法，問「哪一個是誤區」
 *   反向 → 一個建議做法 + 三個誤區，問「哪一個是建議做法」
 * 隨機翻轉是必要的：誤區和流程的句子風格不同（一個描述錯誤、一個是指令），
 * 如果方向固定，答題者靠語氣就能猜對，題目就白出了。
 */
function pitfallItem(note, lessonId, seed) {
  const pits = (note.pitfalls || []).filter(Boolean);
  const steps = (note.workflow || []).filter(Boolean);
  if (pits.length < 1 || steps.length < 3) return null;

  const inverted = coin();
  if (inverted) {
    if (pits.length < QUIZ.optionCount - 1) return null;
    const right = steps[seed % steps.length];
    return {
      id: `p:${lessonId}`,
      type: 'choose',
      prompt: '下面哪一個是這一課建議的做法？',
      options: shuffle([
        { text: right, correct: true },
        ...pick(pits, QUIZ.optionCount - 1).map((t) => ({ text: t, correct: false }))
      ]),
      explain: `建議做法：${right}\n\n其他三個是這一課點出的常見誤區。`
    };
  }

  const wrong = pits[seed % pits.length];
  return {
    id: `p:${lessonId}`,
    type: 'choose',
    prompt: '下面哪一個是這一課點出的常見誤區？',
    options: shuffle([
      { text: wrong, correct: true },
      ...pick(steps, QUIZ.optionCount - 1).map((t) => ({ text: t, correct: false }))
    ]),
    explain: `常見誤區：${wrong}\n\n其他三個都是這一課建議的做法。`
  };
}

/* ── 組一堂課的練習 ───────────────────────────────────────── */

/**
 * @param {object} note    content/notes.js 的一筆
 * @param {string} lessonId
 * @returns {Array} 題目陣列（已打亂），實測每堂 7–11 題
 */
export function buildExercises(note, lessonId) {
  if (!note) return [];
  const concepts = (note.concepts || [])
    .map(([title, body], idx) => ({ title, body, idx }))
    .filter((c) => c.title && c.body);

  const items = [];

  /* 每個概念一題，交替考「名→說明」與「說明→名」，兩個方向都練到 */
  concepts.forEach((c, i) => {
    const q = (i % 2 === 0) ? chooseBody(c, lessonId) : chooseTitle(c, lessonId);
    if (q) items.push(q);
  });

  const m = matchPairs(concepts, lessonId);
  if (m) items.push(m);

  const o = orderSteps((note.workflow || []).filter(Boolean), lessonId);
  if (o) items.push(o);

  for (let i = 0; i < QUIZ.pitfallItems; i++) {
    const p = pitfallItem(note, lessonId, i);
    if (p) items.push({ ...p, id: `p:${lessonId}:${i}` });
  }

  return shuffle(items);
}

/**
 * 依 SRS 的項目 key 重建單一題目，供複習用。
 * key 格式：c:<lessonId>:<idx> / w:<lessonId> / m:<lessonId> / p:<lessonId>:<n>
 */
export function buildFromKey(key) {
  const notes = window.ACADEMY_LESSON_NOTES || {};
  const [kind, lessonId, tail] = key.split(':');
  const note = notes[lessonId];
  if (!note) return null;

  if (kind === 'c') {
    const idx = Number(tail);
    const pair = (note.concepts || [])[idx];
    if (!pair) return null;
    const c = { title: pair[0], body: pair[1], idx };
    if (!c.title || !c.body) return null;
    return coin() ? chooseBody(c, lessonId) : chooseTitle(c, lessonId);
  }
  if (kind === 'w') {
    return orderSteps((note.workflow || []).filter(Boolean), lessonId);
  }
  if (kind === 'm') {
    const concepts = (note.concepts || [])
      .map(([title, body], idx) => ({ title, body, idx }))
      .filter((c) => c.title && c.body);
    return matchPairs(concepts, lessonId);
  }
  if (kind === 'p') {
    const p = pitfallItem(note, lessonId, Number(tail) || 0);
    return p ? { ...p, id: key } : null;
  }
  return null;
}

/** 一堂課會產生哪些 SRS 項目 key（用來判斷複習池）。 */
export function itemKeysOf(note, lessonId) {
  if (!note) return [];
  const keys = [];
  (note.concepts || []).forEach(([t, b], idx) => { if (t && b) keys.push(`c:${lessonId}:${idx}`); });
  if ((note.workflow || []).filter(Boolean).length >= 3) keys.push(`w:${lessonId}`);
  if ((note.concepts || []).length >= 3) keys.push(`m:${lessonId}`);
  const pits = (note.pitfalls || []).filter(Boolean);
  const steps = (note.workflow || []).filter(Boolean);
  if (pits.length >= 1 && steps.length >= 3) {
    for (let i = 0; i < QUIZ.pitfallItems; i++) keys.push(`p:${lessonId}:${i}`);
  }
  return keys;
}
