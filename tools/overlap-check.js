/* Проверка вёрстки без глаз: ищет наложения текста и обрезку на всех экранах.
 *
 * Как пользоваться:
 *   1. Откройте игру в браузере и вставьте этот файл целиком в консоль.
 *   2. Пройдите игру (или дайте учителю прогнать её кнопкой «пропустить»).
 *      Детектор снимает каждый экран один раз на каждый размер окна.
 *   3. Выполните в консоли:  window.__overlapReport()
 *
 * Что считается дефектом:
 *   — два текстовых блока перекрываются больше чем на четверть меньшего;
 *   — текст лежит на иллюстрации без собственной подложки;
 *   — текст выходит за край экрана по горизонтали или срезается контейнером;
 *   — текст переполняет собственный блок (центрированный заголовок при этом
 *     остаётся в границах прямоугольника, а буквы наезжают на соседнюю колонку —
 *     именно так наложение и проскочило мимо первой версии проверки).
 * Вертикальная прокрутка дефектом не считается — на телефоне это норма.
 */

window.__report = {};

window.__probe = function probe() {
  const screen = document.querySelector('#app > .screen');
  if (!screen) return;
  const key = (document.querySelector('#app').dataset.screen || '?') +
              '@' + innerWidth + 'x' + innerHeight;
  if (window.__report[key]) return;

  const visible = (el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 4 && r.height > 4;
  };

  // текст на собственной подложке читается — это не наложение
  const onSolid = (el) => {
    let n = el;
    while (n && n !== document.body) {
      const m = getComputedStyle(n).backgroundColor.match(/[\d.]+/g);
      if (m && (m.length < 4 || +m[3] >= 0.6)) return true;
      n = n.parentElement;
    }
    return false;
  };

  const texts = [...screen.querySelectorAll('*')].filter((el) =>
    visible(el) && !el.closest('svg') &&
    [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()));
  const arts = [...screen.querySelectorAll('svg, .landing__art, .mapwrap__bg')].filter(visible);

  const box = (el) => el.getBoundingClientRect();
  const overlapArea = (a, b) => {
    const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
    const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    return w > 0 && h > 0 ? w * h : 0;
  };
  const label = (el) => el.tagName.toLowerCase() +
    (typeof el.className === 'string' && el.className
      ? '.' + el.className.trim().split(/\s+/)[0] : '');

  const textOnText = [];
  for (let i = 0; i < texts.length; i++) {
    for (let j = i + 1; j < texts.length; j++) {
      const a = texts[i], b = texts[j];
      if (a.contains(b) || b.contains(a)) continue;
      const s = overlapArea(box(a), box(b));
      const smaller = Math.min(box(a).width * box(a).height, box(b).width * box(b).height);
      if (s > smaller * 0.25) textOnText.push(`${label(a)} × ${label(b)}`);
    }
  }

  const textOnArt = [];
  for (const t of texts) {
    if (onSolid(t)) continue;
    for (const art of arts) {
      if (art.contains(t) || t.contains(art)) continue;
      const s = overlapArea(box(t), box(art));
      const own = box(t).width * box(t).height;
      if (s > own * 0.35) textOnArt.push(`${label(t)} на ${label(art)}`);
    }
  }

  // переполнение: содержимое шире или выше собственного блока
  const overflowing = texts.filter((el) => {
    const cs = getComputedStyle(el);
    if (cs.overflow === 'auto' || cs.overflow === 'scroll' ||
        cs.overflowX === 'auto' || cs.overflowX === 'scroll') return false;
    return el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0;
  }).map((el) => `${label(el)} (${el.scrollWidth}px в блоке ${el.clientWidth}px)`);

  const clipped = texts.filter((el) => {
    const r = box(el);
    if (r.left < -2 || r.right > innerWidth + 2) return true;
    let p = el.parentElement;
    while (p && p !== document.body) {
      const cs = getComputedStyle(p);
      if (cs.overflow.includes('hidden') || cs.overflowY.includes('hidden')) {
        const pr = box(p);
        if (r.bottom > pr.bottom + 2 || r.top < pr.top - 2) return true;
      }
      p = p.parentElement;
    }
    return false;
  }).map(label);

  window.__report[key] = {
    текстНаТексте: [...new Set(textOnText)].slice(0, 8),
    текстНаКартинке: [...new Set(textOnArt)].slice(0, 8),
    переполнение: [...new Set(overflowing)].slice(0, 8),
    обрезано: [...new Set(clipped)].slice(0, 8),
    горизонтальныйСкролл: document.documentElement.scrollWidth > innerWidth + 1,
  };
};

window.__overlapReport = function () {
  const rows = Object.entries(window.__report).map(([screen, r]) => {
    const bad = r.текстНаТексте.length + r.текстНаКартинке.length +
                r.переполнение.length + r.обрезано.length +
                (r.горизонтальныйСкролл ? 1 : 0);
    return [screen, bad ? r : 'чисто'];
  });
  const dirty = rows.filter(([, v]) => v !== 'чисто');
  console.log(`Проверено экранов: ${rows.length}, с замечаниями: ${dirty.length}`);
  return Object.fromEntries(rows);
};

window.__probeTimer && clearInterval(window.__probeTimer);
window.__probeTimer = setInterval(() => window.__probe(), 300);
'детектор наложений запущен: проходите игру, затем вызовите window.__overlapReport()';
