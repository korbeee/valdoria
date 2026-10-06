const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs=require('node:fs');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
 const p=await b.newPage();await p.addInitScript(()=>window.requestAnimationFrame=()=>0);
 await p.goto('http://localhost/jogo-teste/');await p.waitForFunction(()=>typeof game==='object');
 const data=await p.evaluate(()=>{
  const c=makeCanvas(840,440),ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;
  ctx.fillStyle='#15131d';ctx.fillRect(0,0,c.width,c.height);ctx.font='20px monospace';
  const before=cellRock(3141,[56,44,78],[18,14,28],12),after=MATERIAL_TEX[TILE.OBSIDIAN];
  [before,after].forEach((tex,i)=>{ctx.fillStyle='#eee9f7';ctx.fillText(i?'NOVA OBSIDIANA':'ANTERIOR',i*420+24,34);for(let y=0;y<2;y++)for(let x=0;x<2;x++)ctx.drawImage(tex.toCanvas(),i*420+24+x*192,56+y*192,192,192);});
  return c.toDataURL();
 });fs.writeFileSync('tests/obsidian-preview.png',Buffer.from(data.split(',')[1],'base64'));console.log('Prévia da textura gerada.');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
