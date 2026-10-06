// Folha com todos os quadros do tigre ao lado do urso, na escala do jogo (e ampliada),
// para conferir se ele está no mesmo padrão. Salva tests/tiger-sheet.png.
//   node tests/tiger-art-preview.cjs
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
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
    const url = await page.evaluate(() => {
      const Z = 3, sc = Z, cols = 5, N = TIGER_FRAME.count;
      const tw = TIGER_ART.W * sc, th = TIGER_ART.H * sc, cellW = Math.ceil(tw) + 16, cellH = Math.ceil(th) + 22;
      const bear = wildlifeSprite("bear", 0).normal, bw = bear.width * BEAR_RENDER_SCALE * sc, bh = bear.height * BEAR_RENDER_SCALE * sc;
      const out = document.createElement('canvas');
      out.width = cols * cellW; out.height = Math.ceil(N / cols) * cellH + Math.ceil(bh) + 30;
      const c = out.getContext('2d');
      c.imageSmoothingEnabled = false;
      c.fillStyle = '#26303a'; c.fillRect(0, 0, out.width, out.height);
      c.font = '12px monospace';
      for (let f = 0; f < N; f++) {
        const img = wildlifeSprite('tiger', f).normal, x = (f % cols) * cellW + 8, y = Math.floor(f / cols) * cellH + 16;
        c.fillStyle = '#34404c'; c.fillRect(x, y + th - 2, tw, 2);
        c.drawImage(img, x, y, tw, th);
        c.fillStyle = '#fff'; c.fillText('quadro ' + f, x, y - 3);
      }
      const y = Math.ceil(N / cols) * cellH + 20;
      c.fillStyle = '#fff'; c.fillText('urso (referência, mesma escala)', 8, y - 4);
      c.drawImage(bear, 8, y, bw, bh);
      c.drawImage(wildlifeSprite("tiger", TIGER_FRAME.idle).normal, 8 + bw + 20, y + bh - th, tw, th);
      return out.toDataURL();
    });
    require('node:fs').writeFileSync(path.join(__dirname, 'tiger-sheet.png'), Buffer.from(url.split(',')[1], 'base64'));
    console.log(errors.length ? 'ERROS:\n' + errors.join('\n') : 'ok');
  } finally { await browser.close(); }
})();
