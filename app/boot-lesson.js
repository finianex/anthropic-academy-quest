/*
 * app/boot-lesson.js — 課堂卡片流
 *
 * 為什麼完成偵測是「翻到最後一張 + 明確按一下」：
 *   「捲到底」在這個資料上是壞的——290 堂純影片課根本沒有內容可捲，
 *   頁面短到一載入就等於捲到底，會誤判 65% 的課完成。
 *   「停留時間」也不行——93 堂的 Vertex 和 15 堂的基礎課無法共用門檻。
 *   卡片流讓「翻到最後一張」變成可靠訊號，再加一次明確點擊，兩邊都成立。
 */

import { $, el, fill, clear, reducedMotion } from './dom.js';
import * as store from './store.js';
import * as local from './local.js';
import { mountHud, mountFoot, showEvents, ICON, warnQuota } from './ui.js';
import { buildCards } from './cards.js';
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

if (!course || !lesson) {
  $('#error').hidden = false;
} else {
  boot();
}

function boot() {
  const note = noteOf(lessonId);
  const videoOnly = isVideoOnly(slug) && !note;
  const cards = buildCards(note, lesson);
  const sectionZh = lessonLookup(lessonId)?.section?.zh || '';
  const isl = island(course.islandKey);

  document.title = `${lesson.zh}｜${course.course.zhTitle}`;

  /* 造訪就讓腳色移動過來（不給 XP，只記位置）*/
  store.visit(slug, lessonId);

  /* ── 頁首 ───────────────────────────────────────────────── */
  fill($('#head'),
    el('div', { class: 'page-head' },
      el('div', { class: 'row', style: { gap: '4px' } },
        el('a', { class: 'crumb', href: isl ? `island.html?island=${isl.key}` : 'index.html' },
          ICON.arrowL({ width: 15, height: 15 }),
          el('span', { text: isl ? isl.zh : '世界地圖' })
        ),
        el('span', { class: 'crumb-sep', text: '/' }),
        el('span', { class: 'crumb', text: course.course.zhTitle })
      ),
      el('h1', { class: 'selectable', text: lesson.zh }),
      lesson.en && lesson.en !== lesson.zh
        ? el('p', { class: 'lesson-en', text: lesson.en })
        : null,
      el('p', { class: 'lesson-meta', text:
        `${sectionZh ? sectionZh + ' · ' : ''}第 ${pos.number}／${pos.total} 堂 · 官方課堂編號 ${lesson.id}` })
    )
  );

  /* ── 純影片課：誠實說明，不假裝有內容 ─────────────────────── */
  if (videoOnly) {
    renderVideoOnly();
    return;
  }

  if (!cards.length) {
    fill($('#flow'), el('div', { class: 'blank' }, el('p', { text: '這堂課目前沒有中文筆記。' })));
    renderAfter();
    return;
  }

  /* ── 卡片流 ─────────────────────────────────────────────── */
  let idx = 0;
  let maxSeen = 0;

  const steps = el('div', { class: 'steps', role: 'presentation' },
    ...cards.map(() => el('i')));
  const kindLabel = el('span', { class: 'kind' });
  const countLabel = el('span', { class: 'count' });
  const face = el('article', { class: 'face', tabindex: '-1' });

  const btnPrev = el('button', {
    class: 'btn btn--ghost', type: 'button',
    on: { click: () => go(idx - 1, -1) }
  }, ICON.arrowL({ width: 17, height: 17 }), el('span', { text: '上一張' }));

  const btnNext = el('button', {
    class: 'btn', type: 'button',
    on: { click: onNext }
  });

  fill($('#flow'),
    steps,
    el('div', { class: 'flow-meta' }, kindLabel, countLabel),
    face,
    el('div', { class: 'flow-nav' }, btnPrev, btnNext)
  );

  function cardBody(c) {
    const parts = [el('h2', { class: 'selectable', text: c.title })];
    if (c.body) parts.push(el('p', { class: 'selectable', text: c.body }));
    if (c.kind === 'workflow') {
      parts.push(el('ol', { class: 'flowlist selectable' }, ...c.items.map((s) => el('li', { text: s }))));
    }
    if (c.kind === 'pitfalls') {
      parts.push(el('ul', { class: 'warnlist selectable' }, ...c.items.map((s) => el('li', { text: s }))));
    }
    return parts;
  }

  function go(n, dir, focus = true) {
    if (n < 0 || n >= cards.length) return;
    idx = n;
    maxSeen = Math.max(maxSeen, idx);
    const c = cards[idx];

    face.className = 'face' + (c.kind === 'example' ? ' face--example' : '');
    if (!reducedMotion()) {
      face.style.setProperty('--from', dir < 0 ? '-16px' : '16px');
      face.classList.add('in');
      // 重新觸發動畫
      void face.offsetWidth;
    }
    fill(face, ...cardBody(c));

    kindLabel.textContent = c.seqOf ? `${c.kindZh} · ${c.seq}/${c.seqOf}` : c.kindZh;
    countLabel.textContent = `第 ${idx + 1}／${cards.length} 張`;

    paintSteps();
    btnPrev.disabled = idx === 0;
    updateNext();
    if (focus) face.focus({ preventScroll: false });
  }

  /* 完成之後整條進度條要全亮，所以標記完成時也得重畫一次 */
  function paintSteps() {
    const allDone = store.lessonState(slug, lessonId) === 2;
    [...steps.children].forEach((s, i) => {
      s.dataset.on = (allDone || i < idx) ? '1' : '0';
      s.dataset.now = i === idx ? '1' : '0';
    });
  }

  function isLast() { return idx === cards.length - 1; }
  function isDone() { return store.lessonState(slug, lessonId) === 2; }

  function updateNext() {
    clear(btnNext);
    if (!isLast()) {
      btnNext.className = 'btn';
      btnNext.append(el('span', { text: '下一張' }), ICON.arrowR({ width: 17, height: 17 }));
      btnNext.setAttribute('aria-label', '下一張卡片');
    } else if (!isDone()) {
      btnNext.className = 'btn btn--lg';
      btnNext.append(ICON.check({ width: 19, height: 19 }),
        el('span', { text: `完成本課 +${lessonXp(slug)} XP` }));
      btnNext.setAttribute('aria-label', `標記這堂課完成，獲得 ${lessonXp(slug)} XP`);
    } else if (pos.next) {
      btnNext.className = 'btn btn--blue btn--lg';
      btnNext.append(el('span', { text: '下一課' }), ICON.arrowR({ width: 19, height: 19 }));
      btnNext.setAttribute('aria-label', `前往下一課：${pos.next.zh}`);
    } else {
      btnNext.className = 'btn btn--ghost btn--lg';
      btnNext.append(el('span', { text: '回到島嶼路徑' }));
    }
  }

  function onNext() {
    if (!isLast()) { go(idx + 1, 1); return; }
    if (!isDone()) {
      const events = store.markLessons(slug, [lessonId], true);
      showEvents(events);
      paintSteps();
      updateNext();
      renderAfter();
      return;
    }
    if (pos.next) {
      location.href = `lesson.html?course=${encodeURIComponent(slug)}&lesson=${encodeURIComponent(pos.next.id)}`;
    } else {
      location.href = isl ? `island.html?island=${isl.key}` : 'index.html';
    }
  }

  /* 鍵盤翻卡 */
  document.addEventListener('keydown', (e) => {
    if (e.target.matches('textarea, input')) return;
    if (e.key === 'ArrowRight') { if (!isLast()) { go(idx + 1, 1); e.preventDefault(); } }
    else if (e.key === 'ArrowLeft') { if (idx > 0) { go(idx - 1, -1); e.preventDefault(); } }
  });

  go(0, 1, false);
  renderAfter();

  /* ── 卡片下方：完成狀態、我的筆記、官方連結、上下一課 ───────── */
  function renderAfter() {
    fill($('#after'),
      doneStrip(),
      noteEditor(),
      officialRow(),
      pager()
    );
  }

  function doneStrip() {
    const done = isDone();
    if (!done) return null;
    return el('div', { class: 'done-strip' },
      ICON.check({ width: 20, height: 20 }),
      el('span', { text: '這堂已完成' }),
      el('button', {
        class: 'btn btn--sm btn--ghost', type: 'button',
        on: { click: () => { store.markLessons(slug, [lessonId], false); paintSteps(); updateNext(); renderAfter(); } }
      }, el('span', { text: '取消標記' }))
    );
  }

  function pager() {
    const link = (item, dirZh, cls) => item
      ? el('a', {
          class: `pg ${cls}`,
          href: `lesson.html?course=${encodeURIComponent(slug)}&lesson=${encodeURIComponent(item.id)}`
        },
        el('span', { class: 'pg-dir', text: dirZh }),
        el('b', { text: item.zh })
      )
      : el('span', { class: `pg ${cls} pg-empty`, 'aria-hidden': 'true' });

    return el('nav', { class: 'pager', 'aria-label': '課堂導覽' },
      link(pos.prev, '← 上一課', 'pg-prev'),
      link(pos.next, '下一課 →', 'pg-next')
    );
  }

  function officialRow() {
    return el('div', { class: 'official-row' },
      el('a', {
        class: 'btn btn--ghost btn--sm',
        href: officialLessonUrl(slug, lessonId),
        target: '_blank', rel: 'noopener noreferrer'
      }, el('span', { text: '閱讀官方教材 ↗' })),
      el('span', { class: 'official-note', text: '本頁是原創繁中整理，不是官方教材的逐字翻譯。' })
    );
  }

  /* ── 純影片課的替代畫面 ─────────────────────────────────── */
  function renderVideoOnly() {
    fill($('#flow'),
      el('article', { class: 'face' },
        el('span', { class: 'pill', text: '純影片課堂' }),
        el('h2', { text: '這一堂沒有文字教材' }),
        el('p', { text: '官方平台上這一堂是純影片授課，沒有隨附的文字教材，也沒有字幕或逐字稿可以整理。為了不讓你讀到憑空推測的內容，本站不為這類課堂撰寫筆記。' }),
        el('div', { class: 'row', style: { 'margin-top': '6px' } },
          el('a', {
            class: 'btn btn--lg',
            href: officialLessonUrl(slug, lessonId),
            target: '_blank', rel: 'noopener noreferrer'
          }, el('span', { text: '前往官方影片 ↗' }))
        ),
        el('p', { class: 'official-note', text: '需要登入 Skilljar 並註冊該課程才能觀看。' })
      )
    );

    const mark = () => {
      const done = store.lessonState(slug, lessonId) === 2;
      const events = store.markLessons(slug, [lessonId], !done);
      showEvents(events);
      renderVideoAfter();
    };

    function renderVideoAfter() {
      const done = store.lessonState(slug, lessonId) === 2;
      fill($('#after'),
        el('div', { class: 'selfreport' },
          el('button', {
            class: done ? 'btn btn--ghost' : 'btn',
            type: 'button',
            on: { click: mark }
          },
            done ? ICON.checkThin({ width: 18, height: 18 }) : ICON.check({ width: 18, height: 18 }),
            el('span', { text: done ? '已標記為看完（取消）' : `我在官方看完了 +${XP.videoLesson} XP` })
          ),
          el('p', { class: 'official-note', text: '本站無法驗證你是否看完，這是你自己的紀錄。' })
        ),
        noteEditor(),
        pager()
      );
    }
    renderVideoAfter();
  }

  /* ── 我的筆記 ───────────────────────────────────────────── */
  function noteEditor() {
    const ta = el('textarea', {
      id: 'my-note',
      placeholder: '寫下你自己的理解、想到的應用場景、或想之後回來確認的問題…',
      'aria-describedby': 'note-hint'
    });
    ta.value = store.noteBody(lessonId);

    const status = el('p', { class: 'note-status', id: 'note-hint', 'aria-live': 'polite' });
    const setStatus = (state, txt) => { status.dataset.state = state; status.textContent = txt; };

    const n = ta.value.trim().length;
    setStatus('idle', n
      ? `已儲存 · ${n} 字`
      : `寫滿 ${NOTE_MIN} 字可獲得 +${XP.note} XP`);

    let timer = 0;
    const save = () => {
      const events = store.saveNote(lessonId, ta.value);
      const len = ta.value.trim().length;
      setStatus('saved', len ? `已儲存 · ${len} 字` : '已清空');
      showEvents(events);
    };

    ta.addEventListener('input', () => {
      clearTimeout(timer);
      const len = ta.value.trim().length;
      setStatus('typing', len < NOTE_MIN
        ? `還要 ${NOTE_MIN - len} 字可獲得 +${XP.note} XP`
        : '輸入中…');
      timer = setTimeout(save, NOTE_SAVE_DEBOUNCE);
    });

    // 手機版 Safari 的 beforeunload 不可靠，用 visibilitychange 才存得到
    const flush = () => { clearTimeout(timer); if (ta.value !== store.noteBody(lessonId)) save(); };
    ta.addEventListener('blur', flush);
    document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
    window.addEventListener('pagehide', flush);

    return el('section', { class: 'note card card--pad' },
      el('div', { class: 'note-head' },
        el('h3', { text: '我的筆記' }),
        el('span', { class: 'pill pill--blue', text: `+${XP.note} XP` })
      ),
      ta,
      status
    );
  }
}
