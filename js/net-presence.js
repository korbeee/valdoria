'use strict';
// Estados recebidos a 20 Hz são apresentados no relógio do desenho, sem simular golpes remotos.
function netBlendNumber(a,b,k) { return Number.isFinite(a)&&Number.isFinite(b)?lerp(a,b,k):b??a; }
function netSamplePeer(p,now) {
  const list=p.buf;if(!list.length)return;
  let a=list[0],b=list[list.length-1];
  for(let i=0;i<list.length-1;i++)if(list[i].t<=now&&list[i+1].t>=now){a=list[i];b=list[i+1];break;}
  if(now>=b.t)a=b;
  const k=b.t>a.t?clamp((now-a.t)/(b.t-a.t),0,1):1;
  const s=k<1?a:b,age=NET.worldPaused?0:clamp(now-s.t,0,.12);
  const teleport=Math.hypot(b.x-a.x,b.y-a.y)>8*T;
  p.x=teleport?b.x:netBlendNumber(a.x,b.x,k);p.y=teleport?b.y:netBlendNumber(a.y,b.y,k);
  if(a===b&&!NET.worldPaused){p.x+=(b.vx||0)*age;p.y+=(b.vy||0)*age;}
  for(const key of ['vx','vy'])p[key]=netBlendNumber(a[key],b[key],k)??p[key];
  for(const [key,v]of Object.entries(s.motion||{}))p[key]=v;
  if(a.onGround===b.onGround&&a.crouching===b.crouching&&a.motion?.swimming===b.motion?.swimming)
    for(const key of ['anim','visualTime','swimAnim','flightTilt','jumpAge','landTimer','crouchAge']){
      const value=netBlendNumber(a.motion?.[key],b.motion?.[key],k);if(value!==undefined)p[key]=value;
    }
  if(a===b&&age>0&&list.length>1){
    const previous=list[list.length-2],span=b.t-previous.t;
    if(span>0&&previous.onGround===b.onGround&&previous.crouching===b.crouching)
      for(const key of ['anim','visualTime','swimAnim'])if(Number.isFinite(b.motion?.[key])&&Number.isFinite(previous.motion?.[key]))
        p[key]=b.motion[key]+(b.motion[key]-previous.motion[key])/span*age;
  }
  p.facing=s.f;p.onGround=!!s.onGround;p.crouching=!!s.crouching;p.h=s.h||PLAYER_H;
  p.stepOffset=netBlendNumber(a.s,b.s,k)||0;p.swimTilt=netBlendNumber(a.tl,b.tl,k)||0;
  p.item=s.it;p.frame=s.fr;p.renderAction=s.action;p.renderEquipment=s.equipment;p.actionElapsed=age;
  p.renderPair={a:a.action,b:a===b?null:b.action,k,age,aState:a,bState:b};
}
function netVisualList(list,other,k,age) {
  const byId=new Map((other||[]).filter(q=>q.netVisualId!=null).map(q=>[q.netVisualId,q]));
  return (list||[]).map(q=>{
    const out={...q},next=byId.get(q.netVisualId);
    if(next&&next.state===q.state){
      for(const key of ['x','y','vx','vy','t','age','rot','spin','ang'])if(Number.isFinite(q[key])&&Number.isFinite(next[key]))out[key]=netBlendNumber(q[key],next[key],k);
    }else{
      if(Number.isFinite(q.x))out.x=q.x+(q.vx||0)*age;
      if(Number.isFinite(q.y))out.y=q.y+(q.vy||0)*age+(q.gravity||q.grav||0)*age*age*.5;
      if(Number.isFinite(q.t))out.t=q.t+age;if(Number.isFinite(q.age))out.age=q.age+age;
      if(Number.isFinite(q.rot))out.rot=q.rot+age*10;
      if(Number.isFinite(q.spin))out.spin=q.spin+age*22;
      if(q.state==='fly'&&Number.isFinite(out.vx))out.ang=Math.atan2(out.vy||0,out.vx);
    }
    if(Array.isArray(q.trail)&&q.trail.length){
      out.trail=q.trail.map((point,i)=>{
        const to=next?.trail?.[i];
        if(typeof point==='number')return Number.isFinite(to)?netBlendNumber(point,to,k):point;
        return Array.isArray(point)?point.map((v,j)=>Number.isFinite(to?.[j])?netBlendNumber(v,to[j],k):v):point;
      });
      if(typeof out.trail[0]==='number'){out.trail[0]=out.x;out.trail[1]=out.y;}
      else out.trail[0]=[out.x,out.y];
    }
    return out;
  }).filter(q=>!Number.isFinite(q.life)||!Number.isFinite(q.t)||q.t<q.life);
}
function netVisualIds() {
  const tag=q=>{if(q&&q.netVisualId==null)q.netVisualId=++NET.visualSeq;};
  for(const q of game.arrows||[])tag(q);
  const s=game.trident;if(!s)return;
  tag(s.thrown);for(const key of ['bolts','fx','puddles'])for(const q of s[key]||[])tag(q);
}
const NET_MENU_LABELS={pause:'PAUSA',admin:'ADMIN',bestiary:'BESTIÁRIO',guide:'GUIA',options:'OPÇÕES',controls:'CONTROLES',recipes:'RECEITAS',creator:'PERSONAGEM',dialogue:'CONVERSA',inventory:'MOCHILA',map:'MAPA'};
function netCurrentMenu() {
  if(game.adminOpen)return 'admin';
  if(typeof Bestiary!=='undefined'&&Bestiary.dialog?.open)return 'bestiary';
  if(typeof ItemGuide!=='undefined'&&ItemGuide.dialog?.open)return 'guide';
  if(Menu.root&&!Menu.root.hidden){const key=Menu.current();return NET_MENU_LABELS[key]?key:'pause';}
  if(game.npcOpen)return 'dialogue';if(game.paused)return 'pause';
  if(game.mapUI?.open)return 'map';if(game.inventoryUI?.open)return 'inventory';
  return null;
}
function netPauseVote() {const menu=netCurrentMenu();return !!menu&&menu!=='map'&&menu!=='inventory';}
function netRefreshPause() {
  if(!NET.room)return false;
  if(NET.isHost){
    const paused=NET.peers.size>0&&netPauseVote()&&[...NET.peers.values()].every(p=>p.seen&&p.pauseVote);
    if(paused!==NET.worldPaused){NET.worldPaused=paused;netRelay({k:'pause',paused});}
    return paused;
  }
  return NET.worldPaused&&netPauseVote();
}
function netUpdateWorld(base,dt) {
  if(!NET.room||game.intro?.active)return base(dt);
  if(netRefreshPause())return;
  const blocked=netPauseVote(),flags={paused:game.paused,adminOpen:game.adminOpen,npcOpen:game.npcOpen};
  const keys=input.keys,mouse=input.mouse;
  game.paused=game.adminOpen=game.npcOpen=false;
  if(blocked){input.keys=new Set();input.mouse={...mouse,left:false,right:false,rawLeft:false};}
  try{return base(dt);}finally{Object.assign(game,flags);input.keys=keys;input.mouse=mouse;}
}
// Miniaturas do layout dos painéis, com os mesmos atlas usados pela interface.
// São montadas uma vez; não capturam nem transmitem o inventário de ninguém.
const NET_MENU_THUMBNAILS=new Map();
function netMenuThumbnail(menu) {
  if(NET_MENU_THUMBNAILS.has(menu))return NET_MENU_THUMBNAILS.get(menu);
  const label=NET_MENU_LABELS[menu];if(!label)return null;
  const c=makeCanvas(112,82),g=c.getContext('2d');g.imageSmoothingEnabled=false;
  const rect=(x,y,w,h,color)=>{g.fillStyle=color;g.fillRect(x,y,w,h);};
  const text=(value,x,y,color='#c9c1ad',size=5)=>{g.font=size+'px monospace';g.fillStyle=color;g.fillText(value,x,y);};
  const line=(x,y,w,color='#78848b')=>rect(x,y,w,1,color);
  const panel=(x,y,w,h)=>{rect(x,y,w,h,'#090c10');rect(x+1,y+1,w-2,h-2,'#303944');rect(x+2,y+2,w-4,h-4,'#1c222b');};
  const item=(id,x,y,size=8)=>{if(renderer.tex?.itemAtlas&&Number.isInteger(id))g.drawImage(renderer.tex.itemAtlas,id*T,0,T,T,x,y,size,size);};
  const icons=[ITEM.WOOD,ITEM.STONE,ITEM.TORCH,ITEM.IRON,ITEM.CHEST,ITEM.DOOR,ITEM.BRICK,ITEM.COAL];
  const slot=(x,y,size,id,selected=false)=>{panel(x,y,size,size);if(selected){rect(x,y,size,1,'#e4af53');rect(x,y,1,size,'#e4af53');rect(x+size-1,y,1,size,'#e4af53');rect(x,y+size-1,size,1,'#e4af53');}if(id!=null)item(id,x+2,y+2,size-4);};
  const button=(caption,x,y,w,active=false)=>{panel(x,y,w,7);rect(x+2,y+2,w-4,3,active?'#58432b':'#333e49');text(caption,x+4,y+5,active?'#ffd27a':'#d2d6d3',4);};
  const creature=(kind,x,y,w,h)=>{
    const img=wildlifeSprite(kind,0).normal,k=Math.min((w-2)/img.width,(h-2)/img.height);
    const dw=Math.max(1,Math.round(img.width*k)),dh=Math.max(1,Math.round(img.height*k));
    g.drawImage(img,x+Math.floor((w-dw)/2),y+h-dh-1,dw,dh);
  };
  panel(0,0,112,82);rect(3,3,106,12,'#29323b');line(3,15,106,'#080b0f');
  text(label,7,11,'#ffd27a',6);panel(101,6,6,6);text('×',102,11,'#c9c1ad',6);
  if(menu==='inventory'){
    text('INVENTÁRIO',37,22,'#d7c9a8',4);line(6,24,100,'#48525c');
    for(let row=0;row<5;row++)for(let col=0;col<10;col++)slot(6+col*10,27+row*9,9,row===0&&col<8?icons[col]:null,row===0&&col===0);
    text('MOCHILA',7,77,'#aab3b8',4);for(let i=0;i<4;i++)button(['↗','▤','↑↓','×'][i],70+i*9,73,8);
  }else if(menu==='bestiary'||menu==='guide'||menu==='recipes'){
    const animals=menu==='bestiary';
    for(let i=0;i<4;i++){text((animals?['TODOS','CHEFES','FAUNA','ÁGUA']:['TODOS','BLOCOS','ARMAS','CURA'])[i],6+i*26,22,i===0?'#ffd27a':'#83909c',4);}
    line(5,24,25,'#dfa84f');
    for(let i=0;i<12;i++){
      const x=5+i%4*16,y=28+Math.floor(i/4)*15;slot(x,y,14,null,i===0);
      if(animals)creature(['bear','tiger','forest_deer','forest_boar'][i%4],x+2,y+2,10,9);
      else item(icons[i%icons.length],x+3,y+2,8);
      line(x+3,y+12,8,'#626d78');
    }
    panel(71,28,35,27);rect(74,31,29,21,animals?'#272330':'#232c35');
    if(animals)creature('bear',74,31,29,21);else item(ITEM.CHEST,82,34,16);
    text(animals?'PATRIARCA':'ONDE ACHAR',74,61,'#ffd27a',4);
    line(74,65,27);line(74,68,23,'#53616b');line(74,71,25,'#53616b');
    slot(74,74,6,ITEM.WOOD);slot(83,74,6,ITEM.IRON);slot(92,74,6,ITEM.STONE);
    rect(108,28,1,47,'#4f5b65');rect(108,29,1,11,'#c0c5c4');
  }else if(menu==='admin'){
    text('MUNDO / JOGADORES',7,22,'#92a4ae',4);
    button('DIA',6,26,30);button('NOITE',41,26,30);button('CHUVA',76,26,30);
    panel(6,37,100,8);text('BUSCAR ITEM...',10,43,'#7e8c97',4);
    for(let i=0;i<20;i++)slot(6+i%10*10,48+Math.floor(i/10)*11,10,icons[i%8],i===0);
    button('GERAR ITEM',6,73,48,true);button('TELEPORTE',58,73,48);
  }else if(menu==='pause'){
    text('VALDORIA',36,24,'#8595a0',5);
    ['CONTINUAR','DIÁRIO','PERSONAGEM','COMO JOGAR','OPÇÕES','SERVIDOR','MENU PRINCIPAL'].forEach((name,i)=>button(name,21,28+i*7,70,i===0));
  }else if(menu==='controls'){
    text('MOVIMENTO',9,25,'#aeb8c1',4);
    button('W',24,30,9,true);button('A',13,39,9);button('S',24,39,9);button('D',35,39,9);
    text('ATACAR',57,27,'#aeb8c1',4);panel(68,31,15,20);rect(71,34,4,7,'#dfa84f');rect(76,34,4,7,'#657786');
    button('ESPAÇO  PULAR',9,57,94);button('E  MOCHILA',9,66,44);button('ESC  MENU',57,66,46);
  }else if(menu==='options'){
    ['MÚSICA','EFEITOS','ZOOM','INTERFACE'].forEach((name,i)=>{
      text(name,9,26+i*12,'#c9c1ad',5);rect(61,22+i*12,40,3,'#111820');rect(61,22+i*12,26-i*4,3,'#b48445');rect(85-i*4,21+i*12,3,5,'#e0cda5');
    });button('VOLTAR',7,72,98);
  }else if(menu==='map'){
    rect(6,20,100,52,'#1b3143');rect(6,41,100,26,'#284433');rect(6,48,100,22,'#594739');
    for(let i=0;i<25;i++){const y=34+Math.round(Math.sin(i*.7)*4);rect(6+i*4,y,4,48-y,'#63784d');rect(6+i*4,y+3,4,6,'#9b7750');}
    rect(56,39,2,4,'#ffd27a');line(48,42,18,'#ffd27a');text('MAPA DA ILHA',31,78,'#aab4bc',4);
  }else if(menu==='creator'){
    panel(7,21,35,52);
    if(renderer.playerAtlas)g.drawImage(renderer.playerAtlas,0,0,PLAYER_SPR_W,PLAYER_SPR_H,12,28,24,36);
    ['CABELO','ROUPA','CALÇAS','SAPATOS'].forEach((name,i)=>{text(name,48,28+i*12,'#aeb8c1',4);for(let j=0;j<6;j++)rect(48+j*9,31+i*12,7,5,['#ad6b43','#313e54','#6d7a54','#dbb078','#843f48','#899ca4'][j]);});
  }else{
    panel(6,22,100,30);text('CONVERSA',12,31,'#ffd27a',5);line(12,36,75);line(12,40,62);line(12,44,71);
    button('CONTINUAR',6,59,100,true);button('VOLTAR',6,70,100);
  }
  NET_MENU_THUMBNAILS.set(menu,c);return c;
}
function netDrawMenuBadge(ctx,p,menu) {
  if(p===player)return;
  const thumbnail=netMenuThumbnail(menu);if(!thumbnail)return;
  const x=Math.round(p.x+p.w+9),y=Math.round(p.y-22);
  ctx.save();ctx.imageSmoothingEnabled=false;
  ctx.fillStyle='#00000055';ctx.fillRect(x+3,y+4,84,62);
  // Pequena ponta da moldura liga a janela ao jogador, sem cobrir seu corpo.
  ctx.fillStyle='#080b10';ctx.beginPath();ctx.moveTo(x,y+27);ctx.lineTo(x-6,y+32);ctx.lineTo(x,y+37);ctx.fill();
  ctx.fillStyle='#65727e';ctx.beginPath();ctx.moveTo(x,y+29);ctx.lineTo(x-4,y+32);ctx.lineTo(x,y+35);ctx.fill();
  ctx.drawImage(thumbnail,x,y,84,62);ctx.restore();
}
