'use strict';

// Sons da queda e do fogo dos destroços, todos sintetizados com Web Audio.
// Cadeia: fontes -> bus (abertura) / amb (fogo) -> abafador (lowpass) -> master -> compressor -> saída
class CrashAudio {
  constructor() {
    const A = window.AudioContext || window.webkitAudioContext;
    const a = (this.a = new A());
    this.master = a.createGain(); this.master.gain.value = 0.8;
    const comp = a.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 6;
    this.muffle = a.createBiquadFilter(); this.muffle.type = 'lowpass'; this.muffle.frequency.value = 18000;
    this.bus = a.createGain(); this.amb = a.createGain(); this.amb.gain.value = 0;
    this.bus.connect(this.muffle); this.amb.connect(this.muffle); this.muffle.connect(this.master); this.master.connect(comp); comp.connect(a.destination);
    this.white = this.makeNoise(2, false); this.brown = this.makeNoise(4, true);
    this.fireLevel = 0; this.sustained = {};
    a.resume().catch(() => {});
    this.startFireLoop();
  }

  get now() { return this.a.currentTime; }

  makeNoise(seconds, brown) {
    const a = this.a, buf = a.createBuffer(1, a.sampleRate * seconds, a.sampleRate), d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1;
      d[i] = brown ? (last = (last + w * 0.02) / 1.02) * 3.5 : w;
    }
    return buf;
  }

  filter(type, freq, q = 0.7) {
    const f = this.a.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; return f;
  }

  // Envelope simples: sobe em `attack`, cai exponencialmente até `dur`
  env(peak, when, attack, dur) {
    const g = this.a.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(peak, when + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    return g;
  }

  noise({ dur = 0.3, type = 'lowpass', freq = 1000, freqEnd, q = 0.7, gain = 0.3, attack = 0.005, delay = 0, brown = false, dest = this.bus }) {
    const t = this.now + delay, src = this.a.createBufferSource(), f = this.filter(type, freq, q), g = this.env(gain, t, attack, dur);
    src.buffer = brown ? this.brown : this.white; src.loop = true;
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    src.connect(f); f.connect(g); g.connect(dest);
    src.start(t, Math.random() * 1.5); src.stop(t + dur + 0.05);
  }

  tone({ type = 'sine', freq = 440, freqEnd, dur = 0.3, gain = 0.2, attack = 0.005, delay = 0, dest = this.bus }) {
    const t = this.now + delay, o = this.a.createOscillator(), g = this.env(gain, t, attack, dur);
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.05);
  }

  // ---------- Voo ----------
  engineStart() {
    const a = this.a, t = this.now, out = a.createGain(), lp = this.filter('lowpass', 420);
    out.gain.setValueAtTime(0.0001, t); out.gain.linearRampToValueAtTime(0.32, t + 1.2);
    lp.connect(out); out.connect(this.bus);
    const lfo = a.createOscillator(), lfoGain = a.createGain();
    lfo.frequency.value = 6.5; lfoGain.gain.value = 1.8; lfo.connect(lfoGain); lfo.start();
    const oscs = [['sawtooth', 76], ['sawtooth', 77.4], ['sine', 38], ['triangle', 152.6]].map(([type, f]) => {
      const o = a.createOscillator(); o.type = type; o.frequency.value = f; lfoGain.connect(o.frequency); o.connect(lp); o.start(); return o;
    });
    const hiss = a.createBufferSource(), hissF = this.filter('bandpass', 900, 0.6), hissG = a.createGain();
    hiss.buffer = this.brown; hiss.loop = true; hissG.gain.value = 0.5; hiss.connect(hissF); hissF.connect(hissG); hissG.connect(out); hiss.start();
    this.sustained.engine = { out, oscs: [...oscs, lfo, hiss] };
  }

  // Motor engasga: cortes aleatórios de volume e rotação caindo
  engineFail() {
    const e = this.sustained.engine; if (!e) return;
    const t = this.now;
    for (const o of e.oscs) {
      if (!o.frequency || o === e.oscs[4]) continue; // o LFO mantém o ritmo
      o.frequency.setValueAtTime(o.frequency.value, t);
      o.frequency.exponentialRampToValueAtTime(Math.max(12, o.frequency.value * 0.45), t + 4);
    }
    let k = t;
    while (k < t + 3.6) {
      e.out.gain.setValueAtTime(0.34, k); k += 0.08 + Math.random() * 0.22;
      e.out.gain.setValueAtTime(0.06, k); k += 0.04 + Math.random() * 0.12;
    }
    e.out.gain.linearRampToValueAtTime(0.14, t + 4.2);
  }

  alarm(dur = 4) {
    for (let k = 0; k < dur / 0.5; k++) {
      this.tone({ type: 'square', freq: 880, dur: 0.16, gain: 0.05, delay: k * 0.5 });
      this.tone({ type: 'square', freq: 660, dur: 0.16, gain: 0.05, delay: k * 0.5 + 0.2 });
    }
  }

  radio(dur = 1.2) {
    this.tone({ type: 'sine', freq: 1250, dur: 0.07, gain: 0.08 });
    for (let k = 0; k < dur / 0.09; k++) this.noise({ dur: 0.1, type: 'bandpass', freq: 1400 + Math.random() * 1400, q: 1.6, gain: 0.05 + Math.random() * 0.12, delay: 0.05 + k * 0.09 });
    this.tone({ type: 'sine', freq: 950, dur: 0.06, gain: 0.07, delay: dur + 0.1 });
  }

  // Estouro (motor pegando fogo, tanque explodindo ao longe)
  boom(size = 1, delay = 0) {
    this.noise({ dur: 1.2 + size, freq: 1400 * size, freqEnd: 120, gain: 0.55 * size, delay, brown: false });
    this.noise({ dur: 2 + size * 1.5, freq: 260, gain: 0.7 * size, attack: 0.02, delay, brown: true });
    this.tone({ freq: 80, freqEnd: 26, dur: 1.2 + size * 0.6, gain: 0.8 * size, delay });
  }

  metal(delay = 0, gain = 0.12) {
    for (const f of [311, 467, 733, 1180]) this.tone({ type: 'triangle', freq: f * (0.9 + Math.random() * 0.2), freqEnd: f * 0.7, dur: 1.4, gain, delay });
  }

  windRush(dur) {
    this.noise({ dur, type: 'bandpass', freq: 380, freqEnd: 2600, q: 0.9, gain: 0.55, attack: dur * 0.85 });
    this.tone({ type: 'sawtooth', freq: 220, freqEnd: 900, dur, gain: 0.05, attack: dur * 0.9 });
  }

  // Impacto no chão: pancada grave, estrondo, metal retorcido e pedaços caindo
  impact() {
    this.boom(1.4);
    this.noise({ dur: 0.5, type: 'highpass', freq: 1800, gain: 0.5 });
    this.metal(0.05, 0.16); this.metal(0.7, 0.08);
    for (let k = 0; k < 26; k++) this.noise({ dur: 0.04 + Math.random() * 0.08, type: 'bandpass', freq: 600 + Math.random() * 3000, q: 3, gain: 0.08 + Math.random() * 0.14, delay: 0.3 + Math.random() * 2.6 });
  }

  stopSustained(fade = 0.4) {
    const e = this.sustained.engine; if (!e) return;
    e.out.gain.cancelScheduledValues(this.now); e.out.gain.setTargetAtTime(0.0001, this.now, fade / 4);
    setTimeout(() => e.oscs.forEach((o) => { try { o.stop(); } catch (_) {} }), fade * 1000 + 200);
    this.sustained.engine = null;
  }

  // ---------- Desmaio e despertar ----------
  heartbeat(count, interval = 0.95, delay = 0) {
    for (let k = 0; k < count; k++) {
      const d = delay + k * interval;
      this.tone({ freq: 62, freqEnd: 40, dur: 0.18, gain: 0.5, delay: d });
      this.tone({ freq: 55, freqEnd: 36, dur: 0.2, gain: 0.35, delay: d + 0.24 });
    }
  }

  tinnitus(dur) { this.tone({ freq: 3900, dur, gain: 0.045, attack: 0.3 }); }

  cough(delay = 0) {
    for (let k = 0; k < 3; k++) this.noise({ dur: 0.16, type: 'bandpass', freq: 700 + k * 90, q: 1.2, gain: 0.26 - k * 0.05, attack: 0.01, delay: delay + k * 0.27 });
  }

  setMuffle(freq, seconds) {
    const f = this.muffle.frequency;
    f.cancelScheduledValues(this.now); f.setValueAtTime(f.value, this.now); f.exponentialRampToValueAtTime(freq, this.now + seconds);
  }

  // ---------- Chuva ----------
  setRain(level, exposure = 1) {
    if (!this.rainGain) {
      this.rainGain = this.a.createGain(); this.rainGain.gain.value = 0; this.rainGain.connect(this.muffle); this.rainLevel = 0;
      const hiss = this.a.createBufferSource(), hp = this.filter('highpass', 1100), lp = this.filter('lowpass', 7500);
      this.rainFilter = lp;
      hiss.buffer = this.white; hiss.loop = true; hiss.connect(hp); hp.connect(lp); lp.connect(this.rainGain); hiss.start();
      const body = this.a.createBufferSource(), bl = this.filter('lowpass', 480), bg = this.a.createGain();
      body.buffer = this.brown; body.loop = true; bg.gain.value = 0.8; body.connect(bl); bl.connect(bg); bg.connect(this.rainGain); body.start();
    }
    this.rainFilter?.frequency.setTargetAtTime(900+6600*clamp(exposure,0,1),this.now,.5);
    if (Math.abs(level - this.rainLevel) < 0.01) return;
    this.rainLevel = level;
    this.rainGain.gain.setTargetAtTime(level * 0.15, this.now, 0.3);
  }

  // Gotas batendo no metal dos destroços
  rainTick(dt, level) {
    if (level > 0.05 && Math.random() < dt * 16 * level)
      this.noise({ dur: 0.03, type: 'bandpass', freq: 2200 + Math.random() * 4000, q: 5, gain: 0.02 + Math.random() * 0.05 * level });
  }

  thunder(delay, size = 1) {
    this.noise({ dur: 0.6, freq: 3200, freqEnd: 260, gain: 0.3 * size, delay });
    this.noise({ dur: 4 + size * 2.5, freq: 150, gain: 0.7 * size, attack: 0.3, delay: delay + 0.05, brown: true });
    this.tone({ freq: 46, freqEnd: 26, dur: 3.2, gain: 0.35 * size, attack: 0.35, delay });
  }

  // Chiado de vapor quando um foco apaga
  hiss(level) {
    this.noise({ dur: 1.6, type: 'highpass', freq: 3200, freqEnd: 1400, gain: 0.16 * level, attack: 0.04 });
  }

  // Golpe no metal dos destroços
  clank() {
    const f = 650 + Math.random() * 550;
    this.tone({ type: 'triangle', freq: f, freqEnd: f * 0.8, dur: 0.24, gain: 0.12 });
    this.tone({ type: 'square', freq: f * 2.37, dur: 0.07, gain: 0.025 });
    this.noise({ dur: 0.07, type: 'highpass', freq: 2500, gain: 0.14 });
  }

  // Destroço se desfazendo em sucata (size 0..1)
  breakMetal(size) {
    this.metal(0, 0.03 + 0.08 * size);
    this.noise({ dur: 0.3 + 0.8 * size, freq: 900, freqEnd: 150, gain: 0.1 + 0.35 * size, brown: true });
    for (let k = 0; k < 6 + size * 12; k++)
      this.noise({ dur: 0.04 + Math.random() * 0.06, type: 'bandpass', freq: 800 + Math.random() * 3000, q: 3, gain: 0.07 + Math.random() * 0.1, delay: 0.08 + Math.random() * (0.4 + size) });
  }

  // Trava da maleta abrindo
  latch() {
    this.tone({ type: 'square', freq: 1900, dur: 0.03, gain: 0.05 });
    this.tone({ type: 'square', freq: 1500, dur: 0.03, gain: 0.05, delay: 0.07 });
    this.noise({ dur: 0.25, type: 'bandpass', freq: 900, q: 0.8, gain: 0.08, delay: 0.1 });
  }

  // ---------- Fogo ambiente ----------
  startFireLoop() {
    const src = this.a.createBufferSource(), f = this.filter('lowpass', 650), g = this.a.createGain();
    src.buffer = this.brown; src.loop = true; g.gain.value = 0.9;
    src.connect(f); f.connect(g); g.connect(this.amb); src.start();
  }

  // level 0..1 conforme a distância até o fogo mais próximo
  tick(dt, level) {
    this.fireLevel += (level - this.fireLevel) * Math.min(1, dt * 3);
    this.amb.gain.value = this.fireLevel * 0.35;
    if (this.fireLevel < 0.02) return;
    if (Math.random() < dt * 22 * this.fireLevel)
      this.noise({ dur: 0.015 + Math.random() * 0.05, type: 'bandpass', freq: 1500 + Math.random() * 4500, q: 2, gain: (0.06 + Math.random() * 0.2) * this.fireLevel, dest: this.amb });
    if (Math.random() < dt * 0.12 * this.fireLevel) this.metal(0, 0.025 * this.fireLevel); // metal rangendo com o calor
  }
}
