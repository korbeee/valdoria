// Enfeites colhíveis: o sorteio continua procedural, mas cada um vira item ao ser
// colhido, some do lugar e só volta se a espécie voltar a crescer.
//   node tests/env-harvest.cjs
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error' || m.text().startsWith('[Arte]')) errors.push(m.text()); });
    await page.addInitScript(() => {
      window.requestAnimationFrame = () => 1;
      let seed = 31337;
      Math.random = () => ((seed = Math.imul(seed, 1664525) + 1013904223 | 0) >>> 0) / 4294967296;
    });
    await page.goto('http://localhost/jogo-teste/');
    await page.waitForFunction(() => typeof game === 'object');
    const result = await page.evaluate(() => {
      const checks = {}, notes = {};
      finishOpening(game); Menu.root.hidden = true; game.intro.active = false; game.paused = false;
      game.weather ??= createWeather(); game.drops ??= [];
      GAME_OPTIONS.shaders = true; GAME_OPTIONS.shake = false;
      const w = game.world;
      const key = (x, y, ceiling) => (y * w.w + x) * 2 + (ceiling ? 1 : 0);
      const findKind = (test, y0, y1) => {
        for (let x = 20; x < w.w - 20; x++)
          for (let y = y0(x); y < y1(x); y++) {
            const d = environmentDecoration(w, x, y, false);
            const k = environmentKind(d);
            if (d && test(k)) return { x, y, kind: k };
          }
        return null;
      };
      const surface = k => findKind(k, x => w.surface[x] - 1, x => w.surface[x] + 2);
      const cave = k => findKind(k, x => w.surface[x] + 12, x => Math.min(w.h - 4, w.surface[x] + 60));

      // 1. Todo enfeite tem regra de colheita (nenhum tipo ficou de fora da tabela)
      const kinds = new Set();
      for (let x = 20; x < w.w - 20; x += 3)
        for (let y = 2; y < w.h - 2; y++) for (const hang of [false, true]) {
          const d = environmentDecoration(w, x, y, hang);
          if (d) kinds.add(environmentKind(d));
        }
      notes.kinds = [...kinds];
      checks.everyKindHarvestable = kinds.size > 3 && [...kinds].every(k => ENV_HARVEST[k]);

      // 2. Colher solta item, esvazia o lugar e não gera outro por cima
      const plant = surface(k => ENV_HARVEST[k]?.lamina && ENV_HARVEST[k].volta > 0);
      notes.plant = plant;
      const dropsBefore = game.drops.length;
      checks.plantHarvested = environmentHarvest(game, plant.x, plant.y, false) === true;
      checks.plantGone = !environmentDecoration(w, plant.x, plant.y, false);
      checks.plantDropped = game.drops.length > dropsBefore;
      notes.plantDrop = ITEM_DEFS[game.drops.at(-1).item].name;
      for (let i = 0; i < 60; i++) update(1 / 60);
      checks.plantStaysGone = !environmentDecoration(w, plant.x, plant.y, false);

      // 3. …mas volta a nascer quando dá o tempo dela
      const plantKey = key(plant.x, plant.y, false);
      checks.plantScheduled = Number.isFinite(w.decorCut.get(plantKey));
      w.decorCut.set(plantKey, game.clock - 1);
      for (let i = 0; i < 150; i++) update(1 / 60);
      checks.plantGrewBack = !w.decorCut.has(plantKey) && !!environmentDecoration(w, plant.x, plant.y, false);

      // 4. Cristal e cogumelo não voltam nunca
      const forever = cave(k => ENV_HARVEST[k]?.volta === 0 && (k === 'crystal' || k === 'mushroom'));
      notes.forever = forever;
      if (forever) {
        w.lightDirty = false;
        environmentHarvest(game, forever.x, forever.y, false);
        checks.mineralDropped = [ITEM.CRYSTAL, ITEM.GLOW_CAP].includes(game.drops.at(-1).item);
        checks.mineralNeverGrowsBack = w.decorCut.get(key(forever.x, forever.y, false)) === Infinity;
        checks.glowHarvestRelightsWorld = w.lightDirty === true;
        for (let i = 0; i < 400; i++) update(1 / 60);
        checks.mineralStillGone = !environmentDecoration(w, forever.x, forever.y, false);
      }

      // 5. A lâmina só ceifa mato: cristal e pedra precisam de clique com ferramenta
      const mineral = cave(k => ENV_HARVEST[k] && !ENV_HARVEST[k].lamina);
      notes.mineral = mineral;
      if (mineral) {
        checks.bladeSkipsMinerals = environmentHarvest(game, mineral.x, mineral.y, false, true) === false;
        checks.mineralStillThere = !!environmentDecoration(w, mineral.x, mineral.y, false);
        checks.clickTakesMinerals = environmentHarvest(game, mineral.x, mineral.y, false) === true;
      }

      // 6. Golpe de espada corta o mato no arco e solta inseto
      let cut = 0, bugs = 0;
      const spot = surface(k => ENV_HARVEST[k]?.lamina);
      game.player.x = spot.x * T; game.player.y = (w.surface[spot.x] - 2) * T;
      game.player.vx = game.player.vy = 0;
      game.cam.x = game.player.x - canvas.width / game.zoom / 2; game.cam.y = game.player.y - canvas.height / game.zoom / 2;
      w.computeLight(spot.x, w.surface[spot.x]); w.composeLight(1);
      const cutBefore = w.decorCut.size;
      game.inventory.add(ITEM.STONE_SWORD, 1);
      game.selected = game.inventory.slots.findIndex(s => s && s.item === ITEM.STONE_SWORD);
      for (let swing = 0; swing < 8; swing++) {
        game.attackCooldown = 0;
        startSwordSwing(game, ITEM_DEFS[ITEM.STONE_SWORD], game.player.cx + (swing % 2 ? 40 : -40), game.player.cy);
        for (let i = 0; i < 40; i++) update(1 / 60);
        bugs = Math.max(bugs, (game.critters || []).length);
      }
      cut = w.decorCut.size - cutBefore;
      notes.swordCut = cut; notes.bugs = bugs;
      checks.swordCutsPlants = cut > 0;

      // 7. Insetos somem sozinhos e não deixam lixo para trás
      spawnEnvCritter(game, game.player.cx, game.player.cy);
      const alive = (game.critters || []).length;
      for (const b of game.critters) b.life = 0.01;
      for (let i = 0; i < 30; i++) update(1 / 60);
      checks.crittersSpawn = alive > 0;
      checks.crittersExpire = (game.critters || []).length === 0;

      // 8. Nada disso muda o desenho de um mundo intocado
      for (let i = 0; i < 3; i++) renderer.render(game);
      checks.rendersWithoutError = true;
      return { checks, notes };
    });
    console.log(JSON.stringify({ ...result, errors }, null, 2));
    assert.deepEqual(errors, []);
    for (const [name, passed] of Object.entries(result.checks)) assert.equal(passed, true, name);
    console.log(`${Object.keys(result.checks).length} harvest checks passed`);
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
