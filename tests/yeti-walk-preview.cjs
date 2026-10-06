const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({viewport:{width:1280,height:850}});await page.addInitScript(()=>window.requestAnimationFrame=()=>0);
 await page.goto('http://localhost/jogo-teste/tests/yeti-preview.html?v=anatomy12');await page.waitForFunction(()=>sheet.complete&&sheet.naturalWidth===2560);
 await page.locator('[data-pose="1"]').click();
 for(const phase of [0,4,8,12]){await page.evaluate(phase=>draw(start+durations[1]*1000*phase/16),phase);await page.locator('canvas').screenshot({path:'tests/yeti-walk-'+phase+'.png'});}
 await page.goto('http://localhost/jogo-teste/');await page.waitForFunction(()=>typeof YETI_WALK_STRIDE==='number');
 const result=await page.evaluate(()=>{
  const frames=YETI_SEQUENCES[1].map(index=>{const data=new Uint8Array(160*152);let p=0;const runs=YETI_PIXEL_FRAMES[index];for(let i=0;i<runs.length;i+=2){data.fill(runs[i+1],p,p+runs[i]);p+=runs[i];}return data;});
  const eyes=data=>{let n=0,x=0;for(let y=35;y<105;y++)for(let px=90;px<145;px++)if([16,17].includes(data[y*160+px])){n++;x+=px;}return {n,x:n?x/n:0};};
  const m={state:'hunt',stateT:0,hp:YETI.hp,vx:YETI.speed,gait:0};const first=SHAPE_HOOKS.yeti.frame(m);m.gait=YETI_WALK_STRIDE/9;const next=SHAPE_HOOKS.yeti.frame(m);
  const iris=frames.map(eyes);
  const legs=frames.map(data=>{let n=0,x=0,y=0;for(let py=133;py<144;py++)for(let px=0;px<160;px++)if(data[py*160+px]>=10&&data[py*160+px]<=12){n++;x+=px;y+=py;}return {x:x/n,y:y/n};});
  const forward=legs[0].x-legs[8].x>20&&legs.slice(1,9).every((p,i)=>p.x<legs[i].x)&&legs.slice(9).every((p,i)=>p.x>legs[i+8].x)&&legs[12].y<legs[0].y-3;
  const c=makeCanvas(640,608),ctx=c.getContext('2d');for(let i=0;i<16;i++)ctx.drawImage(wildlifeSprite('yeti',16+i).normal,i%4*160,Math.floor(i/4)*152);
  return {readable:iris.every(eye=>eye.n>0),eyeDrift:Math.max(...iris.map(e=>e.x))-Math.min(...iris.map(e=>e.x)),unique:new Set(frames.map(data=>Array.from(data).join(','))).size,loop:first===next,forward,stride:YETI_WALK_STRIDE,png:c.toDataURL().split(',')[1]};
 });assert(result.readable&&result.eyeDrift<=4&&result.loop&&result.unique===16&&result.stride===72&&result.forward);fs.writeFileSync('assets/yeti/walk-game-forward-v4.png',Buffer.from(result.png,'base64'));console.log('16 quadros: perna recua no apoio, avança elevada no retorno; rosto estável e passada ligada ao deslocamento.');
 await page.goto('http://localhost/jogo-teste/tests/yeti-preview.html?v=anatomy12');await page.waitForFunction(()=>sheet.complete&&sheet.naturalWidth===2560);
 for(const pose of [2,7]){await page.locator('[data-pose="'+pose+'"]').click();for(const frame of [0,4,8,15]){await page.evaluate(({pose,frame})=>draw(start+durations[pose]*1000*frame/16),{pose,frame});await page.locator('canvas').screenshot({path:'tests/yeti-pose-'+pose+'-'+frame+'.png'});}}
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
