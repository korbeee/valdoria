const fs=require('fs');
const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'playwright');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{requestAnimationFrame=()=>0;localStorage.setItem('valdoria.autoconnect','0');});
 await page.goto('http://localhost/jogo-teste/',{waitUntil:'domcontentloaded'});
 const result=await page.evaluate(()=>{
  let checks=0;const check=(v,msg)=>{if(!v)throw Error(msg);checks++;};
  const world={w:200,skyTop:Int16Array.from({length:200},(_,x)=>Math.floor(9+x*.2)),skyGapBottom:new Int16Array(200)};
  const g={world,weather:{fog:1,fogDrift:33},daylight:1};
  const render=(ox,oy=0,z=1)=>{const c=makeCanvas(640,480),ctx=c.getContext('2d');drawWeatherFog(ctx,g,640,480,ox,oy,z);return {c,ctx,data:ctx.getImageData(0,0,640,480).data};};
  const a=render(0),b=render(64);
  for(let y=0;y<480;y+=7)for(let x=0;x<576;x+=7){const i=(y*640+x+64)*4,j=(y*640+x)*4;check(a.data[i+3]===b.data[j+3],'neblina mudou no mesmo ponto do mundo ao mover a câmera');}
  for(let x=0;x<640;x+=11){const floor=wxFogGround(world,Math.floor(x/T));for(let y=floor;y<480;y+=13)check(a.data[(y*640+x)*4+3]===0,'neblina dentro do terreno');}
  const underground=render(0,1000);check(!underground.data.some((v,i)=>i%4===3&&v),'neblina no subsolo');
  const tex=wxFogTexture(),data=tex.getContext('2d').getImageData(0,0,tex.width,tex.height).data;
  for(let y=0;y<tex.height;y++)check(Math.abs(data[(y*tex.width)*4+3]-data[(y*tex.width+tex.width-1)*4+3])<=1,'emenda na textura');
  const ctx=a.ctx;ctx.setTransform(2,0,0,2,8,9);ctx.globalAlpha=.4;drawWeatherFog(ctx,g,640,480,0,0,1);const m=ctx.getTransform();check(m.a===2&&m.e===8&&m.f===9&&ctx.globalAlpha===.4,'neblina alterou outros desenhos');
  g.weather.fogDrift=63;const moved=render(0);check(moved.data.some((v,i)=>i%4===3&&v!==a.data[i]),'vento não moveu a névoa');
  const scene=makeCanvas(960,540),sc=scene.getContext('2d');const sky=sc.createLinearGradient(0,0,0,540);sky.addColorStop(0,'#709dc0');sky.addColorStop(1,'#b6caca');sc.fillStyle=sky;sc.fillRect(0,0,960,540);
  sc.fillStyle='#728d8f';sc.beginPath();sc.moveTo(0,310);sc.lineTo(180,110);sc.lineTo(340,275);sc.lineTo(580,100);sc.lineTo(790,285);sc.lineTo(960,180);sc.lineTo(960,540);sc.lineTo(0,540);sc.fill();
  for(let tx=0;tx<60;tx++){const ground=wxFogGround(world,tx);sc.fillStyle='#404d48';sc.fillRect(tx*T,ground,T,540-ground);sc.fillStyle='#668263';sc.fillRect(tx*T,ground,T,3);}
  drawWeatherFog(sc,g,960,540,0,0,1);
  return {checks,image:scene.toDataURL()};
 });if(errors.length)throw Error(errors.join('\n'));fs.writeFileSync(__dirname+'/fog-rendering.png',Buffer.from(result.image.split(',')[1],'base64'));console.log(result.checks+' verificações: ancoragem, vento, textura contínua, subsolo e estado do desenho.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
