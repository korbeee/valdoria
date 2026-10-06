// Importa a folha de arte para o buffer de pixels usado pelo jogo, sem carregamento assíncrono.
const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs=require('node:fs');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage();await page.goto('http://localhost/jogo-teste/tests/yeti-preview.html');
 const result=await page.evaluate(async(sourceFile)=>{
  const img=new Image();img.src='../assets/yeti/'+sourceFile;await img.decode();
  const source=document.createElement('canvas');source.width=img.width;source.height=img.height;const sc=source.getContext('2d');sc.drawImage(img,0,0);
  const src=sc.getImageData(0,0,img.width,img.height).data,cw=img.width/4,ch=img.height/4;
  // Remove as franjas cromáticas do recorte; olhos e gelo mantêm suas cores interiores.
  const alpha=Uint8Array.from({length:img.width*img.height},(_,p)=>src[p*4+3]);
  for(let i=0;i<src.length;i+=4){
   const r=src[i],g=src[i+1],b=src[i+2],p=i/4,x=p%img.width,y=Math.floor(p/img.width);
   if(src[i+3]<160){src[i+3]=0;continue;}
   if((r>220&&g<90)||(b>220&&r<100)||(r>190&&g>190&&b<80)){
    let edge=false;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)if(x+dx<0||y+dy<0||x+dx>=img.width||y+dy>=img.height||alpha[(y+dy)*img.width+x+dx]<160)edge=true;
    if(edge)src[i+3]=0;
   }
  }
  sc.putImageData(new ImageData(src,img.width,img.height),0,0);
  const palette=[[25,30,39],[40,47,59],[55,65,81],[73,88,106],[93,111,128],[119,135,147],[146,156,162],[173,178,174],[198,196,182],[218,210,189],[236,225,202],[251,241,221],[72,41,38],[121,52,45],[192,93,62],[241,169,48],[255,217,105],[50,102,143],[87,148,185],[140,196,224],[192,229,247],[235,251,255]];
  const frames=[],bounds=[],atlas=document.createElement('canvas');atlas.width=640;atlas.height=608;const ac=atlas.getContext('2d');
  for(let f=0;f<16;f++){
   const left=Math.floor(f%4*cw),right=Math.floor((f%4+1)*cw),top=Math.floor(Math.floor(f/4)*ch)-(f===13?Math.round(ch*.077):0),bottom=Math.floor((Math.floor(f/4)+1)*ch);
   // Alguns membros atravessam a borda da célula vizinha na folha de origem.
   // Conserva o corpo conectado, descartando esses pedaços antes de alinhar os pés.
   const cellW=right-left,cellH=bottom-top,seen=new Uint8Array(cellW*cellH);let body=[];
   for(let start=0;start<seen.length;start++){
    if(seen[start]||!src[((top+Math.floor(start/cellW))*img.width+left+start%cellW)*4+3])continue;
    const part=[start];seen[start]=1;for(let j=0;j<part.length;j++){const at=part[j],x=at%cellW,y=Math.floor(at/cellW);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const nx=x+dx,ny=y+dy,n=ny*cellW+nx;if(nx<0||ny<0||nx>=cellW||ny>=cellH||seen[n]||!src[((top+ny)*img.width+left+nx)*4+3])continue;seen[n]=1;part.push(n);}}
    if(part.length>body.length)body=part;
   }
   const cell=document.createElement('canvas');cell.width=cellW;cell.height=cellH;const cc=cell.getContext('2d'),cd=cc.createImageData(cellW,cellH);
   let minX=cellW,minY=cellH,maxX=0,maxY=0;
   for(const n of body){const x=n%cellW,y=Math.floor(n/cellW),from=((top+y)*img.width+left+x)*4;cd.data.set(src.slice(from,from+4),n*4);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}cc.putImageData(cd,0,0);
   bounds.push([maxX-minX+1,maxY-minY+1]);
   const canvas=document.createElement('canvas');canvas.width=160;canvas.height=152;const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
   // Mesmo tamanho no mundo, quatro vezes mais pixels para olhos, nariz e dentes.
   const scale=128.535/cw,w=(maxX-minX+1)*scale,h=(maxY-minY+1)*scale;
   ctx.drawImage(cell,minX,minY,maxX-minX+1,maxY-minY+1,Math.round(80-w/2),Math.round(151-h),Math.round(w),Math.round(h));
   const data=ctx.getImageData(0,0,160,152),indices=[];
   for(let i=0;i<data.data.length;i+=4){const d=data.data;if(!d[i+3]){indices.push(0);continue;}let best=0,dist=Infinity;for(let k=0;k<palette.length;k++){const c=palette[k],v=(d[i]-c[0])**2+(d[i+1]-c[1])**2+(d[i+2]-c[2])**2;if(v<dist){dist=v;best=k;}}indices.push(best+1);d[i]=palette[best][0];d[i+1]=palette[best][1];d[i+2]=palette[best][2];d[i+3]=255;}
   ctx.putImageData(data,0,0);ac.drawImage(canvas,f%4*160,Math.floor(f/4)*152);
   const runs=[];for(let i=0;i<indices.length;){let j=i+1;while(j<indices.length&&indices[j]===indices[i])j++;runs.push(j-i,indices[i]);i=j;}frames.push(runs);
  }
  return {palette,frames,bounds,size:[img.width,img.height],png:atlas.toDataURL().split(',')[1]};
 },process.argv[2]||'atlas-face-v2.png');
 const sequences=[[8,8,9,9,9,8,8,8],[0,1,2,3,4,5,6,7],[8,8,10,10,10,10,10,8],[8,11,11,11,11,12,12,8],[8,13,13,13,13,14,14,8],[8,14,14,14,14,14,14,8],[12,12,12,8,8,9,9,8],[15,15,12,12,8,8,10,8],[8,8,15,15,15,15,15,15]];
 fs.writeFileSync('assets/yeti/game-atlas-v2.png',Buffer.from(result.png,'base64'));
 fs.writeFileSync('js/yeti-art.js',`'use strict';\n// Arte em pixels importada da folha em assets/yeti; RLE decodificado uma vez por quadro.\nconst YETI_FUR=${JSON.stringify(result.palette.slice(0,12))};\nconst YETI_PIXEL_PALETTE=${JSON.stringify(result.palette)};\nconst YETI_PIXEL_FRAMES=${JSON.stringify(result.frames)};\nconst YETI_SEQUENCES=${JSON.stringify(sequences)};\nfunction paintYeti(s,pal,frame){\n const pose=Math.min(8,Math.floor(frame/8)),index=YETI_SEQUENCES[pose][frame%8],runs=YETI_PIXEL_FRAMES[index];\n let pixel=0;for(let r=0;r<runs.length;r+=2){const count=runs[r],color=runs[r+1];for(let n=0;n<count;n++,pixel++){if(!color)continue;const x=pixel%160,y=Math.floor(pixel/160),c=YETI_PIXEL_PALETTE[color-1];s.set(x,y,c);}}\n}\n`);
 console.log(JSON.stringify({size:result.size,bounds:result.bounds,bytes:fs.statSync('js/yeti-art.js').size}));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
