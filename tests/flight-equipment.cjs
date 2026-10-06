const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await b.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.text().startsWith('[quadro]'))errors.push(m.text());});
 await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;localStorage.setItem('valdoria.autoconnect','0');});await page.goto('http://localhost/jogo-teste/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>typeof game==='object');
 const result=await page.evaluate(async()=>{
  await newWorld('pequeno',()=>{},4242);finishOpening(game);Menu.root.hidden=true;game.intro.active=false;game.adminGod=true;game.mobs=[];
  const checks=[],check=(v,s)=>{if(!v)throw Error(s);checks.push(s);},g=game,p=g.player,w=g.world,inv=g.inventoryUI.inv,keys={down:k=>k==='Space'},noKeys={down:()=>false};
  const equip=id=>{g.accessories=Array(ACCESSORY_SLOTS).fill(null);g.accessories[0]={item:id,count:1};p.flightUsed=0;p.jetFuel=0;p.onGround=false;p.swimming=p.climbing=p.crouching=false;p.wallGrab=null;p.seat=null;p.vy=0;};
  const x=w.w>>1,y=w.surface[x];for(let xx=x-10;xx<x+30;xx++)for(let yy=3;yy<=y+1;yy++){w.setTile(xx,yy,yy===y+1?TILE.STONE:TILE.AIR);w.water[yy*w.w+xx]=0;}
  p.x=x*T;p.y=(y-20)*T;
  const recipes=craftRecipes(),craftable=[ITEM.CLOTH_WINGS,ITEM.BONE_WINGS,ITEM.CRYSTAL_WINGS,ITEM.MECHANICAL_WINGS];
  check(craftable.every(id=>recipes.some(r=>r.result.item===id&&r.station==='anvil')),'Quatro asas craftáveis na bigorna');
  check(craftable.every(id=>!Object.values(WILDLIFE).some(d=>(d.drops||[]).some(a=>a[0]===id))),'Asas craftáveis não caem de criaturas');
  check(!recipes.some(r=>[ITEM.STORM_WINGS,ITEM.VIGIA_WINGS].includes(r.result.item)),'Asas de chefe não têm receita');
  check(WILDLIFE.nucleo.drops.some(a=>a[0]===ITEM.VIGIA_WINGS&&a[3]===1)&&WILDLIFE.thunderbird.drops.some(a=>a[0]===ITEM.STORM_WINGS),'Dois chefes entregam suas asas');
  const times=craftable.map(id=>ITEM_DEFS[id].flight.time);check(times.every((t,i)=>t<(times[i+1]||30))&&ITEM_DEFS[ITEM.STORM_WINGS].flight.time===30,'Duração cresce com a dificuldade, abaixo das asas da Tempestade');
  check([...FLIGHT_WINGS,ITEM.JETPACK].every(id=>ITEM_ART[id].pixels.length===16&&ITEM_ART[id].pixels.every(row=>row.length===16)),'Ícones novos mantêm a resolução do inventário');
  check(flightProfileSprite(ITEM.STORM_WINGS,'flight',1).toDataURL()!==flightProfileSprite(ITEM.STORM_WINGS,'flight',7).toDataURL()&&flightProfileSprite(ITEM.STORM_WINGS,'folded',0).toDataURL()!==flightProfileSprite(ITEM.STORM_WINGS,'glide',0).toDataURL(),'Animação tem batida articulada e poses distintas');
  const jetSprite=flightProfileSprite(ITEM.JETPACK,'flight',0),jetPixels=jetSprite.getContext('2d').getImageData(0,0,jetSprite.width,jetSprite.height).data;let jetMaxX=0;for(let yy=0;yy<jetSprite.height;yy++)for(let xx=0;xx<jetSprite.width;xx++)if(jetPixels[(yy*jetSprite.width+xx)*4+3])jetMaxX=Math.max(jetMaxX,xx);check(jetMaxX>0&&jetMaxX<FLIGHT_ROOT_X,'Jetpack fica atrás do ombro no perfil');
  for(const id of [...craftable,ITEM.STORM_WINGS]){
   equip(id);const time=ITEM_DEFS[id].flight.time;
   check(flightControl(p,.1,keys,w,1)&&p.vy<0&&p.vx>0&&p.flying,ITEM_DEFS[id].name+': sobe e direciona');
   for(let i=0;i<time*60+2;i++)flightControl(p,1/60,keys,w,0);
   check(flightControl(p,.1,keys,w,0)&&!p.flying&&p.flightGliding&&p.vy<=70,ITEM_DEFS[id].name+': acaba o impulso e plana');
   check(!flightControl(p,.1,noKeys,w,0),ITEM_DEFS[id].name+': soltar não recarrega');
   p.onGround=true;flightControl(p,0,noKeys,w,0);p.onGround=false;check(flightControl(p,.1,keys,w,0),ITEM_DEFS[id].name+': pousar recupera');
  }
  equip(ITEM.CLOTH_WINGS);p.flightUsed=8;g.accessories[0]={item:ITEM.BONE_WINGS,count:1};flightControl(p,.1,keys,w,0);check(!p.flying&&p.flightGliding,'Trocar asas no ar não renova impulso');
  equip(ITEM.STORM_WINGS);check(!skyGear(g).glide&&skyGear(g).jumps===0,'Tempestade não plana nem dá pulos extras');
  equip(ITEM.STORM_WINGS);p.flightUsed=30;p.x=x*T;p.y=(y-20)*T;p.vy=500;p.onGround=false;input.keys.add('Space');
  for(let i=0;i<60;i++){p.update(1/60,input,w);updateSkyMovement(g,1/60);}check(p.flightGliding&&p.gliding&&!p.flying&&p.vy<=70&&p.flightUsed===30,'Planar integrado limita a queda e não recupera impulso');
  input.keys.clear();for(let i=0;i<10;i++){p.update(1/60,input,w);updateSkyMovement(g,1/60);}check(!p.flightGliding&&p.vy>70,'Soltar o pulo encerra o planar');p.y=(y-20)*T;
  equip(ITEM.VIGIA_WINGS);for(let i=0;i<7200;i++)flightControl(p,1/60,keys,w,0);check(p.flying&&flightControl(p,.1,keys,w,0),'Núcleo continua voando após dois minutos');
  check(FLIGHT_WINGS.filter(id=>!isFinite(ITEM_DEFS[id].flight.time)).length===1,'Só asas do Núcleo têm voo infinito');
  equip(ITEM.JETPACK);inv.slots.fill(null);check(!flightControl(p,.1,keys,w,0),'Jetpack sem combustível não voa');inv.add(ITEM.FLIGHT_FUEL,2);
  check(flightControl(p,.5,keys,w,0)&&inv.count(ITEM.FLIGHT_FUEL)===1&&p.jetFuel===19.5,'Jetpack consome uma célula e conta tempo');
  flightControl(p,1,noKeys,w,0);check(p.jetFuel===19.5,'Soltar impulso poupa combustível');p.onGround=true;flightControl(p,0,noKeys,w,0);p.onGround=false;check(p.jetFuel===19.5,'Pousar não cria combustível');
  for(let i=0;i<2400;i++)flightControl(p,1/60,keys,w,0);check(!flightControl(p,.1,keys,w,0)&&inv.count(ITEM.FLIGHT_FUEL)===0,'Segunda célula é automática; acabou o combustível, acabou o voo');
  check(recipes.find(r=>r.result.item===ITEM.JETPACK)?.items.length===5&&recipes.find(r=>r.result.item===ITEM.FLIGHT_FUEL)?.station==='furnace','Jetpack difícil e combustível preparado na fornalha');
  const guide=guideBuildIndex();check(guide.byId.get(ITEM.VIGIA_WINGS).sources.some(s=>s.title.includes('Núcleo'))&&guide.byId.get(ITEM.JETPACK).recipes.length===1,'Novos equipamentos e fontes aparecem no guia');
  equip(ITEM.MECHANICAL_WINGS);p.x=x*T;p.y=y*T-p.h;p.onGround=true;p.vx=p.vy=0;input.keys.add('Space');input.keys.add('KeyD');const start=p.y;for(let i=0;i<120;i++)p.update(1/60,input,w);input.keys.clear();check(p.y<start-10*T&&p.x>x*T+8*T,'Voo integrado ao movimento real');
  p.x=x*T+4;p.y=(y-20)*T+2;for(let dx=0;dx<2;dx++)w.setTile(x+dx,y-21,TILE.STONE);const roofY=(y-20)*T;for(let i=0;i<10;i++)p.moveY(-4,w);check(p.y>=roofY&&!p.collides(w,p.x,p.y),'Asas respeitam colisão no teto');
  equip(ITEM.VIGIA_WINGS);p.swimming=true;check(!flightControl(p,.1,keys,w,0),'Não ativa dentro da água');p.swimming=false;g.mount={};check(!flightControl(p,.1,keys,w,0),'Não ativa montado');g.mount=null;
  const gallery=makeCanvas(1120,250),ctx=gallery.getContext('2d');ctx.fillStyle='#172029';ctx.fillRect(0,0,1120,250);ctx.font='12px monospace';ctx.textAlign='center';
  [...craftable,ITEM.STORM_WINGS,ITEM.VIGIA_WINGS,ITEM.JETPACK].forEach((id,i)=>{equip(id);p.x=i*160+70;p.y=70;p.flying=true;ctx.save();ctx.scale(2,2);p.x=(i*160+75)/2-p.w/2;p.y=40;drawFlightEquipment(ctx,g);ctx.drawImage(renderer.playerAtlas,0,0,PLAYER_SPR_W,PLAYER_SPR_H,p.cx-PLAYER_SPR_W/2,p.y+p.h-PLAYER_SPR_H,PLAYER_SPR_W,PLAYER_SPR_H);ctx.restore();ctx.fillStyle='#eed6a8';ITEM_DEFS[id].name.split(' ').reduce((a,s,j)=>{if(j%2===0)ctx.fillText(s+(ITEM_DEFS[id].name.split(' ')[j+1]?' '+ITEM_DEFS[id].name.split(' ')[j+1]:''),i*160+80,155+(j/2)*16);return a;},0);ctx.fillStyle='#83c9d1';ctx.fillText(id===ITEM.JETPACK?'combustível':isFinite(ITEM_DEFS[id].flight.time)?ITEM_DEFS[id].flight.time+' s':'infinito',i*160+80,222);});
  equip(ITEM.VIGIA_WINGS);p.x=x*T;p.y=(y-8)*T;p.flying=true;g.clock=1.3;g.cam.x=(x-16)*T;g.cam.y=(y-18)*T;g.zoom=2;renderer.render(g);
  const sheet=makeCanvas(64*12,72*3*7),sc=sheet.getContext('2d');[...craftable,ITEM.STORM_WINGS,ITEM.VIGIA_WINGS,ITEM.JETPACK].forEach((id,i)=>['flight','glide','folded'].forEach((pose,row)=>{for(let f=0;f<12;f++){sc.drawImage(flightProfileSprite(id,pose,f),f*64,(i*3+row)*72);sc.drawImage(renderer.playerAtlas,0,0,PLAYER_SPR_W,PLAYER_SPR_H,f*64+46-PLAYER_SPR_W/2,(i*3+row)*72+24+p.h-PLAYER_SPR_H,PLAYER_SPR_W,PLAYER_SPR_H);}}));
  return {checks,shot:gallery.toDataURL(),worldShot:renderer.canvas.toDataURL(),sheet:sheet.toDataURL()};
 });assert.deepEqual(errors,[]);fs.writeFileSync('tests/flight-equipment.png',Buffer.from(result.shot.split(',')[1],'base64'));fs.writeFileSync('tests/flight-equipment-world.png',Buffer.from(result.worldShot.split(',')[1],'base64'));fs.writeFileSync('tests/flight-animation-sheet.png',Buffer.from(result.sheet.split(',')[1],'base64'));console.log(result.checks.length+' verificações passaram.');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
