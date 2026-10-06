'use strict';

// =====================================================================================
//  O OLHO DA TEMPESTADE — arte (pixel art 1:1, desenhada em código)
// =====================================================================================
// A ave é montada por partes, de trás para a frente, num quadro com "camadas": cada pixel
// guarda de qual parte ele é. No fim vem o contorno externo escuro e, onde uma parte da frente
// encosta numa de trás, a de trás ganha uma linha de sombra (o volume se lê sozinho).
//
// A ASA é desenhada uma vez só, com capricho, numa pose canônica (aberta para cima): primárias
// em leque com os "dedos" separados, secundárias, terciárias, coberteiras em três fileiras e o
// bordo de ataque claro; o canhão das primárias brilha de trovão. Cada quadro da batida usa
// essa asa girada e achatada (o escorço de quando ela passa de lado), espelhada quando desce —
// como animador 2D faz asa. Assim a pena nunca muda de desenho entre um quadro e outro.
//
// Quadros: 0–7 voo, 8 mergulho, 9 grito, 10 presa, 11 dormindo, 12 planando, 13 pousada;
// 14–21 intermediários de voo, 22–25 carga de raios, 26–29 luta no chão, 30–33 grito animado.
// Luz de cima e da esquerda; cores sempre de rampas curtas, com pontilhado Bayer.

const AVE_ART = { W: 248, H: 300, FEET: 250, BODY: [118, 184] };
const AVE_PAL = {
  ink: [6, 8, 20],
  plume: [[7, 10, 24], [14, 22, 42], [24, 36, 64], [35, 53, 87], [48, 76, 116], [66, 104, 150], [94, 145, 184], [146, 194, 219], [210, 240, 250]],
  belly: [[30, 36, 56], [58, 66, 92], [96, 106, 134], [148, 158, 184], [208, 216, 232]],
  gold: [[64, 34, 10], [120, 74, 20], [180, 120, 34], [228, 172, 58], [250, 218, 122], [255, 246, 204]],
  volt: [[30, 90, 176], [76, 168, 248], [158, 228, 255], [236, 252, 255]],
  eye: [[110, 44, 6], [214, 116, 18], [255, 192, 56], [255, 244, 188]],
};
const aveDither = (x, y) => BAYER4[(y & 3) * 4 + (x & 3)] / 16 - 0.47;
const aveRamp = (ramp, v, x, y, k = 0.75) => ramp[clamp(Math.round(v + aveDither(x, y) * k), 0, ramp.length - 1)];
const aveShade = (c, k) => [c[0] * k | 0, c[1] * k | 0, c[2] * k | 0];

function aveCanvas(W, H) {
  const col = new Array(W * H).fill(null), part = new Uint8Array(W * H);
  return {
    W, H, col, part,
    put(x, y, c, p) { x = Math.floor(x); y = Math.floor(y); if (x < 0 || y < 0 || x >= W || y >= H || !c) return; col[y * W + x] = c; part[y * W + x] = p; },
  };
}
// Elipse girada; pick(u, v, x, y) recebe as coordenadas normalizadas (-1..1) já giradas
function aveEllipse(cv, cx, cy, rx, ry, rot, p, pick) {
  const R = Math.max(rx, ry) + 1, c = Math.cos(rot), s = Math.sin(rot);
  for (let y = Math.floor(cy - R); y <= Math.ceil(cy + R); y++) for (let x = Math.floor(cx - R); x <= Math.ceil(cx + R); x++) {
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy, u = (dx * c + dy * s) / rx, v = (-dx * s + dy * c) / ry;
    if (u * u + v * v <= 1) { const col = pick(u, v, x, y); if (col) cv.put(x, y, col, p); }
  }
}
// Pena: lâmina que sai de `base` na direção `ang`, engorda e afina na ponta.
// pick(t, s, x, y): t = 0 na base .. 1 na ponta; s = -1..1 de um lado ao outro
function aveFeather(cv, base, ang, len, wid, p, pick, tip = 'round') {
  const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx;
  const prof = (t) => tip === 'point' ? wid * (t < 0.2 ? 0.6 + t * 2 : Math.max(0.15, 1 - Math.pow((t - 0.2) / 0.8, 1.7) * 0.88))
    : wid * (t < 0.12 ? 0.65 + t * 2.9 : t > 0.8 ? Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.8) / 0.2, 2))) : 1);
  const R = len + wid + 2;
  for (let y = Math.floor(base[1] - R); y <= Math.ceil(base[1] + R); y++) for (let x = Math.floor(base[0] - R); x <= Math.ceil(base[0] + R); x++) {
    const px = x + 0.5 - base[0], py = y + 0.5 - base[1], t = (px * dx + py * dy) / len, across = px * nx + py * ny;
    if (t < 0 || t > 1) continue;
    const w = prof(t);
    if (Math.abs(across) > w) continue;
    const c = pick(t, across / Math.max(0.5, w), x, y);
    if (c) cv.put(x, y, c, p);
  }
}
const aveLerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const AVE_DEG = Math.PI / 180;

// ---------- Asa canônica (aberta para cima, bordo de ataque à direita) ----------
// Pintada uma vez por abertura: `spread` 1 = leque aberto, baixo = dobrada (penas juntas).
// O resultado é um raster com cor e camada; o quadro final só o reamostra transformado.
const AVE_WING_ANCHOR = [40, 124], AVE_WING_SIZE = [76, 132];
function aveWingRaster(spread, volt) {
  const [W, H] = AVE_WING_SIZE, cv = aveCanvas(W, H), A = AVE_WING_ANCHOR, P = AVE_PAL.plume;
  const pt = (u, v) => [A[0] + u, A[1] + v];
  const S = pt(0, 0), E = pt(10, -26), Wr = pt(19, -52), Tp = pt(8, -84);
  const sp = (a, b) => a + (b - a) * spread; // entre fechada (a) e aberta (b)
  // Pena de voo: corpo escuro, beirada externa clara, fresta escura do outro lado, ponta mais
  // escura; o canhão aparece como um fio. Cada pena se lê sozinha, sem faixa atravessando a asa.
  const flight = (lightBase, glow) => (t, s, x, y) => {
    if (s > 0.62) return P[0];                                                   // fresta entre penas
    if (Math.abs(s + 0.05) < 0.16 && t < 0.9) return glow && t > 0.2 && t < 0.86 ? AVE_PAL.volt[t > 0.55 ? 2 : 1] : P[Math.max(0, Math.round(lightBase - 1))];
    if (s < -0.62) return P[Math.min(8, Math.round(lightBase + 2))];              // beirada iluminada
    return aveRamp(P, lightBase - t * 1.1 - (t > 0.86 ? 0.9 : 0) + (s < -0.2 ? 0.5 : 0), x, y);
  };
  // primárias: 8 dedos longos, de dentro para fora (as de fora por cima)
  for (let i = 0; i < 8; i++) {
    const q = i / 7, base = aveLerp2(Wr, Tp, q * 0.95);
    const ang = sp(-116 - q * 4, -160 + q * 58) * AVE_DEG, len = sp(44, 50 - q * 14);
    aveFeather(cv, base, ang, len, 3.9, 3, flight(3.4, volt && i % 2 === 1), 'point');
  }
  // secundárias: 9 largas ao longo do antebraço, ponta redonda
  for (let i = 8; i >= 0; i--) {
    const q = i / 8, base = aveLerp2(aveLerp2(S, E, 0.3), Wr, q);
    const ang = sp(-130 - q * 4, -178 + q * 16) * AVE_DEG, len = sp(34, 36 + q * 6);
    aveFeather(cv, base, ang, len, 5.4, 4, flight(3, false));
  }
  // terciárias
  for (let i = 0; i < 3; i++) aveFeather(cv, aveLerp2(S, E, 0.08 + i * 0.12), sp(-152, -194 + i * 6) * AVE_DEG, 28 - i * 2, 5.2, 5, flight(2.8, false));
  // coberteiras: escamas mais claras e curtas, cada fileira por cima da anterior
  const row = (a, b, n, len, wid, light, pr, angA, angB) => {
    for (let i = n - 1; i >= 0; i--) {
      const q = i / (n - 1), base = aveLerp2(a, b, q), ang = (sp(angA[0], angA[1]) + q * (sp(angB[0], angB[1]) - sp(angA[0], angA[1]))) * AVE_DEG;
      aveFeather(cv, base, ang, len, wid, pr, (t, s, x, y) => {
        if (s > 0.6 || t > 0.93) return P[Math.max(0, Math.round(light - 3))];     // borda escura da escama
        if (t > 0.72) return P[Math.min(8, Math.round(light + 1))];                // ponta clara
        return aveRamp(P, light - t * 0.6 + (s < -0.4 ? 0.6 : 0), x, y);
      });
    }
  };
  row(aveLerp2(S, E, 0.18), Wr, 11, 17, 4.4, 4.6, 6, [-132, -172], [-122, -158]);
  row(Wr, aveLerp2(Wr, Tp, 0.75), 7, 16, 4, 4.6, 6, [-120, -150], [-112, -114]);
  row(aveLerp2(S, E, 0.3), aveLerp2(E, Wr, 0.9), 10, 10, 3.6, 5.6, 7, [-132, -168], [-126, -156]);
  row(aveLerp2(S, E, 0.4), aveLerp2(E, Wr, 0.96), 9, 6, 3, 6.6, 8, [-136, -164], [-130, -150]);
  // bordo de ataque: faixa clara do ombro ao punho e à ponta
  const lead = [S, E, Wr, Tp];
  for (let k = 0; k < 3; k++) {
    const a = lead[k], b = lead[k + 1], n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1])) * 2;
    for (let i = 0; i <= n; i++) {
      const [x, y] = aveLerp2(a, b, i / n), w0 = k === 2 ? 1.4 : 2.6;
      for (let d = 0; d <= w0; d += 0.5) cv.put(x + d * 0.9, y + d * 0.25, P[d < 0.8 ? 8 : d < 1.8 ? 7 : 5], 9);
    }
  }
  return cv;
}
const AVE_WINGS = {};
function aveWingCached(key, spread, volt) { return (AVE_WINGS[key] ??= aveWingRaster(spread, volt)); }

// Cola a asa canônica no quadro: gira por `tilt`, achata a altura por `lift` (negativo = a asa
// desce e aparece espelhada embaixo), escala `k`; `dark` escurece (asa de trás).
function aveStampWing(cv, wing, at, tilt, lift, k, part, dark) {
  const A = AVE_WING_ANCHOR, [WW, WH] = AVE_WING_SIZE, c = Math.cos(tilt), s = Math.sin(tilt);
  const L = Math.sign(lift || 1) * Math.max(0.16, Math.abs(lift));
  const R = Math.hypot(WW, WH) * k + 2;
  for (let y = Math.floor(at[1] - R); y <= Math.ceil(at[1] + R); y++) for (let x = Math.floor(at[0] - R); x <= Math.ceil(at[0] + R); x++) {
    // de volta para o espaço da asa: desfaz o giro e o achatamento
    const dx = x + 0.5 - at[0], dy = y + 0.5 - at[1];
    const u = (dx * c + dy * s) / k, v = (-dx * s + dy * c) / k / L;
    const wx = Math.floor(A[0] + u), wy = Math.floor(A[1] + v);
    if (wx < 0 || wy < 0 || wx >= WW || wy >= WH) continue;
    const col = wing.col[wy * WW + wx];
    if (!col) continue;
    // asa descendo: a parte de baixo (avesso) é mais escura
    const shadeK = (dark ? 0.62 : 1) * (L < 0 ? 0.82 : 1) * (Math.abs(L) < 0.4 ? 0.92 : 1);
    cv.put(x, y, shadeK === 1 ? col : aveShade(col, shadeK), part + wing.part[wy * WW + wx]);
  }
}

// ---------- Cauda em leque ----------
function aveTail(cv, base, ang, spread) {
  const P = AVE_PAL.plume;
  for (let i = 0; i < 9; i++) {
    const q = (i - 4) / 4, a = ang + q * 0.24 * spread, len = 50 - Math.abs(q) * 10;
    aveFeather(cv, [base[0], base[1] + q * 4], a, len, 6.2, 30, (t, s, x, y) => {
      if (t > 0.9) return t > 0.95 ? AVE_PAL.belly[4] : AVE_PAL.belly[2];          // ponta clara
      if (s > 0.66) return P[0];                                                     // fresta entre penas
      if (s < -0.66) return P[6];                                                    // beirada clara
      if (Math.abs(s) < 0.12) return P[2];                                            // canhão
      const band = ((t * 5 + 0.2) % 1) < 0.22 && t > 0.15 ? -1.8 : 0;                 // faixas escuras
      return aveRamp(P, 4.4 - t * 0.6 + (s < -0.5 ? 0.9 : 0) - (s > 0.55 ? 1.5 : 0) + band - Math.abs(q) * 0.5, x, y);
    });
  }
}

// ---------- Perna: calça de pena, tarso escamado de ouro e garras ----------
function aveLeg(cv, hip, foot, near, grip) {
  const G = AVE_PAL.gold, p = near ? 60 : 32, d = near ? 0 : -1;
  aveEllipse(cv, hip[0], hip[1] + 6, 10, 13, 0.1, p, (u, v, x, y) => aveRamp(AVE_PAL.plume, 4.6 + d - v * 1.4 - (u > 0.45 ? 1.2 : 0) + (((y + Math.abs(x % 4)) % 4) === 0 ? -0.9 : 0), x, y));
  const knee = [hip[0] + 1, hip[1] + 17];
  const tars = { put: (x, y, c) => cv.put(x, y, c, p) };
  tigerCapsule(tars, knee, 3.4, foot, 2.6, p, (t, side, x, y) =>
    (Math.floor(t * 8) % 2 === 0 && side < 0.3) ? G[2 + d] : side > 0.35 ? G[4 + d] : G[3 + d]);
  const toes = grip ? [[0.15, 11], [0.75, 10], [1.4, 9], [Math.PI - 0.45, 7]] : [[0.5, 9], [0.95, 9], [1.45, 8], [Math.PI - 0.7, 6]];
  for (const [a, len] of toes) {
    const end = [foot[0] + Math.cos(a) * len, foot[1] + Math.sin(a) * len * 0.55];
    tigerCapsule(tars, foot, 1.8, end, 1.4, p, (t, side) => G[(side > 0.2 ? 4 : 3) + d]);
    for (let i = 0; i < 5; i++) cv.put(end[0] + Math.cos(a + 1.1) * i * 0.7, end[1] + 1 + i * 0.8, i < 2 ? [60, 60, 72] : AVE_PAL.ink, p + 1);
  }
}

// ---------- Cabeça de águia ----------
function aveHead(cv, C, beakOpen, eyeOpen, crest, f) {
  const P = AVE_PAL.plume, G = AVE_PAL.gold, B = AVE_PAL.belly;
  // crista: plumas compridas para trás, faísca na ponta das de cima
  for (let i = 0; i < 6; i++) {
    const a = Math.PI + 0.32 - i * 0.11 - crest * 0.4 + Math.sin(f * 0.8 + i) * 0.04, len = 34 - i * 3.5 + crest * 8;
    const base = [C[0] - 6 + i * 1.2, C[1] - 9 + i * 1.6];
    aveFeather(cv, base, a, len, 3.4, 70, (t, s, x, y) => aveRamp(P, 6.2 - t * 2.4 + (s < -0.4 ? 0.9 : 0) - (s > 0.5 ? 1.6 : 0), x, y), 'point');
    if (i < 3) { const tip = [base[0] + Math.cos(a) * len, base[1] + Math.sin(a) * len]; cv.put(tip[0], tip[1], AVE_PAL.volt[(Math.floor(f) + i) % 3 + 1], 99); cv.put(tip[0] - 1, tip[1] + 1, AVE_PAL.volt[1], 99); }
  }
  // gola de penas eriçadas na nuca
  for (let i = 0; i < 6; i++) aveFeather(cv, [C[0] - 9, C[1] + i * 3], Math.PI - 0.2 + i * 0.13, 16 - i, 3.2, 71, (t, s, x, y) => aveRamp(P, 4.8 - t * 1.6 - (s > 0.4 ? 1.1 : 0), x, y), 'point');
  // crânio achatado, bochecha clara
  aveEllipse(cv, C[0], C[1], 14, 11.5, -0.12, 72, (u, v, x, y) => {
    const lam = -0.45 * u - 0.8 * v + 0.4;
    if (v > 0.3 && u > -0.35) return aveRamp(B, 2.4 + lam * 1.4 - (v - 0.3) * 1.6, x, y);
    return aveRamp(P, 3.6 + lam * 2.8, x, y);
  });
  // máscara escura e a sobrancelha saliente (dá a cara brava)
  aveEllipse(cv, C[0] + 4, C[1] - 1, 7, 3.2, -0.05, 73, (u, v) => (v < 0.1 ? P[1] : P[2]));
  for (let i = 0; i < 17; i++) {
    const x = C[0] - 5 + i, y = C[1] - 7 + Math.round(Math.pow(i / 16, 2) * 3);
    cv.put(x, y - 1, P[7], 74); cv.put(x, y, P[6], 74); cv.put(x, y + 1, P[2], 74);
  }
  // olho âmbar aceso (fechado: um risco)
  const ex = C[0] + 7, ey = C[1] - 2;
  if (eyeOpen) {
    aveEllipse(cv, ex, ey, 3.2, 2.6, 0, 75, (u, v) => (u * u + v * v < 0.28 ? AVE_PAL.eye[3] : v < 0 ? AVE_PAL.eye[2] : AVE_PAL.eye[1]));
    for (const dy of [-1, 0, 1]) cv.put(ex + 1, ey + dy, AVE_PAL.ink, 76);
    cv.put(ex - 1, ey - 1, [255, 255, 255], 76);
  } else for (let i = -3; i <= 3; i++) cv.put(ex + i, ey + Math.round(i * i * 0.1), P[7], 76);
  // bico: cera amarela, mandíbula de cima em gancho com fio de luz, narina; a de baixo abre no grito
  const bx = C[0] + 11, by = C[1] + 1;
  aveEllipse(cv, bx, by - 1, 4.4, 4.8, 0, 77, (u, v, x, y) => aveRamp(G, 3.8 - v * 0.9, x, y));
  const L = 14;
  for (let i = 0; i <= L; i++) {
    const t = i / L, top = by - 5 + t * t * 8, th = (1 - t) * 6 + 1.4;
    for (let k = 0; k < th; k++) {
      const x = bx + 3 + i - Math.max(0, t - 0.78) * 7, y = top + k;
      cv.put(x, y, k === 0 ? G[5] : aveRamp(G, 4.5 - (k / th) * 2.6 - t * 0.4, x, y, 0.5), 78);
    }
  }
  for (let k = 0; k < 6; k++) cv.put(bx + L - 2 - (k > 2 ? 1 : 0), by + 2 + k, G[k < 2 ? 2 : 1], 78); // ponta do gancho
  cv.put(bx + 2, by - 2, G[0], 79); cv.put(bx + 3, by - 2, G[0], 79); // narina
  const drop = beakOpen ? 8 : 0;
  for (let i = 0; i <= 10; i++) {
    const t = i / 10, y0 = by + 3 + drop * t + t * 1.5, th = (1 - t) * 3 + 1.2;
    for (let k = 0; k < th; k++) cv.put(bx + 2 + i, y0 + k, G[k < 1 ? 3 : 1], 78);
    if (beakOpen && i > 1 && i < 9) for (let yy = by + 3; yy < y0; yy++) cv.put(bx + 2 + i, yy, yy < by + 5 ? [36, 8, 14] : [160, 46, 58], 77);
  }
  return [ex, ey];
}

// ---------- Corpo: peito fundo, dorso de tempestade e barriga com barras em V ----------
function aveBody(cv, C, rot) {
  const P = AVE_PAL.plume, B = AVE_PAL.belly;
  const pick = (u, v, x, y) => {
    const lam = -0.45 * u - 0.82 * v + 0.38;
    const belly = v > -0.1 + u * 0.32;
    if (belly) {
      // barras em V: linhas que descem para os lados, a cada 5 px
      const row = Math.floor((y - C[1] + 200) / 4), chev = ((y - C[1] + 200) % 4 === 0) && ((x + row * 3) % 7 < 4);
      return aveRamp(B, 2.2 + lam * 1.5 - (chev ? 1.6 : 0) - Math.max(0, v - 0.45) * 2.6, x, y);
    }
    // dorso: penas em escama (linha clara na ponta de cada uma)
    const sx = x + (Math.floor(y / 4) % 2) * 3, edge = (y % 4 === 3) && (sx % 6 < 4);
    return aveRamp(P, 2.6 + lam * 2.4 + (edge ? 1 : 0), x, y);
  };
  aveEllipse(cv, C[0] - 28, C[1] + 4, 22, 14, rot + 0.2, 40, pick);   // anca
  aveEllipse(cv, C[0], C[1], 36, 22, rot - 0.1, 41, pick);              // peito e costas
}

// ---------- Quadro completo ----------
const AVE_EYES = [];
const AVE_FLIGHT = [0, 14, 1, 15, 2, 16, 3, 17, 4, 18, 5, 19, 6, 20, 7, 21];
function paintAveTrovao(s, pal, f) {
  const frame = f;
  const charge = f >= 22 && f <= 25, struggle = f >= 26 && f <= 29, cry = f >= 30 && f <= 33;
  const beat = charge ? f - 22 : struggle ? f - 26 : cry ? f - 30 : 0;
  if (f >= 14 && f <= 21) f = f - 14 + 0.5;
  else if (charge || cry) f = 9;
  else if (struggle) f = 10;
  const { W, H } = AVE_ART, cv = aveCanvas(W, H);
  const dive = f === 8, screech = f === 9, stuck = f === 10, sleep = f === 11, glide = f === 12, perch = f === 13;
  const flap = f < 8, ph = flap ? f / 8 * Math.PI * 2 : 0, bob = flap ? Math.round(-Math.cos(ph) * 2.5) : 0;
  const sitting = sleep || perch;
  const [bx, by] = AVE_ART.BODY;
  const C = [bx, by + (sitting ? 18 : stuck ? 14 : 0) + bob], rot = dive ? 0.18 : sitting ? -0.3 : screech ? -0.28 : stuck ? 0.4 : -0.1;
  if (struggle) C[0] += [0, -2, 1, 2][beat];
  const head = sleep ? [C[0] + 34, C[1] - 18] : stuck ? [C[0] + 40, C[1] + 44] : dive ? [C[0] + 46, C[1] - 6] : [C[0] + 40, C[1] - 32 - (screech ? 7 : 0) - (charge || cry ? [0, 2, 4, 1][beat] : 0)];
  // asa: posição do ombro e como ela está em cada quadro
  const shoulder = [C[0] + 4, C[1] - 18];
  let wing;
  if (flap) {
    // batida: lift 1 = toda para cima ... -1 = toda para baixo; inclina para trás na subida
    const sample = (values) => { const i = Math.floor(f), k = f - i; return values[i] * (1 - k) + values[(i + 1) % 8] * k; };
    const lift = sample([1, 0.82, 0.42, -0.2, -0.78, -1, -0.62, 0.3]), tilt = sample([-0.38, -0.3, -0.22, -0.06, 0.12, 0.18, 0.05, -0.28]);
    wing = { open: f >= 6 ? 0.7 : 1, lift, tilt, k: 1, volt: true };
  }
  else if (glide) wing = { open: 1, lift: 0.34, tilt: -0.55, k: 1.02, volt: true };
  else if (screech) wing = { open: 1, lift: 1.12, tilt: -0.5, k: 1.06, volt: true };
  else if (dive) wing = { open: 0.15, lift: 0.62, tilt: -1.95, k: 0.95, volt: false };
  else if (stuck) wing = { open: 0.85, lift: -0.95, tilt: 0.55, k: 1, volt: false };
  else wing = { open: 0.12, lift: 0.6, tilt: -1.85, k: 0.9, volt: false };         // dobrada nas costas
  if (charge || cry) { wing.lift -= [0.12, 0.04, 0, 0.08][beat]; wing.tilt += [0.12, 0.04, -0.02, 0.06][beat]; }
  if (struggle) { wing.lift += [0, 0.14, 0.06, -0.02][beat]; wing.tilt += [0, -0.08, 0.04, 0.1][beat]; }
  const raster = aveWingCached(wing.open.toFixed(2) + (wing.volt ? 'v' : ''), wing.open, wing.volt);
  const farRaster = aveWingCached(wing.open.toFixed(2), wing.open, false);
  // 1. asa de trás (um pouco para trás, mais escura e menor)
  aveStampWing(cv, farRaster, [shoulder[0] + 12, shoulder[1] - 5], wing.tilt + (sitting || dive || stuck ? 0.14 : 0.42), wing.lift * 0.92, wing.k * 0.94, 10, true);
  // 2. cauda
  aveTail(cv, [C[0] - 40, C[1] + 6], Math.PI + (dive ? -0.12 : sitting ? 0.62 : stuck ? -0.45 : 0.1) + (flap ? Math.sin(ph) * 0.06 : 0), sitting ? 0.55 : screech ? 1.5 : glide ? 1.3 : 1);
  // 3. perna de trás
  const feet = sitting || stuck ? AVE_ART.FEET : C[1] + 42;
  if (!dive) aveLeg(cv, [C[0] - 4, C[1] + 14], [C[0] + 2, feet], false, !(sitting || stuck));
  // 4. corpo e pescoço
  aveBody(cv, C, rot);
  aveEllipse(cv, (C[0] + 26 + head[0]) / 2, (C[1] - 12 + head[1]) / 2, 15, 12, Math.atan2(head[1] - C[1] + 12, head[0] - C[0] - 26), 50, (u, v, x, y) =>
    v > 0.25 ? aveRamp(AVE_PAL.belly, 2.6 - v * 1.2, x, y) : aveRamp(AVE_PAL.plume, 4.4 - v * 1.8 - u * 0.3, x, y));
  aveEllipse(cv, C[0] + 16, C[1] - 14, 20, 12, -0.35, 52, (u, v, x, y) => {
    const r = Math.floor((y + 200) / 4), sx = x + (r % 2) * 3, edge = ((y + 200) % 4 === 3) && (sx % 6 < 4);
    return aveRamp(AVE_PAL.plume, 3.4 - v * 1.4 - u * 0.5 + (edge ? 1.1 : 0) - ((sx % 6 === 5) ? 0.8 : 0), x, y);
  });
  // 5. perna da frente
  if (!dive) aveLeg(cv, [C[0] + 10, C[1] + 16], [C[0] + 16, feet + (sitting || stuck ? 0 : 3)], true, !(sitting || stuck));
  // 6. cabeça
  const eye = aveHead(cv, head, screech && !charge, !sleep, screech ? 1 : dive ? -0.7 : sleep ? -0.4 : 0, f);
  // 7. asa da frente
  aveStampWing(cv, raster, shoulder, wing.tilt, wing.lift, wing.k * 1.12, 80, false);
  // Plumas do ombro em forma de raios: a assinatura da guardiã, com metal âmbar nas raízes.
  for (let i = 0; i < 5; i++) {
    const base = [C[0] + 12 - i * 5, C[1] - 13 + i * 2];
    aveFeather(cv, base, Math.PI + 0.28 + i * 0.12, 20 + i * 2, 2.2, 92,
      (t, side, x, y) => t < 0.18 ? AVE_PAL.gold[3] : Math.abs(side) < 0.25 && !sleep && !stuck ? AVE_PAL.volt[charge ? 3 : 2] : aveRamp(AVE_PAL.plume, 5.8 - t * 2 - side, x, y), 'point');
  }
  // Pequena coroa bifurcada; preserva a silhueta de ave, mesmo nas poses de ataque.
  if (!sleep) for (let i = 0; i < 3; i++) {
    const x = head[0] - 7 + i * 4, y = head[1] - 11;
    for (let k = 0; k < 9 + i * 2; k++) cv.put(x - Math.floor(k / 3), y - k, k < 3 ? AVE_PAL.gold[3] : AVE_PAL.volt[charge ? 3 : 1 + (i & 1)], 99);
  }
  // ---------- acabamento ----------
  const { col, part } = cv, out = col.slice();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, c = col[i];
    if (!c) {
      if ((x > 0 && col[i - 1]) || (x < W - 1 && col[i + 1]) || (y > 0 && col[i - W]) || (y < H - 1 && col[i + W])) out[i] = AVE_PAL.ink;
      continue;
    }
    // sombra de contato: logo abaixo/à direita de uma parte da frente (grupo de 10 maior)
    const g = Math.floor(part[i] / 10), front = (j) => col[j] && Math.floor(part[j] / 10) > g;
    if ((y > 0 && front(i - W)) || (x > 0 && front(i - 1))) out[i] = aveShade(c, 0.5);
    // fio de luz da tempestade no alto do contorno (só nas partes da frente)
    else if (y > 0 && x > 0 && !col[i - W] && !col[i - W - 1] && g >= 4 && (x + y) % 3 !== 0) out[i] = [Math.min(255, c[0] + 26), Math.min(255, c[1] + 44), Math.min(255, c[2] + 56)];
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const c = out[y * W + x]; if (c) s.set(x, y, c); }
  AVE_EYES[frame] = eye;
}
