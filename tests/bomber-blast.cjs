// Dinamiteiro: o estouro abre uma cratera nos blocos em volta (como o creeper), sem quebrar rocha
// matriz nem baú, derruba parte dos blocos como item, machuca o jogador e os bichos perto.
//   node tests/bomber-blast.cjs
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const assert = require('node:assert/strict');
const path = require('node:path');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 620 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.addInitScript(() => {
      window.requestAnimationFrame = () => 1;
      let seed = 99;
      Math.random = () => ((seed = Math.imul(seed, 1664525) + 1013904223 | 0) >>> 0) / 4294967296;
    });
    await page.goto('http://localhost/jogo-teste/');
    await page.waitForFunction(() => typeof game === 'object');
    const r = await page.evaluate(() => {
      finishOpening(game); Menu.root.hidden = true; game.intro.active = false; game.paused = false;
      game.inventoryUI.open = false; game.mapUI.open = false; GAME_OPTIONS.shake = false;
      const w = game.world;
      // Um bolsão de pedra bem fundo: sala de 9×4 com chão, teto e paredes de pedra
      const cx = Math.floor(w.w / 2) + 40, cy = w.surface[cx] + 40;
      for (let y = cy - 9; y <= cy + 6; y++) for (let x = cx - 12; x <= cx + 12; x++) w.setTile(x, y, TILE.STONE);
      for (let y = cy - 2; y <= cy; y++) for (let x = cx - 6; x <= cx + 6; x++) w.setTile(x, y, TILE.AIR);
      w.setTile(cx + 2, cy + 1, TILE.BEDROCK);                     // rocha matriz no chão, pertinho
      w.setTile(cx - 3, cy, TILE.CHEST); game.chests.set(cy * w.w + cx - 3, [{ item: ITEM.COAL, count: 5 }]);
      w.setTile(cx + 3, cy - 2, TILE.TORCH);
      player.x = (cx + 4) * T; player.y = (cy + 1) * T - player.h - 0.01; player.hp = 100; player.invulnerable = 0;
      game.mobs = []; game.drops = [];
      const b = new Monster('bomber', cx * T, 0); b.y = (cy + 1) * T - b.h - 0.01;
      const pig = new Pig((cx - 2) * T, 0); pig.y = (cy + 1) * T - pig.h - 0.01;
      game.mobs.push(b, pig);
      const solidBefore = [];
      for (let y = cy - 7; y <= cy + 5; y++) for (let x = cx - 8; x <= cx + 8; x++) if (w.isSolid(x, y)) solidBefore.push([x, y]);
      explodeMonster(game, b);
      const broken = solidBefore.filter(([x, y]) => !w.isSolid(x, y) && w.getTile(x, y) !== TILE.CHEST).length;
      const out = {
        broken, drops: game.drops.length, hp: player.hp, pigHp: pig.hp,
        bedrock: w.getTile(cx + 2, cy + 1) === TILE.BEDROCK, chest: w.getTile(cx - 3, cy) === TILE.CHEST,
        floorHole: !w.isSolid(cx, cy + 1) || !w.isSolid(cx, cy + 2), ceilingHole: !w.isSolid(cx, cy - 3),
        torchGone: w.getTile(cx + 3, cy - 2) !== TILE.TORCH,
      };
      // Foto da cratera (visão noturna só para enxergar)
      game.adminNightVision = true; game.showHelp = false;
      const cv = document.getElementById('game'); cv.width = 1100; cv.height = 620;
      game.zoom = 3; w.lightDirty = true;
      for (let i = 0; i < 20; i++) update(1 / 60);
      updateCamera(0, true); renderer.render(game);
      return out;
    });
    console.log(r);
    assert.ok(r.broken >= 18, 'abre uma cratera de verdade');
    assert.ok(r.floorHole && r.ceilingHole, 'quebra chão e teto em volta');
    assert.ok(r.bedrock, 'rocha matriz resiste');
    assert.ok(r.chest, 'baú fica inteiro');
    assert.ok(r.drops > 0, 'parte dos blocos cai como item');
    assert.ok(r.hp < 100, 'machuca o jogador perto');
    assert.ok(r.pigHp < 10, 'machuca os bichos perto');
    await page.screenshot({ path: path.join(__dirname, 'bomber-cratera.png') });
    assert.deepEqual(errors, []);
    console.log('ok');
  } finally { await browser.close(); }
})();
