const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
const page=await browser.newPage({viewport:{width:1000,height:760}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{window.requestAnimationFrame=()=>1;});
await page.goto('http://localhost/jogo-teste/');await page.waitForFunction(()=>typeof game==='object');
const result=await page.evaluate(()=>{
 finishOpening(game);Menu.root.hidden=true;game.paused=true;game.intro.active=false;
 const w=new World(180,150,512,{lazy:true});w.surface.fill(45);w.biome.fill(BIOME.SAVANNA);w.lootChests=[];
 for(let y=45;y<w.h;y++)w.tiles.fill(y===45?TILE.GRASS:TILE.DIRT,y*w.w,(y+1)*w.w);
 buildWell(w,()=>.2,80);for(let x=0;x<w.w;x++)w.computeSkyTop(x);
 world=game.world=w;game.mobs=[];game.npcs=[];game.drops=[];game.particles=[];game.crashSite=null;game.objective=null;game.weather=createWeather();game.time=.2;game.daylight=1;game.showHelp=false;game.target.visible=false;
 const controls={keys:new Set(),down(k){return this.keys.has(k);}};
 const states=[];const run=(p,keys,n)=>{controls.keys=new Set(keys);for(let i=0;i<n;i++){p.update(1/60,controls,w);if(p.collides(w,p.x,p.y))throw Error('Body entered solid terrain');}return {x:p.x,y:p.y,feet:p.y+p.h,onGround:p.onGround,climbing:p.climbing};};
 for(const holdUp of [true,false])for(const side of ['KeyA','KeyD']){
  const p=game.player=new Player(81*T+1,43*T-PLAYER_H);p.onGround=false;
  states.push({side,holdUp,stage:'enter',...run(p,['KeyS'],360)});
  states.push({side,holdUp,stage:'ascend',...run(p,['KeyW'],540)});
  states.push({side,holdUp,stage:'exit',...run(p,holdUp?['KeyW',side]:[side],45)});
  states.push({side,holdUp,stage:'settle',...run(p,[],90)});
 }
 const checks={};
 // No meio do poço não pode escalar a parede lateral nem atravessar o telhado.
 const trapped=new Player(81*T+1,51*T-PLAYER_H);
 const trappedY=trapped.y;run(trapped,['KeyD'],60);
 checks.noWallClimbing=Math.abs(trapped.y-trappedY)<.01&&trapped.x<82*T;
 w.setTile(81,41,TILE.STONE);
 const roofed=new Player(81*T+1,45*T-PLAYER_H+1);
 run(roofed,['KeyW','KeyD'],90);
 checks.lowCeilingBlocksExit=roofed.x+roofed.w<=82*T&&!roofed.collides(w,roofed.x,roofed.y);
 w.setTile(81,41,TILE.AIR);
 game.zoom=3;game.cam={x:74*T,y:34*T};renderer.bg=null;w.computeLight(81,45);w.composeLight(1);renderer.render(game);
 return {states,checks,image:renderer.canvas.toDataURL()};
});fs.writeFileSync('tests/ladder-exit.png',Buffer.from(result.image.split(',')[1],'base64'));delete result.image;
console.log(JSON.stringify({...result,errors},null,2));assert.deepEqual(errors,[]);
for(const s of result.states.filter(s=>s.stage==='exit'))assert.ok(s.side==='KeyA'?s.x<80*16-14:s.x>83*16,'Cannot exit well '+s.side);
for(const s of result.states.filter(s=>s.stage==='settle'))assert.ok(s.onGround&&!s.climbing,'Did not return to walking');
for(const [name,passed]of Object.entries(result.checks))assert.ok(passed,name);
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
