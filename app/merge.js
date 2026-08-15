/*
 * app/merge.js — 登入時合併本機與雲端
 *
 * 這個檔案的每一條規則都圍繞同一個判斷：**使用者手寫的筆記絕對不能默默消失。**
 * 那是這個產品最糟的失敗模式，比重複、比多出一段合併痕跡都糟得多。
 * 所以真衝突時選擇「兩份都留」而不是「挑一份」——使用者兩秒就能刪掉多餘的
 * 那段，但刪掉的內容救不回來。
 *
 * 其餘欄位的原則：
 *   進度  取 max。完成是單調的，合併永遠不會把已完成變回未完成。
 *   造訪  相加。多算幾次無害，少算會讓「讀過沒」失真。
 *   XP    不合併，從合併後的狀態重算。相加會把同一堂課算兩次。
 *   SRS   取「練習次數較多」的那份，那代表較新的排程。
 */

const DEFAULT_AVATAR_KEYS = ['body', 'tint', 'hat', 'scarf', 'hold', 'pet'];

/** 兩份課堂紀錄合成一份。 */
function mergeLesson(a, b) {
  if (!a) return { ...b };
  if (!b) return { ...a };
  const out = {
    s: Math.max(a.s || 0, b.s || 0),
    at: Math.max(a.at || 0, b.at || 0),
    v: (a.v || 0) + (b.v || 0)
  };
  // 旗標只要任一邊有就保留：全對過就是全對過，有筆記就是有筆記
  if (a.p || b.p) out.p = true;
  if (a.n || b.n) out.n = true;
  return out;
}

/** 合併 { [slug]: { lessons } } 兩棵樹。 */
export function mergeProgress(localP = {}, remoteP = {}) {
  const out = {};
  for (const slug of new Set([...Object.keys(localP), ...Object.keys(remoteP)])) {
    const L = localP[slug]?.lessons || {};
    const R = remoteP[slug]?.lessons || {};
    const lessons = {};
    for (const id of new Set([...Object.keys(L), ...Object.keys(R)])) {
      lessons[id] = mergeLesson(L[id], R[id]);
    }
    out[slug] = { lessons };
  }
  return out;
}

/** 合併 SRS。同一個項目取練習次數多的那份——那是比較新的排程狀態。 */
export function mergeSrs(localS = {}, remoteS = {}) {
  const out = {};
  for (const k of new Set([...Object.keys(localS), ...Object.keys(remoteS)])) {
    const a = localS[k], b = remoteS[k];
    if (!a) { out[k] = b; continue; }
    if (!b) { out[k] = a; continue; }
    out[k] = (a.n || 0) >= (b.n || 0) ? a : b;
  }
  return out;
}

function stamp(ts) {
  try {
    return new Date(ts).toLocaleString('zh-TW', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false
    });
  } catch { return ''; }
}

/**
 * 合併單一篇筆記。
 *
 * @param {object} loc   { body, updatedAt } | null
 * @param {object} rem   { body, updatedAt } | null
 * @param {number} baseAt 上次同步時的時間戳（沒有就是 0）
 * @returns {{ body:string, updatedAt:number, conflict:boolean }|null}
 */
export function mergeNote(loc, rem, baseAt = 0) {
  const lb = (loc?.body || '').trim();
  const rb = (rem?.body || '').trim();
  if (!lb && !rb) return null;
  if (!lb) return { body: rb, updatedAt: rem.updatedAt || 0, conflict: false };
  if (!rb) return { body: lb, updatedAt: loc.updatedAt || 0, conflict: false };
  if (lb === rb) {
    return { body: lb, updatedAt: Math.max(loc.updatedAt || 0, rem.updatedAt || 0), conflict: false };
  }

  const lChanged = (loc.updatedAt || 0) > baseAt;
  const rChanged = (rem.updatedAt || 0) > baseAt;

  // 只有一邊動過：那一邊就是答案，另一邊是舊的
  if (lChanged && !rChanged) return { body: lb, updatedAt: loc.updatedAt, conflict: false };
  if (rChanged && !lChanged) return { body: rb, updatedAt: rem.updatedAt, conflict: false };

  /* 兩邊都動過而且內容不同——真衝突。較新的放上面，較舊的接在下面，
     中間標明來源與時間，讓使用者自己決定要留哪一段。 */
  const localNewer = (loc.updatedAt || 0) >= (rem.updatedAt || 0);
  const top = localNewer ? loc : rem;
  const bot = localNewer ? rem : loc;
  const label = localNewer ? '另一台裝置的版本' : '這台裝置稍早的版本';
  const body = `${(top.body || '').trim()}\n\n---\n〔${label} · ${stamp(bot.updatedAt)}〕\n${(bot.body || '').trim()}`;
  return { body, updatedAt: Date.now(), conflict: true };
}

/** 合併全部筆記。回傳 { notes, conflicts:[lessonId] }。 */
export function mergeNotes(localN = {}, remoteN = {}, base = {}) {
  const notes = {};
  const conflicts = [];
  for (const id of new Set([...Object.keys(localN), ...Object.keys(remoteN)])) {
    const m = mergeNote(localN[id], remoteN[id], base[id]?.at || 0);
    if (!m) continue;
    notes[id] = {
      body: m.body,
      updatedAt: m.updatedAt,
      courseSlug: localN[id]?.courseSlug ?? remoteN[id]?.courseSlug ?? null
    };
    if (m.conflict) conflicts.push(id);
  }
  return { notes, conflicts };
}

/** 腳色外觀：本機動過就以本機為準，還是預設值就採用帳號上的。 */
export function mergeAvatar(localA, remoteA, defaults) {
  if (!remoteA) return localA;
  const untouched = DEFAULT_AVATAR_KEYS.every((k) => (localA?.[k] ?? null) === (defaults?.[k] ?? null));
  return untouched ? { ...defaults, ...remoteA } : localA;
}

/**
 * 把本機狀態與遠端快照合成一份新狀態。純函式，不碰 IO。
 *
 * @param {object} localState  store 的 state
 * @param {object} remote      { user, progress:{slug:doc}, notes:{id:doc} }
 * @param {object} base        noteBase
 * @param {object} defaults    DEFAULT_AVATAR
 */
export function mergeAll(localState, remote, base, defaults) {
  const rUser = remote.user || {};
  const rGame = rUser.game || {};

  const progress = mergeProgress(localState.progress, remote.progress);
  const { notes, conflicts } = mergeNotes(localState.notes, remote.notes, base);
  const srs = mergeSrs(localState.srs, rUser.srs);

  const seen = { ...(rUser.seen || {}) };
  for (const [k, v] of Object.entries(localState.seen || {})) {
    seen[k] = Math.min(seen[k] || Infinity, v);   // 提示看過就是看過，取較早的
  }

  const lc = localState.current, rc = rUser.current;
  const current = (lc?.at || 0) >= (rc?.at || 0) ? lc : rc;

  return {
    state: {
      progress,
      notes,
      srs,
      seen,
      current: current || null,
      game: {
        ...localState.game,
        // 全站唯一的累加值。兩邊取 max 而不是相加：同一次複習在兩台
        // 裝置上都同步過的話，相加會憑空多出一倍。
        reviewXp: Math.max(localState.game?.reviewXp || 0, rGame.reviewXp || 0),
        avatar: mergeAvatar(localState.game?.avatar, rGame.avatar, defaults)
      }
    },
    conflicts,
    remoteXp: rGame.xp || 0
  };
}
