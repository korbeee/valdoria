const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try {
    const page=await browser.newPage({viewport:{width:1280,height:760}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;});
    await page.goto('http://localhost/jogo-teste/');await page.waitForFunction(()=>typeof game==='object');
    const r=await page.evaluate(()=>{
      finishOpening(game);Menu.root.hidden=true;game.paused=false;game.intro.active=false;
      const checks=[], check=(ok,msg)=>{if(!ok)throw Error(msg);checks.push(msg);};
      const w=new World(1600,480,20260924);world=game.world=w;game.map=new WorldMap(w);renderer.bg=null;
      game.mobs=[];game.npcs=[];game.boss=null;game.drops=[];game.particles=[];game.adminGod=true;
      game.inventoryUI.open=false;game.mapUI.open=false;game.mobSpawnTimer=9999;
      game.time=.24;game.daylight=1;GAME_OPTIONS.shake=false;
      const l=w.bearLairs[0],h=l.habitat,p=game.player,m=spawnBearBoss(game,l);
      const [a,b,c,floor]=l.bounds;
      check(h?.version===2,'Habitat novo gerado');
      check(new Set(h.roof).size>=4,'Teto irregular da gruta');
      check(floor-w.surface[h.center]>=40,'Montanha tem altura suficiente para abrigar a gruta');
      check(h.roof.every((roof,i)=>[1,2,3,4].every(k=>!w.isSolid(a+i,floor-k))),'Chão da arena livre para lutar');
      check(l.shaft.every(([x,y])=>!w.isSolid(x,y)&&!w.water[y*w.w+x]),'Entrada e corredor secos e livres');
      const put=(x)=>{p.x=x-p.w/2;p.y=floor*T-p.h-.01;p.vx=p.vy=0;p.onGround=true;};
      put((h.mouth[0]+h.side*3)*T);
      for(let i=0;i<240;i++)m.update(1/60,w,p,game);
      check(m.sleeping&&m.state==='sleep','Urso hiberna enquanto jogador está do lado de fora');
      check(m.damage===0&&!game.boss,'Hibernação não inicia combate');
      const art=bearHabitatArt(w,l);check(art===bearHabitatArt(w,l),'Cenário estático usa cache');
      check(bearHabitatMaterial(w,a-1,b-1,TILE.BEDROCK)===TILE.STONE,'Casca tem aparência de rocha natural');
      const render=(zoom,x,y)=>{game.zoom=zoom;game.cam.x=x-1280/(2*zoom);game.cam.y=y-760/(2*zoom);w.computeLight(Math.floor(x/T),Math.floor(y/T));w.composeLight(1);renderer.render(game);return canvas.toDataURL();};
      const mountain=render(.5,h.center*T,(floor-21)*T);
      const sleeping=render(1.15,(a+c+1)/2*T,(floor-9)*T);
      // Percorre a galeria a pé, usando a física do jogo, sem teleporte até a arena.
      const key=h.side<0?'KeyD':'KeyA';input.keys.add(key);
      let entered=false;
      for(let i=0;i<1000&&!entered;i++){update(1/60);entered=m.state==='wake';}
      input.keys.delete(key);
      check(entered,'Jogador alcança a sala andando pela entrada lateral');
      check(!m.sleeping&&game.boss===m,'Chegada desperta o urso');
      check(l.door.every(([x,y])=>w.isSolid(x,y)),'Passagem fecha ao começar a luta');
      check(!l.door.some(([x,y])=>p.x<(x+1)*T&&p.x+p.w>x*T&&p.y<(y+1)*T&&p.y+p.h>y*T),'Fechamento não prende o jogador');
      check(m.damage===0,'Despertar oferece tempo antes dos ataques');
      const wake=render(1.15,(a+c+1)/2*T,(floor-9)*T);
      bearGoHome(game,m);
      check(m.sleeping&&l.door.every(([x,y])=>!w.isSolid(x,y)),'Reinício devolve hibernação e reabre entrada');
      const sides=new Set([h.side]);
      for(const seed of [4242,112233,98765]) {
        const other=new World(1600,480,seed),den=other.bearLairs[0];
        check(!!den?.habitat,'Montanha presente na semente '+seed);
        sides.add(den.habitat.side);
        check(den.shaft.every(([x,y])=>!other.isSolid(x,y)&&!other.water[y*other.w+x]),'Galeria seca na semente '+seed);
        const [aa,bb,cc,dd]=den.bounds;
        check(Array.from({length:cc-aa+1},(_,i)=>aa+i).every(x=>Array.from({length:dd-bb},(_,i)=>bb+i).every(y=>!other.water[y*other.w+x])),'Hibernação em chão seco na semente '+seed);
        // Caminho do tamanho do personagem desde a boca até a sala, em ambos os sentidos.
        const from=den.habitat.approach[0];
        let last=null;
        for(let x=from;den.habitat.side<0?x<=aa:x>=cc;x-=den.habitat.side) {
          let ground=dd;
          if(Math.abs(x-den.habitat.center)>72) ground=other.surface[x];
          if(![1,2,3].every(k=>!other.isSolid(x,ground-k)))throw Error('Passagem bloqueada '+seed+' / '+x);
          if(last!==null&&Math.abs(ground-last)>1)throw Error('Rampa íngreme '+seed+' / '+x+' / '+last+' → '+ground);
          last=ground;
        }
        checks.push('Passagem e rampa transitáveis na semente '+seed);
      }
      check(sides.size===2,'Entrada validada dos dois lados da montanha');
      return {checks,mountain,sleeping,wake,metadata:{center:h.center,side:h.side,floor}};
    });
    assert.deepEqual(errors,[]);
    for(const name of ['mountain','sleeping','wake'])fs.writeFileSync(`tests/bear-habitat-${name}.png`,Buffer.from(r[name].split(',')[1],'base64'));
    fs.writeFileSync('tests/bear-habitat-preview.html','<!doctype html><meta charset="utf-8"><title>Gruta do Patriarca</title><style>body{margin:0;padding:28px;background:#15201b;color:#e3d5b6;font:18px system-ui}h1{margin-bottom:6px}p{color:#a3b198}img{display:block;width:100%;max-width:1280px;border-radius:12px;margin:20px 0}a{color:#d0be85}</style><h1>Gruta do Patriarca</h1><p>Uma caverna na montanha. O urso hiberna até você chegar.</p><h2>A montanha e a entrada</h2><img src="bear-habitat-mountain.png"><h2>Hibernação</h2><img src="bear-habitat-sleeping.png"><h2>A chegada desperta Bramido</h2><img src="bear-habitat-wake.png">');
    console.log(r.checks.join('\n'));console.log(r.metadata);
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
