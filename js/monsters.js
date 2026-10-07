'use strict';
// Ajustes dos monstros: velocidade, vida, dano e limite global.
const MONSTERS={slime:{name:'Slime',hp:12,speed:65,damage:6,color:'#69995a',drop:ITEM.DIRT},undead:{name:'Canibal',hp:20,speed:48,damage:10,color:'#71886d',drop:ITEM.WOOD},bat:{name:'Morcego',hp:8,speed:75,damage:5,color:'#9b77af',drop:ITEM.COAL}};
MONSTERS.bomber={name:'Dinamiteiro',hp:16,speed:35,damage:0,color:'#c9a04a',drop:ITEM.COAL}; // goblin mineiro com barril de pólvora (js/bomber-art.js)
const BOMBER_FUSE=2;
const MONSTER_LIMIT=5;          // total de monstros vivos ao mesmo tempo
const MONSTER_KIND_LIMIT=2;     // por tipo, à noite ou em cavernas (de dia na superfície: 1 slime)
const MONSTER_SPAWN_EVERY=[9,16]; // segundos entre tentativas (mínimo, máximo)
const MONSTER_GRACE=25;         // segundos sem monstros depois de acordar
function inCave(w,x,y){const tx=Math.floor(x/T),ty=Math.floor(y/T);return w.inBounds(tx,ty)&&ty>w.surface[tx]+5&&!w.isSkyExposed(tx,ty);}
function monsterAllowed(g,x,y,kind){return !!WILDLIFE[kind] || kind==='slime'|| inCave(g.world,x,y)||daylightAt(g.time)<.2;}
class Monster extends Pig {
 constructor(kind,x,y){super(x,y);this.kind=kind;this.hostile=true;this.def=MONSTERS[kind];this.w=kind==='undead'?14:20;this.h=kind==='undead'?42:kind==='bomber'?24:14;this.hp=this.def.hp;this.clock=Math.random()*6;this.jumpWait=.4;this.fuse=0;this.gait=0;this.visualTime=0;this.jumpAge=1;this.landTimer=0;}
 update(dt,w,p){
  const oldX=this.x, grounded=this.onGround;this.landTimer=Math.max(0,this.landTimer-dt);this.jumpAge+=dt;this.visualTime+=dt;
  this.clock+=dt;this.hurtTimer=Math.max(0,this.hurtTimer-dt);this.jumpWait-=dt;
  const dx=p.cx-this.cx,dy=p.cy-this.cy,dir=Math.sign(dx);this.facing=dir||this.facing;
  if(this.kind==='bat'){
   if(this.hurtTimer<=0){const d=Math.max(1,Math.hypot(dx,dy));this.vx=dx/d*this.def.speed;this.vy=dy/d*this.def.speed+Math.sin(this.clock*7)*18;}
   this.moveX(this.vx*dt,w);this.moveY(this.vy*dt,w);
  }else{
   if(this.hurtTimer<=0){
    // Slime: escolhe o lado ao saltar e segue empurrando no ar.
    // (Antes o vx zerava ao encostar na parede e ele ficava pulando no mesmo lugar para sempre.)
    if(this.pathWaiting&&this.onGround)this.vx=0;
    else if(this.kind==='slime'){
     if(this.onGround&&this.jumpWait<=0){this.hopDir=dir||this.facing||1;this.vy=-330;this.onGround=false;this.jumpAge=0;this.jumpWait=.9;}
     this.vx=this.onGround?0:(this.hopDir||dir)*this.def.speed;
    }
    else this.vx=dir*this.def.speed*(this.fuse>0?.25:1);
   }
   this.applyGravity(dt);const vx=this.vx;this.moveX(vx*dt,w);
   // Bateu numa parede alta demais para o degrau automático: pula (o slime já anda pulando)
   if(this.kind!=='slime'&&vx&&this.vx===0&&this.onGround)this.vy=-360;
   this.moveY(this.vy*dt,w);
  }
  if(!grounded&&this.onGround)this.landTimer=.12;
  this.gait+=Math.abs(this.x-oldX)*12/48;
  this.anim=this.clock*(this.kind==='bat'?12:7);this.settleStep(dt);
 }
}
function trySpawnMonster(g){
 if(g.mobs.filter(m=>m.hostile&&!m.boss).length>=MONSTER_LIMIT)return false;
 const w=g.world,p=g.player,cave=inCave(w,p.cx,p.cy),night=daylightAt(g.time)<.2;
 const pool=(cave?['slime','undead','bat','bomber']:night?['slime','undead','bomber']:['slime'])
   .filter(kind=>g.mobs.filter(m=>m.hostile&&m.kind===kind).length<(cave||night?MONSTER_KIND_LIMIT:1));
 if(cave&&!pool.length)return false;

 for(let n=0;n<32;n++){
  // Sempre além da borda da tela (esquerda ou direita), nunca dentro da visão do jogador
  const tx=offScreenColumn(g,Math.random()<.5?-1:1,Math.floor(Math.random()*10));
  if(tx<2||tx>=w.w-2)continue;
  let floor;
  if(cave){floor=Math.floor(p.cy/T)-8+Math.floor(Math.random()*17);while(floor<w.h-2&&!w.isSolid(tx,floor))floor++;}
  else floor=surfaceY(w,tx);
  if(floor<3||floor>=w.h-2)continue;
  if(w.hasWater(tx,floor-1))continue; // nada de monstro nascendo no fundo do rio ou do mar
  const localPool = cave ? pool : [...pool, ...wildlifePool(w, tx, true)]
    .filter(kind => g.mobs.filter(m => m.kind === kind).length < MONSTER_KIND_LIMIT);
  if (!localPool.length) continue;
  const kind=localPool[Math.floor(Math.random()*localPool.length)];
  const m=WILDLIFE[kind]?new Wildlife(kind,tx*T,0):new Monster(kind,tx*T,0);
  // A altura real define o apoio dos pés, inclusive após mudar o sprite.
  m.y=floor*T-m.h-.01;
  if(!monsterAllowed(g,m.cx,m.cy,m.kind)||m.collides(w,m.x,m.y)||!mobOffScreen(g,m,1)||g.mobs.some(o=>Math.hypot(o.cx-m.cx,o.cy-m.cy)<2*T))continue;
  g.mobs.push(m);return true;
 }
 return false;
}
function updateHostiles(g,dt){
 updateExplosions(g,dt);
 const local=g.player;local.hp??=100;local.maxHp??=100;
 const players=typeof mobPlayers==='function'?mobPlayers(g):[local];
 for(const p of players)p.invulnerable=Math.max(0,(p.invulnerable||0)-dt);
 g.monsterTimer=(g.monsterTimer??MONSTER_GRACE)-dt;
 if(g.monsterTimer<=0){g.monsterTimer=MONSTER_SPAWN_EVERY[0]+Math.random()*(MONSTER_SPAWN_EVERY[1]-MONSTER_SPAWN_EVERY[0]);trySpawnMonster(g);}
 for(let i=g.mobs.length-1;i>=0;i--){const m=g.mobs[i];if(!m.hostile||m.despawn)continue;
  const p=typeof netNearestPlayer==='function'?netNearestPlayer(m,local):local;
  // Some quando não pode mais existir (ex.: amanheceu), mas só fora da tela
  if(!m.boss&&((!monsterAllowed(g,m.cx,m.cy,m.kind)&&mobOffScreen(g,m,2))||(!m.campGuard&&!players.some(o=>Math.hypot(m.cx-o.cx,m.cy-o.cy)<60*T)))){g.mobs.splice(i,1);continue;} // guardas do acampamento somem em js/ruins.js
  if(m.kind==='bomber'&&!m.dead){
   const near=Math.hypot(m.cx-p.cx,m.cy-p.cy)<48;
   m.fuse=near?m.fuse+dt:0;
   if(m.fuse>=BOMBER_FUSE){if(typeof netWithPlayer==='function')netWithPlayer(g,p,()=>explodeMonster(g,m));else explodeMonster(g,m);g.mobs.splice(i,1);continue;}
  }
  const dmg=m.damage??m.def.damage; // o tigre muda o dano conforme o golpe
  for(const p of players)if(dmg>0&&m.aware!==false&&!m.dead&&!(m.cocoonT>0)&&!(m.stunT>0)&&p.invulnerable<=0&&p.x<m.x+m.w&&p.x+p.w>m.x&&p.y<m.y+m.h&&p.y+p.h>m.y){
   mobSfx(m, 'Attack'); // morto-vivo morde, slime gruda, morcego belisca (bichos sem som de ataque ficam quietos)
   if(typeof netWithPlayer==='function')netWithPlayer(g,p,()=>damageMonsterPlayer(g,dmg,m.cx));else damageMonsterPlayer(g,dmg,m.cx);
  }
 }
}

function explodeMonster(g,m){
 m.dead=true;
 (g.explosions??=[]).push(createExplosion(m.cx,m.y+m.h-8));
 playSfx('explosion',m.cx,m.cy);
 // Faíscas e lascas do barril de pólvora, pano e capacete do dinamiteiro
 const bits=['#8c5430','#5a3420','#c99e3c','#44424c'];
 for(let i=0;i<34&&g.particles.length<400;i++){
  const spark=i<14,a=-Math.random()*Math.PI,speed=spark?120+Math.random()*220:70+Math.random()*170,life=spark?.3+Math.random()*.4:.5+Math.random()*.6;
  g.particles.push({x:m.cx,y:m.cy,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,life,maxLife:life,color:spark?(i%2?'#ffe48a':'#ff9a3a'):bits[i%4],w:spark?1:2+i%2,h:spark?1:2,gravity:spark?260:560});
 }
 g.shake=5;
 // Dano cai com a distância: 30 colado nele, uns 8 na beirada do estouro
 const dp=Math.hypot(m.cx-g.player.cx,m.cy-g.player.cy);
 if(g.player.invulnerable<=0&&dp<BOMBER_BLAST.alcance)damageMonsterPlayer(g,Math.round(lerp(30,8,dp/BOMBER_BLAST.alcance)),m.cx);
 // Outros bichos por perto também levam (e outro Dinamiteiro pode estourar junto, em cadeia)
 for(const o of g.mobs){
  if(o===m||o.dead)continue;
  const d=Math.hypot(o.cx-m.cx,o.cy-m.cy);
  if(d<BOMBER_BLAST.alcance)o.hit(Math.round(lerp(24,6,d/BOMBER_BLAST.alcance)),m.cx);
 }
 blastTiles(g,m.cx,m.cy,BOMBER_BLAST.raio);
}

// ---------- Cratera do Dinamiteiro (como a do creeper) ----------
// Quebra os blocos num círculo de borda irregular em volta do estouro. Rocha matriz (e o que
// mais tiver dureza infinita) resiste; baú fica inteiro para não perder o que tem dentro.
// Parte dos blocos cai no chão como item, espalhando; o resto vira poeira.
const BOMBER_BLAST={raio:3.8,alcance:72,chanceDeCair:0.35};
function blastTiles(g,x,y,radius){
 const w=g.world,tx0=Math.floor(x/T),ty0=Math.floor(y/T),R=Math.ceil(radius)+1,broken=[];
 for(let dy=-R;dy<=R;dy++)for(let dx=-R;dx<=R;dx++){
  const tx=tx0+dx,ty=ty0+dy;
  if(!w.inBounds(tx,ty))continue;
  // Borda irregular: cada bloco tem sua própria "resistência" sorteada
  if(Math.hypot(dx,dy*1.1)+(Math.random()-.5)*1.1>radius)continue;
  const t=w.getTile(tx,ty);
  if(t===TILE.AIR||t===TILE.CHEST||TILE_DEFS[t].hardness===Infinity||TILE_DEFS[t].exige)continue;
  if(w.getTile(tx,ty-1)===TILE.CHEST)continue; // o bloco que segura o baú também fica
  if(isDoor(t)){breakDoorBlast(g,tx,ty);continue;}
  if(t===TILE.TRUNK||t===TILE.STUMP||t===TILE.CACTUS){ // árvore inteira tomba, como no machado
   if(treeIsWhole(w,tx,ty)){startTreeFall(g,tx,ty);continue;}
  }
  const furniture=!!FURNITURE[t],drop=TILE_DEFS[furniture?removeFurniture(w,tx,ty):t].drop;
  if(!furniture)w.setTile(tx,ty,TILE.AIR);
  spawnBreakBurst(tx,ty,t);
  if(drop!=null&&(furniture||Math.random()<BOMBER_BLAST.chanceDeCair)) // móvel sempre cai inteiro
   dropItem(g,drop,1,(tx+.5)*T,(ty+.5)*T,Math.sign(dx)*(.5+Math.random()));
  broken.push([tx,ty]);
 }
 // Tochas, portas, móveis e árvores que ficaram sem apoio caem depois
 for(const [tx,ty] of broken)dropUnsupported(tx,ty);
 if(broken.length)playSfx('break',x,y,{tile:TILE.STONE});
 return broken.length;
}
// Porta atingida: sai inteira e cai como item (em vez de ir direto para o inventário)
function breakDoorBlast(g,tx,ty){
 const bottom=doorBottom(tx,ty);
 for(let k=0;k<3;k++)if(isDoor(g.world.getTile(tx,bottom-k)))g.world.setTile(tx,bottom-k,TILE.AIR);
 dropItem(g,ITEM.DOOR,1,(tx+.5)*T,(bottom-1)*T,0);
}
function monsterFrame(m){
 if(m.kind==='undead')return !m.onGround?12:Math.abs(m.vx)>3?Math.floor(m.gait)%12:13+Math.floor(m.clock*1.5)%2;
 // Pavio aceso: incha em 4 estágios até estourar, pulsando cada vez mais rápido
 if(m.kind==='bomber')return m.fuse>0?8+Math.min(3,Math.floor(m.fuse/BOMBER_FUSE*4))*2+Math.floor(m.clock*(10+14*m.fuse/BOMBER_FUSE))%2:Math.abs(m.vx)>3||!m.onGround?Math.floor(m.gait)%8:16+[0,1,2,1,0,3,0,1][Math.floor(m.clock*2.5)%8];
 if(m.kind==='slime')return m.onGround?(m.landTimer>0?0:m.jumpWait<.18?1:2):(m.vy<0?3:4);
 return Math.floor(m.clock*(m.kind==='bat'?14:6))%8;
}
function buildMonsterSprites(){
 const result={};for(const kind of Object.keys(MONSTERS)){
  result[kind]={frames:[],hurt:[]};
  if(kind==='undead'){result[kind]=buildCannibalSprites();continue;}
  if(kind==='bomber'){result[kind]=buildBomberSprites();continue;}
  if(kind==='bat'){result[kind]=buildBatSprites();continue;}
  for(let f=0;f<8;f++)for(const hurt of [false,true]){
   const c=makeCanvas(32,40),ctx=c.getContext('2d'),base=hurt?'#e79a87':MONSTERS[kind].color;
   const rect=(x,y,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(x,y,w,h);};
   if(kind==='slime'){
    const heights=[10,11,14,18,15,14,14,14],widths=[24,23,20,16,19,20,20,20];const h=heights[f],w=widths[f],x=Math.floor((32-w)/2),y=40-h;
    for(let j=0;j<h;j++){const inset=j<3?3-j:j===h-1?1:0;rect(x+inset,y+j,w-inset*2,1,'#294b36');if(j>0&&j<h-1)rect(x+inset+1,y+j,w-inset*2-2,1,base);}
    rect(x+4,y+2,Math.max(3,w/3|0),2,'#b5da86');rect(x+w-6,y+5,2,3,'#23372c');rect(x+w-12,y+5,2,3,'#23372c');rect(x+w-10,y+9,4,1,'#344c31');
   }result[kind][hurt?'hurt':'frames'].push(c);
  }
 }return result;
}

// opts.pierce: dano que a roupa não segura e que não empurra (afogamento); opts.death: aviso ao morrer
function damageMonsterPlayer(g,damage,fromX,opts={}){if(g.adminGod||g.respawnPending)return;const p=g.player;
   damage=shieldIncoming(g,damage,fromX,opts); // Escudo do Escavador (js/beetle-loot.js)
   if(!opts.pierce&&damage>0)damage=Math.max(1,Math.round(damage*(1-playerDefense(g)))); // roupa de tigre segura parte do dano
   if(damage<=0){p.invulnerable=.25;return;} // aparo perfeito: nada passou
   p.hp=Math.max(0,p.hp-damage);p.invulnerable=opts.pierce?0.3:1;playSfx('hurt',p.cx,p.cy);
   referenceOnHurt(g);
   // Pele do Patriarca segura quase todo o empurrão (js/bear-loot.js)
   if(!opts.pierce){const kb=1-(ITEM_DEFS[g.outfit]?.roupa?.empurrao||0);p.vx=(p.cx<fromX?-1:1)*190*kb;p.vy=-180*kb;g.shake=1.5;}
   if(damage>0)useBottledRoar(g);
   breakAncientHoney(g); // levar pancada corta o mel
   if(p.hp===0){
    // Conclui fora dos loops de bichos/projéteis, sem mudar a coleção no meio de um golpe.
    g.respawnPending={message:opts.death||'Você caiu! Voltou ao início.'};
   }
}

function respawnPlayer(g) {
 const pending=g.respawnPending;if(!pending)return;
 const p=g.player,w=g.world;
 const carried=carriedShark(g);if(carried)throwShark(g,p,carried,true);
 const cleaning=cleaningShark(g);if(cleaning)cancelSharkCleaning(cleaning);
 if(g.mount)dismountElephant(g);
 p.crouching=false;p.h=PLAYER_H;p.seat=null;p.climbing=false;p.dropTimer=0;
 const origin=g.spawnPoint||{x:Math.floor(w.w/2)*T+1,y:w.surface[Math.floor(w.w/2)]*T-PLAYER_H-.01};
 p.x=origin.x;p.y=origin.y;
 // Se construíram no nascimento, procura um apoio livre perto dele, sem escavar o mundo.
 if(p.collides(w,p.x,p.y)) {
  const tx=Math.floor(origin.x/T),ty=Math.floor((origin.y+p.h)/T);
  findSpawn: for(let radius=0;radius<=32;radius++)for(const dx of radius?[radius,-radius]:[0]){
   const x=tx+dx;if(x<1||x>=w.w-1)continue;
   for(let offset=0;offset<w.h;offset++)for(const y of offset?[ty-offset,ty+offset]:[ty]){
    if(y<3||y>=w.h||!w.isSolid(x,y))continue;
    const px=x*T+1,py=y*T-p.h-.01;
    if(!p.collides(w,px,py)){p.x=px;p.y=py;break findSpawn;}
   }
  }
 }
 p.vx=p.vy=p.stepOffset=0;p.hp=p.maxHp;p.invulnerable=3;p.breath=BREATH_MAX;p.drownTimer=1;
 p.lockFacing=false;p.onGround=false;p.landTimer=0;
 g.sword.active=false;g.bow=null;g.trident=null;cancelTool(g);g.mining.progress=0;
 g.arrows=(g.arrows||[]).filter(a=>a.stuck);seismicWaves.length=0;
 g.hitStop=0;g.shake=0;g.swinging=false;g.target.visible=false;
 input.mouse.left=input.mouse.right=input.mouse.rawLeft=false;
 for(const m of g.mobs)if(m.boss&&!m.dead)resetBossEncounter(g,m);
 g.mobs=g.mobs.filter(m=>!m.despawn);g.boss=null;
 g.inventoryUI.close();g.mapUI.close();
 g.map.reveal(Math.floor(p.cx/T),Math.floor(p.cy/T),MAP_REVEAL_RADIUS);
 updateCamera(0,true);w.lightDirty=true;
 g.respawnPending=null;toast(pending.message);
}

// Cópia avermelhada de um quadro, para quando o monstro apanha
function hurtFlash(canvas){
 const flash=makeCanvas(canvas.width,canvas.height),fc=flash.getContext('2d');fc.drawImage(canvas,0,0);const img=fc.getImageData(0,0,canvas.width,canvas.height);
 for(let i=0;i<img.data.length;i+=4){if(img.data[i+3]){img.data[i]=lerp(img.data[i],255,.4);img.data[i+1]*=.8;img.data[i+2]*=.8;}}
 fc.putImageData(img,0,0);return flash;
}

// ---------- Dinamiteiro ----------
// Goblin mineiro que carrega um barril de pólvora nas costas e acende o pavio quando chega perto.
// A arte do Dinamiteiro fica em js/bomber-art.js (buildBomberSprites)

// ---------- Explosão do Dinamiteiro ----------
// Bola de fogo cartoon em pixel art: clarão, estrela de raios, anel de choque e nuvens de fogo
// com contorno e sombra chapada, que esfriam até virar fumaça. 1 célula = BOOM_CELL px do mundo.
const BOOM_CELL=2,BOOM_N=84,BOOM_CX=42,BOOM_CY=54,BOOM_LEN=1.7,BOOM_TH=.22;
const BOOM_FIRE=[[255,252,226],[255,230,98],[255,166,44],[238,92,34],[164,50,32]];
const BOOM_SMOKE=[[166,156,150],[118,110,110],[80,74,78]];
const BOOM_LINE_FIRE=[96,26,22],BOOM_LINE_SMOKE=[38,32,38];
function createExplosion(x,y){
 const R=Math.random,puffs=[];
 for(let i=0;i<18;i++){const a=R()*Math.PI*2,sp=20+R()*45;puffs.push({x:Math.cos(a)*2,y:Math.sin(a)*2,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp*.75-10,r:5+R()*6,age:-R()*.05,life:.7+R()*.5,cool:.45+R()*.3,rise:10});}
 // Bolhas atrasadas em volta do núcleo deixam a nuvem "encaroçada"
 for(let i=0;i<8;i++){const a=i/8*Math.PI*2+R()*.5,d=8+R()*5;puffs.push({x:Math.cos(a)*d,y:Math.sin(a)*d*.8-3,vx:Math.cos(a)*11,vy:Math.sin(a)*8-8,r:4+R()*4,age:-.04-R()*.08,life:.65+R()*.45,cool:.4+R()*.3,rise:12});}
 for(let i=0;i<12;i++){const a=-Math.PI*(.1+R()*.8),sp=8+R()*20;puffs.push({x:(R()-.5)*22,y:-5-R()*8,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,r:5+R()*5,age:-.25-R()*.3,life:.9+R()*.5,cool:0,rise:15,smoke:true});}
 const canvas=makeCanvas(BOOM_N,BOOM_N);
 return {x,y,t:0,puffs,canvas,ctx:canvas.getContext('2d'),img:new ImageData(BOOM_N,BOOM_N),field:new Float32Array(BOOM_N*BOOM_N),heat:new Float32Array(BOOM_N*BOOM_N),spin:R()*6};
}
function boomRadius(p){
 if(p.age<0||p.age>p.life)return 0;
 const grow=p.age<.12?1-(1-p.age/.12)**3:1+(p.age-.12)*.45,end=p.age>p.life*.6?1-smoothstep((p.age-p.life*.6)/(p.life*.4)):1;
 return p.r*grow*end;
}
function updateExplosions(g,dt){
 const list=g.explosions;if(!list?.length)return;
 const drag=Math.exp(-3.2*dt);
 for(let i=list.length-1;i>=0;i--){
  const e=list[i];e.t+=dt;
  if(e.t>=BOOM_LEN){list.splice(i,1);continue;}
  for(const p of e.puffs){p.age+=dt;if(p.age<0)continue;p.vx*=drag;p.vy*=drag;p.x+=p.vx*dt;p.y+=p.vy*dt-(p.age>.15?p.rise*dt:0);}
 }
}
let BOOM_REMOTE_BUFFER=null;
function paintExplosion(e){
 // A rede transmite as nuvens, mas canvas e buffers pertencem ao navegador de cada jogador.
 if(!e.img||!e.ctx||!e.field||!e.heat){
  if(!BOOM_REMOTE_BUFFER){const canvas=makeCanvas(BOOM_N,BOOM_N);BOOM_REMOTE_BUFFER={canvas,ctx:canvas.getContext('2d'),img:new ImageData(BOOM_N,BOOM_N),field:new Float32Array(BOOM_N*BOOM_N),heat:new Float32Array(BOOM_N*BOOM_N)};}
  Object.assign(e,BOOM_REMOTE_BUFFER);
 }
 const N=BOOM_N,F=e.field,H=e.heat,d=e.img.data,t=e.t;
 F.fill(0);H.fill(0);d.fill(0);
 // Campo das nuvens (metaballs) e o calor de cada célula
 for(const p of e.puffs){
  const r=boomRadius(p);if(r<.6)continue;
  const px=BOOM_CX+p.x,py=BOOM_CY+p.y,h0=p.smoke?0:clamp(1-p.age/p.cool,0,1)**.7,h=h0<.25?0:h0,r2=r*r; // abaixo de 1/4 do calor já é fumaça
  for(let y=Math.max(0,Math.floor(py-r));y<=Math.min(N-1,Math.ceil(py+r));y++)
   for(let x=Math.max(0,Math.floor(px-r));x<=Math.min(N-1,Math.ceil(px+r));x++){
    const dd=((x+.5-px)**2+(y+.5-py)**2)/r2;if(dd>=1)continue;
    const w=(1-dd)*(1-dd),i=y*N+x;F[i]+=w;if(h>0)H[i]=Math.max(H[i],h*Math.min(1,w*2.5));
   }
 }
 const star=t<.22?1-t/.22:0,ring=t>.02&&t<.45?(t-.02)/.43:-1,fade=t>BOOM_LEN*.7?(t-BOOM_LEN*.7)/(BOOM_LEN*.3):0;
 for(let y=0;y<N;y++)for(let x=0;x<N;x++){
  const i=y*N+x,f=F[i],bay=BAYER4[(y&3)*4+(x&3)]/16;
  let c=null;
  if(f>=BOOM_TH){
   if(bay<fade)continue; // some aos poucos, em pontilhado
   const edge=x===0||y===0||x===N-1||y===N-1||F[i-1]<BOOM_TH||F[i+1]<BOOM_TH||F[i-N]<BOOM_TH||F[i+N]<BOOM_TH;
   const h=H[i],lowRight=y<N-2&&x<N-2&&F[i+N*2+2]<BOOM_TH*2;
   if(edge)c=h>.08?BOOM_LINE_FIRE:BOOM_LINE_SMOKE;
   else if(h>.08){let k=h>.8?0:h>.6?1:h>.4?2:h>.2?3:4;if(lowRight&&k<4)k++;c=BOOM_FIRE[k];}
   else c=BOOM_SMOKE[y>2&&x>2&&F[i-N*2-2]<BOOM_TH*2?0:lowRight?2:1];
  }else{
   const dx=x+.5-BOOM_CX,dy=y+.5-BOOM_CY,dist=Math.hypot(dx,dy);
   if(t<.07&&dist<16-t*90)c=[255,255,236]; // clarão
   else if(star>0){ // estrela de raios, bem de desenho animado
    const R=5+(1-star)*10+star*18*Math.max(0,Math.cos(Math.atan2(dy,dx)*5+e.spin))**6;
    if(dist<R)c=dist>R-1.5?BOOM_LINE_FIRE:dist<R*.55?BOOM_FIRE[1]:BOOM_FIRE[2];
   }
   if(!c&&ring>=0){const RR=5+ring*30;if(Math.abs(dist-RR)<1.6*(1-ring)+.5&&bay>ring*.9)c=[255,236,196];} // anel de choque
   if(!c)continue;
  }
  const o=i*4;d[o]=c[0];d[o+1]=c[1];d[o+2]=c[2];d[o+3]=255;
 }
 e.ctx.putImageData(e.img,0,0);
}
// Depois da camada de luz: a explosão brilha também no escuro
function drawExplosions(ctx,g){
 const list=g.explosions;if(!list?.length)return;
 for(const e of list){
  const k=Math.max(0,1-e.t/.6);
  if(k>0){
   const r=90*(.6+.4*k),gy=e.y-12,gr=ctx.createRadialGradient(e.x,gy,0,e.x,gy,r);
   gr.addColorStop(0,`rgba(255,180,80,${.45*k})`);gr.addColorStop(1,'rgba(255,120,40,0)');
   ctx.globalCompositeOperation='lighter';ctx.fillStyle=gr;ctx.fillRect(e.x-r,gy-r,r*2,r*2);ctx.globalCompositeOperation='source-over';
  }
  paintExplosion(e);
  ctx.drawImage(e.canvas,Math.round(e.x-BOOM_CX*BOOM_CELL),Math.round(e.y-BOOM_CY*BOOM_CELL),BOOM_N*BOOM_CELL,BOOM_N*BOOM_CELL);
 }
}
