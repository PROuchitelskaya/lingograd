// Праздничные эффекты: листья, конфетти, кристаллы, буквы Хаоса (ТЗ §45).
// Один canvas на всю игру + немного DOM-анимаций. Уважает prefers-reduced-motion.

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const MOBILE = window.matchMedia('(max-width: 767px)').matches;

let canvas = null, ctx = null, raf = null;
let particles = [];
let leafMode = false;
let leafTimer = null;

const LEAF_COLORS = ['#F28C38', '#FFC94A', '#E85B5B', '#C97B2E', '#F2B441'];
const CONFETTI_COLORS = ['#3155D9', '#FFC94A', '#F28C38', '#E85B5B', '#55B77A', '#7357C8'];
const ALPHABET = 'АБВГДЕЁЖЗИКЛМНОПРСТУФХЦЧШЩЫЭЮЯ,.!?—';

function ensureCanvas() {
  if (canvas) return canvas;
  canvas = document.createElement('canvas');
  canvas.className = 'fx-canvas';
  document.body.append(canvas);
  ctx = canvas.getContext('2d');
  resize();
  window.addEventListener('resize', resize);
  return canvas;
}

function resize() {
  if (!canvas) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function loop() {
  if (!ctx) return;
  const w = window.innerWidth, h = window.innerHeight;
  ctx.clearRect(0, 0, w, h);

  particles = particles.filter((p) => {
    p.life -= 1;
    p.vy += p.gravity;
    p.vx += Math.sin((p.life + p.seed) / 18) * p.sway;
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.vr;

    if (p.y > h + 60 || p.life <= 0) return false;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.globalAlpha = p.fade ? Math.max(0, Math.min(1, p.life / 60)) : 1;

    if (p.kind === 'leaf') drawLeaf(p);
    else if (p.kind === 'letter') drawLetter(p);
    else if (p.kind === 'plane') drawPlane(p);
    else {
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    }
    ctx.restore();
    return true;
  });

  if (particles.length) raf = requestAnimationFrame(loop);
  else { raf = null; ctx.clearRect(0, 0, w, h); }
}

function drawLeaf(p) {
  ctx.fillStyle = p.color;
  ctx.beginPath();
  ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,60,10,.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-p.size, 0);
  ctx.lineTo(p.size, 0);
  ctx.stroke();
}

function drawLetter(p) {
  ctx.fillStyle = p.color;
  ctx.font = `700 ${p.size * 2}px Manrope, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(p.char, 0, 0);
}

function drawPlane(p) {
  ctx.fillStyle = p.color;
  ctx.beginPath();
  ctx.moveTo(-p.size, -p.size * 0.5);
  ctx.lineTo(p.size, 0);
  ctx.lineTo(-p.size, p.size * 0.5);
  ctx.lineTo(-p.size * 0.45, 0);
  ctx.closePath();
  ctx.fill();
}

function push(list) {
  if (REDUCED) return;
  ensureCanvas();
  const cap = MOBILE ? 140 : 320;
  particles.push(...list);
  if (particles.length > cap) particles = particles.slice(-cap);
  if (!raf) raf = requestAnimationFrame(loop);
}

function base(x, y, extra = {}) {
  return {
    x, y, vx: 0, vy: 0, gravity: 0.05, sway: 0.06, rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.16, size: 8, life: 400, seed: Math.random() * 100,
    color: '#FFC94A', fade: false, kind: 'confetti', ...extra,
  };
}

/** Осенние листья фоном — включается на праздничных экранах (ТЗ §14). */
export function leaves(on) {
  leafMode = on && !REDUCED;
  if (leafTimer) { clearInterval(leafTimer); leafTimer = null; }
  if (!leafMode) return;
  const spawn = () => {
    if (!leafMode) return;
    push([base(Math.random() * window.innerWidth, -30, {
      kind: 'leaf',
      color: LEAF_COLORS[(Math.random() * LEAF_COLORS.length) | 0],
      size: 7 + Math.random() * 9,
      vy: 0.5 + Math.random() * 0.7,
      vx: (Math.random() - 0.5) * 0.6,
      gravity: 0.006, sway: 0.05, life: 900,
    })]);
  };
  for (let i = 0; i < (MOBILE ? 4 : 8); i++) {
    setTimeout(spawn, i * 260);
  }
  leafTimer = setInterval(spawn, MOBILE ? 1400 : 750);
}

/** Бумажные самолётики (экран «1 сентября»). */
export function planes(count = 3) {
  if (REDUCED) return;
  for (let i = 0; i < count; i++) {
    setTimeout(() => push([base(-60, 80 + Math.random() * 240, {
      kind: 'plane', color: '#FFFFFF', size: 13,
      vx: 2.6 + Math.random(), vy: -0.15, gravity: 0.004, sway: 0.02,
      rot: -0.1, vr: 0.002, life: 700,
    })]), i * 900);
  }
}

export function confettiBurst(x = window.innerWidth / 2, y = window.innerHeight / 3,
                              count = MOBILE ? 50 : 90) {
  const list = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 3 + Math.random() * 7;
    list.push(base(x, y, {
      color: CONFETTI_COLORS[(Math.random() * CONFETTI_COLORS.length) | 0],
      size: 6 + Math.random() * 8,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 3,
      gravity: 0.16, sway: 0.02, life: 200, fade: true,
    }));
  }
  push(list);
}

/** Праздничный дождь конфетти сверху (финал, ТЗ §28). */
export function confettiRain(ms = 4000) {
  if (REDUCED) return;
  const started = Date.now();
  const timer = setInterval(() => {
    if (Date.now() - started > ms) return clearInterval(timer);
    const list = [];
    for (let i = 0; i < (MOBILE ? 6 : 12); i++) {
      list.push(base(Math.random() * window.innerWidth, -20, {
        color: CONFETTI_COLORS[(Math.random() * CONFETTI_COLORS.length) | 0],
        size: 6 + Math.random() * 8,
        vy: 1.6 + Math.random() * 2.4, vx: (Math.random() - 0.5) * 1.2,
        gravity: 0.03, sway: 0.05, life: 600,
      }));
    }
    push(list);
  }, 180);
}

/** Буквы разлетаются от Хаоса (ТЗ §27). */
export function letterBurst(x = window.innerWidth / 2, y = window.innerHeight / 2,
                            count = MOBILE ? 22 : 40) {
  const list = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2.5 + Math.random() * 6;
    list.push(base(x, y, {
      kind: 'letter',
      char: ALPHABET[(Math.random() * ALPHABET.length) | 0],
      color: ['#FFC94A', '#FFFFFF', '#E85B5B', '#7357C8'][(Math.random() * 4) | 0],
      size: 7 + Math.random() * 8,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 2,
      gravity: 0.12, sway: 0.03, life: 190, fade: true,
    }));
  }
  push(list);
}

/** Кристаллы летят от карточки ответа к счётчику команды (ТЗ §19). */
export function crystalsTo(fromEl, toEl, count = 6) {
  if (REDUCED || !fromEl || !toEl) return;
  const a = fromEl.getBoundingClientRect();
  const b = toEl.getBoundingClientRect();
  const x0 = a.left + a.width / 2, y0 = a.top + a.height / 2;
  const x1 = b.left + b.width / 2, y1 = b.top + b.height / 2;

  for (let i = 0; i < count; i++) {
    const dot = document.createElement('div');
    dot.className = 'fx-crystal';
    dot.textContent = '🔸';
    dot.style.left = `${x0 + (Math.random() - 0.5) * 60}px`;
    dot.style.top = `${y0 + (Math.random() - 0.5) * 40}px`;
    document.body.append(dot);
    const delay = i * 60;
    requestAnimationFrame(() => {
      setTimeout(() => {
        dot.style.transition = 'transform .62s cubic-bezier(.4,0,.2,1), opacity .62s';
        dot.style.transform =
          `translate(${x1 - x0}px, ${y1 - y0}px) scale(.5)`;
        dot.style.opacity = '0.1';
      }, delay);
    });
    setTimeout(() => dot.remove(), 900 + delay);
  }
  setTimeout(() => toEl.classList.add('is-bumped'), 620);
  setTimeout(() => toEl.classList.remove('is-bumped'), 1100);
}

export function shake(el) {
  if (!el || REDUCED) return;
  el.classList.remove('is-shake');
  void el.offsetWidth;
  el.classList.add('is-shake');
  setTimeout(() => el.classList.remove('is-shake'), 600);
}

export function flash(color = 'rgba(255,255,255,.55)') {
  if (REDUCED) return;
  const div = document.createElement('div');
  div.className = 'fx-flash';
  div.style.background = color;
  document.body.append(div);
  setTimeout(() => div.remove(), 420);
}

export function stopAll() {
  leaves(false);
  particles = [];
}
