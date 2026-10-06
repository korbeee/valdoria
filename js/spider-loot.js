'use strict';

// =====================================================================================
//  ESPÓLIO DA FIANDEIRA  —  o que cai da Matriarca do Poço (js/spider-boss.js)
// =====================================================================================
// Cinco peças, todas garantidas:
//   Carretel da Matriarca  ferramenta: gancho de seda que prende em paredes e tetos e puxa
//   Agulha da Fiandeira    lança fina de bom alcance; golpes seguidos envenenam
//   Luvas de Seda          acessório: agarra a parede no ar e salta dela; recarrega no chão
//   Casulo de Caça         armadilha reutilizável: prende um inimigo pequeno; chefe só fica lento
//   Aranhinha Tecelã       mascote: anda junto e desce por um fio quando você para sob um teto
// O puxão do gancho e as luvas ficam em js/gear-movement.js.

Object.assign(ITEM, { MATRIARCH_SPOOL: 176, SPINNER_NEEDLE: 177, SILK_GLOVES: 178, HUNT_COCOON: 179, WEAVER_SPIDERLING: 180 });

// Estocada fina da agulha: quase reta, rápida para sair e para voltar
const NEEDLE_THRUST = { preparacao: 0.08, corte: 0.09, recuperacao: 0.15, arcoAntes: 12, arcoDepois: 3, recuo: 8, assenta: 2 };

defItem(ITEM.MATRIARCH_SPOOL, {
  name: 'Carretel da Matriarca', carretel: { alcance: 15, puxada: 520, velocidade: 980 }, maxStack: 1,
  descricao: 'Clique: lança um gancho de seda que prende em paredes e tetos e puxa você. Pule ou aperte S para soltar.',
});
defItem(ITEM.SPINNER_NEEDLE, {
  name: 'Agulha da Fiandeira', dano: 10, alcance: 48, rapidez: 0.95, maxStack: 1, perfilGolpe: NEEDLE_THRUST,
  veneno: { golpes: 2, dano: 3, tempo: 5, pausa: 2.5 },
  descricao: 'Lança fina de bom alcance. Acertar o mesmo bicho de novo em seguida o envenena.',
});
defItem(ITEM.SILK_GLOVES, {
  name: 'Luvas de Seda', acessorio: { luvas: true }, escalar: { tempo: 2 }, maxStack: 1,
  descricao: 'Equipado: no ar, empurre uma parede para agarrar por 2 s e pule para saltar dela. Recarrega ao tocar o chão.',
});
defItem(ITEM.HUNT_COCOON, {
  name: 'Casulo de Caça', casulo: { espera: 8, prende: 4, lento: 1.5, tamanho: 34 }, maxStack: 1,
  descricao: 'Botão direito: arma uma teia no chão. Prende um inimigo pequeno por 4 s; chefes só ficam lentos.',
});
defItem(ITEM.WEAVER_SPIDERLING, {
  name: 'Aranhinha Tecelã', acessorio: { aranhinha: true }, maxStack: 1,
  descricao: 'No cinto: uma aranhinha anda com você e desce por um fio quando você para sob um teto.',
});

// ---------- Ícones ----------
{
  const C = { k: [20, 14, 22], p: [66, 46, 74], P: [110, 80, 118], w: [238, 234, 246], W: [196, 190, 210], b: [120, 84, 50], B: [170, 122, 70],
    s: [96, 102, 116], S: [170, 176, 186], g: [90, 170, 70], G: [170, 230, 110], o: [255, 150, 60], r: [166, 38, 50] };
  ITEM_ART[ITEM.MATRIARCH_SPOOL] = { cores: C, pixels: [
    '..........SSs...', '.........S..s...', '.........S......', '..........Ss....', '...........w....', '..........w.....',
    '.........w......', '..bbbbbbw.......', '.bBBBBBBb.......', '.bwwwwwwb.......', '.bWwWwWwb.......', '.bwwwwwwb.......',
    '.bWwWwWwb.......', '.bBBBBBBb.......', '..bbbbbb........', '................',
  ] };
  ITEM_ART[ITEM.SPINNER_NEEDLE] = { cores: C, pixels: [
    '...............w', '..............wS', '.............wS.', '............WS..', '...........pP...', '..........pP....',
    '.........pP.....', '........pP......', '.......pP.......', '......kp........', '.....kp.........', '....kp..........',
    '...kp...........', '..kp............', '.kk.............', '................',
  ] };
  ITEM_ART[ITEM.SILK_GLOVES] = { cores: C, pixels: [
    '................', '..w.w.w.........', '..w.w.w.w.......', '..w.w.w.w.......', '..wwwwwww.......', '.wwwwwwww.......',
    '.wWwwwwww..w.w.w', '.wwwwwwWw..w.w.w', '..wwwwww...wwwww', '..WWWWWW..wwwwww', '..........wwwwWw', '..........wWwwww',
    '...........wwww.', '...........WWWW.', '................', '................',
  ] };
  ITEM_ART[ITEM.HUNT_COCOON] = { cores: C, pixels: [
    '................', '......w.........', '.....wWw........', '....wwWww.......', '...wWwwWww......', '...wwWwwWw......',
    '..wWwwWwwWw.....', '..wwWwwWwww.....', '..wWwwWwwWw.....', '...wwWwwWw......', '...wWwwWww......', '....wwWww.......',
    '.....wWw........', '......w.........', '....w...w.......', '...w.....w......',
  ] };
  ITEM_ART[ITEM.WEAVER_SPIDERLING] = { cores: C, pixels: [
    '.......w........', '.......w........', '.......w........', '.......w........', '.k..k..w..k..k..', '..k..k.w.k..k...',
    '...k.kpppk.k....', '....kpPPPpk.....', '.kkkpPPPPPpkkk..', '....pPwPPPp.....', '...kpPPPPPpk....', '..k.kpprppk.k...',
    '.k..k.ppp.k..k..', '....k.....k.....', '................', '................',
  ] };
}

// ---------- Carretel da Matriarca ----------
function fireGrapple(g, mx, my) {
  const rule = ITEM_DEFS[ITEM.MATRIARCH_SPOOL].carretel, p = g.player;
  if (g.grapple) { releaseGrapple(g); return; } // segundo clique solta
  const sx = p.cx, sy = p.y + 14, dx = mx - sx, dy = my - sy, d = Math.hypot(dx, dy) || 1;
  g.grapple = { phase: 'fly', sx, sy, x: sx, y: sy, vx: (dx / d) * rule.velocidade, vy: (dy / d) * rule.velocidade, max: rule.alcance * T };
  playSfx('silkThread', sx, sy);
}

function releaseGrapple(g) {
  if (!g.grapple) return;
  g.grapple = null;
}

function updateGrapple(g, dt) {
  const gr = g.grapple, p = g.player, w = g.world;
  if (!gr) return;
  if (!(ITEM_DEFS[g.inventory.slots[g.selected]?.item]?.carretel) || g.mount || p.swimming) { releaseGrapple(g); return; }
  if (gr.phase === 'fly') {
    const n = Math.max(1, Math.ceil(Math.hypot(gr.vx, gr.vy) * dt / 4));
    for (let i = 0; i < n; i++) {
      gr.x += gr.vx * dt / n; gr.y += gr.vy * dt / n;
      if (w.isSolid(Math.floor(gr.x / T), Math.floor(gr.y / T))) {
        gr.x -= gr.vx * dt / n * 0.5; gr.y -= gr.vy * dt / n * 0.5; // assenta na face do bloco
        gr.phase = 'pull';
        playSfx('hit', gr.x, gr.y, { tile: TILE.COBWEB });
        silkPuff(g, gr.x, gr.y, 6);
        bfx(g, 'ring', gr.x, gr.y, { r0: 2, r1: 12, life: .3, color: [236, 230, 250], w: 2 });
        return;
      }
      if (Math.hypot(gr.x - p.cx, gr.y - p.y - 14) > gr.max) { gr.phase = 'back'; return; }
    }
  } else if (gr.phase === 'back') { // não prendeu em nada: o fio volta
    const dx = p.cx - gr.x, dy = p.y + 14 - gr.y, d = Math.hypot(dx, dy);
    if (d < 14) { g.grapple = null; return; }
    gr.x += (dx / d) * 1100 * dt; gr.y += (dy / d) * 1100 * dt;
  } else if (Math.hypot(gr.x - p.cx, gr.y - p.y) > 24 * T) releaseGrapple(g);
}


// ---------- Agulha da Fiandeira: veneno ----------
function spiderOnSwordHit(g, s, mob) {
  const rule = ITEM_DEFS[s.item]?.veneno;
  if (!rule || !mob || mob.dead) return;
  const now = g.clock || 0;
  if (mob.venomFrom !== s.item || now - (mob.venomT || -9) > rule.pausa) mob.venomN = 0;
  mob.venomFrom = s.item; mob.venomT = now;
  if (++mob.venomN < rule.golpes) return;
  const fresh = !mob.poison;
  mob.poison = { t: rule.tempo, dps: rule.dano, tick: 0 };
  mobParticles(g, mob, 6, 'rgb(140,220,90)');
  bfx(g, 'flash', mob.cx, mob.cy, { r0: 3, r1: 20, life: .25, color: [150, 240, 90], a: .5 });
  for (let i = 0; i < 7; i++) bfx(g, 'drop', mob.cx, mob.cy, { vx: (Math.random() - .5) * 110, vy: -50 - Math.random() * 80, grav: 650, size: 1 + (Math.random() < .5 ? 1 : 0), life: .8, pal: BFX_PAL.venom });
  if (fresh) toast('Envenenado!');
}

function updatePoison(g, dt) {
  for (const m of g.mobs) {
    const v = m.poison;
    if (!v || m.dead) continue;
    v.t -= dt; v.tick += dt;
    // bolhas de veneno subindo e pingos escorrendo (js/boss-fx.js)
    if (Math.random() < dt * 5) bfx(g, 'bubble', m.x + Math.random() * m.w, m.y + m.h * (0.2 + Math.random() * 0.5), { vy: -18 - Math.random() * 10, size: 1.5 + Math.random() * 1.5, life: 0.7 + Math.random() * 0.4, pal: BFX_PAL.venom });
    if (Math.random() < dt * 3) bfx(g, 'drop', m.x + Math.random() * m.w, m.y + m.h * 0.6, { vy: 8, grav: 500, size: 1, life: 0.8, pal: BFX_PAL.venom });
    if (v.tick >= 1) { v.tick = 0; m.hit(v.dps, m.cx); }
    if (v.t <= 0) m.poison = null;
  }
}

// ---------- Casulo de Caça ----------
function placeHuntCocoon(g) {
  const rule = ITEM_DEFS[ITEM.HUNT_COCOON].casulo, p = g.player, w = g.world;
  if ((g.clock || 0) < (g.cocoonReady || 0)) { toast(`A seda ainda está secando: ${Math.ceil(g.cocoonReady - g.clock)} s.`); return; }
  // Chão logo à frente dos pés
  const tx = Math.floor((p.cx + p.facing * 20) / T);
  let ty = Math.floor((p.y + p.h) / T), ok = false;
  for (let d = -1; d <= 3 && !ok; d++) if (w.isSolid(tx, ty + d) && !w.isSolid(tx, ty + d - 1)) { ty += d; ok = true; }
  if (!ok) { toast('Precisa de chão firme para armar o casulo.'); return; }
  g.cocoonTrap = { x: (tx + 0.5) * T, y: ty * T, age: 0 };
  g.cocoonReady = (g.clock || 0) + rule.espera;
  g.placeCooldown = 0.4;
  playSfx('silkThread', p.cx, p.cy);
  toast('Casulo armado.');
}

function updateCocoonTrap(g, dt) {
  const tr = g.cocoonTrap, rule = ITEM_DEFS[ITEM.HUNT_COCOON].casulo;
  if (!tr) return;
  tr.age += dt;
  if (tr.age < 0.3) return;
  for (const m of g.mobs) {
    if (m.dead || m === g.mount || !(m.hostile || m.boss) || m.def?.aquatic) continue;
    if (Math.abs(m.cx - tr.x) > m.w / 2 + 8 || Math.abs(m.y + m.h - tr.y) > 10) continue;
    if (m.boss) { m.cocoonSlow = rule.lento; toast('O chefe arrebentou a teia, mas ficou lento.'); }
    else if (m.w <= rule.tamanho) { m.cocoonT = rule.prende; m.vx = 0; toast('Pego no casulo!'); }
    else { m.cocoonSlow = rule.lento; toast('Grande demais para o casulo: só ficou lento.'); }
    silkPuff(g, tr.x, tr.y - 6, 10);
    bfx(g, 'ring', tr.x, tr.y - 2, { r0: 3, r1: 18, flat: .4, life: .35, color: [236, 230, 250], w: 2 });
    playSfx('silkThread', tr.x, tr.y);
    g.cocoonTrap = null;
    return;
  }
}

// Bicho preso: não anda nem ataca. true = pulou a atualização dele (chamado de js/mobs.js)
function cocoonHold(m, dt) {
  if (!(m.cocoonT > 0)) return false;
  m.cocoonT -= dt;
  m.vx = 0;
  m.applyGravity(dt); m.moveY(m.vy * dt, game.world);
  m.hurtTimer = Math.max(0, (m.hurtTimer || 0) - dt);
  return true;
}
// Bicho lento: devolve parte do caminho que ele andou
function cocoonSlowAfter(m, oldX, dt) {
  if (!(m.cocoonSlow > 0)) return;
  m.cocoonSlow -= dt;
  m.x = oldX + (m.x - oldX) * 0.4;
}


// ---------- Aranhinha Tecelã (mascote) ----------
function updateSpiderling(g, dt) {
  if (!accessoryPower(g, 'aranhinha')) { g.spiderling = null; return; }
  const p = g.player, w = g.world;
  if (!(g.spiderling instanceof Body)) {
    const c = new Body(0, 0, 10, 7);
    c.clock = 0; c.gait = 0; c.facing = p.facing; c.mode = 'walk';
    c.x = p.cx - p.facing * 18 - 5; c.y = p.y + p.h - 7.01;
    if (c.collides(w, c.x, c.y)) { c.x = p.x; c.y = p.y + p.h - 7.01; }
    g.spiderling = c;
  }
  const c = g.spiderling;
  c.clock += dt;
  if (Math.hypot(p.cx - c.cx, p.cy - c.cy) > 40 * T) { c.mode = 'walk'; c.x = p.x; c.y = p.y + p.h - c.h - 0.01; c.vy = 0; }
  const still = p.onGround && Math.abs(p.vx) < 5 && !g.grapple;
  c.stillT = still ? (c.stillT || 0) + dt : 0;

  if (c.mode === 'walk') {
    // Parou embaixo de um teto: sobe num fio e desce na altura da cabeça
    if (c.stillT > 0.8) {
      const ax = p.cx + p.facing * 12, tx = Math.floor(ax / T);
      let ceil = null;
      for (let ty = Math.floor(p.y / T); ty > Math.floor(p.y / T) - 12; ty--) if (w.isSolid(tx, ty)) { ceil = (ty + 1) * T; break; }
      if (ceil !== null && Math.abs(ax - c.cx) < 3 * T) {
        c.mode = 'thread'; c.anchorX = ax; c.anchorY = ceil; c.hangY = c.y; c.targetY = p.y + 4; c.rise = true;
        c.x = ax - c.w / 2;
      }
    }
    const dx = p.cx - p.facing * 18 - c.cx;
    c.vx = Math.abs(dx) > 6 ? Math.sign(dx) * Math.min(200, 40 + Math.abs(dx) * 2) : 0;
    if (c.vx) c.facing = Math.sign(c.vx);
    const old = c.x;
    c.applyGravity(dt);
    c.moveX(c.vx * dt, w);
    if (c.vx && Math.abs(c.x - old) < Math.abs(c.vx * dt) * 0.3 && c.onGround) c.vy = -260; // pula o degrau
    c.moveY(c.vy * dt, w);
    c.gait += Math.abs(c.x - old) / 3;
    c.threadY = null;
  } else {
    // No fio: sobe até o teto e desce devagar até a altura da cabeça, balançando
    if (!still || !w.isSolid(Math.floor(c.anchorX / T), Math.floor((c.anchorY - 1) / T))) { c.mode = 'walk'; c.vy = 60; return; }
    if (c.rise) { c.y -= 120 * dt; if (c.y <= c.anchorY + 1) { c.y = c.anchorY + 1; c.rise = false; } }
    else c.y = Math.min(c.targetY + Math.sin(c.clock * 2) * 2, c.y + 40 * dt);
    c.x = c.anchorX - c.w / 2 + Math.sin(c.clock * 1.3) * 1.5;
    c.facing = p.facing;
    c.threadY = c.anchorY;
  }
}

// Aranhinha Tecelã: filhote felpudo de pelagem ameixa, olhos grandes e brilhantes, presas laranja,
// oito pernas articuladas (as de longe mais escuras), abdome com uma marca que pulsa em brasa e uma
// aura suave de seda. Quadros: 8 de caminhada x (de pé | pendurada no fio) x (olhos abertos | piscando) x 4 pulsos.
let spiderlingSprites = null;
const SPIDERLING_PAL = {
  d: [44, 30, 58], s: [78, 56, 98], m: [118, 90, 142], l: [164, 132, 186], h: [212, 188, 230],
  leg: [58, 42, 74], legL: [142, 112, 166], joint: [208, 182, 228],
  eye: [250, 246, 234], pupil: [22, 14, 30], fang: [255, 190, 110], mark: [255, 140, 52], markL: [255, 214, 130],
};
function spiderlingSprite(frame, hang, blink, pulse) {
  spiderlingSprites ??= new Map();
  const key = frame + (hang ? 'h' : '') + (blink ? 'b' : '') + pulse;
  if (spiderlingSprites.has(key)) return spiderlingSprites.get(key);
  const s = new Sprite(30, 22), C = SPIDERLING_PAL, G = 19; // G = linha do chão sob as patas
  const px = (x, y, c, a) => s.set(Math.round(x), Math.round(y), c, a);
  const line = (x0, y0, x1, y1, c) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); for (let i = 0; i <= n; i++) px(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, c); };
  const phase = (frame / 8) * Math.PI * 2;
  // pernas compridas e finas: quadril no tórax, joelho bem alto, pé no chão (as de longe andam em oposição)
  const legs = (far) => {
    for (let i = 0; i < 4; i++) {
      const hx = 13.5 + i * 1.2 + (far ? 0.8 : 0), hy = 13;
      const ph = phase + i * Math.PI / 2 + (far ? Math.PI : 0), q = hang ? 0 : Math.sin(ph), lift = hang ? 0 : Math.max(0, Math.cos(ph)) * 2.6;
      const kx = hx + (i - 1.5) * (hang ? 2.2 : 3.4), ky = hang ? 7.5 : 5 - lift * 0.5;
      const fx = hx + (i - 1.5) * (hang ? 3.4 : 7) + q * 2, fy = hang ? 12 + (i % 2) : G - lift;
      const col = far ? C.leg : C.legL;
      line(hx, hy, kx, ky, col); line(kx, ky, fx, fy, col);
      if (!far) { px(kx, ky - 1, C.joint); px(kx + 1, ky - 1, C.joint, 150); px(fx, fy, C.leg); }
    }
  };
  const blob = (cx, cy, rx, ry, seed) => {
    for (let y = -ry - 1; y <= ry + 1; y++) for (let x = -rx - 1; x <= rx + 1; x++) {
      const d = (x / rx) ** 2 + (y / ry) ** 2; if (d > 1) continue;
      const lit = -(y / ry) * 0.72 - (x / rx) * 0.3 + (hash2(x, y, seed) - 0.5) * 0.22;
      px(cx + x, cy + y, lit > 0.62 ? C.h : lit > 0.22 ? C.l : lit > -0.18 ? C.m : lit > -0.55 ? C.s : C.d);
      if (d > 0.6 && y < 0 && hash2(x, y, seed + 7) < 0.55) px(cx + x, cy + y - 1, C.l, 170);   // pelinhos no alto
    }
  };
  legs(true);
  blob(10, 13, 4.6, 3.9, 11);                             // abdome, pequeno e redondo
  const mk = pulse >= 2 ? C.markL : C.mark;               // ampulheta que pulsa em brasa
  px(10, 10, mk); px(9, 11, mk); px(10, 11, C.markL); px(11, 11, mk); px(10, 12, mk); px(10, 14, C.mark); px(9, 15, C.mark); px(11, 15, C.mark);
  px(4, 14, C.markL, 200);                                // fiandeira
  blob(17, 12.5, 4.5, 4.2, 23);                           // cabeça grande (carinha de filhote)
  // dois olhos grandes brilhantes (o de perto e o de longe) e dois pontinhos em cima
  if (blink) { line(18, 12, 21, 12, C.d); line(16, 11, 17, 11, C.d); }
  else {
    for (let y = 10; y <= 13; y++) for (let x = 18; x <= 21; x++) if (!((x === 18 || x === 21) && (y === 10 || y === 13))) px(x, y, C.eye);   // olho enorme (de perto)
    px(20, 12, C.pupil); px(21, 12, C.pupil); px(20, 13, C.pupil); px(20, 11, C.pupil); px(19, 11, [255, 255, 255]); px(19, 10, [255, 255, 255]);
    px(16, 10, C.eye); px(17, 10, C.eye); px(16, 11, C.eye); px(17, 11, C.pupil);                    // olho de longe
    px(16, 8, C.eye); px(18, 8, C.eye);                                                              // pontinhos brilhantes em cima
  }
  px(21, 14, C.fang); px(21, 15, C.fang); px(20, 15, C.fang); px(19, 16, C.l); px(18, 16, C.m); px(18, 15, [255, 160, 170], 170); px(19, 15, [255, 160, 170], 170);   // presas, palpos e bochecha corada      // presas e palpos
  px(16, 9, C.h); px(17, 9, C.h);
  legs(false);
  const img = s.finish([18, 10, 24]);
  spiderlingSprites.set(key, img);
  return img;
}

function drawSpiderling(ctx, g) {
  const c = g.spiderling;
  if (!c) return;
  const hang = c.mode === 'thread', t = c.clock || 0, still = Math.abs(c.vx || 0) < 5;
  if (hang && c.threadY !== null) {
    ctx.fillStyle = 'rgba(236,232,246,0.85)';
    ctx.fillRect(Math.round(c.cx), Math.round(c.threadY), 1, Math.max(1, Math.round(c.y - c.threadY)));
    ctx.fillStyle = 'rgba(190,170,230,0.5)'; ctx.fillRect(Math.round(c.cx) + 1, Math.round(c.threadY), 1, Math.max(1, Math.round(c.y - c.threadY) - 3));
  }
  const frame = Math.floor(c.gait) % 8, blink = (t % 4.3) < 0.16, pulse = Math.floor((Math.sin(t * 3) + 1) * 1.99), bob = still && !hang ? Math.round(Math.sin(t * 3.2) * 0.6) : 0;
  ctx.save(); ctx.imageSmoothingEnabled = false;
  ctx.translate(Math.round(c.cx), Math.round(c.y + c.h));
  ctx.scale(c.facing < 0 ? -1 : 1, 1);
  // aura de seda (violeta e verde-água) e sombra no chão
  const gl = ctx.createRadialGradient(0, -9, 1, 0, -9, 19); gl.addColorStop(0, `rgba(190,160,255,${0.32 + pulse * 0.04})`); gl.addColorStop(0.55, 'rgba(110,230,200,0.08)'); gl.addColorStop(1, 'rgba(120,100,230,0)');
  ctx.fillStyle = gl; ctx.fillRect(-18, -26, 36, 36);
  if (!hang) { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-7, 0, 14, 1); }
  ctx.shadowColor = '#c3a2ff'; ctx.shadowBlur = 8;
  ctx.drawImage(spiderlingSprite(frame, hang, blink, pulse), -15, -19 + bob);
  ctx.restore();
}

// ---------- Ciclo ----------
function updateSpiderLoot(g, dt) {
  updateGrapple(g, dt);
  updatePoison(g, dt);
  updateCocoonTrap(g, dt);
  updateSpiderling(g, dt);
}

// Uso da mão (chamado de handleInteraction em js/game.js). true = consumiu o clique.
function spiderLootUse(g, heldDef, m, rightPressed, leftPressed) {
  if (heldDef?.carretel) {
    if (leftPressed || rightPressed) fireGrapple(g, m.x, m.y);
    return true;
  }
  if (heldDef?.casulo) {
    if (rightPressed && g.placeCooldown <= 0) placeHuntCocoon(g);
    return !!rightPressed;
  }
  return false;
}

// =====================================================================================
//  LIGAÇÃO COM O JOGO  —  espólios do tigre e da Fiandeira
// =====================================================================================
// Chamado no início de game.js, junto de initializeBearBoss
function initializeBossGear() {
  const always = (item) => [item, 1, 1, 1];
  WILDLIFE.tiger.drops.push(...[ITEM.PREDATOR_STEP, ITEM.AMBER_EYE, ITEM.STRIPED_CLOAK, ITEM.HUNT_INSTINCT].map(always));
  WILDLIFE.fiandeira.drops = [ITEM.MATRIARCH_SPOOL, ITEM.SPINNER_NEEDLE, ITEM.SILK_GLOVES, ITEM.HUNT_COCOON, ITEM.WEAVER_SPIDERLING].map(always);
  WILDLIFE.cascoferro.drops = [ITEM.CHITIN_DRILL, ITEM.CARAPACE_MAUL, ITEM.DIGGER_SHIELD, ITEM.SAND_BOOTS, ITEM.SNIFFER_MANDIBLE].map(always);
}

function updateBossGear(g, dt) {
  updateTigerLoot(g, dt);
  updateSpiderLoot(g, dt);
}

// Uso do item da mão. true = o clique foi consumido.
function bossGearUse(g, heldDef, m, rightPressed) {
  const left = input.mouse.left, leftPressed = left && !g._gearLeftWas;
  g._gearLeftWas = left;
  return tigerLootUse(g, heldDef, rightPressed) || spiderLootUse(g, heldDef, m, rightPressed, leftPressed);
}

// Antes da luz: teias, armadilha, mascote e o fio do gancho
function drawBossGearWorld(ctx, g) {
  drawStoryWorld(ctx, g); // mural, pedras-glifo, relógio de sol, cofre e placa (js/story.js)
  drawObservatoryTelescope(ctx, g); // js/beetle-boss.js
  drawShield(ctx, g);               // js/beetle-loot.js
  drawSniffer(ctx, g);
  drawSpiderEffects(ctx, g);
  drawBossAurasBehind(ctx, g);  // labaredas do manto por trás do corpo (js/boss-fx.js)
  drawCocoons(ctx, g);
  drawSpiderling(ctx, g);
  drawGrapple(ctx, g);
}
// Depois da luz: pegadas do instinto, marcas do Olho de Âmbar e os olhos da Fiandeira
function drawBossGearOverlay(ctx, g) {
  drawStoryGlow(ctx, g);   // o que brilha nos enigmas (js/story.js)
  drawBeetleEffects(ctx, g); // areia, faíscas e ondas do Casco de Ferro (js/beetle-boss.js)
  drawStunStars(ctx, g);     // atordoado pela marreta (js/beetle-loot.js)
  drawHuntInstinct(ctx, g);
  drawAmberEye(ctx, g);
  drawSpiderEyes(ctx, g);
}
