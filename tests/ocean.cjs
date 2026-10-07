// Oceano: navio afundado (tridente só às vezes), ondas só em temporal, laguna protegida, tartaruga e arraia.
//   node tests/ocean.cjs     (precisa do Apache servindo http://localhost/jogo-teste/ e do Playwright)
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(() => { window.requestAnimationFrame = () => 1; });
    await page.goto('http://localhost/jogo-teste/?x=' + Date.now());
    await page.waitForFunction(() => typeof game === 'object' && typeof oceanStormLevel === 'function' && typeof buildShipwreck === 'function');
    const checks = await page.evaluate(() => {
      finishOpening(game); Menu.root.hidden = true; game.paused = false; game.intro.active = false;
      const c = {};
      // 1. navio: existe em todo mundo com mar, o mastro rompe a superfície e o tridente é sorteado
      let ships = 0, tridents = 0, masts = 0, chests = 0;
      for (const seed of [11, 22, 33, 44, 55, 66, 77, 88, 99, 110, 121, 132]) {
        const w = new World(1600, 480, seed * 7919), wr = w.wreck;
        if (!wr) continue;
        ships++; if (wr.flag.y < w.seaLevel) masts++;
        const own = w.lootChests.filter((k) => k.x >= wr.x0 && k.x <= wr.x1 && k.y >= wr.D - 6);
        if (own.length >= 2) chests++;
        if (own.some((k) => k.slots.some((s) => s?.item === ITEM.TRIDENT))) tridents++;
      }
      c.everyWorldHasAShip = ships === 12;
      c.mastBreaksTheSurface = masts === ships;
      c.shipHasTwoChests = chests === ships;
      c.tridentIsRandom = tridents >= 1 && tridents <= 11;
      // 2. mundo de teste para clima e ondas
      const w = new World(1600, 480, 20260924); world = game.world = w; game.map = new WorldMap(w); renderer.bg = null;
      game.mobs = []; game.drops = []; game.adminGod = true; game.adminFreezeTime = true; game.adminFreezeWeather = true;
      game.weather = createWeather(); game.weather.timer = 1e9; game.weather.triggered = true; game.time = 0.25; game.daylight = 1;
      const sea = w.seaLevel, deepX = w.oceanStart + 200, lagoonX = w.oceanStart + 52;
      const setWx = (type, over = {}) => { game.weather.event = type; game.weather.mix = weatherMixOf(type, 1); Object.assign(game.weather, { rain: 0, lightning: 0, hail: 0, tornadoLevel: 0, wind: 8, ...game.weather.mix, ...over }); };
      setWx('calm'); c.calmIsFlat = oceanStormLevel(game) === 0;
      setWx('rain'); c.plainRainIsNotAStorm = oceanStormLevel(game) === 0;
      setWx('wind'); c.windAloneIsNotAStorm = oceanStormLevel(game) === 0;
      setWx('storm'); c.stormIsAStorm = oceanStormLevel(game) > 0.9;
      setWx('hail'); c.hailIsAStorm = oceanStormLevel(game) > 0.6;
      setWx('supercell'); c.supercellIsAStorm = oceanStormLevel(game) > 0.9;
      // 3. as molas só ganham marulhada no temporal, e a laguna rasa fica quase calma
      const player = game.player; canvas.width = 1280; canvas.height = 720; game.zoom = 2;
      const run = (frames) => { player.x = deepX * T; player.y = (sea - 6) * T; game.adminFly = true; for (let i = 0; i < frames; i++) { game.time = 0.25; update(1 / 60); } };
      setWx('calm'); run(30);
      const slicesCalm = waterWaveSlices(game, deepX, sea);
      c.noSwellInCalm = !slicesCalm || slicesCalm.every((v) => v === 0);
      setWx('storm', { wind: 14, targetWind: 14 }); run(300);
      c.swellLevelRose = game.swellLevel > 0.9;
      let spread = 0; for (let t = 0; t < 120; t++) { game.swellT += 0.05; const s = waterWaveSlices(game, deepX, sea); if (s) spread = Math.max(spread, Math.max(...s) - Math.min(...s)); }
      c.stormMakesBigWaves = spread >= 6;
      c.lagoonIsProtected = swellColumn(game, lagoonX, sea) < swellColumn(game, deepX, sea) * 0.6;
      c.smallPondGetsNone = swellColumn(game, deepX, sea - 40) === 0;
      c.swellHasSpray = (() => { const before = game.particles.length; game.swellT = 3; for (let i = 0; i < 90; i++) updateSwell(game, 1 / 60); return game.particles.length > before; })();
      // 4. quem boia é levado na direção do vento
      setWx('storm', { wind: 14, targetWind: 14 });
      player.x = deepX * T; player.y = (sea - 2) * T; player.vx = player.vy = 0; game.adminFly = false; game.waves = new Map();
      const x0 = player.x; for (let i = 0; i < 480; i++) { game.time = 0.25; update(1 / 60); }
      c.swimmerDriftsWithTheWind = player.x - x0 > 20;
      // 5. tartaruga e arraia
      c.newSpeciesRegistered = !!(AQUATIC.turtle && AQUATIC.ray && WILDLIFE.turtle?.aquatic && WILDLIFE.ray?.aquatic);
      c.newSpeciesHaveFrames = [0, 1, 2, 3].every((f) => aquaticSprite('turtle', f).normal.width > 10 && aquaticSprite('ray', f).normal.width > 20);
      c.newSpeciesInBestiary = bestiaryEntries().some((e) => e.kind === 'turtle') && bestiaryEntries().some((e) => e.kind === 'ray');
      const t = new Wildlife('turtle', 0, 0); c.turtleSurvivesAUpdate = (() => { t.x = deepX * T; t.y = (sea + 14) * T; game.mobs = [t]; for (let i = 0; i < 30; i++) updateMobs(game, 1 / 60); return true; })();
      // 5b. os corais do fundo quebram: o clique (também na parte do lado do sprite) solta o item, deixa o lugar vazio e ele cresce de novo
      game.weather.event = 'calm'; game.weather.mix = weatherMixOf('calm', 1); Object.assign(game.weather, { rain: 0, lightning: 0, hail: 0, tornadoLevel: 0, wind: 8 }); game.swellLevel = 0;
      let coral = null;
      for (let x = w.oceanStart + 36; x < w.w - 20 && !coral; x++) { const s = w.surface[x], sp = oaReefAt(w, x, s); if (sp?.oaKind === 'brain' && s - sea < 14 && !oaReefAt(w, x + 1, w.surface[x + 1]) && w.getTile(x + 1, s - 1) === TILE.AIR) coral = [x, s, sp]; }   // com o bloco do lado vazio: o clique ali só pode ser deste coral
      c.reefHasCorals = !!coral;
      if (coral) {
        const [cx, s, sp] = coral; game.drops = []; game.adminFly = true;
        player.x = (cx - 2) * T; player.y = (s - 5) * T; player.vx = player.vy = 0; for (let i = 0; i < 10; i++) { game.time = 0.25; update(1 / 60); player.x = (cx - 2) * T; player.y = (s - 5) * T; } updateCamera(1, true);
        game.inventory.slots.fill(null); game.selected = 0;
        const z = game.zoom, tx = cx + 1;   // clica no bloco ao lado: o coral é mais largo que um bloco
        input.mouse.x = (tx + 0.5) * T * z - Math.round(game.cam.x * z); input.mouse.y = (s - 1 + 0.5) * T * z - Math.round(game.cam.y * z);
        input.mouse.left = true; game.harvestCooldown = 0; handleInteraction(1 / 60); input.mouse.left = false;
        c.coralBreaksOnClick = oaReefAt(w, cx, s) === null && game.drops.some((d) => d.item === ENV_HARVEST[sp.envKind].item);
        game.clock = (game.clock || 0) + 2000; updateEnvironment(game, 2.5);
        c.coralGrowsBack = !!oaReefAt(w, cx, s);
      }
      // 5c. tromba d'água: o tornado sobre o mar pousa na superfície, afunda a água numa tigela, sobe em espiral e puxa quem nada
      setWx('tornado', { rain: 0.55, wind: 14, targetWind: 14 });
      game.weather.funnel = null; spawnWeatherFunnel(game);
      const fn = game.weather.funnel; fn.strength = 1; fn.x = deepX * T; fn.retarget = 1e9; fn.tx = fn.x; fn.age = 3;
      game.drops = []; game.mobs = []; game.waves = new Map(); game.spoutDrops = [];
      player.x = (deepX - 3) * T; player.y = (sea + 2) * T; player.vx = player.vy = 0; game.adminFly = false;
      const px0 = player.cx; let pull = 0;
      for (let i = 0; i < 240; i++) { game.time = 0.25; update(1 / 60); fn.x = deepX * T; fn.strength = 1; }
      c.funnelLandsOnTheWater = fn.water === true && Math.abs(fn.y - sea * T) < 6;
      c.spoutLiftsWaterDrops = game.spoutDrops.length > 40;
      c.bowlSinksTheSurface = vortexAt(game, fn.x, sea) > 6 && vortexAt(game, fn.x + 400, sea) === 0;
      c.rimRisesAroundTheBowl = vortexAt(game, fn.x + SPOUT.bowlR * 1.45, sea) < 0;
      c.spoutRipplesTheWater = game.waves.size > 20;
      c.lavaIgnoresTheSpout = vortexAt(Object.create(Object.assign(Object.create(game), { lavaFluid: true })), fn.x, sea) === 0;
      c.waterspoutDrawsWithoutErrors = (() => { try { player.x = (deepX - 8) * T; player.y = (sea - 4) * T; updateCamera(1, true); renderer._menuPass = true; renderer.render(game); renderer._menuPass = false; return true; } catch (e) { return false; } })();
      game.weather.funnel = null; game.spoutDrops = [];
      // 5c2. a base do funil nunca afunda: em toda coluna de mar ela fica na linha d'água (alga, recife e mastro de navio não contam)
      { let bad = 0; for (const sd of [20260924, 5, 77]) { const ww = new World(1600, 480, sd); for (let x = ww.oceanStart - 30; x < ww.w; x++) if (ww.hasWater(x, ww.seaLevel)) { const b = funnelBase(ww, x); if (!b.water || Math.abs(b.y - ww.seaLevel * T) > 1) bad++; } } c.funnelBaseNeverSinks = bad === 0; }
      // 5d. raio sobre a água: cai na superfície (não no fundo), eletriza a água em volta e machuca quem está nela
      setWx('storm', { wind: 14, targetWind: 14 }); game.weather.thunder = 1e9; game.weather.strikes = []; game.shocks = [];
      player.x = deepX * T; player.y = (sea - 3) * T; game.adminFly = true; for (let i = 0; i < 5; i++) { game.time = 0.25; update(1 / 60); }
      game.mobs = []; game.particles.length = 0;
      let waterStrikes = 0, groundedStrikes = 0; const rndKeep = Math.random;
      for (let i = 0; i < 400; i++) { Math.random = () => 0.05 + (i % 7) * 0.12; weatherLightning(game); }
      Math.random = rndKeep;
      for (const st of game.weather.strikes) { if (st.water && Math.abs(st.y - sea * T) < 6) waterStrikes++; else groundedStrikes++; }
      c.lightningPicksTheWaterSurface = waterStrikes > 5 && groundedStrikes === 0;
      game.weather.strikes = [];
      const strike = { x: deepX * T, y: sea * T, tx: deepX, ty: sea, t: 0, warn: 0.05, bolt: null, hit: false, water: true };
      const fish = new Wildlife('sardine', strike.x - 4, (sea + 3) * T), far = new Wildlife('sardine', strike.x + 600, (sea + 3) * T);
      for (const m of [fish, far]) { m.variant = 0; m.dir = 1; m.facing = 1; m.home = { x: m.cx, y: m.cy }; m.keep = true; }
      game.mobs = [fish, far]; game.weather.strikes = [strike];
      player.x = (deepX - 1) * T; player.y = (sea + 4) * T; player.hp = 100; player.invulnerable = 0; game.adminGod = false; game.adminFly = false;
      for (let i = 0; i < 40; i++) { game.time = 0.25; update(1 / 60); fish.vx = fish.vy = 0; fish.x = strike.x - 4; fish.y = (sea + 3) * T; player.x = (deepX - 1) * T; player.y = (sea + 4) * T; player.vx = player.vy = 0; player.invulnerable = 0; }
      c.strikeElectrifiesTheWater = game.shocks.length === 1 && shockLevelAt(game, strike.x, (sea + 3) * T) > 0.5;
      c.waterAboveIsNotShocked = shockLevelAt(game, strike.x, (sea - 2) * T) === 0 && shockLevelAt(game, strike.x + 600, (sea + 3) * T) === 0;
      c.fishInTheZoneTakesDamage = fish.dead || fish.hp < fish.def.hp;
      c.fishFarAwayIsSafe = !far.dead && far.hp === far.def.hp;
      c.swimmerInTheZoneTakesDamage = player.hp < 100;
      game.adminGod = true;
      const t0 = game.shocks[0]?.t ?? 0; for (let i = 0; i < 60 * 8; i++) { game.time = 0.25; update(1 / 60); }
      c.shockFadesAway = game.shocks.length === 0;
      c.lightningOverWaterDrawsWithoutErrors = (() => { try { game.shocks = []; shockWater(game, { x: deepX * T, y: sea * T }); player.x = (deepX - 8) * T; player.y = (sea - 4) * T; updateCamera(1, true); renderer._menuPass = true; renderer.render(game); renderer._menuPass = false; return true; } catch (e) { return false; } })();
      game.shocks = []; game.mobs = [];
      // 6. desenhar o fundo do mar inteiro (recife, navio, luz) sem erro, de dia, de noite e em temporal
      const wr = w.wreck; let drew = true;
      for (const [hour, storm] of [[0.25, false], [0.62, false], [0.25, true]]) {
        try { setWx(storm ? 'storm' : 'calm'); game.time = hour; game.daylight = daylightAt(hour); player.x = ((wr.x0 + wr.x1) / 2) * T; player.y = (wr.D - 6) * T; updateCamera(1, true); renderer._menuPass = true; renderer.render(game); } catch (e) { drew = false; }
      }
      renderer._menuPass = false; c.oceanDrawsWithoutErrors = drew;
      return c;
    });
    console.log(checks);
    for (const [name, value] of Object.entries(checks)) assert.equal(value, true, name);
    assert.deepEqual(errors, [], 'Erros de execução no navegador');
    console.log('ok');
  } finally { await browser.close(); }
})().catch((e) => { console.error(e); process.exitCode = 1; });
