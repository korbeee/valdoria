// Deterministic screenshots of the performance scenarios, for before/after visual
// comparison. Writes tests/shots-<label>/*.png. No player save is touched.
//   node tests/perf-shots.cjs --label=before
//   node tests/perf-shots.cjs --label=after --compare=before
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs = require('node:fs');
const zlib = require('node:zlib');
const arg = (name, fallback) => { const hit = process.argv.find(a => a.startsWith(`--${name}=`)); return hit ? hit.split('=')[1] : fallback; };
const label = arg('label', 'after'), compare = arg('compare', null);
const url = arg('url', 'http://localhost/jogo-teste/');
const dir = `tests/shots-${label}`;
const VIEW = { width: 1280, height: 720 };

// Minimal PNG decode (RGBA, 8-bit) so the comparison needs no dependency.
function decodePng(buffer) {
  let pos = 8, width = 0, height = 0, bitDepth = 0, colorType = 0;
  const idat = [];
  while (pos < buffer.length) {
    const len = buffer.readUInt32BE(pos), type = buffer.toString('ascii', pos + 4, pos + 8);
    const data = buffer.subarray(pos + 8, pos + 8 + len);
    if (type === 'IHDR') { width = data.readUInt32BE(0); height = data.readUInt32BE(4); bitDepth = data[8]; colorType = data[9]; }
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    pos += len + 12;
  }
  if (bitDepth !== 8 || (colorType !== 6 && colorType !== 2)) throw Error(`unsupported png ${bitDepth}/${colorType}`);
  const channels = colorType === 6 ? 4 : 3;
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * channels, out = Buffer.alloc(height * stride);
  let prev = Buffer.alloc(stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)], line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    const cur = out.subarray(y * stride, (y + 1) * stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= channels ? cur[i - channels] : 0, b = prev[i], c = i >= channels ? prev[i - channels] : 0;
      let v = line[i];
      if (filter === 1) v += a; else if (filter === 2) v += b; else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      cur[i] = v & 255;
    }
    prev = cur;
  }
  return { width, height, channels, data: out };
}

const diff = (a, b) => {
  if (a.width !== b.width || a.height !== b.height) return { error: 'size' };
  let count = 0, max = 0, sum = 0;
  const n = Math.min(a.data.length, b.data.length);
  for (let i = 0; i < n; i += a.channels) {
    const d = Math.max(Math.abs(a.data[i] - b.data[i]), Math.abs(a.data[i + 1] - b.data[i + 1]), Math.abs(a.data[i + 2] - b.data[i + 2]));
    if (!d) continue;
    count++; sum += d; max = Math.max(max, d);
  }
  const pixels = a.width * a.height;
  return { changedPixels: count, changedPct: +(count / pixels * 100).toFixed(3), maxDelta: max, meanDeltaOverChanged: count ? +(sum / count).toFixed(2) : 0 };
};

(async () => {
  fs.mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const context = await browser.newContext({ viewport: VIEW });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => {
      window.requestAnimationFrame = () => 1;
      let seed = 20260922;
      Math.random = () => ((seed = Math.imul(seed, 1664525) + 1013904223 | 0) >>> 0) / 4294967296;
    });
    await page.goto(url);
    await page.waitForFunction(() => typeof game === 'object');
    const names = await page.evaluate(() => {
      finishOpening(game); Menu.root.hidden = true; game.paused = true; game.intro.active = false;
      game.weather ??= createWeather();
      GAME_OPTIONS.shake = false; GAME_OPTIONS.showFps = false; game.adminNightVision = false;
      Object.defineProperty(performance, 'now', { value: () => 12345, configurable: true });
      const w = game.world;
      const dens = x => { let n = 0; for (let k = -12; k <= 12; k++) { const c = Math.min(w.w - 1, Math.max(0, x + k)); for (let y = w.surface[c] - 12; y < w.surface[c]; y++) if (w.tiles[y * w.w + c] === TILE.TRUNK) n++; } return n; };
      let forestX = 40, best = -1;
      for (let x = 30; x < w.w - 30; x += 3) { const d = dens(x); if (d > best) { best = d; forestX = x; } }
      let caveX = forestX, caveY = 0, caveBest = -1;
      for (let x = 30; x < w.w - 30; x += 4) for (let y = w.surface[x] + 14; y < Math.min(w.h - 6, w.surface[x] + 50); y += 4) {
        let air = 0; for (let j = -8; j <= 8; j += 2) for (let i = -14; i <= 14; i += 2) if (!SOLID[w.getTile(x + i, y + j)]) air++;
        if (air > caveBest) { caveBest = air; caveX = x; caveY = y; }
      }
      let torches = 0;
      for (let i = -10; i <= 10 && torches < 6; i += 4) { const x = caveX + i; for (let y = caveY - 4; y <= caveY + 4; y++) if (w.getTile(x, y) === TILE.AIR && SOLID[w.getTile(x, y + 1)]) { w.setTile(x, y, TILE.TORCH); torches++; break; } }
      window.shotPlace = (tx, ty, zoom = 2) => {
        game.zoom = zoom;
        game.cam.x = Math.round(tx * T - canvas.width / zoom / 2); game.cam.y = Math.round(ty * T - canvas.height / zoom / 2);
        game.player.x = tx * T; game.player.y = ty * T - game.player.h; game.player.vx = game.player.vy = 0;
        w.computeLight(tx, ty); w.lightDirty = false; w.composeLight(game.daylight);
      };
      window.shotScenes = {
        surface: () => { game.time = .3; game.daylight = 1; game.weather.rain = 0; shotPlace(forestX, w.surface[forestX] - 6); },
        cave: () => { game.time = .3; game.daylight = 1; game.weather.rain = 0; shotPlace(caveX, caveY); },
        rain: () => { game.time = .3; game.daylight = 1; shotPlace(forestX, w.surface[forestX] - 6); game.weather.rain = 1; },
        night: () => { game.time = .8; game.daylight = 0; game.weather.rain = 0; shotPlace(forestX, w.surface[forestX] - 6); },
        dusk: () => { game.time = .62; game.daylight = .35; game.weather.rain = 0; shotPlace(forestX, w.surface[forestX] - 6); },
      };
      return Object.keys(window.shotScenes);
    });
    const shots = [];
    for (const name of names) for (const shaders of [true, false]) {
      const file = `${dir}/${name}${shaders ? '' : '-off'}.png`;
      await page.evaluate(({ name, shaders }) => {
        GAME_OPTIONS.shaders = shaders;
        shotScenes[name]();
        for (let i = 0; i < 4; i++) renderer.render(game);
      }, { name, shaders });
      const data = await page.evaluate(() => renderer.canvas.toDataURL());
      fs.writeFileSync(file, Buffer.from(data.split(',')[1], 'base64'));
      shots.push(file);
    }
    const report = { label, errors, shots: {} };
    if (compare) for (const file of shots) {
      const other = file.replace(`shots-${label}`, `shots-${compare}`);
      report.shots[file.split('/').pop()] = fs.existsSync(other) ? diff(decodePng(fs.readFileSync(other)), decodePng(fs.readFileSync(file))) : { error: 'missing baseline' };
    }
    fs.writeFileSync(`${dir}/report.json`, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
