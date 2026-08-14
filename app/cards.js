/*
 * app/cards.js — 練習前的短教學卡
 *
 * 這裡刻意只有 3 張卡，而且每一張都是「等一下練習會考的東西」，不是完整讀物。
 * 舊版把一堂課拆成 7–11 張逐一翻的閱讀卡；那本質上還是分頁的文章，
 * 讀完按一下就算學完，沒有任何回想的動作。
 *
 * 現在的定位是：教學卡是**可跳過的預習**，真正決定「這堂過了沒有」的是練習。
 * 所以卡片要短、要能一眼掃完，而不是要好看。
 */

/**
 * @param {object} note   content/notes.js 的一筆
 * @param {object} lesson { zh, en }
 * @returns {Array} 3 張教學卡
 */
export function buildTeachCards(note, lesson) {
  if (!note) return [];
  const cards = [];

  /* 1. 重點 + 具體例子：先給一個抽象概述，再馬上給一個落地的例子 */
  if (note.overview) {
    cards.push({
      kind: 'overview',
      kindZh: '本課重點',
      title: lesson?.zh || '本課重點',
      body: note.overview,
      example: note.example || null
    });
  }

  /* 2. 核心概念一次全給：等一下的選擇題與配對題全部出自這裡 */
  const concepts = (note.concepts || []).filter(([t, b]) => t && b);
  if (concepts.length) {
    cards.push({
      kind: 'concepts',
      kindZh: '核心概念',
      title: `這一課的 ${concepts.length} 個概念`,
      list: concepts.map(([title, body]) => ({ title, body }))
    });
  }

  /* 3. 流程 + 誤區：排序題出自流程，誤區辨識題出自兩者的對比 */
  const workflow = (note.workflow || []).filter(Boolean);
  const pitfalls = (note.pitfalls || []).filter(Boolean);
  if (workflow.length || pitfalls.length) {
    cards.push({
      kind: 'howto',
      kindZh: '實際流程與誤區',
      title: '怎麼做，以及不要怎麼做',
      workflow,
      pitfalls
    });
  }

  return cards;
}
