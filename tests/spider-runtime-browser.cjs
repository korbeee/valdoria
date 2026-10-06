const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'playwright');
const {loadImage,createCanvas}=require('C:/Users/bagre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const manifest=JSON.parse(fs.readFileSync('assets/spider/integrated/manifest.json','utf8'));
 const atlas=await loadImage('assets/spider/integrated/atlas.png'),cv=createCanvas(atlas.width,atlas.height),ac=cv.getContext('2d');ac.drawImage(atlas,0,0);
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>window.requestAnimationFrame=()=>1);
  await page.route('**/assets/spider/**',r=>r.abort());await page.goto('http://localhost/jogo-teste/');
  const result=await page.evaluate(()=>{
   const pixels=[],bounds=[];
   for(let f=0;f<SPIDER_SHEET.count;f++){
    const sp=wildlifeSprite('fiandeira',f);if(!sp.hurt)throw Error('missing hurt');const d=sp.normal.getContext('2d').getImageData(0,0,SPIDER_SHEET.W,SPIDER_SHEET.H).data;
    let l=999,t=999,r=-1,b=-1;for(let y=0;y<SPIDER_SHEET.H;y++)for(let x=0;x<SPIDER_SHEET.W;x++)if(d[(y*SPIDER_SHEET.W+x)*4+3]){l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}
    if(l<=0||r>=SPIDER_SHEET.W-1||t<0||b!==SPIDER_SHEET.H-1)throw Error('clipping/ground '+f);bounds.push([l,t,r,b]);pixels.push(Array.from(d));
   }
   const states={hunt:'walk',stalk:'walk',sleep:'sleep',wake:'screech',screech:'screech',bite:'bite',spit:'cast',lasso:'cast',rain:'cast',channel:'cast',drop:'hang',climb:'hang',aim:'hang',daze:'daze'};
   for(const [state,clip]of Object.entries(states))for(let i=0;i<80;i++){const m={state,stateT:state==='wake'?.6:i/40,clock:i/40,vx:state==='hunt'?90:0,gait:i/5};const f=fiandeiraFrame(m),c=SPIDER_SHEET.clips[clip];if(f<c.start||f>=c.start+c.count)throw Error('wrong animation '+state);}
   const out=makeCanvas(1152,672),ctx=out.getContext('2d');ctx.fillStyle='#28252f';ctx.fillRect(0,0,out.width,out.height);
   const cases=[['hunt','floor'],['bite','floor'],['cast','floor'],['daze','floor'],['sleep','ceiling'],['stalk','ceiling'],['aim','ceiling'],['drop','floor'],['screech','floor'],['channel','floor'],['climb','floor'],['idle','floor']];
   cases.forEach(([state,mode],i)=>{const x=i%4*288,y=Math.floor(i/4)*224;ctx.save();ctx.translate(x,y);ctx.scale(2,2);const m=new Wildlife('fiandeira',0,0);Object.assign(m,{state:state==='cast'?'spit':state,mode,stateT:.3,clock:.4,gait:2,sleeping:state==='sleep',facing:i%2?-1:1,hurtTimer:i===11?1:0,x:72-m.w/2,y:mode==='ceiling'?10:110-m.h});ctx.fillStyle='#95734e';ctx.fillRect(0,mode==='ceiling'?9:110,144,1);drawFiandeira(ctx,m);drawSpiderEyes(ctx,{mobs:[m],spiderFx:[]});ctx.restore();ctx.fillStyle='#fff';ctx.fillText(state+' / '+mode,x+8,y+22);});
   return {pixels,bounds,image:out.toDataURL()};
  });
  for(let f=0;f<result.pixels.length;f++){const expected=ac.getImageData(f%8*manifest.W,Math.floor(f/8)*manifest.H,manifest.W,manifest.H).data;assert.deepEqual(result.pixels[f],Array.from(expected),'PNG equality frame '+f);}
  assert.deepEqual(errors,[]);fs.writeFileSync('tests/spider-runtime-browser.png',Buffer.from(result.image.split(',')[1],'base64'));console.log('PASS: '+result.pixels.length+' PNG frames match actual renderer, all states, both facings, floor/ceiling, no external image loading.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
