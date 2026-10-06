const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'playwright');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await b.newPage();await page.addInitScript(()=>{requestAnimationFrame=()=>0;localStorage.setItem('valdoria.autoconnect','0');});
 await page.goto('http://localhost/jogo-teste/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>typeof summonBoss==='function');
 const checks=await page.evaluate(()=>{
  const out=[],check=(v,s)=>{if(!v)throw Error(s);out.push(s);},g=game,p=player;
  const w=new World(160,100,45,{lazy:true});g.world=world=w;g.adminGod=true;g.intro.active=false;g.respawnPending=null;g.weather=createWeather();
  for(let x=0;x<160;x++){w.setTile(x,40,TILE.PLATFORM);w.setTile(x,50,TILE.PLATFORM);w.setTile(x,60,TILE.STONE);}
  const kinds=['bear','tiger','yeti','fiandeira','cascoferro'];
  for(const kind of kinds){
   const m=new Wildlife(kind,60*T,40*T-WILDLIFE[kind].h-.01);
   if(kind==='fiandeira')setupFiandeira(m,{x:64*T,ceilY:20*T,floorY:40*T,door:[]});
   if(kind==='cascoferro')setupCascoFerro(m,{x:64*T,y:40*T,door:[],gate:[]});
   Object.assign(m,{x:60*T,y:40*T-m.h-.01,boss:true,state:kind==='cascoferro'?'walk':'hunt',mode:'floor',sleeping:false,aware:true,onGround:true,summonerCreated:true,cooldown:100});
   g.mobs=[m];g.boss=m;Object.assign(p,{x:68*T,y:50*T-p.h-.01,hp:100});
   for(let i=0;i<180;i++)m.update(1/60,w,p);
   check(Math.abs(m.y+m.h-50*T)<3,kind+' desce para o andar do jogador');
   Object.assign(m,{x:60*T,y:50*T-m.h-.01,state:kind==='cascoferro'?'walk':'hunt',onGround:true,vy:0,vx:0,mode:'floor',cooldown:100,path:null});
   Object.assign(p,{x:68*T,y:40*T-p.h-.01});
   let reached=false;for(let i=0;i<360;i++){m.update(1/60,w,p);if(m.onGround&&Math.abs(m.y+m.h-40*T)<3){reached=true;break;}}
   check(reached,kind+' sobe para o andar do jogador '+JSON.stringify({x:m.x,y:m.y,feet:m.y+m.h,state:m.state,vy:m.vy,next:m.pathNext,path:m.path?.slice(0,3)}));
  }
  for(const kind of ['nucleo','thunderbird']){
   g.mobs=[];g.boss=null;p.x=68*T;p.y=50*T-p.h-.01;
   const id=[...BOSS_SUMMONERS].find(([,v])=>v.kind===kind)[0];check(summonBoss(g,id).ok,'invoca '+kind);const m=g.boss;
   p.y=40*T-p.h-.01;for(let i=0;i<180;i++)m.update(1/60,w,p);
   check(Math.abs(m.manualArena.floor-40)<.1,kind+' acompanha a altura do andar');
  }
  return out;
 });console.log(checks.length+' verificações de perseguição entre andares passaram.');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1);});
