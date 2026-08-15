/*
 * app/session.js — 練習場次的佇列引擎
 *
 * 核心規則（使用者選的「無愛心」模式）：
 *   答錯不會失敗，但那一題會被丟回佇列後段，**答對一次才出隊**。
 *   所以一場練習必然以「每一題都答對過」結束——沒有帶著錯誤離開的可能。
 *
 * 只有「第一次就答對」才算 ok，這是給 SRS 用的訊號：第二次才對的題目
 * 不該被當成已經記住。
 */

import { QUIZ } from './config.js';

/**
 * 建立一場練習。
 *
 * @param {Array} items  題目陣列
 * @param {object} [saved] snapshot() 存下來的狀態。傳了就從那裡接續，
 *   items 會被忽略——**題目本體是連著佇列一起存下來的**，不是重新產生。
 *   出題有隨機性（干擾項洗牌、排序題取區間），重新產生會得到不一樣的題目，
 *   那就不叫「接著做」了。
 */
export function createSession(items, saved) {
  /* queue 存的是待答的題目；每個題目帶著自己這一場的作答紀錄 */
  const queue = saved
    ? saved.queue.map((n) => ({ item: n.item, tries: n.tries | 0 }))
    : items.map((it) => ({ item: it, tries: 0 }));
  const firstTry = new Map(saved?.firstTry || []);   // itemId → 是否第一次就答對
  /* 只需要計數：done 陣列從頭到尾只有 .length 被讀過，
     存成陣列會讓 snapshot 白白多帶一份題目副本。 */
  let doneCount = saved ? (saved.cleared | 0) : 0;
  const total = saved ? (saved.total | 0) : queue.length;

  return {
    total,

    /** 還剩幾題（含被重排的錯題）。 */
    get remaining() { return queue.length; },

    /** 已經永久出隊幾題。 */
    get cleared() { return doneCount; },

    /** 存檔用的完整狀態。可以直接 JSON.stringify。 */
    snapshot() {
      return {
        v: 1,
        queue: queue.map((n) => ({ item: n.item, tries: n.tries })),
        firstTry: [...firstTry],
        cleared: doneCount,
        total
      };
    },

    /** 目前這一題，沒有就回 null（表示練習結束）。 */
    current() { return queue.length ? queue[0] : null; },

    /**
     * 作答。
     * @param {boolean} correct
     * @returns {object} { correct, firstTry, requeued, finished, cleared, total }
     */
    answer(correct) {
      const node = queue[0];
      if (!node) return null;
      node.tries += 1;

      const isFirst = node.tries === 1;
      if (!firstTry.has(node.item.id)) firstTry.set(node.item.id, correct && isFirst);

      if (correct) {
        queue.shift();
        doneCount += 1;
        return {
          correct: true,
          firstTry: firstTry.get(node.item.id),
          requeued: false,
          finished: queue.length === 0,
          cleared: doneCount,
          total
        };
      }

      /* 答錯：往後排。gap 用剩餘長度夾住，佇列很短時才不會又立刻問同一題。 */
      queue.shift();
      const gap = Math.min(QUIZ.requeueGap, queue.length);
      queue.splice(gap, 0, node);
      return {
        correct: false,
        firstTry: false,
        requeued: true,
        finished: false,
        cleared: doneCount,
        total
      };
    },

    /**
     * 每個題目「是否第一次就答對」的結果，餵給 SRS。
     * @returns {Array} [{ id, ok }]
     */
    results() {
      return [...firstTry.entries()].map(([id, ok]) => ({ id, ok }));
    },

    /** 這場的第一次正確率，用來決定要不要給全對獎勵。 */
    accuracy() {
      const r = [...firstTry.values()];
      if (!r.length) return 0;
      return r.filter(Boolean).length / r.length;
    },

    perfect() {
      const r = [...firstTry.values()];
      return r.length > 0 && r.every(Boolean);
    }
  };
}
