// Foice: ceifa mato e flores, não machuca bichos.
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://localhost/jogo-teste/?nocache=' + Date.now());
  await page.waitForFunction(() => typeof game === 'object' && typeof ITEM.SCYTHE === 'number');
  const out = await page.evaluate(async () => {
    const log = [], check = (ok, msg) => log.push((ok ? '✓ ' : '✗ ') + msg);
    await newWorld('pequeno', () => {}, 4242);
    finishOpening(game); Menu.root.hidden = true; game.paused = false; game.adminGod = true; GAME_OPTIONS.help = false; applyOptions(game); window.toast = () => {};
    const w = world, p = game.player, step = (n = 1) => { for (let i = 0; i < n; i++) { game.monsterTimer = 1e9; update(1 / 60); } };
    check(ITEM_ART[ITEM.SCYTHE]?.pixels?.length === 16 && ITEM_DEFS[ITEM.SCYTHE].foice, 'item e ícone existem');
    check(RECIPES.some((r) => r.resultado.item === ITEM.SCYTHE), 'receita existe');
    // acha um canteiro de flor/samambaia no chão
    let spot = null;
    for (let x = 20; x < w.w - 20 && !spot; x++) { const y = surfaceY(w, x); const f = environmentDecorationAt(w, x, y - 1); const k = f && environmentKind(environmentDecoration(w, f.x, f.y, f.ceiling)); if (k && SCYTHE_KINDS.has(k)) spot = { x, y, k, f }; }
    check(!!spot, 'achou mato para cortar (' + (spot && spot.k) + ')');
    if (!spot) return log;
    p.x = (spot.x - 2) * T; p.y = spot.y * T - p.h - 0.01; p.vx = p.vy = 0; p.facing = 1; step(20);
    const pig = new Pig(p.x + 22, p.y); pig.update = () => {}; game.mobs.push(pig); const hp0 = pig.hp;
    game.inventory.slots[0] = { item: ITEM.SCYTHE, count: 1 }; game.selected = 0;
    const cuts0 = w.decorCut?.size || 0;
    for (let n = 0; n < 4; n++) { startSwordSwing(game, ITEM_DEFS[ITEM.SCYTHE], p.cx + 60, p.cy); step(40); game.attackCooldown = 0; }
    check((w.decorCut?.size || 0) > cuts0, 'a foice cortou o mato');
    check(pig.hp === hp0, 'a foice não machuca bicho (' + pig.hp + ')');
    return log;
  }).catch((e) => [String(e.stack || e)]);
  console.log(out.join('\n')); console.log(errors.length ? 'ERROS: ' + errors.join(' | ') : 'sem erros no console');
  await browser.close();
  if (errors.length || out.some((l) => !l.startsWith('✓'))) process.exit(1);
})();
