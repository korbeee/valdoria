// Física da superfície da água: tchibum, onda que corre e some, bichos caindo e chuva.
//   node tests/water-waves.cjs
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>window.requestAnimationFrame=()=>1);
  await page.goto('http://localhost/jogo-teste/');await page.waitForFunction(()=>typeof game==='object');
  const checks=await page.evaluate(()=>{
   const out=[];const check=(c,l)=>{if(!c)throw Error('FALHOU: '+l);out.push(l);};
   finishOpening(game);Menu.root.hidden=true;game.paused=false;game.intro.active=false;
   world=game.world=new World(600,160,391);game.map=new WorldMap(world);startOpening(game);finishOpening(game);game.intro.active=false;
   // Piscina de 40×8 blocos, cheia
   for(let x=20;x<80;x++)for(let y=0;y<=70;y++){world.setTile(x,y,y>=66||x<=25||x>=74?TILE.STONE:TILE.AIR);world.walls[y*world.w+x]=0;}
   for(let x=26;x<74;x++)for(let y=58;y<66;y++)world.water[y*world.w+x]=WATER_MAX;
   for(let x=0;x<world.w;x++)world.computeSkyTop(x);
   game.mobs=[];game.adminGod=true;game.waves=new Map();game.splashColumns=[];game.rainRings=[];
   game.weather=createWeather();game.weather.timer=999;game.weather.triggered=true;game.adminFreezeTime=true;
   const p=game.player;p.x=30*T;p.y=46*T;p.vx=0;p.vy=0;game.wasInWater=false;
   const surf=58*T,parts0=game.particles.length;
   let g=0;while(!game.wasInWater&&g++<200)update(1/60);
   check(game.waves.size>0,'cair na água cria ondas ('+game.waves.size+' molas)');
   check(game.splashColumns.length>0,'a queda levanta uma coluna d\'água');
   check(game.particles.length>parts0+15,'a coroa de gotas sobe');
   const s0=Math.floor(p.cx/T*4);
   for(let i=0;i<40;i++)update(1/60);
   const far=[...game.waves.keys()].some(s=>Math.abs(s-s0)>12);
   check(far,'a onda corre para os lados');
   p.x=30*T;p.y=47*T;game.adminFly=true;p.vx=p.vy=0;
   for(let i=0;i<60*8;i++)update(1/60);
   check(game.waves.size===0,'e some sozinha depois');
   // Bicho caindo na água também faz tchibum
   const wolf=new Wildlife('wolf',50*T,48*T);wolf.vy=0;game.mobs.push(wolf);
   g=0;while(!wolf.wasInWater&&g++<200)update(1/60);
   check(game.waves.size>0,'um lobo caindo também espirra água');
   game.mobs=[];for(let i=0;i<60*8;i++)update(1/60);
   // Chuva: ondinhas na superfície
   game.weather.rain=1;game.weather.event="rain";p.x=62*T;p.y=52*T;updateCamera(1,true);
   let rings=0;for(let i=0;i<60;i++){update(1/60);game.weather.rain=1;rings=Math.max(rings,(game.rainRings||[]).length);}
   check(rings>3,'a chuva faz ondinhas na água ('+rings+')');
   check(waterWaveSlices(game,40,58)!==undefined,'a superfície tem fatias para desenhar');
   renderer.render(game);
   game.weather.rain=0;game.weather.event=null;
   // Escoamento: um bloco de água numa ponta de uma piscina vazia se espalha e fica plano
   world=game.world=new World(600,160,391);game.map=new WorldMap(world);
   for(let x=20;x<140;x++)for(let y=0;y<=70;y++){world.setTile(x,y,y>=66||x<=25||x>=74?TILE.STONE:TILE.AIR);world.walls[y*world.w+x]=0;}
   for(let x=26;x<34;x++)for(let y=58;y<66;y++){world.water[y*world.w+x]=WATER_MAX;world.waterActive.add(y*world.w+x);}
   for(let x=0;x<world.w;x++)world.computeSkyTop(x);
   const sum=()=>{let s=0;for(let x=26;x<74;x++)s+=col(x);return s;};
   const col=(x)=>{let s=0;for(let y=40;y<66;y++)s+=world.waterLevel(x,y);return s;};const vol=sum();
   p.x=110*T;p.y=60*T;game.adminFly=true;game.mobs=[];game.drops=[];
   for(let i=0;i<60*3;i++)update(1/60);
   const cols=[];for(let x=26;x<74;x++)cols.push(col(x));
   check(Math.max(...cols)-Math.min(...cols)<=1,'a água se nivela: superfície plana de ponta a ponta ('+Math.min(...cols)+'..'+Math.max(...cols)+')');
   check(sum()===vol,'sem perder nem criar água');
   check(world.waterActive.size===0,'e para de simular quando assenta');
   // Correnteza: represa aberta arrasta quem está na água
   for(let x=26;x<140;x++)for(let y=40;y<66;y++){world.water[y*world.w+x]=0;world.setTile(x,y,x>=134?TILE.STONE:TILE.AIR);}
   for(let x=26;x<60;x++)for(let y=62;y<66;y++)world.water[y*world.w+x]=WATER_MAX;
   for(let y=50;y<66;y++)world.setTile(60,y,TILE.STONE);
   for(let x=61;x<90;x++)for(let y=50;y<66;y++)world.water[y*world.w+x]=WATER_MAX;
   for(let x=0;x<world.w;x++)world.computeSkyTop(x);
   game.adminFly=false;p.x=45*T;p.y=62*T;p.vx=p.vy=0;for(let i=0;i<60;i++)update(1/60);
   const px0=p.x;for(let y=50;y<66;y++)world.setTile(60,y,TILE.AIR);
   for(let i=0;i<60;i++)update(1/60);
   check(px0-p.x>T,'a represa aberta arrasta o jogador com a correnteza ('+((px0-p.x)/T).toFixed(1)+' blocos)');
   return out;
  });
  console.log(checks.map(c=>'✓ '+c).join('\n'));
  console.log(errors.length?'ERROS:\n'+errors.join('\n'):'sem erros no console');
  if(errors.length)process.exitCode=1;
 }catch(e){console.error(e.message);process.exitCode=1;}finally{await browser.close();}
})();
