'use strict';

// Poses em pixels do mundo, pés em y=0. Sem escala, cortes de corpo ou dissolução.
// Cada etapa transfere o apoio: deitado -> mão no chão -> sentado -> joelho -> pé.
const WAKE_KEYS = [
  {t:13.2, hip:[-8,-5], tilt:-1.48, feet:[[2,-3],[5,-3]], knees:[[-3,-5],[0,-6]], hands:[[-17,-3],[-19,-3]], nod:0},
  {t:15.4, hip:[-8,-5], tilt:-1.4, feet:[[2,-3],[5,-3]], knees:[[-3,-5],[0,-6]], hands:[[-17,-3],[-19,-3]], nod:.04},
  {t:16.2, hip:[-7,-5], tilt:-.9, feet:[[3,-3],[6,-3]], knees:[[-1,-6],[1,-7]], hands:[[-15,-3],[-14,-3]], nod:.07},
  {t:17.1, hip:[-5,-5], tilt:-.3, feet:[[5,-3],[8,-3]], knees:[[0,-5],[3,-7]], hands:[[-10,-3],[-8,-3]], nod:.12},
  {t:17.6, hip:[-5,-5], tilt:-.24, feet:[[5,-3],[8,-3]], knees:[[0,-5],[3,-7]], hands:[[-10,-3],[-4,-21]], nod:.18},
  {t:18.1, hip:[-5,-5], tilt:.12, feet:[[0,-3],[8,-3]], knees:[[-2,-3],[3,-7]], hands:[[-9,-3],[6,-5]], nod:.12},
  {t:18.7, hip:[-4,-7], tilt:.58, feet:[[-11,-3],[7,-3]], knees:[[-6,-3],[3,-8]], hands:[[1,-7],[8,-4]], nod:.08},
  {t:19.2, hip:[-3,-8], tilt:.42, feet:[[-10,-3],[6,-3]], knees:[[-5,-3],[3,-8]], hands:[[1,-8],[7,-5]], nod:.04},
  {t:19.8, hip:[-1,-11], tilt:.22, feet:[[-6,-3],[5,-3]], knees:[[-2,-7],[4,-7]], hands:[[-2,-9],[6,-10]], nod:0},
  {t:20.35, hip:[0,-13], tilt:.04, feet:[[-2,-3],[3,-3]], knees:[[-2,-8],[3,-8]], hands:[[-3,-12],[1,-12]], nod:0},
  {t:20.8, hip:[0,-13], tilt:0, feet:[[-1,-3],[2,-3]], knees:[[-1,-8],[2,-8]], hands:[[-3,-12],[0,-12]], nod:0},
];
function wakePoseAt(t) {
  let i=0;while(i<WAKE_KEYS.length-2&&t>WAKE_KEYS[i+1].t)i++;
  const a=WAKE_KEYS[i],b=WAKE_KEYS[i+1],u=smoothstep(clamp((t-a.t)/(b.t-a.t),0,1));
  const blend=(a,b)=>Array.isArray(a)?a.map((v,i)=>blend(v,b[i])):lerp(a,b,u);
  return {hip:blend(a.hip,b.hip),tilt:blend(a.tilt,b.tilt),feet:blend(a.feet,b.feet),knees:blend(a.knees,b.knees),hands:blend(a.hands,b.hands),nod:blend(a.nod,b.nod)};
}
function drawWakeRig(ctx, renderer, t, x, ground) {
  if(!renderer.wakeParts || renderer.wakeParts.atlas!==renderer.playerAtlas) {
    renderer.wakeParts={atlas:renderer.playerAtlas,torso:playerTorsoPart(TORSO),head:playerHeadParts(),frames:new Map()};
  }
  const parts=renderer.wakeParts, tick=Math.floor(t*24);
  let frame=parts.frames.get(tick);
  if(!frame) {
    frame=makeCanvas(96,64);const c=frame.getContext('2d');c.imageSmoothingEnabled=false;c.translate(48,63);
    const p=wakePoseAt(tick/24), [hx,hy]=p.hip;
    const line=(a,b,width,color)=>{
      c.fillStyle=rgb(color);const n=Math.max(Math.abs(b[0]-a[0]),Math.abs(b[1]-a[1]),1);
      for(let j=0;j<=n;j++)c.fillRect(Math.round(lerp(a[0],b[0],j/n))-Math.floor(width/2),Math.round(lerp(a[1],b[1],j/n))-Math.floor(width/2),width,width);
    };
    const local=(px,py)=>[hx+px*Math.cos(p.tilt)-py*Math.sin(p.tilt),hy+px*Math.sin(p.tilt)+py*Math.cos(p.tilt)];
    const arm=back=>{
      const k=back?0:1, shoulder=local(back?2:-2,-9), hand=p.hands[k];
      const target=[hand[0],hand[1]-2], terminal=t>=20.35;
      let elbow;
      if(terminal) {const u=smoothstep(clamp((t-20.35)/.45,0,1)), bend=ik(...shoulder,...target,6,5,back?-1:1);elbow=[lerp(bend[0],hx+(back?1:-2),u),lerp(bend[1],hy-4,u)];}
      else elbow=ik(...shoulder,...target,6,5,back?-1:1);
      line(shoulder,elbow,5,PLAYER_OUTLINE);line(elbow,target,4,PLAYER_OUTLINE);
      line(shoulder,elbow,3,PLAYER_PALETTE[back?'j':'J']);line(elbow,target,2,PLAYER_PALETTE[back?'k':'j']);
      line([hand[0],hand[1]-1],hand,3,PLAYER_PALETTE[back?'s':'S']);
    };
    const leg=back=>{
      const k=back?0:1,hip=[hx+(back?-2:2),hy],knee=p.knees[k],foot=p.feet[k],ankle=[foot[0],foot[1]-2];
      line(hip,knee,5,PLAYER_OUTLINE);line(knee,ankle,5,PLAYER_OUTLINE);
      line(hip,knee,3,PLAYER_PALETTE[back?"n":"N"]);line(knee,ankle,3,PLAYER_PALETTE[PLAYER_LOOK.legs===1?(back?"s":"S"):(back?"n":"N")]);
      line([hip[0]-1,hip[1]],[knee[0]-1,knee[1]],1,PLAYER_PALETTE[back?'N':'v']);
      const fx=Math.round(foot[0]),fy=Math.round(foot[1]);
      c.fillStyle=rgb(PLAYER_OUTLINE);c.fillRect(fx-2,fy-2,7,4);
      c.fillStyle=rgb(PLAYER_PALETTE[back?'x':'X']);c.fillRect(fx-1,fy-2,5,3);
      c.fillStyle=rgb(PLAYER_PALETTE.z);c.fillRect(fx-1,fy-2,3,1);
    };
    arm(true);leg(true);leg(false);
    c.save();c.translate(Math.round(hx),Math.round(hy));c.rotate(p.tilt);
    c.drawImage(parts.torso,-10,-13);
    // Pequeno movimento de cabeça ao recuperar o fôlego, sem mover o tronco inteiro.
    c.translate(-1,-24);c.rotate(p.nod);
    c.drawImage(t<16.1?parts.head.blink:parts.head.open,-9-parts.head.ox,-6-parts.head.oy);c.restore();
    arm(false);parts.frames.set(tick,frame);
  }
  ctx.drawImage(frame,Math.round(x)-48,Math.round(ground)-63);
}
