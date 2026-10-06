// Um quadro do tigre bem ampliado (pixel a pixel), ao lado do urso na mesma ampliação.
//   node tests/tiger-zoom.cjs [quadro]
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const path = require('node:path');
(async () => {
  const f = +(process.argv[2] || 24);
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage();
    await page.goto('http://localhost/jogo-teste/');
    await page.waitForFunction(() => typeof game === 'object');
    const url = await page.evaluate((f) => {
      const Z = 6, t = wildlifeSprite('tiger', f).normal, b = wildlifeSprite('bear', 0).normal;
      const out = document.createElement('canvas');
      const bs = BEAR_RENDER_SCALE;
      out.width = (t.width + b.width * bs) * Z + 30; out.height = Math.max(t.height, b.height * bs) * Z + 20;
      const c = out.getContext('2d'); c.imageSmoothingEnabled = false;
      c.fillStyle = '#26303a'; c.fillRect(0, 0, out.width, out.height);
      c.drawImage(t, 10, out.height - 10 - t.height * Z, t.width * Z, t.height * Z);
      c.drawImage(b, 20 + t.width * Z, out.height - 10 - b.height * bs * Z, b.width * bs * Z, b.height * bs * Z);
      return out.toDataURL();
    }, f);
    require('node:fs').writeFileSync(path.join(__dirname, 'tiger-zoom.png'), Buffer.from(url.split(',')[1], 'base64'));
    console.log('ok');
  } finally { await browser.close(); }
})();
