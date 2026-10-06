const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
 const p=await b.newPage({viewport:{width:1600,height:850}}),errors=[];p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error'&&m.text().startsWith('[quadro]'))errors.push(m.text());});
 await p.addInitScript(()=>window.requestAnimationFrame=()=>0);await p.goto('http://localhost/jogo-teste/');await p.waitForFunction(()=>typeof game==='object');
 const result=await p.evaluate(async()=>{
  const checks=[],check=(v,label)=>{if(!v)throw Error(label);checks.push(label);};
  for(const seed of [11,777,2024]){
   await newWorld('pequeno',()=>{},seed);finishOpening(game);Menu.root.hidden=true;game.intro.active=false;
   const w=game.world,d=w.tigerDens[0],h=d?.habitat,t=game.mobs.find(m=>m.kind==='tiger');
   check(w.tigerDens.length===1&&!!h,'Um único bosque por mapa: '+seed);
   check(!!t&&t.sleeping&&!t.collides(w,t.x,t.y),'Tigre dorme livre sob a rocha: '+seed);
   check(Array.from({length:h.x1-h.x0+1},(_,i)=>w.biomeAt(h.x0+i)).every(b=>b===BIOME.FOREST),'Habitat tem bioma de floresta: '+seed);
   check(h.trees.length>=8&&h.trees.filter(tr=>w.getTile(tr.x,tr.ground-1)===TILE.TRUNK).length>=8,'Árvores reais preservadas: '+seed);
   check(game.mobs.filter(m=>m.habitatPrey).length===3,'Cervos e javali povoam clareiras: '+seed);
   check(!w.hasWater(h.denX,h.floor-1)&&w.isSolid(h.denX,h.floor),'Descanso seco acima da água: '+seed);
   const before=w.water.reduce((a,v)=>a+(v<=16?v:0),0);for(let i=0;i<120;i++)w.stepWater();
   check(w.hasWater(h.pond[0]+4,h.floor+2)&&w.hasWater(h.stream[0]+3,h.floor),'Lagoa e riacho retêm água: '+seed);
   check(w.water.reduce((a,v)=>a+(v<=16?v:0),0)===before,'Habitat não perde água pela base: '+seed);
   // Entrada do abrigo e corredor junto à cama admitem o corpo do tigre.
   for(let x=h.denX-4;x<=h.shelter[1];x++)check(!t.collides(w,x*T,h.floor*T-t.h-.01),'Abrigo tem passagem livre: '+seed+' / '+x);
   check(!!w.story?.tiger&&w.story.tiger.mirrors.length===4,'Ligação com a história permanece: '+seed);
  }
  const w=game.world,h=w.tigerDens[0].habitat,t=game.mobs.find(m=>m.kind==='tiger'),cv=renderer.canvas;
  cv.width=1600;cv.height=850;game.zoom=1;game.cam.x=(h.x0-2)*T;game.cam.y=(h.floor-31)*T;
  game.player.x=(h.denX+18)*T;game.player.y=h.floor*T-game.player.h-.01;game.showHelp=false;game.adminNightVision=true;game.time=.3;
  w.computeLight(Math.floor((game.cam.x+800)/T),h.floor-10);renderer.bg=null;renderer.render(game);const shot=cv.toDataURL();
  game.adminGod=true;t.sleeping=false;t.aware=true;tigerState(t,'hunt');game.boss=t;
  const states=new Set();for(let i=0;i<600;i++){t.update(1/60,w,game.player);states.add(t.state);}
  check(states.size>=3&&!t.collides(w,t.x,t.y),'Tigre circula e usa ataques no bosque');
  return {checks,shot};
 });assert.deepEqual(errors,[]);fs.writeFileSync('tests/tiger-habitat.png',Buffer.from(result.shot.split(',')[1],'base64'));console.log(result.checks.length+' verificações passaram.');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
