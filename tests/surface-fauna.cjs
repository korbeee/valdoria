// Biomas novos, vegetação quebrável, achados do chão (botão direito) e fauna nova: node tests/surface-fauna.cjs [semente] [tamanho]
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const seed = +(process.argv[2] || 4242), size = process.argv[3] || 'pequeno';
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } }), errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.addInitScript(() => { localStorage.setItem('valdoria.autoconnect', '0'); });
    await page.goto('http://localhost/jogo-teste/');
    await page.waitForFunction(() => { try { return typeof game === 'object' && typeof newWorld === 'function'; } catch { return false; } });
    const log = await page.evaluate(async ([seed, size]) => {
      const log = [], check = (ok, msg) => { if (!ok) throw Error(msg); log.push('✓ ' + msg); };
      await newWorld(size, () => {}, seed);
      finishOpening(game); Menu.root.hidden = true;
      const w = world;
      // ---------- biomas ----------
      const present = new Set(w.biome);
      for (const b of [BIOME.SWAMP, BIOME.MESA, BIOME.FUNGAL]) check(present.has(b), 'bioma ' + BIOME_NAMES[b] + ' presente no mundo');
      check(w.rivers.some((r) => r.swamp), 'lagoas no pântano');
      const clayBands = new Set(); let peat = 0;
      for (let x = 0; x < w.w; x++) {
        if (w.biome[x] === BIOME.MESA) for (let y = w.surface[x]; y < w.surface[x] + 30; y++) clayBands.add(w.getTile(x, y));
        else if (w.biome[x] === BIOME.SWAMP && w.getTile(x, w.surface[x]) === TILE.BOG_GRASS) peat++;
      }
      check(clayBands.has(TILE.CLAY_RED) && clayBands.has(TILE.CLAY_CREAM) && clayBands.has(TILE.CLAY_ORANGE), 'mesa com as três faixas de argila');
      check(peat > 50, 'pântano com grama de brejo');
      // ---------- vegetação ----------
      const counts = {};
      for (let x = 100; x < w.w - 100; x++) { const y = w.surface[x], d = generateEnvironmentDecoration(w, x, y); if (d?.envKind) counts[d.envKind] = (counts[d.envKind] || 0) + 1; }
      const kinds = Object.keys(counts);
      check(kinds.length >= 14, 'variedade de vegetação na superfície (' + kinds.length + ' tipos)');
      for (const k of kinds) if (k.startsWith('s')) check(ENV_HARVEST[k], 'regra de colheita para ' + k);
      check(counts.sPebble > 5, 'pedrinhas no chão (' + counts.sPebble + ')');
      let grass = null, pebble = null;
      for (let x = 100; x < w.w - 100 && !(grass && pebble); x++) {
        const y = w.surface[x], d = environmentDecoration(w, x, y, false);
        if (d?.envKind === 'sGrass' && !grass) grass = [x, y];
        if (d?.envKind === 'sPebble' && !pebble) pebble = [x, y];
      }
      check(grass && pebble, 'achou mato e pedrinha para testar');
      check(environmentHarvest(game, grass[0], grass[1], false), 'botão esquerdo colhe o mato');
      check(!environmentDecoration(w, grass[0], grass[1], false), 'mato colhido some do lugar');
      check(!environmentHarvest(game, pebble[0], pebble[1], false), 'botão esquerdo NÃO pega a pedrinha');
      check(!environmentHarvest(game, pebble[0], pebble[1], false, true), 'lâmina NÃO leva a pedrinha');
      // botão direito pelo caminho real de interação
      const [px, py] = pebble;
      game.player.x = (px - 2) * T; game.player.y = (py - 3) * T; game.player.vx = game.player.vy = 0;
      game.zoom = 2; game.cam.x = game.player.cx - canvas.width / 2 / game.zoom; game.cam.y = game.player.cy - canvas.height / 2 / game.zoom;
      input.mouse.x = ((px + 0.5) * T - game.cam.x) * game.zoom; input.mouse.y = ((py - 0.5) * T - game.cam.y) * game.zoom;
      game.inventoryUI.open = false; game.rightWasDown = false; game.selected = 9;
      const before = game.drops.length;
      input.mouse.right = true; handleInteraction(1 / 60); input.mouse.right = false;
      check(game.drops.length > before, 'botão direito sobre a pedrinha solta o item');
      check(game.drops.some((d) => d.item === ITEM.PEBBLE), 'o item é a Pedrinha');
      check(!environmentDecoration(w, px, py, false), 'pedrinha some do chão depois de pega');
      let far = null;
      for (let x = px + 12; x < px + 90 && !far; x++) { const y = w.surface[x], d = environmentDecoration(w, x, y, false); if (d?.envPickup) far = [x, y]; }
      if (far) {
        input.mouse.x = ((far[0] + 0.5) * T - game.cam.x) * game.zoom; input.mouse.y = ((far[1] - 0.5) * T - game.cam.y) * game.zoom;
        const b2 = game.drops.length; game.rightWasDown = false; input.mouse.right = true; handleInteraction(1 / 60); input.mouse.right = false;
        check(game.drops.length === b2 && !!environmentDecoration(w, far[0], far[1], false), 'achado fora de alcance não é pego');
      }
      for (const k of ['PEBBLE', 'PINECONE', 'FIELD_MUSHROOM', 'BERRY', 'ALOE', 'BERRY_JAM']) check(ITEM[k] > 487 && ITEM_DEFS[ITEM[k]]?.name && ITEM_ART[ITEM[k]], 'item ' + k + ' definido com ícone');
      check(RECIPES.some((r) => r.nome === 'Pedra (pedrinhas)'), 'receita de pedra com pedrinhas');
      // ---------- fauna ----------
      const species = ['esquilo', 'raposaartico', 'zebra', 'texugo', 'fenec', 'suricato', 'coiote', 'jaguar', 'macaco', 'caranguejo', 'sapo', 'garca', 'komodo', 'tatu', 'gaivota', 'tucano', 'cascavel', 'jacare', 'cogumelito', 'lesma', 'bulboesporo'];
      for (const k of species) {
        check(WILDLIFE[k] && SHAPE_HOOKS[k] && WILD_SIZES[k] && WILD_PALETTES[k] && MOB_SFX[k], k + ': registrada');
        let filled = 0;
        for (let f = 0; f < 16; f++) {
          const img = wildlifeSprite(k, f).normal, d = img.getContext('2d').getImageData(0, 0, img.width, img.height).data;
          let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++;
          if (n > 30) filled++;
        }
        check(filled >= 14, k + ': quadros desenhados (' + filled + '/16)');
      }
      for (const [b, name] of [[BIOME.FOREST, 'floresta'], [BIOME.SNOW, 'neve'], [BIOME.DESERT, 'deserto'], [BIOME.JUNGLE, 'selva'], [BIOME.SAVANNA, 'savana'], [BIOME.SWAMP, 'pântano'], [BIOME.MESA, 'mesa'], [BIOME.FUNGAL, 'bosque'], [BIOME.OCEAN, 'praia']]) {
        let x = w.biome.indexOf(b); if (x < 0) continue; x += 5;
        const pas = wildlifePool(w, x, false).filter((k) => !WILDLIFE[k]?.aquatic), hos = wildlifePool(w, x, true).filter((k) => !WILDLIFE[k]?.aquatic);
        check(pas.length >= 2, name + ': ' + pas.length + ' passivos (' + pas.join(',') + ')');
        if (b !== BIOME.OCEAN && b !== BIOME.SNOW) check(hos.length >= 1, name + ': ' + hos.length + ' hostis (' + hos.join(',') + ')');
      }
      const sim = (kind, biome, withPlayer) => {
        let x = Math.max(10, w.biome.indexOf(biome) + 30);
        const open = (xx) => w.surface[xx] === surfaceY(w, xx) && SURFACE_GROUND.has(w.getTile(xx, w.surface[xx])) && [1, 2, 3, 4].every((k) => w.getTile(xx, w.surface[xx] - k) === TILE.AIR) && Math.abs(w.surface[xx] - w.surface[xx + 1]) <= 1;
        while (x < w.w - 60 && !Array.from({ length: 14 }, (_, i) => open(x - 3 + i)).every(Boolean)) x++;
        const sy = surfaceY(w, x);
        const m = new Wildlife(kind, x * T, 0); m.y = sy * T - m.h - 0.01;
        const p = game.player; p.vx = p.vy = 0; p.invulnerable = 99; p.hp = 100;
        game.mobs.push(m);
        let moved = 0, ox = m.x; const states = new Set();
        for (let i = 0; i < 720; i++) {
          p.x = (x + (withPlayer ? 5 : 40)) * T; p.y = m.y + m.h - p.h - 0.5;
          m.update(1 / 60, w, p);
          if (!isFinite(m.x) || !isFinite(m.y)) throw Error(kind + ' posição inválida');
          moved += Math.abs(m.x - ox); ox = m.x; if (m.state) states.add(m.state);
          wildlifeFrame(m);
        }
        game.mobs.splice(game.mobs.indexOf(m), 1);
        return { moved, states: [...states], y: m.y, alive: !m.dead };
      };
      const where = (k) => WILDLIFE[k].biome ?? WILDLIFE[k].biomes[0];
      for (const k of species) {
        if (!present.has(where(k))) continue;
        const hostile = !!WILDLIFE[k].hostile, r = sim(k, where(k), hostile);
        check(r.alive && r.y < w.h * T, k + ': simulou 12 s sem erro (andou ' + Math.round(r.moved) + 'px' + (r.states.length ? ', estados ' + r.states.join('/') : '') + ')');
        if (hostile) check(r.states.includes('windup') || r.states.includes('strike'), k + ': ataca de perto');
      }
      return log;
    }, [seed, size]);
    console.log(log.join('\n'));
    if (errors.length) throw Error('erros de página:\n' + errors.join('\n'));
    console.log('surface-fauna ok');
  } finally { await browser.close(); }
})().catch((e) => { console.error(e.message || e); process.exit(1); });
