// Recorta a folha original preservando o canal alpha, normaliza a escala e exporta os sprites.
// Não pinta nem altera a arte original gerada.
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs=require('node:fs');
const path=require('node:path');
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try {
    const page=await browser.newPage();
    await page.addInitScript(()=>{window.requestAnimationFrame=()=>1;});
    await page.goto('http://localhost/jogo-teste/');
    const sprites=await page.evaluate(async()=>{
      const names=['default','aim','pointer','grab','picareta','machado','pa','martelo','attack','build','net','use','blocked','text'];
      const img=new Image();img.src='assets/cursors/valdoria-pixel-atlas.png';await img.decode();
      const sourceW=img.width/4,sourceH=img.height/4;
      const cellW=Math.ceil(sourceW),cellH=Math.ceil(sourceH);
      const files={};
      names.forEach((name,i)=>{
        const cell=document.createElement('canvas');cell.width=cellW;cell.height=cellH;
        const ctx=cell.getContext('2d');ctx.drawImage(img,(i%4)*sourceW,Math.floor(i/4)*sourceH,sourceW,sourceH,0,0,cellW,cellH);
        const rgba=ctx.getImageData(0,0,cellW,cellH).data;
        let x0=cellW,y0=cellH,x1=0,y1=0;
        for(let y=0;y<cellH;y++)for(let x=0;x<cellW;x++)if(rgba[(y*cellW+x)*4+3]>8){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
        if(x0>=x1 || y0>=y1)throw Error(`Célula vazia: ${name}`);
        if(x0===0&&y0===0&&x1===cellW-1&&y1===cellH-1)throw Error(`Sem transparência: ${name}`);
        x0=Math.max(0,x0-3);y0=Math.max(0,y0-3);x1=Math.min(cellW-1,x1+3);y1=Math.min(cellH-1,y1+3);
        const out=document.createElement('canvas');out.width=out.height=32;
        const c=out.getContext('2d');c.imageSmoothingEnabled=false;
        const w=x1-x0+1,h=y1-y0+1,scale=28/Math.max(w,h);
        const dw=Math.round(w*scale),dh=Math.round(h*scale);
        c.drawImage(cell,x0,y0,w,h,Math.floor((32-dw)/2),Math.floor((32-dh)/2),dw,dh);
        files[name]=out.toDataURL().split(',')[1];
      });
      return files;
    });
    const dir=path.join(__dirname,'../assets/cursors/pixel');fs.mkdirSync(dir,{recursive:true});
    for(const [name,data] of Object.entries(sprites))fs.writeFileSync(path.join(dir,name+'.png'),Buffer.from(data,'base64'));
    console.log('14 sprites em pixel art exportados.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
