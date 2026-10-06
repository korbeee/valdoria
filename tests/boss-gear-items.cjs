// Mecânicas dos dez itens novos (tigre e Fiandeira), numa sala plana de teste.
//   node tests/boss-gear-items.cjs
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.addInitScript(()=>window.requestAnimationFrame=()=>1);
  await page.goto('http://localhost/jogo-teste/');await page.waitForFunction(()=>typeof game==='object');
  const checks=await page.evaluate(()=>{
   const out=[];const check=(c,label)=>{if(!c)throw Error('FALHOU: '+label);out.push(label);};
   finishOpening(game);Menu.root.hidden=true;game.paused=false;game.intro.active=false;
   world=game.world=new World(600,160,391);game.map=new WorldMap(world);
   startOpening(game);finishOpening(game);game.intro.active=false;game.inventoryUI.open=false;game.objective=null;
   // Sala: chão em 61, teto em 49, paredes em 25 e 75
   for(let x=20;x<80;x++)for(let y=40;y<=64;y++)world.setTile(x,y,y>=61||y<=49||x<=25||x>=75?TILE.STONE:TILE.AIR);
   const p=game.player,inv=game.inventory;
   const place=(tx)=>{p.x=tx*T;p.y=61*T-p.h-.01;p.vx=p.vy=0;p.onGround=true;p.invulnerable=0;p.dash=null;p.wallGrab=null;p.webbed=0;};
   const hold=(item)=>{inv.slots[0]={item,count:1};game.selected=0;};
   const step=(n=1)=>{for(let i=0;i<n;i++)update(1/60);};
   const keys=input.keys;
   const wolf=(tx,hp)=>{const m=new Wildlife('wolf',tx*T,61*T-18-.01);m.aware=false;m.hp=hp??m.def.hp;game.mobs.push(m);return m;};
   game.mobs=[];game.adminGod=true;

   // (As Presas Gêmeas foram removidas do jogo.)
   check(!ITEM_DEFS[171]&&!ITEM.TWIN_FANGS,'as Presas Gêmeas não existem mais');

   // ---------- Olho de Âmbar ----------
   game.accessories=[{item:ITEM.AMBER_EYE,count:1},null,null,null,null];
   const hurt=wolf(41,10),full=wolf(41,undefined);
   const s={damage:20};
   check(gearMeleeDamage(game,hurt,s)===23,'Olho de Âmbar: +15% em inimigo ferido');
   check(gearMeleeDamage(game,full,s)===20,'Olho de Âmbar: sem bônus em vida cheia');
   game.accessories=[null,null,null,null,null];game.mobs=[];

   // ---------- Manto Listrado ----------
   place(28);setOutfitItem(game,ITEM.STRIPED_CLOAK);game.cloakRun=0;game.cloakCharged=false;
   keys.add('KeyD');
   for(let i=0;i<60*3&&!game.cloakCharged;i++){step();if(p.x>70*T){keys.delete('KeyD');keys.add('KeyA');}if(p.x<28*T){keys.delete('KeyA');keys.add('KeyD');}}
   keys.delete('KeyD');keys.delete('KeyA');
   check(game.cloakCharged,'Manto Listrado: correr carrega o golpe');
   const w1=wolf(50,999);
   check(gearMeleeDamage(game,w1,{damage:10})===16&&!game.cloakCharged,'Manto Listrado: +60% no próximo golpe e o bônus some');
   setOutfitItem(game,null);game.mobs=[];

   // ---------- Passo do Predador ----------
   place(40);game.accessories=[{item:ITEM.PREDATOR_STEP,count:1},null,null,null,null];game.dashReady=0;
   keys.add('ShiftLeft');step();keys.delete('ShiftLeft');
   check(p.dash&&p.invulnerable>0.2,'Passo do Predador: Shift esquiva com proteção');
   const x0=p.x;step(12);check(p.x-x0>50,'Passo do Predador: avança '+Math.round(p.x-x0)+' px');
   keys.add('ShiftLeft');step();keys.delete('ShiftLeft');check(!p.dash,'Passo do Predador: tem recarga');
   game.accessories=[null,null,null,null,null];

   // ---------- Instinto da Caçada ----------
   place(30);hold(ITEM.HUNT_INSTINCT);game.instinctReady=0;game.placeCooldown=0;
   const prey=wolf(70);useHuntInstinct(game);
   check(game.hunt&&game.hunt.trails[0].mob===prey&&game.hunt.trails[0].pts.length>10,'Instinto: pegadas até a criatura');
   useHuntInstinct(game);check(game.instinctReady-game.clock>15,'Instinto: recarga');
   step(60*9);check(!game.hunt,'Instinto: as pegadas somem');
   game.mobs=[];

   // ---------- Carretel da Matriarca ----------
   place(40);hold(ITEM.MATRIARCH_SPOOL);game.grapple=null;
   fireGrapple(game,p.cx+10,49*T+8);
   for(let i=0;i<20&&game.grapple.phase==='fly';i++)step();
   check(game.grapple.phase==='pull','Carretel: o gancho prende no teto');
   step(60);check(game.grapple.phase==='hang'&&p.y<55*T,'Carretel: puxa o jogador para cima');
   keys.add('Space');step();keys.delete('Space');check(!game.grapple,'Carretel: pular solta');
   step(60);

   // ---------- Agulha da Fiandeira ----------
   place(40);hold(ITEM.SPINNER_NEEDLE);const needle=ITEM_DEFS[ITEM.SPINNER_NEEDLE];
   const victim=wolf(42.5,999);
   victim.x=p.x+30;victim.vx=0;game.attackCooldown=0;startSwordSwing(game,needle,victim.cx+4,victim.cy);step(30);
   check(!victim.poison,'Agulha: um golpe só não envenena');
   victim.x=p.x+30;victim.vx=0;game.attackCooldown=0;startSwordSwing(game,needle,victim.cx+4,victim.cy);step(30);
   check(victim.poison,'Agulha: o segundo golpe seguido envenena');
   const hpP=victim.hp;step(62);check(hpP-victim.hp>=needle.veneno.dano,'Agulha: o veneno tira vida com o tempo');
   game.mobs=[];

   // ---------- Luvas de Seda ----------
   place(27);game.accessories=[{item:ITEM.SILK_GLOVES,count:1},null,null,null,null];
   p.x=26*T+0.5;p.y=56*T;p.vy=0;p.onGround=false;game.gloveReady=true;keys.add("KeyA");step(3);
   check(p.wallGrab,'Luvas: agarra a parede no ar');
   const yGrab=p.y;step(30);check(Math.abs(p.y-yGrab)<2,'Luvas: fica parado na parede');
   keys.delete('KeyA');keys.add('Space');step();keys.delete('Space');
   check(!p.wallGrab&&p.vx>100&&p.vy<-300,'Luvas: salta para longe da parede');
   step(4);p.vy=0;keys.add('KeyA');step(20);check(!p.wallGrab,'Luvas: só agarra de novo depois de tocar o chão');
   keys.delete('KeyA');step(60);check(p.onGround&&game.gloveReady,'Luvas: recarregam no chão');
   game.accessories=[null,null,null,null,null];

   // ---------- Casulo de Caça ----------
   place(40);p.facing=1;hold(ITEM.HUNT_COCOON);game.cocoonReady=0;game.placeCooldown=0;
   placeHuntCocoon(game);check(game.cocoonTrap,'Casulo: arma a teia no chão');
   const small=new Wildlife('spider',game.cocoonTrap.x-10,61*T-10-.01);small.hostile=true;game.mobs.push(small);step(25);
   check(small.cocoonT>0,'Casulo: prende inimigo pequeno');
   const sx=small.x;step(30);check(Math.abs(small.x-sx)<0.5,'Casulo: preso não anda');
   placeHuntCocoon(game);check(!game.cocoonTrap||game.cocoonReady-game.clock<0,'Casulo: recarga antes de armar de novo');
   game.mobs=[];game.cocoonReady=0;game.placeCooldown=0;step(1);placeHuntCocoon(game);
   const boss=new Wildlife('fiandeira',game.cocoonTrap.x-28,61*T-26-.01);boss.boss=true;boss.def={...boss.def};boss.hostile=true;
   boss.update=function(){};game.mobs.push(boss);step(25);
   check(boss.cocoonSlow>0&&!(boss.cocoonT>0),'Casulo: chefe só fica lento');
   game.mobs=[];

   // ---------- Aranhinha Tecelã ----------
   place(40);game.accessories=[{item:ITEM.WEAVER_SPIDERLING,count:1},null,null,null,null];game.spiderling=null;
   step(10);check(game.spiderling,'Aranhinha: aparece junto do jogador');
   step(240);check(game.spiderling.mode==='thread'&&game.spiderling.threadY<=50*T+1,'Aranhinha: parado sob o teto, desce por um fio');
   keys.add('KeyD');step(20);keys.delete('KeyD');check(game.spiderling.mode==='walk','Aranhinha: volta a andar quando você anda');
   game.accessories=[null,null,null,null,null];step();check(!game.spiderling,'Aranhinha: some ao tirar do cinto');

   // ---------- Teia da Fiandeira deixa lento ----------
   place(40);game.spiderWebs=[{x:p.cx,y:61*T,w:48,t:5}];keys.add('KeyD');step(20);
   const slowV=Math.abs(p.vx);keys.delete('KeyD');game.spiderWebs=[];
   check(slowV<WALK_SPEED*0.4,'Teia: pisar nela deixa lento');
   return out;
  });
  console.log(checks.map(c=>'✓ '+c).join('\n'));
  console.log(errors.length?'ERROS:\n'+errors.join('\n'):'sem erros no console');
  if(errors.length)process.exitCode=1;
 }catch(e){console.error(e.message);process.exitCode=1;}finally{await browser.close();}
})();
