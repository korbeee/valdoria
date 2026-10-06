'use strict';

// =====================================================================================
//  SUBSOLO — regiões de caverna, minérios e ambientes
// =====================================================================================
//  Antes o subsolo era uma pedra só do começo ao fim, com carvão e ferro espalhados por
//  cima. Agora ele tem CAMADAS (quanto mais fundo, mais aberta e mais quente a caverna) e
//  REGIÕES: manchas grandes de caverna com rocha, bicho de luz, minério e clima próprios.
//
//  As regiões saem de um ruído em grade grossa, o mesmo que o ambiente já usava para
//  colorir a penumbra (js/environment.js) — agora a rocha e a decoração falam a mesma
//  língua, em vez de cada uma sortear a sua.
//
//   • GRUTA MUSGOSA   — pedra coberta de musgo, água pingando, cogumelo luminoso.
//   • TOCA DE MICÉLIO — pedra tomada de micélio, chapéus grandes, esporo no ar.
//   • GRUTA DE CRISTAL— ametista nas paredes e drusas que iluminam sozinhas.
//   • CAVERNA GELADA  — só embaixo da tundra: pedra congelada e gelo.
//   • CÂMARA DE MAGMA — no fundo do mundo: rocha quente, obsidiana e enxofre.
//   • CÂMARA SECA     — a pedra comum de sempre, que separa uma região da outra.
// =====================================================================================

// ---------- Blocos novos ----------
Object.assign(TILE, {
  COPPER_ORE: 79, SILVER_ORE: 80, GOLD_ORE: 81, AMETHYST_ORE: 82, SULFUR_ORE: 83,
  MOSS_STONE: 84, MYCELIUM_STONE: 85, FROZEN_STONE: 86, MAGMA_STONE: 87, OBSIDIAN: 88,
  CRYSTAL: 89, GLOW_CAP: 90, AMETHYST_LAMP: 91,
});
Object.assign(ITEM, {
  COPPER: 143, SILVER: 144, GOLD: 145, AMETHYST: 146, SULFUR: 147,
  OBSIDIAN: 148, GLOW_CAP: 149, AMETHYST_LAMP: 150, CRYSTAL: 151,
});

defTile(TILE.COPPER_ORE,   { name: 'Minério de cobre', hardness: 1, drop: ITEM.COPPER, ferramenta: 'picareta', color: [186, 112, 66] });
defTile(TILE.SILVER_ORE,   { name: 'Minério de prata', hardness: 1.3, drop: ITEM.SILVER, ferramenta: 'picareta', color: [196, 202, 214] });
defTile(TILE.GOLD_ORE,     { name: 'Minério de ouro', hardness: 1.5, drop: ITEM.GOLD, ferramenta: 'picareta', color: [230, 188, 76] });
defTile(TILE.AMETHYST_ORE, { name: 'Veio de ametista', hardness: 1.2, drop: ITEM.AMETHYST, ferramenta: 'picareta', light: 3, color: [166, 118, 216] });
defTile(TILE.SULFUR_ORE,   { name: 'Minério de enxofre', hardness: 1, drop: ITEM.SULFUR, ferramenta: 'picareta', light: 2, color: [222, 196, 72] });
defTile(TILE.MOSS_STONE,   { name: 'Pedra musgosa', hardness: 0.7, drop: ITEM.STONE, ferramenta: 'picareta', color: [92, 122, 84] });
defTile(TILE.MYCELIUM_STONE, { name: 'Pedra de micélio', hardness: 0.7, drop: ITEM.STONE, ferramenta: 'picareta', color: [108, 124, 146] });
defTile(TILE.FROZEN_STONE, { name: 'Pedra congelada', hardness: 0.9, drop: ITEM.STONE, ferramenta: 'picareta', color: [132, 156, 174] });
defTile(TILE.MAGMA_STONE,  { name: 'Rocha quente', hardness: 1.1, drop: ITEM.STONE, ferramenta: 'picareta', light: 7, color: [96, 46, 34] });
defTile(TILE.OBSIDIAN,     { name: 'Obsidiana', hardness: 3.2, drop: ITEM.OBSIDIAN, ferramenta: 'picareta', color: [42, 32, 58] });
defTile(TILE.CRYSTAL,      { name: 'Drusa de cristal', solid: false, hardness: 0.8, drop: ITEM.CRYSTAL, ferramenta: 'picareta', light: 9, opacity: 1, color: [180, 140, 240] });
defTile(TILE.GLOW_CAP,     { name: 'Cogumelo-lanterna', solid: false, hardness: 0.1, drop: ITEM.GLOW_CAP, opacity: 1, light: 8, apoio: 'chao', color: [120, 216, 206] });
defTile(TILE.AMETHYST_LAMP,{ name: 'Lâmpada de ametista', hardness: 0.6, drop: ITEM.AMETHYST_LAMP, ferramenta: 'picareta', light: 14, color: [186, 140, 246] });

defItem(ITEM.COPPER,        { name: 'Cobre' });
defItem(ITEM.SILVER,        { name: 'Prata' });
defItem(ITEM.GOLD,          { name: 'Ouro' });
defItem(ITEM.AMETHYST,      { name: 'Ametista' });
defItem(ITEM.SULFUR,        { name: 'Enxofre' });
defItem(ITEM.OBSIDIAN,      { name: 'Obsidiana', place: TILE.OBSIDIAN });
defItem(ITEM.CRYSTAL,       { name: 'Cristal', place: TILE.CRYSTAL });
defItem(ITEM.GLOW_CAP,      { name: 'Cogumelo-lanterna', place: TILE.GLOW_CAP });
defItem(ITEM.AMETHYST_LAMP, { name: 'Lâmpada de ametista', place: TILE.AMETHYST_LAMP });
buildFlatTiles(); // os blocos novos que não são sólidos precisam entrar na lista

// ---------- Texturas ----------
// Salpico por cima de uma rocha pronta: musgo, geada, brasa. `fn(x,y)` diz onde cai.
function rockSpeckle(base, seed, colors, chance, fn) {
  const tex = new Tex();
  tex.d.set(base.d);
  for (let y = 0; y < TEX; y++)
    for (let x = 0; x < TEX; x++) {
      const h = hash2(x, y, seed);
      if (h > chance || (fn && !fn(x, y))) continue;
      tex.set(x, y, colors[Math.floor(hash2(x, y, seed + 3) * colors.length)]);
    }
  return tex;
}

const MOSS_TEX = cellRock(3101, [96, 104, 92], [44, 52, 44], 22);
MATERIAL_TEX[TILE.MOSS_STONE] = rockSpeckle(MOSS_TEX, 3102,
  [[70, 118, 62], [96, 152, 78], [128, 186, 96], [56, 96, 54]], 0.42,
  (x, y) => pnoise2(x / 9, y / 9, 8, 3103) > 0.42);
MATERIAL_TEX[TILE.MYCELIUM_STONE] = rockSpeckle(cellRock(3111, [112, 118, 134], [52, 56, 70], 20), 3112,
  [[150, 188, 200], [104, 214, 208], [182, 206, 222], [72, 120, 130]], 0.34,
  (x, y) => pnoise2(x / 7, y / 7, 8, 3113) > 0.48);
MATERIAL_TEX[TILE.FROZEN_STONE] = rockSpeckle(cellRock(3121, [126, 148, 168], [58, 74, 92], 24), 3122,
  [[206, 228, 240], [172, 204, 226], [238, 248, 252]], 0.3,
  (x, y) => pnoise2(x / 10, y / 10, 8, 3123) > 0.5);
MATERIAL_TEX[TILE.MAGMA_STONE] = rockSpeckle(cellRock(3131, [78, 54, 48], [30, 20, 20], 18), 3132,
  [[236, 124, 40], [252, 188, 78], [180, 60, 26], [148, 40, 22]], 0.5,
  (x, y) => pnoise2(x / 6, y / 6, 8, 3133) > 0.58);
// Vidro vulcânico: lascas alongadas, fraturas finas e reflexos na face da quebra.
// A distribuição se repete sem emendas nos quatro blocos da textura.
function genObsidian(seed) {
  const tex=new Tex(),rnd=mulberry32(seed);
  const flakes=Array.from({length:30},()=>({x:rnd()*TEX,y:rnd()*TEX,tone:rnd(),arc:7+rnd()*13}));
  for(let y=0;y<TEX;y++)for(let x=0;x<TEX;x++) {
    let first=Infinity,second=Infinity,flake,dx=0,dy=0;
    for(const q of flakes){
      const xx=wrap(x-q.x+TEX/2,TEX)-TEX/2,yy=wrap(y-q.y+TEX/2,TEX)-TEX/2;
      const u=xx*.84+yy*.54,v=-xx*.54+yy*.84,d=u*u*.65+v*v*1.4;
      if(d<first){second=first;first=d;flake=q;dx=xx;dy=yy;}else if(d<second)second=d;
    }
    const seam=Math.sqrt(second)-Math.sqrt(first),grain=hash2(x,y,seed+1)*2;
    const face=flake.tone*13+clamp((-dx-dy)*.65,-4,9)+grain;
    let col=[20+face*.7,18+face*.55,29+face];
    if(seam<.38)col=[11,10,18];
    else if(seam<.95&&dx+dy<-1)col=[64+flake.tone*20,56+flake.tone*17,91+flake.tone*25];
    // Reflexo curvo e descontínuo da fratura concoidal; nunca uma fissura luminosa.
    const curve=Math.hypot(dx+flake.arc*.5,(dy+flake.arc*.25)*1.25);
    if(seam>1&&Math.abs(curve-flake.arc)<.42&&dy<1&&dx<4)col=[53,46,76];
    tex.set(x,y,col);
  }
  return tex;
}
MATERIAL_TEX[TILE.OBSIDIAN] = genObsidian(3141);
MATERIAL_TEX[TILE.AMETHYST_LAMP] = rockSpeckle(cellRock(3151, [128, 92, 176], [58, 40, 86], 10), 3152,
  [[212, 168, 252], [246, 228, 255], [170, 122, 232]], 0.55);

MATERIAL_TEX[TILE.COPPER_ORE]   = genOre(3201, STONE_TEX, [[62, 30, 18], [146, 76, 38], [204, 118, 62], [236, 164, 104], [252, 226, 190]]);
MATERIAL_TEX[TILE.SILVER_ORE]   = genOre(3202, STONE_TEX, [[62, 66, 76], [124, 132, 146], [178, 186, 200], [222, 230, 240], [255, 255, 255]]);
MATERIAL_TEX[TILE.GOLD_ORE]     = genOre(3203, STONE_TEX, [[88, 58, 14], [168, 120, 28], [222, 174, 52], [248, 216, 110], [255, 248, 200]]);
MATERIAL_TEX[TILE.AMETHYST_ORE] = genOre(3204, STONE_TEX, [[52, 28, 82], [104, 58, 158], [150, 96, 214], [196, 154, 246], [240, 222, 255]]);
MATERIAL_TEX[TILE.SULFUR_ORE]   = genOre(3205, STONE_TEX, [[86, 70, 12], [162, 140, 28], [216, 194, 58], [244, 230, 118], [255, 252, 206]]);

// ---------- Drusa de cristal ----------
// Prismas facetados: contorno escuro, face da esquerda na sombra, aresta de luz no meio, face
// da direita clara e ponta lapidada. Os de trás (maiúsculas) são mais escuros. A mesma grade
// serve para o bloco, o ícone e o enfeite da caverna (js/environment.js).
//   shards: [{ x, base, h, r (meia largura), tilt (desvio por linha), back }]
function crystalShardGrid(W, H, shards, rnd = Math.random) {
  const g = Array.from({ length: H }, () => new Array(W).fill('.'));
  const put = (x, y, k) => { x = Math.round(x); if (x >= 0 && y >= 0 && x < W && y < H) g[y][x] = k; };
  for (const s of [...shards].sort((a, b) => (b.back ? 1 : 0) - (a.back ? 1 : 0))) {
    const tip = Math.max(2, Math.round(s.h * 0.32)), up = s.back ? (k) => k.toUpperCase() : (k) => k;
    for (let k = 0; k < s.h; k++) {
      const y = s.base - k, top = s.h - 1 - k, cx = s.x + s.tilt * k;
      const r = top < tip ? Math.round((s.r * top) / tip) : s.r;
      for (let dx = -r - 1; dx <= r + 1; dx++) {
        let key;
        if (dx === -r - 1 || dx === r + 1) key = 'k';
        else if (dx === 0) key = top === 0 || top < tip - 1 || k % 7 < 2 ? 'e' : 'd';  // aresta que pega a luz
        else if (dx < 0) key = dx === -r && r > 1 ? 'a' : top === tip ? 'd' : 'b';     // face da sombra, ombro da ponta
        else key = top === tip ? 'e' : dx === r ? 'c' : 'd';                            // face clara
        put(cx + dx, y, up(key));
      }
    }
    put(s.x + s.tilt * (s.h - 1), s.base - s.h, 'k');
    // brilhos soltos dentro do prisma
    for (let n = 0; n < Math.floor(s.h / 7); n++) {
      const k = 2 + Math.floor(rnd() * (s.h - tip - 2)), dx = rnd() < 0.5 ? -1 : 1;
      if (s.r > 1 || dx > 0) put(s.x + s.tilt * k + dx, s.base - k, up('e'));
    }
  }
  return g;
}
const CRYSTAL_PALETTES = [
  { k: [34, 16, 58], a: [70, 38, 124], b: [104, 64, 176], c: [150, 108, 228], d: [192, 160, 250], e: [248, 242, 255] },   // ametista
  { k: [52, 14, 50], a: [108, 36, 108], b: [152, 62, 158], c: [206, 110, 212], d: [240, 170, 240], e: [255, 238, 252] },  // rosa
  { k: [18, 24, 64], a: [42, 58, 138], b: [66, 94, 190], c: [112, 150, 236], d: [168, 204, 255], e: [240, 250, 255] },   // azul
  { k: [26, 30, 62], a: [60, 62, 140], b: [96, 92, 196], c: [132, 150, 236], d: [170, 222, 250], e: [244, 255, 255] },   // violeta-turquesa
];
function crystalCores(pal) {
  const out = { r: [58, 52, 48], s: [90, 82, 74], t: [122, 112, 100] };
  for (const [k, v] of Object.entries(pal)) { out[k] = v; out[k.toUpperCase()] = v.map((c) => Math.round(c * 0.66 + 14)); }
  return out;
}
// Pedrinhas na base da drusa
function crystalRocks(g, y, rnd) {
  const W = g[0].length;
  for (let x = 0; x < W; x++) {
    if (rnd() < 0.3) continue;
    g[y][x] = rnd() < 0.5 ? 's' : 'r';
    if (rnd() < 0.4 && y > 0 && g[y - 1][x] === '.') g[y - 1][x] = rnd() < 0.5 ? 't' : 's';
  }
}
ITEM_ART[ITEM.CRYSTAL] = (() => {
  const rnd = mulberry32(8871);
  const g = crystalShardGrid(16, 16, [
    { x: 4, base: 13, h: 7, r: 1, tilt: -0.3 }, { x: 12, base: 13, h: 6, r: 1, tilt: 0.35 },
    { x: 10, base: 13, h: 9, r: 1, tilt: 0.1, back: true }, { x: 7.5, base: 13, h: 13, r: 2, tilt: 0.05 },
  ], rnd);
  crystalRocks(g, 14, rnd);
  return { cores: crystalCores(CRYSTAL_PALETTES[0]), pixels: g.map((row) => row.join('')) };
})();
// ---------- Cogumelo-lanterna ----------
// Chapéu em cúpula (luz em cima à esquerda, sombra embaixo à direita), lamelas por baixo, pintas
// que brilham e caule claro levemente torto. A mesma grade serve para o enfeite colhido, o
// bloco colocado no chão e o ícone, então o que você pega é o que você põe.
//   shrooms: [{ x, base, stem, cap (meia largura), capH, lean }]
function mushroomGrid(W, H, shrooms, rnd = Math.random) {
  const g = Array.from({ length: H }, () => new Array(W).fill('.'));
  const put = (x, y, k) => { x = Math.round(x); if (x >= 0 && y >= 0 && x < W && y < H) g[y][x] = k; };
  for (const m of shrooms) {
    const top = m.base - m.stem, sw = m.cap >= 4 ? 1 : 0;           // caule de 2 ou 3 px
    // caule
    for (let k = 0; k <= m.stem; k++) {
      const y = m.base - k, cx = m.x + (m.lean || 0) * (k / m.stem) ** 2 * 2;
      put(cx - sw - 1, y, 'k'); put(cx + sw + 1 + (sw ? 0 : 1), y, 'k');
      for (let dx = -sw; dx <= sw + (sw ? 0 : 1); dx++) put(cx + dx, y, dx < 0 || (!sw && dx === 0) ? 's' : dx > 0 ? 'S' : (k % 3 ? 's' : 't'));
    }
    const cx = m.x + (m.lean || 0) * 2;
    // lamelas embaixo do chapéu
    for (let dx = -m.cap + 1; dx <= m.cap - 1; dx++) put(cx + dx, top, Math.abs(dx) % 2 ? 'g' : 'a');
    // chapéu em cúpula
    for (let j = 0; j < m.capH; j++) {
      const y = top - 1 - j, v = (j + 0.5) / m.capH, hw = Math.round(m.cap * Math.sqrt(Math.max(0, 1 - v * v)) + 0.3);
      for (let dx = -hw - 1; dx <= hw + 1; dx++) {
        let key;
        if (Math.abs(dx) === hw + 1) key = 'k';
        else if (j === 0) key = dx > hw * 0.3 ? 'a' : 'b';                    // aba de baixo, na sombra
        else { const rel = dx / Math.max(1, hw); key = rel < -0.35 && v > 0.35 ? 'd' : rel < 0.25 ? 'c' : rel < 0.7 ? 'b' : 'a'; }
        put(cx + dx, y, key);
      }
      if (j === m.capH - 1) for (let dx = -hw; dx <= hw; dx++) put(cx + dx, y - 1, 'k');
    }
    // pintas que brilham
    for (let n = 0; n < Math.max(1, Math.floor(m.cap * 0.8)); n++) {
      const j = 1 + Math.floor(rnd() * Math.max(1, m.capH - 1)), v = (j + 0.5) / m.capH, hw = Math.floor(m.cap * Math.sqrt(1 - v * v));
      if (hw > 0) put(cx - hw + 1 + Math.floor(rnd() * (hw * 2 - 1)), top - 1 - j, 'e');
    }
  }
  return g;
}
const GLOW_CAP_CORES = {
  k: [16, 38, 50], a: [30, 84, 104], b: [44, 128, 144], c: [74, 180, 186], d: [146, 230, 222], e: [236, 255, 246],
  g: [66, 108, 118], s: [218, 226, 214], S: [150, 168, 162], t: [190, 202, 192],
};
ITEM_ART[ITEM.GLOW_CAP] = (() => {
  const rnd = mulberry32(5520);
  const g = mushroomGrid(16, 16, [{ x: 3, base: 14, stem: 3, cap: 2, capH: 2, lean: -0.4 }, { x: 8, base: 14, stem: 6, cap: 5, capH: 5, lean: 0.3 }], rnd);
  return { cores: GLOW_CAP_CORES, pixels: g.map((row) => row.join('')) };
})();
// Cada minério e gema tem a própria silhueta: pepita, lasca, cristal lapidado, torrão.
// Antes os seis dividiam o mesmo losango e só trocavam de cor, o que fazia o inventário
// parecer uma fileira de figurinhas repetidas.
ITEM_ART[ITEM.COPPER] = { // pepita bruta, torta e cheia de bossa
  cores: { a: [58, 28, 16], b: [132, 68, 34], c: [196, 112, 58], d: [238, 162, 100], e: [252, 226, 192] },
  pixels: [
    '................', '................', '.......aaa......', '.....aabccba....',
    '....abccdddba...', '...abcddddecba..', '..abcddeeedccba.', '..abcdddeeddcba.',
    '.abccdddddddcba.', '.abbccddddddcba.', '.aabbccdddccbba.', '..aabbccccbbaa..',
    '...aaabbbbaa....', '.....aaaaa......', '................', '................',
  ],
};
ITEM_ART[ITEM.SILVER] = { // duas lascas angulares saindo da mesma matriz
  cores: { a: [58, 62, 72], b: [118, 126, 140], c: [174, 182, 196], d: [220, 228, 238], e: [255, 255, 255] },
  pixels: [
    '................', '................', '......e.........', '.....ede........',
    '....adcda.......', '....abcba..e....', '....abcba.ede...', '...abccdaadcda..',
    '...abcddaabcba..', '...abcddaabccba.', '...abccbaabcdba.', '...aabbaaabccba.',
    '....aaa.aabbbaa.', '.........aaa....', '................', '................',
  ],
};
ITEM_ART[ITEM.GOLD] = { // duas pepitas redondas e um brilho solto
  cores: { a: [82, 54, 12], b: [162, 116, 26], c: [220, 172, 50], d: [246, 214, 108], e: [255, 250, 210] },
  pixels: [
    '................', '.............e..', '............eee.', '.....aaa.....e..',
    '...aabccba......', '..abccdddba.....', '.abcdddeedba....', '.abcdddeedcba...',
    '.abccddddcba....', '..aabbcccba.aaa.', '....aabbaaabccba', '.......abcdddcba',
    '.......abccddcba', '........aabbbba.', '..........aaa...', '................',
  ],
};
ITEM_ART[ITEM.AMETHYST] = { // gema lapidada: mesa larga em cima e ponta embaixo
  cores: { a: [48, 26, 78], b: [100, 56, 154], c: [150, 96, 212], d: [198, 156, 244], e: [244, 228, 255] },
  pixels: [
    '................', '................', '....aaaaaaaa....', '...abeeeeeeba...',
    '..abceeeeeecba..', '.abccdddddccdba.', '.abcdddddddddba.', '.abcddddddddcba.',
    '..abcdddddddba..', '..abccdddddcba..', '...abccdddcba...', '....abccdcba....',
    '.....abcdba.....', '......abba......', '.......aa.......', '................',
  ],
};
ITEM_ART[ITEM.SULFUR] = { // torrão quebradiço, com grãos soltos em volta
  cores: { a: [82, 66, 12], b: [158, 136, 26], c: [214, 192, 56], d: [242, 228, 116], e: [255, 252, 206] },
  pixels: [
    '................', '................', '................', '......aaa...aa..',
    '....aabcba.abca.', '...abcdddba.aba.', '..abcdedddcba...', '..abcdddedcba...',
    '.abcddddddcba...', '.abcdedddddcba..', '.abccdddedddba..', '..abccdddddcba..',
    '..aabbccdddba...', '....aabbcbba....', '......aaaa......', '................',
  ],
};
ITEM_ART[ITEM.OBSIDIAN] = { // lasca de vidro vulcânico, com o fio de luz na quebra
  cores: { a: [16, 12, 26], b: [40, 30, 60], c: [68, 52, 98], d: [108, 86, 148], e: [200, 186, 240] },
  pixels: [
    '................', '..........aa....', '.........abca...', '........abcdca..',
    '.......abcddca..', '......abcedddca.', '.....abcdedddca.', '....abcddedddca.',
    '...abcdddeddcca.', '..abcddddedccca.', '..abcdddddcccaa.', '..abccdddcccaa..',
    '...abccdcccaa...', '....abcccaaa....', '.....aaaaa......', '................',
  ],
};
ITEM_ART[ITEM.AMETHYST_LAMP] = { // lampião de verdade: alça, corpo de metal e brasa roxa
  cores: { a: [34, 22, 52], b: [96, 84, 110], c: [150, 108, 206], d: [204, 168, 248], e: [250, 242, 255] },
  pixels: [
    '................', '.......b........', '......bbb.......', '.....bb.bb......',
    '....baaaaab.....', '....bacccab.....', '...bacdddcab....', '...bacdedcab....',
    '...bacdedcab....', '...bacdddcab....', '....bacccab.....', '....baaaaab.....',
    '.....bbbbb......', '....bbbbbbb.....', '.....bbbbb......', '................',
  ],
};

// ---------- Regiões de caverna ----------
// Mesma grade grossa usada pela penumbra do ambiente, para rocha e decoração combinarem.
const UNDER = {
  DRY: 0, GROTTO: 1, MYCELIUM: 2, CRYSTAL: 3, FROZEN: 4, MAGMA: 5,
  cell: [46, 30],     // tamanho da mancha, em blocos
  magmaDepth: 0.74,   // fração da altura do mundo em que o magma começa a aparecer
};
const UNDER_ROCK = {
  1: TILE.MOSS_STONE, 2: TILE.MYCELIUM_STONE, 3: TILE.STONE, 4: TILE.FROZEN_STONE, 5: TILE.MAGMA_STONE,
};

// Qual região manda naquele ponto. Depende do sorteio da mancha, da profundidade (magma só
// no fundo) e do bioma lá em cima (caverna gelada só embaixo da tundra).
function undergroundRegion(world, x, y) {
  const deep = y / world.h;
  const gx = Math.floor(x / UNDER.cell[0]), gy = Math.floor(y / UNDER.cell[1]);
  const r = hash2(gx, gy, world.seed + 476);
  if (deep > UNDER.magmaDepth && r < 0.5) return UNDER.MAGMA;
  const b = world.biomeAt(clamp(x, 0, world.w - 1));
  if (b === BIOME.SNOW && r < 0.62) return UNDER.FROZEN;
  if (r < 0.26) return UNDER.GROTTO;
  if (r < 0.46) return UNDER.MYCELIUM;
  if (r < 0.62) return UNDER.CRYSTAL;
  return UNDER.DRY;
}

// Cristal, cogumelo e os enfeites de gruta só nascem fundo: abaixo de 30% do caminho entre a
// superfície e o fundo do mundo. Perto da superfície a caverna é só pedra.
const UNDER_DEEP = 0.3;
function undergroundDeep(world, x, y) {
  const s = world.surface[clamp(x | 0, 0, world.w - 1)];
  return y >= s + (world.h - s) * UNDER_DEEP;
}

// Quanto o ponto está no miolo da mancha (0 na borda, 1 no meio): as bordas ficam de pedra
// comum, então uma região vira a outra sem emenda reta.
function undergroundBlend(world, x, y) {
  const fx = (x % UNDER.cell[0]) / UNDER.cell[0], fy = (y % UNDER.cell[1]) / UNDER.cell[1];
  const e = Math.min(fx, 1 - fx, fy, 1 - fy) * 2;
  return clamp(e * 1.6 + (fbm2(x * 0.06, y * 0.06, world.seed + 611, 2) - 0.5) * 1.2, 0, 1);
}

// ---------- Escavação extra: salões ----------
// Além dos túneis de sempre, o fundo ganha SALÕES: bolhas grandes de ruído de baixa
// frequência. É o que faz a caverna deixar de ser só corredor quanto mais fundo se cava.
function undergroundHall(world, x, y) {
  const deep = y / world.h;
  if (deep < 0.34) return false;
  const size = 0.80 - (deep - 0.34) * 0.13;   // mais fundo, limiar menor = salão maior e mais comum
  return fbm2(x * 0.014, y * 0.02, world.seed + 915, 3) > size;
}

// ---------- Bocas de caverna ----------
// Os túneis de ruído quase nunca encostam na superfície: sem isso só se chega ao subsolo
// cavando. Aqui algumas bocas são abertas de propósito, descendo em ziguezague até achar
// o primeiro vazio lá embaixo. Encosta de serra tem muito mais chance de ter uma.
function carveCaveShaft(world, rnd, x, y) {
  const { w, h } = world;
  let cx = x + .5, cy = y + .5, ang = Math.PI / 2 + (rnd() - .5) * .8; // começa descendo
  const bottom = Math.min(h - 8, world.surface[x] + 34 + Math.floor(rnd() * 26));
  for (let step = 0; step < 220; step++) {
    const r = 1.5 + rnd() * 1.1 + (step < 4 ? .6 : 0), R = Math.ceil(r);
    let reachedCave = false;
    for (let dy = -R; dy <= R; dy++)
      for (let dx = -R; dx <= R; dx++) {
        if (dx * dx + dy * dy > r * r) continue;
        const tx = Math.round(cx) + dx, ty = Math.round(cy) + dy;
        if (!world.inBounds(tx, ty) || ty < 1 || ty >= h - 2) continue;
        const i = ty * w + tx, t = world.tiles[i];
        if (t === TILE.BEDROCK) continue;              // o covil selado não se abre assim
        if (t === TILE.AIR && ty > world.surface[tx] + 8) reachedCave = true;
        world.tiles[i] = TILE.AIR;
        // Só o fundo da boca ganha parede: a entrada em si fica aberta para o céu
        if (ty > world.surface[tx] + 3 && world.walls[i] === WALL.NONE) world.walls[i] = WALL.STONE;
      }
    if (cy > bottom || (reachedCave && step > 8)) break;
    ang = clamp(ang + (rnd() - .5) * .9, Math.PI * .18, Math.PI * .82); // serpenteia, sempre descendo
    cx += Math.cos(ang) * 1.3; cy += Math.sin(ang) * 1.3;
    if (cx < 3 || cx > w - 4) break;
  }
}

function carveCaveEntrances(world, rnd) {
  const { w, surface, biome } = world;
  const target = clamp(Math.round(w / 140), 3, 40), spots = [];
  for (let tries = 0; tries < target * 60 && spots.length < target; tries++) {
    const x = 24 + Math.floor(rnd() * Math.max(1, w - 48));
    if (biome[x] === BIOME.OCEAN || world.hasWater(x, surface[x] - 1)) continue;
    if (spots.some((s) => Math.abs(s - x) < 34)) continue;
    const slope = Math.abs(surface[x - 5] - surface[x + 5]);
    if (rnd() > .05 + Math.min(.7, mountainAt(world, x) * .035) + Math.min(.2, slope * .04)) continue;
    spots.push(x);
    carveCaveShaft(world, rnd, x, surface[x] - 1);
  }
  world.caveMouths = spots;
  return spots;
}

// ---------- Pintura do subsolo ----------
// Roda depois de cavar e antes dos minérios: troca a pedra pela rocha da região e espalha
// os enfeites de cada uma (drusa, cogumelo, gelo, poça de magma).
function* paintUnderground(world, rnd) {
  const { w, h, tiles } = world;
  const set = (x, y, t) => { if (world.inBounds(x, y)) tiles[y * w + x] = t; };
  const get = (x, y) => world.getTile(x, y);
  for (let y = 0; y < h - 3; y++) {
    for (let x = 0; x < w; x++) {
      if (y <= world.surface[x] + 6) continue;
      let t = tiles[y * w + x];
      // Bolsão de gelo no meio do magma não faz sentido: a câmara quente derrete
      if (t === TILE.ICE && undergroundRegion(world, x, y) === UNDER.MAGMA) { tiles[y * w + x] = TILE.MAGMA_STONE; continue; }
      if (t !== TILE.STONE && t !== TILE.AIR) continue;
      const reg = undergroundRegion(world, x, y), blend = undergroundBlend(world, x, y);
      if (reg === UNDER.DRY || blend < 0.22) continue;

      if (t === TILE.STONE) {
        // A rocha da região aparece aos poucos, mais densa no miolo da mancha
        if (hash2(x, y, world.seed + 733) < blend * 0.82) {
          const rock = UNDER_ROCK[reg];
          if (rock && rock !== TILE.STONE) set(x, y, rock);
          if (reg === UNDER.CRYSTAL && hash2(x, y, world.seed + 741) < blend * 0.1) set(x, y, TILE.AMETHYST_ORE);
          if (reg === UNDER.MAGMA && hash2(x, y, world.seed + 742) < blend * 0.14) set(x, y, TILE.OBSIDIAN);
          if (reg === UNDER.MAGMA && hash2(x, y, world.seed + 743) < blend * 0.08) set(x, y, TILE.SULFUR_ORE);
          if (reg === UNDER.FROZEN && hash2(x, y, world.seed + 744) < blend * 0.22) set(x, y, TILE.ICE);
        }
        continue;
      }
      // Ar: enfeite pendurado no teto ou plantado no chão
      const floor = world.isSolid(x, y + 1), roof = world.isSolid(x, y - 1);
      if ((!floor && !roof) || !undergroundDeep(world, x, y)) continue;
      const k = hash2(x, y, world.seed + 755);
      if (reg === UNDER.CRYSTAL && k < blend * 0.035) set(x, y, TILE.CRYSTAL);
      else if (reg === UNDER.GROTTO && floor && k < blend * 0.03) set(x, y, TILE.GLOW_CAP);
      else if (reg === UNDER.MYCELIUM && floor && k < blend * 0.045) set(x, y, TILE.GLOW_CAP);
    }
    if ((y & 31) === 0) yield [0.86 + 0.03 * (y / h), 'Abrindo as grutas'];
  }
}

// ---------- Minérios ----------
// Cada um tem a sua faixa de profundidade e, alguns, a sua região preferida. Carvão e ferro
// continuam como eram; cobre é o raso, prata o meio, ouro o fundo.
function* spreadOres(world, rnd) {
  const { w, h } = world, area = w * h;
  const vein = (tile, count, y0, y1, size, region) => {
    for (let k = 0; k < count; k++) {
      let x = Math.floor(rnd() * w), y = Math.floor(y0 + rnd() * Math.max(1, y1 - y0));
      if (region !== undefined && undergroundRegion(world, x, y) !== region) continue;
      const len = size + Math.floor(rnd() * size);
      for (let s = 0; s < len; s++) {
        const t = world.getTile(x, y);
        if (t === TILE.STONE || t === TILE.MOSS_STONE || t === TILE.MYCELIUM_STONE || t === TILE.FROZEN_STONE) {
          world.tiles[y * w + x] = tile;
        }
        x += Math.round(rnd() * 2 - 1); y += Math.round(rnd() * 2 - 1);
      }
    }
  };
  const top = Math.round(h * 0.2);
  vein(TILE.COAL_ORE, Math.floor(area / 480), top, h, 5);
  vein(TILE.COPPER_ORE, Math.floor(area / 620), top, Math.round(h * 0.7), 5);
  yield [0.9, 'Espalhando minérios'];
  vein(TILE.IRON_ORE, Math.floor(area / 1000), Math.round(h * 0.45), h, 4);
  vein(TILE.IRON_ORE, Math.floor(area / 2500), Math.round(h * 0.75), h, 7);
  vein(TILE.SILVER_ORE, Math.floor(area / 2200), Math.round(h * 0.55), h, 4);
  yield [0.92, 'Espalhando minérios'];
  vein(TILE.GOLD_ORE, Math.floor(area / 3600), Math.round(h * 0.78), h, 3);
  vein(TILE.AMETHYST_ORE, Math.floor(area / 2600), Math.round(h * 0.4), h, 5, UNDER.CRYSTAL);
  vein(TILE.SULFUR_ORE, Math.floor(area / 3000), Math.round(h * UNDER.magmaDepth), h, 4, UNDER.MAGMA);
  yield [0.94, 'Espalhando minérios'];
}

// Bloco não sólido (drusa, cogumelo) não ganha textura de material sozinho: o renderer
// procura em MATERIAL_TEX e desenha os 16x16 do canto. Reaproveito a arte do item.
function flatFromArt(art) {
  const tex = new Tex();
  for (let cy = 0; cy < 4; cy++)
    for (let cx = 0; cx < 4; cx++)
      for (let y = 0; y < 16; y++)
        for (let x = 0; x < 16; x++) {
          const ch = art.pixels[y][x];
          if (ch && ch !== '.') tex.set(cx * 16 + x, cy * 16 + y, art.cores[ch]);
        }
  return tex;
}
MATERIAL_TEX[TILE.CRYSTAL] = flatFromArt(ITEM_ART[ITEM.CRYSTAL]);
MATERIAL_TEX[TILE.GLOW_CAP] = flatFromArt(ITEM_ART[ITEM.GLOW_CAP]);
