'use strict';
// =====================================================================================
//  AMBIENTE VIVO: vaga-lumes, borboletas, esporos, poeira da mesa e o brilho do bosque luminoso
// =====================================================================================
//  • Vaga-lumes à noite (floresta, pântano, selva, cerejeiras e, bem mais, o bosque luminoso); borboletas de dia nos
//    campos floridos; esporos subindo no bosque; grãos de poeira vermelha levados pelo vento na mesa.
//  • Cogumelos gigantes, cogumelo-andante, lesma e bulbo-esporo emitem luz de verdade (mapa de luz + brilho aditivo).
// Tudo é decoração: não mexe em blocos nem em colisão. Carrega depois de fauna-species4.js.

const AMBIENT = { list: [], max: 46, timer: 0 };
const AMB_BUTTERFLY = [[255, 186, 60], [120, 190, 255], [255, 122, 160], [250, 250, 240], [190, 140, 255], [255, 140, 60]];

function ambientKinds(world, tx, daylight, rain) {
  const b = world.biomeAt(tx);
  const night = daylight < 0.4;
  const kinds = [];
  if (night && rain < 0.5) {
    const n = b === BIOME.FUNGAL ? 18 : b === BIOME.SWAMP ? 16 : b === BIOME.JUNGLE ? 12 : b === BIOME.SAKURA ? 10 : b === BIOME.FOREST ? 8 : 0;
    if (n) kinds.push(['firefly', n]);
  } else if (!night && rain < 0.25) {
    const n = b === BIOME.FOREST ? 6 : b === BIOME.SAKURA ? 8 : b === BIOME.JUNGLE ? 9 : b === BIOME.SAVANNA ? 3 : b === BIOME.SWAMP ? 3 : 0;
    if (n) kinds.push(['butterfly', n]);
  }
  if (b === BIOME.FUNGAL) kinds.push(['spore', night ? 22 : 14]);
  if (b === BIOME.MESA || b === BIOME.DESERT) kinds.push(['dust', (g_wind(world) > 0.3 ? 14 : 7)]);
  return kinds;
}
const g_wind = () => Math.abs(game.weather?.wind || 0) / 100;

function ambientSpawn(g, kind) {
  const w = g.world, p = g.player, vw = canvas.width / g.zoom, vh = canvas.height / g.zoom;
  for (let tries = 0; tries < 8; tries++) {
    const x = p.cx + (Math.random() - 0.5) * (vw + 160), tx = clamp(Math.floor(x / T), 2, w.w - 3), s = w.surface[tx];
    if (w.biomeAt(tx) === BIOME.OCEAN && tx > w.oceanStart + 30) continue;
    const y = (s - 1 - Math.random() * (kind === 'dust' ? 5 : kind === 'spore' ? 9 : 6)) * T;
    if (w.isSolid(tx, Math.floor(y / T)) || !w.isSkyExposed(tx, Math.floor(y / T))) continue;
    if (Math.abs(x - p.cx) < 20 && Math.abs(y - p.cy) < 20) continue;
    const a = { kind, x, y, vx: (Math.random() - 0.5) * 12, vy: (Math.random() - 0.5) * 8, ph: Math.random() * 6.28, life: 14 + Math.random() * 14, t: 0, hue: Math.random() };
    if (kind === 'butterfly') a.color = AMB_BUTTERFLY[Math.floor(Math.random() * AMB_BUTTERFLY.length)];
    AMBIENT.list.push(a);
    return;
  }
}

function updateAmbientLife(g, dt) {
  const w = g.world, p = g.player;
  if (!w?.biomeAt || g.intro?.active || game.paused) return;
  const list = AMBIENT.list, daylight = daylightAt(g.time), rain = g.weather?.rain || 0, tx = clamp(Math.floor(p.cx / T), 0, w.w - 1);
  AMBIENT.timer -= dt;
  if (AMBIENT.timer <= 0) {
    AMBIENT.timer = 0.22;
    const kinds = ambientKinds(w, tx, daylight, rain), have = {};
    for (const a of list) have[a.kind] = (have[a.kind] || 0) + 1;
    for (const [kind, n] of kinds) if ((have[kind] || 0) < n && list.length < AMBIENT.max) ambientSpawn(g, kind);
  }
  const vw = canvas.width / g.zoom + 120, vh = canvas.height / g.zoom + 120, wind = (g.weather?.wind || 0) * 0.12;
  for (let i = list.length - 1; i >= 0; i--) {
    const a = list[i];
    a.t += dt; a.life -= dt;
    const ground = w.surface[clamp(Math.floor(a.x / T), 0, w.w - 1)] * T;
    if (a.kind === 'firefly') {                                               // zigue-zague preguiçoso, pisca devagar
      a.vx += (Math.sin(a.t * 1.3 + a.ph) * 14 - a.vx) * dt * 1.4; a.vy += (Math.cos(a.t * 0.9 + a.ph * 2) * 10 - a.vy) * dt * 1.4;
      if (a.y > ground - 6) a.vy -= 30 * dt;
    } else if (a.kind === 'butterfly') {                                      // voo irregular, de flor em flor
      a.vx += (Math.sin(a.t * 0.8 + a.ph) * 24 - a.vx) * dt * 2; a.vy += (Math.sin(a.t * 3.1 + a.ph) * 22 + Math.cos(a.t * 0.5 + a.ph) * 8 - a.vy) * dt * 3;
      if (a.y > ground - 5) a.vy -= 60 * dt; if (a.y < ground - 70) a.vy += 40 * dt;
    } else if (a.kind === 'spore') {                                          // esporo sobe balançando e some
      a.vy += (-8 - a.vy) * dt; a.vx += (Math.sin(a.t * 0.9 + a.ph) * 6 + wind - a.vx) * dt;
    } else {                                                                  // poeira corre com o vento
      a.vx += (wind * 3 + 14 + Math.sin(a.t + a.ph) * 6 - a.vx) * dt; a.vy += (Math.sin(a.t * 2 + a.ph) * 4 - a.vy) * dt;
      if (a.y > ground - 2) a.vy -= 20 * dt;
    }
    a.x += a.vx * dt; a.y += a.vy * dt;
    if (a.life <= 0 || Math.abs(a.x - p.cx) > vw || Math.abs(a.y - p.cy) > vh || w.isSolid(Math.floor(a.x / T), Math.floor(a.y / T))) list.splice(i, 1);
  }
}

// Borboletas e poeira desenhadas junto do mundo (recebem a luz do dia); luzes brilhantes depois, por cima da escuridão
function drawAmbientWorld(ctx) {
  const now = performance.now() / 1000;
  for (const a of AMBIENT.list) {
    const fade = Math.min(1, a.t * 1.2, a.life * 0.6);
    if (a.kind === 'butterfly') {
      const x = Math.round(a.x), y = Math.round(a.y), flap = Math.sin(now * 17 + a.ph) > 0 ? 3 : 1, c = a.color;
      ctx.globalAlpha = fade; ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
      ctx.fillRect(x - flap, y - 2, flap, 2); ctx.fillRect(x + 1, y - 2, flap, 2); ctx.fillRect(x - flap + 1, y, Math.max(1, flap - 1), 1); ctx.fillRect(x + 1, y, Math.max(1, flap - 1), 1);
      ctx.fillStyle = 'rgba(40,28,24,0.9)'; ctx.fillRect(x, y - 1, 1, 3);
      ctx.fillStyle = `rgba(255,255,255,0.45)`; ctx.fillRect(x - flap, y - 2, 1, 1);
    } else if (a.kind === 'dust') {
      ctx.globalAlpha = fade * 0.4; ctx.fillStyle = '#d8946a'; ctx.fillRect(Math.round(a.x), Math.round(a.y), 1, 1); ctx.fillRect(Math.round(a.x) - 1, Math.round(a.y), 1, 1);
    }
  }
  ctx.globalAlpha = 1;
}
function drawAmbientGlow(ctx, g) {
  const now = performance.now() / 1000, night = 1 - clamp(daylightAt(g.time) * 1.4, 0, 1);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const a of AMBIENT.list) {
    const fade = Math.min(1, a.t * 1.2, a.life * 0.6);
    if (a.kind === 'firefly') {
      const k = Math.pow(Math.max(0, Math.sin(now * 1.8 + a.ph * 3)), 2.2) * fade;
      if (k < 0.04) continue;
      const x = Math.round(a.x), y = Math.round(a.y), r = 9;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r); grad.addColorStop(0, `rgba(220,255,120,${0.5 * k})`); grad.addColorStop(1, 'rgba(220,255,120,0)');
      ctx.fillStyle = grad; ctx.fillRect(x - r, y - r, r * 2, r * 2);
      ctx.fillStyle = `rgba(255,255,200,${k})`; ctx.fillRect(x, y, 1, 1);
    } else if (a.kind === 'spore') {
      const k = (0.45 + 0.55 * Math.sin(now * 1.4 + a.ph * 2)) * fade * (0.6 + night * 0.4), x = Math.round(a.x), y = Math.round(a.y);
      const c = a.hue < 0.5 ? '130,255,220' : '210,170,255';
      ctx.fillStyle = `rgba(${c},${0.9 * k})`; ctx.fillRect(x, y, 1, 1);
      if (k > 0.5) { ctx.fillStyle = `rgba(${c},${0.35 * k})`; ctx.fillRect(x - 1, y, 3, 1); ctx.fillRect(x, y - 1, 1, 3); }
    }
  }
  ctx.restore();
}

// ---------------------------------------------------------------- cogumelos gigantes: luz no mapa e brilho aditivo
// O sorteio do cogumelo (js/biomes-art.js) é determinístico por coluna: a cor e a altura do chapéu saem da mesma semente.
function mushroomSpec(world, x) {
  const seed = Math.floor(hash2(x, BIOME.FUNGAL, world.seed ^ 0x71a9) * 0x7fffffff), rnd = mulberry32(seed);
  const variant = Math.floor(rnd() * MUSHROOM_CAPS.length);
  rnd(); rnd(); rnd();
  return { variant, glow: MUSHROOM_CAPS[variant].glow };
}
function fungalTreeTop(world, x) {
  const s = world.surface[x];
  if (world.getTile(x, s - 1) !== TILE.TRUNK) return -1;
  let top = s - 1;
  while (top > 0 && world.getTile(x, top - 1) === TILE.TRUNK) top--;
  return top;
}
// Mapa de luz: ar em volta do chapéu de cada cogumelo gigante (calculado uma vez por mundo e conferido no uso)
function fungalGlowCells(world) {
  if (world._fungalGlow) return world._fungalGlow;
  const cells = new Map();
  for (let x = 4; x < world.w - 4; x++) {
    if (world.biome[x] !== BIOME.FUNGAL) continue;
    const top = fungalTreeTop(world, x);
    if (top < 0) continue;
    const spec = mushroomSpec(world, x), cy = top;
    for (let dy = -3; dy <= 3; dy++) for (let dx = -6; dx <= 6; dx++) {
      const d = Math.hypot(dx / 2, dy);
      if (d > 3.2) continue;
      const key = (cy + dy) * world.w + x + dx, level = Math.round(10 - d * 1.4);
      const old = cells.get(key);
      if (!old || old.level < level) cells.set(key, { level, color: spec.glow, tx: x, top });
    }
  }
  return (world._fungalGlow = cells);
}
{
  const baseEmission = environmentEmissionAt;
  environmentEmissionAt = function (world, x, y) {
    const r = baseEmission(world, x, y);
    if (r || !world.biome || world.biomeAt(x) !== BIOME.FUNGAL || world.getTile(x, y) !== TILE.AIR) return r;
    const c = fungalGlowCells(world).get(y * world.w + x);
    if (!c || world.getTile(c.tx, c.top) !== TILE.TRUNK) return r;       // cogumelo cortado: apaga
    return { level: c.level, color: c.glow ?? c.color };
  };
  const baseUpdate = updateEnvCritters, baseDraw = drawEnvCritters, baseAccents = drawEnvironmentAccents;
  updateEnvCritters = function (g, dt) { baseUpdate(g, dt); updateAmbientLife(g, dt); };
  drawEnvCritters = function (ctx, g) { baseDraw(ctx, g); drawAmbientWorld(ctx); };
  drawEnvironmentAccents = function (ctx, g, ox, oy, z) {
    baseAccents(ctx, g, ox, oy, z);
    const world = g.world;
    if (!world?.biome || g.time == null) return;
    ctx.save(); ctx.setTransform(z, 0, 0, z, -ox, -oy);
    drawAmbientGlow(ctx, g);
    // brilho dos chapéus gigantes e dos bichos luminosos
    const vx0 = Math.floor(ox / z / T) - 8, vx1 = Math.ceil((ox + canvas.width) / z / T) + 8, night = 1 - clamp(daylightAt(g.time) * 1.1, 0, 0.8);
    ctx.globalCompositeOperation = 'lighter';
    for (let x = Math.max(4, vx0); x <= Math.min(world.w - 5, vx1); x++) {
      if (world.biome[x] !== BIOME.FUNGAL) continue;
      const top = fungalTreeTop(world, x);
      if (top < 0) continue;
      const spec = mushroomSpec(world, x), cx = x * T + T / 2, cy = top * T + 12, r = 46 + Math.sin(performance.now() / 900 + x) * 2;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r), c = spec.glow.join(',');
      grad.addColorStop(0, `rgba(${c},${0.24 * (0.4 + night * 0.6)})`); grad.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = grad; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
    // plantas e brotos luminosos do chão
    for (let x = Math.max(2, vx0); x <= Math.min(world.w - 3, vx1); x++) {
      const y = world.surface[x], sp = world.getTile(x, y - 1) === TILE.AIR ? environmentDecoration(world, x, y, false) : null;
      if (!sp?.envGlow) continue;
      const cx = x * T + T / 2, cy = y * T - sp.height * 0.45, r = 15 + Math.sin(performance.now() / 700 + x * 1.7) * 1.6, c = sp.envGlow.join(',');
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, `rgba(${c},${0.3 * (0.35 + night * 0.65)})`); grad.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = grad; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
    for (const m of g.mobs || []) {
      const glow = m.def?.glow;
      if (!glow || m.dead || m.cx < ox / z - 40 || m.cx > (ox + canvas.width) / z + 40) continue;
      const r = 22 + Math.sin(performance.now() / 500 + m.cx) * 2, c = glow.join(','), cx = m.cx, cy = m.cy;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      grad.addColorStop(0, `rgba(${c},${0.28 * (0.4 + night * 0.6)})`); grad.addColorStop(1, `rgba(${c},0)`);
      ctx.fillStyle = grad; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
    ctx.restore();
  };
}
