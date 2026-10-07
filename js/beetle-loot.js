'use strict';

// =====================================================================================
//  ESPÓLIO DO CASCO DE FERRO  —  o que cai do Escavador (js/beetle-boss.js)
// =====================================================================================
// Cinco peças, todas garantidas:
//   Broca de Quitina      ferramenta: a única que quebra a ROCHA ENDURECIDA (e também pica pedra)
//   Marreta de Carapaça   arma lenta e pesada; jogar o bicho contra a parede o deixa atordoado
//   Escudo do Escavador   no cinto: botão direito (ou F) ergue o escudo; na hora certa quase
//                         anula o golpe e fortalece o próximo ataque
//   Botas de Areia        no cinto: areia não atrasa e o vento da tempestade quase não empurra
//   Mandíbula Farejadora  no cinto: estala perto de minério valioso, mais rápido quanto mais perto
//
// A rocha endurecida fecha o atalho do observatório e as cavernas seladas espalhadas pelo
// subsolo (sealHardCaverns, chamado no fim da geração do mundo).

Object.assign(ITEM, { CHITIN_DRILL: 181, CARAPACE_MAUL: 182, DIGGER_SHIELD: 183, SAND_BOOTS: 184, SNIFFER_MANDIBLE: 185 });
Object.assign(TILE, { HARD_ROCK: 94 });

// ---------- Rocha endurecida ----------
defTile(TILE.HARD_ROCK, {
  name: 'Rocha endurecida', hardness: 2.4, drop: ITEM.STONE, ferramenta: 'broca', exige: 'broca',
  color: [86, 66, 92],
});
MATERIAL_TEX[TILE.HARD_ROCK] = cellRock(4217, [92, 72, 100], [34, 24, 40], 22);
buildFlatTiles();

defItem(ITEM.CHITIN_DRILL, {
  name: 'Broca de Quitina', ferramenta: 'broca', ferramentas: ['picareta', 'broca'], nivel: 2, maxStack: 1,
  golpe: 0.3, forca: 0.62, alcanceFerramenta: TOOL_REACH_BASE + 1,
  descricao: 'A única ferramenta que atravessa rocha endurecida. Também serve de picareta rápida.',
});
// Golpe pesado da marreta: ergue bem atrás e desce com tudo
const MAUL_SWING = { preparacao: 0.2, corte: 0.14, recuperacao: 0.26, arcoAntes: 160, arcoDepois: 45, recuo: 30, espera: 0.18 };
defItem(ITEM.CARAPACE_MAUL, {
  name: 'Marreta de Carapaça', dano: 24, rapidez: 0.55, alcance: 30, maxStack: 1, perfilGolpe: MAUL_SWING,
  marreta: { empurrao: 400, janela: 0.45, atordoa: 1.6, extra: 8 },
  descricao: 'Lenta e pesadíssima: arremessa o bicho. Se ele bater numa parede, fica atordoado.',
});
defItem(ITEM.DIGGER_SHIELD, {
  name: 'Escudo do Escavador', acessorio: { escudo: true }, escudo: { janela: 0.22, tempo: 0.75, parry: 0.15, bloqueio: 0.55, bonus: 1.8, espera: 0.35 },
  maxStack: 1, descricao: 'No cinto: botão direito com arma (ou F) ergue o escudo. Na hora certa quase anula o golpe e o próximo ataque sai 80% mais forte.',
});
defItem(ITEM.SAND_BOOTS, {
  name: 'Botas de Areia', acessorio: { areia: true }, maxStack: 1,
  descricao: 'No cinto: andar na areia não atrasa e o vento das tempestades de areia quase não empurra.',
});
defItem(ITEM.SNIFFER_MANDIBLE, {
  name: 'Mandíbula Farejadora', acessorio: { farejar: 14 }, maxStack: 1,
  descricao: 'No cinto: estala perto de ferro, prata, ouro e ametista. Quanto mais perto, mais rápido.',
});

// ---------- Ícones ----------
{
  const C = { k: [20, 22, 30], i: [44, 54, 70], I: [74, 90, 112], s: [130, 148, 170], S: [206, 218, 230], b: [120, 72, 40], B: [182, 120, 62],
    o: [226, 170, 96], w: [96, 64, 40], y: [240, 200, 90], r: [150, 60, 40], g: [100, 190, 90], t: [214, 188, 140] };
  ITEM_ART[ITEM.CHITIN_DRILL] = { cores: C, pixels: [
    '................', '...........kS...', '..........kSIk..', '.........kSIIk..', '........kSIIk...', '.......kSIIk....',
    '......kSIIk.....', '.....kbBBk......', '....kbBBBk......', '...kbBBk........', '..kwbk..........', '.kwwk...........',
    'kwwk............', 'kwk.............', '.k..............', '................',
  ] };
  ITEM_ART[ITEM.CARAPACE_MAUL] = { cores: C, pixels: [
    '................', '....kkkkkkk.....', '...kIsSSsIIk....', '..kIsSSSSsIIk...', '..kiIIIIIIIik...', '..kkiiiiiiikk...',
    '.....kkwk.......', '......kwk.......', '......kwk.......', '......kwk.......', '......kwk.......', '......kwk.......',
    '......kbk.......', '......kBk.......', '.......k........', '................',
  ] };
  ITEM_ART[ITEM.DIGGER_SHIELD] = { cores: C, pixels: [
    '................', '...kkkkkkkkkk...', '..kIsSSSSSSsIk..', '..kIsSIIIISsIk..', '..kIIIsSSsIIIk..', '..kiIIIsSIIIik..',
    '..kiIIIsSIIIik..', '..kiiIIsSIIiik..', '...kiIIsSIIik...', '...kiiIsSIiik...', '....kiiIIiik....', '.....kiiiik.....',
    '......kiik......', '.......kk.......', '................', '................',
  ] };
  ITEM_ART[ITEM.SAND_BOOTS] = { cores: C, pixels: [
    '................', '................', '...kkkkk........', '...kbBBk........', '...kbBBk........', '...kbBBk........',
    '...kbBBk..kkkkk.', '...kbBBk..kbBBk.', '...kbBBBkkkbBBk.', '..kbBBBBBkkbBBk.', '.kbBoBBBBkkbBBBk', '.kttttttkkbBBBBk',
    '.kkkkkkkk.kttttk', '..........kkkkkk', '................', '................',
  ] };
  ITEM_ART[ITEM.SNIFFER_MANDIBLE] = { cores: C, pixels: [
    '................', '..kk........kk..', '.kIsk......kIsk.', '.kIIsk....kIIsk.', '..kIIsk..kIIsk..', '...kIIskkIIsk...',
    '....kIIIIIIk....', '....kiIyyIik....', '....kiiyyiik....', '.....kiiiik.....', '......kiik......', '.......kk.......',
    '................', '..y.........y...', '.y.y.......y.y..', '................',
  ] };
}

// ---------- Mineração: rocha endurecida só com a broca ----------
// Chamado por miningSpeed (js/game.js): 0 = essa ferramenta não arranha o bloco
function hardRockBlocked(tile, heldDef) {
  const need = TILE_DEFS[tile]?.exige;
  return !!need && !toolSupports(heldDef, need);
}
function hardRockHint(g) {
  if ((g.clock || 0) - (g.hardRockHintT ?? -9) < 3) return;
  g.hardRockHintT = g.clock || 0;
  toast('Rocha endurecida: nada arranha isso. Só uma broca de quitina atravessa.');
}

// ---------- Marreta de Carapaça: arremessa e atordoa contra a parede ----------
function beetleOnSwordHit(g, s, mob) {
  const rule = ITEM_DEFS[s.item]?.marreta;
  if (!rule || !mob || mob.dead) return;
  const dir = Math.sign(mob.cx - g.player.cx) || g.player.facing;
  if (!mob.boss) { mob.vx = dir * rule.empurrao; mob.vy = -140; mob.onGround = false; }
  mob.maulT = rule.janela; mob.maulDir = dir;
  g.shake = Math.max(g.shake, 3.5);
  // pancada de marreta: lascas de carapaça, poeira e um anel de choque (js/boss-fx.js)
  bfxImpact(g, mob.cx, mob.cy + 4, { pal: BFX_PAL.chitin, shards: 5, dust: 3, sparks: 6, dir, power: 1 });
  bfx(g, 'ring', mob.cx, mob.cy, { r0: 4, r1: 24, life: .3, color: [200, 220, 255], w: 3 });
  bfx(g, 'flash', mob.cx, mob.cy, { r0: 4, r1: 22, life: .18, color: [230, 240, 255], a: .5 });
  playSfx('break', mob.cx, mob.cy, { tile: TILE.STONE, vol: 0.6 });
}
// Bate na parede enquanto voa: atordoa (chefe atordoado fica mais tempo no chão)
function maulWallCheck(g, m, dt) {
  if (!(m.maulT > 0)) return;
  m.maulT -= dt;
  const rule = ITEM_DEFS[ITEM.CARAPACE_MAUL].marreta, dir = m.maulDir || 1;
  if (!m.collides(g.world, m.x + dir * 2, m.y - 1)) return;
  m.maulT = 0;
  m.hit(rule.extra, m.cx - dir * 20);
  g.shake = Math.max(g.shake, 4);
  spawnImpactStars(g, m);
  bfxImpact(g, m.cx + dir * m.w / 2, m.cy + 4, { pal: BFX_PAL.stone, shards: 9, dust: 6, sparks: 10, dir: -dir, power: 1.2 });
  bfx(g, 'ring', m.cx + dir * m.w / 2, m.cy, { r0: 4, r1: 30, flat: 1.6, life: .4, color: [255, 230, 160], w: 3 });
  if (!m.boss) { m.stunT = rule.atordoa; m.vx = 0; }
  else if (['stun', 'daze', 'flipped'].includes(m.state)) m.stateT = Math.max(0, m.stateT - 0.9); // atordoamento mais longo
  toast('Contra a parede! Atordoado.');
}
function spawnImpactStars(g, m) {
  (g.stunStars ??= []).push({ m, t: 0, life: 1.6 });
  for (let i = 0; i < 4; i++) bfx(g, 'star', m.cx + (Math.random() - 0.5) * 12, m.y, { vx: (Math.random() - 0.5) * 90, vy: -60 - Math.random() * 60, grav: 300, size: 2.5 + Math.random(), spin: 8, life: 0.6 });
}
// Atordoado: segura o bicho parado (mesma ideia do casulo, js/spider-loot.js)
function stunHold(m, dt) {
  if (!(m.stunT > 0)) return false;
  m.stunT -= dt; m.vx = 0;
  m.applyGravity(dt); m.moveY(m.vy * dt, game.world);
  m.hurtTimer = Math.max(0, (m.hurtTimer || 0) - dt);
  return true;
}

// ---------- Escudo do Escavador: bloqueio e aparo ----------
function updateShield(g, dt, rightPressed) {
  const rule = ITEM_DEFS[ITEM.DIGGER_SHIELD].escudo, p = g.player;
  const fKey = input.down('KeyF'), fEdge = fKey && !g._shieldF;
  g._shieldF = fKey;
  if (carriedShark(g) || cleaningShark(g)) { g.block = null; return; }
  if (g.block) {
    g.block.t += dt;
    if (g.block.t >= rule.tempo) { g.block = null; g.blockReady = (g.clock || 0) + rule.espera; }
  }
  if (g.parryBoost && (g.clock || 0) > g.parryBoost) g.parryBoost = 0;
  if (!hasAccessory(g, ITEM.DIGGER_SHIELD) || g.mount) { g.block = null; return; }
  const held = ITEM_DEFS[g.inventory.slots[g.selected]?.item];
  const wants = fEdge || (rightPressed && (!held || held.dano));
  if (wants && !g.block && (g.clock || 0) >= (g.blockReady || 0)) {
    g.block = { t: 0 };
    playSfx('swing', p.cx, p.cy, { vol: 0.5 });
  }
}
// Chamado por damageMonsterPlayer (js/monsters.js): devolve o dano depois do escudo
function shieldIncoming(g, damage, fromX, opts) {
  const b = g.block, p = g.player;
  if (!b || opts.pierce || !hasAccessory(g, ITEM.DIGGER_SHIELD)) return damage;
  const front = fromX == null || Math.sign(fromX - p.cx) === p.facing || Math.abs(fromX - p.cx) < 6;
  if (!front) return damage;
  const rule = ITEM_DEFS[ITEM.DIGGER_SHIELD].escudo;
  if (b.t <= rule.janela) { // aparo: na hora certa
    g.parryBoost = (g.clock || 0) + 4;
    g.parryFlash = 0.3;
    g.shake = Math.max(g.shake, 2);
    playSfx('hit', p.cx + p.facing * 10, p.cy, { tile: TILE.IRON_ORE });
    // aparo: clarão, anel e um leque de faíscas saindo do escudo (js/boss-fx.js)
    const sx = p.cx + p.facing * 11, sy = p.cy - 2;
    bfx(g, 'flash', sx, sy, { r0: 3, r1: 22, life: .22, color: [255, 236, 170], a: .45 });
    bfx(g, 'ring', sx, sy, { r0: 3, r1: 22, flat: 1.4, life: .3, color: [255, 226, 140], w: 2 });
    for (let i = 0; i < 16; i++) { const a = (p.facing > 0 ? 0 : Math.PI) + (Math.random() - 0.5) * 2.2, v = 140 + Math.random() * 200; bfx(g, 'spark', sx, sy, { vx: Math.cos(a) * v, vy: Math.sin(a) * v, grav: 400, life: .3 + Math.random() * .2, color: Math.random() < .5 ? [255, 236, 160] : [210, 225, 245] }); }
    bfx(g, 'glint', sx, sy - 6, { size: 6, life: .35 }); bfx(g, 'glint', sx + p.facing * 4, sy + 6, { size: 4, life: .3 });
    toast('Aparou! O próximo golpe sai mais forte.');
    return Math.max(0, Math.round(damage * rule.parry));
  }
  return Math.max(1, Math.round(damage * rule.bloqueio));
}

// ---------- Botas de Areia e o chão/vento do deserto ----------
// Chamado por gearVelocity (js/gear-movement.js)
function sandMovement(g, p, dt) {
  const boots = hasAccessory(g, ITEM.SAND_BOOTS), w = g.world;
  // Areia fofa atrasa o passo
  if (p.onGround && !boots) {
    const t = w.getTile(Math.floor(p.cx / T), Math.floor((p.y + p.h + 2) / T));
    if (t === TILE.SAND) { const cap = WALK_SPEED * 0.72; p.vx = clamp(p.vx, -cap, cap); }
  }
  // Tempestade de areia empurra quem está exposto
  const sand = g.weather?.sand || 0;
  if (sand > 0.15 && !p.climbing) {
    const wind = environmentWind(g, p.cx, p.cy).x;
    p.moveX(wind * sand * (boots ? 0.25 : 1) * 0.6 * dt, w); // arrasta ~40 px/s descalço, ~10 com as botas
  }
}

// ---------- Mandíbula Farejadora ----------
const SNIFF_ORES = () => new Set([TILE.IRON_ORE, TILE.SILVER_ORE, TILE.GOLD_ORE, TILE.AMETHYST_ORE]);
let sniffOres = null;
function updateSniffer(g, dt) {
  const r = accessoryPower(g, 'farejar');
  if (!r) { g.sniff = null; return; }
  sniffOres ??= SNIFF_ORES();
  const s = (g.sniff ??= { scan: 0, dist: null, click: 0 }), p = g.player, w = g.world;
  if ((s.scan -= dt) <= 0) {
    s.scan = 0.25;
    const cx = Math.floor(p.cx / T), cy = Math.floor(p.cy / T);
    let best = null;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (!sniffOres.has(w.getTile(cx + dx, cy + dy))) continue;
      const d = Math.hypot(dx, dy);
      if (d <= r && (best === null || d < best)) { best = d; s.dir = Math.atan2(dy, dx); }
    }
    s.dist = best;
  }
  if (s.dist === null) return;
  // Estalo: de ~1,3 s longe até 0,08 s colado no minério, acelerando rápido quando chega perto
  if ((s.click -= dt) <= 0) {
    s.click = 0.08 + 1.2 * Math.pow(clamp(s.dist / r, 0, 1), 1.5);
    playSfx('sniffClick', p.cx, p.cy, { near: 1 - s.dist / r });
    s.flash = 0.08;
    bfx(g, 'arc', p.cx + p.facing * 9, p.y + 6, { ang: s.dir ?? 0, spread: 0.45, r0: 3, r1: 16 + 14 * (1 - s.dist / r), count: 2, life: 0.4, w: 1.5, color: [255, 216, 110] });
  }
  if (s.flash > 0) s.flash -= dt;
}

Object.assign(SFX, {
  sniffClick(A, o, { near = 0.5 } = {}) {
    Tn(A, o, { freq: 2400 + near * 1800, freqEnd: 1600 + near * 1200, dur: 0.025, gain: 0.07 + near * 0.08 });
    N(A, o, { type: 'bandpass', freq: 3800, q: 6, dur: 0.02, gain: 0.06 + near * 0.05 });
  },
});

// ---------- Cavernas seladas por rocha endurecida (fim da geração do mundo) ----------
LOOT_TABLES.geodo = [
  [ITEM.GOLD, 3, 8, 0.8], [ITEM.SILVER, 3, 8, 0.7], [ITEM.AMETHYST, 2, 6, 0.6], [ITEM.CRYSTAL, 1, 4, 0.5],
  [ITEM.METAL_BAR, 2, 5, 0.5], [ITEM.MEDKIT, 1, 2, 0.4], [ITEM.TORCH, 4, 10, 0.5],
];
function sealHardCaverns(w, rnd) {
  const count = Math.max(2, Math.floor(w.w / 700)), made = [];
  const avoid = [
    ...(w.bearLairs || []).map(({ bounds: [a, b, c, d] }) => [a - 24, b, c + 24, d]), ...(w.spiderNests || []).map((n) => n.bounds), ...(w.beetleLairs || []).map((n) => n.bounds),
    ...(w.coreTop ? [[0, w.coreTopMin - 14, w.w, w.h]] : []), // o Coração da Ilha (js/core-world.js)
  ].filter(Boolean);
  for (let t = 0; t < count * 20 && made.length < count; t++) {
    const cx = 40 + Math.floor(rnd() * (w.w - 80)), cy = Math.floor(w.surface[cx] + 30 + rnd() * (w.h * 0.55));
    if (cy > w.h - 20) continue;
    const rx = 7 + Math.floor(rnd() * 3), ry = 4 + Math.floor(rnd() * 2);
    if (avoid.some(([a, b, c, d]) => cx + rx + 8 > a && cx - rx - 8 < c && cy + ry + 8 > b && cy - ry - 8 < d)) continue;
    if (made.some(([x, y]) => Math.abs(x - cx) < 40 && Math.abs(y - cy) < 30)) continue;
    // Casca de rocha endurecida de dois blocos em volta de uma câmara com minério e um baú
    for (let y = cy - ry - 2; y <= cy + ry + 2; y++) for (let x = cx - rx - 2; x <= cx + rx + 2; x++) {
      if (!w.inBounds(x, y)) continue;
      const k = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2, shell = ((x - cx) / (rx + 2)) ** 2 + ((y - cy) / (ry + 2)) ** 2;
      const i = y * w.w + x;
      if (k <= 1) { w.tiles[i] = TILE.AIR; w.walls[i] = WALL.STONE; w.water[i] = 0; }
      else if (shell <= 1) { w.tiles[i] = TILE.HARD_ROCK; w.water[i] = 0; }
    }
    const floor = cy + ry;
    for (let x = cx - rx + 1; x < cx + rx; x++) {
      if (w.getTile(x, floor) === TILE.AIR && w.getTile(x, floor + 1) !== TILE.AIR) {
        if (rnd() < 0.25) w.tiles[floor * w.w + x] = TILE.CRYSTAL;
      }
    }
    // veios valiosos colados na parede de dentro
    for (let k = 0; k < 8; k++) {
      const a = rnd() * Math.PI * 2, x = Math.round(cx + Math.cos(a) * (rx + 0.6)), y = Math.round(cy + Math.sin(a) * (ry + 0.6));
      if (w.getTile(x, y) === TILE.HARD_ROCK) w.tiles[y * w.w + x] = [TILE.GOLD_ORE, TILE.SILVER_ORE, TILE.AMETHYST_ORE][k % 3];
    }
    addLootChest(w, cx, floor, 'geodo', rnd);
    w.tiles[(floor + 1) * w.w + cx] = TILE.HARD_ROCK;
    w.tiles[floor * w.w + cx] = TILE.CHEST;
    made.push([cx, cy]);
  }
  w.hardCaverns = made;
}

// ---------- Ciclo ----------
function updateBeetleLoot(g, dt) {
  const right = input.mouse.right, rightEdge = right && !g._shieldR;
  g._shieldR = right;
  updateShield(g, dt, rightEdge && !g.inventoryUI?.open);
  updateSniffer(g, dt);
}
