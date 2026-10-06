'use strict';
// Ícones de inventário dos pets: cada um é o "petisco" do bicho (carne para o tigre, vitória-régia
// para o sapo...), em vez do rosto dele. Carrega depois de pets-art.js e antes de game.js.

const PET_TREAT = {
  tigrinho(s) {                    // pedaço de carne com osso
    const meat = [[110, 24, 32], [170, 44, 48], [208, 72, 70], [236, 112, 104], [255, 168, 150]], bone = [[196, 184, 160], [214, 204, 182], [232, 222, 198], [244, 236, 218], [252, 246, 232]];
    PK.line(s, 2.6, 13.4, 7, 9, bone[1]); PK.line(s, 2.6, 12.6, 6.6, 8.6, bone[3]); PK.line(s, 3.4, 13.6, 7.4, 9.4, bone[0]);
    PK.blob(s, 1.8, 13.4, 1.3, 1.3, bone, 3); PK.blob(s, 3.4, 14.4, 1.3, 1.2, bone, 4);
    PK.blob(s, 9.4, 7.4, 5.4, 4.8, meat, 11);
    for (const [x, y] of [[7, 5.4], [8.4, 6.4], [9.8, 7.4], [11.2, 8.4], [8, 9], [9.2, 9.8]]) PK.px(s, x, y, [255, 226, 214]);
    PK.px(s, 12, 5, meat[4]); PK.px(s, 11, 4.6, meat[4]); PK.px(s, 13, 6.2, meat[3]);
    PK.line(s, 6.4, 10.6, 12.6, 11.4, meat[0]);
  },
  besourinho(s) {                  // barra de ferro azulada com rebites de latão
    const st = PET_PAL.besouro, brass = [226, 176, 70];
    for (let y = 8; y <= 13; y++) for (let x = 2; x <= 10; x++) PK.px(s, x, y, y === 8 ? st[3] : y < 11 ? st[2] : y < 13 ? st[1] : st[0]);
    for (let y = 4; y <= 7; y++) for (let x = 2 + (8 - y); x <= 10 + (8 - y); x++) PK.px(s, x, y, y === 4 ? st[4] : y < 6 ? st[3] : st[2]);
    for (let k = 1; k <= 3; k++) for (let y = 8; y <= 13; y++) PK.px(s, 10 + k, y - k, k === 1 ? st[1] : st[0]);
    PK.line(s, 3, 9.6, 3, 12, st[3]); PK.line(s, 4, 9, 6, 9, st[4]);
    for (const x of [4, 8.4]) { PK.px(s, x, 11, brass); PK.px(s, x + 1, 11, [150, 106, 38]); }
    PK.px(s, 7, 5.6, st[4]); PK.px(s, 8, 5.6, st[4]);
  },
  yetizinho(s) {                   // floco de gelo
    const ice = [[100, 170, 220], [150, 224, 252], [210, 244, 255], WHITE];
    for (const [x0, y0, x1, y1] of [[8, 1.6, 8, 14.4], [2.4, 4.8, 13.6, 11.2], [2.4, 11.2, 13.6, 4.8]]) PK.line(s, x0, y0, x1, y1, ice[1]);
    for (const [x, y, dx, dy] of [[8, 3.8, 1.6, 1.2], [8, 12.2, 1.6, -1.2], [4.4, 6.2, 0.4, 1.8], [11.6, 9.8, -0.4, -1.8], [4.4, 9.8, 0.4, -1.8], [11.6, 6.2, -0.4, 1.8]]) { PK.line(s, x, y, x + dx * 1.2, y + dy, ice[2]); PK.line(s, x, y, x - dx * 1.2, y + dy, ice[2]); }
    PK.blob(s, 8, 8, 2.2, 2.2, [ice[0], ice[1], ice[2], ice[3], ice[3]], 8);
    PK.px(s, 8, 2, WHITE); PK.px(s, 8, 14, ice[2]);
  },
  mininucleo(s) {                  // pedaço de basalto em brasa
    const P = PET_PAL.nucleo;
    PK.blob(s, 8, 9.4, 5.8, 4.8, P, 51);
    petMark(s, 8, 9.4, 5.8, 4.8, (x, y) => hash2(x, y, 4) > 0.72, P[1]);
    for (const [x0, y0, x1, y1] of [[3.4, 9, 6.4, 8], [6.4, 8, 8.4, 10.4], [8.4, 10.4, 12.6, 9.4], [8.4, 10.4, 9, 13.4], [6.4, 8, 7, 5.4]]) PK.line(s, x0, y0, x1, y1, [255, 110, 30]);
    for (const [x, y] of [[7.4, 9.4], [8.4, 10.4], [9.4, 10]]) PK.px(s, x, y, [255, 214, 100]);
    PK.px(s, 5, 6, P[4]); PK.px(s, 6, 5.4, P[4]);
    PK.px(s, 11, 3, [255, 160, 50]); PK.px(s, 4, 3.4, [255, 120, 40], 200); PK.px(s, 12.4, 5, [255, 200, 90]);
  },
  pintinho(s) {                    // ovo rachado por um raio
    const egg = [[196, 150, 40], [240, 196, 70], [255, 224, 110], [255, 240, 160], [255, 252, 214]];
    PK.blob(s, 8, 9, 4.8, 5.6, egg, 61);
    PK.blob(s, 8, 6.4, 3.6, 3.8, egg, 62);
    for (const [x0, y0, x1, y1] of [[7, 3.6, 9.4, 6], [9.4, 6, 6.8, 8], [6.8, 8, 9.6, 10.4], [9.6, 10.4, 7.4, 12.6]]) { PK.line(s, x0, y0, x1, y1, [46, 128, 224]); PK.line(s, x0 + 1, y0, x1 + 1, y1, [126, 210, 255], 200); }
    PK.px(s, 6, 5, WHITE); PK.px(s, 5.6, 6.4, WHITE, 200);
    PK.px(s, 12.4, 3.4, [200, 250, 255]); PK.px(s, 13, 4.4, WHITE, 180); PK.px(s, 3, 11, [200, 250, 255]);
  },
  sapinho(s) {                     // vitória-régia com flor
    const pad = PET_PAL.sapo, pink = [[210, 70, 120], [240, 110, 156], [255, 160, 190], [255, 204, 220], [255, 230, 238]];
    PK.blob(s, 8, 10.4, 6.6, 3.8, pad, 72);
    petMark(s, 8, 10.4, 6.6, 3.8, (x, y) => (Math.abs(x - 8) + Math.abs(y - 10) * 2) % 4 === 0, pad[1]);
    PK.line(s, 8, 10.4, 14, 9.6, pad[0]); PK.line(s, 8, 10.4, 14, 11.2, pad[0]);
    for (const [dx, dy] of [[-2, 0.4], [2, 0.4], [-1.4, -1.6], [1.4, -1.6], [0, -2.4]]) PK.blob(s, 7.6 + dx, 6.4 + dy, 1.5, 1.5, pink, Math.round(dx * 9 + dy));
    PK.blob(s, 7.6, 6.2, 1.1, 1.1, [[240, 170, 20], [255, 200, 50], [255, 220, 90], [255, 236, 140], [255, 250, 190]], 7);
    PK.px(s, 12, 12, [180, 236, 250], 220); PK.px(s, 3.6, 10, pad[4]);
  },
  corujinha(s) {                   // pena de coruja
    const P = PET_PAL.coruja;
    for (let i = 0; i <= 22; i++) {
      const t = i / 22, cx = 2.6 + 10.6 * t, cy = 13.4 - 10.6 * t, w = Math.sin(Math.PI * Math.pow(t, 0.8)) * 3.1 + 0.2;
      for (let k = -Math.ceil(w); k <= Math.ceil(w); k++) { if (Math.abs(k) > w) continue; const lit = -(k / 3.2) * 0.9 + (hash2(i, k, 9) - 0.5) * 0.5; PK.px(s, cx + k * 0.707, cy + k * 0.707, (i + k) % 5 === 0 ? P[4] : PK.tone(P, lit)); }
    }
    PK.line(s, 1.6, 14.4, 12.8, 3.4, P[4]); PK.line(s, 1.4, 14.6, 3, 13, [236, 226, 206]);
    PK.px(s, 10, 6, P[0]); PK.px(s, 8, 8.4, P[0]); PK.px(s, 6, 10.6, P[0]);
  },
  raposinha(s) {                   // punhado de frutinhas vermelhas
    const red = [[120, 16, 28], [176, 28, 40], [220, 54, 56], [246, 100, 92], [255, 170, 150]], leaf = [[20, 90, 40], [36, 130, 56], [64, 176, 80], [110, 214, 120], [170, 240, 170]];
    for (const [x, y] of [[5, 10.4], [10.8, 10.8], [8, 6.6]]) { PK.blob(s, x, y, 3.1, 3.1, red, Math.round(x * 5)); PK.px(s, x - 1, y - 1, [255, 220, 210]); PK.px(s, x, y - 2.4, [60, 30, 20]); }
    PK.line(s, 8, 4, 8, 2.4, [90, 60, 30]);
    PK.blob(s, 10.6, 2.8, 2.2, 1.3, leaf, 3); PK.blob(s, 5.8, 3.6, 2, 1.2, leaf, 4); PK.line(s, 8, 3.2, 12, 2.4, leaf[0]);
  },
  gelatina(s) {                    // frasco de gosma turquesa
    const P = PET_PAL.gel, glass = [[120, 160, 170], [170, 210, 218], [210, 238, 244], [240, 252, 255], [255, 255, 255]];
    PK.blob(s, 8, 10.4, 5.4, 4.6, glass, 3);
    PK.blob(s, 8, 11.2, 4.4, 3.6, P, 101);
    PK.blob(s, 8.4, 12.2, 2.6, 1.6, [P[1], P[2], P[3], P[3], P[4]], 102);
    for (let y = 4; y <= 6; y++) { PK.px(s, 6.4, y, glass[1]); PK.px(s, 7.4, y, glass[2]); PK.px(s, 8.4, y, glass[2]); PK.px(s, 9.4, y, glass[1]); }
    for (const x of [6.4, 7.4, 8.4, 9.4, 10.4]) { PK.px(s, x, 2.4, [186, 130, 76]); PK.px(s, x, 3.4, [130, 84, 44]); }
    PK.px(s, 5.4, 8.4, [255, 255, 255]); PK.px(s, 5, 9.4, [255, 255, 255], 220); PK.px(s, 6.4, 7.6, [255, 255, 255], 200);
    PK.px(s, 10, 10, [226, 255, 252], 230); PK.px(s, 9.4, 11.4, [226, 255, 252], 150);
  },
  cogumelinho(s) {                 // cogumelo comum de chapéu marrom
    const cap = [[70, 40, 24], [112, 68, 40], [152, 100, 58], [188, 132, 84], [220, 172, 122]], stem = [[170, 150, 120], [212, 194, 160], [236, 224, 194], [250, 242, 220], [255, 255, 255]];
    PK.blob(s, 8, 11.4, 2.8, 3.6, stem, 113);
    PK.blob(s, 8, 6.8, 6.4, 4.4, cap, 114);
    for (let x = 3; x <= 13; x++) { PK.px(s, x, 10, [214, 196, 160]); if (x % 2) PK.px(s, x, 10.8, [160, 134, 100]); }
    for (const [x, y] of [[5, 5.4], [8.4, 3.6], [11, 6], [7, 6.8]]) { PK.px(s, x, y, cap[4]); PK.px(s, x + 1, y, cap[3]); }
    PK.px(s, 6.6, 13.6, stem[0]); PK.px(s, 9.4, 13.6, stem[0]);
  },
  fantasminha(s) {                 // vela de chama azul-fantasma
    const wax = [[190, 200, 214], [222, 230, 242], [240, 246, 254], [252, 254, 255], [255, 255, 255]], flame = [[40, 110, 220], [90, 170, 250], [160, 220, 255], [230, 248, 255], [255, 255, 255]];
    PK.blob(s, 8, 14, 5.4, 1.4, [[90, 100, 110], [120, 132, 144], [150, 164, 176], [180, 194, 206], [210, 222, 232]], 3);
    for (let y = 7; y <= 13; y++) for (let x = 5; x <= 10; x++) PK.px(s, x, y, x < 6 ? wax[1] : x < 8 ? wax[3] : x < 9 ? wax[2] : wax[0]);
    PK.px(s, 7, 8, wax[4]); PK.px(s, 10, 9, wax[2]); PK.px(s, 10, 10, wax[1]); PK.px(s, 5, 9, wax[1]); PK.px(s, 5, 10, wax[0]);
    PK.px(s, 8, 6, [40, 40, 56]);
    PK.blob(s, 8, 3.8, 1.9, 2.8, flame, 17); PK.px(s, 8, 1.4, flame[1]); PK.px(s, 8, 3.8, [255, 255, 255]); PK.px(s, 8, 4.6, flame[3]);
    PK.px(s, 5, 2, [160, 220, 255], 160); PK.px(s, 11.4, 3, [160, 220, 255], 140);
  },
};
for (const def of Object.values(PETS)) ITEM_ART[def.item] = petPortrait(PET_TREAT[def.key]);
