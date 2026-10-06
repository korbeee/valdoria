const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try {
    const page=await browser.newPage();const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(()=>window.requestAnimationFrame=()=>1);
    await page.goto('http://localhost/jogo-teste/');await page.waitForFunction(()=>typeof game==='object');
    const result=await page.evaluate(()=>{
      const c=makeCanvas(1120,630),ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;
      ctx.fillStyle='#202a30';ctx.fillRect(0,0,c.width,c.height);ctx.font='16px monospace';ctx.fillStyle='#e8d9b6';
      ctx.fillText('TIGRE — pelagem, listras e rosto',24,28);
      [0,TIGER_FRAME.idle,TIGER_FRAME.roar,TIGER_FRAME.swipe+1].forEach((f,i)=>{const img=wildlifeSprite('tiger',f).normal;ctx.drawImage(img,24+i*275,55,img.width*2,img.height*2);});
      ctx.fillText('BRAMIDO — ciclo de atordoamento',24,250);
      const phases=[];const grounds=[];
      for(let f=28;f<32;f++) {
        const img=wildlifeSprite('bear',f).normal;ctx.drawImage(img,16+(f-28)*275,270,img.width*1.25,img.height*1.25);
        const d=img.getContext('2d').getImageData(0,0,img.width,img.height).data;
        let last=-1;for(let i=3;i<d.length;i+=4)if(d[i])last=Math.floor((i/4)/img.width);grounds.push(last);phases.push(img.toDataURL());
        if(bearFrame({state:'stun',stateT:(f-28)/5,clock:999})!==f)throw Error('Fase incorreta');
      }
      if(new Set(phases).size!==4||new Set(grounds).size!==1)throw Error('Ciclo repetido ou patas flutuantes');
      let count=0;
      for(const [kind,frames] of [['tiger',TIGER_FRAME.count],['bear',32]])for(let f=0;f<frames;f++){
        const a=wildlifeSprite(kind,f);if(a.normal.width!==a.hurt.width||a.normal.height!==a.hurt.height)throw Error('Flash desalinhado');
        const d=a.normal.getContext('2d').getImageData(0,0,a.normal.width,a.normal.height).data;
        if(!d.some((v,i)=>i%4===3&&v))throw Error('Quadro vazio');count++;
      }
      // Confere a paleta original em todos os quadros preexistentes do urso.
      for(let f=0;f<28;f++) {
        const img=wildlifeSprite('bear',f).normal,art=BEAR_SHEET_FRAMES[f];
        const data=img.getContext('2d').getImageData(0,0,img.width,img.height).data;
        for(let y=0;y<art.h;y++)for(let x=0;x<art.w;x++){
          const n=parseInt(art.rows[y][x],16);if(!n)continue;
          const at=((art.y+y)*2*img.width+(art.x+x)*2)*4;
          if(BEAR_SHEET_PALETTE[n].some((v,i)=>v!==data[at+i]))throw Error('Arte original modificada');
        }
      }
      ctx.fillStyle='#e8d9b6';ctx.fillText('Escala próxima ao jogo',24,510);
      ctx.drawImage(wildlifeSprite('tiger',TIGER_FRAME.idle).normal,24,516);
      ctx.drawImage(wildlifeSprite('bear',28).normal,185,516,208*.6,160*.6);
      return {count,url:c.toDataURL(),phases};
    });
    assert.deepEqual(errors,[]);
    fs.writeFileSync('tests/predator-art.png',Buffer.from(result.url.split(',')[1],'base64'));
    fs.writeFileSync('tests/bear-stun-animation.html',`<!doctype html><meta charset="utf-8"><title>Urso atordoado</title><style>body{background:#202a30;color:#e8d9b6;font:16px monospace;padding:32px}img{width:416px;height:320px;image-rendering:pixelated}</style><p>Atordoamento — 4 quadros, patas apoiadas</p><img id="bear"><script>const frames=${JSON.stringify(result.phases)};let i=0;const draw=()=>document.getElementById('bear').src=frames[i++%4];draw();setInterval(draw,200);</script>`);
    console.log(`${result.count} quadros renderizados; ciclo, apoio das patas e arte original verificados.`);
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
