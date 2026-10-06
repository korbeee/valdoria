// Bichos novos dentro do mundo de verdade (biomas, luz do dia): node tests/fauna-world.cjs [semente] [prefixo] [biomas ex. 7,8,9] [zoom]
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs = require('fs');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const seed = +(process.argv[2] || 4242), prefix = process.argv[3] || __dirname + '/fauna-world', list = (process.argv[4] || '7,8,9').split(',').map(Number), zoom = +(process.argv[5] || 3);
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } }), errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(() => { localStorage.setItem('valdoria.autoconnect', '0'); });
    await page.goto('http://localhost/jogo-teste/');
    await page.waitForFunction(() => { try { return typeof game === 'object' && typeof newWorld === 'function'; } catch { return false; } });
    const shots = await page.evaluate(async ([seed, list, zoom]) => {
      await newWorld('pequeno', () => {}, seed);
      finishOpening(game); Menu.root.hidden = true;
      const w = world, c = document.querySelector('canvas'); c.width = 960; c.height = 600;
      game.adminNightVision = true; game.zoom = zoom; game.time = 0.3;
      renderer.drawUI = () => {}; renderer.drawObjective = () => {}; game.inventoryUI.drawVitals = () => {}; drawFlightHud = () => {}; drawStoryHud = () => {}; drawNpcBubbles = () => {}; drawBossBar = () => {}; drawFpsCounter = () => {}; drawLavatoryCaption = () => {};
      game.player.x = 8; game.player.y = 8;
      const out = {};
      for (const b of list) {
        // trecho plano e livre dentro do bioma
        let cx = -1;
        for (let x = 20; x < w.w - 60 && cx < 0; x++) {
          if (w.biome[x] !== b) continue;
          let ok = true;
          for (let k = 0; k < 26 && ok; k++) ok = w.biome[x + k] === b && w.surface[x + k] === surfaceY(w, x + k) && Math.abs(w.surface[x + k] - w.surface[x]) <= 4 && [1, 2, 3].every((r) => w.getTile(x + k, w.surface[x + k] - r) === TILE.AIR);
          if (ok) cx = x + 13;
        }
        if (cx < 0) { out[b] = null; continue; }
        game.mobs.length = 0;
        const pas = wildlifePool(w, cx, false).filter((k) => WILDLIFE[k]?.shape && SHAPE_HOOKS[WILDLIFE[k].shape]?.paint && k in WILDLIFE && !WILDLIFE[k].aquatic), hos = wildlifePool(w, cx, true).filter((k) => SHAPE_HOOKS[WILDLIFE[k]?.shape]?.paint);
        const kinds = [...pas, ...hos].filter((k) => WILDLIFE[k] && SHAPE_HOOKS[WILDLIFE[k].shape]);
        kinds.forEach((k, i) => {
          const m = new Wildlife(k, 0, 0), x = cx - 12 + i * 8.5 + (i % 2); m.x = x * T; m.y = w.surface[Math.round(x)] * T - m.h - 0.01; m.facing = i % 2 ? -1 : 1; m.dir = 0; m.thinkTimer = 99; game.mobs.push(m);
          if (WILDLIFE[k].hostile) m.aware = false;
        });
        game.cam.x = cx * T - 480 / zoom; game.cam.y = w.surface[cx] * T - 380 / zoom;
        for (let i = 0; i < 20; i++) { for (const m of game.mobs) m.update(1 / 60, w, { cx: -9999, cy: -9999, vx: 0, vy: 0, invulnerable: 99 }); }
        game.cam.x = cx * T - 480 / zoom; game.cam.y = w.surface[cx] * T - 380 / zoom;
        renderer.render(game); if (renderer.bg) { renderer.bg.previousBiome = null; renderer.bg.blend = 1; renderer.bg.activeBiome = b; } renderer.render(game);
        out[b] = { img: c.toDataURL(), kinds };
      }
      return out;
    }, [seed, list, zoom]);
    if (errors.length) console.log(errors.join('\n'));
    for (const b of list) if (shots[b]) { fs.writeFileSync(`${prefix}-${b}.png`, Buffer.from(shots[b].img.split(',')[1], 'base64')); console.log(b, shots[b].kinds.join(',')); }
  } finally { await browser.close(); }
})().catch((e) => { console.error(e); process.exit(1); });
