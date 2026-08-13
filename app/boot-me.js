/*
 * app/boot-me.js — 我的角色頁
 */

import { $, el, fill, reducedMotion } from './dom.js';
import * as store from './store.js';
import * as local from './local.js';
import { mountHud, mountFoot, showEvents, ring, fmt, ICON, warnQuota } from './ui.js';
import { renderAvatar, BODIES, TINTS, GEAR, unlocked, needLabel } from './avatar.js';
import { allBadges, lessonLookup, index, info } from './catalog.js';
import { LEVELS } from './config.js';

store.init();
local.onQuotaError(warnQuota);
mountHud($('#hud'), { active: 'me' });
mountFoot($('#foot'));

const TOTAL = index().totalLessons;

/* ── 角色主卡 ─────────────────────────────────────────────── */
function renderHero(view) {
  const av = store.avatar();
  const nextLv = LEVELS.find((l) => l.n === view.level.n + 1);

  fill($('#hero'),
    el('div', { class: 'hero card card--pad' },
      el('div', { class: 'hero-av' }, renderAvatar(av, { level: view.level.n, bob: !reducedMotion() })),
      el('div', { class: 'hero-txt' },
        el('span', { class: 'pill pill--purple', text: `Lv.${view.level.n}` }),
        el('h2', { text: view.level.zh, style: { 'margin-top': '8px' } }),
        el('p', { class: 'hero-xp', text: `${fmt(view.xp)} XP` }),
        el('span', { class: 'xpbar', style: { '--pct': view.level.pct + '%', 'max-width': '320px' } }, el('i')),
        el('p', { class: 'hero-next', text: view.level.isMax
          ? '已達最高等級。'
          : `距離 Lv.${nextLv.n}「${nextLv.zh}」還要 ${fmt(view.level.span - view.level.into)} XP。` })
      ),
      el('div', { class: 'hero-nums' },
        num('已完成課堂', `${fmt(view.lessonsDone)}／${fmt(TOTAL)}`),
        num('完成的課程', `${view.coursesDone}／20`),
        num('完成的島', `${view.islandsDone.size}／5`),
        num('自己的筆記', `${view.notesCount} 篇`)
      )
    )
  );
}

const num = (label, value) => el('div', { class: 'hero-num' },
  el('b', { text: value }), el('span', { text: label }));

/* ── 換裝 ─────────────────────────────────────────────────── */
function renderGear(view) {
  const av = store.avatar();

  const group = (title, hint, items) => el('div', { class: 'gear-group' },
    el('h3', { text: title }),
    hint ? el('p', { class: 'gear-hint', text: hint }) : null,
    el('div', { class: 'picks' }, ...items)
  );

  /* 身形 */
  const bodies = Object.entries(BODIES).map(([k, def]) =>
    el('button', {
      class: 'pick', type: 'button',
      'aria-pressed': av.body === k ? 'true' : 'false',
      on: { click: () => store.setAvatar({ body: k }) }
    },
      el('span', { class: 'pick-av' }, renderAvatar({ ...av, body: k }, { level: view.level.n, showGear: false })),
      el('span', { text: def.zh })
    )
  );

  /* 顏色 */
  const tints = Object.entries(TINTS).map(([k, def]) =>
    el('button', {
      class: 'pick', type: 'button',
      'aria-pressed': av.tint === k ? 'true' : 'false',
      on: { click: () => store.setAvatar({ tint: k }) }
    },
      el('span', { class: 'swatch', style: { background: def.css } }),
      el('span', { text: def.zh })
    )
  );

  /* 配件（含「不戴」）*/
  const gearGroups = Object.entries(GEAR).map(([slot, def]) => {
    const items = [
      el('button', {
        class: 'pick', type: 'button',
        'aria-pressed': !av[slot] ? 'true' : 'false',
        on: { click: () => store.setAvatar({ [slot]: null }) }
      }, el('span', { class: 'pick-none', text: '—' }), el('span', { text: '不戴' })),

      ...Object.entries(def.items).map(([k, it]) => {
        const ok = unlocked(it, view);
        return el('button', {
          class: 'pick', type: 'button',
          disabled: !ok,
          'aria-pressed': av[slot] === k ? 'true' : 'false',
          title: ok ? it.zh : `${it.zh} — ${needLabel(it)}`,
          on: { click: () => { if (ok) store.setAvatar({ [slot]: k }); } }
        },
          el('span', { class: 'pick-av' },
            renderAvatar({ ...av, [slot]: k }, { level: view.level.n, showGear: true })),
          el('span', { text: it.zh }),
          ok ? null : el('span', { class: 'pick-need', text: needLabel(it) })
        );
      })
    ];
    return group(def.zh, null, items);
  });

  fill($('#gear'),
    group('身形', null, bodies),
    group('顏色', null, tints),
    ...gearGroups
  );
}

/* ── 徽章牆 ───────────────────────────────────────────────── */
function renderBadges(view) {
  const badges = allBadges();
  $('#badge-sub').textContent = `已取得 ${view.badges.size}／${badges.length} 枚。`;
  fill($('#badges'),
    el('div', { class: 'badge-wall' },
      ...badges.map((b) => {
        const got = view.badges.has(b.id);
        return el('div', {
          class: 'sticker',
          data: { locked: got ? '0' : '1' },
          title: `${b.zh}：${b.desc}${got ? '' : '（未取得）'}`
        },
          el('span', { class: 'disc' }, got ? ICON.check({ width: 26, height: 26 }) : ICON.lock({ width: 22, height: 22 })),
          el('b', { text: b.zh }),
          el('span', { class: 'sticker-xp', text: `+${b.xp}` })
        );
      })
    ),
    el('ul', { class: 'badge-legend' },
      ...badges.map((b) => el('li', { data: { got: view.badges.has(b.id) ? '1' : '0' } },
        el('b', { text: b.zh }), el('span', { text: b.desc })))
    )
  );
}

/* ── 我的筆記 ─────────────────────────────────────────────── */
function renderNotes() {
  const notes = store.allNotes();
  const keys = Object.keys(notes).sort((a, b) => (notes[b].updatedAt || 0) - (notes[a].updatedAt || 0));

  if (!keys.length) {
    fill($('#notes'), el('div', { class: 'blank' },
      el('p', { text: '還沒有筆記。在任何一堂課的「我的筆記」寫下你的理解，就會出現在這裡。' })));
    return;
  }

  fill($('#notes'),
    el('ul', { class: 'note-list' },
      ...keys.map((k) => {
        const n = notes[k];
        const hit = lessonLookup(k);
        let title = k, sub = '', href = null;

        if (hit) {
          title = hit.lesson.zh;
          sub = hit.course.course.zhTitle;
          href = `lesson.html?course=${encodeURIComponent(hit.slug)}&lesson=${encodeURIComponent(k)}`;
        } else if (k.includes('#s')) {
          // 章節筆記：key 是 `slug#sN`
          const [s, tail] = k.split('#s');
          const c = info(s);
          const secIdx = Number(tail);
          const sec = c?.sections[secIdx];
          if (c && sec) {
            title = sec.zh;
            sub = `${c.course.zhTitle} · 章節筆記`;
            href = `chapter.html?course=${encodeURIComponent(s)}&section=${secIdx}`;
          }
        }

        const when = n.updatedAt ? new Date(n.updatedAt).toLocaleDateString('zh-Hant') : '';
        const inner = [
          el('div', { class: 'note-row-head' },
            el('b', { text: title }),
            el('span', { class: 'note-row-when', text: when })
          ),
          sub ? el('span', { class: 'note-row-sub', text: sub }) : null,
          // 使用者自己寫的文字：一律 textContent，永不 innerHTML
          el('p', { class: 'note-row-body selectable', text: n.body })
        ];

        return el('li', { class: 'note-row' },
          href ? el('a', { class: 'note-row-in', href }, ...inner) : el('div', { class: 'note-row-in' }, ...inner)
        );
      })
    )
  );
}

/* ── 資料管理 ─────────────────────────────────────────────── */
function renderData(view) {
  fill($('#data'),
    el('div', { class: 'card card--pad stack' },
      el('p', { text: local.isPersistent()
        ? '你的進度與筆記目前存在這台裝置的瀏覽器裡。換裝置或清掉瀏覽器資料就會不見——Google 登入與雲端同步是下一階段要加的功能。'
        : '這個瀏覽器不允許本機儲存（可能是無痕模式），目前的進度只存在記憶體裡，關掉分頁就會消失。' }),
      el('div', { class: 'row' },
        el('button', {
          class: 'btn btn--ghost btn--sm', type: 'button',
          on: { click: exportJson }
        }, el('span', { text: '匯出我的資料（JSON）' })),
        el('button', {
          class: 'btn btn--coral btn--sm', type: 'button',
          on: { click: wipe }
        }, el('span', { text: '清除此裝置的所有資料' }))
      )
    )
  );
}

function exportJson() {
  const data = {
    exportedAt: new Date().toISOString(),
    progress: store.get().progress,
    notes: store.allNotes(),
    avatar: store.avatar(),
    xp: store.derived().xp
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: 'anthropic-academy-quest.json' });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function wipe() {
  const n = store.derived().lessonsDone;
  const notes = store.derived().notesCount;
  if (!window.confirm(`確定要清除嗎？這會刪掉 ${n} 堂完成紀錄與 ${notes} 篇筆記，而且無法復原。`)) return;
  store.resetAll();
  showEvents([{ type: 'plain', text: '已清除這台裝置上的資料。' }]);
}

/* ── 掛載 ─────────────────────────────────────────────────── */
function render(view) {
  renderHero(view);
  renderGear(view);
  renderBadges(view);
  renderNotes();
  renderData(view);
}

render(store.derived());
store.subscribe(render);
