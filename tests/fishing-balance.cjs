const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{requestAnimationFrame=()=>0;localStorage.setItem('valdoria.autoconnect','0');});
  await page.goto('http://localhost/jogo-teste/',{waitUntil:'domcontentloaded'});
  await page.evaluate(()=>document.fonts.ready);
  const report=await page.evaluate(()=>{
   let checks=0;const check=(ok,message)=>{checks++;if(!ok)throw Error(message);};
   const rand=Math.random;Math.random=mulberry32(90821);
   const w=new World(100,60,99,{lazy:true});w.surface.fill(22);w.biome.fill(BIOME.FOREST);
   for(let x=3;x<90;x++)for(let y=22;y<42;y++)w.water[y*w.w+x]=WATER_MAX;
   for(let x=0;x<w.w;x++)w.tiles[42*w.w+x]=TILE.STONE;
   world=game.world=w;game.player.x=31*T;game.player.y=22*T-game.player.h;game.player.vx=game.player.vy=0;
   game.inventory.slots.fill(null);game.inventory.add(ITEM.ROD_TWIG,1);game.selected=0;game.inventory.add(ITEM.BAIT_LUMINOUS,999);
   game.mobs=[];game.drops=[];updateFishing(game,0);
   const target=fishingTarget(w,37*T,25*T),samples=[],phases=new Set();
   const fresh=(kind,rod,id)=>{
    for(const s of fishingSessions.values())fishingEnd(s);
    game.inventory.slots[0]={item:rod,count:1};game.fishingWasPulling=false;input.mouse.left=false;
    check(fishingBegin(fishingOwner(),id,rod,ITEM.BAIT_LUMINOUS,target),'Cast rejected '+kind);
    const s=fishingSessions.get(fishingOwner()),m=new Wildlife(kind,target.x,target.y);
    game.mobs=[m];Object.assign(s,target,{state:'bite',time:ITEM_DEFS[rod].fishingRod.window,fish:m});m.fishingOwner=s.owner;
    fishingReel(s);return {s,m};
   };
   // Todas as espécies, todas as varas, três sequências de arrancadas.
   let id=100;
   for(let trial=0;trial<3;trial++)for(const rod of FISHING_RODS)for(const kind of Object.keys(FISHING_FOOD)){
    const before=game.inventory.count(AQUATIC[kind].fishingItem),{s,m}=fresh(kind,rod,++id);
    let easing=false,maxTension=0;
    for(let tick=0;tick<3600&&game.fishing;tick++){
     if(s.tension>.65)easing=true;if(s.tension<.25)easing=false;
     input.mouse.left=s.phase!=='surge'&&!easing;
     updateFishing(game,1/60);phases.add(s.phase);maxTension=Math.max(maxTension,s.tension);
    }
    check(m.despawn&&game.inventory.count(AQUATIC[kind].fishingItem)===before+1,'Controlled fight failed: '+kind+' rod '+rod+' / '+game.toast.text);
    check(maxTension<1&&s.slack<2.4,'No control margin '+kind);
    check(s.age-s.reelAge<48,'Fight too long '+kind);
    samples.push({kind,rod,seconds:+(s.age-s.reelAge).toFixed(2),maxTension:+maxTension.toFixed(3)});
   }
   check(['calm','warning','surge','recovery'].every(p=>phases.has(p)),'Missing fight phase');
   // Segurar sempre deve romper a linha; largar sempre deve soltar o anzol.
   let f=fresh('catfish',ITEM.ROD_TWIG,++id);input.mouse.left=true;
   for(let i=0;i<1800&&game.fishing;i++)updateFishing(game,1/60);
   check(!game.fishing&&!f.m.despawn&&game.toast.text.includes('rompeu'),'Holding forever cannot fail');
   f=fresh('salmon',ITEM.ROD_IRON,++id);input.mouse.left=false;fishingRelease(f.s);
   for(let i=0;i<900&&game.fishing;i++)updateFishing(game,1/60);
   check(!game.fishing&&!f.m.despawn&&game.toast.text.includes('soltou'),'Slack did not lose fish');
   // Fisgada no início dá vantagem, sem entregar a captura imediatamente.
   f=fresh('carp',ITEM.ROD_IRON,++id);check(f.s.perfect&&f.s.progress>0&&!f.m.despawn,'Perfect hook has no effect');
   fishingEnd(f.s);game.inventory.slots[0]={item:ITEM.ROD_IRON,count:1};
   fishingBegin(fishingOwner(),++id,ITEM.ROD_IRON,ITEM.BAIT_LUMINOUS,target);
   let s=fishingSessions.get(fishingOwner());Object.assign(s,target,{state:'bite',time:.1,fish:new Wildlife('carp',target.x,target.y)});fishingReel(s);
   check(!s.perfect&&s.progress===0,'Late hook marked perfect');fishingEnd(s);
   // Clique cedo recolhe sem prêmio; ignorar uma mordida deixa o peixe escapar.
   fishingBegin(fishingOwner(),++id,ITEM.ROD_IRON,ITEM.BAIT_LUMINOUS,target);s=fishingSessions.get(fishingOwner());
   const early=new Wildlife('trout',target.x,target.y);Object.assign(s,target,{state:'wait',fish:early});fishingReel(s);
   check(!s.fish&&!early.despawn&&s.state==='reel','Early click caught fish');fishingEnd(s);
   fishingBegin(fishingOwner(),++id,ITEM.ROD_IRON,ITEM.BAIT_LUMINOUS,target);s=fishingSessions.get(fishingOwner());
   Object.assign(s,target,{state:'bite',time:.02,fish:new Wildlife('trout',target.x,target.y)});updateFishing(game,.03);
   check(!game.fishing&&game.toast.text.includes('soltou'),'Ignored bite did not expire');
   // A trajetória acerta o ponto clicado dos dois lados sem consumir isca antes da água.
   const castErrors=[];
   for(const dx of [-5,-3,3,5,7]){
    const aim=fishingTarget(w,(31+dx)*T,26*T),bait=game.inventory.count(ITEM.BAIT_LUMINOUS);
    check(fishingBegin(fishingOwner(),++id,ITEM.ROD_IRON,ITEM.BAIT_LUMINOUS,aim),'Precision cast failed');
    check(game.inventory.count(ITEM.BAIT_LUMINOUS)===bait,'Bait spent in air');
    for(let t=0;t<240&&['cast','flight'].includes(game.fishing?.state);t++)updateFishing(game,1/60);
    check(game.fishing?.state==='wait','Cast missed water');
    const error=Math.abs(game.fishing.x-aim.x);castErrors.push(error);check(error<T,'Cast missed clicked cell');
    check(game.inventory.count(ITEM.BAIT_LUMINOUS)===bait-1,'Bait not spent exactly once');fishingEnd(fishingSessions.get(fishingOwner()));
   }
   check(!fishingBegin(fishingOwner(),++id,ITEM.ROD_TWIG,ITEM.BAIT_LUMINOUS,{x:75*T,y:25*T}),'Out-of-range cast accepted');
   // Novas espécies realmente nadam até o anzol, sem atravessar paredes.
   for(const kind of ['perch','carp','catfish','salmon','mackerel','snapper','caveeel','glowtetra','koifish','abyssfish']){
    game.inventory.slots[0]={item:ITEM.ROD_CELESTIAL,count:1};
    fishingBegin(fishingOwner(),++id,ITEM.ROD_CELESTIAL,ITEM.BAIT_LUMINOUS,target);s=fishingSessions.get(fishingOwner());
    const fish=new Wildlife(kind,target.x+4*T,target.y+T);game.mobs=[fish];
    for(let t=0;t<1500&&game.fishing?.state!=='bite';t++){updateFishing(game,1/60);updateAquatic(fish,1/60,w,game.player);}
    check(game.fishing?.state==='bite'&&s.fish===fish,'Species did not reach hook '+kind);fishingEnd(s);
   }
   // O recolhimento passa por uma margem elevada, sem matar o peixe fora da água.
   for(let x=3;x<=32;x++)for(let y=22;y<42;y++){w.tiles[y*w.w+x]=TILE.DIRT;w.water[y*w.w+x]=0;}
   f=fresh('catfish',ITEM.ROD_IRON,++id);let easing=false;
   for(let t=0;t<3000&&game.fishing;t++){
    if(f.s.tension>.65)easing=true;if(f.s.tension<.25)easing=false;
    input.mouse.left=f.s.phase!=='surge'&&!easing;updateFishing(game,1/60);updateAquatic(f.m,1/60,w,game.player);
   }
   check(f.m.despawn&&!game.toast.text.includes('margem'),'Fish stuck in bank on retrieval');
   f=fresh('salmon',ITEM.ROD_IRON,++id);game.fishingWasPulling=true;game.fishingCharges=new Set([id]);
   resetFishing(game);
   check(!game.fishing&&!fishingSessions.size&&!fishingViews.size&&!f.m.fishingOwner&&!game.fishingWasPulling&&!game.fishingCharges.size,'Leaving fishing kept a hook or input locked');
   // Catálogo e fabricação continuam identificando todos os peixes.
   check(Object.keys(FISHING_FOOD).length===21&&FISHING_RARES.length===6,'Incorrect expanded catalog');
   for(const kind of Object.keys(FISHING_FOOD)){
    const a=AQUATIC[kind];check(ITEM_DEFS[a.fishingItem].name===a.name,'Species lost identity');
    check(craftRecipes().some(r=>r.items.some(i=>i.item===a.fishingItem)&&r.station==='oven'),'Fish has no oven recipe '+kind);
    check(bestiaryEntries().some(e=>e.kind===kind),'Fish absent from bestiary');
   }
   // Prévia das instruções e estados, usando o desenho real da interface.
   const c=makeCanvas(1100,730),ctx=c.getContext('2d');ctx.fillStyle='#223b43';ctx.fillRect(0,0,c.width,c.height);
   game.intro=null;game.inventoryUI.open=false;game.mapUI.open=false;game.adminOpen=false;
   const previewStates=[null,{state:'wait',rod:ITEM.ROD_IRON,bait:ITEM.BAIT_LUMINOUS,nibbling:true},
    {state:'bite',rod:ITEM.ROD_IRON,bait:ITEM.BAIT_LUMINOUS,fishKind:'salmon',time:1},
    ...['calm','warning','surge','recovery'].map(phase=>({state:'reel',rod:ITEM.ROD_IRON,bait:ITEM.BAIT_LUMINOUS,fishKind:'catfish',phase,progress:.44,tension:phase==='surge'?.78:.45,perfect:true}))];
   for(let i=0;i<previewStates.length;i++){
    const px=i%2*550,py=Math.floor(i/2)*180;ctx.save();ctx.translate(px,py);game.fishing=previewStates[i];
    drawFishingHud(ctx,game,550,180);ctx.restore();
   }
   game.fishing=null;fishingSessions.clear();input.mouse.left=false;Math.random=rand;
   return {checks,samples,phases:[...phases],maxCastError:+Math.max(...castErrors).toFixed(2),preview:c.toDataURL()};
  });
  assert.deepEqual(errors,[]);
  fs.writeFileSync('tests/fishing-hud.png',Buffer.from(report.preview.split(',')[1],'base64'));delete report.preview;
  fs.writeFileSync('tests/fishing-balance.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify({checks:report.checks,fights:report.samples.length,phases:report.phases,maxCastError:report.maxCastError,maxFightSeconds:Math.max(...report.samples.map(s=>s.seconds))}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
