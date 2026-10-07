'use strict';
// =====================================================================================
//  RAIO NA ÁGUA: a descarga se espalha e a água fica eletrizada por alguns segundos
// =====================================================================================
// Quando um raio cai sobre o mar, um lago ou um rio (js/weather-plus.js: strikeSpot), a água em volta do ponto vira uma
// meia-esfera eletrizada que se apaga aos poucos:
//   - quem está dentro dela (peixe, qualquer bicho, o jogador) leva choque a cada instante, mais forte perto do centro;
//   - a superfície dá um tranco (as molas de js/water-waves.js) e solta anéis, gotas e faíscas;
//   - o visual é pixel art do jogo: brilho em faixas pontilhadas, veios grossos de 2 px com contorno chapado de azul-acinzentado pálido (o mesmo
//     jeito do raio do céu, sem saturar a água) e faíscas em blocos.
// O ponto de queda tem o clarão logo no raio; a zona dura SHOCK.life segundos e vai enfraquecendo.

const SHOCK = { life: 6.5, rx: 118, ry: 104, tick: 0.45, mob: 7, player: 6 };

// Intensidade (0..1) da descarga nesta zona
const shockPower = (sh) => Math.pow(clamp(1 - sh.t / SHOCK.life, 0, 1), 1.35) * (sh.t < 0.2 ? 1.25 : 1);
// Quanto a água em (x, y) está eletrizada, somando as zonas ativas; 0 fora da água ou acima da superfície
function shockLevelAt(g, x, y) {
  const list = g.shocks;
  if (!list?.length || g.lavaFluid) return 0;
  let best = 0;
  for (const sh of list) {
    const dx = (x - sh.x) / SHOCK.rx, dy = (y - sh.y) / SHOCK.ry;
    if (y < sh.y - 4) continue;
    const d2 = dx * dx + dy * dy;
    if (d2 < 1) best = Math.max(best, shockPower(sh) * Math.pow(1 - d2, 1.2));
  }
  return best > 0 && g.world.waterAtPx(x, y) ? best : 0;
}

function shockWater(g, s) {
  const list = g.shocks ??= [];
  list.push({ x: s.x, y: s.y, t: 0, tick: 0.12, seed: Math.random() * 1000, veinT: 0, veins: [] });
  if (list.length > 5) list.shift();
  waveImpulse(g, s.x, s.y, 130, 9);
  addRipple(g, s.x, s.y, 36); addRipple(g, s.x, s.y, 20);
  for (let k = 0; k < 20; k++) waterParticle(g, s.x + (Math.random() - 0.5) * 18, s.y - 1, (Math.random() - 0.5) * 180, -80 - Math.random() * 150, 0.5);
}

// Veios: galhos que saem do ponto de queda para baixo e para os lados, com um tremido; refeitos a cada instante
function shockVeins(sh) {
  const veins = [], pw = shockPower(sh), n = 4 + Math.floor(Math.random() * 3);
  for (let b = 0; b < n; b++) {
    const ang = Math.PI * (0.06 + Math.random() * 0.88), len = SHOCK.rx * (0.4 + Math.random() * 0.7) * (0.55 + 0.45 * pw);
    let x = sh.x, y = sh.y + 1;
    const pts = [[x, y]];
    for (let i = 1; i <= 9; i++) {
      const k = i / 9, a = ang + (Math.random() - 0.5) * 0.9;
      x += Math.cos(a) * len / 9; y = Math.max(sh.y + 1, y + Math.sin(a) * len / 9 * (SHOCK.ry / SHOCK.rx) * 1.3);
      pts.push([x, y]);
      if (i > 2 && i < 8 && Math.random() < 0.22) {            // galho curto
        let bx = x, by = y;
        const dir = Math.random() < 0.5 ? -1 : 1, br = [[bx, by]];
        for (let j = 0; j < 3; j++) { bx += dir * (4 + Math.random() * 7); by += 2 + Math.random() * 8; br.push([bx, by]); }
        veins.push({ pts: br, w: 0 });
      }
    }
    veins.push({ pts, w: 1 });
  }
  return veins;
}

function updateShocks(g, dt) {
  const list = g.shocks;
  if (!list?.length) return;
  const world = g.world, p = g.player;
  for (let i = list.length - 1; i >= 0; i--) {
    const sh = list[i];
    sh.t += dt;
    if (sh.t > SHOCK.life) { list.splice(i, 1); continue; }
    const pw = shockPower(sh);
    if ((sh.veinT -= dt) <= 0) { sh.veinT = 0.05 + Math.random() * 0.06; sh.veins = shockVeins(sh); }
    // faíscas e gotas saltando na superfície
    for (let n = dt * 36 * pw + Math.random(); n >= 1; n--) {
      const x = sh.x + (Math.random() - 0.5) * SHOCK.rx * 1.6 * (0.4 + 0.6 * pw);
      if (!world.waterAtPx(x, sh.y + 2)) continue;
      wxPart(g, { x, y: sh.y - 1, vx: (Math.random() - 0.5) * 60, vy: -50 - Math.random() * 90, life: 0.3, maxLife: 0.3, color: Math.random() < 0.5 ? '#e4f8ff' : '#fff2b8', w: 1, h: 1, gravity: 420 });
    }
    if (Math.random() < dt * 5 * pw) waveImpulse(g, sh.x + (Math.random() - 0.5) * SHOCK.rx, sh.y, 14 * pw, 4);
    // o choque
    if ((sh.tick -= dt) > 0) continue;
    sh.tick = SHOCK.tick;
    for (const m of g.mobs) {
      if (m.dead || m.boss || m.carcass) continue;
      const lvl = shockLevelAt(g, m.cx, m.cy);
      if (lvl < 0.08) continue;
      m.hit(Math.max(1, Math.round(SHOCK.mob * lvl)), sh.x);
      for (let k = 0; k < 4; k++) wxPart(g, { x: m.cx + (Math.random() - 0.5) * m.w, y: m.cy + (Math.random() - 0.5) * m.h, vx: (Math.random() - 0.5) * 80, vy: -30 - Math.random() * 50, life: 0.25, maxLife: 0.25, color: '#e4f8ff', w: 1, h: 1, gravity: 0 });
    }
    const lvl = shockLevelAt(g, p.cx, p.cy);
    if (lvl >= 0.08 && !g.adminGod && p.invulnerable <= 0) {
      damageMonsterPlayer(g, Math.max(1, Math.round(SHOCK.player * lvl)), sh.x, { pierce: true, death: 'Eletrocutado na água.' });
      if (!g.shockHint) { g.shockHint = true; toast('A água está eletrizada! Saia dela até a descarga passar.'); }
    }
  }
}
{
  const baseStrikes = updateStrikes;
  updateStrikes = function (g, dt) { baseStrikes(g, dt); updateShocks(g, dt); };
}

// Estilo do jogo: pixels de 2x2, cores chapadas e brilho em faixas pontilhadas (dither), nada de gradiente borrado.
const SHOCK_CELL = 2;
const SHOCK_BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
// Linha de células de 2x2 (Bresenham na grade), de (x0,y0) a (x1,y1) em px do mundo; `grow` engrossa em volta
function shockCells(ctx, x0, y0, x1, y1, grow = 0) {
  let cx = Math.round(x0 / SHOCK_CELL), cy = Math.round(y0 / SHOCK_CELL);
  const ex = Math.round(x1 / SHOCK_CELL), ey = Math.round(y1 / SHOCK_CELL), dx = Math.abs(ex - cx), dy = -Math.abs(ey - cy), sx = cx < ex ? 1 : -1, sy = cy < ey ? 1 : -1;
  let err = dx + dy;
  for (let n = 0; n < 400; n++) {
    ctx.fillRect((cx - grow) * SHOCK_CELL, (cy - grow) * SHOCK_CELL, SHOCK_CELL * (1 + grow * 2), SHOCK_CELL * (1 + grow * 2));
    if (cx === ex && cy === ey) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; cx += sx; }
    if (e2 <= dx) { err += dx; cy += sy; }
  }
}

// Depois da luz: brilho pontilhado em faixas, veios chapados com contorno e faíscas
function drawWaterShocks(ctx, g, ox, oy, z) {
  const list = g.shocks;
  if (!list?.length || g.lavaFluid) return;
  const world = g.world, vx = ox / z, vw = canvas.width / z, now = performance.now() / 1000;
  ctx.save(); ctx.setTransform(z, 0, 0, z, -ox, -oy); ctx.imageSmoothingEnabled = false;
  for (const sh of list) {
    if (sh.x + SHOCK.rx < vx || sh.x - SHOCK.rx > vx + vw) continue;
    const pw = shockPower(sh), flick = 0.7 + 0.3 * Math.sin(sh.t * 37 + sh.seed) * Math.sin(sh.t * 23 + sh.seed * 2), a = clamp(pw * flick, 0, 1);
    const ty = Math.floor((sh.y + 1) / T), ys = Math.round((sh.y + (typeof waveHeightAt === 'function' ? waveHeightAt(g, sh.x, ty) : 0)) / SHOCK_CELL) * SHOCK_CELL;
    // brilho: meia-elipse em 3 faixas, com a borda de cada faixa pontilhada (só onde há água)
    ctx.globalCompositeOperation = 'lighter';
    const cols = Math.ceil(SHOCK.rx / SHOCK_CELL), rows = Math.ceil(SHOCK.ry / SHOCK_CELL);
    for (let j = 0; j <= rows; j++) for (let i = -cols; i <= cols; i++) {
      const px = sh.x + i * SHOCK_CELL, py = ys + j * SHOCK_CELL, ex = (i * SHOCK_CELL) / SHOCK.rx, ey = (j * SHOCK_CELL) / SHOCK.ry, d = Math.sqrt(ex * ex + ey * ey);
      if (d >= 1) continue;
      const lvl = Math.pow(1 - d, 0.9) * a * 3.2, band = Math.floor(lvl + (SHOCK_BAYER[((j & 3) << 2) | (i & 3)] / 16 - 0.5) * 0.9);
      if (band < 1 || !world.waterAtPx(px, py + 1)) continue;
      ctx.fillStyle = band >= 3 ? 'rgba(206,232,238,0.22)' : band === 2 ? 'rgba(170,208,220,0.16)' : 'rgba(140,184,200,0.12)';
      ctx.fillRect(Math.round(px / SHOCK_CELL) * SHOCK_CELL, py, SHOCK_CELL, SHOCK_CELL);
    }
    ctx.globalCompositeOperation = 'source-over';
    // veios: contorno azul chapado, miolo claro e o tronco principal branco, como o raio do céu
    for (const pass of [0, 1]) for (const v of sh.veins) {
      ctx.fillStyle = pass === 0 ? `rgba(132,176,196,${Math.min(0.9, a * 1.1)})` : v.w ? `rgba(246,250,252,${Math.min(1, a * 1.6)})` : `rgba(214,232,240,${Math.min(1, a * 1.5)})`;
      for (let i = 1; i < v.pts.length; i++) shockCells(ctx, v.pts[i - 1][0], v.pts[i - 1][1] + (ys - sh.y), v.pts[i][0], v.pts[i][1] + (ys - sh.y), pass === 0 ? 1 : 0);
    }
    // estouro no ponto de queda nos primeiros instantes: cruz de blocos brancos
    if (sh.t < 0.28) {
      const k = 1 - sh.t / 0.28, r = Math.round((3 + 5 * k) / SHOCK_CELL) * SHOCK_CELL;
      ctx.fillStyle = `rgba(255,255,255,${k.toFixed(2)})`;
      ctx.fillRect(Math.round(sh.x / SHOCK_CELL) * SHOCK_CELL - r, ys - SHOCK_CELL, r * 2, SHOCK_CELL * 2); ctx.fillRect(Math.round(sh.x / SHOCK_CELL) * SHOCK_CELL - SHOCK_CELL, ys - r - SHOCK_CELL, SHOCK_CELL * 2, r + SHOCK_CELL * 2);
    }
    // faíscas na superfície: blocos 2x2 que piscam
    for (let k = 0; k < 12; k++) {
      const h = oaHash(k, Math.floor(now * 12), Math.floor(sh.seed)), x = Math.round((sh.x + (h - 0.5) * SHOCK.rx * 2 * (0.35 + 0.65 * pw)) / SHOCK_CELL) * SHOCK_CELL;
      if (!world.waterAtPx(x, ys + 3)) continue;
      ctx.fillStyle = `rgba(240,248,250,${(0.85 * a).toFixed(2)})`; ctx.fillRect(x, ys - SHOCK_CELL, SHOCK_CELL * (1 + (k & 1)), SHOCK_CELL);
    }
  }
  // bicho eletrocutado: faíscas em blocos de 2 px
  for (const m of g.mobs) {
    if (m.dead || m.carcass) continue;
    const lvl = shockLevelAt(g, m.cx, m.cy);
    if (lvl < 0.08) continue;
    const f = Math.floor(now * 14);
    for (let k = 0; k < 3; k++) {
      const x = Math.round((m.x + oaHash(k, f, Math.floor(m.x)) * m.w) / SHOCK_CELL) * SHOCK_CELL, y = Math.round((m.y + oaHash(f, k, Math.floor(m.y)) * m.h) / SHOCK_CELL) * SHOCK_CELL;
      ctx.fillStyle = k ? 'rgba(214,232,240,0.95)' : 'rgba(246,250,252,0.95)'; ctx.fillRect(x, y, SHOCK_CELL, SHOCK_CELL); ctx.fillRect(x + SHOCK_CELL * (k - 1), y + SHOCK_CELL, SHOCK_CELL, SHOCK_CELL);
    }
  }
  ctx.restore(); ctx.setTransform(1, 0, 0, 1, 0, 0);
}
