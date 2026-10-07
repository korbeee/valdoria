'use strict';

// =====================================================================================
//  ARTE DO DINAMITEIRO (monstro 'bomber')
// =====================================================================================
// Goblin mineiro curvado sob um barril grande, com capacete, lanterna e macacão.
// 0–7: andar. 8–15: quatro estágios de pavio aceso, com dois pulsos cada.
// 16–19: parado, lanterna apagada, mão no capacete e piscada.

const DYNAMITER = {
  skin: [[44, 57, 42], [80, 105, 63], [133, 156, 94], [190, 201, 130]],
  shirt: [[48, 35, 29], [89, 57, 38], [143, 94, 52], [193, 142, 79]],
  pants: [[34, 38, 64], [54, 62, 98], [82, 94, 134]],   // calça de brim azul, com remendo
  glove: [[62, 36, 22], [104, 64, 36], [150, 100, 56]], // luvas de couro
  boot: [[26, 20, 22], [46, 36, 34], [70, 58, 50]],
  wood: [[60, 32, 22], [100, 56, 32], [142, 84, 44], [180, 118, 64]],
  iron: [[32, 30, 36], [68, 66, 74], [110, 108, 116]],
  helmet: [[90, 62, 26], [148, 108, 40], [202, 158, 60], [236, 204, 112]],
  tnt: [[92, 18, 24], [158, 34, 34], [212, 72, 60]],
  line: [24, 18, 24],
};

function buildBomberSprites() {
  const out = { frames: [], hurt: [] };
  for (let f = 0; f < 20; f++) {
    const canvas = paintDynamiter(f);
    out.frames.push(canvas);
    out.hurt.push(hurtFlash(canvas));
  }
  return out;
}

function paintDynamiter(f) {
  const D=DYNAMITER,s=new Sprite(48,54),armed=f>=8&&f<16,walk=f<8;
  const stage=armed?(f-8)>>1:0,pulse=armed?(f-8)&1:0;
  const phase=walk?f*Math.PI/4:armed?(f-8)*Math.PI/2:0;
  const moving=walk||armed,bob=moving?Math.round(Math.abs(Math.sin(phase))):f===17?1:0;
  const R=(x,y,w,h,c)=>{for(let yy=Math.round(y);yy<Math.round(y+h);yy++)for(let xx=Math.round(x);xx<Math.round(x+w);xx++)s.set(xx,yy,c);};
  const P=(points,c)=>{
    const ymin=Math.floor(Math.min(...points.map(p=>p[1]))),ymax=Math.ceil(Math.max(...points.map(p=>p[1])));
    for(let y=ymin;y<=ymax;y++){const hits=[];for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];if((a[1]<=y+.5&&b[1]>y+.5)||(b[1]<=y+.5&&a[1]>y+.5))hits.push(a[0]+(y+.5-a[1])*(b[0]-a[0])/(b[1]-a[1]));}hits.sort((a,b)=>a-b);for(let i=0;i+1<hits.length;i+=2)for(let x=Math.ceil(hits[i]);x<hits[i+1];x++)s.set(x,y,c);}
  };
  const hip=[24,42-bob],shoulder=[29,30-bob];
  const leg=near=>{
    const q=phase+(near?0:Math.PI),ax=24+(near?4.5:-4.5)+(moving?Math.cos(q)*3:0),ay=52-(moving?Math.max(0,-Math.sin(q))*3:0);
    const knee=[(hip[0]+ax)/2+(near?2:-1),47-bob];
    limb(s,hip[0]+(near?1:-2),hip[1],knee[0],knee[1],4,near?[D.line,D.pants[1],D.pants[2]]:[D.line,D.pants[0],D.pants[1]]);
    limb(s,knee[0],knee[1],ax,ay-2,3,near?[D.line,D.pants[1],D.pants[2]]:[D.line,D.pants[0],D.pants[1]]);
    R(ax-2,ay-2,6,3,near?D.boot[1]:D.boot[0]);R(ax-2,ay,7,1,D.boot[0]);R(ax+1,ay-2,2,1,near?D.boot[2]:D.boot[1]);
    if(near){R(knee[0]-1,knee[1]-1,3,2,D.shirt[2]);s.set(Math.round(knee[0]),Math.round(knee[1]-1),D.shirt[3]);}
  };
  leg(false);
  // Barril grande, separado do corpo: tampa elíptica, aduelas, aros e rebites.
  const kx=14+(moving?Math.round(Math.sin(phase-1)):0),ky=32-bob;
  P([[kx-5,ky-10],[kx+5,ky-10],[kx+8,ky-7],[kx+8,ky+7],[kx+5,ky+10],[kx-5,ky+10],[kx-8,ky+7],[kx-8,ky-7]],D.wood[1]);
  R(kx-6,ky-7,3,14,D.wood[3]);R(kx-2,ky-8,3,17,D.wood[2]);R(kx+3,ky-8,1,17,D.wood[0]);R(kx+6,ky-6,2,12,D.wood[0]);
  P([[kx-5,ky-10],[kx+5,ky-10],[kx+7,ky-8],[kx+4,ky-6],[kx-5,ky-6],[kx-7,ky-8]],D.wood[3]);
  R(kx-4,ky-9,8,1,D.wood[1]);
  for(const y of [ky-5,ky+6]){R(kx-7,y,14,2,D.iron[1]);R(kx-7,y,7,1,D.iron[2]);s.set(kx-5,y+1,[172,163,145]);s.set(kx+4,y+1,[172,163,145]);}
  // Dois cartuchos vermelhos presos na frente do barril.
  R(kx-2,ky-2,2,5,D.tnt[1]);R(kx+1,ky-2,2,5,D.tnt[2]);R(kx-2,ky,5,1,D.shirt[3]);
  if(armed){const heat=(stage+1)/4*(pulse?1:.5);for(const x of [-5,-1,4])R(kx+x,ky-3,1,7,lerpColor(D.wood[2],[255,196,73],heat));}
  const fuseLength=armed?Math.max(2,10-stage*2-pulse):10;
  for(let i=0;i<fuseLength;i++){s.set(kx+1-Math.floor(i/4),ky-11-i,[64,54,43]);if(i%2===0)s.set(kx+2-Math.floor(i/4),ky-11-i,[151,134,92]);}
  if(armed){const tx=kx+1-Math.floor((fuseLength-1)/4),ty=ky-10-fuseLength;
    R(tx-1,ty-1,3,3,[255,149,47]);s.set(tx,ty,[255,255,212]);s.set(tx-3,ty-2,[255,201,77]);s.set(tx+3,ty+1,[255,180,57]);
    if(pulse){s.set(tx+2,ty-3,[255,221,101]);s.set(tx-2,ty+3,[255,160,47]);}
    R(tx-2,ty-5-pulse,2,2,[116,115,107]);s.set(tx,ty-7-pulse,[84,87,83]);
  }
  // Colete sem mangas sobre macacão: tronco robusto, inclinado sob o barril.
  P([[25,28-bob],[33,30-bob],[32,36-bob],[29,43-bob],[20,43-bob],[20,35-bob]],D.shirt[1]);
  P([[26,29-bob],[30,31-bob],[27,40-bob],[23,40-bob],[23,34-bob]],D.shirt[2]);
  R(24,36-bob,6,6,D.pants[1]);R(25,37-bob,3,2,D.pants[2]);
  seg(s,24,29-bob,23,37-bob,1,D.shirt[3]);seg(s,31,31-bob,28,39-bob,1,D.shirt[3]);
  R(20,41-bob,10,2,D.boot[0]);R(26,41-bob,3,2,D.helmet[2]);s.set(27,41-bob,D.helmet[3]);
  leg(true); // A perna dianteira cobre o quadril, sem esconder o pé de trás.
  // Cabeça nova: mandíbula larga, orelha triangular e focinho anguloso.
  const hy=18-bob;
  P([[27,hy-1],[20,hy-4],[22,hy+4],[28,hy+5]],D.skin[1]);
  P([[26,hy+1],[22,hy-1],[24,hy+3]],D.skin[3]);
  P([[28,hy-3],[38,hy-3],[41,hy+1],[40,hy+8],[35,hy+12],[29,hy+10],[26,hy+5]],D.skin[2]);
  P([[27,hy+3],[30,hy+5],[30,hy+10],[35,hy+12],[28,hy+10]],D.skin[1]);
  R(30,hy+3,3,2,D.skin[3]);
  P([[39,hy+2],[45,hy+5],[44,hy+7],[38,hy+7]],D.skin[2]);R(42,hy+5,2,1,D.skin[3]);s.set(43,hy+7,D.skin[0]);
  // Olho sob sobrancelha pesada; dentes irregulares do sorriso.
  R(35,hy,5,1,D.skin[0]);R(36,hy+1,4,3,[226,215,151]);
  if(f===19)R(36,hy+2,4,1,D.skin[0]);else R(38,hy+1,2,3,armed?[191,55,31]:[28,27,22]);
  R(34,hy+7,6,armed?3:2,[47,35,26]);R(34,hy+7,2,1,[239,224,180]);s.set(38,hy+7,[239,224,180]);s.set(36,hy+9,armed?[207,109,77]:D.skin[1]);
  // Capacete abobadado com placa, aba larga e lanterna circular em pixels.
  P([[27,hy-8],[35,hy-9],[40,hy-6],[41,hy-2],[25,hy-2],[25,hy-5]],D.helmet[2]);
  P([[28,hy-7],[34,hy-8],[37,hy-6],[28,hy-5]],D.helmet[3]);
  R(25,hy-3,17,2,D.helmet[1]);R(23,hy-1,20,2,D.helmet[0]);R(24,hy-1,16,1,D.helmet[3]);
  R(34,hy-7,2,4,D.helmet[1]);s.set(27,hy-3,D.iron[2]);
  R(39,hy-6,4,5,D.iron[0]);R(40,hy-5,3,3,f===17?[143,141,102]:[255,230,132]);s.set(41,hy-5,f===17?[181,174,119]:[255,255,215]);
  // Braço dianteiro com luva grande; ao armar, ergue um cartucho.
  const up=armed&&stage>=1;
  const hand=up?[35+pulse,22-bob]:f===18?[33,12-bob]:[33+(moving?Math.round(Math.cos(phase+Math.PI)*2):0),39-bob];
  const elbow=up?[35,29-bob]:[31,35-bob];
  limb(s,32,31-bob,elbow[0],elbow[1],4,[D.line,D.skin[1],D.skin[2]]);
  limb(s,elbow[0],elbow[1],hand[0],hand[1],3,[D.line,D.skin[2],D.skin[3]]);
  R(hand[0]-2,hand[1]-1,4,4,D.glove[1]);R(hand[0]-2,hand[1]-1,3,1,D.glove[2]);
  if(up){R(hand[0]+1,hand[1]-5,2,6,D.tnt[1]);R(hand[0]+1,hand[1]-5,1,4,D.tnt[2]);}
  return s.finish(D.line);
}
