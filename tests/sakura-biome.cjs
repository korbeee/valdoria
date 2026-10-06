const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({viewport:{width:1600,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&m.text().startsWith('[quadro]'))errors.push(m.text());});
 await page.addInitScript(()=>{window.requestAnimationFrame=()=>1;});await page.goto('http://localhost/jogo-teste/');await page.waitForFunction(()=>typeof game==='object');
 const result=await page.evaluate(()=>{
  const checks={};finishOpening(game);Menu.root.hidden=true;game.intro.active=false;game.paused=true;
  checks.biomePlacement=Array.from({length:24},(_,i)=>{
   const w=new World(1800,180,i*713+21,{lazy:true});w.generateSteps().next();
   return w.biome.includes(BIOME.SAKURA)&&w.biome.includes(BIOME.SAVANNA)&&w.biomeAt(900)===BIOME.FOREST&&w.biomeAt(1799)===BIOME.OCEAN;
  }).every(Boolean);
  const a=new World(1800,180,75413),b=new World(1800,180,75413);
  checks.deterministicWorld=a.tiles.every((v,i)=>v===b.tiles[i])&&a.biome.every((v,i)=>v===b.biome[i]);
  let trees=0,grass=0,petals=0,cx=-1,best=-1;
  for(let x=20;x<a.w-20;x++)if(a.biomeAt(x)===BIOME.SAKURA){
   if(a.getTile(x,a.surface[x])===TILE.SAKURA_GRASS)grass++;
   if(sakuraGroundPetals(a,x,a.surface[x]))petals++;
   if(a.getTile(x,a.surface[x]-1)===TILE.TRUNK){trees++;if(canopyFor(x,BIOME.SAKURA,a.seed).kind!=='sakura')throw Error('Non-cherry tree');}
   let score=0;for(let dx=-19;dx<=19;dx++){const xx=x+dx;if(a.biomeAt(xx)!==BIOME.SAKURA)score-=5;else if(a.getTile(xx,a.surface[xx]-1)===TILE.TRUNK)score++;}
   if(score>best){best=score;cx=x;}
  }
  checks.naturalTreesAndGrass=trees>2&&grass>30;checks.petalCoverage=petals>15;
  checks.tilePhysicsAndMining=SOLID[TILE.SAKURA_GRASS]===1&&TILE_DEFS[TILE.SAKURA_GRASS].drop===ITEM.DIRT&&matOf(TILE.SAKURA_GRASS)==='grass';
  checks.biomeBackgroundAndMap=BG_BIOMES[BIOME.SAKURA].length===4&&BIOME_NAMES[BIOME.SAKURA]==='Vale das Cerejeiras'&&TILE_DEFS[TILE.SAKURA_GRASS].color[1]>TILE_DEFS[TILE.SAKURA_GRASS].color[0];
  const w=new World(40,70,313,{lazy:true});w.surface.fill(30);w.biome.fill(BIOME.SAKURA);
  for(let x=0;x<w.w;x++){w.setTile(x,30,TILE.SAKURA_GRASS);w.computeSkyTop(x);}
  let px=3;while(px<36&&!sakuraGroundPetals(w,px,30))px++;
  checks.exposedPetals=!!sakuraGroundPetals(w,px,30);
  w.biome[px]=BIOME.FOREST;checks.biomeExclusive=!sakuraGroundPetals(w,px,30);w.biome[px]=BIOME.SAKURA;
  w.water[29*w.w+px]=WATER_MAX;checks.noUnderwaterPetals=!sakuraGroundPetals(w,px,30);w.water[29*w.w+px]=0;
  w.setTile(px,25,TILE.PLANKS);checks.noIndoorPetals=!sakuraGroundPetals(w,px,30);w.setTile(px,25,TILE.AIR);
  w.setTile(px,29,TILE.CHEST);checks.noCoveredProps=!sakuraGroundPetals(w,px,30);w.setTile(px,29,TILE.AIR);
  w.setTile(px,30,TILE.DIRT);const oldRandom=Math.random;try{Math.random=()=>0;w.growGrass(px,30,2,2);}finally{Math.random=oldRandom;}
  checks.regrowsMintGrass=w.getTile(px,30)===TILE.SAKURA_GRASS;
  w.setTile(px,29,TILE.STONE);try{Math.random=()=>0;w.growGrass(px,30,2,2);}finally{Math.random=oldRandom;}
  checks.coveredGrassBecomesDirt=w.getTile(px,30)===TILE.DIRT;
  checks.noSandstorm=desertWeight(a,cx*T)===0;checks.fauna=wildlifePool(a,cx,false).includes('rabbit');
  world=game.world=a;game.cam={x:(cx-25)*T,y:(a.surface[cx]-23)*T};game.zoom=2;
  game.player.x=cx*T;game.player.y=a.surface[cx]*T-game.player.h;game.player.grounded=true;
  game.mobs=[];game.npcs=[];game.drops=[];game.particles=[];game.fallingTrees=[];game.crashSite=null;game.objective=null;
  game.showHelp=false;game.target.visible=false;game.time=.2;game.daylight=1;game.weather=createWeather();game.weather.wind=8;
  game.map=new WorldMap(a);game.map.revealAll();game.environment=null;renderer.bg=null;GAME_OPTIONS.shaders=true;GAME_OPTIONS.shake=false;
  a.computeLight(cx,a.surface[cx]);a.composeLight(1);renderer.render(game);
  return {checks,naturalTrees:trees,grassColumns:grass,petalColumns:petals,location:{x:cx,y:a.surface[cx]},seed:a.seed};
 });
 await page.screenshot({path:'tests/sakura-biome.png'});
 result.checks.cameraAndLighting=await page.evaluate(()=>{for(let i=0;i<12;i++){game.cam.x+=3;renderer.render(game);}GAME_OPTIONS.shaders=false;renderer.render(game);return !frame.lastError;});
 result.errors=errors;fs.writeFileSync('tests/sakura-biome-report.json',JSON.stringify(result,null,2));
 console.log(JSON.stringify(result,null,2));assert.deepEqual(errors,[]);for(const [k,v]of Object.entries(result.checks))assert.ok(v,k);
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
