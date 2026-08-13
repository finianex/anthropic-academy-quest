/*
 * app/boot-index.js — 世界地圖頁進入點
 */

import { $, el, fill } from './dom.js';
import * as store from './store.js';
import * as local from './local.js';
import { mountHud, mountFoot, ring, fmt, ICON, warnQuota } from './ui.js';
import { mountWorld } from './map-world.js';
import { resumePoint } from './progress.js';
import { allIslands, index, allBadges } from './catalog.js';

store.init();
local.onQuotaError(warnQuota);

mountHud($('#hud'), { active: 'map' });
mountFoot($('#foot'));
mountWorld($('#world'));

/* ── 繼續上一堂 ─────────────────────────────────────────── */
const resume = $('#resume');

function renderResume(view) {
  const started = view.lessonsDone > 0 || !!store.current();
  if (!started) { resume.hidden = true; return; }

  const r = resumePoint(view, store.current());
  if (!r) { resume.hidden = true; return; }

  resume.href = r.href;
  fill(resume,
    el('div', { class: 'resume-in' },
      el('div', null,
        el('span', { class: 'pill pill--gold', text: '繼續上一堂' }),
        el('h3', { text: r.label, style: { 'margin-top': '8px' } }),
        el('p', { class: 'resume-sub', text: r.courseZh })
      ),
      el('span', { class: 'resume-go' }, ICON.arrowR({ width: 22, height: 22 }))
    )
  );
  resume.setAttribute('aria-label', `繼續上一堂：${r.courseZh} — ${r.label}`);
  resume.hidden = false;
}

/* ── 進度總覽 ───────────────────────────────────────────── */
const stats = $('#stats');
const TOTAL_LESSONS = index().totalLessons;
const TOTAL_BADGES = allBadges().length;

function tile(label, value, sub, tint) {
  return el('div', { class: 'tile card card--pad' },
    el('b', { class: `tile-v tile-v--${tint}`, text: value }),
    el('span', { class: 'tile-l', text: label }),
    sub ? el('span', { class: 'tile-s', text: sub }) : null
  );
}

function renderStats(view) {
  const pct = TOTAL_LESSONS ? Math.round((view.lessonsDone / TOTAL_LESSONS) * 100) : 0;
  fill(stats,
    el('div', { class: 'tiles' },
      tile('已完成課堂', `${fmt(view.lessonsDone)}`, `共 ${fmt(TOTAL_LESSONS)} 堂 · ${pct}%`, 'green'),
      tile('完成的課程', `${view.coursesDone}`, '共 20 門', 'blue'),
      tile('取得的徽章', `${view.badges.size}`, `共 ${TOTAL_BADGES} 枚`, 'gold'),
      tile('自己的筆記', `${view.notesCount}`, '篇', 'purple')
    )
  );
}

/* ── 島嶼清單（無障礙替代 / 無 JS 也能讀）───────────────────── */
const altBody = $('#alt-body');

function renderAlt(view) {
  fill(altBody,
    el('ol', { class: 'alt-list' },
      ...allIslands().map((isl, i) => {
        const st = view.perIsland.get(isl.key) || { done: 0, total: 0, pct: 0 };
        return el('li', null,
          el('a', { class: 'alt-row', href: `island.html?island=${encodeURIComponent(isl.key)}` },
            el('span', { class: 'alt-n', text: String(i + 1).padStart(2, '0') }),
            el('span', null,
              el('b', { text: `${isl.zh}（${isl.en}）` }),
              el('span', { class: 'alt-sub', text: `${isl.blurb} ${isl.slugs.length} 門課 · ${st.done}/${st.total} 堂` })
            ),
            el('span', { class: 'alt-pct', text: `${st.pct}%` })
          )
        );
      })
    )
  );
}

function render(view) {
  renderResume(view);
  renderStats(view);
  renderAlt(view);
}

render(store.derived());
store.subscribe(render);
