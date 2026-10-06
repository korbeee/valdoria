const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try {
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost/jogo-teste/');
 await page.waitForFunction(()=>typeof game==='object');
 const result=await page.evaluate(()=>{
 game.paused=true;
 const c=makeCanvas(920,560),ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;
 ctx.fillStyle='#dce0dc';ctx.fillRect(0,0,c.width,c.height);
 const signatures=new Set();
 for(let f=0;f<14;f++){
 const img=wildlifeSprite('elephant',f).normal;
 const saddle=elephantSaddleSprite(f);
 const pixels=img.getContext('2d').getImageData(0,0,92,66).data;
 for(let y=0;y<66;y++)for(let x=0;x<92;x++)if((x===0||y===0||x===91||y===65)&&pixels[(y*92+x)*4+3])throw Error('Sprite cortado: '+f);
 signatures.add(img.toDataURL());
 const x=f%7*130,y=210+Math.floor(f/7)*160;
 ctx.drawImage(img,x,y,128,92);ctx.fillStyle='#344249';ctx.fillText('Quadro '+f,x+12,y+115);
 if(f>=8)ctx.drawImage(saddle,x,y,128,92);
 }
 ctx.drawImage(wildlifeSprite('elephant',8).normal,28,0,276,198);
 ctx.save();ctx.translate(604,0);ctx.scale(-1,1);ctx.drawImage(wildlifeSprite('elephant',8).normal,0,0,276,198);ctx.restore();
 ctx.drawImage(wildlifeSprite('elephant',8).normal,620,0,276,198);ctx.drawImage(elephantSaddleSprite(8),620,0,276,198);
 return {png:c.toDataURL(),frames:signatures.size};
 });
 fs.writeFileSync('tests/elephant-preview.png',Buffer.from(result.png.split(',')[1],'base64'));
 console.log(JSON.stringify({distinctFrames:result.frames,errors}));
 if(errors.length)process.exitCode=1;
 }finally{await browser.close();}
})();
