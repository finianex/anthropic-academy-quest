/*
 * app/boot-island.js — 島嶼路徑頁進入點
 */

import { $, el, fill } from './dom.js';
import * as store from './store.js';
import * as local from './local.js';
import { mountHud, mountFoot, fmt, ICON, warnQuota } from './ui.js';
import { mountIsland } from './map-island.js';
import { island, branchInfo, isVideoOnly, info } from './catalog.js';
import { suggestedNode } from './progress.js';

store.init();
local.onQuotaError(warnQuota);
mountHud($('#hud'), { active: 'map' });
mountFoot($('#foot'));

const key = new URLSearchParams(location.search).get('island');
const isl = island(key);

if (!isl) {
  $('#error').hidden = false;
} else {
  document.title = `${isl.zh}｜Anthropic Academy 繁中`;

  const bar = el('span', { class: 'xpbar', style: { 'max-width': '340px' } }, el('i'));
  const meta = el('p', { class: 'island-meta' });

  fill($('#head'),
    el('div', { class: 'page-head' },
      el('a', { class: 'crumb', href: 'index.html' }, ICON.arrowL({ width: 15, height: 15 }), el('span', { text: '世界地圖' })),
      el('h1', { text: isl.zh }),
      el('p', { class: 'lead', text: isl.blurb }),
      el('div', { class: 'row', style: { 'margin-top': '14px' } }, bar, meta)
    )
  );

  /* 這座島有純影片課時，把「本站沒有這些課的文字筆記」講清楚。
     這個說明是承重結構不是裝飾——少了它，地圖就會暗示本站涵蓋全部 444 堂教學內容。 */
  const hasVideo = isl.slugs.some((s) => isVideoOnly(s));
  if (hasVideo) {
    const b = branchInfo('cloud');
    $('#head').appendChild(
      el('p', { class: 'notice-video' },
        ICON.film({ width: 18, height: 18 }),
        el('span', { text: b?.hint || '本站沒有這些課的文字筆記，節點連到官方影片。' })
      )
    );
  }

  /* 建議下一步可能落在別座島上——主幹刻意跨島（claude-101 → 素養島的基礎課 → …），
     所以這座島上可能一個「建議下一步」都沒有。那時要明確指路，不然使用者會卡住。 */
  const elsewhere = el('a', { class: 'elsewhere', hidden: true });
  $('#head').appendChild(elsewhere);

  mountIsland($('#path'), key);

  function render(view) {
    const st = view.perIsland.get(key) || { done: 0, total: 0, pct: 0, coursesComplete: 0, courses: 0 };
    bar.style.setProperty('--pct', st.pct + '%');
    meta.textContent = `${st.coursesComplete}/${st.courses} 門課完成 · ${fmt(st.done)}/${fmt(st.total)} 堂 · ${st.pct}%`;

    const next = suggestedNode(view);
    const nextIsland = next ? info(next.slug)?.islandKey : null;
    if (next && nextIsland && nextIsland !== key) {
      const ni = island(nextIsland);
      elsewhere.href = `island.html?island=${nextIsland}`;
      fill(elsewhere,
        ICON.pin({ width: 18, height: 18 }),
        el('span', { text: `建議的下一步在${ni ? ni.zh : '別座島'}：${next.zh}` }),
        el('span', { class: 'elsewhere-go' }, ICON.arrowR({ width: 18, height: 18 }))
      );
      elsewhere.setAttribute('aria-label',
        `前往${ni ? ni.zh : '下一座島'}，建議的下一步是「${next.zh}」`);
      elsewhere.hidden = false;
    } else {
      elsewhere.hidden = true;
    }
  }

  render(store.derived());
  store.subscribe(render);
}
