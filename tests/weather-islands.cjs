// Clima x ilhas do céu: a ilha só segura chuva/neve quando está na tela (js/environment.js)
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs = require('fs');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } }), errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('http://localhost/jogo-teste/');
    await page.waitForFunction(() => typeof game === 'object' && typeof newWorld === 'function');
    const res = await page.evaluate(async () => {
      const log = [], check = (ok, m) => { if (!ok) throw Error(m); log.push('✓ ' + m); };
      await newWorld('pequeno', () => {}, 4242);
      finishOpening(game); Menu.root.hidden = true; game.paused = true;
      GAME_OPTIONS.help = false; applyOptions(game); game.objective = '';
      game.inventoryUI.drawVitals = () => {}; game.inventoryUI.draw = () => {}; game.mapUI.draw = () => {};
      const w = world, shots = {};
      // coluna de floresta/selva com ilha em cima e um vão alto até o chão
      let tx = -1;
      for (let x = 50; x < w.w - 50 && tx < 0; x++) {
        const b = w.biomeAt(x);
        if ((b === BIOME.FOREST || b === BIOME.JUNGLE) && w.skyGapBottom[x] - w.skyGapTop[x] > 60) tx = x;
      }
      check(tx > 0, 'achou chão embaixo de uma ilha do céu');
      const ground = w.skyGapBottom[tx], gx = (tx + 0.5) * T, gy = (ground - 2) * T;
      const view = (camY) => { game.cam.y = camY; game.cam.x = gx - canvas.width / game.zoom / 2; setWeatherView(game); };
      game.zoom = 1.6;
      // 1) câmera no chão, ilha bem acima da tela: chove
      view(gy - canvas.height / game.zoom * 0.6);
      check(w.skyGapTop[tx] * T < game.cam.y, 'a ilha está acima da tela');
      check(weatherExposed(w, gx, gy), 'ilha fora da tela: o chão recebe a chuva');
      check(weatherCeiling(w, tx) === ground, 'o "teto" da chuva é o chão do bioma');
      // 2) câmera subindo até a barriga da ilha aparecer: volta a fazer abrigo
      view(w.skyGapTop[tx] * T - 40);
      check(!weatherExposed(w, gx, gy), 'ilha na tela: embaixo dela fica seco');
      check(weatherExposed(w, gx, (w.skyTop[tx] - 2) * T), 'em cima da ilha continua chovendo');
      // fotos com chuva forte, uma de cada jeito
      setWeatherEvent(game, 'storm', 999, 1); game.weather.rain = 1;
      const shoot = (camY) => {
        game.player.x = gx; game.player.y = gy - 30;
        view(camY);
        for (let i = 0; i < 90; i++) { setWeatherView(game); updateWeather(game, 1 / 60); }
        w.computeLight(tx, Math.floor((camY + 300) / T)); w.composeLight(1);
        renderer.render(game); return canvas.toDataURL();
      };
      shots.fora = shoot(gy - canvas.height / game.zoom * 0.6);
      const exposedDrops = game.weather.drops.filter((d) => Math.abs(d.x - gx) < 200 && d.y > w.skyGapTop[tx] * T).length;
      check(exposedDrops > 5, `gotas caindo no chão embaixo da ilha (${exposedDrops})`);
      shots.dentro = shoot(w.skyGapTop[tx] * T - 120);
      // neve: mesma regra
      const sx = (() => { for (let x = 50; x < w.w - 50; x++) if (w.biomeAt(x) === BIOME.SNOW && w.skyGapBottom[x] - w.skyGapTop[x] > 40) return x; return -1; })();
      if (sx > 0) {
        setWeatherEvent(game, 'blizzard', 999, 1); game.weather.rain = 1;
        game.cam.y = (w.skyGapBottom[sx] - 20) * T; setWeatherView(game);
        check(weatherSnowAt(game, (sx + 0.5) * T, (w.skyGapBottom[sx] - 2) * T) > 0, 'nevasca chega ao chão da tundra embaixo de ilha fora da tela');
      }
      return { log, shots };
    });
    for (const [k, v] of Object.entries(res.shots)) fs.writeFileSync(`${__dirname}/weather-islands-${k}.png`, Buffer.from(v.split(',')[1], 'base64'));
    if (errors.length) throw Error(errors.join('\n'));
    console.log(res.log.join('\n')); console.log('weather-islands ok');
  } finally { await browser.close(); }
})().catch((e) => { console.error(e); process.exit(1); });
