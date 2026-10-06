const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>window.requestAnimationFrame=()=>0);await page.goto('http://localhost/jogo-teste/');await page.waitForFunction(()=>typeof game==='object');
 const result=await page.evaluate(()=>{
  finishOpening(game);Menu.root.hidden=true;game.intro.active=false;game.paused=false;game.adminGod=true;game.mobs=[];
  updateLava(game,.016);renderer.render(game);
  const checks=[],check=(v,label)=>{if(!v)throw Error(label);checks.push(label);};
  const tank=()=>{const w=new World(60,40,4242,{lazy:true});for(let y=4;y<=25;y++)for(let x=4;x<=30;x++)if(y===25||x===4||x===30)w.setTile(x,y,TILE.STONE);return w;};
  const lava=tank(),water=tank();game.world=world=lava;game.player=new Player(38*T,8*T);game.cam={x:0,y:0};game.zoom=1;game.lavaEffects=null;
  ensureLava(lava);
  for(let y=10;y<14;y++)for(let x=10;x<16;x++){lava.setLavaLevel(x,y,16);water.water[y*water.w+x]=16;water.wakeWater(x,y);}
  const sum=arr=>arr.reduce((a,v)=>a+v,0),volume=sum(lava.lava);
  for(let i=0;i<100;i++){
   water.stepWater();lava.stepWater({levels:lava.lava,active:lava.lavaActive,flow:lava.lavaFlow,blocked:j=>lava.tiles[j]!==TILE.AIR&&lava.tiles[j]!==TILE.LAVA,changed:(j,v)=>{lava.tiles[j]=v?TILE.LAVA:TILE.AIR;}});
   check(lava.lava.every((v,j)=>v===water.water[j]),'Mesmo fluxo e nivelamento da água: passo '+i);
  }
  check(sum(lava.lava)===volume,'Fluxo conserva volume no tanque');
  check(lava.lava[24*lava.w+12]>0&&lava.lava[10*lava.w+12]===0,'Lava cai pela gravidade');
  check(lava.lava[24*lava.w+5]>0&&lava.lava[24*lava.w+29]>0,'Lava se espalha até as bordas');
  const empty=ITEM.IRON_BUCKET,slot={item:empty,count:1};game.inventory.slots.fill(null);game.inventory.slots[0]=slot;game.selected=0;
  useBucket(game,12,24,true);check(slot.item===ITEM.BUCKET_LAVA,'Balde de ferro coleta lava');check(sum(lava.lava)===volume-16,'Coleta retira exatamente um bloco');
  check(lava.lava.every((v,j)=>(v>0)===(lava.tiles[j]===TILE.LAVA)),'Marcadores acompanham coleta');
  useBucket(game,20,8,false);check(slot.item===ITEM.BUCKET_LAVA&&sum(lava.lava)===volume-16,'Alcance impede despejo distante');
  useBucket(game,4,10,true);check(slot.item===ITEM.BUCKET_LAVA,'Parede impede despejo sem perder conteúdo');
  useBucket(game,20,8,true);check(slot.item===empty&&sum(lava.lava)===volume,'Despejo devolve o volume e esvazia o balde');
  check(lava.lava[8*lava.w+20]===16,'Lava começa a cair no ponto clicado');
  for(let i=0;i<100;i++)updateLava(game,1/30);
  check(lava.lava[8*lava.w+20]===0&&sum(lava.lava)===volume,'Lava despejada flui sem desaparecer');
  slot.item=ITEM.BUCKET;const oldVolume=sum(lava.lava);useBucket(game,12,24,true);
  check(slot.item===ITEM.BUCKET&&sum(lava.lava)===oldVolume,'Balde de madeira não coleta lava');
  slot.item=empty;lava.water[8*lava.w+35]=16;useBucket(game,35,8,true);
  check(slot.item===ITEM.IRON_BUCKET_WATER&&!lava.water[8*lava.w+35],'Balde de ferro também coleta água');
  useBucket(game,36,8,true);check(slot.item===empty&&lava.water[8*lava.w+36]===16,'Balde de ferro também despeja água');
  const recipe=craftRecipes().find(r=>r.result.item===empty);check(recipe?.station==='anvil'&&recipe.items[0].item===ITEM.METAL_BAR,'Balde de ferro tem receita na bigorna');
  // Poça profunda para nado, ondas e tibum.
  for(let y=18;y<=24;y++)for(let x=8;x<26;x++)lava.setLavaLevel(x,y,16);
  const p=game.player;p.x=14*T;p.y=18*T+4;p.vx=0;p.vy=500;p.onGround=false;game.wasInLava=false;
  updateLava(game,.001);const fx=game.lavaEffects;
  check(fx.splashColumns.length>0&&fx.waterBlobs.length>0&&fx.waves.size>0,'Tibum cria coluna, gotas e ondas de magma');
  check(game.particles.some(q=>q.color==='#fff18a'||q.color==='#ff7026'),'Respingo usa cores quentes');
  for(let i=0;i<8;i++)updateLava(game,.016);
  const snapshot=makeCanvas(720,420),ctx=snapshot.getContext('2d');ctx.fillStyle='#17131e';ctx.fillRect(0,0,720,420);ctx.scale(2,2);ctx.translate(-5*T,-14*T);
  for(let y=14;y<=25;y++)for(let x=5;x<28;x++)if(lava.hasLava(x,y))TILE_DRAW[TILE.LAVA](ctx,lava,x,y);
  drawLavaSplashes(ctx,game);const shot=snapshot.toDataURL();
  p.y=20*T;p.vy=0;check(updateSwimming(p,.016,{down:()=>false},lava)&&p.inLavaSwimming,'Jogador nada e boia com a mesma física da água');
  const levelCell=[27,12];lava.setLavaLevel(...levelCell,2);const body={x:27*T,y:12*T,w:12,h:5};check(bodyLava(lava,body)===0,'Parte seca de uma célula rasa não causa contato');
  slot.item=empty;const shallowVolume=sum(lava.lava);useBucket(game,27,12,true);check(slot.item===empty&&sum(lava.lava)===shallowVolume,'Poça rasa não enche balde nem perde lava');
  slot.item=ITEM.BUCKET_LAVA;const fullVolume=sum(lava.lava);useBucket(game,14,24,true);check(slot.item===ITEM.BUCKET_LAVA&&sum(lava.lava)===fullVolume,'Tanque cheio não perde o conteúdo do balde');
  lava.setTile(12,23,TILE.STONE);check(lava.lavaLevel(12,23)===0,'Bloco colocado remove lava da célula');lava.setTile(12,23,TILE.AIR);check(lava.lavaActive.size>0,'Abrir passagem acorda lava vizinha');
  slot.item=ITEM.BUCKET_LAVA;lava.water[12*lava.w+35]=16;useBucket(game,35,12,true);check(lava.getTile(35,12)===TILE.OBSIDIAN&&slot.item===empty,'Despejar lava na água forma obsidiana');
  return {checks,shot};
 });assert.deepEqual(errors,[]);fs.writeFileSync('tests/lava-physics.png',Buffer.from(result.shot.split(',')[1],'base64'));console.log(result.checks.length+' verificações passaram.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
