// Aparência no multijogador: cada boneco sai com a forma E as cores do dono, e muda em tempo real.
// Sobe o próprio servidor na porta 8798 (não precisa do servidor ligado).
const { chromium } = require((process.env.PLAYWRIGHT_PATH || 'playwright'));
const { spawn } = require('child_process');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const srv = spawn(process.execPath, ['C:/xampp/htdocs/jogo-teste/server/server.js'], { env: { ...process.env, PORT: '8798' }, stdio: 'ignore' });
  await sleep(1000);
  const b = await chromium.launch({ channel: 'msedge', headless: true }), errs = [];
  const mk = async (name, look) => {
    const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(); p.on('pageerror', e => errs.push(name + ': ' + e.message));
    await p.goto('http://localhost/jogo-teste/?x=' + Date.now() + Math.random());
    await p.waitForFunction(() => typeof NET === 'object');
    await p.evaluate(({ name, look }) => { NET.server = 'ws://localhost:8798/ws'; netConnect(true); applyLook({ ...look, name }, renderer); }, { name, look });
    await p.waitForFunction(() => NET.connected);
    return p;
  };
  const lookA = { skin: 0, hair: 3, hairStyle: 4, eyes: 2, jacket: 4, shirt: 2, pants: 3, boots: 2, beard: 2, glasses: 1, hat: 0, hatColor: 0, top: 1, pattern: 1, legs: 1 };
  const lookB = { skin: 3, hair: 1, hairStyle: 1, eyes: 1, jacket: 1, shirt: 4, pants: 1, boots: 1, beard: 0, glasses: 0, hat: 1, hatColor: 2, top: 0, pattern: 0, legs: 0 };
  const A = await mk('Ana', lookA), B = await mk('Beto', lookB);
  await A.evaluate(async () => { await newWorld('pequeno', () => {}, 5); finishOpening(game); Menu.close(); game.paused = false; netHost('public', 'T'); });
  await A.waitForFunction(() => NET.isHost && NET.room, null, { timeout: 8000 }).catch(async () => { console.log('A state', await A.evaluate(() => JSON.stringify({ c: NET.connected, room: !!NET.room, err: NET.lastError, gen: world?.generated }))); console.log(errs); srv.kill(); process.exit(1); });
  await B.evaluate(() => { netSend({ t: 'list' }); });
  await B.waitForFunction(() => NET.rooms.length > 0);
  await B.evaluate(() => netJoin({ id: NET.rooms[0].id }));
  await B.waitForFunction(() => NET.room && !NET.joining && world.generated, null, { timeout: 90000 });
  await B.evaluate(() => { Menu.close(); game.paused = false; });
  await sleep(1500);
  // o atlas que o Beto desenha para a Ana tem de ser igual ao que a Ana desenha para si mesma
  const frame0 = (page, who) => page.evaluate((who) => {
    const atlas = who === 'self' ? renderer.playerAtlas : netPeerAtlas([...NET.peers.values()][0]);
    const c = document.createElement('canvas'); c.width = 32 * 12; c.height = 48; c.getContext('2d').drawImage(atlas, 0, 0, 32 * 12, 48, 0, 0, 32 * 12, 48);
    return c.toDataURL();
  }, who);
  const same = async (viewer, owner) => (await frame0(viewer, 'peer')) === (await frame0(owner, 'self'));
  console.log('Beto vê a Ana igual a ela mesma:', await same(B, A));
  console.log('Ana vê o Beto igual a ele mesmo:', await same(A, B));
  console.log('sem misturar: Beto próprio != Ana:', (await frame0(B, 'self')) !== (await frame0(A, 'self')));
  await B.evaluate(() => { game.cam.x = [...NET.peers.values()][0].x - 100; });
  // muda a aparência da Ana no criador (prévia) e depois confirma
  await A.evaluate(() => { previewLook({ ...PLAYER_LOOK, hairStyle: 2, jacket: 6, glasses: 2 }); });
  await sleep(900);
  const dur = await B.evaluate(() => JSON.parse([...NET.peers.values()][0].lookKey));
  console.log('prévia chegou:', dur.hairStyle === 2 && dur.jacket === 6 && dur.glasses === 2);
  await A.evaluate(() => { applyLook({ ...PLAYER_LOOK, hairStyle: 2, jacket: 6, glasses: 2, name: 'Aninha' }, renderer); });
  await sleep(900);
  console.log('confirmado igual:', await same(B, A), '| nome no outro lado:', await B.evaluate(() => [...NET.peers.values()][0].name));
  await A.evaluate(() => { previewLook({ ...PLAYER_LOOK, hairStyle: 5 }); }); await sleep(800);
  await A.evaluate(() => { PLAYER_LOOK_PREVIEW = null; applyLookToPalette(PLAYER_LOOK); }); await sleep(800); // cancelou
  console.log('cancelar volta ao anterior:', await same(B, A));
  console.log(errs);
  srv.kill(); await b.close();
})();
