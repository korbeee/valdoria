const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const {spawn}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const wait=(page,predicate,arg,options={})=>page.waitForFunction(predicate,arg,{polling:25,...options});
(async()=>{
 const port=19876,dataDir=path.resolve(__dirname,'fishing-network-data');
 const server=spawn(process.execPath,['server/server.js'],{cwd:path.resolve(__dirname,'..'),env:{...process.env,PORT:String(port),DATA_DIR:dataDir},windowsHide:true,stdio:['ignore','pipe','pipe']});
 let browser;
 try{
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Test server timeout')),10000);server.stdout.on('data',data=>{if(String(data).includes('Servidor de Valdoria na porta')){clearTimeout(timer);resolve();}});server.on('error',reject);server.on('exit',code=>reject(Error('Test server exited: '+code)));});
  browser=await chromium.launch({channel:'msedge',headless:true});
  const host=await browser.newPage({viewport:{width:1100,height:720}}),guest=await browser.newPage({viewport:{width:1100,height:720}}),errors=[];
  for(const p of [host,guest]){
   p.on('pageerror',e=>errors.push(e.message));
   await p.addInitScript(()=>{requestAnimationFrame=()=>0;localStorage.setItem('valdoria.autoconnect','0');});
   await p.goto('http://localhost/jogo-teste/',{waitUntil:'domcontentloaded'});
   await p.evaluate(port=>{
    const w=new World(100,60,991,{lazy:true});w.surface.fill(22);w.biome.fill(BIOME.FOREST);
    for(let x=3;x<90;x++)for(let y=22;y<42;y++)w.water[y*w.w+x]=WATER_MAX;
    for(let x=0;x<w.w;x++)w.tiles[42*w.w+x]=TILE.STONE;
    w.generated=true;world=game.world=w;game.worldSize='pequeno';game.player.x=31*T;game.player.y=22*T-game.player.h;
    game.player.vx=game.player.vy=0;game.mobs=[];game.drops=[];game.inventory.slots.fill(null);game.selected=0;
    game.inventory.add(ITEM.ROD_IRON,1);game.inventory.add(ITEM.BAIT_LUMINOUS,20);updateFishing(game,0);
    // Usa o mesmo tanque pequeno nos dois clientes para testar a rede sem gerar o mapa inteiro.
    netBeginJoin=function(){NET.joining=null;netRelay({k:'hello',name:netName(),look:currentLook()});};
    window.fishingPackets=[];const relay=netOnRelay;
    window.fishingReady=false;const applySnapshot=netApplySnapshot;
    netApplySnapshot=function(s){applySnapshot(s);window.fishingReady=true;};
    netOnRelay=function(from,d){if(d.k==='fishing')window.fishingPackets.push({from,...d});return relay(from,d);};
    NET.server='ws://127.0.0.1:'+port+'/ws';netConnect(true);
   },port);
   await wait(p,()=>NET.cid>0&&NET.connected);
  }
  await host.evaluate(()=>netHost('private','Teste de pescaria'));
  await wait(host,()=>NET.isHost&&!!NET.room);
  const code=await host.evaluate(()=>NET.room.code);
  await guest.evaluate(code=>netJoin({code}),code);
  await wait(guest,()=>NET.guest&&!!NET.room);
  await wait(guest,()=>window.fishingReady);
  await wait(host,()=>NET.peers.size===1);
  await guest.evaluate(()=>netRelay(netMyState()));
  const guestId=await guest.evaluate(()=>NET.cid);
  await wait(host,id=>NET.peers.get(id)?.seen,guestId);
  const baitBefore=await guest.evaluate(()=>game.inventory.count(ITEM.BAIT_LUMINOUS));
  await guest.evaluate(()=>{input.mouse.left=true;game.fishingLeft=false;fishingInput(game,ITEM_DEFS[ITEM.ROD_IRON],{x:37*T,y:25*T},false);input.mouse.left=false;});
  await wait(host,id=>fishingSessions.has(id),guestId);
  await host.evaluate(()=>{for(let i=0;i<100;i++)updateFishing(game,1/60);});
  try{await wait(guest,()=>game.fishing?.state==='wait',null,{timeout:10000});}
  catch(error){console.log('Host flight:',await host.evaluate(id=>({s:fishingSessions.get(id),packets:window.fishingPackets.slice(-3)}),guestId));console.log('Guest flight:',await guest.evaluate(()=>({fishing:game.fishing,packets:window.fishingPackets.slice(-5),toast:game.toast.text})));throw error;}
  assert.equal(await guest.evaluate(()=>game.inventory.count(ITEM.BAIT_LUMINOUS)),baitBefore-1);
  await host.evaluate(id=>{
   const s=fishingSessions.get(id),m=new Wildlife('abyssfish',s.x,s.y);m.netId=777;m.fishingOwner=id;game.mobs=[m];
   s.fish=m;s.state='bite';s.time=ITEM_DEFS[s.rod].fishingRod.window;fishingPublish(s);
  },guestId);
  await wait(guest,()=>game.fishing?.state==='bite');
  const item=await guest.evaluate(()=>AQUATIC.abyssfish.fishingItem);
  const before=await guest.evaluate(item=>game.inventory.count(item),item);
  await guest.evaluate(()=>{input.mouse.left=true;game.fishingLeft=false;fishingInput(game,ITEM_DEFS[ITEM.ROD_IRON],{x:37*T,y:25*T},false);});
  await wait(host,id=>fishingSessions.get(id)?.state==='reel',guestId);
  await wait(guest,()=>game.fishing?.state==='reel');
  let easing=false,frames=0;
  for(;frames<500;frames++){
   const state=await host.evaluate(id=>{const s=fishingSessions.get(id);return s?{phase:s.phase,tension:s.tension,age:s.age}:null;},guestId);
   if(!state)break;
   if(state.tension>.62)easing=true;if(state.tension<.26)easing=false;
   const pulling=state.phase!=='surge'&&!easing;
   const packetCount=await host.evaluate(()=>window.fishingPackets.length);
   await guest.evaluate(pulling=>{input.mouse.left=pulling;game.clock=(game.clock||0)+.1;updateFishing(game,.1);},pulling);
   if(pulling)await wait(host,n=>window.fishingPackets.length>n,packetCount);
   await host.evaluate(()=>{for(let i=0;i<6;i++){game.clock=(game.clock||0)+1/60;updateFishing(game,1/60);}});
  }
  await wait(guest,item=>game.inventory.count(item)===1,item);
  assert.equal(await guest.evaluate(item=>game.inventory.count(item),item),before+1);
  assert.equal(await host.evaluate(()=>game.mobs[0].despawn),true);
  assert.equal(await guest.evaluate(()=>game.inventory.count(ITEM.BAIT_LUMINOUS)),baitBefore-1);
  await wait(guest,()=>!game.fishing);
  const packets=await guest.evaluate(()=>window.fishingPackets),reward=packets.find(d=>d.op==='catch');
  assert(reward&&packets.some(d=>d.s?.phase==='warning')&&packets.some(d=>d.s?.phase==='surge'));
  const hostPackets=await host.evaluate(()=>window.fishingPackets);
  assert(hostPackets.some(d=>d.op==='release'),'Guest release was not sent');
  // Reentregar o mesmo pacote não duplica a recompensa.
  await guest.evaluate(reward=>{netOnRelay(reward.from,reward);netOnRelay(reward.from,reward);},reward);
  assert.equal(await guest.evaluate(item=>game.inventory.count(item),item),before+1);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({transport:'real WebSocket',fightSeconds:frames/10,guestRewards:1,baitConsumed:1,releaseSynchronized:true,duplicateRewardRejected:true}));
 }finally{
  if(browser)await browser.close();server.kill();
  // Apenas dados temporários criados por este teste, dentro da pasta tests.
  if(dataDir===path.resolve(__dirname,'fishing-network-data')){
   for(const name of ['friends.json','friends.json.tmp']){const file=path.join(dataDir,name);if(fs.existsSync(file))fs.unlinkSync(file);}
   if(fs.existsSync(dataDir)&&fs.readdirSync(dataDir).length===0)fs.rmdirSync(dataDir);
  }
 }
})().catch(error=>{console.error(error);process.exitCode=1;});
