'use strict';
// =====================================================================================
//  Pincéis de pixel art dos covis (ninho da Fiandeira em js/spider-habitat.js e a câmara do
//  Escavador em js/beetle-lair.js). Tudo sai em pixels inteiros, sem suavização: nada de
//  linha borrada que parece imagem colada em cima do mundo.
// =====================================================================================
const LairArt = {
  px(c, x, y, col) { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), 1, 1); },
  rect(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w, h); },
  // Bresenham: uma linha de 1 px
  line(c, x0, y0, x1, y1, col) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy; c.fillStyle = col;
    for (let n = 0; n < 5000; n++) {
      c.fillRect(x0, y0, 1, 1);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  },
  noise(x, seed) { const i = Math.floor(x), f = x - i, a = hash2(i, 0, seed), b = hash2(i + 1, 0, seed), s = f * f * (3 - 2 * f); return a + (b - a) * s; },
  fbm(x, seed) { return this.noise(x, seed) * 0.55 + this.noise(x * 2.1, seed + 7) * 0.3 + this.noise(x * 4.3, seed + 13) * 0.15; },
  // Disco/elipse preenchida por função de cor (retorna null para pular o pixel)
  blob(c, cx, cy, rx, ry, color) {
    for (let y = Math.floor(-ry); y <= Math.ceil(ry); y++) for (let x = Math.floor(-rx); x <= Math.ceil(rx); x++) {
      const d = (x / rx) ** 2 + (y / ry) ** 2;
      if (d > 1) continue;
      const col = color(x, y, d);
      if (col) this.px(c, cx + x, cy + y, col);
    }
  },
};
