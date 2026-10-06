'use strict';

// =====================================================================================
//  BALDE
// =====================================================================================
// Balde vazio + botão direito na água: tira um bloco de água (WATER_MAX de nível) do lago,
// começando pelas células de cima, então o nível baixa um pouco a cada balde, como se
// estivesse secando. Balde cheio + botão direito: despeja esse mesmo bloco onde o mouse está
// e a água continua com a física de sempre (escorre, nivela, cai). A água não se cria nem
// some: só a cachoeira, que é permanente, enche o balde sem baixar.

Object.assign(ITEM, { BUCKET: 202, BUCKET_WATER: 203 });
defItem(ITEM.BUCKET, { name: 'Balde', balde: 'vazio', maxStack: 1 });
defItem(ITEM.BUCKET_WATER, { name: 'Balde com água', balde: 'cheio', maxStack: 1 });

const BUCKET_UNITS = WATER_MAX; // quanto de água cabe: um bloco cheio

{
  const wood = { o: [46, 28, 16], d: [96, 60, 32], m: [140, 92, 52], l: [184, 130, 76], i: [70, 74, 82], I: [150, 156, 164] };
  const body = [
    '................', '.....oooooo.....', '....o......o....', '...o........o...', // alça
    '..oIIIIIIIIIIo..', '..oddddddddddo..', '..omlmmlmmlmdo..', '..omlmmlmmlmdo..',
    '..oiiiiiiiiiio..', '...omlmmlmmdo...', '...omlmmlmmdo...', '...oiiiiiiiio...',
    '...omlmmlmmdo...', '....omlmmldo....', '....oooooooo....', '................',
  ];
  ITEM_ART[ITEM.BUCKET] = { cores: wood, pixels: body };
  // cheio: a boca do balde mostra a água com brilho
  const full = body.slice();
  full[4] = '..oIwwwwwwwwIo..';
  full[5] = '..odWWwWWWwWdo..';
  ITEM_ART[ITEM.BUCKET_WATER] = { cores: { ...wood, w: [150, 212, 242], W: [70, 140, 200] }, pixels: full };
}

// Célula de água que o clique quis dizer (o mouse costuma ficar logo acima da superfície)
function bucketWaterCell(w, tx, ty) {
  if (w.hasWater(tx, ty)) return [tx, ty];
  if (w.hasWater(tx, ty + 1)) return [tx, ty + 1];
  return null;
}

// Tira BUCKET_UNITS de água do corpo d'água ligado à célula, de cima para baixo.
// Devolve true se encheu o balde.
function bucketScoop(w, tx, ty) {
  if (w.isWaterfall(tx, ty)) return true; // a cachoeira não acaba
  const seen = new Set([ty * w.w + tx]), cells = [], queue = [ty * w.w + tx];
  let total = 0;
  while (queue.length && cells.length < 600) {
    const i = queue.shift(), v = w.water[i];
    if (v === WATER_FALL) return true; // ligado a uma cachoeira: ela repõe
    cells.push(i); total += v;
    const x = i % w.w;
    for (const j of [i - w.w, i - 1, i + 1, i + w.w]) {
      if (j < 0 || j >= w.water.length || seen.has(j) || !w.water[j]) continue;
      if ((j === i - 1 && x === 0) || (j === i + 1 && x === w.w - 1)) continue;
      seen.add(j); queue.push(j);
    }
  }
  if (total < BUCKET_UNITS) return false; // poça rasa demais
  // De cima para baixo; na mesma linha, primeiro as mais perto do clique (a superfície baixa ali)
  cells.sort((a, b) => ((a / w.w) | 0) - ((b / w.w) | 0) || Math.abs((a % w.w) - tx) - Math.abs((b % w.w) - tx));
  let need = BUCKET_UNITS;
  for (const i of cells) {
    if (!need) break;
    const take = Math.min(need, w.water[i]);
    w.water[i] -= take; need -= take;
    w.wakeWater(i % w.w, (i / w.w) | 0);
  }
  return true;
}

// Despeja BUCKET_UNITS na célula (o que não couber sobe para a de cima). false = não coube.
function bucketPour(w, tx, ty) {
  let rest = BUCKET_UNITS;
  const plan = [];
  for (let y = ty; y > ty - 4 && rest > 0; y--) {
    if (!w.inBounds(tx, y) || SOLID[w.getTile(tx, y)] || w.isWaterfall(tx, y) || (!w._isLavaView&&w.hasLava?.(tx,y))) break;
    const room = WATER_MAX - w.waterLevel(tx, y), add = Math.min(rest, room);
    if (add > 0) { plan.push([y, add]); rest -= add; }
  }
  if (rest > 0) return false;
  for (const [y, add] of plan) { w.water[y * w.w + tx] += add; w.wakeWater(tx, y); }
  return true;
}

// Botão direito com o balde na mão (js/game.js: handleInteraction)
function useBucket(g, tx, ty, inRange) {
  const slot = g.inventory.slots[g.selected], w = g.world;
  if (!slot || !inRange) { if (slot) toast('Longe demais.'); return; }
  if (slot.item === ITEM.BUCKET) {
    const cell = bucketWaterCell(w, tx, ty);
    if (!cell) { toast('Clique na água para encher o balde.'); return; }
    if (!bucketScoop(w, cell[0], cell[1])) { toast('Água rasa demais para encher o balde.'); return; }
    slot.item = ITEM.BUCKET_WATER;
    playSfx('splash', (cell[0] + 0.5) * T, cell[1] * T, { power: 0.5 });
  } else {
    if (SOLID[w.getTile(tx, ty)]) { toast('Não dá para despejar dentro de um bloco.'); return; }
    if (!bucketPour(w, tx, ty)) { toast('Não cabe mais água aqui.'); return; }
    slot.item = ITEM.BUCKET;
    playSfx('splash', (tx + 0.5) * T, ty * T, { power: 0.7 });
  }
}

RECIPES.push({ nome: 'Balde', ingredientes: [[ITEM.PLANKS, 5], [ITEM.STICK, 1]], resultado: { item: ITEM.BUCKET, quantidade: 1 } });
