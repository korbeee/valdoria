'use strict';
// =====================================================================================
//  SHADER CINEMATOGRÁFICO DO MENU (WebGL)
// =====================================================================================
// Pega o quadro já desenhado pelo jogo e passa por:
//   1. extração das áreas claras (joelho suave) em 1/4 da resolução
//   2. desfoque gaussiano em dois tamanhos  -> brilho (bloom) largo e macio
//   3. raios de luz crepusculares: desfoque RADIAL das áreas claras em direção ao sol (ou à
//      lava, ou à fogueira). Como é feito de desfoque de verdade, não existem bordas retas
//   4. composição: aberração cromática nas bordas, tilt-shift (foco no meio, borrado em cima e
//      embaixo), brilho + raios somados, "filmic tone map", tons frios nas sombras e quentes
//      nas luzes, saturação, vinheta, grão de filme e dither
// Cada cena escolhe seus parâmetros. Se o WebGL não estiver disponível, devolve false e o menu
// segue sem o shader.

class MenuFX {
  constructor() {
    this.ok = false;
    try {
      const c = this.canvas = document.createElement('canvas');
      const gl = this.gl = c.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: true });
      if (!gl) return;
      this.build();
      this.ok = true;
    } catch (e) { console.warn('[menu-fx] indisponível:', e); this.ok = false; }
  }
  build() {
    const gl = this.gl;
    const vs = 'attribute vec2 p; varying vec2 uv; void main(){ uv = p * .5 + .5; gl_Position = vec4(p, 0., 1.); }';
    const prog = (fs) => {
      const mk = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw Error(gl.getShaderInfoLog(s)); return s; };
      const pr = gl.createProgram(); gl.attachShader(pr, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(pr, mk(gl.FRAGMENT_SHADER, 'precision highp float; varying vec2 uv;\n' + fs));
      gl.linkProgram(pr); if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw Error(gl.getProgramInfoLog(pr));
      return { pr, loc: {}, attr: gl.getAttribLocation(pr, 'p') };
    };
    this.pBright = prog(`uniform sampler2D tex; uniform float thresh; uniform vec2 px;
      vec3 s(vec2 q){ return texture2D(tex, q).rgb; }
      void main(){ vec3 c = (s(uv) + s(uv + vec2(px.x, 0.)) + s(uv - vec2(px.x, 0.)) + s(uv + vec2(0., px.y)) + s(uv - vec2(0., px.y))) * .2;
        float l = dot(c, vec3(.2126, .7152, .0722)); float k = smoothstep(thresh, thresh + .28, l); gl_FragColor = vec4(c * k * 1.2, 1.); }`);
    this.pBlur = prog(`uniform sampler2D tex; uniform vec2 dir;
      void main(){ vec3 c = texture2D(tex, uv).rgb * .2270270270;
        c += (texture2D(tex, uv + dir * 1.3846153846).rgb + texture2D(tex, uv - dir * 1.3846153846).rgb) * .3162162162;
        c += (texture2D(tex, uv + dir * 3.2307692308).rgb + texture2D(tex, uv - dir * 3.2307692308).rgb) * .0702702703;
        gl_FragColor = vec4(c, 1.); }`);
    this.pRays = prog(`uniform sampler2D tex; uniform vec2 sun; uniform float len; uniform float decay;
      void main(){ vec2 d = (sun - uv) * len / 56.; vec2 q = uv; vec3 acc = vec3(0.); float w = 1.; float tot = 0.;
        for (int i = 0; i < 56; i++) { q += d; acc += texture2D(tex, q).rgb * w; tot += w; w *= decay; }
        gl_FragColor = vec4(acc / tot * 2.4, 1.); }`);
    this.pFinal = prog(`uniform sampler2D scene; uniform sampler2D bloomA; uniform sampler2D bloomB; uniform sampler2D rays;
      uniform vec2 res; uniform float time; uniform float bloom; uniform float rayAmt; uniform vec3 rayCol; uniform float exposure; uniform float contrast; uniform float sat;
      uniform vec3 shadowTint; uniform vec3 highTint; uniform float vig; uniform float ab; uniform float tilt; uniform float grain; uniform float fade; uniform float hazeAmt; uniform vec3 hazeCol; uniform vec2 sunUV; uniform float sunGlow; uniform float filmic;
      float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      vec3 sceneAt(vec2 q){ return texture2D(scene, q).rgb; }
      vec3 aces(vec3 x){ return clamp((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14), 0., 1.); }
      void main(){
        vec2 c = uv - .5; float r2 = dot(c * vec2(res.x / res.y, 1.), c * vec2(res.x / res.y, 1.));
        // aberração cromática crescendo para as bordas
        vec2 o = c * ab * (.25 + r2 * 3.);
        // tilt-shift: borra um pouco acima e abaixo da faixa de foco
        float blurK = smoothstep(.18, .5, abs(uv.y - .52)) * tilt;
        vec3 col = vec3(sceneAt(uv + o).r, sceneAt(uv).g, sceneAt(uv - o).b);
        if (blurK > .001) {
          vec3 acc = col; float n = 1.;
          for (int i = 0; i < 8; i++) { float a = float(i) * .785398; vec2 off = vec2(cos(a), sin(a)) * blurK * 5. / res; acc += sceneAt(uv + off); acc += sceneAt(uv + off * 2.); n += 2.; }
          col = mix(col, acc / n, clamp(blurK * 1.6, 0., 1.));
        }
        vec3 glow = texture2D(bloomA, uv).rgb * .38 + texture2D(bloomB, uv).rgb * .42;
        vec3 rr = texture2D(rays, uv).rgb;
        col += glow * bloom;
        col += rr * rayCol * rayAmt;
        { vec2 d = (uv - sunUV) * vec2(res.x / res.y, 1.); float h = max(0., 1. - length(d) * 1.15); col += rayCol * (h * h * h * .55 + h * h * .18) * sunGlow; }  // halo macio em volta do sol
        col = mix(col, hazeCol, hazeAmt * (1. - smoothstep(.0, .75, uv.y)) * .5);     // névoa de profundidade no alto
        col = max(col - .03, 0.) * 1.04;                                                // pretos de verdade: o brilho não lava a imagem
        col *= exposure;
        float l = dot(col, vec3(.2126, .7152, .0722));
        col = mix(col, col * shadowTint * 1.35, (1. - smoothstep(.0, .55, l)) * .55);   // sombras frias
        col = mix(col, col * highTint * 1.2, smoothstep(.35, 1.1, l) * .6);             // luzes quentes
        col = mix(col, aces(col), filmic);
        col = (col - .5) * contrast + .5;
        float g = dot(col, vec3(.2126, .7152, .0722)); col = mix(vec3(g), col, sat);
        col *= 1. - smoothstep(.2, 1.05, r2 * 2.2) * vig;
        col += (hash(uv * res + fract(time) * 91.7) - .5) * grain;
        col += (hash(uv * res * 1.3 + 7.) - .5) / 255.;
        gl_FragColor = vec4(col * fade, 1.); }`);
    this.quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.quad); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const tex = (f) => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, f], [gl.TEXTURE_MAG_FILTER, f], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v); return t; };
    this.scene = tex(gl.NEAREST);
    this.rt = [0, 1, 2, 3].map(() => ({ tex: tex(gl.LINEAR), fbo: gl.createFramebuffer(), w: 0, h: 0 }));
    this.size = '';
  }
  loc(p, name) { return p.loc[name] ??= this.gl.getUniformLocation(p.pr, name); }
  use(p) { const gl = this.gl; gl.useProgram(p.pr); gl.bindBuffer(gl.ARRAY_BUFFER, this.quad); gl.enableVertexAttribArray(p.attr); gl.vertexAttribPointer(p.attr, 2, gl.FLOAT, false, 0, 0); }
  target(i, w, h) {
    const gl = this.gl, t = this.rt[i];
    if (t.w !== w || t.h !== h) {
      gl.bindTexture(gl.TEXTURE_2D, t.tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, w, h, 0, gl.RGB, gl.UNSIGNED_BYTE, null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, t.fbo); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t.tex, 0); t.w = w; t.h = h;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, t.fbo); gl.viewport(0, 0, w, h);
    return t;
  }
  bind(unit, tex) { const gl = this.gl; gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex); if (unit) gl.activeTexture(gl.TEXTURE0); }
  // src: canvas 2D com o quadro. o: parâmetros da cena. Devolve o canvas WebGL pronto ou null.
  process(src, o) {
    if (!this.ok) return null;
    const gl = this.gl, W = src.width, H = src.height;
    if (gl.isContextLost()) return null;
    try {
      if (this.canvas.width !== W || this.canvas.height !== H) { this.canvas.width = W; this.canvas.height = H; }
      const qw = Math.max(2, W >> 2), qh = Math.max(2, H >> 2), ew = Math.max(2, W >> 3), eh = Math.max(2, H >> 3);
      gl.disable(gl.BLEND);
      for (let u = 3; u >= 1; u--) this.bind(u, null);               // sobras do quadro anterior (evita laço de realimentação)
      this.bind(0, this.scene); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, src);
      // 1) áreas claras
      let t = this.target(0, qw, qh); this.bind(0, this.scene); this.use(this.pBright);
      gl.uniform1i(this.loc(this.pBright, 'tex'), 0); gl.uniform1f(this.loc(this.pBright, 'thresh'), o.thresh ?? 0.62); gl.uniform2f(this.loc(this.pBright, 'px'), 1.5 / W, 1.5 / H);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      // 2) bloom em dois tamanhos: rt1 = largo (1/4), rt2 = enorme (1/8)
      const blur = (from, to, w, h, dx, dy) => { const tg = this.target(to, w, h); this.use(this.pBlur); this.bind(0, this.rt[from].tex); gl.uniform1i(this.loc(this.pBlur, 'tex'), 0); gl.uniform2f(this.loc(this.pBlur, 'dir'), dx / this.rt[from].w, dy / this.rt[from].h); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); return tg; };
      blur(0, 1, qw, qh, 1.2, 0); blur(1, 2, qw, qh, 0, 1.2);               // rt2: bloom médio
      blur(2, 1, ew, eh, 2.2, 0); blur(1, 3, ew, eh, 0, 2.2);               // rt3: bloom enorme (1/8)
      // 3) raios crepusculares a partir das áreas claras
      for (let u = 3; u >= 1; u--) this.bind(u, null);
      if ((o.rayAmt ?? 0) > 0.001) {
        this.target(1, qw, qh); this.use(this.pRays); this.bind(0, this.rt[0].tex);
        gl.uniform1i(this.loc(this.pRays, 'tex'), 0); gl.uniform2f(this.loc(this.pRays, 'sun'), o.sun?.[0] ?? 0.9, o.sun?.[1] ?? 0.9); gl.uniform1f(this.loc(this.pRays, 'len'), o.rayLen ?? 0.9); gl.uniform1f(this.loc(this.pRays, 'decay'), o.rayDecay ?? 0.965);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      } else { this.target(1, qw, qh); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT); }
      // 4) composição
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, W, H); this.use(this.pFinal);
      const P = this.pFinal, u = (n) => this.loc(P, n);
      this.bind(0, this.scene); this.bind(1, this.rt[2].tex); this.bind(2, this.rt[3].tex); this.bind(3, this.rt[1].tex);
      gl.uniform1i(u('scene'), 0); gl.uniform1i(u('bloomA'), 1); gl.uniform1i(u('bloomB'), 2); gl.uniform1i(u('rays'), 3);
      gl.uniform2f(u('res'), W, H); gl.uniform1f(u('time'), (performance.now() / 1000) % 100);
      gl.uniform1f(u('bloom'), o.bloom ?? 0.9); gl.uniform1f(u('rayAmt'), o.rayAmt ?? 0.5); gl.uniform3fv(u('rayCol'), o.rayCol ?? [1, .82, .55]);
      gl.uniform1f(u('exposure'), o.exposure ?? 1.05); gl.uniform1f(u('contrast'), o.contrast ?? 1.08); gl.uniform1f(u('sat'), o.sat ?? 1.18);
      gl.uniform3fv(u('shadowTint'), o.shadow ?? [.78, .9, 1.12]); gl.uniform3fv(u('highTint'), o.high ?? [1.12, 1.0, .82]);
      gl.uniform1f(u('vig'), o.vig ?? 0.55); gl.uniform1f(u('ab'), o.ab ?? 0.0012); gl.uniform1f(u('tilt'), o.tilt ?? 0.7); gl.uniform1f(u('grain'), o.grain ?? 0.045);
      gl.uniform2f(u('sunUV'), o.sun?.[0] ?? .9, o.sun?.[1] ?? .9); gl.uniform1f(u('sunGlow'), o.sunGlow ?? 0); gl.uniform1f(u('filmic'), o.filmic ?? 0.45); gl.uniform1f(u('fade'), o.fade ?? 1); gl.uniform1f(u('hazeAmt'), o.haze ?? 0.0); gl.uniform3fv(u('hazeCol'), o.hazeCol ?? [.6, .7, .9]);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      return this.canvas;
    } catch (e) { console.warn('[menu-fx] erro, desligando o shader:', e); this.ok = false; return null; }
  }
}
