// Divisas entre biomas (subsolo incluso): node tests/border-shot.cjs [semente] [prefixo] [pares ex. 0-8,8-9,1-4] [zoom]
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs = require('fs');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const seed = +(process.argv[2] || 4242), prefix = process.argv[3] || __dirname + '/border', pairs = (process.argv[4] || '0-8,8-9').split(',').map((p) => p.split('-').map(Number)), zoom = +(process.argv[5] || 2);
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } }), errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(() => { localStorage.setItem('valdoria.autoconnect', '0'); });
    await page.goto('http://localhost/jogo-teste/');
    await page.waitForFunction(() => { try { return typeof game === 'object' && typeof newWorld === 'function'; } catch { return false; } });
    const shots = await page.evaluate(async ([seed, pairs, zoom]) => {
      await newWorld('pequeno', () => {}, seed);
      finishOpening(game); Menu.root.hidden = true;
      const w = world, c = document.querySelector('canvas'); c.width = 960; c.height = 600;
      game.adminNightVision = true; game.zoom = zoom; game.time = 0.3;
      renderer.drawUI = () => {}; renderer.drawObjective = () => {}; game.inventoryUI.drawVitals = () => {}; drawFlightHud = () => {}; drawStoryHud = () => {}; drawNpcBubbles = () => {}; drawBossBar = () => {}; drawFpsCounter = () => {}; drawLavatoryCaption = () => {};
      game.player.x = 8; game.player.y = 8;
      const out = [];
      for (const [a, b] of pairs) {
        let bx = -1;
        for (let x = 30; x < w.w - 30; x++) if ((w.biome[x] === a && w.biome[x + 1] === b) || (w.biome[x] === b && w.biome[x + 1] === a)) { bx = x; break; }
        if (bx < 0) { out.push(null); continue; }
        game.cam.x = bx * T - 480 / zoom; game.cam.y = w.surface[bx] * T - 200 / zoom;
        for (let i = 0; i < 6; i++) update(1 / 60);
        game.cam.x = bx * T - 480 / zoom; game.cam.y = w.surface[bx] * T - 200 / zoom;
        renderer.render(game); if (renderer.bg) { renderer.bg.previousBiome = null; renderer.bg.blend = 1; renderer.bg.activeBiome = a; } renderer.render(game);
        out.push(c.toDataURL());
      }
      return out;
    }, [seed, pairs, zoom]);
    if (errors.length) console.log(errors.join('\n'));
    shots.forEach((d, i) => { if (d) { fs.writeFileSync(`${prefix}-${pairs[i].join('-')}.png`, Buffer.from(d.split(',')[1], 'base64')); console.log('ok', pairs[i].join('-')); } else console.log('sem divisa', pairs[i].join('-')); });
  } finally { await browser.close(); }
})().catch((e) => { console.error(e); process.exit(1); });
