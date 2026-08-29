// Экран учителя: создать игру за две минуты, вести её и разобрать результаты
// (ТЗ §11–12, §43, §51). Всё на одном экране — проектор показывает то же, что класс.

import { h, mount, mmss, swapScreen, primaryButton, ghostButton, toast,
         readLocal, saveLocal, players, letterOf } from './ui.js';
import * as net from './net.js';
import * as fx from './fx.js';
import { toSVG } from './qr.js';
import { chaosVillain, chaosTower, cityMap, schoolBell, knowledgeDay, zoneBg,
         districtIcon, teamDot, keeper } from './art.js';

const root = document.getElementById('app');
let state = null;
let session = readLocal('lg_teacher', null);
let screenKey = '';

export function startTeacher() {
  wireNet();
  if (session?.code && session?.teacher_token) {
    connect(session);
  } else {
    renderSetup();
  }
  setInterval(updateTimers, 250);
}

function wireNet() {
  net.on('state', (msg) => { state = msg; render(); });
  net.on('tick', (msg) => {
    if (!state) return;
    Object.assign(state, {
      phase_deadline: msg.phase_deadline, session_left: msg.session_left,
      answered: msg.answered, online: msg.online,
    });
    updateTimers();
    updateLive();
  });
  net.on('scores', (msg) => {
    if (!state) return;
    state.teams = msg.teams;
    state.answered = msg.answered;
    state.chaos_hp = msg.chaos_hp;
    updateLive();
  });
  net.on('bell', () => toast('Прозвенел звонок — время урока вышло', 'warn'));
  net.on('error', (msg) => {
    toast(msg.message || 'Ошибка', 'error');
    if (msg.code === 'no_session' || msg.code === 'bad_token') {
      saveLocal('lg_teacher', null);
      session = null;
      renderSetup();
    }
  });
  net.on('status', (s) => {
    const banner = document.getElementById('netbanner');
    if (banner) banner.hidden = (s === 'connected' || s === 'idle');
  });
}

function connect(s) {
  net.connect({ code: s.code, role: 'teacher', token: s.teacher_token });
}

// ---------------------------------------------------------------- создание

function renderSetup() {
  screenKey = 'setup';
  let grade = 5, teams = 4, duration = 45, mode = 'september';

  const chips = (name, values, current, onPick, format = (v) => v) =>
    h('div', { class: 'chips', role: 'group', 'aria-label': name },
      values.map((v) => h('button', {
        class: `chip chip--pick ${v === current ? 'is-on' : ''}`, type: 'button',
        onClick: (e) => {
          [...e.currentTarget.parentElement.children].forEach((c) => c.classList.remove('is-on'));
          e.currentTarget.classList.add('is-on');
          onPick(v);
        },
      }, format(v))));

  const node = h('div', { class: 'screen screen--setup' },
    h('div', { class: 'card card--setup' },
      h('div', { class: 'badge badge--fest' }, '🎒 СПЕЦВЫПУСК К 1 СЕНТЯБРЯ'),
      h('h1', { class: 'h1' }, 'Новая игра в Лингограде'),
      h('p', { class: 'muted' }, 'Соберите сессию за минуту — код появится сразу.'),

      h('label', { class: 'field-label' }, 'Класс'),
      chips('Класс', [5, 6, 7, 8, 9, 10, 11], grade, (v) => (grade = v), (v) => `${v}`),

      h('label', { class: 'field-label' }, 'Количество команд'),
      chips('Команды', [4, 5, 6], teams, (v) => (teams = v)),

      h('label', { class: 'field-label' }, 'Продолжительность'),
      chips('Минуты', [30, 45, 60], duration, (v) => (duration = v), (v) => `${v} мин`),

      h('label', { class: 'field-label' }, 'Режим'),
      h('div', { class: 'chips' },
        [['september', 'Праздничный 1 сентября'], ['normal', 'Обычный']].map(([v, label]) =>
          h('button', {
            class: `chip chip--pick ${v === mode ? 'is-on' : ''}`, type: 'button',
            onClick: (e) => {
              [...e.currentTarget.parentElement.children].forEach((c) => c.classList.remove('is-on'));
              e.currentTarget.classList.add('is-on');
              mode = v;
            },
          }, label))),

      primaryButton('СОЗДАТЬ ИГРУ', async (e) => {
        e.currentTarget.disabled = true;
        e.currentTarget.textContent = 'Создаём…';
        try {
          const res = await fetch('/api/session', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ grade, teams, duration, mode }),
          });
          if (!res.ok) throw new Error(await res.text());
          const data = await res.json();
          session = data;
          saveLocal('lg_teacher', data);
          connect(data);
        } catch (err) {
          toast('Не удалось создать игру: ' + err.message, 'error');
          e.currentTarget.disabled = false;
          e.currentTarget.textContent = 'СОЗДАТЬ ИГРУ';
        }
      }),
      h('p', { class: 'hint' }, 'Ученики заходят на этот же адрес и вводят код')),
  );
  fx.leaves(true);
  swapScreen(root, node, 'setup');
}

// ---------------------------------------------------------------- рендер

function render() {
  if (!state) return;
  state._at = Date.now();
  // online в ключ не входит: иначе проекционный экран с QR-кодом полностью
  // перерисовывался бы при входе каждого ученика — как раз когда его сканируют
  const key = [state.phase, state.mission?.index,
               state.phase === 'question' ? state.question?.id : '',
               state.paused ? 'pause' : ''].join('|');
  if (key === screenKey) { updateLive(); return; }
  screenKey = key;

  if (state.phase === 'lobby') return renderConnect();
  if (state.phase === 'results' || state.phase === 'awards') return renderFinal();
  return renderLive();
}

function updateTimers() {
  const clock = document.getElementById('t-clock');
  if (clock && state) {
    clock.textContent = mmss(state.session_left);
    const ratio = state.session_left / (state.duration_min * 60_000);
    clock.classList.toggle('is-warn', ratio <= 0.2 && ratio > 0.1);
    clock.classList.toggle('is-danger', ratio <= 0.1);
  }
  const qc = document.getElementById('t-qtime');
  if (qc && state?.phase === 'question') {
    qc.textContent = `${Math.max(0, Math.ceil((state.phase_deadline - net.serverNow()) / 1000))} с`;
  }
}

function updateLive() {
  const board = document.getElementById('t-board');
  if (board && state) mount(board, boardRows(state.phase === 'lobby'));
  const online = document.getElementById('t-online');
  if (online && state) online.textContent = players(state.online);
  const roster = document.getElementById('t-players');
  if (roster && state) {
    mount(roster, (state.players || []).map((p) => h('span', {
      class: `pill ${p.connected ? '' : 'is-off'}`,
    }, p.name)));
  }
  const startBtn = document.getElementById('t-start');
  if (startBtn && state) startBtn.disabled = state.online === 0;
  const counter = document.getElementById('t-answered');
  if (counter && state) {
    counter.textContent = `${state.answered || 0} из ${state.online || 0}`;
    const bar = document.getElementById('t-answered-bar');
    if (bar) bar.style.width = `${state.online ? (state.answered / state.online) * 100 : 0}%`;
  }
  const hp = document.getElementById('t-hp');
  if (hp) hp.style.width = `${state.chaos_hp}%`;
}

/** Таблица команд. До начала игры счёт у всех нулевой и только сбивает с толку,
 *  поэтому в лобби показываем не кристаллы, а состав команды. */
function boardRows(lobby = false) {
  if (lobby) {
    return state.teams.map((t) => h('div', { class: 'tboard__row tboard__row--lobby' },
      h('span', { class: 'tboard__emoji', html: teamDot(t.color) }),
      h('span', { class: 'tboard__name' }, t.name),
      h('span', { class: 'tboard__who' },
        t.members ? players(t.members) : 'пока никого')));
  }
  const max = Math.max(1, ...state.teams.map((t) => t.score));
  return state.teams.map((t) => h('div', { class: 'tboard__row' },
    h('span', { class: 'tboard__emoji', html: teamDot(t.color) }),
    h('span', { class: 'tboard__name' }, t.name),
    h('span', { class: 'tboard__bar' },
      h('span', { class: 'tboard__fill', style: { width: `${(t.score / max) * 100}%`, background: t.color } })),
    h('span', { class: 'tboard__score', title: 'кристаллы' }, t.score),
    h('span', { class: 'tboard__members', title: 'игроков в команде' }, `${t.members}`)));
}

// --- экран подключения ----------------------------------------------------

/** Адрес для входа учеников — он же в QR-коде на всех экранах. */
function joinUrl() {
  return session?.join_url || `${location.origin}/?c=${state.code}`;
}

function renderConnect() {
  const url = joinUrl();
  const node = h('div', { class: 'screen screen--connect' },
    h('div', { class: 'connect' },
      h('div', { class: 'connect__left' },
        h('h1', { class: 'display' }, 'ПОДКЛЮЧАЙТЕСЬ'),
        h('div', { class: 'qr', html: toSVG(url, { size: 300 }) }),
        h('div', { class: 'connect__code' },
          h('span', { class: 'connect__code-label' }, 'КОД:'),
          h('span', { class: 'connect__code-value' }, state.code)),
        h('p', { class: 'muted' }, 'Откройте игру на телефоне и введите код'),
        h('p', { class: 'connect__url' }, url)),

      h('div', { class: 'connect__right' },
        h('div', { class: 'connect__stat' },
          h('span', { class: 'dot dot--on' }),
          h('span', { class: 'connect__count', id: 't-online' }, players(state.online)),
          h('span', { class: 'muted' }, 'подключились')),
        h('div', { class: 'tboard', id: 't-board' }, boardRows(true)),
        h('div', { class: 'connect__players', id: 't-players' },
          (state.players || []).map((p) => h('span', {
            class: `pill ${p.connected ? '' : 'is-off'}`,
          }, p.name))),
        h('div', { class: 'connect__meta' },
          h('span', { class: 'chip' }, `${state.grade} класс`),
          h('span', { class: 'chip' }, `${state.total_questions} заданий`),
          h('span', { class: 'chip' }, `${state.duration_min} минут`),
          h('span', { class: 'chip' }, state.mode === 'september' ? 'Праздничный режим' : 'Обычный режим')),
        primaryButton('НАЧАТЬ ИГРУ', () => {
          net.send({ t: 'teacher', action: 'start' });
        }, { disabled: state.online === 0, class: 't-start', id: 't-start' }),
        state.online === 0 ? h('p', { class: 'hint' }, 'Ждём первых игроков…') : null,
        ghostButton('Новая игра', () => {
          saveLocal('lg_teacher', null); session = null; net.close(); renderSetup();
        }))),
  );
  fx.leaves(true);
  swapScreen(root, node, 'connect');
}

// --- ведение игры ---------------------------------------------------------

/** То же, что видят ученики: варианты, карточки, буквы, промежутки.
 *  Раньше на проекторе оставалась одна формулировка, и класс, у которого
 *  задание уже на телефонах, не понимал, о чём речь. Ключ не показываем —
 *  он остаётся под кнопкой «Показать ответ». */
function teacherBody(q, answer) {
  const right = (i) => answer && (answer.correct_index === i ||
    (Array.isArray(answer.correct_index) && answer.correct_index.includes(i)));

  if (q.answers) {
    // те же хранители, что держат варианты на телефонах: класс должен
    // узнавать «свою» карточку на проекторе с первого взгляда
    const tf = q.type === 'true_false';
    return h('div', { class: `teacherq__answers ${tf ? 'teacherq__answers--duo' : ''}` },
      q.answers.map((a, i) => h('div', {
        class: `teacherq__answer ${right(i) ? 'is-right' : ''}`,
      },
        h('span', { class: 'teacherq__keeper',
                    html: tf ? keeper(i === 0 ? 2 : 4, i === 0 ? '✓' : '✕')
                             : keeper(i, letterOf(i)) }),
        h('span', { class: 'teacherq__atext' }, a))));
  }

  if (q.type === 'sort' && q.items) {
    return h('ol', { class: 'tq-list' },
      q.items.map((it, i) => h('li', { class: 'tq-list__row' },
        h('span', { class: 'tq-list__num' }, i + 1),
        h('span', null, it))));
  }

  if (q.type === 'match' && q.left) {
    return h('div', { class: 'tq-match' },
      h('div', { class: 'tq-match__col' },
        q.left.map((t, i) => h('div', { class: 'tq-match__item' }, `${i + 1}. ${t}`))),
      h('div', { class: 'tq-match__col' },
        (q.right || []).map((t, i) => h('div', { class: 'tq-match__item' },
          `${'АБВГДЕ'[i] || i + 1}. ${t}`))));
  }

  if (q.type === 'punctuation' && q.tokens) {
    return h('div', { class: 'tq-punct' },
      q.tokens.map((w, i) => [
        h('span', { class: 'tq-punct__word' }, w),
        i < q.tokens.length - 1 ? h('span', { class: 'tq-punct__gap' }, i + 1) : null,
      ]));
  }

  if (q.type === 'highlight' && q.tokens) {
    return h('div', { class: 'tq-tokens' },
      q.tokens.map((w) => h('span', { class: 'tq-token' }, w)));
  }

  if (q.type === 'word_build' && q.letters) {
    return h('div', { class: 'tq-tokens' },
      q.letters.map((l) => h('span', { class: 'tq-token tq-token--letter' }, l)));
  }

  if (q.type === 'text_input') {
    return h('div', { class: 'tq-input' }, q.placeholder || 'Ученики вводят ответ с телефона');
  }

  return null;
}

/** Заставки между заданиями — те же, что у класса на телефонах.
 *  Нужны, чтобы играть можно было и без телефонов: с одного проектора. */
function teacherPhase(m, phaseLabel) {
  const p = state.phase;

  if (p === 'september') {
    return h('div', { class: 'teacherq teacherq--phase' },
      h('div', { class: 'sept__card', html: knowledgeDay() }),
      h('p', { class: 'lead' }, 'Новый учебный год начинается прямо сейчас.'),
      h('p', { class: 'lead lead--dim' }, 'Но в Лингограде что-то пошло не так…'));
  }

  if (p === 'story') {
    const lines = [
      'Ха-ха! С первым сентября, ученики!',
      'Я решил немного изменить школьные правила.',
      'Буквы перепутаны. Запятые разбежались. Окончания исчезли.',
      'Если вы хотите спасти Лингоград — попробуйте!',
    ];
    const box = h('div', { class: 'story__lines' });
    lines.forEach((line, i) => setTimeout(() => {
      box.append(h('p', { class: 'story__line' }, line));
    }, 900 + i * 1500));
    return h('div', { class: 'teacherq teacherq--story' },
      h('div', { class: 'story__villain', html: chaosVillain() }),
      h('div', { class: 'story__text' },
        h('div', { class: 'story__name' }, 'ХАОС'),
        box));
  }

  if (p === 'map') {
    return h('div', { class: 'teacherq teacherq--map' },
      h('div', { class: 'mapwrap' },
        h('div', { class: 'mapwrap__bg', html: cityMap() }),
        h('div', { class: 'mapnodes' },
          (state.map || []).map((node, i) => h('div', {
            class: `mapnode mapnode--${node.state} mapnode--${i}`,
          },
            h('span', { class: 'mapnode__icon', html: districtIcon(node.district) }),
            h('span', { class: 'mapnode__title' }, node.title),
            h('span', { class: 'mapnode__state' },
              node.state === 'done' ? '✓ восстановлен'
                : node.state === 'active' ? 'следующая цель' : 'закрыт'))))),
      h('div', { class: 'mapfoot' },
        h('span', { class: 'chip' }, `Следующая миссия: ${m.title}`)));
  }

  if (p === 'mission_intro') {
    return h('div', { class: 'teacherq teacherq--intro' },
      h('div', { class: 'intro' },
        h('div', { class: 'intro__icon', html: districtIcon(m.district) }),
        h('div', { class: 'intro__label' }, `МИССИЯ ${m.index + 1} ИЗ ${m.of}`),
        h('h1', { class: 'display' }, m.title),
        h('p', { class: 'lead' }, m.subtitle),
        h('p', { class: 'muted muted--center' }, m.brief),
        h('div', { class: 'intro__meta' },
          h('span', { class: 'chip' }, `${m.questions} заданий`),
          h('span', { class: 'chip' }, m.district === 'tower'
            ? 'Финальная битва' : 'Работаем командой'))));
  }

  if (p === 'mission_complete') {
    const rep = state.mission_report || {};
    return h('div', { class: 'teacherq teacherq--phase' },
      h('div', { class: 'done' },
        h('div', { class: 'done__icon', html: districtIcon('done') }),
        h('h1', { class: 'display' }, 'РАЙОН ВОССТАНОВЛЕН'),
        h('p', { class: 'lead' }, rep.title || ''),
        h('div', { class: 'done__progress' },
          `${rep.restored || 1} из ${rep.of || 5} районов Лингограда снова светятся`),
        h('div', { class: 'board' },
          (rep.teams || []).map((t, i) => h('div', { class: 'board__row' },
            h('span', { class: 'board__place' }, i + 1),
            h('span', { class: 'board__emoji', html: teamDot(t.color) }),
            h('span', { class: 'board__name' }, t.name),
            h('span', { class: 'board__score' }, t.score))))));
  }

  if (p === 'victory') {
    return h('div', { class: 'teacherq teacherq--phase' },
      h('div', { class: 'victory__bell', html: schoolBell() }),
      h('h1', { class: 'display display--gold' }, 'ЛИНГОГРАД СПАСЁН! 🎉'),
      h('p', { class: 'lead' }, 'Первый урок нового учебного года начинается с победы!'),
      h('div', { class: 'victory__title' }, 'ВЫ — ХРАНИТЕЛИ ЯЗЫКА'),
      h('div', { class: 'victory__letters' },
        [...'ЛИНГОГРАД'].map((ch, i) => h('span', {
          class: 'victory__letter', style: { animationDelay: `${i * 90}ms` },
        }, ch))));
  }

  if (p === 'reveal') {
    const r = state.reveal || {};
    return h('div', { class: 'teacherq teacherq--phase' },
      m.district === 'tower' ? h('div', { class: 'teacherq__art', html: chaosTower(state.chaos_hp) }) : null,
      h('div', { class: 'reveal reveal--teacher' },
        h('div', { class: 'reveal__label' }, '✓ ПРАВИЛЬНЫЙ ОТВЕТ'),
        h('div', { class: 'reveal__answer' }, r.correct_text || '—'),
        r.explanation ? h('p', { class: 'reveal__why' }, r.explanation) : null,
        h('div', { class: 'reveal__stat' },
          `Ответили верно: ${r.correct || 0} из ${r.answered || 0}`)));
  }

  return h('div', { class: 'teacherq teacherq--phase' },
    h('h1', { class: 'display' }, phaseLabel),
    h('p', { class: 'lead' }, m.subtitle));
}

function renderLive() {
  const m = state.mission;
  const phaseLabel = {
    september: 'Экран «1 сентября»', story: 'Появление Хаоса', map: 'Карта Лингограда',
    mission_intro: 'Заставка миссии', question: 'Задание', reveal: 'Разбор ответа',
    mission_complete: 'Район восстановлен', victory: 'Победа',
  }[state.phase] || state.phase;

  const q = state.question;
  // Экран учителя — это проектор: показывать ключ во время задания нельзя
  // (ТЗ §42), поэтому в фазе вопроса он скрыт до нажатия «Показать ответ».
  const answer = state.phase === 'reveal' ? state.teacher_answer : null;
  const hidden = state.phase === 'question' ? state.teacher_answer : null;

  const node = h('div', { class: `screen screen--live ${m.zone}` },
    h('div', { class: 'zonebg', html: zoneBg(m.district) }),
    h('header', { class: 'livebar' },
      h('div', { class: 'livebar__brand' }, 'ЛИНГОГРАД'),
      h('div', { class: 'livebar__phase' },
        h('span', { class: 'livebar__icon', html: districtIcon(m.district) }),
        h('span', null, `${m.title} · ${phaseLabel}`)),
      h('div', { class: 'livebar__clock', id: 't-clock' }, mmss(state.session_left))),

    h('div', { class: 'live' },
      h('div', { class: 'live__main' },
        state.phase === 'question' && q
          ? h('div', { class: 'teacherq' },
              h('div', { class: 'teacherq__head' },
                h('span', { class: 'chip' }, `ЗАДАНИЕ ${state.global_index} из ${state.total_questions}`),
                h('span', { class: 'chip chip--time', id: 't-qtime' }, `${q.time_limit} с`),
                h('span', { class: 'chip' }, q.topic || '')),
              h('h1', { class: 'teacherq__question' }, q.question),
              q.text ? h('p', { class: 'teacherq__text' }, q.text) : null,
              teacherBody(q, answer),
              state.paused ? h('div', { class: 'teacherq__paused' }, '⏸ ПАУЗА — время остановлено') : null,
              answer ? h('div', { class: 'teacherq__key' },
                h('strong', null, 'Ответ: '), answer.correct_text || '—',
                answer.explanation ? h('p', { class: 'teacherq__why' }, answer.explanation) : null) : null,
              hidden ? h('button', {
                class: 'btn btn--ghost btn--small', type: 'button',
                onClick: (e) => {
                  const box = e.currentTarget.nextElementSibling;
                  box.hidden = !box.hidden;
                  e.currentTarget.textContent = box.hidden ? '👁 Показать ответ' : '🙈 Скрыть ответ';
                },
              }, '👁 Показать ответ') : null,
              hidden ? h('div', { class: 'teacherq__key', hidden: true },
                h('strong', null, 'Ответ: '), hidden.correct_text || '—',
                hidden.explanation ? h('p', { class: 'teacherq__why' }, hidden.explanation) : null) : null,
              h('div', { class: 'answered' },
                h('div', { class: 'answered__label' },
                  'Ответили: ', h('b', { id: 't-answered' },
                    `${state.answered || 0} из ${state.online || 0}`)),
                h('div', { class: 'answered__track' },
                  h('span', { class: 'answered__fill', id: 't-answered-bar' }))))
          : teacherPhase(m, phaseLabel),

        m.district === 'tower' ? h('div', { class: 'chaosbar chaosbar--teacher' },
          h('div', { class: 'chaosbar__label' }, '❤️ ЭНЕРГИЯ ХАОСА'),
          h('div', { class: 'chaosbar__track' },
            h('span', { class: 'chaosbar__fill', id: 't-hp',
                        style: { width: `${state.chaos_hp}%` } }))) : null),

      h('aside', { class: 'live__side' },
        h('div', { class: 'side__title' }, 'КОМАНДЫ'),
        h('div', { class: 'tboard', id: 't-board' }, boardRows()),

        // Опоздавшие приходят посреди урока, а код с QR был только на первом
        // экране. Держим маленький код на виду всю игру: вошедший сразу
        // попадает на текущее задание, команду ему сервер подберёт сам.
        h('div', { class: 'latejoin' },
          h('div', { class: 'latejoin__qr', html: toSVG(joinUrl(), { size: 132 }) }),
          h('div', { class: 'latejoin__text' },
            h('div', { class: 'latejoin__label' }, 'ОПОЗДАЛ?'),
            h('div', { class: 'latejoin__code' }, state.code),
            h('div', { class: 'latejoin__hint' }, 'Отсканируй и включайся'))),
        h('div', { class: 'side__title' }, 'УПРАВЛЕНИЕ'),
        h('div', { class: 'controls' },
          h('button', {
            class: 'btn btn--ctrl', type: 'button',
            onClick: () => net.send({ t: 'teacher', action: state.paused ? 'resume' : 'pause' }),
          }, state.paused ? '▶ ПРОДОЛЖИТЬ' : '⏸ ПАУЗА'),
          h('button', {
            class: 'btn btn--ctrl', type: 'button',
            disabled: state.can_go_back === false,
            onClick: () => net.send({ t: 'teacher', action: 'back' }),
          }, '⏮ ПРЕДЫДУЩЕЕ ЗАДАНИЕ'),
          h('button', {
            class: 'btn btn--ctrl', type: 'button',
            onClick: () => net.send({ t: 'teacher', action: 'skip' }),
          }, '⏭ ПРОПУСТИТЬ'),
          h('button', {
            class: 'btn btn--ctrl', type: 'button',
            onClick: () => { net.send({ t: 'teacher', action: 'add_time', value: 300 });
                             toast('+5 минут к уроку'); },
          }, '+5 МИН'),
          state.phase === 'question' ? h('button', {
            class: 'btn btn--ctrl', type: 'button',
            onClick: () => net.send({ t: 'teacher', action: 'extend_question', value: 15 }),
          }, '+15 С К ЗАДАНИЮ') : null,
          h('button', {
            class: 'btn btn--ctrl btn--danger', type: 'button',
            onClick: () => { if (confirm('Завершить игру и показать результаты?'))
                               net.send({ t: 'teacher', action: 'finish' }); },
          }, '🏁 К РЕЗУЛЬТАТАМ')),
        h('div', { class: 'side__title' }, 'ИГРОКИ'),
        h('div', { class: 'connect__players' },
          (state.players || []).map((p) => h('span', {
            class: `pill ${p.connected ? '' : 'is-off'}`,
          }, `${p.name} ${p.score}`))))),
  );
  if (state.paused) node.classList.add('is-paused');
  swapScreen(root, node, 'live');
  updateLive();
}

// --- результаты и аналитика ----------------------------------------------

/** Победитель — отдельный крупный блок: на проекторе его читают с задних парт. */
function winnerCard(top) {
  if (!top) return null;
  return h('div', { class: 'winner', style: { '--team': top.color } },
    h('div', { class: 'winner__medal' }, '🥇'),
    h('div', { class: 'winner__body' },
      h('div', { class: 'winner__label' }, 'ПОБЕДИТЕЛЬ'),
      h('div', { class: 'winner__name' },
        h('span', { class: 'winner__dot', html: teamDot(top.color) }),
        h('span', null, top.name))),
    h('div', { class: 'winner__nums' },
      h('div', { class: 'winner__score' }, `${top.score}`),
      h('div', { class: 'winner__cap' }, `кристаллов · ${Math.round(top.accuracy * 100)}% точности`)));
}

function renderFinal() {
  const ranking = state.ranking || [];
  // листопад включался на экране подключения и больше не выключался —
  // на итогах он летел прямо по названиям команд
  fx.leaves(false);
  fx.confettiRain(3000);
  const node = h('div', { class: 'screen screen--tfinal' },
    h('header', { class: 'livebar' },
      h('div', { class: 'livebar__brand' }, 'ЛИНГОГРАД'),
      h('div', { class: 'livebar__phase' }, '🏆 Итоги игры'),
      h('div', { class: 'livebar__clock' }, `${state.grade} класс`)),
    h('div', { class: 'tfinal' },
      // Левая колонка — то, что смотрит класс: победитель, места, награды.
      h('div', { class: 'tfinal__main' },
        h('h1', { class: 'tfinal__title' }, '🏆 РЕЗУЛЬТАТЫ'),
        winnerCard(ranking[0]),

        h('section', { class: 'sect' },
          h('h2', { class: 'sect__title' }, 'РЕЙТИНГ КОМАНД'),
          h('div', { class: 'results__list results__list--teacher' },
            ranking.slice(1).map((t) => h('div', {
              class: 'results__row',
              style: { '--team': t.color },
            },
              h('span', { class: 'results__place' }, `${t.place}`),
              h('span', { class: 'results__emoji', html: teamDot(t.color) }),
              h('span', { class: 'results__name' }, t.name),
              h('span', { class: 'results__score' }, `${t.score}`),
              h('span', { class: 'results__acc' }, `${Math.round(t.accuracy * 100)}%`))))),

        h('section', { class: 'sect' },
          h('h2', { class: 'sect__title' }, 'НАГРАДЫ'),
          h('div', { class: 'awards awards--final' },
            (state.awards || []).map((a) => h('div', { class: 'award' },
              h('span', { class: 'award__emoji' }, a.emoji),
              h('div', { class: 'award__body' },
                h('div', { class: 'award__title' }, a.title),
                h('div', { class: 'award__team' },
                  h('span', { class: 'award__dot', html: teamDot(a.team.color) }),
                  h('span', null, a.team.name)),
                h('div', { class: 'award__value' }, a.value)))))),
      ),

      // Правая колонка — то, что нужно учителю: разбор по темам и людям.
      h('div', { class: 'tfinal__side' },
        h('div', { class: 'side__title' }, 'РАЗБОР ДЛЯ УЧИТЕЛЯ'),
        h('div', { class: 'analytics', id: 'analytics' }, h('div', { class: 'loader' })))),

    // Действия жили в хвосте боковой колонки, и «НОВАЯ ИГРА» уезжала
    // за нижний край экрана. Теперь это постоянная полоса внизу.
    h('div', { class: 'actionbar' },
      ghostButton('Обновить разбор', loadAnalytics),
      ghostButton('Скачать CSV', downloadCsv),
      primaryButton('НОВАЯ ИГРА', () => {
        saveLocal('lg_teacher', null); session = null; net.close(); renderSetup();
      })),
  );
  swapScreen(root, node, 'tfinal');
  loadAnalytics();
}

let analyticsCache = null;

async function loadAnalytics() {
  const box = document.getElementById('analytics');
  if (!box || !session) return;
  try {
    const res = await fetch(`/api/analytics/${session.code}?token=${encodeURIComponent(session.teacher_token)}`);
    const data = await res.json();
    analyticsCache = data;
    mount(box,
      h('div', { class: 'analytics__grid' },
        Object.entries(data.by_district || {}).map(([id, d]) => h('div', { class: 'anal__card' },
          h('div', { class: 'anal__icon', html: districtIcon(id) }),
          h('div', { class: 'anal__title' }, d.title),
          h('div', { class: 'anal__value' }, `${Math.round(d.accuracy * 100)}%`),
          h('div', { class: 'anal__sub' }, `${d.correct} из ${d.answered} ответов`)))),
      h('div', { class: 'side__title' }, 'ТРУДНЫЕ ЗАДАНИЯ'),
      h('div', { class: 'anal__list' },
        (data.hardest || []).map((q) => h('div', { class: 'anal__row', title: q.question },
          h('span', { class: 'anal__pct' }, `${Math.round(q.accuracy * 100)}%`),
          h('span', { class: 'anal__q' }, q.question),
          h('span', { class: 'anal__topic' }, q.topic)))),
      h('div', { class: 'side__title' }, 'ЛУЧШИЕ ИГРОКИ'),
      // «Хранитель 1  22» читалось как два номера подряд, поэтому у колонок
      // появились заголовки, а у чисел — единицы измерения
      h('div', { class: 'ptable' },
        h('div', { class: 'ptable__head' },
          h('span', null, 'Место'),
          h('span', null, 'Игрок'),
          h('span', null, 'Кристаллы'),
          h('span', null, 'Верных')),
        (data.players || []).slice(0, 5).map((p, i) => h('div', { class: 'ptable__row' },
          h('span', { class: 'ptable__place' }, `${i + 1}`),
          h('span', { class: 'ptable__name' }, p.name),
          h('span', { class: 'ptable__score' }, `${p.score}`),
          h('span', { class: 'ptable__correct' }, `${p.correct} из ${p.answered}`)))));
  } catch {
    mount(box, h('p', { class: 'muted' }, 'Разбор появится после первых ответов'));
  }
}

function downloadCsv() {
  if (!analyticsCache) return toast('Сначала загрузите разбор', 'warn');
  const rows = [['№', 'id', 'район', 'тема', 'вопрос', 'ответили', 'верно', 'точность']];
  for (const q of analyticsCache.questions || []) {
    rows.push([q.index, q.id, q.district, q.topic, q.question.replace(/;/g, ','),
               q.answered, q.correct, Math.round(q.accuracy * 100) + '%']);
  }
  rows.push([]);
  rows.push(['команда', 'кристаллы', 'верно', 'ответов', 'точность']);
  for (const t of analyticsCache.teams || []) {
    rows.push([t.name, t.score, t.correct, t.answered, Math.round(t.accuracy * 100) + '%']);
  }
  const csv = '﻿' + rows.map((r) => r.join(';')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `lingograd-${analyticsCache.code}-${analyticsCache.grade}kl.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function mountChrome() {
  document.body.append(h('div', {
    class: 'netbanner', id: 'netbanner', hidden: true,
  }, '⚠ Связь потеряна. Переподключаемся…'));
}
