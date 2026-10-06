// Coração da Ilha (js/core-*.js): geração da faixa, perigos, criaturas, o Núcleo e o farol.
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs = require('fs');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const seed = +(process.argv[2] || 4242), size = process.argv[3] || 'pequeno';
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } }), errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('http://localhost/jogo-teste/');
    await page.waitForFunction(() => typeof game === 'object' && typeof newWorld === 'function');
    const result = await page.evaluate(async ([seed, size]) => {
      const log = [];
      const check = (ok, msg) => { if (!ok) throw Error(msg); log.push('✓ ' + msg); };
      await newWorld(size, () => {}, seed);
      finishOpening(game); Menu.root.hidden = true;
      const w = world, h = w.coreHeart;
      // ---------- geração ----------
      check(w.coreTop && w.coreTop.length === w.w, 'a faixa do Coração cobre o mapa de ponta a ponta');
      let air = 0, cells = 0, wet = 0, badLava = 0;
      for (let x = 3; x < w.w - 1; x += 3) for (let y = w.coreTop[x]; y < w.h - 4; y++) {
        const i = y * w.w + x, t = w.tiles[i]; cells++;
        if (t === TILE.AIR) air++;
        if (w.water[i]) wet++;
        if (t === TILE.LAVA && (w.tiles[i - 1] === TILE.AIR || w.tiles[i + 1] === TILE.AIR || w.tiles[i + w.w] === TILE.AIR)) badLava++;
      }
      const share = air / cells;
      check(share > 0.25 && share < 0.6, `salões na medida (${Math.round(share * 100)}% de ar)`);
      check(wet === 0, 'nenhuma água parada na faixa');
      if (badLava) { const ex = []; for (let x = 1; x < w.w - 1 && ex.length < 6; x++) for (let y = w.coreTop[x]; y < w.h - 4; y++) { const i = y * w.w + x; if (w.tiles[i] === TILE.LAVA && (w.tiles[i - 1] === TILE.AIR || w.tiles[i + 1] === TILE.AIR || w.tiles[i + w.w] === TILE.AIR)) { ex.push([x, y, w.h - y, w.tiles[i-1], w.tiles[i+1], w.tiles[i+w.w]]); break; } } log.push(JSON.stringify(ex)); }
      check(badLava === 0, 'lava sempre em lago fechado (sem parede de lava no ar)' + (badLava ? ' ' + log[log.length - 1] : ''));
      check(new Set(w.coreSegments.map((s) => s.zone)).size === 4, 'os quatro trechos aparecem');
      check((w.coreMagnets || []).length > 4 && (w.coreHalls || []).length > 0, 'rochas de magnetita e salões dos Vigias');
      check(h && w.getTile(h.cx, h.cy - 2) === TILE.AIR && w.getTile(h.cx, h.floor) === TILE.VIGIA_BRICK, 'Câmara do Coração aberta, com piso');
      // caminho: do portal do poço principal até dentro da câmara, só por blocos não sólidos
      const main = w.coreShafts.find((s) => s.main);
      const start = (main.yTop - 1) * w.w + main.x, goal = (i) => { const x = i % w.w, y = (i / w.w) | 0; return ((x - h.cx) / h.A) ** 2 + ((y - h.cy) / h.B) ** 2 < 0.5; };
      const seen = new Set([start]), q = [start]; let found = false;
      while (q.length && !found) {
        const i = q.shift();
        if (goal(i)) { found = true; break; }
        for (const j of [i - 1, i + 1, i - w.w, i + w.w]) if (!seen.has(j) && !SOLID[w.tiles[j]] && w.tiles[j] !== TILE.LAVA) { seen.add(j); q.push(j); }
      }
      check(found, 'do Portal dos Vigias dá para descer até a câmara');
      // ---------- luz ----------
      const p = game.player;
      p.x = h.cx * T; p.y = (h.floor - 3) * T;
      w.computeLight(h.cx, h.floor - 5);
      check(Math.max(...w.environmentLight.map((c) => c[(h.floor - 6 - w.ly) * LIGHT_W + (h.cx - w.lx)])) >= 6, 'o ar do Coração tem luz própria');
      // ---------- perigos ----------
      game.paused = false; game.time = 0.3;
      const lavaX = h.cx + 26;
      p.x = lavaX * T; p.y = h.floor * T - p.h + 6; p.vx = p.vy = 0; p.hp = p.maxHp = 100; p.invulnerable = 0;
      for (let i = 0; i < 40; i++) update(1 / 60);
      check(p.hp < 100, `a lava queima (vida ${p.hp})`);
      p.hp = 100; game.outfit = ITEM.OBSIDIAN_SUIT;
      check(coreSuit(game), 'traje de obsidiana protege do calor');
      game.outfit = null;
      // água + lava = obsidiana
      w.water[(h.floor - 1) * w.w + lavaX] = WATER_MAX;
      coreScan.t = 0; p.x = (h.cx) * T; p.y = (h.floor - 3) * T;
      scanCore(game);
      check(w.getTile(lavaX, h.floor) === TILE.OBSIDIAN, 'água encostando na lava vira obsidiana');
      // gêiser: no meio da descarga arremessa quem está em cima
      const vx = h.cx + 4, vy = h.floor;
      w.setTile(vx, vy, TILE.STEAM_VENT);
      p.x = vx * T + 1; p.y = vy * T - p.h - 0.01; p.vy = 0;
      const ph = hash2(vx, vy, 77) * CORE_LIFE.ventCycle, now = performance.now() / 1000;
      const target = CORE_LIFE.ventWarn + 0.3, shift = ((target - (now + ph)) % CORE_LIFE.ventCycle + CORE_LIFE.ventCycle) % CORE_LIFE.ventCycle;
      const realNow = performance.now; performance.now = () => realNow.call(performance) + shift * 1000;
      coreScan.t = 0; updateCore(game, 1 / 60);
      performance.now = realNow;
      check(p.vy <= -CORE_LIFE.ventLaunch * 0.9, 'o gêiser arremessa o jogador');
      w.setTile(vx, vy, TILE.VIGIA_BRICK);
      // magnetita puxa quem segura ferro (no trecho magnético)
      const mag = w.coreMagnets.find((mm) => w.coreZone[mm.x] === CORE_ZONE.MAGNETICO);
      game.inventory.slots[0] = { item: ITEM.METAL_PICKAXE, count: 1 }; game.selected = 0;
      const side = w.coreZone[mag.x + 5] === CORE_ZONE.MAGNETICO ? 1 : -1;   // fica do lado que ainda é trecho magnético
      for (let cy = mag.y - 3; cy <= mag.y + 5; cy++) for (let k = 1; k <= 7; k++) if (w.getTile(mag.x + side * k, cy) !== TILE.BEDROCK) w.setTile(mag.x + side * k, cy, cy === mag.y + 5 ? TILE.VIGIA_BRICK : TILE.AIR);   // espaço livre até o ímã (o relevo muda conforme a semente)
      p.x = (mag.x + side * 5) * T; p.y = (mag.y + 1) * T; p.vy = 0;
      const x0 = p.x; coreScan.t = 0;
      for (let i = 0; i < 20; i++) updateCore(game, 1 / 60);
      check((p.x - x0) * side < 0, 'a magnetita puxa a picareta de ferro');
      // ---------- criaturas ----------
      const sa = new Wildlife('salamandra', (lavaX + 1) * T, (h.floor) * T - 10);
      const se = new Wildlife('sentinela', (h.cx + 8) * T, (h.floor) * T - 34.01);
      game.mobs.push(sa, se);
      for (let i = 0; i < 30; i++) { sa.update(1 / 60, w, p); se.update(1 / 60, w, p); }
      check(!sa.dead && wildlifeSprite('salamandra', SHAPE_HOOKS.salamandra.frame(sa)).normal.width > 0, 'salamandra vive na lava e tem sprite');
      const hp0 = se.hp; se.facing = 1; SHAPE_HOOKS.sentinela.hit(se, 10, se.cx + 20);
      const front = hp0 - se.hp; se.facing = 1; SHAPE_HOOKS.sentinela.hit(se, 10, se.cx - 20);
      check(front === 5 && hp0 - se.hp === 15, 'sentinela: frente blindada, costas não');
      game.mobs = game.mobs.filter((m) => m !== sa && m !== se);
      // ---------- o Núcleo ----------
      game.mobs = game.mobs.filter((m) => m.kind !== 'nucleo');
      updateCore(game, 1 / 60);
      const m = game.mobs.find((o) => o.kind === 'nucleo');
      check(m && m.state === 'sleep', 'o Núcleo dorme na câmara');
      game.adminGod = true;
      p.x = (h.cx - 10) * T; p.y = (h.floor - 3) * T;
      for (let i = 0; i < 10; i++) update(1 / 60);
      check(game.boss === m && h.gate.every(([x, y]) => w.getTile(x, y) === TILE.CORE_WALL), 'entrar lacra o teto e acorda o Núcleo');
      for (let i = 0; i < 60 * 3; i++) update(1 / 60);
      check(m.state === 'fight', 'luta começou');
      const closed = m.hp; m.open = 0; SHAPE_HOOKS.nucleo.hit(m, 40, m.cx);
      check(closed - m.hp === 10, 'fechado, só 25% do golpe entra');
      // força um pulso e espera abrir
      m.pulseCd = 0; m.shardCd = 99; m.rainCd = 99;
      let opened = false;
      for (let i = 0; i < 60 * 6 && !opened; i++) { update(1 / 60); opened = m.open > 0.6; }
      check(opened, 'depois do pulso as placas abrem');
      const before = m.hp; SHAPE_HOOKS.nucleo.hit(m, 40, m.cx);
      check(before - m.hp === 80, 'aberto, o golpe entra dobrado');
      // estilhaços e chuva de magma saem
      m.attack = null; m.shardCd = 0; m.rainCd = 0;
      for (let i = 0; i < 60; i++) update(1 / 60);
      check((game.nucleoShots?.length || 0) + (game.nucleoRain?.length || 0) > 0 || m.shards.some((s) => !s.alive), 'estilhaços e chuva de magma');
      // fase 2
      m.hp = Math.floor(m.def.hp * 0.4);
      for (let i = 0; i < 5; i++) update(1 / 60);
      check(m.phase === 2 && game.mobs.filter((o) => o.nucleoGuard).length === 2, 'abaixo de 45%: acelera e chama dois sentinelas');
      // derrota
      const s = storyState(game);
      s.step = 'beacon';
      useBeacon(game);
      check(s.step === 'interference', 'com o Núcleo vivo o farol só pega chiado');
      for (let i = 0; i < 60 * 27; i++) updateStory(game, 1 / 60);
      check(s.step === 'core' && /Poço dos Vigias/.test(game.objective), 'a piloto manda descer ao Coração');
      m.open = 1; m.hp = 5; SHAPE_HOOKS.nucleo.hit(m, 40, m.cx);
      check(m.state === 'dying', 'Núcleo se apagando');
      const dropsBefore = game.drops.length;
      for (let i = 0; i < 60 * 4; i++) update(1 / 60);
      check(!game.mobs.includes(m), 'Núcleo derrotado');
      check(s.coreCalmed && s.step === 'beacon', 'o farol volta a funcionar');
      check(h.gate.every(([x, y]) => w.getTile(x, y) !== TILE.CORE_WALL), 'o teto da câmara reabre');
      check(game.drops.slice(dropsBefore).some((d) => d.item === ITEM.VIGIA_HEART), 'espólio: Coração dos Vigias');
      useBeacon(game);
      check(s.step === 'calling', 'agora o rádio chama o resgate');
      updateCore(game, 1 / 60);
      check(!game.mobs.some((o) => o.kind === 'nucleo'), 'o Núcleo não volta a nascer');
      // ícones e receitas
      for (const id of [ITEM.OBSIDIAN_SUIT, ITEM.MAGNET_BLADE]) check(RECIPES.some((r) => r.resultado.item === id), 'receita: ' + ITEM_DEFS[id].name);
      return log;
    }, [seed, size]);
    if (errors.length) throw Error(errors.join('\n'));
    console.log(result.join('\n'));
    console.log('core ok');
  } finally { await browser.close(); }
})().catch((e) => { console.error(e); process.exit(1); });
