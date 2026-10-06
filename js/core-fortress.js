'use strict';
// =====================================================================================
//  FORTALEZAS DE LAVA
// =====================================================================================
// Em alguns lagos grandes de lava do Coração, uma ilha de obsidiana sustenta uma fortaleza de tijolos dos
// Vigias: dois andares, torres de canto com ameias, portões dos dois lados, pontes de bronze até as margens,
// tochas e baús. Guardas de obsidiana, arqueiros de brasa e (às vezes) um capitão moram lá dentro
// e só acordam quando o jogador chega perto. Carrega depois de core-mobs.js.

LOOT_TABLES.fortaleza = [[ITEM.BRONZE, 5, 12, 0.9], [ITEM.GOLD, 3, 8, 0.7], [ITEM.METAL_BAR, 3, 8, 0.6], [ITEM.AMBER, 2, 6, 0.5], [ITEM.MAGNETITE, 3, 7, 0.5],
  [ITEM.CORE_SHARD, 1, 2, 0.35], [ITEM.MEDKIT, 1, 3, 0.6], [ITEM.RUNE_STONE, 2, 5, 0.4], [ITEM.GEAR, 1, 3, 0.4], [ITEM.ARROW, 10, 24, 0.5]];

function buildCoreFortresses(w) {
  if (!w.coreTop) return;
  const rnd = mulberry32(w.seed + 7771), W = w.w, tiles = w.tiles, FW = 19;
  w.coreFortresses = [];
  const cand = [];
  for (let y = w.coreTopMin + 8; y < w.h - 24; y++) for (let x = 6; x < W - 6; x++) {
    if (tiles[y * W + x] !== TILE.LAVA || tiles[(y - 1) * W + x] === TILE.LAVA || tiles[y * W + x - 1] === TILE.LAVA) continue;
    let x1 = x; while (x1 < W - 6 && tiles[y * W + x1 + 1] === TILE.LAVA && tiles[(y - 1) * W + x1 + 1] !== TILE.LAVA) x1++;
    if (x1 - x + 1 >= 30 && x1 - x + 1 <= 90) cand.push({ x, x1, y });
    x = x1;
  }
  for (let i = cand.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [cand[i], cand[j]] = [cand[j], cand[i]]; }
  const want = Math.max(2, Math.round(W / 1300));
  for (const c of cand) {
    if (w.coreFortresses.length >= want) break;
    const cx = (c.x + c.x1) >> 1, x0 = cx - 9, x1 = x0 + FW - 1, floor = c.y - 2;
    if (w.coreFortresses.some((f) => Math.abs(f.x0 - x0) < 90)) continue;
    if ((w.coreHalls || []).some((o) => x1 + 20 > o.x0 && x0 - 20 < o.x1 && Math.abs(o.floor - floor) < 20)) continue;
    if (floor - 16 < w.coreTopMin) continue;
    if ((w.lootChests || []).some((c) => c.x >= x0 - 2 && c.x <= x1 + 2 && c.y >= floor - 16 && c.y <= floor + 8)) continue;   // não constrói por cima de um baú já posto (o do Ossário perto do lago)
    const set = (x, y, t, wall = WALL.VIGIA) => { if (w.inBounds(x, y) && tiles[y * W + x] !== TILE.BEDROCK && tiles[y * W + x] !== TILE.CORE_WALL && tiles[y * W + x] !== TILE.CHEST) sSet(w, x, y, t, wall); };   // baú já posto (o do Ossário) fica
    // 1. espaço livre e interior com parede dos Vigias
    for (let y = floor - 15; y <= floor - 1; y++) for (let x = x0 - 1; x <= x1 + 1; x++) set(x, y, TILE.AIR, y >= floor - 9 && x >= x0 + 2 && x <= x1 - 2 ? WALL.VIGIA : WALL.NONE);
    // 2. ilha: pilar de obsidiana por baixo de tudo
    for (let x = x0; x <= x1; x++) for (let y = floor; y <= floor + 6; y++) if (tiles[y * W + x] === TILE.LAVA || y === floor) set(x, y, y === floor ? TILE.BRONZE_PLATE : TILE.OBSIDIAN, WALL.NONE);
    for (let x = x0 + 2; x <= x1 - 2; x++) set(x, floor + 1, TILE.OBSIDIAN, WALL.NONE);
    // 3. paredes externas, torres de canto, teto e ameias
    for (let y = floor - 1; y >= floor - 9; y--) for (const x of [x0, x0 + 1, x1 - 1, x1]) {
      const door = y >= floor - 2 && (x === x0 || x === x0 + 1 || x === x1 || x === x1 - 1);
      if (door) { set(x, y, TILE.AIR); continue; }
      set(x, y, y % 4 === 0 && (x === x0 + 1 || x === x1 - 1) ? TILE.RUNE_STONE : TILE.VIGIA_BRICK);
    }
    for (let x = x0; x <= x1; x++) set(x, floor - 10, x === cx ? TILE.AIR : TILE.VIGIA_BRICK);                                       // teto (com a claraboia no meio)
    for (let x = x0; x <= x1; x++) if ((x - x0) % 2 === 0) set(x, floor - 11, TILE.VIGIA_BRICK, WALL.NONE);                          // ameias
    for (const [tx0, tx1] of [[x0, x0 + 3], [x1 - 3, x1]]) {                                                                          // torres de canto
      for (let y = floor - 10; y >= floor - 14; y--) for (let x = tx0; x <= tx1; x++) { const edge = x === tx0 || x === tx1; if (edge || y === floor - 14) set(x, y, y === floor - 14 && (x - tx0) % 2 ? TILE.AIR : TILE.VIGIA_BRICK, WALL.NONE); else set(x, y, TILE.AIR, WALL.VIGIA); }
      for (let x = tx0; x <= tx1; x++) set(x, floor - 10, TILE.VIGIA_BRICK);
    }
    // 4. segundo andar com escada, tochas e baús
    for (let x = x0 + 2; x <= x1 - 2; x++) if (Math.abs(x - cx) > 1) set(x, floor - 5, TILE.PLATFORM);
    for (let y = floor - 1; y >= floor - 5; y--) set(cx, y, TILE.LADDER);
    for (const [tx, ty] of [[x0 + 3, floor - 3], [x1 - 3, floor - 3], [x0 + 3, floor - 8], [x1 - 3, floor - 8], [cx - 5, floor - 3], [cx + 5, floor - 3]]) set(tx, ty, TILE.TORCH);
    addLootChest(w, cx - 4, floor - 1, 'fortaleza', rnd);
    addLootChest(w, cx + 4, floor - 6, 'fortaleza', rnd);
    // 5. pontes de bronze até as margens (dos dois lados)
    for (const dir of [-1, 1]) {
      let x = dir < 0 ? x0 - 1 : x1 + 1, n = 0;
      while (n++ < 60 && w.inBounds(x, floor) && (tiles[floor * W + x] === TILE.LAVA || tiles[floor * W + x] === TILE.AIR || tiles[floor * W + x] === TILE.OBSIDIAN)) {
        set(x, floor, TILE.PLATFORM, WALL.NONE);
        for (let dy = 1; dy <= 3; dy++) set(x, floor - dy, TILE.AIR, WALL.NONE);
        if (n % 5 === 3) for (let d = 1; d < 4; d++) if (tiles[(floor + d) * W + x] === TILE.LAVA || tiles[(floor + d) * W + x] === TILE.AIR) set(x, floor + d, TILE.PIPE, WALL.NONE);
        x += dir;
      }
      for (let k = 0; k < 4; k++) for (let dy = 1; dy <= 3; dy++) set(x + dir * k, floor - dy, TILE.AIR, WALL.NONE);                  // abre a boca do túnel na margem
    }
    w.coreFortresses.push({ x0, x1, floor, top: floor - 14, seeded: false, captain: rnd() < 0.6 });
  }
}
{
  const baseFinal = finalizeCore;
  finalizeCore = function (w) { baseFinal(w); buildCoreFortresses(w); };
  const baseHalls = updateCoreHalls;
  updateCoreHalls = function (g, dt) {
    baseHalls(g, dt);
    const w = g.world, p = g.player;
    for (const f of w.coreFortresses || []) {
      const cx = (f.x0 + f.x1) / 2 * T, d = Math.abs(p.cx - cx), dy = Math.abs(p.cy - f.floor * T);
      if (d > 120 * T || dy > 90 * T) { if (f.seeded) { g.mobs = g.mobs.filter((m) => m.fortress !== f); f.seeded = false; } continue; }
      if (f.seeded || d > 50 * T || dy > 40 * T) continue;
      f.seeded = true;
      const spawn = (kind, xTile, yFloor) => {
        const m = new Wildlife(kind, xTile * T, 0); m.y = yFloor * T - m.h - 0.01;
        if (m.collides(w, m.x, m.y)) return;
        m.fortress = f; m.keep = true; g.mobs.push(m);
      };
      const mid = (f.x0 + f.x1) >> 1;
      spawn('guardaobsidiana', mid - 6, f.floor); spawn('guardaobsidiana', mid + 5, f.floor);
      spawn('arqueirobrasa', mid - 6, f.floor - 5); spawn('arqueirobrasa', mid + 6, f.floor - 5);
      if (f.captain) spawn('capitaofortaleza', mid + 1, f.floor);
    }
  };
}
