// Ruínas tomadas pelo mato e tribos (js/ruin-tiles.js, js/ruins.js):
// plantas válidas, geração no mundo, moradores da tribo e a ronda dos guardas canibais.
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } }), errors = [], warnings = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'warning' && m.text().includes('Planta')) warnings.push(m.text()); });
    await page.goto('http://localhost/jogo-teste/');
    await page.waitForFunction(() => typeof game === 'object' && typeof newWorld === 'function');
    const result = await page.evaluate(async () => {
      const check = (ok, msg) => { if (!ok) throw Error(msg); };
      // Blocos novos: textura, item, receita e colisão
      for (const key of ['CONCRETE', 'THATCH', 'THATCH_LEFT', 'THATCH_RIGHT', 'PALISADE', 'PALISADE_TIP', 'TOTEM', 'HIDE', 'SKULL_STAKE']) {
        const t = TILE[key], it = ITEM[key];
        check(MATERIAL_TEX[t] && TILE_DEFS[t].drop === it && ITEM_DEFS[it].place === t, 'Bloco incompleto: ' + key);
        check(RECIPES.some((r) => r.resultado.item === it), 'Sem receita: ' + key);
        check(SOLID[t] === +TILE_DEFS[t].solid, 'Colisão errada: ' + key);
      }
      check(WALL_SOURCE[WALL.CONCRETE] === TILE.CONCRETE && ITEM_DEFS[ITEM.WALL_CONCRETE].parede === WALL.CONCRETE, 'Parede de concreto');

      await newWorld('pequeno', () => {}, 4242);
      finishOpening(game); Menu.root.hidden = true;
      const w = world, kinds = new Set((w.ruinSites || []).map((s) => s.kind));
      for (const k of ['casa', 'predio', 'torre']) check(kinds.has(k), 'Faltou ruína: ' + k);
      check(w.tribeCamps.length >= 1, 'Sem acampamento canibal');
      // Superfície mais vazia (antes eram ~25 construções no mapa pequeno) e mais coisa nas cavernas
      check(w.ruinSites.length <= 8 && w.tribeCamps.length <= 2, `Superfície lotada: ${w.ruinSites.length} ruínas, ${w.tribeCamps.length} acampamentos`);
      const caveKinds = {};
      for (const s of w.caveSites) caveKinds[s.kind] = (caveKinds[s.kind] || 0) + 1;
      for (const k of ['ponte', 'andaime', 'bunker', 'cripta']) check(caveKinds[k] >= 1, 'Faltou na caverna: ' + k);
      for (const s of w.caveSites) check(s.y > w.surface[s.x] + 15, 'Estrutura de caverna perto da superfície: ' + s.kind);
      const tribal = w.npcSpawns.filter((s) => s.tribal);
      check(tribal.length >= 3, 'Poucos moradores da tribo');
      check(game.npcs.some((v) => v.tribal) && game.npcs.find((v) => v.tribal).look.top === 2, 'Morador da tribo sem visual');
      check(!pilotOf(game) || !pilotOf(game).tribal, 'A piloto virou da tribo');
      check(w.lootChests.some((c) => c.slots.some((s) => s && s.item === ITEM.SCRAP || s && s.item === ITEM.WIRE)), 'Baú de ruína sem sucata');
      // nada de concreto ou paliçada fora do lugar: cada acampamento tem as duas paliçadas
      for (const c of w.tribeCamps) check(w.getTile(c.x0, c.floor - 5) === TILE.PALISADE && w.getTile(c.x1, c.floor - 1) === TILE.HIDE, 'Paliçada incompleta');

      // Guardas: de dia, perto do acampamento, nascem rondando sem ver o jogador
      const camp = w.tribeCamps[0], p = game.player;
      game.time = 0.3; game.daylight = daylightAt(0.3); game.paused = false; game.adminGod = true;
      p.x = (camp.x0 - 45) * T; p.y = (w.surface[camp.x0 - 45] * T) - p.h - 0.01; p.vx = p.vy = 0;
      for (let i = 0; i < 60 * 3; i++) update(1 / 60);
      let guards = game.mobs.filter((m) => m.campGuard === camp);
      check(guards.length === camp.max, `Guardas: ${guards.length}/${camp.max}`);
      check(guards.every((m) => m.aware === false), 'Guarda já nasceu caçando');
      for (let i = 0; i < 60 * 5; i++) update(1 / 60);
      guards = game.mobs.filter((m) => m.campGuard === camp);
      check(guards.length === camp.max, 'Guardas sumiram de dia');
      check(guards.every((m) => m.cx > (camp.x0 - 2) * T && m.cx < (camp.x1 + 2) * T), 'Guarda saiu do acampamento na ronda');
      // Chegando perto, o guarda acorda e vem atrás
      const g0 = guards[0];
      p.x = g0.x + 6 * T; p.y = g0.y + g0.h - p.h; p.vx = p.vy = 0;
      for (let i = 0; i < 30; i++) update(1 / 60);
      check(g0.aware === true, 'Guarda não viu o jogador colado nele');
      // Mortos voltam aos poucos (nunca todos na hora)
      for (const m of guards) m.dead = true;
      game.mobs = game.mobs.filter((m) => !m.dead);
      for (let i = 0; i < 60; i++) update(1 / 60);
      check(game.mobs.filter((m) => m.campGuard === camp).length <= 1, 'Guardas voltaram todos de uma vez');
      // fala da tribo
      const v = game.npcs.find((n) => n.tribal);
      p.x = v.x; p.y = v.y; game.paused = true;
      tryTalkNpc(game, v.cx, v.cy);
      check(TRIBE_LINES.some((l) => NpcServices.line.startsWith(l)), 'Morador da tribo com fala de vila');
      NpcServices.close();
      return { camps: w.tribeCamps.length, sites: w.ruinSites.length, tribal: tribal.length, max: camp.max };
    });
    if (warnings.length) throw Error(warnings.join('\n'));
    if (errors.length) throw Error(errors.join('\n'));
    console.log('ruins ok', result);
  } finally { await browser.close(); }
})().catch((e) => { console.error(e); process.exit(1); });
