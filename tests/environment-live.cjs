const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'playwright');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({viewport:{width:1100,height:760}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&m.text().startsWith('[quadro]'))errors.push(m.text());});
 await page.goto('http://localhost/jogo-teste/');await page.waitForFunction(()=>typeof game==='object');
 await page.evaluate(()=>{finishOpening(game);Menu.root.hidden=true;game.paused=false;game.intro.active=false;game.openingComplete=true;setWeatherEvent(game,'storm',120);});
 await page.keyboard.down('KeyD');await page.waitForTimeout(1200);await page.keyboard.up('KeyD');
 await page.waitForTimeout(1800);
 const result=await page.evaluate(()=>({clock:game.weather.clock,anchors:game.environment?.anchors.length,
   finite:Number.isFinite(game.player.x)&&Number.isFinite(game.cam.x),sharp:!renderer.ctx.imageSmoothingEnabled}));
 assert.ok(result.clock>1);assert.ok(result.finite&&result.sharp);assert.deepEqual(errors,[]);
 await page.screenshot({path:'tests/environment-live.png'});console.log(JSON.stringify({...result,errors}));
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
