'use strict';

const T = 16;       // tamanho do tile em pixels do mundo
const TEX = 64;     // texturas de material são 64x64 e se repetem a cada 4 tiles
const MARGIN = 4;   // borda irregular que "vaza" para fora do tile
const SPR = T + MARGIN * 2;

// ---------- Tiles (blocos do mundo) ----------
// Para um bloco novo: dê o próximo número aqui e registre com defTile(...) abaixo
const TILE = {
  AIR: 0, DIRT: 1, GRASS: 2, STONE: 3, TRUNK: 4, LEAVES: 5,
  PLANKS: 6, COAL_ORE: 7, IRON_ORE: 8, TORCH: 9, SAND: 10, BEDROCK: 11,
  DOOR: 12, BRICK: 13, DOOR_OPEN: 14, STONE_BRICK: 15, GLASS: 16, CHEST: 17, CAMPFIRE: 18,
  SNOW: 19, ICE: 20, MUD: 21, JUNGLE_GRASS: 22, SANDSTONE: 23, CACTUS: 24,
  COBWEB: 25, BEAM: 26, DRY_GRASS: 27, LADDER: 28,
  // Blocos de construção e enfeite (js/decor-tiles.js desenha todos eles)
  ROOF_RED: 29, ROOF_WOOD: 30, FENCE: 31, LANTERN: 32, CANDLE: 33,
  TABLE: 34, CHAIR: 35, BOOKSHELF: 36, BARREL: 37, FLOWER_POT: 38, RUG: 39,
  STUMP: 40, // toco que sobra quando a árvore é cortada no meio (não ganha copa)
};

// ---------- Paredes de fundo ----------
// Camada atrás dos blocos: preenche o fundo das casas (o céu para de aparecer no meio da
// parede), dá apoio para tochas e não atrapalha o jogador, que passa por cima delas.
const WALL = { NONE: 0, DIRT: 1, STONE: 2, PLANKS: 3, BRICK: 4, STONE_BRICK: 5, SANDSTONE: 6, WOOD: 7, SNOW: 8 };
// De qual bloco sai a textura de cada parede (a textura fica mais escura e fria)
const WALL_SOURCE = {
  [WALL.DIRT]: TILE.DIRT, [WALL.STONE]: TILE.STONE, [WALL.PLANKS]: TILE.PLANKS, [WALL.BRICK]: TILE.BRICK,
  [WALL.STONE_BRICK]: TILE.STONE_BRICK, [WALL.SANDSTONE]: TILE.SANDSTONE, [WALL.WOOD]: TILE.TRUNK, [WALL.SNOW]: TILE.SNOW,
};
const WALL_HARDNESS = 0.35; // segundos de picareta/machado para derrubar uma parede

// ---------- Itens ----------
// Para um item novo: dê o próximo número aqui e registre com defItem(...) abaixo
const ITEM = {
  DIRT: 1, STONE: 2, WOOD: 3, PLANKS: 4, COAL: 5, IRON: 6, TORCH: 7, SAND: 8, STICK: 9, DOOR: 10, BRICK: 11,
  WOOD_PICKAXE: 12, WOOD_AXE: 13, WOOD_SHOVEL: 14, WOOD_SWORD: 15, MEAT: 16, SCRAP: 17,
  STONE_PICKAXE: 18, STONE_AXE: 19, STONE_SHOVEL: 20, STONE_SWORD: 21, METAL_BAR: 22,
  METAL_PICKAXE: 23, METAL_AXE: 24, METAL_SHOVEL: 25, METAL_SWORD: 26,
  STONE_BRICK: 27, GLASS: 28, CHEST: 29, CAMPFIRE: 30, COOKED_MEAT: 31,
  SNOW: 32, ICE: 33, MUD: 34, SANDSTONE: 35, CACTUS: 36,
  EGG: 37, LEATHER: 38, BONE: 39, SILK: 40, GEL: 41, STINGER: 42,
  BANDAGE: 43, BOILED_EGG: 44, BONE_SWORD: 45, STINGER_SWORD: 46,
  WATER: 47, SNACK: 48, MEDKIT: 49, BLANKET: 50, SEATBELT: 51, WIRE: 52, BOLTS: 53, CLOTH: 54,
  BOW: 55, ARROW: 56, SADDLE: 57, TIGER_TOOTH: 58, TIGER_KNIFE: 59, // 60 era a Pelagem de tigre, removida
  // Paredes de fundo (item -> camada de trás), escada, corda e lança
  WALL_DIRT: 61, WALL_STONE: 62, WALL_PLANKS: 63, WALL_BRICK: 64, WALL_STONE_BRICK: 65, WALL_SANDSTONE: 66, WALL_WOOD: 67,
  LADDER: 68, ROPE: 69, SPEAR: 70,
  // Troféus do tigre, armaduras e marfim do elefante
  TIGER_CLAW: 71, TIGER_CLAWS: 72, TIGER_HEART: 73, LEATHER_ARMOR: 74, IRON_ARMOR: 75,
  IVORY: 76, IVORY_HORN: 77,
  // Construção e mobília
  ROOF_RED: 78, ROOF_WOOD: 79, FENCE: 80, LANTERN: 81, CANDLE: 82,
  TABLE: 83, CHAIR: 84, BOOKSHELF: 85, BARREL: 86, FLOWER_POT: 87, RUG: 88,
  // Martelos: a única ferramenta que derruba paredes de fundo
  WOOD_HAMMER: 89, STONE_HAMMER: 90, METAL_HAMMER: 91,
};

// Item de parede -> camada de fundo que ele coloca (e o caminho de volta, para o drop)
const WALL_ITEM = {
  [WALL.DIRT]: ITEM.WALL_DIRT, [WALL.STONE]: ITEM.WALL_STONE, [WALL.PLANKS]: ITEM.WALL_PLANKS, [WALL.BRICK]: ITEM.WALL_BRICK,
  [WALL.STONE_BRICK]: ITEM.WALL_STONE_BRICK, [WALL.SANDSTONE]: ITEM.WALL_SANDSTONE, [WALL.WOOD]: ITEM.WALL_WOOD, [WALL.SNOW]: ITEM.WALL_DIRT,
};

// opacity    = quanto de luz é perdido ao entrar no tile
// hardness   = segundos para quebrar com a mão
// ferramenta = qual ferramenta quebra mais rápido: 'picareta', 'machado' ou 'pa'
const TILE_DEFS = [];
function defTile(id, o) {
  TILE_DEFS[id] = Object.assign(
    { name: '', solid: true, hardness: 0.3, drop: null, light: 0, opacity: 3, color: [128, 128, 128] },
    o
  );
}
defTile(TILE.AIR,      { name: 'Ar', solid: false, hardness: 0, opacity: 1 });
defTile(TILE.DIRT,     { name: 'Terra', hardness: 0.25, drop: ITEM.DIRT, ferramenta: 'pa', color: [108, 70, 48] });
defTile(TILE.GRASS,    { name: 'Grama', hardness: 0.3, drop: ITEM.DIRT, ferramenta: 'pa', color: [76, 158, 52] });
defTile(TILE.STONE,    { name: 'Pedra', hardness: 0.7, drop: ITEM.STONE, ferramenta: 'picareta', color: [118, 118, 128] });
defTile(TILE.TRUNK,    { name: 'Tronco', solid: false, hardness: 0.5, drop: ITEM.WOOD, ferramenta: 'machado', opacity: 1, color: [104, 70, 44] });
defTile(TILE.STUMP,    { name: 'Toco', solid: false, hardness: 0.5, drop: ITEM.WOOD, ferramenta: 'machado', opacity: 1, color: [104, 70, 44] });
defTile(TILE.LEAVES,   { name: 'Folhas', solid: false, hardness: 0.1, opacity: 2, color: [58, 138, 48] });
defTile(TILE.PLANKS,   { name: 'Tábuas', hardness: 0.4, drop: ITEM.PLANKS, ferramenta: 'machado', reto: true, color: [164, 114, 70] });
// Porta: ocupa 3 tiles na vertical. Fechada é sólida; aberta deixa passar (veja DOOR_ART abaixo)
defTile(TILE.DOOR,      { name: 'Porta', hardness: 0.4, drop: ITEM.DOOR, ferramenta: 'machado', opacity: 2, color: [164, 114, 70] });
defTile(TILE.DOOR_OPEN, { name: 'Porta', solid: false, hardness: 0.4, drop: ITEM.DOOR, ferramenta: 'machado', opacity: 1, color: [164, 114, 70] });
defTile(TILE.COAL_ORE, { name: 'Minério de carvão', hardness: 0.9, drop: ITEM.COAL, ferramenta: 'picareta', color: [40, 38, 44] });
defTile(TILE.IRON_ORE, { name: 'Minério de ferro', hardness: 1.1, drop: ITEM.IRON, ferramenta: 'picareta', color: [206, 146, 104] });
defTile(TILE.TORCH,    { name: 'Tocha', solid: false, hardness: 0.05, drop: ITEM.TORCH, light: 14, opacity: 1, color: [255, 190, 60] });
defTile(TILE.SAND,     { name: 'Areia', gravity: true, hardness: 0.2, drop: ITEM.SAND, ferramenta: 'pa', color: [214, 188, 128] });
defTile(TILE.BEDROCK,  { name: 'Rocha matriz', hardness: Infinity, color: [52, 44, 62] });
defTile(TILE.BRICK,    { name: 'Tijolo', hardness: 0.7, drop: ITEM.BRICK, reto: true, color: [158, 83, 65] });
defTile(TILE.STONE_BRICK, { name: 'Tijolo de pedra', hardness: 0.8, drop: ITEM.STONE_BRICK, ferramenta: 'picareta', reto: true, color: [128, 126, 134] });
defTile(TILE.GLASS,    { name: 'Vidro', hardness: 0.3, drop: ITEM.GLASS, opacity: 1, reto: true, color: [170, 210, 225] });
// Baú e fogueira: não são sólidos, ficam apoiados no chão (desenhados pelo renderer)
defTile(TILE.CHEST,    { name: 'Baú', solid: false, hardness: 0.5, drop: ITEM.CHEST, ferramenta: 'machado', opacity: 1, color: [150, 100, 56] });
defTile(TILE.CAMPFIRE, { name: 'Fogueira', solid: false, hardness: 0.3, drop: ITEM.CAMPFIRE, light: 15, opacity: 1, color: [120, 80, 48] });
// Biomas: neve/gelo (tundra), lama/grama da selva, arenito e cacto (deserto)
defTile(TILE.SNOW,     { name: 'Neve', gravity: true, hardness: 0.2, drop: ITEM.SNOW, ferramenta: 'pa', color: [228, 236, 244] });
defTile(TILE.ICE,      { name: 'Gelo', hardness: 0.5, drop: ITEM.ICE, ferramenta: 'picareta', opacity: 2, color: [150, 200, 232] });
defTile(TILE.MUD,      { name: 'Lama', hardness: 0.25, drop: ITEM.MUD, ferramenta: 'pa', color: [84, 62, 50] });
defTile(TILE.JUNGLE_GRASS, { name: 'Grama da selva', hardness: 0.3, drop: ITEM.MUD, ferramenta: 'pa', color: [58, 150, 66] });
defTile(TILE.DRY_GRASS, { name: 'Grama seca', hardness: 0.3, drop: ITEM.DIRT, ferramenta: 'pa', color: [196, 170, 84] });
defTile(TILE.SANDSTONE, { name: 'Arenito', hardness: 0.6, drop: ITEM.SANDSTONE, ferramenta: 'picareta', color: [196, 150, 92] });
// Estruturas: teias em ruínas e vigas de madeira nas minas (não são sólidas)
defTile(TILE.COBWEB,   { name: 'Teia', solid: false, hardness: 0.15, drop: ITEM.SILK, opacity: 1, color: [220, 220, 226] });
defTile(TILE.BEAM,     { name: 'Viga de madeira', solid: false, hardness: 0.4, drop: ITEM.PLANKS, ferramenta: 'machado', opacity: 1, color: [120, 84, 50] });
defTile(TILE.CACTUS,   { name: 'Cacto', solid: false, hardness: 0.4, drop: ITEM.CACTUS, ferramenta: 'machado', opacity: 1, color: [70, 140, 70] });
// Escada: dá para subir e descer nela (js/player.js) e não bloqueia a passagem
defTile(TILE.LADDER,   { name: 'Escada', solid: false, hardness: 0.3, drop: ITEM.LADDER, ferramenta: 'machado', opacity: 1, color: [150, 106, 62] });

// ---------- Construção e mobília ----------
// `apoio` diz onde a peça se segura: 'chao' (precisa de piso), 'teto' (pendura) ou nada.
defTile(TILE.ROOF_RED,  { name: 'Telha de barro', hardness: 0.5, drop: ITEM.ROOF_RED, reto: true, color: [176, 76, 56] });
defTile(TILE.ROOF_WOOD, { name: 'Telha de madeira', hardness: 0.45, drop: ITEM.ROOF_WOOD, ferramenta: 'machado', reto: true, color: [124, 88, 56] });
defTile(TILE.BOOKSHELF, { name: 'Estante de livros', hardness: 0.5, drop: ITEM.BOOKSHELF, ferramenta: 'machado', reto: true, color: [126, 88, 54] });
defTile(TILE.FENCE,     { name: 'Cerca de madeira', solid: false, hardness: 0.3, drop: ITEM.FENCE, ferramenta: 'machado', opacity: 1, apoio: 'chao', color: [148, 106, 64] });
defTile(TILE.LANTERN,   { name: 'Lampião', solid: false, hardness: 0.25, drop: ITEM.LANTERN, light: 13, opacity: 1, color: [255, 206, 112] });
defTile(TILE.CANDLE,    { name: 'Vela', solid: false, hardness: 0.1, drop: ITEM.CANDLE, light: 9, opacity: 1, apoio: 'chao', color: [255, 232, 170] });
defTile(TILE.TABLE,     { name: 'Mesa', solid: false, hardness: 0.4, drop: ITEM.TABLE, ferramenta: 'machado', opacity: 1, apoio: 'chao', color: [156, 112, 68] });
defTile(TILE.CHAIR,     { name: 'Cadeira', solid: false, hardness: 0.35, drop: ITEM.CHAIR, ferramenta: 'machado', opacity: 1, apoio: 'chao', color: [150, 106, 62] });
defTile(TILE.BARREL,    { name: 'Barril', solid: false, hardness: 0.45, drop: ITEM.BARREL, ferramenta: 'machado', opacity: 1, apoio: 'chao', color: [140, 96, 56] });
defTile(TILE.FLOWER_POT,{ name: 'Vaso de flores', solid: false, hardness: 0.2, drop: ITEM.FLOWER_POT, opacity: 1, apoio: 'chao', color: [174, 96, 70] });
defTile(TILE.RUG,       { name: 'Tapete', solid: false, hardness: 0.2, drop: ITEM.RUG, opacity: 1, apoio: 'chao', color: [150, 62, 66] });

// Tiles não sólidos desenhados direto da textura (enfeites, escada, teia, cerca...).
// Os que têm tratamento próprio no renderer (tocha, baú, fogueira, porta, tronco) ficam de fora.
const FLAT_SPECIAL = [TILE.TORCH, TILE.CHEST, TILE.CAMPFIRE, TILE.DOOR, TILE.DOOR_OPEN, TILE.TRUNK, TILE.LEAVES];
const FLAT_TILES = [];
const FLAT_VERTICAL = []; // repetem de bloco para bloco na vertical (cacto, escada)
function buildFlatTiles() {
  // A tabela de sólidos (js/world.js) acompanha os blocos definidos depois do carregamento
  if (typeof SOLID !== "undefined") TILE_DEFS.forEach((d, t) => { SOLID[t] = d && d.solid ? 1 : 0; if (d) { OPACITY[t] = d.opacity; LIGHT_EMIT[t] = d.light; } });
  for (let t = 1; t < TILE_DEFS.length; t++)
    FLAT_TILES[t] = TILE_DEFS[t] && !TILE_DEFS[t].solid && !FLAT_SPECIAL.includes(t) ? 1 : 0;
  FLAT_VERTICAL[TILE.CACTUS] = 1;
  FLAT_VERTICAL[TILE.LADDER] = 1;
}

const ITEM_DEFS = [];
function defItem(id, o) { ITEM_DEFS[id] = Object.assign({ name: '', place: null }, o); }
defItem(ITEM.DIRT,   { name: 'Terra', place: TILE.DIRT });
defItem(ITEM.STONE,  { name: 'Pedra', place: TILE.STONE });
defItem(ITEM.WOOD,   { name: 'Madeira' });
defItem(ITEM.PLANKS, { name: 'Tábuas', place: TILE.PLANKS });
defItem(ITEM.COAL,   { name: 'Carvão' });
defItem(ITEM.IRON,   { name: 'Ferro' });
defItem(ITEM.TORCH,  { name: 'Tocha', place: TILE.TORCH });
defItem(ITEM.SAND,   { name: 'Areia', place: TILE.SAND });
defItem(ITEM.STICK,  { name: 'Graveto' });
defItem(ITEM.DOOR,   { name: 'Porta', place: TILE.DOOR });
defItem(ITEM.BRICK,  { name: 'Tijolo', place: TILE.BRICK });

// Ferramentas: `ferramenta` = tipo (o mesmo escrito no defTile), `nivel` = 0 madeira, 1 pedra, 2 ferro (veja TOOL_TIERS)
//              `velocidade` só vale para desmontar os destroços do avião
// Armas:       `dano` = vida que tira por golpe (a mão tira 1), `rapidez` = ritmo do golpe (1 = normal)
// maxStack: 1  = não empilha
defItem(ITEM.WOOD_PICKAXE, { name: 'Picareta de madeira', ferramenta: 'picareta', nivel: 0, velocidade: 2.5, maxStack: 1 });
defItem(ITEM.WOOD_AXE,     { name: 'Machado de madeira', ferramenta: 'machado', nivel: 0, velocidade: 2.5, maxStack: 1 });
defItem(ITEM.WOOD_SHOVEL,  { name: 'Pá de madeira', ferramenta: 'pa', nivel: 0, velocidade: 2.5, maxStack: 1 });
defItem(ITEM.WOOD_SWORD,   { name: 'Espada de madeira', dano: 4, rapidez: 0.7, maxStack: 1 });
defItem(ITEM.STONE_PICKAXE, { name: 'Picareta de pedra', ferramenta: 'picareta', nivel: 1, velocidade: 4, maxStack: 1 });
defItem(ITEM.STONE_AXE,     { name: 'Machado de pedra', ferramenta: 'machado', nivel: 1, velocidade: 4, maxStack: 1 });
defItem(ITEM.STONE_SHOVEL,  { name: 'Pá de pedra', ferramenta: 'pa', nivel: 1, velocidade: 4, maxStack: 1 });
defItem(ITEM.STONE_SWORD,   { name: 'Espada de pedra', dano: 6, rapidez: 0.8, maxStack: 1 });
defItem(ITEM.METAL_PICKAXE, { name: 'Picareta de ferro', ferramenta: 'picareta', nivel: 2, velocidade: 6, maxStack: 1 });
defItem(ITEM.METAL_AXE,     { name: 'Machado de ferro', ferramenta: 'machado', nivel: 2, velocidade: 6, maxStack: 1 });
defItem(ITEM.METAL_SHOVEL,  { name: 'Pá de ferro', ferramenta: 'pa', nivel: 2, velocidade: 6, maxStack: 1 });
defItem(ITEM.METAL_SWORD,   { name: 'Espada de ferro', dano: 9, rapidez: 0.95, maxStack: 1 });
// Martelo: só serve para derrubar paredes de fundo (blocos continuam com picareta, machado e pá)
defItem(ITEM.WOOD_HAMMER,  { name: 'Martelo de madeira', ferramenta: 'martelo', nivel: 0, velocidade: 2.5, maxStack: 1 });
defItem(ITEM.STONE_HAMMER, { name: 'Martelo de pedra', ferramenta: 'martelo', nivel: 1, velocidade: 4, maxStack: 1 });
defItem(ITEM.METAL_HAMMER, { name: 'Martelo de ferro', ferramenta: 'martelo', nivel: 2, velocidade: 6, maxStack: 1 });

// Níveis das ferramentas. golpe = segundos por batida, forca = quanto de um bloco de dureza 1
// cada batida tira, alcance = blocos da mão até o alvo.
// Madeira é o começo: lenta e com 1 bloco a MENOS de alcance. Pedra e ferro têm
// 1 bloco a MAIS de alcance (fixo) e ficam cada vez mais rápidos.
const TOOL_REACH_BASE = 3;
const TOOL_TIERS = [
  { nome: 'madeira', golpe: 0.5, forca: 0.26, alcance: TOOL_REACH_BASE - 1 },
  { nome: 'pedra', golpe: 0.42, forca: 0.34, alcance: TOOL_REACH_BASE + 1 },
  { nome: 'ferro', golpe: 0.34, forca: 0.5, alcance: TOOL_REACH_BASE + 1 },
];
for (const def of Object.values(ITEM_DEFS))
  if (def && def.ferramenta && def.nivel != null) {
    const tier = TOOL_TIERS[def.nivel];
    Object.assign(def, { golpe: tier.golpe, forca: tier.forca, alcanceFerramenta: tier.alcance });
  }
// cura = vida recuperada ao comer (botão direito com o item na mão)
defItem(ITEM.MEAT,         { name: 'Carne crua', cura: 10 });
defItem(ITEM.COOKED_MEAT,  { name: 'Carne assada', cura: 35 });
defItem(ITEM.SCRAP,        { name: 'Sucata de metal' }); // sai dos destroços do avião
defItem(ITEM.METAL_BAR,    { name: 'Barra de ferro' });
defItem(ITEM.STONE_BRICK,  { name: 'Tijolo de pedra', place: TILE.STONE_BRICK });
defItem(ITEM.GLASS,        { name: 'Vidro', place: TILE.GLASS });
defItem(ITEM.CHEST,        { name: 'Baú', place: TILE.CHEST });
defItem(ITEM.CAMPFIRE,     { name: 'Fogueira', place: TILE.CAMPFIRE });
defItem(ITEM.SNOW,         { name: 'Neve', place: TILE.SNOW });
defItem(ITEM.ICE,          { name: 'Gelo', place: TILE.ICE });
defItem(ITEM.MUD,          { name: 'Lama', place: TILE.MUD });
defItem(ITEM.SANDSTONE,    { name: 'Arenito', place: TILE.SANDSTONE });
defItem(ITEM.CACTUS,       { name: 'Cacto' });
// Drops dos bichos e o que se faz com eles
defItem(ITEM.EGG,          { name: 'Ovo', cura: 6 });
defItem(ITEM.LEATHER,      { name: 'Couro' });
defItem(ITEM.BONE,         { name: 'Osso' });
defItem(ITEM.SILK,         { name: 'Teia' });
defItem(ITEM.GEL,          { name: 'Gosma' });
defItem(ITEM.STINGER,      { name: 'Ferrão' });
defItem(ITEM.BANDAGE,      { name: 'Bandagem', cura: 45 });
defItem(ITEM.BOILED_EGG,   { name: 'Ovo cozido', cura: 22 });
defItem(ITEM.BONE_SWORD,   { name: 'Espada de osso', dano: 7, rapidez: 0.9, maxStack: 1 });
defItem(ITEM.STINGER_SWORD, { name: 'Espada de ferrão', dano: 12, rapidez: 1, maxStack: 1 });
// Coisas que sobram de um avião
defItem(ITEM.WATER,        { name: 'Garrafa de água', cura: 8 });
defItem(ITEM.SNACK,        { name: 'Salgadinho de bordo', cura: 12 });
defItem(ITEM.MEDKIT,       { name: 'Kit de primeiros socorros', cura: 60 });
defItem(ITEM.BLANKET,      { name: 'Cobertor' });
defItem(ITEM.SEATBELT,     { name: 'Cinto de segurança' });
defItem(ITEM.WIRE,         { name: 'Fios elétricos' });
defItem(ITEM.BOLTS,        { name: 'Parafusos' });
defItem(ITEM.CLOTH,        { name: 'Tecido' });
// arco = arma à distância (js/bow.js): usa flechas do inventário
defItem(ITEM.BOW,          { name: 'Arco', arco: true, maxStack: 1 });
defItem(ITEM.ARROW,        { name: 'Flecha' });
// Savana: sela para montar no elefante e os troféus do Tigre da Savana
// rapidez = golpe mais rápido que a espada normal; roupa.defesa = parte do dano que a roupa segura
defItem(ITEM.SADDLE,       { name: 'Sela', sela: true, maxStack: 1 });
defItem(ITEM.TIGER_TOOTH,  { name: 'Dente de tigre' });
defItem(ITEM.TIGER_KNIFE,  { name: 'Faca de dente de tigre', dano: 8, rapidez: 1.3, alcance: 22, maxStack: 1 });
// Paredes de fundo: `parede` = camada de trás que o item coloca (botão direito)
defItem(ITEM.WALL_DIRT,        { name: 'Parede de terra', parede: WALL.DIRT });
defItem(ITEM.WALL_STONE,       { name: 'Parede de pedra', parede: WALL.STONE });
defItem(ITEM.WALL_PLANKS,      { name: 'Parede de tábuas', parede: WALL.PLANKS });
defItem(ITEM.WALL_BRICK,       { name: 'Parede de tijolo', parede: WALL.BRICK });
defItem(ITEM.WALL_STONE_BRICK, { name: 'Parede de tijolo de pedra', parede: WALL.STONE_BRICK });
defItem(ITEM.WALL_SANDSTONE,   { name: 'Parede de arenito', parede: WALL.SANDSTONE });
defItem(ITEM.WALL_WOOD,        { name: 'Parede de tronco', parede: WALL.WOOD });
// Construção e utilidades
defItem(ITEM.LADDER,       { name: 'Escada', place: TILE.LADDER });
defItem(ITEM.ROPE,         { name: 'Corda' });
defItem(ITEM.SPEAR,        { name: 'Lança', dano: 9, alcance: 42, rapidez: 0.7, maxStack: 1 });
// Savana: troféus do chefe, armaduras e o marfim do elefante
defItem(ITEM.TIGER_CLAW,   { name: 'Garra de tigre' });
defItem(ITEM.TIGER_CLAWS,  { name: 'Garras de tigre', dano: 11, rapidez: 1.25, alcance: 20, maxStack: 1 });
defItem(ITEM.TIGER_HEART,  { name: 'Coração do tigre', vidaMaxima: 20, maxStack: 1 });
defItem(ITEM.LEATHER_ARMOR, { name: 'Peitoral de couro', roupa: { defesa: 0.18, visual: 'leather' }, maxStack: 1 });
defItem(ITEM.IRON_ARMOR,   { name: 'Peitoral de ferro', roupa: { defesa: 0.28, visual: 'iron' }, maxStack: 1 });
defItem(ITEM.IVORY,        { name: 'Marfim' });
defItem(ITEM.IVORY_HORN,   { name: 'Berrante de marfim', chamado: true, maxStack: 1 });
// Construção e mobília
defItem(ITEM.ROOF_RED,     { name: 'Telha de barro', place: TILE.ROOF_RED });
defItem(ITEM.ROOF_WOOD,    { name: 'Telha de madeira', place: TILE.ROOF_WOOD });
defItem(ITEM.FENCE,        { name: 'Cerca de madeira', place: TILE.FENCE });
defItem(ITEM.LANTERN,      { name: 'Lampião', place: TILE.LANTERN });
defItem(ITEM.CANDLE,       { name: 'Vela', place: TILE.CANDLE });
defItem(ITEM.TABLE,        { name: 'Mesa', place: TILE.TABLE });
defItem(ITEM.CHAIR,        { name: 'Cadeira', place: TILE.CHAIR });
defItem(ITEM.BOOKSHELF,    { name: 'Estante de livros', place: TILE.BOOKSHELF });
defItem(ITEM.BARREL,       { name: 'Barril', place: TILE.BARREL });
defItem(ITEM.FLOWER_POT,   { name: 'Vaso de flores', place: TILE.FLOWER_POT });
defItem(ITEM.RUG,          { name: 'Tapete', place: TILE.RUG });
// Item sem desenho ganha um ícone redondo com esta cor, ex.:
// defItem(ITEM.RUBI, { name: 'Rubi', color: [220, 40, 60] });

// =====================================================================================
//  TEXTURAS DESENHADAS COM LETRAS (16x16)
// =====================================================================================
//  pixels: 16 linhas, cada uma com exatamente 16 letras.
//  cores:  o que cada letra significa, em [vermelho, verde, azul] de 0 a 255.
//  '.' = pixel transparente (só em ITEM_ART; em blocos preencha tudo).
//
//  BLOCK_ART[TILE.X] -> textura do bloco no mundo (o ícone do item sai dela sozinho)
//  ITEM_ART[ITEM.X]  -> ícone de itens que não são blocos (ganha contorno automático)
//
//  Erros aparecem no console do navegador (F12) começando com [Arte].
// =====================================================================================

const CHEST_CORES = {
  a: [46, 28, 16], b: [150, 98, 54], c: [190, 134, 80], d: [106, 66, 36],
  m: [120, 124, 130], M: [196, 200, 204], l: [236, 196, 90], L: [150, 116, 50],
};
const CHEST_PIXELS = [
  '................',
  '................',
  '................',
  '.aaaaaaaaaaaaaa.',
  '.acccccccccccca.',
  '.abmbbbbbbbbmba.',
  '.abmbbbbbbbbmba.',
  '.addddddlldddda.',
  '.aMMMMMMlLMMMMa.',
  '.acccccclLcccca.',
  '.abmbbbbbbbbmba.',
  '.abmbdbbbbdbmba.',
  '.abmbbbbbbbbmba.',
  '.abmbbbbbbbbmba.',
  '.adddddddddddda.',
  '.aaaaaaaaaaaaaa.',
];
// Baú grande: 32x16, montado por partes (bordas, faixas de metal e a fechadura no meio)
const bigChestRow = (edge, fill, center) => {
  const side = (32 - edge.length * 2 - center.length) / 2;
  return edge + fill.repeat(side) + center + fill.repeat(side) + [...edge].reverse().join('');
};
const BIG_CHEST_PIXELS = [
  '.'.repeat(32), '.'.repeat(32), '.'.repeat(32),
  bigChestRow('.a', 'a', 'aa'),
  bigChestRow('.a', 'c', 'cc'),
  bigChestRow('.abm', 'b', 'mm'),
  bigChestRow('.abm', 'b', 'mm'),
  bigChestRow('.a', 'd', 'll'),
  bigChestRow('.a', 'M', 'lL'),
  bigChestRow('.a', 'c', 'lL'),
  bigChestRow('.abm', 'b', 'mm'),
  bigChestRow('.abmbd', 'b', 'mm'),
  bigChestRow('.abm', 'b', 'mm'),
  bigChestRow('.abm', 'b', 'mm'),
  bigChestRow('.a', 'd', 'dd'),
  bigChestRow('.a', 'a', 'aa'),
];

const CAMPFIRE_CORES = {
  s: [110, 108, 116], S: [160, 158, 166], k: [70, 68, 76], W: [160, 112, 66], d: [78, 50, 30],
  e: [255, 140, 50], E: [180, 60, 30], a: [60, 52, 50], y: [255, 230, 120], o: [255, 160, 50], r: [220, 80, 30],
};
const CAMPFIRE_BASE = [
  '...dW......Wd...',
  '....dWW..WWd....',
  '.....dWWWWd.....',
  '..SsdEeWWeEdsS..',
  '.SskaEeeeeEaksS.',
  '.kkkkaaaaaakkkk.',
];

const BLOCK_ART = {
  [TILE.CHEST]: { cores: CHEST_CORES, pixels: CHEST_PIXELS },
  [TILE.COBWEB]: {
    cores: { w: [230, 230, 236], W: [190, 192, 200] },
    pixels: [
      'w.......w......w',
      '.w......w.....w.',
      '..w....www...w..',
      '...wwwwWwwwww...',
      '...w..w.w..w.w..',
      '....w.w.w.w.w...',
      'wwwwwwwWwwwwwwww',
      '....w.w.w.w.w...',
      '...w..w.w..w.w..',
      '...wwwwWwwwww...',
      '..w....www...w..',
      '.w......w.....w.',
      'w.......w......w',
      '................',
      '................',
      '................',
    ],
  },
  [TILE.BEAM]: {
    cores: { a: [62, 42, 26], b: [116, 80, 48], c: [148, 106, 64], d: [96, 66, 40], e: [178, 178, 188] },
    pixels: Array.from({ length: 16 }, (_, y) => (y % 8 === 3 ? '.....abeeba.....' : y % 5 === 0 ? '.....abdcba.....' : '.....abccba.....')),
  },
  [TILE.CAMPFIRE]: { cores: CAMPFIRE_CORES, pixels: [...Array(10).fill('................'), ...CAMPFIRE_BASE] },
  // ---------- Mobília ----------
  // Tijolo, telhados, mesa, cadeira e estante são desenhados em js/furniture.js
  [TILE.FENCE]: {
    cores: { a: [66, 44, 24], b: [146, 104, 62], c: [188, 144, 94] },
    pixels: [
      '................',
      '................',
      '................',
      '..abc.....abc...',
      '..abc.....abc...',
      '.aaaaaaaaaaaaaa.',
      '.abbbbbbbbbbbba.',
      '.acccccccccccca.',
      '..abc.....abc...',
      '..abc.....abc...',
      '.aaaaaaaaaaaaaa.',
      '.abbbbbbbbbbbba.',
      '.acccccccccccca.',
      '..abc.....abc...',
      '..abc.....abc...',
      '................',
    ],
  },
  [TILE.LANTERN]: {
    cores: { a: [42, 34, 30], A: [126, 114, 98], g: [88, 76, 58], G: [250, 196, 96], Y: [255, 246, 196] },
    pixels: [
      '.......a........',
      '.......a........',
      '......aaa.......',
      '.....aAAAa......',
      '....aaaaaaa.....',
      '....aggggga.....',
      '...agGGGGGga....',
      '...agGYYYGga....',
      '...agGYYYGga....',
      '...agGYYYGga....',
      '...agGGGGGga....',
      '....aggggga.....',
      '....aaaaaaa.....',
      '.....aAAAa......',
      '......aaa.......',
      '................',
    ],
  },
  [TILE.CANDLE]: {
    cores: { f: [255, 168, 56], F: [255, 244, 190], w: [230, 222, 198], W: [252, 248, 238], d: [154, 124, 72], a: [82, 60, 34] },
    pixels: [
      '................',
      '................',
      '................',
      '.......f........',
      '......fFf.......',
      '......fff.......',
      '.......w........',
      '......www.......',
      '......wWw.......',
      '......wWw.......',
      '......wWw.......',
      '......wWw.......',
      '.....dddddd.....',
      '.....aaaaaa.....',
      '................',
      '................',
    ],
  },
  [TILE.BARREL]: {
    cores: { a: [56, 38, 20], C: [184, 142, 92], b: [140, 100, 58], M: [154, 154, 164] },
    pixels: [
      '................',
      '..aaaaaaaaaaaa..',
      '..aCCCCCCCCCCa..',
      '.abbbbbbbbbbbba.',
      '.aMMMMMMMMMMMMa.',
      '.abbbbbbbbbbbba.',
      '.abbbbbbbbbbbba.',
      '.abbbbbbbbbbbba.',
      '.aMMMMMMMMMMMMa.',
      '.abbbbbbbbbbbba.',
      '.abbbbbbbbbbbba.',
      '.abbbbbbbbbbbba.',
      '.aMMMMMMMMMMMMa.',
      '..abbbbbbbbbba..',
      '..aaaaaaaaaaaa..',
      '................',
    ],
  },
  [TILE.FLOWER_POT]: {
    cores: { g: [78, 140, 64], F: [236, 100, 124], p: [118, 56, 40], P: [192, 108, 78], Q: [158, 78, 54] },
    pixels: [
      '................',
      '................',
      '.....g...g......',
      '....gFg.gFg.....',
      '.....gFgFg......',
      '......ggg.......',
      '.......g........',
      '.......g........',
      '...pppppppp.....',
      '...pPPPPPPp.....',
      '....pppppp......',
      '....pQQQQp......',
      '....pQQQQp......',
      '.....pppp.......',
      '................',
      '................',
    ],
  },
  [TILE.RUG]: {
    cores: { a: [92, 34, 38], b: [152, 56, 60], R: [196, 90, 84] },
    pixels: [
      ...Array(11).fill('................'),
      '.aaaaaaaaaaaaaa.',
      '.abRbRbRbRbRbba.',
      '.aRbRbRbRbRbRRa.',
      '.aaaaaaaaaaaaaa.',
      '................',
    ],
  },

  // Escada: dois montantes com degraus a cada 4 pixels (emenda certinha entre um bloco e outro)
  [TILE.LADDER]: {
    cores: { a: [58, 38, 22], b: [128, 88, 48], c: [168, 122, 70], d: [206, 164, 104] },
    pixels: Array.from({ length: 16 }, (_, y) => (y % 4 === 1
      ? '.ab' + 'd'.repeat(10) + 'ba.'
      : y % 4 === 2 ? '.ab' + 'c'.repeat(10) + 'ba.' : '.abc........abc.')),
  },
};

// Porta: desenho de 16 de largura por 48 de altura (3 blocos)
const DOOR_ART = {
  cores: {
    a: [52, 32, 20],    // contorno
    b: [150, 100, 60],  // madeira
    c: [182, 130, 84],  // madeira clara
    d: [116, 76, 44],   // madeira escura
    e: [236, 196, 84],  // maçaneta
    f: [90, 90, 104],   // dobradiça
    w: [160, 208, 236], // vidro
    x: [96, 70, 46],    // travessa da janela
  },
  fechada: [
    'aaaaaaaaaaaaaaaa',
    'acccccccccccccca',
    'adddddddddddddda',
    'acbaaaaaaaaaabda',
    'acbawwwwxwwwabda',
    'acbawwwwxwwwabda',
    'acbawwwwxwwwabda',
    'acbaxxxxxxxxabda',
    'acbawwwwxwwwabda',
    'acbawwwwxwwwabda',
    'acbawwwwxwwwabda',
    'acbaaaaaaaaaabda',
    'acbbbbbdcbbbbbda',
    'afbbbbbdcbbbbbda',
    'acbbbbbdcbbbbbda',
    'acbbbbbdcbbbbbda',
    'acbbbbbdcbbbbbda',
    'acbbbbbdcbbbbbda',
    'acbbbbbdcbbbbbda',
    'acbbbbbdcbbbbbda',
    'acbbbbbdcbbbbbda',
    'acbbbbbdcbbbbbda',
    'acccccccccccccca',
    'adddddddddddddda',
    'acbbbbbdcbbbbbda',
    'acbbbbbdcbbbebda',
    'acbbbbbdcbbbebda',
    'acbbbbbdcbbbbbda',
    'acbbbbbdcbbbbbda',
    'acbbbbbdcbbbbbda',
    'acbbbbbdcbbbbbda',
    'acbbbbbdcbbbbbda',
    'acbbbbbdcbbbbbda',
    'acbbbbbdcbbbbbda',
    'afbbbbbdcbbbbbda',
    'acbbbbbdcbbbbbda',
    'acbbbbbdcbbbbbda',
    'acbbbbbdcbbbbbda',
    'acbbbbbdcbbbbbda',
    'acbbbbbdcbbbbbda',
    'acbbbbbdcbbbbbda',
    'acbbbbbdcbbbbbda',
    'acbbbbbdcbbbbbda',
    'acbbbbbdcbbbbbda',
    'acccccccccccccca',
    'adddddddddddddda',
    'acbbbbbdcbbbbbda',
    'aaaaaaaaaaaaaaaa',
  ],
  // aberta: vista de lado, presa nas dobradiças da esquerda
  aberta: [
    'aaaaa...........',
    'accca...........',
    'addda...........',
    'acwda...........',
    'acwda...........',
    'acwda...........',
    'acwda...........',
    'acxda...........',
    'acwda...........',
    'acwda...........',
    'acwda...........',
    'acbda...........',
    'acbda...........',
    'afbda...........',
    'acbda...........',
    'acbda...........',
    'acbda...........',
    'acbda...........',
    'acbda...........',
    'acbda...........',
    'acbda...........',
    'acbda...........',
    'accca...........',
    'addda...........',
    'acbda...........',
    'acbdae..........',
    'acbdae..........',
    'acbda...........',
    'acbda...........',
    'acbda...........',
    'acbda...........',
    'acbda...........',
    'acbda...........',
    'acbda...........',
    'afbda...........',
    'acbda...........',
    'acbda...........',
    'acbda...........',
    'acbda...........',
    'acbda...........',
    'acbda...........',
    'acbda...........',
    'acbda...........',
    'acbda...........',
    'accca...........',
    'addda...........',
    'acbda...........',
    'aaaaa...........',
  ],
};

// Cores compartilhadas pelas ferramentas de madeira
const WOOD_TOOL_CORES = {
  h: [150, 104, 62],  // cabo
  H: [96, 64, 40],    // cabo escuro
  l: [196, 150, 100], // brilho do cabo
  w: [176, 128, 80],  // cabeça
  W: [118, 80, 48],   // cabeça escura
  L: [224, 184, 130], // cabeça clara
  t: [84, 66, 58],    // amarração
  T: [138, 116, 98],  // amarração clara
};

const ITEM_ART = {
  // Porta em arco com janela, tábuas e maçaneta (ITEM_ART também pode trocar o ícone de blocos)
  [ITEM.DOOR]: {
    cores: {
      b: [150, 100, 60], c: [194, 142, 92], d: [104, 68, 40], e: [246, 206, 92],
      w: [132, 188, 224], W: [222, 242, 252], x: [88, 62, 40],
    },
    pixels: [
      '................',
      '......dddd......',
      '....dccccccd....',
      '...dcwWwxwwbd...',
      '...dcWwwxwwbd...',
      '...dcxxxxxxbd...',
      '...dcwwwxwwbd...',
      '...dcddddddbd...',
      '...dcbcdbcdbd...',
      '...dcbcdbcdbd...',
      '...dcbcdbecbd...',
      '...dcbcdbcdbd...',
      '...dcbcdbcdbd...',
      '...dddddddddd...',
      '................',
      '................',
    ],
  },

  // Tora com casca e anéis na ponta
  [ITEM.WOOD]: {
    cores: {
      c: [140, 98, 62], b: [104, 70, 44], B: [72, 46, 28],
      R: [168, 118, 70], r: [226, 190, 134], k: [178, 128, 76],
    },
    pixels: [
      '................',
      '................',
      '................',
      '................',
      '.ccccccccccRRR..',
      '.bbbcbbbbbRrrrR.',
      '.bbBbbbbBbRrkrR.',
      '.bbbbBbbbbRkrkR.',
      '.BbbbbbBbbRkrkR.',
      '.bbBbbbbbbRrkrR.',
      '.BBBBBBBBBRrrrR.',
      '..BBBBBBBBBRRR..',
      '................',
      '................',
      '................',
      '................',
    ],
  },

  // Pedaço de carvão facetado com brilho
  [ITEM.COAL]: {
    cores: { a: [22, 20, 26], b: [44, 42, 52], c: [70, 68, 82], d: [104, 104, 122], e: [176, 180, 198] },
    pixels: [
      '................',
      '................',
      '................',
      '......bbb.......',
      '....bbccdbb.....',
      '...bccdddcbb....',
      '..bbcdeddcbba...',
      '..bccdddccbbaa..',
      '.bbcccccbbbcba..',
      '.bcdcbbbbccdcba.',
      '.bcddcbbbcdecba.',
      '.abcccbabbccbaa.',
      '..aabbbaaabbaa..',
      '....aaa..aaa....',
      '................',
      '................',
    ],
  },

  // Minério de ferro: rocha cinza com pepitas cor de ferrugem
  [ITEM.IRON]: {
    cores: {
      a: [60, 56, 62], b: [98, 94, 102], c: [132, 128, 136], d: [172, 168, 176],
      o: [200, 132, 90], O: [146, 84, 54], p: [240, 194, 150],
    },
    pixels: [
      '................',
      '................',
      '................',
      '......bbbb......',
      '....bbccddb.....',
      '...bccdpocb.....',
      '..bccdooOccb....',
      '..bcccOOcddcb...',
      '.bccdccccpocb...',
      '.bcpocbccooOcb..',
      '.bcoOcbbcOOccb..',
      '.abccbbbccccba..',
      '..aabbbbbbbaa...',
      '....aaaaaaa.....',
      '................',
      '................',
    ],
  },

  // Tocha: cabo, pano enrolado e chama
  [ITEM.TORCH]: {
    cores: {
      h: [150, 104, 62], H: [92, 62, 38], w: [128, 116, 100], W: [84, 76, 68],
      y: [255, 244, 170], o: [255, 178, 58], r: [230, 94, 34], R: [158, 50, 26],
    },
    pixels: [
      '................',
      '........r.......',
      '.......ro.......',
      '......roor......',
      '......royor.....',
      '.....royyor.....',
      '.....ryyyyr.....',
      '.....RoyyoR.....',
      '......WwwW......',
      '......wWwW......',
      '.......hH.......',
      '.......hH.......',
      '.......hH.......',
      '.......hH.......',
      '.......HH.......',
      '................',
    ],
  },

  // Graveto com um raminho e uma folha
  [ITEM.STICK]: {
    cores: { h: [160, 114, 70], H: [104, 70, 42], l: [204, 160, 108], g: [110, 166, 66], G: [66, 112, 46] },
    pixels: [
      '................',
      '................',
      '............lh..',
      '...........lhH..',
      '..........lhH...',
      '..gg.....lhH....',
      '.gGg.H..lhH.....',
      '..G...HlhH......',
      '......lhH.......',
      '.....lhH........',
      '....lhH.........',
      '...lhH..........',
      '..lhH...........',
      '.lhH............',
      '.HH.............',
      '................',
    ],
  },

  // Ferramentas: desenhe com o cabo terminando perto do canto de baixo à esquerda
  // (é por ali que o personagem segura)
  [ITEM.WOOD_PICKAXE]: {
    cores: WOOD_TOOL_CORES,
    pixels: [
      '................',
      '....LLL.........',
      '...WwwLLL.......',
      '....WWwwLL......',
      '.......WwwL.....',
      '........tTwL....',
      '.......lhtWwL...',
      '......lhH..WwL..',
      '.....lhH....WwL.',
      '....lhH.....WwL.',
      '...lhH.......WL.',
      '..lhH........W..',
      '.lhH............',
      '.HH.............',
      '................',
      '................',
    ],
  },

  [ITEM.WOOD_AXE]: {
    cores: WOOD_TOOL_CORES,
    pixels: [
      '................',
      '..........W.....',
      '.........WwL....',
      '........tWwLL...',
      '.......ltTwLLL..',
      '......lhHWwLLLL.',
      '.....lhH.WwLLL..',
      '....lhH...WLL...',
      '...lhH.....L....',
      '..lhH...........',
      '.lhH............',
      '.HH.............',
      '................',
      '................',
      '................',
      '................',
    ],
  },

  // Martelo: cabeça de marreta atravessada na ponta do cabo
  [ITEM.WOOD_HAMMER]: {
    cores: WOOD_TOOL_CORES,
    pixels: [
      '................',
      '..........WW....',
      '.........WwLW...',
      '........WwwLLW..',
      '.......WwwwLLLW.',
      '........WwwLLLW.',
      '.......l.WwwLW..',
      '......lhH.WwW...',
      '.....lhH...W....',
      '....lhH.........',
      '...lhH..........',
      '..lhH...........',
      '.lhH............',
      '.HH.............',
      '................',
      '................',
    ],
  },

  [ITEM.WOOD_SHOVEL]: {
    cores: WOOD_TOOL_CORES,
    pixels: [
      '................',
      '...........LLW..',
      '..........LwwwW.',
      '.........LwLwwW.',
      '........LwLwwWW.',
      '.......tLwwwWW..',
      '......tTWwWW....',
      '.....lhH........',
      '....lhH.........',
      '...lhH..........',
      '..lhH...........',
      '.lhH............',
      '.tHt............',
      '..t.............',
      '................',
      '................',
    ],
  },

  // Espada: fio claro, sulco no meio, costas escuras, guarda cruzada, cabo enrolado e pomo
  [ITEM.WOOD_SWORD]: {
    cores: {
      L: [236, 200, 150], w: [184, 136, 86], W: [112, 76, 46],
      G: [96, 64, 40], g: [158, 112, 68], h: [70, 48, 34], H: [128, 92, 62], p: [218, 176, 98],
    },
    pixels: [
      '................',
      '.............LW.',
      '............LwW.',
      '...........LwW..',
      '..........LwW...',
      '.........LwW....',
      '........LwW.....',
      '.......LwW......',
      '..G...LwW.......',
      '...G.LwW........',
      '....GgW.........',
      '....hGg.........',
      '...hH.Gg........',
      '..hH............',
      '.pp.............',
      '................',
    ],
  },

  // Coxa assada: carne tostada, gordura e osso
  [ITEM.MEAT]: {
    cores: {
      h: [240, 132, 120], m: [212, 78, 80], M: [156, 44, 54], s: [118, 50, 38],
      f: [250, 222, 208], F: [214, 168, 152], b: [246, 240, 224], B: [196, 186, 166],
    },
    pixels: [
      '................',
      '................',
      '.....FFFF.......',
      '...FfhhhhfF.....',
      '..Ffhhmmmmfs....',
      '.Ffhmmmmmmmms...',
      '.Fhmmmmmmmmmms..',
      '.Fmmmmmmmmmmms..',
      '.FmmmmMmmmmmMs..',
      '.smMmmmmmmMMs...',
      '..smMMmmMMMsb...',
      '...ssMMMMssBbb..',
      '.....ssss..bBbb.',
      '...........bbBb.',
      '............BB..',
      '................',
    ],
  },

  // Sucata: chapas de alumínio retorcidas com rebites, ferrugem e a faixa azul do avião
  [ITEM.SCRAP]: {
    cores: {
      a: [236, 240, 236], b: [190, 198, 200], c: [138, 146, 152], d: [88, 94, 102], r: [58, 62, 68],
      u: [58, 92, 146], U: [96, 132, 184], k: [52, 42, 40], o: [176, 98, 54],
    },
    pixels: [
      '................',
      '................',
      '.......aab......',
      '......abbbcd....',
      '....aabrbbcd....',
      '..aabbbbbbcdd...',
      '.abUUUbbbccd....',
      '.buuuubbrbcdd...',
      '.cbbbbbbbbccd...',
      '..cbbkkbbbbcda..',
      '..dcbbbkbbbbabb.',
      '...dccbboobbbbc.',
      '....ddccbrbbccd.',
      '......ddccccdd..',
      '........dddd....',
      '................',
    ],
  },

  // Exemplo de ícone de item (tire as barras // para usar):
  // [ITEM.RUBI]: {
  //   cores: { a: [150, 20, 40], b: [220, 40, 60], c: [255, 150, 160] },
  //   pixels: [
  //     '................',
  //     '................',
  //     '................',
  //     '.....aaaaaa.....',
  //     '....abbccbba....',
  //     '...abbcbbbbba...',
  //     '..abbbbbbbbbba..',
  //     '..aaaaaaaaaaaa..',
  //     '...abbbbbbbba...',
  //     '....abbbbbba....',
  //     '.....abbbba.....',
  //     '......abba......',
  //     '.......aa.......',
  //     '................',
  //     '................',
  //     '................',
  //   ],
  // },
};

// Ferramentas de pedra e metal: mesmo desenho das de madeira, com outra cor na cabeça/lâmina
const recolorArt = (id, cores) => ({ cores: { ...ITEM_ART[id].cores, ...cores }, pixels: ITEM_ART[id].pixels });
const STONE_HEAD = { w: [150, 150, 160], W: [92, 92, 104], L: [200, 200, 210] };
const METAL_HEAD = { w: [196, 204, 214], W: [112, 120, 134], L: [246, 250, 252] };
for (const [wood, stone, metal] of [
  [ITEM.WOOD_PICKAXE, ITEM.STONE_PICKAXE, ITEM.METAL_PICKAXE], [ITEM.WOOD_AXE, ITEM.STONE_AXE, ITEM.METAL_AXE],
  [ITEM.WOOD_SHOVEL, ITEM.STONE_SHOVEL, ITEM.METAL_SHOVEL], [ITEM.WOOD_SWORD, ITEM.STONE_SWORD, ITEM.METAL_SWORD],
  [ITEM.WOOD_HAMMER, ITEM.STONE_HAMMER, ITEM.METAL_HAMMER],
]) {
  ITEM_ART[stone] = recolorArt(wood, STONE_HEAD);
  ITEM_ART[metal] = recolorArt(wood, METAL_HEAD);
}
ITEM_ART[ITEM.COOKED_MEAT] = recolorArt(ITEM.MEAT, {
  h: [200, 124, 72], m: [156, 84, 46], M: [108, 54, 30], s: [70, 36, 24], f: [232, 194, 142], F: [192, 142, 98],
});
ITEM_ART[ITEM.CHEST] = { cores: CHEST_CORES, pixels: CHEST_PIXELS };

// Sela de couro com manta e fivelas
ITEM_ART[ITEM.SADDLE] = {
  cores: { a: [74, 40, 24], b: [120, 68, 38], c: [164, 100, 56], d: [206, 146, 88], e: [236, 200, 96], s: [58, 34, 22] },
  pixels: [
    '................',
    '................',
    '................',
    '.....dddddd.....',
    '...ddccccccdd...',
    '..dcccbbbbcccd..',
    '.dccbbbbbbbbccd.',
    '.dcbbbbbbbbbbcd.',
    '.abbbbbbbbbbbba.',
    '..aaabbbbbbaaa..',
    '....s.aaaa.s....',
    '....s......s....',
    '....s......s....',
    '...eee....eee...',
    '................',
    '................',
  ],
};

// Presa curva de marfim
ITEM_ART[ITEM.TIGER_TOOTH] = {
  cores: { w: [250, 246, 230], W: [220, 210, 180], g: [170, 156, 120], r: [196, 140, 120] },
  pixels: [
    '................',
    '................',
    '......rrr.......',
    '.....rWWWr......',
    '.....WwwwW......',
    '.....Wwwwg......',
    '......wwwg......',
    '......Wwwg......',
    '.......wwg......',
    '.......Wwg......',
    '........wg......',
    '........Wg......',
    '.........g......',
    '................',
    '................',
    '................',
  ],
};

// Faca: lâmina de dente, guarda listrada e cabo de couro
ITEM_ART[ITEM.TIGER_KNIFE] = {
  cores: { w: [250, 244, 226], W: [216, 204, 172], g: [150, 136, 104], e: [214, 120, 40], c: [120, 72, 40], d: [70, 40, 24] },
  pixels: [
    '................',
    '................',
    '.............w..',
    '............wW..',
    '...........wWg..',
    '..........wWg...',
    '.........wWg....',
    '........wWg.....',
    '.....e.wWg......',
    '......eWg.......',
    '.....ccee.......',
    '....ccc.e.......',
    '...ccc..........',
    '..dcc...........',
    '..dd............',
    '................',
  ],
};

// Tapete: no mundo ele fica rente ao chão, então o ícone mostra a peça inteira
ITEM_ART[ITEM.RUG] = {
  cores: { a: [92, 34, 38], b: [152, 56, 60], R: [196, 90, 84] },
  pixels: [
    '................',
    '................',
    '...aaaaaaaaaa...',
    '..aRRRRRRRRRRa..',
    '.abbbbbbbbbbbba.',
    '.aRRRRRRRRRRRRa.',
    '.abbbbbbbbbbbba.',
    '.aRRRRRRRRRRRRa.',
    '..aRRRRRRRRRRa..',
    '...aaaaaaaaaa...',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
};

// Corda enrolada
ITEM_ART[ITEM.ROPE] = {
  cores: { r: [166, 128, 72], h: [212, 180, 116], d: [110, 80, 44] },
  pixels: [
    '................',
    '................',
    '....hhhhhh......',
    '...hrrrrrrh.....',
    '..hrrhhhhrrh....',
    '..hrh....hrh....',
    '..hrh....hrh....',
    '..hrrh..hrrh....',
    '...hrrhhrrh.....',
    '....hrrrrh......',
    '...hrrrrrrh.....',
    '..hrrhhhhrrh....',
    '..hrh....hrh....',
    '...hrrhhrrh.....',
    '....hhhhhh......',
    '................',
  ],
};

// Lança: haste comprida de graveto com ponta de pedra amarrada
ITEM_ART[ITEM.SPEAR] = {
  cores: { s: [148, 150, 160], S: [206, 208, 216], h: [214, 180, 110], c: [150, 106, 62], d: [96, 64, 36] },
  pixels: [
    '.............ss.',
    '............sSs.',
    '...........sSSs.',
    '..........sSSs..',
    '..........hSs...',
    '.........hhs....',
    '........chh.....',
    '.......cch......',
    '......ccc.......',
    '.....ccc........',
    '....ccc.........',
    '...ccc..........',
    '..ccc...........',
    '.ccd............',
    '.dd.............',
    '................',
  ],
};

// Garra curva de tigre, ainda com o couro da pata na base
ITEM_ART[ITEM.TIGER_CLAW] = {
  cores: { k: [46, 34, 30], K: [214, 198, 168], w: [248, 244, 232], W: [176, 160, 134], b: [58, 36, 22], B: [124, 80, 44] },
  pixels: [
    '................',
    '................',
    '.........bbb....',
    '........bBBBb...',
    '.......bBBBBb...',
    '......kKKKk.....',
    '.....wKKKk......',
    '....wwKKk.......',
    '...wwwKk........',
    '..wwwWk.........',
    '..wwWk..........',
    '..wWk...........',
    '..Wk............',
    '..k.............',
    '................',
    '................',
  ],
};

// Manopla de couro com três garras presas
ITEM_ART[ITEM.TIGER_CLAWS] = {
  cores: { w: [248, 244, 232], W: [176, 160, 134], c: [70, 44, 28], L: [150, 98, 56], d: [206, 150, 84] },
  pixels: [
    '................',
    '................',
    '...w....w....w..',
    '...w....w....w..',
    '..wW...wW...wW..',
    '..W.....W....W..',
    '.cccccccccccccc.',
    '.cLLLLLLLLLLLLc.',
    '.cLddLddLddLLLc.',
    '.cLLLLLLLLLLLLc.',
    '.ccccccccccccc..',
    '..cLLLLLLLLLc...',
    '...ccccccccc....',
    '................',
    '................',
    '................',
  ],
};

// Coração do tigre: ainda quente, bate na mochila
ITEM_ART[ITEM.TIGER_HEART] = {
  cores: { r: [128, 28, 34], R: [200, 52, 56], d: [84, 18, 26] },
  pixels: [
    '................',
    '................',
    '...rr.....rr....',
    '..rRRr...rRRr...',
    '.rRRRRr.rRRRRr..',
    '.rRRRRRrRRRRRr..',
    '.rRRRRRRRRRRRr..',
    '..rRRRRRRRRRr...',
    '..dRRRRRRRRRd...',
    '...dRRRRRRRd....',
    '....dRRRRRd.....',
    '.....dRRRd......',
    '......dRd.......',
    '.......d........',
    '................',
    '................',
  ],
};

// Peitoral: couro costurado (a versão de ferro é a mesma peça recolorida)
ITEM_ART[ITEM.LEATHER_ARMOR] = {
  cores: { L: [92, 58, 32], h: [156, 104, 58], d: [206, 158, 96] },
  pixels: [
    '................',
    '..LL......LL....',
    '.LhhL....LhhL...',
    '.LhhhLLLLhhhL...',
    '.LhhhhhhhhhhL...',
    '.LhhhddhhdhhL...',
    '.LhhhhhhhhhhL...',
    '.LhhdhhhhhdhL...',
    '.LhhhhhhhhhhL...',
    '.LhhhhhhhhhhL...',
    '.LhhdhhhhhdhL...',
    '.LhhhhhhhhhhL...',
    '..LhhhhhhhhL....',
    '..LLLLLLLLLL....',
    '................',
    '................',
  ],
};
ITEM_ART[ITEM.IRON_ARMOR] = recolorArt(ITEM.LEATHER_ARMOR, { L: [62, 68, 78], h: [136, 144, 156], d: [198, 206, 214] });

// Presa grossa de elefante (mais amarelada e gorda que o dente do tigre)
ITEM_ART[ITEM.IVORY] = {
  cores: { w: [244, 234, 198], W: [204, 190, 150], g: [150, 132, 96] },
  pixels: [
    '................',
    '................',
    '..........wwWW..',
    '.........wwwWW..',
    '........wwwwW...',
    '.......wwwwW....',
    '......wwwwW.....',
    '.....wwwwW......',
    '....wwwwW.......',
    '...gwwwW........',
    '..ggwwW.........',
    '..gggW..........',
    '..ggW...........',
    '...gg...........',
    '................',
    '................',
  ],
};
// Berrante: presa oca com o cordão de couro amarrado no meio
ITEM_ART[ITEM.IVORY_HORN] = {
  cores: { w: [246, 242, 226], W: [200, 190, 164], c: [138, 88, 46], g: [96, 86, 66] },
  pixels: [
    '................',
    '.............www',
    '............wwWw',
    '...........wwW..',
    '.........wwwW...',
    '.......wwwwW....',
    '.....ccwwwW.....',
    '....cwwwwW......',
    '...ccwwwW.......',
    '..cwwwW.........',
    '..ccwW..........',
    '...gg...........',
    '................',
    '................',
    '................',
    '................',
  ],
};

const EGG_PIXELS = [
  '................',
  '................',
  '......eeee......',
  '.....ehheee.....',
  '....ehheeeee....',
  '....eheeeeee....',
  '...eeeeeeeeEe...',
  '...eeeeeeeeEe...',
  '...eeeeeeeEEe...',
  '...EeeeeeeEEE...',
  '....EeeeeEEE....',
  '.....dEEEEd.....',
  '......dddd......',
  '................',
  '................',
  '................',
];
Object.assign(ITEM_ART, {
  [ITEM.EGG]: { cores: { e: [244, 236, 220], E: [214, 200, 178], h: [255, 252, 244], d: [180, 164, 140] }, pixels: EGG_PIXELS },
  [ITEM.BOILED_EGG]: {
    cores: { e: [248, 244, 234], E: [214, 204, 184], h: [255, 255, 250], d: [180, 164, 140], y: [250, 196, 60] },
    pixels: EGG_PIXELS.map((r, i) => (i >= 6 && i <= 8 ? r.slice(0, 6) + 'yyy' + r.slice(9) : r)),
  },
  [ITEM.LEATHER]: {
    cores: { l: [168, 112, 68], L: [128, 82, 48], h: [196, 140, 92], d: [92, 58, 34] },
    pixels: [
      '................',
      '..dlllllllllld..',
      '...lhhlllllll...',
      '...lhllLllLll...',
      '..llllllllllll..',
      '..lllLlllllLll..',
      '...llllLllll....',
      '...lllllllllL...',
      '..llLllllllll...',
      '..lllllllllll...',
      '...LlllllllL....',
      '..d...llll...d..',
      '................',
      '................',
      '................',
      '................',
    ],
  },
  [ITEM.BONE]: {
    cores: { b: [236, 230, 210], B: [196, 186, 164], d: [150, 140, 120] },
    pixels: [
      '................',
      '................',
      '..bb............',
      '.bbbb...........',
      '.bbBbb..........',
      '..bbBbb.........',
      '...bbBbb........',
      '....bbBbb.......',
      '.....bbBbb......',
      '......bbBbb.....',
      '.......bbBbb....',
      '........bbBbb...',
      '.........bbBbb..',
      '..........bbdd..',
      '...........dd...',
      '................',
    ],
  },
  [ITEM.SILK]: {
    cores: { s: [236, 236, 240], S: [190, 192, 204], d: [140, 142, 156] },
    pixels: [
      '................',
      '................',
      '.....ssssss.....',
      '....sSsssSss....',
      '...sssSsSssss...',
      '...sSssSssSss...',
      '..ssssSsSsssss..',
      '..sSsssSsssSss..',
      '..ssSsSsSsSsss..',
      '..sssSsssSssss..',
      '...ssSssSsSss...',
      '...sssSsssSss...',
      '....ssssSsss....',
      '.....dddddd.....',
      '................',
      '................',
    ],
  },
  [ITEM.GEL]: {
    cores: { g: [110, 196, 100], G: [70, 150, 70], h: [200, 240, 180], d: [44, 104, 52] },
    pixels: [
      '................',
      '................',
      '................',
      '.......gg.......',
      '.....gghgg......',
      '....ghhgggg.....',
      '....ghgggggg....',
      '...ggggggggGg...',
      '...gggggggGGg...',
      '..ggggggggGGGg..',
      '..GgggggggGGGG..',
      '...GGggggGGGG...',
      '....dGGGGGGd....',
      '.....dddddd.....',
      '................',
      '................',
    ],
  },
  [ITEM.STINGER]: {
    cores: { s: [60, 44, 40], S: [110, 80, 60], r: [200, 60, 50], h: [230, 200, 150] },
    pixels: [
      '................',
      '.............h..',
      '............hS..',
      '...........hSs..',
      '...........Ss...',
      '..........Sss...',
      '.........SSs....',
      '........SSss....',
      '.......SSss.....',
      '.....rSSsss.....',
      '....rrSsss......',
      '...rrsss........',
      '..rrss..........',
      '..rs............',
      '................',
      '................',
    ],
  },
  [ITEM.BANDAGE]: {
    cores: { w: [240, 236, 226], W: [206, 200, 188], r: [196, 54, 50], d: [160, 150, 136] },
    pixels: [
      '................',
      '................',
      '.....wwwwww.....',
      '....wWWWWWWw....',
      '...wWwwwwwwWw...',
      '...wWwrrrrwWw...',
      '...wWwrwwrwWw...',
      '...wWwrrrrwWw...',
      '...wWwwwwwwWw...',
      '....wWWWWWWw....',
      '.....wwwwwwdd...',
      '...........dwd..',
      '............dwd.',
      '................',
      '................',
      '................',
    ],
  },
});
ITEM_ART[ITEM.BONE_SWORD] = recolorArt(ITEM.WOOD_SWORD, { L: [248, 244, 228], w: [222, 214, 192], W: [168, 158, 138] });
ITEM_ART[ITEM.STINGER_SWORD] = recolorArt(ITEM.WOOD_SWORD, { L: [226, 96, 80], w: [120, 80, 62], W: [62, 44, 40] });

// Itens do avião
const E16 = '................';
Object.assign(ITEM_ART, {
  [ITEM.WATER]: {
    cores: { b: [120, 180, 230], B: [80, 130, 200], w: [220, 240, 250], k: [40, 90, 170], l: [236, 236, 240], L: [200, 60, 60] },
    pixels: [E16, '.......kk.......', '.......kk.......', '......wbbb......', '.....wbbbbB.....', '.....wbbbbB.....', '.....llllll.....', '.....LLLLLL.....',
      '.....llllll.....', '.....wbbbbB.....', '.....wbbbbB.....', '.....wbbbbB.....', '.....wbbbbB.....', '.....BBBBBB.....', E16, E16],
  },
  [ITEM.SNACK]: {
    cores: { y: [240, 190, 60], Y: [200, 140, 40], r: [210, 60, 50], w: [250, 240, 220], d: [150, 100, 30] },
    pixels: [E16, '....dddddddd....', '....yyyyyyyy....', '....yrrrrrry....', '....yrwwwwry....', '....yrrrrrry....', '....yyyyyyyy....', '....yyYyyYyy....',
      '....yyyyyyyy....', '....yYyyyyYy....', '....yyyyyyyy....', '....YyyyyyyY....', '....dddddddd....', E16, E16, E16],
  },
  [ITEM.MEDKIT]: {
    cores: { w: [240, 240, 236], W: [196, 196, 192], r: [210, 50, 50], h: [120, 120, 120] },
    pixels: [E16, E16, '......hhhh......', '......h..h......', '..wwwwwwwwwwww..', '..wwwwwrrwwwwW..', '..wwwwwrrwwwwW..', '..wwwrrrrrrwwW..',
      '..wwwrrrrrrwwW..', '..wwwwwrrwwwwW..', '..wwwwwrrwwwwW..', '..wwwwwwwwwwwW..', '..WWWWWWWWWWWW..', E16, E16, E16],
  },
  [ITEM.BLANKET]: {
    cores: { b: [80, 110, 170], B: [50, 70, 120], s: [220, 200, 120], l: [120, 150, 210] },
    pixels: [E16, E16, E16, '..llllllllllll..', '..bbbbbbbbbbbb..', '..ssssssssssss..', '..bbbbbbbbbbbb..', '..BBBBBBBBBBBB..',
      '..llllllllllll..', '..bbbbbbbbbbbb..', '..ssssssssssss..', '..bbbbbbbbbbbb..', '..BBBBBBBBBBBB..', E16, E16, E16],
  },
  [ITEM.SEATBELT]: {
    cores: { g: [90, 96, 104], G: [60, 64, 70], m: [210, 214, 220], M: [150, 154, 160] },
    pixels: [E16, '.gg.............', '..gg............', '...gg...........', '....gg..........', '.....mmmmM......', '.....mGGmM......', '.....mmmmM......',
      '......MMMM......', '.........gg.....', '..........gg....', '...........gg...', '............gg..', '.............gg.', E16, E16],
  },
  [ITEM.WIRE]: {
    cores: { o: [210, 120, 60], O: [150, 80, 40], r: [200, 50, 50], R: [140, 30, 30] },
    pixels: [E16, E16, '.....rrrrrr.....', '....rRRRRRRr....', '...rR......Rr...', '...rR.oooo.Rr...', '...rR.o..O.Rr...', '...rR.O..o.Rr...',
      '...rR.oooo.Rr...', '...rR......Rr...', '....rRRRRRRr....', '.....rrrrrrOo...', '...........oO...', '............o...', E16, E16],
  },
  [ITEM.BOLTS]: {
    cores: { m: [190, 194, 200], M: [120, 124, 130], d: [80, 84, 90] },
    pixels: [E16, E16, '..mmmm..........', '..mMMm..........', '...mm...........', '...mM....mmmm...', '...mM....mMMm...', '...mM.....mm....',
      '...mM.....mM....', '...dd.....mM....', '..........mM....', '..........dd....', E16, E16, E16, E16],
  },
  [ITEM.CLOTH]: {
    cores: { c: [200, 180, 150], C: [160, 140, 110], w: [230, 214, 188] },
    pixels: [E16, E16, E16, '...wwwwwwwwww...', '...cccccccccC...', '...cCccccCccC...', '...ccccccccCC...', '....wwwwwwwwww..',
      '....cccccccccC..', '....ccCcccccCC..', '....cccccccccC..', '....CCCCCCCCCC..', E16, E16, E16, E16],
  },
});

ITEM_ART[ITEM.BOW] = {
  cores: { w: [156, 104, 60], W: [100, 64, 36], s: [232, 230, 220], g: [200, 164, 104] },
  pixels: [
    '................',
    '.....sww........',
    '.....s..wW......',
    '.....s....wW....',
    '.....s.....wW...',
    '.....s......wW..',
    '.....s......gg..',
    '.....s......gg..',
    '.....s......gg..',
    '.....s......wW..',
    '.....s.....wW...',
    '.....s....wW....',
    '.....s..wW......',
    '.....sww........',
    '................',
    '................',
  ],
};
ITEM_ART[ITEM.ARROW] = {
  cores: { h: [170, 174, 180], H: [100, 104, 112], s: [150, 104, 62], f: [236, 236, 230], F: [200, 60, 50] },
  pixels: [
    '................',
    '...........hhh..',
    '............hH..',
    '...........s.h..',
    '..........s.....',
    '.........s......',
    '........s.......',
    '.......s........',
    '......s.........',
    '.....s..........',
    '..f.s...........',
    '..Ffs...........',
    '..FFf...........',
    '................',
    '................',
    '................',
  ],
};

ITEM_ART[ITEM.CACTUS] = {
  cores: { g: [72, 150, 72], G: [44, 104, 52], l: [130, 200, 110], s: [236, 240, 220] },
  pixels: [
    '................',
    '......lggG......',
    '......lsgG...lG.',
    '......lggG...lG.',
    '.lG...lggG...lG.',
    '.lG...lgsG..lgG.',
    '.lG...lggGlggG..',
    '.lgG..lggGGG....',
    '..lggglsgG......',
    '...GGGlggG......',
    '......lggG......',
    '......lgsG......',
    '......lggG......',
    '......lggG......',
    '.....GGGGGG.....',
    '................',
  ],
};
ITEM_ART[ITEM.CAMPFIRE] = {
  cores: CAMPFIRE_CORES,
  pixels: [
    '................', '................', '................',
    '.......r........', '......ror.......', '......royr......', '.....royyor.....', '.....ryyyor.....', '......royr......', '.......rr.......',
    ...CAMPFIRE_BASE,
  ],
};
ITEM_ART[ITEM.METAL_BAR] = {
  cores: { a: [70, 76, 86], b: [150, 158, 168], c: [196, 204, 212], d: [236, 240, 244], e: [110, 116, 126] },
  pixels: [
    '................', '................', '................', '................', '................',
    '.....ddddddd....',
    '....dcccccccb...',
    '...dcccccccbb...',
    '..bbbbbbbbbbe...',
    '..bccccccccea...',
    '..beeeeeeeeea...',
    '..aaaaaaaaaaa...',
    '................', '................', '................', '................',
  ],
};

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

// ---------- Buffer de pixels com coordenadas que dão a volta ----------
class Tex {
  constructor(w = TEX, h = TEX) {
    this.w = w;
    this.h = h;
    this.d = new Uint8ClampedArray(w * h * 4);
  }
  set(x, y, c, a = 255) {
    const i = (wrap(y | 0, this.h) * this.w + wrap(x | 0, this.w)) * 4;
    this.d[i] = c[0]; this.d[i + 1] = c[1]; this.d[i + 2] = c[2]; this.d[i + 3] = a;
  }
  get(x, y) {
    const i = (wrap(y | 0, this.h) * this.w + wrap(x | 0, this.w)) * 4;
    return [this.d[i], this.d[i + 1], this.d[i + 2], this.d[i + 3]];
  }
  toCanvas() {
    const c = makeCanvas(this.w, this.h);
    c.getContext('2d').putImageData(new ImageData(this.d, this.w, this.h), 0, 0);
    return c;
  }
}

// Pedrinha arredondada com luz em cima/esquerda e sombra embaixo/direita
function pebble(tex, cx, cy, r, base) {
  const hi = shade(base, 1.25), lo = shade(base, 0.72), ol = shade(base, 0.45);
  const R = Math.ceil(r) + 1;
  for (let dy = -R; dy <= R; dy++)
    for (let dx = -R; dx <= R; dx++) {
      const d = Math.hypot(dx, dy);
      if (d <= r) {
        let c = base;
        if (d > r - 1) c = dx + dy > 0 ? lo : hi;
        else if (dx + dy < -r * 0.6) c = hi;
        tex.set(cx + dx, cy + dy, c);
      } else if (d <= r + 0.9 && dx + dy >= 0) {
        tex.set(cx + dx, cy + dy, ol);
      }
    }
}

// Células de Voronoi com rachaduras (pedra "em blocos")
function cellRock(seed, base, crack, cells) {
  const tex = new Tex();
  const rnd = mulberry32(seed);
  const pts = Array.from({ length: cells }, () => ({ x: rnd() * TEX, y: rnd() * TEX, k: 0.86 + rnd() * 0.24 }));
  for (let y = 0; y < TEX; y++)
    for (let x = 0; x < TEX; x++) {
      let d1 = 1e9, d2 = 1e9, best = null, bdx = 0, bdy = 0;
      for (const p of pts) {
        let dx = p.x - x, dy = p.y - y;
        if (dx > TEX / 2) dx -= TEX; else if (dx < -TEX / 2) dx += TEX;
        if (dy > TEX / 2) dy -= TEX; else if (dy < -TEX / 2) dy += TEX;
        const d = Math.hypot(dx, dy);
        if (d < d1) { d2 = d1; d1 = d; best = p; bdx = dx; bdy = dy; }
        else if (d < d2) d2 = d;
      }
      const edge = d2 - d1;
      let c;
      if (edge < 1.1) c = crack;
      else {
        const grain = hash2(x, y, seed) < 0.12 ? 0.93 : 1;
        const tone = pnoise2(x / 8, y / 8, 8, seed + 5) > 0.55 ? 1.05 : 1;
        c = shade(base, best.k * grain * tone);
        if (edge < 2.3) c = shade(c, bdx + bdy > 0 ? 1.2 : 0.78);
      }
      tex.set(x, y, c);
    }
  return tex;
}

// ---------- Materiais ----------
function genDirt(seed) {
  const tex = new Tex();
  const pal = [[70, 44, 30], [92, 60, 40], [110, 72, 49], [128, 86, 58]];
  for (let y = 0; y < TEX; y++)
    for (let x = 0; x < TEX; x++) {
      const v = pfbm2(x / 16, y / 16, 4, seed, 3) + (hash2(x, y, seed) - 0.5) * 0.14;
      tex.set(x, y, pal[clamp(Math.floor((v - 0.28) * 9), 0, 3)]);
    }
  const rnd = mulberry32(seed + 1);
  for (let i = 0; i < 16; i++) pebble(tex, rnd() * TEX, rnd() * TEX, 1 + rnd() * 1.6, rnd() < 0.5 ? [124, 104, 88] : [140, 94, 62]);
  for (let i = 0; i < 40; i++) tex.set(rnd() * TEX, rnd() * TEX, [58, 36, 24]);
  return tex;
}

function genGrass(seed) {
  const tex = genDirt(seed);
  const greens = [[128, 204, 78], [88, 170, 56], [70, 146, 46]];
  for (let row = 0; row < TEX; row += T)
    for (let x = 0; x < TEX; x++) {
      const h = hash2(x, row, seed);
      const len = 3 + Math.floor(pnoise1(x / 3, TEX / 3, seed + row) * 3) + (h > 0.86 ? 3 : 0);
      for (let y = 0; y < len; y++) tex.set(x, row + y, y === 0 ? greens[0] : greens[1 + ((x + y) & 1)]);
      tex.set(x, row + len, [42, 98, 34]);
    }
  return tex;
}

function genSand(seed) {
  const tex = new Tex();
  const pal = [[190, 160, 104], [208, 180, 122], [224, 200, 142], [238, 218, 164]];
  for (let y = 0; y < TEX; y++)
    for (let x = 0; x < TEX; x++) {
      const v = pfbm2(x / 16, y / 8, 4, seed, 2);
      const ripple = Math.sin((y + v * 10) * 0.9) * 0.12;
      const n = (hash2(x, y, seed) - 0.5) * 0.2;
      tex.set(x, y, pal[clamp(Math.floor((v + ripple + n - 0.2) * 6), 0, 3)]);
    }
  const rnd = mulberry32(seed + 3);
  for (let i = 0; i < 50; i++) tex.set(rnd() * TEX, rnd() * TEX, rnd() < 0.5 ? [160, 132, 86] : [250, 236, 190]);
  return tex;
}

function genPlanks(seed) {
  const tex = new Tex();
  const base = [164, 114, 70];
  for (let y = 0; y < TEX; y++) {
    const board = Math.floor(y / 8), by = y % 8;
    const seam = (board * 23 + 9) % 32;
    for (let x = 0; x < TEX; x++) {
      const streak = pnoise2(x / 6, board * 3 + by / 3, TEX / 6, seed + board) > 0.62 ? 0.86 : 1;
      let c = shade(base, streak * (0.95 + hash2(x, y, seed) * 0.1));
      if (by === 0) c = shade(base, 1.18);
      if (by === 7) c = [86, 54, 32];
      if (x % 32 === seam) c = [86, 54, 32];
      if (x % 32 === (seam + 1) % 32 && by < 7) c = shade(base, 1.12);
      tex.set(x, y, c);
    }
    if (y % 8 === 3) {
      for (const off of [3, 28]) tex.set((board * 23 + 9 + off) % TEX, y, [70, 60, 56]);
    }
  }
  return tex;
}

// Minério: um veio por bloco (grade 4x4 da textura), cada um com 3 a 5 pepitas facetadas de
// contorno escuro, face clara em cima e um brilho. A pedra em volta escurece um pouco para o
// minério saltar aos olhos mesmo no escuro da caverna.
// pal = [contorno, sombra, base, luz, brilho]
function genOre(seed, stone, pal) {
  const tex = new Tex();
  tex.d.set(stone.d);
  const rnd = mulberry32(seed);
  const nuggets = [];
  for (let gy = 0; gy < 4; gy++)
    for (let gx = 0; gx < 4; gx++) {
      const cx = gx * T + 4 + rnd() * 8, cy = gy * T + 4 + rnd() * 8, n = 3 + Math.floor(rnd() * 3);
      for (let i = 0; i < n; i++) {
        const a = rnd() * Math.PI * 2, d = i === 0 ? 0 : 2.5 + rnd() * 2.5;
        nuggets.push({ x: Math.round(cx + Math.cos(a) * d), y: Math.round(cy + Math.sin(a) * d), r: i === 0 ? 2.6 + rnd() * 0.8 : 1.5 + rnd() * 1.1, k: 0.6 + rnd() * 0.8 });
      }
    }
  const inside = (g, dx, dy, grow) => Math.abs(dx) * g.k + Math.abs(dy) * (2 - g.k) * 0.8 + Math.hypot(dx, dy) * 0.4 <= g.r * 1.4 + grow;
  const each = (grow, fn) => {
    for (const g of nuggets) {
      const R = Math.ceil(g.r * 2 + grow + 1);
      for (let dy = -R; dy <= R; dy++)
        for (let dx = -R; dx <= R; dx++) if (inside(g, dx, dy, grow)) fn(g, dx, dy);
    }
  };
  // Pedra mais escura em volta do veio
  const halo = new Set();
  each(2.2, (g, dx, dy) => halo.add(((g.y + dy) & 63) * 64 + ((g.x + dx) & 63)));
  for (const k of halo) { const x = k & 63, y = k >> 6; tex.set(x, y, shade(tex.get(x, y), 0.78)); }
  each(1.1, (g, dx, dy) => tex.set(g.x + dx, g.y + dy, pal[0]));
  each(0, (g, dx, dy) => {
    // Faceta: diagonal de cima/esquerda clara, de baixo/direita escura
    const s = dx + dy * 1.2;
    const c = s < -g.r * 0.9 ? pal[3] : s > g.r * 0.8 ? pal[1] : pal[2];
    tex.set(g.x + dx, g.y + dy, c);
  });
  for (const g of nuggets) if (g.r > 2) { tex.set(g.x - 1, g.y - 1, pal[4]); if (g.r > 2.8) tex.set(g.x, g.y - 1, pal[3]); }
  return tex;
}

function genBark(seed) {
  const tex = new Tex();
  for (let y = 0; y < TEX; y++)
    for (let x = 0; x < TEX; x++) {
      const lx = x % T;
      if (lx < 4 || lx > 11) continue;
      let c = [104, 70, 44];
      const f = hash2(lx, Math.floor((y + lx * 5) / 4), seed);
      if (f < 0.3) c = [84, 56, 36];
      else if (f > 0.8) c = [122, 84, 54];
      if (lx === 5) c = [132, 92, 58];
      if (lx === 4 || lx === 11) c = [48, 32, 22];
      tex.set(x, y, c);
    }
  return tex;
}

// Toco: o mesmo tronco, mas com o corte de cima à mostra (madeira clara com anéis)
function genStump(seed) {
  const tex = genBark(seed);
  for (let y = 0; y < TEX; y += T) {
    for (let x = 5; x <= 10; x++) tex.set(x, y, [216, 178, 122]);
    for (let x = 4; x <= 11; x++) tex.set(x, y + 1, x === 4 || x === 11 ? [150, 110, 70] : x === 7 || x === 8 ? [160, 118, 74] : [190, 150, 98]);
    for (let x = 4; x <= 11; x++) tex.set(x, y + 2, [70, 46, 28]); // sombra da borda do corte
    tex.set(4, y, [0, 0, 0], 0); tex.set(11, y, [0, 0, 0], 0);   // quinas arredondadas
  }
  return tex;
}

function genTorch() {
  const tex = new Tex();
  const tile = new Tex(T, T);
  const px = (x, y, c) => tile.set(x, y, c);
  for (let y = 7; y < 15; y++) { px(7, y, [132, 92, 58]); px(8, y, [96, 64, 40]); }
  for (let y = 6; y < 16; y++) { px(6, y, [40, 28, 20]); px(9, y, [40, 28, 20]); }
  px(7, 15, [40, 28, 20]); px(8, 15, [40, 28, 20]);
  const flame = [[7, 2], [8, 3], [6, 3], [7, 3], [6, 4], [7, 4], [8, 4], [9, 4], [6, 5], [7, 5], [8, 5], [9, 5], [7, 6], [8, 6]];
  for (const [x, y] of flame) px(x, y, [255, 150, 40]);
  for (const [x, y] of [[7, 4], [8, 5], [7, 5]]) px(x, y, [255, 236, 150]);
  px(8, 1, [255, 200, 90]);
  for (let y = 0; y < TEX; y++)
    for (let x = 0; x < TEX; x++) {
      const c = tile.get(x, y);
      if (c[3]) tex.set(x, y, c);
    }
  return tex;
}

// Tocha cravada numa parede à esquerda: suporte de ferro, haste inclinada e a chama na ponta.
// Para a parede da direita o desenho é espelhado na hora de desenhar (js/renderer.js).
function genTorchWall() {
  const tile = new Tex(T, T);
  const px = (x, y, c) => { if (x >= 0 && x < T && y >= 0 && y < T) tile.set(x, y, c); };
  // Suporte de ferro encostado na parede
  for (let y = 10; y < 15; y++) { px(0, y, [46, 50, 58]); px(1, y, [92, 98, 108]); px(2, y, [58, 62, 70]); }
  px(2, 11, [110, 116, 126]); px(3, 12, [92, 98, 108]); px(3, 13, [46, 50, 58]);
  // Haste em diagonal, saindo do suporte para cima e para fora
  for (let k = 0; k < 7; k++) {
    const x = 3 + k, y = 12 - k;
    px(x, y + 1, [40, 28, 20]);
    px(x, y, [132, 92, 58]);
    px(x + 1, y, [96, 64, 40]);
    px(x + 1, y - 1, [40, 28, 20]);
  }
  // Chama acima da ponta da haste
  const flame = [[9, 1], [8, 2], [9, 2], [10, 2], [8, 3], [9, 3], [10, 3], [11, 3], [8, 4], [9, 4], [10, 4], [11, 4], [9, 5], [10, 5]];
  for (const [x, y] of flame) px(x, y, [255, 150, 40]);
  for (const [x, y] of [[9, 3], [10, 4], [9, 4]]) px(x, y, [255, 236, 150]);
  px(10, 0, [255, 200, 90]);
  return tile.toCanvas();
}

// Tijolos de pedra alternados, com argamassa e cada tijolo num tom
function genStoneBrick(seed) {
  const tex = new Tex(), base = [128, 126, 134], mortar = [70, 68, 76];
  for (let y = 0; y < TEX; y++) {
    const row = Math.floor(y / 8), by = y % 8, off = row % 2 ? 8 : 0;
    for (let x = 0; x < TEX; x++) {
      const bx = (x + off) % 16, brick = Math.floor((x + off) / 16);
      if (by === 7 || bx === 15) { tex.set(x, y, mortar); continue; }
      let c = shade(base, (0.9 + hash2(brick, row, seed) * 0.18) * (0.94 + hash2(x, y, seed) * 0.1));
      if (by === 0 || bx === 0) c = shade(c, 1.16);
      else if (by === 6 || bx === 14) c = shade(c, 0.8);
      tex.set(x, y, c);
    }
  }
  return tex;
}

// Vidro: moldura clara em cima/esquerda, escura embaixo/direita, e reflexos diagonais
function genGlass() {
  const tex = new Tex();
  for (let y = 0; y < TEX; y++)
    for (let x = 0; x < TEX; x++) {
      const lx = x % T, ly = y % T;
      let c = [168, 212, 228];
      if (lx === 0 || ly === 0) c = [226, 242, 248];
      else if (lx === 15 || ly === 15) c = [104, 146, 166];
      else if ((lx - ly === 2 || lx - ly === 3) && lx < 12) c = [236, 248, 252];
      else if (lx + ly === 20) c = [200, 232, 242];
      tex.set(x, y, c);
    }
  return tex;
}

// ---------- Materiais dos biomas ----------
// Textura com ruído mapeado numa paleta de 4 tons, mais pontinhos
function noiseTex(seed, pal, sx, sy, dots) {
  const tex = new Tex();
  for (let y = 0; y < TEX; y++)
    for (let x = 0; x < TEX; x++) {
      const v = pfbm2(x / sx, y / sy, TEX / sx, seed, 3) + (hash2(x, y, seed) - 0.5) * 0.14;
      tex.set(x, y, pal[clamp(Math.floor((v - 0.28) * 9), 0, 3)]);
    }
  const rnd = mulberry32(seed + 9);
  for (const [n, c] of dots) for (let i = 0; i < n; i++) tex.set(rnd() * TEX, rnd() * TEX, c);
  return tex;
}

const genSnow = (seed) => noiseTex(seed, [[196, 212, 230], [216, 228, 242], [234, 242, 250], [250, 252, 255]], 16, 16, [[30, [255, 255, 255]], [20, [180, 198, 220]]]);
const genMud = (seed) => noiseTex(seed, [[50, 36, 32], [68, 50, 42], [86, 64, 50], [104, 80, 60]], 12, 12, [[30, [38, 28, 26]], [14, [120, 96, 70]]]);

function genIce(seed) {
  const tex = cellRock(seed, [152, 202, 234], [104, 156, 200], 12);
  for (let y = 0; y < TEX; y++)
    for (let x = 0; x < TEX; x++) if ((x + y * 2) % 23 === 0 || (x + y * 2) % 23 === 1) tex.set(x, y, [214, 238, 252]); // reflexos
  return tex;
}

// Grama por cima de uma textura de chão (mesma ideia de genGrass)
function grassOver(tex, seed, greens, edge) {
  for (let row = 0; row < TEX; row += T)
    for (let x = 0; x < TEX; x++) {
      const len = 3 + Math.floor(pnoise1(x / 3, TEX / 3, seed + row) * 3) + (hash2(x, row, seed) > 0.86 ? 3 : 0);
      for (let y = 0; y < len; y++) tex.set(x, row + y, y === 0 ? greens[0] : greens[1 + ((x + y) & 1)]);
      tex.set(x, row + len, edge);
    }
  return tex;
}

function genSandstone(seed) {
  const tex = new Tex(), pal = [[150, 106, 62], [176, 130, 78], [200, 154, 98], [220, 178, 122]];
  for (let y = 0; y < TEX; y++)
    for (let x = 0; x < TEX; x++) {
      const band = Math.sin((y + pnoise1(x / 8, TEX / 8, seed) * 5) * 0.55) * 0.5 + 0.5;
      tex.set(x, y, pal[clamp(Math.floor(band * 3.2 + (hash2(x, y, seed) - 0.5) * 0.8), 0, 3)]);
    }
  return tex;
}

// Cacto: coluna verde com gomos, espinhos e contorno (desenhada como o tronco)
function genCactus() {
  const tex = new Tex();
  for (let y = 0; y < TEX; y++)
    for (let x = 0; x < TEX; x++) {
      const lx = x % T;
      if (lx < 4 || lx > 11) continue;
      let c = lx === 4 || lx === 11 ? [30, 70, 36] : lx === 5 ? [120, 190, 100] : lx === 7 || lx === 9 ? [52, 116, 58] : [76, 150, 74];
      if ((lx === 6 || lx === 10) && y % 6 === 2) c = [236, 240, 220];
      tex.set(x, y, c);
    }
  return tex;
}

buildFlatTiles();

const STONE_TEX = cellRock(301, [118, 118, 128], [58, 58, 68], 22);
const MATERIAL_TEX = [];
MATERIAL_TEX[TILE.DIRT] = genDirt(101);
MATERIAL_TEX[TILE.GRASS] = genGrass(101);
MATERIAL_TEX[TILE.STONE] = STONE_TEX;
MATERIAL_TEX[TILE.SAND] = genSand(401);
MATERIAL_TEX[TILE.PLANKS] = genPlanks(501);
MATERIAL_TEX[TILE.COAL_ORE] = genOre(601, STONE_TEX, [[16, 14, 20], [30, 28, 36], [46, 44, 54], [82, 82, 96], [188, 196, 214]]);
MATERIAL_TEX[TILE.IRON_ORE] = genOre(701, STONE_TEX, [[58, 30, 20], [150, 84, 50], [212, 138, 88], [246, 188, 132], [255, 240, 206]]);
MATERIAL_TEX[TILE.BEDROCK] = cellRock(801, [52, 44, 62], [20, 16, 26], 30);
MATERIAL_TEX[TILE.TRUNK] = genBark(901);
MATERIAL_TEX[TILE.STUMP] = genStump(901);
MATERIAL_TEX[TILE.TORCH] = genTorch();
MATERIAL_TEX[TILE.LEAVES] = MATERIAL_TEX[TILE.GRASS];
MATERIAL_TEX[TILE.STONE_BRICK] = genStoneBrick(1001);
MATERIAL_TEX[TILE.GLASS] = genGlass();
MATERIAL_TEX[TILE.SNOW] = genSnow(1101);
MATERIAL_TEX[TILE.ICE] = genIce(1201);
MATERIAL_TEX[TILE.MUD] = genMud(1301);
MATERIAL_TEX[TILE.JUNGLE_GRASS] = grassOver(genMud(1301), 1401, [[104, 204, 96], [54, 150, 66], [40, 124, 54]], [24, 78, 38]);
MATERIAL_TEX[TILE.SANDSTONE] = genSandstone(1501);
MATERIAL_TEX[TILE.CACTUS] = genCactus();
MATERIAL_TEX[TILE.DRY_GRASS] = grassOver(genDirt(1601), 1602, [[228, 204, 120], [196, 164, 82], [160, 128, 60]], [110, 86, 40]);

const artWarned = new Set();
function artWarn(label, msg) {
  const m = `[Arte] ${label}: ${msg}`;
  if (!artWarned.has(m)) { artWarned.add(m); console.warn(m); }
}

// Pinta um desenho de letras (w x h) em `tex`, repetindo-o até preencher a textura
function paintArt(tex, cores, rows, w, h, label) {
  rows = rows || [];
  if (rows.length !== h) artWarn(label, `precisa de ${h} linhas em pixels (tem ${rows.length}).`);
  rows.slice(0, h).forEach((row, y) => {
    if (row.length !== w) artWarn(label, `a linha ${y + 1} tem ${row.length} letras (precisa de ${w}).`);
    for (let x = 0; x < Math.min(row.length, w); x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const c = cores && cores[ch];
      if (!c) { artWarn(label, `a letra "${ch}" não está em cores.`); continue; }
      for (let oy = 0; oy < tex.h; oy += h)
        for (let ox = 0; ox < tex.w; ox += w) tex.set(x + ox, y + oy, c);
    }
  });
  return tex;
}

// Desenho 16x16; `size` = 64 repete o desenho 4x4 (texturas de bloco)
function artToTex(art, label, size = T) {
  return paintArt(new Tex(size, size), art && art.cores, art && art.pixels, T, T, label);
}

for (const id in BLOCK_ART) {
  const name = TILE_DEFS[id] ? TILE_DEFS[id].name : `TILE ${id}`;
  MATERIAL_TEX[id] = artToTex(BLOCK_ART[id], name, TEX);
}

// Bloco sem textura nenhuma: usa a cor do defTile com um leve ruído, para o jogo não quebrar
for (let t = 1; t < TILE_DEFS.length; t++) {
  if (!TILE_DEFS[t] || MATERIAL_TEX[t]) continue;
  const tex = new Tex();
  const base = TILE_DEFS[t].color;
  for (let y = 0; y < TEX; y++)
    for (let x = 0; x < TEX; x++) tex.set(x, y, shade(base, 0.9 + hash2(x, y, t) * 0.2));
  MATERIAL_TEX[t] = tex;
}

// ---------- Blocos com borda irregular (estilo Starbound) ----------
// mask: 1 = topo exposto, 2 = direita, 4 = baixo, 8 = esquerda
const ZERO_PROFILE = new Int8Array(T);
// Blocos com "cobertura" que transborda por cima (borda de cima desfiada e mais clara)
const TOP_COLORS = {
  [TILE.GRASS]: [[128, 204, 78], [88, 170, 56]],
  [TILE.JUNGLE_GRASS]: [[104, 204, 96], [54, 150, 66]],
  [TILE.DRY_GRASS]: [[228, 204, 120], [196, 164, 82]],
  [TILE.SNOW]: [[252, 254, 255], [228, 238, 248]],
};
const profileCache = new Map();

function edgeProfile(t, px, py, side) {
  const key = ((t * 4 + px) * 4 + py) * 4 + side;
  if (profileCache.has(key)) return profileCache.get(key);
  const p = new Int8Array(T);
  const seed = key * 7919 + 13;
  for (let i = 0; i < T; i++) {
    const h = hash2(i, side, seed);
    if (TOP_COLORS[t] && side === 0) p[i] = i % 2 ? (h < 0.5 ? 1 : 2) : (h < 0.3 ? 2 : h < 0.75 ? 3 : 4);
    else p[i] = h < 0.3 ? 0 : h < 0.75 ? 1 : 2;
  }
  profileCache.set(key, p);
  return p;
}

// reto = bloco de alvenaria/carpintaria: nada de borda desfiada nem canto comido,
// o tile termina exatamente no quadrado de 16x16 (veja `reto` no defTile)
function insideTest(sx, sy, mask, P, virtual, reto) {
  const c = sx < 4 ? 0 : sx > 19 ? 15 : sx - 4;
  const r = sy < 4 ? 0 : sy > 19 ? 15 : sy - 4;
  if (mask & 8 ? sx < 4 - P[3][r] : !virtual && sx < 4) return 0;
  if (mask & 2 ? sx > 19 + P[1][r] : !virtual && sx > 19) return 0;
  if (mask & 1 ? sy < 4 - P[0][c] : !virtual && sy < 4) return 0;
  if (mask & 4 ? sy > 19 + P[2][c] : !virtual && sy > 19) return 0;
  if (reto) return 1; // canto vivo: sem o chanfro que arredonda as quinas
  const lx = sx - 4, rx = 19 - sx, ty = sy - 4, by = 19 - sy;
  if ((mask & 9) === 9 && lx + ty < 2) return 0;
  if ((mask & 3) === 3 && rx + ty < 2) return 0;
  if ((mask & 6) === 6 && rx + by < 2) return 0;
  if ((mask & 12) === 12 && lx + by < 2) return 0;
  return 1;
}

// Escreve um sprite 24x24 em `out` (ImageData) na posição (ox, oy)
function composeBlock(out, ox, oy, t, px, py, mask, noProfile) {
  const tex = MATERIAL_TEX[t];
  const reto = !noProfile && !!TILE_DEFS[t].reto;
  const P = noProfile || reto ? [ZERO_PROFILE, ZERO_PROFILE, ZERO_PROFILE, ZERO_PROFILE]
    : [0, 1, 2, 3].map((s) => edgeProfile(t, px, py, s));
  const N = SPR + 6, O = 3;
  const real = new Uint8Array(N * N), virt = new Uint8Array(N * N);
  for (let j = 0; j < N; j++)
    for (let i = 0; i < N; i++) {
      real[j * N + i] = insideTest(i - O, j - O, mask, P, false, reto);
      virt[j * N + i] = insideTest(i - O, j - O, mask, P, true, reto);
    }
  const V = (sx, sy) => virt[(sy + O) * N + sx + O];
  const grassTop = TOP_COLORS[t];

  for (let sy = 0; sy < SPR; sy++)
    for (let sx = 0; sx < SPR; sx++) {
      if (!real[(sy + O) * N + sx + O]) continue;
      const tx = clamp(sx - MARGIN, 0, T - 1), ty = clamp(sy - MARGIN, 0, T - 1);
      let c = tex.get(px * T + tx, py * T + ty);
      if (grassTop && sy < MARGIN) c = grassTop[(sx + sy) & 1];

      if (!V(sx - 1, sy) || !V(sx + 1, sy) || !V(sx, sy - 1) || !V(sx, sy + 1)) c = shade(c, 0.42);
      else if (!V(sx, sy - 2)) c = shade(c, 1.22);
      else if (!V(sx, sy + 2) || !V(sx, sy + 3)) c = shade(c, 0.74);
      else if (!V(sx - 2, sy)) c = shade(c, 1.08);
      else if (!V(sx + 2, sy)) c = shade(c, 0.86);

      const di = ((oy + sy) * out.width + ox + sx) * 4;
      out.data[di] = c[0]; out.data[di + 1] = c[1]; out.data[di + 2] = c[2]; out.data[di + 3] = 255;
    }
}

// ---------- Ícones de itens (16x16) ----------
function outlinePass(img, color) {
  const { width: w, height: h, data } = img;
  const src = data.slice();
  const opaque = (x, y) => x >= 0 && y >= 0 && x < w && y < h && src[(y * w + x) * 4 + 3] > 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (opaque(x, y)) continue;
      if (opaque(x - 1, y) || opaque(x + 1, y) || opaque(x, y - 1) || opaque(x, y + 1)) {
        const i = (y * w + x) * 4;
        data[i] = color[0]; data[i + 1] = color[1]; data[i + 2] = color[2]; data[i + 3] = 255;
      }
    }
}

function paintFallbackIcon(tex, color) {
  pebble(tex, 7, 8, 4.2, color || [190, 190, 200]);
}

// Ícone de bloco: pedaço 14x14 da textura com cantos arredondados, luz no topo/esquerda e sombra embaixo/direita
function paintBlockIcon(tex, tile) {
  const src = MATERIAL_TEX[tile];
  for (let y = 1; y <= 14; y++)
    for (let x = 1; x <= 14; x++) {
      if ((x === 1 || x === 14) && (y === 1 || y === 14)) continue;
      let c = src.get(x + 17, y + 17);
      if (y === 1 || x === 1) c = shade(c, 1.28);
      else if (y === 14 || x === 14) c = shade(c, 0.6);
      else if (y === 13 || x === 13) c = shade(c, 0.8);
      else if (y === 2 && x < 12) c = shade(c, 1.1);
      tex.set(x, y, c);
    }
  tex.set(2, 2, shade(src.get(19, 19), 1.45)); // brilho no canto
}

// ---------- Construção dos atlas ----------
function buildTextures() {
  const POS = TEX / T;
  const blocks = [];
  const flat = [];
  for (let t = 1; t < TILE_DEFS.length; t++) {
    if (TILE_DEFS[t].solid) {
      // colunas: posição dentro da textura (4x4); linhas: máscara de bordas (16)
      const img = new ImageData(POS * POS * SPR, 16 * SPR);
      for (let mask = 0; mask < 16; mask++)
        for (let py = 0; py < POS; py++)
          for (let px = 0; px < POS; px++)
            composeBlock(img, (py * POS + px) * SPR, mask * SPR, t, px, py, mask, false);
      const c = makeCanvas(img.width, img.height);
      c.getContext('2d').putImageData(img, 0, 0);
      blocks[t] = c;
    } else if (MATERIAL_TEX[t]) {
      flat[t] = MATERIAL_TEX[t].toCanvas();
    }
  }

  const walls = [];
  for (const w in WALL_SOURCE) {
    const tex = new Tex();
    const src = MATERIAL_TEX[WALL_SOURCE[w]];
    // Fundo mais escuro, com menos contraste e um tom azulado, para separar dos blocos da frente
    for (let i = 0; i < src.d.length; i += 4) {
      const lum = (src.d[i] + src.d[i + 1] + src.d[i + 2]) / 3;
      tex.d[i] = lerp(src.d[i], lum, 0.35) * 0.3;
      tex.d[i + 1] = lerp(src.d[i + 1], lum, 0.35) * 0.3;
      tex.d[i + 2] = lerp(src.d[i + 2], lum, 0.35) * 0.38 + 4;
      tex.d[i + 3] = 255;
    }
    walls[w] = tex.toCanvas();
  }

  const itemAtlas = makeCanvas(ITEM_DEFS.length * T, T);
  const ictx = itemAtlas.getContext('2d');
  for (let id = 1; id < ITEM_DEFS.length; id++) {
    if (!ITEM_DEFS[id]) continue; // a lista é esparsa: um id sem item apenas não tem ícone
    const place = ITEM_DEFS[id].place;
    const hasArt = !!ITEM_ART[id];
    // Item de parede: pedaço da textura de origem, escurecido e com moldura, para não se
    // confundir com o bloco cheio do mesmo material
    if (ITEM_DEFS[id].parede != null) {
      const tex = new Tex(T, T), src = MATERIAL_TEX[WALL_SOURCE[ITEM_DEFS[id].parede]];
      for (let y = 0; y < T; y++)
        for (let x = 0; x < T; x++) {
          const edge = x < 2 || y < 2 || x > T - 3 || y > T - 3;
          const c = shade(src.get(x + 20, y + 20), edge ? 0.34 : 0.58);
          tex.set(x, y, edge ? c : [c[0], c[1], c[2] + 6]);
        }
      const img = new ImageData(tex.d, T, T);
      const c = makeCanvas(T, T);
      c.getContext('2d').putImageData(img, 0, 0);
      ictx.drawImage(c, id * T, 0);
      continue;
    }
    // Bicho na rede: o ícone é a própria arte do bicho, encolhida para caber (js/bug-net.js)
    if (!hasArt && ITEM_DEFS[id].criatura && typeof critterIconSource === 'function') {
      const src = critterIconSource(ITEM_DEFS[id].criatura);
      if (src) {
        const c = makeCanvas(T, T), cc = c.getContext('2d');
        cc.imageSmoothingEnabled = false;
        const k = Math.min((T - 2) / src.width, (T - 2) / src.height, 1);
        const w = Math.max(1, Math.round(src.width * k)), h = Math.max(1, Math.round(src.height * k));
        cc.drawImage(src, Math.round((T - w) / 2), Math.round((T - h) / 2), w, h);
        const img = cc.getImageData(0, 0, T, T);
        outlinePass(img, [24, 18, 20]);
        cc.putImageData(img, 0, 0);
        ictx.drawImage(c, id * T, 0);
        continue;
      }
    }
    if (!hasArt && place !== null && !TILE_DEFS[place].solid) {
      ictx.drawImage(flat[place], 0, 0, T, T, id * T, 0, T, T);
    } else {
      let tex = new Tex(T, T);
      if (hasArt) tex = artToTex(ITEM_ART[id], ITEM_DEFS[id].name);
      else if (place !== null) paintBlockIcon(tex, place);
      else paintFallbackIcon(tex, ITEM_DEFS[id].color);
      const img = new ImageData(tex.d, T, T);
      outlinePass(img, [24, 18, 20]);
      const c = makeCanvas(T, T);
      c.getContext('2d').putImageData(img, 0, 0);
      ictx.drawImage(c, id * T, 0);
    }
  }

  const doors = {
    closed: paintArt(new Tex(T, T * 3), DOOR_ART.cores, DOOR_ART.fechada, T, T * 3, 'Porta fechada').toCanvas(),
    open: paintArt(new Tex(T, T * 3), DOOR_ART.cores, DOOR_ART.aberta, T, T * 3, 'Porta aberta').toCanvas(),
  };

  const bigChest = paintArt(new Tex(32, T), CHEST_CORES, BIG_CHEST_PIXELS, 32, T, 'Baú grande').toCanvas();

  return { blocks, flat, walls, itemAtlas, doors, bigChest, torchWall: genTorchWall() };
}
