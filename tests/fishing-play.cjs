const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{requestAnimationFrame=()=>0;localStorage.setItem('valdoria.autoconnect','0');});
  await page.goto('http://localhost/jogo-teste/',{waitUntil:'domcontentloaded'});await page.evaluate(()=>document.fonts.ready);
  const aim=await page.evaluate(()=>{
   const w=new World(100,60,81,{lazy:true});w.surface.fill(22);w.biome.fill(BIOME.FOREST);
   for(let x=0;x<100;x++)for(let y=22;y<60;y++){
    const bank=x<=32||x>=68;
    w.tiles[y*w.w+x]=bank?(y===22?TILE.GRASS:y<28?TILE.DIRT:TILE.STONE):(y>=38?TILE.STONE:TILE.AIR);
    if(!bank&&y<38)w.water[y*w.w+x]=WATER_MAX;
   }
   for(const x of [20,27,73,81])for(let y=16;y<22;y++)w.tiles[y*w.w+x]=TILE.TRUNK;
   for(let x=0;x<w.w;x++)w.computeSkyTop(x);w.generated=true;
   world=game.world=w;game.map=new WorldMap(w);game.intro=null;Menu.close();game.paused=false;game.adminNightVision=true;
   game.mobs=[];game.npcs=[];game.boss=null;game.drops=[];game.particles=[];game.clock=0;game.time=.16;game.daylight=1;
   game.player.x=31*T;game.player.y=22*T-game.player.h;game.player.vx=game.player.vy=0;game.player.facing=1;
   game.zoom=2;game.cam={x:20*T,y:7*T};game.inventory.slots.fill(null);game.inventory.add(ITEM.ROD_IRON,1);game.inventory.add(ITEM.BAIT_INSECT,24);game.selected=0;
   game.inventoryUI.open=false;game.mapUI.open=false;game.showHelp=false;game.adminOpen=false;game.fishingLeft=false;updateFishing(game,0);
   game.mobs=[new Wildlife('salmon',40*T,24*T)];renderer.render(game);
   return {x:Math.round((37*T-game.cam.x)*game.zoom),y:Math.round((24*T-game.cam.y)*game.zoom)};
  });
  await page.mouse.move(aim.x,aim.y);await page.mouse.down();
  await page.evaluate(()=>{handleInteraction(1/60);if(game.fishing?.state!=='cast')throw Error('Actual click did not cast');});
  await page.mouse.up();
  await page.evaluate(()=>{
   for(let i=0;i<1500&&game.fishing?.state!=='bite';i++){game.clock+=1/60;updateFishing(game,1/60);for(const m of game.mobs)updateAquatic(m,1/60,game.world,game.player);}
   if(game.fishing?.state!=='bite')throw Error('Real fish did not bite');renderer.render(game);
  });
  await page.locator('#game').screenshot({path:'tests/fishing-game-bite.png'});
  await page.mouse.down();await page.evaluate(()=>{handleInteraction(1/60);if(game.fishing?.state!=='reel')throw Error('Actual click did not hook');});
  await page.mouse.up();
  await page.evaluate(()=>{
   const s=fishingSessions.get(fishingOwner());s.phase='warning';s.phaseTime=.7;s.progress=.35;s.tension=.53;fishingPublish(s);renderer.render(game);
  });
  await page.locator('#game').screenshot({path:'tests/fishing-game-fight.png'});
  const layouts=[];
  for(const width of [320,640,1280]){
   await page.setViewportSize({width,height:800});
   await page.waitForFunction(width=>canvas.width===width,width,{polling:25});
   layouts.push(await page.evaluate(()=>{
    const c=makeCanvas(canvas.width,canvas.height),ctx=c.getContext('2d'),overflow=[];
    const fillText=ctx.fillText.bind(ctx);ctx.fillText=function(text,x,y){if(x+ctx.measureText(text).width>c.width-12)overflow.push(text);fillText(text,x,y);};
    const s=game.fishing;for(const phase of ['calm','warning','surge','recovery']){game.fishing={...s,phase,fishKind:'caveeel'};drawFishingHud(ctx,game,c.width,c.height);}
    game.fishing=s;renderer.render(game);return {width:c.width,overflow};
   }));
   if(width===320)await page.locator('#game').screenshot({path:'tests/fishing-game-small.png'});
  }
  assert(layouts.every(l=>!l.overflow.length),JSON.stringify(layouts));
  assert.deepEqual(errors,[]);console.log(JSON.stringify({mouseCast:true,mouseHook:true,layouts}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
