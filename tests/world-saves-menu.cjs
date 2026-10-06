const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const directory='C:/Users/bagre/Documents/My Games/Valdoria';let id,worldFolder;
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{requestAnimationFrame=()=>0;localStorage.setItem('valdoria.autoconnect','0');const interval=window.setInterval;window.setInterval=(fn,ms,...args)=>{if(ms===300000){window.saveInterval=ms;window.triggerAutosave=fn;return interval(fn,ms,...args);}return interval(fn,ms,...args);};});
 await page.goto('http://localhost/jogo-teste/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>typeof WorldSaves!=='undefined'&&WorldSaves.directory.includes('My Games'),null,{polling:25});
 await page.locator('[data-go="world"]').click();await page.locator('#world-name').fill('Teste automático de salvamento');await page.locator('#world-seed').fill('93810');await page.locator('#world-skip-intro').check();await page.locator('[data-action="world-next"]').click();await page.locator('[data-action="confirm"]').click();
 await page.waitForFunction(()=>WorldSaves.active&&WorldSaves.lastSaved>0,null,{polling:25,timeout:90000});id=await page.evaluate(()=>WorldSaves.active.id);
 worldFolder=path.resolve(directory,await page.evaluate(()=>WorldSaves.active.folder));assert(fs.existsSync(path.join(worldFolder,'mundo.json')));assert.equal(await page.evaluate(()=>WorldSaves.active.name),'Teste automático de salvamento');
 await page.evaluate(()=>{game.day=12;Menu.openPause();});
 await page.route('**/server/world-saves.php?action=save*',route=>route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({error:'Falha simulada de disco'})}));
 await page.locator('[data-action="save-world"]').click();await page.waitForFunction(()=>WorldSaves.error.includes('Falha simulada'),null,{polling:25});assert.equal(await page.evaluate(()=>game.day),12);assert.equal(await page.locator('[data-screen="pause"]').isVisible(),true);
 await page.unroute('**/server/world-saves.php?action=save*');await page.locator('[data-action="save-world"]').click();await page.waitForFunction(()=>!WorldSaves.pending&&!WorldSaves.error,null,{polling:25});
 await page.screenshot({path:'tests/world-saves-pause.png'});
 await page.locator('[data-action="resume"]').click();await page.evaluate(()=>{game.day=15;});
 const previous=await page.evaluate(()=>WorldSaves.lastSaved);
 assert.equal(await page.evaluate(()=>window.saveInterval),300000);await page.evaluate(()=>window.triggerAutosave());
 await page.waitForFunction(previous=>WorldSaves.lastSaved>previous,previous,{polling:100,timeout:30000});assert.equal(await page.evaluate(()=>WorldSaves.active.day),15);
 await page.evaluate(()=>{game.day=18;Menu.openPause();});await page.locator('[data-action="quit"]').click();await page.waitForFunction(()=>typeof Menu!=='undefined'&&typeof WorldSaves!=='undefined'&&Menu.current()==='main'&&WorldSaves.active===null&&WorldSaves.worlds.length>0,null,{polling:25,timeout:60000});
 await page.locator('[data-action="continue-worlds"]').click();await page.locator('[data-world-id="'+id+'"]').click();await page.waitForFunction(id=>WorldSaves.active?.id===id,id,{polling:25,timeout:60000});assert.equal(await page.evaluate(()=>game.day),18);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({directory,actualNewGame:true,firstSave:true,manualSave:true,diskErrorPreservesGame:true,automatic5Minutes:true,saveOnExit:true,continueByClick:true}));
 }finally{await browser.close();if(worldFolder){if(path.dirname(worldFolder)!==path.resolve(directory)||JSON.parse(fs.readFileSync(path.join(worldFolder,'mundo.json'),'utf8')).meta.id!==id)throw Error('Unexpected cleanup path');fs.rmSync(worldFolder,{recursive:true,force:true});}if(id){const lock=path.join(directory,'Sistema/Travas',id+'.lock');if(fs.existsSync(lock))fs.unlinkSync(lock);}}
})().catch(e=>{console.error(e);process.exitCode=1;});
