'use strict';

// Sons do jogo (fora da abertura), sintetizados com Web Audio sobre o CrashAudio.
// playSfx(nome, x, y, opções): o volume cai com a distância, o som vai para o lado certo (estéreo)
// e dentro de cavernas ganha eco.
const SFX_RANGE = 26; // tiles
const MATERIAL = {
  [TILE.STONE]: 'stone', [TILE.COAL_ORE]: 'stone', [TILE.IRON_ORE]: 'stone', [TILE.BEDROCK]: 'stone', [TILE.BRICK]: 'stone', [TILE.STONE_BRICK]: 'stone',
  [TILE.DIRT]: 'dirt', [TILE.GRASS]: 'grass', [TILE.SAKURA_GRASS]:'grass', [TILE.SAND]: 'sand', [TILE.GLASS]: 'glass', [TILE.LEAVES]: 'leaves',
  [TILE.SNOW]: 'sand', [TILE.ICE]: 'glass', [TILE.MUD]: 'dirt', [TILE.JUNGLE_GRASS]: 'grass', [TILE.SANDSTONE]: 'stone', [TILE.CACTUS]: 'wood', [TILE.COBWEB]: 'leaves', [TILE.BEAM]: 'wood', [TILE.DRY_GRASS]: 'grass',
  [TILE.TRUNK]: 'wood', [TILE.STUMP]: 'wood', [TILE.PLANKS]: 'wood', [TILE.DOOR]: 'wood', [TILE.DOOR_OPEN]: 'wood', [TILE.CHEST]: 'wood', [TILE.CAMPFIRE]: 'wood', [TILE.TORCH]: 'wood',
};
const matOf = (t) => MATERIAL[t] || 'stone';
const rr = (a, b) => a + Math.random() * (b - a);
const MOB_SFX = {
  pig: 'pig', undead: 'zombie', bat: 'bat', slime: 'slime', bomber: 'bomber',
  rabbit: 'rabbit', snowhare: 'rabbit', wolf: 'wolf', frostwolf: 'wolf', tortoise: 'tortoise', scorpion: 'bug', spider: 'bug', bird: 'bird',
  elephant: 'elephant', tiger: 'tiger', hyena: 'wolf',
  sika: 'sika', tanuki: 'tanuki', tsuru: 'tsuru', kitsune: 'kitsune',
};

// Barramento dos efeitos: sinal seco + envio para o eco de caverna
function sfxBus(A) {
  if (A.sfxDry) return;
  const a = A.a, len = a.sampleRate * 1.8, ir = a.createBuffer(2, len, a.sampleRate), conv = a.createConvolver();
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3; }
  conv.buffer = ir;
  A.sfxDry = a.createGain(); A.sfxDry.connect(A.muffle);
  A.sfxWet = a.createGain(); A.sfxWet.gain.value = 0.05;
  A.sfxSend = a.createGain(); A.sfxSend.connect(conv); conv.connect(A.sfxWet); A.sfxWet.connect(A.muffle);
}

// Saída de um som posicionado; null se estiver longe demais
function sfxOut(A, x, y, vol) {
  const p = game.player, dx = x - p.cx, d = Math.hypot(dx, y - p.cy) / T;
  if (d > SFX_RANGE) return null;
  const g = A.a.createGain(), pan = A.a.createStereoPanner();
  g.gain.value = vol * (1 - d / SFX_RANGE) ** 1.6;
  pan.pan.value = clamp(dx / (T * 16), -0.75, 0.75);
  g.connect(pan); pan.connect(A.sfxDry); pan.connect(A.sfxSend);
  setTimeout(() => { g.disconnect(); pan.disconnect(); }, 4000);
  return g;
}

function playSfx(name, x, y, opts = {}) {
  const A = game.crashAudio; if (!A || !SFX[name]) return;
  sfxBus(A);
  const o = sfxOut(A, x ?? game.player.cx, y ?? game.player.cy, opts.vol ?? 1);
  if (o) SFX[name](A, o, opts);
}

// what: 'Hurt' ou 'Death'
function mobSfx(m, what) { playSfx(MOB_SFX[m.kind ?? 'pig'] + what, m.cx, m.cy); }

// ---------- Blocos de construção do som ----------
const N = (A, o, opts) => A.noise({ ...opts, dest: o });
const Tn = (A, o, opts) => A.tone({ ...opts, dest: o });
function grains(A, o, n, fLo, fHi, spread, gain, delay = 0) {
  for (let i = 0; i < n; i++) N(A, o, { type: 'bandpass', freq: rr(fLo, fHi), q: 3, dur: rr(0.02, 0.06), gain: gain * rr(0.5, 1.2), delay: delay + Math.random() * spread });
}
function rustle(A, o, dur, gain, delay = 0) {
  N(A, o, { type: 'highpass', freq: 2600, dur, gain, attack: dur * 0.3, delay });
  N(A, o, { type: 'bandpass', freq: 1200, q: 0.6, dur: dur * 0.8, gain: gain * 0.5, attack: dur * 0.2, delay });
  grains(A, o, 5, 2500, 6000, dur, gain * 0.35, delay);
}
// Voz de bicho: oscilador passando por filtros de formante, com vibrato
function voice(A, o, { type = 'sawtooth', f0, f1, dur, gain, formants, attack = 0.02, delay = 0, vib = 0, vibRate = 6 }) {
  const a = A.a, t = A.now + delay, osc = a.createOscillator(), g = A.env(gain, t, attack, dur);
  osc.type = type; osc.frequency.setValueAtTime(f0, t);
  if (f1) osc.frequency.exponentialRampToValueAtTime(f1, t + dur);
  if (vib) { const l = a.createOscillator(), lg = a.createGain(); l.frequency.value = vibRate; lg.gain.value = vib; l.connect(lg); lg.connect(osc.frequency); l.start(t); l.stop(t + dur + 0.05); }
  for (const [ff, q] of formants) { const f = A.filter('bandpass', ff, q); osc.connect(f); f.connect(g); }
  g.connect(o); osc.start(t); osc.stop(t + dur + 0.05);
}

// Voz grossa e rouca (canibal): duas serras desafinadas com a altura tremendo à toa, "voz rouca"
// (a amplitude pulsa a ~30 Hz, como a garganta estalando), distorção e vogais que se arrastam
// (formantes andando de "uuu" para "aaa" e fechando em "rrg"). Um corpo grave dá o peito.
function rasp(A, k) {
  if ((A.raspCurves ??= {})[k]) return A.raspCurves[k];
  const c = new Float32Array(1024);
  for (let i = 0; i < c.length; i++) { const x = i / 511.5 - 1; c[i] = Math.tanh(x * k) / Math.tanh(k); }
  return (A.raspCurves[k] = c);
}
function groan(A, o, { f0, f1 = f0, dur, gain, attack = 0.12, delay = 0, vowels = [[320, 760], [640, 1080], [420, 880]], fry = 32, drive = 5, wobble = 0.07, breath = 0.3 }) {
  const a = A.a, t = A.now + delay, stop = t + dur + 0.08;
  // Altura: de f0 a f1, com tremidas aleatórias
  const pts = 24, curve = new Float32Array(pts);
  let drift = 0;
  for (let i = 0; i < pts; i++) { drift = drift * 0.6 + (Math.random() * 2 - 1) * wobble; curve[i] = (f0 + (f1 - f0) * i / (pts - 1)) * (1 + drift); }
  const src = a.createGain(); src.gain.value = 0.5;
  for (const det of [-14, 11]) {
    const osc = a.createOscillator(); osc.type = 'sawtooth'; osc.detune.value = det;
    osc.frequency.setValueCurveAtTime(curve, t, dur);
    osc.connect(src); osc.start(t); osc.stop(stop);
  }
  const shaper = a.createWaveShaper(); shaper.curve = rasp(A, drive); shaper.oversample = '2x';
  // Voz rouca: modula o volume com um pulso irregular
  const fryG = a.createGain(); fryG.gain.value = 0.55;
  const lfo = a.createOscillator(), lfoG = a.createGain(); lfo.type = 'square';
  lfo.frequency.setValueAtTime(fry * rr(0.85, 1.15), t); lfo.frequency.linearRampToValueAtTime(fry * rr(0.6, 1.3), t + dur);
  lfoG.gain.value = 0.45; lfo.connect(lfoG); lfoG.connect(fryG.gain); lfo.start(t); lfo.stop(stop);
  src.connect(shaper); shaper.connect(fryG);
  const env = A.env(gain, t, attack, dur), tone = A.filter('lowpass', 2800, 0.5);
  // Vogais: dois formantes andando pelos pontos de `vowels`
  for (let k = 0; k < 2; k++) {
    const f = A.filter('bandpass', vowels[0][k], k ? 7 : 5);
    f.frequency.setValueAtTime(vowels[0][k], t);
    vowels.forEach((v, i) => i && f.frequency.linearRampToValueAtTime(v[k], t + dur * i / (vowels.length - 1)));
    const fg = a.createGain(); fg.gain.value = k ? 0.7 : 1;
    fryG.connect(f); f.connect(fg); fg.connect(env);
  }
  const body = A.filter('lowpass', 260, 1.2), bg = a.createGain(); bg.gain.value = 0.35; // peito
  fryG.connect(body); body.connect(bg); bg.connect(env);
  env.connect(tone); tone.connect(o);
  // Ar saindo pela garganta
  if (breath) N(A, o, { type: 'bandpass', freq: rr(900, 1300), q: 1.2, dur: dur * 1.05, gain: gain * breath * 0.12, attack: attack * 1.5, delay, brown: false });
}
// ---------- Catálogo ----------
const SFX = {
  // ---------- Bichos dos biomas ----------
  // ---------- Vale das Cerejeiras (bichos de js/sakura-fauna.js) ----------
  // Sika: o assobio fino do veado de Nara — sobe de repente, segura e despenca.
  sikaIdle(A, o) {
    const f = rr(1450, 1850);
    Tn(A, o, { type: 'triangle', freq: f * 0.68, freqEnd: f, dur: 0.09, gain: 0.09 });
    Tn(A, o, { type: 'triangle', freq: f, freqEnd: f * 0.55, dur: 0.5, gain: 0.11, delay: 0.09 });
    Tn(A, o, { type: 'sine', freq: f * 2, freqEnd: f * 1.1, dur: 0.45, gain: 0.03, delay: 0.09 });
    N(A, o, { type: 'highpass', freq: 4200, dur: 0.35, gain: 0.035, attack: 0.05, delay: 0.08 }); // ar do assobio
  },
  sikaStep(A, o) { N(A, o, { freq: 300, dur: 0.05, gain: 0.14, brown: true }); },
  sikaHurt(A, o) { voice(A, o, { type: 'triangle', f0: 1150, f1: 1750, dur: 0.16, gain: 0.55, formants: [[2200, 4]], vib: 45, vibRate: 24 }); SFX.flesh(A, o); },
  sikaDeath(A, o) { voice(A, o, { type: 'triangle', f0: 1600, f1: 480, dur: 0.5, gain: 0.55, formants: [[1800, 3], [3000, 5]], vib: 20, vibRate: 9 }); },

  // Tanuki: grunhido gordo de garganta, e de vez em quando um ganido nasal de cachorrinho.
  tanukiIdle(A, o) {
    if (Math.random() < 0.38) voice(A, o, { f0: 250, f1: 320, dur: 0.45, gain: 0.7, formants: [[720, 5], [1500, 7]], vib: 26, vibRate: 17, attack: 0.06 });
    else { voice(A, o, { f0: 132, f1: 104, dur: 0.34, gain: 0.85, formants: [[430, 4], [900, 5]], vib: 15, vibRate: 27 });
      N(A, o, { type: 'bandpass', freq: 700, q: 1.5, dur: 0.2, gain: 0.06, delay: 0.3 }); } // fungada no fim
  },
  tanukiStep(A, o) { N(A, o, { freq: 260, dur: 0.05, gain: 0.11, brown: true }); },
  tanukiHurt(A, o) { voice(A, o, { f0: 680, f1: 460, dur: 0.17, gain: 0.9, formants: [[1100, 4], [2000, 6]] }); SFX.flesh(A, o); },
  tanukiDeath(A, o) { voice(A, o, { f0: 560, f1: 190, dur: 0.5, gain: 0.9, formants: [[900, 4]], vib: 22, vibRate: 11 }); },

  // Grou-tsuru: o clarim. Duas notas abertas e ressonantes, a segunda caindo com tremor.
  tsuruIdle(A, o) {
    voice(A, o, { type: 'sawtooth', f0: 500, f1: 640, dur: 0.32, gain: 0.75, formants: [[900, 9], [1900, 11], [3100, 13]], attack: 0.05 });
    voice(A, o, { type: 'sawtooth', f0: 720, f1: 420, dur: 0.62, gain: 0.65, formants: [[1050, 9], [2200, 11]], attack: 0.03, delay: 0.36, vib: 14, vibRate: 7 });
    N(A, o, { type: 'highpass', freq: 3000, dur: 0.2, gain: 0.03, delay: 0.36 });
  },
  tsuruStep(A, o) { N(A, o, { type: 'bandpass', freq: rr(900, 1400), q: 2, dur: 0.04, gain: 0.07 }); },
  tsuruHurt(A, o) { voice(A, o, { type: 'sawtooth', f0: 1100, f1: 780, dur: 0.14, gain: 0.7, formants: [[1800, 6], [3200, 8]] }); SFX.flesh(A, o); },
  tsuruDeath(A, o) { voice(A, o, { type: 'sawtooth', f0: 900, f1: 320, dur: 0.55, gain: 0.7, formants: [[1400, 6]], vib: 18, vibRate: 9 });
    for (let i = 0; i < 4; i++) N(A, o, { type: 'bandpass', freq: rr(1000, 1600), q: 1, dur: 0.05, gain: 0.08, delay: 0.3 + i * 0.07 }); }, // asas batendo

  // Raposa-kitsune: a latida rouca e aguda, dois ou três gritos seguidos.
  kitsuneIdle(A, o) {
    const n = 2 + (Math.random() < 0.45 ? 1 : 0);
    for (let i = 0; i < n; i++)
      voice(A, o, { f0: rr(840, 1000), f1: rr(500, 640), dur: 0.13, gain: 0.95, formants: [[1500, 5], [2700, 7]], delay: i * rr(0.2, 0.26), vib: 34, vibRate: 26 });
  },
  kitsuneStep(A, o) { N(A, o, { freq: 330, dur: 0.045, gain: 0.1, brown: true }); },
  kitsuneAlert(A, o) { // grito longo de quando ela avista o jogador
    voice(A, o, { f0: 950, f1: 1150, dur: 0.3, gain: 1.1, formants: [[1600, 5], [2900, 8]], vib: 45, vibRate: 20, attack: 0.03 });
    voice(A, o, { f0: 1100, f1: 620, dur: 0.22, gain: 0.9, formants: [[1700, 5]], delay: 0.3, vib: 30, vibRate: 24 });
  },
  kitsuneAttack(A, o) { // a dentada: um estalo seco e um rosnado curtinho
    N(A, o, { type: 'bandpass', freq: 1800, q: 2, dur: 0.05, gain: 0.3 });
    voice(A, o, { f0: 420, f1: 260, dur: 0.12, gain: 0.8, formants: [[900, 4], [1800, 6]], vib: 30, vibRate: 30 });
  },
  kitsuneHurt(A, o) { voice(A, o, { f0: 1050, f1: 700, dur: 0.15, gain: 1, formants: [[1600, 4], [2800, 6]], vib: 40, vibRate: 28 }); SFX.flesh(A, o); },
  kitsuneDeath(A, o) { voice(A, o, { f0: 900, f1: 300, dur: 0.55, gain: 1, formants: [[1300, 4]], vib: 26, vibRate: 12 }); },

  rabbitIdle(A, o) { for (let i = 0; i < 3; i++) N(A, o, { type: 'bandpass', freq: rr(2500, 3500), q: 3, dur: 0.035, gain: 0.08, delay: i * 0.08 }); }, // fungadinha
  rabbitStep(A, o) { N(A, o, { freq: 320, dur: 0.06, gain: 0.16, brown: true }); },
  rabbitHurt(A, o) { voice(A, o, { type: 'triangle', f0: 1400, f1: 2200, dur: 0.12, gain: 0.5, formants: [[2000, 3]], vib: 60, vibRate: 30 }); SFX.flesh(A, o); },
  rabbitDeath(A, o) { voice(A, o, { type: 'triangle', f0: 2000, f1: 700, dur: 0.3, gain: 0.5, formants: [[1600, 3]] }); },
  wolfIdle(A, o) {
    if (Math.random() < 0.3) voice(A, o, { f0: 320, f1: 520, dur: 1.3, gain: 1, formants: [[800, 6], [1400, 8]], attack: 0.3, vib: 6, vibRate: 5 }); // uivo
    else voice(A, o, { f0: 85, f1: 70, dur: 0.7, gain: 1.3, formants: [[300, 4], [700, 5]], vib: 18, vibRate: 30, attack: 0.08 }); // rosnado
  },
  wolfStep(A, o) { N(A, o, { freq: 350, dur: 0.05, gain: 0.12, brown: true }); },
  wolfHurt(A, o) { voice(A, o, { f0: 900, f1: 600, dur: 0.18, gain: 1, formants: [[1200, 4], [2200, 6]] }); SFX.flesh(A, o); },
  wolfDeath(A, o) { voice(A, o, { f0: 700, f1: 260, dur: 0.6, gain: 1, formants: [[1000, 4]], vib: 20, vibRate: 10 }); N(A, o, { freq: 260, dur: 0.3, gain: 0.5, brown: true, delay: 0.5 }); },
  wolfHowl(A, o) {
    voice(A, o, { f0: 300, f1: 560, dur: 1.6, gain: 1.1, formants: [[800, 6], [1400, 8]], attack: 0.4, vib: 7, vibRate: 5 });
    voice(A, o, { f0: 560, f1: 380, dur: 0.9, gain: 0.8, formants: [[900, 6]], attack: 0.1, delay: 1.5, vib: 6, vibRate: 4 });
  },
  wolfAlert(A, o) { // rosnado seguido de dois latidos
    voice(A, o, { f0: 90, f1: 75, dur: 0.5, gain: 1.4, formants: [[300, 4], [700, 5]], vib: 20, vibRate: 32, attack: 0.05 });
    for (const d of [0.5, 0.72]) voice(A, o, { f0: 430, f1: 300, dur: 0.12, gain: 1.1, formants: [[900, 4], [1600, 5]], delay: d });
  },
  tortoiseIdle(A, o) { N(A, o, { type: 'highpass', freq: 2500, dur: 0.5, gain: 0.1, attack: 0.1 }); }, // chiado
  tortoiseStep(A, o) { N(A, o, { freq: 220, dur: 0.09, gain: 0.2, brown: true }); },
  tortoiseHurt(A, o) { Tn(A, o, { type: 'triangle', freq: 420, dur: 0.08, gain: 0.25 }); N(A, o, { type: 'bandpass', freq: 1800, q: 3, dur: 0.05, gain: 0.3 }); },
  tortoiseDeath(A, o) { SFX.tortoiseHurt(A, o); N(A, o, { freq: 300, dur: 0.3, gain: 0.4, brown: true, delay: 0.1 }); },
  bugIdle(A, o) { for (let i = 0; i < 5; i++) N(A, o, { type: 'bandpass', freq: rr(3500, 6000), q: 6, dur: 0.015, gain: 0.1, delay: i * rr(0.03, 0.06) }); }, // estalos
  bugStep(A, o) { N(A, o, { type: 'bandpass', freq: rr(4000, 6500), q: 5, dur: 0.012, gain: 0.05 }); },
  bugHurt(A, o) { N(A, o, { type: 'highpass', freq: 3000, dur: 0.15, gain: 0.3 }); SFX.flesh(A, o); },
  bugDeath(A, o) { N(A, o, { type: 'bandpass', freq: 1500, q: 1, dur: 0.2, gain: 0.4 }); SFX.bugIdle(A, o); },
  birdIdle(A, o) { const f = rr(2600, 3400); for (let i = 0; i < 3; i++) Tn(A, o, { freq: f * rr(0.9, 1.1), freqEnd: f * 1.4, dur: 0.06, gain: 0.07, delay: i * 0.1 }); }, // piado
  birdFlap(A, o) { N(A, o, { type: 'bandpass', freq: rr(1100, 1500), q: 1, dur: 0.04, gain: 0.08 }); },
  birdHurt(A, o) { Tn(A, o, { type: 'square', freq: 2800, freqEnd: 1800, dur: 0.1, gain: 0.06 }); SFX.flesh(A, o); },
  birdDeath(A, o) { Tn(A, o, { type: 'triangle', freq: 3000, freqEnd: 900, dur: 0.25, gain: 0.1 }); N(A, o, { type: 'highpass', freq: 3000, dur: 0.3, gain: 0.15, attack: 0.02 }); },

  // ---------- Arco, flechas e árvores caindo ----------
  bowDraw(A, o) { N(A, o, { type: 'bandpass', freq: 500, freqEnd: 1100, q: 9, dur: 0.6, gain: 0.5, attack: 0.3 }); },
  bowRelease(A, o, { power = 1 }) {
    Tn(A, o, { type: 'triangle', freq: 180, freqEnd: 90, dur: 0.12, gain: 0.4 * power });
    N(A, o, { type: 'bandpass', freq: 900, freqEnd: 2600, q: 1.5, dur: 0.2, gain: 0.3 * power, attack: 0.02 });
  },
  arrowHit(A, o, { tile }) {
    if (tile != null) SFX.hit(A, o, { tile }); else SFX.flesh(A, o);
    Tn(A, o, { type: 'triangle', freq: rr(260, 340), freqEnd: 200, dur: 0.08, gain: 0.2 });
  },
  treeFall(A, o) { N(A, o, { type: 'bandpass', freq: 320, freqEnd: 170, q: 9, dur: 1, gain: 0.9, attack: 0.25 }); rustle(A, o, 0.8, 0.25, 0.2); },
  treeLand(A, o, { size = 1 }) {
    N(A, o, { freq: 280, dur: 0.6, gain: 1, brown: true });
    Tn(A, o, { freq: 70, freqEnd: 35, dur: 0.45, gain: 0.7 * size });
    rustle(A, o, 0.7, 0.4, 0.05); grains(A, o, 8, 1500, 4000, 0.4, 0.1, 0.05);
  },

  // Golpe de ferramenta ou da mão num bloco
  hit(A, o, { tile }) {
    const m = matOf(tile);
    if (m === 'stone') {
      Tn(A, o, { type: 'triangle', freq: rr(900, 1300), freqEnd: 600, dur: 0.07, gain: 0.14 });
      N(A, o, { type: 'bandpass', freq: rr(2400, 3600), q: 1.3, dur: 0.09, gain: 0.4 });
      N(A, o, { freq: 700, dur: 0.12, gain: 0.35, brown: true });
      grains(A, o, 3, 3000, 6000, 0.1, 0.08, 0.02);
    } else if (m === 'wood') {
      const f = rr(170, 250);
      Tn(A, o, { type: 'triangle', freq: f, freqEnd: f * 0.85, dur: 0.14, gain: 0.35 });
      Tn(A, o, { freq: f * 2.7, dur: 0.05, gain: 0.1 });
      N(A, o, { type: 'bandpass', freq: rr(900, 1400), q: 2.5, dur: 0.07, gain: 0.35 });
      N(A, o, { freq: 420, dur: 0.1, gain: 0.25, brown: true });
    } else if (m === 'leaves') rustle(A, o, 0.18, 0.3);
    else if (m === 'glass') {
      Tn(A, o, { freq: rr(2400, 3000), dur: 0.12, gain: 0.08 });
      N(A, o, { type: 'highpass', freq: 3000, dur: 0.05, gain: 0.25 });
    } else {
      N(A, o, { freq: rr(500, 800), freqEnd: 180, dur: 0.15, gain: 0.6, brown: true });
      Tn(A, o, { freq: 120, freqEnd: 55, dur: 0.09, gain: 0.3 });
      N(A, o, { type: 'bandpass', freq: m === 'sand' ? 2200 : 1400, q: 0.8, dur: 0.12, gain: m === 'sand' ? 0.25 : 0.14 });
      if (m === 'grass') N(A, o, { type: 'highpass', freq: 4000, dur: 0.12, gain: 0.08, attack: 0.01 });
    }
  },

  break(A, o, { tile, tree }) {
    const m = matOf(tile);
    if (m === 'stone') {
      N(A, o, { type: 'highpass', freq: 2000, dur: 0.06, gain: 0.35 });
      N(A, o, { freq: 600, freqEnd: 140, dur: 0.4, gain: 0.6, brown: true });
      grains(A, o, 11, 1500, 5000, 0.3, 0.13);
    } else if (m === 'wood') {
      N(A, o, { type: 'bandpass', freq: 2000, q: 1, dur: 0.05, gain: 0.5 });
      [150, 230].forEach((f, i) => Tn(A, o, { type: 'triangle', freq: f * rr(0.9, 1.1), freqEnd: f * 0.8, dur: 0.18, gain: 0.25, delay: i * 0.04 }));
      grains(A, o, 6, 2500, 5000, 0.2, 0.12, 0.03);
      if (tree) { // árvore rangendo e caindo
        N(A, o, { type: 'bandpass', freq: 320, freqEnd: 170, q: 9, dur: 0.9, gain: 0.9, attack: 0.2, delay: 0.05 });
        N(A, o, { freq: 280, dur: 0.6, gain: 1, brown: true, delay: 0.85 });
        Tn(A, o, { freq: 70, freqEnd: 35, dur: 0.4, gain: 0.6, delay: 0.85 });
        rustle(A, o, 0.7, 0.35, 0.75);
      }
    } else if (m === 'leaves') rustle(A, o, 0.35, 0.35);
    else if (m === 'glass') {
      for (let i = 0; i < 7; i++) Tn(A, o, { freq: rr(2000, 5200), dur: rr(0.08, 0.25), gain: 0.06, delay: Math.random() * 0.2 });
      N(A, o, { type: 'highpass', freq: 2500, dur: 0.25, gain: 0.35 });
    } else {
      N(A, o, { freq: 900, freqEnd: 150, dur: 0.32, gain: 0.7, brown: true });
      if (m === 'sand') { grains(A, o, 10, 1800, 5000, 0.25, 0.1); N(A, o, { type: 'bandpass', freq: 1800, freqEnd: 700, q: 0.6, dur: 0.45, gain: 0.3, attack: 0.03 }); }
      else grains(A, o, 6, 700, 2200, 0.25, 0.1);
      if (m === 'grass') rustle(A, o, 0.2, 0.15);
    }
  },

  place(A, o, { tile }) {
    const m = matOf(tile);
    N(A, o, { freq: 600, dur: 0.1, gain: 0.45, brown: true });
    if (tile === TILE.TORCH || tile === TILE.CAMPFIRE) N(A, o, { type: 'bandpass', freq: 700, freqEnd: 2400, q: 0.7, dur: 0.35, gain: 0.3, attack: 0.03 }); // fogo acendendo
    else if (m === 'stone') N(A, o, { type: 'bandpass', freq: 2600, q: 2, dur: 0.04, gain: 0.18 });
    else if (m === 'wood') Tn(A, o, { type: 'triangle', freq: rr(260, 320), dur: 0.07, gain: 0.2 });
    else if (m === 'sand') N(A, o, { type: 'bandpass', freq: 2000, dur: 0.1, gain: 0.14 });
    else if (m === 'glass') Tn(A, o, { freq: 2600, dur: 0.08, gain: 0.06 });
  },

  // Passos conforme o chão
  step(A, o, { tile }) {
    const m = matOf(tile);
    if (m === 'stone' || m === 'glass') {
      N(A, o, { type: 'bandpass', freq: rr(1900, 3000), q: 2, dur: 0.035, gain: 0.14 });
      N(A, o, { freq: 300, dur: 0.05, gain: 0.2, brown: true });
    } else if (m === 'wood') {
      Tn(A, o, { type: 'triangle', freq: rr(150, 210), dur: 0.08, gain: 0.14 });
      N(A, o, { type: 'bandpass', freq: 900, q: 2, dur: 0.035, gain: 0.12 });
      N(A, o, { freq: 300, dur: 0.05, gain: 0.16, brown: true });
    } else if (m === 'sand') {
      N(A, o, { type: 'bandpass', freq: rr(1700, 2500), q: 0.5, dur: 0.11, gain: 0.12, attack: 0.015 });
      N(A, o, { freq: 300, dur: 0.06, gain: 0.14, brown: true });
    } else {
      N(A, o, { freq: rr(320, 480), dur: 0.08, gain: 0.32, brown: true });
      N(A, o, { type: 'bandpass', freq: 1200, q: 0.7, dur: 0.05, gain: 0.05 });
      if (m === 'grass' || m === 'leaves') N(A, o, { type: 'highpass', freq: rr(3500, 5500), dur: 0.09, gain: 0.07, attack: 0.01 });
    }
  },
  land(A, o, opts) { SFX.step(A, o, opts); N(A, o, { freq: 250, dur: 0.14, gain: 0.5 * (opts.power || 1), brown: true }); },
  jump(A, o, opts) { N(A, o, { type: 'highpass', freq: 1500, freqEnd: 3200, dur: 0.13, gain: 0.05, attack: 0.03 }); SFX.step(A, o, opts); },

  // Combate
  swing(A, o) { N(A, o, { type: 'bandpass', freq: 450, freqEnd: 1600, q: 1.6, dur: 0.2, gain: 0.35, attack: 0.07 }); },
  sword(A, o) {
    N(A, o, { type: 'bandpass', freq: 600, freqEnd: 2600, q: 2, dur: 0.17, gain: 0.45, attack: 0.05 });
    N(A, o, { type: 'highpass', freq: 4000, dur: 0.1, gain: 0.06, attack: 0.04 });
  },
  flesh(A, o) {
    N(A, o, { freq: 420, dur: 0.13, gain: 0.8, brown: true });
    Tn(A, o, { freq: 150, freqEnd: 65, dur: 0.1, gain: 0.45 });
    N(A, o, { type: 'bandpass', freq: 950, q: 1, dur: 0.05, gain: 0.25 });
  },
  hurt(A, o) { SFX.flesh(A, o); voice(A, o, { f0: 180, f1: 120, dur: 0.22, gain: 1.1, formants: [[650, 4], [1100, 5]], attack: 0.01 }); },
  explosion(A, o) {
    N(A, o, { freq: 3200, freqEnd: 90, dur: 1, gain: 1, attack: 0.003 });
    N(A, o, { freq: 300, dur: 1.6, gain: 1.1, brown: true, attack: 0.01 });
    Tn(A, o, { freq: 120, freqEnd: 28, dur: 0.7, gain: 1 });
    N(A, o, { type: 'bandpass', freq: 750, q: 1, dur: 0.25, gain: 0.4 });
    grains(A, o, 16, 900, 4200, 0.9, 0.14, 0.05);
  },

  // Objetos e interface
  pickup(A, o) { const f = rr(880, 1050); Tn(A, o, { freq: f, freqEnd: f * 1.5, dur: 0.07, gain: 0.1 }); Tn(A, o, { freq: f * 2, dur: 0.07, gain: 0.05, delay: 0.05 }); },
  fishingBite(A, o) {
    Tn(A, o, { type: 'triangle', freq: 740, freqEnd: 990, dur: .09, gain: .1 });
    Tn(A, o, { type: 'sine', freq: 1240, dur: .12, gain: .07, delay: .09 });
  },
  door(A, o, { open }) {
    if (open) {
      N(A, o, { type: 'bandpass', freq: 520, freqEnd: 880, q: 12, dur: 0.38, gain: 0.9, attack: 0.05 });
      Tn(A, o, { type: 'triangle', freq: 190, dur: 0.08, gain: 0.2, delay: 0.3 });
    } else {
      N(A, o, { freq: 300, dur: 0.16, gain: 0.7, brown: true });
      Tn(A, o, { type: 'triangle', freq: 150, dur: 0.1, gain: 0.35 });
      N(A, o, { type: 'bandpass', freq: 3000, q: 3, dur: 0.02, gain: 0.2, delay: 0.05 });
    }
  },
  chest(A, o) {
    N(A, o, { type: 'bandpass', freq: 420, freqEnd: 640, q: 10, dur: 0.3, gain: 0.8, attack: 0.04 });
    Tn(A, o, { type: 'triangle', freq: 210, dur: 0.09, gain: 0.25, delay: 0.25 });
    N(A, o, { type: 'bandpass', freq: 2800, q: 3, dur: 0.02, gain: 0.15 });
  },
  craft(A, o) {
    Tn(A, o, { type: 'triangle', freq: 330, dur: 0.06, gain: 0.25 });
    Tn(A, o, { type: 'triangle', freq: 440, dur: 0.06, gain: 0.25, delay: 0.08 });
    N(A, o, { freq: 500, dur: 0.08, gain: 0.2, brown: true, delay: 0.08 });
    Tn(A, o, { freq: 1320, freqEnd: 1760, dur: 0.14, gain: 0.05, delay: 0.16 });
  },
  select(A, o) { N(A, o, { type: 'bandpass', freq: 2600, q: 4, dur: 0.02, gain: 0.12 }); },
  invOpen(A, o) { N(A, o, { type: 'bandpass', freq: 600, freqEnd: 1500, q: 1, dur: 0.14, gain: 0.18, attack: 0.03 }); SFX.select(A, o); },
  invClose(A, o) { N(A, o, { type: 'bandpass', freq: 1500, freqEnd: 600, q: 1, dur: 0.12, gain: 0.16, attack: 0.02 }); },
  eat(A, o) {
    for (let i = 0; i < 4; i++) {
      N(A, o, { type: 'bandpass', freq: rr(700, 1300), q: 1.2, dur: 0.07, gain: 0.3, delay: i * 0.14 });
      N(A, o, { freq: 300, dur: 0.06, gain: 0.2, brown: true, delay: i * 0.14 + 0.02 });
    }
    Tn(A, o, { freq: 420, freqEnd: 260, dur: 0.12, gain: 0.12, delay: 0.62 });
  },

  // ---------- Bichos ----------
  pigIdle(A, o) {
    const f = rr(170, 230);
    voice(A, o, { f0: f, f1: f * 0.8, dur: 0.13, gain: 1.2, formants: [[900, 5], [1600, 7]], vib: 25, vibRate: 32 });
    if (Math.random() < 0.6) voice(A, o, { f0: f * 0.9, f1: f * 0.7, dur: 0.12, gain: 1, formants: [[850, 5], [1500, 7]], vib: 25, vibRate: 32, delay: 0.18 });
    N(A, o, { type: 'bandpass', freq: 700, q: 2, dur: 0.08, gain: 0.12 });
  },
  pigStep(A, o) { N(A, o, { type: 'bandpass', freq: rr(1400, 2000), q: 2, dur: 0.025, gain: 0.06 }); },
  pigHurt(A, o) {
    voice(A, o, { f0: 600, f1: 950, dur: 0.18, gain: 1, formants: [[1400, 4], [2600, 6]], vib: 40, vibRate: 18 });
    voice(A, o, { f0: 950, f1: 520, dur: 0.2, gain: 0.9, formants: [[1400, 4], [2600, 6]], vib: 40, vibRate: 18, delay: 0.17 });
    SFX.flesh(A, o);
  },
  pigDeath(A, o) { voice(A, o, { f0: 760, f1: 240, dur: 0.55, gain: 1, formants: [[1300, 4], [2400, 6]], vib: 35, vibRate: 14 }); N(A, o, { freq: 300, dur: 0.25, gain: 0.5, brown: true, delay: 0.45 }); },

  // Canibal (tipo 'undead'): voz humana — grunhidos de caça, rosnado entre dentes e grito de guerra
  zombieIdle(A, o) {
    const r = Math.random(), f = rr(105, 135);
    if (r < 0.45) { // "hm... hah": grunhido curto com respiração
      groan(A, o, { f0: f, f1: f * 0.85, dur: 0.16, gain: 1, attack: 0.02, vowels: [[420, 900], [520, 1000]], fry: 70, drive: 2, wobble: 0.03, breath: 0.7 });
      groan(A, o, { f0: f * 1.1, f1: f * 0.8, dur: 0.22, gain: 1.1, attack: 0.02, delay: rr(0.3, 0.5), vowels: [[700, 1200], [600, 1050]], fry: 60, drive: 2.5, wobble: 0.03, breath: 0.8 });
    } else if (r < 0.8) { // rosnado entre dentes
      groan(A, o, { f0: f * 0.7, f1: f * 0.75, dur: rr(0.5, 0.8), gain: 1.1, attack: 0.08, vowels: [[380, 1400], [420, 1600]], fry: 28, drive: 6, breath: 0.9 });
    } else { // grito de guerra tremido
      voice(A, o, { f0: rr(210, 250), f1: rr(260, 300), dur: 0.75, gain: 1.1, attack: 0.05, formants: [[750, 4], [1250, 6], [2600, 8]], vib: 28, vibRate: 7.5 });
      groan(A, o, { f0: 200, f1: 150, dur: 0.3, gain: 0.7, delay: 0.72, vowels: [[750, 1200], [600, 1000]], fry: 80, drive: 2, wobble: 0.02 });
    }
  },
  zombieStep(A, o) { // pé descalço batendo no chão
    N(A, o, { freq: 260, dur: 0.07, gain: 0.35, brown: true });
    N(A, o, { type: 'bandpass', freq: rr(1400, 2000), q: 1, dur: 0.03, gain: 0.05 });
  },
  zombieHurt(A, o) { // "ugh!"
    groan(A, o, { f0: rr(135, 160), f1: rr(95, 110), dur: 0.24, gain: 1.2, attack: 0.01, vowels: [[640, 1100], [460, 900]], fry: 55, drive: 3, wobble: 0.04 });
    SFX.flesh(A, o);
  },
  zombieDeath(A, o) { // grito que morre e o corpo caindo
    groan(A, o, { f0: rr(165, 185), f1: 70, dur: 1.1, gain: 1.4, attack: 0.02, vowels: [[760, 1250], [650, 1100], [420, 850]], fry: 45, drive: 3.5, wobble: 0.06 });
    N(A, o, { type: 'bandpass', freq: 800, q: 0.8, dur: 0.6, gain: 0.1, attack: 0.2, delay: 0.7 });
    N(A, o, { freq: 240, dur: 0.4, gain: 0.9, brown: true, delay: 1.05 });
  },
  zombieAttack(A, o) { // "HAH!" com o tacape cortando o ar
    groan(A, o, { f0: rr(150, 170), f1: rr(110, 125), dur: 0.26, gain: 1.3, attack: 0.01, vowels: [[780, 1280], [680, 1150]], fry: 60, drive: 4, wobble: 0.03, breath: 0.5 });
    N(A, o, { type: 'bandpass', freq: 500, freqEnd: 1500, q: 1.4, dur: 0.18, gain: 0.3, attack: 0.06 });
    N(A, o, { freq: 300, dur: 0.12, gain: 0.5, brown: true, delay: 0.16 }); // pancada
  },

  // Slime: gosma que borbulha, estica ao pular e esparrama ao cair
  slimeIdle(A, o) {
    for (let i = 0, n = 2 + Math.floor(rr(0, 3)); i < n; i++) {
      const f = rr(160, 320), dl = i * rr(0.09, 0.16);
      Tn(A, o, { freq: f, freqEnd: f * rr(2.2, 3), dur: rr(0.05, 0.08), gain: 0.16, attack: 0.01, delay: dl }); // "blup"
      N(A, o, { type: 'bandpass', freq: f * 3, q: 6, dur: 0.04, gain: 0.08, delay: dl + 0.02 });
    }
  },
  slimeJump(A, o) {
    Tn(A, o, { freq: 140, freqEnd: 520, dur: 0.16, gain: 0.4, attack: 0.02 }); // estica
    N(A, o, { type: 'bandpass', freq: 500, freqEnd: 1400, q: 3, dur: 0.14, gain: 0.25, attack: 0.03 });
    Tn(A, o, { type: 'triangle', freq: 900, freqEnd: 1500, dur: 0.04, gain: 0.08, delay: 0.12 }); // descola do chão
  },
  slimeLand(A, o) {
    Tn(A, o, { freq: 240, freqEnd: 70, dur: 0.16, gain: 0.5 }); // "splat"
    N(A, o, { freq: 600, freqEnd: 180, dur: 0.14, gain: 0.55, brown: true });
    N(A, o, { type: 'bandpass', freq: 1500, q: 2, dur: 0.07, gain: 0.2, delay: 0.02 });
    for (let i = 0; i < 3; i++) Tn(A, o, { freq: rr(500, 900), freqEnd: rr(250, 400), dur: 0.035, gain: 0.07, delay: 0.08 + i * rr(0.03, 0.06) }); // respingos
  },
  slimeHurt(A, o) { Tn(A, o, { freq: 600, freqEnd: 180, dur: 0.18, gain: 0.4 }); N(A, o, { type: 'bandpass', freq: 1100, freqEnd: 400, q: 4, dur: 0.15, gain: 0.3 }); SFX.slimeLand(A, o); },
  slimeDeath(A, o) {
    for (let i = 0; i < 8; i++) Tn(A, o, { freq: rr(250, 1000), freqEnd: rr(100, 260), dur: rr(0.05, 0.09), gain: 0.18, delay: i * rr(0.03, 0.06) });
    N(A, o, { freq: 700, freqEnd: 110, dur: 0.45, gain: 0.6, brown: true });
    N(A, o, { type: 'bandpass', freq: 400, freqEnd: 150, q: 5, dur: 0.4, gain: 0.3, delay: 0.1 }); // escorrendo
  },
  slimeAttack(A, o) { N(A, o, { type: 'bandpass', freq: 800, freqEnd: 300, q: 3, dur: 0.12, gain: 0.35 }); Tn(A, o, { freq: 300, freqEnd: 120, dur: 0.1, gain: 0.3 }); },

  // Morcego: bater de asa de couro, guinchos agudos e mordida
  batFlap(A, o) {
    N(A, o, { type: 'bandpass', freq: rr(500, 800), freqEnd: 300, q: 1.2, dur: 0.07, gain: 0.5, attack: 0.012 });
    N(A, o, { type: 'highpass', freq: 2200, dur: 0.035, gain: 0.05 });
  },
  batSqueak(A, o) {
    for (let i = 0, n = 2 + Math.floor(rr(0, 3)); i < n; i++) {
      const f = rr(3000, 4200), dl = i * rr(0.06, 0.1);
      Tn(A, o, { type: 'square', freq: f, freqEnd: f * rr(1.15, 1.4), dur: rr(0.03, 0.05), gain: 0.05, delay: dl });
      Tn(A, o, { type: 'sine', freq: f * 0.5, freqEnd: f * 0.62, dur: 0.04, gain: 0.08, delay: dl });
    }
  },
  batIdle(A, o) { SFX.batSqueak(A, o); },
  batAttack(A, o) { Tn(A, o, { type: 'square', freq: 4400, freqEnd: 2600, dur: 0.07, gain: 0.09 }); N(A, o, { type: 'bandpass', freq: 2600, q: 3, dur: 0.035, gain: 0.6, delay: 0.05 }); SFX.flesh(A, o); },
  batHurt(A, o) { Tn(A, o, { type: 'square', freq: 4600, freqEnd: 2600, dur: 0.12, gain: 0.07 }); Tn(A, o, { type: 'sine', freq: 2300, freqEnd: 1300, dur: 0.12, gain: 0.1 }); SFX.flesh(A, o); },
  batDeath(A, o) {
    for (let i = 0; i < 3; i++) Tn(A, o, { type: 'square', freq: 4200 - i * 700, freqEnd: 1500 - i * 300, dur: 0.12, gain: 0.1, delay: i * 0.1 });
    N(A, o, { type: 'bandpass', freq: 700, q: 1, dur: 0.12, gain: 0.25, delay: 0.1 }); // última batida de asa
    N(A, o, { freq: 400, dur: 0.15, gain: 0.35, brown: true, delay: 0.4 });
  },

  bomberIdle(A, o) { for (let i = 0; i < 5; i++) Tn(A, o, { freq: rr(110, 260), freqEnd: rr(80, 160), dur: rr(0.04, 0.08), gain: 0.2, delay: i * rr(0.05, 0.1) }); },
  bomberStep(A, o) { N(A, o, { freq: 420, dur: 0.1, gain: 0.22, brown: true }); Tn(A, o, { freq: rr(120, 160), freqEnd: 90, dur: 0.06, gain: 0.08 }); },
  bomberFuse(A, o) { // inchando: chiado, borracha esticando e um gemido que sobe
    N(A, o, { type: 'highpass', freq: 3000, dur: BOMBER_FUSE, gain: 0.25, attack: BOMBER_FUSE * 0.9 });
    voice(A, o, { f0: 90, f1: 280, dur: BOMBER_FUSE, gain: 0.9, formants: [[520, 3]], attack: 0.3, vib: 8, vibRate: 14 });
    N(A, o, { type: 'bandpass', freq: 380, freqEnd: 950, q: 10, dur: BOMBER_FUSE, gain: 0.6, attack: 0.2 });
  },
  bomberHurt(A, o) { voice(A, o, { f0: 230, f1: 140, dur: 0.2, gain: 1.1, formants: [[700, 4]] }); SFX.slimeLand(A, o); },
  bomberDeath(A, o) { N(A, o, { type: 'highpass', freq: 2000, freqEnd: 600, dur: 0.6, gain: 0.4 }); SFX.slimeDeath(A, o); },
};

// ---------- Sons contínuos: passos, pulo, eco e bichos ----------
function updateGameSfx(g, dt) {
  const A = g.crashAudio; if (!A) return;
  sfxBus(A);
  const p = g.player, w = g.world, s = (g.sfxState ??= { step: 0, jump: p.jumpAge, ground: p.onGround, vy: 0 });
  A.sfxWet.gain.setTargetAtTime(inCave(w, p.cx, p.cy) ? 0.45 : 0.06, A.now, 0.4);

  const under = w.getTile(Math.floor(p.cx / T), Math.floor((p.y + p.h + 2) / T));
  const step = Math.floor(p.anim / 6);
  if (p.onGround && step !== s.step && Math.abs(p.vx) > 20) playSfx('step', p.cx, p.y + p.h, { tile: under, vol: Math.abs(p.vx) > 110 ? 1 : 0.75 });
  s.step = step;
  if (p.jumpAge < s.jump) playSfx('jump', p.cx, p.y + p.h, { tile: under, vol: 0.7 });
  if (!s.ground && p.onGround && s.vy > 250) playSfx('land', p.cx, p.y + p.h, { tile: under, power: clamp(s.vy / 700, 0.4, 1.4) });
  s.jump = p.jumpAge; s.ground = p.onGround; s.vy = p.vy;

  for (const m of g.mobs) mobAudio(m, dt);
}

function mobAudio(m, dt) {
  if (m.dead || !MOB_SFX[m.kind ?? 'pig']) return;
  const kind = m.kind ?? 'pig', x = m.cx, y = m.cy, wild = !!WILDLIFE[kind];
  const s = (m.sfx ??= { voice: 2 + Math.random() * 6, jump: m.jumpAge ?? 1, ground: m.onGround, step: 0, fuse: 0, flap: 0 });
  if ((s.voice -= dt) <= 0 && !m.sleeping && !m.boss && m.def?.shape !== 'wolf') { // lobo e tigre fazem a voz pela própria IA
    s.voice = { pig: rr(4, 10), undead: rr(3, 7) * (Math.hypot(x - game.player.cx, y - game.player.cy) < 12 * T ? 0.6 : 1), bat: rr(1.5, 4), slime: rr(5, 9), bomber: rr(3, 6), wolf: rr(6, 14), frostwolf: rr(6, 14), bird: rr(2, 5), elephant: rr(14, 28) }[kind] ?? rr(4, 9);
    playSfx(MOB_SFX[kind] + 'Idle', x, y);
  }
  if (kind === 'slime') {
    if (m.jumpAge < s.jump) playSfx('slimeJump', x, y);
    if (!s.ground && m.onGround) playSfx('slimeLand', x, y);
  } else if (kind === 'bat' || kind === 'bird') {
    if (!m.sleeping && (s.flap -= dt) <= 0) { s.flap = kind === 'bird' ? 0.18 : 0.14; playSfx(kind === 'bird' ? 'birdFlap' : 'batFlap', x, y, { vol: 0.6 }); }
  } else {
    const step = kind === 'pig' ? Math.floor(m.anim / 1.2) : Math.floor(m.gait / (wild ? 4 : kind === 'bomber' ? 4 : 6));
    if (step !== s.step && m.onGround) playSfx(MOB_SFX[kind] + 'Step', x, m.y + m.h);
    s.step = step;
  }
  if (kind === 'bomber' && m.fuse > 0 && !(s.fuse > 0)) playSfx('bomberFuse', x, y);
  s.fuse = m.fuse; s.jump = m.jumpAge; s.ground = m.onGround;
}

// ---------- Água (js/water.js) ----------
Object.assign(MATERIAL, {
  [TILE.LILYPAD]: 'leaves', [TILE.SEAWEED]: 'leaves',
  [TILE.CORAL_BRANCH]: 'stone', [TILE.CORAL_FAN]: 'stone', [TILE.CORAL_BRAIN]: 'stone',
});
MOB_SFX.fish = 'fish';
Object.assign(SFX, {
  // Caiu na água: tchibum grave, gotas espirrando e um "blup"
  splash(A, o, { power = 1 }) {
    N(A, o, { freq: 1400, freqEnd: 260, dur: 0.5, gain: 0.55 * power, brown: true, attack: 0.01 });
    N(A, o, { type: 'bandpass', freq: 1800, freqEnd: 900, q: 0.8, dur: 0.35, gain: 0.25 * power, attack: 0.01 });
    grains(A, o, 12, 1500, 5200, 0.45, 0.09 * power, 0.05);
    Tn(A, o, { freq: 320, freqEnd: 120, dur: 0.14, gain: 0.16 * power, delay: 0.02 });
  },
  // Braçada: água empurrada, com umas gotinhas
  swim(A, o) {
    N(A, o, { type: 'bandpass', freq: rr(600, 800), freqEnd: rr(1200, 1600), q: 0.8, dur: 0.32, gain: 0.16, attack: 0.08 });
    grains(A, o, 4, 1800, 4500, 0.25, 0.05, 0.1);
  },
  bubble(A, o) {
    for (let i = 0; i < 3; i++) {
      const f = rr(450, 900);
      Tn(A, o, { freq: f, freqEnd: f * 2.3, dur: 0.06, gain: 0.07, delay: i * rr(0.05, 0.13) });
    }
  },
  // Ronco contínuo da cachoeira (tocado em pedaços que se sobrepõem)
  waterfall(A, o) {
    N(A, o, { freq: rr(700, 1000), dur: 0.9, gain: 0.22, brown: true, attack: 0.3 });
    N(A, o, { type: 'highpass', freq: 2400, dur: 0.8, gain: 0.06, attack: 0.3 });
  },
  fishIdle(A, o) { SFX.bubble(A, o); },
  fishStep(A, o) { N(A, o, { type: 'bandpass', freq: rr(900, 1300), q: 1.5, dur: 0.05, gain: 0.18 }); N(A, o, { freq: 500, dur: 0.05, gain: 0.15, brown: true }); },
  fishHurt(A, o) { SFX.fishStep(A, o); SFX.flesh(A, o); },
  fishDeath(A, o) { SFX.fishStep(A, o); SFX.bubble(A, o); },
});

// ---------- Tridente (js/trident.js) ----------
Object.assign(SFX, {
  // Estocada: silvo curto de lança cortando o ar com um tilintar de metal
  tridentThrust(A, o) {
    N(A, o, { type: 'bandpass', freq: 700, freqEnd: 2600, q: 1.4, dur: 0.16, gain: 0.35, attack: 0.05 });
    Tn(A, o, { type: 'triangle', freq: rr(1900, 2200), freqEnd: 1600, dur: 0.12, gain: 0.05, delay: 0.08 });
  },
  // Lança d'água: jato de água rugindo que sobe de tom + estalo cristalino
  waterBolt(A, o, { power = 1 }) {
    N(A, o, { type: 'bandpass', freq: 500, freqEnd: 1800, q: 0.9, dur: 0.45, gain: 0.45 * power, attack: 0.02 });
    N(A, o, { freq: 900, freqEnd: 300, dur: 0.35, gain: 0.35 * power, brown: true });
    grains(A, o, 8, 2500, 6000, 0.35, 0.06);
    Tn(A, o, { freq: 700, freqEnd: 1500, dur: 0.18, gain: 0.07 });
    Tn(A, o, { freq: 1400, freqEnd: 2600, dur: 0.14, gain: 0.04, delay: 0.05 });
  },
  // Estouro de água: baque grave, espirro largo e gotas caindo
  waterImpact(A, o, { power = 1 }) {
    Tn(A, o, { freq: 140, freqEnd: 50, dur: 0.3, gain: 0.35 * power });
    N(A, o, { freq: 1600, freqEnd: 250, dur: 0.6, gain: 0.6 * power, brown: true, attack: 0.005 });
    N(A, o, { type: 'bandpass', freq: 2200, freqEnd: 900, q: 0.7, dur: 0.4, gain: 0.3 * power });
    grains(A, o, 16, 1500, 5500, 0.7, 0.08 * power, 0.08);
  },
  tridentWindup(A, o) { N(A, o, { type: 'bandpass', freq: 400, freqEnd: 900, q: 2, dur: 0.18, gain: 0.25, attack: 0.1 }); },
  tridentThrow(A, o) {
    N(A, o, { type: 'bandpass', freq: 1200, freqEnd: 400, q: 1.2, dur: 0.35, gain: 0.45, attack: 0.02 });
    N(A, o, { type: 'bandpass', freq: 600, freqEnd: 1600, q: 0.8, dur: 0.3, gain: 0.2, delay: 0.05 });
  },
  tridentStick(A, o, opts) {
    SFX.arrowHit(A, o, opts);
    Tn(A, o, { type: 'triangle', freq: 320, freqEnd: 300, dur: 0.35, gain: 0.12, delay: 0.02 }); // cabo vibrando
  },
  // Voltando: brilho subindo, como água sendo puxada de volta
  tridentReturn(A, o) {
    for (let i = 0; i < 5; i++) Tn(A, o, { freq: 800 + i * 260, freqEnd: 1100 + i * 300, dur: 0.12, gain: 0.04, delay: i * 0.06 });
    N(A, o, { type: 'bandpass', freq: 800, freqEnd: 2400, q: 1, dur: 0.4, gain: 0.15, attack: 0.15 });
  },
  tridentCatch(A, o) {
    Tn(A, o, { type: 'triangle', freq: 1250, dur: 0.1, gain: 0.08 });
    Tn(A, o, { freq: 1875, dur: 0.14, gain: 0.05, delay: 0.03 });
    N(A, o, { freq: 700, dur: 0.12, gain: 0.25, brown: true });
  },
});

// ---------- Bichos da água (js/aquatic.js) ----------
for (const kind in WILDLIFE) if (WILDLIFE[kind].aquatic) MOB_SFX[kind] = 'fish';
Object.assign(SFX, {
  // Mordida do tubarão: estalo seco das mandíbulas e a água chacoalhando
  sharkBite(A, o) {
    N(A, o, { type: 'bandpass', freq: 1400, q: 2, dur: 0.05, gain: 0.5 });
    N(A, o, { freq: 500, freqEnd: 180, dur: 0.25, gain: 0.6, brown: true, delay: 0.03 });
    SFX.swim(A, o);
  },
});

// ---------- Engatinhando: sons bobos (js/player.js) ----------
Object.assign(SFX, {
  // Rebolado: "boing-boing" de mola, subindo e descendo
  buttWiggle(A, o) {
    for (let i = 0; i < 4; i++) {
      const up = i % 2 === 0, f = up ? 420 : 520;
      Tn(A, o, { type: 'triangle', freq: f, freqEnd: up ? f * 1.6 : f * 0.7, dur: 0.12, gain: 0.08, delay: i * 0.3 });
    }
  },
  // "Aaah..." puxando o ar antes do espirro
  sneezeIn(A, o) {
    voice(A, o, { type: 'triangle', f0: 320, f1: 520, dur: 0.3, gain: 0.35, formants: [[850, 4], [1250, 5]], attack: 0.05 });
    N(A, o, { type: 'bandpass', freq: 1800, freqEnd: 2600, q: 1, dur: 0.3, gain: 0.08, attack: 0.1 });
  },
  // "ATCHIM!": estouro de ar com um "tchim" agudo no fim
  sneeze(A, o) {
    N(A, o, { type: 'highpass', freq: 1800, dur: 0.18, gain: 0.5, attack: 0.005 });
    N(A, o, { freq: 1200, freqEnd: 400, dur: 0.22, gain: 0.35, brown: true });
    voice(A, o, { type: 'sawtooth', f0: 520, f1: 380, dur: 0.16, gain: 0.3, formants: [[2400, 6], [3200, 7]], delay: 0.03 });
  },
});

// ---------- Parado em pé: sons das gags (js/player.js) ----------
const DANCE_NOTES = [523, 587, 659, 784, 880]; // escala pentatônica: qualquer sequência soa como musiquinha
Object.assign(SFX, {
  danceNote(A, o) {
    const f = DANCE_NOTES[Math.floor(Math.random() * DANCE_NOTES.length)];
    Tn(A, o, { type: 'square', freq: f, dur: 0.1, gain: 0.035 });
    Tn(A, o, { type: 'triangle', freq: f * 2, dur: 0.08, gain: 0.02, delay: 0.02 });
  },
  // "Aaaahhhm": vogal descendo devagar, com uma tremidinha no fim
  yawn(A, o) {
    voice(A, o, { type: 'sawtooth', f0: 430, f1: 210, dur: 1.2, gain: 0.3, formants: [[750, 3], [1150, 4]], attack: 0.25, vib: 6, vibRate: 5 });
    N(A, o, { type: 'bandpass', freq: 900, q: 0.8, dur: 1, gain: 0.05, attack: 0.3 });
  },
  scratch(A, o) {
    for (let i = 0; i < 4; i++) N(A, o, { type: 'bandpass', freq: rr(2600, 3800), q: 3, dur: 0.05, gain: 0.1, delay: i * 0.09 });
  },
  // Ronco: ar entrando grave e rouco, depois um assobio fininho saindo
  snore(A, o) {
    N(A, o, { freq: 170, freqEnd: 260, dur: 0.6, gain: 0.35, brown: true, attack: 0.25 });
    voice(A, o, { type: 'sawtooth', f0: 90, f1: 110, dur: 0.55, gain: 0.25, formants: [[400, 3]], attack: 0.2 });
    Tn(A, o, { freq: 1300, freqEnd: 1700, dur: 0.35, gain: 0.025, delay: 0.7 });
  },
  // Acordou assustado: "hrrnk!"
  snort(A, o) {
    N(A, o, { freq: 400, freqEnd: 900, dur: 0.12, gain: 0.4, brown: true });
    voice(A, o, { type: 'sawtooth', f0: 220, f1: 520, dur: 0.14, gain: 0.3, formants: [[900, 4]], delay: 0.05 });
  },
});
