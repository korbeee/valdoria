// Espólio do tigre, mina e luta da Fiandeira e o espólio dela.
//   node tests/boss-gear.cjs   -> tests/spider-mina.png, tests/spider-luta.png, tests/boss-gear-itens.png
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:720}});const errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.addInitScript(()=>{window.requestAnimationFrame=()=>1;let seed=4242;Math.random=()=>((seed=Math.imul(seed,1664525)+1013904223|0)>>>0)/4294967296;});
  await page.goto('http://localhost/jogo-teste/');await page.waitForFunction(()=>typeof game==='object');
  const shot=async(name)=>{const url=await page.evaluate(()=>{renderer.render(game);return document.getElementById('game').toDataURL();});fs.writeFileSync('tests/'+name+'.png',Buffer.from(url.split(',')[1],'base64'));};
  const result=await page.evaluate(async()=>{
   const checks=[];const check=(c,label)=>{if(!c)throw Error('FALHOU: '+label);checks.push(label);};
   const canvas=document.getElementById('game');canvas.width=1280;canvas.height=720;
   finishOpening(game);Menu.root.hidden=true;game.paused=false;
   // Mundo médio com semente fixa: precisa ter a mina
   const next=new World(1800,500,4242,{lazy:true});await next.generateAsync(()=>{});
   world=game.world=next;game.map=new WorldMap(world);renderer.bg=null;
   game.mobs=[];game.drops=[];game.chests.clear();
   for(const c of world.lootChests||[])game.chests.set(c.y*world.w+c.x,c.slots);
   for(const lair of world.bearLairs||[])spawnBearBoss(game,lair);
   for(const nest of world.spiderNests||[])spawnFiandeira(game,nest);
   startOpening(game);finishOpening(game);game.intro.active=false;game.inventoryUI.open=false;
   const nest=world.spiderNests[0];
   check(!!nest,'o mundo gerou a mina da Fiandeira');
   const [x0,y0,x1,y1]=nest.bounds;
   check(world.getTile(nest.entrance.x,nest.entrance.y+3)===TILE.LADDER,'o poço tem escada');
   // Da boca da mina até a galeria dá para descer: a escada chega ao túnel
   let ladders=0;for(let y=nest.entrance.y;y<y1+2;y++)if(world.getTile(nest.entrance.x,y)===TILE.LADDER)ladders++;
   check(ladders>20,'escada longa do poço ('+ladders+')');
   check(nest.door.every(([x,y])=>world.getTile(x,y)===TILE.AIR),'entrada aberta antes da luta');
   const chests=(world.lootChests||[]).filter(c=>c.x>=x0&&c.x<=x1&&c.y>=y0&&c.y<=y1);
   check(chests.length===2,'dois baús da expedição no ninho');
   const boss=game.mobs.find(m=>m.kind==='fiandeira');
   check(boss&&boss.state==='cocoon'&&boss.mode==='ceiling','com o tigre vivo, a Fiandeira dorme presa num casulo');
   const p=game.player;game.adminGod=false;p.hp=p.maxHp=100;
   p.x=(x0+x1)/2*T;p.y=y1*T-p.h-.01;p.invulnerable=0;
   for(let i=0;i<60;i++)update(1/60);
   check(!game.boss&&boss.state==='cocoon'&&nest.door.every(([x,y])=>world.getTile(x,y)===TILE.AIR),'entrar na galeria não acorda o casulo nem fecha a porta');
   const hpC=boss.hp;boss.hit(50,boss.cx);check(boss.hp===hpC,'o casulo não leva dano');
   p.x=nest.entrance.x*T;p.y=nest.entrance.y*T-p.h-.01;for(let i=0;i<5;i++)update(1/60);
   spiderTigerSlain(game);for(let i=0;i<90;i++)update(1/60);
   check(boss.state==='sleep','derrotar o tigre rasga o casulo');
   // Captura da mina (entrada do poço)
   p.x=nest.entrance.x*T-p.w/2;p.y=(nest.entrance.y)*T-p.h-.01;
   const mineShot={x:p.x,y:p.y};
   // Entra na galeria: acorda e fecha a porta
   p.x=(x0+x1)/2*T;p.y=y1*T-p.h-.01;p.invulnerable=0;
   for(let i=0;i<5;i++)update(1/60);
   check(game.boss===boss&&!boss.sleeping,'entrar acorda a Fiandeira');
   check(nest.door.every(([x,y])=>world.getTile(x,y)===TILE.THICK_WEB),'teia grossa fecha a entrada');
   // Deixa a luta correr e registra os estados
   const states=new Set(),frames=new Set();let webs=0,shots=0;game.adminGod=true;
   for(let i=0;i<60*40;i++){
    update(1/60);states.add(boss.state);frames.add(fiandeiraFrame(boss));
    webs=Math.max(webs,(game.spiderWebs||[]).length);shots=Math.max(shots,(game.spiderShots||[]).length);
    if(i===60*6)window.__fight=true;
   }
   check(['stalk','aim','drop','daze','hunt','rain'].every(s=>states.has(s)),'repertório: teto, mira, bote, zonza e chão ('+[...states]+')');
   check(webs>0,'as bolas de seda viram teia no chão');
   check(frames.size>=8,'usa vários quadros ('+frames.size+')');
   // Laço: puxa o jogador e emenda a mordida, que envenena
   game.adminGod=false;p.hp=100;p.invulnerable=0;boss.mode='floor';boss.x=(x0+6)*T;boss.y=(nest.bounds[3]+1)*T-boss.h-.01;boss.vx=boss.vy=0;boss.onGround=true;boss.facing=1;
   p.x=boss.x+boss.w+7*T;p.y=(nest.bounds[3]+1)*T-p.h-.01;p.vx=p.vy=0;game.spiderShots=[];game.spiderWebs=[];p.webbed=0;
   // Isolate the forced lasso from hazards/cooldowns left by the preceding 40 s battle.
   guardianClear(game,'fiandeira');boss.powerCd=10;game.spiderLasso=null;p.venom=null;p.pullT=0;
   spiderState(boss,'lasso');boss.lassoThrown=false;const px0=p.x;let pulled=false,bit=false;
   for(let i=0;i<90;i++){update(1/60);if(p.pullT>0)pulled=true;if(p.venom)bit=true;}
   check(pulled&&p.x<px0-3*T,'laço: o fio puxa o jogador para perto');
   check(bit,'laço: emenda a mordida, que envenena');
   const hv=p.hp;for(let i=0;i<70;i++)update(1/60);check(p.hp<hv||!p.venom,'veneno tira vida com o tempo');
   game.adminGod=true;p.venom=null;
   // Zonza leva mais dano
   boss.state='daze';boss.stateT=0;boss.sleeping=false;const hp0=boss.hp;boss.hit(10,boss.cx);
   check(hp0-boss.hp===15,'zonza leva 1,5× de dano');
   // Fase 2 chama filhotes
   boss.hp=Math.floor(boss.def.hp*0.35);boss.state='hunt';for(let i=0;i<30;i++)update(1/60);
   check(boss.phase===2&&(game.spiderEggs||[]).length>0,'furiosa grita e bota ovos');
   for(let i=0;i<60*5;i++)update(1/60);
   check(game.mobs.some(o=>o.brood),'os ovos chocam filhotes');
   // Derrota: drops, porta abre e filhotes somem
   game.drops=[];boss.hit(9999,boss.cx);for(let i=0;i<3;i++)update(1/60);
   const dropped=new Set(game.drops.map(d=>d.item));
   check([ITEM.MATRIARCH_SPOOL,ITEM.SPINNER_NEEDLE,ITEM.SILK_GLOVES,ITEM.HUNT_COCOON,ITEM.WEAVER_SPIDERLING].every(i=>dropped.has(i)),'as cinco peças da Fiandeira caem');
   check(nest.door.every(([x,y])=>world.getTile(x,y)===TILE.AIR),'a teia da entrada se desfaz');
   check(!game.mobs.some(o=>o.brood&&!o.despawn),'filhotes somem');
   check(WILDLIFE.tiger.drops.filter(d=>[ITEM.PREDATOR_STEP,ITEM.AMBER_EYE,ITEM.STRIPED_CLOAK,ITEM.HUNT_INSTINCT].includes(d[0])&&d[3]===1).length===4,'as quatro peças do tigre estão nos drops, garantidas');
   check(!WILDLIFE.tiger.drops.some(d=>d[0]===undefined||d[0]===60||d[0]===171),'nem Pelagem de tigre nem Presas Gêmeas caem do tigre');
   game.adminGod=false;
   return {checks,mineShot};
  });
  await page.evaluate(({x,y})=>{const p=game.player;p.x=x;p.y=y;game.boss=null;updateCamera(1,true);},result.mineShot);
  await shot('spider-mina');
  console.log(result.checks.map(c=>'✓ '+c).join('\n'));
  console.log(errors.length?'ERROS:\n'+errors.join('\n'):'sem erros no console');
  if(errors.length)process.exitCode=1;
 }catch(e){console.error(e.message);process.exitCode=1;}finally{await browser.close();}
})();
