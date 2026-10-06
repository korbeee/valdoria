'use strict';

// =====================================================================================
//  CORAÇÃO DA ILHA — o que acontece lá embaixo
// =====================================================================================
//   • Luz própria: o ar do Coração brilha fraco (quente na Forja, azulado no trecho magnético)
//   • Lava: queima, puxa para baixo e só deixa sair pulando. O traje de obsidiana alivia.
//   • Calor: perto da lava, sem o traje, a pele vai queimando devagar
//   • Gêiser: de tempos em tempos o vapor dispara e arremessa quem estiver em cima
//   • Magnetita: no trecho magnético, quem segura ferro é puxado para a rocha mais perto
//   • Água encostando na lava vira obsidiana, com um chiado de vapor
//   • Salamandras de magma (nadam na lava e cospem brasa) e Sentinelas de bronze dos Vigias

const CORE_LIFE = {
  lavaDamage: 12, lavaTick: 0.35, heatDamage: 2, heatTick: 1.6, heatRange: 3,
  ventCycle: 5, ventWarn: 0.9, ventBlast: 1.2, ventHeight: 8, ventLaunch: 640,
  magnetRange: 8, magnetPull: 46,
};

Object.assign(SFX, {
  coreHiss(A, o) { N(A, o, { type: 'highpass', freq: 3000, dur: 0.7, gain: 0.35, attack: 0.02 }); N(A, o, { type: 'bandpass', freq: 900, q: 0.8, dur: 0.4, gain: 0.2 }); },
  coreSteam(A, o) { N(A, o, { type: 'highpass', freq: 1500, dur: 1.1, gain: 0.45, attack: 0.08 }); N(A, o, { freq: 220, dur: 0.6, gain: 0.25, brown: true }); },
  coreSpit(A, o) { N(A, o, { type: 'bandpass', freq: 1400, freqEnd: 500, q: 1.5, dur: 0.25, gain: 0.4 }); Tn(A, o, { freq: 300, freqEnd: 120, dur: 0.2, gain: 0.2 }); },
  coreClank(A, o) { Tn(A, o, { freq: 520, freqEnd: 380, dur: 0.2, gain: 0.25 }); Tn(A, o, { freq: 1300, freqEnd: 1000, dur: 0.12, gain: 0.12 }); N(A, o, { type: 'highpass', freq: 3500, dur: 0.06, gain: 0.12 }); },
  coreSlam(A, o) { N(A, o, { freq: 160, dur: 0.5, gain: 0.9, brown: true }); Tn(A, o, { freq: 90, freqEnd: 40, dur: 0.4, gain: 0.5 }); Tn(A, o, { freq: 700, freqEnd: 300, dur: 0.2, gain: 0.15 }); },
  coreWhir(A, o) { Tn(A, o, { freq: 180, freqEnd: 420, dur: 0.6, gain: 0.18, type: 'square' }); },
});

// ---------- Luz própria do Coração ----------
// O ar da faixa emite um pouco de luz colorida (o canal de luz de enfeite do js/world.js).
// Objetos fixos por trecho: nada de alocar no laço da luz.
const CORE_AMBIENT = [
  { level: 8, color: [255, 120, 60] },   // Forja
  { level: 8, color: [140, 170, 255] },  // Magnético
  { level: 7, color: [120, 220, 210] },  // Maquinário
  { level: 7, color: [255, 196, 120] },  // Ossário
];
{
  const base = environmentEmissionAt;
  environmentEmissionAt = (world, x, y) => {
    if (world.coreTop && y >= world.coreTop[x] + 3 && world.tiles[y * world.w + x] === TILE.AIR) return CORE_AMBIENT[world.coreZone[x]];
    return base(world, x, y);
  };
}

// ---------- Utilidades ----------
const coreSuit = (g) => !!ITEM_DEFS[g.outfit]?.roupa?.calor || accessoryPower(g, "calor") > 0;
// Quantas células de lava o corpo está tocando
function bodyLava(w, b) {
  const x0 = Math.floor(b.x / T), x1 = Math.floor((b.x + b.w - 0.01) / T);
  const y0 = Math.floor(b.y / T), y1 = Math.floor((b.y + b.h - 0.01) / T);
  let n = 0;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const level=w.lavaLevel(x,y),top=(y+1)*T-level*T/WATER_MAX;
    if(level>0&&b.y+b.h>top&&b.y<(y+1)*T)n++;
  }
  return n;
}
function coreParticle(g, p) { if (g.particles.length < 460) g.particles.push(p); }
function coreSteamPuff(g, x, y, n = 6, up = 90) {
  for (let i = 0; i < n; i++) coreParticle(g, {
    x: x + (Math.random() - 0.5) * 12, y, vx: (Math.random() - 0.5) * 40, vy: -up * (0.5 + Math.random()),
    life: 0.7 + Math.random() * 0.6, maxLife: 1.3, color: Math.random() < 0.5 ? 'rgba(235,235,240,0.75)' : 'rgba(200,205,215,0.6)', w: 3, h: 3, gravity: -30,
  });
}

// ---------- Varredura perto do jogador ----------
// A cada 0,25 s: gêiseres, lava visível (para as brasas), água encostando na lava, magnetita
const coreScan = { t: 0, vents: [], lavaTop: [], magnets: [] };
function scanCore(g) {
  const w = g.world, p = g.player, px = Math.floor(p.cx / T), py = Math.floor(p.cy / T);
  coreScan.vents.length = 0; coreScan.lavaTop.length = 0; coreScan.magnets.length = 0;
  const x0 = Math.max(1, px - 34), x1 = Math.min(w.w - 2, px + 34), y0 = Math.max(1, py - 24), y1 = Math.min(w.h - 2, py + 24);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const i = y * w.w + x, t = w.tiles[i];
    if (t === TILE.STEAM_VENT) { if (w.tiles[i - w.w] === TILE.AIR) coreScan.vents.push([x, y]); continue; }
    if (t === TILE.MAGNETITE) { coreScan.magnets.push([x, y]); continue; }
    if (t !== TILE.LAVA) continue;
    if (w.tiles[i - w.w] === TILE.AIR) coreScan.lavaTop.push([x, y]);
    // água encostou: a lava esfria em obsidiana e a água vira vapor
    const wet = [i - w.w, i - 1, i + 1].find((j) => w.water[j] > 0);
    if (wet !== undefined) {
      w.water[wet] = Math.max(0, w.water[wet] - 6);
      w.wakeWater(wet % w.w, (wet / w.w) | 0);
      w.setTile(x, y, TILE.OBSIDIAN);
      coreSteamPuff(g, (x + 0.5) * T, y * T, 8, 120);
      playSfx('coreHiss', (x + 0.5) * T, y * T);
    }
  }
}

// ---------- Atualização (js/game.js) ----------
function updateCore(g, dt) {
  const w = g.world, p = g.player;
  if (!w.coreTop || g.intro?.active) return;
  const ptx = clamp(Math.floor(p.cx / T), 0, w.w - 1), deep = Math.floor(p.cy / T) >= w.coreTop[ptx] - 30;
  updateCoreShots(g, dt);
  updateCoreHalls(g, dt);
  if (!deep&&!bodyLava(w,p)) return;
  if ((coreScan.t -= dt) <= 0) { coreScan.t = 0.25; scanCore(g); }

  // Nado e ondas usam a física da água (js/lava.js); o contato continua queimando.
  const lava = bodyLava(w, p);
  if (lava && !g.adminFly) {
    g.lavaT = (g.lavaT ?? 0) - dt;
    if (g.lavaT <= 0 && !g.adminGod) {
      g.lavaT = CORE_LIFE.lavaTick;
      damageMonsterPlayer(g, Math.round(CORE_LIFE.lavaDamage * (coreSuit(g) ? 0.45 : 1)), p.cx, { pierce: true, death: 'Derreteu na lava do Coração.' });
      for (let i = 0; i < 5; i++) coreParticle(g, { x: p.cx + (Math.random() - 0.5) * 12, y: p.y + p.h * 0.6, vx: (Math.random() - 0.5) * 60, vy: -80 - Math.random() * 80, life: 0.5, maxLife: 0.5, color: Math.random() < 0.5 ? '#ffb040' : '#ff6020', w: 2, h: 2, gravity: 200 });
      playSfx('coreHiss', p.cx, p.cy, { vol: 0.5 });
    }
    if (!g.lavaHint) { g.lavaHint = true; toast('LAVA! Pule para sair. Um traje de obsidiana aguenta melhor o calor.'); }
  }
  // Calor: perto da lava a pele queima devagar, a não ser com o traje de obsidiana
  if (!coreSuit(g) && !lava) {
    const near = coreScan.lavaTop.some(([x, y]) => Math.abs(x - ptx) <= CORE_LIFE.heatRange && Math.abs(y - p.cy / T) <= CORE_LIFE.heatRange + 1);
    g.heat = clamp((g.heat ?? 0) + (near ? dt : -dt * 2), 0, 3);
    if (near && (g.heatT = (g.heatT ?? CORE_LIFE.heatTick) - dt) <= 0 && !g.adminGod) {
      g.heatT = CORE_LIFE.heatTick;
      damageMonsterPlayer(g, CORE_LIFE.heatDamage, p.cx, { pierce: true, death: 'O calor do Coração foi demais.' });
      if (!g.heatHint) { g.heatHint = true; toast('O calor da lava queima a pele. Com escamas de salamandra e obsidiana dá para fazer um traje.'); }
    }
  } else g.heat = Math.max(0, (g.heat ?? 0) - dt * 2);

  // Gêiseres: todos no mesmo ritmo de 5 s, cada um com a sua fase
  const now = performance.now() / 1000;
  for (const [vx, vy] of coreScan.vents) {
    const ph = (now + hash2(vx, vy, 77) * CORE_LIFE.ventCycle) % CORE_LIFE.ventCycle;
    const cx = (vx + 0.5) * T, top = vy * T;
    if (ph < CORE_LIFE.ventWarn) { if (Math.random() < dt * 8) coreSteamPuff(g, cx, top, 1, 40); continue; }
    if (ph > CORE_LIFE.ventWarn + CORE_LIFE.ventBlast) continue;
    if (ph - dt < CORE_LIFE.ventWarn && Math.abs(cx - p.cx) < 30 * T) playSfx('coreSteam', cx, top);
    if (Math.random() < dt * 40) coreSteamPuff(g, cx, top, 2, 420);
    let h = 0; while (h < CORE_LIFE.ventHeight && !w.isSolid(vx, vy - 1 - h)) h++;
    const colTop = (vy - h) * T;
    for (const b of [p, ...g.mobs]) {
      if (b.boss || b.dead || b.x + b.w < vx * T + 2 || b.x > (vx + 1) * T - 2 || b.y + b.h < colTop || b.y > top) continue;
      b.vy = -CORE_LIFE.ventLaunch * (b === p ? 1 : 0.7); b.onGround = false;
    }
  }

  // Magnetita: quem segura ferro é puxado para a rocha mais perto
  const held = ITEM_DEFS[g.inventory.slots[g.selected]?.item];
  if (held && coreMetal(held) && coreZoneAt(w, ptx) === CORE_ZONE.MAGNETICO) {
    let best = null, bd = CORE_LIFE.magnetRange * T;
    for (const [mx, my] of coreScan.magnets) {
      const d = Math.hypot((mx + 0.5) * T - p.cx, (my + 0.5) * T - p.cy);
      if (d < bd) { bd = d; best = [mx, my]; }
    }
    if (best) {
      const tx = (best[0] + 0.5) * T, ty = (best[1] + 0.5) * T, k = 1 - bd / (CORE_LIFE.magnetRange * T);
      p.moveX(Math.sign(tx - p.cx) * CORE_LIFE.magnetPull * k * dt * 3, w);
      if (ty < p.cy) p.vy -= 900 * k * dt; // puxa para cima também: dá para "subir" na magnetita
      if (Math.random() < dt * 14) coreParticle(g, { x: lerp(p.cx, tx, Math.random()), y: lerp(p.cy, ty, Math.random()), vx: 0, vy: 0, life: 0.18, maxLife: 0.18, color: Math.random() < 0.5 ? '#9ad0ff' : '#e8f4ff', w: 1, h: 1, gravity: 0 });
      if (!g.magnetHint) { g.magnetHint = true; toast('A magnetita puxa o ferro da sua mão! Guarde as ferramentas de ferro para andar livre — ou use o puxão para subir.'); }
    }
  }

  // Bichos que caem na lava se queimam (salamandra é de casa); item que cai nela derrete
  for (const m of g.mobs) {
    if (m.dead || m.boss || m.def?.lavaProof || Math.abs(m.cx - p.cx) > 60 * T || !bodyLava(w, m)) continue;
    m.lavaT = (m.lavaT ?? 0) - dt;
    if (m.lavaT <= 0) { m.lavaT = 0.4; m.hit(8, m.cx); m.vy = -200; }
  }
  for (let i = (g.drops?.length ?? 0) - 1; i >= 0; i--) {
    const d = g.drops[i];
    if (ITEM_DEFS[d.item]?.bossItem || !w.lavaAtPx(d.x,d.y)) continue;
    g.drops.splice(i, 1);
    coreSteamPuff(g, d.x, d.y, 4); playSfx('coreHiss', d.x, d.y, { vol: 0.4 });
  }

  // Ambiente: brasas subindo da lava, faíscas azuis na magnetita
  if (coreScan.lavaTop.length && Math.random() < dt * 14) {
    const [x, y] = coreScan.lavaTop[Math.floor(Math.random() * coreScan.lavaTop.length)];
    coreParticle(g, { x: (x + Math.random()) * T, y: y * T + 2, vx: (Math.random() - 0.5) * 20, vy: -30 - Math.random() * 50, life: 1.4 + Math.random(), maxLife: 2.4, color: Math.random() < 0.3 ? '#ffe090' : '#ff8030', w: 1, h: 1, gravity: -12 });
  }
  if (coreScan.magnets.length && Math.random() < dt * 6) {
    const [x, y] = coreScan.magnets[Math.floor(Math.random() * coreScan.magnets.length)];
    coreParticle(g, { x: (x + Math.random()) * T, y: (y + Math.random()) * T, vx: (Math.random() - 0.5) * 60, vy: (Math.random() - 0.5) * 60, life: 0.25, maxLife: 0.25, color: '#b8dcff', w: 1, h: 1, gravity: 0 });
  }
}

const coreMetal = (() => {
  let set = null;
  return (def) => {
    if (!set) {
      set = new Set();
      ITEM_DEFS.forEach((d, id) => { if (d && (d.nivel === 2 || /ferro|metal|magnetita/i.test(d.name))) set.add(d); });
    }
    return set.has(def);
  };
})();

// ---------- Brasas cuspidas pelas salamandras ----------
function updateCoreShots(g, dt) {
  const shots = g.coreShots;
  if (!shots?.length) return;
  const p = g.player, w = g.world;
  for (let i = shots.length - 1; i >= 0; i--) {
    const s = shots[i];
    s.vy += (s.grav ?? 520) * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
    if (Math.random() < dt * 30) coreParticle(g, { x: s.x, y: s.y, vx: (Math.random() - 0.5) * 20, vy: -20, life: 0.3, maxLife: 0.3, color: '#ff9030', w: 1, h: 1, gravity: 0 });
    if (p.invulnerable <= 0 && s.x > p.x - 4 && s.x < p.x + p.w + 4 && s.y > p.y && s.y < p.y + p.h) {
      damageMonsterPlayer(g, Math.round(s.damage * (coreSuit(g) ? 0.6 : 1)), s.x); shots.splice(i, 1); coreSteamPuff(g, s.x, s.y, 4); continue;
    }
    if (s.life <= 0 || w.isSolid(Math.floor(s.x / T), Math.floor(s.y / T)) || w.getTile(Math.floor(s.x / T), Math.floor(s.y / T)) === TILE.LAVA) {
      for (let k = 0; k < 6; k++) coreParticle(g, { x: s.x, y: s.y, vx: (Math.random() - 0.5) * 120, vy: -Math.random() * 120, life: 0.4, maxLife: 0.4, color: k & 1 ? '#ffb040' : '#ff5a20', w: 2, h: 2, gravity: 400 });
      shots.splice(i, 1);
    }
  }
}

// ---------- Sentinelas dos salões dos Vigias ----------
// Como os guardas canibais: cada salão arma seus sentinelas quando o jogador chega perto
function updateCoreHalls(g, dt) {
  const w = g.world, p = g.player;
  for (const hall of w.coreHalls || []) {
    const cx = (hall.x0 + hall.x1) / 2 * T, d = Math.abs(p.cx - cx), dy = Math.abs(p.cy - hall.floor * T);
    if (d > 110 * T || dy > 90 * T) { if (hall.seeded) { g.mobs = g.mobs.filter((m) => m.hall !== hall); hall.seeded = false; } continue; }
    if (hall.seeded || d > 55 * T || dy > 50 * T) continue;
    hall.seeded = true;
    for (let k = 0; k < 2; k++) {
      const x = (hall.x0 + 4 + Math.floor(Math.random() * Math.max(1, hall.x1 - hall.x0 - 8))) * T;
      const m = new Wildlife('sentinela', x, hall.floor * T - WILDLIFE.sentinela.h - 0.01);
      if (m.collides(w, m.x, m.y)) continue;
      m.hall = hall; m.keep = true;
      g.mobs.push(m);
    }
  }
}

// ---------- Nascimento das criaturas do Coração ----------
{
  const baseSpawn = trySpawnMonster;
  trySpawnMonster = (g) => {
    const w = g.world, p = g.player;
    if (!w.coreTop || !inCoreBand(w, p.cx / T, p.cy / T)) return baseSpawn(g);
    return trySpawnCoreCreature(g);
  };
}
function trySpawnCoreCreature(g) {
  const w = g.world, p = g.player;
  if (g.mobs.filter((m) => m.hostile && !m.boss && !m.hall).length >= 5) return false;
  const zone = coreZoneAt(w, p.cx / T);
  const r = Math.random();
  const kind = zone === CORE_ZONE.MAQUINARIO ? (r < 0.55 ? 'sentinela' : 'salamandra') : zone === CORE_ZONE.OSSARIO ? (r < 0.4 ? 'sentinela' : r < 0.85 ? 'salamandra' : 'bat') : (r < 0.8 ? 'salamandra' : 'bat');
  for (let n = 0; n < 30; n++) {
    const tx = offScreenColumn(g, Math.random() < 0.5 ? -1 : 1, Math.floor(Math.random() * 10));
    if (tx < 2 || tx >= w.w - 2) continue;
    let y = Math.floor(p.cy / T) - 10 + Math.floor(Math.random() * 20);
    while (y < w.h - 3 && !w.isSolid(tx, y + 1) && w.getTile(tx, y + 1) !== TILE.LAVA) y++;
    if (w.getTile(tx, y) !== TILE.AIR || !inCoreBand(w, tx, y)) continue;
    const onLava = w.getTile(tx, y + 1) === TILE.LAVA;
    if (onLava && kind !== 'salamandra') continue;
    const m = kind === 'bat' ? new Monster('bat', tx * T, y * T - 20) : new Wildlife(kind, tx * T, 0);
    if (kind !== 'bat') m.y = (y + 1) * T - m.h - 0.01 + (onLava ? m.h * 0.5 : 0);
    if (m.collides(w, m.x, m.y) || !mobOffScreen(g, m, 1)) continue;
    g.mobs.push(m);
    return true;
  }
  return false;
}

// =====================================================================================
//  CRIATURAS
// =====================================================================================
WILDLIFE.salamandra = {
  name: 'Salamandra de magma', where: 'Coração da Ilha', hostile: true, monstro: true, lavaProof: true,
  hp: 26, speed: 58, damage: 10, w: 28, h: 12, drops: [[ITEM.SALAMANDER_SCALE, 1, 2]], color: '#d0602a', shape: 'salamandra',
};
WILDLIFE.sentinela = {
  name: 'Sentinela de bronze', where: 'Maquinário dos Vigias', hostile: true, monstro: true, heavy: true,
  hp: 70, speed: 34, damage: 8, w: 16, h: 34, drops: [[ITEM.BRONZE, 2, 4], [ITEM.GEAR, 1, 1, 0.3]], color: '#b07a3a', shape: 'sentinela',
};
WILD_SIZES.salamandra = [44, 20]; WILD_SIZES.sentinela = [32, 40];
WILD_PALETTES.salamandra = [[26, 14, 16], [58, 28, 26], [98, 44, 34], [150, 66, 40], [210, 98, 46]];
WILD_PALETTES.sentinela = [[52, 30, 14], [110, 68, 30], [168, 116, 58], [214, 162, 88], [246, 214, 150]];
MOB_SFX.salamandra = 'slime'; MOB_SFX.sentinela = 'bug';
Object.assign(BESTIARY_LORE, {
  salamandra: 'Nasce na lava do Coração e nada nela como peixe. A crosta das costas racha e brilha quando ela respira; cospe brasa em arco. As escamas aguentam qualquer calor.',
  sentinela: 'Autômato de bronze dos Vigias, ainda de ronda nos salões de máquinas. Lento, blindado na frente e com um soco que racha o chão. Pelas costas o bronze é fino.',
});

// ---------- Salamandra: arte ----------
// Quadros: 0–7 andando, 8–9 respirando (as rachaduras pulsam), 10 cuspindo, 11–12 nadando
const SALA_GLOW = [[150, 44, 18], [236, 100, 30], [255, 170, 60], [255, 236, 150]];
function paintSalamandra(s, pal, f) {
  const walk = f < 8, ph = walk ? (f / 8) * Math.PI * 2 : 0, swim = f >= 11, spit = f === 10, breathe = f === 9;
  const base = 19; // linha dos pés
  const CRUST = [[34, 18, 20], [54, 28, 28], [78, 40, 34]], SIDE = [[96, 40, 28], [128, 54, 32]];
  const wave = (x) => swim ? Math.sin(x * 0.32 + (f - 11) * Math.PI) * 1.8 : walk ? Math.sin(x * 0.28 + ph) * 0.7 : 0;
  const rAt = (x) => x < 16 ? 0.8 + (x / 16) * 3.4 : x < 31 ? 4.4 - Math.max(0, x - 27) * 0.35 : x < 34 ? 3.2 : 3.6;
  const cyAt = (x) => base - 6.5 + wave(x) - (spit && x > 30 ? (x - 30) * 0.6 : 0) + (swim ? 2 : 0);
  const legs = (far) => {
    for (const [lx, off] of [[14, 0], [28, Math.PI]]) {
      const q = ph + off + (far ? Math.PI : 0), step = walk ? Math.sin(q) * 2.2 : 0, lift = walk ? Math.max(0, -Math.cos(q)) * 1.6 : 0;
      const hip = cyAt(lx) + 2, fx = lx + (swim ? -3 : step) + (far ? -1 : 1), fy = swim ? hip + 1 : base - lift;
      limb(s, lx, hip, fx, fy - 1, 2, far ? [CRUST[0], CRUST[1], CRUST[1]] : [CRUST[0], SIDE[0], SIDE[1]]);
      if (!swim) for (let k = 0; k < 3; k++) s.set(Math.round(fx) + k, Math.round(fy), far ? CRUST[0] : k === 2 ? SALA_GLOW[1] : CRUST[1]); // garras
    }
  };
  legs(true);
  for (let x = 1; x <= 40; x++) {
    const r = rAt(x), cy = cyAt(x);
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
      const rel = (y + 0.5 - cy) / r;
      if (Math.abs(rel) > 1) continue;
      let c;
      if (rel < -0.3) { // crosta das costas em placas, com a rachadura acesa entre elas
        const plate = (x + Math.floor(rel * 2)) % 4 === 0;
        c = plate && x > 4 && x < 37 ? SALA_GLOW[breathe ? 3 : hash2(x, y, 5) < 0.5 ? 2 : 1] : CRUST[rel < -0.75 ? 2 : 1];
      } else if (rel < 0.45) c = SIDE[rel < 0.1 ? 1 : 0];
      else c = SALA_GLOW[breathe ? 2 : rel > 0.8 ? 0 : 1];                     // barriga quente
      s.set(x, y, c);
    }
  }
  // cabeça chata: olho amarelo, boca (aberta e cuspindo fogo no quadro 10)
  const hy = Math.round(cyAt(38));
  s.set(37, hy - 2, [255, 230, 120]); s.set(38, hy - 2, [255, 230, 120]); s.set(38, hy - 1, [40, 18, 10]); s.set(37, hy - 3, CRUST[2]);
  if (spit) {
    for (let x = 34; x <= 41; x++) s.set(x, hy + 1, [40, 12, 8]);
    for (const [x, y, k] of [[41, hy, 3], [42, hy, 2], [42, hy + 1, 2], [43, hy, 1], [43, hy - 1, 1], [41, hy + 1, 2]]) s.set(x, y, SALA_GLOW[k]);
  } else for (let x = 35; x <= 40; x++) s.set(x, hy + 1, CRUST[0]);
  legs(false);
}

// ---------- Salamandra: comportamento ----------
function lavaSurfaceAt(w, tx, ty) {
  let y = ty;
  while (y > 0 && w.getTile(tx, y - 1) === TILE.LAVA) y--;
  return y+1-w.lavaLevel(tx,y)/WATER_MAX;
}
SHAPE_HOOKS.salamandra = {
  paint: paintSalamandra, outline: [16, 8, 8],
  setup(m) { m.spitCd = 1.5 + Math.random() * 2; m.state = 'walk'; m.stateT = 0; },
  frame(m) {
    if (m.state === 'spit') return 10;
    if (m.swimming) return 11 + (Math.floor(m.clock * 3) & 1);
    if (!m.onGround) return 4;
    if (Math.abs(m.vx) > 3) return Math.floor(m.gait) % 8;
    return 8 + (Math.floor(m.clock * 1.4) & 1);
  },
  update(m, dt, w, p) {
    const g = game;
    m.clock += dt; m.stateT += dt; m.hurtTimer = Math.max(0, m.hurtTimer - dt); m.spitCd -= dt; m.thinkTimer -= dt;
    const dx = p.cx - m.cx, dy = p.cy - m.cy, dist = Math.hypot(dx, dy);
    m.aware = dist < 16 * T;
    const tx = Math.floor(m.cx / T), ty = Math.floor((m.y + m.h * 0.75) / T);
    m.swimming = lavaSubmersion(w,m)>.2;
    // cuspida: para, ergue a cabeça e solta a brasa em arco
    if (m.state === 'spit') {
      m.vx = 0;
      if (m.stateT > 0.45 && !m.spat) {
        m.spat = true;
        const t = clamp(Math.abs(dx) / 260, 0.35, 1.1), vx = clamp(dx / t, -300, 300), vy = (dy - 260 * t * t) / t;
        (g.coreShots ??= []).push({ x: m.cx + m.facing * 14, y: m.y + 2, vx, vy: clamp(vy, -460, 120), damage: 12, life: 3 });
        playSfx('coreSpit', m.cx, m.cy);
      }
      if (m.stateT > 0.75) { m.state = 'walk'; m.stateT = 0; m.spat = false; }
    } else if (m.aware && m.spitCd <= 0 && dist > 3 * T && dist < 13 * T) {
      m.spitCd = 2.6 + Math.random() * 1.6; m.state = 'spit'; m.stateT = 0; m.facing = Math.sign(dx) || m.facing;
    }
    if (m.state !== 'spit' && m.hurtTimer <= 0) {
      if (m.aware) m.dir = Math.sign(dx);
      else if (m.thinkTimer <= 0) { m.dir = Math.random() < 0.4 ? 0 : Math.random() < 0.5 ? -1 : 1; m.thinkTimer = 1.5 + Math.random() * 2.5; }
      m.vx = (m.dir || 0) * m.def.speed * (m.swimming ? 1.25 : 1);
      if (m.dir) m.facing = m.dir;
    }
    const oldX = m.x;
    if (m.swimming) {
      // boia com metade do corpo para fora, seguindo a superfície
      const surf = lavaSurfaceAt(w, tx, ty);
      m.vy = ((surf * T - m.h * 0.45) - m.y) * 5;
      m.moveX(m.vx * dt, w);
      if (m.vx && Math.abs(m.x - oldX) < 0.01) m.vy = -280; // borda da lava: pula para fora
      m.moveY(m.vy * dt, w);
    } else {
      m.applyGravity(dt); m.moveX(m.vx * dt, w);
      if (m.vx && Math.abs(m.x - oldX) < 0.01 && m.onGround) m.vy = -300;
      m.moveY(m.vy * dt, w);
    }
    m.gait += Math.abs(m.x - oldX) * 12 / 30;
    m.settleStep(dt);
  },
};

// ---------- Sentinela: arte ----------
// Quadros: 0–7 andando, 8–9 parado (o olho pisca), 10 armando o soco, 11 socando o chão.
// Quadros 12–23: os mesmos, com o olho vermelho (viu o jogador).
const SENT_EYE = { calm: [[40, 150, 160], [110, 240, 230], [230, 255, 252]], angry: [[150, 30, 20], [255, 80, 50], [255, 220, 180]] };
function paintSentinela(s, pal, f) {
  // Autômato de bronze: capacete de viseira, ombreiras com espinho, peitoral trapezoidal com a runa acesa,
  // saiote de placas, joelheiras e punhos grandes. Mesmos quadros de antes (andar, parado, armar, socar).
  const angry = f >= 12, k = f % 12, walk = k < 8, ph = walk ? (k / 8) * Math.PI * 2 : 0, windup = k === 10, slam = k === 11;
  const eye = angry ? SENT_EYE.angry : SENT_EYE.calm, cx = 16, bob = walk ? Math.round(Math.abs(Math.sin(ph)) * 1) : 0;
  const B = { ol: pal[0], dk: pal[1], md: pal[2], lt: pal[3], hi: pal[4] }, iron = [[24, 24, 30], [52, 52, 62], [86, 86, 100], [128, 128, 144]];
  const bronze = (v) => (v > 0.78 ? B.hi : v > 0.5 ? B.lt : v > 0.22 ? B.md : v > -0.1 ? B.dk : B.ol);
  const ty = 13 - bob + (slam ? 2 : 0);
  // pernas: grevas grossas com joelheira e pé de placa
  for (const [side, off] of [[-1, 0], [1, Math.PI]]) {
    const q = ph + off, step = walk ? Math.sin(q) * 3 : 0, lift = walk ? Math.max(0, -Math.cos(q)) * 2 : 0;
    const hx = cx + side * 3.5, fx = cx + side * 3.5 + step, fy = 38 - lift, kx = (hx + fx) / 2 + side * 0.5, ky = (ty + 17 + fy) / 2;
    limb(s, hx, ty + 16, kx, ky, 4, side < 0 ? [iron[0], iron[1], iron[1]] : [iron[0], iron[1], iron[2]]);
    limb(s, kx, ky, fx, fy - 2, 4, side < 0 ? [B.ol, B.dk, B.dk] : [B.ol, B.md, B.lt]);
    shadeBall(s, kx, ky, 2.6, 2.4, (v) => bronze(v + 0.1));                                  // joelheira
    for (let x = -3; x <= 3; x++) { const px = Math.round(fx) + x + (side > 0 ? 1 : 0); s.set(px, Math.round(fy), x === -3 || x === 3 ? B.ol : B.dk); s.set(px, Math.round(fy) - 1, x < 0 ? B.lt : B.md); }   // pé de placa
  }
  // saiote: três placas que se sobrepõem
  for (let i = 0; i < 3; i++) for (let x = cx - 6 + i; x <= cx + 6 - i; x++) { const y = ty + 14 + i; s.set(x, y, x === cx - 6 + i || x === cx + 6 - i ? B.ol : i === 2 ? B.dk : x < cx ? B.md : B.dk); }
  // tronco: peitoral trapezoidal (largo em cima), cintas, rebites
  for (let r = 0; r < 14; r++) {
    const hw = 8.5 - r * 0.24, y = ty + r;
    for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
      const u = (x - cx) / hw, edge = x === Math.round(cx - hw) || x === Math.round(cx + hw) || r === 0 || r === 13;
      let c = edge ? B.ol : bronze(0.62 - u * 0.55 - (r / 13) * 0.25);
      if (r === 4 || r === 9) c = edge ? B.ol : B.dk;                                          // cintas
      if ((r === 2 || r === 11) && (x === Math.round(cx - hw) + 2 || x === Math.round(cx + hw) - 2)) c = B.hi;   // rebites
      if (r === 6 && (Math.abs(x - cx) >= 4 && Math.abs(x - cx) <= 6) && (x + y) % 2 === 0) c = B.ol;             // aberturas de ventilação
      s.set(x, y, c);
    }
  }
  // runa no peito: anel de ferro com o brilho do olho
  shadeBall(s, cx, ty + 6.5, 3.2, 3.2, (v) => iron[Math.max(0, Math.min(3, Math.round(v * 3)))]);
  for (const [x, y] of [[0, -1], [-1, 0], [0, 0], [1, 0], [0, 1]]) s.set(cx + x, Math.round(ty + 6.5) + y, eye[x === 0 && y === 0 ? 2 : 1]);
  for (const [x, y] of [[cx - 5, ty + 7], [cx - 5, ty + 8], [cx + 4, ty + 12], [cx + 4, ty + 13], [cx + 6, ty + 2]]) s.set(x, y, CORE_PAL.patina[0]);  // pátina
  // ombreiras com espinho
  for (const side of [-1, 1]) {
    const px = cx + side * 9.5;
    shadeBall(s, px, ty + 1.5, 4, 3.3, (v) => bronze(v + (side < 0 ? 0.15 : -0.05)));
    s.set(Math.round(px), Math.round(ty - 2), B.ol); s.set(Math.round(px), Math.round(ty - 1), B.hi); s.set(Math.round(px - side), Math.round(ty - 1), B.lt);
  }
  // pescoço e cabeça: capacete com crista, viseira acesa e bochechas
  for (let x = cx - 1; x <= cx + 1; x++) s.set(x, ty - 1, iron[1]);
  const hy = ty - 10;
  shadeBall(s, cx, hy + 5, 5.8, 5.2, (v) => bronze(v + 0.05));
  for (let y = hy + 5; y <= hy + 9; y++) for (let x = cx - 4; x <= cx + 4; x++) s.set(x, y, x < cx ? B.md : B.dk);        // placa do rosto
  for (let x = cx - 4; x <= cx + 4; x++) { s.set(x, hy + 10, B.ol); s.set(x, hy + 4, B.dk); }
  for (let x = cx - 3; x <= cx + 3; x++) s.set(x, hy + 6, eye[1]);                                                        // viseira
  s.set(cx + 1, hy + 6, eye[2]); s.set(cx + 2, hy + 6, eye[2]); s.set(cx - 3, hy + 7, eye[0]); s.set(cx + 3, hy + 7, eye[0]);
  for (const y of [hy + 8, hy + 9]) for (const x of [cx - 3, cx - 1, cx + 1, cx + 3]) if ((x + y) % 2) s.set(x, y, B.ol);   // grade da boca
  for (let y = hy - 1; y <= hy + 2; y++) s.set(cx, y, y === hy - 1 ? B.hi : B.lt);                                         // crista
  s.set(cx - 1, hy + 1, B.md); s.set(cx + 1, hy + 1, B.dk);
  // braços: ombro, cotovelo e punho grande (armando sobem por cima da cabeça, socando descem na frente)
  for (const side of [-1, 1]) {
    const sx = cx + side * 10, sy = ty + 3;
    let hx, hy2;
    if (windup) { hx = cx + side * 5; hy2 = hy + 2; }
    else if (slam) { hx = cx + 6 + side * 2; hy2 = 35; }
    else { hx = sx + side * 1 + (walk ? Math.sin(ph + (side > 0 ? Math.PI : 0)) * 1.5 : 0); hy2 = ty + 14; }
    const ex = (sx + hx) / 2 + side * 1.6, ey = (sy + hy2) / 2;
    const cols = side < 0 ? [B.ol, B.dk, B.dk] : [B.ol, B.md, B.lt];
    limb(s, sx, sy, ex, ey, 3, cols); limb(s, ex, ey, hx, hy2, 3, cols);
    shadeBall(s, ex, ey, 2, 2, (v) => bronze(v));                                           // cotovelo
    shadeBall(s, hx, hy2 + 1, 3.3, 3, (v) => bronze(v + 0.05));
    for (const dx of [-1, 1]) s.set(Math.round(hx + dx * 1), Math.round(hy2 + 2), B.ol);   // nós dos dedos
  }
}

// ---------- Sentinela: comportamento ----------
SHAPE_HOOKS.sentinela = {
  paint: paintSentinela, outline: [18, 10, 6],
  setup(m) { m.state = 'patrol'; m.stateT = 0; m.aware = false; m.slamCd = 1; },
  frame(m) {
    const base = m.aware ? 12 : 0;
    if (m.state === 'windup') return base + 10;
    if (m.state === 'slam') return base + 11;
    if (Math.abs(m.vx) > 3) return base + Math.floor(m.gait) % 8;
    return base + 8 + (Math.floor(m.clock * 0.8) & 1);
  },
  hit(m, damage, fromX) {
    // blindado na frente: pelas costas o golpe entra inteiro
    const front = Math.sign(fromX - m.cx) === m.facing;
    const dmg = front ? Math.max(1, Math.round(damage * 0.5)) : damage;
    if (front) { playSfx('coreClank', m.cx, m.cy); for (let i = 0; i < 4; i++) coreParticle(game, { x: clamp(fromX, m.x, m.x + m.w), y: m.y + 12, vx: (Math.random() - 0.5) * 140, vy: -Math.random() * 120, life: 0.25, maxLife: 0.25, color: '#ffe0a0', w: 1, h: 1, gravity: 300 }); }
    if (front && !game.sentHint) { game.sentHint = true; toast('O bronze da frente desvia o golpe. Pegue o Sentinela pelas costas!'); }
    m.aware = true;
    Pig.prototype.hit.call(m, dmg, fromX);
    m.vx *= 0.3; m.vy = Math.max(m.vy, -80); m.fleeTimer = 0;
  },
  update(m, dt, w, p) {
    const g = game;
    m.clock += dt; m.stateT += dt; m.hurtTimer = Math.max(0, m.hurtTimer - dt); m.slamCd -= dt; m.thinkTimer -= dt;
    const dx = p.cx - m.cx, dist = Math.hypot(dx, p.cy - m.cy);
    if (!m.aware && dist < 12 * T) { m.aware = true; playSfx('coreWhir', m.cx, m.cy); }
    else if (m.aware && dist > 26 * T) m.aware = false;
    let want = 0;
    switch (m.state) {
      case 'patrol': case 'chase':
        m.state = m.aware ? 'chase' : 'patrol';
        if (m.aware) {
          want = Math.abs(dx) > 10 ? Math.sign(dx) : 0;
          if (m.slamCd <= 0 && Math.abs(dx) < 2.4 * T && Math.abs(p.cy - m.cy) < 2.5 * T) { m.state = 'windup'; m.stateT = 0; m.facing = Math.sign(dx) || m.facing; playSfx('coreWhir', m.cx, m.cy); }
        } else {
          if (m.thinkTimer <= 0) { m.dir = Math.random() < 0.5 ? 0 : Math.random() < 0.5 ? -1 : 1; m.thinkTimer = 2 + Math.random() * 3; }
          want = m.dir || 0;
          if (m.hall && ((want < 0 && m.x < (m.hall.x0 + 2) * T) || (want > 0 && m.x + m.w > (m.hall.x1 - 1) * T))) { m.dir = -want; want = m.dir; }
        }
        break;
      case 'windup':
        if (m.stateT > 0.7) { m.state = 'slam'; m.stateT = 0; m.slammed = false; }
        break;
      case 'slam':
        if (!m.slammed) {
          m.slammed = true; g.shake = Math.max(g.shake, 3); playSfx('coreSlam', m.cx, m.y + m.h);
          const fx = m.cx + m.facing * 10;
          for (let i = 0; i < 10; i++) coreParticle(g, { x: fx + (Math.random() - 0.5) * 20, y: m.y + m.h, vx: (Math.random() - 0.5) * 180, vy: -Math.random() * 160, life: 0.5, maxLife: 0.5, color: i & 1 ? '#8a7a70' : '#c8b8a0', w: 2, h: 2, gravity: 500 });
          (g.coreRings ??= []).push({ x: fx, y: m.y + m.h, t: 0 });
          if (p.invulnerable <= 0 && Math.abs(p.cx - fx) < 2.8 * T && p.y + p.h > m.y + 4 && p.y < m.y + m.h + 4) damageMonsterPlayer(g, 18, m.cx);
        }
        if (m.stateT > 0.9) { m.state = 'chase'; m.stateT = 0; m.slamCd = 1.6 + Math.random(); }
        break;
    }
    if (m.hurtTimer <= 0 && m.state !== 'windup' && m.state !== 'slam') m.vx = want * m.def.speed * (m.aware ? 1.35 : 0.6);
    else if (m.state === 'windup' || m.state === 'slam') m.vx = 0;
    if (want) m.facing = want;
    m.damage = m.state === 'slam' ? 0 : m.def.damage;
    const oldX = m.x;
    m.applyGravity(dt); m.moveX(m.vx * dt, w);
    if (m.vx && Math.abs(m.x - oldX) < 0.01 && m.onGround) m.vy = -340;
    m.moveY(m.vy * dt, w);
    m.gait += Math.abs(m.x - oldX) * 12 / 34;
    m.settleStep(dt);
  },
};

// =====================================================================================
//  DESENHO
// =====================================================================================
// Brilho da lava: um sprite de luz por bloco de superfície visível (somado à tela), bem mais
// barato que um gradiente por bloco; e uma névoa quente cobrindo a tela no fundo do mundo
const LAVA_GLOW = (() => {
  const c = makeCanvas(64, 48), g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 30, 0, 32, 30, 32);
  gr.addColorStop(0, 'rgba(255,130,40,0.32)'); gr.addColorStop(0.5, 'rgba(255,90,20,0.12)'); gr.addColorStop(1, 'rgba(255,60,10,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 48);
  return c;
})();
function drawCoreAccents(ctx, game, ox, oy, z) {
  const w = game.world;
  if (!w.coreTop || game.intro?.active) return;
  const vx = ox / z, vy = oy / z, vw = ctx.canvas.width / z, vh = ctx.canvas.height / z;
  const x0 = Math.max(0, Math.floor(vx / T) - 1), x1 = Math.min(w.w - 1, Math.ceil((vx + vw) / T) + 1);
  const y0 = Math.max(1, Math.floor(vy / T) - 1), y1 = Math.min(w.h - 1, Math.ceil((vy + vh) / T) + 1);
  if (y1 < w.coreTopMin - 40) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const i = y * w.w + x;
    if (w.tiles[i] !== TILE.LAVA || w.tiles[i - w.w] === TILE.LAVA || SOLID[w.tiles[i - w.w]]) continue;
    const fl = 1 + Math.sin(performance.now() / 300 + x * 1.7) * 0.08;
    const surface=(y+1)*T-w.lavaLevel(x,y)*T/WATER_MAX;
    ctx.drawImage(LAVA_GLOW, ((x + 0.5) * T - 32 * fl) * z - ox, (surface - 30 * fl) * z - oy, 64 * fl * z, 48 * fl * z);
  }
  // névoa quente (ou fria, no trecho magnético) que cresce quanto mais fundo a câmera está
  const cx = clamp(Math.floor((vx + vw / 2) / T), 0, w.w - 1), cy = (vy + vh / 2) / T;
  const k = clamp((cy - w.coreTop[cx] + 25) / 40, 0, 1);
  if (k > 0) {
    const zone = w.coreZone[cx], col = zone === CORE_ZONE.MAGNETICO ? '40,70,140' : zone === CORE_ZONE.MAQUINARIO ? '30,90,90' : '150,40,10';
    const H = ctx.canvas.height, gr = ctx.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, `rgba(${col},0)`); gr.addColorStop(1, `rgba(${col},${0.1 * k})`);
    ctx.fillStyle = gr; ctx.fillRect(0, 0, ctx.canvas.width, H);
  }
  // calor: a borda da tela fica vermelha enquanto a pele está queimando
  if ((game.heat ?? 0) > 0.2) {
    const a = clamp(game.heat / 3, 0, 1) * (0.18 + Math.sin(performance.now() / 160) * 0.04), W2 = ctx.canvas.width, H2 = ctx.canvas.height;
    const gr = ctx.createRadialGradient(W2 / 2, H2 / 2, Math.min(W2, H2) * 0.35, W2 / 2, H2 / 2, Math.max(W2, H2) * 0.7);
    gr.addColorStop(0, 'rgba(255,60,20,0)'); gr.addColorStop(1, `rgba(255,60,20,${a})`);
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W2, H2);
  }
  ctx.restore();
}

// No espaço do mundo: brasas cuspidas, anéis do soco do sentinela e arcos entre as rochas de
// magnetita flutuando
function drawCoreWorld(ctx, game) {
  const w = game.world;
  if (!w.coreTop) return;
  for (const s of game.coreShots || []) {
    ctx.fillStyle = '#ff6020'; ctx.fillRect(Math.round(s.x) - 2, Math.round(s.y) - 2, 4, 4);
    ctx.fillStyle = '#ffe090'; ctx.fillRect(Math.round(s.x) - 1, Math.round(s.y) - 1, 2, 2);
  }
  const rings = game.coreRings || [];
  for (let i = rings.length - 1; i >= 0; i--) {
    const r = rings[i]; r.t += 1 / 60;
    if (r.t > 0.4) { rings.splice(i, 1); continue; }
    const rad = 6 + r.t * 90, a = 1 - r.t / 0.4;
    ctx.fillStyle = `rgba(230,210,170,${a * 0.8})`;
    for (let k = -1; k <= 1; k += 2) ctx.fillRect(Math.round(r.x + k * rad) - 2, Math.round(r.y) - 2, 4, 2);
  }
  // arcos elétricos entre rochas de magnetita vizinhas que estão na tela
  const p = game.player, now = performance.now() / 1000;
  for (const a of w.coreMagnets || []) {
    if (Math.abs(a.x * T - p.cx) > 50 * T || Math.abs(a.y * T - p.cy) > 34 * T) continue;
    for (const b of w.coreMagnets) {
      if (b === a || b.x < a.x || Math.hypot(b.x - a.x, b.y - a.y) > 22) continue;
      const on = Math.sin(now * 2.3 + a.x * 0.7 + b.y) > 0.82;
      if (!on) continue;
      ctx.strokeStyle = 'rgba(160,210,255,0.85)'; ctx.lineWidth = 1;
      ctx.beginPath();
      const n = 10;
      for (let i = 0; i <= n; i++) {
        const t = i / n, jx = (i === 0 || i === n) ? 0 : (Math.random() - 0.5) * 8, jy = (i === 0 || i === n) ? 0 : (Math.random() - 0.5) * 8;
        const x = lerp((a.x + 0.5) * T, (b.x + 0.5) * T, t) + jx, y = lerp((a.y + 0.5) * T, (b.y + 0.5) * T, t) + jy;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
}

// Baldes e física da lava ficam em js/lava.js.

// =====================================================================================
//  ESQUELETOS DO OSSÁRIO
// =====================================================================================
// Um bicho do tamanho de um morro deitado no chão do salão: coluna arqueada de vértebras,
// costelas curvas descendo até o chão (meio enterradas), cauda afinando e um crânio comprido
// com a mandíbula aberta. Desenhado uma vez por esqueleto e guardado, atrás de todos os blocos.
const SKELETON_ART = new Map();
const BONE = { ol: [46, 36, 30], dk: [150, 134, 108], md: [204, 190, 158], lt: [232, 222, 194], hi: [248, 242, 222] };
function skeletonSprite(len, seed) {
  const key = len + ':' + seed;
  if (SKELETON_ART.has(key)) return SKELETON_ART.get(key);
  const W = (len + 6) * T, H = 13 * T, floor = H - 4, s = new Sprite(W, H), rnd = mulberry32(seed);
  const bonePal = [BONE.ol, BONE.md, BONE.hi], darkPal = [BONE.ol, BONE.dk, BONE.md];
  const curve = (pts, w0, w1, pal) => { // osso grosso ao longo de uma curva, afinando
    for (let i = 0; i < pts.length - 1; i++) {
      const k = i / (pts.length - 1), wd = Math.max(1, Math.round(lerp(w0, w1, k)));
      limb(s, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], wd, pal);
    }
  };
  const tailX = 6, hipX = W * 0.22, shoulderX = W * 0.68, neckX = W - 96;
  const spineY = (x) => {
    if (x < hipX) return lerp(floor - 10, floor - 112, Math.pow(Math.max(0, x - tailX) / (hipX - tailX), 0.8));
    if (x < shoulderX) return floor - 112 - Math.sin((x - hipX) / (shoulderX - hipX) * Math.PI) * 30;
    return lerp(floor - 112, floor - 70, (x - shoulderX) / (neckX - shoulderX));
  };
  // costelas: as de trás (mais escuras) primeiro, depois as da frente
  for (const back of [true, false])
    for (let x = hipX + 20 + (back ? 13 : 0); x < shoulderX - 6; x += 27) {
      const sy = spineY(x), reach = floor - sy, bulge = 26 + Math.sin((x - hipX) / (shoulderX - hipX) * Math.PI) * 22, pts = [];
      for (let k = 0; k <= 14; k++) {
        const tt = k / 14;
        pts.push([x - Math.sin(tt * Math.PI) * bulge * 0.55 - tt * 10 + (back ? 4 : 0), sy + tt * reach * (0.95 + rnd() * 0.04)]);
      }
      curve(pts, 6, 3, back ? darkPal : bonePal);
    }
  // coluna: vértebras com o espinho para cima
  for (let x = tailX; x < neckX; x += 7) {
    const y = spineY(x), sz = x < hipX ? lerp(2, 5, (x - tailX) / (hipX - tailX)) : 5;
    shadeBall(s, x, y, sz + 1.5, sz, (v) => (v > 0.7 ? BONE.hi : v > 0.45 ? BONE.lt : v > 0.25 ? BONE.md : BONE.dk));
    if (x > hipX - 10 && x < shoulderX + 10) limb(s, x, y - sz, x - 3, y - sz - 10 - Math.sin(x / 9) * 2, 2, bonePal);
  }
  // patas: osso da coxa e do braço afundando no chão
  for (const [x, ln] of [[hipX + 6, 1], [shoulderX - 4, 0.9]]) {
    const y = spineY(x);
    curve([[x, y + 6], [x + 14 * ln, y + 50], [x - 6, floor + 6]], 7, 5, bonePal);
  }
  // crânio comprido, com órbita funda, brasa no olho e a mandíbula aberta
  const sx = neckX + 4, sy = floor - 58;
  shadeBall(s, sx + 34, sy, 40, 22, (v, dx, dy) => (dx > 0.55 && dy > 0.1 ? null : v > 0.72 ? BONE.hi : v > 0.45 ? BONE.lt : v > 0.22 ? BONE.md : BONE.dk));
  shadeBall(s, sx + 30, sy - 6, 8, 7, () => [30, 22, 20]);
  shadeBall(s, sx + 30, sy - 6, 3, 3, () => [255, 150, 60]);
  shadeBall(s, sx + 66, sy - 4, 3, 2, () => [40, 30, 26]);
  curve([[sx + 6, sy + 16], [sx + 40, sy + 34], [sx + 72, sy + 30]], 8, 5, darkPal);
  for (let x = sx + 18; x < sx + 70; x += 6) {
    limb(s, x, sy + 16, x + 1, sy + 24, 2, bonePal);
    limb(s, x + 2, sy + 34 - (x - sx) * 0.1, x + 3, sy + 27 - (x - sx) * 0.1, 2, darkPal);
  }
  // ossos soltos, meio enterrados
  for (let k = 0; k < 6; k++) {
    const x = 20 + rnd() * (W - 60), a = rnd() * Math.PI, l = 10 + rnd() * 18;
    curve([[x, floor - 2], [x + Math.cos(a) * l, floor - 2 - Math.abs(Math.sin(a)) * l * 0.4]], 4, 3, bonePal);
  }
  const img = s.finish(BONE.ol);
  img.getContext('2d').clearRect(0, floor + 1, W, H); // o chão cobre a parte de baixo
  const out = { img, W, H };
  SKELETON_ART.set(key, out);
  return out;
}
function drawCoreBackdrop(ctx, game, vx, vy, vw, vh) {
  const ribs = game.world.coreRibs;
  if (!ribs) return;
  for (const r of ribs) {
    const x = r.x0 * T, y = r.floor * T;
    if (x > vx + vw + 40 || (r.x0 + r.len + 6) * T < vx - 40 || y < vy - 40 || y - 13 * T > vy + vh + 40) continue;
    const sp = skeletonSprite(r.len, r.seed);
    if (r.flip) { ctx.save(); ctx.translate(x + sp.W, 0); ctx.scale(-1, 1); ctx.drawImage(sp.img, 0, y - sp.H + 4); ctx.restore(); }
    else ctx.drawImage(sp.img, x, y - sp.H + 4);
  }
}
