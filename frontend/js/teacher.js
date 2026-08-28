// Экран учителя: создать игру за две минуты, вести её и разобрать результаты
// (ТЗ §11–12, §43, §51). Всё на одном экране — проектор показывает то же, что класс.

import { h, mount, mmss, swapScreen, primaryButton, ghostButton, toast,
         readLocal, saveLocal, players } from './ui.js';
import * as net from './net.js';
import { sfx, unlock, startMusic } from './audio.js';
import * as fx from './fx.js';
import { toSVG } from './qr.js';
import { chaosVillain, chaosTower, crystal } from './art.js';
import { settingsButton } from './settings.js';

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
  net.on('bell', () => { sfx.bell(); toast('Прозвенел звонок — время урока вышло', 'warn'); });
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
          unlock(); sfx.select();
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
          unlock(); sfx.start();
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
  const key = [state.phase, state.mission?.index,
               state.phase === 'question' ? state.question?.id : '',
               state.phase === 'lobby' ? state.online : ''].join('|');
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
  if (board && state) mount(board, boardRows());
  const counter = document.getElementById('t-answered');
  if (counter && state) {
    counter.textContent = `${state.answered || 0} из ${state.online || 0}`;
    const bar = document.getElementById('t-answered-bar');
    if (bar) bar.style.width = `${state.online ? (state.answered / state.online) * 100 : 0}%`;
  }
  const hp = document.getElementById('t-hp');
  if (hp) hp.style.width = `${state.chaos_hp}%`;
}

function boardRows() {
  const max = Math.max(1, ...state.teams.map((t) => t.score));
  return state.teams.map((t) => h('div', { class: 'tboard__row' },
    h('span', { class: 'tboard__emoji' }, t.emoji),
    h('span', { class: 'tboard__name' }, t.name),
    h('span', { class: 'tboard__bar' },
      h('span', { class: 'tboard__fill', style: { width: `${(t.score / max) * 100}%`, background: t.color } })),
    h('span', { class: 'tboard__score' }, t.score),
    h('span', { class: 'tboard__members' }, `${t.members}`)));
}

// --- экран подключения ----------------------------------------------------

function renderConnect() {
  const joinUrl = session?.join_url || `${location.origin}/?c=${state.code}`;
  const node = h('div', { class: 'screen screen--connect' },
    h('div', { class: 'connect' },
      h('div', { class: 'connect__left' },
        h('h1', { class: 'display' }, 'ПОДКЛЮЧАЙТЕСЬ'),
        h('div', { class: 'qr', html: toSVG(joinUrl, { size: 300 }) }),
        h('div', { class: 'connect__code' },
          h('span', { class: 'connect__code-label' }, 'CODE:'),
          h('span', { class: 'connect__code-value' }, state.code)),
        h('p', { class: 'muted' }, 'Откройте игру на телефоне и введите код'),
        h('p', { class: 'connect__url' }, joinUrl)),

      h('div', { class: 'connect__right' },
        h('div', { class: 'connect__stat' },
          h('span', { class: 'dot dot--on' }),
          h('span', { class: 'connect__count' }, players(state.online)),
          h('span', { class: 'muted' }, 'подключились')),
        h('div', { class: 'tboard', id: 't-board' }, boardRows()),
        h('div', { class: 'connect__players' },
          (state.players || []).map((p) => h('span', {
            class: `pill ${p.connected ? '' : 'is-off'}`,
          }, p.name))),
        h('div', { class: 'connect__meta' },
          h('span', { class: 'chip' }, `${state.grade} класс`),
          h('span', { class: 'chip' }, `${state.total_questions} заданий`),
          h('span', { class: 'chip' }, `${state.duration_min} минут`),
          h('span', { class: 'chip' }, state.mode === 'september' ? 'Праздничный режим' : 'Обычный режим')),
        primaryButton('НАЧАТЬ ИГРУ', () => {
          unlock(); startMusic(); sfx.start();
          net.send({ t: 'teacher', action: 'start' });
        }, { disabled: state.online === 0 }),
        state.online === 0 ? h('p', { class: 'hint' }, 'Ждём первых игроков…') : null,
        ghostButton('Новая игра', () => {
          saveLocal('lg_teacher', null); session = null; net.close(); renderSetup();
        }))),
  );
  fx.leaves(true);
  swapScreen(root, node, 'connect');
}

// --- ведение игры ---------------------------------------------------------

function renderLive() {
  const m = state.mission;
  const phaseLabel = {
    september: 'Экран «1 сентября»', story: 'Появление Хаоса', map: 'Карта Лингограда',
    mission_intro: 'Заставка миссии', question: 'Задание', reveal: 'Разбор ответа',
    mission_complete: 'Район восстановлен', victory: 'Победа',
  }[state.phase] || state.phase;

  const q = state.question;
  const answer = state.teacher_answer;

  const node = h('div', { class: `screen screen--live ${m.zone}` },
    h('header', { class: 'livebar' },
      h('div', { class: 'livebar__brand' }, 'ЛИНГОГРАД'),
      h('div', { class: 'livebar__phase' }, `${m.icon} ${m.title} · ${phaseLabel}`),
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
              q.answers ? h('div', { class: 'teacherq__answers' },
                q.answers.map((a, i) => h('div', {
                  class: `teacherq__answer ${answer?.correct_index === i ||
                    (Array.isArray(answer?.correct_index) && answer.correct_index.includes(i))
                    ? 'is-right' : ''}`,
                }, `${'АБВГДЕ'[i]}. ${a}`))) : null,
              answer ? h('div', { class: 'teacherq__key' },
                h('strong', null, 'Ответ: '), answer.correct_text || '—',
                answer.explanation ? h('p', { class: 'teacherq__why' }, answer.explanation) : null) : null,
              h('div', { class: 'answered' },
                h('div', { class: 'answered__label' },
                  'Ответили: ', h('b', { id: 't-answered' },
                    `${state.answered || 0} из ${state.online || 0}`)),
                h('div', { class: 'answered__track' },
                  h('span', { class: 'answered__fill', id: 't-answered-bar' }))))
          : h('div', { class: 'teacherq teacherq--phase' },
              state.phase === 'story' ? h('div', { class: 'teacherq__art', html: chaosVillain() }) : null,
              m.district === 'tower' && state.phase !== 'victory'
                ? h('div', { class: 'teacherq__art', html: chaosTower(state.chaos_hp) }) : null,
              h('h1', { class: 'display' }, phaseLabel),
              h('p', { class: 'lead' }, state.phase === 'reveal' && state.reveal
                ? `Правильно: ${state.reveal.correct_text || ''}`
                : m.subtitle),
              state.phase === 'reveal' && state.reveal?.explanation
                ? h('p', { class: 'muted' }, state.reveal.explanation) : null),

        m.district === 'tower' ? h('div', { class: 'chaosbar chaosbar--teacher' },
          h('div', { class: 'chaosbar__label' }, '❤️ ЭНЕРГИЯ ХАОСА'),
          h('div', { class: 'chaosbar__track' },
            h('span', { class: 'chaosbar__fill', id: 't-hp',
                        style: { width: `${state.chaos_hp}%` } }))) : null),

      h('aside', { class: 'live__side' },
        h('div', { class: 'side__title' }, 'КОМАНДЫ'),
        h('div', { class: 'tboard', id: 't-board' }, boardRows()),
        h('div', { class: 'side__title' }, 'УПРАВЛЕНИЕ'),
        h('div', { class: 'controls' },
          h('button', {
            class: 'btn btn--ctrl', type: 'button',
            onClick: () => net.send({ t: 'teacher', action: state.paused ? 'resume' : 'pause' }),
          }, state.paused ? '▶ ПРОДОЛЖИТЬ' : '⏸ ПАУЗА'),
          h('button', {
            class: 'btn btn--ctrl', type: 'button',
            onClick: () => net.send({ t: 'teacher', action: 'skip' }),
          }, '⏭ ПРОПУСТИТЬ'),
          h('button', {
            class: 'btn btn--ctrl', type: 'button',
            onClick: () => { net.send({ t: 'teacher', action: 'add_time', value: 300 });
                             toast('+5 минут к уроку'); },
          }, '＋5 МИН'),
          state.phase === 'question' ? h('button', {
            class: 'btn btn--ctrl', type: 'button',
            onClick: () => net.send({ t: 'teacher', action: 'extend_question', value: 15 }),
          }, '＋15 С К ЗАДАНИЮ') : null,
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

function renderFinal() {
  const ranking = state.ranking || [];
  fx.confettiRain(3000);
  const node = h('div', { class: 'screen screen--tfinal' },
    h('header', { class: 'livebar' },
      h('div', { class: 'livebar__brand' }, 'ЛИНГОГРАД'),
      h('div', { class: 'livebar__phase' }, '🏆 Итоги игры'),
      h('div', { class: 'livebar__clock' }, `${state.grade} класс`)),
    h('div', { class: 'tfinal' },
      h('div', null,
        h('h1', { class: 'display' }, '🏆 РЕЗУЛЬТАТЫ'),
        h('div', { class: 'results__list results__list--teacher' },
          ranking.map((t) => h('div', {
            class: `results__row ${t.place === 1 ? 'is-winner' : ''}`,
            style: { '--team': t.color },
          },
            h('span', { class: 'results__place' }, t.place === 1 ? '🥇' : `${t.place}`),
            h('span', { class: 'results__emoji' }, t.emoji),
            h('span', { class: 'results__name' }, t.name),
            h('span', { class: 'results__score' }, `${t.score}`),
            h('span', { class: 'results__acc' }, `${Math.round(t.accuracy * 100)}%`)))),
        h('div', { class: 'awards' },
          (state.awards || []).map((a) => h('div', { class: 'award' },
            h('span', { class: 'award__emoji' }, a.emoji),
            h('div', null,
              h('div', { class: 'award__title' }, a.title),
              h('div', { class: 'award__team' }, `${a.team.emoji} ${a.team.name}`),
              h('div', { class: 'award__value' }, a.value)))))),

      h('div', null,
        h('div', { class: 'side__title' }, 'РАЗБОР ДЛЯ УЧИТЕЛЯ'),
        h('div', { class: 'analytics', id: 'analytics' }, h('div', { class: 'loader' })),
        h('div', { class: 'controls controls--row' },
          ghostButton('Обновить разбор', loadAnalytics),
          ghostButton('Скачать CSV', downloadCsv),
          primaryButton('НОВАЯ ИГРА', () => {
            saveLocal('lg_teacher', null); session = null; net.close(); renderSetup();
          })))),
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
          h('div', { class: 'anal__icon' }, d.icon),
          h('div', { class: 'anal__title' }, d.title),
          h('div', { class: 'anal__value' }, `${Math.round(d.accuracy * 100)}%`),
          h('div', { class: 'anal__sub' }, `${d.correct} из ${d.answered} ответов`)))),
      h('div', { class: 'side__title' }, 'ТРУДНЫЕ ЗАДАНИЯ'),
      h('div', { class: 'anal__list' },
        (data.hardest || []).map((q) => h('div', { class: 'anal__row' },
          h('span', { class: 'anal__pct' }, `${Math.round(q.accuracy * 100)}%`),
          h('span', { class: 'anal__q' }, q.question),
          h('span', { class: 'anal__topic' }, q.topic)))),
      h('div', { class: 'side__title' }, 'ЛУЧШИЕ ИГРОКИ'),
      h('div', { class: 'anal__list' },
        (data.players || []).slice(0, 8).map((p, i) => h('div', { class: 'anal__row' },
          h('span', { class: 'anal__pct' }, `${i + 1}`),
          h('span', { class: 'anal__q' }, p.name),
          h('span', { class: 'anal__topic' }, `${p.score} · ${p.correct}/${p.answered}`)))));
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
  document.body.append(settingsButton());
  document.body.append(h('div', {
    class: 'netbanner', id: 'netbanner', hidden: true,
  }, '⚠ Связь потеряна. Переподключаемся…'));
}
