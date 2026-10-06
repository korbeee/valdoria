'use strict';

const FLIGHT_WINGS=[];
const flightId=key=>{ITEM[key]=Math.max(...Object.values(ITEM))+1;return ITEM[key];};
const wingPixels=['................','k..............k','ak............ka','bak..........kab','cbak........kabc','ccbak......kabcc','.ccbak....kabcc.','..ccbak..kabcc..','...ccbayyabcc...','....ccbyybcc....','.....ccbbcc.....','......cccc......','.......kk.......','................','................','................'];
function defineFlightWing(key,name,time,speed,colors,ingredients){
 const id=flightId(key),rule={time,speed,horizontal:speed*.9,colors};
 defItem(id,{name,acessorio:{voo:true},flight:rule,maxStack:1,bossItem:!ingredients,descricao:`No cinto: segure o pulo para voar; A/D direcionam. ${isFinite(time)?time+' s de impulso, recuperados ao pousar.':'Voo infinito, sem combustível.'} Soltar o pulo encerra o impulso.`});
 ITEM_ART[id]={cores:{k:[17,22,31],a:colors[0],b:colors[1],c:colors[2],y:[246,216,139]},pixels:wingPixels};
 FLIGHT_WINGS.push(id);
 if(ingredients)RECIPES.push({nome:name,estacao:'anvil',ingredientes:ingredients,resultado:{item:id,quantidade:1}});
 return id;
}
defineFlightWing('CLOTH_WINGS','Asas de tecido',2,155,[[112,68,43],[171,113,63],[229,183,114]],[[ITEM.CLOTH,10],[ITEM.FIBER,18],[ITEM.LEATHER,6]]);
defineFlightWing('BONE_WINGS','Asas de osso e seda',5,190,[[93,90,90],[166,155,139],[231,222,197]],[[ITEM.BONE,20],[ITEM.SILK,12],[ITEM.LEATHER,10],[ITEM.BRONZE,4]]);
defineFlightWing('CRYSTAL_WINGS','Asas de cristal do vento',10,235,[[44,102,133],[75,173,191],[172,235,238]],[[ITEM.WIND_CRYSTAL,10],[ITEM.CLOUD_ESSENCE,12],[ITEM.FEATHER,20],[ITEM.METAL_BAR,8]]);
defineFlightWing('MECHANICAL_WINGS','Asas mecânicas dos Vigias',18,275,[[60,66,87],[132,148,172],[205,224,225]],[[ITEM.MAGNETITE,16],[ITEM.BRONZE,18],[ITEM.GEAR,8],[ITEM.WIND_CRYSTAL,14],[ITEM.OBSIDIAN,12]]);
const nucleusWings=defineFlightWing('VIGIA_WINGS','Asas do Núcleo dos Vigias',Infinity,360,[[32,93,103],[63,173,178],[193,251,235]],null);
WILDLIFE.nucleo.drops.push([nucleusWings,1,1,1]);
const storm=ITEM_DEFS[ITEM.STORM_WINGS];
delete storm.planar;delete storm.pulos;storm.acessorio={voo:true};storm.flight={time:30,speed:320,horizontal:288,colors:[[44,49,89],[98,116,175],[179,236,253]]};
storm.descricao='No cinto: segure o pulo para voar por 30 s de impulso; A/D direcionam. Recupera o voo ao pousar. Só as Asas do Núcleo voam por mais tempo.';
FLIGHT_WINGS.push(ITEM.STORM_WINGS);

flightId('JETPACK');flightId('FLIGHT_FUEL');
defItem(ITEM.JETPACK,{name:'Jetpack dos Vigias',acessorio:{voo:true},flight:{time:Infinity,speed:300,horizontal:250,jet:true},maxStack:1,descricao:'No cinto: segure o pulo para voar. Consome automaticamente Células de combustível da mochila: 20 s de impulso por célula. Sem limite de voo enquanto houver combustível; pousar não repõe combustível.'});
defItem(ITEM.FLIGHT_FUEL,{name:'Célula de combustível',descricao:'Combustível do Jetpack dos Vigias. Cada célula fornece 20 s de impulso e é consumida automaticamente da mochila ao voar.'});
ITEM_ART[ITEM.JETPACK]={cores:{k:[17,22,31],d:[57,67,79],m:[115,132,148],l:[209,225,227],c:[67,181,197],f:[252,170,50]},pixels:['................','....kk....kk....','...kllk..kllk...','...kmmkkkkmmk...','...kmdkcckdmk...','...kmdkcckdmk...','...kmmkddkmmk...','...kmmkddkmmk...','...kmmkkkkmmk...','...kddk..kddk...','....kk....kk....','....ff....ff....','....ff....ff....','................','................','................']};
ITEM_ART[ITEM.FLIGHT_FUEL]={cores:{k:[22,29,32],m:[119,133,137],l:[214,230,224],f:[238,167,59],d:[155,90,37]},pixels:['................','......kkkk......','.....kllllk.....','....kmmmmmmk....','....kffffffk....','....kffddffk....','....kffddffk....','....kffffffk....','....kffddffk....','....kffddffk....','....kffffffk....','....kmmmmmmk....','.....kkkkkk.....','................','................','................']};
RECIPES.push(
 {nome:'Jetpack dos Vigias',estacao:'anvil',ingredientes:[[ITEM.METAL_BAR,24],[ITEM.BRONZE,20],[ITEM.GEAR,10],[ITEM.MAGNETITE,18],[ITEM.WIND_CRYSTAL,16]],resultado:{item:ITEM.JETPACK,quantidade:1}},
 {nome:'Célula de combustível',estacao:'furnace',ingredientes:[[ITEM.COAL,4],[ITEM.SULFUR,2],[ITEM.GLASS,1]],resultado:{item:ITEM.FLIGHT_FUEL,quantidade:1}}
);
function equippedFlight(g){
 const p=g.player,inv=g.inventoryUI.inv;
 const list=playerAccessories(g).map(s=>s&&{item:s.item,rule:ITEM_DEFS[s.item]?.flight}).filter(s=>s?.rule);
 return list.sort((a,b)=>{
  const value=s=>s.rule.jet?(p.jetFuel>0||inv.count(ITEM.FLIGHT_FUEL)>0?100000:-1):s.rule.time;
  return value(b)-value(a)||b.rule.speed-a.rule.speed;
 })[0]||null;
}
function flightControl(p,dt,keys,w,dir){
 const g=game;p.flying=false;p.flightGliding=false;p.flightSide=false;
 if(p.onGround){p.flightUsed=0;p.flightSpent=false;}
 const gear=equippedFlight(g);
 if(!gear||g.mount||p.seat||p.swimming||p.climbing||p.wallGrab||p.crouching)return false;
 const jump=keys.down('Space')||keys.down('KeyW')||keys.down('ArrowUp');
 const lateral=!p.onGround&&(keys.down('ShiftLeft')||keys.down('ShiftRight'));
 if((!jump&&!lateral)||skyWindAt(w,p))return false;
 let available=gear.rule.jet?(p.jetFuel||0):gear.rule.time-(p.flightUsed||0);
 if(gear.rule.jet&&available<=0){
  if(!g.inventoryUI.inv.removeItem(ITEM.FLIGHT_FUEL,1))return false;
  p.jetFuel=available=20;
 }
 if(available<=0){
  if(gear.rule.jet)return false;
  p.flightGliding=true;p.gliding=true;p.onGround=false;
  p.vy=Math.min(70,p.vy+GRAVITY*dt);
  if(dir){p.vx=dir*gear.rule.horizontal*.8;p.facing=dir;}
  return true;
 }
 const active=Math.min(dt,available);
 if(gear.rule.jet)p.jetFuel=Math.max(0,p.jetFuel-active);else p.flightUsed=(p.flightUsed||0)+active;
 p.flying=true;p.flightItem=gear.item;p.gliding=false;p.onGround=false;p.flightSpent=true;
 p.flightSide=lateral;
 if(lateral){
  p.facing=dir||p.facing;
  p.vx=lerp(p.vx,p.facing*gear.rule.horizontal*1.22,1-Math.exp(-dt*9));
  // Mantém a altitude; o modo lateral consome o mesmo impulso do voo normal.
  p.vy=0;
 }else{
  p.vy=lerp(p.vy,-gear.rule.speed,Math.min(1,dt*10));
  if(dir){p.vx=dir*gear.rule.horizontal;p.facing=dir;}
 }
 return true;
}
function updateFlightPose(p,dt){
 if(p.onGround||p.crouching||p.swimming||p.seat){p.flightSide=false;p.flying=false;p.flightGliding=false;p.flightTilt=0;return;}
 const busy=game.sword?.active||game.trident?.anim||game.toolAction||game.bow?.charging;
 const target=p.flightSide&&!busy?Math.PI/2:0;
 p.flightTilt=lerp(p.flightTilt||0,target,1-Math.exp(-dt*8));
 if(Math.abs(p.flightTilt-target)<.005)p.flightTilt=target;
}
function drawFlightEquipment(ctx,g){drawFlightProfile(ctx,g);}
function drawFlightHud(ctx,g){
 const gear=equippedFlight(g);if(!gear||g.intro?.active||g.mapUI.open)return;
 const p=g.player,mm=g.mapUI.minimapRect(),s=g.inventoryUI.scale(),x=mm[0]+8,y=mm[1]+mm[3]+55*s,width=Math.min(mm[2]-16,180);
 const fuel=(p.jetFuel||0)+g.inventoryUI.inv.count(ITEM.FLIGHT_FUEL)*20,left=gear.rule.jet?fuel:Math.max(0,gear.rule.time-(p.flightUsed||0));
 const text=(p.flightSide?'LATERAL · ':'')+(gear.rule.jet?'COMBUSTÍVEL '+Math.ceil(left)+'s':p.flightGliding?'PLANANDO':isFinite(left)?'VOO '+left.toFixed(1)+'s':'VOO INFINITO');
 ctx.save();ctx.textAlign='left';ctx.font='10px Silkscreen,monospace';ctx.fillStyle='#111820';ctx.fillRect(x-4,y-13,width+8,28);ctx.fillStyle='#e7d9b6';ctx.fillText(text,x,y-2);ctx.fillStyle='#35434c';ctx.fillRect(x,y+3,width,6);ctx.fillStyle=left>0?'#79c5cd':'#a2644d';ctx.fillRect(x,y+3,width*(gear.rule.jet?Math.min(1,left/20):isFinite(left)?left/gear.rule.time:1),6);ctx.restore();
}
