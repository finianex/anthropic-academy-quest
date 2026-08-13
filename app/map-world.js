/*
 * app/map-world.js — 世界地圖（5 座島）
 *
 * 島的位置寫在 CSS 的 nth-of-type 裡，因為只有 5 座、需要美術手感，
 * 而且寬窄兩種版面要能用純 CSS 切換。JS 只負責「量出島在哪」然後把航線畫上去，
 * 所以兩種版面共用同一段程式。
 */

import { el, svg, fill, reducedMotion } from './dom.js';
import { allIslands, landmark, info } from './catalog.js';
import { standingNode } from './progress.js';
import { renderAvatar, avatarLabel } from './avatar.js';
import { ring, ICON } from './ui.js';
import * as store from './store.js';

/* 島與島之間的建議航線：啟程 → 素養，素養分岔到講堂與工坊，工坊 → 雲端 */
const ROUTES = [
  ['start', 'fluency'],
  ['fluency', 'teach'],
  ['fluency', 'build'],
  ['build', 'cloud']
];

export function mountWorld(host) {
  const road = svg('svg', { class: 'world-road', 'aria-hidden': 'true', focusable: 'false', preserveAspectRatio: 'none' });
  const token = el('div', { class: 'token' });
  const board = el('div', { class: 'world' }, road);
  const isleEls = new Map();

  const islands = allIslands();

  for (const isl of islands) {
    const pctText = el('span');
    const sub = el('span', { class: 'isle-sub' });
    // 進度環是 position:absolute（見 map.css 的 .isle .ring），所以不佔格線位置；
    // disc 裡真正在流內的只有百分比文字，才不會被環擠成兩列。
    const disc = el('span', { class: 'isle-disc' }, pctText);

    const a = el('a', {
      class: 'isle',
      href: `island.html?island=${encodeURIComponent(isl.key)}`,
      data: { tint: isl.tint, island: isl.key }
    },
      disc,
      el('span', { class: 'isle-name', text: isl.zh }),
      sub
    );
    board.appendChild(a);
    isleEls.set(isl.key, { a, disc, pctText, sub, isl });
  }

  /* pK–12 學習路徑：不是課程，只是一個地標，明確和島區分開 */
  const lm = landmark();
  if (lm) {
    board.appendChild(
      el('a', {
        class: 'landmark',
        href: `https://anthropic.skilljar.com/path/${lm.slug}`,
        target: '_blank', rel: 'noopener noreferrer',
        title: lm.note
      },
        el('span', { class: 'flag' }, ICON.flag()),
        el('span', { text: lm.zh })
      )
    );
  }

  board.appendChild(token);
  host.replaceChildren(board);

  function render(view) {
    for (const [key, r] of isleEls) {
      const st = view.perIsland.get(key) || { done: 0, total: 0, pct: 0, courses: 0, coursesComplete: 0, allComplete: false };
      r.disc.querySelector('.ring')?.remove();
      r.disc.appendChild(ring(st.pct, { size: 110, stroke: 7 }));
      r.pctText.textContent = st.allComplete ? '✓' : `${st.pct}%`;
      r.sub.textContent = `${r.isl.slugs.length} 門課 · ${st.done}/${st.total} 堂`;
      r.a.setAttribute('aria-label',
        `${r.isl.zh}：${r.isl.blurb} 共 ${r.isl.slugs.length} 門課、${st.total} 堂，已完成 ${st.done} 堂（${st.pct}%）。`);
      r.a.dataset.done = st.allComplete ? '1' : '0';
    }
    draw(view);
  }

  /* 量出島的位置後畫航線，並把腳色放到它所在的島上 */
  function draw(view) {
    const bw = board.clientWidth;
    const bh = board.clientHeight;
    if (!bw || !bh) return;
    road.setAttribute('viewBox', `0 0 ${bw} ${bh}`);

    const center = (key) => {
      const r = isleEls.get(key);
      if (!r) return null;
      const disc = r.a.querySelector('.isle-disc');
      if (!disc) return null;
      // offsetLeft/Top 是相對於最近的定位祖先（.world），正好是我們要的座標系
      return {
        x: r.a.offsetLeft,
        y: r.a.offsetTop - r.a.offsetHeight / 2 + disc.offsetTop + disc.offsetHeight / 2
      };
    };

    const paths = [];
    for (const [from, to] of ROUTES) {
      const a = center(from), b = center(to);
      if (!a || !b) continue;
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      // 往垂直方向拉一點，讓航線是弧線而不是直線
      const nx = -(b.y - a.y), ny = (b.x - a.x);
      const len = Math.hypot(nx, ny) || 1;
      const bow = 34;
      const cx = mx + (nx / len) * bow;
      const cy = my + (ny / len) * bow;
      const walked = view.perIsland.get(from)?.allComplete ? '1' : null;
      paths.push(svg('path', { d: `M${a.x} ${a.y}Q${cx} ${cy} ${b.x} ${b.y}`, data: walked ? { walked } : null }));
    }
    fill(road, ...paths);

    const node = standingNode(view, store.current());
    const key = node ? info(node.slug)?.islandKey : null;
    const c = key ? center(key) : null;
    if (c) {
      const r = isleEls.get(key);
      const half = (r?.disc.offsetHeight || 92) / 2;
      // 站在島的右下緣：不遮住島中央的百分比，也真的看起來像踩在島上
      token.style.setProperty('--x', `${Math.round(c.x + half * 0.5)}px`);
      token.style.setProperty('--y', `${Math.round(c.y + half - 4)}px`);
      token.hidden = false;
      const av = store.avatar();
      fill(token, renderAvatar(av, { level: view.level.n, bob: !reducedMotion() }));
      token.setAttribute('aria-hidden', 'true');
      token.title = `${avatarLabel(av, view.level.n)}，現在在${isleEls.get(key)?.isl.zh || ''}`;
    } else {
      token.hidden = true;
    }
  }

  render(store.derived());
  store.subscribe(render);

  // 版面會因為斷點切換而整個改變，所以要重量一次；debounce 避免拖曳視窗時狂算
  let t = 0;
  const ro = new ResizeObserver(() => {
    clearTimeout(t);
    t = setTimeout(() => draw(store.derived()), 120);
  });
  ro.observe(board);

  // 島是 CSS 動畫進場的，動畫期間 offsetTop 會變，所以動畫結束後再畫一次
  requestAnimationFrame(() => requestAnimationFrame(() => draw(store.derived())));
  setTimeout(() => draw(store.derived()), 420);

  return { render };
}
