'use strict';
// =====================================================================================
//  PORCO QUADRADÃO: o espólio raríssimo
// =====================================================================================
// O porco quadrado (js/mobs.js, skin 1) sempre solta uma Picareta de Diamante, que cava mais
// rápido e com mais força do que a de ferro. Carrega depois de game-references.js e antes de game.js.

TOOL_TIERS.push({ nome: 'diamante', golpe: 0.22, forca: 0.74, alcance: TOOL_REACH_BASE + 2 });   // nível 3, acima do ferro
ITEM.DIAMOND_PICK = Math.max(...Object.values(ITEM)) + 1;
defItem(ITEM.DIAMOND_PICK, {
  name: 'Picareta de Diamante', ferramenta: 'picareta', nivel: 3, velocidade: 9, maxStack: 1,
  golpe: TOOL_TIERS[3].golpe, forca: TOOL_TIERS[3].forca, alcanceFerramenta: TOOL_TIERS[3].alcance,
  descricao: 'Seus antigos donos tinham uma regra: nunca cavar diretamente sob os próprios pés. Afortunada: ao quebrar qualquer minério, saem de 1 a 5 peças.',
  afortunada: true,
});
ITEM_ART[ITEM.DIAMOND_PICK] = {   // desenhada linha a linha: cabeça facetada de diamante (topo escuro, faixa clara, brilho, barriga) e cabo em degraus com nós
  cores: { t: [6, 58, 56], T: [24, 138, 128], c: [88, 228, 200], w: [226, 255, 250], s: [40, 176, 160], d: [50, 30, 16], h: [112, 74, 34], H: [168, 120, 56], n: [34, 20, 10] },
  pixels: [
    '................',
    '....tttttttt....',
    '...tcwwcccsTt...',
    '..tcwccsssTcTt..',
    '.tccsTTTTTTcTTt.',
    '.tcTt...HhdtcTt.',
    '.ttt....Hhd.cTt.',
    '........Hhd.cTt.',
    '.......Hhn..cTt.',
    '......Hhd...Tt..',
    '.....Hhd....tt..',
    '....Hhn.........',
    '...Hhd..........',
    '..Hhd...........',
    '.Hhn............',
    '................',
  ],
};

// AFORTUNADA: com a picareta na mão, minério solta mais itens, em quantidade sorteada
// (qualquer minério: de 1 a 5).
window.addEventListener('DOMContentLoaded', () => {
  const baseGive = giveDrop, ORE = /min[eé]rio|magnetita|cristal|gema|rubi|safira|esmeralda/i;
  giveDrop = function (tile) {
    baseGive(tile);
    const def = TILE_DEFS[tile], held = game.inventory.slots[game.selected];
    if (!def || def.drop == null || !ITEM_DEFS[held?.item]?.afortunada || !ORE.test(def.name || '')) return;
    const total = 1 + Math.floor(Math.random() * 5);
    if (total > 1) giveItem(def.drop, total - 1);
  };
});

{
  const baseKill = killMob;
  killMob = function (game, mob) {
    baseKill(game, mob);
    if (mob.skin === 1 && mob.constructor === Pig) dropItem(game, ITEM.DIAMOND_PICK, 1, mob.cx, mob.cy, 0);
  };
}
