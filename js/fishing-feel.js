'use strict';
// =====================================================================================
//  PESCA: linha com física, vara que se curva, e tudo por ícones (nada de painel de menu)
// =====================================================================================
//  • A linha é uma corda de verdade (Verlet): pesa no ar, boia e amortece na água, fica frouxa esperando, estica quando o
//    peixe puxa e não atravessa bloco. Só desenho: o resultado da pesca continua em js/fishing.js (e no multijogador).
//  • A vara se curva com a tensão da linha (arrancada do peixe = curva forte), então dá para "sentir" a briga.
//  • Sem painel: a isca aparece num selo em cima do personagem (botão direito troca), a água mira com um anel e uma trajetória
//    pontilhada, a fisgada é um balão de "!" com anel de tempo, e na briga um peixinho vai se enchendo (progresso), um anel
//    em volta da boia mostra a tensão e um ícone de mouse diz se é para SEGURAR ou SOLTAR o botão.
// Carrega depois de fishing.js.

// ---------------------------------------------------------------- vara que se curva
function fishingRodBend(s) {
  if (!s) return 0;
  if (s.state === 'reel') return clamp((s.tension || 0) * 0.62 + (s.struggle ? 0.12 : 0), 0, 0.78);
  if (s.state === 'bite') return 0.22 + Math.sin((s.age || 0) * 22) * 0.07;
  if (s.state === 'wait' && (s.nibble || 0) > 0.1) return 0.05 + Math.sin((s.age || 0) * 14) * 0.03;
  return 0;
}
// Rotação em torno da empunhadura; cada pixel gira um pouco mais quanto mais longe do cabo (a ponta cede)
const fishingBendAngle = (angle, bend, r) => angle + bend * Math.pow(r / 36, 1.5);
fishingRodSprite = function (rod, state) {
  const model = Math.max(0, FISHING_RODS.indexOf(rod)), frame = fishingRodFrame(state), angle = Math.round(fishingRodAngle(state) / 0.06) * 0.06, bend = Math.round(fishingRodBend(state) / 0.07) * 0.07;
  const key = model + ':' + frame + ':' + angle + ':' + bend;
  if (fishingRodPixels.has(key)) return fishingRodPixels.get(key);
  const source = FISHING_ROD_ART[model][frame], c = makeCanvas(80, 80), ctx = c.getContext('2d'), data = source.getContext('2d').getImageData(0, 0, source.width, source.height).data;
  for (let Y = 0; Y < 80; Y++) for (let X = 0; X < 80; X++) {              // mapeamento inverso: sem buracos na parte curvada
    const ddx = X - 40, ddy = Y - 56, th = fishingBendAngle(angle, bend, Math.hypot(ddx, ddy)), cs = Math.cos(th), sn = Math.sin(th);
    const sx = Math.round(4 + ddx * cs + ddy * sn), sy = Math.round(31 - ddx * sn + ddy * cs);
    if (sx < 0 || sy < 0 || sx >= source.width || sy >= source.height) continue;
    const i = (sy * source.width + sx) * 4;
    if (!data[i + 3]) continue;
    ctx.fillStyle = `rgb(${data[i]},${data[i + 1]},${data[i + 2]})`; ctx.fillRect(X, Y, 1, 1);
  }
  const dx = source.rodTip.x - 4, dy = source.rodTip.y - 31, th = fishingBendAngle(angle, bend, Math.hypot(dx, dy)), cs = Math.cos(th), sn = Math.sin(th);
  c.rodTip = { x: Math.round(dx * cs - dy * sn), y: Math.round(dx * sn + dy * cs) };
  fishingRodPixels.set(key, c);
  if (fishingRodPixels.size > 400) fishingRodPixels.delete(fishingRodPixels.keys().next().value);
  return c;
};

// ---------------------------------------------------------------- linha: corda de Verlet
const FLINE = { map: new Map(), last: 0, frame: 0 };
function fishingPushOut(p, world) {
  if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) { p.x = p.px = 0; p.y = p.py = 0; return; }
  const tx = Math.floor(p.x / T), ty = Math.floor(p.y / T);
  if (!world.isSolid(tx, ty)) return;
  const opts = [[p.x - tx * T, -1, 0, !world.isSolid(tx - 1, ty)], [(tx + 1) * T - p.x, 1, 0, !world.isSolid(tx + 1, ty)], [p.y - ty * T, 0, -1, !world.isSolid(tx, ty - 1)], [(ty + 1) * T - p.y, 0, 1, !world.isSolid(tx, ty + 1)]].filter((o) => o[3]).sort((a, b) => a[0] - b[0]);
  if (!opts.length) { p.x = p.px; p.y = p.py; return; }
  const [d, nx, ny] = opts[0];
  p.x += nx * (d + 0.6); p.y += ny * (d + 0.6);
  if (nx) p.px = p.x; else p.py = p.y;                                                           // perde só a velocidade contra a parede
}
function fishingLineFor(key, id, a, b) {
  let L = FLINE.map.get(key);
  if (!L || L.id !== id) {
    L = { id, pts: Array.from({ length: 27 }, (_, i) => { const t = i / 26, x = lerp(a.x, b.x, t), y = lerp(a.y, b.y, t); return { x, y, px: x, py: y }; }) };
    FLINE.map.set(key, L);
  }
  L.seen = FLINE.frame;
  return L;
}
// tip e bob são as pontas presas; len = comprimento da corda (frouxa quando maior que a distância)
function fishingLineStep(L, tip, bob, len, surface, world, dt) {
  const P = L.pts, N = P.length - 1, n = clamp(Math.ceil(dt / 0.008), 1, 4), h = dt / n;
  for (let step = 0; step < n; step++) {
    for (let i = 1; i < N; i++) {
      const p = P[i], wet = p.y > surface, damp = wet ? 0.86 : 0.996, vx = (p.x - p.px) * damp, vy = (p.y - p.py) * damp;
      p.px = p.x; p.py = p.y;
      p.x += vx; p.y += vy + (wet ? -70 : 560) * h * h;
    }
    P[0].x = P[0].px = tip.x; P[0].y = P[0].py = tip.y; P[N].x = P[N].px = bob.x; P[N].y = P[N].py = bob.y;
    const rest = Math.max(len, Math.hypot(bob.x - tip.x, bob.y - tip.y)) / N;
    for (let it = 0; it < 10; it++) {
      for (let i = 0; i < N; i++) {
        const a = P[i], b = P[i + 1], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.0001, k = (d - rest) / d;
        const wa = i === 0 ? 0 : i + 1 === N ? 1 : 0.5, wb = i + 1 === N ? 0 : i === 0 ? 1 : 0.5;   // as pontas ficam presas
        a.x += dx * k * wa; a.y += dy * k * wa; b.x -= dx * k * wb; b.y -= dy * k * wb;
      }
    }
    for (let i = 1; i < N; i++) fishingPushOut(P[i], world);                                     // não atravessa bloco: sai pela borda mais próxima
  }
}

// ---------------------------------------------------------------- pixels (nada de contorno suavizado)
const fpx = (ctx, x, y, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), 1, 1); };
const FI = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
function fLine(ctx, x0, y0, x1, y1, c) {                                                    // Bresenham
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  ctx.fillStyle = c;
  for (let i = 0; i < 400; i++) {
    ctx.fillRect(x0, y0, 1, 1);
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x0 += sx; }
    if (e2 <= dx) { err += dx; y0 += sy; }
  }
}
// círculo/arco em pixels (a0 a a1 em radianos, começando no topo e girando no sentido horário)
function fArc(ctx, cx, cy, r, c, frac = 1) {
  ctx.fillStyle = c;
  const n = Math.ceil(r * 10), end = Math.floor(n * clamp(frac, 0, 1));
  for (let k = 0; k <= end; k++) { const a = -Math.PI / 2 + (k / n) * Math.PI * 2; ctx.fillRect(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), 1, 1); }
}
function fDisc(ctx, cx, cy, r, c) { ctx.fillStyle = c; for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) ctx.fillRect(cx + x, cy + y, 1, 1); }
function fFrame(ctx, x, y, w, h, c) { FI(ctx, c, x, y, w, 1); FI(ctx, c, x, y + h - 1, w, 1); FI(ctx, c, x, y, 1, h); FI(ctx, c, x + w - 1, y, 1, h); }
// mini fonte de números 3x5
const FDIG = { 0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001111001111', 4: '101101111001001', 5: '111100111001111', 6: '111100111101111', 7: '111001001010010', 8: '111101111101111', 9: '111101111001111', x: '000101010101000' };
function fText(ctx, str, x, y, c) { let px = x; for (const ch of String(str)) { const g = FDIG[ch]; if (g) for (let i = 0; i < 15; i++) if (g[i] === '1') FI(ctx, c, px + (i % 3), y + Math.floor(i / 3), 1, 1); px += 4; } return px - x; }

// Mouse: modo 'hold' (botão esquerdo apertado, amarelo), 'release' (esquerdo solto, cinza com pausa), 'right' (botão direito azul)
function fishingMouseIcon(ctx, x, y, mode, pulse = 1) {
  x = Math.round(x); y = Math.round(y);
  FI(ctx, '#171f26', x - 4, y - 7, 9, 15); FI(ctx, '#171f26', x - 5, y - 6, 11, 13);          // cantos arredondados
  FI(ctx, '#d3dde1', x - 3, y - 6, 7, 13); FI(ctx, '#d3dde1', x - 4, y - 5, 9, 11);
  FI(ctx, '#8d9aa1', x - 4, y - 1, 9, 1); FI(ctx, '#8d9aa1', x, y - 6, 1, 5); FI(ctx, '#aeb9be', x - 2, y + 2, 5, 1);
  const active = '#ffd466';
  if (mode === 'hold') { FI(ctx, active, x - 4, y - 5, 4, 4); FI(ctx, active, x - 3, y - 6, 3, 1); if (pulse > 0.5) { fpx(ctx, x - 3, y - 5, '#fff2b0'); fpx(ctx, x - 2, y - 5, '#fff2b0'); } }
  else if (mode === 'release') { FI(ctx, '#56646c', x - 4, y - 5, 4, 4); FI(ctx, '#56646c', x - 3, y - 6, 3, 1); FI(ctx, '#e9eef0', x + 7, y - 5, 1, 5); FI(ctx, '#e9eef0', x + 9, y - 5, 1, 5); }
  else if (mode === 'right') { FI(ctx, '#6fb4e6', x + 1, y - 5, 4, 4); FI(ctx, '#6fb4e6', x + 1, y - 6, 3, 1); }
}
// Balão de exclamação com um anel de tempo que esvazia
function fishingBiteIcon(ctx, x, y, frac) {
  x = Math.round(x); y = Math.round(y);
  fDisc(ctx, x, y, 8, '#171f26'); fDisc(ctx, x, y, 7, '#ffd466');
  FI(ctx, '#fff2b0', x - 5, y - 3, 1, 3); FI(ctx, '#fff2b0', x - 4, y - 5, 2, 1);
  FI(ctx, '#2b2118', x - 1, y - 5, 3, 6); FI(ctx, '#2b2118', x - 1, y + 3, 3, 2);
  const ring = frac < 0.3 ? '#ff7a5c' : '#fff2b0';
  fArc(ctx, x, y, 11, 'rgba(14,26,34,.7)'); fArc(ctx, x, y, 11, ring, frac); fArc(ctx, x, y, 10, ring, frac);
}
const fishingSilhouettes = new Map();
function fishingSilhouette(kind) {
  let c = fishingSilhouettes.get(kind);
  if (c) return c;
  const sp = aquaticSprite(kind, 0).normal;
  c = makeCanvas(sp.width, sp.height);
  const g = c.getContext('2d'); g.drawImage(sp, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#10202a'; g.fillRect(0, 0, c.width, c.height);
  fishingSilhouettes.set(kind, c);
  return c;
}
// Peixinho que se enche da cauda para a cabeça conforme a captura avança
function fishingFishMeter(ctx, kind, x, y, frac, hot) {
  const sp = aquaticSprite(kind, 0).normal, sil = fishingSilhouette(kind), sc = Math.min(2, Math.floor(24 / sp.width) || 1, Math.floor(13 / sp.height) || 1), w = sp.width * sc, h = sp.height * sc, dx = Math.round(x - w / 2), dy = Math.round(y - h / 2);
  ctx.save(); ctx.imageSmoothingEnabled = false;
  FI(ctx, 'rgba(16,32,42,.82)', dx - 3, dy - 3, w + 6, h + 6);
  ctx.drawImage(sil, dx, dy, w, h);
  const cut = Math.max(0, Math.round(sp.width * clamp(frac, 0, 1)));
  if (cut > 0) ctx.drawImage(sp, 0, 0, cut, sp.height, dx, dy, cut * sc, h);
  fFrame(ctx, dx - 3, dy - 3, w + 6, h + 6, hot ? '#ff8a6c' : '#7fa9b4');
  ctx.restore();
}
// Selo de isca em cima do personagem: [mouse] [isca] xN, com pontinhos quando há mais de uma isca
function fishingBaitChip(ctx, g) {
  const p = g.player, list = FISHING_BAITS.filter((id) => g.inventory.count(id)), sel = fishingBait(g), id = sel ?? FISHING_BAITS[0];
  const x = Math.round(p.cx), y = Math.round(p.y - 22), count = sel != null ? g.inventory.count(sel) : 0, label = 'x' + count, tw = label.length * 4;
  const w = 18 + 18 + tw + 4, left = x - Math.round(w / 2);
  ctx.save(); ctx.imageSmoothingEnabled = false;
  FI(ctx, 'rgba(14,26,34,.88)', left, y - 12, w, 24); fFrame(ctx, left, y - 12, w, 24, sel != null ? '#5f8791' : '#e9674f');
  fishingMouseIcon(ctx, left + 9, y, list.length > 1 ? 'right' : 'hold');
  ctx.globalAlpha = sel != null ? 1 : 0.45; ctx.drawImage(renderer.tex.itemAtlas, id * T, 0, T, T, left + 19, y - 8, 16, 16); ctx.globalAlpha = 1;
  if (sel == null) { fLine(ctx, left + 20, y - 7, left + 33, y + 7, '#ff7a5c'); fLine(ctx, left + 21, y - 7, left + 34, y + 7, '#ff7a5c'); fLine(ctx, left + 33, y - 7, left + 20, y + 7, '#ff7a5c'); fLine(ctx, left + 34, y - 7, left + 21, y + 7, '#ff7a5c'); }
  else fText(ctx, label, left + 38, y - 2, '#f1ead2');
  if (list.length > 1) list.forEach((b, i) => FI(ctx, b === sel ? '#ffd466' : '#4d6670', left + 27 - list.length * 2 + i * 4, y + 9, 3, 1));
  ctx.restore();
}
// Mira: anel na água onde a boia cai, trajetória pontilhada e um X vermelho quando está longe demais
function fishingAim(ctx, g) {
  const p = g.player, held = g.inventory.slots[g.selected]?.item, def = ITEM_DEFS[held]?.fishingRod;
  if (!def || g.fishing || g.inventoryUI?.open || g.mapUI?.open || g.paused || g.npcOpen || g.adminOpen) return;
  fishingBaitChip(ctx, g);
  const m = screenToWorld(input.mouse.x, input.mouse.y), tgt = fishingTarget(g.world, m.x, m.y);
  if (!tgt) return;
  const now = performance.now() / 1000, ok = Math.hypot(tgt.x - p.cx, tgt.y - p.cy) <= def.range * T && fishingBait(g) != null, col = ok ? '#d2f0fa' : '#f57864';
  ctx.save();
  for (let k = 0; k < 2; k++) {                                                      // marolas que se abrem (elipses em pixels)
    const f = (now * 1.2 + k * 0.5) % 1, rx = 4 + f * 9, ry = Math.max(1, rx * 0.3);
    ctx.globalAlpha = 0.9 * (1 - f); ctx.fillStyle = col;
    for (let a = 0; a < Math.PI * 2; a += 1 / rx) ctx.fillRect(Math.round(tgt.x + Math.cos(a) * rx), Math.round(tgt.surface + 1 + Math.sin(a) * ry), 1, 1);
  }
  ctx.globalAlpha = 1;
  if (ok) {                                                                            // mesma balística do lançamento (js/fishing.js)
    const tip = fishingRodTip(p, held, null), ft = clamp(0.35 + Math.abs(tgt.x - tip.x) / 400, 0.35, 1.1), vx = (tgt.x - tip.x) / ft, vy = (tgt.surface + 1 - tip.y - 210 * ft * ft) / ft;
    for (let i = 1; i <= 9; i++) { const t = ft * i / 10; fpx(ctx, tip.x + vx * t, tip.y + vy * t + 210 * t * t, i % 2 ? '#e6f3f8' : '#9fc4d0'); }
  } else { fLine(ctx, tgt.x - 4, tgt.surface - 13, tgt.x + 4, tgt.surface - 5, col); fLine(ctx, tgt.x - 3, tgt.surface - 13, tgt.x + 5, tgt.surface - 5, col); fLine(ctx, tgt.x + 4, tgt.surface - 13, tgt.x - 4, tgt.surface - 5, col); fLine(ctx, tgt.x + 5, tgt.surface - 13, tgt.x - 3, tgt.surface - 5, col); }
  ctx.restore();
}
function fishingPopup(g, item) { (g.fishPopups ??= []).push({ item, x: g.player.cx, y: g.player.y - 6, t: 0 }); }

// ---------------------------------------------------------------- boia e anzol em pixels
const FLOAT_PAL = { o: '#262030', r: '#d2463a', R: '#f48a6c', w: '#f4f0e2', s: '#bcb4a2', a: '#ffd466' };
const FLOAT_ROWS = ['..a..', '..a..', '.oro.', 'orRro', 'orrro', 'owwwo', 'oswwo', '.oso.', '..o..'];
const HOOK_ROWS = ['...g.', '...g.', '...g.', '...gh', 'g..g.', 'gg.g.', '.ggg.'];
const HOOK_PAL = { g: '#aab6bd', h: '#e8eff2' };
const BAIT_COLORS = [[207, 172, 98], [152, 100, 62], [162, 112, 204], [112, 222, 242]];
function fishingDrawSprite(ctx, rows, pal, x, y, surface, wetAlpha = 0.55) {
  for (let j = 0; j < rows.length; j++) for (let i = 0; i < rows[j].length; i++) {
    const ch = rows[j][i]; if (ch === '.') continue;
    const px = x + i, py = y + j, wet = surface != null && py > surface;
    ctx.globalAlpha = wet ? wetAlpha : 1; ctx.fillStyle = pal[ch]; ctx.fillRect(px, py, 1, 1);
  }
  ctx.globalAlpha = 1;
}
function fishingDrawBobber(ctx, bx, bob, surface, bite) {
  const x = Math.round(bx) - 2, y = Math.round(bob) - 4;
  fishingDrawSprite(ctx, FLOAT_ROWS, bite ? { ...FLOAT_PAL, r: '#ffb43c', R: '#ffe08a' } : FLOAT_PAL, x, y, surface, 0.5);
}
function fishingDrawHook(ctx, x, y, bait) {
  const c = BAIT_COLORS[clamp(ITEM_DEFS[bait]?.fishingBait?.tier ?? 0, 0, 3)], rgb = `rgb(${c[0]},${c[1]},${c[2]})`, dark = `rgb(${c[0] * 0.6 | 0},${c[1] * 0.6 | 0},${c[2] * 0.6 | 0})`;
  ctx.globalAlpha = 0.85; fishingDrawSprite(ctx, HOOK_ROWS, HOOK_PAL, Math.round(x) - 3, Math.round(y) - 1, null);
  ctx.fillStyle = rgb; ctx.fillRect(Math.round(x) - 2, Math.round(y) + 3, 2, 2); ctx.fillStyle = dark; ctx.fillRect(Math.round(x) - 2, Math.round(y) + 4, 1, 1); ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.6; ctx.fillRect(Math.round(x) - 1, Math.round(y) + 3, 1, 1);
  ctx.globalAlpha = 1;
}
// Curva suave (Catmull-Rom) pelos pontos da corda, riscada em pixels
function fishingSplinePoints(P) {
  const out = [];
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
    for (let k = 0; k < 4; k++) {
      const t = k / 4, t2 = t * t, t3 = t2 * t;
      out.push([0.5 * (2 * p1.x + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
        0.5 * (2 * p1.y + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)]);
    }
  }
  out.push([P.at(-1).x, P.at(-1).y]);
  return out;
}

// ---------------------------------------------------------------- desenho principal
drawFishing = function (ctx, g) {
  const list = new Map(fishingViews);
  if (g.fishing) list.set(fishingOwner(), g.fishing);
  if (!fishingGuest()) for (const s of fishingSessions.values()) list.set(s.owner, s);
  const t = g.clock || 0, now = performance.now() / 1000, dt = clamp(now - (FLINE.last || now), 0, 0.05);
  FLINE.last = now; FLINE.frame++;
  ctx.save(); ctx.imageSmoothingEnabled = false;
  fishingAim(ctx, g);
  for (const s of list.values()) {
    if (s.state === 'pending') continue;
    const p = fishingPlayer(s.owner); if (!p) continue;
    const tip = fishingRodTip(p, s.rod, fishingVisual(s));
    const flight = s.state === 'flight', airborne = flight || s.state === 'cast', elapsed = flight && fishingGuest() ? Math.min(0.2, Math.max(0, t - (s.receivedAt ?? t))) : 0, smooth = fishingGuest() ? clamp((t - (s.receivedAt ?? t)) / 0.1, 0, 1) : 1;
    const bx = s.state === 'reel' ? lerp(s.previousX ?? s.x, s.x, smooth) : s.x + (s.vx || 0) * elapsed;
    const bob = airborne ? s.y + (flight ? (s.vy || 0) * elapsed + 210 * elapsed * elapsed : 0) : s.state === 'reel' ? lerp(s.previousY ?? s.y, s.y, smooth) : s.state === 'bite' ? s.surface + 3 + Math.round(Math.sin(t * 18) * 1.5) : s.surface - 2 + Math.round(Math.sin(t * ((s.nibbling || s.nibble > 0.1) ? 14 : 3)));
    // linha de Verlet: frouxa esperando, esticada quando o peixe puxa
    const dist = Math.hypot(bx - tip.x, bob - tip.y), tension = s.tension || 0;
    const len = s.state === 'cast' ? dist + 2 : flight ? dist + 9 : s.state === 'wait' ? dist * 1.035 + 8 + Math.min(16, dist * 0.07) : s.state === 'bite' ? dist * 1.02 + 3 : dist * 1.004 + (1 - clamp(tension * 1.6, 0, 1)) * 6;
    const line = fishingLineFor(s.owner, s.id, tip, { x: bx, y: bob });
    fishingLineStep(line, tip, { x: bx, y: bob }, len, s.surface ?? bob, g.world, dt || 0.016);
    const hot = tension > 0.7, warn = s.phase === 'warning', dry = hot ? '#ee9a74' : warn ? '#efd084' : '#e9f2f6', wetC = hot ? '#b9795c' : warn ? '#a8946a' : '#8fb0bc', surf = s.surface ?? 1e9;
    const sp = fishingSplinePoints(line.pts);
    for (let i = 0; i < sp.length - 1; i++) fLine(ctx, sp[i][0], sp[i][1], sp[i + 1][0], sp[i + 1][1], sp[i][1] > surf ? wetC : dry);
    if (!airborne && s.state !== 'reel') {                                      // fio da boia até o anzol, e o anzol com a isca
      FI(ctx, '#9fbcc8', Math.round(s.x), Math.round(bob) + 5, 1, Math.max(0, Math.round(s.y) - Math.round(bob) - 5));
    }
    fishingDrawBobber(ctx, bx, bob, airborne ? null : s.surface, s.state === 'bite');
    if (airborne) continue;
    if (s.state !== 'reel') fishingDrawHook(ctx, s.x, s.y, s.bait);
    if (s.state !== 'reel' && s.state !== 'cast') { const width = 5 + Math.floor((t * 2) % 3) * 3; ctx.globalAlpha = 0.55; FI(ctx, '#bee2ee', Math.round(s.x) - width, Math.round(s.surface) + 1, width - 3, 1); FI(ctx, '#bee2ee', Math.round(s.x) + 4, Math.round(s.surface) + 1, width - 3, 1); ctx.globalAlpha = 1; }
    if (s.state === 'wait' && (s.nibble || 0) > 0.1) for (let i = 0; i < 3; i++) { const f = (t * 1.3 + i / 3) % 1; ctx.globalAlpha = 0.85 * (1 - f); FI(ctx, '#d6f2fa', Math.round(bx + Math.sin(f * 9 + i * 2) * 3), Math.round(s.surface - 2 - f * 10), 2, 2); ctx.globalAlpha = 1; }   // bolhinhas: tem peixe beliscando
    if (s.state === 'bite') fishingBiteIcon(ctx, bx, s.surface - 19, s.time / (ITEM_DEFS[s.rod]?.fishingRod?.window || 1.2));
    if (s.state === 'reel') {
      // anel de tensão em volta da boia, em pixels
      const rx = Math.round(bx), ry = Math.round(bob) + 1, col = hot ? '#ff8a6c' : tension > 0.45 ? '#f0d078' : '#9fe0c0';
      for (const r of [9, 8, 7]) fArc(ctx, rx, ry, r, 'rgba(16,32,42,.62)');
      for (const r of [8, 7]) fArc(ctx, rx, ry, r, col, clamp(tension, 0.04, 1));
      if (hot && Math.floor(t * 8) % 2) fArc(ctx, rx, ry, 11, '#ff7a5c');
      const kind = s.fishKind || s.fish?.kind;
      if (kind && AQUATIC[kind]) {
        const my = Math.round(bob) - 27;
        fishingFishMeter(ctx, kind, bx - 12, my, s.progress || 0, hot);
        const slackBlink = (s.slack || 0) > 1 && Math.floor(t * 6) % 2;
        const mode = hot || s.struggle || s.phase === 'surge' ? 'release' : 'hold';
        fishingMouseIcon(ctx, bx + 17, my, slackBlink ? 'release' : mode, Math.floor(t * 5) % 2);
        if (s.phase === 'warning') { FI(ctx, '#ffd466', bx + 28, my - 6, 2, 8); FI(ctx, '#ffd466', bx + 28, my + 4, 2, 2); }
      }
      if (s.struggle && (s.progress || 0) < 0.72) for (let i = 0; i < 5; i++) { const f = (t * 3 + i * 0.37) % 1; FI(ctx, '#b2dce8', Math.round(bx) + Math.round(Math.sin(t * 12 + i * 2) * 9), Math.round(s.surface) - 1 - Math.round(f * 9), 2, 1); }   // respingos na briga
    }
  }
  for (const [key, L] of FLINE.map) if (L.seen !== FLINE.frame) FLINE.map.delete(key);
  // peixe pescado sobe da mão
  const pops = g.fishPopups;
  if (pops?.length) for (let i = pops.length - 1; i >= 0; i--) {
    const q = pops[i]; q.t += dt;
    if (q.t > 1.1) { pops.splice(i, 1); continue; }
    const k = q.t / 1.1, a = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
    ctx.globalAlpha = a;
    ctx.drawImage(renderer.tex.itemAtlas, q.item * T, 0, T, T, Math.round(q.x - 8), Math.round(q.y - 10 - k * 22), 16, 16);
    for (let j = 0; j < 4; j++) { const ang = j * 1.57 + k * 5; FI(ctx, '#fff6c4', q.x + Math.cos(ang) * (8 + k * 8), q.y - 2 - k * 22 + Math.sin(ang) * (8 + k * 8), 1, 1); }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
};
// o painel de texto saiu: tudo agora é desenhado no mundo, por ícones (drawFishing)
drawFishingHud = function () {};
