'use strict';
// =====================================================================================
//  BONÉ DO BIGODÃO + BOTAS PISA-PISA  (novos espaços de equipamento: chapéu e botas)
// =====================================================================================
// Chapéu (g.hat) e botas (g.boots) ficam no painel de equipamento, abaixo da armadura.
//  • Boné do Bigodão: vermelho, com botão dourado e o bigodão já colado. Defesa 5%.
//    PODER (tecla R): MODO ARCO-ÍRIS, 4 s invencível, um pouco mais rápido e quem encosta em você apanha de leve.
//    Também dispara sozinho (25%) ao levar um golpe. Recarga 90 s. Aparece no indicador de recarga igual aos outros poderes.
//  • Botas Pisa-Pisa: defesa 4% e PISÃO: cair em cima de um monstro machuca e te joga pra cima.
// Carrega depois de reference-powers.js (reaproveita estado, recarga e o "pisão" dele).

const CAP_GEAR_FIRST_ID=Math.max(...Object.values(ITEM))+1;
Object.assign(ITEM, { MOUSTACHE_CAP: CAP_GEAR_FIRST_ID, STOMP_BOOTS: CAP_GEAR_FIRST_ID+1 });
defItem(ITEM.MOUSTACHE_CAP, {
  name: 'Boné do Bigodão', chapeu: { defesa: 0.05 }, referencePower: 'rainbow', maxStack: 1,
  descricao: 'Boné vermelho que já vem com o bigodão colado (não tire, pega mal). Defesa 5%. R: Modo Arco-Íris Desesperado, 4 s invencível e um pouco mais veloz; quem encostar em você apanha um tiquinho. Também pode ser ativado sozinho (25%) quando você leva um golpe. Recarga: 1 min 30 s. Faz parte do Conjunto Encanado Bigodão.',
});
defItem(ITEM.STOMP_BOOTS, {
  name: 'Botas Pisa-Pisa', bota: { defesa: 0.04 }, maxStack: 1,
  descricao: 'Botas marrons para quem resolve tudo pisando na cabeça dos outros. Defesa 4%. Pisão: cair em cima de um monstro machuca ele de leve e te dá um pulinho. Faz parte do Conjunto Encanado Bigodão.',
});
const RAINBOW_TIME = 4, RAINBOW_COOLDOWN = 90;           // o modo é curtinho e a recarga é de um minuto e meio
const SET_NAME = 'Conjunto Encanado Bigodão';
const capSet = (g) => g.hat === ITEM.MOUSTACHE_CAP && g.boots === ITEM.STOMP_BOOTS && g.outfit === ITEM.PLUMBER_SHIRT;   // as três peças juntas
REFERENCE_COOLDOWNS.rainbow = RAINBOW_COOLDOWN;

ITEM_ART[ITEM.MOUSTACHE_CAP] = {
  cores: { d: [138, 14, 22], r: [214, 32, 34], R: [250, 100, 86], y: [240, 196, 80], b: [40, 24, 20], B: [96, 66, 54] },
  pixels: [
    '................', '.....dddddd.....', '...ddrrrrrrdd...', '..drrRRRrrrrrd..',
    '.drrRRrrrrrrrrd.', '.drRrrrrryyrrrd.', '.drrrrrrrrrrrrd.', '.drrrrrrrrrrrrd.',
    '.ddrrrrrrrrrrdd.', '..ddddddddddddd.', '..bbb.bbbb.bbb..', '.bbBbbbbbbbbBbb.',
    '..bbbb.bb.bbbb..', '................', '................', '................',
  ],
};
ITEM_ART[ITEM.STOMP_BOOTS] = {
  cores: { n: [118, 64, 28], N: [172, 106, 52], s: [44, 26, 18], y: [240, 196, 80] },
  pixels: [
    '................', '................', '..nNn.....nNn...', '..nNn.....nNn...',
    '..nNn.....nNn...', '..nyn.....nyn...', '..nNn.....nNn...', '..nNn.....nNn...',
    '..nNnn....nNnn..', '..nNNnn...nNNnn.', '.nnNNnnn.nnNNnnn', '.sssssss.sssssss',
    '................', '................', '................', '................',
  ],
};
RECIPES.push(
  { nome: 'Boné do Bigodão', ingredientes: [[ITEM.CLOTH, 4], [ITEM.FIBER, 2], [ITEM.LEATHER, 1]], resultado: { item: ITEM.MOUSTACHE_CAP, quantidade: 1 } },
  { nome: 'Botas Pisa-Pisa', ingredientes: [[ITEM.LEATHER, 4], [ITEM.METAL_BAR, 1]], resultado: { item: ITEM.STOMP_BOOTS, quantidade: 1 } },
);

// ---------------------------------------------------------------- visual no boneco
Object.assign(PLAYER_PALETTE, { Q: [34, 22, 18], T: [86, 58, 46] });
const CAP_HAT_ROWS = {
  name: 'Boné do Bigodão', clip: 4, at: [1, -1], rows: [
    '...ABBBBA.......',
    '..ABCCDDCBA.....',
    '.ABCCCCCyyCA....',
    '.ABCCCCCCCCBA...',
    'ABBCCCCCCCCBAAAA',
    'AAAAAAAAAAAAAAA.',
  ],
};
const CAP_MOUSTACHE = { name: 'Bigodão', at: [8, 11], rows: ['.QQQQQQ.', 'QQTQQTQQ', '.Q....Q.'] };
const capWorn = () => { try { return game.hat === ITEM.MOUSTACHE_CAP && !PLAYER_LOOK_PREVIEW; } catch (e) { return false; } };
const stompBootsWorn = () => { try { return game.boots === ITEM.STOMP_BOOTS && !PLAYER_LOOK_PREVIEW; } catch (e) { return false; } };
{
  const baseHead = composeHead, basePalette = applyLookToPalette;
  composeHead = function (look) {
    if (!capWorn()) return baseHead(look);
    HATS.push(CAP_HAT_ROWS); BEARDS.push(CAP_MOUSTACHE);
    try { return baseHead({ ...look, hat: HATS.length - 1, beard: BEARDS.length - 1 }); } finally { HATS.pop(); BEARDS.pop(); }
  };
  applyLookToPalette = function (look) {
    basePalette(look);
    const P = PLAYER_PALETTE;
    if (game.outfit === ITEM.PLUMBER_SHIRT && !PLAYER_LOOK_PREVIEW) [P.n, P.N, P.v] = [[22, 40, 116], [38, 70, 172], [88, 124, 232]];   // macacÃ£o azul
    if (capWorn()) [P.A, P.B, P.C, P.D] = [[96, 10, 18], [160, 20, 26], [220, 36, 36], [252, 104, 88]];
    if (stompBootsWorn()) { [P.x, P.X, P.z] = [[62, 32, 16], [116, 64, 28], [170, 106, 54]]; P.q = [32, 22, 18]; }
    playerHeadCache = null;
  };
}
// Troca chapéu/botas e refaz o boneco
function setGearItem(g, key, item) {
  g[key] = item || null;
  applyLook(PLAYER_LOOK, renderer);
}

// ---------------------------------------------------------------- defesa
{
  const baseDefense = playerDefense;
  playerDefense = function (g) {
    let remaining = 1 - baseDefense(g);
    for (const [key, prop] of [['hat', 'chapeu'], ['boots', 'bota']]) remaining *= 1 - clamp(ITEM_DEFS[g[key]]?.[prop]?.defesa || 0, 0, 0.85);
    if (capSet(g)) remaining *= 0.94;                                          // bônus do conjunto completo
    return 1 - remaining;
  };
  const baseCooldown = InventoryUI.prototype.cooldownState;
  InventoryUI.prototype.cooldownState = function (item) {
    const s = baseCooldown.call(this, item);
    if (s && ITEM_DEFS[item]?.chapeu) s.ability = true;
    return s;
  };
}

// ---------------------------------------------------------------- Modo Arco-Íris (R) e Pisão
function capActivate(g) {
  const m = capState(g), p = g.player, now = g.clock || 0, rs = referenceState(g);
  if (g.hat !== ITEM.MOUSTACHE_CAP || (rs.ready.rainbow || 0) > now || m.until > now) return false;
  m.until = now + RAINBOW_TIME; rs.ready.rainbow = now + (capSet(g) ? RAINBOW_COOLDOWN - 20 : RAINBOW_COOLDOWN); playSfx('swing', p.cx, p.cy); toast('MODO ARCO-ÍRIS!');
  for (let i = 0; i < 10; i++) referenceSpark(g, p.cx, p.cy, [255, 220, 90], 1);
  return true;
}
function capState(g) { return (g.capState ??= { until: 0, key: false, trail: 0 }); }
const rainbowOn = (g) => (g.capState?.until || 0) > (g.clock || 0);
{
  const baseUpdate = updateReferences;
  updateReferences = function (g, dt) {
    baseUpdate(g, dt);
    const m = capState(g), p = g.player, now = g.clock || 0, key = input.down('KeyR'), edge = key && !m.key; m.key = key;
    const rs = referenceState(g);
    if (g.respawnPending || p.hp <= 0) { m.until = 0; return; }
    if (edge && !g.inventoryUI.open && !g.mapUI.open && !g.npcOpen && !g.adminOpen) capActivate(g);
    if (m.until > now) {
      p.invulnerable = Math.max(p.invulnerable || 0, 0.25);
      m.trail += dt;
      if (m.trail > 0.07) { m.trail = 0; const h = (now * 360) % 360, c = hsl2rgb(h); referenceSpark(g, p.cx + (Math.random() - 0.5) * 8, p.cy + (Math.random() - 0.5) * 14, c, 1); }
      for (const mob of g.mobs || []) {
        if (mob.dead || mob.sleeping || typeof mob.hit !== 'function') continue;
        if (p.x + p.w < mob.x || p.x > mob.x + mob.w || p.y + p.h < mob.y || p.y > mob.y + mob.h) continue;
        if ((mob._starHit || 0) > now) continue;
        mob._starHit = now + 0.6; mob.hit(10, p.cx); referenceSpark(g, mob.cx, mob.cy, [255, 240, 150], 3);
      }
    }
  };
  const baseMove = referenceMovement;
  referenceMovement = function (p, dt, controls, dir, jump) {
    baseMove(p, dt, controls, dir, jump);
    if (rainbowOn(game) && dir && !p.crouching && !p.dash) p.vx = clamp(p.vx + dir * 380 * dt, -WALK_SPEED * 1.25, WALK_SPEED * 1.25);
  };
  const baseDraw = drawReferences;
  drawReferences = function (ctx, g) {
    baseDraw(ctx, g);
    if (!rainbowOn(g)) return;
    const p = g.player, t = g.clock || 0, left = g.capState.until - t, fade = left < 1 ? (Math.sin(t * 24) * 0.5 + 0.5) : 1;
    ctx.save(); ctx.globalAlpha = 0.35 * fade;
    const c = hsl2rgb((t * 420) % 360), gr = ctx.createRadialGradient(p.cx, p.cy, 2, p.cx, p.cy, 26);
    gr.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},.9)`); gr.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`);
    ctx.fillStyle = gr; ctx.fillRect(p.cx - 28, p.cy - 28, 56, 56);
    ctx.globalAlpha = fade;
    for (let i = 0; i < 4; i++) {          // estrelinhas em órbita
      const a = t * 5 + i * Math.PI / 2, x = Math.round(p.cx + Math.cos(a) * 15), y = Math.round(p.cy + Math.sin(a) * 19), col = hsl2rgb((t * 420 + i * 90) % 360);
      ctx.fillStyle = `rgb(${col[0]},${col[1]},${col[2]})`; ctx.fillRect(x - 1, y - 3, 2, 6); ctx.fillRect(x - 3, y - 1, 6, 2); ctx.fillStyle = '#fff'; ctx.fillRect(x - 1, y - 1, 2, 2);
    }
    ctx.restore();
  };
}
// Pisão das botas: dano pequeno, pulinho curto e uma nuvenzinha de poeira (nada de faíscas coloridas)
{
  const baseAfter = referenceAfterMovement;
  referenceAfterMovement = function (p) {
    baseAfter(p);
    const g = game, f = p._referenceFall, now = g.clock || 0;
    if (g.boots !== ITEM.STOMP_BOOTS || !(f?.speed > 70) || p.climbing || p.swimming || p.crouching || g.mount || p.seat) return;
    for (const m of g.mobs || []) {
      if (m.dead || m.sleeping || (m._stompAt || 0) > now || typeof m.hit !== 'function') continue;
      if (!(f.bottom <= m.y + 10 && p.y + p.h >= m.y && p.y + p.h <= m.y + m.h * 0.7 && p.x + p.w > m.x && p.x < m.x + m.w)) continue;
      m._stompAt = now + 0.9; m.hit(6, p.cx); p.vy = -JUMP_SPEED * 0.55; p.onGround = false; p.invulnerable = Math.max(p.invulnerable || 0, 0.12);
      for (let i = 0; i < 4 && g.particles.length < 380; i++) g.particles.push({ x: m.cx + (Math.random() - 0.5) * m.w * 0.6, y: m.y, vx: (Math.random() - 0.5) * 40, vy: -10 - Math.random() * 14, life: 0.35, maxLife: 0.35, color: 'rgba(206,190,156,.85)', w: 2, h: 2, gravity: 30 });
      break;
    }
  };
  const baseHurt = referenceOnHurt;
  referenceOnHurt = function (g) { baseHurt(g); if (g.player === player && Math.random() < 0.25) capActivate(g); };   // às vezes o susto ativa o modo
}

// ---------------------------------------------------------------- música do Modo Arco-Íris (melodia original)
const RB_BPM = 156, RB_ROOTS = [48, 53, 55, 48];
const RB_LEAD = [72, -1, 76, 72, 79, -1, 76, -1,  77, -1, 81, 77, 84, -1, 81, -1,  79, -1, 83, 79, 86, -1, 83, 74,  76, 79, 84, -1, 79, 76, 72, -1];
{
  const baseMusic = Music.update;
  Music.update = function (g) {
    baseMusic.call(this, g);
    const A = g.crashAudio; if (!A || this.A !== A) return;
    if (!this.rb) { this.rb = A.a.createGain(); this.rb.gain.value = 0; this.rb.connect(this.out); this.rbStep = 0; this.rbNext = 0; }
    const now = A.now, on = rainbowOn(g) && GAME_OPTIONS.musicVolume > 0;
    this.rb.gain.setTargetAtTime(on ? 1 : 0, now, on ? 0.05 : 0.2);
    if (on) { this.calm.gain.setTargetAtTime(0.12, now, 0.1); this.battle.gain.setTargetAtTime(0.12, now, 0.1); } else { this.rbNext = 0; return; }
    if (!this.rbNext || this.rbNext < now) { this.rbNext = now + 0.05; this.rbStep = 0; }
    const step = 60 / RB_BPM / 2, ahead = now + 0.3;
    while (this.rbNext < ahead) {
      const t = this.rbNext, i = this.rbStep++, pos = i % 8, bar = Math.floor(i / 8) % 4, root = RB_ROOTS[bar], out = this.rb;
      if (pos % 2 === 0) this.note(out, { type: 'square', note: root - 12 + (pos === 6 ? 7 : 0), t, dur: step * 1.7, gain: 0.07, attack: 0.003, lp: 800 });
      if (pos === 0 || pos === 4) this.drum(out, { freq: 160, freqEnd: 50, dur: 0.18, gain: 0.5 }, t);
      if (pos % 2 === 1) this.noise(out, { type: 'highpass', freq: 8000, dur: 0.04, gain: 0.07 }, t);
      if (pos === 2 || pos === 6) this.noise(out, { type: 'bandpass', freq: 2000, q: 0.8, dur: 0.1, gain: 0.2 }, t);
      const n = RB_LEAD[i % 32];
      if (n >= 0) { this.note(out, { type: 'square', note: n, t, dur: step * 1.6, gain: 0.05, attack: 0.003, lp: 3200 }); this.note(out, { type: 'triangle', note: n - 12, t, dur: step * 1.6, gain: 0.04, attack: 0.003 }); }
      if (pos === 0) for (const k of [0, 4, 7]) this.note(out, { type: 'triangle', note: root + 12 + k, t, dur: step * 3.5, gain: 0.02, attack: 0.01, lp: 2200 });
      this.rbNext += step;
    }
  };
}

function hsl2rgb(h) {
  const k = (n) => (n + h / 30) % 12, a = 0.5, f = (n) => 0.5 - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

// ---------------------------------------------------------------- Camisa Encanada (a roupa do conjunto)
Object.assign(PLAYER_PALETTE, { g: [34, 70, 168], I: [86, 128, 232], U: [16, 36, 104] });
Object.assign(OUTFIT_JACKETS, { moustacheShirt: [[96, 14, 20], [168, 26, 30], [220, 44, 42], [252, 108, 96]] });
ITEM.PLUMBER_SHIRT = Math.max(...Object.values(ITEM)) + 1;
defItem(ITEM.PLUMBER_SHIRT, {
  name: 'Camisa Encanada', roupa: { defesa: 0.1, visual: 'moustacheShirt' }, maxStack: 1,
  descricao: 'Camisa vermelha com macacão azul e dois botões dourados, para quem vive de cano e de pulo. Defesa 10%. Com o boné, as botas e esta camisa vestidos juntos, vale o Conjunto Encanado Bigodão: +6% de defesa e o Modo Arco-Íris volta 20 s mais rápido.',
});
ITEM_ART[ITEM.PLUMBER_SHIRT] = {
  cores: { r: [220, 44, 42], R: [252, 112, 100], d: [128, 20, 28], g: [40, 78, 180], I: [100, 142, 236], U: [20, 40, 110], y: [246, 206, 100] },
  pixels: [
    '................', '...rrr....rrr...', '..rRRrr..rrRRr..', '.rRRrrgIIgrrrRr.', 'rRRrrrgIyIgrrrRr', 'rRrrrrgIIIgrrrRr',
    'rrrrrrgIIIgrrrrr', '.drrrrgIIIgrrrd.', '..drrrgIIIgrrd..', '..drrrgIIIgrrd..', '..ddrrgIIIgrdd..', '...ddrgUUUgdd...', '....ddrrrrrdd...', '................', '................', '................',
  ],
};
RECIPES.push({ nome: 'Camisa Encanada', ingredientes: [[ITEM.CLOTH, 6], [ITEM.FIBER, 3], [ITEM.LEATHER, 1]], resultado: { item: ITEM.PLUMBER_SHIRT, quantidade: 1 } });
