'use strict';
// =====================================================================================
//  PETS
// =====================================================================================
// Cada pet é um acessório (cinto): equipado, ele passa a seguir o jogador. Cinco vêm de chefes
// (Tigre, Casco de Ferro, Yeti, Núcleo e Olho da Tempestade) e seis aparecem em baús pelo mundo.
// O espírito do urso e a aranhinha continuam nos seus arquivos (js/bear-loot.js, js/spider-loot.js).
//
// Movimento:  walk  anda atrás do dono, sobe degrau pulando
//             hop   vai aos pulinhos
//             fly   voa em volta, levemente acima
//             float flutua devagar, balançando
// Os desenhos são pixel art feito em código (16x16, sem imagem pronta). O ícone do item sai do
// primeiro quadro do próprio pet, então inventário e mundo sempre combinam.

const PET_IDS = { TIGRINHO: 290, BESOURINHO: 291, YETIZINHO: 292, MININUCLEO: 293, PINTINHO: 294, SAPINHO: 295, CORUJINHA: 296, RAPOSINHA: 297, GELATINA: 298, COGUMELINHO: 299, FANTASMINHA: 300 };
Object.assign(ITEM, Object.fromEntries(Object.entries(PET_IDS).map(([k, v]) => ['PET_' + k, v])));

// ---------------------------------------------------------------- pincéis
const PK = {
  px(s, x, y, c, a) { s.set(Math.round(x), Math.round(y), c, a); },
  line(s, x0, y0, x1, y1, c, a) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); for (let i = 0; i <= n; i++) this.px(s, x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, c, a); },
  tone(pal, lit) { return lit > 0.62 ? pal[4] : lit > 0.22 ? pal[3] : lit > -0.18 ? pal[2] : lit > -0.55 ? pal[1] : pal[0]; },
  // elipse sombreada (luz de cima à esquerda); fuzz = pelinhos no alto
  blob(s, cx, cy, rx, ry, pal, seed = 1, alpha = 255, fuzz = false) {
    for (let y = Math.floor(-ry - 1); y <= Math.ceil(ry + 1); y++) for (let x = Math.floor(-rx - 1); x <= Math.ceil(rx + 1); x++) {
      const d = (x / rx) ** 2 + (y / ry) ** 2; if (d > 1) continue;
      const lit = -(y / ry) * 0.72 - (x / rx) * 0.3 + (hash2(x, y, seed) - 0.5) * 0.2;
      this.px(s, cx + x, cy + y, this.tone(pal, lit), alpha);
      if (fuzz && d > 0.58 && hash2(x, y, seed + 5) < 0.45) this.px(s, cx + x, cy + y - (y < 0 ? 1 : 0), pal[3], Math.min(alpha, 190));
    }
  },
  eye(s, x, y, big, c = [24, 16, 22], glint = [255, 255, 255]) {   // olhinho fofo com brilho
    if (big) { this.px(s, x, y, c); this.px(s, x + 1, y, c); this.px(s, x, y + 1, c); this.px(s, x + 1, y + 1, c); this.px(s, x, y, glint); }
    else { this.px(s, x, y, c); this.px(s, x, y - 1, glint, 220); }
  },
};

// ---------------------------------------------------------------- os desenhos
// paint(s, f, st): f = quadro (0..7), st = { moving, air, blink, t }. Pés na linha 14 (sprite 16x16).
const PET_PAL = {
  tigre: [[90, 42, 16], [158, 80, 24], [224, 128, 40], [248, 176, 82], [255, 216, 150]],
  besouro: [[22, 36, 66], [42, 74, 118], [72, 120, 172], [120, 170, 212], [196, 228, 246]],
  yeti: [[140, 162, 192], [192, 210, 230], [230, 240, 250], [250, 253, 255], [255, 255, 255]],
  nucleo: [[22, 20, 26], [44, 38, 48], [76, 62, 70], [112, 92, 96], [160, 132, 128]],
  pinto: [[170, 118, 18], [226, 170, 40], [255, 214, 80], [255, 238, 150], [255, 252, 214]],
  sapo: [[26, 66, 34], [46, 108, 50], [80, 160, 70], [128, 204, 100], [190, 236, 150]],
  coruja: [[58, 38, 26], [102, 70, 42], [150, 108, 64], [196, 154, 98], [232, 200, 150]],
  raposa: [[104, 42, 18], [172, 74, 22], [226, 118, 42], [248, 164, 80], [255, 208, 142]],
  gel: [[18, 96, 118], [38, 158, 176], [88, 210, 216], [170, 244, 240], [232, 255, 252]],
  cogu: [[96, 14, 24], [168, 28, 38], [218, 58, 54], [246, 108, 98], [255, 170, 148]],
  fantasma: [[142, 170, 204], [190, 214, 238], [226, 240, 252], [244, 250, 255], [255, 255, 255]],
};

const PET_PAINT = {
  tigrinho(s, f, st) {
    const P = PET_PAL.tigre, stripe = [58, 28, 14], cream = [252, 232, 200], ph = (f / 4) * Math.PI * 2;
    for (const [x, o, far] of [[4, 0, 1], [9, 2, 1], [5.5, 1, 0], [10.5, 3, 0]]) {
      const q = st.moving ? Math.sin(ph + o * 1.6) : 0, lift = st.moving ? Math.max(0, Math.cos(ph + o * 1.6)) * 1.8 : 0, c = far ? [120, 58, 22] : P[2];
      PK.line(s, x, 11, x + q * 1.6, 14 - lift, c); PK.px(s, x + q * 1.6 + 0.5, 14 - lift, [250, 226, 190]);
    }
    for (const [x, y] of [[2, 9], [1, 8], [1, 7], [1, 6], [2, 5]]) PK.px(s, x, y, P[2]);                // rabo em S
    PK.px(s, 1, 7, stripe); PK.px(s, 2, 5, stripe); PK.px(s, 2, 4, P[1]);
    PK.blob(s, 7, 9.5, 4.7, 3.5, P, 3, 255, true);
    for (let x = 4; x <= 10; x++) if (x % 2) for (let y = 7; y <= 9; y++) PK.px(s, x, y, stripe);     // listras
    for (let x = 4; x <= 10; x++) PK.px(s, x, 12, cream);
    PK.blob(s, 11.5, 7, 3.4, 3.1, P, 9);
    PK.px(s, 9, 4, P[2]); PK.px(s, 10, 3, P[2]); PK.px(s, 10, 4, [240, 140, 150]); PK.px(s, 13, 3, P[2]); PK.px(s, 14, 4, P[2]); PK.px(s, 13, 4, [240, 140, 150]); // orelhas
    PK.blob(s, 13.5, 8.8, 1.7, 1.3, [cream, cream, cream, cream, cream]);
    PK.px(s, 15, 8, [230, 100, 116]); PK.px(s, 11, 4, stripe); PK.px(s, 12, 4, stripe); PK.px(s, 11.5, 5, stripe);
    if (st.blink) PK.line(s, 12, 6.5, 13, 6.5, stripe); else { PK.px(s, 12, 6, [255, 206, 70]); PK.px(s, 13, 6, [255, 206, 70]); PK.px(s, 13, 6, [40, 22, 12]); PK.px(s, 12, 5.8, [255, 255, 220]); }
    PK.line(s, 14, 9.6, 15, 10, stripe);
  },
  besourinho(s, f, st) {
    const P = PET_PAL.besouro, ph = (f / 4) * Math.PI * 2, leg = [22, 28, 44];
    for (let i = 0; i < 3; i++) {
      const q = st.moving ? Math.sin(ph + i * 2.1) : 0, x = 5 + i * 2.6;
      PK.line(s, x, 11, x - 2 + q, 14, leg); PK.line(s, x + 1, 11, x + 3 + q * 0.6, 14, leg);
    }
    PK.blob(s, 7, 9, 5.8, 4.2, P, 21);                                           // casco abaulado
    PK.line(s, 7, 5, 7, 12, P[0]);                                                // emenda das asas
    PK.px(s, 4, 7, P[4]); PK.px(s, 5, 6.5, P[4]); PK.px(s, 9, 7, P[4]); PK.px(s, 10, 7.5, P[3]);       // brilho
    for (const [x, y] of [[4, 11], [10, 11]]) PK.px(s, x, y, [216, 164, 64]);     // rebites de latão
    PK.px(s, 7, 8.5, [216, 164, 64]); PK.px(s, 6, 9, [150, 108, 36]);
    PK.blob(s, 12.5, 9.5, 2.3, 2, [[20, 26, 40], [34, 46, 70], [56, 76, 108], [88, 116, 150], [140, 170, 200]], 31);
    PK.px(s, 12, 8.5, [255, 255, 255]); if (!st.blink) { PK.px(s, 13, 9, [255, 220, 90]); PK.px(s, 12, 9, [255, 220, 90]); }
    PK.line(s, 14, 10.5, 15, 12, leg); PK.line(s, 13, 11, 14.2, 12.6, leg);       // mandíbulas
    PK.line(s, 13, 8, 15, 5.5 + Math.sin(st.t * 3) * 0.6, leg); PK.px(s, 15, 5.5, [216, 164, 64]); // antena
    if (Math.floor(st.t * 1.4) % 5 === 0) { PK.px(s, 5, 6, [255, 255, 255]); PK.px(s, 4, 6, [255, 255, 255], 160); PK.px(s, 6, 6, [255, 255, 255], 160); PK.px(s, 5, 5, [255, 255, 255], 160); }
  },
  yetizinho(s, f, st) {
    const P = PET_PAL.yeti, wob = st.moving ? Math.round(Math.sin((f / 4) * Math.PI * 2)) : 0, ice = [150, 220, 250];
    PK.blob(s, 5, 13, 1.6, 1.2, [[40, 64, 104], [60, 90, 136], [84, 118, 164], [120, 152, 192], [160, 190, 220]], 5);
    PK.blob(s, 10, 13, 1.6, 1.2, [[40, 64, 104], [60, 90, 136], [84, 118, 164], [120, 152, 192], [160, 190, 220]], 6);
    PK.blob(s, 7.5, 8 + wob * 0.4, 5.4, 5.2, P, 41, 255, true);                   // bolota de pelo
    PK.blob(s, 3, 9 + wob * 0.3, 1.5, 2, P, 7); PK.blob(s, 12.5, 9 + wob * 0.3, 1.5, 2, P, 8);   // braços
    PK.blob(s, 9, 8, 3, 2.7, [[88, 138, 184], [110, 164, 208], [142, 192, 228], [180, 220, 244], [214, 240, 252]], 11);   // carinha azul-gelo
    PK.px(s, 6, 3, ice); PK.px(s, 6, 2, [210, 244, 255]); PK.px(s, 10, 3, ice); PK.px(s, 11, 2, [210, 244, 255]); PK.px(s, 8, 2.5, ice);   // cristais de gelo na cabeça
    if (st.blink) { PK.line(s, 7, 7.5, 8.5, 7.5, [30, 40, 70]); PK.line(s, 10, 7.5, 11.2, 7.5, [30, 40, 70]); }
    else { PK.eye(s, 7, 6.5, true, [26, 34, 62]); PK.eye(s, 10, 6.5, true, [26, 34, 62]); }
    PK.px(s, 8.5, 9.5, [48, 60, 96]); PK.px(s, 9.5, 9.5, [48, 60, 96]); PK.px(s, 9, 10, [48, 60, 96]);
    PK.px(s, 6, 9, [255, 170, 190], 190); PK.px(s, 12, 9, [255, 170, 190], 190);  // bochechas
  },
  mininucleo(s, f, st) { // 20x20: esfera de basalto rachada pelo núcleo em brasa, com três estilhaços em órbita
    const P = PET_PAL.nucleo, cx = 10, cy = 10, pulse = 0.5 + 0.5 * Math.sin(st.t * 3);
    const glow = pulse > 0.5 ? [255, 214, 100] : [255, 150, 50];
    PK.blob(s, cx, cy, 5.4, 5.4, P, 51);
    // rachaduras incandescentes
    for (const [x0, y0, x1, y1] of [[7, 8, 10, 11], [10, 11, 14, 9], [10, 11, 11, 15], [8, 13, 10, 11], [10, 6, 10, 11]]) PK.line(s, x0, y0, x1, y1, [255, 110, 30]);
    PK.blob(s, cx, cy, 2.2, 2.2, [[190, 40, 14], [240, 90, 24], [255, 140, 40], glow, [255, 246, 190]], 17);
    PK.px(s, cx - 1, cy - 1, [255, 255, 235]);
    for (let i = 0; i < 3; i++) {           // estilhaços em volta
      const a = st.t * 1.9 + i * 2.094, ox = cx + Math.cos(a) * 8, oy = cy + Math.sin(a) * 3.4 * (Math.sin(a * 0.5 + 1) > 0 ? 1 : -1) * 0.9 + Math.sin(a) * 2, back = Math.sin(a) < 0;
      const c0 = back ? P[1] : P[2];
      PK.px(s, ox, oy - 1, c0); PK.px(s, ox - 1, oy, c0); PK.px(s, ox, oy, back ? P[2] : P[3]); PK.px(s, ox + 1, oy, c0); PK.px(s, ox, oy + 1, c0); PK.px(s, ox, oy, [255, 120, 40], back ? 120 : 220);
    }
  },
  pintinho(s, f, st) {
    const P = PET_PAL.pinto, up = f % 4 < 2, blue = [[24, 80, 160], [50, 140, 224], [120, 206, 255]];
    PK.line(s, 6, 12, 5, 14, [230, 130, 40]); PK.line(s, 9, 12, 10, 14, [230, 130, 40]);                    // patinhas
    // asa de trás (azul elétrico)
    if (up) { PK.line(s, 6, 9, 3, 4, blue[1]); PK.line(s, 5, 9, 3, 6, blue[0]); PK.px(s, 3, 3, blue[2]); }
    else { PK.line(s, 6, 9, 2, 10, blue[1]); PK.line(s, 6, 10, 3, 12, blue[0]); PK.px(s, 2, 10, blue[2]); }
    PK.line(s, 4, 9, 2, 8, blue[1]); PK.px(s, 2, 7, blue[2]);                                              // pena da cauda
    PK.blob(s, 8, 9, 4.8, 4.4, P, 61, 255, true);
    PK.blob(s, 10.5, 6, 3.2, 3, P, 62);
    PK.px(s, 9, 3, [255, 214, 80]); PK.px(s, 10, 2.5, [255, 238, 150]); PK.px(s, 11, 3, [255, 214, 80]);   // penugem de cima
    if (st.blink) PK.line(s, 11, 6, 12, 6, [60, 40, 20]); else { PK.eye(s, 11, 5.5, true, [30, 20, 14]); }
    PK.px(s, 13.5, 7, [255, 150, 40]); PK.px(s, 14.5, 7.5, [236, 120, 30]); PK.px(s, 13.5, 8, [255, 190, 90]);   // bico
    PK.px(s, 12.5, 8.5, [255, 150, 130], 190);
    // asa da frente
    if (up) { PK.line(s, 8, 9, 5, 4.5, blue[1]); PK.line(s, 9, 9, 6, 5.5, blue[2]); PK.line(s, 7, 10, 4, 6, blue[0]); }
    else { PK.line(s, 8, 9.5, 4, 11, blue[1]); PK.line(s, 8, 10.5, 5, 12.5, blue[0]); PK.line(s, 8, 9, 4, 9.5, blue[2]); }
    if (Math.floor(st.t * 5) % 3 === 0) { PK.px(s, 2, 5, [200, 250, 255]); PK.px(s, 1, 6, [255, 255, 255], 200); }
  },
  sapinho(s, f, st) { // f: 0 agachado, 1 esticando, 2 no ar
    const P = PET_PAL.sapo, air = st.air, squat = !air && f === 0;
    const by = squat ? 11 : air ? 9.5 : 10.4;
    PK.blob(s, 5, 13, 2.6, 1.4, P, 71); PK.line(s, 3, 13.5, 1.5, 14.2, P[1]);                // perna de trás, grande
    PK.blob(s, 8, by + 1, 5, squat ? 3.3 : 3.8, P, 72);
    PK.blob(s, 8.5, by + 2.6, 3.5, 1.7, [[200, 190, 120], [228, 220, 150], [244, 238, 176], [252, 248, 206], [255, 255, 232]], 73);   // barriga clara
    PK.px(s, 5, by - 1, P[1]); PK.px(s, 6, by - 2, P[1]); PK.px(s, 9, by - 2, P[1]); PK.px(s, 11, by - 1, P[1]);     // manchas
    PK.blob(s, 10.5, by - 2.8, 2.1, 2.1, P, 74); PK.blob(s, 6.8, by - 3.2, 2.1, 2.1, P, 75);                          // calombos dos olhos
    for (const ex of [6.8, 10.5]) { if (st.blink) PK.line(s, ex - 1, by - 3, ex + 1, by - 3, P[0]); else { PK.px(s, ex - 1, by - 4, [250, 250, 240]); PK.px(s, ex, by - 4, [250, 250, 240]); PK.px(s, ex - 1, by - 3, [250, 250, 240]); PK.px(s, ex, by - 3, [24, 20, 16]); PK.px(s, ex - 1, by - 4, [255, 255, 255]); } }
    PK.line(s, 10, by + 1.2, 13.5, by + 0.6, P[0]); PK.px(s, 13, by + 1, [240, 130, 130]);       // sorriso
    PK.px(s, 11.5, by - 0.4, [255, 160, 160], 180);
    PK.line(s, 11, by + 3.6, 12.5, 14, P[2]); PK.px(s, 12.5, 14, P[3]);                         // pata da frente
  },
  corujinha(s, f, st) {
    const P = PET_PAL.coruja, up = f % 4 < 2;
    if (up) { PK.line(s, 3, 9, 1, 4, P[1]); PK.line(s, 4, 10, 2, 6, P[2]); PK.line(s, 12, 9, 14, 4, P[1]); PK.line(s, 11, 10, 13, 6, P[2]); }
    else { PK.line(s, 3, 9, 1, 12, P[1]); PK.line(s, 12, 9, 14, 12, P[1]); PK.px(s, 1, 12, P[3]); PK.px(s, 14, 12, P[3]); }
    PK.blob(s, 7.5, 9, 4.4, 5.2, P, 81, 255, true);
    for (const [x, y] of [[6, 10], [8, 10], [7, 12], [9, 12], [5, 12]]) { PK.px(s, x, y, P[4]); PK.px(s, x, y + 1, P[3]); }      // peito pintado
    PK.px(s, 4, 4, P[1]); PK.px(s, 4, 3, P[0]); PK.px(s, 5, 3.5, P[1]); PK.px(s, 11, 4, P[1]); PK.px(s, 11, 3, P[0]); PK.px(s, 10, 3.5, P[1]);   // tufos das orelhas
    PK.blob(s, 5.6, 6.4, 2.5, 2.5, [[200, 170, 120], [230, 206, 156], [246, 228, 184], [255, 244, 210], [255, 252, 232]], 82);
    PK.blob(s, 9.4, 6.4, 2.5, 2.5, [[200, 170, 120], [230, 206, 156], [246, 228, 184], [255, 244, 210], [255, 252, 232]], 83);
    for (const ex of [5.6, 9.4]) { if (st.blink) PK.line(s, ex - 1, 6.4, ex + 1, 6.4, P[0]); else { PK.blob(s, ex, 6.4, 1.5, 1.5, [[255, 170, 20], [255, 190, 40], [255, 206, 70], [255, 224, 110], [255, 240, 160]], 84); PK.px(s, ex, 6.4, [24, 16, 14]); PK.px(s, ex, 7, [24, 16, 14]); PK.px(s, ex - 1, 5.6, [255, 255, 255]); } }
    PK.px(s, 7.5, 8.2, [240, 150, 50]); PK.px(s, 7.5, 9, [214, 120, 30]);
    PK.px(s, 6, 14, [240, 170, 70]); PK.px(s, 9, 14, [240, 170, 70]);
  },
  raposinha(s, f, st) {
    const P = PET_PAL.raposa, white = [252, 246, 236], sock = [44, 28, 24], ph = (f / 4) * Math.PI * 2;
    for (const [x, o, far] of [[5, 0, 1], [11, 2, 1], [6.5, 1, 0], [12.2, 3, 0]]) {
      const q = st.moving ? Math.sin(ph + o * 1.6) : 0, lift = st.moving ? Math.max(0, Math.cos(ph + o * 1.6)) * 1.8 : 0;
      PK.line(s, x, 11, x + q * 1.6, 14 - lift, far ? [150, 66, 24] : P[2]); PK.px(s, x + q * 1.6, 14 - lift, sock); PK.px(s, x + q * 1.6 + 1, 14 - lift, sock);
    }
    const tw = Math.sin(st.t * 3) * 0.8;                                        // rabo grande e fofo balançando
    PK.blob(s, 2.2, 8 + tw * 0.3, 2.6, 3.4, P, 91, 255, true); PK.blob(s, 1.4, 6.4 + tw * 0.3, 1.5, 1.8, [white, white, white, white, white], 92);
    PK.blob(s, 8, 9.6, 4.8, 3.2, P, 93, 255, true);
    PK.blob(s, 9, 11.8, 3, 1.3, [white, white, white, white, white], 94);
    PK.blob(s, 12, 7.2, 3, 2.8, P, 95);
    PK.px(s, 10, 3.5, sock); PK.px(s, 10, 4.5, P[2]); PK.px(s, 11, 4.5, P[2]); PK.px(s, 10, 5, [250, 170, 160]); PK.px(s, 13, 3.5, sock); PK.px(s, 14, 4.5, P[2]); PK.px(s, 13, 4.5, P[2]); PK.px(s, 13.4, 5, [250, 170, 160]);
    PK.blob(s, 14, 8.6, 1.8, 1.3, [white, white, white, white, white], 96);
    PK.px(s, 15.3, 8, [28, 18, 16]); PK.px(s, 14.4, 8.2, [28, 18, 16]);
    if (st.blink) PK.line(s, 12, 6.8, 13.2, 6.8, sock); else { PK.px(s, 12, 6.5, [30, 20, 14]); PK.px(s, 13, 6.5, [30, 20, 14]); PK.px(s, 12, 6, [255, 255, 255]); }
    PK.px(s, 12, 9.5, [255, 170, 160], 170);
  },
  gelatina(s, f, st) { // f 0..3: o corpo estica e achata no pulo
    const P = PET_PAL.gel, sq = [0, 1, 0, -1][f % 4], rx = 5.6 + sq * 0.7, ry = 4.2 - sq * 0.7, cy = 12 - ry + 1;
    PK.blob(s, 8, cy, rx, ry, P, 101, 215);
    PK.blob(s, 8, cy + ry * 0.45, rx * 0.8, ry * 0.4, [P[1], P[1], P[2], P[2], P[3]], 102, 190);          // fundo mais cheio
    PK.px(s, 5, cy - ry * 0.6, P[4]); PK.px(s, 6, cy - ry * 0.7, P[4]); PK.px(s, 5, cy - ry * 0.3, [255, 255, 255], 230); // brilho
    const bx = 10 + Math.sin(st.t * 2) * 1.2, by = cy + 0.5 - ((st.t * 0.8) % 1) * 2;                    // bolhinha que sobe
    PK.px(s, bx, by, [230, 255, 252], 200); PK.px(s, bx + 1, by, [230, 255, 252], 120);
    if (st.blink) { PK.line(s, 5.5, cy, 7, cy, [10, 60, 80]); PK.line(s, 9, cy, 10.5, cy, [10, 60, 80]); }
    else { PK.eye(s, 5.5, cy - 0.5, true, [8, 52, 70]); PK.eye(s, 9.5, cy - 0.5, true, [8, 52, 70]); }
    PK.px(s, 7, cy + 2, [8, 52, 70]); PK.px(s, 8, cy + 2.6, [8, 52, 70]); PK.px(s, 9, cy + 2, [8, 52, 70]);
  },
  cogumelinho(s, f, st) {
    const P = PET_PAL.cogu, stem = [[150, 124, 92], [196, 170, 130], [226, 204, 164], [244, 228, 192], [255, 244, 218]], ph = (f / 4) * Math.PI * 2, bob = st.moving ? Math.round(Math.abs(Math.sin(ph))) : 0;
    const foot = [92, 62, 44];
    PK.blob(s, 5.5, 13.2 - (st.moving ? Math.max(0, Math.sin(ph)) : 0), 1.7, 1.1, [[50, 30, 22], [70, 44, 32], foot, [120, 84, 60], [150, 110, 80]], 111);
    PK.blob(s, 10.5, 13.2 - (st.moving ? Math.max(0, -Math.sin(ph)) : 0), 1.7, 1.1, [[50, 30, 22], [70, 44, 32], foot, [120, 84, 60], [150, 110, 80]], 112);
    PK.blob(s, 8, 10 - bob, 3.4, 3.4, stem, 113);                                                          // pezinho com carinha
    // chapéu vermelho de bolinhas
    PK.blob(s, 8, 6 - bob, 6.4, 4.4, P, 114);
    for (let y = 8 - bob; y <= 10 - bob; y++) for (let x = 2; x <= 14; x++) if (hash2(x, y, 115) < 0.0) PK.px(s, x, y, P[0]);
    PK.line(s, 2, 8.4 - bob, 14, 8.4 - bob, P[0]);                                                          // aba do chapéu
    for (const [x, y, r] of [[5, 4, 1.2], [9.5, 3, 1.4], [12, 6, 1], [7.5, 6.2, 0.8]]) PK.blob(s, x, y - bob, r, r, [[236, 220, 190], [248, 238, 214], [255, 250, 232], [255, 255, 245], [255, 255, 255]], 116);
    if (st.blink) { PK.line(s, 6, 10.6 - bob, 7.4, 10.6 - bob, [60, 40, 30]); PK.line(s, 9, 10.6 - bob, 10.4, 10.6 - bob, [60, 40, 30]); }
    else { PK.eye(s, 6.2, 10 - bob, false, [40, 28, 22]); PK.eye(s, 9.6, 10 - bob, false, [40, 28, 22]); }
    PK.px(s, 7.5, 11.8 - bob, [60, 40, 30]); PK.px(s, 8.5, 12 - bob, [60, 40, 30]);
    PK.px(s, 5.4, 11.2 - bob, [255, 160, 150], 170); PK.px(s, 11, 11.2 - bob, [255, 160, 150], 170);
  },
  fantasminha(s, f, st) {
    const P = PET_PAL.fantasma, w = Math.sin((f / 8) * Math.PI * 2);
    PK.blob(s, 8, 7, 4.8, 5, P, 121, 235);
    for (let y = 8; y <= 13; y++) for (let x = 3; x <= 13; x++) {                                          // corpo desce e termina em ondinhas
      const edge = 12.2 + Math.sin(x * 1.1 + w * 3) * 1.4;
      if (y <= edge && Math.abs(x - 8) <= 4.8 - (y - 8) * 0.12) PK.px(s, x, y, PK.tone(P, -(y - 7) / 6 * 0.6 - (x - 8) / 12 + 0.2), 220 - (y - 8) * 10);
    }
    PK.px(s, 5, 3, [255, 255, 255], 230); PK.px(s, 6, 3, [255, 255, 255], 200); PK.px(s, 5, 4, [255, 255, 255], 180);
    if (st.blink) { PK.line(s, 5.5, 7, 7, 7, [40, 50, 90]); PK.line(s, 9, 7, 10.5, 7, [40, 50, 90]); }
    else { for (const ex of [6, 10]) { PK.px(s, ex, 6, [30, 36, 74]); PK.px(s, ex, 7, [30, 36, 74]); PK.px(s, ex + 1, 6, [30, 36, 74]); PK.px(s, ex + 1, 7, [30, 36, 74]); PK.px(s, ex, 6, [255, 255, 255]); } }
    PK.px(s, 8, 9.2, [30, 36, 74]); PK.px(s, 5, 9, [255, 170, 200], 190); PK.px(s, 11, 9, [255, 170, 200], 190);
    PK.line(s, 3, 9 + w, 2, 10.5 + w, P[3], 200); PK.line(s, 13, 9 - w, 14, 10.5 - w, P[3], 200);           // bracinhos
  },
};

// ---------------------------------------------------------------- definição de cada pet
const PETS = {
  tigrinho: { item: PET_IDS.TIGRINHO, name: 'Tigrinho de Âmbar', mode: 'walk', box: [12, 10], size: 16, frames: 4, speed: 52, glow: [255, 170, 60], desc: 'Um filhote listrado do Tigre da Floresta. Segue você pela mata e rosna de brincadeira. Só enfeite.', src: 'Cai do Tigre.' },
  besourinho: { item: PET_IDS.BESOURINHO, name: 'Besourinho de Ferro', mode: 'walk', box: [12, 8], size: 16, frames: 4, speed: 40, glow: [120, 190, 255], desc: 'Um besourinho de casco azul-aço que reluz de vez em quando. Só enfeite.', src: 'Cai do Casco de Ferro.' },
  yetizinho: { item: PET_IDS.YETIZINHO, name: 'Yetizinho', mode: 'walk', box: [12, 12], size: 16, frames: 4, speed: 44, glow: [170, 230, 255], desc: 'Uma bolota de pelo branco com carinha de gelo. Solta um friozinho por onde passa. Só enfeite.', src: 'Cai do Yeti.' },
  mininucleo: { item: PET_IDS.MININUCLEO, name: 'Mini-Núcleo', mode: 'float', box: [12, 12], size: 20, frames: 1, speed: 90, glow: [255, 120, 40], desc: 'Um fragmento vivo do Núcleo: basalto rachado com o coração em brasa e estilhaços em órbita. Só enfeite.', src: 'Cai do Núcleo.' },
  pintinho: { item: PET_IDS.PINTINHO, name: 'Pintinho da Tempestade', mode: 'fly', box: [10, 10], size: 16, frames: 4, speed: 150, glow: [120, 210, 255], desc: 'Um pintinho amarelo com penas de relâmpago. Voa em volta de você soltando faíscas. Só enfeite.', src: 'Cai do Olho da Tempestade.' },
  sapinho: { item: PET_IDS.SAPINHO, name: 'Sapinho', mode: 'hop', box: [12, 9], size: 16, frames: 3, speed: 70, glow: null, desc: 'Um sapinho verde de olhos esbugalhados que vai aos pulinhos atrás de você. Só enfeite.', src: 'Aparece em baús de vilas, cabanas e acampamentos.' },
  corujinha: { item: PET_IDS.CORUJINHA, name: 'Corujinha', mode: 'fly', box: [10, 12], size: 16, frames: 4, speed: 110, glow: [255, 214, 120], desc: 'Uma corujinha de olhos enormes que paira ao seu lado, curiosa. Só enfeite.', src: 'Aparece em baús de torres, templos e masmorras.' },
  raposinha: { item: PET_IDS.RAPOSINHA, name: 'Raposinha', mode: 'walk', box: [14, 10], size: 16, frames: 4, speed: 60, glow: null, desc: 'Uma raposinha ruiva de rabo enorme e fofo. Só enfeite.', src: 'Aparece em baús de tribos, ruínas e acampamentos de caça.' },
  gelatina: { item: PET_IDS.GELATINA, name: 'Gelatina', mode: 'hop', box: [12, 9], size: 16, frames: 4, speed: 55, glow: [110, 230, 230], desc: 'Uma gelatina azul-turquesa e translúcida, com uma bolhinha dentro. Só enfeite.', src: 'Aparece em baús de minas, poços e geodos.' },
  cogumelinho: { item: PET_IDS.COGUMELINHO, name: 'Cogumelinho', mode: 'walk', box: [10, 12], size: 16, frames: 4, speed: 38, glow: null, desc: 'Um cogumelo de chapéu vermelho com carinha, que anda sacolejando. Solta esporinhos. Só enfeite.', src: 'Aparece em baús de cabanas, minas e expedições.' },
  fantasminha: { item: PET_IDS.FANTASMINHA, name: 'Fantasminha', mode: 'float', box: [10, 13], size: 16, frames: 8, speed: 80, glow: [180, 220, 255], desc: 'Um fantasminha branco-azulado, tímido, que flutua atrás de você. Só enfeite.', src: 'Aparece em baús de masmorras, ruínas e do céu.' },
};
const PET_BY_ITEM = new Map(Object.entries(PETS).map(([k, d]) => { d.key = k; return [d.item, d]; }));
const PET_PAINT_KEY = { tigrinho: 'tigrinho', besourinho: 'besourinho', yetizinho: 'yetizinho', mininucleo: 'mininucleo', pintinho: 'pintinho', sapinho: 'sapinho', corujinha: 'corujinha', raposinha: 'raposinha', gelatina: 'gelatina', cogumelinho: 'cogumelinho', fantasminha: 'fantasminha' };

// quadros pintados (cache)
const PET_SPRITES = new Map();
function petSprite(def, f, st) {
  const key = def.key + f + (st.moving ? 'm' : '') + (st.air ? 'a' : '') + (st.blink ? 'b' : '') + (Math.floor(st.t * (def.key === 'mininucleo' ? 12 : 4)) % 12);
  let img = PET_SPRITES.get(key);
  if (img) return img;
  const s = new Sprite(def.size, def.size);
  PET_PAINT[PET_PAINT_KEY[def.key]](s, f, st);
  img = s.finish([20, 14, 20]);
  PET_SPRITES.set(key, img);
  if (PET_SPRITES.size > 700) PET_SPRITES.delete(PET_SPRITES.keys().next().value);
  return img;
}

// ---------------------------------------------------------------- itens e ícones
// O ícone 16x16 é o primeiro quadro do próprio pet, convertido em "pixels" de ITEM_ART
function petIconArt(def) {
  const img = petSprite(def, 0, { moving: false, air: false, blink: false, t: 0.25 }), c = makeCanvas(16, 16), x = c.getContext('2d');
  x.drawImage(img, -(def.size - 16) / 2, -(def.size - 16) / 2);
  const d = x.getImageData(0, 0, 16, 16).data, map = new Map(), cores = {}, chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const q = (v) => Math.round(v / 12) * 12;                       // junta cores quase iguais
  const rows = [];
  for (let y = 0; y < 16; y++) {
    let row = '';
    for (let xx = 0; xx < 16; xx++) {
      const i = (y * 16 + xx) * 4;
      if (d[i + 3] < 90) { row += '.'; continue; }
      const k = q(d[i]) + ',' + q(d[i + 1]) + ',' + q(d[i + 2]);
      if (!map.has(k)) { const ch = chars[map.size % chars.length]; map.set(k, ch); cores[ch] = [Math.min(255, q(d[i])), Math.min(255, q(d[i + 1])), Math.min(255, q(d[i + 2]))]; }
      row += map.get(k);
    }
    rows.push(row);
  }
  return { cores, pixels: rows };
}
for (const def of Object.values(PETS)) {
  defItem(def.item, { name: def.name, acessorio: { pet: true }, pet: def.key, maxStack: 1, descricao: def.desc + ' ' + def.src });
  ITEM_ART[def.item] = petIconArt(def);
}

// ---------------------------------------------------------------- comportamento
const petKey = (e) => e.def.key;
function petsEquipped(g) { return playerAccessories(g).filter((s) => s && PET_BY_ITEM.has(s.item)).map((s) => PET_BY_ITEM.get(s.item)); }
function petPlaceNear(e, g, off) {
  const p = g.player, w = g.world, base = Math.floor((p.cx - p.facing * off) / T), feet = Math.floor((p.y + p.h) / T);
  for (let r = 0; r <= 6; r++) for (const tx of r ? [base - r, base + r] : [base]) for (let dy = 0; dy <= 6; dy++) for (const ty of dy ? [feet + dy, feet - dy] : [feet]) {
    const x = tx * T + (T - e.w) / 2, y = ty * T - e.h - 0.01;
    if (!e.collides(w, x, y) && w.isSolid(Math.floor(x / T), ty)) { e.x = x; e.y = y; e.vx = e.vy = 0; e.onGround = true; return true; }
  }
  return false;
}
function petPlaceAir(e, g) {
  const p = g.player, w = g.world;
  for (const [dx, dy] of [[-18, -22], [18, -22], [-30, -10], [0, -34], [-8, 0]]) {
    const x = p.cx + dx - e.w / 2, y = p.cy + dy - e.h / 2;
    if (!e.collides(w, x, y)) { e.x = x; e.y = y; e.vx = e.vy = 0; return true; }
  }
  e.x = p.x; e.y = p.y; return true;
}
function updatePet(g, e, dt, slot) {
  const d = e.def, p = g.player, w = g.world, off = 34 + slot * 17;
  e.clock += dt; e.stuck ??= 0;
  const far = Math.hypot(p.cx - e.cx, p.cy - e.cy);
  if (d.mode === 'walk' || d.mode === 'hop') {
    if (far > 40 * T || e.stuck > 3) { petPlaceNear(e, g, off); e.stuck = 0; }
    const dx = p.cx - p.facing * off - e.cx, want = Math.abs(dx) > 12, old = e.x;
    e.hopT = (e.hopT ?? 0) - dt;
    if (d.mode === 'walk') {
      const sp = d.speed * (Math.abs(dx) > 90 ? 2.6 : Math.abs(dx) > 40 ? 1.6 : 1);
      e.vx = want ? Math.sign(dx) * Math.min(200, sp + Math.abs(dx) * 0.6) : 0;
    } else {
      if (e.onGround) { e.vx = 0; if (want && e.hopT <= 0) { e.vy = -(190 + Math.min(80, Math.abs(dx) * 0.5)); e.vx = Math.sign(dx) * Math.min(150, d.speed + Math.abs(dx) * 0.9); e.hopT = 0.28 + Math.random() * 0.25; e.onGround = false; } }
    }
    if (e.vx) e.facing = Math.sign(e.vx);
    e.applyGravity(dt); e.moveX(e.vx * dt, w);
    if (d.mode === 'walk' && e.vx && Math.abs(e.x - old) < Math.abs(e.vx * dt) * 0.3 && e.onGround) e.vy = -270;
    e.moveY(e.vy * dt, w);
    e.gait += Math.abs(e.x - old) / 3.2; e.air = !e.onGround;
    e.stuck = want && Math.abs(e.x - old) < 0.01 ? e.stuck + dt : 0;
  } else { // fly / float
    if (far > 40 * T || e.stuck > 2.5) { petPlaceAir(e, g); e.stuck = 0; }
    const fl = d.mode === 'fly', n = slot + 1;
    const tx = p.cx - p.facing * (off * 0.55) + (fl ? Math.sin(e.clock * 1.4 + n) * 10 : 0), ty = p.cy - (fl ? 24 : 16) - n * 3 + Math.sin(e.clock * (fl ? 2.6 : 1.5) + n) * (fl ? 5 : 4);
    const k = Math.min(1, dt * (fl ? 3.4 : 2.2)), nx = e.x + (tx - e.w / 2 - e.x) * k, ny = e.y + (ty - e.h / 2 - e.y) * k;
    const ox = e.x, oy = e.y;
    if (!e.collides(w, nx, e.y)) e.x = nx; if (!e.collides(w, e.x, ny)) e.y = ny;
    e.vx = (e.x - ox) / Math.max(dt, 1e-3); if (Math.abs(e.vx) > 8) e.facing = Math.sign(e.vx); else e.facing = p.facing;
    e.stuck = Math.hypot(tx - e.cx, ty - e.cy) > 14 && Math.abs(e.x - ox) + Math.abs(e.y - oy) < 0.05 ? e.stuck + dt : 0;
    e.air = true;
  }
  // efeitos de cada um (poucos, leves)
  const key = d.key, r = Math.random();
  const spark = (x, y, c, vy = -20, life = 0.6, vx = 0) => { if (g.particles.length < 380) g.particles.push({ x, y, vx, vy, life, maxLife: life, color: c, w: 1, h: 1, gravity: vy < 0 ? -10 : 40 }); };
  if (key === 'yetizinho' && r < dt * 3) spark(e.cx + e.facing * 5, e.y + 4, 'rgba(220,244,255,.8)', -8, 0.9, e.facing * 14);
  if (key === 'mininucleo' && r < dt * 9) spark(e.cx + (Math.random() - 0.5) * 8, e.cy + 2, Math.random() < 0.5 ? '#ffb347' : '#ff6a28', -26, 0.7);
  if (key === 'pintinho' && r < dt * 7) spark(e.cx - e.facing * 6 + (Math.random() - 0.5) * 6, e.cy + (Math.random() - 0.5) * 6, Math.random() < 0.5 ? '#bff2ff' : '#ffffff', 0, 0.25, (Math.random() - 0.5) * 30);
  if (key === 'cogumelinho' && r < dt * 4) spark(e.cx + (Math.random() - 0.5) * 8, e.y + 1, Math.random() < 0.5 ? 'rgba(210,240,120,.7)' : 'rgba(250,230,140,.7)', -12, 1.1, (Math.random() - 0.5) * 10);
  if (key === 'fantasminha' && r < dt * 4) spark(e.cx + (Math.random() - 0.5) * 7, e.y + e.h - 2, 'rgba(210,235,255,.6)', 6, 0.7);
  if (key === 'besourinho' && r < dt * 0.6) spark(e.cx - 2, e.y + 2, '#ffffff', -4, 0.3);
  if (key === 'gelatina' && e.onGround && e.hopT > 0.2 && r < dt * 3) spark(e.cx, e.y + e.h - 1, 'rgba(160,240,236,.8)', -14, 0.4, (Math.random() - 0.5) * 24);
}
function updatePets(g, dt) {
  const list = petsEquipped(g);
  g.pets ??= new Map();
  for (const k of [...g.pets.keys()]) if (!list.some((d) => d.key === k)) g.pets.delete(k);
  list.forEach((d, i) => {
    let e = g.pets.get(d.key);
    if (!e) {
      e = new Body(0, 0, d.box[0], d.box[1]); e.def = d; e.clock = Math.random() * 5; e.gait = 0; e.facing = g.player.facing; e.air = false;
      if (d.mode === 'walk' || d.mode === 'hop') { if (!petPlaceNear(e, g, 34 + i * 17)) return; } else petPlaceAir(e, g);
      g.pets.set(d.key, e);
    }
    updatePet(g, e, Math.min(dt, 0.05), i);
  });
}
function drawPets(ctx, g) {
  if (!g.pets?.size) return;
  for (const e of g.pets.values()) {
    const d = e.def, t = e.clock, moving = Math.abs(e.vx || 0) > 6 && (d.mode === 'walk' || d.mode === 'fly' || e.air), blink = (t % 4.6) < 0.14;
    let frame = 0;
    if (d.key === 'sapinho') frame = e.air ? 2 : (e.hopT > 0.12 ? 1 : 0);
    else if (d.key === 'gelatina') frame = e.air ? (e.vy < 0 ? 1 : 3) : (e.hopT > 0.1 ? 2 : 0);
    else if (d.key === 'fantasminha') frame = Math.floor(t * 6) % 8;
    else if (d.key === 'pintinho' || d.key === 'corujinha') frame = Math.floor(t * (d.key === 'pintinho' ? 14 : 8)) % 4;
    else if (d.key === 'mininucleo') frame = 0;
    else frame = Math.floor(e.gait) % d.frames;
    const img = petSprite(d, frame, { moving, air: e.air, blink, t });
    const bobY = (d.mode === 'float' || d.mode === 'fly') ? 0 : (moving ? 0 : Math.round(Math.sin(t * 3) * 0.5));
    ctx.save(); ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(e.cx), Math.round(e.y + e.h));
    ctx.scale(e.facing < 0 ? -1 : 1, 1);
    if (d.glow) { const gl = ctx.createRadialGradient(0, -e.h / 2, 1, 0, -e.h / 2, 16); gl.addColorStop(0, `rgba(${d.glow[0]},${d.glow[1]},${d.glow[2]},0.26)`); gl.addColorStop(1, `rgba(${d.glow[0]},${d.glow[1]},${d.glow[2]},0)`); ctx.fillStyle = gl; ctx.fillRect(-18, -e.h / 2 - 18, 36, 36); }
    if (d.mode === 'walk' || d.mode === 'hop') { ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fillRect(-5, 0, 10, 1); }
    else if (d.mode === 'float' || d.mode === 'fly') { /* sem sombra no chão: está no ar */ }
    if (d.key === 'fantasminha') ctx.globalAlpha = 0.88;
    const half = d.size / 2;
    ctx.drawImage(img, -half, (d.mode === 'float' || d.mode === 'fly') ? -e.h / 2 - half : -(d.size - 2 * (d.k || 1)) + bobY);
    ctx.restore();
  }
}

// ---------------------------------------------------------------- onde achar
// Chefes: cada pet tem chance de cair (o Urso e a Fiandeira já têm os deles)
{
  const base = initializeBossGear;
  initializeBossGear = () => {
    base();
    for (const [boss, item, chance] of [['tiger', PET_IDS.TIGRINHO, 0.4], ['cascoferro', PET_IDS.BESOURINHO, 0.4], ['yeti', PET_IDS.YETIZINHO, 0.4], ['nucleo', PET_IDS.MININUCLEO, 0.4], ['thunderbird', PET_IDS.PINTINHO, 0.4]])
      WILDLIFE[boss]?.drops?.push([item, 1, 1, chance]);
  };
}
// Baús: chance pequena nas tabelas certas
for (const [item, tables] of [
  [PET_IDS.SAPINHO, { village: 0.08, cabin: 0.08, camp: 0.07 }],
  [PET_IDS.CORUJINHA, { tower: 0.1, temple: 0.08, dungeon: 0.08 }],
  [PET_IDS.RAPOSINHA, { tribe: 0.08, ruin: 0.07, hunter: 0.08 }],
  [PET_IDS.GELATINA, { mine: 0.08, well: 0.08, geodo: 0.1 }],
  [PET_IDS.COGUMELINHO, { cabin: 0.06, mine: 0.06, expedicao: 0.1 }],
  [PET_IDS.FANTASMINHA, { dungeon: 0.08, celeste: 0.1, ossario: 0.08, vigia: 0.07 }],
]) for (const [t, chance] of Object.entries(tables)) LOOT_TABLES[t]?.push([item, 1, 1, chance]);

// ---------------------------------------------------------------- ligação com o jogo
window.addEventListener('DOMContentLoaded', () => {
  const baseUpdate = updateBossGear;
  updateBossGear = function (g, dt) { baseUpdate(g, dt); updatePets(g, dt); };
  const baseDraw = drawBossGearWorld;
  drawBossGearWorld = function (ctx, g) { baseDraw(ctx, g); drawPets(ctx, g); };
});
