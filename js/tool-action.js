'use strict';
// Ciclo normalizado: preparação 0–.38, golpe .38–.58, contato/recuo .58–.72, retorno .72–1.
// onToolImpact({tile,x,y,tool}) é o ponto de integração de áudio, quando existir.
function cancelTool(g) { if(g.toolAction)g.toolAction=null; }
function toolContact(p,tx,ty,tile,size=1) { // size 2: parede de fundo (pincel 2x2)
  const inset=size===1&&(tile===TILE.TRUNK||tile===TILE.STUMP)?4:0;
  const x0=tx*T+inset,x1=(tx+size)*T-inset,y0=ty*T,y1=y0+size*T;
  const ox=p.cx,oy=p.y+p.h*0.6; // altura da mão (agachado o corpo encolhe)
  return {x:clamp(ox,x0,x1),y:clamp(oy,y0,y1)};
}
// wall > 0: o golpe é numa parede de fundo (js/game.js); `tile` é só o material do efeito
function tickTool(g,dt,tx,ty,tile,held,def,wall=0) {
  const p=g.player,c=toolContact(p,tx,ty,tile,wall?2:1);
  if(Math.hypot(c.x-p.cx,c.y-(p.y+p.h*0.6))>toolReachPx(def)){cancelTool(g);g.mining.progress=0;return;} // longe demais para esta ferramenta
  let s=g.toolAction;
  if(s&&(s.tx!==tx||s.ty!==ty||s.tile!==tile||s.wall!==wall||s.item!==held.item||s.slot!==g.selected)){cancelTool(g);g.mining.progress=0;s=null;}
  if(!s){s=g.toolAction={tx,ty,tile,wall,item:held.item,slot:g.selected,kind:wall?def.ferramenta:toolKindFor(def,tile),tier:def.nivel||0,t:0,duration:def.golpe||.5,hit:false,x:c.x,y:c.y};playSfx('swing',p.cx,p.cy,{vol:.6});}
  s.x=c.x;s.y=c.y;s.t+=dt;
  p.facing=c.x<p.cx?-1:c.x>p.cx?1:p.facing;
  if(!s.hit&&s.t>=s.duration*.58){
    s.hit=true;
    g.mining.progress+=(wall?(def.forca||.2):miningSpeed(tile,def))/(wall?WALL_HARDNESS:TILE_DEFS[tile].hardness);
    if(!wall&&hardRockBlocked(tile,def))hardRockHint(g); // rocha endurecida: só a Broca de Quitina (js/beetle-loot.js)
    if(!wall&&hardRockBlocked(tile,def))hardRockHint(g);
    toolDebris(g,s);
    toolImpactFlash(s);
    g.shake=Math.max(g.shake||0,.6+s.tier*.2);
    if(typeof g.onToolImpact==='function')g.onToolImpact({tile,x:s.x,y:s.y,tool:s.kind});
    if(g.mining.progress>=1){if(wall)breakWallBrush(tx,ty);else breakTile(tx,ty);g.mining.progress=0;}
  }
  if(s.t>=s.duration)cancelTool(g);
}
// Cores das lascas: tons variados do material, não uma cor chapada.
function tileChipColor(tile){
  return rgb(shade(TILE_DEFS[tile].color,.62+Math.random()*.55));
}
function toolDebris(g,s){
  const spark=s.kind!=='pa'&&[TILE.STONE,TILE.COAL_ORE,TILE.IRON_ORE].includes(s.tile);
  const wood=[TILE.TRUNK,TILE.STUMP,TILE.PLANKS,TILE.DOOR,TILE.DOOR_OPEN].includes(s.tile);
  const sparks=spark?2+s.tier*2:0;
  for(let i=0;i<14&&g.particles.length<400;i++){
    const life=.22+Math.random()*.25,big=i<3;
    g.particles.push({x:s.x+(Math.random()-.5)*4,y:s.y+(Math.random()-.5)*4,
      vx:-g.player.facing*(15+Math.random()*(s.kind==='pa'?60:95))+(Math.random()-.5)*50,vy:-(s.kind==='pa'?70:25)-Math.random()*130,
      life,maxLife:life,color:tileChipColor(s.tile),w:big?2+(wood?1:0):wood?1+i%3:1,h:big?2:1});
  }
  // Machadada no tronco: a copa lá em cima balança e solta folhas (js/tree-fall.js)
  if (s.tile === TILE.TRUNK) shedLeaves(g, s.tx, s.ty, 4 + Math.floor(Math.random() * 5));
  // Faíscas: ferramentas melhores tiram mais faísca da pedra; rápidas, sem gravidade forte.
  for(let i=0;i<sparks&&g.particles.length<400;i++){
    const life=.10+Math.random()*.12,a=Math.random()*Math.PI*2,v=90+Math.random()*120;
    g.particles.push({x:s.x,y:s.y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-40,gravity:250,life,maxLife:life,color:i%2?'#fff3c0':'#ffc75a',w:1,h:1});
  }
}
// Estouro quando o bloco quebra: pedaços grandes do material, lascas e uma nuvem de poeira.
function spawnBreakBurst(tx,ty,tile,scale=1){
  const cx=(tx+.5)*T,cy=(ty+.5)*T;
  for(let i=0;i<Math.round(14*scale)&&game.particles.length<400;i++){
    const life=.35+Math.random()*.35,big=i<4,a=Math.random()*Math.PI*2,v=40+Math.random()*90;
    game.particles.push({x:cx+Math.cos(a)*5,y:cy+Math.sin(a)*5,vx:Math.cos(a)*v,vy:Math.sin(a)*v-90,
      life,maxLife:life,color:tileChipColor(tile),w:big?4:2+i%2,h:big?3:1+i%2});
  }
  const dust=rgb(shade(TILE_DEFS[tile].color,1.15));
  for(let i=0;i<Math.round(4*scale)&&game.particles.length<400;i++){
    const life=.35+Math.random()*.25;
    game.particles.push({x:cx+(Math.random()-.5)*10,y:cy+(Math.random()-.5)*8,vx:(Math.random()-.5)*30,vy:-10-Math.random()*20,gravity:-15,
      life,maxLife:life,color:dust,w:4,h:4,grow:7,alpha:.55});
  }
}
function toolBodyFrame(g){
  const s=g.toolAction,q=s.t/s.duration,step=q<.38?0:q<.58?1:q<.72?2:3;
  if(g.player.crouching)return PLAYER_ANIMS.crouchTool+step;
  return PLAYER_ANIMS[s.kind==='pa'?'dig':s.kind==='machado'?'chop':'mine']+step;
}
// Retorna coordenadas do cabo e cabeça; o contato final é exato e comum ao dano/efeitos.
function toolGeometry(g, phase){
  const s=g.toolAction,p=g.player,q=clamp(phase === undefined ? s.t/s.duration : phase,0,1),f=p.facing;
  const ox=p.cx,oy=p.y+(p.crouching?15:p.h*0.6)+p.stepOffset; // ombro (engatinhando ele fica bem mais baixo no corpo)
  const reach=Math.hypot(s.x-ox,s.y-oy);
  const hit=Math.atan2(s.y-oy,s.x-ox),back=hit-f*(s.kind==='machado'?1.9:2.3);
  let a,extension;
  if(q<.38){ // preparação: sobe rápido, desacelera lá no alto e "segura" um instante
    const u=q/.38,e=1-Math.pow(1-u,3);
    a=lerp(hit-f*.5,back,e)-f*.14*Math.sin(u*Math.PI);extension=lerp(19,21,e);
  } else if(q<.58){ // golpe: acelera até bater
    const u=(q-.38)/.20,e=u*u*u;
    a=lerp(back,hit,e);extension=lerp(21,reach,e);
  } else if(q<.72){ // contato: a ferramenta quica no bloco e volta amortecida
    const u=(q-.58)/.14,k=Math.sin(u*Math.PI)*(1-u*.4);
    a=hit-f*.24*k;extension=reach-2.5*k;
  } else { // retorno à posição de descanso
    const u=(q-.72)/.28,e=u*u*(3-2*u);
    a=lerp(hit,hit-f*.5,e);extension=lerp(reach,19,e);
  }
  if(s.kind==='pa'){
    // Entrada curta e firme; depois alavanca a pá para levantar a terra.
    if(q<.38){const u=q/.38,e=1-Math.pow(1-u,2);a=hit-f*.25*e;extension=lerp(19,Math.max(8,reach-9),e);}
    else if(q<.58){const u=(q-.38)/.20,e=u*u;a=lerp(hit-f*.25,hit,e);extension=lerp(Math.max(8,reach-9),reach,e);}
    else if(q<.72){const u=(q-.58)/.14;a=hit;extension=reach+Math.sin(u*Math.PI)*1.5;}
    else{const u=(q-.72)/.28;a=hit-f*.75*Math.sin(u*Math.PI/2);extension=lerp(reach,Math.min(18,reach*.6),u);}
  }
  const hx=ox+Math.cos(a)*extension,hy=oy+Math.sin(a)*extension;
  return {ox,oy,hx,hy,a,gx:hx-Math.cos(a)*17,gy:hy-Math.sin(a)*17,f};
}
// Ponto do ícone (16x16, cabo embaixo à esquerda e cabeça em cima à direita) que fica na mão,
// e a escala que leva a cabeça do ícone até a ponta do golpe (17px à frente da mão).
const TOOL_ICON_GRIP=[3.5,12], TOOL_ICON_SCALE=1.6;
function drawToolAction(ctx,g,atlas){
  const v=toolGeometry(g),s=g.toolAction;
  // Rasterized segments: no fractional sprite rotation or smoothing.
  function line(x,y,xx,yy,w,color){ctx.fillStyle=color;const n=Math.ceil(Math.max(Math.abs(xx-x),Math.abs(yy-y)));for(let i=0;i<=n;i++){const u=n?i/n:0;ctx.fillRect(Math.round(lerp(x,xx,u))-Math.floor(w/2),Math.round(lerp(y,yy,u))-Math.floor(w/2),w,w);}}
  const dx=Math.cos(v.a),dy=Math.sin(v.a);
  function armTo(offset,front){
    const x=v.gx+dx*offset,y=v.gy+dy*offset;
    const ex=lerp(v.ox,x,.5)-v.f*2,ey=lerp(v.oy,y,.5)+3;
    line(v.ox,v.oy,ex,ey,5,'#1e161e');line(ex,ey,x,y,4,'#1e161e');
    line(v.ox,v.oy,ex,ey,3,rgb(front?PLAYER_PALETTE.J:PLAYER_PALETTE.j));line(ex,ey,x,y,2,rgb(front?PLAYER_PALETTE.j:PLAYER_PALETTE.k));
  }
  armTo(-4,false); // braço de trás fica atrás da ferramenta
  // A ferramenta é o ícone do próprio item (madeira, pedra, ferro...), girado junto com o golpe.
  // Olhando para a esquerda o ícone é espelhado no eixo do cabo, para a lâmina continuar na frente.
  ctx.save();
  ctx.imageSmoothingEnabled=false;
  ctx.translate(Math.round(v.gx),Math.round(v.gy));
  ctx.rotate(v.a);
  // O machado de emergência bate com duas pontas: gira (e espelha) o ícone para levar ao
  // bloco a que serve — fio de aço na madeira, bico laranja na pedra. As outras
  // ferramentas batem sempre de ponta, com o ícone na diagonal de sempre.
  const tip=s.item===ITEM.EMERGENCY_AXE?EMERGENCY_AXE_TIPS[s.kind]:null;
  if((v.f<0)!==!!tip?.[2])ctx.scale(1,-1);
  ctx.rotate(tip?-Math.atan2(tip[1]-TOOL_ICON_GRIP[1],tip[0]-TOOL_ICON_GRIP[0]):Math.PI/4);
  ctx.scale(TOOL_ICON_SCALE,TOOL_ICON_SCALE);
  ctx.drawImage(atlas,s.item*T,0,T,T,-TOOL_ICON_GRIP[0],-TOOL_ICON_GRIP[1],T,T);
  ctx.restore();
  armTo(0,true);
  for(const offset of [-4,0])line(v.gx+dx*offset,v.gy+dy*offset,v.gx+dx*offset,v.gy+dy*offset,3,playerHandRgb());
}

// Efeitos de contato persistem brevemente mesmo se o bloco acabou de quebrar.
const TOOL_FLASHES=Array.from({length:12},()=>({life:0,x:0,y:0,tx:0,ty:0,size:1,wood:false}));
function toolImpactFlash(s){
  const e=TOOL_FLASHES.find(e=>e.life<=0)||TOOL_FLASHES[0];
  e.life=.18;e.x=s.x;e.y=s.y;e.wood=s.kind==='machado';
  e.size=s.wall?2:1;e.tx=s.tx;e.ty=s.ty; // na parede, tx/ty já é o canto do pincel 2x2
}
function updateToolEffects(dt){for(const e of TOOL_FLASHES)e.life=Math.max(0,e.life-dt);}
// Cor do rastro do golpe conforme o material da ferramenta.
const TOOL_TRAIL=['#ffe2b4','#e3e6e8','#d8f2ff'];
function drawToolEffects(ctx,g){
  ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
  const s=g.toolAction;
  if(s){
    const q=s.t/s.duration;
    if(q>.40&&q<(s.kind==='pa'?1:.80)){
      const head=s.kind==='pa'&&q>.72?q:Math.min(q,.58),tail=Math.max(s.kind==='pa'&&q>.72?.72:.44,head-.09);
      const fade=s.kind==='pa'&&q>.72?Math.sin((q-.72)/.28*Math.PI)*.6:q<.58?Math.min(1,(q-.40)/.06):Math.max(0,1-(q-.58)/.22);
      const tint=s.kind==='pa'?'#e2d0a6':TOOL_TRAIL[clamp(s.tier,0,2)];
      // Rastro em arco seguindo a trajetória real da cabeça; borda de fora mais viva.
      for(let band=0;band<3;band++){
        ctx.beginPath();
        for(let i=0;i<=14;i++){
          const v=toolGeometry(g,lerp(tail,head,i/14));
          const r=band===0?.84:band===1?.95:1.03;
          const x=Math.round(lerp(v.ox,v.hx,r)),y=Math.round(lerp(v.oy,v.hy,r));
          if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
        }
        ctx.strokeStyle=band===2?'#fffaf0':tint;
        ctx.globalAlpha=fade*[.10,.22,.7][band];ctx.lineWidth=[5,3,1][band];ctx.stroke();
      }
    }
  }
  for(const e of TOOL_FLASHES){
    if(e.life<=0)continue;
    const u=1-e.life/.18;
    // O bloco atingido pisca claro por um instante.
    ctx.globalAlpha=(1-u)*(1-u)*.5;ctx.fillStyle='#fff6e0';
    ctx.fillRect(e.tx*T,e.ty*T,e.size*T,e.size*T);
    // Estalo: anel curto + raios saindo do ponto de contato.
    ctx.globalAlpha=(1-u)*.85;ctx.strokeStyle=e.wood?'#f0c98f':'#f4f6e2';ctx.lineWidth=1;
    ctx.beginPath();ctx.arc(e.x,e.y,2+u*7,0,Math.PI*2);ctx.stroke();
    for(let j=0;j<6;j++){
      const a=j*Math.PI*2/6+.35,r=3+u*9,len=4*(1-u);
      ctx.beginPath();ctx.moveTo(Math.round(e.x+Math.cos(a)*r),Math.round(e.y+Math.sin(a)*r));
      ctx.lineTo(Math.round(e.x+Math.cos(a)*(r+len)),Math.round(e.y+Math.sin(a)*(r+len)));ctx.stroke();
    }
  }
  ctx.restore();
}

// Rachaduras em pixel que crescem com o progresso: 4 ramos saindo do meio do bloco, sempre iguais
// para o mesmo bloco (semente = posição). S = 2 na parede de fundo (pincel 2x2).
function drawTileCracks(ctx,tx,ty,S,progress){
  const px=tx*T,py=ty*T,seed=tx*7919+ty*104729,total=Math.floor(clamp(progress,0,1)*30);
  ctx.fillStyle=`rgba(0,0,0,${progress*.35})`;
  ctx.fillRect(px,py,S*T,S*T);
  const dirs=[[1,1],[-1,1],[1,-1],[-1,-1]],pos=dirs.map((d,b)=>[7+(hash2(seed,b,5)<.5?0:1),7+(hash2(seed,b,6)<.5?0:1)]);
  for(let k=0;k<total;k++){
    const b=k%4,[dx,dy]=dirs[b],p=pos[b];
    if(k>=4){ // anda em diagonal, ora no x ora no y, para não sair reta
      const r=hash2(seed,k,7);
      if(r<.45)p[0]+=dx;else if(r<.9)p[1]+=dy;else{p[0]+=dx;p[1]+=dy;}
      p[0]=clamp(p[0],0,T-1);p[1]=clamp(p[1],0,T-1);
    }
    ctx.fillStyle='rgba(24,16,14,.9)';ctx.fillRect(px+p[0]*S,py+p[1]*S,S,S);
    ctx.fillStyle='rgba(255,240,220,.22)';ctx.fillRect(px+(p[0]+1)*S,py+(p[1]+1)*S,S,S); // borda iluminada da fenda
  }
}
