'use strict';
// =====================================================================================
//  PETS — segunda passada: proporção "chibi" (cabeção, corpo curto, olhos grandes) para os sete
//  que ficaram sem graça. Sapinho, Raposinha, Gelatina e Mini-Núcleo continuam como estavam.
//  Carrega depois de pets-icons.js e antes de game.js.
// =====================================================================================

const PET2_NEW = ['tigrinho', 'besourinho', 'yetizinho', 'pintinho', 'corujinha', 'cogumelinho', 'fantasminha'];
const P5 = (a, b, c, d, e) => [a, b, c, d, e];
// olho grande 3x3: contorno colorido, pupila à direita e brilho
function bigEye(s, x, y, st, ring, pupil = [26, 16, 18], lid = [60, 30, 20]) {
  if (st.blink) { PK.line(s, x - 0.5, y + 1.4, x + 2.5, y + 1.4, lid); return; }
  for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) PK.px(s, x + dx, y + dy, ring);
  for (let dy = 0; dy < 3; dy++) { PK.px(s, x + 1, y + dy, pupil); PK.px(s, x + 2, y + dy, pupil); }
  PK.px(s, x + 1, y, [255, 255, 255]);
}
function stripeAt(x, y, bands, slope, ymax) { for (const b of bands) if (Math.abs(x - (b + (y - 14) * slope)) < 0.85 && y < ymax) return true; return false; }

Object.assign(PET_PAINT, {
  tigrinho(s, f, st) {   // 26x26
    const P = PET_PAL.tigre, stripe = [58, 26, 12], ph = (f / 4) * Math.PI * 2, tw = Math.sin(st.t * 3) * 0.8, cream = P5([226, 196, 150], [240, 214, 170], [252, 230, 190], [255, 244, 220], [255, 252, 238]);
    for (const [x, o, far] of [[6, 0, 1], [13, 2, 1], [9, 1, 0], [16.5, 3, 0]]) {
      const q = st.moving ? Math.sin(ph + o * 1.6) * 1.8 : 0, lift = st.moving ? Math.max(0, Math.cos(ph + o * 1.6)) * 2.4 : 0;
      PK.line(s, x, 20, x + q, 23 - lift, far ? [150, 72, 24] : P[2]); PK.line(s, x + 1, 20, x + 1 + q, 23 - lift, far ? [120, 56, 20] : P[1]);
      PK.line(s, x + q - 0.3, 24 - lift, x + q + 2, 24 - lift, cream[3]);
    }
    const tail = [[4, 19], [3, 18], [2, 16], [1, 14], [1, 12], [2 + tw * 0.4, 10], [3 + tw, 9], [4 + tw, 9]];
    tail.forEach(([x, y], i) => { const c = i > 5 ? stripe : (i % 2 ? stripe : P[2]); PK.px(s, x, y, c); PK.px(s, x, y + 1, i % 2 ? P[1] : P[3]); PK.px(s, x + 1, y, c); });
    PK.blob(s, 10, 18, 7, 4.8, P, 3, 255, true);
    PK.blob(s, 10, 21.2, 4.8, 1.4, cream, 4);
    petMark(s, 10, 18, 7, 4.8, (x, y) => stripeAt(x, y, [5, 8, 11, 14], 0.12, 20.5), stripe);
    PK.blob(s, 17.5, 11.5, 7.6, 6.6, P, 9, 255, true);                                                       // cabeção
    for (const ex of [12.4, 22.8]) { PK.blob(s, ex, 5.8, 2.6, 2.8, P, Math.round(ex)); PK.blob(s, ex + 0.2, 6.6, 1.1, 1.5, [[200, 80, 100], [226, 108, 128], [240, 140, 152], [250, 170, 178], [255, 200, 204]], 5); PK.px(s, ex - 0.6, 3.6, stripe); PK.px(s, ex + 0.4, 3.4, stripe); }
    for (const [x, h] of [[17.5, 3], [15.2, 2.2], [19.8, 2.2]]) { PK.line(s, x, 5.8, x, 5.8 + h, stripe); }
    for (const [x0, x1, y] of [[10.8, 13.4, 11], [10.8, 13.4, 13.4], [24, 26, 11.2], [24, 26, 13.6]]) PK.line(s, x0, y, x1, y + 0.6, stripe);
    bigEye(s, 14, 9.6, st, [255, 190, 40]); bigEye(s, 20, 9.6, st, [255, 190, 40]);
    PK.blob(s, 18, 14.8, 4.3, 2.8, cream, 15);
    PK.px(s, 17, 13, [232, 96, 116]); PK.px(s, 18, 13, [232, 96, 116]); PK.px(s, 19, 13, [232, 96, 116]); PK.px(s, 18, 14, [70, 30, 24]);
    PK.px(s, 16, 15.4, [70, 30, 24]); PK.px(s, 17, 16, [70, 30, 24]); PK.px(s, 19, 16, [70, 30, 24]); PK.px(s, 20, 15.4, [70, 30, 24]); PK.px(s, 18, 15.6, [240, 120, 130]);
    PK.line(s, 22, 14.6, 25, 14, [255, 240, 220], 220); PK.line(s, 22, 15.8, 25, 16.4, [255, 240, 220], 220); PK.line(s, 14, 14.6, 11, 14, [255, 240, 220], 220); PK.line(s, 14, 15.8, 11, 16.4, [255, 240, 220], 220);
  },
  besourinho(s, f, st) {   // 26x26
    const P = P5([22, 42, 92], [38, 82, 150], [66, 130, 204], [124, 186, 240], [214, 242, 255]), ph = (f / 4) * Math.PI * 2, brass = [236, 188, 78], brassD = [160, 112, 40], leg = [26, 34, 62];
    for (let i = 0; i < 3; i++) {
      const q = st.moving ? Math.sin(ph + i * 2.1) * 1.4 : 0, lift = st.moving ? Math.max(0, Math.cos(ph + i * 2.1)) * 1.8 : 0, x = 6.5 + i * 4.4;
      PK.line(s, x, 19, x + q - 1, 22.5 - lift, leg); PK.line(s, x + 1, 19, x + 1 + q - 1, 22.5 - lift, [40, 52, 88]); PK.px(s, x + q - 1, 24 - lift, brass); PK.px(s, x + q, 24 - lift, brassD); PK.line(s, x + q - 1, 23 - lift, x + q - 1, 24 - lift, leg);
    }
    PK.blob(s, 11.5, 14.6, 9, 7, P, 21);                                                                      // casco
    for (let y = 9; y <= 21; y++) PK.px(s, Math.round(11.5 + Math.sin(y * 0.4) * 0.4), y, P[0]);               // emenda
    PK.line(s, 4, 11, 7.6, 8.4, P[4]); PK.px(s, 8.5, 8, P[4]); PK.px(s, 4, 12, P[3]); PK.px(s, 4, 13.4, P[3]); PK.line(s, 14, 8.6, 17, 10.6, P[3]);   // brilho
    for (const [x, y] of [[6, 17], [9, 18], [14, 18], [17, 17], [7.4, 12.6], [15.6, 12.6]]) { PK.px(s, x, y, brass); PK.px(s, x + 1, y, brassD); }
    PK.line(s, 4, 20.6, 19, 20.6, P[0]);
    PK.blob(s, 21, 16.6, 3.8, 3.6, P5([18, 30, 66], [32, 56, 104], [54, 90, 148], [92, 138, 196], [160, 204, 240]), 31);   // cabeça
    PK.line(s, 21, 13.4, 23, 8, [20, 30, 56]); PK.line(s, 22, 13.4, 24, 8, [38, 56, 98]); PK.line(s, 23, 8, 25, 6.4, [20, 30, 56]); PK.line(s, 23.4, 8.4, 25, 9.6, [20, 30, 56]); PK.px(s, 24.4, 6.6, brass);   // chifre
    if (st.blink) PK.line(s, 20, 16, 23.6, 16, [255, 230, 120]); else { for (const x of [20.4, 22.8]) { PK.px(s, x, 15.4, [255, 226, 100]); PK.px(s, x + 1, 15.4, [255, 226, 100]); PK.px(s, x, 16.4, [255, 190, 50]); PK.px(s, x + 1, 16.4, [24, 16, 12]); } PK.px(s, 20.4, 15.4, WHITE); }
    PK.line(s, 22.4, 19, 24.4, 21, leg); PK.line(s, 20.4, 19.6, 21.4, 21.4, leg);
    PK.line(s, 18.6, 13.6, 17, 10.6 + Math.sin(st.t * 3) * 0.6, leg); PK.px(s, 17, 10.4, brass);
    if (Math.floor(st.t * 1.4) % 5 === 0) for (const [x, y, a] of [[7, 9, 255], [6, 9, 150], [8, 9, 150], [7, 8, 150], [7, 10, 150]]) PK.px(s, x, y, WHITE, a);
  },
  yetizinho(s, f, st) {   // 26x26
    const P = PET_PAL.yeti, wob = st.moving ? Math.sin((f / 4) * Math.PI * 2) : Math.sin(st.t * 2) * 0.4, foot = P5([36, 60, 100], [56, 88, 134], [84, 122, 170], [122, 158, 200], [168, 198, 228]);
    PK.blob(s, 8.5, 23, 3.4, 1.8, foot, 5); PK.blob(s, 17.5, 23, 3.4, 1.8, foot, 6);
    PK.blob(s, 13, 15.4 + wob * 0.4, 9.4, 8, P, 41, 255, true);                                              // corpo
    PK.blob(s, 13, 18.6, 5.2, 4.2, P5([196, 214, 236], [216, 230, 246], [236, 244, 253], [248, 252, 255], WHITE), 42, 255, true);
    PK.blob(s, 3.6, 16 + wob * 0.8, 2.6, 3.8, P, 7, 255, true); PK.blob(s, 22.4, 16 - wob * 0.8, 2.6, 3.8, P, 8, 255, true);
    for (const x of [2.4, 3.8, 5]) PK.px(s, x, 19.4 + wob * 0.8, [40, 60, 100]); for (const x of [21, 22.2, 23.6]) PK.px(s, x, 19.4 - wob * 0.8, [40, 60, 100]);
    PK.blob(s, 13, 10.6 + wob * 0.3, 6.6, 5.2, P5([86, 138, 188], [112, 166, 214], [148, 198, 236], [188, 226, 248], [226, 246, 255]), 11);   // rosto azul-gelo
    for (const ex of [6.2, 19.8]) { PK.line(s, ex, 6, ex - (ex < 13 ? 1 : -1), 3, [150, 224, 252]); PK.line(s, ex + 1, 6, ex + 1 - (ex < 13 ? 1 : -1), 3, [210, 244, 255]); PK.px(s, ex - (ex < 13 ? 1 : -1), 2, WHITE); }   // dois chifrinhos de gelo
    PK.line(s, 8.6, 7.8, 11.6, 8.8, P[3]); PK.line(s, 17.4, 7.8, 14.4, 8.8, P[3]);
    bigEye(s, 8.8, 9.4, st, [210, 238, 255], [24, 32, 64], [30, 40, 72]); bigEye(s, 14.4, 9.4, st, [210, 238, 255], [24, 32, 64], [30, 40, 72]);
    PK.line(s, 11.4, 14.2, 14.6, 14.2, [44, 56, 96]); PK.px(s, 11, 13.6, [44, 56, 96]); PK.px(s, 15, 13.6, [44, 56, 96]); PK.px(s, 12, 15, WHITE); PK.px(s, 14, 15, WHITE);
    PK.px(s, 7.4, 12.6, [255, 170, 196], 210); PK.px(s, 18.6, 12.6, [255, 170, 196], 210);
  },
  pintinho(s, f, st) {   // 24x24, voando
    const P = PET_PAL.pinto, k = f % 4, blue = [[22, 70, 150], [46, 128, 224], [126, 210, 255]], flap = [-5, -1.5, 3.5, 1][k];
    const wing = (side) => {                        // asa de relâmpago: três penas em zigue-zague
      const x0 = 12 + side * 6.4, y0 = 14.4;
      for (let i = 0; i < 3; i++) {
        const l = 4 + i * 1.4 - (i === 2 ? 0.6 : 0), ex = x0 + side * (l + 1), ey = y0 + flap * (1 + i * 0.2) + i * 1.6 - 1;
        PK.line(s, x0, y0 + i, ex, ey, i % 2 ? blue[1] : blue[0]); PK.line(s, x0, y0 + i + 1, ex, ey + 1, i % 2 ? blue[2] : blue[1]); PK.px(s, ex, ey, WHITE);
      }
    };
    wing(-1);
    PK.line(s, 9.5, 20, 9, 22.4, [236, 134, 40]); PK.line(s, 14, 20, 14.5, 22.4, [236, 134, 40]); PK.px(s, 8, 23, [236, 134, 40]); PK.px(s, 9.5, 23, [236, 134, 40]); PK.px(s, 14, 23, [236, 134, 40]); PK.px(s, 15.5, 23, [236, 134, 40]);
    PK.blob(s, 12, 14, 8, 7.4, P, 61, 255, true);                                                            // bolota de penas
    PK.blob(s, 12, 17.6, 4.8, 3, P5([240, 210, 120], [250, 226, 150], [255, 240, 180], [255, 248, 210], [255, 253, 232]), 63);
    PK.px(s, 6, 14, blue[2]);
    for (const [x, y] of [[10, 5], [11, 4], [12, 3], [13, 4], [14, 5]]) { PK.px(s, x, y, blue[1]); PK.px(s, x + (x > 12 ? 0 : 1), y + 1, blue[2]); }   // topete de raios
    PK.px(s, 12, 2.4, WHITE);
    bigEye(s, 8, 10.4, st, [255, 240, 150], [26, 16, 12], [80, 50, 20]); bigEye(s, 14, 10.4, st, [255, 240, 150], [26, 16, 12], [80, 50, 20]);
    PK.px(s, 11, 14, [255, 154, 44]); PK.px(s, 12, 14, [255, 154, 44]); PK.px(s, 13, 14, [255, 154, 44]); PK.px(s, 11.6, 15, [226, 116, 30]); PK.px(s, 12.4, 15, [226, 116, 30]);   // bico
    PK.px(s, 6.4, 13.4, [255, 150, 130], 200); PK.px(s, 17.6, 13.4, [255, 150, 130], 200);
    wing(1);
    if (Math.floor(st.t * 6) % 3 === 0) { PK.px(s, 3, 8, [200, 250, 255]); PK.px(s, 2, 9, WHITE, 200); PK.px(s, 4, 9, WHITE, 150); }
  },
  corujinha(s, f, st) {   // 24x24, voando
    const P = PET_PAL.coruja, k = f % 4, up = [-1, -0.1, 0.9, 0.2][k], face = P5([208, 178, 130], [232, 208, 160], [248, 230, 188], [255, 245, 214], [255, 253, 238]), wingC = P5([62, 40, 26], [92, 62, 38], [128, 90, 56], [168, 126, 80], [206, 164, 108]);
    const wing = (side, dark) => {
      const cx = 12 + side * 7, cy = 14 - up * 3, pal = dark ? P5([46, 30, 20], [72, 48, 30], [100, 70, 44], [132, 96, 60], [166, 124, 82]) : wingC;
      PK.blob(s, cx, cy, 3, 5.6 + Math.abs(up), pal, 86 + side, 255, true);
      for (let i = 0; i < 3; i++) PK.px(s, cx + side * 0.5, cy - 2 + i * 2.2, pal[4]);
      PK.px(s, cx + side * 1.5, cy + 5.4 + up * 1.4, pal[1]); PK.px(s, cx - side * 0.5, cy + 6.2 + up * 1.4, pal[1]);   // pontas das penas
    };
    wing(-1, true);
    PK.blob(s, 12, 14, 7.6, 8.4, P, 81, 255, true);                                                           // corpo-ovo
    PK.blob(s, 12, 18, 4.6, 4, face, 85);                                                                     // barriga clara
    for (const [x, y] of [[10, 17], [12, 17], [14, 17], [11, 19], [13, 19], [10, 21], [14, 21]]) { PK.px(s, x, y, P[2]); PK.px(s, x, y + 1, P[3]); }
    PK.px(s, 9.4, 22.6, [244, 170, 70]); PK.px(s, 10.6, 22.6, [244, 170, 70]); PK.px(s, 13.4, 22.6, [244, 170, 70]); PK.px(s, 14.6, 22.6, [244, 170, 70]);
    for (const [x, y] of [[5.4, 4.4], [6.2, 3], [7.4, 4], [18.6, 4.4], [17.8, 3], [16.6, 4]]) PK.px(s, x, y, P[0]);   // tufos
    PK.px(s, 6.8, 5.4, P[1]); PK.px(s, 17.2, 5.4, P[1]);
    PK.blob(s, 8.6, 10.4, 4.1, 4.1, face, 82); PK.blob(s, 15.4, 10.4, 4.1, 4.1, face, 83);                    // discos faciais
    for (const ex of [8.6, 15.4]) { if (st.blink) PK.line(s, ex - 2, 10.4, ex + 2, 10.4, P[0]); else { PK.blob(s, ex, 10.4, 2.8, 2.8, P5([255, 140, 10], [255, 172, 26], [255, 198, 52], [255, 222, 100], [255, 240, 160]), 84); PK.blob(s, ex + 0.4, 10.6, 1.3, 1.5, [[14, 10, 12], [14, 10, 12], [14, 10, 12], [14, 10, 12], [14, 10, 12]], 1); PK.px(s, ex - 0.6, 9.2, WHITE); } }
    PK.px(s, 11.4, 13.4, [250, 164, 58]); PK.px(s, 12.6, 13.4, [250, 164, 58]); PK.px(s, 12, 14.4, [206, 112, 28]);
    wing(1, false);
  },
  cogumelinho(s, f, st) {   // 24x24
    const P = P5([110, 16, 26], [176, 30, 40], [222, 58, 54], [246, 108, 98], [255, 176, 152]), stem = P5([156, 130, 98], [200, 174, 134], [230, 208, 168], [246, 232, 198], [255, 246, 222]);
    const ph = (f / 4) * Math.PI * 2, bob = st.moving ? Math.round(Math.abs(Math.sin(ph))) : 0, sway = st.moving ? Math.sin(ph) : 0, shoe = P5([50, 30, 22], [74, 46, 34], [100, 68, 48], [130, 92, 66], [160, 120, 90]);
    PK.blob(s, 8.4, 22.4 - (st.moving ? Math.max(0, Math.sin(ph)) * 1.6 : 0), 3, 1.5, shoe, 111); PK.blob(s, 15.6, 22.4 - (st.moving ? Math.max(0, -Math.sin(ph)) * 1.6 : 0), 3, 1.5, shoe, 112);
    PK.blob(s, 12, 17.4 - bob, 5.2, 5, stem, 113);                                                             // pé
    PK.blob(s, 5.6, 17.4 - bob + sway, 1.8, 1.8, stem, 118); PK.blob(s, 18.4, 17.4 - bob - sway, 1.8, 1.8, stem, 119);
    for (let x = 4; x <= 20; x++) { PK.px(s, x, 13 - bob, [236, 218, 178]); }                                  // lamelas sob o chapéu
    for (let x = 5; x <= 19; x += 2) PK.px(s, x, 13.6 - bob, [196, 170, 130]);
    PK.blob(s, 12, 8.6 - bob, 10.4, 6.6, P, 114);                                                              // chapéu
    PK.line(s, 2.4, 12.2 - bob, 21.6, 12.2 - bob, P[0]);
    for (const [x, y, r] of [[7, 6.6, 2.1], [14.4, 4.6, 2.4], [19, 9.2, 1.7], [10.4, 10.2, 1.3], [4.4, 10.2, 1.1], [17, 11.4, 1]]) PK.blob(s, x, y - bob, r, r, P5([232, 214, 184], [246, 236, 210], [255, 250, 232], [255, 255, 246], WHITE), Math.round(x * 3));
    PK.px(s, 5.4, 4.6, P[4]); PK.px(s, 6.4, 3.8, P[4]); PK.px(s, 8, 3.4, P[4]); PK.px(s, 9, 3.2, P[4]);
    bigEye(s, 8.6, 15.2 - bob, st, [60, 40, 30], [20, 12, 12], [70, 44, 34]); bigEye(s, 13.6, 15.2 - bob, st, [60, 40, 30], [20, 12, 12], [70, 44, 34]);
    PK.line(s, 10.6, 19 - bob, 13.4, 19 - bob, [100, 56, 44]); PK.px(s, 10, 18.4 - bob, [100, 56, 44]); PK.px(s, 14, 18.4 - bob, [100, 56, 44]);
    PK.px(s, 7.4, 18 - bob, [255, 150, 140], 190); PK.px(s, 16.6, 18 - bob, [255, 150, 140], 190);
  },
  fantasminha(s, f, st) {   // 24x24
    const P = PET_PAL.fantasma, w = Math.sin((f / 8) * Math.PI * 2), scarf = P5([16, 90, 110], [26, 130, 150], [44, 170, 184], [96, 214, 218], [170, 244, 240]);
    PK.blob(s, 12, 10, 8, 8, P, 121, 240);                                                                    // cabeça redonda
    for (let y = 11; y <= 22; y++) for (let x = 3; x <= 21; x++) {                                           // lençol com barra ondulada
      const half = 8 - (y - 11) * 0.12, edge = 20.4 + Math.sin(x * 0.9 + w * 3.2) * 1.8 + (Math.abs(x - 12) < 2 ? 1 : 0);
      if (y <= edge && Math.abs(x - 12 + w * 0.4 * (y - 11) / 9) <= half) PK.px(s, x, y, PK.tone(P, -(y - 10) / 12 * 0.55 - (x - 12) / 20 + 0.2), 240 - (y - 11) * 7);
    }
    PK.px(s, 7.4, 5, WHITE, 240); PK.px(s, 8.4, 4.4, WHITE, 230); PK.px(s, 6.6, 6.4, WHITE, 210); PK.px(s, 9.6, 4, WHITE, 180);
    PK.blob(s, 3.2, 15.4 + w * 1.2, 1.7, 2.6, P, 123, 235); PK.blob(s, 20.8, 15.4 - w * 1.2, 1.7, 2.6, P, 124, 235);   // bracinhos
    PK.line(s, 6.6, 16.4, 17.4, 16.4, scarf[2]); PK.line(s, 6.4, 17.4, 17.6, 17.4, scarf[1]); PK.line(s, 7, 15.8, 17, 15.8, scarf[3]);
    PK.line(s, 16.4, 17.4, 17.4, 20.6 + w * 0.6, scarf[2]); PK.line(s, 17.4, 17.4, 18.4, 20.2 + w * 0.6, scarf[1]); PK.px(s, 17.4, 21 + w * 0.6, scarf[4]);
    if (st.blink) { PK.line(s, 7.6, 11, 10.6, 11, [40, 50, 90]); PK.line(s, 13.4, 11, 16.4, 11, [40, 50, 90]); }
    else for (const ex of [8, 14]) { for (let y = 8.4; y <= 12.4; y++) { PK.px(s, ex, y, [24, 30, 66]); PK.px(s, ex + 1, y, [24, 30, 66]); PK.px(s, ex + 2, y, [24, 30, 66]); } PK.px(s, ex, 8.4, WHITE); PK.px(s, ex + 1, 8.4, WHITE); PK.px(s, ex + 2, 12.4, [96, 116, 200]); }
    PK.line(s, 10.6, 14.4, 13.4, 14.4, [24, 30, 66]); PK.px(s, 10, 13.8, [24, 30, 66]); PK.px(s, 14, 13.8, [24, 30, 66]);
    PK.px(s, 6.4, 13.2, [255, 170, 200], 200); PK.px(s, 17.6, 13.2, [255, 170, 200], 200);
  },
});
for (const k of PET2_NEW) { const d = PETS[k]; d.k = 1; d.size = k === 'tigrinho' || k === 'besourinho' || k === 'yetizinho' ? 26 : 24; d.box = k === 'yetizinho' ? [13, 13] : d.box; }
PETS.tigrinho.box = [13, 11]; PETS.besourinho.box = [13, 9]; PETS.corujinha.box = [10, 12]; PETS.cogumelinho.box = [10, 12]; PETS.fantasminha.box = [11, 14]; PETS.pintinho.box = [10, 10];
PET_SPRITES.clear();
