const fs=require('fs'),{chromium}=require(process.env.PLAYWRIGHT_PATH || 'playwright');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await b.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>{requestAnimationFrame=()=>0;localStorage.setItem('valdoria.autoconnect','0');});await page.goto('http://localhost/jogo-teste/',{waitUntil:'domcontentloaded'});await page.evaluate(()=>document.fonts.ready);
 const r=await page.evaluate(()=>{
  let checks=0;const check=(v,m)=>{if(!v)throw Error(m);checks++;};
  const W=160,H=35,w={w:W,h:H,seed:781,coreTop:new Int16Array(W).fill(1),coreTopMin:1,coreZone:Uint8Array.from({length:W},(_,x)=>Math.floor(x/40)),tiles:new Uint8Array(W*H),lightRevision:1,touched:new Set(),decorCut:new Map()};
  for(let x=0;x<W;x++)for(let y=0;y<H;y++)if(y<4||y>21)w.tiles[y*W+x]=TILE.DEEPSTONE;
  w.getTile=(x,y)=>x<0||x>=W||y<0||y>=H?TILE.BEDROCK:w.tiles[y*W+x];w.hasWater=()=>false;
  const g={world:w,weather:{clock:7},daylight:1};const c=makeCanvas(1280,800),ctx=c.getContext('2d');ctx.fillStyle='#0d111b';ctx.fillRect(0,0,1280,800);ctx.imageSmoothingEnabled=false;
  const counts=[0,0,0,0];
  for(let zone=0;zone<4;zone++){
    const bx=(zone%2)*640,by=Math.floor(zone/2)*400,vx=zone*40*T;
    ctx.save();ctx.beginPath();ctx.rect(bx,by,640,400);ctx.clip();ctx.translate(bx-vx,by);
    ctx.fillStyle=['#21171c','#141f32','#172421','#211c19'][zone];ctx.fillRect(vx,0,640,400);
    drawCoreEcologyBackdrop(ctx,g,vx,0,640,400);
    for(let x=zone*40;x<(zone+1)*40;x++)for(const [y,hang]of [[3,true],[22,false]]){
      ctx.fillStyle='#242b35';ctx.fillRect(x*T,hang?0:y*T,T,hang?4*T:48);
      const d=environmentDecoration(w,x,y,hang);if(!d)continue;counts[zone]++;
      check(d.coreZone===zone,'cor incorreta para região');check(d.floraTree||ENV_HARVEST[d.envKind]?.item!=null,'decoração não coletável');
      if(!hang&&['coreFungus','coreCrystal'].includes(d.envKind)){const light=environmentEmissionAt(w,x,y-1);check(light?.level===6&&light.color.join(',')===d.coreColor.join(','),'iluminação incorreta');}
      ctx.drawImage(d,x*T-4,hang?(y+1)*T-2:y*T-d.height+2);
      check(generateEnvironmentDecoration(w,x,y,hang)===d,'decoração instável');
    }
    ctx.restore();const cameraX=vx-bx,cameraY=-by;
    // A janela real do renderer é usada pelo desenho, com recorte de cada região.
    const saved=renderer.canvas;renderer.canvas=c;ctx.save();ctx.beginPath();ctx.rect(bx,by,640,400);ctx.clip();drawCoreEcologyAccents(ctx,g,cameraX,cameraY,1);ctx.restore();renderer.canvas=saved;
    ctx.font='14px Silkscreen';ctx.fillStyle='#eadac6';ctx.fillText(['FORJA','MAGNÉTICO','MAQUINÁRIO','OSSÁRIO'][zone],bx+20,by+28);
  }
  counts.forEach(n=>check(n>8,'pouca vegetação na região'));
  let point;for(let x=0;x<W&&!point;x++)if(environmentDecoration(w,x,22))point=x;
  w.decorCut.set(envDecorKey(w,point,22,false),{t:20});check(environmentDecoration(w,point,22)===null,'colheita não respeitada');w.decorCut.clear();w.touched.add(22*W+point);check(generateEnvironmentDecoration(w,point,22)===null,'enfeite em terreno modificado');
  ctx.setTransform(2,0,0,2,8,9);ctx.globalAlpha=.4;const saved=renderer.canvas;renderer.canvas=c;drawCoreEcologyAccents(ctx,g,0,0,1);renderer.canvas=saved;const m=ctx.getTransform();check(m.a===2&&m.e===8&&ctx.globalAlpha===.4,'estado de desenho vazou');
  const existing=game.world,realCounts=[0,0,0,0];
  for(let x=2;x<existing.w-2;x+=3)for(let y=existing.coreTop[x]+2;y<existing.h-17;y++){
    if(!CORE_ECO_NATURAL.has(existing.tiles[y*existing.w+x])||existing.tiles[(y-1)*existing.w+x]!==TILE.AIR)continue;
    const d=generateEnvironmentDecoration(existing,x,y);if(d?.coreZone!=null)realCounts[d.coreZone]++;
  }
  const present=new Set(existing.coreZone);present.forEach(zone=>check(realCounts[zone]>0,'região '+zone+' sem decoração: '+JSON.stringify(realCounts)));
  return {checks,counts,realCounts,image:c.toDataURL()};
 });if(errors.length)throw Error(errors.join('\n'));fs.writeFileSync(__dirname+'/core-ecology.png',Buffer.from(r.image.split(',')[1],'base64'));console.log(r.checks+' verificações; decorações por região: '+r.counts.join(', ')+'; mundo gerado: '+r.realCounts.join(', '));
}finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1);});
