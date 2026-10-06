const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>window.requestAnimationFrame=()=>1);
 await page.goto('http://localhost/jogo-teste/');await page.waitForFunction(()=>typeof game==='object');
 const result=await page.evaluate(()=>{
  const w=game.world,checks=[];const check=(c,s)=>{if(!c)throw Error(s);checks.push(s);};
  const tile=TILE.ALPHA_TROPHY,f=FURNITURE[tile];
  for(let y=5;y<10;y++)for(let x=8;x<15;x++){w.setTile(x,y,TILE.AIR);w.setWall(x,y,WALL.STONE);}
  const spot=findFurnitureSpot(w,tile,10,7);check(spot?.cells.length===4,'troféu ocupa 2×2');
  placeFurniture(w,tile,spot.ax,spot.ay);
  check(spot.cells.every(([x,y])=>!tileUnsupported(w,x,y)),'apoio de parede nas quatro células');
  const combined=makeCanvas(32,32),cc=combined.getContext('2d');cc.translate(-spot.ax*T,-(spot.ay-1)*T);
  for(const [x,y]of spot.cells)TILE_DRAW[tile](cc,w,x,y);
  const drawn=cc.getImageData(0,0,32,32).data,src=ALPHA_TROPHY_SPRITE.getContext('2d').getImageData(0,0,32,32).data;
  check(drawn.every((v,i)=>v===src[i]),'quatro recortes formam o troféu inteiro, alinhado');
  removeFurniture(w,spot.ax+1,spot.ay-1);check(spot.cells.every(([x,y])=>w.getTile(x,y)===TILE.AIR),'remoção por qualquer canto');
  w.setWall(10,6,WALL.NONE);check(!findFurnitureSpot(w,tile,10,6,()=>false),'não pendura em parede incompleta');
  const c=makeCanvas(960,480),ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.fillStyle='#202a30';ctx.fillRect(0,0,c.width,c.height);
  ctx.font='18px monospace';ctx.fillStyle='#eee0c6';ctx.fillText('URSO SENTADO — apoio no chão',24,32);ctx.fillText('TROFÉU — cabeça sobre placa de madeira',24,275);
  for(let phase=0;phase<4;phase++){
   const img=wildlifeSprite('bear',28+phase).normal,d=img.getContext('2d').getImageData(0,159,img.width,1).data;
   check(d.some((v,i)=>i%4===3&&v),'fase '+phase+': base encosta no fim do sprite');
   const x=phase*230+12;ctx.fillStyle='#6f6251';ctx.fillRect(x,224,220,5);ctx.fillStyle='#413e38';ctx.fillRect(x,229,220,13);
   ctx.drawImage(img,x,224-img.height);
  }
  for(let i=0;i<3;i++){
   const x=35+i*185,y=302;ctx.fillStyle=i%2?'#665449':'#55565b';ctx.fillRect(x,y,150,146);
   ctx.strokeStyle='#39353a';ctx.lineWidth=2;
   for(let row=0;row<4;row++)for(let col=0;col<4;col++)ctx.strokeRect(x+col*40-(row%2)*20,y+row*36,40,36);
   ctx.drawImage(ALPHA_TROPHY_SPRITE,x+27,y+25,96,96);
  }
  ctx.drawImage(ALPHA_TROPHY_SPRITE,655,328,64,64);ctx.fillStyle='#eee0c6';ctx.fillText('Zoom do jogo',625,420);
  return {checks,url:c.toDataURL()};
 });assert.deepEqual(errors,[]);fs.writeFileSync('tests/bear-wall-art.png',Buffer.from(result.url.split(',')[1],'base64'));console.log(result.checks.length+' verificações passaram: chão, parede, alinhamento e remoção.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
