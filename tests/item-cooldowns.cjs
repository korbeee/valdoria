const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>window.requestAnimationFrame=()=>0);
 await page.goto('http://localhost/jogo-teste/');await page.waitForFunction(()=>typeof game==='object');
 const result=await page.evaluate(()=>{
  finishOpening(game);Menu.root.hidden=true;game.paused=false;game.intro.active=false;
  const g=game,ui=g.inventoryUI,p=g.player,w=g.world,checks=[];
  const check=(v,label)=>{if(!v)throw Error(label);checks.push(label);};
  g.clock=100;g.mount=null;ui.open=false;ui.inv.slots.fill(null);
  g.accessories=[ITEM.BOTTLED_ROAR,ITEM.PREDATOR_STEP,ITEM.DIGGER_SHIELD].map(item=>({item,count:1}));
  ui.inv.add(ITEM.HUNT_INSTINCT,1);ui.inv.add(ITEM.HUNT_COCOON,1);
  check(ui.cooldownIndicators().length===3,'Apenas equipamentos vestidos aparecem; amuleto e armadilha na mochila ficam fora');
  check(ui.cooldownIndicators().every(s=>ui.cooldownText(s)==='PRONTO'),'Poderes disponíveis mostram PRONTO');
  p.x=90*T;p.y=20*T-p.h;p.facing=1;p.onGround=true;p.crouching=false;p.swimming=false;p.webbed=0;
  for(let x=89;x<95;x++){for(let y=15;y<20;y++)w.setTile(x,y,TILE.AIR);w.setTile(x,20,TILE.STONE);}
  useBottledRoar(g);useHuntInstinct(g);placeHuntCocoon(g);
  const originalDown=input.down;input.down=key=>key==='KeyF';updateShield(g,0,false);input.down=()=>false;updateShield(g,.8,false);input.down=originalDown;
  gearVelocity(p,0,{down:key=>key==='ShiftLeft'},w,1,false);
  for(const [item,total] of [[ITEM.BOTTLED_ROAR,30],[ITEM.PREDATOR_STEP,1.1],[ITEM.DIGGER_SHIELD,.35],[ITEM.HUNT_INSTINCT,20],[ITEM.HUNT_COCOON,8]]) {
   const state=ui.cooldownState(item);check(Math.abs(state.left-total)<1e-8,ITEM_DEFS[item].name+': tempo acompanha o uso real');
  }
  check(ui.cooldownText(ui.cooldownState(ITEM.DIGGER_SHIELD))==='0.4s','Recarga curta mostra décimos de segundo');
  g.clock+=.5;check(ui.cooldownState(ITEM.DIGGER_SHIELD).left===0,'Escudo libera no tempo correto');
  check(Math.abs(ui.cooldownState(ITEM.BOTTLED_ROAR).left-29.5)<1e-8,'Contagem acompanha o relógio do jogo');
  const before=ui.cooldownState(ITEM.HUNT_COCOON).left;useHuntInstinct(g);placeHuntCocoon(g);
  check(ui.cooldownState(ITEM.HUNT_COCOON).left===before&&g.instinctReady===120,'Uso bloqueado não reinicia a recarga');
  ui.inv.slots[20]={item:ITEM.HUNT_COCOON,count:1};check(ui.cooldownIndicators().length===3,'Armadilhas na mochila não criam indicadores');
  ui.inv.add(ITEM.BOTTLED_ROAR,1);check(ui.cooldownIndicators().length===3,'Bebida equipada e na mochila compartilha um indicador');
  const screenshot=()=>{const c=makeCanvas(ui.renderer.canvas.width,390),ctx=c.getContext('2d');ctx.fillStyle='#141922';ctx.fillRect(0,0,c.width,c.height);ui.draw(ctx);return c.toDataURL();};
  g.clock=105;const wide=screenshot();
  for(const width of [1280,800,390])for(const smart of [false,true]) {
   ui.renderer.canvas.width=width;g.smartCursor=smart;
   ui.cooldownIndicators().forEach((state,i)=>{
    const [x,y,rw,rh]=ui.cooldownIndicatorRect(i),s=ui.scale();
    check(UI.ORIGIN+(x+rw+4)*s<=width,'Indicador cabe em '+width+' px / cursor '+smart);
    const hit=ui.hitTest(UI.ORIGIN+(x+15)*s,UI.ORIGIN+(y+10)*s);
    check(hit?.type==='cooldownStatus'&&hit.state.item===state.item,'Hover identifica o poder na tela '+width);
   });
  }
  g.smartCursor=false;const narrow=screenshot();ui.renderer.canvas.width=1280;
  g.clock=140;check(ui.cooldownIndicators().every(s=>s.left===0),'Todos os poderes terminam a recarga');
  g.accessories.fill(null);check(ui.cooldownIndicators().length===1&&ui.cooldownIndicators()[0].item===ITEM.BOTTLED_ROAR,'Equipamentos removidos somem; bebida na mochila permanece');
  ui.inv.slots.fill(null);check(ui.cooldownIndicators().length===0,'Sem itens, não aparecem painéis vazios');
  ui.inv.add(ITEM.BOW,1);g.bow={item:ITEM.BOW,cooldown:.25};
  check(ui.cooldownState(ITEM.BOW).total===BOW.cooldown&&ui.cooldownIndicators().length===0,'Arco mantém recarga no próprio slot sem painel extra');g.bow.cooldown=0;check(ui.cooldownIndicators().length===0,'Arco pronto também não cria painel');
  ui.inv.add(ITEM.TRIDENT,1);g.selected=1;startTridentAnim(g,'thrust',{x:p.cx+100,y:p.cy},ITEM_DEFS[ITEM.TRIDENT]);updateTrident(g,1);
  check(ui.cooldownState(ITEM.TRIDENT)?.total===.04,'Tridente registra a arma e o intervalo real');
  g.sword={item:ITEM.SPINNER_NEEDLE,active:false,prof:NEEDLE_THRUST};g.attackCooldown=.02;g.attackCooldownItem=ITEM.SPINNER_NEEDLE;
  check(ui.cooldownState(ITEM.SPINNER_NEEDLE)?.left===.02,'Armas corpo a corpo acompanham intervalo de ataque');
  ui.inv.add(ITEM.SPINNER_NEEDLE,1);check(ui.cooldownIndicators().length===0,'Espada e tridente em recarga não aparecem nos indicadores laterais');
  return {checks,wide,narrow};
 });assert.deepEqual(errors,[]);
 for(const size of ['wide','narrow'])fs.writeFileSync('tests/item-cooldowns-'+size+'.png',Buffer.from(result[size].split(',')[1],'base64'));
 console.log(result.checks.length+' verificações de cooldown passaram.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
