'use strict';

// =====================================================================================
//  O OLHO DA TEMPESTADE, a Ave-Trovão — chefe do Ninho da Tempestade (o alto do céu)
// =====================================================================================
// Os Vigias do Céu deixaram uma guardiã no caminho das nuvens: uma ave do tamanho de uma
// casa, feita de pena e de trovão. Ela dorme no ninho mais alto e acorda quando alguém pisa nele.
//
//   • Raios      marca colunas no chão (faíscas piscando) e o raio cai um instante depois
//   • Ventania   para de um lado da arena e bate as asas: empurra para a beirada e solta
//                penas afiadas. Agachado o vento empurra bem menos.
//   • Rasante    grita, mostra a linha do mergulho e despenca. Errou? O bico crava no chão e
//                ela fica PRESA por um tempo: é a hora de bater (o dano entra quase dobrado).
// Abaixo de metade da vida a tempestade fecha: mais raios, mais rápido, e dois gaviões descem.

const AVE = {
  hp: 560, armorAir: 0.55, stuck: 1.8, stuckTime: 2.6,
  bolt: 14, blade: 8, dive: 16, gustPush: 230, warn: 1.0,
};
Object.assign(ITEM, { STORM_EYE: 244, STORM_WINGS: 245, THUNDER_SPEAR: 246 });
defItem(ITEM.STORM_EYE, { name: 'Olho da Tempestade', vidaMaxima: 20, maxStack: 1, bossItem: true,
  descricao: 'Comer aumenta a vida máxima. Ainda dá para ouvir trovão lá dentro.' });
defItem(ITEM.STORM_WINGS, {
  name: 'Asas da Tempestade', acessorio: { voo: true }, maxStack: 1, bossItem: true,
  descricao: 'No cinto: segure o pulo para voar por 30 segundos de impulso. Recupera o voo ao pousar.',
});
defItem(ITEM.THUNDER_SPEAR, {
  name: 'Lança-Trovão', dano: 16, alcance: 46, rapidez: 0.9, maxStack: 1, bossItem: true, perfilGolpe: NEEDLE_THRUST,
  raio: { cada: 3, dano: 12, alcance: 3 },
  descricao: 'Lança longa. A cada três golpes seguidos um raio cai em quem ela acertou e em quem estiver perto.',
});

WILDLIFE.thunderbird = {
  name: 'Olho da Tempestade', where: 'Ninho da Tempestade', hostile: true, unique: true, voa: true,
  hp: AVE.hp, speed: 0, damage: 0, w: 120, h: 66, shape: 'thunderbird', color: '#3a4670',
  drops: [[ITEM.STORM_EYE, 1, 1], [ITEM.STORM_WINGS, 1, 1], [ITEM.THUNDER_SPEAR, 1, 1], [ITEM.FEATHER, 10, 16], [ITEM.WIND_CRYSTAL, 4, 8], [ITEM.CLOUD_ESSENCE, 6, 10]],
};
WILD_SIZES.thunderbird = [AVE_ART.W, AVE_ART.H]; WILD_PALETTES.thunderbird = [[10, 12, 24], [28, 36, 62], [52, 64, 100], [90, 106, 148], [196, 206, 226]];
MOB_SFX.thunderbird = 'bat';
BESTIARY_LORE.thunderbird = 'A guardiã que os Vigias deixaram no caminho das nuvens. Dorme no ninho mais alto do céu e acorda quem pisa nele com raio. Depois do mergulho o bico fica cravado no chão por um instante.';
FIGHT_STATES.push('soar', 'bolts', 'gust', 'screech', 'dive', 'stuck', 'rise');

Object.assign(SFX, {
  thunder(A, o) { N(A, o, { freq: 90, dur: 1.6, gain: 0.9, brown: true, attack: 0.01 }); N(A, o, { type: 'highpass', freq: 2500, dur: 0.25, gain: 0.5 }); Tn(A, o, { freq: 70, freqEnd: 35, dur: 1.2, gain: 0.5 }); },
  crackle(A, o) { N(A, o, { type: 'highpass', freq: 4000, dur: 0.35, gain: 0.18 }); },
  aveRoar(A, o) { voice(A, o, { type: 'sawtooth', f0: 700, f1: 320, dur: 1.4, gain: 0.45, formants: [[1400, 5], [2600, 7]], vib: 30, vibRate: 22 }); N(A, o, { type: 'bandpass', freq: 1200, q: 0.8, dur: 1.2, gain: 0.3 }); },
  aveGust(A, o) { N(A, o, { type: 'lowpass', freq: 600, freqEnd: 300, dur: 0.5, gain: 0.5 }); N(A, o, { type: 'bandpass', freq: 1400, q: 0.6, dur: 0.6, gain: 0.25 }); },
  aveImpact(A, o) { N(A, o, { freq: 140, dur: 0.7, gain: 0.9, brown: true }); Tn(A, o, { freq: 80, freqEnd: 40, dur: 0.5, gain: 0.5 }); },
  aveDeath(A, o) { voice(A, o, { type: 'sawtooth', f0: 600, f1: 120, dur: 2.6, gain: 0.4, formants: [[1200, 4], [2200, 6]], vib: 20, vibRate: 10 }); N(A, o, { freq: 100, dur: 2.6, gain: 0.6, brown: true, attack: 0.4 }); },
});

// ---------- Arte: js/sky-boss-art.js (paintAveTrovao) ----------
const AVE_GOLD = AVE_PAL.gold;

// ---------- Ninho: quem está dentro ----------
const aveHome = (w,m) => {const n=m?.manualArena||w.skyNest;return { x: (n.cx + 6) * T, y: n.floor * T };};
function aveInArena(w, p, m) {
  const n = m?.manualArena || w.skyNest;
  if (!n) return false;
  const tx = p.cx / T, ty = (p.y + p.h) / T;
  return Math.abs(tx - n.cx) < n.R - 2 && ty <= n.floor + 1 && ty > n.floor - 30;
}
const aveEnraged = (m) => m.hp < m.def.hp * 0.5;
function spawnAve(g) {
  const w = g.world;
  if (!w.skyNest || g.mobs.some((m) => m.kind === 'thunderbird')) return null;
  const h = aveHome(w), m = new Wildlife('thunderbird', h.x - WILDLIFE.thunderbird.w / 2, h.y - WILDLIFE.thunderbird.h);
  g.mobs.push(m);
  return m;
}

SHAPE_HOOKS.thunderbird = {
  paint: paintAveTrovao, outline: null, // arte em js/sky-boss-art.js (contorno próprio)
  setup(m) {
    Object.assign(m, { boss: true, keep: true, sleeping: true, aware: false, state: 'sleep', stateT: 0, t: 0, attackCd: 2.5, last: null, phase: 1,
      summoned: false, damage: 0, facing: -1, gustDir: 1, bladeT: 0, diveTo: null, diveLocked: false, awayT: 0 });
  },
  frame(m) {
    switch (m.state) {
      case 'sleep': return 11;
      case 'wake': return m.stateT < 0.8 ? 13 : AVE_FLIGHT[Math.floor(m.stateT * 18) % 16];
      case 'dive': return 8;
      case 'screech': return 30 + Math.floor(m.stateT * 10) % 4;
      case 'bolts': return 22 + Math.floor(m.stateT * 8) % 4;
      case 'stuck': return 26 + Math.floor(m.stateT * 9) % 4;
      case 'dying': return 10;
      case 'gust': return AVE_FLIGHT[Math.floor(m.stateT * 26) % 16];
      case 'rise': return AVE_FLIGHT[Math.floor(m.stateT * 22) % 16];
      // no alto ela alterna batidas com trechos planando
      default: return m.state === 'soar' && Math.sin(m.clock * 0.7) > 0.55 ? 12 : AVE_FLIGHT[Math.floor(m.clock * (aveEnraged(m) ? 16 : 13)) % 16];
    }
  },
  update(m, dt, w, p) {
    const g = game, n = m.manualArena || w.skyNest;
    if (!n) return;
    m.clock += dt; m.stateT += dt; m.hurtTimer = Math.max(0, m.hurtTimer - dt);
    updateAveHazards(g, m, dt, w, p);
    const home = aveHome(w,m), floorPx = n.floor * T;
    const glide = (tx, ty, k) => { m.x += (tx - m.w / 2 - m.x) * Math.min(1, dt * k); m.y += (ty - m.h / 2 - m.y) * Math.min(1, dt * k); };
    switch (m.state) {
      case 'sleep':
        m.damage = 0; m.sleeping = true;
        m.x = home.x - m.w / 2; m.y = home.y - m.h + Math.sin(m.clock * 1.1) * 1.5;
        if (aveInArena(w, p,m) && !g.respawnPending) {
          m.sleeping = false; m.state = 'wake'; m.stateT = 0; g.boss = m; m.aware = true;
          playSfx('aveRoar', m.cx, m.cy); g.shake = 6;
          toast('O ninho estremece. O OLHO DA TEMPESTADE abre as asas.');
        }
        return;
      case 'wake':
        glide(home.x, floorPx - 9 * T, 1.2);
        if (m.stateT > 2) { m.state = 'soar'; m.stateT = 0; }
        return;
      case 'dying':
        m.damage = 0;
        glide(home.x, floorPx - m.h / 2, 0.8);
        if (Math.random() < dt * 8) aveStrike(g, n, (n.cx + (Math.random() - 0.5) * n.R * 1.6) * T, true);
        if (Math.random() < dt * 30) skyParticle(g, { x: m.cx + (Math.random() - 0.5) * 60, y: m.cy + (Math.random() - 0.5) * 30, vx: (Math.random() - 0.5) * 120, vy: -40 - Math.random() * 80, life: 1, maxLife: 1, color: Math.random() < 0.5 ? '#c8d2e6' : '#5a6890', w: 2, h: 2, gravity: 60 });
        if (m.stateT > 3.2) m.dead = true;
        return;
    }
    // ---- luta ----
    // longe da arena por um tempo: desiste e volta a dormir no ninho
    if (!aveInArena(w, p,m)) { m.awayT = (m.awayT ?? 0) + dt; if (m.awayT > 8) { SHAPE_HOOKS.thunderbird.goHome(g, m); return; } } else m.awayT = 0;
    const rage = aveEnraged(m), speed = rage ? 1.35 : 1;
    m.t += dt * speed;
    if (rage && m.phase === 1) {
      m.phase = 2; playSfx('aveRoar', m.cx, m.cy); g.shake = 8;
      toast('A TEMPESTADE FECHA! O Olho da Tempestade chama os gaviões.');
      if (!m.summoned) { m.summoned = true; for (const side of [-1, 1]) { const h = new Wildlife('stormhawk', (n.cx + side * 26) * T, floorPx - 20 * T); h.aware = true; h.aveGuard = true; g.mobs.push(h); } }
    }
    m.facing = p.cx < m.cx ? -1 : 1;
    switch (m.state) {
      case 'soar': {
        // oito largo por cima da arena
        glide(home.x + Math.sin(m.t * 0.45) * (n.R - 10) * T, floorPx - (12 + Math.sin(m.t * 0.9) * 3) * T, 1.6);
        if ((m.attackCd -= dt * speed) <= 0) {
          const opts = ['bolts', 'gust', 'dive', 'dive'].filter((k) => k !== m.last);
          const pick = opts[Math.floor(Math.random() * opts.length)];
          m.last = pick; m.stateT = 0;
          if (pick === 'bolts') { m.state = 'bolts'; aveBolts(g, m, n, p); }
          else if (pick === 'gust') { m.state = 'gust'; m.bladeT = 0.15; m.gustDir = p.cx < home.x ? 1 : -1; playSfx('aveGust', m.cx, m.cy); }
          else { m.state = 'screech'; m.diveLocked = false; playSfx('aveRoar', m.cx, m.cy); }
        }
        break;
      }
      case 'bolts':
        glide(m.cx, floorPx - 15 * T, 1);
        if (m.stateT > AVE.warn + 1) { m.state = 'soar'; m.attackCd = rage ? 1.6 : 2.4; }
        break;
      case 'gust': {
        // de um lado da arena, de frente para o meio, batendo as asas: empurra para a beirada
        const sx = home.x - m.gustDir * (n.R - 8) * T;
        glide(sx, floorPx - 8 * T, 2);
        m.facing = m.gustDir;
        if (m.stateT > 0.6 && aveInArena(w, p,m)) {
          const k = (p.crouching ? 0.3 : 1) * (p.onGround ? 1 : 1.3);
          p.moveX(m.gustDir * AVE.gustPush * k * dt, w);
          if (!g.gustHint) { g.gustHint = true; toast('Ventania! Agache (S) para o vento empurrar menos.'); }
        }
        if (m.stateT > 0.6 && (m.bladeT -= dt) <= 0) {
          m.bladeT = rage ? 0.28 : 0.4;
          const ty = p.cy + (Math.random() - 0.5) * 30;
          (g.aveBlades ??= []).push({ x: m.cx + m.gustDir * 30, y: m.cy, vx: m.gustDir * 320, vy: (ty - m.cy) * 0.6, life: 2.5, rot: 0, trail: [] });
        }
        if (Math.random() < dt * 30) skyParticle(g, { x: m.cx + m.gustDir * 40, y: m.cy + (Math.random() - 0.5) * 120, vx: m.gustDir * (300 + Math.random() * 200), vy: (Math.random() - 0.5) * 30, life: 0.8, maxLife: 0.8, color: 'rgba(230,240,255,0.7)', w: 8, h: 1, gravity: 0 });
        if (m.stateT > 3.2) { m.state = 'soar'; m.attackCd = rage ? 1.4 : 2.2; }
        break;
      }
      case 'screech': {
        // para em cima do jogador e marca onde vai cair
        const windup = rage ? 0.85 : 1.1;
        if (!m.diveLocked || !m.diveTo) {
          m.diveTo = [clamp(p.cx, (n.x0 + 4) * T, (n.x1 - 4) * T), floorPx];
          if (m.stateT >= windup - 0.35) m.diveLocked = true;
        }
        glide(m.diveTo[0], Math.min(p.cy - 9 * T, floorPx - 10 * T), 2.2);
        if (m.stateT > windup) { m.state = 'dive'; m.stateT = 0; m.diveTrail = []; playSfx('hawkDive', m.cx, m.cy, { vol: 1.4 }); }
        break;
      }
      case 'dive': {
        (m.diveTrail ??= []).unshift({ x: m.cx, y: m.cy });
        m.diveTrail.length = Math.min(m.diveTrail.length, 8);
        const [tx, ty] = m.diveTo, dx = tx - m.cx, dy = ty - (m.y + m.h), d = Math.hypot(dx, dy), sp = (rage ? 620 : 540) * dt;
        if (d <= sp) {
          m.x = tx - m.w / 2; m.y = ty - m.h; m.state = 'stuck'; m.stateT = 0;
          g.shake = 8; playSfx('aveImpact', m.cx, ty);
          (g.aveImpacts ??= []).push({ x: tx, y: ty, age: 0, life: 0.65 });
          for (let i = 0; i < 18; i++) skyParticle(g, { x: m.cx + (Math.random() - 0.5) * 50, y: ty, vx: (Math.random() - 0.5) * 260, vy: -Math.random() * 220, life: 0.7, maxLife: 0.7, color: i % 3 ? '#8a6a44' : '#c8d2e6', w: 2, h: 2, gravity: 500 });
          if (!g.stuckHint) { g.stuckHint = true; toast('O bico cravou no ninho! Bata agora, enquanto ela está presa!'); }
        } else { m.x += dx / d * sp; m.y += dy / d * sp; m.facing = Math.sign(dx) || m.facing; }
        if (p.invulnerable <= 0 && !g.adminGod && p.x < m.x + m.w - 10 && p.x + p.w > m.x + 10 && p.y < m.y + m.h && p.y + p.h > m.y + 6) {
          damageMonsterPlayer(g, AVE.dive, m.cx);
          p.vx = (Math.sign(dx) || m.facing) * 480; p.vy = -300; p.onGround = false;
        }
        break;
      }
      case 'stuck':
        if (Math.random() < dt * 6) skyParticle(g, { x: m.cx + m.facing * 30, y: m.y + m.h, vx: (Math.random() - 0.5) * 60, vy: -40, life: 0.5, maxLife: 0.5, color: '#9a7a54', w: 2, h: 2, gravity: 300 });
        if (m.stateT > AVE.stuckTime * (rage ? 0.8 : 1)) { m.state = 'rise'; m.stateT = 0; playSfx('aveGust', m.cx, m.cy); }
        break;
      case 'rise':
        glide(m.cx, floorPx - 12 * T, 1.8);
        if (m.stateT > 0.9) { m.state = 'soar'; m.attackCd = rage ? 1.2 : 2; }
        break;
    }
    m.damage = 0;
  },
  hit(m, damage, fromX) {
    const g = game;
    if (m.state === 'sleep' || m.state === 'wake' || m.state === 'dying') return;
    const stuck = m.state === 'stuck';
    const dmg = Math.max(1, Math.round(damage * (stuck ? AVE.stuck : AVE.armorAir)));
    m.hp -= dmg; m.hurtTimer = 0.14;
    for (let i = 0; i < (stuck ? 7 : 3); i++) skyParticle(g, { x: clamp(fromX, m.x, m.x + m.w), y: m.cy + (Math.random() - 0.5) * 20, vx: (Math.random() - 0.5) * 160, vy: -Math.random() * 120, life: 0.6, maxLife: 0.6, color: i & 1 ? '#c8d2e6' : '#3a4670', w: 2, h: 1, gravity: 120 });
    if (!stuck && !m.airHint) { m.airHint = true; toast('No ar as penas seguram o golpe. Espere ela mergulhar e cravar o bico!'); }
    if (m.hp <= 0) {
      m.hp = 1; m.state = 'dying'; m.stateT = 0;
      playSfx('aveDeath', m.cx, m.cy); g.shake = 10;
      g.aveStrikes = []; g.aveBlades = [];
      for (const o of g.mobs) if (o.aveGuard) o.despawn = true;
    }
  },
  defeated(g, m) {
    g.aveStrikes = []; g.aveBlades = [];
    const s = storyState(g); s.skyCalmed = true;
    toast('A TEMPESTADE SE DESFAZ. O céu dos Vigias voltou a ser caminho.');
    const n = g.world.skyNest;
    if (n) setTimeout(() => storySay(g, n.cx * T, (n.floor - 6) * T, 'Ninho da Tempestade', 'No fundo do ninho, entre as penas, um sino de bronze dos Vigias. Gravado nele: "Quem vence o trovão, voa com ele."', 8), 2400);
    Music.victory();
    return true;
  },
  goHome(g, m) {
    g.aveStrikes = []; g.aveBlades = [];
    for (const o of g.mobs) if (o.aveGuard) o.despawn = true;
    SHAPE_HOOKS.thunderbird.setup(m);
    m.hp = m.def.hp; m.hurtTimer = 0;
    const h = aveHome(g.world,m); m.x = h.x - m.w / 2; m.y = h.y - m.h;
    if (g.boss === m) g.boss = null;
  },
  draw(ctx, m) {
    const tilt = aveTilt(m);
    const frame = wildlifeFrame(m), spr = wildlifeSprite(m.kind, frame), img = m.hurtTimer > 0 ? spr.hurt : spr.normal;
    const a = aveAnchor(m, frame);
    ctx.save();
    ctx.translate(Math.round(a.x), Math.round(a.y));
    ctx.scale(m.facing < 0 ? -1 : 1, 1);
    if (tilt) ctx.rotate(tilt);
    ctx.drawImage(img, -a.ax, -a.ay);
    ctx.restore();
    if (m.state === 'sleep') { // zzz
      const k = (m.clock * 0.6) % 1, zx = Math.round(m.cx + m.facing * 44 + k * 6), zy = Math.round(m.y - 34 - k * 16);
      ctx.globalAlpha = 1 - k; ctx.fillStyle = '#e6eef8';
      ctx.fillRect(zx, zy, 5, 1); ctx.fillRect(zx + 3, zy + 1, 1, 1); ctx.fillRect(zx + 2, zy + 2, 1, 1); ctx.fillRect(zx + 1, zy + 3, 1, 1); ctx.fillRect(zx, zy + 4, 5, 1);
      ctx.globalAlpha = 1;
    }
  },
};

// Onde o sprite encosta no bicho: no ar o centro do corpo vai no centro dele; pousada, dormindo
// ou presa, a linha dos pés vai no chão (m.y + m.h)
function aveAnchor(m, frame) {
  const ground = frame === 10 || frame === 11 || frame === 13 || (frame >= 26 && frame <= 29);
  return ground ? { x: m.cx, y: m.y + m.h, ax: AVE_ART.BODY[0], ay: AVE_ART.FEET }
    : { x: m.cx, y: m.cy, ax: AVE_ART.BODY[0], ay: AVE_ART.BODY[1] };
}
// Olho no mundo (para o brilho que sai depois da luz)
function aveEyeWorld(m) {
  const frame = wildlifeFrame(m), a = aveAnchor(m, frame), e = AVE_EYES[frame];
  if (!e) return null;
  const dx = e[0] - a.ax, dy = e[1] - a.ay, tilt = aveTilt(m), c = Math.cos(tilt), s = Math.sin(tilt);
  return [Math.round(a.x) + (dx * c - dy * s) * (m.facing < 0 ? -1 : 1), Math.round(a.y) + dx * s + dy * c];
}
function aveTilt(m) {
  if (m.state === 'dive' && m.diveTo) return Math.atan2(m.diveTo[1] - m.cy, Math.abs(m.diveTo[0] - m.cx)) * 0.6;
  if (m.state === 'dying') return 0.2 + Math.sin(m.stateT * 9) * 0.08;
  if (m.state === 'soar') return Math.sin(m.t * 0.9) * 0.055;
  if (m.state === 'stuck') return Math.sin(m.stateT * 22) * 0.018;
  return 0;
}

// ---------- Raios ----------
function aveBolts(g, m, n, p) {
  const k = aveEnraged(m) ? 5 : 3, list = (g.aveStrikes ??= []);
  for (let i = 0; i < k; i++) {
    const x = clamp(p.cx + (i - (k - 1) / 2) * 4.5 * T + (Math.random() - 0.5) * T, (n.x0 + 2) * T, (n.x1 - 2) * T);
    list.push({ x, t: 0, warn: AVE.warn + i * 0.12, floor: n.floor * T, hit: false });
  }
  playSfx('crackle', p.cx, p.cy);
}
// Raio caindo em x: estraga quem está embaixo (o jogador e, se `wild`, só enfeite)
function aveStrike(g, n, x, wild = false) {
  const floor = n.floor * T, top = floor - 44 * T;
  const path = aveBoltPath(x, top, floor);
  const branches = [0.3, 0.55, 0.75].map((k, i) => {
    const at = path[Math.floor((path.length - 1) * k)], end = at[1] + 40 + i * 12;
    return aveBoltPath(at[0] + (i & 1 ? -26 : 26), at[1], Math.min(floor, end)).map((p, j) => j ? p : at);
  });
  (g.aveBolts ??= []).push({ path, branches, life: 0.32 });
  (g.aveImpacts ??= []).push({ x, y: floor, age: 0, life: 0.45 });
  g.skyFlash = Math.max(g.skyFlash ?? 0, wild ? 0.25 : 0.55);
  playSfx('thunder', x, floor, { vol: wild ? 0.5 : 1 });
  for (let i = 0; i < 10; i++) skyParticle(g, { x, y: floor - 2, vx: (Math.random() - 0.5) * 200, vy: -Math.random() * 220, life: 0.5, maxLife: 0.5, color: i & 1 ? '#bff4ff' : '#ffffff', w: 2, h: 2, gravity: 400 });
  if (wild) return;
  const p = g.player;
  if (!g.adminGod && Math.abs(p.cx - x) < 1.2 * T && p.y + p.h > top && p.y < floor + 4 && p.invulnerable <= 0) damageMonsterPlayer(g, AVE.bolt, x);
}
function aveBoltPath(x, top, bottom) {
  const pts = [[x + (Math.random() - 0.5) * 30, top]];
  for (let y = top; y < bottom;) { y = Math.min(bottom, y + 10 + Math.random() * 18); pts.push([x + (Math.random() - 0.5) * (y < bottom - 4 ? 22 : 0), y]); }
  return pts;
}
function updateAveHazards(g, m, dt, w, p) {
  const n = m.manualArena || w.skyNest;
  const strikes = g.aveStrikes || [];
  for (let i = strikes.length - 1; i >= 0; i--) {
    const s = strikes[i]; s.t += dt;
    if (s.t < s.warn) { if (Math.random() < dt * 14) skyParticle(g, { x: s.x + (Math.random() - 0.5) * 12, y: s.floor - 2, vx: 0, vy: -30 - Math.random() * 40, life: 0.3, maxLife: 0.3, color: '#bff4ff', w: 1, h: 2, gravity: 0 }); continue; }
    aveStrike(g, n, s.x); strikes.splice(i, 1);
  }
  const blades = g.aveBlades || [];
  for (let i = blades.length - 1; i >= 0; i--) {
    const b = blades[i];
    (b.trail ??= []).unshift([b.x, b.y]); b.trail.length = Math.min(b.trail.length, 6);
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt; b.rot += dt * 10;
    if (p.invulnerable <= 0 && !g.adminGod && b.x > p.x - 3 && b.x < p.x + p.w + 3 && b.y > p.y && b.y < p.y + p.h) { damageMonsterPlayer(g, AVE.blade, b.x); blades.splice(i, 1); continue; }
    if (b.life <= 0 || w.isSolid(Math.floor(b.x / T), Math.floor(b.y / T))) blades.splice(i, 1);
  }
}

// ---------- Lança-Trovão: o terceiro golpe chama um raio ----------
{
  const baseHit = beetleOnSwordHit;
  beetleOnSwordHit = (g, s, mob) => {
    baseHit(g, s, mob);
    const rule = ITEM_DEFS[s.item]?.raio;
    if (!rule || !mob) return;
    const now = g.clock || 0;
    if (now - (g.spearT ?? -9) > 2.5) g.spearN = 0;
    g.spearT = now;
    if (++g.spearN < rule.cada) return;
    g.spearN = 0;
    const top = mob.cy - 30 * T;
    (g.aveBolts ??= []).push({ path: aveBoltPath(mob.cx, top, mob.y + mob.h), life: 0.28 });
    g.skyFlash = Math.max(g.skyFlash ?? 0, 0.3);
    playSfx('thunder', mob.cx, mob.cy, { vol: 0.6 });
    for (const o of g.mobs) if (o !== mob && !o.dead && o.hostile && Math.hypot(o.cx - mob.cx, o.cy - mob.cy) < rule.alcance * T) o.hit(rule.dano, mob.cx);
    if (!mob.dead) mob.hit(rule.dano, g.player.cx);
  };
}

// ---------- Desenho dos raios, penas e aviso do mergulho (espaço do mundo, depois da luz) ----------
function drawAveWorld(ctx, g) {
  const t = g.clock || 0;
  ctx.save();
  for (const s of g.aveStrikes || []) {
    // aviso: coluna fina tremendo e faíscas no chão
    const k = s.t / s.warn, a = 0.15 + k * 0.5 * (0.6 + Math.sin(t * 40) * 0.4);
    ctx.fillStyle = `rgba(170,240,255,${a * 0.35})`; ctx.fillRect(Math.round(s.x - 6), s.floor - 40 * T, 12, 40 * T);
    ctx.fillStyle = `rgba(230,255,255,${a})`; ctx.fillRect(Math.round(s.x - 1), s.floor - 40 * T, 2, 40 * T);
    ctx.fillStyle = `rgba(200,250,255,${0.5 + k * 0.5})`;
    for (let i = 0; i < 4; i++) ctx.fillRect(Math.round(s.x - 8 + i * 5 + Math.sin(t * 30 + i) * 2), s.floor - 3 - ((i * 3 + Math.floor(t * 20)) % 5), 2, 2);
    // A marca cobre a largura perigosa do raio.
    const radius = 1.2 * T;
    ctx.fillStyle = `rgba(108,218,255,${0.15 + k * 0.2})`; ctx.fillRect(s.x - radius, s.floor - 5, radius * 2, 5);
    ctx.strokeStyle = `rgba(191,244,255,${0.5 + k * 0.5})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(s.x, s.floor - 2, radius, 5 + (1 - k) * 6, 0, 0, Math.PI * 2); ctx.stroke();
  }
  const bolts = g.aveBolts || [];
  for (let i = bolts.length - 1; i >= 0; i--) {
    const b = bolts[i];
    const a = clamp(b.life / 0.3, 0, 1);
    for (const [wd, col] of [[7, `rgba(120,200,255,${0.25 * a})`], [3, `rgba(190,240,255,${0.7 * a})`], [1, `rgba(255,255,255,${a})`]]) {
      ctx.strokeStyle = col; ctx.lineWidth = wd; ctx.beginPath();
      b.path.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.stroke();
    }
    ctx.strokeStyle = `rgba(191,244,255,${a * 0.6})`; ctx.lineWidth = 1;
    for (const branch of b.branches || []) { ctx.beginPath(); branch.forEach(([x, y], k) => k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); }
  }
  for (const b of g.aveBlades || []) {
    for (let i = 0; i < (b.trail || []).length; i++) {
      ctx.fillStyle = `rgba(126,222,255,${0.3 * (1 - i / 6)})`;
      ctx.fillRect(b.trail[i][0] - 5, b.trail[i][1] - 1, 10, 2);
    }
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(Math.atan2(b.vy, b.vx));
    ctx.fillStyle = '#26304e'; ctx.fillRect(-7, -1, 14, 3);
    ctx.fillStyle = '#c8d2e6'; ctx.fillRect(-6, -1, 11, 1);
    ctx.fillStyle = '#bff4ff'; ctx.fillRect(5, -1, 3, 2);
    ctx.fillStyle = '#edfaff';
    ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(7, -4); ctx.lineTo(14, 0); ctx.lineTo(7, 3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#4c7da4'; ctx.fillRect(-8, 0, 20, 1);
    ctx.fillStyle = '#c8a450'; ctx.fillRect(-12, 0, 4, 1);
    ctx.restore();
  }
  // linha tracejada do mergulho
  const m = g.mobs.find((o) => o.kind === 'thunderbird' && o.state === 'screech' && o.diveTo);
  if (m) {
    const [tx, ty] = m.diveTo, d = Math.hypot(tx - m.cx, ty - m.cy), n = Math.floor(d / 10);
    ctx.fillStyle = `rgba(255,220,120,${0.4 + Math.sin(t * 20) * 0.2})`;
    for (let i = 0; i < n; i += 2) ctx.fillRect(Math.round(lerp(m.cx, tx, i / n)) - 1, Math.round(lerp(m.cy, ty, i / n)) - 1, 3, 3);
    const radius = m.w / 2 - 10;
    ctx.fillStyle = `rgba(255,185,70,${m.diveLocked ? 0.28 : 0.12})`; ctx.fillRect(tx - radius, ty - 5, radius * 2, 5);
    ctx.strokeStyle = m.diveLocked ? '#ffe4a0' : 'rgba(255,220,120,0.65)'; ctx.lineWidth = m.diveLocked ? 2 : 1;
    ctx.beginPath(); ctx.ellipse(tx, ty - 3, radius, 9, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#ffe4a0'; for (const side of [-1, 1]) { ctx.fillRect(tx + side * radius - 1, ty - 15, 2, 12); }
  }
  for (const o of g.mobs) if (o.kind === 'thunderbird' && !o.dead) {
    if (o.state === 'dive') for (let i = 0; i < (o.diveTrail || []).length; i++) {
      const p = o.diveTrail[i]; ctx.strokeStyle = `rgba(150,230,255,${0.4 * (1 - i / 8)})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(p.x - 18, p.y - 12); ctx.lineTo(p.x + 18, p.y + 12); ctx.stroke();
    }
    if (o.state === 'bolts' || o.state === 'gust' || (aveEnraged(o) && o.state === 'soar')) {
      const charge = o.state === 'bolts', radius = charge ? 54 + Math.sin(o.stateT * 7) * 5 : 40;
      ctx.strokeStyle = `rgba(139,228,255,${charge ? 0.7 : 0.35})`; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i <= 16; i++) { const angle = i / 16 * Math.PI * 2 + t * 2, r = radius + Math.sin(i * 4 + Math.floor(t * 12)) * 5;
        const x = o.cx + Math.cos(angle) * r, y = o.cy + Math.sin(angle) * r * 0.55; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
      ctx.stroke();
    }
    if (o.state === 'gust') {
      ctx.strokeStyle = 'rgba(202,238,255,0.3)'; ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) { const d = ((o.stateT * 330 + i * 67) % 360), x = o.cx + o.gustDir * d, y = o.cy + Math.sin(t * 7 + i) * 18 + (i - 2) * 16;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + o.gustDir * 24, y - 8, x + o.gustDir * 50, y); ctx.stroke(); }
    }
  }
  for (const impact of g.aveImpacts || []) {
    const k = impact.age / impact.life;
    ctx.strokeStyle = `rgba(190,239,255,${(1 - k) * 0.8})`; ctx.lineWidth = 2 * (1 - k) + 0.5;
    ctx.beginPath(); ctx.ellipse(impact.x, impact.y - 2, 12 + k * 70, 3 + k * 12, 0, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

// ---------- Depois da luz, em pixels da tela: o olho aceso, o clarão e a tempestade ----------
const AVE_EYE_GLOW = (() => {
  const c = makeCanvas(96, 96), g = c.getContext('2d'), gr = g.createRadialGradient(48, 48, 0, 48, 48, 48);
  gr.addColorStop(0, 'rgba(255,240,170,0.75)'); gr.addColorStop(0.3, 'rgba(255,210,90,0.25)'); gr.addColorStop(1, 'rgba(255,190,60,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 96, 96);
  return c;
})();
function drawAveAccents(ctx, g, ox, oy, z) {
  const W = ctx.canvas.width, H = ctx.canvas.height, m = g.boss?.kind==='thunderbird'?g.boss:g.mobs.find((o) => o.kind === 'thunderbird' && !o.dead), n = m?.manualArena || g.world.skyNest;
  ctx.save(); ctx.imageSmoothingEnabled = true;
  // tempestade em volta do ninho enquanto ela luta (mais forte na fúria)
  const fight = m && m.state !== 'sleep' && n && Math.abs(g.player.cx / T - n.cx) < n.R + 40;
  if (g.aveStorm > 0.02) {
    ctx.fillStyle = `rgba(20,24,44,${0.28 * g.aveStorm})`; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = `rgba(190,210,240,${0.35 * g.aveStorm})`; ctx.lineWidth = 1;
    const t = performance.now() / 1000;
    ctx.beginPath();
    for (let i = 0; i < 90 * g.aveStorm; i++) {
      const x = (i * 97.13 + t * 600 * (1 + (i % 3) * 0.2)) % (W + 100) - 50, y = (i * 61.7 + t * 900) % (H + 60) - 30;
      ctx.moveTo(x, y); ctx.lineTo(x - 6, y + 16);
    }
    ctx.stroke();
  }
  // olho aceso
  if (m) {
    const eye = m.state === 'sleep' || m.state === 'dying' ? null : aveEyeWorld(m); // dormindo o olho está fechado
    if (eye) {
      const sx = eye[0] * z - ox, sy = eye[1] * z - oy, sz = (m.state === 'stuck' ? 40 : 56) * z;
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.85;
      ctx.drawImage(AVE_EYE_GLOW, sx - sz / 2, sy - sz / 2, sz, sz);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
  }
  // clarão do raio
  if ((g.skyFlash ?? 0) > 0.01) {
    ctx.fillStyle = `rgba(220,235,255,${g.skyFlash * 0.45})`; ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
}

BOSS_BARS.thunderbird = (m) => {
  const rage = aveEnraged(m), stuck = m.state === 'stuck', dying = m.state === 'dying';
  return {
    label: 'OLHO DA TEMPESTADE' + (dying ? ' · CAINDO' : stuck ? ' · PRESA!' : rage ? ' · TEMPESTADE' : ''),
    text: stuck ? '#ffe9a0' : rage ? '#bff4ff' : UIC.text,
    fill: m.hurtTimer > 0 ? '#ffffff' : stuck ? '#f0c040' : '#6f8ad0',
    back: '#0c1020', mark: rage ? '#bff4ff' : '#33406a',
  };
};

// ---------- Ícones ----------
Object.assign(ITEM_ART, {
  [ITEM.STORM_EYE]: {
    cores: { k: [10, 12, 24], a: [30, 38, 64], b: [60, 74, 116], y: [250, 210, 90], Y: [255, 246, 190], o: [200, 150, 40], e: [170, 240, 255] },
    pixels: ['................', '.....kkkkkk.....', '...kkaabbaakk...', '..kaabbbbbbaak..', '.kabbooyyoobbak.', '.kabooyYYyoobak.', 'kabboyYkkYyobbak', 'kabboyykkyyobbak',
      'kabboyYkkYyobbak', '.kabooyyyyoobak.', '.kabbooyyoobbak.', '..kaabbbbbbaak..', '...kkaabbaakk.e.', '.....kkkkkk..ee.', '............e...', '................'],
  },
  [ITEM.STORM_WINGS]: {
    cores: { k: [10, 12, 24], a: [40, 48, 80], b: [74, 88, 130], c: [130, 146, 190], e: [170, 240, 255], y: [240, 200, 70] },
    pixels: ['................', 'k.............k.', 'ek...........ke.', 'kak.........kak.', 'kbak.......kabk.', 'kcbak.....kabck.', '.kcbak...kabck..', '.kccbakykabcck..',
      '..kccbyyybcck...', '..kcccbybccck...', '...kccbbbcck....', '...kkcbbbckk....', '....kkcbckk.....', '.....kkkkk......', '................', '................'],
  },
  [ITEM.THUNDER_SPEAR]: {
    cores: { k: [14, 14, 22], y: [250, 210, 90], o: [200, 150, 40], e: [170, 240, 255], E: [240, 255, 255], h: [70, 82, 114], H: [116, 130, 162] },
    pixels: ['..............kk', '.............kEk', '............kEek', '...........keEk.', '..........kyek..', '.........kyok...', '........kHhk....', '.......kHhk.....',
      '......kHhk......', '.....kHhk.......', '....kHhk........', '...kHhk.........', '..kooh..........', '.kyok...........', 'kyok............', 'kk..............'],
  },
});

// ---------- Ligações: nasce com o mundo, desenha e lê o mural ----------
{
  const baseSky = updateSky;
  updateSky = (g, dt) => {
    const w = g.world;
    if (w.skyNest && !storyState(g).skyCalmed && !g.mobs.some((m) => m.kind === 'thunderbird')) spawnAve(g);
    baseSky(g, dt);
    // Efeitos expiram no relógio do jogo; desenhar não avança a simulação.
    for (const b of g.aveBolts || []) b.life -= dt;
    if (g.aveBolts?.length) g.aveBolts = g.aveBolts.filter((b) => b.life > 0);
    for (const impact of g.aveImpacts || []) impact.age += dt;
    if (g.aveImpacts?.length) g.aveImpacts = g.aveImpacts.filter((impact) => impact.age < impact.life);
    g.skyFlash = (g.skyFlash || 0) * Math.exp(-9 * dt);
    const m = g.boss?.kind==='thunderbird'?g.boss:g.mobs.find((o) => o.kind === 'thunderbird' && !o.dead), n = m?.manualArena || w.skyNest;
    const fight = m && !['sleep', 'dying'].includes(m.state) && n && Math.abs(g.player.cx / T - n.cx) < n.R + 40;
    g.aveStorm = lerp(g.aveStorm || 0, fight ? (aveEnraged(m) ? 1 : 0.55) : 0, 1 - Math.exp(-1.2 * dt));
  };
  const baseWorld = drawSkyWorld;
  drawSkyWorld = (ctx, g) => { baseWorld(ctx, g); drawAveWorld(ctx, g); };
  const baseAccents = drawSkyAccents;
  drawSkyAccents = (ctx, g, ox, oy, z) => { baseAccents(ctx, g, ox, oy, z); if (g.world.skyNest||g.boss?.kind==='thunderbird') drawAveAccents(ctx, g, ox, oy, z); };
}

// Mural do observatório e as inscrições das Pedras dos Ventos (botão direito)
const SKY_MURAL = 'Pintado na parede: os Vigias de pé nas nuvens, olhando uma estrela cair na ilha. Embaixo, gravado: "Do alto vimos a estrela. Do alto guardaremos a ilha. Quem subir com o vento, respeite o Olho da Tempestade."';
const SKY_STONE_TEXT = 'Três Pedras dos Ventos lado a lado despertam a corrente. Fique no círculo e deixe o céu te levar. Segure S para descer. Obstáculos acima limitam a subida.';
{
  const baseInteract = storyInteract;
  storyInteract = (g, m, rightPressed) => {
    if (rightPressed) {
      const w = g.world, p = g.player;
      const near = (x, y, r = 5) => Math.hypot(x - p.cx, y - p.cy) < r * T && Math.abs(m.x - x) < 2.5 * T && Math.abs(m.y - y) < 2.5 * T;
      const mural = w.skyObservatory?.mural;
      if (mural && near((mural.x + 0.5) * T, mural.y * T)) { storySay(g, (mural.x + 0.5) * T, (mural.y - 2) * T, 'Mural dos Vigias', SKY_MURAL, 10); return true; }
      for (const s of w.skyStones || []) if (near((s.x + 0.5) * T, (s.y - 1) * T, 6)) { storySay(g, (s.x + 0.5) * T, (s.y - 4) * T, 'Pedra dos Ventos', SKY_STONE_TEXT, 7); return true; }
    }
    return baseInteract(g, m, rightPressed);
  };
}
