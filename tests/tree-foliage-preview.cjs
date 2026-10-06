// Local visual fixture; fresh browser storage, no player save is changed.
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1600,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error'&&m.text().startsWith('[quadro]'))errors.push(m.text());});
  await page.addInitScript(()=>{window.requestAnimationFrame=()=>1;});
  await page.goto('http://localhost/jogo-teste/');await page.waitForFunction(()=>typeof game==='object');
  await page.evaluate(()=>drawBravoraMenu(renderer.ctx,canvas.width,canvas.height));
  await page.screenshot({path:'tests/menu-new-trees.png'});
  const result=await page.evaluate(()=>{
   finishOpening(game);Menu.root.hidden=true;game.paused=true;game.intro.active=false;
   world=game.world=new World(180,110,75413,{lazy:true});world.surface.fill(52);world.lootChests=[];world.npcSpawns=[];
   for(let x=0;x<world.w;x++)for(let y=52;y<world.h;y++){
    world.tiles[y*world.w+x]=y===52?TILE.GRASS:y<58?TILE.DIRT:TILE.STONE;world.walls[y*world.w+x]=WALL.DIRT;
   }
   const trees=[];
   for(const [start,biome,kind,height]of [[24,BIOME.JUNGLE,'jungle',9],[36,BIOME.FOREST,'pine',8],[48,BIOME.SNOW,'snowPine',8],[61,BIOME.SAVANNA,'acacia',7]]){
    let x=start;while(canopyFor(x,biome,world.seed).kind!==kind)x++;
    trees.push({x,biome,kind,height});world.biome[x]=biome;
    for(let y=52-height;y<52;y++)world.tiles[y*world.w+x]=TILE.TRUNK;
   }
   for(let x=0;x<world.w;x++)world.computeSkyTop(x);
   game.cam={x:19*T,y:29*T};game.zoom=2;game.time=.2;game.daylight=1;
   game.weather=createWeather();game.weather.rain=0;game.weather.wind=18;
   game.mobs=[];game.npcs=[];game.drops=[];game.particles=[];game.fallingTrees=[];
   game.crashSite=null;game.objective=null;game.adminNightVision=false;game.showHelp=false;game.target.visible=false;
   game.player.x=43*T;game.player.y=52*T-game.player.h;game.player.stepOffset=0;game.player.grounded=true;
   game.map=new WorldMap(world);renderer.bg=null;game.environment=null;
   GAME_OPTIONS.shaders=true;GAME_OPTIONS.shake=false;GAME_OPTIONS.showFps=false;
   world.computeLight(44,48);world.composeLight(1);renderer.render(game);
   window.previewTrees=trees;
   return {species:trees.map(t=>t.kind)};
  });
  await page.screenshot({path:'tests/tree-foliage-world.png'});
  result.checks=await page.evaluate(()=>{
   const before=previewTrees.map(t=>canopyFor(t.x,t.biome,world.seed));
   for(let i=0;i<24;i++){game.cam.x+=1;game.weather.wind=Math.sin(i*.2)*30;renderer.render(game);}
   const stable=previewTrees.every((t,i)=>before[i]===canopyFor(t.x,t.biome,world.seed));
   const cuts=[];
   for(const t of previewTrees){startTreeFall(game,t.x,50);const f=game.fallingTrees.at(-1);cuts.push(!!f.trunkArt&&f.canopy.kind===t.kind);}
   updateFallingTrees(game,.1);renderer.render(game);
   return {stableAcrossCameraAndWind:stable,allSpeciesCutWithMatchingArt:cuts.every(Boolean),noFrameError:!frame.lastError};
  });
  assert.deepEqual(errors,[]);for(const [k,v]of Object.entries(result.checks))assert.ok(v,k);
  console.log(JSON.stringify({...result,errors},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
