'use strict';
// =====================================================================================
//  FÓSSEIS PEQUENOS NAS PAREDES DO OSSÁRIO
// =====================================================================================
// Além das costelas gigantes (core-skeletons.js), o fundo das cavernas do Ossário guarda bichos menores
// presos na pedra: amonite em espiral, peixe, presa, trilobita e caveirinha. Só desenho, atrás de tudo.
// Carrega depois de core-skeletons.js.

const FOSSIL_PAL = [[58, 46, 40], [128, 112, 90], [200, 184, 150], [246, 236, 206]];
function fossilSprite(kind, variant) {
  const P = FOSSIL_PAL, rnd = mulberry32(6100 + kind * 37 + variant * 11);
  const ST = [78, 64, 58];                                                             // pedra em volta (o fóssil é um relevo mais claro)
  const px = (s, w, h, fn) => { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = fn(x + 0.5, y + 0.5); if (c) s.set(x, y, c); } };
  let s;
  if (kind === 0) {                                                                    // amonite: casca em espiral com costelas radiais
    const R = 14 + variant * 3, S = R * 2 + 4; s = new Sprite(S, S);
    px(s, S, S, (x, y) => {
      const dx = x - S / 2, dy = y - S / 2 - 0.5, r = Math.hypot(dx, dy); if (r > R) return null;
      const th = Math.atan2(dy, dx), f = r / (R * 0.34) - th / (Math.PI * 2) * 1.0, band = f - Math.floor(f);
      let c = band < 0.12 ? P[0] : band < 0.35 ? P[3] : band < 0.7 ? P[2] : P[1];
      if (Math.floor((th + Math.PI) / (Math.PI * 2) * (10 + r / 2)) % 2 === 0 && band > 0.45) c = c === P[2] ? P[1] : P[2];   // costelas
      if (r < 2) c = P[0]; if (r > R - 1.2) c = P[0];
      return c;
    });
  } else if (kind === 1) {                                                             // peixe: silhueta em relevo, espinha, costelas, crânio e cauda
    const L = 42 + variant * 8, S0 = L + 10; s = new Sprite(S0, 26); const cy = 13;
    const hh = (x) => (x < 6 ? 0 : x < 14 ? 3 + (x - 6) * 0.55 : x < L - 12 ? 7.4 - (x - 14) * 0.12 : Math.max(0, 6.5 - (x - (L - 12)) * 0.5));
    px(s, S0, 26, (x, y) => {
      const d = Math.abs(y - cy);
      if (x > L - 6 && x < L + 8) { const t = (x - (L - 6)) / 14; if (d < 1 + t * 9 && d > t * 9 - 3.5 + 1) return P[1]; if (d < 1) return P[2]; return null; }   // cauda bifurcada
      if (d < hh(x)) return d > hh(x) - 1 ? P[1] : ST;
      return null;
    });
    for (let x = 14; x < L - 8; x++) { s.set(x, cy, P[3]); s.set(x, cy + 1, P[2]); }   // coluna
    for (let i = 0; i < 8; i++) { const x = 17 + i * ((L - 32) / 7), h = 5.6 - Math.abs(i - 3) * 0.3; limb(s, x, cy, x - 2.5, cy - h, 1, [P[1], P[2], P[3]]); limb(s, x, cy, x - 2.5, cy + h, 1, [P[1], P[2], P[3]]); }
    shadeBall(s, 9, cy, 7, 6, (v) => (v > 0.6 ? P[3] : v > 0.35 ? P[2] : P[1])); shadeBall(s, 7, cy - 1, 2, 2, () => P[0]); limb(s, 3, cy + 3, 9, cy + 3, 1, [P[0], P[1], P[2]]);   // crânio, órbita e mandíbula
  } else if (kind === 2) {                                                             // presa curva, com anéis de crescimento
    const L = 34 + variant * 8; s = new Sprite(L, L);
    for (let t = 0; t <= 1.0001; t += 0.012) {
      const x = 5 + t * (L - 11), y = L - 5 - Math.sin(t * 1.55) * (L - 11), r = 5.2 * (1 - t) + 0.6;
      shadeBall(s, x, y, r, r, (v, dx, dy) => { if (Math.floor(t * 18) % 3 === 0 && v < 0.5) return P[0]; return dx + dy < -0.15 ? P[3] : v > 0.35 ? P[2] : P[1]; });
    }
  } else if (kind === 3) {                                                             // trilobita: escudo da cabeça, corpo em segmentos, cauda
    const W2 = 36, H2 = 30; s = new Sprite(W2, H2);
    px(s, W2, H2, (x, y) => {
      const dx = (x - W2 / 2), ay = y / H2; let hw = ay < 0.28 ? 10 * Math.sqrt(Math.max(0, 1 - Math.pow((0.28 - ay) / 0.28, 2) * 0.9)) : ay < 0.8 ? 10 - (ay - 0.28) * 4 : 8 * Math.sqrt(Math.max(0, 1 - Math.pow((ay - 0.8) / 0.2, 2)));
      if (Math.abs(dx) > hw || hw < 1) return null;
      if (Math.abs(dx) > hw - 1) return P[0];
      const lobe = Math.abs(dx) < 3.2, seg = ay > 0.28 && ay < 0.8 && Math.floor(y / 2.6) % 2 === 0;
      let c = lobe ? P[3] : P[2];
      if (seg) c = lobe ? P[2] : P[1];
      if (ay < 0.28 && Math.abs(dx) > 5 && Math.abs(dx) < 7 && ay > 0.12 && ay < 0.2) c = P[0];                                   // olhos
      return c;
    });
  } else {                                                                             // crânio de réptil: focinho comprido, órbita, dentes
    const W2 = 46 + variant * 6, H2 = 26; s = new Sprite(W2, H2);
    px(s, W2, H2, (x, y) => {
      const t = x / W2, top = 5 + Math.pow(Math.max(0, 0.45 - t), 1.4) * 14 - (t < 0.3 ? 4 : 0) , bot = 15 + (t < 0.45 ? 3 : 0) - (t > 0.75 ? 2 : 0) + (t > 0.9 ? 1 : 0);
      const lo = t < 0.45 ? 3 + (0.45 - t) * 12 : 6 + (t - 0.45) * 5;
      if (y < lo || y > bot + (t < 0.2 ? 2 : 0)) return null;
      return y < lo + 1 || y > bot - 0.5 ? P[0] : (y < lo + 3 ? P[3] : y < (lo + bot) / 2 ? P[2] : P[1]);
    });
    shadeBall(s, 11, 10, 4, 4, () => P[0]); s.set(10, 9, [255, 214, 120]);             // órbita
    for (let x = 22 + 0; x < W2 - 4; x += 3) { s.set(x, 15, P[3]); s.set(x, 16, P[3]); s.set(x, 17, P[2]); }   // dentes
    for (let x = 20; x < W2 - 8; x += 6) s.set(x, 8, P[0]);                             // narinas / poros
  }
  const img = s.finish(P[0]);
  img.fossilAlpha = 0.9;
  return img;
}
const FOSSIL_SMALL = Array.from({ length: 5 }, (_, k) => [0, 1].map((v) => fossilSprite(k, v)));

function placeSmallFossils(w) {
  if (!w.coreSegments) return;
  const rnd = mulberry32(w.seed + 6277), W = w.w;
  w.coreSmallFossils = [];
  for (const sg of w.coreSegments) {
    if (sg.zone !== CORE_ZONE.OSSARIO) continue;
    for (let x = sg.x0 + 6; x < sg.x1 - 6; x += 7 + Math.floor(rnd() * 9)) {
      const kind = Math.floor(rnd() * 5), variant = Math.floor(rnd() * 2), sp = FOSSIL_SMALL[kind][variant];
      const tw = Math.ceil(sp.width / T), th = Math.ceil(sp.height / T);
      for (let tries = 0; tries < 14; tries++) {                                       // procura um vão de parede dentro da caverna
        const y = w.coreTop[x] + 6 + Math.floor(rnd() * (w.h - w.coreTop[x] - 24));
        let ok = true;
        for (let dy = 0; dy < th && ok; dy++) for (let dx = 0; dx < tw && ok; dx++) { const tx = x + dx, ty = y + dy; ok = w.inBounds(tx, ty) && w.tiles[ty * W + tx] === TILE.AIR && w.walls[ty * W + tx] !== WALL.NONE; }
        if (ok) { w.coreSmallFossils.push({ x, y, kind, variant, flip: rnd() < 0.5 }); break; }
      }
    }
  }
}
{
  const baseFinal = finalizeCore;
  finalizeCore = function (w) { baseFinal(w); placeSmallFossils(w); };
  const baseBackdrop = drawCoreBackdrop;
  drawCoreBackdrop = function (ctx, game, vx, vy, vw, vh) {
    const list = game.world.coreSmallFossils;
    if (list?.length) {
      ctx.save();
      for (const f of list) {
        const x = f.x * T, y = f.y * T;
        if (x > vx + vw || x + 6 * T < vx || y > vy + vh || y + 6 * T < vy) continue;
        const sp = FOSSIL_SMALL[f.kind][f.variant];
        ctx.globalAlpha = sp.fossilAlpha;
        if (f.flip) { ctx.save(); ctx.translate(x + sp.width, 0); ctx.scale(-1, 1); ctx.drawImage(sp, 0, y); ctx.restore(); } else ctx.drawImage(sp, x, y);
      }
      ctx.restore();
    }
    baseBackdrop(ctx, game, vx, vy, vw, vh);
  };
}
