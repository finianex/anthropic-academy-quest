/*
 * app/cards.js — 把一堂課的中文筆記推導成一疊卡片
 *
 * 筆記的五個欄位（overview / concepts / workflow / example / pitfalls）在 154 堂裡
 * 全部填滿。concepts 實測 3–7 個，所以每堂會得到 7–11 張卡，平均 8.8 張。
 *
 * 為什麼 workflow 和 pitfalls 各自只給一張卡、而 concepts 一個一張：
 *   workflow 是有序流程，拆開來看會失去「這是一連串步驟」的意義；
 *   pitfalls 是並列的警告清單，一起看才能互相對照；
 *   concepts 每一個都是獨立的觀念，一張一個才有「讀完一個再讀下一個」的節奏。
 */

/**
 * @param {object} note  content/notes.js 裡的一筆
 * @param {object} lesson  { zh, en }
 * @returns {Array} 卡片陣列
 */
export function buildCards(note, lesson) {
  if (!note) return [];
  const cards = [];

  if (note.overview) {
    cards.push({
      kind: 'overview',
      kindZh: '本課重點',
      title: lesson?.zh || '本課重點',
      body: note.overview
    });
  }

  const concepts = Array.isArray(note.concepts) ? note.concepts : [];
  concepts.forEach(([title, body], i) => {
    if (!title && !body) return;
    cards.push({
      kind: 'concept',
      kindZh: '核心概念',
      seq: i + 1,
      seqOf: concepts.length,
      title: title || '',
      body: body || ''
    });
  });

  const workflow = Array.isArray(note.workflow) ? note.workflow.filter(Boolean) : [];
  if (workflow.length) {
    cards.push({
      kind: 'workflow',
      kindZh: '實際流程',
      title: '實際流程',
      items: workflow
    });
  }

  if (note.example) {
    cards.push({
      kind: 'example',
      kindZh: '具體例子',
      title: '具體例子',
      body: note.example
    });
  }

  const pitfalls = Array.isArray(note.pitfalls) ? note.pitfalls.filter(Boolean) : [];
  if (pitfalls.length) {
    cards.push({
      kind: 'pitfalls',
      kindZh: '常見誤區',
      title: '常見誤區',
      items: pitfalls
    });
  }

  return cards;
}
