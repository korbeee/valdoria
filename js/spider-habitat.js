// =====================================================================================
//  NINHO DA FIANDEIRA
// =====================================================================================
// A galeria da mina abandonada, tomada pela aranha. A caixa jogável é a mesma de sempre
// (teto reto para ela andar, chão reto, plataformas de mão única), mas tudo que se vê foi
// refeito: teto de caverna irregular, teias de verdade (pixel a pixel, com buracos, fios
// soltos e orvalho), casulos que balançam, ovos que pulsam, ruínas da mina, fungos que
// brilham. Nada de imagem chapada: as camadas são transparentes e o fundo é a parede real.
'use strict';

// Plataformas de seda usam as mesmas colisões de mão única das plataformas existentes.
TILE.SILK_LEDGE=Math.max(...Object.values(TILE))+1;
defTile(TILE.SILK_LEDGE,{name:'Prateleira de seda',solid:false,plataforma:true,hardness:.2,drop:ITEM.SILK,opacity:1,color:[165,176,165]});
// Fio grosso trançado, rede frouxa embaixo, fios pingando e as pontas amarradas na parede
TILE_DRAW[TILE.SILK_LEDGE]=(ctx,w,x,y)=>{
  const px=x*T,py=y*T,L=w.getTile(x-1,y)===TILE.SILK_LEDGE,R=w.getTile(x+1,y)===TILE.SILK_LEDGE,h=hash2(x,y,31);
  ctx.fillStyle='#eef2e4';ctx.fillRect(px,py,T,1);
  ctx.fillStyle='#cdd6c6';ctx.fillRect(px,py+1,T,1);
  ctx.fillStyle='#98aaa0';ctx.fillRect(px,py+2,T,1);
  ctx.fillStyle='#5d746c';ctx.fillRect(px,py+3,T,1);
  for(let i=1;i<T;i+=4){ctx.fillStyle='#f7f9ef';ctx.fillRect(px+i,py,2,1);ctx.fillStyle='#738a81';ctx.fillRect(px+i+1,py+3,1,1);}
  for(let i=0;i<T;i+=4){const d=((i>>2)+x)&1;ctx.fillStyle='#82a095';ctx.fillRect(px+i,py+4,1,1+d);ctx.fillRect(px+i+1,py+5+d,2,1);ctx.fillRect(px+i+3,py+4,1,1+d);}
  if(h<.55){const fx=px+3+Math.floor(h*20),len=3+Math.floor(h*14);ctx.fillStyle='#a9bab0';ctx.fillRect(fx,py+6,1,len);ctx.fillStyle='#e9f1e2';ctx.fillRect(fx,py+6+len,1,1);}
  if(!L){LairArt.line(ctx,px,py,px-5,py-5,'rgba(214,224,208,.85)');LairArt.line(ctx,px,py+1,px-4,py-2,'rgba(150,172,162,.7)');}
  if(!R){LairArt.line(ctx,px+T-1,py,px+T+4,py-5,'rgba(214,224,208,.85)');LairArt.line(ctx,px+T-1,py+1,px+T+3,py-2,'rgba(150,172,162,.7)');}
};
TILE.NEST_GLOW_CAP=Math.max(...Object.values(TILE))+1;
defTile(TILE.NEST_GLOW_CAP,{...TILE_DEFS[TILE.GLOW_CAP],name:'Cogumelo do ninho',light:13});
MATERIAL_TEX[TILE.NEST_GLOW_CAP]=MATERIAL_TEX[TILE.GLOW_CAP];

// Teia de canto: o desenho acompanha a parede onde ela gruda (leque no canto, fios saindo da
// parede, ou fios soltos quando não há onde grudar), em vez de um adesivo igual em todo lugar.
const COBWEB_SPRITES=new Map();
function cobwebSprite(mask,variant){
  const key=mask*4+variant,hit=COBWEB_SPRITES.get(key);if(hit)return hit;
  const c=makeCanvas(T,T),p=c.getContext('2d'),rnd=mulberry32(key*977+13),A=LairArt;
  const Lw=mask&1,Rw=mask&2,Uw=mask&4,Dw=mask&8,S='rgba(228,236,226,.88)',F='rgba(186,200,192,.62)';
  const fan=(ax,ay,sx,sy,spread)=>{
    const ends=[];
    for(let i=0;i<5;i++){const a=(i/4)*spread+(rnd()-.5)*.16;ends.push([ax+sx*Math.cos(a)*(T-1),ay+sy*Math.sin(a)*(T-1)]);A.line(p,ax,ay,ends[i][0],ends[i][1],S);}
    for(let k=1;k<=3;k++){const f=k/3.4;for(let i=0;i<4;i++){if(rnd()<.12)continue;const [a,b]=ends[i],[d,e]=ends[i+1];A.line(p,ax+(a-ax)*f,ay+(b-ay)*f,ax+(d-ax)*f,ay+(e-ay)*f,F);}}
  };
  const ax=Lw?0:Rw?T-1:-1,ay=Uw?0:Dw?T-1:-1;
  if(ax>=0&&ay>=0)fan(ax,ay,ax===0?1:-1,ay===0?1:-1,Math.PI/2);
  else if(ax>=0)fan(ax,Math.round(T/2+(variant-1.5)*2),ax===0?1:-1,1,Math.PI);          // da parede para o lado de dentro
  else if(ay>=0)fan(Math.round(T/2+(variant-1.5)*2),ay,1,ay===0?1:-1,Math.PI);
  else{ // fios soltos com um nó no meio
    for(let i=0;i<4;i++){const a=i*Math.PI/4+rnd()*.3;A.line(p,T/2-Math.cos(a)*7,T/2-Math.sin(a)*7,T/2+Math.cos(a)*7,T/2+Math.sin(a)*7,i%2?F:S);}
    A.px(p,T/2,T/2,'#ffffff');
  }
  COBWEB_SPRITES.set(key,c);return c;
}
TILE_DRAW[TILE.COBWEB]=(ctx,w,x,y)=>{
  const m=(w.isSolid(x-1,y)?1:0)|(w.isSolid(x+1,y)?2:0)|(w.isSolid(x,y-1)?4:0)|(w.isSolid(x,y+1)?8:0);
  ctx.drawImage(cobwebSprite(m,Math.floor(hash2(x,y,5)*4)),x*T,y*T);
};

function buildSpiderHabitat(w,nest){
  const [x0,y0,x1,last]=nest.bounds,floor=last+1,mid=Math.round((x0+x1)/2),side=nest.entrance.x<mid?-1:1;
  const h={version:2,side,floor,anchors:[],cocoons:[],eggs:[]};nest.habitat=h;
  for(let y=y0;y<floor;y++)for(let x=x0;x<=x1;x++){
    const i=y*w.w+x,t=w.tiles[i];w.walls[i]=WALL.STONE;
    if(t===TILE.CARVED_BEAM||t===TILE.LANTERN||t===TILE.TORCH)w.tiles[i]=TILE.AIR;
    else if(t===TILE.PLATFORM||t===TILE.PLANKS)w.tiles[i]=TILE.SILK_LEDGE;
  }
  // Focos naturais no chão e no berçário; a seda permanece legível durante o combate.
  for(const x of [x0+2,mid-12,mid-5,mid+5,mid+12,x1-2])sSet(w,x,floor-1,TILE.NEST_GLOW_CAP,WALL.STONE);
  const nurseryX=side<0?x1-5:x0+5;
  for(const dx of [-2,2])sSet(w,nurseryX+dx,y0+5,TILE.NEST_GLOW_CAP,WALL.STONE);
  for(const dx of [-3,3])sSet(w,mid+dx,floor-10,TILE.NEST_GLOW_CAP,WALL.STONE);
  // Teias reais (prendem e atrasam) só nas bordas e nos cantos do teto. O centro mantém uma
  // faixa livre para perseguir e esquivar.
  for(const x of [x0,x1])for(let y=y0+1;y<floor-2;y+=2)if(w.getTile(x,y)===TILE.AIR)sSet(w,x,y,TILE.COBWEB,WALL.STONE);
  for(const [cx,sx] of [[x0,1],[x1,-1]])for(let dy=0;dy<3;dy++)for(let dx=0;dx<3-dy;dx++)if(w.getTile(cx+sx*dx,y0+dy)===TILE.AIR)sSet(w,cx+sx*dx,y0+dy,TILE.COBWEB,WALL.STONE);
  for(let x=x0+3;x<x1-2;x+=7)h.anchors.push({x:(x+.5)*T,y:(y0+1)*T});
  for(let i=0;i<7;i++)h.cocoons.push({x:(side<0?x1-2-i*1.35:x0+2+i*1.35)*T,y:(y0+2+(i%3)*.7)*T,len:14+i%3*7,size:7+i%4*2});
  for(let i=0;i<9;i++)h.eggs.push({x:(nurseryX-3+i*.7)*T,y:(y0+6)*T-5,size:4+i%3});
  // Os vestígios da expedição continuam acessíveis, agora presos nos bolsões de seda.
  for(const cell of nest.shaft){const [x,y,t]=cell;if(t===TILE.PLANKS){cell[2]=TILE.MOSS_STONE;sSet(w,x,y,TILE.MOSS_STONE,WALL.STONE);}else if(t===TILE.CARVED_BEAM){cell[2]=TILE.AIR;sSet(w,x,y,TILE.AIR,WALL.STONE);}else w.walls[y*w.w+x]=WALL.STONE;}
  for(let y=nest.entrance.y-5;y<nest.entrance.y;y++)for(let x=nest.entrance.x-2;x<=nest.entrance.x+2;x++){
    const t=w.getTile(x,y);if(t===TILE.CARVED_BEAM||t===TILE.PLANKS)sSet(w,x,y,TILE.MOSS_STONE);
  }
}

function spiderHabitatMaterial(w,x,y,t){
  if(t!==TILE.BEDROCK)return t;
  for(const n of w.spiderNests||[]){if(!n.habitat)continue;const [a,b,c,d]=n.bounds;if(x>=a-3&&x<=c+3&&y>=b-3&&y<=d+4)return (y===d+1||y===b-1)&&(x*7+y*11)%9<3?TILE.MOSS_STONE:TILE.STONE;}
  return t;
}

// ---------------------------------------------------------------- arte (camadas transparentes)
function lairOrbWeb(c,cx,cy,rx,ry,rnd,dew){
  const A=LairArt,rays=11+Math.floor(rnd()*5),pts=[],a0=rnd()*6.28,col=(a)=>`rgba(224,233,224,${a})`;
  for(let i=0;i<rays;i++){
    const a=a0+i*Math.PI*2/rays+(rnd()-.5)*.28,len=.78+rnd()*.38;
    pts.push([Math.cos(a)*rx*len,Math.sin(a)*ry*len]);
    A.line(c,cx,cy,cx+pts[i][0],cy+pts[i][1],col(.5));
  }
  const rings=9;
  for(let k=1;k<=rings;k++){
    const f=Math.pow(k/rings,1.12);
    for(let i=0;i<rays;i++){
      if(rnd()<.05+.12*k/rings)continue;                                        // trechos rompidos
      const [a,b]=pts[i],[d,e]=pts[(i+1)%rays],mx=(a+d)/2*f*.92,my=(b+e)/2*f*.92+1; // a linha cede um pouco
      const al=.78-.4*f;
      A.line(c,cx+a*f,cy+b*f,cx+mx,cy+my,col(al));A.line(c,cx+mx,cy+my,cx+d*f,cy+e*f,col(al));
      if(dew&&rnd()<.03)dew.push([cx+mx,cy+my]);
    }
  }
  for(let i=0;i<14;i++){const a=i*.9,r=1+i*.35;A.px(c,cx+Math.cos(a)*r,cy+Math.sin(a)*r*.8,col(.95));}
}
function lairCocoonSprite(size,len,seed,figure){
  const A=LairArt,wd=size*2+4,ht=Math.round(len*1.3)+8,c=makeCanvas(wd,ht),p=c.getContext('2d'),cx=wd/2,cy=ht/2+1,rx=size,ry=len*.62;
  A.blob(p,cx,cy,rx,ry,(x,y,d)=>{
    if(d>.82)return '#26342f';                                                          // contorno
    const lit=-x/rx*.55-y/ry*.35,band=((x+y*.7+seed*3)%6+6)%6<1.4,seam=((x-y*.5+seed)%9+9)%9<1;
    let col=lit>.35?'#c3d1c4':lit>.05?'#9db4a8':lit>-.3?'#6f8a7e':'#46605a';
    if(band)col=lit>.1?'#e3ebdd':'#b3c7b8';
    if(seam)col='#34483f';
    return col;
  });
  if(figure){ // alguma coisa se debate lá dentro
    A.blob(p,cx,cy-ry*.35,rx*.38,rx*.38,(x,y)=>'rgba(24,34,30,.55)');
    A.blob(p,cx,cy+ry*.1,rx*.5,ry*.42,(x,y)=>'rgba(24,34,30,.5)');
  }
  for(const yy of [cy-ry+3,cy+ry-4])for(let x=-rx+2;x<=rx-2;x++)if((x+seed)%2)A.px(p,cx+x,yy+Math.round(Math.sin((x+seed)*.8)),'#e3ebdd'); // laços de seda
  return c;
}
function lairEggSprite(size,seed){
  const A=LairArt,wd=size*2+4,ht=Math.round(size*2.6)+4,c=makeCanvas(wd,ht),p=c.getContext('2d'),cx=wd/2,cy=ht/2,rx=size,ry=size*1.3;
  A.blob(p,cx,cy,rx,ry,(x,y,d)=>{
    if(d>.8)return '#365243';
    const lit=-x/rx*.6-y/ry*.4+(hash2(x,y,seed)-.5)*.3;
    return lit>.4?'#bfe0b0':lit>0?'#8fb98d':lit>-.35?'#648a6e':'#436652';
  });
  A.blob(p,cx+1,cy+ry*.25,rx*.45,ry*.4,()=>'rgba(18,34,26,.75)');                          // o embrião, escuro
  return c;
}
function spiderLairLayers(w,n){
  const [x0,y0,x1,last]=n.bounds,h=n.habitat,W=(x1-x0+1)*T,H=(last-y0+1)*T,seed=(w.seed^x0^0x81da)>>>0,rnd=mulberry32(seed),A=LairArt;
  const mk=()=>{const cv=makeCanvas(W,H);return [cv,cv.getContext('2d')];};
  const [rock,r]=mk(),[silk,s]=mk(),[glow,g]=mk();
  const entX=(n.entrance.x-x0)*T,nurseryX=((h.side<0?x1-5:x0+5)-x0)*T+8;
  // Teto de caverna irregular: pedra que desce 3 a 13 px (a colisão do teto continua reta)
  for(let x=0;x<W;x++){
    const d=3+Math.round(A.fbm(x/7,seed)*10);
    r.fillStyle='rgba(8,12,11,.94)';r.fillRect(x,0,1,d);
    r.fillStyle='rgba(72,92,80,.85)';r.fillRect(x,d,1,1);
    if(!(x&3)){r.fillStyle='rgba(8,12,11,.45)';r.fillRect(x,d+1,1,2);}
  }
  for(let i=0;i<12;i++){ // estalactites
    const cx=Math.floor(rnd()*W),len=12+Math.floor(rnd()*28),wd=4+Math.floor(rnd()*6);
    for(let y=0;y<len;y++){const half=Math.max(.6,wd/2*Math.pow(1-y/len,.8));for(let x=Math.floor(-half);x<=Math.ceil(half);x++)A.px(r,cx+x,y,x<-half*.3?'#41524a':y>len*.6?'#131b18':'#1d2824');}
    A.px(r,cx,len,'#a9c2b2');
  }
  for(let i=0;i<18;i++){ // umidade escorrendo
    const x=Math.floor(rnd()*W),ys=10+Math.floor(rnd()*24),L=16+Math.floor(rnd()*70);
    for(let y=0;y<L;y++)if((y+i)%5<3){r.fillStyle='rgba(6,10,9,.17)';r.fillRect(x,ys+y,1+(i&1),1);}
  }
  for(let i=0;i<110;i++){ // musgo no chão e junto ao teto
    const onFloor=rnd()<.7,x=Math.floor(rnd()*W),y=onFloor?H-1-Math.floor(rnd()*5):12+Math.floor(rnd()*10);
    r.fillStyle=['rgba(72,98,66,.8)','rgba(52,78,52,.8)','rgba(100,128,84,.75)'][i%3];r.fillRect(x,y,2+Math.floor(rnd()*5),1+(i&1));
  }
  const vg=r.createLinearGradient(0,0,W,0);vg.addColorStop(0,'rgba(0,0,0,.4)');vg.addColorStop(.12,'rgba(0,0,0,0)');vg.addColorStop(.88,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.4)');
  r.fillStyle=vg;r.fillRect(0,0,W,H);
  // Ruínas da mina: escoras caídas, trilho com vagonete tombado e o esqueleto de um mineiro
  const wood=['#1c1712','#352a1f','#4d3d2b','#675440'];
  const post=(x,top,hh)=>{for(let y=top;y<top+hh;y++)for(let k=0;k<4;k++)A.px(r,x+k,y,wood[k===0?3:k===3?0:(y&3)?2:1]);};
  const frame=(x,hh,broken)=>{
    post(x,H-hh,hh);post(x+34,broken?H-hh*.55:H-hh,broken?hh*.55:hh);
    for(let k=0;k<40;k++){const y=(broken?H-hh+k*.2:H-hh-2+k*.05)|0;for(let t=0;t<4;t++)A.px(r,x-3+k,y+t,wood[t===0?3:t===3?0:2]);}
    for(let k=0;k<9;k++)A.line(r,x+2,H-hh+3,x+20+k*5,2,'rgba(210,222,206,.5)');       // seda amarrando a escora no teto
  };
  const frameX=[Math.round(W*(h.side<0?.62:.3)),Math.round(W*(h.side<0?.4:.52))];
  frame(frameX[0],H-26,false);frame(frameX[1],H-30,true);
  const cartX=Math.round(W*(h.side<0?.18:.74));
  for(let k=0;k<64;k++){const x=cartX-14+k;A.px(r,x,H-2,'#5b5148');A.px(r,x,H-1,'#2b2622');if(k%8===3){r.fillStyle='#3a2917';r.fillRect(x,H-3,2,3);}} // trilhos e dormentes
  for(let y=0;y<11;y++)for(let x=0;x<26;x++){ // vagonete tombado
    const edge=x===0||x===25||y===0||y===10,lit=x<9?1:0;
    if(y<2+Math.floor(x/12)||(y>8&&x%12>2&&x%12<9))continue;
    A.px(r,cartX+x,H-14+y+(x>16?1:0),edge?'#2a241f':y<3?'#b49a78':lit?'#8d7458':'#5d4d3d');
  }
  for(const wx of [cartX+4,cartX+20])A.blob(r,wx,H-3,3,3,(x,y,d)=>d>.5?'#1c1815':'#6f655b');
  for(let i=0;i<9;i++)A.px(r,cartX+5+i*2,H-14-(i%3),['#6e7f8d','#9fb2bd','#4a5864'][i%3]);          // minério que caiu
  for(let k=0;k<3;k++)A.line(r,cartX+6+k*7,H-13,cartX+9+k*7+(k-1)*3,H-22,'rgba(210,222,206,.4)'); // fios soltos sobre a carga
  const skX=Math.round(W*(h.side<0?.84:.12));
  if(Math.abs(skX-entX)>70){
    const sk=['.####.','######','#dd#dd','.####.','..tt..'];
    sk.forEach((row,y)=>[...row].forEach((ch,x)=>{if(ch!=='.')A.px(r,skX+x,H-7+y,ch==='d'?'#241d17':ch==='t'?'#b6a98a':y<2?'#eee5cd':'#d4c9a8');}));
    for(let q=0;q<6;q++)for(let t=0;t<=6;t++)A.px(r,skX+10+q*3+Math.sin(t/6*Math.PI)*1.5,H-3-t*.7,t<5?'#e0d6bb':'#c0b498');
    A.line(r,skX-4,H-3,skX+18,H-3,'#cfc3a2');
    A.line(r,skX-14,H-4,skX-3,H-9,'#6a4a2a');A.rect(r,skX-17,H-12,6,2,'#6c7782');A.rect(r,skX-18,H-11,2,3,'#9aa9b4'); // a picareta dele
    for(let k=0;k<3;k++)A.line(r,skX+2+k*5,H-8,skX+4+k*5,H-16,'rgba(210,222,206,.4)');
  }
  // Fungos que brilham: tufos em volta de cada cogumelo-luz, e veios de micélio nas paredes
  const caps=[];
  for(let y=y0;y<=last;y++)for(let x=x0;x<=x1;x++)if(w.getTile(x,y)===TILE.NEST_GLOW_CAP)caps.push([(x-x0)*T+8,(y-y0)*T]);
  for(const [cx,cy] of caps){
    for(let k=0;k<4;k++){
      const mx=cx+(k-1.5)*5+(rnd()-.5)*4,sh=2+Math.floor(rnd()*3),dir=cy>H-T*1.5?1:0;
      if(!dir)continue;
      A.rect(r,mx,H-sh-1,1,sh,'#8fb3a8');
      A.blob(r,mx,H-sh-2,2.4,1.8,(x,y,d)=>y<0?(d>.6?'#5fe0c8':'#a5f7e4'):'#1f7a73');
    }
    for(let b=0;b<2;b++){ // veio de micélio subindo pela parede
      let vx=cx+(b?8:-8),vy=cy;
      for(let k=0;k<22+Math.floor(rnd()*30);k++){
        vx+=(rnd()-.5)*2.2;vy-=1.1;if(vy<8)break;
        A.px(g,vx,vy,'rgba(116,238,214,.75)');if(k%3===0){A.px(g,vx+1,vy,'rgba(46,150,140,.35)');A.px(g,vx-1,vy,'rgba(46,150,140,.35)');}
        if(rnd()<.06){let bx=vx,by=vy;for(let j=0;j<7;j++){bx+=(rnd()<.5?-1:1);by-=.8;A.px(g,bx,by,'rgba(116,238,214,.6)');}}
      }
    }
  }
  // Teias: grandes nos cantos e atrás do berçário, fios amarrando o teto, cortinas de seda
  const dew=[];
  lairOrbWeb(s,h.side<0?W-6:6,2,150,100,rnd,dew);lairOrbWeb(s,W*.5,0,130,56,rnd,dew);
  lairOrbWeb(s,h.side<0?10:W-10,H-10,90,70,rnd,dew);lairOrbWeb(s,nurseryX,60,90,62,rnd,dew);
  lairOrbWeb(s,h.side<0?W*.16:W*.84,34,70,46,rnd,dew);
  for(let i=0;i<h.anchors.length-1;i++){
    const ax=h.anchors[i].x-x0*T,bx=h.anchors[i+1].x-x0*T,sag=5+(i%3)*3;
    for(let x=ax;x<=bx;x++){const t=(x-ax)/(bx-ax),y=4+Math.sin(t*Math.PI)*sag;A.px(s,x,y,'rgba(214,226,214,.8)');A.px(s,x,y+1,'rgba(150,176,164,.5)');}
    for(let j=1;j<6;j++){const t=j/6,x=ax+(bx-ax)*t,y0s=4+Math.sin(t*Math.PI)*sag,L=8+((i*5+j*7)%22);A.line(s,x,y0s,x+(j%2?1:-1),y0s+L,'rgba(176,196,184,.65)');dew.push([x+(j%2?1:-1),y0s+L]);}
  }
  for(let i=0;i<9;i++){ // cortinas: feixes de fios que descem do teto
    const x=Math.floor(rnd()*W),L=40+Math.floor(rnd()*70);
    for(let k=0;k<5;k++){const fx=x+k*2,fl=L*(.6+rnd()*.4);let cxp=fx;for(let y=0;y<fl;y++){if(y%9===0)cxp+=(rnd()<.5?-1:1)*(rnd()<.4?1:0);A.px(s,cxp,y+8,`rgba(214,226,214,${.5-y/fl*.35})`);}}
  }
  // Seda acumulada no berçário: um monte macio sob os ovos
  A.blob(s,nurseryX,6*T+1,5.5*T,9,(x,y)=>y>0?`rgba(${196+(x&7)},${214+(y&3)},${204},${.75-Math.abs(x)/(5.5*T)*.5})`:null);
  return {W,H,rock,silk,glow,dew:dew.filter(()=>rnd()<.5).slice(0,40),caps,x0,y0,
    cocoons:h.cocoons.map((q,i)=>lairCocoonSprite(q.size,q.len,i*7+3,i%3===1)),eggs:h.eggs.map((q,i)=>lairEggSprite(q.size,i*5+1))};
}
const SPIDER_LAIR_LAYERS=new WeakMap();
function drawSpiderHabitatBackdrop(ctx,g,vx,vy,vw,vh){
  for(const n of g.world.spiderNests||[]){
    if(!n.habitat)continue;const [a,b,c,d]=n.bounds;
    if(c*T<vx||a*T>vx+vw||(d+1)*T<vy||b*T>vy+vh)continue;
    let L=SPIDER_LAIR_LAYERS.get(n);if(!L){L=spiderLairLayers(g.world,n);SPIDER_LAIR_LAYERS.set(n,L);}
    const ox=a*T,oy=b*T,t=performance.now()/1000,h=n.habitat;
    ctx.drawImage(L.rock,ox,oy);
    ctx.globalAlpha=.5+.3*Math.sin(t*1.3);ctx.drawImage(L.glow,ox,oy);ctx.globalAlpha=1; // o micélio respira
    ctx.drawImage(L.silk,ox,oy);
    // casulos balançando devagar, presos por um fio
    h.cocoons.forEach((q,i)=>{
      const sp=L.cocoons[i],sway=Math.round(Math.sin(t*.7+i*1.7)*1.4),jolt=Math.sin(t*.37+i*2.3)>.97?1:0; // às vezes algo lá dentro se mexe
      ctx.fillStyle='rgba(208,219,204,.9)';ctx.fillRect(Math.round(q.x),oy,1,Math.round(q.y-oy)+2);
      ctx.fillStyle='rgba(138,160,150,.7)';ctx.fillRect(Math.round(q.x)+1,oy,1,Math.round(q.y-oy)-6);
      ctx.drawImage(sp,Math.round(q.x-sp.width/2)+sway,Math.round(q.y)+jolt);
    });
    // ovos: o embrião pulsa e o berçário brilha de leve
    h.eggs.forEach((q,i)=>{
      const sp=L.eggs[i],pulse=.5+.5*Math.sin(t*2.1+i*1.3);
      ctx.fillStyle=`rgba(150,255,180,${.06+.1*pulse})`;ctx.fillRect(Math.round(q.x-q.size-2),Math.round(q.y-q.size*2.6-2),q.size*2+4,Math.round(q.size*2.6)+4);
      ctx.drawImage(sp,Math.round(q.x-sp.width/2),Math.round(q.y-sp.height+3));
      ctx.fillStyle=pulse>.6?'#d9ffb8':'#7cc08a';ctx.fillRect(Math.round(q.x+1),Math.round(q.y-q.size*1.1),1,1);
    });
    // orvalho brilhando nas teias
    for(let k=0;k<7;k++){const dw=L.dew[(Math.floor(t*1.4)+k*5)%Math.max(1,L.dew.length)];if(!dw)continue;ctx.fillStyle=`rgba(255,255,255,${.35+.5*Math.sin(t*6+k*2)**2})`;ctx.fillRect(Math.round(ox+dw[0]),Math.round(oy+dw[1]),1,1);}
    // esporos subindo dos cogumelos
    for(let k=0;k<L.caps.length;k++){
      const [cx,cy]=L.caps[k];
      for(let j=0;j<2;j++){const life=((t*.18+k*.37+j*.5)%1),yy=cy-life*60,xx=cx+Math.sin(t*1.1+k+j*3)*5*life;ctx.fillStyle=`rgba(150,255,230,${(1-life)*.55})`;ctx.fillRect(Math.round(ox+xx),Math.round(oy+yy),1,1);}
    }
  }
}
