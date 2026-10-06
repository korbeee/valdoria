const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;localStorage.setItem('valdoria.autoconnect','0');});
  await page.goto('http://localhost/jogo-teste/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof netPlain==='function');
  const result=await page.evaluate(()=>{
   const source=createExplosion(100,100),remote=JSON.parse(JSON.stringify(netPlain(source)));
   if(remote.img||remote.canvas)throw Error('Recursos de desenho foram enviados pela rede');
   const c=makeCanvas(200,200),ctx=c.getContext('2d');
   drawExplosions(ctx,{explosions:[remote]});
   if(!ctx.getImageData(0,0,200,200).data.some((v,i)=>i%4===3&&v))throw Error('Explosão remota vazia');
   const next=JSON.parse(JSON.stringify(netPlain(source)));next.t=.3;drawExplosions(ctx,{explosions:[next]});
   if(next.canvas!==remote.canvas||next.field!==remote.field)throw Error('Buffers remotos não foram reutilizados');
   for(let i=0;i<15;i++){const e=JSON.parse(JSON.stringify(netPlain(source)));e.t=i*.1;drawExplosions(ctx,{explosions:[e]});}
   return 'Explosões remotas desenhadas sem erros, com buffers reutilizados.';
  });
  if(errors.length)throw Error(errors.join('\n'));console.log(result);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
