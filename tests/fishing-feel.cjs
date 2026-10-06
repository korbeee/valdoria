// Sensação da pesca (js/fishing-feel.js): linha de Verlet, vara que se curva, ícones no lugar do painel, trajeto do peixe até a margem.
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } }), errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(() => { requestAnimationFrame = () => 0; localStorage.setItem('valdoria.autoconnect', '0'); });
    await page.goto('http://localhost/jogo-teste/', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => document.fonts.ready);
    const aim = await page.evaluate(() => {
      const w = new World(100, 60, 81, { lazy: true }); w.surface.fill(22); w.biome.fill(BIOME.FOREST);
      for (let x = 0; x < 100; x++) for (let y = 22; y < 60; y++) {
        const bank = x <= 32 || x >= 68;
        w.tiles[y * w.w + x] = bank ? (y === 22 ? TILE.GRASS : y < 28 ? TILE.DIRT : TILE.STONE) : (y >= 38 ? TILE.STONE : TILE.AIR);
        if (!bank && y < 38) w.water[y * w.w + x] = WATER_MAX;
      }
      for (let x = 0; x < w.w; x++) w.computeSkyTop(x); w.generated = true;
      world = game.world = w; game.map = new WorldMap(w); game.intro = null; Menu.close(); game.paused = false; game.adminNightVision = true;
      game.mobs = []; game.npcs = []; game.boss = null; game.drops = []; game.particles = []; game.clock = 0; game.time = 0.16; game.daylight = 1;
      game.player.x = 31 * T; game.player.y = 22 * T - game.player.h; game.player.vx = game.player.vy = 0; game.player.facing = 1;
      game.zoom = 3; game.cam = { x: 24 * T, y: 12 * T }; game.inventory.slots.fill(null); game.inventory.add(ITEM.ROD_IRON, 1); game.inventory.add(ITEM.BAIT_INSECT, 24); game.inventory.add(ITEM.BAIT_DOUGH, 5); game.selected = 0;
      game.inventoryUI.open = false; game.mapUI.open = false; game.showHelp = false; game.adminOpen = false; game.fishingLeft = false; updateFishing(game, 0);
      return { x: Math.round((38 * T - game.cam.x) * game.zoom), y: Math.round((24 * T - game.cam.y) * game.zoom) };
    });
    // ---------- mira e selo de isca (sem sessão) ----------
    await page.mouse.move(aim.x, aim.y);
    await page.evaluate(() => { input.mouse.x = (38 * T - game.cam.x) * game.zoom; input.mouse.y = (24 * T - game.cam.y) * game.zoom; renderer.render(game); });
    await page.locator('#game').screenshot({ path: 'tests/fishing-feel-aim.png', clip: { x: 250, y: 220, width: 520, height: 300 } });
    const res = await page.evaluate(() => {
      const out = {};
      // o painel antigo não desenha mais nada
      const c = makeCanvas(400, 300), ctx = c.getContext('2d'); let drew = 0; const fr = ctx.fillRect.bind(ctx); ctx.fillRect = (...a) => { drew++; fr(...a); }; drawFishingHud(ctx, game, 400, 300); out.hudDrew = drew;
      // vara: a ponta cede quando a tensão sobe
      const flat = fishingRodSprite(ITEM.ROD_IRON, { state: 'reel', tension: 0, age: 0.2 }), bent = fishingRodSprite(ITEM.ROD_IRON, { state: 'reel', tension: 0.9, struggle: true, age: 0.2 });
      out.tipFlat = flat.rodTip; out.tipBent = bent.rodTip;
      // lance, espera e briga
      const target = fishingTarget(world, 38 * T, 25 * T);
      game.inventoryUI.open = false;
      fishingBegin(fishingOwner(), 7, ITEM.ROD_IRON, ITEM.BAIT_INSECT, target);
      const s = fishingSessions.get(fishingOwner());
      for (let i = 0; i < 200 && s.state !== 'wait'; i++) { game.clock += 1 / 60; updateFishing(game, 1 / 60); renderer.render(game); }
      out.state = s.state;
      for (let i = 0; i < 60; i++) { game.clock += 1 / 60; renderer.render(game); }
      const L = FLINE.map.get(fishingOwner());
      const a = L.pts[0], b = L.pts.at(-1), mid = L.pts[Math.floor(L.pts.length / 2)];
      out.sagWait = mid.y - (a.y + b.y) / 2;                                           // positivo = pende para baixo
      out.lineWet = L.pts.some((p) => p.y > s.surface);
      // briga: peixe real, linha esticada
      const m = new Wildlife('salmon', target.x, target.y); game.mobs = [m]; Object.assign(s, target, { state: 'bite', time: 2, fish: m }); m.fishingOwner = s.owner;
      fishingReel(s); s.tension = 0.8; s.phase = 'warning'; s.phaseTime = 5; s.progress = 0.3; fishingPublish(s);
      for (let i = 0; i < 40; i++) { game.clock += 1 / 60; s.tension = 0.8; renderer.render(game); }
      const L2 = FLINE.map.get(fishingOwner()), a2 = L2.pts[0], b2 = L2.pts.at(-1), m2 = L2.pts[Math.floor(L2.pts.length / 2)];
      out.sagTaut = m2.y - (a2.y + b2.y) / 2;
      return out;
    });
    await page.locator('#game').screenshot({ path: 'tests/fishing-feel-fight.png', clip: { x: 300, y: 330, width: 520, height: 260 } });
    // ---------- peixe arrastado pela água até a margem ----------
    const path = await page.evaluate(() => {
      const s = fishingSessions.get(fishingOwner()), w = world, trail = [];
      s.fishKind = 'salmon'; let solidHit = false, ended = '';
      for (let t = 0; t < 3600 && game.fishing; t++) {
        input.mouse.left = s.phase !== 'surge' && s.tension < 0.6; s.tension = Math.min(s.tension, 0.9);
        updateFishing(game, 1 / 60);
        if (s.state === 'reel') { trail.push([s.progress, s.x, s.y, s.surface]); if (w.isSolid(Math.floor(s.x / T), Math.floor(s.y / T))) solidHit = true; }
      }
      input.mouse.left = false;
      const early = trail.filter((p) => p[0] < 0.7), late = trail.filter((p) => p[0] > 0.9);
      return { n: trail.length, solidHit, earlyMaxAbove: Math.max(...early.map((p) => p[3] - p[2])), lateRise: late.length ? Math.max(...late.map((p) => p[3] - p[2])) : 0, popup: (game.fishPopups || []).length, toast: game.toast.text };
    });
    await page.evaluate(() => renderer.render(game));
    // a vara não some atrás de uma ação de ferramenta esquecida
    const rod = await page.evaluate(() => {
      let rodCalls = 0, toolCalls = 0; const r0 = drawFishingRod, t0 = drawToolAction;
      drawFishingRod = (...a) => { rodCalls++; r0(...a); }; drawToolAction = () => { toolCalls++; };
      game.toolAction = { tile: 3, t: 0 }; game.inventory.slots[0] = { item: ITEM.ROD_IRON, count: 1 }; game.selected = 0; game.player.swimTilt = 0; game.intro = null;
      renderer.render(game); drawFishingRod = r0; drawToolAction = t0; game.toolAction = null;
      return { rodCalls, toolCalls };
    });
    assert(rod.rodCalls >= 1 && rod.toolCalls === 0, 'a vara continua visível com toolAction ativa: ' + JSON.stringify(rod));
    console.log(JSON.stringify({ res, path, rod }));
    assert.equal(res.hudDrew, 0, 'o painel antigo não deve desenhar');
    assert(res.tipBent.y > res.tipFlat.y + 2, 'a ponta da vara cede com a tensão');
    assert.equal(res.state, 'wait');
    assert(res.sagWait > 1.5, 'a linha frouxa pende: ' + res.sagWait);
    assert(res.sagTaut < res.sagWait, 'a linha esticada pende menos: ' + res.sagTaut);
    assert(res.lineWet, 'parte da linha entra na água');
    assert(!path.solidHit, 'o peixe nunca atravessa bloco');
    assert(path.earlyMaxAbove < 12, 'o peixe é arrastado pela água, não voa: ' + path.earlyMaxAbove);
    assert(path.lateRise > 4, 'no fim o peixe é erguido até a mão');
    assert(path.popup >= 1, 'ícone do peixe sobe da mão ao pescar');
    assert.deepEqual(errors, []);
    console.log('fishing-feel ok');
  } finally { await browser.close(); }
})().catch((e) => { console.error(e); process.exitCode = 1; });
