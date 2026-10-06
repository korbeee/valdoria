'use strict';

// =====================================================================================
//  ARQUIPÉLAGO DOS VIGIAS — blocos, itens, arte e receitas
// =====================================================================================
// Lá no alto, por cima de toda a ilha, flutua o que sobrou da cidade dos Vigias do Céu:
// ilhas de pedra-celeste com grama clara, nuvens em que dá para pisar, ruínas de mármore
// com vitrais e observatórios, e os ninhos das aves da tempestade. js/sky-world.js monta,
// js/sky-life.js dá vida (vento, planador, bichos, paisagem) e js/sky-boss.js guarda o
// Olho da Tempestade.
// IDs continuam depois do Coração (js/core-tiles.js: blocos até 128 e a textura 129;
// itens até 224; paredes até 17).
// Lembrete: o hash2 global (js/character.js) ignora a semente, então a variação daqui vem de
// deslocar as coordenadas, nunca de trocar a semente.

// 129 é só a textura do fundo da rocha profunda (js/core-tiles.js), mas as tabelas de blocos não
// aceitam buracos: fica registrado como um bloco que nunca aparece no mundo
defTile(129, { name: 'Fundo de rocha profunda', hardness: Infinity, color: [80, 66, 92] });
Object.assign(TILE, {
  SKY_GRASS: 130, SKY_SOIL: 131, SKYSTONE: 132, CLOUD: 133, RAIN_CLOUD: 134, MARBLE: 135, MARBLE_PILLAR: 136,
  VITRAL: 137, TWIG_NEST: 138, WIND_CRYSTAL: 139, SKY_FLOWER: 140, WIND_ALTAR: 141, MARBLE_GOLD: 142,
});
Object.assign(ITEM, {
  SKY_SOIL: 225, SKYSTONE: 226, CLOUD: 227, RAIN_CLOUD: 228, MARBLE: 229, MARBLE_PILLAR: 230, VITRAL: 231,
  TWIG_NEST: 232, WIND_CRYSTAL: 233, SKY_FLOWER: 234, FEATHER: 235, CLOUD_ESSENCE: 236, GLIDER: 237,
  CLOUD_BOTTLE: 238, SKY_EGG: 239, SKY_OMELET: 240, WALL_SKYSTONE: 241, WALL_MARBLE: 242, MARBLE_GOLD: 243,
});

defTile(TILE.SKY_GRASS,    { name: 'Grama celeste', hardness: 0.3, drop: ITEM.SKY_SOIL, ferramenta: 'pa', color: [132, 214, 178] });
defTile(TILE.SKY_SOIL,     { name: 'Terra celeste', hardness: 0.3, drop: ITEM.SKY_SOIL, ferramenta: 'pa', color: [150, 116, 124] });
defTile(TILE.SKYSTONE,     { name: 'Pedra-celeste', hardness: 0.8, drop: ITEM.SKYSTONE, ferramenta: 'picareta', color: [148, 154, 196] });
// Nuvem: segura quem vem de cima (como a plataforma), deixa a luz passar e se desmancha fácil
defTile(TILE.CLOUD,        { name: 'Nuvem', solid: false, plataforma: true, hardness: 0.15, drop: ITEM.CLOUD, ferramenta: 'pa', opacity: 1, color: [236, 242, 252] });
defTile(TILE.RAIN_CLOUD,   { name: 'Nuvem de chuva', solid: false, plataforma: true, hardness: 0.2, drop: ITEM.RAIN_CLOUD, ferramenta: 'pa', opacity: 1, color: [150, 160, 182] });
defTile(TILE.MARBLE,       { name: 'Mármore dos Vigias', hardness: 1, drop: ITEM.MARBLE, ferramenta: 'picareta', reto: true, color: [226, 224, 232] });
defTile(TILE.MARBLE_GOLD,  { name: 'Mármore com friso de ouro', hardness: 1, drop: ITEM.MARBLE_GOLD, ferramenta: 'picareta', reto: true, color: [232, 214, 160] });
defTile(TILE.MARBLE_PILLAR,{ name: 'Coluna de mármore', solid: false, hardness: 0.8, drop: ITEM.MARBLE_PILLAR, ferramenta: 'picareta', opacity: 1, color: [214, 212, 222] });
defTile(TILE.VITRAL,       { name: 'Vitral', hardness: 0.3, drop: ITEM.VITRAL, opacity: 1, reto: true, color: [120, 170, 210] });
defTile(TILE.TWIG_NEST,    { name: 'Ninho de gravetos', hardness: 0.35, drop: ITEM.STICK, ferramenta: 'machado', color: [132, 96, 58] });
defTile(TILE.WIND_CRYSTAL, { name: 'Cristal-de-vento', hardness: 1.2, drop: ITEM.WIND_CRYSTAL, ferramenta: 'picareta', color: [120, 224, 236] }); // o brilho sai por cima, à noite (js/sky-life.js)
defTile(TILE.SKY_FLOWER,   { name: 'Flor-do-vento', solid: false, hardness: 0.1, drop: ITEM.SKY_FLOWER, opacity: 1, light: 4, semBrilho: true, apoio: 'chao', color: [170, 220, 255] });
// Pedra dos Ventos: receita, mineração e ativação da estrutura em js/wind-altars.js.
defTile(TILE.WIND_ALTAR,   { name: 'Pedra dos Ventos', hardness: Infinity, reto: true, light: 9, color: [90, 150, 170] });

for (const key of ['SKY_SOIL', 'SKYSTONE', 'CLOUD', 'RAIN_CLOUD', 'MARBLE', 'MARBLE_GOLD', 'MARBLE_PILLAR', 'VITRAL', 'TWIG_NEST', 'SKY_FLOWER'])
  defItem(ITEM[key], { name: TILE_DEFS[TILE[key]].name, place: TILE[key] });
defItem(ITEM.WIND_CRYSTAL, { name: 'Cristal-de-vento', place: TILE.WIND_CRYSTAL, descricao: 'Pedra leve que zumbe com o vento. Os Vigias a usavam em lâmpadas e garrafas de nuvem.' });
defItem(ITEM.FEATHER, { name: 'Pena', descricao: 'Pena comprida das aves do céu. Boa para flechas e para uma asa-delta.' });
defItem(ITEM.CLOUD_ESSENCE, { name: 'Essência de nuvem', descricao: 'Um fiapo de nuvem que não se desfaz. Engarrafado, segura um pulo no ar.' });
defItem(ITEM.SKY_EGG, { name: 'Ovo celeste', cura: 14, descricao: 'Ovo grande e azulado dos ninhais do céu. Cozido rende muito mais.' });
defItem(ITEM.SKY_OMELET, { name: 'Omelete celeste', cura: 55, descricao: 'Um ovo celeste inteiro numa frigideira. Alimenta por um dia.' });
// Asa-delta: segurando o pulo no ar, cai devagar e anda mais rápido (js/sky-life.js)
defItem(ITEM.GLIDER, {
  name: 'Asa-delta de penas', acessorio: { planar: true }, planar: { queda: 74, velocidade: 250 }, maxStack: 1,
  descricao: 'No cinto: segure o pulo no ar para planar. Cai devagar e vai longe.',
});
// Nuvem engarrafada: um pulo extra no ar
defItem(ITEM.CLOUD_BOTTLE, {
  name: 'Nuvem engarrafada', acessorio: { pulos: 1 }, pulos: 1, maxStack: 1,
  descricao: 'No cinto: aperte o pulo no ar para dar mais um pulo, num sopro de nuvem.',
});

// Paredes de fundo do céu
for (const [key, tile, id, name] of [['SKYSTONE', 'SKYSTONE', 18, 'Parede de pedra-celeste'], ['MARBLE', 'MARBLE', 19, 'Parede de mármore']]) {
  WALL[key] = id;
  WALL_SOURCE[id] = TILE[tile];
  WALL_ITEM[id] = ITEM['WALL_' + key];
  defItem(ITEM['WALL_' + key], { name, parede: id });
}

// ---------- Paleta ----------
const SKY_PAL = {
  stone: [[70, 72, 112], [102, 106, 148], [136, 142, 186], [168, 176, 214], [206, 212, 240]],
  quartz: [[220, 228, 252], [244, 248, 255]],
  grass: [[204, 252, 222], [138, 226, 184], [92, 184, 156]], grassEdge: [44, 112, 108],
  soil: [[94, 66, 84], [120, 88, 104], [146, 110, 120], [170, 132, 136]],
  marble: { ol: [120, 116, 140], dk: [176, 172, 192], md: [214, 212, 224], lt: [234, 232, 240], hi: [252, 250, 255] },
  gold: [[150, 98, 34], [214, 160, 64], [246, 210, 120], [255, 240, 190]],
  crystal: [[30, 80, 104], [60, 150, 180], [120, 220, 236], [214, 252, 255]],
  cloud: [[156, 170, 206], [192, 204, 232], [222, 230, 248], [242, 246, 255], [255, 255, 255]],
  rain: [[78, 86, 108], [104, 114, 138], [132, 142, 166], [160, 170, 192], [186, 196, 214]],
  twig: [[54, 36, 22], [86, 60, 36], [122, 88, 54], [160, 120, 76], [196, 156, 104]],
};
const skyHash = (x, y, k) => hash2((x | 0) + k * 1013, (y | 0) + k * 517);
// Ruído periódico de 64 px (repete sem emenda) com deslocamento por `k`
const skyTexNoise = (x, y, f, k, oct = 2) => pfbm2(x / f + k * 7.31, y / f + k * 3.17, TEX / f, 0, oct);

// Pedra-celeste: blocos lilás-azulados, rachaduras finas e veios de quartzo branco
function genSkystone(seed) {
  const tex = cellRock(seed, [150, 156, 198], [84, 86, 126], 20);
  for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
    const n = skyTexNoise(x, y, 16, 3, 3);
    const c = tex.get(x, y);
    tex.set(x, y, shade(c, 0.92 + n * 0.16));
    // veio: linha fina onde o ruído passa por 0,5
    const v = skyTexNoise(x, y * 0.6, 22, 5, 2);
    if (Math.abs(v - 0.5) < 0.012) tex.set(x, y, SKY_PAL.quartz[(x + y) & 1]);
  }
  const rnd = mulberry32(seed + 7);
  for (let i = 0; i < 18; i++) tex.set(rnd() * TEX, rnd() * TEX, SKY_PAL.quartz[1]);
  return tex;
}

// Terra celeste: barro rosado e macio com pedrinhas lilases
function genSkySoil(seed) {
  const tex = new Tex(), pal = SKY_PAL.soil;
  for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
    const v = skyTexNoise(x, y, 16, 11, 3) + (skyHash(x, y, 12) - 0.5) * 0.14;
    tex.set(x, y, pal[clamp(Math.floor((v - 0.28) * 9), 0, 3)]);
  }
  const rnd = mulberry32(seed + 1);
  for (let i = 0; i < 14; i++) pebble(tex, rnd() * TEX, rnd() * TEX, 1 + rnd() * 1.4, rnd() < 0.5 ? [160, 164, 204] : [186, 150, 150]);
  for (let i = 0; i < 30; i++) tex.set(rnd() * TEX, rnd() * TEX, [74, 50, 66]);
  return tex;
}

// Mármore dos Vigias: blocos brancos de 32 px com bisel, veios cinza que serpenteiam e,
// de vez em quando, um fio de ouro dentro do veio
function genMarble(seed, gold = false) {
  const tex = new Tex(), M = SKY_PAL.marble, G = SKY_PAL.gold;
  for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
    const row = y >> 4, bx = wrap(x + (row & 1) * 16, 32), by = y & 15;
    let c = shade(M.md, 1 + (skyHash(bx >> 5, row, 21) - 0.5) * 0.05 + (skyTexNoise(x, y, 32, 22, 2) - 0.5) * 0.08);
    const v = skyTexNoise(x + y * 0.7, y, 20, 23, 3);
    if (Math.abs(v - 0.5) < 0.016) c = skyHash(x >> 3, y >> 3, 24) < 0.3 ? G[2] : M.dk;
    else if (Math.abs(v - 0.5) < 0.03) c = shade(c, 0.95);
    if (by === 15 || bx === 31) c = M.ol; else if (by === 0 || bx === 0) c = M.hi; else if (by === 14 || bx === 30) c = M.dk;
    tex.set(x, y, c);
  }
  // Friso de ouro: uma faixa com meandro grego no meio de cada fiada
  if (gold) for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
    const by = y & 15;
    if (by < 4 || by > 11) continue;
    const u = x & 7, v = by - 4;
    const key = (v === 0 || v === 7) ? 1 : (u === 0 && v < 6) || (v === 5 && u < 6) || (u === 5 && v > 1 && v < 6) || (v === 2 && u > 1 && u < 6) || (u === 2 && v === 3) ? 2 : 0;
    tex.set(x, y, key === 1 ? G[0] : key === 2 ? G[3] : G[1 + ((x + y) & 1 ? 0 : 1)]);
  }
  return tex;
}

// Cristal-de-vento: pedra-celeste com cachos de cristal ciano que brilham na ponta
function genWindCrystal(seed) {
  const tex = genSkystone(seed), C = SKY_PAL.crystal, rnd = mulberry32(seed + 9);
  for (let k = 0; k < 9; k++) {
    const cx = rnd() * TEX, cy = rnd() * TEX, n = 2 + Math.floor(rnd() * 3);
    for (let j = 0; j < n; j++) {
      const a = -Math.PI / 2 + (rnd() - 0.5) * 1.6, len = 4 + rnd() * 5;
      for (let i = 0; i <= len; i++) {
        const x = cx + Math.cos(a) * i, y = cy + Math.sin(a) * i, wd = Math.max(0, 1.6 - i / len * 1.4);
        for (let d = -wd; d <= wd; d += 0.5) tex.set(x - Math.sin(a) * d, y + Math.cos(a) * d, d < 0 ? C[2] : C[1]);
        if (i === Math.floor(len)) tex.set(x, y, C[3]);
      }
      tex.set(cx, cy, C[0]);
    }
  }
  return tex;
}

// Ninho de gravetos: galhos trançados em diagonal, com penas presas aqui e ali
function genTwigNest(seed) {
  const tex = new Tex(), P = SKY_PAL.twig, rnd = mulberry32(seed);
  for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) tex.set(x, y, P[skyHash(x >> 1, y >> 1, 31) < 0.5 ? 0 : 1]);
  for (let i = 0; i < 70; i++) {
    const x = rnd() * TEX, y = rnd() * TEX, a = (rnd() < 0.5 ? 0.5 : 2.6) + (rnd() - 0.5) * 0.5, len = 8 + rnd() * 14;
    for (let s = 0; s < len; s++) {
      const px = x + Math.cos(a) * s, py = y + Math.sin(a) * s;
      tex.set(px, py, P[3]); tex.set(px, py + 1, P[2]);
      if (s % 5 === 0) tex.set(px, py - 1, P[4]);
    }
  }
  for (let i = 0; i < 6; i++) {
    const x = rnd() * TEX, y = rnd() * TEX;
    for (let s = 0; s < 5; s++) { tex.set(x + s, y - s * 0.5, [236, 240, 250]); tex.set(x + s, y - s * 0.5 + 1, [190, 204, 228]); }
  }
  return tex;
}

// Vitral: chumbo escuro e vidros coloridos (céu, ouro, rosa, violeta) numa rosácea por bloco
function genVitral(seed) {
  const tex = new Tex(), lead = [36, 34, 48];
  const glass = [[96, 170, 220], [236, 196, 92], [214, 108, 140], [140, 110, 210], [110, 210, 190]];
  for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
    const lx = x & 15, ly = y & 15, dx = lx - 7.5, dy = ly - 7.5, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
    const ring = r < 2.5 ? 0 : r < 5.2 ? 1 : 2, petal = Math.floor(((a + Math.PI) / (Math.PI * 2)) * 8);
    let c;
    if (lx === 0 || ly === 0) c = lead;
    else if (Math.abs(r - 2.5) < 0.6 || Math.abs(r - 5.2) < 0.6) c = lead;
    else if (ring > 0 && Math.abs(((a + Math.PI) / (Math.PI * 2)) * 8 - Math.round(((a + Math.PI) / (Math.PI * 2)) * 8)) < 0.1 * (6 / Math.max(r, 1))) c = lead;
    else {
      const g = glass[ring === 0 ? 1 : ring === 1 ? (petal & 1 ? 2 : 3) : ((x >> 4) + (y >> 4) + (petal >> 1)) % 2 ? 0 : 4];
      const lit = (-dx - dy) / 10 + (skyHash(x, y, 33) - 0.5) * 0.08;
      c = shade(g, 0.9 + lit * 0.25);
      if (ring === 2 && (lx === 1 || ly === 1)) c = shade(g, 1.25);
    }
    tex.set(x, y, c);
  }
  return tex;
}

// Pedra dos Ventos: tijolo dos Vigias com uma espiral de vento acesa em cada bloco
function genWindAltar(seed) {
  const tex = genVigiaBrick(seed);
  const C = SKY_PAL.crystal;
  for (let cy = 0; cy < 4; cy++) for (let cx = 0; cx < 4; cx++) {
    const ox = cx * 16 + 8, oy = cy * 16 + 8;
    for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) tex.set(ox + dx, oy + dy, Math.hypot(dx, dy) < 6.3 ? [26, 40, 52] : tex.get(ox + dx, oy + dy));
    for (let t = 0; t < 4.6 * Math.PI; t += 0.12) {
      const r = 0.6 + t * 0.38, x = ox + Math.cos(t) * r, y = oy + Math.sin(t) * r;
      tex.set(x, y, C[t > 3 * Math.PI ? 3 : 2]);
    }
  }
  return tex;
}

// ---------- Enfeites planos (16 px) ----------
function skyFlat(paint) { const tex = new Tex(); paint(tex); return tex; }
const SKY_FLAT = {
  // Flor-do-vento: haste fina curvada pelo vento e uma flor de pétalas azul-claro com miolo aceso
  flower(tex) {
    const stem = [[52, 120, 100], [86, 168, 136]];
    for (const [u, v] of [[8, 15], [8, 14], [8, 13], [7, 12], [7, 11], [7, 10], [8, 9], [8, 8], [9, 7]]) tex.set(u, v, stem[(u + v) & 1]);
    for (const [u, v] of [[6, 13], [5, 12], [9, 12], [10, 11], [11, 11]]) tex.set(u, v, [104, 196, 150]);
    const P = [[110, 150, 220], [170, 210, 255], [226, 242, 255]];
    for (const [u, v, k] of [[9, 3, 2], [8, 4, 1], [10, 4, 1], [7, 5, 0], [11, 5, 0], [8, 6, 1], [10, 6, 1], [9, 7, 1], [12, 4, 0], [6, 4, 0],
      [9, 2, 1], [11, 3, 1], [7, 3, 1]]) tex.set(u, v, P[k]);
    tex.set(9, 5, [255, 246, 200]); tex.set(9, 4, [255, 255, 236]);
  },
  // Coluna de mármore: fuste canelado (o capitel e a base saem no TILE_DRAW)
  pillar(tex) {
    const M = SKY_PAL.marble;
    for (let y = 0; y < TEX; y++) for (let u = 3; u <= 12; u++) {
      const c = u === 3 || u === 12 ? M.ol : u === 4 ? M.hi : u === 11 ? M.dk : (u - 5) % 2 === 0 ? M.lt : M.md;
      tex.set(u, y, (y & 31) === 31 && u > 3 && u < 12 ? M.dk : c);
    }
  },
};

MATERIAL_TEX[TILE.SKY_SOIL] = genSkySoil(2101);
MATERIAL_TEX[TILE.SKY_GRASS] = grassOver(genSkySoil(2102), 2103, SKY_PAL.grass, SKY_PAL.grassEdge);
TOP_COLORS[TILE.SKY_GRASS] = [SKY_PAL.grass[0], SKY_PAL.grass[1]];
MATERIAL_TEX[TILE.SKYSTONE] = genSkystone(2104);
MATERIAL_TEX[TILE.MARBLE] = genMarble(2105);
MATERIAL_TEX[TILE.MARBLE_GOLD] = genMarble(2106, true);
MATERIAL_TEX[TILE.WIND_CRYSTAL] = genWindCrystal(2107);
MATERIAL_TEX[TILE.TWIG_NEST] = genTwigNest(2108);
MATERIAL_TEX[TILE.VITRAL] = genVitral(2109);
MATERIAL_TEX[TILE.WIND_ALTAR] = genWindAltar(2110);
MATERIAL_TEX[TILE.SKY_FLOWER] = skyFlat(SKY_FLAT.flower);
MATERIAL_TEX[TILE.MARBLE_PILLAR] = skyFlat(SKY_FLAT.pillar);
MATERIAL_TEX[TILE.CLOUD] = skyFlat((t) => { for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) t.set(x, y, SKY_PAL.cloud[3]); });
MATERIAL_TEX[TILE.RAIN_CLOUD] = skyFlat((t) => { for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) t.set(x, y, SKY_PAL.rain[3]); });
buildFlatTiles();
FLAT_VERTICAL[TILE.MARBLE_PILLAR] = 1;

// ---------- Nuvens fofas ----------
// Nuvem em pixel art de cúmulo. Cada bloco vira um sprite de 32 px (8 px de folga em volta),
// escolhido pelos vizinhos e pela profundidade dentro do banco:
//  • em cima de bloco aberto nascem dois ou três calombos redondos que sobem até 8 px;
//    dos lados abertos sai um calombo menor; a barriga é mais reta;
//  • o tom vem de quão fundo o bloco está no banco (topo branco, meio claro, barriga azulada),
//    então o banco inteiro é sombreado como uma coisa só, e não bloco a bloco;
//  • a passagem de um tom para o outro é pontilhada (Bayer), sem chiado aleatório.
// 16 combinações de vizinhos x 4 variações x 5 tons, prontas no carregamento.
const CLOUD_M = 8, CLOUD_TONES = 5;
const CLOUD_ART = (() => {
  const make = (pal) => {
    const out = [];
    for (let tone = 0; tone < CLOUD_TONES; tone++) for (let step = 0; step < 2; step++) for (let mask = 0; mask < 16; mask++) for (let v = 0; v < 4; v++) {
      const S = T + CLOUD_M * 2, s = new Sprite(S, S), up = mask & 1, right = mask & 2, down = mask & 4, left = mask & 8;
      const rnd = mulberry32(2201 + mask * 13 + v * 101);
      const balls = [];
      if (up) { const n = 2 + (rnd() < 0.5 ? 1 : 0); for (let i = 0; i < n; i++) balls.push([1.5 + (i + rnd() * 0.8) * (T - 3) / n, 3.5 + rnd() * 2.5, 5.5 + rnd() * 3]); }
      // canto de cima aberto dos dois lados: um "ombro" redondo no lugar do canto reto
      if (up && left) { for (let i = balls.length - 1; i >= 0; i--) if (balls[i][0] < 5) balls.splice(i, 1); balls.push([6.5, 7, 6.5]); }
      else if (left) balls.push([1.5, 8 + (rnd() - 0.5) * 3, 4.5 + rnd() * 2]);
      if (up && right) { for (let i = balls.length - 1; i >= 0; i--) if (balls[i][0] > T - 6) balls.splice(i, 1); balls.push([T - 7.5, 7, 6.5]); }
      else if (right) balls.push([T - 2.5, 8 + (rnd() - 0.5) * 3, 4.5 + rnd() * 2]);
      // corpo: o bloco, com os cantos de baixo arredondados quando estão abertos
      const inBody = (lx, ly) => {
        if (lx < 0 || lx > T - 1 || ly < (up ? 5 : 0) || ly > T - 1 - (down ? 1 : 0)) return false;
        const r = 5, c = (cx, cy) => Math.hypot(lx - cx, ly - cy) <= r;
        if (up && left && lx < 7 && ly < 7 && !c(7, 7)) return false;
        if (up && right && lx > T - 8 && ly < 7 && !c(T - 8, 7)) return false;
        if (down && left && lx < r && ly > T - 1 - r && !c(r, T - 1 - r)) return false;
        if (down && right && lx > T - 1 - r && ly > T - 1 - r && !c(T - 1 - r, T - 1 - r)) return false;
        return true;
      };
      const inside = (lx, ly) => inBody(lx, ly) || balls.some(([bx, by, br]) => Math.hypot(lx - bx, ly - by) <= br);
      // para achar a beirada, o bloco vizinho que também é nuvem conta como dentro
      const inCell = (u) => u >= 0 && u <= T - 1;
      const solidAround = (lx, ly) => inside(lx, ly) || (!down && ly >= T && inCell(lx)) || (!up && ly < 0 && inCell(lx)) ||
        (!left && lx < 0 && inCell(ly)) || (!right && lx > T - 1 && inCell(ly));
      // tom do bloco: 0 = topo (mais claro) ... 4 = barriga
      const base = 3.5 - tone * 0.55;
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        const lx = x - CLOUD_M, ly = y - CLOUD_M;
        if (!inside(lx, ly)) continue;
        // dentro do bloco o tom desce devagar até o do bloco de baixo
        let k = base - clamp(ly / T, 0, 1) * 0.55 * step;
        if (down) k -= clamp((ly - 8) / 7, 0, 1) * 0.7;
        for (const [bx, by, br] of balls) {
          const dx = (lx - bx) / br, dy = (ly - by) / br, d2 = dx * dx + dy * dy;
          if (d2 > 1) continue;
          const lam = Math.max(0, -0.45 * dx - 0.7 * dy + 0.55 * Math.sqrt(1 - d2));
          k = Math.max(k, base - 0.9 + lam * 2.2);
        }
        if (!solidAround(lx, ly + 1)) k -= 0.9;            // beirada de baixo mais escura
        else if (!solidAround(lx, ly - 1)) k += 0.7;       // fio de luz no topo
        k += (BAYER4[(y & 3) * 4 + (x & 3)] / 16 - 0.47) * 0.9;
        s.set(x, y, pal[clamp(Math.round(k), 0, 4)]);
      }
      out.push(s.finish(null));
    }
    return out;
  };
  return { white: make(SKY_PAL.cloud), rain: make(SKY_PAL.rain) };
})();
const isCloudTile = (t) => t === TILE.CLOUD || t === TILE.RAIN_CLOUD;
function drawCloudTile(ctx, world, x, y) {
  const t = world.getTile(x, y), same = (tx, ty) => isCloudTile(world.getTile(tx, ty));
  const mask = (same(x, y - 1) ? 0 : 1) | (same(x + 1, y) ? 0 : 2) | (same(x, y + 1) ? 0 : 4) | (same(x - 1, y) ? 0 : 8);
  // profundidade no banco: quantos blocos de nuvem em cima e embaixo
  let above = 0, below = 0;
  while (above < 4 && same(x, y - 1 - above)) above++;
  while (below < 3 && same(x, y + 1 + below)) below++;
  const toneAt = (a, b) => clamp(Math.min(a, 2) + Math.max(0, 2 - b), 0, CLOUD_TONES - 1);
  const tone = toneAt(above, below), step = below > 0 && toneAt(above + 1, below - 1) > tone ? 1 : 0;
  const img = (t === TILE.RAIN_CLOUD ? CLOUD_ART.rain : CLOUD_ART.white)[((tone * 2 + step) * 16 + mask) * 4 + Math.floor(skyHash(x, y, 43) * 4)];
  ctx.drawImage(img, x * T - CLOUD_M, y * T - CLOUD_M);
}
TILE_DRAW[TILE.CLOUD] = (ctx, world, x, y) => drawCloudTile(ctx, world, x, y);
TILE_DRAW[TILE.RAIN_CLOUD] = (ctx, world, x, y) => drawCloudTile(ctx, world, x, y);

// ---------- Coluna de mármore: capitel e base ----------
const PILLAR_ART = (() => {
  const M = SKY_PAL.marble, G = SKY_PAL.gold;
  const cap = new Sprite(22, 7), base = new Sprite(20, 5);
  // capitel: ábaco largo, volutas nas pontas e um fio de ouro
  for (let x = 0; x < 22; x++) { cap.set(x, 0, M.ol); cap.set(x, 1, M.hi); cap.set(x, 2, M.lt); cap.set(x, 3, x < 1 || x > 20 ? M.ol : G[2]); }
  for (let x = 2; x < 20; x++) { cap.set(x, 4, M.md); cap.set(x, 5, M.dk); cap.set(x, 6, M.ol); }
  for (const vx of [2, 19]) { cap.set(vx, 4, M.ol); cap.set(vx, 5, M.hi); cap.set(vx + (vx < 10 ? 1 : -1), 5, M.ol); }
  for (let x = 0; x < 20; x++) { base.set(x, 0, M.ol); base.set(x, 1, M.hi); base.set(x, 2, M.lt); base.set(x, 3, M.dk); base.set(x, 4, M.ol); }
  return { cap: cap.finish(null), base: base.finish(null) };
})();
TILE_DRAW[TILE.MARBLE_PILLAR] = (ctx, world, x, y) => {
  const flat = typeof renderer !== "undefined" ? renderer.tex?.flat?.[TILE.MARBLE_PILLAR] : null;
  if (flat) ctx.drawImage(flat, 0, (y & 3) * T, T, T, x * T, y * T, T, T);
  if (world.getTile(x, y - 1) !== TILE.MARBLE_PILLAR) ctx.drawImage(PILLAR_ART.cap, x * T - 3, y * T - 1);
  if (world.getTile(x, y + 1) !== TILE.MARBLE_PILLAR) ctx.drawImage(PILLAR_ART.base, x * T - 2, y * T + T - 5);
};

// ---------- Ícones dos itens que não são bloco ----------
Object.assign(ITEM_ART, {
  [ITEM.FEATHER]: {
    cores: { k: [40, 48, 72], a: [252, 252, 255], b: [206, 222, 246], c: [140, 160, 200], s: [120, 110, 100] },
    pixels: ['................', '.............kk.', '............kak.', '...........kabk.', '..........kaabk.', '.........kaabk..', '........kaabck..', '.......kaabck...',
      '......kaabck....', '.....kaabck.....', '....kaabck......', '...kabcck.......', '...kbcck........', '..ks.kk.........', '.ks.............', 'ks..............'],
  },
  [ITEM.CLOUD_ESSENCE]: {
    cores: { k: [70, 84, 120], a: [255, 255, 255], b: [214, 224, 250], c: [160, 220, 250], d: [120, 250, 255] },
    pixels: ['................', '................', '.....kkkk.......', '...kkaaaakk.....', '..kaaabbaaak....', '..kabbbbbbak.kk.', '.kaabbccbbaakaak', '.kabbcddcbbbaabk',
      '.kabbcddcbbbbbbk', '..kabbccbbbbbbk.', '...kkbbbbbbbkk..', '.....kkkkkkk....', '.........d......', '........ddd.....', '.........d......', '................'],
  },
  [ITEM.GLIDER]: {
    cores: { k: [40, 44, 70], a: [252, 252, 255], b: [214, 226, 248], c: [110, 160, 220], h: [120, 80, 44], H: [170, 120, 70] },
    pixels: ['................', '.......kk.......', '......kaak......', '.....kaabak.....', '....kaabcbak....', '...kaabbcbbak...', '..kaabbccbbbak..', '.kaabbcccbbbbak.',
      'kkkkkkkkkkkkkkkk', '.......hH.......', '......h..h......', '.....h....h.....', '....hHHHHHHh....', '................', '................', '................'],
  },
  [ITEM.CLOUD_BOTTLE]: {
    cores: { k: [40, 50, 70], g: [150, 200, 220], G: [210, 240, 250], c: [140, 100, 60], C: [190, 150, 100], a: [255, 255, 255], b: [214, 226, 250] },
    pixels: ['................', '......cCc.......', '......cCc.......', '......kkk.......', '......kgk.......', '.....kgGgk......', '....kgGabgk.....', '...kgabbaagk....',
      '...kGaabbbgk....', '...kgbaaabgk....', '...kgabbbagk....', '...kGgaaaggk....', '....kggggk......', '.....kkkk.......', '................', '................'],
  },
  [ITEM.SKY_EGG]: {
    cores: { k: [50, 60, 90], a: [214, 236, 250], b: [170, 206, 236], c: [120, 160, 210], s: [90, 110, 170] },
    pixels: ['................', '......kkkk......', '.....kaaaak.....', '....kaaaaabk....', '...kaaasaabbk...', '...kaaaaaabbk...', '..kaasaaaabbbk..', '..kaaaaaasabbk..',
      '..kaaaaaaabbck..', '..kbaasaaabbck..', '..kbbaaaabbcck..', '...kbbbbbbcck...', '....kccccccck...', '.....kkkkkkk....', '................', '................'],
  },
  [ITEM.SKY_OMELET]: {
    cores: { k: [60, 50, 40], p: [220, 220, 230], P: [170, 170, 186], y: [250, 210, 80], Y: [255, 236, 150], o: [220, 160, 50], g: [110, 200, 140] },
    pixels: ['................', '................', '................', '................', '....kkkkkkkk....', '..kkoyyYyyyokk..', '.koyyYYyyygyyok.', 'kpoyyyyyygyyyopk',
      'kpPoyyyyyyyyoPpk', 'kpPPooooooooPPpk', '.kpPPPPPPPPPPpk.', '..kkppppppppkk..', '....kkkkkkkk....', '................', '................', '................'],
  },
});

// ---------- Receitas ----------
RECIPES.push(
  { nome: 'Asa-delta de penas', ingredientes: [[ITEM.FEATHER, 12], [ITEM.STICK, 4], [ITEM.CLOTH, 3]], resultado: { item: ITEM.GLIDER, quantidade: 1 } },
  { nome: 'Asa-delta de penas (teia)', ingredientes: [[ITEM.FEATHER, 12], [ITEM.STICK, 4], [ITEM.SILK, 4]], resultado: { item: ITEM.GLIDER, quantidade: 1 } },
  { nome: 'Nuvem engarrafada', ingredientes: [[ITEM.CLOUD_ESSENCE, 6], [ITEM.GLASS, 1], [ITEM.WIND_CRYSTAL, 1]], resultado: { item: ITEM.CLOUD_BOTTLE, quantidade: 1 } },
  { nome: 'Nuvem', ingredientes: [[ITEM.CLOUD_ESSENCE, 1]], resultado: { item: ITEM.CLOUD, quantidade: 8 } },
  { nome: 'Flechas de pena', ingredientes: [[ITEM.FEATHER, 1], [ITEM.STICK, 2], [ITEM.STONE, 1]], resultado: { item: ITEM.ARROW, quantidade: 10 } },
  { nome: 'Omelete celeste', ingredientes: [[ITEM.SKY_EGG, 1], [ITEM.COAL, 1]], resultado: { item: ITEM.SKY_OMELET, quantidade: 1 } },
  { nome: 'Vitral', ingredientes: [[ITEM.GLASS, 3], [ITEM.WIND_CRYSTAL, 1]], resultado: { item: ITEM.VITRAL, quantidade: 4 } },
  { nome: 'Vitral (ametista)', ingredientes: [[ITEM.GLASS, 3], [ITEM.AMETHYST, 1]], resultado: { item: ITEM.VITRAL, quantidade: 3 } },
  { nome: 'Coluna de mármore', ingredientes: [[ITEM.MARBLE, 2]], resultado: { item: ITEM.MARBLE_PILLAR, quantidade: 3 } },
  { nome: 'Mármore com friso de ouro', ingredientes: [[ITEM.MARBLE, 4], [ITEM.GOLD, 1]], resultado: { item: ITEM.MARBLE_GOLD, quantidade: 4 } },
  { nome: 'Parede de pedra-celeste', ingredientes: [[ITEM.SKYSTONE, 1]], resultado: { item: ITEM.WALL_SKYSTONE, quantidade: 4 } },
  { nome: 'Parede de mármore', ingredientes: [[ITEM.MARBLE, 1]], resultado: { item: ITEM.WALL_MARBLE, quantidade: 4 } },
  { nome: 'Lampião de cristal-de-vento', ingredientes: [[ITEM.WIND_CRYSTAL, 1], [ITEM.GLASS, 1], [ITEM.METAL_BAR, 1]], resultado: { item: ITEM.LANTERN, quantidade: 3 } },
  { nome: 'Corda (penas)', ingredientes: [[ITEM.FEATHER, 2], [ITEM.FIBER, 2]], resultado: { item: ITEM.ROPE, quantidade: 2 } },
);
