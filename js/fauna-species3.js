'use strict';
// =====================================================================================
//  FAUNA NOVA, PARTE 3: caranguejo, sapo, garça-real, lagarto-de-gola e tatu-bola
// =====================================================================================
// Anatomias que não cabem no frQuad: cada espécie tem o próprio desenho quadro a quadro (frInfo) usando os pincéis do rig
// (frFur, frLeg, frPoly, frChain, frHead). Carrega depois de fauna-species2.js.

// ---------------------------------------------------------------- Caranguejo (praia)
{
  const pal = [[70, 16, 14], [140, 34, 24], [200, 64, 38], [236, 110, 60], [255, 172, 112]];
  const paint = (s, p, f) => {
    const I = frInfo(f), ph = I.ph, g = 17, cx = 14, bob = I.walk ? Math.round(Math.abs(Math.sin(ph * 2))) : 0, cy = 10 - bob;
    // pernas: três de cada lado, em pares alternados
    for (const side of [-1, 1]) for (let k = 0; k < 3; k++) {
      const far = side > 0, root = [cx + side * (4 + k * 1.2), cy + 3], up = I.walk ? Math.max(0, Math.sin(ph * 2 + k * 2.1 + (side > 0 ? 0 : Math.PI))) * 2.5 : 0;
      const foot = [cx + side * (9 + k * 2 + (I.walk ? Math.sin(ph + k) * 1.5 : 0)), g - up], knee = [cx + side * (8 + k * 1.4), cy + 0.5 - k * 0.3];
      seg(s, root[0], root[1], knee[0], knee[1], 1.6, far ? pal[0] : pal[1]); seg(s, knee[0], knee[1], foot[0], foot[1], 1.4, far ? pal[0] : pal[2]);
    }
    // cascos com pedaços de textura (granulado e cristas)
    frFur(s, cx, cy, 8.4, 5.2, { pal, seed: 5, belly: -0.05, sq: 2.3, pattern: (dx, dy, nx, ny, idx) => ((Math.abs(dx) === 4 || Math.abs(dx) === 7) && dy > -3 && dy < 1 ? pal[Math.max(0, idx - 1)] : (hash2(dx, dy, 6) > 0.9 ? pal[Math.min(4, idx + 1)] : null)) });
    // olhos em hastes
    for (const ex of [cx - 3, cx + 3]) { seg(s, ex, cy - 4, ex + (ex < cx ? -0.5 : 0.5), cy - 7, 1.2, pal[1]); frEye(s, ex + (ex < cx ? -1 : 1), cy - 8, { big: true }); }
    // pinças: levantam e acenam no quadro parado
    const wave = I.idle === 1 ? 1 : I.idle === 2 ? 2 : I.idle === 3 ? 3 : 0;
    for (const side of [-1, 1]) {
      const lift = I.walk ? 2 + Math.sin(ph + (side > 0 ? 0 : Math.PI)) * 1.5 : (wave === 2 || (wave === 1 && side > 0) || (wave === 3 && side < 0) ? 6 : 2.5);
      const sx = cx + side * 7.5, sy = cy - 1, ex = cx + side * 11.5, ey = cy - 2 - lift;
      seg(s, sx, sy, cx + side * 10, cy - 1 - lift * 0.4, 2, pal[1]);
      frFur(s, ex, ey, 3.2, 2.7, { pal, seed: 9 + side, fur: 0.2 });
      frPoly(s, [[ex + side * 0.5, ey - 0.5], [ex + side * 3.5, ey - 1], [ex + side * 1.5, ey - 3]], pal[3]);   // dedo da pinça
      s.set(Math.round(ex + side * 1.5), Math.round(ey - 1), pal[0]);
    }
  };
  frSpecies('caranguejo', { name: 'Caranguejo', biome: BIOME.OCEAN, hp: 9, speed: 34, w: 16, h: 10, drops: [[ITEM.RAW_FISH, 1, 1], [ITEM.SHELL, 0, 1]], color: '#d8502c' },
    faunaHook({ paint, scare: 4, flee: 2.3, gaitDiv: 2.2, idleChance: 0.5, alwaysWalk: false, onUpdate: (m) => { if (m.dir) m.facing = m.dir; } }), [28, 18], pal, 'bug');
}

// ---------------------------------------------------------------- Garça-real (pântano)
{
  const pal = [[34, 48, 68], [76, 98, 126], [126, 148, 174], [182, 198, 216], [232, 240, 248]];
  const white = [[150, 164, 180], [206, 216, 228], [240, 246, 252], [255, 255, 255]];
  const paint = (s, p, f) => {
    const I = frInfo(f), ph = I.ph, g = 53, cx = 14, bob = I.walk ? Math.round(Math.abs(Math.sin(ph * 2)) * 0.8) : 0, cy = 29 - bob;
    const oneLeg = f === 14;
    // pernas finas, joelho para trás
    const legs = [[cx - 1, 0, true], [cx + 2, 0.5, false]];
    for (const [hx, off, far] of legs) {
      let foot = I.walk ? frFoot(ph / FR_TAU + off, hx, g, 9, 7) : [hx + (far ? -1 : 1), g];
      if (oneLeg && !far) foot = [hx - 1, cy + 8];
      const [kx, ky] = ik(hx, cy + 4, foot[0], foot[1], 11, 11, -1);
      seg(s, hx, cy + 4, kx, ky, 1.7, far ? pal[0] : pal[1]); seg(s, kx, ky, foot[0], foot[1], 1.5, far ? pal[0] : [196, 160, 80]);
      seg(s, foot[0], foot[1], foot[0] + (oneLeg && !far ? 1 : 3), foot[1], 1.2, far ? pal[0] : [150, 120, 60]);
    }
    // cauda curta, corpo, asa dobrada com as penas de voo
    frPoly(s, [[cx - 7, cy - 2], [cx - 15, cy + 2], [cx - 14, cy + 5], [cx - 6, cy + 3]], (x, y) => pal[clamp(Math.floor((y - cy) / 3 + 1.2), 0, 2)]);
    frFur(s, cx, cy, 9, 5, { pal, seed: 21, belly: 0.12, fur: 0.6 });
    frPoly(s, [[cx - 8, cy - 1], [cx - 1, cy - 3], [cx + 5, cy + 1], [cx, cy + 5], [cx - 9, cy + 4]], (x, y) => pal[clamp(Math.floor(((y - cy) / 4) + 1.6 + (x < cx - 4 ? 0.4 : 0)), 0, 3)]);
    for (let k = 0; k < 4; k++) seg(s, cx - 8 + k * 0.5, cy + 2 + k * 0.5, cx - 13 + k * 0.5, cy + 3.5 + k * 0.5, 1, pal[0]);     // pontas das penas
    // pescoço em S e cabeça; o "neckT" desenha de acordo com a pose
    const pose = f === 15 ? 'strike' : f === 10 ? 'peck' : f === 9 ? 'tuck' : oneLeg ? 'tuck' : 'up';
    const sh = [cx + 6, cy - 3], pts = [];
    const neckPoint = (t) => {
      if (pose === 'up') return [sh[0] + Math.sin(t * 3.1) * 3 + t * 1.5, sh[1] - t * 22 + Math.sin(t * 2) * 1.5 + (I.walk ? Math.sin(ph * 2) * 0.6 * t : 0)];
      if (pose === 'tuck') return [sh[0] - Math.sin(t * Math.PI) * 4 + t * 3, sh[1] - t * 8 - Math.sin(t * Math.PI) * 5];
      if (pose === 'peck') return [sh[0] + t * 11 + Math.sin(t * 2.5) * 2, sh[1] - Math.sin(t * Math.PI) * 7 + t * t * 26];
      return [sh[0] + t * 22, sh[1] - Math.sin(t * Math.PI) * 3 + t * 10];
    };
    for (let i = 0; i <= 12; i++) pts.push(neckPoint(i / 12));
    pts.forEach(([x, y], i) => { const t = i / 12, r = 2.6 - t * 1.1; frFur(s, x, y, r, r, { pal: white, seed: 30 + i, fur: 0.3, pattern: (dx, dy) => (i % 3 === 1 && dx >= 0 && hash2(dx, dy, i) > 0.4 ? pal[0] : null) }); });
    const [hx, hy] = pts[12], ha = pose === 'peck' ? 1.0 : pose === 'strike' ? 0.5 : pose === 'tuck' ? 0.1 : 0;
    frFur(s, hx, hy, 3.2, 2.5, { pal: white, seed: 33, fur: 0 });
    frPoly(s, [[hx - 3, hy - 2.3], [hx - 1, hy - 3], [hx + 0.5, hy - 1.8], [hx - 2, hy + 0.2]], pal[0]);          // faixa preta sobre o olho
    seg(s, hx - 3, hy - 3, hx - 9, hy - 2 + 2, 1.2, pal[0]);                                                 // pluma da nuca
    const bx = hx + 2.5, by = hy + 0.5, len = 9;
    frPoly(s, [[bx, by - 1.4], [bx + Math.cos(ha) * len, by + Math.sin(ha) * len], [bx, by + 1.2]], (x, y) => ((x - bx) / len > 0.7 ? [210, 150, 40] : [244, 196, 60]));
    seg(s, bx, by + 1.2, bx + Math.cos(ha) * len * 0.8, by + Math.sin(ha) * len * 0.8 + 0.6, 1, [190, 130, 30]);
    frEye(s, Math.round(hx + 0.5), Math.round(hy - 0.5), { closed: f === 11, iris: [220, 190, 40] });
  };
  frSpecies('garca', { name: 'Garça-real', biome: BIOME.SWAMP, hp: 12, speed: 26, w: 18, h: 40, drops: [[ITEM.FEATHER, 1, 2], [ITEM.EGG, 0, 1], [ITEM.MEAT, 1, 1]], color: '#9db0c8' },
    faunaHook({ paint, scare: 7, flee: 2.6, gaitDiv: 4.5, idleChance: 0.75, idleRate: 1, frames: { idle: (m, f) => (f === 10 ? (Math.floor(m.clock * 0.7) % 3 === 0 ? 14 : Math.floor(m.clock * 0.7) % 3 === 1 ? 15 : 10) : f) } }), [34, 56], pal, 'tsuru');
}

// ---------------------------------------------------------------- Tatu-bola (mesa): vira uma bola blindada quando se assusta
{
  const pal = [[64, 50, 50], [112, 92, 90], [160, 138, 128], [204, 184, 168], [238, 226, 208]];
  const skin = [[120, 80, 76], [176, 126, 116], [220, 176, 160]];
  const bands = (cx, cy, rx, ry) => (dx, dy, nx, ny, idx) => { const k = Math.floor((nx + 1) * 5.2); return k % 2 === 0 ? pal[Math.max(0, idx - 1)] : (hash2(dx, dy, 3) > 0.85 ? pal[Math.min(4, idx + 1)] : null); };
  const paint = (s, p, f) => {
    const I = frInfo(f), ph = I.ph, g = 23, cx = 15, bob = I.walk ? Math.round(Math.abs(Math.sin(ph * 2)) * 0.8) : 0, cy = 14 - bob;
    if (f === 14 || f === 15) {                                                     // bola
      const r = f === 14 ? 8.6 : 8, bcy = g - r + 0.5, sh = (dx, dy, nx, ny, idx) => (Math.floor((Math.atan2(ny, nx) + Math.PI) * 3.2) % 2 === 0 ? pal[Math.max(0, idx - 1)] : (hash2(dx, dy, 5) > 0.88 ? pal[Math.min(4, idx + 1)] : null));
      frFur(s, cx, bcy, r, r, { pal, seed: 61, belly: -0.02, pattern: sh, fur: 0.3 });
      if (f === 15) { frFur(s, cx + 7, bcy + 2, 2.8, 2.2, { pal: skin, seed: 4, fur: 0 }); s.set(cx + 8, bcy + 1, [24, 18, 20]); }
      return;
    }
    // patinhas
    for (const [hx, k, far] of [[cx - 6, 2, true], [cx + 6, 3, true], [cx - 5, 0, false], [cx + 7, 1, false]]) {
      const foot = I.walk ? frFoot(ph / FR_TAU + [0, 0.5, 0.5, 0][k], hx, g, 5, 2) : [hx + (far ? -0.5 : 0.5), g];
      frLeg(s, hx, cy + 4, foot[0], foot[1], { L1: 2.5, L2: 3, w1: 2.6, w2: 2, pal: skin, hoof: [70, 46, 44], paw: 3 }, far);
    }
    // cauda pontuda
    for (let i = 0; i <= 6; i++) { const t = i / 6; frFur(s, cx - 10 - i * 1.5, cy + 2 + t * 3 + (I.walk ? Math.sin(ph + t * 3) * t : 0), 2.4 * (1 - t) + 0.5, 2 * (1 - t) + 0.5, { pal: skin, seed: 7 + i, fur: 0 }); }
    // carapaça em placas (domo com faixas)
    frFur(s, cx, cy, 11, 7.2, { pal, seed: 62, belly: -0.1, sq: 2.3, pattern: bands(cx, cy, 11, 7.2), fur: 0.3 });
    frFur(s, cx + 9, cy + 1, 4.4, 5.2, { pal: skin, seed: 8, fur: 0.2, belly: 0.1 });                      // pescocinho
    // cabeça com focinho comprido e orelhas em pé
    const hy = cy + (I.idle === 2 ? 5 : 3), hx = cx + 12 + (I.idle === 2 ? 2 : 0);
    frPoly(s, [[hx - 1, hy - 3], [hx - 0.5, hy - 7.5 + (I.idle === 3 ? 1 : 0)], [hx + 2, hy - 3]], skin[1]); s.set(hx, Math.round(hy - 5), skin[2]);
    frFur(s, hx, hy, 3.6, 3, { pal: skin, seed: 9, fur: 0 });
    frPoly(s, [[hx + 2, hy - 1.5], [hx + 7, hy + 0.5], [hx + 2, hy + 2]], (x, y) => skin[clamp(Math.floor(2 - (y - hy) * 0.4), 0, 2)]);
    s.set(Math.round(hx + 6.4), Math.round(hy + 0.4), [40, 24, 28]);
    frEye(s, Math.round(hx + 1.5), Math.round(hy - 0.7), { closed: f === 11 });
  };
  frSpecies('tatu', { name: 'Tatu-bola', biome: BIOME.MESA, hp: 24, speed: 34, w: 24, h: 14, drops: [[ITEM.LEATHER, 1, 2], [ITEM.MEAT, 1, 2]], color: '#a08a80' },
    faunaHook({ paint, scare: 4, flee: 1.6, gaitDiv: 3, idleChance: 0.5,
      onHit: (m) => { m.ballT = 3.2; },
      onUpdate: (m, dt, w, p, ctx) => {
        if (m.ballT == null) m.ballT = 0;
        if (m.ballT <= 0 && ctx.dist < 3.6 * T && m.fleeTimer <= 0 && Math.random() < dt * 1.5) m.ballT = 2.5 + Math.random();
        if (m.ballT > 0) { m.ballT -= dt; ctx.want = 0; ctx.speedK = 0; m.vx *= 0.8; m.fleeTimer = 0; }
      },
      pose: (m) => (m.ballT > 0 ? (m.ballT < 0.5 ? 15 : 14) : null) }), [34, 26], pal, 'tortoise');
}
