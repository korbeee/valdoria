// Atalhos do inventário: Ctrl+clique exclui (vai para a lixeira) e Alt+clique favorita.
// Favorito fica na mochila no "Guardar mochila", não sai do lugar ao organizar e não é excluído.
//   node tests/inventory-shortcuts.cjs
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const assert = require('node:assert/strict');
const path = require('node:path');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto('http://localhost/jogo-teste/');
    await page.waitForFunction(() => typeof game === 'object');
    await page.evaluate(() => {
      finishOpening(game); Menu.root.hidden = true; game.intro.active = false; game.paused = false;
      const ui = game.inventoryUI, inv = ui.inv;
      inv.slots.fill(null);
      inv.slots[HOTBAR_SIZE] = { item: ITEM.DIRT, count: 40 };
      inv.slots[HOTBAR_SIZE + 1] = { item: ITEM.STONE, count: 12 };
      inv.slots[HOTBAR_SIZE + 3] = { item: ITEM.WOOD, count: 5 };
      ui.open = true; ui.held = null; ui.trash = null;
      // Clique real no canvas cai sempre no espaço escolhido pelo teste
      window.__target = null;
      const hitTest = ui.hitTest.bind(ui);
      ui.hitTest = (x, y) => window.__target || hitTest(x, y);
    });
    const click = async (hit, mods) => {
      await page.evaluate((h) => { window.__target = h; }, hit);
      for (const k of mods) await page.keyboard.down(k);
      await page.mouse.click(400, 300);
      for (const k of mods) await page.keyboard.up(k);
    };
    const slot = (d) => page.evaluate((d) => game.inventoryUI.inv.slots[HOTBAR_SIZE + d], d);
    const H = await page.evaluate(() => HOTBAR_SIZE);

    // Alt+clique favorita a pedra
    await click({ type: 'slot', i: H + 1 }, ['Alt']);
    assert.equal((await slot(1)).fav, true, 'Alt+clique favorita');
    // Ctrl+clique no favorito não exclui
    await click({ type: 'slot', i: H + 1 }, ['Control']);
    assert.ok(await slot(1), 'favorito não é excluído');
    // Ctrl+clique na terra: vai para a lixeira
    await click({ type: 'slot', i: H }, ['Control']);
    assert.equal(await slot(0), null, 'Ctrl+clique exclui');
    assert.deepEqual(await page.evaluate(() => game.inventoryUI.trash), { item: await page.evaluate(() => ITEM.DIRT), count: 40 }, 'foi para a lixeira');
    // Organizar: o favorito fica no lugar
    await page.evaluate(() => game.inventoryUI.inv.sortRange(HOTBAR_SIZE, game.inventoryUI.inv.slots.length));
    assert.equal((await slot(1)).item, await page.evaluate(() => ITEM.STONE), 'favorito parado ao organizar');
    assert.equal((await slot(0)).item, await page.evaluate(() => ITEM.WOOD), 'os outros se arrumam em volta');
    // Guardar mochila num baú: o favorito fica
    const chest = await page.evaluate(() => {
      const ui = game.inventoryUI;
      ui.container = { slots: Array(20).fill(null) };
      ui.storeAll();
      const r = { chest: ui.container.slots.filter(Boolean), toast: game.toast.text };
      ui.container = null;
      return r;
    });
    assert.equal(chest.chest.length, 1, 'só a madeira foi para o baú');
    assert.equal((await slot(1)).fav, true, 'favorito continua na mochila');
    console.log('toast:', chest.toast);
    // Alt+clique de novo desfavorita
    await click({ type: 'slot', i: H + 1 }, ['Alt']);
    assert.equal((await slot(1)).fav, undefined, 'Alt+clique desfavorita');
    await click({ type: 'slot', i: H + 1 }, ['Alt']);

    // Desenha o inventário com o favorito e o tooltip
    await page.evaluate(() => {
      window.__target = null;
      const cv = document.getElementById('game'); cv.width = 1280; cv.height = 720;
      renderer.render(game);
    });
    await page.screenshot({ path: path.join(__dirname, 'inventory-fav.png') });
    assert.deepEqual(errors, []);
    console.log('ok');
  } finally { await browser.close(); }
})();
