'use strict';

function buildTigerHabitat(w,rnd,x0){
  const W=TIGER_ARENA.W,floor=flattenSurface(w,x0-12,x0+W+12),denX=x0+25;
  const h={version:1,x0:x0-12,x1:x0+W+12,floor,denX,shelter:[x0+12,x0+35],pond:[x0+51,x0+65],stream:[x0+66,x0+80],trees:[],prey:[]};
  // Solo contínuo e três camadas de margem: não há degraus altos nem água sob a cama.
  for(let x=h.x0;x<=h.x1;x++){
    w.biome[x]=BIOME.FOREST;
    const old=w.surface[x];
    for(let y=Math.max(1,Math.min(old,floor)-29);y<=floor+9;y++){
      const tile=y<floor?TILE.AIR:y===floor?TILE.GRASS:y<floor+4?TILE.DIRT:TILE.STONE;
      sSet(w,x,y,tile,y<floor?WALL.NONE:WALL.DIRT);w.water[y*w.w+x]=0;
    }
    w.surface[x]=floor;
  }
  // Rocha larga, inclinada sobre o abrigo raso; a entrada direita tem oito blocos de altura.
  for(let x=h.shelter[0];x<=h.shelter[1];x++){
    const k=(x-h.shelter[0])/(h.shelter[1]-h.shelter[0]),roof=floor-10+Math.round(k*2);
    const thick=1+Math.round(3*Math.sqrt(Math.max(0,1-(k*2-1)**2)));
    for(let y=roof-thick;y<=roof;y++)sSet(w,x,y,y===roof-thick?TILE.MOSS_STONE:TILE.STONE,WALL.STONE);
    for(let y=roof+1;y<floor;y++)if(x<denX+4-Math.floor((floor-y)/3))w.walls[y*w.w+x]=WALL.STONE;
    w.surface[x]=roof-thick;
  }
  // Encosta rochosa sustenta a parte traseira do abrigo; a boca abre para a clareira.
  for(let x=h.shelter[0];x<h.denX-4;x++){
    const up=Math.min(10,1+x-h.shelter[0]);
    for(let y=floor-up;y<floor;y++)sSet(w,x,y,y===floor-up?TILE.MOSS_STONE:TILE.STONE,WALL.STONE);
  }
  // Rochas baixas nas laterais da clareira dão apoio e uma janela de atordoamento ao bote.
  for(const [cx,width] of [[x0+4,4],[x0+39,4],[x0+70,3]])for(let dx=0;dx<width;dx++){
    const up=dx===1||dx===width-2?2:1;
    for(let y=floor-up;y<floor;y++)sSet(w,cx+dx,y,TILE.MOSS_STONE);
  }
  // Lagoa fechada com fundo impermeável e entrada rasa dos dois lados.
  for(let x=h.pond[0];x<=h.pond[1];x++){
    const edge=Math.min(x-h.pond[0],h.pond[1]-x),depth=Math.min(4,1+edge);
    for(let y=floor;y<floor+depth;y++){sSet(w,x,y,TILE.AIR,WALL.NONE);w.water[y*w.w+x]=WATER_MAX;}
    sSet(w,x,floor+depth,TILE.MUD);sSet(w,x,floor+depth+1,TILE.STONE);w.surface[x]=floor+depth;
  }
  // Riacho raso ligado à lagoa, com uma nascente entre pedras na margem direita.
  for(let x=h.stream[0];x<=h.stream[1];x++){
    sSet(w,x,floor,TILE.AIR,WALL.NONE);w.water[floor*w.w+x]=WATER_MAX;
    sSet(w,x,floor+1,TILE.MUD);sSet(w,x,floor+2,TILE.STONE);w.surface[x]=floor+1;
  }
  sSet(w,h.stream[1]+1,floor,TILE.MOSS_STONE);
  h.spring={x:h.stream[1]-2,y:floor-3};
  for(let y=h.spring.y;y<=floor;y++){sSet(w,h.spring.x,y,TILE.AIR,WALL.STONE);w.water[y*w.w+h.spring.x]=WATER_FALL;}
  for(let x=h.spring.x+1;x<=h.stream[1]+2;x++)for(let y=floor-2;y<floor;y++)sSet(w,x,y,TILE.MOSS_STONE);
  w.waterBand=[Math.min(w.waterBand?.[0]??floor,h.spring.y),Math.max(w.waterBand?.[1]??floor,floor+4)];
  // Árvores reais com copa orgânica; troncos são atravessáveis, como no resto da floresta.
  for(const offset of [-10,-3,6,16,29,37,45,69,83,89]){
    const x=x0+offset;if(x>h.x1||x<2)continue;
    const ground=(x>=h.shelter[0]&&x<=h.shelter[1])?w.surface[x]:floor;
    const height=9+Math.floor(rnd()*6);for(let y=ground-height;y<ground;y++)if(w.getTile(x,y)===TILE.AIR)sSet(w,x,y,TILE.TRUNK);
    h.trees.push({x,ground,height});
  }
  for(const [kind,x] of [['forest_deer',x0-4],['forest_boar',x0+46],['forest_deer',x0+85]])h.prey.push({kind,x:(x+.5)*T,y:floor*T});
  const den={x:(denX+.5)*T,y:floor*T,habitat:h};w.tigerDens.push(den);
  w.tigerArena={x0:x0+8,x1:x0+W-8,floor,mid:denX,habitat:h};
  return storyTigerRoad(w,rnd,x0,W,w.tigerArena);
}

const TIGER_HABITAT_ART=new WeakMap();
function tigerHabitatArt(w,h){
  if(TIGER_HABITAT_ART.has(h))return TIGER_HABITAT_ART.get(h);
  const width=(h.x1-h.x0+1)*T,height=32*T,c=makeCanvas(width,height),ctx=c.getContext('2d'),base=28*T;
  const rnd=mulberry32(w.seed^h.denX^0x719e);
  const px=(x,y,col)=>{ctx.fillStyle=col;ctx.fillRect(Math.round(x),Math.round(y),1,1);};
  const rect=(x,y,ww,hh,col)=>{ctx.fillStyle=col;ctx.fillRect(Math.round(x),Math.round(y),ww,hh);};
  const tileX=(x)=>h.x0+x/T,wet=(x)=>{const tx=tileX(x);return tx>=h.pond[0]-1&&tx<=h.stream[1]+3;};
  const inShelter=(x)=>{const tx=tileX(x);return tx>=h.shelter[0]-1&&tx<=h.shelter[1]+1;};
  // Feixes de luz que atravessam a copa sobre a clareira (suaves: o tom do dia vem da luz do mundo).
  for(const tx of [h.x0+8,h.denX+14,h.pond[0]+2,h.x1-10]){
    const x=(tx-h.x0)*T,g=ctx.createLinearGradient(0,0,0,base);
    g.addColorStop(0,'rgba(255,238,170,0)');g.addColorStop(.25,'rgba(255,238,170,.10)');g.addColorStop(.75,'rgba(255,238,170,.05)');g.addColorStop(1,'rgba(255,238,170,0)');
    ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+26,0);ctx.lineTo(x-34,base);ctx.lineTo(x-74,base);ctx.closePath();ctx.fill();
  }
  // Rochas cobertas de musgo: luz de cima à esquerda, borda irregular e musgo no topo.
  const boulder=(cx,rx,ry,seed)=>{
    const stone=['#1d2321','#2c3431','#414a45','#59635a','#778270'],moss=['#2c4528','#42632e','#5d8140'];
    for(let y=-ry;y<=0;y++)for(let x=-rx;x<=rx;x++){
      const d=(x/rx)**2+(y/ry)**2;if(d>1)continue;
      const n=hash2(x,y,seed);if(d>.8&&n>.62)continue;
      const lit=-(y/ry)*.75-(x/rx)*.3+(n-.5)*.35;
      if(y/ry<-.4&&hash2(x,y,seed+9)>.3-(-y/ry-.4)*.5){px(cx+x,base+y,moss[lit>.5?2:lit>0?1:0]);continue;}
      px(cx+x,base+y,stone[lit>.7?4:lit>.3?3:lit>-.15?2:lit>-.5?1:0]);
    }
    for(let i=0;i<3;i++)px(cx+(hash2(i,seed,3)-.5)*rx,base-ry*.5*hash2(i,seed,4),stone[0]); // rachaduras
  };
  for(const tx of [h.x0+5,h.x0+33,h.x0+49,h.x0+75,h.x0+87]){const x=(tx-h.x0)*T+rnd()*10;if(!wet(x)&&!inShelter(x))boulder(x,9+Math.floor(rnd()*9),5+Math.floor(rnd()*5),Math.floor(rnd()*9999));}
  // Samambaias de verdade: folhas em arco com folíolos dos dois lados, três tons.
  const fern=(x,size,tone)=>{
    const pal=[['#2a4d2c','#3f7236','#5e9a45'],['#335a30','#4d8640','#74b252'],['#3b6a35','#5a9a46','#88c45f']][tone];
    const n=5+Math.floor(rnd()*3);
    for(let k=0;k<n;k++){
      const a=(-1+2*(k+.5)/n)*1.1+(rnd()-.5)*.25,L=size*(.7+rnd()*.35),side=Math.sign(a)||1,droop=L*.55*Math.abs(a);
      for(let s=1;s<=L;s++){
        const t=s/L,ex=x+Math.sin(a)*s*.85+side*droop*t*t,ey=base-Math.cos(a)*s*.95+droop*t*t*.8;
        px(ex,ey,pal[0]);
        if(s>2&&s%2===0){const ll=Math.max(1,Math.round((1-t*.8)*size*.22));for(let j=1;j<=ll;j++){px(ex-j,ey+j*.45,pal[1]);px(ex+j,ey+j*.45,pal[j>1?2:1]);}}
      }
    }
  };
  for(let i=0;i<84;i++){
    const x=rnd()*width;if(wet(x))continue;
    const near=Math.abs(tileX(x)-h.denX)<8,size=near?8+rnd()*8:15+rnd()*18;
    fern(x,size,i%3);
  }
  // Taboas e juncos na beira da lagoa e do riacho.
  for(let i=0;i<22;i++){
    const tx=rnd()<.55?h.pond[0]-1.2+rnd()*2.6:rnd()<.5?h.pond[1]-1.4+rnd()*2.6:h.stream[0]+rnd()*(h.stream[1]-h.stream[0]);
    const x=(tx-h.x0)*T,tall=14+rnd()*16,lean=(rnd()-.5)*.35;
    for(let s=0;s<tall;s++)px(x+lean*s*.4,base-s,s<tall*.5?'#4d5f2a':'#6d7f38');
    if(i%2===0){const hx=x+lean*tall*.4;rect(hx-1,base-tall-4,2,6,'#5a3720');rect(hx-1,base-tall-5,2,1,'#3a2314');px(hx,base-tall-6,'#8a8a4a');}
    for(const sd of [-1,1])for(let s=0;s<tall*.55;s++)px(x+sd*(s*.35),base-s*.9,s>tall*.4?'#8aa04a':'#58702f');
  }
  // Flores pequenas no capim.
  for(let i=0;i<30;i++){
    const x=rnd()*width;if(wet(x)||inShelter(x))continue;
    const hgt=3+Math.floor(rnd()*4),col=['#e9ddf7','#f2cd4d','#dc6d8e','#ffffff','#a98be0'][i%5];
    for(let s=0;s<hgt;s++)px(x,base-s,'#456b36');
    px(x-1,base-hgt,col);px(x+1,base-hgt,col);px(x,base-hgt-1,col);px(x,base-hgt+1,col);px(x,base-hgt,'#f6dc7a');
  }
  // Arbustos de folhas pequenas escondem parcialmente a entrada, sem criar colisões.
  for(const tx of [h.shelter[1],h.shelter[1]+2]){
    const bx=(tx-h.x0)*T;
    for(let y=-35;y<0;y++)for(let x=-22;x<22;x++)if((x/22)**2+((y+12)/24)**2<1&&hash2(x,y,w.seed+tx)>.14){
      rect(bx+x,base+y,2,2,['#29432b','#375b30','#50733a','#648342'][Math.floor(hash2(x,y,w.seed+tx+1)*4)]);
    }
  }
  // Cama do tigre: montinho de terra batida, folhas secas, tufos de pelo listrado e ossos de caças antigas.
  const bed=(h.denX-h.x0+.5)*T,soil=['#2a2217','#3e3220','#58442a','#745a35'];
  for(let y=-9;y<=0;y++)for(let x=-72;x<=72;x++){
    const d=(x/72)**2+(y/9.5)**2;if(d>1)continue;
    const n=hash2(x,y,w.seed+7),lit=-(y/9)*.5+(n-.5)*.7-Math.abs(x/72)*.3;
    px(bed+x,base+y,soil[lit>.35?3:lit>0?2:lit>-.3?1:0]);
  }
  for(let i=0;i<120;i++){
    const x=bed+(rnd()-.5)*136*(1-rnd()*rnd()),y=base-1-rnd()*8,col=['#6b5331','#927044','#b48b4e','#4b482c','#8a4a24','#a8672c'][i%6],d=rnd()<.5?1:-1;
    px(x,y,col);px(x+d,y-1,col);px(x+2*d,y-1,col);if(i%3===0)px(x+3*d,y-2,col);
  }
  for(let i=0;i<14;i++){ // pelo laranja com listras escuras
    const x=bed+(rnd()-.5)*90,y=base-2-rnd()*6,d=rnd()<.5?1:-1;
    for(let s=0;s<6;s++)px(x+d*s,y-s*.5,s%3===1?'#241711':s>3?'#ee9d48':'#cc7a2b');
  }
  const bone=(x,y,len,ang)=>{
    const dx=Math.cos(ang),dy=Math.sin(ang);
    for(let s=0;s<len;s++)px(x+dx*s,y+dy*s,s<2||s>len-3?'#efe6cf':'#cfc3a2');
    for(const e of [0,len]){px(x+dx*e+dy,y+dy*e-dx,'#efe6cf');px(x+dx*e-dy,y+dy*e+dx,'#d8ccae');}
    px(x+dx*len*.5,y+dy*len*.5+1,'#8d8264');
  };
  bone(bed-74,base-2,11,-.12);bone(bed-62,base-4,8,.5);bone(bed+78,base-3,12,.1);bone(bed+90,base-2,7,-.4);
  const skull=['.####.','######','#dd#dd','.####.','..tt..'];
  for(const [sx,flip] of [[bed+66,1],[bed-82,-1]])skull.forEach((row,y)=>[...row].forEach((ch,x)=>{ // caveira meio enterrada na cama
    if(ch==='.')return;px(sx+(flip>0?x:5-x),base-6+y,ch==='d'?'#2a2217':ch==='t'?'#b3a688':y<2?'#ece3cb':'#d2c7a6');
  }));
  for(const rx0 of [bed-34,bed+22]){ // costelas: coluna e arcos finos
    for(let s2=0;s2<22;s2++)px(rx0+s2,base-2,'#bfb393');
    for(let r=0;r<5;r++)for(let s2=0;s2<=6;s2++)px(rx0+2+r*4+Math.sin(s2/6*Math.PI)*1.6,base-2-s2*.8,s2<5?'#e2d8bd':'#c3b799');
  }
  TIGER_HABITAT_ART.set(h,c);return c;
}
function drawTigerHabitatBackdrop(ctx,g,vx,vy,vw,vh){
  for(const den of g.world.tigerDens||[]){const h=den.habitat;if(!h||h.x1*T<vx||h.x0*T>vx+vw||(h.floor+4)*T<vy||(h.floor-32)*T>vy+vh)continue;
    ctx.drawImage(tigerHabitatArt(g.world,h),h.x0*T,(h.floor-28)*T);
  }
}
function drawTigerHabitatDetails(ctx,g){
  const w=g.world;
  for(const den of w.tigerDens||[]){const h=den.habitat;if(!h||Math.abs(g.player.cx-den.x)>110*T)continue;
    // Trilha amassada e pegadas alternadas no chão, sem bloquear a circulação.
    for(let i=0;i<14;i++){
      const x=(h.denX+6+i*1.3)*T,y=h.floor*T-2-(i%2)*2;if(w.getTile(Math.floor(x/T),h.floor)===TILE.AIR)continue;
      ctx.fillStyle='#55432d';ctx.fillRect(x-5,y,10,2);ctx.fillStyle='#302a20';ctx.fillRect(x-2,y-2,4,2);for(let j=0;j<3;j++)ctx.fillRect(x-3+j*2,y-4,1,1);
    }
  }
}


// Marcas de garra nos troncos: fazem parte do desenho do tronco (chamadas pelo renderer logo depois
// de pintar o tronco), então ficam ATRÁS do personagem e acompanham a luz do mundo.
const TIGER_MARKS=new WeakMap();
function tigerTreeMarks(world){
  let m=TIGER_MARKS.get(world);if(m)return m;
  m=new Map();
  for(const den of world.tigerDens||[]){const hab=den.habitat;if(!hab)continue;
    for(const tr of hab.trees){
      if(Math.abs(tr.x-hab.denX)>26)continue;
      const r=hash2(tr.x,tr.ground,0x7a1);
      m.set(tr.x,{n:3+(r>.55?1:0),side:r>.4?1:-1,up:2.2+r*1.6,seed:Math.floor(r*9999),fresh:hash2(tr.x,7,0x7a2)>.5});
    }
  }
  TIGER_MARKS.set(world,m);return m;
}
function drawTrunkMarks(ctx,world,x,top,bottom,tree){
  const mark=world.tigerDens?.length?tigerTreeMarks(world).get(x):null;
  if(!mark)return;
  const Hh=(bottom-top+1)*T,start=Math.min(Hh-12,tree.overlap-3),slender=tree.kind==='pine'||tree.kind==='snowPine'||tree.kind==='acacia';
  const upPx=mark.up*T+10,yy=Hh-upPx,q=(yy-start)/Math.max(1,Hh-start);
  if(q<.2||q>.95)return;
  const bend=Math.sin(q*Math.PI)*Math.sin(q*3.2+tree.seed)*(slender?2:5),half=(slender?4.5:7)-1.5;
  const cx=x*T+T/2+bend,y0=top*T+yy,n=mark.n,len=26+(mark.seed%6),tilt=mark.side*3;
  const wood=mark.fresh?['#f5e3b5','#e0c283','#b98e52']:['#d6bd8c','#b99a66','#8d7048'],dark=mark.fresh?'rgba(28,18,10,.9)':'rgba(34,24,16,.75)';
  const px=(xx,yy2,col)=>{ctx.fillStyle=col;ctx.fillRect(Math.round(xx),Math.round(yy2),1,1);};
  for(let i=0;i<n;i++){
    const off=(i-(n-1)/2)*((half*1.6)/Math.max(1,n-1)+1.1),L=len-Math.abs(i-(n-1)/2)*3+((mark.seed>>i)&3);
    for(let s=0;s<L;s++){
      const t=s/L,sx=cx+off+tilt*t+Math.sin(t*3+i)*.5,sy=y0+s+Math.abs(i-(n-1)/2)*1.5;
      if(Math.abs(sx-cx)>half)continue;
      px(sx-1,sy,dark);                                   // borda rasgada, mais escura
      px(sx+(t<.45?2:1),sy,'rgba(20,12,6,.55)');
      px(sx,sy,t<.25?wood[0]:t<.7?wood[1]:wood[2]);        // madeira clara exposta, apagando na ponta
      if(t<.45)px(sx+1,sy,wood[1]);                         // o sulco é mais largo perto de onde a garra entrou
      if(t<.5&&s%3===0)px(sx+(mark.side>0?1:-1)*2,sy-1,'rgba(214,168,98,.8)'); // lasca levantada
    }
  }
  // lascas de casca no pé da árvore
  const gy=(bottom+1)*T;
  for(let i=0;i<7;i++){const r=hash2(x,i,0x7a3),lx=cx+(r-.5)*26,ly=gy-1-((r*13)%1)*2;ctx.fillStyle=i%3===0?'#c9a566':i%3===1?'#6e4a2c':'#3d2a1a';ctx.fillRect(Math.round(lx),Math.round(ly),i%2?2:1,1);}
}

// Presas reais nas clareiras. Cervos aproveitam a animação existente; javalis têm corpo robusto e presas.
WILDLIFE.tiger.name='Tigre da Floresta, Dente de Âmbar';WILDLIFE.tiger.biome=BIOME.FOREST;
WILDLIFE.forest_deer={...WILDLIFE.sika,name:'Cervo da floresta',biome:BIOME.FOREST};
WILD_PALETTES.forest_deer=WILD_PALETTES.sika;
WILDLIFE.forest_boar={name:'Javali',biome:BIOME.FOREST,hp:24,speed:48,w:30,h:20,drops:[[ITEM.MEAT,2,4],[ITEM.LEATHER,1,2]],shape:'forest_boar',color:'#70513b'};
WILD_SIZES.forest_boar=[42,30];WILD_PALETTES.forest_boar=[[32,25,23],[62,43,32],[99,69,45],[139,103,66],[197,169,118]];
SHAPE_HOOKS.forest_boar={paint(s,pal,f){
  const phase=f*Math.PI/2,bob=f<4?Math.round(Math.sin(phase)):0;
  for(const [x,p] of [[11,0],[27,Math.PI]]){const step=f<4?Math.round(Math.sin(phase+p)*2):0;seg(s,x,21+bob,x+step,27,3,pal[1]);seg(s,x+step,27,x+step+3,27,2,pal[0]);}
  for(let y=8;y<=22;y++)for(let x=6;x<=31;x++)if(((x-18)/14)**2+((y-15-bob)/8)**2<1)s.set(x,y,y<12?pal[3]:y>19?pal[1]:pal[2]);
  for(let x=8;x<28;x+=3)seg(s,x,8+bob,x-2,5+bob,1,pal[0]);
  for(let y=11;y<23;y++)for(let x=27;x<37;x++)s.set(x,y,pal[y<16?2:1]);
  seg(s,29,12,27,7,3,pal[1]);seg(s,34,13,35,8,3,pal[2]);seg(s,34,19,40,20,4,pal[1]);
  seg(s,36,22,39,18,1,[230,218,183]);s.set(34,14,[224,196,130]);s.set(35,14,pal[0]);seg(s,5,16,2,12,1,pal[1]);
}};
function spawnTigerHabitatPrey(g){
  for(const den of g.world.tigerDens||[])for(const s of den.habitat?.prey||[]){const m=new Wildlife(s.kind,s.x,s.y);m.x=s.x-m.w/2;m.y=s.y-m.h-.01;if(!m.collides(g.world,m.x,m.y)){m.habitatPrey=true;m.keep=true;g.mobs.push(m);}}
}
