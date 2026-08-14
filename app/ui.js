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

/* ═══ 小圖示 ═════════════════════════════════════════════════ */
const ic = (d, extra) => svg('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false', ...extra },
  svg('path', { d, fill: 'none', stroke: 'currentColor', 'stroke-width': 2.4, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }));

export const ICON = {
  check:  () => ic('M4.5 12.5l5 5 10-11'),
  checkThin: () => svg('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true' },
    svg('path', { d: 'M4.5 12.5l5 5 10-11', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-dasharray': '3 2.4', 'stroke-linecap': 'round' })),
  film:   () => ic('M3 6h18v12H3zM8 6v12M16 6v12'),
  star:   () => ic('M12 3l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 18l-5.9 3 1.2-6.5L2.5 9.9 9.1 9z'),
  arrowL: () => ic('M14 6l-6 6 6 6'),
  arrowR: () => ic('M10 6l6 6-6 6'),
  map:    () => ic('M3 7l6-3 6 3 6-3v13l-6 3-6-3-6 3zM9 4v13M15 7v13'),
  lock:   () => ic('M6 11h12v9H6zM9 11V8a3 3 0 016 0v3'),
  pin:    () => ic('M12 21s7-6.3 7-11a7 7 0 10-14 0c0 4.7 7 11 7 11zM12 10.5v.01'),
  flag:   () => ic('M6 21V4h11l-1.6 4L17 12H6'),
  close:  () => ic('M6 6l12 12M18 6L6 18'),
  cross:  () => ic('M6 6l12 12M18 6L6 18'),
  brain:  () => ic('M9 4a3 3 0 00-3 3 3 3 0 00-1 5.8V17a3 3 0 003 3h1V4zM15 4a3 3 0 013 3 3 3 0 011 5.8V17a3 3 0 01-3 3h-1V4z')
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
      me
    )
  );

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
  host.replaceChildren(
    el('div', { class: 'wrap' },
      el('p', { text: '非官方繁體中文學習站。課程名稱、商標、影片及官方教材權利歸原權利人所有。' }),
      el('p', { class: 'row', style: { 'margin-top': '8px', gap: '14px' } },
        el('a', { class: 'crumb', href: 'https://anthropic.skilljar.com/', target: '_blank', rel: 'noopener noreferrer', text: '前往官方網站 ↗' }),
        el('span', { text: '進度目前存在這台裝置的瀏覽器裡。' })
      )
    )
  );
}

/* ═══ 儲存空間警告 ═══════════════════════════════════════════ */
export function warnQuota() {
  showEvents([{ type: 'plain', text: '瀏覽器儲存空間已滿，這次變更沒有存下來。' }]);
}
