'use strict';

// World-seeded sprites, not random animation frames. Cache is bounded so long
// exploration does not retain every tree/rim/occlusion mask ever encountered.
const ORGANIC_TREES={cacheLimit:192};
const organicTreeCache=new Map(),organicTrunks=new WeakMap();
const ORGANIC_LEAVES={
  oak:[[13,30,20],[24,51,26],[39,77,30],[63,110,35],[97,144,49],[151,183,78]],
  birch:[[22,37,22],[40,64,28],[64,95,36],[98,132,47],[139,165,68],[185,201,111]],
  maple:[[49,22,16],[85,32,20],[125,49,22],[168,77,28],[205,113,42],[234,156,65]],
  apple:[[15,34,23],[23,56,30],[40,88,37],[67,119,42],[103,153,59],[153,185,90]],
  blossom:[[37,12,31],[65,17,44],[100,24,62],[142,37,79],[183,62,103],[224,104,142]],
  willow:[[10,35,28],[16,60,42],[29,89,53],[48,118,66],[77,150,81],[131,182,106]],
  jungle:[[8,32,25],[12,57,36],[22,88,48],[38,122,64],[67,157,84],[123,192,113]],
  frostBirch:[[28,44,43],[42,69,62],[67,98,83],[108,140,113],[165,187,157],[224,235,218]],
  acacia:[[27,36,19],[44,58,26],[70,87,33],[102,120,44],[144,157,62],[190,193,101]],
};
function treePixelLine(s,x,y,ex,ey,color){
  const n=Math.ceil(Math.max(Math.abs(ex-x),Math.abs(ey-y)));
  for(let i=0;i<=n;i++){const t=n?i/n:0;s.set(Math.round(lerp(x,ex,t)),Math.round(lerp(y,ey,t)),color);}
}
// A leaf is a tapered blade with a shaded underside and a short lit vein.
// Coherent shapes replace independent noisy pixels / horizontal flecks.
function treeLeaf(s,x,y,angle,length,width,pal,level){
  const dx=Math.cos(angle),dy=Math.sin(angle),ex=x+dx*length,ey=y+dy*length;
  for(let py=Math.floor(Math.min(y,ey)-width);py<=Math.max(y,ey)+width;py++)
    for(let px=Math.floor(Math.min(x,ex)-width);px<=Math.max(x,ex)+width;px++){
      const u=((px-x)*dx+(py-y)*dy)/length,v=-(px-x)*dy+(py-y)*dx;
      if(u<0||u>1||Math.abs(v)>Math.sin(u*Math.PI)*width)continue;
      const shade=v>.65?level-1:v<-.65&&u>.35?level+1:level;
      s.set(px,py,pal[clamp(shade,0,5)]);
    }
  if(length>5)treePixelLine(s,x+dx*length*.35,y+dy*length*.35,x+dx*length*.65,y+dy*length*.65,pal[clamp(level+1,0,5)]);
}
function treeLeafCluster(s,gx,gy,rx,ry,pal,rnd,kind){
  const lobes=[];
  for(let i=0;i<6;i++){
    const a=rnd()*Math.PI*2,bw=rx*(.35+rnd()*.16),bh=ry*(.5+rnd()*.2);
    lobes.push([clamp(gx+Math.cos(a)*rx*.48,bw+6,s.w-bw-7),clamp(gy+Math.sin(a)*ry*.4,bh+6,s.h-bh-12),bw,bh]);
  }
  const sample=(x,y)=>{
    let best=Infinity,light=0;
    for(const [bx,by,bw,bh]of lobes){const dx=(x-bx)/bw,dy=(y-by)/bh,d=dx*dx+dy*dy;
      if(d<best){best=d;light=-dy*.8+dx*.15;}}
    return [best,light];
  };
  const x0=Math.max(3,Math.floor(gx-rx-8)),x1=Math.min(s.w-4,Math.ceil(gx+rx+8));
  const y0=Math.max(3,Math.floor(gy-ry-8)),y1=Math.min(s.h-10,Math.ceil(gy+ry+8));
  // Quiet dark masses give the individual leaf sprays depth and readable gaps.
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
    const [d,light]=sample(x,y);if(d<.87)s.set(x,y,pal[light>.35?3:2]);
  }
  const step=kind==='acacia'?4:5;
  for(let y=y0+2;y<y1;y+=step)for(let x=x0+2;x<x1;x+=step){
    const px=x+(rnd()-.5)*3,py=y+(rnd()-.5)*3,[d,light]=sample(px,py);
    if(d>1||px<7||py<8||rnd()<.08)continue;
    const angle=-Math.PI/2+(px-gx)/rx*.8+Math.sin(py*.18+gx)*.3+(rnd()-.5)*.6;
    const level=clamp(2+Math.round(light)+Math.floor(rnd()*2),2,4);
    const len=kind==='acacia'?3.5:kind==='jungle'?7:5.4;
    treePixelLine(s,px,py+2,px+Math.cos(angle)*len,py+Math.sin(angle)*len,pal[1]);
    for(const side of [-1,1])treeLeaf(s,px,py,angle+side*.7,len*(.8+rnd()*.4),kind==='acacia'?1.4:2.1,pal,level);
    if((kind==='blossom'||kind==='sakura')&&rnd()<.22){s.set(px,py,pal[5]);s.set(px+1,py-1,pal[4]);}
  }
}
function finishOrganicTree(wood,leaves,seed,kind,overlap,flex=.45){
  const woody=wood.finish([24,24,19]),foliage=leaves.finish([12,23,17]);foliage.envFlex=flex;
  const canvas=makeCanvas(wood.w,wood.h),ctx=canvas.getContext('2d');ctx.drawImage(woody,0,0);ctx.drawImage(foliage,0,0);
  return {canvas,woodCanvas:woody,leafCanvas:foliage,overlap,organic:true,seed,kind};
}
function organicBark(sprite,x,y,r,seed,pale=false){
  const palette=pale?[[54,56,45],[93,94,72],[147,145,108],[190,183,139]]:[[29,25,20],[53,43,29],[84,64,40],[121,93,57]];
  for(let py=Math.floor(y-r);py<=y+r;py++)for(let px=Math.floor(x-r);px<=x+r;px++){
    const dx=(px-x)/r,dy=(py-y)/r;if(dx*dx+dy*dy>1)continue;
    const grain=hash2(Math.floor(px/2),Math.floor(py/4),seed),groove=Math.sin(px*.9+Math.sin(py*.16+seed)*1.6);
    let level=dx>.2?2:dx>-.6?1:0;if(groove>.65&&grain>.35)level++;
    if(grain<.13)level--;sprite.set(px,py,palette[clamp(level,0,3)]);
  }
}
function organicBranch(sprite,points,r0,r1,seed,pale=false){
  const [a,b,c]=points,steps=Math.ceil(Math.hypot(c[0]-a[0],c[1]-a[1])*1.6)+1;
  for(let i=0;i<=steps;i++){const t=i/steps,u=1-t;
    organicBark(sprite,u*u*a[0]+2*u*t*b[0]+t*t*c[0],u*u*a[1]+2*u*t*b[1]+t*t*c[1],lerp(r0,r1,t),seed,pale);}
}
function generateOrganicCanopy(seed,kind){
  const rnd=mulberry32(seed),wide=kind==='willow'||kind==='jungle',slender=kind==='birch'||kind==='frostBirch';
  const W=Math.round((slender?84:wide?122:102)+rnd()*26),H=Math.round(94+rnd()*23),cx=Math.floor(W/2);
  const wood=new Sprite(W,H),leaves=new Sprite(W,H),pal=ORGANIC_LEAVES[kind]||ORGANIC_LEAVES.oak;
  const pale=kind==='birch',lean=(rnd()-.5)*13,forkY=H*(.46+rnd()*.08),groups=[];
  organicBranch(wood,[[cx,H-1],[cx-lean*1.2,H*.72],[cx+lean,forkY]],8,4.5,seed,pale);
  // Irregular tiers leave windows of sky between limbs and foliage masses.
  const tiers=3+Math.floor(rnd()*2);
  for(let i=0;i<tiers;i++){
    const q=i/(tiers-1),side=i%2?1:-1,origin=[cx+lean*(.3+q*.5),H*(.76-q*.27)];
    const tip=[clamp(cx+side*(W*(.25+rnd()*.12)) + lean,17,W-18),H*(.64-q*.43)+(rnd()-.5)*9];
    organicBranch(wood,[origin,[origin[0]+side*10,origin[1]+3],tip],4.8-q*1.2,1.4,seed+i,pale);
    groups.push([tip[0],tip[1]-5,slender?16:23+rnd()*7,14+rnd()*5]);
    if(!slender)groups.push([lerp(origin[0],tip[0],.62),lerp(origin[1],tip[1],.62)-7,18,13]);
    const twig=[tip[0]-side*(7+rnd()*10),tip[1]-13-rnd()*7];
    organicBranch(wood,[[lerp(origin[0],tip[0],.65),lerp(origin[1],tip[1],.65)],[twig[0]+side*5,twig[1]+8],twig],2.2,.7,seed+i+10,pale);
    groups.push([twig[0],twig[1]-3,12+rnd()*6,9+rnd()*4]);
  }
  const tip=[cx+lean,17+rnd()*7];
  organicBranch(wood,[[cx+lean,forkY],[cx+lean+8,30],tip],3,1,seed+30,pale);
  groups.push([tip[0],tip[1],19+rnd()*5,12]);
  for(let group=0;group<groups.length;group++){
    const [gx,gy,rx,ry]=groups[group];
    treeLeafCluster(leaves,gx,gy,rx,ry,pal,rnd,kind);
    if((kind==='willow'||kind==='blossom'||kind==='sakura')&&group%2===0){
      for(let k=0;k<3;k++){
        const x=Math.round(gx+(rnd()-.5)*rx),y0=Math.round(gy+ry*.4),len=9+rnd()*18;
        for(let y=y0;y<Math.min(H-9,y0+len);y+=3){
          const xx=x+Math.sin(y*.16+k)*2;
          treePixelLine(leaves,xx,y,xx,y+3,pal[1]);
          treeLeaf(leaves,xx,y,1.1,4,1.2,pal,3);treeLeaf(leaves,xx,y,2.1,3,1,pal,2);
        }
      }
    }
  }
  return finishOrganicTree(wood,leaves,seed,kind,Math.round(H*.66));
}
function generateOrganicAcacia(seed){
  const rnd=mulberry32(seed),W=138+Math.floor(rnd()*17),H=86,cx=Math.floor(W/2);
  const wood=new Sprite(W,H),leaves=new Sprite(W,H),groups=[];
  const lean=(rnd()-.5)*12;
  organicBranch(wood,[[cx,H-1],[cx+lean,H*.68],[cx+lean,43]],5,3,seed);
  for(let i=0;i<5;i++){
    const x=25+i*(W-50)/4+(rnd()-.5)*7,y=23+Math.abs(i-2)*3+(rnd()-.5)*10;
    organicBranch(wood,[[cx+lean,58+rnd()*9],[lerp(cx,x,.7),52+rnd()*5],[x,y+5]],3.1,1,seed+i);
    const tx=x+(rnd()-.5)*15,ty=y-6;
    organicBranch(wood,[[lerp(cx,x,.7),46],[tx,38],[tx,ty]],1.6,.7,seed+i);
    groups.push([x,y,19+rnd()*6,10+rnd()*3],[tx,ty,12,9]);
  }
  groups.sort((a,b)=>a[1]-b[1]);
  for(const [x,y,rx,ry]of groups)treeLeafCluster(leaves,x,y,rx,ry,ORGANIC_LEAVES.acacia,rnd,'acacia');
  return finishOrganicTree(wood,leaves,seed,'acacia',48,.35);
}
function generateOrganicPine(seed,snowy=false){
  const rnd=mulberry32(seed),W=76+Math.floor(rnd()*13),H=113+Math.floor(rnd()*13),cx=Math.floor(W/2);
  const wood=new Sprite(W,H),leaves=new Sprite(W,H),lean=(rnd()-.5)*7;
  const pal=snowy?[[15,36,35],[25,55,52],[39,77,68],[64,105,86],[99,140,113],[151,180,151]]:
    [[13,31,23],[22,48,30],[33,71,37],[53,100,47],[86,136,64],[135,169,88]];
  organicBranch(wood,[[cx,H-1],[cx+lean,H*.6],[cx+lean,10]],5,1,seed);
  const tiers=7+Math.floor(rnd()*2);
  // Paint from the lowest boughs upward so each higher spray overlaps naturally.
  for(let tier=tiers-1;tier>=0;tier--){
    const q=tier/(tiers-1),y=13+q*(H-41),half=6+q*(W*.40-6);
    for(const side of [-1,1]){
      const length=half*(.85+rnd()*.15),drop=5+q*5+rnd()*3,baseX=cx+lean*(1-q);
      organicBranch(wood,[[baseX,y],[baseX+side*length*.4,y+drop],[baseX+side*length,y+drop-3]],1.8, .55,seed+tier);
      for(let k=0;k<=length;k+=1.7){
        const u=k/length,x=baseX+side*k,by=y+drop*Math.sin(u*Math.PI*.6);
        const needle=(1-u)*5+2+rnd()*2;
        // Paired needle fans, with lit upper needles and dark hanging tips.
        for(let j=0;j<3;j++){
          const nx=x+side*(2+j*1.3),ny=by-needle+j*1.8;
          treePixelLine(leaves,x,by+2,nx,ny,pal[2+j]);
          treePixelLine(leaves,x,by,x-side*2,by+needle*.65,pal[1+j%2]);
        }
        treePixelLine(leaves,x,by,x+side*2,by-needle*.65,pal[4]);
        // Broken snow cushions settle on branch tops, not every silhouette edge.
        if(snowy&&u>.12&&u<.9&&Math.sin(u*9+tier*1.7)>.05){
          const sy=Math.round(by-needle*.65-1),thickness=2+(tier%3===0?1:0);
          for(let dx=0;dx<3;dx++)for(let dy=0;dy<thickness;dy++)
            leaves.set(x+side*dx,sy+dy,dy===0?[239,246,245]:dy===1?[204,223,228]:[153,182,195]);
        }
      }
    }
  }
  treePixelLine(leaves,cx+lean,15,cx+lean-1,3,pal[4]);
  for(let y=7;y<18;y+=2){treePixelLine(leaves,cx+lean,y+3,cx+lean-3,y,pal[2]);treePixelLine(leaves,cx+lean,y+3,cx+lean+3,y-1,pal[4]);}
  return finishOrganicTree(wood,leaves,seed,snowy?'snowPine':'pine',Math.round(H*.60),.3);
}
function organicCanopyFor(x,biome,worldSeed=0){
  const seed=Math.floor(hash2(x,biome,worldSeed^0x71a9)*0x7fffffff),key=worldSeed+':'+biome+':'+x;
  let tree=organicTreeCache.get(key);if(tree){organicTreeCache.delete(key);organicTreeCache.set(key,tree);return tree;}
  const h=hash2(x,1,worldSeed^4242);
  if(biome===BIOME.OCEAN)tree=genPalm(seed);
  else if(biome===BIOME.SAKURA)tree=generateOrganicCanopy(seed,'sakura');
  else if(biome===BIOME.SAVANNA)tree=generateOrganicAcacia(seed);
  else if(biome===BIOME.SNOW)tree=h<.75?generateOrganicPine(seed,true):generateOrganicCanopy(seed,'frostBirch');
  else if(biome===BIOME.JUNGLE)tree=h<.84?generateOrganicCanopy(seed,'jungle'):genPalm(seed);
  else if(h<.14)tree=generateOrganicPine(seed);
  else tree=generateOrganicCanopy(seed,h<.44?'oak':h<.56?'birch':h<.72?'maple':h<.80?'apple':h<.94?'blossom':'willow');
  organicTreeCache.set(key,tree);if(organicTreeCache.size>ORGANIC_TREES.cacheLimit)organicTreeCache.delete(organicTreeCache.keys().next().value);
  return tree;
}
// bare = não tem copa por cima (a árvore foi cortada e sobrou um toco): a casca sobe até o
// topo do sprite. Com copa, ela começa abaixo dela, senão aparece casca por cima das folhas.
function organicTrunkFor(canopy,height,bare=false){
  let cache=organicTrunks.get(canopy);if(!cache){cache=new Map();organicTrunks.set(canopy,cache);}
  const key=bare?height+':b':height;
  if(cache.has(key))return cache.get(key);
  const W=40,H=Math.max(T,height),s=new Sprite(W,H),cx=W/2,seed=canopy.seed,start=bare?0:Math.min(H-12,canopy.overlap-3);
  const slender=canopy.kind==='pine'||canopy.kind==='snowPine'||canopy.kind==='acacia';
  for(let y=start;y<H;y++){
    const q=(y-start)/Math.max(1,H-start),bend=Math.sin(q*Math.PI)*Math.sin(q*3.2+seed)*(slender?2:5);
    const root=Math.pow(clamp((q-.7)/.3,0,1),2);
    organicBark(s,cx+bend,y,(slender?4.5:7)+root*(slender?5:8),seed,canopy.kind==='birch');
  }
  // Low, asymmetric root toes stay close to the original collision column.
  for(const [side,length]of [[-1,11+seed%4],[1,9+seed%5]])
    organicBranch(s,[[cx,H-14],[cx+side*6,H-6],[cx+side*length,H-2]],3,1,seed+side,canopy.kind==='birch');
  const out=s.finish([25,23,19]);cache.set(key,out);
  if(cache.size>8)cache.delete(cache.keys().next().value);
  return out;
}
