// Карточка задания. Девять типов из ТЗ §38, все — с крупными зонами нажатия,
// без hover-механики: 70% игроков сидят в телефоне (ТЗ §31).

import { h, letterOf, mount } from './ui.js';
import { sfx } from './audio.js';

/**
 * @returns {{node: HTMLElement, lock(): void, unlock(): void, showResult(res): void}}
 */
export function buildQuestion(q, { onSubmit }) {
  let payload = null;
  let locked = false;

  const submitBtn = h('button', {
    class: 'btn btn--primary q-submit', type: 'button', disabled: true,
    onClick: () => fire(),
  }, 'ОТВЕТИТЬ');

  const feedback = h('div', { class: 'q-feedback', role: 'status', 'aria-live': 'polite' });
  const body = h('div', { class: 'q-body' });

  function setPayload(value, { instant = false } = {}) {
    payload = value;
    const ready = value !== null && value !== undefined &&
      !(Array.isArray(value) && value.length === 0) &&
      !(typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0) &&
      !(typeof value === 'string' && !value.trim());
    submitBtn.disabled = locked || !ready;
    if (instant && ready) fire();
  }

  function fire() {
    if (locked || payload === null || payload === undefined) return;
    locked = true;
    submitBtn.disabled = true;
    node.classList.add('is-answered');
    onSubmit(payload);
  }

  // ------------------------------------------------------------ типы

  const needsButton = !['single_choice', 'true_false'].includes(q.type);

  if (q.type === 'single_choice') {
    const cards = q.answers.map((text, i) => h('button', {
      class: 'answer', type: 'button', dataset: { index: i },
      onClick: (e) => {
        if (locked) return;
        sfx.select();
        body.querySelectorAll('.answer').forEach((c) => c.classList.remove('is-picked'));
        e.currentTarget.classList.add('is-picked');
        setPayload(i, { instant: true });
      },
    },
      h('span', { class: 'answer__letter' }, letterOf(i)),
      h('span', { class: 'answer__text' }, text),
    ));
    mount(body, h('div', { class: 'answers answers--grid' }, cards));
  }

  else if (q.type === 'true_false') {
    const opts = [
      { label: 'ВЕРНО', icon: '✓', value: true, cls: 'answer--yes' },
      { label: 'НЕВЕРНО', icon: '✕', value: false, cls: 'answer--no' },
    ];
    mount(body, h('div', { class: 'answers answers--duo' },
      opts.map((o, i) => h('button', {
        class: `answer ${o.cls}`, type: 'button', dataset: { index: i },
        onClick: (e) => {
          if (locked) return;
          sfx.select();
          body.querySelectorAll('.answer').forEach((c) => c.classList.remove('is-picked'));
          e.currentTarget.classList.add('is-picked');
          setPayload(o.value, { instant: true });
        },
      }, h('span', { class: 'answer__icon' }, o.icon), h('span', { class: 'answer__text' }, o.label)))));
  }

  else if (q.type === 'multiple_choice') {
    const picked = new Set();
    mount(body,
      h('p', { class: 'q-tip' }, 'Можно выбрать несколько вариантов'),
      h('div', { class: 'answers answers--grid' },
        q.answers.map((text, i) => h('button', {
          class: 'answer answer--multi', type: 'button',
          onClick: (e) => {
            if (locked) return;
            sfx.select();
            picked.has(i) ? picked.delete(i) : picked.add(i);
            e.currentTarget.classList.toggle('is-picked', picked.has(i));
            setPayload([...picked]);
          },
        },
          h('span', { class: 'answer__check' }, '✓'),
          h('span', { class: 'answer__text' }, text)))));
  }

  else if (q.type === 'sort') {
    let order = q.items.map((_, i) => i);
    const list = h('ol', { class: 'sortable' });

    const redraw = () => {
      mount(list, order.map((itemIndex, pos) => h('li', { class: 'sortable__row' },
        h('span', { class: 'sortable__num' }, pos + 1),
        h('span', { class: 'sortable__text' }, q.items[itemIndex]),
        h('span', { class: 'sortable__ctrl' },
          h('button', {
            class: 'iconbtn', type: 'button', 'aria-label': 'Выше', disabled: pos === 0 || locked,
            onClick: () => move(pos, -1),
          }, '↑'),
          h('button', {
            class: 'iconbtn', type: 'button', 'aria-label': 'Ниже',
            disabled: pos === order.length - 1 || locked,
            onClick: () => move(pos, +1),
          }, '↓')))));
      setPayload([...order]);
    };

    const move = (pos, dir) => {
      const next = pos + dir;
      if (next < 0 || next >= order.length) return;
      [order[pos], order[next]] = [order[next], order[pos]];
      sfx.select();
      redraw();
    };

    mount(body, h('p', { class: 'q-tip' }, q.sort_hint || 'Расставьте по порядку'), list);
    redraw();
  }

  else if (q.type === 'match') {
    const links = {};             // leftIndex -> rightIndex
    let activeLeft = null;
    const COLORS = ['#3155D9', '#F28C38', '#55B77A', '#7357C8', '#E85B5B', '#20243A'];
    const leftCol = h('div', { class: 'match__col' });
    const rightCol = h('div', { class: 'match__col' });

    const redraw = () => {
      mount(leftCol, q.left.map((text, i) => {
        const linked = links[i] !== undefined;
        return h('button', {
          class: `match__item ${activeLeft === i ? 'is-active' : ''} ${linked ? 'is-linked' : ''}`,
          type: 'button',
          style: linked ? { borderColor: COLORS[i % COLORS.length] } : {},
          onClick: () => {
            if (locked) return;
            sfx.select();
            if (linked) delete links[i];
            activeLeft = activeLeft === i ? null : i;
            redraw();
          },
        },
          linked ? h('span', { class: 'match__dot', style: { background: COLORS[i % COLORS.length] } }) : null,
          text);
      }));

      mount(rightCol, q.right.map((text, j) => {
        const owner = Object.keys(links).find((k) => links[k] === j);
        return h('button', {
          class: `match__item ${owner !== undefined ? 'is-linked' : ''}`, type: 'button',
          style: owner !== undefined ? { borderColor: COLORS[owner % COLORS.length] } : {},
          onClick: () => {
            if (locked) return;
            if (owner !== undefined) { delete links[owner]; return redraw(); }
            if (activeLeft === null) return;
            sfx.select();
            links[activeLeft] = j;
            activeLeft = null;
            redraw();
          },
        },
          owner !== undefined ? h('span', { class: 'match__dot', style: { background: COLORS[owner % COLORS.length] } }) : null,
          text);
      }));

      setPayload(Object.keys(links).length ? { ...links } : null);
    };

    mount(body,
      h('p', { class: 'q-tip' }, 'Нажмите слева, затем справа — получится пара'),
      h('div', { class: 'match' }, leftCol, rightCol));
    redraw();
  }

  else if (q.type === 'text_input') {
    const input = h('input', {
      class: 'q-input', type: 'text', autocomplete: 'off', autocapitalize: 'off',
      spellcheck: 'false', placeholder: q.placeholder || 'Введите ответ',
      onInput: (e) => setPayload(e.target.value),
      onKeydown: (e) => { if (e.key === 'Enter') fire(); },
    });
    mount(body, input);
    setTimeout(() => input.focus({ preventScroll: true }), 120);
  }

  else if (q.type === 'punctuation') {
    const commas = new Set();
    const line = h('div', { class: 'punct' });

    const redraw = () => {
      mount(line, q.tokens.flatMap((tok, i) => {
        const parts = [h('span', { class: 'punct__word' }, tok)];
        if (i < q.tokens.length - 1 || true) {
          parts.push(h('button', {
            class: `punct__gap ${commas.has(i) ? 'is-on' : ''}`, type: 'button',
            'aria-label': commas.has(i) ? 'Убрать запятую' : 'Поставить запятую',
            onClick: () => {
              if (locked) return;
              sfx.select();
              commas.has(i) ? commas.delete(i) : commas.add(i);
              redraw();
            },
          }, commas.has(i) ? ',' : ''));
        }
        return parts;
      }));
      setPayload([...commas].sort((a, b) => a - b));
    };

    mount(body,
      h('p', { class: 'q-tip' }, 'Нажимайте на промежутки, чтобы поставить запятую'),
      line);
    redraw();
    setPayload([]);               // пустой набор запятых — тоже ответ
    submitBtn.disabled = false;
  }

  else if (q.type === 'word_build') {
    const used = [];
    const slots = h('div', { class: 'build__slots' });
    const pool = h('div', { class: 'build__pool' });

    const redraw = () => {
      mount(slots, used.length
        ? used.map((li, pos) => h('button', {
            class: 'tile tile--slot', type: 'button',
            onClick: () => { if (locked) return; used.splice(pos, 1); sfx.select(); redraw(); },
          }, q.letters[li]))
        : h('span', { class: 'build__empty' }, 'Нажимайте на буквы'));

      mount(pool, q.letters.map((ch, i) => h('button', {
        class: `tile ${used.includes(i) ? 'is-used' : ''}`, type: 'button',
        disabled: used.includes(i) || locked,
        onClick: () => { if (locked) return; used.push(i); sfx.select(); redraw(); },
      }, ch)));

      setPayload(used.map((i) => q.letters[i]).join(''));
    };

    mount(body, slots, pool,
      h('button', {
        class: 'btn btn--ghost btn--small', type: 'button',
        onClick: () => { if (locked) return; used.length = 0; redraw(); },
      }, 'Стереть'));
    redraw();
  }

  else if (q.type === 'highlight') {
    const picked = new Set();
    const multi = !!q.multi;
    const line = h('div', { class: 'tokens' });

    const redraw = () => {
      mount(line, q.tokens.map((tok, i) => h('button', {
        class: `token ${picked.has(i) ? 'is-picked' : ''}`, type: 'button',
        onClick: () => {
          if (locked) return;
          sfx.select();
          if (!multi) picked.clear();
          picked.has(i) ? picked.delete(i) : picked.add(i);
          redraw();
        },
      }, tok)));
      setPayload(picked.size ? [...picked].sort((a, b) => a - b) : null);
    };

    mount(body,
      h('p', { class: 'q-tip' }, multi ? 'Выберите все подходящие слова' : 'Выберите одно слово'),
      line);
    redraw();
  }

  // ------------------------------------------------------------ каркас

  const node = h('div', { class: `q-card q-card--${q.type}` },
    h('div', { class: 'q-card__head' },
      h('span', { class: 'q-card__topic' }, q.topic || ''),
      h('span', { class: 'q-card__points' }, `+${q.points}`)),
    h('h2', { class: 'q-card__question' }, q.question),
    q.text ? h('p', { class: 'q-card__text' }, q.text) : null,
    body,
    feedback,
    needsButton ? submitBtn : null,
  );

  return {
    node,
    lock() { locked = true; submitBtn.disabled = true; },
    unlock() { locked = false; node.classList.remove('is-answered'); },
    /** Ответ сервера: правильно / почти / без попыток. */
    showResult(res) {
      if (res.correct) {
        node.classList.add('is-correct');
        mount(feedback, h('div', { class: 'verdict verdict--ok' },
          h('span', { class: 'verdict__mark' }, '✓'),
          h('span', null, `ПРАВИЛЬНО  +${res.points} кристаллов`)));
        return;
      }
      if (res.attempts_left > 0) {
        locked = false;
        node.classList.remove('is-answered');
        node.classList.add('is-shake');
        setTimeout(() => node.classList.remove('is-shake'), 600);
        mount(feedback, h('div', { class: 'verdict verdict--try' },
          h('span', { class: 'verdict__mark' }, '↻'),
          h('span', null, `Почти! Попробуйте ещё раз${res.hint ? '. ' + res.hint : ''}`)));
        body.querySelectorAll('.is-picked').forEach((n) => n.classList.remove('is-picked'));
        submitBtn.disabled = payload === null;
        return;
      }
      node.classList.add('is-wrong');
      mount(feedback, h('div', { class: 'verdict verdict--no' },
        h('span', { class: 'verdict__mark' }, '⚠'),
        h('span', null, 'ОШИБКА. Правильный ответ покажем всем вместе')));
    },
  };
}

/** Блок «правильный ответ + объяснение» для фазы reveal. */
export function revealBlock(reveal) {
  return h('div', { class: 'reveal' },
    h('div', { class: 'reveal__label' }, '✓ ПРАВИЛЬНЫЙ ОТВЕТ'),
    h('div', { class: 'reveal__answer' }, reveal.correct_text || ''),
    reveal.explanation ? h('p', { class: 'reveal__why' }, reveal.explanation) : null,
    h('div', { class: 'reveal__stat' },
      `Ответили верно: ${reveal.correct} из ${reveal.answered}`));
}
