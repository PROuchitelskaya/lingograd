// Экраны ученика: от лендинга до наград (ТЗ §47).
// На каждом экране одна очевидная главная кнопка (ТЗ §50).

import { h, mount, mmss, swapScreen, primaryButton, ghostButton, toast,
         readLocal, saveLocal, players, crystals, animateNumber } from './ui.js';
import * as net from './net.js';
import { sfx, setMood, startMusic, unlock } from './audio.js';
import * as fx from './fx.js';
import { cityScene, chaosVillain, chaosTower, bridge, schoolBell, crystal, cityMap } from './art.js';
import { buildQuestion, revealBlock } from './question.js';
import { settingsButton } from './settings.js';

const root = document.getElementById('app');

let state = null;          // последний снапшот от сервера
let screenKey = '';        // чтобы не перерисовывать экран на каждом тике
let activeQuestion = null; // карточка текущего задания
let lastTeamScore = 0;
let bellPlayed = false;

const saved = readLocal('lg_player', {});

// ---------------------------------------------------------------- запуск

export function startStudent() {
  const params = new URLSearchParams(location.search);
  const code = (params.get('c') || params.get('code') || '').toUpperCase();
  wireNet();
  setInterval(updateTimers, 250);

  if (code) return showJoin(code);
  // Телефон заблокировался или браузер перезапустился посреди урока —
  // возвращаем ученика в его команду, а не на лендинг (ТЗ §41).
  if (saved.code && saved.id) return resumeOrLanding();
  showLanding();
}

async function resumeOrLanding() {
  mount(root, waitingConnect());
  try {
    const res = await fetch(`/api/session/${saved.code}`);
    if (!res.ok) throw new Error('нет такой игры');
    net.connect({ code: saved.code, role: 'student', name: saved.name, player_id: saved.id });
  } catch {
    showLanding();
  }
}

function wireNet() {
  net.on('state', (msg) => {
    state = msg;
    render();
  });
  net.on('tick', (msg) => {
    if (!state) return;
    state.phase_deadline = msg.phase_deadline;
    state.session_left = msg.session_left;
    state.online = msg.online;
    updateTimers();
  });
  net.on('scores', (msg) => {
    if (!state) return;
    state.teams = msg.teams;
    state.chaos_hp = msg.chaos_hp;
    updateScores();
  });
  net.on('answer_result', (msg) => {
    if (!activeQuestion) return;
    if (msg.ok === false) return;
    activeQuestion.showResult(msg);
    if (msg.correct) {
      sfx.correct();
      const counter = document.getElementById('hud-score');
      fx.crystalsTo(document.querySelector('.q-card'), counter, 6);
      setTimeout(() => sfx.crystal(), 240);
    } else {
      sfx.wrong();
    }
  });
  net.on('bell', () => {
    if (bellPlayed) return;
    bellPlayed = true;
    sfx.bell();
    toast('Прозвенел звонок! Учитель может добавить время', 'warn');
  });
  net.on('welcome', (msg) => {
    saveLocal('lg_player', { id: msg.player_id, name: msg.name, code: msg.code });
  });
  net.on('error', (msg) => {
    toast(msg.message || 'Ошибка', 'error');
    if (msg.code === 'no_session') showJoin('', msg.message);
  });
  net.on('status', (s) => {
    document.body.dataset.net = s;
    const banner = document.getElementById('netbanner');
    if (banner) banner.hidden = (s === 'connected' || s === 'idle');
  });
}

// ---------------------------------------------------------------- экраны до игры

function showLanding() {
  screenKey = 'landing';
  const node = h('div', { class: 'screen screen--landing' },
    h('div', { class: 'landing__art', html: cityScene() }),
    h('div', { class: 'landing__inner' },
      h('div', { class: 'badge badge--fest' }, '🎒 СПЕЦВЫПУСК К 1 СЕНТЯБРЯ'),
      h('h1', { class: 'logo' }, 'ЛИНГОГРАД'),
      h('p', { class: 'logo__sub' }, 'ЯЗЫК НА ГРАНИ'),
      h('p', { class: 'landing__lead' },
        'Город русского языка ждёт Хранителей. Соберите класс, выберите команду и верните Лингограду порядок до последнего звонка.'),
      primaryButton('НАЧАТЬ ПРИКЛЮЧЕНИЕ →', () => { unlock(); sfx.start(); showJoin(); },
        { class: 'btn--breathe' }),
      h('div', { class: 'landing__links' },
        h('a', { class: 'link', href: '/teacher' }, 'Я учитель — создать игру'))),
  );
  fx.leaves(true);
  swapScreen(root, node, 'landing');
}

function showJoin(prefill = '', error = '') {
  screenKey = 'join';
  const codeInput = h('input', {
    class: 'field field--code', type: 'text', inputmode: 'latin', maxlength: '4',
    placeholder: 'КОД', value: prefill, autocomplete: 'off', spellcheck: 'false',
    'aria-label': 'Код игры',
    onInput: (e) => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); },
  });
  const nameInput = h('input', {
    class: 'field', type: 'text', maxlength: '24', placeholder: 'Ваше имя',
    value: saved.name || '', autocomplete: 'off', 'aria-label': 'Имя',
  });

  const go = () => {
    const code = codeInput.value.trim().toUpperCase();
    const name = nameInput.value.trim() || 'Ученик';
    if (code.length < 4) return toast('Введите код из 4 символов', 'warn');
    unlock();
    saveLocal('lg_player', { ...saved, name, code });
    net.connect({
      code, role: 'student', name,
      player_id: saved.code === code ? saved.id : undefined,
    });
    mount(root, waitingConnect());
  };

  const node = h('div', { class: 'screen screen--join' },
    h('div', { class: 'card card--entry' },
      h('h1', { class: 'h1' }, 'С возвращением в школу! 🎒'),
      h('p', { class: 'muted' },
        'Сегодня первый день нового учебного года. Но Лингограду нужна ваша помощь.'),
      error ? h('div', { class: 'alert' }, error) : null,
      h('label', { class: 'field-label' }, 'Введите код игры'),
      codeInput,
      h('label', { class: 'field-label' }, 'Как вас зовут?'),
      nameInput,
      primaryButton('ВОЙТИ', go),
      h('p', { class: 'hint' }, 'Код игры выдаст учитель')),
  );
  fx.leaves(true);
  swapScreen(root, node, 'join');
  setTimeout(() => (prefill ? nameInput : codeInput).focus({ preventScroll: true }), 150);
}

function waitingConnect() {
  return h('div', { class: 'screen screen--center' },
    h('div', { class: 'loader' }),
    h('p', { class: 'muted' }, 'Подключаемся к Лингограду…'));
}

// ---------------------------------------------------------------- HUD

function myTeam() {
  if (!state?.me?.team_id) return null;
  return state.teams.find((t) => t.id === state.me.team_id) || null;
}

function hud() {
  const team = myTeam();
  return h('header', { class: 'hud' },
    h('div', { class: 'hud__mission' },
      h('span', { class: 'hud__label' }, 'МИССИЯ'),
      h('span', { class: 'hud__value' }, `${(state.mission.index || 0) + 1}/${state.mission.of}`)),
    h('div', { class: 'hud__score', id: 'hud-score-box' },
      h('span', { class: 'hud__crystal', html: crystal(20) }),
      h('span', { class: 'hud__value', id: 'hud-score' }, String(team?.score ?? 0)),
      h('span', { class: 'hud__team' }, team ? `${team.emoji} ${team.name}` : '')),
    h('div', { class: 'hud__timer', id: 'hud-timer' },
      h('span', { class: 'hud__label' }, '⏱'),
      h('span', { class: 'hud__value', id: 'hud-clock' }, mmss(state.session_left))),
  );
}

function updateTimers() {
  if (!state) return;
  const clock = document.getElementById('hud-clock');
  if (clock) {
    clock.textContent = mmss(state.session_left);
    const box = document.getElementById('hud-timer');
    const ratio = state.session_left / (state.duration_min * 60_000);
    box.classList.toggle('is-warn', ratio <= 0.2 && ratio > 0.1);
    box.classList.toggle('is-danger', ratio <= 0.1);
  }
  const ring = document.getElementById('q-timer');
  if (ring && state.phase === 'question') {
    const left = Math.max(0, state.phase_deadline - net.serverNow());
    const total = (state.question?.time_limit || 30) * 1000;
    const p = Math.max(0, Math.min(1, left / total));
    ring.style.setProperty('--p', p);
    ring.dataset.left = Math.ceil(left / 1000);
    ring.classList.toggle('is-warn', p <= 0.33 && p > 0.15);
    ring.classList.toggle('is-danger', p <= 0.15);
    const num = ring.querySelector('.qtimer__num');
    if (num) num.textContent = Math.ceil(left / 1000);
  }
  const phaseBar = document.getElementById('phase-bar');
  if (phaseBar) {
    const left = Math.max(0, state.phase_deadline - net.serverNow());
    phaseBar.style.width = `${Math.max(0, Math.min(100, 100 - left / 120))}%`;
  }
}

function updateScores() {
  const team = myTeam();
  const node = document.getElementById('hud-score');
  if (node && team) {
    const from = lastTeamScore || Number(node.textContent) || 0;
    animateNumber(node, from, team.score);
    lastTeamScore = team.score;
  }
  const hpBar = document.getElementById('chaos-hp');
  if (hpBar) hpBar.style.width = `${state.chaos_hp}%`;
  const board = document.getElementById('mini-board');
  if (board) mount(board, miniBoardRows());
}

function miniBoardRows() {
  return state.teams.map((t) => h('div', {
    class: `mini__row ${t.id === state.me?.team_id ? 'is-me' : ''}`,
  },
    h('span', { class: 'mini__emoji' }, t.emoji),
    h('span', { class: 'mini__name' }, t.name),
    h('span', { class: 'mini__score' }, t.score)));
}

// ---------------------------------------------------------------- рендер по фазе

function render() {
  if (!state) return;
  state._at = Date.now();

  const phase = state.phase;
  const key = [
    phase,
    state.mission?.index,
    phase === 'question' ? state.question?.id : '',
    phase === 'lobby' ? (state.me?.team_id ? 'team' : 'pick') : '',
  ].join('|');

  if (key === screenKey) {
    updateScores();
    return;
  }
  screenKey = key;
  activeQuestion = null;

  const map = {
    lobby: renderLobby,
    september: renderSeptember,
    story: renderStory,
    map: renderMap,
    mission_intro: renderMissionIntro,
    question: renderQuestion,
    reveal: renderReveal,
    mission_complete: renderMissionComplete,
    victory: renderVictory,
    results: renderResults,
    awards: renderAwards,
  };
  (map[phase] || renderLobby)();
  updateScores();
}

// --- лобби: выбор команды и комната ожидания -----------------------------

function renderLobby() {
  if (!state.me?.team_id) return renderTeamPick();

  const team = myTeam();
  const node = h('div', { class: 'screen screen--wait' },
    h('div', { class: 'card card--wait' },
      h('div', { class: 'wait__emoji' }, team?.emoji || '🎒'),
      h('h1', { class: 'h1' }, `Вы в команде «${team?.name || ''}»`),
      h('p', { class: 'muted' }, team?.motto || ''),
      h('div', { class: 'wait__pulse' }, 'Ждём остальных Хранителей…'),
      h('div', { class: 'wait__count' }, players(state.online)),
      h('div', { class: 'mini', id: 'mini-board' }, miniBoardRows()),
      ghostButton('Сменить команду', () => {
        net.send({ t: 'pick_team', team_id: '' });
        state.me.team_id = null;
        screenKey = '';
        renderTeamPick();
      }),
      h('p', { class: 'hint' }, 'Игру начнёт учитель')),
  );
  fx.leaves(true);
  swapScreen(root, node, 'wait');
}

function renderTeamPick() {
  const node = h('div', { class: 'screen screen--teams' },
    h('h1', { class: 'h1 h1--center' }, 'ВЫБЕРИТЕ КОМАНДУ'),
    h('p', { class: 'muted muted--center' }, 'Вместе вы — Хранители языка'),
    h('div', { class: 'teams' },
      state.teams.map((t) => h('button', {
        class: 'teamcard', type: 'button',
        style: { '--team': t.color },
        onClick: () => {
          unlock(); sfx.select();
          net.send({ t: 'pick_team', team_id: t.id });
        },
      },
        h('span', { class: 'teamcard__emoji' }, t.emoji),
        h('span', { class: 'teamcard__name' }, t.name),
        h('span', { class: 'teamcard__motto' }, t.motto),
        h('span', { class: 'teamcard__count' }, players(t.members))))),
  );
  fx.leaves(true);
  swapScreen(root, node, 'teams');
}

// --- эмоциональные экраны -------------------------------------------------

function renderSeptember() {
  sfx.bell();
  startMusic();
  fx.leaves(true);
  fx.planes(3);
  setTimeout(() => fx.confettiBurst(window.innerWidth / 2, 160), 500);

  const node = h('div', { class: 'screen screen--september' },
    h('div', { class: 'sept__bell', html: schoolBell() }),
    h('h1', { class: 'display display--gold' }, 'С 1 СЕНТЯБРЯ! 🎉'),
    h('p', { class: 'lead' }, 'Новый учебный год начинается прямо сейчас.'),
    h('p', { class: 'lead lead--dim' }, 'Но в Лингограде что-то пошло не так…'),
    h('div', { class: 'phase-bar' }, h('span', { id: 'phase-bar' })),
  );
  swapScreen(root, node, 'september');
}

function renderStory() {
  sfx.chaos();
  setMood('dark');
  fx.leaves(false);
  const lines = [
    'Ха-ха! С первым сентября, ученики!',
    'Я решил немного изменить школьные правила.',
    'Буквы перепутаны. Запятые разбежались. Окончания исчезли.',
    'Если вы хотите спасти Лингоград — попробуйте!',
  ];
  const box = h('div', { class: 'story__lines' });
  const node = h('div', { class: 'screen screen--story' },
    h('div', { class: 'story__villain', html: chaosVillain() }),
    h('div', { class: 'story__text' },
      h('div', { class: 'story__name' }, 'ХАОС'),
      box),
  );
  swapScreen(root, node, 'story');
  lines.forEach((line, i) => setTimeout(() => {
    box.append(h('p', { class: 'story__line' }, line));
    sfx.select();
  }, 900 + i * 1500));
}

function renderMap() {
  sfx.transition();
  setMood('bright');
  fx.leaves(true);
  const node = h('div', { class: 'screen screen--map' },
    hud(),
    h('div', { class: 'mapwrap' },
      h('div', { class: 'mapwrap__bg', html: cityMap() }),
      h('div', { class: 'mapnodes' },
        state.map.map((m, i) => h('div', {
          class: `mapnode mapnode--${m.state} mapnode--${i}`,
        },
          h('span', { class: 'mapnode__icon' }, m.icon),
          h('span', { class: 'mapnode__title' }, m.title),
          h('span', { class: 'mapnode__state' },
            m.state === 'done' ? '✓ восстановлен'
              : m.state === 'active' ? 'ваша цель' : 'закрыт'))))),
    h('div', { class: 'mapfoot' },
      h('span', { class: 'chip' }, `Следующая миссия: ${state.mission.title}`),
      h('div', { class: 'mini', id: 'mini-board' }, miniBoardRows())),
  );
  swapScreen(root, node, 'map');
}

function renderMissionIntro() {
  sfx.transition();
  const m = state.mission;
  const node = h('div', { class: `screen screen--intro ${m.zone}` },
    hud(),
    h('div', { class: 'intro' },
      h('div', { class: 'intro__icon' }, m.icon),
      h('div', { class: 'intro__label' }, `МИССИЯ ${m.index + 1} ИЗ ${m.of}`),
      h('h1', { class: 'display' }, m.title),
      h('p', { class: 'lead' }, m.subtitle),
      h('p', { class: 'muted muted--center' }, m.brief),
      h('div', { class: 'intro__meta' },
        h('span', { class: 'chip' }, `${m.questions} заданий`),
        h('span', { class: 'chip' }, state.mission.district === 'tower' ? 'Финальная битва' : 'Работаем командой')),
      h('div', { class: 'phase-bar' }, h('span', { id: 'phase-bar' }))),
  );
  if (m.district === 'tower') { setMood('dark'); fx.leaves(false); sfx.chaos(); }
  swapScreen(root, node, 'intro');
}

// --- вопрос ---------------------------------------------------------------

function renderQuestion() {
  const q = state.question;
  if (!q) return;
  const m = state.mission;
  const isTower = m.district === 'tower';

  activeQuestion = buildQuestion(q, {
    onSubmit: (payload) => net.send({ t: 'answer', qid: q.id, payload }),
  });

  const node = h('div', { class: `screen screen--question ${m.zone}` },
    hud(),
    h('div', { class: 'qtop' },
      h('div', { class: 'qtop__where' },
        h('span', { class: 'qtop__icon' }, m.icon),
        h('span', null, m.title)),
      h('div', { class: 'qtop__no' }, `ЗАДАНИЕ ${String(state.global_index).padStart(2, '0')}`),
      h('div', { class: 'qtimer', id: 'q-timer' },
        h('span', { class: 'qtimer__num' }, q.time_limit))),

    isTower ? h('div', { class: 'chaosbar' },
      h('div', { class: 'chaosbar__label' }, '❤️ ЭНЕРГИЯ ХАОСА'),
      h('div', { class: 'chaosbar__track' },
        h('span', { class: 'chaosbar__fill', id: 'chaos-hp',
                    style: { width: `${state.chaos_hp}%` } }))) : null,

    isTower ? h('div', { class: 'tower__art', html: chaosTower(state.chaos_hp) }) : null,
    m.district === 'syntax'
      ? h('div', { class: 'bridge__art', html: bridge(state.question_no - 1, m.questions) })
      : null,

    activeQuestion.node,
    h('div', { class: 'mini mini--floating', id: 'mini-board' }, miniBoardRows()),
  );

  if (state.me?.answer_done) {
    activeQuestion.lock();
    activeQuestion.showResult({
      correct: state.me.answer_correct,
      points: state.me.answer_points,
      attempts_left: 0,
    });
  }
  swapScreen(root, node, 'question');
}

function renderReveal() {
  const r = state.reveal || {};
  const m = state.mission;
  const mine = state.me || {};
  const node = h('div', { class: `screen screen--reveal ${m.zone}` },
    hud(),
    h('div', { class: 'revealwrap' },
      mine.answer_done
        ? h('div', { class: `bigverdict ${mine.answer_correct ? 'is-ok' : 'is-no'}` },
            h('span', { class: 'bigverdict__mark' }, mine.answer_correct ? '✓' : '⚠'),
            h('span', null, mine.answer_correct
              ? `ПРАВИЛЬНО  +${mine.answer_points}`
              : 'ОШИБКА — это часть игры'))
        : h('div', { class: 'bigverdict is-skip' },
            h('span', { class: 'bigverdict__mark' }, '⏱'),
            h('span', null, 'Время вышло')),
      revealBlock(r),
      h('div', { class: 'mini', id: 'mini-board' }, miniBoardRows()),
      h('div', { class: 'phase-bar' }, h('span', { id: 'phase-bar' }))),
  );
  if (m.district === 'tower') {
    sfx.hit();
    fx.letterBurst(window.innerWidth / 2, window.innerHeight / 3, 26);
    fx.flash('rgba(255,201,74,.35)');
  }
  swapScreen(root, node, 'reveal');
}

function renderMissionComplete() {
  const rep = state.mission_report || {};
  sfx.transition();
  fx.confettiBurst(window.innerWidth / 2, window.innerHeight / 3, 60);
  const node = h('div', { class: `screen screen--done ${rep.zone || ''}` },
    hud(),
    h('div', { class: 'done' },
      h('div', { class: 'done__icon' }, rep.icon || '✅'),
      h('h1', { class: 'display' }, 'РАЙОН ВОССТАНОВЛЕН'),
      h('p', { class: 'lead' }, rep.title || ''),
      h('div', { class: 'done__progress' },
        `${rep.restored || 1} из ${rep.of || 5} районов Лингограда снова светятся`),
      h('div', { class: 'board' },
        (rep.teams || []).map((t, i) => h('div', { class: 'board__row' },
          h('span', { class: 'board__place' }, i + 1),
          h('span', { class: 'board__emoji' }, t.emoji),
          h('span', { class: 'board__name' }, t.name),
          h('span', { class: 'board__score' }, t.score)))),
      h('div', { class: 'phase-bar' }, h('span', { id: 'phase-bar' }))),
  );
  swapScreen(root, node, 'done');
}

function renderVictory() {
  sfx.boom();
  setTimeout(() => sfx.victory(), 900);
  setMood('bright');
  fx.letterBurst(window.innerWidth / 2, window.innerHeight / 2, 46);
  fx.confettiRain(5000);
  fx.leaves(true);
  setTimeout(() => sfx.confetti(), 1200);

  const node = h('div', { class: 'screen screen--victory' },
    h('div', { class: 'victory__bell', html: schoolBell() }),
    h('h1', { class: 'display display--gold' }, 'ЛИНГОГРАД СПАСЁН! 🎉'),
    h('p', { class: 'lead' }, 'Первый урок нового учебного года начинается с победы!'),
    h('div', { class: 'victory__title' }, 'ВЫ — ХРАНИТЕЛИ ЯЗЫКА'),
    h('div', { class: 'victory__letters' },
      [...'ЛИНГОГРАД'].map((ch, i) => h('span', {
        class: 'victory__letter', style: { animationDelay: `${i * 90}ms` },
      }, ch))),
    h('div', { class: 'phase-bar' }, h('span', { id: 'phase-bar' })),
  );
  swapScreen(root, node, 'victory');
}

function renderResults() {
  const rows = [...(state.ranking || [])].reverse();   // с последнего места
  const list = h('div', { class: 'results__list' });
  const node = h('div', { class: 'screen screen--results' },
    h('h1', { class: 'display' }, '🏆 РЕЗУЛЬТАТЫ'),
    list,
  );
  swapScreen(root, node, 'results');

  rows.forEach((t, i) => {
    const isWinner = t.place === 1;
    setTimeout(() => {
      const row = h('div', {
        class: `results__row ${isWinner ? 'is-winner' : ''}`,
        style: { '--team': t.color },
      },
        h('span', { class: 'results__place' }, isWinner ? '🥇' : `${t.place}`),
        h('span', { class: 'results__emoji' }, t.emoji),
        h('span', { class: 'results__name' }, t.name),
        h('span', { class: 'results__score' }, `${t.score}`));
      list.prepend(row);
      if (isWinner) {
        sfx.victory();
        fx.confettiRain(4000);
        fx.confettiBurst(window.innerWidth / 2, window.innerHeight / 2, 110);
      } else {
        sfx.select();
      }
    }, i * 1400 + (t.place === 1 ? 900 : 0));
  });
}

function renderAwards() {
  const team = myTeam();
  const node = h('div', { class: 'screen screen--awards' },
    h('h1', { class: 'display' }, 'СПЕЦИАЛЬНЫЕ НАГРАДЫ'),
    h('div', { class: 'awards' },
      (state.awards || []).map((a) => h('div', { class: 'award' },
        h('span', { class: 'award__emoji' }, a.emoji),
        h('div', null,
          h('div', { class: 'award__title' }, a.title),
          h('div', { class: 'award__team' }, `${a.team.emoji} ${a.team.name}`),
          h('div', { class: 'award__value' }, a.value))))),
    h('div', { class: 'awards__foot' },
      h('p', { class: 'lead' }, 'ПЕРВЫЙ УРОК — ПЕРВАЯ ПОБЕДА!'),
      team ? h('p', { class: 'muted muted--center' },
        `Ваша команда «${team.name}»: ${crystals(team.score)}, точность ${Math.round(team.accuracy * 100)}%`) : null,
      state.me ? h('p', { class: 'muted muted--center' },
        `Лично вы: ${state.me.correct} верных из ${state.me.answered}, серия ${state.me.best_streak}`) : null),
  );
  fx.confettiRain(2500);
  swapScreen(root, node, 'awards');
}

// Кнопка настроек и баннер связи живут поверх всех экранов.
export function mountChrome() {
  document.body.append(settingsButton());
  document.body.append(h('div', {
    class: 'netbanner', id: 'netbanner', hidden: true,
  }, '⚠ Связь потеряна. Переподключаемся — ваш прогресс сохранён'));
}
