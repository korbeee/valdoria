const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
const label=process.argv.includes('--before')?'before':'after';
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await b.newPage({viewport:{width:1600,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.requestAnimationFrame=()=>1;let seed=916;Math.random=()=>((seed=Math.imul(seed,1664525)+1013904223|0)>>>0)/4294967296;});
 await page.goto('http://localhost/jogo-teste/');await page.waitForFunction(()=>typeof game==='object');
 const result=await page.evaluate(()=>{
   finishOpening(game);Menu.root.hidden=true;game.intro.active=false;game.paused=true;game.time=.22;game.daylight=1;game.weather=createWeather();game.weather.triggered=true;
   const timings={},originals={};for(const name of ['prepareShaderFrame','shaderCanopyShade','shaderSunField','drawShaderGrade','drawShaderBloom','drawShaderLighting','drawGpuPostProcess']){
     const fn=window[name];originals[name]=fn;window[name]=function(...args){const start=performance.now();const r=fn(...args);(timings[name]??=[]).push(performance.now()-start);return r;};
   }
   const run=(enabled,moving)=>{GAME_OPTIONS.shaders=enabled;const x=game.cam.x;for(let i=0;i<12;i++)renderer.render(game);for(const k in timings)timings[k]=[];
     const times=[];for(let i=0;i<60;i++){if(moving)game.cam.x=x+i*2;const start=performance.now();renderer.render(game);times.push(performance.now()-start);}
     game.cam.x=x;const avg=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:0;const sorted=times.slice().sort((a,b)=>a-b);
     return {meanMs:avg(times),p95Ms:sorted[Math.floor(sorted.length*.95)],passes:Object.fromEntries(Object.entries(timings).map(([k,v])=>[k,{meanMs:avg(v),calls:v.length}]))};};
   const on=run(true,false),moving=run(true,true),off=run(false,false);GAME_OPTIONS.shaders=true;renderer.render(game);
   for(const [name,fn] of Object.entries(originals))window[name]=fn;
   const gl=renderer.gpuPostProcess?.gl,info=gl?.getExtension('WEBGL_debug_renderer_info');
   return {on,moving,off,gpuPostProcess:!!gl,adapter:info?gl.getParameter(info.UNMASKED_RENDERER_WEBGL):null};
 });await page.screenshot({path:`tests/shader-performance-${label}.png`});result.errors=errors;
 fs.writeFileSync(`tests/shader-performance-${label}.json`,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));assert.deepEqual(errors,[]);
 }finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
