'use strict';
// =====================================================================================
//  SUPERFÍCIE VIVA: vegetação quebrável, achados do chão e itens novos
// =====================================================================================
//  • Todo o mato, flor e arbusto da superfície vem daqui (a decoração antiga sem colheita sai de cena na superfície).
//    O que nasce depende do BLOCO do chão, então a divisa entre biomas fica natural.
//  • Mato, flores e arbustos: botão esquerdo (ou golpe de lâmina) colhe, e a planta volta a crescer depois.
//  • Achados do chão (pedrinha, graveto, pinha, concha, pena, osso, cogumelo): BOTÃO DIREITO pega. Eles brilham
//    de leve para se notarem no caminho, e só o botão direito mexe neles (o esquerdo continua cavando o chão).
// Carrega depois de surface-art.js.

// ---------------------------------------------------------------- itens
for (const k of ['PEBBLE', 'PINECONE', 'FIELD_MUSHROOM', 'BERRY', 'ALOE', 'BERRY_JAM']) ITEM[k] = Math.max(...Object.values(ITEM)) + 1;
defItem(ITEM.PEBBLE, { name: 'Pedrinha', descricao: 'Achada no caminho. Três delas viram uma pedra.' });
defItem(ITEM.PINECONE, { name: 'Pinha', descricao: 'Cheia de resina: com um graveto vira tocha.' });
defItem(ITEM.FIELD_MUSHROOM, { name: 'Cogumelo-do-campo', cura: 10, descricao: 'Nasce em solo úmido. Bom assado, melhor ainda em ensopado.' });
defItem(ITEM.BERRY, { name: 'Frutinhas silvestres', cura: 8, descricao: 'Docinhas. Dão geleia.' });
defItem(ITEM.ALOE, { name: 'Babosa', cura: 12, descricao: 'Folha carnuda e fresca. Faz um bom curativo.' });
defItem(ITEM.BERRY_JAM, { name: 'Geleia silvestre', cura: 26, descricao: 'Frutinhas cozidas num pote. Energia para a trilha.' });

// Ícones 16x16 desenhados em código e convertidos para o formato de ITEM_ART
function iconArt(paint) {
  const s = new Sprite(16, 16);
  paint(s);
  const cores = {}, byColor = new Map(), alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', pixels = [];
  for (let y = 0; y < 16; y++) {
    let row = '';
    for (let x = 0; x < 16; x++) {
      const i = (y * 16 + x) * 4;
      if (s.d[i + 3] < 128) { row += '.'; continue; }
      const key = s.d[i] + ',' + s.d[i + 1] + ',' + s.d[i + 2];
      if (!byColor.has(key)) { const ch = alphabet[byColor.size % alphabet.length]; byColor.set(key, ch); cores[ch] = [s.d[i], s.d[i + 1], s.d[i + 2]]; }
      row += byColor.get(key);
    }
    pixels.push(row);
  }
  return { cores, pixels };
}
const SL_ROCK = [[62, 62, 72], [118, 116, 124], [178, 176, 184], [226, 224, 230]];
ITEM_ART[ITEM.PEBBLE] = iconArt((s) => {
  for (const [x, y, rx, ry] of [[5.5, 10.5, 3.6, 2.8], [10.5, 9.5, 3.8, 3.2], [8, 12.5, 3.2, 2.2]])
    shadeBall(s, x, y, rx, ry, (l, dx, dy) => (dy > 0.5 ? SL_ROCK[0] : SL_ROCK[clamp(Math.floor(l * 3.4 + 0.2), 0, 3)]));
});
ITEM_ART[ITEM.PINECONE] = iconArt((s) => {
  shadeBall(s, 8, 9, 4.2, 5.8, (l) => [[78, 44, 24], [128, 78, 42], [176, 118, 64], [222, 168, 98]][clamp(Math.floor(l * 3.8), 0, 3)]);
  for (let r = 0; r < 5; r++) for (let c = -2; c <= 2; c++) if ((c + r) % 2 === 0) { const x = 8 + c * 1.6 - (r & 1) * 0.8, y = 5 + r * 2; s.set(Math.round(x), Math.round(y), [66, 36, 20]); s.set(Math.round(x), Math.round(y) - 1, [214, 156, 88]); }
  for (let k = 0; k < 3; k++) { s.set(8 + (k & 1), 2 - (k >> 1), [96, 130, 60]); s.set(7 - k, 3, [70, 110, 50]); }
});
ITEM_ART[ITEM.FIELD_MUSHROOM] = iconArt((s) => {
  for (let y = 9; y < 14; y++) { s.set(7, y, [250, 240, 218]); s.set(8, y, [222, 204, 176]); s.set(9, y, [160, 140, 112]); }
  shadeBall(s, 8, 8, 6, 3.8, (l, dx, dy) => (dy > 0.45 ? [96, 62, 40] : [[96, 62, 40], [150, 104, 66], [196, 152, 104], [236, 208, 164]][clamp(Math.floor(l * 3.6 + 0.2), 0, 3)]));
  s.set(5, 6, [252, 240, 214]); s.set(10, 7, [252, 240, 214]);
});
ITEM_ART[ITEM.BERRY] = iconArt((s) => {
  for (const [x, y] of [[5, 9], [10, 8], [7.5, 12], [8, 5.5]]) shadeBall(s, x, y, 2.7, 2.7, (l) => [[110, 14, 40], [190, 28, 58], [236, 70, 92], [255, 168, 176]][clamp(Math.floor(l * 3.6), 0, 3)]);
  for (const [x, y] of [[8, 2], [9, 3], [10, 2]]) s.set(x, y, [70, 140, 60]); s.set(7, 3, [40, 100, 44]); s.set(8, 3, [96, 170, 70]);
});
ITEM_ART[ITEM.ALOE] = iconArt((s) => {
  for (const [a, len] of [[-2.5, 9], [-2.0, 11], [-1.57, 12], [-1.1, 11], [-0.6, 9]]) {
    for (let k = 0; k <= len; k++) {
      const u = k / len, x = 8 + Math.cos(a) * k, y = 14 + Math.sin(a) * k, w = (1 - u) * 1.9 + 0.5;
      for (let dx = -Math.ceil(w); dx <= Math.ceil(w); dx++) if (Math.abs(dx) <= w) s.set(Math.round(x + dx), Math.round(y), dx < 0 ? [120, 200, 96] : dx > 0 ? [36, 100, 52] : [70, 150, 72]);
      if (k % 3 === 1) s.set(Math.round(x + w + 1), Math.round(y), [200, 240, 170]);
    }
  }
});
ITEM_ART[ITEM.BERRY_JAM] = iconArt((s) => {
  for (let y = 5; y < 14; y++) for (let x = 3; x < 13; x++) { const edge = x === 3 || x === 12 || y === 13; s.set(x, y, edge ? [150, 190, 206] : x < 6 ? [220, 240, 248] : [190, 224, 238], 255); }
  for (let y = 7; y < 13; y++) for (let x = 4; x < 12; x++) s.set(x, y, y === 7 ? [236, 90, 110] : x < 6 ? [214, 48, 78] : x > 9 ? [140, 20, 52] : [180, 30, 64]);
  for (let x = 3; x < 13; x++) { s.set(x, 4, [210, 150, 90]); s.set(x, 3, (x & 1) ? [236, 188, 120] : [196, 130, 76]); }
  s.set(5, 8, [255, 190, 200]); s.set(5, 9, [255, 160, 176]);
});
Object.assign(ITEM_DEFS[ITEM.BERRY], { cura: 8 });

RECIPES.push(
  { nome: 'Pedra (pedrinhas)', ingredientes: [[ITEM.PEBBLE, 3]], resultado: { item: ITEM.STONE, quantidade: 1 } },
  { nome: 'Tochas de pinha', ingredientes: [[ITEM.PINECONE, 1], [ITEM.STICK, 1]], resultado: { item: ITEM.TORCH, quantidade: 2 } },
  { nome: 'Vidro de conchas', ingredientes: [[ITEM.SHELL, 4], [ITEM.SAND, 1]], resultado: { item: ITEM.GLASS, quantidade: 2 } },
  { nome: 'Emplastro de babosa', ingredientes: [[ITEM.ALOE, 2], [ITEM.FIBER, 1]], resultado: { item: ITEM.BANDAGE, quantidade: 2 } },
  { nome: 'Geleia silvestre', ingredientes: [[ITEM.BERRY, 4], [ITEM.WATER, 1]], resultado: { item: ITEM.BERRY_JAM, quantidade: 1 } },
  { nome: 'Ensopado de cogumelo-do-campo', ingredientes: [[ITEM.FIELD_MUSHROOM, 3], [ITEM.WATER, 1]], resultado: { item: ITEM.MUSHROOM_STEW, quantidade: 1 } },
);

// ---------------------------------------------------------------- regras de colheita
// direito = só o botão direito pega (achados do chão); extra = [[item, chance, qtd]]; countMax = quantidade sorteada
Object.assign(ENV_HARVEST, {
  sGrass: { item: ITEM.FIBER, lamina: true, volta: 140, bicho: 0.12 },
  sTall: { item: ITEM.FIBER, extra: [[ITEM.FIBER, 0.45, 1]], lamina: true, volta: 170, bicho: 0.12 },
  sFern: { item: ITEM.FIBER, extra: [[ITEM.FIBER, 0.4, 1]], lamina: true, volta: 180, bicho: 0.14 },
  sCattail: { item: ITEM.FIBER, count: 2, lamina: true, volta: 200, bicho: 0.1 },
  sFlower: { item: ITEM.FLOWER, extra: [[ITEM.FLOWER, 0.3, 1]], lamina: true, volta: 160, bicho: 0.2 },
  sBush: { item: ITEM.STICK, extra: [[ITEM.FIBER, 0.7, 1]], lamina: true, volta: 260, bicho: 0.14 },
  sBerry: { item: ITEM.BERRY, count: 2, countMax: 3, extra: [[ITEM.STICK, 0.25, 1]], lamina: true, volta: 320, bicho: 0.12 },
  sBlueberry: { item: ITEM.BERRY, count: 2, countMax: 3, lamina: true, volta: 320, bicho: 0.12 },
  sBlossomBush: { item: ITEM.FLOWER, count: 2, lamina: true, volta: 280, bicho: 0.2 },
  sHydrangea: { item: ITEM.FLOWER, count: 2, lamina: true, volta: 280, bicho: 0.2 },
  sHolly: { item: ITEM.BERRY, count: 1, countMax: 2, extra: [[ITEM.STICK, 0.3, 1]], lamina: true, volta: 360 },
  sFrostBush: { item: ITEM.STICK, lamina: true, volta: 300 },
  sThorn: { item: ITEM.STICK, count: 2, lamina: true, volta: 300 },
  sSage: { item: ITEM.FIBER, count: 2, lamina: true, volta: 260 },
  sRedShrub: { item: ITEM.FLOWER, count: 1, countMax: 2, extra: [[ITEM.FIBER, 0.5, 1]], lamina: true, volta: 260, bicho: 0.12 },
  sTwigs: { item: ITEM.STICK, count: 2, lamina: true, volta: 300, bicho: 0.1 },
  sTumble: { item: ITEM.STICK, count: 1, extra: [[ITEM.FIBER, 0.8, 2]], lamina: true, volta: 360 },
  sAgave: { item: ITEM.FIBER, count: 2, countMax: 3, lamina: true, volta: 360 },
  sBarril: { item: ITEM.CACTUS, lamina: false, volta: 500 },
  sBabosa: { item: ITEM.ALOE, count: 1, countMax: 2, lamina: true, volta: 420 },
  sGlow: { item: ITEM.GLOW_CAP, lamina: true, volta: 420 },
  sViolet: { item: ITEM.GLOW_CAP, lamina: true, volta: 420 },
  sPods: { item: ITEM.GLOW_CAP, extra: [[ITEM.FIBER, 0.5, 1]], lamina: true, volta: 420 },
  // achados do chão: botão direito
  sPebble: { item: ITEM.PEBBLE, count: 1, countMax: 2, direito: true, volta: 600 },
  sStick: { item: ITEM.STICK, direito: true, volta: 600 },
  sPinecone: { item: ITEM.PINECONE, direito: true, volta: 700 },
  sShell: { item: ITEM.SHELL, direito: true, volta: 700 },
  sStarfish: { item: ITEM.STARFISH, direito: true, volta: 900 },
  sFeather: { item: ITEM.FEATHER, direito: true, volta: 800 },
  sBone: { item: ITEM.BONE, direito: true, volta: 900 },
  sShroom: { item: ITEM.FIELD_MUSHROOM, count: 1, countMax: 2, direito: true, volta: 600 },
});
for (const k of ['sPebble', 'sBarril']) ENV_STONEY.add(k);

// ---------------------------------------------------------------- o que nasce em cada solo
// [tipo, peso]; 'flower' sorteia a cor pelo canteiro (blocos vizinhos têm a mesma flor); 'base:x' vem de js/environment.js
const SURFACE_PLANTS = {
  forest:  { density: 0.78, flowers: ['daisy', 'poppy', 'bluebell', 'buttercup', 'tulip', 'lavender'], list: [['grass', 30], ['tall', 9], ['flower', 17], ['bush', 6], ['berry', 4], ['fern', 8], ['base:log', 2], ['base:litter', 3]] },
  savanna: { density: 0.72, flowers: ['marigold', 'buttercup'], list: [['grass', 24], ['tall', 24], ['thorn', 6], ['flower', 4], ['twigs', 3], ['tumble', 2]] },
  jungle:  { density: 0.92, flowers: ['orchid', 'heliconia', 'orchid'], list: [['grass', 18], ['tall', 12], ['fern', 26], ['flower', 12], ['bush', 6], ['blueberry', 4]] },
  sakura:  { density: 0.8, flowers: ['pinkStar', 'daisy', 'tulip'], list: [['grass', 28], ['tall', 8], ['flower', 14], ['hydrangea', 8], ['blossomBush', 5], ['fern', 5]] },
  swamp:   { density: 0.88, flowers: ['iris', 'violet'], list: [['cattail', 20], ['grass', 14], ['tall', 10], ['fern', 10], ['flower', 8], ['bush', 6]] },
  fungal:  { density: 0.9, flowers: ['violet'], list: [['glow', 14], ['violet', 10], ['pods', 10], ['grass', 18], ['fern', 10], ['flower', 6]] },
  mesa:    { density: 0.5, flowers: ['orange', 'marigold'], list: [['sage', 12], ['redShrub', 8], ['barril', 6], ['agave', 6], ['babosa', 3], ['grass', 10], ['tumble', 3], ['flower', 4]] },
  dry:     { density: 0.36, flowers: ['orange'], list: [['twigs', 6], ['tumble', 3], ['barril', 5], ['agave', 4], ['babosa', 3], ['grass', 6], ['flower', 2]] },
  snow:    { density: 0.44, flowers: ['snowdrop'], list: [['grass', 12], ['frostBush', 8], ['holly', 5], ['twigs', 6], ['flower', 8]] },
  beach:   { density: 0.32, flowers: ['pinkStar'], list: [['tall', 10], ['grass', 8], ['twigs', 3]] },
};
// achados: p = chance por bloco de chão
const SURFACE_FINDS = {
  forest: { p: 0.09, list: [['pebble', 45], ['stick', 22], ['pinecone', 8], ['shroom', 14], ['feather', 6]] },
  savanna: { p: 0.08, list: [['pebble', 40], ['bone', 20], ['feather', 14], ['stick', 6]] },
  jungle: { p: 0.08, list: [['pebble', 25], ['stick', 28], ['shroom', 22], ['feather', 12]] },
  sakura: { p: 0.08, list: [['pebble', 40], ['stick', 20], ['shroom', 14], ['feather', 8]] },
  swamp: { p: 0.09, list: [['pebble', 25], ['stick', 26], ['shroom', 24], ['bone', 5]] },
  fungal: { p: 0.08, list: [['pebble', 45], ['shroom', 14]] },
  mesa: { p: 0.09, list: [['pebble', 60], ['bone', 22]] },
  dry: { p: 0.08, list: [['pebble', 46], ['bone', 28]] },
  snow: { p: 0.08, list: [['pebble', 50], ['pinecone', 30], ['stick', 12]] },
  beach: { p: 0.14, list: [['shell', 48], ['starfish', 12], ['pebble', 20], ['stick', 12]] },
};
// a cobertura define o "clima" da planta; areia depende do bioma (praia, mesa ou deserto)
function surfaceKey(world, x, t) {
  switch (t) {
    case TILE.GRASS: return 'forest';
    case TILE.DRY_GRASS: return 'savanna';
    case TILE.JUNGLE_GRASS: return 'jungle';
    case TILE.SAKURA_GRASS: return 'sakura';
    case TILE.BOG_GRASS: case TILE.PEAT: return 'swamp';
    case TILE.SPORE_GRASS: return 'fungal';
    case TILE.SNOW: return 'snow';
    case TILE.RED_SAND: return 'mesa';
    case TILE.SAND: { const b = world.biomeAt(x); return b === BIOME.OCEAN ? 'beach' : b === BIOME.MESA ? 'mesa' : 'dry'; }
    case TILE.MUD: { const b = world.biomeAt(x); return b === BIOME.JUNGLE ? 'jungle' : b === BIOME.SWAMP ? 'swamp' : 'forest'; }
    default: {
      const b = world.biomeAt(x);
      return b === BIOME.DESERT ? 'dry' : b === BIOME.SNOW ? 'snow' : b === BIOME.JUNGLE ? 'jungle' : b === BIOME.SAVANNA ? 'savanna' : b === BIOME.SAKURA ? 'sakura' : b === BIOME.SWAMP ? 'swamp' : b === BIOME.MESA ? 'mesa' : b === BIOME.FUNGAL ? 'fungal' : b === BIOME.OCEAN ? 'beach' : 'forest';
    }
  }
}
const SURFACE_GROUND = new Set([TILE.GRASS, TILE.DRY_GRASS, TILE.JUNGLE_GRASS, TILE.SAKURA_GRASS, TILE.BOG_GRASS, TILE.SPORE_GRASS, TILE.SNOW, TILE.SAND, TILE.RED_SAND]);   // aceitam planta
const SURFACE_SOFT = new Set([TILE.MUD, TILE.PEAT, TILE.DIRT]);                                   // só um pouco de mato
const SURFACE_ANY = new Set([...SURFACE_GROUND, ...SURFACE_SOFT, TILE.STONE, TILE.SANDSTONE, TILE.CLAY_RED, TILE.CLAY_ORANGE, TILE.CLAY_CREAM]); // aceitam achados
// Sorteio com sal próprio: hash2 com sementes vizinhas dá números parecidos para o mesmo bloco, então cada decisão mistura o próprio sal
const slh = (x, y, seed, salt) => hash2(Math.imul(x, 73856093) ^ (salt * 2654435), Math.imul(y, 19349663) + salt * 40503, seed ^ (salt * 7919));
function surfacePick(list, r) {
  let total = 0; for (const e of list) total += e[1];
  r *= total;
  for (const e of list) { r -= e[1]; if (r <= 0) return e[0]; }
  return list[0][0];
}
function surfaceSpriteFor(world, x, y, kind, key, v) {
  if (kind.startsWith('base:')) return environmentSprite(kind.slice(5), v);
  if (kind === 'flower') {
    const spec = SURFACE_PLANTS[key], cell = slh(Math.floor(x / 6), Math.floor(y / 4), world.seed, 17);
    return surfaceSprite('flower:' + spec.flowers[Math.floor(cell * spec.flowers.length)], key, v);
  }
  return surfaceSprite(kind, key, v);
}
// espaço livre em cima (e dos lados, para o que é alto)
function surfaceClear(world, x, y, sprite, touched) {
  const rows = Math.ceil((sprite.height - 2) / T);
  for (let k = 1; k <= rows; k++) { const yy = y - k; if (world.getTile(x, yy) !== TILE.AIR || touched?.has(yy * world.w + x)) return false; }
  if (sprite.height > 34) for (const dx of [-1, 1]) for (let k = 2; k <= rows; k++) if (world.getTile(x + dx, y - k) !== TILE.AIR) return false;
  return true;
}
{
  const baseDecoration = generateEnvironmentDecoration;
  generateEnvironmentDecoration = function (world, x, y, ceiling = false) {
    if (ceiling) return baseDecoration(world, x, y, ceiling);
    const t = world.getTile(x, y), ay = y - 1;
    if (!SURFACE_ANY.has(t) || world.getTile(x, ay) !== TILE.AIR || world.hasWater(x, ay)) return baseDecoration(world, x, y, ceiling);
    if (caveHabitat(world, x, ay) || (typeof inCoreBand === 'function' && inCoreBand(world, x, y))) return baseDecoration(world, x, y, ceiling);
    const touched = world.touched;
    if (touched?.size && (touched.has(y * world.w + x) || touched.has(ay * world.w + x))) return null;
    const key = surfaceKey(world, x, t), seed = world.seed, v = Math.floor(slh(x, y, seed, 16) * 4);
    // 1. achados do chão
    const finds = SURFACE_FINDS[key];
    if (finds && slh(x, y, seed, 11) < finds.p) {
      const kind = surfacePick(finds.list, slh(x, y, seed, 12)), sprite = surfaceSprite(kind, key, v);
      return surfaceClear(world, x, y, sprite, touched) ? sprite : null;
    }
    if (!SURFACE_GROUND.has(t) && !(SURFACE_SOFT.has(t) && key !== 'forest')) return null;
    // 2. plantas
    const spec = SURFACE_PLANTS[key], cluster = 0.58 + 0.42 * noise2(x / 9, y / 6, seed + 39);
    if (slh(x, y, seed, 13) > spec.density * cluster * (SURFACE_SOFT.has(t) ? 0.45 : 1)) return null;
    const wet = key !== 'dry' && key !== 'snow' && key !== 'mesa' && [-2, -1, 1, 2].some((dx) => world.hasWater(x + dx, y - 1) || world.hasWater(x + dx, y));
    let kind = wet && key !== 'fungal' ? (slh(x, y, seed, 14) < 0.6 ? 'cattail' : 'tall') : surfacePick(spec.list, slh(x, y, seed, 15));
    if (SURFACE_SOFT.has(t) && !['grass', 'tall', 'fern', 'cattail'].includes(kind)) kind = 'grass';
    const sprite = surfaceSpriteFor(world, x, y, kind, key, v);
    return surfaceClear(world, x, y, sprite, touched) ? sprite : null;
  };
  // A decoração antiga de superfície (mato, flor, arbusto e pedrinha sem colheita) cede lugar à nova
  const baseAbove = decorAbove;
  decorAbove = function (t, x, y, underground, deep = underground) {
    if (!underground && SURFACE_ANY.has(t)) return null;
    return baseAbove(t, x, y, underground, deep);
  };
  // Brilho de bosque: cogumelos, brotos e pedras de esporo acendem o chão (já existia só nas cavernas)
  const baseEmission = environmentEmissionAt;
  environmentEmissionAt = function (world, x, y) {
    const r = baseEmission(world, x, y);
    if (r) return r;
    if (world.getTile(x, y) !== TILE.AIR || !world.isSkyExposed(x, y) || world.biomeAt(x) !== BIOME.FUNGAL) return 0;
    const sp = environmentDecoration(world, x, y + 1);
    return sp?.envGlow ? { level: 12, color: sp.envGlow } : 0;
  };
}

// ---------------------------------------------------------------- brilho dos achados
// Um pontinho de luz pisca de vez em quando em cima de cada achado perto de quem passa
{
  const baseDraw = drawEnvironmentPlant;
  drawEnvironmentPlant = function (renderer, g, source, x, y, tx, ty, foliage = false, hang = false) {
    baseDraw(renderer, g, source, x, y, tx, ty, foliage, hang);
    if (!source.envPickup || !g.player) return;
    const now = performance.now() / 1000, phase = (now * 0.55 + hash2(tx, ty, 71) * 6) % 1;
    if (phase > 0.28) return;
    const near = Math.abs((tx + 0.5) * T - g.player.cx) < 7 * T && Math.abs((ty + 0.5) * T - g.player.cy) < 5 * T;
    if (!near) return;
    if (!g.pickupHint && !ITEM_DEFS[g.inventory?.slots[g.selected]?.item]?.fishingRod && Math.abs((tx + 0.5) * T - g.player.cx) < 4 * T && typeof toast === 'function') { g.pickupHint = true; toast('Algo brilha no chão: botão direito pega.'); }
    const k = Math.sin((phase / 0.28) * Math.PI), c = renderer.ctx, sx = Math.round(x + (source.envOx ?? 4) + 8 + (hash2(tx, ty, 72) - 0.5) * 8), sy = Math.round(y + source.height * 0.35);
    c.save(); c.globalAlpha = k;
    c.fillStyle = '#fffbe0'; c.fillRect(sx, sy, 1, 1);
    c.fillStyle = 'rgba(255,250,200,0.8)'; if (k > 0.5) { c.fillRect(sx - 1, sy, 1, 1); c.fillRect(sx + 1, sy, 1, 1); c.fillRect(sx, sy - 1, 1, 1); c.fillRect(sx, sy + 1, 1, 1); }
    c.restore();
  };
}

// ---------------------------------------------------------------- pegar com o botão direito
// Procura o achado no bloco do cursor (ou no chão logo embaixo dele) e recolhe, se estiver ao alcance
function pickupGround(g, tx, ty) {
  const world = g.world;
  for (const gy of [ty + 1, ty, ty + 2]) {
    const sprite = environmentDecoration(world, tx, gy, false);
    if (!sprite?.envPickup) continue;
    // o cursor precisa estar em cima do sprite (não mais que 2 blocos acima do chão)
    if (gy === ty + 2 && sprite.height <= T) continue;
    return environmentHarvest(g, tx, gy, false, false, true);
  }
  return false;
}
