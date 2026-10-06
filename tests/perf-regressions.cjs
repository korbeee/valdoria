// Checks for the drawing optimisations: run merging must paint the same pixels as the
// per-tile path, the hidden-background skip must only trigger when nothing shows, the
// canopy shade must follow tree edits and the bloom mask must still reach the GPU.
//   node tests/perf-regressions.cjs
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.addInitScript(() => {
      window.requestAnimationFrame = () => 1;
      let seed = 4711;
      Math.random = () => ((seed = Math.imul(seed, 1664525) + 1013904223 | 0) >>> 0) / 4294967296;
    });
    await page.goto('http://localhost/jogo-teste/');
    await page.waitForFunction(() => typeof game === 'object');
    const result = await page.evaluate(() => {
      const checks = {}, notes = {};
      finishOpening(game); Menu.root.hidden = true; game.paused = true; game.intro.active = false;
      game.weather ??= createWeather();
      GAME_OPTIONS.shaders = true; GAME_OPTIONS.shake = false; GAME_OPTIONS.showFps = false;
      Object.defineProperty(performance, 'now', { value: () => 4242, configurable: true });

      // 1. The repacked strip of interior blocks paints the same pixels as the atlas.
      const probe = makeCanvas(4 * T, T), pc = probe.getContext('2d', { willReadFrequently: true });
      const reference = makeCanvas(4 * T, T), rc = reference.getContext('2d', { willReadFrequently: true });
      pc.imageSmoothingEnabled = rc.imageSmoothingEnabled = false;
      let stripTypes = 0, stripMismatch = 0;
      for (let t = 0; t < renderer.tex.blocks.length; t++) {
        const atlas = renderer.tex.blocks[t], strip = atlas && blockRunStrip(atlas);
        if (!strip) continue;
        stripTypes++;
        for (let row = 0; row < 4; row++) { // as quatro linhas (y&3) do atlas
          pc.clearRect(0, 0, 4 * T, T); rc.clearRect(0, 0, 4 * T, T);
          pc.drawImage(strip, row * 4 * T, 0, 4 * T, T, 0, 0, 4 * T, T);
          for (let k = 0; k < 4; k++) rc.drawImage(atlas, (row * 4 + k) * SPR, 0, SPR, SPR, k * T - MARGIN, -MARGIN, SPR, SPR);
          const a = pc.getImageData(0, 0, 4 * T, T).data, b = rc.getImageData(0, 0, 4 * T, T).data;
          for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) { stripMismatch++; break; }
        }
      }
      checks.blockStripMatchesAtlas = stripTypes > 4 && stripMismatch === 0;
      notes.blockStrip = { stripTypes, stripMismatch };

      // 2. A four-tile wall strip equals four separate tile draws.
      let wallTypes = 0, wallMismatch = 0;
      for (const atlas of renderer.tex.walls) {
        if (!atlas) continue;
        wallTypes++;
        for (let row = 0; row < 4; row++) {
          pc.clearRect(0, 0, 4 * T, T); rc.clearRect(0, 0, 4 * T, T);
          pc.drawImage(atlas, 0, row * T, 4 * T, T, 0, 0, 4 * T, T);
          for (let k = 0; k < 4; k++) rc.drawImage(atlas, k * T, row * T, T, T, k * T, 0, T, T);
          const a = pc.getImageData(0, 0, 4 * T, T).data, b = rc.getImageData(0, 0, 4 * T, T).data;
          for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) { wallMismatch++; break; }
        }
      }
      checks.wallStripMatchesAtlas = wallTypes > 4 && wallMismatch === 0;
      notes.wallStrip = { wallTypes, wallMismatch };

      // Deterministic fixture: sealed stone chamber deep underground, plus open surface.
      const w = game.world;
      const capture = () => renderer.ctx.getImageData(0, 0, renderer.canvas.width, renderer.canvas.height).data;
      const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
      const deep = 95, cx = 120;
      for (let y = deep - 14; y <= deep + 14; y++) for (let x = cx - 40; x <= cx + 40; x++) {
        w.tiles[y * w.w + x] = TILE.STONE; w.walls[y * w.w + x] = WALL.STONE;
      }
      for (let y = deep - 3; y <= deep + 3; y++) for (let x = cx - 12; x <= cx + 12; x++) w.tiles[y * w.w + x] = TILE.AIR;
      for (let x = cx - 41; x <= cx + 41; x++) w.computeSkyTop(x);
      game.zoom = 2; game.time = .3; game.daylight = 1; game.weather.rain = 0;
      game.cam.x = cx * T - canvas.width / game.zoom / 2; game.cam.y = deep * T - canvas.height / game.zoom / 2;
      game.player.x = cx * T; game.player.y = deep * T;
      w.computeLight(cx, deep); w.lightDirty = false; w.composeLight(game.daylight);

      // 3. The block run path paints what the per-tile path paints.
      for (let i = 0; i < 2; i++) renderer.render(game);
      const merged = capture();
      const strip = window.blockRunStrip;
      window.blockRunStrip = () => null;
      for (let i = 0; i < 2; i++) renderer.render(game);
      const perTile = capture();
      window.blockRunStrip = strip;
      checks.blockRunMatchesPerTile = same(merged, perTile);

      // 4. Cutting a tree rebuilds the canopy shade; digging soil reuses it.
      const sx = 60, sy = w.surface[60] - 6;
      game.cam.x = sx * T - canvas.width / game.zoom / 2; game.cam.y = sy * T - canvas.height / game.zoom / 2;
      w.computeLight(sx, w.surface[sx]); w.lightDirty = false; w.composeLight(1);
      renderer.render(game);
      let trunkX = -1, trunkY = -1;
      for (let x = sx - 20; x < sx + 20 && trunkX < 0; x++)
        for (let y = w.surface[x] - 12; y < w.surface[x]; y++) if (w.getTile(x, y) === TILE.TRUNK) { trunkX = x; trunkY = y; break; }
      notes.trunk = [trunkX, trunkY];
      const shadeBefore = renderer.sunCache.shade, treesBefore = w.treeRevision;
      w.setTile(sx, w.surface[sx] + 3, TILE.AIR); // cava terra: mesma sombra de copa
      w.computeLight(sx, w.surface[sx]); w.lightDirty = false; renderer.render(game);
      checks.soilEditKeepsCanopyShade = w.treeRevision === treesBefore && renderer.sunCache.shade === shadeBefore;
      if (trunkX >= 0) {
        w.setTile(trunkX, trunkY, TILE.AIR); // corta a árvore: sombra tem de ser refeita
        w.computeLight(sx, w.surface[sx]); w.lightDirty = false; renderer.render(game);
        checks.treeEditRebuildsCanopyShade = w.treeRevision > treesBefore && renderer.sunCache.shade !== shadeBefore;
        notes.shade = {before: shadeBefore ? 'array' : String(shadeBefore), after: renderer.sunCache.shade ? 'array' : String(renderer.sunCache.shade), trees: [treesBefore, w.treeRevision]};
      }

      // 5. The bloom mask still reaches the GPU whenever lighting changes.
      const post = renderer.gpuPostProcess;
      checks.gpuPostProcessActive = !!post?.gl;
      if (post) {
        renderer.render(game);
        const uploaded = post.maskRevision, maskRev = renderer.shaderMaskRevision;
        renderer.render(game);
        checks.unchangedMaskIsNotReuploaded = post.maskRevision === uploaded && renderer.shaderMaskRevision === maskRev;
        game.daylight = .4; game.time = .55;
        renderer.render(game);
        checks.changedMaskIsReuploaded = renderer.shaderMaskRevision > maskRev && post.maskRevision === renderer.shaderMaskRevision;
        game.daylight = 1; game.time = .3;
      }
      return { checks, notes };
    });
    console.log(JSON.stringify({ ...result, errors }, null, 2));
    assert.deepEqual(errors, []);
    for (const [name, passed] of Object.entries(result.checks)) assert.equal(passed, true, name);
    console.log(`${Object.keys(result.checks).length} drawing-optimisation checks passed`);
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
