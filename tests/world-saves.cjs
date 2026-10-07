const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'playwright');
const {spawn}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const zlib=require('node:zlib'),crypto=require('node:crypto');
const directory=path.resolve('tests/save-fixture-'+Date.now());fs.mkdirSync(directory);
const server=spawn('C:/xampp/php/php.exe',['-S','127.0.0.1:18923','-t',process.cwd()],{env:{...process.env,VALDORIA_SAVE_DIR:directory},stdio:'ignore'});
(async()=>{
 let browser;
 try{
  for(let i=0;i<100;i++){try{await fetch('http://127.0.0.1:18923/server/world-saves.php');break;}catch{await new Promise(r=>setTimeout(r,50));}}
  browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>{requestAnimationFrame=()=>0;localStorage.setItem('valdoria.autoconnect','0');});
  await page.goto('http://127.0.0.1:18923/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof WorldSaves!=='undefined'&&WorldSaves.directory.includes('save-fixture'),null,{polling:25});
  assert.equal(await page.locator('[data-action="continue-worlds"]').isDisabled(),true);
  const result=await page.evaluate(async(size)=>{
   const check=(ok,label)=>{if(!ok)throw Error(label);};
   await newWorld(size,()=>{},829163);finishOpening(game);game.intro=null;game.openingComplete=true;
   const x=Math.floor(player.cx/T),y=Math.floor(player.cy/T);
   game.world.setTile(x+3,y,TILE.STONE);game.day=7;game.time=.43;game.player.hp=73;
   game.inventory.slots.fill(null);game.inventory.add(ITEM.ROD_IRON,1);game.inventory.add(ITEM.BAIT_INSECT,19);
   game.inventoryUI.held={item:ITEM.BAIT_INSECT,count:3};game.inventoryUI.bench[0]={item:ITEM.BAIT_INSECT,count:2};
   game.chests.set(123,[{item:ITEM.BAIT_INSECT,count:8}]);game.chestPairs.set(123,124);game.autoDoors.add(12);
   game.mobs.push(new Wildlife('salmon',player.x+100,player.y));game.mount=game.mobs[0];game.mount.rider=player;
   game.map.revealed[10]=1;game.world.decorCut.set(16,22);game.world.water[25]=9;game.clock=456;
   const expected={tiles:saveBytes(world.tiles),walls:saveBytes(world.walls),water:saveBytes(world.water),x:player.x,y:player.y,mobs:game.mobs.length};
   await WorldSaves.begin('Mundo de teste <seguro>');const id=WorldSaves.active.id,captures=[WorldSaves.captureMs];
   game.day=9;await WorldSaves.save(false);captures.push(WorldSaves.captureMs);
   game.world.tiles.fill(0);game.inventory.slots.fill(null);game.chests.clear();game.mount=null;
   await WorldSaves.load(id);
   check(saveBytes(world.tiles)===expected.tiles,'tiles');check(saveBytes(world.walls)===expected.walls,'walls');check(saveBytes(world.water)===expected.water,'water');
   check(player.x===expected.x&&player.y===expected.y,'position');check(player.hp===73,'health');check(game.day===9&&game.time===.43,'time');
   check(game.inventory.count(ITEM.BAIT_INSECT)===24,'cursor and crafting materials');check(game.chests.get(123)[0].count===8,'chest');check(game.chestPairs.get(123)===124,'double chest');check(game.autoDoors.has(12),'doors');
   check(game.map.revealed[10]===1&&world.decorCut.get(16)===22,'map and decor');check(game.mobs.length===expected.mobs,'actors');check(game.mount.rider===player,'shared player identity');
   check(game.mobs.at(-1) instanceof Wildlife&&game.mobs.at(-1).def===WILDLIFE.salmon,'actor methods');check(world instanceof World&&game.inventory instanceof Inventory,'prototypes');
   game.mount=null;for(let i=0;i<5;i++)update(1/60);renderer.render(game);await WorldSaves.save(false);
   check(Object.getPrototypeOf(lavaWaterView(world))===world,'lava simulation restored');
   check(!WorldSaves.snapshot().state.props.game.props.environment,'visual effects excluded');
   await WorldSaves.begin('Segundo mundo');captures.push(WorldSaves.captureMs);await WorldSaves.refresh();check(WorldSaves.worlds.length===2,'world listing');Menu.go('main',true);return {id,folder:WorldSaves.worlds.find(m=>m.id===id).folder,second:WorldSaves.active.id,secondFolder:WorldSaves.active.folder,w:world.w,h:world.h,captures};
  },process.env.VALDORIA_SAVE_TEST_SIZE||'pequeno');
  await page.locator('[data-action="continue-worlds"]').click();await page.waitForFunction(()=>document.querySelectorAll('.saved-world').length===2,null,{polling:25});
  assert.equal(await page.locator('.saved-world strong').last().textContent(),'Mundo de teste <seguro>');
  await page.screenshot({path:'tests/world-saves-list.png'});
  for(const width of [320,640,1280]){await page.setViewportSize({width,height:800});assert(await page.locator('.saved-world').first().isVisible());assert(await page.evaluate(()=>document.querySelector('#menu-root').scrollWidth<=innerWidth));}
  const folder=path.join(directory,result.folder),manifest=JSON.parse(fs.readFileSync(path.join(folder,'mundo.json'),'utf8'));
  for(const section of ['Personagem','Itens','Criaturas','Mapa','Progresso','Terreno'])assert(fs.existsSync(path.join(folder,manifest.sections[section].file)));
  fs.writeFileSync(path.join(folder,manifest.sections.Terreno.file),'broken');
  const recovered=await page.evaluate(async(id)=>{await WorldSaves.load(id);return {day:game.day,inventory:game.inventory.count(ITEM.BAIT_INSECT)};},result.id);assert.equal(recovered.day,9);assert.equal(recovered.inventory,24);
  await page.evaluate(()=>WorldSaves.save(false));
  fs.unlinkSync(path.join(directory,result.secondFolder,'mundo.json'));
  assert.equal((await(await fetch('http://127.0.0.1:18923/server/world-saves.php')).json()).worlds.length,2);
  const legacy=JSON.parse(zlib.gunzipSync(Buffer.from(await(await fetch('http://127.0.0.1:18923/server/world-saves.php?action=load&id='+result.id)).arrayBuffer())));
  const migratedIds=[];
  for(const name of ['Mesmo nome','Mesmo nome','CON','../Fora:do mundo']){
   const id=crypto.randomUUID();migratedIds.push(id);legacy.meta={...legacy.meta,id,name};legacy.state.props.game.props.day=43;
   const backup=zlib.gzipSync(JSON.stringify(legacy));fs.writeFileSync(path.join(directory,id+'.valdoria.bak'),backup);
   legacy.state.props.game.props.day=44;fs.writeFileSync(path.join(directory,id+'.valdoria'),zlib.gzipSync(JSON.stringify(legacy)));fs.writeFileSync(path.join(directory,id+'.json'),JSON.stringify(legacy.meta));fs.writeFileSync(path.join(directory,id+'.lock'),'');
  }
  const migrated=await(await fetch('http://127.0.0.1:18923/server/world-saves.php?action=migrate',{method:'POST',headers:{'X-Valdoria-Save':'1'}})).json();assert.equal(migrated.migrated,4,JSON.stringify(migrated));
  const listing=(await(await fetch('http://127.0.0.1:18923/server/world-saves.php')).json()).worlds;assert.equal(listing.length,6);
  assert.deepEqual(listing.filter(m=>m.name==='Mesmo nome').map(m=>m.folder).sort(),['Mesmo nome','Mesmo nome (2)']);
  for(const id of migratedIds){const meta=listing.find(m=>m.id===id);assert(!fs.existsSync(path.join(directory,id+'.valdoria')));assert(fs.existsSync(path.join(directory,meta.folder,'Backups/Legado',id+'.valdoria')));assert.equal(path.dirname(path.resolve(directory,meta.folder)),path.resolve(directory));}
  await page.evaluate(async id=>{await WorldSaves.load(id);if(game.day!==44||game.inventory.count(ITEM.BAIT_INSECT)!==24)throw Error('Migration lost progress');},migratedIds[0]);
  assert.equal((await(await fetch('http://127.0.0.1:18923/server/world-saves.php?action=migrate',{method:'POST',headers:{'X-Valdoria-Save':'1'}})).json()).migrated,0);
  const denied=await fetch('http://127.0.0.1:18923/server/world-saves.php?action=save&id='+result.id,{method:'PUT',body:'bad'});assert.equal(denied.status,403);
  const traversal=await fetch('http://127.0.0.1:18923/server/world-saves.php?action=load&id=../escape');assert.equal(traversal.status,400);
  const cross=await fetch('http://127.0.0.1:18923/server/world-saves.php',{headers:{Origin:'http://evil.test'}});assert.equal(cross.status,403);
  await page.reload();await page.waitForFunction(()=>WorldSaves.worlds.length===6,null,{polling:25});await page.locator('[data-action="continue-worlds"]').click();await page.locator('[data-action="load-world"][data-world-id="'+result.id+'"]').click();await page.waitForFunction(id=>WorldSaves.active?.id===id,result.id,{polling:25});
  assert.equal(await page.evaluate(()=>game.day),9);assert.deepEqual(errors,[]);
  console.log(JSON.stringify({fullWorld:result,restore:true,backupRecovery:true,reloadAndActualClick:true,security:true,files:fs.readdirSync(directory).map(file=>({file,bytes:fs.statSync(path.join(directory,file)).size}))}));
 }finally{if(browser)await browser.close();server.kill();await new Promise(r=>setTimeout(r,200));fs.rmSync(directory,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
