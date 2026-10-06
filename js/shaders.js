'use strict';

// Canvas 2D lighting. Only light masks / extracted highlights are smoothed.
// The artwork and HUD never enter a blur pass. All masks use world coordinates.
const shaderSunStep = time => RENDER_STYLE.sun.followTime
  ? clamp(Math.cos(time * Math.PI * 2) / Math.max(.45, Math.sin(time * Math.PI * 2)), -1.6, 1.6)
  : clamp(RENDER_STYLE.sun.direction.x / Math.max(.15, RENDER_STYLE.sun.direction.y), -1.6, 1.6);
const shaderSunPos = (time, W, H) => RENDER_STYLE.sun.followTime
  ? {x: W * .5 - Math.cos(time * Math.PI * 2) * W * .45, y: H * .7 - Math.sin(time * Math.PI * 2) * H * .6}
  : {x: W * (.5 - shaderSunStep(time) * .4), y: H * .08};

const SUN_PAD_Y = 64, SUN_PAD_X = 106, SUN_PAD_EDGE = 2;
const shaderSunPadding = (height,time) => Math.max(SUN_PAD_X,Math.ceil((height+SUN_PAD_Y)*Math.abs(shaderSunStep(time)))+2);
// A luz caminha sempre para o mesmo lado, então só o lado de onde ela vem precisa da
// margem inteira: uma célula em i lê i-step, nunca o outro lado. Com o sol padrão isso
// tira ~40% das colunas do cálculo sem mudar nenhum valor dentro da janela.
function shaderSunPads(height,time) {
  const step = shaderSunStep(time), reach = shaderSunPadding(height,time);
  return {left: step > 0 ? reach : SUN_PAD_EDGE, right: step < 0 ? reach : SUN_PAD_EDGE};
}
// Buffers reaproveitados entre reconstruções: o campo é refeito ao mover a câmera ou
// cavar, e alocar três arrays a cada vez só dava trabalho ao coletor de lixo.
const sunScratch = {previous: null, next: null};
function sunBuffer(name, length) {
  const cached = sunScratch[name];
  return cached && cached.length === length ? cached : (sunScratch[name] = new Float32Array(length));
}
function shaderSunField(world, x0, y0, width, height, time, shade, pads) {
  const step = shaderSunStep(time), pad = pads || shaderSunPads(height,time);
  const stride = width + pad.left + pad.right;
  let previous = sunBuffer('previous',stride), next = sunBuffer('next',stride);
  const field = new Float32Array(width * height), top = y0 - SUN_PAD_Y, left = x0 - pad.left;
  for (let i = 0; i < stride; i++) previous[i] = +world.isSkyExposed(left + i, top);
  for (let y = top; y < y0 + height; y++) {
    const row = (y - top) * stride, inside = y >= y0;
    for (let i = 0; i < stride; i++) {
      const x = left + i, source = i - step, a = Math.floor(source), f = source - a;
      const incoming = a >= 0 && a + 1 < stride ? previous[a] * (1-f) + previous[a+1] * f : +world.isSkyExposed(x,y);
      const t = world.getTile(x,y), wall = world.getWall(x,y);
      // Save incident light BEFORE absorption, so the exposed roof/soil receives light.
      if (inside && i >= pad.left && i < pad.left + width) field[(y-y0)*width+i-pad.left] = incoming;
      const window = t === TILE.GLASS || t === TILE.LATTICE_WINDOW;
      const transmission = window ? .86 : SOLID[t] ? 0 : t === TILE.LEAVES ? .68 : t === TILE.TRUNK ? .72 : wall !== WALL.NONE ? .32 : 1;
      next[i] = incoming * transmission * (shade ? shade[row+i] : 1) * (world.hasWater?.(x,y) ? .93 : 1);
    }
    const swap = previous; previous = next; next = swap;
  }
  return field;
}

const canopyCoverCache = new WeakMap();
function canopyCoverage(canopy) {
  let cover = canopyCoverCache.get(canopy.canvas);
  if (cover) return cover;
  const c = canopy.canvas, w = c.width, h = c.height;
  const data = c.getContext('2d').getImageData(0,0,w,h).data;
  const dx = Math.round(T/2-w/2), dy = canopy.overlap-h;
  const kx0 = Math.floor(dx/T), ky0 = Math.floor(dy/T);
  const cols = Math.floor((dx+w-1)/T)-kx0+1, rows = Math.floor((dy+h-1)/T)-ky0+1;
  const cells = new Float32Array(cols*rows);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(data[(y*w+x)*4+3]>40)
    cells[(Math.floor((y+dy)/T)-ky0)*cols+Math.floor((x+dx)/T)-kx0]++;
  for(let i=0;i<cells.length;i++)cells[i]/=T*T;
  cover={kx0,ky0,cols,rows,cells};canopyCoverCache.set(c,cover);return cover;
}
function shaderCanopyShade(world,x0,y0,width,height,time=0,pads) {
  const pad=pads||shaderSunPads(height,time),stride=width+pad.left+pad.right,rows=height+SUN_PAD_Y,left=x0-pad.left,top=y0-SUN_PAD_Y;
  const shade=new Float32Array(stride*rows).fill(1);let any=false;
  for(let x=Math.max(0,left-5);x<=Math.min(world.w-1,left+stride+5);x++)
    for(let y=Math.max(1,top);y<=Math.min(world.h-1,y0+height+9);y++) {
      if(world.getTile(x,y)!==TILE.TRUNK)continue;
      const above=world.getTile(x,y-1);if(above===TILE.TRUNK||above===TILE.STUMP)continue;
      const cover=canopyCoverage(canopyFor(x,world.biomeAt(x),world.seed));
      for(let ky=0;ky<cover.rows;ky++)for(let kx=0;kx<cover.cols;kx++) {
        const c=cover.cells[ky*cover.cols+kx],i=x+cover.kx0+kx-left,r=y+cover.ky0+ky-top;
        if(c<=0||i<0||i>=stride||r<0||r>=rows)continue;
        shade[r*stride+i]*=1-c*(hash2(x+kx,y+ky,77)<.22?.42:.72);any=true;
      }
    }
  return any?shade:null;
}

function shaderWalls(renderer) {
  // Lift the original very dark wall atlas a little, retaining its material colors.
  if(!renderer.litWalls)renderer.litWalls=renderer.tex.walls.map(source=>{
    if(!source)return source;
    const c=makeCanvas(source.width,source.height),ctx=c.getContext('2d');ctx.drawImage(source,0,0);
    const image=ctx.getImageData(0,0,c.width,c.height);
    for(let i=0;i<image.data.length;i+=4){image.data[i]*=1.35;image.data[i+1]*=1.30;image.data[i+2]*=1.18;}
    ctx.putImageData(image,0,0);return c;
  });return renderer.litWalls;
}

function shaderBeamAt(wx,wy,time) {
  const cfg=RENDER_STYLE.rays,scale=Math.max(.2,cfg.scale),q=(wx-shaderSunStep(time)*wy)/scale;
  const spacing=310,cell=Math.floor(q/spacing);let light=0;
  for(let i=cell-1;i<=cell+1;i++) {
    const center=(i+.15+hash2(i,2,918)*.7)*spacing;
    const width=(25+hash2(i,3,918)*48)*clamp(cfg.softness,.2,2);
    const d=(q-center)/width;
    light+=Math.exp(-d*d*.5)*(.45+hash2(i,4,918)*.55);
  }
  return Math.min(1,light);
}

function prepareShaderFrame(renderer,game,W,H,ox,oy,z) {
  const world=game.world,x0=Math.floor(ox/z/T)-2,y0=Math.floor(oy/z/T)-2;
  const width=Math.ceil(W/z/T)+5,height=Math.ceil(H/z/T)+5,step=shaderSunStep(game.time);
  let cache=renderer.sunCache;
  if(!cache||cache.world!==world||cache.x0!==x0||cache.y0!==y0||cache.width!==width||cache.height!==height||
     cache.revision!==world.lightRevision||Math.abs(cache.step-step)>.002) {
    const pad=shaderSunPads(height,game.time);
    // A sombra das copas só depende das árvores: cavar ou construir qualquer outra coisa
    // mexe em lightRevision, mas não precisa redesenhar as copas de novo.
    const previous=renderer.sunCache;
    const shade=previous&&previous.world===world&&previous.x0===x0&&previous.y0===y0&&previous.width===width&&
      previous.height===height&&previous.pad.left===pad.left&&previous.pad.right===pad.right&&
      Math.abs(previous.step-step)<=.002&&previous.trees===world.treeRevision
      ? previous.shade : shaderCanopyShade(world,x0,y0,width,height,game.time,pad);
    cache=renderer.sunCache={world,x0,y0,width,height,step,pad,revision:world.lightRevision,trees:world.treeRevision,
      updated:performance.now(),shade,
      field:shaderSunField(world,x0,y0,width,height,game.time,shade,pad)};
    cache.open=shade?shaderSunField(world,x0,y0,width,height,game.time,null,pad):cache.field;
    renderer.shaderMaskKey=null;
  }
  if(!renderer.shaderLight||renderer.shaderLight.width!==width||renderer.shaderLight.height!==height) {
    for(const name of ['shaderLight','shaderSurface','shaderBloomMask'])renderer[name]=makeCanvas(width,height);
    renderer.shaderPixels=renderer.shaderLight.getContext('2d').createImageData(width,height);
    renderer.shaderGlowPixels=renderer.shaderSurface.getContext('2d').createImageData(width,height);
    renderer.shaderMaskPixels=renderer.shaderBloomMask.getContext('2d').createImageData(width,height);
    renderer.shaderRays=new Float32Array(width*height);
    renderer.shaderMaskKey=null;
  }
  renderer.shaderBounds={dx:x0*T*z-ox,dy:y0*T*z-oy,width:width*T*z,height:height*T*z,x0,y0,tiles:width,rows:height};
  renderer.shaderFrame={game,W,H,ox,oy,z};
  const pixels=renderer.shaderPixels.data,glow=renderer.shaderGlowPixels.data,mask=renderer.shaderMaskPixels.data;
  const cfg=RENDER_STYLE,day=clamp(game.daylight,0,1),rain=game.weather?.rain||0;
  const sunlight=day*(1-rain*.8),ambientColor=cfg.ambient.color,sunColor=cfg.sun.color;
  const penetration=clamp(cfg.cave.sunlightPenetration,.15,2),dark=clamp(cfg.cave.darkness,0,1);
  const pulse=1+Math.sin(performance.now()/1000*.13)*clamp(cfg.rays.animation,0,.1);
  // These masks are world aligned. Sub-tile camera motion only repositions
  // them; lighting changes invalidate them independently of camera movement.
  const maskKey=[Math.round(day*400),Math.round(rain*200),Math.round(pulse*400),world.lx,world.ly,JSON.stringify(cfg)].join(':');
  if(renderer.shaderMaskKey===maskKey)return;
  renderer.shaderMaskKey=maskKey;
  const shadeStride=width+cache.pad.left+cache.pad.right,shadeLeft=cache.pad.left;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++) {
    const tx=x0+x,ty=y0+y,k=y*width+x,p=k*4,lx=tx-world.lx,ly=ty-world.ly;
    const valid=lx>=0&&ly>=0&&lx<LIGHT_W&&ly<LIGHT_H;
    const sky=valid?world.skyLight[ly*LIGHT_W+lx]/15:+world.isSkyExposed(tx,ty);
    const lamp=valid?world.blockLight[ly*LIGHT_W+lx]/15:0;
    const envIndex=ly*LIGHT_W+lx,environment=valid?world.environmentLight:null;
    const er=environment?environment[0][envIndex]/15:0,eg=environment?environment[1][envIndex]/15:0,eb=environment?environment[2][envIndex]/15:0;
    const tile=world.getTile(tx,ty),wall=world.getWall(tx,ty),solid=!!SOLID[tile];
    const air=!solid&&wall===WALL.NONE;
    const leaves=air&&cache.shade&&cache.shade[(y+SUN_PAD_Y)*shadeStride+x+shadeLeft]<.99;
    let direct=cache.field[k]*sunlight;
    // Ar da faixa do céu e embaixo das ilhas (js/sky-world.js): a sombra delas pinta o chão, mas
    // não vira uma coluna escura no meio do céu
    const skyAir=air&&world.skyFloor&&(ty<=world.skyFloor[tx]||(ty>=world.skyGapTop[tx]&&ty<world.skyGapBottom[tx]));
    if(leaves)direct=Math.max(direct,cache.open[k]*sunlight*.72);
    const bounce=Math.pow(sky,1.6/penetration)*cfg.ambient.intensity*(.22+day*.78);
    const local=Math.pow(lamp,1.15),floor=.035+(1-dark)*.25;
    for(let c=0;c<3;c++) {
      const tint=cfg.ambient.shadowTint[c]/255;
      let v=floor*(.65+tint)+bounce*ambientColor[c]/255+direct*cfg.sun.intensity*sunColor[c]/255+local*(c===0?1.22:c===1?.94:.60)+(c===0?er:c===1?eg:eb)*1.15;
      // Background already has depth grading; keep open air neutral. Underground
      // is driven by the same propagated sky exposure as the terrain, never height.
      if(air&&!leaves&&sky>.85)v=lerp(v,(.86+(skyAir?sunlight:direct)*.14)*(.32+day*.68),.72);
      if(solid) {
        const n=SOLID[world.getTile(tx,ty-1)]+SOLID[world.getTile(tx-1,ty)]+SOLID[world.getTile(tx+1,ty)]+SOLID[world.getTile(tx,ty+1)];
        v*=1-n*.028;
      }
      pixels[p+c]=clamp(v*255,0,255);
    }
    pixels[p+3]=255;
    // Shafts are behind sprites and require both direct light and open sky.
    const airExposure=air&&!leaves?Math.pow(sky,2/penetration)*cache.field[k]:0;
    const shaft=airExposure*sunlight*cfg.rays.intensity*shaderBeamAt((tx+.5)*T,(ty+.5)*T,game.time)*pulse;
    renderer.shaderRays[k]=shaft;
    glow[p]=sunColor[0];glow[p+1]=sunColor[1];glow[p+2]=sunColor[2];glow[p+3]=clamp(shaft,0,.4)*255;
    mask[p]=mask[p+1]=mask[p+2]=255;
    mask[p+3]=clamp(Math.max(Math.pow(sky,2)*day,local,direct,er,eg,eb),0,1)*255;
  }
  renderer.shaderLight.getContext('2d').putImageData(renderer.shaderPixels,0,0);
  renderer.shaderSurface.getContext('2d').putImageData(renderer.shaderGlowPixels,0,0);
  renderer.shaderBloomMask.getContext('2d').putImageData(renderer.shaderMaskPixels,0,0);
  renderer.shaderMaskRevision=(renderer.shaderMaskRevision||0)+1; // js/gpu-postprocess.js reenvia só quando muda
}

function drawShaderLighting(renderer,game,W,H,ox,oy,z) {
  const f=renderer.shaderFrame;
  if(!f||f.consumed||f.game!==game||f.W!==W||f.H!==H||f.ox!==ox||f.oy!==oy||f.z!==z)prepareShaderFrame(renderer,game,W,H,ox,oy,z);
  const ctx=renderer.ctx,b=renderer.shaderBounds;
  ctx.save();ctx.imageSmoothingEnabled=true;ctx.globalCompositeOperation='multiply';
  ctx.drawImage(renderer.shaderLight,b.dx,b.dy,b.width,b.height);ctx.restore();
  renderer.shaderFrame.consumed=true;
}

function drawShaderSky(ctx,game,W,H,renderer) {
  const b=renderer.shaderBounds;if(!b||game.adminNightVision)return;
  // Broad gaussian strips with world-fixed centers, composited behind gameplay.
  ctx.save();ctx.imageSmoothingEnabled=true;ctx.globalCompositeOperation='screen';
  ctx.drawImage(renderer.shaderSurface,b.dx,b.dy,b.width,b.height);ctx.restore();
}

const shaderRimCache=new WeakMap();
function shaderHighlightWeight(luminance,edge) {
  // Fade the additive accent before pale pixels reach white. The original
  // texture remains intact; dark outlines receive little extra light.
  const material=clamp((luminance-.08)*3,0,1);
  const headroom=1-smoothstep(clamp((luminance-.62)/.36,0,1))*.88;
  const detail=Math.max(0,luminance-.48)*.28;
  return (edge+detail)*material*headroom;
}
function shaderRimSprite(source,time,terrain=false) {
  const sun=RENDER_STYLE.sun,dx=Math.round(-shaderSunStep(time)*2),key=sun.color.join(',')+':'+dx+':'+terrain;
  let entry=shaderRimCache.get(source);if(entry?.key===key)return entry.canvas;
  const w=source.width,h=source.height,c=makeCanvas(w,h),ctx=c.getContext('2d');
  const src=source.getContext('2d').getImageData(0,0,w,h).data,out=ctx.createImageData(w,h);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++) {
    const i=(y*w+x)*4;if(!src[i+3])continue;
    const xx=x+dx,yy=y-2;let a=xx<0||xx>=w||yy<0?0:src[(yy*w+xx)*4+3];
    if(terrain){
      // Atlas padding is not an exposed world edge. Only the face encoded by
      // this row's neighbour mask can receive a contour highlight.
      const mask=Math.floor(y/SPR),lx=x%SPR,ly=y%SPR;
      const top=(mask&1)&&ly<MARGIN+4;
      const side=dx>=0?(mask&2)&&lx>=MARGIN+T-3:(mask&8)&&lx<MARGIN+3;
      if(!top&&!side)continue;
      if((!(mask&2)&&lx+dx>=MARGIN+T)||(!(mask&8)&&lx+dx<MARGIN)||(!(mask&1)&&ly-2<MARGIN))a=255;
    }
    const lum=(src[i]*.2126+src[i+1]*.7152+src[i+2]*.0722)/255;
    // Only thin illuminated edges and bright leaf detail, never a silhouette halo.
    const edge=a<40?.72:0;
    out.data[i]=sun.color[0];out.data[i+1]=sun.color[1];out.data[i+2]=sun.color[2];
    out.data[i+3]=src[i+3]*(terrain?edge*clamp((lum-.08)*3,0,1):shaderHighlightWeight(lum,edge));
  }
  ctx.putImageData(out,0,0);shaderRimCache.set(source,{key,canvas:c});return c;
}
function shaderExposureAt(renderer,tx,ty,unfiltered=false) {
  const c=renderer.sunCache;if(!c)return 0;
  const x=Math.floor(tx)-c.x0,y=Math.floor(ty)-c.y0;
  return x>=0&&y>=0&&x<c.width&&y<c.height?(unfiltered?c.open:c.field)[y*c.width+x]:0;
}
function drawShaderRim(renderer,game,source,sx,sy,sw,sh,dx,dy,dw,dh,tx,ty,foliage=false,terrain=false) {
  if(!GAME_OPTIONS.shaders||game.adminNightVision||renderer.sunCache?.world!==game.world)return;
  const exposure=shaderExposureAt(renderer,tx,ty,foliage)*game.daylight*(1-(game.weather?.rain||0)*.8);
  if(exposure<.04)return;
  // save/restore por tile pesa no laço de blocos; guardar só os dois estados que mudam
  // faz o mesmo e é bem mais barato.
  const ctx=renderer.ctx,alpha=ctx.globalAlpha,mode=ctx.globalCompositeOperation;
  ctx.globalCompositeOperation='screen';
  ctx.globalAlpha=exposure*RENDER_STYLE.sun.edgeIntensity;
  ctx.drawImage(shaderRimSprite(source,game.time,terrain),sx,sy,sw,sh,dx,dy,dw,dh);
  ctx.globalCompositeOperation=mode;ctx.globalAlpha=alpha;
}

function drawShaderGrade(renderer,game,W,H) {
  const cfg=RENDER_STYLE.grade,ctx=renderer.ctx;
  if(cfg.exposure===1&&cfg.contrast===1&&cfg.saturation===1)return;
  if(!renderer.gradeCanvas||renderer.gradeCanvas.width!==W||renderer.gradeCanvas.height!==H)renderer.gradeCanvas=makeCanvas(W,H);
  const copy=renderer.gradeCanvas.getContext('2d');copy.globalCompositeOperation='copy';copy.drawImage(renderer.canvas,0,0);
  ctx.save();ctx.imageSmoothingEnabled=false;
  ctx.filter=`brightness(${Math.max(.1,cfg.exposure)}) contrast(${Math.max(.1,cfg.contrast)}) saturate(${Math.max(0,cfg.saturation)})`;
  ctx.drawImage(renderer.gradeCanvas,0,0);ctx.restore();
}

function drawShaderBloom(renderer,game,W,H,ox,oy,z) {
  const cfg=RENDER_STYLE.bloom;if(cfg.intensity<=0)return;
  const ds=clamp(Math.round(cfg.downsample),2,8),pad=Math.ceil(Math.max(0,cfg.radius)*z/ds)*3+2;
  const width=Math.ceil(W/ds)+pad*2+2,height=Math.ceil(H/ds)+pad*2+2;
  let state=renderer.bloomState;
  if(!state||state.width!==width||state.height!==height) {
    const source=makeCanvas(width,height),blur=makeCanvas(width,height);
    state=renderer.bloomState={width,height,source,blur,ctx:source.getContext('2d',{willReadFrequently:true})};
  }
  const c=state.ctx,phaseX=wrap(ox,ds),phaseY=wrap(oy,ds),px=pad+phaseX/ds,py=pad+phaseY/ds;
  c.clearRect(0,0,width,height);c.imageSmoothingEnabled=true;
  c.drawImage(renderer.canvas,px,py,W/ds,H/ds);
  const pixels=c.getImageData(0,0,width,height),d=pixels.data;
  const threshold=clamp(cfg.threshold,0,1),knee=Math.max(.001,cfg.knee);
  for(let i=0;i<d.length;i+=4) {
    const lum=(d[i]*.2126+d[i+1]*.7152+d[i+2]*.0722)/255;
    const soft=clamp(lum-threshold+knee,0,2*knee);
    const excess=Math.max(lum-threshold,soft*soft/(4*knee));
    const weight=clamp(excess/Math.max(lum,.001),0,1);
    d[i]*=weight;d[i+1]*=weight;d[i+2]*=weight;d[i+3]=255;
  }
  c.putImageData(pixels,0,0);
  const blur=state.blur.getContext('2d');blur.clearRect(0,0,width,height);
  blur.filter=`blur(${Math.max(0,cfg.radius)*z/ds}px)`;blur.drawImage(state.source,0,0);blur.filter='none';
  // Mask AFTER blur: surface glare cannot bleed into an enclosed cave.
  const b=renderer.shaderBounds;blur.globalCompositeOperation='destination-in';
  blur.drawImage(renderer.shaderBloomMask,b.dx/ds+px,b.dy/ds+py,b.width/ds,b.height/ds);
  blur.globalCompositeOperation='source-over';
  const ctx=renderer.ctx;ctx.save();ctx.imageSmoothingEnabled=true;ctx.globalCompositeOperation='screen';
  ctx.globalAlpha=clamp(cfg.intensity,0,2);ctx.drawImage(state.blur,-px*ds,-py*ds,width*ds,height*ds);ctx.restore();
}
function drawWorldShaders(renderer,game,W,H,ox,oy,z) {
  if(game.adminNightVision)return;
  if(typeof drawGpuPostProcess==='function'&&drawGpuPostProcess(renderer,W,H,z))return;
  drawShaderGrade(renderer,game,W,H);
  drawShaderBloom(renderer,game,W,H,ox,oy,z);
}
