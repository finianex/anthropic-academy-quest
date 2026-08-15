/*
 * app/account.js — HUD 上的帳號區塊
 *
 * 避免登入狀態閃爍的三層做法：
 *   1. 每個頁面的 <head> 有一段同步 inline script，在首次繪製前就把
 *      aaq:v1:authHint 寫進 documentElement.dataset.auth，CSS 立刻畫出
 *      正確形狀
 *   2. 這裡用 localStorage 快取的名字與頭像先畫，不等 Firebase 回來
 *   3. 三種狀態（檢查中／未登入／已登入）的尺寸一致，狀態切換時版面
 *      不會位移
 *
 * onAuthStateChanged 可能要 100–800ms。少了這三層，回訪者每次載入都會
 * 看到「登入」按鈕閃一下再變成自己的頭像——那會讓人以為自己被登出了。
 */

import { el, svg, fill, safeImgSrc } from './dom.js';
import { KEYS } from './config.js';
import * as local from './local.js';
import * as cloud from './cloud.js';
import * as auth from './auth.js';
import * as sync from './sync.js';
import { showEvents } from './ui.js';

const icon = (d, size = 18) => svg('svg', {
  viewBox: '0 0 24 24', width: size, height: size,
  'aria-hidden': 'true', focusable: 'false'
}, svg('path', {
  d, fill: 'none', stroke: 'currentColor', 'stroke-width': 2.2,
  'stroke-linecap': 'round', 'stroke-linejoin': 'round'
}));

const I = {
  user:  (s) => icon('M12 12a4 4 0 100-8 4 4 0 000 8zM4.5 20a7.5 7.5 0 0115 0', s),
  cloud: (s) => icon('M7 18a4 4 0 010-8 5.5 5.5 0 0110.6-1.4A3.8 3.8 0 0117.5 18z', s),
  warn:  (s) => icon('M12 8.5v5m0 3.2v.1M10.3 4.3L2.9 17.5A1.8 1.8 0 004.5 20h15a1.8 1.8 0 001.6-2.5L13.7 4.3a1.8 1.8 0 00-3.4 0z', s),
  out:   (s) => icon('M15 17l5-5-5-5M20 12H9M12 20H6a2 2 0 01-2-2V6a2 2 0 012-2h6', s)
};

/**
 * 掛上帳號區塊。
 * @param {HTMLElement} slot HUD 裡預留的容器
 */
export function mountAccount(slot) {
  if (!cloud.enabled()) { slot.remove(); return; }

  const cached = local.read(KEYS.profile, null);
  const hinted = local.read(KEYS.authHint, null) === '1';

  const face = el('span', { class: 'acc-face' });
  const name = el('span', { class: 'acc-name' });
  const dot = el('span', { class: 'acc-dot', 'aria-hidden': 'true' });

  const btn = el('button', {
    class: 'acc-btn', type: 'button',
    'aria-haspopup': 'menu', 'aria-expanded': 'false'
  }, face, name, dot);

  const menu = el('div', { class: 'acc-menu', role: 'menu', hidden: true });
  const wrap = el('div', { class: 'acc' }, btn, menu);
  slot.replaceChildren(wrap);

  /* ── 畫面 ── */

  function paintFace(user) {
    const url = safeImgSrc(user?.photoURL || cached?.photo || '');
    if (url) {
      fill(face, el('img', { src: url, alt: '', width: 26, height: 26, referrerpolicy: 'no-referrer' }));
    } else {
      fill(face, I.user(18));
    }
  }

  function paint(user, ready) {
    const on = !!user;
    wrap.dataset.state = on ? 'in' : (ready ? 'out' : 'pending');

    if (on) {
      paintFace(user);
      name.textContent = user.displayName || user.email || '已登入';
      btn.setAttribute('aria-label', `帳號：${user.displayName || user.email}。開啟帳號選單`);
    } else if (!ready && hinted) {
      // 還在確認，但上次是登入狀態——先畫成登入的樣子，避免閃爍
      paintFace(null);
      name.textContent = cached?.name || '還原中…';
      btn.setAttribute('aria-label', '正在還原登入狀態');
    } else {
      fill(face, I.user(18));
      name.textContent = '登入';
      btn.setAttribute('aria-label', '用 Google 登入，讓進度跟著帳號跑');
    }
    paintDot();
  }

  function paintDot() {
    const s = sync.status();
    if (!s.on) { dot.hidden = true; return; }
    dot.hidden = false;
    dot.dataset.s = s.merging ? 'merge' : s.error ? 'err' : s.pending ? 'wait' : 'ok';
    dot.title = s.merging ? '正在合併這台裝置與帳號上的資料'
      : s.error ? '尚未同步，資料安全存在這台裝置'
      : s.pending ? `同步中 · ${s.pending} 筆`
      : '已同步';
  }

  /* ── 選單 ── */

  function closeMenu() {
    menu.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
  }

  function openMenu() {
    const user = auth.currentUser();
    const s = sync.status();
    const rows = [];

    if (user) {
      rows.push(el('div', { class: 'acc-who' },
        el('b', { text: user.displayName || '（未設定名稱）' }),
        el('small', { text: user.email || '' })
      ));
      rows.push(el('div', { class: 'acc-sync', 'data-s': s.error ? 'err' : 'ok' },
        s.error ? I.warn(16) : I.cloud(16),
        el('span', {
          text: s.merging ? '正在合併資料…'
            : s.error ? '有變更還沒同步上去'
            : s.pending ? `同步中 · ${s.pending} 筆`
            : '進度已同步到你的帳號'
        })
      ));
      if (s.error) {
        rows.push(el('button', {
          class: 'acc-item', type: 'button', role: 'menuitem', text: '立即重試同步',
          on: { click: () => { sync.flush(); closeMenu(); } }
        }));
      }
      rows.push(el('button', {
        class: 'acc-item', type: 'button', role: 'menuitem',
        on: { click: () => doSignOut(false) }
      }, I.out(16), el('span', { text: '登出' })));
      rows.push(el('button', {
        class: 'acc-item acc-item--danger', type: 'button', role: 'menuitem',
        on: { click: () => doSignOut(true) }
      }, el('span', { text: '登出並清除這台裝置的資料' })));
      rows.push(el('p', { class: 'acc-note', text: '一般登出會保留這台裝置上的進度，方便你以匿名身分繼續讀。' }));
    } else {
      rows.push(el('p', { class: 'acc-note', text: '用 Google 登入之後，進度與筆記會跟著帳號走，換裝置也看得到。未登入時一切照常運作，只是資料留在這台裝置。' }));
      rows.push(el('button', {
        class: 'acc-item acc-item--go', type: 'button', role: 'menuitem', text: '用 Google 登入',
        on: { click: doSignIn }
      }));
    }

    fill(menu, ...rows);
    menu.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    menu.querySelector('button')?.focus();
  }

  /* ── 動作 ── */

  let busy = false;

  async function doSignIn() {
    if (busy) return;
    busy = true;
    closeMenu();
    name.textContent = '登入中…';

    const r = await auth.signIn();
    busy = false;
    if (!r.ok) {
      paint(auth.currentUser(), auth.isReady());
      if (r.code !== 'auth/popup-closed-by-user' && r.code !== 'auth/cancelled-popup-request') {
        showEvents([{ type: 'plain', text: r.message }]);
      }
      return;
    }

    const res = await sync.attach(r.user);
    paint(auth.currentUser(), true);
    if (res.conflicts?.length) {
      // 明說發生了什麼、影響哪幾篇，而不是一句「已同步」帶過
      showEvents([{
        type: 'plain',
        text: `已合併兩邊的資料。有 ${res.conflicts.length} 篇筆記在兩台裝置上都改過，兩個版本都保留了，請自行整理。`
      }]);
    } else if (res.merged) {
      showEvents([{ type: 'plain', text: '已把這台裝置的進度併入你的帳號。' }]);
    } else {
      showEvents([{ type: 'plain', text: '已登入，進度會自動同步。' }]);
    }
  }

  async function doSignOut(wipe) {
    if (wipe && !window.confirm('這會清掉這台裝置上的所有進度、筆記與角色設定。\n已經同步到帳號的資料不受影響，下次登入還會回來。\n\n確定要清除嗎？')) return;
    closeMenu();
    sync.detach();
    await auth.signOut(wipe);
    if (wipe) location.reload();
    else paint(null, true);
  }

  /* ── 事件 ── */

  btn.addEventListener('click', () => (menu.hidden ? openMenu() : closeMenu()));
  btn.addEventListener('pointerenter', auth.prewarm, { once: true });
  btn.addEventListener('focus', auth.prewarm, { once: true });

  document.addEventListener('click', (e) => {
    if (!menu.hidden && !wrap.contains(e.target)) closeMenu();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !menu.hidden) { closeMenu(); btn.focus(); }
  });

  auth.onAuth((user, ready) => {
    paint(user, ready);
    if (user && !sync.status().on) sync.attach(user).then(() => paintDot());
  });
  sync.onStatus(paintDot);

  paint(auth.currentUser(), auth.isReady());
  auth.start();
  cloud.warm();
}
