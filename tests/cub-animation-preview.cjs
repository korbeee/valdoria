const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{const p=await b.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.addInitScript(()=>window.requestAnimationFrame=()=>1);await p.goto('http://localhost/jogo-teste/');await p.waitForFunction(()=>typeof game==='object');const result=await p.evaluate(()=>{
 const frames=Array.from({length:13},(_,i)=>cubSpiritSprite(i).toDataURL());
 if(new Set(frames.slice(0,8)).size<6)throw Error('Walking frames are not distinct');
 const c=makeCanvas(832,210),ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.fillStyle='#202c2b';ctx.fillRect(0,0,832,210);ctx.fillStyle='#e8dbc3';ctx.font='16px monospace';ctx.fillText('FLUTUAÇÃO',16,24);
 for(let f=0;f<8;f++)ctx.drawImage(cubSpiritSprite(f),f*104,35,104,96);
 ctx.fillText('Cauda espectral • sem pernas • bloom roxo',16,166);return {frames,sheet:c.toDataURL()};});
 fs.writeFileSync('tests/cub-walk.png',Buffer.from(result.sheet.split(',')[1],'base64'));
 fs.writeFileSync('tests/cub-animation.html',`<!doctype html><meta charset="utf-8"><title>Ursinho — animações</title><style>body{background:#202c2b;color:#eee3ce;font:18px system-ui;text-align:center;padding:40px}section{display:inline-block;margin:35px}img{filter:drop-shadow(0 0 12px #a365df);image-rendering:pixelated;width:208px;height:192px;border-bottom:4px solid #67745b}</style><h1>Ursinho</h1><section><h2>Flutuação</h2><img id="walk"></section><section><h2>Descanso</h2><img id="idle"></section><script>const f=${JSON.stringify(result.frames)};let n=0;setInterval(()=>{walk.src=f[n%8];idle.src=f[[8,8,8,9,9,8,8,10,8,11,8,8][Math.floor(n/3)%12]];n++},110)</script>`);
 if(errors.length)throw Error(errors.join('\n'));console.log('13 frames rendered, walking animation verified');}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
