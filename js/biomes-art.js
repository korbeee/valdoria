'use strict';
// =====================================================================================
//  ARTE DOS BIOMAS NOVOS: paisagem de fundo, árvores do pântano e cogumelos gigantes
// =====================================================================================
// Segue js/biomes-plus.js (blocos e geração). As árvores são "orgânicas" como as de js/organic-trees.js:
// copa e madeira em sprites separados, tronco esticado até a altura da coluna de blocos. Aqui entram os
// tipos 'swamp' (cipreste com barba-de-velho, raiz em joelhos) e 'mushroom' (cogumelo gigante com anel,
// lamelas, pintas e brilho). Carrega depois de biomes-plus.js.

ORGANIC_LEAVES.swamp = [[8, 24, 20], [16, 42, 30], [30, 66, 40], [52, 94, 50], [86, 126, 64], [132, 162, 92]];
ORGANIC_LEAVES.swampMoss = [[36, 52, 40], [64, 84, 56], [104, 124, 82], [150, 166, 118], [194, 204, 158], [226, 232, 196]];

// ---------------------------------------------------------------- cipreste do pântano
function generateSwampTree(seed) {
  const rnd = mulberry32(seed), W = 128 + Math.floor(rnd() * 16), H = 104 + Math.floor(rnd() * 12), cx = W >> 1;
  const wood = new Sprite(W, H), leaves = new Sprite(W, H), pal = ORGANIC_LEAVES.swamp, moss = ORGANIC_LEAVES.swampMoss;
  const lean = (rnd() - 0.5) * 12, fork = H * (0.5 + rnd() * 0.06);
  organicBranch(wood, [[cx, H - 1], [cx - lean, H * 0.74], [cx + lean, fork]], 8.5, 5, seed);
  const limbs = [], count = 4 + Math.floor(rnd() * 2);
  for (let i = 0; i < count; i++) {                                                  // galhos grossos, subindo e arqueando para fora
    const side = i % 2 ? 1 : -1, q = i / (count - 1);
    const origin = [cx + lean * (0.4 + q * 0.4), lerp(fork + 8, H * 0.3, q)];
    const tip = [clamp(cx + side * (W * (0.2 + rnd() * 0.18) + q * 6) + lean, 20, W - 21), H * (0.4 - q * 0.26) + (rnd() - 0.5) * 8];
    organicBranch(wood, [origin, [origin[0] + side * 12, origin[1] - 4 - rnd() * 6], tip], 4.4 - q * 0.9, 1.3, seed + i);
    limbs.push({ tip, origin, side });
    const sprig = [lerp(origin[0], tip[0], 0.6) + side * 4, tip[1] - 9 - rnd() * 8];
    organicBranch(wood, [[lerp(origin[0], tip[0], 0.55), lerp(origin[1], tip[1], 0.55)], [sprig[0] - side * 3, sprig[1] + 6], sprig], 2, 0.7, seed + 20 + i);
    limbs.push({ tip: sprig, origin: tip, side, small: true });
  }
  const top = [cx + lean * 1.2, 15 + rnd() * 6];
  organicBranch(wood, [[cx + lean, fork], [cx + lean + 4, H * 0.3], top], 3, 1, seed + 30);
  limbs.push({ tip: top, origin: top, side: 0, small: true });
  // Copas achatadas em camadas (como o cipreste de verdade): aglomerados largos e baixos
  limbs.sort((a, b) => a.tip[1] - b.tip[1]);
  for (const l of limbs) {
    const rx = l.small ? 16 + rnd() * 6 : 24 + rnd() * 8, ry = l.small ? 8 + rnd() * 3 : 11 + rnd() * 3;
    treeLeafCluster(leaves, l.tip[0], l.tip[1] - 3, rx, ry, pal, rnd, 'willow');
  }
  // Barba-de-velho: fios de musgo pálido pendurados das copas e dos galhos, com pontinhas de folha
  for (const l of limbs) {
    const strands = l.small ? 2 : 4;
    for (let k = 0; k < strands; k++) {
      const x0 = l.tip[0] + (rnd() - 0.5) * (l.small ? 22 : 40), y0 = l.tip[1] + 3 + rnd() * 5, len = 10 + rnd() * (l.small ? 12 : 26);
      for (let y = y0; y < Math.min(H - 14, y0 + len); y += 2) {
        const x = x0 + Math.sin(y * 0.2 + k + seed) * 1.8, fade = (y - y0) / len;
        treePixelLine(leaves, x, y, x + 0.6, y + 2, moss[fade < 0.5 ? 2 : fade < 0.85 ? 3 : 4]);
        if ((y - y0) % 6 < 2) leaves.set(Math.round(x + (k & 1 ? 1 : -1)), Math.round(y + 1), moss[1]);
      }
      leaves.set(Math.round(x0), Math.round(Math.min(H - 14, y0 + len)), moss[5]);
    }
  }
  return finishOrganicTree(wood, leaves, seed, 'swamp', Math.round(H * 0.62), 0.5);
}
// Tronco do pântano: base alargada com raízes e "joelhos" de cipreste, estrias e placas de musgo do lado da sombra
function swampTrunk(canopy, height, bare) {
  const W = 64, H = Math.max(T, height), s = new Sprite(W, H), cx = W >> 1, seed = canopy.seed, start = bare ? 0 : Math.min(H - 12, canopy.overlap - 3);
  const moss = ORGANIC_LEAVES.swampMoss;
  for (let y = start; y < H; y++) {
    const q = (y - start) / Math.max(1, H - start), bend = Math.sin(q * Math.PI) * Math.sin(q * 3 + seed) * 3, root = Math.pow(clamp((q - 0.62) / 0.38, 0, 1), 2.2);
    organicBark(s, cx + bend, y, 6.8 + root * 10, seed, false);
    // placas de musgo e fiapos de líquen, mais no pé da árvore
    const mossy = hash2(Math.floor(y / 3), seed, 17) < 0.28 + q * 0.4;
    if (mossy) for (let k = 0; k < 3; k++) { const x = Math.round(cx + bend - 7 - root * 8 + k + hash2(y, k, seed) * 4); if (hash2(x, y, seed + 3) < 0.7) s.set(x, y, moss[1 + (k & 1)]); }
  }
  for (const [side, len, hgt] of [[-1, 15 + (seed % 4), 8], [1, 13 + (seed % 5), 7], [-1, 25, 5], [1, 27, 4]]) {   // raízes abertas e joelhos
    organicBranch(s, [[cx + side * 3, H - 17], [cx + side * len * 0.55, H - 7], [cx + side * len, H - 1]], 3.2, 1, seed + side * len);
    if (len > 20) { const kx = cx + side * len, ky = H - 1; for (let k = 0; k < hgt; k++) for (let dx = -2 + (k >> 2); dx <= 2 - (k >> 2); dx++) s.set(kx + dx, ky - k, [[40, 30, 22], [74, 56, 36], [104, 80, 50]][dx < 0 ? 2 : dx > 0 ? 0 : 1]); s.set(kx, ky - hgt, moss[2]); }
  }
  return s.finish([22, 20, 16]);
}

// ---------------------------------------------------------------- cogumelo gigante
const MUSHROOM_CAPS = [
  { name: 'vermelho', pal: [[56, 12, 30], [108, 22, 42], [166, 38, 54], [212, 70, 70], [244, 128, 110], [255, 206, 182]], spot: [252, 242, 228], gill: [236, 202, 176], glow: [255, 120, 110] },
  { name: 'violeta', pal: [[28, 16, 66], [60, 34, 112], [102, 62, 166], [148, 100, 214], [196, 156, 250], [234, 216, 255]], spot: [160, 255, 236], gill: [190, 168, 240], glow: [150, 150, 255] },
  { name: 'turquesa', pal: [[8, 38, 52], [14, 78, 92], [26, 126, 128], [54, 178, 160], [116, 226, 196], [200, 255, 232]], spot: [255, 218, 122], gill: [170, 240, 214], glow: [100, 245, 210] },
  { name: 'alaranjado', pal: [[70, 28, 12], [128, 54, 20], [188, 90, 28], [236, 140, 48], [252, 196, 100], [255, 236, 172]], spot: [255, 246, 214], gill: [255, 214, 150], glow: [255, 176, 80] },
];
const MUSHROOM_STEM = [[96, 80, 78], [158, 138, 124], [206, 188, 164], [238, 226, 202], [255, 248, 230]];
function generateMushroomTree(seed) {
  const rnd = mulberry32(seed), variant = Math.floor(rnd() * MUSHROOM_CAPS.length), P = MUSHROOM_CAPS[variant], pal = P.pal;
  const W = 132, H = 108, cx = W >> 1, capCy = 40 + Math.floor(rnd() * 6), rx = 50 + Math.floor(rnd() * 8), ry = 26 + Math.floor(rnd() * 6), tilt = (rnd() - 0.5) * 0.18;
  const wood = new Sprite(W, H), leaves = new Sprite(W, H);
  // caule: o pedaço de cima dele, continuando o tronco desenhado por mushroomTrunk
  for (let y = capCy + 8; y < H; y++) for (let x = cx - 8; x <= cx + 8; x++) {
    const dx = (x - cx) / 7.2; if (Math.abs(dx) > 1) continue;
    const shadeI = dx < -0.55 ? 3 : dx < -0.05 ? 2 : dx < 0.45 ? 1 : 0;
    wood.set(x, y, MUSHROOM_STEM[clamp(shadeI + 1 + (hash2(x, y >> 2, seed) < 0.12 ? -1 : 0), 0, 4)]);
  }
  // cúpula: sombreada como esfera achatada, luz em cima à esquerda, borda de baixo ondulada
  const spots = [];
  for (let i = 0; i < 9; i++) { const a = rnd() * Math.PI, r = 0.15 + rnd() * 0.7; spots.push([Math.cos(a) * r, -Math.sin(a) * r * 0.9, 2 + Math.floor(rnd() * 3.4)]); }
  for (let y = capCy - ry - 2; y <= capCy + 9; y++) for (let x = cx - rx - 2; x <= cx + rx + 2; x++) {
    const nx = (x - cx - (y - capCy) * tilt) / rx, ny = (y - capCy) / ry;
    const rim = 1 + Math.sin(x * 0.55 + seed) * 0.03;
    let inside;
    if (ny <= 0) inside = nx * nx + ny * ny <= rim * rim;                        // cúpula
    else inside = Math.abs(nx) <= 1 + ny * 0.02 && ny <= 0.36 - nx * nx * 0.3 + Math.sin(x * 0.9 + seed) * 0.03;   // saia curva da borda
    if (!inside) continue;
    if (ny > 0) {                                                                // lamelas na parte de baixo da cúpula
      const gl = (Math.sin(x * 1.5 + seed) * 0.5 + 0.5) > 0.45 ? 1 : 0, edge = ny > 0.28;
      leaves.set(x, y, edge ? pal[1] : gl ? shade(P.gill, 0.78) : shade(P.gill, 0.56));
      continue;
    }
    const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)), light = clamp(-nx * 0.5 - ny * 0.62 + nz * 0.45, 0, 1);
    const dith = (BAYER4[(y & 3) * 4 + (x & 3)] / 16 - 0.5) * 0.16;
    let c = pal[clamp(Math.floor((light * 0.95 + 0.12 + dith) * pal.length), 0, pal.length - 1)];
    if (nx * nx + ny * ny > 0.84) c = pal[clamp(Math.floor(light * pal.length - 1 + dith * 4), 0, pal.length - 1)];   // borda escurece
    leaves.set(x, y, c);
  }
  for (const [sx, sy, sr] of spots) {                                            // pintas achatadas pela perspectiva
    const px = cx + sx * rx, py = capCy + sy * ry, flat = 1 - Math.abs(sx) * 0.4;
    for (let dy = -sr; dy <= sr; dy++) for (let dx = -sr; dx <= sr; dx++) {
      if ((dx * dx) / (flat * flat + 0.2) + dy * dy * 1.4 > sr * sr) continue;
      const x = Math.round(px + dx), y = Math.round(py + dy);
      if (!leaves.opaque(x, y) || y > capCy - 1) continue;
      leaves.set(x, y, dx + dy < -sr * 0.5 ? shade(P.spot, 1) : shade(P.spot, 0.82));
    }
  }
  for (let x = cx - rx + 4; x < cx + rx - 4; x += 2) {                           // brilho no alto da cúpula
    const nx = (x - cx) / rx, y = Math.round(capCy - ry * Math.sqrt(Math.max(0, 1 - nx * nx)) + 2);
    if (leaves.opaque(x, y) && nx < 0.2) leaves.set(x, y, pal[5]);
  }
  // anel (anel do caule): saia fininha logo abaixo da cúpula
  const ringY = capCy + 20 + Math.floor(rnd() * 4);
  for (let x = cx - 12; x <= cx + 12; x++) { const d = Math.abs(x - cx) / 12; for (let k = 0; k < 4; k++) if (d * d + k * 0.12 < 1) wood.set(x, ringY + Math.round(d * d * 3) + k, k === 3 ? MUSHROOM_STEM[1] : x < cx ? MUSHROOM_STEM[3] : MUSHROOM_STEM[2]); }
  // esporos pendurados em fios finos sob a cúpula
  for (let i = 0; i < 5; i++) {
    const x = Math.round(cx + (rnd() - 0.5) * rx * 1.5), y0 = capCy + 6, len = 6 + Math.floor(rnd() * 14);
    for (let k = 0; k < len; k++) leaves.set(x, y0 + k, k < len - 2 ? shade(P.gill, 0.6) : P.pal[4]);
    leaves.set(x, y0 + len, P.pal[5]); leaves.set(x + 1, y0 + len - 1, P.pal[4]);
  }
  const tree = finishOrganicTree(wood, leaves, seed, 'mushroom', 78, 0.04);
  tree.glow = P.glow; tree.capRx = rx; tree.capCy = capCy; tree.variant = variant;
  return tree;
}
function mushroomTrunk(canopy, height, bare) {
  const W = 40, H = Math.max(T, height), s = new Sprite(W, H), cx = W >> 1, seed = canopy.seed, start = bare ? 0 : Math.max(0, canopy.overlap - 78);
  for (let y = 0; y < H; y++) {
    const q = y / H, belly = Math.sin(q * Math.PI) * 0.6, foot = Math.pow(clamp((q - 0.86) / 0.14, 0, 1), 1.8) * 6.5;
    const r = 7.2 + belly + foot;
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dx = (x - cx) / r; if (Math.abs(dx) > 1) continue;
      const lvl = dx < -0.55 ? 4 : dx < -0.05 ? 3 : dx < 0.45 ? 2 : 1;
      const fib = hash2(x, y >> 1, seed) < 0.1 ? -1 : 0, ring = (y % 22 < 2 && q > 0.1) ? -1 : 0;
      s.set(x, y, MUSHROOM_STEM[clamp(lvl + fib + ring, 0, 4)]);
    }
  }
  for (let k = 0; k < 14; k++) { const x = cx + Math.round((hash2(k, seed, 5) - 0.5) * 12), y = Math.floor(hash2(k, seed, 6) * H); s.set(x, y, MUSHROOM_STEM[0]); }   // furinhos e manchas do caule
  return s.finish([40, 30, 34]);
}

// ---------------------------------------------------------------- liga as árvores novas ao sorteio de js/organic-trees.js
{
  const baseCanopy = organicCanopyFor, baseTrunk = organicTrunkFor, cache = new Map();
  organicCanopyFor = function (x, biome, worldSeed = 0) {
    if (biome !== BIOME.SWAMP && biome !== BIOME.FUNGAL) return baseCanopy(x, biome, worldSeed);
    const key = worldSeed + ':' + biome + ':' + x;
    let tree = cache.get(key);
    if (tree) return tree;
    const seed = Math.floor(hash2(x, biome, worldSeed ^ 0x71a9) * 0x7fffffff);
    tree = biome === BIOME.SWAMP ? generateSwampTree(seed) : generateMushroomTree(seed);
    cache.set(key, tree);
    if (cache.size > 160) cache.delete(cache.keys().next().value);
    return tree;
  };
  const trunkCache = new WeakMap();
  organicTrunkFor = function (canopy, height, bare = false) {
    if (canopy.kind !== 'swamp' && canopy.kind !== 'mushroom') return baseTrunk(canopy, height, bare);
    let m = trunkCache.get(canopy); if (!m) trunkCache.set(canopy, m = new Map());
    const key = bare ? height + ':b' : height;
    if (m.has(key)) return m.get(key);
    const out = canopy.kind === 'swamp' ? swampTrunk(canopy, height, bare) : mushroomTrunk(canopy, height, bare);
    m.set(key, out); if (m.size > 8) m.delete(m.keys().next().value);
    return out;
  };
}

// ---------------------------------------------------------------- paisagem de fundo
// Pântano: neblina baixa, ciprestes com barba-de-velho. Mesa: platôs com faixas de rocha. Bosque: cogumelos gigantes ao longe.
function bgCypress(g, s, x, base, h, col, lit, rnd) {
  g.fillStyle = cssC(shade(col, 0.68));
  g.beginPath(); g.moveTo((x - h * 0.08) * s, base * s); g.lineTo((x - h * 0.028) * s, (base - h * 0.5) * s); g.lineTo((x + h * 0.028) * s, (base - h * 0.5) * s); g.lineTo((x + h * 0.08) * s, base * s); g.fill();
  for (let k = 0; k < 3; k++) {
    const cy = base - h * (0.52 + k * 0.13), rx = h * (0.34 - k * 0.08);
    g.fillStyle = cssC(shade(col, 1 - k * 0.03));
    g.beginPath(); g.ellipse((x + (rnd() - 0.5) * h * 0.06) * s, cy * s, rx * s, h * 0.075 * s, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = cssC(lit, 0.4);
    g.beginPath(); g.ellipse((x + bgLightSide(g) * rx * 0.25) * s, (cy - h * 0.02) * s, rx * 0.6 * s, h * 0.03 * s, 0, 0, Math.PI * 2); g.fill();
  }
  g.strokeStyle = cssC(lit, 0.38); g.lineWidth = Math.max(0.6, 1.1 * s); g.lineCap = 'round';
  for (let i = 0; i < 8; i++) {
    const sx = x + (rnd() - 0.5) * h * 0.62, sy = base - h * (0.5 + rnd() * 0.2), len = h * (0.1 + rnd() * 0.22);
    g.beginPath(); g.moveTo(sx * s, sy * s); g.quadraticCurveTo((sx + 2) * s, (sy + len * 0.5) * s, (sx - 1) * s, (sy + len) * s); g.stroke();
  }
}
// Platô de mesa: tronco de pirâmide com um degrau, faixas de rocha em cores alternadas e a face da sombra mais escura
function bgMesa(g, s, x, base, w, h, rnd, tone = 1) {
  const bands = [[196, 98, 70], [232, 170, 112], [214, 120, 74], [240, 214, 170], [176, 78, 58]].map((c) => shade(c, tone));
  const top = base - h, mid = base - h * (0.5 + rnd() * 0.12), tw = w * (0.46 + rnd() * 0.16), mw = w * (0.8 + rnd() * 0.1);
  const poly = [[x - w / 2, base], [x - mw / 2, mid], [x - mw / 2 + w * 0.04, mid - 2], [x - tw / 2, top + h * 0.12], [x - tw / 2 + 3, top], [x + tw / 2 - 3, top], [x + tw / 2, top + h * 0.12], [x + mw / 2 - w * 0.04, mid - 2], [x + mw / 2, mid], [x + w / 2, base]];
  g.save();
  g.beginPath(); poly.forEach(([px, py], i) => (i ? g.lineTo(px * s, py * s) : g.moveTo(px * s, py * s))); g.closePath(); g.clip();
  g.fillStyle = cssC(bands[0]); g.fillRect((x - w) * s, top * s, w * 2 * s, h * s);
  let y = top, k = 0;
  while (y < base) { const th = 3 + rnd() * 9; g.fillStyle = cssC(bands[k % bands.length], 0.9); g.fillRect((x - w) * s, y * s, w * 2 * s, th * s); y += th; k++; }
  const side = bgLightSide(g);
  g.fillStyle = 'rgba(70,24,30,0.34)'; g.fillRect((x + (side < 0 ? 0.08 : -0.5) * w) * s, top * s, w * 0.42 * s, h * s);
  g.fillStyle = 'rgba(255,230,190,0.22)'; g.fillRect((x + (side < 0 ? -0.5 : 0.1) * w) * s, top * s, w * 0.12 * s, h * s);
  g.restore();
}
function bgMushroom(g, s, x, base, h, cap, lit, stem, rnd) {
  const sw = h * 0.1, cy = base - h * 0.7, rx = h * (0.3 + rnd() * 0.1), ry = h * 0.2;
  g.fillStyle = cssC(stem); g.fillRect((x - sw / 2) * s, cy * s, sw * s, (base - cy) * s);
  g.fillStyle = cssC(shade(stem, 0.8)); g.fillRect((x + (bgLightSide(g) < 0 ? 0.1 : -0.5) * sw) * s, cy * s, sw * 0.4 * s, (base - cy) * s);
  const glow = g.createRadialGradient(x * s, cy * s, 0, x * s, cy * s, rx * 1.5 * s);
  glow.addColorStop(0, cssC(lit, 0.28)); glow.addColorStop(1, cssC(lit, 0));
  g.fillStyle = glow; g.fillRect((x - rx * 1.5) * s, (cy - rx * 1.5) * s, rx * 3 * s, rx * 3 * s);
  g.fillStyle = cssC(cap); g.beginPath(); g.ellipse(x * s, cy * s, rx * s, ry * s, 0, Math.PI, 0); g.fill();
  g.fillStyle = cssC(shade(cap, 0.7)); g.beginPath(); g.ellipse(x * s, cy * s, rx * s, ry * 0.2 * s, 0, 0, Math.PI); g.fill();
  g.fillStyle = cssC(lit, 0.55); g.beginPath(); g.ellipse((x + bgLightSide(g) * rx * 0.25) * s, (cy - ry * 0.45) * s, rx * 0.55 * s, ry * 0.3 * s, 0, 0, Math.PI * 2); g.fill();
  for (let i = 0; i < 3; i++) { g.fillStyle = cssC(lit, 0.8); g.beginPath(); g.arc((x + (rnd() - 0.5) * rx * 1.3) * s, (cy - ry * (0.2 + rnd() * 0.55)) * s, Math.max(0.6, h * 0.025) * s, 0, Math.PI * 2); g.fill(); }
}
function bgMist(g, s, H, y0, col, a) {
  const grad = g.createLinearGradient(0, y0 * s, 0, H * s);
  grad.addColorStop(0, cssC(col, 0)); grad.addColorStop(1, cssC(col, a));
  g.fillStyle = grad; g.fillRect(0, y0 * s, BG_LAYER_W * s, (H - y0) * s);
}

BG_BIOMES.push(
  // Pântano: colinas encobertas pela névoa e ciprestes cada vez mais grandes
  [
    { h: 340, f: 0.04, drop: -10, base: [132, 156, 146], paint(g, s, rnd) {
      const top = (x) => 140 + bgFbm(x, 311, 6) * 120;
      paintTerrain(g, s, 340, top, [160, 180, 168], [132, 156, 146]);
      shadeMountains(g, s, 340, top, [226, 232, 206], [84, 112, 108]);
      for (let i = 0; i < 70; i++) { const x = rnd() * BG_LAYER_W; bgCypress(g, s, x, top(x) + 10, 30 + rnd() * 26, [112, 138, 128], [168, 186, 160], rnd); }
      bgMist(g, s, 340, 180, [200, 214, 196], 0.4);
    } },
    { h: 260, f: 0.1, drop: 22, base: [96, 128, 108], paint(g, s, rnd) {
      const top = (x) => 120 + bgFbm(x, 321, 5) * 100;
      paintTerrain(g, s, 260, top, [122, 152, 128], [96, 128, 108]);
      for (let i = 0; i < 70; i++) { const x = rnd() * BG_LAYER_W; bgCypress(g, s, x, top(x) + 14, 46 + rnd() * 40, [84, 116, 98], [148, 172, 128], rnd); }
      bgMist(g, s, 260, 150, [186, 204, 182], 0.35);
    } },
    { h: 240, f: 0.18, drop: 46, base: [64, 96, 76], paint(g, s, rnd) {
      const top = (x) => 112 + bgFbm(x, 331, 4) * 80;
      paintTerrain(g, s, 240, top, [88, 122, 90], [64, 96, 76]);
      for (let i = 0; i < 56; i++) { const x = rnd() * BG_LAYER_W; bgCypress(g, s, x, top(x) + 18, 70 + rnd() * 54, [58, 92, 70], [124, 156, 108], rnd); }
      for (let i = 0; i < 220; i++) { const x = rnd() * BG_LAYER_W, y = top(x) + 6 + rnd() * 14, hh = 5 + rnd() * 9; g.fillStyle = cssC([104, 128, 70], 0.8); g.fillRect(x * s, (y - hh) * s, Math.max(1, s), hh * s); }
    } },
    { h: 230, f: 0.3, drop: 82, base: [40, 68, 52], paint(g, s, rnd) {
      const top = (x) => 124 + bgFbm(x, 341, 5) * 60;
      paintTerrain(g, s, 230, top, [58, 86, 62], [40, 68, 52]);
      for (let i = 0; i < 34; i++) { const x = rnd() * BG_LAYER_W; bgCypress(g, s, x, top(x) + 24, 110 + rnd() * 70, [38, 68, 52], [102, 134, 92], rnd); }
    } },
  ],
  // Mesa Vermelha: platôs listrados ao longe, dunas vermelhas, pilares e cactos
  [
    { h: 380, f: 0.04, drop: -16, base: [218, 140, 108], paint(g, s, rnd) {
      const top = (x) => 250 + bgFbm(x, 351, 5) * 50;
      paintTerrain(g, s, 380, top, [236, 176, 134], [218, 140, 108]);
      for (let i = 0; i < 18; i++) { const x = rnd() * BG_LAYER_W; for (const dx of [0, BG_LAYER_W, -BG_LAYER_W]) bgMesa(g, s, x + dx, top(x) + 22, 120 + rnd() * 180, 90 + rnd() * 160, rnd, 1.08); }
      bgMist(g, s, 380, 220, [250, 214, 170], 0.5);
    } },
    { h: 260, f: 0.1, drop: 22, base: [206, 124, 88], paint(g, s, rnd) {
      const top = (x) => 150 + Math.sin(x / BG_LAYER_W * Math.PI * 2 * 6) * 22 + bgFbm(x, 361, 5) * 50;
      paintTerrain(g, s, 260, top, [226, 150, 108], [206, 124, 88]);
      for (let i = 0; i < 12; i++) { const x = rnd() * BG_LAYER_W; for (const dx of [0, BG_LAYER_W, -BG_LAYER_W]) bgMesa(g, s, x + dx, top(x) + 16, 70 + rnd() * 110, 60 + rnd() * 100, rnd, 0.96); }
      bgMist(g, s, 260, 170, [240, 196, 150], 0.3);
    } },
    { h: 230, f: 0.18, drop: 46, base: [184, 98, 72], paint(g, s, rnd) {
      const top = (x) => 120 + Math.sin(x / BG_LAYER_W * Math.PI * 2 * 9 + 1) * 20 + bgFbm(x, 371, 4) * 40;
      paintTerrain(g, s, 230, top, [208, 120, 84], [184, 98, 72]);
      shadeMountains(g, s, 230, top, [255, 214, 160], [128, 54, 52]);
      for (let i = 0; i < 24; i++) { const x = rnd() * BG_LAYER_W; saguaro(g, s, x, top(x) + 8, 26 + rnd() * 22, [118, 112, 74], rnd); }
      for (let i = 0; i < 14; i++) { const x = rnd() * BG_LAYER_W; bgMesa(g, s, x, top(x) + 8, 14 + rnd() * 16, 36 + rnd() * 50, rnd, 0.88); }
    } },
    { h: 220, f: 0.3, drop: 84, base: [150, 76, 60], paint(g, s, rnd) {
      const top = (x) => 120 + bgFbm(x, 381, 4) * 50;
      paintTerrain(g, s, 220, top, [176, 92, 68], [150, 76, 60]);
      for (let i = 0; i < 20; i++) { const x = rnd() * BG_LAYER_W; bgMesa(g, s, x, top(x) + 12, 24 + rnd() * 30, 60 + rnd() * 80, rnd, 0.78); }
      for (let i = 0; i < 16; i++) { const x = rnd() * BG_LAYER_W; saguaro(g, s, x, top(x) + 10, 56 + rnd() * 40, [90, 92, 60], rnd); }
    } },
  ],
  // Bosque Luminoso: serras violeta e cogumelos gigantes que acendem, cada camada mais brilhante
  [
    { h: 380, f: 0.04, drop: -20, base: [96, 90, 170], paint(g, s) {
      const top = (x) => 70 + (1 - Math.pow(bgRidge(x, 391, 4), 2.1)) * 290;
      paintTerrain(g, s, 380, top, [150, 140, 214], [96, 90, 170]);
      shadeMountains(g, s, 380, top, [236, 220, 255], [46, 48, 118]);
      bgMist(g, s, 380, 200, [170, 156, 232], 0.5);
    } },
    { h: 260, f: 0.1, drop: 22, base: [78, 84, 150], paint(g, s, rnd) {
      const top = (x) => 120 + bgFbm(x, 401, 5) * 100;
      paintTerrain(g, s, 260, top, [112, 112, 190], [78, 84, 150]);
      for (let i = 0; i < 56; i++) { const x = rnd() * BG_LAYER_W; bgMushroom(g, s, x, top(x) + 14, 36 + rnd() * 40, [96, 78, 170], [190, 170, 255], [170, 156, 214], rnd); }
    } },
    { h: 240, f: 0.18, drop: 46, base: [48, 74, 120], paint(g, s, rnd) {
      const top = (x) => 112 + bgFbm(x, 411, 4) * 80;
      paintTerrain(g, s, 240, top, [70, 104, 156], [48, 74, 120]);
      for (let i = 0; i < 40; i++) { const x = rnd() * BG_LAYER_W; bgMushroom(g, s, x, top(x) + 18, 60 + rnd() * 50, rnd() < 0.5 ? [40, 140, 148] : [150, 66, 150], [140, 255, 230], [150, 190, 200], rnd); }
    } },
    { h: 230, f: 0.3, drop: 82, base: [28, 54, 86], paint(g, s, rnd) {
      const top = (x) => 124 + bgFbm(x, 421, 5) * 60;
      paintTerrain(g, s, 230, top, [44, 78, 112], [28, 54, 86]);
      for (let i = 0; i < 26; i++) { const x = rnd() * BG_LAYER_W; bgMushroom(g, s, x, top(x) + 24, 100 + rnd() * 70, rnd() < 0.5 ? [30, 106, 120] : [112, 50, 134], [120, 255, 214], [128, 168, 176], rnd); }
    } },
  ],
);
