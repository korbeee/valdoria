'use strict';

const FISHING_RODS=[],FISHING_BAITS=[],FISHING_RARES=[];
function fishingItem(key,def,shape,color,cost,station='workbench',count=1){
  const id=Math.max(...Object.values(ITEM))+1;ITEM[key]=id;defItem(id,def);
  const rows=Array.from({length:16},()=>Array(16).fill('.'));
  const dot=(x,y,ch)=>{if(x>=0&&x<16&&y>=0&&y<16)rows[y][x]=ch;};
  if(shape==='rod'){for(let i=0;i<13;i++){dot(2+i,14-i,'b');if(i>3)dot(3+i,14-i,'h');}for(let y=3;y<12;y++)dot(14,y,'l');dot(13,12,'h');dot(14,12,'b');dot(5,12,'d');dot(6,12,'h');}
  else if(shape==='bait'){for(let y=5;y<13;y++)for(let x=4;x<12;x++)if(Math.hypot(x-8,y-9)<4)dot(x,y,x<7?'h':'b');dot(7,4,'l');dot(8,3,'l');dot(9,2,'l');dot(5,7,'d');dot(10,11,'d');}
  else{for(let x=4;x<13;x++)for(let y=5;y<11;y++)if(Math.hypot((x-8)/1.5,y-8)<3)dot(x,y,y<7?'h':'b');for(let y=5;y<12;y++)dot(2+Math.abs(8-y),y,'b');dot(11,7,'d');dot(7,4,'h');}
  ITEM_ART[id]={cores:{b:color,h:color.map(v=>Math.min(255,v+65)),d:[35,39,52],l:[206,221,230]},pixels:rows.map(r=>r.join(''))};
  RECIPES.push({nome:def.name,estacao:station,ingredientes:cost,resultado:{item:id,quantidade:count}});return id;
}
for(const [key,name,power,range,window,color,cost]of [
 ['ROD_TWIG','Vara de galho',1,9,1.2,[148,104,61],[[ITEM.STICK,8],[ITEM.FIBER,5]]],
 ['ROD_IRON','Vara de ferro',1.35,12,1.65,[119,147,160],[[ITEM.METAL_BAR,5],[ITEM.FIBER,8],[ITEM.SILK,3]]],
 ['ROD_CRYSTAL','Vara de cristal',1.75,15,2.1,[109,150,219],[[ITEM.METAL_BAR,7],[ITEM.CRYSTAL,8],[ITEM.SILK,6]]],
 ['ROD_CELESTIAL','Vara celeste',2.2,18,2.65,[91,196,190],[[ITEM.WIND_CRYSTAL,6],[ITEM.GOLD,6],[ITEM.SILK,10],[ITEM.GEAR,3]]],
]){FISHING_RODS.push(fishingItem(key,{name,maxStack:1,fishingRod:{power,range,window},descricao:`Pesca peixes que nadam até o anzol. Alcance: ${range} blocos. Clique na água para um arremesso preciso; clique quando a boia mergulhar para fisgar. Segure para puxar, solte nas arrancadas e aproveite os descansos. Mantenha a tensão entre as marcas; uma linha frouxa também solta o peixe. Botão direito troca a isca ou cancela.`},'rod',color,cost,power===1?'hand':'anvil'));}
for(const [key,name,tier,color,cost]of [
 ['BAIT_DOUGH','Isca de massa',0,[199,160,92],[[ITEM.FIBER,2],[ITEM.FLOWER,1]]],
 ['BAIT_INSECT','Isca de inseto',1,[157,108,68],[[ITEM.INSECT,1],[ITEM.FIBER,1]]],
 ['BAIT_AROMA','Isca aromática',2,[143,105,186],[[ITEM.INSECT,2],[ITEM.FLOWER,3],[ITEM.RAW_FISH,1]]],
 ['BAIT_LUMINOUS','Isca luminosa',3,[85,183,207],[[ITEM.GLOW_CAP,2],[ITEM.CRYSTAL,1],[ITEM.INSECT,2]]],
])FISHING_BAITS.push(fishingItem(key,{name,fishingBait:{tier},descricao:`Uma unidade quando a boia chega à água. ${tier>=2?'Atrai também peixes raros. ':''}${tier===3?'Atrai todas as espécies raras. ':''}Iscas melhores atraem de mais longe e aceleram a mordida.`},'bait',color,cost,'hand',6));
const rareSpecs=[
 ['FISH_GOLD_TROUT','goldtrout','Truta dourada','rio',2,[219,160,45],[255,222,108],35],
 ['FISH_MOON','moonfish','Peixe-lua','mar',2,[118,104,202],[204,198,255],40],
 ['FISH_PRISM','prismfish','Peixe-prisma','caverna',3,[67,171,186],[181,245,246],45],
 ['FISH_STAR','starfishfin','Peixe-estelar','mar',3,[100,148,221],[234,238,255],50],
 ['FISH_KOI','koifish','Carpa koi','rio',2,[235,137,76],[255,238,204],42],
 ['FISH_ABYSS','abyssfish','Peixe-abissal','caverna',3,[102,74,168],[158,225,232],52],
];
for(const [key,kind,name,habitat,tier,body,belly,heal]of rareSpecs){
 const id=Math.max(...Object.values(ITEM))+1;ITEM[key]=id;
 defItem(id,{name,cura:8,fishingCatch:kind,descricao:`Peixe raro de ${habitat==='mar'?'oceano':habitat==='rio'?'rios e lagos':'lagos subterrâneos'}. Atraído por ${tier===3?'isca luminosa':'isca aromática ou luminosa'}. Pode ser preparado no forno.`});
 const icon=referenceIcon('food','blue');ITEM_ART[id]=icon;
 const a=AQUATIC[kind]={name,habitat,w:kind==='koifish'?17:kind==='abyssfish'?19:13,h:kind==='koifish'?9:7,hp:5,speed:36,style:'glide',peso:0,fishingTier:tier,fishingItem:id,fishingBehavior:kind==='koifish'?'heavy':'wild',look:{shape:kind==='moonfish'?'tall':kind==='koifish'?'round':'slim',back:body.map(v=>Math.round(v*.6)),body,belly,fin:body,stripe:belly,bands:kind==='koifish'?[255,238,204]:undefined,spots:kind==='abyssfish'?[130,239,231]:[245,235,165]}};
 WILDLIFE[kind]={name,biome:habitat==='mar'?BIOME.OCEAN:BIOME.FOREST,hp:5,speed:a.speed,w:a.w,h:a.h,drop:id,shape:'aquatic',aquatic:true,spec:a,where:'Pesca com iscas sofisticadas em '+(habitat==='mar'?'oceanos':habitat==='rio'?'rios e lagos':'lagos subterrâneos')};FISHING_RARES.push(kind);
 fishingItem(key+'_COOKED', {name:name+' assada',cura:heal,descricao:'Preparada no forno. Recupera '+heal+' pontos de vida.'},'fish',body,[[id,1],[ITEM.COAL,1]],'oven');
 // O ícone cru usa a mesma paleta da espécie viva.
 ITEM_ART[id]=ITEM_ART[ITEM[key+'_COOKED']];
}
// A captura conserva a espécie e reutiliza os pixels do animal vivo.
const FISHING_FOOD={sardine:[5,18],clownfish:[6,21],tang:[7,24],angelfish:[9,28],trout:[10,30],minnow:[3,12],cavefish:[8,26],goldtrout:[12,35],moonfish:[14,40],prismfish:[16,45],starfishfin:[18,50],perch:[7,23],carp:[11,33],catfish:[12,36],salmon:[12,36],mackerel:[8,27],snapper:[11,34],caveeel:[10,32],glowtetra:[6,22],koifish:[14,42],abyssfish:[19,52]};
function fishingSpeciesIcon(kind){
 const sp=aquaticSprite(kind,0).normal,c=makeCanvas(16,16),ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;
 const scale=Math.min(1,14/sp.width,14/sp.height),w=Math.round(sp.width*scale),h=Math.round(sp.height*scale);ctx.drawImage(sp,Math.floor((16-w)/2),Math.floor((16-h)/2),w,h);
 const data=ctx.getImageData(0,0,16,16).data,cores={},pixels=[];let n=0;const colors=new Map();
 for(let y=0;y<16;y++){let row='';for(let x=0;x<16;x++){const i=(y*16+x)*4;if(!data[i+3]){row+='.';continue;}const key=[data[i],data[i+1],data[i+2]].join(',');if(!colors.has(key)){const ch=String.fromCharCode(65+n++);colors.set(key,ch);cores[ch]=key.split(',').map(Number);}row+=colors.get(key);}pixels.push(row);}
 return {cores,pixels};
}
for(const [kind,[rawHeal,cookedHeal]]of Object.entries(FISHING_FOOD)){
 const a=AQUATIC[kind];let id=a.fishingItem;
 if(id==null){id=Math.max(...Object.values(ITEM))+1;ITEM['FISH_'+kind.toUpperCase()]=id;defItem(id,{name:a.name,cura:rawHeal,fishingCatch:kind,descricao:`Recupera ${rawHeal} pontos de vida. Pode ser assado no forno.`});a.fishingItem=id;
  fishingItem('FISH_'+kind.toUpperCase()+'_COOKED',{name:a.name+' assado',cura:cookedHeal,fishingCatch:kind,descricao:`Recupera ${cookedHeal} pontos de vida. Preparado no forno.`},'fish',a.look.body,[[id,1],[ITEM.COAL,1]],'oven');
 }else{ITEM_DEFS[id].cura=rawHeal;ITEM_DEFS[id].descricao+=` Recupera ${rawHeal} pontos de vida.`;}
 ITEM_ART[id]=fishingSpeciesIcon(kind);WILDLIFE[kind].drop=id;
}
// O peixe identificado também serve para preparar a isca, sem exigir
// que o jogador transforme sua captura em um peixe genérico.
for(const kind of ['trout','minnow','sardine'])RECIPES.push({nome:'Isca aromática ('+AQUATIC[kind].name+')',estacao:'hand',ingredientes:[[ITEM.INSECT,2],[ITEM.FLOWER,3],[AQUATIC[kind].fishingItem,1]],resultado:{item:ITEM.BAIT_AROMA,quantidade:6}});
function drawFishingCatch(ctx,g){
 const kind=ITEM_DEFS[g.inventory.slots[g.selected]?.item]?.fishingCatch;if(!kind)return;
 const sp=aquaticSprite(kind,0).normal,p=g.player,h=fishingHand(p);ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(Math.round(h.x),Math.round(h.y));ctx.scale(p.facing||1,1);ctx.drawImage(sp,-3,-Math.floor(sp.height/2));ctx.restore();
}
// Uma sessão por pescador; o anfitrião decide qual peixe realmente mordeu.
const fishingSessions=new Map(),fishingViews=new Map();let fishingWorld=null,fishingSeq=0;
function resetFishing(g){
 for(const s of fishingSessions.values())if(s.fish){s.fish.fishingOwner=null;s.fish.fleeTimer=1.5;}
 fishingSessions.clear();fishingViews.clear();g.fishing=null;g.fishingWasPulling=false;g.fishingPullSync=0;
 g.fishingLeft=!!input.mouse.left;g.fishingCharges?.clear();fishingWorld=g.world;
}
const fishingOnline=()=>typeof NET!=='undefined'&&!!NET.room;
const fishingGuest=()=>fishingOnline()&&NET.guest;
const fishingOwner=()=>fishingOnline()?NET.cid:'local';
function fishingPlayer(owner){return owner===fishingOwner()?game.player:typeof NET!=='undefined'?NET.peers.get(owner):null;}
function fishingTarget(w,x,y){
 if(!Number.isFinite(x)||!Number.isFinite(y)||!w.waterAtPx(x,y))return null;
 const tx=Math.floor(x/T);let ty=Math.floor(y/T);for(let k=0;k<60&&w.hasWater(tx,ty-1);k++)ty--;
 const surface=w.waterSurfacePx(tx,ty);if(surface==null||!w.waterAtPx(x,surface+12))return null;
 return {x,y:surface+12,surface,habitat:waterRoom(w,tx,ty+1).habitat};
}
function fishingWaterPath(w,x,y,xx,yy){
 const n=Math.ceil(Math.hypot(xx-x,yy-y)/4);
 for(let i=0;i<=n;i++){const k=n?i/n:0;if(!w.waterAtPx(lerp(x,xx,k),lerp(y,yy,k))||w.isSolid(Math.floor(lerp(x,xx,k)/T),Math.floor(lerp(y,yy,k)/T)))return false;}return true;
}
function fishingPublish(s){
 const view={owner:s.owner,id:s.id,rod:s.rod,bait:s.bait,x:s.x,y:s.y,vx:s.vx,vy:s.vy,surface:s.surface,state:s.state,time:s.time,age:s.age,tension:s.tension||0,pulling:s.pullUntil>=s.age,struggle:!!s.struggle,progress:s.progress||0,fish:s.fish?.netId,fishKind:s.fish?.kind,phase:s.phase,phaseTime:s.phaseTime,slack:s.slack||0,perfect:!!s.perfect,nibbling:(s.nibble||0)>.1};
 fishingViews.set(s.owner,view);if(fishingOnline()&&!fishingGuest())netRelay({k:'fishing',op:'state',s:view});
 if(s.owner===fishingOwner())game.fishing=view;
}
function fishingEnd(s,reason=''){
 if(!s)return;fishingSessions.delete(s.owner);fishingViews.delete(s.owner);if(s.fish){s.fish.fishingOwner=null;s.fish.fleeTimer=1.5;}
 if(fishingOnline()&&!fishingGuest())netRelay({k:'fishing',op:'end',owner:s.owner,id:s.id,reason});
 if(s.owner===fishingOwner()){game.fishing=null;if(reason)toast(reason);}
}
function fishingBegin(owner,id,rod,bait,target){
 const p=fishingPlayer(owner),def=ITEM_DEFS[rod]?.fishingRod,b=ITEM_DEFS[bait]?.fishingBait;
 if(!p||!def||!b||!target||!Number.isFinite(target.x)||!Number.isFinite(target.y))return false;
 const castTarget=fishingTarget(game.world,target.x,target.y);
 if(castTarget&&Math.hypot(castTarget.x-p.cx,castTarget.y-p.cy)>def.range*T){if(owner===fishingOwner())toast('Água fora do alcance da vara.');return false;}
 if(fishingSessions.has(owner))fishingEnd(fishingSessions.get(owner));
 const hand=fishingHand(p),dx=target.x-hand.x,dy=target.y-hand.y;p.facing=dx>=0?1:-1;
 const angle=clamp(Math.atan2(dy,Math.max(1,Math.abs(dx))),-.7,.35),strength=.65+.35*clamp(Math.hypot(dx,dy)/(def.range*T),0,1),speed=(190+def.range*4)*strength;
 const s={owner,id,rod,bait,castTarget,x:hand.x,y:hand.y,vx:Math.cos(angle)*speed*p.facing,vy:Math.sin(angle)*speed-105,state:'cast',time:.34,age:0,rareTimer:3,restock:3,fish:null,originX:p.x,originY:p.y};fishingSessions.set(owner,s);fishingPublish(s);return true;
}
function fishingBait(g){const choices=FISHING_BAITS.filter(id=>g.inventory.count(id));return choices.includes(g.fishingBait)?g.fishingBait:choices.at(-1);}
function fishingInput(g,def,mouse,rightPressed){
 if(!def?.fishingRod)return false;
 if(fishingWorld!==g.world)resetFishing(g);
 const left=input.mouse.left&&!g.fishingLeft;g.fishingLeft=input.mouse.left;if(g.toolAction&&typeof cancelTool==='function')cancelTool(g);g.swinging=false;g.mining.progress=0;g.target.visible=false;
 if(rightPressed){
  if(g.fishing){if(fishingGuest())netRelay({k:'fishing',op:'cancel',id:g.fishing.id},NET.hostCid);else fishingEnd(fishingSessions.get(fishingOwner()));g.fishing=null;}
  else{const choices=FISHING_BAITS.filter(id=>g.inventory.count(id));g.fishingBait=choices[(choices.indexOf(fishingBait(g))+1)%choices.length];toast(g.fishingBait?'Isca: '+ITEM_DEFS[g.fishingBait].name:'Crie iscas para pescar.');}
 }
 if(!left)return true;
 if(g.fishing){if(fishingGuest())netRelay({k:'fishing',op:'reel',id:g.fishing.id},NET.hostCid);else fishingReel(fishingSessions.get(fishingOwner()));return true;}
 const target={x:mouse.x,y:mouse.y},bait=fishingBait(g),rod=g.inventory.slots[g.selected]?.item;
 if(bait==null){toast('Crie iscas e deixe-as no inventário.');return true;}
 const id=++fishingSeq;g.player.facing=target.x>g.player.cx?1:-1;
 if(fishingGuest()){g.fishing={owner:fishingOwner(),id,rod,bait,...target,state:'pending'};netRelay({k:'fishing',op:'cast',id,rod,bait,x:mouse.x,y:mouse.y},NET.hostCid);}
 else fishingBegin(fishingOwner(),id,rod,bait,target);
 return true;
}
function fishingReel(s){
 if(!s)return;
 if(s.state==='reel'){s.pullUntil=s.age+.2;return;}
 if(s.state==='flight'||s.state==='cast')return;
 if(s.state!=='bite'&&s.fish){s.fish.fishingOwner=null;s.fish=null;}
 s.perfect=s.state==='bite'&&s.time>ITEM_DEFS[s.rod].fishingRod.window*.65;
 s.state='reel';s.pullUntil=s.age+.2;s.time=0;s.progress=s.perfect?.06:0;s.tension=s.perfect?.28:.36;s.reelX=s.x;s.reelY=s.y;s.reelAge=s.age;{const hp=fishingPlayer(s.owner);if(hp){const hnd=fishingHand(hp),dir=Math.sign(hnd.x-s.x)||1;let sx=s.x;for(let i=0;i<160&&game.world.waterAtPx(sx+dir*4,s.surface+4);i++)sx+=dir*4;s.shoreX=sx-dir*3;s.runDir=-dir;s.run=0;}}s.slack=0;s.phase='calm';s.phaseTime=2.2+Math.random()*.8;
 const profile=fishingFightProfile(s);
 s.duration=s.fish?(8+(s.fish.def.spec.fishingTier||0)*2)*profile.duration/Math.pow(ITEM_DEFS[s.rod].fishingRod.power,.35):2.5;
 fishingPublish(s);
}
function fishingRelease(s){if(s?.state==='reel'){s.pullUntil=-1;fishingPublish(s);}}

// Cada espécie alterna descanso, aviso, arrancada e recuperação de forma legível.
const FISHING_FIGHTS={
 steady:{name:'Equilibrado',force:.64,duration:1,burst:[1.05,1.35]},
 dart:{name:'Veloz',force:.82,duration:1.06,burst:[.8,1.2]},
 heavy:{name:'Pesado',force:.74,duration:1.25,burst:[1.5,2]},
 wild:{name:'Imprevisível',force:.92,duration:1.2,burst:[1.1,1.65]},
};
function fishingFightProfile(s){
 const a=s.fish?.def.spec,kind=s.fish?.kind;
 return FISHING_FIGHTS[a?.fishingBehavior||(a?.fishingTier?'wild':['trout','minnow','sardine'].includes(kind)?'dart':'steady')];
}
function fishingFight(s,dt,pulling){
 if(!s.fish){if(pulling)s.progress=Math.min(1,s.progress+dt/s.duration);return '';}
 const profile=fishingFightProfile(s),power=ITEM_DEFS[s.rod].fishingRod.power,tier=s.fish.def.spec.fishingTier||0;
 s.phaseTime-=dt;
 if(s.phaseTime<=0){
  if(s.phase==='calm'){s.phase='warning';s.phaseTime=.85;}
  else if(s.phase==='warning'){s.phase='surge';s.phaseTime=lerp(...profile.burst,Math.random());}
  else if(s.phase==='surge'){s.phase='recovery';s.phaseTime=1.5+Math.random()*.6;}
  else{s.phase='calm';s.phaseTime=1.7+Math.random()*1.4;}
 }
 s.struggle=s.phase==='surge';
 const force=profile.force*(1+tier*.12)/Math.pow(power,.28);
 const rate=pulling?(s.struggle?force:s.phase==='warning'?.18:s.phase==='recovery'?-.07:.09):(s.tension>.2?-.58:-.2);
 s.tension=clamp(s.tension+dt*rate,0,1);
 // Há uma margem para aliviar a linha; abandoná-la por muito tempo solta o anzol.
 s.slack=s.tension<.1&&!pulling?(s.slack||0)+dt:Math.max(0,(s.slack||0)-dt*2);
 if(s.tension>=1)return 'A linha rompeu! Alivie durante a arrancada do peixe.';
 if(s.slack>=2.4)return 'O peixe soltou o anzol. Mantenha um pouco de tensão na linha.';
 if(pulling){
  const rhythm=s.struggle?.12:s.phase==='warning'?.45:s.phase==='recovery'?1.25:1;
  const control=s.tension>.82?.25:s.tension<.12?.5:1;
  s.progress=clamp(s.progress+dt/s.duration*rhythm*control,0,1);
 }else if(s.struggle)s.progress=Math.max(0,s.progress-dt*.025);
 return '';
}
function fishingCatch(s){
 const m=s.fish;if(!m||m.dead||m.despawn){fishingEnd(s,'O peixe escapou.');return;}
 const item=m.def.spec.fishingItem??ITEM.RAW_FISH,name=m.def.name;m.despawn=true;
 if(s.owner===fishingOwner()){if(game.inventory.add(item,1))dropItem(game,item,1,game.player.cx,game.player.cy);playSfx('pickup');fishingPopup(game,item);toast('Pescou: '+name+'!');}
 else if(fishingOnline())netRelay({k:'fishing',op:'catch',id:s.id,item,name},s.owner);
 fishingEnd(s);
}
function fishingRare(s,dt){
 if((s.rareTimer-=dt)>0)return;s.rareTimer=10;
 const tier=ITEM_DEFS[s.bait].fishingBait.tier;if(tier<2||Math.random()>.12+(tier-2)*.12)return;
 const pool=FISHING_RARES.filter(k=>AQUATIC[k].habitat===s.habitat&&AQUATIC[k].fishingTier<=tier);
 if(!pool.length||game.mobs.some(m=>m.def?.spec?.fishingTier&&Math.hypot(m.cx-s.x,m.cy-s.y)<20*T))return;
 const kind=pool[Math.floor(Math.random()*pool.length)],a=AQUATIC[kind];
 for(let i=0;i<12;i++){
  const x=s.x+(Math.random()<.5?-1:1)*(48+Math.random()*100),y=s.y+20+Math.random()*45;
  if(!boxInWater(game.world,x,y,a.w,a.h)||!fishingWaterPath(game.world,x+a.w/2,y+a.h/2,s.x,s.y))continue;
  game.mobs.push(new Wildlife(kind,x,y));break;
 }
}
function fishingLand(s,target){
 if(s.owner===fishingOwner()&&!game.inventory.removeItem(s.bait,1)){fishingEnd(s,'Sem isca: a linha foi recolhida.');return;}
 const power=ITEM_DEFS[s.rod].fishingRod.power,tier=ITEM_DEFS[s.bait].fishingBait.tier;
 Object.assign(s,target,{state:'wait',vx:0,vy:0,time:0,waitAge:0,waitTime:Math.max(5,(8+Math.random()*7)/(1+(power-1)*.25+tier*.08))});fishingPublish(s);
 playSfx('splash',s.x,s.surface,{power:.3});
 // Respingos discretos no ponto de chegada, usando as partículas existentes.
 for(let i=0;i<5&&game.particles.length<460;i++)game.particles.push({x:s.x,y:s.surface,vx:(i-2)*18,vy:-28-Math.random()*25,life:.45,maxLife:.45,color:'#aedce6',w:1,h:1,gravity:150});
}
function fishingFlight(s,dt){
 const w=game.world,n=Math.max(1,Math.ceil(dt/.012));
 for(let i=0;i<n;i++){
  const step=dt/n;s.vy+=420*step;s.x+=s.vx*step;s.y+=s.vy*step;
  if(s.x<0||s.x>=w.w*T||s.y>=w.h*T||w.isSolid(Math.floor(s.x/T),Math.floor(s.y/T))){fishingEnd(s,'A boia caiu fora da água.');return;}
  if(w.waterAtPx(s.x,s.y)){
   const target=fishingTarget(w,s.x,s.y);if(target)fishingLand(s,target);else fishingEnd(s,'Água rasa demais para pescar.');return;
  }
 }
 if((s.sync=(s.sync||0)+dt)>.12){s.sync=0;fishingPublish(s);}
}
// Se o lago está vazio, entram novos peixes pelo espaço disponível na água.
// Eles continuam sendo criaturas do mundo, nunca uma recompensa sorteada no anzol.
function fishingRestock(s,dt){
 if((s.restock-=dt)>0)return;s.restock=5;
 if(s.fish||game.mobs.some(m=>!m.dead&&!m.despawn&&m.def?.aquatic&&!m.def.spec.dano&&(m.def.spec.fishingTier||0)<=ITEM_DEFS[s.bait].fishingBait.tier&&Math.hypot(m.cx-s.x,m.cy-s.y)<14*T&&fishingWaterPath(game.world,m.cx,m.cy,s.x,s.y)))return;
 const w=game.world,tx=Math.floor(s.x/T),ty=Math.floor(s.y/T),room=waterRoom(w,tx,ty);
 if(room.width<6||room.depth<3||game.mobs.filter(m=>m.def?.aquatic&&Math.hypot(m.cx-s.x,m.cy-s.y)<24*T).length>=12)return;
 for(let i=0;i<30;i++){
  const x=s.x+(i%2?1:-1)*(3+Math.floor(i/2)%6)*T,y=s.y+(1+Math.floor(i/12))*T;
  const kind=pickAquatic(w,Math.floor(x/T),Math.floor(y/T),room);if(!kind||AQUATIC[kind].dano)continue;const a=AQUATIC[kind];
  if(!boxInWater(w,x,y,a.w,a.h)||!fishingWaterPath(w,x+a.w/2,y+a.h/2,s.x,s.y))continue;
  const fish=new Wildlife(kind,x,y);fish.fishingArrival=true;game.mobs.push(fish);return;
 }
}
function updateFishing(g,dt){
 if(fishingWorld!==g.world)resetFishing(g);
 if(!input.mouse.left)g.fishingLeft=false;
 if(g.fishing?.state==='reel'&&input.mouse.left){
  if(fishingGuest()){g.fishingPullSync=(g.fishingPullSync||0)+dt;if(g.fishingPullSync>=.1){g.fishingPullSync=0;netRelay({k:'fishing',op:'reel',id:g.fishing.id},NET.hostCid);}}
  else fishingReel(fishingSessions.get(fishingOwner()));
 }
 if(g.fishing?.state==='reel'&&!input.mouse.left&&g.fishingWasPulling){
  if(fishingGuest())netRelay({k:'fishing',op:'release',id:g.fishing.id},NET.hostCid);
  else fishingRelease(fishingSessions.get(fishingOwner()));
 }
 g.fishingWasPulling=g.fishing?.state==='reel'&&input.mouse.left;
 if(fishingGuest()){
  if(g.fishing&&g.inventory.slots[g.selected]?.item!==g.fishing.rod){netRelay({k:'fishing',op:'cancel',id:g.fishing.id},NET.hostCid);g.fishing=null;}
  return;
 }
 for(const s of [...fishingSessions.values()]){
  const p=fishingPlayer(s.owner),rod=ITEM_DEFS[s.rod].fishingRod;s.age+=dt;
  if(!p||Math.hypot(p.x-s.originX,p.y-s.originY)>rod.range*T||s.age>120){fishingEnd(s,'Linha recolhida.');continue;}
  if(s.owner===fishingOwner()&&g.inventory.slots[g.selected]?.item!==s.rod){fishingEnd(s);continue;}
  if(s.fish&&(s.fish.dead||s.fish.despawn)){fishingEnd(s,'O peixe escapou.');continue;}
  if(s.state==='cast'){
   s.time-=dt;const tip=fishingRodTip(p,s.rod,s);s.x=tip.x;s.y=tip.y;
   if(s.time<=0){
    s.state='flight';const release=fishingRodTip(p,s.rod,s);s.x=release.x;s.y=release.y;
    if(s.castTarget){const flightTime=clamp(.35+Math.abs(s.castTarget.x-s.x)/400,.35,1.1);s.vx=(s.castTarget.x-s.x)/flightTime;s.vy=(s.castTarget.surface+1-s.y-210*flightTime*flightTime)/flightTime;}
    fishingPublish(s);
   }
   continue;
  }
  if(s.state==='flight'){if(Math.hypot(s.x-p.cx,s.y-p.cy)>rod.range*T*1.6){fishingEnd(s,'Linha recolhida.');continue;}fishingFlight(s,dt);continue;}
  if(s.state!=='reel'&&!g.world.waterAtPx(s.x,s.surface+12)){fishingEnd(s,'A água secou: linha recolhida.');continue;}
  if(s.state==='bite'&&(s.time-=dt)<=0)fishingEnd(s,'O peixe soltou o anzol. Clique quando a boia mergulhar.');
  else if(s.state==='reel'){
   const pulling=s.pullUntil>=s.age,hand=fishingHand(p),lost=fishingFight(s,dt,pulling);
   if(lost){fishingEnd(s,lost);continue;}
   // Puxadas da vara se alternam com o molinete; o peixe continua preso
   // no mundo durante toda a disputa e só é entregue junto à mão.
   // O peixe é arrastado pela água até a margem (arrancadas o puxam para longe da mão) e só no fim é erguido num arco.
   const k=s.progress,split=.72,surfY=s.surface+3,shore=s.shoreX??s.reelX;let bx,by;
   if(k<split){const t=k/split,e=t*.65+t*t*(3-2*t)*.35;bx=lerp(s.reelX,shore,e);by=lerp(s.reelY,surfY,clamp(t*1.5,0,1));}
   else{const t=(k-split)/(1-split),apex=Math.min(surfY-1.4*T,hand.y-.5*T);bx=lerp(shore,hand.x,t*t*(3-2*t));by=(1-t)*(1-t)*surfY+2*(1-t)*t*apex+t*t*hand.y;}
   s.run=clamp((s.run||0)+(s.fish?(s.struggle&&!pulling?dt*70:s.struggle?dt*18:-dt*(pulling?55:25)):0),0,34);
   const xx=bx+(s.runDir||0)*s.run*(1-k*.6),yy=by+s.run*.12;
   if(g.world.isSolid(Math.floor(xx/T),Math.floor(yy/T))){fishingEnd(s,'A linha ficou presa na margem.');continue;}
   s.x=xx;s.y=yy;
   if(s.fish){s.fish.x=s.x-s.fish.w/2;s.fish.y=s.y-s.fish.h/2;s.fish.facing=hand.x>=s.x?1:-1;s.fish.pitch=s.struggle?Math.sin(s.age*16)*.35:0;}
   if(s.progress>=1){if(s.fish)fishingCatch(s);else fishingEnd(s);continue;}
   if((s.sync=(s.sync||0)+dt)>.1){s.sync=0;fishingPublish(s);}
  }
  if(s.state==='wait'){s.waitAge+=dt;fishingRare(s,dt);fishingRestock(s,dt);}
 }
}
function fishingSteer(m,dt,w){
 if(!m.def?.aquatic||m.def.spec.dano||m.hurtTimer>0||m.fleeTimer>0||(!m.fishingOwner&&!boxInWater(w,m.x,m.y,m.w,m.h)))return false;
 let s=m.fishingOwner&&fishingSessions.get(m.fishingOwner);
 if(!s)for(const candidate of fishingSessions.values()){
  const tier=ITEM_DEFS[candidate.bait].fishingBait.tier,power=ITEM_DEFS[candidate.rod].fishingRod.power;
  if(candidate.state!=='wait'||candidate.fish&&candidate.fish!==m||(m.def.spec.fishingTier||0)>tier||Math.hypot(m.cx-candidate.x,m.cy-candidate.y)>(7+tier*2)*T*power)continue;
  if(!fishingWaterPath(w,m.cx,m.cy,candidate.x,candidate.y))continue;s=candidate;s.fish=m;m.fishingOwner=s.owner;break;
 }
 if(!s)return false;
 m.clock+=dt;m.tail=(m.tail||0)+dt*9;m.hurtTimer=Math.max(0,m.hurtTimer-dt);
 if(s.state==='reel'||s.state==='bite'){m.x=s.x-m.w/2;m.y=s.y-m.h/2;m.vx=m.vy=0;return true;}
 const ready=s.waitAge>=s.waitTime,angle=m.clock*1.4,orbit=ready?0:24;
 const dx=s.x+Math.cos(angle)*orbit-m.cx,dy=s.y+Math.abs(Math.sin(angle))*orbit-m.cy,dist=Math.hypot(dx,dy),speed=m.def.speed*(.75+ITEM_DEFS[s.rod].fishingRod.power*.25);
 m.vx=dx/(dist||1)*Math.min(speed,dist*3);m.vy=dy/(dist||1)*Math.min(speed,dist*3);const hit=swimStep(m,w,m.vx*dt,m.vy*dt);m.facing=dx>=0?1:-1;m.pitch=clamp(Math.atan2(m.vy,Math.abs(m.vx)+20),-.4,.4);
 if(hit.hitX||hit.hitY){m.fishingOwner=null;s.fish=null;return false;}
 if(ready&&dist<5){s.nibble=(s.nibble||0)+dt*(1+ITEM_DEFS[s.bait].fishingBait.tier*.1);if(s.nibble>1.8){s.state='bite';s.time=ITEM_DEFS[s.rod].fishingRod.window;fishingPublish(s);if(s.owner===fishingOwner())playSfx('fishingBite');}}
 return true;
}
{
 const base=updateAquatic;updateAquatic=function(m,dt,w,p){if(!fishingSteer(m,dt,w))base(m,dt,w,p);};
}
{
 const base=drawAquatic;drawAquatic=function(ctx,m){if(m.fishingArrival&&m.clock<.8){ctx.save();ctx.globalAlpha*=Math.max(.1,m.clock/.8);base(ctx,m);ctx.restore();}else base(ctx,m);};
}
addPoses('fishCast',Array.from({length:6},(_,i)=>basePose({feet:[12,22],lean:i<3?-1:1,bob:i===4?1:0,hands:[18,[21,20,19,22,25,26][i]],handLift:[6,[9,14,18,14,8,5][i]],elbowLift:[3,8]})));
addPoses('fishWait',Array.from({length:4},(_,i)=>basePose({feet:[13,21],hands:[20,24],handLift:[5,5],elbowLift:[2,3],breath:i===1?1:0})));
addPoses('fishPull',Array.from({length:8},(_,i)=>basePose({feet:[11,23],lean:i<4?-1:0,bob:i===0||i===7?1:0,hands:[[18,19,20,19,18,17,18,19][i],[21,20,20,21,22,23,23,22][i]],handLift:[[6,8,7,5,4,6,8,7][i],[8,10,11,10,9,7,7,8][i]],elbowLift:[4,5]})));
function fishingState(p){
 if(p===game.player)return fishingSessions.get(fishingOwner())||fishingVisual(game.fishing);
 for(const s of fishingViews.values())if(fishingPlayer(s.owner)===p)return fishingVisual(s);return null;
}
function fishingVisual(s){
 if(!s||!fishingGuest()||s.receivedAt==null)return s;
 const elapsed=clamp((game.clock||0)-s.receivedAt,0,.35);return {...s,age:(s.age||0)+elapsed,time:s.state==='cast'?Math.max(0,s.time-elapsed):s.time};
}
function fishingAnim(s){
 if(s?.state==='cast')return PLAYER_ANIMS.fishCast+clamp(Math.floor((.34-s.time)/.34*6),0,5);
 if(s?.state==='flight'&&s.age<.65)return PLAYER_ANIMS.fishCast+5;
 if(s?.state==='reel'||s?.state==='bite')return PLAYER_ANIMS.fishPull+((s.pullUntil!=null?s.pullUntil<s.age:s.pulling===false)?7:Math.floor((s.age||0)*9)%8);
 return PLAYER_ANIMS.fishWait+Math.floor((s?.age||0)*2)%4;
}
function fishingBodyFrame(g){
 const p=g.player,s=fishingState(p);if(!s||Math.abs(p.vx||0)>20||p.crouching||Math.abs(p.flightTilt||p.swimTilt||0)>.02)return null;return fishingAnim(s);
}
function fishingHand(p){
 const s=fishingState(p),frame=s&&!p.crouching&&Math.abs(p.vx||0)<=20?fishingAnim(s):playerFrame(p),pose=PLAYER_POSES[frame],f=p.facing||1;
 const sx=Math.round(p.x+p.w/2-PLAYER_SPR_W/2),sy=Math.round(p.y+(p.stepOffset||0)+p.h-PLAYER_SPR_H);
 return {x:sx+(f>0?pose.hands[1]:PLAYER_SPR_W-pose.hands[1]),y:sy+pose.sy+10+pose.bob-pose.handLift[1]};
}
// Varas rasterizadas em pixels inteiros. O cabo e a ponta usam os mesmos
// encaixes da linha, para o fio não flutuar separado do sprite.
const FISHING_ROD_ART=FISHING_RODS.map((id,model)=>Array.from({length:3},(_,frame)=>{
 const c=makeCanvas(30,36),ctx=c.getContext('2d'),color=ITEM_ART[id].cores.b;
 const base=rgb(color),light=rgb(color.map(v=>Math.min(255,v+65))),dark='#282737';
 const dot=(x,y,col,w=1,h=1)=>{ctx.fillStyle=col;ctx.fillRect(x,y,w,h);};
 const pixels=(ax,ay,bx,by,col,width=1)=>{
  const n=Math.max(Math.abs(bx-ax),Math.abs(by-ay));
  for(let j=0;j<=n;j++)dot(Math.round(lerp(ax,bx,j/n)),Math.round(lerp(ay,by,j/n)),col,width,width);
 };
 const points=[[4,31],[8,26],[12,19],[18,11],[24,5+frame],[27,4+frame*2]];
 for(let i=1;i<points.length;i++){
  const [ax,ay]=points[i-1],[bx,by]=points[i];pixels(ax,ay,bx,by,dark,2);pixels(ax,ay,bx,by,base);if(i<4)pixels(ax-1,ay,bx-1,by,light);
 }
 // Empunhadura em couro, com três voltas da amarração.
 pixels(3,32,7,27,'#453429',3);pixels(3,31,7,27,'#a98052');
 for(const [x,y]of [[4,31],[5,29],[6,27]])dot(x,y,'#d1b584',2);
 // Molinete e manivela, em vez de uma simples haste reta.
 dot(8,25,dark,5,5);dot(9,26,model===0?'#9b805a':'#a5bdc6',3,3);dot(10,27,model===0?'#ead5a0':light);dot(12,28,dark,3);dot(14,28,'#b8cdd4');
 for(const [x,y]of [[12,19],[18,11],[24,6+frame]]){dot(x+1,y,'#d7e5e9');dot(x+2,y+1,dark);}
 if(model===1){dot(11,20,'#dce5e7',2,2);dot(16,14,'#dce5e7',2,2);}
 if(model===2){for(const [x,y]of [[14,17],[21,9]]){dot(x,y,dark,3,4);dot(x+1,y-1,light);dot(x,y+1,'#718df0',3);dot(x+1,y, '#d7e8ff',1,3);}}
 if(model===3){pixels(17,11,14,8,'#64acb5');pixels(14,8,18,9,'#c7f3e8');pixels(22,6+frame,20,3+frame,'#64acb5');dot(22,5+frame,'#e4ffff');dot(16,12,'#e7d386',2);}
 c.rodTip={x:27,y:4+frame*2};return c;
}));
function fishingRodFrame(s){return s?.state==='flight'?1:s?.state==='bite'?2:0;}
const fishingRodPixels=new Map();
function fishingRodAngle(s){
 if(s?.state==='cast')return [-.15,-.6,-.9,-.35,.25,.6][clamp(Math.floor((.34-s.time)/.34*6),0,5)];
 if(s?.state==='flight')return lerp(.6,.22,clamp(((s.age||.34)-.34)/.6,0,1));
 if(s?.state==='reel'||s?.state==='bite')return -.12+(s.tension||0)*-.3+Math.sin((s.age||0)*6)*.14;
 return .22;
}
function fishingRodSprite(rod,state){
 const model=Math.max(0,FISHING_RODS.indexOf(rod)),frame=fishingRodFrame(state),angle=Math.round(fishingRodAngle(state)/.06)*.06,key=model+':'+frame+':'+angle;
 if(fishingRodPixels.has(key))return fishingRodPixels.get(key);
 const source=FISHING_ROD_ART[model][frame],c=makeCanvas(80,80),ctx=c.getContext('2d'),data=source.getContext('2d').getImageData(0,0,source.width,source.height).data,cs=Math.cos(angle),sn=Math.sin(angle);
 for(let y=0;y<source.height;y++)for(let x=0;x<source.width;x++){const i=(y*source.width+x)*4;if(!data[i+3])continue;const dx=x-4,dy=y-31;ctx.fillStyle=`rgb(${data[i]},${data[i+1]},${data[i+2]})`;ctx.fillRect(40+Math.round(dx*cs-dy*sn),56+Math.round(dx*sn+dy*cs),1,1);}
 const dx=source.rodTip.x-4,dy=source.rodTip.y-31;c.rodTip={x:Math.round(dx*cs-dy*sn),y:Math.round(dx*sn+dy*cs)};fishingRodPixels.set(key,c);return c;
}
function fishingRodTip(p,rod,state){
 const sprite=fishingRodSprite(rod,state),h=fishingHand(p);
 return {x:h.x+(p.facing||1)*sprite.rodTip.x,y:h.y+sprite.rodTip.y};
}
function drawFishingRod(ctx,g){
 const p=g.player,h=fishingHand(p),f=p.facing||1,rod=g.inventory.slots[g.selected]?.item;
 const state=fishingState(p)||g.fishing,sprite=fishingRodSprite(rod,state);
 ctx.save();ctx.imageSmoothingEnabled=false;ctx.translate(Math.round(h.x),Math.round(h.y));ctx.scale(f,1);ctx.drawImage(sprite,-40,-56);ctx.restore();
}
function drawFishing(ctx,g){
 const list=new Map(fishingViews);if(g.fishing)list.set(fishingOwner(),g.fishing);
 if(!fishingGuest())for(const s of fishingSessions.values())list.set(s.owner,s);
 const t=g.clock||0;ctx.save();ctx.lineWidth=1;
 for(const s of list.values()){
  if(s.state==='pending')continue;
  const p=fishingPlayer(s.owner);if(!p)continue;const tip=fishingRodTip(p,s.rod,fishingVisual(s));
  const flight=s.state==='flight',airborne=flight||s.state==='cast',elapsed=flight&&fishingGuest()?Math.min(.2,Math.max(0,t-(s.receivedAt??t))):0,smooth=fishingGuest()?clamp((t-(s.receivedAt??t))/.1,0,1):1;
  const bx=s.state==='reel'?lerp(s.previousX??s.x,s.x,smooth):s.x+(s.vx||0)*elapsed;
  const bob=airborne?s.y+(flight?(s.vy||0)*elapsed+210*elapsed*elapsed:0):s.state==='reel'?lerp(s.previousY??s.y,s.y,smooth):s.state==='bite'?s.surface+5+Math.sin(t*18)*2:s.surface-2+Math.sin(t*((s.nibbling||s.nibble>.1)?14:3));
  const taut=s.state==='reel'||s.state==='bite',sag=taut?2:Math.min(22,Math.abs(bx-tip.x)*.09+5);
  ctx.strokeStyle=(s.tension||0)>.7?'#ed9c75':s.phase==='warning'?'#edcd82':'rgba(225,237,243,.85)';ctx.beginPath();ctx.moveTo(tip.x,tip.y);ctx.quadraticCurveTo((tip.x+bx)/2,(tip.y+bob)/2+sag,bx,bob);ctx.stroke();
  ctx.fillStyle='#302833';ctx.fillRect(Math.round(bx)-2,Math.round(bob)-2,5,6);ctx.fillStyle=s.state==='bite'?'#ffce67':'#f2eee0';ctx.fillRect(Math.round(bx)-1,Math.round(bob)-1,3,2);ctx.fillStyle='#d35541';ctx.fillRect(Math.round(bx)-1,Math.round(bob)+1,3,2);
  if(airborne)continue;
  ctx.strokeStyle='rgba(192,214,224,.4)';ctx.beginPath();ctx.moveTo(s.x,bob+4);ctx.lineTo(s.x,s.y);ctx.stroke();
  ctx.fillStyle='#c7dee4';ctx.fillRect(Math.round(s.x),Math.round(s.y),2,2);
  if(s.state!=='reel'&&s.state!=='cast'){const width=5+Math.floor((t*2)%3)*3;ctx.fillStyle='rgba(190,226,238,.5)';ctx.fillRect(Math.round(s.x)-width,Math.round(s.surface)+1,width-3,1);ctx.fillRect(Math.round(s.x)+4,Math.round(s.surface)+1,width-3,1);}
  if(s.state==='bite'){ctx.font='10px Silkscreen';ctx.textAlign='center';ctx.fillStyle='#ffe3a2';ctx.fillText('!',s.x,s.surface-12);}
  if(s.state==='reel'&&s.fish){
   const x=Math.round(bx)-12,y=Math.round(bob)-15;ctx.fillStyle='#242d35';ctx.fillRect(x,y,25,5);ctx.fillStyle=(s.tension||0)>.7?'#ef866c':'#9ddac3';ctx.fillRect(x+1,y+1,Math.round(23*(s.tension||0)),3);
   if(s.struggle&&s.progress<.72){ctx.fillStyle='#b2dce8';for(let i=0;i<3;i++)ctx.fillRect(Math.round(bx)+Math.round(Math.sin(t*12+i*2)*8),Math.round(s.surface)-2-i,2,1);}
  }
 }
 ctx.restore();
}

function drawFishingHud(ctx,g,W,H){
 if(g.intro?.active||g.mapUI?.open||g.inventoryUI?.open||g.adminOpen)return;
 const rod=ITEM_DEFS[g.inventory.slots[g.selected]?.item]?.fishingRod,s=g.fishing;
 if(!rod&&!s)return;
 const state=s?.state||'ready',fight=state==='reel'&&!!s.fishKind,bite=state==='bite';
 const width=Math.min(374,W-24),height=fight?145:90,x=Math.floor((W-width)/2),y=Math.max(12,H-height-38);
 const color=bite?'#ffe098':s?.phase==='surge'?'#f19b85':s?.phase==='warning'?'#edcc7c':'#a7d6ca';
 ctx.save();ctx.textAlign='left';ctx.textBaseline='alphabetic';ctx.font='11px Silkscreen,monospace';
 ctx.fillStyle='rgba(16,29,36,.94)';ctx.fillRect(x,y,width,height);
 ctx.strokeStyle='#547773';ctx.strokeRect(x+.5,y+.5,width-1,height-1);
 ctx.fillStyle=color;ctx.fillRect(x,y,3,height);
 const fish=AQUATIC[s?.fishKind],bait=s?.bait??fishingBait(g);
 let title=bite?'FISGUE AGORA!':fish?fish.name:state==='ready'?'PESCARIA':state==='wait'?'DE OLHO NA BOIA':'LANÇANDO A LINHA';
 if(state==='reel'&&!fight)title='RECOLHENDO A LINHA';
 ctx.fillStyle='#f5ecd3';ctx.fillText(title,x+15,y+23);
 if(fish){const icon=aquaticSprite(s.fishKind,0).normal,scale=Math.min(1.5,36/icon.width,23/icon.height);ctx.imageSmoothingEnabled=false;ctx.drawImage(icon,x+width-49,y+10,Math.round(icon.width*scale),Math.round(icon.height*scale));}
 ctx.font='9px Silkscreen,monospace';ctx.fillStyle='#9bb8bd';
 ctx.fillText(fish?fishingFightProfile({fish:{kind:s.fishKind,def:{spec:fish}}}).name+(s.perfect?' · Fisgada precisa':''):bait!=null?ITEM_DEFS[bait].name+' · '+g.inventory.count(bait)+' no inventário':'Crie iscas para começar',x+15,y+41);
 const bar=(label,value,yy,fill,safe=false)=>{
  ctx.fillStyle='#c8d6d4';ctx.fillText(label,x+15,yy);
  const bx=x+89,bw=width-107;ctx.fillStyle='#283e47';ctx.fillRect(bx,yy-7,bw,8);
  if(safe){ctx.fillStyle='#476860';ctx.fillRect(bx+bw*.2,yy-7,bw*.5,8);}
  ctx.fillStyle=fill;ctx.fillRect(bx,yy-7,Math.round(bw*clamp(value,0,1)),8);
  if(safe){ctx.fillStyle='#d7e5dc';for(const k of [.2,.7])ctx.fillRect(Math.round(bx+bw*k),yy-9,1,12);}
 };
 if(fight){
  bar('CAPTURA',s.progress||0,y+65,'#8bc8b1');
  bar('TENSÃO',s.tension||0,y+86,(s.tension||0)>.7?'#e88a78':'#e1c389',true);
  const cue=(s.slack||0)>1?'Linha frouxa: volte a puxar!':s.tension>.7?'ALIVIE · a linha está muito tensa':s.phase==='surge'?'ALIVIE · solte o botão esquerdo':s.phase==='warning'?'ATENÇÃO · o peixe vai arrancar':s.phase==='recovery'?'APROVEITE · segure para recolher':'RECOLHA · segure o botão esquerdo';
  ctx.fillStyle=color;ctx.fillText(cue,x+15,y+112);
  ctx.fillStyle='#9bb8bd';ctx.fillText('Direito: cancelar · evite os extremos da tensão',x+15,y+132);
 }else{
  if(bite)bar('FISGADA',s.time/(ITEM_DEFS[s.rod].fishingRod.window),y+61,'#efce80');
  else{ctx.fillStyle=color;ctx.fillText(state==='ready'?'Clique na água para arremessar':state==='wait'?(s.nibbling?'O peixe está beliscando... aguarde o mergulho.':'Espere a boia mergulhar para clicar.'):'A boia e o peixe acompanham a linha.',x+15,y+61);}
  ctx.fillStyle='#9bb8bd';ctx.fillText(bite?'Clique esquerdo agora!':state==='ready'?'Direito: trocar isca':'Direito: cancelar',x+15,y+80);
 }
 ctx.restore();
}
window.addEventListener('DOMContentLoaded',()=>{
 const relay=netOnRelay;
 netOnRelay=function(from,d){
  if(d?.k!=='fishing')return relay(from,d);
  if(NET.guest){
   if(from!==NET.hostCid)return;
   if(d.op==='state'){
    const previous=fishingViews.get(d.s.owner);if(previous?.id===d.s.id){d.s.previousX=previous.x;d.s.previousY=previous.y;}
    if(d.s.state==='bite'&&d.s.owner===NET.cid&&(previous?.id!==d.s.id||previous?.state!=='bite'))playSfx('fishingBite');
    if(d.s.state==='wait'&&(previous?.id!==d.s.id||previous?.state!=='wait'))playSfx('splash',d.s.x,d.s.surface,{power:.3});
    d.s.receivedAt=game.clock||0;
    if(d.s.owner===NET.cid&&d.s.state==='wait'&&!game.fishingCharges?.has(d.s.id)){
     (game.fishingCharges??=new Set()).add(d.s.id);
     if(!game.inventory.removeItem(d.s.bait,1)){netRelay({k:'fishing',op:'cancel',id:d.s.id},NET.hostCid);game.fishing=null;return;}
    }
    fishingViews.set(d.s.owner,d.s);if(d.s.owner===NET.cid)game.fishing=d.s;
   }
   if(d.op==='end'){fishingViews.delete(d.owner);if(d.owner===NET.cid&&game.fishing?.id===d.id){game.fishing=null;if(d.reason)toast(d.reason);}}
   if(d.op==='catch'&&game.fishing?.id===d.id&&!game.fishing.rewarded){game.fishing.rewarded=true;if(game.inventory.add(d.item,1))dropItem(game,d.item,1,game.player.cx,game.player.cy);playSfx('pickup');fishingPopup(game,d.item);toast('Pescou: '+d.name+'!');}
   if(d.op==='reject'&&game.fishing?.id===d.id){game.fishing=null;toast('Não foi possível lançar a linha.');}
   return;
  }
  if(!NET.peers.has(from))return;
  if(d.op==='cast'){if(!fishingBegin(from,d.id,d.rod,d.bait,{x:d.x,y:d.y}))netRelay({k:'fishing',op:'reject',id:d.id},from);}
  const s=fishingSessions.get(from);if(!s||s.id!==d.id)return;
  if(d.op==='cancel')fishingEnd(s);if(d.op==='reel')fishingReel(s);if(d.op==='release')fishingRelease(s);
 };
});
