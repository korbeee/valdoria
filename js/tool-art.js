'use strict';
// =====================================================================================
//  ÍCONES DAS FERRAMENTAS (picareta, pá e martelo) — refeitos
// =====================================================================================
// Todos na diagonal exata de 45° (cabo embaixo à esquerda, cabeça em cima à direita), que é a única inclinação
// que o pixel desenha sem degrau torto. A cabeça fica perpendicular ao cabo, com luz vinda de cima à esquerda.
// A mesma forma vale para madeira, pedra, ferro, diamante e as versões de referência: só muda a paleta.
// Carrega depois de rare-pig-loot.js e antes de game.js (o atlas de ícones é montado lá).

const TOOL_TIER_PAL = {
  wood: { L: [214, 170, 114], w: [178, 130, 82], W: [114, 78, 48], G: [72, 48, 30] },
  stone: { L: [214, 214, 224], w: [152, 152, 164], W: [94, 94, 106], G: [56, 56, 68] },
  metal: { L: [244, 248, 253], w: [188, 198, 212], W: [114, 122, 136], G: [64, 72, 86] },
  diamond: { L: [214, 255, 248], w: [88, 228, 200], W: [26, 140, 128], G: [8, 64, 60] },
  azure: { L: [214, 242, 248], w: [104, 172, 216], W: [60, 100, 156], G: [30, 46, 78] },
  ember: { L: [255, 220, 140], w: [232, 122, 62], W: [156, 58, 54], G: [74, 32, 42] },
  gold: { L: [255, 240, 170], w: [226, 176, 76], W: [150, 100, 40], G: [84, 54, 24] },
  violet: { L: [248, 220, 250], w: [190, 130, 210], W: [110, 74, 150], G: [52, 36, 78] },
  bone: { L: [255, 254, 248], w: [232, 228, 216], W: [160, 156, 152], G: [96, 92, 96] },
  stinger: { L: [255, 236, 170], w: [222, 170, 70], W: [140, 92, 40], G: [80, 48, 24] },
};
const TOOL_HANDLE = { l: [200, 154, 104], h: [152, 106, 64], H: [96, 64, 40], y: [240, 200, 96], Y: [152, 108, 40], r: [190, 60, 56] };

// Rasterizador mínimo: grade 16x16, pontos e "pincel" quadrado de 1px
function toolPaint(kind, pal, style = 0) {
  const g = Array.from({ length: 16 }, () => Array(16).fill('.'));
  const put = (x, y, ch) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && x < 16 && y >= 0 && y < 16) g[y][x] = ch; };
  // cabo: dois pixels de largura subindo na diagonal, claro em cima, escuro embaixo e um nó de vez em quando
  const handle = (x0, y0, x1, y1) => {
    const n = x1 - x0;
    for (let i = 0; i <= n; i++) { const x = x0 + i, y = y0 - i; put(x, y, 'l'); put(x + 1, y, 'h'); if (i % 3 === 1) put(x + 1, y, 'H'); if (i === 0) put(x, y + 1, 'H'); }
  };
  // eixo "u" corre ao longo do cabo (para cima e à direita) e "v" atravessa (para cima e à esquerda)
  const at = (cx, cy, u, v) => [cx + (u - v) * 0.7071, cy - (u + v) * 0.7071];
  const fill = (cx, cy, u0, u1, v0, v1, fn) => {
    for (let u = u0; u <= u1; u += 0.5) for (let v = v0; v <= v1; v += 0.5) { const [x, y] = at(cx, cy, u, v), ch = fn(u, v); if (ch) put(x, y, ch); }
  };
  if (kind === 'pick') {
    handle(1, 14, 9, 6);
    // cabeça em arco ")" de ponta a ponta, 3px de espessura; as pontas curvam para o lado do cabo
    const cx = 10, cy = 5;
    for (let v = -6.2; v <= 6.2; v += 0.35) {
      const bend = v * v / 13, tip = Math.abs(v) > 5;
      const span = Math.abs(v) > 5.1 ? 0.25 : Math.abs(v) > 3.9 ? 0.7 : 1.25;
      for (let o = -span; o <= span; o += 0.5) {
        const [x, y] = at(cx, cy, -bend + o, v);
        put(x, y, o < -0.6 ? 'W' : o > 0.6 ? 'L' : 'w');
      }
    }
    for (let v = -4; v <= 4; v += 0.5) { const [x, y] = at(cx, cy, -(v * v) / 13 + 1.1, v); put(x, y, 'L'); }   // fio de luz
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) put(cx - 1 + dx, cy + dy, 'G');                   // encaixe do cabo
  } else if (kind === 'shovel') {
    handle(1, 14, 8, 7);
    const cx = 10, cy = 5;                                                                                      // lâmina larga e levemente pontuda
    fill(cx, cy, -1, 5.6, -3.2, 3.2, (u, v) => {
      const half = 3.1 - Math.max(0, u - 2.6) * 1.1; if (Math.abs(v) > half) return 0;
      if (u < -0.2) return 'G';
      if (Math.abs(v) > half - 0.9 || u > 5.2) return 'W';
      if (Math.abs(v) < 0.4) return 'L';
      return v < 0 ? 'w' : 'W';
    });
  } else if (kind === 'hammer') {
    handle(1, 14, 9, 6);
    const cx = 10, cy = 5;                                                                                      // cabeça de marreta atravessada
    fill(cx, cy, -3, 3, -3.8, 4.6, (u, vv) => {
      const v = -vv;
      const face = v > 1.8, claw = v < -2.4;
      if (claw && Math.abs(u) > 1.4 - (v < -3.6 ? 0.8 : 0)) return 0;
      if (!claw && !face && Math.abs(u) > 2.4) return 0;
      if (face && Math.abs(u) > 2.9) return 0;
      if (u > 1.8 || v > 3.2) return 'W';
      if (u < -1.9) return 'G';
      return v < 0 ? 'L' : 'w';
    });
  } else if (kind === 'axe') {
    handle(1, 14, 9, 6);
    const cx = 10, cy = 5;                                                                                      // cabeÃ§a de machado: nuca pequena de um lado e fio curvo do outro
    fill(cx, cy, -3, 3, -6.2, 2.2, (u, vv) => {
      const v = -vv;
      const reach = v > 2.6 ? Math.min(3.5, 0.95 + (v - 2.6) * 1.15) : 0.95;                                                               // o fio abre em leque
      if (Math.abs(u) > reach + (v > 5 ? 0.2 : 0)) return 0;
      if (v < -0.8 && Math.abs(u) > 1.0) return 0;
      if (v > 5.2) return 'L';                                                                                  // gume
      if (v > 3.6) return 'w';
      if (u < -1.3) return 'G';
      return u > 0.6 ? 'W' : 'w';
    });
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) put(cx - 1 + dx, cy + dy, 'G');
  } else if (kind === 'sword') {
    handle(0, 15, 2, 13); put(0, 15, 'y'); put(1, 15, 'Y');                                                    // empunhadura com pomo dourado
    const cx = 3, cy = 12;
    fill(cx, cy, -0.2, 0.2, -2.9, 2.9, (u, v) => (Math.abs(v) > 2.2 ? 'Y' : 'y'));                              // guarda dourada, bem visÃ­vel
    fill(cx, cy, 1.6, 15.4, -1.2, 1.2, (u, v) => {                                                              // lÃ¢mina: fio claro, sulco escuro no meio, costas mÃ©dias
      const half = u > 13 ? 0.4 : 1.2; if (Math.abs(v) > half) return 0;
      if (u > 14) return 'L';
      return v < -0.45 ? 'L' : v > 0.45 ? 'W' : 'w';
    });
  } else if (kind === 'nail') {
    // Agulha longa e reta de lÃ¢mina clara que afina atÃ© a ponta, empunhadura curta de pano escuro enrolado, sem guarda
    handle(0, 15, 2, 13);
    const cx = 3, cy = 12;
    fill(cx, cy, 0, 14.4, -1.2, 1.2, (u, v) => {
      const half = 0.95 * (1 - u / 14.6) + 0.06; if (Math.abs(v) > half) return 0;
      if (u > 13.4) return "L";
      if (style === 2 && u > 11 && Math.abs(v) < 0.2) return "W";                                           // bifurcada: sulco até a ponta
      if (style === 0 && u > 4 && u < 8 && Math.abs(v) < 0.4) return 'G';                                      // fendida
      if (style === 3 && Math.floor(u) % 3 === 0 && v >= 0) return 'W';                                        // faixas
      if (style === 4 && v > half - 0.6 && Math.floor(u) % 3 === 0) return 0;                                 // dentes
      return v < -0.35 ? 'L' : v > 0.35 ? 'W' : 'w';
    });
    if (style === 1) fill(cx, cy, 1.5, 11, -0.2, 0.2, () => 'W');                                              // sulco central
  } else if (kind === 'scythe') {
    // cabo longo na diagonal; lÃ¢mina em meia-lua que sai do topo para a esquerda e vai se curvando para baixo, afinando atÃ© a ponta
    handle(2, 14, 10, 6);
    for (let t = 0; t <= 1.001; t += 0.025) {
      const x = 11 - 11 * t, y = 4.5 - 2 * Math.sin(Math.PI * t) + 7.5 * t * t, thick = t < 0.55 ? 2 : 1;
      put(x, y, 'L'); if (thick > 1) put(x, y + 1, t < 0.3 ? 'W' : 'w');
    }
    put(10, 5, 'G'); put(11, 5, 'G'); put(11, 6, 'G');                                                         // encaixe no cabo
  } else if (kind === 'needle') {
    // AGULHÃO: agulha comprida e fina, com furo na base, empunhadura de linha enrolada e ponta afiada
    for (let i = 0; i <= 11; i++) {
      const x = 3 + i, y = 12 - i;
      if (i <= 3) { put(x, y, i % 2 ? 'H' : 'h'); put(x + 1, y, i % 2 ? 'h' : 'l'); continue; }
      if (i >= 9) { put(x, y, 'L'); continue; }
      put(x, y, 'L'); put(x + 1, y, 'W');
      if (style === 3 && i % 2 === 0) put(x, y, 'r');
      if (style === 4 && i % 3 === 0) put(x + 1, y, 'W');
    }
    for (const [x, y, c] of [[0, 14, 'w'], [0, 15, 'W'], [1, 13, 'w'], [2, 13, 'L'], [2, 14, 'w'], [2, 15, 'W'], [1, 15, 'W']]) put(x, y, c);   // cabeÃ§a com o furo (1,14)
    if (style === 0) { put(7, 8, 'y'); put(8, 8, 'Y'); }
    if (style === 2) { put(14, 1, '.'); put(13, 1, 'L'); put(14, 2, 'L'); put(15, 0, 'L'); }
    if (style === 1) { put(9, 6, 'L'); put(10, 5, 'L'); }
  }
  const cores = { ...TOOL_HANDLE, ...Object.fromEntries(Object.entries(pal).map(([k, v]) => [k, v])) };
  if (kind === 'nail') Object.assign(cores, { l: [112, 112, 128], h: [70, 70, 86], H: [38, 38, 52] });          // pano escuro na empunhadura
  return { cores, pixels: g.map((r) => r.join('')) };
}

const TOOL_SETS = [
  ['pick', ITEM.WOOD_PICKAXE, 'wood'], ['pick', ITEM.STONE_PICKAXE, 'stone'], ['pick', ITEM.METAL_PICKAXE, 'metal'], ['pick', ITEM.DIAMOND_PICK, 'diamond'],
  ['shovel', ITEM.WOOD_SHOVEL, 'wood'], ['shovel', ITEM.STONE_SHOVEL, 'stone'], ['shovel', ITEM.METAL_SHOVEL, 'metal'],
  ['hammer', ITEM.WOOD_HAMMER, 'wood'], ['hammer', ITEM.STONE_HAMMER, 'stone'], ['hammer', ITEM.METAL_HAMMER, 'metal'],
  ['scythe', ITEM.SCYTHE, 'metal'],
  ['pick', ITEM.REF_DEEP_PICK, 'azure'], ['hammer', ITEM.REF_ASH_MAUL, 'ember'],
  ['axe', ITEM.WOOD_AXE, 'wood'], ['axe', ITEM.STONE_AXE, 'stone'], ['axe', ITEM.METAL_AXE, 'metal'], ['axe', ITEM.REF_GROVE_AXE, 'gold'],
  ['sword', ITEM.WOOD_SWORD, 'wood'], ['sword', ITEM.STONE_SWORD, 'stone'], ['sword', ITEM.METAL_SWORD, 'metal'], ['sword', ITEM.STINGER_SWORD, 'stinger'], ['sword', ITEM.REF_DUEL_BLADE, 'violet'],
];
for (const [kind, id, tier] of TOOL_SETS) if (id != null) ITEM_ART[id] = toolPaint(kind, TOOL_TIER_PAL[tier]);

for (const id of ESSENCE_NAIL_IDS) ITEM_ART[id] = toolPaint('needle', TOOL_TIER_PAL.metal, ITEM_DEFS[id].nailSkin || 0);

// FERRÃO de verdade (as 5 aparências do Agulhão da Alma Teimosa): bolsa de veneno redonda na base, haste curva que
// afina até uma ponta em gancho, farpinhas perto da ponta e brilho na curva. A cor da bolsa muda em cada aparência.
function stingerPaint(style) {
  const g = Array.from({ length: 16 }, () => Array(16).fill('.'));
  const put = (x, y, ch) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && x < 16 && y >= 0 && y < 16) g[y][x] = ch; };
  const SAC = [[[255, 226, 140], [230, 160, 52], [150, 84, 24]], [[200, 255, 160], [92, 190, 70], [34, 100, 40]], [[190, 236, 255], [74, 150, 220], [30, 70, 140]], [[255, 190, 180], [214, 70, 66], [120, 28, 34]], [[200, 250, 236], [70, 190, 170], [24, 100, 96]]][style % 5];
  const cores = { s: [250, 232, 190], S: [206, 150, 70], d: [112, 66, 28], a: SAC[0], b: SAC[1], c: SAC[2], w: [255, 255, 255] };
  // bolsa
  for (let y = 9; y <= 15; y++) for (let x = 0; x <= 7; x++) {
    const dx = x - 3.5, dy = y - 12.2, d = Math.hypot(dx, dy * 1.05); if (d > 3.2) continue;
    put(x, y, d > 2.4 ? 'c' : dx + dy < -1.6 ? 'a' : 'b');
  }
  put(2, 11, 'w'); put(3, 10, 'w'); put(2, 12, 'a');
  // haste: caminho curvo, raio diminuindo; luz em cima/esquerda, sombra embaixo/direita
  const path = [[5.2, 10.6], [7.2, 8.6], [9.1, 6.6], [10.6, 4.6], [11.6, 2.8], [12.3, 1.2], [12.6, 0.4]];
  for (let k = 0; k < path.length - 1; k++) for (let s = 0; s < 6; s++) {                                         // interpola para a haste sair contÃ­nua
    const t = s / 6, x = path[k][0] + (path[k + 1][0] - path[k][0]) * t, y = path[k][1] + (path[k + 1][1] - path[k][1]) * t, f = (k + t) / (path.length - 1);
    const r = f < 0.35 ? 1.2 : f < 0.7 ? 0.85 : 0.5;
    for (let oy = -2; oy <= 2; oy++) for (let ox = -2; ox <= 2; ox++) if (Math.hypot(ox, oy) <= r) put(x + ox, y + oy, ox + oy < -0.4 ? 's' : ox + oy > 0.6 ? 'd' : 'S');
  }
  for (const [x, y] of [[9, 5], [8, 6], [12, 4], [11, 5]]) put(x, y, 'S');                                       // farpas encostadas na haste
  return { cores, pixels: g.map((r) => r.join('')) };
}
for (const id of ESSENCE_NAIL_IDS) ITEM_ART[id] = toolPaint('needle', TOOL_TIER_PAL.metal, ITEM_DEFS[id].nailSkin || 0);   // Ã­cone: agulha com furo

// Agulha na MÃO do personagem (12x32, ponta para cima): haste fina que afina, empunhadura de linha enrolada e cabeÃ§a com furo.
ESSENCE_NAIL_SPRITES.forEach((cv, style) => {
  const x = cv.getContext('2d'), px = [];
  x.clearRect(0, 0, 12, 32);
  const put = (a, b, c) => px.push([a, b, c]);
  const L = [250, 250, 254], M = [196, 202, 216], D = [118, 126, 144], T1 = [58, 58, 76], T2 = style === 3 ? [190, 60, 56] : [112, 112, 132];
  put(5, 1, L); for (let y = 2; y <= 6; y++) put(5, y, L);
  for (let y = 7; y <= 22; y++) { put(5, y, L); put(6, y, y % 5 === 0 && style === 4 ? D : M); }
  if (style === 0) { put(5, 13, M); put(5, 14, M); }
  if (style === 1) for (let y = 8; y <= 20; y++) put(6, y, D);
  for (let y = 23; y <= 28; y++) for (let a = 4; a <= 7; a++) put(a, y, y % 2 ? T1 : T2);
  for (const [a, b] of [[4, 29], [5, 29], [6, 29], [7, 29], [3, 30], [4, 30], [7, 30], [8, 30], [4, 31], [5, 31], [6, 31], [7, 31]]) put(a, b, M);
  const set = new Set(px.map(([a, b]) => a + ',' + b));
  x.fillStyle = 'rgb(30,32,49)';
  for (const [a, b] of px) for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) if (!set.has((a + dx) + ',' + (b + dy)) && !(a + dx === 5 && b + dy === 30) && !(a + dx === 6 && b + dy === 30)) x.fillRect(a + dx, b + dy, 1, 1);
  for (const [a, b, c] of px) { x.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`; x.fillRect(a, b, 1, 1); }
});
