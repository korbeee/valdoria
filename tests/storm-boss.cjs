const fs = require('node:fs');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => { window.requestAnimationFrame = () => 0; });
    await page.goto('http://localhost/jogo-teste/');
    await page.waitForFunction(() => typeof game === 'object');
    const result = await page.evaluate(async () => {
      await newWorld('pequeno', () => {}, 4242);
      finishOpening(game); Menu.root.hidden = true; game.paused = false;
      const w = game.world, p = game.player, n = w.skyNest;
      game.mobs = []; const m = spawnAve(game);
      p.x = n.cx * T - p.w / 2; p.y = n.floor * T - p.h; p.vx = p.vy = 0;
      game.adminGod = true;
      const check = (ok, message) => { if (!ok) throw Error(message); };
      const sprites = [];
      const edgeFrames = [];
      for (let f = 0; f < 34; f++) {
        const sprite = wildlifeSprite('thunderbird', f).normal;
        const data = sprite.getContext('2d').getImageData(0, 0, sprite.width, sprite.height).data;
        check(data.some((v, i) => i % 4 === 3 && v), `Quadro ${f} vazio`);
        check(AVE_EYES[f]?.every(Number.isFinite), `Olho inválido ${f}`);
        for (let x = 0; x < sprite.width; x++) if (data[x * 4 + 3] || data[((sprite.height - 1) * sprite.width + x) * 4 + 3]) { edgeFrames.push(f); break; }
        sprites.push(sprite.toDataURL());
      }
      check(new Set(AVE_FLIGHT.map(f => sprites[f])).size === 16, '16 poses distintas de voo');
      check(edgeFrames.length === 0, 'Asas e penas não podem ser cortadas nas bordas do quadro: ' + edgeFrames);
      for (const start of [22, 26, 30]) check(new Set(sprites.slice(start, start + 4)).size === 4, '4 poses distintas por ação');
      m.state = 'screech'; m.stateT = 0; m.diveLocked = false; m.hp = m.def.hp;
      for (let i = 0; i < 48; i++) SHAPE_HOOKS.thunderbird.update(m, 1 / 60, w, p);
      check(m.diveLocked && m.state === 'screech', 'Alvo deve travar antes do mergulho');
      const target = m.diveTo[0]; p.x += 5 * T;
      for (let i = 0; i < 14; i++) SHAPE_HOOKS.thunderbird.update(m, 1 / 60, w, p);
      check(m.diveTo[0] === target, 'Alvo não pode perseguir durante a esquiva');
      for (let i = 0; i < 180 && m.state !== 'stuck'; i++) SHAPE_HOOKS.thunderbird.update(m, 1 / 60, w, p);
      check(m.state === 'stuck' && game.aveImpacts.length, 'Mergulho termina com impacto e vulnerabilidade');
      game.aveStrikes = []; m.state = 'bolts'; aveBolts(game, m, n, p);
      check(game.aveStrikes.length === 3, 'Três raios na primeira fase');
      const x = game.aveStrikes[1].x; p.x = x - p.w / 2; p.invulnerable = 0;
      const hp = p.hp; aveStrike(game, n, x);
      check(p.hp === hp, 'Invencibilidade administrativa protege contra raios');
      check(game.aveBolts.at(-1).branches.length === 3, 'Raio tem ramificações');
      const fx = makeCanvas(1280, 800).getContext('2d');
      const before = JSON.stringify([game.aveBolts, game.aveImpacts]);
      drawAveWorld(fx, game); drawAveWorld(fx, game);
      check(before === JSON.stringify([game.aveBolts, game.aveImpacts]), 'Renderização não avança efeitos');
      m.hp = m.def.hp * .4; game.aveStrikes = []; aveBolts(game, m, n, p);
      check(game.aveStrikes.length === 5, 'Cinco raios na fúria');
      game.aveStrikes = []; game.aveBlades = []; m.state = 'sleep'; p.x = 0;
      updateSky(game, 1);
      check(!game.aveBolts.length && !game.aveImpacts.length, 'Efeitos expiram com o tempo da simulação');
      const sheet = makeCanvas(1200, 980), ctx = sheet.getContext('2d');
      ctx.fillStyle = '#131e32'; ctx.fillRect(0, 0, 1200, 980);
      const poses = [0, 2, 4, 6, 12, 22, 24, 30, 8, 26, 28, 11];
      const labels = ['Asas abertas', 'Batida', 'Descida', 'Retorno', 'Planando', 'Carregando', 'Trovão', 'Grito', 'Mergulho', 'Presa', 'Se soltando', 'Dormindo'];
      ctx.font = '14px monospace';
      poses.forEach((f, i) => { const x = (i % 4) * 300, y = Math.floor(i / 4) * 326;
        ctx.fillStyle = '#23314b'; ctx.fillRect(x + 8, y + 8, 284, 310);
        ctx.drawImage(wildlifeSprite('thunderbird', f).normal, x + 25, y + 5);
        ctx.fillStyle = '#d8ecff'; ctx.fillText(labels[i], x + 18, y + 308);
      });
      const effects = makeCanvas(1280, 760), ec = effects.getContext('2d');
      ec.fillStyle = '#131e32'; ec.fillRect(0, 0, 1280, 760); ec.font = '18px monospace';
      const scenes = ['Raios: aviso e descarga', 'Ventania: penas elétricas', 'Mergulho: alvo travado', 'Impacto: bico vulnerável'];
      for (let i = 0; i < 4; i++) {
        const sx = (i % 2) * 640, sy = Math.floor(i / 2) * 380;
        ec.save(); ec.translate(sx, sy); ec.beginPath(); ec.rect(0, 0, 640, 380); ec.clip();
        ec.fillStyle = '#23314b'; ec.fillRect(8, 8, 624, 364);
        ec.fillStyle = '#596278'; ec.fillRect(8, 332, 624, 3);
        ec.fillStyle = '#d8ecff'; ec.fillText(scenes[i], 24, 38);
        m.x = 210; m.y = 160; m.facing = 1; m.stateT = .85; m.clock = 2; m.hp = m.def.hp * .4; m.hurtTimer = 0;
        m.state = ['bolts','gust','screech','stuck'][i]; m.diveTo = [450, 332]; m.diveLocked = true;
        if (i === 3) m.y = 332 - m.h;
        const fg = { clock: 2, mobs: [m], aveStrikes: [], aveBolts: [], aveBlades: [], aveImpacts: [] };
        if (i === 0) { fg.aveStrikes = [{ x: 430, floor: 332, t: .7, warn: 1 }]; fg.aveBolts = [{ path: aveBoltPath(520, 60, 332), life: .26 }]; }
        if (i === 1) fg.aveBlades = [0,1,2].map(k => ({ x: 410 + k * 65, y: 200 + k * 30, vx: 320, vy: 30, trail: Array.from({length:6},(_,j)=>[410+k*65-j*9,200+k*30-j]) }));
        if (i === 3) fg.aveImpacts = [{ x: m.cx, y: 332, age: .2, life: .65 }];
        SHAPE_HOOKS.thunderbird.draw(ec, m); drawAveWorld(ec, fg);
        ec.restore();
      }
      // Página de revisão sem dependências: animações extraídas do próprio jogo.
      return { sprites, sheet: sheet.toDataURL(), effects: effects.toDataURL(), flight: AVE_FLIGHT, edgeFrames };
    });
    assert.deepEqual(errors, []);
    fs.writeFileSync('tests/storm-boss-design.png', Buffer.from(result.sheet.split(',')[1], 'base64'));
    fs.writeFileSync('tests/storm-boss-attacks.png', Buffer.from(result.effects.split(',')[1], 'base64'));
    console.log('Quadros tocando a borda superior/inferior:', result.edgeFrames);
    const html = `<!doctype html><meta charset="utf-8"><title>Olho da Tempestade</title><style>body{margin:0;background:#101b2c;color:#d8ecff;font:16px system-ui;padding:32px}h1{color:#c7efff}main{display:flex;flex-wrap:wrap;gap:16px}section{background:#23314b;border:1px solid #395577;border-radius:12px;padding:16px}img{width:372px;height:450px;image-rendering:pixelated}p{color:#94bddc}</style><h1>Olho da Tempestade</h1><p>Voo • carga elétrica • grito • vulnerabilidade</p><main>${['Voo','Carregando raios','Grito de mergulho','Bico preso'].map((label,i)=>`<section><h2>${label}</h2><img id="pose${i}"></section>`).join('')}</main><script>const sprites=${JSON.stringify(result.sprites)}, clips=${JSON.stringify([result.flight,[22,23,24,25],[30,31,32,33],[26,27,28,29]])};setInterval(()=>{const t=Date.now()/1000;clips.forEach((clip,i)=>document.getElementById('pose'+i).src=sprites[clip[Math.floor(t*(i?9:13))%clip.length]])},40)</script>`;
    fs.writeFileSync('tests/storm-boss-animation.html', html);
    console.log('34 quadros; 16 poses de voo; carga, grito e luta no chão; alvo travado, impacto, raios, fúria, invencibilidade e expiração verificados.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
