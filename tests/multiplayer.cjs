// Multijogador ponta a ponta: servidor (server/server.js) + dois navegadores.
// Antes: node server/server.js   Depois: node tests/multiplayer.cjs
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs = require('fs');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const log = [], check = (ok, msg) => { log.push((ok ? '✓ ' : '✗ ') + msg); console.log((ok ? '✓ ' : '✗ ') + msg); };
  const errors = [];
  const open = async (name) => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await ctx.addInitScript(() => localStorage.setItem('valdoria.autoconnect','1'));
    if (process.env.NET_SERVER) await ctx.addInitScript(server => localStorage.setItem('valdoria.server',server),process.env.NET_SERVER);
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push(name + ': ' + e.message));
    page.on('console',message=>{if(message.type()==='error'&&message.text().startsWith('[quadro]'))errors.push(name+': '+message.text());});
    await page.goto('http://localhost/jogo-teste/?nocache=' + Date.now(), {waitUntil:'domcontentloaded'});
    await page.waitForFunction(() => typeof game === 'object' && typeof NET === 'object' && NET.connected, null, { timeout: 30000 });
    await page.evaluate((n) => { PLAYER_LOOK.name = n; window.toast = (t) => (window.toasts ||= []).push(t); }, name);
    return page;
  };
  const until = async (page, fn, arg, ms = 15000) => { try { await page.waitForFunction(fn, arg, { timeout: ms, polling: 100 }); return true; } catch (_) { return false; } };
  try {
    const A = await open('Ana'), B = await open('Beto');
    // anfitrião começa um mundo e abre
    await A.evaluate(async () => {
      await newWorld('pequeno', () => {}, 4242);
      finishOpening(game); Menu.close(); game.paused = false; game.adminGod = true; GAME_OPTIONS.help = false;
      netHost('public', 'Mundo da Ana');
    });
    check(await until(A, () => NET.isHost && NET.room?.code), 'anfitrião abriu a sala');
    // mexe no mundo antes de alguém entrar (vai no retrato)
    const pre = await A.evaluate(() => { const x = Math.floor(player.cx / T) + 3, y = world.groundTop(x); world.setTile(x, y, TILE.AIR); world.setTile(x + 1, y - 1, TILE.STONE); return { x, y }; });
    // convidado vê na lista e entra
    await B.evaluate(() => netSend({ t: 'list' }));
    check(await until(B, () => NET.rooms.some((r) => r.name === 'Mundo da Ana')), 'convidado vê o mundo na lista online');
    const t0 = Date.now();
    await B.evaluate(() => netJoin({ id: NET.rooms.find((r) => r.name === 'Mundo da Ana').id }));
    check(await until(B, () => NET.room && !NET.joining && world.generated, null, 90000), 'convidado gerou o mundo e recebeu o retrato (' + ((Date.now() - t0) / 1000).toFixed(1) + ' s)');
    await B.evaluate(() => { game.adminGod = true; Menu.close(); game.paused = false; });
    const same = await B.evaluate((pre) => ({ a: world.getTile(pre.x, pre.y), b: world.getTile(pre.x + 1, pre.y - 1), seed: world.seed }), pre);
    check(same.a === 0 && same.b === 3 && same.seed === 4242, 'as mudanças feitas antes da entrada chegaram');
    // Compare o retrato entre atualizações, sem rios ou árvores mudando durante a leitura.
    for(const page of [A,B])await page.evaluate(()=>{window.__worldUpdate=update;update=dt=>netTick(dt);});
    await A.evaluate(()=>netRelay(netSnapshot()));
    await sleep(300);
    const hashA = await A.evaluate(() => { let h = 0; for (let i = 0; i < world.tiles.length; i += 7) h = (h * 31 + world.tiles[i]) | 0; return h; });
    const hashB = await B.evaluate(() => { let h = 0; for (let i = 0; i < world.tiles.length; i += 7) h = (h * 31 + world.tiles[i]) | 0; return h; });
    check(hashA === hashB, 'o mundo inteiro é igual nos dois');
    for(const page of [A,B])await page.evaluate(()=>{update=window.__worldUpdate;});
    if(!process.env.SUMMON_ONLY){
    // posições
    check(await until(A, () => [...NET.peers.values()].some((p) => p.seen && p.name === 'Beto')), 'anfitrião vê o Beto');
    check(await until(B, () => { const p = [...NET.peers.values()][0]; return p?.seen && Math.abs(p.x - player.x) < 80; }), 'Beto aparece do lado da Ana e a vê');
    await A.evaluate(() => { player.x += 3 * T; });
    await sleep(600);
    const posOk = await B.evaluate(() => { const p = [...NET.peers.values()][0]; return Math.abs(p.x - (window.__ax ?? p.x)); });
    const ax = await A.evaluate(() => player.x), bx = await B.evaluate(() => [...NET.peers.values()][0].x);
    check(Math.abs(ax - bx) < 6, 'a posição da Ana chega no Beto (' + Math.round(ax) + ' x ' + Math.round(bx) + ')');
    // blocos nos dois sentidos
    const cell = await A.evaluate(() => { const x = Math.floor(player.cx / T) - 4, y = world.groundTop(x) - 1; world.setTile(x, y, TILE.PLANKS); return { x, y }; });
    check(await until(B, (c) => world.getTile(c.x, c.y) === TILE.PLANKS, cell, 4000), 'bloco colocado pela Ana aparece no Beto');
    await B.evaluate((c) => world.setTile(c.x, c.y, TILE.AIR), cell);
    check(await until(A, (c) => world.getTile(c.x, c.y) === TILE.AIR, cell, 4000), 'bloco quebrado pelo Beto some na Ana');
    // itens: Ana solta perto do Beto; só o Beto pega
    await A.evaluate(() => { const b = [...NET.peers.values()][0]; dropItem(game, ITEM.METAL_BAR, 4, b.cx + 4, b.y + b.h - 10, 0); game.drops[game.drops.length - 1].delay = 0; player.x -= 10 * T; });
    check(await until(B, () => game.inventory.slots.some((s) => s?.item === ITEM.METAL_BAR && s.count === 4), null, 6000), 'Beto pegou o item que a Ana soltou');
    const aHas = await A.evaluate(() => game.inventory.slots.some((s) => s?.item === ITEM.METAL_BAR));
    const dropsLeft = await A.evaluate(() => game.drops.filter((d) => d.item === ITEM.METAL_BAR).length);
    check(!aHas && dropsLeft === 0, 'e ele não duplicou na Ana');
    // bichos: anfitrião cria um slime perto do Beto; Beto vê e bate
    await A.evaluate(() => { game.time = 0.95; const b = [...NET.peers.values()][0]; const m = new Monster('slime', b.cx + 40, b.y); m.hp = 50; game.mobs.push(m); window.__slime = m; });
    check(await until(B, () => game.mobs.some((m) => m.netMirror && m.kind === 'slime'), null, 5000), 'o slime do anfitrião aparece no Beto');
    await B.evaluate(() => game.mobs.find((m) => m.netMirror && m.kind === 'slime').hit(7, player.cx));
    check(await until(A, () => window.__slime.hp <= 43, null, 4000), 'a pancada do Beto tira vida do slime na Ana');
    const mirrorPos = await B.evaluate(() => { const m = game.mobs.find((x) => x.netMirror && x.kind === 'slime'); return m.x; });
    const hostPos = await A.evaluate(() => window.__slime.x);
    check(Math.abs(mirrorPos - hostPos) < 40, 'o slime está no mesmo lugar nos dois (' + Math.round(hostPos) + ' x ' + Math.round(mirrorPos) + ')');
    const targetsBeto = await A.evaluate(() => { const b = [...NET.peers.values()][0]; return netNearestPlayer(window.__slime, player) === b; });
    check(targetsBeto, 'no anfitrião o slime persegue o jogador mais perto (o Beto)');
    // clima
    await A.evaluate(() => setWeatherEvent(game, 'storm', 600, 1));
    check(await until(B, () => game.weather.event === 'storm', null, 3000), 'a tempestade da Ana chega no Beto');
    // árvore
    const tree = await A.evaluate(() => { for (let x = Math.floor(player.cx / T) - 60; x < Math.floor(player.cx / T) + 60; x++) { const y = world.groundTop(x) - 1; if (world.getTile(x, y) === TILE.TRUNK && treeIsWhole(world, x, y)) { startTreeFall(game, x, y); return { x, y }; } } return null; });
    if (tree) {
      check(await until(B, (t) => game.fallingTrees.length > 0 || world.getTile(t.x, t.y) === TILE.AIR, tree, 3000), 'a árvore que a Ana derrubou cai no Beto também');
      await sleep(3000);
      const woodA = await A.evaluate(() => game.drops.filter((d) => d.item === ITEM.WOOD).length), woodB = await B.evaluate(() => game.drops.filter((d) => d.item === ITEM.WOOD).length);
      check(woodA > 0 && woodA === woodB, 'a madeira caiu uma vez só, igual nos dois (' + woodA + ' / ' + woodB + ')');
    }
    // baú
    const chest = await A.evaluate(() => { const x = Math.floor(player.cx / T) + 2, y = world.groundTop(x) - 1; world.setTile(x, y, TILE.CHEST); const k = y * world.w + x; game.chests.set(k, new Array(CHEST_SLOTS).fill(null)); game.chests.get(k)[0] = { item: ITEM.TORCH, count: 9 }; return k; });
    check(await until(B, (k) => game.chests.get(k)?.[0]?.count === 9, chest, 4000), 'o que a Ana guardou no baú aparece no Beto');
    // chat
    await B.evaluate(() => netSendChat('oi Ana!'));
    check(await until(A, () => NET.chat.some((l) => l.text === 'Beto: oi Ana!'), null, 3000), 'chat chega');
    // amigos e convite
    const codeB = await B.evaluate(() => NET.code);
    await A.evaluate((c) => netSend({ t: 'addFriend', code: c }), codeB);
    check(await until(B, () => NET.friends.some((f) => f.name === 'Ana'), null, 3000), 'amizade pelo código (dos dois lados)');
    // Todos os chefes, inclusive os que ainda dormem, pertencem ao anfitrião.
    const bosses = await A.evaluate(() => game.mobs.filter(m=>m.boss).map(m=>({id:m.netId,kind:m.kind,state:m.state})));
    check(await until(B, list=>list.every(s=>game.mobs.some(m=>m.netMirror&&m.netId===s.id&&m.kind===s.kind)),bosses), 'todos os bosses são compartilhados, sem cópias locais desativadas');
    // Usa os mesmos desenhos do jogador local para ferramenta e espada remotas.
    for (const [source, target, label] of [[A,B,'host → convidado'],[B,A,'convidado → host']]) {
      await source.evaluate(() => {
        window.__actions=netActionView;
        netActionView=()=>({tool:{kind:'picareta',item:ITEM.EMERGENCY_AXE,t:.15,duration:.5,x:player.cx+26,y:player.cy,tx:Math.floor(player.cx/T)+1,ty:Math.floor(player.cy/T),tile:TILE.STONE},sword:{active:false}});
      });
      check(await until(target,()=>[...NET.peers.values()].some(p=>netPeerAnimation(p).toolAction?.item===ITEM.EMERGENCY_AXE)), 'golpe de mineração sincronizado ('+label+')');
      const toolDraw = await target.evaluate(() => { const p=[...NET.peers.values()][0], ctx=document.createElement('canvas').getContext('2d');ctx.canvas.width=180;ctx.canvas.height=100;ctx.translate(80-p.cx,50-p.cy);return netDrawAction(ctx,p)&&ctx.getImageData(0,0,180,100).data.some((v,i)=>i%4===3&&v>0); });
      check(toolDraw,'braços e ferramenta realmente desenhados ('+label+')');
      await source.evaluate(() => { netActionView=()=>({tool:null,sword:{...netPlain(game.sword),active:true,t:.16,item:ITEM.EMERGENCY_AXE,facing:player.facing}}); });
      check(await until(target,()=>[...NET.peers.values()].some(p=>netPeerAnimation(p).sword?.active)), 'ataque de espada sincronizado ('+label+')');
      check(await target.evaluate(()=>{const ctx=document.createElement('canvas').getContext('2d');return netDrawAction(ctx,[...NET.peers.values()][0]);}), 'espada e rastro desenhados ('+label+')');
      await source.evaluate(()=>{netActionView=()=>({tool:null,sword:{active:false},bow:{charging:true,charge:.6},ammo:1,aim:{x:player.cx+100,y:player.cy-30},arrows:[{x:player.cx+35,y:player.cy-10,ang:0,stuck:false}]});});
      check(await until(target,()=>[...NET.peers.values()].some(p=>netPeerAnimation(p).bow?.charging)), 'arco e mira sincronizados ('+label+')');
      check(await target.evaluate(()=>netDrawAction(document.createElement('canvas').getContext('2d'),[...NET.peers.values()][0])), 'arco armado e flecha desenhados ('+label+')');
      await source.evaluate(()=>{netActionView=()=>({tool:null,sword:{active:false},trident:{anim:{kind:'thrust',t:.12,ang:0,facing:player.facing,speed:1,damage:7},thrown:null,bolts:[],fx:[],puddles:[]}});});
      check(await until(target,()=>[...NET.peers.values()].some(p=>netPeerAnimation(p).trident?.anim)), 'estocada de tridente sincronizada ('+label+')');
      check(await target.evaluate(()=>netDrawAction(document.createElement('canvas').getContext('2d'),[...NET.peers.values()][0])), 'tridente e braços desenhados ('+label+')');
      await source.evaluate(()=>{netActionView=window.__actions;});
    }
    await B.evaluate(()=>{window.__breakSeen=0;const base=spawnBreakBurst;spawnBreakBurst=(...a)=>{__breakSeen++;return base(...a);};});
    for(const [source,target,label] of [[A,B,'host correndo'],[B,A,'convidado correndo']]){
      await target.evaluate(()=>{
        window.__movingAttackFrames=0;window.__playerDraw=renderer.drawPlayer;
        renderer.drawPlayer=function(p,pose,...args){if(p instanceof NetPeer&&pose&&Math.abs(p.vx)>5)__movingAttackFrames++;return __playerDraw.call(this,p,pose,...args);};
      });
      await source.evaluate(()=>{
        game.inventory.slots[game.selected]={item:ITEM.EMERGENCY_AXE,count:1};game.sword=createSwordState();
        window.__movingAttack=setInterval(()=>{if(!game.sword.active){game.attackCooldown=0;startSwordSwing(game,ITEM_DEFS[ITEM.EMERGENCY_AXE],player.cx+100,player.cy);}},100);
      });
      await source.keyboard.down('KeyD');
      check(await until(target,()=>__movingAttackFrames>3,null,4000), 'ataque durante corrida mantém o desenho remoto funcionando ('+label+')');
      await source.keyboard.up('KeyD');await source.evaluate(()=>clearInterval(__movingAttack));
      await target.evaluate(()=>{renderer.drawPlayer=__playerDraw;});
    }
    // Um menu suspende os controles de quem o abriu; só todos juntos param o mundo.
    await A.keyboard.press('F2');
    check(await until(A,()=>game.adminOpen), 'host abriu o painel admin');
    check(await until(B,()=>[...NET.peers.values()].some(p=>p.menu==='admin')), 'convidado recebe a miniatura ADMIN do host');
    const beforeAdmin=await A.evaluate(()=>game.clock);await sleep(350);
    check(await A.evaluate(c=>game.clock>c+.1&&!NET.worldPaused,beforeAdmin), 'painel admin do host não pausa o mundo enquanto convidado joga');
    const adminBadge=await B.evaluate(()=>{const c=makeCanvas(160,80),p=[...NET.peers.values()][0];c.getContext('2d').translate(5-p.x,15-p.y);netDrawMenuBadge(c.getContext('2d'),p,p.menu);return c.toDataURL();});
    fs.writeFileSync(__dirname+'/multiplayer-admin-presence.png',Buffer.from(adminBadge.split(',')[1],'base64'));
    await B.evaluate(()=>Bestiary.open(game));
    check(await until(A,()=>NET.worldPaused&&[...NET.peers.values()].some(p=>p.menu==='bestiary')), 'admin e bestiário simultâneos pausam o mundo no host');
    check(await until(B,()=>NET.worldPaused), 'pausa conjunta chega ao convidado');
    const frozenA=await A.evaluate(()=>game.clock),frozenB=await B.evaluate(()=>game.clock);await sleep(350);
    check(await A.evaluate(t=>game.clock===t,frozenA), 'relógio do host fica parado durante pausa conjunta');
    check(await B.evaluate(t=>game.clock===t,frozenB), 'relógio do convidado fica parado durante pausa conjunta');
    await B.evaluate(()=>Bestiary.close());
    check(await until(A,t=>!NET.worldPaused&&game.clock>t,frozenA), 'fechar só um menu retoma o mundo para todos');
    await A.keyboard.press('F2');
    await A.evaluate(()=>Menu.openPause());
    check(await until(B,()=>[...NET.peers.values()].some(p=>p.menu==='pause')), 'menu ESC é identificado ao lado do host');
    const beforeEsc=await A.evaluate(()=>game.clock);await sleep(300);
    check(await A.evaluate(c=>game.clock>c+.1&&!NET.worldPaused,beforeEsc), 'ESC sozinho também mantém a simulação ativa');
    await A.evaluate(()=>Menu.resume());
    await A.evaluate(()=>spawnBreakBurst(Math.floor(player.cx/T),Math.floor(player.cy/T),TILE.STONE));
    check(await until(B,()=>__breakSeen>0), 'poeira e lascas da quebra chegam ao outro jogador');
    const bear = await A.evaluate(()=>{const m=game.mobs.find(m=>m.kind==='bear');return m?{id:m.netId,x:m.x,y:m.y,bounds:m.lair.bounds}:null;});
    check(!!bear,'urso existe para testar a ativação remota');
    if(bear){
      await A.evaluate(b=>{player.x=b.x+250*T;player.y=world.groundTop(Math.floor(player.x/T))*T-player.h-.01;game.boss=null;},bear);
      await B.evaluate(b=>{player.x=b.bounds?(b.bounds[0]+3)*T:b.x+60;player.y=b.bounds?(b.bounds[3]+1)*T-player.h-.1:b.y;player.vx=player.vy=0;},bear);
      check(await until(A,id=>game.mobs.some(m=>m.netId===id&&m.state!=='sleep'),bear.id), 'convidado acorda o urso mesmo com host a mais de 120 blocos');
      check(await until(B,id=>game.boss?.netId===id&&game.boss.state!=='sleep',bear.id), 'convidado vê o boss ativo e a barra do encontro');
      const hp=await A.evaluate(id=>game.mobs.find(m=>m.netId===id).hp,bear.id);
      await B.evaluate(id=>game.mobs.find(m=>m.netId===id).hit(7,player.cx),bear.id);
      check(await until(A,({id,hp})=>game.mobs.find(m=>m.netId===id)?.hp<hp,{id:bear.id,hp}), 'golpe do convidado causa dano no boss compartilhado');
      const hpNow=await A.evaluate(id=>game.mobs.find(m=>m.netId===id).hp,bear.id);
      check(await until(B,({id,hp})=>game.mobs.find(m=>m.netId===id)?.hp===hp,{id:bear.id,hp:hpNow}), 'vida do boss sincronizada sem interpolar valores de saúde');
    }
    // Áreas separadas: capacidade perto do host não bloqueia o nascimento perto do convidado.
    const remote = await B.evaluate(()=>{player.x=world.w*T*.35;player.y=world.groundTop(Math.floor(player.x/T))*T-player.h-.01;player.vx=player.vy=0;updateCamera(0,true);return{x:player.x,y:player.y};});
    check(await until(A,r=>Math.abs([...NET.peers.values()][0].x-r.x)<40,remote), 'convidado está numa área distante do host');
    const spawning = await A.evaluate(()=>{
      const p=[...NET.peers.values()][0];
      for(let i=0;i<PIG.maximoNoMundo;i++)game.mobs.push(new Pig(player.x+i*10,player.y));
      let created=false;
      for(let i=0;i<100;i++)trySpawnPig(game,20,true);
      created=game.mobs.some(m=>!m.boss&&!m.hostile&&Math.abs(m.cx-p.cx)<100*T);
      // A fauna pode incluir lobos: deixe livre a cota de inimigos do convidado.
      game.mobs=game.mobs.filter(m=>m.boss||!m.hostile||Math.hypot(m.cx-p.cx,m.cy-p.cy)>100*T);
      for(let i=0;i<MONSTER_LIMIT;i++)game.mobs.push(new Monster('undead',player.x+i*15,player.y));
      const existing=new Set(game.mobs),time=game.time;
      for(let t=0;t<1;t+=.01)if(daylightAt(t)<.2){game.time=t;break;}
      for(let i=0;i<100;i++)trySpawnMonster(game);
      const hostileCreated=game.mobs.some(m=>!existing.has(m)&&m.hostile&&!m.boss&&Math.abs(m.cx-p.cx)<100*T);
      game.time=time;
      const m=new Monster('slime',p.x+25,p.y+12);m.netTestRemote=true;game.mobs.push(m);
      updateHostiles(game,.016);
      return {created,hostileCreated,retained:game.mobs.includes(m),target:netNearestPlayer(m,player)===p};
    });
    check(spawning.created,'bichos nascem perto do convidado mesmo com o limite do host preenchido');
    check(spawning.hostileCreated,'monstros também nascem perto do convidado com o limite do host preenchido');
    check(spawning.retained&&spawning.target,'mob distante do host permanece vivo e escolhe o convidado como alvo');
    check(await until(B,()=>game.mobs.some(m=>m.netTestRemote&&m.netMirror)), 'mob nascido na área do convidado chega pela rede');
    // Dano remoto usa defesa e invulnerabilidade do próprio convidado.
    await B.evaluate(()=>{game.adminGod=false;player.invulnerable=0;player.hp=100;});
    check(await until(A,()=>[...NET.peers.values()][0].god===false), 'estado de proteção do convidado chegou ao host');
    await A.evaluate(()=>{const p=[...NET.peers.values()][0];p.invulnerable=0;netWithPlayer(game,p,()=>damageMonsterPlayer(game,9,p.cx+20));});
    check(await until(B,()=>player.hp<100), 'ataque dirigido ao convidado tira vida dele');
    check(await A.evaluate(()=>player.hp===100), 'ataque dirigido ao convidado não tira vida do host');
    }
    // Invocador usado pelo convidado: criação no host, consumo confirmado e boss compartilhado.
    const summonDen=await A.evaluate(()=>{
      game.mobs=game.mobs.filter(m=>!m.boss);game.boss=null;
      game.tigerSlain=game.spiderSlain=false;
      const tx=Math.floor(world.w*.35),d={x:tx*T,y:world.groundTop(tx)*T};player.x=d.x+200*T;player.y=world.groundTop(Math.floor(player.x/T))*T-player.h-.01;
      return {x:d.x,y:d.y};
    });
    check(await until(B,()=>!game.boss),'fim da luta anterior sincronizado antes da invocação');
    await B.evaluate(d=>{
      game.adminGod=true;game.respawnPending=null;game.tigerSlain=game.spiderSlain=false;player.hp=100;player.x=d.x+50;player.y=d.y-player.h-.01;player.vx=player.vy=0;
      game.inventory.slots[game.selected]={item:ITEM.TIGER_SUMMONER,count:2};game.placeCooldown=0;
    },summonDen);
    check(await B.evaluate(()=>useBossSummoner(game)),'convidado usa invocador craftável do tigre');
    const summonActive=await until(A,()=>game.boss?.kind==='tiger'&&!game.boss.sleeping);
    if(!summonActive)console.log('Diagnóstico invocação:',await A.evaluate(()=>({boss:game.boss?.kind,peers:[...NET.peers.values()].map(p=>({x:p.x,y:p.y,hp:p.hp,reply:p.summonReply})),tigers:game.mobs.filter(m=>m.kind==='tiger').map(m=>({x:m.x,y:m.y,state:m.state,sleeping:m.sleeping})),toasts:window.toasts?.slice(-4)})),await B.evaluate(()=>({x:player.x,y:player.y,hp:player.hp,toasts:window.toasts?.slice(-4)})));
    check(summonActive,'host cria e ativa o boss solicitado pelo convidado');
    check(await until(B,()=>game.boss?.kind==='tiger'&&game.boss.netMirror&&!SUMMON_STATE.pending),'convidado recebe boss e confirmação pela rede');
    check(await B.evaluate(()=>game.inventory.count(ITEM.TIGER_SUMMONER)===1),'invocação online consome exatamente uma unidade');
    check(await B.evaluate(()=>{game.placeCooldown=0;return !useBossSummoner(game)&&game.inventory.count(ITEM.TIGER_SUMMONER)===1;}),'invocador não é gasto durante uma luta ativa');
    // foto
    await sleep(300);
    const shot = await B.evaluate(() => { game.cam.x = player.cx - canvas.width / game.zoom / 2; game.cam.y = player.cy - canvas.height / game.zoom / 2; renderer.render(game); return canvas.toDataURL(); });
    fs.writeFileSync(__dirname + '/multiplayer.png', Buffer.from(shot.split(',')[1], 'base64'));
    // anfitrião fecha
    await A.evaluate(() => netLeave());
    check(await until(B, () => !NET.room, null, 3000), 'anfitrião fechou: o Beto fica sabendo');
    check(await B.evaluate(()=>game.mobs.some(m=>m.boss)&&game.mobs.every(m=>!m.netMirror)&&game.monsterTimer<1e6), 'saída da sala restaura a simulação local e não deixa chefes congelados');
  } catch (e) { check(false, String(e.stack || e)); }
  console.log(errors.length ? 'ERROS: ' + errors.slice(0, 6).join(' | ') : 'sem erros no console');
  await browser.close();
  if (errors.length || log.some((l) => !l.startsWith('✓'))) process.exit(1);
})();
