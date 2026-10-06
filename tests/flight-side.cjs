const fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'playwright');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;localStorage.setItem('valdoria.autoconnect','0');});
 await page.goto('http://localhost/jogo-teste/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>typeof netPlayerMotion==='function');
 const result=await page.evaluate(async()=>{
  await newWorld('pequeno',()=>{},4242);finishOpening(game);Menu.close();game.adminGod=true;
  const p=player,g=game,w=g.world,checks=[],check=(v,s)=>{if(!v)throw Error(s);checks.push(s);};
  const keys={down:k=>k==='ShiftLeft'},jump={down:k=>k==='Space'},none={down:()=>false};
  const equip=id=>{g.accessories=[{item:id,count:1}];Object.assign(p,{h:PLAYER_H,flightUsed:0,jetFuel:0,onGround:false,swimming:false,crouching:false,climbing:false,wallGrab:null,seat:null,vx:0,vy:-100,facing:1,flightTilt:0});};
  equip(ITEM.STORM_WINGS);
  check(flightControl(p,.1,keys,w,1)&&p.flightSide&&p.vy===0&&p.vx>0&&p.vx<288*1.22,'Shift mantém altitude com aceleração suave');
  for(let i=0;i<60;i++)flightControl(p,1/60,keys,w,1);
  check(Math.abs(p.vx-288*1.22)<.1,'velocidade lateral chega ao bônus de 22%');
  check(Math.abs(p.flightUsed-1.1)<1e-6,'modo lateral usa o tempo normal das asas');
  for(let i=0;i<30;i++)flightControl(p,1/60,keys,w,-1);check(p.vx<0&&p.facing===-1,'A/D mudam a direção lateral suavemente');
  flightControl(p,.1,keys,w,0);check(p.vx<0,'sem A/D continua na direção em que olha');
  for(let i=0;i<30;i++)updateFlightPose(p,1/60);
  check(p.flightTilt>1.5,'corpo chega à posição horizontal suavemente');
  const packet=netPlayerMotion(p);check(packet.flightSide&&packet.flightTilt>1.5,'pose lateral é transmitida no multiplayer');
  flightControl(p,.1,jump,w,1);check(!p.flightSide&&p.vy<0,'soltar Shift e segurar pulo retoma a subida');
  flightControl(p,.1,none,w,0);check(!p.flightSide&&!p.flying,'soltar controles encerra o voo lateral');
  p.flightUsed=30;flightControl(p,.1,keys,w,1);check(!p.flightSide&&!p.flying&&p.flightGliding&&p.vy<=70,'Shift não cria voo infinito quando o impulso acaba');
  p.onGround=true;check(!flightControl(p,.1,keys,w,1),'Shift no chão não decola sozinho');
  equip(ITEM.JETPACK);g.inventory.slots.fill(null);check(!flightControl(p,.1,keys,w,1),'jetpack não voa de lado sem combustível');
  g.inventory.add(ITEM.FLIGHT_FUEL,1);flightControl(p,.5,keys,w,1);
  check(p.flightSide&&p.jetFuel===19.5&&g.inventory.count(ITEM.FLIGHT_FUEL)===0,'jetpack lateral consome combustível normalmente');
  for(let i=0;i<30;i++)updateFlightPose(p,1/60);
  const peer=netPeer(990,'Pedro');netPeerState(peer,netMyState());netSamplePeer(peer,performance.now()/1000);
  check(peer.flightSide&&peer.flightTilt>1.5&&netPeerAnimation(peer).player.flightSide,'outro jogador recebe a pose horizontal completa');
  const remoteCanvas=makeCanvas(240,200),remoteCtx=remoteCanvas.getContext('2d');peer.x=100;peer.y=70;
  const atlas=renderer.playerAtlas,oldCtx=renderer.ctx;netDrawPeer(remoteCtx,peer);
  check(remoteCtx.getImageData(0,0,240,200).data.some((v,i)=>i%4===3&&v)&&renderer.playerAtlas===atlas&&renderer.ctx===oldCtx,'voo remoto desenha corpo e jetpack sem alterar o desenho local');
  equip(ITEM.STORM_WINGS);const tx=w.w>>1,sy=w.surface[tx];
  for(let x=tx-5;x<tx+15;x++)for(let y=sy-20;y<sy-3;y++){w.setTile(x,y,TILE.AIR);w.water[y*w.w+x]=0;}
  p.x=tx*T;p.y=(sy-15)*T;p.vy=0;p.facing=1;const startX=p.x,startY=p.y;
  input.keys.add('ShiftLeft');for(let i=0;i<30;i++)p.update(1/60,input,w);input.keys.clear();
  check(p.x>startX+130&&Math.abs(p.y-startY)<.01&&p.flightTilt>1.5,'voo lateral integrado anda para frente sem subir ou cair');
  const wallX=Math.floor((p.x+p.w)/T)+2;for(let y=sy-20;y<sy-3;y++)w.setTile(wallX,y,TILE.STONE);
  input.keys.add('ShiftLeft');for(let i=0;i<30;i++)p.update(1/60,input,w);input.keys.clear();
  check(p.x+p.w<=wallX*T+.01&&!p.collides(w,p.x,p.y),'voo lateral respeita paredes');
  const ids=[ITEM.CLOTH_WINGS,ITEM.BONE_WINGS,ITEM.CRYSTAL_WINGS,ITEM.MECHANICAL_WINGS,ITEM.STORM_WINGS,ITEM.VIGIA_WINGS,ITEM.JETPACK];
  for(const id of FLIGHT_WINGS){
   const signatures=new Set();
   for(let f=0;f<FLIGHT_FRAME_COUNT;f++){
    const img=flightProfileSprite(id,'flight',f);signatures.add(img.toDataURL());
    const data=img.getContext('2d').getImageData(0,0,img.width,img.height).data;
    check(data.every((v,i)=>i%4!==3||v===0||v===255),ITEM_DEFS[id].name+' quadro '+f+': pixels sem bordas borradas');
   }
   check(signatures.size>=14,ITEM_DEFS[id].name+': batida com pelo menos 14 quadros distintos');
   let x0=128,x1=0,y0=128,y1=0;
   for(let f=0;f<FLIGHT_FRAME_COUNT;f++){
    const img=flightProfileSprite(id,'flight',f),a=img.getContext('2d').getImageData(0,0,128,128).data;
    for(let y=0;y<128;y++)for(let x=0;x<128;x++)if(a[(y*128+x)*4+3]){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
   }
   check(x1-x0<=32&&y1-y0<=43,ITEM_DEFS[id].name+': todos os quadros ficam proporcionais ao corpo');
  }
  for(const id of ids)for(const pose of ['flight','glide','folded','lateral'])for(let f=0;f<FLIGHT_FRAME_COUNT;f++){
   const img=flightProfileSprite(id,pose,f),a=img.getContext('2d').getImageData(0,0,img.width,img.height).data;
   check(a.every((v,i)=>i%4!==3||!v||(Math.floor(i/4)%img.width>1&&Math.floor(i/4)%img.width<img.width-2&&Math.floor(i/4/img.width)>1&&Math.floor(i/4/img.width)<img.height-2)),id+' '+pose+' '+f+': sprite tem margem e não corta partes');
  }
  check(PLAYER_POSES.slice(PLAYER_ANIMS.flightSide,PLAYER_ANIMS.flightSide+8).every(q=>q.handLift.every(v=>v<5)),'todos os quadros laterais mantêm as mãos junto ao corpo');
  check(ids.every(id=>ITEM_DEFS[id].descricao.length<150),'descrições das asas e jetpack são curtas');
  const positionCanvas=makeCanvas(180,140),pc=positionCanvas.getContext('2d');
  for(const id of ids)for(const facing of [-1,1])for(let frame=0;frame<FLIGHT_FRAME_COUNT;frame++){
   equip(id);Object.assign(p,{x:80-p.w/2,y:50-p.h/2,facing,flightSide:true,flying:true,flightTilt:Math.PI/2,jetFuel:20,visualTime:frame/20});
   pc.clearRect(0,0,180,140);drawFlightEquipment(pc,g);
   const pixels=pc.getImageData(0,0,180,140).data;let sum=0,count=0,front=-Infinity;
   for(let y=0;y<140;y++)for(let x=0;x<180;x++)if(pixels[(y*180+x)*4+3]){const offset=(x-p.cx)*facing;sum+=offset;count++;front=Math.max(front,offset);}
   check(count>0&&sum/count<-3&&front<8,id+' direção '+facing+' quadro '+frame+': equipamento lateral permanece atrás da cabeça');
  }
  equip(ITEM.JETPACK);Object.assign(p,{x:50,y:30,h:CROUCH_H,crouching:true,crouchAge:1,onGround:true,flying:false,flightTilt:0,flightSide:false});
  const jetCanvas=makeCanvas(120,100),jc=jetCanvas.getContext('2d');drawFlightEquipment(jc,g);
  const jetData=jc.getImageData(0,0,120,100).data;let lx=120,rx=0,ly=100,ry=0;
  for(let y=0;y<100;y++)for(let x=0;x<120;x++)if(jetData[(y*120+x)*4+3]){lx=Math.min(lx,x);rx=Math.max(rx,x);ly=Math.min(ly,y);ry=Math.max(ry,y);}
  check(rx-lx>ry-ly&&ry<p.y+p.h-10,'jetpack agachado fica horizontal sobre as costas');
  const tooltip=makeCanvas(320,240),tc=tooltip.getContext('2d');tc.font='7px monospace';tc.scale(2,2);
  const drawn=[],fill=tc.fillText.bind(tc);tc.fillText=(text,x,y)=>{drawn.push({text,x,width:tc.measureText(text).width});fill(text,x,y);};
  const priorCanvas=renderer.canvas;try{renderer.canvas=tooltip;g.inventoryUI.drawTooltipBox(tc,'Asas da Tempestade',['Uma descrição muito longa de equipamento. '.repeat(5)],150,0,2);}finally{renderer.canvas=priorCanvas;}
  check(drawn.length>3&&drawn.every(r=>r.x>=0&&r.x+r.width<=160),'descrição longa quebra linhas e fica dentro da tela');
  const sheet=makeCanvas(128*FLIGHT_FRAME_COUNT,128*5*7),ctx=sheet.getContext('2d');
  const gallery=makeCanvas(1120,530),gc=gallery.getContext('2d');gc.fillStyle='#172330';gc.fillRect(0,0,1120,530);gc.imageSmoothingEnabled=false;
  for(const [i,id]of ids.entries())for(const [row,pose]of ['flight','glide','folded','lateral','crouch'].entries()){
   equip(id);p.x=80-p.w/2;p.y=64-p.h/2;p.jumpAge=1;p.anim=0;p.jetFuel=20;p.crouchAge=1;
   if(pose==='crouch'){p.crouching=true;p.h=CROUCH_H;p.onGround=true;p.vx=0;}else{p.h=PLAYER_H;p.crouching=false;}
   p.flying=pose==='flight'||pose==='lateral';p.flightGliding=pose==='glide';p.flightSide=pose==='lateral';p.flightTilt=p.flightSide?Math.PI/2:0;
   for(let f=0;f<FLIGHT_FRAME_COUNT;f++){
    p.visualTime=f/(p.flying?20:5);ctx.save();ctx.translate(f*128,(i*5+row)*128);
    drawFlightEquipment(ctx,g);const old=renderer.ctx;try{renderer.ctx=ctx;renderer.drawPlayer(p,null,{active:false},g);}finally{renderer.ctx=old;}ctx.restore();
   }
   if(row===0||row===3||row===4){gc.drawImage(sheet,4*128+40,(i*5+row)*128+20,80,80,i*160,row===0?10:row===3?180:350,160,160);}
  }
  for(let i=0;i<7;i++){gc.font='12px monospace';gc.textAlign='center';gc.fillStyle='#e7c78e';gc.fillText(['Tecido','Osso','Cristal','Mecânicas','Tempestade','Núcleo','Jetpack'][i],i*160+80,170);}
  return {checks,sheet:sheet.toDataURL(),gallery:gallery.toDataURL(),tooltip:tooltip.toDataURL()};
 });
 if(errors.length)throw Error(errors.join('\n'));
 for(const [key,name]of [['sheet','flight-refined-sheet.png'],['gallery','flight-refined-gallery.png'],['tooltip','flight-tooltip.png']])fs.writeFileSync(__dirname+'/'+name,Buffer.from(result[key].split(',')[1],'base64'));
 console.log(result.checks.length+' verificações de voo lateral, pixel art e multiplayer passaram.');
 await page.goto('http://localhost/jogo-teste/tests/flight-equipment-preview.html?v=fit8',{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>sheet.complete&&sheet.naturalWidth===2048&&sheet.naturalHeight===4480);
 for(let pose=0;pose<5;pose++){
  await page.locator('[data-pose="'+pose+'"]').click();
  await page.evaluate(()=>{draw(200);if(!ctx.getImageData(0,0,1120,255).data.some((v,i)=>i%4===3&&v))throw Error('Prévia vazia');});
 }
 if(errors.length)throw Error(errors.join('\n'));
 console.log('Prévia verificada nas cinco poses, incluindo S e Shift.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
