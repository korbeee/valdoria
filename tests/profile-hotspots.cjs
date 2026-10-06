// Perfil de CPU (amostragem do V8) do quadro do jogo: onde o tempo realmente vai.
// Cenas fixas (superfície andando, caverna com tochas, água, chuva, noite) + a simulação.
//   node tests/profile-hotspots.cjs [--url=...] [--frames=240] [--top=45]
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const arg = (name, fallback) => { const hit = process.argv.find(a => a.startsWith(`--${name}=`)); return hit ? hit.slice(name.length + 3) : fallback; };
const url = arg('url', 'http://localhost/jogo-teste/');
const FRAMES = Number(arg('frames', 240)), TOP = Number(arg('top', 45));

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
    const page = await context.newPage();
    await page.addInitScript(() => {
      window.requestAnimationFrame = () => 1;
      let seed = 20260922;
      Math.random = () => ((seed = Math.imul(seed, 1664525) + 1013904223 | 0) >>> 0) / 4294967296;
    });
    await page.goto(url);
    await page.waitForFunction(() => typeof game === 'object' && typeof newWorld === 'function');
    await page.evaluate(async () => {
      await newWorld('pequeno', () => {}, 4242);
      finishOpening(game); Menu.root.hidden = true; game.intro.active = false; GAME_OPTIONS.showFps = false;
    });
    const cdp = await context.newCDPSession(page);
    await cdp.send('Profiler.enable');
    await cdp.send('Profiler.setSamplingInterval', { interval: 100 });
    await cdp.send('Profiler.start');
    const ms = await page.evaluate(FRAMES => {
      const w = game.world, p = game.player;
      const scenes = [];
      const sx = Math.floor(p.cx / T);
      let caveX = sx, caveY = w.surface[sx] + 20, best = -1;
      for (let x = 40; x < w.w - 40; x += 37) for (let y = w.surface[x] + 14; y < Math.min(w.h - 6, w.surface[x] + 60); y += 5) {
        let air = 0; for (let j = -4; j <= 4; j += 2) for (let i = -8; i <= 8; i += 2) if (!SOLID[w.getTile(x + i, y + j)]) air++;
        if (SOLID[w.getTile(x, y + 1)] && !SOLID[w.getTile(x, y)] && air > best) { best = air; caveX = x; caveY = y + 1; }
      }
      for (let i = -12; i <= 12; i += 3) for (let y = caveY - 5; y <= caveY + 5; y++) if (w.getTile(caveX + i, y) === TILE.AIR && SOLID[w.getTile(caveX + i, y + 1)]) { w.setTile(caveX + i, y, TILE.TORCH); break; }
      const teleport = (tx, ty) => { p.x = tx * T; p.y = ty * T - p.h - .01; p.vx = p.vy = 0; updateCamera(0, true); };
      const run = (name, n, each) => { const s = performance.now(); for (let i = 0; i < n; i++) { each?.(i); update(STEP); renderer.render(game); } scenes.push([name, (performance.now() - s) / n]); };
      game.time = .3; teleport(sx, w.surface[sx]);
      input.keys.add('KeyD'); run('surface-walk', FRAMES); input.keys.delete('KeyD');
      teleport(caveX, caveY); run('cave', FRAMES);
      game.weather.rain = 1; game.weather.triggered = true; teleport(sx, w.surface[sx]); run('rain', FRAMES);
      game.weather.rain = 0; game.time = .85; run('night', FRAMES);
      game.time = .3;
      for (let k = 0; k < 4; k++) game.mobs.push(new Monster(['slime', 'undead', 'bat', 'slime'][k], p.x + 60 + k * 20, p.y - 20));
      run('mobs', FRAMES);
      return scenes;
    }, FRAMES);
    const { profile } = await cdp.send('Profiler.stop');
    // tempo próprio por função
    const self = new Map(), byId = new Map(profile.nodes.map(n => [n.id, n]));
    const dt = new Map();
    for (let i = 0; i < profile.samples.length; i++) dt.set(profile.samples[i], (dt.get(profile.samples[i]) || 0) + (profile.timeDeltas[i] || 0));
    let total = 0;
    for (const [id, us] of dt) {
      const n = byId.get(id), f = n.callFrame;
      const key = `${f.functionName || '(anon)'} ${f.url.split('/').pop()}:${f.lineNumber + 1}`;
      self.set(key, (self.get(key) || 0) + us); total += us;
    }
    console.log('ms/quadro (update+render):', JSON.stringify(ms.map(([n, v]) => [n, +v.toFixed(2)])));
    const rows = [...self].sort((a, b) => b[1] - a[1]).slice(0, TOP);
    for (const [k, us] of rows) console.log((us / 1000).toFixed(1).padStart(8), 'ms', (100 * us / total).toFixed(1).padStart(5), '%', k);
    const want = (process.argv.find(a => a.startsWith("--callers=")) || "").slice(10).split(",").filter(Boolean);
    const parent = new Map(); for (const n of profile.nodes) for (const c of n.children || []) parent.set(c, n);
    for (const name of want) {
      const acc = new Map();
      for (const [id, us] of dt) { let n = byId.get(id); if (n.callFrame.functionName !== name) continue; const chain = []; for (let q = parent.get(n.id), d = 0; q && d < 3; q = parent.get(q.id), d++) chain.push(`${q.callFrame.functionName || "(anon)"}:${q.callFrame.url.split("/").pop()}:${q.callFrame.lineNumber + 1}`); const k = chain.join(" < "); acc.set(k, (acc.get(k) || 0) + us); }
      console.log("\n== callers of", name); for (const [k, us] of [...acc].sort((a, b) => b[1] - a[1]).slice(0, 12)) console.log((us / 1000).toFixed(1).padStart(8), "ms", k);
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
