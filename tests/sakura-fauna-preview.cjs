const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs=require('node:fs');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>window.requestAnimationFrame=()=>1);await page.goto('http://localhost/jogo-teste/');await page.waitForFunction(()=>typeof game==='object');
 const checks=await page.evaluate(()=>{
 const results={};
 for(const kind of ['sika','tanuki','tsuru','kitsune']) {
  const frames=[];
  for(let f=0;f<14;f++) {
   const sprite=wildlifeSprite(kind,f),[w,h]=WILD_SIZES[kind];
   if(sprite.normal.width!==w||sprite.normal.height!==h||sprite.hurt.width!==w||sprite.hurt.height!==h)throw Error(kind+': invalid dimensions');
   const pixels=sprite.normal.getContext('2d').getImageData(0,0,w,h).data;
   if(!pixels.some((v,i)=>i%4===3&&v))throw Error(kind+': empty sprite');
   frames.push(sprite.normal.toDataURL());
  }
  const variants=new Set(frames).size;if(variants<5)throw Error(kind+': animation is missing');
  results[kind]={frames:14,distinctPoses:variants};
 }
 return results;
});console.log(JSON.stringify(checks));
 const url=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=1000;c.height=540;const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.fillStyle='#172524';ctx.fillRect(0,0,c.width,c.height);
 ['sika','tanuki','tsuru','kitsune'].forEach((kind,i)=>{ctx.fillStyle='#f0e7d4';ctx.font='16px monospace';ctx.fillText(WILDLIFE[kind].name,24+i*245,30);[8,2,10].forEach((f,j)=>{const img=wildlifeSprite(kind,f).normal;ctx.fillStyle='#263b34';ctx.fillRect(20+i*245,45+j*160,225,150);ctx.drawImage(img,32+i*245,185+j*160-img.height*3, img.width*3,img.height*3);});});return c.toDataURL();});
 fs.writeFileSync(process.argv[2]||'tests/sakura-fauna-after.png',Buffer.from(url.split(',')[1],'base64'));if(errors.length)throw Error(errors.join('\n'));console.log('Sprite gallery rendered; no browser errors.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
