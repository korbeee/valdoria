'use strict';

// =====================================================================================
//  GERAÇÃO DA ÁGUA: oceano no canto direito, rios com cachoeira, plantas e tesouros do mar
// =====================================================================================
// Chamado pelo World.generateSteps (js/world.js): oceanFloorAt no relevo, generateWater depois
// da rocha matriz, buildOceanTreasures junto das estruturas e sealWater bem no fim.

// [item, mínimo, máximo, chance] — veja rollLoot em js/structures.js
LOOT_TABLES.ocean = [
  [ITEM.PEARL, 1, 3, 0.5], [ITEM.SHELL, 2, 6, 0.6], [ITEM.STARFISH, 1, 3, 0.5], [ITEM.RAW_FISH, 2, 5, 0.45],
  [ITEM.AIR_BOTTLE, 1, 3, 0.55], [ITEM.CORAL_BRANCH, 1, 4, 0.3], [ITEM.CORAL_FAN, 1, 4, 0.3], [ITEM.CORAL_BRAIN, 1, 4, 0.3],
  [ITEM.SEAWEED, 3, 8, 0.4], [ITEM.METAL_BAR, 1, 3, 0.25], [ITEM.TRIDENT, 1, 1, 0.06],
];
LOOT_TABLES.shipwreck = [
  [ITEM.PEARL, 2, 5, 0.7], [ITEM.METAL_BAR, 2, 5, 0.5], [ITEM.AIR_BOTTLE, 2, 4, 0.7], [ITEM.COOKED_FISH, 2, 4, 0.5],
  [ITEM.ROPE, 1, 3, 0.5], [ITEM.SHELL, 2, 5, 0.5], [ITEM.STARFISH, 1, 2, 0.4], [ITEM.BOLTS, 2, 6, 0.3], [ITEM.CLOTH, 2, 4, 0.3],
];

const BEACH_W = 40;     // largura da praia (duna + descida até a água)
const RIVER_EVERY = 850; // um rio a cada tantos blocos de largura do mundo

// Relevo do oceano: duna de areia segurando o mar, praia descendo e o fundo com ondulações
function oceanFloorAt(world, x, landS) {
  const d = x - world.oceanStart, sea = world.seaLevel, seed = world.seed;
  if (d < 18) return Math.round(lerp(landS, Math.min(landS, sea - 3), smoothstep(d / 18)));
  if (d < BEACH_W) return Math.round(lerp(Math.min(landS, sea - 3), sea + 1, smoothstep((d - 18) / (BEACH_W - 18))));
  const k = smoothstep(clamp((d - BEACH_W) / 90, 0, 1)), deep = 32 + Math.round(noise1(x * 0.011, seed + 90) * 6);
  return Math.round(sea + 1 + k * deep + (noise1(x * 0.045, seed + 91) * 4 + noise1(x * 0.13, seed + 93) * 1.5) * k);
}

function* generateWater(world, rnd) {
  const { w, tiles, walls, water, surface } = world;
  const band = [world.h, 0];
  const mark = (y) => { band[0] = Math.min(band[0], y); band[1] = Math.max(band[1], y); };

  // 1. Mar: enche do nível do mar até o fundo
  const sea = world.seaLevel;
  for (let x = world.oceanStart; x < w; x++)
    for (let y = sea; y < surface[x]; y++) {
      const i = y * w + x;
      tiles[i] = TILE.AIR; walls[i] = WALL.NONE; water[i] = WATER_MAX;
      mark(y + 1);
    }
  if (world.oceanStart < w) mark(sea);
  yield [0.94, 'Enchendo o mar'];

  // 2. Rios cavados no terreno, longe do avião e uns dos outros; metade ganha cachoeira
  const count = w >= 1000 ? Math.floor(w / RIVER_EVERY) : 0, mid = w / 2;
  for (let tries = 0; world.rivers.length < count && tries < count * 25; tries++) {
    const hw = 7 + Math.floor(rnd() * 11);
    const cx = 60 + Math.floor(rnd() * Math.max(1, world.oceanStart - 200));
    if (Math.abs(cx - mid) < 210 + hw) continue;
    if (world.rivers.some((r) => Math.abs(r.cx - cx) < r.hw + hw + 110)) continue;
    const wl = Math.max(surface[cx - hw - 1], surface[cx + hw + 1]) + 1;
    let peak = Infinity;
    for (let x = cx - hw; x <= cx + hw; x++) peak = Math.min(peak, surface[x]);
    if (peak < wl - 12) continue; // não abre cânion no meio de montanha
    const frozen = world.biomeAt(cx) === BIOME.SNOW;
    const fallSide = !frozen && rnd() < 0.6 ? (rnd() < 0.5 ? -1 : 1) : 0;
    const river = carveRiver(world, rnd, cx, hw, wl, fallSide, frozen);
    if (fallSide) buildWaterfall(world, rnd, river);
    mark(river.fall ? river.fall.top - 1 : wl);
    mark(wl + river.depth + 1);
  }
  yield [0.95, 'Cavando rios'];

  // 3. Plantas: vitórias-régias e algas nos rios; algas e corais (em recifes) no mar
  for (const r of world.rivers) {
    if (r.frozen) continue;
    for (let x = r.x0; x <= r.x1; x++) {
      if (r.fall && x === r.fall.x) continue;
      const bed = surface[x], depth = bed - r.wl;
      if (depth >= 2 && rnd() < 0.22) tiles[r.wl * w + x] = TILE.LILYPAD;
      if (depth >= 4 && rnd() < 0.3) {
        const n = 1 + Math.floor(rnd() * Math.min(3, depth - 3));
        for (let k = 0; k < n; k++) tiles[(bed - 1 - k) * w + x] = TILE.SEAWEED;
      }
    }
  }
  for (let x = world.oceanStart; x < w; x++) {
    const bed = surface[x], depth = bed - sea;
    if (depth < 4) continue;
    const reef = noise1(x * 0.03, world.seed + 77) > 0.15;
    if (depth >= 7 && rnd() < (reef ? 0.5 : 0.08)) {
      tiles[(bed - 1) * w + x] = CORAL_TILES[Math.floor(rnd() * CORAL_TILES.length)];
      continue;
    }
    if (rnd() < (reef ? 0.15 : 0.3)) {
      const n = 2 + Math.floor(rnd() * Math.min(8, depth - 4));
      for (let k = 0; k < n; k++) tiles[(bed - 1 - k) * w + x] = TILE.SEAWEED;
    }
  }
  world.waterBand = band;
  yield [0.955, 'Plantando algas'];
}

// Canal com fundo de areia (lama na selva). O nível da água fica um bloco abaixo da margem
// mais baixa; do lado da cachoeira o canal é fundo até a parede, para a queda cair num poço.
function carveRiver(world, rnd, cx, hw, wl, fallSide, frozen, depthOverride) {
  const { w, tiles, walls, water, surface } = world;
  const depth = depthOverride ?? 4 + Math.floor(rnd() * 5), bedTile = world.biomeAt(cx) === BIOME.JUNGLE || world.biomeAt(cx) === BIOME.SWAMP ? TILE.MUD : TILE.SAND;
  for (let x = cx - hw; x <= cx + hw; x++) {
    const t = x - cx, far = Math.abs(t) / hw, frac = fallSide && Math.sign(t) === fallSide ? far * 0.5 : far;
    const bed = wl + Math.max(1, Math.round(1 + (depth - 1) * (1 - frac * frac)));
    for (let y = Math.min(surface[x], wl); y < bed; y++) {
      const i = y * w + x;
      tiles[i] = TILE.AIR; walls[i] = WALL.NONE; water[i] = y >= wl ? WATER_MAX : 0;
    }
    for (let y = bed; y < bed + 4; y++) {
      const i = y * w + x;
      tiles[i] = y < bed + 2 ? bedTile : SOLID[tiles[i]] ? tiles[i] : TILE.DIRT;
      water[i] = 0;
    }
    surface[x] = bed;
    if (frozen) { tiles[wl * w + x] = TILE.ICE; water[wl * w + x] = 0; } // rio congelado na tundra
  }
  // Margens firmes até abaixo do leito (caverna embaixo não pode furar o rio)
  for (const bx of [cx - hw - 1, cx + hw + 1])
    for (let y = surface[bx]; y <= wl + depth + 3; y++) if (!SOLID[tiles[y * w + bx]]) tiles[y * w + bx] = TILE.DIRT;
  const river = { cx, hw, wl, depth, x0: cx - hw, x1: cx + hw, span: [cx - hw - 4, cx + hw + 4], frozen, fallSide, fall: null };
  world.rivers.push(river);
  return river;
}

// Paredão de pedra numa das margens, com uma lagoa no alto que transborda por um rasgo na
// borda. A queda (WATER_FALL) é permanente: ela não esvazia a lagoa nem enche o rio.
function buildWaterfall(world, rnd, river) {
  const { w, tiles, walls, water, surface } = world, side = river.fallSide;
  const e = river.cx + side * (river.hw + 1); // margem que vira paredão
  const xf = river.cx + side * river.hw;      // coluna da queda, colada no paredão
  const H = 8 + Math.floor(rnd() * 6), pt = river.wl - H;
  const PW = 10 + Math.floor(rnd() * 6), pond = 3 + Math.floor(rnd() * 3), ramp = Math.round(H * 1.8);
  const b = world.biomeAt(e);
  const top = b === BIOME.JUNGLE ? TILE.JUNGLE_GRASS : b === BIOME.SAVANNA ? TILE.DRY_GRASS : b === BIOME.DESERT ? TILE.SAND : b===BIOME.SAKURA?TILE.SAKURA_GRASS:TILE.GRASS;
  const soil = b === BIOME.DESERT ? TILE.SAND : b === BIOME.JUNGLE ? TILE.MUD : TILE.DIRT;
  let far = e;
  for (let k = 0; k < PW + ramp; k++) {
    const x = e + side * k;
    if (x < 3 || x >= world.oceanStart - 3) break;
    far = x;
    const target = k < PW ? pt : pt + Math.round(((k - PW + 1) * H) / ramp);
    if (surface[x] <= target) continue; // o terreno ali já é mais alto
    for (let y = target; y < surface[x]; y++) {
      const i = y * w + x;
      tiles[i] = y === target ? top : y < target + 3 ? soil : hash2(x, y, 17) < 0.15 ? TILE.MOSS_BRICK : TILE.STONE;
      walls[i] = y === target ? WALL.NONE : WALL.STONE;
    }
    surface[x] = target;
  }
  // Face de pedra aparente
  for (let y = pt + 1; y < river.wl + river.depth; y++) {
    const i = y * w + e;
    tiles[i] = hash2(e, y, 23) < 0.2 ? TILE.MOSS_BRICK : TILE.STONE; water[i] = 0;
  }
  // Lagoa no alto do paredão e o rasgo por onde ela transborda
  for (let k = 1; k <= pond; k++) {
    const x = e + side * k;
    for (let y = pt; y < pt + 3; y++) { const i = y * w + x; tiles[i] = TILE.AIR; walls[i] = WALL.NONE; water[i] = WATER_MAX; }
    tiles[(pt + 3) * w + x] = TILE.SAND;
    surface[x] = pt + 3;
  }
  tiles[pt * w + e] = TILE.AIR; walls[pt * w + e] = WALL.NONE; water[pt * w + e] = WATER_MAX;
  tiles[(pt + 1) * w + e] = TILE.STONE;
  surface[e] = pt + 1;
  for (let y = pt; y < river.wl; y++) { const i = y * w + xf; tiles[i] = TILE.AIR; walls[i] = WALL.NONE; water[i] = WATER_FALL; }
  river.fall = { x: xf, top: pt, bottom: river.wl - 1 };
  river.span = [Math.min(river.span[0], far - 4, e - 4), Math.max(river.span[1], far + 4, e + 4)];
}

// Navio afundado (baú do capitão com o tridente garantido) e baús perdidos pelo fundo do mar
function buildOceanTreasures(w, rnd) {
  if (w.oceanStart >= w.w) return;
  const sea = w.seaLevel, L = 26;
  let ship = -1;
  for (let t = 0; t < 60 && ship < 0; t++) {
    const x = w.oceanStart + BEACH_W + 40 + Math.floor(rnd() * Math.max(1, w.w - w.oceanStart - BEACH_W - 80 - L));
    let ok = x + L < w.w - 4;
    for (let k = 0; k <= L && ok; k += 2) ok = w.surface[x + k] - sea > 18;
    if (ok) ship = x;
  }
  if (ship >= 0) buildShipwreck(w, rnd, ship, L);

  const want = 4 + Math.floor(rnd() * 3);
  for (let t = 0, made = 0; t < 80 && made < want; t++) {
    const x = w.oceanStart + BEACH_W + Math.floor(rnd() * Math.max(1, w.w - w.oceanStart - BEACH_W - 6));
    if (ship >= 0 && x > ship - 4 && x < ship + L + 4) continue;
    const y = w.surface[x] - 1;
    if (y - sea < 4 || !SOLID[w.getTile(x, y + 1)]) continue;
    for (let yy = y - 1; w.getTile(x, yy) === TILE.SEAWEED; yy--) sSet(w, x, yy, TILE.AIR);
    addLootChest(w, x, y, 'ocean', rnd);
    made++;
  }
}

function buildShipwreck(w, rnd, x0, L) {
  const sea = w.seaLevel, x1 = x0 + L;
  // Fundo aplainado embaixo do casco
  const hs = [];
  for (let x = x0; x <= x1; x++) hs.push(w.surface[x]);
  hs.sort((a, b) => a - b);
  const floor = hs[hs.length >> 1];
  for (let x = x0 - 2; x <= x1 + 2; x++) {
    for (let y = Math.min(floor, w.surface[x]) - 12; y < Math.max(floor, w.surface[x]) + 1; y++) {
      if (y < sea) continue;
      if (y < floor) sSet(w, x, y, TILE.AIR, WALL.NONE);
      else sSet(w, x, y, TILE.SAND);
    }
    w.surface[x] = floor;
  }
  // Casco: fundo enterrado 1 bloco na areia, costado curvo e convés furado
  const deck = floor - 5;
  for (let y = deck; y <= floor; y++) {
    const j = y - deck, inset = Math.floor((j * j) / 6);
    const a = x0 + inset, b = x1 - inset;
    for (let x = a; x <= b; x++) {
      const edge = x === a || x === b || y === floor || y === deck;
      const broken = rnd() < (y === deck ? 0.3 : 0.12) && x > a + 1 && x < b - 1;
      if (edge && !broken) sSet(w, x, y, TILE.PLANKS, WALL.PLANKS);
      else sSet(w, x, y, TILE.AIR, y > deck && rnd() < 0.85 ? WALL.PLANKS : WALL.NONE);
    }
  }
  // Rombo no costado
  const hole = x0 + 4 + Math.floor(rnd() * (L - 8));
  for (let y = deck + 2; y < floor - 1; y++) sSet(w, hole, y, TILE.AIR, WALL.NONE);
  // Mastro quebrado e cabine na popa
  const mast = x0 + Math.floor(L / 2);
  const mh = 5 + Math.floor(rnd() * 5);
  for (let y = deck - 1; y >= deck - mh; y--) sSet(w, mast, y, TILE.CARVED_BEAM);
  const c0 = x1 - 8, c1 = x1 - 3;
  for (let x = c0; x <= c1; x++)
    for (let y = deck - 4; y < deck; y++) {
      const edge = x === c0 || x === c1 || y === deck - 4;
      sSet(w, x, y, edge && !(x === c0 && y > deck - 3) ? TILE.PLANKS : TILE.AIR, WALL.PLANKS);
    }
  sSet(w, c0 + 2, deck - 1, TILE.LANTERN, WALL.PLANKS);
  // Baú do capitão (no porão, com o tridente) e baú da cabine
  addLootChest(w, x0 + 6 + Math.floor(rnd() * 4), floor - 1, 'shipwreck', rnd);
  const captain = w.lootChests[w.lootChests.length - 1];
  const free = captain.slots.findIndex((s) => !s);
  captain.slots[free >= 0 ? free : 0] = { item: ITEM.TRIDENT, count: 1 };
  addLootChest(w, c0 + 3, deck - 1, 'shipwreck', rnd);
  // Tudo que ficou oco embaixo do nível do mar se enche de água
  for (let x = x0 - 2; x <= x1 + 2; x++)
    for (let y = Math.max(sea, deck - mh - 2); y <= floor; y++) {
      const i = y * w.w + x;
      w.water[i] = SOLID[w.tiles[i]] ? 0 : WATER_MAX;
    }
}

// ---------- Poças e lagos de caverna ----------
// Sorteia pontos no chão das cavernas e tenta encher a bacia em volta: sobe o nível da água de uma
// linha em uma enquanto o espaço abaixo desse nível continuar fechado (sem vazar para um buraco maior)
// e pequeno. Só em caverna natural: nada de água dentro de mina, ruína ou outra estrutura.
const CAVE_POOL = { tentativasPor: 9000, maxPoca: 240, maxLago: 900, chanceLago: 0.2, fundoMax: 7 };

// Células que a água ocuparia com a superfície na linha L, a partir de (sx, sy); null se vazar
function basinCells(world, sx, sy, L, max) {
  const { w, h, tiles, walls, water } = world;
  const start = sy * w + sx, seen = new Set([start]), stack = [start], out = [];
  while (stack.length) {
    const i = stack.pop();
    out.push(i);
    if (out.length > max) return null;
    const x = i % w, y = (i / w) | 0;
    for (const n of [i - 1, i + 1, i + w, i - w]) {
      if (n === i - w && y - 1 < L) continue; // acima da superfície não conta
      if ((n === i - 1 && x === 0) || (n === i + 1 && x === w - 1) || n < 0 || n >= w * h || (n / w | 0) >= h - 4) return null;
      if (SOLID[tiles[n]]) continue;
      const wall = walls[n];
      if (tiles[n] !== TILE.AIR || water[n] || (wall !== WALL.NONE && wall !== WALL.DIRT && wall !== WALL.STONE)) return null;
      if (!seen.has(n)) { seen.add(n); stack.push(n); }
    }
  }
  return out;
}

function* generateCavePools(world, rnd) {
  const { w, h, tiles, water, surface } = world;
  const band = world.waterBand || (world.waterBand = [h, 0]);
  const tries = Math.floor((w * h) / CAVE_POOL.tentativasPor);
  for (let a = 0; a < tries; a++) {
    const x = 8 + Math.floor(rnd() * (w - 16));
    if (world.biomeAt(x) === BIOME.OCEAN) continue;
    let y = surface[x] + 14 + Math.floor(rnd() * Math.max(1, h - surface[x] - 24));
    if (tiles[y * w + x] !== TILE.AIR || water[y * w + x]) continue;
    while (y < h - 6 && tiles[(y + 1) * w + x] === TILE.AIR && !water[(y + 1) * w + x]) y++; // desce até o chão
    if (!SOLID[tiles[(y + 1) * w + x]]) continue;
    const max = rnd() < CAVE_POOL.chanceLago ? CAVE_POOL.maxLago : CAVE_POOL.maxPoca;
    let best = null, depth = 0;
    for (let L = y; L > y - CAVE_POOL.fundoMax; L--) {
      const cells = basinCells(world, x, y, L, max);
      if (!cells) break;
      best = cells; depth = y - L + 1;
    }
    if (!best || depth < 2 || best.length < 6) continue;
    for (const i of best) water[i] = WATER_MAX;
    band[0] = Math.min(band[0], y - depth); band[1] = Math.max(band[1], y + 1);
    if ((a & 63) === 0) yield [0.988, 'Enchendo lagos nas cavernas'];
  }
}

// Todo buraco do lado ou embaixo da água vira areia (caverna, mina ou túnel que encostou nela)
function sealWater(world) {
  const { w, h, tiles, water } = world, band = world.waterBand;
  if (!band || band[0] > band[1]) return;
  for (let y = Math.max(1, band[0] - 1); y <= Math.min(h - 2, band[1] + 14); y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x, v = water[i];
      if (!v || v === WATER_FALL) continue;
      if (SOLID[tiles[i]]) { water[i] = 0; continue; } // uma estrutura pôs um bloco ali
      if (!SOLID[tiles[i + w]] && !water[i + w]) tiles[i + w] = TILE.SAND;
      if (x > 0 && !SOLID[tiles[i - 1]] && !water[i - 1]) tiles[i - 1] = TILE.SAND;
      if (x < w - 1 && !SOLID[tiles[i + 1]] && !water[i + 1]) tiles[i + 1] = TILE.SAND;
    }
}
