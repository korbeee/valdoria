// Balde (js/bucket.js): enche na água tirando um bloco do lago, despeja e a água continua escorrendo.
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs = require('fs');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } }), errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('http://localhost/jogo-teste/');
    await page.waitForFunction(() => typeof game === 'object' && typeof useBucket === 'function');
    const result = await page.evaluate(() => {
      const check = (ok, msg) => { if (!ok) throw Error(msg); };
      finishOpening(game); Menu.root.hidden = true;
      check(RECIPES.some((r) => r.resultado.item === ITEM.BUCKET), 'Sem receita de balde');
      const w = world, p = game.player, px = Math.floor(p.cx / T), floor = w.surface[px];
      // tanque de pedra 12 x 4 cheio à direita do jogador, e um vão vazio à esquerda
      const x0 = px + 3, x1 = px + 14, y0 = floor - 4;
      for (let x = px - 14; x <= x1 + 1; x++) for (let y = floor - 12; y <= floor + 1; y++) {
        const wall = x === x0 - 1 || x === x1 + 1 || y === floor + 1 || (x <= px - 4 && y === floor - 1 && x >= px - 12);
        w.setTile(x, y, wall ? TILE.STONE : TILE.AIR); w.water[y * w.w + x] = 0;
      }
      for (let x = x0; x <= x1; x++) for (let y = y0; y <= floor; y++) w.water[y * w.w + x] = WATER_MAX;
      const sum = () => { let s = 0; for (let x = px - 14; x <= x1 + 1; x++) for (let y = floor - 12; y <= floor + 1; y++) s += Math.min(WATER_MAX, w.water[y * w.w + x]); return s; };
      const before = sum();
      game.inventory.slots.fill(null); game.inventory.slots[0] = { item: ITEM.BUCKET, count: 1 }; game.selected = 0;
      // clique um pouco acima da superfície: conta como a água logo abaixo
      useBucket(game, x0 + 1, y0 - 1, true);
      check(game.inventory.slots[0].item === ITEM.BUCKET_WATER, 'Balde não encheu');
      check(sum() === before - BUCKET_UNITS, `Água tirada errada: ${before - sum()}`);
      // tirou da superfície, perto do clique: a linha de cima baixou, o fundo continua cheio
      check(w.water[y0 * w.w + x0 + 1] < WATER_MAX && w.water[floor * w.w + x0 + 1] === WATER_MAX, 'Não tirou de cima');
      // cheio + clique no seco: despeja
      useBucket(game, px - 8, floor - 3, true);
      check(game.inventory.slots[0].item === ITEM.BUCKET, 'Balde não esvaziou');
      check(sum() === before, 'Água sumiu ou apareceu ao despejar');
      check(w.water[(floor - 3) * w.w + px - 8] === WATER_MAX, 'Não despejou no lugar do clique');
      // física: a água despejada cai e se espalha no chão
      game.paused = false;
      for (let i = 0; i < 60; i++) updateWater(game, 1 / 60);
      check(w.water[(floor - 3) * w.w + px - 8] === 0, 'Água despejada ficou parada no ar');
      let spread = 0;
      for (let x = px - 12; x <= px - 4; x++) if (w.water[(floor - 2) * w.w + x]) spread++;
      check(spread >= 3, 'Água despejada não escorreu: ' + spread); // (lâmina fina seca sozinha, como toda poça)
      // poça rasa demais não enche
      for (let x = px - 12; x <= px - 4; x++) for (let y = floor - 12; y <= floor; y++) w.water[y * w.w + x] = 0;
      w.water[(floor - 2) * w.w + px - 8] = 5;
      useBucket(game, px - 8, floor - 2, true);
      check(game.inventory.slots[0].item === ITEM.BUCKET && w.water[(floor - 2) * w.w + px - 8] === 5, 'Encheu numa poça rasa');
      // não despeja dentro de bloco
      game.inventory.slots[0].item = ITEM.BUCKET_WATER;
      useBucket(game, x0 - 1, floor - 1, true);
      check(game.inventory.slots[0].item === ITEM.BUCKET_WATER, 'Despejou dentro da pedra');
      // ícones
      const c = makeCanvas(64, 32), ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = false;
      ctx.drawImage(renderer.tex.itemAtlas, ITEM.BUCKET * T, 0, T, T, 0, 0, 32, 32);
      ctx.drawImage(renderer.tex.itemAtlas, ITEM.BUCKET_WATER * T, 0, T, T, 32, 0, 32, 32);
      return c.toDataURL();
    });
    fs.writeFileSync(__dirname + '/bucket-icons.png', Buffer.from(result.split(',')[1], 'base64'));
    if (errors.length) throw Error(errors.join('\n'));
    console.log('bucket ok');
  } finally { await browser.close(); }
})().catch((e) => { console.error(e); process.exit(1); });
