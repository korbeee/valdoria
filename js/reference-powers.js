'use strict';
const REFERENCE_COOLDOWNS={scan:12,harvest:20,volley:4,soul:.7,thunder:6,fire:3};
function referenceState(g){
 if(!g.referenceState||g.referenceState.world!==g.world)g.referenceState={world:g.world,shots:[],ready:{},soul:0,regenUntil:0,springUntil:0,scanUntil:0};
 return g.referenceState;
}
const referenceHas=(g,passive)=>ITEM_DEFS[g.outfit]?.referencePassive===passive||playerAccessories(g).some(s=>s&&ITEM_DEFS[s.item]?.referencePassive===passive);
function referenceSpark(g,x,y,color,n=8){for(let i=0;i<n;i++)bfx(g,'spark',x,y,{vx:(Math.random()-.5)*130,vy:-25-Math.random()*110,grav:220,life:.4,color});}
function referenceShot(g,type,x,y,options={}){
 const shot={type,x,y,vx:0,vy:0,life:.5,age:0,damage:0,radius:8,bounces:0,...options,hit:new Set()};
 const state=referenceState(g);if(state.shots.length>=64)return null;state.shots.push(shot);
 if(typeof NET!=='undefined'&&NET.room&&!NET.applying){const {hit,...data}=shot;netRelay({k:'referenceFx',shot:data});}
 return shot;
}
function referenceArea(g,x,y,radius,damage){for(const m of g.mobs||[])if(!m.dead&&!m.sleeping&&typeof m.hit==='function'&&Math.hypot(m.cx-x,m.cy-y)<radius+Math.max(m.w,m.h)*.25)m.hit(damage,g.player.cx);}
function referenceActivate(g,id){
 const d=ITEM_DEFS[id],power=d?.referencePower,state=referenceState(g),now=g.clock||0,p=g.player;
 if(!power||(state.ready[power]||0)>now)return false;
 if(power==='soul'&&state.soul<3){toast('Precisa de 3 almas. Acerte com o Agulhão.');return false;}
 if(power==='volley'&&g.inventory.count(ITEM.ARROW)<3){toast('Precisa de 3 flechas.');return false;}
 const nearest=(g.mobs||[]).filter(m=>!m.dead&&!m.sleeping&&Math.hypot(m.cx-p.cx,m.cy-p.cy)<12*T).sort((a,b)=>Math.hypot(a.cx-p.cx,a.cy-p.cy)-Math.hypot(b.cx-p.cx,b.cy-p.cy))[0];
 if(power==='thunder'&&!nearest){toast('Nenhum alvo próximo para o raio.');return false;}
 if(power==='scan'){state.scanUntil=now+5;referenceShot(g,'scan',p.cx,p.cy,{life:.7,radius:100});}
 if(power==='harvest'){if(p.hp>=p.maxHp)return false;p.hp=Math.min(p.maxHp,p.hp+15);referenceShot(g,'leaves',p.cx,p.cy,{life:1});}
 if(power==='soul'){state.soul-=3;referenceShot(g,'soul',p.cx+p.facing*12,p.cy,{vx:p.facing*340,life:1.6,damage:18,radius:12});}
 if(power==='volley'){g.inventory.removeItem(ITEM.ARROW,3);for(const vy of [-65,0,65])referenceShot(g,'arrow',p.cx+p.facing*12,p.cy,{vx:p.facing*400,vy,life:1.2,damage:9,radius:5});}
 if(power==='fire')for(let i=0;i<3;i++)referenceShot(g,'fire',p.cx+p.facing*(14+i*7),p.cy-i*5,{vx:p.facing*(190+i*25),vy:-80-i*35,life:2.5,damage:12,radius:5});
 if(power==='thunder'){referenceShot(g,'thunder',nearest.cx,nearest.cy,{life:.45,radius:45});referenceArea(g,nearest.cx,nearest.cy,45,28);g.shake=Math.max(g.shake||0,3);}
 state.ready[power]=now+REFERENCE_COOLDOWNS[power];playSfx('swing',p.cx,p.cy);return true;
}
function referenceOnStrike(g,m,id){
 const type=ITEM_DEFS[id]?.referenceStrike,s=referenceState(g),now=g.clock||0;
 if(type==='soul'){s.soul=Math.min(6,s.soul+1);referenceShot(g,'essence',m.cx,m.cy,{life:.5});return;}
 if(type==='star'&&(s.ready.star||0)<=now){s.ready.star=now+2;referenceShot(g,'star',m.cx-35,m.y-100,{vx:100,vy:280,life:1.2,damage:16,radius:8});}
 if(type==='quake'&&g.player.onGround&&(s.ready.quake||0)<=now){s.ready.quake=now+2.5;referenceShot(g,'quake',g.player.cx,g.player.y+g.player.h-5,{vx:g.player.facing*230,life:.85,damage:12,radius:22});g.shake=Math.max(g.shake||0,3);}
}
function consumeReferenceFood(g,def){
 if(!def.referenceBuff)return false;
 const s=referenceState(g),now=g.clock||0,p=g.player;
 if(def.referenceBuff==='soul')s.soul=6;
 if(def.referenceBuff==='regen')s.regenUntil=now+15;
 if(def.referenceBuff==='spring')s.springUntil=now+20;
 p.hp=Math.min(p.maxHp,p.hp+def.cura);g.inventory.takeFromSlot(g.selected);g.placeCooldown=.6;
 referenceShot(g,def.referenceBuff==='spring'?'spring':'leaves',p.cx,p.cy,{life:.8});playSfx('eat',p.cx,p.cy);toast(def.name+' ativado.');return true;
}
function referenceMovement(p,dt,controls,dir,jump){
 const g=game,s=referenceState(g),edge=jump&&!p._referenceJump;p._referenceJump=jump;
 if(p.onGround)p._referenceAirJump=false;
 if(referenceHas(g,'cloud')&&edge&&!p.onGround&&!p._referenceAirJump&&!p.crouching&&!p.swimming&&!p.climbing&&!g.mount){p._referenceAirJump=true;p.vy=-JUMP_SPEED*.9;p.jumpAge=0;referenceShot(g,'cloud',p.cx,p.y+p.h,{life:.65});}
 if(referenceHas(g,'sprint')&&p.onGround&&dir&&!p.crouching&&!p.dash){p.vx=clamp(p.vx+dir*500*dt,-WALK_SPEED*1.25,WALK_SPEED*1.25);if((g.clock||0)-(s.lastSpark||0)>.08){s.lastSpark=g.clock;referenceSpark(g,p.cx-dir*7,p.y+p.h,[248,210,121],2);}}
 p._referenceFall={bottom:p.y+p.h,speed:p.vy};
}
function referenceAfterMovement(p){
 const g=game,s=referenceState(g),f=p._referenceFall;
 if(p.climbing||p.swimming||p.crouching||g.mount||p.seat)return;
 if(s.springUntil>(g.clock||0)&&f?.speed>40&&!g.mount)for(const m of g.mobs||[])if(!m.dead&&!m.sleeping&&f.bottom<=m.y+10&&p.y+p.h>=m.y&&p.y+p.h<=m.y+m.h*.7&&p.x+p.w>m.x&&p.x<m.x+m.w){m.hit(18,p.cx);p.vy=-JUMP_SPEED*.85;p.onGround=false;p.invulnerable=Math.max(p.invulnerable||0,.25);referenceShot(g,'spring',p.cx,m.y,{life:.45});break;}
}
function referenceOnHurt(g){
 // The host's remote damage path sends the event to the owning player's simulation.
 if(g.player!==player)return;
 const s=referenceState(g),p=g.player;
 if(referenceHas(g,'soulHurt')){s.soul=Math.min(6,s.soul+1);referenceShot(g,'essence',p.cx,p.cy,{life:.5});}
 if(referenceHas(g,'thorns')&&(s.ready.thorns||0)<=(g.clock||0)){s.ready.thorns=(g.clock||0)+.5;referenceArea(g,p.cx,p.cy,52,8);referenceShot(g,'crystal',p.cx,p.cy,{life:.55,radius:52});}
}
function updateReferences(g,dt){
 const s=referenceState(g),p=g.player,now=g.clock||0;
 if(g.respawnPending||p.hp<=0){s.soul=0;s.regenUntil=s.springUntil=0;s.shots=[];return;}
 const held=g.inventory.slots[g.selected]?.item,key=input.down('KeyR'),edge=key&&!s.key;s.key=key;
 if(edge&&!g.inventoryUI.open&&!g.mapUI.open&&!g.npcOpen&&!g.adminOpen){if(ITEM_DEFS[held]?.referencePower)referenceActivate(g,held);for(const slot of playerAccessories(g))if(slot&&ITEM_DEFS[slot.item]?.referencePower)referenceActivate(g,slot.item);}
 if(s.regenUntil>now){s.regenTick=(s.regenTick||0)+dt;if(s.regenTick>=.5){s.regenTick-=.5;p.hp=Math.min(p.maxHp,p.hp+1);referenceSpark(g,p.cx,p.y+p.h,[115,216,139],2);}}
 for(let i=s.shots.length-1;i>=0;i--){const q=s.shots[i];q.age+=dt;if(q.age>=q.life){s.shots.splice(i,1);continue;}
  const steps=Math.max(1,Math.ceil(Math.hypot(q.vx,q.vy)*dt/5));let ended=false;
  for(let k=0;k<steps;k++){const dd=dt/steps;if(q.type==='fire')q.vy+=600*dd;
   const nx=q.x+q.vx*dd,ny=q.y+q.vy*dd;
   if(q.vx||q.vy){const tx=Math.floor(nx/T),ty=Math.floor(ny/T);if(g.world.isSolid(tx,ty)){
    if(q.type==='fire'&&q.vy>0&&!g.world.isSolid(tx,Math.floor(q.y/T))&&q.bounces<4){q.vy=-210;q.bounces++;q.y=ty*T-1;}
    else {ended=true;break;}
   }else{q.x=nx;q.y=ny;}}
   if(!q.cosmetic&&q.damage)for(const m of g.mobs||[])if(!m.dead&&!m.sleeping&&!q.hit.has(m)&&q.x+q.radius>=m.x&&q.x-q.radius<=m.x+m.w&&q.y+q.radius>=m.y&&q.y-q.radius<=m.y+m.h){q.hit.add(m);m.hit(q.damage,p.cx);if(!['soul','quake'].includes(q.type)){ended=true;break;}}
   if(ended)break;
  }
  if(ended){if(!q.cosmetic){if(q.type==='arrow'){referenceArea(g,q.x,q.y,35,6);referenceShot(g,'blast',q.x,q.y,{life:.4,radius:35});}referenceSpark(g,q.x,q.y,q.type==='fire'?[255,163,62]:[178,226,244],5);}s.shots.splice(i,1);}
 }
}
function drawReferences(ctx,g){
 const s=referenceState(g),now=g.clock||0;ctx.save();
 for(const q of s.shots){const k=q.age/q.life,x=Math.round(q.x),y=Math.round(q.y);ctx.globalAlpha=Math.min(1,(1-k)*3);
  const pixel=(xx,yy,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(Math.round(xx),Math.round(yy),w,h);};
  if(q.type==='star'){for(let n=1;n<=4;n++)pixel(x-q.vx*.025*n,y-q.vy*.025*n,3,3,n<3?'#d7a4ee':'#775696');pixel(x-2,y-8,4,16,'#ffd875');pixel(x-8,y-2,16,4,'#ffe9aa');pixel(x-4,y-4,8,8,'#fff4d3');}
  else if(q.type==='fire'){pixel(x-6,y-4,11,8,'#962b28');pixel(x-4,y-5,8,10,'#e35b28');pixel(x-2,y-3,5,6,'#ffb948');pixel(x,y-2,2,3,'#fff0ad');pixel(x-Math.sign(q.vx)*10,y,3,2,'#ee8535');}
  else if(q.type==='soul'){const dir=Math.sign(q.vx)||1;pixel(x-12,y-5,23,10,'#42677f');pixel(x-8,y-7,16,14,'#a5d7e5');pixel(x-7,y-4,18,8,'#eefcff');pixel(x-4,y-6,10,12,'#eefcff');pixel(x+dir*5,y-2,2,2,'#42677f');pixel(x+dir*5,y+2,2,2,'#42677f');for(let j=1;j<=3;j++)pixel(x-dir*(14+j*4),y+(j%2?2:-3),5,2,'#a5d7e5');}
  else if(q.type==='arrow'){pixel(x-7,y,14,2,'#b89d63');pixel(x+Math.sign(q.vx)*7,y-2,3,5,'#deedf0');}
  else if(q.type==='blast'){for(let j=0;j<12;j++){const a=j*Math.PI/6,r=5+k*35;pixel(x+Math.cos(a)*r,y+Math.sin(a)*r,3,3,j%2?'#ffd682':'#ec8142');}if(k<.5){pixel(x-5,y-8,10,16,'#f59f4f');pixel(x-8,y-5,16,10,'#ffe5a2');}}
  else if(q.type==='thunder'){for(let j=0;j<12;j++){const offset=(j%3-1)*7,next=((j+1)%3-1)*7;for(let step=0;step<12;step++){const xx=x+lerp(offset,next,step/12),yy=y-140+j*12+step;pixel(xx-2,yy,6,3,'#da9e39');pixel(xx,yy,2,3,'#fff4bb');}}pixel(x-15,y+10,30,3,'#ffe5a4');}
  else if(q.type==='quake'){for(let j=0;j<5;j++){const h=7+(j%3)*5;pixel(x-j*Math.sign(q.vx)*7,y-h,5,h,'#a33d2a');pixel(x-j*Math.sign(q.vx)*7,y-h,3,h-2,'#f0a349');}}
  else if(q.type==='cloud'){pixel(x-13,y,26,5,'#9cb2c8');pixel(x-10,y-3,20,7,'#e7f2ef');pixel(x-6,y-6,11,5,'#fffdf0');}
  else {const color={crystal:'#79d9d9',essence:'#d9f8ff',spring:'#a6df85',leaves:'#83cc88',scan:'#85dfe5'}[q.type]||'#ffd477';for(let j=0;j<10;j++){const a=j*Math.PI/5,r=8+k*(q.radius||32);pixel(x+Math.cos(a)*r,y+Math.sin(a)*r*.7,3,j%2?3:6,color);}}
 }
 if(s.scanUntil>now){const px=Math.floor(g.player.cx/T),py=Math.floor(g.player.cy/T);ctx.globalAlpha=.6+.25*Math.sin(now*8);ctx.strokeStyle='#a3f0e5';ctx.lineWidth=1;for(let y=py-7;y<=py+7;y++)for(let x=px-9;x<=px+9;x++)if(/minério|magnetita|cristal|ametista|ouro|prata|cobre/i.test(TILE_DEFS[g.world.getTile(x,y)]?.name||''))ctx.strokeRect(x*T+2,y*T+2,T-4,T-4);}
 if(s.soul>0&&ITEM_DEFS[g.inventory.slots[g.selected]?.item]?.referencePower==='soul'){ctx.globalAlpha=1;for(let i=0;i<6;i++){ctx.fillStyle=i<s.soul?'#dcf7ff':'#3c5262';ctx.fillRect(Math.round(g.player.cx-14+i*5),Math.round(g.player.y-7),3,3);}}
 ctx.restore();
}
window.addEventListener('DOMContentLoaded',()=>{
 const relay=netOnRelay;netOnRelay=function(from,d){if(NET.room&&d?.k==='referenceFx'){const q=d.shot;if(q&&['star','fire','soul','arrow','blast','thunder','quake','cloud','essence','leaves','spring','scan','crystal'].includes(q.type)&&[q.x,q.y,q.vx,q.vy,q.life].every(Number.isFinite)){const s=referenceState(game);if(s.shots.length<64)s.shots.push({...q,life:clamp(q.life,.1,3),age:0,radius:Number.isFinite(q.radius)?clamp(q.radius,1,100):8,damage:0,cosmetic:true,hit:new Set()});}return;}return relay(from,d);};
});
