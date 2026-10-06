'use strict';

// =====================================================================================
//  ÁGUA E MAR: blocos das plantas aquáticas/corais e os itens do oceano
// =====================================================================================
// Os IDs continuam depois das peças de construção (js/building.js: blocos 41–54, itens 92–107).
// A água em si NÃO é um bloco: fica numa camada separada (world.water, js/water.js), então
// dá para ter alga, coral ou vitória-régia no mesmo lugar que a água.

Object.assign(TILE, { LILYPAD: 55, SEAWEED: 56, CORAL_BRANCH: 57, CORAL_FAN: 58, CORAL_BRAIN: 59 });
Object.assign(ITEM, {
  LILYPAD: 108, SEAWEED: 109, CORAL_BRANCH: 110, CORAL_FAN: 111, CORAL_BRAIN: 112,
  TRIDENT: 113, PEARL: 114, SHELL: 115, STARFISH: 116, RAW_FISH: 117, COOKED_FISH: 118, AIR_BOTTLE: 119,
});
const CORAL_TILES = [TILE.CORAL_BRANCH, TILE.CORAL_FAN, TILE.CORAL_BRAIN];

// aquatico = só pode ser colocado dentro da água (veja canPlaceAquatic em js/water.js)
defTile(TILE.LILYPAD, { name: 'Vitória-régia', solid: false, hardness: 0.1, drop: ITEM.LILYPAD, ferramenta: 'machado', opacity: 1, aquatico: 'superficie', color: [80, 170, 70] });
defTile(TILE.SEAWEED, { name: 'Alga', solid: false, hardness: 0.1, drop: ITEM.SEAWEED, ferramenta: 'machado', opacity: 1, aquatico: 'fundo', color: [60, 150, 80] });
defTile(TILE.CORAL_BRANCH, { name: 'Coral galhado', solid: false, hardness: 0.3, drop: ITEM.CORAL_BRANCH, ferramenta: 'picareta', opacity: 1, apoio: 'chao', aquatico: 'fundo', color: [220, 80, 90] });
defTile(TILE.CORAL_FAN, { name: 'Coral leque', solid: false, hardness: 0.3, drop: ITEM.CORAL_FAN, ferramenta: 'picareta', opacity: 1, apoio: 'chao', aquatico: 'fundo', color: [150, 90, 200] });
defTile(TILE.CORAL_BRAIN, { name: 'Coral cérebro', solid: false, hardness: 0.3, drop: ITEM.CORAL_BRAIN, ferramenta: 'picareta', opacity: 1, apoio: 'chao', aquatico: 'fundo', color: [240, 170, 60] });

defItem(ITEM.LILYPAD, { name: 'Vitória-régia', place: TILE.LILYPAD });
defItem(ITEM.SEAWEED, { name: 'Alga', place: TILE.SEAWEED });
defItem(ITEM.CORAL_BRANCH, { name: 'Coral galhado', place: TILE.CORAL_BRANCH });
defItem(ITEM.CORAL_FAN, { name: 'Coral leque', place: TILE.CORAL_FAN });
defItem(ITEM.CORAL_BRAIN, { name: 'Coral cérebro', place: TILE.CORAL_BRAIN });
// natacao = quanto mais rápido o jogador nada com o item na mão
defItem(ITEM.TRIDENT, { name: 'Tridente', tridente: true, dano: 12, rapidez: 0.9, alcance: 40, natacao: 1.7, maxStack: 1 });
defItem(ITEM.PEARL, { name: 'Pérola' });
defItem(ITEM.SHELL, { name: 'Concha' });
defItem(ITEM.STARFISH, { name: 'Estrela-do-mar' });
defItem(ITEM.RAW_FISH, { name: 'Peixe cru', cura: 8 });
defItem(ITEM.COOKED_FISH, { name: 'Peixe assado', cura: 30 });
// folego = botão direito enche o fôlego (dá para usar embaixo d'água)
defItem(ITEM.AIR_BOTTLE, { name: 'Garrafa de ar', folego: true });

// Desenhadas à parte pelo js/water.js (balançam com a água, seguem o nível dela)
FLAT_SPECIAL.push(TILE.LILYPAD, TILE.SEAWEED, ...CORAL_TILES);
buildFlatTiles();

// ---------- Arte ----------
// Corais: a = sombra, b = meio, c = luz. A cor de verdade no mundo é sorteada por posição.
const CORAL_PALETTES = [
  { a: [150, 40, 60], b: [220, 80, 90], c: [255, 160, 150] },
  { a: [90, 50, 140], b: [150, 90, 200], c: [210, 170, 240] },
  { a: [170, 100, 30], b: [240, 170, 60], c: [255, 230, 140] },
  { a: [160, 60, 120], b: [230, 110, 170], c: [255, 190, 220] },
  { a: [30, 100, 120], b: [60, 170, 180], c: [150, 230, 230] },
];
const CORAL_PIXELS = {
  [TILE.CORAL_BRANCH]: [
    E16, '..c.......c.....', '..b..c...cb..c..', '..b..b...b...b..', '..bb.b..bb..bb..', '...b.bb.b...b...',
    '...bb.b.b..bb...', '....b.bbb.bb....', '....bb.b.bb.....', '.....bbbbb......', '......abb.......',
    '......aab.......', '......aab.......', '......aab.......', '.....aaabb......', '....aaaabbb.....',
  ],
  [TILE.CORAL_FAN]: [
    E16, '.....cbcbc......', '...cbbcbcbbc....', '..cb.b.b.b.bc...', '..bbbbbbbbbbb...', '..cb.b.b.b.bc...',
    '...bbbbbbbbb....', '...b.b.b.b.b....', '....bbbbbbb.....', '....b.b.b.b.....', '.....bbbbb......',
    '......bab.......', '.......a........', '.......a........', '......aaa.......', '.....aaaaa......',
  ],
  [TILE.CORAL_BRAIN]: [
    E16, E16, E16, E16, E16, E16, E16, '.....bbbbbb.....', '...bbcbbcbbbb...', '..bcaacbbaacbb..',
    '.bbbcaabbcaabbb.', '.bcaabbcaabbcab.', '.bbbcaabbbcaabb.', '.abbbbcaabbbbba.', '..aaabbbbbbaaa..', '...aaaaaaaaaa...',
  ],
};
CORAL_TILES.forEach((t, i) => {
  ITEM_ART[TILE_DEFS[t].drop] = { cores: CORAL_PALETTES[[0, 1, 2][i]], pixels: CORAL_PIXELS[t] };
});

Object.assign(ITEM_ART, {
  [ITEM.TRIDENT]: {
    cores: { s: [120, 180, 190], S: [210, 244, 246], g: [236, 196, 80], c: [70, 140, 150], d: [36, 86, 96] },
    pixels: [
      '...........s...S', '..........s...S.', '.........s...S..', '........S...S...', '.........S.S...s',
      '..........S...s.', '.........g.s.s..', '........g...s...', '.......dc.......', '......dc........',
      '.....dc.........', '....dc..........', '...dc...........', '..dc............', '.dc.............', E16,
    ],
  },
  [ITEM.PEARL]: {
    cores: { p: [236, 232, 242], P: [196, 190, 214], w: [255, 255, 255], s: [160, 150, 186] },
    pixels: [E16, E16, E16, E16, '......pppp......', '.....pwwppp.....', '....ppwpppPp....', '....pppppPPp....',
      '....ppppPPPs....', '....pppPPPss....', '.....pPPPss.....', '......ssss......', E16, E16, E16, E16],
  },
  [ITEM.SHELL]: {
    cores: { a: [236, 150, 120], c: [252, 206, 176], b: [200, 104, 92], d: [150, 78, 70] },
    pixels: [E16, E16, E16, '.....cacaca.....', '....cacacaca....', '...acacacacab...', '...acacacacab...', '...aacacacabb...',
      '....aacacabb....', '.....aacabb.....', '......adbb......', '.....dddddd.....', '.....dd..dd.....', E16, E16, E16],
  },
  [ITEM.STARFISH]: {
    cores: { o: [226, 112, 58], O: [250, 160, 82], y: [255, 222, 140] },
    pixels: [E16, E16, '.......o........', '......ooo.......', '......oOo.......', '.oooooOOOooooo..', '..oOOOOyOOOOo...',
      '...ooOOOOOoo....', '....oOOOOOo.....', '....oOOoOOo.....', '...oOOo.oOOo....', '...oOo...oOo....', '..ooo.....ooo...', '..o.........o...', E16, E16],
  },
  [ITEM.RAW_FISH]: {
    cores: { b: [70, 110, 150], B: [110, 162, 204], L: [200, 222, 232], k: [20, 22, 30] },
    pixels: [E16, E16, E16, E16, E16, '.....bbbbb......', 'b...bBBBBBbb....', 'bb.bBBBBBBBkbb..', 'bbbBBBBBBBBBBbb.',
      'bb.bLLLLLLLLbb..', 'b...bLLLLLbb....', '.....bbbbb......', E16, E16, E16, E16],
  },
  [ITEM.COOKED_FISH]: {
    cores: { b: [120, 70, 40], B: [196, 124, 62], L: [232, 184, 112], k: [60, 30, 20] },
    pixels: [E16, E16, E16, E16, E16, '.....bbbbb......', 'b...bBBbBBbb....', 'bb.bBBbBBbBkbb..', 'bbbBBbBBbBBBBbb.',
      'bb.bLLLLLLLLbb..', 'b...bLLLLLbb....', '.....bbbbb......', E16, E16, E16, E16],
  },
  [ITEM.AIR_BOTTLE]: {
    cores: { c: [150, 100, 60], g: [200, 232, 242], G: [120, 160, 182], a: [150, 212, 242], w: [255, 255, 255] },
    pixels: [E16, '.......cc.......', '.......cc.......', '......gggg......', '.......gg.......', '......gaag......', '.....gaaaaG.....',
      '....gawaaaaG....', '....gaaaawaG....', '....gawaaaaG....', '....gaaaaaaG....', '....gaawaaaG....', '....gaaaaaaG....', '.....GGGGGG.....', E16, E16],
  },
  [ITEM.LILYPAD]: {
    cores: { g: [40, 110, 50], G: [80, 170, 70], p: [240, 150, 190], P: [255, 212, 230] },
    pixels: [E16, E16, E16, E16, '.....gggggg.....', '...ggGGGGGGgg...', '..gGGGGpPGGGGg..', '.gGGGGpPPpGGGGg.', '.gGGGGGpGGGGGGg.',
      '.gGGGGGGG.GGGGg.', '..gGGGGGG..GGg..', '...ggGGGG..gg...', '.....ggggg......', E16, E16, E16],
  },
  [ITEM.SEAWEED]: {
    cores: { g: [40, 120, 70], G: [90, 182, 92] },
    pixels: [E16, '......g.........', '.....gG....g....', '.....Gg...gG....', '......gG..Gg....', '......Gg...gG...', '.....gG....Gg...',
      '.....Gg...gG....', '......gG..Gg....', '......Gg...gG...', '.....gG....Gg...', '.....Gg...gG....', '......gG..Gg....', '......Gg..gG....', E16, E16],
  },
});
