// Настройки звука (ТЗ §34): 🔊 Звук ON/OFF, 🎵 Музыка ON/OFF.

import { h } from './ui.js';
import { settings, setSfx, setMusic, startMusic, unlock, sfx } from './audio.js';

function toggleRow(label, get, set) {
  const btn = h('button', {
    class: `switch ${get() ? 'is-on' : ''}`, type: 'button',
    role: 'switch', 'aria-checked': String(get()),
    onClick: (e) => {
      unlock();
      const next = !get();
      set(next);
      e.currentTarget.classList.toggle('is-on', next);
      e.currentTarget.setAttribute('aria-checked', String(next));
      e.currentTarget.querySelector('.switch__state').textContent = next ? 'ВКЛ' : 'ВЫКЛ';
      if (next) sfx.select();
    },
  },
    h('span', { class: 'switch__knob' }),
    h('span', { class: 'switch__state' }, get() ? 'ВКЛ' : 'ВЫКЛ'));

  return h('div', { class: 'settings__row' }, h('span', null, label), btn);
}

export function settingsButton() {
  const panel = h('div', { class: 'settings', hidden: true },
    h('div', { class: 'settings__title' }, 'НАСТРОЙКИ'),
    toggleRow('🔊 Звук', () => settings.sfx, setSfx),
    toggleRow('🎵 Музыка', () => settings.music, (v) => { setMusic(v); if (v) startMusic(); }),
    h('p', { class: 'settings__hint' }, 'Настройки сохраняются на этом устройстве'));

  const btn = h('button', {
    class: 'settings-fab', type: 'button', 'aria-label': 'Настройки звука',
    onClick: () => { panel.hidden = !panel.hidden; unlock(); },
  }, '⚙');

  return h('div', { class: 'settings-wrap' }, panel, btn);
}
