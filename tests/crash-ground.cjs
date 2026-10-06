// Regra dos destroços do avião: nenhum flutua (js/crash-site.js, groundPiece): node tests/crash-ground.cjs [sementes...]
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const seeds = process.argv.length > 2 ? process.argv.slice(2).map(Number) : [4242, 77, 123, 99, 555, 2024];
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } }), errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(() => { localStorage.setItem('valdoria.autoconnect', '0'); });
    await page.goto('http://localhost/jogo-teste/');
    await page.waitForFunction(() => { try { return typeof game === 'object' && typeof newWorld === 'function'; } catch { return false; } });
    for (const seed of seeds) {
      const r = await page.evaluate(async (seed) => {
        await newWorld('pequeno', () => {}, seed);
        const w = world, c = game.crashSite, bad = [];
        const pieces = c.wrecks.concat(c.debris);
        for (const p of pieces) {
          const b = pieceBox(p), x0 = Math.floor(b.x0 / T), x1 = Math.floor((b.x0 + b.img.width - 1) / T), row = Math.round(p.y / T);
          for (let tx = x0; tx <= x1; tx++) {
            const under = w.getTile(tx, row), above = w.getTile(tx, row - 1);
            if (!SOLID[under] || SOLID[above] || w.water[(row - 1) * w.w + tx]) { bad.push([p.kind || 'peça', tx, row, under, above]); break; }
          }
        }
        return { pieces: pieces.length, bad };
      }, seed);
      console.log(seed, JSON.stringify(r));
      assert.equal(r.bad.length, 0, 'destroço flutuando/enterrado na semente ' + seed + ': ' + JSON.stringify(r.bad));
      assert(r.pieces >= 20, 'peças geradas');
    }
    assert.deepEqual(errors, []);
    console.log('crash-ground ok');
  } finally { await browser.close(); }
})().catch((e) => { console.error(e); process.exitCode = 1; });
