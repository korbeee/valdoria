// Screenshots do novo jogo: escolha do mundo, criador (todas as abas) e carregamento, no desktop e no celular.
// Também confere erros de console e se a semente chega ao mundo gerado.
//   node tests/menu-shots.cjs
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const path = require('node:path');
const out = (n) => path.join(__dirname, n);

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const errors = [];
  try {
    for (const [tag, viewport] of [['desk', { width: 1366, height: 768 }], ['mobile', { width: 390, height: 844 }]]) {
      const page = await browser.newPage({ viewport });
      page.on('pageerror', (e) => errors.push(tag + ': ' + e.message));
      page.on('console', (m) => { if (m.type() === 'error') errors.push(tag + ': ' + m.text()); });
      await page.addInitScript(() => localStorage.clear());
      await page.goto('http://localhost/jogo-teste/');
      await page.waitForFunction(() => typeof game === 'object');
      await page.click('[data-go="world"]');
      await page.waitForTimeout(500);
      await page.click('[data-size="medio"]');
      await page.fill('#world-seed', 'valdoria');
      await page.waitForTimeout(300);
      await page.screenshot({ path: out(`menu-${tag}-world.png`) });
      await page.click('[data-action="world-next"]');
      await page.waitForTimeout(500);
      await page.screenshot({ path: out(`menu-${tag}-creator-body.png`) });
      if (tag === 'mobile') { await page.close(); continue; }
      for (const tab of ['hair', 'clothes', 'extras']) {
        await page.click(`[data-tab="${tab}"]`);
        await page.waitForTimeout(250);
        await page.screenshot({ path: out(`menu-${tag}-creator-${tab}.png`) });
      }
      // Monta um visual completo e começa
      await page.evaluate(() => {
        Object.assign(Menu.draft, { hairStyle: 8, hair: 6, beard: 0, hat: 4, hatColor: 4, glasses: 1, top: 4, jacket: 11, pattern: 0, legs: 1, boots: 4 });
        Menu.mode = 'dance';
        Menu.refreshCreator();
      });
      await page.waitForTimeout(400);
      await page.screenshot({ path: out(`menu-${tag}-creator-custom.png`) });
      await page.click('#cc-confirm');
      await page.waitForTimeout(700);
      await page.screenshot({ path: out(`menu-${tag}-loading.png`) });
      await page.waitForFunction(() => Menu.root.hidden, null, { timeout: 90000 });
      const seed = await page.evaluate(() => [game.world.seed, game.worldSize, PLAYER_LOOK.hairStyle, JSON.parse(localStorage.getItem('voo237.personagem')).hat]);
      console.log('mundo gerado com semente/tamanho/cabelo/chapéu:', seed.join(' / '));
      await page.close();
    }
  } finally { await browser.close(); }
  console.log(errors.length ? 'ERROS:\n' + errors.join('\n') : 'sem erros');
})();
