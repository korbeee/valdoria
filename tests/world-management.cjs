const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const {spawn}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const zlib=require('node:zlib'),crypto=require('node:crypto');
const directory=path.resolve('tests/manage-fixture-'+Date.now()),base='http://127.0.0.1:18925';
fs.mkdirSync(directory);
const server=spawn('C:/xampp/php/php.exe',['-S','127.0.0.1:18925','-t',process.cwd()],{env:{...process.env,VALDORIA_SAVE_DIR:directory},stdio:'ignore',windowsHide:true});
const headers={'X-Valdoria-Save':'1','Content-Type':'application/json'};
const api=(action,id,options={})=>fetch(base+'/server/world-saves.php?action='+action+(id?'&id='+id:''),options);
(async()=>{
 let browser;
 try{
  for(let i=0;i<100;i++){try{await api('list');break;}catch{await new Promise(r=>setTimeout(r,50));}}
  const ids=[crypto.randomUUID(),crypto.randomUUID()],saves=[];
  for(const id of ids){
   const save={format:'valdoria-world',version:1,meta:{id,name:'Mesmo nome',savedAt:'2026-10-06T12:00:00Z',size:'pequeno',day:7,w:16,h:16},state:{$id:1,type:'object',props:{world:{$id:2,type:'object',props:{seed:123}},game:{$id:3,type:'object',props:{day:7,mobs:[],chests:[]}}}}};
   saves.push(save);
   for(let i=0;i<2;i++)assert.equal((await api('save',id,{method:'PUT',headers,body:zlib.gzipSync(JSON.stringify(save))})).status,200);
  }
  const original=(await(await api('list')).json()).worlds,folder=path.join(directory,original.find(m=>m.id===ids[0]).folder);
  const manifest=JSON.parse(fs.readFileSync(path.join(folder,'mundo.json'))),sections=Object.values(manifest.sections).map(s=>[s.file,fs.readFileSync(path.join(folder,s.file))]);
  browser=await chromium.launch({channel:'msedge',headless:true});
  const page=await browser.newPage({viewport:{width:1280,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{requestAnimationFrame=()=>0;localStorage.setItem('valdoria.autoconnect','0');});
  await page.goto(base+'/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof WorldSaves!=='undefined'&&WorldSaves.worlds.length===2,null,{polling:25,timeout:15000});
  await page.locator('[data-action="continue-worlds"]').click();
  const row=()=>page.locator('.saved-world-row[data-world-id="'+ids[0]+'"]');
  assert.equal(await row().locator('svg').first().getAttribute('shape-rendering'),'crispEdges');assert(await row().locator('svg rect').count()>20);
  await row().locator('[data-action="rename-world"]').click();
  await row().locator('input').fill('Cancelado');await page.keyboard.press('Escape');
  assert.equal(await page.locator('.saved-world-editor').count(),0);assert.equal(await page.evaluate(()=>Menu.current()),'saved-worlds');
  assert.equal((await(await api('list')).json()).worlds.find(m=>m.id===ids[0]).name,'Mesmo nome');
  await page.evaluate(id=>{WorldSaves.active=WorldSaves.worlds.find(m=>m.id===id);WorldSaves.activeWorld=game.world;},ids[0]);
  await row().locator('[data-action="rename-world"]').click();await row().locator('input').fill('   ');
  await row().getByRole('button',{name:'Salvar nome',exact:true}).click();assert.equal(await row().locator('.save-error').textContent(),'Digite um nome para o mundo.');
  await row().locator('input').fill('Aventura <nova>');
  await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Salvar nome');await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'world-edit-name');
  const renameFailure=route=>route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({error:'Falha temporária de teste'})});await page.route('**/server/world-saves.php?action=rename*',renameFailure);
  await row().getByRole('button',{name:'Salvar nome',exact:true}).click();await row().locator('.save-error').filter({hasText:'Falha temporária de teste'}).waitFor();
  assert.equal(await row().locator('input').isDisabled(),false);await page.unroute('**/server/world-saves.php?action=rename*',renameFailure);
  await row().getByRole('button',{name:'Salvar nome',exact:true}).click();
  await page.waitForFunction(id=>!WorldSaves.loading&&WorldSaves.worlds.find(m=>m.id===id)?.name==='Aventura <nova>',ids[0],{polling:25,timeout:15000});
  assert.equal(await page.evaluate(()=>WorldSaves.active.name),'Aventura <nova>');
  for(const [file,bytes] of sections)assert.deepEqual(fs.readFileSync(path.join(folder,file)),bytes);
  for(const file of ['mundo.json','Sistema/recuperacao.json','Backups/mundo.json'])assert.equal(JSON.parse(fs.readFileSync(path.join(folder,file))).meta.name,'Aventura <nova>');
  const loaded=JSON.parse(zlib.gunzipSync(Buffer.from(await(await api('load',ids[0])).arrayBuffer())));
  assert.deepEqual(loaded.state,saves[0].state);assert.equal(loaded.meta.savedAt,saves[0].meta.savedAt);
  await row().locator('[data-action="delete-world"]').click();
  assert.match(await row().locator('.saved-world-editor').textContent(),/Aventura <nova>/);
  await row().getByRole('button',{name:'Cancelar',exact:true}).click();assert.equal((await(await api('list')).json()).worlds.length,2);
  await page.screenshot({path:'tests/world-management.png'});
  await row().locator('[data-action="rename-world"]').click();await page.screenshot({path:'tests/world-management-rename.png'});await page.keyboard.press('Escape');
  for(const width of [320,640,1280]){
   await page.setViewportSize({width,height:900});await row().locator('[data-action="rename-world"]').click();
   assert(await page.evaluate(()=>document.querySelector('#menu-root').scrollWidth<=innerWidth),'List overflow at '+width);
   await page.keyboard.press('Escape');
  }
  await row().locator('[data-action="delete-world"]').click();await page.screenshot({path:'tests/world-management-delete.png'});await row().getByRole('button',{name:'Excluir mundo',exact:true}).click();
  await page.waitForFunction(()=>!WorldSaves.loading&&WorldSaves.worlds.length===1,null,{polling:25,timeout:15000});
  assert.equal(await page.evaluate(()=>WorldSaves.active),null);assert.equal(await page.evaluate(()=>WorldSaves.save(false)),false);
  assert(!fs.existsSync(folder));assert.equal((await(await api('list')).json()).worlds[0].id,ids[1]);
  assert.equal((await api('save',ids[0],{method:'PUT',headers,body:zlib.gzipSync(JSON.stringify(saves[0]))})).status,400);
  assert.equal((await api('load',ids[0])).status,400);
  assert.equal((await api('delete',ids[0],{method:'DELETE',headers})).status,200);
  assert.equal((await api('delete','../escape',{method:'DELETE',headers})).status,400);
  assert.equal((await api('delete',ids[1],{method:'DELETE'})).status,403);
  for(const name of ['   ','a'.repeat(49),'bad\u0001name'])assert.equal((await api('rename',ids[1],{method:'POST',headers,body:JSON.stringify({name})})).status,400);
  const untouched=JSON.parse(zlib.gunzipSync(Buffer.from(await(await api('load',ids[1])).arrayBuffer())));assert.deepEqual(untouched.state,saves[1].state);
  assert.deepEqual(errors,[]);console.log('World management passed: rename, cancel, confirm deletion, active world, backups, stale saves, validation and responsive layout.');
 }finally{
  if(browser)await browser.close();server.kill();await new Promise(r=>setTimeout(r,200));
  assert.equal(path.dirname(directory),path.resolve('tests'));assert(path.basename(directory).startsWith('manage-fixture-'));fs.rmSync(directory,{recursive:true,force:true});
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
