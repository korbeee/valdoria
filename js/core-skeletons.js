'use strict';
// =====================================================================================
//  ESQUELETOS GIGANTES DO OSSÁRIO (4 espécies)
// =====================================================================================
// 0 Longo-pescoço   1 Fera de presas   2 Serpente   3 Alada.  Cada um é desenhado uma vez e guardado.
// Substitui skeletonSprite/drawCoreBackdrop de js/core-life.js. Carrega depois de core-plus.js.

const SKEL_NAMES = ['sauro', 'fera', 'serpente', 'asas'];
const BONE_L = [BONE.ol, BONE.md, BONE.hi], BONE_D = [BONE.ol, BONE.dk, BONE.md];
function boneBall(s, x, y, r) { shadeBall(s, x, y, r + 1, r, (v) => (v > 0.7 ? BONE.hi : v > 0.45 ? BONE.lt : v > 0.25 ? BONE.md : BONE.dk)); }
function boneChain(s, pts, w0, w1, pal) {                                             // osso grosso ao longo de uma curva, afinando
  for (let i = 0; i < pts.length - 1; i++) limb(s, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], Math.max(1, Math.round(lerp(w0, w1, i / (pts.length - 1)))), pal);
}
function bezier(p0, p1, p2, n = 16) { const o = []; for (let i = 0; i <= n; i++) { const t = i / n; o.push([(1 - t) * (1 - t) * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0], (1 - t) * (1 - t) * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]]); } return o; }
function boneSkull(s, x, y, size, d, opts = {}) {                                     // crânio: cúpula, focinho, órbita com brasa, dentes, mandíbula
  const L = size;
  shadeBall(s, x + d * L * 0.2, y, L * 0.62, L * 0.5, (v) => (v > 0.72 ? BONE.hi : v > 0.45 ? BONE.lt : v > 0.22 ? BONE.md : BONE.dk));
  const sx0 = x + d * L * 0.5, sx1 = x + d * L * 1.45;
  boneChain(s, [[sx0, y + L * 0.05], [(sx0 + sx1) / 2, y + L * 0.12], [sx1, y + L * 0.08]], L * 0.34, L * 0.22, BONE_L);
  shadeBall(s, x + d * L * 0.12, y - L * 0.08, L * 0.17, L * 0.15, () => [26, 18, 18]);
  shadeBall(s, x + d * L * 0.12, y - L * 0.08, L * 0.06, L * 0.06, () => [255, 150, 60]);
  limb(s, x - d * L * 0.15, y - L * 0.32, x + d * L * 0.4, y - L * 0.3, 2, BONE_D);
  const lowY = y + L * 0.32;
  boneChain(s, [[x - d * L * 0.15, lowY - 2], [x + d * L * 0.6, lowY + L * 0.12], [sx1 - d * 2, lowY + L * 0.06]], 4, 3, BONE_D);
  for (let k = 0; k < 7; k++) { const tx = sx0 + d * k * L * 0.13; limb(s, tx, y + L * 0.26, tx + d, y + L * 0.38, 1, BONE_L); limb(s, tx + d * 2, lowY + L * 0.08, tx + d * 2, lowY - L * 0.04, 1, BONE_D); }
  if (opts.horn) boneChain(s, bezier([x - d * L * 0.1, y - L * 0.4], [x - d * L * 0.2, y - L * 1.1], [x + d * L * 0.3, y - L * 1.3], 10), 4, 1, BONE_L);
}
function boneRib(s, x, top, floor, bulge, w, pal) {                                   // costela curva, mais larga em cima
  const pts = [], reach = floor - top;
  for (let k = 0; k <= 16; k++) { const t = k / 16; pts.push([x + Math.sin(t * Math.PI * 0.95) * bulge - t * 6, top + t * reach * 0.97]); }
  boneChain(s, pts, w, Math.max(2, w - 3), pal);
}
function boneSpine(s, fn, x0, x1, step, r0, r1, spikeUp) {                            // coluna de vértebras com espinhos
  for (let x = x0; x < x1; x += step) {
    const y = fn(x), r = lerp(r0, r1, (x - x0) / (x1 - x0));
    boneBall(s, x, y, r);
    if (spikeUp) limb(s, x, y - r, x - 2, y - r - spikeUp - Math.sin(x / 7) * 2, 2, BONE_L);
  }
}
function paintSkeleton(kind, len, seed) {
  const W = (len + 6) * T, H = 13 * T, floor = H - 4, s = new Sprite(W, H), rnd = mulberry32(seed);
  const post = () => {                                                                   // ossos soltos e pedaços redondos
    for (let k = 0; k < 7; k++) { const x = 20 + rnd() * (W - 60), a = rnd() * Math.PI, l = 8 + rnd() * 18; boneChain(s, [[x, floor - 2], [x + Math.cos(a) * l, floor - 2 - Math.abs(Math.sin(a)) * l * 0.35]], 4, 3, BONE_L); }
    for (let k = 0; k < 5; k++) boneBall(s, 16 + rnd() * (W - 40), floor - 1, 2 + rnd() * 2);
  };
  if (kind === 0) {                                                                      // ---- longo-pescoço
    const tailX = 8, hipX = W * 0.24, shX = W * 0.66, neckX = W - 110;
    const spine = (x) => x < hipX ? lerp(floor - 14, floor - 104, Math.pow(Math.max(0, x - tailX) / (hipX - tailX), 0.8)) : x < shX ? floor - 104 - Math.sin((x - hipX) / (shX - hipX) * Math.PI) * 26 : lerp(floor - 104, floor - 150, (x - shX) / (neckX - shX));
    for (const back of [true, false]) for (let x = hipX + 18 + (back ? 15 : 0); x < shX - 6; x += 31) boneRib(s, x, spine(x), floor, 26 + Math.sin((x - hipX) / (shX - hipX) * Math.PI) * 24, back ? 7 : 8, back ? BONE_D : BONE_L);
    for (const lx of [hipX + 4, shX - 6]) { const y = spine(lx); boneChain(s, [[lx, y + 6], [lx + 6, y + 40], [lx - 4, floor - 14]], 10, 8, BONE_L); boneChain(s, [[lx - 4, floor - 14], [lx - 14, floor - 2], [lx + 6, floor]], 9, 7, BONE_L); }
    boneSpine(s, spine, tailX, neckX, 8, 2.5, 6.5, 11);
    boneSkull(s, neckX + 16, floor - 138, 32, 1);
    post();
  } else if (kind === 1) {                                                               // ---- fera de presas
    const x0 = W * 0.16, x1 = W * 0.7, spine = (x) => floor - 92 - Math.sin((x - x0) / (x1 - x0) * Math.PI) * 18;
    for (const back of [true, false]) for (let x = x0 + 22 + (back ? 10 : 0); x < x1 - 6; x += 29) boneRib(s, x, spine(x), floor - 6, 20 + Math.sin((x - x0) / (x1 - x0) * Math.PI) * 14, back ? 7 : 9, back ? BONE_D : BONE_L);
    for (const [lx, back] of [[x0 + 8, true], [x0 + 40, false], [x1 - 36, true], [x1 - 6, false]]) { const y = spine(lx) + 10, pal = back ? BONE_D : BONE_L; boneChain(s, [[lx, y], [lx + (back ? -4 : 4), y + 38], [lx, floor - 12]], 9, 7, pal); boneChain(s, [[lx, floor - 12], [lx + 10, floor - 2], [lx + 18, floor]], 7, 6, pal); }
    boneSpine(s, spine, x0 - 24, x1 + 6, 8, 3, 6, 8);
    boneChain(s, bezier([x0 - 24, spine(x0)], [x0 - 60, floor - 60], [x0 - 70, floor - 20], 10), 6, 3, BONE_L);
    const hx = x1 + 52, hy = floor - 52;
    boneChain(s, bezier([x1, spine(x1)], [x1 + 24, spine(x1) + 10], [hx - 10, hy - 6], 8), 11, 8, BONE_L);
    boneSkull(s, hx, hy, 34, 1, { horn: true });
    boneChain(s, bezier([hx + 30, hy + 10], [hx + 40, hy + 52], [hx + 66, hy + 54], 12), 6, 2, BONE_L);   // presas curvas
    boneChain(s, bezier([hx + 18, hy + 12], [hx + 22, hy + 46], [hx + 46, hy + 50], 12), 5, 2, BONE_D);
    post();
  } else if (kind === 2) {                                                               // ---- serpente
    const arch = 3, aw = (W - 150) / arch;
    const y = (x) => floor - 6 - Math.max(0, Math.sin(((x - 10) % aw) / aw * Math.PI)) * 96 * (x < W - 150 ? 1 : 0.2);
    for (let a = 0; a < arch; a++) for (let k = 0; k < 10; k++) {
      const x = 10 + a * aw + (k + 1) * aw / 11, top = y(x);
      boneChain(s, [[x, top + 4], [x + 3, (top + floor) / 2], [x, floor - 4]], 4, 2, a % 2 ? BONE_D : BONE_L);
    }
    boneSpine(s, y, 10, W - 150, 5, 3, 5.5, 7);
    boneSkull(s, W - 100, floor - 46, 40, 1);
    boneChain(s, [[W - 140, floor - 10], [W - 112, floor - 40]], 7, 6, BONE_L);
    post();
  } else {                                                                               // ---- alada
    const cx = W * 0.5, spine = (x) => floor - 70 - Math.sin((x - cx + 80) / 160 * Math.PI) * 14;
    for (const back of [true, false]) for (let x = cx - 70 + (back ? 9 : 0); x < cx + 66; x += 26) boneRib(s, x, spine(x), floor - 4, 18 + Math.sin((x - cx + 80) / 160 * Math.PI) * 12, back ? 6 : 8, back ? BONE_D : BONE_L);
    boneSpine(s, spine, cx - 100, cx + 90, 8, 3, 5.5, 8);
    for (const sd of [-1, 1]) {                                                          // asas: braço e cinco dedos longos
      const sh = [cx + sd * 40, spine(cx + sd * 40) - 4], el = [cx + sd * 110, sh[1] - 56], wr = [cx + sd * 190, sh[1] - 96];
      boneChain(s, [sh, el, wr], 9, 6, sd < 0 ? BONE_D : BONE_L);
      for (let f = 0; f < 5; f++) { const tx = wr[0] + sd * (30 + f * 30), ty = wr[1] + 20 + f * 34 - (f === 0 ? 12 : 0); boneChain(s, bezier(wr, [wr[0] + sd * (20 + f * 14), wr[1] - 12 + f * 10], [tx, ty], 10), 4, 1, sd < 0 ? BONE_D : BONE_L); }
    }
    boneChain(s, bezier([cx + 100, spine(cx + 100)], [cx + 130, spine(cx + 100) - 10], [cx + 150, floor - 70], 8), 8, 6, BONE_L);
    boneSkull(s, cx + 170, floor - 64, 26, 1, { horn: true });
    for (const lx of [cx - 40, cx + 24]) { boneChain(s, [[lx, spine(lx) + 20], [lx + 4, floor - 26], [lx - 6, floor - 8]], 7, 5, BONE_L); boneChain(s, [[lx - 6, floor - 8], [lx - 20, floor - 1], [lx + 8, floor]], 5, 3, BONE_L); }
    post();
  }
  const img = s.finish(BONE.ol);
  img.getContext('2d').clearRect(0, floor + 1, W, H);
  return { img, W, H };
}
skeletonSprite = function (len, seed, kind = 0) {
  const key = kind + ':' + len + ':' + seed;
  if (!SKELETON_ART.has(key)) SKELETON_ART.set(key, paintSkeleton(kind, len, seed));
  return SKELETON_ART.get(key);
};
drawCoreBackdrop = function (ctx, game, vx, vy, vw, vh) {
  const ribs = game.world.coreRibs;
  if (!ribs) return;
  for (const r of ribs) {
    const x = r.x0 * T, y = r.floor * T;
    if (x > vx + vw + 40 || (r.x0 + r.len + 6) * T < vx - 40 || y < vy - 40 || y - 13 * T > vy + vh + 40) continue;
    const sp = skeletonSprite(r.len, r.seed, r.kind || 0);
    if (r.flip) { ctx.save(); ctx.translate(x + sp.W, 0); ctx.scale(-1, 1); ctx.drawImage(sp.img, 0, y - sp.H + 4); ctx.restore(); }
    else ctx.drawImage(sp.img, x, y - sp.H + 4);
  }
};
