const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'playwright');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await b.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>{requestAnimationFrame=()=>0;localStorage.setItem('valdoria.autoconnect','0');});
 await page.goto('http://localhost/jogo-teste/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>typeof referenceActivate==='function'&&typeof game!=='undefined');
 const result=await page.evaluate(()=>{
 let n=0;const check=(v,s)=>{if(!v)throw Error(s);n++;};
 const w=new World(100,90,765,{lazy:true});game.world=world=w;w.surface.fill(55);w.biome.fill(BIOME.FOREST);for(let x=0;x<100;x++)w.setTile(x,55,TILE.STONE);
 game.intro.active=false;Menu.close();game.paused=false;game.npcOpen=false;game.adminOpen=false;game.inventoryUI.close();game.mapUI.open=false;game.clock=10;game.respawnPending=null;
 Object.assign(player,{x:40*T,y:55*T-player.h,vx:0,vy:0,onGround:true,hp:50});game.mobs=[];game.outfit=null;game.accessories=[];const s=referenceState(game);
 check(new Set(GAME_REFERENCE_ITEMS.map(id=>ITEM_DEFS[id].referenceGame)).size===6,'apenas seis jogos de referência');
 const target={x:player.x+70,y:player.y,w:24,h:30,hp:100,dead:false,sleeping:false,get cx(){return this.x+12},get cy(){return this.y+15},hit(d){this.hp-=d;}};game.mobs=[target];
 check(referenceActivate(game,ITEM.REF_FIRST_CHARM)&&target.hp===72,'raio causa dano');check(!referenceActivate(game,ITEM.REF_FIRST_CHARM),'raio respeita recarga');
 s.shots=[];s.soul=2;referenceOnStrike(game,target,ITEM.REF_CAVERN_NEEDLE);check(s.soul===3,"agulhão coleta alma");check(!referenceActivate(game,ITEM.REF_CAVERN_NEEDLE),"R não faz mais nada no agulhão");
 s.shots=[];game.inventory.slots.fill(null);game.inventory.add(ITEM.ARROW,3);check(referenceActivate(game,ITEM.REF_FOREST_BOW)&&game.inventory.count(ITEM.ARROW)===0&&s.shots.length===3,'rajada consome três flechas');
 const beforeBlast=target.hp;s.shots=[{type:'arrow',x:target.cx,y:target.cy,vx:1,vy:0,life:1,age:0,damage:9,radius:5,hit:new Set()}];updateReferences(game,.016);check(target.hp===beforeBlast-15&&s.shots.some(q=>q.type==='blast'),'flecha causa impacto e explosão em área');
 s.shots=[];check(referenceActivate(game,ITEM.REF_FIRE_BLOOM)&&s.shots.length===3,'flor dispara três bolas');game.mobs=[];for(let i=0;i<30;i++)updateReferences(game,1/60);check(s.shots.some(q=>q.bounces>0),'fogo quica no piso');
 s.shots=[];referenceOnStrike(game,target,ITEM.REF_DUEL_BLADE);check(s.shots.some(q=>q.type==='star'),'espada chama estrela');referenceOnStrike(game,target,ITEM.REF_DUEL_BLADE);check(s.shots.length===1,'estrela não duplica durante recarga');
 referenceOnStrike(game,target,ITEM.REF_ASH_MAUL);check(s.shots.some(q=>q.type==='quake'),'martelo cria onda');
 game.accessories=[{item:ITEM.REF_TRAIL_SPADE,count:1}];player.onGround=false;player._referenceJump=false;player._referenceAirJump=false;referenceMovement(player,.016,input,0,true);check(player.vy<0&&player._referenceAirJump,'salto em nuvem funciona');player.vy=100;referenceMovement(player,.016,input,0,false);referenceMovement(player,.016,input,0,true);check(player.vy===100,'salto extra só uma vez');
 game.inventory.slots[game.selected]={item:ITEM.REF_SPRING_MUSHROOM,count:1};eatHeld(ITEM_DEFS[ITEM.REF_SPRING_MUSHROOM]);check(s.springUntil===30&&gearJumpScale(player)===1.25,'cogumelo aumenta salto temporariamente');
 player.x=40*T;target.x=player.x;target.y=player.y+player.h-2;target.hp=100;game.mobs=[target];player._referenceFall={bottom:target.y-2,speed:200};referenceAfterMovement(player);check(target.hp===82&&player.vy<0,'pisão causa dano e quica');
 player.hp=50;game.outfit=ITEM.REF_ASH_ARMOR;target.x=player.x+10;target.y=player.y;target.hp=100;referenceOnHurt(game);check(target.hp===92,'armadura reflete dano');
 game.inventory.slots[game.selected]={item:ITEM.REF_FARM_STEW,count:1};eatHeld(ITEM_DEFS[ITEM.REF_FARM_STEW]);const hp=player.hp;updateReferences(game,.5);check(player.hp===hp+1,'refeição regenera');
 check(referenceActivate(game,ITEM.REF_DEEP_PICK)&&s.scanUntil===15,'detector de minério');
 // Incoming remote effects are visual only, and expire locally.
 NET.room={};const before=target.hp;netOnRelay(99,{k:'referenceFx',shot:{type:'soul',x:target.cx,y:target.cy,vx:0,vy:0,age:0,life:1,damage:99,radius:40}});check(s.shots.at(-1).cosmetic&&s.shots.at(-1).damage===0,'efeito remoto não duplica dano');NET.room=null;updateReferences(game,.1);check(target.hp===before,'efeito remoto permanece visual');
 const ctx=makeCanvas(500,500).getContext('2d');ctx.globalAlpha=.43;drawReferences(ctx,game);check(Math.abs(ctx.globalAlpha-.43)<.001,'efeitos restauram o contexto');
 game.accessories=[{item:ITEM.REF_STONE_BROOCH,count:1}];game.outfit=null;Object.assign(player,{x:40*T,y:55*T-player.h,vx:0,vy:0,onGround:true});input.keys.add('KeyD');for(let i=0;i<60;i++)player.update(1/60,input,w);input.keys.clear();check(player.vx>=WALK_SPEED*1.2,'botas aceleram o movimento real');
 const w2=new World(50,80,999,{lazy:true});game.world=w2;check(referenceState(game).shots.length===0&&referenceState(game).soul===0,'troca de mundo limpa poderes');
 return n;
 });if(errors.length)throw Error(errors.join('\n'));console.log(result+' verificações dos poderes passaram.');
 }finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1);});
