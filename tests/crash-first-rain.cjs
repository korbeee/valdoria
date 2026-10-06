const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>window.requestAnimationFrame=()=>0);
 await page.goto('http://localhost/jogo-teste/');await page.waitForFunction(()=>typeof game==='object');
 const checks=await page.evaluate(()=>{
  finishOpening(game);Menu.root.hidden=true;game.intro.active=false;
  const g=game,c=g.crashSite,w=g.world,checks=[],check=(v,label)=>{if(!v)throw Error(label);checks.push(label);};
  check(c.fires.length>0,'Destroços têm focos de incêndio');
  // Uma camada de pedra acima de cada foco reproduz a cobertura da ilha.
  for(const f of c.fires){const x=Math.floor(f.x/T),y=Math.max(1,Math.floor(f.y/T)-6);for(let dx=-2;dx<=2;dx++)w.setTile(x+dx,y,TILE.STONE);f.heat=1;f.douse=0;}
  g.weather=createWeather();g.weather.triggered=true;g.weather.timer=1000;
  for(let i=0;i<10;i++)updateWeather(g,.1);
  check(c.fires.every(f=>f.heat===1)&&!c.rainDousing,'Tempo seco antes da primeira chuva mantém o fogo');
  setWeatherEvent(g,'rain',1000);g.weather.rain=.65;
  check(c.fires.every(f=>weatherRainAt(g,f.x,f.y-4)===0),'Ilha bloqueia a chuva local em todos os focos');
  updateWeather(g,.1);
  check(c.rainDousing&&c.fires.every(f=>f.heat<1),'Primeira chuva inicia o apagamento mesmo sob a ilha');
  setWeatherEvent(g,'calm',1000);g.weather.rain=0;
  for(let i=0;i<600;i++)updateWeather(g,.1);
  check(c.firesOut&&c.fires.every(f=>f.heat===0),'Apagamento termina mesmo após a chuva parar');
  check(c.fires.every(f=>f.smolder>0),'Focos apagados deixam vapor residual');
  const final=c.fires.map(f=>f.heat);setWeatherEvent(g,'storm',1000);g.weather.rain=1;updateWeather(g,.1);
  check(c.fires.every((f,i)=>f.heat===final[i]),'Chuvas seguintes não reacendem o incêndio');
  check(c.fires.every(f=>weatherRainAt(g,f.x,f.y-4)===0),'Bloqueio normal de chuva pela ilha continua funcionando');
  return checks;
 });assert.deepEqual(errors,[]);console.log(checks.join('\n'));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
