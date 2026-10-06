'use strict';

// =====================================================================================
//  EFEITOS DOS PODERES DE CHEFE
// =====================================================================================
// Mesmo jeito do tridente (js/trident.js): corpo em camadas opacas (contorno, corpo, luz,
// reflexo), detalhe que se mexe por cima e só um halo fraco somando luz. Tudo desenhado
// depois da camada de luz, então os poderes aparecem também no escuro.
//
//   bfx(g, tipo, x, y, opções)   solta um efeito na lista g.bossFx
//   updateBossFx / drawBossFx     chamados por js/game.js e js/renderer.js

// ---------- Paletas ----------
const BFX_PAL = {
  earth: [[46, 32, 22], [110, 80, 52], [176, 134, 86]],
  stone: [[40, 38, 42], [104, 100, 96], [168, 162, 150]],
  chitin: [[20, 26, 40], [64, 84, 118], [130, 158, 200]],
  amber: [[92, 36, 8], [230, 140, 36], [255, 222, 140]],
  blood: [[60, 8, 12], [168, 28, 34], [236, 90, 80]],
  venom: [[26, 60, 20], [110, 196, 64], [210, 255, 150]],
  honey: [[110, 58, 8], [236, 164, 36], [255, 232, 150]],
  silk: [[120, 112, 140], [222, 218, 236], [255, 255, 255]],
  gold: [[110, 70, 10], [240, 186, 70], [255, 246, 200]],
  ghost: [[70, 44, 120], [160, 120, 236], [236, 220, 255]],
};
const bfxRgb = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

function bfx(g, type, x, y, o = {}) {
  const list = (g.bossFx ??= []);
  if (list.length > 700) list.splice(0, list.length - 700);
  const e = { type, x, y, vx: 0, vy: 0, t: 0, life: 0.5, size: 2, rot: Math.random() * 6.28, spin: 0, grav: 0, drag: 0, ...o };
  if (type === 'shard' && !e.pts) { // lasca: polígono irregular de 5 a 6 pontas
    const n = 5 + (Math.random() < 0.5 ? 1 : 0);
    e.pts = Array.from({ length: n }, (_, i) => { const a = (i / n) * 6.28 + Math.random() * 0.6, r = e.size * (0.6 + Math.random() * 0.5); return [Math.cos(a) * r, Math.sin(a) * r]; });
  }
  list.push(e);
  return e;
}
const rnd11 = () => Math.random() * 2 - 1;
// Leque de lascas, poeira e faíscas (impacto no chão ou numa parede)
function bfxImpact(g, x, y, { pal = BFX_PAL.earth, shards = 8, dust = 6, sparks = 0, dir = 0, power = 1, spark = [255, 220, 140] } = {}) {
  for (let i = 0; i < shards; i++) {
    const a = -Math.PI / 2 + rnd11() * 1.2 + dir * 0.5, v = (120 + Math.random() * 180) * power;
    bfx(g, 'shard', x + rnd11() * 6, y - 2, { vx: Math.cos(a) * v, vy: Math.sin(a) * v, grav: 900, spin: rnd11() * 14, size: 1.6 + Math.random() * 2.2 * power, life: 0.6 + Math.random() * 0.4, pal });
  }
  for (let i = 0; i < dust; i++) bfx(g, 'dust', x + rnd11() * 10, y - 3, { vx: rnd11() * 40 + dir * 30, vy: -10 - Math.random() * 25, r0: 3, r1: 8 + Math.random() * 6 * power, life: 0.6 + Math.random() * 0.5, color: pal[1] });
  for (let i = 0; i < sparks; i++) {
    const a = -Math.PI / 2 + rnd11() * 1.4 + dir * 0.6, v = 160 + Math.random() * 220;
    bfx(g, 'spark', x, y - 3, { vx: Math.cos(a) * v, vy: Math.sin(a) * v, grav: 500, life: 0.25 + Math.random() * 0.25, color: spark });
  }
}

function updateBossFx(g, dt) {
  const list = g.bossFx;
  if (!list?.length) return;
  for (let i = list.length - 1; i >= 0; i--) {
    const e = list[i];
    e.t += dt;
    if (e.t >= e.life) { list.splice(i, 1); continue; }
    if (e.drag) { const f = Math.exp(-e.drag * dt); e.vx *= f; e.vy *= f; }
    e.vy += e.grav * dt;
    e.x += e.vx * dt; e.y += e.vy * dt; e.rot += e.spin * dt;
    // lasca e gota param no chão
    if ((e.type === 'shard' || e.type === 'drop') && e.vy > 0 && g.world.isSolid(Math.floor(e.x / T), Math.floor(e.y / T))) {
      e.y = Math.floor(e.y / T) * T - 0.5; e.vy *= -0.25; e.vx *= 0.5; e.spin *= 0.5;
      if (e.type === 'drop') e.life = Math.min(e.life, e.t + 0.15);
    }
  }
}

// Halo que soma luz
function bfxGlow(ctx, x, y, r, c, a) {
  if (a <= 0.01 || r <= 0.5) return;
  const gr = ctx.createRadialGradient(x, y, 0, x, y, r);
  gr.addColorStop(0, bfxRgb(c, a)); gr.addColorStop(1, bfxRgb(c, 0));
  const op = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = gr; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.globalCompositeOperation = op;
}
// Estrela de cinco pontas preenchida
function bfxStarPath(ctx, x, y, r, rot) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = rot + (i * Math.PI) / 5 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  ctx.closePath();
}

function drawBossFx(ctx, g) {
  drawBossAuras(ctx, g);
  const list = g.bossFx;
  if (!list?.length) return;
  ctx.save();
  ctx.lineCap = 'round';
  for (const e of list) {
    const k = e.t / e.life, fade = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
    ctx.globalAlpha = 1;
    switch (e.type) {
      case 'shard': {
        const [d, m, l] = e.pal;
        ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.rot); ctx.globalAlpha = fade;
        const poly = (s, c) => { ctx.fillStyle = c; ctx.beginPath(); e.pts.forEach(([px, py], i) => (i ? ctx.lineTo(px * s, py * s) : ctx.moveTo(px * s, py * s))); ctx.closePath(); ctx.fill(); };
        poly(1.35, bfxRgb(d)); poly(1, bfxRgb(m));
        ctx.fillStyle = bfxRgb(l); ctx.beginPath(); ctx.moveTo(e.pts[0][0] * 0.8, e.pts[0][1] * 0.8); ctx.lineTo(e.pts[1][0] * 0.8, e.pts[1][1] * 0.8); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
        ctx.restore();
        break;
      }
      case 'dust': {
        const r = lerp(e.r0, e.r1, easeOutCubic(k)), c = e.color;
        ctx.globalAlpha = (1 - k) * 0.45;
        ctx.fillStyle = bfxRgb(c.map((v) => v * 0.7)); ctx.beginPath(); ctx.arc(e.x, e.y + r * 0.2, r, 0, 6.28); ctx.fill();
        ctx.fillStyle = bfxRgb(c.map((v) => Math.min(255, v * 1.25 + 20))); ctx.beginPath(); ctx.arc(e.x - r * 0.25, e.y - r * 0.25, r * 0.6, 0, 6.28); ctx.fill();
        break;
      }
      case 'spark': {
        const sp = Math.hypot(e.vx, e.vy) || 1, len = Math.min(10, sp * 0.03) + 1;
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = fade;
        ctx.strokeStyle = bfxRgb(e.color, 0.9); ctx.lineWidth = e.w || 1.4;
        ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x - (e.vx / sp) * len, e.y - (e.vy / sp) * len); ctx.stroke();
        ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(e.x), Math.round(e.y), 1, 1);
        ctx.globalCompositeOperation = 'source-over';
        break;
      }
      case 'ember': {
        const flick = 0.7 + 0.3 * Math.sin(e.t * 30 + e.rot * 5), c = e.color;
        const x = Math.round(e.x + Math.sin(e.t * 6 + e.rot) * 1.5), y = Math.round(e.y);
        bfxGlow(ctx, x + 0.5, y + 0.5, 4 + e.size, c, 0.35 * fade * flick);
        ctx.globalAlpha = fade;
        ctx.fillStyle = bfxRgb(c); ctx.fillRect(x, y, e.size, e.size);
        ctx.fillStyle = bfxRgb([255, 255, 230]); ctx.fillRect(x, y, 1, 1);
        break;
      }
      case 'ring': {
        const r = lerp(e.r0, e.r1, easeOutCubic(k)), fy = e.flat ?? 1, c = e.color || [255, 230, 170];
        const ring = (w, col, a) => { ctx.globalAlpha = a * (1 - k); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.ellipse(e.x, e.y, r, r * fy, 0, 0, 6.28); ctx.stroke(); };
        ring((e.w || 3) * 2.4, bfxRgb(c), 0.22); ring(e.w || 3, bfxRgb(c), 0.55); ring(1, '#ffffff', 0.9);
        break;
      }
      case 'flash': {
        bfxGlow(ctx, e.x, e.y, lerp(e.r0 || 4, e.r1 || 30, easeOutCubic(k)), e.color || [255, 240, 200], (e.a || 0.6) * (1 - k));
        break;
      }
      case 'drop': {
        const [d, m, l] = e.pal, sp = Math.hypot(e.vx, e.vy);
        ctx.globalAlpha = fade;
        if (sp > 90) {
          const len = Math.min(6, sp * 0.015) + e.size;
          ctx.strokeStyle = bfxRgb(d); ctx.lineWidth = e.size + 1;
          ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x - (e.vx / sp) * len, e.y - (e.vy / sp) * len); ctx.stroke();
          ctx.strokeStyle = bfxRgb(m); ctx.lineWidth = e.size;
          ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x - (e.vx / sp) * len, e.y - (e.vy / sp) * len); ctx.stroke();
        } else {
          const x = Math.round(e.x), y = Math.round(e.y), s = e.size;
          ctx.fillStyle = bfxRgb(d); ctx.fillRect(x - 1, y - 1, s + 2, s + 2);
          ctx.fillStyle = bfxRgb(m); ctx.fillRect(x, y, s, s);
        }
        ctx.fillStyle = bfxRgb(l); ctx.fillRect(Math.round(e.x), Math.round(e.y), 1, 1);
        break;
      }
      case 'bubble': {
        const [d, m, l] = e.pal, r = e.size * (0.6 + 0.4 * Math.min(1, e.t * 6)), x = e.x + Math.sin(e.t * 9 + e.rot) * 1.2;
        if (k > 0.85) { // estoura: anelzinho
          ctx.globalAlpha = (1 - k) / 0.15; ctx.strokeStyle = bfxRgb(l); ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(x, e.y, r * (1 + (k - 0.85) * 8), 0, 6.28); ctx.stroke();
          break;
        }
        ctx.globalAlpha = 0.55; ctx.fillStyle = bfxRgb(m); ctx.beginPath(); ctx.arc(x, e.y, r, 0, 6.28); ctx.fill();
        ctx.globalAlpha = 0.95; ctx.strokeStyle = bfxRgb(d); ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = bfxRgb(l); ctx.fillRect(Math.round(x - r * 0.45), Math.round(e.y - r * 0.5), 1, 1);
        bfxGlow(ctx, x, e.y, r * 2.5, m, 0.18);
        break;
      }
      case 'star': {
        const r = e.size * (k < 0.15 ? k / 0.15 : 1);
        ctx.globalAlpha = fade;
        bfxStarPath(ctx, e.x, e.y, r + 1, e.rot); ctx.fillStyle = 'rgba(60,40,10,0.9)'; ctx.fill();
        bfxStarPath(ctx, e.x, e.y, r, e.rot); ctx.fillStyle = bfxRgb(e.color || [255, 222, 90]); ctx.fill();
        bfxStarPath(ctx, e.x - r * 0.12, e.y - r * 0.12, r * 0.45, e.rot); ctx.fillStyle = '#fffbe0'; ctx.fill();
        bfxGlow(ctx, e.x, e.y, r * 2.4, e.color || [255, 222, 90], 0.3 * fade);
        break;
      }
      case 'glint': {
        const s = (e.size || 4) * Math.sin(Math.min(1, k) * Math.PI), c = e.color || [255, 250, 220];
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1;
        ctx.fillStyle = bfxRgb(c, 0.9);
        ctx.fillRect(Math.round(e.x - s), Math.round(e.y), Math.round(s * 2) + 1, 1);
        ctx.fillRect(Math.round(e.x), Math.round(e.y - s), 1, Math.round(s * 2) + 1);
        ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(e.x), Math.round(e.y), 1, 1);
        ctx.globalCompositeOperation = 'source-over';
        break;
      }
      case 'arc': { // onda de som / de faro: arcos que abrem numa direção
        const r = lerp(e.r0, e.r1, easeOutCubic(k)), c = e.color || [255, 230, 160];
        for (let j = 0; j < (e.count || 1); j++) {
          const rr = r - j * 5;
          if (rr <= 1) continue;
          ctx.globalAlpha = (1 - k) * (1 - j * 0.25);
          ctx.strokeStyle = 'rgba(40,24,10,0.6)'; ctx.lineWidth = (e.w || 2) + 1.5;
          ctx.beginPath(); ctx.arc(e.x, e.y, rr, e.ang - e.spread, e.ang + e.spread); ctx.stroke();
          ctx.strokeStyle = bfxRgb(c); ctx.lineWidth = e.w || 2; ctx.stroke();
          ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.8; ctx.stroke();
        }
        break;
      }
      case 'wisp': { // fumaça / seda soprada
        const r = lerp(e.r0 || 2, e.r1 || 6, easeOutCubic(k)), c = e.color;
        ctx.globalAlpha = (1 - k) * (e.a || 0.5);
        ctx.fillStyle = bfxRgb(c); ctx.beginPath(); ctx.arc(e.x, e.y, r, 0, 6.28); ctx.fill();
        ctx.globalAlpha = (1 - k) * (e.a || 0.5) * 0.8;
        ctx.fillStyle = bfxRgb(c.map((v) => Math.min(255, v + 50))); ctx.beginPath(); ctx.arc(e.x - r * 0.3, e.y - r * 0.3, r * 0.5, 0, 6.28); ctx.fill();
        break;
      }
      case 'claw': { // três rasgos paralelos que se abrem e somem
        const grow = Math.min(1, k / 0.25), c = e.color || [255, 120, 110], len = e.len || 18;
        ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.ang || 0.9);
        for (let j = -1; j <= 1; j++) {
          const off = j * 4, L = len * grow * (j ? 0.85 : 1);
          ctx.globalAlpha = fade;
          ctx.strokeStyle = 'rgba(40,6,8,0.85)'; ctx.lineWidth = 3.4;
          ctx.beginPath(); ctx.moveTo(-L / 2, off); ctx.quadraticCurveTo(0, off - 3, L / 2, off); ctx.stroke();
          ctx.strokeStyle = bfxRgb(c); ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(-L / 2, off); ctx.quadraticCurveTo(0, off - 3, L / 2, off); ctx.stroke();
          ctx.strokeStyle = '#fff4ec'; ctx.lineWidth = 0.8;
          ctx.beginPath(); ctx.moveTo(-L / 2 + 2, off - 0.5); ctx.quadraticCurveTo(0, off - 3.5, L / 2 - 2, off - 0.5); ctx.stroke();
        }
        ctx.restore();
        bfxGlow(ctx, e.x, e.y, len, c, 0.25 * fade);
        break;
      }
      case 'streak': { // linha de velocidade listrada
        const len = e.len * (1 - k * 0.5), c = e.cols || [[236, 150, 60], [40, 24, 20]];
        ctx.globalAlpha = (1 - k) * 0.9;
        for (let s = 0; s < len; s += 3) { ctx.fillStyle = bfxRgb(c[Math.floor(s / 3) % c.length]); ctx.fillRect(Math.round(e.x - Math.sign(e.vx || 1) * s), Math.round(e.y), 3, e.h || 1); }
        break;
      }
    }
  }
  ctx.restore();
}

// ---------- Auras e efeitos presos ao jogador ----------
function drawBossAuras(ctx, g) {
  const p = g.player, t = g.clock || 0;
  // Mel Ancestral: brilho dourado e gotas girando em volta
  if (g.honey) {
    bfxGlow(ctx, p.cx, p.cy, 22 + Math.sin(t * 4) * 2, BFX_PAL.honey[1], 0.22);
    for (let i = 0; i < 5; i++) {
      const a = t * 2.2 + (i * 6.28) / 5, x = p.cx + Math.cos(a) * 11, y = p.cy + 4 + Math.sin(a) * 4 - ((t * 10 + i * 7) % 24);
      ctx.globalAlpha = Math.sin(a) > 0 ? 1 : 0.5;
      ctx.fillStyle = bfxRgb(BFX_PAL.honey[0]); ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 3, 3);
      ctx.fillStyle = bfxRgb(BFX_PAL.honey[1]); ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 2, 2);
      ctx.fillStyle = bfxRgb(BFX_PAL.honey[2]); ctx.fillRect(Math.round(x) - 1, Math.round(y) - 1, 1, 1);
    }
    ctx.globalAlpha = 1;
  }
  // Luvas de Seda agarradas: fios da mão até a parede
  if (p.wallGrab) {
    const side = p.wallGrab.side, wx = side > 0 ? p.x + p.w + 1 : p.x - 1;
    for (let j = 0; j < 4; j++) {
      const hy = p.y + 12 + j * 3, sy = hy - 5 + j * 4;
      ctx.strokeStyle = 'rgba(120,112,140,0.7)'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(p.cx + side * 3, hy); ctx.quadraticCurveTo((p.cx + wx) / 2, hy + 2, wx, sy); ctx.stroke();
      ctx.strokeStyle = 'rgba(248,246,255,0.95)'; ctx.lineWidth = 0.8; ctx.stroke();
    }
    ctx.fillStyle = 'rgba(240,236,250,0.9)';
    for (let j = 0; j < 5; j++) ctx.fillRect(Math.round(wx - (side > 0 ? 0 : 1)), Math.round(p.y + 6 + j * 4), 1, 3);
  }
}
// Atrás do jogador (antes dele e da luz, js/spider-loot.js drawBossGearWorld): o manto carregado
// solta labaredas âmbar pelas costas, saindo por trás do corpo
function drawBossAurasBehind(ctx, g) {
  const p = g.player;
  if (g.cloakCharged) drawAmberFlames(ctx, p.cx - p.facing * 6, p.y + p.h - 6, p.h * 0.75, g.clock || 0, 0.8);
}
// Labareda: línguas de fogo em camadas (vermelho escuro, laranja, amarelo, miolo claro)
function drawAmberFlames(ctx, x, y, h, t, scale) {
  const tongue = (dx, hh, w, col, ph) => {
    const sway = Math.sin(t * 9 + ph) * 2 * scale;
    ctx.fillStyle = col; ctx.beginPath();
    ctx.moveTo(x + dx - w, y); ctx.quadraticCurveTo(x + dx - w * 0.8, y - hh * 0.55, x + dx + sway, y - hh);
    ctx.quadraticCurveTo(x + dx + w * 0.8, y - hh * 0.55, x + dx + w, y); ctx.closePath(); ctx.fill();
  };
  bfxGlow(ctx, x, y - h * 0.4, h * 1.1, [255, 150, 50], 0.28);
  for (let i = -2; i <= 2; i++) {
    const hh = h * (0.55 + 0.45 * Math.abs(Math.sin(t * 7 + i * 1.7))) * (1 - Math.abs(i) * 0.18), dx = i * 3 * scale;
    tongue(dx, hh + 2, 3.2 * scale, 'rgba(150,40,10,0.75)', i);
    tongue(dx, hh, 2.5 * scale, 'rgba(240,120,30,0.85)', i + 0.3);
    tongue(dx, hh * 0.65, 1.6 * scale, 'rgba(255,208,90,0.9)', i + 0.6);
    tongue(dx, hh * 0.3, 0.8 * scale, 'rgba(255,250,220,0.95)', i + 0.9);
  }
}

// =====================================================================================
//  PODERES, UM POR UM
// =====================================================================================

// ---------- Pata Sísmica: a terra levanta numa crista que corre pelo chão ----------
function drawSeismicWaves(ctx) {
  const t = game.clock || 0;
  ctx.save();
  for (const v of seismicWaves) {
    const k = clamp(v.life / 0.75, 0, 1), gy = v.y + 3, dir = v.dir;
    v.x0 ??= v.x - dir * 10;
    // Rachadura que fica para trás, sumindo
    const n = Math.floor(Math.abs(v.x - v.x0) / 3);
    for (let i = 0; i < n; i++) {
      const x = v.x0 + dir * i * 3, behind = Math.abs(v.x - x), a = k * clamp(1 - behind / 70, 0, 1);
      if (a <= 0) continue;
      const jy = Math.round(hash2(Math.floor(x / 3), 7, 91) * 2 - 1);
      ctx.globalAlpha = a;
      ctx.fillStyle = '#1c130c'; ctx.fillRect(Math.round(x), gy - 1 + jy, 3, 2);
      ctx.fillStyle = '#b08658'; ctx.fillRect(Math.round(x), gy + 1 + jy, 3, 1);
      if (i % 4 === 0) { ctx.fillStyle = '#1c130c'; ctx.fillRect(Math.round(x) + 1, gy - 2 + jy - (i % 8 ? 1 : 0), 1, 2); }
    }
    // Crista de terra: calombo em camadas, mais alto na frente
    ctx.globalAlpha = k;
    const H = 12 * (0.6 + 0.4 * k);
    for (let dx = -20; dx <= 8; dx++) {
      const u = dx < 0 ? 1 + dx / 20 : 1 - dx / 8, hh = Math.round(H * Math.sin(u * Math.PI / 2) + hash2(dx, Math.floor(t * 20), 5) * 1.5);
      if (hh <= 0) continue;
      const x = Math.round(v.x + dx * dir);
      ctx.fillStyle = '#3a291c'; ctx.fillRect(x, gy - hh - 1, 1, hh + 1);
      ctx.fillStyle = '#7c5a3a'; ctx.fillRect(x, gy - hh, 1, hh);
      ctx.fillStyle = '#b88c5c'; ctx.fillRect(x, gy - hh, 1, Math.min(2, hh));
      if ((dx + Math.floor(t * 30)) % 5 === 0) { ctx.fillStyle = '#e8bc80'; ctx.fillRect(x, gy - hh, 1, 1); }
    }
    // Espetos de pedra rompendo na frente da crista
    for (let j = 0; j < 3; j++) {
      const sx = v.x + dir * (j * 5 - 4), sh = (9 + j * 4) * k * (0.8 + 0.2 * Math.sin(t * 20 + j)), sw = 3.5 - j * 0.5;
      ctx.fillStyle = '#2a2420'; ctx.beginPath(); ctx.moveTo(sx - sw - 1, gy); ctx.lineTo(sx, gy - sh - 1); ctx.lineTo(sx + sw + 1, gy); ctx.fill();
      ctx.fillStyle = '#8a8276'; ctx.beginPath(); ctx.moveTo(sx - sw, gy); ctx.lineTo(sx, gy - sh); ctx.lineTo(sx + sw, gy); ctx.fill();
      ctx.fillStyle = '#c8bfae'; ctx.beginPath(); ctx.moveTo(sx - sw, gy); ctx.lineTo(sx, gy - sh); ctx.lineTo(sx - sw * 0.2, gy); ctx.fill();
    }
    bfxGlow(ctx, v.x, gy - 6, 22, [255, 170, 90], 0.25 * k);
  }
  ctx.restore();
}

// ---------- Rugido Engarrafado: onda de choque dourada e arcos de som ----------
function drawBottledRoar(ctx) {
  ctx.save();
  for (const v of bottledRoarWaves) {
    if (v.age < 0.18) bfxGlow(ctx, v.x, v.y, 30 + v.age * 160, [255, 226, 160], 0.55 * (1 - v.age / 0.18));
    for (let ring = 0; ring < 3; ring++) {
      const t = (v.age - ring * 0.1) / 0.65;
      if (t < 0 || t > 1) continue;
      const r = 8 + v.radius * (1 - Math.pow(1 - t, 2)), a = Math.pow(1 - t, 1.3);
      const ell = (w, col, al) => { ctx.globalAlpha = al * a; ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.ellipse(v.x, v.y, r, r * 0.72, 0, 0, 6.28); ctx.stroke(); };
      ell(10 - ring * 2, '#f0b454', 0.14); ell(4, '#ffd98c', 0.45); ell(1.4, '#fffaf0', 0.95);
      // ar tremendo em volta do anel
      ctx.globalAlpha = a * 0.8; ctx.fillStyle = '#fff2c4';
      for (let j = 0; j < 18; j++) {
        const an = (j / 18) * 6.28 + ring * 0.2 + v.age * 2, rr = r + Math.sin(j * 3.1 + v.age * 30) * 3;
        ctx.fillRect(Math.round(v.x + Math.cos(an) * rr), Math.round(v.y + Math.sin(an) * rr * 0.72), 2, 1);
      }
    }
    // Arcos de som saindo para os dois lados
    for (let j = 0; j < 3; j++) {
      const tt = (v.age - j * 0.08) / 0.5;
      if (tt < 0 || tt > 1) continue;
      const r = 10 + tt * v.radius * 0.7;
      for (const ang of [0, Math.PI]) {
        ctx.globalAlpha = (1 - tt) * 0.9;
        ctx.strokeStyle = 'rgba(70,40,10,0.7)'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(v.x, v.y, r, ang - 0.5, ang + 0.5); ctx.stroke();
        ctx.strokeStyle = '#ffcf6e'; ctx.lineWidth = 2.4; ctx.stroke();
        ctx.strokeStyle = '#fffbe8'; ctx.lineWidth = 0.9; ctx.stroke();
      }
    }
  }
  ctx.restore();
}

// ---------- Instinto da Caçada: pegadas de verdade e mira em volta do bicho ----------
function drawPawPrint(ctx, x, y, a, dir) {
  const px = (dx, dy, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x + dx * dir - (dir < 0 ? w - 1 : 0)), Math.round(y + dy), w, h); };
  ctx.globalAlpha = a;
  for (const [c, grow] of [['#3a1a08', 1], ['#ff9f1f', 0], ['#ffe2a0', -1]]) {
    if (grow === -1) { px(-1, -1, 2, 1, c); px(2, -4, 1, 1, c); continue; }
    px(-2 - grow, -1 - grow, 5 + grow * 2, 3 + grow * 2, c);                       // almofada
    for (const [tx, ty] of [[-3, -4], [-1, -5], [1, -5], [3, -4]]) px(tx - grow, ty - grow, 1 + grow * 2, 2 + grow * 2, c); // dedos
  }
}
function drawHuntInstinct(ctx, g) {
  const h = g.hunt;
  if (!h) return;
  const fade = Math.min(1, h.t / 1.2), age = h.max - h.t;
  ctx.save();
  for (const tr of h.trails) {
    const dir = Math.sign(tr.mob.cx - g.player.cx) || 1;
    tr.pts.forEach((q, i) => {
      const on = clamp((age * 14 - i) / 3, 0, 1);
      if (!on) return;
      const pulse = 0.6 + 0.4 * Math.sin(age * 5 - i * 0.6);
      const x = q.x + (q.side ? 3 : -3), y = q.y - 1 - (q.side ? 1 : 0);
      bfxGlow(ctx, x, y - 2, 7, [255, 170, 50], 0.28 * on * fade * pulse);
      drawPawPrint(ctx, x, y, on * fade * (0.55 + 0.45 * pulse), dir);
    });
    const m = tr.mob;
    if (m.dead) continue;
    const rare = m.boss || m.def?.unique, col = rare ? [255, 90, 50] : [255, 176, 46];
    const r = 8 + Math.max(m.w, m.h) * 0.55, spin = age * 1.6;
    bfxGlow(ctx, m.cx, m.cy, r * 1.4, col, 0.18 * fade);
    ctx.globalAlpha = fade;
    for (let j = 0; j < 4; j++) {
      const a = spin + (j * Math.PI) / 2;
      for (const [w, c] of [[3.5, 'rgba(40,16,6,0.85)'], [2, bfxRgb(col)], [0.8, '#fff4d8']]) {
        ctx.strokeStyle = c; ctx.lineWidth = w;
        ctx.beginPath(); ctx.ellipse(m.cx, m.cy, r, r * 0.75, 0, a - 0.35, a + 0.35); ctx.stroke();
      }
    }
    if (rare) { // losango girando em cima do raro
      const y = m.y - 8 + Math.sin(age * 4) * 1.5, s = 3 + Math.abs(Math.sin(age * 3));
      ctx.fillStyle = '#3a1206'; ctx.beginPath(); ctx.moveTo(m.cx, y - s - 1); ctx.lineTo(m.cx + s + 1, y); ctx.lineTo(m.cx, y + s + 1); ctx.lineTo(m.cx - s - 1, y); ctx.fill();
      ctx.fillStyle = '#ff6a3a'; ctx.beginPath(); ctx.moveTo(m.cx, y - s); ctx.lineTo(m.cx + s, y); ctx.lineTo(m.cx, y + s); ctx.lineTo(m.cx - s, y); ctx.fill();
      ctx.fillStyle = '#ffe0c0'; ctx.fillRect(Math.round(m.cx - 1), Math.round(y - s + 1), 1, 2);
    }
  }
  ctx.restore();
}

// ---------- Olho de Âmbar: cantoneiras que brilham e barrinha de vida caprichada ----------
function drawAmberEye(ctx, g) {
  if (!accessoryPower(g, 'ambar')) return;
  const p = g.player, t = g.clock || 0;
  ctx.save();
  for (const m of g.mobs) {
    if (m.dead || m === g.mount || !(m.hostile || m.boss) || !m.def) continue;
    const max = m.def.hp || 1;
    if (m.hp >= max || m.hp <= 0) continue;
    if (Math.hypot(m.cx - p.cx, m.cy - p.cy) > 26 * T) continue;
    const pad = 3 + Math.sin(t * 5 + m.cx * 0.1);
    const x0 = Math.round(m.x - pad), y0 = Math.round(m.y - pad), x1 = Math.round(m.x + m.w + pad), y1 = Math.round(m.y + m.h + pad), L = 5;
    bfxGlow(ctx, m.cx, m.cy, Math.max(m.w, m.h) * 0.9, [255, 170, 40], 0.14);
    for (const [c, g2] of [['#2a1208', 1], ['#ff9f24', 0], ['#ffe6a8', -1]]) {
      ctx.fillStyle = c;
      for (const [x, y, sx, sy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) {
        if (g2 === -1) { ctx.fillRect(x, y, 1, 1); continue; }
        const w = 2 + g2 * 2, ox = sx > 0 ? x - g2 : x - L + 1 - g2, oy = sy > 0 ? y - g2 : y - 1 - g2;
        ctx.fillRect(ox, oy, L + g2 * 2, w);
        ctx.fillRect(sx > 0 ? x - g2 : x - 1 - g2, sy > 0 ? y - g2 : y - L + 1 - g2, w, L + g2 * 2);
      }
    }
    // Barrinha: moldura escura, trilho, vida em degradê com brilho, olhinho âmbar na ponta
    const bw = Math.max(14, Math.min(32, m.w)), bx = Math.round(m.cx - bw / 2), by = y0 - 7, f = m.hp / max;
    ctx.fillStyle = '#1c0e06'; ctx.fillRect(bx - 2, by - 1, bw + 4, 5);
    ctx.fillStyle = '#4a2a14'; ctx.fillRect(bx, by, bw, 3);
    const fw = Math.max(1, Math.round(bw * f)), gr = ctx.createLinearGradient(bx, 0, bx + bw, 0);
    gr.addColorStop(0, '#c85a10'); gr.addColorStop(1, '#ffc040');
    ctx.fillStyle = gr; ctx.fillRect(bx, by, fw, 3);
    ctx.fillStyle = '#fff0c0'; ctx.fillRect(bx, by, fw, 1);
    ctx.fillStyle = '#1c0e06'; ctx.fillRect(bx - 7, by - 2, 5, 7);
    ctx.fillStyle = '#ffb030'; ctx.fillRect(bx - 6, by - 1, 3, 5);
    ctx.fillStyle = '#1c0e06'; ctx.fillRect(bx - 5, by, 1, 3);
  }
  ctx.restore();
}

// ---------- Carretel: fio de seda que brilha e gancho de três garras ----------
function drawGrapple(ctx, g) {
  const gr = g.grapple, p = g.player;
  if (!gr) return;
  const hx = p.cx + p.facing * 5, hy = p.y + 18, t = g.clock || 0;
  const sag = gr.phase === 'fly' || gr.phase === 'back' ? 6 : 0, mx = (hx + gr.x) / 2, my = (hy + gr.y) / 2 + sag * 2;
  ctx.save(); ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(70,60,90,0.55)'; ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.moveTo(hx, hy); ctx.quadraticCurveTo(mx, my, gr.x, gr.y); ctx.stroke();
  ctx.strokeStyle = '#ece8f6'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(hx, hy); ctx.quadraticCurveTo(mx, my, gr.x, gr.y); ctx.stroke();
  // brilhos correndo pelo fio
  for (let j = 0; j < 3; j++) {
    const u = (t * 1.6 + j / 3) % 1, x = (1 - u) * (1 - u) * hx + 2 * u * (1 - u) * mx + u * u * gr.x, y = (1 - u) * (1 - u) * hy + 2 * u * (1 - u) * my + u * u * gr.y;
    bfxGlow(ctx, x, y, 4, [255, 255, 255], 0.5);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  }
  // gancho: três garras de aço viradas para onde foi lançado
  const ang = Math.atan2(gr.y - hy, gr.x - hx);
  ctx.translate(gr.x, gr.y); ctx.rotate(ang);
  for (const [w, c] of [[3, '#1c1a24'], [1.6, '#9aa2b4'], [0.7, '#eef2fa']]) {
    ctx.strokeStyle = c; ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(-5, 0); ctx.lineTo(1, 0); ctx.stroke();
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(-1, 0); ctx.quadraticCurveTo(2, s * 4, 4, s * 2); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(4, 0); ctx.stroke();
  }
  ctx.fillStyle = '#c8cedc'; ctx.beginPath(); ctx.arc(-5, 0, 1.6, 0, 6.28); ctx.fill();
  ctx.restore();
}

// ---------- Casulo de Caça: teia armada no chão e casulo enrolado ----------
function drawCocoons(ctx, g) {
  const tr = g.cocoonTrap, t = g.clock || 0;
  ctx.save();
  if (tr) {
    const x = tr.x, y = tr.y - 0.5, arm = Math.min(1, tr.age / 0.3);
    const web = (w, c, a) => {
      ctx.globalAlpha = a; ctx.strokeStyle = c; ctx.lineWidth = w;
      for (let j = 0; j <= 6; j++) { const an = Math.PI + (j / 6) * Math.PI; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(an) * 11 * arm, y + Math.sin(an) * 5 * arm); ctx.stroke(); }
      for (const r of [3.5, 7, 10.5]) { ctx.beginPath(); ctx.ellipse(x, y, r * arm, r * 0.45 * arm, 0, Math.PI, 2 * Math.PI); ctx.stroke(); }
    };
    web(2, 'rgba(90,84,110,0.6)', 1); web(1, '#f0ecf8', 0.9);
    for (let j = 0; j < 2; j++) { // gotinhas de orvalho brilhando na teia
      const an = Math.PI + ((t * 0.8 + j * 0.5) % 1) * Math.PI, gx = x + Math.cos(an) * 7 * arm, gy = y + Math.sin(an) * 3.2 * arm;
      bfxGlow(ctx, gx, gy, 3, [255, 255, 255], 0.6); ctx.globalAlpha = 1; ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(gx), Math.round(gy), 1, 1);
    }
  }
  for (const m of g.mobs) { // casulo em volta de quem foi pego
    if (!(m.cocoonT > 0) || m.dead) continue;
    const x0 = m.x - 1, x1 = m.x + m.w + 1, y0 = m.y - 1, y1 = m.y + m.h + 1, wob = Math.sin(t * 10) * 0.6;
    ctx.globalAlpha = 0.55; ctx.fillStyle = '#d8d2e8';
    ctx.beginPath(); ctx.ellipse(m.cx + wob, m.cy, (x1 - x0) / 2, (y1 - y0) / 2, 0, 0, 6.28); ctx.fill();
    ctx.globalAlpha = 1;
    for (let y = y0 + 1; y < y1; y += 3) { // voltas de seda inclinadas
      const tilt = ((y - y0) % 6 < 3 ? 1 : -1) * 2;
      ctx.strokeStyle = '#8c84a4'; ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(x0 + wob, y + tilt); ctx.lineTo(x1 + wob, y - tilt); ctx.stroke();
      ctx.strokeStyle = '#f6f2fc'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(x0 + wob, y + tilt - 0.5); ctx.lineTo(x1 + wob, y - tilt - 0.5); ctx.stroke();
    }
    const sh = ((t * 20) % (y1 - y0 + 10)) + y0 - 5; // brilho descendo
    ctx.globalAlpha = 0.7; ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(x0 + (x1 - x0) * 0.3 + wob), Math.round(sh), 2, 2);
    ctx.globalAlpha = 0.8; ctx.strokeStyle = '#ece8f6'; ctx.lineWidth = 0.8; // fios soltos
    ctx.beginPath(); ctx.moveTo(x1 - 2, y1 - 1); ctx.quadraticCurveTo(x1 + 3, y1 + 2, x1 + 1 + wob, y1 + 5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x0 + 2, y0 + 1); ctx.quadraticCurveTo(x0 - 3, y0 - 1, x0 - 2 + wob, y0 - 5); ctx.stroke();
  }
  ctx.restore();
}

// ---------- Marreta: estrelas de atordoado girando ----------
function drawStunStars(ctx, g) {
  const list = g.stunStars || [];
  ctx.save();
  for (let i = list.length - 1; i >= 0; i--) {
    const s = list[i];
    if ((s.t += 1 / 60) >= s.life || s.m.dead) { list.splice(i, 1); continue; }
    const m = s.m, cx = m.cx, cy = m.y - 5, rx = m.w * 0.45 + 5, fade = Math.min(1, (s.life - s.t) * 3);
    ctx.globalAlpha = 0.5 * fade; ctx.strokeStyle = '#fff2b0'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, 2.5, 0, 0, 6.28); ctx.stroke();
    for (let k = 0; k < 3; k++) {
      const a = s.t * 6 + (k * 6.28) / 3, front = Math.sin(a) > 0;
      for (let tr = 3; tr >= 1; tr--) { // rastrinho
        const b = a - tr * 0.22;
        ctx.globalAlpha = fade * 0.25 * (4 - tr); ctx.fillStyle = '#ffe68a';
        ctx.fillRect(Math.round(cx + Math.cos(b) * rx), Math.round(cy + Math.sin(b) * 2.5), 1, 1);
      }
      const x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * 2.5, r = front ? 3.4 : 2.4;
      ctx.globalAlpha = fade;
      bfxStarPath(ctx, x, y, r + 1, s.t * 4 + k); ctx.fillStyle = '#4a3208'; ctx.fill();
      bfxStarPath(ctx, x, y, r, s.t * 4 + k); ctx.fillStyle = front ? '#ffd84a' : '#d8a830'; ctx.fill();
      ctx.fillStyle = '#fffbe0'; ctx.fillRect(Math.round(x - 0.5), Math.round(y - 0.5), 1, 1);
      if (front) bfxGlow(ctx, x, y, 7, [255, 220, 90], 0.3 * fade);
    }
  }
  ctx.restore();
}

// ---------- Escudo do Escavador ----------
let diggerShieldSprite = null;
function drawShield(ctx, g) {
  const p = g.player;
  if (!g.block && !(g.parryFlash > 0)) return;
  if (g.parryFlash > 0) g.parryFlash -= 1 / 60;
  if (!diggerShieldSprite) { // escudo de carapaça: borda dourada, chanfro e o emblema da mandíbula
    const s = new Sprite(11, 17), C = { d: [26, 34, 52], c: [64, 84, 118], l: [112, 138, 180], h: [176, 200, 232], g: [168, 118, 36], G: [240, 196, 90], y: [255, 236, 160] };
    const rows = ['.GGGGGGGGG.', 'GgllhlllcgG', 'GlhlllllccG', 'GlllyllyccG', 'GlllGyyGccG', 'GllllGGcccG', 'GllllccccdG', 'GlllcccccdG',
      '.GllcccccG.', '.GlccccddG.', '.GccccdddG.', '..GccdddG..', '..GcccddG..', '...GcddG...', '...GcdG....', '....GG.....', '...........'];
    rows.forEach((r, y) => [...r].forEach((v, x) => { if (C[v]) s.set(x, y, C[v]); }));
    diggerShieldSprite = s.finish([14, 16, 24]);
  }
  const up = g.block ? Math.min(1, g.block.t / 0.08) : 1;
  const x = Math.round(p.cx + p.facing * (6 + up * 3)), y = Math.round(p.y + 10 + (1 - up) * 6);
  const window = g.block && g.block.t <= ITEM_DEFS[ITEM.DIGGER_SHIELD].escudo.janela;
  ctx.save(); ctx.imageSmoothingEnabled = false;
  ctx.translate(x, y); if (p.facing < 0) ctx.scale(-1, 1); ctx.rotate(-0.08 * (1 - up));
  ctx.drawImage(diggerShieldSprite, -5, 0);
  ctx.restore();
  if (window || g.parryFlash > 0) {
    const a = g.parryFlash > 0 ? g.parryFlash / 0.3 : 0.5 + 0.3 * Math.sin((g.clock || 0) * 40);
    bfxGlow(ctx, x, y + 8, 16, [255, 226, 130], 0.45 * a);
    ctx.globalAlpha = a; ctx.strokeStyle = '#fff4c8'; ctx.lineWidth = 1;
    ctx.strokeRect(x - 6.5 + (p.facing < 0 ? 0 : 0), y - 0.5, 12, 16); ctx.globalAlpha = 1;
  }
}

// ---------- Mandíbula Farejadora: a mandíbula estala (os arcos saem em bfx 'arc') ----------
function drawSniffer(ctx, g) {
  const s = g.sniff, p = g.player;
  if (!s || !(s.flash > 0)) return;
  const x = Math.round(p.cx + p.facing * 9), y = Math.round(p.y + 6), open = s.flash > 0.04 ? 2 : 1;
  ctx.fillStyle = '#2a1e10'; ctx.fillRect(x - open - 2, y - 2, 2, 3); ctx.fillRect(x + open + 1, y - 2, 2, 3);
  ctx.fillStyle = '#ffd860'; ctx.fillRect(x - open - 1, y - 1, 1, 2); ctx.fillRect(x + open + 1, y - 1, 1, 2);
  bfxGlow(ctx, x, y, 6, [255, 220, 100], 0.4);
}

// ---------- Ataques especiais dos chefes (aviso no chão e o golpe) ----------
function drawGuardianPowers(ctx, g) {
  ctx.save();
  const t = g.clock || 0;
  for (const h of g.guardianHazards || []) {
    const x = h.x, y = h.y, ready = h.age >= h.warn;
    const venom = h.type === 'venom', silk = h.type === 'silk';
    const pal = venom ? BFX_PAL.venom : silk ? BFX_PAL.silk : BFX_PAL.earth, col = venom ? [150, 230, 90] : silk ? [210, 170, 255] : [255, 190, 110];
    if (!ready) { // aviso: runa no chão fechando e seta pulsando
      const k = Math.min(1, h.age / h.warn), r = h.radius + 14 * (1 - k);
      ctx.globalAlpha = 0.18 + k * 0.25; ctx.fillStyle = bfxRgb(col);
      ctx.beginPath(); ctx.ellipse(x, y - 1, r, r * 0.28, 0, 0, 6.28); ctx.fill();
      ctx.globalAlpha = 0.6 + k * 0.4; ctx.strokeStyle = bfxRgb(col); ctx.lineWidth = 1.5;
      for (let j = 0; j < 8; j++) { const a = t * 3 + (j * 6.28) / 8; ctx.beginPath(); ctx.ellipse(x, y - 1, r, r * 0.28, 0, a, a + 0.45); ctx.stroke(); }
      bfxGlow(ctx, x, y - 2, r, col, 0.25 * k);
      const bob = Math.sin(t * 10) * 1.5, ay = y - 14 - bob;
      ctx.globalAlpha = 0.6 + 0.4 * k;
      ctx.fillStyle = 'rgba(30,16,10,0.85)'; ctx.beginPath(); ctx.moveTo(x - 5, ay - 5); ctx.lineTo(x + 5, ay - 5); ctx.lineTo(x, ay + 2); ctx.fill();
      ctx.fillStyle = bfxRgb(col); ctx.beginPath(); ctx.moveTo(x - 3.5, ay - 4); ctx.lineTo(x + 3.5, ay - 4); ctx.lineTo(x, ay + 0.5); ctx.fill();
      continue;
    }
    const tt = h.age - h.warn, fade = Math.min(1, (h.life - tt) * 4);
    ctx.globalAlpha = fade;
    if (venom) { // poça de veneno borbulhando, com vapor subindo
      const rx = h.radius, ry = 4;
      ctx.fillStyle = bfxRgb(pal[0]); ctx.beginPath(); ctx.ellipse(x, y - 1, rx + 1, ry + 1, 0, 0, 6.28); ctx.fill();
      const gr = ctx.createRadialGradient(x - rx * 0.3, y - 2, 1, x, y - 1, rx);
      gr.addColorStop(0, bfxRgb(pal[2])); gr.addColorStop(0.5, bfxRgb(pal[1])); gr.addColorStop(1, bfxRgb(pal[0]));
      ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(x, y - 1, rx, ry, 0, 0, 6.28); ctx.fill();
      for (let j = 0; j < 6; j++) { // bolhas
        const ph = (tt * 1.6 + j * 0.37) % 1, bx = x + Math.sin(j * 12.9) * rx * 0.7, br = 1 + ph * 2;
        ctx.globalAlpha = fade * (1 - ph); ctx.strokeStyle = bfxRgb(pal[2]); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(bx, y - 2 - ph * 2, br, 0, 6.28); ctx.stroke();
      }
      for (let j = 0; j < 4; j++) { // vapor
        const ph = (tt * 0.8 + j * 0.25) % 1;
        ctx.globalAlpha = fade * (1 - ph) * 0.3; ctx.fillStyle = bfxRgb(pal[1]);
        ctx.beginPath(); ctx.arc(x + Math.sin(j * 7 + tt * 2) * rx * 0.6, y - 4 - ph * 22, 2 + ph * 5, 0, 6.28); ctx.fill();
      }
      bfxGlow(ctx, x, y - 3, rx * 1.3, col, 0.25 * fade);
    } else if (silk) { // coluna de fios de seda tremendo
      const H = h.height * Math.min(1, tt * 10);
      bfxGlow(ctx, x, y - H * 0.4, 18, col, 0.3 * fade);
      for (let j = -3; j <= 3; j++) {
        ctx.beginPath();
        for (let dy = 0; dy <= H; dy += 3) { const px = x + j * 3 * (1 - dy / h.height * 0.6) + Math.sin(dy * 0.2 + tt * 18 + j) * 1.5; dy ? ctx.lineTo(px, y - dy) : ctx.moveTo(px, y); }
        ctx.strokeStyle = 'rgba(110,80,150,0.7)'; ctx.lineWidth = 2; ctx.stroke();
        ctx.strokeStyle = j % 2 ? '#f4eeff' : '#d8c4f4'; ctx.lineWidth = 1; ctx.stroke();
      }
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.8;
      for (let dy = 8; dy < H; dy += 11) { ctx.beginPath(); ctx.moveTo(x - 9, y - dy); ctx.quadraticCurveTo(x, y - dy + 2, x + 9, y - dy); ctx.stroke(); }
    } else if (h.type === 'pillar') { // espeto de rocha rompendo o chão
      const H = h.height * easeOutCubic(Math.min(1, tt * 8)), w = h.radius;
      const face = (sx, top, wide, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x - wide, y); ctx.lineTo(x + sx, y - top); ctx.lineTo(x + wide, y); ctx.fill(); };
      face(0, H + 1.5, w + 1.5, '#2a211a'); face(0, H, w, '#8a6e52');
      ctx.fillStyle = '#c4a47a'; ctx.beginPath(); ctx.moveTo(x - w, y); ctx.lineTo(x, y - H); ctx.lineTo(x - w * 0.25, y); ctx.fill();
      ctx.fillStyle = '#5c4834'; ctx.beginPath(); ctx.moveTo(x + w * 0.35, y); ctx.lineTo(x, y - H); ctx.lineTo(x + w, y); ctx.fill();
      ctx.strokeStyle = '#3a2c20'; ctx.lineWidth = 1; // rachaduras
      ctx.beginPath(); ctx.moveTo(x - w * 0.4, y - H * 0.25); ctx.lineTo(x - w * 0.1, y - H * 0.45); ctx.lineTo(x - w * 0.25, y - H * 0.6); ctx.stroke();
      ctx.fillStyle = '#6a543e'; for (let j = -2; j <= 2; j++) ctx.fillRect(Math.round(x + j * (w * 0.6)), y - 2, 3, 2);
    } else { // redemoinho de areia
      for (let dy = 0; dy < h.height; dy += 4) {
        const r = 5 + dy * 0.28, drift = Math.sin(tt * 12 + dy * 0.16) * 4, cx = x + drift;
        ctx.globalAlpha = fade * 0.35; ctx.fillStyle = dy % 8 ? '#c49a62' : '#e2c08a';
        ctx.beginPath(); ctx.ellipse(cx, y - dy, r, 2.2, 0, 0, 6.28); ctx.fill();
        ctx.globalAlpha = fade * 0.9; ctx.strokeStyle = '#7a5a36'; ctx.lineWidth = 1;
        const a0 = tt * 10 + dy * 0.2;
        ctx.beginPath(); ctx.ellipse(cx, y - dy, r, 2.2, 0, a0, a0 + 2.2); ctx.stroke();
        ctx.strokeStyle = '#f4dcaa'; ctx.beginPath(); ctx.ellipse(cx, y - dy - 0.5, r, 2.2, 0, a0 + 3, a0 + 4.4); ctx.stroke();
        ctx.fillStyle = '#e8cc98';
        for (let j = 0; j < 3; j++) { const a = a0 * 1.3 + j * 2.1; ctx.fillRect(Math.round(cx + Math.cos(a) * (r + 2)), Math.round(y - dy + Math.sin(a) * 2), 1, 1); }
      }
    }
  }
  ctx.restore();
}
