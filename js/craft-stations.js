'use strict';

// Estações colocáveis: os ingredientes ficam na bancada; trabalhos de aquecimento
// pertencem ao bloco no mundo e continuam quando o painel é fechado.
const CRAFT_STATIONS = {};
const STATION_TILES = {};
function stationSprite(kind, active = false) {
  const W = kind === 'workbench' ? 48 : 32, H = kind === 'anvil' ? 16 : 32;
  const c = makeCanvas(W,H), g=c.getContext('2d');
  const r=(x,y,w,h,col)=>{g.fillStyle=col;g.fillRect(x,y,w,h);};
  if(kind==='workbench') {
    r(2,14,44,5,'#251b18');r(3,14,42,2,'#d0a66b');r(3,16,42,2,'#8d5934');
    for(const x of [6,37]) {r(x,19,5,13,'#30231d');r(x+1,19,2,12,'#aa7343');}
    r(10,25,29,3,'#63442d');r(29,20,7,5,'#4b3630');r(30,20,5,1,'#ac7c4d');
    r(8,8,15,6,'#625c52');r(9,8,13,2,'#dfd2af');r(11,11,12,1,'#a59a7f');
    r(29,6,2,8,'#b88748');r(26,5,8,3,'#8d9595');r(26,5,8,1,'#d2d4c3');
    r(38,10,6,4,'#bd8d52');r(38,10,6,1,'#f0c87c');
  } else if(kind==='anvil') {
    r(3,12,26,4,'#292b34');r(5,12,22,1,'#777e86');r(11,7,10,6,'#444a55');r(12,7,3,5,'#8f9ba9');
    r(1,3,29,4,'#414b59');r(2,2,25,2,'#c2cbd0');r(5,6,20,2,'#697988');
    r(0,4,6,2,'#94a1a8');r(25,3,7,2,'#8d9cac');r(22,0,6,2,'#d6d4b5');r(23,1,2,5,'#8d643b');
  } else {
    const stone=kind==='furnace';
    r(3,5,26,26,'#28282c');r(5,3,22,3,stone?'#8b8e87':'#c58a58');
    r(5,6,22,23,stone?'#606967':'#92543d');r(6,6,20,1,stone?'#a3aaa0':'#daaa73');
    for(let y=9;y<29;y+=5) {r(5,y,22,1,stone?'#3c4647':'#573e34');for(let x=7+(y%2)*5;x<27;x+=9)r(x,y-4,1,4,stone?'#434c4b':'#5a3f35');}
    r(10,12,12,12,'#242326');r(8,15,16,8,'#242326');r(11,11,10,1,'#bbb19b');
    r(10,14,12,8,'#10161d');r(7,25,18,3,'#343b41');r(8,25,16,1,'#90948b');
    if(stone) {r(21,0,6,7,'#333e43');r(22,0,4,2,'#a4aaa1');r(23,3,2,3,'#6e7674');}
    else {r(6,1,20,3,'#493d32');r(8,1,16,1,'#bd8d5e');r(12,17,8,3,'#b89763');r(13,16,6,1,'#e2c88f');}
    if(active){r(10,19,12,3,'#a43b25');r(12,16,3,6,'#f18632');r(17,15,3,7,'#f8aa3e');r(13,18,2,3,'#fff1a1');r(18,17,1,4,'#ffe9a0');}
    for(const x of [5,24])r(x,30,3,2,'#34353b');
  }
  return c;
}
for(const [kind,key,name,subtitle,cost,heat] of [
  ['furnace','FURNACE','Fornalha','Minérios e blocos',[[ITEM.STONE,8],[ITEM.WOOD,4]],true],
  ['oven','OVEN','Forno','Comidas e bebidas',[[ITEM.STONE,6],[ITEM.DIRT,4],[ITEM.WOOD,2]],true],
  ['workbench','WORKBENCH','Bancada de trabalho','Construção e materiais',[[ITEM.PLANKS,8],[ITEM.STICK,4]],false],
  ['anvil','ANVIL','Bigorna','Armas e equipamentos',[[ITEM.STONE,8],[ITEM.SCRAP,4]],false],
]) {
  const tile=Math.max(...Object.values(TILE))+1, item=Math.max(...Object.values(ITEM))+1;
  if(tile>255)throw Error('Sem espaço para estações na tabela de blocos');
  TILE[key]=tile;ITEM[key]=item;
  defTile(tile,{name,solid:false,hardness:1,drop:item,ferramenta:kind==='workbench'?'machado':'picareta',apoio:'chao',opacity:1,color:[132,114,90]});
  defItem(item,{name,place:tile,descricao:subtitle+'. Coloque no chão e use o botão direito.'+(heat?' O combustível aparece nos ingredientes.':'')});
  const idle=stationSprite(kind), burning=heat?stationSprite(kind,true):idle;
  CRAFT_STATIONS[kind]={kind,tile,item,name,subtitle,heat};STATION_TILES[tile]=kind;
  FURNITURE[tile]={w:kind==='workbench'?3:2,h:kind==='anvil'?1:2,sprite:(w,x,y)=>w.stationJobs?.get(y*w.w+x)?.remaining>0?burning:idle};
  TILE_DRAW[tile]=(ctx,w,x,y)=>drawFurnitureCell(ctx,w,x,y);iconFromSprite(tile,idle);
  RECIPES.push({nome:kind==='anvil'?'Bigorna (sucata de metal)':name,estacao:'hand',ingredientes:cost,resultado:{item,quantidade:1}});
}
RECIPES.push({nome:'Bigorna (barras de ferro)',estacao:'hand',ingredientes:[[ITEM.STONE,8],[ITEM.METAL_BAR,4]],resultado:{item:ITEM.ANVIL,quantidade:1}});
buildFlatTiles();

function recipeStation(raw) {
  if(raw.estacao)return raw.estacao==='hand'?null:raw.estacao;
  const id=raw.resultado.item,d=ITEM_DEFS[id],name=foldText(raw.nome||d.name);
  if([ITEM.COOKED_MEAT,ITEM.BOILED_EGG,ITEM.COOKED_FISH].includes(id)||/assad|cozid|cha |infusao/.test(name))return 'oven';
  if([ITEM.METAL_BAR,ITEM.GLASS,ITEM.COAL,ITEM.BRONZE,ITEM.BRICK].includes(id)||/barra |fundid|garrafa de agua \((neve|gelo)\)/.test(name))return 'furnace';
  if(d.ferramenta||d.dano||d.arco||d.roupa||d.acessorio||d.parede===undefined&&/flecha|armadura|peitoral|sela|tridente|escudo|capacete|botas|luvas|asa.delta|gancho|puca|balde|bomba/.test(name))return 'anvil';
  const basic=[ITEM.PLANKS,ITEM.STICK,ITEM.TORCH,ITEM.DOOR,ITEM.CHEST,ITEM.CAMPFIRE,ITEM.ROPE,ITEM.LADDER,ITEM.WALL_PLANKS,ITEM.WALL_WOOD];
  if(basic.includes(id))return null;
  if(d.place!=null||d.parede!=null||raw.ingredientes.length>1)return 'workbench';
  return null;
}
// Receitas antigas de calor sem combustível passam a mostrar madeira no custo.
for(const r of RECIPES) {
  const kind=recipeStation(r);
  if(!CRAFT_STATIONS[kind]?.heat)continue;
  if(!r.ingredientes.some(([id])=>id===ITEM.COAL||id===ITEM.TORCH))r.ingredientes.push([ITEM.WOOD,1]);
}
const recipeStationName=r=>CRAFT_STATIONS[r.station]?.name||'Inventário';
const stationRecipeAllowed=(r,kind)=>!r.station||r.station===kind;
function stationReachable(g,s) {
  if(!s||g.world.getTile(s.x,s.y)!==CRAFT_STATIONS[s.kind]?.tile)return false;
  const f=FURNITURE[CRAFT_STATIONS[s.kind].tile];
  return Math.hypot((s.x+f.w/2)*T-g.player.cx,(s.y+1-f.h/2)*T-g.player.cy)<=REACH*T;
}
function tryOpenCraftStation(g,tx,ty) {
  const kind=STATION_TILES[g.world.getTile(tx,ty)];if(!kind)return false;
  const {ax,ay}=furnitureAnchor(g.world,tx,ty),s={kind,x:ax,y:ay};
  if(!stationReachable(g,s)){toast('Chegue mais perto da '+CRAFT_STATIONS[kind].name.toLowerCase()+'.');return true;}
  const ui=g.inventoryUI;ui.closeContainer();ui.closeCraft();ui.station=s;ui.open=ui.craftOpen=true;ui.bookScroll=0;ui.search='';ui.filter=null;
  playSfx('invOpen');return true;
}
function startStationHeat(ui,r,all) {
  const s=ui.station,g=ui.game;
  if(!stationReachable(g,s)||!stationRecipeAllowed(r,s.kind))return;
  const jobs=g.world.stationJobs??=new Map(),key=s.y*g.world.w+s.x;
  if(jobs.has(key)){toast('A estação já está preparando uma receita.');return;}
  const times=all?craftTimes(ui.bench,r):Math.min(1,craftTimes(ui.bench,r));if(!times)return;
  takeIngredients(ui.bench,r,times);
  const duration=(s.kind==='furnace'?4:3)*times;
  jobs.set(key,{...s,recipe:r,times,duration,remaining:duration});
  playSfx('craft');toast(CRAFT_STATIONS[s.kind].name+': aquecendo '+r.name.toLowerCase()+'.');
}
function releaseStationJob(w,x,y,g) {
  const key=y*w.w+x,job=w.stationJobs?.get(key);if(!job)return;
  if(job.remaining<=0)dropItem(g,job.recipe.result.item,job.recipe.result.count*job.times,(x+1)*T,y*T);
  else for(const n of job.recipe.items)dropItem(g,n.item,n.count*job.times,(x+1)*T,y*T);
  w.stationJobs.delete(key);
}
function updateCraftStations(g,dt) {
  const ui=g.inventoryUI,w=g.world;
  if(ui.station&&!stationReachable(g,ui.station)){ui.closeCraft();toast('Você se afastou da estação.');}
  for(const [key,job] of w.stationJobs||[]) {
    if(w.getTile(job.x,job.y)!==CRAFT_STATIONS[job.kind].tile){releaseStationJob(w,job.x,job.y,g);continue;}
    job.remaining=Math.max(0,job.remaining-dt);
    if(job.remaining>0||!ui.station||ui.station.x!==job.x||ui.station.y!==job.y||!ui.craftOpen)continue;
    const count=job.recipe.result.count*job.times;
    if(!g.inventory.canAdd(job.recipe.result.item,count))continue;
    g.inventory.add(job.recipe.result.item,count);w.stationJobs.delete(key);
    playSfx('craft');toast('Pronto: '+count+'× '+job.recipe.name+'.');
  }
}
// Qualquer parte do móvel quebrada libera o trabalho uma única vez.
const removeStationFurniture=removeFurniture;
removeFurniture=(w,x,y)=>{
  if(STATION_TILES[w.getTile(x,y)]){const {ax,ay}=furnitureAnchor(w,x,y);releaseStationJob(w,ax,ay,game);}
  return removeStationFurniture(w,x,y);
};
