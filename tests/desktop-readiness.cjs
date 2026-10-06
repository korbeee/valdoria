const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawnSync}=require('node:child_process'),{pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'playwright');
(async()=>{
 const html=fs.readFileSync('index.html','utf8'),scripts=[...html.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1].split('?')[0]);
 for(const p of scripts){assert(fs.existsSync(p),p);const r=spawnSync(process.execPath,['--check',p],{encoding:'utf8',windowsHide:true});assert.equal(r.status,0,r.stderr);}
 let server,origin;
 if(process.argv.includes('--http')){server=require('node:http').createServer((req,res)=>{const url=new URL(req.url,'http://localhost'),f=path.resolve('.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));if(!f.startsWith(process.cwd()+path.sep)){res.writeHead(403);return res.end();}fs.readFile(f,(e,data)=>{if(e){res.writeHead(404);return res.end();}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.png':'image/png','.svg':'image/svg+xml'})[path.extname(f)]||'application/octet-stream');res.end(data);});});await new Promise(r=>server.listen(0,'127.0.0.1',r));origin='http://127.0.0.1:'+server.address().port;}
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const ctx=await browser.newContext({viewport:{width:1280,height:720}}),blocked=[],errors=[],warnings=[],localFailures=[];
  await ctx.route(/^https?:/,r=>{if(origin&&new URL(r.request().url()).origin===origin)return r.continue();blocked.push(r.request().url());return r.abort();});
  const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='warning')warnings.push(m.text());});p.on('requestfailed',r=>{if(r.url().startsWith('file:'))localFailures.push(r.url());});
  await p.addInitScript(()=>window.requestAnimationFrame=()=>1);
  await p.goto(origin||pathToFileURL(path.resolve('index.html')).href,{waitUntil:'load'});
  const initial=await p.evaluate(async()=>{await GameCursor.ready;return {title:document.title,game:typeof game,canvas:!!renderer.ctx,storage:typeof localStorage,menu:!!document.querySelector('#menu-root'),cursorsLoaded:Object.values(GameCursor.sprites).filter(s=>s.image).length};});
  await p.keyboard.press('d');
  const result=await p.evaluate(async()=>{
   await newWorld('pequeno',()=>{},777);finishOpening(game);Menu.root.hidden=true;game.intro.active=false;game.paused=false;game.adminGod=true;
   const start=game.player.x;for(let i=0;i<180;i++){update(1/60);if(i%30===0)renderer.render(game);}renderer.render(game);
   const normal=[['bear',0],['tiger',0],['fiandeira',0],['cascoferro',0]].map(([k,f])=>{const s=wildlifeSprite(k,f);return {kind:k,w:s.normal.width,h:s.normal.height,hurt:!!s.hurt};});
   GAME_OPTIONS.volume=37;saveOptions();const audio=new CrashAudio();const audioState={sampleRate:audio.a.sampleRate,state:audio.a.state};await audio.a.close();
   let gpu;try{const g=new WorldPostProcess();gpu={available:!!g.gl,lost:g.lost};}catch(e){gpu={available:false,error:e.message};}
   return {world:[world.w,world.h],playerFinite:[game.player.x,game.player.y,game.player.hp].every(Number.isFinite),advanced:game.clock>0,normal,audio:audioState,gpu,optionsSaved:JSON.parse(localStorage.getItem(OPTIONS_KEY)).volume===37,image:document.getElementById('game').toDataURL()};
  });
  fs.writeFileSync('tests/desktop-readiness.png',Buffer.from(result.image.split(',')[1],'base64'));delete result.image;
  await p.reload({waitUntil:'load'});const persisted=await p.evaluate(()=>GAME_OPTIONS.volume===37);
  const report={mode:origin?'Edge Chromium, isolated loopback server, external network blocked, no XAMPP; not an Electron executable test':'Edge Chromium, local file, all HTTP(S) blocked; not an Electron executable test',scriptsChecked:scripts.length,initial,...result,persistedAfterReload:persisted,blockedNetwork:[...new Set(blocked)],localFailures,errors,warnings};
  fs.writeFileSync('tests/desktop-readiness'+(origin?'-http':'')+'.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
  assert.deepEqual(errors,[]);assert.deepEqual(localFailures,[]);assert(result.playerFinite&&result.advanced&&persisted);if(origin)assert.equal(initial.cursorsLoaded,14);
 }finally{await browser.close();if(server)await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
