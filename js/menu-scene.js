'use strict';

// ---------------------------------------------------------------------------
// Cena de apresentação do menu principal.
// Um diorama montado com os mesmos blocos, árvores e sprites do jogo: platô com
// a cabana e a fogueira acesa, cachoeira caindo do paredão, caverna de cristais
// atrás da água e um vale enevoado ao fundo.
// As camadas paradas são geradas uma vez e guardadas em canvas; a cada quadro só
// se redesenha o que se mexe (nuvens, raios de sol, copas, água, fogo, pássaros
// e partículas). Nada aqui toca o mundo, a física ou o save.
// ---------------------------------------------------------------------------

const MENU_W = 640, MENU_H = 360;      // arte base 16:9, ampliada com pixels quadrados
const MENU_ROWS = 24, MENU_COLS = 40;
const MENU_SUN = { x: 472, y: 92 };
const MENU_FALL = { x: 487, w: 18, top: 222, bottom: 336 }; // cachoeira
const MENU_POOL_Y = 336;               // superfície do lago de baixo

// Linha do primeiro bloco sólido de cada coluna de tiles
function menuGroundRow(c) {
  if (c < 4) return 16;
  if (c < 6) return 17;
  if (c < 8) return 18;    // beirada rasa do laguinho
  if (c < 12) return 19;   // fundo da bacia
  if (c < 13) return 18;
  if (c < 15) return 17;
  if (c < 18) return 16;
  if (c < 20) return 15;
  if (c < 31) return 14;   // platô da cabana
  return 21;               // terraço lá embaixo, ao pé do paredão
}
// Galerias escavadas (os cantos ficam fechados, para a sala não virar um retângulo)
const MENU_CAVES = [
  { c0: 26, c1: 30, r0: 17, r1: 20, kinds: ['crystal', 'mushroom', 'crystal', 'moss'] }, // atrás da cachoeira
  { c0: 2, c1: 7, r0: 19, r1: 21, kinds: ['mushroom', 'fern', 'mushroom', 'rocks'] },    // embaixo do campo
];
const menuCaveCell = (c, r) => MENU_CAVES.some((k) =>
  c >= k.c0 && c <= k.c1 && r >= k.r0 && r <= k.r1 &&
  (Math.min(c - k.c0, k.c1 - c) > 0 || Math.min(r - k.r0, k.r1 - r) > 0));
const menuWaterCell = (c, r) => (c >= 6 && c <= 12 && r >= 17 && r < menuGroundRow(c)) || (c >= 31 && c <= 37 && r >= 21);

let menuArt = null;

// ---------------------------------------------------------------------------
// Ferramentas de desenho em pixel
// ---------------------------------------------------------------------------
function menuPixelTools(p) {
  p.imageSmoothingEnabled = false;
  p.rect2 = (x, y, w, h, col) => { p.fillStyle = col; p.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  // Círculo chapado em degraus de 2px: mantém a silhueta quadriculada
  p.disc = (cx, cy, r, col) => {
    p.fillStyle = col;
    for (let y = -r; y <= r; y += 2) {
      const dx = Math.floor(Math.sqrt(Math.max(0, r * r - y * y)));
      p.fillRect(Math.round(cx - dx), Math.round(cy + y), dx * 2, 2);
    }
  };
  return p;
}

function menuPainter(w, h) {
  const c = makeCanvas(w, h);
  return { c, p: menuPixelTools(c.getContext('2d')) };
}

// Nuvem em blocos de discos, com base escura e topo aceso pelo sol
function menuCloud(p, cx, cy, scale, rnd, alpha) {
  const lumps = [];
  for (let i = 0, n = 5 + Math.floor(rnd() * 3); i < n; i++)
    lumps.push([cx + (i - n / 2) * 11 * scale + rnd() * 6, cy + (rnd() - 0.5) * 5 * scale, (7 + rnd() * 9) * scale]);
  p.globalAlpha = alpha;
  for (const [x, y, r] of lumps) p.disc(x, y + r * 0.42, r, '#78889a');
  for (const [x, y, r] of lumps) p.disc(x, y, r, '#bfc8d0');
  for (const [x, y, r] of lumps) p.disc(x + r * 0.2, y - r * 0.34, r * 0.66, '#efe8d8');
  for (const [x, y, r] of lumps) p.disc(x + r * 0.45, y - r * 0.5, r * 0.3, '#fff6dd');
  p.globalAlpha = 1;
}

// ---------------------------------------------------------------------------
// Camadas paradas
// ---------------------------------------------------------------------------
function menuSkyLayer() {
  const { c, p } = menuPainter(MENU_W, MENU_H);
  const sky = p.createLinearGradient(0, 0, 0, MENU_H);
  sky.addColorStop(0, '#16222f');
  sky.addColorStop(0.24, '#2c4352');
  sky.addColorStop(0.46, '#5b7671');
  sky.addColorStop(0.62, '#9fa686');
  sky.addColorStop(0.76, '#e4c288');
  sky.addColorStop(1, '#f6e2ab');
  p.fillStyle = sky; p.fillRect(0, 0, MENU_W, MENU_H);
  const halo = p.createRadialGradient(MENU_SUN.x, MENU_SUN.y, 6, MENU_SUN.x, MENU_SUN.y, 190);
  halo.addColorStop(0, 'rgba(255,244,206,.95)');
  halo.addColorStop(0.12, 'rgba(252,222,150,.6)');
  halo.addColorStop(0.42, 'rgba(240,196,118,.2)');
  halo.addColorStop(1, 'rgba(232,186,110,0)');
  p.fillStyle = halo; p.fillRect(MENU_SUN.x - 190, MENU_SUN.y - 190, 380, 380);
  p.disc(MENU_SUN.x, MENU_SUN.y, 17, '#fff3c4');
  p.disc(MENU_SUN.x, MENU_SUN.y, 12, '#fffcea');
  return c;
}

// Tira de nuvens que dá a volta sem emenda (desenhada duas vezes na horizontal)
function menuCloudLayer(seed, scale, alpha, count) {
  const { c, p } = menuPainter(MENU_W, 170);
  const rnd = mulberry32(seed);
  for (let i = 0; i < count; i++) {
    const x = rnd() * MENU_W, y = 24 + rnd() * 98, s = scale * (0.7 + rnd() * 0.6);
    menuCloud(p, x, y, s, mulberry32(seed + i * 17), alpha);
    if (x > MENU_W - 80) menuCloud(p, x - MENU_W, y, s, mulberry32(seed + i * 17), alpha);
    else if (x < 80) menuCloud(p, x + MENU_W, y, s, mulberry32(seed + i * 17), alpha);
  }
  return c;
}

// Serras ao fundo e o vale que aparece no rasgo depois do paredão
function menuRidgeLayer() {
  const { c, p } = menuPainter(MENU_W, MENU_H);
  const rnd = mulberry32(4207);
  const valley = p.createLinearGradient(0, 196, 0, MENU_H);
  valley.addColorStop(0, '#8ea289');
  valley.addColorStop(0.5, '#b0b28c');
  valley.addColorStop(1, '#d9c294');
  p.fillStyle = valley; p.fillRect(0, 196, MENU_W, MENU_H - 196);
  for (let i = 0; i < 3; i++) {                       // lombadas do vale, cada vez mais claras
    const base = 232 + i * 36, col = ['#74897a', '#8d9a83', '#a8a88a'][i];
    for (let x = 0; x < MENU_W; x += 2) {
      const y = Math.floor(base + noise1(x * 0.009, 70 + i) * (26 - i * 6) + noise1(x * 0.035, 20 + i) * 4);
      p.rect2(x, y, 2, MENU_H - y, col);
      if (i < 2 && rnd() < 0.13) p.rect2(x, y - (4 + rnd() * 8), 2, 9, col); // mata distante
    }
    const fade = p.createLinearGradient(0, base - 30, 0, base + 46);  // neblina engolindo o pé da lombada
    fade.addColorStop(0, 'rgba(226,218,186,0)');
    fade.addColorStop(1, `rgba(228,216,182,${0.34 - i * 0.08})`);
    p.fillStyle = fade; p.fillRect(0, base - 30, MENU_W, 76);
  }
  const ridgeY = (x, layer) => Math.floor(142 + layer * 28 + noise1(x * 0.0085 + layer * 3, 48 + layer) * (44 - layer * 11) + noise1(x * 0.04, 90 + layer) * 5);
  for (let layer = 0; layer < 3; layer++) {
    const col = ['#4d6a79', '#42655f', '#35564d'][layer];
    for (let x = 0; x < MENU_W; x += 2) {
      const y = ridgeY(x, layer);
      p.rect2(x, y, 2, 264 - y, col);
      if (layer === 0 && y < 122) p.rect2(x, y, 2, 3 + rnd() * 4, '#8298a3'); // neve nos picos
    }
    if (layer) for (let x = 0; x < MENU_W; x += 7 + Math.floor(rnd() * 6)) { // pinheirinhos na crista
      const y = ridgeY(x, layer), h = 9 + rnd() * 13, w = 3 + rnd() * 3;
      p.fillStyle = layer === 1 ? '#32544f' : '#27463e';
      p.beginPath(); p.moveTo(Math.round(x), Math.round(y - h)); p.lineTo(Math.round(x + w), Math.round(y + 2)); p.lineTo(Math.round(x - w), Math.round(y + 2)); p.fill();
    }
    const band = p.createLinearGradient(0, 150 + layer * 28, 0, 186 + layer * 28);
    band.addColorStop(0, 'rgba(228,208,162,0)');
    band.addColorStop(1, `rgba(228,208,162,${0.13 + layer * 0.06})`);
    p.fillStyle = band; p.fillRect(0, 150 + layer * 28, MENU_W, 36);
  }
  const haze = p.createLinearGradient(0, 168, 0, 250);
  haze.addColorStop(0, 'rgba(244,218,160,0)');
  haze.addColorStop(0.55, 'rgba(244,216,152,.3)');
  haze.addColorStop(1, 'rgba(238,204,142,.04)');
  p.fillStyle = haze; p.fillRect(0, 168, MENU_W, 82);
  return c;
}

// Faixa de névoa que escorre devagar por cima do vale
function menuMistLayer() {
  const { c, p } = menuPainter(MENU_W, 90);
  const rnd = mulberry32(911);
  for (let i = 0; i < 26; i++) {
    const x = rnd() * MENU_W, y = 10 + rnd() * 62, w = 40 + rnd() * 110, h = 3 + rnd() * 7;
    const col = `rgba(240,232,208,${0.05 + rnd() * 0.09})`;
    p.rect2(x, y, w, h, col);
    if (x + w > MENU_W) p.rect2(x - MENU_W, y, w, h, col);
  }
  return c;
}

// ---------------------------------------------------------------------------
// Terreno, cabana e caverna — com os blocos de verdade do jogo
// ---------------------------------------------------------------------------
// Luz de fim de tarde por cima do que já foi desenhado. (ox, oy) é a posição do canvas
// dentro da cena, para um pedaço avulso receber exatamente o mesmo tom do terreno.
function menuWarmGrade(p, ox, oy, w, h) {
  const g = p.createLinearGradient(MENU_W - ox, -oy, 120 - ox, MENU_H - oy);
  g.addColorStop(0, 'rgba(255,214,140,.34)');
  g.addColorStop(0.45, 'rgba(255,196,124,.12)');
  g.addColorStop(1, 'rgba(24,40,58,.4)');
  p.globalCompositeOperation = 'source-atop';
  p.fillStyle = g; p.fillRect(0, 0, w, h);
  p.globalCompositeOperation = 'source-over';
}

function menuTerrainGrid() {
  const grid = [];
  for (let r = 0; r < MENU_ROWS; r++) grid.push(new Array(MENU_COLS).fill(0));
  for (let c = 0; c < MENU_COLS; c++) {
    const s = menuGroundRow(c);
    for (let r = s; r < MENU_ROWS; r++) {
      if (menuCaveCell(c, r) || menuWaterCell(c, r)) continue;
      let t = menuWaterCell(c, r - 1) ? TILE.SAND : r === s ? TILE.GRASS : r < s + 3 ? TILE.DIRT : TILE.STONE;
      if (t === TILE.STONE) {   // veios e bolsões quebram a monotonia da rocha
        const v = noise2(c * 0.6, r * 0.75, 55);
        t = v > 0.84 ? TILE.COAL_ORE : v < 0.12 ? TILE.IRON_ORE : noise2(c * 0.34, r * 0.4, 88) > 0.75 ? TILE.DIRT : t;
      }
      grid[r][c] = t;
    }
  }
  return grid;
}

// Cabana de enxaimel no alto do platô
function menuCabin(p, blocks, flat) {
  const X0 = 320, X1 = 432, CX = 376, BASE = 224, EAVE = 172;
  // Preenche uma área com a textura do material, sem as bordas irregulares do bloco
  const fill = (t, x, y, w, h) => {
    p.save(); p.beginPath(); p.rect(x, y, w, h); p.clip();
    for (let py = Math.floor(y / T) * T; py < y + h; py += T)
      for (let px = Math.floor(x / T) * T; px < x + w; px += T) {
        const vx = (px / T) & 3, vy = (py / T) & 3;
        if (blocks[t]) p.drawImage(blocks[t], (vy * 4 + vx) * SPR + MARGIN, MARGIN, T, T, px, py, T, T);
        else if (flat[t]) p.drawImage(flat[t], 0, vy * T, T, T, px, py, T, T);
      }
    p.restore();
  };
  fill(TILE.STONE, X0 - 6, BASE - 10, X1 - X0 + 12, 12);          // alicerce
  p.rect2(X0 - 6, BASE - 12, X1 - X0 + 12, 2, '#252c2d');
  fill(TILE.PLANKS, X0, EAVE, X1 - X0, BASE - EAVE - 10);         // paredes
  const beam = '#3a2c1e', beamHi = '#5a4630';
  for (const bx of [X0, X0 + 30, CX - 3, X1 - 33, X1 - 3]) {
    p.rect2(bx, EAVE, 3, BASE - EAVE - 10, beam); p.rect2(bx, EAVE, 1, BASE - EAVE - 10, beamHi);
  }
  p.rect2(X0, EAVE, X1 - X0, 3, beam); p.rect2(X0, EAVE + 25, X1 - X0, 3, beam); p.rect2(X0, BASE - 13, X1 - X0, 3, beam);
  for (const wx of [X0 + 9, X1 - 27]) {                            // janelas acesas
    p.rect2(wx - 2, EAVE + 32, 22, 22, beam);
    const g = p.createLinearGradient(0, EAVE + 34, 0, EAVE + 52);
    g.addColorStop(0, '#ffdf9a'); g.addColorStop(1, '#d99845');
    p.fillStyle = g; p.fillRect(wx, EAVE + 34, 18, 18);
    p.rect2(wx + 8, EAVE + 34, 2, 18, '#6b5233'); p.rect2(wx, EAVE + 42, 18, 2, '#6b5233');
    p.rect2(wx, EAVE + 34, 18, 2, 'rgba(255,255,230,.5)');
  }
  p.rect2(CX - 11, EAVE + 26, 22, BASE - EAVE - 26, beam);         // porta
  fill(TILE.TRUNK, CX - 9, EAVE + 28, 18, BASE - EAVE - 28);
  p.rect2(CX - 9, EAVE + 28, 18, 2, 'rgba(255,226,170,.26)');
  p.rect2(CX + 4, EAVE + 44, 3, 3, '#f0cb74');
  p.rect2(CX - 15, BASE - 4, 30, 4, '#5c5e58'); p.rect2(CX - 12, BASE, 24, 4, '#4a4c47');
  for (let i = 0; i < 9; i++) {                                    // telhado, fiada por fiada
    const y = EAVE - i * 4, half = Math.round(70 - i * 7.6);
    p.rect2(CX - half, y - 5, half * 2, 5, i % 2 ? '#5d4a33' : '#6d573b');
    p.rect2(CX - half, y - 5, half * 2, 1, i % 2 ? '#7d6647' : '#8a7150');
    p.rect2(CX - half, y - 1, half * 2, 1, '#2e2419');
  }
  p.rect2(CX - 76, EAVE - 2, 152, 4, '#443423'); p.rect2(CX - 76, EAVE - 2, 152, 1, '#6a563c');
  p.rect2(CX - 6, EAVE - 40, 12, 5, '#7b6446');
  fill(TILE.STONE, 404, EAVE - 44, 18, 30);                        // chaminé
  p.rect2(402, EAVE - 47, 22, 4, '#565a58'); p.rect2(402, EAVE - 47, 22, 1, '#7d837e');
  p.rect2(CX + 18, EAVE + 30, 2, 6, '#3a2c1e');                    // lampião na parede
  p.rect2(CX + 15, EAVE + 36, 8, 9, '#3a2c1e'); p.rect2(CX + 17, EAVE + 38, 4, 5, '#ffd88a');
  if (flat[TILE.FENCE]) for (let i = 0; i < 3; i++) p.drawImage(flat[TILE.FENCE], 0, 0, T, T, 440 + i * 16, BASE - 16, T, T);
  // O barril fica no degrau à esquerda da casa, que é um tile mais baixo que o platô
  if (flat[TILE.BARREL]) p.drawImage(flat[TILE.BARREL], 0, 0, T, T, 304, menuGroundRow(19) * T - T, T, T);
}

function buildMenuArt() {
  const { blocks, flat, walls } = renderer.tex;
  const grid = menuTerrainGrid();
  const solid = (c, r) => (r >= MENU_ROWS ? true : r < 0 ? false : grid[r][clamp(c, 0, MENU_COLS - 1)] > 0);
  const { c: ground, p } = menuPainter(MENU_W, MENU_H);
  const rnd = mulberry32(237);

  for (let r = 0; r < MENU_ROWS; r++)                              // fundo de pedra das galerias
    for (let c = 0; c < MENU_COLS; c++) {
      if (!menuCaveCell(c, r)) continue;
      if (walls && walls[WALL.STONE]) p.drawImage(walls[WALL.STONE], (c & 3) * T, (r & 3) * T, T, T, c * T, r * T, T, T);
      else p.rect2(c * T, r * T, T, T, '#14201f');
      p.rect2(c * T, r * T, T, T, 'rgba(6,16,20,.5)');             // o fundo afunda no escuro
      if (!menuCaveCell(c, r - 1)) p.rect2(c * T, r * T, T, 5, 'rgba(4,10,12,.5)'); // sombra do teto
    }
  for (let r = 0; r < MENU_ROWS; r++)                              // água parada
    for (let c = 0; c < MENU_COLS; c++) {
      if (!menuWaterCell(c, r)) continue;
      const deep = menuWaterCell(c, r - 1);
      p.rect2(c * T, r * T, T, T, deep ? '#265a64' : '#3d818a');
      if (!deep) {                                                 // raso mais claro junto às margens
        if (!menuWaterCell(c - 1, r)) p.rect2(c * T, r * T, 5, T, '#57a09f');
        if (!menuWaterCell(c + 1, r)) p.rect2(c * T + T - 5, r * T, 5, T, '#57a09f');
        p.rect2(c * T, r * T, T, 2, '#7cc0b4');
      }
    }
  for (let r = 0; r < MENU_ROWS; r++)                              // blocos com borda irregular
    for (let c = 0; c < MENU_COLS; c++) {
      const t = grid[r][c];
      if (!t || !blocks[t]) continue;
      const mask = (solid(c, r - 1) ? 0 : 1) | (solid(c + 1, r) ? 0 : 2) | (solid(c, r + 1) ? 0 : 4) | (solid(c - 1, r) ? 0 : 8);
      p.drawImage(blocks[t], ((r & 3) * 4 + (c & 3)) * SPR, mask * SPR, SPR, SPR, c * T - MARGIN, r * T - MARGIN, SPR, SPR);
    }
  for (let c = 0; c < MENU_COLS; c++)                              // leito afundado na sombra da água
    for (let r = 0; r < MENU_ROWS; r++) {
      if (!menuWaterCell(c, r) || menuWaterCell(c, r + 1)) continue;
      p.rect2(c * T, (r + 1) * T, T, 9, 'rgba(18,64,74,.5)');
      p.rect2(c * T, (r + 1) * T, T, 3, 'rgba(12,44,54,.45)');
      if ((c & 1) === 0) p.drawImage(DECOR.pebbles[c % 3], c * T + 2, (r + 1) * T - DECOR.pebbles[c % 3].height + 4);
    }
  p.rect2(452, 220, 46, 4, '#4e8e90');                             // riacho que alimenta a queda
  p.rect2(456, 220, 38, 1, '#a9d8cf');
  for (const [x, h] of [[512, 26], [532, 20], [552, 30], [578, 22], [600, 28], [624, 19]]) {
    p.fillStyle = '#28433f';                                       // mata da outra margem, lá no fundo
    p.beginPath(); p.moveTo(x, 330 - h); p.lineTo(x + 5, 332); p.lineTo(x - 5, 332); p.fill();
    p.rect2(x - 1, 330, 2, 4, '#28433f');
  }
  const bank = p.createLinearGradient(0, 312, 0, 338);             // neblina escondendo o pé da mata
  bank.addColorStop(0, 'rgba(226,216,186,0)');
  bank.addColorStop(1, 'rgba(228,214,180,.5)');
  p.fillStyle = bank; p.fillRect(496, 312, MENU_W - 496, 26);

  // A mesma arte procedural do mundo, com sementes fixas para o diorama.
  // Madeira fica na camada parada; somente a folhagem responde ao vento.
  const trees = [[2,16,6,'oak',713],[15,16,6,'maple',3464],[29,14,7,'oak',1630]].map(([c,r,h,kind,seed],i)=>{
    const t=generateOrganicCanopy(seed,kind),trunk=organicTrunkFor(t,h*T);
    const x=c*T+T/2,top=(r-h)*T,cx=Math.round(x-t.canvas.width/2),cy=top+t.overlap-t.canvas.height;
    p.drawImage(trunk,Math.round(x-trunk.width/2),top);
    p.drawImage(t.woodCanvas,cx,cy);
    const {c:leaves,p:lp}=menuPainter(t.leafCanvas.width,t.leafCanvas.height);
    lp.drawImage(t.leafCanvas,0,0);menuWarmGrade(lp,cx,cy,leaves.width,leaves.height);
    return {leaves,x:cx,y:cy,ph:i*2.1,flex:t.leafCanvas.envFlex};
  });
  menuCabin(p, blocks, flat);

  const glows = [];                                                // cristais, cogumelos e raízes
  for (const k of MENU_CAVES) {
    const floor = (k.r1 + 1) * T, top = k.r0 * T;
    for (let x = k.c0 * T + 14; x < k.c1 * T; x += 13 + Math.floor(rnd() * 9)) {
      const d = environmentSprite(k.kinds[Math.floor(rnd() * k.kinds.length)], Math.floor(rnd() * 4));
      p.drawImage(d, x, floor - d.height);
      if (d.envGlow) glows.push({ x: x + 10, y: floor - d.height / 2, r: 28, c: d.envGlow.join(',') });
    }
    for (let x = k.c0 * T + 18; x < k.c1 * T; x += 17 + Math.floor(rnd() * 13))
      p.drawImage(environmentSprite(rnd() < 0.45 ? 'root' : 'stalactite', Math.floor(rnd() * 4)), x, top);
  }

  menuWarmGrade(p, 0, 0, MENU_W, MENU_H);                          // luz dourada do fim de tarde

  const plants = [];                                               // mato fica fora do cache: balança
  for (let x = 0; x < MENU_W; x += 6 + Math.floor(rnd() * 5)) {
    const roll = rnd();
    const d = roll < 0.16 ? DECOR.flowers[Math.floor(rnd() * 4)] : roll < 0.26 ? DECOR.bushes[Math.floor(rnd() * 2)] : DECOR.grass[Math.floor(rnd() * 4)];
    // O tufo inteiro precisa pisar no mesmo degrau, senão metade dele fica no ar
    const c0 = Math.floor((x + 2) / T), c1 = Math.floor((x + d.width - 3) / T), r = menuGroundRow(c0);
    if (r !== menuGroundRow(c1)) continue;
    if (menuWaterCell(c0, r - 1) || menuCaveCell(c0, r) || (x > 292 && x < 452) || (c0 >= 31 && c1 <= 37)) continue;
    plants.push({ d, x, y: r * T - d.height + 2, ph: rnd() * 6.3, flex: roll < 0.26 ? 0.5 : 1 });
  }
  for (const x of [86, 104, 192, 206]) {                           // juncos: fundo do lago ou margem
    const d = environmentSprite('reed', x % 4), c = Math.floor((x + 8) / T);
    plants.push({ d, x, y: menuGroundRow(c) * T - d.height, ph: rnd() * 6.3, flex: 1.4 });
  }

  return {
    sky: menuSkyLayer(), ridge: menuRidgeLayer(), mist: menuMistLayer(),
    clouds: menuCloudLayer(517, 1, 0.9, 7), cloudsFar: menuCloudLayer(913, 0.6, 0.45, 9),
    ground, plants, trees, glows, rayBuf: null, raysAt: -1,
    stars: Array.from({ length: 26 }, () => ({ x: rnd() * MENU_W, y: rnd() * 84, ph: rnd() * 6.3 })),
    birds: Array.from({ length: 5 }, (_, i) => ({ off: i * 0.06, dy: (i % 2 ? -1 : 1) * (4 + i * 2), sp: 0.024 + (i % 2) * 0.001 })),
    fire: fireLook(mulberry32(31), 0.7, 'blaze'),
  };
}

// ---------------------------------------------------------------------------
// Camadas vivas
// ---------------------------------------------------------------------------
// Planta que se dobra com a base presa no chão, em faixas — igual à vegetação do jogo
function menuSway(p, img, x, y, bend, hang = false) {
  const stride = 4;
  for (let row = 0; row < img.height; row += stride) {
    const s = Math.min(stride, img.height - row);
    const q = hang ? row / img.height : 1 - (row + s) / img.height;
    p.drawImage(img, 0, row, img.width, s, Math.round(x + bend * q * q), Math.round(y) + row, img.width, s);
  }
}

// Feixes de luz: leque desfocado, com degradê que se apaga antes de chegar ao chão.
// Redesenhado umas 20x por segundo — o movimento é lento e o borrão é caro.
function menuRayBuffer(art, t) {
  if (art.raysAt >= 0 && Math.abs(t - art.raysAt) < 0.05) return art.rayBuf;
  art.raysAt = t;
  const buf = art.rayBuf ??= makeCanvas(MENU_W, MENU_H), q = buf.getContext('2d');
  q.clearRect(0, 0, MENU_W, MENU_H);
  for (let pass = 0; pass < 2; pass++) {              // feixe borrado + um miolo mais nítido
    q.filter = pass ? 'blur(2px)' : 'blur(6px)';
    for (let i = 0; i < 7; i++) {
      const sway = Math.sin(t * 0.16 + i * 1.7) * 18 + Math.sin(t * 0.07 + i) * 9;
      const base = 4 + (i % 3) * 3, w = base * (pass ? 0.5 : 1);
      const top = MENU_SUN.x - 42 + i * 14 + (pass ? base * 0.9 : 0);
      const botL = MENU_SUN.x - 330 + i * 46 + sway + (pass ? base * 1.5 : 0), botR = botL + w * 3;
      const a = (0.26 + 0.1 * (0.5 + 0.5 * Math.sin(t * 0.37 + i * 2.1))) * (pass ? 0.45 : 1);
      const g = q.createLinearGradient(MENU_SUN.x, MENU_SUN.y, (botL + botR) / 2, MENU_H + 40);
      g.addColorStop(0, `rgba(255,242,204,${a})`);
      g.addColorStop(0.45, `rgba(255,228,166,${a * 0.62})`);
      g.addColorStop(0.85, `rgba(255,216,144,${a * 0.14})`);
      g.addColorStop(1, 'rgba(255,212,136,0)');
      q.fillStyle = g;
      q.beginPath();
      q.moveTo(top, MENU_SUN.y - 6); q.lineTo(top + w, MENU_SUN.y - 6);
      q.lineTo(botR, MENU_H); q.lineTo(botL, MENU_H);
      q.fill();
    }
  }
  q.filter = 'none';
  return buf;
}

function menuRays(p, art, t, k) {
  p.save();
  p.globalCompositeOperation = 'lighter';
  p.globalAlpha = k;
  p.drawImage(menuRayBuffer(art, t), 0, 0);
  p.restore();
}

function menuBirds(p, art, t) {
  p.fillStyle = '#2f3d42';
  for (const b of art.birds) {
    const u = (t * b.sp + b.off) % 1.4;
    if (u > 1) continue;
    const x = -30 + u * (MENU_W + 60), y = 116 + b.dy + Math.sin(u * 5 + b.off * 9) * 9;
    const flap = Math.sin(t * 7 + b.off * 11) > 0 ? 1 : 2;
    p.fillRect(Math.round(x), Math.round(y), 2, 1);
    p.fillRect(Math.round(x - 3), Math.round(y - flap), 3, 1);
    p.fillRect(Math.round(x + 2), Math.round(y - flap), 3, 1);
  }
}

function menuWaterfall(p, t) {
  const { x, w, top, bottom } = MENU_FALL, h = bottom - top;
  p.rect2(x, top, w, h, 'rgba(134,196,200,.38)');
  p.rect2(x + 1, top, 3, h, 'rgba(206,240,238,.28)');
  for (let i = 0; i < 11; i++) {
    const sx = x + 1 + (i * 37) % (w - 3), len = 16 + (i % 4) * 11, sp = 170 + (i % 3) * 55;
    const yy = top - len + ((t * sp + i * 41) % (h + len));
    const y0 = Math.max(top, yy), y1 = Math.min(bottom, yy + len);
    if (y1 > y0) p.rect2(sx, y0, i % 3 ? 2 : 1, y1 - y0, i % 3 ? 'rgba(226,248,246,.62)' : 'rgba(255,255,255,.46)');
  }
  p.rect2(x - 3, top - 3, w + 6, 4, '#8fc9c4'); p.rect2(x - 2, top - 3, w + 4, 1, '#d8f2ea');
  for (let i = 0; i < 16; i++) {                       // espuma pulando na queda
    const u = (t * 0.6 + i * 0.0625) % 1;
    p.rect2(x + w / 2 + Math.sin(i * 2.3 + t) * (7 + u * 22), bottom - 6 - u * 26, 2, 2, `rgba(226,248,246,${(1 - u) * 0.5})`);
  }
  const spray = p.createRadialGradient(x + w / 2, bottom, 2, x + w / 2, bottom, 54);
  spray.addColorStop(0, 'rgba(216,240,238,.3)');
  spray.addColorStop(1, 'rgba(216,240,238,0)');
  p.fillStyle = spray; p.fillRect(x - 54, bottom - 54, 108, 60);
}

function menuWaterShine(p, t) {
  p.rect2(96, 272, 112, 1, 'rgba(180,220,208,.35)');
  for (let i = 0; i < 7; i++) {
    const x = 100 + i * 15 + Math.sin(t * 0.8 + i) * 4;
    p.rect2(x, 273, 7 + Math.sin(t + i) * 3, 1, `rgba(202,234,222,${0.2 + 0.18 * (0.5 + 0.5 * Math.sin(t * 1.6 + i))})`);
  }
  p.rect2(496, MENU_POOL_Y, 112, 1, 'rgba(180,220,208,.4)');
  for (let i = 0; i < 9; i++) {
    const x = 500 + i * 12 + Math.sin(t * 0.9 + i * 1.3) * 5;
    p.rect2(x, MENU_POOL_Y + 2 + (i % 3) * 4, 8 + Math.sin(t * 1.3 + i) * 4, 1, `rgba(186,226,218,${0.14 + 0.16 * (0.5 + 0.5 * Math.sin(t * 2 + i))})`);
  }
  for (let i = 0; i < 3; i++) {                        // ondas que abrem a partir da queda
    const u = (t * 0.5 + i / 3) % 1, r = 8 + u * 46;
    p.rect2(MENU_FALL.x + MENU_FALL.w / 2 - r, MENU_POOL_Y + 1 + u * 6, r * 2, 1, `rgba(214,242,236,${(1 - u) * 0.3})`);
  }
}

function menuGlow(p, x, y, r, col, a) {
  const g = p.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${col},${a})`);
  g.addColorStop(0.45, `rgba(${col},${a * 0.32})`);
  g.addColorStop(1, `rgba(${col},0)`);
  p.fillStyle = g; p.fillRect(x - r, y - r, r * 2, r * 2);
}

function menuParticles(p, t) {
  p.save();
  p.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 22; i++) {                       // vaga-lumes no campo
    const blink = Math.sin(t * 1.9 + i * 2.1);
    if (blink < 0) continue;
    const x = 24 + ((i * 53 + t * (6 + (i % 5) * 2)) % 276), y = 200 + (i * 17) % 60 + Math.sin(t * 0.7 + i) * 7;
    p.fillStyle = `rgba(244,226,140,${blink * 0.75})`;
    p.fillRect(Math.round(x), Math.round(y), 1, 1);
    if (blink > 0.75) menuGlow(p, x, y, 5, '244,226,140', 0.25);
  }
  for (let i = 0; i < 12; i++) {                       // poeira luminosa da caverna
    const u = (t * 0.05 + i * 0.083) % 1;
    p.fillStyle = `rgba(160,224,220,${Math.sin(u * Math.PI) * 0.5})`;
    p.fillRect(Math.round(418 + (i * 29) % 76 + Math.sin(t * 0.5 + i) * 5), Math.round(332 - u * 54), 1, 1);
  }
  p.restore();
  for (let i = 0; i < 9; i++) {                        // folhas que descem girando
    const u = (t * 0.045 + i * 0.111) % 1;
    const x = [40, 52, 232, 248, 262, 462, 476, 488, 30][i] + Math.sin(u * 7 + i) * 13;
    p.rect2(x, 168 + u * 112, Math.abs(Math.cos(u * 9 + i)) * 2 + 1, 2, ['#c78a3e', '#a9702f', '#b8823a'][i % 3]);
  }
}

function menuSmoke(p, t) {
  for (let i = 0; i < 9; i++) {
    const u = (t * 0.16 + i * 0.111) % 1, r = 2 + u * 7;
    p.rect2(413 + Math.sin(u * 4 + i) * (3 + u * 16) + u * 14 - r / 2, 124 - u * 62 - r / 2, r, r, `rgba(226,222,208,${(1 - u) * 0.3})`);
  }
}

// ---------------------------------------------------------------------------
// Composição
// ---------------------------------------------------------------------------
function drawBravoraMenu(ctx, W, H) {
  const art = menuArt ??= buildMenuArt();
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const t = still ? 12 : performance.now() / 1000;
  const scale = Math.max(W / MENU_W, H / MENU_H);

  ctx.save();
  // Em telas mais estreitas que 16:9 sobra menos largura: o corte come o campo da
  // esquerda (que fica atrás do texto) e preserva a cabana, a queda e a caverna.
  ctx.translate((W - MENU_W * scale) * 0.74, (H - MENU_H * scale) * 0.46);
  ctx.scale(scale, scale);
  const p = menuPixelTools(ctx);

  p.drawImage(art.sky, 0, 0);
  for (const s of art.stars) {                         // estrelas que ainda resistem no alto
    const a = (0.22 + 0.22 * Math.sin(t * 0.9 + s.ph)) * (1 - s.y / 110);
    p.rect2(s.x, s.y, 1, 1, `rgba(226,236,255,${a})`);
  }
  const drift = (layer, speed, y) => {
    const dx = Math.round(-((t * speed) % MENU_W));
    p.drawImage(layer, dx, y); p.drawImage(layer, dx + MENU_W, y);
  };
  drift(art.cloudsFar, 1.6, 4);
  drift(art.clouds, 3.4, 0);
  p.drawImage(art.ridge, 0, 0);
  drift(art.mist, 5, 198);
  drift(art.mist, 2.4, 252);
  menuRays(p, art, t, 1);
  menuBirds(p, art, t);

  p.drawImage(art.ground, 0, 0);

  const wind = Math.sin(t * 0.55) * 1.6 + Math.sin(t * 1.27) * 0.7;
  for (const tr of art.trees) {                        // copas e mato no mesmo vento
    menuSway(p, tr.leaves, tr.x, tr.y, (wind * 2 + Math.sin(t * 0.9 + tr.ph) * 1.4) * tr.flex);
  }
  for (const pl of art.plants)
    menuSway(p, pl.d, pl.x, pl.y, (wind + Math.sin(t * 1.6 + pl.ph) * 0.8) * pl.flex * 1.5);

  menuWaterfall(p, t);
  menuWaterShine(p, t);

  p.save(); p.globalCompositeOperation = 'lighter';
  for (const g of art.glows) menuGlow(p, g.x, g.y, g.r, g.c, 0.16 + 0.08 * Math.sin(t * 1.3 + g.x));
  menuGlow(p, 338, 214, 26, '255,198,110', 0.2 + 0.03 * Math.sin(t * 3.1));
  menuGlow(p, 414, 214, 26, '255,198,110', 0.2 + 0.03 * Math.sin(t * 2.6 + 1));
  menuGlow(p, 395, 210, 14, '255,208,120', 0.24 + 0.05 * Math.sin(t * 5.3));
  p.restore();

  const fx = 272, fy = 256;                            // fogueira com a pixel art do jogo
  if (renderer.tex.flat[TILE.CAMPFIRE]) p.drawImage(renderer.tex.flat[TILE.CAMPFIRE], 0, 0, T, T, fx - 8, fy - 16, T, T);
  drawFire(p, { ...art.fire, x: fx, y: fy - 4, seed: 0.3 }, 0.6, t);
  p.save(); p.globalCompositeOperation = 'lighter';
  menuGlow(p, fx, fy - 10, 38 + Math.sin(t * 6) * 3, '255,168,74', 0.22);
  p.restore();

  menuSmoke(p, t);
  menuParticles(p, t);
  menuRays(p, art, t, 0.5);                            // os mesmos feixes, agora por cima do relevo

  const vig = p.createRadialGradient(MENU_W * 0.56, MENU_H * 0.44, 90, MENU_W * 0.56, MENU_H * 0.44, 420);
  vig.addColorStop(0, 'rgba(6,10,14,0)');
  vig.addColorStop(1, 'rgba(6,10,14,.6)');
  p.fillStyle = vig; p.fillRect(0, 0, MENU_W, MENU_H);
  ctx.restore();
}
