'use strict';
// =====================================================================================
//  ARTE DA VEGETAÇÃO E DOS ITENS DE CHÃO DA SUPERFÍCIE
// =====================================================================================
// Famílias parametrizadas por paleta de bioma: capim, flores, arbustos (com frutinhas, flor ou neve), samambaias,
// taboas, suculentas, cogumelos e os "achados" do chão (pedrinha, graveto, pinha, concha, pena, osso).
// Todo sprite tem 24 px de largura (o encaixe de js/renderer.js desloca 4 px) a menos que `envOx` diga outra
// coisa; a base fica 2 px dentro do chão. js/surface-life.js sorteia o que nasce onde.
// Carrega depois de biomes-art.js.

// Paleta de capim [escuro, médio, claro] e de folhagem (chave de ORGANIC_LEAVES) de cada tipo de solo
const SA_GRASS = {
  forest: [[28, 80, 34], [60, 136, 46], [130, 204, 82]],
  sakura: [[30, 100, 84], [64, 166, 132], [150, 226, 184]],
  jungle: [[14, 72, 42], [32, 126, 58], [98, 198, 94]],
  savanna: [[132, 100, 40], [194, 158, 68], [242, 216, 122]],
  dry: [[124, 94, 52], [178, 144, 78], [230, 198, 130]],
  snow: [[88, 118, 104], [146, 176, 158], [226, 240, 234]],
  swamp: [[32, 56, 30], [74, 104, 42], [142, 166, 74]],
  fungal: [[22, 92, 108], [54, 178, 170], [172, 255, 232]],
  beach: [[120, 130, 62], [176, 180, 96], [226, 222, 150]],
};
const SA_LEAF = { forest: 'oak', sakura: 'willow', jungle: 'jungle', savanna: 'acacia', dry: 'acacia', snow: 'frostBirch', swamp: 'swamp', fungal: 'fungal', beach: 'willow' };
ORGANIC_LEAVES.fungal = [[10, 38, 60], [18, 74, 96], [30, 118, 130], [60, 170, 166], [120, 224, 200], [206, 255, 236]];
ORGANIC_LEAVES.sage = [[40, 58, 52], [70, 94, 80], [108, 132, 110], [150, 172, 146], [190, 208, 180], [222, 232, 206]];
SA_LEAF.mesa = 'sage';
SA_GRASS.mesa = SA_GRASS.dry;

// Pedra de cada solo: [sombra, base, luz] + realce
const SA_STONE = {
  forest: [[58, 58, 66], [118, 116, 122], [182, 180, 184]], dry: [[104, 84, 62], [176, 148, 108], [228, 204, 160]], mesa: [[96, 40, 34], [178, 88, 62], [232, 154, 116]],
  snow: [[78, 90, 108], [150, 164, 182], [230, 238, 246]], swamp: [[36, 44, 36], [84, 98, 74], [140, 154, 112]], fungal: [[42, 38, 76], [98, 88, 150], [180, 168, 232]],
  jungle: [[44, 56, 48], [100, 112, 98], [160, 176, 150]], savanna: [[88, 72, 52], [158, 134, 98], [214, 192, 148]], sakura: [[80, 70, 80], [150, 138, 148], [214, 204, 212]], beach: [[110, 96, 78], [188, 172, 142], [238, 228, 200]],
};

const saSpr = (w, h, outline, paint) => { const s = new Sprite(w, h); paint(s); return s.finish(outline); };
const saMark = (c, kind, flex = 0.8, extra = {}) => Object.assign(c, { envKind: kind, envFlex: flex }, extra);
const saDark = (c, k = 0.45) => [c[0] * k, c[1] * k, c[2] * k];

// lâmina de capim: curva suave que afina; luz à esquerda
function saBlade(s, x, y, h, lean, curl, pal, w = 1.5) {
  for (let i = 0; i <= h; i++) {
    const t = i / h, px = x + lean * t + curl * t * t, py = Math.round(y - i), ww = Math.max(0.5, w * (1 - t * 0.78)), R = Math.ceil(ww);
    for (let dx = -R; dx <= R; dx++) { if (Math.abs(dx) > ww) continue; s.set(Math.round(px + dx), py, dx < 0 ? pal[2] : dx > 0 ? pal[0] : pal[1]); }
  }
  s.set(Math.round(x + lean + curl), Math.round(y - h), pal[2]);
}
function saGrass(biome, v, opts = {}) {
  const pal = SA_GRASS[biome] || SA_GRASS.forest, rnd = mulberry32(7100 + v * 37 + biome.length * 11), W = 24, H = opts.tall ? 30 : 18;
  return saSpr(W, H, saDark(pal[0], 0.55), (s) => {
    const n = (opts.tall ? 6 : 8) + Math.floor(rnd() * 4), seedHeads = opts.seeds;
    for (let i = 0; i < n; i++) {
      const x = 12 + (i / (n - 1) - 0.5) * (opts.tall ? 11 : 15) + (rnd() - 0.5) * 2, h = (opts.tall ? 15 : 6) + rnd() * (opts.tall ? 12 : 8), lean = (x - 12) * (0.3 + rnd() * 0.4), curl = (rnd() - 0.5) * (opts.tall ? 7 : 4);
      saBlade(s, x, H - 2, h, lean, curl, pal, opts.tall ? 1.2 : 1.5);
      if (seedHeads && i % 2 === 0) { const sx = Math.round(x + lean + curl), sy = H - 2 - Math.round(h); for (let k = 0; k < 4; k++) { s.set(sx + (k & 1), sy - 1 - k, pal[2]); s.set(sx + (k & 1 ? -1 : 2), sy - k, pal[1]); } }
    }
  });
}

// Flores: estilo = margarida | papoula | sino | espiga | tulipa | estrela
function saFlower(style, colors, v) {
  const rnd = mulberry32(7300 + v * 53 + style.length * 17), W = 24, H = 22, G = SA_GRASS.forest;
  return saSpr(W, H, [34, 40, 30], (s) => {
    const stems = 2 + Math.floor(rnd() * 2);
    for (let i = 0; i < stems; i++) {
      const x = 12 + (i - (stems - 1) / 2) * 5 + (rnd() - 0.5) * 2, h = 7 + Math.floor(rnd() * 7), sway = (rnd() - 0.5) * 3;
      for (let k = 0; k < h; k++) s.set(Math.round(x + sway * (k / h) ** 2), H - 3 - k, k % 3 === 0 ? G[1] : G[0]);
      saBlade(s, x, H - 3, 4, -2.5 * (i % 2 ? -1 : 1), 0, G, 1);
      const hx = Math.round(x + sway), hy = H - 3 - h, [A, B] = colors;
      if (style === 'margarida') { for (const [dx, dy] of [[0, -2], [2, -1], [2, 1], [0, 2], [-2, 1], [-2, -1], [1, -2], [-1, 2]]) s.set(hx + dx, hy + dy, A); s.set(hx, hy, B); s.set(hx + 1, hy, B); s.set(hx - 1, hy - 1, shade(A, 1.1)); }
      else if (style === 'papoula') { for (const [dx, dy, c] of [[-2, -1, 0], [-1, -2, 0], [0, -2, 0], [1, -2, 0], [2, -1, 0], [-2, 0, 1], [-1, -1, 0], [0, -1, 0], [1, -1, 0], [2, 0, 1], [-1, 0, 1], [0, 0, 1], [1, 0, 1]]) s.set(hx + dx, hy + dy, c ? shade(A, 0.72) : A); s.set(hx, hy - 1, B); s.set(hx - 1, hy - 2, shade(A, 1.2)); }
      else if (style === 'sino') { for (let k = 0; k < 3; k++) { const bx = hx + (k - 1) * 2, by = hy + k % 2 + 1; s.set(bx, by - 1, shade(A, 1.15)); s.set(bx, by, A); s.set(bx, by + 1, shade(A, 0.78)); s.set(bx + (k === 1 ? 0 : (k - 1)), by + 2, B); } }
      else if (style === 'espiga') { for (let k = 0; k < 8; k++) { const yy = hy - 3 + k; s.set(hx, yy, k & 1 ? A : shade(A, 0.8)); if (k % 2 === 0 && k < 7) { s.set(hx - 1, yy, shade(A, 1.12)); s.set(hx + 1, yy, shade(A, 0.7)); } } s.set(hx, hy - 4, B); }
      else if (style === 'tulipa') { for (const [dx, dy] of [[-1, 0], [0, 0], [1, 0], [-1, -1], [0, -1], [1, -1], [-1, -2], [1, -2], [0, -3]]) s.set(hx + dx, hy + dy, dx < 0 ? shade(A, 1.15) : dx > 0 ? shade(A, 0.78) : A); s.set(hx, hy + 1, B); }
      else { for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k * 1.2566; s.set(hx + Math.round(Math.cos(a) * 2), hy + Math.round(Math.sin(a) * 2), k & 1 ? A : shade(A, 1.12)); s.set(hx + Math.round(Math.cos(a)), hy + Math.round(Math.sin(a)), A); } s.set(hx, hy, B); }
    }
  });
}

// Arbusto folhoso: massa de bolas sombreadas + folhinhas na borda; extras = frutinhas, flores ou neve
function saBush(biome, v, opts = {}) {
  const pal = ORGANIC_LEAVES[opts.leaf || SA_LEAF[biome]] || ORGANIC_LEAVES.oak, rnd = mulberry32(7500 + v * 61 + biome.length * 13), W = 40, H = opts.tall ? 32 : 27;
  const out = saSpr(W, H, saDark(pal[0], 0.7), (s) => {
    const blobs = Array.from({ length: opts.tall ? 7 : 6 }, (_, i) => ({ x: 8 + i * (W - 16) / (opts.tall ? 6 : 5) + (rnd() - 0.5) * 3, y: H - 8 - rnd() * (opts.tall ? 12 : 9) - (i % 2 ? 2 : 0), r: 4.6 + rnd() * 4.2 }));
    for (const b of blobs) shadeBall(s, b.x, b.y, b.r * 1.15, b.r, (l, dx, dy) => pal[clamp(Math.floor(l * 3.2 + 1 + (hash2(Math.round(dx * 9), Math.round(dy * 9), v) - 0.5) * 1.1), 0, 4)]);
    for (let i = 0; i < 46; i++) {                                                  // folhinhas desenhando a borda e o miolo
      const b = blobs[Math.floor(rnd() * blobs.length)], a = rnd() * Math.PI * 2, d = b.r * (0.4 + rnd() * 0.75);
      const px = b.x + Math.cos(a) * d * 1.1, py = b.y + Math.sin(a) * d;
      if (py > H - 3) continue;
      treeLeaf(s, px, py, a * 0.6 - 0.9 + (rnd() - 0.5), 3.2 + rnd() * 2, 1.4, pal, clamp(2 + Math.round(-Math.sin(a) * 1.4) + (rnd() < 0.3 ? 1 : 0), 1, 4));
    }
    for (const col of opts.dots || []) for (let i = 0; i < (opts.dotCount || 9); i++) {   // frutinhas ou flores
      const b = blobs[Math.floor(rnd() * blobs.length)], a = rnd() * Math.PI * 2, d = b.r * (0.2 + rnd() * 0.7), x = Math.round(b.x + Math.cos(a) * d * 1.1), y = Math.round(b.y + Math.sin(a) * d * 0.9);
      if (y > H - 4) continue;
      if (opts.flower) { s.set(x, y, col); s.set(x + 1, y, shade(col, 1.15)); s.set(x, y - 1, shade(col, 1.15)); s.set(x - 1, y, shade(col, 0.82)); }
      else { s.set(x, y, shade(col, 0.7)); s.set(x + 1, y, col); s.set(x, y + 1, col); s.set(x + 1, y + 1, shade(col, 0.82)); s.set(x, y, shade(col, 1.25)); }
    }
    if (opts.snow) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (s.opaque(x, y) && !s.opaque(x, y - 1) && !s.opaque(x, y - 2) && hash2(x, y, v) < 0.9) { s.set(x, y, [244, 250, 252]); if (hash2(x, y, v + 3) < 0.55) s.set(x, y + 1, [186, 210, 226]); }
  });
  return out;
}
// Moita lenhosa do deserto/mesa: galhos que se ramificam para cima, tufos de folhas finas na ponta e flores
// pal = [sombra, base, luz, brilho] das folhas; flowers = cores das florzinhas (ou null)
function saWoodyShrub(v, pal, flowers, opts = {}) {
  const rnd = mulberry32(8200 + v * 37 + (opts.salt || 0)), W = 40, H = 28, wood = [[56, 36, 24], [104, 70, 44], [150, 108, 68]];
  return saSpr(W, H, saDark(pal[0], 0.5), (s) => {
    const tips = [];
    const grow = (x, y, a, len, depth) => {
      for (let i = 0; i < len; i++) {
        s.set(Math.round(x), Math.round(y), i % 3 === 0 ? wood[2] : wood[1]); s.set(Math.round(x) + 1, Math.round(y), wood[0]);
        a += (rnd() - 0.5) * 0.35; x += Math.cos(a) * 0.9; y += Math.sin(a) * 0.9;
        if (depth < 2 && i > 3 && i % 4 === 0 && rnd() < 0.7) grow(x, y, a + (rnd() < 0.5 ? -1 : 1) * (0.5 + rnd() * 0.5), len * 0.55, depth + 1);
      }
      tips.push([x, y, a]);
    };
    const stems = 4 + Math.floor(rnd() * 3);
    for (let k = 0; k < stems; k++) grow(20 + (k - stems / 2) * 2.4, H - 2, -Math.PI / 2 + (k - (stems - 1) / 2) * 0.32 + (rnd() - 0.5) * 0.2, 11 + rnd() * 6, 0);
    for (const [x, y, a] of tips) {                                             // tufo de folhas finas em leque
      for (let i = 0; i < 9; i++) {
        const la = a + (rnd() - 0.5) * 2.6, ll = 3 + rnd() * 3.2, lx = x + Math.cos(la) * ll, ly = y + Math.sin(la) * ll - 0.6;
        treePixelLine(s, x, y, lx, ly, pal[1 + (i % 2)]); s.set(Math.round(lx), Math.round(ly), pal[3]);
        if (i % 3 === 0) s.set(Math.round((x + lx) / 2), Math.round((y + ly) / 2) + 1, pal[0]);
      }
      if (flowers && rnd() < 0.8) { const c = flowers[Math.floor(rnd() * flowers.length)]; s.set(Math.round(x), Math.round(y) - 2, c); s.set(Math.round(x) + 1, Math.round(y) - 2, shade(c, 1.15)); s.set(Math.round(x), Math.round(y) - 3, shade(c, 1.2)); s.set(Math.round(x) - 1, Math.round(y) - 2, shade(c, 0.8)); }
    }
  });
}
// Galhos secos sem folha (arbusto de inverno, moita seca, bola de mato rolante)
function saTwigs(color, v, opts = {}) {
  const rnd = mulberry32(7700 + v * 41), W = 40, H = 20, dark = saDark(color, 0.55), light = shade(color, 1.35);
  return saSpr(W, H, saDark(color, 0.35), (s) => {
    if (opts.ball) {                                                                // tufo redondo, emaranhado
      for (let i = 0; i < 90; i++) { const a = rnd() * Math.PI * 2, r = 4 + rnd() * 5.5, x = 20 + Math.cos(a) * r * 1.2, y = 10 + Math.sin(a) * r * 0.9, l = 3 + rnd() * 5, b = a + 1.2 + rnd(); treePixelLine(s, x, y, x + Math.cos(b) * l, y + Math.sin(b) * l * 0.8, rnd() < 0.5 ? color : rnd() < 0.5 ? dark : light); }
      return;
    }
    for (let k = 0; k < 7; k++) {
      let x = 20 + (k - 3) * 3, y = H - 2, a = -Math.PI / 2 + (k - 3) * 0.28;
      for (let i = 0, n = 8 + Math.floor(rnd() * 8); i < n; i++) {
        s.set(Math.round(x), Math.round(y), i < 3 ? dark : i % 3 === 0 ? light : color);
        a += (rnd() - 0.5) * 0.5; x += Math.cos(a) * 1.1; y += Math.sin(a) * 1.1;
        if (i > 2 && rnd() < 0.3) { const b = a + (rnd() < 0.5 ? -0.8 : 0.8); for (let j = 1; j < 4; j++) s.set(Math.round(x + Math.cos(b) * j), Math.round(y + Math.sin(b) * j), color); }
      }
    }
    if (opts.snow) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (s.opaque(x, y) && !s.opaque(x, y - 1) && hash2(x, y, v) < 0.5) s.set(x, y - 1, [240, 247, 250]);
  });
}
// Samambaia: folhas arqueadas com pinas dos dois lados
function saFern(biome, v, size = 1) {
  const pal = ORGANIC_LEAVES[SA_LEAF[biome]] || ORGANIC_LEAVES.jungle, rnd = mulberry32(7900 + v * 29 + biome.length), W = 40, H = Math.round(22 + size * 10);
  return saSpr(W, H, saDark(pal[0], 0.6), (s) => {
    const fronds = 5 + Math.floor(rnd() * 3);
    for (let f = 0; f < fronds; f++) {
      const ang = -Math.PI / 2 + (f / (fronds - 1) - 0.5) * 2.5, len = (15 + rnd() * 7) * size, bend = (f / (fronds - 1) - 0.5) * 2.2 + (rnd() - 0.5) * 0.4;
      let x = 20, y = H - 2, a = ang;
      const pts = [];
      for (let i = 0; i <= len; i++) { pts.push([x, y, a]); a += bend * 0.07; x += Math.cos(a); y += Math.sin(a); if (y > H - 1) break; }
      pts.forEach(([px, py], i) => s.set(Math.round(px), Math.round(py), i < 3 ? pal[0] : pal[2]));
      pts.forEach(([px, py, pa], i) => {
        if (i < 3 || i % 3) return;
        const t = i / len, l = (1 - Math.abs(t - 0.45) * 1.1) * 5.2 * size + 1;
        for (const sd of [-1, 1]) treeLeaf(s, px, py, pa + sd * (1.1 - t * 0.25), l, 1.2, pal, clamp(2 + (sd < 0 ? 1 : 0) + (t > 0.6 ? 1 : 0), 1, 4));
      });
    }
  });
}
// Taboa / junco: hastes altas com espiga marrom
function saCattail(biome, v) {
  const G = SA_GRASS[biome] || SA_GRASS.swamp, rnd = mulberry32(8100 + v * 23), W = 24, H = 38;
  return saSpr(W, H, [30, 34, 20], (s) => {
    for (let i = 0; i < 7; i++) saBlade(s, 12 + (i - 3) * 2.2, H - 2, 12 + rnd() * 12, (i - 3) * 1.4, (rnd() - 0.5) * 5, G, 1.2);
    for (let i = 0; i < 3; i++) {
      const x = 8 + i * 4 + rnd() * 2, h = 18 + Math.floor(rnd() * 14), lean = (i - 1) * 1.6;
      for (let k = 0; k < h; k++) s.set(Math.round(x + lean * (k / h) ** 1.5), H - 2 - k, k % 4 === 0 ? G[1] : G[0]);
      const hx = Math.round(x + lean), hy = H - 2 - h;
      for (let k = 0; k < 6; k++) { s.set(hx, hy - k, k === 5 ? [90, 60, 36] : [112, 76, 44]); s.set(hx + 1, hy - k, [150, 104, 60]); s.set(hx - 1, hy - k, [74, 48, 30]); }
      s.set(hx, hy - 6, [196, 170, 120]); s.set(hx, hy - 7, [196, 170, 120]);
    }
  });
}
// Suculentas: agave (roseta de lâminas), cacto-barril redondo com flor, babosa com espiga laranja
function saSucculent(style, v) {
  const rnd = mulberry32(8300 + v * 19 + style.length * 5), W = 40, H = style === 'agave' ? 36 : 30;
  const P = style === 'agave' ? [[28, 62, 58], [64, 110, 98], [118, 160, 138], [182, 206, 176]] : style === 'babosa' ? [[30, 82, 44], [58, 136, 62], [112, 190, 92], [176, 226, 138]] : [[34, 84, 52], [66, 140, 78], [118, 192, 108], [176, 226, 144]];
  return saSpr(W, H, saDark(P[0], 0.55), (s) => {
    if (style === 'barril') {
      const r = 6.5 + rnd() * 2.2, cy = H - 2 - r;
      shadeBall(s, 20, cy, r * 1.05, r, (l, dx) => { const rib = Math.abs(Math.sin(dx * 5.2)) < 0.2; return P[clamp(Math.floor(l * 3 + (rib ? -0.9 : 0.3)), 0, 3)]; });
      for (let i = -3; i <= 3; i++) for (let j = -2; j <= 1; j++) if ((i + j) % 2 === 0 && Math.hypot(i / 3.2, j / 2.6) < 1) s.set(Math.round(20 + i * 1.7), Math.round(cy + j * 2.3), [248, 232, 160]);
      const fy = Math.round(cy - r), fc = [[236, 92, 130], [255, 214, 90], [255, 140, 70]][v % 3];
      for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [-1, -1], [1, -1]]) s.set(20 + dx, fy + dy, fc);
      s.set(20, fy - 1, [255, 244, 190]);
      return;
    }
    const n = style === 'agave' ? 10 : 8;
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n, a = -Math.PI + t * Math.PI + (rnd() - 0.5) * 0.15, len = (style === 'agave' ? 16 : 9) + rnd() * 4 - Math.abs(t - 0.5) * 6;
      const ex = 20 + Math.cos(a) * len * 0.95, ey = H - 3 + Math.sin(a) * len * 1.05;
      for (let k = 0; k <= len; k++) {
        const u = k / len, x = 20 + Math.cos(a) * k * 0.95, y = H - 3 + Math.sin(a) * k * 1.05 - Math.sin(u * Math.PI) * 0.8, ww = (1 - u) * (style === 'agave' ? 2.9 : 2.6) + 0.4;
        for (let dx = -Math.ceil(ww); dx <= Math.ceil(ww); dx++) { if (Math.abs(dx) > ww) continue; s.set(Math.round(x + dx), Math.round(y), dx < 0 ? P[2] : dx > 0 ? P[0] : P[1]); }
        if (style === 'babosa' && k > 2 && k % 3 === 0) { s.set(Math.round(x + ww + 1), Math.round(y), P[3]); s.set(Math.round(x - ww - 1), Math.round(y), P[3]); }
        if (style === 'agave' && k % 4 === 2) s.set(Math.round(x + (a < -1.57 ? 2 : -2)), Math.round(y), [230, 220, 190]);
      }
      s.set(Math.round(ex), Math.round(ey), P[3]);
    }
    if (style === 'babosa') {
      for (let k = 0; k < 14; k++) s.set(20, H - 8 - k, [96, 120, 60]);
      for (let k = 0; k < 7; k++) { s.set(19, H - 15 - k, k & 1 ? [255, 140, 52] : [236, 96, 40]); s.set(21, H - 15 - k + 1, k & 1 ? [255, 190, 80] : [255, 140, 52]); s.set(20, H - 15 - k, [255, 210, 120]); }
    }
  });
}

// Cogumelos pequenos: campo (marrom/creme), amanita (vermelha) e luminosos do bosque
function saMushroom(style, v) {
  const rnd = mulberry32(8500 + v * 31 + style.length * 7), W = 24, H = 16;
  const cap = style === 'amanita' ? [[96, 20, 30], [168, 36, 44], [226, 70, 64], [250, 132, 112]] : style === 'brilho' ? [[22, 86, 120], [34, 150, 168], [92, 220, 200], [196, 255, 238]] : style === 'roxo' ? [[46, 26, 96], [88, 52, 156], [142, 98, 212], [206, 170, 255]] : [[84, 56, 36], [138, 98, 62], [190, 148, 100], [232, 204, 162]];
  const stem = style === 'brilho' || style === 'roxo' ? [[120, 140, 160], [196, 214, 226], [240, 250, 252]] : [[148, 128, 104], [214, 196, 168], [250, 240, 218]];
  return saSpr(W, H, saDark(cap[0], 0.5), (s) => {
    const n = 1 + Math.floor(rnd() * 3);
    for (let i = 0; i < n; i++) {
      const x = 12 + (i - (n - 1) / 2) * 7 + (rnd() - 0.5) * 2, h = 3 + Math.floor(rnd() * 3) + (i === 0 ? 2 : 0), r = (i === 0 ? 4.2 : 3) + rnd() * 0.8, by = H - 3;
      for (let k = 0; k < h; k++) { s.set(Math.round(x), by - k, stem[2]); s.set(Math.round(x) + 1, by - k, stem[0]); s.set(Math.round(x) - 1, by - k, stem[1]); }
      shadeBall(s, x, by - h - r * 0.35, r * 1.3, r * 0.85, (l, dx, dy) => (dy > 0.35 ? cap[0] : cap[clamp(Math.floor(l * 3.4 + 0.3), 0, 3)]));
      if (style === 'amanita') for (const [dx, dy] of [[-2, -1], [1, -2], [2, 0]]) s.set(Math.round(x + dx * r * 0.4), Math.round(by - h - r * 0.35 + dy * r * 0.4), [252, 244, 232]);
      if (style === 'brilho' || style === 'roxo') s.set(Math.round(x - r * 0.4), Math.round(by - h - r * 0.6), [255, 255, 255]);
    }
  });
}

// ---------------------------------------------------------------- achados do chão (botão direito)
function saPebbles(biome, v) {
  const P = SA_STONE[biome] || SA_STONE.forest, rnd = mulberry32(8700 + v * 47 + biome.length), W = 24, H = 12;
  return saSpr(W, H, saDark(P[0], 0.55), (s) => {
    const n = 1 + (v % 3);
    for (let i = 0; i < n; i++) {
      const rx = 3.6 + rnd() * 2.2, ry = rx * (0.62 + rnd() * 0.2), x = [12, 7, 17, 12][i] + (rnd() - 0.5) * 2, y = H - 2 - ry * 0.75;
      shadeBall(s, x, y, rx, ry, (l, dx, dy) => (dy > 0.55 ? P[0] : P[clamp(Math.floor(l * 2.9 + 0.35), 0, 2)]));
      s.set(Math.round(x - rx * 0.4), Math.round(y - ry * 0.5), shade(P[2], 1.12));
      if (biome === 'fungal' && i === 0) s.set(Math.round(x + 1), Math.round(y), [170, 255, 230]);
      if (biome === 'snow') for (let k = -1; k <= 1; k++) s.set(Math.round(x + k), Math.round(y - ry), [246, 250, 252]);
    }
  });
}
function saStick(v) {
  const rnd = mulberry32(8800 + v * 13), W = 24, H = 9;
  return saSpr(W, H, [40, 28, 18], (s) => {
    const a = (rnd() - 0.5) * 0.4, len = 15 + rnd() * 4, cx = 12;
    for (let i = 0; i <= len; i++) { const x = cx - len / 2 + i, y = H - 3 + (i - len / 2) * a * 0.4; s.set(Math.round(x), Math.round(y), i % 4 === 0 ? [110, 78, 48] : [152, 112, 70]); s.set(Math.round(x), Math.round(y) - 1, [190, 150, 98]); }
    for (let i = 0; i <= 8; i++) { const x = cx - 3 + i * 0.9, y = H - 4 - i * 0.3; s.set(Math.round(x), Math.round(y), [122, 88, 54]); }
    s.set(cx + 2, H - 6, [152, 112, 70]); s.set(cx + 3, H - 7, [152, 112, 70]);
  });
}
function saPinecone(v) {
  const W = 24, H = 12;
  return saSpr(W, H, [40, 24, 16], (s) => {
    const cx = 12, tilt = v % 2 ? 1 : -1;
    shadeBall(s, cx, H - 5, 3.2, 4.4, (l) => [[96, 56, 30], [140, 88, 48], [184, 124, 70], [220, 164, 98]][clamp(Math.floor(l * 3.6), 0, 3)]);
    for (let r = 0; r < 4; r++) for (let c = -2; c <= 2; c++) if ((c + r) % 2 === 0) { const x = cx + c * 1.2 - (r & 1) * 0.5, y = H - 8 + r * 2; s.set(Math.round(x), Math.round(y), [70, 40, 22]); s.set(Math.round(x), Math.round(y) - 1, [196, 140, 82]); }
    s.set(cx + tilt, H - 10, [110, 80, 40]);
    for (let k = 0; k < 3; k++) s.set(cx + 4 + k, H - 3, [84, 120, 56]);    // agulha de pinho
  });
}
function saShell(v) {
  const W = 24, H = 13;
  return saSpr(W, H, [66, 44, 52], (s) => {
    const cx = 12, pal = v % 2 ? [[150, 96, 96], [226, 150, 146], [252, 208, 196], [255, 240, 226]] : [[140, 126, 112], [210, 194, 170], [244, 232, 208], [255, 250, 240]];
    shadeBall(s, cx, H - 5.5, 6.4, 4.6, (l, dx, dy) => { const rib = Math.sin(dx * 9 + 1) > 0.35; return pal[clamp(Math.floor(l * 3.2 + (rib ? -0.7 : 0.3)), 0, 3)]; });
    for (let k = -4; k <= 4; k++) s.set(cx + k, H - 2, pal[0]);
    s.set(cx - 1, H - 9, pal[3]);
  });
}
function saFeather(v) {
  const W = 24, H = 12, col = [[88, 72, 60], [160, 134, 104], [214, 192, 156], [244, 232, 208]];
  return saSpr(W, H, [48, 38, 30], (s) => {
    for (let i = 0; i <= 12; i++) {
      const x = 4 + i * 1.3, y = H - 3 - Math.sin(i / 12 * Math.PI) * 3.5, w = (1 - Math.abs(i - 5) / 8) * 2.2;
      s.set(Math.round(x), Math.round(y), col[1]);
      for (let k = 1; k <= w; k++) { s.set(Math.round(x), Math.round(y) - k, col[2 + (i % 2 ? 0 : 1) - (k > 1 ? 1 : 0)]); s.set(Math.round(x), Math.round(y) + k, col[v % 2 ? 0 : 1]); }
    }
    for (let i = 0; i < 4; i++) s.set(3 + i, H - 3 + (i >> 1), col[0]);
  });
}
function saBone(v) {
  const W = 24, H = 10;
  return saSpr(W, H, [70, 58, 44], (s) => {
    const x0 = 4 + (v & 1), x1 = 19 - (v & 1), y = H - 4;
    for (let x = x0; x <= x1; x++) { s.set(x, y, [234, 224, 196]); s.set(x, y + 1, [182, 168, 138]); }
    for (const [cx, sd] of [[x0, -1], [x1, 1]]) { for (const [dx, dy] of [[0, -1], [sd, -1], [0, 2], [sd, 2], [sd, 0], [sd, 1]]) s.set(cx + dx, y + dy, dy > 0 ? [182, 168, 138] : [248, 240, 216]); }
  });
}

function saStarfish(v) {
  const W = 24, H = 12, pal = [[150, 54, 30], [214, 96, 52], [250, 150, 84], [255, 214, 150]];
  return saSpr(W, H, [84, 30, 20], (s) => {
    const cx = 12, cy = H - 5.5, rot = v * 0.35;
    for (let k = 0; k < 5; k++) {
      const a = -Math.PI / 2 + rot + k * 1.2566;
      for (let i = 0; i <= 6; i++) { const w = (1 - i / 7) * 1.9 + 0.4, x = cx + Math.cos(a) * i * 0.95, y = cy + Math.sin(a) * i * 0.58; for (let dx = -Math.ceil(w); dx <= Math.ceil(w); dx++) if (Math.abs(dx) <= w) s.set(Math.round(x + dx), Math.round(y), i < 4 ? (dx < 0 ? pal[2] : pal[1]) : pal[1]); if (i % 2 === 1) s.set(Math.round(x), Math.round(y), pal[3]); }
    }
    s.set(cx, Math.round(cy), pal[3]);
  });
}

// ---------------------------------------------------------------- brotos e plantas luminosas do bosque
function saSporePod(v) {
  const rnd = mulberry32(8900 + v * 17), W = 24, H = 28;
  return saSpr(W, H, [18, 40, 60], (s) => {
    for (let i = 0; i < 3; i++) {
      const x = 7 + i * 5 + (rnd() - 0.5) * 2, h = 8 + Math.floor(rnd() * 12), lean = (i - 1) * 2;
      for (let k = 0; k < h; k++) s.set(Math.round(x + lean * (k / h) ** 2), H - 2 - k, k % 3 ? [44, 150, 150] : [26, 100, 120]);
      const bx = Math.round(x + lean), by = H - 2 - h;
      shadeBall(s, bx, by - 2, 2.6, 2.8, (l) => [[40, 80, 150], [70, 140, 220], [140, 220, 255], [230, 255, 255]][clamp(Math.floor(l * 3.6), 0, 3)]);
      for (let k = 0; k < 3; k++) s.set(bx - 3 + k * 3, by - 5 - (k & 1), [190, 255, 240]);
    }
  });
}

// ---------------------------------------------------------------- tabela de famílias
const SURFACE_SPRITE = {
  grass: (b, v) => saGrass(b, v),
  tall: (b, v) => saGrass(b, v, { tall: true, seeds: b === 'savanna' || b === 'dry' || b === 'beach' }),
  fern: (b, v) => saFern(b, v, b === 'jungle' ? 1.5 : 1.15),
  cattail: (b, v) => saCattail(b, v),
  bush: (b, v) => saBush(b, v),
  berry: (b, v) => saBush(b, v, { dots: [[220, 44, 60]], dotCount: 11 }),
  blueberry: (b, v) => saBush(b, v, { dots: [[70, 92, 210]], dotCount: 11 }),
  blossomBush: (b, v) => saBush(b, v, { dots: [b === 'sakura' ? [248, 160, 196] : [255, 214, 92]], dotCount: 14, flower: true }),
  hydrangea: (b, v) => saBush(b, v, { leaf: 'blossom', dots: [[204, 150, 250], [150, 190, 255]], dotCount: 16, flower: true }),
  holly: (b, v) => saBush(b, v, { leaf: 'maple', dots: [[216, 40, 52]], dotCount: 9, snow: true }),
  frostBush: (b, v) => saBush(b, v, { snow: true }),
  thorn: (b, v) => saBush(b, v, { tall: false }),
  sage: (b, v) => saWoodyShrub(v, [[52, 72, 30], [96, 122, 44], [150, 164, 66], [206, 200, 108]], [[255, 214, 70], [255, 236, 130]], { salt: 1 }),
  redShrub: (b, v) => saWoodyShrub(v, [[70, 54, 24], [124, 104, 40], [178, 156, 62], [226, 200, 104]], [[232, 70, 60], [255, 140, 70], [250, 98, 90]], { salt: 2 }),
  twigs: (b, v) => saTwigs(b === 'snow' ? [134, 120, 108] : [150, 112, 72], v, { snow: b === 'snow' }),
  tumble: (b, v) => saTwigs([170, 132, 84], v, { ball: true }),
  agave: (b, v) => saSucculent('agave', v),
  barril: (b, v) => saSucculent('barril', v),
  babosa: (b, v) => saSucculent('babosa', v),
  shroom: (b, v) => saMushroom('campo', v),
  glow: (b, v) => saMushroom('brilho', v),
  violet: (b, v) => saMushroom('roxo', v),
  pods: (b, v) => saSporePod(v),
  pebble: (b, v) => saPebbles(b, v),
  stick: (b, v) => saStick(v),
  pinecone: (b, v) => saPinecone(v),
  shell: (b, v) => saShell(v),
  feather: (b, v) => saFeather(v),
  bone: (b, v) => saBone(v),
  starfish: (b, v) => saStarfish(v),
};
const SURFACE_FLOWERS = {
  daisy: ['margarida', [[250, 250, 244], [255, 214, 70]]], poppy: ['papoula', [[226, 44, 48], [40, 28, 34]]], bluebell: ['sino', [[96, 120, 232], [180, 196, 255]]],
  buttercup: ['estrela', [[255, 214, 56], [255, 244, 160]]], lavender: ['espiga', [[150, 104, 220], [210, 180, 255]]], tulip: ['tulipa', [[240, 96, 140], [255, 216, 90]]],
  pinkStar: ['estrela', [[255, 150, 196], [255, 236, 120]]], orange: ['papoula', [[255, 140, 40], [60, 34, 20]]], snowdrop: ['sino', [[250, 252, 255], [160, 214, 190]]],
  orchid: ['estrela', [[226, 110, 230], [255, 238, 150]]], heliconia: ['tulipa', [[255, 84, 52], [255, 214, 60]]], violet: ['sino', [[190, 120, 255], [120, 255, 226]]],
  marigold: ['margarida', [[255, 170, 40], [150, 70, 20]]], iris: ['tulipa', [[130, 90, 214], [255, 226, 110]]],
};
const surfaceSpriteCache = new Map();
// kind: família ou 'flower:<tipo>'; biome: chave de SA_GRASS; v: variação (0-3)
function surfaceSprite(kind, biome, v) {
  const key = kind + ':' + biome + ':' + v;
  let c = surfaceSpriteCache.get(key);
  if (c) return c;
  if (kind.startsWith('flower:')) { const [style, colors] = SURFACE_FLOWERS[kind.slice(7)]; c = saFlower(style, colors, v); saMark(c, 'sFlower', 0.9); }
  else {
    c = SURFACE_SPRITE[kind](biome, v);
    const FLEX = { grass: 1, tall: 1.1, fern: 0.8, cattail: 0.9, bush: 0.35, berry: 0.3, blueberry: 0.3, blossomBush: 0.3, hydrangea: 0.3, holly: 0.25, frostBush: 0.25, thorn: 0.25, sage: 0.25, redShrub: 0.3, twigs: 0.3, tumble: 0.2, agave: 0, barril: 0, babosa: 0.2, shroom: 0, amanita: 0, glow: 0, violet: 0, pods: 0.5 };
    saMark(c, 's' + kind[0].toUpperCase() + kind.slice(1), FLEX[kind] ?? 0);
    if (kind === 'glow') c.envGlow = [90, 230, 210]; else if (kind === 'violet') c.envGlow = [170, 130, 255]; else if (kind === 'pods') c.envGlow = [120, 220, 255];
    if (['pebble', 'stick', 'pinecone', 'shell', 'starfish', 'feather', 'bone', 'shroom'].includes(kind)) c.envPickup = true;
  }
  if (c.width !== 24) c.envOx = (c.width - 16) / 2;   // o renderer centra o sprite no bloco: 24 px usa o padrão (4), 40 px recua 12
  surfaceSpriteCache.set(key, c);
  return c;
}
