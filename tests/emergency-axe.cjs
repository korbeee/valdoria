const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({viewport:{width:1100,height:760}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.addInitScript(()=>{window.requestAnimationFrame=()=>1;});await page.goto('http://localhost/jogo-teste/');await page.waitForFunction(()=>typeof game==='object');
 const result=await page.evaluate(()=>{
   finishOpening(game);Menu.root.hidden=true;game.paused=true;const checks={};
   checks.noStarterBag=!game.crashSite.bag;
   checks.emptyStartingInventory=game.inventory.slots.every(s=>!s);
   const fuselage=game.crashSite.wrecks.find(w=>w.kind==='fuselage');
   checks.oneAxe=game.crashSite.wrecks.flatMap(w=>w.slots).filter(s=>s?.item===ITEM.EMERGENCY_AXE).reduce((a,s)=>a+s.count,0)===1;
   checks.nearSpawn=wreckInReach(game,fuselage);openWreck(game,fuselage);
   checks.wreckContainer=game.inventoryUI.container?.source===fuselage;
   const slot=fuselage.slots.findIndex(s=>s?.item===ITEM.EMERGENCY_AXE);
   game.inventory.add(fuselage.slots[slot].item,1);fuselage.slots[slot]=null;game.inventoryUI.closeContainer();openWreck(game,fuselage);
   checks.noLootRespawn=!fuselage.slots.some(s=>s?.item===ITEM.EMERGENCY_AXE);game.inventoryUI.closeContainer();
   const preview=makeCanvas(420,300),p=preview.getContext('2d');p.imageSmoothingEnabled=false;p.fillStyle='#242d30';p.fillRect(0,0,420,300);
   p.drawImage(renderer.tex.itemAtlas,ITEM.EMERGENCY_AXE*T,0,T,T,30,54,192,192);p.drawImage(renderer.tex.itemAtlas,ITEM.WOOD_AXE*T,0,T,T,246,80,112,112);
   const art=preview.toDataURL();
   world=game.world=new World(180,120,713,{lazy:true});world.surface.fill(61);world.biome.fill(BIOME.FOREST);
   player.x=78*T;player.y=59*T;player.vx=player.vy=0;game.mobs=[];game.drops=[];game.selected=0;
   const timeToBreak=(tile,id)=>{world.setTile(80,60,tile);world.setTile(80,61,TILE.DIRT);game.inventory.slots.fill(null);game.inventory.slots[0]={item:id,count:1};
     game.mining={tx:80,ty:60,progress:0,wall:false};cancelTool(game);let frames=0,kind;
     while(world.getTile(80,60)===tile&&frames<1500){tickTool(game,1/60,80,60,tile,game.inventory.slots[0],ITEM_DEFS[id]);kind??=game.toolAction?.kind;frames++;}
     if(frames===1500)throw Error('Tool cannot break '+tile);return {seconds:frames/60,kind};};
   const stone=timeToBreak(TILE.STONE,ITEM.EMERGENCY_AXE),woodPick=timeToBreak(TILE.STONE,ITEM.WOOD_PICKAXE);
   const trunk=timeToBreak(TILE.TRUNK,ITEM.EMERGENCY_AXE),woodAxe=timeToBreak(TILE.TRUNK,ITEM.WOOD_AXE);
   checks.minesAndChops=stone.kind==='picareta'&&trunk.kind==='machado';checks.worseThanWood=stone.seconds>woodPick.seconds&&trunk.seconds>woodAxe.seconds;
   game.inventory.slots.fill(null);game.inventory.slots[0]={item:ITEM.EMERGENCY_AXE,count:1};
   world.setTile(80,60,TILE.STONE);checks.smartMining=smartCursorPick({x:80.5*T,y:60.5*T},null)?.slot===0;
   world.setTile(80,60,TILE.TRUNK);checks.smartChopping=smartCursorPick({x:80.5*T,y:60.5*T},null)?.slot===0;
   game.inventory.slots[1]={item:ITEM.WOOD_AXE,count:1};checks.prefersWoodUpgrade=smartCursorPick({x:80.5*T,y:60.5*T},null)?.slot===1;
   checks.noHammerCapability=!toolSupports(ITEM_DEFS[ITEM.EMERGENCY_AXE],'martelo');
   // Bloco que pede pá (terra, areia): bate com o lado pontudo, não com o fio
   checks.pointSideOnDirt=[TILE.DIRT,TILE.SAND,TILE.GRASS].every(t=>toolKindFor(ITEM_DEFS[ITEM.EMERGENCY_AXE],t)==='picareta');
   checks.bladeSideOnWood=toolKindFor(ITEM_DEFS[ITEM.EMERGENCY_AXE],TILE.TRUNK)==='machado';
   // Sem bloco mirado ele vira arma, mais fraca que a espada de ferro
   checks.weakerThanIronSword=ITEM_DEFS[ITEM.EMERGENCY_AXE].danoCorpo>0&&ITEM_DEFS[ITEM.EMERGENCY_AXE].danoCorpo<ITEM_DEFS[ITEM.METAL_SWORD].dano;
   const wreck=game.crashSite.wrecks[0];wreck.slots.fill(null);updateCrashLoot(game);checks.wreckProgressWithoutBag=wreck.searched;
   return {checks,times:{stone,woodPick,trunk,woodAxe},art};
 });fs.writeFileSync('tests/emergency-axe-art.png',Buffer.from(result.art.split(',')[1],'base64'));delete result.art;result.errors=errors;
 fs.writeFileSync('tests/emergency-axe-report.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));assert.deepEqual(errors,[]);for(const [k,v]of Object.entries(result.checks))assert.ok(v,k);
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
