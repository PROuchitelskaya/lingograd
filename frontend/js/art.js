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
  // Силуэт в шляпе с единственным горящим глазом: всё, что видно, —
  // тень на фоне багрового зарева и трещин, расползающихся по небу.
  const hurt = mood === 'hurt';
  return `
<svg class="art art--chaos chaos${hurt ? ' is-hurt' : ''}" viewBox="0 0 320 320" aria-hidden="true">
  <defs>
    <radialGradient id="chaosSky" cx="50%" cy="46%" r="62%">
      <stop offset="0%" stop-color="#8E1220"/>
      <stop offset="55%" stop-color="#43060F"/>
      <stop offset="100%" stop-color="#160309"/>
    </radialGradient>
    <linearGradient id="chaosEye" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#FFFFFF"/>
      <stop offset="38%" stop-color="#FF6A7A"/>
      <stop offset="100%" stop-color="#C4102A"/>
    </linearGradient>
    <filter id="chaosBlur" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="7"/>
    </filter>
    <filter id="chaosEyeGlow" x="-160%" y="-160%" width="420%" height="420%">
      <feGaussianBlur stdDeviation="5" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <clipPath id="chaosFrame"><rect x="0" y="0" width="320" height="320" rx="26"/></clipPath>
  </defs>

  <g clip-path="url(#chaosFrame)">
    <rect width="320" height="320" fill="url(#chaosSky)"/>

    <g class="chaos__cracks" stroke="#FF2E45" fill="none" stroke-linecap="round">
      <path d="M246 8 L262 74 L238 104 L268 150 L250 196 L286 250" stroke-width="3" opacity=".85"/>
      <path d="M282 40 L266 70 M258 118 L292 132 M262 210 L236 236" stroke-width="2" opacity=".6"/>
      <path d="M46 26 L26 78 L58 108 L30 150" stroke-width="2.4" opacity=".55"/>
      <path d="M18 196 L44 228 L20 262" stroke-width="2" opacity=".45"/>
    </g>

    <ellipse class="chaos__halo" cx="160" cy="150" rx="118" ry="104"
             fill="#FF1B33" opacity=".22" filter="url(#chaosBlur)"/>

    <g class="chaos__body" fill="#07060B">
      <!-- плечи с рваными пиками -->
      <path d="M18 320 L34 244 L62 268 L84 214 L112 250 L134 196
               L160 236 L186 196 L208 250 L236 214 L258 268 L286 244 L302 320 Z"/>
      <!-- голова -->
      <ellipse cx="160" cy="150" rx="62" ry="58"/>
      <!-- поля шляпы: широкие, с острыми концами -->
      <path d="M160 96 C214 96 268 104 300 116 L246 122 L288 138
               C246 152 202 158 160 158 C118 158 74 152 32 138 L74 122 L20 116
               C52 104 106 96 160 96 Z"/>
      <!-- тулья -->
      <path d="M112 100 C112 46 128 18 160 18 C192 18 208 46 208 100
               C192 92 128 92 112 100 Z"/>
      <!-- клинья, свисающие из-под полей -->
      <path d="M60 140 L96 154 L58 176 Z"/>
      <path d="M92 150 L124 164 L96 186 Z"/>
      <path d="M260 140 L224 154 L262 176 Z"/>
      <path d="M228 150 L196 164 L224 186 Z"/>
    </g>

    <g class="chaos__eye" filter="url(#chaosEyeGlow)">
      <path d="M132 ${hurt ? '160' : '156'} L188 ${hurt ? '160' : '156'}
               A 28 ${hurt ? '9' : '17'} 0 0 1 132 ${hurt ? '160' : '156'} Z"
            fill="url(#chaosEye)"/>
    </g>
  </g>
</svg>`;
}

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
/** Открытка «С Днём знаний»: тетрадный лист, осенние листья и школьный стол.
 *  Рисуем векторно — на телефоне это пара килобайт вместо мегабайта фотографии. */
export function knowledgeDay() {
  const leaf = (x, y, rot, scale, fill) => `
    <g transform="translate(${x} ${y}) rotate(${rot}) scale(${scale})">
      <path d="M0 0 C 16 -22 44 -26 58 -10 C 44 16 16 22 0 0 Z" fill="${fill}"/>
      <path d="M0 0 L 54 -8" stroke="#B9713A" stroke-width="1.6" opacity=".45" fill="none"/>
    </g>`;

  const maple = (x, y, rot, scale, fill) => `
    <path transform="translate(${x} ${y}) rotate(${rot}) scale(${scale})"
      d="M0 -20 L6 -8 L18 -14 L12 -2 L24 2 L11 6 L16 18 L3 11 L0 24
         L-3 11 L-16 18 L-11 6 L-24 2 L-12 -2 L-18 -14 L-6 -8 Z" fill="${fill}"/>`;

  return `
<svg class="art art--kday kday" viewBox="0 0 640 460" aria-hidden="true">
  <defs>
    <pattern id="kdGrid" width="26" height="26" patternUnits="userSpaceOnUse">
      <path d="M26 0 L0 0 0 26" fill="none" stroke="#C7D7EA" stroke-width="1" opacity=".7"/>
    </pattern>
    <linearGradient id="kdGlobe" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#BFD8EA"/><stop offset="100%" stop-color="#8FB6D4"/>
    </linearGradient>
    <filter id="kdSoft" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="18"/>
    </filter>
    <clipPath id="kdFrame"><rect width="640" height="460" rx="24"/></clipPath>
  </defs>

  <g clip-path="url(#kdFrame)">
    <rect width="640" height="460" fill="#FFFDF8"/>
    <rect width="640" height="460" fill="url(#kdGrid)"/>

    <g filter="url(#kdSoft)" opacity=".5">
      <ellipse cx="66" cy="52" rx="120" ry="72" fill="#F7CBA8"/>
      <ellipse cx="592" cy="86" rx="110" ry="80" fill="#BCD6EC"/>
      <ellipse cx="40" cy="404" rx="96" ry="66" fill="#BCD6EC"/>
      <ellipse cx="606" cy="392" rx="104" ry="70" fill="#F7CBA8"/>
    </g>

    <g class="kday__branch">
      <path d="M-6 26 C 60 44 120 66 176 104" stroke="#B9713A" stroke-width="3"
            fill="none" opacity=".6"/>
      ${leaf(24, 30, -24, 1.05, '#E8853A')}
      ${leaf(76, 52, 6, 0.95, '#F2AE4E')}
      ${leaf(120, 78, 28, 0.85, '#8FB6D4')}
      ${leaf(46, 74, 52, 0.8, '#D8603C')}
      <circle cx="104" cy="44" r="7" fill="#D8603C"/>
      <circle cx="120" cy="36" r="6" fill="#C4472C"/>
      <circle cx="112" cy="58" r="5" fill="#D8603C"/>
    </g>

    <g class="kday__plane">
      <path d="M470 96 L534 66 L516 122 L500 104 Z" fill="none" stroke="#1B3A6B"
            stroke-width="3" stroke-linejoin="round"/>
      <path d="M470 96 L500 104" stroke="#1B3A6B" stroke-width="3"/>
      <path d="M392 128 C 414 106 436 132 458 108" stroke="#1B3A6B" stroke-width="2.4"
            fill="none" stroke-dasharray="5 8" stroke-linecap="round" opacity=".65"/>
    </g>

    <g class="kday__bulb">
      <path d="M64 176 a20 20 0 1 1 30 0 c-4 6 -6 9 -6 15 h-18 c0 -6 -2 -9 -6 -15 Z"
            fill="#FFF3D6" stroke="#1B3A6B" stroke-width="2.6"/>
      <path d="M72 200 h14 M73 206 h12" stroke="#1B3A6B" stroke-width="2.6" stroke-linecap="round"/>
      <g stroke="#E0A93B" stroke-width="2.4" stroke-linecap="round">
        <path d="M52 150 L44 144"/><path d="M108 150 L116 144"/><path d="M80 132 L80 122"/>
      </g>
    </g>

    <g class="kday__title">
      <text x="336" y="200" text-anchor="middle" font-family="Caveat, Segoe Script, cursive"
            font-size="78" font-weight="700" fill="#1B3A6B">С Днём</text>
      <text x="322" y="276" text-anchor="middle" font-family="Caveat, Segoe Script, cursive"
            font-size="78" font-weight="700" fill="#1B3A6B">знаний!</text>
      <path d="M396 272 C 456 254 512 262 550 248" stroke="#E0A93B" stroke-width="6"
            fill="none" stroke-linecap="round"/>
      <g fill="#E0A93B">
        <path d="M474 292 l4 9 9 4 -9 4 -4 9 -4 -9 -9 -4 9 -4 Z"/>
        <path d="M240 150 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 Z"/>
      </g>
    </g>

    <rect x="0" y="392" width="640" height="68" fill="#EADFCB"/>
    <rect x="0" y="392" width="640" height="7" fill="#D9C9AC"/>

    <g>
      <rect x="46" y="352" width="150" height="20" rx="4" fill="#C2452E"/>
      <rect x="46" y="352" width="12" height="20" fill="#9E3423"/>
      <rect x="36" y="330" width="164" height="22" rx="4" fill="#E8DCC0"/>
      <rect x="36" y="330" width="12" height="22" fill="#CBBB97"/>
      <rect x="52" y="306" width="140" height="24" rx="4" fill="#1B3A6B"/>
      <rect x="52" y="306" width="12" height="24" fill="#12294D"/>
    </g>

    <g class="kday__bell">
      <path d="M122 244 v-14" stroke="#7A4B22" stroke-width="6" stroke-linecap="round"/>
      <path d="M96 300 c0 -34 12 -56 26 -56 s26 22 26 56 Z" fill="#E8B33C"/>
      <rect x="88" y="296" width="68" height="10" rx="5" fill="#C98F27"/>
      <circle cx="122" cy="309" r="7" fill="#C98F27"/>
      <path d="M122 246 l-20 -13 7 20 Z" fill="#1B3A6B"/>
      <path d="M122 246 l20 -13 -7 20 Z" fill="#24478A"/>
      <circle cx="122" cy="244" r="5" fill="#1B3A6B"/>
    </g>

    <g>
      <g stroke-linecap="round">
        <path d="M300 306 v-56" stroke="#E8B33C" stroke-width="8"/>
        <path d="M314 306 v-66" stroke="#1B3A6B" stroke-width="8"/>
        <path d="M328 306 v-48" stroke="#8FB6D4" stroke-width="8"/>
        <path d="M342 306 v-62" stroke="#C2452E" stroke-width="8"/>
      </g>
      <path d="M288 306 h66 l-6 56 h-54 Z" fill="#1B3A6B"/>
      <path d="M292 318 h58 M292 332 h58 M292 346 h56" stroke="#3D5F94" stroke-width="2"/>
    </g>

    <g class="kday__globe">
      <circle cx="512" cy="308" r="52" fill="url(#kdGlobe)"/>
      <path d="M486 268 q22 14 6 34 q-16 18 10 26 q22 8 14 30" stroke="#E8B33C"
            stroke-width="7" fill="none" opacity=".85" stroke-linecap="round"/>
      <path d="M540 278 q-12 22 10 30 q16 6 6 22" stroke="#7FA86A" stroke-width="7"
            fill="none" opacity=".8" stroke-linecap="round"/>
      <path d="M460 308 a52 52 0 0 0 104 0" stroke="#1B3A6B" stroke-width="3"
            fill="none" opacity=".3"/>
      <path d="M512 256 a34 52 0 0 0 0 104 a34 52 0 0 0 0 -104" stroke="#1B3A6B"
            stroke-width="3" fill="none" opacity=".28"/>
      <path d="M470 296 a52 52 0 0 1 80 -30" stroke="#FFFFFF" stroke-width="4"
            fill="none" opacity=".4"/>
      <path d="M512 360 v20" stroke="#1B3A6B" stroke-width="7"/>
      <path d="M486 380 h52 l6 12 h-64 Z" fill="#1B3A6B"/>
    </g>

    <g>
      <path d="M206 390 q70 -20 118 0 q-58 16 -118 0 Z" fill="#FFFDF8"
            stroke="#D6C8AE" stroke-width="2"/>
      <path d="M214 384 h44 M214 378 h40 M278 384 h40 M278 378 h36"
            stroke="#C7D7EA" stroke-width="2"/>
      <path d="M298 374 l28 -16" stroke="#1B3A6B" stroke-width="4" stroke-linecap="round"/>
    </g>

    <g class="kday__fall">
      ${maple(392, 374, 12, 0.9, '#E8853A')}
      ${maple(600, 358, -16, 0.8, '#D8603C')}
      ${maple(178, 300, 24, 0.6, '#F2AE4E')}
    </g>
  </g>
</svg>`;
}

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

/* Хранители букв — маленькие жители Лингограда, которые держат таблички
   с вариантами ответа. Шесть разных силуэтов, чтобы варианты различались
   не только буквой: ребёнок с задней парты видит, за кого голосует сосед. */

const KEEPER_COLORS = ['#3155D9', '#F28C38', '#55B77A', '#7357C8', '#E85B5B', '#2A9D9A'];

const KEEPER_HATS = [
  // антенка с шариком
  '<path d="M24 9 L24 3" stroke="COLOR" stroke-width="2.4" stroke-linecap="round"/>' +
  '<circle cx="24" cy="2" r="3" fill="#FFC94A"/>',
  // ушки
  '<path d="M15 10 L12 2 L21 7 Z" fill="COLOR"/><path d="M33 10 L36 2 L27 7 Z" fill="COLOR"/>',
  // хохолок
  '<path d="M20 7 L18 1 M24 6 L24 0 M28 7 L30 1" stroke="COLOR" stroke-width="2.4" stroke-linecap="round"/>',
  // книжка на голове
  '<rect x="15" y="1" width="18" height="7" rx="2" fill="COLOR"/>' +
  '<path d="M24 1 L24 8" stroke="#FFF8ED" stroke-width="1.6"/>',
  // бантик
  '<path d="M24 7 L17 2 L18 9 Z" fill="#FFC94A"/><path d="M24 7 L31 2 L30 9 Z" fill="#FFC94A"/>' +
  '<circle cx="24" cy="7" r="2.4" fill="COLOR"/>',
  // колпачок
  '<path d="M24 0 L32 10 L16 10 Z" fill="COLOR"/><circle cx="24" cy="0.5" r="2.4" fill="#FFC94A"/>',
];

/**
 * Хранитель с табличкой.
 * @param {number} index  порядковый номер варианта — задаёт цвет и силуэт
 * @param {string} sign   что написано на табличке (буква варианта, галочка)
 */
export function keeper(index = 0, sign = '') {
  const color = KEEPER_COLORS[index % KEEPER_COLORS.length];
  const hat = KEEPER_HATS[index % KEEPER_HATS.length].replaceAll('COLOR', color);
  return `
<svg class="keeper" viewBox="0 0 48 56" aria-hidden="true">
  <g class="keeper__body">
    ${hat}
    <path d="M24 10 C33 10 38 16 38 25 C38 34 33 39 24 39 C15 39 10 34 10 25 C10 16 15 10 24 10 Z"
          fill="${color}"/>
    <g class="keeper__face">
      <circle class="keeper__eye" cx="19" cy="23" r="4.2" fill="#FFF8ED"/>
      <circle class="keeper__eye" cx="29" cy="23" r="4.2" fill="#FFF8ED"/>
      <circle class="keeper__pupil" cx="19.8" cy="23.6" r="2" fill="#20243A"/>
      <circle class="keeper__pupil" cx="29.8" cy="23.6" r="2" fill="#20243A"/>
      <path class="keeper__mouth" d="M20 30.5 q4 3.4 8 0" stroke="#FFF8ED" stroke-width="2"
            fill="none" stroke-linecap="round"/>
    </g>
  </g>
  <g class="keeper__arms" stroke="${color}" stroke-width="3" stroke-linecap="round">
    <path d="M12 30 L7 41"/><path d="M36 30 L41 41"/>
  </g>
  <g class="keeper__sign">
    <rect x="6" y="40" width="36" height="15" rx="4" fill="#FFF8ED" stroke="${color}" stroke-width="2"/>
    <text x="24" y="51.4" text-anchor="middle" font-family="Manrope, sans-serif"
          font-weight="800" font-size="11" fill="${color}">${sign}</text>
  </g>
</svg>`;
}

/** Крупный хранитель для экрана разбора: радуется или подбадривает. */
export function keeperBig(mood = 'idle') {
  const color = mood === 'ok' ? '#55B77A' : mood === 'no' ? '#F28C38' : '#3155D9';
  const mouth = mood === 'ok' ? 'M28 46 q12 11 24 0' : mood === 'no' ? 'M28 50 q12 -7 24 0' : 'M30 47 q10 6 20 0';
  const arms = mood === 'ok'
    ? '<path d="M16 46 L4 30"/><path d="M64 46 L76 30"/>'      // руки вверх
    : '<path d="M16 46 L6 60"/><path d="M64 46 L74 60"/>';
  return `
<svg class="keeper keeper--big keeper--${mood}" viewBox="0 0 80 84" aria-hidden="true">
  <path d="M40 6 L40 -2" stroke="${color}" stroke-width="3" stroke-linecap="round"/>
  <circle cx="40" cy="-1" r="4" fill="#FFC94A"/>
  <path d="M40 8 C58 8 68 20 68 38 C68 56 58 66 40 66 C22 66 12 56 12 38 C12 20 22 8 40 8 Z"
        fill="${color}"/>
  <g class="keeper__face">
    <circle class="keeper__eye" cx="30" cy="34" r="7" fill="#FFF8ED"/>
    <circle class="keeper__eye" cx="50" cy="34" r="7" fill="#FFF8ED"/>
    <circle class="keeper__pupil" cx="31.4" cy="35" r="3.2" fill="#20243A"/>
    <circle class="keeper__pupil" cx="51.4" cy="35" r="3.2" fill="#20243A"/>
    <path d="${mouth}" stroke="#FFF8ED" stroke-width="3.4" fill="none" stroke-linecap="round"/>
  </g>
  <g class="keeper__arms" stroke="${color}" stroke-width="5" stroke-linecap="round">${arms}</g>
</svg>`;
}
