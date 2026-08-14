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
import { allCourses, lessonLookup } from './catalog.js';

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
  /* 也要按「文字」去重，不能只按身分。
     有些概念標題在多門課裡一字不差（例如 Delegation 委派 出現在三門 AI 素養課），
     只用 lessonId:idx 去重的話，兩個不同課程的同名概念會同時被選成干擾項，
     那一題就出現兩個一模一樣的選項。 */
  const seenTitle = new Set([target.title]);
  const seenBody = new Set([target.body]);
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
      // 文字重複的不能當干擾項——不管它來自哪一堂
      if (seenTitle.has(cand.title) || seenBody.has(cand.body)) continue;
      taken.add(key(cand));
      seenTitle.add(cand.title);
      seenBody.add(cand.body);
      out.push(cand);
    }
    if (out.length >= n) break;
  }
  return out;
}

/**
 * 把 note.concepts 轉成帶「出身」的概念物件。
 *
 * lessonId / slug / islandKey 是 distractors() 分層挑選的依據，少了它們
 * 四層過濾全部落空，會直接掉到最後一層「全站隨機」——那正是這個函式存在的原因。
 * （早期版本只給 {title, body, idx}，導致同課優先完全沒有生效。）
 */
function conceptsOf(note, lessonId) {
  const hit = lessonLookup(lessonId);
  const slug = hit?.slug ?? null;
  const islandKey = hit?.course?.islandKey ?? null;
  return (note.concepts || [])
    .map(([title, body], idx) => ({ title, body, idx, lessonId, slug, islandKey }))
    .filter((c) => c.title && c.body);
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

/**
 * 排序：把流程步驟排回正確順序。正解直接就是資料的陣列順序。
 *
 * 步驟太多時只考一段連續區間（見 QUIZ.orderMax）。原因是課文改寫把長句
 * 拆成細步之後，有些課的 workflow 長到 12 步——那樣的排序題是苦工不是測驗。
 * 取連續區間而不是隨機抽樣，答案才仍然是一個真正的先後順序。
 */
function orderSteps(workflow, lessonId) {
  if (!workflow || workflow.length < 3) return null;

  let steps = workflow;
  let offset = 0;
  if (workflow.length > QUIZ.orderMax) {
    offset = Math.floor(Math.random() * (workflow.length - QUIZ.orderMax + 1));
    steps = workflow.slice(offset, offset + QUIZ.orderMax);
  }

  return {
    id: `w:${lessonId}`,
    type: 'order',
    // 只考其中一段時要講清楚，不然使用者會以為漏了步驟
    prompt: steps.length === workflow.length
      ? '把這些步驟排成正確的順序'
      : `把這 ${steps.length} 個步驟排成正確的順序（整個流程共 ${workflow.length} 步）`,
    items: steps.map((text, i) => ({ text, pos: i })),
    explain: steps.map((s, i) => `${offset + i + 1}. ${s}`).join('\n')
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

  /* 誤區與流程步驟偶爾會出現一模一樣的句子。真發生時，正解會同時出現在
     干擾項裡——那一題就有兩個「正確」選項。所以挑干擾項時要把跟正解同字
     的排除，數量不足就放棄出這一題（回 null），寧可少一題也不出壞題。 */
  const build = (right, pool, prompt, explain) => {
    const distract = pool.filter((t) => t !== right);
    if (distract.length < QUIZ.optionCount - 1) return null;
    return {
      id: `p:${lessonId}`,
      type: 'choose',
      prompt,
      options: shuffle([
        { text: right, correct: true },
        ...pick(distract, QUIZ.optionCount - 1).map((t) => ({ text: t, correct: false }))
      ]),
      explain
    };
  };

  if (inverted) {
    const right = steps[seed % steps.length];
    return build(right, pits, '下面哪一個是這一課建議的做法？',
      `建議做法：${right}\n\n其他三個是這一課點出的常見誤區。`);
  }

  const wrong = pits[seed % pits.length];
  return build(wrong, steps, '下面哪一個是這一課點出的常見誤區？',
    `常見誤區：${wrong}\n\n其他三個都是這一課建議的做法。`);
}

/* ── 組一堂課的練習 ───────────────────────────────────────── */

/**
 * @param {object} note    content/notes.js 的一筆
 * @param {string} lessonId
 * @returns {Array} 題目陣列（已打亂），實測每堂 7–11 題
 */
export function buildExercises(note, lessonId) {
  if (!note) return [];
  const concepts = conceptsOf(note, lessonId);
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
    const c = conceptsOf(note, lessonId).find((x) => x.idx === idx);
    if (!c) return null;
    return coin() ? chooseBody(c, lessonId) : chooseTitle(c, lessonId);
  }
  if (kind === 'w') {
    return orderSteps((note.workflow || []).filter(Boolean), lessonId);
  }
  if (kind === 'm') {
    return matchPairs(conceptsOf(note, lessonId), lessonId);
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
