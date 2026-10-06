'use strict';
// Bloco de baixo de cada cobertura nova (js/biomes-plus.js preenche): a vila nivela o chão com a cobertura certa embaixo
const GROUND_FILL = {};

// Estruturas procedurais geradas junto com o mundo: aldeias das tribos e ruínas tomadas pelo mato
// (js/ruins.js), minas antigas, ruínas de pedra no fundo e acampamentos esquecidos em cavernas.
// Os baús ficam em world.lootChests e os moradores em world.npcSpawns (o jogo cria os dois no newWorld).

// [item, mínimo, máximo, chance]
const LOOT_TABLES = {
  village: [[ITEM.COOKED_MEAT, 1, 3, 0.6], [ITEM.TORCH, 2, 6, 0.7], [ITEM.PLANKS, 4, 12, 0.5], [ITEM.WATER, 1, 3, 0.5], [ITEM.BANDAGE, 1, 2, 0.3], [ITEM.ARROW, 4, 10, 0.3], [ITEM.EGG, 1, 3, 0.3], [ITEM.CLOTH, 1, 4, 0.4]],
  cabin: [[ITEM.WOOD_HAMMER, 1, 1, 0.3], [ITEM.STONE_PICKAXE, 1, 1, 0.3], [ITEM.STONE_SWORD, 1, 1, 0.25], [ITEM.BLANKET, 1, 2, 0.4], [ITEM.TORCH, 2, 5, 0.6], [ITEM.COAL, 2, 6, 0.5], [ITEM.BOW, 1, 1, 0.15], [ITEM.ARROW, 3, 8, 0.35], [ITEM.BANDAGE, 1, 2, 0.35], [ITEM.STICK, 3, 8, 0.5]],
  mine: [[ITEM.COAL, 4, 12, 0.8], [ITEM.IRON, 2, 6, 0.6], [ITEM.METAL_BAR, 1, 3, 0.35], [ITEM.TORCH, 3, 8, 0.7], [ITEM.STONE_PICKAXE, 1, 1, 0.3], [ITEM.METAL_PICKAXE, 1, 1, 0.08], [ITEM.BOLTS, 2, 6, 0.4], [ITEM.COOKED_MEAT, 1, 2, 0.3]],
  dungeon: [[ITEM.METAL_BAR, 2, 5, 0.6], [ITEM.METAL_SWORD, 1, 1, 0.25], [ITEM.METAL_PICKAXE, 1, 1, 0.2], [ITEM.BOW, 1, 1, 0.3], [ITEM.ARROW, 8, 20, 0.6], [ITEM.MEDKIT, 1, 2, 0.4], [ITEM.BONE, 2, 6, 0.5], [ITEM.STINGER_SWORD, 1, 1, 0.05], [ITEM.GLASS, 2, 6, 0.3]],
  camp: [[ITEM.STONE_HAMMER, 1, 1, 0.15], [ITEM.COOKED_MEAT, 1, 3, 0.5], [ITEM.TORCH, 2, 6, 0.7], [ITEM.BANDAGE, 1, 2, 0.4], [ITEM.WATER, 1, 2, 0.4], [ITEM.COAL, 2, 5, 0.4], [ITEM.ARROW, 3, 8, 0.3], [ITEM.STONE_SHOVEL, 1, 1, 0.2], [ITEM.BLANKET, 1, 1, 0.3]],
  tower: [[ITEM.METAL_HAMMER, 1, 1, 0.12], [ITEM.ARROW, 6, 16, 0.7], [ITEM.BOW, 1, 1, 0.3], [ITEM.TORCH, 3, 8, 0.6], [ITEM.LADDER, 4, 10, 0.5], [ITEM.COOKED_MEAT, 1, 2, 0.4], [ITEM.METAL_BAR, 1, 3, 0.3], [ITEM.SPEAR, 1, 1, 0.25], [ITEM.WALL_STONE_BRICK, 8, 20, 0.4], [ITEM.BANDAGE, 1, 2, 0.3]],
  well: [[ITEM.ROPE, 1, 3, 0.6], [ITEM.WATER, 1, 3, 0.6], [ITEM.IRON, 2, 5, 0.4], [ITEM.LADDER, 3, 8, 0.5], [ITEM.COAL, 2, 6, 0.4], [ITEM.GLASS, 2, 5, 0.3], [ITEM.METAL_BAR, 1, 2, 0.25], [ITEM.BONE, 1, 4, 0.3]],
  pyramid: [[ITEM.METAL_BAR, 2, 6, 0.6], [ITEM.IVORY, 1, 3, 0.35], [ITEM.WALL_SANDSTONE, 10, 24, 0.5], [ITEM.SANDSTONE, 8, 20, 0.5], [ITEM.STINGER_SWORD, 1, 1, 0.12], [ITEM.MEDKIT, 1, 2, 0.4], [ITEM.GLASS, 3, 8, 0.35], [ITEM.BONE, 3, 8, 0.5], [ITEM.IRON_ARMOR, 1, 1, 0.15]],
  igloo: [[ITEM.BLANKET, 1, 3, 0.7], [ITEM.COOKED_MEAT, 2, 4, 0.6], [ITEM.LEATHER, 2, 6, 0.5], [ITEM.TORCH, 3, 8, 0.5], [ITEM.COAL, 3, 8, 0.6], [ITEM.LEATHER_ARMOR, 1, 1, 0.25], [ITEM.BANDAGE, 1, 3, 0.4], [ITEM.ROPE, 1, 2, 0.3]],
  temple: [[ITEM.METAL_BAR, 2, 5, 0.5], [ITEM.SILK, 3, 8, 0.6], [ITEM.BOW, 1, 1, 0.3], [ITEM.ARROW, 8, 18, 0.5], [ITEM.MEDKIT, 1, 2, 0.4], [ITEM.WALL_STONE_BRICK, 10, 20, 0.4], [ITEM.STINGER, 1, 3, 0.3], [ITEM.TIGER_TOOTH, 1, 1, 0.1], [ITEM.METAL_SWORD, 1, 1, 0.2]],
  hunter: [[ITEM.LEATHER, 3, 8, 0.7], [ITEM.BONE, 2, 6, 0.6], [ITEM.COOKED_MEAT, 1, 3, 0.5], [ITEM.SADDLE, 1, 1, 0.2], [ITEM.ROPE, 1, 3, 0.5], [ITEM.SPEAR, 1, 1, 0.3], [ITEM.ARROW, 5, 12, 0.4], [ITEM.BOW, 1, 1, 0.2], [ITEM.WATER, 1, 2, 0.4]],
};

// Enche um baú de 10 espaços sorteando a tabela (sempre pelo menos 2 pilhas)
function rollLoot(rnd, table, size = 10) {
  const slots = Array(size).fill(null);
  let placed = 0;
  for (let pass = 0; pass < 3 && placed < 2; pass++)
    for (const [item, min, max, chance] of table) {
      if (placed >= size || rnd() > chance) continue;
      const empty = slots.map((s, i) => (s ? -1 : i)).filter((i) => i >= 0);
      slots[empty[Math.floor(rnd() * empty.length)]] = { item, count: Math.min(maxStackOf(item), min + Math.floor(rnd() * (max - min + 1))) };
      placed++;
    }
  return slots;
}

function sSet(w, x, y, t, wall) {
  if (!w.inBounds(x, y)) return;
  w.tiles[y * w.w + x] = t;
  if (wall !== undefined) w.walls[y * w.w + x] = wall;
}

function addLootChest(w, x, y, table, rnd) {
  if (!w.inBounds(x, y)) return;
  sSet(w, x, y, TILE.CHEST);
  w.lootChests.push({ x, y, slots: rollLoot(rnd, LOOT_TABLES[table]) });
}

// Nivela o chão para uma construção, com rampas suaves, mantendo o material do bioma
function flattenSurface(w, x0, x1) {
  x0 = clamp(x0, 4, w.w - 5); x1 = clamp(x1, 4, w.w - 5);
  const hs = [];
  for (let x = x0; x <= x1; x++) hs.push(w.surface[x]);
  hs.sort((a, b) => a - b);
  const floor = hs[hs.length >> 1];
  for (let x = x0 - 3; x <= x1 + 3; x++) {
    if (x < 1 || x >= w.w - 1) continue;
    const orig = w.surface[x], k = x < x0 ? (x0 - x) / 4 : x > x1 ? (x - x1) / 4 : 0, h = Math.round(lerp(floor, orig, clamp(k, 0, 1)));
    let top = w.getTile(x, orig);
    if (!SOLID[top]) top = TILE.GRASS;
    const fill = GROUND_FILL[top] ?? (top === TILE.GRASS||top===TILE.SAKURA_GRASS ? TILE.DIRT : top === TILE.JUNGLE_GRASS ? TILE.MUD : top);
    for (let y = Math.max(0, Math.min(h, orig) - 16); y <= Math.max(h, orig) + 2; y++)
      sSet(w, x, y, y < h ? TILE.AIR : y === h ? top : fill, y <= h ? WALL.NONE : WALL.DIRT);
    w.surface[x] = h;
  }
  return floor;
}

// Casa (ou ruína): paredes com fundo fechado, telhado em escada com acabamento inclinado, uma
// porta em cada lado (dá para atravessar a casa sem quebrar nada), lareira com chaminé, vigas no
// teto, um segundo andar com escada nas casas altas e móveis (mesa com cadeiras, estante, cama...).
function buildHouse(w, rnd, x0, floor, width, height, style, { ruined = false, loot = null } = {}) {
  const x1 = x0 + width - 1, top = floor - height - 1;
  const twoFloors = !ruined && height >= 8 && width >= 9;
  const mid = twoFloors ? floor - Math.floor(height / 2) - 1 : 0;

  for (let x = x0; x <= x1; x++)
    for (let y = top; y <= floor; y++) {
      const edge = x === x0 || x === x1, ceil = y === top;
      if (y === floor) sSet(w, x, y, style.floor, style.back);
      else if ((edge || ceil) && !(ruined && rnd() < 0.3)) sSet(w, x, y, ceil ? TILE.EAVES : style.wall, style.back);
      else sSet(w, x, y, TILE.AIR, ruined && rnd() < 0.3 ? WALL.NONE : style.back);
    }
  // Telhado cheio (nada de céu aparecendo entre as águas) com beiral saindo das paredes e as
  // peças inclinadas por cima de cada degrau, para a água do telhado ficar lisa
  const slopes = ROOF_SLOPES[style.roof];
  for (let k = 0; k <= Math.ceil(width / 2); k++) {
    const y = top - 1 - k, a = x0 - 1 + k, b = x1 + 1 - k;
    if (a > b) break;
    for (let x = a; x <= b; x++) if (!ruined || rnd() > 0.35) sSet(w, x, y, x === a || x === b || a === b ? style.roof : TILE.AIR, style.back);
    if (!ruined && slopes && a < b) { sSet(w, a, y - 1, slopes[0]); sSet(w, b, y - 1, slopes[1]); }
  }

  if (!ruined) {
    const gable = Math.floor((x0 + x1) / 2);
    for (let y = top - 4; y <= top - 2; y++)
      for (let x = gable; x <= gable + 1; x++)
        if (w.getTile(x, y) === TILE.AIR && w.getWall(x, y) !== WALL.NONE)
          sSet(w, x, y, TILE.LATTICE_WINDOW, style.back);
    if (w.getTile(gable, top - 1) === TILE.AIR) sSet(w, gable, top - 1, TILE.PENDANT, style.back);
    for (let x = x0 + 2; x < x1; x += 5)
      for (let y = top + 1; y < floor; y++)
        w.walls[y * w.w + x] = WALL.TIMBER;
  }
  // Porta dos dois lados: entra por um, sai pelo outro
  for (const dx of [x0, x1])
    for (let k = 1; k <= 3; k++) sSet(w, dx, floor - k, ruined ? TILE.AIR : TILE.DOOR, style.back);
  const hearthLeft = rnd() < 0.5; // lado da lareira; a escada do sobrado fica do outro

  if (ruined) {
    sSet(w, x0 + 1, top + 1, TILE.COBWEB, WALL.NONE);
    sSet(w, x1 - 1, top + 1, TILE.COBWEB, WALL.NONE);
    if (rnd() < 0.5) sSet(w, Math.floor((x0 + x1) / 2), floor - 1, TILE.COBWEB, style.back);
    if (loot) addLootChest(w, hearthLeft ? x0 + 2 : x1 - 2, floor - 1, loot, rnd);
    return { x0, x1, floor, top };
  }

  // Segundo andar de tábuas com alçapão e escada até o térreo
  const lx = hearthLeft ? x1 - 2 : x0 + 2;
  if (twoFloors) {
    for (let x = x0 + 1; x <= x1 - 1; x++) sSet(w, x, mid, TILE.EAVES, style.back);
    sSet(w, lx, mid, TILE.AIR, style.back);
    for (let y = mid; y < floor; y++) sSet(w, lx, y, TILE.LADDER, style.back);
    for (const wx of [x0, x1]) for (let k = 1; k <= 2; k++) sSet(w, wx, mid - k - 1, TILE.GLASS, style.back);
  }

  // Bandeira de vidro em cima de cada porta
  if (floor - 4 > (twoFloors ? mid : top)) for (const wx of [x0, x1]) sSet(w, wx, floor - 4, TILE.GLASS, style.back);
  // Vigas aparentes no teto
  for (let x = x0 + 2; x < x1; x += 3) sSet(w, x, top + 1, TILE.CARVED_BEAM, style.back);
  // Lareira no fundo da casa. Dentro de casa a chaminé é parede de tijolo (o jogador passa na
  // frente dela); só fura o telhado como bloco, até dois blocos acima da água que passa por cima
  const hx = hearthLeft ? x0 + 2 : x1 - 2;
  sSet(w, hx, floor - 1, TILE.CAMPFIRE, style.back);
  for (let y = floor - 2; y > top; y--) {
    const t = w.getTile(hx, y);
    if (t === TILE.AIR || t === TILE.CARVED_BEAM) sSet(w, hx, y, TILE.AIR, WALL.BRICK);
  }
  const roofTop = top - 1 - Math.min(hx - (x0 - 1), x1 + 1 - hx);
  for (let y = top; y >= roofTop - 2; y--) sSet(w, hx, y, TILE.BRICK, WALL.NONE);
  if (loot) addLootChest(w, hearthLeft ? x0 + 3 : x1 - 3, floor - 1, loot, rnd);

  // Mobília: só em casas vazias (nunca por cima de escada, porta, fogo ou tesouro)
  const furnish = (x, y, t) => { if (w.getTile(x, y) === TILE.AIR) sSet(w, x, y, t, style.back); };
  // Móvel grande: tenta cada posição da lista e fica na primeira em que couber inteiro
  const furnishBig = (t, spots) => {
    for (const [x, y] of spots) {
      const s = findFurnitureSpot(w, t, x, y);
      if (s) { placeFurniture(w, t, s.ax, s.ay, (cx, cy) => sSet(w, cx, cy, t, style.back)); return true; }
    }
    return false;
  };
  const center = Math.floor((x0 + x1) / 2);
  // Mesa com uma cadeira de cada lado (elas se viram para a mesa) e uma vela em cima
  furnish(center, floor - 1, TILE.TABLE);
  if (w.getTile(center, floor - 1) === TILE.TABLE) {
    furnish(center - 1, floor - 1, TILE.CHAIR);
    furnish(center + 1, floor - 1, TILE.CHAIR);
    furnish(center, floor - 2, TILE.CANDLE);
  }
  furnish(hearthLeft ? center + 2 : center - 2, floor - 1, TILE.BARREL);
  // Janela grande no meio da parede do fundo, com floreira e cortinas dos lados
  const windowY = twoFloors ? mid - 3 : top + 2;
  for (let xx = center - 1; xx <= center + 1; xx++) {
    furnish(xx, windowY, TILE.LATTICE_WINDOW);
    furnish(xx, windowY + 1, TILE.LATTICE_WINDOW);
    furnish(xx, windowY + 2, TILE.FLOWER_BOX);
  }
  for (const cx of [center - 2, center + 2]) for (let y = windowY; y <= windowY + 1; y++) furnish(cx, y, TILE.CURTAIN);
  // Lustre no teto do térreo (no sobrado ele fica embaixo do assoalho de cima)
  const ceiling = (twoFloors ? mid : top) + 1;
  furnishBig(TILE.CHANDELIER, [[center, ceiling], [center + 1, ceiling], [center - 1, ceiling]]);
  // Quadro e prateleira na parede do fundo, onde sobrar espaço (o quadro prefere o lado sem lareira)
  const wallSpots = (from, rows) => {
    const xs = [];
    for (let x = x0 + 1; x < x1; x++) xs.push(x);
    xs.sort((a, b) => Math.abs(a - from) - Math.abs(b - from));
    return rows.flatMap((y) => xs.map((x) => [x, y]));
  };
  furnishBig(TILE.PAINTING, wallSpots(hearthLeft ? x1 - 3 : x0 + 2, [floor - 3, floor - 4]));
  furnishBig(TILE.WALL_SHELF, wallSpots(hx + (hearthLeft ? 1 : -1), [floor - 4, floor - 3]));
  // Sobrado: cama, estante e um vaso com planta no andar de cima
  if (twoFloors) {
    const upper = mid - 1;
    furnishBig(TILE.BED, wallSpots(hearthLeft ? x0 + 1 : x1 - 2, [upper]));
    furnishBig(TILE.BOOKSHELF, wallSpots(hearthLeft ? x1 - 3 : x0 + 1, [upper]));
    furnishBig(TILE.PLANTER, wallSpots(center, [upper]));
    furnish(center - 1, upper, TILE.FLOWER_POT);
  } else {
    furnishBig(TILE.CLOCK, [[hearthLeft ? x1 - 1 : x0 + 1, floor - 1]]);
  }
  // Vasos pendurados no beiral, do lado de fora de cada porta
  for (const vx of [x0 - 1, x1 + 1]) if (rnd() < 0.6) furnishBig(TILE.HANGING_PLANT, [[vx, top]]);
  if (w.biomeAt(x0) === BIOME.JUNGLE || w.biomeAt(x0) === BIOME.FOREST)
    for (let y = top + 1; y < floor - 3; y++) if (w.getTile(x1 + 1, y) === TILE.AIR) sSet(w, x1 + 1, y, TILE.IVY);
  for (let x = x0; x <= x1; x++) sSet(w, x, floor, style.floor, style.back);
  return { x0, x1, floor, top };
}

// Peças inclinadas que alisam cada tipo de telhado (esquerda, direita)
const ROOF_SLOPES = {
  [TILE.SLATE]: [TILE.ROOF_LEFT, TILE.ROOF_RIGHT],
  [TILE.ROOF_RED]: [TILE.ROOF_RED_LEFT, TILE.ROOF_RED_RIGHT],
  [TILE.ROOF_WOOD]: [TILE.ROOF_WOOD_LEFT, TILE.ROOF_WOOD_RIGHT],
};

// Poste de iluminação: tronco com uma tocha no alto (enfeita as vilas)
function buildLampPost(w, x, floor) {
  if (!SOLID[w.getTile(x, floor)]) return;
  for (let k = 1; k <= 4; k++) sSet(w, x, floor - k, TILE.CARVED_BEAM);
  sSet(w, x, floor - 5, TILE.LANTERN);
}

// Cerca baixa de vigas entre as casas
function buildFence(w, rnd, x0, x1, floor) {
  for (let x = x0; x <= x1; x++) {
    if (!SOLID[w.getTile(x, floor)] || w.getTile(x, floor - 1) !== TILE.AIR) continue;
    if (rnd() < 0.2) continue; // falhas na cerca, como se tivesse apodrecido
    sSet(w, x, floor - 1, TILE.BALUSTRADE);
    if ((x - x0) % 4 === 0) sSet(w, x, floor - 2, TILE.FLOWER_BOX);
  }
}

const VILLAGE_STYLES = {
  [BIOME.DESERT]: {wall:TILE.SANDSTONE,floor:TILE.SANDSTONE,roof:TILE.ROOF_RED,back:WALL.PLASTER},
  [BIOME.SNOW]: {wall:TILE.TIMBER,floor:TILE.STONE_BRICK,roof:TILE.SLATE,back:WALL.WOOD},
  [BIOME.JUNGLE]: {wall:TILE.MOSS_BRICK,floor:TILE.MOSS_BRICK,roof:TILE.ROOF_WOOD,back:WALL.TIMBER},
  [BIOME.SAVANNA]: {wall:TILE.PLASTER,floor:TILE.SANDSTONE,roof:TILE.ROOF_WOOD,back:WALL.PLASTER},
  default: {wall:TILE.TIMBER,floor:TILE.STONE_BRICK,roof:TILE.SLATE,back:WALL.PLASTER},
};

function buildVillage(w, rnd, cx) {
  const style = VILLAGE_STYLES[w.biomeAt(cx)] || VILLAGE_STYLES.default;
  const count = 3 + Math.floor(rnd() * 3);
  let x = cx - 30;
  for (let i = 0; i < count; i++) {
    const width = 9 + Math.floor(rnd() * 6);
    // Um terço das casas é de dois andares (escada por dentro)
    const height = rnd() < 0.35 ? 8 + Math.floor(rnd() * 2) : 5 + Math.floor(rnd() * 2);
    const gap = 6 + Math.floor(rnd() * 6);
    const floor = flattenSurface(w, x - 1, x + width + gap);
    const home = buildHouse(w, rnd, x, floor, width, height, style, { loot: rnd() < 0.7 ? 'village' : null });
    // Um morador passeia no quintal ao lado de cada casa
    const gx = home.x1 + 1 + Math.floor(gap / 2);
    w.npcSpawns.push({ x: gx * T, y: floor * T, minX: home.x1 + 1, maxX: home.x1 + gap, seed: rnd(), profession: i % NPC_PROFESSIONS.length });
    // Quintal: fogueira, poste de luz, cerca ou horta de acordo com o sorteio
    const r = rnd();
    if (i === 0 || r < 0.25) { const fx = home.x1 + gap - 2; if (w.getTile(fx, floor - 1) === TILE.AIR) sSet(w, fx, floor - 1, TILE.CAMPFIRE); }
    else if (r < 0.55) buildLampPost(w, gx, floor);
    else buildFence(w, rnd, home.x1 + 2, home.x1 + gap - 1, floor);
    x += width + gap;
  }
  // Poço no meio da vila
  if (rnd() < 0.7) buildWell(w, rnd, x + 2);
  return [cx - 34, x + 4];
}

// ---------- Torre de vigia ----------
// Torre de pedra com escada por dentro, pisos de tábua, seteiras e mirante com ameias.
function buildWatchtower(w, rnd, x0) {
  const width = 7, height = 15 + Math.floor(rnd() * 8);
  const floor = flattenSurface(w, x0 - 2, x0 + width + 1);
  const x1 = x0 + width - 1, top = floor - height;
  for (let y = top; y <= floor; y++)
    for (let x = x0; x <= x1; x++) {
      const edge = x === x0 || x === x1;
      if (y === floor) sSet(w, x, y, TILE.STONE_BRICK, WALL.STONE_BRICK);
      else if (edge) sSet(w, x, y, rnd() < 0.22 ? TILE.MOSS_BRICK : TILE.STONE_BRICK, WALL.STONE_BRICK);
      else sSet(w, x, y, TILE.AIR, WALL.STONE_BRICK);
    }
  // Pisos de tábua a cada 5 blocos, com o vão da escada sempre livre
  const lx = x0 + 1;
  for (let y = floor - 5; y > top + 1; y -= 5)
    for (let x = lx + 1; x <= x1 - 1; x++) sSet(w, x, y, TILE.EAVES, WALL.STONE_BRICK);
  for (let y = top + 2; y < floor; y++) sSet(w, lx, y, TILE.LADDER, WALL.STONE_BRICK);
  // Seteiras e tochas nas paredes
  for (let y = floor - 3; y > top + 2; y -= 5) {
    sSet(w, x0, y, TILE.AIR, WALL.STONE_BRICK);
    sSet(w, x1, y, TILE.AIR, WALL.STONE_BRICK);
    sSet(w, x1 - 1, y - 1, TILE.PENDANT, WALL.STONE_BRICK);
  }
  // Porta na base e ameias no topo
  for (let k = 1; k <= 3; k++) sSet(w, x1, floor - k, TILE.DOOR, WALL.STONE_BRICK);
  for (let x = x0 - 1; x <= x1 + 1; x++) {
    sSet(w, x, top, TILE.STONE_BRICK, WALL.STONE_BRICK);
    if ((x - x0) % 2 === 0) sSet(w, x, top - 1, TILE.STONE_BRICK);
  }
  sSet(w, x0 + 3, top + 1, TILE.PENDANT, WALL.STONE_BRICK);
  addLootChest(w, x1 - 1, top + 5, 'tower', rnd);
  if (rnd() < 0.6) addLootChest(w, x0 + 2, floor - 1, 'tower', rnd);
  return { x0, x1, top, floor };
}

// ---------- Poço ----------
// Boca de pedra com telhadinho e um poço fundo com escada até uma câmara com baú.
function buildWell(w, rnd, x0) {
  const floor = flattenSurface(w, x0 - 2, x0 + 4);
  const x1 = x0 + 2, mid = x0 + 1;
  for (const x of [x0, x1]) {
    for (let k = 0; k <= 1; k++) sSet(w, x, floor - k, TILE.STONE_BRICK, WALL.STONE);
    for (let k = 3; k <= 4; k++) sSet(w, x, floor - k, TILE.BEAM);
  }
  for (let x = x0 - 1; x <= x1 + 1; x++) sSet(w, x, floor - 5, TILE.PLANKS);
  sSet(w, mid, floor - 4, TILE.BEAM); // roldana
  sSet(w, mid, floor - 1, TILE.AIR, WALL.STONE);
  sSet(w, mid, floor, TILE.AIR, WALL.STONE);

  const depth = 16 + Math.floor(rnd() * 18);
  for (let y = floor; y <= floor + depth; y++) {
    sSet(w, x0, y, TILE.STONE_BRICK, WALL.STONE);
    sSet(w, x1, y, TILE.STONE_BRICK, WALL.STONE);
    sSet(w, mid, y, TILE.LADDER, WALL.STONE);
  }
  // Câmara no fundo do poço
  const by = floor + depth;
  for (let x = x0 - 2; x <= x1 + 2; x++)
    for (let y = by - 3; y <= by + 1; y++)
      sSet(w, x, y, y === by + 1 ? TILE.STONE_BRICK : TILE.AIR, WALL.STONE);
  sSet(w, mid, by - 3, TILE.LADDER, WALL.STONE);
  sSet(w, mid, by - 2, TILE.LADDER, WALL.STONE);
  sSet(w, x0 - 1, by - 1, TILE.TORCH, WALL.STONE);
  sSet(w, x1 + 1, by - 2, TILE.COBWEB, WALL.STONE);
  addLootChest(w, x1 + 1, by, 'well', rnd);
}

// ---------- Pirâmide do deserto ----------
// Montanha de arenito em degraus, com câmara funerária, armadilha de areia e dois baús.
function buildPyramid(w, rnd, x0) {
  const half = 13 + Math.floor(rnd() * 5);
  const floor = flattenSurface(w, x0 - half - 2, x0 + half + 2);
  for (let k = 0; k < half; k++)
    for (let x = x0 - half + k; x <= x0 + half - k; x++)
      sSet(w, x, floor - k, rnd() < 0.1 ? TILE.SAND : TILE.SANDSTONE, WALL.SANDSTONE);
  for (let x = x0 - half; x <= x0 + half; x++) w.surface[x] = Math.max(1, floor - half + Math.abs(x - x0));

  // Câmara principal, meio enterrada
  const cw = 7, cTop = floor - 4, cBottom = floor + 5;
  for (let x = x0 - cw; x <= x0 + cw; x++)
    for (let y = cTop; y <= cBottom; y++) {
      const edge = x === x0 - cw || x === x0 + cw || y === cTop || y === cBottom;
      sSet(w, x, y, edge ? TILE.STONE_BRICK : TILE.AIR, WALL.SANDSTONE);
    }
  sSet(w, x0, cTop + 2, TILE.TORCH, WALL.SANDSTONE);
  for (const x of [x0 - cw + 1, x0 + cw - 1]) sSet(w, x, cTop + 1, TILE.COBWEB, WALL.SANDSTONE);
  addLootChest(w, x0 - cw + 2, cBottom - 1, 'pyramid', rnd);
  addLootChest(w, x0 + cw - 2, cBottom - 1, 'pyramid', rnd);
  // Poço vertical do topo até a câmara, tapado por dois blocos (tem que cavar para entrar)
  for (let y = floor - half + 2; y < cTop; y++) sSet(w, x0, y, y < floor - half + 5 ? TILE.SANDSTONE : TILE.AIR, WALL.SANDSTONE);
  sSet(w, x0, cTop, TILE.AIR, WALL.SANDSTONE);
  for (let y = cTop + 1; y < cBottom; y++) sSet(w, x0, y, TILE.LADDER, WALL.SANDSTONE);
}

// ---------- Iglu da tundra ----------
// Cúpula de neve com túnel de entrada, fogueira acesa e um baú de suprimentos.
function buildIgloo(w, rnd, x0) {
  const r = 6;
  const floor = flattenSurface(w, x0 - r - 3, x0 + r + 3);
  for (let y = -r; y <= 0; y++)
    for (let x = -r - 1; x <= r + 1; x++) {
      const d = Math.hypot(x, y * 1.35);
      if (d > r + 1) continue;
      sSet(w, x0 + x, floor + y, d > r - 1.1 ? TILE.SNOW : TILE.AIR, WALL.SNOW);
    }
  for (let x = x0 + r - 1; x <= x0 + r + 4; x++) { // túnel de entrada
    sSet(w, x, floor - 1, TILE.AIR, WALL.SNOW);
    sSet(w, x, floor - 2, TILE.AIR, WALL.SNOW);
    sSet(w, x, floor - 3, TILE.SNOW, WALL.SNOW);
  }
  sSet(w, x0 - 1, floor - 1, TILE.CAMPFIRE, WALL.SNOW);
  sSet(w, x0 + 1, floor - 4, TILE.TORCH, WALL.SNOW);
  for (let x = x0 - r + 1; x <= x0 + r - 1; x++) sSet(w, x, floor, TILE.ICE, WALL.SNOW);
  addLootChest(w, x0 - r + 2, floor - 1, 'igloo', rnd);
}

// ---------- Templo da selva ----------
// Plataforma de tijolo com colunas, teto em degraus, vinhas e uma sala com dois baús.
function buildJungleTemple(w, rnd, x0) {
  const width = 19, height = 8, x1 = x0 + width - 1;
  const floor = flattenSurface(w, x0 - 2, x0 + width + 1);
  const top = floor - height;
  for (let x = x0 - 2; x <= x1 + 2; x++) for (let k = 0; k <= 1; k++) sSet(w, x, floor + k, TILE.MOSS_BRICK, WALL.STONE_BRICK);
  for (let x = x0; x <= x1; x++)
    for (let y = top; y <= floor - 1; y++) {
      const wall = x === x0 || x === x1 || y === top;
      const column = (x - x0) % 4 === 0 && y > top + 1; // colunas na fachada
      sSet(w, x, y, wall || column ? TILE.MOSS_BRICK : TILE.AIR, WALL.STONE_BRICK);
    }
  // Sala fechada no meio, onde ficam os baús
  for (let x = x0 + 5; x <= x1 - 5; x++)
    for (let y = top + 2; y <= floor - 1; y++)
      sSet(w, x, y, x === x0 + 5 || x === x1 - 5 || y === top + 2 ? TILE.MOSS_BRICK : TILE.AIR, WALL.STONE_BRICK);
  for (let k = 1; k <= 3; k++) sSet(w, x0 + 5, floor - k, TILE.DOOR, WALL.STONE_BRICK);
  sSet(w, Math.floor((x0 + x1) / 2), top + 3, TILE.PENDANT, WALL.STONE_BRICK);
  addLootChest(w, x1 - 6, floor - 1, 'temple', rnd);
  if (rnd() < 0.7) addLootChest(w, x0 + 7, floor - 1, 'temple', rnd);
  // Teto em degraus e vinhas caindo da beirada
  for (let k = 1; k <= 3; k++)
    for (let x = x0 + k; x <= x1 - k; x++) sSet(w, x, top - k, TILE.MOSS_BRICK, WALL.STONE_BRICK);
  for (let x = x0 + 1; x <= x1; x += 3 + Math.floor(rnd() * 4)) {
    const len = 2 + Math.floor(rnd() * 4);
    for (let k = 1; k <= len; k++) sSet(w, x, top + k, TILE.IVY, WALL.STONE_BRICK);
  }
}

// ---------- Acampamento de caçadores (savana) ----------
// Duas tendas de lona, fogueira no meio, varal de couro secando e um baú.
function buildHunterCamp(w, rnd, x0) {
  const width = 22;
  const floor = flattenSurface(w, x0 - 1, x0 + width);
  // Tenda de lona em "A": lados inclinados, cumeeira fechada e uma tocha dentro
  const tent = (tx) => {
    for (let k = 0; k <= 3; k++) {
      const a = tx - 4 + k, b = tx + 4 - k;
      for (let x = a; x <= b; x++) {
        if (x === a || x === b || k === 3) sSet(w, x, floor - 1 - k, TILE.PLANKS, WALL.PLANKS);
        else sSet(w, x, floor - 1 - k, TILE.AIR, WALL.PLANKS);
      }
    }
    for (let x = tx - 4; x <= tx + 4; x++) sSet(w, x, floor, TILE.DRY_GRASS);
    sSet(w, tx + 1, floor - 3, TILE.TORCH, WALL.PLANKS);
    return tx;
  };
  const left = tent(x0 + 5), right = tent(x0 + 17);
  const mid = x0 + 11;
  sSet(w, mid, floor - 1, TILE.CAMPFIRE);
  // Varal de secar couro por cima da fogueira
  const ropeY = floor - 5;
  for (let x = mid - 1; x <= mid + 1; x++) sSet(w, x, ropeY, TILE.BEAM);
  for (let k = 1; k <= 3; k++) { sSet(w, mid - 1, ropeY + k, TILE.BEAM); sSet(w, mid + 1, ropeY + k, TILE.BEAM); }
  sSet(w, mid, ropeY + 1, TILE.COBWEB);
  addLootChest(w, left - 1, floor - 1, 'hunter', rnd);
  if (rnd() < 0.6) addLootChest(w, right + 1, floor - 1, 'hunter', rnd);
}

// Mina: corredor de 3 de altura com piso e teto de tábuas, vigas a cada 6 blocos, tochas e teias
function buildMineshaft(w, rnd, x0, y) {
  const x1 = Math.min(w.w - 4, x0 + 30 + Math.floor(rnd() * 40));
  for (let x = x0; x <= x1; x++) {
    for (let k = 0; k <= 2; k++) sSet(w, x, y - k, TILE.AIR, rnd() < 0.85 ? WALL.PLANKS : WALL.STONE);
    sSet(w, x, y + 1, TILE.PLANKS);
    if (rnd() < 0.9) sSet(w, x, y - 3, TILE.PLANKS);
    if ((x - x0) % 6 === 0) for (let k = 0; k <= 2; k++) sSet(w, x, y - k, TILE.CARVED_BEAM, WALL.PLANKS);
    else if (rnd() < 0.07) sSet(w, x, y - 2, TILE.COBWEB, WALL.PLANKS);
  }
  // Tochas depois de escavar tudo (senão a coluna seguinte apagaria)
  for (let x = x0 + 1; x < x1; x += 12) sSet(w, x, y - 2, TILE.LANTERN, WALL.PLANKS);
  let cx = x0 + 3 + Math.floor(rnd() * Math.max(1, x1 - x0 - 6));
  if ((cx - x0) % 6 === 0) cx++;
  addLootChest(w, cx, y, 'mine', rnd);
  if (rnd() < 0.5) addLootChest(w, x1 - 1 - ((x1 - 1 - x0) % 6 === 0 ? 1 : 0), y, 'mine', rnd);
  if (rnd() < 0.45) // poço subindo até encontrar uma caverna, com escada do chão até o fim
    for (let yy = y, n = 0; n < 33 && yy > 2; yy--, n++) {
      const open = w.getTile(x0 + 2, yy - 1) === TILE.AIR && w.getTile(x0 + 3, yy - 1) === TILE.AIR;
      sSet(w, x0 + 2, yy, TILE.LADDER, WALL.PLANKS);
      if (n > 2) sSet(w, x0 + 3, yy, TILE.AIR, WALL.PLANKS);
      if (open && n > 6) break;
    }
}

// Ruína de pedra funda: sala de tijolos com teias, entradas dos dois lados e túneis até a caverna mais próxima
function buildDungeon(w, rnd, x0, y0) {
  const width = 16 + Math.floor(rnd() * 8), height = 8 + Math.floor(rnd() * 3), x1 = x0 + width, y1 = y0 + height;
  for (let x = x0; x <= x1; x++)
    for (let y = y0; y <= y1; y++) {
      const edge = x === x0 || x === x1 || y === y0 || y === y1;
      if (edge) sSet(w, x, y, rnd() < 0.08 ? TILE.STONE : TILE.STONE_BRICK, WALL.STONE);
      else sSet(w, x, y, TILE.AIR, rnd() < 0.9 ? WALL.STONE : WALL.NONE);
    }
  for (const [x, y] of [[x0 + 1, y0 + 1], [x1 - 1, y0 + 1], [x0 + 2, y0 + 1], [x1 - 2, y0 + 1]]) if (rnd() < 0.8) sSet(w, x, y, TILE.COBWEB);
  sSet(w, Math.floor((x0 + x1) / 2), y0 + 2, TILE.LANTERN, WALL.STONE);
  addLootChest(w, x0 + 3, y1 - 1, 'dungeon', rnd);
  if (rnd() < 0.6) addLootChest(w, x1 - 3, y1 - 1, 'dungeon', rnd);
  for (const dir of [-1, 1]) {
    let x = dir < 0 ? x0 : x1;
    for (let n = 0; n < 28; n++, x += dir) {
      if (x < 2 || x >= w.w - 2) break;
      const open = n > 2 && w.getTile(x, y1 - 1) === TILE.AIR && w.getTile(x, y1 - 2) === TILE.AIR && !(x >= x0 && x <= x1);
      for (let k = 1; k <= 3; k++) sSet(w, x, y1 - k, TILE.AIR);
      if (open) break;
    }
  }
}

// Acampamento esquecido no chão de uma caverna: fogueira acesa, tocha, lona e baú
function tryCaveCamp(w, rnd, clear = () => true) {
  const x = 20 + Math.floor(rnd() * (w.w - 40));
  let y = w.surface[x] + 25 + Math.floor(rnd() * Math.max(1, w.h * 0.8 - w.surface[x] - 25));
  for (let n = 0; n < 40 && y < w.h - 6; n++, y++) {
    let ok = true;
    for (let dx = -4; dx <= 4 && ok; dx++)
      ok = w.getTile(x + dx, y) === TILE.AIR && w.getTile(x + dx, y - 1) === TILE.AIR && w.getTile(x + dx, y - 2) === TILE.AIR && SOLID[w.getTile(x + dx, y + 1)] === 1;
    if (!ok) continue;
    if (!clear(x - 5, y - 4, x + 5, y + 1)) return false; // nada de acampamento dentro do covil ou da arena
    sSet(w, x, y, TILE.CAMPFIRE);
    sSet(w, x - 3, y, TILE.LANTERN);
    for (let dx = 1; dx <= 3; dx++) sSet(w, x + dx, y - 3, TILE.PLANKS); // lona/abrigo improvisado
    sSet(w, x + 3, y - 2, TILE.CARVED_BEAM); sSet(w, x + 3, y - 1, TILE.CARVED_BEAM);
    addLootChest(w, x + 2, y, 'camp', rnd);
    return true;
  }
  return false;
}

// Trechos seguidos de um bioma: [[início, fim], ...]
function biomeRuns(w, kind) {
  const runs = [];
  let a = -1;
  for (let x = 0; x <= w.w; x++) {
    const inside = x < w.w && w.biome[x] === kind;
    if (inside && a < 0) a = x;
    else if (!inside && a >= 0) { runs.push([a, x - 1]); a = -1; }
  }
  return runs;
}

// Um único habitat natural; tigerArena mantém os limites usados pela luta e pela história.
const TIGER_ARENA = { W: 76, WALL: 8, HEIGHT: 13 };
function buildTigerArena(w, rnd, x0) { return buildTigerHabitat(w,rnd,x0); }

// ---------- Covil do Patriarca (js/bear.js) ----------
// Gruta na encosta: montanha rochosa, entrada lateral e câmara de hibernação em abóbada.
// A casca resistente continua protegendo a luta e a passagem para a história.
function buildBearLair(w, rnd, taken = []) {
  if (w.w < 600) return; // o mundo decorativo do menu não comporta a montanha
  let bx = -1, best = -1;
  const radius = 72;
  for (let x = 120; x < w.w - 120; x += 2) {
    if (w.biome[x] !== BIOME.FOREST) continue;
    if (Math.abs(x - w.w / 2) < 180 || taken.some(([a, b]) => x + radius + 26 >= a && x - radius - 26 <= b)) continue;
    const alt = mountainAt(w, x) + Math.min(8, Math.abs(x - w.w / 2) * 0.008);
    if (alt > best) { best = alt; bx = x; }
  }
  if (bx < 0) return;
  const side = rnd() < .5 ? -1 : 1;
  const HW = 25, height = 20, approach = bx + side * (radius + 24);
  let approachFloor = w.surface[approach], approachLength = 24;
  const floor = Math.min(w.h - 35, Math.max(w.surface[bx] + 25, approachFloor - 2));
  const maxApproach = Math.min(64, (side < 0 ? bx : w.w - bx - 1) - radius - 4);
  // Nunca há mais de um bloco por degrau, mesmo se a semente tiver uma encosta alta.
  for (; approachLength < maxApproach; approachLength++) {
    approachFloor = w.surface[bx + side * (radius + approachLength)];
    if (Math.abs(approachFloor - floor) <= approachLength) break;
  }
  approachFloor = w.surface[bx + side * (radius + approachLength)];
  const peak = Math.max(45, floor - w.surface[bx] + 10);
  const x0 = bx - HW, x1 = bx + HW, y0 = floor - height, y1 = floor;
  // Picos assimétricos e estratos de pedra, com terra e vegetação apenas no alto.
  for (let x = bx - radius; x <= bx + radius; x++) {
    const k = Math.abs((x - bx) / radius), ridge = Math.pow(Math.max(0, 1 - Math.pow(k, 1.4)), .85);
    const rough = Math.sin(x * .23) * 1.5 + Math.sin(x * .073) * 3;
    const top = Math.min(w.surface[x], floor - Math.round(ridge * peak + rough * ridge));
    for (let y = top; y <= floor + 4; y++) {
      const grass = k > .62 && y === top;
      sSet(w, x, y, grass ? TILE.GRASS : y === top + 1 && k > .7 ? TILE.DIRT : TILE.STONE, WALL.STONE);
      w.water[y * w.w + x] = 0;
    }
    w.surface[x] = top;
  }
  // Casca: três blocos de rocha matriz em volta de tudo
  for (let y = y0 - 3; y <= y1 + 3; y++)
    for (let x = x0 - 3; x <= x1 + 3; x++) {
      if (!w.inBounds(x, y)) continue;
      const inside = x >= x0 && x <= x1 && y >= y0 && y <= y1;
      sSet(w, x, y, inside ? TILE.AIR : TILE.BEDROCK, WALL.STONE);
      w.water[y * w.w + x] = 0;
    }
  const roof = [];
  for (let x = x0; x <= x1; x++) {
    const k = (x - bx) / HW;
    const top = y0 + Math.round(5 * k * k + (Math.sin(x * .57) + 1) * 1.2);
    roof.push(top);
    for (let y = y0; y < top; y++) sSet(w, x, y, TILE.STONE, WALL.STONE);
  }
  // Piso de pedra em cima da casca, para o chão não parecer parede
  for (let x = x0; x <= x1; x++) sSet(w, x, y1, TILE.BEDROCK, WALL.STONE);
  // Poucas tochas deixadas por exploradores; o fundo da toca mantém a penumbra natural.
  for (const x of [x0 + 3, bx - 10, bx + 11, x1 - 3]) sSet(w, x, y1 - 5, TILE.TORCH);
  addLootChest(w, bx + side * (HW - 3), y1 - 1, 'dungeon', rnd);

  // Porta: um vão de 4 na parede do lado escolhido, aberto até o urso acordar
  const doorX = side < 0 ? x0 - 1 : x1 + 1, door = [];
  for (let y = y1 - 4; y < y1; y++) for (let dx = 0; dx < 3; dx++) {
    const x = doorX + side * dx;
    sSet(w, x, y, TILE.AIR, WALL.STONE);
    door.push([x, y]);
  }
  // Galeria horizontal até uma boca larga na encosta; acesso a pé, sem poço vertical.
  const shaft = [], mouthX = bx + side * (radius - 5);
  for (let step = HW + 4; step <= radius + approachLength; step++) {
    const x = bx + side * step;
    const outside = step >= radius - 5;
    const blend = clamp((step - radius) / approachLength, 0, 1);
    const walkFloor = floor + Math.round((approachFloor - floor) * blend);
    const top = outside ? Math.min(w.surface[x] - 8, walkFloor - 7) : floor - 5 - Math.round((step - HW) / (radius - HW) * 2);
    for (let y = top; y < walkFloor; y++) {
      sSet(w, x, y, TILE.AIR, outside ? WALL.NONE : WALL.STONE); w.water[y * w.w + x] = 0;
      shaft.push([x, y]);
    }
    sSet(w, x, walkFloor, outside ? TILE.GRASS : TILE.STONE, WALL.STONE);
    for (let y = walkFloor + 1; y <= Math.max(walkFloor + 3, floor + 4); y++) sSet(w, x, y, TILE.STONE, WALL.STONE);
    if (outside) w.surface[x] = walkFloor;
  }
  storyBearChamber(w, rnd, x0, x1, y1, side); // câmara dos Vigias atrás do covil (js/story.js)
  w.bearLairs.push({ x: (bx + .5 - side * 6) * T, y: y1 * T, door, bounds: [x0, y0, x1, y1], shaft,
    habitat: { version: 2, center: bx, side, roof, mouth: [mouthX, floor], approach: [bx + side * (radius + approachLength), approachFloor],
      mountain: [bx - radius - approachLength - 2, y0 - peak, bx + radius + approachLength + 2, floor + 6] } });
}

// Chamado no fim da geração (js/world.js): as poças de caverna e a areia que veda a água vêm
// depois das estruturas e às vezes entupiam o poço do covil. Reabre o caminho e, se tiver água
// encostada, fecha esse lado com pedra para ela não escorrer para dentro.
function reopenBearShafts(w) {
  for (const lair of w.bearLairs) {
    const [a, b, c, d] = lair.bounds;
    for (let y = b; y < d; y++) for (let x = a; x <= c; x++) w.water[y * w.w + x] = 0;
    const cells = new Set((lair.shaft || []).map(([x, y]) => y * w.w + x));
    for (const i of cells) { w.tiles[i] = TILE.AIR; w.water[i] = 0; }
    for (const i of cells)
      for (const j of [i - 1, i + 1, i - w.w, i + w.w])
        if (!cells.has(j) && w.water[j]) { w.water[j] = 0; w.tiles[j] = TILE.STONE; }
  }
}

function* generateStructures(w, rnd) {
  const taken = [], mid = w.w / 2;
  // Rios, cachoeiras e o mar já estão no lugar (js/water-gen.js): nada de vila em cima deles
  // as lagoas do pântano são muitas e curtas: não entram em `taken` (a folga de 45 blocos comeria o mapa); freeSpot só as evita
  for (const r of w.rivers) if (!r.swamp) taken.push([r.span[0] - 6, r.span[1] + 6]);
  if (w.oceanStart < w.w) taken.push([w.oceanStart - 30, w.w]);
  // SURFACE_GAP: blocos livres entre duas construções da superfície (antes eram 10 e o mapa ficava lotado)
  const SURFACE_GAP = 45;
  const freeSpot = (a, b) => Math.abs((a + b) / 2 - mid) > 170 && taken.every(([c, d]) => b < c - SURFACE_GAP || a > d + SURFACE_GAP) && w.rivers.every((r) => !r.swamp || b < r.span[0] - 8 || a > r.span[1] + 8);
  buildBearLair(w, rnd, taken);
  for (const l of w.bearLairs) taken.push([l.habitat.mountain[0], l.habitat.mountain[2]]);
  const place = (count, span, build) => {
    for (let i = 0; i < count; i++)
      for (let t = 0; t < 14; t++) {
        const x = 60 + Math.floor(rnd() * (w.w - 120 - span));
        if (!freeSpot(x, x + span)) continue;
        taken.push([x, x + span]);
        build(x);
        break;
      }
  };
  // Um lugar sorteado dentro do maior trecho do bioma (um marco por bioma, não um por trecho)
  const placeInBiome = (kind, span, build) => {
    for (const [a, b] of biomeRuns(w, kind).sort((p, q) => (q[1] - q[0]) - (p[1] - p[0])).slice(0, 1)) {
      if (b - a < span + 30) continue;
      for (let t = 0; t < 30; t++) {
        const x = a + 12 + Math.floor(rnd() * (b - a - span - 20));
        if (!freeSpot(x, x + span)) continue;
        taken.push([x - 4, x + span + 4]);
        build(x);
        break;
      }
    }
  };

  // Um bosque do tigre, preferencialmente na floresta. Reservado antes das aldeias.
  const span=TIGER_ARENA.W;
  const freeTiger=x=>x>=24&&x+span+16<w.w-24&&Math.abs(x+span/2-mid)>150&&taken.every(([a,b])=>x+span+16<a||x-16>b);
  let tigerX;
  const runs=biomeRuns(w,BIOME.FOREST).sort((a,b)=>(b[1]-b[0])-(a[1]-a[0]));
  for(const [a,b]of runs){
    for(let x=a+16;x+span+16<b;x+=4)if(freeTiger(x)){tigerX=x;break;}
    if(tigerX!==undefined)break;
  }
  if(tigerX===undefined)for(let x=24;x+span+16<w.w-24;x+=4)if(freeTiger(x)){tigerX=x;break;}
  if(tigerX!==undefined){
    taken.push([tigerX-16,tigerX+span+16]);
    const road=buildTigerArena(w,rnd,tigerX);if(road)taken.push(road);
  }
  // Aldeias do povo isolado e as ruínas do que existia antes (js/ruins.js)
  place(Math.max(1, Math.floor(w.w / 1500)), 160, (x) => buildTribalVillage(w, rnd, x + 30));
  yield [0.972, 'Erguendo aldeias'];
  place(Math.max(1, Math.floor(w.w / 1600)), 30, (x) => buildAbandonedHouse(w, rnd, x + 2));
  generateRuins(w, rnd, place);

  // Marcos de cada bioma: pirâmide no deserto, iglu na tundra, templo na selva e
  // acampamento de caçadores na savana
  placeInBiome(BIOME.DESERT, 40, (x) => buildPyramid(w, rnd, x + 20));
  placeInBiome(BIOME.SNOW, 20, (x) => buildIgloo(w, rnd, x + 10));
  placeInBiome(BIOME.JUNGLE, 26, (x) => buildJungleTemple(w, rnd, x));
  placeInBiome(BIOME.SAVANNA, 26, (x) => buildHunterCamp(w, rnd, x));
  buildSpiderMine(w, rnd, freeSpot, taken); // mina abandonada da Fiandeira (js/spider-boss.js)
  buildBeetleLair(w, rnd, freeSpot, taken); // covil do Casco de Ferro e observatório (js/beetle-boss.js)
  yield [0.978, 'Erguendo monumentos'];

  // Torres de vigia e poços espalhados por qualquer bioma
  place(Math.max(1, Math.floor(w.w / 3000)), 12, (x) => decayTower(w, rnd, buildWatchtower(w, rnd, x)));
  place(Math.max(1, Math.floor(w.w / 2500)), 10, (x) => buildWell(w, rnd, x + 3));
  // Minas e masmorras sorteadas não podem atravessar o covil do urso nem a arena do tigre
  // (antes uma mina às vezes enchia a sala do urso de tábua e pedra)
  const bossAreas = [
    ...w.bearLairs.map((l) => l.habitat?.mountain || [l.bounds[0] - 28, l.bounds[1] - 8, l.bounds[2] + 28, l.bounds[3] + 8]),
    ...(w.spiderNests || []).map(({ bounds: [a, b, c, d] }) => [a - 20, b - 8, c + 20, d + 8]),
    ...(w.beetleLairs || []).map(({ bounds: [a, b, c, d] }) => [a - 30, b - 14, c + 30, d + 8]),
    ...(w.tigerArena ? [[w.tigerArena.x0 - 20, 0, w.tigerArena.x1 + 20, w.tigerArena.floor + 4]] : []),
    ...(w.coreTop ? [[0, w.coreTopMin - 10, w.w, w.h]] : []), // a faixa do Coração tem as estruturas dela (js/core-world.js)
    ...(w.coreShafts || []).map(({ x, yTop, yBottom }) => [x - 8, yTop - 8, x + 8, yBottom]),
  ];
  const clear = (x0, y0, x1, y1) => bossAreas.every(([a, b, c, d]) => x1 < a || x0 > c || y1 < b || y0 > d);
  for (let i = 0; i < Math.floor(w.w / 300); i++) {
    const x = 20 + Math.floor(rnd() * (w.w - 100)), y = Math.min(w.h - 20, w.surface[x] + 30 + Math.floor(rnd() * w.h * 0.45));
    if (clear(x - 2, y - 36, x + 72, y + 2)) buildMineshaft(w, rnd, x, y);
  }
  for (let i = 0; i < Math.floor(w.w / 800); i++) {
    const x = 20 + Math.floor(rnd() * (w.w - 70)), y = Math.floor(w.h * (0.55 + rnd() * 0.28));
    if (clear(x - 24, y - 4, x + 50, y + 14)) buildDungeon(w, rnd, x, y);
  }
  for (let i = 0, made = 0; i < Math.floor(w.w / 400) * 4 && made < Math.floor(w.w / 400); i++) if (tryCaveCamp(w, rnd, clear)) made++;
  generateCaveStructures(w, rnd, clear); // pontes, andaimes, bunker e cripta nas cavernas (js/cave-structures.js)
  buildOceanTreasures(w, rnd); // navio afundado e baús do mar
  yield [0.985, 'Escondendo tesouros'];
}
