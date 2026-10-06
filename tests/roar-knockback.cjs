const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'playwright');const assert=require('assert/strict');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{const p=await b.newPage();await p.addInitScript(()=>window.requestAnimationFrame=()=>1);await p.goto('http://localhost/jogo-teste/');await p.waitForFunction(()=>typeof game==='object');const r=await p.evaluate(()=>{
 const w=new World(100,50,1,{lazy:true});for(let x=0;x<100;x++)w.setTile(x,30,TILE.STONE);
 const player=new Body(40*T,30*T-42,20,42);player.facing=1;
 const mobs=['wolf','rabbit','hyena'].map((k,i)=>new Wildlife(k,player.cx+(i%2?-60:60),30*T-25));
 const g={player,world:w,mobs,clock:100,particles:[],accessories:[{item:ITEM.BOTTLED_ROAR,count:1}]};const before=mobs.map(m=>({x:m.cx,hp:m.hp}));useBottledRoar(g);
 for(let i=0;i<18;i++)for(const m of mobs){if(!updateRoarKnockback(m,1/60,w))m.update(1/60,w,player);}
 const checks={pushPersists:mobs.every((m,i)=>Math.abs(m.cx-player.cx)>Math.abs(before[i].x-player.cx)+50),noDamage:mobs.every((m,i)=>m.hp===before[i].hp),cooldown:g.roarReady===130};
 const m=mobs[0];for(let y=20;y<30;y++)w.setTile(Math.floor((m.x+m.w)/T)+1,y,TILE.STONE);const wall=(Math.floor((m.x+m.w)/T)+1)*T;m.roarKnockback=.48;m.vx=420;for(let i=0;i<30;i++)updateRoarKnockback(m,1/60,w);checks.wallStopsKnockback=m.x+m.w<=wall+.1;checks.expires=m.roarKnockback===0;return checks;
});console.log(r);for(const [k,v]of Object.entries(r))assert.equal(v,true,k);}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
