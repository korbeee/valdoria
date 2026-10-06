const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),zlib=require('node:zlib');
const read=p=>fs.readFileSync(p,'utf8');
const fn=(src,name)=>{const m=src.match(new RegExp('function '+name+'\\([^]*?\\n\\}'));assert(m,name);return m[0];};
const spider=read('js/spider-boss.js'),beetle=read('js/beetle-boss.js');
const pal=s=>JSON.parse(s.match(/WILD_PALETTES\.\w+ = (\[.*\]);/)[1]);
const art=s=>s.match(/const (?:SPIDER|BEETLE)_ART = \{[^]*?\n\};/)[0];
const artApi=vm.runInNewContext(read('js/tiger-art.js')+'\n'+read('js/spider-art.js')+'\n'+art(spider)+'\n'+art(beetle)+'\n'+
 ['paintFiandeira','fiandeiraFrame'].map(n=>fn(spider,n)).join('\n')+'\n'+['paintCascoFerro','cascoFerroFrame'].map(n=>fn(beetle,n)).join('\n')+
 ';({paintFiandeira,paintCascoFerro,fiandeiraFrame,cascoFerroFrame,SPIDER_SHEET})');
const {createCanvas,ImageData}=require('C:/Users/bagre/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/@napi-rs/canvas');
const encode=(w,h,data)=>{const c=createCanvas(w,h);c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(data),w,h),0,0);return c.toBuffer('image/png');};
const sprites=[];
for(const [paint,colors,w,h,count] of [[artApi.paintFiandeira,pal(spider),artApi.SPIDER_SHEET.W,artApi.SPIDER_SHEET.H,artApi.SPIDER_SHEET.count],[artApi.paintCascoFerro,pal(beetle),112,60,32]]){
 const batch=[];
 for(let f=0;f<count;f++){
  const render=()=>{const data=Buffer.alloc(w*h*4);paint({set(x,y,c){assert(Number.isInteger(x)&&Number.isInteger(y)&&x>=0&&x<w&&y>=0&&y<h);assert(c.length===3&&c.every(v=>Number.isFinite(v)&&v>=0&&v<=255));const at=(y*w+x)*4;data.set(c,at);data[at+3]=255;}},colors,f);return data;};
  const data=render();assert(data.some(Boolean));assert.deepEqual(data,render(),'Arte determinística');
  batch.push({w,h,data,url:'data:image/png;base64,'+encode(w,h,data).toString('base64')});
 }
 sprites.push(batch);
}
assert.equal(new Set(sprites[0].slice(0,16).map(f=>f.url)).size,16);
assert.equal(new Set(sprites[1].slice(20).map(f=>f.url)).size,12);
for(let i=0;i<4;i++){
 assert.equal(artApi.fiandeiraFrame({state:'channel',stateT:(i+.01)/10}),artApi.SPIDER_SHEET.clips.cast.start+i);
 assert.equal(artApi.cascoFerroFrame({state:'channel',stateT:(i+.01)/8}),16+i);
}
let hits=0;
const context={T:16,TILE_DEFS:{},easeOutCubic:t=>1-(1-t)**3,clamp:(n,a,b)=>Math.max(a,Math.min(b,n)), hash2:(x,y)=>Math.abs(Math.sin(x*127.1+y*311.7)),
 damageMonsterPlayer(g){hits++;g.player.invulnerable=.5;},spiderFx(){},beetleDust(){},beetleFx(){},playSfx(){},beetleFloorAt:m=>m.lair.y};
const powers=vm.runInNewContext(read('js/guardian-powers.js')+'\n'+read('js/boss-fx.js')+';({guardianClear,guardianHazard,guardianUpdateHazards,guardianBeginPower,guardianUpdatePower,drawGuardianPowers})',context);
const w={isSolid:(x,y)=>y>=10,getTile:()=>0};
const p={x:140,y:120,w:16,h:40,cx:148,cy:140,invulnerable:0};
const g={player:p,mobs:[],particles:[]};
const m={kind:'fiandeira',cx:180,cy:40,state:'stalk',mode:'ceiling',sleeping:false,nest:{bounds:[0,0,30,10],floorY:160}};g.mobs=[m];
powers.guardianBeginPower(g,m,w,p);assert.equal(g.guardianHazards.length,3);assert.equal(m.state,'channel');
powers.guardianUpdateHazards(g,m,.8,w,p);assert.equal(hits,0,'Aviso não causa dano');
powers.guardianUpdateHazards(g,m,.3,w,p);assert.equal(hits,1,'Veneno ativo causa dano');
const fixed=g.guardianHazards[1].x;p.x=350;p.cx=358;p.invulnerable=0;
powers.guardianUpdateHazards(g,m,.1,w,p);assert.equal(hits,1,'Sair da marca evita dano');assert.equal(g.guardianHazards[1].x,fixed);
powers.guardianUpdateHazards(g,m,5,w,p);assert.equal(g.guardianHazards.length,0,'Perigos expiram');
powers.guardianBeginPower(g,m,w,p);assert(g.guardianHazards.every(h=>h.type==='silk'));
m.stateT=1.8;powers.guardianUpdatePower(g,m,.01,w,p);assert.equal(m.state,'stalk','Retorna ao teto');
const b={kind:'cascoferro',cx:180,cy:140,state:'walk',onGround:true,lair:{y:160,bounds:[0,0,30,10]}};g.mobs.push(b);
powers.guardianBeginPower(g,b,w,p);assert.equal(g.guardianHazards.filter(h=>h.type==='pillar').length,5);
powers.guardianClear(g,'fiandeira');assert(g.guardianHazards.every(h=>h.owner==='cascoferro'));
powers.guardianClear(g,'cascoferro');b.powerTurn=1;powers.guardianBeginPower(g,b,w,p);
assert.equal(g.guardianHazards.length,2);const x=g.guardianHazards[0].x;
powers.guardianUpdateHazards(g,b,1.2,w,p);assert(g.guardianHazards[0].x<x,'Redemoinho se desloca');
g.respawnPending=true;powers.guardianUpdateHazards(g,b,.01,w,p);assert.equal(g.guardianHazards.length,0,'Morte limpa perigos');g.respawnPending=false;
for(let i=0;i<80;i++)powers.guardianHazard(g,b,'pillar',160,160);assert.equal(g.guardianHazards.length,24,'Limite de perigos');
powers.guardianClear(g,b.kind);assert.equal(g.guardianHazards.length,0);assert.equal(b.powerCd,7);

const SW=960,SH=540,sheet=Buffer.alloc(SW*SH*4);for(let i=0;i<sheet.length;i+=4)sheet.set([27,30,39,255],i);
function blit(frame,x,y,scale=2){for(let py=0;py<frame.h;py++)for(let px=0;px<frame.w;px++){const at=(py*frame.w+px)*4;if(!frame.data[at+3])continue;for(let dy=0;dy<scale;dy++)for(let dx=0;dx<scale;dx++){const to=((y+py*scale+dy)*SW+x+px*scale+dx)*4;frame.data.copy(sheet,to,at,at+4);}}}
[0,6,40,44].forEach((f,i)=>blit(sprites[0][f],i*240+15,10,1));
[20,24,16,19].forEach((f,i)=>blit(sprites[1][f],i*240+8,135));
const effectCanvas=createCanvas(SW,SH),ctx=effectCanvas.getContext('2d');ctx.putImageData(new ImageData(new Uint8ClampedArray(sheet),SW,SH),0,0);
g.guardianHazards=['venom','silk','pillar','vortex'].flatMap((type,i)=>[{type,x:100+i*240,y:340,age:.5,warn:1,life:3,radius:23,height:type==='venom'?9:60},{type,x:100+i*240,y:470,age:1.4,warn:1,life:3,radius:23,height:type==='venom'?9:60}]);
powers.drawGuardianPowers(ctx,g);assert.equal(ctx.globalAlpha,1);sheet.set(ctx.getImageData(0,0,SW,SH).data);
fs.writeFileSync('tests/guardian-upgrade.png',encode(SW,SH,sheet));
const urls=sprites.map(batch=>batch.map(f=>f.url));
fs.writeFileSync('tests/guardian-animation.html',`<!doctype html><meta charset="utf-8"><title>Guardiões — revisão visual</title><style>body{background:#1b1e27;color:#ecdfc5;font:16px monospace;padding:24px}main{display:flex;flex-wrap:wrap;gap:24px}img{image-rendering:pixelated;width:400px}section{min-width:400px}</style><h1>Fiandeira e Casco de Ferro</h1><main>${['Fiandeira — caminhada','Fiandeira — poder','Casco de Ferro — caminhada','Casco de Ferro — poder'].map((t,i)=>'<section><p>'+t+'</p><img id="a'+i+'"></section>').join('')}</main><p>Avisos e poderes: veneno, seda, pedra e redemoinho.</p><img style="width:960px" src="guardian-upgrade.png"><script>const frames=${JSON.stringify(urls)};let t=0;function draw(){const ids=[t%16,40+Math.floor(t/2)%8,20+t%12,16+Math.floor(t/2)%4];ids.forEach((f,i)=>document.getElementById('a'+i).src=frames[i<2?0:1][f]);t++}draw();setInterval(draw,80)</script>`);
fs.appendFileSync('tests/guardian-animation.html',`<p>Ciclo dos poderes: aviso → ativação → dissipação.</p><canvas id="powers" width="480" height="150" style="width:960px;image-rendering:pixelated"></canvas><script>${read('js/boss-fx.js')};const pc=document.getElementById('powers').getContext('2d');function preview(now){const age=(now/1000)%5;pc.fillStyle='#1b1e27';pc.fillRect(0,0,480,150);pc.fillStyle='#59514a';pc.fillRect(0,120,480,3);if(age<4)drawGuardianPowers(pc,{guardianHazards:['venom','silk','pillar','vortex'].map((type,i)=>({type,x:60+i*120,y:120,age,warn:1,life:3,radius:20,height:type==='venom'?9:60}))});requestAnimationFrame(preview)}requestAnimationFrame(preview)</script>`);
console.log('104 sprites válidos e determinísticos; 16/12 passos únicos; quatro poderes, avisos, dano, esquiva, expiração, limite, reset e renderização verificados.');
