// Folha de contato do criador de personagem: todos os cabelos, barbas, óculos, chapéus e roupas,
// ampliados, para conferir a arte pixel a pixel. Salva tests/character-sheet.png.
//   node tests/character-sheet.cjs
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const path = require('node:path');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
    await page.goto('http://localhost/jogo-teste/');
    await page.waitForFunction(() => typeof game === 'object' || window.__fail, null, { timeout: 15000 }).catch(() => console.log(errors.join('\n')));
    const url = await page.evaluate(() => {
      const Z = 4, cellW = 34 * Z, cellH = 50 * Z + 16;
      const groups = [
        ['hairStyle', HAIR_STYLES], ['beard', BEARDS], ['glasses', GLASSES], ['hat', HATS],
        ['top', TOP_STYLES], ['pattern', PATTERNS], ['legs', LEG_STYLES],
      ];
      // Visuais completos em várias poses do jogo (agachado, engatinhando, nadando, sentado…)
      const A = PLAYER_ANIMS, poses = [A.idle, A.walk + 3, A.run + 5, A.jump + 1, A.crouchIn + 1, A.crawl + 2, A.swim + 2, A.sit];
      const looks = [
        { hairStyle: 7, hair: 2, skin: 4, beard: 4, glasses: 2, top: 4, jacket: 9, legs: 1, boots: 5 },
        { hairStyle: 11, hair: 10, skin: 5, hat: 4, hatColor: 4, top: 3, jacket: 3, pattern: 2, pants: 5, boots: 7 },
        { hairStyle: 12, hair: 8, skin: 7, hat: 2, hatColor: 1, glasses: 1, top: 2, shirt: 6, pattern: 2, legs: 1, pants: 9 },
      ];
      const cols = 8, rows = groups.reduce((n, [, l]) => n + Math.ceil(l.length / cols), 0) + looks.length;
      const out = document.createElement('canvas');
      out.width = cols * cellW; out.height = rows * cellH;
      const c = out.getContext('2d');
      c.imageSmoothingEnabled = false;
      c.fillStyle = '#2a3440'; c.fillRect(0, 0, out.width, out.height);
      c.font = '12px monospace';
      let row = 0;
      const base = { ...DEFAULT_LOOK, hair: 1, jacket: 0, skin: 2 };
      for (const [key, list] of groups) {
        list.forEach((e, i) => {
          previewLook({ ...base, [key]: i, ...(key === 'beard' ? { hairStyle: 5 } : {}) });
          const atlas = buildPlayerSprite(1);
          const x = (i % cols) * cellW, y = (row + Math.floor(i / cols)) * cellH;
          c.drawImage(atlas, 0, 0, 32, 48, x + Z, y + 14, 32 * Z, 48 * Z);
          c.fillStyle = '#fff'; c.fillText(`${key}: ${e.name}`, x + 4, y + 11);
        });
        row += Math.ceil(list.length / cols);
      }
      for (const look of looks) {
        previewLook({ ...base, ...look });
        const atlas = buildPlayerSprite();
        poses.forEach((f, i) => {
          const x = i * cellW, y = row * cellH;
          c.drawImage(atlas, f * 32, 0, 32, 48, x + Z, y + 14, 32 * Z, 48 * Z);
          c.fillStyle = '#fff'; c.fillText(`pose ${f}`, x + 4, y + 11);
        });
        row++;
      }
      PLAYER_LOOK_PREVIEW = null; applyLookToPalette(PLAYER_LOOK);
      return out.toDataURL();
    });
    require('node:fs').writeFileSync(path.join(__dirname, 'character-sheet.png'), Buffer.from(url.split(',')[1], 'base64'));
    console.log(errors.length ? 'ERROS:\n' + errors.join('\n') : 'ok');
  } finally { await browser.close(); }
})();
