'use strict';

// Buffer de sprite: ao contrário de Tex, ignora pixels fora dos limites
class Sprite extends Tex {
  set(x, y, c, a = 255) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    super.set(x, y, c, a);
  }
  opaque(x, y) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h && this.d[(y * this.w + x) * 4 + 3] > 0;
  }
  finish(outline = [18, 26, 20]) {
    const img = new ImageData(this.d, this.w, this.h);
    if (outline) outlinePass(img, outline);
    const c = makeCanvas(this.w, this.h);
    c.getContext('2d').putImageData(img, 0, 0);
    return c;
  }
}

const PALETTES = {
  pine:    [[30, 70, 44], [42, 94, 56], [58, 120, 66], [84, 148, 80]],
  redPine: [[84, 36, 36], [116, 54, 46], [146, 78, 58], [176, 108, 74]],
  oak:     [[36, 86, 38], [54, 116, 46], [78, 148, 58], [116, 182, 76]],
  blossom: [[150, 60, 108], [196, 94, 146], [232, 140, 186], [250, 194, 222]],
  frost:   [[34, 66, 70], [48, 90, 90], [70, 116, 110], [104, 146, 136]],
  jungle:  [[22, 66, 32], [34, 96, 42], [54, 128, 52], [92, 166, 70]],
};

// Pinheiro em camadas com bordas serrilhadas (snowy = neve em cima de cada camada)
// opts.tiers = quantas camadas, opts.spread = quanto cada camada alarga (pinheiro fino ou cheio)
function genPine(seed, pal, snowy = false, opts = {}) {
  const tiers = opts.tiers || 5, spread = opts.spread || 4.3, step = Math.round(64 / tiers);
  const W = 50, H = 2 + (tiers - 1) * step + 30, cx = 25;
  const s = new Sprite(W, H);
  const rnd = mulberry32(seed);
  for (let i = 0; i < tiers; i++) {
    const top = 2 + i * step, h = 22, maxHalf = 7 + i * spread;
    for (let y = top; y < top + h && y < H; y++) {
      const k = (y - top) / h;
      const half = 1 + maxHalf * k;
      for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half); x++) {
        const t = (x - cx) / half;
        if (Math.abs(t) > 1) continue;
        // dentes na base de cada camada
        if (y > top + h - 4 && hash2(Math.floor(x / 3), i, seed) * 4 < y - (top + h - 4)) continue;
        let lvl = t < -0.4 ? 3 : t < 0.15 ? 2 : 1;
        if (y > top + h - 6) lvl = Math.max(0, lvl - 1);
        if ((x * 2 + y) % 7 === 0 && hash2(x, y, seed) < 0.6) lvl = Math.max(0, lvl - 1);
        if (hash2(x, y, seed + 1) < 0.05) lvl = Math.min(3, lvl + 1);
        s.set(x, y, pal[lvl]);
      }
    }
  }
  for (let i = 0; i < 6; i++) s.set(cx - 8 + rnd() * 10, 20 + rnd() * (H - 34), pal[3]);
  if (!snowy) // brilho na beirada de cima de cada camada (dá volume às "saias" do pinheiro)
    for (let x = 0; x < W; x++)
      for (let y = 1; y < H; y++)
        if (s.opaque(x, y) && !s.opaque(x, y - 1) && x < cx + 4) s.set(x, y, [pal[3][0] + 26, pal[3][1] + 30, pal[3][2] + 18]);
  if (snowy) // neve acumulada: 2 pixels abaixo de cada borda de cima
    for (let x = 0; x < W; x++)
      for (let y = H - 1; y > 0; y--)
        if (s.opaque(x, y) && !s.opaque(x, y - 1)) { s.set(x, y, [244, 248, 252]); if (s.opaque(x, y + 1) && hash2(x, y, seed) < 0.7) s.set(x, y + 1, [210, 226, 238]); }
  return { canvas: s.finish(), overlap: 3 * T };
}

// ---------- Copas de folhas ----------
// Paletas de 5 tons (sombra funda → brilho)
const LEAF = {
  oak:     [[24, 58, 34], [38, 88, 42], [60, 122, 52], [92, 158, 64], [140, 196, 88]],
  birch:   [[48, 84, 36], [76, 122, 44], [110, 158, 58], [150, 190, 78], [196, 222, 118]],
  maple:   [[98, 34, 22], [150, 58, 28], [204, 96, 36], [236, 146, 52], [252, 200, 96]],
  apple:   [[28, 64, 36], [44, 96, 44], [70, 132, 56], [104, 168, 70], [150, 204, 96]],
  blossom: [[128, 58, 96], [178, 88, 132], [222, 130, 170], [244, 176, 206], [255, 222, 236]],
  willow:  [[34, 72, 44], [54, 104, 52], [84, 140, 64], [122, 176, 82], [170, 210, 118]],
  cypress: [[16, 44, 34], [26, 66, 44], [40, 92, 54], [62, 120, 66], [96, 150, 84]],
  jungle:  [[14, 52, 30], [24, 82, 40], [40, 116, 50], [70, 154, 62], [118, 196, 86]],
  frost:   [[54, 78, 86], [80, 110, 112], [118, 146, 142], [168, 192, 188], [224, 238, 240]],
  palm:    [[30, 76, 34], [48, 110, 42], [76, 148, 54], [116, 184, 70], [168, 216, 100]],
};
const BARK = [[58, 38, 24], [92, 62, 38], [124, 88, 54], [40, 26, 18]];

// ---------- Galhos ----------
// Um galho sai do tronco abrindo para o lado, vai virando para cima, afina até a ponta e
// no meio do caminho se divide em dois. Devolve as pontas em `tips`: a copa põe um tufo de
// folhas em cada uma, e é isso que faz a silhueta seguir os galhos em vez de virar uma bola.
// O que sobra de casca aparece nos vãos entre os tufos e embaixo da copa.
function genLimb(s, x0, y0, ang, len, w0, dir, rnd, tips, marks, fork = true) {
  let x = x0, y = y0, a = ang;
  const curve = (rnd() - 0.5) * 0.02;
  for (let k = 0; k <= len; k++) {
    a += curve - dir * 0.014; // vai levantando a ponta
    x += Math.cos(a); y += Math.sin(a);
    const w = Math.max(1, Math.round(w0 * (1 - (k / len) * 0.8)));
    limbInk(s, x, y, w);
    marks.push([x, y, w, k / len]); // o pedaço grosso é repintado por cima das folhas
    if (fork && k === Math.round(len * 0.5) && w0 >= 3) {
      genLimb(s, x, y, a - dir * (0.55 + rnd() * 0.4), len * (0.42 + rnd() * 0.2), w0 - 1, dir, rnd, tips, marks, false);
    }
  }
  tips.push([x, y]);
}
function limbInk(s, x, y, w) {
  for (let j = 0; j < w; j++) s.set(x, y + j - (w >> 1), BARK[j === 0 && w > 1 ? 2 : j === w - 1 && w > 2 ? 0 : 1]);
}

// Tronco que entra na copa: começa na largura do bloco de tronco lá embaixo e AFINA sem
// parar até onde os galhos se abrem. O afinamento é contínuo de propósito: antes ele
// engrossava só no fim e a árvore ficava gorda em cima e fina embaixo.
function genCrownTrunk(s, cx, baseY, topY, rnd) {
  for (let y = baseY; y >= topY; y--) {
    const k = (baseY - y) / Math.max(1, baseY - topY);
    const half = lerp(7.4, 2, k ** 0.85);
    const wob = (rnd() - 0.5) * 0.6;
    for (let x = Math.round(cx - half + wob); x <= Math.round(cx + half + wob); x++) {
      const t = (x - cx - wob) / half;
      s.set(x, y, BARK[t < -0.55 ? 2 : t < 0.35 ? 1 : 0]);
    }
  }
}

// Copa de folhas em tufos: cada tufo tem luz em cima/esquerda e sombra embaixo, com vãos
// escuros entre eles (onde aparecem os galhos), borda recortada e sombra geral embaixo.
// o: { w, h, shape(rnd, W, H) -> [[x, y, rx, ry]...], cell, overlap, branches, fruit, flowers,
//      droop (galhos pendentes do salgueiro), vines (cipós), snow (neve em cima) }
function genLeafy(seed, pal, o) {
  const W = o.w, H = o.h, s = new Sprite(W, H), rnd = mulberry32(seed), cell = o.cell || 6;
  let limbMarks = [];
  const blobs = o.shape(rnd, W, H);
  const inside = (x, y) => {
    const wob = (hash2(x >> 1, y >> 1, seed) - 0.5) * 0.3; // beirada em tufinhos
    for (const [bx, by, rx, ry] of blobs) {
      const dx = (x + 0.5 - bx) / rx, dy = (y + 0.5 - by) / ry;
      if (dx * dx + dy * dy <= 1 + wob) return true;
    }
    return false;
  };

  // Tronco e galhos, por baixo das folhas. Cada galho ganha um tufo na ponta, então a copa
  // cresce em volta deles em vez de ser uma bola com galhos escondidos.
  if (o.branches) {
    const rb = mulberry32(seed + 77), cx = W / 2;
    const baseY = H - 1, topY = o.branchY ?? Math.round(H * 0.58);
    genCrownTrunk(s, cx, baseY, topY, rb);
    const tips = [];
    limbMarks = [];
    for (let i = 0; i < o.branches; i++) {
      const dir = i % 2 ? 1 : -1;
      const k = (i + 0.5) / o.branches;
      // o galho mais baixo sai bem acima da emenda com o tile: colado nela virava um caroço
      const y0 = Math.round(lerp(baseY - 15, topY + 2, k) + (rb() - 0.5) * 5);
      const open = 0.18 + rb() * 0.38; // quase deitado: ele abre para o lado antes de subir
      const ang = dir > 0 ? -open : -(Math.PI - open);
      const len = (o.limb || 24) * (0.8 + rb() * 0.45);
      genLimb(s, cx + dir * 4, y0, ang, len, k < 0.5 ? 4 : 3, dir, rb, tips, limbMarks);
    }
    for (const [tx, ty] of tips) blobs.push([tx, ty, 6 + rb() * 4, 5 + rb() * 3]);
  }

  let minY = H, maxY = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (inside(x, y)) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); }

  const centers = [];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!inside(x, y)) continue;
      const gx = Math.floor(x / cell), gy = Math.floor(y / cell);
      let best = 1e9, ox = 0, oy = 0;
      for (let j = -1; j <= 1; j++)
        for (let i = -1; i <= 1; i++) {
          const cx = (gx + i + hash2(gx + i, gy + j, seed)) * cell, cy = (gy + j + hash2(gx + i, gy + j, seed + 9)) * cell;
          const d = (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2;
          if (d < best) { best = d; ox = x + 0.5 - cx; oy = y + 0.5 - cy; }
        }
      const d = Math.sqrt(best);
      const gap = d > cell * 0.62;
      if (gap && s.opaque(x, y) && d > cell * 0.7) continue; // galho aparecendo no vão
      let v = 0.64 - ((ox + oy) / cell) * 0.3 - ((y - minY) / Math.max(1, maxY - minY)) * 0.34 - (x / W - 0.5) * 0.18;
      if (gap) v -= 0.26;
      v += (hash2(x, y, seed + 3) - 0.5) * 0.1;
      s.set(x, y, pal[clamp(Math.floor(v * pal.length), 0, pal.length - 1)]);
      if (d < 0.75) centers.push([x, y]);
    }

  // O pedaço grosso dos galhos volta por cima das folhas: é o que dá a leitura de árvore
  // de verdade, com casca aparecendo por baixo da copa antes de sumir dentro dos tufos.
  for (const [bx, by, bw, bk] of limbMarks) if (bk < 0.5) limbInk(s, bx, by, bw);

  // Frutas e flores no miolo dos tufos
  for (const [x, y] of centers) {
    const h = hash2(x, y, seed + 21);
    if (o.fruit && h < 0.4 && y > minY + 5) {
      s.set(x, y, o.fruit[0]); s.set(x + 1, y, o.fruit[0]); s.set(x, y + 1, o.fruit[1]); s.set(x + 1, y + 1, o.fruit[1]);
      s.set(x, y, o.fruit[2]);
    } else if (o.flowers && h < 0.6) {
      s.set(x, y, o.flowers); if (h < 0.25) s.set(x + 1, y - 1, o.flowers);
    }
  }

  // Galhos pendentes (salgueiro) ou cipós (selva) caindo da parte de baixo
  if (o.droop || o.vines) {
    for (let x = 1; x < W - 1; x += o.droop ? 2 : 5) {
      let by = -1;
      for (let y = H - 1; y >= 0; y--) if (s.opaque(x, y)) { by = y; break; }
      if (by < 0 || hash2(x, 7, seed) > (o.droop ? 0.85 : 0.6)) continue;
      const len = Math.round((o.droop ? 10 : 6) + hash2(x, 3, seed) * (o.droop ? 20 : 16));
      for (let k = 1; k <= len && by + k < H; k++) {
        const px = x + Math.round(Math.sin(k * 0.35 + x) * 0.6);
        if (o.droop) s.set(px, by + k, pal[k % 3 === 0 ? 3 : k > len - 3 ? 1 : 2]);
        else { s.set(px, by + k, k % 4 ? [40, 104, 44] : [74, 144, 60]); if (k % 5 === 2) s.set(px + 1, by + k, [92, 166, 70]); }
      }
    }
  }

  // Brilho no topo de cada coluna (ou neve acumulada)
  for (let x = 0; x < W; x++)
    for (let y = 0; y < H; y++) {
      if (!s.opaque(x, y) || s.opaque(x, y - 1)) continue;
      if (o.snow) { s.set(x, y, [244, 248, 252]); if (s.opaque(x, y + 1) && hash2(x, y, seed) < 0.7) s.set(x, y + 1, [210, 226, 238]); }
      else if (y < (minY + maxY) / 2) s.set(x, y, pal[pal.length - 1]);
      break;
    }

  return { canvas: s.finish(o.outline || [14, 30, 20]), overlap: o.overlap };
}

// Formas das copas (em px dentro do sprite)
const CANOPY_SHAPES = {
  oak: (rnd, W) => [[W / 2, 28, 25, 20], ...Array.from({ length: 7 }, () => [10 + rnd() * (W - 20), 10 + rnd() * 30, 9 + rnd() * 7, 8 + rnd() * 6])],
  apple: (rnd, W) => [[W / 2, 26, 18, 15], ...Array.from({ length: 5 }, () => [12 + rnd() * (W - 24), 12 + rnd() * 20, 8 + rnd() * 5, 7 + rnd() * 4])],
  birch: (rnd, W) => [[W / 2, 16, 11, 11], [W / 2 - 1, 30, 15, 13], [W / 2 + 1, 45, 16, 12], [W / 2 - 2, 55, 11, 7],
    ...Array.from({ length: 3 }, () => [8 + rnd() * (W - 16), 18 + rnd() * 30, 6 + rnd() * 3, 6 + rnd() * 3])],
  willow: (rnd, W) => [[W / 2, 22, 26, 17], [W / 2 - 15, 28, 14, 11], [W / 2 + 15, 28, 14, 11], [W / 2 + (rnd() - 0.5) * 8, 12, 16, 9]],
  cypress: (rnd, W) => [[W / 2, 12, 6, 10], [W / 2, 28, 9, 14], [W / 2 + (rnd() - 0.5) * 2, 48, 11, 16], [W / 2, 66, 10, 13]],
  jungle: (rnd, W) => [[W / 2, 30, 30, 18], [W / 2 - 24, 34, 18, 13], [W / 2 + 24, 34, 18, 13], [W / 2 + (rnd() - 0.5) * 10, 16, 20, 11],
    ...Array.from({ length: 4 }, () => [14 + rnd() * (W - 28), 14 + rnd() * 26, 9 + rnd() * 6, 7 + rnd() * 5])],
};

const TREE_KINDS = {
  oak: (seed) => genLeafy(seed, LEAF.oak, { w: 80, h: 82, cell: 7, branches: 5, limb: 26, shape: CANOPY_SHAPES.oak, overlap: 46 }),
  maple: (seed) => genLeafy(seed, LEAF.maple, { w: 78, h: 80, cell: 7, branches: 5, limb: 25, shape: CANOPY_SHAPES.oak, overlap: 45, outline: [48, 20, 14] }),
  apple: (seed) => genLeafy(seed, LEAF.apple, { w: 72, h: 74, cell: 6, branches: 4, limb: 22, shape: CANOPY_SHAPES.apple, overlap: 42,
    fruit: [[206, 44, 40], [138, 24, 28], [255, 160, 136]] }),
  blossom: (seed) => genLeafy(seed, LEAF.blossom, { w: 76, h: 76, cell: 6, branches: 5, limb: 23, shape: CANOPY_SHAPES.apple, overlap: 42,
    flowers: [255, 248, 252], outline: [70, 30, 52] }),
  birch: (seed) => genLeafy(seed, LEAF.birch, { w: 54, h: 86, cell: 5, branches: 3, limb: 15, shape: CANOPY_SHAPES.birch, overlap: 44 }),
  willow: (seed) => genLeafy(seed, LEAF.willow, { w: 78, h: 84, cell: 6, branches: 4, limb: 22, branchY: 56, shape: CANOPY_SHAPES.willow, droop: true, overlap: 51 }),
  cypress: (seed) => genLeafy(seed, LEAF.cypress, { w: 28, h: 82, cell: 5, shape: CANOPY_SHAPES.cypress, overlap: 3 * T, outline: [8, 22, 16] }),
  jungle: (seed) => genLeafy(seed, LEAF.jungle, { w: 100, h: 92, cell: 8, branches: 6, limb: 30, branchY: 66, shape: CANOPY_SHAPES.jungle, vines: true, overlap: 44 }),
  frostBirch: (seed) => genLeafy(seed, LEAF.frost, { w: 54, h: 86, cell: 5, branches: 3, limb: 15, shape: CANOPY_SHAPES.birch, snow: true, overlap: 44, outline: [30, 46, 54] }),
};

// Coqueiro: folhas compridas em leque que se abrem do topo e caem nas pontas, com cocos
function genPalm(seed) {
  const W=112,H=100,cx=56,cy=42,s=new Sprite(W,H),rnd=mulberry32(seed);
  const pal=[[12,43,35],[17,69,46],[29,101,53],[58,137,57],[103,168,64],[165,199,84]];
  const line=(x,y,ex,ey,color)=>{
    const steps=Math.ceil(Math.max(Math.abs(ex-x),Math.abs(ey-y)));
    for(let n=0;n<=steps;n++){const t=steps?n/steps:0;s.set(Math.round(x+(ex-x)*t),Math.round(y+(ey-y)*t),color);}
  };
  // Quadratic fronds: rising leaves behind and broad hanging leaves in front.
  const fronds=[[-35,-30,-13,-37,1],[34,-32,14,-38,1],[3,-35,-5,-29,1],[-48,-4,-29,-29,1],[48,-1,29,-26,1],[-49,25,-30,-3,0],[48,26,30,-3,0],[-32,43,-17,5,0],[29,45,20,2,0],[-4,47,-12,16,1]];
  for(const [endX,endY,controlX,controlY,back] of fronds){
    const ex=endX+(rnd()-.5)*4,ey=endY+(rnd()-.5)*4;
    for(let k=0;k<=70;k++){
      const t=k/70,x=cx+2*(1-t)*t*controlX+t*t*ex,y=cy+2*(1-t)*t*controlY+t*t*ey;
      const dx=2*(1-t)*controlX+2*t*(ex-controlX),dy=2*(1-t)*controlY+2*t*(ey-controlY);
      const length=Math.hypot(dx,dy)||1,nx=-dy/length,ny=dx/length,width=Math.sin(Math.PI*t)*3.1+.3;
      for(let j=-Math.ceil(width);j<=width;j++)s.set(Math.round(x+nx*j),Math.round(y+ny*j),j<-.8?pal[4-back]:j<.8?pal[5-back]:j>width-1?pal[1]:pal[3-back]);
      if(k>7&&k<66&&k%4===0){
        const feather=Math.sin(Math.PI*t)*8+1;
        for(const side of [-1,1]){
          const fx=x+nx*feather*side+dx/length*3,fy=y+ny*feather*side+dy/length*3+2;
          line(x+nx*side,y+ny*side,fx,fy,pal[side<0?3-back:1]);
          line(x,y,fx-nx*side,fy-1,pal[side<0?5-back:2]);
        }
      }
    }
  }
  // Crownshaft connects to the trunk; coconuts sit in front of the foliage.
  for(let y=cy;y<cy+12;y++)for(let x=cx-4;x<=cx+4;x++)s.set(x,y,x<cx-2?[60,44,29]:x<cx+1?[125,90,46]:[76,53,30]);
  for(const [dx,dy] of [[-5,2],[3,4],[-2,8]])for(let y=-3;y<=3;y++)for(let x=-3;x<=3;x++){
    if(x*x+y*y>10)continue;
    s.set(cx+dx+x,cy+dy+y,x+y<-2?[185,142,72]:x+y>2?[58,43,27]:[121,89,45]);
  }
  const trunk=new Sprite(T,TEX);
  for(let y=0;y<TEX;y++)for(let x=3;x<=12;x++){
    const ring=(y+Math.floor(x*.4))%8;
    trunk.set(x,y,x===3||x===12?[57,38,29]:ring<2?[77,49,33]:ring===2?[184,136,79]:x<7?[155,106,62]:x<10?[123,79,47]:[92,57,37]);
  }
  return {canvas:s.finish([11,36,28]),overlap:H-cy+3,trunk:trunk.finish(null)};
}

// Arbusto seco do deserto: galhos finos e retorcidos
function genDeadBush(seed) {
  const s = new Sprite(16, 12), rnd = mulberry32(seed);
  for (let k = 0; k < 5; k++) {
    let x = 8, y = 11;
    const dir = rnd() * 2 - 1;
    for (let j = 0; j < 5 + rnd() * 6; j++) { s.set(x, y, j < 3 ? [110, 78, 48] : [150, 112, 70]); x += dir * 0.9; y -= 1; }
  }
  return s.finish([54, 36, 22]);
}

function genGrassTuft(seed, greens = [[62, 134, 44], [88, 170, 56], [128, 204, 78]]) {
  const s = new Sprite(16, 12);
  const rnd = mulberry32(seed);
  for (let k = 0; k < 6; k++) {
    let x = 1 + k * 2.4 + rnd();
    const h = 3 + Math.floor(rnd() * 8);
    const lean = rnd() < 0.5 ? -0.25 : 0.25;
    for (let j = 0; j < h; j++) {
      s.set(x, 11 - j, greens[j > h - 3 ? 2 : j > 1 ? 1 : 0]);
      x += lean;
    }
  }
  return s.finish([30, 70, 30]);
}

function genFlower(seed, petal) {
  const s = new Sprite(16, 14);
  const rnd = mulberry32(seed);
  const x = 6 + Math.floor(rnd() * 4), h = 6 + Math.floor(rnd() * 4);
  for (let j = 0; j < h; j++) s.set(x, 13 - j, [70, 140, 50]);
  s.set(x - 1, 11, [88, 170, 56]); s.set(x + 1, 10, [88, 170, 56]);
  const top = 13 - h;
  for (const [dx, dy] of [[0, -1], [-1, 0], [1, 0], [0, 1], [-1, -1], [1, 1], [1, -1], [-1, 1]]) s.set(x + dx, top + dy, (dx + dy) % 2 ? petal : shade(petal, 0.8));
  s.set(x, top, [255, 224, 90]);
  return s.finish([36, 30, 30]);
}

function genBush(seed) {
  const s = new Sprite(20, 12);
  const pal = PALETTES.oak;
  const rnd = mulberry32(seed);
  const blobs = Array.from({ length: 4 }, () => ({ x: 4 + rnd() * 12, y: 7 + rnd() * 2, r: 3 + rnd() * 3 }));
  for (let y = 0; y < 12; y++)
    for (let x = 0; x < 20; x++) {
      const b = blobs.find((b) => Math.hypot(x - b.x, y - b.y) <= b.r);
      if (!b) continue;
      const v = -((x - b.x) * 0.5 + (y - b.y)) / b.r;
      s.set(x, y, pal[v > 0.5 ? 3 : v > 0 ? 2 : 1]);
    }
  return s.finish([20, 44, 22]);
}

function genPebbles(seed) {
  const s = new Sprite(16, 8);
  const rnd = mulberry32(seed);
  for (let i = 0; i < 3; i++) pebble(s, 3 + rnd() * 10, 6, 1 + rnd() * 1.3, [128, 124, 132]);
  return s.finish([40, 38, 44]);
}

function genMushroom(seed) {
  const s = new Sprite(16, 12);
  const rnd = mulberry32(seed);
  const cap = rnd() < 0.5 ? [200, 60, 50] : [150, 110, 200];
  const x = 8;
  for (let y = 7; y < 12; y++) { s.set(x, y, [236, 220, 190]); s.set(x + 1, y, [206, 188, 156]); }
  for (let y = 3; y < 8; y++)
    for (let dx = -4; dx <= 5; dx++) {
      if (Math.abs(dx - 0.5) > (y - 2) * 1.3) continue;
      s.set(x + dx, y, y === 7 ? shade(cap, 0.7) : dx < 0 ? shade(cap, 1.15) : cap);
    }
  s.set(x - 1, 4, [250, 240, 230]); s.set(x + 2, 5, [250, 240, 230]);
  return s.finish([40, 24, 28]);
}

function genRoots(seed) {
  const s = new Sprite(16, 14);
  const rnd = mulberry32(seed);
  for (let k = 0; k < 3; k++) {
    let x = 2 + rnd() * 12;
    const len = 4 + Math.floor(rnd() * 10);
    for (let y = 0; y < len; y++) {
      s.set(x, y, y % 3 ? [104, 72, 46] : [128, 90, 58]);
      if (rnd() < 0.3) x += rnd() < 0.5 ? -1 : 1;
    }
  }
  return s.finish([40, 26, 18]);
}

// Espeto de rocha com volume: estalactite pendurada (hang) ou estalagmite de pé. Face da luz à
// esquerda com um fio de brilho, sombra à direita, anéis de crescimento, borda irregular,
// um calombo de pedra onde ele gruda e, na ponta da estalactite, uma gota d'água.
//   pal: { hi, light, mid, dark, deep } (claro -> escuro)   spikes: [{ x, len, r, tilt }]
const SPIKE_WATER = [[120, 176, 214], [236, 248, 255]];
function paintRockSpikes(s, H, spikes, pal, rnd, hang, drops = hang) {
  const ramp = [pal.hi, pal.light, pal.mid, pal.dark, pal.deep];
  const base = hang ? 0 : H - 1, dir = hang ? 1 : -1;
  const px = (x, y, c) => s.set(Math.round(x), y, c);
  for (const sp of spikes) {
    const rings = 4 + Math.floor(rnd() * 2), ringAt = Math.floor(rnd() * rings);
    let wob = 0;
    for (let k = 0; k < sp.len; k++) {
      const u = k / sp.len, y = base + dir * k, cx = sp.x + sp.tilt * k;
      wob = clamp(wob + (rnd() - 0.5) * 0.3, -0.3, 0.3);                       // borda irregular
      const half = Math.max(0.35, sp.r * (hang ? Math.pow(1 - u, 0.8) : 1 - Math.pow(u, 0.7)) + wob * (1 - u));
      const ring = k % rings === ringAt && u < 0.85;                            // anel mais escuro
      for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half - 0.01); x++) {
        const rel = (x + 0.5 - cx) / Math.max(0.6, half);
        let tone = rel < -0.6 ? 1 : rel < -0.05 ? 2 : rel < 0.55 ? 3 : 4;
        if (rel < -0.6 && k % 5 < 3 && u < 0.8) tone = 0;                        // fio de brilho
        if (ring && tone >= 2 && tone < 4 && Math.abs(rel) < 0.8) tone++;   // o anel só marca o miolo, não a silhueta
        px(x, y, ramp[tone]);
      }
      // nódulos pequenos na lateral
      if (u > 0.15 && u < 0.7 && rnd() < 0.12) px(cx + (rnd() < 0.5 ? -half - 1 : half + 1), y, ramp[rnd() < 0.5 ? 2 : 3]);
    }
    // calombo onde o espeto gruda na pedra
    for (let dx = -sp.r - 1; dx <= sp.r + 1; dx++) {
      const x = sp.x + dx, t = Math.abs(dx) > sp.r ? 3 : dx < 0 ? 1 : 2;
      px(x, base, ramp[t]);
      if (Math.abs(dx) <= sp.r) px(x, base + dir, ramp[Math.min(4, t + (dx > 0 ? 1 : 0))]);
    }
    // gota pendurada na ponta
    if (drops && sp.len > 5) {
      const tx = sp.x + sp.tilt * (sp.len - 1), ty = base + dir * (sp.len + 1);
      if (ty >= 0 && ty < H) { px(tx, ty, SPIKE_WATER[0]); if (ty - 1 >= 0) px(tx, ty - 1, SPIKE_WATER[1]); }
    }
  }
}
const SPIKE_STONE = { hi: [206, 206, 214], light: [168, 168, 178], mid: [138, 138, 150], dark: [106, 106, 118], deep: [78, 78, 90] };
function genStalactite(seed) {
  const s = new Sprite(16, 14);
  const rnd = mulberry32(seed);
  const cx = 6 + rnd() * 4, len = 8 + Math.floor(rnd() * 5);
  const spikes = [{ x: cx, len, r: 2.4 + rnd() * 0.6, tilt: (rnd() - 0.5) * 0.12 }];
  if (rnd() < 0.8) spikes.push({ x: cx + (rnd() < 0.5 ? -4 : 4), len: 4 + Math.floor(rnd() * 3), r: 1.3, tilt: (rnd() - 0.5) * 0.2 });
  paintRockSpikes(s, 14, spikes, SPIKE_STONE, rnd, true);
  return s.finish([44, 44, 54]);
}

// Acácia da savana: galhos abertos e copa achatada em camadas
function genAcacia(seed) {
  const W = 72, H = 30, cx = W / 2, s = new Sprite(W, H), rnd = mulberry32(seed);
  const pal = [[70, 94, 38], [96, 126, 50], [128, 156, 64], [166, 186, 88]], bark = [[70, 48, 30], [104, 72, 44]];
  for (const [dx, y1] of [[-18, 12], [-8, 9], [9, 10], [19, 13]]) {
    for (let k = 0; k <= 14; k++) {
      const x = cx + (dx * k) / 14, y = H - 1 - ((H - 1 - y1) * k) / 14;
      s.set(x, y, bark[1]); s.set(x + 1, y, bark[0]);
    }
  }
  const blobs = [{ x: cx, y: 9, rx: 30, ry: 5.5 }, { x: cx - 17, y: 11, rx: 14, ry: 4.5 }, { x: cx + 18, y: 12, rx: 13, ry: 4.5 }, { x: cx + 3 + rnd() * 4, y: 6, rx: 18, ry: 4 }];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const b = blobs.find((o) => ((x - o.x) / o.rx) ** 2 + ((y - o.y) / o.ry) ** 2 <= 1);
      if (!b) continue;
      const v = -((y - b.y) / b.ry) * 0.6 + (hash2(x >> 1, y, seed) - 0.5) * 0.6;
      s.set(x, y, pal[v > 0.35 ? 3 : v > -0.05 ? 2 : v > -0.4 ? 1 : 0]);
    }
  return { canvas: s.finish([34, 46, 22]), overlap: 4 };
}

const DECOR = (() => {
  const d = {
    // Árvores da floresta, por espécie (cada seed dá uma copa diferente)
    pines: [genPine(11, PALETTES.pine), genPine(12, PALETTES.pine), genPine(13, PALETTES.pine, false, { tiers: 6, spread: 3.4 }),
      genPine(14, PALETTES.redPine), genPine(15, PALETTES.pine, false, { tiers: 7, spread: 2.8 })],
    oaks: [21, 22, 23].map((i) => TREE_KINDS.oak(i)),
    maples: [24, 25].map((i) => TREE_KINDS.maple(i)),
    apples: [26, 27].map((i) => TREE_KINDS.apple(i)),
    blossoms: [28, 29].map((i) => TREE_KINDS.blossom(i)),
    birches: [61, 62].map((i) => TREE_KINDS.birch(i)),
    willows: [63, 64].map((i) => TREE_KINDS.willow(i)),
    cypresses: [65, 66].map((i) => TREE_KINDS.cypress(i)),
    grass: [1, 2, 3, 4].map((i) => genGrassTuft(100 + i)),
    flowers: [[230, 80, 80], [250, 210, 80], [150, 120, 240], [245, 245, 245]].map((c, i) => genFlower(200 + i, c)),
    bushes: [1, 2].map((i) => genBush(300 + i)),
    pebbles: [1, 2, 3].map((i) => genPebbles(400 + i)),
    mushrooms: [1, 2].map((i) => genMushroom(500 + i)),
    roots: [1, 2, 3].map((i) => genRoots(600 + i)),
    stalactites: [1, 2, 3].map((i) => genStalactite(700 + i)),
    // Biomas
    snowPines: [31, 32, 33].map((i) => genPine(i, PALETTES.frost, true)),
    frostBirches: [34, 35].map((i) => TREE_KINDS.frostBirch(i)),
    jungleTrees: [41, 42, 43].map((i) => TREE_KINDS.jungle(i)),
    palms: [44, 45, 46].map((i) => genPalm(i)),
    jungleGrass: [1, 2, 3].map((i) => genGrassTuft(800 + i, [[30, 100, 44], [52, 146, 60], [96, 196, 88]])),
    deadBushes: [1, 2].map((i) => genDeadBush(900 + i)),
    acacias: [51, 52, 53].map((i) => genAcacia(i)),
    dryGrass: [1, 2, 3, 4].map((i) => genGrassTuft(1000 + i, [[150, 120, 56], [196, 164, 82], [232, 208, 124]])),
  };
  return d;
})();

const pickFrom = (list, h) => list[Math.floor(h * 997) % list.length];

// Decoração em cima de um bloco sólido (o tile acima precisa ser ar)
function decorAbove(t, x, y, underground, deep = underground) {
  const h = hash2(x, y, 777);
  if(t===TILE.SAKURA_GRASS)return h<.67?pickFrom(sakuraGrassSprites,h*7.3):null;
  if (t === TILE.GRASS) {
    if (h < 0.42) return pickFrom(DECOR.grass, h * 7.3);
    if (h < 0.52) return pickFrom(DECOR.flowers, h * 5.1);
    if (h < 0.58) return pickFrom(DECOR.bushes, h * 3.7);
    return null;
  }
  if (t === TILE.JUNGLE_GRASS) {
    if (h < 0.6) return pickFrom(DECOR.jungleGrass, h * 7.3);
    if (h < 0.7) return pickFrom(DECOR.bushes, h * 3.7);
    return null;
  }
  if (t === TILE.DRY_GRASS) {
    if (h < 0.55) return pickFrom(DECOR.dryGrass, h * 7.3);
    if (h < 0.6) return pickFrom(DECOR.deadBushes, h * 5.3);
    return null;
  }
  if (t === TILE.SAND && !underground && h < 0.1) return pickFrom(DECOR.deadBushes, h * 5.3);
  if (t === TILE.STONE || t === TILE.DIRT || t === TILE.SAND || t === TILE.MUD) {
    if (deep && h < 0.035) return pickFrom(DECOR.mushrooms, h * 9.1); // cogumelo só no fundo
    if (h < 0.18) return pickFrom(DECOR.pebbles, h * 4.3);
  }
  return null;
}

// Decoração pendurada embaixo de um bloco (o tile abaixo precisa ser ar)
function decorBelow(t, x, y) {
  const h = hash2(x, y, 991);
  if (t === TILE.DIRT && h < 0.28) return pickFrom(DECOR.roots, h * 6.7);
  if (t === TILE.STONE && h < 0.16) return pickFrom(DECOR.stalactites, h * 8.3);
  return null;
}

// Espécie de cada árvore: sorteada pela coluna, então a mesma árvore sempre tem a mesma copa
const FOREST_MIX = [
  [0.32, 'pines'], [0.54, 'oaks'], [0.66, 'birches'], [0.74, 'maples'], [0.82, 'apples'],
  [0.89, 'blossoms'], [0.95, 'willows'], [1, 'cypresses'],
];
function canopyFor(x, biome, worldSeed=0) {
  if(typeof organicCanopyFor==='function')return organicCanopyFor(x,biome,worldSeed);
  const h = hash2(x, 0, 4242), h2 = hash2(x, 1, 4242);
  if (biome === BIOME.SNOW) return h < 0.8 ? pickFrom(DECOR.snowPines, h2) : pickFrom(DECOR.frostBirches, h2);
  if (biome === BIOME.JUNGLE) return h < 0.7 ? pickFrom(DECOR.jungleTrees, h2) : pickFrom(DECOR.palms, h2);
  if (biome === BIOME.SAVANNA) return pickFrom(DECOR.acacias, h2);
  if (biome === BIOME.OCEAN) return pickFrom(DECOR.palms, h2); // coqueiros da praia
  for (const [lim, kind] of FOREST_MIX) if (h < lim) return pickFrom(DECOR[kind], h2);
  return pickFrom(DECOR.oaks, h2);
}
