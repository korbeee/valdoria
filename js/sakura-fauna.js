'use strict';

// =====================================================================================
//  FAUNA DO VALE DAS CEREJEIRAS
// =====================================================================================
//  Bichos de origem japonesa, escolhidos para ficarem bem contra o rosa das cerejeiras:
//   • CERVO-SIKA (鹿)   — o veado de Nara: pelo castanho com pintas brancas e garupa clara.
//   • TANUKI (狸)       — o cão-guaxinim do folclore: baixinho, gordo, de máscara preta.
//   • GROU-TSURU (鶴)   — o grou-de-coroa-vermelha: branco, pescoço preto, topete vermelho.
//   • RAPOSA-KITSUNE (狐) — a única hostil daqui: ruiva, meias pretas e rabo enorme.
//  Todos usam o cérebro comum de js/wildlife.js (a raposa caça sozinha por ser `hostile`).
// =====================================================================================

// Paletas de 5 tons, do vinco de sombra ao brilho do pelo (padrão de js/bear.js)
WILD_PALETTES.sika    = [[58, 34, 22], [98, 62, 36], [146, 98, 56], [190, 140, 86], [228, 190, 134]];
WILD_PALETTES.tanuki  = [[34, 30, 28], [68, 58, 50], [108, 94, 78], [152, 136, 112], [200, 186, 160]];
WILD_PALETTES.tsuru   = [[30, 32, 36], [92, 96, 104], [158, 164, 170], [216, 220, 222], [250, 251, 250]];
WILD_PALETTES.kitsune = [[72, 28, 16], [128, 56, 26], [186, 92, 38], [226, 140, 66], [250, 192, 130]];

WILD_SIZES.sika = [48, 46];
WILD_SIZES.tanuki = [36, 28];
WILD_SIZES.tsuru = [36, 40];
WILD_SIZES.kitsune = [52, 32];

WILDLIFE.sika = {
  name: 'Cervo-sika', biome: BIOME.SAKURA, hp: 20, speed: 62, w: 26, h: 22,
  drops: [[ITEM.MEAT, 2, 3], [ITEM.LEATHER, 1, 2]], color: '#b07845', shape: 'sika',
};
WILDLIFE.tanuki = {
  name: 'Tanuki', biome: BIOME.SAKURA, hp: 10, speed: 50, w: 20, h: 12,
  drops: [[ITEM.LEATHER, 1, 2], [ITEM.MEAT, 1, 1]], color: '#8e7b62', shape: 'tanuki',
};
WILDLIFE.tsuru = {
  name: 'Grou-tsuru', biome: BIOME.SAKURA, hp: 9, speed: 34, w: 16, h: 26,
  drops: [[ITEM.EGG, 1, 2]], color: '#eef0ee', shape: 'tsuru',
};
WILDLIFE.kitsune = {
  name: 'Raposa-kitsune', biome: BIOME.SAKURA, hostile: true, hp: 16, speed: 84, damage: 6, w: 24, h: 14,
  drops: [[ITEM.LEATHER, 1, 2], [ITEM.MEAT, 1, 2]], color: '#d8763a', shape: 'kitsune',
};

// Silhuetas em polígonos e grupos de cor fixos: a textura acompanha a animação.
function sakPatch(s, points, color) {
  const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
  for(let y=Math.floor(Math.min(...ys));y<=Math.ceil(Math.max(...ys));y++)
    for(let x=Math.floor(Math.min(...xs));x<=Math.ceil(Math.max(...xs));x++) {
      let inside=false;
      for(let i=0,j=points.length-1;i<points.length;j=i++) {
        const a=points[i],b=points[j];
        if((a[1]>y+.5)!==(b[1]>y+.5)&&x+.5<(b[0]-a[0])*(y+.5-a[1])/(b[1]-a[1])+a[0])inside=!inside;
      }
      if(inside)s.set(x,y,typeof color==='function'?color(x,y):color);
    }
}

function paintSika(s,pal,f) {
  const {walk,air,idle,ph}=frameInfo(f),bob=walk?Math.round(Math.abs(Math.sin(ph*2))):0;
  const C={K:[43,32,32],D:[78,48,37],d:[119,66,39],m:[170,99,51],l:[210,147,80],cream:[231,205,162],white:[248,231,191]};
  const patch=(pts,c)=>sakPatch(s,pts.map(([x,y])=>[x,y+bob]),c);
  const leg=(x,far,phase)=>{
    const q=ph+phase,sw=walk?Math.cos(q)*3:air?(phase?-3:3):0,up=walk?Math.max(0,-Math.sin(q))*3:air?4:0;
    const knee=x+(x<20?-2:1);
    seg(s,x,28+bob,knee,35,3,far?C.D:C.m);
    seg(s,knee,35,x+sw,43-up,1,far?C.D:C.cream);
    seg(s,x+sw,43-up,x+sw+1,43-up,2,C.K);
  };
  leg(12,true,0);leg(28,true,Math.PI);
  patch([[6,23],[4,20],[7,19],[11,23]],C.cream);
  patch([[7,22],[12,20],[24,21],[29,19],[32,23],[30,29],[24,32],[12,32],[7,29]],(x,y)=>y-bob<24?C.l:y-bob<28?C.m:C.d);
  patch([[8,23],[10,24],[10,29],[13,31],[9,30],[7,27]],C.white);
  patch([[13,29],[22,30],[28,27],[27,30],[22,32],[14,31]],C.cream);
  patch([[12,21],[19,21],[24,22],[18,23],[11,23]],[222,160,92]);
  for(const [x,y] of [[12,24],[17,24],[22,25],[14,27],[19,27],[24,28]]){s.set(x,y+bob,C.white);s.set(x+1,y+bob,C.cream);}
  leg(14,false,Math.PI);leg(26,false,0);
  const graze=idle===2;
  patch(graze?[[27,22],[31,22],[35,29],[35,34],[32,35],[30,28]]:[[25,25],[27,19],[29,13],[33,13],[33,23],[30,29]],C.m);
  patch(graze?[[31,24],[33,27],[35,32],[33,33]]:[[30,16],[32,15],[32,23],[29,27]],C.cream);
  const hx=graze?35:32,hy=graze?33:14;
  const head=(pts,c)=>sakPatch(s,pts.map(([x,y])=>[x+hx,y+hy+bob]),c);
  for(const [dx,dy,ex,ey] of [[-2,-3,-5,-10],[-5,-10,-5,-13],[-4,-8,-8,-10],[0,-3,2,-9],[2,-9,5,-12],[2,-8,1,-12]])seg(s,hx+dx,hy+dy+bob,hx+ex,hy+ey+bob,1,C.cream);
  head([[-2,-3],[-7,-6],[-6,-2],[-2,0]],C.l);head([[-3,-3],[-6,-4],[-4,-1]],C.d);
  head([[1,-3],[4,-6],[5,-3],[2,0]],C.l);
  head([[-2,-2],[2,-2],[5,0],[9,2],[9,4],[4,5],[0,3],[-2,1]],C.m);
  head([[0,-2],[3,-1],[5,1],[2,1]],C.l);head([[3,3],[8,3],[8,5],[4,5]],C.cream);
  s.set(hx+3,hy+1+bob,idle===3?C.d:C.K);s.set(hx+8,hy+2+bob,C.K);
}

function paintTanuki(s,pal,f) {
  const {walk,air,idle,ph}=frameInfo(f);
  const bob=walk?Math.round(Math.abs(Math.sin(ph*2))):idle===1?1:0;
  const ink=[39,33,34],dark=[65,52,47],shade=[99,78,62],fur=[139,111,82],lit=[172,145,107],cream=[215,196,154],white=[242,224,185];
  const patch=(p,c)=>sakPatch(s,p.map(([x,y])=>[x,y+bob]),c);
  const foot=(x,q,far)=>{
    const swing=walk?Math.cos(ph+q)*2:air?(q?-2:2):0,lift=walk?Math.max(0,-Math.sin(ph+q))*2:air?3:0;
    seg(s,x,20+bob,x+swing,24-lift,3,far?dark:shade);
    seg(s,x+swing,24-lift,x+swing+2,24-lift,2,ink);
  };
  foot(12,0,true);foot(26,Math.PI,true);
  // Cauda curta e escura; tronco compacto, com o peso sobre patas baixas.
  patch([[10,16],[6,15],[3,17],[2,20],[4,22],[9,22],[13,20]],dark);
  patch([[4,17],[8,16],[11,18],[8,20],[3,20]],shade);
  patch([[8,12],[11,8],[16,6],[22,7],[27,11],[29,17],[27,22],[22,24],[13,23],[8,20],[7,16]],shade);
  patch([[9,12],[12,9],[17,7],[22,8],[26,12],[25,17],[21,20],[13,20],[9,17]],fur);
  patch([[11,11],[15,8],[20,8],[23,10],[23,13],[19,12],[17,14],[13,13],[11,15]],lit);
  patch([[9,18],[12,20],[17,21],[22,20],[23,23],[16,24],[11,22]],dark);
  for(const [x,y] of [[11,14],[14,16],[18,15],[20,18]])seg(s,x,y+bob,x+1,y+bob,1,lit);
  foot(13,Math.PI,false);foot(25,0,false);
  // Orelhas arredondadas e rosto em três quartos, com duas manchas separadas.
  patch([[20,10],[19,6],[20,3],[23,3],[25,6],[24,10]],dark);
  patch([[21,5],[23,5],[24,8],[21,8]],fur);
  patch([[29,9],[29,4],[31,3],[33,5],[33,9]],dark);
  patch([[30,5],[32,5],[32,8],[30,8]],lit);
  patch([[22,7],[28,7],[32,9],[34,13],[33,17],[30,21],[25,21],[21,19],[18,16],[20,12]],cream);
  patch([[23,8],[28,8],[31,10],[29,12],[26,11],[23,12],[21,11]],lit);
  patch([[20,13],[22,11],[26,12],[27,15],[25,17],[21,16],[19,15]],ink);
  patch([[29,12],[31,11],[33,13],[33,16],[30,17],[28,15]],ink);
  patch([[23,18],[26,17],[29,17],[32,18],[29,21],[25,20]],white);
  patch([[24,19],[28,20],[30,19],[29,22],[25,22]],lit);
  s.set(24,13+bob,idle===3?shade:white);s.set(31,13+bob,idle===3?shade:white);
  seg(s,27,16+bob,29,16+bob,2,ink);s.set(28,18+bob,dark);
}

function paintKitsune(s,pal,f) {
  const {walk,air,idle,ph}=frameInfo(f);
  const bob=walk?Math.round(Math.abs(Math.sin(ph*2))):idle===1?1:0;
  const ink=[47,32,35],dark=[112,52,38],rust=[161,67,36],fur=[207,96,43],lit=[234,134,59],sun=[247,167,83],cream=[243,224,186],shade=[199,171,136];
  const patch=(p,c)=>sakPatch(s,p.map(([x,y])=>[x,y+bob]),c);
  const leg=(x,front,far)=>{
    const phase=(front?0:Math.PI)+(far?Math.PI:0),q=ph+phase;
    const swing=walk?Math.cos(q)*3:air?(front?3:-3):0,lift=walk?Math.max(0,-Math.sin(q))*3:air?4:0;
    const knee=x+(front?0:-2),col=far?dark:rust;
    seg(s,x,19+bob,knee,24,front?2:3,col);
    seg(s,knee,24,x+swing,29-lift,2,ink);
    seg(s,x+swing,29-lift,x+swing+1,29-lift,1,ink);
  };
  leg(22,false,true);leg(36,true,true);
  // Cauda espessa e afilada, presa à garupa durante o movimento.
  const tailLift=idle===2?3:walk?Math.round(Math.sin(ph)):0;
  const tail=(p,c)=>patch(p.map(([x,y])=>[x,y-tailLift*Math.max(0,(22-x)/20)]),c);
  tail([[24,17],[18,17],[13,19],[9,21],[4,21],[1,19],[3,25],[8,28],[13,28],[19,25],[24,21]],dark);
  tail([[22,18],[16,19],[12,21],[7,23],[3,22],[6,26],[11,27],[17,24],[22,22]],fur);
  tail([[21,18],[16,18],[12,20],[8,22],[10,24],[15,23],[19,21]],lit);
  tail([[2,20],[5,22],[9,22],[8,24],[11,25],[8,27],[5,26],[3,24]],cream);
  tail([[5,25],[9,26],[8,27],[5,26]],shade);
  patch([[18,17],[21,14],[27,13],[33,14],[37,12],[40,16],[39,21],[34,23],[28,22],[22,23],[18,21]],rust);
  patch([[19,17],[23,14],[29,14],[34,15],[36,14],[38,17],[35,20],[28,20],[23,19],[21,21]],fur);
  patch([[21,15],[27,14],[33,15],[31,17],[25,16],[22,18]],lit);
  patch([[26,21],[32,21],[36,18],[37,21],[33,23],[28,22]],shade);
  leg(24,false,false);leg(35,true,false);
  // Peito claro, cabeça fina e orelhas curtas com miolo escuro.
  patch([[35,16],[35,11],[38,8],[43,9],[45,12],[50,14],[49,16],[45,17],[41,20],[38,23],[36,21]],fur);
  patch([[35,12],[34,5],[36,5],[39,10]],dark);
  patch([[35,7],[36,7],[38,11]],ink);
  patch([[40,10],[41,3],[43,5],[44,11]],rust);
  patch([[41,6],[42,6],[43,10]],ink);
  patch([[38,10],[41,9],[44,12],[42,13],[39,12]],lit);
  patch([[35,14],[37,16],[40,16],[43,14],[48,15],[46,17],[42,18],[39,22],[37,23],[37,19],[35,18]],cream);
  patch([[35,15],[37,17],[36,20],[34,19]],shade);
  seg(s,42,12+bob,43,12+bob,1,idle===3?dark:ink);
  s.set(49,14+bob,ink);s.set(48,15+bob,ink);
  s.set(39,11+bob,sun);
}

function paintTsuru(s,pal,f) {
  const {walk,air,idle,ph}=frameInfo(f),bob=walk?Math.round(Math.abs(Math.sin(ph*2))):0;
  const white=[248,244,225],light=[218,225,216],shadow=[153,174,173],black=[38,46,52],grey=[78,96,103],red=[188,46,59];
  const patch=(pts,c)=>sakPatch(s,pts.map(([x,y])=>[x,y+bob]),c);
  for(const [x,phase] of [[13,Math.PI],[18,0]]) {
    const q=ph+phase,sw=walk?Math.cos(q)*3:air?(phase?-3:3):0,lift=walk?Math.max(0,-Math.sin(q))*3:air?5:0;
    seg(s,x,24+bob,x-1-sw*.3,31,1,grey);seg(s,x-1-sw*.3,31,x+sw,37-lift,1,phase?grey:shadow);seg(s,x+sw,37-lift,x+sw+3,37-lift,1,grey);
  }
  patch([[9,18],[4,20],[2,26],[6,25],[5,28],[10,26],[13,22]],black);patch([[7,22],[4,25],[8,24],[10,21]],grey);
  patch([[10,16],[16,15],[22,17],[24,21],[22,25],[16,27],[10,26],[7,22]],light);
  patch([[10,17],[16,16],[21,18],[22,21],[17,23],[9,22]],white);patch([[10,23],[15,24],[21,23],[22,25],[16,27],[10,26]],shadow);
  for(let i=0;i<3;i++)seg(s,11+i*3,19+bob,9+i*3,23+bob,1,light);
  const peck=idle===2,hx=peck?26:24,hy=peck?26:idle===3?5:7;
  patch(peck?[[21,18],[24,19],[26,23],[26,28],[24,28],[23,23],[20,22]]:[[20,20],[19,15],[21,11],[21,7],[24,7],[24,12],[22,16],[23,20]],black);
  if(!peck)seg(s,23,10+bob,21,16+bob,1,light);
  sakPatch(s,[[hx-3,hy-1+bob],[hx,hy-2+bob],[hx+3,hy+bob],[hx+2,hy+3+bob],[hx-2,hy+2+bob]],white);
  seg(s,hx-2,hy-2+bob,hx,hy-2+bob,1,red);s.set(hx-1,hy-3+bob,[232,98,93]);s.set(hx+1,hy+bob,black);
  seg(s,hx+3,hy+1+bob,hx+7,hy+(peck?4:2)+bob,1,[197,168,103]);
}
