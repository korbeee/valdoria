// Mudas de árvore (js/saplings.js) + ímã de itens no chão (js/item-actions.js).
// node tests/saplings.cjs  (PLAYWRIGHT_PATH apontando para o playwright)
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs = require('fs');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://localhost/jogo-teste/?nocache=' + Date.now());
  await page.waitForFunction(() => typeof game === 'object' && typeof newWorld === 'function');
  const out = await page.evaluate(async () => {
    const log = [], check = (ok, msg) => log.push((ok ? '✓ ' : '✗ ') + msg);
    await newWorld('pequeno', () => {}, 4242);
    finishOpening(game); Menu.root.hidden = true; game.paused = false; game.adminGod = true; game.time = 0.3;
    canvas.width = 1280; canvas.height = 800; window.toast = () => {};
    const w = world, p = game.player;
    const step = (n = 1) => { for (let i = 0; i < n; i++) { game.cam.x = p.cx - 640 / game.zoom; game.cam.y = p.cy - 400 / game.zoom; game.monsterTimer = 1e9; update(1 / 60); } };
    const stand = (tx) => { p.x = tx * T; p.y = (w.groundTop(tx)) * T - p.h - 0.01; p.vx = p.vy = 0; };
    game.mobs = [];

    // 1) árvore tomba -> muda da espécie dela
    let tx = 0;
    for (let x = 300; x < w.w - 300 && !tx; x++) { const gy = w.groundTop(x); if (w.biomeAt(x) === BIOME.FOREST && w.getTile(x, gy - 1) === TILE.TRUNK && treeIsWhole(w, x, gy - 1) && w.skyGapBottom[x] <= w.skyGapTop[x]) tx = x; }
    check(tx > 0, 'achou uma árvore de floresta');
    const species = treeSpeciesAt(tx, w.biomeAt(tx), w.seed);
    stand(tx - 30); game.drops = [];
    startTreeFall(game, tx, w.groundTop(tx) - 1);
    for (let i = 0; i < 240 && game.fallingTrees.length; i++) step();
    const sap = game.drops.find((d) => SAPLING_BY_ITEM.has(d.item));
    check(!!sap && SAPLING_BY_ITEM.get(sap.item) === species, 'a árvore (' + species + ') soltou ' + (sap ? ITEM_DEFS[sap.item].name : 'nada'));

    // 2) ímã: parado a ~1 bloco do item, ele vem sozinho
    game.drops = []; stand(tx - 30);
    dropItem(game, ITEM.WOOD, 3, p.cx + p.w / 2 + 18, p.y + p.h - 8, 0); game.drops[0].delay = 0;
    const had = game.inventory.count?.(ITEM.WOOD) ?? null;
    step(60);
    check(game.drops.length === 0, 'item a ~1 bloco voou até o jogador e foi pego');
    dropItem(game, ITEM.WOOD, 1, p.cx + 6 * T, p.y + p.h - 8, 0); game.drops[0].delay = 0; step(60);
    check(game.drops.length === 1, 'item a 6 blocos fica no chão');
    game.drops = []; game.inventory.add(ITEM.STONE, 5);
    game.selected = game.inventory.slots.findIndex((s) => s?.item === ITEM.STONE);
    dropSelected(game, false); step(60);
    check(game.drops.length === 1, 'o que acabei de soltar com Q não volta na hora');
    step(90); p.x = game.drops[0].x - p.w / 2 - 26; step(40);
    check(game.drops.length === 0, '...e chegando a ~1 bloco dele, ele vem' + (game.drops[0] ? ' ' + JSON.stringify({ dx: game.drops[0].x - p.cx, dy: p.y + p.h * 0.6 - game.drops[0].y, delay: game.drops[0].delay, pw: p.w, vy: game.drops[0].vy }) : ''));

    // 3) plantar: uma muda de coqueiro na floresta
    let px = 0;
    for (let x = tx + 40; x < w.w - 300 && !px; x++) { const gy = w.groundTop(x); if (w.getTile(x, gy) === TILE.GRASS && !saplingSpotProblem(w, x, gy - 1) && w.skyGapBottom[x] <= w.skyGapTop[x]) { let ok = true; for (let y = gy - 16; y < gy; y++) if (w.getTile(x, y) !== TILE.AIR) ok = false; if (ok) px = x; } }
    check(px > 0, 'achou um gramado livre');
    const gy = w.groundTop(px);
    for (let i = 0; i < game.inventory.slots.length; i++) game.inventory.slots[i] = null;
    game.inventory.add(ITEM.SAPLING_PALM, 2); game.inventory.add(ITEM.SAPLING_MAPLE, 1);
    game.selected = game.inventory.slots.findIndex((s) => s?.item === ITEM.SAPLING_PALM);
    stand(px - 3);
    check(!tryPlace(px, gy - 3), 'não planta no ar');
    check(tryPlace(px, gy - 1) && w.getTile(px, gy - 1) === TILE.SAPLING, 'planta a muda no gramado');
    check(!tryPlace(px + 1, gy - 1), 'não planta colado em outra muda');
    // 4) arrancar devolve a muda
    removeTile(px, gy - 1);
    check(w.getTile(px, gy - 1) === TILE.AIR && game.inventory.slots.some((s) => s?.item === ITEM.SAPLING_PALM && s.count === 2), 'arrancar devolve a muda');
    tryPlace(px, gy - 1);
    // 5) cresce como coqueiro, mesmo na floresta
    const rec = w.saplings.get((gy - 1) * w.w + px); rec.age = rec.grow - 0.05; step(10);
    let h = 0; while (w.getTile(px, gy - 1 - h) === TILE.TRUNK) h++;
    check(h >= 4, 'a muda virou árvore (' + h + ' blocos de tronco)');
    check(w.treeSpecies?.get(px) === 'palm' && canopyFor(px, w.biomeAt(px), w.seed) === canopyOfSpecies('palm', px, w.seed), 'a copa é de coqueiro, não da floresta');
    // 6) chuva acelera
    const mx = px + 6, my = w.groundTop(mx);
    if (!saplingSpotProblem(w, mx, my - 1)) {
      game.selected = game.inventory.slots.findIndex((s) => s?.item === ITEM.SAPLING_MAPLE); tryPlace(mx, my - 1);
      const r2 = w.saplings.get((my - 1) * w.w + mx);
      game.weather = createWeather(); game.weather.rain = 1; game.weather.timer = 9999; setWeatherEvent(game, 'rain', 9999, 1);
      const a0 = r2.age; step(60); game.weather.rain = 1;
      check(r2.age - a0 > 1.5, 'na chuva cresce mais rápido (' + (r2.age - a0).toFixed(2) + ' s em 1 s)');
    }
    // foto: mudas plantadas + árvore crescida
    game.weather = createWeather();
    for (const [k, i] of [['oak', 0], ['pine', 3], ['blossom', 6], ['acacia', 9], ['willow', 12]]) {
      const x = px + 10 + i, yy = w.groundTop(x) - 1;
      if (saplingSpotProblem(w, x, yy)) continue;
      w.setTile(x, yy, TILE.SAPLING); w.saplings.set(yy * w.w + x, { x, y: yy, species: k, age: 999, grow: 99999 });
    }
    stand(px + 4); game.zoom = 3; step(2);
    game.cam.x = (px + 12) * T - canvas.width / game.zoom / 2; game.cam.y = (gy - 6) * T - canvas.height / game.zoom / 2;
    w.computeLight(px + 12, gy - 4); w.composeLight(game.daylight); renderer.render(game);
    window.__shot = canvas.toDataURL();
    return log;
  }).catch((e) => [String(e.stack || e)]);
  const shot = await page.evaluate(() => window.__shot).catch(() => null);
  if (shot) fs.writeFileSync(__dirname + '/saplings.png', Buffer.from(shot.split(',')[1], 'base64'));
  console.log(out.join('\n'));
  console.log(errors.length ? 'ERROS: ' + errors.slice(0, 5).join(' | ') : 'sem erros no console');
  await browser.close();
  if (errors.length || out.some((l) => !l.startsWith('✓'))) process.exit(1);
})();
