const fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'playwright');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
 const p=await b.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));await p.addInitScript(()=>{requestAnimationFrame=()=>0;localStorage.setItem('valdoria.autoconnect','0');});
 await p.goto('http://localhost/jogo-teste/',{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>typeof drawBossBattleVfx==='function');
 const result=await p.evaluate(()=>{
  const checks=[],check=(v,s)=>{if(!v)throw Error(s);checks.push(s);};
  check(YETI_THROW_ICE.pixels>100&&YETI_THROW_ICE.size<100,'gelo extraído da sprite original');
  for(const frame of YETI_THROW_ICE.frames){const a=frame.getContext('2d').getImageData(0,0,frame.width,frame.height).data;check(a.every((v,i)=>i%4!==3||v===0||v===255),'gelo girando mantém pixels definidos');}
  const c=makeCanvas(1540,620),ctx=c.getContext('2d');ctx.fillStyle='#192838';ctx.fillRect(0,0,c.width,c.height);ctx.imageSmoothingEnabled=false;
  const kinds=Object.keys(BATTLE_COLORS),states=['swipe','pounce','rain','charge','fight','gust','yetiThrow'];
  const w=new World(180,100,44,{lazy:true});game.world=world=w;game.adminGod=true;
  for(let i=0;i<kinds.length;i++)for(let row=0;row<2;row++){
   ctx.save();ctx.beginPath();ctx.rect(i*220,row*310,220,310);ctx.clip();ctx.translate(i*220,row*310);
   const kind=kinds[i],m=new Wildlife(kind,60,160);if(kind==='fiandeira')setupFiandeira(m,{x:110,ceilY:10,floorY:245,door:[]});if(kind==='cascoferro')setupCascoFerro(m,{x:110,y:245,door:[],gate:[]});
   Object.assign(m,{x:110-m.w/2,y:245-m.h,state:row?'recover':states[i],stateT:.32,sleeping:false,boss:true,clock:1.1,facing:1,slam:false,open:row?.9:0,attack:'pulse',attackT:.8,waves:kind==='bear'?[{x:170,y:242,dir:1,life:1.2}]:[],rocks:[],hazards:kind==='yeti'?[{type:'ice',x:180,y:160,vx:120,vy:-20,life:2.92}]:[],rings:[]});
   const g={mobs:[m],clock:0,spiderShots:[],beetleRocks:[],aveStrikes:[],nucleoShots:[]};
   ctx.fillStyle='#586c70';ctx.fillRect(0,246,220,3);drawWildlife(ctx,m);drawBossBattleVfx(ctx,g);
   if(row){BATTLE_MEMORY.get(m).bursts.push({x:m.cx,y:245,t:0,rock:true});g.clock=.25;drawBossBattleVfx(ctx,g);}
   const before={hp:m.hp,x:m.x,y:m.y,state:m.state};ctx.globalAlpha=.37;const tr=ctx.getTransform();drawBossBattleVfx(ctx,g);
   check(ctx.globalAlpha===.37&&ctx.getTransform().e===tr.e&&JSON.stringify(before)===JSON.stringify({hp:m.hp,x:m.x,y:m.y,state:m.state}),'efeitos de '+kind+' preservam desenho e simulação');ctx.globalAlpha=1;
   ctx.fillStyle='#efc88f';ctx.font='12px monospace';ctx.textAlign='center';ctx.fillText(WILDLIFE[kind].name,110,28);ctx.restore();
  }
  const ice=makeCanvas(360,180),ic=ice.getContext('2d');ic.fillStyle='#192838';ic.fillRect(0,0,360,180);ic.imageSmoothingEnabled=false;ic.drawImage(wildlifeSprite('yeti',4*16+10).normal,0,20);drawYetiIce(ic,{x:245,y:95,vx:0,vy:0,life:3});
  return {checks,png:c.toDataURL(),ice:ice.toDataURL(),size:YETI_THROW_ICE.size};
 });if(errors.length)throw Error(errors.join('\n'));
 fs.writeFileSync(__dirname+'/boss-vfx.png',Buffer.from(result.png.split(',')[1],'base64'));fs.writeFileSync(__dirname+'/yeti-ice-comparison.png',Buffer.from(result.ice.split(',')[1],'base64'));
 console.log(result.checks.length+' verificações de efeitos passaram. Gelo: '+result.size+' px.');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1);});
