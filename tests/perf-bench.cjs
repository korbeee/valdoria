// Gameplay performance harness. Fresh browser context, deterministic world, fixed
// camera routes. Writes tests/perf-<label>.json. No player save is touched.
//   node tests/perf-bench.cjs --label=before [--quick] [--live-only] [--iso-only]
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs = require('node:fs');
const arg = (name, fallback) => { const hit = process.argv.find(a => a.startsWith(`--${name}=`)); return hit ? hit.split('=')[1] : fallback; };
const label = arg('label', 'after');
const quick = process.argv.includes('--quick');
const REPEATS = quick ? 1 : 3, FRAMES = quick ? 40 : 90, WARMUP = 20;
const VIEW = { width: 1600, height: 900 };

const isolated = async (browser, url = 'http://localhost/jogo-teste/') => {
  const context = await browser.newContext({ viewport: VIEW });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  // The harness renders explicitly; suppress the application's own scheduler.
  await page.addInitScript(() => {
    window.requestAnimationFrame = () => 1;
    let seed = 20260922;
    Math.random = () => ((seed = Math.imul(seed, 1664525) + 1013904223 | 0) >>> 0) / 4294967296;
  });
  await page.goto(url);
  await page.waitForFunction(() => typeof game === 'object' && typeof renderer === 'object');
  const result = await page.evaluate(async ({ REPEATS, FRAMES, WARMUP }) => {
    finishOpening(game); Menu.root.hidden = true; game.paused = true; game.intro.active = false;
    game.adminNightVision = false; GAME_OPTIONS.shake = false; GAME_OPTIONS.showFps = false;
    game.mapUI.open = false; game.inventoryUI.open = false;
    game.weather ??= createWeather();
    const w = game.world;

    // ---- deterministic points of interest in the generated world ----
    const density = x => { let n = 0; for (let k = -12; k <= 12; k++) { const c = Math.min(w.w - 1, Math.max(0, x + k)); for (let y = w.surface[c] - 12; y < w.surface[c]; y++) { const t = w.tiles[y * w.w + c]; if (t === TILE.TRUNK || t === TILE.LEAVES) n++; } } return n; };
    let forestX = 40, best = -1;
    for (let x = 30; x < w.w - 30; x += 3) { const d = density(x); if (d > best) { best = d; forestX = x; } }
    let caveX = forestX, caveY = 0, caveBest = -1;
    for (let x = 30; x < w.w - 30; x += 4) for (let y = w.surface[x] + 14; y < Math.min(w.h - 6, w.surface[x] + 50); y += 4) {
      let air = 0; for (let j = -8; j <= 8; j += 2) for (let i = -14; i <= 14; i += 2) if (!SOLID[w.getTile(x + i, y + j)]) air++;
      if (air > caveBest) { caveBest = air; caveX = x; caveY = y; }
    }
    let waterX = forestX, waterY = 0, waterBest = 0;
    for (let x = 20; x < w.w - 20; x += 2) { let n = 0, first = 0; for (let y = 4; y < w.h - 4; y++) if (w.water[y * w.w + x]) { n++; if (!first) first = y; } if (n > waterBest) { waterBest = n; waterX = x; waterY = first; } }
    if (waterBest < 40) { // no natural pool in this world: carve a deterministic one
      waterX = Math.min(w.w - 20, forestX + 40);
      const top = w.surface[waterX];
      for (let x = waterX - 9; x <= waterX + 9; x++) for (let y = top - 1; y <= top + 5; y++) { w.tiles[y * w.w + x] = TILE.AIR; w.water[y * w.w + x] = WATER_MAX; }
      for (let x = waterX - 10; x <= waterX + 10; x++) { w.tiles[(top + 6) * w.w + x] = TILE.STONE; w.computeSkyTop(x); }
      waterY = top; waterBest = 19 * 7;
    }
    // Local lights in the cave chamber, so torch glow and block light are exercised.
    let torches = 0;
    for (let i = -14; i <= 14; i += 3) {
      const x = caveX + i;
      for (let y = caveY - 5; y <= caveY + 5; y++)
        if (w.getTile(x, y) === TILE.AIR && SOLID[w.getTile(x, y + 1)]) { w.setTile(x, y, TILE.TORCH); torches++; break; }
    }
    const spots = { forestX, caveX, caveY, waterX, waterY, trunks: best, caveAir: caveBest, waterCells: waterBest, torches };

    // ---- instrumentation ----
    const PHASES = ['prepareShaderFrame', 'shaderCanopyShade', 'shaderSunField', 'drawGpuPostProcess', 'drawWeather', 'drawWater', 'collectEnvironment'];
    const timings = {}, originals = {};
    for (const name of PHASES) {
      const fn = window[name]; if (typeof fn !== 'function') continue;
      originals[name] = fn;
      window[name] = function (...a) { const s = performance.now(); const r = fn.apply(this, a); (timings[name] ??= []).push(performance.now() - s); return r; };
    }
    const drawWorldOriginal = Renderer.prototype.drawWorld;
    Renderer.prototype.drawWorld = function (...a) { const s = performance.now(); const r = drawWorldOriginal.apply(this, a); (timings.drawWorld ??= []).push(performance.now() - s); return r; };
    const bgProto = Background.prototype.draw;
    Background.prototype.draw = function (...a) { const s = performance.now(); const r = bgProto.apply(this, a); (timings.background ??= []).push(performance.now() - s); return r; };
    const lightOriginal = World.prototype.computeLight;
    World.prototype.computeLight = function (...a) { const s = performance.now(); const r = lightOriginal.apply(this, a); (timings.computeLight ??= []).push(performance.now() - s); return r; };

    // ---- GPU timing (real device time for the post-processing passes) ----
    let gpu = null;
    const gpuSetup = () => {
      const gl = renderer.gpuPostProcess?.gl; if (!gl || gpu) return;
      const ext = gl.getExtension('EXT_disjoint_timer_query'); if (!ext) return;
      gpu = { gl, ext, pending: [], samples: [], active: false };
      const drawOriginal = WorldPostProcess.prototype.draw;
      WorldPostProcess.prototype.draw = function (...a) {
        if (!gpu.active) return drawOriginal.apply(this, a);
        const q = ext.createQueryEXT(); ext.beginQueryEXT(ext.TIME_ELAPSED_EXT, q);
        const r = drawOriginal.apply(this, a); ext.endQueryEXT(ext.TIME_ELAPSED_EXT); gpu.pending.push(q); return r;
      };
    };
    const gpuCollect = async () => {
      if (!gpu) return null;
      for (let tries = 0; tries < 200 && gpu.pending.length; tries++) {
        await new Promise(r => setTimeout(r, 5));
        gpu.pending = gpu.pending.filter(q => {
          if (!gpu.ext.getQueryObjectEXT(q, gpu.ext.QUERY_RESULT_AVAILABLE_EXT)) return true;
          if (!gpu.gl.getParameter(gpu.ext.GPU_DISJOINT_EXT)) gpu.samples.push(gpu.ext.getQueryObjectEXT(q, gpu.ext.QUERY_RESULT_EXT) / 1e6);
          return false;
        });
      }
      const s = gpu.samples; gpu.samples = []; return s;
    };

    const stats = a => {
      if (!a.length) return null;
      const s = a.slice().sort((x, y) => x - y), sum = a.reduce((p, v) => p + v, 0);
      const at = q => s[Math.min(s.length - 1, Math.floor(s.length * q))];
      return { mean: +(sum / a.length).toFixed(3), p50: +at(.5).toFixed(3), p95: +at(.95).toFixed(3), p99: +at(.99).toFixed(3), max: +s[s.length - 1].toFixed(3), n: a.length };
    };

    // ---- scenarios ----
    const place = (tx, ty, zoom = 2) => {
      game.zoom = zoom;
      game.cam.x = tx * T - canvas.width / zoom / 2; game.cam.y = ty * T - canvas.height / zoom / 2;
      game.player.x = tx * T; game.player.y = ty * T - game.player.h;
      game.player.vx = game.player.vy = 0; game.player.stepOffset = 0;
      w.computeLight(tx, ty); w.lightDirty = false; w.composeLight(game.daylight);
    };
    const scenes = {
      surfaceStill: { set: () => { game.time = .3; game.daylight = 1; game.weather.rain = 0; place(forestX, w.surface[forestX] - 6); } },
      surfaceMove: { set: () => { game.time = .3; game.daylight = 1; game.weather.rain = 0; place(forestX, w.surface[forestX] - 6); }, step: () => { game.cam.x += 3.2; game.player.x += 3.2; } },
      caveTorches: { set: () => { game.time = .3; game.daylight = 1; game.weather.rain = 0; place(caveX, caveY); } },
      caveMove: { set: () => { game.time = .3; game.daylight = 1; game.weather.rain = 0; place(caveX, caveY); }, step: () => { game.cam.x += 3.2; } },
      water: { set: () => { game.time = .3; game.daylight = 1; game.weather.rain = 0; place(waterX, Math.max(6, waterY + 2)); } },
      rain: { set: () => { game.time = .3; game.daylight = 1; place(forestX, w.surface[forestX] - 6); game.weather.rain = 1; game.weather.triggered = true; }, step: () => { updateWeather(game, 1 / 60); } },
      night: { set: () => { game.time = .8; game.daylight = 0; game.weather.rain = 0; place(forestX, w.surface[forestX] - 6); } },
      mining: {
        set: () => { game.time = .3; game.daylight = 1; game.weather.rain = 0; place(forestX, w.surface[forestX] - 6); },
        step: i => {
          const x = forestX + (i % 9) - 4, y = w.surface[x] + 2 + (i % 3);
          w.setTile(x, y, i % 2 ? TILE.AIR : TILE.DIRT);
          if (w.lightDirty) { w.computeLight(game.cam.x / T + 26, game.cam.y / T + 14); w.lightDirty = false; w.composeLight(game.daylight); }
        },
      },
    };

    const runs = {};
    for (const shaders of [true, false]) {
      for (const [name, scene] of Object.entries(scenes)) {
        const key = name + (shaders ? '' : 'ShadersOff');
        const render = [], phaseAcc = {};
        for (let rep = 0; rep < REPEATS; rep++) {
          GAME_OPTIONS.shaders = shaders;
          scene.set();
          for (let i = 0; i < WARMUP; i++) { scene.step?.(i); renderer.render(game); }
          gpuSetup(); if (gpu) gpu.active = shaders;
          for (const k in timings) delete timings[k];
          scene.set();
          for (let i = 0; i < FRAMES; i++) {
            scene.step?.(i);
            const s = performance.now(); renderer.render(game); render.push(performance.now() - s);
          }
          if (gpu) gpu.active = false;
          for (const [k, v] of Object.entries(timings)) (phaseAcc[k] ??= []).push(...v);
        }
        const gpuSamples = shaders ? await gpuCollect() : null;
        runs[key] = {
          render: stats(render), gpuMs: gpuSamples && gpuSamples.length ? stats(gpuSamples) : null,
          phases: Object.fromEntries(Object.entries(phaseAcc).map(([k, v]) => [k, { ...stats(v), callsPerFrame: +(v.length / (FRAMES * REPEATS)).toFixed(2) }])),
        };
      }
    }

    // ---- simulation cost (fixed timestep), independent of drawing ----
    GAME_OPTIONS.shaders = true; scenes.surfaceStill.set(); game.paused = false;
    const sim = [];
    for (let i = 0; i < WARMUP; i++) update(STEP);
    for (let i = 0; i < FRAMES * REPEATS; i++) { const s = performance.now(); update(STEP); sim.push(performance.now() - s); }
    game.paused = true;

    Renderer.prototype.drawWorld = drawWorldOriginal; Background.prototype.draw = bgProto; World.prototype.computeLight = lightOriginal;
    for (const [n, f] of Object.entries(originals)) window[n] = f;
    const gl = renderer.gpuPostProcess?.gl, info = gl?.getExtension('WEBGL_debug_renderer_info');
    return {
      spots, runs, update: stats(sim), gpuPostProcess: !!gl,
      adapter: info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : null,
      canvas: [canvas.width, canvas.height], zoom: game.zoom, seed: w.seed,
    };
  }, { REPEATS, FRAMES, WARMUP });
  result.errors = errors;
  await context.close();
  return result;
};

// Real loop: the application's own scheduler drives update+render; we record the
// interval between rendered frames. Headless has no vsync, so this is throughput.
const live = async (browser, url = 'http://localhost/jogo-teste/') => {
  const context = await browser.newContext({ viewport: VIEW });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && m.text().startsWith('[quadro]')) errors.push(m.text()); });
  await page.addInitScript(() => { let seed = 20260922; Math.random = () => ((seed = Math.imul(seed, 1664525) + 1013904223 | 0) >>> 0) / 4294967296; });
  await page.goto(url);
  await page.waitForFunction(() => typeof game === 'object');
  await page.evaluate(() => { finishOpening(game); Menu.root.hidden = true; game.paused = false; game.intro.active = false; GAME_OPTIONS.shaders = true; GAME_OPTIONS.showFps = false; });
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    window.perfLive = { t: [], render: [], update: [], last: 0 };
    const render = renderer.render, step = update;
    renderer.render = function (...a) {
      const now = performance.now();
      if (perfLive.last) perfLive.t.push(now - perfLive.last);
      perfLive.last = now;
      const out = render.apply(this, a); perfLive.render.push(performance.now() - now); return out;
    };
    update = function (...a) { const s = performance.now(); const out = step(...a); perfLive.update.push(performance.now() - s); return out; };
  });
  const out = {};
  for (const [name, keys] of [['still', []], ['walking', ['KeyD']]]) {
    await page.evaluate(() => { perfLive.t = []; perfLive.render = []; perfLive.update = []; perfLive.last = 0; });
    for (const k of keys) await page.keyboard.down(k);
    await page.waitForTimeout(4000);
    for (const k of keys) await page.keyboard.up(k);
    out[name] = await page.evaluate(() => {
      const s = a => { if (!a.length) return null; const o = a.slice().sort((x, y) => x - y), sum = a.reduce((p, v) => p + v, 0); const at = q => o[Math.min(o.length - 1, Math.floor(o.length * q))]; return { mean: +(sum / a.length).toFixed(3), p50: +at(.5).toFixed(3), p95: +at(.95).toFixed(3), p99: +at(.99).toFixed(3), max: +o[o.length - 1].toFixed(3), n: a.length }; };
      const t = perfLive.t;
      return {
        frames: t.length, fps: +(1000 / (t.reduce((p, v) => p + v, 0) / t.length)).toFixed(2), interval: s(t),
        stutters16: t.filter(v => v > 16.7).length, stutters33: t.filter(v => v > 33.3).length,
        renderMs: s(perfLive.render), updateMs: s(perfLive.update),
      };
    });
    await page.waitForTimeout(400);
  }
  out.errors = errors;
  out.finite = await page.evaluate(() => Number.isFinite(game.player.x) && Number.isFinite(game.cam.x));
  await context.close();
  return out;
};

// A/B: the same harness against two builds, alternating passes inside one browser
// session, so machine load and thermal drift hit both sides equally.
const ab = async browser => {
  const urls = { base: arg('urlA', 'http://localhost/jogo-teste-base/'), opt: arg('urlB', 'http://localhost/jogo-teste/') };
  const passes = Number(arg('passes', 3));
  const out = { urls, passes, isolated: { base: [], opt: [] }, live: { base: [], opt: [] } };
  for (let i = 0; i < passes; i++)
    for (const side of i % 2 ? ['opt', 'base'] : ['base', 'opt']) { // alterna a ordem também
      if (!process.argv.includes('--live-only')) out.isolated[side].push(await isolated(browser, urls[side]));
      if (!process.argv.includes('--iso-only')) out.live[side].push(await live(browser, urls[side]));
    }
  const median = a => { const s = a.slice().sort((x, y) => x - y); return +s[s.length >> 1].toFixed(3); };
  const pick = (runs, path) => runs.map(r => path.split('.').reduce((o, k) => o?.[k], r)).filter(v => typeof v === 'number');
  const table = {};
  const names = Object.keys(out.isolated.base[0]?.runs || {});
  for (const name of names) {
    const row = {};
    for (const side of ['base', 'opt']) for (const metric of ['render.mean', 'render.p95', 'render.p99', 'gpuMs.mean']) {
      const values = pick(out.isolated[side].map(r => r.runs[name]), metric);
      if (values.length) row[side + '.' + metric] = median(values);
    }
    row.gainPct = row['base.render.mean'] ? +(100 * (1 - row['opt.render.mean'] / row['base.render.mean'])).toFixed(1) : null;
    table[name] = row;
  }
  for (const scene of ['still', 'walking']) {
    const row = {};
    for (const side of ['base', 'opt']) for (const metric of ['fps', 'interval.p95', 'interval.p99', 'renderMs.mean', 'stutters16']) {
      const values = pick(out.live[side].map(r => r[scene]), metric);
      if (values.length) row[side + '.' + metric] = median(values);
    }
    row.fpsGainPct = row['base.fps'] ? +(100 * (row['opt.fps'] / row['base.fps'] - 1)).toFixed(1) : null;
    table['live-' + scene] = row;
  }
  out.table = table;
  return out;
};

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: !process.argv.includes('--headed') });
  try {
    const report = { label, when: new Date().toISOString(), viewport: VIEW, repeats: REPEATS, frames: FRAMES };
    if (process.argv.includes('--ab')) {
      report.ab = await ab(browser);
      fs.writeFileSync(`tests/perf-${label}.json`, JSON.stringify(report, null, 2));
      console.table(report.ab.table);
      return;
    }
    if (!process.argv.includes('--live-only')) report.isolated = await isolated(browser);
    if (!process.argv.includes('--iso-only')) report.live = await live(browser);
    fs.writeFileSync(`tests/perf-${label}.json`, JSON.stringify(report, null, 2));
    const r = report.isolated?.runs || {};
    for (const [k, v] of Object.entries(r))
      console.log(k.padEnd(22), 'cpu', String(v.render.mean).padStart(7), 'p95', String(v.render.p95).padStart(7), 'p99', String(v.render.p99).padStart(7), 'gpu', String(v.gpuMs?.mean ?? '-').padStart(7));
    if (report.isolated) console.log('update(STEP)', JSON.stringify(report.isolated.update), '\nadapter', report.isolated.adapter, '\nspots', JSON.stringify(report.isolated.spots), '\nerrors', JSON.stringify(report.isolated.errors));
    if (report.live) console.log('live', JSON.stringify({ still: report.live.still, walking: report.live.walking, errors: report.live.errors }, null, 1));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
