// Folha do Dinamiteiro: os 20 quadros ampliados (andar, pavio aceso em 4 estágios, parado),
// ao lado do Canibal na mesma escala. Salva tests/bomber-sheet.png.
//   node tests/bomber-art-preview.cjs
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('http://localhost/jogo-teste/');
    await page.waitForFunction(() => typeof game === 'object');
    const url = await page.evaluate(() => {
      const Z = 5, sp = renderer.monsterSprites.bomber, und = renderer.monsterSprites.undead, cols = 10;
      const fw = sp.frames[0].width, fh = sp.frames[0].height, cw = fw * Z + 10, ch = fh * Z + 22;
      const out = document.createElement('canvas');
      out.width = cols * cw; out.height = 2 * ch + fh * Z + 40;
      const c = out.getContext('2d'); c.imageSmoothingEnabled = false;
      c.fillStyle = '#2b2f3a'; c.fillRect(0, 0, out.width, out.height);
      c.font = '12px monospace';
      sp.frames.forEach((img, f) => {
        const x = (f % cols) * cw + 5, y = Math.floor(f / cols) * ch + 16;
        c.drawImage(img, x, y, fw * Z, fh * Z);
        c.fillStyle = '#fff'; c.fillText('quadro ' + f, x, y - 3);
      });
      const y = 2 * ch + 20, u = und.frames[0];
      c.drawImage(sp.frames[0], 5, y, fw * Z, fh * Z);
      c.drawImage(u, 5 + fw * Z + 10, y + (fh - u.height) * Z, u.width * Z, u.height * Z);
      c.drawImage(sp.hurt[12], 5 + fw * Z + 20 + u.width * Z, y, fw * Z, fh * Z);
      return out.toDataURL();
    });
    require('node:fs').writeFileSync(path.join(__dirname, 'bomber-sheet.png'), Buffer.from(url.split(',')[1], 'base64'));
    console.log(errors.length ? errors.join('\n') : 'ok');
  } finally { await browser.close(); }
})();
