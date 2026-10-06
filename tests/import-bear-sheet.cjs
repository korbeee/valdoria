const fs=require('fs');const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'playwright');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{const p=await b.newPage();const data=await p.evaluate(async url=>{
const img=new Image();img.src=url;await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);const d=ctx.getImageData(0,0,c.width,c.height).data,bg=Array.from(d.slice(0,3));
const cells=[];for(const [y,h]of [[9,57],[80,55],[143,57]])for(const [x,w]of (y===80?[[16,83],[100,83],[184,83],[269,86],[356,90],[447,82]]:[[16,83],[100,83],[184,83],[269,85],[356,78],[434,95]]))cells.push([x,y,w,h]);
for(const [x,w]of [[16,78],[94,69],[163,93],[256,70],[326,76],[404,80]])cells.push([x,209,w,84]);
for(const [x,w]of [[16,66],[86,59],[146,90],[237,98]])cells.push([x,300,w,69]);
const palette=[[0,0,0]],map=new Map(),frames=[];
for(const [x0,y0,w,h]of cells){let minX=w,minY=h,maxX=0,maxY=0;const raw=[];
for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=((y+y0)*c.width+x+x0)*4,rgb=Array.from(d.slice(i,i+3));let v=0;if(!rgb.every((v,j)=>v===bg[j])){const key=rgb.join(',');if(!map.has(key)){map.set(key,palette.length);palette.push(rgb);}v=map.get(key);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}raw.push(v);}
const rows=[];for(let y=minY;y<=maxY;y++)rows.push(raw.slice(y*w+minX,y*w+maxX+1));frames.push({w:maxX-minX+1,h:maxY-minY+1,rows,source:[x0+minX,y0+minY,maxX-minX+1,maxY-minY+1]});}
return {palette,frames,bg};},'data:image/png;base64,'+fs.readFileSync('assets/bear-reference.png').toString('base64'));
fs.writeFileSync('tests/bear-sheet-data.json',JSON.stringify(data));console.log(JSON.stringify({colors:data.palette.length,bg:data.bg,frames:data.frames.map(f=>f.source)}));}finally{await b.close();}})();
