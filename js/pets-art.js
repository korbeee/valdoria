'use strict';
// =====================================================================================
//  PETS — arte refeita (2026-10-04)
// =====================================================================================
// Carrega depois de pets.js e antes de game.js. Troca os desenhos simples de 16x16 por sprites
// maiores (24x24, os de chefe 20x20) e dá a cada pet um ÍCONE próprio de inventário, desenhado
// de frente como os do urso e da aranhinha (contorno escuro grosso, rostinho em destaque).

const DK = [22, 14, 20], CREAM = [252, 236, 208], WHITE = [255, 255, 255];
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
// listras/manchas só onde já existe pixel (máscara do bicho), dentro de uma elipse
function petMark(s, cx, cy, rx, ry, test, col, alpha = 255) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++)
    if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1 && s.opaque(x, y) && test(x, y)) s.set(x, y, col, alpha);
}
function petLeg(s, x, y0, y1, sway, col, paw) {                 // perna de 2px com patinha
  PK.line(s, x, y0, x + sway, y1, col); PK.line(s, x + 1, y0, x + 1 + sway, y1, mix(col, DK, 0.25));
  if (paw) { PK.px(s, x + sway, y1, paw); PK.px(s, x + sway + 1, y1, paw); PK.px(s, x + sway + 2, y1, paw); }
}

// ---------------------------------------------------------------- sprites do mundo (24x24, pés na linha 22)
Object.assign(PET_PAINT, {
  tigrinho(s, f, st) {
    const P = PET_PAL.tigre, stripe = [60, 28, 14], ph = (f / 4) * Math.PI * 2, tw = Math.sin(st.t * 3) * 0.7;
    for (const [x, o, far] of [[6, 0, 1], [14, 2, 1], [8.5, 1, 0], [16, 3, 0]]) {
      const q = st.moving ? Math.sin(ph + o * 1.6) * 1.8 : 0, lift = st.moving ? Math.max(0, Math.cos(ph + o * 1.6)) * 2.4 : 0;
      petLeg(s, x, 17, 22 - lift, q, far ? [128, 62, 22] : P[2], [252, 234, 200]);
    }
    const tail = [[3, 17], [2, 16], [1, 14], [1, 12], [1.5 + tw * 0.5, 10], [2.5 + tw, 8.5], [3.5 + tw, 8]];   // rabo comprido em S
    tail.forEach(([x, y], i) => { PK.px(s, x, y, i % 2 ? stripe : P[2]); PK.px(s, x + 1, y, i % 2 ? P[1] : P[3]); });
    PK.px(s, 4 + tw, 7.5, stripe); PK.px(s, 3.5 + tw, 7, stripe);
    PK.blob(s, 10.5, 14.5, 7.4, 4.8, P, 3, 255, true);                                    // corpo
    PK.blob(s, 11, 17.6, 5.4, 1.5, [CREAM, CREAM, CREAM, [255, 244, 224], WHITE], 4);      // barriga
    petMark(s, 10.5, 14.5, 7.4, 4.8, (x, y) => y < 17 && (x + (y >> 2)) % 3 === 0 && hash2(x, y, 7) > 0.12, stripe);
    PK.blob(s, 18.5, 10.5, 4.7, 4.3, P, 9);                                               // cabeça
    for (const [ex, ey] of [[15, 6], [21.2, 5.4]]) { PK.blob(s, ex, ey, 1.9, 1.9, P, 12); PK.px(s, ex + 0.3, ey + 0.4, [240, 140, 150]); PK.px(s, ex - 0.5, ey - 1.4, stripe); }   // orelhas
    for (const [x, y] of [[17, 6], [18, 6], [19, 6], [18, 7], [18, 8], [16, 9], [15.5, 11]]) PK.px(s, x, y, stripe);   // marcas da testa e da bochecha
    PK.line(s, 14.5, 12, 16, 13, stripe); PK.px(s, 14, 11, P[3]); PK.px(s, 14, 12.5, P[3]);
    PK.blob(s, 21.2, 12.6, 2.9, 2.1, [CREAM, CREAM, [255, 242, 220], [255, 248, 232], WHITE], 15);                       // focinho
    PK.px(s, 22.8, 11.4, [232, 96, 116]); PK.px(s, 23, 11.4, [232, 96, 116]); PK.px(s, 22.6, 12.4, [60, 28, 20]); PK.line(s, 20.6, 13.8, 22.6, 13.8, [60, 28, 20]); PK.px(s, 21.5, 14.4, [240, 120, 130]);
    if (st.blink) PK.line(s, 18.5, 9.6, 20.5, 9.6, stripe); else { PK.px(s, 19, 9, [255, 214, 70]); PK.px(s, 20, 9, [255, 214, 70]); PK.px(s, 19, 10, [255, 186, 40]); PK.px(s, 20, 10, [255, 186, 40]); PK.px(s, 20, 9, [30, 18, 10]); PK.px(s, 20, 10, [30, 18, 10]); PK.px(s, 19, 9, [255, 255, 230]); }
    PK.line(s, 22, 13, 24, 12, [255, 240, 220], 200); PK.line(s, 22, 14, 24, 15, [255, 240, 220], 200);   // bigodes
  },
  besourinho(s, f, st) {
    const P = PET_PAL.besouro, ph = (f / 4) * Math.PI * 2, leg = [18, 24, 40], brass = [226, 176, 70], brassD = [150, 106, 38];
    for (let i = 0; i < 3; i++) for (const side of [1, 0]) {          // seis patas articuladas
      const q = st.moving ? Math.sin(ph + i * 2.1 + side * 3) : 0, x = 6.5 + i * 3.4 + side * 1.5, kx = x + (side ? 2.4 : -2.2), kneeY = 19.5;
      PK.line(s, x, 17, kx, kneeY, side ? leg : [34, 46, 74]); PK.line(s, kx, kneeY, kx + q * 1.6 + (side ? 0.8 : -0.8), 22 - (st.moving ? Math.max(0, Math.cos(ph + i * 2.1 + side * 3)) * 1.6 : 0), side ? leg : [34, 46, 74]);
    }
    PK.blob(s, 10.5, 13, 8.2, 6.2, P, 21);                                               // casco abaulado
    PK.line(s, 4, 17.2, 17, 17.2, P[0]);                                                  // beirada
    for (let i = 0; i < 6; i++) { PK.px(s, 4 + i * 2.2 + 1, 16.4, P[1]); }
    for (let y = 7; y <= 17; y++) PK.px(s, Math.round(10.5 + Math.sin(y * 0.5) * 0.5), y, P[0]);   // emenda das asas
    for (const [x, y] of [[5, 11], [6, 9.5], [7, 8.5], [13, 8.6], [14, 9.6]]) PK.px(s, x, y, P[4]);
    PK.line(s, 4.5, 12.5, 5.5, 10.5, P[3]); PK.line(s, 14.5, 11.5, 16, 13, P[3]);
    for (const [x, y] of [[6, 15], [10.5, 15], [15, 14.5], [8.4, 11.5], [13, 12]]) { PK.px(s, x, y, brass); PK.px(s, x + 1, y, brassD); }   // rebites de latão
    PK.line(s, 6.5, 6.8, 14.5, 6.8, brass, 170);                                           // friso de latão
    PK.blob(s, 19.2, 14.8, 3.4, 3, [[16, 22, 38], [30, 44, 70], [54, 74, 106], [88, 116, 150], [140, 170, 200]], 31);   // cabeça
    PK.line(s, 20, 12.2, 22.2, 7.6, [24, 32, 52]); PK.line(s, 22.2, 7.6, 23.4, 6.4, [24, 32, 52]); PK.line(s, 22.2, 7.6, 23.6, 8.6, [24, 32, 52]); PK.px(s, 23, 6.5, brass);   // chifre bifurcado
    if (st.blink) PK.line(s, 19.6, 14, 21, 14, [255, 230, 120]); else { PK.px(s, 20, 13.4, [255, 224, 90]); PK.px(s, 21, 13.4, [255, 224, 90]); PK.px(s, 20, 14.4, [255, 190, 50]); PK.px(s, 21, 14.4, [20, 14, 10]); PK.px(s, 19.6, 13, WHITE); }
    PK.line(s, 22, 16.2, 23.4, 18, leg); PK.line(s, 20.6, 17, 21.6, 19, leg);
    PK.line(s, 20, 12, 18.5, 9 + Math.sin(st.t * 3) * 0.5, leg); PK.px(s, 18.4, 9, brass);
    if (Math.floor(st.t * 1.4) % 5 === 0) { for (const [x, y, a] of [[7, 8, 255], [6, 8, 150], [8, 8, 150], [7, 7, 150], [7, 9, 150]]) PK.px(s, x, y, WHITE, a); }
  },
  yetizinho(s, f, st) {
    const P = PET_PAL.yeti, wob = st.moving ? Math.sin((f / 4) * Math.PI * 2) : Math.sin(st.t * 2) * 0.4, ice = [150, 224, 252];
    const foot = [[40, 64, 104], [60, 90, 136], [88, 124, 170], [124, 158, 198], [168, 198, 226]];
    PK.blob(s, 8, 21, 2.8, 1.8, foot, 5); PK.blob(s, 16, 21, 2.8, 1.8, foot, 6); for (const x of [6.5, 8.5, 10.5]) PK.px(s, x - 0.5, 20.4, foot[4]);
    PK.blob(s, 12, 14.5 + wob * 0.4, 7.6, 7.4, P, 41, 255, true);                          // corpo de pelo
    PK.blob(s, 12, 17, 4.4, 3.6, [P[1], P[2], P[3], P[3], P[4]], 42, 255, true);           // barriga
    PK.blob(s, 3.6, 15 + wob * 0.8, 2.2, 3.4, P, 7, 255, true); PK.blob(s, 20.4, 15 - wob * 0.8, 2.2, 3.4, P, 8, 255, true);   // braços
    for (const x of [2.4, 3.6, 4.8]) PK.px(s, x, 18 + wob * 0.8, [40, 60, 100]); for (const x of [19.2, 20.4, 21.6]) PK.px(s, x, 18 - wob * 0.8, [40, 60, 100]);   // garrinhas
    PK.blob(s, 12, 11 + wob * 0.3, 5.2, 4.4, [[84, 134, 182], [108, 160, 208], [142, 192, 230], [182, 222, 246], [220, 242, 254]], 11);   // rosto de gelo
    for (const [x, y, h] of [[8.5, 5.5, 3], [11, 5, 4], [13.5, 5, 4], [16, 5.5, 3]]) { PK.line(s, x, y + 1, x, y - h + 1, ice); PK.px(s, x, y - h, [226, 248, 255]); }   // cristais na cabeça
    PK.line(s, 8.4, 8.6, 11, 9.6, P[3]); PK.line(s, 15.6, 8.6, 13, 9.6, P[3]);             // sobrancelhas peludas
    if (st.blink) { PK.line(s, 9, 11, 11, 11, [28, 40, 72]); PK.line(s, 13, 11, 15, 11, [28, 40, 72]); }
    else { PK.eye(s, 9.4, 10.2, true, [24, 32, 62]); PK.eye(s, 13.6, 10.2, true, [24, 32, 62]); }
    PK.line(s, 10.6, 13.6, 13.4, 13.6, [44, 56, 96]); PK.px(s, 11, 14.4, [44, 56, 96]); PK.px(s, 13, 14.4, [44, 56, 96]); PK.px(s, 11.4, 13.9, WHITE); PK.px(s, 12.6, 13.9, WHITE);   // sorriso com dentinhos
    PK.px(s, 8.2, 12.6, [255, 170, 196], 200); PK.px(s, 15.8, 12.6, [255, 170, 196], 200);
    PK.px(s, 7, 12, WHITE); PK.px(s, 17, 13, WHITE); PK.px(s, 9, 18, WHITE, 220);
  },
  mininucleo(s, f, st) {   // 20x20: esfera de basalto rachada, núcleo em brasa e estilhaços em órbita
    const P = PET_PAL.nucleo, cx = 10, cy = 10, pulse = 0.5 + 0.5 * Math.sin(st.t * 3), glow = pulse > 0.5 ? [255, 218, 110] : [255, 150, 50];
    PK.blob(s, cx, cy, 5.9, 5.9, P, 51);
    petMark(s, cx, cy, 5.9, 5.9, (x, y) => (x + y) % 5 === 0 && hash2(x, y, 3) > 0.3, P[1]);              // placas
    PK.line(s, 5, 8, 7, 6, P[4]); PK.px(s, 6, 5.4, P[4]); PK.px(s, 7, 5, P[4]);                           // reflexo
    for (const [x0, y0, x1, y1] of [[7, 8, 10, 11], [10, 11, 14, 9], [14, 9, 15, 8], [10, 11, 11, 15], [11, 15, 10, 16], [8, 13, 10, 11], [10, 6, 10, 11], [10, 6, 9, 5]]) PK.line(s, x0, y0, x1, y1, [255, 110 + pulse * 40, 30]);
    PK.blob(s, cx, cy, 2.4, 2.4, [[190, 40, 14], [240, 90, 24], [255, 140, 40], glow, [255, 246, 190]], 17);
    PK.px(s, cx - 1, cy - 1, [255, 255, 235]);
    for (let i = 0; i < 3; i++) {
      const a = st.t * 1.9 + i * 2.094, ox = cx + Math.cos(a) * 8.2, oy = cy + Math.sin(a) * 2.8, back = Math.sin(a) < 0, c0 = back ? P[1] : P[2];
      PK.px(s, ox, oy - 1, c0); PK.px(s, ox - 1, oy, c0); PK.px(s, ox, oy, back ? P[2] : P[3]); PK.px(s, ox + 1, oy, c0); PK.px(s, ox, oy + 1, c0); PK.px(s, ox + 1, oy + 1, [255, 120, 40], back ? 100 : 200);
    }
    PK.px(s, cx + 3 + Math.sin(st.t * 2) * 1.5, 16.6 + (st.t * 3 % 1) * 2, [255, 160, 50], 220);           // gota de magma
  },
  pintinho(s, f, st) {
    const P = PET_PAL.pinto, blue = [[22, 70, 150], [46, 128, 224], [126, 210, 255]], k = f % 4, ang = [-1.05, -0.35, 0.55, 0.1][k], leg = [236, 134, 40];
    const wing = (x0, y0, a, dark) => {                           // asa em zigue-zague de relâmpago
      let x = x0, y = y0; const segs = [[3.2, 1], [3, -1], [3, 1], [2.6, -1]];
      segs.forEach(([l, z], i) => {
        const aa = a + z * 0.55, nx = x - Math.cos(aa) * l * 1.1, ny = y + Math.sin(aa) * l * 1.1;
        PK.line(s, x, y, nx, ny, dark ? blue[0] : blue[1]); PK.line(s, x, y + 1, nx, ny + 1, dark ? blue[0] : blue[2]);
        x = nx; y = ny;
      });
      PK.px(s, x, y, WHITE);
    };
    PK.line(s, 10, 19, 9.5, 21.6, leg); PK.line(s, 14, 19, 14.5, 21.6, leg); PK.px(s, 9, 22, leg); PK.px(s, 10.5, 22, leg); PK.px(s, 14, 22, leg); PK.px(s, 15.5, 22, leg);
    wing(10.5, 12.5, ang - 0.4, true);                           // asa de trás
    PK.line(s, 5.5, 14, 2, 15.5, blue[1]); PK.line(s, 5, 15, 2.5, 18, blue[0]); PK.px(s, 2, 15.5, blue[2]); PK.px(s, 2.5, 18, blue[2]);   // cauda de raios
    PK.blob(s, 11.5, 14.5, 6.4, 5.4, P, 61, 255, true);
    PK.blob(s, 14.2, 9, 4.6, 4.2, P, 62);
    PK.blob(s, 11, 17, 3, 2, [P[3], P[3], P[4], P[4], [255, 255, 240]], 63);
    for (const [x, y] of [[12.5, 4.2], [14, 3.2], [15.5, 3.8], [14, 4.4]]) PK.px(s, x, y, [255, 226, 96]);   // penugem de cima
    PK.px(s, 14, 2.4, [255, 240, 150]); PK.px(s, 13, 3, [255, 214, 80]);
    if (st.blink) PK.line(s, 15, 8.4, 17, 8.4, [60, 40, 20]); else { PK.eye(s, 16, 7.6, true, [28, 18, 12]); }
    PK.px(s, 18, 10.4, [255, 150, 40]); PK.px(s, 19, 10.4, [255, 150, 40]); PK.px(s, 20, 10.8, [226, 110, 28]); PK.px(s, 18, 11.4, [255, 190, 90]); PK.px(s, 19, 11.4, [236, 124, 30]);   // bico
    PK.px(s, 15.4, 11, [255, 150, 130], 190);
    wing(10.5, 12.5, ang, false);                                // asa da frente
    if (Math.floor(st.t * 6) % 3 === 0) { PK.px(s, 4, 8, [200, 250, 255]); PK.px(s, 3, 9, WHITE, 200); PK.px(s, 5, 9, WHITE, 140); PK.px(s, 4, 10, [200, 250, 255], 160); }
    if (Math.floor(st.t * 6) % 3 === 1) { PK.px(s, 19, 3, [200, 250, 255]); PK.px(s, 20, 4, WHITE, 200); }
  },
  sapinho(s, f, st) {   // f: 0 agachado, 1 esticando, 2 no ar
    const P = PET_PAL.sapo, air = st.air, squat = !air && f === 0, by = squat ? 15.5 : air ? 13 : 14.4, belly = [[200, 190, 120], [228, 220, 150], [244, 238, 176], [252, 248, 206], [255, 255, 232]];
    if (air) { PK.line(s, 5, by + 3, 1.5, by + 7, P[1]); PK.line(s, 5, by + 4, 2.5, by + 8, P[2]); PK.px(s, 1, by + 7.4, P[3]); PK.px(s, 2, by + 8.4, P[3]); }   // pernas esticadas
    else { PK.blob(s, 6, 19.4, 3.8, 2.4, P, 71); PK.line(s, 3, 21.4, 1.4, 22, P[1]); PK.line(s, 3.4, 22, 1, 22, P[2]); PK.px(s, 1, 22, P[3]); PK.px(s, 2, 22, P[3]); }
    PK.blob(s, 12, by + 2, 7.6, squat ? 4.6 : 5.2, P, 72);                                 // corpo
    PK.blob(s, 12.6, by + 4, 5, 2.3, belly, 73);
    petMark(s, 12, by + 2, 7.6, 5, (x, y) => hash2(x, y, 9) < 0.14 && y < by + 3, P[1]);                // pintinhas
    for (const [x, y] of [[8, by - 1], [10, by - 2], [14, by - 1.4]]) { PK.px(s, x, y, P[1]); PK.px(s, x + 1, y, P[1]); }
    for (const ex of [16, 9.6]) { PK.blob(s, ex, by - 3.6, 3, 3, P, ex);                                   // calombos
      if (st.blink) PK.line(s, ex - 1.6, by - 3.4, ex + 1.6, by - 3.4, P[0]);
      else { PK.blob(s, ex + 0.3, by - 3.6, 2.2, 2.2, [[236, 236, 224], [244, 244, 232], [250, 250, 240], WHITE, WHITE], ex + 3); PK.px(s, ex + 0.6, by - 3.4, [255, 190, 40]); PK.px(s, ex + 1.4, by - 3.4, [24, 20, 16]); PK.px(s, ex + 1.4, by - 2.6, [24, 20, 16]); PK.px(s, ex + 0.4, by - 4.6, WHITE); } }
    PK.line(s, 14, by + 2.6, 19.4, by + 1.8, P[0]); PK.px(s, 19.6, by + 1.4, P[0]); PK.px(s, 17.5, by + 3.4, [240, 110, 120], 220);   // sorriso largo e língua
    PK.px(s, 18, by - 0.4, [255, 150, 150], 170);
    PK.px(s, 18.5, by + 0.3, P[0]); PK.px(s, 19, by - 0.2, P[0]);
    if (air) { PK.line(s, 16, by + 5, 19.5, by + 7, P[2]); PK.px(s, 20, by + 7.4, P[3]); }
    else { PK.line(s, 16, by + 6, 17.4, 22, P[2]); PK.px(s, 17, 22, P[3]); PK.px(s, 18, 22, P[3]); PK.px(s, 19, 22, P[3]); }
  },
  corujinha(s, f, st) {
    const P = PET_PAL.coruja, k = f % 4, up = [-1, -0.2, 0.7, 0][k], face = [[200, 170, 120], [230, 206, 156], [246, 228, 184], [255, 244, 210], [255, 252, 232]];
    const wing = (side, dark) => {
      const x0 = 12 + side * 4, y0 = 13, c = dark ? P[0] : P[1];
      for (let i = 0; i < 5; i++) {
        const a = up * 0.9 + i * 0.16 - 0.1, l = 5 + i * 1.4, ex = x0 + side * Math.cos(a - 0.15) * l, ey = y0 - Math.sin(a - 0.15) * l * 0.95 + i * 0.7;
        PK.line(s, x0, y0 + i * 0.8, ex, ey, i % 2 ? c : (dark ? P[1] : P[2])); PK.px(s, ex, ey, dark ? P[1] : P[3]);
      }
      PK.blob(s, x0 + side * 2.6, y0 - up * 2.2, 3, 4.2, dark ? [P[0], P[0], P[1], P[1], P[2]] : P, 86 + side);
    };
    wing(-1, true);
    for (const x of [8, 9, 11, 12]) PK.line(s, x, 19, x + (x > 10 ? 0.5 : -0.5), 22, P[1]);                  // rabo
    PK.blob(s, 12, 14, 5.4, 7, P, 81, 255, true);
    for (const [x, y] of [[9, 14], [11, 14], [13, 14], [10, 16], [12, 16], [14, 16], [9, 18], [11, 18], [13, 18]]) { PK.px(s, x, y, P[4]); PK.px(s, x, y + 1, P[3]); PK.px(s, x + 0.5, y - 0.5, P[2]); }   // peito de penas
    PK.px(s, 9.5, 21, [244, 170, 70]); PK.px(s, 10.5, 21, [244, 170, 70]); PK.px(s, 13, 21, [244, 170, 70]); PK.px(s, 14, 21, [244, 170, 70]);
    PK.blob(s, 12, 8.4, 5.6, 4.4, P, 80);                                                                   // cabeça
    for (const [x, y] of [[7, 4.6], [6.6, 3.4], [8, 4], [16.8, 4.6], [17.2, 3.4], [16, 4]]) PK.px(s, x, y, P[0]);   // orelhas de pena
    PK.px(s, 7.6, 5, P[1]); PK.px(s, 16.4, 5, P[1]);
    PK.blob(s, 9.4, 8.6, 3, 3, face, 82); PK.blob(s, 14.6, 8.6, 3, 3, face, 83);                           // discos faciais
    for (const ex of [9.4, 14.6]) { if (st.blink) PK.line(s, ex - 1.6, 8.6, ex + 1.6, 8.6, P[0]); else { PK.blob(s, ex, 8.6, 2.1, 2.1, [[255, 150, 10], [255, 176, 28], [255, 200, 56], [255, 222, 100], [255, 240, 160]], 84); PK.px(s, ex, 8.4, [24, 16, 14]); PK.px(s, ex + 1, 8.4, [24, 16, 14]); PK.px(s, ex, 9.4, [24, 16, 14]); PK.px(s, ex - 0.8, 7.4, WHITE); } }
    PK.px(s, 11.5, 10.4, [248, 160, 56]); PK.px(s, 12.5, 10.4, [248, 160, 56]); PK.px(s, 12, 11.2, [206, 112, 28]);   // bico
    wing(1, false);
  },
  raposinha(s, f, st) {
    const P = PET_PAL.raposa, white = [252, 246, 236], sock = [42, 26, 22], ph = (f / 4) * Math.PI * 2, tw = Math.sin(st.t * 3) * 0.9;
    for (const [x, o, far] of [[6.5, 0, 1], [14.5, 2, 1], [9, 1, 0], [16.5, 3, 0]]) {
      const q = st.moving ? Math.sin(ph + o * 1.6) * 1.8 : 0, lift = st.moving ? Math.max(0, Math.cos(ph + o * 1.6)) * 2.4 : 0;
      petLeg(s, x, 17, 22 - lift, q, far ? [152, 66, 24] : P[2], sock);
    }
    PK.blob(s, 3.4, 13 + tw * 0.3, 3.4, 4.8, P, 91, 255, true);                                            // rabo fofo
    PK.blob(s, 2.2 + tw * 0.2, 9.6 + tw * 0.4, 2.2, 2.8, [white, white, white, white, white], 92); PK.px(s, 2, 12.2, white);
    petMark(s, 3.4, 13, 3.4, 4.8, (x, y) => y > 14 && hash2(x, y, 5) < 0.4, P[1]);
    PK.blob(s, 11, 14.6, 6.8, 4.3, P, 93, 255, true);
    PK.blob(s, 14, 17, 4.4, 1.8, [white, white, white, white, white], 94);                                  // peito branco
    PK.blob(s, 17.4, 10.6, 4.3, 3.8, P, 95);
    for (const [ex, ey, sc] of [[14.6, 5.4, 1], [20.4, 4.8, 1]]) {                                           // orelhas grandes de ponta preta
      for (let i = 0; i < 5; i++) { PK.line(s, ex - (5 - i) * 0.25 * 0 + 0, ey + i, ex + (i < 3 ? 0 : 0), ey + i, P[2]); PK.px(s, ex + 1, ey + i, P[3]); PK.px(s, ex - 1, ey + i + 0.5, P[1]); }
      PK.px(s, ex, ey - 1, sock); PK.px(s, ex + 0.5, ey - 2, sock); PK.px(s, ex, ey, sock); PK.px(s, ex + 0.2, ey + 2, [250, 174, 164]); PK.px(s, ex + 0.2, ey + 3, [250, 174, 164]);
    }
    PK.blob(s, 19.4, 12.8, 3.4, 2, [white, white, white, white, white], 96);                                // focinho
    PK.px(s, 22.2, 11.6, [28, 18, 16]); PK.px(s, 22.8, 12, [28, 18, 16]); PK.px(s, 22, 12.4, [28, 18, 16]);
    PK.line(s, 19.4, 13.8, 21.4, 13.8, [60, 40, 34]);
    PK.px(s, 14.6, 12.6, white); PK.px(s, 14, 13.4, white);                                                  // pelos da bochecha
    if (st.blink) PK.line(s, 17.4, 9.8, 19.6, 9.8, sock); else { PK.px(s, 18, 9, [30, 20, 14]); PK.px(s, 19, 9, [30, 20, 14]); PK.px(s, 18, 10, [30, 20, 14]); PK.px(s, 19, 10, [30, 20, 14]); PK.px(s, 18, 9, WHITE); PK.px(s, 19, 8.2, [255, 190, 90]); PK.px(s, 17.4, 8.4, sock); }
    PK.px(s, 16.4, 12, [255, 170, 160], 170);
  },
  gelatina(s, f, st) {   // f 0..3: estica e achata no pulo
    const P = PET_PAL.gel, sq = [0, 1, 0, -1][f % 4], rx = 8 + sq * 0.9, ry = 6.2 - sq * 0.9, cy = 22 - ry;
    PK.blob(s, 12, cy, rx, ry, P, 101, 205);
    PK.blob(s, 12, cy + ry * 0.4, rx * 0.84, ry * 0.5, [P[1], P[1], P[2], P[2], P[3]], 102, 170);           // fundo cheio
    PK.blob(s, 12, cy + 0.8, 3.2, 2.6, [P[2], P[3], P[3], P[4], P[4]], 103, 150);                           // núcleo claro
    for (const [bx, by, r] of [[17 - (st.t % 1) * 0, cy + 2 - ((st.t * 0.7) % 1) * 3.4, 1], [8 + Math.sin(st.t * 2), cy - 1 + ((st.t * 0.5) % 1) * -2, 0.8]]) { PK.px(s, bx, by, [226, 255, 252], 210); PK.px(s, bx + 1, by, [226, 255, 252], 120); }
    PK.px(s, 6, cy - ry * 0.55, WHITE, 240); PK.px(s, 7, cy - ry * 0.75, WHITE, 240); PK.px(s, 8, cy - ry * 0.85, P[4]); PK.px(s, 5.4, cy - ry * 0.2, WHITE, 200);   // brilho
    PK.line(s, 12, cy - ry + 0.6, 12, cy - ry - 2.4, [60, 170, 90]); PK.blob(s, 13.4, cy - ry - 1.8, 2, 1.2, [[20, 100, 50], [34, 140, 66], [60, 180, 90], [110, 220, 130], [170, 244, 180]], 104); PK.blob(s, 10.6, cy - ry - 2.4, 1.6, 1, [[20, 100, 50], [34, 140, 66], [60, 180, 90], [110, 220, 130], [170, 244, 180]], 105);   // folhinha no topo
    if (st.blink) { PK.line(s, 7.6, cy, 9.6, cy, [8, 52, 70]); PK.line(s, 14.4, cy, 16.4, cy, [8, 52, 70]); }
    else { PK.eye(s, 8, cy - 0.6, true, [8, 52, 70]); PK.eye(s, 15, cy - 0.6, true, [8, 52, 70]); PK.px(s, 8.6, cy - 0.2, [8, 52, 70]); }
    PK.px(s, 10, cy + 2.4, [8, 52, 70]); PK.px(s, 11, cy + 3, [8, 52, 70]); PK.px(s, 12, cy + 3, [8, 52, 70]); PK.px(s, 13, cy + 2.4, [8, 52, 70]);
    PK.px(s, 6.6, cy + 1.8, [255, 160, 190], 170); PK.px(s, 17.4, cy + 1.8, [255, 160, 190], 170);
  },
  cogumelinho(s, f, st) {
    const P = PET_PAL.cogu, stem = [[150, 124, 92], [196, 170, 130], [226, 204, 164], [244, 228, 192], [255, 244, 218]], ph = (f / 4) * Math.PI * 2, bob = st.moving ? Math.round(Math.abs(Math.sin(ph))) : 0, sway = st.moving ? Math.sin(ph) * 0.8 : 0;
    const shoe = [[50, 30, 22], [70, 44, 32], [92, 62, 44], [120, 84, 60], [150, 110, 80]];
    PK.blob(s, 8.4, 21 - (st.moving ? Math.max(0, Math.sin(ph)) * 1.6 : 0), 2.8, 1.5, shoe, 111); PK.blob(s, 15.6, 21 - (st.moving ? Math.max(0, -Math.sin(ph)) * 1.6 : 0), 2.8, 1.5, shoe, 112);
    PK.blob(s, 12, 16.4 - bob, 5, 4.6, stem, 113);                                                             // pé gordinho
    PK.blob(s, 5.6, 16 - bob + sway, 1.6, 1.6, stem, 118); PK.blob(s, 18.4, 16 - bob - sway, 1.6, 1.6, stem, 119);   // bracinhos
    PK.blob(s, 12, 8.6 - bob, 10, 6.6, P, 114);                                                                // chapéu
    for (let x = 3; x <= 21; x++) { PK.px(s, x, 12.4 - bob, [150, 24, 34]); if (x % 3 === 0) PK.px(s, x, 13.4 - bob, [240, 224, 190]); }   // aba com lamelas
    PK.line(s, 4, 12.4 - bob, 20, 12.4 - bob, P[0]);
    for (const [x, y, r] of [[7, 6.4, 1.8], [13.5, 4.2, 2.1], [18, 8.6, 1.5], [10.6, 9.4, 1.2], [4.6, 10, 1], [16.2, 11, 1]]) PK.blob(s, x, y - bob, r, r, [[236, 220, 190], [248, 238, 214], [255, 250, 232], [255, 255, 245], WHITE], Math.round(x * 3));
    PK.px(s, 8, 5, P[4]); PK.px(s, 9, 4.4, P[4]); PK.px(s, 16.6, 5.6, P[4]);
    if (st.blink) { PK.line(s, 9.2, 15.4 - bob, 11, 15.4 - bob, [60, 40, 30]); PK.line(s, 13.4, 15.4 - bob, 15.2, 15.4 - bob, [60, 40, 30]); }
    else { PK.eye(s, 9.6, 14.6 - bob, true, [40, 28, 22]); PK.eye(s, 13.8, 14.6 - bob, true, [40, 28, 22]); }
    PK.line(s, 11, 17.8 - bob, 13, 17.8 - bob, [90, 50, 40]); PK.px(s, 10.4, 17.2 - bob, [90, 50, 40]); PK.px(s, 13.6, 17.2 - bob, [90, 50, 40]);
    PK.px(s, 8.2, 17 - bob, [255, 150, 140], 180); PK.px(s, 15.6, 17 - bob, [255, 150, 140], 180);
  },
  fantasminha(s, f, st) {
    const P = PET_PAL.fantasma, w = Math.sin((f / 8) * Math.PI * 2), scarf = [[16, 90, 110], [26, 130, 150], [44, 170, 184], [96, 214, 218], [170, 244, 240]];
    PK.blob(s, 12, 9.4, 6.6, 6.6, P, 121, 238);
    for (let y = 10; y <= 21; y++) for (let x = 4; x <= 20; x++) {                                           // lençol que desce em ondas
      const taper = 6.6 - (y - 10) * 0.22, edge = 19.4 + Math.sin(x * 0.95 + w * 3.2) * 1.8 + (Math.abs(x - 12) < 2 ? 1.5 : 0);
      if (y <= edge && Math.abs(x - 12 + w * 0.5 * (y - 10) / 8) <= taper) PK.px(s, x, y, PK.tone(P, -(y - 9) / 10 * 0.5 - (x - 12) / 18 + 0.22), 232 - (y - 10) * 8);
    }
    PK.px(s, 8, 4.4, WHITE, 240); PK.px(s, 9, 3.8, WHITE, 220); PK.px(s, 7.4, 5.6, WHITE, 200);
    PK.line(s, 5, 16 + w, 2.4, 17.6 + w * 2, P[3], 220); PK.px(s, 2, 18 + w * 2, P[4], 230); PK.line(s, 19, 16 - w, 21.6, 17.6 - w * 2, P[3], 220); PK.px(s, 22, 18 - w * 2, P[4], 230);   // bracinhos
    PK.line(s, 7.6, 14.6, 16.4, 14.6, scarf[2]); PK.line(s, 7.4, 15.6, 16.6, 15.6, scarf[1]); PK.line(s, 8, 14, 16, 14, scarf[3]);     // cachecol
    PK.line(s, 15.6, 15.6, 16.4, 18.6 + w * 0.6, scarf[2]); PK.line(s, 16.6, 15.6, 17.4, 18.4 + w * 0.6, scarf[1]); PK.px(s, 16.4, 19 + w * 0.6, scarf[4]);
    if (st.blink) { PK.line(s, 8, 9.4, 10.4, 9.4, [40, 50, 90]); PK.line(s, 13.6, 9.4, 16, 9.4, [40, 50, 90]); }
    else for (const ex of [8.6, 14]) { for (let y = 8; y <= 11; y++) { PK.px(s, ex, y, [26, 32, 70]); PK.px(s, ex + 1, y, [26, 32, 70]); } PK.px(s, ex, 8, WHITE); PK.px(s, ex + 0.6, 11, [90, 110, 190]); }
    PK.line(s, 11, 12.8, 13, 12.8, [26, 32, 70]); PK.px(s, 10.4, 12.2, [26, 32, 70]); PK.px(s, 13.6, 12.2, [26, 32, 70]);
    PK.px(s, 6.6, 11.8, [255, 170, 200], 190); PK.px(s, 17, 11.8, [255, 170, 200], 190);
  },
});

// ---------------------------------------------------------------- ícones de inventário (16x16, de frente, como os dos chefes)
const PET_ICON = {
  tigrinho(s) {
    const P = PET_PAL.tigre, stripe = [60, 28, 14];
    for (const x of [3.6, 12.4]) { PK.blob(s, x, 3.8, 2.3, 2.3, P, x); PK.px(s, x, 4.2, [240, 140, 150]); PK.px(s, x + 0.4, 3.2, [240, 140, 150]); }
    PK.blob(s, 8, 9, 6.4, 5.4, P, 3, 255, true);
    for (const [x, y] of [[8, 4], [8, 5], [8, 6], [6, 4.4], [6, 5.4], [10, 4.4], [10, 5.4], [2.4, 8], [3.2, 9], [13.6, 8], [12.8, 9]]) PK.px(s, x, y, stripe);
    PK.blob(s, 8, 11.6, 3.4, 2.2, [CREAM, CREAM, CREAM, [255, 244, 224], WHITE], 15);
    for (const ex of [5.2, 10.8]) { PK.px(s, ex, 7.6, [255, 206, 60]); PK.px(s, ex + 1, 7.6, [255, 206, 60]); PK.px(s, ex, 8.6, [255, 170, 30]); PK.px(s, ex + 1, 8.6, [30, 18, 10]); PK.px(s, ex, 7.6, [30, 18, 10]); PK.px(s, ex - 0.1, 7, WHITE, 0); PK.px(s, ex + 1, 7.6, [255, 255, 230]); }
    PK.px(s, 7.5, 10, [232, 96, 116]); PK.px(s, 8.5, 10, [232, 96, 116]); PK.px(s, 8, 11, [60, 28, 20]); PK.line(s, 6.4, 12.4, 7.6, 12.6, [60, 28, 20]); PK.line(s, 9.6, 12.6, 8.4, 12.4, [60, 28, 20]);
  },
  besourinho(s) {
    const P = PET_PAL.besouro, leg = [20, 26, 44], brass = [226, 176, 70];
    for (const y of [8, 10.5, 13]) { PK.line(s, 4, y, 1.2, y + 1.4, leg); PK.line(s, 12, y, 14.8, y + 1.4, leg); }
    PK.blob(s, 8, 9.6, 5.2, 5.4, P, 21);
    PK.line(s, 8, 5.4, 8, 14.6, P[0]); PK.px(s, 6, 7, P[4]); PK.px(s, 5.4, 8.4, P[4]); PK.px(s, 5, 10, P[3]);
    for (const [x, y] of [[5.5, 12.4], [10.5, 12.4], [6.4, 9.4], [9.6, 9.4]]) PK.px(s, x, y, brass);
    PK.blob(s, 8, 3.6, 2.8, 2.2, [[16, 22, 38], [30, 44, 70], [54, 74, 106], [88, 116, 150], [140, 170, 200]], 31);
    PK.px(s, 6.8, 3.4, [255, 224, 90]); PK.px(s, 9.2, 3.4, [255, 224, 90]); PK.px(s, 6.8, 2.8, WHITE, 0);
    PK.line(s, 7, 1.4, 5.4, 0.4, leg); PK.line(s, 9, 1.4, 10.6, 0.4, leg); PK.px(s, 5, 0.4, brass); PK.px(s, 11, 0.4, brass);
  },
  yetizinho(s) {
    const P = PET_PAL.yeti, ice = [150, 224, 252];
    PK.blob(s, 8, 9.4, 6.6, 5.8, P, 41, 255, true);
    PK.blob(s, 1.8, 10, 1.4, 2.4, P, 7); PK.blob(s, 14.2, 10, 1.4, 2.4, P, 8);
    for (const [x, h] of [[5.5, 2], [8, 3], [10.5, 2]]) { PK.line(s, x, 4, x, 4 - h, ice); PK.px(s, x, 4 - h, [226, 248, 255]); }
    PK.blob(s, 8, 9, 4.2, 3.4, [[84, 134, 182], [108, 160, 208], [142, 192, 230], [182, 222, 246], [220, 242, 254]], 11);
    PK.eye(s, 5.8, 7.8, true, [24, 32, 62]); PK.eye(s, 9.4, 7.8, true, [24, 32, 62]);
    PK.line(s, 6.8, 11, 9.2, 11, [44, 56, 96]); PK.px(s, 7.4, 11.6, WHITE); PK.px(s, 8.6, 11.6, WHITE);
    PK.px(s, 4.4, 10, [255, 170, 196], 200); PK.px(s, 11.6, 10, [255, 170, 196], 200);
    PK.blob(s, 4.5, 14, 1.8, 1, [[40, 64, 104], [60, 90, 136], [88, 124, 170], [124, 158, 198], [168, 198, 226]], 5); PK.blob(s, 11.5, 14, 1.8, 1, [[40, 64, 104], [60, 90, 136], [88, 124, 170], [124, 158, 198], [168, 198, 226]], 6);
  },
  mininucleo(s) {
    const P = PET_PAL.nucleo;
    PK.blob(s, 8, 8, 6, 6, P, 51);
    petMark(s, 8, 8, 6, 6, (x, y) => (x + y) % 5 === 0 && hash2(x, y, 3) > 0.3, P[1]);
    PK.line(s, 3.4, 5, 5.4, 3, P[4]); PK.px(s, 4.4, 2.8, P[4]);
    for (const [x0, y0, x1, y1] of [[4, 6, 8, 9], [8, 9, 12, 7], [8, 9, 9, 13], [8, 4, 8, 9], [12, 7, 13, 5], [9, 13, 8, 14]]) PK.line(s, x0, y0, x1, y1, [255, 112, 30]);
    PK.blob(s, 8, 8.4, 2.6, 2.6, [[190, 40, 14], [240, 90, 24], [255, 140, 40], [255, 200, 80], [255, 246, 190]], 17); PK.px(s, 7, 7.4, [255, 255, 235]);
    for (const [x, y] of [[1.5, 12.5], [14.5, 3.5], [14, 13.5]]) { PK.px(s, x, y, P[2]); PK.px(s, x + 1, y, P[3]); PK.px(s, x, y + 1, P[1]); PK.px(s, x + 0.5, y, [255, 130, 40], 200); }
  },
  pintinho(s) {
    const P = PET_PAL.pinto, blue = [[22, 70, 150], [46, 128, 224], [126, 210, 255]];
    for (const sx of [-1, 1]) { const x = 8 + sx * 4.4; PK.line(s, x, 10.5, 8 + sx * 7.2, 6, blue[1]); PK.line(s, x, 11.5, 8 + sx * 7.4, 8.4, blue[0]); PK.line(s, 8 + sx * 7.2, 6, 8 + sx * 5.4, 6.8, blue[2]); PK.line(s, 8 + sx * 7.4, 8.4, 8 + sx * 5.6, 9.2, blue[2]); PK.px(s, 8 + sx * 7.4, 5, WHITE); }
    PK.blob(s, 8, 9.4, 5.2, 4.8, P, 61, 255, true);
    for (const [x, y] of [[7, 3.4], [8, 2.4], [9, 3.4]]) PK.px(s, x, y, [255, 230, 100]);
    PK.blob(s, 8, 13, 3, 1.4, [P[3], P[3], P[4], P[4], [255, 255, 240]], 63);
    PK.eye(s, 5.6, 7.6, true, [28, 18, 12]); PK.eye(s, 9.4, 7.6, true, [28, 18, 12]);
    PK.px(s, 7.4, 9.6, [255, 150, 40]); PK.px(s, 8.6, 9.6, [255, 150, 40]); PK.px(s, 8, 10.6, [226, 110, 28]);
    PK.px(s, 4.2, 9.6, [255, 150, 130], 190); PK.px(s, 11.8, 9.6, [255, 150, 130], 190);
    PK.px(s, 6.4, 14.4, [236, 134, 40]); PK.px(s, 9.6, 14.4, [236, 134, 40]);
  },
  sapinho(s) {
    const P = PET_PAL.sapo, belly = [[200, 190, 120], [228, 220, 150], [244, 238, 176], [252, 248, 206], [255, 255, 232]];
    PK.blob(s, 8, 10.4, 6.8, 4.6, P, 72);
    PK.blob(s, 8, 12.6, 4.2, 1.8, belly, 73);
    for (const ex of [4.6, 11.4]) { PK.blob(s, ex, 4.4, 2.8, 2.8, P, ex);
      PK.blob(s, ex, 4.6, 2, 2, [[236, 236, 224], [244, 244, 232], [250, 250, 240], WHITE, WHITE], ex + 3); PK.px(s, ex - 0.4, 4.6, [255, 190, 40]); PK.px(s, ex + 0.6, 4.6, [24, 20, 16]); PK.px(s, ex + 0.6, 5.6, [24, 20, 16]); PK.px(s, ex - 0.6, 3.4, WHITE); }
    PK.line(s, 4, 11, 12, 11, P[0]); PK.px(s, 3.4, 10.2, P[0]); PK.px(s, 12.6, 10.2, P[0]); PK.px(s, 8, 12, [240, 110, 120]);
    PK.px(s, 7, 8.4, P[0]); PK.px(s, 9, 8.4, P[0]); PK.px(s, 4, 9.6, [255, 150, 150], 160); PK.px(s, 12, 9.6, [255, 150, 150], 160);
    for (const [x, y] of [[3, 8], [13, 7.6], [10, 7.2]]) PK.px(s, x, y, P[1]);
    PK.blob(s, 3, 14, 2, 1, P, 75); PK.blob(s, 13, 14, 2, 1, P, 76);
  },
  corujinha(s) {
    const P = PET_PAL.coruja, face = [[200, 170, 120], [230, 206, 156], [246, 228, 184], [255, 244, 210], [255, 252, 232]];
    PK.blob(s, 2.4, 10, 1.8, 4, P, 5, 255); PK.blob(s, 13.6, 10, 1.8, 4, P, 6, 255);
    PK.blob(s, 8, 9, 5.6, 6, P, 81, 255, true);
    for (const [x, y] of [[4, 2.4], [3.4, 1.4], [5, 2], [12, 2.4], [12.6, 1.4], [11, 2]]) PK.px(s, x, y, P[0]);
    PK.blob(s, 5.2, 6.8, 3, 3, face, 82); PK.blob(s, 10.8, 6.8, 3, 3, face, 83);
    for (const ex of [5.2, 10.8]) { PK.blob(s, ex, 6.8, 2, 2, [[255, 150, 10], [255, 176, 28], [255, 200, 56], [255, 222, 100], [255, 240, 160]], 84); PK.px(s, ex, 6.6, [24, 16, 14]); PK.px(s, ex + 1, 6.6, [24, 16, 14]); PK.px(s, ex, 7.6, [24, 16, 14]); PK.px(s, ex - 0.8, 5.6, WHITE); }
    PK.px(s, 7.5, 9, [248, 160, 56]); PK.px(s, 8.5, 9, [248, 160, 56]); PK.px(s, 8, 10, [206, 112, 28]);
    for (const [x, y] of [[6, 11.4], [8, 11.4], [10, 11.4], [7, 13], [9, 13]]) { PK.px(s, x, y, P[4]); PK.px(s, x, y + 1, P[3]); }
    PK.px(s, 6, 14.6, [244, 170, 70]); PK.px(s, 10, 14.6, [244, 170, 70]);
  },
  raposinha(s) {
    const P = PET_PAL.raposa, white = [252, 246, 236], sock = [42, 26, 22];
    for (const [x, sx] of [[3, 1], [13, -1]]) { for (let i = 0; i < 5; i++) { PK.px(s, x + sx * i * 0.1, 7 - i, P[2]); PK.px(s, x + sx * 1, 7 - i, P[3]); PK.px(s, x - sx * 1, 7.4 - i, P[1]); } PK.px(s, x, 2, sock); PK.px(s, x, 1.4, sock); PK.px(s, x + sx, 2.4, sock); PK.px(s, x, 5, [250, 174, 164]); PK.px(s, x, 4, [250, 174, 164]); }
    PK.blob(s, 8, 9.6, 6.2, 4.6, P, 95, 255, true);
    PK.blob(s, 4.4, 12, 3.2, 2, [white, white, white, white, white], 96); PK.blob(s, 11.6, 12, 3.2, 2, [white, white, white, white, white], 97); PK.blob(s, 8, 13, 2.6, 1.6, [white, white, white, white, white], 98);
    for (const ex of [5, 11]) { PK.px(s, ex, 8.2, [30, 20, 14]); PK.px(s, ex + 1, 8.2, [30, 20, 14]); PK.px(s, ex, 9.2, [30, 20, 14]); PK.px(s, ex + 1, 9.2, [30, 20, 14]); PK.px(s, ex, 8.2, WHITE); PK.px(s, ex + 1, 7, sock); PK.px(s, ex - 1, 7.4, sock, 0); }
    PK.px(s, 7.4, 12, [28, 18, 16]); PK.px(s, 8.6, 12, [28, 18, 16]); PK.px(s, 8, 12.8, [28, 18, 16]);
    PK.px(s, 3.8, 10.6, [255, 170, 160], 170); PK.px(s, 12.2, 10.6, [255, 170, 160], 170);
  },
  gelatina(s) {
    const P = PET_PAL.gel;
    PK.blob(s, 8, 9.6, 6.8, 5.2, P, 101, 215);
    PK.blob(s, 8, 11, 5.4, 2.8, [P[1], P[1], P[2], P[2], P[3]], 102, 180);
    PK.blob(s, 8, 9.4, 2.6, 2, [P[2], P[3], P[3], P[4], P[4]], 103, 150);
    PK.px(s, 4.4, 6, WHITE, 240); PK.px(s, 5.4, 5.2, WHITE, 240); PK.px(s, 6.6, 4.8, P[4]); PK.px(s, 3.8, 7.4, WHITE, 200);
    PK.px(s, 11.4, 7.6, [226, 255, 252], 220); PK.px(s, 12.4, 7.6, [226, 255, 252], 130);
    PK.line(s, 8, 4.4, 8, 2.2, [60, 170, 90]); PK.blob(s, 9.6, 1.8, 1.8, 1.1, [[20, 100, 50], [34, 140, 66], [60, 180, 90], [110, 220, 130], [170, 244, 180]], 104); PK.blob(s, 6.4, 2.4, 1.5, 0.9, [[20, 100, 50], [34, 140, 66], [60, 180, 90], [110, 220, 130], [170, 244, 180]], 105);
    PK.eye(s, 5, 9, true, [8, 52, 70]); PK.eye(s, 10.4, 9, true, [8, 52, 70]);
    PK.px(s, 7, 12, [8, 52, 70]); PK.px(s, 8, 12.6, [8, 52, 70]); PK.px(s, 9, 12, [8, 52, 70]);
    PK.px(s, 3.6, 11, [255, 160, 190], 170); PK.px(s, 12.4, 11, [255, 160, 190], 170);
  },
  cogumelinho(s) {
    const P = PET_PAL.cogu, stem = [[150, 124, 92], [196, 170, 130], [226, 204, 164], [244, 228, 192], [255, 244, 218]];
    PK.blob(s, 8, 11.6, 3.8, 3.4, stem, 113);
    PK.blob(s, 8, 5.8, 7, 4.8, P, 114);
    for (let x = 2; x <= 14; x++) PK.px(s, x, 9.6, [150, 24, 34]);
    for (const [x, y, r] of [[4.6, 5.4, 1.5], [9.4, 3, 1.7], [12.6, 6.4, 1.2], [7.4, 6.8, 1], [8.4, 8.4, 0.6]]) PK.blob(s, x, y, r, r, [[236, 220, 190], [248, 238, 214], [255, 250, 232], [255, 255, 245], WHITE], Math.round(x * 3));
    PK.px(s, 5.6, 4, P[4]); PK.px(s, 6.4, 3.6, P[4]);
    PK.eye(s, 6.4, 10.8, true, [40, 28, 22]); PK.eye(s, 9.4, 10.8, true, [40, 28, 22]);
    PK.line(s, 7.4, 13, 8.6, 13, [90, 50, 40]); PK.px(s, 5.2, 12.6, [255, 150, 140], 180); PK.px(s, 11, 12.6, [255, 150, 140], 180);
    PK.blob(s, 5.4, 14.4, 2, 1, [[50, 30, 22], [70, 44, 32], [92, 62, 44], [120, 84, 60], [150, 110, 80]], 111); PK.blob(s, 10.6, 14.4, 2, 1, [[50, 30, 22], [70, 44, 32], [92, 62, 44], [120, 84, 60], [150, 110, 80]], 112);
  },
  fantasminha(s) {
    const P = PET_PAL.fantasma, scarf = [[16, 90, 110], [26, 130, 150], [44, 170, 184], [96, 214, 218], [170, 244, 240]];
    PK.blob(s, 8, 6.4, 5.6, 5, P, 121, 245);
    for (let y = 7; y <= 14; y++) for (let x = 2; x <= 14; x++) { const edge = 12.4 + Math.sin(x * 1.5) * 1.5 + (Math.abs(x - 8) < 2 ? 1 : 0); if (y <= edge && Math.abs(x - 8) <= 5.4 - (y - 7) * 0.12) PK.px(s, x, y, PK.tone(P, -(y - 6) / 8 * 0.5 - (x - 8) / 14 + 0.2), 245); }
    PK.px(s, 5, 2.6, WHITE); PK.px(s, 6, 2.2, WHITE, 220); PK.px(s, 4.4, 3.6, WHITE, 200);
    PK.line(s, 3, 9, 1.2, 7, P[3]); PK.line(s, 13, 9, 14.8, 7, P[3]); PK.px(s, 1, 6.6, P[4]); PK.px(s, 15, 6.6, P[4]);
    for (const ex of [5.2, 9.4]) { for (let y = 5; y <= 7; y++) { PK.px(s, ex, y, [26, 32, 70]); PK.px(s, ex + 1, y, [26, 32, 70]); } PK.px(s, ex, 5, WHITE); }
    PK.px(s, 7, 9, [26, 32, 70]); PK.px(s, 8, 9.4, [26, 32, 70]); PK.px(s, 3.8, 8, [255, 170, 200], 190); PK.px(s, 12.2, 8, [255, 170, 200], 190);
    PK.line(s, 4, 10.6, 12, 10.6, scarf[2]); PK.line(s, 4.4, 11.4, 11.6, 11.4, scarf[1]); PK.line(s, 11, 11.6, 11.6, 14, scarf[2]); PK.px(s, 12, 14, scarf[4]);
  },
};

// 16x16 pintado -> ITEM_ART (poucas cores, linhas de caracteres), igual aos ícones escritos à mão
function petPortrait(paint) {
  const s = new Sprite(16, 16); paint(s);
  const img = s.finish(null), x = img.getContext('2d'), d = x.getImageData(0, 0, 16, 16).data, map = new Map(), cores = {};
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', q = (v) => Math.min(255, Math.round(v / 10) * 10), rows = [];
  for (let y = 0; y < 16; y++) {
    let row = '';
    for (let xx = 0; xx < 16; xx++) {
      const i = (y * 16 + xx) * 4;
      if (d[i + 3] < 100) { row += '.'; continue; }
      const k = q(d[i]) + ',' + q(d[i + 1]) + ',' + q(d[i + 2]);
      if (!map.has(k)) { const ch = chars[map.size % chars.length]; map.set(k, ch); cores[ch] = [q(d[i]), q(d[i + 1]), q(d[i + 2])]; }
      row += map.get(k);
    }
    rows.push(row);
  }
  return { cores, pixels: rows };
}
for (const def of Object.values(PETS)) {
  ITEM_ART[def.item] = petPortrait(PET_ICON[def.key]);
  if (def.size === 16) def.size = 24;           // sprites maiores
}
PETS.mininucleo.size = 20;
PETS.pintinho.size = 24; PETS.corujinha.size = 24;
PET_SPRITES.clear();

// ---------------------------------------------------------------- tamanhos diferentes + acabamento
// Cada pet é pintado na grade lógica de 24 (a de 20 no Mini-Núcleo) e ampliado por um fator K próprio.
// PK.px preenche o bloco [round(x*K), round((x+1)*K)), então nenhuma forma fica furada.
PK.K = 1;
PK.px = function (s, x, y, c, a) {
  const K = this.K, lx = Math.round(x), ly = Math.round(y);
  if (K === 1) { s.set(lx, ly, c, a); return; }
  const x0 = Math.round(lx * K), x1 = Math.round((lx + 1) * K), y0 = Math.round(ly * K), y1 = Math.round((ly + 1) * K);
  for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) s.set(xx, yy, c, a);
};
petMark = function (s, cx, cy, rx, ry, test, col, alpha = 255) {
  const K = PK.K;
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++)
    if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1 && s.opaque(Math.round(x * K), Math.round(y * K)) && test(x, y)) PK.px(s, x, y, col, alpha);
};
const PET_K = { tigrinho: 1.3, besourinho: 1, yetizinho: 1.4, mininucleo: 1.3, pintinho: 0.92, sapinho: 1, corujinha: 1.2, raposinha: 1.15, gelatina: 1.1, cogumelinho: 1.15, fantasminha: 1.25 };
for (const [k, K] of Object.entries(PET_K)) {
  const d = PETS[k], base = k === 'mininucleo' ? 20 : 24;
  d.k = K; d.size = Math.ceil(base * K);
  if (K !== 1) d.box = d.box.map((v) => Math.round(v * Math.pow(K, 0.7)));
}
// luz de cima/esquerda, sombra embaixo/direita e pelugem granulada em cima de cada quadro pintado
function petDetail(s, seed) {
  const w = s.w, h = s.h, d = s.d, src = new Uint8ClampedArray(d), A = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : src[(y * w + x) * 4 + 3];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4; if (src[i + 3] < 120) continue;
    const lum = (src[i] + src[i + 1] + src[i + 2]) / 3; if (lum < 70) continue;
    let m = 1 + (hash2(x >> 1, y >> 1, seed) - 0.5) * 0.14;
    if (A(x, y - 1) < 90 || A(x - 1, y) < 90) m += 0.2;
    else if (A(x, y + 1) < 90 || A(x + 1, y) < 90) m -= 0.22;
    for (let c = 0; c < 3; c++) d[i + c] = m >= 1 ? Math.min(255, src[i + c] + (255 - src[i + c]) * (m - 1)) : src[i + c] * m;
  }
}
petSprite = function (def, f, st) {
  const key = def.key + f + (st.moving ? 'm' : '') + (st.air ? 'a' : '') + (st.blink ? 'b' : '') + (Math.floor(st.t * (def.key === 'mininucleo' ? 12 : 4)) % 12);
  let img = PET_SPRITES.get(key);
  if (img) return img;
  const s = new Sprite(def.size, def.size);
  PK.K = def.k || 1;
  try { PET_PAINT[PET_PAINT_KEY[def.key]](s, f, st); } finally { PK.K = 1; }
  petDetail(s, def.item);
  img = s.finish([20, 14, 20]);
  PET_SPRITES.set(key, img);
  if (PET_SPRITES.size > 700) PET_SPRITES.delete(PET_SPRITES.keys().next().value);
  return img;
};
PET_SPRITES.clear();

// ---------------------------------------------------------------- mais vida: dormir, sentar, pulinho de alegria, inclinação no voo, aura
// (inspirado no espírito do urso: aura colorida, partículas próprias e vários estados de animação)
for (const [k, g] of Object.entries({ sapinho: [130, 230, 110], raposinha: [255, 160, 80], cogumelinho: [255, 110, 100], besourinho: [120, 190, 255], corujinha: [255, 214, 120], tigrinho: [255, 170, 60] })) PETS[k].glow ??= g;
PETS.sapinho.glow = [130, 230, 110]; PETS.raposinha.glow = [255, 160, 80]; PETS.cogumelinho.glow = [255, 110, 100];
{
  const baseUpdatePet = updatePet, ground = (d) => d.mode === 'walk' || d.mode === 'hop';
  updatePet = function (g, e, dt, slot) {
    const d = e.def, p = g.player;
    baseUpdatePet(g, e, dt, slot);
    const still = ground(d) ? (Math.abs(e.vx || 0) < 6 && e.onGround) : false;
    e.idle = still ? (e.idle || 0) + dt : 0;
    // alegria: quando o dono pula, o pet de chão dá um pulinho (cada um com um atraso)
    const jumped = !p.onGround && (e.pJump === false || e.pJump === undefined) && p.vy < -80;
    if (jumped && ground(d) && e.onGround) { e.joy = 0.1 + slot * 0.09; }
    e.pJump = !p.onGround;
    if (e.joy > 0) { e.joy -= dt; if (e.joy <= 0 && e.onGround) { e.vy = -200; e.onGround = false; e.joyHop = 0.6; if (g.particles.length < 380) for (let i = 0; i < 4; i++) g.particles.push({ x: e.cx + (Math.random() - 0.5) * 6, y: e.y + 2, vx: (Math.random() - 0.5) * 24, vy: -18 - Math.random() * 12, life: 0.5, maxLife: 0.5, color: 'rgba(255,240,170,.9)', w: 1, h: 1, gravity: 30 }); } }
    if (e.joyHop > 0) e.joyHop -= dt;
    // olha para o dono quando está parado
    if (e.idle > 0.8 && ground(d)) e.facing = Math.sign(p.cx - e.cx) || e.facing;
    // partículas extras
    const r = Math.random(), spark = (x, y, c, vy, life, vx = 0) => { if (g.particles.length < 380) g.particles.push({ x, y, vx, vy, life, maxLife: life, color: c, w: 1, h: 1, gravity: vy < 0 ? -8 : 30 }); };
    const key = d.key;
    if (key === 'tigrinho' && r < dt * 2) spark(e.cx + (Math.random() - 0.5) * 12, e.y + 2, 'rgba(255,190,90,.8)', -14, 0.8);
    if (key === 'raposinha' && r < dt * 2.4) spark(e.cx - e.facing * 9, e.y + 3, 'rgba(255,200,130,.8)', -10, 0.7);
    if (key === 'sapinho' && e.joyHop > 0 && r < dt * 20) spark(e.cx, e.y + e.h, 'rgba(180,240,250,.9)', -16, 0.4, (Math.random() - 0.5) * 30);
    if (key === 'corujinha' && r < dt * 0.9) spark(e.cx + (Math.random() - 0.5) * 8, e.cy + 4, 'rgba(210,170,110,.9)', 14, 1.4, (Math.random() - 0.5) * 12);
    if (key === 'besourinho' && !still && r < dt * 5) spark(e.cx - e.facing * 8, e.y + e.h - 2, 'rgba(160,210,255,.7)', -4, 0.3);
    if (key === 'yetizinho' && e.idle > 9 && r < dt * 4) spark(e.cx + (Math.random() - 0.5) * 10, e.y + 6, 'rgba(235,248,255,.9)', 10, 1.2, (Math.random() - 0.5) * 10);
    if (key === 'mininucleo' && r < dt * 3) spark(e.cx + (Math.random() - 0.5) * 18, e.cy + (Math.random() - 0.5) * 10, '#ffd27a', -6, 0.9);
    if (key === 'fantasminha' && r < dt * 1.2) spark(e.cx + (Math.random() - 0.5) * 12, e.cy - 2, 'rgba(200,235,255,.9)', -10, 1.2);
    if (key === 'pintinho' && r < dt * 1.5) spark(e.cx + (Math.random() - 0.5) * 14, e.cy + (Math.random() - 0.5) * 8, '#fff7a8', 0, 0.2);
    if (key === 'gelatina' && e.idle > 1 && r < dt * 1.4) spark(e.cx + (Math.random() - 0.5) * 8, e.cy, 'rgba(210,255,250,.8)', -14, 0.9);
  };
}
drawPets = function (ctx, g) {
  if (!g.pets?.size) return;
  for (const e of g.pets.values()) {
    const d = e.def, t = e.clock, ground = d.mode === 'walk' || d.mode === 'hop', idle = e.idle || 0;
    const sleeping = ground && idle > 9, sitting = ground && idle > 2.2 && !sleeping;
    const moving = Math.abs(e.vx || 0) > 6 && (d.mode === 'walk' || d.mode === 'fly' || e.air);
    const blink = sleeping || (t % 4.6) < 0.14 || (t % 11.3) < 0.12;
    let frame;
    if (d.key === 'sapinho') frame = e.air ? 2 : (e.hopT > 0.12 ? 1 : 0);
    else if (d.key === 'gelatina') frame = e.air ? (e.vy < 0 ? 1 : 3) : (e.hopT > 0.1 ? 2 : 0);
    else if (d.key === 'fantasminha') frame = Math.floor(t * 6) % 8;
    else if (d.key === 'pintinho' || d.key === 'corujinha') frame = Math.floor(t * (d.key === 'pintinho' ? 14 : 8) * (Math.abs(e.vx || 0) > 30 ? 1.3 : 1)) % 4;
    else if (d.key === 'mininucleo') frame = 0;
    else frame = Math.floor(e.gait) % d.frames;
    const img = petSprite(d, frame, { moving, air: e.air, blink, t });
    const K = d.k || 1, breathe = Math.sin(t * (sleeping ? 1.3 : 2.2)) * (sleeping ? 0.035 : 0.018);
    ctx.save(); ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(e.cx), Math.round(e.y + e.h));
    ctx.scale(e.facing < 0 ? -1 : 1, 1);
    const cyAura = ground ? -d.size * 0.4 : -e.h / 2;
    if (d.glow) { const R = d.size * 0.85, gl = ctx.createRadialGradient(0, cyAura, 1, 0, cyAura, R), c = d.glow; gl.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${sleeping ? 0.14 : 0.28})`); gl.addColorStop(0.55, `rgba(${c[0]},${c[1]},${c[2]},0.1)`); gl.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`); ctx.fillStyle = gl; ctx.fillRect(-R, cyAura - R, R * 2, R * 2); }
    if (ground) { ctx.fillStyle = 'rgba(0,0,0,0.28)'; const sw = Math.round(d.size * 0.32); ctx.fillRect(-sw, 0, sw * 2, 1); ctx.fillRect(-sw + 2, 1, sw * 2 - 4, 1); }
    if (d.key === 'fantasminha') ctx.globalAlpha = 0.88;
    if (d.glow) { ctx.shadowColor = `rgb(${d.glow[0]},${d.glow[1]},${d.glow[2]})`; ctx.shadowBlur = 5; }
    const half = d.size / 2;
    if (ground) {
      // chão: sentado fica mais baixo e largo, dormindo vira um pãozinho que respira
      const sy = (sleeping ? 0.8 : sitting ? 0.9 : 1) * (1 + breathe), sx = sleeping ? 1.1 : sitting ? 1.03 : 1, bob = (moving || e.joyHop > 0) ? 0 : 0;
      ctx.scale(sx, sy);
      ctx.drawImage(img, -half, -(d.size - 2 * K) + bob);
    } else {
      const tilt = d.mode === 'fly' ? Math.max(-0.25, Math.min(0.25, (Math.abs(e.vx || 0) / 480))) : Math.sin(t * 1.5) * 0.07;
      ctx.translate(0, -e.h / 2); ctx.rotate(tilt + (d.mode === 'fly' ? Math.sin(t * 3) * 0.04 : 0));
      if (d.key === 'fantasminha') ctx.scale(1 - Math.min(0.12, Math.abs(e.vx || 0) / 900), 1 + Math.min(0.14, Math.abs(e.vx || 0) / 700) + Math.sin(t * 2) * 0.02);
      ctx.drawImage(img, -half, -half);
    }
    ctx.restore();
    if (sleeping) {   // "Z z z" subindo
      ctx.save(); ctx.font = 'bold 6px monospace'; ctx.textAlign = 'center'; ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(20,14,30,.85)';
      for (let i = 0; i < 3; i++) { const ph = ((t * 0.5 + i / 3) % 1), a = Math.sin(ph * Math.PI), x = e.cx + e.facing * (d.size * 0.35 + ph * 6) + Math.sin(ph * 6 + i) * 1.5, y = e.y + e.h - d.size * 0.75 - ph * 12; ctx.globalAlpha = a; ctx.strokeText('z', x, y); ctx.fillStyle = '#e8ecff'; ctx.fillText('z', x, y); }
      ctx.restore();
    }
  }
};
