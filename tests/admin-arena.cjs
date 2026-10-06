const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'playwright');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await b.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>{requestAnimationFrame=()=>0;localStorage.setItem('valdoria.autoconnect','0');});
 await page.goto('http://localhost/jogo-teste/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>typeof adminBuildArena==='function');
 await page.evaluate(()=>{const w=new World(260,130,88,{lazy:true});w.surface.fill(90);w.biome.fill(BIOME.FOREST);game.world=world=w;game.intro.active=false;game.paused=false;game.respawnPending=null;Menu.close();game.weather=createWeather();game.adminGod=true;Object.assign(player,{x:130*T,y:90*T-player.h,hp:100});});
 await page.locator('#admin-toggle').click();await page.locator('[data-action="arena-create"]').click();
 const result=await page.evaluate(()=>{
  const a=game.adminArena,w=world,p=player,checks=[],check=(v,s)=>{if(!v)throw Error(s);checks.push(s);};
  check(a.width===192&&a.top>=0&&a.x0>=0&&a.x1<w.w,'arena grande permanece dentro do mundo');
  check(Math.abs(p.y+p.h-a.floor*T)<.1&&!p.collides(w,p.x,p.y),'jogador aparece no centro sobre o piso');
  for(let x=a.x0;x<=a.x1;x++)check(w.getTile(x,a.floor)===TILE.STONE_BRICK,'piso plano '+x);
  for(const [id,rule]of BOSS_SUMMONERS){game.mobs=[];game.boss=null;check(summonBoss(game,id).ok,'arena comporta '+rule.kind);}
  game.mobs=[];game.boss=null;const outside=w.getTile(a.x0-1,a.floor);check(outside===TILE.AIR,'construção respeita limites laterais');
  p.x=10*T;check(adminEnterArena(game)&&Math.abs(p.cx-(a.x0+a.width/2)*T)<.1,'retorno à arena');
  const send=netRelay,flush=netFlushTiles,mobs=netSendMobs,sent=[];netRelay=d=>sent.push(d);netFlushTiles=netSendMobs=()=>{};NET.room={code:'TEST'};NET.isHost=true;
  const peer=netPeer(99,'Pedro');Object.assign(peer,{seen:true,x:100*T,y:90*T-p.h});netOnRelay(99,{k:'adminArenaBuild'});
  check(sent.some(d=>d.k==='adminArenaReady'&&d.arena?.width===192&&d.owner===99),'convidado solicita arena criada pelo host');
  NET.room=null;NET.isHost=false;netRelay=send;netFlushTiles=flush;netSendMobs=mobs;
  return checks.length;
 });await page.locator('[data-action="arena-summoners"]').click();const all=await page.evaluate(()=>[...BOSS_SUMMONERS.keys()].every(id=>game.inventory.count(id)>=5));if(!all)throw Error('Invocadores não entregues');
 if(errors.length)throw Error(errors.join('\n'));console.log(result+' verificações da arena e controles do painel passaram.');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1);});
