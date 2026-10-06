const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
const page=await browser.newPage({viewport:{width:1100,height:760}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&m.text().startsWith('[quadro]'))errors.push(m.text());});
await page.addInitScript(()=>{window.requestAnimationFrame=()=>1;});await page.goto('http://localhost/jogo-teste/');await page.waitForFunction(()=>typeof game==='object');
const result=await page.evaluate(()=>{
 finishOpening(game);Menu.root.hidden=true;game.paused=true;game.intro.active=false;game.openingComplete=true;
 const w=new World(320,220,83124,{lazy:true});w.surface.fill(45);w.biome.fill(BIOME.FOREST);w.biome.fill(BIOME.DESERT,160);w.lootChests=[];
 for(let y=45;y<w.h;y++)for(let x=0;x<w.w;x++)w.tiles[y*w.w+x]=y===45?(x<160?TILE.GRASS:TILE.SAND):TILE.STONE;
 for(let y=67;y<=81;y++)for(let x=15;x<290;x++){w.tiles[y*w.w+x]=TILE.AIR;w.walls[y*w.w+x]=WALL.STONE;}
 for(let y=100;y<=116;y++)for(let x=15;x<290;x++){w.tiles[y*w.w+x]=TILE.AIR;w.walls[y*w.w+x]=WALL.STONE;}
 for(let y=25;y<45;y++)w.tiles[y*w.w+115]=TILE.TRUNK;
 buildHouse(w,()=>.6,128,45,12,9,VILLAGE_STYLES.default);
 for(let x=0;x<w.w;x++)w.computeSkyTop(x);
 world=game.world=w;game.player=new Player(120*T,45*T-PLAYER_H);game.cam={x:106*T,y:24*T};game.zoom=2;
 game.mobs=[];game.npcs=[];game.drops=[];game.particles=[];game.crashSite=null;game.objective=null;game.showHelp=false;game.target.visible=false;game.time=.22;game.daylight=1;game.weather=createWeather();game.weather.triggered=true;renderer.bg=null;
 w.computeLight(135,62);w.composeLight(1);const checks={},shots={};
 const tick=n=>{for(let i=0;i<n;i++){updateWeather(game,1/60);updateEnvironment(game,1/60);}};
 setWeatherEvent(game,'storm',180);const before=game.weather.rain;tick(1);checks.gradualRain=game.weather.rain>before&&game.weather.rain<.03;tick(1000);
 checks.rainPopulated=game.weather.drops.length>0;
 checks.rainBoundaryFeather=weatherRainAt(game,159*T,40*T)<weatherRainAt(game,150*T,40*T);
 checks.roofShelter=!weatherExposed(w,134*T,41*T)&&weatherRainAt(game,134*T,41*T)===0;
 checks.deepShelter=weatherRainAt(game,125*T,75*T)===0;
 checks.rainParticlesSheltered=game.weather.drops.every(p=>weatherExposed(w,p.x,p.y));
 checks.windShelter=Math.abs(environmentWind(game,134*T,41*T).x)<Math.abs(environmentWind(game,120*T,35*T).x)*.3;
 game.weather.thunder=0;tick(1);checks.lightningHasDelay=game.weather.flash>.8&&game.weather.lastThunderDelay>.5;
 renderer.render(game);shots.storm=renderer.canvas.toDataURL();
 setWeatherEvent(game,'sandstorm',180);tick(1000);
 checks.desertOnly=weatherSandAt(game,155*T,40*T)===0&&weatherSandAt(game,169*T,40*T)>.7;
 checks.boundaryFeather=weatherSandAt(game,160*T,40*T)<weatherSandAt(game,165*T,40*T);
 checks.sandShelter=weatherSandAt(game,169*T,75*T)===0;
 checks.sandParticlesDesert=game.weather.sandParticles.every(p=>w.biomeAt(Math.floor(p.x/T))===BIOME.DESERT);
 game.cam.x=150*T;tick(180);renderer.render(game);shots.sandstorm=renderer.canvas.toDataURL();
 setWeatherEvent(game,'tornado',80);game.weather.funnel.x=158*T;game.weather.funnel.y=45*T;tick(360);
 const f=game.weather.funnel,v1=environmentWind(game,f.x-30,f.y-f.height*.45),v2=environmentWind(game,f.x+30,f.y-f.height*.45);
 checks.rotationalWind=v1.y*v2.y<0;checks.funnelVisible=f.strength>.7;
 renderer.render(game);shots.tornado=renderer.canvas.toDataURL();
 setWeatherEvent(game,'calm',180);const strength=game.weather.funnel.strength;tick(60);checks.funnelFades=game.weather.funnel.strength<strength&&game.weather.funnel.strength>0;
 const habitats=new Set(),counts={};for(let x=16;x<289;x++)for(const y of [68,80,101,115]){const h=caveHabitat(w,x,y);habitats.add(h.kind);const a=environmentDecoration(w,x,y===80?82:y===115?117:y-2,y===68||y===101);if(a)counts[a.envKind]=(counts[a.envKind]||0)+1;}
 checks.fourCaveHabitats=habitats.size===4;checks.caveFlora=!!counts.mushroom&&!!counts.crystal&&!!counts.fern&&!!counts.stalactite;
 game.cam={x:28*T,y:61*T};game.player.x=43*T;game.player.y=78*T;w.computeLight(50,75);w.composeLight(1);tick(180);renderer.render(game);shots.caves=renderer.canvas.toDataURL();
 checks.particleBudget=game.environment.particles.length<=ENVIRONMENT.particleLimit&&game.weather.drops.length<=ENVIRONMENT.weather.dropLimit;
 checks.emissiveLight=w.environmentLight.some(c=>c.some(v=>v>0));checks.nearestNeighbor=renderer.ctx.imageSmoothingEnabled===false;
 const originalRandom=Math.random;Math.random=()=>.99;
 game.weather.event='calm';game.weather.extremeCooldown=300;game.player.x=170*T;chooseWeather(game);
 checks.extremeCooldown=game.weather.event!=='sandstorm'&&game.weather.event!=='tornado';
 chooseWeather(game);checks.calmBetweenEvents=game.weather.event==='calm'&&game.weather.timer>=ENVIRONMENT.weather.calmMin;
 game.player.x=120*T;game.weather.extremeCooldown=0;chooseWeather(game);checks.forestNeverSand=game.weather.event!=='sandstorm';Math.random=originalRandom;
 const audioCalls=[];game.crashAudio={setRain:(level,exposure)=>audioCalls.push({level,exposure}),rainTick:()=>{},thunder:()=>{}};
 setWeatherEvent(game,'rain',120);game.weather.rain=.8;game.player.x=170*T;updateWeather(game,1/60);
 checks.desertRainSilent=audioCalls.at(-1).level===0;
 game.player.x=134*T;game.player.y=40*T;game.weather.exposure=0;updateWeather(game,1/60);
 checks.shelterAudio=audioCalls.at(-1).level<.2&&audioCalls.at(-1).exposure<.1;
 game.crashAudio=null;setWeatherEvent(game,'calm',120);
 game.environment.particles.push({x:134*T,y:41*T,surface:true,vx:0,vy:0,life:5,type:'pollen'});
 updateEnvironment(game,0);checks.shelteredPollenRemoved=!game.environment.particles.some(p=>p.surface&&!weatherExposed(w,p.x,p.y));
 const shifts=[],fakeCtx={drawImage:(...args)=>shifts.push(args[5])};
 game.weather.wind=0;drawEnvironmentSprite(fakeCtx,game,environmentSprite('fern',0),120*T,43*T);
 const still=shifts.slice();shifts.length=0;game.weather.wind=100;drawEnvironmentSprite(fakeCtx,game,environmentSprite('fern',0),120*T,43*T);
 checks.plantsRespondToWind=shifts.some((v,i)=>v!==still[i])&&shifts.at(-1)===still.at(-1);
 game.player.x=43*T;game.player.y=78*T;
 for(let kind=0;kind<4;kind++){
   let found=null;for(let x=25;x<280&&!found;x++)for(const y of [80,115])if(caveHabitat(w,x,y).kind===kind){found={x,y};break;}
   if(found){game.cam={x:(found.x-16)*T,y:(found.y-17)*T};game.player.x=found.x*T;game.player.y=(found.y-2)*T;
     w.setTile(found.x,found.y-1,TILE.TORCH);
     w.computeLight(found.x,found.y);w.composeLight(1);collectEnvironment(game);renderer.render(game);shots['habitat-'+kind]=renderer.canvas.toDataURL();
     w.setTile(found.x,found.y-1,TILE.AIR);}
 }
 const start=performance.now();for(let i=0;i<20;i++)renderer.render(game);const renderMs=(performance.now()-start)/20;
 return {checks,counts,renderMs,shots,particles:game.environment.particles.length};
});for(const [name,data]of Object.entries(result.shots))fs.writeFileSync('tests/environment-'+name+'.png',Buffer.from(data.split(',')[1],'base64'));delete result.shots;
result.errors=errors;fs.writeFileSync('tests/environment-report.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));assert.deepEqual(errors,[]);for(const [k,v]of Object.entries(result.checks))assert.ok(v,k);
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
