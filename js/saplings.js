'use strict';
// =====================================================================================
//  MUDAS DE ÁRVORE
// =====================================================================================
// Cada espécie tem a sua muda. A árvore que tomba inteira (com copa) solta 1–2 mudas da
// própria espécie; botão direito com a muda na mão planta num chão de terra/grama/areia/neve.
// Depois de alguns minutos ela vira uma árvore daquela espécie — em qualquer bioma: a
// espécie fica guardada na coluna (world.treeSpecies), e a copa é gerada por ela.
// Chuva caindo na muda faz crescer duas vezes mais rápido.

const SAPLING = {
  cresce: [150, 270],   // segundos até virar árvore (sorteado)
  chuva: 2,             // multiplicador com chuva caindo nela
  segundaMuda: 0.45,    // chance de a árvore soltar uma segunda muda
  folgaCopa: 4,         // blocos livres que a copa precisa acima do tronco
};

Object.assign(TILE, { SAPLING: 149 });
defTile(TILE.SAPLING, { name: 'Muda', solid: false, hardness: 0.05, drop: null, opacity: 1, apoio: 'chao', color: [86, 140, 60] });

// espécie -> nome, id do item, paleta de folha, altura do tronco, chão onde pega
const SAPLING_SPECIES = {
  oak:        { name: 'Muda de carvalho',        id: 400, art: 'leaf', h: [5, 9] },
  birch:      { name: 'Muda de bétula',          id: 271, art: 'leaf', h: [6, 9], stem: [214, 210, 196] },
  maple:      { name: 'Muda de bordo',           id: 272, art: 'leaf', h: [5, 9] },
  apple:      { name: 'Muda de macieira',        id: 273, art: 'leaf', h: [5, 8], fruit: [200, 50, 40] },
  blossom:    { name: 'Muda de cerejeira',       id: 274, art: 'leaf', h: [5, 8] },
  willow:     { name: 'Muda de salgueiro',       id: 275, art: 'willow', h: [5, 8] },
  pine:       { name: 'Muda de pinheiro',        id: 276, art: 'pine', h: [6, 10] },
  snowPine:   { name: 'Muda de pinheiro nevado', id: 277, art: 'pine', h: [6, 10], snow: true },
  frostBirch: { name: 'Muda de bétula do gelo',  id: 278, art: 'leaf', h: [5, 9], stem: [214, 210, 196] },
  jungle:     { name: 'Muda da selva',           id: 279, art: 'leaf', h: [8, 14] },
  palm:       { name: 'Muda de coqueiro',        id: 280, art: 'palm', h: [5, 8], sand: true },
  acacia:     { name: 'Muda de acácia',          id: 281, art: 'acacia', h: [4, 6] },
  sakura:     { name: 'Muda de sakura',          id: 282, art: 'leaf', h: [5, 8] },
  sky:        { name: 'Muda celeste',            id: 283, art: 'leaf', h: [5, 8] },
};
const SAPLING_LEAF_PAL = { pine: 'jungle', snowPine: 'frostBirch', palm: 'jungle', sakura: 'blossom', sky: 'willow' };
const SAPLING_BY_ITEM = new Map();
for (const [key, s] of Object.entries(SAPLING_SPECIES)) {
  ITEM['SAPLING_' + key.toUpperCase()] = s.id;
  defItem(s.id, { name: s.name, place: TILE.SAPLING, muda: key, descricao: 'Plante num chão de terra, grama, neve ou areia com espaço em cima. Em alguns minutos vira árvore (mais rápido na chuva).' });
  SAPLING_BY_ITEM.set(s.id, key);
}
const saplingPal = (key) => {
  const pal = ORGANIC_LEAVES[SAPLING_LEAF_PAL[key] || key] || ORGANIC_LEAVES.oak;
  return key === 'sky' ? [[40, 110, 110], [70, 160, 150], [130, 220, 200], [190, 250, 230]] : [pal[2], pal[3], pal[4], pal[5]];
};

// ---------- Desenho: o mesmo molde vira o ícone e a muda plantada ----------
const SAPLING_SHAPES = {
  leaf: ['................', '................', '.......aa.......', '.....abbca......', '....abccbba.....', '...abcbbcca.....', '....abbcba.aa...',
         '......as..abcca.', '..aa...s.abccba.', '.abca..s..aaa...', '.abbcass........', '..aaa..s........', '.......s........'],
  willow: ['................', '......aaaa......', '....abccbba.....', '...abcbbccba....', '..ab.bs.cb.ba...', '..a..bs..b..a...', '..b..as..a..b...',
           '..a...s..a..a...', '......s.........', '......s.........', '......s.........', '......s.........', '.......s........'],
  pine: ['................', '.......a........', '......aba.......', '.....abcba......', '......aba.......', '....abccbba.....', '...abcbccbba....',
         '.....abbba......', '...abbccbcba....', '..abbcbcbbcba...', '......s.........', '......s.........', '......s.........'],
  palm: ['................', '................', '..aa......aa....', '.abba....abba...', 'ab..bba.abb..ba.', 'a.....bccb....a.', '.....abccba.....',
         '....ab.ss.ba....', '...a...s...a....', '.......s........', '.......s........', '......s.........', '......s.........'],
  acacia: ['................', '................', '................', '..aabbbbbbaa....', '.abbccccccbba...', '..aabbsbbaa.....', '......s.........',
           '.....s.s........', '....s...s.......', '.......s........', '.......s........', '.......s........', '.......s........'],
};
function saplingPixels(key, withSoil) {
  const sp = SAPLING_SPECIES[key], rows = SAPLING_SHAPES[sp.art].slice();
  if (sp.fruit) rows[5] = rows[5].replace('cc', 'cf');
  if (sp.snow) { rows[1] = rows[1].replace('a', 'w'); rows[3] = rows[3].replace('abcba', 'awwwa'); rows[5] = rows[5].replace('bcc', 'www'); }
  while (rows.length < 13) rows.push('................');
  return withSoil ? [...rows, '.....dddddd.....', '....dDDDDDDd....', '................'] : [...rows, '................', '................', '................'];
}
function saplingColors(key) {
  const sp = SAPLING_SPECIES[key], [a, b, c, d] = saplingPal(key);
  return { a, b, c: d, s: sp.stem || [104, 74, 46], f: sp.fruit || d, w: [236, 242, 246], d: [92, 62, 38], D: [128, 90, 56] };
}
for (const key of Object.keys(SAPLING_SPECIES)) ITEM_ART[SAPLING_SPECIES[key].id] = { cores: saplingColors(key), pixels: saplingPixels(key, true) };

const SAPLING_SPRITES = new Map();
function saplingSprite(key, small) {
  const k = key + (small ? ':s' : '');
  if (SAPLING_SPRITES.has(k)) return SAPLING_SPRITES.get(k);
  const c = makeCanvas(T, T), p = c.getContext('2d'), cols = saplingColors(key), rows = saplingPixels(key, false);
  // broto: só a metade de baixo da muda, encolhida
  const y0 = small ? 6 : 0;
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.' || !cols[ch]) return;
    const yy = small ? Math.round(y0 + y * 0.6) : y + 3;
    if (yy >= T) return;
    p.fillStyle = `rgb(${cols[ch].join(',')})`; p.fillRect(small ? Math.round(4 + x * 0.6) : x, yy, 1, 1);
  }));
  SAPLING_SPRITES.set(k, c);
  return c;
}
TILE_DRAW[TILE.SAPLING] = (ctx, world, x, y) => {
  const s = world.saplings?.get(y * world.w + x), key = s?.species || 'oak';
  const sway = Math.round(Math.sin(performance.now() / 700 + x) * 0.6);
  ctx.drawImage(saplingSprite(key, s && s.age < s.grow * 0.4), x * T + sway, y * T);
};

// ---------- Que espécie é a árvore desta coluna ----------
function treeSpeciesAt(x, biome, worldSeed = 0) {
  const planted = typeof world !== 'undefined' && world?.treeSpecies?.get(x);
  if (planted) return planted;
  if (typeof skyWorld === 'function' && skyWorld()?.skyTreeCols?.has(x)) return 'sky';
  const h = hash2(x, 1, worldSeed ^ 4242);
  if (biome === BIOME.OCEAN) return 'palm';
  if (biome === BIOME.SAKURA) return 'sakura';
  if (biome === BIOME.SAVANNA) return 'acacia';
  if (biome === BIOME.SNOW) return h < 0.75 ? 'snowPine' : 'frostBirch';
  if (biome === BIOME.JUNGLE) return h < 0.84 ? 'jungle' : 'palm';
  if (h < 0.14) return 'pine';
  return h < 0.44 ? 'oak' : h < 0.56 ? 'birch' : h < 0.72 ? 'maple' : h < 0.8 ? 'apple' : h < 0.94 ? 'blossom' : 'willow';
}
const plantedCanopies = new Map();
function canopyOfSpecies(key, x, worldSeed) {
  const ck = key + ':' + x + ':' + worldSeed;
  if (plantedCanopies.has(ck)) return plantedCanopies.get(ck);
  const seed = Math.floor(hash2(x, 99, worldSeed ^ 0x5a91) * 0x7fffffff);
  const tree = key === 'pine' ? generateOrganicPine(seed) : key === 'snowPine' ? generateOrganicPine(seed, true) : key === 'palm' ? genPalm(seed)
    : key === 'acacia' ? generateOrganicAcacia(seed) : key === 'sky' ? skyCanopyFor(x, worldSeed) : generateOrganicCanopy(seed, key);
  plantedCanopies.set(ck, tree);
  if (plantedCanopies.size > 64) plantedCanopies.delete(plantedCanopies.keys().next().value);
  return tree;
}
{
  // A copa de uma árvore plantada sai da espécie dela, não do bioma da coluna
  const baseCanopy = canopyFor;
  canopyFor = (x, biome, worldSeed = 0) => {
    const planted = typeof world !== 'undefined' && world?.treeSpecies?.get(x);
    return planted ? canopyOfSpecies(planted, x, worldSeed) : baseCanopy(x, biome, worldSeed);
  };
}

// ---------- Plantar ----------
const SAPLING_SOIL = new Set([TILE.GRASS, TILE.DIRT, TILE.JUNGLE_GRASS, TILE.DRY_GRASS, TILE.SNOW, TILE.SAKURA_GRASS, TILE.MUD, TILE.SAND].filter((t) => t != null));
const isWood = (t) => t === TILE.TRUNK || t === TILE.STUMP || t === TILE.SAPLING;
// '' = pode; senão o motivo
function saplingSpotProblem(w, tx, ty) {
  if (!w.inBounds(tx, ty) || w.getTile(tx, ty) !== TILE.AIR) return 'ocupado';
  if (!SAPLING_SOIL.has(w.getTile(tx, ty + 1))) return 'A muda só pega em terra, grama, neve ou areia.';
  if (w.hasWater?.(tx, ty)) return 'Debaixo d’água a muda não pega.';
  for (const dx of [-1, 1]) for (let y = ty - 3; y <= ty + 1; y++) if (isWood(w.getTile(tx + dx, y))) return 'Colada em outra árvore não cresce: deixe um bloco de espaço.';
  for (let y = ty - 1; y >= ty - 3; y--) if (w.isSolid(tx, y)) return 'A muda precisa de pelo menos 3 blocos livres em cima.';
  return '';
}
// tryPlace e removeTile são de js/game.js, que carrega depois deste arquivo
window.addEventListener('DOMContentLoaded', () => {
  const basePlace = tryPlace;
  tryPlace = function (tx, ty) {
    const slot = game.inventory.slots[game.selected], key = slot && SAPLING_BY_ITEM.get(slot.item);
    if (!key) return basePlace(tx, ty);
    const w = world, why = saplingSpotProblem(w, tx, ty);
    if (why) { if (why !== 'ocupado' && performance.now() - (game.saplingHintAt || 0) > 1500) { game.saplingHintAt = performance.now(); toast(why); } return false; }
    w.setTile(tx, ty, TILE.SAPLING);
    (w.saplings ??= new Map()).set(ty * w.w + tx, { x: tx, y: ty, species: key, age: 0, grow: SAPLING.cresce[0] + Math.random() * (SAPLING.cresce[1] - SAPLING.cresce[0]) });
    game.inventory.takeFromSlot(game.selected);
    playSfx('place', (tx + 0.5) * T, (ty + 0.5) * T, { tile: TILE.GRASS });
    return true;
  };
  // Arrancar a muda devolve ela mesma
  const baseRemove = removeTile;
  removeTile = function (tx, ty) {
    const w = world;
    if (w.getTile(tx, ty) === TILE.SAPLING) {
      const s = w.saplings?.get(ty * w.w + tx);
      w.saplings?.delete(ty * w.w + tx);
      giveItem(SAPLING_SPECIES[s?.species || 'oak'].id, 1);
      spawnBreakBurst(tx, ty, TILE.SAPLING);
      w.setTile(tx, ty, TILE.AIR);
      return;
    }
    return baseRemove(tx, ty);
  };
});

// ---------- Crescer ----------
function growSapling(g, s) {
  const w = g.world, sp = SAPLING_SPECIES[s.species];
  // cresce até onde der: precisa do tronco mínimo + espaço da copa
  let room = 0;
  while (room < sp.h[1] + SAPLING.folgaCopa && w.inBounds(s.x, s.y - room) && !w.isSolid(s.x, s.y - room) && (room === 0 || w.getTile(s.x, s.y - room) === TILE.AIR)) room++;
  const want = sp.h[0] + Math.floor(hash2(s.x, s.y, 313) * (sp.h[1] - sp.h[0] + 1));
  const height = Math.min(want, room - SAPLING.folgaCopa);
  if (height < sp.h[0] - 1) return false; // sem espaço: espera (o jogador pode abrir caminho)
  (w.treeSpecies ??= new Map()).set(s.x, s.species);
  for (let i = 0; i < height; i++) w.setTile(s.x, s.y - i, TILE.TRUNK);
  if (typeof shedLeaves === 'function') shedLeaves(g, s.x, s.y - height + 1, 14);
  playSfx('place', (s.x + 0.5) * T, (s.y + 0.5) * T, { tile: TILE.LEAVES ?? TILE.GRASS, vol: 0.4 });
  return true;
}
function updateSaplings(g, dt) {
  const w = g.world, list = w.saplings;
  if (!list?.size) return;
  for (const [k, s] of list) {
    if (w.getTile(s.x, s.y) !== TILE.SAPLING) { list.delete(k); continue; }
    if (!SAPLING_SOIL.has(w.getTile(s.x, s.y + 1))) { list.delete(k); w.setTile(s.x, s.y, TILE.AIR); dropItem(g, SAPLING_SPECIES[s.species].id, 1, (s.x + 0.5) * T, (s.y + 0.5) * T); continue; }
    const rain = (g.weather?.rain || 0) > 0.2 && typeof weatherExposed === 'function' && weatherExposed(w, (s.x + 0.5) * T, s.y * T);
    s.age += dt * (rain ? SAPLING.chuva : 1);
    if (s.age >= s.grow) {
      if (growSapling(g, s)) list.delete(k);
      else s.age = s.grow - 10; // tenta de novo daqui a pouco
    }
  }
}
{
  const baseDrops = updateDrops;
  updateDrops = function (g, dt) { baseDrops(g, dt); updateSaplings(g, dt); };
}

// ---------- A árvore que tomba solta mudas da espécie dela ----------
{
  const baseFall = startTreeFall;
  startTreeFall = function (g, tx, ty) {
    const w = g.world, wood = isWoodColumn(w.getTile(tx, ty));
    let top = ty;
    if (wood) while (isWoodColumn(w.getTile(tx, top - 1))) top--;
    const species = wood && w.getTile(tx, top) === TILE.TRUNK ? treeSpeciesAt(tx, w.biomeAt(tx), w.seed) : null;
    const before = (g.fallingTrees ??= []).length;
    baseFall(g, tx, ty);
    const f = g.fallingTrees[before];
    if (f && species && f.canopy) f.saplingSpecies = species;
    // a coluna não tem mais árvore inteira: a espécie plantada pode ser esquecida
    if (wood && !isWoodColumn(w.getTile(tx, ty + 1))) w.treeSpecies?.delete(tx);
  };
  const baseLand = landTree;
  landTree = function (g, f) {
    baseLand(g, f);
    if (!f.saplingSpecies) return;
    const s = Math.sin(f.angle), c = Math.cos(f.angle), tipX = f.pivotX + f.dir * s * f.n * T, tipY = f.pivotY - c * f.n * T;
    const n = 1 + (Math.random() < SAPLING.segundaMuda ? 1 : 0);
    dropItem(g, SAPLING_SPECIES[f.saplingSpecies].id, n, tipX, tipY - 12, (Math.random() - 0.5) * 0.6);
  };
}
