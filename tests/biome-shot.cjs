// Fotos da superfície de cada bioma, sem escuridão e sem HUD: node tests/biome-shot.cjs [seed] [prefixo] [biomas ex. 7,8,9] [zoom] [offset]
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs = require('fs');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const NIGHT = process.argv[7] === "night", seed = +(process.argv[2] || 4242), prefix = process.argv[3] || __dirname + '/biome', list = (process.argv[4] || '7,8,9').split(',').map(Number), zoom = +(process.argv[5] || 3), off = +(process.argv[6] || 0);
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } }), errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(() => { localStorage.setItem('valdoria.autoconnect', '0'); });
    await page.goto('http://localhost/jogo-teste/');
    await page.waitForFunction(() => { try { return typeof game === 'object' && typeof newWorld === 'function'; } catch { return false; } });
    const shots = await page.evaluate(async ([seed, list, zoom, off, process_night]) => {
      await newWorld('pequeno', () => {}, seed);
      finishOpening(game); Menu.root.hidden = true;
      const w = world, c = document.querySelector('canvas'); c.width = 960; c.height = 600;
      const night = process_night; game.adminNightVision = !night; game.zoom = zoom; game.time = night ? 0.78 : 0.3;
      renderer.drawUI = () => {}; renderer.drawObjective = () => {}; game.inventoryUI.drawVitals = () => {}; drawFlightHud = () => {}; drawStoryHud = () => {}; drawNpcBubbles = () => {}; drawBossBar = () => {}; drawFpsCounter = () => {}; drawLavatoryCaption = () => {};
      game.player.x = 8; game.player.y = 8;
      const out = {};
      for (const b of list) {
        let best = null;
        for (let x = 0; x < w.w; x++) if (w.biome[x] === b) { let e = x; while (e + 1 < w.w && w.biome[e + 1] === b) e++; if (!best || e - x > best[1] - best[0]) best = [x, e]; x = e; }
        if (!best) { out[b] = null; continue; }
        const cx = Math.floor((best[0] + best[1]) / 2) + off;
        game.cam.x = cx * T - 480 / zoom; game.cam.y = w.surface[cx] * T - 360 / zoom;
        for (let i = 0; i < (process_night ? 160 : 10); i++) update(1 / 60);
        game.cam.x = cx * T - 480 / zoom; game.cam.y = w.surface[cx] * T - 360 / zoom;
        renderer.render(game); if (renderer.bg) { renderer.bg.previousBiome = null; renderer.bg.blend = 1; renderer.bg.activeBiome = b; } renderer.render(game);
        out[b] = c.toDataURL();
      }
      return out;
    }, [seed, list, zoom, off, NIGHT]);
    if (errors.length) console.log(errors.join('\n'));
    for (const b of list) if (shots[b]) fs.writeFileSync(`${prefix}-${b}.png`, Buffer.from(shots[b].split(',')[1], 'base64'));
    console.log('ok', list.filter((b) => shots[b]).join(','));
  } finally { await browser.close(); }
})().catch((e) => { console.error(e); process.exit(1); });
