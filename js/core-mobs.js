'use strict';
// =====================================================================================
//  CRIATURAS NOVAS DO CORAÇÃO
// =====================================================================================
//  Besouro de magma   Forja / Magnético   carapaça de basalto rachada, investe
//  Golem de magnetita Magnético           pedregulho azul que puxa o jogador e esmaga o chão
//  Crânio ardente     Ossário / Forja     crânio flutuante que cospe brasa de longe
//  Guarda de obsidiana   fortalezas       cavaleiro de armadura negra com escudo-torre e lança
//  Arqueiro de brasa     fortalezas       atira flechas em chamas e recua quando você chega perto
//  Capitão da fortaleza  fortalezas       guarda enorme, de elmo com chifres: golpe em área
// Carrega depois de core-life.js. Usa SHAPE_HOOKS (js/wildlife.js) como a Salamandra e o Sentinela.

const EMBER = [[150, 44, 18], [236, 100, 30], [255, 170, 60], [255, 236, 150]];
const OBS = [[14, 10, 20], [34, 26, 44], [60, 48, 76], [96, 80, 116], [150, 130, 170]];
const MAGN = [[20, 26, 44], [44, 56, 88], [76, 96, 140], [120, 150, 200], [190, 226, 255]];
const toneOf = (P, v) => P[clamp(Math.floor(v * P.length), 0, P.length - 1)];

// ---------------------------------------------------------------- desenhos
function paintMagmaBeetle(s, pal, f) {                       // 30x18: 0-3 andando, 4 parado, 5 investindo (asas abertas)
  const walk = f < 4, ph = walk ? (f / 4) * Math.PI * 2 : 0, dash = f === 5, base = 16;
  const basalt=[[25,26,33],[42,43,52],[60,62,73],[82,85,95],[112,117,124],[146,150,151]];
  for (let i = 0; i < 3; i++) for (const side of [0, 1]) {   // seis patas
    const q = ph + i * 2.1 + side * 3, x = 8 + i * 5 + side * 1.5, st = walk ? Math.sin(q) * 1.6 : 0, lift = walk ? Math.max(0, -Math.cos(q)) * 1.4 : 0;
    limb(s, x, base - 5, x + st + (side ? 2 : -2), base - lift, 1, [basalt[0],basalt[1],basalt[2]]);
  }
  // Casco mineral com facetas largas, borda escura e reflexos frios no topo.
  shadeBall(s, 13, 9, 11, 7, (v,dx,dy,x,y) => {
    const facet=(x<10&&y<7)?.1:(x>16?-.12:0);
    return basalt[clamp(Math.floor((v+facet)*4.6),0,5)];
  });
  for(const [x,y]of [[6,8],[7,7],[8,5],[12,3],[16,4],[19,6]])s.set(x,y,basalt[4]);
  // Fendas ramificadas: bordas de brasa vermelha e núcleo amarelo quente.
  const cracks=[[[7,4],[9,6],[10,6],[11,9],[14,10],[14,13]],[[11,9],[8,10],[7,12]],[[15,3],[15,5],[17,6],[17,8],[20,10]],[[17,8],[15,9]],[[20,10],[19,12],[20,14]]];
  for(const points of cracks)for(let j=1;j<points.length;j++){
    const [x0,y0]=points[j-1],[x1,y1]=points[j],n=Math.max(Math.abs(x1-x0),Math.abs(y1-y0));
    for(let i=0;i<=n;i++){
      const x=Math.round(lerp(x0,x1,i/n)),y=Math.round(lerp(y0,y1,i/n));
      if(!s.opaque(x,y))continue;
      for(const [dx,dy]of [[-1,0],[1,0],[0,1]])if(s.opaque(x+dx,y+dy))s.set(x+dx,y+dy,[104,47,31]);
      s.set(x,y,EMBER[dash?3:((x+y)%3===0?3:2)]);
    }
  }
  if (dash) { limb(s, 6,5,2,1,1,[basalt[0],EMBER[1],EMBER[2]]);limb(s,12,3,9,0,1,[basalt[0],EMBER[1],EMBER[3]]); }
  // Pronoto e cabeça separados da carapaça, olhos em brasa e mandíbulas de pedra.
  shadeBall(s,22,10,4,4,(v)=>basalt[clamp(Math.floor(v*4),0,4)]);
  seg(s,21,7,22,11,1,basalt[0]);
  shadeBall(s,26,11,3.5,3.5,(v)=>basalt[clamp(Math.floor(v*3.5),0,4)]);
  s.set(26,9,EMBER[1]);s.set(27,9,EMBER[3]);s.set(28,9,EMBER[2]);
  seg(s,26,8,27,6,1,basalt[2]);s.set(28,6,EMBER[1]);
  seg(s,28,11,30,12,1,basalt[3]);seg(s,30,12,30,14,1,EMBER[2]);
  seg(s,27,13,28,16,1,basalt[2]);s.set(29,16,EMBER[2]);
  for(let i=0;i<3;i++){
    const x=7+i*6,st=walk?Math.round(Math.sin(ph+i*2.1)*2):0,lift=walk?Math.round(Math.max(0,-Math.cos(ph+i*2.1))):0;
    limb(s,x,12,x-2+st,15-lift,1,[basalt[0],basalt[2],basalt[3]]);
    seg(s,x-2+st,15-lift,x+st,16-lift,1,basalt[1]);s.set(x-2+st,15-lift,[130,71,37]);
  }
}
function paintMagnetGolem(s, pal, f) {                       // 34x44: 0-3 andando, 4 parado, 5 braços erguidos, 6 esmagando
  const walk = f < 4, ph = walk ? (f / 4) * Math.PI * 2 : 0, wind = f === 5, slam = f === 6, base = 52, bob = walk ? Math.round(Math.abs(Math.sin(ph))) : 0;
  const blk = (x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) s.set(Math.round(x + i), Math.round(y + j), c(i, j, w, h)); };
  const rock = (i, j, w, h) => (j === 0 ? MAGN[3] : i === 0 ? MAGN[2] : j === h - 1 || i === w - 1 ? MAGN[0] : hash2(i, j, 7) < 0.2 ? MAGN[1] : MAGN[2]);
  for (const [lx, off] of [[10, 0], [20, Math.PI]]) {                                      // pernas de pedra
    const q = ph + off, st = walk ? Math.round(Math.sin(q) * 2) : 0, lift = walk ? Math.round(Math.max(0, -Math.cos(q)) * 2) : 0;
    blk(lx + st, base - 12 - lift, 7, 12 + lift, rock); blk(lx + st - 1, base - 3 - lift, 9, 3, (i, j) => (j === 0 ? MAGN[3] : MAGN[0]));
  }
  const ty = 22 - bob + (slam ? 3 : 0);
  wildPoly(s,[[8,ty],[23,ty-1],[28,ty+4],[26,ty+15],[22,ty+18],[10,ty+17],[5,ty+12],[5,ty+5]],MAGN);
  for(const [ax,ay,bx,by]of [[7,ty+6,12,ty+8],[23,ty+3,21,ty+7],[9,ty+13,13,ty+15]])seg(s,ax,ay,bx,by,1,MAGN[1]);
  for(const [x,y]of [[8,ty+3],[12,ty+2],[23,ty+4],[21,ty+14]]){seg(s,x,y,x+2,y+2,1,MAGN[0]);s.set(x+1,y,MAGN[3]);}
  shadeBall(s,7,ty+2,4,4,(v)=>toneOf(MAGN,v*.75));shadeBall(s,27,ty+2,4,4,(v)=>toneOf(MAGN,v*.65));
  shadeBall(s, 17, ty + 9, 4, 4, (v) => (v > 0.6 ? [230, 250, 255] : v > 0.3 ? [120, 200, 250] : [40, 110, 200]));                   // núcleo azul
  for (const [x, y, h] of [[8, ty - 5, 7], [14, ty - 8, 9], [22, ty - 6, 7]]) for (let k = 0; k < h; k++) { s.set(x, y + h - k, MAGN[k > h - 3 ? 4 : 3]); s.set(x + 1, y + h - k, MAGN[2]); if (k < h - 2) s.set(x - 1, y + h - k, MAGN[0]); }   // cristais nos ombros
  wildPoly(s,[[12,ty-8],[19,ty-9],[23,ty-6],[21,ty-1],[13,ty-1],[11,ty-5]],MAGN);s.set(15,ty-5,[120,200,250]);s.set(19,ty-5,[120,200,250]);
  seg(s,14,ty-7,16,ty-6,1,MAGN[0]);seg(s,19,ty-6,21,ty-7,1,MAGN[0]);seg(s,16,ty-2,19,ty-2,1,MAGN[0]);
  for (const side of [-1, 1]) {                                                                                                        // braços
    const sx = side < 0 ? 2 : 28;
    if (wind) blk(sx, ty - 14, 5, 16, rock);
    else if (slam) blk(side < 0 ? 4 : 26, ty + 8, 6, 24, rock);
    else blk(sx, ty + 2, 5, 18 + (walk ? Math.round(Math.sin(ph + (side > 0 ? Math.PI : 0)) * 2) : 0), rock);
    const fy = wind ? ty - 16 : slam ? ty + 31 : ty + 20; blk(sx - 1, fy, 7, 6, rock);
    for(let k=1;k<6;k+=2)s.set(sx-1+k,fy+4,MAGN[0]);
  }
}
function paintEmberSkull(s, pal, f) { // Crânio ósseo recortado e fogo em cinco quadros.
  const fl=f&3,shoot=f===4,bone=[[102,79,61],[161,140,106],[212,191,149],[239,225,184],[255,245,213]];
  for(const [cx,height]of [[8,8],[14,13],[20,9]]){
    const top=Math.max(1,14-height+((fl+cx)%3)-1);
    for(let y=top;y<=15;y++){
      const d=y-top,half=d<2?0:d<5?1:3,bend=d<5?Math.round(Math.sin((fl+cx)*1.4)*(5-d)/3):0;
      for(let x=cx-half+bend;x<=cx+half+bend;x++)s.set(x,y,EMBER[Math.abs(x-cx-bend)===half?1:d>6?3:2]);
    }
  }
  shadeBall(s,14,19,9,8,(v,dx,dy)=>dy>.6?null:bone[clamp(Math.floor(v*4.5),0,4)]);
  // Maçãs do rosto proeminentes, têmporas cavadas e testa fraturada.
  shadeBall(s,6.5,22,2.3,2,(v)=>bone[clamp(Math.floor(v*4),0,4)]);
  shadeBall(s,21.5,22,2.3,2,(v)=>bone[clamp(Math.floor(v*3),0,3)]);
  seg(s,13,12,12,14,1,bone[1]);seg(s,12,14,14,16,1,bone[1]);s.set(15,15,bone[1]);
  shadeBall(s,9,19.5,3.4,3.2,()=>[39,27,25]);shadeBall(s,19,19.5,3.4,3.2,()=>[39,27,25]);
  seg(s,6,16,11,18,1,bone[3]);seg(s,17,18,22,16,1,bone[2]);
  for(const x of [9,18]){s.set(x,20,EMBER[3]);s.set(x+1,20,EMBER[2]);s.set(x,21,EMBER[1]);}
  s.set(14,22,[50,36,28]);s.set(13,23,[50,36,28]);s.set(15,23,[50,36,28]);
  // Mandíbula afilada no queixo, com dentes espaçados e irregulares.
  const drop=shoot?2:0;
  for(let y=24;y<=29+drop;y++){
    const inset=y<26?0:y<28+drop?1:2;
    for(let x=8+inset;x<=20-inset;x++)s.set(x,y,y===24?bone[2]:y>=28+drop?bone[x<14?2:1]:[47,32,25]);
  }
  for(const [x,h]of [[9,1],[12,2],[15,2],[18,1]])for(let y=25;y<25+h;y++)s.set(x,y,bone[4]);
  for(const x of [11,14,17])s.set(x,27+drop,bone[3]);
  s.set(10,28+drop,bone[3]);s.set(18,28+drop,bone[1]);
  if(shoot)for(let y=26;y<=32;y++)for(let x=12;x<=16;x++)if(y<30||Math.abs(x-14)<2)s.set(x,y,EMBER[x===14?3:1]);
}
function paintKnight(s, pal, f, o) {                          // guarda/capitão: 0-3 andando, 4 parado, 5 armando, 6 golpeando
  const W = 34, base = 46 + (o.tall || 0), walk = f < 4, ph = walk ? (f / 4) * Math.PI * 2 : 0, wind = f === 5, stab = f === 6, bob = walk ? Math.round(Math.abs(Math.sin(ph))) : 0;
  const ARM = o.armor, cx = 14;
  for (const [side, off] of [[-1, 0], [1, Math.PI]]) {                                    // pernas de placa
    const q = ph + off, st = walk ? Math.round(Math.sin(q) * 3) : 0, lift = walk ? Math.max(0, -Math.cos(q)) * 2 : 0, hx = cx + side * 3, fx = hx + st, fy = base - lift;
    limb(s, hx, base - 16 - bob, fx, fy - 2, 4, side < 0 ? [ARM[0], ARM[1], ARM[2]] : [ARM[0], ARM[2], ARM[3]]);
    shadeBall(s,hx+st*.5,base-9-bob,2.4,2.4,(v)=>toneOf(ARM,v*.8));
    for(const y of [base-5,base-3])s.set(Math.round(fx)-1,y,ARM[3]);
    for (let k = -2; k <= 3; k++) s.set(Math.round(fx) + k, Math.round(fy), k === -2 || k === 3 ? ARM[0] : ARM[2]);
  }
  const ty = base - 33 - bob;                                                            // peitoral largo
  limb(s,cx-8,ty+3,cx-10,ty+12,2,[ARM[0],ARM[1],ARM[3]]);
  shadeBall(s,cx-10,ty+13,2.3,2.7,(v)=>toneOf(ARM,v*.85));
  for (let y = ty; y < ty + 17; y++) { const hw = 7.5 - (y - ty) * 0.18; for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) { const u = (x - cx) / hw; s.set(x, y, y === ty ? ARM[4] : u < -0.5 ? ARM[3] : u < 0.3 ? ARM[2] : u < 0.75 ? ARM[1] : ARM[0]); } }
  for (const [x, y] of [[cx, ty + 6], [cx - 1, ty + 7], [cx + 1, ty + 7], [cx, ty + 8]]) s.set(x, y, EMBER[x === cx && y === ty + 7 ? 3 : 2]);   // runa
  for (let x = cx - 7; x <= cx + 7; x++) s.set(x, ty + 12, ARM[0]);                      // cinto
  for(const x of [cx-5,cx+4]){s.set(x,ty+3,ARM[4]);s.set(x,ty+10,ARM[3]);}
  seg(s,cx-4,ty+4,cx-1,ty+5,1,ARM[3]);seg(s,cx+1,ty+5,cx+4,ty+4,1,ARM[1]);
  for(let i=0;i<3;i++){seg(s,cx-5+i,ty+13+i,cx+5-i,ty+13+i,1,i%2?ARM[1]:ARM[2]);}
  for (const sd of [-1, 1]) shadeBall(s, cx + sd * 9, ty + 2, 4, 3.4, (v) => (v > 0.6 ? ARM[4] : v > 0.35 ? ARM[3] : ARM[2]));   // ombreiras
  const hy = ty - 10;                                                                    // elmo com viseira acesa
  shadeBall(s, cx, hy + 5, 6, 6, (v) => (v > 0.7 ? ARM[4] : v > 0.45 ? ARM[3] : v > 0.2 ? ARM[2] : ARM[1]));
  for (let x = cx - 4; x <= cx + 4; x++) s.set(x, hy + 6, EMBER[x > cx ? 3 : 2]); for (let x = cx - 3; x <= cx + 3; x++) s.set(x, hy + 7, [30, 16, 10]);
  seg(s,cx,hy+1,cx,hy+5,1,ARM[4]);
  for(const y of [hy+8,hy+9])for(const x of [cx-2,cx,cx+2])s.set(x,y,ARM[0]);
  s.set(cx-4,hy+8,ARM[3]);s.set(cx+4,hy+8,ARM[1]);
  if (o.horns) for (const sd of [-1, 1]) limb(s, cx + sd * 5, hy + 2, cx + sd * 9, hy - 6, 2, [ARM[0], ARM[3], ARM[4]]); else for (let y = hy - 2; y <= hy + 1; y++) s.set(cx, y, EMBER[1]);   // chifres ou crista
  if (o.cape) for (let y = ty; y < base - 6; y++) { const w = 3 + (y - ty) * 0.25; for (let x = Math.round(cx - 9 - w * 0.3); x < cx - 7; x++) s.set(x, y + (walk ? Math.round(Math.sin(ph + y * 0.3) * 0.7) : 0), x < cx - 9 ? EMBER[0] : [110, 28, 18]); }
  const shX = cx + 11 + (stab ? 3 : 0);                                                  // escudo-torre na frente
  for (let y = ty - 1; y < ty + 21; y++) for (let x = shX - 3; x <= shX + 3; x++) s.set(x, y, x === shX - 3 || x === shX + 3 || y === ty - 1 || y === ty + 20 ? EMBER[1] : x < shX ? ARM[3] : ARM[2]);
  s.set(shX, ty + 8, EMBER[3]); s.set(shX, ty + 9, EMBER[2]);
  for(const y of [ty+2,ty+17])for(const x of [shX-2,shX+2])s.set(x,y,ARM[4]);
  for(let k=-2;k<=2;k++){s.set(shX+k,ty+8-Math.abs(k),EMBER[2]);s.set(shX+k,ty+10+Math.abs(k),ARM[0]);}
  const hx = shX + 1, hy2 = ty + 11, tip = stab ? 33 : wind ? cx - 4 : cx + 20;            // lança: recuada, normal ou cravada
  limb(s, cx + 6, hy2, tip, stab ? hy2 - 2 : wind ? hy2 - 6 : hy2 - 10, 1, [ARM[0], [120, 90, 56], [170, 130, 80]]);
  for (let k = 0; k < 3; k++) s.set(Math.round(tip) + k, Math.round(stab ? hy2 - 2 : wind ? hy2 - 6 : hy2 - 10), EMBER[k + 1]);
}
function paintArcher(s, pal, f) {                              // 0-3 andando, 4 parado, 5 mirando (arco esticado, flecha acesa)
  const walk = f < 4, ph = walk ? (f / 4) * Math.PI * 2 : 0, draw = f === 5, base = 44, bob = walk ? Math.round(Math.abs(Math.sin(ph))) : 0, cx = 14, A = [[22, 14, 18], [58, 36, 40], [96, 62, 56], [150, 100, 80], [200, 150, 110]];
  for (const [side, off] of [[-1, 0], [1, Math.PI]]) { const q = ph + off, st = walk ? Math.round(Math.sin(q) * 3) : 0, lift = walk ? Math.max(0, -Math.cos(q)) * 2 : 0; limb(s, cx + side * 2, base - 15 - bob, cx + side * 2 + st, base - lift - 1, 3, side < 0 ? [A[0], A[1], A[2]] : [A[0], A[2], A[3]]); }
  const ty = base - 31 - bob;
  for (let y = ty; y < ty + 16; y++) { const hw = 5.5 + (y - ty) * 0.12; for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) s.set(x, y, x < cx - 1 ? A[3] : x < cx + 2 ? A[2] : A[1]); }          // túnica
  for (let k = 0; k < 6; k++) s.set(cx - 5, ty + 2 + k * 2, EMBER[1]);                                                                                                       // aljava com penas
  limb(s, cx - 6, ty + 1, cx - 9, ty - 5, 2, [A[0], A[2], A[3]]);
  const hy = ty - 8;                                                                                                                                                         // capuz
  shadeBall(s, cx, hy + 5, 6, 6, (v) => (v > 0.6 ? A[3] : v > 0.3 ? A[2] : A[1])); for (let y = hy - 4; y < hy + 1; y++) for (let x = cx - 1 - (hy - y) * 0 ; x <= cx + 1; x++) s.set(x, y, A[2]);
  s.set(cx + 2, hy + 6, EMBER[3]); s.set(cx + 3, hy + 6, EMBER[2]); s.set(cx + 4, hy + 6, EMBER[1]);
  shadeBall(s,cx+2,hy+5,3.4,3.5,()=>A[0]);
  seg(s,cx,hy+5,cx+4,hy+5,1,EMBER[2]);s.set(cx+3,hy+5,EMBER[3]);
  seg(s,cx-4,hy+2,cx-2,hy,1,A[4]);seg(s,cx-3,hy+8,cx+3,hy+9,1,A[1]);
  for(let i=0;i<9;i++)s.set(cx-4+i,ty+2+i, A[i%3===0?4:1]);
  seg(s,cx-6,ty+13,cx+6,ty+13,1,A[0]);s.set(cx+2,ty+13,EMBER[2]);
  const bx = cx + 12, by = ty + 8;                                                                                                                                           // arco
  for (let k = -9; k <= 9; k++) { const x = bx + Math.round((1 - (k / 9) ** 2) * 4 * (draw ? 1.4 : 1)); s.set(x, by + k, A[0]); s.set(x - 1, by + k, EMBER[1]); }
  if (draw) { for (let k = 0; k < 14; k++) s.set(bx - 5 + k * 1, by, k > 10 ? EMBER[3] : k > 7 ? EMBER[2] : [190, 170, 140]); limb(s, bx - 5, by - 9, bx - 6, by, 0.5, [A[0], A[0], A[0]]); }
  else limb(s, bx + 4, by - 9, bx + 4, by + 9, 0.5, [A[0], A[0], A[0]]);
  limb(s, cx + 3, ty + 4, bx - 1, by - 1, 2, [A[0], A[2], A[3]]);
}

// ---------------------------------------------------------------- definições
Object.assign(WILDLIFE, {
  besouromagma: { name: 'Besouro de magma', where: 'Forja e Magnético', hostile: true, monstro: true, lavaProof: true, hp: 34, speed: 38, damage: 9, w: 24, h: 12, drops: [[ITEM.SALAMANDER_SCALE, 1, 2, 0.5], [ITEM.COAL, 1, 3]], color: '#c0562a', shape: 'besouromagma' },
  golemmagnetita: { name: 'Golem de magnetita', where: 'Trecho Magnético', hostile: true, monstro: true, heavy: true, hp: 150, speed: 22, damage: 14, w: 26, h: 40, drops: [[ITEM.MAGNETITE, 3, 6], [ITEM.CORE_SHARD, 1, 1, 0.2]], color: '#5a78b0', shape: 'golemmagnetita' },
  craniobrasa: { name: 'Crânio ardente', where: 'Ossário e Forja', hostile: true, monstro: true, lavaProof: true, hp: 36, speed: 40, damage: 7, w: 16, h: 16, drops: [[ITEM.BONE, 1, 3], [ITEM.AMBER, 1, 1, 0.3]], color: '#e0d0a0', shape: 'craniobrasa' },
  guardaobsidiana: { name: 'Guarda de obsidiana', where: 'Fortalezas de lava', hostile: true, monstro: true, heavy: true, hp: 95, speed: 30, damage: 12, w: 18, h: 36, drops: [[ITEM.BRONZE, 1, 3], [ITEM.METAL_BAR, 1, 2, 0.4], [ITEM.CORE_SHARD, 1, 1, 0.1]], color: '#4a3c60', shape: 'guardaobsidiana' },
  arqueirobrasa: { name: 'Arqueiro de brasa', where: 'Fortalezas de lava', hostile: true, monstro: true, hp: 55, speed: 34, damage: 8, w: 16, h: 34, drops: [[ITEM.BRONZE, 1, 2], [ITEM.ARROW, 4, 10], [ITEM.EMBER_LILY, 1, 1, 0.3]], color: '#8a5a48', shape: 'arqueirobrasa' },
  capitaofortaleza: { name: 'Capitão da fortaleza', where: 'Fortalezas de lava', hostile: true, monstro: true, heavy: true, hp: 300, speed: 26, damage: 20, w: 22, h: 42, drops: [[ITEM.BRONZE, 4, 8], [ITEM.CORE_SHARD, 2, 4], [ITEM.AMBER, 2, 5], [ITEM.GOLD, 3, 7]], color: '#6a4060', shape: 'capitaofortaleza' },
});
Object.assign(WILD_SIZES, { besouromagma: [32, 18], golemmagnetita: [36, 58], craniobrasa: [28, 34], guardaobsidiana: [40, 48], arqueirobrasa: [34, 46], capitaofortaleza: [40, 52] });
for (const k of ['besouromagma', 'golemmagnetita', 'craniobrasa', 'guardaobsidiana', 'arqueirobrasa', 'capitaofortaleza']) { WILD_PALETTES[k] = OBS; MOB_SFX[k] = k === 'craniobrasa' ? 'bat' : k === 'besouromagma' ? 'bug' : 'bug'; }
Object.assign(BESTIARY_LORE, {
  besouromagma: 'Besouro de carapaça de basalto, com a brasa escorrendo pelas rachaduras. Anda devagar até te ver; aí abaixa a cabeça e investe.',
  golemmagnetita: 'Pedregulho vivo cheio de cristais de magnetita. Puxa o ferro de quem passa por perto e esmaga o chão com os punhos.',
  craniobrasa: 'O crânio de algo que morreu no Ossário e não percebeu. Flutua com uma chama na cabeça e cospe brasa de longe.',
  guardaobsidiana: 'Guarda das fortalezas de lava, de armadura de obsidiana e escudo-torre. O escudo segura os golpes de frente, mas as costas são frágeis.',
  arqueirobrasa: 'Atira flechas em chamas e recua quando alguém chega perto. Prefere ficar nas torres.',
  capitaofortaleza: 'Comanda a fortaleza. Muito maior que os guardas, de elmo com chifres e capa vermelha; o golpe dele racha o chão em volta.',
});

// ---------------------------------------------------------------- comportamento
function coreHitFx(g, m, n = 4) { for (let i = 0; i < n; i++) coreParticle(g, { x: m.cx + (Math.random() - 0.5) * 10, y: m.cy + (Math.random() - 0.5) * 10, vx: (Math.random() - 0.5) * 120, vy: -Math.random() * 90, life: 0.3, maxLife: 0.3, color: i & 1 ? '#ffb040' : '#ff6a20', w: 2, h: 2, gravity: 300 }); }
// Base dos bichos de chão: patrulha, persegue, ataca (estocada, esmagão ou investida) e tem escudo na frente se quiser
function coreGroundHook(cfg) {
  return {
    paint: cfg.paint, outline: cfg.outline || [12, 8, 14],
    setup(m) { m.state = 'patrol'; m.stateT = 0; m.aware = false; m.atkCd = 1 + Math.random(); m.thinkTimer = 0; m.dir = 0; },
    frame(m) {
      if (m.state === 'windup') return cfg.windFrame;
      if (m.state === 'strike') return cfg.strikeFrame;
      if (Math.abs(m.vx) > 3) return Math.floor(m.gait) % 4;
      return 4;
    },
    hit(m, damage, fromX) {
      const front = cfg.shield && Math.sign(fromX - m.cx) === m.facing;
      const dmg = front ? Math.max(1, Math.round(damage * cfg.shield)) : damage;
      if (front) { playSfx('coreClank', m.cx, m.cy); coreHitFx(game, m, 3); }
      m.aware = true;
      Pig.prototype.hit.call(m, dmg, fromX);
      m.vx *= 0.3; m.vy = Math.max(m.vy, -80);
    },
    update(m, dt, w, p) {
      const g = game;
      m.clock += dt; m.stateT += dt; m.hurtTimer = Math.max(0, m.hurtTimer - dt); m.atkCd -= dt; m.thinkTimer -= dt;
      const dx = p.cx - m.cx, dist = Math.hypot(dx, p.cy - m.cy), sameLevel = Math.abs(p.cy - m.cy) < 3 * T;
      if (!m.aware && dist < (cfg.sight || 13) * T && sameLevel) { m.aware = true; playSfx('coreWhir', m.cx, m.cy); }
      else if (m.aware && dist > (cfg.sight || 13) * 2 * T) m.aware = false;
      let want = 0;
      if (m.state === 'patrol' || m.state === 'chase') {
        m.state = m.aware ? 'chase' : 'patrol';
        if (m.aware) {
          want = Math.abs(dx) > cfg.reach * 0.6 ? Math.sign(dx) : 0;
          if (m.atkCd <= 0 && Math.abs(dx) < cfg.reach && sameLevel) { m.state = 'windup'; m.stateT = 0; m.facing = Math.sign(dx) || m.facing; if (cfg.kind === 'dash') m.dashDir = m.facing; }
        } else {
          if (m.thinkTimer <= 0) { m.dir = Math.random() < 0.4 ? 0 : Math.random() < 0.5 ? -1 : 1; m.thinkTimer = 1.5 + Math.random() * 3; }
          want = m.dir || 0;
          const home = m.fortress;
          if (home && ((want < 0 && m.x < (home.x0 + 3) * T) || (want > 0 && m.x + m.w > (home.x1 - 3) * T))) { m.dir = -want; want = m.dir; }
        }
      } else if (m.state === 'windup') {
        if (m.stateT > cfg.windup) { m.state = 'strike'; m.stateT = 0; m.struck = false; }
      } else if (m.state === 'strike') {
        if (!m.struck) {
          m.struck = true;
          if (cfg.kind === 'stab') {
            const fx = m.cx + m.facing * (cfg.reach * 0.5);
            playSfx('coreWhir', m.cx, m.cy);
            if (p.invulnerable <= 0 && Math.abs(p.cx - fx) < cfg.reach * 0.6 + 6 && Math.abs(p.cy - m.cy) < 2.4 * T && Math.sign(p.cx - m.cx) === m.facing) damageMonsterPlayer(g, cfg.dmg, m.cx);
          } else if (cfg.kind === 'slam') {
            g.shake = Math.max(g.shake || 0, 3); playSfx('coreSlam', m.cx, m.y + m.h);
            const fx = m.cx + m.facing * 12;
            for (let i = 0; i < 10; i++) coreParticle(g, { x: fx + (Math.random() - 0.5) * 24, y: m.y + m.h, vx: (Math.random() - 0.5) * 200, vy: -Math.random() * 160, life: 0.5, maxLife: 0.5, color: i & 1 ? '#6a6a80' : '#a0a0b8', w: 2, h: 2, gravity: 400 });
            (g.coreRings ??= []).push({ x: fx, y: m.y + m.h, t: 0 });
            if (p.invulnerable <= 0 && Math.abs(p.cx - fx) < 3 * T && p.y + p.h > m.y + 4) damageMonsterPlayer(g, cfg.dmg, m.cx);
          }
        }
        if (cfg.kind === 'dash') { m.vx = m.dashDir * m.def.speed * 4.2; if (m.stateT > 0.55) { m.state = 'chase'; m.stateT = 0; m.atkCd = cfg.cd; } }
        else if (m.stateT > cfg.recover) { m.state = 'chase'; m.stateT = 0; m.atkCd = cfg.cd + Math.random(); }
      }
      if (cfg.pull && m.aware && dist < cfg.pull * T && p.invulnerable <= 0) p.vx += (m.cx - p.cx) / Math.max(40, dist) * 26 * dt * 60 * 0.4;   // ímã: puxa o jogador devagar
      if (m.state !== 'windup' && !(m.state === 'strike' && cfg.kind === 'dash') && m.hurtTimer <= 0) m.vx = m.state === 'strike' ? 0 : want * m.def.speed * (m.aware ? 1.3 : 0.6);
      else if (m.state === 'windup') m.vx = 0;
      if (want) m.facing = want;
      m.damage = (m.state === 'strike' && cfg.kind !== 'dash') || m.state === 'windup' ? 0 : m.def.damage;
      const oldX = m.x;
      m.applyGravity(dt); m.moveX(m.vx * dt, w);
      if (m.vx && Math.abs(m.x - oldX) < 0.01 && m.onGround) m.vy = -300;
      m.moveY(m.vy * dt, w);
      m.gait += Math.abs(m.x - oldX) * 12 / 26;
      m.settleStep(dt);
    },
  };
}
SHAPE_HOOKS.besouromagma = coreGroundHook({ paint: paintMagmaBeetle, kind: 'dash', reach: 9 * T, windup: 0.35, windFrame: 5, strikeFrame: 5, cd: 1.8, sight: 12, dmg: 12 });
SHAPE_HOOKS.golemmagnetita = coreGroundHook({ paint: paintMagnetGolem, kind: 'slam', reach: 2.6 * T, windup: 0.8, recover: 0.9, windFrame: 5, strikeFrame: 6, cd: 1.8, sight: 12, dmg: 22, shield: 0.7, pull: 9 });
SHAPE_HOOKS.guardaobsidiana = coreGroundHook({ paint: (s, pal, f) => paintKnight(s, pal, f, { armor: OBS }), kind: 'stab', reach: 2.8 * T, windup: 0.5, recover: 0.45, windFrame: 5, strikeFrame: 6, cd: 1.1, sight: 12, dmg: 16, shield: 0.5 });
SHAPE_HOOKS.capitaofortaleza = coreGroundHook({ paint: (s, pal, f) => paintKnight(s, pal, f, { armor: [[30, 12, 16], [74, 26, 30], [120, 44, 44], [172, 76, 66], [230, 130, 100]], horns: true, cape: true, tall: 4 }), kind: 'slam', reach: 3 * T, windup: 0.7, recover: 0.8, windFrame: 5, strikeFrame: 6, cd: 1.6, sight: 14, dmg: 26, shield: 0.55 });

// Arqueiro: mantém distância e atira flecha em chamas (reta, com pouca queda)
SHAPE_HOOKS.arqueirobrasa = {
  paint: paintArcher, outline: [16, 10, 12],
  setup(m) { m.state = 'patrol'; m.stateT = 0; m.aware = false; m.shootCd = 1 + Math.random(); m.dir = 0; m.thinkTimer = 0; },
  frame(m) { return m.state === 'aim' ? 5 : Math.abs(m.vx) > 3 ? Math.floor(m.gait) % 4 : 4; },
  update(m, dt, w, p) {
    const g = game;
    m.clock += dt; m.stateT += dt; m.hurtTimer = Math.max(0, m.hurtTimer - dt); m.shootCd -= dt; m.thinkTimer -= dt;
    const dx = p.cx - m.cx, dy = p.cy - m.cy, dist = Math.hypot(dx, dy);
    if (!m.aware && dist < 15 * T) { m.aware = true; playSfx('coreWhir', m.cx, m.cy); } else if (m.aware && dist > 30 * T) m.aware = false;
    let want = 0;
    if (m.state === 'aim') {
      m.vx = 0; m.facing = Math.sign(dx) || m.facing;
      if (m.stateT > 0.6 && !m.shot) {
        m.shot = true; const sp = 330, a = Math.atan2(dy - 6, dx), t = dist / sp;
        (g.coreShots ??= []).push({ x: m.cx + m.facing * 12, y: m.y + 12, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 520 * t * 0.5 * 0.2, damage: 11, life: 2.2, grav: 90 });
        playSfx('coreSpit', m.cx, m.cy);
      }
      if (m.stateT > 0.9) { m.state = 'patrol'; m.stateT = 0; m.shot = false; m.shootCd = 1.8 + Math.random(); }
    } else {
      if (m.aware) {
        if (dist < 5 * T) want = -Math.sign(dx);                                       // recua se chegam perto
        else if (dist > 12 * T) want = Math.sign(dx);
        if (m.shootCd <= 0 && dist < 15 * T && Math.abs(dy) < 6 * T) { m.state = 'aim'; m.stateT = 0; m.shot = false; }
      } else if (m.thinkTimer <= 0) { m.dir = Math.random() < 0.5 ? 0 : Math.random() < 0.5 ? -1 : 1; m.thinkTimer = 2 + Math.random() * 3; }
      if (!m.aware) want = m.dir || 0;
      const home = m.fortress;
      if (home && ((want < 0 && m.x < (home.x0 + 3) * T) || (want > 0 && m.x + m.w > (home.x1 - 3) * T))) want = -want;
      if (m.hurtTimer <= 0 && m.state !== 'aim') m.vx = want * m.def.speed;
      if (m.aware && m.state !== 'aim') m.facing = Math.sign(dx) || m.facing; else if (want) m.facing = want;
    }
    m.damage = 0;
    const oldX = m.x;
    m.applyGravity(dt); m.moveX(m.vx * dt, w);
    if (m.vx && Math.abs(m.x - oldX) < 0.01 && m.onGround) m.vy = -300;
    m.moveY(m.vy * dt, w);
    m.gait += Math.abs(m.x - oldX) * 12 / 24;
    m.settleStep(dt);
  },
};

// Crânio ardente: voa em volta do jogador a uns 6 blocos e cospe brasa
SHAPE_HOOKS.craniobrasa = {
  paint: paintEmberSkull, outline: [16, 10, 10],
  setup(m) { m.shootCd = 1.5 + Math.random() * 1.5; m.angle = Math.random() * 6.28; m.state = 'fly'; m.stateT = 0; m.aware = false; },
  frame(m) { return m.state === 'spit' ? 4 : Math.floor(m.clock * 8) & 3; },
  update(m, dt, w, p) {
    const g = game;
    m.clock += dt; m.stateT += dt; m.hurtTimer = Math.max(0, m.hurtTimer - dt); m.shootCd -= dt;
    const dx = p.cx - m.cx, dy = p.cy - m.cy, dist = Math.hypot(dx, dy);
    m.aware = dist < 18 * T;
    let tx = m.cx, ty = m.cy;
    if (m.aware) { m.angle += dt * 0.9; tx = p.cx + Math.cos(m.angle) * 6 * T; ty = p.cy - 3 * T + Math.sin(m.angle * 1.7) * 1.5 * T; }
    else { m.angle += dt * 0.4; ty = m.cy + Math.sin(m.clock * 1.3) * 6; tx = m.cx + Math.cos(m.clock * 0.7) * 6; }
    const sp = m.def.speed * (m.aware ? 1.5 : 0.6), ax = tx - m.cx, ay = ty - m.cy, ad = Math.hypot(ax, ay) || 1;
    if (m.hurtTimer <= 0) { m.vx += (ax / ad * sp - m.vx) * Math.min(1, dt * 3); m.vy += (ay / ad * sp - m.vy) * Math.min(1, dt * 3); }
    if (m.state === 'spit') {
      m.vx *= 0.9; m.vy *= 0.9;
      if (m.stateT > 0.35 && !m.shot) { m.shot = true; const a = Math.atan2(dy, dx); (g.coreShots ??= []).push({ x: m.cx, y: m.cy + 4, vx: Math.cos(a) * 230, vy: Math.sin(a) * 230, damage: 9, life: 2.5, grav: 0 }); playSfx('coreSpit', m.cx, m.cy); }
      if (m.stateT > 0.6) { m.state = 'fly'; m.shot = false; m.shootCd = 2 + Math.random() * 1.5; }
    } else if (m.aware && m.shootCd <= 0 && dist > 3 * T) { m.state = 'spit'; m.stateT = 0; m.shot = false; }
    m.facing = dx >= 0 ? 1 : -1;
    const ox = m.x, oy = m.y;
    m.moveX(m.vx * dt, w); if (Math.abs(m.x - ox) < Math.abs(m.vx * dt) * 0.2) m.vx *= -0.5;
    m.moveY(m.vy * dt, w); if (Math.abs(m.y - oy) < Math.abs(m.vy * dt) * 0.2) m.vy *= -0.5;
    m.onGround = false;
    m.damage = m.def.damage;
    if (Math.random() < dt * 20) coreParticle(g, { x: m.cx + (Math.random() - 0.5) * 8, y: m.y, vx: (Math.random() - 0.5) * 20, vy: -30, life: 0.4, maxLife: 0.4, color: '#ffae40', w: 1, h: 1, gravity: -20 });
  },
};

// ---------------------------------------------------------------- nascimento natural
{
  const base = trySpawnCoreCreature;
  trySpawnCoreCreature = function (g) {
    if (Math.random() < 0.5) {
      const w = g.world, p = g.player, zone = coreZoneAt(w, p.cx / T), r = Math.random();
      const kind = zone === CORE_ZONE.FORJA ? (r < 0.6 ? 'besouromagma' : 'craniobrasa') : zone === CORE_ZONE.MAGNETICO ? (r < 0.5 ? 'golemmagnetita' : 'besouromagma') : zone === CORE_ZONE.OSSARIO ? 'craniobrasa' : (r < 0.5 ? 'besouromagma' : 'craniobrasa');
      if (g.mobs.filter((m) => m.hostile && !m.boss && !m.hall && !m.fortress).length >= 6) return base(g);
      for (let n = 0; n < 30; n++) {
        const tx = offScreenColumn(g, Math.random() < 0.5 ? -1 : 1, Math.floor(Math.random() * 10));
        if (tx < 2 || tx >= w.w - 2) continue;
        let y = Math.floor(p.cy / T) - 10 + Math.floor(Math.random() * 20);
        if (kind === 'craniobrasa') { if (w.getTile(tx, y) !== TILE.AIR || !inCoreBand(w, tx, y)) continue; }
        else { while (y < w.h - 3 && !w.isSolid(tx, y + 1) && w.getTile(tx, y + 1) !== TILE.LAVA) y++; if (w.getTile(tx, y) !== TILE.AIR || !inCoreBand(w, tx, y) || w.getTile(tx, y + 1) === TILE.LAVA) continue; }
        const m = new Wildlife(kind, tx * T, 0);
        m.y = kind === 'craniobrasa' ? y * T - 4 : (y + 1) * T - m.h - 0.01;
        if (m.collides(w, m.x, m.y) || !mobOffScreen(g, m, 1)) continue;
        g.mobs.push(m); return true;
      }
    }
    return base(g);
  };
}
