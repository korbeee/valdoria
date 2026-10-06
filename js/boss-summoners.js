'use strict';

const BOSS_SUMMONERS=new Map();
const SUMMON_STATE={seq:0,pending:null};
function summonIcon(accent,symbol){
 const rows=['................','......kkkk......','....kkmmmmkk....','...kmmddddmmk...','..kmmddddddmmk..','..kmddddddddmk..','.kmddddddddddmk.','.kmddddddddddmk.','.kmddddddddddmk.','.kmddddddddddmk.','..kmddddddddmk..','..kmmddddddmmk..','...kmmddddmmk...','....kkmmmmkk....','......kkkk......','................'].map(r=>r.split(''));
 symbol.forEach((r,y)=>[...r].forEach((c,x)=>{if(c!=='.')rows[y+4][x+4]=c;}));
 return {cores:{k:[20,25,32],m:[145,127,88],d:[40,47,57],a:accent,b:accent.map(v=>Math.min(255,v+45))},pixels:rows.map(r=>r.join(''))};
}
function defineSummoner(key,kind,name,where,ingredients,accent,symbol,station='anvil'){
 where=kind==='yeti'?'Use em qualquer lugar. Fora do gelo, fica mais forte e rápido.':'Use em qualquer lugar.';
 const id=ITEM[key]=Math.max(...Object.values(ITEM))+1;
 defItem(id,{name,maxStack:20,bossSummon:kind,descricao:'Invoca '+WILDLIFE[kind].name+'. '+where+' Botão direito; consumido ao invocar.'});
 ITEM_ART[id]=summonIcon(accent,symbol);
 RECIPES.push({nome:name,estacao:station,ingredientes:ingredients,resultado:{item:id,quantidade:1}});
 BOSS_SUMMONERS.set(id,{kind,where});
}
defineSummoner('BEAR_SUMMONER','bear','Totem do Patriarca','Use no covil do urso.',[[ITEM.MEAT,6],[ITEM.LEATHER,4],[ITEM.BONE,6],[ITEM.METAL_BAR,3]],[195,131,72],['.aa..aa.','.bb..bb.','........','aa.aa.aa','bbabbbab','.abbbba.','..aaaa..','........'],'workbench');
defineSummoner('TIGER_SUMMONER','tiger','Isca da Caçada','Use perto do abrigo do tigre.',[[ITEM.SUCCULENT_MEAT,1],[ITEM.LEATHER,4],[ITEM.BONE,6],[ITEM.METAL_BAR,3]],[231,151,63],['a......a','.a....a.','..aaaa..','.abbbba.','..a..a..','..abba..','...aa...','........'],'workbench');
defineSummoner('SPIDER_SUMMONER','fiandeira','Casulo de Seda Sombria','Use na galeria da Fiandeira, após vencer o tigre.',[[ITEM.SILK,8],[ITEM.BONE,6],[ITEM.GEL,4],[ITEM.BRONZE,3]],[155,108,180],['a..aa..a','.a.aa.a.','..abba..','aaabbaaa','aaabbaaa','..abba..','.a.aa.a.','a..aa..a']);
defineSummoner('BEETLE_SUMMONER','cascoferro','Escaravelho de Bronze','Use no covil do Casco de Ferro, após vencer a Fiandeira.',[[ITEM.BRONZE,5],[ITEM.SANDSTONE,12],[ITEM.STINGER,6],[ITEM.CRYSTAL,2]],[205,166,78],['..a..a..','...aa...','..abba..','.abbbba.','aabbbbaa','.abbbba.','..abba..','...aa...']);
defineSummoner('CORE_SUMMONER','nucleo','Selo dos Vigias','Use na câmara do Núcleo.',[[ITEM.MAGNETITE,8],[ITEM.BRONZE,6],[ITEM.GEAR,3],[ITEM.RUNE_STONE,2]],[99,210,177],['...aa...','..abba..','.abbbba.','abbbbbba','abbbbbba','.abbbba.','..abba..','...aa...']);
defineSummoner('STORM_SUMMONER','thunderbird','Chamado da Tempestade','Use no ninho do Olho da Tempestade.',[[ITEM.WIND_CRYSTAL,4],[ITEM.FEATHER,8],[ITEM.CLOUD_ESSENCE,4],[ITEM.GOLD,3]],[130,186,226],['....aa..','...aa...','..aa....','.aaaaaa.','...aa...','..aa....','.aa.....','........']);
defineSummoner('YETI_SUMMONER','yeti','Totem da Nevasca','Use na tundra, durante uma nevasca forte.',[[ITEM.ICE,12],[ITEM.SNOW,16],[ITEM.CRYSTAL,4],[ITEM.BONE,6]],[167,218,230],['...aa...','a..aa..a','.aaaaaa.','..abba..','..abba..','.aaaaaa.','a..aa..a','...aa...']);

function summonerContext(g,id){
 const rule=BOSS_SUMMONERS.get(id),p=g.player;
 if(!rule)return {error:'Este item não é um invocador.'};
 if(g.intro?.active||g.respawnPending||(p.hp??100)<=0)return {error:'Você não pode invocar agora.'};
 if(g.boss&&!g.boss.dead&&!g.boss.despawn)return {error:'Termine a luta atual antes de invocar outro chefe.'};
 if(g.mobs.some(m=>m.boss&&!m.dead&&!m.despawn&&!m.sleeping&&!['sleep','buried','cocoon'].includes(m.state)))return {error:'Termine a luta atual antes de invocar outro chefe.'};
 return {kind:rule.kind};
}
function summonerSpawnPoint(g,kind){
 const p=g.player,w=g.world,d=WILDLIFE[kind],air=kind==='nucleo'||kind==='thunderbird';
 const clear=(x,y)=>{
  if(x<T||y<T||x+d.w>(w.w-1)*T||y+d.h>(w.h-1)*T)return false;
  for(let ty=Math.floor(y/T);ty<=Math.floor((y+d.h-.01)/T);ty++)for(let tx=Math.floor(x/T);tx<=Math.floor((x+d.w-.01)/T);tx++)if(w.isSolid(tx,ty))return false;
  return true;
 };
 for(let distance=6;distance<=28;distance+=2)for(const side of [p.facing||1,-(p.facing||1)]){
  const cx=p.cx+side*distance*T,x=cx-d.w/2,start=Math.floor((p.y+p.h)/T);
  for(let offset=0;offset<=14;offset++)for(const sign of offset?[1,-1]:[1]){
   const floor=(start+sign*offset)*T,y=floor-d.h-.01;
   if(!air&&!w.isSolid(Math.floor(cx/T),Math.floor(floor/T)))continue;
   const py=air?y-5*T:y;if(clear(x,py))return {x,y:py,cx,floor};
  }
 }
 // No ar, um chefe terrestre pode surgir e cair sobre o terreno abaixo.
 const x=p.cx+(p.facing||1)*8*T-d.w/2,y=p.y-d.h;
 return clear(x,y)?{x,y,cx:x+d.w/2,floor:y+d.h}:null;
}
function summonBoss(g,id){
 const c=summonerContext(g,id);if(c.error)return {ok:false,message:c.error};
 const {kind}=c,point=summonerSpawnPoint(g,kind);
 if(!point)return {ok:false,message:'Não há espaço livre para o chefe aparecer.'};
 const m=new Wildlife(kind,point.x,point.y),home={x:point.cx,y:point.floor,door:[],gate:[],bounds:null};
 if(kind==='bear')setupBear(m,home);
 if(kind==='tiger')setupTiger(m,home);
 if(kind==='fiandeira'){setupFiandeira(m,{...home,ceilY:point.y-8*T,floorY:point.floor});m.mode='floor';}
 if(kind==='cascoferro')setupCascoFerro(m,home);
 if(kind==='nucleo')m.manualArena={cx:point.cx/T,cy:point.floor/T-12,A:40,B:24,floor:point.floor/T,core:{x:point.cx,y:point.y+m.h/2},gate:[]};
 if(kind==='thunderbird')m.manualArena={cx:point.cx/T-6,R:38,floor:point.floor/T};
 m.x=point.x;m.y=point.y;m.facing=Math.sign(g.player.cx-m.cx)||-1;
 Object.assign(m,{sleeping:false,aware:true,state:'wake',stateT:0,keep:true,boss:true,summonerCreated:true});
 g.mobs.push(m);
 g.boss=m;g.shake=Math.max(g.shake||0,4);
 if(kind==='yeti'){g.yetiEventWorld=g.world;g.yetiStormSeen=g.weather?.serial||0;g.yetiWeatherT=0;}
 return {ok:true,message:WILDLIFE[kind].name+' foi invocado.',mob:m};
}
function summonerConsume(g){
 const stack=g.inventory.slots[g.selected];if(!stack||stack.count<=0)return false;
 stack.count--;if(!stack.count)g.inventory.slots[g.selected]=null;return true;
}
function summonerRefund(g,id){const left=g.inventory.add(id,1);if(left)dropItem(g,id,left,g.player.cx,g.player.cy,0);}
function useBossSummoner(g){
 if(g.placeCooldown>0||SUMMON_STATE.pending)return false;
 const id=g.inventory.slots[g.selected]?.item;
 const c=summonerContext(g,id);g.placeCooldown=.5;
 if(c.error){toast(c.error);return false;}
 if(typeof NET!=='undefined'&&NET.guest){
  netRelay({k:'st',...netMyState()},NET.hostCid);
  if(!summonerConsume(g))return false;
  const seq=++SUMMON_STATE.seq;SUMMON_STATE.pending={seq,id,room:NET.room};
  netRelay({k:'summonBoss',id,seq},NET.hostCid);return true;
 }
 const result=summonBoss(g,id);if(result.ok)summonerConsume(g);toast(result.message);return result.ok;
}
window.addEventListener('DOMContentLoaded',()=>{
 if(typeof NET==='undefined')return;
 const relay=netOnRelay;
 netOnRelay=function(from,d){
  if(NET.room&&d?.k==='summonBoss'&&NET.isHost){
   const p=NET.peers.get(from);
   if(!p?.seen||!Number.isInteger(d.seq)||d.seq<=0||!BOSS_SUMMONERS.has(d.id))return;
   if(p.summonReply?.seq===d.seq){netRelay(p.summonReply,from);return;}
   if(d.seq<=(p.summonSeq||0))return;
   p.summonSeq=d.seq;
   // A posição desenhada tem atraso de interpolação; a invocação usa o estado recebido mais recente.
   const latest=p.buf?.at(-1),position={x:p.x,y:p.y,h:p.h};
   let result;
   try{
    if(latest&&Number.isFinite(latest.x)&&Number.isFinite(latest.y)){p.x=latest.x;p.y=latest.y;p.h=latest.h||p.h;}
    result=p.item===d.id&&p.hp>0?netWithPlayer(game,p,()=>summonBoss(game,d.id)):{ok:false,message:'Selecione o invocador para usá-lo.'};
    if(result.ok&&latest){
     // Não percorre posições antigas depois de um teleporte: isso faria o chefe voltar a dormir.
     Object.assign(position,{x:p.x,y:p.y,h:p.h});p.buf=[latest];
    }
   }finally{Object.assign(p,position);}
   p.summonReply={k:'summonBossResult',seq:d.seq,ok:result.ok,message:result.message};
   netRelay(p.summonReply,from);if(result.ok)netSendMobs();return;
  }
  if(NET.guest&&from===NET.hostCid&&d?.k==='summonBossResult'){
   const pending=SUMMON_STATE.pending;if(!pending||pending.seq!==d.seq||pending.room!==NET.room)return;
   SUMMON_STATE.pending=null;if(!d.ok)summonerRefund(game,pending.id);toast(d.message);return;
  }
  return relay(from,d);
 };
 const end=netEndSession;
 netEndSession=function(...args){
  if(SUMMON_STATE.pending){summonerRefund(game,SUMMON_STATE.pending.id);SUMMON_STATE.pending=null;}
  return end(...args);
 };
});
