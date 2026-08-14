/*
 * app/boot-review.js — 跨課程複習
 *
 * 這一頁是「學得起來」和「看過就忘」的分界。單一課堂的練習只證明你當下讀懂了；
 * 隔幾天再被問到才算真的記住。所以這裡把到期的題目從**所有已學過的課**拉出來
 * 混在一起考——刻意不告訴你題目來自哪一課，因為在真實情境裡也沒有人會先告訴你
 * 「這題是 Claude Code 那一課的」。
 */

import { $, el, fill, clear } from './dom.js';
import * as store from './store.js';
import * as local from './local.js';
import { mountHud, mountFoot, showEvents, fmt, ICON, warnQuota } from './ui.js';
import { buildFromKey, itemKeysOf } from './exercises.js';
import { createSession } from './session.js';
import { mountQuiz } from './quiz-ui.js';
import { allCourses, noteOf, lessonLookup } from './catalog.js';
import { dueKeys, nextDueAt, untilLabel, strengthLabel } from './srs.js';
import { REVIEW_MAX, XP } from './config.js';

store.init();
local.onQuotaError(warnQuota);
mountHud($('#hud'));
mountFoot($('#foot'));

/** 目前資料真的做得出題目的所有項目 key（課綱變動後可能有孤兒 key）。 */
export function availableKeys() {
  const set = new Set();
  for (const c of allCourses()) {
    if (c.videoOnly) continue;
    for (const l of c.lessons) {
      const n = noteOf(l.id);
      if (!n) continue;
      itemKeysOf(n, l.id).forEach((k) => set.add(k));
    }
  }
  return set;
}

const avail = availableKeys();
const keyOk = (k) => avail.has(k);
const srs = store.srs();
const { keys, total } = dueKeys(srs, keyOk, Date.now(), REVIEW_MAX);

renderHead();

if (!keys.length) {
  renderEmpty();
} else {
  start();
}

function renderHead() {
  fill($('#head'),
    el('div', { class: 'page-head' },
      el('a', { class: 'crumb', href: 'index.html' },
        ICON.arrowL({ width: 15, height: 15 }), el('span', { text: '世界地圖' })),
      el('h1', { text: '複習' })
    )
  );
}

function renderEmpty() {
  const tracked = Object.keys(srs).filter((k) => avail.has(k)).length;
  const next = nextDueAt(srs, keyOk);

  fill($('#flow'),
    el('div', { class: 'wrap wrap--narrow' },
      el('div', { class: 'blank' },
        ICON.brain({ width: 40, height: 40 }),
        el('h2', { text: tracked ? '現在沒有要複習的題目' : '還沒有可以複習的東西' }),
        el('p', { text: tracked
          ? `已經在追蹤 ${fmt(tracked)} 個題目的熟練度。${next ? `下一批到期是${untilLabel(next)}。` : ''}`
          : '先去做幾堂課的練習，做過的題目會依熟練度排進複習。' }),
        el('a', { class: 'btn', href: 'index.html' }, el('span', { text: '回到世界地圖' }))
      )
    )
  );
  if (tracked) renderStrengthTable();
}

/** 熟練度總覽：讓「間隔重複」這件事是看得見、可解釋的，而不是一個黑盒子。 */
function renderStrengthTable() {
  const rows = Object.entries(srs)
    .filter(([k]) => avail.has(k))
    .map(([k, it]) => {
      const lessonId = k.split(':')[1];
      const hit = lessonLookup(lessonId);
      return {
        zh: hit ? hit.lesson.zh : lessonId,
        course: hit ? hit.course.course.zhTitle : '',
        s: it.s || 0,
        due: it.due
      };
    })
    .sort((a, b) => (a.s - b.s) || (a.due - b.due))
    .slice(0, 30);

  fill($('#after'),
    el('section', { class: 'block' },
      el('h2', { text: '熟練度' }),
      el('p', { class: 'block-sub', text: '答對一次往上一階，答錯退一階。階數決定下次什麼時候再問你。' }),
      el('ul', { class: 'srs-list' },
        ...rows.map((r) => el('li', { class: 'srs-row' },
          el('span', { class: 'srs-bars', 'aria-hidden': 'true' },
            ...Array.from({ length: 5 }, (_, i) => el('i', { data: { on: i < r.s ? '1' : '0' } }))),
          el('span', { class: 'srs-txt' },
            el('b', { text: r.zh }),
            r.course ? el('small', { text: r.course }) : null),
          el('span', { class: 'srs-when', text: `${strengthLabel(r.s)} · ${untilLabel(r.due)}` })
        ))
      )
    )
  );
}

function start() {
  const items = keys.map((k) => buildFromKey(k)).filter(Boolean);
  if (!items.length) { renderEmpty(); return; }

  const session = createSession(items);
  clear($('#head'));

  mountQuiz($('#flow'), {
    session,
    quitHref: 'index.html',
    quitLabel: '離開複習，回到世界地圖',
    onFinish: finish
  });
}

function finish(session) {
  const results = session.results();
  store.gradeItems(results);

  /* 複習的 XP 按「第一次就答對」的題數給。這是全站唯一的累加值，
     因為同一題可以被複習很多次，無法從目前狀態反推。 */
  const right = results.filter((r) => r.ok).length;
  const gained = right * XP.review;
  const events = gained ? store.addReviewXp(gained) : [];
  showEvents(events);

  const acc = Math.round(session.accuracy() * 100);
  const left = Math.max(0, total - session.total);

  renderHead();
  fill($('#flow'),
    el('div', { class: 'wrap wrap--narrow' },
      el('div', { class: 'card card--pad done-card' },
        el('div', { class: 'big', text: `${acc}%` }),
        el('h2', { text: '複習完成' }),
        el('p', { style: { color: 'var(--ink-soft)' }, text: right === session.total
          ? '全部第一次就答對，這幾題的下次複習會拉得更遠。'
          : '答錯的題目退回前一階，明天會再問一次。' }),
        el('div', { class: 'done-stats' },
          stat(`${session.total}`, '題'),
          stat(`${right}`, '第一次就答對'),
          stat(`+${gained}`, 'XP')
        ),
        el('div', { class: 'row', style: { 'justify-content': 'center', 'margin-top': '6px' } },
          left > 0
            ? el('a', { class: 'btn btn--lg btn--purple', href: 'review.html' },
                ICON.brain({ width: 19, height: 19 }), el('span', { text: `再複習 ${Math.min(left, REVIEW_MAX)} 題` }))
            : el('a', { class: 'btn btn--lg', href: 'index.html' }, el('span', { text: '回到世界地圖' })),
          left > 0 ? el('a', { class: 'btn btn--ghost', href: 'index.html' }, el('span', { text: '回到世界地圖' })) : null
        )
      )
    )
  );
  clear($('#after'));
}

const stat = (v, l) => el('div', { class: 'done-stat' }, el('b', { text: v }), el('span', { text: l }));
