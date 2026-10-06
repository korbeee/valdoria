const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs=require('node:fs');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>window.requestAnimationFrame=()=>0);await page.goto('http://localhost/jogo-teste/?fauna='+Date.now(),{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>typeof wildlifeSprite==='function'&&WILDLIFE.forest_boar);
 const result=await page.evaluate(()=>{
  const kinds=['forest_boar','forest_deer'],sheet=makeCanvas(64*14,56*2),sc=sheet.getContext('2d'),gallery=makeCanvas(900,460),gc=gallery.getContext('2d'),checks=[];gc.imageSmoothingEnabled=false;gc.fillStyle='#162624';gc.fillRect(0,0,900,460);
  kinds.forEach((kind,row)=>{const d=WILDLIFE[kind],poses=new Set();gc.fillStyle='#efd9ae';gc.font='bold 18px monospace';gc.fillText(d.name,24,row*225+30);
   for(let f=0;f<14;f++){const {normal,hurt}=wildlifeSprite(kind,f);if(!normal.width||hurt.width!==normal.width)throw Error('Sprite inválido: '+kind);poses.add(normal.toDataURL());sc.drawImage(normal,f*64+Math.floor((64-normal.width)/2),row*56+56-normal.height);}
   for(const [col,f] of [8,2,10,12].entries()){const img=wildlifeSprite(kind,f).normal;gc.fillStyle='#243c32';gc.fillRect(20+col*220,row*225+45,210,180);gc.fillStyle='#46654a';gc.fillRect(20+col*220,row*225+207,210,3);gc.drawImage(img,25+col*220+(200-img.width*3)/2,row*225+207-img.height*3,img.width*3,img.height*3);}
   checks.push({kind,poses:poses.size,size:WILD_SIZES[d.shape]});
  });return {sheet:sheet.toDataURL().split(',')[1],gallery:gallery.toDataURL().split(',')[1],checks};
 });if(errors.length)throw Error(errors.join('\n'));fs.writeFileSync(process.argv[2]||'tests/forest-fauna-after.png',Buffer.from(result.gallery,'base64'));fs.writeFileSync('tests/forest-fauna-sheet.png',Buffer.from(result.sheet,'base64'));console.log(JSON.stringify(result.checks));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
