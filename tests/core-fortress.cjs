// Fortalezas de lava e criaturas novas do Coração.
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://localhost/jogo-teste/?nocache=' + Date.now());
  await page.waitForFunction(() => typeof game === 'object' && typeof buildCoreFortresses === 'function');
  const out = await page.evaluate(async () => {
    const log = [], check = (ok, msg) => log.push((ok ? '✓ ' : '✗ ') + msg);
    for (const seed of [4242, 99, 2024]) {
      await newWorld('medio', () => {}, seed);
      const w = world, fs = w.coreFortresses || [];
      check(fs.length >= 2, `seed ${seed}: ${fs.length} fortalezas`);
      const f = fs[0];
      check(w.getTile(f.x0 + 9, f.floor) === TILE.BRONZE_PLATE && w.getTile(f.x0, f.floor - 11) === TILE.VIGIA_BRICK, 'estrutura no lugar');
      check(w.lootChests.some((c) => c.x >= f.x0 && c.x <= f.x1 && c.y >= f.floor - 8), 'baú dentro');
    }
    await newWorld('medio', () => {}, 4242);
    finishOpening(game); Menu.root.hidden = true; game.paused = false; GAME_OPTIONS.help = false; applyOptions(game); window.toast = () => {};
    const w = world, p = game.player, f = w.coreFortresses[0];
    p.x = (f.x0 - 8) * T; p.y = (f.floor - 1) * T - p.h; p.vx = p.vy = 0; game.adminGod = false;
    for (let i = 0; i < 10; i++) { game.monsterTimer = 1e9; update(1 / 60); }
    p.x = (f.x0 + 9) * T; p.y = (f.floor - 1) * T - p.h; p.hp = p.maxHp = 100;
    let seen = new Set(), hurt = false;
    for (let i = 0; i < 900; i++) { game.monsterTimer = 1e9; update(1 / 60); for (const m of game.mobs) if (m.fortress) seen.add(m.kind + ':' + m.state); if (p.hp < 100) hurt = true; if (p.hp < 30) p.hp = 100; }
    const kinds = new Set(game.mobs.filter((m) => m.fortress).map((m) => m.kind));
    check(kinds.has('guardaobsidiana') && kinds.has('arqueirobrasa'), 'guardas e arqueiros nascem: ' + [...kinds].join(','));
    check(hurt, 'os moradores atacam o jogador');
    check([...seen].some((s) => /windup|strike|aim/.test(s)), 'estados de ataque usados: ' + [...seen].filter((s) => /windup|strike|aim/.test(s)).join(' '));
    // criaturas soltas
    game.adminGod = true; game.mobs = game.mobs.filter((m) => !m.fortress); p.hp = p.maxHp;
    for (const kind of ['besouromagma', 'golemmagnetita', 'craniobrasa']) {
      const m = new Wildlife(kind, p.x + 40, p.y); m.keep = true; game.mobs.push(m);
      for (let i = 0; i < 120; i++) { game.monsterTimer = 1e9; update(1 / 60); }
      check(game.mobs.includes(m) || m.dead, kind + ' roda sem erro');
    }
    return log;
  }).catch((e) => [String(e.stack || e)]);
  console.log(out.join('\n')); console.log(errors.length ? 'ERROS: ' + errors.slice(0, 5).join(' | ') : 'sem erros no console');
  await browser.close();
  if (errors.length || out.some((l) => !l.startsWith('✓'))) process.exit(1);
})();
