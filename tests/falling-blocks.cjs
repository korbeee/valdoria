const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 700 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => { window.requestAnimationFrame = () => 0; });
    await page.goto('http://localhost/jogo-teste/');
    await page.waitForFunction(() => typeof updateFallingBlocks === 'function' && typeof game === 'object');
    const result = await page.evaluate(() => {
      const check = (ok, message) => { if (!ok) throw Error(message); };
      function scene() {
        const w = new World(60, 60, 1, { lazy: true });
        w.generated = true;
        const g = { world: w, player: new Player(2 * T, 2 * T), cam: { x: 0, y: 0 }, zoom: 2, particles: [], drops: [] };
        for (let x = 0; x < w.w; x++) w.setTile(x, 40, TILE.STONE);
        return g;
      }
      const run = (g, n = 240, dt = 1 / 60) => { for (let i = 0; i < n; i++) updateFallingBlocks(g, dt); };
      const count = (g, t) => [...g.world.tiles].filter(v => v === t).length + (g.world.fallingBlocks?.bodies || []).filter(f => f.tile === t).length;
      let g = scene(), w = g.world;
      for (const [x, tile] of [[10, TILE.SAND], [12, TILE.SNOW]]) {
        w.setTile(x, 15, tile); w.setTile(x, 16, TILE.STONE);
      }
      run(g, 10);
      check(w.getTile(10, 15) === TILE.SAND && w.getTile(12, 15) === TILE.SNOW, 'Bloco com apoio caiu');
      w.setTile(10, 16, TILE.AIR); w.setTile(12, 16, TILE.AIR);
      run(g, 1);
      check(w.getTile(10, 15) === TILE.AIR && w.fallingBlocks.bodies.length === 2, 'Remoção de apoio não iniciou a queda');
      const first = w.fallingBlocks.bodies.find(f => f.tx === 10).y;
      run(g, 1);
      check(w.fallingBlocks.bodies.find(f => f.tx === 10).y - first > first - 15 * T, 'Queda sem aceleração');
      run(g);
      check(w.getTile(10, 39) === TILE.SAND && w.getTile(12, 39) === TILE.SNOW && !w.fallingBlocks.bodies.length, 'Pouso errado');
      check(g.particles.some(p => p.grow), 'Sem poeira de impacto');

      g = scene(); w = g.world;
      // Colocar no alto com parede de fundo também precisa cair.
      w.setWall(10, 8, WALL.STONE); w.setTile(10, 8, TILE.SAND);
      w.setTile(11, 8, TILE.SNOW); w.setTile(12, 8, TILE.DIRT);
      run(g);
      check(w.getTile(10, 39) === TILE.SAND && w.getTile(11, 39) === TILE.SNOW && w.getTile(12, 8) === TILE.DIRT, 'Gravidade de colocação ou de outros materiais errada');

      g = scene(); w = g.world;
      for (let y = 8; y <= 20; y++) w.setTile(10, y, y % 2 ? TILE.SNOW : TILE.SAND);
      const sand = count(g, TILE.SAND), snow = count(g, TILE.SNOW);
      run(g, 360);
      check(count(g, TILE.SAND) === sand && count(g, TILE.SNOW) === snow && !g.drops.length && !w.fallingBlocks.bodies.length, 'Pilha perdeu ou duplicou blocos');
      for (let y = 27; y <= 39; y++) check(TILE_DEFS[w.getTile(10, y)]?.gravity, 'Pilha deixou espaços no pouso');
      w.setTile(10, 40, TILE.AIR); run(g);
      check(TILE_DEFS[w.getTile(10, 59)]?.gravity, 'Pilha não voltou a cair ao perder apoio');

      g = scene(); w = g.world;
      w.setTile(10, 1, TILE.SAND); run(g, 5);
      w.setTile(10, 24, TILE.STONE); run(g, 80, .1);
      check(w.getTile(10, 23) === TILE.SAND, 'Queda atravessou obstáculo novo em alta velocidade');
      g = scene(); w = g.world;
      w.setTile(10, 30, TILE.PLATFORM); w.setTile(10, 5, TILE.SNOW); run(g);
      check(w.getTile(10, 29) === TILE.SNOW, 'Plataforma não segurou bloco');
      g = scene(); w = g.world;
      w.setTile(10, 10, TILE.TORCH); w.setTile(10, 5, TILE.SAND); run(g);
      check(w.getTile(10, 10) === TILE.TORCH && w.getTile(10, 39) === TILE.SAND, 'Tocha segurou areia ou foi destruída');
      g = scene(); w = g.world;
      g.player.x = 10 * T; g.player.y = 40 * T - g.player.h;
      w.setTile(10, 5, TILE.SAND); run(g);
      check(!w.fallingBlocks.bodies.length && g.drops.length === 1 && w.getTile(10, 39) === TILE.AIR, 'Bloco prendeu jogador ou sumiu');
      g = scene(); w = g.world;
      w.water[39 * w.w + 10] = WATER_MAX; w.setTile(10, 5, TILE.SNOW); run(g);
      check(w.getTile(10, 39) === TILE.SNOW && w.water[39 * w.w + 10] === 0, 'Bloco não acomodou na água');

      // Blocos naturais não caem por tempo, câmera ou interação distante.
      g = scene(); w = g.world;
      w.tiles[5 * w.w + 10] = TILE.SAND; w.tiles[5 * w.w + 20] = TILE.SNOW;
      run(g); g.cam.x = 50 * T; run(g); g.cam.x = 0; run(g);
      w.setTile(30, 5, TILE.STONE); run(g);
      check(w.getTile(10, 5) === TILE.SAND && w.getTile(20, 5) === TILE.SNOW && !w.fallingBlocks.bodies.length, 'Terreno natural ativou sem interação próxima');
      w.setTile(9, 5, TILE.STONE); run(g, 1); g.cam.x = 50 * T; run(g);
      check(w.getTile(10, 39) === TILE.SAND && w.getTile(20, 5) === TILE.SNOW, 'Interação vizinha não acordou apenas a região próxima');

      // Confere a camada de gelo antes das cavernas e a crosta final em sementes reais.
      let snowyColumns = 0, snowyBases = 0;
      for (const seed of [1, 42, 234]) {
        const terrain = new World(1200, 360, seed, { lazy: true });
        const steps = terrain.generateSteps();
        let step;
        do { step = steps.next(); } while (!step.done && step.value[0] < .15);
        for (let x = 0; x < terrain.w; x++) {
          if (terrain.biome[x] !== BIOME.SNOW) continue;
          snowyColumns++;
          let y = terrain.surface[x];
          while (terrain.getTile(x, y) === TILE.SNOW) y++;
          check(terrain.getTile(x, y) === TILE.ICE && terrain.getTile(x, y + 2) === TILE.ICE, 'Bioma nasceu sem camada de gelo sob a neve');
        }
        while (!steps.next().done) {}
        check(!terrain.fallingBlocks?.pending.size, 'Geração acordou física');
        for (let x = 0; x < terrain.w; x++) if (terrain.biome[x] === BIOME.SNOW)
          for (let y = 0; y < terrain.h - 1; y++)
            if (terrain.getTile(x, y) === TILE.SNOW && terrain.getTile(x, y + 1) !== TILE.SNOW) {
              snowyBases++;
              const below = terrain.getTile(x, y + 1);
              check(below !== TILE.AIR && below !== TILE.STONE && below !== TILE.DIRT, 'Caverna removeu crosta sob neve natural');
            }
      }
      check(snowyColumns > 50 && snowyBases > 50, 'Teste não encontrou neve suficiente');

      g = scene(); w = g.world;
      const originalWorld = world, originalGameWorld = game.world, originalSlots = game.inventory.slots.slice(), originalSelected = game.selected;
      try {
        world = game.world = w;
        game.selected = 0; game.inventory.slots[0] = { item: ITEM.SAND, count: 2 };
        w.setWall(10, 4, WALL.STONE);
        check(tryPlace(10, 4), 'Interação não colocou areia no alto');
        check(game.inventory.slots[0].count === 1, 'Colocação consumiu quantidade errada');
        run(g);
        check(w.getTile(10, 39) === TILE.SAND && count(g, TILE.SAND) === 1, 'Colocação real perdeu bloco');
      } finally {
        world = originalWorld; game.world = originalGameWorld;
        game.inventory.slots = originalSlots; game.selected = originalSelected;
      }

      g = scene(); g.world = new World(60, 650, 2, { lazy: true }); w = g.world; w.generated = true;
      w.setTile(10, 640, TILE.STONE);
      for (let y = 100; y <= 630; y++) w.setTile(10, y, TILE.SAND);
      run(g, 300);
      check(count(g, TILE.SAND) === 531 && !g.drops.length && !w.fallingBlocks.bodies.length, 'Avalanche grande perdeu blocos ou não terminou');
      for (let y = 109; y <= 639; y++) check(w.getTile(10, y) === TILE.SAND, 'Avalanche grande deixou vão');

      g = scene(); w = g.world;
      w.setTile(10, 3, TILE.SAND); run(g, 12);
      const snapshot = fallingBlocksView(w), remote = scene();
      applyFallingBlocksView(remote, snapshot);
      check(remote.world.fallingBlocks.bodies.length === 1 && remote.world.fallingBlocks.bodies[0].targetY === snapshot[0].y, 'Retrato da queda perdeu corpo');
      const oldRoom = NET.room, oldHost = NET.isHost;
      try {
        NET.room = { id: 'test' }; NET.isHost = false;
        remote.world.setTile(15, 2, TILE.SNOW); updateFallingBlocks(remote, 1 / 60);
        check(remote.world.getTile(15, 2) === TILE.SNOW, 'Convidado alterou terreno pela física');
        applyFallingBlocksView(remote, []);
        check(!remote.world.fallingBlocks.bodies.length, 'Convidado manteve corpo encerrado');
      } finally { NET.room = oldRoom; NET.isHost = oldHost; }

      // Prévia real com o atlas do jogo, durante a queda.
      g = scene(); g.cam = { x: 0, y: 2 * T }; g.zoom = 1;
      for (let x = 10; x <= 15; x++) g.world.setTile(x, 7 + (x % 3), x % 2 ? TILE.SNOW : TILE.SAND);
      run(g, 24);
      const preview = document.createElement('canvas'); preview.width = 640; preview.height = 700;
      document.body.replaceChildren(preview);
      const c = preview.getContext('2d'); c.scale(2, 2); c.fillStyle = '#263c50'; c.fillRect(0, 0, 320, 350);
      drawFallingBlocks(c, g, renderer.tex);
      for (const p of g.particles) { c.fillStyle = p.color; c.fillRect(p.x, p.y, 1, 1); }
      return { checks: 22, moving: g.world.fallingBlocks.bodies.length, sand, snow, snowyColumns, snowyBases };
    });
    await page.locator('canvas').screenshot({ path: 'tests/falling-blocks-preview.png' });
    assert.deepEqual(errors, []);
    console.log(JSON.stringify(result));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
