// Arquipélago dos Vigias (js/sky-*.js): geração das ilhas, luz embaixo delas, correntes de vento,
// asa-delta, nuvem engarrafada, nuvem que segura quem pisa, bichos do céu e o Olho da Tempestade.
// uso: node tests/sky.cjs [semente] [tamanho]
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const seed = +(process.argv[2] || 4242), size = process.argv[3] || 'pequeno';
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } }), errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.text().includes('[Criação]')) errors.push(m.text()); });
    // o laço do jogo fica parado: o teste avança o tempo na mão, quadro a quadro
    await page.addInitScript(() => { window.requestAnimationFrame = () => 0; });
    await page.goto('http://localhost/jogo-teste/');
    await page.waitForFunction(() => typeof game === 'object' && typeof newWorld === 'function');
    const result = await page.evaluate(async ([seed, size]) => {
      const log = [];
      const check = (ok, msg) => { if (!ok) throw Error(msg); log.push('✓ ' + msg); };
      await newWorld(size, () => {}, seed);
      finishOpening(game); Menu.root.hidden = true; game.paused = false;
      const w = world, p = game.player;
      const step = (n, keys = []) => { for (const k of keys) input.keys.add(k); for (let i = 0; i < n; i++) update(1 / 60); for (const k of keys) input.keys.delete(k); };
      const put = (tx, ty) => { p.x = tx * T + 1; p.y = ty * T - p.h - 0.01; p.vx = p.vy = 0; p.onGround = false; p.invulnerable = 99; };

      // ---------- geração ----------
      check(w.skyFloor && w.skyIslands.length > 30, `ilhas no céu (${w.skyIslands.length})`);
      check(new Set(w.skyIslands.map((i) => i.zone)).size === 3, 'jardim, ruínas e ninhal aparecem');
      let below = 0, cells = 0;
      for (const i of w.skyIslands) for (let x = i.x0; x <= i.x1; x++) for (let y = i.top; y <= i.bottom; y++) {
        if (w.getTile(x, y) === TILE.AIR) continue;
        cells++; if (y > w.skyFloor[x]) below++;
      }
      check(below === 0 && cells > 3000, `nenhuma ilha encosta no chão (${cells} blocos no céu)`);
      check(w.skyIslands.every((i) => w.surface[i.cx] - i.bottom >= SKY.clearance - 1), 'sempre há vão livre entre a ilha e o chão');
      check(w.skyNest && w.getTile(w.skyNest.cx, w.skyNest.floor) === TILE.TWIG_NEST, 'Ninho da Tempestade com a tigela de gravetos');
      check(w.skyObservatory && w.skyRuins.length > 1, 'observatório e ruínas dos Vigias');
      check(w.skyTreeCols.size > 4 && w.skyFalls.length > 0, 'árvores-do-vento e cachoeiras');
      check(!w.tiles.includes(TILE.WIND_ALTAR)&&w.skyWinds.length===0, 'Pedras dos Ventos e correntes não nascem no mapa');
      let built=false;
      for(const target of w.skyIslands.filter(i=>!i.nest).sort((a,b)=>b.y0-a.y0)){
        for(const side of [-1,1]){
          const x=side<0?target.x0-4:target.x1+4,y=w.surface[x];
          if(x<20||x>w.w-20||![-1,0,1].every(dx=>skyColumnClear(w,x+dx,target.top-8,y-9)))continue;
          for(let dx=-1;dx<=1;dx++){
            for(let yy=y-8;yy<y;yy++)w.setTile(x+dx,yy,TILE.AIR);
            w.setTile(x+dx,y+1,TILE.STONE);w.setTile(x+dx,y,TILE.WIND_ALTAR);
          }
          refreshWindAltars(w);if(w.skyWinds.some(wd=>wd.target)){built=true;break;}
        }
        if(built)break;
      }
      const ground = w.skyWinds.filter((d) => d.ground&&d.target);
      check(built&&ground.length>0, 'Estrutura construída cria uma corrente até uma ilha');
      check(craftRecipes().some((r) => r.result.item === ITEM.GLIDER) && craftRecipes().some((r) => r.result.item === ITEM.CLOUD_BOTTLE), 'receitas da asa-delta e da nuvem engarrafada');
      check(!w.skyIslands.some((i) => i.x1 > w.w / 2 - SKY.centerGap && i.x0 < w.w / 2 + SKY.centerGap), 'nada no céu bem em cima de onde o avião cai');

      // ---------- luz: embaixo da ilha o sol volta ----------
      // a maior ilha que fica em cima de terra firme (em cima do mar o "chão" é água e a luz cai com a fundura)
      const isl = w.skyIslands.filter((i) => !i.nest && !w.water[(w.groundTop(i.cx) - 1) * w.w + i.cx] && w.biomeAt(i.cx) !== BIOME.OCEAN).sort((a, b) => b.R - a.R)[0];
      const gx = isl.cx, gy = w.groundTop(gx);
      check(gy > w.skyFloor[gx] && w.isSkyExposed(gx, gy - 2) && !w.isOpenSky(gx, gy - 2), 'o chão embaixo de uma ilha continua no sol (mas sem chuva)');
      w.computeLight(gx, gy - 10);
      const lit = w.skyLight[(gy - 2 - w.ly) * LIGHT_W + (gx - w.lx)];
      check(lit >= 14, `luz do céu no chão embaixo da ilha (${lit}/15)`);
      check(surfaceY(w, gx) === gy, 'bicho do chão nasce no chão, não em cima da ilha');
      w.computeLight(isl.cx, isl.y0 + 4);
      const inner = w.skyLight[(isl.y0 + Math.floor(isl.depth / 2) - w.ly) * LIGHT_W + (isl.cx - w.lx)];
      check(inner >= SKY_BAND_GLOW - 1, `miolo da ilha na penumbra clara (${inner}/15)`);

      // ---------- corrente de vento: do chão até a ilha ----------
      const wd = ground.find((d) => !d.tall) || ground[0];
      put(wd.x, wd.yBottom + 1);
      let maxUp = 0;
      for (let i = 0; i < 60 * 14 && !(p.onGround && p.y < wd.target.y0 * T); i++) { step(1); maxUp = Math.max(maxUp, -p.vy); }
      check(maxUp > 250, `a corrente sobe rápido (${Math.round(maxUp)} px/s)`);
      check(p.onGround && p.y + p.h <= (wd.target.y0 + 2) * T && Math.abs(p.cx / T - wd.target.cx) <= wd.target.R + 2, 'a corrente deixa o jogador em cima da ilha' +
        ` (jogador ${Math.round(p.cx / T)},${Math.round((p.y + p.h) / T)}${p.onGround ? '' : ' no ar'}; ilha ${wd.target.x0}-${wd.target.x1} topo ${wd.target.y0}; corrente ${wd.x} até ${wd.yTop}, empurra ${wd.push})`);
      // S desce devagar
      put(wd.x, Math.floor((wd.yTop + wd.yBottom) / 2));
      step(60, ['KeyS']);
      check(p.vy > 0 && p.vy <= SKY_LIFE.sink + 30, 'segurando S desce devagar pela corrente');

      // ---------- asa-delta e nuvem engarrafada ----------
      game.accessories = Array(ACCESSORY_SLOTS).fill(null);
      const air = (() => { for (let x = isl.x1 + 20; x < w.w; x += 7) { let ok = true; for (let y = w.skyTop0 + 4; y < w.skyTop0 + 50 && ok; y++) for (let dx = -12; dx <= 12; dx++) if (w.getTile(x + dx, y) !== TILE.AIR) { ok = false; break; } if (ok && !skyWindAt(w, { x: x * T, y: (w.skyTop0 + 10) * T, w: 20, h: 40 })) return x; } })();
      put(air, w.skyTop0 + 10); step(40);
      const freeFall = p.vy;
      game.accessories[0] = { item: ITEM.GLIDER, count: 1 };
      put(air, w.skyTop0 + 10); step(40, ['Space']);
      check(p.gliding && p.vy <= ITEM_DEFS[ITEM.GLIDER].planar.queda + 1 && freeFall > 400, `a asa-delta segura a queda (${Math.round(p.vy)} contra ${Math.round(freeFall)} px/s)`);
      const x0 = p.x; step(30, ['Space', 'KeyD']);
      check((p.x - x0) / 0.5 > WALK_SPEED + 40, 'planando anda mais rápido que a pé');
      game.accessories[0] = { item: ITEM.CLOUD_BOTTLE, count: 1 };
      // um ponto seco de grama na ilha, com espaço em cima (no meio pode ter lagoa ou árvore)
      let dryX = isl.x0 + 2;
      for (let x = isl.x0 + 2; x < isl.x1 - 2; x++) { const top = skySurfaceY(w, x, isl.top - 2); if (top > 0 && !w.water[(top - 1) * w.w + x] && [1, 2, 3, 4].every((k) => w.getTile(x, top - k) === TILE.AIR && w.getTile(x + 1, top - k) === TILE.AIR)) { dryX = x; break; } }
      put(dryX, skySurfaceY(w, dryX, isl.top - 2)); step(30);
      check(p.onGround, 'em pé na ilha');
      step(8, ['Space']); step(6);
      const vyBefore = p.vy; input.keys.add('Space'); step(1); input.keys.delete('Space');
      check(!p.onGround && p.vy < -300 && vyBefore > -300, 'a nuvem engarrafada dá um pulo no ar');
      const jumpsLeft = p.skyJumps; step(10, []); input.keys.add('Space'); step(1); input.keys.delete('Space');
      check(jumpsLeft === 0, 'só um pulo extra até tocar o chão');
      game.accessories[0] = null;

      // ---------- nuvem segura quem cai em cima ----------
      let cloud = null;
      for (let x = 300; x < w.w - 300 && !cloud; x += 5) for (let y = w.skyTop0; y < w.skyFloor[x]; y++)
        if (w.getTile(x, y) === TILE.CLOUD && w.getTile(x, y - 1) === TILE.AIR && w.getTile(x, y - 2) === TILE.AIR && w.getTile(x, y - 3) === TILE.AIR && !skyWindAt(w, { x: x * T, y: (y - 4) * T, w: 20, h: 40 })) { cloud = [x, y]; break; }
      put(cloud[0], cloud[1] - 3); step(60);
      check(p.onGround && Math.abs(p.y + p.h - cloud[1] * T) < 2, 'dá para pisar na nuvem');

      // ---------- bichos do céu ----------
      game.mobs = game.mobs.filter((m) => m.kind === 'thunderbird');
      const ax = air, ay = w.skyTop0 + 20;
      const ray = new Wildlife('skyray', ax * T, ay * T); game.mobs.push(ray);
      const ry0 = ray.y; put(ax + 40, ay); step(120);
      check(!ray.dead && Math.abs(ray.y - ry0) < 6 * T && Math.abs(ray.x - ax * T) > 10, 'a arraia-do-céu plana sem cair');
      const hawk = new Wildlife('stormhawk', ax * T, (ay - 6) * T); game.mobs.push(hawk);
      put(ax + 2, ay + 8); p.hp = p.maxHp = 100; p.invulnerable = 0; hawk.diveCd = 0; game.adminGod = false;
      const freeze = () => { p.x = (ax + 2) * T; p.y = (ay + 8) * T - p.h; p.vy = 0; };
      let screeched = false, hurt = false;
      for (let i = 0; i < 60 * 8 && !hurt; i++) { freeze(); step(1); screeched ||= hawk.state === 'screech'; hurt = p.hp < 100; }
      check(screeched && hurt, `o gavião grita, mergulha e acerta (vida ${p.hp})`);
      const jelly = new Wildlife('windjelly', p.x, p.y + 4); game.mobs.push(jelly);
      p.hp = 100; p.invulnerable = 0; jelly.zapCd = 0; step(2);
      check(p.hp < 100, 'encostar na medusa-de-vento dá choque');
      game.mobs = game.mobs.filter((m) => m.kind === 'thunderbird'); game.adminGod = true;
      game.mobs.push(new Wildlife('skyray', 0, 0)); game.mobs.pop();
      let spawned = 0; for (let i = 0; i < 20; i++) if (trySpawnSkyCreature(game)) spawned++;
      check(spawned > 0 && game.mobs.every((m) => m.kind === 'thunderbird' || inSkyBand(w, m.cx / T, m.cy / T)), `bichos do céu nascem na faixa do céu (${spawned})`);
      check(['skyray', 'stormhawk', 'windjelly', 'thunderbird'].every((k) => BESTIARY_LORE[k] && WILDLIFE[k].where), 'todos no bestiário');

      // ---------- O Olho da Tempestade ----------
      game.mobs = [];
      const n = w.skyNest;
      put(n.cx - 50, n.floor); step(2);
      const ave = game.mobs.find((m) => m.kind === 'thunderbird');
      check(ave && ave.state === 'sleep', 'a Ave-Trovão dorme no ninho');
      put(n.cx - 12, n.floor); step(10);
      check(ave.state === 'wake' && game.boss === ave, 'acorda quando o jogador pisa no ninho');
      step(140);
      check(['soar', 'bolts', 'gust', 'screech', 'dive', 'stuck', 'rise'].includes(ave.state), `luta começou (${ave.state})`);
      // no ar o golpe entra pela metade; presa, quase dobrado
      ave.state = 'soar'; let hp0 = ave.hp; ave.hit(20, p.cx); const airDmg = hp0 - ave.hp;
      ave.state = 'stuck'; ave.stateT = 0; hp0 = ave.hp; ave.hit(20, p.cx); const stuckDmg = hp0 - ave.hp;
      check(airDmg < 20 && stuckDmg > 30, `bico preso deixa ela vulnerável (${airDmg} no ar, ${stuckDmg} presa)`);
      // raios: o raio cai onde o aviso piscou
      ave.state = 'bolts'; ave.stateT = 0; game.aveStrikes = []; aveBolts(game, ave, n, p);
      p.hp = 100; p.invulnerable = 0; game.adminGod = false;
      check(game.aveStrikes.length >= 3, 'raios marcados no chão');
      const under = game.aveStrikes[1].x; for (let i = 0; i < 90; i++) { p.x = under - p.w / 2; p.y = n.floor * T - p.h - 0.01; step(1); }
      check(p.hp < 100, `o raio acerta quem fica embaixo (vida ${p.hp})`);
      game.adminGod = true;
      // mergulho: depois do grito ela despenca e fica presa no chão
      ave.state = 'screech'; ave.stateT = 0;
      let wasStuck = false; for (let i = 0; i < 60 * 4 && !wasStuck; i++) { step(1); wasStuck = ave.state === 'stuck'; }
      check(wasStuck && Math.abs(ave.y + ave.h - n.floor * T) < 4, 'o mergulho crava o bico no ninho');
      // fúria e fim
      ave.hp = Math.floor(ave.def.hp * 0.45); ave.state = 'soar'; step(2);
      check(ave.phase === 2 && game.mobs.filter((m) => m.aveGuard).length === 2, 'na fúria chama dois gaviões');
      ave.state = 'stuck'; ave.hit(99999, p.cx);
      check(ave.state === 'dying', 'cai quando a vida acaba');
      game.drops = []; for (let i = 0; i < 60 * 4 && game.mobs.includes(ave); i++) step(1);
      check(!game.mobs.includes(ave) && storyState(game).skyCalmed, 'a tempestade se desfaz');
      check([ITEM.STORM_EYE, ITEM.STORM_WINGS, ITEM.THUNDER_SPEAR].every((it) => game.drops.some((d) => d.item === it)), 'deixa o Olho, as Asas e a Lança-Trovão');
      check(game.mobs.every((m) => !m.aveGuard), 'os gaviões chamados vão embora');
      step(30);
      check(!game.mobs.some((m) => m.kind === 'thunderbird'), 'não renasce depois de vencida');
      // Asas da Tempestade: voo real, sem o planar anterior.
      game.accessories[0] = { item: ITEM.STORM_WINGS, count: 1 };
      check(skyGear(game).jumps===0&&!skyGear(game).glide&&equippedFlight(game).rule.time===30,'Asas da Tempestade dão 30 segundos de voo real antes de planar');
      return log;
    }, [seed, size]);
    for (const l of result) console.log(l);
    if (errors.length) throw Error('Erros na página:\n' + errors.join('\n'));
    console.log(`sky ok (${result.length} verificações)`);
  } finally { await browser.close(); }
})().catch((e) => { console.error(e.message || e); process.exit(1); });
