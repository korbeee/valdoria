const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1100,height:720}});
  await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;localStorage.setItem('valdoria.autoconnect','0');});
  await page.goto('http://localhost/jogo-teste/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>typeof netSamplePeer==='function');
  const checks=await page.evaluate(async()=>{
   await newWorld('pequeno',()=>{},4242);finishOpening(game);Menu.close();game.paused=false;game.adminGod=true;
   NET.room={code:'SMOOTH'};NET.isHost=true;
   const p=netPeer(900,'Pedro'),checks=[],check=(ok,s)=>{if(!ok)throw Error(s);checks.push(s);};
   const packet=t=>({t,x:100+170*t,y:100,vx:170,vy:0,f:1,h:42,onGround:true,crouching:false,s:0,tl:0,
    motion:{anim:t*16,visualTime:t},equipment:{clock:t},action:{sword:{active:false},trident:{anim:{kind:'thrust',t:t%1,ang:0,facing:1,speed:1},
     thrown:{netVisualId:1,x:140+600*t,y:110,vx:600,vy:0,t,state:'fly',ang:0,trail:[140+600*t,110]},
     bolts:[{netVisualId:2,x:150+430*t,y:120,vx:430,vy:0,age:t}],fx:[{netVisualId:3,x:100+80*t,y:120,vx:80,vy:0,t,life:1}],puddles:[]}}});
   p.buf=[packet(0),packet(.05),packet(.1)];p.seen=true;p.hp=100;p.equipment={};
   const positions=[],animations=[],bolts=[],throws=[],stabs=[],drops=[];
   for(let i=0;i<=12;i++){
    netSamplePeer(p,i/120);const g=netPeerAnimation(p);
    positions.push(p.x);animations.push(p.anim);bolts.push(g.trident.bolts[0].x);throws.push(g.trident.thrown.x);stabs.push(g.trident.anim.t);drops.push(g.trident.fx[0].x);
   }
   for(const [values,label]of [[positions,'posição'],[animations,'caminhada'],[bolts,'jato de água'],[throws,'tridente arremessado'],[stabs,'estocada'],[drops,'gotas']]){
    check(new Set(values.map(v=>v.toFixed(4))).size===13,label+' avança em cada quadro entre pacotes');
    check(values.every((v,i)=>!i||v>values[i-1]),label+' progride sem andar para trás');
   }
   netSamplePeer(p,.15);check(Math.abs(p.x-125.5)<.01,'perda curta de pacote extrapola até 120 ms');
   check(Math.abs(p.anim-2.4)<.01,'caminhada continua fluida numa perda curta de pacote');
   check(Math.abs(netPeerAnimation(p).trident.bolts[0].x-214.5)<.01,'jato de água continua fluido numa perda curta de pacote');
   netSamplePeer(p,2);check(Math.abs(p.x-137.4)<.01,'extrapolação é limitada para não atravessar o mapa');
   check(p.buf[1].action.trident.thrown.x===170,'desenho não altera projéteis recebidos nem aplica dano');
   p.buf=[packet(0),{...packet(.05),x:2000}];netSamplePeer(p,.025);check(p.x===2000,'teleporte não percorre o mapa por interpolação');
   NET.worldPaused=true;p.buf=[packet(0),packet(.05)];netSamplePeer(p,.15);
   check(p.x===108.5&&netPeerAnimation(p).trident.anim.t===.05,'pausa compartilhada congela previsão visual');
   NET.worldPaused=false;
   p.pauseVote=false;p.menu=null;p.seen=true;
   const clock=game.clock||0;game.clock=clock;game.adminOpen=true;input.keys.add('KeyD');const x=player.x;
   const down=input.down,held=input.keys;let blocked=false;
   netUpdateWorld(()=>{blocked=!input.down('KeyD');check(!game.adminOpen&&!game.paused&&!game.npcOpen,'simulação ignora bloqueio local dos menus');game.clock+=.1;},.1);
   check(blocked&&input.keys===held&&game.adminOpen,'menu bloqueia apenas o controle local e restaura o painel');
   check(game.clock>clock&&!NET.worldPaused,'admin sozinho não pausa o mundo');
   p.pauseVote=true;p.menu='bestiary';
   let called=false;netUpdateWorld(()=>called=true,.1);check(!called&&NET.worldPaused,'admin e bestiário juntos pausam o mundo');
   p.pauseVote=false;called=false;netUpdateWorld(()=>called=true,.1);check(called&&!NET.worldPaused,'um jogador saindo do menu retoma o mundo');
   game.adminOpen=false;game.paused=true;p.pauseVote=false;
   netUpdateWorld(()=>called=true,.1);check(!NET.worldPaused&&game.paused,'ESC sozinho não pausa e mantém o menu aberto');
   game.paused=false;NET.isHost=false;NET.worldPaused=true;
   check(!netRefreshPause(),'convidado que fecha o menu retoma imediatamente');
   game.adminOpen=true;check(netRefreshPause(),'convidado respeita pausa conjunta enviada pelo host');
   NET.room=null;called=false;netUpdateWorld(()=>called=true,.1);check(called,'modo individual continua usando a atualização original');
   game.adminOpen=false;input.keys.clear();NET.room={code:'SMOOTH'};NET.worldPaused=false;
   const c=makeCanvas(350,180),ctx=c.getContext('2d');p.x=10;p.y=15;p.w=14;
   for(const [i,menu]of ['pause','admin','bestiary','guide','options'].entries()){p.x=10+i*65;netDrawMenuBadge(ctx,p,menu);}
   check(ctx.getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v),'miniaturas dos menus são desenhadas');
   return {checks,png:c.toDataURL()};
  });
  fs.writeFileSync(__dirname+'/multiplayer-menu-badges.png',Buffer.from(checks.png.split(',')[1],'base64'));
  console.log(checks.checks.join('\n'));console.log(checks.checks.length+' verificações de suavização e pausa passaram.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
