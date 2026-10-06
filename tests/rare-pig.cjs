// Porco normal, porco quadrado (skin rara, bestiário, drop da picareta de diamante).
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://localhost/jogo-teste/?nocache=' + Date.now());
  await page.waitForFunction(() => typeof game === 'object' && typeof ITEM.DIAMOND_PICK === 'number');
  const out = await page.evaluate(async () => {
    const log = [], check = (ok, msg) => log.push((ok ? '✓ ' : '✗ ') + msg);
    await newWorld('pequeno', () => {}, 4242);
    finishOpening(game); Menu.root.hidden = true; game.paused = false; GAME_OPTIONS.help = false; applyOptions(game); window.toast = () => {};
    const d = ITEM_DEFS[ITEM.DIAMOND_PICK], iron = ITEM_DEFS[ITEM.METAL_PICKAXE];
    check(d.ferramenta === 'picareta' && d.forca > iron.forca && d.golpe < iron.golpe && d.alcanceFerramenta > iron.alcanceFerramenta, 'picareta de diamante é melhor que a de ferro');
    check(d.descricao.startsWith('Seus antigos donos'), 'descrição pedida');
    check(CUBE_PIG_CHANCE === 0.005, "chance natural de 0,5%");
    const p = game.player, pig = new Pig(p.x + 40, p.y); pig.skin = 1; game.mobs.push(pig);
    const before = game.items?.length ?? 0;
    killMob(game, pig);
    const dropped = (game.items || game.drops || game.itemDrops || []).filter?.((i) => i.item === ITEM.DIAMOND_PICK).length;
    check(dropped >= 1, 'porco quadrado solta a picareta (' + dropped + ')');
    const normal = new Pig(p.x + 60, p.y); const n0 = (game.items || game.drops || game.itemDrops || []).filter((i) => i.item === ITEM.DIAMOND_PICK).length; killMob(game, normal);
    check((game.items || game.drops || game.itemDrops || []).filter((i) => i.item === ITEM.DIAMOND_PICK).length === n0, 'porco normal não solta');
    check(Bestiary.kindOf(pig) === 'cubepig', 'bestiário reconhece a skin');
    // afortunada
    game.inventory.slots[0] = { item: ITEM.DIAMOND_PICK, count: 1 }; game.selected = 0; game.inventory.slots.forEach((s, i) => { if (i > 0) game.inventory.slots[i] = null; });
    const counts = new Set(); for (let i = 0; i < 400; i++) { const before = game.inventory.count(ITEM.COAL); giveDrop(TILE.COAL_ORE); counts.add(game.inventory.count(ITEM.COAL) - before); }
    check([...counts].every((c) => c >= 1 && c <= 5) && counts.has(1) && counts.has(5), "carvão com afortunada: de 1 a 5 (" + [...counts].sort().join(",") + ")");
    const ironSet = new Set(); for (let i = 0; i < 300; i++) { const b = game.inventory.count(ITEM.IRON); giveDrop(TILE.IRON_ORE); ironSet.add(game.inventory.count(ITEM.IRON) - b); }
    check([...ironSet].every((c) => c >= 1 && c <= 5) && ironSet.has(5), "ferro também de 1 a 5 (" + [...ironSet].sort().join(",") + ")");
    game.inventory.slots[0] = { item: ITEM.METAL_PICKAXE, count: 1 }; const b0 = game.inventory.count(ITEM.COAL); giveDrop(TILE.COAL_ORE); check(game.inventory.count(ITEM.COAL) - b0 === 1, "picareta comum: 1 carvão");
    return log;
  }).catch((e) => [String(e.stack || e)]);
  console.log(out.join('\n')); console.log(errors.length ? 'ERROS: ' + errors.join(' | ') : 'sem erros no console');
  await browser.close();
  if (errors.length || out.some((l) => !l.startsWith('✓'))) process.exit(1);
})();
