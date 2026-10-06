'use strict';

// =====================================================================================
//  MÓVEIS E PEÇAS EXTRAS DE CONSTRUÇÃO
// =====================================================================================
// Móveis de verdade (maiores que um bloco, alguns ocupando 2x2 ou 1x3), plataformas de
// madeira que dá para atravessar por baixo, telhados inclinados de barro e de madeira e
// blocos novos para casas no estilo das referências (toras, tábuas escuras, pedra rústica,
// telhado de folhas). Também troca as texturas do tijolo e dos telhados antigos.
// IDs continuam depois da água (js/water-defs.js: blocos até 59, itens até 119).

Object.assign(TILE, {
  PLATFORM: 60, ROOF_RED_LEFT: 61, ROOF_RED_RIGHT: 62, ROOF_WOOD_LEFT: 63, ROOF_WOOD_RIGHT: 64,
  LOG_WALL: 65, DARK_PLANKS: 66, COBBLESTONE: 67, LEAF_ROOF: 68,
  BED: 69, CHANDELIER: 70, PAINTING: 71, WALL_SHELF: 72, PLANTER: 73, HANGING_PLANT: 74,
  CURTAIN: 75, BEAM_H: 76, CLOCK: 77,
});
Object.assign(ITEM, {
  PLATFORM: 120, ROOF_RED_LEFT: 121, ROOF_RED_RIGHT: 122, ROOF_WOOD_LEFT: 123, ROOF_WOOD_RIGHT: 124,
  LOG_WALL: 125, DARK_PLANKS: 126, COBBLESTONE: 127, LEAF_ROOF: 128,
  BED: 129, CHANDELIER: 130, PAINTING: 131, WALL_SHELF: 132, PLANTER: 133, HANGING_PLANT: 134,
  CURTAIN: 135, BEAM_H: 136, CLOCK: 137,
  WALL_LOG: 138, WALL_DARK_PLANKS: 139, WALL_COBBLE: 140,
});

// ---------- Definições ----------
// suporte  = dá para apoiar vela, vaso e outros enfeites de chão em cima (mesa)
// sentar   = botão direito senta (cadeira)
// plataforma = só segura quem vem de cima; S em cima dela desce (js/player.js)
defTile(TILE.PLATFORM, { name: 'Plataforma de madeira', solid: false, plataforma: true, hardness: 0.2, drop: ITEM.PLATFORM, ferramenta: 'machado', opacity: 1, color: [150, 104, 60] });
defTile(TILE.ROOF_RED_LEFT, { name: 'Telha de barro inclinada /', solid: false, hardness: 0.3, drop: ITEM.ROOF_RED_LEFT, ferramenta: 'picareta', opacity: 1, color: [176, 76, 56] });
defTile(TILE.ROOF_RED_RIGHT, { name: 'Telha de barro inclinada \\', solid: false, hardness: 0.3, drop: ITEM.ROOF_RED_RIGHT, ferramenta: 'picareta', opacity: 1, color: [176, 76, 56] });
defTile(TILE.ROOF_WOOD_LEFT, { name: 'Telha de madeira inclinada /', solid: false, hardness: 0.3, drop: ITEM.ROOF_WOOD_LEFT, ferramenta: 'machado', opacity: 1, color: [124, 88, 56] });
defTile(TILE.ROOF_WOOD_RIGHT, { name: 'Telha de madeira inclinada \\', solid: false, hardness: 0.3, drop: ITEM.ROOF_WOOD_RIGHT, ferramenta: 'machado', opacity: 1, color: [124, 88, 56] });
defTile(TILE.LOG_WALL, { name: 'Toras de madeira', hardness: 0.5, drop: ITEM.LOG_WALL, ferramenta: 'machado', reto: true, color: [120, 80, 48] });
defTile(TILE.DARK_PLANKS, { name: 'Tábuas escuras', hardness: 0.45, drop: ITEM.DARK_PLANKS, ferramenta: 'machado', reto: true, color: [96, 54, 38] });
defTile(TILE.COBBLESTONE, { name: 'Pedra rústica', hardness: 0.75, drop: ITEM.COBBLESTONE, ferramenta: 'picareta', color: [124, 124, 130] });
defTile(TILE.LEAF_ROOF, { name: 'Telhado de folhas', hardness: 0.2, drop: ITEM.LEAF_ROOF, ferramenta: 'machado', opacity: 2, color: [70, 128, 56] });
defTile(TILE.BED, { name: 'Cama', solid: false, hardness: 0.4, drop: ITEM.BED, ferramenta: 'machado', opacity: 1, apoio: 'chao', color: [170, 60, 60] });
defTile(TILE.CHANDELIER, { name: 'Lustre', solid: false, hardness: 0.25, drop: ITEM.CHANDELIER, light: 15, opacity: 1, apoio: 'teto', color: [240, 200, 110] });
defTile(TILE.PAINTING, { name: 'Quadro', solid: false, hardness: 0.2, drop: ITEM.PAINTING, opacity: 1, apoio: 'parede', color: [196, 150, 70] });
defTile(TILE.WALL_SHELF, { name: 'Prateleira', solid: false, hardness: 0.2, drop: ITEM.WALL_SHELF, ferramenta: 'machado', opacity: 1, apoio: 'parede', color: [150, 104, 60] });
defTile(TILE.PLANTER, { name: 'Vaso com planta', solid: false, hardness: 0.2, drop: ITEM.PLANTER, opacity: 1, apoio: 'chao', color: [70, 140, 60] });
defTile(TILE.HANGING_PLANT, { name: 'Vaso suspenso', solid: false, hardness: 0.15, drop: ITEM.HANGING_PLANT, opacity: 1, apoio: 'teto', color: [80, 150, 64] });
defTile(TILE.CURTAIN, { name: 'Cortina', solid: false, hardness: 0.15, drop: ITEM.CURTAIN, opacity: 1, color: [150, 44, 50] });
defTile(TILE.BEAM_H, { name: 'Viga horizontal', solid: false, hardness: 0.3, drop: ITEM.BEAM_H, ferramenta: 'machado', opacity: 1, color: [120, 80, 46] });
defTile(TILE.CLOCK, { name: 'Relógio de pêndulo', solid: false, hardness: 0.4, drop: ITEM.CLOCK, ferramenta: 'machado', opacity: 1, apoio: 'chao', color: [96, 54, 38] });
// Móveis antigos que agora são desenhados maiores (e a estante deixa de ser um bloco cheio)
Object.assign(TILE_DEFS[TILE.TABLE], { suporte: true });
Object.assign(TILE_DEFS[TILE.CHAIR], { sentar: true });
defTile(TILE.BOOKSHELF, { name: 'Estante de livros', solid: false, hardness: 0.5, drop: ITEM.BOOKSHELF, ferramenta: 'machado', opacity: 1, apoio: 'chao', color: [126, 88, 54] });

for (const key of ['PLATFORM', 'ROOF_RED_LEFT', 'ROOF_RED_RIGHT', 'ROOF_WOOD_LEFT', 'ROOF_WOOD_RIGHT', 'LOG_WALL', 'DARK_PLANKS',
  'COBBLESTONE', 'LEAF_ROOF', 'BED', 'CHANDELIER', 'PAINTING', 'WALL_SHELF', 'PLANTER', 'HANGING_PLANT', 'CURTAIN', 'BEAM_H', 'CLOCK'])
  defItem(ITEM[key], { name: TILE_DEFS[TILE[key]].name, place: TILE[key] });

// Paredes de fundo dos blocos novos
for (const [key, tile, id, name] of [['LOG', 'LOG_WALL', 11, 'Parede de toras'], ['DARK_PLANKS', 'DARK_PLANKS', 12, 'Parede de tábuas escuras'], ['COBBLE', 'COBBLESTONE', 13, 'Parede de pedra rústica']]) {
  WALL[key] = id;
  WALL_SOURCE[id] = TILE[tile];
  WALL_ITEM[id] = ITEM['WALL_' + key];
  defItem(ITEM['WALL_' + key], { name, parede: id });
}

// ---------- Paletas ----------
const FDARK = { ol: [30, 16, 12], dk: [62, 32, 24], md: [96, 54, 38], lt: [130, 76, 50], hi: [168, 108, 72] }; // mogno
const BRASS = { ol: [58, 38, 14], dk: [138, 92, 34], md: [196, 146, 58], hi: [248, 214, 124] };

// ---------- Texturas dos blocos (64x64, repetem a cada 4 blocos) ----------
// Tijolo: fiadas desencontradas de tijolos 8x4, cada um num tom de barro, com aresta clara em
// cima, sombra embaixo, pintinhas e um ou outro tijolo queimado; a argamassa fica funda.
function genBrickTex(seed) {
  const tex = new Tex();
  const reds = [[172, 78, 56], [154, 66, 48], [186, 94, 64], [142, 72, 54], [164, 86, 62], [128, 58, 44], [178, 70, 52]];
  for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
    const row = y >> 2, by = y & 3, off = (row & 1) * 4, bx = (x + off) & 7, id = ((x + off) >> 3) & 7;
    let c;
    if (by === 3) c = bx === 7 ? [92, 82, 74] : [124, 112, 100];
    else if (bx === 7) c = by === 0 ? [104, 94, 84] : [138, 126, 112];
    else {
      const h = hash2(id, row, seed), burnt = hash2(id, row, seed + 1) < 0.08;
      c = shade(reds[Math.floor(h * reds.length)], (0.94 + hash2(x, y, seed) * 0.1) * (burnt ? 0.66 : 1));
      if (by === 0) c = shade(c, 1.16);
      else if (by === 2) c = shade(c, 0.84);
      if (bx === 0 && by < 2) c = shade(c, 1.07);
      else if (bx === 6) c = shade(c, 0.86);
      if (hash2(x, y, seed + 2) < 0.05) c = shade(c, 0.8);
    }
    tex.set(x, y, c);
  }
  return tex;
}

// Telha de barro em escamas: fiadas desencontradas de telhas arredondadas embaixo (luz da
// esquerda), cada fiada faz sombra na de baixo e a borda de cada telha pega luz
const clayAt = (x, y, seed) => {
  const row = y >> 3, by = y & 7, off = (row & 1) * 4, cx = (x + off) & 7, id = ((x + off) >> 3) & 7;
  const tones = [[186, 86, 58], [170, 74, 50], [198, 100, 64], [158, 68, 50], [180, 92, 60], [192, 80, 54]];
  const base = tones[Math.floor(hash2(id, row & 7, seed) * tones.length)];
  if ((by >= 6 && (cx === 0 || cx === 7)) || (by === 7 && (cx === 1 || cx === 6))) return [84, 32, 24];
  let k = [0.66, 0.9, 1.08, 1.18, 1.12, 1, 0.86, 0.66][cx] * (0.95 + hash2(x, y, seed) * 0.08);
  if (by === 0) k *= 0.46; else if (by === 1) k *= 0.72; else if (by === 5) k *= 1.08; else if (by === 6) k *= 1.16; else if (by === 7) k *= 0.82;
  const c = shade(base, k);
  return hash2(x >> 1, y >> 1, seed + 3) < 0.02 && by > 1 && by < 6 ? lerpColor(c, [110, 128, 70], 0.5) : c;
};
function genClayRoof(seed) {
  const tex = new Tex();
  for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) tex.set(x, y, clayAt(x, y, seed));
  return tex;
}

// Telha de madeira (tabuinhas): fiadas de lascas de largura variada, veio vertical, junta
// escura entre elas, sombra da fiada de cima e a ponta de baixo pegando luz
const shakeCuts = [];
for (let row = 0; row < 8; row++) {
  const cuts = [];
  let x = Math.floor(hash2(row, 0, 77) * 6);
  while (x < TEX + 8) { cuts.push(x); x += 5 + Math.floor(hash2(row, x, 78) * 5); }
  shakeCuts.push(cuts);
}
const shakeAt = (x, y, seed) => {
  const row = (y >> 3) & 7, by = y & 7, cuts = shakeCuts[row];
  x = wrap(x, TEX);
  let i = 0;
  while (i + 1 < cuts.length && cuts[i + 1] <= x) i++;
  const tones = [[134, 94, 58], [120, 82, 50], [148, 106, 64], [110, 74, 46], [140, 98, 60]];
  const base = tones[Math.floor(hash2(i, row, seed) * tones.length)];
  if (by === 0) return [42, 28, 18];
  if (x === cuts[i] || x === wrap(cuts[i], TEX)) return shade(base, 0.52);
  let k = 0.92 + (hash2(x, row, seed + 1) < 0.25 ? -0.1 : 0) + hash2(x, y, seed) * 0.08;
  if (by === 1) k *= 0.7; else if (by === 7) k *= 1.16;
  if (x === cuts[i] + 1) k *= 1.08;
  return shade(base, k);
};
function genWoodShingles(seed) {
  const tex = new Tex();
  for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) tex.set(x, y, shakeAt(x, y, seed));
  return tex;
}

// Acabamento inclinado genérico: triângulo com o padrão do telhado e uma cumeeira/beiral na diagonal
function paintRoofSlope(tex, sample, left, trim) {
  for (let v = 0; v < T; v++) for (let u = 0; u < T; u++) {
    const a = left ? u : T - 1 - u, d = a + v - (T - 1);
    if (d < 0) continue;
    const c = d === 0 ? trim.ol : d === 1 ? trim.hi : d === 2 ? trim.lt : d === 3 ? trim.dk
      : d === 4 ? shade(sample(a, v), 0.6) : sample(a, v);
    tex.set(u, v, c);
  }
}
const CLAY_TRIM = { ol: [74, 28, 22], hi: [232, 140, 96], lt: [196, 98, 64], dk: [132, 52, 38] };

// Tábuas escuras (mogno): tábuas de 8 px com emendas, veio e pregos
function genDarkPlanks(seed) {
  const tex = new Tex(), base = [104, 60, 42];
  for (let y = 0; y < TEX; y++) {
    const board = y >> 3, by = y & 7, seam = (board * 23 + 13) & 31;
    for (let x = 0; x < TEX; x++) {
      const streak = pnoise2(x / 8, board * 3 + by / 3, 8, seed + board) > 0.6 ? 0.84 : 1;
      let c = shade(base, streak * (0.93 + hash2(x, y, seed) * 0.1) * (0.9 + hash2(board, x >> 5, seed) * 0.16));
      if (by === 0) c = shade(c, 1.2);
      if (by === 7) c = [44, 24, 18];
      if ((x & 31) === seam) c = [44, 24, 18];
      else if ((x & 31) === ((seam + 1) & 31) && by < 7) c = shade(c, 1.14);
      if (by === 3 && ((x & 31) === ((seam + 3) & 31) || (x & 31) === ((seam + 28) & 31))) c = [186, 170, 150];
      tex.set(x, y, c);
    }
  }
  return tex;
}

// Toras deitadas: cada tora é redonda (luz em cima, sombra embaixo), com casca riscada e nós
function genLogWall(seed) {
  const tex = new Tex(), base = [128, 86, 52];
  const prof = [0.42, 1.2, 1.1, 1.02, 0.96, 0.9, 0.78, 0.6];
  for (let y = 0; y < TEX; y++) {
    const row = y >> 3, by = y & 7;
    for (let x = 0; x < TEX; x++) {
      const tone = 0.9 + hash2(row, 0, seed) * 0.16;
      const bark = pnoise2(x / 4, y, 16, seed + row) > 0.64 ? 0.84 : 1;
      let c = shade(base, prof[by] * tone * bark * (0.95 + hash2(x, y, seed) * 0.08));
      const kx = (row * 29 + 11) & 63, dx = wrap(x - kx, TEX);
      if (by >= 3 && by <= 5 && (dx === 0 || dx === 2) && hash2(row, 1, seed) < 0.7) c = [70, 44, 28];
      if (by === 4 && dx === 1 && hash2(row, 1, seed) < 0.7) c = [58, 36, 22];
      tex.set(x, y, c);
    }
  }
  return tex;
}

// Pedra rústica: pedras redondas de tamanhos variados (Voronoi que repete) com bisel e argamassa
function genCobble(seed) {
  const tex = new Tex(), N = 8, cell = TEX / N, pts = [];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++)
    pts.push([i * cell + 2 + hash2(i, j, seed) * (cell - 4), j * cell + 2 + hash2(i, j, seed + 1) * (cell - 4), hash2(i, j, seed + 2)]);
  for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
    let d1 = 1e9, d2 = 1e9, best = null;
    for (const p of pts) {
      const dx = wrap(x - p[0] + TEX / 2, TEX) - TEX / 2, dy = wrap(y - p[1] + TEX / 2, TEX) - TEX / 2, d = Math.hypot(dx, dy);
      if (d < d1) { d2 = d1; d1 = d; best = [dx, dy, p[2]]; } else if (d < d2) d2 = d;
    }
    let c;
    if (d2 - d1 < 1.3) c = [66, 64, 66];
    else {
      const base = lerpColor([132, 132, 138], [150, 142, 128], best[2]);
      const light = (-best[0] - best[1]) / Math.max(1, d1) * 0.5;
      c = shade(base, 0.92 + hash2(x, y, seed) * 0.08 + (d2 - d1 < 2.6 ? light * 0.32 : 0) - d1 * 0.012);
      if (d2 - d1 < 2.4 && best[0] + best[1] > 1) c = shade(c, 0.8);
    }
    tex.set(x, y, c);
  }
  return tex;
}

// Telhado de folhas: tufo de folhas arredondadas em quatro tons sobre um fundo sombreado
function genLeafRoof(seed) {
  const tex = new Tex(), rnd = mulberry32(seed);
  for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) tex.set(x, y, shade([36, 74, 36], 0.9 + hash2(x, y, seed) * 0.2));
  const greens = [[58, 112, 48], [74, 138, 56], [92, 156, 64], [66, 124, 60]];
  for (let i = 0; i < 150; i++) pebble(tex, Math.floor(rnd() * TEX), Math.floor(rnd() * TEX), 1.6 + rnd() * 2.2, greens[Math.floor(rnd() * 4)]);
  return tex;
}

MATERIAL_TEX[TILE.BRICK] = genBrickTex(1701);
MATERIAL_TEX[TILE.ROOF_RED] = genClayRoof(1702);
MATERIAL_TEX[TILE.ROOF_WOOD] = genWoodShingles(1703);
MATERIAL_TEX[TILE.DARK_PLANKS] = genDarkPlanks(1704);
MATERIAL_TEX[TILE.LOG_WALL] = genLogWall(1705);
MATERIAL_TEX[TILE.COBBLESTONE] = genCobble(1706);
MATERIAL_TEX[TILE.LEAF_ROOF] = genLeafRoof(1707);
for (const [t, left] of [[TILE.ROOF_RED_LEFT, true], [TILE.ROOF_RED_RIGHT, false]]) {
  MATERIAL_TEX[t] = new Tex();
  paintRoofSlope(MATERIAL_TEX[t], (u, v) => clayAt(u, v, 1702), left, CLAY_TRIM);
}
for (const [t, left] of [[TILE.ROOF_WOOD_LEFT, true], [TILE.ROOF_WOOD_RIGHT, false]]) {
  MATERIAL_TEX[t] = new Tex();
  paintRoofSlope(MATERIAL_TEX[t], (u, v) => shakeAt(u, v, 1703), left, BWOOD);
}

// ---------- Sprites dos móveis ----------
// Pequeno kit de pintura em cima de Tex (sem repetir: o sprite tem o tamanho exato)
function sprite(w, h, paint) {
  const tex = new Tex(w, h);
  const put = (x, y, c, a = 255) => { if (x >= 0 && y >= 0 && x < w && y < h && c) tex.set(x, y, c, a); };
  const rect = (x, y, rw, rh, c, a) => { for (let j = 0; j < rh; j++) for (let i = 0; i < rw; i++) put(x + i, y + j, c, a); };
  paint({ put, rect, tex, w, h });
  return tex.toCanvas();
}
const mirrorCanvas = (src) => {
  const c = makeCanvas(src.width, src.height), g = c.getContext('2d');
  g.translate(src.width, 0); g.scale(-1, 1); g.drawImage(src, 0, 0);
  return c;
};
const artCanvas = (cores, rows, label) => paintArt(new Tex(rows[0].length, rows.length), cores, rows, rows[0].length, rows.length, label).toCanvas();

// Ícone do inventário: o sprite reduzido para caber em 16x16 (vai no canto da textura do bloco)
function iconFromSprite(t, src) {
  const k = Math.min(1, T / src.width, T / src.height), w = Math.max(1, Math.round(src.width * k)), h = Math.max(1, Math.round(src.height * k));
  const c = makeCanvas(T, T), g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(src, Math.floor((T - w) / 2), T - h, w, h);
  const tex = new Tex();
  const d = g.getImageData(0, 0, T, T).data;
  for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
    const i = (y * T + x) * 4;
    if (d[i + 3] > 40) tex.set(x, y, [d[i], d[i + 1], d[i + 2]], 255);
  }
  MATERIAL_TEX[t] = tex;
}

const WOODC = { a: BWOOD.ol, d: BWOOD.dk, m: BWOOD.md, l: BWOOD.lt, h: BWOOD.hi };

// Cadeira (16x24, virada para a direita): encosto torneado, almofada vermelha e travessa nas pernas.
// O assento fica a 9 px do chão, na altura do quadril do jogador sentado.
const CHAIR_RIGHT = artCanvas({ ...WOODC, R: [206, 78, 70], r: [152, 46, 46] }, [
  '..aa............',
  '.ahla...........',
  '.alda...........',
  '.aaaa...........',
  '.alda...........',
  '.alda...........',
  '.alda...........',
  '.ahla...........',
  '.aaaa...........',
  '.alda...........',
  '.alda...........',
  '.alda...........',
  '.alda...........',
  '.alda...........',
  '.aldaaaaaaaaaaa.',
  '.aldaRRRRRRRRRa.',
  '.aldarrrrrrrrra.',
  'aahhhhhhhhhhhhla',
  'admmmmmmmmmmmmda',
  'aaaaaaaaaaaaaaaa',
  '.alda......alda.',
  '.aldaaaaaaaalda.',
  '.aldaddddddalda.',
  '.aaaa......aaaa.',
], 'Cadeira');
const CHAIR_LEFT = mirrorCanvas(CHAIR_RIGHT);

// Mesa (16x18): tampo grosso com veio, saia e pernas. Mesas lado a lado viram uma mesa comprida:
// a ponta que encosta em outra mesa não tem contorno nem perna.
const TABLE_SPRITES = [];
for (let v = 0; v < 4; v++) {
  const joinL = !!(v & 1), joinR = !!(v & 2);
  TABLE_SPRITES[v] = sprite(T, 18, ({ put, rect }) => {
    for (let x = 0; x < T; x++) {
      const endL = x === 0 && !joinL, endR = x === T - 1 && !joinR, g = woodGrain(x, 2, 61);
      put(x, 0, BWOOD.ol);
      put(x, 1, endL || endR ? BWOOD.ol : BWOOD.hi);
      put(x, 2, endL || endR ? BWOOD.ol : shade(BWOOD.lt, g));
      put(x, 3, endL || endR ? BWOOD.ol : shade(BWOOD.md, g));
      put(x, 4, BWOOD.ol);
      if (x >= (joinL ? 0 : 2) && x <= (joinR ? T - 1 : 13)) { put(x, 5, BWOOD.dk); put(x, 6, BWOOD.ol); }
    }
    const leg = (x) => { for (let y = 5; y < 18; y++) { put(x, y, BWOOD.ol); put(x + 1, y, y === 17 ? BWOOD.ol : BWOOD.lt); put(x + 2, y, y === 17 ? BWOOD.ol : BWOOD.dk); put(x + 3, y, BWOOD.ol); } };
    if (!joinL) leg(1);
    if (!joinR) leg(11);
    if (joinL && joinR) rect(6, 7, 4, 1, BWOOD.dk);
  });
}

// Estante (2x2 = 32x32): armário com cornija, três prateleiras de livros coloridos (alguns
// deitados ou inclinados), um vasinho e um pote, e rodapé
const BOOKSHELF_SPRITE = sprite(32, 32, ({ put, rect }) => {
  const rnd = mulberry32(4242), W = FDARK;
  rect(2, 3, 28, 27, [44, 26, 18]);
  for (let y = 4; y < 29; y++) for (let x = 3; x < 29; x++) if (hash2(x, y, 5) < 0.12) put(x, y, [52, 32, 22]);
  // Livros: cada prateleira vai de `top` a `bottom` (y)
  const colors = [[176, 58, 52], [58, 92, 156], [72, 132, 70], [196, 160, 72], [124, 70, 140], [150, 96, 58], [60, 120, 128], [206, 196, 170]];
  const shelf = (top, bottom, extras) => {
    let x = 3;
    while (x < 28) {
      const extra = extras.find((e) => !e.done && x >= e.at);
      if (extra) { extra.done = true; x = extra.fn(x, bottom); continue; }
      const bw = 2 + (rnd() < 0.35 ? 1 : 0), bh = bottom - top - Math.floor(rnd() * 3), col = colors[Math.floor(rnd() * colors.length)];
      if (x + bw > 28) break;
      if (rnd() < 0.08 && x + 5 < 28) { // livro deitado
        for (let i = 0; i < 5; i++) { put(x + i, bottom, shade(col, 0.7)); put(x + i, bottom - 1, i === 0 ? shade(col, 1.2) : col); }
        x += 6; continue;
      }
      for (let y = bottom - bh + 1; y <= bottom; y++) for (let i = 0; i < bw; i++) {
        let c = i === 0 ? shade(col, 1.22) : i === bw - 1 ? shade(col, 0.72) : col;
        if (y === bottom - bh + 2 || y === bottom - 1) c = shade(c, 0.6).map((v, k) => v + [70, 58, 20][k]);
        put(x + i, y, c);
      }
      x += bw + (rnd() < 0.15 ? 1 : 0);
    }
  };
  const pot = (x, bottom) => {
    rect(x, bottom - 2, 4, 3, [168, 90, 64]); rect(x, bottom - 2, 4, 1, [206, 124, 88]);
    for (const [dx, dy] of [[1, -3], [2, -4], [0, -4], [3, -5], [1, -6], [2, -3]]) put(x + dx, bottom + dy, dy < -4 ? [104, 170, 70] : [66, 132, 56]);
    return x + 5;
  };
  const jar = (x, bottom) => {
    rect(x, bottom - 3, 3, 4, [150, 190, 196]); put(x, bottom - 3, [210, 236, 238]); rect(x, bottom - 4, 3, 1, [120, 84, 50]);
    return x + 4;
  };
  shelf(4, 10, [{ at: 19, fn: pot }]);
  shelf(13, 19, [{ at: 8, fn: jar }]);
  shelf(22, 27, []);
  // Armário: laterais, prateleiras, cornija e rodapé
  for (let y = 0; y < 32; y++) {
    for (const [x, c] of [[0, W.ol], [1, W.hi], [2, W.md], [29, W.md], [30, W.dk], [31, W.ol]]) put(x, y, c);
  }
  for (const y of [11, 20]) { rect(2, y, 28, 1, W.hi); rect(2, y + 1, 28, 1, W.dk); }
  rect(0, 0, 32, 1, W.ol); rect(0, 1, 32, 1, W.hi); rect(0, 2, 32, 1, W.lt); rect(1, 3, 30, 1, W.ol);
  rect(0, 28, 32, 1, W.ol); rect(1, 29, 30, 1, W.lt); rect(1, 30, 30, 1, W.dk); rect(0, 31, 32, 1, W.ol);
  for (const x of [15, 16]) for (let y = 29; y < 31; y++) put(x, y, BRASS.md); // puxador da gaveta
});

// Cama (2x1 = 32x20): cabeceira alta, travesseiro, colcha xadrez e pé da cama
const BED_SPRITE = sprite(32, 20, ({ put, rect }) => {
  const W = FDARK, quilt = [[176, 58, 60], [206, 88, 84], [130, 40, 46]];
  for (let y = 0; y < 20; y++) for (const [x, c] of [[0, W.ol], [1, W.hi], [2, W.md], [3, W.ol]]) put(x, y, c);
  rect(0, 0, 4, 1, W.ol); put(1, 1, BRASS.hi); put(2, 1, BRASS.md);
  for (let y = 7; y < 20; y++) for (const [x, c] of [[28, W.ol], [29, W.lt], [30, W.dk], [31, W.ol]]) put(x, y, c);
  rect(28, 7, 4, 1, W.ol);
  // Colchão e lençol
  rect(4, 10, 24, 5, [236, 232, 220]); rect(4, 14, 24, 1, [190, 184, 170]);
  // Travesseiro
  rect(4, 7, 7, 4, [246, 244, 236]); rect(4, 7, 7, 1, [214, 210, 200]); rect(4, 10, 7, 1, [200, 196, 186]); put(10, 8, [214, 210, 200]);
  // Colcha
  for (let y = 9; y < 16; y++) for (let x = 11; x < 28; x++) {
    let c = quilt[((x >> 2) + (y >> 2)) & 1];
    if (y === 9) c = quilt[1].map((v) => v + 20);
    if (y === 15) c = quilt[2];
    if ((x & 3) === 0 && y > 9) c = shade(c, 0.86);
    put(x, y, c);
  }
  // Estrado e pés
  rect(4, 16, 24, 1, W.hi); rect(4, 17, 24, 1, W.md); rect(4, 18, 24, 1, W.ol);
});

// Lustre (24x18, pendurado no teto e centrado no bloco): corrente, braços curvos de latão,
// três velas acesas e gotas de cristal
const CHANDELIER_SPRITE = sprite(24, 18, ({ put, rect }) => {
  for (let y = 0; y < 5; y++) put(11 + (y & 1), y, y & 1 ? BRASS.hi : BRASS.dk);
  rect(9, 5, 6, 1, BRASS.ol); rect(8, 6, 8, 2, BRASS.md); rect(8, 6, 8, 1, BRASS.hi); rect(9, 8, 6, 1, BRASS.dk);
  rect(10, 9, 4, 2, BRASS.md); put(11, 11, BRASS.dk); put(12, 11, BRASS.dk); put(11, 12, [210, 236, 250]); put(12, 13, [170, 214, 240]);
  // Braços em arco até as velas
  const arm = [[7, 8], [6, 9], [5, 9], [4, 9], [3, 8]];
  for (const [x, y] of arm) { put(x, y, BRASS.md); put(23 - x, y, BRASS.md); put(x, y + 1, BRASS.dk); put(23 - x, y + 1, BRASS.dk); }
  for (const x of [3, 20]) {
    const y0 = 3;
    rect(x - 1, y0 + 4, 3, 1, BRASS.hi);
    rect(x, y0 + 1, 1, 3, [246, 240, 222]); put(x + 1, y0 + 2, [210, 200, 180]);
    put(x, y0 - 1, [255, 214, 110]); put(x, y0, [255, 246, 200]);
    put(x, y0 + 8, [200, 230, 248]);
  }
  for (const x of [5, 18]) put(x, 11, [190, 226, 246]);
});

// Quadros (2x2 = 32x32): moldura dourada com uma paisagem; o sorteio por posição escolhe entre
// montanhas ao meio-dia e mar ao pôr do sol
function paintingSprite(kind) {
  return sprite(32, 32, ({ put, rect }) => {
    for (let y = 4; y < 28; y++) for (let x = 4; x < 28; x++) {
      const t = (y - 4) / 24;
      let c;
      if (kind === 0) {
        c = lerpColor([108, 168, 220], [206, 226, 236], t * 1.4);
        const m1 = 14 + Math.round(Math.sin(x * 0.5) * 3 + Math.sin(x * 0.23) * 2), m2 = 19 + Math.round(Math.sin(x * 0.31 + 2) * 2);
        if (y > m1) c = y < m1 + 2 && x % 6 < 4 ? [236, 240, 246] : lerpColor([112, 126, 150], [84, 98, 120], (y - m1) / 8);
        if (y > m2) c = lerpColor([108, 164, 80], [70, 124, 58], (y - m2) / 7);
        if ((x - 22) ** 2 + (y - 9) ** 2 < 5) c = [255, 244, 190];
      } else {
        c = lerpColor([88, 60, 120], [250, 150, 90], t * 1.5);
        if ((x - 16) ** 2 + (y - 17) ** 2 < 18 && y < 18) c = [255, 214, 120];
        if (y >= 18) c = lerpColor([60, 70, 120], [30, 40, 80], (y - 18) / 10);
        if (y >= 18 && Math.abs(x - 16) < 5 - (y - 18) * 0.4 && (y & 1) === 0) c = [250, 180, 110];
        if (y > 20 && x < 11 && y > 29 - x) c = [34, 30, 46];
      }
      put(x, y, c);
    }
    // Moldura dourada com cantos entalhados
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      const e = Math.min(x, y, 31 - x, 31 - y);
      if (e > 3) continue;
      let c = e === 0 ? BRASS.ol : e === 1 ? (x < y && x + y < 31 ? BRASS.md : y <= x && x + y <= 31 ? BRASS.hi : BRASS.dk) : e === 2 ? BRASS.md : BRASS.dk;
      if (e === 2 && (x + y) % 4 === 0) c = BRASS.hi;
      put(x, y, c);
    }
  });
}
const PAINTING_SPRITES = [paintingSprite(0), paintingSprite(1)];

// Prateleira de parede (16x16): tábua com mãos-francesas e objetos em cima (varia por posição)
function shelfSprite(kind) {
  return sprite(T, T, ({ put, rect }) => {
    rect(0, 9, 16, 1, BWOOD.ol); rect(0, 10, 16, 1, BWOOD.hi); rect(0, 11, 16, 1, BWOOD.dk); rect(0, 12, 16, 1, BWOOD.ol);
    for (const x of [2, 12]) { put(x, 13, BWOOD.ol); put(x + 1, 13, BWOOD.md); put(x + 1, 14, BWOOD.ol); put(x + 2, 13, BWOOD.ol); }
    if (kind === 0) {
      rect(2, 4, 3, 5, [70, 120, 160]); put(2, 4, [150, 200, 230]); rect(2, 3, 3, 1, [120, 84, 50]);
      rect(6, 5, 2, 4, [180, 70, 60]); rect(8, 3, 2, 6, [70, 110, 70]); rect(10, 4, 2, 5, [196, 160, 72]);
      rect(13, 6, 2, 3, [230, 226, 214]); put(13, 5, [255, 220, 130]);
    } else {
      rect(2, 5, 4, 4, [168, 90, 64]); rect(2, 5, 4, 1, [206, 124, 88]); put(3, 3, [80, 150, 64]); put(4, 2, [110, 176, 74]); put(2, 4, [66, 132, 56]); put(5, 4, [66, 132, 56]);
      rect(8, 6, 6, 3, [150, 190, 196]); rect(8, 6, 6, 1, [210, 236, 238]); rect(9, 5, 4, 1, [120, 84, 50]);
    }
  });
}
const SHELF_SPRITES = [shelfSprite(0), shelfSprite(1)];

// Vaso grande com planta (1x2 = 16x32): folhas largas tipo costela-de-adão num vaso de barro
const PLANTER_SPRITE = sprite(T, 32, ({ put, rect }) => {
  const leaf = (cx, cy, rx, ry, flip) => {
    for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) {
      if ((x * x) / (rx * rx) + (y * y) / (ry * ry) > 1) continue;
      const edge = (x * x) / (rx * rx) + (y * y) / (ry * ry) > 0.6;
      let c = y * (flip ? -1 : 1) + x < 0 ? [96, 164, 70] : [62, 128, 52];
      if (edge && y > 0) c = [40, 92, 40];
      if (x === 0) c = [44, 100, 44];
      put(cx + x, cy + y, c);
    }
  };
  for (let y = 10; y < 22; y++) put(8 + Math.round(Math.sin(y * 0.4)), y, [60, 110, 46]);
  leaf(4, 9, 4, 3, false); leaf(12, 7, 4, 3, true); leaf(7, 3, 3, 3, false); leaf(11, 14, 4, 2, true); leaf(4, 16, 3, 2, false);
  rect(3, 21, 10, 1, [70, 36, 24]); rect(2, 22, 12, 2, [196, 110, 76]); rect(2, 22, 12, 1, [226, 146, 104]);
  for (let y = 24; y < 32; y++) { const inset = y > 29 ? 2 : 3; rect(inset, y, 16 - inset * 2, 1, y === 31 ? [96, 46, 32] : [168, 88, 60]); put(inset, y, [206, 122, 86]); put(15 - inset, y, [124, 60, 40]); }
});

// Vaso suspenso (16x24, pendurado): três cordas até um vaso redondo com ramos caindo
const HANGING_SPRITE = sprite(T, 24, ({ put, rect }) => {
  for (let y = 0; y < 7; y++) { put(8, y, [180, 150, 100]); if (y > 2) { put(8 - (y - 2), y, [160, 130, 86]); put(8 + (y - 2), y, [160, 130, 86]); } }
  rect(3, 7, 10, 1, [80, 44, 30]); rect(3, 8, 10, 3, [184, 100, 68]); rect(3, 8, 10, 1, [220, 140, 100]); rect(4, 11, 8, 1, [140, 72, 50]); rect(5, 12, 6, 1, [100, 50, 34]);
  const greens = [[66, 132, 56], [96, 164, 70], [48, 104, 44]];
  for (const [x, len] of [[3, 9], [6, 12], [9, 8], [12, 11]])
    for (let y = 6; y < 12 + len && y < 24; y++) if (y < 8 || y > 11) put(x + Math.round(Math.sin(y * 0.6 + x) * 0.8), y, greens[(x + y) % 3]);
  for (const [x, y] of [[2, 6], [5, 5], [10, 5], [13, 6], [7, 4]]) { put(x, y, greens[1]); put(x + 1, y, greens[0]); }
});

// Relógio de pêndulo (1x3 = 16x48): caixa de mogno com mostrador, porta de vidro e pêndulo
// (o pêndulo balança de verdade, veja drawClockPendulum)
const CLOCK_SPRITE = sprite(T, 48, ({ put, rect }) => {
  const W = FDARK;
  rect(2, 2, 12, 46, W.md); rect(2, 2, 1, 46, W.hi); rect(13, 2, 1, 46, W.dk);
  rect(1, 0, 14, 1, W.ol); rect(0, 1, 16, 2, W.lt); rect(0, 1, 16, 1, W.hi); rect(0, 3, 16, 1, W.ol);
  for (let y = 0; y < 48; y++) { put(1, y, W.ol); put(14, y, W.ol); }
  // Mostrador
  for (let y = 5; y < 16; y++) for (let x = 3; x < 13; x++) {
    const d = Math.hypot(x - 7.5, y - 10);
    if (d < 4.6) put(x, y, d > 3.7 ? BRASS.md : [238, 230, 206]);
  }
  put(7, 7, [40, 30, 30]); put(7, 8, [40, 30, 30]); put(8, 9, [40, 30, 30]); put(9, 10, [40, 30, 30]); put(7, 10, [40, 30, 30]);
  rect(2, 17, 12, 1, W.ol);
  // Porta de vidro do pêndulo
  rect(4, 19, 8, 20, [40, 30, 34]); rect(4, 19, 8, 1, W.ol); rect(4, 38, 8, 1, W.ol);
  for (let y = 20; y < 38; y++) if ((y & 3) === 0) put(10, y, [90, 80, 96]);
  rect(3, 40, 10, 1, W.ol); rect(2, 44, 12, 1, W.hi); rect(1, 46, 14, 2, W.ol); rect(2, 46, 12, 1, W.dk);
});
function drawClockPendulum(ctx, left, top) {
  const a = Math.sin(performance.now() / 1000 * Math.PI) * 0.35;
  const px = left + 8, py = top + 20, len = 13;
  ctx.fillStyle = rgb(BRASS.dk);
  for (let i = 0; i < len; i++) ctx.fillRect(Math.round(px + Math.sin(a) * i) - 1, py + Math.round(Math.cos(a) * i), 1, 1);
  const bx = Math.round(px + Math.sin(a) * len) - 2, by = py + Math.round(Math.cos(a) * len);
  ctx.fillStyle = rgb(BRASS.md); ctx.fillRect(bx, by, 3, 3);
  ctx.fillStyle = rgb(BRASS.hi); ctx.fillRect(bx, by, 1, 1);
}

// ---------- Móveis de vários blocos ----------
// Cada móvel ocupa w x h blocos, todos com o mesmo id. O canto que "segura" o móvel (âncora) é o
// de baixo/esquerda (ou de cima/esquerda nos pendurados) e é achado contando os vizinhos iguais,
// como a porta. Cada bloco desenha a sua fatia do sprite, e as bordas de fora desenham o que
// transborda (encosto da cadeira, cabeceira da cama, lustre mais largo que o bloco).
// sprite(world, ax, ay) -> canvas; ox = deslocamento x do sprite; top = pendurado (âncora em cima)
const FURNITURE = [];
FURNITURE[TILE.TABLE] = { w: 1, h: 1, sprite: (world, x, y) => TABLE_SPRITES[(world.getTile(x - 1, y) === TILE.TABLE ? 1 : 0) | (world.getTile(x + 1, y) === TILE.TABLE ? 2 : 0)] };
FURNITURE[TILE.CHAIR] = { w: 1, h: 1, sprite: (world, x, y) => chairFacing(world, x, y) < 0 ? CHAIR_LEFT : CHAIR_RIGHT };
FURNITURE[TILE.BOOKSHELF] = { w: 2, h: 2, sprite: () => BOOKSHELF_SPRITE };
FURNITURE[TILE.BED] = { w: 2, h: 1, sprite: () => BED_SPRITE };
FURNITURE[TILE.CHANDELIER] = { w: 1, h: 1, top: true, ox: -4, sprite: () => CHANDELIER_SPRITE };
FURNITURE[TILE.PAINTING] = { w: 2, h: 2, sprite: (world, x, y) => PAINTING_SPRITES[Math.floor(hash2(x, y, 5) * 2)] };
FURNITURE[TILE.WALL_SHELF] = { w: 1, h: 1, sprite: (world, x, y) => SHELF_SPRITES[Math.floor(hash2(x, y, 6) * 2)] };
FURNITURE[TILE.PLANTER] = { w: 1, h: 2, sprite: () => PLANTER_SPRITE };
FURNITURE[TILE.HANGING_PLANT] = { w: 1, h: 1, top: true, sprite: () => HANGING_SPRITE };
FURNITURE[TILE.CLOCK] = { w: 1, h: 3, sprite: () => CLOCK_SPRITE, overlay: drawClockPendulum };

iconFromSprite(TILE.TABLE, TABLE_SPRITES[0]);
iconFromSprite(TILE.CHAIR, CHAIR_RIGHT);
iconFromSprite(TILE.BOOKSHELF, BOOKSHELF_SPRITE);
iconFromSprite(TILE.BED, BED_SPRITE);
iconFromSprite(TILE.CHANDELIER, CHANDELIER_SPRITE);
iconFromSprite(TILE.PAINTING, PAINTING_SPRITES[0]);
iconFromSprite(TILE.WALL_SHELF, SHELF_SPRITES[0]);
iconFromSprite(TILE.PLANTER, PLANTER_SPRITE);
iconFromSprite(TILE.HANGING_PLANT, HANGING_SPRITE);
iconFromSprite(TILE.CLOCK, CLOCK_SPRITE);

// Direção da cadeira: a que o jogador escolheu ao colocar; senão, virada para a mesa ao lado
function chairFacing(world, x, y) {
  const saved = world.chairFacing?.get(y * world.w + x);
  if (saved) return saved;
  for (const d of [1, -1, 2, -2]) if (world.getTile(x + d, y) === TILE.TABLE) return Math.sign(d);
  return 1;
}

function furnitureAnchor(world, x, y) {
  const t = world.getTile(x, y), f = FURNITURE[t];
  let kx = 0, ky = 0;
  while (kx < 32 && world.getTile(x - kx - 1, y) === t) kx++;
  const dy = f.top ? -1 : 1;
  while (ky < 32 && world.getTile(x, y + (ky + 1) * dy) === t) ky++;
  return { ax: x - (kx % f.w), ay: y + (ky % f.h) * dy, t, f };
}
// Todas as casas de um móvel (a partir da âncora)
function furnitureCells(ax, ay, f) {
  const cells = [];
  for (let j = 0; j < f.h; j++) for (let i = 0; i < f.w; i++) cells.push([ax + i, f.top ? ay + j : ay - j]);
  return cells;
}

function drawFurnitureCell(ctx, world, x, y) {
  const { ax, ay, f } = furnitureAnchor(world, x, y);
  const spr = f.sprite(world, ax, ay), SW = spr.width, SH = spr.height;
  const left = ax * T + (f.ox ?? Math.round((f.w * T - SW) / 2));
  const top = f.top ? ay * T : (ay + 1) * T - SH;
  const firstRow = f.top ? ay : ay - f.h + 1, lastRow = f.top ? ay + f.h - 1 : ay;
  const x0 = Math.max(left, x === ax ? -Infinity : x * T), x1 = Math.min(left + SW, x === ax + f.w - 1 ? Infinity : (x + 1) * T);
  const y0 = Math.max(top, y === firstRow ? -Infinity : y * T), y1 = Math.min(top + SH, y === lastRow ? Infinity : (y + 1) * T);
  if (x1 > x0 && y1 > y0) ctx.drawImage(spr, x0 - left, y0 - top, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0);
  if (f.overlay && x === ax && y === ay - 1) f.overlay(ctx, left, top);
}

// Peças que emendam com a vizinha (plataforma, viga, cortina): o desenho muda nas pontas
const CONNECT_SPRITES = {};
for (let v = 0; v < 4; v++) {
  const joinL = !!(v & 1), joinR = !!(v & 2);
  // Plataforma: tábua de 4 px com o topo no alto do bloco; nas pontas soltas, uma mão-francesa
  CONNECT_SPRITES['platform' + v] = sprite(T, T, ({ put }) => {
    for (let x = 0; x < T; x++) {
      const g = woodGrain(x, 1, 71), end = (x === 0 && !joinL) || (x === T - 1 && !joinR);
      put(x, 0, BWOOD.hi); put(x, 1, shade(BWOOD.lt, g)); put(x, 2, shade(BWOOD.md, g)); put(x, 3, BWOOD.dk); put(x, 4, BWOOD.ol);
      if (end) for (let y = 0; y < 5; y++) put(x, y, BWOOD.ol);
      if ((x & 7) === 5) put(x, 2, BWOOD.dk);
    }
    for (const [open, x0, dir] of [[!joinL, 1, 1], [!joinR, 14, -1]]) {
      if (!open) continue;
      for (let k = 0; k < 6; k++) { put(x0 + dir * (5 - k), 5 + k, BWOOD.md); put(x0 + dir * (5 - k) + dir, 5 + k, BWOOD.ol); }
      for (let y = 5; y < 12; y++) { put(x0, y, BWOOD.lt); put(x0 - dir, y, BWOOD.ol); }
    }
  });
  // Viga horizontal: peça roliça de 6 px no meio do bloco, com cabeça nas pontas soltas
  CONNECT_SPRITES['beam' + v] = sprite(T, T, ({ put }) => {
    for (let x = 0; x < T; x++) {
      const g = woodGrain(x, 3, 73), end = (x === 0 && !joinL) || (x === T - 1 && !joinR);
      const col = [BWOOD.ol, BWOOD.hi, shade(BWOOD.lt, g), shade(BWOOD.md, g), shade(BWOOD.md, g * 0.9), BWOOD.dk, BWOOD.ol];
      for (let k = 0; k < 7; k++) put(x, 5 + k, end ? BWOOD.ol : col[k]);
      if ((x === 1 && !joinL) || (x === T - 2 && !joinR)) for (let k = 1; k < 6; k++) put(x, 5 + k, BWOOD.dk);
    }
    put(3, 8, BWOOD.ol); put(12, 8, BWOOD.ol);
  });
}
// Cortina: varão de latão em cima (só no primeiro bloco), pregas verticais e barra embaixo
const CURTAIN_SPRITES = {};
for (let v = 0; v < 4; v++) {
  const rod = !!(v & 1), hem = !!(v & 2);
  CURTAIN_SPRITES[v] = sprite(T, T, ({ put }) => {
    const folds = [0.62, 0.8, 1, 1.12, 1.04, 0.86, 0.7, 0.8, 1, 1.12, 1.04, 0.86, 0.7, 0.8, 0.96, 0.66];
    for (let y = 0; y < T; y++) for (let x = 1; x < 15; x++) {
      let c = shade([160, 46, 52], folds[x]);
      if (hem && y >= 13) c = y === 15 ? [70, 20, 26] : shade([214, 170, 80], folds[x]);
      put(x, y, c);
    }
    for (let y = 0; y < T; y++) { put(0, y, [70, 20, 26]); put(15, y, [70, 20, 26]); }
    if (rod) {
      for (let x = 0; x < T; x++) { put(x, 0, BRASS.ol); put(x, 1, BRASS.hi); put(x, 2, BRASS.dk); }
      for (const x of [2, 7, 12]) { put(x, 3, BRASS.md); put(x + 1, 3, BRASS.dk); }
    }
  });
}

const TILE_DRAW = [];
for (const t in FURNITURE) TILE_DRAW[t] = (ctx, world, x, y) => drawFurnitureCell(ctx, world, x, y);
const joinBits = (world, x, y, t) => (world.getTile(x - 1, y) === t ? 1 : 0) | (world.getTile(x + 1, y) === t ? 2 : 0);
TILE_DRAW[TILE.PLATFORM] = (ctx, world, x, y) => ctx.drawImage(CONNECT_SPRITES['platform' + joinBits(world, x, y, TILE.PLATFORM)], x * T, y * T);
TILE_DRAW[TILE.BEAM_H] = (ctx, world, x, y) => ctx.drawImage(CONNECT_SPRITES['beam' + joinBits(world, x, y, TILE.BEAM_H)], x * T, y * T);
TILE_DRAW[TILE.CURTAIN] = (ctx, world, x, y) => ctx.drawImage(CURTAIN_SPRITES[(world.getTile(x, y - 1) !== TILE.CURTAIN ? 1 : 0) | (world.getTile(x, y + 1) !== TILE.CURTAIN ? 2 : 0)], x * T, y * T);
iconFromSprite(TILE.PLATFORM, CONNECT_SPRITES.platform0);
iconFromSprite(TILE.BEAM_H, CONNECT_SPRITES.beam0);
iconFromSprite(TILE.CURTAIN, CURTAIN_SPRITES[3]);

// ---------- Regras de apoio e de colocar/quebrar (usadas por js/game.js e js/structures.js) ----------
// Apoio de chão: bloco sólido embaixo ou uma mesa (dá para pôr vela e vaso em cima da mesa)
const floorSupports = (world, x, y) => world.isSolid(x, y) || !!TILE_DEFS[world.getTile(x, y)].suporte;

// O móvel inteiro continua apoiado? (chão embaixo de todas as casas de baixo, teto em cima das de
// cima ou parede de fundo atrás de todas)
function furnitureSupported(world, ax, ay, f, apoio) {
  const cells = furnitureCells(ax, ay, f);
  if (apoio === 'parede') return cells.every(([x, y]) => world.getWall(x, y) !== WALL.NONE);
  if (apoio === 'chao') return cells.every(([x, y]) => f.top || y !== ay || floorSupports(world, x, y + 1));
  if (apoio === 'teto') return cells.every(([x, y]) => y !== ay || world.isSolid(x, y - 1));
  return true;
}

// Um bloco (x, y) ficou sem apoio? Vale para enfeite simples e para móvel grande
function tileUnsupported(world, x, y) {
  const t = world.getTile(x, y), def = TILE_DEFS[t];
  if (FURNITURE[t]) { const { ax, ay, f } = furnitureAnchor(world, x, y); return !furnitureSupported(world, ax, ay, f, def.apoio); }
  if (t === TILE.CHEST || t === TILE.CAMPFIRE || def.apoio === 'chao') return !floorSupports(world, x, y + 1);
  if (def.apoio === 'teto') return !world.isSolid(x, y - 1);
  if (def.apoio === 'parede') return world.getWall(x, y) === WALL.NONE;
  return false;
}

// Tenta encaixar um móvel com o cursor em (tx, ty). Procura a posição (como a porta, que desce até
// achar chão) e devolve a âncora, ou null se não couber
function findFurnitureSpot(world, t, tx, ty, blocked) {
  const f = FURNITURE[t], apoio = TILE_DEFS[t].apoio;
  const tries = [];
  for (let k = 0; k < f.h; k++) tries.push(f.top ? [tx, ty - k] : [tx, ty + k]);
  for (const [ax, ay] of tries) {
    const cells = furnitureCells(ax, ay, f);
    if (!cells.every(([x, y]) => world.inBounds(x, y) && world.getTile(x, y) === TILE.AIR && !blocked?.(x, y))) continue;
    if (furnitureSupported(world, ax, ay, f, apoio)) return { ax, ay, cells };
  }
  return null;
}
function placeFurniture(world, t, ax, ay, set = (x, y) => world.setTile(x, y, t)) {
  for (const [x, y] of furnitureCells(ax, ay, FURNITURE[t])) set(x, y);
}
// Quebra o móvel inteiro que contém (x, y); devolve o tile para o drop (um item só)
function removeFurniture(world, x, y) {
  const { ax, ay, t, f } = furnitureAnchor(world, x, y);
  for (const [cx, cy] of furnitureCells(ax, ay, f)) if (world.getTile(cx, cy) === t) world.setTile(cx, cy, TILE.AIR);
  world.chairFacing?.delete(ay * world.w + ax);
  return t;
}

// Fica em cima de uma plataforma? (usado para descer com S)
function standingOnPlatform(world, body) {
  const ty = Math.floor((body.y + body.h + 1) / T);
  const x0 = Math.floor(body.x / T), x1 = Math.floor((body.x + body.w - 0.001) / T);
  let plat = false;
  for (let tx = x0; tx <= x1; tx++) {
    if (world.isSolid(tx, ty)) return false;
    if (TILE_DEFS[world.getTile(tx, ty)].plataforma) plat = true;
  }
  return plat;
}

// ---------- Receitas (entram em js/recipes.js) ----------
const FURNITURE_RECIPES = [
  { nome: 'Plataforma de madeira', ingredientes: [[ITEM.PLANKS, 1]], resultado: { item: ITEM.PLATFORM, quantidade: 2 } },
  { nome: 'Viga horizontal', ingredientes: [[ITEM.PLANKS, 1]], resultado: { item: ITEM.BEAM_H, quantidade: 2 } },
  { nome: 'Toras de madeira', ingredientes: [[ITEM.WOOD, 1]], resultado: { item: ITEM.LOG_WALL, quantidade: 2 } },
  { nome: 'Tábuas escuras', ingredientes: [[ITEM.PLANKS, 2], [ITEM.COAL, 1]], resultado: { item: ITEM.DARK_PLANKS, quantidade: 4 } },
  { nome: 'Pedra rústica', ingredientes: [[ITEM.STONE, 2]], resultado: { item: ITEM.COBBLESTONE, quantidade: 2 } },
  { nome: 'Telhado de folhas', ingredientes: [[ITEM.STICK, 2], [ITEM.DIRT, 1]], resultado: { item: ITEM.LEAF_ROOF, quantidade: 4 } },
  { nome: 'Telha de barro inclinada /', ingredientes: [[ITEM.ROOF_RED, 1]], resultado: { item: ITEM.ROOF_RED_LEFT, quantidade: 1 } },
  { nome: 'Telha de barro inclinada \\', ingredientes: [[ITEM.ROOF_RED, 1]], resultado: { item: ITEM.ROOF_RED_RIGHT, quantidade: 1 } },
  { nome: 'Telha de madeira inclinada /', ingredientes: [[ITEM.ROOF_WOOD, 1]], resultado: { item: ITEM.ROOF_WOOD_LEFT, quantidade: 1 } },
  { nome: 'Telha de madeira inclinada \\', ingredientes: [[ITEM.ROOF_WOOD, 1]], resultado: { item: ITEM.ROOF_WOOD_RIGHT, quantidade: 1 } },
  { nome: 'Cama', ingredientes: [[ITEM.PLANKS, 6], [ITEM.CLOTH, 4]], resultado: { item: ITEM.BED, quantidade: 1 } },
  { nome: 'Lustre', ingredientes: [[ITEM.METAL_BAR, 2], [ITEM.CANDLE, 3]], resultado: { item: ITEM.CHANDELIER, quantidade: 1 } },
  { nome: 'Quadro', ingredientes: [[ITEM.PLANKS, 2], [ITEM.CLOTH, 2], [ITEM.COAL, 1]], resultado: { item: ITEM.PAINTING, quantidade: 1 } },
  { nome: 'Prateleira', ingredientes: [[ITEM.PLANKS, 2], [ITEM.GLASS, 1]], resultado: { item: ITEM.WALL_SHELF, quantidade: 2 } },
  { nome: 'Vaso com planta', ingredientes: [[ITEM.BRICK, 2], [ITEM.DIRT, 2], [ITEM.STICK, 1]], resultado: { item: ITEM.PLANTER, quantidade: 1 } },
  { nome: 'Vaso suspenso', ingredientes: [[ITEM.ROPE, 1], [ITEM.BRICK, 1], [ITEM.DIRT, 1]], resultado: { item: ITEM.HANGING_PLANT, quantidade: 1 } },
  { nome: 'Cortina', ingredientes: [[ITEM.CLOTH, 3]], resultado: { item: ITEM.CURTAIN, quantidade: 3 } },
  { nome: 'Relógio de pêndulo', ingredientes: [[ITEM.PLANKS, 6], [ITEM.METAL_BAR, 2], [ITEM.GLASS, 1]], resultado: { item: ITEM.CLOCK, quantidade: 1 } },
  { nome: 'Parede de toras', ingredientes: [[ITEM.LOG_WALL, 1]], resultado: { item: ITEM.WALL_LOG, quantidade: 4 } },
  { nome: 'Parede de tábuas escuras', ingredientes: [[ITEM.DARK_PLANKS, 1]], resultado: { item: ITEM.WALL_DARK_PLANKS, quantidade: 4 } },
  { nome: 'Parede de pedra rústica', ingredientes: [[ITEM.COBBLESTONE, 1]], resultado: { item: ITEM.WALL_COBBLE, quantidade: 4 } },
];

buildFlatTiles();
