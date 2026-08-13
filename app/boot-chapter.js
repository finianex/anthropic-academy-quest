/*
 * app/boot-chapter.js — 純影片課的章節頁
 *
 * 這一頁的全部工作就是誠實：列出這個章節有哪些課堂、每一堂連到官方影片、
 * 讓使用者自己回報看完了沒有，並且把「本站無法驗證」寫在看得見的地方。
 */

import { $, el, fill } from './dom.js';
import * as store from './store.js';
import * as local from './local.js';
import { mountHud, mountFoot, showEvents, ICON, warnQuota } from './ui.js';
import { info, sectionsOf, officialLessonUrl, officialCourseUrl, island, nodesOf } from './catalog.js';
import { NOTE_MIN, NOTE_SAVE_DEBOUNCE, XP } from './config.js';

store.init();
local.onQuotaError(warnQuota);
mountHud($('#hud'));
mountFoot($('#foot'));

const params = new URLSearchParams(location.search);
const slug = params.get('course');
const sIdx = Number(params.get('section'));
const course = info(slug);
const sections = sectionsOf(slug);
const section = Number.isInteger(sIdx) ? sections[sIdx] : null;

if (!course || !section) {
  $('#error').hidden = false;
} else {
  boot();
}

function boot() {
  const isl = island(course.islandKey);
  const lessons = section.lessonIds.map((id) => course.lessons.find((l) => l.id === id)).filter(Boolean);
  const noteKey = `${slug}#s${sIdx}`;
  const nodes = nodesOf(slug);

  document.title = `${section.zh}｜${course.course.zhTitle}`;
  store.visit(slug, section.lessonIds[0]);

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
      el('h1', { class: 'selectable', text: section.zh }),
      section.en && section.en !== section.zh ? el('p', { class: 'lesson-en', text: section.en }) : null,
      el('p', { class: 'lesson-meta', text: `第 ${sIdx + 1}／${sections.length} 章 · ${lessons.length} 堂課` })
    )
  );

  render();
  store.subscribe(render);

  function render() {
    const doneCount = section.lessonIds.filter((id) => store.lessonState(slug, id) === 2).length;
    const allDone = doneCount === section.lessonIds.length;

    fill($('#body'),
      el('div', { class: 'notice-video' },
        ICON.film({ width: 18, height: 18 }),
        el('span', { text: '這門課的官方課堂是純影片授課，沒有隨附文字教材，也沒有字幕或逐字稿可以整理。本站不為這類課堂撰寫筆記，改為提供官方入口與你自己的紀錄空間。' })
      ),

      el('div', { class: 'chapter-head' },
        el('span', { class: allDone ? 'pill pill--green' : 'pill', text: `${doneCount}/${lessons.length} 堂已標記` }),
        el('button', {
          class: allDone ? 'btn btn--ghost btn--sm' : 'btn btn--sm',
          type: 'button',
          on: {
            click: () => {
              const events = store.markLessons(slug, section.lessonIds, !allDone);
              showEvents(events);
            }
          }
        }, el('span', { text: allDone ? '取消整章標記' : '整章都看完了' }))
      ),

      el('ol', { class: 'chapter-list' },
        ...lessons.map((l, i) => {
          const done = store.lessonState(slug, l.id) === 2;
          return el('li', { class: 'chapter-row', data: { done: done ? '1' : '0' } },
            el('button', {
              class: 'chk',
              type: 'button',
              'aria-pressed': done ? 'true' : 'false',
              'aria-label': `${done ? '取消標記' : '標記看完'}：${l.zh}`,
              on: {
                click: () => {
                  const events = store.markLessons(slug, [l.id], !done);
                  showEvents(events);
                }
              }
            }, done ? ICON.checkThin({ width: 18, height: 18 }) : null),
            el('span', { class: 'chapter-txt' },
              el('b', { class: 'selectable', text: l.zh }),
              l.en && l.en !== l.zh ? el('small', { text: l.en }) : null
            ),
            el('a', {
              class: 'btn btn--sm btn--ghost',
              href: officialLessonUrl(slug, l.id),
              target: '_blank', rel: 'noopener noreferrer',
              'aria-label': `前往官方影片：${l.zh}`
            }, el('span', { text: '影片 ↗' }))
          );
        })
      ),

      el('p', { class: 'official-note', style: { 'margin-top': '10px' },
        text: `本站無法驗證你是否看完，以上都是你自己的紀錄。每堂 +${XP.videoLesson} XP。` }),

      noteEditor(),
      chapterPager()
    );
  }

  /* 章節層級的筆記。key 用 `slug#sN` 這個合成鍵，因為這一章沒有單一對應的課堂。 */
  function noteEditor() {
    const ta = el('textarea', { placeholder: '寫下你看完這一章的重點、指令、或想回頭確認的地方…' });
    ta.value = store.noteBody(noteKey);

    const status = el('p', { class: 'note-status', 'aria-live': 'polite' });
    const set = (state, txt) => { status.dataset.state = state; status.textContent = txt; };
    const n0 = ta.value.trim().length;
    set('idle', n0 ? `已儲存 · ${n0} 字` : `寫滿 ${NOTE_MIN} 字可獲得 +${XP.note} XP`);

    let timer = 0;
    const save = () => {
      const events = store.saveNote(noteKey, ta.value);
      const len = ta.value.trim().length;
      set('saved', len ? `已儲存 · ${len} 字` : '已清空');
      showEvents(events);
    };
    ta.addEventListener('input', () => {
      clearTimeout(timer);
      const len = ta.value.trim().length;
      set('typing', len < NOTE_MIN ? `還要 ${NOTE_MIN - len} 字可獲得 +${XP.note} XP` : '輸入中…');
      timer = setTimeout(save, NOTE_SAVE_DEBOUNCE);
    });
    const flush = () => { clearTimeout(timer); if (ta.value !== store.noteBody(noteKey)) save(); };
    ta.addEventListener('blur', flush);
    document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });
    window.addEventListener('pagehide', flush);

    return el('section', { class: 'note card card--pad', style: { 'margin-top': '20px' } },
      el('div', { class: 'note-head' },
        el('h3', { text: '我的章節筆記' }),
        el('span', { class: 'pill pill--blue', text: `+${XP.note} XP` })
      ),
      ta, status
    );
  }

  function chapterPager() {
    const prev = sIdx > 0 ? sections[sIdx - 1] : null;
    const next = sIdx < sections.length - 1 ? sections[sIdx + 1] : null;
    const link = (sec, i, dirZh, cls) => sec
      ? el('a', { class: `pg ${cls}`, href: `chapter.html?course=${encodeURIComponent(slug)}&section=${i}` },
          el('span', { class: 'pg-dir', text: dirZh }), el('b', { text: sec.zh }))
      : el('span', { class: `pg ${cls} pg-empty`, 'aria-hidden': 'true' });

    return el('nav', { class: 'pager', 'aria-label': '章節導覽' },
      link(prev, sIdx - 1, '← 上一章', 'pg-prev'),
      link(next, sIdx + 1, '下一章 →', 'pg-next')
    );
  }
}
