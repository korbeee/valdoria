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

// Relevo do oceano: duna de areia segurando o mar e praia descendo; depois uma laguna rasa e clara (4 a 7 blocos), uma
// crista de recife e o paredão que despenca para o mar fundo, onde fica o navio. As ondulações do fundo só aparecem fora da laguna.
const LAGOON_W = 62;   // largura da laguna, depois da praia
function oceanFloorAt(world, x, landS) {
  const d = x - world.oceanStart, sea = world.seaLevel, seed = world.seed;
  if (d < 18) return Math.round(lerp(landS, Math.min(landS, sea - 3), smoothstep(d / 18)));
  if (d < BEACH_W) return Math.round(lerp(Math.min(landS, sea - 3), sea + 1, smoothstep((d - 18) / (BEACH_W - 18))));
  const lagoon = 5 + noise1(x * 0.05, seed + 94) * 2.2 + noise1(x * 0.2, seed + 95) * 0.8;
  const k1 = smoothstep(clamp((d - BEACH_W) / 12, 0, 1)), k2 = smoothstep(clamp((d - (BEACH_W + LAGOON_W)) / 48, 0, 1));
  const deep = 32 + Math.round(noise1(x * 0.011, seed + 90) * 6);
  const crest = Math.exp(-(((d - (BEACH_W + LAGOON_W - 4)) / 7) ** 2)) * 2.4;        // a borda do recife sobe um pouco antes de despencar
  const ripple = (noise1(x * 0.045, seed + 91) * 4 + noise1(x * 0.13, seed + 93) * 1.5) * (0.3 * k1 + 0.7 * k2);
  return Math.round(sea + 1 + k1 * lagoon + k2 * (deep - lagoon) - crest * (1 - k2) + ripple);
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

// Navio afundado (galeão em corte lateral; o baú do capitão tem o tridente só às vezes) e baús perdidos pelo fundo do mar
const SHIPWRECK = { length: 38, minDepth: 22, maxDepth: 38, tridentChance: 0.5 };

function buildOceanTreasures(w, rnd) {
  if (w.oceanStart >= w.w) return;
  const sea = w.seaLevel, L = SHIPWRECK.length;
  // O navio fica onde o fundo está entre 22 e 38 blocos abaixo do mar: o mastro principal ainda alcança a superfície
  const spots = [];
  for (let x = w.oceanStart + BEACH_W + 30; x + L + 10 < w.w; x += 2) {
    let ok = true;
    for (let k = 0; k <= L && ok; k += 2) { const d = w.surface[x + k] - sea; ok = d >= SHIPWRECK.minDepth && d <= SHIPWRECK.maxDepth; }
    if (ok) spots.push(x);
  }
  let ship = spots.length ? spots[Math.floor(rnd() * spots.length)] : -1;
  if (ship < 0) {                                                   // oceano raso demais: procura qualquer fundo razoável
    for (let t = 0; t < 60 && ship < 0; t++) {
      const x = w.oceanStart + BEACH_W + 20 + Math.floor(rnd() * Math.max(1, w.w - w.oceanStart - BEACH_W - 40 - L));
      let ok = x + L + 6 < w.w;
      for (let k = 0; k <= L && ok; k += 2) ok = w.surface[x + k] - sea > 14;
      if (ok) ship = x;
    }
  }
  if (ship >= 0) buildShipwreck(w, ship, L);

  const want = 4 + Math.floor(rnd() * 3);
  for (let t = 0, made = 0; t < 80 && made < want; t++) {
    const x = w.oceanStart + BEACH_W + Math.floor(rnd() * Math.max(1, w.w - w.oceanStart - BEACH_W - 6));
    if (ship >= 0 && x > ship - 10 && x < ship + L + 10) continue;
    const y = w.surface[x] - 1;
    if (y - sea < 4 || !SOLID[w.getTile(x, y + 1)]) continue;
    for (let yy = y - 1; w.getTile(x, yy) === TILE.SEAWEED; yy--) sSet(w, x, yy, TILE.AIR);
    addLootChest(w, x, y, 'ocean', rnd);
    made++;
  }
}

// Casco em corte lateral: popa (u = 0) à esquerda, proa (u = L) à direita, espelhado se `dir` < 0.
//   convés em D; convés de canhões em G; porão embaixo; cabine do capitão na popa; três mastros (o principal passa da água)
// Tudo que decide a forma usa um sorteio próprio (semente do mundo): o navio nunca muda o resto da geração.
function buildShipwreck(w, x0, L) {
  // semente embaralhada (sementes em sequência não podem dar navios parecidos nem o mesmo sorteio do tridente)
  const mix = (v) => { v = Math.imul((v ^ (v >>> 16)) >>> 0, 0x45d9f3b); v = Math.imul((v ^ (v >>> 16)) >>> 0, 0x45d9f3b); return ((v ^ (v >>> 16)) >>> 0); };
  const sea = w.seaLevel, x1 = x0 + L, r = mulberry32(mix((w.seed ^ 0x5417) >>> 0)), tridentRoll = mix((w.seed ^ 0x77a3) >>> 0) / 4294967296, dir = r() < 0.5 ? 1 : -1;
  const X = (u) => (dir > 0 ? x0 + u : x1 - u);
  const sm = (t) => smoothstep(clamp(t, 0, 1));
  // Fundo aplainado embaixo do casco, com as pontas descendo de volta ao fundo natural
  const hs = [];
  for (let x = x0; x <= x1; x++) hs.push(w.surface[x]);
  hs.sort((a, b) => a - b);
  const F = hs[hs.length >> 1], D = F - 8, G = F - 4, M = 8;
  for (let x = x0 - M; x <= x1 + M; x++) {
    const edge = x < x0 ? (x0 - x) / M : x > x1 ? (x - x1) / M : 0, orig = w.surface[x], h = Math.round(lerp(F, orig, sm(edge)));
    for (let y = Math.min(h, orig) - 16; y < Math.max(h, orig) + 1; y++) {
      if (y < sea) continue;
      if (y < h) sSet(w, x, y, TILE.AIR, WALL.NONE); else sSet(w, x, y, TILE.SAND);
    }
    w.surface[x] = h;
  }
  const top = (u) => D - (u > L - 11 ? Math.round(3 * sm((u - (L - 11)) / 11)) : 0);          // a proa sobe
  const bot = (u) => F - (u < 8 ? Math.round(5 * sm((8 - u) / 8)) : u > L - 14 ? Math.round(6 * sm((u - (L - 14)) / 14)) : 0); // quilha curva nas pontas
  const plank = (u, y) => sSet(w, X(u), y, TILE.PLANKS, WALL.PLANKS);
  const hole = (u, y, wall = WALL.NONE) => sSet(w, X(u), y, TILE.AIR, wall);
  const hatch = Math.round(L * 0.58), hatchW = 2;                     // alçapão do convés, com a escada
  // 1. Casco: quilha dupla, borda do convés, popa e proa; por dentro, a parede de tábuas (às vezes falha)
  for (let u = 0; u <= L; u++) {
    const t = top(u), b = bot(u);
    for (let y = t; y <= b; y++) {
      const keel = y >= b - 1, rim = y === t && r() > 0.2, wall = u === 0 || u === L;
      if (keel || wall || rim) plank(u, y); else hole(u, y, r() < 0.1 ? WALL.NONE : WALL.PLANKS);
    }
    for (let y = b + 1; y <= F; y++) sSet(w, X(u), y, TILE.SAND);       // a quilha curva fica enterrada num montinho de areia
    // costelas do casco: viga de uma ponta à outra do porão
    if (u > 2 && u < L - 2 && u % 6 === 0) for (let y = D + 1; y < b - 1; y++) sSet(w, X(u), y, TILE.CARVED_BEAM, WALL.PLANKS);
  }
  // 2. Convés principal (rasgado onde o mastro caiu) e convés de canhões
  for (let u = 1; u < L; u++) {
    const gap = (u >= hatch && u < hatch + hatchW) || (u > L * 0.4 && u < L * 0.52 && r() < 0.75) || r() < 0.16;
    if (!gap) plank(u, D); else hole(u, D, WALL.PLANKS);
  }
  for (let u = 4; u < L - 5; u++) {
    if (bot(u) - 2 <= G) continue;
    const gap = (u >= hatch && u < hatch + hatchW) || r() < 0.28;
    if (!gap) plank(u, G);
  }
  for (let y = D; y < F - 1; y++) sSet(w, X(hatch), y, TILE.LADDER, WALL.PLANKS);   // escada do convés ao porão
  // 3. Amurada com balaústres (na popa, sobre a cabine, nada)
  for (let u = 13; u < L - 2; u++) if (r() < 0.62 && w.getTile(X(u), D) === TILE.PLANKS) sSet(w, X(u), D - 1, TILE.BALUSTRADE, WALL.NONE);
  // 4. Cabine do capitão na popa (u 0..11): parede com janelas de vidro, teto, porta, mesa, vela e lampião
  for (let u = 0; u <= 11; u++) {
    plank(u, D - 5);                                                  // teto
    for (let y = D - 4; y < D; y++) {
      if (u === 0) { if (y === D - 3 || y === D - 2) sSet(w, X(u), y, TILE.GLASS, WALL.PLANKS); else plank(u, y); }
      else if (u === 11) { if (y >= D - 2) hole(u, y, WALL.PLANKS); else plank(u, y); }     // porta aberta
      else hole(u, y, WALL.PLANKS);
    }
  }
  sSet(w, X(5), D - 1, TILE.TABLE, WALL.PLANKS); sSet(w, X(5), D - 2, TILE.CANDLE, WALL.PLANKS);
  sSet(w, X(4), D - 1, TILE.CHAIR, WALL.PLANKS); sSet(w, X(7), D - 1, TILE.CHAIR, WALL.PLANKS);
  sSet(w, X(8), D - 4, TILE.LANTERN, WALL.PLANKS);
  // 5. Mastros: o principal é comprido e rompe a superfície; o da proa quebrou no meio; vergas com as velas rasgadas
  const sails = [], mainU = Math.round(L * 0.42), foreU = Math.round(L * 0.76);
  const mainH = clamp(D - (sea - 3), 10, 30), foreH = 11 + Math.floor(r() * 4);
  const mast = (u, h, yards) => {
    for (let y = D - 1; y >= D - h; y--) sSet(w, X(u), y, TILE.CARVED_BEAM, WALL.NONE);
    for (const [k, half] of yards) {
      const y = D - h + k;
      for (let du = -half; du <= half; du++) if (r() > 0.12 || Math.abs(du) < 2) sSet(w, X(u + du), y, TILE.PLATFORM, WALL.NONE);
      sails.push({ x: X(u), y: y + 1, half, h: Math.min(10, h - k - 2), seed: Math.floor(r() * 1e6) });
    }
  };
  mast(mainU, mainH, [[3, 5], [Math.min(mainH - 5, 13), 4]]);
  mast(foreU, foreH, [[2, 4]]);
  sSet(w, X(foreU), D - foreH, TILE.AIR, WALL.NONE);                  // ponta do mastro de proa quebrada
  for (let k = 1; k <= 6; k++) sSet(w, X(L) + dir * k, top(L) - 1 - (k > 4 ? 1 : 0), TILE.PLATFORM, WALL.NONE); // gurupés
  // 6. Carga e baús: barris e caixotes no porão e no convés de canhões; o baú do capitão (tridente por sorte) na cabine
  for (let u = 8; u < L - 12; u++) {
    const roll = r(), free = (y) => w.getTile(X(u), y) === TILE.AIR && X(u) !== X(hatch);
    if (roll < 0.22 && free(F - 2)) { sSet(w, X(u), F - 2, roll < 0.1 ? TILE.CRATE : TILE.BARREL, WALL.PLANKS); if (roll < 0.05 && free(F - 3)) sSet(w, X(u), F - 3, TILE.CRATE, WALL.PLANKS); }
    else if (roll > 0.88 && w.getTile(X(u), G) === TILE.PLANKS && free(G - 1)) sSet(w, X(u), G - 1, TILE.BARREL, WALL.PLANKS);
  }
  const lootRnd = () => r();
  addLootChest(w, X(2), D - 1, 'shipwreck', lootRnd);
  const captain = w.lootChests[w.lootChests.length - 1];
  if (tridentRoll < SHIPWRECK.tridentChance) {
    const free = captain.slots.findIndex((s) => !s);
    captain.slots[free >= 0 ? free : 0] = { item: ITEM.TRIDENT, count: 1 };
  }
  const holdU = Math.round(L * 0.62);
  if (w.getTile(X(holdU), F - 2) !== TILE.AIR) sSet(w, X(holdU), F - 2, TILE.AIR);
  addLootChest(w, X(holdU), F - 2, 'shipwreck', lootRnd);
  // 7. Vida crescendo no casco: algas no convés e corais na amurada e nas bordas; tábuas soltas na areia
  for (let u = 2; u < L - 1; u++) {
    if (w.getTile(X(u), D) !== TILE.PLANKS || w.getTile(X(u), D - 1) !== TILE.AIR) continue;
    const roll = r();
    if (roll < 0.3) { const n = 1 + Math.floor(r() * 3); for (let k = 1; k <= n; k++) if (w.getTile(X(u), D - k) === TILE.AIR) sSet(w, X(u), D - k, TILE.SEAWEED); }
    else if (roll < 0.45) sSet(w, X(u), D - 1, CORAL_TILES[Math.floor(r() * CORAL_TILES.length)]);
  }
  for (let k = 0; k < 14; k++) {
    const x = x0 - M + 1 + Math.floor(r() * (L + 2 * M - 2)), inside = x >= x0 - 1 && x <= x1 + 1, sy = w.surface[x] - 1;
    if (inside || !SOLID[w.getTile(x, sy + 1)] || w.getTile(x, sy) !== TILE.AIR) continue;
    if (k % 3 === 0) sSet(w, x, sy, TILE.PLANKS); else sSet(w, x, sy, CORAL_TILES[Math.floor(r() * CORAL_TILES.length)]);
  }
  // 8. Tudo que ficou oco embaixo do nível do mar se enche de água
  for (let x = x0 - M; x <= x1 + M; x++)
    for (let y = sea; y <= F + 1; y++) {
      const i = y * w.w + x;
      w.water[i] = SOLID[w.tiles[i]] ? 0 : WATER_MAX;
    }
  // Dados para a arte (js/ocean-art.js): velas rasgadas nas vergas, bandeira no topo do mastro e a âncora na proa
  w.wreck = { x0, x1, F, D, G, dir, sails, flag: { x: X(mainU), y: D - mainH }, anchor: { x: X(L) + dir * 4, y: w.surface[X(L) + dir * 4] }, mainU, foreU };
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
