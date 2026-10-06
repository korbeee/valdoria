'use strict';

// =====================================================================================
//  FOGO SAINDO DO METAL — o incêndio dos destroços integrado ao casco
// =====================================================================================
// Cada foco é assentado no ponto mais alto do casco naquela coluna (lido dos pixels do
// destroço) e afundado alguns pixels: a chama grande é desenhada ATRÁS do destroço, então a
// base some atrás da borda e ela parece sair de dentro do metal. Na frente ficam linguinhas
// lambendo a borda e uma emenda em brasa pulsando; acima, o metal fica chamuscado de fuligem.
// Depois da camada de luz, o próprio casco recebe a luz tremida do fogo (recortada pela forma
// do destroço), mais forte à noite.

function integratePieceFires(piece, list, rnd) {
  if (!list.length) return;
  const b = pieceBox(piece), W = b.img.width, H = b.img.height;
  const c = makeCanvas(W, H), g = c.getContext('2d');
  g.drawImage(b.img, 0, 0);
  const img = g.getImageData(0, 0, W, H), px = img.data;
  const solid = (x, y) => x >= 0 && y >= 0 && x < W && y < H && px[(y * W + x) * 4 + 3] > 0;
  const topAt = (x, from) => { for (let y = Math.max(0, from); y < H; y++) if (solid(x, y)) return y; return -1; };
  const local = (wx) => { const lx = Math.round(wx - b.x0); return b.flip ? W - 1 - lx : lx; };
  const world = (lx) => b.x0 + (b.flip ? W - 1 - lx : lx);
  const darken = (x, y, k) => { const i = (y * W + x) * 4; px[i] *= k; px[i + 1] *= k * 0.96; px[i + 2] *= k * 0.92; };
  for (const f of list) {
    const lx = clamp(local(f.x), 1, W - 2), want = Math.round(f.y - b.y0);
    const top = topAt(lx, want - Math.round(22 * f.s));
    if (top < 0 || top > want + 30) continue;
    f.y = b.y0 + top + 3; f.behind = true;
    // emenda em brasa: o contorno de cima do casco perto da base
    const r = Math.max(3, Math.round(9 * f.s)), seam = [];
    for (let dx = -r; dx <= r; dx++) {
      const y = topAt(lx + dx, top - 8);
      if (y < 0 || Math.abs(y - top) > 7) continue;
      seam.push([world(lx + dx), b.y0 + y, Math.abs(dx) / r]);
      if (solid(lx + dx, y + 1)) seam.push([world(lx + dx), b.y0 + y + 1, Math.abs(dx) / r + 0.35]);
    }
    f.seam = seam;
    // linguinhas na frente da borda, cada uma com seu ritmo
    const nLicks = f.s > 0.8 ? 3 : 2;
    f.licks = Array.from({ length: nLicks }, (_, i) => ({
      dx: (i - (nLicks - 1) / 2) * r * 0.8 + (rnd() - 0.5) * 3, k: 0.32 + rnd() * 0.16,
      style: 'lick', pal: f.pal === 'fuel' ? 'fuel' : 'hot', variant: Math.floor(rnd() * 4), tempo: 1.1 + rnd() * 0.4, seed: rnd() * 10, flip: rnd() < 0.5,
    }));
    // fuligem subindo pelo metal acima do foco, e o metal em volta da emenda queimado
    const plume = Math.round(36 * f.s);
    for (let y = top - 1; y >= Math.max(0, top - plume); y--) {
      const up = (top - y) / plume, half = 3 + (top - y) * 0.55;
      for (let x = Math.floor(lx - half); x <= Math.ceil(lx + half); x++) {
        if (!solid(x, y)) continue;
        const edge = Math.abs(x - lx) / half, n = hash2(x * 3 + 11, y * 5 + 7);
        darken(x, y, 0.42 + up * 0.38 + edge * 0.28 + (n - 0.5) * 0.12);
      }
    }
    for (let y = top; y < Math.min(H, top + 6); y++) for (let x = lx - r - 2; x <= lx + r + 2; x++) if (solid(x, y)) darken(x, y, 0.55 + (y - top) * 0.07);
  }
  g.putImageData(img, 0, 0);
  if (piece.art) piece.art = { ...piece.art, canvas: c }; else piece.img = c;
}

// Luz do fogo no casco: degradês somados e recortados pela forma do destroço (por quadro)
let pieceLightCanvas = null;
function pieceFireLight(piece, fires, t) {
  const b = pieceBox(piece), W = b.img.width, H = b.img.height;
  if (!pieceLightCanvas || pieceLightCanvas.width < W || pieceLightCanvas.height < H)
    pieceLightCanvas = makeCanvas(Math.max(W, pieceLightCanvas?.width || 0), Math.max(H, pieceLightCanvas?.height || 0));
  const g = pieceLightCanvas.getContext('2d');
  g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, pieceLightCanvas.width, pieceLightCanvas.height);
  g.globalCompositeOperation = 'lighter';
  for (const f of fires) {
    const lx = b.flip ? b.x0 + W - f.x : f.x - b.x0, ly = f.y - b.y0 - 6 * f.s;
    const fl = 1 + Math.sin(t * 9 + f.seed * 3) * 0.08 + Math.sin(t * 14.3 + f.seed) * 0.05;
    const r = 46 * f.s * fl * (0.5 + 0.5 * f.heat), gr = g.createRadialGradient(lx, ly, 0, lx, ly, r);
    gr.addColorStop(0, `rgba(255,170,70,${0.85 * f.heat})`); gr.addColorStop(0.35, `rgba(255,110,40,${0.4 * f.heat})`); gr.addColorStop(1, 'rgba(255,80,20,0)');
    g.fillStyle = gr; g.fillRect(lx - r, ly - r, r * 2, r * 2);
  }
  g.globalCompositeOperation = 'destination-in';
  if (b.flip) { g.save(); g.translate(W, 0); g.scale(-1, 1); g.drawImage(b.img, 0, 0); g.restore(); } else g.drawImage(b.img, 0, 0);
  g.globalCompositeOperation = 'source-over';
  return { canvas: pieceLightCanvas, b, W, H };
}

// Depois da camada de luz (chamado por drawCrashGlow, já em 'lighter'): casco aceso e emendas
function drawPieceFireLights(ctx, g, c, ox, oy, z, t) {
  const W = ctx.canvas.width, viewL = ox / z - 200, viewR = (ox + W) / z + 200;
  for (const piece of c.wrecks.concat(c.debris)) {
    const own = piece.fires || (piece.fire ? [piece.fire] : []), lit = own.filter((f) => f.behind && f.heat > 0);
    if (!lit.length) continue;
    const b0 = pieceBox(piece);
    if (b0.x0 > viewR || b0.x0 + b0.img.width < viewL) continue;
    const L = pieceFireLight(piece, lit, t);
    ctx.globalAlpha = 0.28 + 0.5 * (1 - g.daylight);
    ctx.imageSmoothingEnabled = false;
    if (L.b.flip) {
      ctx.save(); ctx.translate(Math.round((L.b.x0 + L.W) * z - ox), Math.round(L.b.y0 * z - oy)); ctx.scale(-z, z);
      ctx.drawImage(L.canvas, 0, 0, L.W, L.H, 0, 0, L.W, L.H); ctx.restore();
    } else ctx.drawImage(L.canvas, 0, 0, L.W, L.H, Math.round(L.b.x0 * z - ox), Math.round(L.b.y0 * z - oy), L.W * z, L.H * z);
    ctx.globalAlpha = 1;
    for (const f of lit) for (const [x, y, d] of f.seam || []) {
      const v = 0.5 + 0.5 * Math.sin(t * 6 + x * 0.9 + f.seed * 4) - d * 0.6;
      if (v < 0.05) continue;
      ctx.fillStyle = v > 0.7 ? `rgba(255,226,140,${f.heat})` : v > 0.35 ? `rgba(255,140,50,${0.9 * f.heat})` : `rgba(200,60,20,${0.8 * f.heat})`;
      ctx.fillRect(Math.round(x * z - ox), Math.round(y * z - oy), Math.ceil(z), Math.ceil(z));
    }
  }
}
