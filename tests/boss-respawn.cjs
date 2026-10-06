const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>window.requestAnimationFrame=()=>1);
  await page.goto('http://localhost/jogo-teste/');await page.waitForFunction(()=>typeof game==='object');
  const result=await page.evaluate(()=>{
   finishOpening(game);Menu.root.hidden=true;game.paused=false;game.intro.active=false;
   world=game.world=new World(600,160,391);game.map=new WorldMap(world);
   startOpening(game);finishOpening(game);game.intro.active=false;
   const p=game.player,homeX=p.x,homeY=p.y;game.adminGod=false;game.inventoryUI.open=false;
   const checks=[];const check=(condition,label)=>{if(!condition)throw Error(label);checks.push(label);};
   // Arena plana distante do nascimento: reproduz o ramo de chefe fora da câmera.
   for(let x=25;x<75;x++)for(let y=45;y<=61;y++)world.setTile(x,y,y===61?TILE.STONE:TILE.AIR);
   const lair={x:45*T,y:61*T,door:[[27,58],[27,59],[27,60]],bounds:[28,45,73,60]};
   const fight=(kind)=>{
    game.mobs=[];
    let boss;
    if(kind==='bear')boss=spawnBearBoss(game,lair);
    else{boss=new Wildlife('tiger',45*T-WILDLIFE.tiger.w/2,61*T-WILDLIFE.tiger.h-.01);setupTiger(boss,{x:45*T,y:61*T});game.mobs.push(boss);}
    boss.hp=12;boss.sleeping=false;boss.aware=true;boss.state='hunt';boss.phase=2;boss.damage=20;boss.bleed={t:5,dps:8,tick:0};game.boss=boss;
    if(kind==='bear'){bearSeal(game,boss,true);boss.waves.push({x:boss.cx,y:boss.y,dir:1,life:1,hit:false});}
    else{const hyena=new Wildlife('hyena',boss.x+80,boss.y);hyena.tigerPack=true;game.mobs.push(hyena);}
    p.x=boss.x;p.y=61*T-p.h-.01;p.hp=1;p.invulnerable=0;
    updateHostiles(game,0);
    check(!!game.respawnPending,kind+': contato letal agenda renascimento');
    // Antes da correção, updateMobs tenta ler bear.den.x e encerra o ciclo do jogo.
    for(let i=0;i<3;i++)update(1/60);
    check(p.hp===p.maxHp,kind+': jogador curado');
    check(Math.abs(p.x-homeX)<1&&Math.abs(p.y-homeY)<2,kind+': nascimento');
    check(boss.hp===boss.def.hp&&boss.sleeping&&boss.state==='sleep',kind+': boss restaurado');
    check(Math.abs(boss.cx-lair.x)<1&&Math.abs(boss.y+boss.h-lair.y)<1,kind+': posição original');
    check(!boss.bleed&&boss.phase===1&&boss.damage===0,kind+': sem efeitos da luta');
    check(game.boss===null,kind+': barra fechada');
    check(!game.mobs.some(m=>m.tigerPack),kind+': bando removido');
    if(kind==='bear')check(lair.door.every(([x,y])=>world.getTile(x,y)===TILE.AIR)&&!boss.waves.length&&!boss.rocks.length,'porta e ataques do urso limpos');
    const time=game.time;for(let i=0;i<20;i++)update(1/60);check(game.time>time,kind+': jogo segue atualizando');
    // A mesma instância pode ser enfrentada e resetada novamente.
    boss.hp=3;boss.state='hunt';boss.sleeping=false;p.hp=1;p.invulnerable=0;
    damageMonsterPlayer(game,100,boss.cx);update(1/60);check(boss.hp===boss.def.hp,kind+': segunda morte');
   };
   fight('bear');fight('tiger');
   // O nascimento pode ter sido ocupado por uma construção desde a abertura.
   const bx=Math.floor(homeX/T),by=Math.floor(homeY/T);
   world.setTile(bx,by,TILE.STONE);p.hp=1;p.invulnerable=0;
   damageMonsterPlayer(game,100,p.cx);update(1/60);
   check(!p.collides(world,p.x,p.y)&&p.hp===p.maxHp,'nascimento obstruído: retorna a espaço livre');
   return checks;
  });
  assert.deepEqual(errors,[]);console.log(`${result.length} verificações passaram: morte, nascimento, reset e continuidade para urso e tigre.`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
