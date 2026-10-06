// Puçá: apanha bicho pequeno e manso, recusa bicho bravo ou grande, e o botão direito
// solta o bicho vivo de volta no mundo.
//   node tests/bug-net.cjs
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
      let seed = 8123;
      Math.random = () => ((seed = Math.imul(seed, 1664525) + 1013904223 | 0) >>> 0) / 4294967296;
    });
    await page.goto('http://localhost/jogo-teste/');
    await page.waitForFunction(() => typeof game === 'object');
    const result = await page.evaluate(() => {
      const checks = {}, notes = {};
      finishOpening(game); Menu.root.hidden = true; game.intro.active = false; game.paused = false;
      game.weather ??= createWeather(); game.drops ??= [];
      game.inventoryUI.open = false; game.mapUI.open = false;
      GAME_OPTIONS.shake = false;
      const w = game.world;

      // Chão firme, longe da fuselagem, para o teste não esbarrar nos destroços
      let spot = -1;
      const crash = game.crashSite ? Math.floor((game.crashSite.x || 0) / T) : -999;
      for (let x = 30; x < w.w - 30 && spot < 0; x++) {
        if (Math.abs(x - crash) < 60) continue;
        const y = w.surface[x];
        if (w.isSolid(x, y) && w.getTile(x, y - 1) === TILE.AIR && w.getTile(x, y - 2) === TILE.AIR &&
          w.isSolid(x + 2, w.surface[x + 2]) && !w.hasWater(x, y - 1) && !w.hasWater(x + 2, w.surface[x + 2] - 1)) spot = x;
      }
      notes.spot = spot;
      const stand = () => {
        game.player.x = spot * T; game.player.y = (w.surface[spot] - 2) * T;
        game.player.vx = game.player.vy = 0;
        game.cam.x = game.player.x - canvas.width / game.zoom / 2;
        game.cam.y = game.player.y - canvas.height / game.zoom / 2;
        w.computeLight(spot, w.surface[spot]); w.lightDirty = false; w.composeLight(game.daylight);
      };
      stand();
      for (let i = 0; i < 20; i++) update(1 / 60);
      stand();

      const net = ITEM_DEFS[ITEM.BUG_NET];
      game.inventory.add(ITEM.BUG_NET, 1);
      const netSlot = game.inventory.slots.findIndex(s => s && s.item === ITEM.BUG_NET);
      const swing = () => {
        game.selected = netSlot;
        game.attackCooldown = 0;
        startSwordSwing(game, net, game.player.cx + 40, game.player.cy + 2);
        // O golpe da puçá é mais demorado que o da espada: deixa terminar antes do próximo
        for (let i = 0; i < 42; i++) update(1 / 60);
        stand();
      };
      const nextTo = m => { m.x = game.player.cx + 16; m.y = game.player.y + game.player.h - m.h - .01; m.vx = m.vy = 0; };

      // 1. A puçá existe, é item de mão e tem receita
      checks.netIsTool = net.puca === true && !!ITEM_ART[ITEM.BUG_NET];
      checks.netHasRecipe = RECIPES.some(r => r.resultado.item === ITEM.BUG_NET);
      // Receita com item indefinido acontece quando o arquivo do item carrega depois de
      // js/recipes.js: some da bancada sem erro nenhum, então é melhor conferir aqui.
      const broken = RECIPES.filter(r => !ITEM_DEFS[r.resultado?.item]?.name ||
        r.ingredientes.some(([id, n]) => !ITEM_DEFS[id]?.name || !(n > 0)));
      notes.brokenRecipes = broken.map(r => r.nome);
      checks.noBrokenRecipes = broken.length === 0;

      // 2. Inseto do mato entra na rede
      game.critters = [];
      spawnEnvCritter(game, game.player.cx + 18, game.player.cy);
      game.critters[0].vx = game.critters[0].vy = 0;
      const insects = game.inventory.count(ITEM.INSECT);
      swing();
      checks.catchesInsect = game.critters.length === 0 && game.inventory.count(ITEM.INSECT) === insects + 1;

      // 3. Libélula também
      // A libélula foge de quem chega a menos de 2,5 blocos: o cabo comprido da puçá
      // alcança ela de um pouco mais longe, que é como se pega no jogo.
      const fx = game.player.cx + 42, fy = game.player.cy;
      game.dragonflies = [{ x: fx, y: fy, hx: fx, water: fy + 40, tx: fx, ty: fy, wait: 9,
        phase: 0, color: DRAGONFLY_COLORS[0], fade: 1, life: 99, facing: 1 }];
      swing();
      checks.catchesDragonfly = game.dragonflies.length === 0 && game.inventory.count(ITEM.CRITTER_DRAGONFLY) === 1;

      // 4. Coelho (bicho manso e pequeno) entra; lobo (bravo) não, e não toma dano
      game.mobs = game.mobs.filter(m => m.kind !== 'rabbit' && m.kind !== 'wolf');
      const rabbit = new Wildlife('rabbit', 0, 0); nextTo(rabbit); game.mobs.push(rabbit);
      swing();
      checks.catchesRabbit = !game.mobs.includes(rabbit) && game.inventory.count(ITEM.CRITTER_RABBIT) === 1;

      const wolf = new Wildlife('wolf', 0, 0); nextTo(wolf); game.mobs.push(wolf);
      const wolfHp = wolf.hp;
      game.toast.t = 0; game.toast.text = '';
      swing();
      checks.refusesHostile = game.mobs.includes(wolf) && !wolf.dead;
      checks.hostileTakesNoDamage = wolf.hp === wolfHp;
      checks.hostileExplains = /pequeno e manso/.test(game.toast.text);
      notes.wolfToast = game.toast.text;
      game.mobs = game.mobs.filter(m => m !== wolf);

      // 5. Porco e elefante ficam de fora da lista (não são bichinho de rede)
      checks.pigNotNetable = !NET_CATCH.pig && !NET_CATCH.elephant && !NET_CATCH.tiger;

      // 6. Peixe pequeno entra; tubarão, baiacu e água-viva não
      checks.smallFishNetable = !!NET_CATCH.minnow && !!NET_CATCH.sardine;
      checks.dangerousWaterNotNetable = !NET_CATCH.shark && !NET_CATCH.puffer && !NET_CATCH.jellyfish;

      // 7. Soltar de volta: o bicho volta a existir e o item some da mão
      const right = (tx, ty) => {
        input.mouse.x = (tx * T + T / 2 - game.cam.x) * game.zoom;
        input.mouse.y = (ty * T + T / 2 - game.cam.y) * game.zoom;
        game.placeCooldown = 0; game.rightWasDown = false; input.mouse.right = true;
        update(1 / 60);
        input.mouse.right = false;
        update(1 / 60);
      };
      game.selected = game.inventory.slots.findIndex(s => s && s.item === ITEM.CRITTER_RABBIT);
      const rx = spot + 2, ry = w.surface[rx] - 1;
      notes.releaseCell = [rx, ry, w.getTile(rx, ry), w.getTile(rx, ry + 1)];
      right(rx, ry);
      checks.releaseSpawnsRabbit = game.mobs.some(m => m.kind === 'rabbit');
      checks.releaseSpendsItem = game.inventory.count(ITEM.CRITTER_RABBIT) === 0;

      game.selected = game.inventory.slots.findIndex(s => s && s.item === ITEM.CRITTER_DRAGONFLY);
      right(rx, ry - 3);
      checks.releaseSpawnsDragonfly = (game.dragonflies || []).length === 1;

      // 8. Peixinho só volta dentro da água
      game.inventory.add(ITEM.CRITTER_FISH, 2);
      game.selected = game.inventory.slots.findIndex(s => s && s.item === ITEM.CRITTER_FISH);
      const fishBefore = game.mobs.filter(m => m.def?.aquatic).length;
      game.toast.t = 0; game.toast.text = '';
      right(rx, ry);
      checks.fishNeedsWater = game.mobs.filter(m => m.def?.aquatic).length === fishBefore &&
        game.inventory.count(ITEM.CRITTER_FISH) === 2 && /água/.test(game.toast.text);
      notes.fishToast = game.toast.text;
      // Cava um tanque ao lado e solta lá
      for (let x = rx - 1; x <= rx + 2; x++) for (let y = ry; y <= ry + 3; y++) { w.tiles[y * w.w + x] = TILE.AIR; w.water[y * w.w + x] = WATER_MAX; }
      for (let x = rx - 2; x <= rx + 3; x++) w.computeSkyTop(x);
      right(rx, ry + 2);
      checks.fishReleasedInWater = game.mobs.filter(m => m.def?.aquatic).length > fishBefore &&
        game.inventory.count(ITEM.CRITTER_FISH) === 1;

      // 9. Todo item de bicho tem ícone e nome
      const critterItems = ITEM_DEFS.map((d, id) => d?.criatura ? id : 0).filter(Boolean);
      notes.critterItems = critterItems.map(id => ITEM_DEFS[id].name);
      const atlas = renderer.tex.itemAtlas.getContext('2d');
      checks.everyCritterHasIcon = critterItems.length >= 5 && critterItems.every(id => {
        const d = atlas.getImageData(id * T, 0, T, T).data;
        let painted = 0;
        for (let i = 3; i < d.length; i += 4) if (d[i] > 0) painted++;
        return painted > 24;
      });

      for (let i = 0; i < 3; i++) renderer.render(game);
      checks.rendersWithoutError = true;
      return { checks, notes };
    });
    console.log(JSON.stringify({ ...result, errors }, null, 2));
    assert.deepEqual(errors, []);
    for (const [name, passed] of Object.entries(result.checks)) assert.equal(passed, true, name);
    console.log(`${Object.keys(result.checks).length} bug-net checks passed`);
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
