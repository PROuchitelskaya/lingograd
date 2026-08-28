// Звук игры целиком синтезируется в браузере (ТЗ §34): ни одного mp3 —
// игра работает в школе без интернета и грузится мгновенно.

import { readLocal, saveLocal } from './ui.js';

let ctx = null;
let master = null;
let musicGain = null;
let sfxGain = null;
let musicTimer = null;
let musicStep = 0;

export const settings = {
  sfx: readLocal('lg_sfx', true),
  music: readLocal('lg_music', true),
};

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(ctx.destination);

  sfxGain = ctx.createGain();
  sfxGain.gain.value = settings.sfx ? 1 : 0;
  sfxGain.connect(master);

  musicGain = ctx.createGain();
  musicGain.gain.value = settings.music ? 0.17 : 0;
  musicGain.connect(master);
  return ctx;
}

export function unlock() {
  const c = ensure();
  if (c && c.state === 'suspended') c.resume();
}

export function setSfx(on) {
  settings.sfx = on;
  saveLocal('lg_sfx', on);
  if (sfxGain) sfxGain.gain.value = on ? 1 : 0;
}

export function setMusic(on) {
  settings.music = on;
  saveLocal('lg_music', on);
  if (musicGain) musicGain.gain.setTargetAtTime(on ? 0.17 : 0, ctx.currentTime, 0.2);
  if (on) startMusic(); else stopMusic();
}

// ---------------------------------------------------------------- примитивы

function tone({ freq = 440, type = 'sine', start = 0, dur = 0.3, gain = 0.3,
                glide = null, target = sfxGain }) {
  const c = ensure();
  if (!c) return;
  const t0 = c.currentTime + start;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (glide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, glide), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + Math.min(0.02, dur / 4));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(target || sfxGain);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noise({ start = 0, dur = 0.3, gain = 0.2, type = 'bandpass',
                 freq = 1200, q = 1, sweep = null }) {
  const c = ensure();
  if (!c) return;
  const t0 = c.currentTime + start;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = type;
  filter.frequency.setValueAtTime(freq, t0);
  filter.Q.value = q;
  if (sweep) filter.frequency.exponentialRampToValueAtTime(sweep, t0 + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter).connect(g).connect(sfxGain);
  src.start(t0);
  src.stop(t0 + dur + 0.05);
}

/** Школьный звонок: металлический «динь-дон» из негармоничных призвуков. */
function ding(start = 0, base = 900, dur = 1.4, gain = 0.22) {
  [1, 2.02, 2.98, 4.1].forEach((mult, i) => {
    tone({ freq: base * mult, type: 'sine', start, dur: dur / (1 + i * 0.45),
           gain: gain / (1 + i * 1.3) });
  });
  noise({ start, dur: 0.08, gain: 0.05, freq: 4200, q: 0.7 });
}

// ---------------------------------------------------------------- эффекты

export const sfx = {
  start() {
    unlock();
    noise({ dur: 0.5, gain: 0.12, freq: 320, sweep: 3600, q: 0.8 });
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      tone({ freq: f, type: 'triangle', start: 0.06 * i, dur: 0.5, gain: 0.16 }));
  },
  bell() {                       // школьный звонок (ТЗ §14)
    ding(0, 1046, 1.5, 0.26);
    ding(0.42, 784, 1.7, 0.24);
  },
  correct() {                    // короткий, радостный (ТЗ §19)
    [659.25, 830.61, 987.77].forEach((f, i) =>
      tone({ freq: f, type: 'triangle', start: i * 0.055, dur: 0.32, gain: 0.2 }));
  },
  wrong() {                      // мягкий, без наказания (ТЗ §20)
    tone({ freq: 300, type: 'sine', dur: 0.22, gain: 0.16, glide: 220 });
    tone({ freq: 200, type: 'sine', start: 0.1, dur: 0.26, gain: 0.12, glide: 160 });
  },
  crystal() {                    // кристаллы летят в счётчик
    for (let i = 0; i < 5; i++) {
      tone({ freq: 1400 + i * 260, type: 'sine', start: i * 0.045, dur: 0.22,
             gain: 0.11, glide: 2400 + i * 260 });
    }
  },
  transition() {                 // переход между районами
    noise({ dur: 0.55, gain: 0.1, freq: 240, sweep: 2600, q: 0.6 });
    tone({ freq: 220, type: 'triangle', dur: 0.5, gain: 0.1, glide: 660 });
  },
  chaos() {                      // появление Хаоса
    tone({ freq: 92, type: 'sawtooth', dur: 1.3, gain: 0.16, glide: 58 });
    tone({ freq: 138, type: 'square', dur: 1.1, gain: 0.06, glide: 70 });
    noise({ dur: 1.0, gain: 0.08, freq: 900, sweep: 180, q: 0.9 });
  },
  hit() {                        // удар по башне Хаоса
    tone({ freq: 520, type: 'square', dur: 0.16, gain: 0.14, glide: 180 });
    noise({ dur: 0.24, gain: 0.12, freq: 1800, sweep: 400, q: 0.7 });
  },
  boom() {                       // Хаос рассыпается на буквы
    noise({ dur: 1.4, gain: 0.3, freq: 1600, sweep: 90, q: 0.4 });
    tone({ freq: 160, type: 'sawtooth', dur: 1.1, gain: 0.2, glide: 44 });
    [523, 659, 784, 1046, 1318].forEach((f, i) =>
      tone({ freq: f, type: 'triangle', start: 0.35 + i * 0.07, dur: 0.7, gain: 0.14 }));
  },
  confetti() {
    noise({ dur: 0.35, gain: 0.16, freq: 2600, sweep: 5200, q: 0.5 });
  },
  victory() {                    // финальная победа
    const chord = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    chord.forEach((f, i) => tone({ freq: f, type: 'triangle', start: i * 0.09,
                                   dur: 1.6, gain: 0.16 }));
    ding(0.7, 1046, 2.2, 0.2);
  },
  tick() {                       // последние секунды таймера
    tone({ freq: 1200, type: 'sine', dur: 0.07, gain: 0.09 });
  },
  select() {
    tone({ freq: 700, type: 'sine', dur: 0.09, gain: 0.09 });
  },
};

// ---------------------------------------------------------------- музыка

// Лёгкая приключенческая тема: I–V–vi–IV в ля-мажоре, арпеджио + мягкий бас.
const PROGRESSION = [
  [220.0, 277.18, 329.63],  // A
  [164.81, 207.65, 246.94], // E
  [185.0, 220.0, 277.18],   // F#m
  [146.83, 185.0, 220.0],   // D
];

export function startMusic() {
  const c = ensure();
  if (!c || !settings.music || musicTimer) return;
  musicStep = 0;
  const beat = 0.42;
  musicTimer = setInterval(() => {
    if (!settings.music) return;
    const chord = PROGRESSION[Math.floor(musicStep / 4) % PROGRESSION.length];
    const note = chord[musicStep % 3];
    tone({ freq: note * 2, type: 'triangle', dur: beat * 1.25, gain: 0.06,
           target: musicGain });
    if (musicStep % 4 === 0) {
      tone({ freq: chord[0] / 2, type: 'sine', dur: beat * 2.4, gain: 0.09,
             target: musicGain });
    }
    if (musicStep % 8 === 4) {
      tone({ freq: note * 3, type: 'sine', dur: beat * 0.6, gain: 0.035,
             target: musicGain });
    }
    musicStep++;
  }, beat * 1000);
}

export function stopMusic() {
  if (musicTimer) clearInterval(musicTimer);
  musicTimer = null;
}

/** В Башне Хаоса музыка становится темнее — меняем регистр темы. */
export function setMood(mood) {
  if (!musicGain || !ctx) return;
  musicGain.gain.setTargetAtTime(
    settings.music ? (mood === 'dark' ? 0.13 : 0.17) : 0, ctx.currentTime, 0.4);
}
