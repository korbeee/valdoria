const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'playwright');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({viewport:{width:1280,height:850}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>window.requestAnimationFrame=()=>0);
 await page.goto('http://localhost/jogo-teste/tests/yeti-preview.html?v=motion7');await page.waitForFunction(()=>sheet.complete&&sheet.naturalWidth===2560);
 assert.equal(await page.locator('[data-pose]').count(),9);
 for(let pose=0;pose<9;pose++){
  await page.locator(`[data-pose="${pose}"]`).click();
  await page.evaluate(()=>{for(let f=0;f<=20;f++)draw(start+durations[pose]*1000*f/16);});
 }
 await page.locator('[data-pose="3"]').click();await page.evaluate(()=>draw(start+650));await page.screenshot({path:'tests/yeti-preview-screen.png',fullPage:true});
 const before=await page.evaluate(()=>facing);await page.locator('#turn').click();assert.equal(await page.evaluate(()=>facing),-before);
 await page.locator('#replay').click();assert.equal(await page.evaluate(()=>pose),3);
 await page.locator('#auto').click();await page.evaluate(()=>draw(start+durations[pose]*1000+1));assert.equal(await page.evaluate(()=>pose),4);
 await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.deepEqual(errors,[]);console.log('9 sequências, replay, direção, reprodução automática e layout móvel verificados.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
