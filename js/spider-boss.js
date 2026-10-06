'use strict';

// =====================================================================================
//  FIANDEIRA, A MATRIARCA DO POÇO  —  chefe da mina abandonada
// =====================================================================================
// Uma mina velha desce por um poço de escada até uma galeria funda, fechada em rocha
// matriz. Lá dentro há plataformas de madeira dos mineiros, e no canto de cima o ninho,
// que guarda os baús de uma expedição que nunca voltou (buildSpiderMine, mais abaixo).
//
// Entrar na galeria acorda a Fiandeira e uma teia grossa fecha a passagem.
//   • No chão     anda atrás do jogador, morde de perto e cospe bolas de seda.
//   • No teto     sobe por um fio, persegue pelo teto e gruda as plataformas com teia.
//   • O bote      mira de cima (um fio aparece), despenca e fica ZONZA ao bater no chão:
//                 é a brecha, leva 1,5× de dano.
// Abaixo de 40% ela fica FURIOSA: mais rápida, cospe três bolas e chama filhotes.
// Teia no chão ou uma bola de seda deixam o jogador lento (js/gear-movement.js).

WILD_PALETTES.fiandeira = [[22, 15, 29], [48, 29, 57], [83, 47, 91], [128, 76, 133], [180, 125, 173]];
WILD_SIZES.fiandeira = [SPIDER_SHEET.W, SPIDER_SHEET.H];
WILDLIFE.fiandeira = {
  name: 'Fiandeira, a Matriarca do Poço', biome: BIOME.JUNGLE, where: 'Mina abandonada', hostile: true, unique: true,
  hp: 300, speed: 92, damage: 0, w: 56, h: 26, shape: 'fiandeira', color: '#4a3450', drops: [],
};
MOB_SFX.fiandeira = 'bug';

const SPIDER = {
  contact: 10, bite: 18, land: 22, shot: 6,
  biteRange: 3.4, spitRange: [4, 17],
  daze: 1.35, dazeTaken: 1.5,
  climbSpeed: 210, dropSpeed: 600, shotSpeed: 330,
  brood: 3,
};
const spiderEnraged = (m) => m.hp < m.def.hp * 0.4;
const spiderState = (m, s) => { m.state = s; m.stateT = 0; };

// Teia grossa: fecha a entrada durante a luta. Não quebra.
Object.assign(TILE, { THICK_WEB: 93 });
defTile(TILE.THICK_WEB, { name: 'Teia grossa', hardness: Infinity, opacity: 0.5, color: [220, 216, 228] });
ITEM_ART.__thickWeb = {
  cores: { a: [236, 232, 244], b: [196, 190, 208], c: [150, 142, 166], d: [98, 90, 112] },
  pixels: [
    'dcbaabcddcbaabcd', 'cbaaabbccbbaaabc', 'baabcdccdcbaaabb', 'aabcdcbaabcdcbaa', 'abcdcbaaaabcdcba', 'bcdcbaabbaabcdcb',
    'cdcbaabccbaabcdc', 'dcbaabcddcbaabcd', 'dcbaabcddcbaabcd', 'cdcbaabccbaabcdc', 'bcdcbaabbaabcdcb', 'abcdcbaaaabcdcba',
    'aabcdcbaabcdcbaa', 'baabcdccdcbaaabb', 'cbaaabbccbbaaabc', 'dcbaabcddcbaabcd',
  ],
};
MATERIAL_TEX[TILE.THICK_WEB] = flatFromArt(ITEM_ART.__thickWeb);
delete ITEM_ART.__thickWeb;
buildFlatTiles();

// Os equipamentos da expedição sumida
LOOT_TABLES.expedicao = [
  [ITEM.ROPE, 2, 4, 0.9], [ITEM.TORCH, 6, 12, 0.9], [ITEM.MEDKIT, 1, 2, 0.7], [ITEM.BANDAGE, 2, 4, 0.8],
  [ITEM.METAL_PICKAXE, 1, 1, 0.6], [ITEM.COOKED_MEAT, 2, 4, 0.6], [ITEM.WATER, 1, 3, 0.5], [ITEM.METAL_BAR, 2, 5, 0.5],
  [ITEM.BOW, 1, 1, 0.3], [ITEM.ARROW, 8, 16, 0.5], [ITEM.LADDER, 4, 8, 0.5], [ITEM.CLOTH, 2, 5, 0.4],
];

Object.assign(SFX, {
  spiderScreech(A, o) {
    voice(A, o, { type: 'square', f0: 900, f1: 420, dur: 0.7, gain: 0.35, formants: [[1800, 6], [3200, 8]], vib: 60, vibRate: 40 });
    N(A, o, { type: 'highpass', freq: 2500, dur: 0.6, gain: 0.25 });
  },
  spiderHiss(A, o) { N(A, o, { type: 'bandpass', freq: 3200, q: 1.5, dur: 0.35, gain: 0.35, attack: 0.05 }); },
  spiderSpit(A, o) { N(A, o, { type: 'bandpass', freq: 1200, freqEnd: 400, q: 2, dur: 0.18, gain: 0.35 }); },
  spiderLand(A, o) { N(A, o, { freq: 160, dur: 0.35, gain: 0.8, brown: true }); Tn(A, o, { freq: 90, freqEnd: 40, dur: 0.25, gain: 0.35 }); },
  silkThread(A, o) { N(A, o, { type: 'bandpass', freq: 5200, freqEnd: 2600, q: 4, dur: 0.25, gain: 0.12 }); },
});

// ==================== MINA ABANDONADA (geração do mundo) ====================
const SPIDER_MINE = { HW: 22, H: 13, depth: 40 }; // baixa o bastante para o teto caber na tela

// Chamado de generateStructures (js/structures.js). Procura uma selva (ou outro bioma)
// larga, longe do nascimento e dos outros chefes.
function buildSpiderMine(w, rnd, freeSpot, taken) {
  const { HW, H, depth } = SPIDER_MINE;
  // Primeiro longe do nascimento; num mundo pequeno demais, aceita qualquer lugar livre
  const loose = (a, b) => taken.every(([c, d]) => b < c - 4 || a > d + 4);
  for (let pass = 0; pass < 2; pass++)
  for (const kind of [BIOME.JUNGLE, BIOME.DESERT, BIOME.SNOW, BIOME.SAKURA, BIOME.FOREST, BIOME.SAVANNA]) {
    const runs = biomeRuns(w, kind).filter(([a, b]) => b - a > 40).sort((p, q) => (q[1] - q[0]) - (p[1] - p[0]));
    for (const [a, b] of runs) for (let t = 0; t < 30; t++) {
      const cx = a + 10 + Math.floor(rnd() * Math.max(1, b - a - 20));
      if (cx - HW - 20 < 8 || cx + HW + 20 > w.w - 8) continue;
      if (!(pass ? loose : freeSpot)(cx - HW - 16, cx + HW + 16)) continue;
      if ((w.bearLairs || []).some(({ bounds: [a, , c] }) => cx + HW + 24 > a && cx - HW - 24 < c)) continue;
      const y1 = Math.min(w.h - 12, w.surface[cx] + depth);
      if (y1 - H - 4 < w.surface[cx] + 8) continue;
      taken.push([cx - HW - 18, cx + HW + 18]);
      carveSpiderMine(w, rnd, cx, y1);
      return;
    }
  }
}

function carveSpiderMine(w, rnd, cx, y1) {
  const { HW, H } = SPIDER_MINE;
  const x0 = cx - HW, x1 = cx + HW, y0 = y1 - H;
  const side = rnd() < 0.5 ? -1 : 1; // lado da entrada; o ninho fica do outro
  const clearWater = (x, y) => { if (w.inBounds(x, y)) w.water[y * w.w + x] = 0; };
  // Casca de rocha matriz e galeria vazia
  for (let y = y0 - 3; y <= y1 + 3; y++) for (let x = x0 - 3; x <= x1 + 3; x++) {
    if (!w.inBounds(x, y)) continue;
    const inside = x >= x0 && x <= x1 && y >= y0 && y < y1;
    sSet(w, x, y, inside ? TILE.AIR : TILE.BEDROCK, inside && (x - x0) % 7 === 3 ? WALL.PLANKS : WALL.STONE);
    clearWater(x, y);
  }
  // Teto irregular de pedra solta, sem fechar a galeria
  for (let x = x0; x <= x1; x++) {
    if (fbm2(x * 0.3, y0 * 0.1, 911, 2) > 0.56) sSet(w, x, y0, TILE.STONE, WALL.STONE); // uma fileira no máximo: não prende a aranha
  }
  // Pilares dos mineiros e lampiões velhos
  for (let x = x0 + 3; x <= x1 - 3; x += 7) {
    for (let y = y0; y < y1; y++) if (w.getTile(x, y) === TILE.AIR) sSet(w, x, y, TILE.CARVED_BEAM, WALL.PLANKS);
  }
  // Lampiões nos pilares e tochas baixas: a luta não acontece no escuro
  for (let x = x0 + 3; x <= x1 - 3; x += 7) { sSet(w, x, y0 + 2, TILE.LANTERN, WALL.PLANKS); sSet(w, x, y1 - 3, TILE.LANTERN, WALL.PLANKS); }
  for (const x of [x0 + 1, x1 - 1]) for (const y of [y0 + 5, y1 - 2]) sSet(w, x, y, TILE.TORCH, WALL.STONE);
  // Plataformas de madeira: duas baixas e uma alta no meio
  const plat = (a, b, y) => { for (let x = a; x <= b; x++) sSet(w, x, y, TILE.PLATFORM); };
  plat(x0 + 4, x0 + 12, y1 - 5); plat(x1 - 12, x1 - 4, y1 - 5); plat(cx - 5, cx + 5, y1 - 9);
  // O ninho: prateleira de tábuas no canto de cima, longe da entrada, cheia de casulos
  const nestWall = side < 0 ? x1 : x0, nx0 = side < 0 ? x1 - 8 : x0, nx1 = side < 0 ? x1 : x0 + 8, ny = y0 + 6;
  for (let x = nx0; x <= nx1; x++) sSet(w, x, ny, TILE.PLANKS, WALL.STONE);
  for (let x = nx0; x <= nx1; x++) for (let y = y0 + 1; y < ny - 1; y++) if (rnd() < 0.28 && w.getTile(x, y) === TILE.AIR) sSet(w, x, y, TILE.COBWEB);
  addLootChest(w, nestWall + side * 2, ny - 1, 'expedicao', rnd);
  addLootChest(w, nestWall + side * 5, ny - 1, 'expedicao', rnd);
  for (const [x, y] of [[x0, y0], [x1, y0], [x0 + 1, y0], [x1 - 1, y0], [x0, y1 - 1], [x1, y1 - 1]])
    if (w.getTile(x, y) === TILE.AIR) sSet(w, x, y, TILE.COBWEB);
  // Entrada: vão de 4 blocos na casca, depois um túnel escorado até o poço
  const doorX = side < 0 ? x0 - 1 : x1 + 1, door = [];
  for (let y = y1 - 4; y < y1; y++) for (let k = 0; k < 3; k++) {
    const x = doorX + side * k; sSet(w, x, y, TILE.AIR, WALL.STONE); door.push([x, y]); clearWater(x, y);
  }
  const shaft = [];
  const dig = (x, y, t = TILE.AIR, wall = WALL.PLANKS) => { sSet(w, x, y, t, wall); clearWater(x, y); shaft.push([x, y, t]); };
  let tx = doorX + side * 3;
  for (let k = 0; k < 9; k++, tx += side) {
    for (let y = y1 - 4; y < y1; y++) dig(tx, y, (k % 4 === 2) ? TILE.CARVED_BEAM : TILE.AIR);
    dig(tx, y1, TILE.PLANKS, WALL.STONE); dig(tx, y1 - 5, TILE.PLANKS, WALL.STONE);
    if (k % 3 === 1 && rnd() < 0.7) sSet(w, tx, y1 - 4, TILE.COBWEB, WALL.PLANKS);
  }
  // Poço vertical com escada até a superfície
  const sx = tx + side;
  for (let y = y1 - 1; y > w.surface[sx] - 6; y--) {
    dig(sx - 1, y); dig(sx + 1, y);
    dig(sx, y, y < w.surface[sx] ? TILE.AIR : TILE.LADDER);
    if (y > w.surface[sx] + 1) { dig(sx - 2, y, TILE.PLANKS, WALL.PLANKS); dig(sx + 2, y, TILE.PLANKS, WALL.PLANKS); }
  }
  // Boca da mina: dois pilares e uma trave em cima
  const top = w.surface[sx];
  for (let y = top - 4; y < top; y++) { sSet(w, sx - 2, y, TILE.CARVED_BEAM); sSet(w, sx + 2, y, TILE.CARVED_BEAM); }
  for (let x = sx - 2; x <= sx + 2; x++) sSet(w, x, top - 5, TILE.PLANKS);
  // Cofre da expedição na prateleira do ninho e as páginas do diário (js/story.js)
  storySpiderCage(w, rnd, x0, x1, y0, y1, side); // gaiola da expedição sobre o poço (js/story.js)
  (w.spiderNests ??= []).push({
    x: (side < 0 ? x1 - 4 : x0 + 4) * T + T / 2, ceilY: y0 * T, floorY: y1 * T,
    bounds: [x0, y0, x1, y1 - 1], door, shaft, entrance: { x: sx, y: top },
  });
  buildSpiderHabitat(w,w.spiderNests.at(-1));
}

// Chamado no fim da geração: poças e areia de vedação podem entupir o poço da mina
function reopenSpiderShafts(w) {
  for (const nest of w.spiderNests || []) {
    for (const [x, y, t] of nest.shaft) {
      const i = y * w.w + x;
      w.tiles[i] = t; w.water[i] = 0;
      for (const j of [i - 1, i + 1, i - w.w, i + w.w]) if (w.water[j]) { w.water[j] = 0; if (!SOLID[w.tiles[j]]) w.tiles[j] = TILE.STONE; }
    }
    for (const [x, y] of nest.door) { w.tiles[y * w.w + x] = TILE.AIR; w.water[y * w.w + x] = 0; }
  }
}

// ==================== O CHEFE ====================
// Enquanto o Tigre da Savana vive, a Fiandeira dorme presa num casulo no teto do ninho:
// não acorda, não leva dano e a entrada não fecha. Os chefes têm ordem.
const spiderLocked = () => !game.tigerSlain;

function setupFiandeira(m, nest) {
  Object.assign(m, {
    boss: true, keep: true, sleeping: true, aware: false, state: spiderLocked() ? 'cocoon' : 'sleep', stateT: 0, mode: 'ceiling',
    biteCd: 1.5, spitCd: 2.5, lassoCd: 4, climbCd: 7, webCd: 1.2, rainCd: 3, eggT: 6, damage: 0, phase: 1, anchorY: 0,
  });
  m.nest = nest ? { x: nest.x, ceilY: nest.ceilY, floorY: nest.floorY, door: nest.door || [], bounds: nest.bounds || null }
    : { x: m.cx, ceilY: m.y - 12 * T, floorY: m.y + m.h, door: [], bounds: null };
  m.x = m.nest.x - m.w / 2; m.y = m.nest.ceilY + 2 * T; spiderStickCeiling(m, game?.world);
}

function spawnFiandeira(g, nest) {
  const m = new Wildlife("fiandeira", nest.x - WILDLIFE.fiandeira.w / 2, nest.ceilY + 2 * T);
  setupFiandeira(m, nest);
  spiderStickCeiling(m, g.world);
  g.mobs.push(m);
  return m;
}

// Chamado quando o tigre cai (bossDefeated, js/savanna.js): o casulo começa a rasgar
function spiderTigerSlain(g) {
  g.tigerSlain = true;
  const m = g.mobs.find((o) => o.kind === 'fiandeira' && !o.dead);
  if (m && m.state === 'cocoon') { spiderState(m, 'hatch'); m.hatchFar = true; }
  setTimeout(() => toast('Longe dali, no fundo de uma mina, um casulo imenso começa a se rasgar...'), 2600);
}

// Gruda no teto logo acima: procura o primeiro bloco sólido subindo pela coluna do meio
function spiderCeilingAt(w, m, cx = m.cx) {
  if (!w) return null;
  const tx = Math.floor(cx / T), start = Math.floor((m.y + m.h) / T);
  for (let ty = start; ty > start - 24; ty--) {
    if (w.isSolid(tx, ty) || w.isSolid(Math.floor((cx - m.w * 0.3) / T), ty) || w.isSolid(Math.floor((cx + m.w * 0.3) / T), ty)) return (ty + 1) * T;
  }
  return null;
}
function spiderStickCeiling(m, w) {
  const c = spiderCeilingAt(w, m);
  if (c === null) return false;
  m.y = c + 0.01; m.vy = 0; m.onGround = false; m.mode = 'ceiling'; m.anchorY = c;
  return true;
}
// Chão logo abaixo de um ponto (para o alvo do bote e os ovos)
function spiderFloorBelow(w, x, y) {
  const tx = Math.floor(x / T);
  for (let ty = Math.floor(y / T); ty < Math.floor(y / T) + 30; ty++) {
    if (w.isSolid(tx, ty) || TILE_DEFS[w.getTile(tx, ty)]?.plataforma) return ty * T;
  }
  return y + 12 * T;
}

function spiderSeal(g, m, on, p = null) {
  const door = m.nest?.door || [];
  if (on && p && door.some(([x, y]) => p.x < (x + 1) * T && p.x + p.w > x * T && p.y < (y + 1) * T && p.y + p.h > y * T)) return false;
  for (const [x, y] of door) g.world.setTile(x, y, on ? TILE.THICK_WEB : TILE.AIR);
  g.world.lightDirty = true;
  return true;
}

function spiderInArena(m, p) {
  const b = m.nest?.bounds;
  if (!b) return Math.hypot(p.cx - m.cx, p.cy - m.cy) < 14 * T;
  return p.x >= b[0] * T && p.x + p.w <= (b[2] + 1) * T && p.y >= b[1] * T && p.y + p.h <= (b[3] + 1) * T + 1;
}

function fiandeiraGoHome(g, m) {
  if (!m.nest) return;
  m.x = m.nest.x - m.w / 2; m.y = m.nest.ceilY + 2 * T; m.vx = m.vy = 0;
  m.hp = m.def.hp; m.sleeping = true; m.aware = false; m.damage = 0; m.phase = 1;
  m.biteCd = 1.5; m.spitCd = 2.5; m.lassoCd = 4; m.climbCd = 7; m.webCd = 1.2; m.rainCd = 3; m.eggT = 6;
  m.poison = null; m.bleed = null; m.hurtTimer = 0; m.stepOffset = 0; m.bitten = false;
  spiderStickCeiling(m, g.world);
  spiderSeal(g, m, false);
  spiderClearFight(g);
  if (g.player) { g.player.venom = null; g.player.pullT = 0; }
  spiderState(m, spiderLocked() ? 'cocoon' : 'sleep');
  if (g.boss === m) g.boss = null;
}

// Tira bolas de seda, teias, ovos, laço e filhotes da arena
function spiderClearFight(g) {
  guardianClear(g, 'fiandeira');
  g.spiderShots = []; g.spiderWebs = []; g.spiderEggs = []; g.spiderLasso = null; g.spiderFx = [];
  for (const o of g.mobs) if (o.brood) o.despawn = true;
}

function spiderDust(g, m, n, color = 'rgb(120,104,96)') {
  for (let i = 0; i < n && g.particles.length < 420; i++) g.particles.push({
    x: m.cx + (Math.random() - 0.5) * m.w, y: m.y + m.h - Math.random() * 4,
    vx: (Math.random() - 0.5) * 140, vy: -Math.random() * 100, life: 0.5 + Math.random() * 0.4, maxLife: 0.9, color,
  });
}

// ---------- Efeitos visuais dos golpes (desenhados depois da luz, brilham no escuro) ----------
function spiderFx(g, type, x, y, opts = {}) {
  const list = (g.spiderFx ??= []);
  list.push({ type, x, y, t: 0, life: opts.life ?? 0.5, ...opts });
  if (list.length > 60) list.shift();
}
// Ponto de onde sai a seda: as fiandeiras na traseira (no teto, viradas para baixo)
function spiderSpinneret(m) {
  if (m.mode === 'ceiling') return { x: m.cx - m.facing * 8, y: m.y + 22 };
  return { x: m.cx - m.facing * 6, y: m.y + m.h * 0.75 };
}

// Bola de seda em arco na direção do alvo; ao cair vira teia no chão
function spiderShoot(g, m, tx, ty, spread = 0, kind = 'orb') {
  const o = spiderSpinneret(m), sx = o.x, sy = o.y;
  const dx = tx - sx, dy = ty - sy, dist = Math.max(40, Math.hypot(dx, dy));
  const time = clamp(dist / SPIDER.shotSpeed, 0.35, 1.1), gravity = 520;
  g.spiderShots.push({ kind, x: sx, y: sy, vx: dx / time + spread, vy: (dy - 0.5 * gravity * time * time) / time, gravity, life: 2.5, spin: Math.random() * 6, trail: [] });
  spiderFx(g, 'glint', sx, sy, { life: 0.25 });
  playSfx('spiderSpit', sx, sy);
}
// Fio de seda que cai quase reto (chuva de seda, do teto)
function spiderStrand(g, x, y, vx) {
  g.spiderShots.push({ kind: 'strand', x, y, vx, vy: 40, gravity: 760, life: 2.5, spin: 0, trail: [] });
}

function spiderLayWeb(g, x, y) {
  const webs = g.spiderWebs;
  for (const wb of webs) if (Math.abs(wb.x - x) < 20 && Math.abs(wb.y - y) < 6) { wb.t = 9; return; }
  webs.push({ x, y, w: 3 * T, t: 9, seed: Math.random() * 10, age: 0 });
  if (webs.length > 14) webs.shift();
}

function spiderUpdateShots(g, dt, w, p) {
  const shots = g.spiderShots || (g.spiderShots = []);
  g.spiderWebs ??= [];
  for (let i = shots.length - 1; i >= 0; i--) {
    const s = shots[i];
    s.life -= dt; s.spin += dt * 14;
    s.vy += s.gravity * dt;
    s.trail.push([s.x, s.y]); if (s.trail.length > 7) s.trail.shift();
    const nx = s.x + s.vx * dt, ny = s.y + s.vy * dt;
    // No jogador: gruda e machuca pouco
    if (p.invulnerable <= 0 && nx > p.x - 3 && nx < p.x + p.w + 3 && ny > p.y - 3 && ny < p.y + p.h + 3) {
      damageMonsterPlayer(g, s.kind === 'strand' ? 4 : SPIDER.shot, s.x);
      p.webbed = Math.max(p.webbed || 0, 1.6); p.webRootT = s.kind === 'strand' ? 0.3 : 0.6;
      spiderFx(g, 'burst', nx, ny, { life: 0.45, r: 16 });
      silkPuff(g, nx, ny, 8);
      shots.splice(i, 1); continue;
    }
    const tx = Math.floor(nx / T), ty = Math.floor(ny / T), tile = w.getTile(tx, ty);
    const hitPlatform = s.vy > 0 && TILE_DEFS[tile]?.plataforma && Math.floor(s.y / T) < ty + 1 && ny >= ty * T;
    if (w.isSolid(tx, ty) || hitPlatform || s.life <= 0) {
      // Bateu em cima de algo: vira teia na superfície de cima
      if (s.vy > 0 && (w.isSolid(tx, ty) || hitPlatform) && !w.isSolid(tx, ty - 1)) { spiderLayWeb(g, nx, ty * T); spiderFx(g, 'burst', nx, ty * T, { life: 0.4, r: 14, flat: true }); }
      else spiderFx(g, 'burst', nx, ny, { life: 0.3, r: 9 });
      silkPuff(g, nx, Math.min(ny, ty * T), 5);
      shots.splice(i, 1); continue;
    }
    s.x = nx; s.y = ny;
  }
  for (let i = g.spiderWebs.length - 1; i >= 0; i--) { const wb = g.spiderWebs[i]; wb.age += dt; if ((wb.t -= dt) <= 0) g.spiderWebs.splice(i, 1); }
  const fx = g.spiderFx || [];
  for (let i = fx.length - 1; i >= 0; i--) if ((fx[i].t += dt) >= fx[i].life) fx.splice(i, 1);
}

// Pés do jogador numa teia: fica lento (chamado por gearVelocity)
function spiderWebTouch(g, p) {
  if (!g.spiderWebs?.length) return;
  const feet = p.y + p.h;
  for (const wb of g.spiderWebs) {
    if (Math.abs(feet - wb.y) < 4 && p.x + p.w > wb.x - wb.w / 2 && p.x < wb.x + wb.w / 2) {
      p.webbed = Math.max(p.webbed || 0, 0.15);
      return;
    }
  }
}

// ---------- Laço de seda: puxa o jogador para a mordida ----------
function spiderThrowLasso(g, m, p) {
  const o = spiderSpinneret(m), dx = p.cx - o.x, dy = p.cy - o.y, d = Math.hypot(dx, dy) || 1;
  g.spiderLasso = { x: o.x, y: o.y, vx: (dx / d) * 760, vy: (dy / d) * 760, t: 0, phase: 'fly', m };
  playSfx('silkThread', o.x, o.y);
}
function spiderUpdateLasso(g, dt, w, p) {
  const L = g.spiderLasso;
  if (!L) return;
  const m = L.m;
  L.t += dt;
  if (m.dead || (m.state !== 'lasso' && L.phase === 'fly')) { g.spiderLasso = null; return; }
  if (L.phase === 'fly') {
    L.x += L.vx * dt; L.y += L.vy * dt;
    if (p.invulnerable <= 0 && L.x > p.x - 4 && L.x < p.x + p.w + 4 && L.y > p.y - 4 && L.y < p.y + p.h + 4) {
      L.phase = 'reel'; L.t = 0;
      spiderFx(g, 'burst', p.cx, p.cy, { life: 0.4, r: 14 });
      playSfx('spiderHiss', m.cx, m.cy);
      toast('Preso no fio! Ela está puxando você.');
    } else if (w.isSolid(Math.floor(L.x / T), Math.floor(L.y / T)) || L.t > 0.6) { g.spiderLasso = null; spiderFx(g, 'burst', L.x, L.y, { life: 0.25, r: 8 }); }
  } else {
    // puxa o jogador até a boca dela; ao chegar, mordida na hora
    const mouth = m.cx + m.facing * m.w * 0.5, dx = mouth - p.cx;
    p.pullT = 0.1; p.pullVx = clamp(dx * 6, -460, 460);
    L.x = p.cx; L.y = p.cy;
    if (Math.abs(dx) < 16 || L.t > 0.7) {
      g.spiderLasso = null; p.pullT = 0;
      spiderState(m, 'bite'); m.bitten = false; m.stateT = 0.2; // o laço já é o preparo
    }
  }
}

// ---------- Veneno da mordida ----------
function spiderUpdateVenom(g, dt, p) {
  const v = p.venom;
  if (!v) return;
  v.t -= dt; v.tick += dt;
  if (Math.random() < dt * 10 && g.particles.length < 420) g.particles.push({
    x: p.x + Math.random() * p.w, y: p.y + 6 + Math.random() * (p.h - 10), vx: 0, vy: 18, gravity: 60,
    life: 0.5, maxLife: 0.5, color: Math.random() < 0.5 ? 'rgb(150,230,90)' : 'rgb(90,170,60)', w: 1, h: 2,
  });
  if (v.tick >= 1) { v.tick = 0; damageMonsterPlayer(g, 3, p.cx, { pierce: true }); }
  if (v.t <= 0) p.venom = null;
}

// ---------- Ovos: caem do abdome, pulsam e chocam filhotes ----------
function spiderLayEggs(g, m, n) {
  g.spiderEggs ??= [];
  const alive = g.mobs.filter((o) => o.brood && !o.dead).length + g.spiderEggs.length;
  const o = spiderSpinneret(m);
  for (let k = 0; k < n && alive + k < SPIDER.brood; k++)
    g.spiderEggs.push({ x: o.x + (k - (n - 1) / 2) * 14, y: o.y, vx: (k - (n - 1) / 2) * 40, vy: -40, t: 0, hatch: 2.6, landed: false });
  playSfx('spiderHiss', m.cx, m.cy);
}
function spiderUpdateEggs(g, dt, w) {
  const eggs = g.spiderEggs || [];
  for (let i = eggs.length - 1; i >= 0; i--) {
    const e = eggs[i];
    if (!e.landed) {
      e.vy += 700 * dt; e.x += e.vx * dt;
      const ny = e.y + e.vy * dt, floor = spiderFloorBelow(w, e.x, e.y);
      if (ny >= floor - 1) { e.y = floor - 1; e.landed = true; silkPuff(g, e.x, e.y, 4); }
      else e.y = ny;
      continue;
    }
    if ((e.t += dt) >= e.hatch) {
      eggs.splice(i, 1);
      const o = new Wildlife('spider', e.x - 10, e.y - 10.01);
      if (o.collides(w, o.x, o.y)) continue;
      o.brood = true; o.keep = true; g.mobs.push(o);
      spiderFx(g, 'burst', e.x, e.y - 4, { life: 0.4, r: 12, color: '#d8e8a0' });
      playSfx('bugDeath', e.x, e.y);
    }
  }
}

function updateFiandeira(m, dt, w, p) {
  const g = game;
  m.clock += dt; m.stateT += dt; m.hurtTimer = Math.max(0, m.hurtTimer - dt);
  spiderUpdateShots(g, dt, w, p);
  spiderUpdateLasso(g, dt, w, p);
  spiderUpdateEggs(g, dt, w);
  spiderUpdateVenom(g, dt, p);
  if (guardianUpdatePower(g, m, dt, w, p)) return;
  const dx = p.cx - m.cx, dist = Math.hypot(dx, p.cy - m.cy), enraged = spiderEnraged(m);
  const speed = m.def.speed * (enraged ? 1.35 : 1);
  const fighting = !['cocoon', 'hatch', 'sleep'].includes(m.state);

  if (enraged && m.phase === 1 && fighting) {
    m.phase = 2;
    spiderState(m, 'screech'); m.mode = m.mode === 'floor' ? 'floor' : 'ceiling';
    toast('A MATRIARCA ESTÁ FURIOSA. Ovos caem do ninho!');
    spiderLayEggs(g, m, 2);
    m.eggT = 11;
  }
  if (m.phase === 2 && fighting && (m.eggT -= dt) <= 0) { m.eggT = 11; spiderLayEggs(g, m, 2); }
  if (enraged && fighting && Math.random() < dt * 8 && g.particles.length < 420) g.particles.push({ // veneno pingando das presas
    x: m.cx + m.facing * m.w * 0.45, y: m.mode === 'ceiling' ? m.y + 12 : m.y + m.h * 0.6, vx: 0, vy: m.mode === 'ceiling' ? -20 : 30,
    gravity: m.mode === 'ceiling' ? -200 : 300, life: 0.5, maxLife: 0.5, color: 'rgb(150,230,90)', w: 1, h: 2,
  });

  let walk = 0;
  switch (m.state) {
    case 'cocoon': // presa no casulo até o tigre cair
      m.damage = 0; m.aware = false; m.sleeping = true; m.mode = 'ceiling';
      spiderStickCeiling(m, w);
      if (spiderInArena(m, p) && !m.cocoonHint) {
        m.cocoonHint = true;
        toast('Um casulo imenso pulsa no teto. O que dorme ali só vai sair quando o Tigre da Savana cair.');
      } else if (!spiderInArena(m, p)) m.cocoonHint = false;
      if (!spiderLocked()) spiderState(m, 'hatch');
      break;
    case 'hatch': // o casulo rasga e ela volta a dormir no teto
      m.damage = 0; m.sleeping = true;
      if (m.stateT >= 1.2) { spiderFx(g, 'burst', m.cx, m.y + 18, { life: 0.7, r: 34 }); silkPuff(g, m.cx, m.y + 18, 20); spiderState(m, 'sleep'); }
      break;
    case 'sleep':
      m.damage = 0; m.aware = false; m.sleeping = true; m.mode = 'ceiling';
      spiderStickCeiling(m, w);
      if (spiderInArena(m, p) && spiderSeal(g, m, true, p)) {
        m.sleeping = false; g.boss = m; spiderState(m, 'wake');
        playSfx('spiderScreech', m.cx, m.cy);
        toast('Uma teia grossa fecha a entrada. A FIANDEIRA desperta no teto.');
      }
      break;
    case 'wake':
      m.facing = Math.sign(dx) || m.facing;
      if (m.stateT > 0.6 && !m.screamed) { m.screamed = true; spiderFx(g, 'screech', m.cx, m.y + 16, { life: 0.9 }); g.shake = 5; }
      if (m.stateT > 1.6) { m.screamed = false; m.aware = true; spiderState(m, 'stalk'); }
      break;
    case 'screech': // grito da virada de fase: empina e solta ondas de som
      m.damage = 0; m.facing = Math.sign(dx) || m.facing;
      if (!m.screamed) { m.screamed = true; playSfx('spiderScreech', m.cx, m.cy); spiderFx(g, 'screech', m.cx, m.mode === 'ceiling' ? m.y + 16 : m.y + 8, { life: 1 }); g.shake = 7; }
      if (m.stateT > 1.1) { m.screamed = false; spiderState(m, m.mode === 'ceiling' ? 'stalk' : 'hunt'); }
      break;
    case 'hunt': { // no chão
      m.aware = true; m.damage = SPIDER.contact; m.mode = 'floor';
      m.facing = Math.sign(dx) || m.facing;
      m.biteCd -= dt; m.spitCd -= dt; m.climbCd -= dt; m.lassoCd -= dt;
      const above = p.cy < m.y - 3 * T; // jogador lá em cima numa plataforma
      m.aboveT = above ? (m.aboveT || 0) + dt : 0;
      if (m.onGround && (m.climbCd <= 0 || m.aboveT > 1.6)) {
        m.climbCd = (enraged ? 6 : 9) + Math.random() * 3; m.aboveT = 0;
        const c = spiderCeilingAt(w, m);
        if (c !== null) { m.anchorY = c; spiderState(m, 'climb'); playSfx('silkThread', m.cx, m.cy); break; }
      }
      if (m.onGround && m.biteCd <= 0 && Math.abs(dx) < SPIDER.biteRange * T && Math.abs(p.cy - m.cy) < 2.5 * T) {
        spiderState(m, 'bite'); m.bitten = false; playSfx('spiderHiss', m.cx, m.cy); break;
      }
      if (m.onGround && m.lassoCd <= 0 && Math.abs(dx) > 5 * T && dist < 12 * T && Math.abs(p.cy - m.cy) < 5 * T) {
        spiderState(m, 'lasso'); m.lassoThrown = false; break;
      }
      if (m.onGround && m.spitCd <= 0 && Math.abs(dx) > SPIDER.spitRange[0] * T && dist < SPIDER.spitRange[1] * T) {
        spiderState(m, 'spit'); m.shots = 0; break;
      }
      // Jogador lá embaixo e ela numa plataforma: atravessa a tábua e desce
      if (m.onGround && p.y > m.y + m.h + T) m.dropTimer = 0.3;
      m.dropTimer = Math.max(0, (m.dropTimer || 0) - dt);
      walk = Math.abs(dx) < 10 ? 0 : Math.sign(dx);
      break;
    }
    case 'bite': // arma as presas (0.35 s) e dá o bote curto; a mordida envenena
      m.damage = 0;
      if (m.stateT >= 0.35 && !m.bitten) {
        m.bitten = true; m.vx = m.facing * 300;
        playSfx('tigerPounce', m.cx, m.cy, { vol: 0.5 });
        spiderFx(g, 'fangs', m.cx + m.facing * m.w * 0.55, m.y + m.h * 0.55, { life: 0.3, dir: m.facing });
      }
      if (m.bitten && m.stateT < 0.55 && p.invulnerable <= 0 && Math.abs(p.cx - (m.cx + m.facing * m.w * 0.45)) < 24 && Math.abs(p.cy - m.cy) < 2 * T) {
        damageMonsterPlayer(g, SPIDER.bite, m.cx);
        p.venom = { t: 3, tick: 0 };
        spiderFx(g, 'burst', p.cx, p.cy, { life: 0.35, r: 10, color: '#a8f070' });
      }
      if (m.stateT >= 0.8) { m.biteCd = (enraged ? 1.2 : 2) + Math.random(); spiderState(m, 'hunt'); }
      break;
    case 'lasso': // curva o abdome, a seda brilha e o fio sai reto no jogador
      m.damage = SPIDER.contact; m.facing = Math.sign(dx) || m.facing;
      if (m.stateT < 0.45 && Math.random() < dt * 30) { const o = spiderSpinneret(m); spiderFx(g, 'glint', o.x, o.y, { life: 0.2 }); }
      if (m.stateT >= 0.45 && !m.lassoThrown) { m.lassoThrown = true; spiderThrowLasso(g, m, p); }
      if (m.lassoThrown && !g.spiderLasso && m.state === 'lasso') { m.lassoCd = (enraged ? 4 : 6) + Math.random() * 2; spiderState(m, 'hunt'); }
      break;
    case 'spit': {
      m.damage = SPIDER.contact;
      m.facing = Math.sign(dx) || m.facing;
      const count = enraged ? 3 : 1;
      if (m.stateT >= 0.4 && m.shots < count && m.stateT >= 0.4 + m.shots * 0.14) {
        spiderShoot(g, m, p.cx, p.cy, (m.shots - (count - 1) / 2) * 60); m.shots++;
      }
      if (m.stateT >= 0.9) { m.spitCd = (enraged ? 2 : 3.2) + Math.random() * 1.5; spiderState(m, 'hunt'); }
      break;
    }
    case 'climb': // sobe pelo fio até o teto
      m.damage = 0; m.mode = 'climb'; m.vx = 0;
      m.y -= SPIDER.climbSpeed * dt;
      if (m.y <= m.anchorY + 0.01) { m.y = m.anchorY + 0.01; m.mode = 'ceiling'; spiderState(m, 'stalk'); }
      break;
    case 'stalk': { // pelo teto, atrás do jogador, grudando as plataformas
      m.aware = true; m.damage = 0; m.mode = 'ceiling';
      m.facing = Math.sign(dx) || m.facing;
      m.webCd -= dt; m.rainCd -= dt;
      if (m.rainCd <= 0 && Math.abs(dx) < 8 * T) { m.rainCd = (enraged ? 4 : 6) + Math.random() * 2; spiderState(m, 'rain'); break; }
      if (m.webCd <= 0) {
        m.webCd = enraged ? 1.1 : 1.7;
        // mira o chão ou a plataforma embaixo do jogador, com um erro pequeno
        spiderShoot(g, m, p.cx + (Math.random() - 0.5) * 3 * T, p.y + p.h - 2);
      }
      const target = p.cx - m.cx;
      const step = clamp(target, -speed * 1.3 * dt, speed * 1.3 * dt);
      // o teto pode subir ou descer um bloco: acompanha o novo teto se o corpo couber
      const nx = m.x + step, c2 = spiderCeilingAt(w, m, nx + m.w / 2);
      if (c2 !== null && !m.collides(w, nx, c2 + 0.01)) { m.x = nx; m.y = c2 + 0.01; m.anchorY = c2; }
      else if (spiderCeilingAt(w, m) === null) { m.mode = "floor"; spiderState(m, "hunt"); break; }
      m.aligned = Math.abs(target) < 14 ? (m.aligned || 0) + dt : 0;
      if (m.aligned > 0.25 || m.stateT > (enraged ? 3.5 : 5)) {
        spiderState(m, 'aim'); m.aimX = p.cx; m.aimFloor = spiderFloorBelow(w, m.cx, m.y + m.h + 2);
      }
      break;
    }
    case 'rain': { // chuva de seda: vários fios caem em leque do teto
      m.damage = 0;
      if (m.stateT < 0.5 && Math.random() < dt * 30) { const o = spiderSpinneret(m); spiderFx(g, 'glint', o.x + (Math.random() - 0.5) * 10, o.y, { life: 0.2 }); }
      if (m.stateT >= 0.5 && !m.rained) {
        m.rained = true;
        const o = spiderSpinneret(m), n = enraged ? 7 : 5;
        for (let k = 0; k < n; k++) spiderStrand(g, o.x, o.y, (k - (n - 1) / 2) * 55 + (p.cx - o.x) * 0.6);
        playSfx('spiderSpit', o.x, o.y); spiderFx(g, 'burst', o.x, o.y, { life: 0.3, r: 10 });
      }
      if (m.stateT >= 0.9) { m.rained = false; spiderState(m, 'stalk'); }
      break;
    }
    case 'aim': // o fio desce e um alvo marca o chão: é o aviso do bote
      m.damage = 0;
      if (m.stateT >= (enraged ? 0.35 : 0.55)) { m.anchorY = m.y; spiderState(m, 'drop'); playSfx('silkThread', m.cx, m.cy); }
      break;
    case 'drop': {
      m.mode = 'drop'; m.damage = SPIDER.land; m.vx = 0;
      m.vy = SPIDER.dropSpeed;
      m.moveY(m.vy * dt, w);
      if (m.onGround) {
        spiderState(m, 'daze'); m.mode = 'floor'; m.damage = 0;
        g.shake = 7; playSfx('spiderLand', m.cx, m.cy); spiderDust(g, m, 26);
        const fy = m.y + m.h;
        spiderFx(g, 'ring', m.cx, fy, { life: 0.5, r: 60 });
        spiderFx(g, 'ring', m.cx, fy, { life: 0.35, r: 34 });
        spiderFx(g, 'burst', m.cx, fy - 4, { life: 0.5, r: 26, flat: true });
        if (p.invulnerable <= 0 && Math.abs(p.cx - m.cx) < m.w / 2 + 18 && Math.abs(p.y + p.h - fy) < 1.5 * T) damageMonsterPlayer(g, SPIDER.land, m.cx);
      } else if (m.y > (m.nest?.floorY ?? m.y) + 2 * T) { m.mode = 'floor'; spiderState(m, 'hunt'); }
      break;
    }
    case 'daze':
      m.damage = 0; m.mode = 'floor';
      if (Math.random() < dt * 6) spiderFx(g, 'glint', m.cx + (Math.random() - 0.5) * 30, m.y - 2, { life: 0.35, color: '#fff2a0' });
      if (m.stateT >= SPIDER.daze * (enraged ? 0.7 : 1)) { m.biteCd = 0.4; spiderState(m, 'hunt'); }
      break;
  }

  // Física: no chão anda com gravidade; no teto e no fio a posição já foi resolvida acima
  if (m.mode === 'floor') {
    if (m.state === 'hunt') m.vx += (walk * speed - m.vx) * (1 - Math.exp(-8 * dt));
    else if (m.state !== 'bite') m.vx *= Math.exp(-10 * dt);
    else m.vx *= Math.exp(-4 * dt);
    const oldX = m.x, wanted = m.vx;
    m.applyGravity(dt); m.moveX(m.vx * dt, w);
    if (walk && wanted && m.vx === 0 && m.onGround) m.vy = -420;
    m.moveY(m.vy * dt, w);
    m.gait += Math.abs(m.x - oldX) / 4;
  }
  if (m.mode === 'ceiling' && m.state === 'stalk') m.gait += speed * 0.5 * dt / 4;
  m.anim = m.gait; m.settleStep(dt);
}

function fiandeiraHit(m, damage, fromX) {
  const g = game;
  if (m.state === 'cocoon' || m.state === 'hatch') {
    if (performance.now() - (m.hitHint || 0) > 1500) { m.hitHint = performance.now(); toast('O casulo é duro como pedra. Primeiro derrube o Tigre da Savana.'); }
    return;
  }
  if (m.sleeping) {
    if (performance.now() - (m.hitHint || 0) > 1500) { m.hitHint = performance.now(); toast('Ela dorme no teto, longe do alcance. Entre na galeria.'); }
    return;
  }
  const weak = m.state === 'daze';
  m.hp -= Math.round(damage * (weak ? SPIDER.dazeTaken : 1));
  m.hurtTimer = 0.14;
  if (weak) { g.shake = Math.max(g.shake, 2); mobParticles(g, m, 6, 'rgb(170,220,120)'); }
  if (m.hp <= 0) m.dead = true;
  else if (performance.now() - (m.voiceT || 0) > 420) { m.voiceT = performance.now(); playSfx('spiderHiss', m.cx, m.cy, { vol: 0.7 }); }
}

function fiandeiraDefeated(g, m) {
  storyBossFell(g, "fiandeira"); // a teia do cofre se desfaz (js/story.js)
  beetleSpiderSlain(g); // o Casco de Ferro acorda embaixo do deserto (js/beetle-boss.js)
  spiderSeal(g, m, false);
  spiderClearFight(g);
  if (g.player) { g.player.venom = null; g.player.pullT = 0; }
  toast('A FIANDEIRA CAIU. A teia se desfaz e o ninho da expedição está livre.');
  Music.victory();
  return true;
}

// ---------- Barra ----------
BOSS_BARS.fiandeira = (m) => {
  const furious = spiderEnraged(m), dazed = m.state === 'daze';
  return {
    label: 'FIANDEIRA' + (dazed ? ' · ZONZA!' : furious ? ' · FURIOSA' : ', A MATRIARCA'),
    text: dazed ? '#e6ffb0' : furious ? '#ff9ab0' : UIC.text,
    fill: m.hurtTimer > 0 ? '#f0e0ff' : dazed ? '#b8e070' : '#8a5a9a',
    back: '#1c1220', mark: furious ? '#ff9ab0' : '#5a3a64',
  };
};

// ==================== ARTE ====================
// Os clips e pixels de todos os estados vêm de js/spider-art.js (Sprite Fusion).
// O jogo não lê SPIDER_ART, mas tests/guardian-powers-offline.cjs extrai este bloco do fonte.
const SPIDER_ART = {
  bone: [[150, 132, 116], [214, 200, 176], [240, 232, 214]], eye: [255, 140, 56], eyeHi: [255, 226, 150],
  red: [166, 38, 50], fang: [[44, 28, 32], [130, 98, 88]], line: [16, 10, 18],
};

function fiandeiraFrame(m) {
  let name='idle',time=m.clock||0;
  if(m.sleeping||['sleep','cocoon','hatch'].includes(m.state))name='sleep';
  else if(m.state==='wake'){name=m.stateT<0.5?'sleep':'screech';time=m.stateT;}
  else if(m.state==='screech'){name='screech';time=m.stateT;}
  else if(m.state==='bite'){const c=SPIDER_SHEET.clips.bite;return c.start+Math.min(c.count-1,Math.floor(Math.max(0,m.stateT)/0.65*c.count));}
  else if(['spit','lasso','rain','channel'].includes(m.state)){name='cast';time=m.stateT;}
  else if(m.state==='daze'){name='daze';time=m.stateT;}
  else if(['drop','climb','aim'].includes(m.state)){name='hang';time=m.stateT;}
  else if(m.state==='stalk'||Math.abs(m.vx)>8){const c=SPIDER_SHEET.clips.walk;return c.start+Math.floor(Math.abs(m.gait||0)*1.6)%c.count;}
  const c=SPIDER_SHEET.clips[name];return c.start+Math.floor(Math.max(0,time||0)*(name==='sleep'?5:c.fps))%c.count;
}

function paintFiandeira(s, pal, frame) {
  paintSpiderFusion(s, frame);
}



// Casulo de seda pendurado no teto: pulsa devagar e deixa ver a sombra da aranha dentro.
// No 'hatch' ele treme cada vez mais e rasga de baixo para cima.
function drawSpiderCocoon(ctx, m) {
  const t = m.clock || 0, hatch = m.state === 'hatch' ? m.stateT / 1.2 : 0;
  const top = Math.round(m.anchorY || m.y), cx = Math.round(m.cx + (hatch ? Math.sin(t * 50) * hatch * 2 : 0));
  const pulse = Math.sin(t * 1.6) * 1.2, rx = 17 + pulse * 0.4, ry = 22 + pulse, cy = top + 10 + ry;
  // fios que prendem no teto
  ctx.fillStyle = 'rgba(236,232,246,0.8)';
  for (const dx of [-9, -3, 4, 10]) ctx.fillRect(cx + dx, top, 1, Math.round(cy - ry - top + 4));
  for (let y = Math.round(cy - ry); y <= cy + ry; y++) {
    const k = (y - cy) / ry, half = Math.round(rx * Math.sqrt(Math.max(0, 1 - k * k)) * (k > 0.5 ? 1 - (k - 0.5) * 0.4 : 1));
    if (half <= 0) continue;
    const torn = hatch && (y - (cy + ry)) > -hatch * ry * 2 && Math.abs(Math.sin(y * 0.9)) < hatch;
    for (let x = -half; x <= half; x++) {
      if (torn && Math.abs(x) < half * 0.5) continue;
      const edge = Math.abs(x) >= half - 1, band = (y + Math.round(x * 0.35)) % 4 === 0;
      const shadow = x > half * 0.3 || k > 0.6;
      ctx.fillStyle = edge ? '#8a8098' : band ? '#c8c0d4' : shadow ? '#d8d2e2' : '#f0ecf6';
      ctx.fillRect(cx + x, y, 1, 1);
    }
  }
  // sombra da aranha lá dentro e o brilho dos olhos quando pulsa
  ctx.globalAlpha = 0.25 + 0.1 * Math.sin(t * 1.6);
  ctx.fillStyle = '#3a2840';
  ctx.beginPath(); ctx.ellipse(cx, cy - 2, rx * 0.55, ry * 0.55, 0, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
}

function drawFiandeira(ctx, m) {
  if (m.state === 'cocoon' || m.state === 'hatch') { drawSpiderCocoon(ctx, m); return; }
  const frame = fiandeiraFrame(m), sp = wildlifeSprite('fiandeira', frame), img = m.hurtTimer > 0 ? sp.hurt : sp.normal;
  const upside = m.mode === "ceiling" || m.state === "sleep";
  // Fio de seda do teto até o corpo (descendo, subindo ou mirando o bote)
  if (m.state === 'drop' || m.state === 'climb' || m.state === 'aim') {
    const top = m.anchorY || m.y, bottom = m.state === 'aim' ? top + 6 + m.stateT * 80 : m.y + 6;
    ctx.fillStyle = 'rgba(236,232,246,0.9)';
    ctx.fillRect(Math.round(m.cx), Math.round(top), 1, Math.max(1, Math.round(bottom - top)));
    ctx.fillStyle = 'rgba(236,232,246,0.35)';
    ctx.fillRect(Math.round(m.cx) + 1, Math.round(top), 1, Math.max(1, Math.round(bottom - top)));
  }
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  // tremor de alerta antes do bote
  const jitter = m.state === 'aim' ? Math.round(Math.sin((m.clock || 0) * 70)) : 0;
  if (upside) { ctx.translate(Math.round(m.cx) + jitter, Math.round(m.y)); ctx.scale(m.facing < 0 ? -1 : 1, -1); }
  else { ctx.translate(Math.round(m.cx), Math.round(m.y + m.h + (m.stepOffset || 0))); ctx.scale(m.facing < 0 ? -1 : 1, 1); }
  ctx.drawImage(img, -Math.round(img.width / 2), -img.height);
  ctx.restore();
}

// Teia no chão: uma rede de verdade (raios e voltas), com brilho que corre por ela
function drawWebPatch(ctx, wb) {
  const a = Math.min(1, wb.t / 1.5) * Math.min(1, wb.age / 0.15);
  const x0 = Math.round(wb.x - wb.w / 2), y = Math.round(wb.y), half = wb.w / 2;
  ctx.globalAlpha = 0.8 * a;
  ctx.fillStyle = '#e8e4f2';
  ctx.fillRect(x0, y - 1, Math.round(wb.w), 1);
  // raios saindo do meio, deitados sobre o chão
  const cx = Math.round(wb.x);
  for (let k = -3; k <= 3; k++) {
    const ex = cx + k * half / 3.2, ey = y - 5 + Math.abs(k) * 1.2;
    const n = Math.max(Math.abs(ex - cx), Math.abs(ey - y)) | 0;
    for (let i = 0; i <= n; i += 1) ctx.fillRect(Math.round(cx + (ex - cx) * i / (n || 1)), Math.round(y - 1 + (ey - y + 1) * i / (n || 1)), 1, 1);
  }
  // voltas
  ctx.fillStyle = '#cfc8dc';
  for (const r of [0.35, 0.65, 0.92]) for (let i = -10; i <= 10; i++) {
    const u = i / 10, px = cx + u * half * r, py = y - 1 - (1 - u * u) * 4 * r;
    ctx.fillRect(Math.round(px), Math.round(py), 1, 1);
  }
  // brilho
  const s = ((wb.age * 40 + wb.seed * 10) % (wb.w + 20)) - 10;
  ctx.globalAlpha = 0.9 * a; ctx.fillStyle = '#ffffff';
  ctx.fillRect(x0 + Math.round(s), y - 2, 2, 1);
  ctx.globalAlpha = 1;
}

// Antes da luz: teias no chão, bolas e fios de seda, ovos e o fio do laço
function drawSpiderEffects(ctx, g) {
  for (const wb of g.spiderWebs || []) drawWebPatch(ctx, wb);
  for (const s of g.spiderShots || []) {
    // rastro de fiapos
    s.trail.forEach(([tx, ty], i) => { ctx.globalAlpha = (i + 1) / s.trail.length * 0.5; ctx.fillStyle = '#e8e4f2'; ctx.fillRect(Math.round(tx), Math.round(ty), 1, 1); });
    ctx.globalAlpha = 1;
    const x = Math.round(s.x), y = Math.round(s.y);
    if (s.kind === 'strand') { // fio caindo: traço fino com uma gota de seda na ponta
      ctx.fillStyle = 'rgba(236,232,246,0.8)'; ctx.fillRect(x, y - 7, 1, 7);
      ctx.fillStyle = '#f4f0fa'; ctx.fillRect(x - 1, y - 1, 3, 2);
      continue;
    }
    // bola: miolo claro com quatro fios girando em volta
    ctx.fillStyle = '#9a90aa'; ctx.fillRect(x - 3, y - 2, 6, 4); ctx.fillRect(x - 2, y - 3, 4, 6);
    ctx.fillStyle = '#f0ecf8'; ctx.fillRect(x - 2, y - 2, 4, 4);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x - 1, y - 2, 1, 1);
    ctx.fillStyle = '#e0dcea';
    for (let k = 0; k < 4; k++) { const a = s.spin + k * Math.PI / 2; ctx.fillRect(Math.round(x + Math.cos(a) * 5), Math.round(y + Math.sin(a) * 5), 1, 1); }
  }
  for (const e of g.spiderEggs || []) {
    const pulse = e.landed ? Math.sin(e.t * (4 + e.t * 4)) : 0, x = Math.round(e.x), y = Math.round(e.y);
    const r = 4 + (pulse > 0.6 ? 1 : 0);
    ctx.fillStyle = '#7a7090'; ctx.fillRect(x - r, y - r * 2 + 1, r * 2, r * 2 - 1);
    ctx.fillStyle = '#ece6d4'; ctx.fillRect(x - r + 1, y - r * 2 + 2, r * 2 - 2, r * 2 - 3);
    ctx.fillStyle = '#c8e070'; if (e.landed && pulse > 0) ctx.fillRect(x - 1, y - r - 1, 2, 2); // algo se mexe lá dentro
    ctx.fillStyle = '#ffffff'; ctx.fillRect(x - r + 2, y - r * 2 + 3, 1, 1);
  }
  const L = g.spiderLasso;
  if (L) {
    const o = spiderSpinneret(L.m), n = Math.max(1, Math.hypot(L.x - o.x, L.y - o.y) / 2 | 0);
    ctx.fillStyle = 'rgba(244,240,252,0.95)';
    for (let i = 0; i <= n; i++) {
      const k = i / n, sag = L.phase === 'fly' ? Math.sin(k * Math.PI) * 3 : 0;
      ctx.fillRect(Math.round(o.x + (L.x - o.x) * k), Math.round(o.y + (L.y - o.y) * k + sag), 1, 1);
    }
    ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(L.x) - 1, Math.round(L.y) - 1, 3, 3);
  }
}

// Depois da luz: brilho dos olhos, alvo do bote e os efeitos dos golpes
function drawSpiderEyes(ctx, g) {
  for (const m of g.mobs) {
    if (m.kind !== 'fiandeira' || m.dead || m.sleeping) continue;
    const upside = m.mode === "ceiling" || m.state === "sleep";
    const f = m.facing < 0 ? -1 : 1, angry = spiderEnraged(m);
    const a = (angry ? 0.5 : 0.25) + 0.12 * Math.sin((m.clock || 0) * (angry ? 9 : 5));
    const jitter=m.state==='aim'?Math.round(Math.sin((m.clock||0)*70)):0;
    ctx.globalAlpha=a;ctx.fillStyle=angry?'#ff5a38':'#ffcc76';
    for(const [x,y] of SPIDER_EYES[fiandeiraFrame(m)]){
      const ex=Math.round(m.cx)+f*(x-Math.round(SPIDER_SHEET.W/2))+(upside?jitter:0);
      const ey=upside?Math.round(m.y)+SPIDER_SHEET.H-y-1:Math.round(m.y+m.h+(m.stepOffset||0))+y-SPIDER_SHEET.H;
      ctx.fillRect(ex,ey,1,1);
    }
    ctx.globalAlpha=1;
    // Alvo do bote no chão: encolhe até ela cair
    if (m.state === 'aim' && m.aimFloor) {
      const k = clamp(m.stateT / (angry ? 0.35 : 0.55), 0, 1), r = 30 - k * 16, y = m.aimFloor - 1;
      ctx.globalAlpha = 0.5 + 0.4 * Math.sin(m.stateT * 40);
      ctx.strokeStyle = '#ff5a48'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(m.cx, y, r, r * 0.22, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#ffd0c0'; ctx.fillRect(Math.round(m.cx) - 1, y - 1, 3, 1);
      ctx.globalAlpha = 0.18; ctx.fillStyle = '#ff3a30';
      ctx.beginPath(); ctx.ellipse(m.cx, y, r * 0.7, r * 0.15, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
  drawSpiderFx(ctx, g);
}

function drawSpiderFx(ctx, g) {
  for (const e of g.spiderFx || []) {
    const k = e.t / e.life, fade = 1 - k;
    if (e.type === 'burst') { // fios estourando para fora
      ctx.fillStyle = e.color || '#f2eefa';
      const n = 10, r = (e.r || 12) * (0.3 + 0.7 * easeOutCubic(k));
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + 0.3, sy = e.flat ? 0.35 : 1;
        if (e.flat && Math.sin(a) > 0.2) continue; // no chão só sobe
        for (let j = 0.5; j <= 1; j += 0.25) {
          ctx.globalAlpha = fade * (1.2 - j);
          ctx.fillRect(Math.round(e.x + Math.cos(a) * r * j), Math.round(e.y + Math.sin(a) * r * j * sy), 1, 1);
        }
      }
    } else if (e.type === 'ring') { // onda de choque do bote
      ctx.globalAlpha = fade * 0.8; ctx.strokeStyle = '#e8dcc8'; ctx.lineWidth = 1;
      const r = e.r * easeOutCubic(k);
      ctx.beginPath(); ctx.ellipse(e.x, e.y - 1, r, Math.max(1, r * 0.18), 0, 0, Math.PI * 2); ctx.stroke();
    } else if (e.type === 'screech') { // ondas do grito
      ctx.strokeStyle = '#d8a8ff'; ctx.lineWidth = 1;
      for (let j = 0; j < 3; j++) {
        const kk = clamp(k * 1.4 - j * 0.2, 0, 1); if (!kk || kk >= 1) continue;
        const r = 10 + kk * 70;
        ctx.globalAlpha = (1 - kk) * 0.7;
        ctx.beginPath(); ctx.arc(e.x, e.y, r, -Math.PI * 0.95, -Math.PI * 0.05); ctx.stroke();
        ctx.beginPath(); ctx.arc(e.x, e.y, r, Math.PI * 0.05, Math.PI * 0.95); ctx.stroke();
      }
    } else if (e.type === 'fangs') { // duas presas cruzando em arco, verde de veneno
      ctx.globalAlpha = fade; ctx.fillStyle = '#b8f080';
      for (const s of [-1, 1]) for (let i = 0; i <= 8; i++) {
        const u = i / 8, a = -0.9 + u * 1.8;
        ctx.fillRect(Math.round(e.x + e.dir * (Math.cos(a) * 9 - 4)), Math.round(e.y + s * (Math.sin(a) * 7) * (0.4 + k)), 1 + (i % 3 === 0 ? 1 : 0), 1);
      }
    } else if (e.type === 'glint') { // brilhinho em cruz
      ctx.globalAlpha = fade; ctx.fillStyle = e.color || '#ffffff';
      const r = 1 + Math.round(fade * 2);
      ctx.fillRect(Math.round(e.x) - r, Math.round(e.y), r * 2 + 1, 1); ctx.fillRect(Math.round(e.x), Math.round(e.y) - r, 1, r * 2 + 1);
    }
  }
  ctx.globalAlpha = 1;
}

// Durante a luta, a câmera sobe até o teto ficar visível abaixo do HUD, sem perder o jogador
function spiderCameraY(ty, vh) {
  const m = game.boss;
  if (!m || m.kind !== 'fiandeira' || m.dead || !m.nest?.bounds) return ty;
  const ceil = m.nest.bounds[1] * T, p = game.player;
  return Math.max(Math.min(ty, ceil - 4 * T), p.y + p.h + 2 * T - vh);
}
