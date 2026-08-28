// Генератор QR-кода (ISO/IEC 18004), byte-mode, версии 1–10, уровни L/M.
// Своя реализация вместо CDN-библиотеки: экран подключения обязан работать
// в школьной сети без интернета (ТЗ §12).

// --- Таблицы -------------------------------------------------------------
// [ecc на блок, [блоков, данных в блоке], [блоков, данных в блоке]]
const ECC_TABLE = {
  L: {
    1: [7, [1, 19]], 2: [10, [1, 34]], 3: [15, [1, 55]], 4: [20, [1, 80]],
    5: [26, [1, 108]], 6: [18, [2, 68]], 7: [20, [2, 78]], 8: [24, [2, 97]],
    9: [30, [2, 116]], 10: [18, [2, 68], [2, 69]],
  },
  M: {
    1: [10, [1, 16]], 2: [16, [1, 28]], 3: [26, [1, 44]], 4: [18, [2, 32]],
    5: [24, [2, 43]], 6: [16, [4, 27]], 7: [18, [4, 31]], 8: [22, [2, 38], [2, 39]],
    9: [22, [3, 36], [2, 37]], 10: [26, [4, 43], [1, 44]],
  },
};

const ALIGN = {
  1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34],
  7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50],
};

// --- Поле Галуа GF(256) --------------------------------------------------
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();

const gmul = (a, b) => (a === 0 || b === 0) ? 0 : EXP[LOG[a] + LOG[b]];

function rsGenerator(degree) {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const next = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= gmul(poly[j], EXP[i]);
      next[j + 1] ^= poly[j];
    }
    poly = next;
  }
  return poly;
}

function rsEncode(data, eccLen) {
  // rsGenerator отдаёт коэффициенты от младшей степени к старшей, а деление
  // в столбик идёт от старшей: разворачиваем и отбрасываем ведущую единицу.
  const gen = rsGenerator(eccLen).slice(0, eccLen).reverse();
  const res = new Array(eccLen).fill(0);
  for (const byte of data) {
    const factor = byte ^ res[0];
    res.shift();
    res.push(0);
    for (let i = 0; i < eccLen; i++) res[i] ^= gmul(gen[i], factor);
  }
  return res;
}

// --- Битовый поток -------------------------------------------------------
class BitBuffer {
  constructor() { this.bits = []; }
  put(value, length) {
    for (let i = length - 1; i >= 0; i--) this.bits.push((value >>> i) & 1);
  }
  get length() { return this.bits.length; }
  toBytes() {
    const bytes = [];
    for (let i = 0; i < this.bits.length; i += 8) {
      let b = 0;
      for (let j = 0; j < 8; j++) b = (b << 1) | (this.bits[i + j] || 0);
      bytes.push(b);
    }
    return bytes;
  }
}

function pickVersion(byteLen, level) {
  for (let v = 1; v <= 10; v++) {
    const [ecc, g1, g2] = ECC_TABLE[level][v];
    const dataCodewords = g1[0] * g1[1] + (g2 ? g2[0] * g2[1] : 0);
    const countBits = v < 10 ? 8 : 16;
    if (4 + countBits + byteLen * 8 <= dataCodewords * 8) return v;
  }
  throw new Error('Строка слишком длинная для QR версии 10');
}

function buildCodewords(bytes, version, level) {
  const [eccLen, g1, g2] = ECC_TABLE[level][version];
  const totalData = g1[0] * g1[1] + (g2 ? g2[0] * g2[1] : 0);
  const buf = new BitBuffer();
  buf.put(0b0100, 4);                                  // byte mode
  buf.put(bytes.length, version < 10 ? 8 : 16);
  for (const b of bytes) buf.put(b, 8);
  const capacity = totalData * 8;
  buf.put(0, Math.min(4, capacity - buf.length));      // терминатор
  while (buf.length % 8) buf.bits.push(0);
  const data = buf.toBytes();
  const PAD = [0xec, 0x11];
  let i = 0;
  while (data.length < totalData) data.push(PAD[i++ % 2]);

  // блоки
  const blocks = [];
  let pos = 0;
  const groups = g2 ? [g1, g2] : [g1];
  for (const [count, size] of groups) {
    for (let b = 0; b < count; b++) {
      const chunk = data.slice(pos, pos + size);
      pos += size;
      blocks.push({ data: chunk, ecc: rsEncode(chunk, eccLen) });
    }
  }

  // чередование
  const out = [];
  const maxData = Math.max(...blocks.map((b) => b.data.length));
  for (let i2 = 0; i2 < maxData; i2++) {
    for (const b of blocks) if (i2 < b.data.length) out.push(b.data[i2]);
  }
  for (let i2 = 0; i2 < eccLen; i2++) {
    for (const b of blocks) out.push(b.ecc[i2]);
  }
  return out;
}

// --- Матрица -------------------------------------------------------------
function emptyMatrix(size) {
  return Array.from({ length: size }, () => new Array(size).fill(null));
}

function placeFinder(m, r, c) {
  for (let dr = -1; dr <= 7; dr++) {
    for (let dc = -1; dc <= 7; dc++) {
      const rr = r + dr, cc = c + dc;
      if (rr < 0 || cc < 0 || rr >= m.length || cc >= m.length) continue;
      const inner = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
      const ring = inner && (dr === 0 || dr === 6 || dc === 0 || dc === 6);
      const core = inner && dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
      m[rr][cc] = ring || core;
    }
  }
}

function placeAlignment(m, version) {
  const pos = ALIGN[version];
  const last = pos.length - 1;
  for (let i = 0; i < pos.length; i++) {
    for (let j = 0; j < pos.length; j++) {
      // три угла заняты поисковыми узорами — там выравнивания не бывает
      if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) continue;
      const r = pos[i], c = pos[j];
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const edge = Math.max(Math.abs(dr), Math.abs(dc));
          m[r + dr][c + dc] = edge !== 1;
        }
      }
    }
  }
}

/** Координаты 15 модулей формата: [строка, столбец] для каждой из двух копий. */
function formatCells(size) {
  const cells = [];
  for (let i = 0; i < 15; i++) {
    const vertical = i < 6 ? [i, 8]
      : i < 8 ? [i + 1, 8]
      : [size - 15 + i, 8];
    const horizontal = i < 8 ? [8, size - 1 - i]
      : i === 8 ? [8, 7]
      : [8, 14 - i];
    cells.push([vertical, horizontal]);
  }
  return cells;
}

function reserveFormat(m) {
  const size = m.length;
  for (const [v, h] of formatCells(size)) {
    m[v[0]][v[1]] = false;
    m[h[0]][h[1]] = false;
  }
  m[size - 8][8] = true; // тёмный модуль
}

function buildBase(version) {
  const size = version * 4 + 17;
  const m = emptyMatrix(size);
  placeFinder(m, 0, 0);
  placeFinder(m, 0, size - 7);
  placeFinder(m, size - 7, 0);
  for (let i = 8; i < size - 8; i++) {
    m[6][i] = i % 2 === 0;
    m[i][6] = i % 2 === 0;
  }
  placeAlignment(m, version);
  reserveFormat(m);
  if (version >= 7) {
    const bits = versionBits(version);
    for (let i = 0; i < 18; i++) {
      const bit = ((bits >> i) & 1) === 1;
      const r = Math.floor(i / 3), c = i % 3;
      m[size - 11 + c][r] = bit;
      m[r][size - 11 + c] = bit;
    }
  }
  return m;
}

function versionBits(version) {
  let rem = version;
  for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
  return (version << 12) | rem;
}

function formatBits(level, mask) {
  const LEVEL_BITS = { L: 0b01, M: 0b00, Q: 0b11, H: 0b10 };
  const data = (LEVEL_BITS[level] << 3) | mask;
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  return ((data << 10) | rem) ^ 0b101010000010010;
}

const MASKS = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

function placeData(base, codewords, maskIndex, level) {
  const size = base.length;
  const m = base.map((row) => [...row]);
  const bits = [];
  for (const byte of codewords) {
    for (let i = 7; i >= 0; i--) bits.push((byte >> i) & 1);
  }

  let bitIndex = 0, upward = true;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--;                       // столбец синхронизации
    for (let i = 0; i < size; i++) {
      const row = upward ? size - 1 - i : i;
      for (const c of [col, col - 1]) {
        if (m[row][c] !== null) continue;
        let bit = bitIndex < bits.length ? bits[bitIndex++] === 1 : false;
        if (MASKS[maskIndex](row, c)) bit = !bit;
        m[row][c] = bit;
      }
    }
    upward = !upward;
  }

  const fmt = formatBits(level, maskIndex);
  const cells = formatCells(size);
  for (let i = 0; i < 15; i++) {
    const bit = ((fmt >> i) & 1) === 1;
    const [v, h] = cells[i];
    m[v[0]][v[1]] = bit;
    m[h[0]][h[1]] = bit;
  }
  m[size - 8][8] = true;
  return m;
}

function penalty(m) {
  const size = m.length;
  let score = 0;

  const runScore = (line) => {
    let s = 0, run = 1;
    for (let i = 1; i < line.length; i++) {
      if (line[i] === line[i - 1]) {
        run++;
        if (run === 5) s += 3;
        else if (run > 5) s += 1;
      } else run = 1;
    }
    return s;
  };

  for (let i = 0; i < size; i++) {
    score += runScore(m[i]);
    score += runScore(m.map((row) => row[i]));
  }
  for (let r = 0; r < size - 1; r++) {
    for (let c = 0; c < size - 1; c++) {
      const v = m[r][c];
      if (v === m[r][c + 1] && v === m[r + 1][c] && v === m[r + 1][c + 1]) score += 3;
    }
  }
  const PATTERN = [true, false, true, true, true, false, true, false, false, false, false];
  const hasPattern = (line, start) => PATTERN.every((v, i) => line[start + i] === v);
  for (let i = 0; i < size; i++) {
    const row = m[i], col = m.map((r) => r[i]);
    for (let j = 0; j + 11 <= size; j++) {
      if (hasPattern(row, j)) score += 40;
      if (hasPattern(col, j)) score += 40;
      const revRow = [...row].reverse(), revCol = [...col].reverse();
      if (hasPattern(revRow, j)) score += 40;
      if (hasPattern(revCol, j)) score += 40;
    }
  }
  const dark = m.flat().filter(Boolean).length;
  const ratio = (dark * 100) / (size * size);
  score += Math.floor(Math.abs(ratio - 50) / 5) * 10;
  return score;
}

/** Матрица модулей true/false. */
export function encode(text, level = 'M') {
  const bytes = [...new TextEncoder().encode(text)];
  let version;
  try {
    version = pickVersion(bytes.length, level);
  } catch {
    level = 'L';
    version = pickVersion(bytes.length, 'L');
  }
  const codewords = buildCodewords(bytes, version, level);
  const base = buildBase(version);

  let best = null, bestScore = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    const candidate = placeData(base, codewords, mask, level);
    const score = penalty(candidate);
    if (score < bestScore) { bestScore = score; best = candidate; }
  }
  return best;
}

/** SVG-строка: без внешних картинок, масштабируется под любой экран. */
export function toSVG(text, { size = 260, margin = 3, dark = '#20243A', light = '#FFFFFF' } = {}) {
  const m = encode(text);
  const n = m.length;
  const total = n + margin * 2;
  const path = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (m[r][c]) path.push(`M${c + margin} ${r + margin}h1v1h-1z`);
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" ` +
    `width="${size}" height="${size}" shape-rendering="crispEdges" role="img" ` +
    `aria-label="QR-код для входа в игру">` +
    `<rect width="${total}" height="${total}" fill="${light}"/>` +
    `<path d="${path.join('')}" fill="${dark}"/></svg>`;
}
