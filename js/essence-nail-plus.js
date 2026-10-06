'use strict';
// =====================================================================================
//  AGULHÃO DA ALMA TEIMOSA — segunda passada
// =====================================================================================
//  • Golpe novo: meia-lua de luz bem grande, alternando cima→baixo / baixo→cima a cada golpe
//    (golpe largo e elegante), com rastros de vento, faíscas e estrelinha de impacto.
//  • Golpe para baixo no ar = POGO: acertar um inimigo te joga para cima.
//  • Cada acerto solta uma ALMA que voa até você. Com 6 almas o medidor enche, brilha e
//    guarda uma rajada de luz: clique com o BOTÃO DIREITO do mouse (agulhão na mão) para soltá-la.
//  • Medidor de almas: um medidor de seis losangos de alma ao lado da barra de vida (js/inventory-ui.js).
//  • Capa do Besourinho Misterioso: capa comprida de bainha rasgada (só a capa, a cabeça fica como está).
// Carrega depois de moustache-cap.js e antes de game.js.

const SOUL_MAX = 6;
// perfil do corpo: puxa o braço bem para trás e corta num arco largo
Object.assign(ESSENCE_NAIL_PROFILE, { preparacao: 0.06, corte: 0.07, recuperacao: 0.12, arcoAntes: 95, arcoDepois: 70, recuo: 16, assenta: 6, espera: 0.02 });
for (const id of ESSENCE_NAIL_IDS) {
  delete ITEM_DEFS[id].referencePower;
  ITEM_DEFS[id].descricao = 'Dizem que o antigo dono era um bichinho calado, de capa escura, que resolvia a vida inteira na ponta de uma agulha e na teimosia. Cada acerto junta uma almazinha (máx. 6); com o medidor cheio, clique com o botão direito para soltar uma rajada. Golpe para baixo no ar: pogo. A aparência vem sorteada.';
}
ITEM_DEFS[ITEM.REF_HEARTH_TONIC].descricao = 'Alma engarrafada, sabor menta, validade duvidosa. Restaura 20 de vida e enche o medidor de almas para 6: clique com o botão direito segurando o Agulhão para soltar a rajada.';
ITEM_DEFS[ITEM.REF_SCOUT_ARMOR].descricao = 'Manto cinza-azulado com gola alta e tecido em pontas. Reduz dano em 22%. Ao receber dano, ganha 1 alma para o Agulhão da Alma Teimosa.';

// ---------------------------------------------------------------- a meia-lua de luz
// R = raio externo, d = espessura na frente; rev = quanto já foi revelado (0..1); alt = sentido; fade = apagando
function nailCrescent(R, d, size, rev, alt, fade) {
  const c = makeCanvas(size, size), x = c.getContext('2d'), cx = Math.round(R * 0.73), cy = size / 2, ix = cx - d;
  const yt = Math.sqrt(R * R - (d / 2) ** 2), img = x.createImageData(size, size), D = img.data;
  for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
    const X = px + 0.5, Y = py + 0.5 - cy, dO = Math.hypot(X - cx, Y), dI = Math.hypot(X - ix, Y);
    if (dO >= R || dI < R) continue;
    const v = Y / yt, pos = alt ? (1 - v) / 2 : (v + 1) / 2;
    if (pos > rev) continue;
    const k = dO / R, front = rev < 1 && rev - pos < 0.07;
    let col = front || k > 0.9 ? [255, 255, 255] : k > 0.78 ? [214, 247, 255] : k > 0.62 ? [136, 210, 245] : [84, 146, 224];
    let a = Math.min(1, (dI - R) / (d * 0.45 + 0.01)) * (1 - fade);
    if (k < 0.7 && (px + py) % 2) a *= 0.55;
    if (a <= 0.04) continue;
    const i = (py * size + px) * 4; D[i] = col[0]; D[i + 1] = col[1]; D[i + 2] = col[2]; D[i + 3] = Math.round(a * 255);
  }
  x.putImageData(img, 0, 0);
  x.globalAlpha = 0.55 * (1 - fade); x.fillStyle = '#eafcff';          // riscos de vento saindo das pontas
  for (const s of [-1, 1]) { const ty = Math.round(cy + s * yt * 0.97); for (let i = 0; i < 12; i++) x.fillRect(Math.round(cx - d / 2 - i * 1.3), ty + Math.round(s * i * 0.35), 1, 1); }
  return c;
}
const NAIL_SLASH = [0, 1].map((alt) => [[0.28, 0], [0.55, 0], [0.82, 0], [1, 0], [1, 0.4], [1, 0.75]].map(([rev, fade]) => nailCrescent(30, 16, 72, rev, alt, fade)));
const NAIL_WAVE = nailCrescent(40, 22, 96, 1, 0, 0);
const NAIL_TILT = 0.3;

drawEssenceNailSlash = function (ctx, s, p) {
  const age = s.t - s.prof.preparacao; if (age < 0 || age > s.prof.corte + 0.12) return;
  const alt = (p.nailCombo || 0) % 2, prog = clamp(age / s.prof.corte, 0, 1.6), frame = prog < 1 ? Math.min(3, Math.floor(prog * 4)) : (age < s.prof.corte + 0.06 ? 4 : 5);
  const sh = shoulderPos(p, swordLunge(s));
  ctx.save(); ctx.translate(Math.round(sh.x), Math.round(sh.y)); ctx.rotate(swordWorldAngle(s, s.aim));
  if (s.facing < 0) ctx.scale(1, -1);                                   // espelhado: a meia-lua continua "de pé"
  ctx.translate(8, 0); ctx.rotate(alt ? NAIL_TILT : -NAIL_TILT); ctx.imageSmoothingEnabled = false;
  ctx.drawImage(NAIL_SLASH[alt][frame], 0, -36); ctx.restore();
};
// o corte acerta o formato da meia-lua (mais um pedacinho junto ao corpo)
function nailInside(lx, ly, alt) {
  const c = Math.cos(alt ? -NAIL_TILT : NAIL_TILT), sn = Math.sin(alt ? -NAIL_TILT : NAIL_TILT), x = lx - 8, y = ly;
  const xr = x * c - y * sn, yr = x * sn + y * c, cx = 22;
  if (xr >= 0 && xr < 16 && Math.abs(yr) < 11) return true;
  return Math.hypot(xr - cx, yr) < 31 && Math.hypot(xr - (cx - 16), yr) >= 29;
}
sweepEssenceNailHits = function (g, s) {
  const sh = shoulderPos(g.player, swordLunge(s)), angle = swordWorldAngle(s, s.aim), c = Math.cos(angle), sn = Math.sin(angle), flip = s.facing < 0 ? -1 : 1, alt = (g.player.nailCombo || 0) % 2;
  for (const m of g.mobs) if (!m.dead && m !== g.mount && !s.hit.has(m)) {
    const dx = clamp(sh.x, m.x, m.x + m.w) - sh.x, dy = clamp(sh.y, m.y, m.y + m.h) - sh.y; if (dx * dx + dy * dy > 76 * 76) continue;
    search: for (let lx = 6; lx <= 62; lx += 3) for (let ly = -32; ly <= 32; ly += 3) {
      if (!nailInside(lx, ly * flip, alt)) continue;
      const xx = sh.x + c * lx - sn * ly, yy = sh.y + sn * lx + c * ly;
      if (m.containsPoint(xx, yy, 1.5)) { applySwordHit(g, s, m, xx, yy, angle); break search; }
    }
  }
};

// ---------------------------------------------------------------- estado: almas, orbes, rajada
function playerHasNail(g) { return g.inventory.slots.some((sl) => sl && ITEM_DEFS[sl.item]?.nailSkin != null); }
function nailState(g) { const r = referenceState(g); return (r.nail ??= { waves: [], orbs: [], fx: [], charge: 0, disp: 0, key: 0 }); }
function nailBurst(g, x, y, big) { const n = nailState(g); if (n.fx.length < 30) n.fx.push({ x, y, age: 0, life: big ? 0.3 : 0.2, big, rot: Math.random() * 3 }); }
function nailFireWave(g) {
  const n = nailState(g), p = g.player; n.charge = 0; referenceState(g).soul = 0;
  n.waves.push({ x: p.cx + p.facing * 16, y: p.cy - 2, dir: p.facing, age: 0, life: 0.85, hit: new Set(), trail: [] });
  n.ring = 0.001; g.shake = Math.max(g.shake || 0, 3); playSfx('swing', p.cx, p.cy); nailBurst(g, p.cx + p.facing * 14, p.cy, true);
}
{
  const baseUpdate = updateReferences, baseStrike = referenceOnStrike;
  referenceOnStrike = function (g, m, id) {
    const before = referenceState(g).soul; baseStrike(g, m, id);
    const def = ITEM_DEFS[id]; if (def?.nailSkin == null) return;
    const n = nailState(g), p = g.player, sw = g.sword;
    nailBurst(g, m.cx, m.cy, false);
    if (referenceState(g).soul > before || before >= SOUL_MAX) for (let i = 0; i < 3 && n.orbs.length < 18; i++) n.orbs.push({ x: m.cx + (Math.random() - 0.5) * 8, y: m.cy + (Math.random() - 0.5) * 8, vx: (Math.random() - 0.5) * 140, vy: -60 - Math.random() * 90, age: 0, tr: [] });
    if (sw?.aim > 0 && !p.onGround) { p.vy = -JUMP_SPEED * 0.85; p.onGround = false; p._referenceAirJump = false; p.jumpAge = 0; nailBurst(g, p.cx, p.y + p.h, false); }   // pogo
  };
  updateReferences = function (g, dt) {
    baseUpdate(g, dt);
    const rs = referenceState(g), n = nailState(g), p = g.player;
    if (g.respawnPending || p.hp <= 0) { rs.soul = 0; n.charge = 0; n.waves.length = n.orbs.length = n.fx.length = 0; return; }
    if (!playerHasNail(g) && n.charge === 0) { rs.soul = 0; n.disp = 0; }                  // sem agulhão, as almas se perdem
    n.disp += (rs.soul - n.disp) * Math.min(1, dt * 9);
    // faíscas ao longo da meia-lua enquanto o golpe corta
    const sw = g.sword;
    if (sw.active && ITEM_DEFS[sw.item]?.nailSkin != null && sw.t > sw.prof.preparacao && sw.t < sw.prof.preparacao + sw.prof.corte + 0.05) {
      const ang = swordWorldAngle(sw, sw.aim), sh = shoulderPos(p, swordLunge(sw)), lx = 20 + Math.random() * 34, ly = (Math.random() - 0.5) * 50;
      const wx = sh.x + Math.cos(ang) * lx - Math.sin(ang) * ly * (sw.facing < 0 ? -1 : 1), wy = sh.y + Math.sin(ang) * lx + Math.cos(ang) * ly * (sw.facing < 0 ? -1 : 1);
      bfx(g, 'spark', wx, wy, { vx: Math.cos(ang) * 40 + (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 50, grav: 0, life: 0.22, color: Math.random() < 0.5 ? [255, 255, 255] : [150, 225, 255] });
    }
    // carga curta antes da rajada
    // medidor cheio: botão direito com o agulhão na mão solta a rajada
    const holdsNail = ITEM_DEFS[g.inventory.slots[g.selected]?.item]?.nailSkin != null, right = input.mouse.right, edge = right && !n.rightWas; n.rightWas = right;
    if (edge && holdsNail && rs.soul >= SOUL_MAX && n.charge === 0 && !g.inventoryUI.open && !g.mapUI.open && !g.npcOpen && !g.adminOpen) n.charge = 0.0001;
    if (n.charge > 0) {
      n.charge += dt;
      if (Math.random() < dt * 40) bfx(g, 'spark', p.cx + (Math.random() - 0.5) * 30, p.cy + (Math.random() - 0.5) * 34, { vx: (p.cx - p.cx) * 0, vy: -30, grav: 0, life: 0.3, color: [200, 240, 255] });
      if (n.charge >= 0.18) nailFireWave(g);
    }
    if (n.ring) { n.ring += dt; if (n.ring > 0.4) n.ring = 0; }
    // orbes de alma voam até você
    for (let i = n.orbs.length - 1; i >= 0; i--) {
      const o = n.orbs[i]; o.age += dt; const tx = p.cx, ty = p.cy - 4, dx = tx - o.x, dy = ty - o.y, d = Math.hypot(dx, dy) || 1, acc = o.age > 0.12 ? 1500 : 0;
      o.vx = (o.vx + dx / d * acc * dt) * (o.age > 0.12 ? 0.94 : 0.9); o.vy = (o.vy + dy / d * acc * dt) * (o.age > 0.12 ? 0.94 : 0.9);
      o.x += o.vx * dt; o.y += o.vy * dt; o.tr.push([o.x, o.y]); if (o.tr.length > 6) o.tr.shift();
      if (d < 7 || o.age > 1.4) { n.orbs.splice(i, 1); n.pop = 0.18; }
    }
    if (n.pop > 0) n.pop -= dt;
    for (let i = n.fx.length - 1; i >= 0; i--) { n.fx[i].age += dt; if (n.fx[i].age >= n.fx[i].life) n.fx.splice(i, 1); }
    // a rajada: atravessa todo mundo, uma vez cada
    for (let i = n.waves.length - 1; i >= 0; i--) {
      const w = n.waves[i]; w.age += dt;
      const steps = Math.max(1, Math.ceil(480 * dt / 5)); let ended = w.age >= w.life;
      for (let k = 0; k < steps && !ended; k++) {
        const nx = w.x + w.dir * 480 * dt / steps;
        if (g.world.isSolid(Math.floor((nx + w.dir * 10) / T), Math.floor(w.y / T))) { ended = true; nailBurst(g, nx, w.y, true); break; }
        w.x = nx;
        for (const m of g.mobs || []) if (!m.dead && !m.sleeping && !w.hit.has(m) && typeof m.hit === 'function' && w.x + 12 >= m.x && w.x - 12 <= m.x + m.w && w.y + 26 >= m.y && w.y - 26 <= m.y + m.h) {
          w.hit.add(m); m.hit(26, p.cx); nailBurst(g, m.cx, m.cy, true); g.hitStop = Math.max(g.hitStop || 0, 0.04); g.shake = Math.max(g.shake || 0, 2.5);
        }
      }
      w.trail.push([w.x, w.y]); if (w.trail.length > 5) w.trail.shift();
      if (Math.random() < dt * 60) bfx(g, 'spark', w.x - w.dir * 8, w.y + (Math.random() - 0.5) * 40, { vx: -w.dir * 60, vy: (Math.random() - 0.5) * 40, grav: 0, life: 0.3, color: [200, 240, 255] });
      if (ended) n.waves.splice(i, 1);
    }
  };
  const baseDraw = drawReferences;
  drawReferences = function (ctx, g) {
    baseDraw(ctx, g);
    const n = nailState(g), p = g.player, rs = referenceState(g), t = g.clock || 0;
    ctx.save(); ctx.imageSmoothingEnabled = false;
    // aura que cresce com as almas, e brilho forte durante a carga
    const lvl = n.charge > 0 ? 1 : Math.max(0, (n.disp - 2) / 4);
    if (lvl > 0.02 && !g.respawnPending) {
      const r = 18 + lvl * 10 + (n.charge > 0 ? Math.sin(n.charge * 40) * 3 : 0), gr = ctx.createRadialGradient(p.cx, p.cy, 2, p.cx, p.cy, r);
      gr.addColorStop(0, `rgba(235,250,255,${0.38 * lvl})`); gr.addColorStop(1, 'rgba(120,200,255,0)'); ctx.fillStyle = gr; ctx.fillRect(p.cx - r, p.cy - r, r * 2, r * 2);
    }
    if (n.ring) { const k = n.ring / 0.4, r = 8 + k * 46; ctx.globalAlpha = 1 - k; ctx.strokeStyle = '#eafcff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.cx, p.cy, r, 0, 6.283); ctx.stroke(); ctx.globalAlpha = 1; }
    for (const w of n.waves) {                                          // a rajada: meia-lua enorme com rastros
      const fade = w.age < 0.08 ? w.age / 0.08 : Math.min(1, (w.life - w.age) / 0.2);
      for (let i = 0; i < w.trail.length; i++) { const [tx, ty] = w.trail[i]; ctx.globalAlpha = 0.14 * (i + 1) / w.trail.length * fade; ctx.save(); ctx.translate(Math.round(tx), Math.round(ty)); ctx.scale(w.dir, 1); ctx.drawImage(NAIL_WAVE, -50, -48); ctx.restore(); }
      ctx.globalAlpha = fade; ctx.save(); ctx.translate(Math.round(w.x), Math.round(w.y)); ctx.scale(w.dir, 1); ctx.drawImage(NAIL_WAVE, -50, -48); ctx.restore();
    }
    ctx.globalAlpha = 1;
    for (const o of n.orbs) {                                           // almas voando
      for (let i = 0; i < o.tr.length; i++) { ctx.globalAlpha = (i + 1) / o.tr.length * 0.5; ctx.fillStyle = '#9fdcff'; ctx.fillRect(Math.round(o.tr[i][0]), Math.round(o.tr[i][1]), 1, 1); }
      ctx.globalAlpha = 1; ctx.fillStyle = '#7ec8f5'; ctx.fillRect(Math.round(o.x) - 2, Math.round(o.y) - 1, 4, 2); ctx.fillRect(Math.round(o.x) - 1, Math.round(o.y) - 2, 2, 4); ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(o.x) - 1, Math.round(o.y) - 1, 2, 2);
    }
    for (const f of n.fx) {                                             // estrelinha de impacto
      const k = f.age / f.life, len = (f.big ? 20 : 12) * (0.4 + k), N = f.big ? 10 : 6; ctx.globalAlpha = 1 - k; ctx.fillStyle = '#ffffff';
      for (let i = 0; i < N; i++) { const a = f.rot + i * 6.283 / N, l = len * (i % 2 ? 0.55 : 1); for (let r = 3; r < l; r += 2) ctx.fillRect(Math.round(f.x + Math.cos(a) * r), Math.round(f.y + Math.sin(a) * r), 1, 1); }
      ctx.fillStyle = '#bfeaff'; ctx.fillRect(Math.round(f.x) - 2, Math.round(f.y) - 2, 4, 4);
    }
    ctx.restore();
  };
}

// ---------------------------------------------------------------- medidor de almas (HUD)
InventoryUI.prototype.drawSoulVessel = function (ctx) {
  const g = this.game, n = g.referenceState?.nail;
  if (!playerHasNail(g)) return;                                                   // sem o agulhão na mochila, o medidor some
  ctx.save();
  const s = this.scale(), now = performance.now() / 1000, disp = n ? n.disp : 0, ready = (g.referenceState?.soul || 0) >= SOUL_MAX, shake = (n?.charge || 0) > 0 ? Math.round(Math.sin(now * 90)) : 0;
  ctx.setTransform(s, 0, 0, s, UI.ORIGIN + shake * s, UI.ORIGIN + (UI.HOTBAR_H + 16) * s);
  ctx.imageSmoothingEnabled = false;
  const X = 118, W = 57;
  if (ready) { const pulse = 0.5 + 0.5 * Math.sin(now * 8); const gr = ctx.createRadialGradient(X + W / 2, 8, 4, X + W / 2, 8, 34); gr.addColorStop(0, `rgba(255,236,160,${0.4 * pulse + 0.1})`); gr.addColorStop(1, 'rgba(255,220,120,0)'); ctx.fillStyle = gr; ctx.fillRect(X - 16, -14, W + 32, 44); }
  uiFrame(ctx, X, 0, W, 16);
  const rows = [1, 3, 5, 7, 5, 3, 1];                                                // seis losangos de alma, enchendo de baixo para cima
  for (let k = 0; k < SOUL_MAX; k++) {
    const amount = clamp(disp - k, 0, 1), cx = X + 6 + k * 7.6 + 3.5, top = 4.5;
    for (let r = 0; r < 7; r++) {
      const w = rows[r], filled = (7 - r - 0.5) / 7 <= amount + 0.001;
      for (let i = 0; i < w; i++) {
        const px = Math.round(cx - (w - 1) / 2 + i), py = Math.round(top + r), edge = i === 0 || i === w - 1 || r === 0 || r === 6;
        let col;
        if (filled) col = ready ? (edge ? '#ffcf5a' : (r < 3 ? '#fff6c8' : '#ffe08a')) : (edge ? '#7fd0ff' : (r < 3 ? '#f2fcff' : '#a8e2ff'));
        else col = edge ? '#46517a' : '#161b34';
        ctx.fillStyle = col; ctx.fillRect(px, py, 1, 1);
      }
    }
    if (amount > 0.99 && Math.floor(now * 3 + k) % 7 === 0) { ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(cx), 6, 1, 1); }   // brilhinho
  }
  if (n?.pop > 0) { ctx.fillStyle = `rgba(255,255,255,${n.pop * 3})`; ctx.fillRect(X + 1, 1, W - 2, 1); }
  ctx.restore();
};
{
  const baseVitals = InventoryUI.prototype.drawVitals;
  InventoryUI.prototype.drawVitals = function (ctx, player) { baseVitals.call(this, ctx, player); this.drawSoulVessel(ctx); };
}
