'use strict';

// =====================================================================================
//  BLOCOS DAS RUÍNAS E DAS TRIBOS
// =====================================================================================
// Valdoria já foi habitada: sobraram prédios de concreto rachados, vergalhão torto saindo
// das lajes, entulho e janelas sem vidro, tudo tomado pelo mato (js/ruins.js monta as ruínas).
// Quem vive aqui hoje são as tribos da ilha: ocas e palafitas de palha, paliçadas de troncos
// apontados, totens pintados e estacas com crânio na porta dos canibais.
// IDs continuam depois da história (js/story.js: blocos até 101, itens até 191).

Object.assign(TILE, {
  CONCRETE: 102, MOSSY_CONCRETE: 103, REBAR: 104, RUBBLE: 105, BROKEN_WINDOW: 106,
  THATCH: 107, THATCH_LEFT: 108, THATCH_RIGHT: 109, PALISADE: 110, PALISADE_TIP: 111,
  TOTEM: 112, SKULL_STAKE: 113, HIDE: 114,
});
Object.assign(ITEM, {
  CONCRETE: 192, THATCH: 193, THATCH_LEFT: 194, THATCH_RIGHT: 195, PALISADE: 196, PALISADE_TIP: 197,
  TOTEM: 198, HIDE: 199, WALL_CONCRETE: 200, SKULL_STAKE: 201,
});

defTile(TILE.CONCRETE,       { name: 'Concreto', hardness: 0.9, drop: ITEM.CONCRETE, ferramenta: 'picareta', reto: true, color: [142, 140, 134] });
defTile(TILE.MOSSY_CONCRETE, { name: 'Concreto com musgo', hardness: 0.9, drop: ITEM.CONCRETE, ferramenta: 'picareta', color: [118, 132, 104] });
defTile(TILE.REBAR,          { name: 'Vergalhão retorcido', solid: false, hardness: 0.6, drop: ITEM.SCRAP, ferramenta: 'picareta', opacity: 1, color: [150, 84, 50] });
defTile(TILE.RUBBLE,         { name: 'Entulho', solid: false, hardness: 0.35, drop: ITEM.STONE, ferramenta: 'picareta', opacity: 1, apoio: 'chao', color: [128, 122, 114] });
defTile(TILE.BROKEN_WINDOW,  { name: 'Janela quebrada', solid: false, hardness: 0.2, drop: ITEM.GLASS, opacity: 1, color: [70, 82, 88] });
defTile(TILE.THATCH,         { name: 'Telhado de palha', hardness: 0.25, drop: ITEM.THATCH, ferramenta: 'machado', opacity: 2, color: [190, 152, 84] });
defTile(TILE.THATCH_LEFT,    { name: 'Palha inclinada /', solid: false, hardness: 0.2, drop: ITEM.THATCH_LEFT, ferramenta: 'machado', opacity: 1, color: [190, 152, 84] });
defTile(TILE.THATCH_RIGHT,   { name: 'Palha inclinada \\', solid: false, hardness: 0.2, drop: ITEM.THATCH_RIGHT, ferramenta: 'machado', opacity: 1, color: [190, 152, 84] });
defTile(TILE.PALISADE,       { name: 'Paliçada', hardness: 0.6, drop: ITEM.PALISADE, ferramenta: 'machado', reto: true, color: [122, 84, 50] });
defTile(TILE.PALISADE_TIP,   { name: 'Ponta de paliçada', solid: false, hardness: 0.4, drop: ITEM.PALISADE_TIP, ferramenta: 'machado', opacity: 1, color: [122, 84, 50] });
defTile(TILE.TOTEM,          { name: 'Totem entalhado', solid: false, hardness: 0.6, drop: ITEM.TOTEM, ferramenta: 'machado', opacity: 1, color: [150, 96, 56] });
defTile(TILE.SKULL_STAKE,    { name: 'Estaca com crânio', solid: false, hardness: 0.3, drop: ITEM.SKULL_STAKE, ferramenta: 'machado', opacity: 1, apoio: 'chao', color: [222, 212, 188] });
defTile(TILE.HIDE,           { name: 'Cortina de couro', solid: false, hardness: 0.15, drop: ITEM.HIDE, opacity: 1, color: [164, 116, 72] });

for (const key of ['CONCRETE', 'THATCH', 'THATCH_LEFT', 'THATCH_RIGHT', 'PALISADE', 'PALISADE_TIP', 'TOTEM', 'HIDE', 'SKULL_STAKE'])
  defItem(ITEM[key], { name: TILE_DEFS[TILE[key]].name, place: TILE[key] });

// Parede de fundo de concreto (o miolo dos prédios em ruína)
WALL.CONCRETE = 14;
WALL_SOURCE[WALL.CONCRETE] = TILE.CONCRETE;
WALL_ITEM[WALL.CONCRETE] = ITEM.WALL_CONCRETE;
defItem(ITEM.WALL_CONCRETE, { name: 'Parede de concreto', parede: WALL.CONCRETE });

// As receitas ficam em js/ruins.js (a fibra só existe depois de js/environment.js)
const RUIN_RECIPES = () => [
  { nome: 'Concreto', ingredientes: [[ITEM.SAND, 2], [ITEM.STONE, 2]], resultado: { item: ITEM.CONCRETE, quantidade: 4 } },
  { nome: 'Parede de concreto', ingredientes: [[ITEM.CONCRETE, 1]], resultado: { item: ITEM.WALL_CONCRETE, quantidade: 4 } },
  { nome: 'Telhado de palha', ingredientes: [[ITEM.FIBER, 3], [ITEM.STICK, 1]], resultado: { item: ITEM.THATCH, quantidade: 4 } },
  { nome: 'Palha inclinada /', ingredientes: [[ITEM.THATCH, 1]], resultado: { item: ITEM.THATCH_LEFT, quantidade: 2 } },
  { nome: 'Palha inclinada \\', ingredientes: [[ITEM.THATCH, 1]], resultado: { item: ITEM.THATCH_RIGHT, quantidade: 2 } },
  { nome: 'Paliçada', ingredientes: [[ITEM.WOOD, 2]], resultado: { item: ITEM.PALISADE, quantidade: 3 } },
  { nome: 'Ponta de paliçada', ingredientes: [[ITEM.WOOD, 1], [ITEM.STICK, 1]], resultado: { item: ITEM.PALISADE_TIP, quantidade: 2 } },
  { nome: 'Totem entalhado', ingredientes: [[ITEM.WOOD, 3], [ITEM.COAL, 1]], resultado: { item: ITEM.TOTEM, quantidade: 2 } },
  { nome: 'Cortina de couro', ingredientes: [[ITEM.LEATHER, 2], [ITEM.STICK, 1]], resultado: { item: ITEM.HIDE, quantidade: 3 } },
  { nome: 'Estaca com crânio', ingredientes: [[ITEM.BONE, 2], [ITEM.STICK, 2]], resultado: { item: ITEM.SKULL_STAKE, quantidade: 1 } },
];

// ---------- Paletas ----------
const RUST = { ol: [52, 26, 18], dk: [96, 46, 28], md: [138, 72, 40], lt: [178, 104, 56], hi: [212, 146, 84] };
const STRAW = { ol: [70, 46, 20], dk: [120, 84, 40], md: [168, 126, 64], lt: [204, 164, 92], hi: [234, 204, 128] };
const MOSS_GREENS = [[44, 78, 36], [66, 108, 46], [96, 140, 58], [132, 170, 74]];

// Concreto envelhecido: placas de fôrma (juntas a cada 32 px com furinhos dos tirantes),
// poros, manchas escorridas de cima para baixo e rachaduras finas
function concreteAt(x, y, seed) {
  const lx = x & 31, ly = y & 31;
  const panel = hash2(x >> 5, y >> 5, seed);
  let c = shade([146, 144, 136], 0.9 + panel * 0.1 + pfbm2(x / 16, y / 16, 4, seed, 3) * 0.12);
  // escorrido: faixas verticais mais escuras que começam na junta de cima
  const streak = pnoise2(x / 3, 0, 22, seed + 1);
  if (streak > 0.62) c = shade(c, 1 - (streak - 0.62) * 0.9 * (1 - ly / 40));
  const h = hash2(x, y, seed + 2);
  if (h < 0.035) c = shade(c, 0.74); else if (h > 0.985) c = shade(c, 1.12);
  if (ly === 0) c = shade(c, 0.66); else if (ly === 1) c = shade(c, 1.1);
  if (lx === 0) c = shade(c, 0.74); else if (lx === 1) c = shade(c, 1.06);
  if ((lx === 8 || lx === 24) && (ly === 8 || ly === 24)) c = [74, 72, 70];
  return c;
}
function genConcrete(seed, mossy) {
  const tex = new Tex();
  for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) tex.set(x, y, concreteAt(x, y, seed));
  const rnd = mulberry32(seed);
  paintCrack(tex, 13, 4, 9, [146, 144, 136], rnd);
  paintCrack(tex, 44, 34, 11, [146, 144, 136], rnd);
  paintCrack(tex, 29, 52, 6, [146, 144, 136], rnd);
  if (!mossy) return tex;
  // Musgo: manchas no alto de cada placa e fiapos escorrendo pelas rachaduras
  const moss = new Uint8Array(TEX * TEX);
  for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
    const ly = y & 31, m = pfbm2(x / 16, y / 16, 4, seed + 9, 3) + (ly < 6 ? 0.22 - ly * 0.03 : 0) - (ly > 16 ? 0.1 : 0);
    if (m > 0.6) moss[y * TEX + x] = 1;
  }
  for (let x = 0; x < TEX; x++) for (let y = 0; y < TEX; y++) {
    if (!moss[y * TEX + x] || moss[wrap(y + 1, TEX) * TEX + x] || hash2(x, y, seed + 3) > 0.22) continue;
    const len = 2 + Math.floor(hash2(x, y, seed + 4) * 6);
    for (let k = 1; k <= len; k++) moss[wrap(y + k, TEX) * TEX + x] = 2;
  }
  const M = (x, y) => moss[wrap(y, TEX) * TEX + wrap(x, TEX)];
  for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
    const m = M(x, y);
    if (!m) { if (M(x, y - 1) === 1) tex.set(x, y, shade(tex.get(x, y), 0.72)); continue; }
    if (m === 2) { tex.set(x, y, lerpColor(tex.get(x, y), MOSS_GREENS[0], 0.55)); continue; }
    tex.set(x, y, !M(x, y - 1) ? MOSS_GREENS[3] : !M(x, y + 1) ? MOSS_GREENS[0] : MOSS_GREENS[hash2(x, y, seed + 5) < 0.35 ? 1 : 2]);
  }
  return tex;
}

// Palha amarrada em fiadas: fibras verticais de comprimento variado, a ponta de cada fiada
// cai por cima da de baixo (sombra) e um feixe mais claro aqui e ali
function thatchAt(x, y, seed) {
  const row = y >> 3, by = y & 7, fx = wrap(x + row * 3, TEX);
  const len = 5 + Math.floor(hash2(fx, row, seed) * 4);
  const tone = [STRAW.md, STRAW.lt, STRAW.md, STRAW.dk, STRAW.lt][Math.floor(hash2(fx >> 1, row, seed + 1) * 5)];
  if (by >= len) return shade(STRAW.ol, 1.2);
  let c = shade(tone, 0.92 + hash2(x, y, seed + 2) * 0.12);
  if (by === 0) c = shade(c, 0.6);
  else if (by === 1) c = shade(c, 0.82);
  else if (by === len - 1) c = shade(c, 1.12);
  if ((fx & 1) && by > 1) c = shade(c, 0.9);
  return c;
}
function genThatch(seed) {
  const tex = new Tex();
  for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) tex.set(x, y, thatchAt(x, y, seed));
  return tex;
}

// Paliçada: troncos em pé de 8 px, redondos (luz da esquerda), casca riscada e uma amarração de cipó
function palisadeAt(x, y, seed) {
  const log = x >> 3, lx = x & 7, ly = wrap(y + Math.floor(hash2(log, 0, seed) * 32), TEX);
  const prof = [0.5, 1.16, 1.12, 1.04, 0.98, 0.9, 0.78, 0.56][lx];
  const bark = pnoise2(lx * 2, y / 4, 16, seed + log) > 0.63 ? 0.82 : 1;
  let c = shade([128, 88, 54], prof * bark * (0.92 + hash2(log, 1, seed) * 0.14) * (0.96 + hash2(x, y, seed) * 0.07));
  if ((ly & 31) === 20 || (ly & 31) === 22) c = shade([92, 78, 40], prof * 1.05);       // cipó
  else if ((ly & 31) === 21) c = shade([132, 116, 62], prof);
  return c;
}
function genPalisade(seed) {
  const tex = new Tex();
  for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) tex.set(x, y, palisadeAt(x, y, seed));
  return tex;
}

// ---------- Enfeites (canto 16x16 ou coluna 16x64) ----------
const RUIN_ART = {
  // Vergalhão: três barras enferrujadas saindo de um toco de concreto, entortadas para cima
  rebar(tex) {
    const bars = [[2, 15, [[2, 9], [1, 5], [3, 1]]], [6, 15, [[7, 7], [9, 3], [12, 1]]], [10, 15, [[11, 10], [14, 8]]]];
    for (const [sx, sy, pts] of bars) {
      let px = sx, py = sy;
      for (const [ex, ey] of pts) {
        const n = Math.max(Math.abs(ex - px), Math.abs(ey - py));
        for (let i = 0; i <= n; i++) {
          const x = Math.round(lerp(px, ex, i / n)), y = Math.round(lerp(py, ey, i / n));
          tex.set(x, y, RUST.ol); tex.set(x + 1, y, RUST.dk);
          if (tex.get(x - 1, y)[3] === 0) tex.set(x - 1, y, RUST.ol);
          tex.set(x, y, (x + y) % 3 ? RUST.md : RUST.lt);
        }
        tex.set(ex, ey, RUST.hi);
        px = ex; py = ey;
      }
    }
    for (let x = 0; x < T; x++) for (let y = 13; y < T; y++) {
      if (y === 13 && (x < 1 || x > 13)) continue;
      const c = concreteAt(x * 3, y * 3, 17);
      tex.set(x, y, y === 13 ? shade(c, 1.12) : x === 15 || y === 15 ? shade(c, 0.6) : c);
    }
  },

  // Entulho: pedaços de concreto e de tijolo amontoados, com um fiapo de vergalhão
  rubble(tex) {
    const chunks = [[4, 13, 3.4, [150, 146, 138]], [11, 13, 3, [138, 134, 126]], [8, 11, 2.6, [164, 158, 148]],
      [2, 14, 2, [172, 86, 60]], [13, 14, 2, [160, 74, 54]], [6, 14, 1.8, [120, 116, 110]]];
    tex.set(9, 7, RUST.dk); tex.set(10, 6, RUST.md); tex.set(11, 5, RUST.lt); tex.set(10, 7, RUST.ol); tex.set(12, 5, RUST.ol);
    for (const [cx, cy, r, base] of chunks) pebble(tex, cx, cy, r, base);
    for (let x = 1; x < 15; x++) if (tex.get(x, 15)[3] === 0) tex.set(x, 15, [70, 66, 62]);
  },

  // Janela quebrada: caixilho de metal descascado, vidro que sobrou nos cantos e o escuro de dentro
  window(tex) {
    for (let v = 0; v < T; v++) for (let u = 0; u < T; u++) {
      const edge = Math.min(u, v, T - 1 - u, T - 1 - v);
      let c;
      if (edge === 0) c = [32, 34, 36];
      else if (edge === 1) c = u === 14 || v === 14 ? [62, 64, 66] : hash2(u, v, 3) < 0.25 ? RUST.md : [118, 120, 120];
      else if (u === 7 || u === 8) c = u === 7 ? [104, 106, 106] : [58, 60, 62];
      else {
        c = lerpColor([30, 36, 40], [16, 20, 24], v / T);
        // cacos: triângulos presos nos cantos do caixilho
        const pu = u < 7 ? u - 2 : 13 - u, pv = v - 2, qv = 13 - v;
        const shard = (pu + pv < 4 && u < 7) || (pu + qv < 3 && u > 8) || (u > 8 && pv < 2 && pu < 4);
        if (shard) c = lerpColor([128, 176, 190], [70, 112, 130], v / T);
        if (shard && (pu + pv === 3 || pu + qv === 2)) c = [208, 236, 240];
      }
      tex.set(u, v, c);
    }
  },

  // Ponta da paliçada: dois troncos apontados, com o corte do facão claro na ponta
  tip(tex) {
    for (let v = 0; v < T; v++) for (let u = 0; u < T; u++) {
      const lx = u & 7, half = Math.abs(lx - 3.5), top = 9 - Math.max(0, 3.5 - half) * 2.4;
      if (v < top - 0.5) continue;
      let c = palisadeAt(u, v, 1801);
      if (v < top + 2.5) c = lerpColor(c, [206, 168, 112], lx < 4 ? 0.65 : 0.3);
      if (v < top + 0.6 || (half > 3)) c = shade(c, 0.7);
      tex.set(u, v, c);
    }
  },

  // Totem: dois rostos entalhados por bloco duplo, pintados de urucum, carvão e argila branca
  totem(tex) {
    const W = { ol: [44, 26, 16], dk: [86, 52, 30], md: [132, 86, 50], lt: [168, 116, 70], hi: [198, 150, 98] };
    const RED = [176, 52, 36], TEAL = [52, 132, 124], WHITE = [232, 222, 196], BLACK = [26, 20, 18];
    for (let y = 0; y < TEX; y++) {
      const fy = y & 31, face = y >> 5;
      for (let u = 2; u <= 13; u++) {
        const g = woodGrain(y, u, 61);
        let c = u === 2 || u === 13 ? W.ol : u === 3 ? W.hi : u === 12 ? W.dk : shade(u < 7 ? W.lt : W.md, g);
        // faixas entre os rostos
        if (fy <= 2) c = fy === 1 ? (face ? TEAL : RED) : W.ol;
        // sobrancelha, olhos e boca
        if (fy >= 6 && fy <= 7 && u >= 4 && u <= 11) c = fy === 6 ? W.ol : W.hi;
        if (fy >= 9 && fy <= 12 && (u >= 4 && u <= 6 || u >= 9 && u <= 11)) {
          c = fy === 9 ? W.ol : WHITE;
          if (fy >= 10 && (u === 5 || u === 10)) c = BLACK;
        }
        if (fy >= 14 && fy <= 19 && u >= 7 && u <= 8) c = u === 7 ? W.hi : W.dk;          // nariz
        if (fy >= 22 && fy <= 26 && u >= 4 && u <= 11) {                                // boca com dentes
          c = fy === 22 || fy === 26 ? W.ol : (u & 1) ? WHITE : BLACK;
          if (face) c = fy === 22 || fy === 26 ? W.ol : RED;
        }
        if ((u === 4 || u === 11) && fy >= 13 && fy <= 18) c = face ? RED : TEAL;        // pintura na bochecha
        tex.set(u, y, c);
      }
      // orelhas/asas do rosto de cima
      if (!face && fy >= 8 && fy <= 14) for (const [u, s] of [[0, 1], [1, 1], [14, -1], [15, -1]]) {
        const d = s > 0 ? u : 15 - u;
        if (fy - 8 >= d * 2) tex.set(u, y, fy === 14 ? W.ol : d === 0 ? RED : W.md);
      }
    }
  },

  // Estaca com crânio: pau fincado no chão e um crânio amarelado com as órbitas fundas
  skull(tex) {
    for (let v = 8; v < T; v++) { tex.set(7, v, BWOOD.hi); tex.set(8, v, BWOOD.md); tex.set(9, v, BWOOD.ol); tex.set(6, v, BWOOD.ol); }
    const S = ['..####..', '.######.', '########', '#..##..#', '#..##..#', '########', '.##..##.', '..####..', '..#.#.#.'];
    const BONE = { ol: [64, 52, 40], dk: [168, 152, 124], md: [214, 202, 174], hi: [242, 236, 214] };
    for (let j = 0; j < S.length; j++) for (let i = 0; i < 8; i++) {
      const u = 4 + i, v = j;
      const on = S[j][i] === '#';
      if (!on) {
        if ((S[j][i - 1] === '#' || S[j][i + 1] === '#' || S[j - 1]?.[i] === '#' || S[j + 1]?.[i] === '#') && j > 0 && j < 8 && i > 0 && i < 7) tex.set(u, v, [30, 22, 18]);
        continue;
      }
      tex.set(u, v, j === 0 || i === 0 ? BONE.hi : j >= 6 || i === 7 ? BONE.dk : BONE.md);
    }
    for (let i = 3; i <= 12; i++) { if (tex.get(i, 0)[3] === 0) continue; tex.set(i, 0, BONE.hi); }
    for (const [u, v] of [[3, 2], [3, 3], [3, 4], [12, 2], [12, 3], [12, 4], [5, 9], [7, 9], [9, 9]]) if (tex.get(u, v)[3] === 0) tex.set(u, v, BONE.ol);
  },

  // Couro esticado: retalhos costurados (pesponto claro), dobras escuras e a borda irregular
  hide(tex) {
    for (let y = 0; y < TEX; y++) for (let u = 1; u <= 14; u++) {
      const patch = (y >> 4) + (u > 7 ? 1 : 0), py = y & 15;
      let c = shade([162, 114, 70], 0.88 + hash2(patch, 0, 71) * 0.18 + pfbm2(u / 8, y / 8, 8, 72, 2) * 0.1);
      const fold = Math.sin((u + (y >> 2)) * 0.9) > 0.86;
      if (fold) c = shade(c, 0.82);
      if (u === 1 || u === 14) c = shade(c, 0.6);
      if (u === 7 && (y & 3) < 2) c = [232, 214, 170];
      else if (py === 0 && (u & 3) < 2) c = [232, 214, 170];
      tex.set(u, y, c);
    }
  },
};

function ruinTex(paint) { const tex = new Tex(); paint(tex); return tex; }

MATERIAL_TEX[TILE.CONCRETE] = genConcrete(1811, false);
MATERIAL_TEX[TILE.MOSSY_CONCRETE] = genConcrete(1812, true);
MATERIAL_TEX[TILE.THATCH] = genThatch(1813);
MATERIAL_TEX[TILE.PALISADE] = genPalisade(1801);
for (const [t, left] of [[TILE.THATCH_LEFT, true], [TILE.THATCH_RIGHT, false]]) {
  MATERIAL_TEX[t] = new Tex();
  paintRoofSlope(MATERIAL_TEX[t], (u, v) => thatchAt(u, v, 1813), left, STRAW);
}
MATERIAL_TEX[TILE.REBAR] = ruinTex(RUIN_ART.rebar);
MATERIAL_TEX[TILE.RUBBLE] = ruinTex(RUIN_ART.rubble);
MATERIAL_TEX[TILE.BROKEN_WINDOW] = ruinTex(RUIN_ART.window);
MATERIAL_TEX[TILE.PALISADE_TIP] = ruinTex(RUIN_ART.tip);
MATERIAL_TEX[TILE.TOTEM] = ruinTex(RUIN_ART.totem);
MATERIAL_TEX[TILE.SKULL_STAKE] = ruinTex(RUIN_ART.skull);
MATERIAL_TEX[TILE.HIDE] = ruinTex(RUIN_ART.hide);

buildFlatTiles();
FLAT_VERTICAL[TILE.TOTEM] = 1;
FLAT_VERTICAL[TILE.HIDE] = 1;
