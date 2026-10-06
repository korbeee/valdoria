// Tigre da savana com a arte nova (js/tiger-art.js): nasce no covil sem entalar na pedra,
// sai do covil pelo túnel, luta (bote, patada, zonzo) e aparece na tela na mesma escala do urso.
//   node tests/tiger-boss.cjs
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const assert = require('node:assert/strict');
const path = require('node:path');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.addInitScript(() => {
      window.requestAnimationFrame = () => 1;
      let seed = 4242;
      Math.random = () => ((seed = Math.imul(seed, 1664525) + 1013904223 | 0) >>> 0) / 4294967296;
    });
    await page.goto('http://localhost/jogo-teste/');
    await page.waitForFunction(() => typeof game === 'object');
    const r = await page.evaluate(async () => {
      finishOpening(game); Menu.root.hidden = true; game.intro.active = false; game.paused = false;
      game.inventoryUI.open = false; game.mapUI.open = false; GAME_OPTIONS.shake = false;
      // Uma arena só por mapa, em qualquer tamanho e semente
      const perWorld = [];
      for (const [size, seed] of [['pequeno', 11], ['medio', 2024], ['grande', 9]]) {
        const S = WORLD_SIZES[size], wt = new World(S.w, S.h, seed, { lazy: true });
        await wt.generateAsync(() => {});
        const A = wt.tigerArena;
        perWorld.push({ size, dens: wt.tigerDens.length, arena: !!A, width: A ? A.x1 - A.x0 + 1 : 0 });
      }
      await newWorld('pequeno', () => {}, 777);
      finishOpening(game); game.intro.active = false; Menu.root.hidden = true;
      const tigers = game.mobs.filter((m) => m.kind === 'tiger'), w = game.world;
      const out = { perWorld, habitat:!!w.tigerArena.habitat, dens: w.tigerDens.length, tigers: tigers.length, stuck: tigers.filter((t) => t.collides(w, t.x, t.y)).length };
      // Foto da arena inteira com o tigre dormindo no meio
      {
        const A = w.tigerArena, cv = document.getElementById('game'); cv.width = 1600; cv.height = 620;
        player.x = (A.x0 + 3) * T; player.y = A.floor * T - player.h - 0.01;
        game.zoom = 1; game.cam.x = (A.mid - 50) * T; game.cam.y = (A.floor - 26) * T;
        game.time = 0.3; game.adminNightVision = true; game.showHelp = false; w.lightDirty = true; update(1 / 60); game.cam.x = (A.mid - 50) * T; game.cam.y = (A.floor - 26) * T; renderer.render(game); game.adminNightVision = false;
        window.__arenaShot = cv.toDataURL();
        // Da porta do lado de fora dá para andar até o chão da arena (sem parede no caminho)
        let blocked = 0;
        const where = [];
        for (const dir of [-1, 1]) for (let k = 0; k < 16; k++) { // até a saída do túnel (8 de parede + 7 de túnel)
          const x = (dir < 0 ? A.x0 : A.x1) + dir * k;
          for (let y = A.floor - 3; y < A.floor; y++) if (w.isSolid(x, y)) { blocked++; where.push([dir, k, A.floor - y, w.getTile(x, y)]); }
        }
        out.gateWhere = where;
        out.gateBlocked = blocked;
        out.arenaHeight = (() => { let h = 0; while (!w.isSolid(A.mid, A.floor - 1 - h)) h++; return h; })();
      }
      const t = tigers[0];
      out.size = [t.w, t.h];
      // Acorda e luta: o jogador parado a 7 blocos no chão do covil
      player.x = t.cx + 7 * T; player.y = t.y + t.h - player.h - 0.01;
      for (let k = 0; k < 20 && player.collides(w, player.x, player.y); k++) player.x -= T;
      game.adminGod = true;
      t.sleeping = false; t.aware = true; tigerState(t, 'hunt'); game.boss = t;
      const states = new Set(), frames = new Set();
      let minX = t.x, maxX = t.x;
      for (let i = 0; i < 60 * 14; i++) {
        update(1 / 60);
        if (t.dead) break;
        states.add(t.state); frames.add(tigerFrame(t));
        minX = Math.min(minX, t.x); maxX = Math.max(maxX, t.x);
        if (i % 120 === 0) { player.x = t.cx + (i % 240 ? 6 : -6) * T; player.y = t.y + t.h - player.h - 0.01; }
      }
      out.states = [...states]; out.frames = [...frames].sort((a, b) => a - b); out.moved = Math.round(maxX - minX);
      out.stuckAfter = t.collides(w, t.x, t.y);
      // Tela: o tigre no covil, com a câmera nele
      player.x = t.cx - 5 * T; player.y = t.y + t.h - player.h - 0.01;
      tigerState(t, 'swipe'); t.stateT = 0.4; t.facing = -1;
      const cv = document.getElementById('game'); cv.width = 1280; cv.height = 720;
      game.zoom = 3; updateCamera(0, true); renderer.render(game);
      return out;
    });
    console.log(r);
    for (const p of r.perWorld) {
      assert.equal(p.dens, 1, `uma arena só no mundo ${p.size}`);
      assert.ok(p.width >= 55, `arena larga no mundo ${p.size}`);
    }
    assert.equal(r.dens, 1); assert.equal(r.tigers, 1, 'um tigre só no mapa');
    if(!r.habitat)assert.equal(r.gateBlocked, 0, 'os dois portões dão direto no chão da arena');
    assert.ok(r.arenaHeight >= (r.habitat?7:12), 'espaço para o tigre sob o abrigo');
    const shot = await page.evaluate(() => window.__arenaShot);
    require('node:fs').writeFileSync(path.join(__dirname, 'tiger-arena.png'), Buffer.from(shot.split(',')[1], 'base64'));
    assert.equal(r.stuck, 0, 'o tigre não nasce entalado');
    assert.deepEqual(r.size, [64, 38]);
    assert.ok(r.states.length >= 3, 'usa vários golpes');
    assert.ok(r.moved > 3 * 16, 'anda pelo covil');
    assert.equal(r.stuckAfter, false);
    await page.screenshot({ path: path.join(__dirname, 'tiger-covil.png') });
    assert.deepEqual(errors, []);
    console.log('ok');
  } finally { await browser.close(); }
})();
