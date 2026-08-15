/*
 * app/ui.js — 跨頁共用的介面零件
 */

import { el, svg, fill, clear, reducedMotion } from './dom.js';
import { renderAvatar, avatarLabel } from './avatar.js';
import * as store from './store.js';

export const fmt = (n) => Number(n || 0).toLocaleString('zh-Hant');

/* ═══ 進度環 ═════════════════════════════════════════════════ */
export function ring(pct, { size = 110, stroke = 7 } = {}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, pct || 0));
  return svg('svg', { class: 'ring', viewBox: `0 0 ${size} ${size}`, 'aria-hidden': 'true', focusable: 'false' },
    svg('circle', { class: 'trk', cx: size / 2, cy: size / 2, r, 'stroke-width': stroke }),
    svg('circle', {
      class: 'val', cx: size / 2, cy: size / 2, r, 'stroke-width': stroke,
      'stroke-dasharray': c.toFixed(2),
      'stroke-dashoffset': (c * (1 - p / 100)).toFixed(2)
    })
  );
}

/* ═══ 小圖示 ═════════════════════════════════════════════════
 * 每個圖示都**必須**有明確尺寸。沒有 width/height 的 inline SVG 在 flex
 * 容器裡沒有可靠的固有尺寸，瀏覽器會讓它去搶空間，把旁邊的文字擠成
 * 一個字寬——中文是逐字斷行的，於是「下一張」就變成三個字垂直排列，
 * 按鈕跟著被撐到 101px 高。所以這裡預設 20px，而且每個 ICON 都要
 * 把呼叫端傳進來的尺寸轉交出去（以前定義成 () => ic(d) 會把參數吃掉）。
 */
const ic = (d, extra) => svg('svg', {
  viewBox: '0 0 24 24', width: 20, height: 20,
  'aria-hidden': 'true', focusable: 'false',
  ...extra
}, svg('path', {
  d, fill: 'none', stroke: 'currentColor',
  'stroke-width': 2.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round'
}));

export const ICON = {
  check:  (a) => ic('M4.5 12.5l5 5 10-11', a),
  checkThin: (a) => svg('svg', {
    viewBox: '0 0 24 24', width: 20, height: 20, 'aria-hidden': 'true', focusable: 'false', ...a
  }, svg('path', {
    d: 'M4.5 12.5l5 5 10-11', fill: 'none', stroke: 'currentColor',
    'stroke-width': 2, 'stroke-dasharray': '3 2.4', 'stroke-linecap': 'round'
  })),
  film:   (a) => ic('M3 6h18v12H3zM8 6v12M16 6v12', a),
  star:   (a) => ic('M12 3l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 18l-5.9 3 1.2-6.5L2.5 9.9 9.1 9z', a),
  arrowL: (a) => ic('M14 6l-6 6 6 6', a),
  arrowR: (a) => ic('M10 6l6 6-6 6', a),
  map:    (a) => ic('M3 7l6-3 6 3 6-3v13l-6 3-6-3-6 3zM9 4v13M15 7v13', a),
  lock:   (a) => ic('M6 11h12v9H6zM9 11V8a3 3 0 016 0v3', a),
  pin:    (a) => ic('M12 21s7-6.3 7-11a7 7 0 10-14 0c0 4.7 7 11 7 11zM12 10.5v.01', a),
  flag:   (a) => ic('M6 21V4h11l-1.6 4L17 12H6', a),
  close:  (a) => ic('M6 6l12 12M18 6L6 18', a),
  cross:  (a) => ic('M6 6l12 12M18 6L6 18', a),
  brain:  (a) => ic('M9 4a3 3 0 00-3 3 3 3 0 00-1 5.8V17a3 3 0 003 3h1V4zM15 4a3 3 0 013 3 3 3 0 011 5.8V17a3 3 0 01-3 3h-1V4z', a),
  /* 喇叭本體 + 兩道音波／一條斜槓。開與關的外形差異刻意做大，
     因為狀態不能只靠顏色分辨。 */
  sound:  (a) => ic('M4 9.5h3.5L12 5.5v13L7.5 14.5H4zM16 9a4 4 0 010 6M18.5 6.5a7.5 7.5 0 010 11', a),
  mute:   (a) => ic('M4 9.5h3.5L12 5.5v13L7.5 14.5H4zM16.5 10l5 4M21.5 10l-5 4', a)
};

/* ═══ HUD ════════════════════════════════════════════════════ */

/**
 * 掛上頂端狀態列。回傳一個 update 函式，狀態變動時呼叫它。
 * @param {HTMLElement} host  <header class="hud"> 的容器
 * @param {object} opts { active:'map'|'me' }
 */
export function mountHud(host, opts = {}) {
  const av = el('span', { class: 'hud-me-av' });
  const lvl = el('b');
  const bar = el('span', { class: 'xpbar' }, el('i'));
  const xpN = el('span', { class: 'hud-me-xp' });

  const me = el('a', { class: 'hud-me', href: 'me.html' },
    av,
    el('span', { class: 'hud-me-txt' }, lvl, bar),
    xpN
  );

  host.replaceChildren(
    el('div', { class: 'hud-in wrap' },
      el('a', { class: 'hud-brand', href: 'index.html' },
        el('span', { class: 'logo' }, ICON.map()),
        el('span', null,
          el('b', { text: '學習地圖' }),
          el('small', { text: 'Anthropic Academy 繁中' })
        )
      ),
      el('span', { class: 'hud-spacer' }),
      el('a', { class: 'hud-link', href: 'index.html', text: '世界地圖', 'aria-current': opts.active === 'map' ? 'page' : null }),
      el('a', { class: 'hud-link', href: 'review.html', text: '複習', 'aria-current': opts.active === 'review' ? 'page' : null }),
      el('a', { class: 'hud-link', href: 'me.html', text: '我的角色', 'aria-current': opts.active === 'me' ? 'page' : null }),
      me,
      el('span', { class: 'hud-acc', id: 'hud-acc' })
    )
  );

  /* 帳號區塊用動態 import 掛上：ui 與 account 互相引用（account 需要
     showEvents），靜態 import 會形成循環。動態載入把時序推到執行期，
     順帶讓沒有設定 Firebase 的站台完全不必解析這個模組。 */
  const accSlot = host.querySelector('#hud-acc');
  import('./account.js')
    .then((m) => m.mountAccount(accSlot))
    .catch((e) => { console.warn('[aaq] 帳號區塊載入失敗：', e); accSlot.remove(); });

  function update(view) {
    const a = store.avatar();
    fill(av, renderAvatar(a, { level: view.level.n, showGear: true }));
    lvl.textContent = `Lv.${view.level.n} ${view.level.zh}`;
    bar.style.setProperty('--pct', view.level.pct + '%');
    xpN.textContent = fmt(view.xp);
    me.setAttribute('aria-label',
      `我的角色：${avatarLabel(a, view.level.n)}，${fmt(view.xp)} XP` +
      (view.level.isMax ? '，已達最高等級' : `，距離 Lv.${view.level.n + 1} 還要 ${fmt(view.level.span - view.level.into)} XP`)
    );
  }

  update(store.derived());
  store.subscribe(update);
  return update;
}

/* ═══ Toast ══════════════════════════════════════════════════ */

let toastHost = null;

function host() {
  if (!toastHost) {
    toastHost = el('div', { class: 'toasts', role: 'status', 'aria-live': 'polite' });
    document.body.appendChild(toastHost);
  }
  return toastHost;
}

/**
 * 顯示這次動作賺到的東西。events 來自 gamify.diff()。
 * 語氣規則：敘述式，不是稱讚式。除了完成整門課，不用驚嘆號。
 */
export function showEvents(events) {
  if (!events?.length) return;
  const h = host();
  events.forEach((ev, i) => {
    let cls = 'toast', body;
    if (ev.type === 'xp') {
      cls += ' toast--xp';
      body = [ICON.star({ width: 18, height: 18 }), el('span', { text: `+${ev.amount} XP` })];
    } else if (ev.type === 'badge') {
      cls += ' toast--badge';
      body = [ICON.check({ width: 18, height: 18 }), el('span', { text: `獲得徽章「${ev.badge.zh}」` })];
    } else if (ev.type === 'level') {
      cls += ' toast--level';
      body = [ICON.star({ width: 18, height: 18 }), el('span', { text: `升到 Lv.${ev.level.n} ${ev.level.zh}` })];
    } else {
      body = [el('span', { text: String(ev.text || '') })];
    }

    const t = el('div', { class: cls, style: { 'animation-delay': `${i * 110}ms` } }, ...body);
    h.appendChild(t);
    const life = reducedMotion() ? 2200 : 2800 + i * 260;
    setTimeout(() => {
      t.classList.add('out');
      setTimeout(() => t.remove(), 260);
    }, life);
  });
}

/* ═══ 頁尾 ═══════════════════════════════════════════════════ */
export function mountFoot(host) {
  // 這句話是對使用者的事實陳述，登入前後不一樣，不能寫死
  const where = el('span', { text: '進度目前存在這台裝置的瀏覽器裡。' });

  host.replaceChildren(
    el('div', { class: 'wrap' },
      el('p', { text: '非官方繁體中文學習站。課程名稱、商標、影片及官方教材權利歸原權利人所有。' }),
      el('p', { class: 'row', style: { 'margin-top': '8px', gap: '14px' } },
        el('a', { class: 'crumb', href: 'https://anthropic.skilljar.com/', target: '_blank', rel: 'noopener noreferrer', text: '前往官方網站 ↗' }),
        where
      )
    )
  );

  import('./auth.js').then((auth) => {
    auth.onAuth((user) => {
      where.textContent = user
        ? '進度會同步到你的 Google 帳號，換裝置也看得到。'
        : '進度目前存在這台裝置的瀏覽器裡。';
    });
  }).catch(() => {});
}

/* ═══ 儲存空間警告 ═══════════════════════════════════════════ */
export function warnQuota() {
  showEvents([{ type: 'plain', text: '瀏覽器儲存空間已滿，這次變更沒有存下來。' }]);
}
