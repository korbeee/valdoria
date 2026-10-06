'use strict';
// =====================================================================================
//  CORAÇÃO DA ILHA — MISTURA ENTRE MATERIAIS
// =====================================================================================
// Âmbar, fóssil, magnetita, basalto e rocha profunda eram blocos de textura própria: onde um terminava e o
// outro começava aparecia uma linha reta no limite do bloco. Aqui cada bloco, nos lados que encostam em
// outro material do grupo (inclusive pelas diagonais), recebe um esfumado irregular com a textura do vizinho
// (ruído em coordenadas do mundo, igual nos dois blocos da emenda), de modo que a transição vira uma faixa suave e orgânica.
// Cada peça é montada uma vez (material, vizinho, quais dos 8 vizinhos, posição na textura, bordas expostas) e vai para o
// cache: no quadro só há um drawImage por emenda.
// Carrega depois de core-plus.js (precisa das texturas finais) e antes de game.js.

const CORE_BLEND = { depth: 8, set: new Uint8Array(1024), cache: new Map(), atlas: new Map() };
for (const t of [TILE.DEEPSTONE, TILE.BASALT, TILE.MAGMA_STONE, TILE.MAGNETITE, TILE.AMBER, TILE.FOSSIL, TILE.OBSIDIAN]) CORE_BLEND.set[t] = 1;
// os 8 vizinhos, na ordem dos bits da máscara de cada peça
const CORE_BLEND_DIRS = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];

// Pixels do atlas do bloco (para não pintar onde a borda irregular do bloco deixou vazio)
function coreBlendAtlas(art, t) {
  let d = CORE_BLEND.atlas.get(t);
  if (!d) { d = art.getContext('2d').getImageData(0, 0, art.width, art.height); CORE_BLEND.atlas.set(t, d); }
  return d;
}

// a: material do bloco; b: material do vizinho; bits: quais dos 8 vizinhos são b; col: (y&3)*4+(x&3);
// mask: bordas expostas do próprio bloco (1 cima, 2 direita, 4 baixo, 8 esquerda)
function coreBlendPiece(art, a, b, bits, col, mask) {
  const key = (((a * 512 + b) * 256 + bits) * 16 + col) * 16 + mask;
  let piece = CORE_BLEND.cache.get(key);
  if (piece !== undefined) return piece;
  const R = CORE_BLEND.depth, atlas = coreBlendAtlas(art, a), src = MATERIAL_TEX[b], img = new ImageData(T, T), ox = (col & 3) * T, oy = (col >> 2) * T;
  let any = false;
  for (let j = 0; j < T; j++) for (let i = 0; i < T; i++) {
    const px = i + 0.5, py = j + 0.5;
    let d = 1e9;                                                                       // distância até a região do vizinho (cantos viram arcos)
    for (let k = 0; k < 8; k++) {
      if (!(bits & (1 << k))) continue;
      const rx = CORE_BLEND_DIRS[k][0] * T, ry = CORE_BLEND_DIRS[k][1] * T;
      d = Math.min(d, Math.hypot(Math.max(0, rx - px, px - rx - T), Math.max(0, ry - py, py - ry - T)));
    }
    if (d >= R) continue;
    if ((mask & 1 && j < 3) || (mask & 2 && T - 1 - i < 3) || (mask & 4 && T - 1 - j < 3) || (mask & 8 && i < 3)) continue;   // contorno exposto fica em paz
    if (atlas.data[((mask * SPR + MARGIN + j) * atlas.width + col * SPR + MARGIN + i) * 4 + 3] < 255) continue;
    const wx = ox + i, wy = oy + j;                                                    // mesma posição no mundo nos dois lados da emenda
    const n = pfbm2(wx / 8, wy / 8, 8, 6151, 2), m = pnoise2(wx / 4, wy / 4, 16, 6152);
    const f = 0.5 * (1 - d / R) + (n - 0.5) * 0.95 + (m - 0.5) * 0.18;
    // transparência em 4 degraus; o padrão de Bayer desloca o degrau (sem faixas retas de cor)
    const level = Math.floor(clamp(f * 1.7, 0, 1) * 4 + BAYER4[(wy & 3) * 4 + (wx & 3)] / 16 + 0.25);
    if (level <= 0) continue;
    const c = src.get(wx, wy), k = (j * T + i) * 4;
    img.data[k] = c[0]; img.data[k + 1] = c[1]; img.data[k + 2] = c[2]; img.data[k + 3] = Math.min(4, level) * 63; any = true;
  }
  if (any) { piece = makeCanvas(T, T); piece.getContext('2d').putImageData(img, 0, 0); } else piece = null;
  CORE_BLEND.cache.set(key, piece);
  return piece;
}

{
  const baseDrawWorld = Renderer.prototype.drawWorld, near = new Array(8), mats = [];
  Renderer.prototype.drawWorld = function (game, vx, vy, vw, vh) {
    baseDrawWorld.call(this, game, vx, vy, vw, vh);
    const world = game.world, set = CORE_BLEND.set;
    if (!world?.coreTop || (vy + vh) / T < world.coreTopMin) return;
    const { tiles, w, h } = world, blocks = this.tex.blocks, ctx = this.ctx;
    const x0 = Math.max(0, Math.floor(vx / T) - 1), x1 = Math.min(w - 1, Math.floor((vx + vw) / T) + 1);
    const y0 = Math.max(world.coreTopMin, Math.floor(vy / T) - 1), y1 = Math.min(h - 1, Math.floor((vy + vh) / T) + 1);
    const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? TILE.BEDROCK : tiles[y * w + x]);
    const open = (t) => (SOLID[t] === 1 && t !== TILE.DOOR ? 0 : 1);
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const t = tiles[y * w + x];
        if (!set[t]) continue;
        mats.length = 0;
        for (let k = 0; k < 8; k++) {
          const n = at(x + CORE_BLEND_DIRS[k][0], y + CORE_BLEND_DIRS[k][1]);
          near[k] = n;
          if (n !== t && set[n] && !mats.includes(n)) mats.push(n);
        }
        if (!mats.length) continue;
        const mask = open(at(x, y - 1)) | open(at(x + 1, y)) << 1 | open(at(x, y + 1)) << 2 | open(at(x - 1, y)) << 3, col = (y & 3) * 4 + (x & 3);
        for (const b of mats) {
          let bits = 0;
          for (let k = 0; k < 8; k++) if (near[k] === b) bits |= 1 << k;
          const piece = coreBlendPiece(blocks[t], t, b, bits, col, mask);
          if (piece) ctx.drawImage(piece, x * T, y * T);
        }
      }
  };
}
