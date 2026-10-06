const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const directory='C:/Users/bagre/Documents/My Games/Valdoria';
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>{requestAnimationFrame=()=>0;localStorage.setItem('valdoria.autoconnect','0');});await page.goto('http://localhost/jogo-teste/',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>WorldSaves.worlds.length>0,null,{polling:25,timeout:120000});const results=[];
 for(const folder of fs.readdirSync(directory)){
  const index=path.join(directory,folder,'mundo.json');if(!fs.existsSync(index))continue;
  const manifest=JSON.parse(fs.readFileSync(index,'utf8')),legacy=path.join(directory,folder,'Backups/Legado',manifest.meta.id+'.valdoria');if(!fs.existsSync(legacy))continue;
  const bytes=fs.readFileSync(legacy),sourceMeta=JSON.parse(zlib.gunzipSync(bytes)).meta,exact=manifest.meta.savedAt===sourceMeta.savedAt;
  const result=await page.evaluate(async({id,base64,exact})=>{
   const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0)),source=JSON.parse(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text()),original=loadGraph(source.state);
   await WorldSaves.load(id);if(game.world.seed!==original.world.seed)throw Error('Seed changed');
   if(exact){
    for(const key of ['tiles','walls','water','lava'])if(original.world[key]&&!game.world[key].every((v,i)=>v===original.world[key][i]))throw Error(key+' changed');
    if(player.x!==original.player.x||player.y!==original.player.y||player.hp!==original.player.hp||game.day!==original.game.day)throw Error('Player or time changed');
    if(game.chests.size!==original.game.chests.size||game.mobs.length!==original.game.mobs.length||game.npcs.length!==original.game.npcs.length)throw Error('Actors or chests changed');
    const totals=new Map();for(const stack of [...original.inventory.slots,original.held,...(original.bench||[])])if(stack)totals.set(stack.item,(totals.get(stack.item)||0)+stack.count);for(const [item,count]of totals)if(game.inventory.count(item)!==count)throw Error('Inventory changed');
   }
   for(let i=0;i<5;i++)update(1/60);renderer.render(game);return {id,name:WorldSaves.active.name,w:world.w,h:world.h,originalMatched:exact,rendered:true};
  },{id:manifest.meta.id,base64:bytes.toString('base64'),exact});
  assert(manifest.meta.savedAt>=sourceMeta.savedAt);results.push(result);
 }
 assert(results.length>0);assert.deepEqual(errors,[]);console.log(JSON.stringify({existingWorlds:results,legacyOriginalsPreserved:true}));
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
