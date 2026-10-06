'use strict';

// =====================================================================================
//  RUÍNAS TOMADAS PELO MATO E TRIBOS DA ILHA
// =====================================================================================
// O que é "moderno" em Valdoria ficou para trás: casas de madeira com o telhado desabado e uma
// árvore atravessando o sobrado, prédios de concreto com metade caída em degraus de entulho e
// vergalhão para fora, torres com as ameias quebradas. Tudo com hera subindo e caindo das lajes.
// Quem mora aqui hoje são as tribos: o povo isolado (ocas e palafitas, totens, varal de couro)
// e os canibais, atrás de uma paliçada com estacas de crânio, que não deixam ninguém chegar perto.
//
// As construções são PLANTAS desenhadas em texto (uma letra por bloco, de cima para baixo; a
// última linha é o chão). As mesmas plantas estão no quadro de design "Valdoria — Ruínas e
// Tribos". Depois de carimbada, cada planta passa pelo `overgrow`, que espalha musgo e hera.

// ---------- Legenda das plantas ----------
// [bloco, parede de fundo]  — 'back' = parede de fundo da planta. '/' e ')' são as peças
// inclinadas do telhado do estilo (trocam de lado quando a planta é espelhada).
const BP_LEGEND = {
  '.': [TILE.AIR, WALL.NONE], ',': [TILE.AIR, 'back'],
  '#': [TILE.CONCRETE, 'back'], '%': [TILE.MOSSY_CONCRETE, 'back'], '=': [TILE.CONCRETE, WALL.NONE],
  'R': [TILE.REBAR, WALL.NONE], 'r': [TILE.RUBBLE, WALL.NONE], 'q': [TILE.RUBBLE, 'back'],
  'o': [TILE.BROKEN_WINDOW, 'back'], 'i': [TILE.IVY, 'back'], 'v': [TILE.IVY, WALL.NONE],
  '|': [TILE.TRUNK, WALL.NONE], 'g': ['ground', WALL.NONE],
  'B': ['floor', WALL.NONE], 'd': ['wall', 'back'], 's': ['roof', WALL.NONE], '/': ['slopeL', WALL.NONE], ')': ['slopeR', WALL.NONE],
  'E': [TILE.EAVES, 'back'], '_': [TILE.PLATFORM, 'back'], '-': [TILE.PLATFORM, WALL.NONE],
  'H': [TILE.LADDER, 'back'], 'L': [TILE.LADDER, WALL.NONE], 'p': [TILE.PLANKS, WALL.NONE], 'n': [TILE.BALUSTRADE, WALL.NONE], 'w': [TILE.COBWEB, 'back'],
  'c': ['chest', 'back'], 'T': [TILE.TABLE, 'back'], 'C': [TILE.CHAIR, 'back'], 'z': [TILE.BARREL, 'back'], 'Y': [TILE.TORCH, 'back'],
  'f': [TILE.THATCH, WALL.NONE], '<': [TILE.THATCH_LEFT, WALL.NONE], '>': [TILE.THATCH_RIGHT, WALL.NONE],
  'l': [TILE.LOG_WALL, 'back'], 'h': [TILE.HIDE, 'back'], 'u': [TILE.HIDE, WALL.NONE],
  'e': [TILE.CARVED_BEAM, WALL.NONE], 'j': [TILE.BEAM_H, WALL.NONE],
  'x': [TILE.PALISADE, WALL.NONE], '^': [TILE.PALISADE_TIP, WALL.NONE], 't': [TILE.TOTEM, WALL.NONE],
  'k': [TILE.SKULL_STAKE, WALL.NONE], 'F': [TILE.CAMPFIRE, WALL.NONE],
};

// ---------- Plantas ----------
const RUIN_BLUEPRINTS = {
  // Casa tomada: sobrado de madeira com varanda, um rombo no telhado (as telhas caíram para
  // dentro e viraram entulho no assoalho de cima), uma árvore que cresceu pela sala e furou o
  // telhado, assoalho quebrado, janelas sem vidro e hera subindo pelas paredes e pelo esteio
  abandonedHouse: { loot: 'cabin', rows: [
    '.........../s).............',
    '.......|../s,s)............',
    '.......|./s,,,s)...........',
    '.......|/s,,,,,s)..........',
    '.......|s,,,,,,,p..........',
    '....../|,,,,,,,............',
    '...../s|,,,,,,.............',
    '..../s,|,,,,,,,...ps)......',
    '.../s,,|,,,,,,,,..,,s).....',
    '../s,,,|,,,,,,,,,,,,,s)....',
    '..EEEEE|EEEEEEEEp.EEEEE....',
    '...vdw,|,,,,,,,,i,,,d......',
    '...vo,,|,,oo,,,,i,,,o......',
    '...vo,,|,,oo,,,,,,,,o......',
    '...vd,,|,,,,,,,,,,,,d......',
    '...vd,,|,,c,,,,,qqH,dssss).',
    '...vd__|_____,,___H_dEEEEE.',
    '....dw,|,,,,,p,,,,H,d....e.',
    '....,,,|,,,i,,oo,,H,,....ev',
    '....,,,|,,,,,,oo,,H,,....ev',
    '.r..,z,|,,TCq,,,,zH,,n.nrev',
    '   BBBBgBBBBBBBBBBBBBppppp ',
  ] },

  // Prédio em ruínas: três andares de concreto, a metade direita desmoronada em degraus de
  // entulho (é por ali que se sobe), vergalhão para fora das lajes e um jardim no telhado
  concreteRuin: { back: WALL.CONCRETE, loot: 'ruin', rows: [
    '.....|....................',
    '.....|....................',
    '.....|....................',
    '...gggggg.r...............',
    '.=%%=====%===R............',
    'v#,,,,,,,,,,,v............',
    'v#,,oo,,,..,,v............',
    'v#,,oo,,,..,,.............',
    'v#,c,,,,,,qH,.............',
    'v==%=====%=H=====R........',
    'v#,,,,,,,,,H,,,,,.........',
    'v#,,..,,,,,H,,oo,.........',
    '.#,,..,,,,iH,,oo,.........',
    '.#,z,,,,,,,H,,,,qrr.......',
    '.===%======H======%r......',
    '.#,,,oo,,,,H,,,,,#%%R.....',
    '.,,,,oo,,,,H,,,,,#%%%r....',
    '.,,,,,,,,,,H,,,,,#%%%%r...',
    'r,,q,,,TC,,H,z,qq#%%%%%rr.',
    ' ======================   ',
  ] },

  // Palafita do povo isolado: casa de toras sobre esteios, telhado de palha e escada do lado
  stiltHut: { back: WALL.LOG, loot: 'village', rows: [
    '.....<f>.....',
    '....<fff>....',
    '...<fffff>...',
    '..<ff,,,ff>..',
    '.<ff,,,,,ff>.',
    '.fffffffffff.',
    '.Lh,,,Y,,,l..',
    '.Lh,,,,,,,l..',
    '.Lh,c,,,z,l..',
    '.L---------..',
    '.L.e.....e...',
    '.L.e.....e...',
    '.L.e.....e...',
    '             ',
  ] },

  // Oca: cúpula de palha até o chão, porta de couro e fogo de chão no meio
  oca: { back: WALL.LOG, loot: 'village', rows: [
    '....<f>....',
    '...<fff>...',
    '..<fffff>..',
    '.<ff,,,ff>.',
    '.ff,,Y,,ff.',
    '.h,,,,,,,f.',
    '.h,,,,,,,f.',
    '.h,c,,,z,f.',
    '           ',
  ] },
};

// Confere as plantas ao carregar: toda linha do mesmo tamanho e só letras da legenda
const BP_CHARS_CHECK = (() => {
  for (const [name, bp] of Object.entries(RUIN_BLUEPRINTS)) {
    const wdt = bp.rows[0].length;
    bp.rows.forEach((r, i) => { if (r.length !== wdt) console.warn(`Planta ${name}: linha ${i} tem ${r.length} (esperado ${wdt})`); });
    for (const r of bp.rows) for (const ch of r) if (ch !== ' ' && !BP_LEGEND[ch]) console.warn(`Planta ${name}: letra desconhecida "${ch}"`);
  }
  return true;
})();

// Novas tabelas de baú: o que sobrou da civilização e o que os canibais guardam
LOOT_TABLES.ruin = [[ITEM.SCRAP, 2, 6, 0.8], [ITEM.WIRE, 1, 4, 0.6], [ITEM.BOLTS, 2, 6, 0.6], [ITEM.GLASS, 2, 6, 0.5], [ITEM.METAL_BAR, 1, 3, 0.4],
  [ITEM.MEDKIT, 1, 1, 0.25], [ITEM.BANDAGE, 1, 3, 0.4], [ITEM.WATER, 1, 2, 0.4], [ITEM.SNACK, 1, 3, 0.4], [ITEM.CLOTH, 2, 5, 0.4], [ITEM.CONCRETE, 6, 14, 0.3]];
LOOT_TABLES.tribe = [[ITEM.BONE, 3, 8, 0.8], [ITEM.LEATHER, 2, 6, 0.6], [ITEM.SPEAR, 1, 1, 0.35], [ITEM.BOW, 1, 1, 0.2], [ITEM.ARROW, 6, 14, 0.5],
  [ITEM.COOKED_MEAT, 2, 4, 0.5], [ITEM.ROPE, 1, 3, 0.4], [ITEM.IVORY, 1, 2, 0.2], [ITEM.TIGER_TOOTH, 1, 1, 0.08], [ITEM.METAL_BAR, 1, 3, 0.3], [ITEM.HIDE, 2, 4, 0.4]];

// ---------- Carimbo ----------
const BIOME_GROUND = { [BIOME.DESERT]: TILE.SAND, [BIOME.SNOW]: TILE.SNOW, [BIOME.JUNGLE]: TILE.JUNGLE_GRASS, [BIOME.SAVANNA]: TILE.DRY_GRASS };

// Carimba a planta com a última linha no chão (floor) e a primeira coluna em x0.
// mirror = espelha (as peças inclinadas trocam de lado). Devolve as caixas úteis.
function stampBlueprint(w, rnd, bp, x0, floor, { mirror = false, style = null, loot = bp.loot, back = bp.back } = {}) {
  const rows = bp.rows, H = rows.length, W = rows[0].length, top = floor - H + 1;
  const flip = { '/': ')', ')': '/', '<': '>', '>': '<' };
  const ground = BIOME_GROUND[w.biomeAt(x0 + (W >> 1))] || TILE.GRASS;
  const slopes = style && ROOF_SLOPES[style.roof];
  const chests = [];
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    let ch = rows[j][mirror ? W - 1 - i : i];
    if (ch === ' ') continue;
    if (mirror && flip[ch]) ch = flip[ch];
    const x = x0 + i, y = top + j;
    if (!w.inBounds(x, y)) continue;
    let [tile, wall] = BP_LEGEND[ch];
    if (wall === 'back') wall = back;
    if (tile === 'ground') tile = ground;
    else if (tile === 'floor') tile = style ? style.floor : TILE.MOSS_BRICK;
    else if (tile === 'wall') tile = style ? style.wall : TILE.DARK_PLANKS;
    else if (tile === 'roof') tile = style ? style.roof : TILE.SLATE;
    else if (tile === 'slopeL') tile = slopes ? slopes[0] : TILE.AIR;
    else if (tile === 'slopeR') tile = slopes ? slopes[1] : TILE.AIR;
    if (tile === 'chest') { sSet(w, x, y, TILE.AIR, wall); chests.push([x, y]); continue; }
    sSet(w, x, y, tile, wall);
    w.water[y * w.w + x] = 0;
  }
  for (const [x, y] of chests) if (loot) addLootChest(w, x, y, loot, rnd);
  for (let i = 0; i < W; i++) if (rows[H - 1][mirror ? W - 1 - i : i] !== ' ') w.surface[x0 + i] = Math.min(w.surface[x0 + i], floor);
  return { x0, x1: x0 + W - 1, top, floor };
}

// ---------- Mato tomando conta ----------
// Musgo nas pedras e no concreto, hera caindo das lajes e beirais e subindo pelas paredes de
// fora. No deserto o mato dá lugar a areia acumulada no pé das paredes; na tundra, neve nas lajes.
const OVERGROW_MOSS = { [TILE.CONCRETE]: TILE.MOSSY_CONCRETE, [TILE.STONE_BRICK]: TILE.MOSS_BRICK, [TILE.COBBLESTONE]: TILE.MOSS_BRICK };
const HANGS_FROM = new Set([TILE.CONCRETE, TILE.MOSSY_CONCRETE, TILE.EAVES, TILE.STONE_BRICK, TILE.MOSS_BRICK, TILE.SLATE, TILE.PLANKS, TILE.DARK_PLANKS, TILE.TIMBER, TILE.PLASTER, TILE.SANDSTONE, TILE.ROOF_WOOD, TILE.ROOF_RED, TILE.LOG_WALL]);
function overgrow(w, rnd, x0, x1, top, floor, { amount = 1 } = {}) {
  const biome = w.biomeAt((x0 + x1) >> 1);
  const dry = biome === BIOME.DESERT, cold = biome === BIOME.SNOW;
  for (let x = x0; x <= x1; x++) for (let y = top; y <= floor; y++) {
    const t = w.getTile(x, y);
    if (!dry && OVERGROW_MOSS[t] && pnoise2(x / 5, y / 5, 64, 31) + rnd() * 0.25 > 0.78 - 0.12 * amount) sSet(w, x, y, OVERGROW_MOSS[t]);
  }
  if (cold) { // neve por cima de lajes, telhados e beirais
    for (let x = x0; x <= x1; x++) for (let y = top - 1; y < floor; y++)
      if (w.getTile(x, y) === TILE.AIR && w.getWall(x, y) === WALL.NONE && HANGS_FROM.has(w.getTile(x, y + 1)) && rnd() < 0.8) sSet(w, x, y, TILE.SNOW);
    return;
  }
  if (dry) { // areia acumulada encostada nas paredes, do lado de fora
    for (const [x, d] of [[x0 - 1, -1], [x1 + 1, 1]]) {
      const h = 1 + Math.floor(rnd() * 3);
      for (let k = 0; k < h + 1; k++) for (let y = floor - 1; y >= floor - (h - k); y--)
        if (w.getTile(x + d * k, y) === TILE.AIR) sSet(w, x + d * k, y, TILE.SAND);
    }
    return;
  }
  // Hera pendurada: começa embaixo de um bloco da construção e desce pelo ar
  for (let x = x0 - 1; x <= x1 + 1; x++) for (let y = top; y < floor - 1; y++) {
    if (w.getTile(x, y) !== TILE.AIR || !HANGS_FROM.has(w.getTile(x, y - 1)) || rnd() > 0.16 * amount) continue;
    const len = 2 + Math.floor(rnd() * 5);
    for (let k = 0; k < len && w.getTile(x, y + k) === TILE.AIR && y + k < floor - 1; k++) sSet(w, x, y + k, TILE.IVY);
  }
  // Hera subindo do chão pela parede de fora
  for (const [x, side] of [[x0 - 1, 1], [x1 + 1, -1]]) {
    if (rnd() > 0.7 * amount) continue;
    const len = 3 + Math.floor(rnd() * (floor - top - 3));
    for (let k = 1; k <= len; k++) {
      const y = floor - k;
      if (w.getTile(x, y) !== TILE.AIR || !SOLID[w.getTile(x + side, y)]) break;
      sSet(w, x, y, TILE.IVY);
    }
  }
}

// Árvore crescendo do chão (a copa é desenhada pelo renderer em cima do último tronco)
function growRuinTree(w, rnd, x, floor, height) {
  if (!SOLID[w.getTile(x, floor)]) return;
  if (w.getTile(x, floor) !== TILE.SAND) sSet(w, x, floor, BIOME_GROUND[w.biomeAt(x)] || TILE.GRASS);
  for (let k = 1; k <= height; k++) { if (w.getTile(x, floor - k) !== TILE.AIR) break; sSet(w, x, floor - k, TILE.TRUNK); }
}

// ---------- Casa tomada ----------
function buildAbandonedHouse(w, rnd, x0) {
  const bp = RUIN_BLUEPRINTS.abandonedHouse, W = bp.rows[0].length;
  const floor = flattenSurface(w, x0 - 1, x0 + W);
  (w.ruinSites ??= []).push({ kind: 'casa', x: x0 + (W >> 1), y: floor });
  const style = VILLAGE_STYLES[w.biomeAt(x0)] || VILLAGE_STYLES.default;
  const box = stampBlueprint(w, rnd, bp, x0, floor, { mirror: rnd() < 0.5, style, back: style.back });
  overgrow(w, rnd, box.x0, box.x1, box.top, floor, { amount: 0.8 });
  if (rnd() < 0.6) growRuinTree(w, rnd, rnd() < 0.5 ? box.x0 - 2 : box.x1 + 2, floor, 6 + Math.floor(rnd() * 4));
  return box;
}

// ---------- Prédio em ruínas ----------
function buildConcreteRuin(w, rnd, x0) {
  const bp = RUIN_BLUEPRINTS.concreteRuin, W = bp.rows[0].length;
  const floor = flattenSurface(w, x0 - 1, x0 + W);
  (w.ruinSites ??= []).push({ kind: 'predio', x: x0 + (W >> 1), y: floor });
  const box = stampBlueprint(w, rnd, bp, x0, floor, { mirror: rnd() < 0.5 });
  overgrow(w, rnd, box.x0, box.x1, box.top, floor, { amount: 1.2 });
  const far = rnd() < 0.5 ? box.x0 - 3 : box.x1 + 3;
  growRuinTree(w, rnd, far, w.surface[far] ?? floor, 7 + Math.floor(rnd() * 5));
  return box;
}

// ---------- Torre tomada ----------
// A torre de vigia de sempre, mas abandonada: ameias caídas de um lado, pedaços da parede
// soltos lá em cima, entulho no pé e hera subindo pelo lado de fora
function decayTower(w, rnd, { x0, x1, top, floor }) {
  (w.ruinSites ??= []).push({ kind: 'torre', x: x0 + 3, y: floor });
  const keep = (x, y) => { const t = w.getTile(x, y); return t === TILE.LADDER || t === TILE.CHEST; };
  const side = rnd() < 0.5 ? -1 : 1, edge = side < 0 ? x0 - 1 : x1 + 1;
  // o canto do alto desabou em diagonal: quanto mais para fora, mais fundo foi o estrago
  for (let k = 0; k < 6; k++) {
    const x = edge - side * k, drop = Math.max(0, 6 - k + Math.floor(rnd() * 3) - 1);
    for (let y = top - 1; y < top - 1 + drop; y++) if (!keep(x, y)) sSet(w, x, y, TILE.AIR, y > top + 2 && k > 1 ? WALL.STONE_BRICK : WALL.NONE);
    if (drop > 1 && rnd() < 0.5 && w.getTile(x, top - 1 + drop) !== TILE.AIR && w.getTile(x, top - 2 + drop) === TILE.AIR) sSet(w, x, top - 2 + drop, TILE.RUBBLE);
  }
  for (let x = x0 - 1; x <= x1 + 1; x++) if (w.getTile(x, top - 1) === TILE.STONE_BRICK && rnd() < 0.45) sSet(w, x, top - 1, TILE.AIR); // ameias caídas
  // buracos nas paredes, mais na metade de cima
  for (let y = top + 1; y < floor - 4; y++) for (const x of [x0, x1])
    if (rnd() < (y < (top + floor) / 2 ? 0.12 : 0.04)) sSet(w, x, y, TILE.AIR, rnd() < 0.5 ? WALL.NONE : WALL.STONE_BRICK);
  // ninguém acende mais as lanternas e a porta apodreceu: sobrou o vão
  for (let y = top; y < floor; y++) for (let x = x0; x <= x1; x++) {
    const t = w.getTile(x, y);
    if (t === TILE.PENDANT) sSet(w, x, y, rnd() < 0.6 ? TILE.COBWEB : TILE.AIR);
    else if (t === TILE.DOOR) sSet(w, x, y, TILE.AIR);
  }
  for (let k = 1; k <= 3; k++) { const x = edge + side * k; if (w.getTile(x, floor - 1) === TILE.AIR && SOLID[w.getTile(x, floor)]) sSet(w, x, floor - 1, TILE.RUBBLE); }
  if (rnd() < 0.5) sSet(w, edge + side, floor - 1, TILE.REBAR);
  overgrow(w, rnd, x0 - 1, x1 + 1, top - 1, floor, { amount: 1.4 });
  growRuinTree(w, rnd, edge - side * 10, w.surface[edge - side * 10], 7 + Math.floor(rnd() * 4));
}

// ---------- Aldeia do povo isolado ----------
// Ocas e palafitas espaçadas, cada uma com um morador da tribo passeando do lado; totens,
// varal de couro e uma fogueira grande no meio da aldeia.
function buildDryingRack(w, x, floor) {
  for (const dx of [0, 2]) for (let k = 1; k <= 3; k++) sSet(w, x + dx, floor - k, TILE.CARVED_BEAM);
  for (let dx = 0; dx <= 2; dx++) sSet(w, x + dx, floor - 4, TILE.BEAM_H);
  sSet(w, x + 1, floor - 3, TILE.HIDE); sSet(w, x + 1, floor - 2, TILE.HIDE);
}
function buildTotem(w, rnd, x, floor, h = 3 + Math.floor(rnd() * 3)) {
  for (let k = 1; k <= h; k++) sSet(w, x, floor - k, TILE.TOTEM);
}
function buildTribalVillage(w, rnd, cx) {
  const count = 3 + Math.floor(rnd() * 3);
  let x = cx - 30, made = 0;
  for (let i = 0; i < count; i++) {
    const bp = rnd() < 0.5 ? RUIN_BLUEPRINTS.stiltHut : RUIN_BLUEPRINTS.oca, W = bp.rows[0].length;
    const gap = 6 + Math.floor(rnd() * 5);
    const floor = flattenSurface(w, x - 1, x + W + gap);
    const hut = stampBlueprint(w, rnd, bp, x, floor, { mirror: rnd() < 0.5, loot: rnd() < 0.6 ? 'village' : null });
    const gx = hut.x1 + 1 + Math.floor(gap / 2);
    w.npcSpawns.push({ x: gx * T, y: floor * T, minX: hut.x1 + 1, maxX: hut.x1 + gap, seed: rnd(), profession: i % NPC_PROFESSIONS.length, tribal: true });
    // Quintal: totem, varal de couro ou fogueira
    const r = rnd(), yard = hut.x1 + gap - 2;
    if (i === Math.floor(count / 2)) { sSet(w, gx, floor - 1, TILE.CAMPFIRE); buildTotem(w, rnd, gx - 2, floor, 4); buildTotem(w, rnd, gx + 2, floor, 4); }
    else if (r < 0.4) buildTotem(w, rnd, yard, floor);
    else if (r < 0.75 && gap >= 7) buildDryingRack(w, hut.x1 + 2, floor);
    else if (w.getTile(yard, floor - 1) === TILE.AIR) sSet(w, yard, floor - 1, TILE.CAMPFIRE);
    x += W + gap; made++;
  }
  return [cx - 34, x + 4];
}

// ---------- Acampamento dos canibais ----------
// Paliçada de troncos apontados nas duas pontas (a passagem é uma cortina de couro), dois
// barracos, fogueira com estacas de crânio em volta, totem de guerra, jaula e varal de couro.
// Os guardas nascem quando o jogador chega perto (js/ruins.js: updateTribeCamps).
const CANNIBAL_CAMP = { W: 44, WALL_H: 6 };
function buildCannibalCamp(w, rnd, x0) {
  const { W, WALL_H } = CANNIBAL_CAMP, x1 = x0 + W - 1;
  const floor = flattenSurface(w, x0 - 2, x1 + 2);
  const ground = BIOME_GROUND[w.biomeAt(x0)] || TILE.GRASS;
  for (let x = x0; x <= x1; x++) { // chão de terra batida e limpa por dentro
    sSet(w, x, floor, x % 3 ? TILE.DIRT : ground);
    for (let y = floor - 12; y < floor; y++) sSet(w, x, y, TILE.AIR, WALL.NONE);
  }
  for (const px of [x0, x1]) { // paliçada com passagem de couro na altura do jogador
    for (let k = 1; k <= WALL_H; k++) sSet(w, px, floor - k, k <= 3 ? TILE.HIDE : TILE.PALISADE);
    sSet(w, px, floor - WALL_H - 1, TILE.PALISADE_TIP);
    for (const d of [-1, 1]) { // troncos dos lados, mais baixos, só de enfeite
      const h = 2 + Math.floor(rnd() * 3);
      for (let k = 1; k <= h; k++) sSet(w, px + d, floor - k, TILE.PALISADE);
      sSet(w, px + d, floor - h - 1, TILE.PALISADE_TIP);
    }
  }
  const oca = RUIN_BLUEPRINTS.oca, OW = oca.rows[0].length;
  const left = stampBlueprint(w, rnd, oca, x0 + 3, floor, { loot: 'tribe' });
  const right = stampBlueprint(w, rnd, oca, x1 - 2 - OW, floor, { mirror: true, loot: rnd() < 0.7 ? 'tribe' : null });
  for (const hut of [left, right]) for (let x = hut.x0; x <= hut.x1; x++) if (w.getTile(x, floor) === TILE.AIR) sSet(w, x, floor, TILE.DIRT);
  const mid = Math.floor((x0 + x1) / 2);
  sSet(w, mid, floor - 1, TILE.CAMPFIRE);
  // da esquerda para a direita: jaula, crânio, fogueira, crânio, totem de guerra, varal de couro
  for (const d of [-2, 2]) sSet(w, mid + d, floor - 1, TILE.SKULL_STAKE);
  buildTotem(w, rnd, mid + 4, floor, 5);
  sSet(w, mid + 4, floor - 6, TILE.SKULL_STAKE);
  buildDryingRack(w, mid + 6, floor);
  // jaula de varas com ossos (teia de aranha no canto)
  const cx = left.x1 + 2;
  for (let k = 1; k <= 3; k++) for (const dx of [0, 2]) sSet(w, cx + dx, floor - k, TILE.CARVED_BEAM);
  for (let dx = 0; dx <= 2; dx++) sSet(w, cx + dx, floor - 4, TILE.BEAM_H);
  sSet(w, cx + 1, floor - 3, TILE.COBWEB);
  // estacas de crânio do lado de fora, avisando quem chega
  for (const sx of [x0 - 3, x1 + 3]) if (w.getTile(sx, floor - 1) === TILE.AIR && SOLID[w.getTile(sx, floor)]) sSet(w, sx, floor - 1, TILE.SKULL_STAKE);
  (w.tribeCamps ??= []).push({ x0, x1, floor, max: 3 + Math.floor(rnd() * 2) });
  return [x0 - 6, x1 + 6];
}

// ---------- Geração ----------
// Chamado no fim de generateStructures (js/structures.js)
function generateRuins(w, rnd, place) {
  w.ruinSites = w.ruinSites || [];
  w.tribeCamps = [];
  place(Math.max(1, Math.floor(w.w / 2000)), 30, (x) => buildConcreteRuin(w, rnd, x + 2));
  place(Math.max(1, Math.floor(w.w / 2400)), 50, (x) => buildCannibalCamp(w, rnd, x + 3));
}

// =====================================================================================
//  O POVO ISOLADO (moradores) E OS CANIBAIS (guardas do acampamento)
// =====================================================================================
const TRIBE_NAMES = ['Araci', 'Jaci', 'Ubiratã', 'Tainá', 'Caiuá', 'Potira', 'Moacir', 'Raoni', 'Iberê', 'Kauê', 'Jurema', 'Aruanã', 'Iracema', 'Tupã', 'Yara', 'Anahí'];
const TRIBE_LINES = [
  'Seu pássaro de ferro caiu na mata. Os velhos dizem que antes deles caíam outros.',
  'As casas de pedra cinza são dos que vieram antes. Hoje só a hera mora lá.',
  'Não chegue perto das estacas com crânio. Do outro lado da paliçada ninguém conversa.',
  'Os canibais dormem pouco. Se ouvir tambor, volte pelo mesmo caminho.',
  'Dentro das ruínas ainda tem metal e vidro. Cuidado com o chão: a laje cede.',
  'A palha do telhado vem do capim alto. Corta, amarra, deixa secar.',
  'O totem guarda a aldeia. Quem quebra um totem não é bem-vindo de novo.',
];

// Look da tribo: pele morena, faixa na cabeça, túnica e tanga de couro, pés descalços
function tribalLook(v, r) {
  const pick = (n) => Math.floor(r() * n);
  Object.assign(v.look, { skin: [2, 3, 4, 7, 8, 9][pick(6)], hair: [1, 2, 2, 7][pick(4)], hairStyle: pick(4), top: 2, legs: 1, hat: r() < 0.6 ? 3 : 0, hatColor: [0, 3, 4, 5][pick(4)] });
  v.tribal = true;
}
const TRIBE_HIDE = [[[86, 54, 32], [128, 84, 50]], [[110, 72, 40], [156, 108, 64]], [[70, 48, 34], [112, 80, 54]]];
function tribalAtlas(v) {
  const key = 'tribo' + JSON.stringify(v.look);
  if (villagerAtlases.has(key)) return villagerAtlases.get(key);
  previewLook(v.look);
  const P = PLAYER_PALETTE, hide = TRIBE_HIDE[(v.look.shirt + v.look.pants) % TRIBE_HIDE.length];
  [P.o, P.O] = hide;
  [P.k, P.j, P.J, P.G] = [shade(hide[0], 0.7), hide[0], hide[1], shade(hide[1], 1.12)];
  [P.n, P.N, P.v] = [shade(hide[0], 0.8), hide[0], hide[1]];
  [P.x, P.X, P.z] = [P.K, P.s, P.S]; P.q = P.K; // descalço
  const atlas = buildPlayerSprite();
  PLAYER_LOOK_PREVIEW = null;
  applyLookToPalette(PLAYER_LOOK);
  villagerAtlases.set(key, atlas);
  return atlas;
}
{
  const baseAtlas = villagerAtlas;
  villagerAtlas = (v) => (v.tribal ? tribalAtlas(v) : baseAtlas(v));
  const BaseVillager = Villager;
  Villager = class extends BaseVillager {
    constructor(spawn) {
      super(spawn);
      if (!spawn.tribal) return;
      const r = mulberry32(Math.floor(spawn.seed * 1e9) ^ 0x5eed);
      tribalLook(this, r);
      this.name = TRIBE_NAMES[Math.floor(r() * TRIBE_NAMES.length)];
      this.look.name = this.name;
    }
  };
}

// ---------- Guardas do acampamento ----------
// Canibais de verdade (o mesmo monstro 'undead'), mas presos ao acampamento: rondam entre as
// paliçadas sem ver o jogador até ele chegar perto ou bater num deles. Aí correm atrás e só
// desistem quando ele foge para longe. Mortos voltam aos poucos, nunca na frente do jogador.
const CAMP_SIGHT = 13 * T, CAMP_GIVEUP = 34 * T, CAMP_RESPAWN = 75;
function campOf(m) { return m.campGuard || null; }
function updateTribeCamps(g, dt) {
  const w = g.world, p = g.player;
  for (const camp of w.tribeCamps || []) {
    const cx = (camp.x0 + camp.x1) / 2 * T, near = Math.abs(p.cx - cx) < 70 * T;
    camp.timer = Math.max(0, (camp.timer ?? 0) - dt);
    // Longe demais: os guardas "voltam para os barracos" e o acampamento se arma de novo na próxima visita
    if (Math.abs(p.cx - cx) > 110 * T && camp.seeded) {
      g.mobs = g.mobs.filter((m) => m.campGuard !== camp);
      camp.seeded = false; camp.timer = 0;
      continue;
    }
    const alive = g.mobs.filter((m) => m.campGuard === camp && !m.dead).length;
    if (!near || alive >= camp.max || camp.timer > 0) continue;
    // primeira visita: todos de uma vez; depois, um de cada vez e só fora da vista
    const tx = camp.x0 + 3 + Math.floor(Math.random() * (camp.x1 - camp.x0 - 6));
    const m = new Monster('undead', tx * T, 0);
    m.y = camp.floor * T - m.h - 0.01;
    if (camp.seeded && !mobOffScreen(g, m, 1)) { camp.timer = 4; continue; }
    if (m.collides(w, m.x, m.y)) { camp.timer = 1; continue; }
    m.campGuard = camp; m.aware = false; m.patrol = tx * T;
    g.mobs.push(m);
    if (alive + 1 >= camp.max) { camp.seeded = true; camp.timer = CAMP_RESPAWN; }
  }
}
{
  // Ronda: enquanto não viu o jogador, o guarda anda até um ponto do acampamento e espera
  const baseUpdate = Monster.prototype.update;
  Monster.prototype.update = function (dt, w, p) {
    const camp = campOf(this);
    if (!camp) return baseUpdate.call(this, dt, w, p);
    const d = Math.hypot(p.cx - this.cx, p.cy - this.cy);
    if (this.aware === false && (d < CAMP_SIGHT || this.hurtTimer > 0)) { this.aware = true; mobSfx(this, 'Attack'); }
    else if (this.aware && d > CAMP_GIVEUP) this.aware = false;
    if (this.aware) return baseUpdate.call(this, dt, w, p);
    if (Math.abs(this.patrol - this.cx) < 6) {
      this.wait = (this.wait ?? 0) - dt;
      if (this.wait <= 0) { this.patrol = (camp.x0 + 3 + Math.random() * (camp.x1 - camp.x0 - 6)) * T; this.wait = 2 + Math.random() * 4; }
      baseUpdate.call(this, dt, w, { cx: this.cx, cy: this.cy });
      this.vx = 0;
      return;
    }
    const before = this.def;
    this.def = { ...before, speed: before.speed * 0.45 };
    baseUpdate.call(this, dt, w, { cx: this.patrol, cy: this.cy });
    this.def = before;
  };
  // Guardas do acampamento existem de dia também (o resto dos canibais só à noite/caverna)
  const baseAllowed = monsterAllowed;
  monsterAllowed = (g, x, y, kind) => baseAllowed(g, x, y, kind) ||
    (kind === 'undead' && (g.world.tribeCamps || []).some((c) => x > (c.x0 - 40) * T && x < (c.x1 + 40) * T));
  const baseNpcs = updateNpcs;
  updateNpcs = (g, dt) => { baseNpcs(g, dt); updateTribeCamps(g, dt); };
}

// Receitas dos blocos novos (js/ruin-tiles.js)
RECIPES.push(...RUIN_RECIPES());
