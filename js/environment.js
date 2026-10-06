'use strict';

// Shared tuning; procedural decoration never changes tiles, collision or saved worlds.
const ENVIRONMENT = window.ENVIRONMENT = {
  decorationDensity: 0.62, vegetationMotion: 1, particleLimit: 150,
  caveGlow: 0.16, ambienceVolume: 0.55,
  weather: { calmMin: 65, calmMax: 150, durationMin: 45, durationMax: 130,
    transition: 12, extremeCooldown: 720, dropLimit: 520, sandLimit: 190, tornadoChance: 0.012 },
};
// Uma entrada por região de caverna de js/underground.js, na mesma ordem do enum UNDER:
// a penumbra e a rocha do chão passam a falar a mesma língua.
const CAVE_HABITATS = [
  {name:'Câmara seca',color:[155,131,102],glow:[190,164,111],wet:0},
  {name:'Gruta musgosa',color:[91,147,77],glow:[131,199,111],wet:1},
  {name:'Toca de micélio',color:[100,143,176],glow:[98,218,212],wet:.8},
  {name:'Gruta de cristal',color:[157,132,185],glow:[169,146,247],wet:.3},
  {name:'Caverna gelada',color:[126,164,192],glow:[176,222,244],wet:.45},
  {name:'Câmara de magma',color:[168,86,52],glow:[246,146,60],wet:0},
];
const ENV_NATURAL = new Set([TILE.DIRT,TILE.GRASS,TILE.JUNGLE_GRASS,TILE.DRY_GRASS,TILE.SAKURA_GRASS,TILE.STONE,TILE.MUD,TILE.SAND,TILE.SANDSTONE,TILE.SNOW,
  TILE.MOSS_STONE,TILE.MYCELIUM_STONE,TILE.FROZEN_STONE,TILE.MAGMA_STONE]); // as rochas de gruta também ganham enfeite
function environmentExposure(world,x,y) {
  const tx=Math.floor(x/T),ty=Math.floor(y/T);
  if(!world.inBounds(tx,ty)||world.isSolid(tx,ty))return 0;
  if(world.isSkyExposed(tx,ty))return 1;
  const rx=tx-world.lx,ry=ty-world.ly;
  if(rx<0||ry<0||rx>=LIGHT_W||ry>=LIGHT_H)return 0;
  return Math.pow(world.skyLight[ry*LIGHT_W+rx]/15,3)*.18;
}
// Ilha do céu só segura o tempo (chuva, neve, areia) quando está sendo desenhada: com a barriga
// dela dentro da tela. Fora da visão ela não tem física de clima e o evento chega ao chão do bioma.
// WEATHER_VIEW_TOP = topo da tela em px do mundo (atualizado pelo js/weather.js a cada quadro).
let WEATHER_VIEW_TOP=-Infinity;
function setWeatherView(g){if(g?.cam)WEATHER_VIEW_TOP=g.cam.y;}
// Primeira linha que segura o tempo naquela coluna
function weatherCeiling(world,tx){
  const gapTop=world.skyGapTop[tx],gapBottom=world.skyGapBottom[tx];
  if(gapBottom>gapTop&&gapTop*T<WEATHER_VIEW_TOP)return gapBottom; // a ilha está acima da tela: não conta
  return world.skyTop[tx];
}
function weatherExposed(world,x,y) {
  const tx=Math.floor(x/T),ty=Math.floor(y/T);
  return world.inBounds(tx,ty)&&!world.isSolid(tx,ty)&&ty<weatherCeiling(world,tx);
}
// Céu à vista, contando o vão embaixo das ilhas do céu: luz do relâmpago e véu do tempo
function weatherLit(world,x,y) {
  const tx=Math.floor(x/T),ty=Math.floor(y/T);
  return world.inBounds(tx,ty)&&!world.isSolid(tx,ty)&&world.isSkyExposed(tx,ty);
}
function desertWeight(world,x) {
  const tx=Math.floor(x/T);if(world.biomeAt(tx)!==BIOME.DESERT)return 0;
  let d=7;for(let k=1;k<=6;k++)if(world.biomeAt(tx-k)!==BIOME.DESERT||world.biomeAt(tx+k)!==BIOME.DESERT){d=k;break;}
  return smoothstep(clamp((d-1)/6,0,1));
}
const environmentHabitatCache=new WeakMap();
function caveHabitat(world,x,y) {
  let cache=environmentHabitatCache.get(world);
  if(!cache||cache.revision!==world.lightRevision){cache={revision:world.lightRevision,cells:new Map()};environmentHabitatCache.set(world,cache);}
  const key=y*world.w+x;
  if(cache.cells.has(key))return cache.cells.get(key);
  const value=computeCaveHabitat(world,x,y);
  if(cache.cells.size>=16384)cache.cells.clear();
  cache.cells.set(key,value);return value;
}
function computeCaveHabitat(world,x,y) {
  const underground=y>world.surface[clamp(x,0,world.w-1)]+4&&!world.isSkyExposed(x,y);
  if(!underground)return null;
  // A região vem de js/underground.js: a mesma que decidiu a rocha na geração. Os quatro
  // cantos da célula entram com peso, para uma gruta virar a outra sem emenda.
  const n=CAVE_HABITATS.length;
  const gx=x/UNDER.cell[0],gy=y/UNDER.cell[1],ix=Math.floor(gx),iy=Math.floor(gy);
  const fx=smoothstep(gx-ix),fy=smoothstep(gy-iy);
  const weights=new Array(n).fill(0);
  for(let j=0;j<2;j++)for(let i=0;i<2;i++){
    const type=undergroundRegion(world,(ix+i)*UNDER.cell[0]+1,(iy+j)*UNDER.cell[1]+1);
    weights[type]+=(i?fx:1-fx)*(j?fy:1-fy);
  }
  let wet=0;for(let i=0;i<n;i++)wet+=weights[i]*CAVE_HABITATS[i].wet;
  let water=false;for(const [dx,dy]of [[0,0],[-2,0],[2,0],[0,2]])if(world.hasWater(x+dx,y+dy))water=true;
  if(water){weights[UNDER.GROTTO]+=.35;wet=Math.min(1,wet+.3);}
  const total=weights.reduce((a,b)=>a+b,0)||1;for(let i=0;i<n;i++)weights[i]/=total;
  let r=hash2(x>>1,y>>1,world.seed+190),kind=0;for(let i=0;i<n;i++){r-=weights[i];if(r<=0){kind=i;break;}}
  const color=[0,0,0];for(let i=0;i<n;i++)for(let c=0;c<3;c++)color[c]+=weights[i]*CAVE_HABITATS[i].color[c];
  return {kind,weights,wet,water,color:color.map(Math.round)};
}
function environmentWind(g,x,y) {
  const w=g.weather,t=w?.clock||0,exposure=environmentExposure(g.world,x,y);
  const gust=.72+.2*Math.sin(t*.59+x*.003)+.08*Math.sin(t*1.37+y*.009);
  let vx=(w?.wind||0)*gust*exposure,vy=0;
  const f=w?.funnel;
  if(f&&f.strength>.001){
    const dx=x-f.x,dy=y-(f.y-f.height*.45),d=Math.hypot(dx,dy*.6),range=f.radius*2.4;
    const force=Math.pow(clamp(1-d/range,0,1),2)*f.strength*130*exposure;
    vx+=(-dy/Math.max(10,d)-dx/Math.max(10,d)*.25)*force;
    vy+=(dx/Math.max(10,d)-.35)*force;
  }
  return {x:vx,y:vy};
}
// Pedra de caverna das estalactites e estalagmites (claro -> escuro)
const ENV_SPIKE={hi:[206,194,170],light:[170,158,136],mid:[136,126,108],dark:[104,96,82],deep:[76,70,60]};
const envSpriteCache=new Map();
for (const sprite of [...DECOR.pebbles,...DECOR.stalactites]) sprite.envFlex=0;
for (const sprite of DECOR.roots) sprite.envFlex=.25;
function environmentSprite(kind,variant=0) {
  if(kind==='sakuraGrass')return sakuraGrassSprites[variant&3];
  const key=kind+':'+variant;if(envSpriteCache.has(key))return envSpriteCache.get(key);
  const rnd=mulberry32(1709+variant*71+kind.length*97),W=24,H=kind==='vine'||kind==='root'?40:28;
  const c=makeCanvas(W,H),p=c.getContext('2d');p.imageSmoothingEnabled=false;
  const rect=(x,y,w,h,col)=>{p.fillStyle=col;p.fillRect(Math.round(x),Math.round(y),w,h);};
  const line=(x,y,xx,yy,col)=>{const n=Math.max(Math.abs(xx-x),Math.abs(yy-y));for(let i=0;i<=n;i++)rect(lerp(x,xx,i/(n||1)),lerp(y,yy,i/(n||1)),1,1,col);};
  c.envKind=kind;c.envFlex=0;c.envHang=kind==='vine'||kind==='root'||kind==='stalactite';
  if(kind==='vine'||kind==='root'){
    c.envFlex=kind==='vine'?1:.25;
    for(let j=0;j<3;j++){let x=5+j*7;const len=15+rnd()*24;for(let y=0;y<len;y++){
      x+=Math.sin(y*.4+j)*.23;rect(x,y,1,1,kind==='vine'?'#48643d':'#70563b');
      if(kind==='vine'&&y%5===0){rect(x-3,y,3,2,'#658842');rect(x+1,y+2,3,2,'#83a252');}
      if(kind==='root'&&y%8===0)line(x,y,x+(j%2?4:-4),y+4,'#8c7050');
    }}
  }else if(kind==='mushroom'){
    // Moita de cogumelos-lanterna (js/underground.js): um grande e dois pequenos
    c.envGlow=[98,218,212];c.envFlex=.22;
    const hi=(a,b)=>a+Math.floor(rnd()*(b-a+1)),base=H-1;
    const g=mushroomGrid(W,H,[
      {x:hi(4,6),base,stem:hi(4,7),cap:hi(2,3),capH:3,lean:-.5},{x:hi(17,19),base,stem:hi(3,6),cap:hi(2,3),capH:3,lean:.5},
      {x:hi(11,12),base,stem:hi(8,12),cap:hi(4,5),capH:hi(4,5),lean:(rnd()-.5)*.8},
    ],rnd);
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){const k=g[y][x];if(k!=='.')rect(x,y,1,1,rgb(GLOW_CAP_CORES[k]));}
  }else if(kind==='stalactite'||kind==='stalagmite'){
    // Espetos com volume, anéis e gota na ponta (js/decor.js)
    const hang=kind==='stalactite',s=new Sprite(W,H);
    const main=6+Math.floor(rnd()*12),spikes=[{x:main,len:hang?14+Math.floor(rnd()*11):12+Math.floor(rnd()*10),r:2.6+rnd(),tilt:(rnd()-.5)*.1}];
    for(const side of [-1,1])if(rnd()<.85){const x=main+side*(5+Math.floor(rnd()*3));if(x>2&&x<W-3)spikes.push({x,len:6+Math.floor(rnd()*8),r:1.4+rnd()*.6,tilt:side*rnd()*.08});}
    paintRockSpikes(s,H,spikes,ENV_SPIKE,rnd,hang);
    p.drawImage(s.finish([46,40,34]),0,0);
  }else if(kind==='crystal'){
    // Drusa facetada (js/underground.js): dois prismas finos atrás, um alto no meio e dois
    // tortos na frente, com pedrinhas na base. A cor muda de uma drusa para a outra.
    const pal=CRYSTAL_PALETTES[variant%CRYSTAL_PALETTES.length],cores=crystalCores(pal);
    c.envGlow=pal.d.map(v=>Math.round(v*.85));
    const base=H-3,hi=(a,b)=>a+Math.floor(rnd()*(b-a+1));
    const g=crystalShardGrid(W,H,[
      {x:hi(6,8),base,h:hi(11,15),r:1,tilt:-.18,back:true},{x:hi(15,17),base,h:hi(10,14),r:1,tilt:.2,back:true},
      {x:hi(10,12),base,h:hi(19,24),r:2,tilt:(rnd()-.5)*.14},
      {x:hi(4,6),base,h:hi(8,12),r:1,tilt:-.38},{x:hi(17,19),base,h:hi(7,11),r:1,tilt:.42},
    ],rnd);
    crystalRocks(g,H-2,rnd);crystalRocks(g,H-1,rnd);
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){const k=g[y][x];if(k!=='.')rect(x,y,1,1,rgb(cores[k]));}
  }else if(kind==='rocks'||kind==='litter'||kind==='log'){
    for(let j=0;j<(kind==='log'?1:5);j++){const x=kind==='log'?2:Math.floor(rnd()*20),y=H-2-Math.floor(rnd()*3);
      if(kind==='log'){rect(x,H-7,19,6,'#654e34');rect(x+1,H-6,17,2,'#967445');rect(x+17,H-6,3,4,'#b59054');line(x+4,H-7,x+1,H-12,'#72593c');}
      else{const col=kind==='litter'?['#80643b','#a98b47','#555d33'][j%3]:['#6b685d','#a0977d','#817969'][j%3];rect(x,y,2+Math.floor(rnd()*4),2,col);}}
  }else{
    c.envFlex=kind==='reed'?.65:1;const dry=kind==='dry',fern=kind==='fern';
    if(kind==='moss'){c.envGlow=[118,181,95];c.envFlex=.3;}
    for(let j=0;j<6;j++){const x=3+j*3,h=5+Math.floor(rnd()*(kind==='reed'?21:16)),top=H-h;
      line(x,H-1,x+(j%2?2:-2),top,dry?'#a68d50':'#537445');
      if(fern||kind==='moss')for(let y=top+3;y<H-3;y+=4){line(x,y,x-4,y-2,'#769d55');line(x,y,x+4,y-2,'#8baa62');}
      else if(kind==='reed')rect(x-1,top,2,5,'#897044');
      else if(kind==='flower'&&j%2===0){rect(x-2,top,5,2,variant%2?'#bdbce0':'#d5b486');rect(x,top-1,1,3,'#f3db99');}
      else line(x,H-4,x+(j%2?4:-4),H-9,dry?'#cfb573':'#88a65a');
    }
  }
  envSpriteCache.set(key,c);return c;
}
// =====================================================================================
//  ENFEITES COLHÍVEIS
// =====================================================================================
// O sorteio procedural continua decidindo o que nasce em cada célula, mas o resultado
// agora é consultado uma vez e guardado, e cada enfeite é uma coisa de verdade: colher
// solta item e deixa o lugar vazio. Mato, flor e pedrinha voltam a nascer depois de um
// tempo; cristal, cogumelo e formações de rocha não voltam.
Object.assign(ITEM, { FIBER: 152, FLOWER: 153, INSECT: 154 });
defItem(ITEM.FIBER,  { name: 'Fibra vegetal' });
defItem(ITEM.FLOWER, { name: 'Flor do campo' });
defItem(ITEM.INSECT, { name: 'Inseto', cura: 4 });

ITEM_ART[ITEM.FIBER] = { // feixe de fios amarrado no meio com um cordão
  cores: { a: [150, 128, 72], b: [198, 178, 108], c: [232, 216, 154], k: [108, 84, 46] },
  pixels: [
    '................',
    '...a.b..c.b.a...',
    '...ab.b.c.b.ba..',
    '...ab.bcc.bba...',
    '....ab.bc.bba...',
    '....ab.bcbba....',
    '.....abbcbba....',
    '....kkkkkkkk....',
    '....kkkkkkkk....',
    '.....abbcbba....',
    '....ab.bcbba....',
    '....ab.bc.bba...',
    '...ab.bcc.bba...',
    '...ab.b.c.b.ba..',
    '...a.b..c.b.a...',
    '................',
  ],
};
ITEM_ART[ITEM.FLOWER] = { // corola de cinco pétalas, miolo claro, caule com duas folhas
  cores: { m: [176, 96, 130], p: [236, 146, 176], P: [255, 202, 218], y: [250, 224, 120],
    s: [92, 140, 70], l: [124, 174, 92] },
  pixels: [
    '................',
    '.......m........',
    '.....mmpmm......',
    '....mpPPPpm.....',
    '...mpPPyPPpm....',
    '...mpPyyyPpm....',
    '...mpPPyPPpm....',
    '....mpPPPpm.....',
    '.....mmpmm......',
    '.......s........',
    '....llls........',
    '.......s.lll....',
    '.......s........',
    '.......s........',
    '......sss.......',
    '................',
  ],
};
ITEM_ART[ITEM.INSECT] = { // besouro visto de cima: antenas, seis patas e o vinco das élitros
  cores: { k: [34, 28, 22], b: [58, 106, 40], B: [110, 176, 74], h: [186, 226, 132], e: [244, 232, 128] },
  pixels: [
    '................',
    '.....k....k.....',
    '......k..k......',
    '.......kk.......',
    '......keek......',
    '.k...kkkkkk...k.',
    '..k.kbBBBBbk.k..',
    '...kbBBhhBBbk...',
    '.k.kbBBhhBBbk.k.',
    '...kbBBBBBBbk...',
    '..k.kbBBBBbk.k..',
    '.k...kbBBbk...k.',
    '......kkkk......',
    '................',
    '................',
    '................',
  ],
};

// item/qtd  = o que cai ao colher
// lamina    = espada, faca ou machado cortam de passagem (o clique colhe qualquer um)
// volta     = segundos até nascer de novo no mesmo lugar; 0 = não nasce mais
// bicho     = chance de sair um inseto junto
const ENV_HARVEST = {
  flower:      { item: ITEM.FLOWER, lamina: true, volta: 150, bicho: .18 },
  fern:        { item: ITEM.FIBER,  lamina: true, volta: 150, bicho: .14 },
  reed:        { item: ITEM.FIBER, count: 2, lamina: true, volta: 180, bicho: .10 },
  dry:         { item: ITEM.FIBER,  lamina: true, volta: 200, bicho: .12 },
  sakuraGrass: { item: ITEM.FIBER,  lamina: true, volta: 150, bicho: .14 },
  moss:        { item: ITEM.FIBER,  lamina: true, volta: 240 },
  vine:        { item: ITEM.FIBER,  lamina: true, volta: 240, bicho: .08 },
  root:        { item: ITEM.STICK,  lamina: true, volta: 300 },
  litter:      { item: ITEM.STICK,  lamina: true, volta: 240, bicho: .20 },
  log:         { item: ITEM.WOOD, count: 2, lamina: true, volta: 420, bicho: .16 },
  rocks:       { item: ITEM.STONE,  volta: 300 },
  stalagmite:  { item: ITEM.STONE,  volta: 0 },
  stalactite:  { item: ITEM.STONE,  volta: 0 },
  crystal:     { item: ITEM.CRYSTAL, volta: 0 },
  mushroom:    { item: ITEM.GLOW_CAP, volta: 0 },
};
const ENV_STONEY = new Set(['rocks','stalagmite','stalactite','crystal']);
// As receitas moram aqui porque js/recipes.js já rodou quando estes itens nasceram
RECIPES.push(
  { nome: 'Corda (fibra)', ingredientes: [[ITEM.FIBER, 4]], resultado: { item: ITEM.ROPE, quantidade: 2 } },
  { nome: 'Emplastro de ervas', ingredientes: [[ITEM.FIBER, 3], [ITEM.FLOWER, 2]], resultado: { item: ITEM.BANDAGE, quantidade: 1 } },
  { nome: 'Vaso de flores do campo', ingredientes: [[ITEM.FLOWER, 3], [ITEM.BRICK, 2], [ITEM.DIRT, 1]], resultado: { item: ITEM.FLOWER_POT, quantidade: 1 } },
);

// ---------- O que fazer com cristal, cogumelo e inseto ----------
// O que sai dos enfeites de caverna não fica encalhado no inventário: vira luz, vidro,
// flecha e comida.
Object.assign(ITEM, { MUSHROOM_STEW: 190, INSECT_SKEWER: 191 });
defItem(ITEM.MUSHROOM_STEW, { name: 'Ensopado de cogumelo', cura: 30, descricao: 'Cogumelo-lanterna cozido em água. Esquenta o corpo e cura bastante.' });
defItem(ITEM.INSECT_SKEWER, { name: 'Espetinho de insetos', cura: 20, descricao: 'Crocante. Melhor do que parece.' });
ITEM_DEFS[ITEM.CRYSTAL].descricao = 'Coloque no chão para iluminar, derreta em vidro ou faça lâmpadas e flechas.';
ITEM_DEFS[ITEM.GLOW_CAP].descricao = 'Coloque no chão para iluminar, ou cozinhe um ensopado, tochas e lampiões.';
ITEM_DEFS[ITEM.INSECT].descricao = 'Dá para comer cru, mas no espeto rende mais.';
// Os ícones do ensopado e do espetinho ficam em js/boss-icons.js, com a paleta dos espólios.
RECIPES.push(
  { nome: 'Vidro de cristal', ingredientes: [[ITEM.CRYSTAL, 1]], resultado: { item: ITEM.GLASS, quantidade: 4 } },
  { nome: 'Lâmpada de ametista (cristal)', ingredientes: [[ITEM.CRYSTAL, 2], [ITEM.STONE, 2]], resultado: { item: ITEM.AMETHYST_LAMP, quantidade: 2 } },
  { nome: 'Flechas de cristal', ingredientes: [[ITEM.CRYSTAL, 1], [ITEM.STICK, 2], [ITEM.FIBER, 1]], resultado: { item: ITEM.ARROW, quantidade: 8 } },
  { nome: 'Ensopado de cogumelo', ingredientes: [[ITEM.GLOW_CAP, 2], [ITEM.WATER, 1]], resultado: { item: ITEM.MUSHROOM_STEW, quantidade: 1 } },
  { nome: 'Tocha de cogumelo', ingredientes: [[ITEM.GLOW_CAP, 1], [ITEM.STICK, 1]], resultado: { item: ITEM.TORCH, quantidade: 3 } },
  { nome: 'Lampião de cogumelo', ingredientes: [[ITEM.GLOW_CAP, 3], [ITEM.GLASS, 1]], resultado: { item: ITEM.LANTERN, quantidade: 1 } },
  { nome: 'Espetinho de insetos', ingredientes: [[ITEM.INSECT, 3], [ITEM.STICK, 1]], resultado: { item: ITEM.INSECT_SKEWER, quantidade: 1 } },
);

// Cristal e cogumelo colocados no chão (ou nascidos como bloco na geração) são desenhados com o
// mesmo sprite do enfeite da caverna: o que você colhe é o que você põe. Cristal só com teto
// em cima e nada embaixo fica pendurado de cabeça para baixo.
for (const [tile, kind] of [[TILE.CRYSTAL, 'crystal'], [TILE.GLOW_CAP, 'mushroom']]) {
  TILE_DRAW[tile] = (ctx, world, x, y) => {
    const s = environmentSprite(kind, Math.floor(hash2(x, y, 4413) * 4));
    const hang = kind === 'crystal' && !world.isSolid(x, y + 1) && world.isSolid(x, y - 1);
    if (!hang) { ctx.drawImage(s, x * T - 4, (y + 1) * T - s.height + 2); return; }
    ctx.save(); ctx.translate(x * T - 4, y * T - 2 + s.height); ctx.scale(1, -1); ctx.drawImage(s, 0, 0); ctx.restore();
  };
}
// A grama da cerejeira vem pronta de js/sakura-biome.js e o mesmo sprite é usado pelo
// enfeite de tile (js/decor.js). Escrever a espécie nele mudaria o encaixe do desenho
// (js/renderer.js usa `envKind` para decidir o deslocamento), então a ligação mora aqui.
const envSpriteKind = new WeakMap();
for (const s of sakuraGrassSprites) envSpriteKind.set(s,'sakuraGrass');
const environmentKind = sprite => sprite && (sprite.envKind ?? envSpriteKind.get(sprite));

const envDecorKey = (world,x,y,ceiling) => (y*world.w+x)*2+(ceiling?1:0);

// O sorteio é caro para refazer a cada quadro em cada célula: o resultado fica guardado
// e só é jogado fora quando a luz é recalculada, que é justamente quando o mundo mudou
// (bloco colocado ou quebrado, água que parou de escorrer, janela de luz nova).
function environmentDecoration(world,x,y,ceiling=false) {
  const key=envDecorKey(world,x,y,ceiling);
  if(world.decorCut?.has(key))return null; // colhido: fica vazio até voltar a crescer
  let cache=world.decorCache;
  if(!cache||world.decorRevision!==world.lightRevision){
    cache=world.decorCache=new Map();world.decorRevision=world.lightRevision;
  }
  let hit=cache.get(key);
  if(hit===undefined){
    hit=generateEnvironmentDecoration(world,x,y,ceiling)||null;
    if(cache.size>200000)cache.clear(); // mundo gigante explorado: recomeça o cache
    cache.set(key,hit);
  }
  return hit;
}

// Enfeite que ocupa a célula (cx,cy): ele nasce no bloco de baixo (ou pendura no de
// cima) e pode subir alguns tiles, então procura os dois lados.
function environmentDecorationAt(world,cx,cy) {
  for(let k=1;k<=3;k++){
    const base=cy+k,floor=environmentDecoration(world,cx,base,false);
    if(floor&&base*T-floor.height+2<=cy*T+T-2)return {x:cx,y:base,ceiling:false,sprite:floor};
    const top=cy-k,hang=environmentDecoration(world,cx,top,true);
    if(hang&&(top+1)*T-2+hang.height>=cy*T+2)return {x:cx,y:top,ceiling:true,sprite:hang};
  }
  return null;
}

// Colhe o enfeite ancorado em (x,y). `lamina` marca o golpe de arma, que só corta mato.
// direito = colhido com o botão direito (achados do chão, js/surface-life.js): esses não saem com o esquerdo nem com a lâmina
function environmentHarvest(g,x,y,ceiling,lamina=false,direito=false) {
  const world=g.world,sprite=environmentDecoration(world,x,y,ceiling);
  const kind=environmentKind(sprite),rule=kind&&ENV_HARVEST[kind];
  if(!rule||(lamina&&!rule.lamina)||!!rule.direito!==direito)return false;
  const key=envDecorKey(world,x,y,ceiling);
  (world.decorCut??=new Map()).set(key,rule.volta?(g.clock||0)+rule.volta*(.7+Math.random()*.6):Infinity);
  world.decorCache?.delete(key);
  if(sprite.envGlow||sprite.coreGlow)world.lightDirty=true; // a colheita remove também a iluminação
  const px=x*T+T/2,py=ceiling?(y+1)*T+4:y*T-4;
  dropItem(g,rule.item,(rule.count||1)+(rule.countMax?Math.floor(Math.random()*(rule.countMax-(rule.count||1)+1)):0),px,py,0);
  if(rule.extra)for(const [item,chance,qtd] of rule.extra)if(Math.random()<chance)dropItem(g,item,qtd||1,px,py,(Math.random()-.5)*2);
  const stoney=ENV_STONEY.has(kind);
  playSfx('break',px,py,{tile:stoney?TILE.STONE:TILE.LEAVES});
  const color=sprite.envGlow||sprite.coreColor?rgb(sprite.envGlow||sprite.coreColor):stoney?'rgb(150,144,132)':'rgb(112,150,78)';
  for(let i=0;i<6&&g.particles.length<420;i++)g.particles.push({
    x:px+(Math.random()-.5)*10,y:py+(Math.random()-.5)*8,vx:(Math.random()-.5)*70,vy:-40-Math.random()*60,
    life:.5+Math.random()*.4,maxLife:.9,color});
  if(rule.bicho&&Math.random()<rule.bicho)spawnEnvCritter(g,px,py);
  return true;
}

// Golpe de arma passando por cima do mato: corta tudo que a lâmina encosta (js/combat.js)
function cutEnvironmentSweep(g,s,ox,oy,a0,a1,steps,radii) {
  const world=g.world;
  for(let i=0;i<=steps;i++){
    const wa=swordWorldAngle(s,lerp(a0,a1,i/steps)),c=Math.cos(wa),sn=Math.sin(wa);
    for(const k of radii){
      const tx=Math.floor((ox+c*s.reach*k)/T),ty=Math.floor((oy+sn*s.reach*k)/T);
      if(!world.inBounds(tx,ty))continue;
      const cell=ty*world.w+tx;
      if(s.hit.has(cell))continue;
      s.hit.add(cell); // números e mobs convivem no mesmo Set sem se confundir
      const found=environmentDecorationAt(world,tx,ty);
      if(found)environmentHarvest(g,found.x,found.y,found.ceiling,true);
    }
  }
}

// ---------- Insetos que saem do mato ----------
const ENV_BUG_COLORS=[['#8fd85a','#3f7a2c'],['#e0b64a','#8a6a1d'],['#6fc5e8','#2e6b8a'],['#d9705f','#7a2f26']];
function spawnEnvCritter(g,x,y) {
  const list=g.critters??=[];
  if(list.length>=14)return;
  list.push({x,y:y-2,vx:(Math.random()-.5)*80,vy:-70-Math.random()*60,fly:Math.random()<.45,
    color:ENV_BUG_COLORS[(Math.random()*ENV_BUG_COLORS.length)|0],life:5+Math.random()*5,
    phase:Math.random()*6.28,wait:0,facing:Math.random()<.5?-1:1});
}
function updateEnvCritters(g,dt) {
  const list=g.critters;
  if(!list?.length)return;
  const w=g.world,p=g.player;
  for(let i=list.length-1;i>=0;i--){
    const b=list[i];
    b.life-=dt;
    if(b.life<=0||Math.abs(b.x-p.cx)>canvas.width/g.zoom+160){list.splice(i,1);continue;}
    if(b.fly){
      // Voa em ziguezague, fugindo devagar de quem chegou perto
      b.vy+=(Math.sin((b.phase+=dt*6))*26-b.vy)*Math.min(1,dt*4);
      if(Math.abs(b.x-p.cx)<3*T)b.vx+=Math.sign(b.x-p.cx||1)*90*dt;
      b.vx*=Math.pow(.6,dt);
    }else{
      b.vy+=900*dt;
      const below=w.isSolid(Math.floor(b.x/T),Math.floor((b.y+3)/T));
      if(below&&b.vy>0){ // pulinho de grilo
        b.y=Math.floor((b.y+3)/T)*T-3;b.vy=0;b.vx*=.4;
        if((b.wait-=dt)<=0){b.wait=.4+Math.random()*.8;b.vy=-140-Math.random()*60;b.vx=(Math.random()-.5)*110;}
      }
    }
    if(Math.abs(b.vx)>2)b.facing=b.vx>0?1:-1;
    const nx=b.x+b.vx*dt,ny=b.y+b.vy*dt;
    if(!w.isSolid(Math.floor(nx/T),Math.floor(b.y/T)))b.x=nx;else b.vx=-b.vx*.5;
    if(!w.isSolid(Math.floor(b.x/T),Math.floor(ny/T)))b.y=ny;else b.vy=b.fly?-b.vy*.4:Math.min(0,b.vy);
  }
}
function drawEnvCritters(ctx,g) {
  const list=g.critters;
  if(!list?.length)return;
  const now=performance.now()/1000;
  for(const b of list){
    const x=Math.round(b.x),y=Math.round(b.y),f=b.facing,fade=Math.min(1,b.life);
    ctx.globalAlpha=fade;
    if(b.fly){ // asas batendo
      ctx.fillStyle='rgba(236,246,255,0.65)';
      const up=Math.floor(now*26+b.phase)&1;
      ctx.fillRect(x-2,y-2-up,4,1);
    }
    ctx.fillStyle=b.color[1];ctx.fillRect(x-2,y-1,4,3);
    ctx.fillStyle=b.color[0];ctx.fillRect(x-1,y,2,1);
    ctx.fillStyle='rgba(30,26,22,0.9)';ctx.fillRect(f>0?x+2:x-3,y-1,1,1);
  }
  ctx.globalAlpha=1;
}

function generateEnvironmentDecoration(world,x,y,ceiling=false) {
  const t=world.getTile(x,y),ay=y+(ceiling?1:-1);
  if(!ENV_NATURAL.has(t)||world.getTile(x,ay)!==TILE.AIR||world.hasWater(x,ay))return null;
  // Nasce uma vez só: chão ou vão aberto pelo jogador depois da geração não ganha enfeite
  const touched=world.touched;
  if(touched?.size&&(touched.has(y*world.w+x)||touched.has(ay*world.w+x)))return null;
  const cave=caveHabitat(world,x,ay),cluster=.35+.65*noise2(x/11,y/8,world.seed+39);
  const chance=hash2(x,y,world.seed+(ceiling?519:513));
  const limit=ENVIRONMENT.decorationDensity*cluster*(cave?.7:.55);
  if(chance>limit)return null;
  let kind;
  if(cave){
    // Índices do enum UNDER (js/underground.js): 1 musgo, 2 micélio, 3 cristal, 4 gelo, 5 magma
    // Perto da superfície a caverna só tem pedra; cristal e cogumelo moram fundo e são raros
    const deep=undergroundDeep(world,x,ay),rel=chance/limit,plain=rel<.25?'stalagmite':'rocks';
    if(ceiling)kind=!deep?'stalactite':cave.kind===UNDER.GROTTO?'vine':cave.kind===UNDER.MYCELIUM&&cave.wet>.5?'root':'stalactite';
    else if(!deep)kind=plain;
    else kind=cave.kind===UNDER.GROTTO?(rel<.1?'moss':rel<.6?'fern':plain):cave.kind===UNDER.MYCELIUM?(rel<.4?'mushroom':plain):
      cave.kind===UNDER.CRYSTAL?(rel<.35?'crystal':plain):plain;
  }else{
    if(ceiling)return t===TILE.DIRT&&chance<.17?environmentSprite('root',x&3):null;
    const b=world.biomeAt(x),wet=[-2,-1,1,2].some(dx=>world.hasWater(x+dx,y-1)||world.hasWater(x+dx,y));
    kind=wet&&b!==BIOME.DESERT&&b!==BIOME.SNOW?'reed':b===BIOME.DESERT?'rocks':b===BIOME.SNOW?'rocks':b===BIOME.SAVANNA?'dry':
      b===BIOME.SAKURA?(chance<.05?'rocks':'sakuraGrass'):chance<.04?'log':chance<.09?'litter':b===BIOME.JUNGLE?'fern':'flower';
  }
  const sprite=environmentSprite(kind,Math.floor(hash2(x,y,world.seed+99)*4));
  // Decorations need real empty clearance; never cover a chest, ladder, door or vein.
  const rows=Math.ceil((sprite.height-2)/T);
  for(let k=1;k<=rows;k++){const yy=y+(ceiling?k:-k);if(world.getTile(x,yy)!==TILE.AIR||touched?.has(yy*world.w+x))return null;}
  for(const dx of [-1,1])for(let k=1;k<=rows;k++)if(world.getTile(x+dx,y+(ceiling?k:-k))!==TILE.AIR)return null;
  return sprite;
}
function drawEnvironmentSprite(ctx,g,source,x,y,flex=1,hang=false) {
  const wind=environmentWind(g,x+source.width/2,hang?y+2:y+source.height-4),clock=g.weather?.clock||0;
  const phase=hash2(Math.floor(x/T),Math.floor(y/T),113)*6.28;
  const bend=clamp((wind.x*.055+Math.sin(clock*1.4+phase)*Math.abs(wind.x)*.012)*flex*ENVIRONMENT.vegetationMotion,-7,7);
  const stride=g.zoom<1.5?8:4;
  for(let row=0;row<source.height;row+=stride){const s=Math.min(stride,source.height-row),q=hang?row/source.height:1-(row+s)/source.height;
    const shift=Math.round(bend*q*q);ctx.drawImage(source,0,row,source.width,s,Math.round(x)+shift,Math.round(y)+row,source.width,s);}
}
function drawEnvironmentPlant(renderer,g,source,x,y,tx,ty,foliage=false,hang=false) {
  const flex=source.envFlex??(foliage?.7:1);
  if(!flex){renderer.ctx.drawImage(source,x,y);return;}
  drawEnvironmentSprite(renderer.ctx,g,source,x,y,flex,hang);
  if(GAME_OPTIONS.shaders&&!g.adminNightVision&&renderer.sunCache?.world===g.world){
    const light=shaderExposureAt(renderer,tx,ty,foliage)*g.daylight*(1-(g.weather?.rain||0)*.8);
    if(light>.04){const c=renderer.ctx;c.save();c.globalCompositeOperation='screen';c.globalAlpha=light*RENDER_STYLE.sun.edgeIntensity;
      drawEnvironmentSprite(c,g,shaderRimSprite(source,g.time),x,y,flex,hang);c.restore();}
  }
}
function environmentEmissionAt(world,x,y) {
  if(world.getTile(x,y)!==TILE.AIR||y<=world.surface[clamp(x,0,world.w-1)]+4)return 0;
  if(!ENV_NATURAL.has(world.getTile(x,y+1)))return 0;
  const sprite=environmentDecoration(world,x,y+1);
  return sprite?.envGlow?{level:sprite.envKind==='moss'?7:11,color:sprite.envGlow}:null;
}
// Tinta da gruta e musgo nas paredes de fundo. Cada célula só entra na fila; o desenho
// sai em dois lotes, com um save/restore e um globalAlpha para a tela inteira em vez de
// um por tile. Cada tile continua pintando só dentro do próprio quadrado, então a ordem
// tinta -> musgo -> sombra de cada tile é a mesma de antes e o resultado é igual.
const ENV_WALL_TINT=new Set([WALL.DIRT,WALL.STONE,WALL.SANDSTONE]);
const envWallQueue={tint:[],moss:[]};
// Se um erro interromper o quadro no meio do laço, a fila não pode vazar para o seguinte.
function resetEnvironmentWallQueue() { envWallQueue.tint.length=0;envWallQueue.moss.length=0; }
function environmentWallCell(g,x,y,wall) {
  if(!ENV_WALL_TINT.has(wall))return;
  const h=caveHabitat(g.world,x,y);if(!h)return;
  envWallQueue.tint.push(h.css??=rgb(h.color),x,y);
  const above=ENV_NATURAL.has(g.world.getTile(x,y-1));
  if((above||ENV_NATURAL.has(g.world.getTile(x,y+1)))&&h.wet>.65&&hash2(x,y,g.world.seed+71)<.4)
    envWallQueue.moss.push(x,y,above?0:T-4);
}
function drawEnvironmentWallQueue(ctx) {
  const {tint,moss}=envWallQueue;
  if(!tint.length&&!moss.length)return;
  ctx.save();
  ctx.globalAlpha=.10;
  for(let i=0;i<tint.length;i+=3){ctx.fillStyle=tint[i];ctx.fillRect(tint[i+1]*T,tint[i+2]*T,T,T);}
  if(moss.length){
    ctx.globalAlpha=.45;ctx.fillStyle='#5b7945';
    for(let k=0;k<moss.length;k+=3){
      const x=moss[k],y=moss[k+1],base=moss[k+2];
      for(let i=0;i<4;i++)ctx.fillRect(x*T+Math.floor(hash2(x+i,y,52)*13),y*T+base+Math.floor(hash2(x,y+i,89)*3),3,2);
    }
  }
  ctx.restore();
  tint.length=0;moss.length=0;
}
function collectEnvironment(g) {
  const e=g.environment??={particles:[],anchors:[],scanTimer:0,audioTimer:0};
  const w=g.world,x0=Math.max(1,Math.floor(g.cam.x/T)-2),x1=Math.min(w.w-2,Math.ceil((g.cam.x+canvas.width/g.zoom)/T)+2);
  const y0=Math.max(1,Math.floor(g.cam.y/T)-3),y1=Math.min(w.h-2,Math.ceil((g.cam.y+canvas.height/g.zoom)/T)+3);
  e.anchors=[];
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)if(ENV_NATURAL.has(w.getTile(x,y)))for(const hanging of [false,true]){
    const sprite=environmentDecoration(w,x,y,hanging);if(!sprite)continue;
    e.anchors.push({x:x*T-4,y:hanging?(y+1)*T-2:y*T-sprite.height+2,tx:x,ty:y,sprite,hanging,cave:caveHabitat(w,x,y+(hanging?1:-1))});
  }
  e.world=w;e.revision=w.lightRevision;e.camX=x0;e.camY=y0;return e;
}
function updateEnvironment(g,dt) {
  let e=g.environment;if(!e||e.world!==g.world){g.environment=null;e=collectEnvironment(g);}
  if(e.density!==ENVIRONMENT.decorationDensity){e.density=ENVIRONMENT.decorationDensity;g.world.lightDirty=true;e.scanTimer=0;}
  e.scanTimer-=dt;if(e.scanTimer<=0||e.revision!==g.world.lightRevision){collectEnvironment(g);e.scanTimer=.35;}
  // Mato, flor e pedrinha voltam a nascer sozinhos; cristal e cogumelo ficaram marcados
  // com Infinity e nunca saem desta lista.
  const cut=g.world.decorCut;
  if(cut?.size&&(e.regrowTimer=(e.regrowTimer??0)-dt)<=0){
    e.regrowTimer=2;
    const now=g.clock||0;
    for(const [key,when] of cut)if(when<=now){cut.delete(key);g.world.decorCache?.delete(key);}
  }
  const gust=Math.abs(g.weather?.wind||0)/100;
  if(e.particles.length<ENVIRONMENT.particleLimit&&Math.random()<dt*(7+gust*7)&&e.anchors.length){
    const a=e.anchors[Math.floor(Math.random()*e.anchors.length)],kind=a.sprite.envKind;
    let type=kind==='mushroom'?'spore':kind==='flower'||kind==='fern'?'pollen':a.hanging&&a.cave?.wet>.55?'drop':a.cave?.kind===UNDER.DRY?'dust':null;
    if(type){const x=a.x+8+Math.random()*8,y=a.y+(a.hanging?a.sprite.height:4);
      if(!g.world.isSolid(Math.floor(x/T),Math.floor(y/T)))e.particles.push({x,y,surface:!a.cave,vx:0,vy:type==='drop'?18:-3,life:4+Math.random()*3,maxLife:7,type,color:type==='spore'?'#9cded2':type==='drop'?'#7fa2ae':type==='dust'?'#9c8b76':'#c9bc83'});
    }
  }
  for(let i=e.particles.length-1;i>=0;i--){const p=e.particles[i],v=environmentWind(g,p.x,p.y);
    p.vx+=(v.x*.3-p.vx)*Math.min(1,dt*2);p.vy+=p.type==='drop'?100*dt:v.y*.1*dt;
    p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;
    if(p.life<=0||g.world.isSolid(Math.floor(p.x/T),Math.floor(p.y/T))||(p.surface&&!weatherLit(g.world,p.x,p.y))||Math.abs(p.x-g.player.cx)>canvas.width/g.zoom+200)e.particles.splice(i,1);
  }
  updateEnvironmentAudio(g,dt);
}
function drawEnvironmentAccents(ctx,g,ox,oy,z) {
  const e=g.environment;if(!e)return;
  ctx.save();ctx.setTransform(z,0,0,z,-ox,-oy);
  for(const a of e.anchors){if(!a.sprite.envGlow||!environmentDecoration(g.world,a.tx,a.ty,a.hanging))continue;
    const color=a.sprite.envGlow,x=a.x+12,y=a.y+12,r=27;
    ctx.globalCompositeOperation='screen';const grad=ctx.createRadialGradient(x,y,0,x,y,r);
    grad.addColorStop(0,`rgba(${color.join(',')},${ENVIRONMENT.caveGlow})`);grad.addColorStop(1,`rgba(${color.join(',')},0)`);
    ctx.fillStyle=grad;ctx.fillRect(x-r,y-r,r*2,r*2);
    ctx.globalCompositeOperation='source-over';ctx.fillStyle=rgb(color);ctx.globalAlpha=.6;ctx.fillRect(Math.round(x),Math.round(y),1,1);ctx.globalAlpha=1;
  }
  ctx.globalCompositeOperation='source-over';for(const p of e.particles){ctx.globalAlpha=Math.min(.48,p.life*.3);ctx.fillStyle=p.color;ctx.fillRect(Math.round(p.x),Math.round(p.y),1,p.type==='drop'?3:1);}
  ctx.restore();
}
function updateEnvironmentAudio(g,dt) {
  const e=g.environment,A=g.crashAudio;if(!A||A.a.state!=='running')return;
  if((e.audioTimer-=dt)>0)return;e.audioTimer=2+Math.random()*2;
  const cave=caveHabitat(g.world,Math.floor(g.player.cx/T),Math.floor(g.player.cy/T)),exp=environmentExposure(g.world,g.player.cx,g.player.cy);
  sfxBus(A);const vol=ENVIRONMENT.ambienceVolume,wind=Math.abs(g.weather?.wind||0)/100;
  const out=sfxOut(A,g.player.cx,g.player.cy,vol);if(!out)return;
  A.noise({dest:out,brown:true,freq:cave?110:350+wind*600,dur:3.8,attack:1.2,gain:cave?.025:(.012+wind*.04)*(.08+exp*.92)});
  if(cave){
    const anchors=e.anchors.filter(a=>a.cave&&Math.abs(a.x-g.player.cx)<T*20),a=anchors[Math.floor(Math.random()*anchors.length)];
    if(a){const o=sfxOut(A,a.x,a.y,vol*.35);if(o){
      if(a.cave.wet>.5)for(let i=0;i<2;i++)A.tone({dest:o,freq:920-i*150,freqEnd:400,dur:.16,gain:.09/(i+1),delay:i*.22});
      else if(a.cave.kind===UNDER.CRYSTAL)A.tone({dest:o,freq:540+Math.random()*500,dur:1.6,gain:.016,attack:.03});
      else A.noise({dest:o,brown:true,freq:180,dur:1.7,attack:.5,gain:.025});
    }}
  }else if(exp>.3&&g.weather?.rain<.3&&wind<.65){
    const b=g.world.biomeAt(Math.floor(g.player.cx/T));
    if(b===BIOME.OCEAN)A.noise({dest:out,brown:true,freq:700,dur:3.5,attack:1,gain:.07});
    else if(b===BIOME.FOREST||b===BIOME.JUNGLE||b===BIOME.SAKURA)for(let i=0;i<3;i++)A.tone({dest:out,freq:1700+i*240,freqEnd:2200+i*130,dur:.12,gain:.012,delay:i*.2});
    else A.noise({dest:out,freq:b===BIOME.SNOW?700:2200,type:'bandpass',dur:1.3,attack:.5,gain:.012});
  }
}
