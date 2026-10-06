const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try {
  const page=await browser.newPage({viewport:{width:1100,height:720}});
  await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;localStorage.setItem('valdoria.autoconnect','0');});
  await page.goto('http://localhost/jogo-teste/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof game==='object'&&typeof netMyState==='function');
  const result=await page.evaluate(async()=>{
   await newWorld('pequeno',()=>{},4242);finishOpening(game);Menu.close();game.paused=false;game.adminGod=true;
   NET.room={code:'RENDER'};NET.isHost=false;
   const peer=netPeer(900,'Pedro');peer.look=sanitizeLook({...PLAYER_LOOK,name:'Pedro'});
   player.anim=5.4;player.visualTime=1.3;player.onGround=true;player.vx=170;player.vy=0;player.stepOffset=0;
   game.inventory.slots[game.selected]={item:ITEM.EMERGENCY_AXE,count:1};
   const checks=[],check=(ok,label)=>{if(!ok)throw Error(label);checks.push(label);};
   for(const facing of [1,-1])for(const stance of ['run','crawl','air','swim'])for(const attack of ['sword','tool','bow','trident']){
    player.facing=facing;player.crouching=stance==='crawl';player.h=player.crouching?CROUCH_H:PLAYER_H;
    player.onGround=stance==='run'||stance==='crawl';player.swimming=stance==='swim';player.swimStroking=true;player.swimAnim=3;
    player.swimTilt=stance==='swim'?.4:0;
    game.sword=createSwordState();game.toolAction=null;game.bow=null;game.trident=null;
    if(attack==='sword')Object.assign(game.sword,{active:true,t:.18,item:ITEM.EMERGENCY_AXE,facing});
    if(attack==='tool')game.toolAction={kind:'picareta',item:ITEM.EMERGENCY_AXE,t:.2,duration:.5,x:player.cx+facing*30,y:player.cy,tile:TILE.STONE};
    if(attack==='bow')game.bow={charging:true,charge:.6};
    if(attack==='trident')game.trident={anim:{kind:'thrust',t:.12,ang:facing>0?0:Math.PI,facing,speed:1},bolts:[],puddles:[],fx:[]};
    netPeerState(peer,JSON.parse(JSON.stringify(netMyState())));peer.x=player.x+45;peer.y=player.y;
    let hud=0,local=0,light=0;
    const a=renderer.drawPlayer,b=renderer.drawUI,c=renderer.drawTorchGlow;
    renderer.drawPlayer=function(...args){if(args[0]===player)local++;return a.apply(this,args);};
    renderer.drawUI=function(...args){hud++;return b.apply(this,args);};
    renderer.drawTorchGlow=function(...args){light++;return c.apply(this,args);};
    try{renderer.render(game);}finally{renderer.drawPlayer=a;renderer.drawUI=b;renderer.drawTorchGlow=c;}
    check(local>0&&light>0&&hud>0,`${stance}/${attack}/${facing}: personagem, iluminação e HUD completam o quadro`);
   }
   // O desenho remoto deve ser idêntico ao local, pixel por pixel, incluindo o item na mão.
   player.x=120;player.y=55;player.vy=0;player.swimming=false;player.swimTilt=0;player.gag=null;
   game.sword=createSwordState();game.toolAction=game.bow=game.trident=null;game.arrows=[];game.block=null;
   const items=[ITEM.EMERGENCY_AXE,...Object.keys(ITEM_DEFS).filter(id=>ITEM_DEFS[id]?.ferramenta).slice(0,3).map(Number),
    ...Object.keys(ITEM_DEFS).filter(id=>ITEM_DEFS[id]?.arco||ITEM_DEFS[id]?.tridente||ITEM_DEFS[id]?.name?.includes('Espada')).slice(0,4).map(Number)];
   const outfits=[null,...Object.keys(ITEM_DEFS).filter(id=>ITEM_DEFS[id]?.roupa).slice(0,2).map(Number)];
   const nativeImage=()=>{
    const c=makeCanvas(256,180),ctx=c.getContext('2d'),old=renderer.ctx;renderer.ctx=ctx;
    try{drawBossAurasBehind(ctx,game);drawShield(ctx,game);drawFlightEquipment(ctx,game);renderer.drawPlayer(player,null,game.sword,game);renderer.drawHeldItem(game);}
    finally{renderer.ctx=old;}
    return ctx.getImageData(0,0,256,180).data;
   };
   const peerImage=()=>{const c=makeCanvas(256,180);netDrawPeer(c.getContext('2d'),peer);return c.getContext('2d').getImageData(0,0,256,180).data;};
   const same=(a,b)=>a.every((v,i)=>v===b[i]);
   for(const outfit of outfits)for(const item of items)for(const facing of [-1,1]){
    setOutfitItem(game,outfit);game.inventory.slots[game.selected]={item,count:1};player.facing=facing;player.crouching=false;player.onGround=true;player.h=PLAYER_H;player.vx=170;player.anim=5.4;
    game.accessories=[];
    netPeerState(peer,JSON.parse(JSON.stringify(netMyState())));peer.x=player.x;peer.y=player.y;peer.actionAt=performance.now()/1000+1;
    check(same(nativeImage(),peerImage()),`item ${ITEM_DEFS[item].name}, roupa ${outfit}, lado ${facing}: pixels iguais`);
   }
   for(const gear of [...FLIGHT_WINGS,ITEM.JETPACK]){
    game.accessories=[{item:gear,count:1}];player.flying=true;player.flightGliding=false;player.jetFuel=20;
    netPeerState(peer,JSON.parse(JSON.stringify(netMyState())));peer.x=player.x;peer.y=player.y;
    check(same(nativeImage(),peerImage()),`${ITEM_DEFS[gear].name}: pixels iguais`);
   }
   game.accessories=[];player.flying=false;setOutfitItem(game,outfits[1]);
   netPeerState(peer,JSON.parse(JSON.stringify(netMyState())));peer.x=player.x;peer.y=player.y;
   const ownOutfit=nativeImage();setOutfitItem(game,outfits[2]);
   const atlas=renderer.playerAtlas,palette=JSON.stringify(PLAYER_PALETTE),sword=game.sword;
   check(same(ownOutfit,peerImage()),'roupa do amigo não herda a roupa de quem assiste');
   check(renderer.playerAtlas===atlas&&JSON.stringify(PLAYER_PALETTE)===palette&&game.sword===sword,'desenhar o amigo restaura atlas, paleta e ataque locais');
   return checks;
  });
  console.log(result.length+' cenários de desenho multiplayer passaram.');
  assert(result.length>=32);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
