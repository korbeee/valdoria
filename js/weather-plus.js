'use strict';

// =====================================================================================
//  CLIMA DE VERDADE — o que cada camada do tempo FAZ (js/weather.js decide quais estão no céu)
// =====================================================================================
//   • Vendaval  empurra quem está ao ar livre; riscos de vento cruzam a tela
//   • Raios     de vez em quando um cai perto: o chão estala antes (aviso), o raio desce, queima,
//               derruba árvore e machuca. Segurar ferro ao ar livre atrai o raio
//   • Tornado   nuvem-parede girando, funil com listras em espiral, poeira e destroços na base.
//               Anda pelo chão, PUXA e ARREMESSA o jogador, bichos e itens, derruba árvores,
//               arranca mato e enfeites soltos. Debaixo de um teto (ou na caverna) não pega
//   • Granizo   pedras de gelo quicando no chão; ao ar livre machuca
//   • Neblina   véu que esconde o longe
// Tudo respeita a "exposição": a ilha do céu fora da tela não abriga, teto e caverna abrigam.

const WX = {
  windPushFrom: 55, windPush: 55,
  strikeChance: 0.5, strikeWarn: 0.65, strikeDamage: 24, strikeRadius: 26, metalPull: 0.45,
  tornado: { height: 26 * T, topR: 120, bottomR: 17, pullR: 9 * T, coreR: 2 * T, lift: 360, spin: 140, fling: 430, speed: 55, damage: 3, tick: 0.7 },
  hailTick: 0.9, hailDamage: 2,
};

Object.assign(SFX, {
  tornadoRoar(A, o, { vol = 1 } = {}) { N(A, o, { freq: 90, dur: 1.4, gain: 0.7 * vol, brown: true, attack: 0.3 }); N(A, o, { type: 'bandpass', freq: 380, freqEnd: 260, q: 0.7, dur: 1.3, gain: 0.25 * vol, attack: 0.2 }); },
  hailTap(A, o) { Tn(A, o, { freq: 2600 + Math.random() * 900, freqEnd: 1800, dur: 0.04, gain: 0.05 }); },
  strikeCrack(A, o) { N(A, o, { type: 'highpass', freq: 1800, dur: 0.35, gain: 0.9 }); N(A, o, { freq: 120, dur: 0.9, gain: 0.9, brown: true }); Tn(A, o, { freq: 70, freqEnd: 30, dur: 0.8, gain: 0.6 }); },
  strikeBuzz(A, o) { N(A, o, { type: 'bandpass', freq: 3200, q: 4, dur: 0.6, gain: 0.12, attack: 0.4 }); },
});

const wxExposed = (g, x, y) => environmentExposure(g.world, x, y) > 0.4;
const wxPart = (g, p) => { if (g.particles.length < 470) g.particles.push(p); };

// ---------- Letreiro: avisa quando o céu muda ----------
function weatherAnnounce(g) {
  const w = g.weather;
  if (!w || g.intro?.active || w.event === 'calm') return;
  const label = weatherLabel(w);
  if (label === w.lastLabel) return;
  w.lastLabel = label;
  if (typeof toast === 'function') toast('Clima: ' + label + ((w.mix?.tornado || 0) > 0 && w.funnel ? ' — um tornado se formou ' + (w.funnel.x > g.player.cx ? 'a leste!' : 'a oeste!') : ''));
}

// =====================================================================================
//  RAIOS
// =====================================================================================
// Onde o raio toca: a superfície da água, se há mar, lago ou rio embaixo, senão o teto de verdade (árvore, telhado, chão)
function strikeSpot(world, tx) {
  const base = typeof funnelBase === 'function' ? funnelBase(world, tx) : null;
  if (base?.water) return { y: base.y, ty: Math.floor(base.y / T), water: true };
  const ty = weatherCeiling(world, tx);
  return { y: ty * T, ty, water: false };
}
function weatherLightning(g) {
  const w = g.weather, p = g.player, world = g.world;
  if (Math.random() > WX.strikeChance * (0.6 + w.lightning * 0.6)) return;
  const held = ITEM_DEFS[g.inventory.slots[g.selected]?.item];
  const metal = held && (held.nivel === 2 || /ferro|metal|magnetita/i.test(held.name));
  let x;
  if (metal && wxExposed(g, p.cx, p.y) && Math.random() < WX.metalPull) x = p.cx;
  else {
    x = p.cx + (Math.random() - 0.5) * Math.min(1400, canvas.width / g.zoom * 1.4);
    // prefere o ponto mais alto ali perto (copa de árvore)
    const tx0 = Math.floor(x / T);
    let best = tx0, bestY = Infinity;
    for (let dx = -4; dx <= 4; dx++) {
      const tx = clamp(tx0 + dx, 1, world.w - 2), y = strikeSpot(world, tx).y / T;
      if (y < bestY - 1) { bestY = y; best = tx; }
    }
    x = (best + 0.5) * T;
  }
  const tx = clamp(Math.floor(x / T), 1, world.w - 2), spot = strikeSpot(world, tx), ty = spot.ty;
  if (!weatherExposed(world, x, spot.y - 2)) return;
  (w.strikes ??= []).push({ x, y: spot.y, tx, ty, t: 0, warn: WX.strikeWarn, bolt: null, hit: false, water: spot.water });
  playSfx('strikeBuzz', x, ty * T);
  if (metal && Math.abs(x - p.cx) < 4 && !g.metalHint) { g.metalHint = true; toast('O ferro na sua mão está atraindo os raios! Guarde-o ou se abrigue.'); }
}
function makeBolt(x0, y0, x1, y1) {
  const segs = [], n = 16;
  let px = x0, py = y0;
  for (let i = 1; i <= n; i++) {
    const t = i / n, nx = i === n ? x1 : lerp(x0, x1, t) + (Math.random() - 0.5) * 28 * (1 - t * 0.6), ny = lerp(y0, y1, t);
    segs.push([px, py, nx, ny, 1]);
    if (i > 3 && i < n - 2 && Math.random() < 0.28) { // galho
      let bx = nx, by = ny;
      const dir = Math.random() < 0.5 ? -1 : 1;
      for (let k = 0; k < 4; k++) { const ex = bx + dir * (6 + Math.random() * 12), ey = by + 10 + Math.random() * 14; segs.push([bx, by, ex, ey, 0]); bx = ex; by = ey; }
    }
    px = nx; py = ny;
  }
  return segs;
}
function updateStrikes(g, dt) {
  const w = g.weather, list = w.strikes;
  if (!list?.length) return;
  const p = g.player, world = g.world;
  for (let i = list.length - 1; i >= 0; i--) {
    const s = list[i];
    s.t += dt;
    if (s.t < s.warn) { // o chão estala antes
      if (Math.random() < dt * 30) wxPart(g, { x: s.x + (Math.random() - 0.5) * 14, y: s.y - 1, vx: (Math.random() - 0.5) * 30, vy: -60 - Math.random() * 60, life: 0.25, maxLife: 0.25, color: '#dfe8ff', w: 1, h: 1, gravity: 0 });
      continue;
    }
    if (!s.hit) {
      s.hit = true;
      s.bolt = makeBolt(s.x + (Math.random() - 0.5) * 60, g.cam.y - 30, s.x, s.y);
      w.flash = 1; g.shake = Math.max(g.shake, 5);
      g.crashAudio?.thunder(0.02, 1);
      playSfx('strikeCrack', s.x, s.y);
      for (let k = 0; k < 26; k++) wxPart(g, { x: s.x, y: s.y - 2, vx: (Math.random() - 0.5) * 320, vy: -Math.random() * 260, life: 0.5 + Math.random() * 0.4, maxLife: 0.9, color: k % 3 ? '#ffe9a0' : '#ffffff', w: 1 + (k & 1), h: 1, gravity: 600 });
      // quem estava em cima do ponto leva o choque
      if (!g.adminGod && p.invulnerable <= 0 && Math.abs(p.cx - s.x) < WX.strikeRadius && p.y + p.h > s.y - 3 * T && p.y < s.y + T && wxExposed(g, p.cx, p.y))
        damageMonsterPlayer(g, WX.strikeDamage, s.x, { death: 'Atingido por um raio.' });
      for (const m of g.mobs) if (!m.dead && !m.boss && Math.abs(m.cx - s.x) < WX.strikeRadius + m.w / 2 && Math.abs(m.y + m.h - s.y) < 3 * T) m.hit(30, s.x);
      // árvore atingida tomba inteira
      for (let dx = -1; dx <= 1; dx++) {
        const tx = s.tx + dx, ground = world.groundTop(tx);
        if (world.getTile(tx, ground - 1) === TILE.TRUNK && treeIsWhole(world, tx, ground - 1)) { startTreeFall(g, tx, ground - 1); break; }
      }
      if (s.water) { if (typeof shockWater === 'function') shockWater(g, s); }   // na água: a descarga se espalha (js/water-shock.js)
      else {
        (w.scorches ??= []).push({ x: s.x, y: s.y, t: 0 });
        if (w.scorches.length > 12) w.scorches.shift();
      }
    }
    if (s.t > s.warn + 0.32) list.splice(i, 1);
  }
  for (let i = (w.scorches?.length ?? 0) - 1; i >= 0; i--) if ((w.scorches[i].t += dt) > 25) w.scorches.splice(i, 1);
}

// =====================================================================================
//  TORNADO
// =====================================================================================
const TORNADO_RIP = new Set([TILE.LEAVES, TILE.COBWEB, TILE.IVY, TILE.FLOWER_POT, TILE.FENCE, TILE.CANDLE, TILE.RUBBLE, TILE.SKULL_STAKE].filter((t) => t != null));
function updateTornado(g, f, dt) {
  const C = WX.tornado, world = g.world, p = g.player, s = f.strength;
  f.radius = C.topR; f.height = C.height;
  // anda pelo chão: escolhe um ponto perto do jogador (não persegue, vagueia) e vai até lá com inércia
  f.retarget = (f.retarget ?? 0) - dt;
  if (f.retarget <= 0 || f.tx == null) { f.retarget = 6 + Math.random() * 6; f.tx = p.cx + (Math.random() - 0.5) * 60 * T; }
  const want = Math.sign(f.tx - f.x) * C.speed * (0.6 + 0.4 * s) + (g.weather.wind || 0) * 0.15;
  f.vx = (f.vx ?? 0) + (want - (f.vx ?? 0)) * Math.min(1, dt * 0.6);
  f.x = clamp(f.x + f.vx * dt, T * 5, (world.w - 5) * T);
  if (s < 0.25) return;
  // ronco do tornado
  if ((f.roar = (f.roar ?? 0) - dt) <= 0) { f.roar = 1.1; playSfx('tornadoRoar', f.x, f.y - 60, { vol: Math.min(1, s) }); }
  const cloudBase = f.y - C.height;
  // puxa, levanta, gira e arremessa quem está ao ar livre
  const affect = (b, isPlayer) => {
    if (b.boss || b.dead || b.y + b.h < cloudBase) return;
    const dx = b.cx - f.x, ad = Math.abs(dx);
    if (ad > C.pullR || !wxExposed(g, b.cx, b.y + 2)) { if (b.inTornado) b.inTornado = 0; return; }
    const pull = Math.pow(1 - ad / C.pullR, 1.5) * 260 * s;
    b.moveX(-Math.sign(dx || 1) * pull * dt, world);
    if (ad < C.coreR + C.bottomR) {
      b.inTornado = (b.inTornado || 0) + dt;
      b.vy = Math.min(b.vy, -C.lift * (0.7 + 0.3 * s));
      b.onGround = false;
      b.moveX(Math.sin(f.age * 7 + (b.spinPh ??= Math.random() * 6)) * C.spin * dt, world);
      if (isPlayer && (g.tornadoHurt = (g.tornadoHurt ?? 0) - dt) <= 0 && !g.adminGod) { g.tornadoHurt = C.tick; damageMonsterPlayer(g, C.damage, f.x, { pierce: true, death: 'Levado pelo tornado.' }); }
      if (b.inTornado > 1.4 || b.y < f.y - C.height * 0.45) { // arremessado para fora
        b.flingVx = (Math.random() < 0.5 ? -1 : 1) * C.fling * (0.7 + 0.3 * s); b.vy = -260; b.inTornado = 0;
        if (isPlayer && !g.tornadoHint) { g.tornadoHint = true; toast('O tornado te arremessou! Fique longe do funil ou se abrigue debaixo de um teto.'); }
      }
    } else if (b.inTornado) b.inTornado = 0;
  };
  affect(p, true);
  for (const m of g.mobs) if (Math.abs(m.cx - f.x) < C.pullR + 40) affect(m, false);
  // itens soltos no chão são sugados e rodam
  for (const d of g.drops || []) {
    const dx = d.x - f.x, ad = Math.abs(dx);
    if (ad > C.pullR || d.y < cloudBase || !wxExposed(g, d.x, d.y)) continue;
    d.vx = (d.vx || 0) - Math.sign(dx || 1) * 300 * s * dt * 3;
    if (ad < C.coreR + C.bottomR) { d.vy = -300 - Math.random() * 120; d.vx += Math.sin(f.age * 7 + d.x) * 120; d.delay = Math.max(d.delay || 0, 0.4); }
  }
  // o que está bem embaixo do funil: árvore tomba, mato é arrancado, enfeite solto voa
  const cx = Math.floor(f.x / T);
  f.felled ??= new Set();
  for (let tx = f.water ? 0 : cx - 1; tx <= (f.water ? -1 : cx + 1); tx++) {   // sobre a água não há árvore nem mato para arrancar
    if (tx < 2 || tx >= world.w - 2) continue;
    const ground = world.groundTop(tx);
    if (!weatherExposed(world, (tx + 0.5) * T, (ground - 1) * T)) continue;
    if (!f.felled.has(tx) && world.getTile(tx, ground - 1) === TILE.TRUNK && treeIsWhole(world, tx, ground - 1)) { f.felled.add(tx); startTreeFall(g, tx, ground - 1); }
    for (let y = ground - 1; y >= ground - 3; y--) {
      const t = world.getTile(tx, y);
      if (!TORNADO_RIP.has(t) || Math.random() > dt * 3) continue;
      const drop = TILE_DEFS[t].drop;
      world.setTile(tx, y, TILE.AIR);
      if (drop != null) dropItem(g, drop, 1, (tx + 0.5) * T, (y + 0.5) * T, Math.random() < 0.5 ? -1 : 1);
    }
    if (Math.random() < dt * 4 && typeof environmentHarvest === 'function') environmentHarvest(g, tx, ground, false, true); // rastro de mato arrancado
  }
  // terra e folhas voando da base
  if (Math.random() < dt * 30 * s) {
    const a = Math.random() * Math.PI * 2;
    wxPart(g, { x: f.x + Math.cos(a) * 18, y: f.y - 4, vx: Math.cos(a) * 220, vy: -120 - Math.random() * 220, life: 0.9, maxLife: 0.9, color: f.water ? (Math.random() < 0.5 ? '#e4f6ff' : '#9fd4f2') : Math.random() < 0.5 ? '#7a5a3a' : '#5a7a3a', w: 2, h: 1 + (Math.random() < 0.4 ? 1 : 0), gravity: 380 });
  }
}
// o arremesso continua por um tempo (a física do jogador/bicho zera vx todo quadro)
function applyWeatherFling(g, dt) {
  for (const b of [g.player, ...g.mobs]) {
    if (!b.flingVx) continue;
    b.moveX(b.flingVx * dt, g.world);
    b.flingVx *= Math.pow(0.18, dt);
    if (Math.abs(b.flingVx) < 12) b.flingVx = 0;
  }
}

// =====================================================================================
//  GRANIZO, VENDAVAL E ATUALIZAÇÃO GERAL
// =====================================================================================
// Pedra de granizo que cai na água respinga e afunda devagar (px/s), balançando, até sumir
const HAIL_SINK_SPEED = 20;
function hailSplash(g, x, surf) {
  const w = g.weather;
  if (w.splashes.length < 110) w.splashes.push({ x, y: surf, life: 0.32, water: true, hit: true });
  const rings = g.rainRings ??= [];
  if (rings.length < 70) rings.push({ x, y: surf, t: 0, life: 0.7, r: 6 + Math.random() * 4 });
  if (typeof waveImpulse === 'function') waveImpulse(g, x, surf, 11, 4);
  if (typeof waterParticle === 'function') for (let k = 0; k < 3; k++) waterParticle(g, x, surf, (Math.random() - 0.5) * 44, -34 - Math.random() * 40, 0.3);
  if (Math.random() < 0.5) playSfx('hailTap', x, surf);
}
function updateWeatherPlus(g, dt) {
  const w = g.weather, p = g.player, world = g.world;
  if (!w || g.intro?.active) return;
  // Integra o vento: mudar de direção não teleporta a textura da névoa.
  w.fogDrift = (w.fogDrift || 0) + ((w.wind || 0) * 0.18 + 1.5) * dt;
  updateStrikes(g, dt);
  applyWeatherFling(g, dt);
  // vendaval empurra quem está ao ar livre (no ar empurra mais)
  const wind = Math.abs(w.wind || 0);
  // (na tempestade de areia quem empurra é sandMovement; as Botas de Areia seguram o vendaval no chão)
  if (wind > WX.windPushFrom && !g.adminFly && (w.sand || 0) <= 0.15 && !p.climbing) {
    const exp = environmentExposure(world, p.cx, p.y + 2);
    const boots = p.onGround && typeof hasAccessory === 'function' && hasAccessory(g, ITEM.SAND_BOOTS) ? 0.25 : 1;
    if (exp > 0.4) p.moveX(Math.sign(w.wind) * ((wind - WX.windPushFrom) / 55) * WX.windPush * exp * boots * (p.onGround ? 0.6 : 1.4) * dt, world);
  }
  // riscos de vento
  w.streaks ??= [];
  if (wind > 50 && Math.random() < dt * (wind - 45) * 0.35 && w.streaks.length < 40) {
    const x = g.cam.x + Math.random() * canvas.width / g.zoom, y = g.cam.y + Math.random() * canvas.height / g.zoom;
    if (weatherExposed(world, x, y)) w.streaks.push({ x, y, len: 14 + Math.random() * 30, life: 0.5 + Math.random() * 0.4, t: 0 });
  }
  for (let i = w.streaks.length - 1; i >= 0; i--) {
    const s = w.streaks[i];
    s.t += dt; s.x += Math.sign(w.wind || 1) * (wind * 6 + 120) * dt;
    if (s.t > s.life) w.streaks.splice(i, 1);
  }
  // granizo: pedrinhas caindo e quicando; ao ar livre machuca
  w.hailStones ??= [];
  const hail = w.hail || 0, dryHere = world.biomeAt(Math.floor(p.cx / T)) === BIOME.DESERT;
  if (hail > 0.05 && !dryHere) {
    const want = Math.min(160, Math.ceil(hail * 140));
    for (let n = 0; n < 6 && w.hailStones.length < want; n++) {
      const x = g.cam.x + Math.random() * canvas.width / g.zoom, y = g.cam.y - 10 + Math.random() * 40;
      if (world.waterAtPx(x, y)) continue;   // não nasce embaixo d'água
      w.hailStones.push({ x, y, vx: (w.wind || 0) * 1.2, vy: 380 + Math.random() * 140, bounce: 0, life: 3 });
    }
    if (wxExposed(g, p.cx, p.y) && !world.waterAtPx(p.cx, p.y + 3) && (g.hailT = (g.hailT ?? WX.hailTick) - dt) <= 0) {
      g.hailT = WX.hailTick;
      if (Math.random() < 0.55 * hail && !g.adminGod) {
        damageMonsterPlayer(g, WX.hailDamage, p.cx, { pierce: true, death: 'O granizo foi demais.' });
        if (!g.hailHint) { g.hailHint = true; toast('Granizo! Procure um teto para se proteger.'); }
      }
    }
  }
  for (let i = w.hailStones.length - 1; i >= 0; i--) {
    const h = w.hailStones[i];
    if (h.sink) {   // já na água: afunda devagar, como uma pedrinha, balançando de leve até sumir
      h.t += dt; h.vy += (HAIL_SINK_SPEED - h.vy) * Math.min(1, dt * 4); h.vx *= Math.exp(-dt * 5);
      h.x += (h.vx + Math.sin(h.t * 2.4 + h.ph) * 7) * dt; h.y += h.vy * dt; h.life -= dt;
      if (h.life <= 0 || !world.waterAtPx(h.x, h.y) || SOLID[world.getTile(Math.floor(h.x / T), Math.floor(h.y / T))] === 1) w.hailStones.splice(i, 1);
      else if (Math.random() < dt * 1.6 && typeof waterParticle === 'function') waterParticle(g, h.x, h.y - 2, (Math.random() - 0.5) * 6, -14, 0.5);   // bolhinha
      continue;
    }
    if (!h.sink && world.waterAtPx(h.x + h.vx * dt, h.y + (h.vy + 900 * dt) * dt)) {   // bateu na superfície (já olhando o passo seguinte)
      const surf = world.waterSurfacePx(Math.floor(h.x / T), Math.floor(h.y / T)) ?? h.y;
      Object.assign(h, { sink: true, t: 0, ph: Math.random() * 6.28, surf, y: Math.max(h.y, surf), vy: h.vy * 0.12, vx: h.vx * 0.1, life: 9, bounce: 1 });
      hailSplash(g, h.x, surf);
      continue;
    }
    h.vy += 900 * dt; h.x += h.vx * dt; h.y += h.vy * dt; h.life -= dt;
    if (h.vy > 0 && !weatherExposed(world, h.x, h.y)) {
      if (h.bounce >= 1 || world.getTile(Math.floor(h.x / T), Math.floor(h.y / T)) === TILE.AIR) { w.hailStones.splice(i, 1); continue; }
      h.bounce++; h.y -= 2; h.vy = -110 - Math.random() * 60; h.vx = (Math.random() - 0.5) * 80; h.life = 0.6;
      if (Math.random() < 0.08) playSfx('hailTap', h.x, h.y);
    }
    if (h.life <= 0 || h.y > g.cam.y + canvas.height / g.zoom + 20) w.hailStones.splice(i, 1);
  }
}
{
  const baseUpdate = updateWeather;
  updateWeather = (g, dt) => { baseUpdate(g, dt); updateWeatherPlus(g, dt); };
}

// =====================================================================================
//  DESENHO
// =====================================================================================
// Nuvem-parede: a base da tempestade baixa sobre o funil. Por coluna: o fundo é irregular (calombos que
// giram), no meio pende a parede mais funda onde o funil nasce, e para cima a massa vira um domo que se
// dissolve no céu. Pintada pixel a pixel (blocos de 2 px) numa tela à parte, refeita a cada ~1/20 s.
const WX_WALL = { canvas: null, img: null, t: -1, key: '' };
const WX_WALL_UP = 72, WX_WALL_DOWN = 40;
function wxWallCloud(R, t, seed, dusty) {
  const half = Math.ceil(R * 2.7), Wd = half * 2, Hd = WX_WALL_UP + WX_WALL_DOWN;
  const key = R + '|' + dusty;
  if (!WX_WALL.canvas || WX_WALL.key !== key) {
    WX_WALL.canvas = document.createElement('canvas'); WX_WALL.canvas.width = Wd; WX_WALL.canvas.height = Hd;
    WX_WALL.img = WX_WALL.canvas.getContext('2d').createImageData(Wd, Hd);
    WX_WALL.key = key; WX_WALL.t = -1;
  }
  if (Math.abs(t - WX_WALL.t) < 0.05) return WX_WALL.canvas;
  WX_WALL.t = t;
  const px = WX_WALL.img.data; px.fill(0);
  const col = dusty ? [110, 94, 72] : [50, 53, 60];
  const sm = (v) => (v <= 0 ? 0 : v >= 1 ? 1 : v * v * (3 - 2 * v));
  for (let bx = 0; bx < Wd; bx += 2) {
    const x = bx - half, u = Math.abs(x) / half;
    const side = 1 - sm((u - 0.62) / 0.38);                       // pontas somem
    if (side <= 0) continue;
    // fundo da nuvem (y > 0 é para baixo da base): curva para cima nas pontas, parede pendurada no meio
    const hang = Math.max(0, 1 - (x / (R * 1.05)) ** 2);
    const lumps = Math.sin(x * 0.085 + seed + t * 0.9) * 3.5 + Math.sin(x * 0.21 - t * 1.7 + seed * 2) * 2 + Math.sin(x * 0.047 - t * 0.4) * 3;
    const bottom = -14 + 20 * (1 - u) ** 1.4 + hang * hang * 22 + lumps * (0.6 + 0.4 * (1 - u));
    // topo: domo mais alto no meio, derrete no céu
    const domeTop = -(20 + 46 * (1 - u) ** 1.2) + Math.sin(x * 0.06 + seed * 3 + t * 0.5) * 6;
    for (let by = 0; by < Hd; by += 2) {
      const y = by - WX_WALL_UP;
      const below = sm((bottom - y) / 7);                          // borda de baixo macia (7 px)
      if (below <= 0) continue;
      const above = sm((y - domeTop + 22) / 22);                     // some de domeTop até 22 px acima
      const al = below * above * side;
      if (al <= 0.02) continue;
      // sombra: barriga mais escura perto do fundo, faixas girando (em cima vão para um lado, embaixo para o outro)
      const dir = y < 0 ? 1 : -1, depth = clamp((y - domeTop) / Math.max(8, bottom - domeTop), 0, 1);
      const band = Math.sin(x * 0.055 - t * 1.5 * dir + y * 0.32 + seed);
      const grain = ((BAYER4[((by >> 1) & 3) * 4 + ((bx >> 1) & 3)] / 16) - 0.5) * 0.05;
      const lit = (1.12 - depth * 0.3) * (1 + band * 0.06 + grain) * (x < 0 ? 1.03 : 0.97);
      const r = Math.min(255, col[0] * lit) | 0, g = Math.min(255, col[1] * lit) | 0, bl = Math.min(255, col[2] * lit) | 0, A = Math.min(1, al * 1.05) * 242 | 0;
      for (let oy = 0; oy < 2; oy++) for (let ox = 0; ox < 2; ox++) {
        const i = ((by + oy) * Wd + bx + ox) * 4;
        px[i] = r; px[i + 1] = g; px[i + 2] = bl; px[i + 3] = A;
      }
    }
  }
  WX_WALL.canvas.getContext('2d').putImageData(WX_WALL.img, 0, 0);
  return WX_WALL.canvas;
}
const tornadoDusty = (g, f) => g.world.biomeAt(Math.floor(f.x / T)) === BIOME.DESERT || g.world.biomeAt(Math.floor(f.x / T)) === BIOME.MESA;

// Atrás do mundo: nuvem-parede e o funil (no lugar do desenho antigo de js/weather.js)
drawWeatherFunnel = function (ctx, g, ox, oy, z) {
  WEATHER_VIEW_TOP = oy / z;
  const f = g.weather?.funnel;
  if (!f || f.strength < 0.01) return;
  const C = WX.tornado, s = f.strength, t = f.age, H = C.height * (0.35 + 0.65 * Math.min(1, s * 1.4));
  const vw = ctx.canvas.width / z;
  if (f.x + C.topR * 2 < ox / z || f.x - C.topR * 2 > ox / z + vw) return;
  ctx.save(); ctx.setTransform(z, 0, 0, z, -ox, -oy); ctx.imageSmoothingEnabled = false;
  const dusty = tornadoDusty(g, f), lean = clamp((f.vx || 0) / 60, -1, 1);
  const base = dusty ? [138, 112, 78] : f.water ? [92, 108, 120] : [78, 80, 80], dirt = dusty ? [176, 146, 100] : f.water ? [204, 224, 236] : [102, 84, 62];   // tromba d'água: cinza-azulada com a base de borrifo
  const top = f.y - C.height;
  const centerAt = (h) => f.x + Math.sin(h * 2.6 + t * 0.55 + f.seed) * h * 30 * (0.6 + 0.4 * s) + lean * h * h * 48;
  // capa de poeira e destroços em volta do terço de baixo (mais larga e translúcida)
  for (let row = 0; row < H * 0.38; row += 2) {
    const h = row / C.height, y = f.y - row, cx = centerAt(h);
    const r = (C.bottomR * 2.6 + h * 70) * (0.85 + 0.15 * Math.sin(t * 5 + row * 0.2)), a = (1 - row / (H * 0.38)) * 0.32 * s;
    if (!weatherExposed(g.world, cx, y - 2)) continue;
    ctx.fillStyle = `rgba(${dirt[0]},${dirt[1]},${dirt[2]},${a})`;
    ctx.fillRect(Math.round(cx - r), Math.round(y - 2), Math.round(r * 2), 2);
  }
  // funil: faixas horizontais de 2 px; listras em espiral correm para cima; a corda balança
  for (let row = 0; row < H; row += 2) {
    const h = row / C.height, y = f.y - row, cx = centerAt(h);
    const r = lerp(C.bottomR, C.topR * 0.62, Math.pow(h, 1.6)) + Math.sin(t * 7 + row * 0.35) * 1.6;
    if (!weatherExposed(g.world, cx, y - 2)) continue;
    const near = clamp(1 - h * 3, 0, 1), col = base.map((v, i) => lerp(v, dirt[i], near));
    const segs = 8, a0 = (0.78 + 0.2 * h) * s;
    for (let k = 0; k < segs; k++) {
      const u0 = k / segs, x0 = cx - r + u0 * r * 2, wseg = r * 2 / segs, across = (k + 0.5) / segs * 2 - 1;
      const stripe = Math.sin(h * 52 - t * 12 + across * 2.6 + f.seed);
      const light = 1.12 - (across + 1) * 0.2 + stripe * 0.13;            // luz da esquerda + listra em espiral
      const edge = 1 - Math.pow(Math.abs(across), 4) * 0.7;               // borda mais transparente
      ctx.fillStyle = `rgba(${col[0] * light | 0},${col[1] * light | 0},${col[2] * light | 0},${a0 * edge})`;
      ctx.fillRect(Math.round(x0), Math.round(y - 2), Math.ceil(wseg) + 1, 2);
    }
  }
  // nuvem-parede no topo (a base do funil some dentro dela)
  const wall = wxWallCloud(C.topR, t, f.seed, dusty);
  ctx.globalAlpha = Math.min(1, s * 1.3);
  ctx.drawImage(wall, Math.round(f.x + lean * 20 - wall.width / 2), Math.round(top - WX_WALL_UP));
  ctx.globalAlpha = 1;
  ctx.restore();
};

// Depois da luz: poeira e destroços na base do tornado, raios, granizo, vento e neblina
function drawWeatherPlus(ctx, g, W, H, ox, oy, z) {
  const w = g.weather;
  if (!w) return;
  const night = Math.max(0.35, g.daylight ?? 1);
  ctx.save(); ctx.setTransform(z, 0, 0, z, -ox, -oy); ctx.imageSmoothingEnabled = false;
  // marcas de queimado onde o raio caiu
  for (const sc of w.scorches || []) {
    const a = 0.55 * (1 - sc.t / 25);
    ctx.fillStyle = `rgba(20,14,10,${a})`; ctx.fillRect(Math.round(sc.x - 7), Math.round(sc.y - 1), 14, 2); ctx.fillRect(Math.round(sc.x - 4), Math.round(sc.y - 2), 8, 1);
    if (sc.t < 4) { ctx.fillStyle = `rgba(255,140,50,${0.6 * (1 - sc.t / 4)})`; ctx.fillRect(Math.round(sc.x - 2), Math.round(sc.y - 1), 4, 1); }
  }
  // tornado: poeira girando na base e destroços em volta do funil
  const f = w.funnel;
  if (f && f.strength > 0.05) {
    const s = f.strength, t = f.age, dusty = tornadoDusty(g, f);
    const grains = dusty ? ['#b8955e', '#d4b27a', '#9a7a4a'] : f.water ? ['#e8f7ff', '#bfe3f6', '#8fc6ea', '#f6fcff'] : ['#5a4632', '#6e5840', '#4a3c2c', '#7a6448'];
    ctx.globalAlpha = Math.min(0.85, s) * night;
    for (let k = 0; k < 140; k++) {
      const life = ((t * (0.35 + (k % 5) * 0.05) + k * 0.0731) % 1), a = t * (3.4 - life) + k * 2.39;
      const r = 10 + life * 58 + (k % 7) * 2, y = f.y - 2 - life * life * 46 - (k % 4);
      const x = f.x + Math.cos(a) * r;
      ctx.fillStyle = grains[k % grains.length];
      ctx.fillRect(Math.round(x), Math.round(y + Math.sin(a) * 3), k % 3 ? 2 : 3, k % 4 ? 1 : 2);
    }
    const pal = f.water ? ['#dff2fc', '#a9d6f0', '#7fb8e0', '#f2fbff'] : ['#6a4a2e', '#4e7a32', '#8a6a42', '#3c3c38', '#a07a4a'];
    for (let k = 0; k < 46; k++) {
      const h = ((k * 0.137 + t * 0.07) % 1), y = f.y - h * WX.tornado.height * 0.8;
      const r = lerp(WX.tornado.bottomR + 8, WX.tornado.topR * 0.6, Math.pow(h, 1.5)) + 6, a = t * (5.5 - h * 3) + k * 1.7;
      const x = f.x + Math.cos(a) * r + Math.sin(h * 2.6 + t * 0.55 + f.seed) * h * 26;
      if (Math.sin(a) < -0.2) continue; // a parte de trás fica escondida pelo funil
      ctx.fillStyle = pal[k % pal.length];
      ctx.fillRect(Math.round(x), Math.round(y + Math.sin(a) * 5), k % 4 ? 2 : 3, k % 3 ? 1 : 2);
    }
    ctx.globalAlpha = 1;
  }
  // raios caindo perto: aviso (fio de luz) e o raio em si, com galhos
  for (const st of w.strikes || []) {
    if (st.t < st.warn) {
      const k = st.t / st.warn;
      ctx.fillStyle = `rgba(200,215,255,${0.12 * k})`; ctx.fillRect(Math.round(st.x - 2), Math.round(st.y - 60), 4, 60);
      continue;
    }
    if (!st.bolt) continue;
    const fade = 1 - (st.t - st.warn) / 0.32;
    for (const [x0, y0, x1, y1, main] of st.bolt) {
      ctx.strokeStyle = main ? `rgba(255,255,255,${fade})` : `rgba(200,215,255,${fade * 0.8})`;
      ctx.lineWidth = main ? 2 : 1;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(150,180,255,${0.35 * fade})`; ctx.fillRect(Math.round(st.x - 30), Math.round(st.y - 30), 60, 32);
    ctx.globalCompositeOperation = 'source-over';
  }
  // riscos de vento
  for (const s of w.streaks || []) {
    const a = Math.sin(Math.PI * s.t / s.life) * 0.35;
    ctx.fillStyle = `rgba(230,236,240,${a})`;
    ctx.fillRect(Math.round(s.x), Math.round(s.y), Math.round(s.len), 1);
  }
  // granizo
  for (const h of w.hailStones || []) {
    if (h.sink) {   // afundando: sem rastro, mais fosca e azulada quanto mais fundo, e some aos poucos
      const a = clamp(h.life / 2, 0, 1) * clamp(1 - (h.y - h.surf) / 150, 0.2, 1);
      ctx.globalAlpha = a; ctx.fillStyle = '#7fa3b8'; ctx.fillRect(Math.round(h.x) - 1, Math.round(h.y), 3, 3);
      ctx.fillStyle = '#c6e0ee'; ctx.fillRect(Math.round(h.x) - 1, Math.round(h.y), 2, 2); ctx.globalAlpha = 1;
      continue;
    }
    if (!h.bounce) { ctx.fillStyle = 'rgba(220,235,245,0.45)'; ctx.fillRect(Math.round(h.x - h.vx * 0.012), Math.round(h.y - 7), 1, 6); }
    ctx.fillStyle = '#b9d2e2'; ctx.fillRect(Math.round(h.x) - 1, Math.round(h.y), 3, 3);
    ctx.fillStyle = '#f4fbff'; ctx.fillRect(Math.round(h.x) - 1, Math.round(h.y), 2, 2);
  }
  ctx.restore();
  drawWeatherFog(ctx, g, W, H, ox, oy, z);
}

// Altura e textura pertencem às colunas do mundo, nunca à janela da câmera.
function wxFogGround(world, tx) {
  tx = clamp(tx, 0, world.w - 1);
  return Math.max(world.skyTop[tx], world.skyGapBottom?.[tx] || 0) * T;
}
function drawWeatherFog(ctx, g, W, H, ox, oy, z) {
  const w = g.weather, fog = w?.fog || 0;
  if (fog <= 0.02) return;
  const world = g.world, tex = wxFogTexture(), left = ox / z, top = oy / z;
  const first = Math.max(0, Math.floor(left / T)), last = Math.min(world.w - 1, Math.ceil((left + W / z) / T));
  const day = Math.max(0.3, g.daylight ?? 1), drift = w.fogDrift || 0;
  ctx.save(); ctx.setTransform(z, 0, 0, z, -ox, -oy); ctx.imageSmoothingEnabled = true;
  for (const [height, stretch, speed, alpha, phase] of [[10*T, 2.4, 0.65, 0.55, 0], [4*T, 1.7, 1, 0.65, 173]]) {
    ctx.globalAlpha = fog * alpha * day;
    for (let tx = first; tx <= last; tx++) {
      const ground = wxFogGround(world, tx);
      // Suaviza o contorno em coordenadas fixas, sem criar degraus na névoa.
      let bank = 0;
      for(let k=-4;k<=4;k++)bank+=wxFogGround(world,tx+k);
      bank/=9;
      const y=bank-height, visibleHeight=Math.min(height,ground-y);
      if (visibleHeight<=0 || ground < top || y > top + H / z) continue;
      // Recorte por coluna: não atravessa a montanha nem o piso.
      const x = tx*T, u = wrap((x - drift*speed) / stretch + phase, tex.width), sw = T/stretch;
      const width = Math.min(sw, tex.width-u), dw = width*stretch;
      const sh=tex.height*visibleHeight/height;
      ctx.drawImage(tex, u, 0, width, sh, x, y, dw, visibleHeight);
      if (width < sw) ctx.drawImage(tex, 0, 0, sw-width, sh, x+dw, y, T-dw, visibleHeight);
    }
  }
  ctx.restore();
}
let WX_FOG = null;
function wxFogTexture() {
  if (WX_FOG) return WX_FOG;
  const width=512, height=128, c=makeCanvas(width,height), g=c.getContext('2d'), img=g.createImageData(width,height);
  for (let y=0;y<height;y++)for(let x=0;x<width;x++) {
    // Baixa frequência e bordas periódicas, sem manchas duras ou emendas.
    const n=pfbm2(x/128,y/64,4,4411,2), envelope=Math.pow(Math.sin(Math.PI*y/(height-1)),2);
    const i=(y*width+x)*4;
    img.data[i]=202;img.data[i+1]=216;img.data[i+2]=224;img.data[i+3]=(0.12+n*0.3)*envelope*255;
  }
  g.putImageData(img, 0, 0);
  return (WX_FOG = c);
}
{
  const baseDraw = drawWeather;
  drawWeather = (ctx, g, W, H, ox, oy, z) => { baseDraw(ctx, g, W, H, ox, oy, z); drawWeatherPlus(ctx, g, W, H, ox, oy, z); };
}
