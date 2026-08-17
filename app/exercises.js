/*
 * app/exercises.js — 從筆記結構推導練習題
 *
 * 設計上的硬約束：**不編造任何內容。** 每一題的正解都是資料裡本來就有的
 * 事實，不是我推論出來的：
 *   - 配對題的配對關係就是 note.concepts 的 [標題, 說明] 配對
 *   - 誤區題的正解就是 note.pitfalls 的其中一項
 * 干擾項一律從別處「已存在的真實句子」取用，不自行造句。
 *
 * 為什麼沒有克漏字題：實測 742 個概念裡，只有 5 個的標題有出現在自己的
 * 說明文字中，所以無法可靠地把關鍵詞挖空。與其用啟發式亂挖，不如不做。
 *
 * 為什麼沒有排序題：做過一版（把 note.workflow 排回正確順序），後來拿掉。
 * workflow 的內容仍然有考——誤區題的「哪一個是這一課建議的做法」用的就是
 * 它——只是不再考步驟之間的先後。
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

  /* 同一堂的候選剛好只夠填滿時，強制留一格給外層。
     4 個概念的課（154 堂裡有 25 堂）扣掉正解只剩 3 個同課概念，而干擾項
     也要 3 個——組合只有一種，於是同方向的兩題必然顯示一模一樣的四個選項，
     看起來就是同一題又出現。留一格給同課程的其他堂之後，每題的選項組合
     就不同了，而且三個選項裡仍有兩個來自本課，辨別的難度沒有變。 */
  // 扣掉正解自己——tiers[0] 包含 target，直接拿 length 比會少算一格
  const usableSameLesson = tiers[0].filter((x) => key(x) !== key(target)).length;
  const sameLessonCap = usableSameLesson <= n ? Math.max(1, n - 1) : n;

  for (let i = 0; i < tiers.length; i++) {
    const limit = i === 0 ? sameLessonCap : n;
    for (const cand of shuffle(tiers[i])) {
      if (out.length >= limit) break;
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

/**
 * 配對：概念名 ↔ 說明。一次涵蓋多個概念。
 * @param {number} [max] 最多用幾個概念。呼叫端會留幾個給選擇題，
 *   讓同一個概念不會在一場練習裡被考兩次。
 */
function matchPairs(concepts, lessonId, max = QUIZ.matchPairs) {
  const use = pick(concepts, Math.min(max, QUIZ.matchPairs, concepts.length));
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
 * 誤區辨識。兩個方向：
 *   正向 → 一個誤區 + 三個建議做法，問「哪一個是誤區」
 *   反向 → 一個建議做法 + 三個誤區，問「哪一個是建議做法」
 * 兩個方向都要出：誤區和流程的句子風格不同（一個描述錯誤、一個是指令），
 * 如果方向固定，答題者靠語氣就能猜對，題目就白出了。
 *
 * 方向由 seed 的奇偶決定而不是擲骰子。一場會出好幾題誤區辨識，全部隨機
 * 的話有機會連續三題都是同一個方向——那三題的題幹一模一樣，看起來就是
 * 「又是這題」。用奇偶保證方向交替，同時 seed 本身有隨機起點，所以不會
 * 每次練習都從同一個方向開始。
 *
 * @param {number} seed 用來挑第幾個誤區，並決定方向
 */
function pitfallItem(note, lessonId, seed) {
  const pits = (note.pitfalls || []).filter(Boolean);
  const steps = (note.workflow || []).filter(Boolean);
  if (pits.length < 1 || steps.length < 3) return null;

  const inverted = seed % 2 === 1;

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
 * @returns {Array} 題目陣列（已打亂），每堂 6–10 題
 */
export function buildExercises(note, lessonId) {
  if (!note) return [];
  const concepts = conceptsOf(note, lessonId);
  const items = [];

  /* 同一場裡不允許兩題出現一模一樣的四個選項。
     干擾項優先取「同一堂課的其他概念」——那是刻意的，考的就是分辨這一課的
     A 和 B。但 5 個概念的課只剩 2 題選擇題，各自從另外 4 個抽 3 個，抽到
     同一組的機率是 3/16；那兩題會顯示完全相同的四句話、只有正解不同，
     看起來就是同一題又出現了一次。實測 16% 的場次會發生。
     重抽最多 6 次，每次獨立，撞 6 次的機率約十萬分之三。 */
  const usedOptions = new Set();
  const optionSig = (q) => (q?.options ? q.options.map((o) => o.text).sort().join(' ') : null);
  const pushUnique = (build) => {
    let q = null;
    for (let i = 0; i < 6; i++) {
      q = build();
      if (!q) return;
      const s = optionSig(q);
      if (!s || !usedOptions.has(s)) { if (s) usedOptions.add(s); items.push(q); return; }
    }
    // 六次都撞代表干擾項池真的太小，收下比少一題好
    items.push(q);
  };

  /* 一個概念在一場練習裡只考一次。
     以前是「每個概念一題選擇題」再加一題涵蓋 4 個概念的配對題，於是
     實測 100% 的練習都有概念被考兩次、平均每場 3.95 個——那就是使用者
     看到的「這題剛剛不是問過了」。
     現在配對題先挑走一批概念，剩下的才出選擇題。 */
  let matched = new Set();
  // 至少要留 2 個概念給選擇題，不然整場只剩一題配對加誤區題
  const m = concepts.length >= 5
    ? matchPairs(concepts, lessonId, concepts.length - 2)
    : null;
  if (m) {
    m.pairs.forEach((p) => matched.add(p.key));
    items.push(m);
  }

  /* 沒被配對題挑走的概念各出一題，交替考「名→說明」與「說明→名」 */
  concepts.filter((c) => !matched.has(String(c.idx)))
    .forEach((c, i) => {
      pushUnique(() => ((i % 2 === 0) ? chooseBody(c, lessonId) : chooseTitle(c, lessonId)));
    });

  /* 誤區辨識：每一條誤區各出一題（上限 QUIZ.pitfallMax）。
     起點隨機，方向由索引奇偶交替，所以同一場不會出現三題長得一樣的題幹。 */
  const pitCount = Math.min((note.pitfalls || []).filter(Boolean).length, QUIZ.pitfallMax);
  const start = Math.floor(Math.random() * Math.max(1, pitCount));
  for (let i = 0; i < pitCount; i++) {
    const seed = start + i;
    pushUnique(() => {
      const p = pitfallItem(note, lessonId, seed);
      return p ? { ...p, id: `p:${lessonId}:${seed % pitCount}` } : null;
    });
  }

  return shuffle(items);
}

/**
 * 依 SRS 的項目 key 重建單一題目，供複習用。
 * key 格式：c:<lessonId>:<idx> / m:<lessonId> / p:<lessonId>:<n>
 *
 * `w:` 是已經移除的排序題。舊使用者的 SRS 裡可能還留著這種 key，
 * 這裡回 null，store.init() 的搬移會把它們清掉。
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
  if ((note.concepts || []).length >= 3) keys.push(`m:${lessonId}`);
  const pits = (note.pitfalls || []).filter(Boolean);
  const steps = (note.workflow || []).filter(Boolean);
  if (pits.length >= 1 && steps.length >= 3) {
    const n = Math.min(pits.length, QUIZ.pitfallMax);
    for (let i = 0; i < n; i++) keys.push(`p:${lessonId}:${i}`);
  }
  return keys;
}
