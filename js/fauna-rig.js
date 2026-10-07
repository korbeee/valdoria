'use strict';
// =====================================================================================
//  RIG DA FAUNA NOVA: corpos peludos, pernas de dois ossos com pés plantados, cabeças, caudas e IA comum
// =====================================================================================
// Todo bicho novo (js/fauna-*.js) é um sprite desenhado em código, em escala 1:1 como o resto da fauna, olhando
// para a direita (o renderer espelha). Quadros: 0-7 andando, 8-11 parado, 12-13 no ar (subindo/descendo) e
// 14+ poses próprias de cada espécie (ataque, bola, susto...). O desenho de cada quadro é determinístico: a
// textura do pelo vem de coordenadas relativas ao corpo e acompanha a animação sem tremer.
// Carrega depois de fishing.js e antes dos arquivos de espécie.

const FR_TAU = Math.PI * 2;
const frInfo = (f) => ({ walk: f < 8, air: f === 12 || f === 13, up: f === 12, idle: f >= 8 && f <= 11 ? f - 8 : -1, sp: f >= 14 ? f - 14 : -1, ph: f < 8 ? (f / 8) * FR_TAU : 0 });
const frTone = (pal, l) => pal[clamp(Math.floor(l * pal.length), 0, pal.length - 1)];

// Elipse peluda: luz de cima/esquerda, tufos, barriga e um padrão opcional (listras, manchas...)
// o = { pal, seed, belly (+ clareia a barriga, - escurece), sq (1.6-3: elipse mais "quadrada"), pattern(dx, dy, nx, ny, idx, pal) -> cor|null, fur (0-1) }
function frFur(s, cx, cy, rx, ry, o) {
  const pal = o.pal, n = pal.length, seed = o.seed || 1, sq = o.sq || 2, fur = o.fur ?? 1;
  for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++)
    for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
      const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
      if (Math.abs(nx) ** sq + Math.abs(ny) ** sq > 1) continue;
      let l = 0.62 - ny * 0.46 - nx * 0.12;
      if (ny > 0.42) l += o.belly ?? 0;
      const dx = Math.round(x - cx), dy = Math.round(y - cy), h = hash2(dx, dy >> 1, seed);
      if (fur) {
        if (h < 0.1) l -= 0.1 * fur; else if (h > 0.9) l += 0.09 * fur;
        if (((dx * 2 + dy + 400) % 7) === 0) l += 0.05 * fur;
      }
      l += (BAYER4[(y & 3) * 4 + (x & 3)] / 16 - 0.5) * 0.12;
      const idx = clamp(Math.floor(l * n), 0, n - 1);
      s.set(x, y, (o.pattern && o.pattern(dx, dy, nx, ny, idx, pal)) || pal[idx]);
    }
}
// Perna de dois ossos até o pé; far = perna do lado de lá (mais escura); o = { L1, L2, w1, w2, pal, hoof, kneeDir, paw }
function frLeg(s, hx, hy, fx, fy, o, far) {
  if(o.paint){o.paint(s,hx,hy,fx,fy,o,far);return;}
  const [kx, ky] = ik(hx, hy, fx, fy, o.L1, o.L2, o.kneeDir ?? 1), pal = o.pal, c = far ? pal[0] : pal[1], hi = far ? pal[1] : pal[2];
  seg(s, hx, hy, kx, ky, o.w1, c);
  seg(s, kx, ky, fx, fy, o.w2, c);
  if (!far && o.w1 > 2) seg(s, hx - 0.6, hy - 0.4, kx - 0.6, ky - 0.4, Math.max(1, o.w1 - 2), hi);
  if (!far && o.w2 > 1) seg(s, kx - 0.4, ky, fx - 0.4, fy - 0.2, Math.max(1, o.w2 - 1.2), hi);
  if (o.bands) {                                                              // listras finas atravessando a perna (zebra)
    for (const [ax, ay, bx, by] of [[hx, hy, kx, ky], [kx, ky, fx, fy]]) { const n = Math.floor(Math.hypot(bx - ax, by - ay) / 3.6); for (let i = 1; i <= n; i++) { const t = (i - 0.5) / n, x = lerp(ax, bx, t), y = lerp(ay, by, t), hw = (ax === hx ? o.w1 : o.w2) / 2; seg(s, x - hw, y, x + hw, y, 1, far ? shade(o.bands, 0.8) : o.bands); } }
  }
  const hoof = o.hoof || pal[0], plen = o.paw ?? 2;
  seg(s, fx, fy, fx + plen, fy, o.paw === 0 ? 1.5 : 2, far ? shade(hoof, 0.8) : hoof);
}
// Patas orgânicas afiladas, com pés compactos para felinos e mamíferos pequenos.
function frPawLeg(s,hx,hy,fx,fy,o,far){
  const [kx,ky]=ik(hx,hy,fx,fy,o.L1,o.L2,o.kneeDir??1),pal=o.pal;
  const segment=(ax,ay,bx,by,wa,wb)=>{
    const dx=bx-ax,dy=by-ay,length=Math.max(.01,Math.hypot(dx,dy)),nx=-dy/length,ny=dx/length;
    frPoly(s,[[ax+nx*wa/2,ay+ny*wa/2],[bx+nx*wb/2,by+ny*wb/2],[bx-nx*wb/2,by-ny*wb/2],[ax-nx*wa/2,ay-ny*wa/2]],(x,y)=>{
      const side=(x+.5-ax)*nx+(y+.5-ay)*ny;
      return o.legPattern?.(x-hx,y-hy,far)||pal[far?0:side>.4?1:side<-.4?3:2];
    });
  };
  const ankle=Math.max(1,o.w2*.65);
  segment(hx,hy,kx,ky,o.w1,o.w2);
  shadeBall(s,kx,ky,o.w2*.55,o.w2*.55,()=>pal[far?0:2]);
  segment(kx,ky,fx,fy-1,o.w2,ankle);
  const paw=o.paw??2,foot=o.hoof||pal[2];
  frPoly(s,[[fx-ankle/2,fy-2],[fx+ankle/2,fy-2],[fx+paw,fy-.5],[fx+paw-1,fy+.5],[fx-ankle/2,fy+.5]],()=>far?pal[0]:foot);
  if(!far)s.set(Math.round(fx+paw-1),Math.round(fy),pal[1]);
}

// Alvo do pé numa passada: apoio desliza para trás, balanço sobe em arco e volta
function frFoot(u, hx, ground, stride, lift) {
  u = ((u % 1) + 1) % 1;
  if (u < 0.6) return [hx + stride * (0.5 - u / 0.6), ground];
  const t = (u - 0.6) / 0.4;
  return [hx + stride * (-0.5 + t), ground - Math.sin(t * Math.PI) * lift];
}
// Cadeia de bolas peludas ao longo de uma curva (pescoço, cauda, focinho...). pts = [[x, y, rx, ry], ...]
function frChain(s, pts, o) { for (const [x, y, rx, ry] of pts) frFur(s, x, y, rx, ry ?? rx, o); }
// Polígono preenchido (cor ou função (x, y) -> cor)
function frPoly(s, points, color) {
  const xs = points.map((p) => p[0]), ys = points.map((p) => p[1]);
  for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++)
    for (let x = Math.floor(Math.min(...xs)); x <= Math.ceil(Math.max(...xs)); x++) {
      let inside = false;
      for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const a = points[i], b = points[j];
        if ((a[1] > y + 0.5) !== (b[1] > y + 0.5) && x + 0.5 < ((b[0] - a[0]) * (y + 0.5 - a[1])) / (b[1] - a[1]) + a[0]) inside = !inside;
      }
      if (inside) s.set(x, y, typeof color === 'function' ? color(x, y) : color);
    }
}
// Olho: pixel escuro com brilho (fechado = traço)
function frEye(s, x, y, o = {}) {
  if (o.closed) { s.set(x, y, o.lid || [30, 22, 22]); s.set(x - 1, y, o.lid || [30, 22, 22]); return; }
  if (o.big) { s.set(x, y, o.iris || [20, 16, 18]); s.set(x - 1, y, o.iris || [20, 16, 18]); s.set(x, y - 1, o.iris || [20, 16, 18]); s.set(x - 1, y - 1, [255, 255, 255]); return; }
  s.set(x, y, o.iris || [22, 18, 20]); if (o.glint !== false) s.set(x, y - 1, [250, 250, 245]);
}

// ---------------------------------------------------------------- quadrúpede completo
// P = { W, H, ground, cx, cy, rx, ry, pal, seed, belly, pattern, sq, hipK, shK, legs: { fore: {...}, hind: {...} }, stride, lift, gait: 'trot'|'walk',
//       bob, head: { size, style, ... }, neck: [dx, dy] (do ombro à cabeça), tail: (s, x, y, f, info) => void, pose(info) -> { headDy, headDx, bodyDy, tilt } }
// animF = quadro cujo ciclo de pernas vale (um golpe pode usar a pose de "no ar" com a boca aberta, por exemplo)
function frQuad(s, f, P, animF = f) {
  const I = frInfo(animF), ph = I.ph, ground = P.ground, pal = P.pal;
  const bob = I.walk ? Math.round(Math.abs(Math.sin(ph * 2)) * (P.bob ?? 1)) : I.idle === 1 ? 1 : 0;
  const pose = (P.pose && P.pose(I, f)) || {};
  const bodyDy = (pose.bodyDy || 0) - (I.walk ? bob : 0) + (I.idle === 1 ? 0 : 0);
  const cx = P.cx + (pose.bodyDx || 0), cy = P.cy + bodyDy;
  const hipX = cx - P.rx * (P.hipK ?? 0.6), shX = cx + P.rx * (P.shK ?? 0.55), legY = cy + P.ry * 0.45;
  const hind = P.legs.hind, fore = P.legs.fore, seq = P.gait === 'walk' ? [0, 0.25, 0.5, 0.75] : [0, 0.5, 0.5, 0];   // traseira perto, dianteira perto, traseira longe, dianteira longe
  const foot = (hx, k, spec) => {
    if (I.walk) return frFoot(ph / FR_TAU + seq[k], hx, ground, P.stride * (spec.stride ?? 1), P.lift * (spec.lift ?? 1));
    if (I.air) {
      const hindLeg = spec === hind;
      return I.up ? [hx + (hindLeg ? -P.stride * 0.55 : P.stride * 0.55), ground - spec.L1 * 0.9 - (hindLeg ? 0 : 2)] : [hx + (hindLeg ? -P.stride * 0.15 : P.stride * 0.35), ground - spec.L1 * 0.55];
    }
    const off = k >= 2 ? (spec === hind ? -1.2 : 1.2) : 0;
    return [hx + off + (pose.footDx && spec === fore ? pose.footDx : 0), ground];
  };
  const legs = [[hipX, 0, hind, true], [shX, 1, fore, true]];
  // pernas de longe, rabo, corpo
  for (const [hx, k, spec] of [[hipX - 1, 2, hind], [shX + 1, 3, fore]]) { const [fx, fy] = foot(hx, k, spec); frLeg(s, hx, legY, fx, fy, spec, true); }
  if (P.tail) P.tail(s, cx - P.rx * 0.9, cy - P.ry * 0.2, f, I, bodyDy);
  frFur(s, cx, cy, P.rx, P.ry, { pal, seed: P.seed, belly: P.belly, pattern: P.pattern, sq: P.sq, fur: P.fur });
  if (P.haunch !== false) frFur(s, hipX + 0.5, cy + P.ry * 0.1, P.rx * 0.42, P.ry * 0.85, { pal, seed: (P.seed || 1) + 5, belly: P.belly, sq: 2.2, fur: P.fur, pattern: P.pattern });
  for (const [hx, k, spec] of [[hipX + 1, 0, hind], [shX - 1, 1, fore]]) { const [fx, fy] = foot(hx, k, spec); frLeg(s, hx, legY, fx, fy, spec, false); }
  // pescoço e cabeça
  const sh = [cx + P.rx * 0.62, cy - P.ry * 0.28], hd = P.head, neck = P.neck || [4, -3];
  const hx = sh[0] + neck[0] + (pose.headDx || 0), hy = sh[1] + neck[1] + (pose.headDy || 0) + (I.walk && !P.noHeadBob ? Math.round(Math.sin(ph * 2 + 0.6) * 0.6) : 0);
  const steps = Math.max(2, Math.round(Math.hypot(hx - sh[0], hy - sh[1]) / 2.2));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, r = lerp(P.ry * (P.neckThick ?? 0.7), (hd.skull?.[1] ?? 4) * 0.95, t);
    frFur(s, lerp(sh[0], hx, t), lerp(sh[1], hy, t), r * 1.05, r, { pal, seed: (P.seed || 1) + 9, pattern: P.neckPattern ?? P.pattern, fur: P.fur });
  }
  frHead(s, hx, hy, { ...hd, pal: hd.pal || pal, seed: (P.seed || 1) + 13, open: pose.open ?? hd.open, eyeClosed: pose.eyeClosed, tilt: (hd.tilt || 0) + (pose.tilt || 0), earTwitch: pose.earTwitch, pattern: hd.pattern });
  return { cx, cy, hx, hy, sh, I };
}

// ---------------------------------------------------------------- cabeça
// o = { pal, skull: [rx, ry], snout: { len, h, tip }, tilt, ears: { style, h, w, dx, pal, inner }, eye: { dx, dy, big }, nose, open, whisk, tooth, pattern }
function frHead(s, x, y, o) {
  const pal = o.pal, sk = o.skull || [4.5, 4], sn = o.snout || { len: 5, h: 2.2 }, tilt = o.tilt || 0, ca = Math.cos(tilt), sa = Math.sin(tilt);
  const at = (dx, dy) => [x + dx * ca - dy * sa, y + dx * sa + dy * ca];
  // orelhas atrás do crânio
  const E = o.ears;
  if (E && E.style !== 'none') {
    const ep = E.pal || pal, tw = o.earTwitch ? -1.5 : 0;
    const ear = (dx, back) => {
      const [bx, by] = at(E.dx + dx, -sk[1] * 0.55);
      const h = E.h * (back ? 0.93 : 1), w = E.w;
      if (E.style === 'round') { frFur(s, bx, by - h * 0.5, w * 0.5, h * 0.5, { pal: ep, seed: 31 }); if (E.inner) frFur(s, bx + 0.2, by - h * 0.45, Math.max(0.8, w * 0.28), h * 0.3, { pal: [E.inner, E.inner, E.inner], seed: 2, fur: 0 }); }
      else if (E.style === 'floppy') { frPoly(s, [[bx - w / 2, by], [bx + w / 2, by], [bx + w * 0.7 + tw, by + h], [bx - w * 0.2 + tw, by + h * 0.9]], (px, py) => ep[clamp(Math.floor(((py - by) / h) * 1.5 + 1), 0, ep.length - 1)]); }
      else {                                                                  // pontuda / longa
        frPoly(s, [[bx - w / 2, by + 1], [bx + tw * 0.3 + (E.lean || 0), by - h], [bx + w / 2, by + 1]], (px, py) => ep[clamp(Math.floor(((by + 1 - py) / (h + 1)) * 2.2 + (px < bx ? 1.1 : 0.2)), 0, ep.length - 1)]);
        if (E.inner) frPoly(s, [[bx - w * 0.22, by], [bx + tw * 0.2 + (E.lean || 0) * 0.8, by - h * 0.72], [bx + w * 0.22, by]], E.inner);
      }
    };
    ear(-1.8, true); ear(E.gap ?? 1.2, false);
  }
  // crânio e focinho
  frFur(s, x, y, sk[0], sk[1], { pal, seed: o.seed, pattern: o.pattern, fur: 0.8 });
  const len = sn.len, h0 = sn.h, steps = Math.max(2, Math.ceil(len / 1.6));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps, [px, py] = at(sk[0] * 0.6 + t * len + (sn.dx || 0), (sn.dy || 0) + t * (sn.drop ?? 0.8) + 0.6), r = lerp(h0, sn.tipH ?? h0 * 0.62, t);
    frFur(s, px, py, r * (sn.wide ?? 1.1), r, { pal, seed: (o.seed || 1) + i, pattern: o.pattern, fur: 0.5 });
  }
  const [tx, ty] = at(sk[0] * 0.6 + len + (sn.dx || 0) + (sn.tipH ?? h0 * 0.62) * 0.5, (sn.dy || 0) + (sn.drop ?? 0.8) + 0.4);
  if (o.open) {                                                                 // boca aberta: mandíbula desce
    const [jx, jy] = at(sk[0] * 0.2 + len * 0.55, h0 * 0.6 + o.open);
    frPoly(s, [[tx - len * 0.7, ty + 1], [jx + len * 0.4, jy + o.open * 0.4], [jx + len * 0.5, jy + o.open * 0.9 + 1], [tx - len * 0.9, ty + o.open + 1]], pal[0]);
    frPoly(s, [[tx - len * 0.55, ty + o.open * 0.5 + 0.5], [tx + 0.5, ty + o.open * 0.3], [tx - 0.3, ty + o.open * 0.6], [tx - len * 0.5, ty + o.open * 0.7]], o.mouth || [160, 50, 60]);
    if (o.tooth !== false) { s.set(Math.round(tx - 1), Math.round(ty + 1), [250, 248, 236]); s.set(Math.round(tx - 3), Math.round(ty + 1), [250, 248, 236]); }
  }
  s.set(Math.round(tx), Math.round(ty), o.nose || [26, 20, 24]); s.set(Math.round(tx - 1), Math.round(ty), o.nose || [26, 20, 24]);
  if (o.nose2) s.set(Math.round(tx - 1), Math.round(ty - 1), o.nose2);
  if (o.tooth === 'buck') { s.set(Math.round(tx - 1), Math.round(ty + 1), [252, 246, 224]); s.set(Math.round(tx), Math.round(ty + 1), [252, 246, 224]); }
  const [ex, ey] = at(o.eye?.dx ?? sk[0] * 0.45, o.eye?.dy ?? -sk[1] * 0.05);
  frEye(s, Math.round(ex), Math.round(ey), { closed: o.eyeClosed, big: o.eye?.big, iris: o.eye?.iris });
  if (o.whisk) for (let k = 0; k < 3; k++) { const [wx, wy] = at(sk[0] * 0.5 + len * 0.6, h0 * 0.4 + k * 0.7); s.set(Math.round(wx + 1), Math.round(wy), [236, 234, 224]); s.set(Math.round(wx + 2 + (k & 1)), Math.round(wy + (k - 1)), [220, 218, 210]); }
}

// ---------------------------------------------------------------- rabos
// estilos: 'bushy' (raposa), 'thin' (fino e comprido), 'curl' (esquilo), 'whip' (macaco), 'stub' (toquinho)
function frTail(style, pal, o = {}) {
  return (s, x, y, f, I, bodyDy) => {
    const ph = I.walk ? I.ph : (f * 0.7);
    const swing = I.walk ? Math.sin(ph + 1.2) * (o.swing ?? 2.2) : I.idle === 3 ? 2.5 : I.idle === 1 ? 0.8 : I.air ? (I.up ? 2.5 : -1) : 0;
    const seed = o.seed || 77;
    if (style === 'bushy') {
      const len = o.len ?? 12, rise = o.rise ?? 2;
      for (let i = 0; i <= 6; i++) { const t = i / 6, r = (o.w ?? 3.6) * (0.7 + Math.sin(t * Math.PI) * 0.6) * (1 - t * 0.2); frFur(s, x - t * len * 0.9, y + 1 + t * rise - Math.sin(t * Math.PI) * 1.2 + swing * t * t, r, r * 0.9, { pal, seed: seed + i, fur: 1.2 }); }
      if (o.tip) frFur(s, x - len * 0.95, y + 1 + rise + swing * 0.9, (o.w ?? 3.6) * 0.52, (o.w ?? 3.6) * 0.5, { pal: o.tip, seed: 5, fur: 0.6 });
    } else if (style === 'thin') {
      const len = o.len ?? 12;
      for (let i = 0; i <= len; i++) { const t = i / len, px = x - i * 0.95, py = y + 1 + t * t * (o.drop ?? 3) + swing * t * t * 1.3; seg(s, px, py, px - 1, py, (o.w ?? 2) * (1 - t * 0.6), t > 0.8 && o.tip ? o.tip : (o.rings && i % 5 < 2 && t > 0.15 ? o.rings : pal[t < 0.5 ? 1 : 0])); seg(s, px, py - 0.6, px - 1, py - 0.6, Math.max(1, (o.w ?? 2) * (1 - t * 0.6) - 1), pal[2]); }
    } else if (style === 'curl') {                                                 // esquilo: sobe e se enrola para a frente por cima das costas
      const n = 14, sway = swing * 0.5;
      for (let i = 0; i <= n; i++) {
        const t = i / n, px = x + 1 - 2.5 * Math.sin(t * 2.2) + t * t * 9.5 + sway * t * t, py = y - 3 - t * 14 + t * t * 4, r = 1.9 + Math.sin(Math.min(1, t * 1.15) * Math.PI) * 2.6;
        frFur(s, px, py, r, r * 0.95, { pal, seed: seed + i, fur: 1.3 });
      }
    } else if (style === 'whip') {                                                 // macaco: comprido, ponta enrolada
      for (let i = 0; i <= 18; i++) { const t = i / 18, px = x - i * 0.7 - Math.sin(t * 5 + ph) * 0.8 * swing * 0.4, py = y + 2 - Math.sin(t * Math.PI * 0.9) * 7 * (o.up ?? 1) + t * t * 3 + swing * 0.3 * t, ww = 2 - t * 0.6; seg(s, px, py, px, py, ww, pal[1]); seg(s, px, py - 0.5, px, py - 0.5, Math.max(1, ww - 1), pal[2]); }
    } else if (style === 'lizard') {                                              // lagarto grande: cauda grossa que afina e arrasta
      const len = o.len ?? 24;
      for (let i = 0; i <= len; i++) {
        const t = i / len, px = x - i * 1.15, py = y + 1 + t * (o.drop ?? 4) + Math.sin(ph * 1.0 + t * 3.2) * (I.walk ? 1.6 : 0.6) * t, r = (o.w ?? 4.4) * (1 - t * 0.82) + 0.5;
        frFur(s, px, py, r * 1.1, r, { pal, seed: seed + i, fur: 0.6, pattern: (dx, dy, nx, ny, idx) => (i % 6 < 2 ? pal[Math.max(0, idx - 1)] : (hash2(dx, dy, i) > 0.82 ? pal[Math.min(pal.length - 1, idx + 1)] : null)) });
      }
    } else if (style === 'stub') {
      frFur(s, x - 1, y + 1, o.w ?? 2.6, o.w ?? 2.4, { pal, seed, fur: 1 });
    }
  };
}

// ---------------------------------------------------------------- IA comum
// cfg = { paint, outline, gaitDiv, hop: { vy, wait }, scare (blocos), flee, wander, sight, atk: { kind: 'lunge'|'bite'|'strike'|'puff', reach, windup, recover, dmg, cd, windFrame, strikeFrame },
//         frames: { idle(m) -> 8..11 | custom }, pose(m) -> frame fixo | null, onUpdate(m, dt, w, p) , night }
function faunaHook(cfg) {
  const idleFrame = (m) => 8 + [0, 1, 0, 1, 2, 0, 1, 3][Math.floor(m.clock * (cfg.idleRate ?? 1.8)) % 8];
  return {
    paint: cfg.paint, outline: cfg.outline ?? [22, 16, 18],
    setup(m) { m.state = 'wander'; m.stateT = 0; m.thinkTimer = Math.random() * 2; m.dir = 0; m.atkCd = 1 + Math.random(); m.aware = !cfg.atk; m.jumpWait = 0; cfg.setup?.(m); },
    frame(m) {
      const custom = cfg.pose?.(m); if (custom != null) return custom;
      if (cfg.atk && m.state === 'windup') return cfg.atk.windFrame;
      if (cfg.atk && m.state === 'strike') return cfg.atk.strikeFrame;
      if (!m.onGround && !cfg.noAirFrames) return m.vy < 0 ? 12 : 13;
      if (Math.abs(m.vx) > 3 || (cfg.alwaysWalk && m.dir)) return Math.floor(m.gait) % 8;
      return cfg.frames?.idle ? cfg.frames.idle(m, idleFrame(m)) : idleFrame(m);
    },
    hit(m, damage, fromX) {
      if (cfg.onHit) cfg.onHit(m, damage, fromX);
      Pig.prototype.hit.call(m, damage, fromX);
      if (cfg.atk) m.aware = true;
      if (cfg.heavy) { m.vx *= 0.3; m.vy = Math.max(m.vy, -90); }
      if (m.state === 'windup') { m.state = 'wander'; m.atkCd = (cfg.atk?.cd || 1.5) * 0.6; }
    },
    update(m, dt, w, p) {
      m.clock += dt; m.stateT += dt; m.hurtTimer = Math.max(0, m.hurtTimer - dt); m.fleeTimer = Math.max(0, m.fleeTimer - dt); m.thinkTimer -= dt; m.jumpWait -= dt; m.atkCd -= dt;
      const dx = p.cx - m.cx, dist = Math.hypot(dx, p.cy - m.cy), A = cfg.atk, sameLevel = Math.abs(p.cy - m.cy) < 3 * T;
      let want = 0, speedK = cfg.wander ?? 0.5;
      if (A) {
        const sight = (cfg.sight ?? 12) * T;
        if (!m.aware && dist < sight && (sameLevel || dist < sight * 0.5)) { m.aware = true; if (SFX[MOB_SFX[m.kind] + 'Alert']) mobSfx(m, 'Alert'); }
        else if (m.aware && dist > sight * 2) m.aware = false;
        if (m.state === 'wander' || m.state === 'chase') {
          m.state = m.aware ? 'chase' : 'wander';
          if (m.aware) {
            speedK = cfg.chase ?? 1.25;
            want = Math.abs(dx) > A.reach * 0.55 ? Math.sign(dx) : 0;
            if (m.atkCd <= 0 && Math.abs(dx) < A.reach && sameLevel && m.onGround) { m.state = 'windup'; m.stateT = 0; m.facing = Math.sign(dx) || m.facing; m.struck = false; }
          }
        } else if (m.state === 'windup') {
          want = 0; speedK = 0;
          if (m.stateT > A.windup) { m.state = 'strike'; m.stateT = 0; m.struck = false; m.facing = Math.sign(p.cx - m.cx) || m.facing; }
        } else if (m.state === 'strike') {
          speedK = 0;
          if (!m.struck) {
            m.struck = true;
            if (A.kind === 'lunge') { m.vx = m.facing * m.def.speed * (A.dash ?? 3.4); m.vy = -(A.hop ?? 150); mobSfx(m, 'Attack'); }
            else if (A.kind === 'puff') cfg.puff?.(m, p);
            else if (A.kind === 'bite' || A.kind === 'strike') {
              const fx = m.cx + m.facing * A.reach * 0.55;
              mobSfx(m, 'Attack');
              if (p.invulnerable <= 0 && Math.abs(p.cx - fx) < A.reach * 0.65 + 6 && Math.abs(p.cy - m.cy) < 2.2 * T && Math.sign(p.cx - m.cx) === m.facing) damageMonsterPlayer(game, A.dmg ?? m.def.damage, m.cx);
            }
          }
          if (m.stateT > A.recover) { m.state = m.aware ? 'chase' : 'wander'; m.stateT = 0; m.atkCd = (A.cd ?? 1.6) + Math.random() * 0.6; }
        }
        if (m.state === 'wander' || !m.aware) {
          if (m.thinkTimer <= 0) { m.dir = Math.random() < (cfg.idleChance ?? 0.4) ? 0 : Math.random() < 0.5 ? -1 : 1; m.thinkTimer = 1.5 + Math.random() * 3.5; }
          want = m.dir;
        }
      } else {
        // bicho manso: passeia, para para a pose de espera e foge de quem chega perto
        const scare = (cfg.scare ?? 0) * T;
        if (scare && dist < scare && m.fleeTimer <= 0 && Math.abs(p.vx || 0) + Math.abs(dx) < 99999) { m.fleeTimer = 2.2 + Math.random(); m.fleeFrom = Math.sign(dx) || 1; }
        if (m.fleeTimer > 0) { want = m.fleeTimer > 0 && m.hurtTimer <= 0 ? -(m.fleeFrom || Math.sign(dx) || 1) : 0; speedK = cfg.flee ?? 1.7; }
        else {
          if (m.thinkTimer <= 0) { m.dir = Math.random() < (cfg.idleChance ?? 0.45) ? 0 : Math.random() < 0.5 ? -1 : 1; m.thinkTimer = 1 + Math.random() * 3.2; }
          want = m.dir;
        }
        if (m.fleeTimer > 0 && !cfg.noFleeTurn) m.dir = want;
      }
      if (cfg.onUpdate) { const ctx = { dist, dx, want, A, speedK }; cfg.onUpdate(m, dt, w, p, ctx); want = ctx.want; speedK = ctx.speedK; }   // a espécie pode mudar para onde vai e a que velocidade
      if (want && m.onGround && !safeStep(w, m, want, m.aware || m.fleeTimer > 0)) want = 0;
      if (m.hurtTimer <= 0 && m.state !== 'strike') m.vx = want * m.def.speed * speedK;
      if (want) m.facing = want;
      if (cfg.hop && want && m.onGround && m.jumpWait <= 0 && m.state !== 'windup') { m.vy = -cfg.hop.vy; m.jumpWait = cfg.hop.wait * (m.fleeTimer > 0 ? 0.7 : 1); m.onGround = false; }
      if (A) m.damage = m.state === 'windup' ? 0 : m.def.damage;
      const oldX = m.x, wanted = m.vx;
      m.applyGravity(dt); m.moveX(m.vx * dt, w);
      if (wanted && m.vx === 0 && m.onGround && m.state !== 'strike') m.vy = -300;
      m.moveY(m.vy * dt, w);
      if (m.state === 'strike' && A.kind === 'lunge' && m.onGround && m.stateT > 0.12) m.vx *= 0.6;
      m.gait += Math.abs(m.x - oldX) / (cfg.gaitDiv ?? 3); m.anim = m.gait; m.settleStep(dt);
    },
  };
}

// Registra uma espécie: definição em WILDLIFE + ganchos de desenho/IA + tamanho do quadro, paleta e voz
// pad = margem de cada lado do quadro: rabos, patas e bocas esticadas não são cortados; o sprite continua centrado no corpo
function frSpecies(kind, def, hook, size, pal, sfx) {
  const pad = def.pad ?? 10, inner = hook.paint;
  size = [size[0] + pad * 2, size[1]];
  hook.paint = (s, p, f) => inner({ set: (x, y, c, a) => s.set(x + pad, y, c, a), opaque: (x, y) => s.opaque(x + pad, y), get w() { return s.w - pad * 2; }, h: s.h }, p, f);
  WILDLIFE[kind] = { shape: kind, ...def };
  if (!WILDLIFE[kind].where && def.biomes) WILDLIFE[kind].where = def.biomes.map((b) => BIOME_NAMES[b]).join(' e ');
  SHAPE_HOOKS[kind] = hook;
  WILD_SIZES[kind] = size;
  WILD_PALETTES[kind] = pal;
  MOB_SFX[kind] = sfx;
}
