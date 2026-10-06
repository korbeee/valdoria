'use strict';
// =====================================================================================
//  CORAÇÃO DA ILHA — REFORMA GERAL
// =====================================================================================
// Texturas melhores (âmbar, osso fóssil; a mistura entre materiais fica em core-blend.js), parede de fundo lisa, esqueletos e fósseis maiores e variados,
// vegetação e árvores do fundo, mobs novos, fortalezas de obsidiana nos lagos de lava e mais receitas.
// Carrega depois de todos os core-*.js e de wildlife/sentinela, antes de game.js.

// ---------------------------------------------------------------- paredes
// A parede de basalto tinha colunas verticais fortes que pareciam desenho colado; passa a usar a mesma
// textura suave da rocha profunda.
WALL_SOURCE[WALL.BASALT] = DEEP_WALL_SRC;

// ---------------------------------------------------------------- âmbar
// Resina fossilizada: camadas onduladas de mel escuro a dourado, rachaduras com reflexo, bolhas e restos
// presos. Todo ruído é periódico em 64px (a textura emenda a cada 4 blocos sem costura); a mistura com a
// rocha em volta é feita por js/core-blend.js.
const AMBER_RAMP = [[66, 30, 10], [110, 54, 16], [158, 92, 24], [204, 136, 36], [234, 174, 56], [248, 204, 94], [255, 232, 150]];
function rampAt(ramp, v) { const k = clamp(v, 0, 0.999) * (ramp.length - 1), i = k | 0; return lerpColor(ramp[i], ramp[i + 1], k - i); }
function genAmber2(seed) {
  const tex = new Tex(), rnd = mulberry32(seed), wr = (v) => ((v % TEX) + TEX) % TEX, TAU = Math.PI * 2;
  for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
    const warp = pfbm2(x / 16, y / 16, 4, seed, 3), fine = pfbm2(x / 8, y / 8, 8, seed + 7, 2), glow = pfbm2(x / 32, y / 32, 2, seed + 13, 2);
    // faixas de fluxo da resina, dobradas pelo ruído; o brilho vem de uma luz difusa no canto de cima
    const band = Math.sin((y + warp * 22 + Math.sin((x / TEX) * TAU) * 3) * TAU * 4 / TEX);
    let v = 0.56 + band * 0.05 + (warp - 0.5) * 0.42 + (fine - 0.5) * 0.1 + (glow - 0.5) * 0.4;
    v += (BAYER4[(y & 3) * 4 + (x & 3)] / 16 - 0.5) * 0.05;
    tex.set(x, y, rampAt(AMBER_RAMP, v));
  }
  for (let k = 0; k < 1; k++) {                                                       // rachadura: traço escuro + reflexo claro
    let x = rnd() * TEX, y = rnd() * TEX, a = rnd() * TAU;
    for (let i = 0, n = 10 + Math.floor(rnd() * 10); i < n; i++) {
      const px = Math.round(x), py = Math.round(y);
      tex.set(wr(px), wr(py), [58, 24, 8]); tex.set(wr(px + 1), wr(py + 1), [255, 222, 150]);
      a += (rnd() - 0.5) * 0.9; x += Math.cos(a); y += Math.sin(a);
    }
  }
  for (let k = 0; k < 4; k++) {                                                       // impurezas escuras presas na resina
    const x = Math.floor(rnd() * TEX), y = Math.floor(rnd() * TEX), n = 1 + Math.floor(rnd() * 3);
    for (let i = 0; i < n; i++) tex.set(wr(x + i), wr(y + (i & 1)), [50, 22, 10]);
  }
  for (let k = 0; k < 5; k++) {                                                       // bolhas de ar
    const bx = Math.floor(rnd() * TEX), by = Math.floor(rnd() * TEX), r = 1 + Math.floor(rnd() * 2);
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r) tex.set(wr(bx + dx), wr(by + dy), dx + dy < 0 ? [255, 236, 176] : [176, 92, 24]);
  }
  for (let k = 0; k < 1; k++) {                                                       // cintilação
    const x = Math.floor(rnd() * TEX), y = Math.floor(rnd() * TEX);
    tex.set(wr(x), wr(y), [255, 246, 214]); tex.set(wr(x - 1), wr(y), [255, 214, 120]); tex.set(wr(x + 1), wr(y), [255, 214, 120]); tex.set(wr(x), wr(y - 1), [255, 214, 120]); tex.set(wr(x), wr(y + 1), [255, 214, 120]);
  }
  return tex;
}
MATERIAL_TEX[TILE.AMBER] = genAmber2(2104);

// ---------------------------------------------------------------- osso fóssil
// Calcário em camadas, cor de osso queimado, com ossos de verdade fossilizados: costelas finas, pedaços de osso
// longo e uma fileira de dentes. Pouco contraste (é rocha, não desenho): lê como parede de
// ossário e se mistura com a pedra em volta.
function genFossil2(seed) {
  const tex = new Tex(), rnd = mulberry32(seed), wr = (v) => ((v % TEX) + TEX) % TEX, TAU = Math.PI * 2;
  const STONE = [[112, 98, 84], [152, 136, 112], [188, 172, 142], [206, 192, 162]];
  for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
    const warp = pfbm2(x / 16, y / 16, 4, seed, 3), fine = pfbm2(x / 4, y / 4, 16, seed + 3, 2);
    const strata = Math.sin((y + warp * 14) * TAU * 6 / TEX) * 0.09;                  // camadas de sedimento
    let v = 0.46 + (warp - 0.5) * 0.55 + (fine - 0.5) * 0.2 + strata;
    v += (BAYER4[(y & 3) * 4 + (x & 3)] / 16 - 0.5) * 0.06;
    let c = rampAt(STONE, v);
    const h = hash2(x, y, seed + 2);
    if (h < 0.03) c = shade(c, 0.8); else if (h > 0.985) c = shade(c, 1.12);
    tex.set(x, y, c);
  }
  const OUT = [92, 78, 62], MID = [204, 190, 158], LT = [230, 220, 192], HI = [248, 242, 222];
  const dot = (x, y, c) => tex.set(wr(Math.round(x)), wr(Math.round(y)), c);
  const disc = (x, y, r, col) => { const R = Math.ceil(r); for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) if (dx * dx + dy * dy <= r * r + 0.4) dot(x + dx, y + dy, col); };
  const bone = (pts, r, knob) => {                                                    // osso: sombra por baixo, corpo, luz em cima
    for (const [x, y] of pts) disc(x + 1, y + 1, r, OUT);
    for (const [x, y] of pts) disc(x, y, r, MID);
    for (const [x, y] of pts) disc(x - 0.5, y - 0.5, Math.max(0, r - 1), LT);
    if (r >= 2) for (const [x, y] of pts) dot(x - 1, y - 1, HI);
    if (knob) for (const [x, y] of [pts[0], pts[pts.length - 1]]) { disc(x + 1, y + 1, r + 1, OUT); disc(x, y, r + 1, MID); disc(x - 1, y - 1, r, LT); }
  };
  const line = (x0, y0, x1, y1) => { const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0)), o = []; for (let i = 0; i <= n; i++) o.push([lerp(x0, x1, i / n), lerp(y0, y1, i / n)]); return o; };
  const arc = (cx, cy, rad, a0, a1) => { const o = []; for (let a = a0; a <= a1; a += 0.02) o.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]); return o; };
  bone(arc(6, 62, 40, -1.5, -0.55), 1.4, false);                                       // costelas, finas e compridas
  bone(arc(6, 62, 29, -1.45, -0.6), 1.4, false);
  bone(arc(66, 2, 30, 1.2, 2.1), 1.4, false);
  bone(line(40, 36, 52, 30), 2, true);
  bone(line(30, 14, 46, 22), 2, true);                                                // pedaços de osso longo
  bone(line(8, 30, 20, 40), 1, true);
  bone(line(48, 52, 62, 46), 2, true);
  for (let i = 0; i < 5; i++) {                                                       // fileira de dentes
    const x = 10 + i * 4, y = 52 + Math.round(Math.sin(i * 0.7) * 1.5);
    dot(x, y, LT); dot(x + 1, y, MID); dot(x, y + 1, LT); dot(x + 1, y + 1, MID); dot(x, y + 2, MID); dot(x + 1, y + 3, OUT); dot(x + 2, y + 1, OUT); dot(x + 2, y, OUT);
  }
  for (let k = 0; k < 2; k++) {                                                       // fendas de rocha
    let x = rnd() * TEX, y = rnd() * TEX, a = rnd() * TAU;
    for (let i = 0; i < 12; i++) { dot(x, y, [84, 70, 56]); a += (rnd() - 0.5) * 0.9; x += Math.cos(a); y += Math.sin(a); }
  }
  for (let k = 0; k < 10; k++) dot(rnd() * TEX, rnd() * TEX, [96, 82, 66]);           // poros
  return tex;
}
MATERIAL_TEX[TILE.FOSSIL] = genFossil2(2105);
