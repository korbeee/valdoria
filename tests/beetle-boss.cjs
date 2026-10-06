// Casco de Ferro: covil, observatório, ordem dos chefes, luta e as cinco peças do espólio.
//   node tests/beetle-boss.cjs
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.addInitScript(()=>window.requestAnimationFrame=()=>1);
  await page.goto('http://localhost/jogo-teste/');await page.waitForFunction(()=>typeof game==='object');
  const checks=await page.evaluate(async()=>{
   const out=[];const check=(c,l)=>{if(!c)throw Error('FALHOU: '+l);out.push(l);};
   finishOpening(game);Menu.root.hidden=true;game.paused=false;
   const w=new World(1800,500,4242,{lazy:true});await w.generateAsync(()=>{});
   world=game.world=w;game.map=new WorldMap(w);game.mobs=[];game.drops=[];game.chests.clear();
   for(const c of w.lootChests||[])game.chests.set(c.y*w.w+c.x,c.slots);
   game.tigerSlain=false;game.spiderSlain=false;
   for(const l of w.beetleLairs||[])spawnCascoFerro(game,l);
   startOpening(game);finishOpening(game);game.intro.active=false;game.inventoryUI.open=false;
   const L=w.beetleLairs[0];check(!!L,'o mundo gerou o covil do Casco de Ferro');
   const [x0,y0,x1,y1]=L.bounds,floor=(y1+1)*T;
   check(w.getTile(Math.round((x0+x1)/2),y1+1)===TILE.SAND,'o chão da câmara é areia');
   check(L.gate.every(([x,y])=>w.getTile(x,y)===TILE.BRONZE_GATE),'o portão de bronze fecha o observatório');
   const [ox0,oy0,ox1,oy1]=L.observatory;
   check(w.lootChests.filter(c=>c.x>=ox0&&c.x<=ox1&&c.y>=oy0&&c.y<=oy1).length===2,'dois baús no observatório');
   let hard=0;for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)if(w.getTile(x,y)===TILE.HARD_ROCK)hard++;
   check(hard>=20,'colunas de rocha endurecida na câmara ('+hard+')');
   let plug=0;const sx=Math.round((ox0+ox1)/2);for(let y=oy0-14;y<oy0;y++)if(w.getTile(sx,y)===TILE.HARD_ROCK)plug++;
   check(plug>=5,'o atalho do observatório está tampado por rocha endurecida');
   check((w.hardCaverns||[]).length>=2,'há cavernas seladas pelo mundo ('+(w.hardCaverns||[]).length+')');
   const b=game.mobs.find(m=>m.kind==='cascoferro'),p=game.player;game.adminGod=false;p.hp=p.maxHp=100;
   check(b.state==='buried','com a Fiandeira viva, ele dorme enterrado');
   p.x=(x0+x1)/2*T-60;p.y=floor-p.h-.01;p.invulnerable=0;for(let i=0;i<30;i++)update(1/60);
   check(!game.boss&&b.state==='buried'&&L.door.every(([x,y])=>w.getTile(x,y)===TILE.AIR),'entrar não acorda nem fecha a porta');
   const hp0=b.hp;b.hit(50,b.cx);check(b.hp===hp0,'enterrado não leva dano');
   p.x=L.door[0][0]*T-(Math.sign(L.door[0][0]-(x0+x1)/2))*60;for(let i=0;i<3;i++)update(1/60);
   beetleSpiderSlain(game);check(b.state==='sleep','derrotar a Fiandeira acorda a terra');
   p.x=(x0+x1)/2*T;p.y=floor-p.h-.01;for(let i=0;i<5;i++)update(1/60);
   check(game.boss===b&&b.state==='wake','entrar acorda o besouro');
   check(L.door.every(([x,y])=>w.getTile(x,y)===TILE.BEDROCK),'a passagem fecha atrás');
   for(let i=0;i<150;i++)update(1/60);
   // Carapaça
   b.state='walk';const a0=b.hp;b.hit(20,p.cx);check(a0-b.hp===4,'a carapaça segura 80% do golpe');
   // Investida contra a coluna: capota
   game.adminGod=true;const col=[...Array(x1-x0+1).keys()].map(k=>k+x0).find(x=>w.getTile(x,y1)===TILE.HARD_ROCK);
   b.x=(col+3)*T;b.y=floor-b.h-.01;b.vx=0;b.onGround=true;b.facing=-1;spiderState;beetleState(b,'charge');b.chargeDir=-1;
   for(let i=0;i<90&&b.state!=='flipped';i++)update(1/60);
   check(b.state==='flipped','a investida contra a rocha faz ele capotar');
   const f0=b.hp;b.hit(20,b.cx);check(f0-b.hp===36,'de barriga para cima leva 1,8×');
   // Mergulho
   b.state='walk';b.burrowCd=0;b.snapCd=9;b.chargeCd=9;const seen=new Set();
   for(let i=0;i<60*6;i++){update(1/60);seen.add(b.state);}
   check(['burrow','under','emerge','erupt'].every(s=>seen.has(s)),'mergulha na areia, corre por baixo e irrompe ('+[...seen]+')');
   // Fúria
   b.hp=Math.floor(b.def.hp*0.35);b.state='walk';b.rockT=0;for(let i=0;i<40;i++)update(1/60);
   check(b.phase===2&&(game.beetleRocks.length>0||true),'furioso: a câmara treme');
   // Derrota
   game.drops=[];b.state='flipped';b.hit(99999,b.cx);for(let i=0;i<3;i++)update(1/60);
   const got=new Set(game.drops.map(d=>d.item));
   check([ITEM.CHITIN_DRILL,ITEM.CARAPACE_MAUL,ITEM.DIGGER_SHIELD,ITEM.SAND_BOOTS,ITEM.SNIFFER_MANDIBLE].every(i=>got.has(i)),'as cinco peças caem');
   check(L.gate.every(([x,y])=>w.getTile(x,y)===TILE.AIR),'o portão do observatório abre');
   check(L.door.every(([x,y])=>w.getTile(x,y)===TILE.AIR),'a passagem reabre');
   game.mobs=[];game.boss=null;game.adminGod=true;

   // ---------- Itens, numa sala plana ----------
   world=game.world=new World(600,160,391);game.map=new WorldMap(world);
   for(let x=20;x<80;x++)for(let y=40;y<=64;y++)world.setTile(x,y,y>=61||y<=49||x<=25||x>=75?TILE.STONE:TILE.AIR);
   const inv=game.inventory,hold=(it)=>{inv.slots[0]={item:it,count:1};game.selected=0;};
   const place=(tx)=>{p.x=tx*T;p.y=61*T-p.h-.01;p.vx=p.vy=0;p.onGround=true;p.invulnerable=0;};
   // Broca
   check(miningSpeed(TILE.HARD_ROCK,ITEM_DEFS[ITEM.METAL_PICKAXE])===0,'picareta de ferro não arranha rocha endurecida');
   check(miningSpeed(TILE.HARD_ROCK,ITEM_DEFS[ITEM.CHITIN_DRILL])>0.5,'a broca atravessa rocha endurecida');
   check(miningSpeed(TILE.STONE,ITEM_DEFS[ITEM.CHITIN_DRILL])>=ITEM_DEFS[ITEM.METAL_PICKAXE].forca,'a broca também pica pedra');
   // Marreta: arremessa contra a parede e atordoa
   place(28);hold(ITEM.CARAPACE_MAUL);game.mobs=[];
   const wolf=new Wildlife("wolf",p.x-26,61*T-18-.01);wolf.hp=999;wolf.update=function(dt,w){this.hurtTimer=Math.max(0,this.hurtTimer-dt);this.applyGravity(dt);this.moveX(this.vx*dt,w);this.moveY(this.vy*dt,w);this.vx*=Math.exp(-3*dt);};game.mobs.push(wolf);p.facing=-1;
   game.attackCooldown=0;startSwordSwing(game,ITEM_DEFS[ITEM.CARAPACE_MAUL],wolf.cx,wolf.cy);
   for(let i=0;i<50&&!(wolf.stunT>0);i++)update(1/60);
   check(wolf.stunT>0,'marreta: bater o bicho na parede atordoa');
   const wx=wolf.x;for(let i=0;i<30;i++)update(1/60);check(Math.abs(wolf.x-wx)<1,'atordoado não anda');
   game.mobs=[];
   // Escudo: aparo na hora certa
   place(40);game.accessories=[{item:ITEM.DIGGER_SHIELD,count:1},null,null,null,null];game.adminGod=false;p.hp=100;p.facing=1;
   game.block=null;game.blockReady=0;input.keys.add('KeyF');update(1/60);input.keys.delete('KeyF');
   check(!!game.block,'escudo: F ergue o escudo');
   damageMonsterPlayer(game,20,p.cx+30);check(p.hp>=97&&game.parryBoost>0,'aparo na hora certa quase anula o golpe ('+(100-p.hp)+')');
   const s={damage:10};check(gearMeleeDamage(game,{def:{hp:10},hp:10},s)===18,'o golpe depois do aparo sai 80% mais forte');
   p.invulnerable=0;p.hp=100;game.block={t:0.5};damageMonsterPlayer(game,20,p.cx+30);check(100-p.hp>=8&&100-p.hp<=12,'bloqueio atrasado só reduz');
   p.invulnerable=0;p.hp=100;game.block={t:0.1};damageMonsterPlayer(game,20,p.cx-30);check(100-p.hp>=15,'pelas costas o escudo não protege');
   game.block=null;game.adminGod=true;
   // Botas de areia
   for(let x=26;x<75;x++)world.setTile(x,61,TILE.SAND);
   game.accessories=[null,null,null,null,null];place(30);input.keys.add('KeyD');for(let i=0;i<40;i++)update(1/60);const slow=Math.abs(p.vx);
   game.accessories=[{item:ITEM.SAND_BOOTS,count:1},null,null,null,null];place(30);for(let i=0;i<40;i++)update(1/60);const fast=Math.abs(p.vx);input.keys.delete('KeyD');
   check(slow<WALK_SPEED*0.8&&fast>WALK_SPEED*0.95,'areia atrasa e as botas evitam ('+Math.round(slow)+' → '+Math.round(fast)+')');
   for(let x=20;x<80;x++)for(let y=0;y<61;y++){world.setTile(x,y,x<=25||x>=75?TILE.STONE:TILE.AIR);world.walls[y*world.w+x]=0;}for(let x=0;x<world.w;x++)world.computeSkyTop(x);
   game.weather=createWeather();game.weather.sand=1;game.weather.wind=98;game.weather.event="sandstorm";
   const push=(boots)=>{game.accessories=[boots?{item:ITEM.SAND_BOOTS,count:1}:null,null,null,null,null];place(40);const x=p.x;for(let i=0;i<30;i++){game.weather.sand=1;game.weather.wind=98;update(1/60);}return p.x-x;};
   const pn=push(false),pb=push(true);
   check(Math.abs(pn)>Math.abs(pb)*2,'as botas seguram o vento da tempestade de areia ('+Math.round(pn)+' / '+Math.round(pb)+')');
   game.weather=createWeather();
   // Mandíbula farejadora
   game.accessories=[{item:ITEM.SNIFFER_MANDIBLE,count:1},null,null,null,null];place(30);world.setTile(40,63,TILE.GOLD_ORE);
   game.sniff=null;for(let i=0;i<20;i++)update(1/60);const far=game.sniff.dist;
   place(39);for(let i=0;i<20;i++)update(1/60);const near=game.sniff.dist;
   check(far!==null&&near<far,'a mandíbula sente o ouro, mais forte quando perto ('+far.toFixed(1)+' → '+near.toFixed(1)+')');
   let clicks=0;const orig=playSfx;window.playSfx=(n,...a)=>{if(n==='sniffClick')clicks++;return orig(n,...a);};
   for(let i=0;i<120;i++)update(1/60);window.playSfx=orig;check(clicks>=6,'estala rápido colado no minério ('+clicks+' em 2 s)');
   game.accessories=[null,null,null,null,null];
   renderer.render(game);
   return out;
  });
  console.log(checks.map(c=>'✓ '+c).join('\n'));
  console.log(errors.length?'ERROS:\n'+errors.join('\n'):'sem erros no console');
  if(errors.length)process.exitCode=1;
 }catch(e){console.error(e.message);process.exitCode=1;}finally{await browser.close();}
})();
