'use strict';
// =====================================================================================
//  TROMBA D'ÁGUA: o tornado sobre o mar, um lago ou um rio puxa a água para o céu
// =====================================================================================
// O funil (js/weather-plus.js) agora pousa na superfície da água (funnelBase, js/weather.js) e, quando está sobre ela,
// mexe na água usando o que o jogo já tem:
//   - a superfície afunda numa tigela em volta dele (as fatias das molas, js/water-waves.js) com um aro levantado, e
//     pulsos que giram em volta da base (waveImpulse) abrem ondas que correm para longe, mais ondinhas e borrifo;
//   - a água levantada sobe em espiral colada ao funil: uma bainha contínua de faixas de água com espuma nas listras que correm
//     para cima (mais larga e densa embaixo, esmaecendo no alto) e gotículas finas girando em volta; algumas são lançadas
//     para fora como waterBlob de verdade, que cai e respinga de volta no mar com a física normal;
//   - redemoinho embaixo: quem está na água perto da base (jogador, itens, peixes) é puxado para dentro, rodado e
//     levado para baixo, e a superfície ganha braços de espuma em espiral.
// Tudo some quando o funil sai de cima da água.

const SPOUT = { reach: 84, bowl: 11, bowlR: 44, maxDrops: 150 };

// Deslocamento (px, positivo = mais baixo) da superfície em x, por causa da tigela do redemoinho
function vortexAt(g, x, ty) {
  const f = g.lavaFluid ? null : g.weather?.funnel;
  if (!f?.water || f.strength < 0.1) return 0;
  const d = Math.abs(x - f.x);
  if (d > 150 || ty !== Math.floor((f.y + 2) / T)) return 0;
  const R = SPOUT.bowlR, s = clamp(f.strength, 0, 1);
  const bowl = SPOUT.bowl * s * Math.exp(-Math.pow(d / R, 2) * 1.5) * (1 + 0.12 * Math.sin(f.age * 9));
  const rim = -3.2 * s * Math.exp(-Math.pow((d - R * 1.45) / 11, 2));
  return bowl + rim;
}

// Centro do funil na altura h (fração da altura total): a mesma curva do desenho em js/weather-plus.js
function spoutCenter(f, h) {
  const s = f.strength, lean = clamp((f.vx || 0) / 60, -1, 1);
  return f.x + Math.sin(h * 2.6 + f.age * 0.55 + f.seed) * h * 30 * (0.6 + 0.4 * s) + lean * h * h * 48;
}
const spoutRadius = (h) => lerp(WX.tornado.bottomR, WX.tornado.topR * 0.62, Math.pow(clamp(h, 0, 1), 1.6));
function spoutDropPos(f, d) {
  const hf = d.h / WX.tornado.height, r = spoutRadius(hf) + 4 + d.r0 * 0.6 * clamp(1 - hf * 2.4, 0, 1);
  return { x: spoutCenter(f, hf) + Math.cos(d.a) * r, y: f.y - d.h + Math.sin(d.a) * r * 0.2, r, hf };
}

function updateWaterspout(g, f, dt) {
  const world = g.world, s = f.strength, C = WX.tornado;
  const list = g.spoutDrops ??= [];
  if (s < 0.1) { list.length = 0; return; }
  const H = C.height * (0.35 + 0.65 * Math.min(1, s * 1.4)), maxH = H * 0.5;
  // gotas novas na base, as mais grossas e lentas embaixo
  for (let n = dt * 50 * s + Math.random(); n >= 1 && list.length < SPOUT.maxDrops; n--)
    list.push({ h: 0, a: Math.random() * Math.PI * 2, w: 5 + Math.random() * 4, v: 55 + Math.random() * 85, r0: 6 + Math.random() * 18, size: 1 + Math.random() * 1.2 });
  for (let i = list.length - 1; i >= 0; i--) {
    const d = list[i];
    d.h += d.v * dt * (0.8 + 0.5 * s);
    d.a += d.w * (1.3 - 0.6 * (d.h / maxH)) * dt;
    if (d.h > maxH * (0.75 + 0.25 * ((d.r0 * 7) % 1))) {       // chegou ao alto: é lançada para fora e cai como água de verdade
      const p = spoutDropPos(f, d);
      if (Math.random() < 0.4) waterBlob(g, p.x, p.y, -Math.sin(d.a) * d.w * p.r * 0.32, -d.v * 0.2, 0.8 + Math.random() * 0.5, f.y);   // poucas, pequenas e lentas: caem na água de verdade
      list.splice(i, 1);
    }
  }
  // superfície: pulsos girando em volta da base abrem ondas que correm para fora
  if ((f.pulse = (f.pulse ?? 0) - dt) <= 0) {
    f.pulse = 0.07;
    for (let k = 0; k < 3; k++) { const ang = f.age * 5 + k * 2.094; waveImpulse(g, f.x + Math.cos(ang) * 34, f.y, 26 * s, 5); }
  }
  if (Math.random() < dt * 6 * s) addRipple(g, f.x + (Math.random() - 0.5) * 80, f.y, 14 + Math.random() * 16);
  for (let n = dt * 40 * s + Math.random(); n >= 1; n--) {
    const a = Math.random() * Math.PI * 2;
    waterParticle(g, f.x + Math.cos(a) * 32, f.y - 1, Math.cos(a) * (60 + Math.random() * 60), -60 - Math.random() * 90, 0.45);
  }
  // redemoinho: quem está na água perto da base é puxado para dentro, rodado e levado para baixo
  const R = SPOUT.reach, swirl = (b) => {
    if (!b || b.dead || b.boss || b.carcass) return;
    const dx = b.cx - f.x, ad = Math.abs(dx);
    if (ad > R || !world.waterAtPx(b.cx, b.cy) || b.y + b.h < f.y) return;
    const k = Math.pow(1 - ad / R, 1.3) * s;
    b.moveX((-Math.sign(dx || 1) * 110 * k + Math.sin(f.age * 6 + (b.spinPh ??= Math.random() * 6)) * 150 * k) * dt, world);
    b.moveY(90 * k * dt, world);
  };
  swirl(g.player);
  for (const m of g.mobs) if (Math.abs(m.cx - f.x) < R + 30) swirl(m);
  for (const d of g.drops || []) {
    const dx = d.x - f.x, ad = Math.abs(dx);
    if (ad > R || !world.waterAtPx(d.x, d.y + 2)) continue;
    const k = Math.pow(1 - ad / R, 1.3) * s;
    d.vx = (d.vx || 0) + (-Math.sign(dx || 1) * 240 * k + Math.sin(f.age * 6 + d.x) * 200 * k) * dt;
  }
}
{
  const baseTornado = updateTornado;
  updateTornado = function (g, f, dt) {
    baseTornado(g, f, dt);
    if (f.water) updateWaterspout(g, f, dt); else if (g.spoutDrops?.length) g.spoutDrops.length = 0;
  };
}

// Em cima da água: a bainha de água em espiral colada ao funil, as gotículas, os braços de espuma na superfície e a saia de borrifo
function drawWaterspout(ctx, g) {
  const f = g.lavaFluid ? null : g.weather?.funnel;
  if (!f?.water || f.strength < 0.1) return;
  const s = clamp(f.strength, 0, 1), t = f.age, C = WX.tornado, H = C.height * (0.35 + 0.65 * Math.min(1, s * 1.4)), maxH = H * 0.5;
  ctx.save(); ctx.imageSmoothingEnabled = false;
  // bainha: faixas de 2 px como as do próprio funil, só que de água; listras de espuma sobem em espiral
  const water = [112, 178, 226], foam = [238, 249, 255];
  for (let row = 0; row < maxH; row += 2) {
    const h = row / C.height, hv = row / maxH, y = f.y - row, cx = spoutCenter(f, h);
    const r = spoutRadius(h) + 4 + 15 * Math.pow(1 - hv, 1.5) + Math.sin(t * 6 + row * 0.3) * 1.1, a0 = Math.pow(1 - hv, 0.7) * 0.72 * s;
    const segs = 6;
    for (let k = 0; k < segs; k++) {
      const across = (k + 0.5) / segs * 2 - 1, x0 = cx - r + (k / segs) * r * 2, wseg = (r * 2) / segs;
      const stripe = Math.sin(h * 64 - t * 15 + across * 2.4 + f.seed) * 0.5 + 0.5, foamy = clamp(stripe * 0.75 + (1 - hv) * 0.3, 0, 1);
      const light = 1.1 - (across + 1) * 0.18, edge = 1 - Math.pow(Math.abs(across), 3) * 0.75;
      ctx.fillStyle = `rgba(${(lerp(water[0], foam[0], foamy) * light) | 0},${(lerp(water[1], foam[1], foamy) * light) | 0},${(lerp(water[2], foam[2], foamy) * light) | 0},${(a0 * edge).toFixed(3)})`;
      ctx.fillRect(Math.round(x0), Math.round(y - 2), Math.ceil(wseg) + 1, 2);
    }
  }
  // gotículas finas girando em volta (a metade de trás fica mais fraca)
  for (const d of g.spoutDrops || []) {
    const p = spoutDropPos(f, d), front = Math.sin(d.a) > -0.1, a = (1 - d.h / (maxH * 1.05)) * (front ? 0.9 : 0.45) * s;
    if (a <= 0.04) continue;
    ctx.fillStyle = `rgba(${front ? '236,248,255' : '170,206,232'},${a.toFixed(2)})`;
    ctx.fillRect(Math.round(p.x), Math.round(p.y), d.size > 1.7 ? 2 : 1, 1 + (d.size > 1.3 ? 1 : 0));
  }
  // braços de espuma em espiral na superfície e o olho do redemoinho
  const R = 70;
  for (let arm = 0; arm < 6; arm++) for (let k = 0; k < 30; k++) {
    const u = k / 29, ang = -t * 5.4 * (1.25 - u * 0.45) + arm * (Math.PI / 3) + u * 3.5, r = R * (0.16 + u * 0.95);
    const x = f.x + Math.cos(ang) * r, y = f.y + 1 + Math.sin(ang) * r * 0.16;
    ctx.fillStyle = `rgba(246,253,255,${(Math.pow(1 - u, 1.2) * 0.85 * s * (0.65 + 0.35 * Math.sin(t * 7 + arm + k))).toFixed(2)})`;
    ctx.fillRect(Math.round(x), Math.round(y), u < 0.5 ? 3 : 2, 1);
  }
  ctx.fillStyle = `rgba(14,44,70,${(0.5 * s).toFixed(2)})`;
  ctx.fillRect(Math.round(f.x - 7), Math.round(f.y + 1), 14, 2);
  // saia de borrifo: faixas translúcidas que alargam para baixo
  for (let row = 0; row < 7; row++) {
    const w = 24 + row * 6 + Math.sin(t * 6 + row) * 3, a = (1 - row / 7) * 0.3 * s;
    ctx.fillStyle = `rgba(236,248,255,${a.toFixed(2)})`;
    ctx.fillRect(Math.round(f.x - w), Math.round(f.y - 2 - row * 3), Math.round(w * 2), 2);
  }
  ctx.restore();
}
