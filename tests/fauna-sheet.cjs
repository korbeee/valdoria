// Folha de quadros dos bichos novos em 4x: node tests/fauna-sheet.cjs [saida.png] [especies separadas por virgula] [quadros ex. 0-15]
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs = require('fs');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } }), errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(() => { localStorage.setItem('valdoria.autoconnect', '0'); });
    await page.goto('http://localhost/jogo-teste/');
    await page.waitForFunction(() => { try { return typeof frQuad === 'function'; } catch { return false; } });
    const kinds = (process.argv[3] || 'esquilo,raposaartico,zebra,texugo').split(','), [f0, f1] = (process.argv[4] || '0-15').split('-').map(Number), Z = +(process.argv[5] || 3);
    const url = await page.evaluate(([kinds, f0, f1, Z]) => {
      const frames = f1 - f0 + 1, cols = Math.min(8, frames), rows = Math.ceil(frames / cols);
      const cellW = Math.max(...kinds.map((k) => WILD_SIZES[WILDLIFE[k].shape][0])) * Z + 8, cellH = Math.max(...kinds.map((k) => WILD_SIZES[WILDLIFE[k].shape][1])) * Z + 18;
      const c = document.createElement('canvas'); c.width = cols * cellW; c.height = kinds.length * rows * cellH; const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
      const grad = g.createLinearGradient(0, 0, 0, c.height); grad.addColorStop(0, '#7d9ec8'); grad.addColorStop(1, '#b8cfdc'); g.fillStyle = grad; g.fillRect(0, 0, c.width, c.height);
      kinds.forEach((k, ki) => { const [W, H] = WILD_SIZES[WILDLIFE[k].shape]; for (let i = 0; i < frames; i++) { const f = f0 + i, col = i % cols, row = Math.floor(i / cols), ox = col * cellW + 4, oy = (ki * rows + row) * cellH + cellH - 8 - H * Z;
        g.fillStyle = '#6a5640'; g.fillRect(col * cellW, oy + H * Z, cellW, 3); let sp; try { sp = wildlifeSprite(k, f).normal; } catch (e) { g.fillStyle = '#f00'; g.font = '11px sans-serif'; g.fillText('ERRO ' + e.message.slice(0, 22), ox, oy + 20); continue; }
        g.drawImage(sp, ox, oy, W * Z, H * Z); g.fillStyle = '#fff'; g.font = '11px sans-serif'; g.fillText(k + ' f' + f, ox, (ki * rows + row) * cellH + 12); } });
      return c.toDataURL();
    }, [kinds, f0, f1, Z]);
    if (errors.length) console.log(errors.join('\n'));
    fs.writeFileSync(process.argv[2] || __dirname + '/fauna-sheet.png', Buffer.from(url.split(',')[1], 'base64'));
  } finally { await browser.close(); }
})().catch((e) => { console.error(e); process.exit(1); });
