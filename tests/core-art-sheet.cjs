// Folha de arte do Ossário: árvores, âmbar e fóssil ampliados (node tests/core-art-sheet.cjs [saida.png])
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs = require('fs');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.addInitScript(() => { localStorage.setItem('valdoria.autoconnect', '0'); });
    await page.goto('http://localhost/jogo-teste/');
    await page.waitForFunction(() => typeof game === 'object' && typeof CORE_ECO_ART === 'object');
    const url = await page.evaluate(() => {
      const c = document.createElement('canvas'); c.width = 1280; c.height = 700; const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
      g.fillStyle = '#1b1620'; g.fillRect(0, 0, 1280, 700);
      CORE_ECO_ART[3].tree.forEach((t, i) => g.drawImage(t, i * 4 * 66 - 0, 0, t.width * 4, t.height * 4));
      for (const [k, t] of [[0, TILE.AMBER], [1, TILE.FOSSIL]]) { const tx = MATERIAL_TEX[t].toCanvas(); for (let a = 0; a < 2; a++) for (let b = 0; b < 2; b++) g.drawImage(tx, 0, 0, 64, 64, 10 + k * 280 + a * 128, 380 + b * 128, 128, 128); }
      return c.toDataURL();
    });
    fs.writeFileSync(process.argv[2] || __dirname + '/core-art-sheet.png', Buffer.from(url.split(',')[1], 'base64'));
  } finally { await browser.close(); }
})().catch((e) => { console.error(e); process.exit(1); });
