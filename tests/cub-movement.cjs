const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'playwright');const assert=require('assert/strict');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{const p=await b.newPage();await p.addInitScript(()=>window.requestAnimationFrame=()=>1);await p.goto('http://localhost/jogo-teste/');await p.waitForFunction(()=>typeof game==='object');const r=await p.evaluate(()=>{
 const w=new World(240,50,1,{lazy:true});for(let x=0;x<w.w;x++)w.setTile(x,30,TILE.STONE);
 const player=new Body(20*T,30*T-42,20,42),g={world:w,player,accessories:[{item:ITEM.CUB_SPIRIT}]};player.facing=1;
 updateCubSpirit(g,1/60);const c=g.cub,checks={spawnClear:!!c&&!c.collides(w,c.x,c.y)};
 for(let y=20;y<30;y++)w.setTile(24,y,TILE.STONE);player.x=28*T;
 for(let i=0;i<300;i++)updateCubSpirit(g,1/60);
 checks.wallStopsPet=c.x+c.w<=24*T;checks.notInsideWall=!c.collides(w,c.x,c.y);
 const oldY=c.y;player.y-=100;for(let i=0;i<30;i++)updateCubSpirit(g,1/60);checks.playerJumpDoesNotLiftPet=Math.abs(c.y-oldY)<7;
 updateCubSpirit(g,.6);checks.slowFrameStillBlocked=c.x+c.w<=24*T;
 for(let y=20;y<30;y++)w.setTile(24,y,TILE.AIR);w.setTile(24,29,TILE.STONE);player.y=30*T-42;
 let climbed=false;for(let i=0;i<240;i++){updateCubSpirit(g,1/60);if(c.y<oldY-8)climbed=true;}checks.climbsStep=climbed;checks.followsAfterOpening=c.cx>25*T;
 player.x=160*T;updateCubSpirit(g,1/60);checks.farTeleport=Math.abs(c.cx-player.cx)<8*T&&!c.collides(w,c.x,c.y);
 // Nenhum local de chegada livre: mantém o pet no lugar, sem entrar em pedra.
 const before=c.x;player.x=40*T;for(let y=20;y<38;y++)for(let x=30;x<50;x++)w.setTile(x,y,TILE.STONE);
 updateCubSpirit(g,1/60);checks.noUnsafeTeleport=Math.abs(c.x-before)<4;
 checks.floatsAboveFloor=c.y+c.h<30*T;
 return checks;
 });console.log(r);for(const [k,v]of Object.entries(r))assert.equal(v,true,k);}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
