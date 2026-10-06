'use strict';

// Abertura jogável dentro do avião. Voo 237, último do dia sobre a cordilheira:
// você acorda de um pesadelo ridículo, precisa MUITO ir ao banheiro, se tranca lá dentro
// bem na hora em que o avião começa a cair.
// A cena é desenhada num buffer de baixa resolução e ampliada (em múltiplos inteiros) para a tela.
const CABIN = {
  W: 980, H: 250, FLOOR: 204, VIEW_H: 262,
  ROWS: [140, 196, 252, 308, 364, 540, 596, 652, 708], // x de cada poltrona (encosto à direita)
  PLAYER_ROW: 2, EXIT: 438, LOCKER: 490, WING: [380, 590],
  LAV: 880, MARTA_SPOT: 800, // porta do banheiro e onde a Marta fica na cozinha de bordo
};
const CABIN_WINDOWS = [...CABIN.ROWS.map((x) => x + 6), 430, 482];
const CABIN_LOOKS = {
  marta: { name: 'Marta', skin: 2, hair: 2, hairStyle: 3, eyes: 1, jacket: 0, shirt: 1, pants: 3, boots: 1 },
  arnaldo: { name: 'Arnaldo', skin: 0, hair: 4, hairStyle: 0, eyes: 3, jacket: 3, shirt: 1, pants: 2, boots: 0 },
  lena: { name: 'Lena', skin: 4, hair: 1, hairStyle: 2, eyes: 0, jacket: 2, shirt: 4, pants: 1, boots: 2 },
};
const SPEAKER_COLORS = { COMANDANTE: '#ffc861', MARTA: '#ff9aa8', 'SR. ARNALDO': '#9fd0ff', LENA: '#b9e39a', 'VOCÊ': '#8fe3c0' };
const TYPE_SPEED = 42; // letras por segundo nas falas

// Fonte de pixel 3x5 para as placas (texto comum borra quando a cena é ampliada)
const PIXEL_GLYPHS = {
  A: ['.#.', '#.#', '###', '#.#', '#.#'], C: ['.##', '#..', '#..', '#..', '.##'], D: ['##.', '#.#', '#.#', '#.#', '##.'],
  E: ['###', '#..', '##.', '#..', '###'], G: ['.##', '#..', '#.#', '#.#', '.##'], I: ['###', '.#.', '.#.', '.#.', '###'],
  L: ['#..', '#..', '#..', '#..', '###'], M: ['#.#', '###', '#.#', '#.#', '#.#'], N: ['##.', '#.#', '#.#', '#.#', '#.#'],
  O: ['.#.', '#.#', '#.#', '#.#', '.#.'], P: ['##.', '#.#', '##.', '#..', '#..'], R: ['##.', '#.#', '##.', '#.#', '#.#'],
  S: ['.##', '#..', '.#.', '..#', '##.'], T: ['###', '.#.', '.#.', '.#.', '.#.'], U: ['#.#', '#.#', '#.#', '#.#', '###'],
  V: ['#.#', '#.#', '#.#', '#.#', '.#.'], W: ['#.#', '#.#', '#.#', '###', '#.#'],
};
const PIXEL_ACCENTS = { 'Ç': ['C', 1, 5], 'Ã': ['A', 1, -1], 'Í': ['I', 1, -1], 'Ê': ['E', 1, -1] };
function pixelText(ctx, text, x, y, color) {
  ctx.fillStyle = color;
  for (const ch of text) {
    const accent = PIXEL_ACCENTS[ch], glyph = PIXEL_GLYPHS[accent ? accent[0] : ch];
    if (glyph) glyph.forEach((row, gy) => { for (let gx = 0; gx < 3; gx++) if (row[gx] === '#') ctx.fillRect(x + gx, y + gy, 1, 1); });
    if (accent) ctx.fillRect(x + accent[1], y + accent[2], 1, 1);
    x += 4;
  }
}

function createPlaneCabin() {
  return {
    active: true, t: 0, phase: 'nap', pt: 0, beat: 0,
    x: CABIN.ROWS[CABIN.PLAYER_ROW] + 14, facing: -1, anim: 0, seated: true, moving: false, inside: false,
    eWas: false, skip: 0, steps: 0, rumble: 3, line: null, shake: 0,
    signs: false, binsOpen: false, alarm: false, masksT: 0, dive: false, dream: false, fade: 0, fading: false,
    flags: {}, bags: [],
    marta: { x: CABIN.MARTA_SPOT, target: CABIN.MARTA_SPOT, facing: -1, anim: 0, moving: false },
  };
}

// ---------- Roteiro ----------
const say = (c, who, text) => { c.line = { who, text, t: 0 }; };
const setPhase = (c, phase) => { c.phase = phase; c.pt = 0; c.beat = 0; };

function cabinDing(A) {
  A?.tone({ freq: 988, dur: 0.5, gain: 0.08 });
  A?.tone({ freq: 784, dur: 0.8, gain: 0.08, delay: 0.35 });
}
function cabinKnock(A, times = 3) {
  for (let k = 0; k < times; k++) A?.noise({ dur: 0.08, freq: 420, gain: 0.7, brown: true, delay: k * 0.22 });
}

const CABIN_SCRIPT = {
  nap: [
    { at: 3.8, run: (c) => { c.dream = true; say(c, null, 'Você sonha que o avião é pilotado por um ganso. O ganso olha para trás. O ganso sorri.'); } },
    { at: 9.5, run: (c, g, A) => { c.dream = false; c.shake = 2.5; A?.noise({ dur: 0.3, freq: 900, gain: 0.3 }); say(c, 'VOCÊ', 'GANSO NÃO!'); } },
    { at: 12, run: (c) => say(c, 'VOCÊ', '…só um pesadelo. Ninguém viu. Ninguém viu.') },
    { at: 16, run: (c) => say(c, null, 'Três copos de refrigerante depois, sua bexiga manda um recado muito, muito urgente.') },
    { at: 21, run: (c) => { setPhase(c, 'walk'); c.seated = false; } },
  ],
  toilet: [
    { at: 0, run: (c, g, A) => { A?.tone({ type: 'square', freq: 1400, dur: 0.04, gain: 0.05 }); say(c, null, 'Você tranca a porta. Um espelho, uma pia minúscula e paz. Finalmente, paz.'); } },
    { at: 4.5, run: (c) => say(c, 'VOCÊ', 'Muito bem. Hora do show.') },
    { at: 7.5, run: (c, g, A) => { cabinDing(A); c.signs = true; A?.radio(0.4); say(c, 'COMANDANTE', 'Atenção: todos os passageiros retornem imediatamente aos seus assentos.'); } },
    { at: 12, run: (c) => say(c, 'VOCÊ', 'Comandante, com todo o respeito… não.') },
    { at: 15, run: (c, g, A) => {
      c.alarm = true; c.shake = 5; c.masksT = 0.001; c.binsOpen = true; spawnCabinBags(c);
      A?.boom(0.7); A?.alarm(8); A?.noise({ dur: 0.35, type: 'highpass', freq: 3000, gain: 0.25, delay: 0.4 });
      say(c, 'COMANDANTE', 'Fogo no motor dois! Mayday, mayday, Voo 237 perdendo altitude!');
    } },
    { at: 18.5, run: (c) => { c.marta.target = CABIN.LAV - 30; } },
    { at: 21, run: (c, g, A) => { c.marta.x = c.marta.target; c.marta.facing = 1; cabinKnock(A); say(c, 'MARTA', 'Sai daí e senta, AGORA!'); } },
    { at: 24.5, run: (c) => say(c, 'VOCÊ', 'Tô tentando! A tranca emperrou! …e eu nem terminei!') },
    { at: 28.5, run: (c, g, A) => { c.dive = true; A?.windRush(4.5); say(c, null, 'O avião mergulha. Você abraça o vaso sanitário como se fosse da família.'); } },
    { at: 32.5, run: (c) => { c.fading = true; } },
    { at: 34, run: (c, g) => endCabin(g) },
  ],
};

function endCabin(g) {
  const c = g.intro.cabin;
  c.active = false; g.intro.t = 0; g.intro.skip = 0;
  input.keys.clear(); input.mouse.left = input.mouse.right = input.mouse.rawLeft = false;
  g.crashAudio?.radio(0.8);
}

// Coisas com que dá para interagir por perto (a mais próxima ganha)
function cabinTarget(c) {
  if (c.phase !== 'walk') return null;
  const list = [
    { x: CABIN.LAV, label: '[E] Entrar no banheiro', act: (g, A) => {
      c.inside = true; c.moving = false; c.x = CABIN.LAV; setPhase(c, 'toilet');
      A?.noise({ dur: 0.2, type: 'bandpass', freq: 700, gain: 0.3 });
    } },
  ];
  if (!c.flags.arnaldo) list.push({ x: CABIN.ROWS[0] + 14, label: '[E] Falar', act: () => { c.flags.arnaldo = true; say(c, 'SR. ARNALDO', 'Zzz… não, mãe… não fui eu que comi o bolo… zzz…'); } });
  if (!c.flags.lena) list.push({ x: CABIN.ROWS[6] + 14, label: '[E] Cutucar', act: () => { c.flags.lena = true; say(c, 'LENA', 'Tá indo no banheiro? Vai lá. E lava a mão, pelo amor.'); } });
  if (!c.flags.marta) list.push({ x: CABIN.MARTA_SPOT, label: '[E] Falar', act: () => { c.flags.marta = true; say(c, 'MARTA', 'O banheiro é logo ali. Vai rápido, o comandante vai acender o aviso do cinto.'); } });
  let best = null;
  for (const it of list) { const d = Math.abs(c.x - it.x); if (d < 26 && (!best || d < Math.abs(c.x - best.x))) best = it; }
  return best;
}

// ---------- Atualização ----------
function updatePlaneCabin(g, dt) {
  const c = g.intro.cabin, A = g.crashAudio;
  c.t += dt; c.pt += dt;
  c.skip = input.down('Space') ? c.skip + dt : 0;
  if (c.skip >= 1) { finishOpening(g); return; }
  const e = input.down('KeyE'), press = e && !c.eWas;
  c.eWas = e;
  if (c.line) c.line.t += dt;
  c.shake = Math.max(0, c.shake - dt * 2.5);

  // Turbulência depois do aviso: roncos e trancos curtos, mais fortes na queda
  if (c.signs && (c.rumble -= dt) <= 0) {
    c.rumble = 1.6 + Math.random() * 1.8;
    A?.noise({ dur: 2, freq: 160, gain: c.alarm ? 0.35 : 0.16, brown: true, attack: 0.3 });
    c.shake = Math.max(c.shake, c.alarm ? 1.6 : 0.7);
  }
  if (c.dive) c.shake = Math.max(c.shake, 1.2);
  if (c.alarm) c.masksT += dt;
  if (c.fading) c.fade = Math.min(1, c.fade + dt / 1.4);

  // Roteiro: E adianta para a próxima fala quando o texto já apareceu inteiro
  const script = CABIN_SCRIPT[c.phase];
  if (script) {
    const lineDone = !c.line || c.line.t * TYPE_SPEED >= c.line.text.length;
    if (press && lineDone && c.beat < script.length) c.pt = Math.max(c.pt, script[c.beat].at);
    while (CABIN_SCRIPT[c.phase] === script && c.beat < script.length && c.pt >= script[c.beat].at) script[c.beat++].run(c, g, A);
    if (!c.active) return;
  } else {
    // Andando pelo corredor
    const dir = Number(input.down('KeyD') || input.down('ArrowRight')) - Number(input.down('KeyA') || input.down('ArrowLeft'));
    const old = c.x;
    c.x = clamp(c.x + dir * 92 * dt, 110, CABIN.LAV + 10);
    c.moving = Math.abs(c.x - old) > 0.01;
    if (dir) c.facing = dir;
    c.anim += (Math.abs(c.x - old) * 12) / 30;
    if (c.moving && (c.steps -= dt) <= 0) { c.steps = 0.3; playSfx('step', g.player.cx, g.player.cy, { tile: TILE.MUD, vol: 0.35 }); }
    // Falas que acontecem sozinhas no caminho
    if (!c.flags.announce && c.x > 420) {
      c.flags.announce = true; c.signs = true; cabinDing(A); A?.radio(0.4);
      say(c, 'COMANDANTE', 'Senhores passageiros, vamos atravessar uma área de turbulência. Permaneçam sentados.');
    } else if (c.flags.announce && !c.flags.nope && c.x > 640 && c.line?.t > 4) {
      c.flags.nope = true;
      say(c, 'VOCÊ', 'Negativo, comandante. Isso aqui é uma emergência.');
    }
    const target = cabinTarget(c);
    if (press && target) target.act(g, A);
  }

  // Marta andando pelo corredor
  const m = c.marta, d = m.target - m.x, step = 120 * dt;
  m.moving = Math.abs(d) > step;
  if (m.moving) { m.x += Math.sign(d) * step; m.facing = Math.sign(d); m.anim += (step * 12) / 30; } else m.x = m.target;

  // Malas caindo dos bagageiros
  for (const b of c.bags) {
    if (b.rest) continue;
    b.vy += 700 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.rot += b.vr * dt;
    if (b.y > CABIN.FLOOR - b.h / 2) {
      b.y = CABIN.FLOOR - b.h / 2; b.vy *= -0.3; b.vx *= 0.5; b.vr *= 0.4;
      if (Math.abs(b.vy) < 30) { b.rest = true; b.rot = Math.round(b.rot / (Math.PI / 2)) * (Math.PI / 2); }
      A?.noise({ dur: 0.08, freq: 500, gain: 0.25, brown: true });
    }
  }
}

function spawnCabinBags(c) {
  const colors = [['#8a3b32', '#5c231d'], ['#35507a', '#20334f'], ['#6e6a3a', '#48452a'], ['#7a5634', '#4f3620']];
  for (const i of [1, 4, 7]) {
    const bx = 104 + i * 56;
    for (let k = 0; k < 2; k++) {
      const col = colors[(i + k) % colors.length];
      c.bags.push({ x: bx + 14 + k * 16, y: 48, vx: (Math.random() - 0.5) * 80, vy: -40 - Math.random() * 60, rot: 0, vr: (Math.random() - 0.5) * 8, w: 16 + k * 4, h: 11 + k * 2, col, rest: false });
    }
  }
}

// ---------- Arte estática ----------
function buildCabinBack() {
  const cv = makeCanvas(CABIN.W, CABIN.H), x = cv.getContext('2d'), F = CABIN.FLOOR, W = CABIN.W;
  const r = (px, py, w, h, col) => { x.fillStyle = col; x.fillRect(px, py, w, h); };
  // Teto e luz contínua
  r(0, 0, W, CABIN.H, '#10161e');
  r(0, 8, W, 14, '#2a3440'); r(0, 22, W, 8, '#d8d3c6'); r(0, 30, W, 2, '#fff0c4'); r(0, 32, W, 1, '#a8a296');
  // Bagageiros
  r(104, 33, 660, 30, '#cdc8bb'); r(104, 33, 660, 2, '#ece8dd'); r(104, 60, 660, 3, '#8d887d');
  for (let bx = 104; bx < 764; bx += 56) { r(bx, 33, 1, 30, '#8d887d'); r(bx + 20, 52, 16, 3, '#7a766c'); r(bx + 21, 53, 14, 1, '#b0ab9f'); }
  // Parede com painéis
  r(0, 63, W, 90, '#c1bbae'); r(0, 63, W, 2, '#8f897d');
  for (let px = 0; px < W; px += 56) r(px, 63, 1, 90, '#aaa497');
  r(0, 118, W, 2, '#d8d2c5');
  // Saída de emergência sobre a asa (antes das janelas, que ficam por cima)
  const E = CABIN.EXIT;
  r(E - 18, 64, 36, F - 64, '#7f7a6f'); r(E - 16, 66, 32, F - 68, '#b3ad9f'); r(E - 15, 67, 1, F - 70, '#cfc9bb');
  r(E - 7, 132, 14, 4, '#c0392b'); r(E - 6, 133, 12, 1, '#e76b5c');
  r(E - 14, 39, 28, 10, '#1f7a45'); pixelText(x, 'SAÍDA', E - 10, 42, '#d9ffe0');
  // Janelas (vidro transparente: o céu é desenhado por baixo a cada quadro)
  for (const wx of CABIN_WINDOWS) {
    r(wx - 4, 66, 24, 34, '#e7e2d6'); r(wx - 3, 67, 22, 32, '#9e988b'); r(wx - 2, 68, 20, 30, '#57534b');
    x.clearRect(wx, 70, 16, 26);
    for (const [cx, cy] of [[wx, 70], [wx + 15, 70], [wx, 95], [wx + 15, 95]]) r(cx, cy, 1, 1, '#57534b');
  }
  // Parede baixa, saídas de ar, carpete e luzes de emergência do piso
  r(0, 153, W, F - 153, '#9d978a'); r(0, 153, W, 2, '#b8b2a5');
  for (let px = 20; px < W; px += 56) r(px, 190, 18, 4, '#6d685e');
  r(0, F, W, 18, '#3a4760'); r(0, F, W, 2, '#56647c');
  for (let px = 0; px < W; px += 6) r(px + ((px / 6) % 2) * 3, F + 8 + ((px / 6) % 3), 1, 1, '#2c374c');
  for (let px = 10; px < W; px += 28) r(px, F + 3, 2, 1, '#e08d3c');
  r(0, F + 18, W, CABIN.H - F - 18, '#0b0f15');
  // Porta da cabine de comando
  r(0, 22, 18, F - 22, '#1b232c'); r(22, 42, 62, F - 42, '#5f656b'); r(24, 44, 58, F - 44, '#8e949a'); r(26, 46, 1, F - 48, '#b3b8bd');
  r(45, 60, 16, 12, '#2d3640'); r(46, 61, 6, 2, '#58677a'); r(72, 128, 6, 3, '#d8c27a');
  pixelText(x, 'TRIPULAÇÃO', 29, 90, '#3a4048');
  // Armário de emergência
  const L = CABIN.LOCKER;
  r(L - 22, 122, 44, F - 122, '#1e2a30'); r(L - 24, 120, 48, 2, '#6b7a80');
  pixelText(x, 'EMERGÊNCIA', L - 19, 112, '#e4c981');
  r(L - 20, 124, 40, 78, '#4e6f63'); r(L - 20, 124, 40, 2, '#6d9384'); r(L - 5, 140, 10, 26, '#e6e4cd'); r(L - 13, 148, 26, 10, '#e6e4cd'); r(L + 14, 162, 3, 10, '#d5c59a');
  // Cozinha de bordo
  r(760, 63, 180, F - 63, '#80878d');
  for (let gy = 70; gy < F - 60; gy += 26) { r(764, gy, 90, 24, '#a9b0b5'); r(764, gy, 90, 1, '#c9cfd3'); r(800, gy + 10, 10, 2, '#5d646a'); }
  r(770, 150, 26, 54, '#b8bec3'); r(770, 150, 26, 2, '#d6dbde'); r(774, 170, 18, 2, '#7d858b'); // carrinho
  // Banheiro no fundo: porta sanfonada, placa WC e a luz de ocupado (desenhada à parte)
  const V = CABIN.LAV;
  r(V - 24, 70, 48, F - 70, '#6b7176'); r(V - 22, 72, 44, F - 72, '#c8c2b5');
  for (let px = V - 22; px < V + 22; px += 11) { r(px, 72, 1, F - 72, '#a39d90'); r(px + 1, 72, 1, F - 72, '#ddd8cc'); }
  r(V - 14, 82, 28, 10, '#2e3a46'); pixelText(x, 'WC', V - 11, 85, '#e8f0f6');
  r(V + 14, 140, 3, 12, '#8e949a'); r(V + 14, 140, 1, 12, '#c3c8cc');
  r(940, 22, 40, F - 4, '#1b232c'); r(940, 22, 2, F - 4, '#2e3a46');
  // Poltronas dos passageiros
  for (const sx of CABIN.ROWS) drawCabinSeat(r, sx, F);
  return cv;
}

// Assento baixo (~12 px do chão) e encosto curto, na escala do sprite
function drawCabinSeat(r, sx, F) {
  r(sx + 18, F - 38, 8, 26, '#2f4f7a'); r(sx + 18, F - 38, 8, 2, '#4a6d9c'); r(sx + 25, F - 38, 1, 26, '#1d3452');
  r(sx + 17, F - 43, 10, 7, '#e9e5d9'); r(sx + 17, F - 37, 10, 1, '#b9b4a8');
  r(sx, F - 12, 26, 6, '#35577f'); r(sx, F - 12, 26, 2, '#4f73a0'); r(sx, F - 7, 26, 1, '#1d3452');
  r(sx + 2, F - 18, 18, 2, '#9aa0a6'); r(sx + 2, F - 16, 2, 4, '#7c8288');
  r(sx + 6, F - 6, 3, 6, '#4a4f55'); r(sx + 19, F - 6, 3, 6, '#4a4f55'); r(sx + 4, F - 2, 20, 2, '#33373c');
}

// Sprite de outra aparência, com o mesmo gerador do jogador
function cabinAtlas(look) {
  previewLook(look);
  const atlas = buildPlayerSprite();
  PLAYER_LOOK_PREVIEW = null;
  applyLookToPalette(PLAYER_LOOK);
  return atlas;
}

// ---------- Desenho ----------
// Céu, nuvens, montanhas, asa e motor vistos pelas janelas
function drawCabinWindows(b, c) {
  const t = c.t;
  for (const wx of CABIN_WINDOWS) {
    b.save(); b.beginPath(); b.rect(wx, 70, 16, 26); b.clip();
    for (let y = 0; y < 26; y++) {
      let col = lerpColor([44, 46, 90], [236, 146, 88], y / 25);
      if (c.alarm) col = lerpColor(col, [70, 24, 34], 0.5 + 0.2 * Math.sin(t * 6));
      b.fillStyle = rgb(col); b.fillRect(wx, 70 + y, 16, 1);
    }
    for (let k = 0; k < 3; k++) {
      const cx = wrap(wx * 1.7 + k * 37 + t * (30 + k * 22), 60) - 22 + wx;
      b.fillStyle = k === 2 ? 'rgba(255,226,196,0.55)' : 'rgba(255,214,186,0.35)';
      b.fillRect(Math.round(cx), 74 + k * 6, 12 + k * 3, 2);
    }
    b.fillStyle = '#3a2b45';
    for (let x = 0; x < 16; x++) b.fillRect(wx + x, Math.round(90 + noise1((wx + x + t * 14) * 0.18, 3) * 2), 1, 8);
    if (wx > CABIN.WING[0] && wx < CABIN.WING[1]) {
      b.fillStyle = '#8c9198'; b.fillRect(wx, 87, 16, 3); b.fillStyle = '#5b6068'; b.fillRect(wx, 90, 16, 1);
      if (Math.abs(wx - 482) < 30) {
        b.fillStyle = '#50565e'; b.fillRect(wx + 3, 91, 11, 5); b.fillStyle = '#23272c'; b.fillRect(wx + 3, 92, 2, 3);
        if (c.signs) for (let k = 0; k < 6; k++) { // fumaça escura saindo do motor
          const px = wx + 10 + ((t * 40 + k * 9) % 34), py = 90 - ((t * 6 + k * 3) % 8);
          b.fillStyle = `rgba(40,36,38,${0.7 - k * 0.1})`; b.fillRect(Math.round(px), Math.round(py), 4 + (k & 1), 3);
        }
        if (c.alarm) { b.fillStyle = Math.sin(t * 25) > 0 ? '#ffe28a' : '#ff8a2a'; b.fillRect(wx + 11, 89, 4, 3); b.fillStyle = '#e0521b'; b.fillRect(wx + 13, 88, 3, 2); }
      }
    }
    b.restore();
    b.fillStyle = 'rgba(255,255,255,0.14)'; b.fillRect(wx + 2, 72, 1, 8); b.fillRect(wx + 3, 71, 1, 3); // reflexo no vidro
  }
}

function drawCabinProps(b, c) {
  const t = c.t;
  const r = (px, py, w, h, col) => { b.fillStyle = col; b.fillRect(Math.round(px), Math.round(py), w, h); };
  // Aviso de apertar cintos
  for (let i = 0; i < CABIN.ROWS.length; i += 2) r(CABIN.ROWS[i] + 8, 24, 10, 5, c.signs ? (c.alarm && Math.sin(t * 8) < 0 ? '#8a2a22' : '#ffcf5a') : '#6e6a60');
  // Luz do banheiro: verde livre, vermelho ocupado
  r(CABIN.LAV - 3, 96, 6, 3, c.inside ? '#e0412f' : '#4fc26a');
  // Bagageiros abertos: interior escuro e tampa pendurada
  if (c.binsOpen) for (const i of [1, 4, 7]) {
    const bx = 104 + i * 56;
    r(bx + 1, 35, 55, 25, '#4a463f'); r(bx + 1, 35, 55, 2, '#2e2b26');
    r(bx + 4, 63, 48, 3, '#8d887d'); r(bx + 6, 66, 44, 9, '#cdc8bb'); r(bx + 6, 74, 44, 1, '#8d887d');
  }
  // Máscaras de oxigênio caindo e balançando
  if (c.masksT > 0) for (const sx of CABIN.ROWS) {
    const len = Math.min(1, c.masksT * 2.5) * 44, sway = Math.sin(t * 3 + sx) * 3;
    b.fillStyle = '#e0dcd0';
    for (let k = 0; k < len; k += 2) b.fillRect(Math.round(sx + 10 + (sway * k) / 44), 63 + k, 1, 2);
    r(sx + 7 + sway, 63 + len, 7, 5, '#f2c230'); r(sx + 8 + sway, 63 + len, 5, 1, '#fff0a0');
  }
  // Malas no chão
  for (const bag of c.bags) {
    b.save(); b.translate(Math.round(bag.x), Math.round(bag.y)); b.rotate(bag.rot);
    b.fillStyle = '#10141a'; b.fillRect(-bag.w / 2 - 1, -bag.h / 2 - 1, bag.w + 2, bag.h + 2);
    b.fillStyle = bag.col[0]; b.fillRect(-bag.w / 2, -bag.h / 2, bag.w, bag.h);
    b.fillStyle = bag.col[1]; b.fillRect(-bag.w / 2, bag.h / 2 - 2, bag.w, 2); b.fillRect(-2, -bag.h / 2, 3, bag.h);
    b.fillStyle = '#2a2a2a'; b.fillRect(-3, -bag.h / 2 - 3, 6, 2);
    b.restore();
  }
}

// Pessoa em pé (quadro do atlas) ou sentada: tronco do quadro parado, coxas para a frente e canelas para baixo
function drawCabinPerson(b, atlas, look, x, facing, pose) {
  const F = CABIN.FLOOR;
  b.save(); b.translate(Math.round(x), F); b.scale(facing, 1);
  if (pose.stand != null) b.drawImage(atlas, pose.stand * 32, 0, 32, 48, -16, -48, 32, 48);
  else {
    const pants = PANTS_COLORS[look.pants].c, boots = BOOT_COLORS[look.boots].c, dark = '#16141a';
    const px = (x, y, w, h, col) => { b.fillStyle = col; b.fillRect(x, y, w, h); };
    px(-2, -14, 12, 6, dark); px(6, -10, 6, 8, dark); px(5, -4, 9, 5, dark);
    px(-1, -13, 10, 4, rgb(pants[1])); px(-1, -13, 10, 1, rgb(pants[2]));
    px(7, -9, 4, 6, rgb(pants[0])); px(7, -9, 1, 6, rgb(pants[1]));
    px(6, -3, 7, 3, rgb(boots[1])); px(6, -3, 7, 1, rgb(boots[2]));
    const frame = PLAYER_ANIMS.idle + (pose.sleep ? 3 : Math.floor(performance.now() / 700) % 3);
    b.save(); b.translate(0, -12); b.rotate(pose.brace ? 0.42 : pose.sleep ? 0.12 : 0);
    b.drawImage(atlas, frame * 32, 0, 32, 34, -16, -34, 32, 34);
    if (pose.headphones) { b.fillStyle = '#1e1e24'; b.fillRect(-7, -34, 12, 2); b.fillRect(-8, -30, 3, 5); }
    b.restore();
  }
  b.restore();
}

function drawCabinPeople(b, c, R, renderer) {
  drawCabinPerson(b, R.atlas.arnaldo, CABIN_LOOKS.arnaldo, CABIN.ROWS[0] + 14, -1, { sleep: !c.alarm, brace: c.alarm });
  drawCabinPerson(b, R.atlas.lena, CABIN_LOOKS.lena, CABIN.ROWS[6] + 14, -1, { headphones: !c.alarm, brace: c.alarm });
  const m = c.marta, idle = PLAYER_ANIMS.idle + (Math.floor(c.t * 1.4) % 3);
  drawCabinPerson(b, R.atlas.marta, CABIN_LOOKS.marta, m.x, m.facing, { stand: m.moving ? PLAYER_ANIMS.walk + (Math.floor(m.anim) % 12) : idle });
  if (c.inside) return; // trancado no banheiro
  const pose = c.seated
    ? { sleep: c.phase === 'nap' && c.pt < 9.5 }
    : { stand: c.moving ? PLAYER_ANIMS.walk + (Math.floor(c.anim) % 12) : idle };
  drawCabinPerson(b, renderer.playerAtlas, PLAYER_LOOK, c.x, c.facing, pose);
}

function drawPlaneCabin(ctx, g, renderer, W, H) {
  const c = g.intro.cabin;
  if (!(W > 0 && H > 0)) return; // tela sem tamanho (janela minimizada/redimensionando)
  if (!renderer.cabinRes) {
    const buf = makeCanvas(1, 1);
    renderer.cabinRes = { back: buildCabinBack(), buf, bctx: buf.getContext('2d'), atlas: { marta: cabinAtlas(CABIN_LOOKS.marta), arnaldo: cabinAtlas(CABIN_LOOKS.arnaldo), lena: cabinAtlas(CABIN_LOOKS.lena) } };
  }
  // Ampliação inteira: todos os pixels do mesmo tamanho, sem borrar
  let z = Math.max(1, Math.round(H / CABIN.VIEW_H));
  if (H / z < CABIN.H - 20) z = Math.max(1, z - 1);
  const R = renderer.cabinRes, bw = Math.ceil(W / z), bh = Math.ceil(H / z);
  if (R.buf.width !== bw || R.buf.height !== bh) { R.buf.width = bw; R.buf.height = bh; }
  const b = R.bctx, top = Math.floor((bh - CABIN.H) / 2);
  const focus = c.phase === 'toilet' ? CABIN.LAV - 60 : c.x;
  const camX = bw >= CABIN.W ? (CABIN.W - bw) / 2 : clamp(Math.round(focus - bw * 0.46), 0, CABIN.W - bw);
  const shake = GAME_OPTIONS.shake ? c.shake : 0, sx = Math.round((Math.random() * 2 - 1) * shake), sy = Math.round((Math.random() * 2 - 1) * shake);

  b.setTransform(1, 0, 0, 1, 0, 0); b.imageSmoothingEnabled = false;
  b.fillStyle = '#10161e'; b.fillRect(0, 0, bw, top + 10);
  b.fillStyle = '#0b0f15'; b.fillRect(0, top + CABIN.H - 10, bw, bh);
  b.translate(Math.round(-camX) + sx, top + sy);
  drawCabinWindows(b, c);
  b.drawImage(R.back, 0, 0);
  drawCabinProps(b, c);
  drawCabinPeople(b, c, R, renderer);

  b.setTransform(1, 0, 0, 1, 0, 0);
  // Luz: tom de fim de tarde, vinheta, sonho, alarme vermelho e piscadas
  b.fillStyle = 'rgba(255,150,80,0.05)'; b.fillRect(0, 0, bw, bh);
  const vg = b.createLinearGradient(0, 0, bw, 0);
  vg.addColorStop(0, 'rgba(0,0,0,0.45)'); vg.addColorStop(0.18, 'rgba(0,0,0,0)'); vg.addColorStop(0.82, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.45)');
  b.fillStyle = vg; b.fillRect(0, 0, bw, bh);
  if (c.dream) { b.fillStyle = `rgba(46,20,78,${0.62 + 0.06 * Math.sin(c.t * 2)})`; b.fillRect(0, 0, bw, bh); }
  if (c.alarm) {
    b.fillStyle = `rgba(190,20,30,${0.16 + 0.12 * Math.sin(c.t * 7)})`; b.fillRect(0, 0, bw, bh);
    if (Math.random() < 0.04) { b.fillStyle = 'rgba(0,0,0,0.55)'; b.fillRect(0, 0, bw, bh); }
  } else if (c.signs && Math.random() < 0.012) { b.fillStyle = 'rgba(0,0,0,0.35)'; b.fillRect(0, 0, bw, bh); }

  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.imageSmoothingEnabled = false;
  ctx.drawImage(R.buf, 0, 0, bw, bh, 0, 0, bw * z, bh * z);
  drawCabinUI(ctx, c, W, H, z, camX, top);
  if (c.fade > 0) { ctx.fillStyle = `rgba(4,6,9,${c.fade})`; ctx.fillRect(0, 0, W, H); }
  ctx.restore();
}

function wrapText(ctx, text, maxWidth) {
  const rows = []; let line = '';
  for (const word of text.split(' ')) {
    const next = line ? line + ' ' + word : word;
    if (line && ctx.measureText(next).width > maxWidth) { rows.push(line); line = word; } else line = next;
  }
  if (line) rows.push(line);
  return rows;
}

// Caixa de fala com efeito de máquina de escrever (usada na cabine e depois da queda)
function drawDialogueBox(ctx, L, W, H, showNext) {
  const bw = Math.min(780, W - 40), bx = (W - bw) / 2, by = H - 118;
  ctx.fillStyle = '#0a0c0f'; ctx.fillRect(bx - 3, by - 3, bw + 6, 104);
  ctx.fillStyle = 'rgba(22,26,32,0.96)'; ctx.fillRect(bx, by, bw, 98);
  const col = L.who ? SPEAKER_COLORS[L.who] || '#efe6d2' : '#8d959b';
  ctx.fillStyle = col; ctx.fillRect(bx, by, 4, 98);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  let ty = by + 26;
  if (L.who) { ctx.font = '11px Silkscreen, monospace'; ctx.fillText(L.who, bx + 18, by + 20); ty = by + 44; }
  ctx.font = L.who ? '15px monospace' : 'italic 15px monospace'; ctx.fillStyle = L.who ? '#efe6d2' : '#c9c1ad';
  const shown = Math.floor(L.t * TYPE_SPEED);
  wrapText(ctx, L.text, bw - 40).reduce((used, row, i) => {
    ctx.fillText(row.slice(0, Math.max(0, shown - used)), bx + 18, ty + i * 20);
    return used + row.length + 1;
  }, 0);
  if (showNext && shown >= L.text.length && Math.sin(performance.now() / 200) > 0) {
    ctx.textAlign = 'right'; ctx.font = '10px Silkscreen, monospace'; ctx.fillStyle = '#ffd27a'; ctx.fillText('[E] ▸', bx + bw - 14, by + 88);
  }
}

function drawCabinUI(ctx, c, W, H, z, camX, top) {
  ctx.textBaseline = 'alphabetic';
  // Cartão de título no começo
  if (c.phase === 'nap' && c.pt < 4.2) {
    const a = c.pt < 0.8 ? c.pt / 0.8 : c.pt > 3.2 ? Math.max(0, 4.2 - c.pt) : 1;
    ctx.fillStyle = `rgba(4,6,9,${0.7 * a})`; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = a; ctx.textAlign = 'center';
    ctx.font = `${Math.round(Math.min(64, W / 10))}px Silkscreen, monospace`; ctx.fillStyle = '#efe6d2'; ctx.fillText('VOO 237', W / 2, H * 0.44);
    ctx.font = '14px Silkscreen, monospace'; ctx.fillStyle = '#e0a44a'; ctx.fillText('Porto Leste  →  Vale Alto  ·  18h42', W / 2, H * 0.44 + 34);
    ctx.globalAlpha = 1;
  }
  // Objetivo, seta e dica sobre o que dá para usar
  if (c.phase === 'walk') {
    const goal = 'Vá ao banheiro, no fundo do avião';
    ctx.font = '13px monospace';
    const w = Math.ceil(ctx.measureText(goal).width) + 30;
    ctx.fillStyle = 'rgba(10,12,15,0.85)'; ctx.fillRect(16, 16, w, 44); ctx.fillStyle = '#e0a44a'; ctx.fillRect(16, 16, 4, 44);
    ctx.textAlign = 'left'; ctx.font = '10px Silkscreen, monospace'; ctx.fillStyle = '#e0a44a'; ctx.fillText('OBJETIVO', 28, 33);
    ctx.font = '13px monospace'; ctx.fillStyle = '#efe6d2'; ctx.fillText(goal, 28, 51);
    const gx = (CABIN.LAV - camX) * z, gy = (top + 58 + Math.sin(c.t * 4) * 2) * z;
    ctx.fillStyle = '#ffd78e'; ctx.beginPath(); ctx.moveTo(gx - 6 * z, gy); ctx.lineTo(gx + 6 * z, gy); ctx.lineTo(gx, gy + 7 * z); ctx.fill();
    const target = cabinTarget(c);
    if (target) {
      ctx.font = '12px Silkscreen, monospace'; ctx.textAlign = 'center';
      const tx = (target.x - camX) * z, ty = (top + CABIN.FLOOR + 14) * z, tw = ctx.measureText(target.label).width + 20;
      ctx.fillStyle = 'rgba(10,12,15,0.9)'; ctx.fillRect(tx - tw / 2, ty - 15, tw, 22);
      ctx.fillStyle = '#ffd27a'; ctx.fillText(target.label, tx, ty + 1);
    }
  }
  const L = c.line, script = CABIN_SCRIPT[c.phase];
  if (L && (script || L.t < L.text.length / TYPE_SPEED + 5)) drawDialogueBox(ctx, L, W, H, script && c.beat < script.length);
  ctx.textAlign = 'right'; ctx.font = '11px monospace'; ctx.fillStyle = '#98aaa9';
  ctx.fillText(script ? 'E: avançar    Segure ESPAÇO: pular abertura' : 'A / D: andar    E: interagir    Segure ESPAÇO: pular', W - 18, 24);
  ctx.fillStyle = '#d98a4a'; ctx.fillRect(W - 178, 30, 160 * clamp(c.skip, 0, 1), 2);
}
