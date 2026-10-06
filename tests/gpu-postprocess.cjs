const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.requestAnimationFrame=()=>1;});await page.goto('http://localhost/jogo-teste/');await page.waitForFunction(()=>typeof game==='object');
 const result=await page.evaluate(async()=>{
   const c=makeCanvas(256,128),ctx=c.getContext('2d'),mask=makeCanvas(256,128),mc=mask.getContext('2d');
   mc.fillStyle='#fff';mc.fillRect(0,0,256,64);
   const r={canvas:c,ctx,shaderBloomMask:mask,shaderBounds:{dx:0,dy:0,width:256,height:128}},checks={};
   const fill=()=>{ctx.fillStyle='#444';ctx.fillRect(0,0,256,128);ctx.fillStyle='#fff8d0';ctx.fillRect(120,20,24,32);ctx.fillRect(120,78,24,32);};
   const at=(x,y)=>[...ctx.getImageData(x,y,1,1).data];
   fill();checks.gpuUsed=drawGpuPostProcess(r,256,128,1);checks.contextAvailable=!!r.gpuPostProcess.gl;
   checks.midtoneUnchanged=at(30,30)[0]===68;checks.highlightGlow=at(119,36)[0]>68;
   checks.caveMasked=at(119,92)[0]===68;checks.imageOrientation=at(124,25)[0]>240&&at(124,60)[0]===68;
   const intensity=RENDER_STYLE.bloom.intensity;RENDER_STYLE.bloom.intensity=0;
   c.width=2048;c.height=8;mask.width=2048;mask.height=8;mc.fillStyle='#fff';mc.fillRect(0,0,2048,8);r.shaderBounds={dx:0,dy:0,width:2048,height:8};
   for(let x=0;x<2048;x++){ctx.fillStyle=x%2?'#224466':'#aacc88';ctx.fillRect(x,0,1,8);}const before=ctx.getImageData(0,0,2048,8).data;
   drawGpuPostProcess(r,2048,8,1);const after=ctx.getImageData(0,0,2048,8).data;
   checks.pixelGridPreserved=before.every((v,i)=>Math.abs(v-after[i])<=1);RENDER_STYLE.bloom.intensity=intensity;
   const atlas=shaderRimSprite(renderer.tex.blocks[TILE.DIRT],game.time,true),data=atlas.getContext('2d').getImageData(0,0,atlas.width,atlas.height).data;
   let stray=0,top=0;for(let col=0;col<16;col++)for(let y=MARGIN+4;y<MARGIN+T;y++)for(let x=MARGIN;x<MARGIN+T;x++)stray+=data[((SPR+y)*atlas.width+col*SPR+x)*4+3];
   for(let y=0;y<MARGIN+4;y++)for(let x=0;x<atlas.width;x++)top+=data[((SPR+y)*atlas.width+x)*4+3];
   checks.noInternalTileRims=stray===0;checks.exposedTopRimSurvives=top>0;
   const ext=r.gpuPostProcess.gl.getExtension('WEBGL_lose_context');
   if(ext){ext.loseContext();await new Promise(resolve=>setTimeout(resolve,100));checks.contextLossFallsBack=drawGpuPostProcess(r,2048,8,1)===false;
     ext.restoreContext();await new Promise(resolve=>setTimeout(resolve,150));checks.contextRestores=drawGpuPostProcess(r,2048,8,1)===true;}
   return checks;
 });console.log(JSON.stringify({checks:result,errors},null,2));assert.deepEqual(errors,[]);for(const [name,value]of Object.entries(result))assert.ok(value,name);
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
