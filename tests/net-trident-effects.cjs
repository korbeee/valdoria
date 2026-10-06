const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage();
  await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;localStorage.setItem('valdoria.autoconnect','0');});
  await page.goto('http://localhost/jogo-teste/',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof netVisualList==='function');
  const checks=await page.evaluate(()=>{
   const checks=[],check=(ok,label)=>{if(!ok)throw Error(label);checks.push(label);};
   const c=makeCanvas(100,100),ctx=c.getContext('2d');
   const painted=()=>ctx.getImageData(0,0,100,100).data.some((v,i)=>i%4===3&&v);
   const mist={netVisualId:1,type:'mist',x:50,y:50,r0:4,r1:16,t:.49,life:.5};
   drawTridentEffects(ctx,{trident:{puddles:[],bolts:[],thrown:null,fx:[{...mist,t:.55}]}});
   check(!painted(),'névoa vencida não vira uma esfera branca opaca');
   for(const type of ['drop','ripple','ring','flash']){
    ctx.clearRect(0,0,100,100);
    drawTridentEffects(ctx,{trident:{puddles:[],bolts:[],fx:[{...mist,type,t:.55,size:2,vx:0,vy:0,ang:0,w:2}]}});
    check(!painted(),type+' vencido não reaparece durante o desenho');
   }
   const result=netVisualList([mist],null,1,.06);
   check(result.length===0,'previsão remota descarta efeitos ao terminar a duração');
   check(mist.t===.49,'previsão preserva o pacote original');
   ctx.clearRect(0,0,100,100);
   drawTridentEffects(ctx,{trident:{puddles:[],bolts:[],fx:[{...mist,t:.25}]}});
   check(painted(),'névoa ativa mantém o efeito de água');
   check(ctx.globalAlpha===1&&ctx.globalCompositeOperation==='source-over','efeitos restauram o estado do desenho');
   ctx.clearRect(0,0,100,100);
   netDrawMenuBadge(ctx,player,'inventory');
   check(!painted(),'indicador do próprio menu fica invisível');
   netDrawMenuBadge(ctx,{x:0,y:10,w:14},'inventory');
   check(painted(),'indicador do menu do outro jogador continua visível');
   return checks;
  });
  console.log(checks.join('\n'));console.log(checks.length+' verificações passaram.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
