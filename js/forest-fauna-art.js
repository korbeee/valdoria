'use strict';

// Arte própria para as presas da floresta. As manchas de pelo acompanham o corpo
// em todos os quadros; os membros distantes são pintados antes do tronco.
WILDLIFE.forest_deer.shape='forest_deer';
WILD_SIZES.forest_deer=[56,52];
WILD_SIZES.forest_boar=[54,36];
WILD_PALETTES.forest_deer=[[43,29,25],[91,49,31],[146,77,39],[193,125,65],[236,211,167]];
WILD_PALETTES.forest_boar=[[31,27,27],[61,43,35],[97,65,44],[140,103,67],[191,151,99]];

function forestFoot(f,offset,range,lift){
 const {walk,air}=frameInfo(f),u=(f/8+offset)%1;
 if(!walk)return {x:air?(offset<.5?-range:range):0,lift:air?lift+2:0};
 return u<.5?{x:range-u*range*4,lift:0}:{x:-range+(u-.5)*range*4,lift:Math.sin((u-.5)*Math.PI*2)*lift};
}

function paintForestBoar(s,pal,f){
 const {walk,idle,ph}=frameInfo(f),bob=walk?Math.round(Math.abs(Math.sin(ph*2))):idle===1?1:0;
 const C={ink:[34,27,27],deep:[58,39,33],dark:[78,51,37],shade:[102,68,44],fur:[125,86,54],lit:[154,113,72],sun:[184,145,94],skin:[106,79,64],ivory:[230,212,174],white:[252,239,203]};
 const patch=(pts,c)=>sakPatch(s,pts.map(([x,y])=>[x,y+bob]),c);
 const leg=(x,front,far,offset)=>{
  const step=forestFoot(f,offset,3,3),knee=x+(front?1:-1)+Math.round(step.x*.35),foot=x+Math.round(step.x),fy=34-Math.round(step.lift);
  seg(s,x,23+bob,knee,29-Math.round(step.lift*.3),far?3:4,far?C.deep:C.shade);
  seg(s,knee,29-Math.round(step.lift*.3),foot,fy-1,2,far?C.dark:C.fur);
  if(!far)seg(s,x-1,24+bob,knee-1,28,1,C.lit);
  seg(s,foot-1,fy,foot+2,fy,2,C.ink);s.set(foot+1,fy-1,C.skin);
 };
 leg(15,false,true,.5);leg(34,true,true,0);
 // Cauda curta e tufada, sem o caracol do porco doméstico.
 const tail=walk?Math.round(Math.sin(ph)):idle===3?-1:0;
 seg(s,9,19+bob,4,17+bob,2,C.dark);seg(s,4,17+bob,3,14+bob+tail,1,C.dark);seg(s,2,13+bob+tail,4,14+bob+tail,2,C.deep);
 patch([[8,15],[12,12],[21,11],[28,8],[34,10],[38,15],[38,23],[33,27],[24,28],[13,26],[8,23],[6,19]],(x,y)=>{
  const yy=y-bob;if(yy>24)return C.deep;if(yy>21)return C.dark;
  if(x>30&&yy>16)return C.shade;if(yy<14)return C.lit;return C.fur;
 });
 patch([[10,15],[14,13],[21,13],[25,11],[29,10],[32,12],[27,14],[24,16],[15,17],[10,19]],C.lit);
 patch([[12,14],[18,13],[22,14],[17,15],[13,16]],C.sun);
 patch([[28,13],[32,12],[35,16],[34,23],[30,25],[28,22],[30,18]],C.shade);
 patch([[10,21],[15,23],[23,24],[27,23],[26,26],[17,26],[11,24]],C.shade);
 // Pequenos grupos de cerdas; sem ruído que pisca entre os quadros.
 for(const [x,y] of [[12,18],[17,19],[22,17],[24,20],[15,22],[20,23],[30,17]]){seg(s,x,y+bob,x+2,y+1+bob,1,C.shade);s.set(x,y-1+bob,C.lit);}
 patch([[11,12],[13,9],[14,11],[18,9],[20,10],[23,7],[25,9],[28,5],[30,8],[33,7],[35,11],[30,11],[25,10],[20,12]],C.deep);
 for(const [x,y] of [[15,11],[20,10],[25,9],[30,9],[33,10]])seg(s,x,y+bob,x+1,y+2+bob,1,C.shade);
 leg(14,false,false,0);leg(33,true,false,.5);
 const nod=idle===2?3:idle===3?-1:0,head=(pts,c)=>sakPatch(s,pts.map(([x,y])=>[x,y+bob+nod]),c);
 head([[33,15],[36,11],[41,12],[45,16],[47,22],[45,26],[39,27],[35,24],[34,20]],C.shade);
 head([[36,15],[39,13],[42,15],[43,18],[40,19],[38,23],[35,22]],C.fur);
 head([[36,14],[35,9],[36,6],[40,9],[41,14]],C.dark);
 head([[37,9],[39,10],[39,13],[37,12]],C.skin);
 head([[43,22],[47,21],[52,24],[52,27],[49,29],[44,27],[41,25]],C.dark);
 head([[46,23],[50,24],[51,26],[48,27],[44,25]],C.skin);
 seg(s,51,24+bob+nod,51,26+bob+nod,2,C.ink);s.set(49,24+bob+nod,C.deep);
 seg(s,41,17+bob+nod,44,17+bob+nod,1,C.deep);s.set(43,18+bob+nod,idle===3?C.dark:[225,171,76]);s.set(44,18+bob+nod,C.ink);s.set(42,17+bob+nod,C.sun);
 // Presa curva com base sombreada e ponta clara.
 head([[43,25],[44,28],[46,29],[48,27],[49,23],[48,24],[46,26],[45,26]],C.ivory);
 seg(s,46,27+bob+nod,48,24+bob+nod,1,C.white);s.set(48,22+bob+nod,C.white);
 s.set(50,22+bob+nod,C.ivory);
}

function paintForestDeer(s,pal,f){
 const {walk,idle,ph}=frameInfo(f),bob=walk?Math.round(Math.abs(Math.sin(ph*2))):idle===1?1:0;
 const C={ink:[42,29,25],deep:[76,43,30],dark:[112,60,34],rust:[150,79,40],fur:[181,104,52],lit:[207,138,74],sun:[229,164,94],cream:[226,198,149],white:[245,225,184],antler:[184,151,110]};
 const patch=(pts,c)=>sakPatch(s,pts.map(([x,y])=>[x,y+bob]),c);
 const leg=(x,front,far,offset)=>{
  const step=forestFoot(f,offset,3,4),knee=x+(front?1:-2)+Math.round(step.x*.3),fx=x+Math.round(step.x),fy=50-Math.round(step.lift);
  seg(s,x,34+bob,knee,42-Math.round(step.lift*.3),far?2:3,far?C.deep:C.rust);
  seg(s,knee,42-Math.round(step.lift*.3),fx,fy-1,2,far?C.dark:C.lit);
  if(!far)seg(s,knee,43,fx,fy-2,1,C.cream);
  seg(s,fx-1,fy,fx+2,fy,2,C.ink);
 };
 leg(15,false,true,.5);leg(33,true,true,0);
 patch([[11,30],[6,26],[4,26],[5,29],[9,32]],C.cream);s.set(5,26+bob,C.white);
 patch([[9,29],[13,26],[22,27],[29,28],[34,25],[37,28],[37,34],[33,38],[25,39],[15,38],[10,36],[8,33]],(x,y)=>{
  const yy=y-bob;return yy<30?C.lit:yy>35?C.dark:x>30?C.rust:C.fur;
 });
 patch([[11,29],[14,27],[22,28],[29,29],[27,31],[20,30],[13,31]],C.sun);
 patch([[14,34],[20,35],[29,34],[34,31],[33,35],[28,37],[20,38],[14,37]],C.cream);
 patch([[9,30],[12,30],[12,34],[14,36],[11,36],[9,34]],C.white);
 patch([[25,30],[29,30],[32,28],[34,30],[32,34],[29,35],[27,33]],C.fur);
 for(const [x,y] of [[14,31],[19,32],[24,31],[17,34],[28,32]]){seg(s,x,y+bob,x+2,y+bob,1,C.lit);s.set(x+2,y+1+bob,C.rust);}
 leg(14,false,false,0);leg(32,true,false,.5);
 const graze=idle===2;
 patch(graze?[[32,28],[36,29],[40,34],[44,40],[42,44],[38,41],[34,35]]:[[31,30],[33,25],[35,20],[38,18],[42,21],[40,27],[37,35],[33,37]],C.fur);
 patch(graze?[[36,32],[38,34],[42,40],[40,41],[36,36]]:[[37,22],[40,22],[38,28],[35,33],[33,34],[35,28]],C.cream);
 const hx=graze?42:41,hy=graze?39:21,angle=graze?.6:0;
 const point=(x,y)=>[Math.round(hx+x*Math.cos(angle)-y*Math.sin(angle)),Math.round(hy+x*Math.sin(angle)+y*Math.cos(angle))+bob];
 const head=(pts,c)=>sakPatch(s,pts.map(([x,y])=>point(x,y)),c),line=(a,b,width,color)=>{const p=point(...a),q=point(...b);seg(s,...p,...q,width,color);};
 // Galhadas ramificadas e escalonadas, com dois feixes separados.
 for(const pts of [[[-3,-3],[-6,-10],[-6,-17]],[[0,-3],[1,-11],[4,-17]],[[-6,-10],[-10,-13],[-10,-16]],[[-6,-13],[-3,-16]],[[1,-10],[6,-12],[7,-15]],[[2,-13],[1,-17]]]){
  for(let i=1;i<pts.length;i++)line(pts[i-1],pts[i],1,C.antler);
 }
 line([-3,-3],[-5,-8],2,C.antler);line([0,-3],[1,-8],2,C.cream);
 head([[-3,-2],[-9,-6],[-8,-2],[-4,1]],C.fur);head([[-5,-2],[-8,-4],[-7,-2]],C.cream);
 head([[0,-3],[4,-6],[5,-3],[2,0]],C.lit);head([[2,-3],[4,-4],[4,-2]],C.deep);
 head([[-3,-2],[1,-3],[4,-1],[6,2],[11,4],[10,7],[5,7],[1,4],[-2,2]],C.rust);
 head([[-2,-2],[1,-2],[4,0],[3,2],[0,2]],C.lit);
 head([[3,4],[7,4],[10,5],[9,7],[5,7]],C.cream);
 head([[10,4],[11,5],[10,6],[9,5]],C.ink);
 const eye=point(3,1);s.set(...eye,idle===3?C.dark:C.ink);const brow=point(2,0);s.set(...brow,C.white);
 line([0,3],[1,4],1,C.dark);
}

SHAPE_HOOKS.forest_boar={paint:paintForestBoar,outline:[38,28,26]};
SHAPE_HOOKS.forest_deer={paint:paintForestDeer,outline:[49,32,26]};
