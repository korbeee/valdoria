'use strict';
// =====================================================================================
//  TELA INICIAL COM O JOGO DE VERDADE
// =====================================================================================
// Em vez de uma pintura montada à mão (js/menu-scene.js), o fundo do menu é um pedacinho real
// do jogo: um mundo pequeno construído com os mesmos blocos, a mesma casa das vilas, as mesmas
// árvores, água, luz, bichos e personagem — desenhado pelo mesmo motor (Renderer.render) numa
// hora dourada que escurece devagar. Nada disso toca o mundo, o save ou a física do jogo: o
// estado é trocado só durante o desenho do menu e devolvido em seguida.
// Se algo falhar ao montar, o menu cai de volta na cena antiga.


// (as cenas e o desenho ficam em js/menu-scenes.js)
// Pontos-chave do cenário (colunas): casa, fogueira, árvore, riacho, penhasco com cachoeira e lago
const MW = { house: 66, chair: 80, fire: 83, oak: 94, cliff: 108, W: 232, H: 112, plateau: 54, pond: 59, basin: 64 };
function menuTerrainY(x) {
  const C = MW.cliff, P = [[0, 68], [16, 65], [34, 61], [48, 58], [58, 56], [64, 54], [C, 54], [C + 1, MW.pond + 3], [C + 4, MW.basin], [C + 14, MW.basin + 1], [C + 32, MW.basin + 1],
    [C + 38, MW.basin - 2], [C + 50, MW.basin - 5], [C + 66, 57], [C + 90, 55], [231, 53]];
  for (let i = 1; i < P.length; i++) if (x <= P[i][0]) {
    const [x0, y0] = P[i - 1], [x1, y1] = P[i], k = (x - x0) / Math.max(1, x1 - x0);
    return Math.round(lerp(y0, y1, k * k * (3 - 2 * k) * 0.55 + k * 0.45));
  }
  return P[P.length - 1][1];
}

function buildMenuWorld() {
  const { W, H, cliff: C, plateau: PL, pond: PD } = MW, w = new World(W, H, 20261004, { lazy: true }), rnd = mulberry32(2026);
  Object.assign(w, { lootChests: [], npcSpawns: [], tigerDens: [], spiderNests: [], beetleLairs: [], bearLairs: [], rivers: [], touched: new Set() });
  w.treeSpecies = new Map(); w.saplings = new Map();
  w.biome.fill(BIOME.FOREST);
  // relevo: grama, terra, rocha, e parede de terra por trás do chão
  for (let x = 0; x < W; x++) {
    const s = menuTerrainY(x); w.surface[x] = s;
    for (let y = s; y < H; y++) {
      const t = y === s ? TILE.GRASS : y < s + 4 ? TILE.DIRT : y > H - 3 ? TILE.BEDROCK : TILE.STONE;
      w.tiles[y * W + x] = t; w.walls[y * W + x] = y > s ? WALL.DIRT : WALL.NONE;
    }
  }
  // paredão de pedra por onde a água cai
  for (let x = C - 8; x <= C; x++) for (let y = PL + 1; y <= PD + 4; y++) if (x > C - 4 || y > PL + 3) w.tiles[y * W + x] = TILE.STONE;
  // riacho no platô, caindo no penhasco e enchendo o lago lá embaixo
  for (let x = C - 7; x <= C; x++) { sSet(w, x, PL, TILE.AIR, WALL.NONE); w.water[PL * W + x] = WATER_MAX; sSet(w, x, PL + 1, TILE.MUD); w.surface[x] = PL + 1; }
  for (let y = PL; y <= PD; y++) { sSet(w, C + 1, y, TILE.AIR, WALL.NONE); w.water[y * W + C + 1] = WATER_FALL; }
  for (let x = C + 2; x <= C + 44; x++) for (let y = PD; y < w.surface[x]; y++) w.water[y * W + x] = WATER_MAX;
  // pedras musgosas na margem e uma doca de madeira no lago
  for (const [bx, up] of [[C + 3, 2], [C + 4, 1], [C + 42, 1], [C + 43, 2], [C + 44, 1], [C + 34, 1]]) for (let k = 0; k < up; k++) sSet(w, bx, w.surface[bx] - 1 - k, TILE.MOSS_STONE);
  for (let x = C + 6; x <= C + 13; x++) sSet(w, x, PD, TILE.PLATFORM);
  for (const x of [C + 6, C + 13]) for (let y = PD + 1; y < w.surface[x]; y++) sSet(w, x, y, TILE.BEAM);
  // caverna sob o platô: cogumelos-lanterna no chão, drusas de cristal no teto, veios de ametista
  for (let x = 70; x <= 102; x++) {
    const k = (x - 70) / 32, top = 58 + Math.round(1.6 * Math.sin(k * 7) + 1.2 * Math.sin(k * 17 + 1)), bot = 64 + Math.round(1.5 * Math.sin(k * 5 + 2) + 1.2 * Math.sin(k * 13));
    const edge = Math.min(x - 70, 102 - x);
    for (let y = top + (edge < 3 ? 3 - edge : 0); y <= bot - (edge < 3 ? 3 - edge : 0); y++) sSet(w, x, y, TILE.AIR, WALL.STONE);
  }
  for (let x = 71; x <= 101; x++) {
    let floor = -1, ceil = -1;
    for (let y = 56; y < 70; y++) if (w.tiles[y * W + x] === TILE.AIR && w.tiles[(y + 1) * W + x] !== TILE.AIR) floor = y;
    for (let y = 56; y < 70; y++) if (w.tiles[y * W + x] === TILE.AIR) { ceil = y; break; }
    if (floor < 0) continue;
    const r = rnd();
    if (r < 0.2) sSet(w, x, floor, TILE.GLOW_CAP, WALL.STONE);
    else if (r < 0.28) sSet(w, x, floor, TILE.CRYSTAL, WALL.STONE);
    if (ceil >= 0 && rnd() < 0.3) sSet(w, x, ceil, TILE.CRYSTAL, WALL.STONE);
    if (rnd() < 0.08) sSet(w, x, floor + 1, TILE.AMETHYST_ORE, WALL.STONE);
  }
  sSet(w, 74, 61, TILE.TORCH, WALL.STONE); sSet(w, 98, 61, TILE.TORCH, WALL.STONE);
  // a casa (a mesma das vilas), lampiões, cerca com floreiras
  buildHouse(w, rnd, MW.house, PL, 11, 6, VILLAGE_STYLES.default);
  buildLampPost(w, MW.house - 3, PL);
  buildLampPost(w, MW.oak + 7, PL);
  buildFence(w, rnd, MW.oak + 3, MW.oak + 6, PL);
  // clareira da fogueira: cadeira para o personagem, de frente para o fogo
  sSet(w, MW.fire, PL - 1, TILE.CAMPFIRE);
  const spot = findFurnitureSpot(w, TILE.CHAIR, MW.chair, PL - 1);
  if (spot) { placeFurniture(w, TILE.CHAIR, spot.ax, spot.ay); (w.chairFacing ??= new Map()).set(spot.ay * W + spot.ax, 1); w.menuSeat = spot; }
  // árvores de verdade; a espécie sai do mapa de espécies (js/saplings.js)
  const trees = [[10, 'pine', 15], [18, 'oak', 12], [26, 'pine', 16], [34, 'birch', 11], [42, 'oak', 13], [52, 'maple', 12], [58, 'pine', 13],
    [MW.oak, 'oak', 13], [C - 3, 'birch', 9], [C + 49, 'willow', 9], [C + 56, 'blossom', 9], [C + 62, 'pine', 14], [C + 70, 'oak', 12], [C + 78, 'pine', 15], [C + 88, 'birch', 11], [C + 98, 'pine', 14], [C + 110, 'oak', 12], [C + 120, 'pine', 15]];
  for (const [x, sp, h] of trees) {
    if (x < 1 || x >= W - 1) continue;
    const g = w.surface[x];
    for (let i = 1; i <= h; i++) sSet(w, x, g - i, TILE.TRUNK);
    w.treeSpecies.set(x, sp);
  }
  for (let x = 0; x < W; x++) w.computeSkyTop(x);
  w.generated = true; w.lightDirty = true;
  return w;
}


// =====================================================================================
//  O INFERNO DO MENU: salão de basalto com lago de lava e os esqueletos gigantes do Ossário
// =====================================================================================
const MI = { W: 220, H: 120, ledgeA: [40, 112, 80], ledgeB: [126, 190, 82], lava: 86 };
function buildInfernoWorld() {
  const { W, H } = MI, w = new World(W, H, 666, { lazy: true }), rnd = mulberry32(666);
  Object.assign(w, { lootChests: [], npcSpawns: [], tigerDens: [], spiderNests: [], beetleLairs: [], bearLairs: [], rivers: [], touched: new Set() });
  w.treeSpecies = new Map(); w.saplings = new Map(); w.biome.fill(BIOME.FOREST);
  const surf = 14;
  for (let x = 0; x < W; x++) {
    w.surface[x] = surf;
    for (let y = surf; y < H; y++) { w.tiles[y * W + x] = y === surf ? TILE.GRASS : y < surf + 4 ? TILE.DIRT : y < 40 ? TILE.STONE : (y > H - 3 ? TILE.BEDROCK : TILE.DEEPSTONE); w.walls[y * W + x] = y > surf ? WALL.STONE : WALL.NONE; }
  }
  // o salão: teto ondulado que desce nas pontas, chão fundo onde fica o lago de lava
  const top = (x) => 46 + Math.round(5 * Math.sin(x * 0.045 + 1) + 3 * Math.sin(x * 0.11) + Math.max(0, 30 - Math.min(x - 14, 206 - x)) * 0.7);
  for (let x = 14; x <= 206; x++) for (let y = top(x); y < 104; y++) sSet(w, x, y, TILE.AIR, WALL.STONE);
  for (let x = 14; x <= 206; x++) for (let y = MI.lava; y < 104; y++) sSet(w, x, y, TILE.LAVA, WALL.STONE);
  // manchas de pedra incandescente no teto e nas paredes
  for (let x = 12; x <= 208; x++) for (let y = top(x) - 3; y < top(x); y++) if (hash2(x, y, 31) < 0.28) sSet(w, x, y, TILE.MAGMA_STONE);
  // estalactites de basalto
  for (let i = 0; i < 46; i++) { const x = 18 + Math.floor(rnd() * 184), len = 2 + Math.floor(rnd() * 7); for (let k = 0; k < len; k++) if (w.getTile(x, top(x) + k) === TILE.AIR) sSet(w, x, top(x) + k, k < 2 ? TILE.DEEPSTONE : TILE.BASALT, WALL.STONE); }
  // duas plataformas de rocha: o personagem fica na primeira, o segundo esqueleto na outra
  const ledge = ([a, b, f]) => { for (let x = a; x <= b; x++) { const edge = Math.min(x - a, b - x), up = edge < 3 ? 2 - edge : 0; for (let y = f + up; y <= MI.lava + 6; y++) sSet(w, x, y, y > f + 6 ? TILE.DEEPSTONE : (y < f + 3 ? TILE.BASALT : TILE.DEEPSTONE), WALL.STONE); } };
  ledge(MI.ledgeA); ledge(MI.ledgeB);
  // pilares de basalto saindo da lava, entre as plataformas
  for (const [px, ph] of [[116, 22], [120, 14], [168, 0]]) if (ph) for (let y = MI.lava - ph; y < MI.lava + 4; y++) for (let x = px; x <= px + 2; x++) sSet(w, x, y, TILE.BASALT, WALL.STONE);
  // fósseis e âmbar nas faces das plataformas; lírios de brasa em cima
  for (const [a, b, f] of [MI.ledgeA, MI.ledgeB]) {
    for (let i = 0; i < 22; i++) { const x = a + Math.floor(rnd() * (b - a)), y = f + 3 + Math.floor(rnd() * 9); if (w.getTile(x, y) === TILE.DEEPSTONE || w.getTile(x, y) === TILE.BASALT) sSet(w, x, y, rnd() < 0.7 ? TILE.FOSSIL : TILE.AMBER); }
    for (let x = a + 4; x < b - 3; x++) if (rnd() < 0.14 && w.getTile(x, f - 1) === TILE.AIR) sSet(w, x, f - 1, TILE.EMBER_LILY, WALL.STONE);
  }
  sSet(w, 46, MI.ledgeA[2] - 1, TILE.TORCH, WALL.STONE); sSet(w, 108, MI.ledgeA[2] - 1, TILE.TORCH, WALL.STONE); sSet(w, 132, MI.ledgeB[2] - 1, TILE.TORCH, WALL.STONE);
  // faixa do Coração e esqueletos gigantes (o desenho é o do Ossário de verdade)
  w.coreTop = new Int16Array(W).fill(40); w.coreZone = new Uint8Array(W).fill(CORE_ZONE.OSSARIO);
  w.coreRibs = [{ x0: 46, x1: 46 + 50 + 5, floor: MI.ledgeA[2], len: 50, flip: false, seed: 4242 }, { x0: 134, x1: 134 + 40 + 5, floor: MI.ledgeB[2], len: 40, flip: true, seed: 9091 }];
  for (let x = 0; x < W; x++) w.computeSkyTop(x);
  w.generated = true; w.lightDirty = true;
  return w;
}
