'use strict';
// =====================================================================================
//  As 5 aparências do Agulhão da Alma Teimosa: cada uma com silhueta e cor próprias
//  (ícone 16x16 e sprite da mão 12x32). Carrega depois de tool-art.js e antes de game.js.
// =====================================================================================
//   0 Fendida    haste grossa de aço com uma janela vazada e colar dourado
//   1 Lisa       agulha branca bem fina, com argola grande
//   2 Bifurcada  cobre, com a ponta aberta em duas pontas e empunhadura de couro
//   3 Trançada   aço enrolado em fio vermelho, com laço pendurado no furo
//   4 Entalhada  ferro escuro com farpas dos dois lados e brilho ciano
const NEEDLE_LOOKS = [
  { L: [240, 244, 252], M: [178, 186, 202], D: [104, 112, 130] },
  { L: [255, 255, 255], M: [224, 228, 236], D: [152, 158, 172] },
  { L: [255, 216, 164], M: [216, 142, 80], D: [132, 74, 38] },
  { L: [242, 246, 252], M: [188, 196, 210], D: [112, 120, 138] },
  { L: [158, 176, 200], M: [86, 98, 122], D: [40, 46, 66] },
];
const NEEDLE_EXTRA = { y: [244, 204, 100], Y: [150, 106, 40], r: [206, 66, 62], R: [120, 30, 36], c: [130, 244, 232], h: [160, 112, 68], H: [92, 60, 36] };

function needleIcon(style) {
  const g = Array.from({ length: 16 }, () => Array(16).fill('.'));
  const put = (x, y, ch) => { if (x >= 0 && x < 16 && y >= 0 && y < 16) g[y][x] = ch; };
  const N = 13;
  for (let i = 0; i <= N; i++) {
    const x = 2 + i, y = 13 - i, tip = i >= 11;
    if (style === 1) {                                                           // lisa: 1px, um pouco mais grossa na base
      put(x, y, 'L'); if (i < 5) put(x + 1, y, 'M'); continue;
    }
    if (style === 2) {                                                           // bifurcada
      if (i <= 3) { put(x, y, 'h'); put(x + 1, y, 'H'); continue; }
      if (i < 10) { put(x, y, 'L'); put(x + 1, y, 'M'); continue; }
      put(x - 1, y + 1, 'L'); put(x + 1, y, 'M'); continue;                       // duas pontas separadas por um vão
    }
    if (style === 3) {                                                           // trançada: fio vermelho em diagonal
      put(x, y, i % 2 ? 'r' : 'L'); put(x + 1, y, i % 2 ? 'R' : 'M'); if (tip) { put(x + 1, y, '.'); } continue;
    }
    if (style === 4) {                                                           // entalhada: haste de 3 e farpas
      if (tip) { put(x, y, 'L'); continue; }
      put(x, y, 'L'); put(x + 1, y, 'M'); put(x, y + 1, 'D');
      if (i % 3 === 1 && i > 3 && i < 11) { put(x - 1, y - 1, 'D'); put(x + 2, y + 1, 'D'); }
      if (i > 3 && i < 11) put(x + 1, y, 'c');
      continue;
    }
    if (tip) { put(x, y, 'L'); continue; }                                       // fendida
    put(x, y, 'L'); put(x + 1, y, 'M'); put(x, y + 1, 'D');
    if (i >= 5 && i <= 8) { put(x + 1, y, '.'); }                                // janela vazada na haste
    if (i === 3 || i === 4) { put(x, y, 'y'); put(x + 1, y, 'Y'); put(x, y + 1, 'Y'); }
  }
  // cabeça da base
  const head = {
    0: [[0, 15, 'M'], [1, 14, 'y'], [0, 14, 'Y'], [1, 15, 'Y'], [2, 15, 'D']],
    1: [[0, 14, 'M'], [0, 15, 'M'], [1, 13, 'M'], [2, 13, 'M'], [2, 14, 'M'], [2, 15, 'D'], [1, 16, 'D'], [0, 16, 'D']],
    2: [[0, 15, 'h'], [1, 15, 'H'], [1, 14, 'H'], [0, 14, 'h']],
    3: [[0, 14, 'M'], [0, 15, 'M'], [1, 13, 'M'], [2, 14, 'M'], [2, 15, 'D'], [0, 13, 'r'], [0, 12, 'r'], [1, 12, 'R']],
    4: [[0, 15, 'c'], [1, 14, 'D'], [0, 14, 'D'], [1, 15, 'D'], [2, 15, 'c'], [1, 13, 'D']],
  }[style];
  for (const [x, y, ch] of head) put(x, y, ch);
  return { cores: { ...NEEDLE_LOOKS[style], ...NEEDLE_EXTRA }, pixels: g.map((r) => r.join('')) };
}

function needleHeld(style, cv) {
  const x = cv.getContext('2d'), px = new Map();
  x.clearRect(0, 0, 12, 32);
  const { L, M, D } = NEEDLE_LOOKS[style], E = NEEDLE_EXTRA;
  const put = (a, b, c) => px.set(a + ',' + b, [a, b, c]);
  const del = (a, b) => px.delete(a + ',' + b);
  if (style === 0) {
    for (let y = 2; y <= 6; y++) { put(5, y, L); put(6, y, M); }
    for (let y = 7; y <= 22; y++) { put(4, y, L); put(5, y, M); put(6, y, D); }
    for (let y = 9; y <= 17; y++) del(5, y);                                          // janela vazada
    put(5, 1, L);
    for (let y = 23; y <= 24; y++) for (let a = 3; a <= 7; a++) put(a, y, a < 5 ? E.y : E.Y);   // colar dourado
    for (let y = 25; y <= 28; y++) for (let a = 4; a <= 6; a++) put(a, y, y % 2 ? [58, 58, 76] : [94, 94, 112]);
    for (const [a, b] of [[3, 29], [4, 29], [5, 29], [6, 29], [7, 29], [3, 30], [7, 30], [3, 31], [4, 31], [5, 31], [6, 31], [7, 31]]) put(a, b, E.y);
  } else if (style === 1) {
    for (let y = 1; y <= 5; y++) put(5, y, L);
    for (let y = 6; y <= 24; y++) { put(5, y, L); if (y > 17) put(6, y, M); }
    for (const [a, b] of [[4, 25], [5, 25], [6, 25], [3, 26], [7, 26], [3, 27], [7, 27], [3, 28], [7, 28], [4, 29], [5, 29], [6, 29]]) put(a, b, M);   // argola grande
    put(7, 29, D); put(3, 29, D);
  } else if (style === 2) {
    for (let y = 1; y <= 6; y++) { put(4, y, L); put(7, y, M); }                      // duas pontas
    put(5, 7, L); put(6, 7, M); put(4, 7, L); put(7, 7, M);
    for (let y = 8; y <= 22; y++) { put(5, y, L); put(6, y, M); }
    for (let y = 23; y <= 28; y++) for (let a = 4; a <= 7; a++) put(a, y, y % 2 ? E.h : E.H);   // empunhadura de couro
    for (const [a, b] of [[4, 29], [5, 29], [6, 29], [7, 29], [4, 30], [7, 30], [4, 31], [5, 31], [6, 31], [7, 31]]) put(a, b, D);
    put(6, 21, E.Y); put(5, 21, E.y);
  } else if (style === 3) {
    put(5, 1, L);
    for (let y = 2; y <= 6; y++) put(5, y, L);
    for (let y = 7; y <= 24; y++) { put(5, y, (y % 4 < 2) ? E.r : L); put(6, y, (y % 4 < 2) ? E.R : M); }   // fio vermelho enrolado
    for (const [a, b] of [[4, 25], [5, 25], [6, 25], [7, 25], [4, 26], [7, 26], [4, 27], [5, 27], [6, 27], [7, 27]]) put(a, b, M);    // cabeça com furo
    for (const [a, b] of [[7, 28], [8, 29], [8, 30], [7, 31], [6, 31]]) put(a, b, E.r);                                              // laço pendurado
  } else {
    for (let y = 2; y <= 5; y++) put(5, y, L);
    for (let y = 6; y <= 24; y++) { put(4, y, L); put(5, y, y > 8 && y < 23 ? E.c : M); put(6, y, D); }
    for (const y of [10, 14, 18, 22]) { put(3, y, D); put(2, y + 1, D); put(7, y, D); put(8, y + 1, D); }   // farpas
    put(5, 1, L);
    for (const [a, b] of [[5, 25], [4, 26], [6, 26], [3, 27], [7, 27], [4, 28], [6, 28], [5, 29], [5, 27]]) put(a, b, a === 5 && b === 27 ? E.c : D);   // pomo em losango
    for (const [a, b] of [[5, 30], [5, 31]]) put(a, b, E.c);
  }
  x.fillStyle = 'rgb(30,32,49)';
  for (const [a, b] of px.values()) for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) if (!px.has((a + dx) + ',' + (b + dy))) x.fillRect(a + dx, b + dy, 1, 1);
  for (const [a, b, c] of px.values()) { x.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`; x.fillRect(a, b, 1, 1); }
}
ESSENCE_NAIL_IDS.forEach((id, i) => { const st = ITEM_DEFS[id].nailSkin ?? i; ITEM_ART[id] = needleIcon(st); needleHeld(st, ESSENCE_NAIL_SPRITES[st]); });
