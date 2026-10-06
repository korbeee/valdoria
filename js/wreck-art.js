'use strict';

// Sprites procedurais do avião: aeronave inteira (abertura) e destroços espalhados pelo mapa.
const HULL = {
  hi: [230, 233, 228], light: [200, 206, 204], mid: [164, 172, 175], dark: [120, 128, 134], deep: [80, 86, 96],
  stripe: [50, 86, 138], stripeHi: [78, 118, 170], accent: [196, 70, 50], glass: [38, 56, 68], glassHi: [104, 138, 152],
  inner: [30, 26, 28], rib: [86, 78, 72], torn: [236, 232, 220], soot: [50, 44, 42], char: [24, 20, 20],
};
const WRECK_OUTLINE = [20, 18, 20];

// Tom do casco conforme a altura relativa (0 = topo, 1 = base)
function hullTone(v) {
  if (v < 0.07) return HULL.hi;
  if (v < 0.42) return HULL.light;
  if (v < 0.54) return HULL.mid;
  if (v < 0.61) return HULL.stripe;
  if (v < 0.65) return HULL.accent;
  if (v < 0.86) return HULL.mid;
  return v < 0.94 ? HULL.dark : HULL.deep;
}

// Fuligem: manchas escuras e partes carbonizadas
function sooty(c, x, y, seed, amount) {
  const n = fbm2(x * 0.07, y * 0.09, seed, 3) + amount;
  if (n > 0.92) return HULL.char;
  if (n > 0.74) return lerpColor(c, HULL.soot, 0.8);
  if (n > 0.62) return shade(c, 0.74);
  return c;
}

// Rasgos no casco mostrando o interior escuro
function punchHoles(s, rnd, count, x0, x1, y0, y1) {
  for (let k = 0; k < count; k++) {
    const cx = x0 + rnd() * (x1 - x0), cy = y0 + rnd() * (y1 - y0), r = 3 + rnd() * 6;
    for (let y = Math.floor(cy - r - 2); y <= cy + r + 2; y++)
      for (let x = Math.floor(cx - r - 2); x <= cx + r + 2; x++) {
        if (!s.opaque(x, y)) continue;
        const d = Math.hypot(x - cx, (y - cy) * 1.2) / (r * (0.7 + hash2(x, y, k + 9) * 0.5));
        if (d < 0.85) s.set(x, y, (x + y) % 5 ? HULL.inner : HULL.rib);
        else if (d < 1.1) s.set(x, y, hash2(x, y, k) < 0.5 ? HULL.torn : HULL.char);
      }
  }
}

function flipCanvas(c) {
  const f = makeCanvas(c.width, c.height), g = f.getContext('2d');
  g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(c, 0, 0);
  return f;
}

// Ponta rasgada: interior com nervuras e borda de metal retorcido
function tornEnd(s, x, y, edge, side, depth) {
  const d = side > 0 ? edge - x : x - edge;
  if (d < 0) return false;
  if (d === 0 || d === depth) s.set(x, y, HULL.torn);
  else if (d < depth) s.set(x, y, x % 4 === 0 ? HULL.rib : HULL.inner);
  else return false;
  return true;
}

// Seção do meio da fuselagem (onde o jogador acorda)
function genFuselageWreck(seed) {
  const W = 204, H = 66, R = 26, s = new Sprite(W, H), rnd = mulberry32(seed);
  for (let x = 0; x < W; x++) {
    const bottom = H - 7 + Math.round((x - W / 2) * 0.045), top = bottom - R * 2;
    for (let y = Math.max(0, top); y <= bottom; y++) {
      const xl = 5 + Math.floor((noise1(y * 0.35, seed) + 1) * 5), xr = W - 5 - Math.floor((noise1(y * 0.3, seed + 1) + 1) * 8);
      if (x < xl || x > xr) continue;
      if (tornEnd(s, x, y, xr, 1, 10) || tornEnd(s, x, y, xl, -1, 5)) continue;
      const v = (y - top) / (R * 2);
      let c = hullTone(v);
      if (v > 0.25 && v < 0.39 && (x - 22) % 13 < 6 && x > xl + 16 && x < xr - 18) c = v < 0.29 ? HULL.glassHi : HULL.glass;
      if ((x === 46 || x === 60) && v > 0.18 && v < 0.9) c = HULL.deep;
      if (x > 46 && x < 60 && Math.abs(v - 0.18) < 0.02) c = HULL.deep;
      if (x % 32 === 0 && v > 0.1) c = shade(c, 0.88);
      s.set(x, y, sooty(c, x, y, seed, 0.02 + (x / W) * 0.22));
    }
  }
  punchHoles(s, rnd, 4, 70, 180, 14, 50);
  return { canvas: s.finish(WRECK_OUTLINE), sink: 5 };
}

// Cabine com o nariz enterrado no chão
function genNoseWreck(seed) {
  const W = 144, H = 84, R = 24, L = 48, s = new Sprite(W, H), rnd = mulberry32(seed);
  for (let x = 0; x < W; x++) {
    const r = x < L ? R * Math.sqrt(1 - ((L - x) / L) ** 2) : R;
    const c0 = H - 6 - R - 22 + Math.round((W - x) * 0.155);
    const top = c0 - r, bottom = c0 + r * 0.9 + (R - r) * 0.1;
    for (let y = Math.max(0, Math.floor(top)); y <= bottom && y < H; y++) {
      const xr = W - 5 - Math.floor((noise1(y * 0.33, seed) + 1) * 7);
      if (x > xr) continue;
      if (tornEnd(s, x, y, xr, 1, 9)) continue;
      const v = (y - top) / Math.max(1, bottom - top);
      let c = hullTone(v);
      if (x > 20 && x < 42 && v > 0.16 && v < 0.33 && ((x - y * 0.6) | 0) % 8 < 5) c = HULL.glass;
      if (x > 56 && x < xr - 14 && v > 0.27 && v < 0.4 && (x - 56) % 13 < 6) c = HULL.glass;
      if (x < 9 + hash2(0, y, seed) * 6) c = hash2(x, y, seed) < 0.5 ? HULL.char : HULL.deep; // metal amassado
      s.set(x, y, sooty(c, x, y, seed + 3, 0.12));
    }
  }
  punchHoles(s, rnd, 3, 50, 120, 20, 60);
  return { canvas: flipCanvas(s.finish(WRECK_OUTLINE)), sink: 4 };
}

// Cauda com estabilizador vertical
function genTailWreck(seed) {
  const W = 156, H = 112, s = new Sprite(W, H), rnd = mulberry32(seed);
  const rad = (x) => (x < 80 ? 24 : 24 - (x - 80) * 0.23);
  const bot = (x) => H - 6 - (x > 60 ? (x - 60) * 0.38 : 0);
  const topY = (x) => bot(x) - rad(x) * 2;
  for (let x = 0; x < W - 4; x++) {
    for (let y = 0; y <= bot(x); y++) {
      const xl = 4 + Math.floor((noise1(y * 0.4, seed) + 1) * 5);
      if (x < xl) continue;
      const inFin = x >= 86 && y >= 6 && y < topY(x) && x >= 128 - (y - 6) * 0.62 && !(y < 16 && x > 146);
      if (!inFin && y < topY(x)) continue;
      if (!inFin && tornEnd(s, x, y, xl, -1, 6)) continue;
      let c;
      if (inFin) {
        const band = x * 0.62 + y;
        c = x < 131 - (y - 6) * 0.62 ? HULL.hi : band > 118 && band < 132 ? HULL.stripe : band >= 132 && band < 136 ? HULL.accent : HULL.light;
        if (Math.hypot(x - 134, y - 36) < 7) c = Math.hypot(x - 134, y - 36) < 4 ? HULL.torn : HULL.accent;
      } else {
        c = hullTone((y - topY(x)) / (rad(x) * 2));
        if (x > 106 && Math.abs(y - (topY(x) + rad(x) * 0.9)) < 2) c = HULL.deep; // estabilizador horizontal
      }
      s.set(x, y, sooty(c, x, y, seed + 5, 0.06));
    }
  }
  punchHoles(s, rnd, 3, 20, 100, 70, 100);
  return { canvas: s.finish(WRECK_OUTLINE), sink: 4 };
}

// Asa partida, apoiada inclinada no chão
function genWingWreck(seed) {
  const W = 182, H = 52, s = new Sprite(W, H), rnd = mulberry32(seed);
  for (let x = 0; x < W; x++) {
    const top = Math.round(lerp(28, 16, x / W)), bottom = Math.round(lerp(48, 26, x / W));
    const wing = x >= 166 && x <= 175;
    for (let y = wing ? top - 15 : top; y <= bottom; y++) {
      const xl = 3 + Math.floor((noise1(y * 0.5, seed) + 1) * 6);
      if (x < xl || x > 175) continue;
      if (y < top && x < 166 + (top - y) * 0.35) continue;
      const v = (y - top) / (bottom - top);
      let c = v < 0 ? HULL.light : v < 0.14 ? HULL.hi : v < 0.62 ? HULL.light : v < 0.76 ? HULL.mid : HULL.dark;
      if (Math.abs(v - 0.76) < 0.06 || (v > 0.76 && x % 34 === 0)) c = HULL.deep;
      if (Math.abs(v - 0.4) < 0.05 && x % 6 === 0) c = shade(c, 0.9);
      if (x === xl) c = HULL.torn;
      s.set(x, y, sooty(c, x, y, seed + 7, 0.24 - (x / W) * 0.26));
    }
  }
  punchHoles(s, rnd, 2, 30, 120, 22, 40);
  return { canvas: s.finish(WRECK_OUTLINE), sink: 6 };
}

// Turbina solta com as pás à mostra
function genEngineWreck(seed) {
  const W = 76, H = 50, cy = 25, s = new Sprite(W, H);
  for (let x = 12; x < 72; x++) {
    const r = x > 58 ? 19 - (x - 58) * 0.9 : 19;
    for (let y = Math.floor(cy - r); y <= cy + r; y++) {
      const v = (y - (cy - r)) / (r * 2);
      let c = v < 0.1 ? HULL.hi : v < 0.5 ? HULL.light : v < 0.85 ? HULL.mid : HULL.dark;
      if (x > 58) c = shade(HULL.deep, 0.8);
      if (x === 30 || x === 48) c = shade(c, 0.85);
      s.set(x, y, sooty(c, x, y, seed, 0.18));
    }
  }
  for (let y = 0; y < H; y++)
    for (let x = 2; x < 24; x++) {
      const dx = (x - 13) / 8, dy = (y - cy) / 19, d = Math.hypot(dx, dy);
      if (d > 1) continue;
      if (d > 0.78) { s.set(x, y, hash2(x, y, seed) < 0.3 ? HULL.char : HULL.torn); continue; }
      const a = Math.atan2(dy, dx);
      s.set(x, y, d < 0.22 ? [150, 150, 146] : ((a * 5 / Math.PI + d * 2) | 0) % 2 ? [74, 74, 80] : [36, 36, 42]);
    }
  for (let x = 34; x < 48; x++) for (let y = cy - 25; y < cy - 18; y++) s.set(x, y, HULL.deep);
  return { canvas: s.finish(WRECK_OUTLINE), sink: 3 };
}

// Pedaços pequenos: chapa, poltrona, mala, roda
function genDebris(kind, seed) {
  const rnd = mulberry32(seed);
  let s;
  if (kind === 'panel') {
    s = new Sprite(28, 12);
    for (let x = 1; x < 27; x++) for (let y = 2 + (x >> 3); y < 10 + ((x * 3) >> 5); y++) if (hash2(x, y, seed) > 0.06)
      s.set(x, y, sooty((x + y) % 7 ? HULL.light : HULL.mid, x, y, seed, 0.1));
  } else if (kind === 'seat') {
    s = new Sprite(16, 20);
    const blue = [58, 74, 120], blueHi = [86, 106, 158];
    for (let y = 1; y < 14; y++) for (let x = 2 + (y >> 4); x < 7 + (y >> 4); x++) s.set(x, y, x < 4 ? blueHi : blue);
    for (let x = 3; x < 15; x++) for (let y = 12; y < 16; y++) s.set(x, y, y === 12 ? blueHi : blue);
    for (let y = 16; y < 20; y++) { s.set(5, y, HULL.deep); s.set(13, y, HULL.deep); }
    for (let k = 0; k < 6; k++) s.set(3 + rnd() * 10, 3 + rnd() * 12, HULL.char);
  } else if (kind === 'bag') {
    s = new Sprite(16, 13);
    const col = rnd() < 0.5 ? [150, 60, 48] : [70, 96, 70];
    for (let x = 1; x < 15; x++) for (let y = 3; y < 13; y++) s.set(x, y, y === 3 ? shade(col, 1.25) : x === 8 ? shade(col, 0.7) : col);
    for (let x = 5; x < 11; x++) s.set(x, 1, [50, 44, 40]);
    s.set(5, 2, [50, 44, 40]); s.set(10, 2, [50, 44, 40]);
  } else {
    s = new Sprite(20, 20);
    for (let y = 0; y < 20; y++) for (let x = 0; x < 20; x++) {
      const d = Math.hypot(x - 10, y - 11);
      if (d < 8.5) s.set(x, y, d < 3 ? [160, 160, 156] : d < 5 ? [90, 90, 92] : [32, 30, 32]);
    }
    for (let y = 0; y < 8; y++) s.set(10 + (y >> 2), y, HULL.mid);
  }
  return s.finish(WRECK_OUTLINE);
}

// Escala do avião caindo sobre o mapa: do mesmo tamanho dos destroços que ficam no chão
const PLANE_WORLD_SCALE = 2.5;

// Avião inteiro, apontando para a direita. K = escala: o desenho é refeito com mais pixels, sem esticar
function genPlaneSprite(K = 1) {
  const W = 166, H = 56, cy = 30, r = 9, s = new Sprite(Math.round(W * K), Math.round(H * K));
  const top = (x) => cy - r + (x < 30 ? (30 - x) * 0.16 : 0);
  const bot = (x) => cy + r - (x < 46 ? (46 - x) * 0.33 : 0);
  // Cor em um ponto (x, y) do desenho original; as peças da frente são testadas primeiro
  const colorAt = (x, y) => {
    if (x >= 66 && x < 86 && y >= 38 && y < 45) return x < 69 ? HULL.inner : y < 40 ? HULL.light : HULL.mid; // motor
    const wk = Math.floor(y) - 33;
    if (wk >= 0 && wk < 5 && x >= Math.round(62 - wk * 2) && x < 106 - wk * 3) return wk === 0 ? HULL.mid : HULL.deep; // asa
    if (x >= 2 && x < 26 && y >= 26 && y < 28) return y < 27 ? HULL.mid : HULL.dark; // estabilizador
    const fk = Math.floor(y) - 3;
    if (fk >= 0 && fk < 21 && x >= 8 + Math.floor(fk * 0.1) && x < Math.floor(18 + fk * 0.55) + 1) return x < 11 ? HULL.stripe : HULL.light; // deriva
    if (x < 6 || x >= 162) return null;
    const nose = x > 146 ? Math.sqrt(Math.max(0, 1 - ((x - 146) / 16) ** 2)) : 1;
    const t = x > 146 ? cy + 1 - r * nose : top(x), b = x > 146 ? cy + 1 + r * nose : bot(x);
    if (y < t || y >= b + 1) return null;
    const v = (y - t) / Math.max(1, b - t);
    let c = v < 0.12 ? HULL.hi : v < 0.5 ? HULL.light : v < 0.62 ? HULL.stripe : v < 0.7 ? HULL.accent : v < 0.88 ? HULL.mid : HULL.dark;
    if (y >= cy - 3 && y < cy - 2 && x > 48 && x < 140 && x % 5 >= 0.2 && x % 5 < 1.9) c = HULL.glass;
    if (x > 148 && x < 156 && y >= cy - 5 && y < cy - 2) c = HULL.glass;
    if (K > 1 && x > 30 && x < 146 && x % 14 < 1 / K) c = shade(c, 0.9); // emendas das chapas
    return c;
  };
  for (let Y = 0; Y < s.h; Y++)
    for (let X = 0; X < s.w; X++) {
      const c = colorAt((X + 0.5) / K, (Y + 0.5) / K);
      if (c) s.set(X, Y, c);
    }
  return s.finish(WRECK_OUTLINE);
}

// Maleta de couro com cintas, cantoneiras e etiqueta; aberta mostra o forro
function genSuitcase(open) {
  const W = 26, H = open ? 25 : 19, s = new Sprite(W, H), by = H - 13;
  const L = { hi: [212, 156, 92], base: [170, 112, 60], dark: [124, 78, 40], deep: [86, 52, 28] };
  const strap = [78, 50, 30], strapHi = [104, 70, 42], metal = [206, 202, 186], metalDark = [128, 124, 112], brass = [228, 190, 96];
  const lining = [140, 56, 50], liningDark = [92, 34, 32];
  for (let y = by; y < H; y++)
    for (let x = 1; x < W - 1; x++) {
      const v = (y - by) / 12;
      let c = x === 1 ? L.dark : x === W - 2 ? L.deep : v < 0.1 ? L.hi : v > 0.84 ? L.dark : L.base;
      if ((x * 3 + y * 5) % 13 === 0 && v > 0.15) c = shade(c, 0.9);
      if (!open && y === by + 3) c = L.deep;
      if (!open && y === by + 2) c = L.dark;
      if (open && y <= by + 1 && x > 1 && x < W - 2) c = y === by ? liningDark : lining;
      if ((x === 7 || x === W - 8) && !(open && y <= by + 1)) c = strap;
      if ((x === 6 || x === W - 9) && !(open && y <= by + 1)) c = strapHi;
      s.set(x, y, c);
    }
  for (const [cx, cy] of [[1, by], [W - 3, by], [1, H - 2], [W - 3, H - 2]]) {
    s.set(cx, cy, metal); s.set(cx + 1, cy, metal); s.set(cx, cy + 1, metal); s.set(cx + 1, cy + 1, metalDark);
  }
  for (const x of [6, W - 9]) { s.set(x, by + 6, brass); s.set(x + 1, by + 6, brass); s.set(x, by + 7, [150, 116, 50]); s.set(x + 1, by + 7, brass); }
  for (let x = 10; x < 16; x++) for (let y = by + 6; y < by + 10; y++) s.set(x, y, y === by + 7 ? [186, 64, 52] : [232, 220, 180]);
  s.set(15, by + 9, [190, 176, 140]);
  if (!open) {
    for (let y = by + 1; y < by + 4; y++) { s.set(12, y, metal); s.set(13, y, y === by + 2 ? metalDark : metal); }
    for (let x = 10; x < 16; x++) s.set(x, by - 4, x === 10 || x === 15 ? L.deep : [60, 38, 22]);
    for (let y = by - 3; y < by; y++) { s.set(10, y, [60, 38, 22]); s.set(15, y, [60, 38, 22]); }
  } else {
    // Tampa levantada, vista por dentro
    for (let y = 0; y < by; y++)
      for (let x = 2 + (y < 2 ? 1 : 0); x < W - 2 - (y < 2 ? 1 : 0); x++) {
        const edge = x <= 3 || x >= W - 4 || y <= 1;
        s.set(x, y, edge ? L.dark : y === by - 4 ? liningDark : (x + y) % 9 === 0 ? liningDark : lining);
      }
    for (let x = 5; x < W - 5; x++) s.set(x, 5, liningDark); // bolso interno
  }
  return s.finish(WRECK_OUTLINE);
}

const WRECK_ART = (() => ({
  suitcase: { closed: genSuitcase(false), open: genSuitcase(true) },
  fuselage: genFuselageWreck(901),
  nose: genNoseWreck(902),
  tail: genTailWreck(903),
  wing: genWingWreck(904),
  engine: genEngineWreck(905),
  debris: {
    panel: [genDebris('panel', 911), genDebris('panel', 912)],
    seat: [genDebris('seat', 913), genDebris('seat', 914)],
    bag: [genDebris('bag', 915), genDebris('bag', 916)],
    wheel: [genDebris('wheel', 917)],
  },
  plane: genPlaneSprite(),
  planeBig: genPlaneSprite(PLANE_WORLD_SCALE),
}))();
