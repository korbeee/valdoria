'use strict';

// Append IDs: existing worlds and inventories keep their original numbering.
TILE.SAKURA_GRASS=78;
defTile(TILE.SAKURA_GRASS,{name:'Grama verde-água',hardness:.3,drop:ITEM.DIRT,ferramenta:'pa',color:[69,173,144]});
MATERIAL_TEX[TILE.SAKURA_GRASS]=grassOver(genDirt(1701),1702,[[148,225,188],[73,178,148],[43,134,118]],[30,86,77]);
TOP_COLORS[TILE.SAKURA_GRASS]=[[148,225,188],[73,178,148]];
ORGANIC_LEAVES.sakura=[[75,36,57],[116,54,80],[163,81,112],[207,123,151],[238,170,190],[255,218,223]];

const SAKURA={petalDensity:.86};
const sakuraGrassSprites=Array.from({length:4},(_,i)=>genGrassTuft(811+i*93,[[42,124,108],[75,179,145],[145,220,181]]));
const sakuraPetalSprites=Array.from({length:16},(_,i)=>{
  const c=makeCanvas(T,9),p=c.getContext('2d'),rnd=mulberry32(9161+i*113);
  for(let j=0;j<5+i%5;j++){
    const x=Math.floor(rnd()*14),y=2+Math.floor(rnd()*6);
    p.fillStyle='#95536d';p.fillRect(x,y+1,3,1);
    p.fillStyle=j%3?'#eca5bf':'#f6c6d5';p.fillRect(x,y,2,1);p.fillRect(x+1,y-1,2,1);
    if(j%3===0){p.fillStyle='#ffe1e6';p.fillRect(x+1,y-1,1,1);}
  }
  return c;
});
function sakuraGroundPetals(world,x,y){
  if(world.biomeAt(x)!==BIOME.SAKURA||world.getTile(x,y)!==TILE.SAKURA_GRASS)return null;
  const above=world.getTile(x,y-1);
  if(![TILE.AIR,TILE.TRUNK,TILE.STUMP].includes(above)||world.hasWater(x,y-1)||!world.isSkyExposed(x,y-1))return null;
  const cluster=.6+.4*noise1(x*.14,world.seed+761);
  if(hash2(x,y,world.seed+928)>SAKURA.petalDensity*cluster)return null;
  return sakuraPetalSprites[Math.floor(hash2(x,y,world.seed+927)*sakuraPetalSprites.length)];
}
