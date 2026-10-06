// Equivalência de comportamento entre duas cópias do jogo (antes/depois de uma refatoração).
// Roda o MESMO roteiro nas duas: mundo de semente fixa, Math.random com semente, relógio virtual
// (performance.now/Date.now só andam quando o roteiro manda) e entradas simuladas. Em cada ponto
// de controle guarda um resumo do estado (jogador, inventário, bichos, partículas, tiles, luz) e o
// hash dos pixels do quadro desenhado. Qualquer diferença aparece com o nome do ponto.
//   node tests/equivalence.cjs                       (antes = jogo-teste-pre-refactor, depois = jogo-teste)
//   node tests/equivalence.cjs --urlA=... --urlB=... (outras cópias)
//   node tests/equivalence.cjs --self                (mesma cópia duas vezes: prova que o roteiro é determinístico)
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs = require('node:fs');
const arg = (name, fallback) => { const hit = process.argv.find(a => a.startsWith(`--${name}=`)); return hit ? hit.slice(name.length + 3) : fallback; };
const urlB = arg('urlB', 'http://localhost/jogo-teste/');
const urlA = process.argv.includes('--self') ? urlB : arg('urlA', 'http://localhost/jogo-teste-pre-refactor/');

async function run(browser, url) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(() => {
    window.requestAnimationFrame = () => 1;
    let seed = 918273;
    Math.random = () => ((seed = Math.imul(seed, 1664525) + 1013904223 | 0) >>> 0) / 4294967296;
    window.__clock = 5000;
    performance.now = () => window.__clock;
    Date.now = () => 1.75e12 + Math.floor(window.__clock);
  });
  await page.goto(url);
  await page.waitForFunction(() => typeof game === 'object' && typeof Menu === 'object' && typeof newWorld === 'function');
  const out = await page.evaluate(async DUMP => {
    const checkpoints = [];
    GAME_OPTIONS.showFps = false; GAME_OPTIONS.fpsMode = 'vsync';
    await newWorld('pequeno', () => {}, 4242);
    finishOpening(game); Menu.root.hidden = true; game.paused = false; game.intro.active = false;
    game.inventoryUI.open = false; game.mapUI.open = false;
    const p = game.player, w = game.world;

    // ---- resumo do estado ----
    const fnv = (h, v) => Math.imul(h ^ v, 16777619) >>> 0;
    const hashArray = (a, from = 0, to = a.length) => { let h = 2166136261; for (let i = from; i < to; i++) h = fnv(h, a[i] | 0); return h; };
    const hashFloats = list => { const f = new Float64Array(list), u = new Uint32Array(f.buffer); return hashArray(u); };
    const pixels = () => { const d = renderer.ctx.getImageData(0, 0, canvas.width, canvas.height).data; return hashArray(new Uint32Array(d.buffer)); };
    const region = () => {
      const cx = Math.floor(p.cx / T), cy = Math.floor(p.cy / T);
      let h = 2166136261;
      for (let y = Math.max(0, cy - 40); y < Math.min(w.h, cy + 40); y++)
        for (let x = Math.max(0, cx - 60); x < Math.min(w.w, cx + 60); x++) {
          const i = y * w.w + x; h = fnv(h, w.tiles[i]); h = fnv(h, w.walls[i]); h = fnv(h, w.water[i] | 0);
        }
      return h;
    };
    const state = () => ({
      player: [p.x, p.y, p.vx, p.vy, p.hp, p.facing, p.onGround ? 1 : 0, p.stepOffset || 0, p.air ?? 0].map(v => +v),
      time: game.time, daylight: game.daylight, day: game.day, selected: game.selected,
      inv: game.inventory.slots.map(s => s ? s.item + 'x' + s.count : '-').join(','),
      mobs: game.mobs.map(m => `${m.kind || 'pig'}:${m.x.toFixed(4)},${m.y.toFixed(4)},${m.hp}`).join('|'),
      mobHash: hashFloats(game.mobs.flatMap(m => [m.x, m.y, m.vx || 0, m.vy || 0, m.hp || 0])),
      particles: game.particles.length, particleHash: hashFloats(game.particles.flatMap(q => [q.x, q.y, q.life])),
      drops: (game.drops || []).length, region: region(),
      light: w.light ? hashArray(w.light) : 0, lightCanvas: w.lightCanvas ? hashArray(new Uint32Array(w.lightCanvas.getContext('2d').getImageData(0, 0, w.lightCanvas.width, w.lightCanvas.height).data.buffer)) : 0,
      cam: [game.cam.x, game.cam.y], mining: game.mining.progress, toast: game.toast.text,
      rain: game.weather?.rain ?? 0,
    });
    const STEP_MS = 1000 / 60;
    const step = (n, each) => { for (let i = 0; i < n; i++) { window.__clock += STEP_MS; each?.(i); update(STEP); } };
    const shot = name => { window.__clock += STEP_MS; renderer.render(game); checkpoints.push({ name, pixels: pixels(), state: state(), image: (DUMP === "*" || name === DUMP) ? canvas.toDataURL() : undefined }); };
    const key = (code, on) => { if (on) { input.keys.add(code); input.onKeyDown?.({ code, shiftKey: false, ctrlKey: false, metaKey: false, preventDefault() {} }, false); } else input.keys.delete(code); };
    const aimTile = (tx, ty) => { input.mouse.x = Math.round(((tx + .5) * T - game.cam.x) * game.zoom); input.mouse.y = Math.round(((ty + .5) * T - game.cam.y) * game.zoom); };
    const give = (item, n) => game.inventory.add(item, n);
    const select = item => { const i = game.inventory.slots.findIndex(s => s && s.item === item); if (i >= 0) game.selected = i; return i; };
    const teleport = (tx, ty) => { p.x = tx * T; p.y = ty * T - p.h - .01; p.vx = p.vy = 0; updateCamera(0, true); w.computeLight(game.cam.x / T + canvas.width / game.zoom / T / 2, game.cam.y / T + canvas.height / game.zoom / T / 2); };

    shot('start');
    step(60); shot('idle');
    key('KeyD', true); step(120); key('KeyD', false); step(20); shot('walk-right');
    key('Space', true); step(8); key('Space', false); step(50); shot('jump');
    key('KeyA', true); step(45); key('KeyA', false); step(10); shot('walk-left');

    // ---- ferramentas: minerar, colocar, tocha ----
    for (const [item, n] of [[ITEM.METAL_PICKAXE, 1], [ITEM.METAL_SWORD, 1], [ITEM.METAL_AXE, 1], [ITEM.METAL_SHOVEL, 1], [ITEM.TORCH, 20], [ITEM.DIRT, 40], [ITEM.STONE, 40]]) give(item, n);
    const fx = Math.floor(p.cx / T), fy = Math.floor((p.y + p.h + 1) / T);
    select(ITEM.METAL_SHOVEL); aimTile(fx + 1, fy); input.mouse.left = true; step(70); input.mouse.left = false; step(5); shot('dig-1');
    aimTile(fx + 1, fy + 1); input.mouse.left = true; step(70); input.mouse.left = false; step(5); shot('dig-2');
    select(ITEM.METAL_PICKAXE); aimTile(fx - 1, fy); input.mouse.left = true; step(90); input.mouse.left = false; step(5); shot('mine');
    select(ITEM.DIRT); for (let k = 0; k < 3; k++) { aimTile(fx + 2 + k, fy - 1); input.mouse.right = true; step(18); input.mouse.right = false; step(4); } shot('place');
    select(ITEM.TORCH); aimTile(fx - 2, fy - 1); input.mouse.right = true; step(18); input.mouse.right = false; step(30); shot('torch');
    // Árvore mais próxima: machado no tronco (queda da árvore, folhas, drops)
    let treeX = -1;
    for (let d = 0; d < 80 && treeX < 0; d++) for (const s of [1, -1]) { const x = fx + d * s; if (w.getTile(x, w.surface[x] - 1) === TILE.TRUNK) { treeX = x; break; } }
    if (treeX >= 0) {
      teleport(treeX - 2, w.surface[treeX]); step(20);
      select(ITEM.METAL_AXE); aimTile(treeX, w.surface[treeX] - 1); input.mouse.left = true; step(150); input.mouse.left = false; step(60); shot('tree-fall');
      step(120); shot('tree-after');
    }

    // ---- combate ----
    const sx = p.x;
    const spawn = (kind, dx) => { const m = new Monster(kind, sx + dx, p.y - 30); game.mobs.push(m); return m; };
    spawn('slime', 70); spawn('undead', -80); spawn('bat', 40);
    step(30); shot('mobs-spawned');
    select(ITEM.METAL_SWORD);
    for (let k = 0; k < 10; k++) {
      const target = game.mobs.filter(m => m.hostile && !m.dead).sort((a, b) => Math.abs(a.cx - p.cx) - Math.abs(b.cx - p.cx))[0];
      if (target) { input.mouse.x = Math.round((target.cx - game.cam.x) * game.zoom); input.mouse.y = Math.round((target.cy - game.cam.y) * game.zoom); }
      input.mouse.left = true; step(12); input.mouse.left = false; step(12);
    }
    shot('combat');
    step(120); shot('after-combat');

    // ---- noite, chuva, caverna, água ----
    game.time = 0.74; step(90); shot('dusk');
    game.time = 0.85; step(240); shot('night');
    game.time = 0.3; game.weather.rain = 1; game.weather.triggered = true; step(180); shot('rain');
    game.weather.rain = 0; game.weather.triggered = false; step(60);
    let caveX = fx, caveY = w.surface[fx] + 20, best = -1;
    for (let x = 40; x < w.w - 40; x += 37) for (let y = w.surface[x] + 14; y < Math.min(w.h - 6, w.surface[x] + 60); y += 5) {
      let air = 0; for (let j = -4; j <= 4; j += 2) for (let i = -8; i <= 8; i += 2) if (!SOLID[w.getTile(x + i, y + j)]) air++;
      if (SOLID[w.getTile(x, y + 1)] && !SOLID[w.getTile(x, y)] && air > best) { best = air; caveX = x; caveY = y + 1; }
    }
    teleport(caveX, caveY); step(120); shot('cave');
    let waterX = -1, waterY = 0;
    for (let x = 30; x < w.w - 30 && waterX < 0; x += 3) for (let y = 4; y < w.surface[x] + 4; y++) if (w.water[y * w.w + x] >= WATER_MAX && w.water[(y + 3) * w.w + x] >= WATER_MAX) { waterX = x; waterY = y; break; }
    if (waterX >= 0) { teleport(waterX, waterY + 3); step(150); shot('water'); key('Space', true); step(40); key('Space', false); step(40); shot('swim'); }

    // ---- sem shaders: a luz sai do lightCanvas (composeLight) ----
    GAME_OPTIONS.shaders = false;
    teleport(caveX, caveY); step(30); shot('noshader-cave');
    game.time = 0.78; step(60); shot('noshader-dusk');
    game.time = 0.3; step(30); shot('noshader-day');
    GAME_OPTIONS.shaders = true; step(5); shot('shader-back');

    // ---- chefes no centro e logo além das bordas da tela (corte de desenho fora da vista) ----
    const savedCam = { ...game.cam };
    const vwPx = canvas.width / game.zoom, vhPx = canvas.height / game.zoom;
    for (const m of game.mobs.filter(o => o.boss)) {
      for (const [dx, dy] of [[0, 0], [vwPx / 2 + 60, 0], [vwPx / 2 + 140, 0], [-(vwPx / 2 + 100), 0], [0, vhPx / 2 + 90], [0, -(vhPx / 2 + 70)]]) {
        game.cam.x = m.cx + dx - vwPx / 2; game.cam.y = m.cy + dy - vhPx / 2;
        window.__clock += STEP_MS; renderer.render(game);
        { const name = `boss-${m.kind}-${Math.round(dx)},${Math.round(dy)}`; checkpoints.push({ name, pixels: pixels(), state: { mob: [m.x, m.y, m.state] }, image: (DUMP === "*" || name === DUMP) ? canvas.toDataURL() : undefined }); }
      }
    }
    Object.assign(game.cam, savedCam);

    // ---- interface ----
    key('KeyE', true); step(2); key('KeyE', false); shot('inventory');
    key('KeyE', true); step(2); key('KeyE', false); key('KeyM', true); step(2); key('KeyM', false); shot('map');
    key('KeyM', true); step(2); key('KeyM', false); step(10); shot('end');
    return { checkpoints, seed: w.seed, size: [w.w, w.h] };
  }, process.argv.includes("--pixeldiff") ? "*" : arg("dump", ""));
  out.errors = errors;
  await context.close();
  return out;
}

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const t0 = Date.now();
    const a = await run(browser, urlA);
    const b = await run(browser, urlB);
    const diffs = [];
    for (let i = 0; i < Math.max(a.checkpoints.length, b.checkpoints.length); i++) {
      const ca = a.checkpoints[i], cb = b.checkpoints[i];
      if (!ca || !cb || ca.name !== cb.name) { diffs.push({ at: i, problem: 'checkpoint list differs', a: ca?.name, b: cb?.name }); break; }
      if (ca.pixels !== cb.pixels) diffs.push({ at: ca.name, field: "pixels", ...(ca.image && cb.image ? await pixelDiff(browser, ca.image, cb.image) : {}) });
      for (const k of Object.keys(ca.state)) {
        const va = JSON.stringify(ca.state[k]), vb = JSON.stringify(cb.state[k]);
        if (va !== vb) diffs.push({ at: ca.name, field: k, a: va.slice(0, 200), b: vb.slice(0, 200) });
      }
    }
    const report = { urlA, urlB, ms: Date.now() - t0, checkpoints: a.checkpoints.map(c => c.name), errorsA: a.errors, errorsB: b.errors, diffs };
    if (process.argv.includes("--pixeldiff")) for (const r of [a, b]) for (const c of r.checkpoints) delete c.image;
    for (const [side, r] of [["A", a], ["B", b]]) for (const c of r.checkpoints) if (c.image) { fs.writeFileSync(`tests/equivalence-${side}-${c.name}.png`, Buffer.from(c.image.split(",")[1], "base64")); delete c.image; }
    fs.writeFileSync('tests/equivalence-report.json', JSON.stringify({ ...report, a, b }, null, 1));
    console.log(JSON.stringify(report, null, 1));
    if (diffs.length || b.errors.length) process.exitCode = 1;
    else console.log(`equivalência ok: ${a.checkpoints.length} pontos de controle idênticos`);
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });

// Quantos pixels mudaram e quanto (maior diferença num canal, 0..255), para separar
// arredondamento invisível de mudança de verdade.
async function pixelDiff(browser, urlA, urlB) {
  const page = await browser.newPage();
  try {
    return await page.evaluate(async ([a, b]) => {
      const load = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = src; });
      const [ia, ib] = await Promise.all([load(a), load(b)]);
      const data = img => { const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0); return x.getImageData(0, 0, c.width, c.height).data; };
      const da = data(ia), db = data(ib);
      let changed = 0, maxDiff = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      for (let i = 0; i < da.length; i += 4) {
        const d = Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2]));
        if (!d) continue;
        changed++; if (d > maxDiff) maxDiff = d;
        const p = i / 4, x = p % ia.width, y = (p / ia.width) | 0;
        x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      }
      return { changedPixels: changed, maxChannelDiff: maxDiff, box: changed ? [x0, y0, x1, y1] : null };
    }, [urlA, urlB]);
  } finally { await page.close(); }
}
