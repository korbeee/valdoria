const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({viewport:{width:1280,height:720}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>window.requestAnimationFrame=()=>0);await page.goto('http://localhost/jogo-teste/');await page.waitForFunction(()=>typeof game==='object');
 const result=await page.evaluate(async()=>{
  const checks=[],check=(v,label)=>{if(!v)throw Error(label);checks.push(label);};
  for(const seed of [4242,11]){await newWorld('pequeno',()=>{},seed);check(!world.tiles.includes(TILE.WIND_ALTAR)&&world.skyWinds.length===0&&world.skyStones.length===0,'Sem pedras ou correntes naturais: '+seed);check(world.skyIslands.length>30&&world.skyNest,'Ilhas e ninho da tempestade preservados: '+seed);}
  finishOpening(game);Menu.root.hidden=true;game.intro.active=false;game.adminGod=true;game.mobs=[];
  const w=world,p=game.player,x=100,y=w.surface[x]-10;
  const drop=WILDLIFE.cascoferro.drops.find(d=>d[0]===ITEM.GALE_CORE);
  check(drop&&drop[1]===3&&drop[2]===3&&drop[3]===1,'Casco de Ferro garante três núcleos');
  const r=craftRecipes().find(r=>r.result.item===ITEM.WIND_ALTAR);
  check(r&&r.station==='workbench'&&r.result.count===1,'Receita na bancada de trabalho');
  check(r.items.some(n=>n.item===ITEM.GALE_CORE&&n.count===1)&&r.items.length===4,'Receita difícil usa núcleo, obsidiana, ferro e pedra');
  check(r.items.every(n=>![ITEM.WIND_CRYSTAL,ITEM.CLOUD_ESSENCE,ITEM.SKYSTONE].includes(n.item)),'Receita não depende de materiais do céu');
  check(ITEM_DEFS[ITEM.WIND_ALTAR].place===TILE.WIND_ALTAR&&TILE_DEFS[TILE.WIND_ALTAR].drop===ITEM.WIND_ALTAR&&isFinite(TILE_DEFS[TILE.WIND_ALTAR].hardness),'Bloco colocável e recuperável');
  for(let xx=x-8;xx<=x+8;xx++)for(let yy=Math.max(0,w.skyTop0);yy<=y+1;yy++){w.setTile(xx,yy,yy===y+1?TILE.STONE:TILE.AIR);w.water[yy*w.w+xx]=0;}
  const active=()=>{refreshWindAltars(w);return w.skyWinds.length;};
  w.setTile(x-1,y,TILE.WIND_ALTAR);check(active()===0,'Uma pedra não ativa');
  w.setTile(x,y,TILE.WIND_ALTAR);check(active()===0,'Duas pedras não ativam');
  w.setTile(x+1,y+1,TILE.WIND_ALTAR);check(active()===0,'Alturas diferentes não ativam');w.setTile(x+1,y+1,TILE.STONE);
  w.setTile(x+1,y,TILE.WIND_ALTAR);check(active()===1&&w.skyStones[0].x===x,'Três pedras horizontais ativam em lugar construído');
  check(!skyWindAt(w,{x:(x+20)*T,y:(y-10)*T,w:20,h:36}),'Corrente vertical não afeta quem está longe');
  w.setTile(x+2,y,TILE.WIND_ALTAR);check(active()===0,'Quatro pedras não correspondem ao formato');w.setTile(x+2,y,TILE.AIR);check(active()===1,'Voltar para três reativa');
  w.setTile(x,y+1,TILE.AIR);check(active()===0,'Falta de apoio desativa');w.setTile(x,y+1,TILE.STONE);
  const oldTop=(active(),w.skyWinds[0].yTop);w.setTile(x,y-15,TILE.STONE);check(active()===1&&w.skyWinds[0].yTop===y-11,'Teto limita a corrente sem atravessar rocha');w.setTile(x,y-15,TILE.AIR);check(active()===1&&w.skyWinds[0].yTop===oldTop,'Remover obstáculo libera a coluna');
  p.x=(x+.5)*T-p.w/2;p.y=y*T-p.h-.01;p.vx=p.vy=0;p.onGround=true;p.climbing=p.swimming=false;
  const start=p.y;for(let i=0;i<120;i++)update(1/60);check(p.y<start-8*T,'Corrente construída ergue o jogador');
  input.keys.add('KeyS');for(let i=0;i<90;i++)update(1/60);input.keys.delete('KeyS');check(p.vy>0&&p.vy<100,'S permite descer');
  w.setTile(x,y,TILE.AIR);check(active()===0&&!skyWindAt(w,p),'Quebrar pedra remove efeito imediatamente');w.setTile(x,y,TILE.WIND_ALTAR);check(active()===1,'Reconstrução reativa sem criar corrente duplicada');
  game.cam.x=(x-14)*T;game.cam.y=(y-16)*T;game.zoom=2;game.time=.85;game.showHelp=false;renderer.render(game);
  return {checks,shot:renderer.canvas.toDataURL()};
 });assert.deepEqual(errors,[]);fs.writeFileSync('tests/wind-altars.png',Buffer.from(result.shot.split(',')[1],'base64'));console.log(result.checks.length+' verificações passaram.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
