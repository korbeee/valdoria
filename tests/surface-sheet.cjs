// Folha da vegetação/itens de chão em 4x: node tests/surface-sheet.cjs [saida.png] [kinds separados por virgula] [bioma]
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs = require('fs');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } }), errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(() => { localStorage.setItem('valdoria.autoconnect', '0'); });
    await page.goto('http://localhost/jogo-teste/');
    await page.waitForFunction(() => { try { return typeof surfaceSprite === 'function'; } catch { return false; } });
    const kinds = (process.argv[3] || 'grass,tall,fern,bush,berry,agave,barril,babosa').split(','), biome = process.argv[4] || 'forest';
    const url = await page.evaluate(([kinds, biome]) => {
      const Z = 3, cw = 4 * 46 * Z, rowH = 40 * Z;
      const c = document.createElement('canvas'); c.width = cw; c.height = kinds.length * rowH; const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
      const grad = g.createLinearGradient(0, 0, 0, c.height); grad.addColorStop(0, '#6b8fc4'); grad.addColorStop(1, '#a8c4d8'); g.fillStyle = grad; g.fillRect(0, 0, c.width, c.height);
      kinds.forEach((k, r) => { g.fillStyle = '#5a4a38'; g.fillRect(0, r * rowH + rowH - 4 * Z, cw, 4 * Z); for (let v = 0; v < 4; v++) { const s = surfaceSprite(k, biome, v); g.drawImage(s, v * 46 * Z + 3 * Z, r * rowH + rowH - 4 * Z - (s.height - 2) * Z, s.width * Z, s.height * Z); } g.fillStyle = '#fff'; g.font = '12px sans-serif'; g.fillText(k, 4, r * rowH + 14); });
      return c.toDataURL();
    }, [kinds, biome]);
    if (errors.length) console.log(errors.join('\n'));
    fs.writeFileSync(process.argv[2] || __dirname + '/surface-sheet.png', Buffer.from(url.split(',')[1], 'base64'));
  } finally { await browser.close(); }
})().catch((e) => { console.error(e); process.exit(1); });
