'use strict';

// Depois da queda: no meio dos destroços só o banheiro ficou de pé, com você dentro.
// [F] sai, você solta uma pérola, o banheiro começa a tremer, você se afasta e ele explode.
const LAV_EXIT_KEY = 'KeyF';

function startLavatoryExit(g) {
  const b = g.crashSite;
  g.lavatory = { phase: 'out', t: 0, x: b.x, y: b.y, line: null, fKey: true };
  g.objective = '';
  g.player.x = b.x + 14 - g.player.w / 2; // sai pela porta, do lado direito
  g.crashAudio?.noise({ dur: 0.35, type: 'bandpass', freq: 600, freqEnd: 900, q: 8, gain: 0.8 }); // porta rangendo
  lavSay(g.lavatory, 'VOCÊ', 'Ufa. Da próxima vez eu seguro até o pouso.');
}

const lavSay = (s, who, text) => { s.line = { who, text, t: 0 }; };

function updateLavatory(g, dt) {
  const s = g.lavatory; if (!s) return;
  s.t += dt;
  if (s.line) s.line.t += dt;
  const p = g.player, A = g.crashAudio, dist = Math.abs(p.cx - s.x) / T;

  if (s.phase === 'out' && s.t > 4) {
    s.phase = 'shake'; s.t = 0;
    lavSay(s, 'VOCÊ', '…por que ele tá tremendo? Por que ele tá CHIANDO?');
    g.objective = 'Afaste-se do banheiro!';
  } else if (s.phase === 'shake') {
    s.rumble = (s.rumble ?? 0) - dt;
    if (s.rumble <= 0) {
      s.rumble = Math.max(0.12, 0.6 - s.t * 0.08); // cada vez mais rápido
      A?.noise({ dur: 0.25, type: 'highpass', freq: 2800, gain: 0.25 });
      A?.noise({ dur: 0.3, freq: 180, gain: 0.35, brown: true });
      for (let i = 0; i < 4 && g.particles.length < 400; i++) {
        const life = 0.3 + Math.random() * 0.3;
        g.particles.push({ x: s.x + (Math.random() - 0.5) * 20, y: s.y - 50, vx: (Math.random() - 0.5) * 120, vy: -60 - Math.random() * 100, life, maxLife: life, color: i % 2 ? '#ffe28a' : '#ff9a3a', w: 1, h: 1 });
      }
    }
    g.shake = Math.max(g.shake || 0, 0.5 + s.t * 0.15);
    if (dist > 6 || s.t > 8) explodeLavatory(g, s, dist);
  } else if (s.phase === 'boom' && s.t > 4.5 && !s.second) {
    s.second = true;
    lavSay(s, null, 'Ao longe, um rolo de papel higiênico cai do céu. Intacto. Ele venceu.');
  } else if (s.phase === 'boom' && s.t > 9) {
    s.phase = 'done'; s.line = null;
    g.objective = 'Procure suprimentos nos destroços próximos.';
    g.lavatory = null;
  }
}

function explodeLavatory(g, s, dist) {
  s.phase = 'boom'; s.t = 0;
  (g.explosions ??= []).push(createExplosion(s.x, s.y - 10));
  playSfx('explosion', s.x, s.y - 10);
  g.shake = 7;
  // Pedaços do banheiro e muito papel higiênico
  const bits = ['#d8d4c8', '#a9a497', '#f4f2ea', '#ffffff', '#6b7278'];
  for (let i = 0; i < 46 && g.particles.length < 400; i++) {
    const a = -Math.random() * Math.PI, v = 90 + Math.random() * 260, life = 0.8 + Math.random() * 1.2;
    g.particles.push({ x: s.x, y: s.y - 24, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life, maxLife: life, color: bits[i % bits.length], w: i % 3 ? 2 : 3, h: 2, gravity: i % 5 < 2 ? 90 : 520 });
  }
  if (dist < 4) damageMonsterPlayer(g, 15, s.x);
  lavSay(s, 'VOCÊ', dist < 4
    ? 'AI! …tá, justo. Eu devia ter corrido mais.'
    : 'Sério? Aguentou uma QUEDA DE AVIÃO e esperou EU sair pra explodir? …obrigado, eu acho.');
}

// Cabine de banheiro em pé no chão (px do mundo). open = porta aberta; shake = tremendo
function drawLavatory(ctx, x, y, { open = false, shake = 0, t = 0 } = {}) {
  const ox = Math.round(x - 13 + (shake ? (Math.random() < 0.5 ? -1 : 1) * Math.min(2, shake) : 0)), oy = Math.round(y - 52);
  const r = (px, py, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(ox + px, oy + py, w, h); };
  r(-1, -1, 28, 54, '#1a1a1e'); // contorno
  r(0, 0, 26, 52, '#d8d4c8'); r(0, 0, 26, 2, '#eeebe2'); r(21, 2, 5, 50, '#a9a497'); r(0, 50, 26, 2, '#8e8a80');
  r(3, 3, 14, 3, '#7d8288'); for (let k = 4; k < 16; k += 3) r(k, 4, 1, 1, '#2e3236'); // saída de ar
  for (const [px, py, w] of [[2, 12, 5], [15, 30, 7], [6, 42, 4], [19, 8, 3]]) r(px, py, w, 2, '#5a5650'); // fuligem e amassados
  r(0, 52, 26, 1, '#3a3a3e');
  if (!open) {
    r(3, 9, 17, 41, '#c7c2b5'); r(3, 9, 17, 1, '#e3dfd3');
    for (let k = 5; k < 20; k += 5) r(k, 10, 1, 39, '#a39d90');
    r(16, 28, 2, 6, '#6b7278');
    r(8, 12, 7, 3, Math.floor(t * 4) % 2 ? '#e0412f' : '#8a2a22'); // OCUPADO piscando
  } else {
    r(3, 9, 17, 41, '#24262a'); // interior escuro
    r(6, 36, 10, 6, '#f2f0ea'); r(7, 34, 8, 2, '#dedad0'); r(8, 42, 6, 6, '#e6e2d8'); r(15, 20, 4, 3, '#9fb6c4'); // vaso e espelho
    r(20, 9, 5, 41, '#c7c2b5'); r(20, 9, 1, 41, '#e3dfd3'); // porta sanfonada recolhida
  }
}

// Legenda das falas depois da queda (usa a mesma caixa da cabine)
function drawLavatoryCaption(ctx, g, W, H) {
  const s = g.lavatory;
  if (!s?.line || s.line.t > s.line.text.length / TYPE_SPEED + 4) return;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  drawDialogueBox(ctx, s.line, W, H, false);
  ctx.restore();
}
