// Микро-DOM: без фреймворков и сборки — школьный ноутбук должен открыть игру мгновенно.

export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') {
      el.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (k === 'dataset') Object.assign(el.dataset, v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat(3)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

export function mount(node, ...children) {
  clear(node);
  node.append(...children.flat(3).filter(Boolean));
  return node;
}

/** мм:сс */
export function mmss(ms) {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function plural(n, one, few, many) {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

export const players = (n) => `${n} ${plural(n, 'игрок', 'игрока', 'игроков')}`;
export const crystals = (n) => `${n} ${plural(n, 'кристалл', 'кристалла', 'кристаллов')}`;

export function letterOf(i) {
  return ['А', 'Б', 'В', 'Г', 'Д', 'Е'][i] || String(i + 1);
}

/** Кнопка-основное-действие: на каждом экране она одна (ТЗ §50). */
export function primaryButton(label, onClick, opts = {}) {
  return h('button', {
    class: `btn btn--primary ${opts.class || ''}`,
    onClick,
    disabled: opts.disabled,
    id: opts.id,
    type: 'button',
  }, label);
}

export function ghostButton(label, onClick, opts = {}) {
  return h('button', {
    class: `btn btn--ghost ${opts.class || ''}`, onClick, type: 'button',
    disabled: opts.disabled,
  }, label);
}

/** Плавная смена экрана: старый уезжает, новый появляется (ТЗ §45). */
export function swapScreen(root, node, key) {
  node.classList.add('screen-enter');
  mount(root, node);
  root.dataset.screen = key || '';
  requestAnimationFrame(() => node.classList.remove('screen-enter'));
  return node;
}

export function toast(message, kind = 'info') {
  let box = document.getElementById('toasts');
  if (!box) {
    box = h('div', { id: 'toasts', class: 'toasts' });
    document.body.append(box);
  }
  const t = h('div', { class: `toast toast--${kind}` }, message);
  box.append(t);
  setTimeout(() => t.classList.add('toast--out'), 2600);
  setTimeout(() => t.remove(), 3100);
}

/** Счётчик кристаллов, который «догоняет» новое значение. */
export function animateNumber(node, from, to, ms = 700) {
  const start = performance.now();
  const step = (now) => {
    const p = Math.min(1, (now - start) / ms);
    const eased = 1 - Math.pow(1 - p, 3);
    node.textContent = Math.round(from + (to - from) * eased);
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export function shuffled(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function saveLocal(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* приватный режим */ }
}

export function readLocal(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}
