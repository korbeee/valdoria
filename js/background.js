'use strict';

// =====================================================================================
//  FUNDO: céu e paisagens em alta resolução
// =====================================================================================
// Ao contrário do resto do jogo, o fundo não é pixel art: é pintado com Canvas 2D na resolução
// da tela (degradês, silhuetas suaves, névoa), como uma pintura atrás do mundo de pixels.
//  - Céu com cores próprias para madrugada, amanhecer, dia, pôr do sol, crepúsculo e noite,
//    variando por bioma; tempestade escurece tudo, fecha o céu de nuvens e solta raios.
//  - Sol segue a direção configurada (ou a hora); lua percorre o céu, estrelas piscam à noite.
//  - Cada bioma tem 4 camadas de paisagem com paralaxe (montanhas, dunas, florestas, mar...),
//    pintadas uma vez numa faixa que repete na horizontal e tingidas na hora pela luz do céu.

const BG_DESIGN_H = 720;   // as medidas abaixo são para uma tela de 720 px de altura
const BG_LAYER_W = 2400;   // largura da faixa de paisagem (repete na horizontal)
// The painters retain their artwork, but their illuminated sides follow the same
// light direction as the playable world. +1 means the source is on the right.
const BG_LIGHT_SIDES = new WeakMap();
const bgLightSide = g => BG_LIGHT_SIDES.get(g) ?? -1;

// ---------- Paletas do céu ----------
// top/mid/hor = zênite, meio e horizonte; glow = halo do sol/lua; fog = cor que tinge a paisagem
// (e quanto: fogFar para a camada do fundo, fogNear para a da frente); cloud = tinta das nuvens
const SKY_MOODS = {
  night: { top: [6, 10, 26], mid: [14, 22, 48], hor: [34, 44, 78], glow: [150, 170, 230], fog: [18, 26, 50], fogFar: 0.72, fogNear: 0.78, cloud: [36, 44, 72], cloudA: 0.7, stars: 1 },
  blue: { top: [20, 30, 70], mid: [58, 70, 124], hor: [150, 132, 170], glow: [210, 170, 200], fog: [70, 72, 118], fogFar: 0.55, fogNear: 0.5, cloud: [110, 104, 150], cloudA: 0.5, stars: 0.4 },
  dawn: { top: [60, 92, 160], mid: [178, 150, 178], hor: [255, 186, 140], glow: [255, 200, 150], fog: [238, 170, 150], fogFar: 0.45, fogNear: 0.2, cloud: [255, 176, 160], cloudA: 0.45, stars: 0 },
  day: { top: [58, 124, 204], mid: [118, 176, 228], hor: [206, 228, 240], glow: [255, 248, 220], fog: [196, 220, 236], fogFar: 0.12, fogNear: 0, cloud: [255, 255, 255], cloudA: 0, stars: 0 },
  golden: { top: [70, 96, 170], mid: [236, 150, 110], hor: [255, 196, 110], glow: [255, 180, 90], fog: [250, 160, 100], fogFar: 0.5, fogNear: 0.26, cloud: [255, 150, 110], cloudA: 0.55, stars: 0 },
  dusk: { top: [30, 30, 80], mid: [120, 72, 130], hor: [236, 110, 90], glow: [255, 130, 110], fog: [110, 70, 120], fogFar: 0.6, fogNear: 0.55, cloud: [150, 86, 130], cloudA: 0.6, stars: 0.3 },
  storm: { top: [34, 38, 48], mid: [58, 64, 76], hor: [96, 102, 112], glow: [180, 186, 196], fog: [72, 78, 90], fogFar: 0.62, fogNear: 0.5, cloud: [70, 76, 88], cloudA: 0.8, stars: 0 },
};
// Hora do dia -> clima de cor (entre duas marcas o céu mistura as duas)
const SKY_KEYS = [[0, 'night'], [4.4, 'night'], [5.3, 'blue'], [6.1, 'dawn'], [7.6, 'day'], [16.2, 'day'], [17.4, 'golden'], [18.3, 'dusk'], [19.3, 'night'], [24, 'night']];
// O dia de cada bioma: deserto mais claro e quente, neve fria, selva úmida e esverdeada...
const BIOME_DAY_SKY = [
  { top: [52, 118, 200], mid: [112, 172, 226], hor: [214, 232, 236], fog: [200, 222, 232] },   // floresta
  { top: [70, 140, 210], mid: [150, 196, 226], hor: [250, 226, 188], fog: [244, 214, 176] },   // deserto
  { top: [70, 130, 200], mid: [150, 190, 230], hor: [226, 238, 248], fog: [214, 228, 242] },   // neve
  { top: [44, 116, 170], mid: [100, 170, 190], hor: [198, 228, 206], fog: [170, 210, 190] },   // selva
  { top: [66, 132, 196], mid: [140, 184, 214], hor: [248, 222, 170], fog: [236, 210, 160] },   // savana
  { top: [30, 112, 206], mid: [90, 170, 234], hor: [200, 234, 250], fog: [186, 222, 244] },    // oceano
  { top:[92,137,193],mid:[168,196,219],hor:[242,220,226],fog:[216,219,223] },                 // cerejeiras
];

const mixC = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const cssC = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
function mixMood(a, b, t) {
  const out = {};
  for (const k in a) out[k] = Array.isArray(a[k]) ? mixC(a[k], b[k], t) : a[k] + (b[k] - a[k]) * t;
  return out;
}

// Céu da hora `hour` no bioma `biome` com `rain` (0..1) de tempestade
function skyMood(hour, biome, rain) {
  let i = 0;
  while (i + 1 < SKY_KEYS.length && SKY_KEYS[i + 1][0] <= hour) i++;
  const [h0, k0] = SKY_KEYS[i], [h1, k1] = SKY_KEYS[Math.min(i + 1, SKY_KEYS.length - 1)];
  const day = (k) => (k === 'day' ? { ...SKY_MOODS.day, ...BIOME_DAY_SKY[biome] } : SKY_MOODS[k]);
  const t = h1 > h0 ? smoothstep(clamp((hour - h0) / (h1 - h0), 0, 1)) : 0;
  let m = mixMood(day(k0), day(k1), t);
  if (rain > 0) {
    // Tempestade: céu fechado e cinza, tão claro quanto a hora permite (à noite continua escuro)
    const light = clamp((m.hor[0] + m.hor[1] + m.hor[2]) / 3 / 220, 0.15, 1);
    const storm = { ...SKY_MOODS.storm };
    for (const k of ['top', 'mid', 'hor', 'fog', 'cloud', 'glow']) storm[k] = mixC(SKY_MOODS.storm[k], m[k], 0.2).map((v) => v * light);
    m = mixMood(m, storm, rain * 0.9);
  }
  return m;
}

// This changes only sky/cloud colors and the explicit per-layer atmospheric fog.
// Neither the world sprites nor a guessed screen-height depth enter this grading.
function goldenSkyMood(mood, game, rain) {
  if(typeof GAME_OPTIONS==='undefined'||!GAME_OPTIONS.shaders||game.adminNightVision||typeof RENDER_STYLE==='undefined')return mood;
  const cfg=RENDER_STYLE.haze, strength=clamp(Number(cfg.strength),0,1);
  const daylight=game.daylight??Math.max(0,Math.sin(game.time*Math.PI*2));
  const daylightWeight=smoothstep(clamp((daylight-.12)/.55,0,1))*(1-rain*.88);
  const color=cfg.color, amount=(1-Math.pow(1-strength,2))*daylightWeight;
  const tintWeight=daylightWeight*Math.min(1,strength*2);
  const m={...mood};
  m.top=mixC(m.top,[color[0]*.63,color[1]*.73,color[2]*.9],amount);
  m.mid=mixC(m.mid,mixC(color,[248,235,184],.25),amount);
  m.hor=mixC(m.hor,mixC(color,[255,240,190],.48),amount);
  m.glow=mixC(m.glow,RENDER_STYLE.sun.color,daylightWeight);
  m.fog=mixC(m.fog,color,tintWeight);
  m.fogFar=lerp(m.fogFar,Math.max(m.fogFar,strength*.96),daylightWeight);
  m.fogNear=lerp(m.fogNear,Math.max(m.fogNear,strength*.2),daylightWeight);
  m.cloud=mixC(m.cloud,mixC(color,[255,246,206],.65),tintWeight);
  m.cloudA=Math.max(m.cloudA,amount*.55);
  return m;
}

// ---------- Ruído periódico para as silhuetas ----------
function bgFbm(x, seed, freq, oct = 4, rough = 0.5) {
  let v = 0, a = 1, n = 0, f = freq;
  for (let o = 0; o < oct; o++) { v += pnoise1((x / BG_LAYER_W) * f, f, seed + o * 31) * a; n += a; a *= rough; f *= 2; }
  return v / n;
}
function bgRidge(x, seed, freq, oct = 4) {
  let v = 0, a = 1, n = 0, f = freq;
  for (let o = 0; o < oct; o++) { v += (1 - Math.abs(pnoise1((x / BG_LAYER_W) * f, f, seed + o * 31) * 2 - 1)) * a; n += a; a *= 0.5; f *= 2; }
  return v / n;
}

// ---------- Pincéis ----------
// Silhueta de terreno: `top(x)` em px de design (0 = alto da camada); degradê de cima para baixo
function terrainPath(g, s, H, top, step = 3) {
  const W = BG_LAYER_W;
  g.beginPath();
  g.moveTo(0, H * s);
  for (let x = 0; x <= W; x += step) g.lineTo(x * s, top(x) * s);
  g.lineTo(W * s, top(W) * s);
  g.lineTo(W * s, H * s);
  g.closePath();
}
function paintTerrain(g, s, H, top, colTop, colBottom, step = 3) {
  const W = BG_LAYER_W;
  terrainPath(g, s, H, top, step);
  let min = H;
  for (let x = 0; x <= W; x += 12) min = Math.min(min, top(x));
  const grad = g.createLinearGradient(0, min * s, 0, H * s);
  grad.addColorStop(0, cssC(colTop));
  grad.addColorStop(1, cssC(colBottom));
  g.fillStyle = grad;
  g.fill();
  return g;
}
// Faces de luz e sombra das montanhas, com a direção do sol, e neve nos picos
// Cada efeito é um polígono entre a crista e uma linha abaixo dela (`depth(x)`), então as bordas
// são limpas e as transições entre face clara e escura são suaves
function shadeMountains(g, s, H, top, lit, dark, snow) {
  const W = BG_LAYER_W, step = 3, xs = [];
  for (let x = 0; x <= W; x += step) xs.push(x);
  const face = xs.map((x) => { let v = 0; for (let k = -3; k <= 3; k++) v += top(x + k * 5 + 5) - top(x + k * 5 - 5); return clamp(v / 50, -1, 1)*-bgLightSide(g); });
  const band = (depth, color, alpha) => {
    g.beginPath();
    xs.forEach((x, i) => (i ? g.lineTo(x * s, top(x) * s) : g.moveTo(x * s, top(x) * s)));
    for (let i = xs.length - 1; i >= 0; i--) g.lineTo(xs[i] * s, (top(xs[i]) + Math.max(0, depth(xs[i], i))) * s);
    g.closePath();
    g.fillStyle = cssC(color, alpha);
    g.fill();
  };
  g.save();
  terrainPath(g, s, H, top);
  g.clip();
  const lumpy = (x) => 0.7 + bgFbm(x, 91, 10, 2) * 0.6;
  band((x, i) => face[i] * 120 * lumpy(x), lit, 0.2);
  band((x, i) => face[i] * 55 * lumpy(x), lit, 0.2);
  band((x, i) => -face[i] * 150 * lumpy(x), dark, 0.22);
  band((x, i) => -face[i] * 70 * lumpy(x), dark, 0.18);
  if (snow) {
    const depth = (x) => { const y = top(x); return y < snow.line ? (snow.line - y) * 0.55 + 5 + (bgFbm(x, 93, 60, 3) - 0.5) * 18 : 0; };
    band((x) => depth(x), snow.color, 0.95);
    band((x, i) => depth(x) * smoothstep(clamp(-face[i] * 3, 0, 1)), snow.shade, 0.75);
  }
  g.restore();
}
function disk(g, x, y, r) { g.moveTo(x + r, y); g.arc(x, y, r, 0, Math.PI * 2); }
// Pinheiro: andares de galhos em triângulo, um pouco tortos; `snow` põe neve em cada andar
function pine(g, s, x, base, h, col, snowCol) {
  const tiers = 4, w = h * 0.36;
  g.fillStyle = cssC(shade(col, 0.8));
  g.fillRect((x - h * 0.03) * s, (base - h * 0.2) * s, h * 0.06 * s, h * 0.2 * s);
  for (let i = 0; i < tiers; i++) {
    const ty = base - h * 0.14 - (h * 0.86) * (i / tiers), tw = w * (1 - i / (tiers + 0.6));
    g.fillStyle = cssC(col);
    g.beginPath();
    g.moveTo((x - tw) * s, ty * s);
    g.quadraticCurveTo(x * s, (ty - h * 0.08) * s, (x + tw) * s, ty * s);
    g.lineTo(x * s, (ty - h * 0.36) * s);
    g.closePath();
    g.fill();
    if (snowCol) {
      g.fillStyle = cssC(snowCol);
      g.beginPath();
      g.moveTo((x - tw * 0.55) * s, (ty - h * 0.14) * s);
      g.lineTo(x * s, (ty - h * 0.34) * s);
      g.lineTo((x + tw * 0.2) * s, (ty - h * 0.2) * s);
      g.quadraticCurveTo(x * s, (ty - h * 0.12) * s, (x - tw * 0.55) * s, (ty - h * 0.14) * s);
      g.fill();
    }
  }
}
// Árvore de copa redonda: tronco e um cacho de bolas, com o lado do sol mais claro
function roundTree(g, s, x, base, h, col, lit, rnd) {
  g.fillStyle = cssC(shade(col, 0.7));
  g.fillRect((x - h * 0.04) * s, (base - h * 0.5) * s, h * 0.08 * s, h * 0.5 * s);
  const r = h * 0.28;
  const puffs = Array.from({ length: 7 }, () => [x + (rnd() - 0.5) * r * 1.6, base - h * 0.62 + (rnd() - 0.5) * r * 1.1, r * (0.55 + rnd() * 0.4)]);
  g.fillStyle = cssC(col);
  g.beginPath();
  for (const [px, py, pr] of puffs) disk(g, px * s, py * s, pr * s);
  g.fill();
  g.fillStyle = cssC(lit, 0.55);
  g.beginPath();
  for (const [px, py, pr] of puffs) disk(g, (px + bgLightSide(g) * pr * 0.25) * s, (py - pr * 0.3) * s, pr * 0.62 * s);
  g.fill();
}
// Coqueiro: tronco curvo e folhas em arco
function palm(g, s, x, base, h, col, rnd) {
  const lean = (rnd() - 0.5) * h * 0.5, topX = x + lean, topY = base - h;
  g.strokeStyle = cssC(shade(col, 0.85));
  g.lineWidth = Math.max(1, h * 0.05 * s);
  g.beginPath();
  g.moveTo(x * s, base * s);
  g.quadraticCurveTo((x + lean * 0.1) * s, (base - h * 0.5) * s, topX * s, topY * s);
  g.stroke();
  g.fillStyle = cssC(col);
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i / 6 - 0.5) * Math.PI * 1.5, len = h * (0.34 + rnd() * 0.12);
    const ex = topX + Math.cos(a) * len, ey = topY + Math.sin(a) * len * 0.55 + len * 0.35;
    g.beginPath();
    g.moveTo(topX * s, topY * s);
    g.quadraticCurveTo((topX + Math.cos(a) * len * 0.6) * s, (topY + Math.sin(a) * len * 0.6 - len * 0.2) * s, ex * s, ey * s);
    g.quadraticCurveTo((topX + Math.cos(a) * len * 0.5) * s, (topY + Math.sin(a) * len * 0.5 - len * 0.05) * s, topX * s, topY * s);
    g.fill();
  }
}
// Acácia da savana: tronco que abre em galhos e copa larga e achatada
function acacia(g, s, x, base, h, col, lit, rnd) {
  g.strokeStyle = cssC(shade(col, 0.8));
  g.lineCap = 'round';
  g.lineWidth = Math.max(1, h * 0.06 * s);
  const fork = base - h * 0.45;
  g.beginPath();
  g.moveTo(x * s, base * s); g.lineTo(x * s, fork * s);
  g.moveTo(x * s, fork * s); g.quadraticCurveTo((x - h * 0.2) * s, (fork - h * 0.2) * s, (x - h * 0.45) * s, (base - h * 0.88) * s);
  g.moveTo(x * s, fork * s); g.quadraticCurveTo((x + h * 0.15) * s, (fork - h * 0.25) * s, (x + h * 0.4) * s, (base - h * 0.92) * s);
  g.stroke();
  const w = h * (1 + rnd() * 0.3);
  g.fillStyle = cssC(col);
  g.beginPath();
  for (let i = 0; i < 6; i++) g.ellipse((x - w * 0.5 + (i + 0.5) * w / 6) * s, (base - h * 0.95 + (rnd() - 0.5) * h * 0.08) * s, w * 0.16 * s, h * 0.12 * s, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = cssC(lit, 0.45);
  g.beginPath();
  g.ellipse(x * s, (base - h * 1.0) * s, w * 0.45 * s, h * 0.05 * s, 0, 0, Math.PI * 2);
  g.fill();
}
// Cacto saguaro: tronco arredondado com dois braços
function saguaro(g, s, x, base, h, col, rnd) {
  const w = h * 0.12;
  g.strokeStyle = cssC(col);
  g.lineCap = 'round';
  g.lineWidth = w * s;
  g.beginPath();
  g.moveTo(x * s, base * s); g.lineTo(x * s, (base - h) * s);
  const arm = (dir, y0, hh) => { g.moveTo(x * s, y0 * s); g.lineTo((x + dir * h * 0.25) * s, y0 * s); g.lineTo((x + dir * h * 0.25) * s, (y0 - hh) * s); };
  arm(-1, base - h * (0.4 + rnd() * 0.15), h * 0.3);
  if (rnd() < 0.8) arm(1, base - h * (0.5 + rnd() * 0.15), h * 0.25);
  g.stroke();
}
// Árvore gigante da selva: tronco fino e alto com copas em camadas e cipós pendurados
function jungleTree(g, s, x, base, h, col, lit, rnd) {
  g.fillStyle = cssC(shade(col, 0.72));
  g.fillRect((x - h * 0.025) * s, (base - h * 0.85) * s, h * 0.05 * s, h * 0.85 * s);
  for (let k = 0; k < 3; k++) {
    const cy = base - h * (0.72 + k * 0.12), r = h * (0.22 - k * 0.04);
    const puffs = Array.from({ length: 5 }, () => [x + (rnd() - 0.5) * r * 2.2, cy + (rnd() - 0.5) * r * 0.5, r * (0.5 + rnd() * 0.3)]);
    g.fillStyle = cssC(shade(col, 1 - k * 0.04));
    g.beginPath();
    for (const [px, py, pr] of puffs) g.ellipse(px * s, py * s, pr * s, pr * 0.62 * s, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = cssC(lit, 0.4);
    g.beginPath();
    for (const [px, py, pr] of puffs) g.ellipse((px + bgLightSide(g) * pr * 0.2) * s, (py - pr * 0.25) * s, pr * 0.6 * s, pr * 0.3 * s, 0, 0, Math.PI * 2);
    g.fill();
  }
  g.strokeStyle = cssC(shade(col, 0.85), 0.8);
  g.lineWidth = Math.max(0.6, 1.2 * s);
  for (let i = 0; i < 4; i++) {
    const vx = x + (rnd() - 0.5) * h * 0.4, vy = base - h * 0.7, len = h * (0.15 + rnd() * 0.3);
    g.beginPath(); g.moveTo(vx * s, vy * s); g.quadraticCurveTo((vx + 4) * s, (vy + len * 0.5) * s, (vx - 2) * s, (vy + len) * s); g.stroke();
  }
}

// ---------- Camadas de cada bioma ----------
// h = altura da camada (px de design); f = paralaxe; drop = quanto a base fica abaixo do horizonte;
// paint(g, s, rnd) pinta a camada; base = cor que continua embaixo da camada
const BG_BIOMES = [
  // Floresta: montanhas azuladas com neve, serra com pinheiros, colinas e a mata de copas redondas
  [
    { h: 380, f: 0.04, drop: -34, base: [118, 150, 176], paint(g, s) {
      const top = (x) => 60 + (1 - Math.pow(bgRidge(x, 11, 4), 2.2)) * 290;
      paintTerrain(g, s, 380, top, [150, 176, 204], [118, 150, 176]);
      shadeMountains(g, s, 380, top, [255, 250, 230], [60, 80, 120], { line: 150, color: [236, 242, 250], shade: [180, 196, 222] });
    } },
    { h: 260, f: 0.1, drop: 20, base: [84, 124, 118], paint(g, s, rnd) {
      const top = (x) => 120 + bgFbm(x, 21, 6) * 110;
      paintTerrain(g, s, 260, top, [104, 142, 138], [84, 124, 118]);
      for (let i = 0; i < 180; i++) { const x = rnd() * BG_LAYER_W; pine(g, s, x, top(x) + 14, 26 + rnd() * 30, [74, 112, 108]); }
    } },
    { h: 220, f: 0.18, drop: 44, base: [62, 104, 70], paint(g, s, rnd) {
      const top = (x) => 80 + bgFbm(x, 31, 4) * 90;
      paintTerrain(g, s, 220, top, [84, 130, 84], [62, 104, 70]);
      for (let i = 0; i < 110; i++) { const x = rnd() * BG_LAYER_W; roundTree(g, s, x, top(x) + 16, 40 + rnd() * 34, [66, 112, 72], [120, 168, 100], rnd); }
    } },
    { h: 230, f: 0.3, drop: 80, base: [36, 70, 44], paint(g, s, rnd) {
      const top = (x) => 130 + bgFbm(x, 41, 5) * 60;
      paintTerrain(g, s, 230, top, [48, 88, 54], [36, 70, 44]);
      for (let i = 0; i < 90; i++) { const x = rnd() * BG_LAYER_W; roundTree(g, s, x, top(x) + 20, 70 + rnd() * 60, [44, 84, 52], [96, 150, 84], rnd); }
      for (let i = 0; i < 26; i++) { const x = rnd() * BG_LAYER_W; pine(g, s, x, top(x) + 20, 90 + rnd() * 50, [38, 76, 50]); }
    } },
  ],
  // Deserto: mesetas com estratos ao longe, dunas macias e cactos
  [
    { h: 320, f: 0.04, drop: -4, base: [206, 150, 124], paint(g, s) {
      // Mesetas: onde o ruído passa do limite o terreno sobe até um platô, com encosta de talude
      const top = (x) => { const n = bgFbm(x, 51, 6, 3), m = smoothstep(clamp((n - 0.47) * 9, 0, 1)); return lerp(250, 120, m) + (bgFbm(x, 52, 60, 2) - 0.5) * (6 + m * 8); };
      paintTerrain(g, s, 320, top, [222, 170, 140], [206, 150, 124], 2);
      g.save(); terrainPath(g, s, 320, top, 2); g.clip(); g.globalAlpha = 0.16; // estratos da rocha
      for (let y = 100; y < 320; y += 14) { g.fillStyle = cssC(y % 28 ? [170, 110, 96] : [240, 196, 160]); g.fillRect(0, y * s, BG_LAYER_W * s, 5 * s); }
      g.restore();
      shadeMountains(g, s, 320, top, [255, 230, 200], [150, 90, 90]);
    } },
    { h: 220, f: 0.1, drop: 18, base: [224, 176, 118], paint(g, s) {
      const top = (x) => 90 + Math.sin(x / BG_LAYER_W * Math.PI * 2 * 7) * 26 + bgFbm(x, 61, 5) * 60;
      paintTerrain(g, s, 220, top, [240, 196, 136], [224, 176, 118]);
      shadeMountains(g, s, 220, top, [255, 236, 190], [190, 120, 90]);
    } },
    { h: 220, f: 0.18, drop: 40, base: [214, 160, 98], paint(g, s, rnd) {
      const top = (x) => 110 + Math.sin(x / BG_LAYER_W * Math.PI * 2 * 5 + 1) * 30 + bgFbm(x, 71, 4) * 40;
      paintTerrain(g, s, 220, top, [232, 184, 118], [214, 160, 98]);
      shadeMountains(g, s, 220, top, [255, 230, 176], [176, 104, 70]);
      for (let i = 0; i < 26; i++) { const x = rnd() * BG_LAYER_W; saguaro(g, s, x, top(x) + 8, 30 + rnd() * 26, [132, 132, 84], rnd); }
    } },
    { h: 200, f: 0.3, drop: 76, base: [178, 124, 76], paint(g, s, rnd) {
      const top = (x) => 120 + bgFbm(x, 81, 4) * 50;
      paintTerrain(g, s, 200, top, [206, 150, 96], [178, 124, 76]);
      for (let i = 0; i < 30; i++) {
        const x = rnd() * BG_LAYER_W, y = top(x), r = 10 + rnd() * 22;
        g.fillStyle = cssC([150, 104, 80]); g.beginPath(); g.ellipse(x * s, (y + 4) * s, r * 1.4 * s, r * s, 0, Math.PI, 0); g.fill();
        g.fillStyle = cssC([196, 150, 110], 0.6); g.beginPath(); g.ellipse((x + bgLightSide(g) * r * 0.3) * s, (y + 2 - r * 0.4) * s, r * 0.7 * s, r * 0.35 * s, 0, 0, Math.PI * 2); g.fill();
      }
      for (let i = 0; i < 18; i++) { const x = rnd() * BG_LAYER_W; saguaro(g, s, x, top(x) + 10, 60 + rnd() * 40, [100, 112, 70], rnd); }
    } },
  ],
  // Neve: picos gelados enormes, serras brancas e pinheiros carregados de neve
  [
    { h: 420, f: 0.04, drop: -8, base: [170, 190, 216], paint(g, s) {
      const top = (x) => 30 + (1 - Math.pow(bgRidge(x, 111, 4), 2.2)) * 340;
      paintTerrain(g, s, 420, top, [200, 214, 234], [170, 190, 216]);
      shadeMountains(g, s, 420, top, [255, 255, 255], [90, 110, 160], { line: 260, color: [246, 250, 255], shade: [176, 194, 228] });
    } },
    { h: 280, f: 0.1, drop: 18, base: [150, 176, 206], paint(g, s, rnd) {
      const top = (x) => 50 + (1 - Math.pow(bgRidge(x, 121, 6), 1.8)) * 190;
      paintTerrain(g, s, 280, top, [196, 212, 232], [150, 176, 206]);
      shadeMountains(g, s, 280, top, [255, 255, 255], [100, 124, 170], { line: 200, color: [240, 246, 255], shade: [186, 202, 232] });
      for (let i = 0; i < 90; i++) { const x = rnd() * BG_LAYER_W; pine(g, s, x, top(x) + 30, 20 + rnd() * 18, [96, 126, 150], [224, 234, 246]); }
    } },
    { h: 230, f: 0.18, drop: 42, base: [206, 220, 238], paint(g, s, rnd) {
      const top = (x) => 100 + bgFbm(x, 131, 4) * 70;
      paintTerrain(g, s, 230, top, [232, 240, 250], [206, 220, 238]);
      for (let i = 0; i < 130; i++) { const x = rnd() * BG_LAYER_W; pine(g, s, x, top(x) + 12, 36 + rnd() * 36, [62, 96, 104], [236, 244, 252]); }
    } },
    { h: 220, f: 0.3, drop: 78, base: [214, 226, 242], paint(g, s, rnd) {
      const top = (x) => 130 + bgFbm(x, 141, 4) * 50;
      paintTerrain(g, s, 220, top, [244, 248, 255], [214, 226, 242]);
      for (let i = 0; i < 60; i++) { const x = rnd() * BG_LAYER_W; pine(g, s, x, top(x) + 16, 70 + rnd() * 60, [40, 72, 80], [244, 250, 255]); }
    } },
  ],
  // Selva: morros de pedra altos e arredondados na névoa (como carste), copas gigantes e cipós
  [
    { h: 400, f: 0.04, drop: -6, base: [120, 168, 156], paint(g, s, rnd) {
      g.fillStyle = cssC([136, 180, 166]);
      for (let i = 0; i < 26; i++) {
        const x = rnd() * BG_LAYER_W, w = 50 + rnd() * 70, top = 60 + rnd() * 200;
        for (const dx of [0, BG_LAYER_W, -BG_LAYER_W]) {
          g.beginPath();
          g.moveTo((x + dx - w) * s, 400 * s);
          g.bezierCurveTo((x + dx - w) * s, (top + 40) * s, (x + dx - w * 0.6) * s, top * s, (x + dx) * s, top * s);
          g.bezierCurveTo((x + dx + w * 0.6) * s, top * s, (x + dx + w) * s, (top + 40) * s, (x + dx + w) * s, 400 * s);
          g.fill();
        }
      }
      paintTerrain(g, s, 400, (x) => 330 + bgFbm(x, 151, 6) * 40, [120, 168, 156], [120, 168, 156]);
    } },
    { h: 300, f: 0.1, drop: 18, base: [76, 130, 110], paint(g, s, rnd) {
      for (let i = 0; i < 18; i++) {
        const x = rnd() * BG_LAYER_W, w = 60 + rnd() * 70, top = 50 + rnd() * 120;
        for (const dx of [0, BG_LAYER_W, -BG_LAYER_W]) {
          const grad = g.createLinearGradient(0, top * s, 0, 300 * s);
          grad.addColorStop(0, cssC([96, 150, 124])); grad.addColorStop(1, cssC([76, 130, 110]));
          g.fillStyle = grad;
          g.beginPath();
          g.moveTo((x + dx - w) * s, 300 * s);
          g.bezierCurveTo((x + dx - w) * s, (top + 30) * s, (x + dx - w * 0.5) * s, top * s, (x + dx) * s, top * s);
          g.bezierCurveTo((x + dx + w * 0.5) * s, top * s, (x + dx + w) * s, (top + 30) * s, (x + dx + w) * s, 300 * s);
          g.fill();
          g.fillStyle = cssC([70, 124, 92], 0.8);
          g.beginPath();
          for (let k = 0; k < 7; k++) disk(g, (x + dx + (rnd() - 0.5) * w) * s, (top + 10 + rnd() * 30) * s, (8 + rnd() * 10) * s);
          g.fill();
        }
      }
      paintTerrain(g, s, 300, (x) => 230 + bgFbm(x, 161, 6) * 40, [76, 130, 110], [76, 130, 110]);
    } },
    { h: 260, f: 0.18, drop: 40, base: [44, 96, 64], paint(g, s, rnd) {
      const top = (x) => 150 + bgFbm(x, 171, 5) * 50;
      paintTerrain(g, s, 260, top, [58, 112, 74], [44, 96, 64]);
      for (let i = 0; i < 40; i++) { const x = rnd() * BG_LAYER_W; jungleTree(g, s, x, top(x) + 10, 110 + rnd() * 90, [52, 104, 68], [120, 180, 110], rnd); }
      for (let i = 0; i < 30; i++) { const x = rnd() * BG_LAYER_W; palm(g, s, x, top(x) + 10, 50 + rnd() * 30, [48, 100, 62], rnd); }
    } },
    { h: 240, f: 0.3, drop: 78, base: [24, 60, 40], paint(g, s, rnd) {
      const top = (x) => 120 + bgFbm(x, 181, 5) * 60;
      paintTerrain(g, s, 240, top, [34, 76, 48], [24, 60, 40]);
      for (let i = 0; i < 80; i++) { const x = rnd() * BG_LAYER_W; roundTree(g, s, x, top(x) + 24, 70 + rnd() * 70, [30, 72, 46], [80, 140, 80], rnd); }
      for (let i = 0; i < 16; i++) { const x = rnd() * BG_LAYER_W; palm(g, s, x, top(x) + 20, 90 + rnd() * 50, [28, 70, 44], rnd); }
    } },
  ],
  // Savana: planalto baixo ao longe, colinas douradas e acácias de copa chata
  [
    { h: 300, f: 0.04, drop: -4, base: [186, 150, 150], paint(g, s) {
      const top = (x) => { const n = bgFbm(x, 201, 4, 3); return 170 + (n > 0.55 ? -60 * smoothstep(clamp((n - 0.55) * 8, 0, 1)) : 0) + bgFbm(x, 202, 30, 2) * 12; };
      paintTerrain(g, s, 300, top, [200, 166, 160], [186, 150, 150], 2);
      shadeMountains(g, s, 300, top, [255, 230, 200], [130, 100, 120]);
    } },
    { h: 230, f: 0.1, drop: 18, base: [196, 164, 100], paint(g, s, rnd) {
      const top = (x) => 110 + bgFbm(x, 211, 4) * 70;
      paintTerrain(g, s, 230, top, [214, 184, 116], [196, 164, 100]);
      for (let i = 0; i < 24; i++) { const x = rnd() * BG_LAYER_W; acacia(g, s, x, top(x) + 8, 24 + rnd() * 12, [120, 110, 70], [180, 170, 110], rnd); }
    } },
    { h: 220, f: 0.18, drop: 40, base: [184, 148, 76], paint(g, s, rnd) {
      const top = (x) => 120 + bgFbm(x, 221, 4) * 50;
      paintTerrain(g, s, 220, top, [206, 170, 92], [184, 148, 76]);
      for (let i = 0; i < 20; i++) { const x = rnd() * BG_LAYER_W; acacia(g, s, x, top(x) + 10, 46 + rnd() * 20, [86, 84, 50], [150, 150, 90], rnd); }
    } },
    { h: 220, f: 0.3, drop: 76, base: [150, 116, 56], paint(g, s, rnd) {
      const top = (x) => 140 + bgFbm(x, 231, 5) * 40;
      paintTerrain(g, s, 220, top, [176, 138, 66], [150, 116, 56]);
      g.strokeStyle = cssC([196, 160, 80], 0.8); g.lineWidth = Math.max(1, 1.4 * s);
      for (let i = 0; i < 900; i++) { const x = rnd() * BG_LAYER_W, y = top(x) + 2, hh = 6 + rnd() * 12; g.beginPath(); g.moveTo(x * s, (y + 4) * s); g.lineTo((x + (rnd() - 0.5) * 6) * s, (y - hh) * s); g.stroke(); }
      for (let i = 0; i < 8; i++) { const x = rnd() * BG_LAYER_W; acacia(g, s, x, top(x) + 14, 90 + rnd() * 30, [60, 56, 34], [120, 116, 70], rnd); }
    } },
  ],
  // Oceano: ilhas com coqueiros no horizonte e o mar com brilhos
  [
    { h: 240, f: 0.03, drop: -4, base: [104, 150, 190], paint(g, s, rnd) {
      for (let i = 0; i < 6; i++) {
        const x = rnd() * BG_LAYER_W, w = 80 + rnd() * 160, hh = 20 + rnd() * 60;
        g.fillStyle = cssC([100, 140, 150]);
        g.beginPath(); g.ellipse(x * s, 200 * s, w * s, hh * s, 0, Math.PI, 0); g.fill();
        for (let k = 0; k < 3; k++) palm(g, s, x + (rnd() - 0.5) * w, 200 - hh * 0.7, 20 + rnd() * 14, [80, 120, 130], rnd);
      }
      const grad = g.createLinearGradient(0, 196 * s, 0, 240 * s);
      grad.addColorStop(0, cssC([150, 196, 222])); grad.addColorStop(1, cssC([104, 150, 190]));
      g.fillStyle = grad; g.fillRect(0, 196 * s, BG_LAYER_W * s, 44 * s);
    } },
    { h: 120, f: 0.08, drop: 76, base: [60, 118, 170], paint(g, s, rnd) {
      const grad = g.createLinearGradient(0, 0, 0, 120 * s);
      grad.addColorStop(0, cssC([96, 150, 196])); grad.addColorStop(1, cssC([60, 118, 170]));
      g.fillStyle = grad; g.fillRect(0, 0, BG_LAYER_W * s, 120 * s);
      for (let i = 0; i < 700; i++) {
        const y = rnd() * 120, x = rnd() * BG_LAYER_W, len = 6 + rnd() * 22 * (0.4 + y / 120);
        g.fillStyle = cssC([220, 240, 250], 0.25 + rnd() * 0.3); g.fillRect(x * s, y * s, len * s, Math.max(1, (0.6 + y / 80) * s));
      }
    } },
    { h: 110, f: 0.16, drop: 130, base: [40, 96, 150], paint(g, s, rnd) {
      const grad = g.createLinearGradient(0, 0, 0, 110 * s);
      grad.addColorStop(0, cssC([54, 112, 164])); grad.addColorStop(1, cssC([40, 96, 150]));
      g.fillStyle = grad;
      g.beginPath(); g.moveTo(0, 110 * s);
      for (let x = 0; x <= BG_LAYER_W; x += 4) g.lineTo(x * s, (10 + Math.sin(x / BG_LAYER_W * Math.PI * 2 * 40) * 3 + bgFbm(x, 301, 20, 2) * 8) * s);
      g.lineTo(BG_LAYER_W * s, 110 * s); g.fill();
      for (let i = 0; i < 500; i++) {
        const y = 14 + rnd() * 96, x = rnd() * BG_LAYER_W;
        g.fillStyle = cssC([200, 230, 246], 0.2 + rnd() * 0.25); g.fillRect(x * s, y * s, (10 + rnd() * 30) * s, Math.max(1, 1.4 * s));
      }
    } },
  ],
];

// Vale das Cerejeiras: picos frios, colinas verde-água e bosques em flor.
BG_BIOMES.push([
  {h:380,f:.04,drop:-24,base:[126,151,174],paint(g,s){
    const top=x=>55+(1-Math.pow(bgRidge(x,271,3),2.7))*285;
    paintTerrain(g,s,380,top,[167,184,203],[126,151,174]);
    shadeMountains(g,s,380,top,[246,232,238],[98,118,153],{line:147,color:[239,241,246],shade:[194,210,225]});
  }},
  {h:260,f:.1,drop:20,base:[91,137,133],paint(g,s,rnd){
    const top=x=>110+bgFbm(x,281,5)*112;
    paintTerrain(g,s,260,top,[131,171,156],[91,137,133]);
    for(let i=0;i<110;i++){const x=rnd()*BG_LAYER_W;roundTree(g,s,x,top(x)+12,30+rnd()*32,[150,135,153],[201,166,181],rnd);}
  }},
  {h:235,f:.18,drop:45,base:[64,118,104],paint(g,s,rnd){
    const top=x=>100+bgFbm(x,291,4)*83;
    paintTerrain(g,s,235,top,[97,153,126],[64,118,104]);
    for(let i=0;i<95;i++){const x=rnd()*BG_LAYER_W;roundTree(g,s,x,top(x)+20,48+rnd()*35,[155,111,137],[218,160,184],rnd);}
  }},
  {h:230,f:.3,drop:82,base:[39,87,74],paint(g,s,rnd){
    const top=x=>130+bgFbm(x,301,5)*53;
    paintTerrain(g,s,230,top,[64,119,96],[39,87,74]);
    for(let i=0;i<66;i++){const x=rnd()*BG_LAYER_W;roundTree(g,s,x,top(x)+20,65+rnd()*48,[132,78,107],[211,140,169],rnd);}
  }},
]);

// ---------- Nuvens macias ----------
function paintSoftCloud(seed, s, dark, lightSide=-1) {
  const rnd = mulberry32(seed), W = 240 + rnd() * 220, H = 110;
  const c = makeCanvas(Math.ceil((W + 40) * s), Math.ceil((H + 40) * s)), g = c.getContext('2d');
  const puffs = [];
  const n = 9 + Math.floor(rnd() * 8);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), r = (26 + rnd() * 30) * (1 - Math.abs(t - 0.5) * 0.9);
    puffs.push([20 + 30 + t * (W - 60), 20 + H - 30 - r * (0.6 + rnd() * 0.5), r]);
  }
  g.filter = `blur(${Math.max(0.5, 2.2 * s)}px)`;
  // Corpo (base azulada) e depois o topo iluminado
  g.fillStyle = cssC(dark ? [150, 156, 168] : [204, 214, 232]);
  g.beginPath();
  for (const [x, y, r] of puffs) disk(g, x * s, y * s, r * s);
  g.fill();
  g.fillStyle = cssC(dark ? [190, 196, 206] : [255, 255, 255]);
  g.beginPath();
  for (const [x, y, r] of puffs) disk(g, (x + lightSide * r * 0.12) * s, (y - r * 0.2) * s, r * 0.82 * s);
  g.fill();
  g.filter = 'none';
  return c;
}

// ---------- Estrelas e Via Láctea (pintadas uma vez) ----------
function paintStarfield(W, H, s) {
  const c = makeCanvas(W, H), g = c.getContext('2d'), rnd = mulberry32(777);
  // Via Láctea: faixa diagonal de poeira clara com pontinhos
  g.save();
  g.translate(W * 0.5, H * 0.3); g.rotate(-0.35);
  const band = g.createLinearGradient(0, -H * 0.16, 0, H * 0.16);
  band.addColorStop(0, 'rgba(160,170,230,0)'); band.addColorStop(0.5, 'rgba(190,190,240,0.16)'); band.addColorStop(1, 'rgba(160,170,230,0)');
  g.fillStyle = band; g.fillRect(-W, -H * 0.16, W * 2, H * 0.32);
  for (let i = 0; i < 1400; i++) {
    const x = (rnd() - 0.5) * W * 2, y = (rnd() + rnd() + rnd() - 1.5) * H * 0.1;
    g.fillStyle = `rgba(230,230,255,${0.1 + rnd() * 0.35})`; g.fillRect(x, y, s * 0.9, s * 0.9);
  }
  g.restore();
  for (let i = 0; i < 380; i++) {
    const x = rnd() * W, y = rnd() * H * 0.75, r = (rnd() < 0.08 ? 1.6 : 0.5 + rnd() * 0.8) * s;
    g.fillStyle = `rgba(${230 + rnd() * 25},${230 + rnd() * 25},255,${0.4 + rnd() * 0.6})`;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  return c;
}

class Background {
  constructor(seed) {
    this.seed = seed;
    this.scale = 0;
    this.biomeLayers = new Map();
    this.tinted = new Map(); // camada da paisagem -> cópia já tingida pela névoa do céu atual
    this.activeBiome = null; this.previousBiome = null; this.blend = 1;
    this.lastDraw = performance.now();
    this.scratch = null;
    this.bolt = null; this.lastFlash = 0;
    const rnd = mulberry32(seed + 5);
    this.cloudSlots = Array.from({ length: 11 }, (_, i) => ({ sprite: i % 8, x: rnd() * 3000, y: 30 + rnd() * 230, f: 0.015 + rnd() * 0.035, speed: 6 + rnd() * 10, k: 0.7 + rnd() * 0.6 }));
    this.twinkle = Array.from({ length: 60 }, () => ({ x: rnd(), y: rnd() * 0.6, p: rnd() * 6, r: 0.8 + rnd() * 1.2 }));
  }

  // Tudo que depende do tamanho da tela é refeito quando a altura muda bastante
  ensureScale(W, H, lightSide=-1) {
    const s = Math.round(clamp(H / BG_DESIGN_H, 0.5, 2.5) * 8) / 8;
    if (s === this.scale && this.lightSide===lightSide && this.stars?.width === W && this.stars?.height === H) return;
    this.scale = s;
    this.lightSide=lightSide;
    this.biomeLayers.clear();
    this.clouds = Array.from({ length: 8 }, (_, i) => paintSoftCloud(this.seed * 7 + i * 13, s, false,lightSide));
    this.stormClouds = Array.from({ length: 4 }, (_, i) => paintSoftCloud(this.seed * 5 + i * 17, s * 1.6, true,lightSide));
    this.stars = paintStarfield(W, H, s);
  }

  layersFor(biome) {
    if (!this.biomeLayers.has(biome)) {
      const s = this.scale;
      this.biomeLayers.set(biome, BG_BIOMES[biome].map((L, i) => {
        const c = makeCanvas(Math.ceil(BG_LAYER_W * s), Math.ceil(L.h * s));
        const painter=c.getContext('2d');BG_LIGHT_SIDES.set(painter,this.lightSide??-1);
        L.paint(painter, s, mulberry32(this.seed + biome * 101 + i * 17));
        return { canvas: c, L, depth: i / (BG_BIOMES[biome].length - 1) };
      }));
    }
    return this.biomeLayers.get(biome);
  }

  draw(ctx, game, W, H, z) {
    if (!W || !H) return; // janela minimizada/aba escondida: canvas sem tamanho
    const styled=typeof GAME_OPTIONS!=='undefined'&&GAME_OPTIONS.shaders&&!game.adminNightVision&&typeof RENDER_STYLE!=='undefined';
    const lightSide=styled&&typeof shaderSunStep==='function'?(shaderSunStep(game.time)<0?1:-1):-1;
    this.ensureScale(W, H,lightSide);
    const s = this.scale;
    const biome = game.world.biomeAt(Math.floor((game.cam.x + W / z / 2) / T));
    const now = performance.now(), dt = Math.min(0.1, (now - this.lastDraw) / 1000);
    this.lastDraw = now;
    if (this.activeBiome === null) this.activeBiome = biome;
    if (biome !== this.activeBiome) { this.previousBiome = this.activeBiome; this.activeBiome = biome; this.blend = 0; }
    this.blend = Math.min(1, this.blend + dt / 1.2);
    this.cloudT = (this.cloudT || 0) + dt;

    const hour = ((game.time + 0.25) % 1) * 24, rain = game.weather?.rain || 0, flash = game.weather?.flash || 0;
    let mood = skyMood(hour, biome, rain);
    if (this.blend < 1 && this.previousBiome !== null) mood = mixMood(skyMood(hour, this.previousBiome, rain), mood, this.blend);
    mood=goldenSkyMood(mood,game,rain);

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Onde fica o horizonte: acompanha a superfície do mundo de leve
    const surfaceScreen = (game.world.h * 0.32 * T - game.cam.y) * z;
    const baseY = H * 0.56;
    const horizon = baseY + (surfaceScreen - baseY) * 0.04;

    // Céu
    const sky = ctx.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, cssC(mood.top));
    sky.addColorStop(0.55, cssC(mood.mid));
    sky.addColorStop(1, cssC(mood.hor));
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, Math.ceil(horizon));
    ctx.fillStyle = cssC(mood.hor);
    ctx.fillRect(0, Math.floor(horizon), W, H - Math.floor(horizon));

    // Estrelas (piscam) e Via Láctea
    if (mood.stars > 0.01) {
      ctx.globalAlpha = mood.stars * (1 - rain * 0.9);
      ctx.drawImage(this.stars, 0, 0);
      const t = now / 1000;
      ctx.fillStyle = '#fff';
      for (const st of this.twinkle) {
        const a = 0.5 + 0.5 * Math.sin(t * 2.2 + st.p * 7);
        ctx.globalAlpha = mood.stars * a * (1 - rain);
        ctx.beginPath(); ctx.arc(st.x * W, st.y * H, st.r * s * (0.6 + a * 0.6), 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // Sol (6h-18h) e lua (18h-6h) em arco pelo céu, com halo da cor do momento
    const arc = (p) => ({ x: W * (0.06 + 0.88 * p), y: horizon - Math.sin(Math.PI * clamp(p, -0.1, 1.1)) * (horizon - H * 0.1) + (p < 0 || p > 1 ? H * 0.2 : 0) });
    const sunP = (hour - 6) / 12, moonP = ((hour + 6) % 24) / 12;
    const glowBody = (pos, r, core, glow, glowR, a) => {
      if (a <= 0) return;
      const g = ctx.createRadialGradient(pos.x, pos.y, r * 0.4, pos.x, pos.y, glowR);
      g.addColorStop(0, cssC(glow, 0.55 * a)); g.addColorStop(0.25, cssC(glow, 0.22 * a)); g.addColorStop(1, cssC(glow, 0));
      ctx.fillStyle = g; ctx.fillRect(pos.x - glowR, pos.y - glowR, glowR * 2, glowR * 2);
      ctx.globalAlpha = a;
      ctx.fillStyle = cssC(core);
      ctx.beginPath(); ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    };
    if (sunP > -0.08 && sunP < 1.08) {
      const pos = styled&&typeof shaderSunPos==='function'?shaderSunPos(game.time,W,H):arc(sunP), low = 1 - Math.sin(Math.PI * clamp(sunP, 0, 1));
      glowBody(pos, 22 * s, mixC([255, 252, 236], [255, 200, 130], low), mood.glow, (170 + low * 260) * s, 1 - rain * 0.85);
    }
    if (moonP > -0.08 && moonP < 1.08) {
      const pos = arc(moonP), a = (1 - rain * 0.8) * clamp(mood.stars * 1.4 + 0.25, 0, 1);
      glowBody(pos, 16 * s, [236, 238, 248], [170, 186, 240], 110 * s, a);
      if (a > 0) {
        ctx.globalAlpha = a * 0.25; ctx.fillStyle = '#8a90a8';
        for (const [dx, dy, r] of [[-5, -4, 4], [4, 3, 3], [-2, 6, 2.5], [6, -6, 2]]) { ctx.beginPath(); ctx.arc(pos.x + dx * s, pos.y + dy * s, r * s, 0, Math.PI * 2); ctx.fill(); }
        ctx.globalAlpha = 1;
      }
    }

    // Nuvens: brancas de dia, tingidas no amanhecer/pôr do sol, escuras e mais densas na chuva
    const sc = this.scratchCanvas(W, H);
    sc.clearRect(0, 0, W, H);
    sc.globalCompositeOperation = 'source-over';
    for (const c of this.cloudSlots) {
      const spr = this.clouds[c.sprite], w = spr.width * c.k, span = W + w + 200 * s;
      const x = wrap(c.x * s - game.cam.x * z * c.f + this.cloudT * c.speed * s, span) - w;
      sc.drawImage(spr, x, c.y * s, w, spr.height * c.k);
    }
    if (rain > 0.02) {
      sc.globalAlpha = Math.min(1, rain * 1.3);
      for (let i = 0; i < 9; i++) {
        const spr = this.stormClouds[i % 4], span = W + spr.width;
        const x = wrap(i * spr.width * 0.55 - game.cam.x * z * 0.02 + now / 1000 * 8 * s, span) - spr.width * 0.7;
        sc.drawImage(spr, x, (-40 + (i % 3) * 36) * s);
      }
      sc.globalAlpha = 1;
    }
    if (mood.cloudA > 0.01) {
      sc.globalCompositeOperation = 'source-atop';
      sc.fillStyle = cssC(mood.cloud, mood.cloudA);
      sc.fillRect(0, 0, W, H);
    }
    // Only distant clouds become translucent; storms and night keep their
    // original density. This does not fade any foreground artwork.
    ctx.globalAlpha = styled
      ? lerp(.92,clamp(RENDER_STYLE.haze.cloudOpacity??.58,0,1),clamp(game.daylight,0,1)*(1-rain))
      : .92;
    ctx.drawImage(sc.canvas, 0, 0);
    ctx.globalAlpha = 1;

    // Raio no céu durante a tempestade (junto com o clarão de js/weather.js)
    if (flash > this.lastFlash + 0.5) this.bolt = this.makeBolt(W, horizon);
    this.lastFlash = flash;
    if (flash > 0.02) {
      ctx.fillStyle = `rgba(210,220,255,${flash * 0.35})`;
      ctx.fillRect(0, 0, W, horizon);
      if (this.bolt && flash > 0.3) {
        ctx.save();
        ctx.strokeStyle = `rgba(240,245,255,${flash})`; ctx.lineWidth = 2.2 * s;
        ctx.shadowColor = 'rgba(170,190,255,0.9)'; ctx.shadowBlur = 18 * s;
        ctx.beginPath();
        for (const seg of this.bolt) { ctx.moveTo(seg[0], seg[1]); ctx.lineTo(seg[2], seg[3]); }
        ctx.stroke();
        ctx.restore();
      }
    }

    // Paisagem: do fundo para a frente, cada camada tingida pela névoa/luz do momento
    const sets = this.blend < 1 && this.previousBiome !== null
      ? [[this.layersFor(this.previousBiome), 1], [this.layersFor(biome), smoothstep(this.blend)]]
      : [[this.layersFor(biome), 1]];
    const drawnLayers = new Set();
    for (const [layers, alpha] of sets) {
      for (const layer of layers) {
        const { L, canvas, depth } = layer;
        const lw = canvas.width, lh = canvas.height;
        const bottom = Math.round(baseY + (surfaceScreen - baseY) * L.f * 1.4 + L.drop * s);
        const top = bottom - lh;
        if (top > H) continue;
        const fogA = lerp(mood.fogFar, mood.fogNear, depth);
        const mistA=(0.28-depth*.18)*(1+rain*.6);
        const startX = -wrap(Math.round(game.cam.x * z * L.f), lw);
        // A camada já tingida pela névoa só muda quando a cor do céu muda (de dia cheio e de
        // noite fica igual por horas): fica guardada e vai direto para a tela, sem passar pelo
        // canvas de rascunho a cada quadro.
        const tinted = this.tintedLayer(layer, fogA > 0.01 ? cssC(mood.fog, fogA) : null, cssC(mood.fog, 0), cssC(mood.fog, mistA));
        drawnLayers.add(layer);
        ctx.globalAlpha = alpha;
        for (let x = startX; x < W; x += lw) ctx.drawImage(tinted, x, top);
        if (bottom < H) {
          ctx.fillStyle = cssC(mixC(L.base, mood.fog, 1-(1-fogA)*(1-mistA)));
          ctx.fillRect(0, bottom - 1, W, H - bottom + 1);
        }
        ctx.globalAlpha = 1;
      }
    }
    // Camadas tingidas de biomas que saíram da tela não ficam ocupando memória
    for (const layer of this.tinted.keys()) if (!drawnLayers.has(layer)) this.tinted.delete(layer);
    sc.globalCompositeOperation = 'source-over';

    // Chuva forte: véu cinza por cima de tudo que está longe
    if (rain > 0.01) {
      ctx.fillStyle = cssC(mood.fog, rain * 0.25);
      ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
    ctx.imageSmoothingEnabled = false;
  }

  // Camada da paisagem com a névoa (cor chapada) e a bruma da base (degradê) aplicadas só
  // onde a camada tem pixel ('source-atop'), igual ao que antes era feito no rascunho a cada
  // quadro: buracos de céu e o que fica na frente nunca recebem a faixa de bruma.
  tintedLayer(layer, fogCss, mistFrom, mistTo) {
    const key = `${fogCss}|${mistFrom}|${mistTo}`;
    let entry = this.tinted.get(layer);
    if (entry?.key === key) return entry.canvas;
    const { canvas } = layer, lw = canvas.width, lh = canvas.height, s = this.scale;
    if (!entry) this.tinted.set(layer, entry = { key: null, canvas: makeCanvas(lw, lh) });
    entry.key = key;
    const c = entry.canvas.getContext('2d');
    c.globalCompositeOperation = 'copy';
    c.drawImage(canvas, 0, 0);
    c.globalCompositeOperation = 'source-atop';
    if (fogCss) { c.fillStyle = fogCss; c.fillRect(0, 0, lw, lh); }
    const mist = c.createLinearGradient(0, lh - 60 * s, 0, lh);
    mist.addColorStop(0, mistFrom); mist.addColorStop(1, mistTo);
    c.fillStyle = mist;
    c.fillRect(0, lh - 60 * s, lw, 60 * s);
    c.globalCompositeOperation = 'source-over';
    return entry.canvas;
  }

  scratchCanvas(W, H) {
    if (!this.scratch || this.scratch.canvas.width !== W || this.scratch.canvas.height !== H)
      this.scratch = makeCanvas(W, H).getContext('2d');
    return this.scratch;
  }

  // Raio: linha quebrada do alto do céu até perto do horizonte, com um galho
  makeBolt(W, horizon) {
    const segs = [];
    let x = W * (0.15 + Math.random() * 0.7), y = 0;
    const end = horizon * (0.7 + Math.random() * 0.25);
    while (y < end) {
      const nx = x + (Math.random() - 0.5) * 40, ny = y + 18 + Math.random() * 26;
      segs.push([x, y, nx, ny]);
      if (Math.random() < 0.12) segs.push([nx, ny, nx + (Math.random() - 0.3) * 60, ny + 30 + Math.random() * 30]);
      x = nx; y = ny;
    }
    return segs;
  }
}

// Nuvem em pixel art (usada na abertura, js/intro.js)
function genCloud(seed) {
  const rnd = mulberry32(seed);
  const W = 70 + Math.floor(rnd() * 50), H = 28;
  const s = new Sprite(W, H);
  const blobs = Array.from({ length: 6 }, () => ({ x: 12 + rnd() * (W - 24), y: 16 + rnd() * 4, r: 6 + rnd() * 9 }));
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (y > 23) continue;
      const b = blobs.find((b) => Math.hypot(x - b.x, y - b.y) <= b.r);
      if (!b) continue;
      s.set(x, y, y > 19 ? [214, 224, 240] : y - (b.y - b.r) < 3 ? [255, 255, 255] : [240, 244, 252]);
    }
  return s.finish(null);
}
