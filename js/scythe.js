'use strict';
// =====================================================================================
//  FOICE
// =====================================================================================
// Golpe largo e lento que só ceifa mato e flores (samambaia, junco, capim seco, musgo, trepadeira, flor).
// Não machuca bicho, não quebra bloco e não corta galho, tronco nem pedra.
// Carrega depois de environment.js e combat.js, antes de tool-art.js (o ícone) e de game.js.

const SCYTHE_PROFILE = { preparacao: 0.08, corte: 0.13, recuperacao: 0.18, arcoAntes: 115, arcoDepois: 85, recuo: 12, assenta: 6, espera: 0.05 };
const SCYTHE_KINDS = new Set(['flower', 'fern', 'reed', 'dry', 'sakuraGrass', 'moss', 'vine']);
ITEM.SCYTHE = Math.max(...Object.values(ITEM)) + 1;
defItem(ITEM.SCYTHE, {
  name: 'Foice', dano: 1, alcance: 40, rapidez: 1, maxStack: 1, foice: true, perfilGolpe: SCYTHE_PROFILE,
  descricao: 'Só corta mato e flores, num golpe largo. Não machuca nada.',
});
RECIPES.push({ nome: 'Foice', ingredientes: [[ITEM.METAL_BAR, 2], [ITEM.STICK, 3]], resultado: { item: ITEM.SCYTHE, quantidade: 1 } });

{
  const baseSweep = sweepSwordHits;
  sweepSwordHits = function (game, s, a0, a1) {
    if (!ITEM_DEFS[s.item]?.foice) return baseSweep(game, s, a0, a1);
    const { x: ox, y: oy } = shoulderPos(game.player, swordLunge(s)), world = game.world;
    const steps = Math.max(1, Math.ceil(Math.abs(a1 - a0) / (6 * DEG)));
    for (let i = 0; i <= steps; i++) {
      const wa = swordWorldAngle(s, lerp(a0, a1, i / steps)), c = Math.cos(wa), sn = Math.sin(wa);
      for (const k of SWEEP_RADII) {
        const tx = Math.floor((ox + c * s.reach * k) / T), ty = Math.floor((oy + sn * s.reach * k) / T);
        if (!world.inBounds(tx, ty)) continue;
        const cell = ty * world.w + tx; if (s.hit.has(cell)) continue; s.hit.add(cell);
        const found = environmentDecorationAt(world, tx, ty);
        if (found && SCYTHE_KINDS.has(environmentKind(environmentDecoration(world, found.x, found.y, found.ceiling)))) environmentHarvest(game, found.x, found.y, found.ceiling, true);
      }
    }
  };
}
