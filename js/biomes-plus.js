'use strict';
// =====================================================================================
//  BIOMAS NOVOS: PÂNTANO, MESA VERMELHA E BOSQUE LUMINOSO
// =====================================================================================
//  Pântano         turfa escura, grama de brejo, lagoas rasas com vitórias-régias, cipreste com barba-de-velho.
//  Mesa Vermelha   areia vermelha sobre degraus de argila em faixas (vermelha, laranja, creme), pilares de rocha.
//  Bosque Luminoso solo de esporos que brilha, cogumelos gigantes no lugar das árvores, céu de crepúsculo.
// Os ids são "maior id + 1" (como js/core-crafts.js): ESTE ARQUIVO PRECISA CARREGAR DEPOIS DE TODOS QUE JÁ DEFINEM IDS
// (index.html: logo depois de fishing.js), senão desloca blocos e itens de mundos já salvos. Arquivos novos entram DEPOIS dele.
// js/world.js lê BIOME_EXTRA (solo, camadas, relevo, árvores); a arte das árvores e do fundo fica em
// js/biomes-art.js, a vegetação em js/surface-life.js e os bichos em js/fauna-*.js.
// Carrega depois de saplings.js (usa ENV_NATURAL, SAPLING_SOIL, MATERIAL e BAYER4) e antes de game.js.

for (const k of ['PEAT', 'BOG_GRASS', 'RED_SAND', 'CLAY_RED', 'CLAY_ORANGE', 'CLAY_CREAM', 'SPORE_GRASS']) TILE[k] = Math.max(...Object.values(TILE)) + 1;
for (const k of ['PEAT', 'RED_SAND', 'CLAY_RED', 'CLAY_ORANGE', 'CLAY_CREAM']) ITEM[k] = Math.max(...Object.values(ITEM)) + 1;

defTile(TILE.PEAT,        { name: 'Turfa', hardness: 0.25, drop: ITEM.PEAT, ferramenta: 'pa', color: [58, 44, 34] });
defTile(TILE.BOG_GRASS,   { name: 'Grama de brejo', hardness: 0.3, drop: ITEM.PEAT, ferramenta: 'pa', color: [92, 120, 54] });
defTile(TILE.RED_SAND,    { name: 'Areia vermelha', gravity: true, hardness: 0.2, drop: ITEM.RED_SAND, ferramenta: 'pa', color: [206, 118, 76] });
defTile(TILE.CLAY_RED,    { name: 'Argila vermelha', hardness: 0.6, drop: ITEM.CLAY_RED, ferramenta: 'picareta', color: [170, 78, 54] });
defTile(TILE.CLAY_ORANGE, { name: 'Argila alaranjada', hardness: 0.6, drop: ITEM.CLAY_ORANGE, ferramenta: 'picareta', color: [212, 130, 66] });
defTile(TILE.CLAY_CREAM,  { name: 'Argila creme', hardness: 0.6, drop: ITEM.CLAY_CREAM, ferramenta: 'picareta', color: [226, 204, 164] });
defTile(TILE.SPORE_GRASS, { name: 'Solo de esporos', hardness: 0.3, drop: ITEM.DIRT, ferramenta: 'pa', light: 3, color: [74, 190, 176] });
for (const key of ['PEAT', 'RED_SAND', 'CLAY_RED', 'CLAY_ORANGE', 'CLAY_CREAM']) defItem(ITEM[key], { name: TILE_DEFS[TILE[key]].name, place: TILE[key] });
buildFlatTiles();

// ---------------------------------------------------------------- texturas (ruído sempre periódico em 64px)
const BP_TAU = Math.PI * 2;
const bpRamp = (ramp, v) => { const k = clamp(v, 0, 0.999) * (ramp.length - 1), i = k | 0; return lerpColor(ramp[i], ramp[i + 1], k - i); };

function genPeat(seed) {
  const tex = new Tex(), rnd = mulberry32(seed), pal = [[30, 22, 20], [48, 36, 28], [68, 52, 38], [90, 70, 50], [112, 90, 64]];
  for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
    const v = pfbm2(x / 16, y / 16, 4, seed, 3) * 0.75 + pfbm2(x / 4, y / 4, 16, seed + 5, 2) * 0.25 + (BAYER4[(y & 3) * 4 + (x & 3)] / 16 - 0.5) * 0.05;
    tex.set(x, y, bpRamp(pal, (v - 0.22) * 1.45));
  }
  for (let k = 0; k < 26; k++) {                                                      // raízes e fibras apodrecidas
    let x = rnd() * TEX, y = rnd() * TEX, a = rnd() * BP_TAU;
    for (let i = 0, n = 5 + Math.floor(rnd() * 8); i < n; i++) { tex.set(Math.round(x), Math.round(y), i & 1 ? [124, 96, 62] : [92, 68, 44]); a += (rnd() - 0.5) * 0.9; x += Math.cos(a); y += Math.sin(a) * 0.6; }
  }
  for (let k = 0; k < 30; k++) tex.set(rnd() * TEX, rnd() * TEX, rnd() < 0.5 ? [136, 124, 100] : [22, 16, 14]);   // brilho de umidade e carvão
  return tex;
}
function genBogGrass(seed) {
  const tex = grassOver(genPeat(seed + 1), seed, [[168, 190, 78], [112, 144, 58], [76, 106, 46]], [34, 52, 30]);
  const rnd = mulberry32(seed + 9);
  for (let k = 0; k < 7; k++) {                                                       // manchas de musgo entre as fileiras de grama
    const cx = rnd() * TEX, row = Math.floor(rnd() * 4) * T + 9 + Math.floor(rnd() * 5);
    for (let i = 0; i < 6; i++) tex.set(cx + i, row + (i % 3 === 0 ? 1 : 0), i & 1 ? [92, 126, 60] : [128, 156, 70]);
  }
  return tex;
}
function genRedSand(seed) {
  const tex = new Tex(), rnd = mulberry32(seed), pal = [[150, 68, 46], [176, 88, 58], [204, 112, 72], [226, 142, 94], [242, 176, 126]];
  for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
    const v = pfbm2(x / 16, y / 8, 4, seed, 2), ripple = Math.sin((y + v * 12) * 0.9) * 0.12;
    tex.set(x, y, bpRamp(pal, (v + ripple + (hash2(x, y, seed) - 0.5) * 0.2 - 0.12) * 1.3));
  }
  for (let i = 0; i < 46; i++) tex.set(rnd() * TEX, rnd() * TEX, rnd() < 0.5 ? [118, 52, 38] : [252, 206, 158]);
  for (let i = 0; i < 8; i++) { const x = rnd() * TEX, y = rnd() * TEX; tex.set(x, y, [96, 84, 80]); tex.set(x + 1, y, [140, 126, 120]); }   // grãos de rocha
  return tex;
}
// Argila em camadas finas, cada cor com a sua escala; as faixas grandes vêm da escolha do bloco por altura
function genClay(seed, pal) {
  const tex = new Tex(), rnd = mulberry32(seed);
  for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
    const warp = pfbm2(x / 32, y / 32, 2, seed, 2), fine = pfbm2(x / 8, y / 8, 8, seed + 3, 2);
    const strata = Math.sin((y + warp * 6) * BP_TAU * 8 / TEX) * 0.5 + 0.5;
    let v = 0.28 + strata * 0.34 + (fine - 0.5) * 0.28 + (hash2(x, y, seed) - 0.5) * 0.12;
    v += (BAYER4[(y & 3) * 4 + (x & 3)] / 16 - 0.5) * 0.05;
    tex.set(x, y, bpRamp(pal, v));
  }
  for (let k = 0; k < 5; k++) {                                                       // fissuras de ressecamento e seixos
    let x = rnd() * TEX, y = rnd() * TEX;
    for (let i = 0, n = 5 + Math.floor(rnd() * 8); i < n; i++) { tex.set(Math.round(x), Math.round(y), pal[0]); x += (rnd() - 0.5) * 1.4; y += 1; }
  }
  for (let k = 0; k < 20; k++) tex.set(rnd() * TEX, rnd() * TEX, rnd() < 0.5 ? pal[pal.length - 1] : pal[0]);
  return tex;
}
function genSporeSoil(seed) {
  const tex = new Tex(), rnd = mulberry32(seed), pal = [[26, 22, 44], [38, 32, 62], [54, 46, 84], [74, 62, 108], [98, 84, 132]];
  for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
    const v = pfbm2(x / 16, y / 16, 4, seed, 3) * 0.8 + (hash2(x, y, seed) - 0.5) * 0.14;
    tex.set(x, y, bpRamp(pal, (v - 0.22) * 1.5));
  }
  for (let k = 0; k < 40; k++) { const x = rnd() * TEX, y = rnd() * TEX; tex.set(x, y, rnd() < 0.5 ? [118, 238, 214] : [168, 140, 255]); }   // esporos presos na terra
  for (let k = 0; k < 6; k++) { const x = Math.floor(rnd() * TEX), y = Math.floor(rnd() * TEX); tex.set(x, y, [186, 255, 236]); tex.set(x + 1, y, [64, 170, 160]); tex.set(x, y + 1, [64, 170, 160]); }
  return tex;
}
function genSporeGrass(seed) {
  const tex = grassOver(genSporeSoil(seed + 1), seed, [[196, 255, 236], [88, 210, 192], [48, 146, 156]], [28, 58, 96]);
  const rnd = mulberry32(seed + 5);
  for (let k = 0; k < 14; k++) tex.set(rnd() * TEX, Math.floor(rnd() * 4) * T + 2 + Math.floor(rnd() * 3), rnd() < 0.5 ? [255, 240, 255] : [150, 255, 224]);   // pontinhos brilhantes na copa da grama
  return tex;
}
MATERIAL_TEX[TILE.PEAT] = genPeat(5301);
MATERIAL_TEX[TILE.BOG_GRASS] = genBogGrass(5302);
MATERIAL_TEX[TILE.RED_SAND] = genRedSand(5303);
MATERIAL_TEX[TILE.CLAY_RED] = genClay(5304, [[78, 28, 26], [116, 44, 34], [152, 62, 44], [186, 88, 58], [214, 118, 80]]);
MATERIAL_TEX[TILE.CLAY_ORANGE] = genClay(5305, [[112, 52, 26], [160, 82, 36], [200, 114, 50], [230, 150, 74], [248, 184, 112]]);
MATERIAL_TEX[TILE.CLAY_CREAM] = genClay(5306, [[142, 112, 84], [184, 154, 116], [214, 190, 150], [234, 216, 178], [250, 238, 206]]);
MATERIAL_TEX[TILE.SPORE_GRASS] = genSporeGrass(5307);
TOP_COLORS[TILE.BOG_GRASS] = [[168, 190, 78], [112, 144, 58]];
TOP_COLORS[TILE.SPORE_GRASS] = [[196, 255, 236], [88, 210, 192]];
Object.assign(MATERIAL, { [TILE.PEAT]: 'dirt', [TILE.BOG_GRASS]: 'grass', [TILE.RED_SAND]: 'sand', [TILE.CLAY_RED]: 'stone', [TILE.CLAY_ORANGE]: 'stone', [TILE.CLAY_CREAM]: 'stone', [TILE.SPORE_GRASS]: 'grass' });

// ---------------------------------------------------------------- relevo e solo de cada bioma
// A mesa sobe e desce em degraus de 3 blocos (dá para pular de um para o outro) e as camadas de argila
// dependem da altura absoluta: a mesma faixa colorida atravessa o paredão de ponta a ponta.
const MESA_BANDS = [[TILE.CLAY_RED, 3], [TILE.CLAY_CREAM, 1], [TILE.CLAY_ORANGE, 2], [TILE.CLAY_RED, 2], [TILE.CLAY_CREAM, 1], [TILE.CLAY_ORANGE, 3], [TILE.CLAY_RED, 4], [TILE.CLAY_CREAM, 2], [TILE.CLAY_ORANGE, 2]];
const MESA_BAND_TOTAL = MESA_BANDS.reduce((n, b) => n + b[1], 0);
function mesaClayAt(y, x, seed) {
  let p = Math.floor(y + noise1(x * 0.03, seed + 5301) * 1.4 + 400) % MESA_BAND_TOTAL;
  for (const [t, n] of MESA_BANDS) { if (p < n) return t; p -= n; }
  return TILE.CLAY_RED;
}
BIOME_EXTRA[BIOME.SWAMP] = { top: TILE.BOG_GRASS, fill: TILE.PEAT, soil: [9, 4], treeGap: [7, 6], treeGround: [TILE.BOG_GRASS], treeHeight: [6, 6] };
BIOME_EXTRA[BIOME.MESA] = {
  top: TILE.RED_SAND, fill: TILE.CLAY_RED, soil: [34, 14], treeGap: null,
  shape: (s, x, world) => Math.round((s - world.seaLevel + 8) / 3) * 3 + world.seaLevel - 8,
  layer: (depth, x, seed, soil, y) => (depth < 2 ? TILE.RED_SAND : depth < soil ? mesaClayAt(y, x, seed) : 0),
};
BIOME_EXTRA[BIOME.FUNGAL] = { top: TILE.SPORE_GRASS, fill: TILE.DIRT, soil: [5, 3], treeGap: [10, 8], treeGround: [TILE.SPORE_GRASS], treeHeight: [5, 5] };
// o pântano e a mesa também ganham as árvores/pedras dos outros pontos do mundo que olham para estes mapas
for (const t of [TILE.PEAT, TILE.BOG_GRASS, TILE.RED_SAND, TILE.CLAY_RED, TILE.CLAY_ORANGE, TILE.CLAY_CREAM, TILE.SPORE_GRASS]) ENV_NATURAL.add(t);
for (const t of [TILE.BOG_GRASS, TILE.SPORE_GRASS]) SAPLING_SOIL.add(t);
SAPLING_SOIL.add(TILE.PEAT); SAPLING_SOIL.add(TILE.RED_SAND);

GROUND_FILL[TILE.BOG_GRASS] = TILE.PEAT; GROUND_FILL[TILE.SPORE_GRASS] = TILE.DIRT; GROUND_FILL[TILE.RED_SAND] = TILE.CLAY_RED;
BIOME_GROUND[BIOME.SWAMP] = TILE.BOG_GRASS; BIOME_GROUND[BIOME.MESA] = TILE.RED_SAND; BIOME_GROUND[BIOME.FUNGAL] = TILE.SPORE_GRASS;

// ---------------------------------------------------------------- céu
BIOME_DAY_SKY.push(
  { top: [64, 104, 116], mid: [124, 158, 150], hor: [200, 210, 166], fog: [172, 192, 158] },   // pântano: céu verde-acinzentado e abafado
  { top: [60, 124, 204], mid: [148, 184, 216], hor: [252, 204, 148], fog: [246, 194, 148] },   // mesa: azul forte que esquenta no horizonte
  { top: [50, 62, 134], mid: [112, 108, 186], hor: [204, 168, 232], fog: [168, 148, 214] },    // bosque luminoso: crepúsculo eterno
);

// ---------------------------------------------------------------- lagoas do pântano
// Cada lagoa é um "rio" curto e raso (js/water-gen.js): ganha vitória-régia, alga e a água física de sempre.
function carveSwampPonds(world, rnd) {
  const { w, tiles, surface } = world;
  for (const seg of biomeRuns(world, BIOME.SWAMP)) {
    const [a, b] = seg, tries = Math.max(1, Math.floor((b - a) / 38));
    for (let k = 0; k < tries * 6 && world.rivers.filter((r) => r.cx >= a && r.cx <= b && r.swamp).length < tries; k++) {
      const hw = 4 + Math.floor(rnd() * 5), cx = a + 12 + Math.floor(rnd() * Math.max(1, b - a - 24));
      if (cx - hw < 3 || cx + hw >= world.oceanStart - 4) continue;
      if (world.rivers.some((r) => Math.abs(r.cx - cx) < r.hw + hw + 12)) continue;
      const wl = Math.max(surface[cx - hw - 1], surface[cx + hw + 1]) + 1;
      let low = -Infinity, high = Infinity;
      for (let x = cx - hw; x <= cx + hw; x++) { low = Math.max(low, surface[x]); high = Math.min(high, surface[x]); }
      if (high < wl - 5 || low > wl + 3) continue;                                   // barranco ou ladeira demais
      for (let x = cx - hw - 1; x <= cx + hw + 1; x++)                               // árvore e toco na beira saem do caminho
        for (let y = surface[x] - 16; y < surface[x]; y++) if (tiles[y * w + x] === TILE.TRUNK || tiles[y * w + x] === TILE.STUMP) tiles[y * w + x] = TILE.AIR;
      const river = carveRiver(world, rnd, cx, hw, wl, 0, false, 2 + Math.floor(rnd() * 2));
      river.swamp = true;
      world.waterBand = [Math.min(world.waterBand?.[0] ?? wl, wl), Math.max(world.waterBand?.[1] ?? wl, wl + river.depth + 1)];
    }
  }
}

// ---------------------------------------------------------------- detalhes da superfície
// Pedras soltas, pilares de argila da mesa e cactos: blocos de verdade (dá para quebrar, escalar e minerar).
function bpGround(world, x) {
  const y = world.surface[x], t = world.tiles[y * world.w + x];
  if (!SOLID[t] || world.water[(y - 1) * world.w + x] || world.tiles[(y - 1) * world.w + x] !== TILE.AIR) return -1;
  return y;
}
function placeBoulder(world, rnd, x, tile, cap) {
  const widths = [3, 4, 4, 5][Math.floor(rnd() * 4)], profile = widths === 3 ? [1, 2, 1] : widths === 4 ? [1, 2, 2, 1] : [1, 2, 3, 2, 1];
  for (let i = 0; i < widths; i++) if (bpGround(world, x + i) < 0 || Math.abs(world.surface[x + i] - world.surface[x]) > 1) return false;
  const base = Math.min(...Array.from({ length: widths }, (_, i) => world.surface[x + i]));
  for (let i = 0; i < widths; i++) for (let k = 1; k <= profile[i]; k++) {
    const yy = base - k;
    if (world.tiles[yy * world.w + x + i] !== TILE.AIR) continue;
    world.tiles[yy * world.w + x + i] = k === profile[i] && cap && rnd() < 0.7 ? cap : tile;
  }
  for (let i = 0; i < widths; i++) for (let yy = world.surface[x + i] - 1; yy >= base; yy--) if (world.tiles[yy * world.w + x + i] === TILE.AIR) world.tiles[yy * world.w + x + i] = tile;
  return true;
}
// Pilar de argila (hoodoo): coluna em faixas, mais fina no topo, com uma "cartola" de rocha mais larga
function placeHoodoo(world, rnd, x) {
  const wdt = 2 + Math.floor(rnd() * 2), height = 7 + Math.floor(rnd() * 12), { w, tiles, surface } = world;
  for (let i = -1; i <= wdt; i++) if (bpGround(world, x + i) < 0 || Math.abs(surface[x + i] - surface[x]) > 1) return false;
  const base = Math.min(...Array.from({ length: wdt + 2 }, (_, i) => surface[x - 1 + i]));
  for (let k = 1; k <= height; k++) {
    const y = base - k, neck = k > height * 0.55 && k < height - 1;
    for (let i = neck ? 0 : -((k > height - 2 || k < 3) ? 1 : 0); i < wdt + (neck ? 0 : ((k > height - 2 || k < 3) ? 1 : 0)); i++) tiles[y * w + x + i] = mesaClayAt(y, x + i, world.seed);
  }
  for (let i = -1; i <= wdt; i++) for (let y = surface[x + i] - 1; y >= base; y--) if (tiles[y * w + x + i] === TILE.AIR) tiles[y * w + x + i] = mesaClayAt(y, x + i, world.seed);
  const top = base - height;
  for (let i = -1; i <= wdt; i++) tiles[(top - 1) * w + x + i] = TILE.STONE;
  return true;
}
function* generateBiomeFeatures(world) {
  const { w, tiles, surface } = world, rnd = mulberry32((world.seed ^ 0x2b7e1516) | 0);   // sorteio próprio: não mexe na sequência do resto da geração
  // Lagoas do pântano (a água do mundo já foi montada: elas entram na mesma lista de rios)
  carveSwampPonds(world, rnd);
  // Pedras grandes no meio do caminho, em todos os biomas de terra
  for (let x = 12; x < world.oceanStart - 12;) {
    x += 34 + Math.floor(rnd() * 46);
    const b = world.biome[x];
    if (b === BIOME.OCEAN || x >= world.oceanStart - 12) continue;
    if (b === BIOME.MESA) { if (rnd() < 0.5) placeHoodoo(world, rnd, x); else placeBoulder(world, rnd, x, TILE.CLAY_RED, TILE.RED_SAND); continue; }
    if (b === BIOME.SNOW) placeBoulder(world, rnd, x, TILE.STONE, TILE.SNOW);
    else if (b === BIOME.DESERT) placeBoulder(world, rnd, x, TILE.SANDSTONE, TILE.SAND);
    else if (b === BIOME.SWAMP) placeBoulder(world, rnd, x, TILE.MOSS_STONE ?? TILE.STONE, TILE.BOG_GRASS);
    else if (b === BIOME.FUNGAL) placeBoulder(world, rnd, x, TILE.MYCELIUM_STONE ?? TILE.STONE, TILE.SPORE_GRASS);
    else placeBoulder(world, rnd, x, TILE.STONE, b === BIOME.JUNGLE ? TILE.JUNGLE_GRASS : b === BIOME.SAVANNA ? TILE.DRY_GRASS : TILE.GRASS);
  }
  // Mesa: pilares, cactos e blocos soltos pelo cânion
  for (const [a, e] of biomeRuns(world, BIOME.MESA)) {
    for (let x = a + 6; x < e - 6;) {
      x += 9 + Math.floor(rnd() * 16);
      if (x >= e - 6) break;
      const y = bpGround(world, x);
      if (y < 0) continue;
      if (rnd() < 0.55) { const hgt = 2 + Math.floor(rnd() * 5); for (let i = 1; i <= hgt; i++) tiles[(y - i) * w + x] = TILE.CACTUS; }
      else if (rnd() < 0.3) placeHoodoo(world, rnd, x);
    }
  }
  yield [0.975, 'Espalhando pedras e detalhes'];
}

// ---------------------------------------------------------------- nomes e textos para o guia de itens
const BIOME_ITEM_NOTES = { PEAT: 'Pântanos.', RED_SAND: 'Mesa Vermelha.', CLAY_RED: 'Paredões da Mesa Vermelha.', CLAY_ORANGE: 'Paredões da Mesa Vermelha.', CLAY_CREAM: 'Paredões da Mesa Vermelha.' };
