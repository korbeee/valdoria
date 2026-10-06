const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
 const p=await b.newPage({viewport:{width:1280,height:800}}),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.text().includes('[Criação]'))errors.push(m.text());});
 await p.addInitScript(()=>window.requestAnimationFrame=()=>0);await p.goto('http://localhost/jogo-teste/');await p.waitForFunction(()=>typeof game==='object');
 const r=await p.evaluate(()=>{
  finishOpening(game);Menu.root.hidden=true;game.paused=false;game.intro.active=false;game.drops=[];
  const ui=game.inventoryUI,w=game.world,checks=[],check=(v,s)=>{if(!v)throw Error(s);checks.push(s);};
  const all=craftRecipes();check(all.length===RECIPES.length,'Todas as receitas compiladas');
  const find=(id)=>all.find(r=>r.result.item===id);
  const anvils=all.filter(r=>r.result.item===ITEM.ANVIL);
  check(anvils.length===2,'Bigorna tem duas variantes de receita');
  for(const metal of [ITEM.SCRAP,ITEM.METAL_BAR]) {
   const recipe=anvils.find(r=>r.items.some(n=>n.item===metal));
   check(!!recipe&&!recipe.station,'Variante de bigorna pode ser criada no inventário');
   ui.inv.slots.fill(null);ui.bench.fill(null);ui.station=null;
   recipe.items.forEach(n=>ui.inv.add(n.item,n.count));ui.sendToBench(recipe);
   ui.craftFromBench(ui.benchResults().indexOf(recipe),false);
   check(ui.inv.count(ITEM.ANVIL)===1&&ui.inv.count(metal)===0&&ui.inv.count(ITEM.STONE)===0,'Variante consome materiais e entrega a mesma bigorna');
  }
  for(const [id,kind] of [[ITEM.METAL_BAR,'furnace'],[ITEM.COOKED_MEAT,'oven'],[ITEM.STONE_BRICK,'workbench'],[ITEM.WOOD_PICKAXE,'anvil'],[ITEM.ARROW,'anvil'],[ITEM.ROOF_WOOD,'workbench']])check(find(id).station===kind,ITEM_DEFS[id].name+' na estação correta');
  for(const def of Object.values(CRAFT_STATIONS)) {
   const recipe=find(def.item);check(!recipe.station,def.name+' pode ser criada no inventário');
   ui.inv.slots.fill(null);ui.bench.fill(null);ui.station=null;
   recipe.items.forEach(n=>ui.inv.add(n.item,n.count));ui.sendToBench(recipe);ui.craftFromBench(ui.benchResults().indexOf(recipe),false);
   check(ui.inv.count(def.item)===1,'Craft de '+def.name);
  }
  ui.inv.slots.fill(null);ui.bench.fill(null);const iron=find(ITEM.METAL_BAR);iron.items.forEach(n=>ui.inv.add(n.item,n.count));
  ui.sendToBench(iron);check(ui.bench.every(s=>!s),'Inventário não funde minério sem estação');
  ui.bench=iron.items.map(n=>({...n}));while(ui.bench.length<BENCH_SLOTS)ui.bench.push(null);check(!ui.benchResults().includes(iron),'Arrastar ingredientes não contorna a estação');ui.bench.fill(null);
  const place=(kind,x)=>{const d=CRAFT_STATIONS[kind],f=FURNITURE[d.tile];for(let xx=x;xx<x+f.w;xx++){for(let y=14;y<=19;y++)w.setTile(xx,y,TILE.AIR);w.setTile(xx,20,TILE.STONE);}const spot=findFurnitureSpot(w,d.tile,x,19);check(!!spot,d.name+' encaixa no chão');placeFurniture(w,d.tile,spot.ax,spot.ay);return{x:spot.ax,y:spot.ay,kind};};
  const stations=Object.keys(CRAFT_STATIONS).map((k,i)=>place(k,90+i*6));
  const open=(s)=>{game.player.x=(s.x+1)*T-game.player.w/2;game.player.y=20*T-game.player.h;check(tryOpenCraftStation(game,s.x,s.y),'Interação com '+s.kind);};
  open(stations[0]);ui.sendToBench(iron);const ironBefore=ui.inv.count(ITEM.METAL_BAR);ui.craftFromBench(ui.benchResults().indexOf(iron),false);
  const key=stations[0].y*w.w+stations[0].x;check(w.stationJobs.has(key),'Fusão começa com progresso');check(ui.inv.count(ITEM.METAL_BAR)===ironBefore,'Calor não entrega resultado instantaneamente');
  const count=w.stationJobs.size;startStationHeat(ui,iron,false);check(w.stationJobs.size===count,'Estação ocupada não duplica trabalho');
  ui.closeCraft();updateCraftStations(game,6);check(w.stationJobs.get(key).remaining===0,'Aquecimento continua com painel fechado');
  open(stations[0]);updateCraftStations(game,.01);check(ui.inv.count(ITEM.METAL_BAR)===ironBefore+1&&!w.stationJobs.has(key),'Produto pronto coletado ao abrir');
  open(stations[1]);const meat=find(ITEM.COOKED_MEAT);meat.items.forEach(n=>ui.inv.add(n.item,n.count));ui.sendToBench(meat);ui.craftFromBench(ui.benchResults().indexOf(meat),false);updateCraftStations(game,4);check(ui.inv.count(ITEM.COOKED_MEAT)===1,'Forno cozinha comida');
  open(stations[2]);const brick=find(ITEM.STONE_BRICK);brick.items.forEach(n=>ui.inv.add(n.item,n.count));ui.sendToBench(brick);ui.craftFromBench(ui.benchResults().indexOf(brick),false);check(ui.inv.count(ITEM.STONE_BRICK)===brick.result.count,'Bancada produz construção');
  open(stations[3]);const pick=find(ITEM.WOOD_PICKAXE);pick.items.forEach(n=>ui.inv.add(n.item,n.count));ui.sendToBench(pick);ui.craftFromBench(ui.benchResults().indexOf(pick),false);check(ui.inv.count(ITEM.WOOD_PICKAXE)===1,'Bigorna produz equipamento');
  const gallery=makeCanvas(960,520),ctx=gallery.getContext('2d');ctx.fillStyle='#1b2027';ctx.fillRect(0,0,960,520);ctx.font='20px monospace';ctx.imageSmoothingEnabled=false;
  Object.values(CRAFT_STATIONS).forEach((d,i)=>{ctx.fillStyle='#efe6d2';ctx.fillText(d.name,i*240+12,35);ctx.drawImage(stationSprite(d.kind,true),i*240+30,65,160,d.kind==='anvil'?80:160);ctx.font='13px monospace';ctx.fillText(d.subtitle,i*240+12,250);ctx.font='20px monospace';});
  open(stations[0]);iron.items.forEach(n=>ui.inv.add(n.item,n.count));ui.sendToBench(iron);ui.craftFromBench(ui.benchResults().indexOf(iron),false);updateCraftStations(game,2);
  const panel=makeCanvas(CRAFT.W*3,CRAFT.H*3),pc=panel.getContext('2d');pc.scale(3,3);ui.drawCraftPanel(pc,null);
  // Saída pronta fica guardada quando a mochila está cheia; não se perde nem duplica.
  ui.inv.slots.fill({item:ITEM.DIRT,count:MAX_STACK});updateCraftStations(game,10);
  check(w.stationJobs.get(key)?.remaining===0,'Produto pronto permanece com inventário cheio');
  ui.inv.slots[0]=null;updateCraftStations(game,.01);check(!w.stationJobs.has(key)&&ui.inv.count(ITEM.METAL_BAR)===1,'Produto coletado ao liberar espaço');
  ui.inv.slots.fill(null);ui.bench.fill(null);iron.items.forEach(n=>ui.inv.add(n.item,n.count*3));ui.sendToBench(iron);
  ui.bench=iron.items.map(n=>({item:n.item,count:n.count*3}));while(ui.bench.length<BENCH_SLOTS)ui.bench.push(null);
  ui.craftFromBench(ui.benchResults().indexOf(iron),true);check(w.stationJobs.get(key)?.times===3,'Shift inicia aquecimento em lote');
  const before=game.drops.length;removeFurniture(w,stations[0].x,stations[0].y);check(!w.stationJobs.has(key)&&game.drops.length>before,'Quebrar estação devolve ingredientes do trabalho');updateCraftStations(game,.01);check(ui.station===null,'Quebrar estação fecha painel');
  open(stations[3]);game.player.x+=20*T;updateCraftStations(game,.01);check(ui.station===null,'Afastar-se fecha a estação');
  return{checks,gallery:gallery.toDataURL(),panel:panel.toDataURL(),total:all.length};
 });assert.deepEqual(errors,[]);for(const k of ['gallery','panel'])fs.writeFileSync('tests/craft-stations-'+k+'.png',Buffer.from(r[k].split(',')[1],'base64'));console.log(r.checks.join('\n'));console.log(r.total+' receitas verificadas');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
