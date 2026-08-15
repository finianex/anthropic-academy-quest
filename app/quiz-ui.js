/*
 * app/quiz-ui.js — 練習介面
 *
 * 課堂練習與複習共用同一套。兩種作答方式：
 *   choose  單選，選完按檢查
 *   match   配對，**每配一對就立刻判定**（配錯兩張一起閃紅並退回）
 *
 * 底部回饋條是整個手感的關鍵：答完之後條會變綠或變紅、把正解與說明攤開，
 * 按〔繼續〕才進下一題。答錯時不會直接跳過去——你一定會看到正確答案。
 */

import { el, fill, clear, reducedMotion, scrollTop } from './dom.js';
import { ICON } from './ui.js';
import * as sfx from './sfx.js';

const shuffle = (a) => { const b = a.slice(); for (let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];} return b; };

/**
 * 掛載一場練習。
 * @param {HTMLElement} host
 * @param {object} opts { session, onAnswer(res, item), onFinish(session), quitHref, quitLabel }
 */
export function mountQuiz(host, opts) {
  const { session } = opts;

  const bar = el('div', { class: 'xpbar quiz-progress' }, el('i'));
  const promptEl = el('h2', { class: 'quiz-prompt', tabindex: '-1' });
  const passageEl = el('p', { class: 'quiz-passage selectable', hidden: true });
  const answerEl = el('div', { class: 'quiz-answer' });

  const verdict = el('div', { class: 'quiz-verdict' });
  const action = el('button', { class: 'btn btn--lg quiz-action', type: 'button' });
  const feedback = el('div', { class: 'quiz-bar', data: { state: 'idle' } },
    el('div', { class: 'quiz-bar-in wrap wrap--narrow' }, verdict, action)
  );

  /* 離開練習會丟掉這一場的作答，所以動過手之後要確認一次。
     還沒答過任何一題就直接走，不用多問。 */
  let answeredAny = false;
  const quitEl = opts.quitHref
    ? el('a', {
        class: 'quiz-quit', href: opts.quitHref,
        'aria-label': opts.quitLabel || '離開練習',
        on: { click: (e) => {
          if (!answeredAny) return;
          if (!window.confirm('離開練習的話，這一場的作答不會保留。要離開嗎？')) e.preventDefault();
        } }
      }, ICON.close({ width: 22, height: 22 }))
    : el('span');

  /* 音效開關放在練習畫面上，不是設定頁。這個站很可能在辦公室或圖書館
     被打開，突然出聲是會讓人尷尬的事——關掉的路徑必須一眼看得到。 */
  const sfxBtn = el('button', {
    class: 'quiz-sfx', type: 'button',
    'aria-pressed': String(sfx.isOn()),
    on: { click: () => { sfx.setOn(!sfx.isOn()); paintSfx(); } }
  });
  function paintSfx() {
    const on = sfx.isOn();
    sfxBtn.setAttribute('aria-pressed', String(on));
    sfxBtn.setAttribute('aria-label', on ? '答題音效：開啟中，點一下關閉' : '答題音效：已關閉，點一下開啟');
    sfxBtn.title = on ? '答題音效開啟中' : '答題音效已關閉';
    fill(sfxBtn, on ? ICON.sound({ width: 20, height: 20 }) : ICON.mute({ width: 20, height: 20 }));
  }
  paintSfx();

  const quizEl = el('div', { class: 'quiz' },
      el('div', { class: 'quiz-top' }, quitEl, bar, sfxBtn),
      el('div', { class: 'quiz-body wrap wrap--narrow' }, promptEl, passageEl, answerEl)
  );
  host.replaceChildren(quizEl, feedback);

  /* 回饋條是 position:fixed 而且高度會變（答錯時要塞正解與說明，手機上還會
     改成直向堆疊，實測可以長到 400px）。固定的 padding-bottom 一定會被追過，
     所以量它的實際高度寫進自訂屬性，讓內容區永遠留出剛好的空間。 */
  const syncBarHeight = () => {
    quizEl.style.setProperty('--quiz-bar-h', feedback.offsetHeight + 'px');
  };
  // 存下 observer 的參照：沒有參照的 ResizeObserver 行為不可靠。
  // 而且不能只靠它——每次切換題目與判定之後都明確同步一次，
  // 這樣「回饋條變高」和「留白變大」永遠是同一個畫格內完成的。
  let barRO = null;
  if ('ResizeObserver' in window) {
    barRO = new ResizeObserver(syncBarHeight);
    barRO.observe(feedback);
  }
  window.addEventListener('resize', syncBarHeight);

  let state = 'idle';        // idle | answered
  let pending = null;        // 目前選到的答案（依題型而定）
  let mistakes = 0;          // match 題用：這一題配錯過幾次

  const setProgress = () => {
    const pct = session.total ? Math.round((session.cleared / session.total) * 100) : 0;
    bar.style.setProperty('--pct', pct + '%');
    bar.setAttribute('role', 'progressbar');
    bar.setAttribute('aria-valuenow', String(session.cleared));
    bar.setAttribute('aria-valuemax', String(session.total));
    bar.setAttribute('aria-label', `練習進度：${session.total} 題中已通過 ${session.cleared} 題`);
  };

  function render() {
    const node = session.current();
    if (!node) { opts.onFinish?.(session); return; }

    state = 'idle';
    pending = null;
    mistakes = 0;
    feedback.dataset.state = 'idle';
    clear(verdict);
    setProgress();

    const item = node.item;
    promptEl.textContent = item.prompt;
    if (item.passage) { passageEl.textContent = item.passage; passageEl.hidden = false; }
    else { passageEl.hidden = true; passageEl.textContent = ''; }

    clear(answerEl);
    if (item.type === 'choose') renderChoose(item);
    else if (item.type === 'match') renderMatch(item);

    setAction('檢查', false);
    promptEl.focus({ preventScroll: true });
    syncBarHeight();
  }

  function setAction(label, enabled, cls) {
    clear(action);
    action.append(el('span', { text: label }));
    action.disabled = !enabled;
    action.className = 'btn btn--lg quiz-action' + (cls ? ' ' + cls : '');
  }

  /* ── 單選 ──────────────────────────────────────────────── */
  function renderChoose(item) {
    const opts_ = item.options.map((o, i) =>
      el('button', {
        class: 'opt', type: 'button', data: { i },
        'aria-pressed': 'false',
        on: { click: () => {
          if (state === 'answered') return;
          pending = i;
          [...answerEl.querySelectorAll('.opt')].forEach((b) => {
            const on = Number(b.dataset.i) === i;
            b.dataset.sel = on ? '1' : '0';
            b.setAttribute('aria-pressed', on ? 'true' : 'false');
          });
          setAction('檢查', true);
        } }
      },
        el('span', { class: 'opt-key', text: String(i + 1) }),
        el('span', { class: 'opt-txt selectable', text: o.text })
      )
    );
    answerEl.appendChild(el('div', { class: 'opts', role: 'group', 'aria-label': '選項' }, ...opts_));
  }

  function gradeChoose(item) {
    const correct = item.options[pending]?.correct === true;
    [...answerEl.querySelectorAll('.opt')].forEach((b) => {
      const i = Number(b.dataset.i);
      b.disabled = true;
      if (item.options[i].correct) b.dataset.mark = 'right';
      else if (i === pending) b.dataset.mark = 'wrong';
    });
    return correct;
  }

  /* ── 配對 ──────────────────────────────────────────────── */
  function renderMatch(item) {
    const left = shuffle(item.pairs);
    const right = shuffle(item.pairs);
    let sel = null;          // 目前選到的左側 key
    let solved = 0;

    const leftCol = el('div', { class: 'match-col' });
    const rightCol = el('div', { class: 'match-col' });

    const chip = (side, p) => el('button', {
      class: `mchip mchip--${side}`, type: 'button', data: { key: p.key },
      on: { click: () => onPick(side, p.key) }
    }, el('span', { class: 'selectable', text: side === 'l' ? p.left : p.right }));

    function onPick(side, key) {
      if (state === 'answered') return;
      const node = (side === 'l' ? leftCol : rightCol).querySelector(`[data-key="${key}"]`);
      if (!node || node.dataset.done === '1') return;

      if (side === 'l') {
        sel = sel === key ? null : key;
        [...leftCol.children].forEach((c) => c.dataset.sel = (c.dataset.key === sel ? '1' : '0'));
        return;
      }
      if (!sel) return;

      const l = leftCol.querySelector(`[data-key="${sel}"]`);
      if (sel === key) {
        // 配對正確：兩張都定住
        l.dataset.done = '1'; l.dataset.sel = '0';
        node.dataset.done = '1';
        solved += 1;
        sel = null;
        if (solved === item.pairs.length) {
          // 全部配完才算作答完成；配錯過就不算第一次答對
          pending = mistakes === 0;
          finishItem(item, pending);
        }
      } else {
        // 配錯：兩張一起閃紅，退回可再選
        mistakes += 1;
        flash(l); flash(node);
        l.dataset.sel = '0';
        sel = null;
      }
    }

    function flash(node) {
      if (reducedMotion()) { node.dataset.mark = 'wrong'; setTimeout(() => delete node.dataset.mark, 520); return; }
      node.dataset.mark = 'wrong';
      setTimeout(() => { delete node.dataset.mark; }, 520);
    }

    left.forEach((p) => leftCol.appendChild(chip('l', p)));
    right.forEach((p) => rightCol.appendChild(chip('r', p)));
    answerEl.appendChild(el('div', { class: 'match', role: 'group', 'aria-label': '配對題' }, leftCol, rightCol));
    setAction('把左右配起來', false);
  }

  /* ── 判定與回饋 ─────────────────────────────────────────── */
  function finishItem(item, correct) {
    state = 'answered';
    answeredAny = true;
    const res = session.answer(correct);
    opts.onAnswer?.(res, item);
    setProgress();

    /* 聲音先出，畫面後到。判定的瞬間發聲，人耳的反應比讀字快，
       所以聽到的當下眼睛才剛開始看回饋條。 */
    if (correct) sfx.correct(); else sfx.wrong();

    feedback.dataset.state = correct ? 'correct' : 'wrong';
    clear(verdict);
    verdict.append(
      el('div', { class: 'quiz-verdict-head' },
        correct ? ICON.check({ width: 22, height: 22 }) : ICON.cross({ width: 22, height: 22 }),
        el('b', { text: correct
          ? (res.firstTry ? '答對了' : '這次對了')
          : '再看一次' })
      )
    );
    if (!correct || !res.firstTry) {
      verdict.append(el('p', { class: 'quiz-explain selectable', text: item.explain || '' }));
    }
    if (!correct) {
      verdict.append(el('p', { class: 'quiz-requeue', text: '這一題等一下會再問一次。' }));
    }

    setAction(res.finished ? '完成練習' : '繼續', true, correct ? '' : 'btn--coral');
    action.focus({ preventScroll: true });
    // 回饋條剛長高（多了正解與說明），立刻把內容區的留白補上
    syncBarHeight();
    requestAnimationFrame(syncBarHeight);
  }

  action.addEventListener('click', () => {
    const node = session.current();
    if (!node) { opts.onFinish?.(session); return; }
    const item = node.item;

    if (state === 'answered') {
      // 換到下一題＝整個內容換掉，一定要回到最上方。
      // 使用者常常是捲到下面點最後一個選項才作答的，不捲回去的話
      // 下一題的題目會在畫面上方看不到的地方。
      if (session.remaining === 0) { opts.onFinish?.(session); return; }
      scrollTop();
      render();
      return;
    }

    if (item.type === 'choose') {
      if (pending === null) return;
      finishItem(item, gradeChoose(item));
    }
    // match 是配完自動判定，不經過這個按鈕
  });

  /* 鍵盤：1–4 選項、Enter 檢查／繼續 */
  document.addEventListener('keydown', (e) => {
    if (e.target.matches('textarea, input')) return;
    if (e.key === 'Enter') { if (!action.disabled) { action.click(); e.preventDefault(); } return; }
    if (state === 'answered') return;
    const n = Number(e.key);
    if (n >= 1 && n <= 9) {
      const btn = answerEl.querySelectorAll('.opt')[n - 1];
      if (btn) { btn.click(); e.preventDefault(); }
    }
  });

  render();
  return { render };
}
