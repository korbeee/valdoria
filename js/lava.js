'use strict';

// Lava compartilha o solver, o nado e as molas da água, mantendo seu volume e calor.
function ensureLava(w) {
  if(w.lava)return;
  w.lava=new Uint8Array(w.tiles.length);w.lavaActive=new Set();w.lavaFlow=new Map();
  for(let i=0;i<w.tiles.length;i++)if(w.tiles[i]===TILE.LAVA)w.lava[i]=WATER_MAX;
  for(let i=0;i<w.lava.length;i++)if(w.lava[i]) {
    const x=i%w.w;
    if((i+w.w<w.lava.length&&!SOLID[w.tiles[i+w.w]]&&!w.lava[i+w.w])||
      (x>0&&w.tiles[i-1]===TILE.AIR)||(x<w.w-1&&w.tiles[i+1]===TILE.AIR))w.lavaActive.add(i);
  }
}
World.prototype.lavaLevel=function(x,y){if(!this.inBounds(x,y))return 0;return this.lava?this.lava[y*this.w+x]:(this.getTile(x,y)===TILE.LAVA?WATER_MAX:0);};
World.prototype.hasLava=function(x,y){return this.lavaLevel(x,y)>0;};
World.prototype.lavaAtPx=function(x,y){const tx=Math.floor(x/T),ty=Math.floor(y/T),v=this.lavaLevel(tx,ty);return v>0&&y>=(ty+1)*T-v*T/WATER_MAX;};
World.prototype.wakeLava=function(x,y){if(!this.lava)return;for(const [dx,dy] of [[0,0],[-1,0],[1,0],[0,-1],[0,1]])if(this.inBounds(x+dx,y+dy)){const i=(y+dy)*this.w+x+dx;if(this.lava[i])this.lavaActive.add(i);}};
World.prototype.setLavaLevel=function(x,y,v){
  if(!this.inBounds(x,y))return;ensureLava(this);const i=y*this.w+x;
  this.lava[i]=clamp(v,0,WATER_MAX);
  if(v>0)this.tiles[i]=TILE.LAVA;else if(this.tiles[i]===TILE.LAVA)this.tiles[i]=TILE.AIR;
  this.wakeLava(x,y);this.waterLightDirty=true;
};
const lavaSetTile=World.prototype.setTile;
World.prototype.setTile=function(x,y,t){
  lavaSetTile.call(this,x,y,t);
  if(this.lava&&this.inBounds(x,y)){this.lava[y*this.w+x]=t===TILE.LAVA?WATER_MAX:0;this.wakeLava(x,y);}
};
function lavaWaterView(w){
  ensureLava(w);
  const view=w._lavaView??=Object.create(w);
  view.water=w.lava;view.waterActive=w.lavaActive;view.waterFlow=w.lavaFlow;
  view._isLavaView=true;
  view.wakeWater=(x,y)=>{if(w.inBounds(x,y))w.lavaActive.add(y*w.w+x);w.wakeLava(x,y);};
  return view;
}
function lavaSubmersion(w,b){return bodySubmersion(lavaWaterView(w),b);}
function lavaEffects(g){
  if(!g.lavaEffects||g.lavaEffects.sourceWorld!==g.world) {
    g.lavaEffects=Object.assign(Object.create(g),{sourceWorld:g.world,lavaFluid:true,waves:new Map(),waterBlobs:[],splashColumns:[],ripples:[],rainRings:[],pourAcc:new Map(),shake:0});
  }
  g.lavaEffects.world=lavaWaterView(g.world);return g.lavaEffects;
}
function updateLava(g,dt){
  const w=g.world;ensureLava(w);
  g.lavaAcc=Math.min(.2,(g.lavaAcc||0)+dt);
  while(g.lavaAcc>=WATER_STEP){g.lavaAcc-=WATER_STEP;w.stepWater({levels:w.lava,active:w.lavaActive,flow:w.lavaFlow,
    blocked:i=>w.water[i]>0||(w.tiles[i]!==TILE.AIR&&w.tiles[i]!==TILE.LAVA),
    changed:(i,v)=>{if(v)w.tiles[i]=TILE.LAVA;else if(w.tiles[i]===TILE.LAVA)w.tiles[i]=TILE.AIR;}
  });}
  const fx=lavaEffects(g),p=g.player,inside=!g.adminFly&&lavaSubmersion(w,p)>.15;
  if(inside&&!g.wasInLava&&Math.abs(p.vy)>140)splashAt(fx,p.cx,Math.floor(p.cy/T),Math.min(1.8,Math.abs(p.vy)/420));
  if(!inside&&g.wasInLava){const s=fx.world.waterSurfacePx(Math.floor(p.cx/T),Math.floor((p.y+p.h+4)/T));if(s!=null)waveImpulse(fx,p.cx,s,35,8);}
  g.wasInLava=inside;
  if(inside){const current=waterCurrentAt(fx.world,p.cx,p.y,p.y+p.h);if(current)p.moveX(current*dt*clamp(lavaSubmersion(w,p)*1.4,0,1),w);}
  updateWaterWaves(fx,dt);g.shake=Math.max(g.shake||0,fx.shake||0);fx.shake=0;
  for(let i=fx.ripples.length-1;i>=0;i--)if((fx.ripples[i].t+=dt)>=fx.ripples[i].life)fx.ripples.splice(i,1);
  // Contato com água também funciona fora do Coração, ao transportar lava para a superfície.
  if((g.lavaContactTimer=(g.lavaContactTimer??0)-dt)<=0){
    g.lavaContactTimer=.25;const px=Math.floor(p.cx/T),py=Math.floor(p.cy/T);
    for(let y=Math.max(1,py-30);y<Math.min(w.h-1,py+31);y++)for(let x=Math.max(1,px-40);x<Math.min(w.w-1,px+41);x++){
      const i=y*w.w+x;if(!w.lava[i])continue;
      const wet=[i-w.w,i-1,i+1,i+w.w].find(j=>w.water[j]>0);
      if(wet===undefined)continue;
      if(w.water[wet]!==WATER_FALL)w.water[wet]=Math.max(0,w.water[wet]-6);
      w.waterLightDirty=true;w.wakeWater(wet%w.w,Math.floor(wet/w.w));w.setTile(x,y,TILE.OBSIDIAN);
      coreSteamPuff(g,(x+.5)*T,(y+1)*T,8,120);playSfx('coreHiss',(x+.5)*T,y*T);
    }
  }
}

// O fundo sai em faixas; só a superfície perturbada precisa de recorte por ondas.
function drawLavaRun(ctx,w,x,y,x1,frame){
  if(w.lavaLevel(x,y)!==WATER_MAX||!w.hasLava(x,y-1)){TILE_DRAW[TILE.LAVA](ctx,w,x,y,frame);return 1;}
  let run=1,limit=Math.min(16-(x&15),x1-x+1);
  while(run<limit&&w.lavaLevel(x+run,y)===WATER_MAX&&w.hasLava(x+run,y-1))run++;
  ctx.drawImage(LAVA_ART.body,(x&15)*T,frame*LAVA_H+(y&15)*T,run*T,T,x*T,y*T,run*T,T);
  return run;
}
TILE_DRAW[TILE.LAVA]=(ctx,w,x,y,frame)=>{
  const level=w.lavaLevel(x,y);if(!level)return;
  const f=frame??Math.floor(performance.now()/150)%LAVA_FRAMES,top=!w.hasLava(x,y-1),sx=(x&15)*T,sy=f*LAVA_H+(y&15)*T;
  if(!top&&level===WATER_MAX){ctx.drawImage(LAVA_ART.body,sx,sy,T,T,x*T,y*T,T,T);return;}
  const fx=top&&typeof game!=='undefined'&&game.world===w?lavaEffects(game):null;
  const waves=top&&fx?waterWaveSlices(fx,x,y):null,slope=top?waterSlopeSlices(lavaWaterView(w),x,y,level):null;
  const base=(y+1)*T-level*T/WATER_MAX;
  if(!waves&&!slope){
    const h=level*T/WATER_MAX;ctx.drawImage(LAVA_ART.body,sx,sy+T-h,T,h,x*T,base,T,h);
    if(top)ctx.drawImage(LAVA_ART.surface,sx,f*T,T,Math.min(5,h),x*T,base,T,Math.min(5,h));
    return;
  }
  ctx.save();ctx.beginPath();let minTop=y*T;
  for(let k=0;k<WAVE.per;k++){
    const sw=T/WAVE.per,yy=Math.round((y+1)*T-(slope?slope[k]:level*T/WATER_MAX)+(waves?waves[k]:0)),height=(y+1)*T-yy;
    if(height>0){ctx.rect(x*T+k*sw,yy,sw,height);minTop=Math.min(minTop,yy);}
  }
  ctx.clip();
  ctx.drawImage(LAVA_ART.body,sx,sy,T,T,x*T,y*T,T,T);
  if(minTop<y*T)ctx.drawImage(LAVA_ART.body,sx,sy,T,1,x*T,minTop,T,y*T-minTop);
  if(top)for(let k=0;k<WAVE.per;k++){
    const sw=T/WAVE.per,yy=Math.round((y+1)*T-(slope?slope[k]:level*T/WATER_MAX)+(waves?waves[k]:0));
    ctx.drawImage(LAVA_ART.surface,sx+k*sw,f*T,sw,5,x*T+k*sw,yy,sw,5);
  }
  ctx.restore();
};
function drawLavaSplashes(ctx,g){if(g.lavaEffects)drawSplashColumns(ctx,lavaEffects(g));}

// Balde metálico: as rotinas de coleta/despejo são as mesmas da água.
ITEM.IRON_BUCKET=Math.max(...Object.values(ITEM))+1;ITEM.IRON_BUCKET_WATER=ITEM.IRON_BUCKET+1;
defItem(ITEM.IRON_BUCKET,{name:'Balde de ferro',balde:'metal',maxStack:1,descricao:'Botão direito: coleta água ou lava. Despeje o conteúdo em um espaço livre.'});
defItem(ITEM.IRON_BUCKET_WATER,{name:'Balde de ferro com água',balde:'metalAgua',maxStack:1});
defItem(ITEM.BUCKET_LAVA,{name:'Balde de ferro com lava',balde:'lava',maxStack:1});
const metalPalette={o:[32,36,44],d:[71,83,96],m:[127,144,159],l:[200,216,225],i:[64,76,90],I:[226,236,239]};
ITEM_ART[ITEM.IRON_BUCKET]={cores:metalPalette,pixels:ITEM_ART[ITEM.BUCKET].pixels.slice()};
for(const [id,c1,c2] of [[ITEM.IRON_BUCKET_WATER,[150,212,242],[70,140,200]],[ITEM.BUCKET_LAVA,[255,237,115],[255,100,25]]]){
 const pixels=ITEM_ART[ITEM.BUCKET_WATER].pixels.slice();ITEM_ART[id]={cores:{...metalPalette,w:c1,W:c2},pixels};
}
RECIPES.push({nome:'Balde de ferro',estacao:'anvil',ingredientes:[[ITEM.METAL_BAR,3]],resultado:{item:ITEM.IRON_BUCKET,quantidade:1}});
const metalBaseBucket=useBucket;
useBucket=function(g,tx,ty,inRange){
 const slot=g.inventory.slots[g.selected],w=g.world;
 if(!slot||![ITEM.IRON_BUCKET,ITEM.IRON_BUCKET_WATER,ITEM.BUCKET_LAVA].includes(slot.item))return metalBaseBucket(g,tx,ty,inRange);
 if(!inRange){toast('Longe demais.');return;}ensureLava(w);
 if(slot.item===ITEM.IRON_BUCKET){
   const lavaCell=w.hasLava(tx,ty)?[tx,ty]:!w.hasWater(tx,ty)&&w.hasLava(tx,ty+1)?[tx,ty+1]:null;
   const lava=!!lavaCell,cell=lavaCell||bucketWaterCell(w,tx,ty);
   if(!cell){toast('Clique na água ou na lava para encher o balde.');return;}
   const view=lava?lavaWaterView(w):w;
   if(!bucketScoop(view,...cell)){toast('Líquido raso demais para encher o balde.');return;}
   if(lava)syncLavaCells(w);
   slot.item=lava?ITEM.BUCKET_LAVA:ITEM.IRON_BUCKET_WATER;
   playSfx(lava?'coreHiss':'splash',(cell[0]+.5)*T,cell[1]*T,{power:.5});return;
 }
 const lava=slot.item===ITEM.BUCKET_LAVA;
 if(w.isSolid(tx,ty)||(!lava&&w.hasLava(tx,ty))||(lava&&w.getTile(tx,ty)!==TILE.AIR&&w.getTile(tx,ty)!==TILE.LAVA)){toast('Não dá para despejar aqui.');return;}
 if(lava&&w.hasWater(tx,ty)){w.water[ty*w.w+tx]=0;w.setTile(tx,ty,TILE.OBSIDIAN);w.wakeWater(tx,ty);coreSteamPuff(g,(tx+.5)*T,ty*T,10,120);}
 else {
   const view=lava?lavaWaterView(w):w;
   if(!bucketPour(view,tx,ty)){toast('Não cabe mais líquido aqui.');return;}
   if(lava)syncLavaCells(w);
 }
 slot.item=ITEM.IRON_BUCKET;playSfx(lava?'coreSpit':'splash',(tx+.5)*T,ty*T,{power:.7});
};
// Só sincroniza as células acordadas pela operação do balde, sem percorrer o mar de lava.
function syncLavaCells(w){for(const i of w.lavaActive){if(w.lava[i])w.tiles[i]=TILE.LAVA;else if(w.tiles[i]===TILE.LAVA)w.tiles[i]=TILE.AIR;}w.waterLightDirty=true;}
