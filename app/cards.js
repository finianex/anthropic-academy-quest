/*
 * app/cards.js — 練習前的短教學卡
 *
 * 這裡刻意只有 3 張卡，而且每一張都是「等一下練習會考的東西」，不是完整讀物。
 * 教學卡是**可跳過的預習**，真正決定「這堂過了沒有」的是練習。
 *
 * 筆記支援兩個為了「快速理解」而加的欄位：
 *   note.tldr          一句話重點（≤40 字），最先看到的東西
 *   concepts[i][2]     清單型補充資料（選填）
 *
 * 為什麼清單要獨立成第三個元素，而不是塞進說明文字裡：
 * concepts[i][1] 會直接變成選擇題的選項，而清單塞成句子之後動輒 200 字以上
 * （改版前最長 306 字），當選項根本讀不完。拆開之後說明文字保持一句話，
 * 清單只在教學卡顯示、永遠不會進到題目裡。
 */

/**
 * @param {object} note   content/notes.js 的一筆
 * @param {object} lesson { zh, en }
 * @returns {Array} 3 張教學卡
 */
export function buildTeachCards(note, lesson) {
  if (!note) return [];
  const cards = [];

  /* 1. 重點 + 具體例子：先給一句話結論，再馬上給一個落地的例子 */
  if (note.overview || note.tldr) {
    cards.push({
      kind: 'overview',
      kindZh: '本課重點',
      title: lesson?.zh || '本課重點',
      tldr: note.tldr || null,
      body: note.overview || '',
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
      list: concepts.map(([title, body, items]) => ({
        title,
        body,
        items: Array.isArray(items) ? items.filter(Boolean) : null
      }))
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
