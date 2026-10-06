const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({viewport:{width:1600,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&m.text().startsWith('[quadro]'))errors.push(m.text());});
 await page.goto('http://localhost/jogo-teste/');await page.waitForFunction(()=>typeof game==='object');
 await page.evaluate(()=>{finishOpening(game);Menu.root.hidden=true;game.paused=false;GAME_OPTIONS.shaders=true;});
 await page.waitForTimeout(1000);
 await page.evaluate(()=>{window.shaderLive={start:performance.now(),render:[],update:[]};const render=renderer.render,step=update;
   renderer.render=function(...a){const t=performance.now();const out=render.apply(this,a);shaderLive.render.push(performance.now()-t);return out;};
   update=function(...a){const t=performance.now();const out=step(...a);shaderLive.update.push(performance.now()-t);return out;};});
 await page.keyboard.down('KeyD');await page.waitForTimeout(1500);await page.keyboard.up('KeyD');await page.waitForTimeout(3500);
 const result=await page.evaluate(()=>{const s=shaderLive,elapsed=(performance.now()-s.start)/1000,avg=a=>a.reduce((x,y)=>x+y,0)/Math.max(1,a.length);
   return {elapsed,frames:s.render.length,observedFps:s.render.length/elapsed,renderMs:avg(s.render),updateMs:avg(s.update),gpu:!!renderer.gpuPostProcess?.gl,finite:Number.isFinite(game.player.x)&&Number.isFinite(game.cam.x)};});
 result.errors=errors;fs.writeFileSync('tests/shader-live-report.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));assert.deepEqual(errors,[]);assert.ok(result.finite&&result.gpu&&result.frames>10);
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
