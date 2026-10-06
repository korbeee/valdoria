'use strict';

// Trilha sonora procedural (Web Audio): música calma para explorar e música de batalha contra chefes.
// As notas são agendadas alguns décimos de segundo à frente no mesmo AudioContext dos efeitos,
// e cada trilha tem o próprio volume para as duas se cruzarem suavemente. Opções > Áudio.
const mtof = (n) => 440 * Math.pow(2, (n - 69) / 12);
const CALM_BPM = 64, BATTLE_BPM = 140;
// Acordes (baixo + 3 notas): dia em Dó maior, noite em Lá menor
const CALM_DAY = [[48, 55, 64, 71], [45, 52, 60, 67], [41, 48, 57, 64], [43, 50, 59, 62]];
const CALM_NIGHT = [[45, 52, 60, 71], [41, 48, 57, 64], [48, 55, 62, 64], [40, 47, 55, 62]];
const SCALE_DAY = [72, 74, 76, 79, 81, 84, 86];
const SCALE_NIGHT = [69, 72, 74, 76, 79, 81, 84];
// Batalha em Lá menor: Am Am F G Am Am C E
const BATTLE_ROOTS = [45, 45, 41, 43, 45, 45, 48, 40];
const BATTLE_MINOR = [0, 3, 7, 10, 12], BATTLE_MAJOR = [0, 4, 7, 11, 12];
const BATTLE_MOTIF = [0, -1, 1, -1, 2, -1, 1, 2, 3, -1, 4, -1, 4, 3, 2, 1];
const BATTLE_MOTIF_B = [4, -1, 3, 4, -1, 2, -1, 1, 2, -1, 1, 0, -1, 1, 2, 3];
const FIGHT_STATES = ['wake', 'hunt', 'crouch', 'pounce', 'recover', 'roar'];

const Music = {
  A: null,

  init(A) {
    const a = A.a;
    this.A = A;
    this.out = a.createGain(); this.out.gain.value = 0; this.out.connect(A.master); // não passa pelo abafador dos efeitos
    this.calm = a.createGain(); this.calm.gain.value = 0; this.calm.connect(this.out);
    this.battle = a.createGain(); this.battle.gain.value = 0; this.battle.connect(this.out);
    // Eco suave só na música calma
    this.echo = a.createDelay(2); this.echo.delayTime.value = (60 / CALM_BPM) * 0.75;
    const feedback = a.createGain(), lp = A.filter('lowpass', 2200);
    feedback.gain.value = 0.32;
    this.echoSend = a.createGain(); this.echoSend.gain.value = 0.35;
    this.echoSend.connect(this.echo); this.echo.connect(lp); lp.connect(feedback); feedback.connect(this.echo); lp.connect(this.calm);
    this.calmNext = 0; this.calmStep = 0; this.battleNext = 0; this.battleStep = 0; this.melody = 3; this.fighting = false;
  },

  note(dest, { type = 'sine', note, t, dur, gain, attack = 0.005, lp = 0, detune = 0, send = false }) {
    const a = this.A.a, o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.value = mtof(note); o.detune.value = detune;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let src = o;
    if (lp) { const f = this.A.filter('lowpass', lp); o.connect(f); src = f; }
    src.connect(g); g.connect(dest);
    if (send) g.connect(this.echoSend);
    o.start(t); o.stop(t + dur + 0.05);
  },
  noise(dest, opts, t) { this.A.noise({ ...opts, dest, delay: Math.max(0, t - this.A.now) }); },
  drum(dest, opts, t) { this.A.tone({ ...opts, dest, delay: Math.max(0, t - this.A.now) }); },

  // Chamado a cada quadro desenhado (continua tocando no menu de pausa)
  update(g) {
    const A = g.crashAudio;
    if (!A) return;
    if (this.A !== A) this.init(A);
    const now = A.now, o = GAME_OPTIONS, boss = g.boss;
    const playing = g.openingComplete && !g.intro?.active;
    const fight = !!(playing && o.battleMusic && boss && !boss.dead && FIGHT_STATES.includes(boss.state));
    const calm = playing && o.calmMusic && !fight;
    this.out.gain.setTargetAtTime((o.musicVolume / 100) * 0.6, now, 0.15);
    this.calm.gain.setTargetAtTime(calm ? 1 : 0, now, calm ? 3 : 0.5);
    this.battle.gain.setTargetAtTime(fight ? 1 : 0, now, fight ? 0.2 : 1.5);
    if (fight && !this.fighting) { this.battleStep = 0; this.battleNext = now + 0.05; }
    this.fighting = fight;

    const ahead = now + 0.3;
    if (calm) {
      if (this.calmNext < now) this.calmNext = now + 0.1;
      const step = 60 / CALM_BPM / 2;
      while (this.calmNext < ahead) { this.calmTick(this.calmNext, this.calmStep++, g); this.calmNext += step; }
    }
    if (fight || this.battle.gain.value > 0.02) {
      if (this.battleNext < now) this.battleNext = now + 0.05;
      const step = 60 / BATTLE_BPM / 4;
      while (this.battleNext < ahead) { this.battleTick(this.battleNext, this.battleStep++); this.battleNext += step; }
    }
  },

  // Colcheias: baixo e pad no começo do compasso, arpejo dedilhado e melodia de caixinha de música
  calmTick(t, step, g) {
    const night = daylightAt(g.time) < 0.35, prog = night ? CALM_NIGHT : CALM_DAY, scale = night ? SCALE_NIGHT : SCALE_DAY;
    const beat = 60 / CALM_BPM, bar = Math.floor(step / 8), pos = step % 8, chord = prog[bar % 4], out = this.calm;
    if (pos === 0) {
      this.note(out, { note: chord[0] - 12, t, dur: beat * 3.8, gain: 0.2, attack: 0.04 });
      for (const n of chord.slice(1)) {
        this.note(out, { type: 'triangle', note: n, t, dur: beat * 4.2, gain: 0.035, attack: beat * 1.2, lp: 1300 });
        this.note(out, { note: n, t, dur: beat * 4.2, gain: 0.03, attack: beat * 1.5, detune: 7 });
      }
    }
    if ([1, 0, 1, 1, 0, 1, 1, 0][pos] && Math.random() < 0.85) {
      const n = chord[1 + ((pos * 2 + bar) % 3)] + 12;
      this.note(out, { type: 'triangle', note: n, t, dur: 0.9, gain: night ? 0.035 : 0.05, lp: 2600, send: true });
    }
    if (Math.floor(bar / 4) % 2 === 1 && (pos === 0 || pos === 3 || pos === 6) && Math.random() < 0.6) {
      this.melody = clamp(this.melody + [-2, -1, 1, 2][Math.floor(Math.random() * 4)], 0, scale.length - 1);
      const n = scale[this.melody];
      this.note(out, { note: n, t, dur: 1.6, gain: 0.05, attack: 0.003, send: true });
      this.note(out, { note: n + 12, t, dur: 0.6, gain: 0.012, attack: 0.003 });
    }
  },

  // Semicolcheias: bateria, baixo galopante, metais no começo do compasso e o tema
  battleTick(t, step) {
    const bar = Math.floor(step / 16), pos = step % 16, root = BATTLE_ROOTS[bar % 8], out = this.battle;
    const iv = root === 45 ? BATTLE_MINOR : BATTLE_MAJOR, s16 = 60 / BATTLE_BPM / 4;
    if (pos === 0 || pos === 7 || pos === 8 || (pos === 11 && bar % 2)) this.drum(out, { freq: 150, freqEnd: 44, dur: 0.26, gain: 0.7 }, t);
    if (pos === 4 || pos === 12) {
      this.noise(out, { type: 'bandpass', freq: 1900, q: 0.8, dur: 0.16, gain: 0.35 }, t);
      this.drum(out, { type: 'triangle', freq: 210, freqEnd: 130, dur: 0.1, gain: 0.25 }, t);
    }
    if (pos % 2 === 0) this.noise(out, { type: 'highpass', freq: 7500, dur: pos === 14 ? 0.18 : 0.045, gain: pos % 4 === 2 ? 0.12 : 0.07 }, t);
    if (pos === 0 && bar % 4 === 0) this.noise(out, { type: 'highpass', freq: 4500, dur: 1.3, gain: 0.12, attack: 0.002 }, t);
    if (bar % 8 === 7 && pos >= 12) this.noise(out, { type: 'bandpass', freq: 1500 + pos * 80, q: 1, dur: 0.1, gain: 0.25 }, t); // virada
    if (pos % 2 === 0 || pos % 4 === 3) this.note(out, { type: 'square', note: root - 12 + (pos % 8 === 6 ? 12 : 0), t, dur: s16 * 1.6, gain: 0.09, attack: 0.003, lp: 700 });
    if (pos === 0) for (const k of [0, 2]) this.note(out, { type: 'sawtooth', note: root + 12 + iv[k], t, dur: 0.35, gain: 0.03, attack: 0.01, lp: 1800 });
    const deg = (bar % 8 < 4 ? BATTLE_MOTIF : BATTLE_MOTIF_B)[pos];
    if (deg >= 0) {
      const n = root + 24 + iv[deg];
      this.note(out, { type: 'sawtooth', note: n, t, dur: s16 * 1.7, gain: 0.04, attack: 0.004, lp: 2600 });
      this.note(out, { type: 'square', note: n, t, dur: s16 * 1.5, gain: 0.015, attack: 0.004, lp: 3000, detune: 8 });
    }
  },

  // Fanfarra curta ao vencer um chefe
  victory() {
    if (!this.A || GAME_OPTIONS.musicVolume <= 0) return;
    const t = this.A.now + 0.05;
    [60, 64, 67, 72].forEach((n, i) => this.note(this.out, { type: 'triangle', note: n, t: t + i * 0.12, dur: 0.5, gain: 0.12, lp: 3000 }));
    for (const n of [60, 64, 67, 72, 76]) this.note(this.out, { type: 'sawtooth', note: n, t: t + 0.5, dur: 1.6, gain: 0.03, attack: 0.02, lp: 2400 });
  },
};
