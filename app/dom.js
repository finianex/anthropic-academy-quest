/*
 * app/dom.js — DOM 建構工具
 *
 * 這個檔案存在的唯一理由：讓任何人都沒有理由去碰 innerHTML。
 *
 * 本站會渲染兩種完全由使用者控制的字串——他們自己寫的課堂筆記，以及
 * Google 帳號的 displayName（那可以是 `<img src=x onerror=...>`）。一旦其中
 * 任何一個流進 innerHTML，就是 finianex.github.io 上的儲存型 XSS；而那個來源
 * 與 Firebase Auth 的 IndexedDB token 儲存同源，等於把 refresh token 一起送出去。
 *
 * 所以：全站零 innerHTML。文字一律走 textContent。
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * 建立 HTML 元素。
 * @example el('div', { class:'card', text:'嗨', data:{ state:'done' } }, child)
 *
 * props 支援：
 *   class / className   字串
 *   text                textContent（永遠不是 HTML）
 *   data                { key: value } → data-key
 *   style               { prop: value }，支援 --自訂屬性
 *   on                  { event: handler }
 *   其他                setAttribute（null / undefined / false 會跳過）
 */
export function el(tag, props, ...kids) {
  return build(document.createElement(tag), props, kids);
}

/** 建立 SVG 元素（需要正確的命名空間，不能用 createElement）。 */
export function svg(tag, props, ...kids) {
  return build(document.createElementNS(SVG_NS, tag), props, kids, true);
}

function build(node, props, kids, isSvg) {
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v === null || v === undefined || v === false) continue;

      if (k === 'text') {
        node.textContent = String(v);
      } else if (k === 'class' || k === 'className') {
        if (isSvg) node.setAttribute('class', String(v));
        else node.className = String(v);
      } else if (k === 'data') {
        for (const [dk, dv] of Object.entries(v)) {
          if (dv === null || dv === undefined || dv === false) continue;
          node.setAttribute('data-' + dk, String(dv));
        }
      } else if (k === 'style') {
        if (typeof v === 'string') node.setAttribute('style', v);
        else for (const [sk, sv] of Object.entries(v)) {
          if (sv === null || sv === undefined) continue;
          // setProperty 才處理得了 --自訂屬性
          node.style.setProperty(sk, String(sv));
        }
      } else if (k === 'on') {
        for (const [ev, fn] of Object.entries(v)) node.addEventListener(ev, fn);
      } else if (v === true) {
        node.setAttribute(k, '');
      } else {
        node.setAttribute(k, String(v));
      }
    }
  }
  append(node, kids);
  return node;
}

function append(node, kids) {
  for (const k of kids) {
    if (k === null || k === undefined || k === false) continue;
    if (Array.isArray(k)) { append(node, k); continue; }
    node.appendChild(typeof k === 'object' && k.nodeType ? k : document.createTextNode(String(k)));
  }
}

/** 純文字節點。 */
export function text(s) {
  return document.createTextNode(String(s ?? ''));
}

/** 清空一個節點的內容（比 innerHTML = '' 明確，也不觸發 HTML 解析）。 */
export function clear(node) {
  if (node) node.replaceChildren();
  return node;
}

/** 清空後放入新內容。 */
export function fill(node, ...kids) {
  clear(node);
  append(node, kids);
  return node;
}

/** querySelector 的簡寫。 */
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/**
 * 只允許 https 的圖片來源，優先接受 Google 頭像網域。
 * 使用者的 photoURL 來自 Google，理論上安全，但它是外部輸入，
 * 而 javascript: / data: 的 src 是真實的攻擊面。
 */
export function safeImgSrc(url) {
  if (typeof url !== 'string' || !url) return null;
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return null;
    return u.href;
  } catch {
    return null;
  }
}

/** 使用者是否要求減少動態效果。 */
export const reducedMotion = () =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/**
 * 回到頁面最上方。
 *
 * 用在「內容整批換掉」的時候——翻教學卡、進下一題、顯示成績。
 * 刻意用瞬間跳（behavior:'auto'）而不是平滑捲動：內容已經換成新的了，
 * 沒有空間連續性可以保留，平滑捲動只會讓人看著新內容緩慢移動，反而更暈。
 *
 * 注意 styles/base.css 有 `html { scroll-behavior: smooth }`，所以這裡一定要
 * 明確指定 behavior，否則會被那條規則接管。
 */
export function scrollTop() {
  try {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  } catch {
    window.scrollTo(0, 0);      // 舊瀏覽器不支援物件參數
  }
}
