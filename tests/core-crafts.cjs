// Crafts do Coração: blocos, ferramentas, armaduras, acessórios, receitas. Gera tests/_cr.png com blocos e ícones.
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs = require('fs');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://localhost/jogo-teste/?nocache=' + Date.now());
  await page.waitForFunction(() => typeof game === 'object' && typeof ITEM === 'object' && ITEM.MAGNET_PICK);
  const r = await page.evaluate(async () => {
    const log = [], check = (ok, msg) => log.push((ok ? '✓ ' : '✗ ') + msg);
    const keys = ['BONE_BRICK', 'AMBER_GLASS', 'AMBER_LANTERN', 'OBSIDIAN_BRICK'];
    const tileIds = Object.values(TILE), itemIds = Object.values(ITEM);
    check(new Set(tileIds).size === tileIds.length && Math.max(...tileIds) < 256, 'ids de bloco únicos, max ' + Math.max(...tileIds));
    check(new Set(itemIds).size === itemIds.length, 'ids de item únicos, max ' + Math.max(...itemIds));
    for (const k of keys) check(TILE_DEFS[TILE[k]]?.drop === ITEM[k] && ITEM_DEFS[ITEM[k]].place === TILE[k] && MATERIAL_TEX[TILE[k]], k + ' ok');
    check(SOLID[TILE.AMBER_GLASS] === 1 && LIGHT_EMIT[TILE.AMBER_LANTERN] >= 12, 'tabelas de sólido/luz');
    const recs = RECIPES.filter((x) => /magnetita|âmbar|osso|obsidiana|Vigias|fóssil/.test(x.nome) && x.estacao);
    check(recs.length >= 12, recs.length + ' receitas novas');
    for (const x of recs) { if (x.ingredientes.some(([i]) => i == null || !ITEM_DEFS[i]?.name) || !ITEM_DEFS[x.resultado.item]?.name) check(false, 'receita com item indefinido: ' + x.nome); }
    const names = ['MAGNET_PICK', 'MAGNET_AXE', 'MAGNET_HAMMER', 'MAGNET_ARMOR', 'BRONZE_ARMOR', 'MAGNET_CHARM', 'AMBER_CHARM', 'FOSSIL_SPEAR'];
    for (const n of names) check(ITEM_DEFS[ITEM[n]]?.name && (true) && (ITEM_DEFS[ITEM[n]].descricao || '').length <= 110, n + ' definido, descrição curta');
    await newWorld('medio', () => {}, 4242);
    finishOpening(game); Menu.root.hidden = true; game.paused = false; GAME_OPTIONS.help = false; applyOptions(game); window.toast = () => {};
    const p = game.player; game.adminGod = false;
    // amuleto de calor e traje
    game.accessories = Array(5).fill(null);
    game.outfit = null; check(!coreSuit(game), 'sem proteção: calor normal');
    game.accessories[0] = { item: ITEM.AMBER_CHARM, count: 1 }; check(coreSuit(game), 'amuleto de âmbar protege do calor');
    game.accessories[0] = null; game.outfit = ITEM.BRONZE_ARMOR; check(coreSuit(game) && playerDefense(game) > 0.27, 'armadura dos Vigias protege e dá defesa');
    game.outfit = ITEM.MAGNET_ARMOR; check(Math.abs(playerDefense(game) - 0.32) < 0.01, 'peitoral de magnetita: defesa 32%');
    game.outfit = null;
    // ímã: item a 6 blocos chega ao jogador
    game.accessories[0] = { item: ITEM.MAGNET_CHARM, count: 1 };
    game.drops = [{ item: ITEM.STONE, count: 1, x: p.cx + 6 * T, y: p.y + p.h * 0.6, vx: 0, vy: 0, age: 0, delay: 0 }];
    const d0 = Math.abs(game.drops[0].x - p.cx);
    for (let i = 0; i < 120 && game.drops.length; i++) { game.monsterTimer = 1e9; updateDrops(game, 1 / 60); }
    check(game.drops.length === 0 || Math.abs(game.drops[0].x - p.cx) < d0 - 20, 'ímã puxa o item de longe');
    game.accessories[0] = null;
    // render: blocos num quadro
    canvas.width = 1280; canvas.height = 720; game.zoom = 3; game.adminGod = true; game.adminNightVision = true;
    const w = world, x0 = Math.floor(w.w / 2) + 40, y0 = w.coreTop[x0] + 30;
    for (let y = y0 - 8; y < y0 + 10; y++) for (let x = x0 - 12; x < x0 + 14; x++) w.setTile(x, y, TILE.AIR);
    keys.forEach((k, i) => { for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) w.setTile(x0 - 11 + i * 5 + x, y0 - 3 + y, TILE[k]); });
    for (let x = x0 - 12; x < x0 + 14; x++) w.setTile(x, y0 + 3, TILE.DEEPSTONE);
    p.x = x0 * T; p.y = (y0 + 2) * T - p.h; p.vx = p.vy = 0;
    game.cam.x = (x0 - 4) * T - canvas.width / game.zoom / 2; game.cam.y = (y0 - 1) * T - canvas.height / game.zoom / 2;
    w.computeLight(x0, y0); w.composeLight(game.daylight); renderer.render(game);
    // ícones ampliados no canto
    const g = canvas.getContext('2d'); g.imageSmoothingEnabled = false;
    names.forEach((n, i) => { g.fillStyle = "#222"; g.fillRect(6 + i * 76, 6, 72, 72); g.drawImage(renderer.tex.itemAtlas, ITEM[n] * T, 0, T, T, 10 + i * 76, 10, 64, 64); });
    return { log, png: canvas.toDataURL() };
  }).catch((e) => ({ log: [String(e.stack || e)] }));
  console.log(r.log.join('\n')); if (r.png) fs.writeFileSync('tests/_cr.png', Buffer.from(r.png.split(',')[1], 'base64'));
  console.log(errors.length ? 'ERROS: ' + errors.slice(0, 5).join(' | ') : 'sem erros no console');
  await browser.close();
})();
