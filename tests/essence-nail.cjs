// Agulhão da Alma Teimosa: meia-lua, almas, rajada com botão direito a 6 almas, pogo, medidor de almas e capa.
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs = require('fs');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/WebSocket/.test(m.text())) errors.push(m.text().slice(0, 200)); });
  await page.goto('http://localhost/jogo-teste/?nocache=' + Date.now());
  await page.waitForFunction(() => typeof game === 'object' && typeof nailState === 'function');
  const out = await page.evaluate(async () => {
    const log = [], check = (ok, msg) => log.push((ok ? '✓ ' : '✗ ') + msg);
    await newWorld('pequeno', () => {}, 4242);
    finishOpening(game); Menu.root.hidden = true; game.paused = false; game.adminGod = true; GAME_OPTIONS.help = false; applyOptions(game); game.objective = '';
    canvas.width = 1280; canvas.height = 720; game.zoom = 4; game.time = 0.3; window.toast = () => {};
    const w = world, p = game.player, step = (n = 1) => { for (let i = 0; i < n; i++) { game.monsterTimer = 1e9; update(1 / 60); } };
    const x0 = Math.floor(w.w / 2) + 40, gy = w.groundTop(x0);
    p.x = x0 * T; p.y = gy * T - p.h - 0.01; p.vx = p.vy = 0; step(30);
    const nail = ITEM.REF_CAVERN_NEEDLE;
    check(ESSENCE_NAIL_IDS.every((id) => !ITEM_DEFS[id].referencePower), 'ferrão sem poder no R');
    game.inventory.slots[0] = { item: nail, count: 1 }; game.selected = 0;
    // monstro de teste na frente
    const mk = () => { game.mobs.length = 0; spawnMob?.('slime', p.cx + 30, p.y); };
    const rs = referenceState(game);
    // almas vêm de acertos
    rs.soul = 0; const fakeMob = { cx: p.cx + 20, cy: p.cy, hit() {}, x: 0, y: 0, w: 8, h: 8 };
    for (let i = 0; i < 5; i++) referenceOnStrike(game, fakeMob, nail);
    check(rs.soul === 5, 'cinco acertos = 5 almas (' + rs.soul + ')');
    check(nailState(game).orbs.length > 0, 'almas voam até você');
    // sexto: carrega e dispara sozinho
    const dummy = new Pig(p.cx + 70, p.y); dummy.update = () => {}; dummy.hit = function (d) { this.took = (this.took || 0) + d; };
    game.mobs.push(dummy);
    referenceOnStrike(game, fakeMob, nail);
    check(rs.soul === 6, '6 almas');
    step(60); check(rs.soul === 6 && nailState(game).charge === 0, "vaso cheio NÃO dispara sozinho");
    input.mouse.right = true; step(2); input.mouse.right = false; check(nailState(game).charge > 0, "botão direito carrega a rajada");
    step(30); check(rs.soul === 0, "rajada saiu e zerou o vaso (" + rs.soul + ")");
    step(30); check(dummy.took >= 20, 'rajada atingiu o alvo (' + dummy.took + ')');
    // golpe visual
    startSwordSwing(game, ITEM_DEFS[nail], p.cx + 60, p.cy);
    step(8); const gx = Math.floor(p.cx / T);
    game.cam.x = p.cx - canvas.width / game.zoom / 2; game.cam.y = p.cy - canvas.height / game.zoom * 0.55; w.computeLight(gx, Math.floor(p.cy / T)); w.composeLight(game.daylight);
    renderer.render(game); window.__a = canvas.toDataURL();
    // rajada + vaso
    rs.soul = 5; referenceOnStrike(game, fakeMob, nail); input.mouse.right = true; step(2); input.mouse.right = false; step(18); renderer.render(game); window.__b = canvas.toDataURL();
    step(14); renderer.render(game); window.__c = canvas.toDataURL();
    game.inventory.slots[0] = null; rs.soul = 3; step(3); check(rs.soul === 0, "sem o agulhão o medidor zera e some"); game.inventory.slots[0] = { item: nail, count: 1 };
    // manto
    game.inventory.slots[1] = { item: ITEM.REF_SCOUT_ARMOR, count: 1 }; game.inventoryUI.open = true; game.inventoryUI.quickMove(1); game.inventoryUI.open = false; step(5);
    check(game.outfit === ITEM.REF_SCOUT_ARMOR, 'manto vestido'); game.mobs.length = 0; rs.soul = 0; step(80);
    renderer.render(game); window.__d = canvas.toDataURL();
    return log;
  }).catch((e) => [String(e.stack || e)]);
  for (const k of ['a', 'b', 'c', 'd']) { const s = await page.evaluate((k) => window['__' + k], k).catch(() => null); if (s) fs.writeFileSync(__dirname + '/essence-nail-' + k + '.png', Buffer.from(s.split(',')[1], 'base64')); }
  console.log(out.join('\n'));
  console.log(errors.length ? 'ERROS: ' + errors.slice(0, 5).join(' | ') : 'sem erros no console');
  await browser.close();
  if (errors.length || out.some((l) => !l.startsWith('✓'))) process.exit(1);
})();
