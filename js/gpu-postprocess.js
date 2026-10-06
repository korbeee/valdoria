'use strict';

// GPU-only world post-processing. No per-frame getImageData/readPixels; the HUD
// is drawn later by Renderer. Canvas 2D remains the game's sprite renderer.
class WorldPostProcess {
  constructor() {
    this.canvas=makeCanvas(1,1);
    const gl=this.gl=this.canvas.getContext('webgl',{alpha:false,antialias:false,depth:false,stencil:false,premultipliedAlpha:false});
    if(!gl)throw Error('WebGL unavailable');
    this.lost=false;
    this.canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();this.lost=true;});
    this.canvas.addEventListener('webglcontextrestored',()=>{this.init();this.lost=false;});
    this.init();
  }
  init() {
    const gl=this.gl;
    const vertex='attribute vec2 pos; varying vec2 uv; void main(){uv=pos*.5+.5;gl_Position=vec4(pos,0.,1.);}';
    const header='precision highp float; varying vec2 uv; uniform sampler2D scene;';
    const program=fragment=>{
      const shaders=[gl.VERTEX_SHADER,gl.FRAGMENT_SHADER].map((type,i)=>{
        const s=gl.createShader(type);gl.shaderSource(s,i?header+fragment:vertex);gl.compileShader(s);
        if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;
      });
      const p=gl.createProgram();for(const s of shaders)gl.attachShader(p,s);gl.linkProgram(p);
      if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));
      for(const s of shaders)gl.deleteShader(s);
      return {p,loc:{},pos:gl.getAttribLocation(p,'pos')};
    };
    this.extract=program(`uniform vec2 sampleStep; uniform vec2 threshold; uniform vec4 sourceBounds;
      vec3 bright(vec2 p){if(p.x<0.||p.y<0.||p.x>1.||p.y>1.)return vec3(0.);
      vec3 c=texture2D(scene,p).rgb;float l=dot(c,vec3(.2126,.7152,.0722));
      float s=clamp(l-threshold.x+threshold.y,0.,2.*threshold.y);
      return c*clamp(max(l-threshold.x,s*s/(4.*threshold.y))/max(l,.001),0.,1.);}
      void main(){vec2 q=(vec2(uv.x,1.-uv.y)-sourceBounds.xy)/sourceBounds.zw;vec2 p=vec2(q.x,1.-q.y);
      vec2 d=sampleStep*.25;gl_FragColor=vec4((bright(p+d)+bright(p-d)+bright(p+vec2(d.x,-d.y))+bright(p+vec2(-d.x,d.y)))*.25,1.);}`);
    this.blur=program(`uniform vec2 stepSize;
      void main(){vec3 c=texture2D(scene,uv).rgb*.227027;
      c+=(texture2D(scene,uv+stepSize*1.384615).rgb+texture2D(scene,uv-stepSize*1.384615).rgb)*.316216;
      c+=(texture2D(scene,uv+stepSize*3.230769).rgb+texture2D(scene,uv-stepSize*3.230769).rgb)*.070270;
      gl_FragColor=vec4(c,1.);}`);
    this.composite=program(`uniform sampler2D bloom; uniform sampler2D mask;
      uniform vec4 maskBounds; uniform vec4 sourceBounds; uniform vec3 grade; uniform float intensity;
      void main(){vec3 c=texture2D(scene,uv).rgb;float l=dot(c,vec3(.2126,.7152,.0722));
      c=mix(vec3(l),c,grade.z);c=clamp((c*grade.x-.5)*grade.y+.5,0.,1.);
      vec2 m=(vec2(uv.x,1.-uv.y)-maskBounds.xy)/maskBounds.zw;
      float a=texture2D(mask,vec2(m.x,1.-m.y)).a;
      vec2 b=vec2(uv.x,1.-uv.y)*sourceBounds.zw+sourceBounds.xy;
      vec3 glow=clamp(texture2D(bloom,vec2(b.x,1.-b.y)).rgb*intensity*a,0.,1.);
      gl_FragColor=vec4(1.-(1.-c)*(1.-glow),1.);}`);
    this.quad=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.quad);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
    const texture=filter=>{const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,filter);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,filter);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);return t;};
    this.scene=texture(gl.NEAREST);this.mask=texture(gl.LINEAR);
    this.targets=[0,1].map(()=>({texture:texture(gl.LINEAR),fbo:gl.createFramebuffer()}));
    this.size='';this.sceneSize='';this.maskSize='';this.maskRevision=null;
    // Os samplers não mudam de unidade: liga uma vez, em vez de procurar a cada quadro.
    gl.useProgram(this.extract.p);gl.uniform1i(this.location(this.extract,'scene'),0);
    gl.useProgram(this.blur.p);gl.uniform1i(this.location(this.blur,'scene'),0);
    gl.useProgram(this.composite.p);gl.uniform1i(this.location(this.composite,'scene'),0);
    gl.uniform1i(this.location(this.composite,'bloom'),1);gl.uniform1i(this.location(this.composite,'mask'),2);
    gl.disable(gl.BLEND);gl.disable(gl.DEPTH_TEST);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
  }
  location(p,name) {
    return p.loc[name]??(p.loc[name]=this.gl.getUniformLocation(p.p,name));
  }
  uniform(p,name,...values) {
    this.gl['uniform'+values.length+'f'](this.location(p,name),...values);
  }
  use(p,texture,target,w,h) {
    const gl=this.gl;gl.useProgram(p.p);gl.bindBuffer(gl.ARRAY_BUFFER,this.quad);
    gl.enableVertexAttribArray(p.pos);gl.vertexAttribPointer(p.pos,2,gl.FLOAT,false,0,0);
    gl.bindFramebuffer(gl.FRAMEBUFFER,target?.fbo||null);gl.viewport(0,0,w,h);
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
  }
  // Reaproveita o armazenamento da textura: texImage2D só quando o tamanho muda, depois
  // texSubImage2D, que não realoca os 5,7 MB da cena a cada quadro.
  upload(slot,texture,source) {
    const gl=this.gl,size=source.width+'x'+source.height;
    gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);
    if(this[slot]!==size){this[slot]=size;gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);return;}
    gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,gl.RGBA,gl.UNSIGNED_BYTE,source);
  }
  draw(renderer,W,H,z) {
    const gl=this.gl;if(this.lost||gl.isContextLost())return false;
    const cfg=RENDER_STYLE.bloom,grade=RENDER_STYLE.grade,ds=clamp(Math.round(cfg.downsample),2,8);
    const radius=Math.max(0,cfg.radius)*z/ds,pad=Math.ceil(radius)*3+2;
    const bw=Math.max(1,Math.ceil(W/ds)+pad*2+2),bh=Math.max(1,Math.ceil(H/ds)+pad*2+2),size=[W,H,bw,bh].join(':');
    const frame=renderer.shaderFrame,px=pad+wrap(frame?.ox||0,ds)/ds,py=pad+wrap(frame?.oy||0,ds)/ds;
    const bounds=[px/bw,py/bh,W/ds/bw,H/ds/bh];
    if(size!==this.size){
      this.canvas.width=W;this.canvas.height=H;
      for(const t of this.targets){gl.bindTexture(gl.TEXTURE_2D,t.texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,bw,bh,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
        gl.bindFramebuffer(gl.FRAMEBUFFER,t.fbo);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,t.texture,0);
        if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('Incomplete bloom buffer');}
      this.size=size;
    }
    this.upload('sceneSize',this.scene,renderer.canvas);
    // A máscara de exposição só muda quando a preparação a redesenha (ela é alinhada ao
    // mundo e reaproveitada entre quadros). Sem número de revisão, envia sempre.
    const revision=renderer.shaderMaskRevision;
    if(revision===undefined||revision!==this.maskRevision||this.maskSize!==renderer.shaderBloomMask.width+'x'+renderer.shaderBloomMask.height){
      this.upload('maskSize',this.mask,renderer.shaderBloomMask);this.maskRevision=revision;
    }
    this.use(this.extract,this.scene,this.targets[0],bw,bh);
    this.uniform(this.extract,'sourceBounds',...bounds);
    this.uniform(this.extract,'sampleStep',ds/W,ds/H);this.uniform(this.extract,'threshold',clamp(cfg.threshold,0,1),Math.max(.001,cfg.knee));gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    this.use(this.blur,this.targets[0].texture,this.targets[1],bw,bh);this.uniform(this.blur,'stepSize',radius/bw*.5,0);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    this.use(this.blur,this.targets[1].texture,this.targets[0],bw,bh);this.uniform(this.blur,'stepSize',0,radius/bh*.5);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    this.use(this.composite,this.scene,null,W,H);
    gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,this.targets[0].texture);
    gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,this.mask);
    const b=renderer.shaderBounds;this.uniform(this.composite,'maskBounds',b.dx/W,b.dy/H,b.width/W,b.height/H);
    this.uniform(this.composite,'sourceBounds',...bounds);
    this.uniform(this.composite,'grade',Math.max(.1,grade.exposure),Math.max(.1,grade.contrast),Math.max(0,grade.saturation));
    this.uniform(this.composite,'intensity',clamp(cfg.intensity,0,2));gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
    const ctx=renderer.ctx;ctx.save();ctx.imageSmoothingEnabled=false;ctx.globalCompositeOperation='copy';ctx.drawImage(this.canvas,0,0);ctx.restore();return true;
  }
}
function drawGpuPostProcess(renderer,W,H,z) {
  if(renderer.gpuPostProcess===false)return false;
  try{renderer.gpuPostProcess??=new WorldPostProcess();return renderer.gpuPostProcess.draw(renderer,W,H,z);}
  catch(error){console.warn('GPU post-processing unavailable; using Canvas fallback.',error);renderer.gpuPostProcess=false;return false;}
}
