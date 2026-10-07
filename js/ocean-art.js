'use strict';
// =====================================================================================
//  ARTE DO OCEANO: água tropical, recife de coral, luz que atravessa o mar e o navio afundado
// =====================================================================================
// Tudo aqui é visual (nada entra no mapa nem no save): o recife é sorteado por coluna a partir da semente
// do mundo, então é sempre o mesmo lugar. Carrega depois de water.js, renderer.js e environment.js e
// se pendura nas funções de desenho do jogo (drawAquaticFlora, drawWater, drawEnvironmentAccents).
//   1. WATER_SHADES.ocean: da água clara e turquesa da praia ao azul fundo
//   2. drawOceanReef: corais, anêmonas, mariscos e capim-marinho no fundo + cáusticas de luz + o navio (velas, bandeira, âncora)
//   3. drawOceanAccents (depois da luz): feixes de sol, plâncton que brilha, brilho dos bichos do fundo, espuma na praia

// Sorteio próprio, estável: não depende de quem carregou hash2 por último
const oaHash = (x, y, s = 0) => { let h = (Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 2147483647)) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const oaSea = (world) => world.seaLevel;
const oaOcean = (world, x) => world.biomeAt(x) === BIOME.OCEAN;

// ------------------------------------------------------------------ 1. cor da água
// Profundidade em células de água: turquesa e transparente perto da superfície, azul-safira no meio e quase marinho no fundo
{
  const stops = [[0, [88, 228, 214], 0.28], [3, [64, 204, 218], 0.32], [8, [38, 160, 222], 0.42], [16, [30, 124, 208], 0.5], [26, [20, 88, 172], 0.58], [31, [14, 66, 142], 0.62]];
  const at = (d) => {
    for (let i = 1; i < stops.length; i++) if (d <= stops[i][0]) {
      const [d0, c0, a0] = stops[i - 1], [d1, c1, a1] = stops[i], k = (d - d0) / (d1 - d0);
      return [c0.map((v, j) => Math.round(lerp(v, c1[j], k))), lerp(a0, a1, k)];
    }
    return [stops[stops.length - 1][1], stops[stops.length - 1][2]];
  };
  for (let d = 0; d < 32; d++) { const [c, a] = at(d); WATER_SHADES.ocean[d] = `rgba(${c.join(',')},${a.toFixed(3)})`; }
}

// Tela embaixo d'água: turquesa clara perto da superfície, azul funda lá embaixo
function drawUnderwaterTint(ctx, game, W, H) {
  if (!game.player.underwater) return;
  const depth = clamp((game.player.cy / T - game.world.seaLevel) / 30, 0, 1), k = depth;
  ctx.fillStyle = `rgba(${Math.round(lerp(36, 12, k))},${Math.round(lerp(176, 56, k))},${Math.round(lerp(196, 132, k))},${lerp(0.1, 0.26, k).toFixed(3)})`;
  ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.72);
  g.addColorStop(0, 'rgba(6,28,64,0)'); g.addColorStop(1, `rgba(6,26,66,${lerp(0.2, 0.42, k).toFixed(3)})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

// ------------------------------------------------------------------ 2. recife
const OA_CORAL = {
  pink:   [[112, 36, 84], [172, 62, 122], [232, 106, 162], [255, 170, 208]],
  orange: [[138, 54, 24], [204, 96, 40], [250, 150, 62], [255, 210, 126]],
  purple: [[60, 38, 118], [108, 68, 178], [160, 120, 230], [214, 184, 255]],
  teal:   [[16, 82, 96], [30, 138, 150], [62, 200, 196], [164, 242, 226]],
  yellow: [[146, 106, 18], [212, 168, 38], [250, 216, 78], [255, 246, 164]],
  red:    [[106, 22, 36], [168, 38, 52], [226, 74, 80], [255, 138, 130]],
  blue:   [[24, 52, 128], [40, 94, 204], [84, 156, 248], [170, 214, 255]],
};
const OA_KEYS = Object.keys(OA_CORAL);
const oaPick = (pal, l) => pal[clamp(Math.floor(l * 3.4 + 0.5), 0, 3)];
const oaDark = (c, k = 0.45) => c.map((v) => Math.round(v * k));

function oaLine(s, x0, y0, x1, y1, wd, col) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1), o = Math.floor(wd / 2);
  for (let i = 0; i <= n; i++) for (let a = 0; a < wd; a++) for (let b = 0; b < wd; b++) s.set(Math.round(x0 + (x1 - x0) * i / n) - o + a, Math.round(y0 + (y1 - y0) * i / n) - o + b, col);
}
const OA_ART = {
  // Coral-chifre-de-veado: galhos que se bifurcam para cima com pontas claras
  branch(pal, v) {
    const rnd = mulberry32(900 + v * 17), s = new Sprite(30, 32), tips = [];
    const grow = (x, y, a, len, wd, depth) => {
      const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
      oaLine(s, x, y, x2, y2, wd, pal[1]); oaLine(s, x - 1, y, x2 - 1, y2, 1, pal[2]);
      if (depth === 0 || len < 4) { tips.push([x2, y2]); return; }
      grow(x2, y2, a + rnd() * 0.5 - 0.7, len * 0.78, Math.max(1, wd - (depth % 2)), depth - 1);
      grow(x2, y2, a + rnd() * 0.5 + 0.2, len * 0.74, Math.max(1, wd - 1), depth - 1);
      if (rnd() < 0.5) grow(x2, y2, -Math.PI / 2 + (rnd() - 0.5) * 0.4, len * 0.6, 1, depth - 1);
    };
    for (let k = 0; k < 3; k++) grow(10 + k * 5, 31, -Math.PI / 2 + (k - 1) * 0.32, 8 + rnd() * 3, 3, 3);
    for (const [x, y] of tips) { s.set(x, y, pal[3]); s.set(x, y - 1, pal[3]); s.set(x + 1, y, pal[2]); }
    return s.finish(oaDark(pal[0], 0.55));
  },
  // Coral-tubo: varios canudos de alturas diferentes, com a boca escura
  tube(pal, v) {
    const rnd = mulberry32(1100 + v * 13), s = new Sprite(26, 26);
    const n = 4 + Math.floor(rnd() * 3);
    for (let i = 0; i < n; i++) {
      const cx = 4 + i * (18 / (n - 1)) + (rnd() - 0.5) * 2, h = 9 + Math.floor(rnd() * 13), w = 4 + (rnd() < 0.4 ? 1 : 0);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const lx = x / (w - 1), l = 0.82 - lx * 0.75 + (y % 5 === 0 ? -0.12 : 0);
        s.set(Math.round(cx) + x - 2, 25 - y, oaPick(pal, l));
      }
      for (let x = 1; x < w - 1; x++) s.set(Math.round(cx) + x - 2, 25 - h + 1, oaDark(pal[0], 0.5));   // boca
      s.set(Math.round(cx) - 2, 25 - h, pal[3]);
    }
    return s.finish(oaDark(pal[0], 0.55));
  },
  // Leque-do-mar: haste e um leque de renda em arco, que balança
  fan(pal, v) {
    const rnd = mulberry32(1300 + v * 11), s = new Sprite(28, 30), cx = 14, cy = 14;
    oaLine(s, cx, 29, cx, 21, 2, oaDark(pal[1], 0.7));
    const R = 13;
    for (let r = 4; r <= R; r += 3) for (let a = 0; a <= 36; a++) {
      const t = Math.PI * (1.08 + a / 36 * 0.84), x = cx + Math.cos(t) * r * 1.02, y = cy + 7 + Math.sin(t) * r * 0.95;
      s.set(x, y, oaPick(pal, 0.35 + 0.55 * (r / R)));
    }
    for (let a = 0; a <= 14; a++) { const t = Math.PI * (1.1 + a / 14 * 0.8); oaLine(s, cx, cy + 8, cx + Math.cos(t) * R, cy + 7 + Math.sin(t) * R * 0.95, 1, pal[1]); }
    for (let k = 0; k < 18; k++) { const t = Math.PI * (1.1 + rnd() * 0.8); s.set(cx + Math.cos(t) * (R + 1), cy + 7 + Math.sin(t) * (R + 1) * 0.95, pal[3]); }
    return s.finish(oaDark(pal[0], 0.55));
  },
  // Coral-cérebro: cúpula cheia de sulcos
  brain(pal, v) {
    const s = new Sprite(26, 16);
    shadeBall(s, 13, 16, 12.5, 14, (l, dx, dy, x, y) => {
      const groove = Math.sin((x * 0.9 + Math.sin(y * 0.8 + v) * 2.2) * 1.3 + v) > 0.55;
      return oaPick(pal, clamp(l + (groove ? -0.35 : 0.04), 0, 1));
    });
    return s.finish(oaDark(pal[0], 0.55));
  },
  // Coral-mesa: prato achatado sobre uma haste grossa
  table(pal, v) {
    const s = new Sprite(32, 22), rnd = mulberry32(1500 + v);
    for (let y = 12; y < 22; y++) for (let x = 13; x < 19; x++) s.set(x, y, oaPick(pal, 0.7 - (x - 13) / 7));
    for (let y = 6; y < 12; y++) {
      const half = 15 - Math.abs(y - 9) * 1.4 - (y > 9 ? 0 : 0);
      for (let x = Math.round(16 - half); x <= Math.round(16 + half); x++) s.set(x, y, oaPick(pal, clamp(0.95 - (y - 6) * 0.17 - (x - 16) / 40 + rnd() * 0.1, 0, 1)));
    }
    for (let x = 3; x < 29; x += 2) s.set(x, 6, pal[3]);
    return s.finish(oaDark(pal[0], 0.55));
  },
  // Anêmona: base e muitos tentáculos com pontas claras (balançam)
  anemone(pal, v) {
    const rnd = mulberry32(1700 + v * 7), s = new Sprite(22, 22);
    for (let x = 6; x < 16; x++) for (let y = 17; y < 22; y++) s.set(x, y, oaPick(pal, 0.4 + (y - 17) * 0.1));
    for (let i = 0; i < 18; i++) {
      const bx = 6 + rnd() * 10, a = -Math.PI / 2 + (bx - 11) * 0.12 + (rnd() - 0.5) * 0.7, len = 7 + rnd() * 9;
      oaLine(s, bx, 18, bx + Math.cos(a) * len, 18 + Math.sin(a) * len, 1, oaPick(pal, 0.5 + rnd() * 0.3));
      s.set(bx + Math.cos(a) * len, 18 + Math.sin(a) * len, [255, 236, 230]);
    }
    return s.finish(oaDark(pal[0], 0.5));
  },
  // Capim-marinho: tufo de lâminas verdes que ondulam
  seagrass(pal, v) {
    const rnd = mulberry32(1900 + v * 5), s = new Sprite(24, 18), G = [[18, 90, 70], [34, 150, 96], [96, 210, 120]];
    for (let i = 0; i < 9; i++) {
      const x = 3 + i * 2 + (rnd() - 0.5), h = 7 + rnd() * 9, lean = (rnd() - 0.5) * 7;
      for (let y = 0; y < h; y++) { const t = y / h; s.set(x + lean * t * t, 17 - y, G[t < 0.35 ? 0 : t < 0.8 ? 1 : 2]); s.set(x + lean * t * t + 1, 17 - y, G[0]); }
    }
    return s.finish([10, 48, 40]);
  },
  // Ouriço-do-mar: bola roxa cheia de espinhos
  urchin(pal, v) {
    const s = new Sprite(14, 12);
    for (let a = 0; a < 22; a++) { const t = a / 22 * Math.PI * 2; if (Math.sin(t) > 0.45) continue; oaLine(s, 7, 9, 7 + Math.cos(t) * 6, 9 + Math.sin(t) * 6, 1, [150, 110, 220]); }
    shadeBall(s, 7, 9, 3.4, 3, (l) => oaPick(OA_CORAL.purple, l)); s.set(6, 8, [255, 255, 255]);
    return s.finish([26, 14, 54]);
  },
  // Estrela-do-mar de cinco pontas
  starfish(pal, v) {
    const s = new Sprite(14, 10), C = [[190, 70, 40], [240, 120, 60], [255, 190, 120]];
    for (let i = 0; i < 5; i++) { const t = -Math.PI / 2 + i * Math.PI * 2 / 5 + 0.25; oaLine(s, 7, 5, 7 + Math.cos(t) * 5.5, 5 + Math.sin(t) * 3.4, 2, C[1]); }
    shadeBall(s, 7, 5, 2.6, 2, (l) => C[clamp(Math.floor(l * 3), 0, 2)]); s.set(6, 4, C[2]);
    return s.finish([70, 22, 14]);
  },
  // Concha clara
  shell(pal, v) {
    const s = new Sprite(12, 9), C = [[190, 150, 130], [240, 214, 190], [255, 246, 228]];
    shadeBall(s, 6, 8, 5.5, 6.5, (l) => C[clamp(Math.floor(l * 3.4), 0, 2)]);
    for (let x = 2; x < 11; x += 2) oaLine(s, 6, 8, x, 3, 1, C[0]);
    return s.finish([92, 62, 50]);
  },
  // Mexilhão-gigante aberto com uma pérola que brilha
  clam(pal, v) {
    const s = new Sprite(24, 14), C = [[56, 62, 90], [100, 112, 150], [168, 182, 214]];
    shadeBall(s, 12, 13, 11, 6, (l) => C[clamp(Math.floor(l * 3.2), 0, 2)]);
    for (let x = 3; x < 22; x += 3) oaLine(s, 12, 13, x, 6, 1, C[0]);
    for (let x = 4; x < 20; x++) s.set(x, 12, [255, 170, 190]);
    shadeBall(s, 12, 10, 3, 2.5, (l) => l > 0.55 ? [255, 255, 255] : [226, 236, 255]);
    return s.finish([24, 26, 44]);
  },
};
const OA_SWAY = { branch: 0.8, tube: 0, fan: 1.4, brain: 0, table: 0, anemone: 1.7, seagrass: 1.6, urchin: 0, starfish: 0, shell: 0, clam: 0 };
const oaSprites = new Map();
function oaSprite(kind, ci, v) {
  const key = kind + ':' + ci + ':' + v;
  let c = oaSprites.get(key);
  if (!c) {
    const pal = OA_CORAL[OA_KEYS[ci % OA_KEYS.length]];
    c = OA_ART[kind](pal, v); oaSprites.set(key, c);
    c.oaKind = kind; c.oaCi = ci; c.envKind = 'reef' + kind[0].toUpperCase() + kind.slice(1); c.coreColor = pal[2].slice();   // colhível (js/reef-harvest.js); a cor dos estilhaços
  }
  return c;
}
// Sprite em faixas de 3 px, dobrando mais no alto: balança com a correnteza
function oaSwayDraw(ctx, img, x, y, bend, hang = false) {
  const stride = 3;
  for (let row = 0; row < img.height; row += stride) {
    const s = Math.min(stride, img.height - row), q = hang ? row / img.height : 1 - (row + s) / img.height;
    ctx.drawImage(img, 0, row, img.width, s, Math.round(x + bend * q * q), Math.round(y) + row, img.width, s);
  }
}

// O que mora em cada coluna do fundo: { kind, ci, v } ou null. Depende só da semente, da coluna e da profundidade.
function oaDecor(world, x, depth) {
  const reef = noise1(x * 0.03, world.seed + 77) > -0.1 && depth >= 3 && depth <= 24;
  const roll = oaHash(x, 0, 701), density = reef ? 0.6 : depth > 24 ? 0.1 : 0.2;
  if (roll > density) return null;     // os sprites têm 2 blocos de largura e se sobrepõem: recife denso, não uma fileira de bonecos
  const pick = oaHash(x, 1, 703), ci = Math.floor(oaHash(x, 2, 705) * OA_KEYS.length), v = Math.floor(oaHash(x, 3, 707) * 4);
  const table = reef
    ? [['brain', 3], ['tube', 3], ['branch', 3], ['fan', 2], ['table', 1.4], ['anemone', 1.6], ['clam', 0.5], ['urchin', 1], ['starfish', 1], ['seagrass', 1.2]]
    : [['seagrass', 5], ['shell', 2], ['starfish', 1], ['urchin', 0.6], ['brain', 0.6]];
  let r = pick * table.reduce((n, a) => n + a[1], 0);
  for (const [kind, wgt] of table) { r -= wgt; if (r <= 0) return { kind, ci: kind === 'seagrass' ? 0 : ci, v }; }
  return null;
}

// Enfeite do recife sobre o bloco de areia (x, y): o sprite, null (nada ali ou já colhido) ou undefined (não é fundo de mar).
// js/reef-harvest.js liga isto ao sistema de colheita de enfeites do jogo (js/environment.js).
function oaReefAt(world, x, y) {
  const depth = y - world.seaLevel;
  if (depth < 2 || !SOLID[world.getTile(x, y)] || world.getTile(x, y - 1) !== TILE.AIR || !world.hasWater(x, y - 1)) return undefined;
  if (world.decorCut?.has(envDecorKey(world, x, y, false))) return null;
  const d = oaDecor(world, x, depth);
  return d ? oaSprite(d.kind, d.ci, d.v) : null;
}

// Cáusticas: o brilho que a luz faz no fundo. Textura fina, esticada na horizontal como o riscado da própria água, e
// aplicada por uma máscara de 1 pixel por bloco ampliada com suavização: some aos poucos, sem borda de retângulo
let _caustic = null;
function oaCausticPattern(ctx) {
  if (_caustic) return _caustic;
  const S = 64, c = makeCanvas(S, S), g = c.getContext('2d'), img = g.createImageData(S, S), rnd = mulberry32(4242), pts = [];
  for (let i = 0; i < 11; i++) pts.push([rnd() * S, rnd() * S]);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    let d1 = 1e9, d2 = 1e9;
    for (const [px, py] of pts) for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
      const d = Math.hypot(x - (px + ox * S), y - (py + oy * S));
      if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
    }
    const a = Math.pow(clamp(1 - (d2 - d1) / 4.2, 0, 1), 1.7), i = (y * S + x) * 4;
    img.data[i] = 206; img.data[i + 1] = 255; img.data[i + 2] = 248; img.data[i + 3] = Math.round(a * 255);
  }
  g.putImageData(img, 0, 0);
  return (_caustic = ctx.createPattern(c, 'repeat'));
}
let _cLayer = null, _cMask = null;
function drawOceanCaustics(ctx, game, vx, vy, vw, vh, sunny) {
  const world = game.world, sea = oaSea(world), now = performance.now() / 1000, pat = oaCausticPattern(ctx);
  const tx0 = Math.max(world.oceanStart, Math.floor(vx / T) - 3), tx1 = Math.min(world.w - 1, Math.floor((vx + vw) / T) + 3);
  if (tx1 < tx0) return;
  let ty0 = Infinity, ty1 = -Infinity;
  for (let x = tx0; x <= tx1; x++) { const s = world.surface[x]; if (s - sea >= 1 && world.hasWater(x, sea)) { ty0 = Math.min(ty0, Math.max(s - 6, sea)); ty1 = Math.max(ty1, s + 1); } }
  ty0 = Math.max(ty0, Math.floor(vy / T) - 1); ty1 = Math.min(ty1, Math.floor((vy + vh) / T) + 1);
  if (ty1 < ty0) return;
  const cols = tx1 - tx0 + 1, rows = ty1 - ty0 + 1, W = cols * T, H = rows * T;
  if (!_cLayer || _cLayer.width < W || _cLayer.height < H) { _cLayer = makeCanvas(Math.max(W, _cLayer?.width || 0), Math.max(H, _cLayer?.height || 0)); }
  if (!_cMask || _cMask.width !== cols || _cMask.height !== rows) _cMask = makeCanvas(cols, rows);
  // máscara: forte na areia, esmaecendo para cima
  const mg = _cMask.getContext('2d'), mi = mg.createImageData(cols, rows);
  for (let x = tx0; x <= tx1; x++) {
    const s = world.surface[x], depth = s - sea;
    if (depth < 1 || !world.hasWater(x, sea)) continue;
    const base = clamp(1.2 - depth / 30, 0.25, 1);
    for (let r = Math.max(ty0, s - 6, sea); r <= Math.min(ty1, s + 1); r++) {
      if (r < s && !world.hasWater(x, r)) continue;     // só onde há água: nada de textura no ar
      const f = r < s ? Math.pow(1 - (s - r) / 7, 1.6) : r === s ? 1 : 0.22, i = ((r - ty0) * cols + (x - tx0)) * 4;
      mi.data[i] = mi.data[i + 1] = mi.data[i + 2] = 255; mi.data[i + 3] = Math.round(255 * base * f);
    }
  }
  mg.putImageData(mi, 0, 0);
  const lg = _cLayer.getContext('2d');
  lg.setTransform(1, 0, 0, 1, 0, 0); lg.globalCompositeOperation = 'source-over'; lg.clearRect(0, 0, _cLayer.width, _cLayer.height);
  lg.globalCompositeOperation = 'lighter';
  for (let layer = 0; layer < 2; layer++) {   // duas camadas andando em sentidos opostos
    pat.setTransform(new DOMMatrix().translate(-tx0 * T, -ty0 * T).multiply(new DOMMatrix([layer ? -0.55 : 0.72, 0, 0, layer ? 0.3 : 0.38, now * (layer ? -8 : 6), now * (layer ? 1.5 : -1.2) + layer * 17])));
    lg.fillStyle = pat; lg.globalAlpha = layer ? 0.7 : 1; lg.fillRect(0, 0, W, H);
  }
  lg.globalAlpha = 1; lg.globalCompositeOperation = 'destination-in'; lg.imageSmoothingEnabled = true; lg.imageSmoothingQuality = 'high';
  lg.drawImage(_cMask, 0, 0, cols, rows, 0, 0, W, H);
  lg.globalCompositeOperation = 'source-over';
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.42 * sunny;
  ctx.drawImage(_cLayer, 0, 0, W, H, tx0 * T, ty0 * T, W, H);
  ctx.restore();
}

function drawOceanReef(ctx, game, vx, vy, vw, vh) {
  const world = game.world;
  if (world.oceanStart >= world.w) return;
  const { w, surface } = world, sea = oaSea(world), now = performance.now() / 1000;
  const x0 = Math.max(world.oceanStart, Math.floor(vx / T) - 3), x1 = Math.min(w - 1, Math.floor((vx + vw) / T) + 3);
  if (x1 < x0) return;
  const day = game.daylight ?? 1, sunny = day * (1 - (game.weather?.rain || 0) * 0.7), windy = clamp((game.weather?.wind || 0) / 14, -1, 1);
  if (sunny > 0.08) drawOceanCaustics(ctx, game, vx, vy, vw, vh, sunny);
  // recife e fundo: o que já foi colhido (js/reef-harvest.js) fica vazio até voltar a crescer
  for (let x = x0; x <= x1; x++) {
    const s = surface[x], img = oaReefAt(world, x, s);
    if (!img) continue;
    const sway = OA_SWAY[img.oaKind], px = x * T + T / 2 - img.width / 2, py = s * T - img.height + 2;
    if (sway) oaSwayDraw(ctx, img, px, py, Math.sin(now * 1.4 + x * 0.7) * sway * 1.6 + windy * sway);
    else ctx.drawImage(img, Math.round(px), py);
  }
  drawShipwreckArt(ctx, game, vx, vy, vw, vh);
}

// ------------------------------------------------------------------ navio: velas rasgadas, bandeira e âncora
const oaSailCache = new Map();
function oaSail(sl) {
  const key = sl.seed;
  let c = oaSailCache.get(key);
  if (c) return c;
  const W = (sl.half * 2 + 1) * T - 4, H = sl.h * T, rnd = mulberry32(sl.seed), s = new Sprite(W, H);
  const C = [[104, 94, 74], [158, 146, 116], [206, 194, 158], [244, 234, 198]];
  for (let y = 0; y < H; y++) {
    const edge = 2 + Math.floor(y * 0.06), bottom = H - 4 - Math.floor(Math.abs(Math.sin(y * 0.05 + sl.seed)) * 4);
    for (let x = 0; x < W; x++) {
      const inset = Math.floor(Math.pow(y / H, 1.8) * W * 0.12), tear = oaHash(x >> 2, sl.seed, 55) < 0.32 ? 6 + Math.floor(oaHash(x >> 2, sl.seed, 56) * (H * 0.55)) : 0;
      if (x < inset + edge || x >= W - inset - edge) continue;
      if (y > H - 1 - tear) continue;                                   // pontas rasgadas pendendo em tiras
      let l = 0.62 + 0.3 * Math.sin(x * 0.45 + y * 0.03) * 0.4 + (y < 8 ? 0.12 : 0) - y / H * 0.35;
      if (x % 22 === 0) l -= 0.3;                                        // costura
      if (y % 19 === 0) l -= 0.18;
      if (oaHash(x, y, sl.seed) < 0.012) continue;                       // furinhos
      const algae = y > H * 0.6 && oaHash(x >> 1, y >> 1, sl.seed + 9) < (y / H - 0.55) * 0.5;
      s.set(x, y, algae ? [58, 104, 62] : C[clamp(Math.floor(l * 4), 0, 3)]);
    }
  }
  c = s.finish([54, 46, 34]);
  oaSailCache.set(key, c);
  return c;
}
let _flag = null;
function oaFlag() {
  if (_flag) return _flag;
  const s = new Sprite(18, 12);
  for (let y = 0; y < 12; y++) for (let x = 0; x < 18; x++) if (!(x > 12 && y > 8 - (x - 12) * 0.6 && (x + y) % 3 === 0) && !(x === 17 && y % 3 === 1)) s.set(x, y, y < 1 ? [58, 58, 66] : [28, 28, 36]);
  const skull = ['.XXXX.', 'XXXXXX', 'X.XX.X', 'XXXXXX', '.XXXX.', '.X..X.'];
  skull.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === 'X') s.set(5 + x, 2 + y, [236, 232, 214]); }));
  return (_flag = s.finish([10, 10, 14]));
}
let _anchor = null;
function oaAnchor() {
  if (_anchor) return _anchor;
  const s = new Sprite(22, 28), M = [[74, 62, 56], [118, 98, 84], [170, 142, 118], [120, 76, 40]];
  oaLine(s, 11, 4, 11, 24, 3, M[1]); oaLine(s, 10, 4, 10, 24, 1, M[2]);
  oaLine(s, 5, 8, 17, 8, 3, M[1]); oaLine(s, 5, 8, 17, 8, 1, M[2]);
  for (let a = 0; a <= 20; a++) { const t = Math.PI * (0.05 + a / 20 * 0.9); s.set(11 + Math.cos(t) * 9.5, 18 + Math.sin(t) * 6.5, M[1]); s.set(11 + Math.cos(t) * 9.5, 19 + Math.sin(t) * 6.5, M[1]); }
  s.set(2, 18, M[2]); s.set(20, 18, M[2]);
  for (let x = 8; x < 15; x++) s.set(x, 1, M[3]); oaLine(s, 11, 1, 11, 3, 1, M[3]);          // anel de corda
  for (let y = 10; y < 22; y += 3) s.set(12, y, M[3]);                                         // ferrugem
  return (_anchor = s.finish([28, 22, 20]));
}
function drawShipwreckArt(ctx, game, vx, vy, vw, vh) {
  const wr = game.world.wreck;
  if (!wr || wr.x1 * T < vx - 400 || wr.x0 * T > vx + vw + 400) return;
  const now = performance.now() / 1000, windy = clamp((game.weather?.wind || 0) / 14, -1, 1);
  for (const sl of wr.sails) {
    const img = oaSail(sl), x = sl.x * T + T / 2 - img.width / 2, y = sl.y * T + 1;
    oaSwayDraw(ctx, img, x, y, Math.sin(now * 0.9 + sl.seed * 0.01) * 3 + windy * 3, true);
  }
  const fl = oaFlag(), fx = wr.flag.x * T + T / 2, fy = wr.flag.y * T;
  for (let col = 0; col < fl.width; col += 2)
    ctx.drawImage(fl, col, 0, 2, fl.height, fx + 2 + col, Math.round(fy + 1 + Math.sin(now * 5 - col * 0.5) * (col * 0.12)), 2, fl.height);
  const an = oaAnchor();
  ctx.drawImage(an, wr.anchor.x * T + T / 2 - an.width / 2, wr.anchor.y * T - an.height + 5);
}

// ------------------------------------------------------------------ ganchos no desenho do jogo
{
  const baseFlora = drawAquaticFlora;
  drawAquaticFlora = function (ctx, game, vx, vy, vw, vh) { baseFlora(ctx, game, vx, vy, vw, vh); drawOceanReef(ctx, game, vx, vy, vw, vh); };
}

// ------------------------------------------------------------------ praia: a água sobe e desce na areia
const _shore = new WeakMap();
function oceanShoreX(world) {
  let v = _shore.get(world);
  if (v === undefined) {
    v = -1;
    for (let x = world.oceanStart; x < Math.min(world.w, world.oceanStart + 80); x++) if (world.surface[x] > world.seaLevel) { v = x; break; }
    _shore.set(world, v);
  }
  return v;
}
// Areia molhada que escurece, espuma na frente da maré subindo e riscos de espuma na água rasa (chamado depois de drawWater)
function drawOceanShore(ctx, game, vx, vy, vw, vh) {
  const world = game.world;
  if (world.oceanStart >= world.w) return;
  const xs = oceanShoreX(world);
  if (xs < 0 || xs * T < vx - 160 || xs * T > vx + vw + 160) return;
  const now = performance.now() / 1000, storm = game.swellLevel || 0, sea = world.seaLevel;
  const reach = 1.8 + 1.3 * Math.sin(now * 0.8) + 0.8 * Math.sin(now * 1.9 + 1.3) + storm * 3.2, xf = xs - reach;
  ctx.save();
  for (let x = Math.floor(xf) - 1; x < xs; x++) {
    const s = world.surface[x];
    if (s > sea || world.getTile(x, s - 1) !== TILE.AIR || world.hasWater(x, s - 1)) continue;
    const k = clamp((x + 1 - xf) / Math.max(1, reach), 0, 1);
    ctx.fillStyle = `rgba(58,46,24,${(0.36 * k).toFixed(2)})`; ctx.fillRect(x * T, s * T, T, 4);                              // areia molhada
    ctx.fillStyle = `rgba(255,255,255,${(0.55 * k * (0.6 + 0.4 * Math.sin(now * 3 + x))).toFixed(2)})`; ctx.fillRect(x * T + ((x * 7) % 11), s * T - 1, 3, 1);
  }
  for (let j = 0; j < 8; j++) {                                                                                                // a frente da onda
    const h = oaHash(j, Math.floor(now * 3), 3), px = Math.floor(xf * T) + j * 5 + Math.floor(h * 4), s = world.surface[clamp(Math.floor(px / T), 0, world.w - 1)];
    ctx.fillStyle = `rgba(255,255,255,${(0.5 + 0.45 * h).toFixed(2)})`; ctx.fillRect(px, s * T - 1 - (h > 0.6 ? 1 : 0), 2 + (h > 0.8 ? 2 : 0), 1 + (h > 0.5 ? 1 : 0));
  }
  for (let x = xs; x < xs + 6; x++) {                                                                                          // espuma na água rasa
    const h = oaHash(x, Math.floor(now * 1.6 + x * 0.3), 9);
    if (h < 0.55) { ctx.fillStyle = `rgba(255,255,255,${(0.35 + 0.35 * h).toFixed(2)})`; ctx.fillRect(x * T + Math.floor(h * 20), sea * T + 1, 4, 1); }
  }
  ctx.restore();
}

// ------------------------------------------------------------------ luz que atravessa o mar e o plâncton que brilha (depois da luz)
// Feixes de sol saindo da superfície, motas de plâncton subindo devagar e o brilho dos bichos do fundo: soma luz por cima de tudo
// Feixe de sol pré-pintado: o alfa vai a zero suavemente nas bordas (perfil cos²) e no fim, e alarga para baixo
const _rayImg = [];
function oaRayImage(v) {
  let c = _rayImg[v];
  if (c) return c;
  const W = 96, H = 192;
  c = makeCanvas(W, H);
  const g = c.getContext('2d'), img = g.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    const t = y / (H - 1), half = 0.16 + 0.34 * t;
    for (let x = 0; x < W; x++) {
      const u = (x / (W - 1) - 0.5) / half;
      if (Math.abs(u) >= 1) continue;
      const prof = Math.pow(Math.cos(u * Math.PI / 2), 2), fade = Math.pow(1 - t, 1.5) * Math.min(1, t / 0.035 + 0.3), streak = 0.78 + 0.22 * Math.sin(u * 6.5 + v * 2.3 + t * 2.5);
      const i = (y * W + x) * 4;
      img.data[i] = Math.round(lerp(232, 130, t)); img.data[i + 1] = Math.round(lerp(255, 226, t)); img.data[i + 2] = Math.round(lerp(250, 240, t)); img.data[i + 3] = Math.round(prof * fade * streak * 255);
    }
  }
  g.putImageData(img, 0, 0);
  return (_rayImg[v] = c);
}
function drawOceanAccents(ctx, game, ox, oy, z) {
  const world = game.world;
  if (world.oceanStart >= world.w) return;
  const vx = ox / z, vy = oy / z, vw = canvas.width / z, vh = canvas.height / z, sea = world.seaLevel;
  if (vy > (sea + 60) * T || vy + vh < (sea - 4) * T) return;
  const now = performance.now() / 1000, day = game.daylight ?? 1, storm = game.swellLevel || 0;
  const sunny = day * (1 - (game.weather?.rain || 0) * 0.75) * (1 - storm * 0.7), night = clamp(1 - day * 1.4, 0, 1);
  ctx.save(); ctx.setTransform(z, 0, 0, z, -ox, -oy); ctx.globalCompositeOperation = 'lighter';
  const x0 = Math.floor(vx / T) - 2, x1 = Math.floor((vx + vw) / T) + 2;
  // feixes de sol
  if (sunny > 0.1) {
    const slant = clamp((0.25 - (((game.time % 1) + 1) % 1)) * 3.2, -0.5, 0.5), step = 230;
    for (let i = Math.floor((vx - 300) / step); i <= Math.ceil((vx + vw + 300) / step); i++) {
      const cx = i * step + oaHash(i, 0, 811) * 120, tx = Math.floor(cx / T);
      if (tx < world.oceanStart || tx >= world.w || !world.hasWater(tx, sea)) continue;
      const y0 = sea * T + 2, len = Math.min(26 * T, (world.surface[tx] - sea) * T + 4);
      if (len < 3 * T || y0 > vy + vh || y0 + len < vy) continue;
      const tw = 16 + oaHash(i, 1, 813) * 18, W = tw / 0.32, a = 0.3 * sunny * (0.55 + 0.45 * Math.sin(now * 0.35 + i * 1.7));
      ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.transform(1, 0, slant, 1, cx, y0); ctx.globalAlpha = clamp(a, 0, 1);
      ctx.drawImage(oaRayImage(((i % 3) + 3) % 3), -W / 2, 0, W, len);
      ctx.restore();
    }
  }
  // plâncton: motas que sobem devagar; no fundo e à noite brilham em azul-esverdeado
  const CELL = 40, cy0 = Math.floor(Math.max(vy, sea * T) / CELL) - 1, cy1 = Math.floor(Math.min(vy + vh, (sea + 60) * T) / CELL) + 1;
  for (let cx = Math.floor(vx / CELL) - 1; cx <= Math.floor((vx + vw) / CELL) + 1; cx++) {
    if (Math.floor(cx * CELL / T) < world.oceanStart - 4) continue;
    for (let cy = cy0; cy <= cy1; cy++) {
      const h0 = oaHash(cx, cy, 821);
      if (h0 > 0.4) continue;
      const frac = (now * (1.3 + h0 * 3) + h0 * 40) % CELL / CELL;
      const px = cx * CELL + oaHash(cx, cy, 822) * CELL + Math.sin(now * 0.4 + h0 * 20) * 6, py = cy * CELL + oaHash(cx, cy, 823) * CELL - frac * CELL;
      const tx = Math.floor(px / T), ty = Math.floor(py / T);
      if (!world.hasWater(tx, ty)) continue;
      const depth = py / T - sea, deep = clamp((depth - 8) / 20, 0, 1), a = Math.sin(frac * Math.PI) * (0.18 + 0.4 * oaHash(cx, cy, 824)) * (0.55 + 0.45 * Math.sin(now * 2 + h0 * 30));
      if (deep > 0.2 || night > 0.3) {
        const glow = clamp(0.35 + deep * 0.5 + night * 0.4, 0, 1);
        ctx.fillStyle = `rgba(110,236,255,${(a * glow * 1.4).toFixed(3)})`; ctx.fillRect(Math.round(px), Math.round(py), 2, 2);
        if (h0 < 0.1) { const r = 7 + h0 * 40, gg = ctx.createRadialGradient(px, py, 0, px, py, r); gg.addColorStop(0, `rgba(90,230,255,${(0.2 * glow * Math.sin(frac * Math.PI)).toFixed(3)})`); gg.addColorStop(1, 'rgba(90,230,255,0)'); ctx.fillStyle = gg; ctx.fillRect(px - r, py - r, r * 2, r * 2); }
      } else { ctx.fillStyle = `rgba(214,255,250,${(a * sunny).toFixed(3)})`; ctx.fillRect(Math.round(px), Math.round(py), 1, 1); }
    }
  }
  // brilho dos bichos do fundo (anêmonas, corais-tubo e leques lá embaixo acendem no escuro)
  const GLOW = { anemone: 1, tube: 1, fan: 1, branch: 0.8 }, TINT = [[255, 120, 190], [255, 170, 80], [150, 130, 255], [90, 240, 230], [255, 230, 110], [255, 110, 120], [100, 170, 255]];
  for (let x = Math.max(x0, world.oceanStart); x <= Math.min(x1, world.w - 1); x++) {
    const s = world.surface[x], depth = s - sea;
    if (depth < 14) continue;
    const img = oaReefAt(world, x, s);
    if (!img || !GLOW[img.oaKind]) continue;
    const cx = x * T + T / 2, cy = s * T - img.height * 0.55, r = 20 + img.height * 0.5;
    const a = (0.1 + 0.16 * clamp((depth - 14) / 14, 0, 1)) * (0.6 + 0.4 * night) * (0.75 + 0.25 * Math.sin(now * 1.6 + x));
    const t = TINT[img.oaCi % TINT.length], g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, `rgba(${t[0]},${t[1]},${t[2]},${a.toFixed(3)})`); g.addColorStop(1, `rgba(${t[0]},${t[1]},${t[2]},0)`);
    ctx.fillStyle = g; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  ctx.restore(); ctx.setTransform(1, 0, 0, 1, 0, 0);
}
