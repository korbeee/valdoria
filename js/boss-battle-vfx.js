'use strict';
// Arte de batalha em pixels. Os desenhos são locais; vida, colisões e dano continuam na simulação.
const BATTLE_COLORS={bear:['#382923','#96714b','#edc591'],tiger:['#52281c','#d97938','#ffe0a0'],fiandeira:['#332344','#9470b0','#e6efc9'],cascoferro:['#443421','#b58b4f','#fff0ad'],nucleo:['#652636','#ec7b38','#ffeac1'],thunderbird:['#304974','#75badb','#e8fbff'],yeti:['#274b70','#79b8d7','#e9fbff']};
const BATTLE_MEMORY=new WeakMap();
const BATTLE_DUST=new Map();
function battleDustSprite(palette){
 const key=palette.join();if(BATTLE_DUST.has(key))return BATTLE_DUST.get(key);
 const c=makeCanvas(28,18),ctx=c.getContext('2d');
 const rows=['......44444...333.......','....444444443333333.....','..444444444333333333....','.44444444433333333333...','4444444443333333333333..','44444444333333322223333.','.33333333333322222223333','..333333333222222222333.','...22222222222222222....'];
 for(let y=0;y<rows.length;y++)for(let x=0;x<rows[y].length;x++)if(rows[y][x]!=='.'){ctx.fillStyle=palette[Number(rows[y][x])===4?2:Number(rows[y][x])===3?1:0];ctx.fillRect(x,y*2,1,2);}
 BATTLE_DUST.set(key,c);return c;
}
function battleLine(ctx,x0,y0,x1,y1,color,size=1){
 ctx.fillStyle=color;const n=Math.max(1,Math.ceil(Math.max(Math.abs(x1-x0),Math.abs(y1-y0))/size));
 for(let i=0;i<=n;i++)ctx.fillRect(Math.round(lerp(x0,x1,i/n)),Math.round(lerp(y0,y1,i/n)),size,size);
}
function battleRing(ctx,x,y,r,color,flat=.25,broken=false){
 const n=Math.max(16,Math.min(96,Math.ceil(r*2)));
 for(let i=0;i<n;i++){if(broken&&i%5===0)continue;const a=i/n*Math.PI*2,b=(i+1)/n*Math.PI*2;battleLine(ctx,x+Math.cos(a)*r,y+Math.sin(a)*r*flat,x+Math.cos(b)*r,y+Math.sin(b)*r*flat,color);}
}
// ---------- Efeitos "gordos" em pixel art (urso, tigre e besouro) ----------
// Tudo em blocos de 2x2 numa grade fixa, três tons e contorno escuro; nada de linhas finas nem de transparência suave
// (a opacidade só varia em três degraus). O Yeti, o Núcleo e os outros continuam com o desenho de antes.
const BATTLE_CHUNKY = new Set(['bear', 'tiger', 'cascoferro']);
const pxStep = (k) => (k > 0.66 ? 1 : k > 0.33 ? 0.66 : 0.33);                       // opacidade em degraus
function pxBlk(ctx, x, y, size, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x / 2) * 2, Math.round(y / 2) * 2, size, size); }
function pxRing(ctx, x, y, r, pal, flat = 0.25, phase = 0) {
  const n = Math.max(20, Math.min(64, Math.ceil(r * 1.2))), pts = [];
  for (let i = 0; i < n; i++) { if ((i + phase) % 7 === 6) continue; const a = i / n * Math.PI * 2; pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r * flat, Math.sin(a)]); }
  for (const [px, py] of pts) pxBlk(ctx, px - 1, py - 1, 4, pal[0]);                    // contorno
  for (const [px, py, sn] of pts) pxBlk(ctx, px, py, 2, sn > 0.3 ? pal[2] : pal[1]);       // corpo: o lado de frente é mais claro
}
function pxArc(ctx, x, y, r, a0, a1, dir, pal) {                                         // frente de som: arco de blocos
  const n = Math.max(6, Math.ceil(Math.abs(a1 - a0) * r / 3)), pts = [];
  for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; pts.push([x + dir * Math.cos(a) * r, y + Math.sin(a) * r]); }
  for (const [px, py] of pts) pxBlk(ctx, px - 1, py - 1, 4, pal[0]);
  pts.forEach(([px, py], i) => pxBlk(ctx, px, py, 2, i % 3 === 1 ? pal[2] : pal[1]));
}
function pxClaw(ctx, x0, y0, x1, y1, pal) {                                              // rasgo afinando nas pontas
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 2), pts = [];
  for (let i = 0; i <= n; i++) { const t = i / n, w = 2 + Math.round(Math.sin(t * Math.PI) * 4); pts.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, w]); }
  for (const [px, py, w] of pts) pxBlk(ctx, px - w / 2 - 1, py - 1, w + 2, pal[0]);
  for (const [px, py, w] of pts) pxBlk(ctx, px - w / 2, py, w, pal[1]);
  for (const [px, py, w] of pts) if (w > 3) pxBlk(ctx, px - w / 2 + 1, py, w - 2, pal[2]);
}
function pxStreak(ctx, x, y, len, dir, pal) {                                            // risco de velocidade em blocos que se apagam para trás
  for (let i = 0; i < len; i += 2) { const sx = x - dir * i; if (i > len * 0.5 && (i / 2) % 2) continue; pxBlk(ctx, sx, y, 2, i < len * 0.3 ? pal[2] : pal[1]); }
  pxBlk(ctx, x + dir * 2, y, 2, pal[0]);
}
function battleBurst(ctx,x,y,t,palette,rock=false,chunky=false){
 if(t<0||t>=.7)return;ctx.globalAlpha=1-t/.7;
 if(rock){const dust=battleDustSprite(palette);for(let i=0;i<5;i++){const dir=i-2;ctx.globalAlpha=(1-t/.7)*.5;ctx.drawImage(dust,Math.round(x+dir*(10+t*70)-14),Math.round(y-18-t*16-Math.abs(dir)*2));}ctx.globalAlpha=1-t/.7;}
 for(let i=0;i<16;i++){const a=i*2.39996,v=28+(i%5)*15,px=x+Math.cos(a)*v*t,py=y-Math.abs(Math.sin(a))*v*t+100*t*t;
  ctx.fillStyle=palette[0];ctx.fillRect(Math.round(px)-1,Math.round(py)-1,rock?4:3,rock?4:3);ctx.fillStyle=palette[i%2+1];ctx.fillRect(Math.round(px),Math.round(py),rock?2:1,2);
 }
 if(chunky){ctx.globalAlpha=pxStep(1-t/.7);pxRing(ctx,x,y,8+Math.floor(t*30)*5,palette,.2,Math.floor(t*14));}
 else battleRing(ctx,x,y,8+t*150,palette[1],.18,true);ctx.globalAlpha=1;
}
function battleRock(ctx,x,y,palette,size=10){
 x=Math.round(x-size/2);y=Math.round(y-size/2);ctx.fillStyle=palette[0];ctx.fillRect(x+2,y,size-4,size);ctx.fillRect(x,y+2,size,size-4);
 ctx.fillStyle=palette[1];ctx.fillRect(x+2,y+2,size-4,size-4);ctx.fillStyle=palette[2];ctx.fillRect(x+3,y+2,size-6,2);battleLine(ctx,x+size/2,y+4,x+size/2-2,y+size-2,palette[0]);
}
// O mesmo gelo azul da pose de arremesso, extraído da paleta do atlas aprovado.
const YETI_THROW_ICE=(()=>{
 const runs=YETI_PIXEL_FRAMES[YETI_SEQUENCES[4][10]],pixels=[];let pos=0,minX=160,minY=152,maxX=0,maxY=0;
 for(let i=0;i<runs.length;i+=2)for(let j=0;j<runs[i];j++,pos++)if(runs[i+1]>=18&&runs[i+1]<=22){const x=pos%160,y=Math.floor(pos/160);pixels.push([x,y,YETI_PIXEL_PALETTE[runs[i+1]-1]]);minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
 // Os dedos escondem a parte inferior do bloco no atlas; completa apenas essa região.
 const source=pixels.slice(),existing=new Set(pixels.map(([x,y])=>y*160+x)),w=maxX-minX+1,h=maxY-minY+1;
 const hull=[[0,.3],[.16,.08],[.42,0],[.74,.1],[.94,.32],[1,.6],[.85,.87],[.6,1],[.25,.93],[.03,.68]];
 for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++)if(!existing.has(y*160+x)){
  const u=(x-minX)/w,v=(y-minY)/h;let inside=false;
  for(let i=0,j=hull.length-1;i<hull.length;j=i++)if((hull[i][1]>v)!==(hull[j][1]>v)&&u<(hull[j][0]-hull[i][0])*(v-hull[i][1])/(hull[j][1]-hull[i][1])+hull[i][0])inside=!inside;
  if(inside){const mirrored=minY+(maxY-y)*.7;let best=null,dist=Infinity;
   for(const sample of source){const d=(sample[0]-x)**2+(sample[1]-mirrored)**2;if(d<dist){dist=d;best=sample[2];}}
   pixels.push([x,y,v>.8?YETI_PIXEL_PALETTE[18]:best]);
  }
 }
 const size=Math.ceil(Math.hypot(maxX-minX+3,maxY-minY+3))+4,frames=[];
 for(let f=0;f<12;f++){const c=makeCanvas(size,size),ctx=c.getContext('2d'),a=f/12*Math.PI*2,points=pixels.map(([x,y,color])=>[Math.round(size/2+(x-(minX+maxX)/2)*Math.cos(a)-(y-(minY+maxY)/2)*Math.sin(a)),Math.round(size/2+(x-(minX+maxX)/2)*Math.sin(a)+(y-(minY+maxY)/2)*Math.cos(a)),color]);
  ctx.fillStyle='#192a3d';for(const [x,y]of points)for(const [dx,dy]of [[-1,0],[1,0],[0,-1],[0,1]])ctx.fillRect(x+dx,y+dy,1,1);
  for(const [x,y,color]of points){ctx.fillStyle=`rgb(${color.join(',')})`;ctx.fillRect(x,y,1,1);}frames.push(c);
 }
 return {frames,size,pixels:pixels.length};
})();
function drawYetiIce(ctx,q){
 const time=Math.max(0,3-q.life),frame=YETI_THROW_ICE.frames[Math.floor(time*12)%12],s=YETI_THROW_ICE.size;
 ctx.save();ctx.imageSmoothingEnabled=false;
 for(let i=3;i>0;i--){ctx.globalAlpha=.1*(4-i);ctx.drawImage(frame,Math.round(q.x-(q.vx||0)*i*.012-s/2),Math.round(q.y-(q.vy||0)*i*.012-s/2));}
 ctx.globalAlpha=1;ctx.drawImage(frame,Math.round(q.x-s/2),Math.round(q.y-s/2));ctx.restore();
}
function drawBossBattleVfx(ctx,g){
 const now=g.clock||0;ctx.save();ctx.imageSmoothingEnabled=false;
 for(const m of g.mobs){
  const pal=BATTLE_COLORS[m.kind];if(!m.boss||!pal||m.sleeping||m.despawn)continue;
  let mem=BATTLE_MEMORY.get(m);if(!mem){mem={state:m.state,slam:false,bursts:[]};BATTLE_MEMORY.set(m,mem);}
  const state=m.state,t=m.stateT||0,x=m.cx,y=m.y+m.h,f=m.facing||1;
  if(mem.state!==state){
   if(['recover','stuck','flipped','erupt'].includes(state))mem.bursts.push({x,y,t:now,rock:true});
   if(['roar','yetiRoar','screech'].includes(state))mem.bursts.push({x,y:m.y+m.h*.4,t:now});
   mem.state=state;mem.slam=false;
  }
  if((m.slammed||m.fired&&state==='yetiSlam')&&!mem.slam){mem.bursts.push({x,y,t:now,rock:true});mem.slam=true;}
  mem.bursts=mem.bursts.filter(q=>now-q.t<.7).slice(-5);for(const q of mem.bursts)battleBurst(ctx,q.x,q.y,now-q.t,pal,q.rock,BATTLE_CHUNKY.has(m.kind));
  // Rugido: três frentes quebradas saem da boca, sem círculos borrados.
  if(['roar','yetiRoar','screech'].includes(state)&&BATTLE_CHUNKY.has(m.kind)){
   for(let j=0;j<3;j++){const phase=(t*1.7+j/3)%1,r=10+Math.floor(phase*9)*5;ctx.globalAlpha=pxStep(1-phase);pxArc(ctx,x+f*m.w*.25,m.y+m.h*.35,r,-.7,.7,f,pal);}ctx.globalAlpha=1;
  } else if(['roar','yetiRoar','screech'].includes(state)){
   for(let j=0;j<3;j++){const phase=(t*1.7+j/3)%1,r=8+phase*48;ctx.globalAlpha=(1-phase)*.65;
    for(let i=-5;i<5;i++){const a=i*.13,b=(i+1)*.13;battleLine(ctx,x+f*(m.w*.25+Math.cos(a)*r),m.y+m.h*.35+Math.sin(a)*r,x+f*(m.w*.25+Math.cos(b)*r),m.y+m.h*.35+Math.sin(b)*r,pal[j%2+1],1);}
   }ctx.globalAlpha=1;
  }
  // Garras: cortes curtos na direção real do golpe.
  if(['swipe','bite','snap'].includes(state)&&t>.15&&t<.65&&BATTLE_CHUNKY.has(m.kind)){const k=(t-.15)/.5;ctx.globalAlpha=pxStep(Math.sin(k*Math.PI));
   for(let j=0;j<3;j++){const cx=x+f*(m.w*.45+j*6),cy=m.y+m.h*.4+j*6,sw=Math.floor(k*4)/4;pxClaw(ctx,cx-f*14,cy-17,cx-f*14+f*(10+sw*26),cy-17+(8+sw*26),pal);}ctx.globalAlpha=1;
  } else if(['swipe','bite','snap'].includes(state)&&t>.15&&t<.65){const k=(t-.15)/.5;ctx.globalAlpha=Math.sin(k*Math.PI);
   for(let j=0;j<3;j++){const cx=x+f*(m.w*.45+j*5),cy=m.y+m.h*.45+j*5;battleLine(ctx,cx-f*12,cy-15,cx+f*8,cy+8,pal[0],3);battleLine(ctx,cx-f*11,cy-15,cx+f*7,cy+7,pal[2],1);}ctx.globalAlpha=1;
  }
  if(['charge','pounce','dive'].includes(state)&&BATTLE_CHUNKY.has(m.kind)){for(let j=0;j<5;j++){ctx.globalAlpha=pxStep(.2+j*.18);pxStreak(ctx,x-f*(m.w*.5+8),m.y+m.h*(.2+j*.15),16+j*5,f,pal);}ctx.globalAlpha=1;}
  else if(['charge','pounce','dive'].includes(state))for(let j=0;j<5;j++){ctx.globalAlpha=.15+j*.08;const px=x-f*(m.w*.5+10+j*7),py=m.y+m.h*(.3+j*.12);battleLine(ctx,px-f*14,py,px,py,pal[j%2+1],1);}ctx.globalAlpha=1;
  if(['rear','scrape','yetiSlam'].includes(state)&&!m.slammed&&!m.fired&&BATTLE_CHUNKY.has(m.kind)){ctx.globalAlpha=Math.floor(t*10)%2?1:.66;pxRing(ctx,x,y-1,Math.min(90,m.w*.8),pal,.1,Math.floor(t*8));ctx.globalAlpha=1;}
  else if(['rear','scrape','yetiSlam'].includes(state)&&!m.slammed&&!m.fired){ctx.globalAlpha=.35+.2*Math.sin(t*20);battleRing(ctx,x,y-1,Math.min(150,m.w*1.1),pal[1],.09,true);ctx.globalAlpha=1;}
  if(m.kind==='bear'){
   if(state==='charge'){const dust=battleDustSprite(pal);for(let j=0;j<3;j++){const k=(t*3+j/3)%1;ctx.globalAlpha=(1-k)*.6;ctx.drawImage(dust,Math.round(x-f*(m.w*.5+k*60)-14),Math.round(y-18-k*10));}ctx.globalAlpha=1;}
   for(const wave of m.waves||[]){const k=clamp(wave.life/1.5,0,1);ctx.globalAlpha=k;
    for(let i=0;i<5;i++){const px=wave.x-wave.dir*i*6,py=wave.y-3-(4-i)*2;battleRock(ctx,px,py,pal,6+i%2*2);}ctx.globalAlpha=1;
   }
   for(const r of m.rocks||[])battleRock(ctx,r.x,r.y,['#302b30','#857666','#c9b799'],12);
  }
  if(m.kind==='fiandeira'){
   for(const q of g.spiderShots||[]){const a=(q.spin||0);for(let i=0;i<3;i++)battleLine(ctx,q.x,q.y,q.x+Math.cos(a+i*2.1)*9,q.y+Math.sin(a+i*2.1)*9,pal[2]);}
   if(state==='rain'||state==='lasso'){ctx.globalAlpha=.5;for(let j=0;j<5;j++)battleLine(ctx,x+(j-2)*9,m.y+5,x+(j-2)*18,m.y-20-j%2*10,pal[2]);ctx.globalAlpha=1;}
  }
  if(m.kind==='cascoferro')for(const r of g.beetleRocks||[])if(r.t>=r.warn)battleRock(ctx,r.x,r.y,pal,12);
  if(m.kind==='nucleo'){
   const open=m.open||0;ctx.globalAlpha=.45;for(let j=0;j<3;j++)battleRing(ctx,x,m.cy,44+j*10+Math.sin(m.clock*2+j)*2,pal[j%2+1],.75,true);ctx.globalAlpha=1;
   if(m.attack==='pulse'){const k=clamp(m.attackT/NUCLEO.pulseWarn,0,1);battleRing(ctx,x,m.cy,150-k*90,pal[2],1,true);}
   if(open>.6)for(let j=0;j<8;j++){const a=m.clock+j*Math.PI/4;battleLine(ctx,x+Math.cos(a)*38,m.cy+Math.sin(a)*38,x+Math.cos(a)*45,m.cy+Math.sin(a)*45,pal[2]);}
   for(const q of g.nucleoShots||[])battleLine(ctx,q.x-(q.vx||0)*.035,q.y-(q.vy||0)*.035,q.x,q.y,pal[1],2);
  }
  if(m.kind==='thunderbird'){
   if(['gust','bolts','soar'].includes(state))for(let j=0;j<6;j++){const k=(t*.9+j/6)%1,px=x-f*(k*95),py=m.cy+(j-3)*8;ctx.globalAlpha=(1-k)*.6;battleLine(ctx,px,py,px-f*12,py+(j%2?3:-3),pal[2]);}ctx.globalAlpha=1;
   for(const q of g.aveStrikes||[])if(q.t<q.warn){ctx.globalAlpha=.7;battleRing(ctx,q.x,q.floor-1,10+(q.t/q.warn)*12,pal[2],.18,true);ctx.globalAlpha=1;}
  }
  if(m.kind==='yeti'){
   for(const q of m.iceImpacts||[])battleBurst(ctx,q.x,q.y,q.t,pal,true);
   for(const q of m.hazards||[])if(q.type==='frost'){ctx.globalAlpha=clamp(q.life,0,1);battleLine(ctx,q.x-5,q.y,q.x+5,q.y,pal[2]);battleLine(ctx,q.x,q.y-5,q.x,q.y+5,pal[1]);ctx.globalAlpha=1;}
  }
  if(state==='dying'){ctx.globalAlpha=BATTLE_CHUNKY.has(m.kind)?pxStep(1-t/2):clamp(1-t/2,0,1);if(BATTLE_CHUNKY.has(m.kind))pxRing(ctx,x,y-2,10+Math.floor(t*18)*5,pal,.2,Math.floor(t*10));else battleRing(ctx,x,y-2,10+t*90,pal[2],.2,true);ctx.globalAlpha=1;}
 }
 ctx.restore();
}
