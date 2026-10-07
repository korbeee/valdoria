const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
    // Simulação manual: não grava mundos e não depende do relógio do navegador.
    await page.addInitScript(() => { window.requestAnimationFrame = () => 0; });
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://localhost/jogo-teste/');
    await page.waitForFunction(() => typeof game === 'object' && typeof SHARK_DROPS !== 'undefined');
    const result = await page.evaluate(() => {
      finishOpening(game); Menu.root.hidden = true; game.paused = false;
      const checks = {}, oldRecord = Bestiary.recordKill, random = Math.random;
      let kills = 0; Bestiary.recordKill = () => kills++;
      try {
        const w = new World(128, 128, 998, { lazy: true });
        w.tiles.fill(TILE.AIR); w.water.fill(0); w.surface.fill(60); w.biome.fill(BIOME.OCEAN);
        for (let y = 60; y < w.h; y++) for (let x = 0; x < w.w; x++) w.tiles[y * w.w + x] = TILE.STONE;
        for (let y = 50; y < 60; y++) for (let x = 32; x < 64; x++) w.water[y * w.w + x] = WATER_MAX;
        world = game.world = w; game.mobs = []; game.drops = []; game.mount = null;
        game.monsterTimer = game.mobSpawnTimer = game.aquaticTimer = 1e9;
        player.x = 36 * T; player.y = 55 * T; player.hp = 100; player.invulnerable = 0; player.facing = 1;
        player.swimming = true; player.vx = player.vy = 0;
        game.inventory.slots.fill(null); game.inventory.slots[0] = { item: ITEM.TIGER_KNIFE, count: 1 }; game.selected = 0;
        const shark = new Wildlife('shark', player.x + 14, player.y + 10); game.mobs.push(shark);
        shark.hit(999, player.cx); updateMobs(game, 1 / 60);
        checks.deathLeavesBody = shark.dead && shark.carcass && game.mobs.includes(shark) && game.drops.length === 0 && kills === 1;
        const hp = player.hp, y = shark.y;
        for (let i = 0; i < 15; i++) updateMobs(game, 1 / 60);
        checks.bodySinksAndIsHarmless = shark.y > y && player.hp === hp && kills === 1;
        checks.corpseCannotBeHit = mobAt(game, shark.cx, shark.cy) === null;
        shark.hit(10, player.cx); checks.corpseIgnoresDamage = shark.hp === 0;
        checks.cannotCleanInWater = !sharkAction(game, player, 'clean', shark) && !shark.sharkCleaner;
        const oldX = player.x; player.x = 125 * T;
        updateAquaticSpawns(game, 1 / 60); updateMobs(game, 1 / 60);
        checks.bodyPersistsFarAway = game.mobs.includes(shark);
        player.x = oldX;
        input.onKeyDown({ code: 'KeyF', preventDefault() {} }, false);
        checks.FPicksUp = carriedShark(game) === shark;
        const saved = loadGraph(saveGraph({ player, mobs: game.mobs, inventory: game.inventory, selected: 0 }));
        checks.saveKeepsCarriedBody = saved.mobs[0] instanceof Wildlife && carriedShark(saved) === saved.mobs[0] && saved.mobs[0].def === WILDLIFE.shark;
        player.x += 16; updateMobs(game, 1 / 60);
        checks.bodyFollows = Math.abs(shark.cx - (player.cx + 5)) < 0.01;
        input.keys.add('KeyF'); updateShield(game, 1 / 60, true); input.keys.clear();
        checks.carryingCannotRaiseShield = !game.block;
        input.onKeyDown({ code: 'KeyQ', preventDefault() {} }, false);
        checks.QThrowsBodyNotKnife = !shark.sharkCarrier && shark.vx > 0 && shark.vy < 0 && game.inventory.count(ITEM.TIGER_KNIFE) === 1 && !game.drops.length;
        shark.vx = shark.vy = 0;
        player.x = shark.x; player.y = shark.y - 15;
        sharkAction(game, player, 'carry', shark);
        player.x = 80 * T; player.y = 60 * T - player.h - 0.01; player.swimming = false; player.onGround = true;
        updateMobs(game, 1 / 60);
        input.onKeyDown({ code: 'KeyQ', preventDefault() {} }, false);
        for (let i = 0; i < 180; i++) updateMobs(game, 1 / 60);
        checks.thrownBodyLandsOnShore = shark.onGround && !sharkBodyWet(w, shark) && !shark.collides(w, shark.x, shark.y);
        player.x = shark.x - 10; player.y = 60 * T - player.h - 0.01;
        // O corpo precisa sair inteiro da água, mesmo em uma célula rasa na ponta.
        const wetX = Math.floor((shark.x + shark.w - 0.001) / T), wetY = Math.floor((shark.y + shark.h - 0.001) / T);
        w.water[wetY * w.w + wetX] = 1;
        checks.oneWetTipBlocksCleaning = sharkBodyWet(w, shark) && !sharkAction(game, player, 'clean', shark); input.mouse.right = true;
        w.water[wetY * w.w + wetX] = 0;
        game.inventory.slots[0] = { item: ITEM.WOOD_AXE, count: 1 };
        checks.wrongToolRejected = !sharkAction(game, player, 'clean', shark); input.mouse.right = true;
        game.inventory.slots[0] = { item: ITEM.TIGER_KNIFE, count: 1 };
        checks.cleaningStarts = sharkAction(game, player, 'clean', shark); input.mouse.right = true;
        updateMobs(game, 0.4); player.x += 8; updateMobs(game, 1 / 60);
        checks.movingCancelsWithoutLoot = !shark.sharkCleaner && !game.drops.length && !shark.despawn;
        player.x -= 8; sharkAction(game, player, 'clean', shark); input.mouse.right = true;
        game.selected = 1; updateMobs(game, 1 / 60);
        checks.swappingToolCancels = !shark.sharkCleaner && !game.drops.length;
        game.selected = 0; sharkAction(game, player, 'clean', shark); input.mouse.right = true;
        player.hp -= 1; updateMobs(game, 1 / 60);
        checks.damageCancels = !shark.sharkCleaner && !game.drops.length;
        game.cam.x = player.x - 100; game.cam.y = player.y - 100; game.zoom = 2;
        input.mouse.x = shark.cx * game.zoom - Math.round(game.cam.x * game.zoom);
        input.mouse.y = shark.cy * game.zoom - Math.round(game.cam.y * game.zoom);
        game.rightWasDown = false; input.mouse.right = true;
        handleInteraction(1 / 60);   // o botão continua apertado: limpar é segurar
        checks.rightClickWithKnifeStarts = cleaningShark(game) === shark && !game.sword.active;
        updateMobs(game, 0.8);
        checks.noPrematureLoot = !game.drops.length && !shark.despawn;
        input.mouse.right = false; updateMobs(game, 1 / 60);
        checks.releasingTheButtonStopsCleaning = !shark.sharkCleaner && shark.sharkCleanTime === 0 && !game.drops.length;
        game.rightWasDown = false; input.mouse.right = true; handleInteraction(1 / 60);
        checks.holdingAgainRestartsFromZero = cleaningShark(game) === shark;
        // Prancha com o desenho real do jogador, corpo, faca e itens.
        const sheet = makeCanvas(960, 340), c = sheet.getContext('2d'); c.imageSmoothingEnabled = false;
        c.fillStyle = '#15374a'; c.fillRect(0, 0, 960, 340);
        const panel = (label, x, render) => {
          c.fillStyle = '#ead8ad'; c.font = '16px sans-serif'; c.textAlign = 'center'; c.fillText(label, x + 160, 32);
          c.save(); c.translate(x + 160, 220); c.scale(3, 3); render(); c.restore();
        };
        panel('Corpo na água', 0, () => drawSharkCarcass(c, { cx: 0, cy: -20, facing: 1 }));
        panel('No colo', 320, () => {
          const cp = Object.assign(Object.create(Player.prototype), player, { x: -7, y: -42, facing: 1, swimTilt: 0, onGround: true });
          const body = Object.assign(Object.create(Wildlife.prototype), shark, { sharkCleaner: null, sharkCarrier: 'local' });
          Object.assign(body, sharkCarryPosition(cp, body));
          const view = { ...game, player: cp, mobs: [body] };
          const oldCtx = renderer.ctx; renderer.ctx = c;
          try { renderer.drawPlayer(cp, null, game.sword, view); drawSharkHandling(c, view); } finally { renderer.ctx = oldCtx; }
        });
        panel('Limpando com a faca', 640, () => {
          const cp = Object.assign(Object.create(Player.prototype), player, { x: -17, y: -42, facing: 1, swimTilt: 0, onGround: true });
          const body = Object.assign(Object.create(Wildlife.prototype), shark, { x: -6, y: -14, sharkCleaner: 'local' });
          const view = { ...game, player: cp, mobs: [body] }, oldCtx = renderer.ctx; renderer.ctx = c;
          try { drawSharkCarcass(c, body); renderer.drawPlayer(cp, null, game.sword, view); drawSharkHandling(c, view); } finally { renderer.ctx = oldCtx; }
        });
        [ITEM.SHARK_FIN, ITEM.SHARK_TOOTH].forEach((id, i) => c.drawImage(renderer.tex.itemAtlas, id * T, 0, T, T, 405 + i * 85, 272, 48, 48));
        checks.art = sheet.toDataURL();
        Math.random = () => 0;
        for (let i = 0; i < 180; i++) updateMobs(game, 1 / 60);
        checks.onlyFinAndToothAfterCleaning = game.drops.length === 2 && game.drops.some(d => d.item === ITEM.SHARK_FIN && d.count === 1) && game.drops.some(d => d.item === ITEM.SHARK_TOOTH && d.count === 1);
        checks.bodyRemovedOnlyAfterCleaning = shark.sharkHarvested && !game.mobs.includes(shark);
        const n = game.drops.length;
        killMob(game, shark); sharkAction(game, player, 'clean', shark); input.mouse.right = true;
        checks.cannotLootTwice = game.drops.length === n && kills === 1;
        const finished = loadGraph(saveGraph({ mobs: game.mobs, drops: game.drops }));
        checks.saveAfterCleaningHasNoCorpse = !finished.mobs.length && finished.drops.length === 2;
        // Sorteios na fronteira verificam as chances e a possibilidade de não render peças.
        const outcomes = [];
        for (const value of [0.249, 0.25, 0.499, 0.5, 0.999]) {
          const m = new Wildlife('shark', player.x + 15, 60 * T - 14 - 0.01);
          makeSharkCarcass(game, m); m.onGround = true; game.mobs = [m]; game.drops = [];
          sharkAction(game, player, 'clean', m); input.mouse.right = true; Math.random = () => value;
          for (let i = 0; i < 150; i++) updateMobs(game, 1 / 60);
          outcomes.push(game.drops.map(d => d.item).sort((a, b) => a - b));
        }
        checks.exactChanceBoundaries = JSON.stringify(outcomes) === JSON.stringify([[ITEM.SHARK_FIN, ITEM.SHARK_TOOTH], [ITEM.SHARK_FIN], [ITEM.SHARK_FIN], [], []]);
        const toothOnly = new Wildlife('shark', player.x + 15, 60 * T - 14 - 0.01);
        makeSharkCarcass(game, toothOnly); toothOnly.onGround = true; game.mobs = [toothOnly]; game.drops = [];
        sharkAction(game, player, 'clean', toothOnly); input.mouse.right = true;
        const rolls = [0.6, 0.1]; Math.random = () => rolls.shift() ?? 0.99;
        for (let i = 0; i < 150; i++) updateMobs(game, 1 / 60);
        checks.toothRollIsIndependent = game.drops.length === 1 && game.drops[0].item === ITEM.SHARK_TOOTH;
        checks.materialsHaveIcons = [ITEM.SHARK_FIN, ITEM.SHARK_TOOTH].every(id => ITEM_ART[id].pixels.length === 16 && ITEM_ART[id].pixels.every(row => row.length === 16));
        const guide = guideBuildIndex();
        checks.guideDescribesCleaning = guide.byId.get(ITEM.SHARK_FIN).sources.some(s => s.text.includes('50%') && s.text.includes('limpe')) && !guide.byId.get(ITEM.RAW_FISH).sources.some(s => s.title === 'Tubarão');
        // Outros peixes continuam dando o saque imediatamente.
        Math.random = () => 0;
        const fish = new Wildlife('sardine', player.x, player.y); game.mobs = [fish]; game.drops = [];
        fish.hit(999, player.cx); updateMobs(game, 1 / 60);
        checks.otherAnimalsUnchanged = !game.mobs.includes(fish) && game.drops.some(d => d.item === fish.def.drop);
        const loose = new Wildlife('shark', player.x + 15, player.y); makeSharkCarcass(game, loose); game.mobs = [loose];
        sharkAction(game, player, 'carry', loose); const carriedX = loose.x;
        game.respawnPending = { message: 'Teste' }; game.spawnPoint = { x: 20 * T, y: 60 * T - player.h - 0.01 };
        respawnPlayer(game);
        checks.deathDropsBodyBeforeRespawning = !loose.sharkCarrier && Math.abs(loose.x - carriedX) < 33 && game.mobs.includes(loose);
        // Sem conexão real: valida exclusividade entre jogadores e espelho do corpo.
        const m = new Wildlife('shark', player.x + 15, player.y); makeSharkCarcass(game, m); game.mobs = [m];
        const room = NET.room, host = NET.isHost, cid = NET.cid; NET.room = 'test'; NET.isHost = true; NET.cid = 1;
        try {
          const p2 = new NetPeer(2, 'Teste'); Object.assign(p2, { x: player.x, y: player.y, seen: true, item: ITEM.TIGER_KNIFE }); NET.peers.set(2, p2);
          checks.networkCorpseVisible = !!netMirrorable(m) && netMobView(m).v.carcass;
          sharkAction(game, player, 'carry', m);
          checks.twoPlayersCannotCarrySameBody = !sharkAction(game, p2, 'carry', m) && !sharkAction(game, p2, 'throw', m);
          NET.peers.delete(2);
        } finally { NET.room = room; NET.isHost = host; NET.cid = cid; }
        return checks;
      } finally { Bestiary.recordKill = oldRecord; Math.random = random; }
    });
    fs.writeFileSync('tests/shark-harvest.png', Buffer.from(result.art.split(',')[1], 'base64')); delete result.art;
    console.log(result);
    for (const [name, value] of Object.entries(result)) assert.equal(value, true, name);
    assert.deepEqual(errors, [], 'Erros de execução no navegador');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
