// Pets: equipar, seguir (andar/pular/voar/flutuar), drops de chefe, baús e ícones.
// node tests/pets.cjs  (PLAYWRIGHT_PATH apontando para o playwright)
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs = require('fs');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = []; page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://localhost/jogo-teste/?nocache=' + Date.now());
  await page.waitForFunction(() => typeof game === 'object' && typeof PETS === 'object');
  const out = await page.evaluate(async () => {
    const log = [], check = (ok, msg) => { log.push((ok ? '✓ ' : '✗ ') + msg); };
    await newWorld('pequeno', () => {}, 4242);
    finishOpening(game); Menu.root.hidden = true; game.paused = false; game.adminGod = true; GAME_OPTIONS.help = false; applyOptions(game); game.objective = '';
    canvas.width = 1280; canvas.height = 720; game.zoom = 3; game.time = 0.3; window.toast = () => {};
    const w = world, p = game.player, step = (n = 1) => { for (let i = 0; i < n; i++) { game.monsterTimer = 1e9; update(1 / 60); } };
    // itens e tabelas
    const all = Object.values(PETS);
    check(all.length === 11 && all.every((d) => ITEM_DEFS[d.item]?.acessorio?.pet && ITEM_ART[d.item]?.pixels?.length === 16), '11 pets, todos acessórios, com ícone 16x16');
    check(new Set(all.map((d) => d.item)).size === 11 && all.every((d) => d.item > 283), 'ids únicos e livres');
    const dropOf = (k) => (WILDLIFE[k].drops || []).some(([it, , , ch]) => all.some((d) => d.item === it) && ch > 0);
    check(['tiger', 'cascoferro', 'yeti', 'nucleo', 'thunderbird'].every(dropOf), 'Tigre, Casco de Ferro, Yeti, Núcleo e Tempestade soltam um pet');
    const inChests = new Set(); for (const t of Object.values(LOOT_TABLES)) for (const [it] of t) if (all.some((d) => d.item === it)) inChests.add(it);
    check(inChests.size === 6, 'seis pets aparecem em baús (' + inChests.size + ')');
    let found = 0; for (const c of w.lootChests) for (const s of c.slots) if (s && all.some((d) => d.item === s.item)) found++;
    check(found > 0, 'baús do mundo gerado têm pets (' + found + ' em ' + w.lootChests.length + ' baús)');
    // equipar 5 de uma vez (um de cada jeito de andar)
    const x0 = Math.floor(w.w / 2) + 40, gy = w.groundTop(x0);
    p.x = x0 * T; p.y = gy * T - p.h - 0.01; p.vx = p.vy = 0; step(30);
    const equip = (keys) => { game.accessories = Array(5).fill(null); keys.forEach((k, i) => (game.accessories[i] = { item: PETS[k].item, count: 1 })); };
    equip(['tigrinho', 'sapinho', 'pintinho', 'fantasminha', 'mininucleo']); step(120);
    check(game.pets.size === 5, 'cinco pets criados (' + game.pets.size + ')');
    // anda para a direita e todos acompanham
    const dist = () => [...game.pets.values()].map((e) => Math.hypot(e.cx - p.cx, e.cy - p.cy) / T);
    input.keys.add('KeyD'); step(240); input.keys.delete('KeyD'); step(120);
    check(dist().every((d) => d < 8), 'todos acompanham o dono (' + dist().map((d) => d.toFixed(1)).join(', ') + ' blocos)');
    check([...game.pets.values()].every((e) => !e.collides(w, e.x, e.y)), 'nenhum pet preso dentro de bloco');
    // teleporte: voltam sozinhos
    p.x += 120 * T; p.y = w.groundTop(Math.floor(p.cx / T)) * T - p.h - 0.01; step(150);
    check(dist().every((d) => d < 8), 'depois de um teletransporte eles reaparecem do lado (' + dist().map((d) => d.toFixed(1)).join(', ') + ')');
    // desequipar remove
    equip(['sapinho']); step(5);
    check(game.pets.size === 1 && game.pets.has('sapinho'), 'tirar do cinto remove o pet');
    // todos os 11 juntos (cinco espaços: roda em levas) sem erro
    for (const group of [['tigrinho', 'besourinho', 'yetizinho', 'mininucleo', 'pintinho'], ['sapinho', 'corujinha', 'raposinha', 'gelatina', 'cogumelinho'], ['fantasminha', 'tigrinho']]) { equip(group); step(200); }
    check(true, 'todos os pets rodaram sem erros');
    // foto: cinco pets em cena
    equip(['raposinha', 'cogumelinho', 'corujinha', 'gelatina', 'yetizinho']); step(240);
    const gx = Math.floor(p.cx / T);
    game.cam.x = p.cx - canvas.width / game.zoom / 2; game.cam.y = p.cy - canvas.height / game.zoom * 0.62; w.computeLight(gx, Math.floor(p.cy / T)); w.composeLight(game.daylight);
    renderer.render(game); window.__shot = canvas.toDataURL();
    return log;
  }).catch((e) => [String(e.stack || e)]);
  const shot = await page.evaluate(() => window.__shot).catch(() => null);
  if (shot) fs.writeFileSync(__dirname + '/pets.png', Buffer.from(shot.split(',')[1], 'base64'));
  console.log(out.join('\n'));
  console.log(errors.length ? 'ERROS: ' + errors.slice(0, 5).join(' | ') : 'sem erros no console');
  await browser.close();
  if (errors.length || out.some((l) => !l.startsWith('✓'))) process.exit(1);
})();
