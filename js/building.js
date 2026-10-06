'use strict';

// IDs appended to preserve existing worlds and inventories. Decorative slopes
// are non-solid trim; slate blocks provide the structural roof underneath.
const BUILDING_PARTS = [
  ['SLATE', 'Telha de ardósia', true, [66, 91, 97], 'roof'],
  ['ROOF_LEFT', 'Acabamento inclinado /', false, [66, 91, 97], 'left'],
  ['ROOF_RIGHT', 'Acabamento inclinado \\', false, [66, 91, 97], 'right'],
  ['PLASTER', 'Reboco claro', true, [215, 197, 153], 'plaster'],
  ['TIMBER', 'Painel enxaimel', true, [204, 182, 135], 'timber'],
  ['CARVED_BEAM', 'Pilar de madeira', false, [148, 99, 52], 'beam'],
  ['WOOD_BRACE', 'Suporte diagonal', false, [148, 99, 52], 'brace'],
  ['LATTICE_WINDOW', 'Janela quadriculada', false, [135, 191, 187], 'window'],
  ['BALUSTRADE', 'Guarda-corpo de varanda', false, [164, 120, 67], 'rail'],
  ['IVY', 'Hera decorativa', false, [74, 139, 56], 'ivy'],
  ['FLOWER_BOX', 'Floreira de varanda', false, [160, 103, 63], 'flowers'],
  ['PENDANT', 'Lanterna suspensa', false, [255, 206, 117], 'lamp'],
  ['MOSS_BRICK', 'Pedra com musgo', true, [116, 130, 104], 'moss'],
  ['EAVES', 'Beiral de madeira', true, [146, 98, 53], 'eaves'],
];

// ---------- Texturas das peças de construção ----------
// Blocos sólidos pintam a textura inteira de 64x64 (variam de bloco para bloco); enfeites não
// sólidos usam só o canto 16x16, ou a coluna 16x64 quando repetem na vertical (pilar, hera).
// Luz vem de cima/esquerda: borda clara em cima, sombra embaixo/direita e contorno escuro.
const BWOOD = { ol: [46, 27, 16], dk: [84, 51, 28], md: [128, 82, 45], lt: [160, 110, 62], hi: [198, 148, 90] };
const BMETAL = { ol: [30, 27, 30], dk: [58, 52, 56], md: [92, 84, 86], hi: [150, 140, 132] };
const BSHADOW = [14, 9, 6]; // sombra semitransparente que o enfeite joga na parede de trás

// Fator do veio da madeira: fibras correm ao longo de `along`; repete a cada 64 px
const woodGrain = (along, across, seed) =>
  0.9 + pnoise2(along / 8, across, 8, seed) * 0.16 - (hash2(across, along >> 2, seed) < 0.1 ? 0.07 : 0);

// Reboco manchado: ruído suave de baixa frequência mais pontinhos de areia
function plasterAt(x, y, base, seed) {
  const h = hash2(x, y, seed);
  return shade(base, 0.9 + pfbm2(x / 16, y / 16, 4, seed, 3) * 0.14 + (h < 0.05 ? -0.07 : h > 0.96 ? 0.05 : 0));
}

// Rachadura fina: caminho aleatório escuro com um fio claro ao lado (dá relevo)
function paintCrack(tex, x, y, len, base, rnd) {
  for (let i = 0; i < len; i++) {
    tex.set(x, y, shade(base, 0.7));
    tex.set(x + 1, y, shade(base, 1.05));
    y++;
    if (rnd() < 0.55) x += rnd() < 0.5 ? -1 : 1;
  }
}

// Ardósia: fileiras de placas desencontradas, cada uma com tom próprio, canto de baixo
// arredondado, sombra da fileira de cima e um líquen aqui e ali
function slateAt(x, y, base, seed) {
  const row = y >> 3, by = y & 7, off = (row & 1) * 4, bx = wrap(x + off, 8);
  const id = Math.floor(wrap(x + off, 64) / 8);
  if (by === 0 || bx === 0 || (by === 7 && (bx === 1 || bx === 7))) return shade(base, 0.44);
  const tone = [1, 0.9, 1.08, 0.95, 1.03, 0.86, 0.98, 1.12][Math.floor(hash2(id, row, seed) * 8)];
  let c = shade(base, tone * (0.95 + hash2(x, y, seed) * 0.08));
  if (by === 1) c = shade(c, 0.74);
  else if (by === 7) c = shade(c, 0.72);
  else if (by === 6) c = shade(c, 1.14);
  else if (bx === 1) c = shade(c, 1.1);
  else if (bx === 7) c = shade(c, 0.86);
  if (by > 1 && by < 6 && hash2(x >> 1, y >> 1, seed + 5) < 0.012) c = lerpColor(c, [150, 160, 118], 0.6);
  return c;
}

const BUILD_ART = {
  roof(tex, color) {
    for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) tex.set(x, y, slateAt(x, y, color, 7));
  },

  // Acabamento inclinado: triângulo de ardósia com a tábua de beiral na diagonal
  slope(tex, color, left) {
    for (let v = 0; v < T; v++) for (let u = 0; u < T; u++) {
      const a = left ? u : T - 1 - u, d = a + v - (T - 1);
      if (d < 0) continue;
      const g = woodGrain(u + v, d, 3);
      const c = d === 0 ? BWOOD.ol : d === 1 ? BWOOD.hi : d === 2 ? shade(BWOOD.lt, g) : d === 3 ? shade(BWOOD.md, g)
        : d === 4 ? BWOOD.dk : d === 5 ? shade(slateAt(a, v, color, 7), 0.62) : slateAt(a, v, color, 7);
      tex.set(u, v, c);
    }
  },
  left(tex, color) { BUILD_ART.slope(tex, color, true); },
  right(tex, color) { BUILD_ART.slope(tex, color, false); },

  plaster(tex, color) {
    for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) tex.set(x, y, plasterAt(x, y, color, 71));
    const rnd = mulberry32(19);
    paintCrack(tex, 9, 3, 7, color, rnd);
    paintCrack(tex, 52, 41, 6, color, rnd);
    paintCrack(tex, 27, 50, 4, color, rnd);
  },

  // Enxaimel: esteios, travessas e mãos-francesas escuras sobre reboco. O desenho ocupa 2x2
  // blocos, então uma parede inteira forma o "X" e as divisas do enxaimel de verdade.
  timber(tex, color) {
    const W = { hi: [150, 100, 58], md: [108, 67, 38], dk: [66, 40, 23], ol: [40, 24, 14] };
    for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
      const lx = x & 31, ly = y & 31, slash = ((x >> 5) + (y >> 5)) & 1;
      const d = slash ? 31 - ly - lx : lx - ly; // distância até o centro da diagonal (+ = lado de cima)
      let k = -1, along = 0, across = 0;
      if (lx < 4) { k = lx; along = y; across = lx; }
      else if (ly < 4) { k = ly; along = x; across = ly + 4; }
      else if (d >= -2 && d <= 1) { k = 1 - d; along = x + y; across = d + 10; }
      let c;
      if (k >= 0) {
        const g = woodGrain(along, across, 33);
        c = k === 0 ? shade(W.hi, g) : k === 3 ? W.dk : shade(W.md, g * (k === 2 ? 0.88 : 1));
        if ((lx === 2 && (ly === 10 || ly === 22)) || (ly === 2 && (lx === 11 || lx === 23))) c = W.ol; // cavilhas
      } else {
        c = plasterAt(x, y, color, 71);
        if (lx === 4 || ly === 4 || d === -3) c = shade(c, 0.72);
        else if (lx === 5 || ly === 5 || d === -4) c = shade(c, 0.9);
      }
      tex.set(x, y, c);
    }
  },

  // Pilar entalhado: fuste com canelura no meio e colarinhos a cada dois blocos
  beam(tex) {
    for (let y = 0; y < TEX; y++) {
      const ly = y & 31;
      for (let u = 0; u < T; u++) {
        const g = woodGrain(y, u, 41);
        let c = null, a = 255;
        if (ly < 4 && u >= 3 && u <= 12) {
          c = ly === 0 || u === 3 || u === 12 ? BWOOD.ol : ly === 1 ? BWOOD.hi : ly === 2 ? shade(BWOOD.lt, g) : BWOOD.dk;
        } else if (u >= 4 && u <= 11) {
          c = [BWOOD.ol, BWOOD.hi, BWOOD.lt, BWOOD.dk, BWOOD.lt, BWOOD.md, BWOOD.dk, BWOOD.ol][u - 4];
          if (u > 4 && u < 11) c = shade(c, g);
          if (ly === 16 && u > 4 && u < 11) c = BWOOD.dk;
          if (ly === 17 && u > 4 && u < 11) c = shade(BWOOD.lt, 1.1);
        } else if (u === 12 || (u === 13 && ly < 5)) { c = BSHADOW; a = 80; }
        if (c) tex.set(u, y, c, a);
      }
    }
  },

  // Mão-francesa na diagonal, com cavilha nas duas pontas
  brace(tex) {
    for (let v = 0; v < T; v++) for (let u = 0; u < T; u++) {
      const d = u - v, g = woodGrain(u + v, d, 43);
      if (d === -4) { tex.set(u, v, BSHADOW, 70); continue; }
      if (d > 3 || d < -3) continue;
      tex.set(u, v, d === 3 || d === -3 ? BWOOD.ol : d === 2 ? BWOOD.hi : d === -2 ? BWOOD.dk : shade(d === 1 ? BWOOD.lt : BWOOD.md, g));
    }
    for (const p of [3, 12]) { tex.set(p, p, BWOOD.ol); tex.set(p, p - 1, BWOOD.hi); }
  },

  // Janela: moldura com chanfro, cruzeta de madeira e quatro vidros com reflexo
  window(tex) {
    for (let v = 0; v < T; v++) for (let u = 0; u < T; u++) {
      const edge = Math.min(u, v, T - 1 - u, T - 1 - v);
      let c;
      if (edge === 0) c = BWOOD.ol;
      else if (edge === 1) c = u === 14 || v === 14 ? BWOOD.dk : BWOOD.hi;
      else if (u === 7 || u === 8 || v === 7 || v === 8) {
        c = (u === 7 || u === 8) && (v === 7 || v === 8) ? BWOOD.md : u === 7 || v === 7 ? BWOOD.lt : BWOOD.dk;
      } else {
        const pu = u < 7 ? u - 2 : u - 9, pv = v < 7 ? v - 2 : v - 9;
        c = lerpColor([160, 212, 220], [70, 118, 144], pv / 8 + v / 30);
        if (pu + pv === 3 || pu + pv === 4) c = lerpColor(c, [230, 248, 244], 0.55);
        if (pv === 0) c = shade(c, 0.7);
        else if (pu === 0) c = shade(c, 0.84);
        if (pu === 1 && pv === 1) c = [250, 255, 252];
      }
      tex.set(u, v, c);
    }
  },

  // Guarda-corpo: corrimão, rodapé e dois balaústres torneados por bloco
  rail(tex) {
    const bulge = [1, 0, 0, 1, 1, 0, 1]; // largura extra dos balaústres, linha 5 a 11
    for (let v = 0; v < T; v++) for (let u = 0; u < T; u++) {
      const g = woodGrain(u, v, 47);
      let c = null, a = 255;
      if (v === 0 || v === 15) c = BWOOD.ol;
      else if (v === 1 || v === 12) c = BWOOD.hi;
      else if (v === 2 || v === 13) c = shade(BWOOD.lt, g);
      else if (v === 3 || v === 14) c = BWOOD.dk;
      else if (v === 4) { c = BSHADOW; a = 70; }
      if (v >= 4 && v <= 11) for (const cx of [3, 11]) {
        const e = bulge[Math.max(0, v - 5)], l = cx - e, r = cx + 1 + e;
        if (u < l || u > r + 1) continue;
        a = 255;
        c = u === r + 1 ? null : u === l ? BWOOD.hi : u === r ? BWOOD.dk : shade(BWOOD.md, g);
        if (u === r + 1) { c = BSHADOW; a = 70; }
      }
      if (c) tex.set(u, v, c, a);
    }
  },

  // Hera: dois ramos que serpenteiam (emendam de bloco em bloco na vertical) e folhas em
  // três tons, as de trás mais escuras
  ivy(tex) {
    const TAU = Math.PI * 2;
    const stem = (y, k) => Math.round(8 + Math.sin(y / TEX * TAU * (k + 1) + k * 2) * 2.2 + Math.sin(y / TEX * TAU * 3 + 1) * (1 - k));
    for (let y = 0; y < TEX; y++) { tex.set(stem(y, 1) - 3, y, [58, 48, 30]); tex.set(stem(y, 0), y, [86, 66, 38]); }
    const LEAF = ['.##..', '####.', '#####', '.###.'];
    const back = { ol: [24, 52, 28], dk: [36, 78, 38], md: [48, 98, 44], hi: [66, 120, 52] };
    const front = { ol: [28, 62, 30], dk: [52, 108, 44], md: [74, 140, 56], hi: [124, 178, 70] };
    const rnd = mulberry32(911);
    const leaves = [];
    for (let k = 0; k < 22; k++) {
      const y = Math.floor(k * TEX / 22 + rnd() * 2), side = k & 1 ? 1 : -1;
      leaves.push({ y, side, x: stem(y, k % 3 === 0 ? 1 : 0) - (k % 3 === 0 ? 3 : 0) + side * (2 + Math.floor(rnd() * 2)), pal: rnd() < 0.4 ? back : front });
    }
    leaves.sort((p, q) => (p.pal === back ? 0 : 1) - (q.pal === back ? 0 : 1));
    for (const { x, y, side, pal } of leaves) {
      const at = (i, j) => j >= 0 && j < LEAF.length && i >= 0 && i < 5 && LEAF[j][side > 0 ? i : 4 - i] === '#';
      for (let j = -1; j <= LEAF.length; j++) for (let i = -1; i <= 5; i++) {
        const u = x + i - 2, v = y + j - 2;
        if (u < 0 || u >= T) continue;
        if (!at(i, j)) {
          if ((at(i - 1, j) || at(i, j - 1)) && tex.get(u, v)[3] === 0) tex.set(u, v, pal.ol);
          continue;
        }
        const c = !at(i, j - 1) || !at(i - 1, j) ? pal.hi : !at(i, j + 1) || !at(i + 1, j) ? pal.dk : (i + j) % 3 ? pal.md : pal.dk;
        tex.set(u, v, c);
      }
    }
  },

  // Floreira: caixote de tábuas com terra, folhagem caindo pela borda e flores de cores variadas
  flowers(tex) {
    for (let v = 10; v < T; v++) for (let u = 1; u < T - 1; u++) {
      const g = woodGrain(u, v, 53);
      tex.set(u, v, u === 1 || u === 14 || v === 15 ? BWOOD.ol : v === 10 ? BWOOD.hi : v === 11 ? BWOOD.dk
        : u === 2 ? BWOOD.lt : u === 13 ? BWOOD.dk : v === 13 && u % 6 === 4 ? BWOOD.dk : shade(BWOOD.md, g));
    }
    for (let u = 2; u < 14; u++) tex.set(u, 9, hash2(u, 9, 3) < 0.3 ? [84, 58, 36] : [56, 37, 25]);
    const greens = [[44, 96, 42], [66, 128, 52], [96, 158, 62]];
    for (let v = 5; v <= 9; v++) for (let u = 2; u < 14; u++) {
      if (hash2(u, v, 7) > [0.2, 0.45, 0.7, 0.85, 0.55][v - 5]) continue;
      tex.set(u, v, greens[v === 5 || hash2(u, v, 8) < 0.3 ? 2 : v >= 8 ? 0 : 1]);
    }
    for (const [u, v] of [[2, 11], [3, 11], [3, 12], [12, 11], [12, 12], [13, 12], [12, 13]]) tex.set(u, v, greens[(u + v) % 2 ? 1 : 0]);
    const FLOWERS = [[3, 4, [214, 64, 72]], [6, 2, [250, 206, 80]], [9, 4, [236, 128, 168]], [12, 3, [156, 112, 214]]];
    for (const [fu, fv, col] of FLOWERS) {
      for (let v = fv + 2; v <= 7; v++) tex.set(fu, v, [58, 116, 48]);
      for (const [du, dv] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) tex.set(fu + du, fv + dv, du < 0 || dv < 0 ? shade(col, 1.15) : shade(col, 0.82));
      tex.set(fu, fv, col[0] > 240 && col[1] > 190 ? [150, 84, 34] : [255, 232, 120]);
    }
  },

  // Lanterna suspensa: corrente, chapéu de ferro, vidro com chama e um halo quente em volta
  lamp(tex) {
    for (let v = 5; v <= 13; v++) for (let u = 2; u <= 13; u++) {
      const dist = Math.max(3 - u, u - 12, 6 - v, v - 12, 0);
      if (dist > 0) tex.set(u, v, [255, 200, 110], dist === 1 ? 70 : 34);
    }
    for (let v = 0; v < 4; v++) tex.set(7, v, v & 1 ? BMETAL.hi : BMETAL.dk);
    for (let u = 6; u <= 9; u++) tex.set(u, 4, BMETAL.ol);
    for (let u = 5; u <= 10; u++) tex.set(u, 5, u === 5 || u === 10 ? BMETAL.ol : u < 8 ? BMETAL.hi : BMETAL.md);
    for (let u = 4; u <= 11; u++) { tex.set(u, 6, u === 4 || u === 11 ? BMETAL.ol : BMETAL.dk); tex.set(u, 12, u === 4 || u === 11 ? BMETAL.ol : BMETAL.dk); }
    for (let v = 7; v <= 11; v++) for (let u = 4; u <= 11; u++) {
      if (u === 4 || u === 11) { tex.set(u, v, BMETAL.ol); continue; }
      const r = Math.hypot(u - 7.5, v - 9.2) / 3.6;
      tex.set(u, v, lerpColor([255, 246, 200], [238, 160, 70], clamp(r, 0, 1)));
    }
    tex.set(7, 8, [255, 214, 120]); tex.set(8, 8, [255, 236, 170]);
    for (const [u, v] of [[7, 9], [8, 9], [7, 10], [8, 10]]) tex.set(u, v, [255, 254, 236]);
    for (let u = 5; u <= 10; u++) tex.set(u, 13, u === 5 ? BMETAL.hi : u === 10 ? BMETAL.ol : BMETAL.md);
    for (let u = 6; u <= 9; u++) tex.set(u, 14, BMETAL.dk);
    tex.set(7, 15, BMETAL.ol); tex.set(8, 15, BMETAL.ol);
  },

  // Pedra com musgo: blocos irregulares de pedra esverdeada, musgo nas juntas e no alto das
  // pedras, escorrendo um pouco pela face
  moss(tex, color) {
    const moss = new Uint8Array(TEX * TEX);
    const rowOff = (row) => Math.floor(hash2(row & 7, 0, 13) * 16);
    for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
      const by = y & 7, bx = wrap(x + rowOff(y >> 3), 16);
      const m = pfbm2(x / 16, y / 16, 4, 29, 3) + (by <= 1 ? 0.16 : by === 7 || bx === 15 ? 0.12 : 0) - by * 0.02;
      if (m > 0.6) moss[y * TEX + x] = 1;
    }
    for (let y = 0; y < TEX; y += 8) for (let x = 0; x < TEX; x++) {
      if (!moss[y * TEX + x] || hash2(x, y, 31) > 0.3) continue;
      const len = 1 + Math.floor(hash2(x, y, 32) * 3);
      for (let k = 1; k <= len; k++) moss[wrap(y + k, TEX) * TEX + x] = 1;
    }
    const M = (x, y) => moss[wrap(y, TEX) * TEX + wrap(x, TEX)];
    const greens = [[50, 86, 38], [74, 118, 48], [106, 150, 60]];
    for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
      const row = y >> 3, by = y & 7, off = rowOff(row), bx = wrap(x + off, 16);
      const id = Math.floor(wrap(x + off, TEX) / 16);
      let c;
      if (M(x, y)) c = !M(x, y - 1) ? greens[2] : !M(x, y + 1) ? greens[0] : greens[hash2(x, y, 33) < 0.3 ? 0 : 1];
      else if (by === 7 || bx === 15) c = [50, 56, 48];
      else {
        const stone = lerpColor(color, [128, 122, 110], hash2(id, row & 7, 17));
        const h = hash2(x, y, 19);
        c = shade(stone, 0.9 + hash2(id, row & 7, 18) * 0.16 + (h < 0.08 ? -0.1 : 0));
        const corner = (bx === 0 || bx === 14) && (by === 0 || by === 6);
        if (corner) c = shade(c, 0.9);
        else if (by === 0 || bx === 0) c = shade(c, 1.16);
        else if (by === 6 || bx === 14) c = shade(c, 0.76);
      }
      tex.set(x, y, c);
    }
  },

  // Beiral: tábua de testeira com emendas e, embaixo, as pontas dos caibros na sombra
  eaves(tex, color) {
    for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
      const v = y & 15, bx = x & 7, seam = ((y >> 4) * 23 + 9) & 31;
      let c;
      if (v <= 6) {
        const g = woodGrain(x, v + (y >> 4) * 7, 55);
        c = v === 0 ? shade(BWOOD.hi, g) : v === 6 ? BWOOD.dk : shade(v === 1 ? BWOOD.lt : color, g);
        if ((x & 31) === seam) c = BWOOD.ol;
        else if ((x & 31) === ((seam + 1) & 31) && v < 6) c = shade(c, 1.12);
      } else if (v === 7) c = BWOOD.ol;
      else if (v <= 13) {
        const gap = bx >= 5 || (v === 13 && (bx === 0 || bx === 4));
        c = gap ? [34, 22, 14] : v === 8 ? shade(BWOOD.lt, 0.72) : bx === 0 ? BWOOD.hi : bx === 4 ? BWOOD.dk
          : bx === 2 && (v === 10 || v === 11) ? BWOOD.md : BWOOD.lt;
      } else c = v === 14 ? [48, 30, 18] : [36, 23, 14];
      tex.set(x, y, c);
    }
  },
};

function buildingTexture(kind, color) {
  const tex = new Tex();
  BUILD_ART[kind](tex, color);
  return tex;
}

BUILDING_PARTS.forEach(([key, name, solid, color, art], i) => {
  const tile = TILE[key] = 41 + i, item = ITEM[key] = 92 + i;
  defTile(tile, { name, solid, color, drop: item, reto: true, hardness: .4,
    ferramenta: ['plaster', 'moss', 'roof'].includes(art) ? 'picareta' : 'machado',
    opacity: solid ? 3 : 1, light: art === 'lamp' ? 13 : 0 });
  defItem(item, { name, place: tile });
  MATERIAL_TEX[tile] = buildingTexture(art, color);
});
for (const [key, name, id] of [['PLASTER', 'Parede de reboco claro', 9], ['TIMBER', 'Parede enxaimel', 10]]) {
  WALL[key] = id;
  WALL_SOURCE[id] = TILE[key];
  const item = ITEM['WALL_' + key] = 106 + id - 9;
  WALL_ITEM[id] = item;
  defItem(item, { name, parede: id });
}
buildFlatTiles();
// Pilar e hera usam a coluna 16x64 da textura: mudam de bloco para bloco numa pilha
FLAT_VERTICAL[TILE.CARVED_BEAM] = 1;
FLAT_VERTICAL[TILE.IVY] = 1;
