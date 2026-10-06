const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>window.requestAnimationFrame=()=>1);
  // Art must be available on the very first render, even with image loading blocked.
  await page.route('**/assets/tiger/**',r=>r.abort());
  await page.goto('http://localhost/jogo-teste/');
  const result=await page.evaluate(()=>{
   const sizes=[];
   for(let f=0;f<TIGER_FRAME.count;f++){
    const s=wildlifeSprite('tiger',f);if(!s.normal||!s.hurt)throw Error('missing frame '+f);
    const d=s.normal.getContext('2d').getImageData(0,0,s.normal.width,s.normal.height).data;
    let x0=999,y0=999,x1=-1,y1=-1;for(let y=0;y<TIGER_ART.H;y++)for(let x=0;x<TIGER_ART.W;x++)if(d[(y*TIGER_ART.W+x)*4+3]){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
    if(x0<=0||x1>=TIGER_ART.W-1||y0<0||y1!==TIGER_ART.H-1)throw Error('bounds/ground '+f);
    sizes.push({f,width:x1-x0+1,height:y1-y0+1});
   }
   const out=makeCanvas(1000,540),ctx=out.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.fillStyle='#28272b';ctx.fillRect(0,0,1000,540);
   const states=[['sleep',true,0],['hunt',false,0],['swipe',false,.35],['pounce',false,.15],['roar',false,.5],['stun',false,.5]];
   states.forEach(([state,sleeping,stateT],i)=>{const m=new Wildlife('tiger',0,0);m.state=state;m.stateT=stateT;m.sleeping=sleeping;m.clock=0;m.onGround=state!=='pounce';m.vy=-10;m.vx=0;m.facing=i%2?-1:1;m.x=70;m.y=100-m.h;ctx.save();ctx.translate(i%3*330,Math.floor(i/3)*260);ctx.scale(2,2);ctx.fillStyle='#ac895a';ctx.fillRect(0,100,165,2);drawWildlife(ctx,m);ctx.restore();ctx.fillStyle='#fff';ctx.fillText(state,i%3*330+12,Math.floor(i/3)*260+20);});
   wildlifeSprite('fiandeira',23);wildlifeSprite('cascoferro',20);
   return {sizes,image:out.toDataURL()};
  });
  fs.writeFileSync('tests/tiger-runtime-browser.png',Buffer.from(result.image.split(',')[1],'base64'));
  fs.writeFileSync('tests/tiger-runtime-metrics.json',JSON.stringify(result.sizes,null,2));assert.deepEqual(errors,[]);
  console.log('PASS: 49 normal/hurt frames in actual game renderer, image requests blocked, both facings, spider/beetle shared helpers.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
