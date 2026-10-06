'use strict';

// =====================================================================================
//  O NÚCLEO DOS VIGIAS  —  chefe final, na Câmara do Coração (fundo do meio do mapa)
// =====================================================================================
// Os Vigias construíram uma máquina em volta do coração de magma da ilha para domar o campo
// magnético dela. A máquina parou de obedecer: o campo enlouqueceu e derruba tudo o que voa por
// cima — inclusive o voo 237. Enquanto o Núcleo bater, o farol de rádio só pega chiado.
//
//   • Blindado   quatro placas de bronze giram em volta da esfera: fechado, só 25% do golpe entra
//   • Estilhaços seis lascas de magnetita em órbita; uma acende e dispara, depois a próxima
//   • Pulso      anéis se fecham em volta dele e o campo PUXA o jogador; encostar queima.
//                Depois do pulso as placas ABREM e ele desce perto do chão: é a hora de bater (×2)
//   • Magma      pontos brilham no teto e caem gotas de lava
// Abaixo de 45% ele ACELERA: os fossos cospem brasa e dois Sentinelas descem pelas paredes.

const NUCLEO = {
  hp: 640, contact: 16, shard: 13, drop: 14, armor: 0.25, open: 2,
  pullForce: 210, pulseWarn: 1.3, pulseTime: 1.6, openTime: 3.4,
};
WILDLIFE.nucleo = {
  name: 'O Núcleo dos Vigias', where: 'Câmara do Coração', hostile: true, unique: true,
  hp: NUCLEO.hp, speed: 0, damage: 0, w: 60, h: 60, shape: 'nucleo', color: '#ff7a2c',
  drops: [[ITEM.CORE_SHARD, 6, 9], [ITEM.MAGNETITE, 8, 14], [ITEM.GOLD, 4, 8], [ITEM.RUNE_STONE, 4, 8]],
};
WILD_SIZES.nucleo = [8, 8]; WILD_PALETTES.nucleo = [[0, 0, 0]];
MOB_SFX.nucleo = 'bug';
BESTIARY_LORE.nucleo = 'O coração de magma da ilha, preso numa máquina de bronze pelos Vigias. Desgovernado, o campo dele derruba o que voa por cima. Só abre a blindagem depois de puxar tudo para perto.';
FIGHT_STATES.push('fight');

// Coração dos Vigias: troféu que aumenta a vida máxima (como o coração do tigre)
Object.assign(ITEM, { VIGIA_HEART: 224 });
defItem(ITEM.VIGIA_HEART, { name: 'Coração dos Vigias', vidaMaxima: 25, maxStack: 1, bossItem: true });
ITEM_ART[ITEM.VIGIA_HEART] = {
  cores: { k: [26, 14, 18], a: [110, 30, 18], b: [214, 74, 26], c: [255, 150, 50], d: [255, 230, 150], e: [168, 116, 58], f: [246, 214, 150] },
  pixels: ['................', '...eeee..eeee...', '..ekbbbeebbbke..', '.ekbccbbbbccbke.', '.ekccddbbcccbke.', '.ekcdddccccbbke.', '.ekccddcccbbbke.', '..ekcccccbbbke..',
    '..ekbcccbbbbke..', '...ekbcbbbbke...', '....ekbbbbke....', '.....ekbbke.....', '......ekke......', '.......ee.......', '.......ff.......', '................'],
};
WILDLIFE.nucleo.drops.push([ITEM.VIGIA_HEART, 1, 1]);

Object.assign(SFX, {
  nucleoHum(A, o) { Tn(A, o, { freq: 55, freqEnd: 70, dur: 1.4, gain: 0.5 }); Tn(A, o, { freq: 110, freqEnd: 140, dur: 1.2, gain: 0.2, type: 'square' }); },
  nucleoRoar(A, o) { voice(A, o, { type: 'square', f0: 90, f1: 45, dur: 1.6, gain: 0.5, formants: [[260, 3], [700, 5]], vib: 20, vibRate: 18 }); N(A, o, { freq: 120, dur: 1.4, gain: 0.6, brown: true }); },
  nucleoPulse(A, o) { Tn(A, o, { freq: 200, freqEnd: 40, dur: 0.9, gain: 0.5 }); N(A, o, { type: 'bandpass', freq: 600, freqEnd: 200, q: 2, dur: 0.8, gain: 0.3 }); },
  nucleoOpen(A, o) { Tn(A, o, { freq: 300, freqEnd: 900, dur: 0.5, gain: 0.2, type: 'square' }); N(A, o, { type: 'highpass', freq: 2500, dur: 0.6, gain: 0.25 }); },
  nucleoShard(A, o) { Tn(A, o, { freq: 1800, freqEnd: 600, dur: 0.18, gain: 0.18 }); N(A, o, { type: 'highpass', freq: 4000, dur: 0.1, gain: 0.15 }); },
  nucleoDeath(A, o) { Tn(A, o, { freq: 220, freqEnd: 30, dur: 3, gain: 0.6 }); N(A, o, { freq: 90, dur: 3, gain: 0.7, brown: true, attack: 0.3 }); },
});

// ---------- Arte (pronta no carregamento) ----------
// Esfera de magma em 8 quadros (a superfície corre devagar) e a mesma esfera "acalmada", azul
const NUCLEO_ART = (() => {
  const R = 33, S = R * 2 + 2;
  const ramp = (L, v) => L[clamp(Math.floor(v * L.length), 0, L.length - 1)];
  const FIRE = [[70, 10, 8], [130, 24, 10], [200, 60, 18], [246, 116, 30], [255, 180, 64], [255, 236, 160]];
  const CALM = [[10, 16, 40], [20, 40, 80], [40, 80, 140], [80, 140, 200], [150, 200, 240], [230, 246, 255]];
  const sphere = (L, f) => {
    const s = new Sprite(S, S);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const dx = (x + 0.5 - S / 2) / R, dy = (y + 0.5 - S / 2) / R, d2 = dx * dx + dy * dy;
      if (d2 > 1) continue;
      const z = Math.sqrt(1 - d2), u = Math.atan2(dx, z) / Math.PI + f / 8, v = dy;
      const n = pfbm2(wrap(u * 24, 24), v * 9 + 8, 24, 2211, 3);
      const lim = 0.45 + z * 0.55, hi = Math.max(0, -dx * 0.5 - dy * 0.7 + z * 0.4);
      s.set(x, y, ramp(L, clamp(n * lim + hi * 0.25 - 0.05, 0, 0.999)));
    }
    return s.finish([30, 8, 6]);
  };
  const fire = [], calm = [];
  for (let f = 0; f < 8; f++) { fire.push(sphere(FIRE, f)); calm.push(sphere(CALM, f)); }
  // Placa de bronze curva (um quarto do anel), desenhada apontando para a direita
  const plate = (() => {
    const s = new Sprite(46, 66), B = CORE_PAL.bronze;
    for (let y = 0; y < 66; y++) for (let x = 0; x < 46; x++) {
      const dx = x + 0.5 + 11, dy = y + 0.5 - 33, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
      if (r < 38 || r > 50 || Math.abs(a) > 0.62) continue;
      let c = r < 39 ? B.ol : r > 49 ? B.ol : r > 47 ? B.hi : r > 44 ? B.lt : r > 41 ? B.md : B.dk;
      if (Math.abs(a) > 0.57) c = B.ol;
      if (Math.abs(Math.abs(a) - 0.42) < 0.025 && r > 39 && r < 49) c = B.dk;
      if (Math.abs(r - 44.5) < 0.6 && Math.abs(a) < 0.3 && ((a * 40) | 0) % 3 === 0) c = CORE_PAL.rune[1]; // runa acesa na placa
      if ((Math.abs(a - 0.5) < 0.03 || Math.abs(a + 0.5) < 0.03) && Math.abs(r - 44) < 0.8) c = B.hi; // rebite
      s.set(x, y, c);
    }
    return s.finish(null);
  })();
  // Estilhaço de magnetita
  const shard = (() => {
    const s = new Sprite(13, 19), M = [[30, 34, 52], [70, 86, 124], [120, 150, 200], [200, 232, 255]];
    for (let y = 0; y < 19; y++) for (let x = 0; x < 13; x++) {
      const w = (1 - Math.abs(y - 9) / 9.5) * 6;
      if (Math.abs(x - 6) > w) continue;
      s.set(x, y, Math.abs(x - 6) > w - 1 ? M[0] : x < 6 ? M[3 - (y > 10 ? 1 : 0)] : M[1]);
    }
    return s.finish([12, 14, 24]);
  })();
  const glow = (() => {
    const c = makeCanvas(320, 320), g = c.getContext('2d'), gr = g.createRadialGradient(160, 160, 0, 160, 160, 160);
    gr.addColorStop(0, 'rgba(255,150,50,0.55)'); gr.addColorStop(0.35, 'rgba(255,90,20,0.22)'); gr.addColorStop(1, 'rgba(255,60,10,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 320, 320);
    return c;
  })();
  return { fire, calm, plate, shard, glow, S };
})();

// ---------- Câmara: lacrar e abrir ----------
function nucleoSeal(g, on, m=g.boss) {
  const h = m?.kind==='nucleo'&&m.manualArena ? m.manualArena : g.world.coreHeart;
  for (const [x, y] of h?.gate || []) g.world.setTile(x, y, on ? TILE.CORE_WALL : (g.world.getTile(x, y) === TILE.CORE_WALL ? TILE.AIR : g.world.getTile(x, y)));
  g.world.lightDirty = true;
}
function nucleoInArena(w, p) {
  const h = w.coreHeart;
  if (!h) return false;
  const dx = (p.cx / T - h.cx) / h.A, dy = (p.cy / T - h.cy) / h.B;
  return dx * dx + dy * dy < 0.85 && p.y + p.h > (h.cy - h.B + 6) * T;
}
function spawnNucleo(g) {
  const h = g.world.coreHeart;
  if (!h || g.mobs.some((m) => m.kind === 'nucleo')) return;
  const m = new Wildlife('nucleo', h.core.x - 18, h.core.y - 18);
  g.mobs.push(m);
  return m;
}
const nucleoEnraged = (m) => m.hp < m.def.hp * 0.45;

SHAPE_HOOKS.nucleo = {
  setup(m) {
    Object.assign(m, {
      boss: true, keep: true, sleeping: true, aware: false, state: 'sleep', stateT: 0, attack: null, attackT: 0,
      t: 0, open: 0, plateSpin: 0, shards: [0, 1, 2, 3, 4, 5].map((i) => ({ i, alive: true, regrow: 0, charge: 0 })),
      shardCd: 3, pulseCd: 7, rainCd: 5, pitCd: 4, phase: 1, damage: 0, summoned: false,
    });
  },
  update(m, dt, w, p) {
    const g = game, h = m.manualArena || w.coreHeart;
    if (!h) return;
    m.clock += dt; m.stateT += dt; m.hurtTimer = Math.max(0, m.hurtTimer - dt);
    m.plateSpin += dt * (m.state === 'sleep' ? 0.3 : m.attack === 'pulse' ? 3.2 : nucleoEnraged(m) ? 1.6 : 1.1);
    updateNucleoHazards(g, m, dt, w, p);
    const home = h.core;
    switch (m.state) {
      case 'sleep':
        m.damage = 0; m.aware = false; m.sleeping = true; m.open = Math.max(0, m.open - dt);
        m.x = home.x - m.w / 2; m.y = home.y - m.h / 2 + Math.sin(m.clock * 1.2) * 3;
        if (nucleoInArena(w, p) && !g.respawnPending) {
          nucleoSeal(g, true); g.boss = m; m.sleeping = false; m.state = 'wake'; m.stateT = 0;
          playSfx('nucleoRoar', m.cx, m.cy); g.shake = 7;
          toast('O teto se fecha atrás de você. O NÚCLEO DOS VIGIAS desperta.');
        }
        return;
      case 'wake':
        if (m.stateT > 2.2) { m.state = 'fight'; m.stateT = 0; m.aware = true; }
        return;
      case 'dying': {
        m.damage = 0; m.open = Math.min(1, m.open + dt);
        if (Math.random() < dt * 20) for (let i = 0; i < 3; i++) coreParticle(g, { x: m.cx + (Math.random() - 0.5) * 40, y: m.cy + (Math.random() - 0.5) * 40, vx: (Math.random() - 0.5) * 200, vy: (Math.random() - 0.5) * 200, life: 0.6, maxLife: 0.6, color: Math.random() < 0.5 ? '#9ad0ff' : '#ffb040', w: 2, h: 2, gravity: 0 });
        g.shake = Math.max(g.shake, 2);
        m.y += dt * 12;
        if (m.stateT > 3) m.dead = true;
        return;
      }
    }
    // ---- luta ----
    m.t += dt * (nucleoEnraged(m) ? 1.45 : 1);
    if (nucleoEnraged(m) && m.phase === 1) {
      m.phase = 2; playSfx('nucleoRoar', m.cx, m.cy); g.shake = 8;
      toast('O NÚCLEO ACELERA! Os fossos de lava fervem.');
      if (!m.summoned) { m.summoned = true; for (const side of [-1, 1]) { const s = new Wildlife('sentinela', (h.cx + side * 34) * T, (h.floor - 3) * T - 34); s.aware = true; s.keep = true; s.nucleoGuard = true; g.mobs.push(s); } }
    }
    // voo: oito deitado pela câmara; aberto, desce e fica perto do chão
    const low = (h.floor - 5) * T - m.h / 2, high = home.y;
    const tx = home.x + Math.sin(m.t * 0.33) * 26 * T, ty = lerp(high + Math.sin(m.t * 0.66) * 4 * T, low, m.open);
    m.x += (tx - m.w / 2 - m.x) * Math.min(1, dt * (m.attack === 'pulse' ? 0.6 : 1.4));
    m.y += (ty - m.h / 2 - m.y) * Math.min(1, dt * 1.6);
    m.damage = NUCLEO.contact; m.facing = p.cx < m.cx ? -1 : 1;

    m.attackT += dt;
    if (m.attack === 'pulse') {
      if (m.attackT >= NUCLEO.pulseWarn && m.attackT < NUCLEO.pulseWarn + NUCLEO.pulseTime) {
        // o campo puxa para o núcleo
        const dx = m.cx - p.cx, dy = m.cy - p.cy, d = Math.max(20, Math.hypot(dx, dy));
        p.moveX((dx / d) * NUCLEO.pullForce * dt, w);
        p.vy += (dy / d) * NUCLEO.pullForce * 3 * dt;
        if (Math.random() < dt * 30) coreParticle(g, { x: p.cx + (Math.random() - 0.5) * 10, y: p.cy, vx: dx / d * 200, vy: dy / d * 200, life: 0.3, maxLife: 0.3, color: '#9ad0ff', w: 1, h: 1, gravity: 0 });
      }
      if (m.attackT >= NUCLEO.pulseWarn + NUCLEO.pulseTime) {
        m.attack = 'open'; m.attackT = 0; playSfx('nucleoOpen', m.cx, m.cy);
        if (!g.nucleoHint) { g.nucleoHint = true; toast('As placas abriram! O coração está exposto — bata agora!'); }
      }
    } else if (m.attack === 'open') {
      m.open = Math.min(1, m.open + dt * 2);
      if (m.attackT > NUCLEO.openTime * (nucleoEnraged(m) ? 0.8 : 1)) { m.attack = null; m.attackT = 0; }
    } else {
      m.open = Math.max(0, m.open - dt * 1.5);
      m.shardCd -= dt; m.pulseCd -= dt; m.rainCd -= dt;
      if (m.pulseCd <= 0) { m.attack = 'pulse'; m.attackT = 0; m.pulseCd = (nucleoEnraged(m) ? 9 : 11) + Math.random() * 2; playSfx('nucleoPulse', m.cx, m.cy); }
      else if (m.rainCd <= 0) { m.rainCd = (nucleoEnraged(m) ? 4.5 : 7) + Math.random() * 2; nucleoMagmaRain(g, m, h, p); }
      else if (m.shardCd <= 0) {
        const ready = m.shards.filter((s) => s.alive && !s.charge);
        if (ready.length) { ready[Math.floor(Math.random() * ready.length)].charge = 0.001; }
        m.shardCd = nucleoEnraged(m) ? 0.9 : 1.5;
      }
    }
    // fossos fervendo na fase 2: brasa subindo em arco
    if (m.phase === 2 && (m.pitCd -= dt) <= 0) {
      m.pitCd = 2.4 + Math.random();
      for (const side of [-1, 1]) {
        const x = (h.cx + side * (24 + Math.random() * 5)) * T;
        (g.coreShots ??= []).push({ x, y: h.floor * T, vx: -side * (40 + Math.random() * 80), vy: -420 - Math.random() * 120, damage: 11, life: 3 });
      }
      playSfx('coreSpit', h.cx * T, h.floor * T);
    }
    // estilhaços: carregam, disparam no jogador, voltam a crescer
    for (const s of m.shards) {
      if (!s.alive) { if ((s.regrow -= dt) <= 0) s.alive = true; continue; }
      if (!s.charge) continue;
      s.charge += dt;
      if (s.charge >= 0.55) {
        const pos = nucleoShardPos(m, s), dx = p.cx - pos.x, dy = p.cy - pos.y, d = Math.max(1, Math.hypot(dx, dy)), sp = nucleoEnraged(m) ? 330 : 270;
        (g.nucleoShots ??= []).push({ x: pos.x, y: pos.y, vx: dx / d * sp, vy: dy / d * sp, life: 3, rot: Math.atan2(dy, dx) });
        s.alive = false; s.charge = 0; s.regrow = 4;
        playSfx('nucleoShard', pos.x, pos.y);
      }
    }
  },
  hit(m, damage, fromX) {
    const g = game;
    if (m.state === 'sleep' || m.state === 'wake' || m.state === 'dying') return;
    const exposed = m.open > 0.6;
    const dmg = Math.max(1, Math.round(damage * (exposed ? NUCLEO.open : NUCLEO.armor)));
    m.hp -= dmg; m.hurtTimer = 0.14;
    if (!exposed) {
      playSfx('coreClank', m.cx, m.cy);
      for (let i = 0; i < 4; i++) coreParticle(g, { x: clamp(fromX, m.x, m.x + m.w), y: m.cy, vx: (Math.random() - 0.5) * 160, vy: -Math.random() * 140, life: 0.25, maxLife: 0.25, color: '#ffe0a0', w: 1, h: 1, gravity: 300 });
      if (!m.armorHint) { m.armorHint = true; toast('As placas de bronze desviam o golpe. Espere ele abrir depois do pulso!'); }
    } else for (let i = 0; i < 6; i++) coreParticle(g, { x: m.cx, y: m.cy, vx: (Math.random() - 0.5) * 220, vy: (Math.random() - 0.5) * 220, life: 0.4, maxLife: 0.4, color: i & 1 ? '#ffb040' : '#ff5020', w: 2, h: 2, gravity: 200 });
    if (m.hp <= 0) {
      m.hp = 1; m.state = 'dying'; m.stateT = 0; m.attack = null;
      playSfx('nucleoDeath', m.cx, m.cy); g.shake = 10;
      g.nucleoShots = []; g.nucleoRain = [];
      for (const o of g.mobs) if (o.nucleoGuard) o.dead = true;
    }
  },
  defeated(g, m) {
    nucleoSeal(g, false, m);
    g.nucleoShots = []; g.nucleoRain = [];
    coreCalmed(g);
    toast('O NÚCLEO SE ACALMOU. O campo magnético da ilha silencia — e o rádio volta a pegar.');
    Music.victory();
    return true;
  },
  goHome(g, m) {
    const h = m.manualArena || g.world.coreHeart;
    nucleoSeal(g, false, m);
    g.nucleoShots = []; g.nucleoRain = [];
    for (const o of g.mobs) if (o.nucleoGuard) o.despawn = true;
    SHAPE_HOOKS.nucleo.setup(m);
    m.hp = m.def.hp; m.hurtTimer = 0;
    if (h) { m.x = h.core.x - m.w / 2; m.y = h.core.y - m.h / 2; }
    if (g.boss === m) g.boss = null;
  },
  draw(ctx, m) { drawNucleo(ctx, m); },
};

function nucleoShardPos(m, s) {
  const a = (m.plateSpin ?? 0) * -0.8 + (s.i / 6) * Math.PI * 2, r = 72 + Math.sin((m.clock ?? 0) * 2 + s.i) * 3;
  return { x: m.cx + Math.cos(a) * r, y: m.cy + Math.sin(a) * r * 0.8 };
}

// Chuva de magma: quatro (seis na fúria) pontos acendem no teto e soltam gotas de lava
function nucleoMagmaRain(g, m, h, p) {
  const n = nucleoEnraged(m) ? 6 : 4, list = (g.nucleoRain ??= []);
  for (let k = 0; k < n; k++) {
    const x = clamp(p.cx / T + (k - (n - 1) / 2) * 5 + (Math.random() - 0.5) * 3, h.cx - h.A + 6, h.cx + h.A - 6);
    let y = Math.floor(p.cy / T);
    while (y > h.y0 && g.world.getTile(Math.floor(x), y - 1) !== TILE.CORE_WALL) y--;
    list.push({ x: x * T, y: y * T + 2, vy: 0, t: 0, warn: 0.9 + k * 0.08, floor: h.floor * T });
  }
  playSfx('beetleRumble', p.cx, (h.cy - h.B) * T);
}

function updateNucleoHazards(g, m, dt, w, p) {
  const shots = g.nucleoShots || [];
  for (let i = shots.length - 1; i >= 0; i--) {
    const s = shots[i];
    s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
    if (p.invulnerable <= 0 && s.x > p.x - 3 && s.x < p.x + p.w + 3 && s.y > p.y && s.y < p.y + p.h) { damageMonsterPlayer(g, NUCLEO.shard, s.x); shots.splice(i, 1); continue; }
    if (s.life <= 0 || w.isSolid(Math.floor(s.x / T), Math.floor(s.y / T))) {
      for (let k = 0; k < 5; k++) coreParticle(g, { x: s.x, y: s.y, vx: (Math.random() - 0.5) * 140, vy: (Math.random() - 0.5) * 140, life: 0.3, maxLife: 0.3, color: '#b8dcff', w: 1, h: 1, gravity: 100 });
      shots.splice(i, 1);
    }
  }
  const rain = g.nucleoRain || [];
  for (let i = rain.length - 1; i >= 0; i--) {
    const r = rain[i];
    r.t += dt;
    if (r.t < r.warn) { if (Math.random() < dt * 10) coreParticle(g, { x: r.x + (Math.random() - 0.5) * 6, y: r.y, vx: 0, vy: 30, life: 0.4, maxLife: 0.4, color: '#ff9030', w: 1, h: 1, gravity: 200 }); continue; }
    r.vy += 900 * dt; r.y += r.vy * dt;
    if (p.invulnerable <= 0 && Math.abs(p.cx - r.x) < 9 && r.y > p.y && r.y < p.y + p.h) { damageMonsterPlayer(g, NUCLEO.drop, r.x); rain.splice(i, 1); continue; }
    if (r.y >= r.floor - 2 || w.isSolid(Math.floor(r.x / T), Math.floor(r.y / T))) {
      for (let k = 0; k < 8; k++) coreParticle(g, { x: r.x, y: r.y, vx: (Math.random() - 0.5) * 160, vy: -Math.random() * 160, life: 0.5, maxLife: 0.5, color: k & 1 ? '#ffb040' : '#ff5020', w: 2, h: 2, gravity: 500 });
      rain.splice(i, 1);
    }
  }
}

// ---------- Desenho ----------
function drawNucleo(ctx, m) {
  const A = NUCLEO_ART, t = performance.now() / 1000;
  const cx = Math.round(m.cx), cy = Math.round(m.cy), dying = m.state === 'dying', calm = dying ? clamp(m.stateT / 2.5, 0, 1) : 0;
  const open = m.open ?? 0, spin = m.plateSpin ?? t * 0.3;
  ctx.save();
  // (o halo de luz sai depois da camada de luz, em drawCoreAccents)
  // anéis do pulso se fechando
  if (m.attack === 'pulse') {
    const k = (m.attackT ?? 0) / NUCLEO.pulseWarn;
    ctx.strokeStyle = k < 1 ? `rgba(150,200,255,${0.4 + k * 0.5})` : 'rgba(200,230,255,0.9)'; ctx.lineWidth = k < 1 ? 1 : 2;
    for (let r = 0; r < 3; r++) {
      const rad = k < 1 ? 220 - ((k * 220 + r * 70) % 220) : 50 + ((t * 400 + r * 60) % 160);
      ctx.beginPath(); ctx.arc(cx, cy, Math.max(4, rad), 0, Math.PI * 2); ctx.stroke();
    }
  }
  // esfera
  const f = Math.floor(t * 6) % 8;
  const sphere = calm > 0.5 ? A.calm[f] : A.fire[f], sc = 1 + (m.attack === 'pulse' ? Math.sin(t * 20) * 0.04 : 0) - calm * 0.25;
  ctx.drawImage(sphere, Math.round(cx - A.S / 2 * sc), Math.round(cy - A.S / 2 * sc), Math.round(A.S * sc), Math.round(A.S * sc));
  if (m.hurtTimer > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5; ctx.drawImage(sphere, cx - A.S / 2, cy - A.S / 2); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
  // runa acesa no meio enquanto dorme
  if (m.state === 'sleep' || m.state === undefined) {
    ctx.fillStyle = `rgba(110,240,230,${0.5 + Math.sin(t * 2) * 0.3})`;
    for (const [dx, dy] of [[0, -4], [-1, -3], [1, -3], [0, -2], [-3, 0], [3, 0], [0, 2], [-1, 3], [1, 3], [0, 4], [0, 0]]) ctx.fillRect(cx + dx * 2, cy + dy * 2, 2, 2);
  }
  // placas de bronze: giram e se afastam quando ele abre; morrendo, voam longe
  for (let k = 0; k < 4; k++) {
    const a = spin + k * Math.PI / 2, dist = open * 20 + (dying ? m.stateT * 90 : 0);
    ctx.save();
    ctx.translate(cx + Math.cos(a) * dist, cy + Math.sin(a) * dist);
    ctx.rotate(a + (dying ? m.stateT * (k + 1) : 0));
    ctx.globalAlpha = dying ? clamp(1 - m.stateT / 2, 0, 1) : 1;
    ctx.drawImage(A.plate, -11, -33);
    ctx.restore();
  }
  // estilhaços em órbita
  for (const s of m.shards || []) {
    if (!s.alive || dying) continue;
    const pos = nucleoShardPos(m, s);
    ctx.drawImage(A.shard, Math.round(pos.x - 6), Math.round(pos.y - 9));
    if (s.charge) { ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(150,210,255,${0.3 + s.charge})`; ctx.fillRect(Math.round(pos.x - 4), Math.round(pos.y - 7), 8, 14); ctx.globalCompositeOperation = 'source-over'; }
  }
  ctx.restore();
}

// Projéteis e avisos do teto (no espaço do mundo, chamado por drawCoreWorld)
function drawNucleoFx(ctx, g) {
  for (const s of g.nucleoShots || []) {
    ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.rot + Math.PI / 2);
    ctx.drawImage(NUCLEO_ART.shard, -6, -9); ctx.restore();
  }
  for (const r of g.nucleoRain || []) {
    if (r.t < r.warn) {
      const a = 0.3 + (r.t / r.warn) * 0.7;
      ctx.fillStyle = `rgba(255,140,40,${a})`; ctx.fillRect(Math.round(r.x) - 4, Math.round(r.y) - 2, 8, 3);
      ctx.fillStyle = `rgba(255,220,120,${a})`; ctx.fillRect(Math.round(r.x) - 2, Math.round(r.y) - 1, 4, 2);
    } else {
      ctx.fillStyle = '#ff6020'; ctx.fillRect(Math.round(r.x) - 3, Math.round(r.y) - 5, 6, 8);
      ctx.fillStyle = '#ffd070'; ctx.fillRect(Math.round(r.x) - 1, Math.round(r.y) - 3, 2, 4);
    }
  }
}
{
  const baseWorld = drawCoreWorld;
  drawCoreWorld = (ctx, g) => { baseWorld(ctx, g); drawNucleoFx(ctx, g); };
}

BOSS_BARS.nucleo = (m) => {
  const furious = nucleoEnraged(m), exposed = (m.open ?? 0) > 0.6, dying = m.state === 'dying';
  return {
    label: 'NÚCLEO DOS VIGIAS' + (dying ? ' · SE APAGANDO' : exposed ? ' · EXPOSTO!' : furious ? ' · ACELERADO' : ''),
    text: exposed ? '#ffe0a0' : furious ? '#ff9a6a' : UIC.text,
    fill: m.hurtTimer > 0 ? '#fff0c0' : exposed ? '#ffb040' : '#e0602a',
    back: '#200a08', mark: furious ? '#ff9a6a' : '#7a2a18',
  };
};

// =====================================================================================
//  HISTÓRIA: o farol só pega chiado enquanto o Núcleo bater
// =====================================================================================
const CORE_STATIC = [
  [0.3, PILOT_NAME, 'Mayday, mayday. Aqui é a tripulação do voo que caiu na ilha. Temos sobreviventes.'],
  [6, 'Rádio', '...KSSHHHH... ...KRRZZT... ...'],
  [11, PILOT_NAME, 'Nada! E olha a bússola: o ponteiro gira sem parar. Foi isso que derrubou o nosso avião.'],
  [18, PILOT_NAME, 'Os moradores falam de um Poço dos Vigias perto do centro da ilha, que desce até o coração da terra. Se tem uma máquina lá embaixo, ela precisa ser desligada.'],
];
function coreCalmed(g) {
  const s = storyState(g);
  s.coreCalmed = true;
  if (s.step === 'core' || s.step === 'interference') {
    s.step = 'beacon';
    g.objective = `O Núcleo se calou. Volte e ligue o farol ao lado da ${PILOT_NAME}.`;
  }
}
function coreShaftHint(g) {
  const sx = g.world.coreHeart?.shaftX, v = pilotOf(g);
  if (sx == null || !v) return 'perto do centro da ilha';
  const d = Math.round(sx - v.cx / T);
  return Math.abs(d) < 20 ? 'bem embaixo da vila, no centro da ilha' : `${Math.abs(d)} blocos a ${d > 0 ? 'leste' : 'oeste'} daqui, perto do centro da ilha`;
}
{
  const baseUse = useBeacon;
  useBeacon = (g) => {
    const s = storyState(g);
    if (s.step !== 'beacon' || s.coreCalmed || !g.world.coreHeart) return baseUse(g);
    s.step = 'interference'; s.callT = 0;
    playSfx('door');
    g.objective = 'Chamando o resgate...';
  };
  const baseTalk = talkToPilot;
  talkToPilot = (g) => {
    const s = storyState(g);
    if (s.step === 'core') { pilotSay(g, `O Poço dos Vigias fica ${coreShaftHint(g)}. Desça até o fim e cale aquela máquina. Leve algo contra o calor!`, 8); return; }
    if (s.step === 'interference') { pilotSay(g, 'Shh... escuta o rádio.'); return; }
    baseTalk(g);
  };
  const baseUpdate = updateStory;
  updateStory = (g, dt) => {
    baseUpdate(g, dt);
    const s = storyState(g);
    if (s.step !== 'interference') return;
    const before = s.callT, b = beaconSpot(g);
    s.callT += dt;
    for (const [t, who, text] of CORE_STATIC) if (before < t && s.callT >= t) {
      if (who === PILOT_NAME) pilotSay(g, text, 7); else if (b) storySay(g, b.x, b.y - 4 * T, who, text, 6);
    }
    if (s.callT >= 26) {
      s.step = 'core';
      g.objective = `Desça pelo Poço dos Vigias (${coreShaftHint(g)}) até o Coração da Ilha e desligue o Núcleo.`;
    }
  };
}

// =====================================================================================
//  CHEGADA AO CORAÇÃO: o Núcleo nasce com o mundo, o portal fala e cada trecho tem nome
// =====================================================================================
const CORE_ZONE_NAMES = ['A Forja', 'O Campo Magnético', 'O Maquinário dos Vigias', 'O Ossário'];
{
  const baseCore = updateCore;
  updateCore = (g, dt) => {
    const w = g.world, p = g.player;
    if (w.coreHeart && !storyState(g).coreCalmed && !g.mobs.some((m) => m.kind === 'nucleo')) spawnNucleo(g);
    baseCore(g, dt);
    if (!w.coreTop || g.intro?.active) return;
    const tx = clamp(Math.floor(p.cx / T), 0, w.w - 1), ty = Math.floor(p.cy / T);
    // inscrição no portal do poço principal
    const main = (w.coreShafts || []).find((s) => s.main);
    if (main && !g.corePortalRead && Math.abs(tx - main.x) < 5 && Math.abs(ty - main.yTop) < 5) {
      g.corePortalRead = true;
      storySay(g, (main.x + 0.5) * T, (main.yTop - 5) * T, 'Portal dos Vigias', 'Gravado na pedra: "Aqui embaixo bate o coração da ilha. Quem desce, desce para acalmá-lo."', 8);
    }
    if (ty >= w.coreTop[tx] + 4) {
      const z = w.coreZone[tx];
      if (!g.coreEntered) { g.coreEntered = true; toast('Você chegou ao CORAÇÃO DA ILHA.'); g.coreZoneSeen = z; }
      else if (g.coreZoneSeen !== z) { g.coreZoneSeen = z; toast(CORE_ZONE_NAMES[z]); }
    }
  };
}

// O coração de magma tem luz própria: o halo e a esfera saem de novo DEPOIS da camada de luz,
// para não serem apagados pelo escuro da câmara (as placas continuam pegando a luz do ambiente)
{
  const baseAccents = drawCoreAccents;
  drawCoreAccents = (ctx, g, ox, oy, z) => {
    baseAccents(ctx, g, ox, oy, z);
    const m = g.mobs?.find((o) => o.kind === 'nucleo' && !o.dead);
    if (!m) return;
    const sx = m.cx * z - ox, sy = m.cy * z - oy, W = ctx.canvas.width, H = ctx.canvas.height;
    if (sx < -400 || sy < -400 || sx > W + 400 || sy > H + 400) return;
    const A = NUCLEO_ART, t = performance.now() / 1000, dying = m.state === 'dying', calm = dying ? clamp(m.stateT / 2.5, 0, 1) : 0;
    const gs = (1.1 + Math.sin(t * 3) * 0.06 + (m.open ?? 0) * 0.35) * z;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = (m.state === 'sleep' ? 0.55 : 0.9) * (1 - calm * 0.6);
    ctx.drawImage(A.glow, sx - 160 * gs, sy - 160 * gs, 320 * gs, 320 * gs);
    ctx.globalCompositeOperation = 'source-over';
    ctx.imageSmoothingEnabled = false;
    const f = Math.floor(t * 6) % 8, sphere = calm > 0.5 ? A.calm[f] : A.fire[f];
    const sc = (1 + (m.attack === 'pulse' ? Math.sin(t * 20) * 0.04 : 0) - calm * 0.25) * z;
    // por trás das placas: só a parte que aparece entre elas (as placas cobrem o resto no passe normal)
    ctx.globalAlpha = 0.25 + (m.open ?? 0) * 0.6;
    ctx.drawImage(sphere, Math.round(sx - A.S / 2 * sc), Math.round(sy - A.S / 2 * sc), Math.round(A.S * sc), Math.round(A.S * sc));
    ctx.restore();
  };
}
