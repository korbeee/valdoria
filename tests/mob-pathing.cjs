// Monstros hostis contornam paredes (js/mob-pathing.js).
// Arena: parede alta entre o bicho e o jogador; o único caminho é um túnel que começa ATRÁS do bicho.
// node tests/mob-pathing.cjs  (PLAYWRIGHT_PATH apontando para o playwright)
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://localhost/jogo-teste/?nocache=' + Date.now());
  await page.waitForFunction(() => typeof game === 'object' && typeof newWorld === 'function');
  const out = await page.evaluate(async () => {
    const log = [];
    const check = (ok, msg) => { log.push((ok ? '✓ ' : '✗ ') + msg); };
    await newWorld('pequeno', () => {}, 777);
    finishOpening(game); Menu.root.hidden = true; game.paused = false; game.adminGod = true;
    canvas.width = 1280; canvas.height = 800; window.toast = () => {};
    const w = world, p = game.player, x0 = Math.floor(w.w / 2) - 20, F = Math.max(...Array.from({ length: 60 }, (_, i) => w.surface[x0 - 10 + i])) + 6;
    const build = () => {
      for (let x = x0 - 12; x <= x0 + 52; x++) {
        for (let y = F - 40; y < F; y++) { w.setTile(x, y, TILE.AIR); w.walls[y * w.w + x] = 0; }
        for (let y = F; y <= F + 10; y++) w.setTile(x, y, TILE.STONE);
      }
      for (let y = F - 40; y < F; y++) { w.setTile(x0 - 12, y, TILE.STONE); w.setTile(x0 + 52, y, TILE.STONE); }
      for (let y = F - 14; y < F; y++) w.setTile(x0 + 20, y, TILE.STONE);               // paredão de 14 blocos
      for (let x = x0 + 6; x <= x0 + 34; x++) for (let y = F + 1; y <= F + 3; y++) w.setTile(x, y, TILE.AIR); // túnel
      for (let x = x0 + 6; x <= x0 + 8; x++) w.setTile(x, F, TILE.AIR);                 // entrada (atrás do bicho)
      for (let x = x0 + 31; x <= x0 + 33; x++) w.setTile(x, F, TILE.AIR);               // saída
      w.setTile(x0 + 33, F + 2, TILE.STONE); w.setTile(x0 + 33, F + 3, TILE.STONE);    // degrau para sair
      for (let x = x0 - 12; x <= x0 + 52; x++) w.computeSkyTop?.(x);
    };
    const run = (make, secs, pathOn) => {
      build();
      MOB_PATH.alcance = pathOn ? 34 : 0;
      game.time = 0.0; game.monsterTimer = 1e9; game.mobs = [];
      p.x = (x0 + 36) * T; p.y = F * T - p.h - 0.01; p.vx = p.vy = 0;
      const m = make(); game.mobs.push(m);
      let best = Infinity;
      for (let i = 0; i < secs * 60; i++) {
        p.x = (x0 + 36) * T; p.y = F * T - p.h - 0.01; p.vx = p.vy = 0; p.hp = 100;
        game.cam.x = p.cx - 640; game.cam.y = p.cy - 400; game.monsterTimer = 1e9;
        update(1 / 60);
        if (!game.mobs.includes(m)) game.mobs.push(m);
        best = Math.min(best, Math.hypot(m.cx - p.cx, m.cy - p.cy));
        if (best < 1.5 * T || (m.kind === "bomber" && m.fuse > 0)) return { best: Math.min(best, 1), t: i / 60 };
      }
      return { best, t: secs };
    };
    const ground = (kind) => () => { const m = WILDLIFE[kind] ? new Wildlife(kind, (x0 + 17) * T, 0) : new Monster(kind, (x0 + 17) * T, 0); m.y = F * T - m.h - 0.01; if (m.def.shape === 'wolf') m.aware = true; return m; };
    for (const [kind, label] of [['undead', 'canibal'], ['slime', 'slime'], ['bomber', 'dinamiteiro (acende o pavio do lado do jogador)'], ['wolf', 'lobo'], ['hyena', 'hiena']]) {
      const old = run(ground(kind), 12, false), now = run(ground(kind), 30, true);
      check(old.best > 4 * T, label + ' sem caminho: empaca na parede (chegou a ' + (old.best / T).toFixed(1) + ' blocos)');
      check(now.best < 1.5 * T, label + ' com caminho: volta, entra no túnel e chega no jogador (' + now.t.toFixed(1) + ' s)');
      if (kind === 'bomber') game.mobs.forEach((m) => { m.fuse = 0; });
    }
    // morcego: paredão até o teto da arena, com uma janela lá em cima atrás dele
    const bat = () => { const m = new Monster('bat', (x0 + 17) * T, (F - 4) * T); return m; };
    const buildBat = build;
    const runBat = (on) => { const r = run(() => { for (let y = F - 40; y < F - 14; y++) w.setTile(x0 + 20, y, TILE.STONE); for (let x = x0 - 12; x <= x0 + 52; x++) w.setTile(x, F - 41, TILE.STONE); w.setTile(x0 + 20, F - 30, TILE.AIR); w.setTile(x0 + 20, F - 29, TILE.AIR); return bat(); }, on ? 30 : 12, on); return r; };
    const ob = runBat(false), nb = runBat(true);
    check(ob.best > 4 * T, 'morcego sem caminho: fica batendo na parede (' + (ob.best / T).toFixed(1) + ' blocos)');
    check(nb.best < 1.5 * T, 'morcego com caminho: sobe, passa pela janela e chega (' + nb.t.toFixed(1) + ' s)');
    MOB_PATH.alcance = 34;
    // custo: uma busca completa
    build(); const m = ground('undead')(); const t0 = performance.now();
    for (let i = 0; i < 50; i++) { m.path = null; m.pathState = { t: 0 }; mobWaypoint(m, w, p, 1 / 60, false); }
    const ms = (performance.now() - t0) / 50;
    check(ms < 3, 'uma busca de caminho custa ' + ms.toFixed(2) + ' ms');
    return log;
  }).catch((e) => [String(e.stack || e)]);
  console.log(out.join('\n'));
  console.log(errors.length ? 'ERROS: ' + errors.slice(0, 5).join(' | ') : 'sem erros no console');
  await browser.close();
  if (errors.length || out.some((l) => !l.startsWith('✓'))) process.exit(1);
})();
