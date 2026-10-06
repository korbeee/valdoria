'use strict';

// =====================================================================================
//  CORAÇÃO DA ILHA — blocos, itens e arte
// =====================================================================================
// O fundo do mundo inteiro, de ponta a ponta, é o Coração da Ilha: rocha profunda com veios
// de magma, mar de lava, basalto em colunas, rochas de magnetita flutuando, máquinas de bronze
// dos Vigias e as costelas fósseis de bichos do tamanho de morros (js/core-world.js monta tudo,
// js/core-life.js dá vida, js/core-boss.js guarda o Núcleo).
// IDs continuam depois das ruínas (js/ruin-tiles.js: blocos até 114, itens até 201;
// js/bucket.js: itens 202-203).

Object.assign(TILE, {
  DEEPSTONE: 115, BASALT: 116, LAVA: 117, MAGNETITE: 118, AMBER: 119, FOSSIL: 120, BRONZE_PLATE: 121,
  RUNE_STONE: 122, GEAR: 123, PIPE: 124, STEAM_VENT: 125, VIGIA_BRICK: 126, CORE_WALL: 127, EMBER_LILY: 128,
});
Object.assign(ITEM, {
  DEEPSTONE: 204, BASALT: 205, MAGNETITE: 206, AMBER: 207, FOSSIL: 208, BRONZE: 209, RUNE_STONE: 210,
  VIGIA_BRICK: 211, EMBER_LILY: 212, SALAMANDER_SCALE: 213, CORE_SHARD: 214, OBSIDIAN_SUIT: 215, MAGNET_BLADE: 216,
  BUCKET_LAVA: 217, WALL_DEEPSTONE: 218, WALL_BASALT: 219, WALL_VIGIA: 220, PIPE: 221, GEAR: 222, STEAM_VENT: 223,
});

defTile(TILE.DEEPSTONE,    { name: 'Rocha profunda', hardness: 1.3, drop: ITEM.DEEPSTONE, ferramenta: 'picareta', color: [56, 46, 62] });
defTile(TILE.BASALT,       { name: 'Basalto', hardness: 1.1, drop: ITEM.BASALT, ferramenta: 'picareta', reto: true, color: [72, 76, 88] });
// Lava: não se cava nem se atravessa sem se queimar (js/core-life.js). Desenho animado próprio.
defTile(TILE.LAVA,         { name: 'Lava', solid: false, hardness: Infinity, light: 15, opacity: 1, semBrilho: true, color: [236, 92, 28] });
defTile(TILE.MAGNETITE,    { name: 'Magnetita', hardness: 1.5, drop: ITEM.MAGNETITE, ferramenta: 'picareta', light: 5, color: [70, 86, 124] });
defTile(TILE.AMBER,        { name: 'Âmbar', hardness: 0.8, drop: ITEM.AMBER, ferramenta: 'picareta', light: 6, opacity: 2, color: [226, 146, 46] });
defTile(TILE.FOSSIL,       { name: 'Osso fóssil', hardness: 1, drop: ITEM.FOSSIL, ferramenta: 'picareta', color: [214, 200, 168] });
defTile(TILE.BRONZE_PLATE, { name: 'Placa de bronze', hardness: 1.6, drop: ITEM.BRONZE, ferramenta: 'picareta', reto: true, color: [168, 116, 58] });
defTile(TILE.RUNE_STONE,   { name: 'Pedra rúnica', hardness: 1.4, drop: ITEM.RUNE_STONE, ferramenta: 'picareta', reto: true, light: 8, color: [60, 120, 126] });
defTile(TILE.GEAR,         { name: 'Engrenagem dos Vigias', solid: false, hardness: 1, drop: ITEM.GEAR, ferramenta: 'picareta', opacity: 1, color: [176, 124, 60] });
defTile(TILE.PIPE,         { name: 'Cano de bronze', solid: false, hardness: 0.6, drop: ITEM.PIPE, ferramenta: 'picareta', opacity: 1, color: [160, 108, 52] });
defTile(TILE.STEAM_VENT,   { name: 'Gêiser de vapor', hardness: 1.2, drop: ITEM.STEAM_VENT, ferramenta: 'picareta', light: 4, reto: true, color: [84, 76, 80] });
defTile(TILE.VIGIA_BRICK,  { name: 'Tijolo dos Vigias', hardness: 1.4, drop: ITEM.VIGIA_BRICK, ferramenta: 'picareta', reto: true, color: [66, 62, 72] });
defTile(TILE.CORE_WALL,    { name: 'Casca do Coração', hardness: Infinity, reto: true, light: 2, color: [40, 30, 40] });
defTile(TILE.EMBER_LILY,   { name: 'Lírio de brasa', solid: false, hardness: 0.1, drop: ITEM.EMBER_LILY, opacity: 1, light: 7, apoio: 'chao', color: [250, 120, 50] });

for (const key of ['DEEPSTONE', 'BASALT', 'MAGNETITE', 'AMBER', 'FOSSIL', 'RUNE_STONE', 'VIGIA_BRICK', 'EMBER_LILY', 'PIPE', 'GEAR', 'STEAM_VENT'])
  defItem(ITEM[key], { name: TILE_DEFS[TILE[key]].name, place: TILE[key] });
defItem(ITEM.BRONZE, { name: 'Bronze dos Vigias', place: TILE.BRONZE_PLATE });
defItem(ITEM.SALAMANDER_SCALE, { name: 'Escama de salamandra' });
defItem(ITEM.CORE_SHARD, { name: 'Estilhaço do Coração' });
// calor: protege do calor da lava (js/core-life.js); a lava em si continua queimando, só menos
defItem(ITEM.OBSIDIAN_SUIT, { name: 'Traje de obsidiana', roupa: { defesa: 0.3, visual: 'obsidian', calor: true }, maxStack: 1 });
defItem(ITEM.MAGNET_BLADE, { name: 'Lâmina de magnetita', dano: 15, rapidez: 1.05, alcance: 26, maxStack: 1 });
defItem(ITEM.BUCKET_LAVA, { name: 'Balde de lava', balde: 'lava', maxStack: 1 });
OUTFIT_JACKETS.obsidian = [[18, 14, 22], [44, 32, 48], [78, 58, 84], [236, 120, 52]];

// Paredes de fundo do Coração
for (const [key, tile, id, name] of [['DEEPSTONE', 'DEEPSTONE', 15, 'Parede de rocha profunda'], ['BASALT', 'BASALT', 16, 'Parede de basalto'], ['VIGIA', 'VIGIA_BRICK', 17, 'Parede dos Vigias']]) {
  WALL[key] = id;
  WALL_SOURCE[id] = TILE[tile];
  WALL_ITEM[id] = ITEM['WALL_' + key];
  defItem(ITEM['WALL_' + key], { name, parede: id });
}

// ---------- Paleta ----------
const CORE_PAL = {
  rock: [[22, 16, 26], [36, 28, 42], [52, 42, 60], [70, 58, 78], [92, 78, 98]],
  vein: [[120, 30, 18], [200, 66, 24], [255, 136, 48], [255, 210, 120]],
  bronze: { ol: [52, 30, 14], dk: [110, 68, 30], md: [168, 116, 58], lt: [214, 162, 88], hi: [246, 214, 150] },
  patina: [[58, 120, 100], [92, 164, 136]],
  rune: [[40, 150, 160], [110, 240, 230], [220, 255, 250]],
  lava: [[90, 14, 10], [150, 30, 12], [214, 70, 20], [250, 130, 34], [255, 196, 70], [255, 240, 170]],
};

// Rocha profunda: blocos de rocha escura arroxeada, rachaduras finas e, de vez em quando, um
// veio de magma brilhando dentro da fenda
function genDeepstone(seed) {
  const tex = cellRock(seed, [74, 62, 82], [24, 18, 28], 24);
  const rnd = mulberry32(seed + 3);
  for (let v = 0; v < 5; v++) {
    let x = rnd() * TEX, y = rnd() * TEX, a = rnd() * Math.PI * 2;
    const len = 6 + Math.floor(rnd() * 12);
    for (let i = 0; i < len; i++) {
      const k = 1 - Math.abs(i / len - 0.5) * 2;
      tex.set(x, y, CORE_PAL.vein[k > 0.6 ? 2 : k > 0.25 ? 1 : 0]);
      if (k > 0.75) tex.set(x, y - 1, CORE_PAL.vein[1]);
      a += (rnd() - 0.5) * 0.9; x += Math.cos(a); y += Math.sin(a);
    }
  }
  return tex;
}

// Basalto: colunas hexagonais de 8 px, face clara à esquerda, fendas horizontais desencontradas
function genBasalt(seed) {
  const tex = new Tex(), base = [74, 78, 90];
  for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
    const col = x >> 3, lx = x & 7, off = Math.floor(hash2(col, 0, seed) * 32), ly = wrap(y + off, 32);
    const prof = [0.55, 1.22, 1.12, 1.04, 0.98, 0.92, 0.82, 0.62][lx];
    let c = shade(base, prof * (0.92 + hash2(col, 1, seed) * 0.12) * (0.95 + hash2(x, y, seed) * 0.08));
    if (ly === 0) c = shade(base, 0.42); else if (ly === 1) c = shade(c, 1.14);
    if (hash2(x >> 1, y >> 1, seed + 4) < 0.03) c = shade(c, 0.8);
    tex.set(x, y, c);
  }
  return tex;
}

// Magnetita: cristais escuros e metálicos na rocha, com um brilho azulado nas pontas
function genMagnetite(seed) {
  const tex = genDeepstone(seed);
  const rnd = mulberry32(seed + 9), M = [[30, 34, 52], [62, 74, 108], [104, 128, 178], [190, 226, 255]];
  for (let k = 0; k < 30; k++) {
    const cx = rnd() * TEX, cy = rnd() * TEX, r = 2.5 + rnd() * 3.5;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const d = Math.abs(dx) + Math.abs(dy);   // losango: cristal
      if (d > r) continue;
      const lit = -dx - dy > r * 0.4 ? 2 : dx + dy > r * 0.4 ? 0 : 1;
      tex.set(cx + dx, cy + dy, d > r - 1 ? M[0] : M[lit]);
    }
    tex.set(cx - 1, cy - r + 1, M[3]);
  }
  return tex;
}

// Âmbar: mel translúcido com faixas de resina, bolhas e um inseto preso em um dos blocos
function genAmber(seed) {
  const tex = new Tex();
  for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
    const band = pfbm2(x / 16, y / 32, 4, seed, 3);
    let c = lerpColor([150, 66, 14], [252, 178, 60], clamp(band * 1.5 - 0.25 + (hash2(x, y, seed) - 0.5) * 0.08, 0, 1));
    const lx = x & 15, ly = y & 15;
    if (lx === 0 || ly === 0) c = shade(c, 1.25); else if (lx === 15 || ly === 15) c = shade(c, 0.6);
    if (((lx + ly) & 15) === 5 || ((lx + ly) & 15) === 6) c = lerpColor(c, [255, 236, 180], 0.35); // reflexo
    tex.set(x, y, c);
  }
  const rnd = mulberry32(seed + 1);
  for (let k = 0; k < 14; k++) {
    const x = Math.floor(rnd() * TEX), y = Math.floor(rnd() * TEX);
    tex.set(x, y, [255, 236, 170]); tex.set(x + 1, y + 1, [190, 104, 30]);
  }
  // inseto (uma libélula antiga) no canto de um bloco
  const bug = ['..k.k..', '.kkkkk.', 'kkkkkkk', '.kkkkk.', '..kkk..', '...k...', '...k...'];
  bug.forEach((r, j) => [...r].forEach((ch, i) => { if (ch === 'k') tex.set(40 + i, 22 + j, [86, 40, 14]); }));
  for (const [x, y] of [[38, 23], [37, 24], [48, 23], [49, 24]]) tex.set(x, y, [216, 150, 70]);
  return tex;
}

// Osso fóssil: osso amarelado com poros, gomos de vértebra e fendas escuras
function genFossil(seed) {
  const tex = new Tex(), base = [214, 200, 168];
  for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
    const ly = y & 15, seg = (y >> 4) + Math.floor(hash2(x >> 4, 0, seed) * 3);
    let c = shade(base, 0.86 + pfbm2(x / 8, y / 8, 8, seed + seg, 2) * 0.22);
    if (ly === 0 || ly === 15) c = shade(base, 0.62);
    else if (ly === 1) c = shade(c, 1.1);
    if (hash2(x, y, seed + 2) < 0.04) c = shade(c, 0.74);
    const lx = x & 15, r = Math.hypot(lx - 7.5, ly - 7.5);
    if (r < 2.2) c = [92, 78, 62]; else if (r < 3.2) c = shade(base, 1.12);   // canal da vértebra
    if (lx === 0) c = shade(c, 0.7);
    tex.set(x, y, c);
  }
  return tex;
}

// Placa de bronze: painéis com rebites nos cantos, bisel e manchas verdes de pátina escorrendo
function genBronze(seed) {
  const tex = new Tex(), B = CORE_PAL.bronze;
  for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
    const lx = x & 15, ly = y & 15;
    let c = shade(B.md, 0.9 + hash2(x >> 4, y >> 4, seed) * 0.16 + (hash2(x, y, seed) - 0.5) * 0.06);
    if (lx === 0 || ly === 0) c = B.ol; else if (lx === 1 || ly === 1) c = B.hi; else if (lx === 15 || ly === 15) c = B.dk;
    if ((lx === 3 || lx === 12) && (ly === 3 || ly === 12)) c = B.ol;
    if ((lx === 3 || lx === 12) && (ly === 2 || ly === 11)) c = B.hi;
    const drip = pnoise2(x / 2, 0, 32, seed + 5) > 0.7 && ly > 2 && ly < 12 + ((x * 7) & 3);
    if (drip) c = lerpColor(c, CORE_PAL.patina[ly < 6 ? 1 : 0], 0.55);
    tex.set(x, y, c);
  }
  return tex;
}

// Tijolo dos Vigias: blocos grandes de pedra escura com um friso de bronze a cada dois fiadas
function genVigiaBrick(seed, glow = false) {
  const tex = new Tex(), base = glow ? [44, 34, 46] : [68, 64, 76], B = CORE_PAL.bronze;
  for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
    const row = y >> 3, by = y & 7, bx = wrap(x + (row & 1) * 8, 16);
    let c = shade(base, 0.9 + hash2(wrap(x + (row & 1) * 8, 64) >> 4, row, seed) * 0.16 + (hash2(x, y, seed) - 0.5) * 0.05);
    if (by === 7 || bx === 15) c = glow ? (hash2(x >> 2, row, seed) < 0.28 ? CORE_PAL.vein[hash2(x, row, seed + 1) < 0.5 ? 1 : 2] : [20, 14, 22]) : shade(base, 0.5);
    else if (by === 0 || bx === 0) c = shade(c, 1.15);
    if ((y & 31) === 15 && !glow) c = B.md; else if ((y & 31) === 14 && !glow) c = B.hi; else if ((y & 31) === 16 && !glow) c = B.dk;
    tex.set(x, y, c);
  }
  return tex;
}

// Pedra rúnica: tijolo escuro com um glifo ciano aceso no meio de cada bloco (quatro glifos)
function genRuneStone(seed) {
  const tex = genVigiaBrick(seed);
  const GLYPHS = [
    ['..#..', '.###.', '#.#.#', '..#..', '.#.#.'], ['#...#', '.#.#.', '..#..', '.#.#.', '#...#'],
    ['.###.', '#...#', '#.#.#', '#...#', '.###.'], ['#.#.#', '#.#.#', '#####', '..#..', '..#..'],
  ];
  for (let cy = 0; cy < 4; cy++) for (let cx = 0; cx < 4; cx++) {
    const gl = GLYPHS[(cx + cy * 2) & 3], ox = cx * 16 + 5, oy = cy * 16 + 5;
    for (let j = -1; j <= 5; j++) for (let i = -1; i <= 5; i++) tex.set(ox + i, oy + j, [26, 34, 40]);
    gl.forEach((r, j) => [...r].forEach((ch, i) => { if (ch === '#') { tex.set(ox + i, oy + j, CORE_PAL.rune[j < 2 ? 2 : 1]); } }));
  }
  return tex;
}

// Gêiser: basalto com uma grade de ferro no topo e brasa lá no fundo do buraco
function genVent(seed) {
  const tex = genBasalt(seed);
  for (let cy = 0; cy < 4; cy++) for (let cx = 0; cx < 4; cx++) {
    const ox = cx * 16, oy = cy * 16;
    for (let x = 3; x <= 12; x++) for (let y = 0; y <= 5; y++) {
      const hole = x >= 5 && x <= 10 && y >= 1 && y <= 4;
      tex.set(ox + x, oy + y, hole ? CORE_PAL.vein[y >= 3 ? 2 : 1] : (x === 3 || x === 12 || y === 0 || y === 5) ? [40, 38, 44] : [24, 20, 26]);
      if (hole && (x & 1) === 0) tex.set(ox + x, oy + y, [58, 54, 60]); // grade
    }
  }
  return tex;
}

// ---------- Enfeites ----------
const CORE_FLAT = {
  // Cano de bronze vertical com braçadeira e uma válvula vermelha (emenda de bloco em bloco)
  pipe(tex) {
    const B = CORE_PAL.bronze;
    for (let y = 0; y < TEX; y++) {
      const ly = y & 31;
      for (let u = 4; u <= 11; u++) {
        let c = [B.ol, B.hi, B.lt, B.md, B.md, B.dk, B.dk, B.ol][u - 4];
        if (ly < 3 && u >= 4 && u <= 11) c = ly === 1 ? B.hi : B.ol;
        tex.set(u, y, c);
      }
      if (ly < 3) { tex.set(3, y, B.ol); tex.set(12, y, B.ol); }
      if (ly >= 14 && ly <= 18) for (let u = 1; u <= 3; u++) tex.set(u, y, ly === 16 ? [210, 60, 40] : [130, 30, 24]);
    }
  },
  // Lírio de brasa: talo escuro, folhas de cinza e uma flor que brilha como carvão aceso
  lily(tex) {
    const stem = [[60, 34, 30]], leaf = [[70, 56, 58], [104, 84, 84]];
    for (let v = 6; v < 16; v++) tex.set(7, v, stem[0]);
    for (const [u, v] of [[5, 11], [4, 12], [6, 12], [9, 10], [10, 9], [10, 11], [8, 13]]) tex.set(u, v, leaf[(u + v) & 1]);
    const P = CORE_PAL.vein;
    for (const [u, v, k] of [[7, 2, 3], [6, 3, 2], [8, 3, 2], [5, 4, 1], [7, 4, 3], [9, 4, 1], [6, 5, 2], [7, 5, 2], [8, 5, 2], [4, 3, 1], [10, 3, 1]]) tex.set(u, v, P[k]);
  },
};
function coreFlat(paint) { const tex = new Tex(); paint(tex); return tex; }

MATERIAL_TEX[TILE.DEEPSTONE] = genDeepstone(1901);
// Fundo da rocha profunda: textura própria (não é bloco), em camadas suaves com uma ou outra fenda
// acesa, para a parede do salão ler como distante e não se confundir com a rocha da frente
const DEEP_WALL_SRC = 129;
MATERIAL_TEX[DEEP_WALL_SRC] = (() => {
  const tex = new Tex();
  for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
    const strata = pfbm2(x / 32, y / 6, 2, 1951, 2), n = pfbm2(x / 8, y / 8, 8, 1952, 2);
    let c = shade([80, 66, 92], 0.78 + strata * 0.3 + n * 0.12);
    if (pnoise2(x / 3, y / 1.5, 21, 1953) > 0.86) c = CORE_PAL.vein[1];
    tex.set(x, y, c);
  }
  return tex;
})();
WALL_SOURCE[WALL.DEEPSTONE] = DEEP_WALL_SRC;
MATERIAL_TEX[TILE.BASALT] = genBasalt(1902);
MATERIAL_TEX[TILE.MAGNETITE] = genMagnetite(1903);
MATERIAL_TEX[TILE.AMBER] = genAmber(1904);
MATERIAL_TEX[TILE.FOSSIL] = genFossil(1905);
MATERIAL_TEX[TILE.BRONZE_PLATE] = genBronze(1906);
MATERIAL_TEX[TILE.RUNE_STONE] = genRuneStone(1907);
MATERIAL_TEX[TILE.VIGIA_BRICK] = genVigiaBrick(1908);
MATERIAL_TEX[TILE.CORE_WALL] = genVigiaBrick(1909, true);
MATERIAL_TEX[TILE.STEAM_VENT] = genVent(1910);
MATERIAL_TEX[TILE.PIPE] = coreFlat(CORE_FLAT.pipe);
MATERIAL_TEX[TILE.EMBER_LILY] = coreFlat(CORE_FLAT.lily);
MATERIAL_TEX[TILE.LAVA] = coreFlat((t) => { for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) t.set(x, y, CORE_PAL.lava[2 + ((x + y) & 1)]); });
MATERIAL_TEX[TILE.GEAR] = coreFlat(() => {}); // desenhada inteira pelo TILE_DRAW

buildFlatTiles();
FLAT_VERTICAL[TILE.PIPE] = 1;

// ---------- Lava animada ----------
// Duas tiras de 16 blocos de largura x 8 quadros: superfície (borda clara ondulando, bolhas
// estourando) e miolo (correnteza lenta de duas camadas que andam em sentidos opostos).
// Cada bloco de lava é um drawImage do pedaço certo da tira, como qualquer outro bloco.
const LAVA_FRAMES = 8, LAVA_W = 16 * T, LAVA_H = 16 * T;
// Períodos distintos para largura e altura: o atlas emenda nos dois eixos.
function lavaNoise(x,y,scale,seed,octaves){
  let value=0,norm=0,amp=.5;
  for(let k=0;k<octaves;k++){
    const xx=x/scale,yy=y/scale,ix=Math.floor(xx),iy=Math.floor(yy),fx=smoothstep(xx-ix),fy=smoothstep(yy-iy);
    const px=LAVA_W/scale,py=LAVA_H/scale;
    const sample=(a,b)=>hash2(wrap(a,px),wrap(b,py),seed+k*101);
    value+=lerp(lerp(sample(ix,iy),sample(ix+1,iy),fx),lerp(sample(ix,iy+1),sample(ix+1,iy+1),fx),fy)*amp;
    norm+=amp;amp*=.5;scale/=2;
  }
  return value/norm;
}
const LAVA_ART = (() => {
  const L = CORE_PAL.lava;
  const ramp = (v) => L[clamp(Math.floor(v * L.length), 0, L.length - 1)];
  const make = (surface) => {
    const H = surface ? T : LAVA_H; // campo amplo, sem faixas repetidas a cada quatro blocos
    const c = makeCanvas(LAVA_W, H * LAVA_FRAMES), g = c.getContext('2d'), img = g.createImageData(LAVA_W, H * LAVA_FRAMES);
    for (let f = 0; f < LAVA_FRAMES; f++) for (let y = 0; y < H; y++) for (let x = 0; x < LAVA_W; x++) {
      const a = lavaNoise(x + f * 32, y, 8, 1931, 3), b = lavaNoise(x - f * 32 + 400, y + 112, 16, 1932, 2);
      let v = a * 0.62 + b * 0.5 - 0.12;
      if (surface) {
        const phase=f/LAVA_FRAMES*Math.PI*2;
        const wave = Math.round(1.5 + Math.sin(x/LAVA_W*Math.PI*2*5+phase)*1.2 + Math.sin(x/LAVA_W*Math.PI*2*8-phase)*.6);
        if (y < wave) { continue; }                        // acima da onda: transparente
        if (y === wave) v = 0.98; else if (y === wave + 1) v = Math.max(v, 0.8); else continue;
        // bolha estourando: anel claro que abre e some ao longo dos quadros
        const bx = (x * 37 + 11) % 61;
        if (bx < 3 && y >= wave && y <= wave + 2 && ((x >> 4) + f) % 5 === 0) v = 1;
      } else v = v * 0.85 - 0.04;
      const col = ramp(clamp(v, 0, 0.999)), i = ((f * H + y) * LAVA_W + x) * 4;
      img.data[i] = col[0]; img.data[i + 1] = col[1]; img.data[i + 2] = col[2]; img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return c;
  };
  return { surface: make(true), body: make(false) };
})();
TILE_DRAW[TILE.LAVA] = (ctx, world, x, y) => {
  const f = Math.floor(performance.now() / 150) % LAVA_FRAMES;
  const top = world.getTile(x, y - 1) !== TILE.LAVA;
  ctx.drawImage(LAVA_ART.body, (x & 15) * T, f * LAVA_H + (y & 15) * T, T, T, x * T, y * T, T, T);
  if (top) ctx.drawImage(LAVA_ART.surface, (x & 15) * T, f * T, T, T, x * T, y * T, T, T);
};

// ---------- Engrenagem gigante girando ----------
// Ocupa um bloco no mundo (o eixo) e desenha uma roda de 46 px girando em volta dele.
// Quadros prontos: 12 posições de um dente para o outro (a roda tem 12 dentes, então o giro emenda).
const GEAR_ART = (() => {
  const R = 23, S = R * 2 + 2, frames = [];
  const B = CORE_PAL.bronze;
  for (let f = 0; f < 12; f++) {
    const s = new Sprite(S, S), rot = (f / 12) * (Math.PI * 2 / 12);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const dx = x + 0.5 - S / 2, dy = y + 0.5 - S / 2, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx) - rot;
      const tooth = Math.cos(a * 12) > 0.35 ? 4 : 0, outer = R - 4 + tooth;
      if (r > outer) continue;
      let c;
      if (r > outer - 1.2) c = B.ol;
      else if (r < 4) c = r < 2.2 ? [30, 20, 14] : B.hi;                       // eixo
      else if (r > 8 && r < R - 7 && Math.cos(a * 4) > 0.6) continue;           // janelas entre os raios
      else {
        const lit = -dx * 0.5 - dy * 0.8;
        c = r > R - 7 ? (lit > 4 ? B.lt : lit < -6 ? B.dk : B.md) : (lit > 2 ? B.md : B.dk);
        if (Math.abs(r - (R - 7)) < 0.7) c = B.ol;
      }
      s.set(x, y, c);
    }
    frames.push(s.finish(null));
  }
  return { frames, S };
})();
TILE_DRAW[TILE.GEAR] = (ctx, world, x, y) => {
  const dir = (x + y) & 1 ? 1 : -1;  // vizinhas giram em sentidos contrários
  const f = ((Math.floor(performance.now() / 90) * dir) % 12 + 12) % 12;
  const img = GEAR_ART.frames[f];
  ctx.drawImage(img, x * T + T / 2 - GEAR_ART.S / 2, y * T + T / 2 - GEAR_ART.S / 2);
};

// ---------- Ícones dos itens que não são bloco ----------
Object.assign(ITEM_ART, {
  [ITEM.SALAMANDER_SCALE]: {
    cores: { k: [40, 16, 12], a: [96, 30, 18], b: [170, 60, 24], c: [240, 128, 40], d: [255, 214, 120] },
    pixels: ['................', '......kkkk......', '....kkbbbbkk....', '...kbbccccbbk...', '..kbbcddddcbbk..', '..kbccdddccabk..',
      '.kbbcccccccabbk.', '.kbaacccccaabbk.', '.kbbaaaaaaabbbk.', '..kbbbbbbbbbbk..', '..kkbbaaaabbkk..', '....kkbbbbkk....', '......kkkk......', '................', '................', '................'],
  },
  [ITEM.CORE_SHARD]: {
    cores: { k: [20, 14, 26], a: [70, 40, 90], b: [140, 70, 150], c: [250, 130, 60], d: [255, 230, 160], e: [120, 200, 255] },
    pixels: ['................', '.......k........', '......kdk.......', '......kck.......', '.....kbcdk......', '.....kbcck......', '....kabccbk.....', '....kabcecbk....',
      '...kaabccebk....', '...kaabcccbbk...', '...kaaabcbbbk...', '....kaaabbbk....', '.....kkaabkk....', '.......kkk......', '................', '................'],
  },
  [ITEM.OBSIDIAN_SUIT]: {
    cores: { k: [12, 10, 16], a: [36, 28, 44], b: [62, 48, 74], c: [96, 76, 110], o: [236, 120, 52], y: [255, 200, 110] },
    pixels: ['................', '....kkk..kkk....', '...kbbbkkbbbk...', '..kbcbbbbbbcbk..', '..kbcbbobbbcbk..', '..kbbbboobbbbk..', '...kbbboybbbk...', '...kabbobbbak...',
      '...kabbbbbbak...', '...kaabobbaak...', '...kaabbobaak...', '...kaaabbaaak...', '...kkaaaaaakk...', '....kkkkkkkk....', '................', '................'],
  },
  [ITEM.MAGNET_BLADE]: {
    cores: { k: [14, 14, 22], a: [40, 46, 66], b: [74, 86, 120], c: [130, 156, 210], e: [190, 230, 255], h: [120, 70, 40], g: [200, 150, 60] },
    pixels: ['..............kk', '.............kek', '............kebk', '...........kecbk', '..........kecbk.', '.........kecbk..', '........kecbk...', '.......kecbk....',
      '..kk..kecbk.....', '..kgkkecbk......', '...kgkcbk.......', '....kgkk........', '...khkgk........', '..khkk.kk.......', '.khk............', '.kk.............'],
  },
  [ITEM.BUCKET_LAVA]: {
    cores: { o: [46, 28, 16], d: [96, 60, 32], m: [140, 92, 52], l: [184, 130, 76], i: [70, 74, 82], I: [150, 156, 164], w: [255, 200, 80], W: [236, 92, 28] },
    pixels: [
      '................', '.....oooooo.....', '....o......o....', '...o........o...',
      '..oIwwwwwwwwIo..', '..odWWwWWWwWdo..', '..omlmmlmmlmdo..', '..omlmmlmmlmdo..',
      '..oiiiiiiiiiio..', '...omlmmlmmdo...', '...omlmmlmmdo...', '...oiiiiiiiio...',
      '...omlmmlmmdo...', '....omlmmldo....', '....oooooooo....', '................'],
  },
});

// Receitas: o que se faz com o que o Coração dá
const CORE_RECIPES = [
  { nome: 'Traje de obsidiana', ingredientes: [[ITEM.OBSIDIAN, 8], [ITEM.SALAMANDER_SCALE, 6], [ITEM.LEATHER, 4]], resultado: { item: ITEM.OBSIDIAN_SUIT, quantidade: 1 } },
  { nome: 'Lâmina de magnetita', ingredientes: [[ITEM.MAGNETITE, 10], [ITEM.CORE_SHARD, 2], [ITEM.BRONZE, 4]], resultado: { item: ITEM.MAGNET_BLADE, quantidade: 1 } },
  { nome: 'Parede de rocha profunda', ingredientes: [[ITEM.DEEPSTONE, 1]], resultado: { item: ITEM.WALL_DEEPSTONE, quantidade: 4 } },
  { nome: 'Parede de basalto', ingredientes: [[ITEM.BASALT, 1]], resultado: { item: ITEM.WALL_BASALT, quantidade: 4 } },
  { nome: 'Parede dos Vigias', ingredientes: [[ITEM.VIGIA_BRICK, 1]], resultado: { item: ITEM.WALL_VIGIA, quantidade: 4 } },
  { nome: 'Tijolo dos Vigias', ingredientes: [[ITEM.DEEPSTONE, 2], [ITEM.BRONZE, 1]], resultado: { item: ITEM.VIGIA_BRICK, quantidade: 4 } },
  { nome: 'Cano de bronze', ingredientes: [[ITEM.BRONZE, 2]], resultado: { item: ITEM.PIPE, quantidade: 4 } },
  { nome: 'Engrenagem dos Vigias', ingredientes: [[ITEM.BRONZE, 4]], resultado: { item: ITEM.GEAR, quantidade: 1 } },
];
RECIPES.push(...CORE_RECIPES);
