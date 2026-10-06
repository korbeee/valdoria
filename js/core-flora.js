'use strict';
// =====================================================================================
//  FLORA DO CORAÇÃO: árvores e arbustos de cada trecho
// =====================================================================================
//  Forja       árvore de brasa (tronco carbonizado, copa de brasas acesas)
//  Magnético   árvore de cristal (tronco de magnetita, copa de cristais azuis)
//  Maquinário  árvore de cobre (tronco de cano, folhas de pátina verde)
//  Ossário     árvore de osso (tronco claro com costelas, galhos de chifre, frutos de âmbar)
// Entra na mesma ecologia de js/core-ecology.js (decorações determinísticas, brilho e luz).
// Carrega depois de core-ecology.js e core-plus.js.

const FLORA_PAL = [
  { trunk: [[18, 12, 14], [44, 30, 28], [84, 58, 48], [120, 84, 66]], leaf: [[120, 30, 18], [214, 78, 26], [255, 150, 50], [255, 224, 130]], glow: [255, 140, 60] },
  { trunk: [[20, 24, 44], [40, 50, 84], [74, 92, 136], [120, 146, 196]], leaf: [[30, 70, 130], [60, 130, 210], [120, 200, 250], [220, 250, 255]], glow: [110, 190, 245] },
  { trunk: [[52, 30, 14], [110, 68, 30], [168, 116, 58], [226, 176, 100]], leaf: [[30, 80, 66], [58, 140, 112], [110, 200, 160], [200, 250, 214]], glow: [140, 235, 188] },
  { trunk: [[96, 82, 62], [170, 154, 120], [222, 210, 178], [250, 244, 224]], leaf: [[150, 70, 16], [236, 150, 40], [255, 206, 90], [255, 246, 190]], glow: [245, 190, 95] },
];
// Árvore do Ossário: tronco fossilizado torto, com anéis de osso e fendas, raízes abertas, galhos que se
// ramificam até virar gravetos e gotas de âmbar penduradas por fios finos (o fio sai depois do contorno).
function boneTree(variant) {
  const W = 64, H = 94, cx = 32, base = H - 3, s = new Sprite(W, H), rnd = mulberry32(9300 + variant * 41), seed = 9300 + variant;
  const C = { ol: [52, 38, 34], dk: [116, 96, 78], md: [186, 168, 138], lt: [230, 218, 188], hi: [252, 246, 226], soot: [84, 66, 56] };
  const own = new Int16Array(W * H);
  let id = 0;
  const walk = (x, y, a, len, curl) => {                                                // caminho curvo, em passos de ~0,7px
    const o = [[x, y]], n = Math.ceil(len / 0.7);
    for (let i = 0; i < n; i++) {
      a += curl / n + (rnd() - 0.5) * 0.14 + clamp((cx - x) / 40, -0.5, 0.5) * 0.02 * (Math.abs(x - cx) > 14 ? 1 : 0);
      x = clamp(x + Math.cos(a) * 0.7, 3, W - 4); y = Math.max(3, y + Math.sin(a) * 0.7); o.push([x, y]);
    }
    return o;
  };
  const stroke = (pts, r0, r1, soot = 0) => {                                           // faixa afilada com luz à esquerda
    const L = ++id, n = pts.length;
    for (let i = 0; i < n; i++) {
      const r = lerp(r0, r1, i / Math.max(1, n - 1)), [px, py] = pts[i], R = Math.ceil(r);
      for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
        if (dx * dx + dy * dy > r * r + 0.3) continue;
        const x = Math.round(px + dx), y = Math.round(py + dy);
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const u = (dx * 0.8 + dy * 0.45) / Math.max(r, 1);
        let c = u > 0.5 ? C.dk : u < -0.45 && r >= 1.8 ? C.lt : C.md;
        if (soot && c !== C.dk && y > base - soot) c = lerpColor(c, C.soot, clamp((y - (base - soot)) / soot, 0, 1) * 0.7);   // base chamuscada
        s.set(x, y, c); own[y * W + x] = L;
      }
    }
    return L;
  };
  const tips = [], knots = [];
  const grow = (x, y, a, len, r, depth) => {
    const pts = walk(x, y, a, len, (a < -Math.PI / 2 ? -1 : 1) * (0.2 + rnd() * 0.6) * (depth ? 0.6 : 1.3));
    stroke(pts, r, Math.max(0.5, r * 0.5));
    const end = pts[pts.length - 1];
    if (depth > 0) {
      const kids = rnd() < 0.5 ? 1 : 0;
      for (let k = 0; k < kids; k++) {
        const p = pts[Math.floor((0.4 + rnd() * 0.4) * (pts.length - 1))], side = rnd() < 0.5 ? -1 : 1;
        grow(p[0], p[1], a + side * (0.6 + rnd() * 0.5), len * (0.5 + rnd() * 0.2), r * 0.6, depth - 1);
      }
      grow(end[0], end[1], a + (rnd() - 0.5) * 0.7 + 0.25, len * 0.62, r * 0.66, depth - 1);
    } else tips.push(end);
    if (r < 2.4) for (let k = 2; k < pts.length - 1; k += 4) knots.push(pts[k]);
  };
  // raízes abertas no chão
  for (const sx of [-1, 1]) for (let k = 0; k < 2; k++) {
    const len = 9 + rnd() * 7 + k * 3, x0 = cx + sx * 2, pts = [];
    for (let i = 0; i <= 14; i++) { const t = i / 14; pts.push([x0 + sx * len * t * (1 - k * 0.15), base - 9 * (1 - t) ** 2 + 2 * t]); }
    stroke(pts, 3.2 - k, 0.8, 8);
  }
  // tronco
  const lean = (rnd() - 0.5) * 0.3, trunk = walk(cx, base - 4, -Math.PI / 2 + lean, 50, (rnd() - 0.5) * 0.9), tl = stroke(trunk, 5.4, 3, 10);
  for (let y = 4; y < H; y++) for (let x = 0; x < W; x++) {                           // casca: anéis de osso, fendas e pontos
    if (own[y * W + x] !== tl) continue;
    const ring = (y + variant * 3) % 9 === 0 && hash2(x, y, seed) < 0.78, crack = hash2(x, y >> 2, seed + 5) < 0.1 && (y & 3) !== 0;
    if (ring) s.set(x, y, C.dk); else if (crack) s.set(x, y, C.dk); else if (hash2(x, y, seed + 9) < 0.05) s.set(x, y, C.hi);
  }
  const at = (t) => trunk[Math.floor(t * (trunk.length - 1))];
  const arms = 3 + Math.floor(rnd() * 2);
  for (let b = 0; b < arms; b++) {                                                      // galhos mestres, alternando os lados
    const p = at(0.32 + b * (0.5 / arms)), side = b % 2 ? 1 : -1;
    grow(p[0] + side * 2, p[1], -Math.PI / 2 + side * (0.95 + rnd() * 0.45), 17 + rnd() * 9, 2.3, 2);
  }
  const top = at(1);
  grow(top[0], top[1], -Math.PI / 2 + lean + (rnd() - 0.5) * 0.5, 11, 2.4, 1);
  // fios de resina escorrendo pela casca
  for (let k = 0; k < 3; k++) {
    const p = at(0.12 + rnd() * 0.55), x = Math.round(p[0] + (rnd() - 0.5) * 3), y0 = Math.round(p[1]), len = 4 + Math.floor(rnd() * 5);
    for (let i = 0; i < len; i++) if (own[(y0 + i) * W + x] === tl) s.set(x, y0 + i, i === 0 ? [255, 218, 128] : [226, 148, 44]);
    if (own[(y0 + len) * W + x] === tl) { s.set(x, y0 + len, [255, 232, 160]); s.set(x, y0 + len + 1, [196, 112, 30]); }
  }
  // gotas de âmbar: bolinha dentro do sprite (ganha contorno), fio fino depois do contorno
  const drops = [], pool = knots.concat(tips);
  for (let k = pool.length - 1; k > 0; k--) { const j = Math.floor(rnd() * (k + 1)); [pool[k], pool[j]] = [pool[j], pool[k]]; }
  for (const [px, py] of pool) {
    if (drops.length >= 8) break;
    const x = Math.round(px), y = Math.round(py), len = 3 + Math.floor(rnd() * 5);
    if (y + len + 7 >= base - 6 || drops.some((d) => Math.abs(d.x - x) < 7 && Math.abs(d.y - y) < 8)) continue;
    drops.push({ x, y, len });
  }
  for (const d of drops) shadeBall(s, d.x, d.y + d.len + 3, 2.4, 3.2, (v) => (v > 0.75 ? [255, 238, 170] : v > 0.45 ? [244, 176, 58] : v > 0.2 ? [210, 120, 28] : [150, 70, 18]));
  const img = s.finish(C.ol), g = img.getContext('2d');
  g.fillStyle = 'rgb(96,74,60)';
  for (const d of drops) g.fillRect(d.x, d.y, 1, d.len + 1);
  img.envKind = 'coreTree'; img.coreZone = 3; img.coreGlow = 0.7; img.coreColor = FLORA_PAL[3].glow; img.floraTree = true;
  return img;
}
function floraTree(zone, variant) {
  if (zone === 3) return boneTree(variant);
  const P = FLORA_PAL[zone], W = 56, H = 92, s = new Sprite(W, H), rnd = mulberry32(9100 + zone * 97 + variant * 31), cx = 28, base = H - 3;
  const tp = [P.trunk[0], P.trunk[2], P.trunk[3]], tp2 = [P.trunk[0], P.trunk[1], P.trunk[2]];
  const trunk = [[cx, base], [cx + (rnd() - 0.5) * 6, base - 26], [cx + (rnd() - 0.5) * 8, base - 52]];
  for (let i = 0; i < trunk.length - 1; i++) limb(s, trunk[i][0], trunk[i][1], trunk[i + 1][0], trunk[i + 1][1], 9 - i * 2, tp);
  shadeBall(s, cx, base - 2, 8, 4, (v) => (v > 0.6 ? P.trunk[3] : v > 0.35 ? P.trunk[2] : P.trunk[1]));               // raízes
  for (const sx of [-1, 1]) limb(s, cx + sx * 4, base - 2, cx + sx * 12, base + 1, 3, tp2);
  const top = trunk[2], tips = [];
  const branches = 3 + Math.floor(rnd() * 2);
  for (let b = 0; b < branches; b++) {
    const side = b % 2 ? 1 : -1, y0 = base - 26 - b * 9, x0 = cx + (rnd() - 0.5) * 4, len = 14 + rnd() * 10 + (b === 0 ? 4 : 0);
    const ex = x0 + side * len, ey = y0 - 8 - rnd() * 10;
    limb(s, x0, y0, ex, ey, 3, tp2); tips.push([ex, ey]);
    if (rnd() < 0.7) { const fx = ex + side * 7, fy = ey - 7 - rnd() * 4; limb(s, ex, ey, fx, fy, 2, tp2); tips.push([fx, fy]); }
  }
  tips.push([top[0], top[1] - 8]); limb(s, top[0], top[1], top[0], top[1] - 8, 3, tp);
  for (const [x, y] of tips) {                                                       // copa: brasas / cristais / folhas / frutos
    if (zone === 0) { shadeBall(s, x, y, 6, 5, (v) => (v > 0.7 ? P.leaf[3] : v > 0.4 ? P.leaf[2] : v > 0.2 ? P.leaf[1] : P.leaf[0])); for (let k = 0; k < 4; k++) s.set(Math.round(x + (rnd() - 0.5) * 14), Math.round(y - 5 - rnd() * 6), P.leaf[3]); }
    else if (zone === 1) { for (let k = 0; k < 3; k++) { const a = -Math.PI / 2 + (k - 1) * 0.7, l = 7 + rnd() * 5; limb(s, x, y, x + Math.cos(a) * l, y + Math.sin(a) * l, 3, [P.leaf[0], P.leaf[1], P.leaf[3]]); } }
    else if (zone === 2) { for (let k = 0; k < 5; k++) shadeBall(s, x + (rnd() - 0.5) * 12, y + (rnd() - 0.5) * 8, 4, 3, (v) => (v > 0.65 ? P.leaf[3] : v > 0.4 ? P.leaf[2] : v > 0.2 ? P.leaf[1] : P.leaf[0])); }
    else { limb(s, x, y, x + 3, y + 10, 1, [P.trunk[0], P.trunk[1], P.trunk[2]]); shadeBall(s, x + 3, y + 12, 3.5, 4, (v) => (v > 0.6 ? P.leaf[3] : v > 0.35 ? P.leaf[2] : P.leaf[1])); }
  }
  if (zone === 0) for (let k = 0; k < 7; k++) { const y = base - 6 - k * 7; s.set(cx - 1 + Math.round(Math.sin(k) * 2), y, P.leaf[2]); s.set(cx + Math.round(Math.sin(k) * 2), y + 1, P.leaf[1]); }   // fendas acesas no tronco
  const img = s.finish(P.trunk[0]);
  img.envKind = 'coreTree'; img.coreZone = zone; img.coreGlow = zone === 2 ? 0.25 : 0.7; img.coreColor = P.glow; img.floraTree = true;
  return img;
}
function floraBush(zone, variant) {
  const P = FLORA_PAL[zone], W = 34, H = 26, s = new Sprite(W, H), rnd = mulberry32(9500 + zone * 53 + variant * 17);
  for (let k = 0; k < 6; k++) {
    const x = 4 + k * 5 + rnd() * 2, h = 8 + rnd() * 12, lean = (k - 2.5) * 1.6;
    if (zone === 0) { limb(s, x, H - 2, x + lean, H - 2 - h, 2, [P.trunk[0], P.trunk[1], P.trunk[2]]); shadeBall(s, x + lean, H - 3 - h, 3, 3, (v) => (v > 0.6 ? P.leaf[3] : v > 0.3 ? P.leaf[2] : P.leaf[1])); }
    else if (zone === 1) limb(s, x, H - 2, x + lean, H - 2 - h, 3, [P.leaf[0], P.leaf[1], P.leaf[3]]);
    else if (zone === 2) { limb(s, x, H - 2, x + lean, H - 2 - h, 1, [P.trunk[0], P.trunk[1], P.trunk[2]]); shadeBall(s, x + lean, H - 3 - h, 4, 3, (v) => (v > 0.6 ? P.leaf[3] : v > 0.3 ? P.leaf[2] : P.leaf[1])); }
    else { limb(s, x, H - 2, x + lean, H - 2 - h, 2, [P.trunk[0], P.trunk[1], P.trunk[3]]); s.set(Math.round(x + lean), H - 3 - h, P.leaf[3]); limb(s, x + lean, H - 2 - h * 0.6, x + lean + 3, H - 5 - h * 0.8, 1, [P.trunk[0], P.trunk[1], P.trunk[2]]); }
  }
  const img = s.finish(P.trunk[0]);
  img.envKind = 'coreBush'; img.coreZone = zone; img.coreGlow = zone === 3 ? 0.15 : 0.35; img.coreColor = P.glow; img.envFlex = 0.2;
  return img;
}
for (let z = 0; z < 4; z++) { CORE_ECO_ART[z].tree = Array.from({ length: 4 }, (_, i) => floraTree(z, i)); CORE_ECO_ART[z].bush = Array.from({ length: 4 }, (_, i) => floraBush(z, i)); }
ENV_HARVEST.coreBush = { item: ITEM.FIBER, lamina: true, volta: 260 };
{
  const base = generateEnvironmentDecoration;
  generateEnvironmentDecoration = function (world, x, y, ceiling = false) {
    if (ceiling || !inCoreBand(world, x, y) || !CORE_ECO_NATURAL.has(world.getTile(x, y))) return base(world, x, y, ceiling);
    const h = hash2(x, y, world.seed + 8601), zone = coreZoneAt(world, x), ay = y - 1, key = y * world.w + x;
    const treeSpot = (x + zone * 3) % 9 === 0 && h < 0.45, bushSpot = !treeSpot && x % 4 === 1 && h > 0.5 && h < 0.8;
    if (treeSpot || bushSpot) {
      if (world.getTile(x, ay) !== TILE.AIR || world.hasWater(x, ay) || world.touched?.has(key)) return base(world, x, y, ceiling);
      const tree = treeSpot, sprite = CORE_ECO_ART[zone][tree ? 'tree' : 'bush'][Math.floor(hash2(x, y, world.seed + 8602) * 4)], rows = Math.ceil(sprite.height / T), half = tree ? 2 : 1;
      for (let dy = 1; dy <= rows; dy++) for (let dx = -half; dx <= half; dx++) {
        const yy = y - dy;
        if (world.getTile(x + dx, yy) !== TILE.AIR || world.hasWater(x + dx, yy) || world.touched?.has(yy * world.w + x + dx)) return base(world, x, y, ceiling);
      }
      for (let dx = -half; dx <= half; dx++) if (!CORE_ECO_NATURAL.has(world.getTile(x + dx, y))) return base(world, x, y, ceiling);   // precisa de chão firme dos dois lados
      return sprite;
    }
    return base(world, x, y, ceiling);
  };
  const baseEmit = environmentEmissionAt;
  environmentEmissionAt = function (world, x, y) {
    if (inCoreBand(world, x, y) && world.getTile(x, y) === TILE.AIR) {
      const sp = environmentDecoration(world, x, y + 1);
      if (sp?.floraTree && sp.coreZone !== 2) return { level: 7, color: sp.coreColor };
    }
    return baseEmit(world, x, y);
  };
}
