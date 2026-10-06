const fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage();
  await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;localStorage.setItem('valdoria.autoconnect','0');});
  await page.goto('http://localhost/jogo-teste/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof netMenuThumbnail==='function');
  const result=await page.evaluate(()=>{
   const c=makeCanvas(760,650),ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;
   ctx.fillStyle='#141d28';ctx.fillRect(0,0,c.width,c.height);
   const hashes=new Set();
   for(const [i,menu]of Object.keys(NET_MENU_LABELS).entries()){
    const thumb=netMenuThumbnail(menu);
    if(!thumb||thumb!==netMenuThumbnail(menu))throw Error('Miniatura ausente ou cache inválido: '+menu);
    hashes.add(thumb.toDataURL());ctx.drawImage(thumb,14+i%3*250,14+Math.floor(i/3)*158,224,164-8);
   }
   if(hashes.size!==Object.keys(NET_MENU_LABELS).length)throw Error('Menus com miniaturas idênticas');
   const check=makeCanvas(200,120),g=check.getContext('2d');
   netDrawMenuBadge(g,player,'admin');
   if(g.getImageData(0,0,200,120).data.some((v,i)=>i%4===3&&v))throw Error('Miniatura aparece no jogador local');
   const peer={x:0,y:30,w:14};
   for(const menu of Object.keys(NET_MENU_LABELS))netDrawMenuBadge(g,peer,menu);
   if(!g.getImageData(0,0,200,120).data.some((v,i)=>i%4===3&&v))throw Error('Miniatura remota não aparece');
   if(g.imageSmoothingEnabled!==true||g.globalAlpha!==1)throw Error('Estado do canvas alterado');
   return {png:c.toDataURL(),count:hashes.size};
  });
  fs.writeFileSync(__dirname+'/multiplayer-menu-thumbnails.png',Buffer.from(result.png.split(',')[1],'base64'));
  console.log(result.count+' menus distintos, cache, desenho remoto e isolamento do canvas verificados.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
