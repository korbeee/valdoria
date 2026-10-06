// Boné do Bigodão: slots de chapéu/botas, visual, Modo Arco-Íris (R) e pisão.
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs = require('fs');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://localhost/jogo-teste/?nocache=' + Date.now());
  await page.waitForFunction(() => typeof game === 'object' && typeof ITEM.MOUSTACHE_CAP === 'number');
  const out = await page.evaluate(async () => {
    const log = [], check = (ok, msg) => log.push((ok ? '✓ ' : '✗ ') + msg);
    await newWorld('pequeno', () => {}, 4242);
    finishOpening(game); Menu.root.hidden = true; game.paused = false; GAME_OPTIONS.help = false; applyOptions(game); game.objective = '';
    canvas.width = 1280; canvas.height = 720; game.zoom = 4; game.time = 0.3; window.toast = () => {};
    const w = world, p = game.player, ui = game.inventoryUI, step = (n = 1) => { for (let i = 0; i < n; i++) { game.monsterTimer = 1e9; update(1 / 60); } };
    const x0 = Math.floor(w.w / 2) + 40, gy = w.groundTop(x0);
    p.x = x0 * T; p.y = gy * T - p.h - 0.01; p.vx = p.vy = 0; step(30);
    check(ITEM_DEFS[ITEM.MOUSTACHE_CAP].chapeu && ITEM_DEFS[ITEM.STOMP_BOOTS].bota && ITEM_ART[ITEM.MOUSTACHE_CAP].pixels.length === 16, 'itens definidos com ícone');
    check(RECIPES.some((r) => r.resultado.item === ITEM.MOUSTACHE_CAP) && RECIPES.some((r) => r.resultado.item === ITEM.STOMP_BOOTS), 'receitas existem');
    ui.open = true; game.inventory.slots[12] = { item: ITEM.MOUSTACHE_CAP, count: 1 }; game.inventory.slots[13] = { item: ITEM.STOMP_BOOTS, count: 1 };
    ui.quickMove(12); ui.quickMove(13);
    check(game.hat === ITEM.MOUSTACHE_CAP && game.boots === ITEM.STOMP_BOOTS && !game.inventory.slots[12] && !game.inventory.slots[13], 'Shift+clique equipa chapéu e botas');
    // clique no slot com item na mão
    ui.open = false; setGearItem(game, 'hat', null); setGearItem(game, 'boots', null); ui.open = true;
    ui.held = { item: ITEM.MOUSTACHE_CAP, count: 1 }; ui.gearClick(0, 'hat', 'chapeu', 'um chapéu');
    check(game.hat === ITEM.MOUSTACHE_CAP && !ui.held, 'clique equipa chapéu');
    ui.held = { item: ITEM.STOMP_BOOTS, count: 1 }; ui.gearClick(0, 'hat', 'chapeu', 'um chapéu');
    check(game.hat === ITEM.MOUSTACHE_CAP && ui.held?.item === ITEM.STOMP_BOOTS, 'bota não entra no slot de chapéu');
    ui.gearClick(0, 'boots', 'bota', 'botas'); check(game.boots === ITEM.STOMP_BOOTS && !ui.held, 'botas no slot de botas');
    const d0 = playerDefense(game); check(d0 >= 0.08, 'defesa soma (' + d0.toFixed(2) + ')');
    ui.open = false;
    // Modo Arco-Íris
    step(5); game.player.hp = 100;
    input.keys.add('KeyR'); step(2); input.keys.delete('KeyR'); step(2);
    check(rainbowOn(game), 'R ativa a Modo Arco-Íris');
    const cd = referenceState(game).ready.rainbow - game.clock; check(cd > 85, 'recarga de 90 s (' + cd.toFixed(0) + ')');
    check(p.invulnerable > 0, 'invencível');
    input.keys.add('KeyR'); step(2); input.keys.delete('KeyR');
    step(60 * 5); check(!rainbowOn(game), 'termina em 4 s');
    { const rs2 = referenceState(game); rs2.ready.rainbow = 0; let got = false; for (let i = 0; i < 80 && !got; i++) { referenceOnHurt(game); got = rainbowOn(game); } check(got, 'levar golpe pode ativar o modo sozinho'); const cd2 = rs2.ready.rainbow - game.clock; check(cd2 > 85, 'e a recarga também é de 90 s'); game.capState.until = 0; rs2.ready.rainbow = 0; }
    { const pig = new Pig(p.cx + 30, p.y - 30); pig.update = () => {}; pig.took = 0; const hh = pig.hit.bind(pig); pig.hit = function (d) { this.took += d; }; game.mobs.push(pig); p._referenceFall = { bottom: pig.y - 5, speed: 200 }; p.x = pig.x; p.y = pig.y - p.h + 4; referenceAfterMovement(p); check(pig.took > 0 && pig.took <= 8, 'pisão causa pouco dano (' + pig.took + ')'); game.mobs.length = 0; }
    // foto: cabeça
    setGearItem(game, 'hat', ITEM.MOUSTACHE_CAP);
    ui.open = true; game.cam.x = p.cx - canvas.width / game.zoom / 2; game.cam.y = p.cy - canvas.height / game.zoom * 0.55;
    const gx = Math.floor(p.cx / T); w.computeLight(gx, Math.floor(p.cy / T)); w.composeLight(game.daylight);
    renderer.render(game); window.__shot = canvas.toDataURL();
    game.capState.until = game.clock + 5; ui.open = false; step(20); renderer.render(game); window.__shot2 = canvas.toDataURL();
    return log;
  }).catch((e) => [String(e.stack || e)]);
  for (const [k, f] of [['__shot', 'moustache-cap.png'], ['__shot2', 'moustache-rainbow.png']]) { const s = await page.evaluate((k) => window[k], k).catch(() => null); if (s) fs.writeFileSync(__dirname + '/' + f, Buffer.from(s.split(',')[1], 'base64')); }
  console.log(out.join('\n'));
  console.log(errors.length ? 'ERROS: ' + errors.slice(0, 5).join(' | ') : 'sem erros no console');
  await browser.close();
  if (errors.length || out.some((l) => !l.startsWith('✓'))) process.exit(1);
})();
