// Desempenho de jogo de verdade, A/B: mundo "pequeno" gerado com semente fixa (com os quatro
// chefes nos covis, como numa partida), medindo update(STEP) e renderer.render separadamente.
// As duas cópias se alternam no mesmo navegador (a carga da máquina pesa igual nos dois lados).
// Além do tempo (ruidoso nesta máquina), conta chamadas de Canvas 2D por quadro, que é
// determinístico e é o que manda no custo do quadro (ver tests/perf-bench.cjs).
//   node tests/perf-gameplay.cjs [--passes=3] [--frames=240] [--urlA=...] [--urlB=...] [--label=x]
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs = require('node:fs');
const arg = (name, fallback) => { const hit = process.argv.find(a => a.startsWith(`--${name}=`)); return hit ? hit.slice(name.length + 3) : fallback; };
const urls = { base: arg('urlA', 'http://localhost/jogo-teste-pre-refactor/'), opt: arg('urlB', 'http://localhost/jogo-teste/') };
const PASSES = Number(arg('passes', 3)), FRAMES = Number(arg('frames', 240));

async function measure(browser, url) {
  const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => {
    window.requestAnimationFrame = () => 1;
    let seed = 20260922;
    Math.random = () => ((seed = Math.imul(seed, 1664525) + 1013904223 | 0) >>> 0) / 4294967296;
  });
  await page.goto(url);
  await page.waitForFunction(() => typeof game === 'object' && typeof newWorld === 'function');
  const out = await page.evaluate(async FRAMES => {
    await newWorld('pequeno', () => {}, 4242);
    finishOpening(game); Menu.root.hidden = true; game.intro.active = false; GAME_OPTIONS.showFps = false;
    const w = game.world, p = game.player, sx = Math.floor(p.cx / T);
    // chamadas de Canvas 2D (todas as telas: principal e auxiliares)
    const calls = { n: 0 };
    const proto = CanvasRenderingContext2D.prototype;
    for (const name of ['drawImage', 'fillRect', 'putImageData', 'getImageData', 'fillText', 'fill', 'stroke', 'strokeRect', 'clearRect']) {
      const f = proto[name]; proto[name] = function (...a) { calls.n++; return f.apply(this, a); };
    }
    let caveX = sx, caveY = w.surface[sx] + 20, best = -1;
    for (let x = 40; x < w.w - 40; x += 37) for (let y = w.surface[x] + 14; y < Math.min(w.h - 6, w.surface[x] + 60); y += 5) {
      let air = 0; for (let j = -4; j <= 4; j += 2) for (let i = -8; i <= 8; i += 2) if (!SOLID[w.getTile(x + i, y + j)]) air++;
      if (SOLID[w.getTile(x, y + 1)] && !SOLID[w.getTile(x, y)] && air > best) { best = air; caveX = x; caveY = y + 1; }
    }
    const teleport = (tx, ty) => { p.x = tx * T; p.y = ty * T - p.h - .01; p.vx = p.vy = 0; updateCamera(0, true); };
    const stats = a => { const s = a.slice().sort((x, y) => x - y), sum = a.reduce((q, v) => q + v, 0); return { mean: +(sum / a.length).toFixed(3), p50: +s[s.length >> 1].toFixed(3), p95: +s[Math.floor(s.length * .95)].toFixed(3), max: +s[s.length - 1].toFixed(3) }; };
    const result = {};
    const scene = (name, setup, each) => {
      setup();
      for (let i = 0; i < 30; i++) { each?.(i); update(STEP); renderer.render(game); } // aquece
      const up = [], re = [], frame = []; let callSum = 0;
      for (let i = 0; i < FRAMES; i++) {
        each?.(i);
        const a = performance.now(); update(STEP); const b = performance.now();
        calls.n = 0; renderer.render(game); const c = performance.now(); callSum += calls.n;
        up.push(b - a); re.push(c - b); frame.push(c - a);
      }
      result[name] = { update: stats(up), render: stats(re), frame: stats(frame), canvasCallsPerFrame: Math.round(callSum / FRAMES) };
    };
    scene('surface-still', () => { game.time = .3; teleport(sx, w.surface[sx]); });
    scene('surface-walk', () => { input.keys.add('KeyD'); }, () => {});
    input.keys.delete('KeyD');
    scene('cave', () => teleport(caveX, caveY));
    scene('night', () => { game.time = .85; teleport(sx, w.surface[sx]); });
    scene('dusk', () => { game.time = .5; }); // 18h: a cor do céu muda a cada quadro
    scene('rain', () => { game.time = .3; game.weather.rain = 1; game.weather.triggered = true; });
    game.weather.rain = 0; game.weather.triggered = false;
    scene('mobs', () => { for (let k = 0; k < 4; k++) game.mobs.push(new Monster(['slime', 'undead', 'bat', 'slime'][k], p.x + 60 + k * 20, p.y - 20)); });
    return result;
  }, FRAMES);
  out.errors = errors;
  await context.close();
  return out;
}

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const runs = { base: [], opt: [] };
    for (let i = 0; i < PASSES; i++) for (const side of i % 2 ? ['opt', 'base'] : ['base', 'opt']) runs[side].push(await measure(browser, urls[side]));
    const median = a => { const s = a.slice().sort((x, y) => x - y); return +s[s.length >> 1].toFixed(3); };
    const table = {};
    for (const name of Object.keys(runs.base[0]).filter(k => k !== 'errors')) {
      const row = {};
      for (const side of ['base', 'opt']) {
        row[side + '.update'] = median(runs[side].map(r => r[name].update.mean));
        row[side + '.render'] = median(runs[side].map(r => r[name].render.mean));
        row[side + '.frameP95'] = median(runs[side].map(r => r[name].frame.p95));
        row[side + '.calls'] = median(runs[side].map(r => r[name].canvasCallsPerFrame));
      }
      const fb = row['base.update'] + row['base.render'], fo = row['opt.update'] + row['opt.render'];
      row.frameGainPct = +(100 * (1 - fo / fb)).toFixed(1);
      table[name] = row;
    }
    const report = { when: new Date().toISOString(), urls, passes: PASSES, frames: FRAMES, table, errors: { base: runs.base.flatMap(r => r.errors), opt: runs.opt.flatMap(r => r.errors) }, runs };
    fs.writeFileSync(`tests/perf-gameplay-${arg('label', 'ab')}.json`, JSON.stringify(report, null, 1));
    console.table(table);
    console.log('erros', JSON.stringify(report.errors));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
