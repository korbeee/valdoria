'use strict';

const RAIN_HOUR=14,RAIN_DURATION=60; // Keep the opening's first fire-extinguishing shower.
const hourOf=time=>((time+.25)%1)*24;
// Clima em CAMADAS: cada fenômeno é uma mistura de chuva, vento, raios, tornado, granizo, neblina e
// areia (0..1; o vento em km/h de jogo). As camadas se somam: vendaval + chuva + raios + tornado é
// uma Supercélula. Os efeitos de cada camada estão em js/weather-plus.js.
const WEATHER_LAYERS=['rain','wind','lightning','tornado','hail','fog','sand'];
const WEATHER_TYPES={
  calm:{wind:10},breeze:{wind:28},wind:{wind:78},
  drizzle:{rain:.25,wind:24},rain:{rain:.65,wind:43},storm:{rain:1,wind:87,lightning:1},
  sandstorm:{sand:1,wind:98},tornado:{rain:.55,wind:60,tornado:1},
  snow:{rain:.45,wind:28},blizzard:{rain:1,wind:110},
  // combinações
  supercell:{rain:.9,wind:95,lightning:1,tornado:1,hail:.5},
  hail:{rain:.6,wind:50,hail:1,lightning:.35},
  dryLightning:{wind:82,lightning:.85},
  fog:{wind:6,fog:1},
  drizzleFog:{rain:.25,wind:12,fog:.7},
  dustDevil:{sand:.7,wind:75,tornado:1},
  thundersnow:{rain:.85,wind:80,lightning:.7},
};
const WEATHER_EXTREME=new Set(['storm','sandstorm','tornado','blizzard','supercell','hail','dustDevil','thundersnow']);
// Nomes dos fenômenos para a interface (painel de admin, js/admin.js)
const WEATHER_NAMES={calm:'Tempo limpo',breeze:'Brisa',wind:'Vendaval',drizzle:'Garoa',
  rain:'Chuva',storm:'Tempestade com raios',sandstorm:'Tempestade de areia',tornado:'Tornado',snow:'Neve',blizzard:'Nevasca forte',
  supercell:'Supercélula (vendaval + chuva + raios + tornado)',hail:'Chuva de granizo',dryLightning:'Raios secos com vendaval',
  fog:'Neblina',drizzleFog:'Garoa com neblina',dustDevil:'Redemoinho de areia',thundersnow:'Nevasca com raios'};
// Nome curto de cada camada (o letreiro junta as que estão ativas)
const WEATHER_LAYER_NAMES={rain:'Chuva',wind:'Vendaval',lightning:'Raios',tornado:'Tornado',hail:'Granizo',fog:'Neblina',sand:'Areia'};
function weatherMixOf(type,intensity=1){
  const t=WEATHER_TYPES[type],m={};
  for(const k of WEATHER_LAYERS)m[k]=k==='wind'?(t.wind||0):(t[k]||0)*clamp(intensity,0,1);
  return m;
}
function createWeather(){return {rain:0,sand:0,wind:8,targetWind:8,event:'calm',intensity:1,timer:90,triggered:false,
  mix:weatherMixOf('calm'),lightning:0,hail:0,fog:0,tornadoLevel:0,
  exposure:1,drops:[],sandParticles:[],splashes:[],thunder:10,flash:0,clock:0,extremeCooldown:0,funnel:null};}
// Rótulo do clima atual: "Vendaval + Chuva + Raios + Tornado"
function weatherLabel(w){
  if(!w)return '';
  const m=w.mix||{},on=[];
  if((m.wind||0)>=60)on.push(WEATHER_LAYER_NAMES.wind);
  for(const k of ['rain','lightning','tornado','hail','fog','sand'])if((m[k]||0)>.05)on.push(WEATHER_LAYER_NAMES[k]);
  return on.length?on.join(' + '):(WEATHER_NAMES[w.event]||'Tempo limpo');
}
function setWeatherEvent(g,type,duration,intensity=1){
  if(!WEATHER_TYPES[type])throw Error('Unknown weather: '+type);
  const w=g.weather??=createWeather();w.event=type;w.serial=(w.serial||0)+1;w.timer=duration??(ENVIRONMENT.weather.durationMin+Math.random()*(ENVIRONMENT.weather.durationMax-ENVIRONMENT.weather.durationMin));
  w.intensity=clamp(intensity,0,1);w.mix=weatherMixOf(type,w.intensity);
  w.targetWind=w.mix.wind*(Math.random()<.5?-1:1)*w.intensity;
  if(WEATHER_EXTREME.has(type))w.extremeCooldown=ENVIRONMENT.weather.extremeCooldown;
  if(w.mix.tornado>0)spawnWeatherFunnel(g);
  if(typeof weatherAnnounce==='function')weatherAnnounce(g);
}
// Soma as camadas de outro fenômeno às que já estão no céu (o mais forte de cada camada vence)
function addWeatherLayers(g,type,duration,intensity=1){
  if(!WEATHER_TYPES[type])throw Error('Unknown weather: '+type);
  const w=g.weather??=createWeather(),add=weatherMixOf(type,intensity);
  for(const k of WEATHER_LAYERS)w.mix[k]=Math.max(w.mix[k]||0,add[k]);
  w.intensity=Math.max(w.intensity,clamp(intensity,0,1));
  w.targetWind=(Math.sign(w.targetWind)||1)*Math.max(Math.abs(w.targetWind),add.wind*clamp(intensity,0,1));
  if(w.event==='calm')w.event=type;w.serial=(w.serial||0)+1;
  w.timer=Math.max(w.timer,duration??60);
  if(add.tornado>0&&!w.funnel)spawnWeatherFunnel(g);
  if(typeof weatherAnnounce==='function')weatherAnnounce(g);
}
// Onde o funil toca o chão: na superfície da água se há mar, lago ou rio embaixo (tromba d'água), senão no relevo
function funnelBase(world,tx){
  tx=clamp(tx|0,0,world.w-1);
  // mar: a superfície é o nível do mar, sem depender de alga, mastro de navio ou recife no caminho do céu
  if(world.oceanStart<world.w&&tx>=world.oceanStart-60){
    const sea=world.seaLevel;
    if(world.hasWater(tx,sea)){const s=world.waterSurfacePx(tx,sea);if(s!=null)return {y:s,water:true};}
  }
  let y=world.skyTop[tx]-1;
  if(y>0&&world.hasWater(tx,y)){while(y>0&&world.hasWater(tx,y-1))y--;const s=world.waterSurfacePx(tx,y);if(s!=null)return {y:s,water:true};}
  return {y:world.groundTop(tx)*T,water:false};
}
// O funil nasce de lado, a uma distância do jogador, em céu aberto
function spawnWeatherFunnel(g){
  const w=g.weather,dir=Math.random()<.5?-1:1;
  const x=clamp(g.player.cx+dir*(110+Math.random()*160),T*5,(g.world.w-5)*T),tx=Math.floor(x/T);
  w.funnel={x,y:funnelBase(g.world,tx).y,height:180,radius:65,strength:0,age:0,vx:-dir*20,seed:Math.random()*1000};
}
function chooseWeather(g){
  const w=g.weather,b=g.world.biomeAt(Math.floor(g.player.cx/T));
  if(w.event!=='calm'){setWeatherEvent(g,'calm',ENVIRONMENT.weather.calmMin+Math.random()*(ENVIRONMENT.weather.calmMax-ENVIRONMENT.weather.calmMin));return;}
  const ex=w.extremeCooldown<=0;
  if(ex&&[BIOME.FOREST,BIOME.SAVANNA,BIOME.DESERT,BIOME.MESA,BIOME.OCEAN].includes(b)&&Math.random()<ENVIRONMENT.weather.tornadoChance){setWeatherEvent(g,b===BIOME.DESERT||b===BIOME.MESA?'dustDevil':'tornado',30+Math.random()*25);return;}
  const choices=b===BIOME.MESA?[['breeze',40],['wind',30],['dryLightning',ex?8:0],['dustDevil',ex?6:0],['fog',4]]:
    b===BIOME.SWAMP?[['breeze',14],['fog',24],['drizzleFog',22],['drizzle',18],['rain',14],['storm',ex?4:0]]:
    b===BIOME.DESERT?[['breeze',42],['wind',32],['dryLightning',ex?7:0],['sandstorm',ex?15:0],['dustDevil',ex?4:0]]:
    b===BIOME.SNOW?[['breeze',26],['wind',18],['fog',8],['snow',30],['blizzard',ex?12:0],['thundersnow',ex?6:0]]:
    [['breeze',24],['wind',13],['fog',6],['drizzleFog',6],['drizzle',20],['rain',19],['storm',ex?7:0],['hail',ex?3:0],['dryLightning',ex?2:0],
      ['supercell',ex&&(b===BIOME.FOREST||b===BIOME.SAVANNA||b===BIOME.JUNGLE)?2:0]];
  let r=Math.random()*choices.reduce((n,a)=>n+a[1],0);for(const [type,weight]of choices){r-=weight;if(r<=0){setWeatherEvent(g,type);break;}}
}
// lit = vale também embaixo das ilhas do céu (js/sky-world.js): ali não cai gota, mas o véu da
// chuva e o clarão do relâmpago chegam, senão fica uma faixa escura com borda reta no chão
function weatherRainAt(g,x,y,lit=false){
  const tx=Math.floor(x/T),dry=biome=>biome===BIOME.DESERT||biome===BIOME.SNOW||biome===BIOME.MESA;
  if(dry(g.world.biomeAt(tx))||!(lit?weatherLit(g.world,x,y):weatherExposed(g.world,x,y)))return 0;
  let edge=7;for(let d=1;d<=6;d++)if(dry(g.world.biomeAt(tx-d))||dry(g.world.biomeAt(tx+d))){edge=d;break;}
  return (g.weather?.rain||0)*smoothstep(clamp(edge/7,0,1));
}
function weatherSandAt(g,x,y,lit=false){return (g.weather?.sand||0)*desertWeight(g.world,x)*((lit?weatherLit(g.world,x,y):weatherExposed(g.world,x,y))?1:0);}
function spawnWeatherParticle(g,sand){
  const W=canvas.width/g.zoom,H=canvas.height/g.zoom,x=g.cam.x+Math.random()*W,y=g.cam.y+Math.random()*H;
  if(!(sand?weatherSandAt(g,x,y):weatherRainAt(g,x,y)))return null;
  if(!sand&&g.world.waterAtPx(x,y))return null; // chuva não nasce embaixo d'água
  return {x,y,speed:240+Math.random()*190,len:5+Math.random()*7,life:2+Math.random()*3};
}
// A gota chegou na água: respingo com gotículas na superfície (e, às vezes, um anel que se abre, js/water-waves.js)
function rainHitsWater(g,x,y){
  const w=g.weather,tx=Math.floor(x/T),surf=g.world.waterSurfacePx(tx,Math.floor(y/T));if(surf==null)return;
  if(Math.random()<.55&&w.splashes.length<110)w.splashes.push({x,y:surf,life:.32,water:true,hit:true});
  if(Math.random()<.18){const list=g.rainRings??=[];if(list.length<70)list.push({x,y:surf,t:0,life:.5+Math.random()*.3,r:3+Math.random()*4});}
}
// A gota bateu em terra, pedra, folhagem ou telhado: mini respingo na superfície (só uma parte das gotas, para não poluir)
function rainHitsGround(g,x,y){
  const w=g.weather,world=g.world;if(Math.random()>.32||w.splashes.length>=150)return;
  const tx=Math.floor(x/T);
  for(let ty=Math.floor(y/T);ty<=Math.floor(y/T)+2;ty++){
    if(!world.isSolid(tx,ty)||world.isSolid(tx,ty-1)||world.hasWater(tx,ty-1))continue;
    if(g.cam&&(x<g.cam.x-20||x>g.cam.x+canvas.width/g.zoom+20))return;
    w.splashes.push({x,y:ty*T,life:.4,max:.4,water:false,ground:true,seed:Math.random()});return;
  }
}
function updateWeather(g,dt){
  setWeatherView(g); // ilhas do céu fora da tela não seguram o tempo (js/environment.js)
  const w=g.weather??=createWeather(),cfg=ENVIRONMENT.weather;w.clock+=dt;w.timer-=dt;w.extremeCooldown=Math.max(0,w.extremeCooldown-dt);
  // g.adminFreezeWeather: o painel de admin travou o fenômeno para dar tempo de testar
  if(g.adminFreezeWeather){}
  else if(g.openingComplete&&!w.triggered&&hourOf(g.time)>=RAIN_HOUR&&hourOf(g.time)<23){w.triggered=true;setWeatherEvent(g,'rain',RAIN_DURATION);}
  else if(w.timer<=0&&!g.intro?.active)chooseWeather(g);
  const m=w.mix??=weatherMixOf(WEATHER_TYPES[w.event]?w.event:'calm',w.intensity),k=1-Math.exp(-dt/Math.max(1,cfg.transition/3));
  w.rain+=((m.rain||0)-w.rain)*k;
  w.sand+=((m.sand||0)-w.sand)*k;
  w.lightning=(w.lightning||0)+((m.lightning||0)-(w.lightning||0))*k;w.hail=(w.hail||0)+((m.hail||0)-(w.hail||0))*k;w.fog=(w.fog||0)+((m.fog||0)-(w.fog||0))*k*.6;
  w.wind+=(w.targetWind-w.wind)*(1-Math.exp(-dt/6));w.flash=Math.max(0,w.flash-dt*2.5);
  const exposure=environmentExposure(g.world,g.player.cx,g.player.y+2);w.exposure+=(exposure-w.exposure)*(1-Math.exp(-dt*2));
  if(w.rain>.4||g.crashSite?.rainDousing)douseFires(g,dt);
  if(w.lightning>.3){
    if((w.thunder-=dt)<=0){w.thunder=(12+Math.random()*22)/(.5+w.lightning*1.6);w.flash=1;
      if(typeof weatherLightning==='function')weatherLightning(g); // às vezes o raio cai perto (js/weather-plus.js)
      // Metres represented by this audio distance are independent of tile scale.
      const distance=220+Math.random()*1100;w.lastThunderDelay=distance/343;
      g.crashAudio?.thunder(w.lastThunderDelay,(.35+Math.random()*.35)*(.08+.92*w.exposure));
    }
  }
  if(g.crashAudio){const biome=g.world.biomeAt(Math.floor(g.player.cx/T));
    const level=biome===BIOME.DESERT||biome===BIOME.SNOW?0:weatherRainAt(g,g.player.cx,g.player.cy)||w.rain*(.04+.12*w.exposure);
    g.crashAudio.setRain(level,w.exposure);g.crashAudio.rainTick(dt,level*w.exposure);}
  if(w.funnel){const f=w.funnel;f.age+=dt;const target=(m.tornado||0)>0&&w.timer>7?1:0;
    f.strength+=(target-f.strength)*(1-Math.exp(-dt/4));
    if(typeof updateTornado==='function')updateTornado(g,f,dt); // anda, puxa, arremessa e derruba (js/weather-plus.js)
    else f.x=clamp(f.x+w.wind*.025*dt,T*4,(g.world.w-4)*T);
    const base=funnelBase(g.world,Math.floor(f.x/T));f.water=base.water;f.y+=(base.y-f.y)*(1-Math.exp(-dt*2));
    if(!target&&f.strength<.003)w.funnel=null;
  }
  w.tornadoLevel=w.funnel?.strength||0;
  const area=canvas.width*canvas.height,counts=[Math.min(cfg.dropLimit,Math.ceil(area/2100*w.rain)),Math.min(cfg.sandLimit,Math.ceil(area/5000*w.sand))];
  for(let mode=0;mode<2;mode++){
    const list=mode?w.sandParticles:w.drops,target=counts[mode];
    if(list.length>target)list.length=target;
    for(let n=Math.min(16,target-list.length);n>0;n--){const p=spawnWeatherParticle(g,!!mode);if(p)list.push(p);}
    for(let i=list.length-1;i>=0;i--){const p=list[i],v=environmentWind(g,p.x,p.y),vx=mode?v.x*1.9:v.x*.85,vy=mode?Math.sin(w.clock+p.x*.02)*9+v.y:p.speed;
      const nx=p.x+vx*dt,ny=p.y+vy*dt,steps=Math.max(1,Math.ceil(Math.hypot(nx-p.x,ny-p.y)/(T*.4)));let hit=false;
      let px=p.x,py=p.y;
      for(let j=1;j<=steps;j++){const x=lerp(p.x,nx,j/steps),y=lerp(p.y,ny,j/steps);
        if(!(mode?weatherSandAt(g,x,y):weatherRainAt(g,x,y))){hit=true;if(!mode)rainHitsGround(g,px,py);break;}
        if(!mode&&g.world.waterAtPx(x,y)){hit=true;rainHitsWater(g,x,y);break;}
        px=x;py=y;} // oceano, rio, poço: a gota acaba na superfície e respinga
      p.x=nx;p.y=ny;p.life-=dt;
      if(hit||p.life<0||p.y>g.cam.y+canvas.height/g.zoom+20||p.x<g.cam.x-40||p.x>g.cam.x+canvas.width/g.zoom+40)list.splice(i,1);
    }
  }
  const world=g.world;
  for(let n=Math.floor(w.rain*dt*65+Math.random());n>0&&w.splashes.length<90;n--){
    const tx=Math.floor((g.cam.x+Math.random()*canvas.width/g.zoom)/T);if(tx<1||tx>=world.w-1)continue;
    const ty=weatherCeiling(world,tx),y=world.waterSurfacePx(tx,ty-1)??ty*T,x=(tx+.5)*T;
    if(y<g.cam.y||y>g.cam.y+canvas.height/g.zoom||!weatherRainAt(g,x,y-1))continue;
    w.splashes.push({x,y,life:.32,water:world.hasWater(tx,Math.floor((y+1)/T))});
  }
  for(let i=w.splashes.length-1;i>=0;i--)if((w.splashes[i].life-=dt)<=0)w.splashes.splice(i,1);
}
function drawWeatherFunnel(ctx,g,ox,oy,z){
  WEATHER_VIEW_TOP=oy/z;
  const f=g.weather?.funnel;if(!f||f.strength<.01)return;
  ctx.save();ctx.setTransform(z,0,0,z,-ox,-oy);
  // Continuous tapered body; feathered horizontal bands avoid stacked-disc seams.
  for(let row=0;row<f.height;row+=2){
    const h=row/f.height,yy=f.y-row,r=7+Math.pow(h,1.5)*f.radius,xx=f.x+Math.sin(h*4+f.age*.5)*h*10;
    if(!weatherExposed(g.world,xx,yy-2))continue;
    ctx.fillStyle=`rgba(93,96,86,${(.15+h*.12)*f.strength})`;
    ctx.fillRect(Math.round(xx-r*.76),Math.round(yy-2),Math.round(r*1.52),2);
    for(let edge=0;edge<3;edge++){
      ctx.fillStyle=`rgba(93,96,86,${(.11-edge*.03)*f.strength})`;
      const a=r*(.76+edge*.08),b=Math.max(1,r*.08);
      ctx.fillRect(Math.round(xx+a),Math.round(yy-2),Math.ceil(b),2);
      ctx.fillRect(Math.round(xx-a-b),Math.round(yy-2),Math.ceil(b),2);
    }
  }
  // Debris orbits at different angular speeds around the same local wind field.
  for(let i=0;i<40;i++){
    const h=i/39,yy=f.y-h*f.height,r=7+Math.pow(h,1.5)*f.radius,xx=f.x+Math.sin(h*4+f.age*.5)*h*10;
    if(!weatherExposed(g.world,xx,yy-2))continue;
    for(let j=0;j<3;j++){const a=f.age*(3-h)+i*.65+j*2.094,x=xx+Math.cos(a)*r,y=yy+Math.sin(a)*(3+h*5);
      if(!weatherExposed(g.world,x,y))continue;
      ctx.globalAlpha=f.strength*(.2+.4*(Math.sin(a)*.5+.5));ctx.fillStyle=j===0?'#aa9a72':'#6b7050';ctx.fillRect(Math.round(x),Math.round(y),j===1?3:2,1);ctx.globalAlpha=1;}
  }
  ctx.restore();
}
function drawWeather(ctx,g,W,H,ox,oy,z){
  WEATHER_VIEW_TOP=oy/z;
  const w=g.weather;if(!w||(w.rain<.005&&w.sand<.005&&w.flash<.005))return;ctx.save();ctx.setTransform(z,0,0,z,-ox,-oy);
  ctx.strokeStyle=`rgba(175,199,218,${.26+w.rain*.22})`;ctx.lineWidth=1/z;
  for(const d of w.drops){if(!weatherRainAt(g,d.x,d.y)||g.world.waterAtPx(d.x,d.y))continue;const wind=environmentWind(g,d.x,d.y).x*.85/d.speed;
    const endX=d.x-d.len*wind,endY=d.y-d.len;if(!weatherExposed(g.world,endX,endY))continue;
    ctx.globalAlpha=weatherRainAt(g,d.x,d.y)/Math.max(.001,w.rain);
    ctx.beginPath();ctx.moveTo(Math.round(d.x),Math.round(d.y));ctx.lineTo(Math.round(endX),Math.round(endY));ctx.stroke();}
  ctx.globalAlpha=1;
  for(const s of w.splashes){if(!weatherRainAt(g,s.x,s.y-1))continue;const k=1-s.life/(s.max||.32),r=1+k*4;ctx.globalAlpha=(1-k)*.55;ctx.fillStyle='#b2c8ca';
    if(s.water){ctx.strokeStyle='#bfd6d2';ctx.beginPath();ctx.ellipse(s.x,s.y,r*2,Math.max(.5,r*.25),0,0,Math.PI*2);ctx.stroke();
      if(s.hit){const h=Math.sin(k*Math.PI)*4;ctx.fillStyle='#e8f7ff';ctx.fillRect(Math.round(s.x-1-k*3),Math.round(s.y-h-1),1,1);ctx.fillRect(Math.round(s.x+1+k*3),Math.round(s.y-h-1),1,1);}} // gotículas saltando
    else{ // mini splash: um anelzinho achatado no chão e três gotículas que sobem e caem em arco
      const a=(1-k);ctx.globalAlpha=a*.45;ctx.fillStyle='#dcebf2';
      const rw=Math.round(1+k*4);ctx.fillRect(Math.round(s.x-rw),Math.round(s.y)-1,rw*2+1,1);
      ctx.globalAlpha=Math.min(1,a*1.3);
      for(let d=0;d<3;d++){const dir=d-1,sd=(s.seed||0)*(d+1)%1,h=Math.sin(k*Math.PI)*(3.2+sd*2.4+(d===1?1.6:0)),dx=dir*(1.5+k*(3+sd*2));
        ctx.fillStyle=d===1?'#eef8fc':'#c4dbe6';ctx.fillRect(Math.round(s.x+dx),Math.round(s.y-1-h),1,1+(h>3.4?1:0));}}}
  ctx.globalAlpha=1;
  for(const p of w.sandParticles){const a=weatherSandAt(g,p.x,p.y);if(!a)continue;ctx.fillStyle=`rgba(202,172,109,${a*.6})`;ctx.fillRect(Math.round(p.x),Math.round(p.y),2,1);}
  // Mask visibility and lightning by real exposure, including mixed-biome views.
  const x0=Math.floor(ox/z/T),y0=Math.floor(oy/z/T),cols=Math.ceil(W/z/T)+1,rows=Math.ceil(H/z/T)+1;
  for(let y=y0;y<=y0+rows;y++)for(let x=x0;x<=x0+cols;x++){
    const xx=(x+.5)*T,yy=(y+.5)*T;if(!weatherLit(g.world,xx,yy))continue;
    const sand=weatherSandAt(g,xx,yy,true),rain=weatherRainAt(g,xx,yy,true);
    if(sand>.01){ctx.fillStyle=`rgba(186,151,91,${sand*.13})`;ctx.fillRect(x*T,y*T,T,T);}
    else if(rain>.01){ctx.fillStyle=`rgba(32,44,58,${rain*.07})`;ctx.fillRect(x*T,y*T,T,T);}
    if(w.flash>.01){ctx.fillStyle=`rgba(225,232,248,${w.flash*.24})`;ctx.fillRect(x*T,y*T,T,T);}
  }
  ctx.restore();ctx.setTransform(1,0,0,1,0,0);
}
