'use strict';
// Linha do tempo da abertura (segundos)
const INTRO_FLIGHT_END = 7.2;   // fim da cena dentro do céu
const INTRO_DIVE = 7.6;         // avião aparece caindo sobre o mapa
const INTRO_IMPACT = 10.2;
const INTRO_BLACK_END = 13.2;   // olhos começam a abrir
const INTRO_LENGTH = 31;
const INTRO_HOLD = 15.5;        // a cena para aqui até o jogador apertar F para sair do banheiro

// loaded=true: chamar somente depois de restaurar o mundo/jogador de um save real.
function startOpening(g, { loaded = false } = {}) {
  if (loaded) return;
  const w = g.world, x = Math.floor(w.w / 2);
  levelGround(w, x - 10, x + 8, w.surface[x]);
  const site = buildCrashSite(g, x), floor = w.surface[x];
  const p = g.player; p.x = x * T + 1; p.y = floor * T - p.h - 0.01; p.vx = p.vy = p.stepOffset = 0; p.hp = p.maxHp; p.facing = 1;
  g.spawnPoint = { x: p.x, y: floor * T - PLAYER_H - 0.01 };
  g.respawnPending = null;
  g.mobs = g.mobs.filter((m) => Math.abs(m.cx - p.cx) > 18 * T);
  g.time = 0.12; g.daylight = daylightAt(g.time); w.computeLight(x, floor); w.composeLight(g.daylight); w.lightDirty = false;
  g.crashSite = { x: p.cx, y: floor * T, ...site };
  g.intro = { active: true, started: false, t: 0, skip: 0, fx: [], sfx: [], clouds: null, flightShake: 0 };
  g.objective = '';
}

// Chamado pelo menu depois do criador de personagem (o clique do usuário libera o áudio)
function beginOpening(g) {
  if (!g.intro?.active || g.intro.started) return;
  g.intro.started = true;
  g.intro.cabin = createPlaneCabin();
  try { g.crashAudio = new CrashAudio(); g.crashAudio.engineStart(); } catch (e) { console.warn('Áudio da abertura indisponível', e); }
}

function finishOpening(g) {
  const s = g.intro; if (!s?.active) return;
  s.active = false; s.skip = 0; s.fx.length = s.sfx.length = 0;
  if(s.cabin)s.cabin.active=false;
  document.getElementById('intro-start')?.remove();
  if (g.crashAudio) { g.crashAudio.stopSustained(0.2); g.crashAudio.setMuffle(16000, 0.3); }
  const p = g.player; p.y = g.crashSite.y - p.h - 0.01; p.vx = p.vy = p.stepOffset = 0; p.onGround = true; p.facing = 1; p.invulnerable = 3; p.lockFacing = false;
  input.keys.clear(); input.mouse.left = input.mouse.right = input.mouse.rawLeft = false; g.rightWasDown = false; cancelTool(g); g.sword.active = false; g.mining.progress = 0; g.shake = 0; g.particles.length = 0;
  g.objective = 'Vasculhe a fuselagem próxima para encontrar uma ferramenta e suprimentos.'; g.openingComplete = true; updateCamera(0, true);
}

// Avião na cena do céu (px da tela)
// calm = voo tranquilo em loop, usado de fundo no menu principal
function planeScreen(t, W, H, calm = false) {
  const S = Math.max(2, Math.floor(Math.min(W / 330, H / 185)));
  const dive = calm ? 0 : clamp((t - 3.8) / 3, 0, 1), rough = !calm && t > 1.8 ? 1 : 0.25;
  return {
    S, dive,
    ang: smoothstep(dive) * 0.45 + Math.sin(t * 3.1) * 0.025 * rough + Math.sin(t * 17) * 0.01 * rough,
    cx: W * (calm ? 0.66 : 0.46) + dive * dive * W * 0.16,
    cy: H * 0.42 + Math.sin(t * 1.3) * 5 + Math.sin(t * 9.7) * 2 * rough + dive ** 2.6 * H * 0.62,
  };
}

// Avião caindo sobre o mapa (px do mundo)
function planeWorld(g, t) {
  const b = g.crashSite, u = clamp((t - INTRO_DIVE) / (INTRO_IMPACT - INTRO_DIVE), 0, 1) ** 1.5, K = PLANE_WORLD_SCALE;
  return { x: lerp(b.x - 760, b.x - 36 * K, u), y: lerp(b.y - 470, b.y - 34 * K, u), ang: 0.5 + Math.sin(t * 9) * 0.04 };
}

// Converte um ponto do sprite do avião (relativo ao centro) para a posição final
function planePoint(P, ox, oy, S = 1) {
  const c = Math.cos(P.ang), s = Math.sin(P.ang), bx = P.cx ?? P.x, by = P.cy ?? P.y;
  return { x: bx + (ox * c - oy * s) * S, y: by + (ox * s + oy * c) * S };
}

// Fogo do motor: no céu (espaço da tela) e na queda sobre o mapa
const SKY_FIRE = { x: 0, y: 0, style: 'blaze', pal: 'hot', variant: 2, tempo: 1.3, seed: 5 };
const DIVE_FIRE = { x: 0, y: 0, style: 'blaze', pal: 'fuel', variant: 1, tempo: 1.2, seed: 2 };

function puff(list, x, y, o) {
  const life = o.life ?? 0.6 + Math.random() * 0.6;
  list.push({ x, y, vx: 0, vy: 0, r: 3, grow: 6, kind: 'fire', gravity: 0, rot: 0, vr: 0, ...o, life, max: life });
}

function updateOpening(g, dt) {
  const s = g.intro; if (!s.started) return;
  if(s.cabin?.active){updatePlaneCabin(g,dt);return;}
  s.skip = input.down('Space') ? s.skip + dt : 0;
  if (s.skip >= 1) { finishOpening(g); return; }
  const old = s.t; s.t = Math.min(s.t + dt, INTRO_HOLD);
  // Depois da queda: tudo espera até você sair do banheiro
  if (s.t >= INTRO_HOLD && input.down(LAV_EXIT_KEY)) { finishOpening(g); startLavatoryExit(g); return; }
  const t = s.t, at = (k) => old < k && t >= k, A = g.crashAudio, b = g.crashSite, p = g.player;
  const W = canvas.width, H = canvas.height;

  // ---------- Sons e falas ----------
  if (A) {
    if (at(0.6)) A.radio(1.4);
    if (at(1.8)) { A.metal(0, 0.05); A.noise({ dur: 1.4, freq: 220, gain: 0.45, brown: true }); }
    if (at(2.4)) { A.boom(0.6); A.alarm(4.6); }
    if (at(2.6)) A.engineFail();
    if (at(3.6)) A.radio(1.9);
    if (at(4.8)) { A.metal(0, 0.1); A.noise({ dur: 0.5, type: 'highpass', freq: 2500, gain: 0.35 }); }
    if (at(5.1)) A.windRush(2.1);
    if (at(INTRO_FLIGHT_END)) { A.stopSustained(0.3); A.noise({ dur: 0.7, type: 'bandpass', freq: 1800, freqEnd: 300, gain: 0.3 }); }
    if (at(INTRO_DIVE + 0.1)) A.windRush(INTRO_IMPACT - INTRO_DIVE - 0.1);
    if (at(8.4) || at(8.9)) { A.metal(0, 0.09); A.boom(0.25); }
    if (at(INTRO_IMPACT)) { A.impact(); A.setMuffle(650, 1.8); }
    if (at(INTRO_IMPACT + 0.6)) { A.tinnitus(5.5); A.heartbeat(5, 0.95, 0.8); }
    if (at(11.3)) A.boom(0.7);
    if (at(12.5)) A.boom(0.45);
    if (at(INTRO_BLACK_END)) A.setMuffle(16000, 8);
    if (at(INTRO_HOLD - 0.5)) { A.noise({ dur: 0.1, freq: 420, gain: 0.6, brown: true }); A.noise({ dur: 0.1, freq: 420, gain: 0.6, brown: true, delay: 0.3 }); } // batidas de dentro
  }

  // ---------- Cena do céu ----------
  s.flightShake = Math.max(0, s.flightShake - dt * 4);
  if (at(1.8)) s.flightShake = 1.2;
  if (t < INTRO_FLIGHT_END) {
    const P = planeScreen(t, W, H), eng = planePoint(P, 3, 14, P.S);
    if (at(2.4)) {
      s.flightShake = 3.5;
      for (let i = 0; i < 36; i++) { const a = Math.random() * Math.PI * 2, v = (60 + Math.random() * 220) * P.S / 2; puff(s.sfx, eng.x, eng.y, { vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: (2 + Math.random() * 4) * P.S, grow: 10 * P.S, life: 0.5 + Math.random() * 0.7 }); }
    }
    if (at(4.8)) { const q = planePoint(P, -30, -4, P.S); puff(s.sfx, q.x, q.y, { kind: 'panel', vx: -260 * P.S / 2, vy: -160, vr: 9, gravity: 260, life: 2.5, r: 0, grow: 0 }); }
    if (t > 2.4) for (let k = 0; k < 3; k++)
      puff(s.sfx, eng.x, eng.y, { vx: -(520 + Math.random() * 220) * P.S / 3, vy: (Math.random() - 0.5) * 40 - P.dive * 180, r: (1.5 + Math.random() * 2.5) * P.S, grow: 9 * P.S, life: 0.5 + Math.random() * 0.6 });
  }

  // ---------- Queda sobre o mapa ----------
  if (t >= INTRO_DIVE && t < INTRO_IMPACT) {
    const K = PLANE_WORLD_SCALE, P = planeWorld(g, t), eng = planePoint(P, -7 * K, 13 * K), tail = planePoint(P, -70 * K, -6 * K);
    for (let k = 0; k < 3; k++) puff(s.fx, eng.x, eng.y, { vx: (Math.random() - 0.5) * 30, vy: -10 - Math.random() * 20, r: (2 + Math.random() * 3) * K * 0.8, grow: 9 * K * 0.8, life: 0.8 + Math.random() * 1.2 });
    puff(s.fx, tail.x, tail.y, { kind: 'smoke', vy: -8, r: 3 * K, grow: 7 * K, life: 1.8 });
    // Pedaços se soltam no tamanho real e param no chão
    if (at(8.4)) puff(s.fx, eng.x, eng.y, { kind: 'chunk', img: WRECK_ART.engine.canvas, vx: -70, vy: -40, vr: -3, gravity: 240, life: 3, ground: b.y - 18 });
    if (at(8.9)) puff(s.fx, eng.x, eng.y - 6, { kind: 'chunk', img: WRECK_ART.wing.canvas, vx: -130, vy: -110, vr: 2.4, gravity: 220, life: 3, ground: b.y - 20 });
  }
  if (at(INTRO_IMPACT)) {
    const x = b.x + 20, y = b.y - 10;
    g.shake = 9;
    puff(s.fx, x, y, { kind: 'chunk', img: WRECK_ART.tail.canvas, vx: 280, vy: -300, vr: 4, gravity: 420, life: 3, ground: b.y - 40 });
    puff(s.fx, x, y, { kind: 'chunk', img: WRECK_ART.nose.canvas, vx: 420, vy: -200, vr: -3, gravity: 420, life: 3, ground: b.y - 30 });
    const bits = Object.values(WRECK_ART.debris).flat();
    for (let i = 0; i < 16; i++) puff(s.fx, x, y, { kind: 'chunk', img: bits[i % bits.length], vx: (Math.random() - 0.3) * 520, vy: -120 - Math.random() * 380, vr: (Math.random() - 0.5) * 14, gravity: 600, life: 2.2, ground: b.y - 6 });
    for (let i = 0; i < 70; i++) { const a = -Math.random() * Math.PI, v = 80 + Math.random() * 360; puff(s.fx, x, y, { kind: i % 3 ? 'spark' : 'dirt', vx: Math.cos(a) * v, vy: Math.sin(a) * v, gravity: 500, life: 0.6 + Math.random() * 1.2 }); }
    for (let i = 0; i < 44; i++) { const a = -Math.random() * Math.PI, v = 30 + Math.random() * 130; puff(s.fx, x + (Math.random() - 0.5) * 60, y, { vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.7, r: 5 + Math.random() * 9, grow: 16, life: 0.9 + Math.random() * 1.4 }); }
  }
  if (at(11.3)) g.shake = 2.2;
  if (at(12.5)) g.shake = 1.4;

  for (const list of [s.fx, s.sfx])
    for (let i = list.length - 1; i >= 0; i--) {
      const f = list[i];
      f.vy += (f.gravity || -20) * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.r += f.grow * dt; f.rot += f.vr * dt; f.life -= dt;
      if (f.ground != null && f.y > f.ground) { f.y = f.ground; f.vy = f.vy > 80 ? -f.vy * 0.3 : 0; f.vx *= 0.6; f.vr *= 0.5; }
      if (f.life <= 0) list.splice(i, 1);
    }
  g.shake = Math.max(0, g.shake - dt * 5);
  updateCrashSite(g, dt);

  // ---------- Câmera ----------
  const z = g.zoom, vw = W / z, vh = H / z, pr = smoothstep(clamp((t - 27) / 4, 0, 1));
  const fx = t < INTRO_BLACK_END ? b.x - 70 : b.x + 14, fy = t < INTRO_BLACK_END ? b.y - 110 : b.y - 36;
  g.cam.x = lerp(fx, p.cx, pr) - vw / 2; g.cam.y = lerp(fy, p.cy, pr) - vh / 2; clampCamera();
  if (t >= INTRO_LENGTH) finishOpening(g);
}

// Espaço do mundo, antes do jogador
function drawCrashScenery(ctx, g) {
  const b = g.crashSite; if (!b) return;
  const s = g.intro, active = s?.active, t = active ? s.t : INTRO_LENGTH, x = b.x, y = b.y;
  drawCrashSite(ctx, g);
  // O banheiro intacto, com você trancado dentro, até sair com F
  if (active && t >= INTRO_IMPACT) drawLavatory(ctx, b.x, b.y, { t: performance.now() / 1000 });
  else if (g.lavatory && g.lavatory.phase !== 'boom') drawLavatory(ctx, g.lavatory.x, g.lavatory.y, { open: true, shake: g.lavatory.phase === 'shake' ? 1 + g.lavatory.t * 0.2 : 0 });
  const r = (xx, yy, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(Math.round(xx), Math.round(yy), w, h); };
  if (t >= INTRO_IMPACT) {
    // Rádio portátil
    r(x + 27, y - 7, 10, 7, '#353c34'); r(x + 28, y - 6, 6, 3, '#879577'); r(x + 35, y - 11, 1, 5, '#939d87');
    r(x + 29, y - 2, 1, 1, '#575d45');
  }
  if (!active) return;
  if (t >= INTRO_DIVE && t < INTRO_IMPACT) {
    const K = PLANE_WORLD_SCALE, P = planeWorld(g, t), img = WRECK_ART.planeBig, eng = planePoint(P, -7 * K, 13 * K);
    ctx.save(); ctx.translate(Math.round(P.x), Math.round(P.y)); ctx.rotate(P.ang); ctx.drawImage(img, -img.width / 2, -img.height / 2); ctx.restore();
    DIVE_FIRE.x = eng.x; DIVE_FIRE.y = eng.y + 4 * K;
    drawFire(ctx, DIVE_FIRE, 0.8 * K, t);
  }
  drawIntroFx(ctx, s.fx, t);
}

function drawIntroFx(ctx, list, t) {
  for (const f of list) {
    const age = 1 - f.life / f.max;
    if (f.kind === 'chunk' || f.kind === 'panel') {
      ctx.save(); ctx.translate(Math.round(f.x), Math.round(f.y)); ctx.rotate(f.rot);
      if (f.kind === 'panel') { ctx.fillStyle = '#c8cecb'; ctx.fillRect(-8, -3, 16, 6); ctx.fillStyle = '#6a7278'; ctx.fillRect(-8, 2, 16, 1); }
      else ctx.drawImage(f.img, -f.img.width / 2, -f.img.height / 2);
      ctx.restore();
    } else if (f.kind === 'spark' || f.kind === 'dirt') {
      ctx.globalAlpha = 1 - age;
      ctx.fillStyle = f.kind === 'spark' ? (Math.sin(t * 30 + f.x) > 0 ? '#ffe28a' : '#ff8a2a') : '#6b4f36';
      ctx.fillRect(Math.round(f.x), Math.round(f.y), 2, 2);
    } else {
      const fire = f.kind === 'fire' && age < 0.35;
      ctx.globalAlpha = fire ? 1 : (1 - age) * 0.6;
      ctx.fillStyle = fire ? (age < 0.12 ? '#ffe68a' : age < 0.22 ? '#ffa22a' : '#dc521b') : age < 0.5 ? '#3a3533' : '#5d5855';
      const rr = Math.round(f.r), x = Math.round(f.x), y = Math.round(f.y);
      ctx.fillRect(x - rr, y - Math.round(rr * 0.6), rr * 2, Math.round(rr * 1.2));
      ctx.fillRect(x - Math.round(rr * 0.6), y - rr, Math.round(rr * 1.2), rr * 2);
    }
  }
  ctx.globalAlpha = 1;
}

// Durante a abertura o jogador está trancado no banheiro: nada a desenhar
function drawOpeningPlayer() {}
// ---------- Tela (px) ----------
function drawFlightScene(ctx, g, W, H, calm = false) {
  const s = g.intro, t = calm ? (performance.now() / 1000) % 600 : s.t, P = planeScreen(t, W, H, calm), S = P.S;
  const sh = (calm ? 0 : s.flightShake) * S, jx = (Math.random() * 2 - 1) * sh, jy = (Math.random() * 2 - 1) * sh;
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#111831'); sky.addColorStop(0.55, '#5f3a57'); sky.addColorStop(1, '#e0874c');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
  const sun = ctx.createRadialGradient(W * 0.8, H * 0.86, 0, W * 0.8, H * 0.86, H * 0.5);
  sun.addColorStop(0, 'rgba(255,214,140,0.55)'); sun.addColorStop(1, 'rgba(255,160,90,0)');
  ctx.fillStyle = sun; ctx.fillRect(0, 0, W, H);
  if (!s.clouds) s.clouds = Array.from({ length: 12 }, (_, i) => ({ img: genCloud(900 + i), x: Math.random(), y: Math.random(), layer: i < 7 ? 0.45 : 1 }));

  const clouds = (front) => {
    for (const c of s.clouds) {
      if ((c.layer === 1) !== front) continue;
      const k = S * c.layer * 1.4, w = c.img.width * k, span = W + w * 2;
      const x = wrap(c.x * span - t * 240 * c.layer * S / 2, span) - w;
      const y = c.y * H * 1.1 - P.dive ** 2 * H * 1.4 * c.layer + (front ? H * 0.25 : 0);
      ctx.globalAlpha = front ? 0.85 : 0.45;
      ctx.drawImage(c.img, Math.round(x + jx), Math.round(y + jy), w, c.img.height * k);
    }
    ctx.globalAlpha = 1;
  };
  ctx.imageSmoothingEnabled = false;
  clouds(false);
  // Montanhas subindo durante a queda
  const hills = H * 1.04 - P.dive ** 2 * H * 0.3;
  for (const [col, amp, freq, off, speed] of [['#3a2b45', 22, 0.006, 3, 20], ['#241c30', 14, 0.013, 9, 45]]) {
    ctx.fillStyle = col;
    for (let x = 0; x < W; x += 2 * S) {
      const wx = x + t * speed * S;
      const h = (noise1(wx * freq, off) + 1) * amp + (noise1(wx * freq * 3.1, off + 1) + 1) * amp * 0.35;
      ctx.fillRect(x, Math.round(hills - h * S + (speed > 30 ? 8 * S : 0)), 2 * S, H);
    }
  }

  ctx.save(); ctx.translate(jx, jy);
  drawIntroFx(ctx, s.sfx, t);
  ctx.translate(Math.round(P.cx), Math.round(P.cy)); ctx.rotate(P.ang); ctx.scale(S, S);
  ctx.drawImage(WRECK_ART.plane, -WRECK_ART.plane.width / 2, -WRECK_ART.plane.height / 2);
  if (Math.floor(t * 2.5) % 2) { ctx.fillStyle = '#ff3b30'; ctx.fillRect(-2, 9, 2, 1); } // luz de navegação
  ctx.restore();
  if (!calm && t > 2.4) {
    const e = planePoint(P, 3, 14, S);
    ctx.save(); ctx.translate(Math.round(e.x + jx), Math.round(e.y + jy + 6 * S)); ctx.scale(S, S); drawFire(ctx, SKY_FIRE, 0.8, t); ctx.restore();
  }
  clouds(true);

  if (!calm && t > 2.4) { // luz de alarme pulsando nas bordas
    const a = (0.5 + 0.5 * Math.sin(t * 12.5)) * 0.28, v = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.9);
    v.addColorStop(0, 'rgba(200,20,20,0)'); v.addColorStop(1, `rgba(200,20,20,${a})`);
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  }
  if (!calm && t > 2.4 && t < 2.7) { ctx.fillStyle = `rgba(255,230,190,${(2.7 - t) / 0.3 * 0.6})`; ctx.fillRect(0, 0, W, H); }
}

// Pálpebras abrindo e fechando ao recobrar a consciência
function eyeOpenness(t) {
  const keys = [[INTRO_BLACK_END, 0], [14, 0.4], [14.4, 0], [15.3, 0.75], [15.6, 0.3], [16.5, 1]];
  if (t <= keys[0][0]) return 0;
  for (let i = 1; i < keys.length; i++) if (t < keys[i][0]) return lerp(keys[i - 1][1], keys[i][1], smoothstep((t - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0])));
  return 1;
}

function introSubtitle(s) {
  const t = s.t;
  if (!s.started) return '';
  if (t < 0.6) return 'Voo 237 · algum lugar sobre a cordilheira';
  if (t < 2.2) return 'VOCÊ (no banheiro): “É só turbulência… é só turbulência… é só…”';
  if (t < 3.6) return '[ ALARME ] FOGO NO MOTOR 2';
  if (t < 5.4) return 'COMANDANTE: “Mayday, mayday! Perdemos o motor dois!”';
  if (t < INTRO_FLIGHT_END) return 'VOCÊ: “EU NEM DEI DESCARGA!”';
  if (t >= INTRO_BLACK_END && t < INTRO_HOLD - 0.6) return 'Silêncio. No meio dos destroços, uma única coisa continua de pé.';
  if (t >= INTRO_HOLD - 0.6) return 'VOCÊ (lá de dentro): “…oi? Acabou? Já pode sair?”';
  return '';
}

function drawOpeningOverlay(ctx, g, W, H) {
  const s = g.intro; if (!s?.active) return;
  const t = s.t;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.textBaseline = 'alphabetic';

  if (!s.started) {
    drawBravoraMenu(ctx, W, H);
    ctx.restore(); return;
  }

  if (t < INTRO_FLIGHT_END) {
    drawFlightScene(ctx, g, W, H);
    ctx.fillStyle = `rgba(4,6,9,${clamp((t - 6.5) / 0.7, 0, 1)})`; ctx.fillRect(0, 0, W, H);
  } else {
    let black = t < INTRO_DIVE + 0.3 ? 1 - clamp((t - INTRO_DIVE + 0.3) / 0.6, 0, 1) : 0;
    if (t >= INTRO_IMPACT) black = t < INTRO_BLACK_END ? clamp((t - INTRO_IMPACT - 0.35) / 0.7, 0, 1) : 0;
    if (black > 0) { ctx.fillStyle = `rgba(4,6,9,${black})`; ctx.fillRect(0, 0, W, H); }
    if (t >= INTRO_IMPACT && t < INTRO_IMPACT + 0.55) { ctx.fillStyle = `rgba(255,244,220,${1 - (t - INTRO_IMPACT) / 0.55})`; ctx.fillRect(0, 0, W, H); }
    if (t >= INTRO_HOLD) { // convite para sair do banheiro
      ctx.textAlign = 'center'; ctx.font = '16px Silkscreen, monospace';
      const pulse = 0.6 + 0.4 * Math.sin(performance.now() / 250);
      ctx.fillStyle = 'rgba(10,12,15,0.85)'; ctx.fillRect(W / 2 - 150, H * 0.3 - 26, 300, 38);
      ctx.fillStyle = `rgba(255,210,122,${pulse})`; ctx.fillText('[F] Sair do banheiro', W / 2, H * 0.3);
    }
  }

  const bars = Math.round(H * 0.08 * (1 - smoothstep(clamp((t - 27) / 4, 0, 1))));
  ctx.fillStyle = '#05080c'; ctx.fillRect(0, 0, W, bars); ctx.fillRect(0, H - bars, W, bars);

  const text = introSubtitle(s);
  if (text) {
    ctx.textAlign = 'center'; ctx.font = '14px monospace';
    const words = text.split(' '), lines = []; let row = '';
    for (const word of words) { if (row && ctx.measureText(row + word).width > W - 40) { lines.push(row); row = ''; } row += word + ' '; }
    lines.push(row);
    lines.forEach((v, i) => { const yy = H - bars - 20 - (lines.length - 1 - i) * 18; ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillText(v, W / 2 + 1, yy + 1); ctx.fillStyle = t < INTRO_FLIGHT_END && t > 2.2 && t < 3.6 ? '#ff8f7a' : '#ece6d4'; ctx.fillText(v, W / 2, yy); });
  }
  ctx.textAlign = 'right'; ctx.font = '11px monospace'; ctx.fillStyle = '#b7beb8';
  ctx.fillText('Segure ESPAÇO para pular', W - 18, Math.max(25, bars - 12));
  ctx.fillStyle = '#d98a4a'; ctx.fillRect(W - 178, Math.max(31, bars - 6), 160 * clamp(s.skip, 0, 1), 2);
  ctx.restore();
}

const introHudAlpha = (g) => (g.intro?.active ? clamp((g.intro.t - 28) / 3, 0, 1) : 1);
