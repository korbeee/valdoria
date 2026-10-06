'use strict';
// =====================================================================================
//  CÂMARA DO ESCAVADOR  (visual)
// =====================================================================================
// A caixa jogável é a de js/beetle-boss.js (chão de areia reto, duas colunas de rocha dura,
// teto a 13 blocos). Aqui fica só a decoração, em camadas transparentes por cima da parede
// de arenito: estratos coloridos, veios de ferro que brilham, bocas de túneis que o próprio
// besouro cavou, a carapaça fóssil de um antecessor, runas do observatório pulsando perto do
// portão, teto de caverna, feixes de luz com poeira, areia que escorre e as ruínas de quem
// tentou minerar aqui antes.

function beetleLairLayers(w, lair) {
  const [x0, y0, x1, y1] = lair.bounds, W = (x1 - x0 + 1) * T, H = (y1 - y0 + 1) * T, A = LairArt;
  const seed = (w.seed ^ x0 ^ 0x5ea1) >>> 0, rnd = mulberry32(seed);
  const gateRight = lair.gate[0][0] > x1, cx = (x0 + x1) / 2, pillars = [cx - 11, cx + 11].map((p) => (p - x0 + 0.5) * T);
  const mk = () => { const cv = makeCanvas(W, H); return [cv, cv.getContext('2d')]; };
  const [back, b] = mk(), [glyph, gl] = mk();
  const glints = [], holes = [];

  // ---- estratos: faixas onduladas de tons de arenito, em transparência para a parede aparecer
  const strata = ['rgba(120,64,28,.24)', 'rgba(236,196,116,.13)', 'rgba(70,36,18,.27)', 'rgba(170,102,48,.17)', 'rgba(250,224,160,.09)'];
  for (let k = 0; k < 9; k++) {
    const base = 14 + k * (H - 26) / 8, thick = 5 + Math.floor(rnd() * 12), col = strata[k % strata.length];
    for (let x = 0; x < W; x++) {
      const y = base + (A.fbm(x / 46, seed + k * 5) - 0.5) * 18;
      b.fillStyle = col; b.fillRect(x, Math.round(y), 1, thick);
      if (!(x & 1)) { b.fillStyle = col; b.fillRect(x, Math.round(y) + thick, 1, 1); }       // borda picotada
    }
  }
  // grãos de areia clara e escura espalhados
  for (let i = 0; i < 900; i++) { b.fillStyle = i % 3 ? 'rgba(255,226,160,.17)' : 'rgba(60,30,12,.2)'; b.fillRect(Math.floor(rnd() * W), Math.floor(rnd() * H), 1 + (i & 1), 1); }

  // ---- carapaça fóssil de um Casco de Ferro antigo, enterrada na parede
  {
    const fx = (gateRight ? 0.27 : 0.73) * W, fy = H * 0.5, rx = 74, ry = 50;
    const bone = (a) => `rgba(222,200,154,${a})`, dark = (a) => `rgba(70,44,20,${a})`;
    A.blob(b, fx, fy, rx, ry, (x, y, d) => {
      if (y > 6) return null;                                                          // só a cúpula: o resto está soterrado
      if (d > 0.9) return dark(0.75);
      const plate = Math.floor((Math.atan2(y, x) + Math.PI) / (Math.PI / 7));
      const lit = -x / rx * 0.4 - y / ry * 0.5;
      return plate % 2 ? bone(0.34 + lit * 0.14) : bone(0.52 + lit * 0.16);
    });
    for (let k = 1; k < 7; k++) { const a = Math.PI + k * Math.PI / 7; A.line(b, fx, fy + 4, fx + Math.cos(a) * rx * 0.97, fy + Math.sin(a) * ry * 0.97, dark(0.5)); }
    A.line(b, fx - rx, fy + 1, fx + rx, fy + 1, dark(0.45));
    for (const sd of [-1, 1]) for (let l = 0; l < 3; l++) { // patas articuladas saindo da terra
      let px0 = fx + sd * (rx * 0.82 - l * 14), py0 = fy + 3;
      for (let seg = 0; seg < 3; seg++) { const nx = px0 + sd * (10 + seg * 3), ny = py0 + 8 + seg * 5; A.line(b, px0, py0, nx, ny, bone(0.32)); A.line(b, px0 + 1, py0, nx + 1, ny, dark(0.3)); px0 = nx; py0 = ny; }
    }
    for (const sd of [-1, 1]) { A.line(b, fx + sd * (rx + 2), fy - 4, fx + sd * (rx + 18), fy - 20, bone(0.4)); A.line(b, fx + sd * (rx + 18), fy - 20, fx + sd * (rx + 12), fy - 30, bone(0.4)); } // pinças
  }

  // ---- veios de ferro azulado que cortam a parede (e brilham de vez em quando)
  const steel = ['#1d3566', '#3b6fcf', '#6db6ff', '#d6f0ff'], crystals = [];
  for (let v = 0; v < 7; v++) {
    let x = rnd() < 0.5 ? rnd() * W * 0.4 : W * (0.6 + rnd() * 0.4), y = 14 + rnd() * (H - 90);
    const dir = (rnd() < 0.5 ? 1 : -1), slope = 0.1 + rnd() * 0.6, len = 55 + Math.floor(rnd() * 70);
    for (let s = 0; s < len; s++) {
      x += dir * (0.6 + rnd() * 0.5); y += slope * (rnd() < 0.5 ? 1 : 0.3) + Math.sin(s * 0.09 + v) * 0.18;
      if (x < 4 || x > W - 4 || y < 10 || y > H - 12) break;
      const th = 2 + (s % 17 < 8 ? 1 : 0) + (s % 41 < 8 ? 2 : 0);
      for (let t = 0; t < th; t++) A.px(b, x, y + t, steel[t === 0 ? 2 : t === th - 1 ? 0 : 1]);
      if (s % 11 === 0) glints.push([x, y]);
      if (s % 29 === 14 && crystals.length < 12) crystals.push([x, y]);
      if (rnd() < 0.05) for (let j = 0; j < 3; j++) A.px(b, x + j - 1, y - 1, steel[3]);   // pontos claros
    }
  }

  // cristais de ferro azulado nascendo dos veios e nos cantos do chão
  for (const [cx0, cy0] of [...crystals, [14, H - 2], [W - 16, H - 2], [W * 0.5, H - 2]]) {
    const n = 2 + Math.floor(rnd() * 2);
    for (let k = 0; k < n; k++) {
      const hh = 7 + Math.floor(rnd() * 8), lean = (k - (n - 1) / 2) * 0.32 + (rnd() - 0.5) * 0.2, bw = 3 + Math.floor(rnd() * 2), bx = cx0 + (k - n / 2) * 4, by = cy0;
      for (let y = 0; y < hh; y++) { const half = Math.max(0.5, bw * (1 - y / hh) * (y > hh * 0.8 ? 0.5 : 1)); for (let x = -Math.ceil(half); x <= Math.ceil(half); x++) A.px(b, bx + lean * y + x, by - y, x < -half * 0.2 ? steel[2] : y > hh * 0.55 ? steel[1] : steel[0]); }
      A.px(b, bx + lean * hh, by - hh, steel[3]); glints.push([bx + lean * hh * 0.7, by - hh * 0.7]);
    }
  }

  // ---- bocas de túneis cavados pelo besouro (com areia escorrida embaixo)
  for (let i = 0; i < 5; i++) {
    const hx = (0.1 + 0.8 * ((i + rnd() * 0.5) / 5)) * W, low = i % 2 === 0, hy = low ? H - 20 - rnd() * 10 : 44 + rnd() * 70, rx = 12 + rnd() * 8, ry = 9 + rnd() * 6;
    if (pillars.some((p) => Math.abs(p - hx) < 22)) continue;
    holes.push([hx, hy]);
    A.blob(b, hx, hy, rx + 3, ry + 3, (x, y, d) => (d > 0.72 ? ((x / rx) * -0.6 - (y / ry) * 0.7 > 0.1 ? '#e0b676' : '#4a2a14') : null)); // aro, claro em cima
    A.blob(b, hx, hy, rx, ry, (x, y, d) => (d > 0.6 ? '#2c170b' : d > 0.25 ? '#170b05' : '#0b0502'));
    for (let g2 = 0; g2 < 14; g2++) { const a = g2 * 0.45; A.px(b, hx + Math.cos(a) * (rx + 4 + (g2 % 3)), hy + Math.sin(a) * (ry + 4 + (g2 % 3)), 'rgba(40,20,8,.55)'); }
    for (let k = 0; k < 160; k++) {                                                          // talude de areia
      const t = rnd(), sy = hy + ry + t * (H - hy - ry), spread = (sy - hy - ry) * 0.8 + 4, sx = hx + (rnd() - 0.5) * 2 * spread;
      b.fillStyle = k % 3 ? 'rgba(212,166,92,.5)' : 'rgba(250,214,140,.4)'; b.fillRect(Math.round(sx), Math.round(sy), 1, 1);
    }
  }

  // ---- teto de caverna: pedra irregular, estalactites de arenito e rachaduras
  for (let x = 0; x < W; x++) {
    const d = 4 + Math.round(A.fbm(x / 8, seed + 99) * 12);
    b.fillStyle = 'rgba(32,18,9,.95)'; b.fillRect(x, 0, 1, d);
    b.fillStyle = 'rgba(150,102,56,.8)'; b.fillRect(x, d, 1, 1);
    if (!(x & 3)) { b.fillStyle = 'rgba(32,18,9,.5)'; b.fillRect(x, d + 1, 1, 2); }
  }
  for (let i = 0; i < 10; i++) {
    const sx = Math.floor(rnd() * W), len = 14 + Math.floor(rnd() * 30), wd = 5 + Math.floor(rnd() * 8);
    for (let y = 0; y < len; y++) { const half = Math.max(0.6, wd / 2 * Math.pow(1 - y / len, 0.85)); for (let x = Math.floor(-half); x <= Math.ceil(half); x++) A.px(b, sx + x, y, x < -half * 0.25 ? '#8a5c32' : y > len * 0.55 ? '#2c190d' : '#432611'); }
  }
  const vg = b.createLinearGradient(0, 0, W, 0); vg.addColorStop(0, 'rgba(0,0,0,.38)'); vg.addColorStop(0.1, 'rgba(0,0,0,0)'); vg.addColorStop(0.9, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.38)');
  b.fillStyle = vg; b.fillRect(0, 0, W, H);
  const dv = b.createLinearGradient(0, 0, 0, H); dv.addColorStop(0, 'rgba(0,0,0,.3)'); dv.addColorStop(0.3, 'rgba(0,0,0,0)'); b.fillStyle = dv; b.fillRect(0, 0, W, H);

  // ---- runas do observatório e canos de bronze junto ao portão
  {
    const gx = gateRight ? W - 54 : 10, bronze = ['#4d300f', '#845a26', '#c08a42', '#f6cf82'];
    for (let r = 0; r < 7; r++) for (let c2 = 0; c2 < 3; c2++) {
      const rx0 = gx + c2 * 16, ry0 = 28 + r * 22, kind = Math.floor(hash2(r, c2, seed) * 5), col = '#ffb347';
      gl.fillStyle = col;
      if (kind === 0) { for (let a = 0; a < 6.3; a += 0.5) A.px(gl, rx0 + 5 + Math.cos(a) * 4, ry0 + 5 + Math.sin(a) * 4, col); A.px(gl, rx0 + 5, ry0 + 5, col); }
      else if (kind === 1) { A.line(gl, rx0 + 1, ry0 + 9, rx0 + 5, ry0 + 1, col); A.line(gl, rx0 + 5, ry0 + 1, rx0 + 9, ry0 + 9, col); A.line(gl, rx0 + 2, ry0 + 6, rx0 + 8, ry0 + 6, col); }
      else if (kind === 2) { gl.fillRect(rx0 + 1, ry0 + 1, 9, 1); gl.fillRect(rx0 + 1, ry0 + 9, 9, 1); gl.fillRect(rx0 + 1, ry0 + 1, 1, 9); gl.fillRect(rx0 + 9, ry0 + 1, 1, 9); A.px(gl, rx0 + 5, ry0 + 5, col); }
      else if (kind === 3) { for (let k = 0; k < 4; k++) A.px(gl, rx0 + 2 + k * 2, ry0 + 2 + (k % 2) * 6, col); A.line(gl, rx0 + 2, ry0 + 5, rx0 + 8, ry0 + 5, col); }
      else { A.line(gl, rx0 + 1, ry0 + 1, rx0 + 9, ry0 + 9, col); A.line(gl, rx0 + 9, ry0 + 1, rx0 + 1, ry0 + 9, col); }
    }
    for (const py of [H - 46, H - 62]) { // canos de bronze correndo do portão para dentro da parede
      for (let x = 0; x < 62; x++) { const xx = gateRight ? W - 62 + x : x; for (let t = 0; t < 4; t++) A.px(b, xx, py + t, bronze[t === 0 ? 3 : t === 3 ? 0 : 2 - (t & 1)]); }
      for (const jx of [8, 30, 54]) { const xx = gateRight ? W - 62 + jx : jx; A.rect(b, xx - 1, py - 2, 4, 8, '#2f1d08'); A.rect(b, xx, py - 1, 2, 6, bronze[2]); }
    }
  }

  // ---- ruínas no chão: vagonete amassado e trilho, ossos grandes, ferramentas, minério
  const floorY = H;
  const rust = ['#241a14', '#4a3628', '#7a5a40', '#a98764'];
  const cartX = Math.round(W * (gateRight ? 0.12 : 0.82));
  for (let k = 0; k < 70; k++) { const x = cartX - 18 + k; A.px(b, x, floorY - 2, '#6a5a4a'); A.px(b, x, floorY - 1, '#2a2218'); if (k % 9 === 4) A.rect(b, x, floorY - 3, 2, 3, '#3a2814'); }
  for (let y = 0; y < 12; y++) for (let x = 0; x < 28; x++) { // vagonete amassado
    if (y < 2 + Math.floor(Math.abs(x - 14) / 6) || (y > 9 && x % 13 > 2 && x % 13 < 10)) continue;
    const edge = x === 0 || x === 27 || y === 0 || y === 11;
    A.px(b, cartX + x, floorY - 15 + y + (x > 20 ? 2 : 0), edge ? '#1e1812' : y < 3 ? rust[3] : x < 10 ? rust[2] : rust[1]);
  }
  for (const wx of [cartX + 5, cartX + 22]) A.blob(b, wx, floorY - 3, 3, 3, (x, y, d) => (d > 0.5 ? '#1a140f' : '#6a5f55'));
  for (let i = 0; i < 12; i++) A.px(b, cartX + 3 + i * 2, floorY - 16 - (i % 3), steel[(i + 1) % 4]);
  const ribX = Math.round(W * (gateRight ? 0.74 : 0.2));
  for (let q = 0; q < 8; q++) for (let t = 0; t <= 14; t++) { const hh = Math.sin(t / 14 * Math.PI); A.px(b, ribX + q * 7 + hh * 3, floorY - 2 - t * (1.3 - q * 0.04), t < 11 ? '#e8dcc0' : '#cbbd9c'); A.px(b, ribX + q * 7 + hh * 3 + 1, floorY - 2 - t * (1.3 - q * 0.04), 'rgba(110,86,50,.6)'); }
  A.line(b, ribX - 2, floorY - 3, ribX + 58, floorY - 3, '#cfc2a0');
  const skull = ['..##..##..', '..#.##.#..', '.########.', '##dd##dd##', '##dd##dd##', '.########.', '..#.##.#..', '...####...'];
  skull.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.') A.px(b, ribX + 64 + x, floorY - 9 + y, ch === 'd' ? '#2a2016' : y < 3 ? '#efe6cf' : '#d3c7a6'); }));
  for (let i = 0; i < 4; i++) { // picaretas e brocas tortas fincadas na areia
    const tx = Math.round(W * (0.3 + i * 0.13 + rnd() * 0.04)); if (pillars.some((p) => Math.abs(p - tx) < 20)) continue;
    A.line(b, tx, floorY - 1, tx + 3 - i, floorY - 12 - (i % 2) * 4, '#5d4529');
    A.rect(b, tx - 3 + (3 - i), floorY - 15 - (i % 2) * 4, 8, 2, i % 2 ? '#8d9aa6' : '#a8b5bf');
  }
  for (let i = 0; i < 18; i++) { // pedaços de minério soltos
    const ox = Math.round(W * (0.05 + rnd() * 0.9)); if (pillars.some((p) => Math.abs(p - ox) < 18)) continue;
    const s2 = 1 + Math.floor(rnd() * 3); A.rect(b, ox, floorY - s2, s2 + 1, s2, steel[i % 3]); A.px(b, ox, floorY - s2, steel[3]);
  }
  for (let g2 = 0; g2 < 3; g2++) for (let k = 0; k < 40; k++) { const gx = W * 0.45 + g2 * 4 + k * 1.2, gy = floorY - 1 - Math.sin(k / 40 * Math.PI) * 1; A.px(b, gx, gy, 'rgba(90,56,26,.7)'); } // sulcos de investida na areia
  // suportes das tochas: um aro de ferro por baixo de cada chama
  for (const t of lair.torches || []) { const tx = (t[0] - x0) * T, ty = (t[1] - y0) * T; A.rect(b, tx + 4, ty + 10, 8, 2, '#3a2c20'); A.rect(b, tx + 6, ty + 12, 4, 1, '#6e5a46'); }

  return { W, H, back, glyph, glints, holes, shafts: [0.2, 0.55, 0.86].map((f, i) => ({ x: f * W + (rnd() - 0.5) * 20, w: 22 + rnd() * 16, lean: (i % 2 ? 1 : -1) * (30 + rnd() * 30) })), x0, y0, gateRight };
}

const BEETLE_LAIR_LAYERS = new WeakMap();
function drawBeetleLairBackdrop(ctx, g, vx, vy, vw, vh) {
  for (const lair of g.world.beetleLairs || []) {
    const [a, bb, c, d] = lair.bounds;
    if ((c + 1) * T < vx || a * T > vx + vw || (d + 1) * T < vy || bb * T > vy + vh) continue;
    let L = BEETLE_LAIR_LAYERS.get(lair);
    if (!L) {
      if (!lair.torches) { lair.torches = []; for (let y = bb; y <= d; y++) for (let x = a; x <= c; x++) if (g.world.getTile(x, y) === TILE.TORCH) lair.torches.push([x, y]); }
      L = beetleLairLayers(g.world, lair); BEETLE_LAIR_LAYERS.set(lair, L);
    }
    const ox = a * T, oy = bb * T, t = performance.now() / 1000;
    ctx.drawImage(L.back, ox, oy);
    // runas âmbar: respiram devagar (o portão só abre quando o Escavador cair)
    ctx.globalAlpha = 0.28 + 0.3 * (0.5 + 0.5 * Math.sin(t * 1.1)); ctx.drawImage(L.glyph, ox, oy); ctx.globalAlpha = 1;
    // feixes de luz que entram por frestas no teto, com poeira flutuando
    for (let i = 0; i < L.shafts.length; i++) {
      const s = L.shafts[i], gr = ctx.createLinearGradient(0, oy, 0, oy + L.H);
      gr.addColorStop(0, 'rgba(255,226,150,.16)'); gr.addColorStop(0.7, 'rgba(255,226,150,.05)'); gr.addColorStop(1, 'rgba(255,226,150,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(ox + s.x, oy); ctx.lineTo(ox + s.x + s.w, oy); ctx.lineTo(ox + s.x + s.w + s.lean + 28, oy + L.H); ctx.lineTo(ox + s.x + s.lean - 8, oy + L.H); ctx.closePath(); ctx.fill();
      for (let k = 0; k < 5; k++) {
        const life = (t * 0.05 + k * 0.21 + i * 0.13) % 1, px = s.x + s.w * (0.2 + 0.6 * ((k * 0.37 + i * 0.2) % 1)) + s.lean * life + Math.sin(t * 0.8 + k) * 3, py = life * L.H;
        ctx.fillStyle = `rgba(255,236,190,${0.55 * Math.sin(life * Math.PI)})`; ctx.fillRect(Math.round(ox + px), Math.round(oy + py), 1, 1);
      }
    }
    // brilho do minério
    for (let k = 0; k < 5; k++) {
      const gp = L.glints[(Math.floor(t * 1.7) * 7 + k * 13) % Math.max(1, L.glints.length)]; if (!gp) continue;
      const ph = (t * 1.7 + k * 0.37) % 1, al = Math.sin(ph * Math.PI);
      ctx.fillStyle = `rgba(230,246,255,${0.85 * al})`; ctx.fillRect(Math.round(ox + gp[0]), Math.round(oy + gp[1]), 1, 1);
      if (al > 0.5) { ctx.fillStyle = `rgba(190,226,248,${0.6 * al})`; ctx.fillRect(Math.round(ox + gp[0]) - 1, Math.round(oy + gp[1]), 3, 1); ctx.fillRect(Math.round(ox + gp[0]), Math.round(oy + gp[1]) - 1, 1, 3); }
    }
    // areia escorrendo das bocas de túnel e de frestas do teto
    L.holes.forEach(([hx, hy], i) => {
      for (let k = 0; k < 3; k++) {
        const life = (t * 0.6 + i * 0.31 + k * 0.33) % 1, yy = hy + 10 + life * (L.H - hy - 12);
        ctx.fillStyle = `rgba(226,182,106,${0.8 * (1 - life * 0.6)})`; ctx.fillRect(Math.round(ox + hx + (k - 1) * 3), Math.round(oy + yy), 1, 2);
      }
    });
    for (const f of [0.12, 0.43, 0.7, 0.93]) for (let k = 0; k < 2; k++) {
      const life = (t * 0.5 + f * 7 + k * 0.5) % 1;
      ctx.fillStyle = `rgba(214,170,98,${0.7 * (1 - life * 0.5)})`; ctx.fillRect(Math.round(ox + f * L.W), Math.round(oy + 8 + life * (L.H - 10)), 1, 2);
    }
  }
}
