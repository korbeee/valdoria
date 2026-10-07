'use strict';
// =====================================================================================
//  MAR DE TEMPORAL: ondas grandes que só existem quando o céu fecha
// =====================================================================================
// A água já é uma fileira de molas (js/water-waves.js): quem cai faz onda, a chuva faz ondinha. Aqui entra o vento:
// durante um temporal o mar ganha uma marulhada que corre na direção do vento, somada às molas, então tudo que a
// física da água já faz (tchibum, marola, itens boiando, o jogador nadando) acontece por cima dela.
//   - marulhada: três ondas de comprimentos diferentes, com a crista mais fina que o cavado e grupos de ondas mais altas
//   - só onde o mar é fundo: a laguna protegida pelo recife fica quase calma e a onda quebra em espuma sobre a crista do recife
//   - lagos grandes balançam um pouco; poças e rios, não
//   - quem boia sobe e desce com a onda e é levado devagar na direção em que ela anda
//   - cristas com espuma, borrifo no vento, e a água fica cinza-esverdeada
// Chuva fraca, vento sozinho e tempo bom não levantam nada: oceanStormLevel() é 0.

const SWELL = {
  amp: 8.2,                                                  // px de altura da onda maior no pior temporal
  comps: [{ len: 152, speed: 54, amp: 1, ph: 0 }, { len: 86, speed: 39, amp: 0.42, ph: 1.7 }, { len: 338, speed: 78, amp: 0.55, ph: 4.1 }],
};

// 0..1: quanto o céu está em temporal. Segue as camadas do clima, que já mudam devagar (js/weather.js)
function oceanStormLevel(g) {
  const w = g.weather;
  if (!w || g.lavaFluid) return 0;
  const gale = Math.abs(w.wind || 0) > 45;
  const heavyRain = (w.rain || 0) > 0.55 && gale ? ((w.rain || 0) - 0.55) / 0.45 : 0;
  return clamp(Math.max(w.lightning || 0, (w.hail || 0) * 0.9, (w.tornadoLevel || 0) * 0.8, heavyRain), 0, 1);
}

// Largura (blocos) da lâmina de água na linha da superfície de uma coluna: guardada por um segundo
const _fetchCache = new Map();
let _fetchStamp = 0;
function swellFetch(g, tx, ty) {
  const now = performance.now();
  if (now - _fetchStamp > 1000) { _fetchCache.clear(); _fetchStamp = now; }
  const key = ty * 100000 + tx;
  let v = _fetchCache.get(key);
  if (v !== undefined) return v;
  const w = g.world;
  let a = tx, b = tx;
  const ok = (x) => { const s = w.waterSurfacePx(x, ty); return s != null && Math.floor((s + 1) / T) === ty; };
  while (a > tx - 70 && ok(a - 1)) a--;
  while (b < tx + 70 && ok(b + 1)) b++;
  v = clamp((b - a - 18) / 50, 0, 0.75);                    // lago pequeno não levanta onda
  _fetchCache.set(key, v);
  return v;
}

// Quanto da marulhada vale numa coluna de superfície (0 = nada): oceano fundo = 1; laguna rasa e crista do recife = quase nada
function swellColumn(g, tx, ty) {
  const w = g.world;
  if (w.biomeAt(tx) === BIOME.OCEAN && ty === w.seaLevel) return clamp((w.surface[tx] - w.seaLevel - 2) / 9, 0.08, 1);
  return swellFetch(g, tx, ty);
}

// Deslocamento (px, positivo = mais baixo) e quanto a crista está afiada (0..1) em x
function swellRaw(g, x, factor) {
  const level = g.swellLevel, t = g.swellT, dir = g.swellDir;
  let up = 0, crest = 0;
  const env = 0.8 + 0.2 * Math.sin(x * 0.0125 - dir * t * 0.55);                 // grupos de ondas mais altas
  for (const c of SWELL.comps) {
    const k = (Math.PI * 2) / c.len, u = 0.5 + 0.5 * Math.sin(k * (x - dir * c.speed * t) + c.ph), peak = Math.pow(u, 2.2);
    up += c.amp * (2 * peak - 0.65);
    if (c === SWELL.comps[0]) crest = peak;
  }
  const amp = SWELL.amp * level * factor * env;
  return { d: -up * amp, crest: crest * clamp(level * factor * 1.4, 0, 1) };
}
const swellHeight = (g, x, factor) => swellRaw(g, x, factor).d;

// Velocidade vertical da superfície (px/s, positivo = descendo): quem boia acompanha
function swellVelocityAt(g, x, y) {
  if (!(g.swellLevel > 0.02)) return 0;
  const w = g.world, tx = Math.floor(x / T), ty = Math.floor(y / T);
  let row = ty;
  while (row > 0 && w.hasWater(tx, row - 1)) row--;
  const f = swellColumn(g, tx, row);
  if (f <= 0 || w.waterSurfacePx(tx, row) == null) return 0;
  const e = 0.05, t0 = g.swellT, a = swellHeight(g, x, f);
  g.swellT = t0 + e; const b = swellHeight(g, x, f); g.swellT = t0;
  return (b - a) / e;
}
// Correnteza de superfície: a marulhada empurra quem está boiando para onde ela anda
function swellDriftAt(g, x, y) {
  if (!(g.swellLevel > 0.02)) return 0;
  const w = g.world, tx = Math.floor(x / T), ty = Math.floor(y / T);
  let row = ty;
  while (row > 0 && w.hasWater(tx, row - 1)) row--;
  return g.swellDir * 16 * g.swellLevel * swellColumn(g, tx, row);
}

// ---------- molas: a marulhada entra nos dois pontos em que o jogo lê a altura da onda ----------
const _swellSlices = new Array(WAVE.per).fill(0);
{
  const baseSlices = waterWaveSlices;
  waterWaveSlices = function (g, tx, ty) {
    const base = baseSlices(g, tx, ty);
    if (g.lavaFluid) return base;     // o efeito de lava herda do jogo (Object.create): nada de onda de mar na lava
    const storm = g.swellLevel > 0.01, spout = !!g.weather?.funnel?.water && typeof vortexAt === 'function';
    if (!storm && !spout) return base;
    const f = storm ? swellColumn(g, tx, ty) : 0;
    if (f <= 0 && !spout) return base;
    let any = false;
    for (let k = 0; k < WAVE.per; k++) {
      const x = tx * T + (k + 0.5) * (T / WAVE.per);
      const v = Math.round((base ? base[k] : 0) + (f > 0 ? swellHeight(g, x, f) : 0) + (spout ? vortexAt(g, x, ty) : 0));
      _swellSlices[k] = v; if (v) any = true;
    }
    return any ? _swellSlices : null;
  };
  const baseHeight = waveHeightAt;
  waveHeightAt = function (g, x, ty) {
    if (g.lavaFluid) return baseHeight(g, x, ty);
    const h = baseHeight(g, x, ty) + (typeof vortexAt === 'function' ? vortexAt(g, x, ty) : 0);
    if (!(g.swellLevel > 0.01)) return h;
    const f = swellColumn(g, Math.floor(x / T), ty);
    return f > 0 ? h + swellHeight(g, x, f) : h;
  };
  const baseUpdate = updateWaterWaves;
  updateWaterWaves = function (g, dt) { baseUpdate(g, dt); updateSwell(g, dt); };
}

// Relógio e direção da marulhada; borrifo que sai das cristas
function updateSwell(g, dt) {
  if (!g.weather || g.lavaFluid || !g.world) return;
  g.swellT = (g.swellT || 0) + dt;
  const level = (g.swellLevel = oceanStormLevel(g));
  if (g.weather.wind) g.swellDir = Math.sign(g.weather.wind);
  else g.swellDir ??= 1;
  if (level < 0.12) return;
  const w = g.world, { vw } = viewSize();
  let n = level * dt * 18 + Math.random();
  for (; n >= 1; n--) {
    const x = g.cam.x + Math.random() * vw, tx = Math.floor(x / T);
    if (tx < 1 || tx >= w.w - 1 || !w.hasWater(tx, w.seaLevel)) continue;
    const f = swellColumn(g, tx, w.seaLevel);
    if (f < 0.3) continue;
    const r = swellRaw(g, x, f);
    if (r.crest < 0.7) continue;
    waterParticle(g, x, w.seaLevel * T + r.d - 1, g.swellDir * (24 + Math.random() * 46) + (Math.random() - 0.5) * 16, -34 - Math.random() * 54, 0.45 + Math.random() * 0.3);
  }
}

// ---------- visual: cinza-esverdeado, espuma nas cristas e a rebentação em cima do recife ----------
function drawOceanStorm(ctx, game, vx, vy, vw, vh) {
  const level = game.swellLevel;
  if (!(level > 0.02)) return;
  const world = game.world, sea = world.seaLevel, now = performance.now() / 1000;
  if (world.oceanStart >= world.w) return;
  const x0 = Math.max(world.oceanStart - 2, Math.floor(vx / T) - 1), x1 = Math.min(world.w - 1, Math.floor((vx + vw) / T) + 1);
  // mar cinza-esverdeado: uma camada por cima da água, mais clara perto da superfície
  ctx.save();
  for (let x = x0; x <= x1; x++) {
    const s = world.surface[x];
    if (s <= sea || !world.hasWater(x, sea)) continue;
    const f = swellColumn(game, x, sea), bottom = Math.min(s, sea + 26) * T, top = sea * T - 8;
    const g = ctx.createLinearGradient(0, top, 0, bottom);
    g.addColorStop(0, `rgba(34,58,66,${(0.26 * level).toFixed(3)})`); g.addColorStop(1, `rgba(16,36,52,${(0.34 * level).toFixed(3)})`);
    ctx.fillStyle = g; ctx.fillRect(x * T, top, T, bottom - top);
  }
  // espuma: o topo de cada crista alta, com um rastro atrás dela
  for (let x = Math.floor(vx / 3) * 3; x < vx + vw; x += 3) {
    const tx = Math.floor(x / T);
    if (tx < world.oceanStart || tx >= world.w || !world.hasWater(tx, sea)) continue;
    const f = swellColumn(game, tx, sea);
    if (f < 0.2) continue;
    const r = swellRaw(game, x, f);
    if (r.crest < 0.62) continue;
    const y = sea * T + r.d, a = clamp((r.crest - 0.58) * 2.6, 0, 1);
    ctx.fillStyle = `rgba(244,252,255,${(0.82 * a).toFixed(2)})`; ctx.fillRect(x, y - 1, 3, 2);
    if (r.crest > 0.8) { ctx.fillRect(x + game.swellDir * 3, y - 2, 2, 1); ctx.fillRect(x + game.swellDir * 5, y - 3, 1, 1); ctx.fillStyle = `rgba(230,246,252,${(0.5 * a).toFixed(2)})`; ctx.fillRect(x - game.swellDir * 5, y, 4, 1); }
  }
  // rebentação: sobre a crista rasa do recife a onda se desfaz em espuma
  for (let tx = x0; tx <= x1; tx++) {
    const depth = world.surface[tx] - sea;
    if (depth < 1 || depth > 4 || !world.hasWater(tx, sea) || tx < world.oceanStart + 30) continue;
    for (let k = 0; k < 3; k++) {
      const h = oaHash(tx, k, Math.floor(now * 2.2)), a = level * (0.35 + 0.5 * h);
      ctx.fillStyle = `rgba(250,254,255,${a.toFixed(2)})`;
      ctx.fillRect(tx * T + Math.floor(h * 12), sea * T - 1 - (k === 2 ? 1 : 0), 3 + (k & 1), 1 + (k > 0 ? 1 : 0));
    }
  }
  ctx.restore();
}

{
  const baseDrawWater = drawWater;
  drawWater = function (ctx, game, vx, vy, vw, vh) {
    baseDrawWater(ctx, game, vx, vy, vw, vh);
    if (typeof drawOceanShore === 'function') drawOceanShore(ctx, game, vx, vy, vw, vh);
    drawOceanStorm(ctx, game, vx, vy, vw, vh);
    if (typeof drawWaterspout === 'function') drawWaterspout(ctx, game);
  };
}
// Quem boia no mar de temporal sobe e desce com a onda e é levado por ela: swellVelocityAt/swellDriftAt, chamados de updateSwimming (js/water.js)

// Luz do mar (feixes de sol, plâncton, brilho do fundo): entra depois da luz, junto dos brilhos do cenário (js/environment.js)
{
  const baseAccents = drawEnvironmentAccents;
  drawEnvironmentAccents = function (ctx, g, ox, oy, z) {
    baseAccents(ctx, g, ox, oy, z); drawOceanAccents(ctx, g, ox, oy, z);
    if (typeof drawWaterShocks === 'function') drawWaterShocks(ctx, g, ox, oy, z);   // descarga do raio na água (js/water-shock.js)
  };
}
