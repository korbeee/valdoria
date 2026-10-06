// Importa pixel-atlas.png para a grade/paleta do jogo. A folha fonte olha
// para a esquerda; espelhamos para a convenção de facing usada pelo renderizador.
const fs=require('node:fs'),zlib=require('node:zlib'),assert=require('node:assert/strict');
const walk=process.argv.includes('--walk');
const source=walk?'assets/tiger/walk-inbetweens.png':'assets/tiger/pixel-atlas.png';
const original=walk?require('node:vm').runInNewContext(fs.readFileSync('js/tiger-sprites.js','utf8')+';TIGER_SHEET_FRAMES').slice(0,32):[];
const png=fs.readFileSync(source);
const w=png.readUInt32BE(16),h=png.readUInt32BE(20);
assert.equal(png[24],8);assert.equal(png[25],6);assert.equal(png[28],0);
const blocks=[];for(let at=8;at<png.length;){const n=png.readUInt32BE(at),tag=png.toString('ascii',at+4,at+8);if(tag==='IDAT')blocks.push(png.subarray(at+8,at+8+n));at+=n+12;}
const scan=zlib.inflateSync(Buffer.concat(blocks)),pixels=Buffer.alloc(w*h*4),stride=w*4;
const paeth=(a,b,c)=>{const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c;};
for(let y=0;y<h;y++){const filter=scan[y*(stride+1)];for(let x=0;x<stride;x++){const at=y*stride+x,a=x>=4?pixels[at-4]:0,b=y?pixels[at-stride]:0,c=y&&x>=4?pixels[at-stride-4]:0;pixels[at]=(scan[y*(stride+1)+1+x]+[0,a,b,Math.floor((a+b)/2),paeth(a,b,c)][filter])&255;}}
const seen=new Uint8Array(w*h),labels=new Int32Array(w*h),queue=new Int32Array(w*h),shapes=[];
for(let n=0;n<w*h;n++){
 if(seen[n]||pixels[n*4+3]<96)continue;
 let left=n%w,right=left,top=Math.floor(n/w),bottom=top,head=0,tail=1;queue[0]=n;seen[n]=1;labels[n]=n+1;
 while(head<tail){const at=queue[head++],x=at%w,y=Math.floor(at/w);left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=w||yy>=h)continue;const j=yy*w+xx;if(seen[j]||pixels[j*4+3]<96)continue;seen[j]=1;labels[j]=n+1;queue[tail++]=j;}
 }
 if(tail>1000)shapes.push({left,top,right,bottom,area:tail,id:n+1});
}
assert.equal(shapes.length,walk?16:32,'Sprites separados com alpha');
shapes.sort((a,b)=>(a.top+a.bottom)-(b.top+b.bottom));
const ordered=[];for(let row=0;row<(walk?4:8);row++)ordered.push(...shapes.slice(row*4,row*4+4).sort((a,b)=>a.left-b.left));
const palette=[[0,0,0],[27,19,23],[47,25,27],[70,35,28],[95,48,32],[121,60,30],[149,75,31],[174,91,35],[195,112,46],[214,139,66],[231,165,94],[240,187,123],[101,77,65],[137,109,88],[169,143,115],[196,175,144],[219,204,176],[237,228,204],[248,242,222],[135,52,52],[190,86,76],[232,165,59],[75,63,57]];
const W=104,H=64,scale=walk?33/ordered.map(s=>s.bottom-s.top+1).sort((a,b)=>a-b)[8]:Math.min(98/Math.max(...ordered.map(s=>s.right-s.left+1)),58/Math.max(...ordered.map(s=>s.bottom-s.top+1)));
const frames=ordered.map((b,f)=>{
 const sw=b.right-b.left+1,sh=b.bottom-b.top+1,dw=Math.round(sw*scale),dh=Math.round(sh*scale),ox=Math.floor((W-dw)/2),oy=H-dh;
 const rows=Array.from({length:H},()=>Array(W).fill('0'));
 for(let y=0;y<dh;y++)for(let x=0;x<dw;x++){
  const sx=b.left+Math.min(sw-1,Math.floor((x+.5)/scale)),sy=b.top+Math.min(sh-1,Math.floor((y+.5)/scale)),at=(sy*w+sx)*4;
  if(pixels[at+3]<96||labels[sy*w+sx]!==b.id)continue;
  let best=1,dist=Infinity;for(let i=1;i<palette.length;i++){const dr=pixels[at]-palette[i][0],dg=pixels[at+1]-palette[i][1],db=pixels[at+2]-palette[i][2],d=dr*dr*2+dg*dg*3+db*db;if(d<dist){dist=d;best=i;}}
  rows[oy+y][ox+x]=best.toString(36);
 }
 console.log(`Quadro ${f}: ${dw}×${dh}`);return rows.map(r=>r.reverse().join(''));
});
fs.writeFileSync('js/tiger-sprites.js',"'use strict';\n// Arte importada de assets/tiger/pixel-atlas.png e walk-inbetweens.png.\nconst TIGER_SHEET_PALETTE="+JSON.stringify(palette)+';\nconst TIGER_SHEET_FRAMES='+JSON.stringify([...original,...frames])+';\n');
