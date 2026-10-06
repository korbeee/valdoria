// Fotos do Ossário (Coração da Ilha) sem escuridão: node tests/core-shot.cjs [seed] [prefixo]
// gera <prefixo>-tree.png (árvore de osso) e <prefixo>-mat.png (âmbar + fóssil e a emenda com a rocha)
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs = require('fs');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const seed = +(process.argv[2] || 4242), prefix = process.argv[3] || __dirname + '/core-shot';
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } }), errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(() => { localStorage.setItem('valdoria.autoconnect', '0'); });
    await page.goto('http://localhost/jogo-teste/');
    await page.waitForFunction(() => typeof game === 'object' && typeof newWorld === 'function');
    const shots = await page.evaluate(async (seed) => {
      await newWorld('pequeno', () => {}, seed);
      finishOpening(game); Menu.root.hidden = true;
      const w = world, c = document.querySelector('canvas'); c.width = 960; c.height = 600;
      game.adminNightVision = true; game.zoom = +(window.__zoom || 3);
      renderer.drawUI = () => {}; renderer.drawObjective = () => {}; game.inventoryUI.drawVitals = () => {}; drawFlightHud = () => {}; drawStoryHud = () => {}; drawNpcBubbles = () => {}; drawBossBar = () => {}; drawFpsCounter = () => {}; drawLavatoryCaption = () => {};
      game.player.x = 8; game.player.y = 8;
      const snap = (cx, cy) => { game.cam.x = cx * T - 160; game.cam.y = cy * T - 100; renderer.render(game); return c.toDataURL(); };
      // árvore de osso do Ossário
      let tree = null;
      for (let x = 4; x < w.w - 4 && !tree; x++) for (let y = w.coreTop[x]; y < w.h - 14; y++) {
        if (w.coreZone[x] !== 3 || !CORE_ECO_NATURAL.has(w.getTile(x, y))) continue;
        const d = generateEnvironmentDecoration(w, x, y);
        if (d?.floraTree) { tree = [x, y]; break; }
      }
      // maior mancha de âmbar do Ossário
      let amber = null, best = 0;
      for (let x = 6; x < w.w - 6; x += 2) for (let y = w.coreTop[x]; y < w.h - 20; y += 2) {
        if (w.coreZone[x] !== 3 || w.getTile(x, y) !== TILE.AMBER) continue;
        let n = 0; for (let dx = -5; dx <= 5; dx++) for (let dy = -5; dy <= 5; dy++) { const t = w.getTile(x + dx, y + dy); if (t === TILE.AMBER || t === TILE.FOSSIL) n++; }
        if (n > best) { best = n; amber = [x, y]; }
      }
      const out = { tree, amber, best };
      if (tree) out.treeImg = snap(tree[0], tree[1] - 4);
      if (amber) out.matImg = snap(amber[0], amber[1]);
      return out;
    }, seed);
    if (errors.length) console.log(errors.join('\n'));
    for (const k of ['tree', 'mat']) if (shots[k + 'Img']) fs.writeFileSync(`${prefix}-${k}.png`, Buffer.from(shots[k + 'Img'].split(',')[1], 'base64'));
    console.log('ok', shots.tree, shots.amber, shots.best);
  } finally { await browser.close(); }
})().catch((e) => { console.error(e); process.exit(1); });
