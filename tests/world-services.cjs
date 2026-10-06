const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const fs=require('fs'),assert=require('assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://localhost/jogo-teste/');await page.waitForFunction(()=>typeof game==='object');
const result=await page.evaluate(()=>{
 finishOpening(game);Menu.root.hidden=true;game.paused=true;
 const check=(condition,message)=>{if(!condition)throw Error(message);};
 const inv=new Inventory(2);inv.add(ITEM.WOOD,8);check(npcExchange(inv,[[ITEM.WOOD,8]],[[ITEM.TIMBER,8]])===null,'Exchange failed');check(inv.count(ITEM.WOOD)===0&&inv.count(ITEM.TIMBER)===8,'Wrong exchange amounts');
 const snapshot=JSON.stringify(inv.slots);check(!!npcExchange(inv,[[ITEM.WOOD,1]],[[ITEM.TIMBER,1]]),'Missing cost accepted');check(snapshot===JSON.stringify(inv.slots),'Failed exchange mutated inventory');
 inv.slots=[{item:ITEM.WOOD,count:999},{item:ITEM.STONE,count:999}];const full=JSON.stringify(inv.slots);check(!!npcExchange(inv,[[ITEM.WOOD,8]],[[ITEM.TIMBER,8]]),'Full inventory accepted');check(full===JSON.stringify(inv.slots),'Full inventory lost items');
 for(const job of NPC_PROFESSIONS)for(const q of job.quests){const bag=new Inventory(40);for(const [id,n] of q.cost)bag.add(id,n);check(npcExchange(bag,q.cost,q.reward)===null,'Profession reward failed');for(const [id,n] of q.reward)check(bag.count(id)>=n,'Missing reward');}
 const v=new Villager({x:game.player.x+16,y:game.player.y+42,minX:0,maxX:999,seed:.44,profession:0});game.npcs=[v];game.inventory.slots.fill(null);game.inventory.add(ITEM.WOOD,20);game.inventory.add(ITEM.STONE,12);
 NpcServices.open(game,v);NpcServices.act('accept');NpcServices.act('complete');check(npcState(v).completed===1,'Quest incomplete');const after=JSON.stringify(game.inventory.slots);NpcServices.act('complete');check(after===JSON.stringify(game.inventory.slots)&&npcState(v).completed===1,'Duplicate reward');
 NpcServices.act('accept');NpcServices.close();NpcServices.open(game);check(NpcServices.dialog.textContent.includes('Janelas e varandas'),'Journal missing quest');NpcServices.close();
 // Trocas: quarta profissao, lote, estoque diario e desconto por reputacao
 const smith=new Villager({x:game.player.x+16,y:game.player.y+42,minX:0,maxX:999,seed:.77,profession:3});
 check(NPC_PROFESSIONS[npcState(smith).profession].name==='Ferreiro','Fourth profession missing');
 game.inventory.slots.fill(null);game.inventory.add(ITEM.WOOD,80);
 const shop=new Villager({x:game.player.x+16,y:game.player.y+42,minX:0,maxX:999,seed:.5,profession:0});game.npcs=[shop];const shopState=npcState(shop);
 const trade=NPC_PROFESSIONS[0].trades[0];
 check(npcMaxTimes(game.inventory,trade.cost,trade.reward,trade.stock)===8,'Bulk trade count wrong');
 NpcServices.open(game,shop);NpcServices.setTab('trades');NpcServices.bumpQty(0,'max');NpcServices.act('trade',0);
 check(game.inventory.count(ITEM.TIMBER)===64,'Bulk trade reward wrong');
 check(shopState.stock[0]===0&&shopState.rep===REP_PER_TRADE,'Stock or reputation not applied');
 NpcServices.act('trade',0);check(shopState.stock[0]===0,'Traded past empty stock');
 game.day++;check(npcStock(shopState,0,trade)===trade.stock,'Stock did not restock on a new day');
 shopState.rep=NPC_RANKS[2].need;check(npcCost(trade,shopState)[0][1]<trade.cost[0][1],'Reputation discount missing');
 NpcServices.close();game.npcs=[v];
 const bg=makeCanvas(900,1250),bctx=bg.getContext('2d');const worlds=[];const unique=new Set();
 for(let biome=0;biome<5;biome++){
  const w=new World(220,180,100+biome,{lazy:true});w.surface.fill(90);w.biome.fill(biome);w.lootChests=[];w.npcSpawns=[];
  for(let y=90;y<w.h;y++)w.tiles.fill(y===90?TILE.GRASS:TILE.DIRT,y*w.w,(y+1)*w.w);
  const back=new Background(410);const c=makeCanvas(900,250);back.draw(c.getContext('2d'),{world:w,cam:{x:100,y:680},daylight:1,time:.18},900,250,1.6);unique.add(c.toDataURL());bctx.drawImage(c,0,biome*250);bctx.fillStyle='#13272f';bctx.fillRect(10,biome*250+10,150,26);bctx.fillStyle='#fff0cb';bctx.font='16px monospace';bctx.fillText(BIOME_NAMES[biome],20,biome*250+29);
  buildHouse(w,mulberry32(22),30,90,14,9,VILLAGE_STYLES[biome]||VILLAGE_STYLES.default,{loot:'village'});
  check(w.lootChests.length===1&&w.getTile(w.lootChests[0].x,w.lootChests[0].y)===TILE.CHEST,'House treasure overwritten');
  check(w.tiles.includes(TILE.LADDER),'House missing staircase');check(w.tiles.includes(TILE.LATTICE_WINDOW),'House missing windows');worlds.push(w);
 }
 check(unique.size===5,'Biome backgrounds identical');
 const gallery=makeCanvas(900,2400),gc=gallery.getContext('2d'),original=renderer.ctx;
 try{renderer.ctx=gc;for(let i=0;i<5;i++){gc.setTransform(1,0,0,1,0,0);gc.fillStyle='#8badad';gc.fillRect(0,i*480,900,480);gc.setTransform(1.2,0,0,1.2,-16*T*1.2,i*480-67*T*1.2);renderer.drawWorld({world:worlds[i],chestPairs:new Map()},16*T,67*T,750,400);}}
 finally{renderer.ctx=original;}
 // Generate a real world too: verify structures and residents are reachable data.
 const generated=new World(1800,450,72643);check(generated.npcSpawns.length>0,'No village NPCs generated');check(generated.lootChests.every(c=>generated.getTile(c.x,c.y)===TILE.CHEST),'Generated chest was overwritten');
 game.paused=false;check(tryTalkNpc(game,v.cx,v.cy),'Right click interaction failed');
 return {background:bg.toDataURL(),structures:gallery.toDataURL(),npcs:generated.npcSpawns.length,chests:generated.lootChests.length};
});
fs.writeFileSync('tests/biome-backgrounds.png',Buffer.from(result.background.split(',')[1],'base64'));fs.writeFileSync('tests/structure-gallery.png',Buffer.from(result.structures.split(',')[1],'base64'));
await page.keyboard.press('F2');assert.equal(await page.evaluate(()=>!!game.adminOpen),false);assert.equal(await page.evaluate(()=>!!game.npcOpen),true);
await page.screenshot({path:'tests/npc-services.png'});await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>!!game.npcOpen),false);await page.keyboard.press('j');assert.equal(await page.evaluate(()=>NpcServices.dialog.open&&NpcServices.dialog.textContent.includes('Diário de missões')),true);await page.keyboard.press('Escape');
assert.deepEqual(errors,[]);console.log(JSON.stringify({npcs:result.npcs,chests:result.chests,biomes:5,quests:true,atomicTrades:true,errors}));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
