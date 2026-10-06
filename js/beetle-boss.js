'use strict';

// =====================================================================================
//  CASCO DE FERRO, O ESCAVADOR  —  chefe das profundezas do deserto
// =====================================================================================
// Fundo embaixo do deserto, uma escadaria de arenito desce até uma câmara de areia fechada em
// rocha matriz. Do outro lado da câmara fica o portão de bronze de um OBSERVATÓRIO ENTERRADO,
// e o besouro dorme bem na frente dele. O portão só abre quando ele cai.
//
//   • Carapaça   de frente e por cima quase nada passa (20% do dano, com faísca).
//   • Investida  raspa a areia e dispara. Bateu nas rochas ou na parede: CAPOTA de barriga
//                para cima e fica exposto (1,8× de dano) até conseguir se virar.
//   • Mergulho   afunda na areia, corre por baixo (um monte de areia anda no chão) e
//                irrompe embaixo do jogador — a areia treme e racha antes.
//   • Mandíbula  de perto, fecha as pinças.
// Abaixo de 40% ele fica FURIOSO: investe mais rápido, mergulha mais e chove areia do teto.
// Enquanto a Fiandeira viver ele dorme enterrado e nada o acorda (a ordem dos chefes).

WILD_PALETTES.cascoferro = [[20, 25, 34], [36, 49, 65], [64, 88, 108], [104, 139, 153], [168, 193, 193]];
WILD_SIZES.cascoferro = [112, 60];
WILDLIFE.cascoferro = {
  name: 'Casco de Ferro, o Escavador', biome: BIOME.DESERT, where: 'Profundezas do deserto', hostile: true, unique: true,
  hp: 360, speed: 70, damage: 0, w: 76, h: 38, shape: 'cascoferro', color: '#3e4a5c', drops: [],
};
MOB_SFX.cascoferro = 'bug';

const BEETLE = {
  contact: 12, snap: 20, charge: 26, erupt: 24, sand: 8, rockfall: 12,
  chargeSpeed: 340, armor: 0.2, belly: 1.8, flipped: 2.6,
};
const beetleEnraged = (m) => m.hp < m.def.hp * 0.4;
const beetleState = (m, s) => { m.state = s; m.stateT = 0; if (s !== 'under' && s !== 'emerge') m.under = false; };
const beetleLocked = () => !game.spiderSlain;

// Portão de bronze do observatório: não quebra; some quando o besouro cai
Object.assign(TILE, { BRONZE_GATE: 95 });
defTile(TILE.BRONZE_GATE, { name: 'Portão de bronze', hardness: Infinity, opacity: 2, color: [150, 110, 56] });
ITEM_ART.__gate = {
  cores: { a: [92, 60, 30], b: [150, 106, 50], c: [206, 156, 74], d: [246, 206, 120], k: [44, 28, 16] },
  pixels: [
    'kbbbbbbkkbbbbbbk', 'kbccccbkkbccccbk', 'kbcddcbkkbcddcbk', 'kbccccbkkbccccbk', 'kbbbbbbkkbbbbbbk', 'kaaaaaakkaaaaaak',
    'kbccccbkkbccccbk', 'kbcddcbkkbcddcbk', 'kbcccdbdkbcccdbk', 'kbbbbbbkkbbbbbbk', 'kaaaaaakkaaaaaak', 'kbccccbkkbccccbk',
    'kbcddcbkkbcddcbk', 'kbccccbkkbccccbk', 'kbbbbbbkkbbbbbbk', 'kkkkkkkkkkkkkkkk',
  ],
};
MATERIAL_TEX[TILE.BRONZE_GATE] = flatFromArt(ITEM_ART.__gate);
delete ITEM_ART.__gate;
buildFlatTiles();

LOOT_TABLES.observatorio = [
  [ITEM.GOLD, 4, 10, 0.8], [ITEM.SILVER, 4, 10, 0.7], [ITEM.GLASS, 6, 14, 0.7], [ITEM.METAL_BAR, 3, 8, 0.7],
  [ITEM.MEDKIT, 1, 3, 0.6], [ITEM.AMETHYST, 2, 5, 0.5], [ITEM.CRYSTAL, 2, 5, 0.5], [ITEM.LADDER, 6, 12, 0.5],
];

Object.assign(SFX, {
  beetleClang(A, o) { Tn(A, o, { freq: 1400, freqEnd: 900, dur: 0.18, gain: 0.25 }); Tn(A, o, { freq: 2300, freqEnd: 1700, dur: 0.12, gain: 0.12 }); N(A, o, { type: 'highpass', freq: 4000, dur: 0.08, gain: 0.15 }); },
  beetleRumble(A, o) { N(A, o, { freq: 120, dur: 0.9, gain: 0.7, brown: true, attack: 0.2 }); },
  beetleScrape(A, o) { N(A, o, { type: 'bandpass', freq: 700, freqEnd: 300, q: 1.2, dur: 0.5, gain: 0.4 }); },
  beetleCrash(A, o) { N(A, o, { freq: 200, dur: 0.6, gain: 1, brown: true }); Tn(A, o, { freq: 80, freqEnd: 35, dur: 0.5, gain: 0.5 }); Tn(A, o, { freq: 900, freqEnd: 500, dur: 0.3, gain: 0.15 }); },
  beetleRoar(A, o) { voice(A, o, { type: 'square', f0: 110, f1: 70, dur: 1.1, gain: 0.5, formants: [[300, 3], [900, 5]], vib: 30, vibRate: 30 }); N(A, o, { freq: 180, dur: 1, gain: 0.5, brown: true }); },
});

// ==================== COVIL E OBSERVATÓRIO (geração do mundo) ====================
const BEETLE_LAIR = { HW: 25, H: 13, depth: 58, obsW: 16 };

function buildBeetleLair(w, rnd, freeSpot, taken) {
  const { HW, depth, obsW } = BEETLE_LAIR;
  const loose = (a, b) => taken.every(([c, d]) => b < c - 4 || a > d + 4);
  // No deserto o covil é subterrâneo: pirâmide e vila em cima não atrapalham; só rio, mar e o nascimento
  const underDesert = (a, b) => Math.abs((a + b) / 2 - w.w / 2) > 150 && b < w.oceanStart - 20 &&
    (w.rivers || []).every(({ span: [c, d] }) => b < c - 8 || a > d + 8);
  for (let pass = 0; pass < 3; pass++)
    for (const kind of pass === 0 ? [BIOME.DESERT] : [BIOME.DESERT, BIOME.SAVANNA, BIOME.JUNGLE, BIOME.SNOW, BIOME.FOREST]) {
      const runs = biomeRuns(w, kind).filter(([a, b]) => b - a > 30).sort((p, q) => (q[1] - q[0]) - (p[1] - p[0]));
      for (const [a, b] of runs) for (let t = 0; t < 30; t++) {
        const cx = a + 10 + Math.floor(rnd() * Math.max(1, b - a - 20));
        const x0 = cx - HW - obsW - 16, x1 = cx + HW + obsW + 16;
        if (x0 < 8 || x1 > w.w - 8) continue;
        if (!(pass === 0 ? underDesert : pass === 1 ? freeSpot : loose)(x0, x1)) continue;
        const clash = [...(w.bearLairs || []), ...(w.spiderNests || [])].some(({ bounds: [p, , q] }) => x1 > p - 10 && x0 < q + 10);
        if (clash) continue;
        const y1 = Math.min(w.h - 12, w.surface[cx] + depth);
        if (y1 - BEETLE_LAIR.H - 6 < w.surface[cx] + 10) continue;
        taken.push([x0 - 2, x1 + 2]);
        carveBeetleLair(w, rnd, cx, y1);
        return;
      }
    }
}

function carveBeetleLair(w, rnd, cx, y1) {
  const { HW, H, obsW } = BEETLE_LAIR;
  const x0 = cx - HW, x1 = cx + HW, y0 = y1 - H;
  const side = rnd() < 0.5 ? -1 : 1;            // lado da entrada; o observatório fica do outro
  const ox0 = side < 0 ? x1 + 4 : x0 - 4 - obsW, ox1 = ox0 + obsW;   // observatório
  const oy0 = y1 - 11;
  const clearW = (x, y) => { if (w.inBounds(x, y)) w.water[y * w.w + x] = 0; };
  // Casca de rocha matriz em volta da câmara e do observatório
  const bx0 = Math.min(x0, ox0) - 3, bx1 = Math.max(x1, ox1) + 3;
  for (let y = Math.min(y0, oy0) - 3; y <= y1 + 3; y++) for (let x = bx0; x <= bx1; x++) {
    if (!w.inBounds(x, y)) continue;
    sSet(w, x, y, TILE.BEDROCK, WALL.SANDSTONE); clearW(x, y);
  }
  // Câmara: chão de areia funda (ele nada nela), paredes de arenito atrás
  for (let y = y0; y < y1; y++) for (let x = x0; x <= x1; x++) sSet(w, x, y, TILE.AIR, WALL.SANDSTONE);
  for (let x = x0; x <= x1; x++) { sSet(w, x, y1, TILE.SAND, WALL.SANDSTONE); sSet(w, x, y1 + 1, TILE.SAND, WALL.SANDSTONE); }
  // Duas colunas de rocha endurecida: é nelas que ele se arrebenta na investida
  for (const px of [cx - 11, cx + 11]) for (let y = y1 - 5; y < y1; y++) for (let x = px - 1; x <= px + 1; x++) sSet(w, x, y, TILE.HARD_ROCK, WALL.SANDSTONE);
  // Tochas nas paredes e ossadas de quem veio antes
  // poças de luz quente junto das colunas e do centro; o resto da câmara fica na penumbra com o brilho do ferro
  for (const x of [cx - 17, cx - 6, cx + 6, cx + 17]) sSet(w, x, y1 - 6, TILE.TORCH, WALL.SANDSTONE);
  sSet(w, cx, y0 + 2, TILE.TORCH, WALL.SANDSTONE);
  for (const x of [x0 + 1, x1 - 1]) sSet(w, x, y1 - 3, TILE.TORCH, WALL.SANDSTONE);
  // Observatório: salão de tijolo, teto de vidro em cúpula, estantes e baús
  for (let y = oy0; y < y1; y++) for (let x = ox0; x <= ox1; x++) sSet(w, x, y, TILE.AIR, WALL.STONE_BRICK);
  for (let x = ox0; x <= ox1; x++) sSet(w, x, y1, TILE.STONE_BRICK, WALL.STONE_BRICK);
  const mid = (ox0 + ox1) / 2;
  for (let x = ox0; x <= ox1; x++) {
    const dome = Math.round(Math.sqrt(Math.max(0, 1 - ((x - mid) / (obsW / 2 + 1)) ** 2)) * 4);
    for (let k = 0; k <= dome; k++) sSet(w, x, oy0 - 1 - k, k === dome ? TILE.GLASS : TILE.AIR, WALL.STONE_BRICK);
  }
  for (const x of [ox0 + 2, ox1 - 2]) sSet(w, x, oy0 + 1, TILE.LANTERN, WALL.STONE_BRICK);
  addLootChest(w, ox0 + 3, y1 - 1, 'observatorio', rnd);
  addLootChest(w, ox1 - 3, y1 - 1, 'observatorio', rnd);
  // Portão de bronze entre a câmara e o observatório
  const gateX = side < 0 ? [x1 + 1, x1 + 2, x1 + 3] : [x0 - 1, x0 - 2, x0 - 3], gate = [];
  for (const gx of gateX) for (let y = y1 - 5; y < y1; y++) { sSet(w, gx, y, TILE.BRONZE_GATE, WALL.STONE_BRICK); gate.push([gx, y]); }
  for (const gx of gateX) sSet(w, gx, y1, TILE.STONE_BRICK, WALL.STONE_BRICK);
  // Atalho: poço do observatório até a superfície, tampado por rocha endurecida
  const sx = Math.round(mid), shortcut = [];
  for (let y = oy0 - 6; y > w.surface[sx] - 1; y--) for (let x = sx - 1; x <= sx + 1; x++) {
    const plug = y >= oy0 - 12;
    sSet(w, x, y, plug ? TILE.HARD_ROCK : (x === sx ? TILE.LADDER : TILE.AIR), plug ? WALL.STONE_BRICK : WALL.SANDSTONE);
    clearW(x, y); if (!plug) shortcut.push([x, y]);
  }
  // Entrada: vão na casca e escadaria de arenito subindo até a superfície
  const doorX = side < 0 ? x0 - 1 : x1 + 1, door = [];
  for (let y = y1 - 4; y < y1; y++) for (let k = 0; k < 3; k++) { const x = doorX + side * k; sSet(w, x, y, TILE.AIR, WALL.SANDSTONE); door.push([x, y]); clearW(x, y); }
  let tx = doorX + side * 3, ty = y1 - 1;
  const stairs = [];
  for (let guard = 0; guard < 400 && ty > w.surface[clamp(tx, 0, w.w - 1)] + 1; guard++) {
    for (let k = 0; k < 3; k++) for (let dy = -3; dy <= 0; dy++) { sSet(w, tx + side * k, ty + dy, TILE.AIR, WALL.SANDSTONE); stairs.push([tx + side * k, ty + dy]); clearW(tx + side * k, ty + dy); }
    sSet(w, tx, ty + 1, TILE.SANDSTONE); sSet(w, tx + side, ty + 1, TILE.SANDSTONE);
    tx += side * 2; ty -= 1;
    if (tx <= 4 || tx >= w.w - 5) break;
  }
  for (let dy = -3; dy <= 1; dy++) { sSet(w, tx, ty + dy, TILE.AIR); stairs.push([tx, ty + dy]); }
  (w.beetleLairs ??= []).push({
    x: (side < 0 ? x1 - 5 : x0 + 5) * T + T / 2, y: y1 * T, bounds: [x0, y0, x1, y1 - 1], door, gate, stairs, shortcut,
    observatory: [ox0, oy0, ox1, y1 - 1], telescope: { x: mid * T + T / 2, y: y1 * T },
  });
  storyObservatory(w, w.beetleLairs.at(-1)); // placa e luneta (js/story.js)
}

function reopenBeetleStairs(w) {
  for (const l of w.beetleLairs || []) for (const [x, y] of [...l.stairs, ...l.shortcut, ...l.door]) {
    const i = y * w.w + x;
    if (w.tiles[i] !== TILE.LADDER) w.tiles[i] = TILE.AIR;
    w.water[i] = 0;
  }
}

// ==================== O CHEFE ====================
function setupCascoFerro(m, lair) {
  Object.assign(m, {
    boss: true, keep: true, sleeping: true, aware: false, state: beetleLocked() ? 'buried' : 'sleep', stateT: 0,
    chargeCd: 2.5, snapCd: 1.5, burrowCd: 7, sprayCd: 4, rockT: 6, damage: 0, phase: 1, under: false,
  });
  m.lair = lair ? { ...lair } : { x: m.cx, y: m.y + m.h, door: [], gate: [], bounds: null };
  m.x = m.lair.x - m.w / 2; m.y = m.lair.y - m.h - 0.01;
}
function spawnCascoFerro(g, lair) {
  const m = new Wildlife('cascoferro', lair.x - WILDLIFE.cascoferro.w / 2, lair.y - WILDLIFE.cascoferro.h - 0.01);
  setupCascoFerro(m, lair);
  g.mobs.push(m);
  return m;
}
// Chamado quando a Fiandeira cai
function beetleSpiderSlain(g) {
  g.spiderSlain = true;
  const m = g.mobs.find((o) => o.kind === 'cascoferro' && !o.dead);
  if (m && m.state === 'buried') beetleState(m, 'sleep');
  setTimeout(() => toast('A terra do deserto estremece. Algo muito pesado se mexe lá embaixo...'), 2600);
}

function beetleSeal(g, m, on, p = null) {
  const door = m.lair?.door || [];
  if (on && p && door.some(([x, y]) => p.x < (x + 1) * T && p.x + p.w > x * T && p.y < (y + 1) * T && p.y + p.h > y * T)) return false;
  for (const [x, y] of door) g.world.setTile(x, y, on ? TILE.BEDROCK : TILE.AIR);
  g.world.lightDirty = true;
  return true;
}
function beetleInArena(m, p) {
  const b = m.lair?.bounds;
  if (!b) return Math.hypot(p.cx - m.cx, p.cy - m.cy) < 14 * T;
  return p.x >= b[0] * T && p.x + p.w <= (b[2] + 1) * T && p.y >= b[1] * T - T && p.y + p.h <= (b[3] + 1) * T + 1;
}
function cascoFerroGoHome(g, m) {
  m.x = m.lair.x - m.w / 2; m.y = m.lair.y - m.h - 0.01; m.vx = m.vy = 0;
  Object.assign(m, { hp: m.def.hp, sleeping: true, aware: false, damage: 0, phase: 1, under: false, chargeCd: 2.5, snapCd: 1.5, burrowCd: 7, sprayCd: 4, rockT: 6, hurtTimer: 0, bleed: null, poison: null });
  beetleSeal(g, m, false);
  beetleClearFight(g);
  beetleState(m, beetleLocked() ? 'buried' : 'sleep');
  if (g.boss === m) g.boss = null;
}
function beetleClearFight(g) { g.beetleShots = []; g.beetleRocks = []; g.beetleFx = []; guardianClear(g, 'cascoferro'); }

function beetleDust(g, x, y, n, spread = 140, color = 'rgb(214,184,120)') {
  for (let i = 0; i < n && g.particles.length < 430; i++) g.particles.push({
    x: x + (Math.random() - 0.5) * 20, y, vx: (Math.random() - 0.5) * spread, vy: -Math.random() * 160,
    life: 0.5 + Math.random() * 0.4, maxLife: 0.9, color: Math.random() < 0.3 ? 'rgb(170,140,90)' : color, w: 2, h: 2, gravity: 500,
  });
}
function beetleFx(g, type, x, y, opts = {}) { const list = g.beetleFx ??= []; list.push({ type, x, y, t: 0, life: opts.life ?? 0.5, ...opts }); if (list.length > 60) list.shift(); }

// Chão da câmara embaixo de x
function beetleFloorAt(m) { return m.lair?.y ?? m.y + m.h; }

// Areia chovendo do teto na fúria; bolas de areia chutadas
function beetleUpdateProjectiles(g, dt, w, p) {
  const shots = (g.beetleShots ??= []);
  for (let i = shots.length - 1; i >= 0; i--) {
    const s = shots[i];
    s.trail ??= []; s.trail.push([s.x, s.y]); if (s.trail.length > 6) s.trail.shift();
    s.vy += 700 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
    if (p.invulnerable <= 0 && s.x > p.x - 3 && s.x < p.x + p.w + 3 && s.y > p.y && s.y < p.y + p.h) {
      damageMonsterPlayer(g, BEETLE.sand, s.x); beetleDust(g, s.x, s.y, 6); shots.splice(i, 1); continue;
    }
    if (w.isSolid(Math.floor(s.x / T), Math.floor(s.y / T)) || s.life <= 0) { beetleDust(g, s.x, s.y, 5, 80); shots.splice(i, 1); }
  }
  const rocks = (g.beetleRocks ??= []);
  for (let i = rocks.length - 1; i >= 0; i--) {
    const r = rocks[i];
    r.t += dt;
    if (r.t < r.warn) continue; // areia escorrendo: é o aviso
    r.vy += 900 * dt; r.y += r.vy * dt;
    if (p.invulnerable <= 0 && Math.abs(p.cx - r.x) < 10 && r.y > p.y && r.y < p.y + p.h) { damageMonsterPlayer(g, BEETLE.rockfall, r.x); rocks.splice(i, 1); beetleDust(g, r.x, r.y, 8); continue; }
    if (r.y >= r.floor) { beetleDust(g, r.x, r.floor, 8, 120); playSfx('break', r.x, r.floor, { tile: TILE.SANDSTONE, vol: 0.5 }); rocks.splice(i, 1); }
  }
  const fx = g.beetleFx || [];
  for (let i = fx.length - 1; i >= 0; i--) if ((fx[i].t += dt) >= fx[i].life) fx.splice(i, 1);
}

function updateCascoFerro(m, dt, w, p) {
  const g = game;
  m.clock += dt; m.stateT += dt; m.hurtTimer = Math.max(0, m.hurtTimer - dt);
  beetleUpdateProjectiles(g, dt, w, p);
  if (guardianUpdatePower(g, m, dt, w, p)) return;
  const dx = p.cx - m.cx, dist = Math.abs(dx), enraged = beetleEnraged(m);
  const speed = m.def.speed * (enraged ? 1.35 : 1);
  const fighting = !['buried', 'sleep'].includes(m.state);

  if (enraged && m.phase === 1 && fighting && !m.under) {
    m.phase = 2; beetleState(m, 'roar');
    toast('O CASCO DE FERRO ENFURECEU. A câmara inteira treme!');
  }
  // Fúria: areia e pedra caindo do teto, com um fio de areia avisando antes
  if (m.phase === 2 && fighting && (m.rockT -= dt) <= 0 && m.lair?.bounds) {
    m.rockT = 3.2 + Math.random() * 1.5;
    const b = m.lair.bounds;
    for (let k = 0; k < 3; k++) {
      const x = clamp(p.cx + (k - 1) * 40 + (Math.random() - 0.5) * 30, (b[0] + 1) * T, b[2] * T);
      g.beetleRocks.push({ x, y: b[1] * T + 2, vy: 0, t: 0, warn: 0.9, floor: beetleFloorAt(m) });
    }
    playSfx('beetleRumble', p.cx, b[1] * T);
  }

  let walk = 0;
  switch (m.state) {
    case 'buried': // enterrado de vez enquanto a Fiandeira vive
      m.damage = 0; m.aware = false; m.sleeping = true;
      if (beetleInArena(m, p) && !m.buriedHint) { m.buriedHint = true; toast('Algo enorme dorme sob a areia, na frente do portão. Ainda não é a hora dele.'); }
      else if (!beetleInArena(m, p)) m.buriedHint = false;
      if (!beetleLocked()) beetleState(m, 'sleep');
      break;
    case 'sleep':
      m.damage = 0; m.aware = false; m.sleeping = true;
      if (beetleInArena(m, p) && beetleSeal(g, m, true, p)) {
        m.sleeping = false; g.boss = m; beetleState(m, 'wake');
        playSfx('beetleRumble', m.cx, m.cy); g.shake = 5;
        toast('A passagem desaba atrás de você. O CASCO DE FERRO sai da areia.');
      }
      break;
    case 'wake':
      m.facing = Math.sign(dx) || m.facing;
      if (m.stateT < 1.2 && Math.random() < dt * 30) beetleDust(g, m.cx, m.y + m.h, 2);
      if (m.stateT > 1.2 && !m.roared) { m.roared = true; playSfx('beetleRoar', m.cx, m.cy); g.shake = 6; beetleFx(g, 'ring', m.cx, m.y + m.h, { r: 70, life: 0.6 }); }
      if (m.stateT > 2) { m.roared = false; m.aware = true; beetleState(m, 'walk'); }
      break;
    case 'roar':
      m.damage = 0;
      if (!m.roared) { m.roared = true; playSfx('beetleRoar', m.cx, m.cy); g.shake = 7; beetleFx(g, 'ring', m.cx, m.y + m.h, { r: 80, life: 0.7 }); }
      if (m.stateT > 1.2) { m.roared = false; beetleState(m, 'walk'); }
      break;
    case 'walk': {
      m.aware = true; m.damage = BEETLE.contact;
      m.facing = Math.sign(dx) || m.facing;
      m.chargeCd -= dt; m.snapCd -= dt; m.burrowCd -= dt; m.sprayCd -= dt;
      if (m.onGround && m.snapCd <= 0 && dist < m.w / 2 + 20 && Math.abs(p.cy - m.cy) < 2.5 * T) { beetleState(m, 'snap'); m.snapped = false; break; }
      if (m.onGround && m.burrowCd <= 0) { m.burrowCd = (enraged ? 6 : 9) + Math.random() * 3; beetleState(m, 'burrow'); playSfx('beetleScrape', m.cx, m.cy); break; }
      if (m.onGround && m.chargeCd <= 0 && dist > 5 * T) { beetleState(m, 'scrape'); playSfx('beetleScrape', m.cx, m.cy); break; }
      if (enraged && m.onGround && m.sprayCd <= 0 && dist > 4 * T) { m.sprayCd = 3.5 + Math.random() * 2; beetleState(m, 'spray'); break; }
      walk = dist < 12 ? 0 : Math.sign(dx);
      break;
    }
    case 'snap': // arma as pinças e fecha
      m.damage = 0;
      if (m.stateT >= 0.4 && !m.snapped) {
        m.snapped = true; m.vx = m.facing * 160;
        beetleFx(g, 'snap', m.cx + m.facing * (m.w / 2 + 6), m.y + m.h * 0.55, { life: 0.25, dir: m.facing });
        playSfx('beetleClang', m.cx, m.cy);
        if (p.invulnerable <= 0 && Math.abs(p.cx - (m.cx + m.facing * m.w * 0.5)) < 26 && Math.abs(p.cy - m.cy) < 2.2 * T) damageMonsterPlayer(g, BEETLE.snap, m.cx);
      }
      if (m.stateT >= 0.8) { m.snapCd = (enraged ? 1.2 : 1.8) + Math.random(); beetleState(m, 'walk'); }
      break;
    case 'scrape': // raspa a areia com as patas: aviso da investida
      m.damage = BEETLE.contact; m.facing = Math.sign(dx) || m.facing;
      if (Math.random() < dt * 25) beetleDust(g, m.cx - m.facing * m.w * 0.4, m.y + m.h, 2, 60);
      if (m.stateT >= (enraged ? 0.5 : 0.75)) { beetleState(m, 'charge'); m.chargeDir = m.facing; playSfx('tigerPounce', m.cx, m.cy, { vol: 0.8 }); }
      break;
    case 'charge': {
      m.damage = BEETLE.charge;
      const v = BEETLE.chargeSpeed * (enraged ? 1.3 : 1);
      m.vx = m.chargeDir * v;
      if (Math.random() < dt * 30) beetleDust(g, m.cx - m.chargeDir * m.w * 0.4, m.y + m.h, 2, 90);
      // Bateu: a movimentação zerou a velocidade contra rocha ou parede
      if (m.blocked) {
        m.blocked = false;
        beetleState(m, 'flipped'); m.vx = -m.chargeDir * 90; m.vy = -260; m.onGround = false;
        g.shake = 8; playSfx('beetleCrash', m.cx, m.cy);
        beetleFx(g, 'impact', m.cx + m.chargeDir * m.w / 2, m.y + m.h * 0.4, { life: 0.5 });
        beetleDust(g, m.cx + m.chargeDir * m.w / 2, m.y + m.h * 0.5, 20, 200, 'rgb(150,130,110)');
        toast('Ele capotou! A barriga está exposta!');
        break;
      }
      if (m.stateT > 1.8) { beetleState(m, 'recover'); m.chargeCd = (enraged ? 2.5 : 4) + Math.random() * 2; }
      break;
    }
    case 'flipped': // de barriga para cima, esperneando: brecha
      m.damage = 0;
      if (Math.random() < dt * 8) beetleFx(g, 'star', m.cx + (Math.random() - 0.5) * m.w * 0.6, m.y - 4, { life: 0.4 });
      if (m.stateT >= BEETLE.flipped * (enraged ? 0.75 : 1)) { beetleState(m, 'recover'); m.vy = -200; m.onGround = false; m.chargeCd = (enraged ? 2.5 : 4) + Math.random() * 2; }
      break;
    case 'recover':
      m.damage = BEETLE.contact;
      if (m.stateT >= 0.5) beetleState(m, 'walk');
      break;
    case 'burrow': // afunda na areia
      m.damage = 0;
      if (Math.random() < dt * 40) beetleDust(g, m.cx + (Math.random() - 0.5) * m.w, m.y + m.h, 2, 160);
      if (m.stateT >= 0.8) { m.under = true; beetleState(m, 'under'); m.underT = (enraged ? 1.4 : 2) + Math.random() * 0.8; }
      break;
    case 'under': { // corre por baixo da areia até o jogador
      m.damage = 0; m.under = true;
      const target = clamp(p.cx, (m.lair?.bounds?.[0] ?? -1e9) * T + m.w / 2 + 4, ((m.lair?.bounds?.[2] ?? 1e9) + 1) * T - m.w / 2 - 4);
      m.x += clamp(target - m.cx, -220 * dt, 220 * dt);
      m.facing = Math.sign(target - m.cx) || m.facing;
      if (Math.random() < dt * 20) beetleDust(g, m.cx, beetleFloorAt(m), 2, 70);
      if ((m.stateT >= m.underT && Math.abs(target - m.cx) < 20) || m.stateT > m.underT + 1.5) { beetleState(m, 'emerge'); playSfx('beetleRumble', m.cx, m.cy); }
      break;
    }
    case 'emerge': // a areia treme e racha: aviso
      m.damage = 0;
      if (Math.random() < dt * 30) beetleDust(g, m.cx + (Math.random() - 0.5) * 30, beetleFloorAt(m), 1, 60);
      if (m.stateT >= (enraged ? 0.45 : 0.65)) {
        m.under = false; beetleState(m, "erupt"); m.vy = -520; m.onGround = false;
        // não sai de dentro de uma coluna: escorrega para o lado livre
        for (let k = 0; k < 40 && m.collides(w, m.x, m.y); k++) m.x += (Math.sign(p.cx - m.cx) || 1) * 4;
        g.shake = 8; playSfx('beetleCrash', m.cx, m.cy);
        beetleDust(g, m.cx, beetleFloorAt(m), 30, 260);
        beetleFx(g, 'ring', m.cx, beetleFloorAt(m), { r: 60, life: 0.5 });
        if (p.invulnerable <= 0 && Math.abs(p.cx - m.cx) < m.w / 2 + 10 && p.y + p.h > beetleFloorAt(m) - 3 * T) { damageMonsterPlayer(g, BEETLE.erupt, m.cx); p.vy = -380; }
      }
      break;
    case 'erupt':
      m.damage = BEETLE.contact;
      if (m.onGround && m.stateT > 0.2) beetleState(m, 'walk');
      break;
    case 'spray': // chuta areia para trás e para a frente
      m.damage = BEETLE.contact;
      if (m.stateT >= 0.3 && !m.sprayed) {
        m.sprayed = true;
        for (let k = 0; k < 6; k++) (g.beetleShots ??= []).push({ x: m.cx + m.facing * m.w * 0.3, y: m.y + m.h * 0.6, vx: m.facing * (120 + k * 45), vy: -260 - Math.random() * 120, life: 2 });
        playSfx('beetleScrape', m.cx, m.cy);
      }
      if (m.stateT >= 0.8) { m.sprayed = false; beetleState(m, 'walk'); }
      break;
  }

  // Física no chão (embaixo da areia não há colisão: ele atravessa)
  if (!m.under && !['buried', 'sleep'].includes(m.state)) {
    if (m.state === 'walk') m.vx += (walk * speed - m.vx) * (1 - Math.exp(-6 * dt));
    else if (!['charge', 'snap'].includes(m.state)) m.vx *= Math.exp(-6 * dt);
    const oldX = m.x, wanted = m.vx;
    m.applyGravity(dt);
    m.moveX(m.vx * dt, w);
    if (m.state === 'charge' && wanted && m.vx === 0) m.blocked = true;
    if (walk && wanted && m.vx === 0 && m.onGround) m.vy = -380;
    m.moveY(m.vy * dt, w);
    m.gait += Math.abs(m.x - oldX) / 4;
  } else if (m.under) m.gait += dt * 4;
  m.anim = m.gait; m.settleStep(dt);
}

function cascoFerroHit(m, damage, fromX) {
  const g = game;
  if (m.state === 'buried' || m.sleeping) {
    if (performance.now() - (m.hitHint || 0) > 1500) { m.hitHint = performance.now(); toast(m.state === 'buried' ? 'Só areia e ferro. Ele não acorda enquanto a Fiandeira viver.' : 'Entre na câmara para acordá-lo.'); }
    return;
  }
  if (m.under || m.state === 'burrow' || m.state === 'emerge') return; // embaixo da areia
  const belly = m.state === 'flipped';
  const dmg = Math.max(1, Math.round(damage * (belly ? BEETLE.belly : BEETLE.armor)));
  m.hp -= dmg;
  m.hurtTimer = 0.14;
  if (belly) { g.shake = Math.max(g.shake, 2); mobParticles(g, m, 6, 'rgb(230,170,90)'); }
  else {
    playSfx('beetleClang', m.cx, m.cy);
    beetleFx(g, 'spark', clamp(fromX, m.x, m.x + m.w), m.y + 8, { life: 0.25 });
    if (!m.armorHint) { m.armorHint = true; toast('A carapaça desvia o golpe. Faça ele se arrebentar nas rochas!'); }
  }
  if (m.hp <= 0) m.dead = true;
}

function cascoFerroDefeated(g, m) {
  storyBossFell(g, "cascoferro"); // a luneta desperta (js/story.js)
  beetleSeal(g, m, false);
  for (const [x, y] of m.lair?.gate || []) g.world.setTile(x, y, TILE.AIR);
  g.world.lightDirty = true;
  beetleClearFight(g);
  toast('O CASCO DE FERRO CAIU. O portão de bronze do observatório se abre.');
  Music.victory();
  return true;
}

BOSS_BARS.cascoferro = (m) => {
  const furious = beetleEnraged(m), belly = m.state === 'flipped';
  return {
    label: 'CASCO DE FERRO' + (belly ? ' · BARRIGA EXPOSTA!' : furious ? ' · FURIOSO' : ', O ESCAVADOR'),
    text: belly ? '#ffe0a0' : furious ? '#ff9a7a' : UIC.text,
    fill: m.hurtTimer > 0 ? '#e0e8f0' : belly ? '#e0a050' : '#5a7090',
    back: '#141820', mark: furious ? '#ff9a7a' : '#34445a',
  };
};

// ==================== ARTE ====================
// Quadros: 0–5 andando, 6–7 parado, 8 armando as pinças, 9 pinçada, 10 raspando,
// 11 investida (cabeça baixa), 12–13 capotado esperneando, 14 cavando, 15 saindo da areia.
const BEETLE_ART = {
  belly: [[96, 56, 30], [150, 94, 48], [206, 146, 78], [236, 190, 120]], mand: [[26, 20, 18], [70, 54, 44], [150, 124, 96]],
  eye: [250, 170, 60], line: [12, 12, 18], sheen: [214, 226, 238],
};
function cascoFerroFrame(m) {
  if (m.state === 'channel') return 16 + Math.floor(m.stateT * 8) % 4;
  if (m.state === 'sleep' || m.state === 'buried' || m.state === 'burrow' || m.state === 'emerge') return 14;
  if (m.state === 'wake' || m.state === 'erupt') return 15;
  if (m.state === 'snap') return m.stateT < 0.4 ? 8 : 9;
  if (m.state === 'scrape') return 10;
  if (m.state === 'charge') return 11;
  if (m.state === 'flipped') return 12 + (Math.floor(m.stateT * 8) % 2);
  if (m.state === 'roar') return 8;
  if (Math.abs(m.vx) > 8) return 20 + Math.floor(m.gait * 2.6) % 12;
  return 6 + (Math.floor(m.clock * 1.4) % 2);
}

function paintCascoFerro(s, pal, frame) {
  const W = 112, H = 60, G = H - 1, A = BEETLE_ART;
  const col = new Array(W * H).fill(null), part = new Uint8Array(W * H);
  const cv = {
    put(x, y, c, p) { x = Math.floor(x); y = Math.floor(y); if (x < 0 || y < 0 || x >= W || y >= H || !c) return; col[y * W + x] = c; part[y * W + x] = p; },
    at(x, y) { return x < 0 || y < 0 || x >= W || y >= H ? 0 : part[y * W + x]; },
  };
  const channel = frame >= 16 && frame <= 19, pulse = channel ? frame - 16 : 0;
  const walk = frame < 6 || frame >= 20, ph = frame >= 20 ? (frame - 20) / 12 : walk ? frame / 6 : 0, flip = frame === 12 || frame === 13, flail = frame === 13;
  const windup = frame === 8, snap = frame === 9, scrape = frame === 10, charge = frame === 11, dig = frame === 14, rise = frame === 15;
  const breathe = frame === 7 ? 1 : 0;
  const bob = walk ? Math.round(Math.sin(ph * Math.PI * 2) * 0.6) : 0;
  // Corpo: carapaça em domo; de cabeça baixa na investida, inclinado ao cavar
  const cyBody = flip ? G - 18 : G - 20 + bob + (charge ? 2 : 0) + (dig ? 3 : 0) - (rise ? 1 : 0) - (channel ? pulse : 0);
  const cxBody = 52, rx = 36, ry = 19 + breathe * 0.4;
  const tilt = charge ? 0.12 : dig ? 0.2 : windup ? -0.08 : 0;

  // ---------- patas (três de cada lado) ----------
  const leg = (i, far) => {
    const baseX = cxBody + 14 - i * 16 + (far ? -3 : 0), baseY = flip ? cyBody - 6 : cyBody + 6;
    let fx = baseX + (i === 0 ? 16 : i === 1 ? 4 : -12), fy = G, lift = 0;
    if (walk) { const q = (ph + ((i % 2) ^ (far ? 1 : 0)) * 0.5) % 1; if (q < 0.5) fx += 5 - q * 20; else { const k = (q - 0.5) * 2; fx += -5 + k * 10; lift = Math.sin(Math.PI * k) * 5; } }
    if (scrape && i === 2) { fx -= 10; lift = 3; }
    if (channel && i === 0) { fy -= 8 + pulse * 2; fx += 3; }
    if (flip) { fx = baseX + (i - 1) * 6 + (flail ? (i % 2 ? 4 : -4) : 0); fy = cyBody - 30 + (flail ? (i % 2 ? -3 : 3) : 0); }
    if (dig) { fx = baseX + (i === 0 ? 14 : -6); fy = G + 2; }
    fy -= lift;
    const K = flip ? [ (baseX + fx) / 2 + 5, (baseY + fy) / 2 - 2 ] : [ (baseX + fx) / 2 + (i === 2 ? -4 : 4), Math.min(baseY, fy) - 6 ];
    const base = far ? pal[1] : pal[2], hi = far ? pal[2] : pal[3], p = far ? 1 : 4;
    tigerCapsule(cv, [baseX, baseY], 3, K, 2.4, p, (t, side) => side > 0.3 ? hi : base);
    tigerCapsule(cv, K, 2.2, [fx, fy], 1.3, p, (t, side) => (t > 0.3 && t < 0.4) || (t > 0.65 && t < 0.72) ? pal[0] : side > 0.3 ? hi : base);
    // espinhos na canela
    cv.put(K[0] + (fx - K[0]) * 0.5 + 1, K[1] + (fy - K[1]) * 0.5 - 2, far ? pal[1] : pal[3], p);
    cv.put(fx, fy, pal[0], p);
  };
  for (let i = 0; i < 3; i++) leg(i, true);

  // ---------- carapaça ou barriga ----------
  const shell = (x, y) => {
    // coordenadas locais girando pela inclinação
    const lx = (x + 0.5 - cxBody) * Math.cos(tilt) + (y + 0.5 - cyBody) * Math.sin(tilt), ly = -(x + 0.5 - cxBody) * Math.sin(tilt) + (y + 0.5 - cyBody) * Math.cos(tilt);
    return [lx, ly];
  };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const [lx, ly] = shell(x, y);
    const nx = lx / rx, ny = ly / ry;
    if (flip) {
      // capotado: domo para baixo, barriga segmentada para cima
      if (ly < -2 || nx * nx + ny * ny > 1) continue;
      if (ly < 4) { // barriga
        const seg = Math.floor((lx + rx) / 7);
        const c = Math.abs(((lx + rx) % 7) - 0) < 1 ? A.belly[0] : ly < 0 ? A.belly[3] : seg % 2 ? A.belly[2] : A.belly[1];
        cv.put(x, y, c, 3); continue;
      }
      const lam = 0.3 - 0.4 * nx + 0.5 * ny;
      cv.put(x, y, lam > 0.6 ? pal[3] : lam > 0.2 ? pal[2] : pal[1], 3);
      continue;
    }
    if (ly > 8 || nx * nx + ny * ny > 1) continue;  // domo de cima, base achatada
    // luz de cima/esquerda com o brilho metálico em faixa
    const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)), lam = -0.45 * nx - 0.75 * ny + 0.45 * nz;
    let c = lam > 0.85 ? pal[4] : lam > 0.55 ? pal[3] : lam > 0.2 ? pal[2] : lam > -0.15 ? pal[1] : pal[0];
    if (Math.abs(ly + ry * 0.55 - lx * 0.12) < 1 && lx < rx * 0.4 && lx > -rx * 0.5) c = A.sheen;   // reflexo do metal
    if (Math.abs(lx - 4) < 0.7 && ly < 6) c = pal[0];                                             // divisão dos élitros
    if (ly > 4) c = pal[0];                                                                        // borda de baixo
    // rebites/placas
    if (((Math.round(lx) + 40) % 11 === 0) && Math.abs(ly + ry * 0.2) < 1) c = pal[4];
    // Sulcos arqueados dos élitros, ferrugem nas bordas e reflexos curtos.
    const ridge = (Math.floor(lx + 40 + ny * ny * 9) % 12 + 12) % 12;
    if (ridge === 0 && ly < 3 && ly > -ry + 3) c = pal[0];
    if (ridge === 1 && ly < -3 && ly > -ry + 4) c = [210, 218, 192];
    if (ridge === 2 && ly < -6 && ly > -ry + 4) c = pal[4];
    if (ridge >= 9 && ly < 1 && ly > -ry + 5) c = pal[2];
    // Usura desenhada por placa: arranhões curtos agrupados e borda em bronze.
    if (ridge >= 4 && ridge <= 6 && Math.abs(ly + 7 + Math.floor((lx + 40) / 12) % 3) < .65) c = pal[1];
    if (ly > 1 && ly < 4 && Math.floor(lx + 40) % 9 < 4) c = [150, 111, 61];
    if (channel && (Math.abs(lx - 4) < 1.5 || (ridge === 0 && ly > -12))) c = pulse % 2 ? [255, 218, 118] : [204, 146, 61];
    cv.put(x, y, c, 3);
  }

  // ---------- cabeça, pá frontal e mandíbulas ----------
  if (!flip) for (let j = 0; j < 5; j++) {
    const x = cxBody - 25 + j * 12, y = cyBody + 6;
    tigerCapsule(cv, [x, y], 2.4, [x - 3, y + 5], .7, 3, (t, side) => side > .2 ? [211, 173, 106] : [104, 79, 49]);
  }
  if (!flip) {
    const hx = cxBody + rx - 4 + (charge ? 3 : 0), hy = cyBody + 2 + (charge ? 4 : 0) + (dig ? 6 : 0);
    tigerEllipse(cv, hx, hy, 11, 8, 5, (dx, dy) => {
      if (Math.abs(dy + dx * .25 + .15) < .12) return pal[0];
      const lam = -0.4 * dx - 0.7 * dy;
      return lam > .55 ? pal[4] : lam > .2 ? pal[3] : lam > -.15 ? pal[2] : pal[1];
    });
    // pá do escavador: placa larga e chata na testa
    // Antenas segmentadas e chifre curto com ponta de metal gasto.
    for (const side of [-1, 1]) {
      const tip = [hx + 8, hy - 15 + side * 3 - pulse];
      tigerCapsule(cv, [hx + 1, hy - 5], 1, tip, .6, 5, () => pal[3]);
      cv.put(tip[0], tip[1], A.eye, 5);
    }
    tigerCapsule(cv, [hx + 7, hy - 5], 3.5, [hx + 11, hy - 12], 2.2, 5, (t, side) => side > 0 ? pal[4] : pal[1]);
    tigerCapsule(cv, [hx + 11, hy - 12], 2.2, [hx + 18, hy - 16], .6, 5, (t, side) => t > .7 ? A.sheen : side > 0 ? pal[4] : pal[1]);
    for (let k = 0; k < 12; k++) { cv.put(hx + 2 + k, hy - 7 + Math.floor(k * 0.35), pal[4], 5); cv.put(hx + 2 + k, hy - 6 + Math.floor(k * 0.35), pal[2], 5); }
    // olho
    cv.put(hx + 4, hy - 2, A.eye, 5); cv.put(hx + 5, hy - 2, A.eye, 5); cv.put(hx + 4, hy - 3, [255, 230, 160], 5);
    // mandíbulas curvas: abertas armando, fechadas na pinçada
    const open = windup ? 5 : snap ? -1 : 2;
    for (const s of [-1, 1]) for (let k = 0; k < 11; k++) {
      const u = k / 10, x = hx + 9 + u * 10, y = hy + 3 + s * (open * (1 - u) + 1) - s * Math.sin(u * Math.PI) * 3 + (s > 0 ? 1 : 0);
      cv.put(x, y, u > 0.8 ? [235, 208, 158] : A.mand[0], 5); cv.put(x, y + 1, A.mand[1], 5);
      if (k > 1 && k < 8) cv.put(x, y + 2, A.mand[2], 5);
      if (k === 5) cv.put(x, y - s, A.mand[2], 5); // dente interno
    }
  }
  for (let i = 0; i < 3; i++) leg(i, false);

  const out = col.slice();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (col[y * W + x]) continue;
    const n = (a, b) => a >= 0 && b >= 0 && a < W && b < H && col[b * W + a];
    if (n(x - 1, y) || n(x + 1, y) || n(x, y - 1) || n(x, y + 1)) out[y * W + x] = A.line;
  }
  for (let i = 0; i < out.length; i++) if (out[i]) s.set(i % W, Math.floor(i / W), out[i]);
}

// Desenho: meio enterrado dormindo, sumido embaixo da areia (só o monte andando) e normal
function drawCascoFerro(ctx, m) {
  const floor = beetleFloorAt(m);
  if (m.under || m.state === 'emerge') { drawSandMound(ctx, m.cx, floor, m.clock, m.state === 'emerge' ? m.stateT : 0); return; }
  const frame = cascoFerroFrame(m), sp = wildlifeSprite('cascoferro', frame), img = m.hurtTimer > 0 ? sp.hurt : sp.normal;
  // Enterrado: só o topo da carapaça aparece; dormindo meio corpo; cavando, afundando
  let sink = 0;
  if (m.state === 'buried') sink = 30; else if (m.state === 'sleep') sink = 14; else if (m.state === 'burrow') sink = Math.min(40, m.stateT * 50);
  else if (m.state === 'wake') sink = Math.max(0, 14 - m.stateT * 12);
  ctx.save(); ctx.imageSmoothingEnabled = false;
  ctx.beginPath(); ctx.rect(m.cx - 80, floor - 200, 160, 200); ctx.clip(); // o que afundou fica escondido pela areia
  ctx.translate(Math.round(m.cx), Math.round(m.y + m.h + sink + (m.stepOffset || 0)));
  ctx.scale(m.facing < 0 ? -1 : 1, 1);
  ctx.drawImage(img, -Math.round(img.width / 2), -img.height);
  ctx.restore();
  if (sink > 0) drawSandMound(ctx, m.cx, floor, m.clock, 0, 44);
}
// Monte de areia andando por baixo (e as rachaduras antes de ele sair)
function drawSandMound(ctx, x, floor, t, crack, width = 30) {
  const bump = 5 + Math.sin(t * 12) * 1.2;
  for (let dx = -width; dx <= width; dx++) {
    const k = 1 - (dx / width) ** 2, h = Math.round(bump * k + (hash2(dx, Math.floor(t * 8), 3) < 0.2 ? 1 : 0));
    if (h <= 0) continue;
    ctx.fillStyle = '#b89456'; ctx.fillRect(Math.round(x + dx), floor - h, 1, h);
    ctx.fillStyle = '#e2c486'; ctx.fillRect(Math.round(x + dx), floor - h, 1, 1);
  }
  if (crack > 0) { // rachaduras e grãos pulando: vai sair!
    ctx.fillStyle = '#5a4428';
    for (let k = -3; k <= 3; k++) { const cx = Math.round(x + k * 7 + Math.sin(k * 3) * 2); ctx.fillRect(cx, floor - 2, 1, 2); ctx.fillRect(cx + 1, floor - 3, 1, 1); }
  }
}

// Depois da luz: areia caindo, faíscas da carapaça, onda de choque, pinças e estrelas
function drawBeetleEffects(ctx, g) {
  for (const s of g.beetleShots || []) {
    ctx.fillStyle = '#e2bd74';
    (s.trail || []).forEach(([x, y], i) => { ctx.globalAlpha = (i + 1) / 12; ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 2); });
  }
  ctx.globalAlpha = 1;
  for (const s of g.beetleShots || []) { ctx.fillStyle = '#c9a260'; ctx.fillRect(Math.round(s.x) - 2, Math.round(s.y) - 2, 4, 4); ctx.fillStyle = '#ecd29a'; ctx.fillRect(Math.round(s.x) - 1, Math.round(s.y) - 2, 2, 1); }
  for (const r of g.beetleRocks || []) {
    const x = Math.round(r.x);
    if (r.t < r.warn) { // fio de areia escorrendo do teto: é o aviso
      ctx.fillStyle = '#ffe0a0'; ctx.globalAlpha = .7;
      for (let dx = -12; dx <= 12; dx += 6) ctx.fillRect(x + dx, Math.round(r.floor) - 2, 3, 2);
      ctx.globalAlpha = 0.7; ctx.fillStyle = '#d8b878';
      for (let y = Math.round(r.y); y < r.y + 40 * (r.t / r.warn); y += 3) ctx.fillRect(x + ((y >> 2) % 2), y, 1, 2);
      ctx.globalAlpha = 1;
    } else { ctx.fillStyle = '#7a6448'; ctx.fillRect(x - 4, Math.round(r.y) - 4, 8, 7); ctx.fillStyle = '#b89870'; ctx.fillRect(x - 3, Math.round(r.y) - 4, 5, 2); }
  }
  for (const e of g.beetleFx || []) {
    const k = e.t / e.life, fade = 1 - k, P = BATTLE_COLORS.cascoferro;      // blocos de 2px (js/boss-battle-vfx.js)
    ctx.globalAlpha = pxStep(fade);
    if (e.type === 'ring') pxRing(ctx, e.x, e.y - 1, Math.round(e.r * easeOutCubic(k) / 5) * 5, P, 0.18, Math.floor(k * 10));
    else if (e.type === 'spark') { for (let i = 0; i < 6; i++) { const a = i * 1.05 + Math.floor(k * 4), r = 4 + Math.floor(k * 4) * 3; pxBlk(ctx, e.x + Math.cos(a) * r - 1, e.y + Math.sin(a) * r - 1, 4, P[0]); pxBlk(ctx, e.x + Math.cos(a) * r, e.y + Math.sin(a) * r, 2, P[2]); } }
    else if (e.type === 'impact') { const r = 4 + Math.floor(k * 4) * 4; for (let i = 0; i < 8; i++) { const a = i * 0.785; pxBlk(ctx, e.x + Math.cos(a) * r - 1, e.y + Math.sin(a) * r - 1, 4, P[0]); pxBlk(ctx, e.x + Math.cos(a) * r, e.y + Math.sin(a) * r, 2, i % 2 ? P[2] : P[1]); } pxBlk(ctx, e.x - 2, e.y - 2, 4, P[2]); }
    else if (e.type === 'snap') { for (const s of [-1, 1]) pxClaw(ctx, e.x, e.y + s * 8 * (1 - k), e.x + e.dir * 14, e.y + s * 2, P); }
    else if (e.type === 'star') { const x = e.x, y = e.y - Math.floor(k * 3) * 2; pxBlk(ctx, x - 3, y - 1, 6, P[0]); pxBlk(ctx, x - 2, y, 2, P[2]); pxBlk(ctx, x - 4, y, 2, P[1]); pxBlk(ctx, x + 2, y, 2, P[1]); pxBlk(ctx, x, y - 2, 2, P[1]); pxBlk(ctx, x, y + 2, 2, P[1]); }
  }
  ctx.globalAlpha = 1;
}

// Luneta do observatório (decoração desenhada sobre o mundo)
function drawObservatoryTelescope(ctx, g) {
  for (const l of g.world.beetleLairs || []) {
    const t = l.telescope; if (!t) continue;
    if (Math.abs(t.x - g.player.cx) > 60 * T) continue;
    const x = Math.round(t.x), y = Math.round(t.y);
    ctx.fillStyle = '#3a2a1a'; ctx.fillRect(x - 6, y - 2, 12, 2); ctx.fillRect(x - 1, y - 14, 2, 12); ctx.fillRect(x - 5, y - 4, 1, 2); ctx.fillRect(x + 4, y - 4, 1, 2);
    ctx.save(); ctx.translate(x, y - 14); ctx.rotate(-0.6);
    ctx.fillStyle = '#6a4a20'; ctx.fillRect(-10, -3, 26, 6);
    ctx.fillStyle = '#c89a48'; ctx.fillRect(-10, -3, 26, 2); ctx.fillStyle = '#f0d088'; ctx.fillRect(-4, -3, 10, 1);
    ctx.fillStyle = '#2a2018'; ctx.fillRect(15, -4, 3, 8);
    ctx.restore();
  }
}

// Durante a luta a câmera enquadra a câmara (igual à da Fiandeira)
function beetleCameraY(ty, vh) {
  const m = game.boss;
  if (!m || m.kind !== 'cascoferro' || m.dead || !m.lair?.bounds) return ty;
  const ceil = m.lair.bounds[1] * T, p = game.player;
  return Math.max(Math.min(ty, ceil - 4 * T), p.y + p.h + 2 * T - vh);
}
