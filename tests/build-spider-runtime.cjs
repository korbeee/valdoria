const fs=require('node:fs'),assert=require('node:assert/strict');
const {createCanvas,loadImage}=require('C:/Users/bagre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const names=['walk','idle','sleep','bite','cast','daze','hang','screech'],W=144,H=112;
async function main(){
 const frames=[],clips={},palette=[[0,0,0]],colors=new Map();
 for(const name of names){
  const root='assets/spider/spritefusion/'+(name==='daze'||name==='sleep'?'rest-loop':name),record=JSON.parse(fs.readFileSync(root+'/request.json','utf8'));
  const chosen=Number(process.env['SPIDER_'+name.toUpperCase()]||0),asset=record.outputs[chosen];
  const im=await loadImage(root+'/'+chosen+'-spritesheet.png'),n=asset.frameCount|| (name==='walk'?16:8),fw=asset.frameWidth||im.width/n,fh=asset.frameHeight||im.height;
  assert.equal(im.width,fw*n);assert.equal(im.height,fh);
  clips[name]={start:frames.length,count:n,fps:name==='walk'?16:10,asset:asset.id};
  for(let f=0;f<n;f++){
   const source=createCanvas(fw,fh),sc=source.getContext('2d');sc.drawImage(im,f*fw,0,fw,fh,0,0,fw,fh);
   const raw=sc.getImageData(0,0,fw,fh).data;let left=fw,right=-1,top=fh,bottom=-1;
   for(let y=0;y<fh;y++)for(let x=0;x<fw;x++)if(raw[(y*fw+x)*4+3]>127){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
   assert(left>0&&right<fw-1&&top>0&&bottom<fh-1,`${name}/${f}: source touches edge`);
   // Preserve native pixel size for all poses. Translate only; never fit individual frames.
   const dx=Math.round(W/2-fw/2),dy=H-1-bottom;
   assert(left+dx>0&&right+dx<W-1&&top+dy>=0,`${name}/${f}: destination clipped`);
   const cv=createCanvas(W,H),c=cv.getContext('2d');c.drawImage(source,dx,dy);const data=c.getImageData(0,0,W,H).data,idx=[],eyes=[];
   for(let p=0;p<data.length;p+=4){if(data[p+3]<128){idx.push(0);continue;}const col=Array.from(data.slice(p,p+3)),key=col.join(',');if(!colors.has(key)){colors.set(key,palette.length);palette.push(col);}idx.push(colors.get(key));const [r,g,b]=col;if(r>175&&g>85&&g<210&&b<105)eyes.push([p/4%W,Math.floor(p/4/W)]);}
   const runs=[];let last=idx[0],count=0;for(const v of idx){if(v===last)count++;else{runs.push(count,last);last=v;count=1;}}runs.push(count,last);
   frames.push({name,f,cv,runs,eyes,bounds:[left+dx,top+dy,right+dx,H-1]});
  }
 }
 const code=`'use strict';\n// Sprite Fusion originals packed synchronously by tests/build-spider-runtime.cjs.\nconst SPIDER_SHEET={W:${W},H:${H},count:${frames.length},clips:${JSON.stringify(clips)}};\nconst SPIDER_COLORS=${JSON.stringify(palette)};\nconst SPIDER_FRAMES=${JSON.stringify(frames.map(f=>f.runs))};\nconst SPIDER_EYES=${JSON.stringify(frames.map(f=>f.eyes))};\nfunction paintSpiderFusion(s,frame){\n const runs=SPIDER_FRAMES[frame];if(!runs)throw new RangeError('Unknown spider frame '+frame);let pixel=0;\n for(let i=0;i<runs.length;i+=2){const n=runs[i],color=runs[i+1];if(color)for(let k=0;k<n;k++){const p=pixel+k;s.set(p%SPIDER_SHEET.W,Math.floor(p/SPIDER_SHEET.W),SPIDER_COLORS[color]);}pixel+=n;}\n}\n`;
 fs.writeFileSync('js/spider-art.js',code);const root='assets/spider/integrated';fs.mkdirSync(root,{recursive:true});
 const atlas=createCanvas(W*8,H*Math.ceil(frames.length/8)),ac=atlas.getContext('2d');frames.forEach((f,i)=>ac.drawImage(f.cv,i%8*W,Math.floor(i/8)*H));fs.writeFileSync(root+'/atlas.png',atlas.toBuffer('image/png'));
 fs.writeFileSync(root+'/manifest.json',JSON.stringify({W,H,clips,frames:frames.map(({name,f,bounds})=>({name,f,bounds}))},null,2));
 const preview=createCanvas(W*4*2,H*2*2),pc=preview.getContext('2d');pc.imageSmoothingEnabled=false;pc.fillStyle='#26232d';pc.fillRect(0,0,preview.width,preview.height);
 names.forEach((name,i)=>{const x=i%4*W*2,y=Math.floor(i/4)*H*2;pc.fillStyle='#a38353';pc.fillRect(x,y+H*2-1,W*2,1);pc.drawImage(frames[clips[name].start+3].cv,x,y,W*2,H*2);pc.fillStyle='#fff';pc.font='16px sans-serif';pc.fillText(name,x+8,y+24);});fs.writeFileSync('tests/spider-fusion-review.png',preview.toBuffer('image/png'));
 console.log(`${frames.length} frames packed, all source/destination margins verified.`);
}
main().catch(e=>{console.error(e);process.exitCode=1;});
