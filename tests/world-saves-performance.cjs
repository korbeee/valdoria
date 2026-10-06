const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'playwright');
const {spawn}=require('node:child_process'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const dir=path.resolve('tests/save-performance-'+Date.now());fs.mkdirSync(dir);
const server=spawn('C:/xampp/php/php.exe',['-S','127.0.0.1:18924','-t',process.cwd()],{env:{...process.env,VALDORIA_SAVE_DIR:dir},stdio:'ignore'});
(async()=>{let browser;try{
 for(let i=0;i<100;i++){try{await fetch('http://127.0.0.1:18924/server/world-saves.php');break;}catch{await new Promise(r=>setTimeout(r,50));}}
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.nativeFrame=requestAnimationFrame.bind(window);requestAnimationFrame=()=>0;localStorage.setItem('valdoria.autoconnect','0');});
 await page.goto('http://127.0.0.1:18924/',{waitUntil:'domcontentloaded'});
 const result=await page.evaluate(async(debug)=>{
  const w=new World(8400,2400,174,{lazy:true});w.tiles.fill(TILE.STONE);w.tiles.fill(TILE.AIR,0,w.w*180);w.surface.fill(180);w.biome.fill(BIOME.FOREST);w.skyTop.fill(180);w.lava=new Uint8Array(w.tiles.length);w.lavaActive=new Set();w.lavaFlow=new Map();w.generated=true;
  world=game.world=w;game.worldSize='grande';game.map=new WorldMap(w);game.intro=null;game.openingComplete=true;game.mobs=[];game.npcs=[];game.boss=null;game.mount=null;game.drops=[];game.fallingTrees=[];game.crashSite=null;game.lavaEffects=null;renderer.bg=null;player.x=4200*T;player.y=180*T-player.h-.01;player.vx=player.vy=0;
  Menu.close();game.paused=false;updateCamera(0,true);update(1/60);renderer.render(game);
  const now=new Date().toISOString();WorldSaves.active={id:crypto.randomUUID(),name:'Desempenho',createdAt:now,savedAt:now};WorldSaves.activeWorld=w;
  const copyStats=[],canvasStats=[],originalSet=Uint8Array.prototype.set,originalPixels=CanvasRenderingContext2D.prototype.getImageData;
  CanvasRenderingContext2D.prototype.getImageData=function(...args){const started=performance.now(),result=originalPixels.apply(this,args);canvasStats.push({w:this.canvas.width,h:this.canvas.height,ms:performance.now()-started});return result;};
  Uint8Array.prototype.set=function(...args){const started=performance.now(),result=originalSet.apply(this,args);if(this.byteLength>1048576)copyStats.push({bytes:this.byteLength,ms:performance.now()-started});return result;};
  await WorldSaves.save(false);const firstCapture=WorldSaves.captureMs;Uint8Array.prototype.set=originalSet;
  CanvasRenderingContext2D.prototype.getImageData=originalPixels;
  if(debug)return {debug:true,firstCapture,copyStats,canvasStats,worldFields:Object.entries(w).map(([key,value])=>({key,type:value?.constructor?.name,size:value?.byteLength||value?.size||value?.length})),gameFields:Object.entries(game).map(([key,value])=>({key,type:value?.constructor?.name,size:value?.byteLength||value?.size||value?.length}))};
  const ticks=[],frames=[];let alive=true,last=performance.now(),loop;
  loop=timestamp=>{if(!alive)return;frames.push(timestamp-last);last=timestamp;update(1/60);renderer.render(game);window.nativeFrame(loop);};window.nativeFrame(loop);
  await new Promise(r=>setTimeout(r,700));const baseline=frames.splice(0);let latest=performance.now();const pulse=setInterval(()=>{const current=performance.now();ticks.push(current-latest);latest=current;},8);
  const clock=game.clock,startX=player.x,started=performance.now();input.keys.add('KeyD');await WorldSaves.save(false);input.keys.delete('KeyD');const duration=performance.now()-started,capture=WorldSaves.captureMs;
  alive=false;clearInterval(pulse);
  if(game.paused||game.clock<=clock+.2)throw Error('Automatic save stopped gameplay');if(w.tiles.byteLength!==8400*2400)throw Error('Terrain buffer detached');
  if(player.x<=startX+50)throw Error('Movement did not respond during saving');
  const sorted=frames.slice().sort((a,b)=>a-b),p95=sorted[Math.floor(sorted.length*.95)]||0;
  return {duration,firstCapture,copyStats,capture,frames:frames.length,gameSeconds:game.clock-clock,maxFrame:Math.max(...frames),p95,baselineMax:Math.max(...baseline),maxHeartbeat:Math.max(...ticks),timer:WorldSaves.autosaveInterval,id:WorldSaves.active.id};
 },!!process.env.DEBUG_FIRST_CAPTURE);
 if(result.debug){console.log(JSON.stringify(result));return;}
 assert.equal(result.timer,300000);assert(result.firstCapture<100,'First capture blocked too long: '+JSON.stringify(result));assert(result.capture<50,'Capture blocked too long: '+JSON.stringify(result));assert(result.frames>15,'Frames stopped: '+JSON.stringify(result));
 await page.route('**/server/world-saves.php?action=save*',async route=>{await new Promise(r=>setTimeout(r,800));await route.continue();});
 await page.evaluate(()=>Menu.openPause());await page.locator('[data-action="save-world"]').click();await page.locator('#world-save-overlay').waitFor({state:'visible'});
 await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>game.paused),true);await page.screenshot({path:'tests/world-save-loading.png'});
 for(const width of [320,640,1280]){await page.setViewportSize({width,height:800});assert(await page.evaluate(()=>document.querySelector('#world-save-overlay').scrollWidth<=innerWidth));}
 await page.locator('#world-save-overlay').waitFor({state:'hidden',timeout:60000});assert.equal(await page.evaluate(()=>game.paused),true);
 await page.unroute('**/server/world-saves.php?action=save*');await page.evaluate(()=>Menu.resume());
 await page.route('**/server/world-saves.php?action=save*',async route=>{await new Promise(r=>setTimeout(r,300));await route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({error:'Erro de teste'})});});
 await page.evaluate(()=>{window.failedSave=WorldSaves.save(false).catch(()=>false);});await page.locator('#world-save-indicator').waitFor({state:'visible'});assert.equal(await page.locator('#world-save-overlay').isVisible(),false);assert.equal(await page.evaluate(()=>game.paused),false);await page.evaluate(()=>window.failedSave);assert.equal(await page.locator('#world-save-indicator').isVisible(),false);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({...result,manualLoading:true,responsiveLayout:true,failureKeepsGameRunning:true}));
 }finally{if(browser)await browser.close();server.kill();await new Promise(r=>setTimeout(r,200));fs.rmSync(dir,{recursive:true,force:true});}})().catch(e=>{console.error(e);process.exitCode=1;});
