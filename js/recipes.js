'use strict';

// =====================================================================================
//  RECEITAS  —  adicione as suas aqui!
// =====================================================================================
//
//  Aqui não existe desenho na grade: uma receita é só uma LISTA DE INGREDIENTES com a
//  quantidade de cada um. O jogador joga as coisas na bancada (js/inventory-ui.js), a
//  posição não importa, e a bancada mostra TUDO que dá para fazer com aquilo. Se a mesma
//  pilha serve para várias receitas, todas aparecem e quem escolhe é ele.
//
//  ── Como escrever uma receita ──────────────────────────────────────────────────────
//
//    {
//      nome: 'Nome que aparece no jogo',
//      ingredientes: [
//        [ITEM.WOOD, 3],     <- 3 madeiras
//        [ITEM.STICK, 2],    <- e 2 gravetos
//      ],
//      resultado: { item: ITEM.WOOD_PICKAXE, quantidade: 1 },
//    },
//
//    • No máximo 5 ingredientes diferentes por receita (o tamanho da bancada).
//    • Pode existir mais de uma receita com os mesmos ingredientes: as duas aparecem
//      na lista da bancada e o jogador clica na que quiser.
//    • O livro de receitas (botão embaixo do minimapa, ou tecla R) mostra tudo isso
//      desenhado, e monta a bancada sozinho quando você clica numa receita.
//
//  ── Itens disponíveis ──────────────────────────────────────────────────────────────
//    ITEM.DIRT (Terra)     ITEM.STONE (Pedra)    ITEM.WOOD (Madeira)
//    ITEM.PLANKS (Tábuas)  ITEM.COAL (Carvão)    ITEM.IRON (Ferro)
//    ITEM.TORCH (Tocha)    ITEM.SAND (Areia)     ITEM.STICK (Graveto)
//
//    Quer um item novo? Em js/tiles.js:
//      1. adicione um número em  const ITEM = { ..., RUBI: 10 }
//      2. registre com           defItem(ITEM.RUBI, { name: 'Rubi', color: [220, 40, 60] });
//
//  Se algo estiver errado numa receita, o jogo avisa no console do navegador (F12)
//  com uma mensagem começando por [Criação].
// =====================================================================================

const RECIPES = [
  // ---------- Básico da madeira ----------
  { nome: 'Tábuas', ingredientes: [[ITEM.WOOD, 1]], resultado: { item: ITEM.PLANKS, quantidade: 4 } },
  { nome: 'Graveto', ingredientes: [[ITEM.WOOD, 2]], resultado: { item: ITEM.STICK, quantidade: 4 } },
  { nome: 'Graveto (tábuas)', ingredientes: [[ITEM.PLANKS, 2]], resultado: { item: ITEM.STICK, quantidade: 4 } },
  { nome: 'Tocha', ingredientes: [[ITEM.COAL, 1], [ITEM.STICK, 1]], resultado: { item: ITEM.TORCH, quantidade: 4 } },
  { nome: 'Porta', ingredientes: [[ITEM.WOOD, 6]], resultado: { item: ITEM.DOOR, quantidade: 1 } },
  { nome: 'Tijolão', ingredientes: [[ITEM.DIRT, 9]], resultado: { item: ITEM.BRICK, quantidade: 9 } },

  // ---------- Ferramentas de madeira ----------
  { nome: 'Picareta de madeira', ingredientes: [[ITEM.WOOD, 3], [ITEM.STICK, 2]], resultado: { item: ITEM.WOOD_PICKAXE, quantidade: 1 } },
  { nome: 'Machado de madeira', ingredientes: [[ITEM.WOOD, 3], [ITEM.STICK, 2]], resultado: { item: ITEM.WOOD_AXE, quantidade: 1 } },
  { nome: 'Pá de madeira', ingredientes: [[ITEM.WOOD, 1], [ITEM.STICK, 2]], resultado: { item: ITEM.WOOD_SHOVEL, quantidade: 1 } },
  { nome: 'Espada de madeira', ingredientes: [[ITEM.WOOD, 2], [ITEM.STICK, 1]], resultado: { item: ITEM.WOOD_SWORD, quantidade: 1 } },
  { nome: 'Picareta de madeira (tábuas)', ingredientes: [[ITEM.PLANKS, 3], [ITEM.STICK, 2]], resultado: { item: ITEM.WOOD_PICKAXE, quantidade: 1 } },
  { nome: 'Machado de madeira (tábuas)', ingredientes: [[ITEM.PLANKS, 3], [ITEM.STICK, 2]], resultado: { item: ITEM.WOOD_AXE, quantidade: 1 } },
  { nome: 'Pá de madeira (tábuas)', ingredientes: [[ITEM.PLANKS, 1], [ITEM.STICK, 2]], resultado: { item: ITEM.WOOD_SHOVEL, quantidade: 1 } },
  { nome: 'Espada de madeira (tábuas)', ingredientes: [[ITEM.PLANKS, 2], [ITEM.STICK, 1]], resultado: { item: ITEM.WOOD_SWORD, quantidade: 1 } },

  // ---------- Martelos (só eles derrubam paredes de fundo) ----------
  { nome: 'Martelo de madeira', ingredientes: [[ITEM.WOOD, 4], [ITEM.STICK, 2]], resultado: { item: ITEM.WOOD_HAMMER, quantidade: 1 } },
  { nome: 'Martelo de madeira (tábuas)', ingredientes: [[ITEM.PLANKS, 4], [ITEM.STICK, 2]], resultado: { item: ITEM.WOOD_HAMMER, quantidade: 1 } },
  { nome: 'Martelo de pedra', ingredientes: [[ITEM.STONE, 4], [ITEM.STICK, 2]], resultado: { item: ITEM.STONE_HAMMER, quantidade: 1 } },
  { nome: 'Martelo de ferro', ingredientes: [[ITEM.METAL_BAR, 4], [ITEM.STICK, 2]], resultado: { item: ITEM.METAL_HAMMER, quantidade: 1 } },

  // ---------- Ferramentas de pedra ----------
  { nome: 'Picareta de pedra', ingredientes: [[ITEM.STONE, 3], [ITEM.STICK, 2]], resultado: { item: ITEM.STONE_PICKAXE, quantidade: 1 } },
  { nome: 'Machado de pedra', ingredientes: [[ITEM.STONE, 3], [ITEM.STICK, 2]], resultado: { item: ITEM.STONE_AXE, quantidade: 1 } },
  { nome: 'Pá de pedra', ingredientes: [[ITEM.STONE, 1], [ITEM.STICK, 2]], resultado: { item: ITEM.STONE_SHOVEL, quantidade: 1 } },
  { nome: 'Espada de pedra', ingredientes: [[ITEM.STONE, 2], [ITEM.STICK, 1]], resultado: { item: ITEM.STONE_SWORD, quantidade: 1 } },

  // ---------- Ferro: barra de minério, de sucata ou de parafusos ----------
  { nome: 'Barra de ferro', ingredientes: [[ITEM.IRON, 1], [ITEM.COAL, 1]], resultado: { item: ITEM.METAL_BAR, quantidade: 1 } },
  { nome: 'Barra de ferro (sucata)', ingredientes: [[ITEM.SCRAP, 3]], resultado: { item: ITEM.METAL_BAR, quantidade: 1 } },
  { nome: 'Barra de ferro (parafusos)', ingredientes: [[ITEM.BOLTS, 4]], resultado: { item: ITEM.METAL_BAR, quantidade: 1 } },
  { nome: 'Picareta de ferro', ingredientes: [[ITEM.METAL_BAR, 3], [ITEM.STICK, 2]], resultado: { item: ITEM.METAL_PICKAXE, quantidade: 1 } },
  { nome: 'Machado de ferro', ingredientes: [[ITEM.METAL_BAR, 3], [ITEM.STICK, 2]], resultado: { item: ITEM.METAL_AXE, quantidade: 1 } },
  { nome: 'Pá de ferro', ingredientes: [[ITEM.METAL_BAR, 1], [ITEM.STICK, 2]], resultado: { item: ITEM.METAL_SHOVEL, quantidade: 1 } },
  { nome: 'Espada de ferro', ingredientes: [[ITEM.METAL_BAR, 2], [ITEM.STICK, 1]], resultado: { item: ITEM.METAL_SWORD, quantidade: 1 } },

  // ---------- Construção e sobrevivência ----------
  { nome: 'Tijolo de pedra', ingredientes: [[ITEM.STONE, 4]], resultado: { item: ITEM.STONE_BRICK, quantidade: 4 } },
  { nome: 'Vidro', ingredientes: [[ITEM.SAND, 2], [ITEM.COAL, 1]], resultado: { item: ITEM.GLASS, quantidade: 2 } },
  { nome: 'Baú', ingredientes: [[ITEM.PLANKS, 8]], resultado: { item: ITEM.CHEST, quantidade: 1 } },
  { nome: 'Baú reforçado', ingredientes: [[ITEM.PLANKS, 8], [ITEM.LEATHER, 1]], resultado: { item: ITEM.CHEST, quantidade: 2 } },
  { nome: 'Fogueira', ingredientes: [[ITEM.WOOD, 3], [ITEM.STICK, 3], [ITEM.COAL, 1]], resultado: { item: ITEM.CAMPFIRE, quantidade: 1 } },
  { nome: 'Carvão vegetal', ingredientes: [[ITEM.WOOD, 3], [ITEM.TORCH, 1]], resultado: { item: ITEM.COAL, quantidade: 2 } },
  { nome: 'Carne assada', ingredientes: [[ITEM.MEAT, 1], [ITEM.COAL, 1]], resultado: { item: ITEM.COOKED_MEAT, quantidade: 1 } },
  { nome: 'Ovo cozido', ingredientes: [[ITEM.EGG, 1], [ITEM.COAL, 1]], resultado: { item: ITEM.BOILED_EGG, quantidade: 1 } },

  // ---------- Com o que os bichos deixam ----------
  { nome: 'Tocha (gosma)', ingredientes: [[ITEM.GEL, 1], [ITEM.STICK, 1]], resultado: { item: ITEM.TORCH, quantidade: 4 } },
  { nome: 'Bandagem', ingredientes: [[ITEM.SILK, 2], [ITEM.LEATHER, 1]], resultado: { item: ITEM.BANDAGE, quantidade: 1 } },
  { nome: 'Espada de osso', ingredientes: [[ITEM.BONE, 2], [ITEM.STICK, 1]], resultado: { item: ITEM.BONE_SWORD, quantidade: 1 } },
  { nome: 'Espada de ferrão', ingredientes: [[ITEM.STINGER, 1], [ITEM.METAL_BAR, 1], [ITEM.STICK, 1]], resultado: { item: ITEM.STINGER_SWORD, quantidade: 1 } },

  // ---------- Com o que sobrou do avião ----------
  { nome: 'Bandagem (tecido)', ingredientes: [[ITEM.CLOTH, 2]], resultado: { item: ITEM.BANDAGE, quantidade: 1 } },
  { nome: 'Tocha (tecido)', ingredientes: [[ITEM.CLOTH, 1], [ITEM.STICK, 1]], resultado: { item: ITEM.TORCH, quantidade: 2 } },
  { nome: 'Tocha (fios)', ingredientes: [[ITEM.WIRE, 1], [ITEM.STICK, 1]], resultado: { item: ITEM.TORCH, quantidade: 1 } },

  // ---------- Arco e flecha ----------
  { nome: 'Arco (teia)', ingredientes: [[ITEM.STICK, 3], [ITEM.SILK, 3]], resultado: { item: ITEM.BOW, quantidade: 1 } },
  { nome: 'Arco (fios)', ingredientes: [[ITEM.STICK, 3], [ITEM.WIRE, 3]], resultado: { item: ITEM.BOW, quantidade: 1 } },
  { nome: 'Flecha', ingredientes: [[ITEM.STONE, 1], [ITEM.STICK, 1]], resultado: { item: ITEM.ARROW, quantidade: 4 } },
  { nome: 'Flecha (parafuso)', ingredientes: [[ITEM.BOLTS, 1], [ITEM.STICK, 1]], resultado: { item: ITEM.ARROW, quantidade: 6 } },
  { nome: 'Lança', ingredientes: [[ITEM.STONE, 1], [ITEM.STICK, 2]], resultado: { item: ITEM.SPEAR, quantidade: 1 } },
  { nome: 'Lança de ferro', ingredientes: [[ITEM.METAL_BAR, 1], [ITEM.STICK, 2]], resultado: { item: ITEM.SPEAR, quantidade: 1 } },

  // ---------- Paredes de fundo (tapam o céu dentro das casas) ----------
  { nome: 'Parede de tábuas', ingredientes: [[ITEM.PLANKS, 1]], resultado: { item: ITEM.WALL_PLANKS, quantidade: 4 } },
  { nome: 'Parede de tronco', ingredientes: [[ITEM.WOOD, 2]], resultado: { item: ITEM.WALL_WOOD, quantidade: 8 } },
  { nome: 'Parede de pedra', ingredientes: [[ITEM.STONE, 1]], resultado: { item: ITEM.WALL_STONE, quantidade: 4 } },
  { nome: 'Parede de terra', ingredientes: [[ITEM.DIRT, 1]], resultado: { item: ITEM.WALL_DIRT, quantidade: 4 } },
  { nome: 'Parede de tijolo', ingredientes: [[ITEM.BRICK, 1]], resultado: { item: ITEM.WALL_BRICK, quantidade: 4 } },
  { nome: 'Parede de tijolo de pedra', ingredientes: [[ITEM.STONE_BRICK, 1]], resultado: { item: ITEM.WALL_STONE_BRICK, quantidade: 4 } },
  { nome: 'Parede de arenito', ingredientes: [[ITEM.SANDSTONE, 1]], resultado: { item: ITEM.WALL_SANDSTONE, quantidade: 4 } },
  { nome: 'Desmanchar parede (tábuas)', ingredientes: [[ITEM.WALL_PLANKS, 4]], resultado: { item: ITEM.PLANKS, quantidade: 1 } },
  { nome: 'Desmanchar parede (pedra)', ingredientes: [[ITEM.WALL_STONE, 4]], resultado: { item: ITEM.STONE, quantidade: 1 } },

  // ---------- Escada e corda ----------
  { nome: 'Escada', ingredientes: [[ITEM.STICK, 7]], resultado: { item: ITEM.LADDER, quantidade: 6 } },
  { nome: 'Corda (teia)', ingredientes: [[ITEM.SILK, 3]], resultado: { item: ITEM.ROPE, quantidade: 2 } },
  { nome: 'Corda (tecido)', ingredientes: [[ITEM.CLOTH, 3]], resultado: { item: ITEM.ROPE, quantidade: 2 } },
  // As receitas de fibra, flor e puçá ficam com os próprios arquivos (js/environment.js,
  // js/bug-net.js): eles carregam depois daqui, e `ITEM.FIBER` ainda nem existe nesta linha.

  // ---------- Armaduras (vão no espaço de roupa do inventário) ----------
  { nome: 'Peitoral de couro', ingredientes: [[ITEM.LEATHER, 8]], resultado: { item: ITEM.LEATHER_ARMOR, quantidade: 1 } },
  { nome: 'Peitoral de ferro', ingredientes: [[ITEM.METAL_BAR, 8]], resultado: { item: ITEM.IRON_ARMOR, quantidade: 1 } },

  // ---------- Savana: elefante e troféus do tigre ----------
  { nome: 'Sela', ingredientes: [[ITEM.LEATHER, 5]], resultado: { item: ITEM.SADDLE, quantidade: 1 } },
  { nome: 'Sela (corda)', ingredientes: [[ITEM.LEATHER, 3], [ITEM.ROPE, 1]], resultado: { item: ITEM.SADDLE, quantidade: 1 } },
  { nome: 'Faca de dente de tigre', ingredientes: [[ITEM.TIGER_TOOTH, 1], [ITEM.STICK, 1]], resultado: { item: ITEM.TIGER_KNIFE, quantidade: 1 } },
  { nome: 'Garras de tigre', ingredientes: [[ITEM.TIGER_CLAW, 3], [ITEM.LEATHER, 3]], resultado: { item: ITEM.TIGER_CLAWS, quantidade: 1 } },
  { nome: 'Berrante de marfim', ingredientes: [[ITEM.IVORY, 2], [ITEM.ROPE, 1]], resultado: { item: ITEM.IVORY_HORN, quantidade: 1 } },

  // ---------- Telhados, cercas e luminárias ----------
  { nome: 'Telha de barro', ingredientes: [[ITEM.BRICK, 2]], resultado: { item: ITEM.ROOF_RED, quantidade: 4 } },
  { nome: 'Telha de madeira', ingredientes: [[ITEM.PLANKS, 3]], resultado: { item: ITEM.ROOF_WOOD, quantidade: 6 } },
  { nome: 'Cerca de madeira', ingredientes: [[ITEM.PLANKS, 2], [ITEM.STICK, 2]], resultado: { item: ITEM.FENCE, quantidade: 6 } },
  { nome: 'Lampião', ingredientes: [[ITEM.GLASS, 2], [ITEM.TORCH, 1], [ITEM.METAL_BAR, 1]], resultado: { item: ITEM.LANTERN, quantidade: 2 } },
  { nome: 'Vela', ingredientes: [[ITEM.CLOTH, 2], [ITEM.COAL, 1]], resultado: { item: ITEM.CANDLE, quantidade: 3 } },

  // ---------- Mobília ----------
  { nome: 'Mesa', ingredientes: [[ITEM.PLANKS, 4], [ITEM.STICK, 2]], resultado: { item: ITEM.TABLE, quantidade: 1 } },
  { nome: 'Cadeira', ingredientes: [[ITEM.PLANKS, 3], [ITEM.STICK, 1]], resultado: { item: ITEM.CHAIR, quantidade: 1 } },
  { nome: 'Estante de livros', ingredientes: [[ITEM.PLANKS, 6], [ITEM.CLOTH, 2]], resultado: { item: ITEM.BOOKSHELF, quantidade: 1 } },
  { nome: 'Barril', ingredientes: [[ITEM.PLANKS, 5], [ITEM.METAL_BAR, 1]], resultado: { item: ITEM.BARREL, quantidade: 1 } },
  { nome: 'Vaso de flores', ingredientes: [[ITEM.BRICK, 2], [ITEM.DIRT, 1]], resultado: { item: ITEM.FLOWER_POT, quantidade: 1 } },
  { nome: 'Tapete', ingredientes: [[ITEM.CLOTH, 3], [ITEM.LEATHER, 1]], resultado: { item: ITEM.RUG, quantidade: 2 } },

  // ---------- Mar e rios (js/water-defs.js) ----------
  { nome: 'Peixe assado', ingredientes: [[ITEM.RAW_FISH, 1], [ITEM.COAL, 1]], resultado: { item: ITEM.COOKED_FISH, quantidade: 1 } },
  { nome: 'Garrafa de ar', ingredientes: [[ITEM.GLASS, 1], [ITEM.SEAWEED, 3]], resultado: { item: ITEM.AIR_BOTTLE, quantidade: 2 } },
  { nome: 'Tridente', ingredientes: [[ITEM.METAL_BAR, 3], [ITEM.PEARL, 2], [ITEM.STICK, 2]], resultado: { item: ITEM.TRIDENT, quantidade: 1 } },
  { nome: 'Tocha (concha)', ingredientes: [[ITEM.SHELL, 1], [ITEM.COAL, 1], [ITEM.STICK, 1]], resultado: { item: ITEM.TORCH, quantidade: 3 } },

  // ↓ Adicione novas receitas aqui ↓

];

// Construction pieces use the same crafting and recipe-book flow as other items.
for (const [key] of BUILDING_PARTS) {
  const stone = ['SLATE', 'ROOF_LEFT', 'ROOF_RIGHT', 'MOSS_BRICK'].includes(key);
  const ingredients = key === 'PENDANT' ? [[ITEM.GLASS, 2], [ITEM.TORCH, 1], [ITEM.METAL_BAR, 2]]
    : key === 'LATTICE_WINDOW' ? [[ITEM.GLASS, 3], [ITEM.PLANKS, 2]]
    : key === 'IVY' ? [[ITEM.DIRT, 2], [ITEM.STICK, 3]]
    : key === 'FLOWER_BOX' ? [[ITEM.PLANKS, 2], [ITEM.DIRT, 2]]
    : key === 'PLASTER' ? [[ITEM.SAND, 3], [ITEM.STONE, 2]]
    : key === 'TIMBER' ? [[ITEM.PLASTER, 2], [ITEM.PLANKS, 2]]
    : stone ? [[ITEM.STONE, 3], [ITEM.COAL, 1]] : [[ITEM.PLANKS, 2], [ITEM.STICK, 3]];
  RECIPES.push({ nome: ITEM_DEFS[ITEM[key]].name, ingredientes: ingredients,
    resultado: { item: ITEM[key], quantidade: key === 'PENDANT' ? 2 : 4 } });
}
for (const key of ['PLASTER', 'TIMBER']) RECIPES.push({
  nome: ITEM_DEFS[ITEM['WALL_' + key]].name, ingredientes: [[ITEM[key], 1]],
  resultado: { item: ITEM['WALL_' + key], quantidade: 4 },
});
// Móveis, plataformas, telhados inclinados e blocos novos (js/furniture.js)
RECIPES.push(...FURNITURE_RECIPES);

// ---------- Subsolo (js/underground.js) ----------
// O que fazer com o que se traz da caverna: luz que não apaga, escada que aguenta o fundo
// do mundo e a pólvora de enxofre para as bombas.
RECIPES.push(
  { nome: 'Lâmpada de ametista', ingredientes: [[ITEM.AMETHYST, 3], [ITEM.STONE, 2]], resultado: { item: ITEM.AMETHYST_LAMP, quantidade: 2 } },
  { nome: 'Tocha longa (enxofre)', ingredientes: [[ITEM.SULFUR, 1], [ITEM.STICK, 2]], resultado: { item: ITEM.TORCH, quantidade: 8 } },
  { nome: 'Lanterna de cobre', ingredientes: [[ITEM.COPPER, 3], [ITEM.TORCH, 1], [ITEM.GLASS, 1]], resultado: { item: ITEM.LANTERN, quantidade: 1 } },
  { nome: 'Corrente de prata', ingredientes: [[ITEM.SILVER, 2], [ITEM.STICK, 1]], resultado: { item: ITEM.ROPE, quantidade: 4 } },
  { nome: 'Candelabro de ouro', ingredientes: [[ITEM.GOLD, 2], [ITEM.TORCH, 2]], resultado: { item: ITEM.CHANDELIER, quantidade: 1 } },
);
