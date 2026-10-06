const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>window.requestAnimationFrame=()=>0);await page.goto('http://localhost/jogo-teste/');await page.waitForFunction(()=>typeof game==='object');
 const result=await page.evaluate(()=>{
  const checks=[],check=(v,s)=>{if(!v)throw Error(s);checks.push(s);};
  const w=new World(96,64,4242,{lazy:true});ensureLava(w);
  for(let y=9;y<40;y++)for(let x=4;x<84;x++)w.setLavaLevel(x,y,WATER_MAX);
  for(let x=3;x<=84;x++)w.setTile(x,40,TILE.OBSIDIAN);
  for(let y=8;y<=40;y++){w.setTile(3,y,TILE.OBSIDIAN);w.setTile(84,y,TILE.OBSIDIAN);}
  game.world=w;game.lavaEffects=null;game.player.x=44*T;game.player.y=11*T;
  const fx=lavaEffects(game),frame=3;
  for(const [x,y] of [[0,0],[255.5,63.5],[37.2,18.8],[-4.1,-22.9]]){
   check(Math.abs(lavaNoise(x,y,8,1931,3)-lavaNoise(x+LAVA_W,y,8,1931,3))<1e-10,'Textura contínua na repetição horizontal '+x);
   check(Math.abs(lavaNoise(x,y,8,1931,3)-lavaNoise(x,y+LAVA_H,8,1931,3))<1e-10,'Textura contínua na repetição vertical '+y);
  }
  const c=makeCanvas(1280,480),ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;
  const runDraw=()=>{for(let y=10;y<40;y++)for(let x=4;x<84;x++)x+=drawLavaRun(ctx,w,x,y,83,frame)-1;};
  ctx.translate(-4*T,-10*T);runDraw();const batched=ctx.getImageData(0,0,1280,480).data;
  ctx.clearRect(4*T,10*T,1280,480);
  for(let y=10;y<40;y++)for(let x=4;x<84;x++)TILE_DRAW[TILE.LAVA](ctx,w,x,y,frame);
  const single=ctx.getImageData(0,0,1280,480).data;
  check(batched.every((v,i)=>v===single[i]),'Faixas são idênticas pixel a pixel ao desenho individual');
  let draws=0,clips=0;const realDraw=ctx.drawImage.bind(ctx),realClip=ctx.clip.bind(ctx);
  ctx.drawImage=(...args)=>{draws++;realDraw(...args);};ctx.clip=(...args)=>{clips++;realClip(...args);};
  runDraw();check(draws===180&&clips===0,'Rio de 2400 blocos usa 180 desenhos e nenhum recorte');
  let lavaDraws=0;ctx.drawImage=(...args)=>{if(args[0]===LAVA_ART.body||args[0]===LAVA_ART.surface)lavaDraws++;realDraw(...args);};
  const rendererCtx=renderer.ctx;renderer.ctx=ctx;
  renderer.drawWorld(game,4*T,10*T,1280,480);renderer.ctx=rendererCtx;
  check(lavaDraws<1000,'Renderizador do jogo usa as faixas no rio, incluindo a superfície');
  ctx.drawImage=(...args)=>{draws++;realDraw(...args);};
  const oldDraw=()=>{for(let y=10;y<40;y++)for(let x=4;x<84;x++)for(let k=0;k<WAVE.per;k++){
   ctx.save();ctx.beginPath();ctx.rect(x*T+k*T/WAVE.per,y*T,T/WAVE.per,T);ctx.clip();
   ctx.drawImage(LAVA_ART.body,(x&15)*T,frame*LAVA_H+(y&15)*T,T,T,x*T,y*T,T,T);ctx.restore();
  }};
  const measure=fn=>{const times=[];for(let i=0;i<7;i++){const t=performance.now();fn();ctx.getImageData(0,0,1,1);times.push(performance.now()-t);}times.sort((a,b)=>a-b);return times[3];};
  oldDraw();runDraw();const before=measure(oldDraw),after=measure(runDraw);
  check(after<before,'Renderização otimizada mais rápida no mesmo navegador');
  ctx.drawImage=realDraw;ctx.clip=realClip;
  // Superfície e ondas continuam recortadas na altura real, sem afetar o fundo.
  ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,c.width,c.height);ctx.translate(-4*T,-8*T);
  waveImpulse(fx,44*T,9*T,170,18);updateWaterWaves(fx,.04);
  for(let y=8;y<=40;y++)for(let x=3;x<=84;x++)if(w.hasLava(x,y))x+=drawLavaRun(ctx,w,x,y,84,frame)-1;
  check(fx.waves.size>0,'Ondas do tibum permanecem ativas');
  const sampleCtx=makeCanvas(T,T).getContext('2d');w.setLavaLevel(90,8,4);TILE_DRAW[TILE.LAVA](sampleCtx,w,90,8,frame);
  // Corte local para testar uma célula rasa isolada.
  sampleCtx.translate(-90*T,-8*T);TILE_DRAW[TILE.LAVA](sampleCtx,w,90,8,frame);
  const pixels=sampleCtx.getImageData(0,0,T,T).data;
  check(pixels[(3*T+8)*4+3]===0&&pixels[(15*T+8)*4+3]>0,'Lava rasa ocupa apenas sua altura real');
  return {checks,metrics:{blocks:2400,oldDraws:2400*WAVE.per,newDraws:180,beforeMs:before,afterMs:after},shot:c.toDataURL()};
 });assert.deepEqual(errors,[]);fs.writeFileSync('tests/lava-rendering.png',Buffer.from(result.shot.split(',')[1],'base64'));fs.writeFileSync('tests/lava-rendering-results.json',JSON.stringify({checks:result.checks,metrics:result.metrics},null,2));console.log(result.checks.length+' verificações passaram. '+JSON.stringify(result.metrics));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
