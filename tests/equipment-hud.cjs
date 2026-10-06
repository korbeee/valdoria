const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'playwright');const fs=require('fs'),assert=require('assert/strict');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{const page=await b.newPage({viewport:{width:1100,height:760}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>window.requestAnimationFrame=()=>1);await page.goto('http://localhost/jogo-teste/');await page.waitForFunction(()=>typeof game==='object');const r=await page.evaluate(()=>{
 finishOpening(game);Menu.root.hidden=true;game.intro.active=false;const ui=game.inventoryUI,g=game,p=g.player,checks={};
 g.accessories=[{item:ITEM.CUB_SPIRIT,count:1},null];checks.migratesFive=playerAccessories(g).length===5&&g.accessories[0].item===ITEM.CUB_SPIRIT;
 const pos=ui.equipmentPanel(),rect=ui.accessoryRects[4],mx=pos.x+(rect[0]+8)*pos.s,my=pos.y+(rect[1]+8)*pos.s;
 ui.open=true;ui.held={item:ITEM.BOTTLED_ROAR,count:1};ui.onMouseDown(0,mx,my,false);checks.equipFifth=g.accessories[4]?.item===ITEM.BOTTLED_ROAR&&!ui.held;
 g.outfit=ITEM.PATRIARCH_HIDE;checks.defenseArmor=Math.round(playerDefense(g)*100)===32;
 // Um acessório com defesa de teste comprova que valor mostrado e aplicado se combinam.
 const old=ITEM_DEFS[ITEM.BROKEN_FANG].acessorio.defesa;ITEM_DEFS[ITEM.BROKEN_FANG].acessorio.defesa=.1;g.accessories[1]={item:ITEM.BROKEN_FANG,count:1};
 checks.combinedDefense=Math.abs(playerDefense(g)-.388)<1e-8;
 p.hp=100;p.maxHp=100;g.clock=100;g.roarReady=0;g.adminGod=false;
 const m=new Wildlife('wolf',p.cx+50,p.y);g.mobs=[m];damageMonsterPlayer(g,10,p.cx-20);checks.damageTriggersRoar=g.roarReady===130&&m.roarKnockback>0;checks.appliedDefense=p.hp===94;
 g.clock=110;m.vx=0;m.roarKnockback=0;damageMonsterPlayer(g,1,p.cx-20);checks.cooldownBlocks=g.roarReady===130&&m.roarKnockback===0;
 g.clock=130;damageMonsterPlayer(g,1,p.cx-20);checks.reactivates=g.roarReady===160&&m.roarKnockback>0;
 ui.held=null;ui.onMouseDown(2,mx,my,false);checks.unequip=ui.held?.item===ITEM.BOTTLED_ROAR&&!g.accessories[4];g.clock=180;m.roarKnockback=0;damageMonsterPlayer(g,1,p.cx-20);checks.unequippedDoesNotTrigger=g.roarReady===160&&m.roarKnockback===0;
 ui.onMouseDown(0,mx,my,false);checks.reequipPreservesCooldown=g.roarReady===160;
 ITEM_DEFS[ITEM.BROKEN_FANG].acessorio.defesa=old;
 ui.held={item:ITEM.BOTTLED_ROAR,count:1};ui.accessoryClick(0,2);checks.noDuplicate=!!ui.held&&!g.accessories[2];ui.held=null;
 ui.open=false;g.clock=140;g.roarReady=160;g.smartCursor=true;
 const r=ui.roarIndicatorRect(),origin=UI.ORIGIN,s=ui.scale();checks.separateCooldown=r[0]>UI.W+30;checks.cooldownCapturesMouse=ui.hitTest(origin+(r[0]+10)*s,origin+(r[1]+10)*s)?.type==='roarStatus';
 const c=renderer.canvas,ctx=c.getContext('2d');ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#253742';ctx.fillRect(0,0,c.width,c.height);ui.draw(ctx);
 return {checks,shot:c.toDataURL()};});fs.writeFileSync('tests/equipment-hud.png',Buffer.from(r.shot.split(',')[1],'base64'));console.log(r.checks,errors);for(const [k,v]of Object.entries(r.checks))assert.equal(v,true,k);assert.deepEqual(errors,[]);
 await page.setViewportSize({width:640,height:480});const small=await page.evaluate(()=>{const ui=game.inventoryUI,p=ui.equipmentPanel();return p.x>=0&&p.y>=0&&p.x+p.w*p.s<=renderer.canvas.width&&p.y+p.h*p.s<=renderer.canvas.height;});assert.equal(small,true);console.log('Equipment, damage, cooldown and small viewport passed');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
