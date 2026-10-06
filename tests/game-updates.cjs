const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({channel:'msedge',headless:true});
  try {
    const page = await browser.newPage({viewport:{width:1280,height:800}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://localhost/jogo-teste/');
    await page.waitForFunction(()=>typeof game==='object' && typeof Menu==='object');
    const result=await page.evaluate(()=>{
      finishOpening(game);Menu.root.hidden=true;game.paused=true;
      const checks={};
      document.querySelector('[data-action="reveal"]').click();
      checks.map=game.map.revealed.every(v=>v===1)&&game.map.chunks.size===0;
      const mapCanvas=makeCanvas(world.w,world.h),mapCtx=mapCanvas.getContext('2d');
      game.map.drawTo(mapCtx,0,0,1,0,0,world.w,world.h);
      checks.chunk=game.map.chunks.size>0;
      const tileY=world.surface[4],mapPixel=mapCtx.getImageData(4,tileY,1,1).data;
      checks.mapActuallyDrawn=mapPixel[3]===255&&mapPixel[1]>30;
      // Regressão: arrastar para um chunk nunca visitado precisa desenhar no mesmo frame.
      const testWorld=new World(768,320,123,{lazy:true});testWorld.tiles.fill(TILE.STONE);testWorld.surface.fill(100);
      const testMap=new WorldMap(testWorld);testMap.revealAll();const target=makeCanvas(32,32),tc=target.getContext('2d');
      testMap.drawTo(tc,-600,-150,1,0,0,32,32);
      checks.unvisitedChunkVisible=tc.getImageData(5,5,1,1).data[3]===255;
      testWorld.setTile(605,155,TILE.SAND);testMap.drawTo(tc,-600,-150,1,0,0,32,32);
      const sandPixel=tc.getImageData(5,5,1,1).data;checks.revealedMapUpdates=sandPixel[0]>sandPixel[2];
      checks.lazyMap=testMap.chunks.size===1;
      const vision=document.querySelector('#admin-vision');vision.click();checks.vision=game.adminNightVision;
      renderer.render(game);vision.click();checks.visionOff=!game.adminNightVision;
      const search=document.querySelector('#admin-item-search');search.value='espada ferro';search.dispatchEvent(new Event('input'));
      checks.search=document.querySelectorAll('.adm-slot:not([hidden])').length===1;
      document.querySelector(`.adm-slot[data-id="${ITEM.METAL_SWORD}"]`).click();
      checks.damage=document.querySelector('#admin-item-detail').textContent.includes('Dano 9');
      const before=game.inventory.count(ITEM.METAL_SWORD);document.querySelector('[data-action="item"]').click();
      checks.items=game.inventory.count(ITEM.METAL_SWORD)>before;
      const fly=document.querySelector('#admin-fly');fly.click();game.paused=false;const oldY=player.y;
      input.keys.add('KeyW');update(1/60);input.keys.clear();checks.fly=player.y<oldY;fly.click();checks.flyOff=!game.adminFly;
      game.paused=true;
      checks.biomes=Object.values(BIOME).every(b=>{
        if(b===BIOME.OCEAN)return Object.values(AQUATIC).some(a=>a.habitat==='mar'&&!a.dano)&&Object.values(AQUATIC).some(a=>a.habitat==='mar'&&a.dano);
        const tx=4,old=world.biome[tx];world.biome[tx]=b;
        const good=wildlifePool(world,tx,false).length>0&&wildlifePool(world,tx,true).length>0;
        world.biome[tx]=old;return good;
      });
      checks.species=Object.keys(WILDLIFE).length;
      const terrestrial=Object.keys(WILDLIFE).filter(kind=>!WILDLIFE[kind].aquatic);
      checks.terrestrialSpecies=terrestrial.length;
      checks.aquaticSpecies=Object.keys(AQUATIC).length;
      const aquaticCanvas=makeCanvas(128,96),aquaticCtx=aquaticCanvas.getContext('2d');
      for(const kind of Object.keys(WILDLIFE)) {
        const m=new Wildlife(kind,player.x+50,player.y);game.mobs=[m];
        if(m.def.aquatic){m.variant=0;m.pulse=.5;m.tail=0;}
        for(let i=0;i<120;i++)m.update(1/60,world,player);
        if(!Number.isFinite(m.x+m.y))throw Error('Invalid movement: '+kind);
        if(m.def.aquatic){
          // Aquatic species have a separate renderer, including procedural jellyfish and puffers.
          for(let f=0;f<4;f++){
            aquaticCtx.clearRect(0,0,128,96);aquaticCtx.save();aquaticCtx.translate(64-m.cx,48-m.cy);
            m.tail=f;m.clock=f/4;drawAquatic(aquaticCtx,m);aquaticCtx.restore();
            if(!aquaticCtx.getImageData(0,0,128,96).data.some((v,i)=>i%4===3&&v>0))throw Error('Missing aquatic art: '+kind);
          }
        }else for(let f=0;f<14;f++)wildlifeSprite(kind,f);
        renderer.drawMobs([m]);
      }
      game.mobs=[];let spawned=0;checks.offscreen=true;
      for(let i=0;i<100;i++) {game.mobs=[];if(trySpawnMonster(game)){spawned++;checks.offscreen&&=mobOffScreen(game,game.mobs[0],0);}}
      checks.spawned=spawned;
      game.mobs=[];for(let i=0;i<20;i++)trySpawnPig(game,10,true);checks.passiveCap=game.mobs.length<=PIG.maximoNoMundo;
      const sounds=[],original=playSfx;playSfx=(name)=>sounds.push(name);
      const zombie=new Monster('undead',player.x,player.y);game.mobs=[zombie];game.time=.7;game.monsterTimer=999;player.invulnerable=0;
      updateHostiles(game,1/60);zombie.hit(100,player.cx);killMob(game,zombie);playSfx=original;
      checks.zombie=sounds.includes('zombieAttack')&&sounds.includes('zombieDeath');
      player.x=game.crashSite.x-player.w/2;player.y=game.crashSite.y-player.h-.01;player.stepOffset=0;
      game.mobs=[];game.intro.active=true;
      for(const t of [14,16,18,19.4,20,20.5,20.99,21,22]) {game.intro.t=t;renderer.render(game);}
      // Guarda uma prancha da sequência para inspecionar proporções e continuidade.
      const strip=document.createElement('canvas');strip.width=1200;strip.height=440;const ctx=strip.getContext('2d');ctx.fillStyle='#4b5557';ctx.fillRect(0,0,1200,440);ctx.imageSmoothingEnabled=false;
      [15.4,16.2,17.1,17.6,18.1,18.7,19.2,19.8,20.35,20.8,20.99,21].forEach((t,i)=>{const xx=i%6*200,yy=Math.floor(i/6)*220;ctx.fillStyle='#abb7ae';ctx.fillRect(xx,yy+198,200,1);ctx.fillText(t+' s',xx+10,yy+20);ctx.save();ctx.translate(xx+125,yy+198);ctx.scale(3,3);ctx.translate(-game.crashSite.x,-game.crashSite.y);game.intro.t=t;drawOpeningPlayer(ctx,game,{...renderer,ctx,drawPlayer:renderer.drawPlayer});ctx.restore();});
      checks.strip=strip.toDataURL();
      const sheetRows=Math.ceil(terrestrial.length/4),referenceY=sheetRows*470;
      const sheet=makeCanvas(1120,referenceY+260),sc=sheet.getContext('2d');sc.imageSmoothingEnabled=false;sc.fillStyle='#4b5557';sc.fillRect(0,0,sheet.width,sheet.height);
      terrestrial.forEach((kind,i)=>{const x=(i%4)*280,y=Math.floor(i/4)*470;sc.fillStyle='#f5e5be';sc.font='16px monospace';sc.fillText(WILDLIFE[kind].name,x+12,y+26);for(let f=0;f<3;f++){const sprite=wildlifeSprite(kind,[8,2,6][f]);sc.drawImage(sprite.normal,x+24,y+40+f*135,168,120);}});
      // Referências existentes na mesma escala (4x), sem esticar nenhum eixo.
      sc.drawImage(renderer.pigSprites.frames[8],40,referenceY+100,84,60);sc.drawImage(renderer.monsterSprites.undead.frames[13],230,referenceY+50,120,144);sc.drawImage(renderer.monsterSprites.bomber.frames[16],480,referenceY+50,120,144);
      const endFrames=[20.99,21].map(t=>{const c=makeCanvas(96,64),cx=c.getContext('2d');cx.translate(48-player.cx,63-game.crashSite.y);game.intro.t=t;drawOpeningPlayer(cx,game,{...renderer,ctx:cx,drawPlayer:renderer.drawPlayer});return cx.getImageData(0,0,96,64).data;});
      checks.wakeHandoff=endFrames[0].every((v,i)=>v===endFrames[1][i]);
      checks.art=sheet.toDataURL();
      const gallery=makeCanvas(960,sheetRows*210+10),gc=gallery.getContext('2d');gc.imageSmoothingEnabled=false;gc.fillStyle='#202a2e';gc.fillRect(0,0,gallery.width,gallery.height);
      terrestrial.forEach((kind,i)=>{const x=i%4*240,y=Math.floor(i/4)*210;gc.fillStyle='#b9c5b8';gc.font='14px monospace';gc.fillText(WILDLIFE[kind].name,x+16,y+24);gc.drawImage(wildlifeSprite(kind,8).normal,x+22,y+34,168,120);gc.fillStyle='#6e8584';gc.font='12px monospace';gc.fillText(BIOME_NAMES[WILDLIFE[kind].biome],x+16,y+182);});
      checks.gallery=gallery.toDataURL();
      // Busca do livro de receitas: acha sem acento, nao move o jogador e Esc so tira o foco
      const ui=game.inventoryUI;ui.toggleBook();ui.setSearchFocus(true);
      checks.searchTextMode=input.textMode===true;
      for(const k of ['t','a','b','u','a'])ui.typeKey({code:'Key'+k.toUpperCase(),key:k});
      checks.searchTyped=ui.search==='tabua';
      const found=ui.bookList();
      checks.searchFolded=found.length>0&&found.length<CRAFT_RECIPES.length&&found.every(r=>recipeSearchText(r).includes('tabua'));
      checks.searchEatsLetters=ui.typeKey({code:'KeyE',key:'e'})===true&&ui.typeKey({code:'F3',key:'F3'})===false;
      ui.setSearch('tabua');
      checks.searchEscBlurs=ui.typeKey({code:'Escape',key:'Escape'})===true&&!ui.searchFocus&&ui.craftOpen&&input.textMode===false;
      ui.searchClick(2);checks.searchCleared=ui.search===''&&ui.bookList().length===CRAFT_RECIPES.length;
      ui.close();
      // Diario: passar perto nao marca ninguem como conhecido; botao da tela e atalhos
      game.mapUI.open=false;ui.close();
      game.npcs=[new Villager({x:player.x+40,y:player.y+42,minX:0,maxX:99999,seed:.31,profession:1})];
      const near=game.npcs[0];near.y=player.y;
      drawNpcBubbles(renderer.ctx,game);npcPeek(near);npcQuestSummary(game);
      checks.journalNoGhosts=!near.services;
      NpcServices.open(game,near);checks.journalMeets=!!near.services;NpcServices.close();
      const jb=ui.journalBtnRect();
      checks.journalBtn=ui.hitTest(jb[0]+jb[2]/2,jb[1]+jb[3]/2)?.type==='journalBtn';
      ui.onMouseDown(0,jb[0]+jb[2]/2,jb[1]+jb[3]/2,false);
      checks.journalBtnOpens=game.npcOpen===true&&NpcServices.tab==='quests';
      NpcServices.setTab('people');checks.journalPeopleTab=NpcServices.dialog.textContent.includes('CaÃ§ador');
      NpcServices.close();
      const wasPaused=game.paused;game.paused=false;
      window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyC',key:'c',bubbles:true}));
      checks.craftKeyC=ui.open&&ui.craftOpen;
      window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyC',key:'c',bubbles:true}));
      window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyR',key:'r',bubbles:true}));
      checks.craftKeyRFree=!ui.open;
      game.paused=wasPaused;
      // Mobs: cacando desce o morro, passeando nao se joga em buraco fundo, slime cruza degraus
      const flat=(seed)=>{const tw=new World(120,80,seed,{lazy:true});tw.surface.fill(40);tw.biome.fill(0);tw.lootChests=[];tw.npcSpawns=[];for(let y=40;y<tw.h;y++)tw.tiles.fill(y===40?TILE.GRASS:TILE.DIRT,y*tw.w,(y+1)*tw.w);return tw;};
      const ledge=(alt)=>{const tw=flat(4242);for(let x=45;x<=60;x++)for(let y=40-alt;y<=39;y++)tw.setTile(x,y,TILE.STONE);return tw;};
      const runWolf=(tw,alt,aware)=>{const m=new Wildlife('wolf',52*T,0);m.y=(40-alt)*T-m.h-0.01;m.aware=aware;
        for(let i=0;i<500;i++){if(!aware){m.dir=-1;m.thinkTimer=99;m.pose=null;}m.update(1/60,tw,aware?{cx:38*T,cy:39*T}:{cx:9999,cy:0});}
        return m.cy>39*T;};
      checks.mobDescendsChasing=[1,2,3,5].every(a=>runWolf(ledge(a),a,true));
      checks.mobDescendsRoaming=[1,2,3].every(a=>runWolf(ledge(a),a,false));
      checks.mobAvoidsDeepDrop=!runWolf(ledge(5),5,false);
      const pit=flat(77);for(let x=30;x<=44;x++)for(let y=40;y<pit.h;y++)pit.setTile(x,y,TILE.AIR);
      const hunter=new Wildlife('wolf',52*T,0);hunter.y=40*T-hunter.h-0.01;hunter.aware=true;
      for(let i=0;i<500;i++)hunter.update(1/60,pit,{cx:40*T,cy:39*T});
      checks.mobAvoidsPit=hunter.cy<45*T&&hunter.cx>44*T;
      const slimeStep=(alt)=>{const sw=flat(99);for(let k=1;k<=alt;k++)sw.setTile(50,40-k,TILE.STONE);
        const s=new Monster('slime',44*T,0);s.y=40*T-s.h-0.01;
        for(let i=0;i<500;i++)s.update(1/60,sw,{cx:56*T,cy:(39-alt)*T});return s.cx>50*T;};
      checks.slimeClimbsSteps=slimeStep(1)&&slimeStep(2);
      // Fumaca: octogono, nao um quadradao (cantos vazios)
      const pc=makeCanvas(41,41),pctx=pc.getContext('2d');pctx.fillStyle='#fff';puffBlob(pctx,20,20,20);
      const pd=pctx.getImageData(0,0,41,41).data,solidAt=(x,y)=>pd[(y*41+x)*4+3]>0;
      checks.smokeIsRound=solidAt(20,20)&&solidAt(20,1)&&solidAt(1,20)&&!solidAt(2,2)&&!solidAt(38,38)&&!solidAt(2,38)&&!solidAt(38,2);
      // Tochas: em pe no chao, inclinadas na parede lateral, presas em tronco e na parede de fundo
      const tw2=flat(555);
      tw2.setTile(50,30,TILE.PLANKS);tw2.setTile(60,30,TILE.TRUNK);
      checks.torchFloor=torchSupport(tw2,45,39)===0;
      checks.torchRightWall=torchSupport(tw2,49,30)===1;
      checks.torchLeftWall=torchSupport(tw2,51,30)===-1;
      checks.torchOnTree=torchSupport(tw2,59,30)===1&&torchSupport(tw2,61,30)===-1;
      checks.torchNeedsSupport=torchSupport(tw2,45,30)===null;
      tw2.setWall(45,30,WALL.PLANKS);
      checks.torchOnBackWall=torchSupport(tw2,45,30)===0;
      checks.torchWallArt=!!renderer.tex.torchWall&&renderer.tex.torchWall.width===T;
      // Folhas: caem da copa com as cores da propria arvore
      for(let y=34;y<=39;y++)tw2.setTile(70,y,TILE.TRUNK);
      const leafGame={world:tw2,particles:[]};
      shedLeaves(leafGame,70,39,12);
      const leafPal=new Set(canopyLeafColors(canopyFor(70,tw2.biomeAt(70))));
      checks.leavesFall=leafGame.particles.length===12&&leafGame.particles.every(p=>p.leaf!==undefined);
      checks.leafColorsMatchTree=leafGame.particles.every(p=>leafPal.has(p.color));
      checks.leafPalettesDiffer=canopyLeafColors(DECOR.maples[0]).join()!==canopyLeafColors(DECOR.cypresses[0]).join();
      // Dia e noite: ciclo longo e amanhecer/entardecer de mais de um minuto cada
      let fullDay=0,fullNight=0;const DAY_STEPS=2000;
      for(let i=0;i<DAY_STEPS;i++){const l=daylightAt(i/DAY_STEPS);if(l>=1)fullDay++;else if(l<=0)fullNight++;}
      const twilight=(DAY_STEPS-fullDay-fullNight)/DAY_STEPS*DAY_LENGTH;
      checks.dayCycleLonger=DAY_LENGTH>=600&&twilight/2>60&&fullDay>DAY_STEPS*0.3&&fullNight>DAY_STEPS*0.3;
      // Folhas caindo sozinhas das arvores que estao na tela
      const leafWorld=flat(321);
      for(let y=34;y<=39;y++)leafWorld.setTile(48,y,TILE.TRUNK);
      const ambient={world:leafWorld,particles:[],cam:{x:44*T,y:30*T},zoom:4,weather:{rain:0}};
      let ambientTotal=0;const seenLeaf=new WeakSet();
      for(let i=0;i<900;i++){updateAmbientLeaves(ambient,1/60);for(const p of ambient.particles)if(!seenLeaf.has(p)){seenLeaf.add(p);ambientTotal++;}}
      const ambientPal=new Set(canopyLeafColors(canopyFor(48,leafWorld.biomeAt(48))));
      checks.ambientLeaves=ambientTotal>4&&ambient.particles.every(p=>p.leaf!==undefined&&p.spin>0&&ambientPal.has(p.color));
      // A folha pousa em cima do bloco em vez de atravessar o chao
      game.particles.length=0;
      const feetRow=Math.floor((player.y+player.h)/T); // o jogador esta sempre em pe em algo solido
      pushLeaf(game,player.cx,(feetRow-5)*T,'rgb(60,122,52)');
      const testLeaf=game.particles[game.particles.length-1];
      const leafPaused=game.paused;game.paused=false;
      for(let i=0;i<900&&!testLeaf.rest&&testLeaf.life>0;i++)update(1/60);
      game.paused=leafPaused;game.particles.length=0;
      checks.leafLandsOnGround=testLeaf.rest===true;
      // A tocha cola no tronco porque a casca deixa 4px de folga em cada lado do tile
      const trunkArt=renderer.tex.flat[TILE.TRUNK].getContext('2d').getImageData(0,0,T,T).data;
      let trunkMin=T,trunkMax=-1;
      for(let yy=0;yy<T;yy++)for(let xx=0;xx<T;xx++)if(trunkArt[(yy*T+xx)*4+3]>0){if(xx<trunkMin)trunkMin=xx;if(xx>trunkMax)trunkMax=xx;}
      checks.trunkInsetForTorch=trunkMin===4&&trunkMax===11&&TORCH_HOLDS.has(TILE.TRUNK);
      return checks;
    });
    const fs=require('node:fs');fs.writeFileSync('tests/wake-preview.png',Buffer.from(result.strip.split(',')[1],'base64'));delete result.strip;
    fs.writeFileSync('tests/wildlife-preview.png',Buffer.from(result.art.split(',')[1],'base64'));delete result.art;
    fs.writeFileSync('tests/wildlife-gallery.png',Buffer.from(result.gallery.split(',')[1],'base64'));delete result.gallery;
    for(const [key,value] of Object.entries(result))if(typeof value==='boolean')assert.equal(value,true,key);
    assert.ok(result.spawned>0);assert.ok(result.terrestrialSpecies>=8);assert.ok(result.aquaticSpecies>0);
    assert.equal(result.species,result.terrestrialSpecies+result.aquaticSpecies);assert.deepEqual(errors,[]);
    await page.evaluate(()=>{game.intro.active=false;game.adminOpen=false;game.paused=true;Menu.root.hidden=true;game.mapUI.openMap();renderer.render(game);});
    await page.screenshot({path:'tests/revealed-map-preview.png'});
    console.log(JSON.stringify(result,null,2));
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
