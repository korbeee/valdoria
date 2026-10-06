'use strict';

// Itens soltos no chão (Q, ou arrastar para fora do inventário) e desmontagem de itens.
const DROP_PICKUP_DELAY = 0.8; // segundos antes de o item poder ser pego de volta
const DROP_LIFETIME = 300;     // some depois de 5 minutos no chão
const DROP_MAGNET_RANGE = 24;  // px além da borda do corpo em que o item começa a vir para o jogador
const DROP_MAGNET_SPEED = 260; // px/s máximos do item voando até o jogador

// O que cada item vira ao ser desmontado (por unidade)
const SALVAGE = {
  [ITEM.SEATBELT]: [[ITEM.CLOTH, 1], [ITEM.BOLTS, 1]],
  [ITEM.BLANKET]: [[ITEM.CLOTH, 3]],
  [ITEM.SCRAP]: [[ITEM.BOLTS, 2]],
  [ITEM.MEDKIT]: [[ITEM.BANDAGE, 2]],
  [ITEM.DOOR]: [[ITEM.PLANKS, 4]],
  [ITEM.CHEST]: [[ITEM.PLANKS, 6]],
  [ITEM.CAMPFIRE]: [[ITEM.WOOD, 2], [ITEM.STICK, 2]],
  [ITEM.PLANKS]: [[ITEM.STICK, 2]],
  [ITEM.TORCH]: [[ITEM.STICK, 1]],
  [ITEM.GLASS]: [[ITEM.SAND, 1]],
  [ITEM.STONE_BRICK]: [[ITEM.STONE, 1]],
  [ITEM.WOOD_PICKAXE]: [[ITEM.STICK, 2]], [ITEM.WOOD_AXE]: [[ITEM.STICK, 2]], [ITEM.WOOD_SHOVEL]: [[ITEM.STICK, 2]], [ITEM.WOOD_SWORD]: [[ITEM.STICK, 2]],
  [ITEM.STONE_PICKAXE]: [[ITEM.STONE, 1], [ITEM.STICK, 1]], [ITEM.STONE_AXE]: [[ITEM.STONE, 1], [ITEM.STICK, 1]],
  [ITEM.STONE_SHOVEL]: [[ITEM.STONE, 1], [ITEM.STICK, 1]], [ITEM.STONE_SWORD]: [[ITEM.STONE, 1], [ITEM.STICK, 1]],
  [ITEM.METAL_PICKAXE]: [[ITEM.METAL_BAR, 1], [ITEM.STICK, 1]], [ITEM.METAL_AXE]: [[ITEM.METAL_BAR, 1], [ITEM.STICK, 1]],
  [ITEM.METAL_SHOVEL]: [[ITEM.METAL_BAR, 1], [ITEM.STICK, 1]], [ITEM.METAL_SWORD]: [[ITEM.METAL_BAR, 1], [ITEM.STICK, 1]],
  [ITEM.BONE_SWORD]: [[ITEM.BONE, 2]],
  [ITEM.STINGER_SWORD]: [[ITEM.STINGER, 1], [ITEM.METAL_BAR, 1]],
  [ITEM.SADDLE]: [[ITEM.LEATHER, 4]],
  [ITEM.TIGER_KNIFE]: [[ITEM.TIGER_TOOTH, 1], [ITEM.STICK, 1]],
  [ITEM.TIGER_CLAWS]: [[ITEM.TIGER_CLAW, 3], [ITEM.LEATHER, 1]],
  [ITEM.LEATHER_ARMOR]: [[ITEM.LEATHER, 4]],
  [ITEM.IRON_ARMOR]: [[ITEM.METAL_BAR, 4]],
  [ITEM.SPEAR]: [[ITEM.STICK, 2]],
  [ITEM.WOOD_HAMMER]: [[ITEM.STICK, 2]], [ITEM.STONE_HAMMER]: [[ITEM.STONE, 2], [ITEM.STICK, 1]], [ITEM.METAL_HAMMER]: [[ITEM.METAL_BAR, 2], [ITEM.STICK, 1]],
  [ITEM.LADDER]: [[ITEM.STICK, 1]],
  [ITEM.ROPE]: [[ITEM.CLOTH, 1]],
  [ITEM.IVORY_HORN]: [[ITEM.IVORY, 2]],
};

const salvageText = (item) => SALVAGE[item]
  ? 'Vira ' + SALVAGE[item].map(([i, n]) => `${n}× ${ITEM_DEFS[i].name}`).join(' + ')
  : 'Não dá para desmontar';

// ---------- Itens no chão ----------
function dropItem(g, item, count, x, y, dir = 0) {
  if (!count) return;
  // Arremesso curto: o item cai a um passo do jogador, não longe demais
  (g.drops ??= []).push({ item, count, x, y, vx: dir * (40 + Math.random() * 15), vy: -120, age: 0, delay: DROP_PICKUP_DELAY });
  playSfx('place', x, y, { tile: TILE.DIRT, vol: 0.35 });
}

// Solta na frente do jogador, para o lado em que ele está olhando
function dropFromPlayer(g, item, count) {
  const p = g.player;
  dropItem(g, item, count, p.cx + p.facing * 10, p.y + 18, p.facing);
  g.drops[g.drops.length - 1].delay = 2; // o ímã não devolve na hora o que acabou de soltar
}

// Q solta 1 item da barra rápida; Shift+Q solta a pilha inteira
function dropSelected(g, all) {
  const slot = g.inventory.slots[g.selected];
  if (!slot) return;
  const n = all ? slot.count : 1;
  dropFromPlayer(g, slot.item, n);
  slot.count -= n;
  if (slot.count <= 0) g.inventory.slots[g.selected] = null;
}

function updateDrops(g, dt) {
  const list = g.drops;
  if (!list?.length) return;
  const w = g.world, p = g.player, H = 8; // metade da altura do ícone
  for (let i = list.length - 1; i >= 0; i--) {
    const d = list[i];
    d.age += dt; d.delay -= dt;
    if (d.age > DROP_LIFETIME && !ITEM_DEFS[d.item]?.bossItem) { list.splice(i, 1); continue; }
    // Coleta encostando: o item fica parado no chão até o jogador passar por cima dele
    const dx = p.cx - d.x, dy = p.y + p.h * 0.6 - d.y;
    if (d.delay <= 0 && Math.abs(dx) < p.w / 2 + 6 && Math.abs(dy) < p.h * 0.6 && g.inventory.canAdd(d.item, 1)) {
      // multijogador: quem pega é decidido pelo anfitrião (js/net.js)
      if (typeof netClaimDrop === 'function' && netClaimDrop(g, d)) continue;
      const left = g.inventory.add(d.item, d.count);
      if (left < d.count) { playSfx('pickup'); toast(`+${d.count - left} ${ITEM_DEFS[d.item].name}`); }
      if (left === 0) { list.splice(i, 1); continue; }
      d.count = left; d.delay = 1.5;
    }
    // Ímã: a uns 1,5 bloco do corpo o item voa até o jogador (acelerando, atravessando o terreno)
    // distância até a caixa do corpo (um item um degrau abaixo dos pés também conta como perto)
    const gapX = Math.max(0, Math.abs(dx) - p.w / 2), gapY = Math.max(0, d.y - (p.y + p.h), p.y - d.y);
    if (d.delay <= 0 && Math.hypot(gapX, gapY) < DROP_MAGNET_RANGE && g.inventory.canAdd(d.item, 1) && !g.player.dead) {
      const dist = Math.max(1, Math.hypot(dx, dy));
      d.pull = Math.min(DROP_MAGNET_SPEED, (d.pull || 60) + DROP_MAGNET_SPEED * 3 * dt);
      const step = Math.min(dist, d.pull * dt);
      d.x += dx / dist * step; d.y += dy / dist * step; d.vx = 0; d.vy = 0; d.floating = false;
      continue;
    }
    d.pull = 0;
    // Na água o item boia e dança com as ondas (js/water-waves.js)
    if (dropWaterPhysics(g, d, dt)) continue;
    // Física simples: cai, bate em parede e para no chão
    d.vy = Math.min(d.vy + 900 * dt, 500);
    const nx = d.x + d.vx * dt;
    if (w.isSolid(Math.floor(nx / T), Math.floor(d.y / T))) d.vx = 0; else d.x = nx;
    const ny = d.y + d.vy * dt, footY = Math.floor((ny + H) / T);
    if (d.vy > 0 && w.isSolid(Math.floor(d.x / T), footY)) { d.y = footY * T - H; d.vy = 0; d.vx *= Math.pow(0.01, dt); }
    else d.y = ny;
  }
}

// Espaço do mundo: ícone flutuando com sombrinha; pilhas mostram uma segunda cópia atrás
function drawDrops(ctx, g, atlas) {
  const list = g.drops;
  if (!list?.length) return;
  const vx0 = g.cam.x - 32, vx1 = g.cam.x + canvas.width / g.zoom + 32;
  for (const d of list) {
    if (d.x < vx0 || d.x > vx1) continue;
    const bob = d.vy === 0 && !d.floating ? Math.round(Math.sin(d.age * 3 + d.x) * 1.5) : 0;
    const x = Math.round(d.x - 8), y = Math.round(d.y - 8 + bob - 2);
    if (!ITEM_DEFS[d.item]?.bossItem && d.age > DROP_LIFETIME - 10 && Math.floor(d.age * 6) % 2) continue; // pisca antes de sumir
    if (!d.floating) { ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.fillRect(Math.round(d.x - 5), Math.round(d.y + 7), 10, 2); }
    if (d.count > 1) { ctx.globalAlpha = 0.7; ctx.drawImage(atlas, d.item * T, 0, T, T, x + 3, y - 2, T, T); ctx.globalAlpha = 1; }
    ctx.drawImage(atlas, d.item * T, 0, T, T, x, y, T, T);
  }
}
