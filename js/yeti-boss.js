'use strict';
const YETI={hp:720,speed:72,slam:28,ice:18,breath:10,contact:12};
const YETI_WALK_STRIDE=72;
ITEM.YETI_HEART=Math.max(...Object.values(ITEM))+1;ITEM.YETI_PENDANT=ITEM.YETI_HEART+1;
defItem(ITEM.YETI_HEART,{name:'Coração da Nevasca',vidaMaxima:20,maxStack:1,bossItem:true,descricao:'Espólio do Yeti. Consumir aumenta sua vida máxima em 20.'});
defItem(ITEM.YETI_PENDANT,{name:'Presa do Abominável',acessorio:{defesa:.08},maxStack:1,bossItem:true,descricao:'Uma presa envolta em gelo eterno. Equipada no cinto, reduz o dano recebido em 8%.'});
for(const [id,art]of [[ITEM.YETI_HEART,ITEM.TIGER_HEART],[ITEM.YETI_PENDANT,ITEM.TIGER_TOOTH]]){
 const base=ITEM_ART[art];ITEM_ART[id]={pixels:base.pixels.slice(),cores:Object.fromEntries(Object.entries(base.cores).map(([k,c])=>[k,[Math.min(255,c[0]*.55+55)|0,Math.min(255,c[1]*.65+95)|0,Math.min(255,c[2]*.7+130)|0]]))};
}
WILDLIFE.yeti={name:'Yeti, o Abominável',biome:BIOME.SNOW,where:'Tundra durante uma nevasca forte, a céu aberto',hostile:true,unique:true,hp:YETI.hp,speed:YETI.speed,damage:0,attackDamage:YETI.slam,w:72,h:110,shape:'yeti',color:'#dcecf0',drops:[[ITEM.YETI_HEART,1,1],[ITEM.YETI_PENDANT,1,1],[ITEM.CRYSTAL,6,10],[ITEM.SNOW,20,30]]};
WILD_SIZES.yeti=[160,152];WILD_PALETTES.yeti=YETI_FUR;MOB_SFX.yeti='yeti';
BESTIARY_LORE.yeti='O Abominável caminha por dentro da nevasca. Só emerge na tundra quando a neve e o vendaval ficam fortes. Ergue os dois punhos antes de esmagar o chão, arremessa blocos de gelo e sopra cristais congelantes. Após o esmagamento, recupera o fôlego e fica vulnerável.';
BOSS_BARS.yeti=m=>({label:'YETI, O ABOMINÁVEL'+(m.state==='recover'?' · EXPOSTO':m.hp<YETI.hp*.4?' · FÚRIA GLACIAL':''),text:'#dff6ff',fill:m.hp<YETI.hp*.4?'#638ec9':'#8fc6d7',back:'#182b41',mark:'#effaf4'});
FIGHT_STATES.push('yetiSlam','yetiThrow','yetiBreath');
Object.assign(SFX,{
 yetiAlert(A,o){voice(A,o,{type:'sawtooth',f0:100,f1:45,dur:1.3,gain:.5,formants:[[250,3],[680,5]],vib:9,vibRate:12});N(A,o,{freq:170,dur:1,gain:.4,brown:true});},
 yetiHurt(A,o){Tn(A,o,{freq:90,freqEnd:50,dur:.2,gain:.3});},
 yetiDeath(A,o){voice(A,o,{type:'sawtooth',f0:80,f1:25,dur:1.4,gain:.4,formants:[[220,3],[550,5]]});},
 yetiImpact(A,o){N(A,o,{freq:130,dur:.65,gain:.7,brown:true});Tn(A,o,{freq:70,freqEnd:30,dur:.45,gain:.4});},
});
function weatherSnowAt(g,x,y){return g.world.biomeAt(Math.floor(x/T))===BIOME.SNOW&&weatherExposed(g.world,x,y)?g.weather?.rain||0:0;}
function strongYetiWeather(g){const w=g.weather,p=g.player;return !!w&&['storm','blizzard'].includes(w.event)&&w.intensity>=.85&&w.rain>=.8&&Math.abs(w.wind)>=65&&weatherSnowAt(g,p.cx,p.y+2)>=.8&&p.y+p.h<=g.world.groundTop(Math.floor(p.cx/T))*T+T*2;}
function updateSnowWeather(g,dt){
 const w=g.weather,list=w.snowflakes??=[];const target=w.rain>.02?Math.min(160,Math.ceil(canvas.width*canvas.height/6000*w.rain)):0;
 if(list.length>target)list.length=target;
 for(let i=0;i<Math.min(8,target-list.length);i++){const x=g.cam.x+Math.random()*canvas.width/g.zoom,y=g.cam.y+Math.random()*canvas.height/g.zoom;if(weatherSnowAt(g,x,y)>.02)list.push({x,y,size:Math.random()<.75?1:2,speed:25+Math.random()*40,phase:Math.random()*6});}
 for(let i=list.length-1;i>=0;i--){const f=list[i];f.x+=(w.wind*.85+Math.sin(w.clock*2+f.phase)*10)*dt;f.y+=f.speed*dt;
 if(!weatherSnowAt(g,f.x,f.y)||f.x<g.cam.x-20||f.x>g.cam.x+canvas.width/g.zoom+20||f.y>g.cam.y+canvas.height/g.zoom+20)list.splice(i,1);}
}
function drawSnowWeather(ctx,g,ox,oy,z){
 const flakes=g.weather?.snowflakes;if(!flakes?.length)return;
 ctx.save();ctx.setTransform(z,0,0,z,-ox,-oy);ctx.fillStyle='#e8f5fa';ctx.globalAlpha=.8;
 for(const f of flakes)ctx.fillRect(Math.round(f.x),Math.round(f.y),f.size,f.size);
 ctx.restore();
}
function yetiSet(m,state){if(state==='recover')m.recoverFrom=m.state;m.state=state;m.stateT=0;m.fired=false;m.breathAim=null;m.breathT=0;if(state!=='hunt')m.vx=0;}
// Sincroniza o quadro de contato com o instante em que o ataque realmente acontece.
function yetiAttackFrame(pose,t,duration,contact,contactFrame){
 const n=YETI_ANIM_FRAMES,f=t<contact?Math.floor(t/contact*contactFrame):contactFrame+Math.floor((t-contact)/(duration-contact)*(n-contactFrame));
 return pose*n+Math.max(0,Math.min(n-1,f));
}
function yetiSnow(g,x,y,n=18){for(let i=0;i<n;i++){if(g.particles.length>350)break;g.particles.push({x,y,vx:(Math.random()-.5)*180,vy:-40-Math.random()*130,life:.6,maxLife:.6,color:i%3?'#d4eef4':'#78afcc',w:2,h:2,gravity:230});}}
function retireYeti(g,m){m.despawn=true;m.hazards=[];if(g.boss===m)g.boss=null;}
function spawnYeti(g){
 const w=g.world,px=Math.floor(g.player.cx/T),side=g.player.facing||1;
 for(let distance=18;distance<=38;distance+=2)for(const dir of [side,-side]){
  const tx=px+dir*distance;if(tx<5||tx>w.w-6||w.biomeAt(tx)!==BIOME.SNOW)continue;
  const floor=w.groundTop(tx);if(floor<9||floor>=w.h-2||!w.isSolid(tx,floor))continue;
  const m=new Wildlife('yeti',(tx+.5)*T-36,floor*T-110-.01);
  if(m.collides(w,m.x,m.y)||!weatherExposed(w,m.cx,m.y+2))continue;
  if(!w.isSolid(tx-2,floor)||!w.isSolid(tx+2,floor))continue;
  m.facing=dir*-1;m.onGround=true;g.mobs.push(m);g.boss=m;playSfx('yetiAlert',m.cx,m.cy);yetiSnow(g,m.cx,m.y+m.h,40);toast('Algo enorme atravessa a nevasca. O YETI chegou.');return m;
 }
 return null;
}
function updateYetiEvent(g,dt){
 if(g.yetiEventWorld!==g.world){g.yetiEventWorld=g.world;g.yetiStormSeen=-1;g.yetiWeatherT=0;}
 if(g.intro?.active||g.respawnPending||!strongYetiWeather(g)){g.yetiWeatherT=0;return;}
 const serial=g.weather.serial||0;
 if(g.yetiStormSeen===serial||g.mobs.some(m=>m.kind==='yeti'&&!m.despawn)||g.boss)return;
 g.yetiWeatherT+=dt;if(g.yetiWeatherT<6)return;
 if(spawnYeti(g)){g.yetiStormSeen=serial;g.yetiWeatherT=0;}else g.yetiWeatherT=5;
}
function yetiHitPlayer(g,m,damage){if(g.player.invulnerable<=0)damageMonsterPlayer(g,Math.round(damage*(m.outsideIce?1.35:1)),m.cx,{death:'O Abominável venceu na nevasca.'});}
function updateYetiHazards(g,m,dt,w,p){
 m.iceImpacts=(m.iceImpacts||[]).filter(q=>(q.t+=dt)<.7);
 for(let i=m.hazards.length-1;i>=0;i--){const q=m.hazards[i];q.life-=dt;const ox=q.x,oy=q.y;
  q.vy+=(q.type==='ice'?430:0)*dt;q.x+=q.vx*dt;q.y+=q.vy*dt;
  let blocked=false;const steps=Math.max(1,Math.ceil(Math.hypot(q.x-ox,q.y-oy)/5));
  for(let j=1;j<=steps;j++){const x=lerp(ox,q.x,j/steps),y=lerp(oy,q.y,j/steps);if(w.isSolid(Math.floor(x/T),Math.floor(y/T))){blocked=true;break;}
   if(x+q.r>p.x&&x-q.r<p.x+p.w&&y+q.r>p.y&&y-q.r<p.y+p.h){yetiHitPlayer(g,m,q.type==='ice'?YETI.ice:YETI.breath);blocked=true;break;}}
  if(blocked||q.life<=0){if(q.type==='ice'){yetiSnow(g,q.x,q.y,10);m.iceImpacts.push({x:q.x,y:q.y,t:0});if(m.iceImpacts.length>8)m.iceImpacts.shift();}m.hazards.splice(i,1);}
 }
 m.rings=m.rings.filter(q=>(q.t+=dt)<.55);
}
SHAPE_HOOKS.yeti={
 paint:paintYeti,outline:null,
 setup(m){Object.assign(m,{boss:true,keep:true,aware:true,state:'wake',stateT:0,damage:0,hazards:[],rings:[],attackIndex:0,cooldown:1.5,awayT:0});},
 frame(m){const t=m.stateT||0,n=YETI_ANIM_FRAMES,once=(pose,d)=>pose*n+Math.min(n-1,Math.floor(t/d*n));
  if(m.state==='wake')return t<.9?once(7,.9):2*n+Math.min(n-1,Math.floor((t-.9)/.9*n));
  if(m.state==='dying')return once(8,1.4);
  if(m.state==='yetiRoar')return once(2,1.3);
  if(m.state==='yetiSlam')return yetiAttackFrame(3,t,1.2,.82,12);
  if(m.state==='yetiThrow')return yetiAttackFrame(4,t,1.25,.8,11);
  if(m.state==='yetiBreath'){
   const f=t<.6?Math.floor(t/.6*6):t<2?6+Math.floor((t-.6)*8)%6:12+Math.min(3,Math.floor((t-2)/.35*4));
   return 5*n+f;
  }
  if(m.state==='recover')return m.recoverFrom==='yetiBreath'?5*n+n-1:once(6,m.hp<YETI.hp*.4?.8:1.4);
  return Math.abs(m.vx)>4?n+Math.floor(m.gait*9/YETI_WALK_STRIDE*n)%n:Math.floor((m.clock||0)*8)%n;
 },
 update(m,dt,w,p){
  const g=game;m.outsideIce=!!m.summonerCreated&&w.biomeAt(Math.floor(m.cx/T))!==BIOME.SNOW;
  m.clock+=dt;m.stateT+=dt*(m.outsideIce?1.2:1);m.hurtTimer=Math.max(0,m.hurtTimer-dt);
  if(m.state==='dying'){m.hazards=[];m.vx=0;if(m.stateT>=1.4)m.dead=true;return;}
  if((!m.summonerCreated&&!strongYetiWeather(g))||p.hp<=0){if(m.state!=='vanish'){yetiSet(m,'vanish');m.hazards=[];}yetiSnow(g,m.cx,m.cy,2);if(m.stateT>.8)retireYeti(g,m);return;}
  if(m.state==='vanish'){if(m.stateT>.8)retireYeti(g,m);return;}
  if(Math.abs(p.cx-m.cx)>75*T||(!m.summonerCreated&&w.biomeAt(Math.floor(m.cx/T))!==BIOME.SNOW)){m.awayT+=dt;if(m.awayT>4){retireYeti(g,m);return;}}else m.awayT=0;
  updateYetiHazards(g,m,dt,w,p);const rage=m.hp<YETI.hp*.4,dx=p.cx-m.cx;
  if(m.state==='wake'){m.vx=0;if(m.stateT>1.8)yetiSet(m,'hunt');}
  else if(m.state==='hunt'){
   m.facing=Math.sign(dx)||m.facing;m.vx=Math.abs(dx)>105?m.facing*YETI.speed*(rage?1.35:1)*(m.outsideIce?1.45:1):0;m.cooldown-=dt*(m.outsideIce?1.2:1);
   if(m.cooldown<=0&&Math.abs(dx)<32*T){yetiSet(m,['yetiSlam','yetiThrow','yetiBreath'][m.attackIndex++%3]);m.vx=0;m.attackFacing=m.facing;playSfx('yetiAlert',m.cx,m.cy);}
  }else if(m.state==='yetiSlam'){
   if(!m.fired&&m.stateT>=.82){m.fired=true;const floor=m.y+m.h;m.rings.push({x:m.cx,y:floor,t:0});yetiSnow(g,m.cx,floor,35);g.shake=Math.max(g.shake||0,7);playSfx('yetiImpact',m.cx,floor);
    if(Math.abs(p.cx-m.cx)<160&&Math.abs(p.y+p.h-floor)<25)yetiHitPlayer(g,m,YETI.slam);}
   if(m.stateT>1.2){yetiSet(m,'recover');m.cooldown=rage?.8:1.8;}
  }else if(m.state==='yetiThrow'){
   if(!m.fired&&m.stateT>=.8){m.fired=true;const x=m.cx+m.facing*65,y=m.y+m.h-94,travel=Math.max(.5,Math.min(1.2,Math.abs(p.cx-x)/270));m.hazards.push({type:'ice',x,y,vx:(p.cx-x)/travel,vy:(p.cy-y)/travel-215*travel,r:12,life:3});}
   if(m.stateT>1.25){yetiSet(m,'hunt');m.cooldown=rage?.8:1.8;}
  }else if(m.state==='yetiBreath'){
   if(m.stateT>.6&&m.stateT<2&&(m.breathT=(m.breathT||0)-dt)<=0){
    m.breathT=.12;const x=m.cx+m.facing*48,y=m.y+m.h-73;
    m.breathAim??=Math.atan2(p.cy-y,Math.max(60,Math.abs(p.cx-x)));
    const angle=m.breathAim+Math.sin(m.stateT*8)*.09;
    m.hazards.push({type:'frost',x,y,vx:m.facing*Math.cos(angle)*240,vy:Math.sin(angle)*240,r:6,life:1.2});
   }
   if(m.stateT>2.35){yetiSet(m,'recover');m.cooldown=rage?.9:1.7;}
  }else if(m.state==='recover'){m.vx=0;if(m.stateT>(rage?.8:1.4))yetiSet(m,'hunt');}
  const oldX=m.x,wanted=m.vx;m.applyGravity(dt);m.moveX(m.vx*dt,w);if(m.state==='hunt'&&wanted&&m.vx===0&&m.onGround)m.vy=-350;m.moveY(m.vy*dt,w);m.gait+=Math.abs(m.x-oldX)/9;m.settleStep(dt);
  if(m.state==='hunt'&&p.invulnerable<=0&&m.x<p.x+p.w&&m.x+m.w>p.x&&m.y<p.y+p.h&&m.y+m.h>p.y)yetiHitPlayer(g,m,YETI.contact);
 },
 hit(m,damage){if(['wake','vanish','dying'].includes(m.state))return;m.hp-=Math.max(1,Math.round(damage*(m.state==='recover'?1.5:1)));m.hurtTimer=.14;playSfx('yetiHurt',m.cx,m.cy);if(m.hp<=0){m.hp=1;yetiSet(m,'dying');m.hazards=[];}},
 draw(ctx,m){
  const sprite=wildlifeSprite('yeti',wildlifeFrame(m));ctx.save();ctx.translate(Math.round(m.cx),Math.round(m.y+m.h+(m.stepOffset||0)));ctx.scale(m.facing<0?-1:1,1);
  if(m.state==='vanish')ctx.globalAlpha=Math.max(0,1-m.stateT/.8);
  ctx.drawImage(m.hurtTimer>0?sprite.hurt:sprite.normal,-80,-152);ctx.restore();
  for(const q of m.hazards){if(q.type==='ice'){drawYetiIce(ctx,q);continue;}ctx.save();ctx.translate(Math.round(q.x),Math.round(q.y));ctx.fillStyle='#b6e6ed';ctx.globalAlpha=clamp(q.life,0,.8);ctx.fillRect(-5,-3,10,6);ctx.fillStyle='#f5ffff';ctx.fillRect(-2,-5,3,10);ctx.restore();}
  for(const q of m.rings){ctx.globalAlpha=clamp(1-q.t/.55,0,1);battleRing(ctx,q.x,q.y-1,q.t*280+10,'#c3f4fa',.09,true);ctx.globalAlpha=1;}
  if(m.state==='yetiSlam'&&m.stateT<.82){ctx.save();ctx.globalAlpha=.3+Math.sin(m.stateT*22)*.15;ctx.fillStyle='#9ceafa';ctx.fillRect(m.cx-160,m.y+m.h-3,320,3);ctx.restore();}
 },
 goHome:retireYeti,
 defeated(g,m){m.hazards=[];g.yetiSlain=(g.yetiSlain||0)+1;toast('O ABOMINÁVEL CAIU. Recolha o Coração da Nevasca e a Presa.');Music.victory();return true;},
};
