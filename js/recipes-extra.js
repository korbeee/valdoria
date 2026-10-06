'use strict';

// ---------- Receitas que fecham as pontas soltas ----------
// Carrega depois de todos os arquivos que criam itens (subsolo, água, Coração...), então
// qualquer ITEM daqui já existe. Cada bloco cobre itens que o jogador junta e que antes não
// tinham como ser feitos, ou não serviam para nada na bancada.
RECIPES.push(
  // Neve, gelo e cacto viram água (a garrafa é de vidro)
  { nome: 'Garrafa de água (neve)', ingredientes: [[ITEM.SNOW, 2], [ITEM.GLASS, 1]], resultado: { item: ITEM.WATER, quantidade: 1 } },
  { nome: 'Garrafa de água (gelo)', ingredientes: [[ITEM.ICE, 1], [ITEM.GLASS, 1]], resultado: { item: ITEM.WATER, quantidade: 2 } },
  { nome: 'Garrafa de água (cacto)', ingredientes: [[ITEM.CACTUS, 2], [ITEM.GLASS, 1]], resultado: { item: ITEM.WATER, quantidade: 1 } },
  { nome: 'Gelo compactado', ingredientes: [[ITEM.SNOW, 4]], resultado: { item: ITEM.ICE, quantidade: 1 } },
  { nome: 'Fibra (cacto)', ingredientes: [[ITEM.CACTUS, 1]], resultado: { item: ITEM.FIBER, quantidade: 3 } },

  // Terra, areia e lama
  { nome: 'Lama', ingredientes: [[ITEM.DIRT, 2], [ITEM.WATER, 1]], resultado: { item: ITEM.MUD, quantidade: 4 } },
  { nome: 'Tijolo de adobe', ingredientes: [[ITEM.MUD, 2], [ITEM.FIBER, 1]], resultado: { item: ITEM.BRICK, quantidade: 4 } },
  { nome: 'Arenito', ingredientes: [[ITEM.SAND, 4]], resultado: { item: ITEM.SANDSTONE, quantidade: 2 } },

  // Mar: coral é calcário (vira reboco), a estrela-do-mar vai para a parede num quadro
  { nome: 'Reboco de coral (galhado)', ingredientes: [[ITEM.CORAL_BRANCH, 1], [ITEM.SAND, 2]], resultado: { item: ITEM.PLASTER, quantidade: 4 } },
  { nome: 'Reboco de coral (leque)', ingredientes: [[ITEM.CORAL_FAN, 1], [ITEM.SAND, 2]], resultado: { item: ITEM.PLASTER, quantidade: 4 } },
  { nome: 'Reboco de coral (cérebro)', ingredientes: [[ITEM.CORAL_BRAIN, 1], [ITEM.SAND, 2]], resultado: { item: ITEM.PLASTER, quantidade: 4 } },
  { nome: 'Quadro (estrela-do-mar)', ingredientes: [[ITEM.STARFISH, 1], [ITEM.PLANKS, 2], [ITEM.CLOTH, 1]], resultado: { item: ITEM.PAINTING, quantidade: 1 } },
  { nome: 'Emplastro de vitória-régia', ingredientes: [[ITEM.LILYPAD, 2], [ITEM.FIBER, 1]], resultado: { item: ITEM.BANDAGE, quantidade: 1 } },

  // Subsolo e Coração da Ilha
  { nome: 'Bronze (cobre)', ingredientes: [[ITEM.COPPER, 3], [ITEM.COAL, 1]], resultado: { item: ITEM.BRONZE, quantidade: 1 } },
  { nome: 'Osso (fóssil)', ingredientes: [[ITEM.FOSSIL, 1]], resultado: { item: ITEM.BONE, quantidade: 3 } },
  { nome: 'Lampião de âmbar', ingredientes: [[ITEM.AMBER, 2], [ITEM.GLASS, 1], [ITEM.METAL_BAR, 1]], resultado: { item: ITEM.LANTERN, quantidade: 2 } },
  { nome: 'Lâmpada rúnica', ingredientes: [[ITEM.RUNE_STONE, 1], [ITEM.STONE, 2]], resultado: { item: ITEM.AMETHYST_LAMP, quantidade: 3 } },
  { nome: 'Tocha de brasa', ingredientes: [[ITEM.EMBER_LILY, 1], [ITEM.STICK, 2]], resultado: { item: ITEM.TORCH, quantidade: 6 } },
  { nome: 'Relógio de pêndulo (engrenagem)', ingredientes: [[ITEM.PLANKS, 6], [ITEM.GEAR, 1], [ITEM.GLASS, 1]], resultado: { item: ITEM.CLOCK, quantidade: 1 } },
);
