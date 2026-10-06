// Bestiário: abate registra a ficha, a tecla B abre o livro, o admin libera tudo.
//   node tests/bestiary.cjs
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const assert = require('node:assert/strict');
const path = require('node:path');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.addInitScript(() => localStorage.removeItem('voo237.bestiario'));
    await page.goto('http://localhost/jogo-teste/');
    await page.waitForFunction(() => typeof game === 'object');
    const first = await page.evaluate(() => {
      finishOpening(game); Menu.root.hidden = true; game.intro.active = false; game.paused = false;
      game.inventoryUI.open = false; game.mapUI.open = false;
      const before = Bestiary.progress();
      // Mata um lobo, dois porcos, um slime e o tigre (pelo caminho normal: killMob)
      const kill = (m) => { m.hp = 0; killMob(game, m); };
      kill(new Wildlife('wolf', player.x + 40, player.y));
      kill(new Pig(player.x, player.y)); kill(new Pig(player.x, player.y));
      kill(new Monster('slime', player.x, player.y));
      const bomber = new Monster('bomber', player.x, player.y); bomber.hp = 5; killMob(game, bomber); // estourou sozinho: não conta
      const tiger = game.mobs.find((m) => m.kind === 'tiger') || new Wildlife('tiger', player.x, player.y);
      tiger.hp = 0; Bestiary.recordKill(tiger);
      return { before, after: Bestiary.progress(), kills: Bestiary.data.kills };
    });
    console.log(first);
    assert.equal(first.before[0], 0);
    assert.equal(first.kills.pig, 2);
    assert.equal(first.kills.bomber, undefined, 'dinamiteiro que estourou sozinho não conta');
    assert.equal(first.after[0], 4);
    // Tecla B abre o livro
    await page.keyboard.press('KeyB');
    await page.waitForTimeout(300);
    assert.ok(await page.evaluate(() => Bestiary.dialog.open), 'B abre o bestiário');
    await page.click('.bx-card[data-kind="tiger"]');
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(__dirname, 'bestiary-kills.png') });
    await page.keyboard.press('Escape');
    // Admin: liberar tudo
    await page.keyboard.press('F2');
    await page.click('[data-action="bestiary-all"]');
    const all = await page.evaluate(() => Bestiary.progress());
    assert.equal(all[0], all[1], 'admin libera todas as fichas');
    await page.click('[data-action="bestiary-open"]');
    await page.waitForTimeout(300);
    await page.click('.bx-card[data-kind="bear"]');
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(__dirname, 'bestiary-all.png') });
    await page.click('.bx-tabs [data-tab="agua"]');
    await page.click('.bx-card[data-kind="shark"]');
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(__dirname, 'bestiary-agua.png') });
    // Persistência: recarregar mantém os registros
    await page.evaluate(() => { localStorage.setItem('x', '1'); });
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('voo237.bestiario')).kills.pig);
    assert.equal(saved, 2);
    assert.deepEqual(errors, []);
    console.log('ok', all);
  } finally { await browser.close(); }
})();
