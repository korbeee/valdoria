// Clima em camadas + tornado/raio/granizo/vendaval com efeito de verdade.
// node tests/weather.cjs  (PLAYWRIGHT_PATH apontando para o playwright)
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://localhost/jogo-teste/?nocache=' + Date.now());
  await page.waitForFunction(() => typeof game === 'object' && typeof newWorld === 'function');
  const out = await page.evaluate(async () => {
    const log = [];
    const check = (ok, msg) => { log.push((ok ? '✓ ' : '✗ ') + msg); if (!ok) throw Error('FALHOU: ' + msg + '\n' + log.join('\n')); };
    await newWorld('pequeno', () => {}, 4242);
    finishOpening(game); Menu.root.hidden = true; game.paused = false;
    canvas.width = 1280; canvas.height = 800; game.zoom = 1.25; game.time = 0.3;
    window.toast = () => {};
    const w = world, p = game.player;
    game.mobs = [];
    // trecho plano de floresta, sem ilha no céu
    let x0 = 0;
    for (let x = 300; x < w.w - 300 && !x0; x += 7) {
      let ok = true;
      for (let k = -40; k <= 40 && ok; k += 4) ok = w.biomeAt(x + k) === BIOME.FOREST && w.skyGapBottom[x + k] <= w.skyGapTop[x + k] && Math.abs(w.surface[x + k] - w.surface[x]) < 6;
      if (ok) x0 = x;
    }
    check(x0 > 0, 'achou um campo aberto de floresta');
    const place = (tx) => { p.x = tx * T; p.y = (w.groundTop(tx) - 3) * T; p.vx = p.vy = 0; p.flingVx = 0; p.inTornado = 0; p.invulnerable = 0; p.hp = p.maxHp ?? 100; for (let i = 0; i < 40; i++) step(); };
    const step = () => { game.cam.x = p.cx - canvas.width / game.zoom / 2; game.cam.y = p.cy - canvas.height / game.zoom * 0.62; update(1 / 60); };
    const calm = () => { game.weather = createWeather(); game.weather.timer = 9999; };

    // 1) camadas somadas
    calm(); game.adminGod = true; place(x0);
    setWeatherEvent(game, 'wind', 600, 1);
    addWeatherLayers(game, 'storm', 600, 1);
    addWeatherLayers(game, 'tornado', 600, 1);
    addWeatherLayers(game, 'hail', 600, 1);
    const label = weatherLabel(game.weather);
    for (const part of ['Vendaval', 'Chuva', 'Raios', 'Tornado', 'Granizo']) check(label.includes(part), 'o rótulo soma "' + part + '" (' + label + ')');
    check(!!game.weather.funnel, 'somar tornado faz nascer um funil');
    for (let i = 0; i < 600; i++) { game.weather.timer = 9999; step(); }
    check(game.weather.rain > 0.4 && game.weather.lightning > 0.5 && game.weather.hail > 0.3 && Math.abs(game.weather.wind) > 60, 'chuva, raios, granizo e vento sobem juntos (' + [game.weather.rain, game.weather.lightning, game.weather.hail, game.weather.wind].map((v) => v.toFixed(2)).join(' / ') + ')');
    check(w.weatherStrikesSeen !== false, 'tempestade combinada roda sem erros');

    // 2) tornado levanta, machuca e arremessa
    calm(); game.adminGod = false; place(x0);
    setWeatherEvent(game, 'tornado', 600, 1);
    const f = game.weather.funnel; f.strength = 1;
    const hold = () => { f.x = p.cx + 4; f.tx = f.x; f.vx = 0; f.retarget = 99; f.strength = 1; game.weather.wind = 0; game.weather.targetWind = 0; game.weather.lightning = 0; game.weather.mix.lightning = 0; };
    const y0 = p.y, hp0 = p.hp; let minY = p.y, flung = 0;
    for (let i = 0; i < 150; i++) { if (i < 60) hold(); step(); minY = Math.min(minY, p.y); flung = Math.max(flung, Math.abs(p.flingVx || 0)); }
    check(y0 - minY > 3 * T, 'o tornado levanta o jogador (' + Math.round((y0 - minY) / T) + ' blocos)');
    check(flung > 200, 'e o arremessa para longe (vx ' + Math.round(flung) + ')');
    check(p.hp < hp0, 'e machuca (' + (hp0 - p.hp) + ' de dano)');

    // 3) bicho também é levado
    calm(); game.adminGod = true; place(x0);
    setWeatherEvent(game, 'tornado', 600, 1);
    const deer = new Wildlife('rabbit', p.x + 40 * T, (w.groundTop(x0 + 40) - 2) * T); game.mobs = [deer];
    const g2 = game.weather.funnel; let deerUp = 0; const dy0 = deer.y;
    for (let i = 0; i < 60; i++) { g2.x = deer.cx; g2.tx = g2.x; g2.vx = 0; g2.retarget = 99; g2.strength = 1; game.weather.wind = 0; game.weather.targetWind = 0; step(); deerUp = Math.max(deerUp, dy0 - deer.y); }
    check(deerUp > 2 * T, 'um coelho debaixo do funil sobe junto (' + Math.round(deerUp / T) + ' blocos)');
    game.mobs = [];

    // 4) árvore debaixo do funil tomba
    let treeX = 0;
    for (let tx = x0 - 60; tx < x0 + 60 && !treeX; tx++) { const gy = w.groundTop(tx); if (w.getTile(tx, gy - 1) === TILE.TRUNK && treeIsWhole(w, tx, gy - 1) && weatherExposed(w, (tx + 0.5) * T, (gy - 1) * T)) treeX = tx; }
    check(treeX > 0, 'achou uma árvore perto');
    let fell = 0; const realFall = startTreeFall; window.startTreeFall = (...a) => { fell++; return realFall(...a); };
    calm(); place(treeX - 30);
    setWeatherEvent(game, 'tornado', 600, 1);
    const g3 = game.weather.funnel;
    for (let i = 0; i < 40 && !fell; i++) { g3.x = (treeX + 0.5) * T; g3.tx = g3.x; g3.vx = 0; g3.retarget = 99; g3.strength = 1; step(); }
    window.startTreeFall = realFall;
    check(fell > 0, 'árvore debaixo do funil tomba');

    // 5) abrigo: debaixo de um teto o tornado não pega
    calm(); game.adminGod = false; place(x0);
    const gy = w.groundTop(x0), roof = gy - 6;
    for (let x = x0 - 6; x <= x0 + 7; x++) { w.setTile(x, roof, TILE.STONE); }
    for (let y = roof; y < gy; y++) { w.setTile(x0 - 6, y, TILE.STONE); w.setTile(x0 + 7, y, TILE.STONE); }
    for (let x = x0 - 6; x <= x0 + 7; x++) w.computeSkyTop?.(x);
    p.x = (x0 + 0.5) * T; p.y = (gy - 3) * T; p.vy = 0; p.invulnerable = 0; p.hp = p.maxHp ?? 100;
    for (let i = 0; i < 20; i++) step();
    check(environmentExposure(w, p.cx, p.y + 2) <= 0.4, 'dentro da cabana não está exposto (' + environmentExposure(w, p.cx, p.y + 2).toFixed(2) + ')');
    setWeatherEvent(game, 'supercell', 600, 1);
    const g4 = game.weather.funnel; const sy = p.y, shp = p.hp; let sMin = p.y;
    for (let i = 0; i < 120; i++) { g4.x = p.cx; g4.tx = g4.x; g4.vx = 0; g4.retarget = 99; g4.strength = 1; game.weather.hail = 1; step(); sMin = Math.min(sMin, p.y); }
    check(sy - sMin < T, 'abrigado: o tornado não levanta');
    check(p.hp === shp, 'abrigado: nem tornado nem granizo machucam (' + (shp - p.hp) + ')');
    for (let x = x0 - 6; x <= x0 + 7; x++) for (let y = roof; y < gy; y++) w.setTile(x, y, TILE.AIR);
    for (let x = x0 - 6; x <= x0 + 7; x++) w.computeSkyTop?.(x);

    // 6) raio em cima do jogador dá choque
    calm(); game.adminGod = false; place(x0 + 20);
    const rhp = p.hp, rtx = Math.floor(p.cx / T);
    game.weather.strikes = [{ x: p.cx, y: w.groundTop(rtx) * T, tx: rtx, ty: w.groundTop(rtx), t: 0, warn: 0.1, bolt: null, hit: false }];
    for (let i = 0; i < 12; i++) step();
    check(p.hp < rhp, 'raio no ponto em que estou machuca (' + (rhp - p.hp) + ')');

    // 7) granizo ao ar livre machuca aos poucos
    calm(); place(x0 + 20);
    setWeatherEvent(game, 'hail', 600, 1);
    const hhp = p.hp;
    for (let i = 0; i < 600; i++) { game.weather.hail = 1; game.weather.lightning = 0; game.weather.mix.lightning = 0; step(); }
    check(p.hp < hhp, 'granizo ao ar livre machuca (' + (hhp - p.hp) + ' em 10 s)');
    check((game.weather.hailStones || []).length > 20, 'pedras de granizo caindo (' + game.weather.hailStones.length + ')');

    // 8) vendaval empurra
    calm(); game.adminGod = true; place(x0);
    setWeatherEvent(game, 'wind', 600, 1);
    const px = p.x;
    for (let i = 0; i < 90; i++) { game.weather.wind = 95; game.weather.targetWind = 95; game.weather.rain = 0; step(); }
    check(p.x - px > T, 'vendaval empurra o jogador a favor do vento (' + Math.round((p.x - px) / T) + ' blocos)');
    return log;
  }).catch((e) => [String(e.message || e)]);
  console.log(out.join('\n'));
  console.log(errors.length ? 'ERROS: ' + errors.slice(0, 5).join(' | ') : 'sem erros no console');
  await browser.close();
  if (errors.length || out.some((l) => l.startsWith('✗') || l.startsWith('FALHOU') || l.startsWith('Error'))) process.exit(1);
})();
