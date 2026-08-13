/*
 * app/map-island.js — 島嶼蜿蜒路徑
 *
 * 兩層結構是刻意的：
 *   SVG 只畫路（aria-hidden、pointer-events:none）——SVG 的焦點行為與中文換行都比 HTML 差
 *   HTML 畫節點（真正的 <a>，DOM 順序 = 建議路線順序，所以 Tab 就是照課程順序走）
 *
 * 版面在「CSS px」座標系計算，viewBox 直接等於量到的容器寬度。
 * 如果改用固定 viewBox 再讓它縮放，56px 的節點在 366px 寬的手機上會變成 19px，
 * 而所有尺寸都得換算成 viewBox 單位——直接用 px 就沒有這一整類問題。
 *
 * 路是「每段一個 <path>」而不是一條長 path。這個選擇讓
 * 「走過／未走過」只是換 data 屬性，不需要任何 stroke-dasharray 位移運算。
 */

import { el, svg, fill, clear, reducedMotion } from './dom.js';
import { LAYOUT_BREAKPOINTS, BAND_H, SEG_GAP } from './config.js';
import { islandSegments, island, info, isVideoOnly } from './catalog.js';
import { nodeState, suggestedNode, standingNode, prereqUnmet, nodeProgress } from './progress.js';
import { renderAvatar, avatarLabel } from './avatar.js';
import { ICON } from './ui.js';
import * as store from './store.js';

const pickBp = (w) => LAYOUT_BREAKPOINTS.find((b) => w >= b[0]) || LAYOUT_BREAKPOINTS[LAYOUT_BREAKPOINTS.length - 1];

/**
 * 蛇形（boustrophedon）版面：每一門課自己一段，段與段之間插入課程標題。
 * 每段從左邊開始，所以每門課的第一堂都在同一個位置，閱讀節奏一致。
 */
/* 節點連標籤的寬度（見 map.css 的 .node），用來把 x 夾在版面內，
   避免最外側的節點標籤超出棋盤右緣造成整頁橫向捲動。 */
const NODE_HALF = 66;

function layout(segments, width) {
  const [, cols, RH, NODE, PAD] = pickBp(width);
  const span = (width - 2 * PAD) / Math.max(cols - 1, 1);
  const lo = Math.min(NODE_HALF + 2, width / 2);
  const hi = Math.max(width - NODE_HALF - 2, width / 2);
  const clampX = (x) => Math.max(lo, Math.min(hi, x));
  const pts = [];
  const bands = [];
  let y = PAD;

  for (const seg of segments) {
    bands.push({ seg, y });
    y += BAND_H;

    const n = seg.nodes.length;
    const rows = Math.max(1, Math.ceil(n / cols));
    seg.nodes.forEach((node, i) => {
      const r = Math.floor(i / cols);
      const c = i % cols;
      const cc = r % 2 === 0 ? c : cols - 1 - c;      // 偶數列往右、奇數列往左
      pts.push({
        node, seg, i,
        // 決定性的擺動：每次算出來都一樣（不會因為重繪而抖動），但足以打散「一看就是格線」的感覺
        x: clampX(PAD + cc * span + (cols > 2 ? 20 : 7) * Math.sin(i * 1.7 + 0.6)),
        y: y + r * RH + 11 * Math.cos(i * 2.3)
      });
    });

    y += rows * RH + SEG_GAP;
  }

  return { pts, bands, height: Math.round(y - SEG_GAP + PAD), cols, RH, NODE, PAD, width };
}

/** 一段路：同列走平緩的 S，換列時往外側鼓出去。 */
function segPath(a, b, L) {
  const ay = a.y + L.NODE / 2;
  const by = b.y + L.NODE / 2;
  const sameRow = Math.abs(a.y - b.y) < L.RH * 0.5;

  if (sameRow) {
    const dx = b.x - a.x;
    return `M${a.x} ${ay}C${a.x + dx * 0.45} ${ay - 15} ${a.x + dx * 0.55} ${by + 15} ${b.x} ${by}`;
  }
  const dir = b.x > L.width / 2 ? 1 : -1;
  const k = Math.min(72, L.PAD + 20);
  return `M${a.x} ${ay}C${a.x + dir * k} ${ay + 20} ${b.x + dir * k} ${by - 20} ${b.x} ${by}`;
}

export function mountIsland(host, islandKey) {
  const isl = island(islandKey);
  if (!isl) return null;

  const segments = islandSegments(islandKey);
  const road = svg('svg', { class: 'board-road', 'aria-hidden': 'true', focusable: 'false' });
  const bandsHost = el('div', { class: 'board-bands' });
  const list = el('ol', { class: 'board-nodes' });
  const token = el('div', { class: 'token' });
  const board = el('div', { class: 'board' }, road, bandsHost, list, token);

  const locate = el('button', {
    class: 'locate btn btn--ghost btn--sm',
    type: 'button',
    hidden: true,
    on: { click: () => token.scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' }) }
  }, ICON.pin({ width: 16, height: 16 }), el('span', { text: '回到我的位置' }));

  /* ── 建立節點（只建一次，之後只換屬性與位置）─────────────── */
  const cells = [];      // 與 layout().pts 同順序
  let seqInCourse = 0;
  let lastSlug = null;

  for (const seg of segments) {
    for (const node of seg.nodes) {
      if (node.slug !== lastSlug) { seqInCourse = 0; lastSlug = node.slug; }
      seqInCourse += 1;

      const disc = el('span', { class: 'node-disc' });
      const labelZh = el('span');
      const label = el('span', { class: 'node-label' }, labelZh);
      if (node.kind === 'section') {
        label.appendChild(el('small', { text: `${node.lessonIds.length} 堂` }));
      }
      labelZh.textContent = node.zh;

      const a = el('a', { class: 'node', href: node.href, tabindex: '-1' }, disc, label);
      const li = el('li', null, a);
      list.appendChild(li);
      cells.push({ node, seg, li, a, disc, seq: seqInCourse });
    }
  }

  /* ── 路段標題 ─────────────────────────────────────────────── */
  const bandEls = segments.map((seg, i) => {
    const count = el('span', { class: 'band-count' });
    const band = el('div', {
      class: 'band',
      data: { video: seg.videoOnly ? '1' : null }
    },
      el('span', { class: 'band-chip' },
        el('span', { class: 'n', text: String(i + 1).padStart(2, '0') }),
        el('span', { text: seg.course.zhTitle }),
        count
      )
    );
    bandsHost.appendChild(band);
    return { band, count, seg };
  });

  host.replaceChildren(board);
  document.body.appendChild(locate);

  /* ── 狀態渲染 ─────────────────────────────────────────────── */
  let suggested = null;

  function render(view) {
    suggested = suggestedNode(view);

    for (const cell of cells) {
      const st = nodeState(cell.node, view, suggested);
      const pr = nodeProgress(cell.node, view);
      cell.a.dataset.state = st;
      cell.a.dataset.kind = cell.node.kind;

      clear(cell.disc);
      if (st === 'done') {
        // 影片課的完成是自我回報，用虛線勾——本站無法驗證，不假裝驗證了
        cell.disc.appendChild(cell.node.kind === 'section' ? ICON.checkThin() : ICON.check());
      } else if (cell.node.kind === 'section') {
        cell.disc.appendChild(ICON.film());
      } else {
        cell.disc.appendChild(el('span', { text: String(cell.seq).padStart(2, '0') }));
      }

      const stZh = st === 'done' ? '已完成' : st === 'now' ? '建議下一步' : st === 'ahead' ? '尚早' : '可以開始';
      const kindZh = cell.node.kind === 'section'
        ? `章節，共 ${pr.total} 堂，已完成 ${pr.done} 堂`
        : `第 ${cell.seq} 堂`;
      cell.a.setAttribute('aria-label',
        `${cell.seg.course.zhTitle} · ${kindZh} · ${cell.node.zh} · ${stZh}`);
      cell.a.setAttribute('aria-current', st === 'now' ? 'step' : null);
      if (st !== 'now') cell.a.removeAttribute('aria-current');
    }

    for (const b of bandEls) {
      const st = view.perCourse.get(b.seg.slug) || { done: 0, total: 0, complete: false };
      b.count.textContent = `${st.done}/${st.total} 堂`;
      b.band.dataset.done = st.complete ? '1' : '0';
    }

    setRoving();
    place(view);
  }

  /* ── 位置計算 ─────────────────────────────────────────────── */
  let L = null;

  function place(view) {
    const w = board.clientWidth;
    if (!w) return;
    L = layout(segments, w);
    board.style.height = L.height + 'px';
    road.setAttribute('viewBox', `0 0 ${w} ${L.height}`);

    L.pts.forEach((p, i) => {
      const cell = cells[i];
      cell.li.style.setProperty('--x', `${Math.round(p.x)}px`);
      cell.li.style.setProperty('--y', `${Math.round(p.y)}px`);
      cell.a.style.setProperty('--node', `${L.NODE}px`);
    });
    L.bands.forEach((b, i) => {
      bandEls[i].band.style.setProperty('--y', `${Math.round(b.y)}px`);
    });

    /* 路：只在同一門課的相鄰節點之間連線（課與課之間由路段標題分隔） */
    const paths = [];
    for (let i = 1; i < L.pts.length; i++) {
      const a = L.pts[i - 1], b = L.pts[i];
      if (a.seg !== b.seg) continue;
      const d = segPath(a, b, L);
      const walked = view.done.size && a.node.lessonIds.every((id) => view.done.has(id));
      paths.push(svg('path', { class: 'bed', d }));
      paths.push(svg('path', {
        class: 'top', d,
        data: { walked: walked ? '1' : null, video: a.seg.videoOnly ? '1' : null }
      }));
    }
    fill(road, ...paths);

    /* 腳色站在最後造訪的節點上 */
    const stand = standingNode(view, store.current());
    const idx = stand ? L.pts.findIndex((p) => p.node.key === stand.key) : -1;
    if (idx >= 0) {
      const p = L.pts[idx];
      token.hidden = false;
      token.style.setProperty('--x', `${Math.round(p.x)}px`);
      token.style.setProperty('--y', `${Math.round(p.y)}px`);
      const av = store.avatar();
      fill(token, renderAvatar(av, { level: view.level.n, bob: !reducedMotion() }));
      token.title = `${avatarLabel(av, view.level.n)}，現在在「${stand.zh}」`;
    } else {
      token.hidden = true;
    }
  }

  /* ── 鍵盤：roving tabindex ─────────────────────────────────
     199 個節點如果全部都是 Tab 停留點，用鍵盤的人會被困住。
     所以只有一個節點是 tabindex=0，方向鍵在節點之間移動，Tab 一次就離開。 */
  let focusIdx = 0;

  function setRoving() {
    const sIdx = cells.findIndex((c) => c.node.key === suggested?.key);
    if (sIdx >= 0) focusIdx = sIdx;
    cells.forEach((c, i) => c.a.tabIndex = i === focusIdx ? 0 : -1);
  }

  function moveFocus(delta) {
    const next = Math.max(0, Math.min(cells.length - 1, focusIdx + delta));
    if (next === focusIdx) return;
    focusIdx = next;
    cells.forEach((c, i) => c.a.tabIndex = i === focusIdx ? 0 : -1);
    cells[focusIdx].a.focus();
  }

  list.addEventListener('keydown', (e) => {
    // 不完全依賴快取的 L：棋盤在還沒取得寬度時（例如在隱藏的分頁裡掛載）L 會是 null，
    // 那時仍然要能算出「往下一列」該跳幾個節點。
    const step = (L && L.cols) || pickBp(board.clientWidth || window.innerWidth || 1200)[1];
    switch (e.key) {
      case 'ArrowRight': moveFocus(1); break;
      case 'ArrowLeft':  moveFocus(-1); break;
      case 'ArrowDown':  moveFocus(step); break;
      case 'ArrowUp':    moveFocus(-step); break;
      case 'Home':       focusIdx = 0; cells[0].a.focus(); setTabs(); break;
      case 'End':        focusIdx = cells.length - 1; cells[focusIdx].a.focus(); setTabs(); break;
      default: return;
    }
    e.preventDefault();
  });

  function setTabs() {
    cells.forEach((c, i) => c.a.tabIndex = i === focusIdx ? 0 : -1);
  }

  list.addEventListener('focusin', (e) => {
    const i = cells.findIndex((c) => c.a === e.target);
    if (i >= 0) { focusIdx = i; setTabs(); }
  });

  /* ── 跳關提示 ─────────────────────────────────────────────
     這是全部的「門檻」：一次性、不阻擋、選過就不再出現。 */
  list.addEventListener('click', (e) => {
    const a = e.target.closest('a.node');
    if (!a || a.dataset.state !== 'ahead') return;
    if (store.hasSeen('skipWarn')) return;

    const cell = cells.find((c) => c.a === a);
    const view = store.derived();
    const un = cell && prereqUnmet(cell.node.slug, view);
    if (!un) return;

    e.preventDefault();
    a.parentElement.querySelector('.hint')?.remove();

    const hint = el('div', { class: 'hint', role: 'dialog', 'aria-label': '先修提醒' },
      el('p', { text: `這門課建議先修「${un.missingTitles.join('、')}」。要直接跳過去嗎？` }),
      el('div', { class: 'row' },
        el('a', { class: 'btn btn--sm', href: a.href, text: '直接前往', on: { click: () => store.markSeen('skipWarn') } }),
        el('a', { class: 'btn btn--sm btn--ghost', href: `island.html?island=${info(un.missing[0])?.islandKey || islandKey}`, text: '先去修基礎課' })
      )
    );
    a.parentElement.appendChild(hint);
    hint.querySelector('a')?.focus();

    const off = (ev) => {
      if (!hint.contains(ev.target)) { hint.remove(); document.removeEventListener('click', off, true); }
    };
    setTimeout(() => document.addEventListener('click', off, true), 0);
  });

  /* ── 回到我的位置：只在腳色離開視窗時出現 ─────────────────── */
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(([entry]) => { locate.hidden = entry.isIntersecting; },
      { rootMargin: '-70px 0px -70px 0px' });
    io.observe(token);
  }

  render(store.derived());
  store.subscribe(render);

  let t = 0;
  const ro = new ResizeObserver(() => {
    clearTimeout(t);
    t = setTimeout(() => place(store.derived()), 120);
  });
  ro.observe(board);

  // 進場後把視窗捲到腳色的位置，讓人一眼看到「我在這」
  requestAnimationFrame(() => {
    place(store.derived());
    if (!token.hidden) {
      const y = token.offsetTop - window.innerHeight * 0.42;
      window.scrollTo({ top: Math.max(0, y), behavior: 'auto' });
    }
  });

  return { render, island: isl, segments };
}
