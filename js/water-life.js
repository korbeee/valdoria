'use strict';

// =====================================================================================
//  LIBÉLULAS: só enfeitam o ar em cima dos rios durante o dia (os bichos da água estão em js/aquatic.js)
// =====================================================================================

// ---------- Libélulas ----------
const DRAGONFLY_MAX = 6;
const DRAGONFLY_COLORS = [['#46b4ea', '#1d5f8a'], ['#72d86c', '#2f7d35'], ['#ea5b40', '#8a2a1d'], ['#b884ee', '#5b3a8a']];

// Ponto na superfície de um rio (não mar aberto, não cachoeira, não congelado) perto da câmera
function dragonflySpot(game) {
  const world = game.world, { vw, vh } = viewSize();
  for (let t = 0; t < 12; t++) {
    const x = Math.floor((game.cam.x + Math.random() * vw) / T);
    if (x < 0 || x >= world.w) continue;
    const b = world.biomeAt(x);
    if (b === BIOME.SNOW || (b === BIOME.OCEAN && x > world.oceanStart + BEACH_W + 30)) continue;
    for (let y = Math.max(1, Math.floor(game.cam.y / T) - 4); y < Math.min(world.h - 1, (game.cam.y + vh) / T + 4); y++) {
      if (world.isSolid(x, y)) break;
      if (!world.hasWater(x, y) || world.isWaterfall(x, y)) continue;
      if (!world.isSkyExposed(x, y - 1)) break; // lago de caverna: libélula não entra
      return { x: x * T + T / 2, y: world.waterSurfacePx(x, y) };
    }
  }
  return null;
}

function updateDragonflies(game, dt) {
  const list = (game.dragonflies ??= []), p = game.player;
  const day = daylightAt(game.time) > 0.35 && (game.weather?.rain || 0) < 0.5;
  if (day && list.length < DRAGONFLY_MAX && Math.random() < dt * 1.2) {
    const spot = dragonflySpot(game);
    if (spot) list.push({
      x: spot.x, y: spot.y - 20, hx: spot.x, water: spot.y, tx: spot.x, ty: spot.y - 20, wait: 0,
      phase: Math.random() * 10, color: DRAGONFLY_COLORS[Math.floor(Math.random() * DRAGONFLY_COLORS.length)],
      fade: 0, life: 25 + Math.random() * 30, facing: 1,
    });
  }
  for (let i = list.length - 1; i >= 0; i--) {
    const d = list[i];
    d.life -= dt;
    const leaving = d.life <= 0 || !day || Math.abs(d.x - p.cx) > 70 * T;
    d.fade = clamp(d.fade + (leaving ? -dt : dt) * 1.5, 0, 1);
    if (leaving && d.fade <= 0) { list.splice(i, 1); continue; }
    // Voo em arrancadas: para no ar, dispara até outro ponto perto da água e para de novo
    const scared = Math.hypot(d.x - p.cx, d.y - p.cy) < 2.5 * T;
    if ((d.wait -= dt) <= 0 || scared) {
      const away = scared ? Math.sign(d.x - p.cx) || 1 : 0;
      d.tx = d.hx + (away ? away * (50 + Math.random() * 30) : (Math.random() - 0.5) * 90);
      d.ty = d.water - 8 - Math.random() * 34;
      d.wait = scared ? 0.6 : 0.5 + Math.random() * 1.4;
      if (scared) d.hx = clamp(d.tx, d.hx - 60, d.hx + 60);
    }
    const k = Math.min(1, dt * 7);
    if (Math.abs(d.tx - d.x) > 1) d.facing = d.tx > d.x ? 1 : -1;
    d.x += (d.tx - d.x) * k;
    d.y += (d.ty - d.y) * k;
  }
}

function drawDragonflies(ctx, game) {
  const now = performance.now() / 1000;
  for (const d of game.dragonflies || []) {
    const x = Math.round(d.x + Math.sin(now * 13 + d.phase) * 0.6), y = Math.round(d.y + Math.sin(now * 9 + d.phase) * 0.8), f = d.facing;
    ctx.globalAlpha = d.fade;
    // Asas batendo rápido (dois quadros), translúcidas
    const up = Math.floor(now * 30 + d.phase) & 1;
    ctx.fillStyle = 'rgba(232,246,255,0.7)';
    ctx.fillRect(x - (f > 0 ? 3 : 2), y - 2 - up, 5, 1);
    ctx.fillRect(x - (f > 0 ? 3 : 2), y - 1 + up, 5, 1);
    // Corpo: cabeça escura na frente, tórax e cauda comprida
    ctx.fillStyle = d.color[1];
    ctx.fillRect(x + (f > 0 ? 2 : -3), y - 1, 2, 2);
    ctx.fillStyle = d.color[0];
    ctx.fillRect(x - 1, y - 1, 3, 2);
    ctx.fillRect(f > 0 ? x - 7 : x + 2, y, 6, 1);
    ctx.fillStyle = d.color[1];
    ctx.fillRect(f > 0 ? x - 7 : x + 7, y, 1, 1);
  }
  ctx.globalAlpha = 1;
}
