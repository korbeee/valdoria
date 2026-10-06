'use strict';

// =====================================================================================
//  ARQUIPÉLAGO DOS VIGIAS — bichos do céu
// =====================================================================================
//   • Arraia-do-céu       mansa: plana em ondas largas entre as ilhas, com manchas que brilham
//   • Gavião-de-tempestade caça: rodeia lá em cima, grita, mergulha e joga quem acerta para fora
//                          da ilha. As pontas das asas estalam de eletricidade.
//   • Medusa-de-vento     vaga devagar, pulsando; encostar dá um choquinho. Acende à noite.
// Todos voam sozinhos (as correntes de vento não mexem com eles) e nascem só na faixa do céu.

Object.assign(SFX, {
  hawkScreech(A, o) { voice(A, o, { type: 'sawtooth', f0: 1500, f1: 900, dur: 0.55, gain: 0.22, formants: [[2400, 6], [3600, 8]], vib: 40, vibRate: 30 }); N(A, o, { type: 'highpass', freq: 3000, dur: 0.3, gain: 0.12 }); },
  hawkDive(A, o) { N(A, o, { type: 'bandpass', freq: 900, freqEnd: 2200, q: 1.2, dur: 0.6, gain: 0.3, attack: 0.1 }); },
  hawkFlap(A, o) { N(A, o, { type: 'lowpass', freq: 700, dur: 0.12, gain: 0.18 }); },
  jellyZap(A, o) { N(A, o, { type: 'highpass', freq: 3500, dur: 0.18, gain: 0.25 }); Tn(A, o, { freq: 1800, freqEnd: 600, dur: 0.12, gain: 0.1, type: 'square' }); },
  raySong(A, o) { Tn(A, o, { freq: 520, freqEnd: 760, dur: 0.9, gain: 0.05 }); Tn(A, o, { freq: 780, freqEnd: 1040, dur: 0.8, gain: 0.03 }); },
});

WILDLIFE.skyray = {
  name: 'Arraia-do-céu', where: 'Arquipélago dos Vigias', voa: true, hp: 18, speed: 44, w: 34, h: 12,
  drops: [[ITEM.CLOUD_ESSENCE, 1, 2], [ITEM.CLOUD_ESSENCE, 1, 1, 0.4]], color: '#a0a8e0', shape: 'skyray',
};
WILDLIFE.stormhawk = {
  name: 'Gavião-de-tempestade', where: 'Arquipélago dos Vigias', voa: true, hostile: true, monstro: true, hp: 22, speed: 120, damage: 0, w: 22, h: 14,
  drops: [[ITEM.FEATHER, 1, 3], [ITEM.MEAT, 1, 1, 0.4], [ITEM.SKY_EGG, 1, 1, 0.12]], color: '#46506e', shape: 'stormhawk',
};
WILDLIFE.windjelly = {
  name: 'Medusa-de-vento', where: 'Arquipélago dos Vigias', voa: true, hp: 8, speed: 16, w: 12, h: 14,
  drops: [[ITEM.CLOUD_ESSENCE, 1, 3]], color: '#e6b4e6', shape: 'windjelly',
};
WILD_SIZES.skyray = [48, 24]; WILD_SIZES.stormhawk = [42, 30]; WILD_SIZES.windjelly = [18, 30];
WILD_PALETTES.skyray = [[30, 28, 70], [74, 70, 140], [112, 116, 190], [162, 170, 228], [222, 228, 252]];
WILD_PALETTES.stormhawk = [[16, 18, 30], [40, 48, 74], [70, 82, 114], [116, 130, 162], [214, 220, 232]];
WILD_PALETTES.windjelly = [[70, 40, 96], [150, 100, 180], [214, 160, 220], [240, 206, 244], [255, 246, 255]];
MOB_SFX.skyray = 'pig'; MOB_SFX.stormhawk = 'bat'; MOB_SFX.windjelly = 'slime';
Object.assign(BESTIARY_LORE, {
  skyray: 'Plana entre as ilhas em ondas largas, sem pressa. As manchas das asas guardam a luz do dia e brilham de noite. Dizem que os Vigias montavam nelas.',
  stormhawk: 'Mora nos ninhais e caça quem pisa perto. Grita antes de mergulhar: quem ouve tem um instante para sair da frente. O golpe joga longe — longe da ilha, de preferência.',
  windjelly: 'Um sino de nuvem que vaga com o vento. Os fios descarregam um choquinho em quem encosta. À noite as ilhas ficam cheias delas, acesas como lanternas.',
});
const SKY_ELECTRIC = [[90, 200, 255], [170, 240, 255], [240, 255, 255]];
const SKY_GLOWSPOT = [120, 240, 255];

// ---------- Arraia-do-céu: arte ----------
// Quadros 0–7: bater de asas lento (a ponta sobe e desce em onda). Olhando para a direita.
function paintSkyRay(s, pal, f) {
  const ph = (f % 8) / 8 * Math.PI * 2, cy = 13, flap = Math.cos(ph);
  const fillPoly = (pts, pick) => {
    let y0 = Infinity, y1 = -Infinity, x0 = Infinity, x1 = -Infinity;
    for (const [x, y] of pts) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
      let inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if ((yi > y + 0.5) !== (yj > y + 0.5) && x + 0.5 < (xj - xi) * (y + 0.5 - yi) / (yj - yi) + xi) inside = !inside;
      }
      if (inside) { const c = pick(x, y); if (c) s.set(x, y, c); }
    }
  };
  const bez = (a, c, b, n) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n, u = 1 - t; return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]; });
  const wing = (tip, front, back, near) => {
    const lead = bez(front, [front[0] - 3, Math.min(front[1], tip[1]) - 2], tip, 10);
    const trail = bez(tip, [back[0] + 6, (tip[1] + back[1]) / 2 + (tip[1] < cy ? 3 : -3)], back, 10);
    const pts = [...lead, ...trail];
    fillPoly(pts, (x, y) => {
      if (!near) return pal[1];
      const dLead = Math.hypot(x - front[0], y - front[1]) / 22;
      return pal[clamp(Math.round(3.4 - dLead * 1.8 + (BAYER4[(y & 3) * 4 + (x & 3)] / 16 - 0.5) * 0.7), 1, 4)];
    });
    return pts;
  };
  // asa de trás (escura, quase toda escondida atrás do corpo)
  wing([25 + Math.sin(ph) * 1.5, cy + 2 + flap * 6], [33, cy], [14, cy + 1], false);
  // rabo fino chicoteando
  for (let x = 0; x <= 13; x++) s.set(x, Math.round(cy + 1 + Math.sin(ph + x * 0.35) * 1.4 * (1 - x / 14)), x < 3 ? pal[2] : pal[1]);
  // corpo: lente achatada, barriga clara
  shadeBall(s, 25, cy, 13, 3.6, (v, dx, dy) => (dy > 0.35 ? pal[4] : v > 0.7 ? pal[4] : v > 0.45 ? pal[3] : v > 0.2 ? pal[2] : pal[1]));
  // barbatanas da cabeça (enroladas) e olho
  for (const [x, y] of [[37, cy - 2], [38, cy - 3], [39, cy - 3], [40, cy - 2], [37, cy + 2], [38, cy + 3], [39, cy + 3], [40, cy + 2]]) s.set(x, y, pal[2]);
  s.set(35, cy - 1, [20, 20, 40]); s.set(34, cy - 2, pal[4]);
  // asa da frente, com manchas que brilham
  const tip = [22 + Math.sin(ph) * 2, cy - 2 - flap * 10];
  wing(tip, [34, cy - 1], [12, cy + 1], true);
  for (const k of [0.35, 0.55, 0.72]) {
    const x = Math.round(lerp(28, tip[0], k)), y = Math.round(lerp(cy - 1, tip[1], k) + (flap > 0 ? 1 : -1));
    s.set(x, y, SKY_GLOWSPOT); s.set(x + 1, y, [200, 252, 255]);
  }
}

// ---------- Gavião-de-tempestade: arte ----------
// 0–7 batendo asas, 8 mergulho (asas fechadas), 9 grito (asas abertas, bico aberto), 10 planando
function paintStormHawk(s, pal, f) {
  const dive = f === 8, screech = f === 9, glide = f === 10, ph = (f % 8) / 8 * Math.PI * 2;
  const B = { ol: pal[0], dk: pal[1], md: pal[2], lt: pal[3], belly: pal[4] }, Y = [[170, 120, 30], [240, 200, 60], [255, 240, 150]];
  const cy = 17;
  // asa de trás
  const wingAngle = dive ? 2.6 : screech ? -1.3 : glide ? -0.15 : -Math.cos(ph) * 1.1 - 0.1;
  // Asa: borda de ataque clara e grossa (do ombro ao punho e à ponta), penas da borda de trás
  // serrilhadas e mais escuras, com o canhão de cada pena marcado, e "dedos" abertos na ponta
  const drawWing = (sx, sy, ang, len, near) => {
    const vy = dive ? 0.15 : Math.sin(ang) * 1.15, ux = dive ? -1 : -0.42, n = Math.hypot(ux, vy), u = [ux / n, vy / n];
    const L = len * (dive ? 0.85 : 1) * (near ? 1 : 0.8), tip = [sx + u[0] * L, sy + u[1] * L];
    const wrist = [sx + u[0] * L * 0.48 + 3, sy + u[1] * L * 0.48 - (vy < 0 ? 1 : -1)];
    const rootF = [sx + 4, sy], rootB = [sx - 7, sy + 1.5];
    const perp = [-u[1], u[0]], away = (perp[0] * (rootB[0] - rootF[0]) + perp[1] * (rootB[1] - rootF[1])) > 0 ? 1 : -1; // lado da borda de trás
    const trail = [];
    for (let k = 0; k <= 6; k++) {
      const q = k / 6, b = [lerp(tip[0], rootB[0], q), lerp(tip[1], rootB[1], q)], bump = (k & 1 ? 1.6 : 0) * (1 - q * 0.6);
      trail.push([b[0] + perp[0] * away * bump, b[1] + perp[1] * away * bump]);
    }
    const pts = [rootF, wrist, tip, ...trail];
    const P = near ? [B.ol, B.dk, B.md, B.lt] : [B.ol, B.ol, B.dk, B.md];
    skyFillPoly(s, pts, (x, y) => {
      // distância até a linha ombro-punho-ponta (borda de ataque): perto = claro
      const t = clamp(((x - sx) * u[0] + (y - sy) * u[1]) / L, 0, 1), lead = t < 0.48 ? [lerp(rootF[0], wrist[0], t / 0.48), lerp(rootF[1], wrist[1], t / 0.48)] : [lerp(wrist[0], tip[0], (t - 0.48) / 0.52), lerp(wrist[1], tip[1], (t - 0.48) / 0.52)];
      const d = Math.hypot(x - lead[0], y - lead[1]);
      return d < 1.6 ? P[3] : d < 4 ? P[2] : P[1];
    });
    // canhões das penas de trás
    for (let k = 1; k < 6; k += 2) {
      const a = trail[k], q = k / 6, root = [lerp(wrist[0], rootF[0], q), lerp(wrist[1], rootF[1], q)];
      seg(s, lerp(a[0], root[0], 0.25), lerp(a[1], root[1], 0.25), lerp(a[0], root[0], 0.6), lerp(a[1], root[1], 0.6), 1, P[0]);
    }
    // dedos da ponta
    if (!dive) for (let k = 0; k < 3; k++) {
      const a = Math.atan2(u[1], u[0]) + away * (0.25 + k * 0.28);
      seg(s, tip[0], tip[1], tip[0] + Math.cos(a) * 4, tip[1] + Math.sin(a) * 4, 1, k === 0 ? P[2] : P[1]);
    }
    return tip;
  };
  const far = drawWing(20, cy - 3, wingAngle - 0.2, 14, false);
  // cauda em leque com faixas
  for (let k = -2; k <= 2; k++) seg(s, 13, cy + 1, 4, cy + 1 + k * 1.6 + (dive ? -2 : 0), 2, (k & 1) ? B.lt : B.dk);
  for (let k = -2; k <= 2; k++) s.set(5, Math.round(cy + 1 + k * 1.5), B.belly);
  // corpo
  shadeBall(s, 21, cy, 9, 4.6, (v, dx, dy) => (dy > 0.2 ? (((Math.round(dx * 9) + Math.round(dy * 4)) & 1) && dy > 0.45 ? B.lt : B.belly) : v > 0.65 ? B.lt : v > 0.35 ? B.md : B.dk));
  // cabeça, olho amarelo e bico curvo
  shadeBall(s, 30, cy - 3, 4, 3.6, (v) => (v > 0.6 ? B.lt : v > 0.3 ? B.md : B.dk));
  s.set(31, cy - 4, Y[1]); s.set(32, cy - 4, Y[2]); s.set(31, cy - 5, B.ol); s.set(32, cy - 3, [20, 16, 10]);
  if (screech) { for (const [x, y, c] of [[34, cy - 4, 1], [35, cy - 4, 2], [36, cy - 3, 1], [34, cy - 1, 1], [35, cy - 1, 0], [36, cy - 2, 0]]) s.set(x, y, Y[c]); }
  else for (const [x, y, c] of [[34, cy - 4, 1], [35, cy - 4, 2], [36, cy - 3, 1], [36, cy - 2, 0], [35, cy - 2, 0]]) s.set(x, y, Y[c]);
  // garras amarelas encolhidas
  if (!dive) for (const [x, y] of [[20, cy + 5], [22, cy + 5], [21, cy + 6], [23, cy + 6]]) s.set(x, y, Y[0]);
  // asa da frente e o estalo de eletricidade nas pontas
  const near = drawWing(22, cy - 2, wingAngle, 17, true);
  if (!dive && (f & 1)) for (const [ex, ey] of [near, far]) for (let k = 0; k < 3; k++) s.set(Math.round(ex - 2 + k * 2), Math.round(ey - 2 + ((k * 3 + f) % 4)), SKY_ELECTRIC[k]);
  if (screech) for (let k = 0; k < 5; k++) s.set(Math.round(near[0] - 3 + k), Math.round(near[1] - 3 + (k & 1) * 2), SKY_ELECTRIC[(k + 1) % 3]);
}

// ---------- Medusa-de-vento: arte ----------
// 0–7: o sino pulsa (fecha e abre) e os fios ondulam
function paintWindJelly(s, pal, f) {
  const ph = (f % 8) / 8 * Math.PI * 2, squeeze = Math.sin(ph);
  const cx = 9, rx = 7 - squeeze * 1.2, ry = 6 + squeeze * 1.2, cy = 3 + ry;
  // fios (atrás do sino)
  for (let k = 0; k < 5; k++) {
    const x0 = cx - 4 + k * 2, len = 14 + (k % 2 ? 3 : 0);
    for (let i = 0; i < len; i++) {
      const x = Math.round(x0 + Math.sin(ph + i * 0.45 + k) * (0.6 + i * 0.07)), y = Math.round(cy + 1 + i);
      s.set(x, y, i % 4 === 0 ? pal[4] : k % 2 ? pal[2] : pal[3]);
    }
  }
  // dois braços babados no meio
  for (const side of [-1, 1]) for (let i = 0; i < 9; i++) {
    const x = Math.round(cx + side * 1 + Math.sin(ph * 1.3 + i * 0.6 + side) * 1.3), y = Math.round(cy + 1 + i);
    s.set(x, y, pal[1]); if (i % 2) s.set(x + side, y, pal[2]);
  }
  // sino translúcido: claro na borda, miolo rosado, brilho no alto e uma borda ciano acesa
  for (let y = Math.floor(cy - ry); y <= cy; y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
    const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, d = dx * dx + dy * dy;
    if (d > 1 || dy > 0.05) continue;
    const rim = d > 0.72;
    let c = rim ? pal[3] : d > 0.4 ? pal[2] : pal[1];
    if (dx < -0.2 && dy < -0.45 && d < 0.6) c = pal[4];
    s.set(x, y, c);
  }
  for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) s.set(x, Math.round(cy) + ((x & 1) ? 1 : 0), SKY_GLOWSPOT);
}

// ---------- Comportamento ----------
// Voo livre que respeita os blocos: anda no x e no y separado e desvia quando bate
function skyFly(m, w, dt) {
  const ox = m.x, oy = m.y;
  m.moveX(m.vx * dt, w);
  if (Math.abs(m.x - ox) < Math.abs(m.vx * dt) * 0.5) { m.vx = -m.vx * 0.6; m.blockedT = 0.6; }
  m.moveY(m.vy * dt, w);
  if (Math.abs(m.y - oy) < Math.abs(m.vy * dt) * 0.5) { m.vy = -m.vy * 0.5; m.blockedT = 0.6; }
  m.onGround = false;
}
const skyFrameFlap = (m, rate) => Math.floor(m.clock * rate) % 8;

SHAPE_HOOKS.skyray = {
  paint: paintSkyRay, outline: [20, 18, 46],
  setup(m) { m.baseY = null; m.dir = Math.random() < 0.5 ? -1 : 1; m.wave = Math.random() * 6; m.thinkTimer = 3; },
  frame(m) { return skyFrameFlap(m, m.fleeTimer > 0 ? 7 : 3.2); },
  update(m, dt, w, p) {
    m.clock += dt; m.hurtTimer = Math.max(0, m.hurtTimer - dt); m.fleeTimer = Math.max(0, m.fleeTimer - dt); m.blockedT = Math.max(0, (m.blockedT ?? 0) - dt);
    m.baseY ??= m.y;
    if (m.fleeTimer > 0) m.dir = p.cx < m.cx ? 1 : -1;
    else if ((m.thinkTimer -= dt) <= 0) { m.thinkTimer = 4 + Math.random() * 6; if (Math.random() < 0.3) m.dir = -m.dir; m.baseY += (Math.random() - 0.5) * 6 * T; }
    const fly = m.def.speed * (m.fleeTimer > 0 ? 2.4 : 1);
    m.vx += (m.dir * fly - m.vx) * Math.min(1, dt * 1.5);
    m.wave += dt * 0.9;
    const ty = m.baseY + Math.sin(m.wave) * 2.2 * T;
    m.vy += (clamp((ty - m.y) * 1.5, -60, 60) - m.vy) * Math.min(1, dt * 2);
    if (m.blockedT > 0) m.vy -= 40 * dt;
    skyFly(m, w, dt);
    if (Math.abs(m.vx) > 4) m.facing = Math.sign(m.vx);
    // canto baixinho de vez em quando
    if (Math.random() < dt * 0.04 && Math.abs(m.cx - p.cx) < 30 * T) playSfx('raySong', m.cx, m.cy);
  },
  draw(ctx, m) { drawSkyCreature(ctx, m, Math.sin(m.wave ?? 0) * 0.08); },
};

SHAPE_HOOKS.stormhawk = {
  paint: paintStormHawk, outline: [10, 12, 22],
  setup(m) { m.state = 'circle'; m.stateT = 0; m.orbit = Math.random() * 6; m.diveCd = 3 + Math.random() * 3; m.aware = false; },
  frame(m) {
    if (m.state === 'dive') return 8;
    if (m.state === 'screech') return 9;
    if (m.state === 'circle' && Math.sin(m.clock * 0.9) > 0.4) return 10;
    return skyFrameFlap(m, m.state === 'climb' ? 11 : 7);
  },
  hit(m, damage, fromX) {
    Pig.prototype.hit.call(m, damage, fromX);
    m.vy = -120; m.state = 'climb'; m.stateT = 0; m.aware = true;
  },
  update(m, dt, w, p) {
    const g = game;
    m.clock += dt; m.stateT += dt; m.hurtTimer = Math.max(0, m.hurtTimer - dt); m.diveCd -= dt;
    const dx = p.cx - m.cx, dy = p.cy - m.cy, dist = Math.hypot(dx, dy);
    m.aware = dist < 26 * T;
    m.damage = 0;
    switch (m.state) {
      case 'circle': case 'climb': {
        // rodeia por cima do jogador (ou do lugar onde estava, se ele sumiu)
        m.orbit += dt * (m.state === 'climb' ? 0.6 : 0.8);
        const hx = m.aware ? p.cx : m.home ?? m.cx, hy = (m.aware ? p.cy : m.homeY ?? m.cy) - (m.state === 'climb' ? 10 : 8) * T;
        const tx = hx + Math.cos(m.orbit) * 9 * T, ty = hy + Math.sin(m.orbit * 2) * 1.5 * T;
        m.vx += (clamp((tx - m.cx) * 1.6, -m.def.speed, m.def.speed) - m.vx) * Math.min(1, dt * 2.5);
        m.vy += (clamp((ty - m.cy) * 1.6, -m.def.speed, m.def.speed) - m.vy) * Math.min(1, dt * 2.5);
        if (!m.aware) { m.home ??= m.cx; m.homeY ??= m.cy; }
        if (m.state === 'climb' && m.stateT > 1.6) m.state = 'circle';
        if (m.state === 'circle' && m.aware && m.diveCd <= 0 && m.cy < p.cy - 3 * T && !g.adminGod) { m.state = 'screech'; m.stateT = 0; playSfx('hawkScreech', m.cx, m.cy); }
        if (Math.floor(m.clock * 7) % 8 === 0 && Math.random() < dt * 8) playSfx('hawkFlap', m.cx, m.cy);
        break;
      }
      case 'screech':
        // para no ar, abre as asas e grita: o aviso para sair da frente
        m.vx *= Math.pow(0.02, dt); m.vy *= Math.pow(0.02, dt);
        m.facing = Math.sign(dx) || m.facing;
        if (m.stateT > 0.65) {
          const d = Math.max(1, dist), sp = 430;
          m.diveV = [dx / d * sp, dy / d * sp]; m.state = 'dive'; m.stateT = 0;
          playSfx('hawkDive', m.cx, m.cy);
        }
        break;
      case 'dive': {
        m.vx = m.diveV[0]; m.vy = m.diveV[1];
        if (p.invulnerable <= 0 && !g.adminGod && p.x < m.x + m.w && p.x + p.w > m.x && p.y < m.y + m.h && p.y + p.h > m.y) {
          damageMonsterPlayer(g, 9, m.cx);
          // o mergulho joga longe, na direção em que ele vinha
          p.vx = Math.sign(m.diveV[0] || dx) * 420; p.vy = -260; p.onGround = false;
          g.shake = Math.max(g.shake, 3);
          for (let i = 0; i < 8; i++) skyParticle(g, { x: p.cx, y: p.cy, vx: (Math.random() - 0.5) * 160, vy: (Math.random() - 0.5) * 160, life: 0.3, maxLife: 0.3, color: i & 1 ? '#bff4ff' : '#ffffff', w: 2, h: 2, gravity: 0 });
          m.state = 'climb'; m.stateT = 0; m.diveCd = 3 + Math.random() * 3; m.vy = -200;
        } else if (m.stateT > 1.1 || m.blockedT > 0) { m.state = 'climb'; m.stateT = 0; m.diveCd = 2.5 + Math.random() * 2.5; m.vy = -180; }
        break;
      }
    }
    if (m.hurtTimer > 0 && m.state !== 'dive') m.vy -= 60 * dt;
    m.blockedT = Math.max(0, (m.blockedT ?? 0) - dt);
    skyFly(m, w, dt);
    if (m.state !== 'screech' && Math.abs(m.vx) > 6) m.facing = Math.sign(m.vx);
  },
  draw(ctx, m) {
    const tilt = m.state === 'dive' && m.diveV ? Math.atan2(m.diveV[1], Math.abs(m.diveV[0])) * 0.9 : clamp(m.vy / 400, -0.35, 0.35);
    drawSkyCreature(ctx, m, tilt);
  },
};

SHAPE_HOOKS.windjelly = {
  paint: paintWindJelly, outline: [56, 30, 80],
  setup(m) { m.drift = Math.random() * 6; m.zapCd = 0; },
  frame(m) { return Math.floor(m.clock * 2.4) % 8; },
  update(m, dt, w, p) {
    const g = game;
    m.clock += dt; m.hurtTimer = Math.max(0, m.hurtTimer - dt); m.zapCd -= dt; m.drift += dt * 0.5;
    // pulso: cada fechada do sino dá um empurrãozinho para cima; o vento leva de lado
    const pulse = Math.max(0, Math.sin(m.clock * 2.4 * Math.PI * 2 / 8)) * 34;
    m.vx += ((Math.sin(m.drift) * 14 + (g.weather?.wind || 0.3) * 10) - m.vx) * Math.min(1, dt);
    m.vy += (8 - pulse - m.vy) * Math.min(1, dt * 2);
    skyFly(m, w, dt);
    // choquinho em quem encosta
    if (m.zapCd <= 0 && !g.adminGod && p.invulnerable <= 0 && p.x < m.x + m.w && p.x + p.w > m.x && p.y < m.y + m.h + 10 && p.y + p.h > m.y) {
      m.zapCd = 1.2;
      damageMonsterPlayer(g, 5, m.cx);
      playSfx('jellyZap', m.cx, m.cy);
      for (let i = 0; i < 6; i++) skyParticle(g, { x: m.cx, y: m.cy + 6, vx: (Math.random() - 0.5) * 120, vy: (Math.random() - 0.5) * 120, life: 0.25, maxLife: 0.25, color: '#bff4ff', w: 1, h: 1, gravity: 0 });
    }
  },
  draw(ctx, m) { drawSkyCreature(ctx, m, 0, 0.88); },
};

// Sprite centrado no corpo (eles voam, então o pé não importa), espelhado e inclinado
function drawSkyCreature(ctx, m, tilt = 0, alpha = 1) {
  const frame = wildlifeFrame(m), spr = wildlifeSprite(m.kind, frame), img = m.hurtTimer > 0 ? spr.hurt : spr.normal;
  ctx.save();
  ctx.translate(Math.round(m.cx), Math.round(m.cy));
  ctx.scale(m.facing < 0 ? -1 : 1, 1);
  if (tilt) ctx.rotate(tilt);
  if (alpha < 1) ctx.globalAlpha = alpha;
  ctx.drawImage(img, -Math.round(img.width / 2), -Math.round(img.height / 2));
  ctx.restore();
}

// ---------- Nascimento ----------
// Só na faixa do céu, fora da tela, num vão de ar livre. Arraias de dia e de noite, gaviões
// perto dos ninhais (e mais na chuva), medusas quase só de noite.
const SKY_FAUNA_CAP = { skyray: 3, stormhawk: 2, windjelly: 4 };
function trySpawnSkyCreature(g) {
  const w = g.world, p = g.player, tx0 = clamp(Math.floor(p.cx / T), 0, w.w - 1);
  if (Math.floor(p.cy / T) > w.skyFloor[tx0] + 8) return false;
  const night = 1 - clamp(g.daylight ?? 1, 0, 1), zone = skyZoneAt(w, tx0), rain = g.weather?.rain || 0;
  const near = (k) => g.mobs.filter((m) => m.kind === k && !m.dead && Math.abs(m.cx - p.cx) < 90 * T).length;
  const options = [];
  if (near('skyray') < SKY_FAUNA_CAP.skyray) options.push('skyray', 'skyray');
  if (near('stormhawk') < SKY_FAUNA_CAP.stormhawk + (rain > 0.3 ? 1 : 0)) options.push(...(zone === SKY_ZONE.NINHAL ? ['stormhawk', 'stormhawk', 'stormhawk'] : ['stormhawk']));
  if (near('windjelly') < (night > 0.4 ? SKY_FAUNA_CAP.windjelly : 1)) options.push(...(night > 0.4 ? ['windjelly', 'windjelly', 'windjelly'] : ['windjelly']));
  if (!options.length) return false;
  const kind = options[Math.floor(Math.random() * options.length)];
  for (let n = 0; n < 24; n++) {
    const tx = offScreenColumn(g, Math.random() < 0.5 ? -1 : 1, Math.floor(Math.random() * 12));
    if (tx < 4 || tx >= w.w - 4) continue;
    const ty = Math.floor(p.cy / T) + Math.floor((Math.random() - 0.6) * 30);
    if (ty < 4 || ty > w.skyFloor[tx] - 2) continue;
    let clear = true;
    for (let dy = -2; dy <= 2 && clear; dy++) for (let dx = -2; dx <= 2; dx++) if (w.getTile(tx + dx, ty + dy) !== TILE.AIR) { clear = false; break; }
    if (!clear) continue;
    const m = new Wildlife(kind, tx * T, ty * T);
    if (m.collides(w, m.x, m.y) || !mobOffScreen(g, m, 1)) continue;
    g.mobs.push(m);
    return true;
  }
  return false;
}
// No céu, o lugar dos monstros do chão é dos bichos de lá
{
  const baseSpawn = trySpawnMonster;
  trySpawnMonster = (g) => {
    const w = g.world, p = g.player;
    if (w.skyFloor && Math.floor(p.cy / T) <= w.skyFloor[clamp(Math.floor(p.cx / T), 0, w.w - 1)] + 8) return trySpawnSkyCreature(g);
    return baseSpawn(g);
  };
}
function updateSkyFauna(g, dt) {
  const w = g.world;
  if (!w.skyFloor || g.intro?.active) return;
  if ((g.skyFaunaT = (g.skyFaunaT ?? 2) - dt) <= 0) { g.skyFaunaT = 2.5 + Math.random() * 2; trySpawnSkyCreature(g); }
  // passivos do céu longe demais somem (os do chão já somem em js/mobs.js)
  for (const m of g.mobs) if ((m.kind === 'skyray' || m.kind === 'windjelly') && !mobNearPlayer(g,m,110*T) && mobOffScreen(g, m, 4)) m.despawn = true;
}
{
  const baseSky = updateSky;
  updateSky = (g, dt) => { baseSky(g, dt); updateSkyFauna(g, dt); };
}
// Medusas e as manchas das arraias acendem à noite (depois da camada de luz)
{
  const baseAccents = drawSkyAccents;
  drawSkyAccents = (ctx, g, ox, oy, z) => {
    baseAccents(ctx, g, ox, oy, z);
    const night = 1 - clamp(g.daylight ?? 1, 0, 1);
    if (night < 0.25 || !g.world.skyFloor) return;
    const W = ctx.canvas.width, H = ctx.canvas.height, t = performance.now() / 1000;
    ctx.save(); ctx.imageSmoothingEnabled = true; ctx.globalCompositeOperation = 'lighter';
    for (const m of g.mobs) {
      if (m.kind !== 'windjelly' && m.kind !== 'skyray') continue;
      const sx = m.cx * z - ox, sy = m.cy * z - oy;
      if (sx < -60 || sy < -60 || sx > W + 60 || sy > H + 60) continue;
      const jelly = m.kind === 'windjelly', sz = (jelly ? 54 : 70) * z * (0.9 + Math.sin(t * 2 + m.cx) * 0.1);
      ctx.globalAlpha = (night - 0.25) / 0.75 * (jelly ? 0.9 : 0.55);
      ctx.drawImage(SKY_GLOW, sx - sz / 2, sy - sz / 2 - (jelly ? 6 * z : 0), sz, sz);
    }
    ctx.restore();
  };
}

// Polígono preenchido (regra par-ímpar no centro do pixel); pick(x, y) escolhe a cor
function skyFillPoly(s, pts, pick) {
  let y0 = Infinity, y1 = -Infinity, x0 = Infinity, x1 = -Infinity;
  for (const [x, y] of pts) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
  for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i], [xj, yj] = pts[j];
      if ((yi > y + 0.5) !== (yj > y + 0.5) && x + 0.5 < (xj - xi) * (y + 0.5 - yi) / (yj - yi) + xi) inside = !inside;
    }
    if (inside) { const c = pick(x, y); if (c) s.set(x, y, c); }
  }
}
