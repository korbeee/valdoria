// Deterministic visual fixture. Runs in a fresh browser context; no saved game is changed.
// PLAYWRIGHT_PATH=<path to playwright> node tests/golden-rendering.cjs [--baseline]
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const baseline = process.argv.includes('--baseline');
const software = process.argv.includes('--software') ? 'all' : process.argv.includes('--software-main') ? 'main' : process.argv.includes('--software-scratch') ? 'scratch' : null;

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error' && message.text().startsWith('[quadro]')) errors.push(message.text()); });
    await page.addInitScript(({ software }) => {
      // Rendering happens explicitly in this test. Suppress the application's frame scheduler.
      window.requestAnimationFrame = () => 1;
      let seed = 75413;
      Math.random = () => ((seed = Math.imul(seed, 1664525) + 1013904223 | 0) >>> 0) / 4294967296;
      if (software === 'all' || software === 'main') {
        const getContext = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (kind, options) { return getContext.call(this, kind, kind === '2d' && (software === 'all' || this.id === 'game') ? { ...options, willReadFrequently: true } : options); };
      }
    }, { software });
    await page.goto('http://localhost/jogo-teste/');
    await page.waitForFunction(() => typeof game === 'object' && typeof Menu === 'object');
    await page.evaluate(({ software }) => {
      finishOpening(game); Menu.root.hidden = true; game.paused = true;
      Object.defineProperty(performance, 'now', { value: () => 12345, configurable: true });
      window.goldenRealNow = Date.now;
      if (software === 'scratch') Background.prototype.scratchCanvas = function (W, H) {
        if (!this.scratch || this.scratch.canvas.width !== W || this.scratch.canvas.height !== H) this.scratch = makeCanvas(W, H).getContext('2d', { willReadFrequently: true });
        return this.scratch;
      };
      world = game.world = new World(240, 120, 75413, { lazy: true });
      world.biome.fill(BIOME.FOREST); world.lootChests = []; world.npcSpawns = [];
      const ground = x => x >= 113 ? 48 : x >= 108 ? 49 : 50;
      for (let x = 0; x < world.w; x++) {
        world.surface[x] = ground(x);
        for (let y = ground(x); y < world.h; y++) {
          world.tiles[y * world.w + x] = y === ground(x) ? TILE.GRASS : y > ground(x) + 7 ? TILE.STONE : TILE.DIRT;
          world.walls[y * world.w + x] = WALL.DIRT;
        }
      }
      buildHouse(world, () => .65, 92, 50, 13, 11, VILLAGE_STYLES.default);
      for (const [x, height] of [[84, 8], [113, 10], [133, 7]])
        for (let y = ground(x) - height; y < ground(x); y++) world.tiles[y * world.w + x] = TILE.TRUNK;
      // Surface opening with a bend, roofed chamber and lit recess.
      for (let y = 49; y <= 58; y++) for (let x = 107; x <= 110; x++) {
        world.tiles[y * world.w + x] = TILE.AIR; world.walls[y * world.w + x] = y < 55 ? WALL.NONE : WALL.DIRT;
      }
      for (let y = 55; y <= 61; y++) for (let x = 96; x <= 122; x++) {
        world.tiles[y * world.w + x] = TILE.AIR; world.walls[y * world.w + x] = WALL.DIRT;
      }
      world.tiles[57 * world.w + 100] = TILE.TORCH;
      for (let y = 48; y <= 52; y++) for (let x = 120; x <= 128; x++) {
        world.tiles[y * world.w + x] = TILE.AIR; world.walls[y * world.w + x] = WALL.NONE;
        world.water[y * world.w + x] = WATER_MAX;
      }
      // Stone at the pool bottom remains visible through its transparent water.
      for (let x = 120; x <= 128; x++) world.tiles[53 * world.w + x] = TILE.STONE;
      for (let x = 0; x < world.w; x++) world.computeSkyTop(x);
      game.cam = { x: 80 * T, y: 25 * T }; game.zoom = 1.5;
      game.time = .2; game.daylight = 1; game.weather = createWeather(); game.weather.rain = 0;
      game.mobs = []; game.npcs = []; game.drops = []; game.particles = []; game.fallingTrees = [];
      game.crashSite = null; game.objective = null; game.intro.active = false;
      game.adminNightVision = false; game.showHelp = false; game.target.visible = false;
      game.player.x = 88 * T; game.player.y = 50 * T - game.player.h;
      game.player.stepOffset = 0; game.player.vx = 0; game.player.vy = 0; game.player.grounded = true;
      game.map = new WorldMap(world); game.map.revealAll(); renderer.bg = null;
      GAME_OPTIONS.shaders = true; GAME_OPTIONS.shake = false; GAME_OPTIONS.showFps = false;
      world.computeLight(108, 47); world.composeLight(1);
      renderer.render(game);
    }, { software });
    const scene = await page.evaluate(() => renderer.canvas.toDataURL());
    fs.writeFileSync(`tests/golden-${baseline ? 'before' : 'after'}.png`, Buffer.from(scene.split(',')[1], 'base64'));
    if (baseline) {
      assert.deepEqual(errors, []);
      console.log(JSON.stringify({ baseline: true, errors }));
      return;
    }
    const worldOnly = await page.evaluate(() => {
      const ui = renderer.drawUI, vitals = game.inventoryUI.drawVitals;
      renderer.drawUI = () => {}; game.inventoryUI.drawVitals = () => {};
      renderer.render(game); const data = renderer.canvas.toDataURL();
      renderer.drawUI = ui; game.inventoryUI.drawVitals = vitals; renderer.render(game);
      return data;
    });
    fs.writeFileSync('tests/golden-world.png', Buffer.from(worldOnly.split(',')[1], 'base64'));
    const result = await page.evaluate(() => {
      const checks = {};
      const capture = () => renderer.ctx.getImageData(0, 0, renderer.canvas.width, renderer.canvas.height).data;
      const equal = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
      const diff = (a, b, width = 1280) => {
        const d = { count: 0, max: 0, bounds: [width, a.length / 4 / width, 0, 0], first: [] };
        for (let i = 0; i < a.length; i += 4) {
          const delta = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2]), Math.abs(a[i + 3] - b[i + 3]));
          if (!delta) continue;
          const x = i / 4 % width, y = Math.floor(i / 4 / width);
          d.count++; d.max = Math.max(d.max, delta); d.bounds[0] = Math.min(d.bounds[0], x); d.bounds[1] = Math.min(d.bounds[1], y);
          d.bounds[2] = Math.max(d.bounds[2], x); d.bounds[3] = Math.max(d.bounds[3], y);
          if (d.first.length < 4) d.first.push({ x, y, before: [...a.slice(i, i + 4)], after: [...b.slice(i, i + 4)] });
        }
        return d;
      };
      const lumaAt = (tx, ty, half = 4) => {
        const x = Math.round((tx * T - game.cam.x) * game.zoom), y = Math.round((ty * T - game.cam.y) * game.zoom);
        const d = renderer.ctx.getImageData(x - half, y - half, half * 2, half * 2).data;
        let sum = 0; for (let i = 0; i < d.length; i += 4) sum += .2126 * d[i] + .7152 * d[i + 1] + .0722 * d[i + 2];
        return sum / (d.length / 4);
      };
      // Let the browser finish its canvas readback backend warm-up before
      // comparing frames (Chromium can switch GPU/software after repeated reads).
      for (let frame = 0; frame < 4; frame++) { renderer.render(game); capture(); }
      renderer.render(game);
      const golden = capture();
      checks.opaqueOutput = golden.every((v, i) => i % 4 !== 3 || v === 255);
      const samples = { surface: lumaAt(116.5, 47.5), cave: lumaAt(119.5, 59.5), torch: lumaAt(100.5, 57.5), opening: lumaAt(108.5, 51.5), water: lumaAt(124.5, 50.5) };
      checks.caveDarkerThanOpening = samples.cave < samples.opening;
      checks.torchVisible = samples.torch > samples.cave * 1.5;
      renderer.render(game); const second = capture(); checks.deterministicStaticFrame = equal(golden, second);
      const staticDifference = { count: 0, max: 0, bounds: [1280, 900, 0, 0] };
      for (let i = 0; i < golden.length; i += 4) {
        const delta = Math.max(Math.abs(golden[i] - second[i]), Math.abs(golden[i + 1] - second[i + 1]), Math.abs(golden[i + 2] - second[i + 2]));
        if (!delta) continue;
        const x = i / 4 % 1280, y = Math.floor(i / 4 / 1280);
        staticDifference.count++; staticDifference.max = Math.max(staticDifference.max, delta);
        staticDifference.bounds[0] = Math.min(staticDifference.bounds[0], x); staticDifference.bounds[1] = Math.min(staticDifference.bounds[1], y);
        staticDifference.bounds[2] = Math.max(staticDifference.bounds[2], x); staticDifference.bounds[3] = Math.max(staticDifference.bounds[3], y);
      }

      // Hook the real HUD entry, compare pixels immediately before/after it to locate
      // completely opaque UI pixels, then ensure those same pixels survive each mode.
      const originalUI = renderer.drawUI;
      let uiBefore, uiAfter;
      renderer.drawUI = function (...args) { uiBefore = capture(); originalUI.apply(this, args); uiAfter = capture(); };
      renderer.render(game);
      const uiOnBefore = uiBefore, uiOn = uiAfter;
      GAME_OPTIONS.shaders = false; renderer.render(game);
      const uiOffBefore = uiBefore, uiOff = uiAfter;
      let uiPixels = 0, matchingUI = 0;
      for (let i = 0; i < uiOn.length; i += 4) {
        const backgroundChanged = Math.abs(uiOnBefore[i] - uiOffBefore[i]) + Math.abs(uiOnBefore[i + 1] - uiOffBefore[i + 1]) + Math.abs(uiOnBefore[i + 2] - uiOffBefore[i + 2]) > 15;
        const uiChanged = Math.abs(uiOn[i] - uiOnBefore[i]) + Math.abs(uiOn[i + 1] - uiOnBefore[i + 1]) + Math.abs(uiOn[i + 2] - uiOnBefore[i + 2]) > 40;
        if (!backgroundChanged || !uiChanged) continue;
        uiPixels++;
        if (uiOn[i] === uiOff[i] && uiOn[i + 1] === uiOff[i + 1] && uiOn[i + 2] === uiOff[i + 2]) matchingUI++;
      }
      renderer.drawUI = originalUI;
      checks.uiUnprocessedOpaquePixels = matchingUI > 100;
      checks.shaderToggleChangesWorld = !equal(golden, capture());
      const off = renderer.canvas.toDataURL();
      const disabledCache = renderer.sunCache, disabledMask = renderer.shaderSurface.toDataURL();
      game.cam.x += T; renderer.render(game); game.cam.x -= T;
      checks.disabledSkipsLightPreparation = renderer.sunCache === disabledCache && renderer.shaderSurface.toDataURL() === disabledMask;
      GAME_OPTIONS.shaders = true; game.adminNightVision = true; renderer.render(game);
      checks.nightVisionChangesLighting = !equal(golden, capture());
      const nightVision = renderer.canvas.toDataURL();
      game.adminNightVision = false;

      // Slight motion that rounds to the same world pixel must not re-sample the artwork.
      const originalCam = { ...game.cam };
      const bgDrawOriginal = renderer.bg.draw, shadersOriginal = drawWorldShaders;
      let stageTag = 'before'; const stageData = {};
      renderer.bg.draw = function (...args) { const ret = bgDrawOriginal.apply(this, args); if (stageTag) stageData[stageTag + 'Background'] = capture(); return ret; };
      drawWorldShaders = function (...args) { if (stageTag) stageData[stageTag + 'PreGrade'] = capture(); const ret = shadersOriginal(...args); if (stageTag) stageData[stageTag + 'PostGrade'] = capture(); return ret; };
      renderer.render(game); const beforeMotion = capture(), motionBefore = renderer.canvas.toDataURL();
      stageTag = null;
      const maskBefore = { light: [...renderer.shaderPixels.data], rays: [...renderer.shaderGlowPixels.data], bloom: [...renderer.shaderMaskPixels.data] };
      const drawWorldOriginal = renderer.drawWorld;
      const worldTransforms = [];
      let firstStill;
      renderer.drawWorld = function (...args) { const t = this.ctx.getTransform(); worldTransforms.push([t.e, t.f, this.ctx.imageSmoothingEnabled]); return drawWorldOriginal.apply(this, args); };
      for (const offset of [0, .1, .8, T + .1, T * 3 + .1]) {
        game.cam.x = originalCam.x + offset; renderer.render(game);
        if (offset === 0) firstStill = capture();
      }
      checks.integerCameraTranslation = worldTransforms.every(([x, y]) => Number.isInteger(x) && Number.isInteger(y));
      checks.nearestNeighborWorld = worldTransforms.every(([, , smoothing]) => !smoothing);
      checks.subpixelCameraSnap = worldTransforms[0][0] === worldTransforms[1][0];
      renderer.drawWorld = drawWorldOriginal; game.cam = originalCam;
      stageTag = 'after';
      renderer.render(game);
      renderer.bg.draw = bgDrawOriginal; drawWorldShaders = shadersOriginal;
      const movedBack = capture();
      checks.cameraRoundTripStable = equal(beforeMotion, movedBack);
      const motionAfter = renderer.canvas.toDataURL();
      const motionDifference = diff(beforeMotion, movedBack);
      const firstStillDifference = diff(beforeMotion, firstStill), settledMotionDifference = diff(firstStill, movedBack);
      const motionMaskDifferences = { light: diff(maskBefore.light, renderer.shaderPixels.data, renderer.shaderLight.width), rays: diff(maskBefore.rays, renderer.shaderGlowPixels.data, renderer.shaderSurface.width), bloom: diff(maskBefore.bloom, renderer.shaderMaskPixels.data, renderer.shaderBloomMask.width) };
      const motionStageDifferences = Object.fromEntries(['Background', 'PreGrade', 'PostGrade'].map(stage => [stage, diff(stageData['before' + stage], stageData['after' + stage])]));

      // Real-world transmission: no directional sunlight through ten solid ground cells.
      const field = shaderSunField(world, 90, 45, 42, 20, game.time);
      const at = (x, y) => field[(y - 45) * 42 + x - 90];
      checks.solidGroundOccludesSun = at(119, 59) < .01;
      checks.openSkyReceivesSun = at(118, 45) > .8;
      checks.defaultSunTravelsDownLeft = RENDER_STYLE.sun.direction.x < 0 && RENDER_STYLE.sun.direction.y > 0;
      checks.waterPresent = world.water[50 * world.w + 124] === WATER_MAX;
      const waterBefore = new Uint8Array(world.water);
      renderer.render(game); checks.renderDoesNotMutateWater = equal(waterBefore, world.water);
      const wet = lumaAt(124.5, 50.5), drawWaterOriginal = drawWater;
      drawWater = () => {}; renderer.render(game); const dry = lumaAt(124.5, 50.5);
      drawWater = drawWaterOriginal; renderer.render(game);
      checks.transparentWaterChangesScene = Math.abs(wet - dry) > 3 && wet > 10;

      // Direction and material transmission are independent of scene composition.
      const originalSun = { ...RENDER_STYLE.sun, direction: { ...RENDER_STYLE.sun.direction } };
      const mock = { isSkyExposed: (x, y) => y < 10, getWall: () => WALL.NONE, hasWater: () => false,
        getTile: (x, y) => y === 10 && x >= 8 && x <= 18 ? TILE.STONE : TILE.AIR };
      RENDER_STYLE.sun.followTime = false; RENDER_STYLE.sun.direction = { x: 0, y: 1 };
      const vertical = shaderSunField(mock, 0, 0, 30, 20, .2);
      checks.roofBlocksDirectSun = vertical[15 * 30 + 12] < .001 && vertical[15 * 30 + 2] > .99;
      mock.getTile = (x, y) => y === 10 && x >= 8 && x <= 18 ? TILE.LEAVES : TILE.AIR;
      const foliage = shaderSunField(mock, 0, 0, 30, 20, .2);
      checks.foliageFiltersSun = foliage[15 * 30 + 12] > .2 && foliage[15 * 30 + 12] < .9;
      mock.getTile = (x, y) => y === 10 && x >= 8 && x <= 18 ? TILE.GLASS : TILE.AIR;
      const glass = shaderSunField(mock, 0, 0, 30, 20, .2);
      checks.glassTransmitsSun = glass[15 * 30 + 12] > foliage[15 * 30 + 12] && glass[15 * 30 + 12] < 1;
      mock.getTile = (x, y) => y === 10 && x >= 8 && x <= 18 ? TILE.STONE : TILE.AIR;
      RENDER_STYLE.sun.direction = { x: -.85, y: 1 };
      const diagonal = shaderSunField(mock, 0, 0, 30, 20, .2);
      checks.shadowFallsDownLeft = diagonal[15 * 30 + 6] < .1 && diagonal[15 * 30 + 21] > .99;
      checks.raysFollowWorldDirection = Math.abs(shaderBeamAt(620, 480, .2) - shaderBeamAt(620 - 85, 580, .2)) < 1e-6;
      Object.assign(RENDER_STYLE.sun, originalSun);

      // Bright-pixel extraction: ordinary midtones produce no bloom; a highlight
      // emits a restrained halo, which is then blocked by an explicit cave mask.
      const bloomCanvas = makeCanvas(256, 128), bc = bloomCanvas.getContext('2d');
      bc.fillStyle = '#444444'; bc.fillRect(0, 0, 256, 128);
      const bloomMask = makeCanvas(256, 128), bmc = bloomMask.getContext('2d');
      bmc.fillStyle = '#fff'; bmc.fillRect(0, 0, 256, 64);
      const bloomRenderer = { canvas: bloomCanvas, ctx: bc, shaderBloomMask: bloomMask,
        shaderBounds: { dx: 0, dy: 0, width: 256, height: 128 } };
      drawShaderBloom(bloomRenderer, game, 256, 128, 0, 0, 1);
      checks.midtoneDoesNotBloom = bc.getImageData(30, 30, 1, 1).data[0] === 68;
      bc.fillStyle = '#fff8d0'; bc.fillRect(120, 20, 24, 32); bc.fillRect(120, 78, 24, 32);
      drawShaderBloom(bloomRenderer, game, 256, 128, 0, 0, 1);
      checks.brightHighlightBlooms = bc.getImageData(119, 36, 1, 1).data[0] > 68;
      checks.caveMaskBlocksBloom = bc.getImageData(119, 92, 1, 1).data[0] === 68;

      renderer.render(game);
      const rayEnergy = () => renderer.shaderRays.reduce((sum, value) => sum + value, 0);
      const daytimeRays = rayEnergy();
      game.weather.rain = 1; renderer.render(game); const rainyRays = rayEnergy();
      checks.rainDampsRays = rainyRays < daytimeRays * .5;
      const rain = renderer.canvas.toDataURL();
      game.daylight = 0; game.time = .7; renderer.render(game);
      const night = renderer.canvas.toDataURL();
      checks.noSunRaysAtNight = rayEnergy() === 0;
      const nightTorch = lumaAt(100.5, 57.5), nightCave = lumaAt(119.5, 59.5);
      checks.localLightSurvivesNight = nightTorch > nightCave * 2 && nightTorch > 35;
      game.daylight = 1; game.time = .2; game.weather.rain = 0; renderer.render(game);

      // Performance uses Date.now because visual animation time is frozen above.
      const start = Date.now(); for (let i = 0; i < 20; i++) renderer.render(game);
      const frameMs = (Date.now() - start) / 20;
      const movingStart = Date.now();
      for (let i = 0; i < 20; i++) { game.cam.x = originalCam.x + i * T; renderer.render(game); }
      const movingFrameMs = (Date.now() - movingStart) / 20;
      game.cam = originalCam;
      renderer.canvas.width = 900; renderer.canvas.height = 600; game.zoom = 1.7;
      renderer.render(game);
      checks.resizeRebuildsLightBuffers = renderer.shaderLight.width === Math.ceil(900 / 1.7 / T) + 5 && renderer.shaderLight.height === Math.ceil(600 / 1.7 / T) + 5;
      checks.resizePreservesPixelSampling = renderer.ctx.imageSmoothingEnabled === false;
      renderer.canvas.width = 1280; renderer.canvas.height = 900; game.zoom = 1.5; renderer.render(game);
      return { checks, samples, uiPixels, matchingUI, frameMs, movingFrameMs, worldTransforms, staticDifference, motionDifference, firstStillDifference, settledMotionDifference, motionMaskDifferences, motionStageDifferences, off, nightVision, night, rain, motionBefore, motionAfter,
        buffers: ['shaderLight', 'shaderSurface', 'shaderBloomMask'].map(key => ({ key, width: renderer[key]?.width, height: renderer[key]?.height })),
        bloomBuffer: { width: renderer.bloomState?.width, height: renderer.bloomState?.height } };
    });
    fs.writeFileSync('tests/golden-disabled.png', Buffer.from(result.off.split(',')[1], 'base64')); delete result.off;
    for (const key of ['nightVision', 'night', 'rain', 'motionBefore', 'motionAfter']) {
      fs.writeFileSync(`tests/golden-${key}.png`, Buffer.from(result[key].split(',')[1], 'base64')); delete result[key];
    }
    result.errors = errors;
    fs.writeFileSync('tests/golden-report.json', JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2));
    assert.deepEqual(errors, []);
    for (const [key, passed] of Object.entries(result.checks)) assert.equal(passed, true, key);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
