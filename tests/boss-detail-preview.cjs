const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),zlib=require('node:zlib');
const read=p=>fs.readFileSync(p,'utf8');
const fn=(s,n)=>s.match(new RegExp('function '+n+'\\([^]*?\\n\\}'))[0];
const a=read('js/spider-boss.js'),b=read('js/beetle-boss.js'),bear=read('js/bear.js');
const art=s=>s.match(/const (?:SPIDER|BEETLE)_ART = \{[^]*?\n\};/)[0];
const palette=s=>JSON.parse(s.match(/WILD_PALETTES\.\w+ = (\[.*\]);/)[1]);
const parts=[read('js/tiger-art.js'),read('js/spider-art.js'),art(a),art(b),fn(a,'paintFiandeira'),fn(b,'paintCascoFerro'),bear.match(/const BEAR_SHEET_PALETTE=.*;/)[0],bear.match(/const BEAR_SHEET_FRAMES=.*;/)[0],fn(bear,'paintBear'),fn(bear,'paintBearStunned')];
const api=vm.runInNewContext(parts.join('\n')+';({paintTiger,paintBear,paintFiandeira,paintCascoFerro,TIGER_FRAME,SPIDER_SHEET});',{clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),hash2:(x,y)=>{const n=Math.sin(x*127.1+y*311.7)*43758.5453;return n-Math.floor(n);}});
const {createCanvas,ImageData}=require('C:/Users/bagre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const png=(w,h,data)=>{const c=createCanvas(w,h);c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(data),w,h),0,0);return c.toBuffer('image/png');};
const groups=[['Bramido',api.paintBear,[],208,160,32,[0,6,18,28],1],['Dente de Âmbar',api.paintTiger,[],192,80,api.TIGER_FRAME.count,[16,0,25,45],2],['Fiandeira',api.paintFiandeira,palette(a),api.SPIDER_SHEET.W,api.SPIDER_SHEET.H,api.SPIDER_SHEET.count,[0,24,40,64],1],['Casco de Ferro',api.paintCascoFerro,palette(b),112,60,32,[6,20,8,17],2]];
const sw=1600,sh=720,sheet=Buffer.alloc(sw*sh*4);for(let i=0;i<sheet.length;i+=4)sheet.set([30,32,39,255],i);
const urls=[];let count=0;
groups.forEach(([name,paint,pal,w,h,n,picks,scale],row)=>{
 const frames=[];
 for(let f=0;f<n;f++){
  const data=Buffer.alloc(w*h*4);
  paint({set(x,y,c){assert(Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&y>=0&&x<w&&y<h,`${name} ${f}: ${x},${y}`);assert(c.every(v=>Number.isFinite(v)&&v>=0&&v<=255));data.set([...c,255],(y*w+x)*4);}},pal,f);
  assert(data.some(Boolean));frames.push({data,url:'data:image/png;base64,'+png(w,h,data).toString('base64')});count++;
 }
 urls.push(frames.map(f=>f.url));
 picks.forEach((f,col)=>{const data=frames[f].data,ox=col*400+8,oy=row*180+180-h*scale;for(let y=0;y<h;y++)for(let x=0;x<w;x++){const at=(y*w+x)*4;if(!data[at+3])continue;for(let yy=0;yy<scale;yy++)for(let xx=0;xx<scale;xx++)data.copy(sheet,((oy+y*scale+yy)*sw+ox+x*scale+xx)*4,at,at+4);}});
});
const name=process.argv[2]||'boss-detail-after';fs.writeFileSync('tests/'+name+'.png',png(sw,sh,sheet));
fs.writeFileSync('tests/boss-detail-animation.html',`<!doctype html><meta charset="utf-8"><title>Acabamento dos bosses</title><style>body{background:#1e2027;color:#f4e5cb;font:16px system-ui;padding:24px}main{display:flex;flex-wrap:wrap;gap:28px}img{image-rendering:pixelated;width:440px}section{width:460px}button{padding:10px;margin:12px 4px}</style><h1>Acabamento em pixel art</h1><p>Mesmas poses e dimensões de jogo. Troque a sequência para conferir o movimento.</p><button onclick="mode=0">Caminhada</button><button onclick="mode=1">Ataque / poder</button><main>${groups.map(([n],i)=>'<section><h2>'+n+'</h2><img id="b'+i+'"></section>').join('')}</main><script>const frames=${JSON.stringify(urls)},seq=[[[6,7,8,9,10,11],[18,19,20,21,22,23]],[Array.from({length:16},(_,i)=>i),[22,22,20,21,26,27,16]],[Array.from({length:16},(_,i)=>i),[40,41,42,43,44,45,46,47]],[Array.from({length:12},(_,i)=>20+i),[16,17,18,19]]];let t=0,mode=0;function draw(){seq.forEach((s,i)=>{const a=s[mode];document.getElementById('b'+i).src=frames[i][a[t%a.length]]});t++}draw();setInterval(draw,90)</script>`);
console.log(count+' quadros: dimensões, transparência e cores verificadas.');
