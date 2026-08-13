/*
 * app/avatar.js — 腳色
 *
 * 全部是手寫的 inline SVG：沒有美術管線、沒有二進位資產、沒有網路請求。
 * 造型語言配合「桌遊棋子」的概念——圓潤色塊 + 深色描邊，像一顆塑膠棋子。
 *
 * 兩種成長是分開的，這是刻意的：
 *   等級 → 腳底的「底座」升級（不可選，所以看一眼就知道對方走多遠）
 *   徽章／等級 → 解鎖配件（可自由搭配，這是個人化的部分）
 */

import { svg } from './dom.js';

const INK = '#3C3C3C';
const SW = 2.4;

/* 描邊的色塊（fill 用 currentColor，所以 CSS 換色就能換整隻） */
const body = (tag, attrs) => ({ tag, attrs: { ...attrs, fill: 'currentColor', stroke: INK, 'stroke-width': SW, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' } });
/* 深色實心（眼珠、細節） */
const ink  = (tag, attrs) => ({ tag, attrs: { ...attrs, fill: INK } });
/* 白色實心（眼白） */
const pale = (tag, attrs) => ({ tag, attrs: { ...attrs, fill: '#fff', stroke: INK, 'stroke-width': 1.4 } });
/* 指定色的色塊 */
const tone = (tag, attrs, color) => ({ tag, attrs: { ...attrs, fill: color, stroke: INK, 'stroke-width': 1.8, 'stroke-linejoin': 'round' } });
/* 線條 */
const line = (tag, attrs) => ({ tag, attrs: { ...attrs, fill: 'none', stroke: INK, 'stroke-width': 1.6, 'stroke-linecap': 'round' } });

/* 通用的臉：兩隻眼睛 + 一張嘴 */
const face = (cx = 20, ey = 22) => [
  pale('circle', { cx: cx - 4.2, cy: ey, r: 2.5 }),
  pale('circle', { cx: cx + 4.2, cy: ey, r: 2.5 }),
  ink('circle',  { cx: cx - 3.8, cy: ey + 0.4, r: 1.15 }),
  ink('circle',  { cx: cx + 4.6, cy: ey + 0.4, r: 1.15 }),
  line('path',   { d: `M${cx - 2.6} ${ey + 5.4}q2.6 2.1 5.2 0` })
];

/* ── 六種身形 ──────────────────────────────────────────────── */
export const BODIES = {
  cat: {
    zh: '貓',
    parts: [
      body('path', { d: 'M11.5 17 L9.5 7 L17.5 12.5 Z' }),
      body('path', { d: 'M28.5 17 L30.5 7 L22.5 12.5 Z' }),
      body('path', { d: 'M20 11c6.4 0 11 4.6 11 11v4.4c0 4.9-4.6 7.9-11 7.9S9 31.3 9 26.4V22c0-6.4 4.6-11 11-11z' }),
      ...face(20, 22),
      line('path', { d: 'M6.5 23h4M29.5 23h4' })            // 鬍鬚
    ]
  },
  rabbit: {
    zh: '兔',
    parts: [
      body('ellipse', { cx: 15.4, cy: 9.5, rx: 2.9, ry: 7.4 }),
      body('ellipse', { cx: 24.6, cy: 9.5, rx: 2.9, ry: 7.4 }),
      body('path', { d: 'M20 14c6.4 0 11 4.4 11 10.2v2.4c0 4.8-4.6 7.7-11 7.7S9 31.4 9 26.6v-2.4C9 18.4 13.6 14 20 14z' }),
      ...face(20, 23.4)
    ]
  },
  bird: {
    zh: '鳥',
    parts: [
      body('path', { d: 'M20 9.5q1.2-4.2 3.6-3.4' }),                     // 頭上一撮
      body('path', { d: 'M20 11.5c6.4 0 11 4.6 11 11s-4.6 11-11 11S9 29.4 9 22.5s4.6-11 11-11z' }),
      tone('path', { d: 'M20 23.6l4.6 2.6-4.6 2.6z' }, '#FFC800'),         // 喙
      ...face(20, 21.4)
    ]
  },
  robot: {
    zh: '機器人',
    parts: [
      line('path', { d: 'M20 11V6' }),
      body('circle', { cx: 20, cy: 4.6, r: 2.4 }),
      body('rect', { x: 9, y: 11, width: 22, height: 21, rx: 6.5 }),
      pale('rect', { x: 13.4, y: 18, width: 5.2, height: 4.4, rx: 1.6 }),
      pale('rect', { x: 21.4, y: 18, width: 5.2, height: 4.4, rx: 1.6 }),
      ink('circle', { cx: 16, cy: 20.2, r: 1.1 }),
      ink('circle', { cx: 24, cy: 20.2, r: 1.1 }),
      line('path', { d: 'M16 27.4h8' })
    ]
  },
  dino: {
    zh: '恐龍',
    parts: [
      body('path', { d: 'M12 14l2.6-4.4L17.2 14l2.8-4.8L22.8 14l2.6-4.4L28 14z' }),   // 背刺
      body('path', { d: 'M20 12.6c6.4 0 11 4.6 11 10.8v3.2c0 4.8-4.6 7.7-11 7.7S9 31.4 9 26.6v-3.2c0-6.2 4.6-10.8 11-10.8z' }),
      ...face(20, 22.6)
    ]
  },
  ghost: {
    zh: '幽靈',
    parts: [
      body('path', { d: 'M9 23c0-6.4 4.6-11 11-11s11 4.6 11 11v10.4l-3.7-2.9-3.6 2.9-3.7-2.9-3.6 2.9L9 33.4z' }),
      ...face(20, 22)
    ]
  }
};

/* ── 墨色（腳色主色）─────────────────────────────────────── */
export const TINTS = {
  green:  { zh: '草綠', css: 'var(--green)' },
  blue:   { zh: '天藍', css: 'var(--blue)' },
  gold:   { zh: '金黃', css: 'var(--gold)' },
  coral:  { zh: '珊瑚', css: 'var(--coral)' },
  purple: { zh: '紫',   css: 'var(--purple)' }
};

/* ── 配件 ─────────────────────────────────────────────────
   need: { level:n } 或 { badge:'id' } —— 由 unlocked() 判斷 */
export const GEAR = {
  hat: {
    zh: '帽子',
    items: {
      cap:   { zh: '鴨舌帽', need: { level: 2 }, parts: [
        tone('path', { d: 'M9.6 13.4C10.6 8.6 14.8 6 20 6s9.4 2.6 10.4 7.4z' }, '#1CB0F6'),
        tone('path', { d: 'M30.4 13.4h5.2v2.6h-5.6z' }, '#1490CC')
      ] },
      crown: { zh: '皇冠', need: { level: 6 }, parts: [
        tone('path', { d: 'M11 12L9.6 5l4.4 3.4L20 3l6 5.4L30.4 5 29 12z' }, '#FFC800')
      ] },
      leaf:  { zh: '葉飾', need: { badge: 'four-d' }, parts: [
        tone('path', { d: 'M20 9c0-4 3-6.4 6.6-6.4C26.6 6.6 23.8 9.4 20 9z' }, '#58CC02')
      ] },
      star:  { zh: '星冠', need: { level: 8 }, parts: [
        tone('path', { d: 'M20 2.2l2.1 4.3 4.7.7-3.4 3.3.8 4.7L20 13l-4.2 2.2.8-4.7-3.4-3.3 4.7-.7z' }, '#FFC800')
      ] }
    }
  },
  scarf: {
    zh: '圍巾',
    items: {
      stripe: { zh: '條紋圍巾', need: { level: 3 }, parts: [
        tone('path', { d: 'M11.6 28.6c5.4 2.2 11.4 2.2 16.8 0v3.2c-5.4 2.2-11.4 2.2-16.8 0z' }, '#FF4B4B')
      ] },
      knit:   { zh: '針織圍巾', need: { badge: 'island-hopper' }, parts: [
        tone('path', { d: 'M11.6 28.6c5.4 2.2 11.4 2.2 16.8 0v3.2c-5.4 2.2-11.4 2.2-16.8 0z' }, '#CE82FF'),
        tone('path', { d: 'M26 31.4h3.4v5.2H26z' }, '#A85FD6')
      ] }
    }
  },
  hold: {
    zh: '手持',
    items: {
      book:    { zh: '書', need: { level: 4 }, parts: [
        tone('path', { d: 'M30 24h7.4v7.4H30z' }, '#1CB0F6'),
        line('path', { d: 'M33.7 24v7.4' })
      ] },
      pen:     { zh: '筆', need: { badge: 'note-taker' }, parts: [
        tone('path', { d: 'M31 31.6l6.4-6.4 2 2-6.4 6.4z' }, '#FFC800'),
        ink('path',  { d: 'M31 31.6l-1 3 3-1z' })
      ] },
      lantern: { zh: '燈籠', need: { level: 7 }, parts: [
        line('path', { d: 'M32.6 22v3' }),
        tone('ellipse', { cx: 32.6, cy: 28.6, rx: 3.6, ry: 4.2 }, '#FFC800')
      ] }
    }
  },
  pet: {
    zh: '寵物',
    items: {
      bud:  { zh: '小芽', need: { level: 5 }, parts: [
        tone('circle', { cx: 4.6, cy: 30, r: 3.6 }, '#58CC02'),
        line('path', { d: 'M4.6 26.4v-2.6' })
      ] },
      chick:{ zh: '小雞', need: { badge: 'cartographer' }, parts: [
        tone('circle', { cx: 4.6, cy: 29.6, r: 4 }, '#FFC800'),
        ink('circle', { cx: 3.2, cy: 28.6, r: 0.9 })
      ] }
    }
  }
};

/* ── 底座：等級的視覺表現（不可選）───────────────────────── */
function baseParts(level) {
  if (level <= 2) return [];
  if (level <= 4) return [tone('ellipse', { cx: 20, cy: 35.6, rx: 10.4, ry: 3.1 }, '#E5E5E5')];
  if (level <= 6) return [tone('ellipse', { cx: 20, cy: 35.6, rx: 11.2, ry: 3.3 }, '#58CC02')];
  if (level === 7) return [tone('ellipse', { cx: 20, cy: 35.6, rx: 11.8, ry: 3.5 }, '#1CB0F6')];
  return [
    { tag: 'ellipse', attrs: { cx: 20, cy: 35.6, rx: 12.4, ry: 3.7, fill: 'url(#aaq-gold)', stroke: INK, 'stroke-width': 1.8 } }
  ];
}

/** 這個配件解鎖了嗎？ */
export function unlocked(item, view) {
  const need = item?.need;
  if (!need) return true;
  if (need.level && view.level.n < need.level) return false;
  if (need.badge && !view.badges.has(need.badge)) return false;
  return true;
}

/** 解鎖條件的中文說明。 */
export function needLabel(item) {
  const need = item?.need;
  if (!need) return '';
  if (need.level) return `Lv.${need.level} 解鎖`;
  if (need.badge) {
    const b = (window.ACADEMY_BADGES || []).find((x) => x.id === need.badge);
    return b ? `「${b.zh}」徽章解鎖` : '徽章解鎖';
  }
  return '';
}

function draw(parts) {
  return parts.map((p) => svg(p.tag, p.attrs));
}

/**
 * 畫出一隻腳色。
 * @param {object} av    { body, tint, hat, scarf, hold, pet }
 * @param {object} opts  { level=1, bob=false, showGear=true }
 */
export function renderAvatar(av = {}, opts = {}) {
  const level = opts.level || 1;
  const showGear = opts.showGear !== false;
  const bodyDef = BODIES[av.body] || BODIES.cat;
  const tint = TINTS[av.tint] || TINTS.green;

  const kids = [];

  /* Lv8 的漸層金——全站唯一的金屬感，留給走完全部課程的人 */
  if (level >= 8) {
    kids.push(
      svg('defs', null,
        svg('linearGradient', { id: 'aaq-gold', x1: '0', y1: '0', x2: '1', y2: '1' },
          svg('stop', { offset: '0', 'stop-color': '#FFE07A' }),
          svg('stop', { offset: '0.5', 'stop-color': '#FFC800' }),
          svg('stop', { offset: '1', 'stop-color': '#D9A400' })
        )
      )
    );
  }

  kids.push(...draw(baseParts(level)));
  if (showGear && av.pet && GEAR.pet.items[av.pet]) kids.push(...draw(GEAR.pet.items[av.pet].parts));
  kids.push(...draw(bodyDef.parts));
  if (showGear) {
    for (const slot of ['scarf', 'hat', 'hold']) {
      const it = av[slot] && GEAR[slot].items[av[slot]];
      if (it) kids.push(...draw(it.parts));
    }
  }

  const root = svg('svg', {
    viewBox: '0 0 40 40',
    class: opts.bob ? 'token-bob' : null,
    style: { color: tint.css },
    'aria-hidden': 'true',
    focusable: 'false'
  }, ...kids);

  return root;
}

/** 腳色的中文說明，給 aria-label 用。 */
export function avatarLabel(av = {}, level = 1) {
  const b = BODIES[av.body] || BODIES.cat;
  const t = TINTS[av.tint] || TINTS.green;
  return `${t.zh}色的${b.zh}，等級 ${level}`;
}
