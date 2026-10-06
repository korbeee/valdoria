const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'playwright');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage();await page.addInitScript(()=>window.requestAnimationFrame=()=>0);await page.goto('http://localhost/jogo-teste/?path-regression='+Date.now(),{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>typeof mobWaypoint==='function');
 const results=await page.evaluate(()=>{
  const floor=35,dt=1/60;
  const arena=()=>{const w=new World(80,60,777,{lazy:true});for(let x=0;x<80;x++)for(let y=floor;y<60;y++)w.setTile(x,y,TILE.STONE);return w;};
  const target=(x,y)=>new Body(x*T,y*T-42-.01,18,42);
  const mob=(kind,x,y)=>{const m=new Monster(kind,x*T,y*T-(kind==='undead'?42:14)-.01);m.onGround=true;m.pathState={t:0};return m;};
  const run=(m,w,p,seconds)=>{let minX=m.x,best=Infinity,maxY=m.y,tailMin=Infinity,tailMax=-Infinity;for(let i=0;i<seconds*60;i++){m.update(dt,w,p);minX=Math.min(minX,m.x);maxY=Math.max(maxY,m.y);best=Math.min(best,Math.hypot(m.cx-p.cx,m.cy-p.cy));if(i>=(seconds-1)*60){tailMin=Math.min(tailMin,m.x);tailMax=Math.max(tailMax,m.x);}}return {best,minX,maxY,x:m.x,y:m.y,path:m.path,waiting:m.pathWaiting,tailTravel:tailMax-tailMin,vy:m.vy};};
  const out={};
  {const w=arena();for(let x=30;x<80;x++)for(let y=floor-3;y<floor;y++)w.setTile(x,y,TILE.STONE);const m=mob('undead',28,floor),p=target(31,floor-3);out.finalJump=run(m,w,p,7);}
  {const w=arena();for(let x=20;x<=33;x++)for(let y=floor+1;y<floor+6;y++)w.setTile(x,y,TILE.AIR);for(let x=34;x<=36;x++)for(let y=floor;y<floor+4;y++)w.setTile(x,y,TILE.AIR);for(let x=37;x<=39;x++)for(let y=floor;y<floor+2;y++)w.setTile(x,y,TILE.AIR);for(let x=20;x<=39;x++)w.setTile(x,floor-2,TILE.PLATFORM);const m=mob('slime',22,floor+6),p=target(18,floor);out.pit=run(m,w,p,24);}
  {const w=arena();for(let x=20;x<=28;x++)for(let y=floor+1;y<floor+5;y++)w.setTile(x,y,TILE.AIR);const m=mob('slime',25,floor+5),p=target(18,floor);out.closed=run(m,w,p,5);out.closed.start=25*T;for(let x=28;x<=30;x++)for(let y=floor;y<floor+3;y++)w.setTile(x,y,TILE.AIR);for(let x=31;x<=33;x++)w.setTile(x,floor,TILE.AIR);for(let x=20;x<=33;x++)w.setTile(x,floor-2,TILE.PLATFORM);out.reopened=run(m,w,p,24);}
  {const w=arena(),f={wT:1,hT:1,pad:0};w.setTile(28,floor-2,TILE.STONE);for(let y=floor-3;y<floor;y++)w.setTile(29,y,TILE.STONE);const neighbors=[];mobGroundNeighbors(w,f,3,8)(28,floor,neighbors);out.ceilingJump=neighbors.some(n=>n[3]==='jump'&&n[0]===29);}
  return out;
 });console.log(JSON.stringify(results));
 assert(results.finalJump.best<24,'Executa o salto do último trecho');
 assert(results.pit.best<24,'Sai da caverna pelo lado oposto e retorna ao jogador');
 assert(results.closed.waiting&&results.closed.tailTravel<1&&results.closed.vy===0,'Espera sem insistir na parede quando não há saída');
 assert(results.reopened.best<24,'Volta a perseguir após abrir uma saída');
 assert(!results.ceilingJump,'Não planeja salto através de teto sólido');
 console.log('5 cenários de navegação passaram.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
