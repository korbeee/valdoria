// Chefes descansando longe do jogador (casulo da Fiandeira, Casco-Ferro enterrado, urso e tigre
// dormindo) não podem ser "mandados para casa" a cada quadro: isso reescrevia a porta do covil e
// recalculava a luz do mundo inteira em todo quadro. O reset ao se afastar de uma luta continua.
//   node tests/boss-rest.cjs
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => { window.requestAnimationFrame = () => 1; });
    await page.goto('http://localhost/jogo-teste/');
    await page.waitForFunction(() => typeof game === 'object' && typeof newWorld === 'function');
    const checks = await page.evaluate(async () => {
      const out = [];
      const check = (ok, label) => { if (!ok) throw Error('FALHOU: ' + label); out.push(label); };
      await newWorld('pequeno', () => {}, 4242);
      finishOpening(game); Menu.root.hidden = true; game.intro.active = false; game.adminGod = true;
      const p = game.player, w = game.world;
      const boss = kind => game.mobs.find(m => m.kind === kind);
      const spider = boss('fiandeira'), beetle = boss('cascoferro'), bear = boss('bear'), tiger = boss('tiger');
      check(spider && beetle && bear && tiger, 'os quatro chefes estão no mundo');
      check(spider.state === 'cocoon' && beetle.state === 'buried', 'Fiandeira no casulo e Casco-Ferro enterrado no começo');
      for (const m of [spider, beetle, bear, tiger]) check(Math.abs(m.cx - p.cx) > 120 * T, `${m.kind} longe do jogador`);

      // 1) Parado longe de todos: a luz só é recalculada quando algo muda, não todo quadro.
      let lightCalls = 0;
      const computeLight = World.prototype.computeLight;
      World.prototype.computeLight = function (...a) { lightCalls++; return computeLight.apply(this, a); };
      for (let i = 0; i < 5; i++) update(STEP); // o primeiro quadro pode recalcular
      lightCalls = 0;
      for (let i = 0; i < 120; i++) update(STEP);
      World.prototype.computeLight = computeLight;
      check(lightCalls <= 3, `luz recalculada ${lightCalls}x em 120 quadros (antes: 120x)`);

      // 2) Quem descansa continua em casa, com vida cheia e no mesmo estado.
      check(spider.state === 'cocoon' && spider.hp === spider.def.hp, 'Fiandeira segue no casulo, vida cheia');
      check(beetle.state === 'buried' && beetle.hp === beetle.def.hp, 'Casco-Ferro segue enterrado, vida cheia');
      check(beetle.lair.door.every(([x, y]) => w.getTile(x, y) === TILE.AIR), 'porta do covil do Casco-Ferro aberta');

      // 3) Chefe que estava lutando e ficou longe volta para casa (uma vez) e dorme.
      const homeX = bear.x;
      bear.state = 'chase'; bear.sleeping = false; bear.hp = 50; bear.x += 3 * T; game.boss = bear;
      update(STEP);
      check(bear.state === 'sleep' && bear.hp === bear.def.hp && Math.abs(bear.x - homeX) < 1 && game.boss === null, 'urso que lutava volta a dormir no covil com vida cheia');

      // 4) Estado que muda longe do jogador ainda é tratado: casulo rasgando vira sono em casa.
      spider.state = 'hatch';
      update(STEP);
      check(spider.state === 'cocoon' || spider.state === 'sleep', 'Fiandeira que rasgou o casulo longe volta a descansar');

      // 5) Chegando perto, o chefe volta a ser atualizado normalmente (e o reset vale de novo depois).
      p.x = beetle.cx; p.y = beetle.y - 2 * T; update(STEP);
      check(beetle.restState === null, 'perto do jogador o Casco-Ferro é atualizado de novo');
      p.x = beetle.cx + 200 * T; update(STEP);
      check(beetle.restState === 'buried', 'longe outra vez: reset feito uma vez e lembrado');
      return out;
    });
    console.log(checks.map(c => '✓ ' + c).join('\n'));
    if (errors.length) { console.error('erros na página:', errors); process.exitCode = 1; }
    else console.log(`${checks.length} verificações de descanso dos chefes passaram`);
  } finally { await browser.close(); }
})().catch(e => { console.error(e.message || e); process.exitCode = 1; });
