/*
 * app/boot-lesson.js — 課堂頁：短教學 → 練習
 *
 * 三個階段：
 *   teach     3 張可跳過的短卡（等一下要考的東西）
 *   practice  7–11 題，答錯重排，答對才出隊
 *   done      成績摘要 + 我的筆記 + 下一課
 *
 * 「完成這一堂」的唯一途徑是把練習做完。讀完卡片不算學完——這是這一版
 * 和上一版最根本的差別。
 */

import { $, el, fill, clear, reducedMotion } from './dom.js';
import * as store from './store.js';
import * as local from './local.js';
import { mountHud, mountFoot, showEvents, fmt, ICON, warnQuota } from './ui.js';
import { buildTeachCards } from './cards.js';
import { buildExercises } from './exercises.js';
import { createSession } from './session.js';
import { mountQuiz } from './quiz-ui.js';
import {
  info, lessonsOf, positionOf, noteOf, isVideoOnly,
  officialLessonUrl, island, lessonLookup
} from './catalog.js';
import { lessonXp } from './gamify.js';
import { NOTE_MIN, NOTE_SAVE_DEBOUNCE, XP } from './config.js';

store.init();
local.onQuotaError(warnQuota);
mountHud($('#hud'));
mountFoot($('#foot'));

const params = new URLSearchParams(location.search);
const slug = params.get('course');
const lessonId = params.get('lesson');
const course = info(slug);
const lessons = lessonsOf(slug);
const lesson = lessons.find((l) => l.id === lessonId);
const pos = lesson ? positionOf(slug, lessonId) : null;

if (!course || !lesson) $('#error').hidden = false;
else boot();

function boot() {
  const note = noteOf(lessonId);
  const videoOnly = isVideoOnly(slug) && !note;
  const sectionZh = lessonLookup(lessonId)?.section?.zh || '';
  const isl = island(course.islandKey);
  const backHref = isl ? `island.html?island=${isl.key}` : 'index.html';

  document.title = `${lesson.zh}｜${course.course.zhTitle}`;
  store.visit(slug, lessonId);

  const head = $('#head');
  const flow = $('#flow');
  const after = $('#after');

  function renderHead() {
    fill(head,
      el('div', { class: 'page-head' },
        el('div', { class: 'row', style: { gap: '4px' } },
          el('a', { class: 'crumb', href: backHref },
            ICON.arrowL({ width: 15, height: 15 }),
            el('span', { text: isl ? isl.zh : '世界地圖' })
          ),
          el('span', { class: 'crumb-sep', text: '/' }),
          el('span', { class: 'crumb', text: course.course.zhTitle })
        ),
        el('h1', { class: 'selectable', text: lesson.zh }),
        lesson.en && lesson.en !== lesson.zh ? el('p', { class: 'lesson-en', text: lesson.en }) : null,
        el('p', { class: 'lesson-meta', text:
          `${sectionZh ? sectionZh + ' · ' : ''}第 ${pos.number}／${pos.total} 堂 · 官方課堂編號 ${lesson.id}` })
      )
    );
  }

  if (videoOnly) { renderHead(); renderVideoOnly(); return; }

  const teach = buildTeachCards(note, lesson);
  if (!teach.length) {
    renderHead();
    fill(flow, el('div', { class: 'blank' }, el('p', { text: '這堂課目前沒有中文筆記。' })));
    fill(after, noteEditor(lessonId), pager());
    return;
  }

  /* ══ 教學階段 ══════════════════════════════════════════ */
  let ti = 0;

  function renderTeach() {
    renderHead();
    clear(after);
    const c = teach[ti];
    const done = store.lessonState(slug, lessonId) === 2;

    const steps = el('div', { class: 'steps' }, ...teach.map((_, i) =>
      el('i', { data: { on: i < ti ? '1' : '0', now: i === ti ? '1' : '0' } })));

    const body = [el('h2', { class: 'selectable', text: c.title })];
    if (c.kind === 'overview') {
      body.push(el('p', { class: 'selectable', text: c.body }));
      if (c.example) {
        body.push(el('div', { class: 'teach-item', style: { 'margin-top': '6px' } },
          el('b', { text: '具體例子' }),
          el('p', { class: 'selectable', text: c.example })));
      }
    } else if (c.kind === 'concepts') {
      body.push(el('div', { class: 'teach-list' }, ...c.list.map((x) =>
        el('div', { class: 'teach-item' },
          el('b', { class: 'selectable', text: x.title }),
          el('p', { class: 'selectable', text: x.body })))));
    } else if (c.kind === 'howto') {
      if (c.workflow.length) {
        body.push(el('ol', { class: 'flowlist selectable' }, ...c.workflow.map((s) => el('li', { text: s }))));
      }
      if (c.pitfalls.length) {
        body.push(el('p', { class: 'teach-skip', style: { padding: '10px 0 0' }, text: '常見誤區' }));
        body.push(el('ul', { class: 'warnlist selectable' }, ...c.pitfalls.map((s) => el('li', { text: s }))));
      }
    }

    const isLast = ti === teach.length - 1;
    const nextBtn = el('button', {
      class: isLast ? 'btn btn--lg' : 'btn', type: 'button',
      on: { click: () => { if (isLast) startPractice(); else { ti++; renderTeach(); } } }
    }, isLast
      ? [ICON.brain({ width: 19, height: 19 }), el('span', { text: done ? '再練一次' : '開始練習' })]
      : [el('span', { text: '下一張' }), ICON.arrowR({ width: 17, height: 17 })]);

    fill(flow,
      done ? el('div', { class: 'done-strip' }, ICON.check({ width: 20, height: 20 }), el('span', { text: '這堂已完成' })) : null,
      steps,
      el('div', { class: 'flow-meta' },
        el('span', { class: 'kind', text: c.kindZh }),
        el('span', { class: 'count', text: `教學 ${ti + 1}／${teach.length}` })
      ),
      el('article', { class: 'face' + (reducedMotion() ? '' : ' in'), tabindex: '-1' }, ...body),
      el('div', { class: 'teach-nav' },
        ti > 0
          ? el('button', { class: 'btn btn--ghost', type: 'button', on: { click: () => { ti--; renderTeach(); } } },
              ICON.arrowL({ width: 17, height: 17 }), el('span', { text: '上一張' }))
          : el('button', { class: 'teach-skip', type: 'button', on: { click: startPractice } },
              el('span', { text: '跳過教學，直接練習 →' })),
        nextBtn
      )
    );

    fill(after, noteEditor(lessonId), officialRow(), pager());
  }

  /* ══ 練習階段 ══════════════════════════════════════════ */
  function startPractice() {
    const items = buildExercises(note, lessonId);
    if (!items.length) {
      showEvents([{ type: 'plain', text: '這堂課的資料出不了題目。' }]);
      return;
    }
    const session = createSession(items);
    clear(head);
    clear(after);
    window.scrollTo({ top: 0, behavior: 'auto' });

    mountQuiz(flow, {
      session,
      quitHref: backHref,
      quitLabel: `離開練習，回到${isl ? isl.zh : '地圖'}`,
      onFinish: (s) => finish(s)
    });
  }

  function finish(session) {
    /* 先把作答結果交給間隔重複，再標記完成 */
    store.gradeItems(session.results());
    const perfect = session.perfect();
    const wasDone = store.lessonState(slug, lessonId) === 2;
    const events = store.markLessons(slug, [lessonId], true, { perfect });
    showEvents(events);

    const acc = Math.round(session.accuracy() * 100);
    renderHead();

    fill(flow,
      el('div', { class: 'card card--pad done-card' },
        el('div', { class: 'big', text: perfect ? '全對' : `${acc}%` }),
        el('h2', { text: perfect ? '這一堂每題都是第一次就答對' : '練習完成' }),
        el('p', { style: { color: 'var(--ink-soft)' }, text: perfect
          ? '接下來幾天會再問你一次，確認真的記住了。'
          : '答錯的題目已經排進複習，過幾天會再出現。' }),
        el('div', { class: 'done-stats' },
          stat(`${session.total}`, '題'),
          stat(`${acc}%`, '第一次就答對'),
          stat(wasDone ? '—' : `+${lessonXp(slug) + (perfect ? XP.perfect : 0)}`, 'XP')
        ),
        el('div', { class: 'row', style: { 'justify-content': 'center', 'margin-top': '6px' } },
          pos.next
            ? el('a', { class: 'btn btn--lg',
                href: `lesson.html?course=${encodeURIComponent(slug)}&lesson=${encodeURIComponent(pos.next.id)}` },
                el('span', { text: '下一課' }), ICON.arrowR({ width: 19, height: 19 }))
            : el('a', { class: 'btn btn--lg', href: backHref }, el('span', { text: `回到${isl ? isl.zh : '地圖'}` })),
          el('button', { class: 'btn btn--ghost', type: 'button', on: { click: () => { ti = 0; renderTeach(); } } },
            el('span', { text: '再看一次教學' }))
        )
      )
    );
    fill(after, noteEditor(lessonId), officialRow(), pager());
  }

  const stat = (v, l) => el('div', { class: 'done-stat' }, el('b', { text: v }), el('span', { text: l }));

  /* ══ 共用零件 ══════════════════════════════════════════ */
  function pager() {
    const link = (item, dirZh, cls) => item
      ? el('a', { class: `pg ${cls}`,
          href: `lesson.html?course=${encodeURIComponent(slug)}&lesson=${encodeURIComponent(item.id)}` },
          el('span', { class: 'pg-dir', text: dirZh }), el('b', { text: item.zh }))
      : el('span', { class: `pg ${cls} pg-empty`, 'aria-hidden': 'true' });
    return el('nav', { class: 'pager', 'aria-label': '課堂導覽' },
      link(pos.prev, '← 上一課', 'pg-prev'),
      link(pos.next, '下一課 →', 'pg-next')
    );
  }

  function officialRow() {
    return el('div', { class: 'official-row' },
      el('a', { class: 'btn btn--ghost btn--sm', href: officialLessonUrl(slug, lessonId),
        target: '_blank', rel: 'noopener noreferrer' }, el('span', { text: '閱讀官方教材 ↗' })),
      el('span', { class: 'official-note', text: '本頁是原創繁中整理，不是官方教材的逐字翻譯。' })
    );
  }

  /* ── 純影片課 ─────────────────────────────────────────── */
  function renderVideoOnly() {
    fill(flow,
      el('article', { class: 'face' },
        el('span', { class: 'pill', text: '純影片課堂' }),
        el('h2', { text: '這一堂沒有文字教材' }),
        el('p', { text: '官方平台上這一堂是純影片授課，沒有隨附的文字教材，也沒有字幕或逐字稿可以整理。為了不讓你讀到憑空推測的內容，本站不為這類課堂撰寫筆記，也出不了練習題。' }),
        el('div', { class: 'row', style: { 'margin-top': '6px' } },
          el('a', { class: 'btn btn--lg', href: officialLessonUrl(slug, lessonId),
            target: '_blank', rel: 'noopener noreferrer' }, el('span', { text: '前往官方影片 ↗' }))
        ),
        el('p', { class: 'official-note', text: '需要登入 Skilljar 並註冊該課程才能觀看。' })
      )
    );

    const render = () => {
      const done = store.lessonState(slug, lessonId) === 2;
      fill(after,
        el('div', { class: 'selfreport' },
          el('button', { class: done ? 'btn btn--ghost' : 'btn', type: 'button',
            on: { click: () => { showEvents(store.markLessons(slug, [lessonId], !done)); render(); } } },
            done ? ICON.checkThin({ width: 18, height: 18 }) : ICON.check({ width: 18, height: 18 }),
            el('span', { text: done ? '已標記為看完（取消）' : `我在官方看完了 +${XP.videoLesson} XP` })
          ),
          el('p', { class: 'official-note', text: '本站無法驗證你是否看完，這是你自己的紀錄。' })
        ),
        noteEditor(lessonId),
        pager()
      );
    };
    render();
  }

  /* ── 我的筆記 ─────────────────────────────────────────── */
  function noteEditor(key) {
    const ta = el('textarea', {
      placeholder: '寫下你自己的理解、想到的應用場景、或想之後回來確認的問題…'
    });
    ta.value = store.noteBody(key);

    const status = el('p', { class: 'note-status', 'aria-live': 'polite' });
    const set = (s, t) => { status.dataset.state = s; status.textContent = t; };
    const n0 = ta.value.trim().length;
    set('idle', n0 ? `已儲存 · ${n0} 字` : `寫滿 ${NOTE_MIN} 字可獲得 +${XP.note} XP`);

    let timer = 0;
    const save = () => {
      showEvents(store.saveNote(key, ta.value));
      const len = ta.value.trim().length;
      set('saved', len ? `已儲存 · ${len} 字` : '已清空');
    };
    ta.addEventListener('input', () => {
      clearTimeout(timer);
      const len = ta.value.trim().length;
      set('typing', len < NOTE_MIN ? `還要 ${NOTE_MIN - len} 字可獲得 +${XP.note} XP` : '輸入中…');
      timer = setTimeout(save, NOTE_SAVE_DEBOUNCE);
    });
    const flush = () => { clearTimeout(timer); if (ta.value !== store.noteBody(key)) save(); };
    ta.addEventListener('blur', flush);
    document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
    window.addEventListener('pagehide', flush);

    return el('section', { class: 'note card card--pad', style: { 'margin-top': '22px' } },
      el('div', { class: 'note-head' },
        el('h3', { text: '我的筆記' }),
        el('span', { class: 'pill pill--blue', text: `+${XP.note} XP` })
      ),
      ta, status
    );
  }

  renderTeach();
}
