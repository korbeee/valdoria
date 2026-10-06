// Importa os quadros de animação com escala estável e contornos em pixels inteiros.
const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs=require('node:fs');
const names=['walk','roar','slam','throw','breath','recover','appear','defeat'];
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage();await page.goto('http://localhost/jogo-teste/tests/yeti-preview.html');
 const approved=JSON.parse(fs.readFileSync('assets/yeti/approved-pixels.json','utf8'));
 const sources={walk:'walk-16-v4.png',roar:'roar-16-v2.png',appear:'appear-16-v2.png'};
 const result=await page.evaluate(async({names,palette,sources})=>{
  const all=[],info=[],atlas=document.createElement('canvas');atlas.width=160*16;atlas.height=152*8;const ac=atlas.getContext('2d');
  const walkAtlas=document.createElement('canvas');walkAtlas.width=640;walkAtlas.height=608;const wc=walkAtlas.getContext('2d');
  for(let pose=0;pose<names.length;pose++){
   const image=new Image();image.src='../assets/yeti/'+(sources[names[pose]]||names[pose]+'-16.png');await image.decode();
   const source=document.createElement('canvas');source.width=image.width;source.height=image.height;const ctx=source.getContext('2d');ctx.drawImage(image,0,0);
   const rgba=ctx.getImageData(0,0,image.width,image.height).data,cw=image.width/4,ch=image.height/4,cells=[];
   // As margens geradas variam: encontra os vãos reais entre as linhas da folha.
   const rows=[0];for(let row=1;row<4;row++){
    const expected=Math.round(row*ch);let best=expected,count=Infinity;
    for(let y=Math.max(rows[row-1]+1,Math.floor(expected-ch*.22));y<Math.min(image.height,expected+ch*.22);y++){
     let opaque=0;for(let x=0;x<image.width;x++)if(rgba[(y*image.width+x)*4+3]>=160)opaque++;
     if(opaque<count||(opaque===count&&Math.abs(y-expected)<Math.abs(best-expected))){count=opaque;best=y;}
    }rows.push(best);
   }rows.push(image.height);
   const columns=rows.slice(0,4).map((top,row)=>{
    const cuts=[0];for(let col=1;col<4;col++){
     const expected=Math.round(col*cw);let best=expected,count=Infinity;
     for(let x=Math.max(cuts[col-1]+1,Math.floor(expected-cw*.18));x<Math.min(image.width,expected+cw*.18);x++){
      let opaque=0;for(let y=top;y<rows[row+1];y++)if(rgba[(y*image.width+x)*4+3]>=160)opaque++;
      if(opaque<count||(opaque===count&&Math.abs(x-expected)<Math.abs(best-expected))){count=opaque;best=x;}
     }cuts.push(best);
    }return cuts.concat(image.width);
   });
   for(let f=0;f<16;f++){
    const row=Math.floor(f/4),left=columns[row][f%4],top=rows[row],w=columns[row][f%4+1]-left,h=rows[row+1]-top;
    const pixels=new Uint8ClampedArray(w*h*4);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
     const at=((top+y)*image.width+left+x)*4,to=(y*w+x)*4,r=rgba[at],g=rgba[at+1],b=rgba[at+2];if(rgba[at+3]<160)continue;
     let fringe=false;if((r>220&&g<90)||(b>220&&r<100)||(r>190&&g>190&&b<80)){
      for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const nx=left+x+dx,ny=top+y+dy;if(nx<0||ny<0||nx>=image.width||ny>=image.height||rgba[(ny*image.width+nx)*4+3]<160)fringe=true;}
     }if(!fringe)pixels.set(rgba.subarray(at,at+4),to);
    }
    const seen=new Uint8Array(w*h);let body=[];
    for(let start=0;start<seen.length;start++){
     if(seen[start]||!pixels[start*4+3])continue;const part=[start];seen[start]=1;
     for(let j=0;j<part.length;j++){const at=part[j],x=at%w,y=Math.floor(at/w);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const nx=x+dx,ny=y+dy,n=ny*w+nx;if(nx<0||ny<0||nx>=w||ny>=h||seen[n]||!pixels[n*4+3])continue;seen[n]=1;part.push(n);}}
     if(part.length>body.length)body=part;
    }
    const cell=document.createElement('canvas');cell.width=w;cell.height=h;const cc=cell.getContext('2d'),clean=cc.createImageData(w,h);let minX=w,maxX=0,minY=h,maxY=0;
    for(const n of body){const x=n%w,y=Math.floor(n/w);clean.data.set(pixels.subarray(n*4,n*4+4),n*4);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}cc.putImageData(clean,0,0);
    const eyes=body.filter(n=>{const x=n%w,y=Math.floor(n/w),at=n*4;return x>minX+(maxX-minX)*.55&&y<minY+(maxY-minY)*.4&&pixels[at]>170&&pixels[at+1]>110&&pixels[at+1]<230&&pixels[at+2]<100;});
    const eyeX=eyes.length?eyes.reduce((sum,n)=>sum+n%w,0)/eyes.length:null;
    cells.push({cell,minX,maxX,minY,maxY,eyeX,width:maxX-minX+1,height:maxY-minY+1});
   }
   // O repouso de entrada/saída define a escala da sequência inteira.
   const reference=cells[['recover','appear'].includes(names[pose])?15:0];
   const scale=Math.min(106/reference.height,146/Math.max(...cells.map(c=>c.height)),152/Math.max(...cells.map(c=>c.width)));
   const sequences=[];
   for(let f=0;f<16;f++){
    const cell=cells[f],canvas=document.createElement('canvas');canvas.width=160;canvas.height=152;const cc=canvas.getContext('2d');cc.imageSmoothingEnabled=false;
    const width=Math.round(cell.width*scale),height=Math.round(cell.height*scale);
    const x=names[pose]==='walk'&&cell.eyeX!==null?Math.round(120-(cell.eyeX-cell.minX)*scale):Math.round(80-width/2);
    cc.drawImage(cell.cell,cell.minX,cell.minY,cell.width,cell.height,x,151-height,width,height);
    const data=cc.getImageData(0,0,160,152),indices=[];
    for(let i=0;i<data.data.length;i+=4){const d=data.data;if(!d[i+3]){indices.push(0);continue;}let best=0,dist=Infinity;for(let k=0;k<palette.length;k++){const c=palette[k],v=(d[i]-c[0])**2+(d[i+1]-c[1])**2+(d[i+2]-c[2])**2;if(v<dist){dist=v;best=k;}}indices.push(best+1);d[i]=palette[best][0];d[i+1]=palette[best][1];d[i+2]=palette[best][2];d[i+3]=255;}
    cc.putImageData(data,0,0);ac.drawImage(canvas,f*160,pose*152);if(names[pose]==='walk')wc.drawImage(canvas,f%4*160,Math.floor(f/4)*152);
    const runs=[];for(let i=0;i<indices.length;){let j=i+1;while(j<indices.length&&indices[j]===indices[i])j++;runs.push(j-i,indices[i]);i=j;}sequences.push(runs);
   }
   all.push(sequences);info.push({name:names[pose],rows,scale,heights:cells.map(c=>c.height),unique:new Set(sequences.map(s=>JSON.stringify(s))).size});
  }
  // Reconstrói o passo com duas pernas pintadas separadas. O tronco e as mãos
  // ficam fora das máscaras; nenhum membro é duplicado durante a composição.
  const base=all[0][8],pixels=new Uint8Array(160*152);let cursor=0;
  for(let i=0;i<base.length;i+=2){pixels.fill(base[i+1],cursor,cursor+base[i]);cursor+=base[i];}
  const part=predicate=>{const c=document.createElement('canvas');c.width=160;c.height=152;const ctx=c.getContext('2d'),d=ctx.createImageData(160,152);for(let y=0;y<152;y++)for(let x=0;x<160;x++){const id=pixels[y*160+x];if(!id||!predicate(x,y))continue;d.data.set([...palette[id-1],255],(y*160+x)*4);}ctx.putImageData(d,0,0);return c;};
  const shin=part((x,y)=>x<86&&y>=123&&y<145),foot=part((x,y)=>x<86&&y>=143);
  const torso=part((x,y)=>!(y>=123&&x<106)&&!(y>=132));
  const shadow=source=>{const c=document.createElement('canvas');c.width=160;c.height=152;const ctx=c.getContext('2d');ctx.drawImage(source,0,0);const d=ctx.getImageData(0,0,160,152);for(let i=0;i<d.data.length;i+=4)if(d.data[i+3]){d.data[i]*=.65;d.data[i+1]*=.72;d.data[i+2]*=.85;}ctx.putImageData(d,0,0);return c;};
  const darkShin=shadow(shin),darkFoot=shadow(foot),walk=[],contacts=[];
  const trajectory=u=>u<.5?{x:96-u*72,lift:0}:{x:60+(u-.5)*72,lift:10*Math.sin((u-.5)*Math.PI*2)};
  for(let f=0;f<16;f++){
   const c=document.createElement('canvas');c.width=160;c.height=152;const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;
   const phase=f/16,near=trajectory(phase),far=trajectory((phase+.5)%1),bob=Math.round(Math.cos(phase*Math.PI*4));
   const leg=(s,shoe,p,hip)=>{
    ctx.drawImage(shoe,Math.round(p.x-54),-Math.round(p.lift));
    const top=123-bob,bottom=144-Math.round(p.lift);
    for(let y=top;y<=bottom;y++){
     const t=(y-top)/(bottom-top),sourceY=Math.round(123+t*21);
     const sourceX=68-14*t,targetX=hip+(p.x-hip)*t;
     ctx.drawImage(s,0,sourceY,160,1,Math.round(targetX-sourceX),y,160,1);
    }
   };
   leg(darkShin,darkFoot,far,77);leg(shin,foot,near,68);ctx.drawImage(torso,0,-bob);
   const d=ctx.getImageData(0,0,160,152),indices=[];for(let i=0;i<d.data.length;i+=4){if(d.data[i+3]<128){indices.push(0);d.data[i+3]=0;continue;}let best=0,dist=Infinity;for(let k=0;k<palette.length;k++){const rgb=palette[k],v=(d.data[i]-rgb[0])**2+(d.data[i+1]-rgb[1])**2+(d.data[i+2]-rgb[2])**2;if(v<dist){dist=v;best=k;}}indices.push(best+1);d.data.set([...palette[best],255],i);}ctx.putImageData(d,0,0);
   const runs=[];for(let i=0;i<indices.length;){let j=i+1;while(j<indices.length&&indices[j]===indices[i])j++;runs.push(j-i,indices[i]);i=j;}walk.push(runs);wc.clearRect(f%4*160,Math.floor(f/4)*152,160,152);wc.drawImage(c,f%4*160,Math.floor(f/4)*152);ac.clearRect(f*160,0,160,152);ac.drawImage(c,f*160,0);contacts.push({near,far});
  }
  all[0]=walk;info[0].contacts=contacts;
  // A entrada cresce em altura sem voltar ao agachamento entre linhas da folha.
  all[6]=all[6].map((frame,i)=>({frame,height:info[6].heights[i]})).sort((a,b)=>a.height-b.height).map(x=>x.frame);
  return {all,info,png:atlas.toDataURL().split(',')[1],walkPng:walkAtlas.toDataURL().split(',')[1]};
 },{names,palette:approved.palette,sources});
 // Conserva exatamente as seis animações aprovadas, incluindo a preparação do esmagamento.
 const baseline=JSON.parse(fs.readFileSync('assets/yeti/approved-other-motion.json','utf8'));
 const frames=baseline.frames.slice(0,144),sequences=baseline.sequences.map(s=>s.slice());
 for(const id of [35,36,37,38]){const replacement=frames.length;frames.push(baseline.frames[id]);sequences[3]=sequences[3].map(i=>i===id?replacement:i);}
 for(const pose of [1,2,7])sequences[pose]=result.all[pose-1].map((r,i)=>{const index=pose*16+i;frames[index]=r;return index;});
 fs.writeFileSync('assets/yeti/motion-atlas.png',Buffer.from(result.png,'base64'));
 fs.writeFileSync('assets/yeti/walk-game-v4.png',Buffer.from(result.walkPng,'base64'));
 fs.writeFileSync('js/yeti-art.js',`'use strict';\n// Quadros próprios de movimento; sprites normais e de dano são armazenados em cache.\nconst YETI_ANIM_FRAMES=16;\nconst YETI_FUR=${JSON.stringify(approved.palette.slice(0,12))};\nconst YETI_PIXEL_PALETTE=${JSON.stringify(approved.palette)};\nconst YETI_PIXEL_FRAMES=${JSON.stringify(frames)};\nconst YETI_SEQUENCES=${JSON.stringify(sequences)};\nfunction paintYeti(s,pal,frame){\n const pose=Math.min(8,Math.floor(frame/YETI_ANIM_FRAMES)),index=YETI_SEQUENCES[pose][frame%YETI_ANIM_FRAMES],runs=YETI_PIXEL_FRAMES[index];\n let pixel=0;for(let r=0;r<runs.length;r+=2){const count=runs[r],color=runs[r+1];for(let n=0;n<count;n++,pixel++){if(!color)continue;const c=YETI_PIXEL_PALETTE[color-1];s.set(pixel%160,Math.floor(pixel/160),c);}}\n}\n`);
 console.log(JSON.stringify({sequences:result.info,bytes:fs.statSync('js/yeti-art.js').size}));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
