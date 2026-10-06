const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
 const p=await b.newPage({viewport:{width:1280,height:720}}),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error'&&m.text().startsWith('[quadro]'))errors.push(m.text());});
 await p.addInitScript(()=>window.requestAnimationFrame=()=>0);await p.goto('http://localhost/jogo-teste/');await p.waitForFunction(()=>typeof game==='object');
 const result=await p.evaluate(async()=>{
  const checks=[],check=(v,label)=>{if(!v)throw Error(label);checks.push(label);};
  for(const seed of [11,4242,2024]){
    await newWorld('pequeno',()=>{},seed);finishOpening(game);Menu.root.hidden=true;game.intro.active=false;
    const w=game.world,n=w.spiderNests[0],m=game.mobs.find(m=>m.kind==='fiandeira');
    check(w.spiderNests.length===1&&!!n.habitat,'Um ninho temático por mapa: '+seed);
    check(!!m&&!m.collides(w,m.x,m.y),'Matriarca nasce livre no teto: '+seed);
    const [x0,y0,x1,last]=n.bounds;let silk=0,beams=0,caps=0,webs=0;
    for(let y=y0;y<=last;y++)for(let x=x0;x<=x1;x++){const t=w.getTile(x,y);if(t===TILE.SILK_LEDGE)silk++;if(t===TILE.CARVED_BEAM)beams++;if(t===TILE.NEST_GLOW_CAP)caps++;if(t===TILE.COBWEB)webs++;}
    check(silk>25&&TILE_DEFS[TILE.SILK_LEDGE].plataforma,'Prateleiras de seda mantêm colisão de plataforma: '+seed);
    check(beams===0&&caps>=6&&webs>=16,'Câmara usa teias e luz natural: '+seed);
    check(n.habitat.cocoons.length===7&&n.habitat.eggs.length===9,'Berçário e casulos suspensos: '+seed);
    check(n.door.every(([x,y])=>!w.isSolid(x,y)),'Entrada desobstruída: '+seed);
    const shaft=new Map(n.shaft.map(([x,y,t])=>[x+','+y,[x,y,t]]));
    const mismatch=[...shaft.values()].filter(([x,y,t])=>w.getTile(x,y)!==t);
    check(mismatch.length===0,'Poço preservado após geração das poças: '+seed+' '+JSON.stringify(mismatch.slice(0,8)));
    check(!!w.story.spider&&w.story.spider.threads.length===3,'Gaiola e fios da história preservados: '+seed);
    check(w.lootChests.filter(c=>c.x>=x0&&c.x<=x1&&c.y>=y0&&c.y<=last).length>=2,'Espólio da expedição acessível: '+seed);
  }
  const w=game.world,n=w.spiderNests[0],m=game.mobs.find(m=>m.kind==='fiandeira'),[a,b,c,d]=n.bounds;
  game.player.x=(Math.round((a+c)/2))*T;game.player.y=n.floorY-game.player.h-.01;game.cam.x=(a-3)*T;game.cam.y=(b-5)*T;game.zoom=1.5;game.showHelp=false;game.time=.3;game.adminGod=true;game.adminNightVision=true;
  renderer.drawUI=()=>{};renderer.drawObjective=()=>{};renderer.drawCursor=()=>{};game.inventoryUI.drawVitals=()=>{};
  w.computeLight(Math.round((a+c)/2),Math.round((b+d)/2));renderer.bg=null;renderer.render(game);const shot=renderer.canvas.toDataURL();
  game.adminNightVision=false;w.computeLight(Math.round((a+c)/2),Math.round((b+d)/2));renderer.render(game);const lit=renderer.canvas.toDataURL();
  game.tigerSlain=true;
  const states=new Set();for(let i=0;i<900;i++){m.update(1/60,w,game.player);states.add(m.state);}
  check(states.size>=3&&!m.collides(w,m.x,m.y),'Matriarca acorda e usa ataques sem ficar presa');
  return {checks,shot,lit};
 });assert.deepEqual(errors,[]);for(const [key,name] of [['shot','spider-habitat'],['lit','spider-habitat-light']])fs.writeFileSync('tests/'+name+'.png',Buffer.from(result[key].split(',')[1],'base64'));console.log(result.checks.length+' verificações passaram.');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
