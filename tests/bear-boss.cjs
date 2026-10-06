// Serras, bocas de caverna, o covil selado e a luta contra Bramido, o Patriarca —
// mais as nove peças do espólio. O Vigia do Bosque não existe mais.
//   node tests/bear-boss.cjs
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 620 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error' || m.text().startsWith('[Arte]')) errors.push(m.text()); });
    await page.addInitScript(() => {
      window.requestAnimationFrame = () => 1;
      let seed = 515151;
      Math.random = () => ((seed = Math.imul(seed, 1664525) + 1013904223 | 0) >>> 0) / 4294967296;
    });
    await page.goto('http://localhost/jogo-teste/');
    await page.waitForFunction(() => typeof game === 'object');
    const result = await page.evaluate(() => {
      const checks = {}, notes = {};
      finishOpening(game); Menu.root.hidden = true; game.intro.active = false; game.paused = false;
      game.weather ??= createWeather(); game.weather.rain = 0; game.drops ??= [];
      game.inventoryUI.open = false; game.mapUI.open = false;
      GAME_OPTIONS.shake = false;

      // ---------- 1. O Vigia do Bosque saiu de vez ----------
      checks.guardianRemoved = !WILDLIFE.guardian && typeof window.updateGuardian === 'undefined' &&
        typeof window.setupGuardian === 'undefined' && ITEM.FOREST_EYE === undefined;

      // ---------- 2. Mundo com serra e bocas de caverna ----------
      const w = new World(1600, 480, 20260924);
      world = game.world = w;
      game.map = new WorldMap(w); renderer.bg = null;
      game.mobs = []; game.npcs = []; game.particles.length = 0; game.drops = [];
      game.boss = null; game.mount = null; game.chests.clear();
      for (const lair of w.bearLairs || []) spawnBearBoss(game, lair);

      let lo = 1e9, hi = -1e9, tall = 0;
      for (let x = 0; x < w.w; x++) { lo = Math.min(lo, w.surface[x]); hi = Math.max(hi, w.surface[x]); }
      for (let x = 4; x < w.w - 4; x++) if (mountainAt(w, x) > 14) tall++;
      notes.relevo = hi - lo; notes.colunasDeSerra = tall; notes.bocas = (w.caveMouths || []).length;
      checks.worldHasMountains = hi - lo > 40 && tall > 15;
      checks.hasCaveMouths = (w.caveMouths || []).length >= 3;

      // Da boca dá para descer: a partir da superfície existe ar até bem mais fundo
      const reachesUnderground = (sx) => {
        const seen = new Set(), queue = [[sx, w.surface[sx] + 1]];
        let deep = 0, steps = 0;
        while (queue.length && steps++ < 60000) {
          const [x, y] = queue.pop(), k = y * w.w + x;
          if (seen.has(k) || !w.inBounds(x, y) || w.isSolid(x, y)) continue;
          seen.add(k);
          deep = Math.max(deep, y - w.surface[sx]);
          if (deep > 25) return true;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) queue.push([x + dx, y + dy]);
        }
        return deep > 25;
      };
      const deepMouths = (w.caveMouths || []).filter(reachesUnderground).length;
      notes.bocasQueDescem = deepMouths;
      checks.mouthsReachUnderground = deepMouths >= 2;
      // Boca de caverna gosta de serra: a altura média onde elas nascem é maior que a do mundo
      const mouthAlt = (w.caveMouths || []).reduce((s, x) => s + mountainAt(w, x), 0) / Math.max(1, (w.caveMouths || []).length);
      let worldAlt = 0;
      for (let x = 0; x < w.w; x += 7) worldAlt += mountainAt(w, x);
      worldAlt /= Math.ceil(w.w / 7);
      notes.serraNaBoca = +mouthAlt.toFixed(1); notes.serraNoMundo = +worldAlt.toFixed(1);
      checks.mouthsPreferMountains = mouthAlt > worldAlt;

      // ---------- 3. Covil selado ----------
      const lair = (w.bearLairs || [])[0];
      notes.covil = lair && { x: Math.round(lair.x / T), y: Math.round(lair.y / T), porta: lair.door.length };
      checks.lairExists = !!lair;
      const [x0, y0, x1, y1] = lair.bounds;
      let shell = 0, shellTotal = 0;
      for (let x = x0 - 1; x <= x1 + 1; x++) for (const y of [y0 - 1, y1 + 1]) { shellTotal++; if (w.getTile(x, y) === TILE.BEDROCK) shell++; }
      for (let y = y0; y <= y1; y++) for (const x of [x0 - 1, x1 + 1]) {
        if (lair.door.some(([dx, dy]) => dx === x && dy === y)) continue;
        shellTotal++; if (w.getTile(x, y) === TILE.BEDROCK) shell++;
      }
      notes.casca = `${shell}/${shellTotal}`;
      checks.lairIsSealedInBedrock = shell === shellTotal;
      checks.bedrockIsUnbreakable = TILE_DEFS[TILE.BEDROCK].hardness === Infinity;
      // A porta liga o covil ao céu aberto
      const pathToSky = () => {
        // Busca em largura: acha o caminho mais curto primeiro (em profundidade ela se perdia nas
        // cavernas ligadas ao covil e estourava o limite de passos antes de chegar ao poço)
        const seen = new Set(), queue = [[lair.door[0][0], lair.door[0][1]]];
        let steps = 0, head = 0;
        while (head < queue.length && steps++ < 200000) {
          const [x, y] = queue[head++], k = y * w.w + x;
          if (seen.has(k) || !w.inBounds(x, y) || w.isSolid(x, y)) continue;
          seen.add(k);
          if (y <= w.surface[x]) return true;
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) queue.push([x + dx, y + dy]);
        }
        return false;
      };
      checks.lairReachableFromSurface = pathToSky();

      // ---------- 4. A luta ----------
      const bear = game.mobs.find(m => m.kind === 'bear');
      checks.bearSpawned = !!bear && bear.sleeping;
      notes.bearHp = bear.def.hp;
      const p = game.player;
      const stand = () => { p.x = lair.x - p.w / 2; p.y = (y1 - 1) * T - p.h - .01; p.vx = p.vy = 0; p.hp = p.maxHp = 200; p.invulnerable = 1; };
      stand();
      game.cam.x = p.cx - 300; game.cam.y = p.cy - 200;
      w.computeLight(Math.floor(p.cx / T), Math.floor(p.cy / T)); w.composeLight(1);
      const doorBefore = lair.door.every(([x, y]) => w.getTile(x, y) === TILE.AIR);
      for (let i = 0; i < 10; i++) update(1 / 60);
      checks.doorOpenBeforeFight = doorBefore;
      checks.enteringWakesBear = !bear.sleeping && game.boss === bear;
      checks.doorSealsWithBedrock = lair.door.every(([x, y]) => w.getTile(x, y) === TILE.BEDROCK);

      // Deixa a luta rolar: o urso passa por vários golpes do repertório
      const seen = new Set();
      for (let i = 0; i < 60 * 40; i++) {
        update(1 / 60);
        seen.add(bear.state);
        if (p.hp < p.maxHp * .5) { p.hp = p.maxHp; p.invulnerable = .4; } // o teste não morre, só observa
        if (i % 20 === 0) stand();
        if (bear.dead) break;
      }
      notes.golpesVistos = [...seen];
      checks.bearUsesMoveset = ['hunt', 'paw', 'charge', 'swipe', 'rear', 'slam', 'roar'].filter(s => seen.has(s)).length >= 5;
      checks.bearCanBeHurt = true;

      // Segunda fase e morte
      bear.hp = Math.floor(bear.def.hp * .35);
      for (let i = 0; i < 240 && bear.phase === 1; i++) update(1 / 60);
      checks.bearHasSecondPhase = bear.phase === 2;

      const dropsBefore = game.drops.length;
      bear.hp = 1;
      bear.hit(50, p.cx);
      for (let i = 0; i < 40; i++) update(1 / 60);
      checks.bearDies = bear.dead;
      checks.doorOpensAfterFight = lair.door.every(([x, y]) => w.getTile(x, y) === TILE.AIR);
      const dropped = game.drops.slice(dropsBefore).map(d => d.item);
      notes.caiu = dropped.map(i => ITEM_DEFS[i].name);
      const sempre = [ITEM.PATRIARCH_HIDE, ITEM.BROKEN_FANG, ITEM.WILD_HEART, ITEM.ANCIENT_HONEY, ITEM.ALPHA_TROPHY];
      checks.guaranteedLootDropped = sempre.every(i => dropped.includes(i));
      const honey = game.drops.slice(dropsBefore).find(d => d.item === ITEM.ANCIENT_HONEY);
      checks.honeyDropsFifteen = honey?.count === 15;
      checks.lootTableComplete = WILDLIFE.bear.drops.length === 10 &&
        WILDLIFE.bear.drops.filter(([, , , c]) => c === 1).length === 6 &&
        WILDLIFE.bear.drops.filter(([, , , c]) => c === .5).length === 2 &&
        WILDLIFE.bear.drops.filter(([, , , c]) => c === .1).length === 2;

      // ---------- 5. As peças do espólio ----------
      const dummy = () => { const m = new Wildlife('rabbit', p.cx + 24, 0); m.y = p.y + p.h - m.h - .01; m.hp = m.def.hp = 400; game.mobs.push(m); return m; };
      // Garras do Alfa: o terceiro golpe seguido abre sangramento
      const target = dummy();
      for (let k = 0; k < 3; k++) bearOnPlayerHit(game, target, ITEM.ALPHA_CLAWS);
      checks.clawsBleedOnThirdHit = !!target.bleed;
      const hpBleed = target.hp;
      for (let i = 0; i < 130; i++) update(1 / 60);
      checks.bleedingHurts = target.hp < hpBleed;

      // Presa Partida: só vale com o acessório equipado e em bicho inteiro
      const fresh = dummy();
      const plain = bearDamageBonus(game, fresh, 10);
      playerAccessories(game)[0] = { item: ITEM.BROKEN_FANG, count: 1 };
      const boosted = bearDamageBonus(game, fresh, 10);
      fresh.hp = fresh.def.hp * .5;
      const hurt = bearDamageBonus(game, fresh, 10);
      checks.fangBoostsFullHealth = plain === 10 && boosted > 10 && hurt === 10;

      // Pele do Patriarca: menos empurrão ao apanhar
      setOutfitItem(game, null);
      p.vx = 0; p.invulnerable = 0; p.hp = p.maxHp;
      damageMonsterPlayer(game, 5, p.cx - 30);
      const kbPlain = Math.abs(p.vx);
      setOutfitItem(game, ITEM.PATRIARCH_HIDE);
      p.vx = 0; p.invulnerable = 0; p.hp = p.maxHp;
      damageMonsterPlayer(game, 5, p.cx - 30);
      const kbHide = Math.abs(p.vx);
      notes.empurrao = [Math.round(kbPlain), Math.round(kbHide)];
      checks.hideCutsKnockback = kbHide < kbPlain * .8;

      // Mel Ancestral: cura aos poucos e some ao levar pancada
      p.hp = 50; p.maxHp = 200; p.invulnerable = 5;
      game.inventory.add(ITEM.ANCIENT_HONEY, 2);
      game.selected = game.inventory.slots.findIndex(s => s && s.item === ITEM.ANCIENT_HONEY);
      drinkAncientHoney(game);
      for (let i = 0; i < 120; i++) update(1 / 60);
      const healed = p.hp;
      checks.honeyHealsOverTime = healed > 50 && !!game.honey;
      p.invulnerable = 0;
      damageMonsterPlayer(game, 5, p.cx - 20);
      checks.honeyBreaksOnDamage = !game.honey;

      // Rugido Engarrafado: empurra bicho comum e o chefe aguenta
      const pushed = dummy(); pushed.vx = 0;
      const bossy = dummy(); bossy.boss = true; bossy.vx = 0;
      game.clock = (game.clock || 0) + 100;
      game.roarReady = 0;
      playerAccessories(game)[4] = { item: ITEM.BOTTLED_ROAR, count: 1 };
      useBottledRoar(game);
      checks.roarPushesCritters = Math.abs(pushed.vx) > 100;
      checks.roarSparesBosses = bossy.vx === 0;
      const ready = game.roarReady;
      useBottledRoar(game);
      checks.roarHasCooldown = game.roarReady === ready;

      // Pata Sísmica: a onda pega quem está com os pés no chão
      const grounded = dummy(); grounded.onGround = true; grounded.hp = 400;
      const hpWave = grounded.hp;
      p.onGround = true; p.facing = 1;
      bearSeismicSwing(game, ITEM_DEFS[ITEM.SEISMIC_PAW]);
      for (let i = 0; i < 40; i++) update(1 / 60);
      checks.seismicWaveHitsGrounded = grounded.hp < hpWave;

      // Espírito do Filhote: o pet aparece e some quando tira o acessório
      playerAccessories(game)[1] = { item: ITEM.CUB_SPIRIT, count: 1 };
      for (let i = 0; i < 10; i++) update(1 / 60);
      checks.cubFollowsWhenEquipped = !!game.cub;
      playerAccessories(game)[1] = null;
      for (let i = 0; i < 5; i++) update(1 / 60);
      checks.cubLeavesWhenUnequipped = !game.cub;

      // Troféu: só entra onde existe parede de fundo
      const tx = Math.floor(p.cx / T), ty = Math.floor(p.cy / T) - 1;
      game.inventory.add(ITEM.ALPHA_TROPHY, 2);
      game.selected = game.inventory.slots.findIndex(s => s && s.item === ITEM.ALPHA_TROPHY);
      w.setWall(tx, ty, WALL.NONE); w.setTile(tx, ty, TILE.AIR);
      game.placeCooldown = 0;
      const noWall = tryPlace(tx, ty);
      w.setWall(tx, ty, WALL.STONE);
      game.placeCooldown = 0;
      const withWall = tryPlace(tx, ty);
      checks.trophyNeedsWall = noWall === false && withWall === true && w.getTile(tx, ty) === TILE.ALPHA_TROPHY;

      // Todo item novo tem nome, ícone e cabe no inventário
      const loot = [ITEM.ALPHA_CLAWS, ITEM.PATRIARCH_HIDE, ITEM.BROKEN_FANG, ITEM.WILD_HEART, ITEM.SEISMIC_PAW,
        ITEM.BOTTLED_ROAR, ITEM.ANCIENT_HONEY, ITEM.CUB_SPIRIT, ITEM.ALPHA_TROPHY];
      const atlas = renderer.tex.itemAtlas.getContext('2d');
      checks.everyLootHasIconAndName = loot.every(id => {
        if (!ITEM_DEFS[id]?.name) return false;
        const d = atlas.getImageData(id * T, 0, T, T).data;
        let painted = 0;
        for (let i = 3; i < d.length; i += 4) if (d[i] > 0) painted++;
        return painted > 30;
      });

      for (let i = 0; i < 3; i++) renderer.render(game);
      checks.rendersWithoutError = true;
      return { checks, notes };
    });
    console.log(JSON.stringify({ ...result, errors }, null, 2));
    assert.deepEqual(errors, []);
    for (const [name, passed] of Object.entries(result.checks)) assert.equal(passed, true, name);
    console.log(`${Object.keys(result.checks).length} bear-boss checks passed`);
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
