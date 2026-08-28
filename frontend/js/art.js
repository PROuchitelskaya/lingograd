// Иллюстрации игры — инлайновый SVG: крупные формы, мягкие скругления,
// без «мультяшности» и 3D (ТЗ §4). Всё векторное, поэтому не мылится на проекторе.

export function cityScene() {
  return `
<svg class="art art--city" viewBox="0 0 1200 520" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#DCE6FF"/><stop offset="55%" stop-color="#FFF1DC"/>
      <stop offset="100%" stop-color="#FFF8ED"/>
    </linearGradient>
    <linearGradient id="towerGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#3155D9"/><stop offset="100%" stop-color="#7357C8"/>
    </linearGradient>
    <linearGradient id="roof" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#E85B5B"/><stop offset="100%" stop-color="#C6413F"/>
    </linearGradient>
    <radialGradient id="sun" cx="50%" cy="50%">
      <stop offset="0%" stop-color="#FFE9A8"/><stop offset="100%" stop-color="#FFE9A8" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#F6E3BE"/><stop offset="100%" stop-color="#EED9AE"/>
    </linearGradient>
  </defs>

  <rect width="1200" height="520" fill="url(#sky)"/>
  <circle cx="985" cy="120" r="190" fill="url(#sun)"/>
  <circle cx="985" cy="120" r="46" fill="#FFC94A" opacity=".95"/>

  <g fill="#FFFFFF" opacity=".85">
    <ellipse cx="180" cy="96" rx="66" ry="26"/><ellipse cx="232" cy="86" rx="46" ry="22"/>
    <ellipse cx="742" cy="70" rx="54" ry="21"/><ellipse cx="790" cy="62" rx="38" ry="17"/>
  </g>

  <!-- Башня Лингограда со светящимися буквами -->
  <g transform="translate(560 60)">
    <path d="M0 300 L0 96 Q0 70 26 70 L74 70 Q100 70 100 96 L100 300 Z" fill="url(#towerGrad)"/>
    <path d="M-14 96 L50 18 L114 96 Z" fill="#2A3576"/>
    <circle cx="50" cy="8" r="9" fill="#FFC94A"/>
    <g fill="#FFF8ED" font-family="Manrope,sans-serif" font-weight="800" font-size="26"
       text-anchor="middle" opacity=".92">
      <text x="50" y="140">А</text><text x="50" y="196">Б</text><text x="50" y="252">В</text>
    </g>
    <rect x="18" y="270" width="64" height="30" rx="8" fill="#FFC94A" opacity=".9"/>
  </g>

  <!-- Школа -->
  <g transform="translate(120 190)">
    <rect x="0" y="60" width="420" height="180" rx="14" fill="#FFFFFF"/>
    <path d="M-18 62 L210 -8 L438 62 Z" fill="url(#roof)"/>
    <rect x="176" y="130" width="68" height="110" rx="8" fill="#3155D9"/>
    <g fill="#DCE6FF">
      <rect x="34" y="104" width="52" height="46" rx="7"/><rect x="106" y="104" width="52" height="46" rx="7"/>
      <rect x="262" y="104" width="52" height="46" rx="7"/><rect x="334" y="104" width="52" height="46" rx="7"/>
      <rect x="34" y="172" width="52" height="46" rx="7"/><rect x="334" y="172" width="52" height="46" rx="7"/>
    </g>
    <circle cx="210" cy="42" r="20" fill="#FFF8ED" stroke="#20243A" stroke-width="3"/>
    <path d="M210 42 L210 30 M210 42 L219 46" stroke="#20243A" stroke-width="3" stroke-linecap="round"/>
    <g stroke="#20243A" stroke-width="4" stroke-linecap="round">
      <path d="M406 -6 L406 -58"/>
    </g>
    <path d="M406 -58 L452 -46 L406 -34 Z" fill="#FFC94A"/>
  </g>

  <!-- Деревья с золотой листвой -->
  <g>
    <g transform="translate(760 250)">
      <rect x="-7" y="0" width="14" height="90" rx="6" fill="#8C5A2B"/>
      <circle cx="0" cy="-18" r="58" fill="#F28C38"/><circle cx="-42" cy="6" r="40" fill="#FFC94A"/>
      <circle cx="40" cy="4" r="38" fill="#E8A93C"/>
    </g>
    <g transform="translate(1080 268)">
      <rect x="-6" y="0" width="12" height="78" rx="6" fill="#8C5A2B"/>
      <circle cx="0" cy="-14" r="48" fill="#E8A93C"/><circle cx="-34" cy="8" r="32" fill="#F28C38"/>
    </g>
    <g transform="translate(66 300)">
      <rect x="-6" y="0" width="12" height="62" rx="6" fill="#8C5A2B"/>
      <circle cx="0" cy="-12" r="42" fill="#FFC94A"/><circle cx="30" cy="6" r="28" fill="#F28C38"/>
    </g>
  </g>

  <rect y="352" width="1200" height="168" fill="url(#ground)"/>
  <path d="M0 352 Q300 330 600 352 T1200 352 L1200 372 L0 372 Z" fill="#E6CE9C" opacity=".6"/>

  <!-- Ученики с рюкзаками и шариками -->
  <g transform="translate(330 300)">
    <g>
      <circle cx="0" cy="0" r="17" fill="#20243A"/>
      <path d="M-17 22 Q0 12 17 22 L21 74 L-21 74 Z" fill="#3155D9"/>
      <rect x="14" y="28" width="20" height="28" rx="7" fill="#E85B5B"/>
      <path d="M22 28 L60 -70" stroke="#20243A" stroke-width="2"/>
      <ellipse cx="62" cy="-82" rx="17" ry="21" fill="#E85B5B"/>
    </g>
    <g transform="translate(78 8)">
      <circle cx="0" cy="0" r="16" fill="#4A3728"/>
      <path d="M-16 20 Q0 10 16 20 L20 66 L-20 66 Z" fill="#7357C8"/>
      <rect x="-34" y="26" width="19" height="26" rx="7" fill="#FFC94A"/>
      <path d="M-24 26 L-58 -58" stroke="#20243A" stroke-width="2"/>
      <ellipse cx="-60" cy="-70" rx="16" ry="20" fill="#FFC94A"/>
    </g>
    <g transform="translate(158 16)">
      <circle cx="0" cy="0" r="15" fill="#20243A"/>
      <path d="M-15 19 Q0 9 15 19 L18 58 L-18 58 Z" fill="#55B77A"/>
      <rect x="12" y="24" width="17" height="24" rx="6" fill="#3155D9"/>
    </g>
  </g>

  <!-- Опавшие листья -->
  <g opacity=".9">
    <ellipse cx="180" cy="452" rx="13" ry="7" fill="#F28C38" transform="rotate(-18 180 452)"/>
    <ellipse cx="620" cy="480" rx="12" ry="6" fill="#FFC94A" transform="rotate(24 620 480)"/>
    <ellipse cx="920" cy="440" rx="14" ry="7" fill="#E85B5B" transform="rotate(-8 920 440)"/>
    <ellipse cx="1040" cy="486" rx="12" ry="6" fill="#F28C38" transform="rotate(32 1040 486)"/>
    <ellipse cx="410" cy="492" rx="13" ry="6" fill="#E8A93C" transform="rotate(-30 410 492)"/>
  </g>
</svg>`;
}

/** Хаос — смешной цифровой злодей из букв и клякс (ТЗ §15). */
export function chaosVillain(mood = 'normal') {
  const eye = mood === 'hurt' ? 8 : 13;
  return `
<svg class="art art--chaos" viewBox="0 0 320 300" aria-hidden="true">
  <defs>
    <linearGradient id="chaosBody" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#7357C8"/><stop offset="100%" stop-color="#3155D9"/>
    </linearGradient>
    <filter id="chaosGlow"><feGaussianBlur stdDeviation="6" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <g filter="url(#chaosGlow)">
    <path d="M160 26 C232 26 276 76 276 142 C276 210 232 258 160 258
             C88 258 44 210 44 142 C44 76 88 26 160 26 Z" fill="url(#chaosBody)"/>
  </g>
  <path d="M64 118 q22 -16 40 2 t42 -4 t44 6 t46 -8" stroke="#FFC94A" stroke-width="5"
        fill="none" opacity=".55" stroke-linecap="round"/>
  <g fill="#FFF8ED">
    <circle cx="118" cy="130" r="26"/><circle cx="204" cy="130" r="26"/>
  </g>
  <g fill="#20243A">
    <circle cx="124" cy="134" r="${eye}"/><circle cx="198" cy="134" r="${eye}"/>
  </g>
  <path d="M112 190 q48 ${mood === 'hurt' ? '-26' : '34'} 96 0" stroke="#FFF8ED" stroke-width="9"
        fill="none" stroke-linecap="round"/>
  <g font-family="Manrope,sans-serif" font-weight="800" fill="#FFC94A" font-size="22">
    <text x="28" y="60" transform="rotate(-18 28 60)">Ж</text>
    <text x="272" y="72" transform="rotate(16 272 72)">Э</text>
    <text x="16" y="212" transform="rotate(12 16 212)">,</text>
    <text x="286" y="206" transform="rotate(-14 286 206)">?</text>
    <text x="150" y="16" transform="rotate(6 150 16)">Ъ</text>
  </g>
  <g fill="#20243A" opacity=".55">
    <ellipse cx="76" cy="248" rx="20" ry="9"/><ellipse cx="246" cy="252" rx="15" ry="7"/>
  </g>
</svg>`;
}

/** Башня Хаоса: буквы вращаются вокруг ядра (ТЗ §26). */
export function chaosTower(hp = 100) {
  const letters = ['А', 'Б', 'В', 'Г', 'Д', 'Е', 'Ж', 'З', 'И', 'К'];
  const rings = letters.map((ch, i) => {
    const y = 300 - i * 27;
    const scale = 1 - i * 0.045;
    const dim = (100 - hp) / 100 > i / letters.length ? 0.25 : 1;
    return `<g transform="translate(150 ${y}) scale(${scale})" opacity="${dim}">
      <rect x="-58" y="-19" width="116" height="34" rx="12" fill="${i % 2 ? '#3155D9' : '#7357C8'}"/>
      <text x="0" y="8" text-anchor="middle" font-family="Manrope,sans-serif"
            font-weight="800" font-size="21" fill="#FFF8ED">${ch}</text></g>`;
  }).join('');
  return `
<svg class="art art--tower" viewBox="0 0 300 340" aria-hidden="true">
  <defs><radialGradient id="towerAura" cx="50%" cy="50%">
    <stop offset="0%" stop-color="#E85B5B" stop-opacity=".5"/>
    <stop offset="100%" stop-color="#E85B5B" stop-opacity="0"/></radialGradient></defs>
  <circle cx="150" cy="170" r="150" fill="url(#towerAura)"/>
  ${rings}
  <ellipse cx="150" cy="322" rx="86" ry="14" fill="#0F1436" opacity=".55"/>
</svg>`;
}

/** Мост, который восстанавливается по мере верных ответов (ТЗ §24). */
export function bridge(done = 0, total = 6) {
  const spans = Array.from({ length: total }, (_, i) => {
    const x = 30 + i * (540 / total);
    const w = 540 / total - 12;
    const built = i < done;
    return `<g>
      <rect x="${x}" y="96" width="${w}" height="20" rx="8"
            fill="${built ? '#F28C38' : 'rgba(32,36,58,.12)'}"/>
      ${built ? `<path d="M${x} 116 q${w / 2} 42 ${w} 0" stroke="#FFC94A" stroke-width="7"
             fill="none" stroke-linecap="round"/>` : ''}
      <text x="${x + w / 2}" y="88" text-anchor="middle" font-family="Manrope,sans-serif"
            font-weight="800" font-size="17" fill="${built ? '#20243A' : 'rgba(32,36,58,.25)'}">
        ${'СЛОВО'[i % 5]}</text></g>`;
  }).join('');
  return `
<svg class="art art--bridge" viewBox="0 0 600 170" aria-hidden="true">
  <rect x="0" y="150" width="600" height="20" rx="6" fill="#F6E3BE"/>
  <g>${spans}</g>
  <rect x="6" y="60" width="22" height="90" rx="7" fill="#3155D9"/>
  <rect x="572" y="60" width="22" height="90" rx="7" fill="#3155D9"/>
</svg>`;
}

/** Школьный звонок для финала (ТЗ §28). */
export function schoolBell() {
  return `
<svg class="art art--bell" viewBox="0 0 200 220" aria-hidden="true">
  <defs><linearGradient id="bellGrad" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#FFD979"/><stop offset="100%" stop-color="#E0952A"/></linearGradient></defs>
  <rect x="94" y="8" width="12" height="34" rx="6" fill="#8C5A2B"/>
  <path d="M100 42 C150 42 168 92 172 152 L28 152 C32 92 50 42 100 42 Z" fill="url(#bellGrad)"/>
  <rect x="16" y="152" width="168" height="20" rx="10" fill="#C77F22"/>
  <circle cx="100" cy="186" r="15" fill="#E0952A"/>
  <path d="M62 74 q26 -18 52 -4" stroke="#FFF1CB" stroke-width="7" fill="none" stroke-linecap="round"/>
</svg>`;
}

/** Иконка кристалла для счётчика очков. */
export function crystal(size = 22) {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true">
    <path d="M12 2 L20 9 L12 22 L4 9 Z" fill="#FFC94A"/>
    <path d="M12 2 L20 9 L12 22 Z" fill="#F28C38"/>
    <path d="M4 9 H20" stroke="#FFF8ED" stroke-width="1.2" opacity=".7"/></svg>`;
}

/** Фон карты Лингограда: река, дороги, кварталы (ТЗ §16). */
export function cityMap() {
  return `
<svg class="art art--map" viewBox="0 0 1000 560" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <defs>
    <linearGradient id="mapBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FFF8ED"/><stop offset="100%" stop-color="#FBEBCF"/>
    </linearGradient>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M40 0 L0 0 0 40" fill="none" stroke="rgba(32,36,58,.06)" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="1000" height="560" fill="url(#mapBg)"/>
  <rect width="1000" height="560" fill="url(#grid)"/>
  <path d="M-20 420 Q220 360 420 430 T1020 380" stroke="#BBD5F5" stroke-width="42"
        fill="none" opacity=".75" stroke-linecap="round"/>
  <path d="M80 520 Q260 300 500 300 T900 120" stroke="#EBD8B0" stroke-width="26"
        fill="none" stroke-linecap="round"/>
  <path d="M120 120 Q380 180 560 120 T940 300" stroke="#EBD8B0" stroke-width="18"
        fill="none" stroke-linecap="round" opacity=".8"/>
  <g fill="rgba(49,85,217,.07)">
    <rect x="120" y="60" width="150" height="90" rx="18"/>
    <rect x="700" y="420" width="180" height="100" rx="18"/>
    <rect x="420" y="470" width="140" height="70" rx="18"/>
  </g>
  <g fill="#F28C38" opacity=".5">
    <circle cx="180" cy="330" r="7"/><circle cx="880" cy="220" r="6"/><circle cx="520" cy="90" r="5"/>
  </g>
</svg>`;
}
