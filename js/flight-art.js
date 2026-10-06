'use strict';

// Arte de perfil: a raiz fica no ombro traseiro e toda a asa abre atrás do corpo.
const FLIGHT_PROFILE_CACHE=new Map();
const FLIGHT_FRAME_COUNT=16;
const FLIGHT_SPR_SIZE=128,FLIGHT_ROOT_X=72,FLIGHT_ROOT_Y=64;
// Rasterização em pixels inteiros: sem bordas semitransparentes nas penas.
function flightPixelLine(ctx,a,b,color){
 ctx.fillStyle=color;const n=Math.max(Math.abs(b[0]-a[0]),Math.abs(b[1]-a[1]),1);
 for(let i=0;i<=n;i++)ctx.fillRect(Math.round(lerp(a[0],b[0],i/n)),Math.round(lerp(a[1],b[1],i/n)),1,1);
}
function flightPixelPoly(ctx,points,color,edge){
 const minX=Math.floor(Math.min(...points.map(p=>p[0]))),maxX=Math.ceil(Math.max(...points.map(p=>p[0])));
 const minY=Math.floor(Math.min(...points.map(p=>p[1]))),maxY=Math.ceil(Math.max(...points.map(p=>p[1])));
 ctx.fillStyle=color;
 for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
  let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){
   const a=points[i],b=points[j];if((a[1]>y+.5)!==(b[1]>y+.5)&&x+.5<(b[0]-a[0])*(y+.5-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  }if(inside)ctx.fillRect(x,y,1,1);
 }
 if(edge)for(let i=0;i<points.length;i++)flightPixelLine(ctx,points[i],points[(i+1)%points.length],edge);
}
function paintProfileWing(ctx,id,pose,frame,far=false){
 const style=flightStyle(id),base=ITEM_DEFS[id].flight.colors;
 const palettes={bone:[[92,82,71],[166,156,131],[228,218,187]],storm:[[51,68,102],[116,164,199],[217,237,243]]};
 const pal=palettes[style]||base;
 const colors=pal.map(c=>rgb(c.map(v=>Math.round(v*(far?.62:1))))),edge=far?'#13202a':'#17202a';
 const phase=frame/FLIGHT_FRAME_COUNT*Math.PI*2+(far?.5:0),active=pose==='flight'||pose==='lateral';
 const folded=pose==='folded'||pose==='crouch';
 // Ombro e ponta movem-se em tempos distintos: batida curta, com recuperação recolhida.
 const shoulder=active?Math.sin(phase)*.28:0;
 const wrist=active?Math.sin(phase-.55)*.48:0;
 const point=(x,y)=>{
  if(folded){const a=-1.02;const nx=x*.48,ny=y*.62;x=nx*Math.cos(a)-ny*Math.sin(a);y=nx*Math.sin(a)+ny*Math.cos(a);}
  else if(active){
   if(x<-9){const dx=x+9,dy=y+6;x=-9+dx*Math.cos(wrist)-dy*Math.sin(wrist);y=-6+dx*Math.sin(wrist)+dy*Math.cos(wrist);}
   const rx=x*Math.cos(shoulder)-y*Math.sin(shoulder);y=x*Math.sin(shoulder)+y*Math.cos(shoulder);x=rx;
  }
  if(pose==='lateral'){const a=-1.0,rx=x*Math.cos(a)-y*Math.sin(a);y=x*Math.sin(a)+y*Math.cos(a);x=rx;}
  return [Math.round(FLIGHT_ROOT_X+x*(far?.8:1)-(far?1:0)),Math.round(FLIGHT_ROOT_Y+y*(far?.8:1)-(far?3:0))];
 };
 const poly=(pts,c,e=edge)=>flightPixelPoly(ctx,pts.map(p=>point(...p)),c,e);
 const line=(a,b,c)=>flightPixelLine(ctx,point(...a),point(...b),c);
 if(folded){
  const at=(pts)=>pts.map(([x,y])=>[FLIGHT_ROOT_X+x,FLIGHT_ROOT_Y+y]);
  const fill=(pts,c)=>flightPixelPoly(ctx,at(pts),c,edge);
  fill([[-2,-2],[-7,-1],[-9,4],[-8,13],[-5,19],[-2,15],[0,5]],colors[0]);
  fill([[-3,0],[-6,1],[-7,5],[-6,15],[-4,17],[-2,12]],colors[1]);
  fill([[-3,1],[-5,3],[-5,12],[-3,14],[-1,8]],colors[2]);
  flightPixelLine(ctx,[FLIGHT_ROOT_X-6,FLIGHT_ROOT_Y+5],[FLIGHT_ROOT_X-5,FLIGHT_ROOT_Y+12],colors[0]);
  flightPixelLine(ctx,[FLIGHT_ROOT_X-3,FLIGHT_ROOT_Y],[FLIGHT_ROOT_X-2,FLIGHT_ROOT_Y+3],'#cbbb8b');
  return;
 }
 if(style==='cloth'){
  poly([[0,3],[-6,8],[-9,3],[-13,6],[-15,0],[-20,-1],[-24,-11],[-20,-17],[-11,-12],[-4,-5]],colors[0]);
  poly([[-4,-4],[-11,-11],[-20,-15],[-21,-11],[-17,-2],[-14,-4],[-11,2],[-8,0],[-5,5]],colors[1]);
  poly([[-6,-4],[-13,-10],[-20,-13],[-16,-6],[-10,-3]],colors[2],null);
  for(const tip of [[-6,7],[-13,5],[-20,-1],[-23,-11]])line([-6,-6],tip,colors[0]);
  line([-3,-3],[-19,-14],colors[2]);
 }else{
  poly([[0,3],[-7,2],[-14,-6],[-24,-14],[-20,-18],[-9,-12],[-2,-5]],colors[0]);
  const metal=style==='metal',crystal=style==='crystal'||style==='core';
  for(let i=4;i>=0;i--){
   const x=-4-i*3,y=-3-i*2,tx=-9-i*3,ty=11-i*5;
   const pts=metal?[[x+1,y],[x-3,y-3],[tx-3,ty-4],[tx-3,ty],[tx,ty],[tx+2,ty-3]]:
    crystal?[[x+1,y],[x-3,y-3],[tx-3,ty-4],[tx,ty],[tx+3,ty-5]]:
    [[x+1,y],[x-2,y-3],[tx-3,ty-4],[tx-3,ty-1],[tx-1,ty+1],[tx+1,ty],[tx+3,ty-4]];
   poly(pts,colors[1]);
   poly([[x-1,y-1],[tx-2,ty-3],[tx,ty-1],[tx+1,ty-4]],colors[2],null);
   if(crystal)line([x,y],[tx+1,ty-3],colors[0]);
   else if(metal){line([x-2,y],[tx-2,ty-2],colors[0]);line([x-1,y],[x,y],colors[2]);}
   else line([x,y+1],[tx,ty-2],colors[0]);
  }
  poly([[0,2],[-5,-1],[-10,-7],[-19,-13],[-22,-15],[-20,-18],[-12,-13],[-4,-6],[0,-2]],colors[1]);
  line([-3,-3],[-10,-9],colors[2]);line([-10,-9],[-19,-15],colors[2]);
  for(let i=0;i<3;i++)poly([[-4-i*4,-3-i*3],[-8-i*4,-6-i*3],[-9-i*4,-3-i*3],[-5-i*4,-1-i*3]],colors[2],colors[0]);
  if(style==='storm')line([-5,-4],[-16,-10],'#dcf5fc');
  if(style==='core'){line([-3,-3],[-10,-8],'#aff5d5');line([-10,-8],[-18,-12],'#aff5d5');}
 }
 poly([[0,-2],[-3,-3],[-4,0],[-2,3],[0,2]],colors[0]);
 line([-2,-1],[-2,1],style==='core'?'#b7ffe5':'#d4b97c');
}
function flightStyle(id){
 return id===ITEM.CLOTH_WINGS?'cloth':id===ITEM.BONE_WINGS?'bone':id===ITEM.CRYSTAL_WINGS?'crystal':id===ITEM.MECHANICAL_WINGS?'metal':id===ITEM.STORM_WINGS?'storm':'core';
}
function paintProfileJet(ctx,active,frame){
 const dot=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(FLIGHT_ROOT_X+x,FLIGHT_ROOT_Y+y,w,h);};
 // Reservatório curto, carcaça facetada e bocal separado do tanque.
 dot(-13,-2,9,17,'#101823');dot(-12,-3,6,1,'#101823');
 dot(-12,-1,7,14,'#455a6c');dot(-12,0,2,11,'#b7c6cb');dot(-10,0,4,12,'#718491');dot(-6,1,1,11,'#253846');
 dot(-11,-2,5,2,'#d0d6ce');dot(-12,3,7,2,'#25343e');dot(-12,10,7,2,'#25343e');
 dot(-9,5,2,4,'#46bfcd');dot(-9,5,1,2,'#c7f9ed');dot(-7,6,1,3,'#193943');
 dot(-5,1,3,2,'#947449');dot(-5,10,3,2,'#947449');
 dot(-11,13,5,2,'#a39a78');dot(-10,15,4,2,'#162733');dot(-9,16,2,1,'#9ea7a3');
 dot(-11,1,1,1,'#eef0d9');dot(-11,8,1,1,'#e8ddbc');
 if(active){const h=7+[0,1,2,3,2,1,0,1,2,3,4,3,2,1,0,1][frame%16];dot(-10,17,4,h,'#be4a30');dot(-9,17,2,h-1,'#ffac51');dot(-9,17,1,Math.max(2,h-4),'#fff1be');dot(-9,18+h,1,1,'#f0b96a');}
}
function paintCrouchedJet(ctx){
 const dot=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(FLIGHT_ROOT_X+x,FLIGHT_ROOT_Y+y,w,h);};
 // Desenho horizontal próprio: tanque rente às costas, bocal voltado para trás.
 dot(-9,-8,13,8,'#101823');dot(-8,-7,10,6,'#536b7b');dot(-7,-7,8,1,'#b8c8ca');
 dot(-7,-6,8,3,'#7b9098');dot(-7,-3,8,2,'#30434e');
 dot(-5,-7,2,6,'#293b46');dot(0,-7,2,6,'#293b46');
 dot(-3,-5,2,2,'#62c2c7');dot(-3,-5,1,1,'#d2efe4');
 dot(-10,-5,2,3,'#1b2d37');dot(-11,-4,1,1,'#a5b5b7');
 dot(-6,0,2,2,'#876941');dot(1,0,2,2,'#876941');
}
function flightProfileSprite(id,pose,frame){
 const key=id+':'+pose+':'+frame;if(FLIGHT_PROFILE_CACHE.has(key))return FLIGHT_PROFILE_CACHE.get(key);
 const c=makeCanvas(FLIGHT_SPR_SIZE,FLIGHT_SPR_SIZE),ctx=c.getContext('2d');
 if(id===ITEM.JETPACK){if(pose==='crouch')paintCrouchedJet(ctx);else paintProfileJet(ctx,pose==='flight'||pose==='lateral',frame);}
 else{if(pose!=='folded')paintProfileWing(ctx,id,pose,frame,true);paintProfileWing(ctx,id,pose,frame);}
 FLIGHT_PROFILE_CACHE.set(key,c);return c;
}
function drawFlightProfile(ctx,g){
 const p=g.player,gear=equippedFlight(g);if(!gear||g.mount||p.swimming||g.intro?.active)return;
 const pose=p.flightSide?'lateral':p.flying?'flight':p.flightGliding?'glide':'folded';
 const frame=Math.floor((p.visualTime??g.clock??0)*(p.flying?20:5))%FLIGHT_FRAME_COUNT;
 const tilt=p.flightTilt||0;
 ctx.save();ctx.translate(Math.round(p.cx),Math.round(p.y+(p.stepOffset||0)+p.h/2));
 // Ao deitar, recua a fixação em direção ao meio das costas, afastando-a da cabeça.
 ctx.translate(-12*Math.sin(tilt)*p.facing,0);
 ctx.rotate(tilt*p.facing);ctx.scale(p.facing,1);
 if(p.crouching){
  // S deixa o tronco horizontal; o equipamento acompanha a linha das costas.
  const bodyPose=PLAYER_POSES[playerFrame(p)];
  ctx.translate((bodyPose.tx||4)+8-PLAYER_SPR_W/2,(bodyPose.ty||31)+(bodyPose.bob||0)+p.h/2-PLAYER_SPR_H);
  if(gear.item===ITEM.JETPACK&&bodyPose.crawl)ctx.drawImage(flightProfileSprite(gear.item,'crouch',frame),-FLIGHT_ROOT_X,-FLIGHT_ROOT_Y);
  else{ctx.rotate(bodyPose.crawl?Math.PI/2:0);ctx.drawImage(flightProfileSprite(gear.item,'folded',frame),-FLIGHT_ROOT_X, -FLIGHT_ROOT_Y);}
 }else ctx.drawImage(flightProfileSprite(gear.item,pose,frame),-3-FLIGHT_ROOT_X,11-p.h/2-FLIGHT_ROOT_Y);
 ctx.restore();
}
// Ícones próprios, desenhados com o mesmo material das asas usadas pelo jogador.
function flightProfileIcon(id){
 const c=makeCanvas(16,16),ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;
 const sprite=flightProfileSprite(id,'glide',0);
 const pixels=sprite.getContext('2d').getImageData(0,0,sprite.width,sprite.height).data;
 let x0=sprite.width,y0=sprite.height,x1=0,y1=0;
 for(let y=0;y<sprite.height;y++)for(let x=0;x<sprite.width;x++)if(pixels[(y*sprite.width+x)*4+3]){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
 const w=x1-x0+1,h=y1-y0+1,k=Math.min(14/w,14/h),dw=Math.max(1,Math.round(w*k)),dh=Math.max(1,Math.round(h*k));
 ctx.drawImage(sprite,x0,y0,w,h,Math.floor((16-dw)/2),Math.floor((16-dh)/2),dw,dh);
 const data=ctx.getImageData(0,0,16,16).data,cores={},colors=new Map(),rows=[];
 for(let y=0;y<16;y++){let row='';for(let x=0;x<16;x++){const i=(y*16+x)*4;if(data[i+3]<90){row+='.';continue;}const color=[data[i],data[i+1],data[i+2]],key=color.join(',');if(!colors.has(key)){const ch=String.fromCharCode(0x100+colors.size);colors.set(key,ch);cores[ch]=color;}row+=colors.get(key);}rows.push(row);}
 return {cores,pixels:rows};
}
for(const id of [...FLIGHT_WINGS,ITEM.JETPACK])ITEM_ART[id]=flightProfileIcon(id);
for(const id of [...FLIGHT_WINGS,ITEM.JETPACK]){
 const d=ITEM_DEFS[id],r=d.flight;
 const summary=r.jet?'Voo enquanto houver combustível.':isFinite(r.time)?r.time+' s de voo. Recarrega ao pousar; plana ao acabar.':'Voo infinito.';
 d.descricao=summary+' Pulo: subir. Shift: voo lateral. A/D: direção.';
 if(d.bossItem)d.bossHelp=[summary,'Pulo: subir · Shift: voo lateral · A/D: direção'];
}
