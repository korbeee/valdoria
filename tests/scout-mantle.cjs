const fs=require('fs'),{chromium}=require(process.env.PLAYWRIGHT_PATH || 'playwright');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{const p=await b.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.addInitScript(()=>{requestAnimationFrame=()=>0;localStorage.setItem('valdoria.autoconnect','0');});await p.goto('http://localhost/jogo-teste/',{waitUntil:'domcontentloaded'});await p.evaluate(()=>document.fonts.ready);const r=await p.evaluate(()=>{
 setOutfitItem(game,ITEM.REF_SCOUT_ARMOR);const atlas=renderer.playerAtlas;
 const c=makeCanvas(900,430),ctx=c.getContext('2d');ctx.fillStyle='#233c42';ctx.fillRect(0,0,900,430);ctx.imageSmoothingEnabled=false;
 const states=[['Repouso',PLAYER_ANIMS.idle],['Passo 1',PLAYER_ANIMS.walk],['Passo 2',PLAYER_ANIMS.walk+3],['Salto',PLAYER_ANIMS.jump+1],['Ataque',PLAYER_ANIMS.attack+1],['Abaixado',PLAYER_ANIMS.crouch]];
 states.forEach(([label,f],i)=>{ctx.drawImage(atlas,f*32,0,32,48,15+i*148,38,128,192);ctx.font='12px Silkscreen';ctx.fillStyle='#e7e7df';ctx.fillText(label,15+i*148,26);ctx.save();ctx.translate(143+i*148,253);ctx.scale(-1,1);ctx.drawImage(atlas,f*32,0,32,48,0,0,96,144);ctx.restore();});
 if(atlas.height!==48)throw Error('Atlas inválido');if(SCOUT_MANTLE.some(row=>row.length!==17))throw Error('Linha irregular do manto');
 return {image:c.toDataURL(),frames:PLAYER_POSES.length};
 });if(errors.length)throw Error(errors.join('\n'));fs.writeFileSync(__dirname+'/scout-mantle.png',Buffer.from(r.image.split(',')[1],'base64'));console.log('Manto renderizado em '+r.frames+' quadros; prévia de seis poses nas duas direções.');}finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1);});
