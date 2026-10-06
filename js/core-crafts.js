'use strict';
// =====================================================================================
//  MAIS USO PARA O QUE O CORAÇÃO DÁ
// =====================================================================================
// Blocos (osso, vitral e lanterna de âmbar, obsidiana), ferramentas e armaduras de magnetita, armadura de bronze
// dos Vigias, Ímã de magnetita (puxa itens de longe), Amuleto de âmbar (segura o calor) e Lança de fóssil.
// Carrega depois de core-fortress.js e de tool-art.js.

const nextTileId = () => Math.max(...Object.values(TILE)) + 1, nextItemId = () => Math.max(...Object.values(ITEM)) + 1;
function coreBlock(key, name, tileOpts, tex) {
  const t = nextTileId(), i = nextItemId(); TILE[key] = t; ITEM[key] = i;
  defTile(t, { name, hardness: 1.2, drop: i, ferramenta: 'picareta', reto: true, color: [150, 150, 150], ...tileOpts });
  defItem(i, { name, place: t });
  MATERIAL_TEX[t] = tex;
  return t;
}
const mixc = (a, b, k) => a.map((v, j) => Math.round(v + (b[j] - v) * k));

// ---------------------------------------------------------------- texturas dos blocos
function genBoneBrick(seed) {                                                       // tijolos de osso com argamassa escura
  const tex = new Tex(), base = [226, 212, 180];
  for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
    const row = y >> 3, by = y & 7, bx = wrap(x + (row & 1) * 8, 16);
    let c = shade(base, 0.92 + hash2(wrap(x + (row & 1) * 8, 64) >> 4, row, seed) * 0.14 + (hash2(x, y, seed) - 0.5) * 0.05);
    if (by === 7 || bx === 15) c = [120, 100, 74]; else if (by === 0 || bx === 0) c = shade(c, 1.12);
    else if (bx === 7 && by === 3 && hash2(row, x >> 4, seed) < 0.5) c = [140, 120, 90];
    tex.set(x, y, c);
  }
  return tex;
}
function genAmberGlass(seed) {                                                       // vitral: moldura de bronze e vidro cor de mel com reflexo
  const tex = new Tex();
  for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
    const lx = x & 15, ly = y & 15, k = clamp(0.35 + ly / 40 + (hash2(x >> 4, y >> 4, seed) - 0.5) * 0.25, 0, 1);
    let c = mixc([196, 100, 24], [255, 206, 90], k);
    if (lx === 0 || ly === 0 || lx === 15 || ly === 15) c = [92, 58, 28]; else if (lx === 1 || ly === 1) c = [150, 100, 48];
    else if ((lx + ly === 6 || lx + ly === 7) && lx > 2 && ly > 2) c = [255, 240, 190];
    else if (lx === 14 || ly === 14) c = shade(c, 0.8);
    tex.set(x, y, c);
  }
  return tex;
}
function genAmberLantern(seed) {                                                     // lanterna: moldura escura e miolo brilhando
  const tex = new Tex();
  for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
    const lx = x & 15, ly = y & 15, d = Math.hypot(lx - 7.5, ly - 7.5);
    let c = mixc([255, 240, 170], [236, 130, 30], clamp(d / 9, 0, 1));
    if (lx === 0 || ly === 0 || lx === 15 || ly === 15) c = [58, 36, 18]; else if (lx === 1 || ly === 1 || lx === 14 || ly === 14) c = [120, 78, 36];
    else if (lx === 7 || lx === 8 || ly === 7 || ly === 8) c = mixc(c, [150, 90, 30], 0.35);
    tex.set(x, y, c);
  }
  return tex;
}
function genObsidianBrick(seed) {                                                    // tijolos de vidro vulcânico, borda clara e veio de brasa
  const tex = new Tex(), base = [38, 30, 52];
  for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
    const row = y >> 4, by = y & 15, bx = wrap(x + (row & 1) * 16, 32) & 31;
    let c = shade(base, 0.8 + hash2(wrap(x + (row & 1) * 16, 64) >> 5, row, seed) * 0.3 + (hash2(x, y, seed) - 0.5) * 0.08);
    if (by === 15 || bx === 31) c = [14, 10, 20]; else if (by === 0 || bx === 0) c = [120, 100, 150]; else if (by === 1 || bx === 1) c = shade(c, 1.35);
    if (hash2(x >> 2, y >> 2, seed + 5) < 0.015) c = EMBER[hash2(x, y, seed) < 0.5 ? 1 : 2];
    tex.set(x, y, c);
  }
  return tex;
}
coreBlock('BONE_BRICK', 'Tijolo de osso', { hardness: 1 }, genBoneBrick(2201));
coreBlock('AMBER_GLASS', 'Vitral de âmbar', { hardness: 0.6, opacity: 1, light: 4 }, genAmberGlass(2202));
coreBlock('AMBER_LANTERN', 'Lanterna de âmbar', { hardness: 0.6, opacity: 1, light: 13 }, genAmberLantern(2203));
coreBlock('OBSIDIAN_BRICK', 'Tijolo de obsidiana', { hardness: 1.6 }, genObsidianBrick(2204));
buildFlatTiles();                                                                    // atualiza as tabelas de sólido/luz com os blocos novos

// ---------------------------------------------------------------- ferramentas, armaduras e acessórios
const PAL_MAGNET = { L: [214, 236, 255], w: [110, 150, 210], W: [56, 76, 130], G: [22, 30, 56] };
const PAL_FOSSIL = { L: [255, 252, 238], w: [226, 212, 178], W: [150, 132, 100], G: [86, 72, 52] };
const PAL_BRONZE = { L: [246, 214, 150], w: [168, 116, 58], W: [110, 68, 30], G: [52, 30, 14] };
function newItem(key, def, art) { const id = nextItemId(); ITEM[key] = id; defItem(id, def); if (art) ITEM_ART[id] = art; return id; }

newItem('MAGNET_PICK', { name: 'Picareta de magnetita', ferramenta: 'picareta', nivel: 2, velocidade: 9, maxStack: 1, descricao: 'Ímã e bronze no mesmo cabo. Quebra mais rápido que a de ferro.' }, toolPaint('pick', PAL_MAGNET));
newItem('MAGNET_AXE', { name: 'Machado de magnetita', ferramenta: 'machado', nivel: 2, velocidade: 9, maxStack: 1, descricao: 'Corta madeira bem mais rápido que o de ferro.' }, toolPaint('axe', PAL_MAGNET));
newItem('MAGNET_HAMMER', { name: 'Martelo de magnetita', ferramenta: 'martelo', nivel: 2, velocidade: 9, maxStack: 1, descricao: 'Pesado e atraído por tudo que é metal. Mais rápido que o de ferro.' }, toolPaint('hammer', PAL_MAGNET));

function armorIcon(P) {
  return {
    cores: { w: P.W, L: P.w, W: P.L, G: P.G },
    pixels: ['................', '..ww........ww..', '.wLLw..ww..wLLw.', '.wLLwwwLLwwwLLw.', '..wLLLLLLLLLLw..', '..wLLLWWWWLLLw..', '...wLLWWWWLLw...', '...wLLLWWLLLw...', '...wLLLLLLLLw...', '...wLLWWWWLLw...', '...wWLLLLLLWw...', '....wWWWWWWw....', '....GGGGGGGG....', '................', '................', '................'],
  };
}
OUTFIT_JACKETS.magnetArmor = [[20, 26, 44], [44, 58, 96], [80, 104, 156], [196, 228, 255]];
OUTFIT_JACKETS.bronzeArmor = [[52, 30, 14], [110, 68, 30], [168, 116, 58], [246, 214, 150]];
newItem('MAGNET_ARMOR', { name: 'Peitoral de magnetita', roupa: { defesa: 0.32, visual: 'magnetArmor' }, maxStack: 1, descricao: 'Placas de ímã. Defesa 32%.' }, armorIcon(PAL_MAGNET));
newItem('BRONZE_ARMOR', { name: 'Armadura dos Vigias', roupa: { defesa: 0.28, visual: 'bronzeArmor', calor: true }, maxStack: 1, descricao: 'Bronze de máquina. Defesa 28% e aguenta o calor da lava.' }, armorIcon(PAL_BRONZE));

newItem('MAGNET_CHARM', { name: 'Ímã de magnetita', acessorio: { iman: 1 }, maxStack: 1, descricao: 'Num slot de acessório: puxa os itens do chão de bem longe.' }, {
  cores: { r: [214, 56, 52], R: [255, 130, 120], s: [200, 208, 222], S: [120, 130, 150], d: [60, 66, 84] },
  pixels: ['................', '..rrrr....ssss..', '..rRRr....sSSs..', '..rRRr....sSSs..', '..rrrr....ssss..', '..rRRrr..sssSs..', '..rRRrrrrsssSs..', '...rRRrrrsssd...', '...rrRRrsSsdd...', '....rrrrsssd....', '.....rrrssd.....', '......rrdd......', '................', '................', '................', '................'],
});
newItem('AMBER_CHARM', { name: 'Amuleto de âmbar', acessorio: { calor: 1 }, maxStack: 1, descricao: 'A resina segura o calor: lava e vapor machucam bem menos.' }, {
  cores: { b: [96, 58, 26], B: [150, 96, 40], a: [255, 212, 110], A: [226, 140, 40], c: [150, 70, 16], w: [255, 248, 210] },
  pixels: ['................', '.....bbbbbb.....', '....b......b....', '....b......b....', '.....bB..Bb.....', '......bbbb......', '.....bAAAAb.....', '....bAaaaAAb....', '...bAawwaaAAb...', '...bAawaaAcAb...', '...bAaaaAAccb...', '....bAAAAcccb...', '.....bAAcccb....', '......bbbbb.....', '................', '................'],
});
{
  // Lança de fóssil: haste na diagonal, ponta de osso farpada
  const g = Array.from({ length: 16 }, () => Array(16).fill('.')), put = (x, y, c) => { if (x >= 0 && x < 16 && y >= 0 && y < 16) g[y][x] = c; };
  for (let i = 0; i <= 9; i++) { put(1 + i, 14 - i, 'l'); put(2 + i, 14 - i, 'h'); }
  for (let i = 0; i <= 5; i++) { put(9 + i, 6 - i, 'L'); put(10 + i, 6 - i, 'w'); put(8 + i, 6 - i, 'W'); }
  put(15, 0, 'L'); put(15, 1, 'w'); put(14, 0, 'L'); put(7, 6, 'W'); put(7, 7, 'W'); put(11, 8, 'w'); put(12, 8, 'W'); put(11, 2, 'L'); put(12, 2, 'W');
  newItem('FOSSIL_SPEAR', { name: 'Lança de fóssil', dano: 15, alcance: 48, rapidez: 0.8, maxStack: 1, descricao: 'Osso de bicho antigo amarrado numa haste. Alcance longo.' }, { cores: { ...TOOL_HANDLE, ...PAL_FOSSIL }, pixels: g.map((r) => r.join('')) });
}
// o ímã puxa itens soltos de longe (além da atração curta de item-actions.js)
{
  const baseDrops = updateDrops;
  updateDrops = function (g, dt) {
    if (g.drops?.length && !g.player.dead && accessoryPower(g, 'iman') > 0) {
      const p = g.player, py = p.y + p.h * 0.6;
      for (const d of g.drops) {
        if (d.delay > 0) continue;
        const dx = p.cx - d.x, dy = py - d.y, dist = Math.hypot(dx, dy);
        if (dist < 9 * T && dist > 20 && g.inventory.canAdd(d.item, 1)) {
          const st = Math.min(dist, (60 + (9 * T - dist) * 2.4) * dt);
          d.x += dx / dist * st; d.y += dy / dist * st; d.vx = 0; d.vy = 0; d.floating = false;
        }
      }
    }
    return baseDrops(g, dt);
  };
}

// ---------------------------------------------------------------- receitas
const crf = (nome, estacao, ing, item, quantidade = 1) => RECIPES.push({ nome, estacao, ingredientes: ing, resultado: { item, quantidade } });
crf('Tijolo de osso', 'workbench', [[ITEM.FOSSIL, 2]], ITEM.BONE_BRICK, 4);
crf('Vitral de âmbar', 'workbench', [[ITEM.AMBER, 1], [ITEM.GLASS, 1]], ITEM.AMBER_GLASS, 2);
crf('Lanterna de âmbar', 'workbench', [[ITEM.AMBER, 2], [ITEM.BRONZE, 1]], ITEM.AMBER_LANTERN, 2);
crf('Tijolo de obsidiana', 'workbench', [[ITEM.OBSIDIAN, 2]], ITEM.OBSIDIAN_BRICK, 4);
crf('Picareta de magnetita', 'anvil', [[ITEM.MAGNETITE, 8], [ITEM.STICK, 2], [ITEM.BRONZE, 2]], ITEM.MAGNET_PICK);
crf('Machado de magnetita', 'anvil', [[ITEM.MAGNETITE, 7], [ITEM.STICK, 2], [ITEM.BRONZE, 2]], ITEM.MAGNET_AXE);
crf('Martelo de magnetita', 'anvil', [[ITEM.MAGNETITE, 9], [ITEM.STICK, 2], [ITEM.BRONZE, 2]], ITEM.MAGNET_HAMMER);
crf('Peitoral de magnetita', 'anvil', [[ITEM.MAGNETITE, 14], [ITEM.CORE_SHARD, 2], [ITEM.LEATHER, 4]], ITEM.MAGNET_ARMOR);
crf('Ímã de magnetita', 'anvil', [[ITEM.MAGNETITE, 6], [ITEM.METAL_BAR, 2], [ITEM.CORE_SHARD, 1]], ITEM.MAGNET_CHARM);
crf('Armadura dos Vigias', 'anvil', [[ITEM.BRONZE, 12], [ITEM.GEAR, 2], [ITEM.LEATHER, 4]], ITEM.BRONZE_ARMOR);
crf('Amuleto de âmbar', 'anvil', [[ITEM.AMBER, 6], [ITEM.SALAMANDER_SCALE, 2], [ITEM.ROPE, 2]], ITEM.AMBER_CHARM);
crf('Lança de fóssil', 'anvil', [[ITEM.FOSSIL, 6], [ITEM.BONE, 4], [ITEM.STICK, 3]], ITEM.FOSSIL_SPEAR);
