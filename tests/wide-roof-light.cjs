// Plataforma grande acima do chão: embaixo fica em penumbra (não breu); casa pequena continua escura por dentro.
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://localhost/jogo-teste/?nocache=' + Date.now());
  await page.waitForFunction(() => typeof game === 'object');
  const out = await page.evaluate(async () => {
    const log = [], check = (ok, msg) => log.push((ok ? '✓ ' : '✗ ') + msg);
    await newWorld('pequeno', () => {}, 4242);
    finishOpening(game); Menu.root.hidden = true; game.paused = false;
    const w = world, cx = Math.floor(w.w / 2) + 60, base = w.surface[cx];
    const read = () => { w.computeLight(cx, base); const rx = cx - w.lx, ry = base - 2 - w.ly; return w.skyLight[ry * LIGHT_W + rx]; };
    const before = read();
    for (let x = cx - 40; x <= cx + 40; x++) w.setTile(x, base - 9, TILE.STONE_BRICK);
    const wide = read();
    check(wide >= 8, 'embaixo de uma plataforma de 81 blocos há penumbra (' + before + ' → ' + wide + ')');
    for (let x = cx - 40; x <= cx + 40; x++) w.setTile(x, base - 9, TILE.AIR);
    for (let x = cx - 6; x <= cx + 6; x++) w.setTile(x, base - 9, TILE.STONE_BRICK);
    const small = read();
    check(small <= 9, 'telhado pequeno segue o decaimento normal da luz (' + small + ')');
    return log;
  }).catch((e) => [String(e.stack || e)]);
  console.log(out.join('\n')); console.log(errors.length ? 'ERROS: ' + errors.join(' | ') : 'sem erros no console');
  await browser.close();
  if (errors.length || out.some((l) => !l.startsWith('✓'))) process.exit(1);
})();
