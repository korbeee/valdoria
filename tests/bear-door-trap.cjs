// Porta do covil do urso: não pode fechar com o jogador ainda no vão (ficava preso na rocha matriz).
//   node tests/bear-door-trap.cjs
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 620 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(() => { window.requestAnimationFrame = () => 1; });
    await page.goto('http://localhost/jogo-teste/');
    await page.waitForFunction(() => typeof game === 'object');
    const r = await page.evaluate(() => {
      finishOpening(game); Menu.root.hidden = true; game.intro.active = false; game.paused = false;
      game.inventoryUI.open = false; game.mapUI.open = false;
      const w = new World(1600, 480, 20260924);
      world = game.world = w; game.map = new WorldMap(w); renderer.bg = null;
      game.mobs = []; game.npcs = []; game.boss = null; game.drops = [];
      const lair = w.bearLairs[0];
      const bear = spawnBearBoss(game, lair);
      const [x0, , x1, y1] = lair.bounds;
      const doorXs = lair.door.map(([x]) => x), side = Math.min(...doorXs) < x0 ? -1 : 1;
      const edge = side < 0 ? x0 * T : (x1 + 1) * T; // parede entre o vão e a sala
      const floorY = y1 * T - player.h - 0.01;
      const out = [];
      const overlapsSolid = () => {
        for (let x = Math.floor(player.x / T); x <= Math.floor((player.x + player.w) / T); x++)
          for (let y = Math.floor(player.y / T); y <= Math.floor((player.y + player.h) / T); y++)
            if (w.isSolid(x, y)) return true;
        return false;
      };
      const stepBear = () => { for (let i = 0; i < 3; i++) bear.update(1 / 60, w, player, game); };
      // Caso do bug: o centro já passou para dentro da sala, mas metade do corpo segue no vão
      player.x = side < 0 ? edge - player.w / 2 + 2 : edge - player.w / 2 - 2;
      player.y = floorY; player.vx = player.vy = 0;
      stepBear();
      out.push({ caso: 'meio no vão', estado: bear.state, portaFechada: w.isSolid(...lair.door[0]), preso: overlapsSolid() });
      // Entrou de vez: agora a porta fecha, sem prender ninguém
      player.x = side < 0 ? edge + 6 : edge - player.w - 6;
      stepBear();
      out.push({ caso: 'dentro da sala', estado: bear.state, portaFechada: w.isSolid(...lair.door[0]), preso: overlapsSolid() });
      return out;
    });
    console.table(r);
    assert.equal(r[0].estado, 'sleep', 'com meio corpo no vão o urso ainda dorme');
    assert.equal(r[0].portaFechada, false, 'a porta não fecha em cima do jogador');
    assert.equal(r[1].estado, 'wake', 'dentro da sala o urso acorda');
    assert.equal(r[1].portaFechada, true, 'e a porta fecha');
    assert.equal(r[1].preso, false, 'sem prender o jogador na rocha');
    assert.deepEqual(errors, []);
    console.log('ok');
  } finally { await browser.close(); }
})();
