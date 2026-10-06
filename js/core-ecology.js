'use strict';

// Ecologia do Coração: decorações determinísticas, compatíveis com mundos salvos.
// Os sprites e halos são preparados uma vez; somente a janela visível é percorrida.
const CORE_ECO_THEMES = [
  {dark:'#60302c',mid:'#ba583a',light:'#ffae63',glow:'#ffdd8b',rgb:'255,142,65'},
  {dark:'#263a5e',mid:'#426c9b',light:'#8cc8e8',glow:'#dbf8ff',rgb:'110,190,245'},
  {dark:'#304842',mid:'#648a76',light:'#a6d6ad',glow:'#e5ffe0',rgb:'140,235,188'},
  {dark:'#544232',mid:'#ae8050',light:'#e6bd76',glow:'#fff2bb',rgb:'245,190,95'},
];
const CORE_ECO_NATURAL = new Set([TILE.DEEPSTONE,TILE.BASALT,TILE.MAGMA_STONE,TILE.MAGNETITE,TILE.AMBER,TILE.FOSSIL,TILE.OBSIDIAN]);
function coreEcoSprite(zone,kind,variant) {
  const c=makeCanvas(24,kind==='hang'?36:24),ctx=c.getContext('2d'),p=CORE_ECO_THEMES[zone],rnd=mulberry32(7309+zone*83+variant*119);
  const dot=(x,y,col,w=1,h=1)=>{ctx.fillStyle=col;ctx.fillRect(Math.round(x),Math.round(y),w,h);};
  if(kind==='grass'){
    for(let k=0;k<8;k++){
      const x=3+k*2,height=4+Math.floor(rnd()*8),lean=k%2?1:-1;
      for(let y=0;y<height;y++)dot(x+Math.floor(y/4)*lean,22-y,y>height-3?p.light:y>3?p.mid:p.dark);
      if(k%3===0)dot(x+Math.floor(height/4)*lean,22-height,p.glow);
    }
  }else if(kind==='hang'){
    for(let k=0;k<3;k++){
      const x=5+k*6,len=12+Math.floor(rnd()*19);
      for(let y=0;y<len;y++)dot(x+Math.round(Math.sin(y*.25+k)),y,y%5===0?p.mid:p.dark);
      const end=x+Math.round(Math.sin(len*.25+k));
      dot(end-1,len-2,p.mid,3,4);dot(end,len-1,p.light,1,3);dot(end,len,p.glow);
      for(let y=5;y<len-3;y+=7)dot(x+(k%2?-2:1),y,p.mid,2,2);
    }
  }else if(kind==='fungus'){
    for(const [x,y,r] of [[7,12,5],[16,16,4],[12,8,4]]){
      dot(x,y,p.dark,2,23-y);dot(x,y,p.mid,1,22-y);
      for(let j=0;j<4;j++){const width=(j===0?r-2:j===1?r:r+1);dot(x-width,y+j,p.dark,width*2+2);dot(x-width+1,y+j,p.mid,width*2);}
      dot(x-r+2,y+1,p.light,r);dot(x-1,y+2,p.glow,2);dot(x+2,y+3,p.light);
    }
  }else{
    for(const [x,height,width] of [[5,9,3],[11,18,4],[18,12,3]]){
      for(let y=0;y<height;y++){
        const half=y<4?Math.max(0,Math.floor(y/2)):width;
        dot(x-half,23-height+y,p.dark,half*2+1);dot(x-half+1,23-height+y,p.mid,Math.max(1,half));
        dot(x,23-height+y,y<3?p.glow:p.light);
      }
    }
    dot(3,23,p.dark,18);
  }
  c.envKind='core'+kind[0].toUpperCase()+kind.slice(1);c.envHang=kind==='hang';c.envFlex=kind==='grass'?.25:kind==='hang'?.3:0;
  c.coreZone=zone;c.coreGlow=kind==='grass'?.3:kind==='hang'?.5:.7;
  c.coreColor=p.light.slice(1).match(/../g).map(v=>parseInt(v,16));
  return c;
}
const CORE_ECO_ART = CORE_ECO_THEMES.map((p,z)=>Object.fromEntries(['grass','hang','fungus','crystal'].map(kind=>[kind,Array.from({length:4},(_,i)=>coreEcoSprite(z,kind,i))])));
Object.assign(ENV_HARVEST,{
  coreGrass:{item:ITEM.FIBER,lamina:true,volta:200},
  coreHang:{item:ITEM.FIBER,count:2,lamina:true,volta:260},
  coreFungus:{item:ITEM.GLOW_CAP,volta:300},
  coreCrystal:{item:ITEM.CRYSTAL,volta:420},
});
ENV_STONEY.add('coreCrystal');
{
  const base=environmentEmissionAt;
  environmentEmissionAt=function(world,x,y){
    if(!inCoreBand(world,x,y)||world.getTile(x,y)!==TILE.AIR)return base(world,x,y);
    const sprite=environmentDecoration(world,x,y+1);
    if(sprite?.coreColor&&['coreFungus','coreCrystal'].includes(sprite.envKind))return {level:6,color:sprite.coreColor};
    return base(world,x,y);
  };
}
{
  const base=generateEnvironmentDecoration;
  generateEnvironmentDecoration=function(world,x,y,ceiling=false){
    if(!inCoreBand(world,x,y)||!CORE_ECO_NATURAL.has(world.getTile(x,y)))return base(world,x,y,ceiling);
    const ay=y+(ceiling?1:-1),key=y*world.w+x;
    if(world.getTile(x,ay)!==TILE.AIR||world.hasWater(x,ay)||world.touched?.has(key)||world.touched?.has(ay*world.w+x))return null;
    const h=hash2(x,y,world.seed+8391),zone=coreZoneAt(world,x);
    if(h>(ceiling?.23:.62))return null;
    const kind=ceiling?'hang':h<.32?'grass':zone===CORE_ZONE.OSSARIO||h<.44?'fungus':'crystal';
    const sprite=CORE_ECO_ART[zone][kind][Math.floor(hash2(x,y,world.seed+8392)*4)];
    for(let dy=1;dy<=Math.ceil(sprite.height/T);dy++)for(let dx=-1;dx<=1;dx++){
      const yy=y+(ceiling?dy:-dy);
      if(world.getTile(x+dx,yy)!==TILE.AIR||world.hasWater(x+dx,yy)||world.touched?.has(yy*world.w+x+dx))return null;
    }
    return sprite;
  };
}
const CORE_ECO_GLOWS=CORE_ECO_THEMES.map(p=>{
  const c=makeCanvas(64,64),ctx=c.getContext('2d'),gr=ctx.createRadialGradient(32,32,0,32,32,32);
  gr.addColorStop(0,`rgba(${p.rgb},.24)`);gr.addColorStop(.35,`rgba(${p.rgb},.08)`);gr.addColorStop(1,`rgba(${p.rgb},0)`);
  ctx.fillStyle=gr;ctx.fillRect(0,0,64,64);return c;
});
function coreEcoView(g,ox,oy,z){
  const w=g.world,W=renderer.canvas.width,H=renderer.canvas.height;
  if(!w.coreTop||oy/z+H/z<(w.coreTopMin??Math.min(...w.coreTop))*T)return null;
  return {x0:Math.max(1,Math.floor(ox/z/T)-1),x1:Math.min(w.w-2,Math.ceil((ox+W)/z/T)+1),y0:Math.max(1,Math.floor(oy/z/T)-3),y1:Math.min(w.h-2,Math.ceil((oy+H)/z/T)+3)};
}
function drawCoreEcologyAccents(ctx,g,ox,oy,z){
  const v=coreEcoView(g,ox,oy,z);if(!v||g.intro?.active)return;
  const w=g.world,t=g.weather?.clock??performance.now()/1000;
  ctx.save();ctx.setTransform(z,0,0,z,-ox,-oy);ctx.imageSmoothingEnabled=false;
  let lights=0;
  for(let y=v.y0;y<=v.y1;y++)for(let x=v.x0;x<=v.x1;x++){
    if(!inCoreBand(w,x,y))continue;
    const zone=coreZoneAt(w,x),p=CORE_ECO_THEMES[zone],tile=w.getTile(x,y);
    if(CORE_ECO_NATURAL.has(tile)){
      // Crosta mineral nas bordas naturais, combinando com a vegetação local.
      if(w.getTile(x,y-1)===TILE.AIR&&!w.touched?.has(y*w.w+x)){
        ctx.globalAlpha=.65;ctx.fillStyle=p.dark;ctx.fillRect(x*T,y*T,T,1);
        if(hash2(x,y,w.seed+8394)<.65){ctx.fillStyle=p.mid;ctx.fillRect(x*T+3,y*T,3,1);ctx.fillRect(x*T+10,y*T+1,2,1);}
      }
      for(const hang of [false,true]){
        if(lights>=36)break;
        const sprite=environmentDecoration(w,x,y,hang);if(!sprite?.coreGlow)continue;
        const cx=(x+.5)*T,cy=hang?(y+1)*T+sprite.height*.65:y*T-sprite.height*.5;
        ctx.globalCompositeOperation='lighter';ctx.globalAlpha=sprite.coreGlow*(.8+Math.sin(t*1.3+x+y)*.15);
        ctx.drawImage(CORE_ECO_GLOWS[zone],cx-32,cy-32);ctx.globalCompositeOperation='source-over';lights++;
      }
    }
    // Pontos do ar são ancorados no mundo; nunca reciclam junto ao personagem.
    if(tile!==TILE.AIR||x%4||y%4||hash2(x,y,w.seed+8395)>.42)continue;
    const phase=hash2(x,y,w.seed+8396)*Math.PI*2;
    const px=(x+.5)*T+Math.sin(t*.35+phase)*5,py=(y+.5)*T+Math.sin(t*.27+phase)*4;
    const a=.25+.5*Math.pow((Math.sin(t*.9+phase)+1)/2,3);
    ctx.globalAlpha=a;ctx.fillStyle=p.glow;ctx.fillRect(Math.round(px),Math.round(py),1,1);
    if(a>.65){ctx.globalAlpha=a*.18;ctx.drawImage(CORE_ECO_GLOWS[zone],px-16,py-16,32,32);}
  }
  ctx.restore();
}
const CORE_ECO_RELICS=CORE_ECO_THEMES.map((p,zone)=>{
  const c=makeCanvas(96,96),ctx=c.getContext('2d');ctx.fillStyle=p.dark;
  if(zone===CORE_ZONE.MAQUINARIO){
    ctx.fillRect(20,18,12,78);ctx.fillRect(65,32,9,64);ctx.fillRect(20,18,54,7);
    ctx.fillStyle=p.mid;for(let y=30;y<90;y+=14){ctx.fillRect(23,y,3,5);ctx.fillRect(68,y+6,2,4);}
    ctx.fillRect(35,48,21,3);ctx.fillRect(44,40,3,20);
  }else if(zone===CORE_ZONE.OSSARIO){
    for(let k=0;k<4;k++){
      ctx.fillRect(18+k*17,45-k*6,4,51+k*6);
      ctx.fillRect(21+k*17,40-k*6,13,5);ctx.fillRect(31+k*17,44-k*6,4,10);
    }
    ctx.fillStyle=p.mid;ctx.fillRect(12,91,68,3);
  }else{
    for(const [x,y,width]of [[13,35,13],[37,8,18],[65,49,11]]){
      ctx.beginPath();ctx.moveTo(x,y+10);ctx.lineTo(x+width/2,y);ctx.lineTo(x+width,y+10);ctx.lineTo(x+width,96);ctx.lineTo(x,96);ctx.fill();
      ctx.fillStyle=p.mid;ctx.fillRect(x+3,y+16,2,80-y);ctx.fillStyle=p.dark;
    }
  }
  return c;
});
function drawCoreEcologyBackdrop(ctx,g,vx,vy,vw,vh){
  const w=g.world;if(!w.coreTop||vy+vh<(w.coreTopMin??w.h)*T)return;
  ctx.save();ctx.globalAlpha=.35;
  for(let y=Math.max(1,Math.floor(vy/(8*T))*8);y<(vy+vh)/T+8;y+=8)for(let x=Math.max(1,Math.floor(vx/(8*T))*8);x<Math.min(w.w-1,(vx+vw)/T+8);x+=8){
    if(!inCoreBand(w,x,y)||w.getTile(x,y)!==TILE.AIR||hash2(x,y,w.seed+8397)>.32)continue;
    ctx.drawImage(CORE_ECO_RELICS[coreZoneAt(w,x)],x*T-40,y*T-64);
  }
  ctx.restore();
}
{
  const base=drawCoreBackdrop;
  drawCoreBackdrop=function(ctx,g,vx,vy,vw,vh){drawCoreEcologyBackdrop(ctx,g,vx,vy,vw,vh);base(ctx,g,vx,vy,vw,vh);};
}
{
  const base=drawCoreAccents;
  drawCoreAccents=function(ctx,g,ox,oy,z){base(ctx,g,ox,oy,z);drawCoreEcologyAccents(ctx,g,ox,oy,z);};
}
