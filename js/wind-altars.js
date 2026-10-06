'use strict';

// Materiais de acesso ao céu são obtidos antes do Olho da Tempestade.
ITEM.WIND_ALTAR=Math.max(...Object.values(ITEM))+1;
ITEM.GALE_CORE=ITEM.WIND_ALTAR+1;
defItem(ITEM.WIND_ALTAR,{name:'Pedra dos Ventos',place:TILE.WIND_ALTAR,descricao:'Coloque exatamente 3 lado a lado, na mesma altura e sobre chão firme. A corrente sobe pelo espaço livre acima; quebrar uma pedra desativa a estrutura.'});
defItem(ITEM.GALE_CORE,{name:'Núcleo de Vendaval',descricao:'O Casco de Ferro guarda três núcleos de ar comprimido em sua carapaça. Material raro para fabricar as Pedras dos Ventos.'});
Object.assign(TILE_DEFS[TILE.WIND_ALTAR],{hardness:2.4,ferramenta:'picareta',drop:ITEM.WIND_ALTAR});
ITEM_ART[ITEM.GALE_CORE]={cores:{o:[24,55,70],d:[38,107,128],m:[86,183,203],l:[176,244,243],w:[238,255,255]},pixels:[
 '................','......oooo......','....ooddddoo....','...odmmmmmmdo...','..odmllllllmdo..','..odmlwwwwlmdo..','.odmlwddddlmmdo.','.odmlwdllldmmdo.','.odmlwdlwldmmdo.','.odmlwdllddmmdo.','..odmlwdddmmd...','..odmllwwwmdo...','...odmmmmdo.....','....ooddoo......','......oo........','................']};
{
 const base=initializeBossGear;
 initializeBossGear=()=>{base();WILDLIFE.cascoferro.drops.push([ITEM.GALE_CORE,3,3,1]);};
}
RECIPES.push({nome:'Pedra dos Ventos',estacao:'workbench',ingredientes:[[ITEM.STONE,8],[ITEM.OBSIDIAN,3],[ITEM.METAL_BAR,4],[ITEM.GALE_CORE,1]],resultado:{item:ITEM.WIND_ALTAR,quantidade:1}});

// Registra apenas pedras colocadas, sem varrer o mapa a cada quadro.
{
 const base=World.prototype.setTile;
 World.prototype.setTile=function(x,y,t){
   const before=this.getTile(x,y),result=base.call(this,x,y,t);
   if(!this.inBounds(x,y))return result;
   if(t===TILE.WIND_ALTAR||before===TILE.WIND_ALTAR){
     this.windAltarCells??=new Set();const key=y*this.w+x;
     if(t===TILE.WIND_ALTAR)this.windAltarCells.add(key);else this.windAltarCells.delete(key);
   }
   if(this.windAltarCells?.size||before===TILE.WIND_ALTAR)this.windAltarsDirty=true;
   return result;
 };
}
function refreshWindAltars(w){
 if(!w.windAltarsDirty)return;
 w.windAltarsDirty=false;w.skyWinds=[];w.skyStones=[];
 for(const key of w.windAltarCells||[]){
   const x=key%w.w,y=Math.floor(key/w.w);
   if(w.getTile(x,y)!==TILE.WIND_ALTAR){w.windAltarCells.delete(key);continue;}
   if(w.getTile(x-1,y)!==TILE.WIND_ALTAR||w.getTile(x+1,y)!==TILE.WIND_ALTAR||w.getTile(x-2,y)===TILE.WIND_ALTAR||w.getTile(x+2,y)===TILE.WIND_ALTAR)continue;
   if(![-1,0,1].every(dx=>w.isSolid(x+dx,y+1)&&!w.isSolid(x+dx,y-1)&&!w.isSolid(x+dx,y-2)))continue;
   let yTop=Math.min(y-4,Math.max(3,(w.skyTop0??3)+4)),target=null,push=0;
   // Uma ilha perto da coluna recebe a curva final da corrente.
   for(const isl of w.skyIslands||[]){
     const side=x<isl.x0?1:x>isl.x1?-1:0,gap=side>0?isl.x0-x:x-isl.x1;
     if(side&&gap>=3&&gap<=SKY_LIFE.gust&&isl.top<y-8&&(!target||isl.top>target.top)){target=isl;push=side;}
   }
   if(target)yTop=target.top-5;
   for(let yy=y-1;yy>=yTop;yy--)if([-1,0,1].some(dx=>w.isSolid(x+dx,yy))){yTop=yy+4;target=null;push=0;break;}
   if(y-yTop<4)continue;
   w.skyWinds.push({x,yTop,yBottom:y-1,target,push,ground:true,tall:true,built:true});
   w.skyStones.push({x,y,tall:true,built:true});
 }
}
{
 const base=skyWindAt;
 skyWindAt=(w,b)=>{refreshWindAltars(w);return base(w,b);};
 const updateBase=updateSky;
 updateSky=(g,dt)=>{
   // Checa alterações diretas de terreno também, sem pesquisar novas pedras no mundo.
   g.world.windAltarCheck=(g.world.windAltarCheck||0)-dt;
   if(g.world.windAltarCheck<=0){g.world.windAltarCheck=.25;if(g.world.windAltarCells?.size)g.world.windAltarsDirty=true;}
   refreshWindAltars(g.world);updateBase(g,dt);
 };
}
