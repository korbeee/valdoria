'use strict';

// =====================================================================================
//  TRIDENTE — estocada de lança com poder da água (botão esquerdo) e arremesso (direito)
// =====================================================================================
//  Esquerdo: recua o tridente e estoca para a frente (na direção do mouse). No pico da
//            estocada sai uma LANÇA D'ÁGUA: um jato em espiral que atravessa até 3 inimigos
//            e explode num respingo que empurra quem estiver perto.
//  Direito:  arremessa o tridente. Ele atravessa os bichos, crava no bloco com uma explosão
//            de água e depois volta voando sozinho para a mão (acertando quem estiver no caminho).
//  Dentro d'água tudo fica mais forte (MARÉ): mais dano, jato maior e mais rápido.
// =====================================================================================

const TRIDENT = {
  recuo: 0.09, estocada: 0.06, segura: 0.07, volta: 0.13, // fases da estocada (s)
  recuoPx: 7, avancoPx: 13,      // quanto a mão recua e avança na estocada
  anguloMax: 75,                 // graus acima/abaixo da horizontal que dá para mirar
  jato: { velocidade: 430, alcance: 15 * T, dano: 7, atravessa: 3, raio: 26, danoRespingo: 4 },
  arremesso: { preparo: 0.16, solta: 0.14, velocidade: 660, gravidade: 260, dano: 14, danoVolta: 7, cravado: 0.45, voo: 1.3, raio: 34, danoRespingo: 6 },
  mare: 1.5,                     // multiplicador de dano dentro d'água
};

const tridentState = (g) => (g.trident ??= { anim: null, cooldown: 0, thrown: null, bolts: [], fx: [], puddles: [] });
const holdingTrident = (g) => !!ITEM_DEFS[g.inventory.slots[g.selected]?.item]?.tridente;
const inTide = (g) => !!g.player.swimming || g.world.waterAtPx(g.player.cx, g.player.cy);

// Ângulo do ombro até o mouse, preso ao lado para onde o jogador olha (±anguloMax)
function tridentAim(p, mouse) {
  const sh = shoulderPos(p, 0), dx = mouse.x - sh.x, dy = mouse.y - sh.y;
  const facing = Math.abs(dx) < 1 ? p.facing : Math.sign(dx);
  const local = clamp(Math.atan2(dy, Math.abs(dx)), -TRIDENT.anguloMax * DEG, TRIDENT.anguloMax * DEG);
  return { facing, ang: facing > 0 ? local : Math.PI - local };
}

// ---------- Entrada (chamada pelo handleInteraction com o tridente na mão) ----------
function updateTridentInput(g, dt, mouse, rightPressed) {
  const s = tridentState(g), p = g.player;
  if (s.anim || s.cooldown > 0) return;
  if (s.thrown) { if (rightPressed && g.toast.t <= 0) toast('O tridente está voltando...'); return; }
  const def = ITEM_DEFS[g.inventory.slots[g.selected].item];
  if (rightPressed) startTridentAnim(g, 'throw', mouse, def);
  else if (input.mouse.left) startTridentAnim(g, 'thrust', mouse, def);
}

function startTridentAnim(g, kind, mouse, def) {
  const s = tridentState(g), p = g.player, aim = tridentAim(p, mouse);
  s.item = g.inventory.slots[g.selected]?.item;
  s.anim = { kind, t: 0, ang: aim.ang, facing: aim.facing, fired: false, hit: new Set(), speed: def.rapidez || 1, damage: def.dano };
  p.facing = aim.facing;
  p.lockFacing = true;
  playSfx(kind === 'throw' ? 'tridentWindup' : 'tridentThrust', p.cx, p.cy);
}

// ---------- Animação ----------
const thrustLen = () => TRIDENT.recuo + TRIDENT.estocada + TRIDENT.segura + TRIDENT.volta;
const throwLen = () => TRIDENT.arremesso.preparo + TRIDENT.arremesso.solta;

// Quanto a mão está deslocada ao longo da mira (px) e se o tridente está na mão
function tridentReach(a) {
  if (a.kind === 'throw') {
    const P = TRIDENT.arremesso.preparo;
    return a.t < P ? lerp(0, -9, easeOutCubic(a.t / P)) : lerp(12, 4, easeOutCubic((a.t - P) / TRIDENT.arremesso.solta));
  }
  const R = TRIDENT.recuo, E = TRIDENT.estocada, S = TRIDENT.segura, t = a.t;
  if (t < R) return lerp(0, -TRIDENT.recuoPx, easeOutCubic(t / R));
  if (t < R + E) return lerp(-TRIDENT.recuoPx, TRIDENT.avancoPx, easeOutCubic((t - R) / E));
  if (t < R + E + S) return TRIDENT.avancoPx;
  return lerp(TRIDENT.avancoPx, 0, easeInOutCubic((t - R - E - S) / TRIDENT.volta));
}

// Avanço do corpo junto com a estocada
function tridentLunge(g) {
  const a = g.trident?.anim;
  if (!a) return 0;
  if (a.kind === 'throw') return a.t < TRIDENT.arremesso.preparo ? -a.facing : Math.round(a.facing * 2 * (1 - (a.t - TRIDENT.arremesso.preparo) / TRIDENT.arremesso.solta));
  const R = TRIDENT.recuo, E = TRIDENT.estocada, S = TRIDENT.segura;
  if (a.t < R) return -a.facing;
  if (a.t < R + E + S) return 3 * a.facing;
  return Math.round(3 * a.facing * (1 - (a.t - R - E - S) / TRIDENT.volta));
}

// Quadro do corpo (sem o braço da frente; os braços são desenhados junto do tridente)
function tridentBodyFrame(g) {
  const a = g.trident.anim, p = g.player;
  if (p.crouching) return PLAYER_ANIMS.crawlAttack; // engatinhando: estoca de quatro
  if (!p.onGround && !p.swimming) return PLAYER_ATTACK_AIR_FRAME;
  const early = a.kind === 'throw' ? a.t < TRIDENT.arremesso.preparo : a.t < TRIDENT.recuo;
  const peak = a.kind === 'throw' ? a.t < TRIDENT.arremesso.preparo + 0.07 : a.t < TRIDENT.recuo + TRIDENT.estocada + TRIDENT.segura;
  return PLAYER_ATTACK_FRAME + (early ? 0 : peak ? 1 : 2);
}

// Mão, ponta e direção do tridente neste quadro (objeto reaproveitado)
const _grip = { hx: 0, hy: 0, tipX: 0, tipY: 0, ang: 0, sx: 0, sy: 0 };
function tridentGrip(g) {
  const a = g.trident.anim, p = g.player, sh = shoulderPos(p, tridentLunge(g));
  let ang = a.ang;
  // Arremesso: no preparo o tridente sobe para trás da cabeça (ponta apontando mais para cima)
  if (a.kind === 'throw' && a.t < TRIDENT.arremesso.preparo) ang -= a.facing * 0.55 * easeOutCubic(a.t / TRIDENT.arremesso.preparo);
  const reach = 9 + tridentReach(a), c = Math.cos(ang), s = Math.sin(ang);
  _grip.sx = sh.x; _grip.sy = sh.y;
  _grip.hx = sh.x + c * reach; _grip.hy = sh.y + s * reach - (a.kind === 'throw' && a.t < TRIDENT.arremesso.preparo ? 5 * easeOutCubic(a.t / TRIDENT.arremesso.preparo) : 0);
  _grip.ang = ang;
  _grip.tipX = _grip.hx + c * TRIDENT_TIP; _grip.tipY = _grip.hy + s * TRIDENT_TIP;
  return _grip;
}

// ---------- Atualização (a cada passo fixo) ----------
function updateTrident(g, dt) {
  const s = tridentState(g), p = g.player;
  s.cooldown = Math.max(0, s.cooldown - dt);
  // Trocou de item no meio do golpe: cancela
  if (s.anim && !holdingTrident(g)) { s.anim = null; p.lockFacing = false; }
  if (s.anim) {
    const a = s.anim;
    a.t += dt * a.speed;
    if (a.kind === 'thrust') {
      const R = TRIDENT.recuo, E = TRIDENT.estocada, S = TRIDENT.segura;
      if (a.t >= R && a.t < R + E + S) stabHits(g, a);
      if (!a.fired && a.t >= R + E * 0.7) { a.fired = true; fireWaterBolt(g, a); }
      if (a.t >= thrustLen()) { s.anim = null; p.lockFacing = false; s.cooldown = s.cooldownTotal = 0.04; }
    } else {
      if (!a.fired && a.t >= TRIDENT.arremesso.preparo) { a.fired = true; throwTrident(g, a); }
      if (a.t >= throwLen()) { s.anim = null; p.lockFacing = false; s.cooldown = s.cooldownTotal = 0.1; }
    }
  }
  updateWaterBolts(g, dt);
  updateThrownTrident(g, dt);
  updateTridentFx(g, dt);
}

// Ponta do tridente fura quem estiver na frente (cada inimigo leva 1 acerto por estocada)
function stabHits(g, a) {
  const gp = tridentGrip(g), c = Math.cos(gp.ang), s = Math.sin(gp.ang);
  const dmg = Math.round(a.damage * (inTide(g) ? TRIDENT.mare : 1));
  for (const mob of g.mobs) {
    if (mob.dead || mob === g.mount || a.hit.has(mob)) continue;
    for (let k = -2; k <= 16; k += 2) {
      const hx = gp.tipX - c * k, hy = gp.tipY - s * k;
      if (!mob.containsPoint(hx, hy, 3)) continue;
      a.hit.add(mob);
      mob.hit(dmg, g.player.cx);
      mob.vx = c * 240; mob.vy = Math.min(mob.vy, -150 + s * 120);
      mobParticles(g, mob, 5, 'rgb(230,70,80)');
      splashBurst(g, hx, hy, gp.ang, 0.7);
      g.hitStop = 0.05; g.shake = 2.4;
      playSfx('arrowHit', hx, hy);
      break;
    }
  }
}

// ---------- Lança d'água ----------
function fireWaterBolt(g, a) {
  const s = tridentState(g), gp = tridentGrip(g), tide = inTide(g), J = TRIDENT.jato;
  const power = tide ? 1.85 : 1.45, sp = J.velocidade * (tide ? 1.25 : 1);
  s.bolts.push({
    x: gp.tipX, y: gp.tipY, vx: Math.cos(a.ang) * sp, vy: Math.sin(a.ang) * sp, ang: a.ang,
    dist: 0, range: J.alcance * (tide ? 1.3 : 1), power, tide, damage: Math.round(J.dano * (tide ? TRIDENT.mare : 1)),
    pierce: J.atravessa, hit: new Set(), spin: Math.random() * 6, age: 0, trail: [],
  });
  // Anel de pressão saindo da ponta e borrifo para os lados
  pushFx(s, { type: 'ring', x: gp.tipX, y: gp.tipY, ang: a.ang, r0: 3, r1: 16 * power, life: 0.22, w: 2 });
  pushFx(s, { type: 'ring', x: gp.tipX, y: gp.tipY, ang: a.ang, r0: 2, r1: 10 * power, life: 0.16, w: 1, delay: 0.04 });
  // Cone de água jorrando da ponta: pedaços grossos e gotas
  for (let i = 0; i < 16; i++) {
    const spread = a.ang + (Math.random() - 0.5) * 0.9, v = 120 + Math.random() * 220, big = i < 6;
    pushFx(s, { type: 'drop', x: gp.tipX, y: gp.tipY, vx: Math.cos(spread) * v, vy: Math.sin(spread) * v - 30, life: 0.5 + Math.random() * 0.4, size: big ? 2 : 1 });
  }
  playSfx('waterBolt', gp.tipX, gp.tipY, { power });
}

function updateWaterBolts(g, dt) {
  const s = g.trident, w = g.world;
  for (let i = s.bolts.length - 1; i >= 0; i--) {
    const b = s.bolts[i];
    b.age += dt; b.spin += dt * 22;
    const speed = Math.hypot(b.vx, b.vy), steps = Math.max(1, Math.ceil((speed * dt) / 4));
    let end = false;
    for (let k = 0; k < steps && !end; k++) {
      b.x += (b.vx * dt) / steps; b.y += (b.vy * dt) / steps; b.dist += (speed * dt) / steps;
      for (const mob of g.mobs) {
        if (mob.dead || mob === g.mount || b.hit.has(mob) || !mob.containsPoint(b.x, b.y, 5 * b.power)) continue;
        b.hit.add(mob);
        mob.hit(b.damage, b.x - Math.sign(b.vx) * 10);
        mob.vx = Math.cos(b.ang) * 300; mob.vy = -210;
        mobParticles(g, mob, 4, 'rgb(230,70,80)');
        splashBurst(g, b.x, b.y, b.ang, 0.8 * b.power);
        g.hitStop = Math.max(g.hitStop, 0.03); g.shake = Math.max(g.shake, 2);
        if (--b.pierce <= 0) { end = true; break; }
      }
      const tx = Math.floor(b.x / T), ty = Math.floor(b.y / T);
      if (!end && (!w.inBounds(tx, ty) || w.isSolid(tx, ty))) {
        b.x -= (b.vx * dt) / steps; b.y -= (b.vy * dt) / steps; // explode do lado de fora do bloco
        end = true;
      }
    }
    if (!end && b.dist >= b.range) end = true;
    // Rastro: posições recentes (a espiral é desenhada em cima delas)
    b.trail.unshift(b.x, b.y);
    if (b.trail.length > 44) b.trail.length = 44;
    // Gotas e névoa soltas no caminho (bolhas quando está embaixo d'água)
    if (w.waterAtPx(b.x, b.y)) { if (Math.random() < dt * 30) bubble(g, b.x - b.vx * 0.02, b.y + (Math.random() - 0.5) * 6); }
    else {
      const r = 7 * b.power, n = Math.random() < dt * 70 ? 1 : 0;
      for (let k = 0; k < n; k++) {
        const side = (Math.random() - 0.5) * 2 * r, nx = -Math.sin(b.ang), ny = Math.cos(b.ang);
        pushFx(s, { type: 'drop', x: b.x - b.vx * 0.03 + nx * side, y: b.y + ny * side, vx: b.vx * 0.15 + (Math.random() - 0.5) * 40, vy: -10 - Math.random() * 60, life: 0.6 + Math.random() * 0.4, size: 2 + (Math.random() < 0.35 ? 1 : 0) });
      }

    }
    if (Math.random() < dt * 14) pushFx(s, { type: 'mist', x: b.x - b.vx * 0.04, y: b.y, vx: b.vx * 0.05, vy: -8, r0: 4 * b.power, r1: 11 * b.power, life: 0.45 });
    if (end) {
      waterExplosion(g, b.x, b.y, b.ang, b.power, TRIDENT.jato.raio * b.power, Math.round(TRIDENT.jato.danoRespingo * (b.tide ? TRIDENT.mare : 1)), b.hit);
      s.bolts.splice(i, 1);
    }
  }
}

// ---------- Tridente arremessado ----------
function throwTrident(g, a) {
  const s = tridentState(g), gp = tridentGrip(g), A = TRIDENT.arremesso, tide = inTide(g);
  const sp = A.velocidade * (tide ? 1.2 : 1);
  s.thrown = {
    x: gp.tipX, y: gp.tipY, vx: Math.cos(a.ang) * sp, vy: Math.sin(a.ang) * sp,
    ang: a.ang, state: 'fly', t: 0, hit: new Set(), tide, trail: [],
    damage: Math.round(A.dano * (tide ? TRIDENT.mare : 1)),
  };
  playSfx('tridentThrow', g.player.cx, g.player.cy);
}

function updateThrownTrident(g, dt) {
  const s = g.trident, tr = s.thrown;
  if (!tr) return;
  const w = g.world, p = g.player, A = TRIDENT.arremesso;
  tr.t += dt;
  const hitMobs = (dmg) => {
    for (const mob of g.mobs) {
      if (mob.dead || mob === g.mount || tr.hit.has(mob) || !mob.containsPoint(tr.x, tr.y, 4)) continue;
      tr.hit.add(mob);
      mob.hit(dmg, tr.x - Math.sign(tr.vx) * 10);
      mob.vx = Math.sign(tr.vx) * 280; mob.vy = -180;
      mobParticles(g, mob, 6, 'rgb(230,70,80)');
      splashBurst(g, tr.x, tr.y, tr.ang, 0.9);
      g.hitStop = Math.max(g.hitStop, 0.05); g.shake = Math.max(g.shake, 3);
      playSfx('arrowHit', tr.x, tr.y);
    }
  };

  if (tr.state === 'fly') {
    tr.vy += A.gravidade * dt;
    tr.ang = Math.atan2(tr.vy, tr.vx);
    const speed = Math.hypot(tr.vx, tr.vy), steps = Math.max(1, Math.ceil((speed * dt) / 4));
    for (let k = 0; k < steps && tr.state === 'fly'; k++) {
      tr.x += (tr.vx * dt) / steps; tr.y += (tr.vy * dt) / steps;
      hitMobs(tr.damage);
      const tx = Math.floor(tr.x / T), ty = Math.floor(tr.y / T);
      if (!w.inBounds(tx, ty) || w.isSolid(tx, ty)) {
        // Crava no bloco (a ponta entra 4 px) e explode em água
        tr.state = 'stuck'; tr.t = 0;
        const bx = tr.x - Math.cos(tr.ang) * 4, by = tr.y - Math.sin(tr.ang) * 4;
        waterExplosion(g, bx, by, tr.ang, tr.tide ? 1.35 : 1.1, A.raio * (tr.tide ? 1.3 : 1), Math.round(A.danoRespingo * (tr.tide ? TRIDENT.mare : 1)), tr.hit);
        playSfx('tridentStick', tr.x, tr.y, { tile: w.getTile(tx, ty) });
        g.shake = Math.max(g.shake, 3.5);
      }
    }
    if (tr.state === 'fly' && tr.t > A.voo) { tr.state = 'return'; tr.t = 0; tr.hit.clear(); playSfx('tridentReturn', tr.x, tr.y); }
  } else if (tr.state === 'stuck') {
    if (tr.t > A.cravado) { tr.state = 'return'; tr.t = 0; tr.hit.clear(); tr.vx = tr.vy = 0; playSfx('tridentReturn', tr.x, tr.y); }
  } else {
    // Volta para a mão atravessando os blocos, cada vez mais rápido
    const hx = p.cx, hy = p.y + p.h * 0.45, dx = hx - tr.x, dy = hy - tr.y, d = Math.hypot(dx, dy) || 1;
    const want = Math.min(900, 220 + tr.t * 900);
    tr.vx += (dx / d * want - tr.vx) * Math.min(1, dt * 8);
    tr.vy += (dy / d * want - tr.vy) * Math.min(1, dt * 8);
    tr.x += tr.vx * dt; tr.y += tr.vy * dt;
    tr.ang = Math.atan2(tr.vy, tr.vx);
    hitMobs(Math.round(A.danoVolta * (tr.tide ? TRIDENT.mare : 1)));
    if (d < 14 || d > 90 * T || tr.t > 5) {
      s.thrown = null;
      splashBurst(g, hx, hy, tr.ang, 0.5);
      playSfx('tridentCatch', hx, hy);
      return;
    }
  }
  if (tr.state !== 'stuck') {
    tr.trail.unshift(tr.x, tr.y);
    if (tr.trail.length > 20) tr.trail.length = 20;
    if (Math.random() < dt * 30) pushFx(s, { type: 'drop', x: tr.x, y: tr.y, vx: -tr.vx * 0.08 + (Math.random() - 0.5) * 40, vy: -20 - Math.random() * 40, life: 0.3 + Math.random() * 0.3, size: 1 });
    if (Math.random() < dt * 20) pushFx(s, { type: 'spark', x: tr.x + (Math.random() - 0.5) * 8, y: tr.y + (Math.random() - 0.5) * 8, vx: 0, vy: -12, life: 0.3 });
  } else if (tr.trail.length) tr.trail.length = Math.max(0, tr.trail.length - 2);
}

// ---------- Explosões e respingos ----------
// Normal da superfície atingida, a partir da direção em que o golpe vinha (chão, teto ou parede)
// Olha qual lado encostado no ponto é bloco (chão, teto ou parede), preferindo o que fica na frente do
// golpe; sem bloco nenhum (estourou no ar ou num bicho), o respingo volta para quem atirou.
function hitNormal(world, x, y, ang) {
  const c = Math.cos(ang), s = Math.sin(ang);
  let best = null, score = -Infinity;
  for (const [dx, dy, n] of [[0, 1, -Math.PI / 2], [0, -1, Math.PI / 2], [1, 0, Math.PI], [-1, 0, 0]]) {
    if (!world.isSolid(Math.floor((x + dx * 5) / T), Math.floor((y + dy * 5) / T))) continue;
    const sc = dx * c + dy * s + (dy > 0 ? 0.3 : 0); // chão ganha no empate: é o caso mais comum
    if (sc > score) { score = sc; best = n; }
  }
  return best ?? ang + Math.PI;
}

// Estouro de água: dano e empurrão em volta (quem já levou o golpe principal não leva de novo).
// Visual limpo: duas ondinhas (círculos achatados) espalhando pela superfície atingida, gotas finas
// saindo em leque e um pouco de névoa.
function waterExplosion(g, x, y, ang, power, radius, damage, skip) {
  const s = tridentState(g);
  for (const mob of g.mobs) {
    if (mob.dead || mob === g.mount || skip?.has(mob)) continue;
    const dx = mob.cx - x, dy = mob.cy - y, d = Math.hypot(dx, dy);
    if (d > radius + Math.max(mob.w, mob.h) / 2) continue;
    mob.hit(damage, x);
    mob.vx = (dx / (d || 1)) * 260; mob.vy = -240;
    mobParticles(g, mob, 3, 'rgb(230,70,80)');
  }
  const n = hitNormal(g.world, x, y, ang), under = g.world.waterAtPx(x, y);
  pushFx(s, { type: 'ripple', x, y, ang: n, r0: 3, r1: radius * 0.9, life: 0.45 });
  pushFx(s, { type: 'ripple', x, y, ang: n, r0: 2, r1: radius * 0.55, life: 0.4, delay: 0.1 });
  pushFx(s, { type: 'flash', x, y, r0: 2, r1: radius * 0.45, life: 0.12 });
  // Gotas finas saindo do ponto atingido, em leque em volta da normal
  for (let i = 0; i < 16 * power; i++) {
    const a = n + (Math.random() - 0.5) * 1.9, v = 110 + Math.random() * 190 * power;
    pushFx(s, { type: 'drop', x: x + Math.cos(n) * 3, y: y + Math.sin(n) * 3, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.6 + Math.random() * 0.4, size: Math.random() < 0.35 ? 2 : 1 });
  }
  for (let i = 0; i < 3; i++) pushFx(s, { type: 'mist', x: x + Math.cos(n) * 6 + (Math.random() - 0.5) * 10, y: y + Math.sin(n) * 6, vx: (Math.random() - 0.5) * 20, vy: -12, r0: 4, r1: 10 + Math.random() * 6, life: 0.5 });
  if (n < -1) addPuddle(g, x, y, 12 + radius * 0.6); // só no chão (normal para cima)
  if (under) for (let i = 0; i < 10; i++) bubble(g, x + (Math.random() - 0.5) * radius, y + (Math.random() - 0.5) * radius * 0.5);
  g.shake = Math.max(g.shake, 2 * power);
  playSfx('waterImpact', x, y, { power });
}

// Respingo pequeno em leque, voltado para trás de `ang` (de onde veio o golpe)
function splashBurst(g, x, y, ang, power) {
  const s = tridentState(g);
  for (let i = 0; i < 10 * power; i++) {
    const a = ang + Math.PI + (Math.random() - 0.5) * 2.2, v = 70 + Math.random() * 170 * power;
    pushFx(s, { type: 'drop', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, life: 0.35 + Math.random() * 0.35, size: Math.random() < 0.3 ? 2 : 1 });
  }
  pushFx(s, { type: 'ripple', x, y, ang: ang + Math.PI, r0: 2, r1: 9 * power, life: 0.25 });
}

// Poça rasa no chão onde a água caiu: cresce, brilha e seca devagar. Poças vizinhas se juntam.
function addPuddle(g, x, y, width) {
  const w = g.world, s = tridentState(g), tx = Math.floor(x / T);
  let ty = Math.floor(y / T);
  for (let k = 0; k < 4 && !w.isSolid(tx, ty); k++) ty++;
  if (!w.isSolid(tx, ty) || w.isSolid(tx, ty - 1) || w.hasWater(tx, ty - 1)) return;
  const py = ty * T;
  const near = s.puddles.find((q) => q.y === py && Math.abs(q.x - x) < (q.w + width) / 2);
  if (near) { near.w = Math.min(48, Math.max(near.w, width) + width * 0.2); near.x = (near.x + x) / 2; near.t = Math.min(near.t, 0.3); return; }
  s.puddles.push({ x, y: py, w: width, t: 0, life: 3 + Math.random() * 1.5 });
  if (s.puddles.length > 30) s.puddles.shift();
}

function pushFx(s, e) {
  e.t = -(e.delay || 0);
  s.fx.push(e);
  if (s.fx.length > 400) s.fx.splice(0, s.fx.length - 400);
}

function updateTridentFx(g, dt) {
  const list = g.trident.fx;
  const puddles = g.trident.puddles;
  for (let i = puddles.length - 1; i >= 0; i--) if ((puddles[i].t += dt) >= puddles[i].life) puddles.splice(i, 1);
  for (let i = list.length - 1; i >= 0; i--) {
    const e = list[i];
    e.t += dt;
    if (e.t >= e.life) { list.splice(i, 1); continue; }
    if (e.t < 0 || e.vx === undefined) continue;
    if (e.type === 'drop') {
      const wet = g.world.waterAtPx(e.x, e.y);
      e.vy += (wet ? 120 : 680) * dt;                     // dentro d'água a gota quase flutua
      const drag = Math.exp(-(wet ? 5 : 0.5) * dt);
      e.vx *= drag; if (wet) e.vy *= drag;
    } else { e.vx *= Math.exp(-3 * dt); e.vy *= Math.exp(-3 * dt); }
    e.x += e.vx * dt; e.y += e.vy * dt;
    // Gota caindo que bate no chão: some com um pinguinho (e às vezes marca uma poça)
    if (e.type === 'drop' && e.vy > 0 && g.world.isSolid(Math.floor(e.x / T), Math.floor(e.y / T))) {
      const top = Math.floor(e.y / T) * T;
      if (e.size > 1) list.push({ type: 'drop', x: e.x, y: top - 1, vx: (Math.random() - 0.5) * 60, vy: -30 - Math.random() * 50, life: 0.2, size: 1, t: 0 });
      if (e.size > 1 && Math.random() < 0.2) addPuddle(g, e.x, top - 1, 5);
      list.splice(i, 1);
    }
  }
}


// ---------- Desenho ----------
// Tridente de lado, ponta para +x. Cabo comprido (maior que o braço), empunhadura em TRIDENT_GRIP.
const TRIDENT_SPR_W = 47, TRIDENT_GRIP = 17, TRIDENT_TIP = TRIDENT_SPR_W - 1 - TRIDENT_GRIP;
let tridentSpriteCache = null;
function tridentSprite() {
  if (tridentSpriteCache) return tridentSpriteCache;
  const W = TRIDENT_SPR_W, s = new Sprite(W, 9), c = W - 11; // c = coluna da travessa
  const shaft = [[36, 86, 96], [70, 140, 150], [110, 186, 192]], steel = [[120, 180, 190], [176, 222, 228], [236, 252, 252]], gold = [[176, 128, 40], [236, 196, 80]];
  for (let x = 0; x <= c - 2; x++) { s.set(x, 4, shaft[1]); s.set(x, 5, shaft[0]); if (x % 6 === 3) s.set(x, 4, shaft[2]); }
  for (let y = 3; y <= 6; y++) { s.set(0, y, gold[0]); s.set(1, y, gold[1]); }                   // ponteira
  for (const x of [TRIDENT_GRIP - 4, TRIDENT_GRIP + 3]) { s.set(x, 4, gold[1]); s.set(x, 5, gold[0]); } // anéis da pegada
  for (let y = 3; y <= 6; y++) { s.set(c - 2, y, gold[0]); s.set(c - 1, y, gold[1]); }           // colar dourado
  for (let y = 0; y <= 8; y++) s.set(c, y, y === 4 ? steel[2] : steel[0]);                       // travessa
  for (let x = c + 1; x <= W - 1; x++) { s.set(x, 4, x > W - 4 ? steel[2] : steel[1]); if (x < W - 2) s.set(x, 5, steel[0]); } // dente do meio
  for (let x = c + 1; x <= W - 4; x++) { s.set(x, 0, steel[1]); s.set(x, 8, steel[1]); }          // dentes de fora
  s.set(W - 3, 1, steel[2]); s.set(W - 3, 7, steel[2]); s.set(W - 5, 1, steel[0]); s.set(W - 5, 7, steel[0]); // farpas
  s.set(W - 2, 3, steel[1]); s.set(W - 3, 3, steel[0]);                                          // ponta do meio
  return (tridentSpriteCache = s.finish([20, 30, 40]));
}

function drawTridentAt(ctx, x, y, ang, gripX = TRIDENT_GRIP) {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.rotate(ang);
  ctx.drawImage(tridentSprite(), -gripX, -4.5);
  ctx.restore();
}

// Tridente na mão: parado (em pé ao lado do corpo, como um cajado), estocando ou arremessando;
// some quando foi arremessado
function drawTridentHeld(ctx, g) {
  const s = tridentState(g), p = g.player, a = s.anim;
  if (!a) {
    if (s.thrown) return;
    const sx = Math.round(p.x + p.w / 2 - PLAYER_SPR_W / 2), sy = Math.round(p.y + (p.stepOffset || 0) + p.h - PLAYER_SPR_H);
    const pose = PLAYER_POSES[playerFrame(p)], hx = pose.hands[1];
    const handX = p.facing > 0 ? sx + hx : sx + PLAYER_SPR_W - hx, handY = sy + pose.sy + 10 + pose.bob - pose.handLift[1];
    const bob = Math.sin(performance.now() / 400) * 0.05, lean = 1.36;
    // Engatinhando: segura o tridente deitado rente ao chão, apontando para a frente (sem cobrir o
    // rosto nem atravessar o corpo); em pé, fica de pé ao lado do corpo como um cajado
    if (p.crouching) drawTridentAt(ctx, handX, handY - 3, p.facing > 0 ? -0.1 + bob : Math.PI + 0.1 - bob, 8);
    else drawTridentAt(ctx, handX, handY, p.facing > 0 ? -lean + bob : Math.PI + lean - bob, 12);
    return;
  }
  const gp = tridentGrip(g), released = a.kind === 'throw' && a.fired;
  // Braço de trás segurando o cabo mais atrás (na estocada as duas mãos seguram, como uma lança)
  if (!released && a.kind === 'thrust') {
    const bx = gp.hx - Math.cos(gp.ang) * 11, by = gp.hy - Math.sin(gp.ang) * 11;
    drawArm(ctx, gp.sx - a.facing * 3, gp.sy + 1, bx, by, true);
  }
  if (!released) {
    drawTridentAt(ctx, gp.hx, gp.hy, gp.ang);
    // Água se juntando na ponta enquanto carrega: gotas girando e um brilho fraco
    const glow = a.kind === 'thrust' ? clamp(a.t / TRIDENT.recuo, 0, 1) * (1 - clamp((a.t - TRIDENT.recuo - TRIDENT.estocada - TRIDENT.segura) / TRIDENT.volta, 0, 1)) : clamp(a.t / TRIDENT.arremesso.preparo, 0, 1);
    if (glow > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const r = 8 + glow * 6, gr = ctx.createRadialGradient(gp.tipX, gp.tipY, 0, gp.tipX, gp.tipY, r);
      gr.addColorStop(0, `rgba(150,220,255,${0.45 * glow})`); gr.addColorStop(1, 'rgba(60,150,255,0)');
      ctx.fillStyle = gr; ctx.fillRect(gp.tipX - r, gp.tipY - r, r * 2, r * 2);
      ctx.restore();
      const now = performance.now() / 1000;
      for (let k = 0; k < 5; k++) {
        const ph = now * 9 + (k * Math.PI * 2) / 5, rr = (1 - glow * 0.6) * 9;
        waterDot(ctx, gp.tipX + Math.cos(ph) * rr, gp.tipY + Math.sin(ph) * rr * 0.7, 2);
      }
    }
  }
  drawArm(ctx, gp.sx, gp.sy, gp.hx, gp.hy, false);
}

// Gota em pixel: corpo azul, contorno escuro embaixo e um ponto de luz em cima
function waterDot(ctx, x, y, size) {
  x = Math.round(x); y = Math.round(y);
  ctx.fillStyle = '#1f5fae'; ctx.fillRect(x, y + 1, size, size);
  ctx.fillStyle = '#4fa8ee'; ctx.fillRect(x, y, size, size);
  ctx.fillStyle = '#e8f8ff'; ctx.fillRect(x, y, 1, 1);
}

// Massa de água do jato: contorno escuro, corpo, água clara, reflexo, espuma por cima e
// correnteza girando dentro. Camadas opacas (lê como água, não como luz).
function drawWaterBolt(ctx, b) {
  const p = b.power, pts = [b.x, b.y];
  for (let i = 2; i < b.trail.length; i += 2) pts.push(b.trail[i], b.trail[i + 1]);
  const n = pts.length / 2, R = 7.5 * p;
  const radius = (i) => {
    const u = i / Math.max(1, n - 1);
    return Math.max(1.2, R * (i === 0 ? 1.08 : 1) * Math.pow(1 - u, 0.55) * (1 + Math.sin(b.spin * 0.6 + i * 1.7) * 0.12));
  };
  const layer = (k, add, color, dy) => {
    ctx.fillStyle = color;
    for (let i = n - 1; i >= 0; i--) {
      const r = radius(i) * k + add;
      if (r <= 0.3) continue;
      ctx.beginPath(); ctx.arc(pts[i * 2], pts[i * 2 + 1] + dy * radius(i), r, 0, Math.PI * 2); ctx.fill();
    }
  };
  layer(1, 1.2, '#143f7c', 0);      // contorno
  layer(1, 0, '#2b7fd4', 0.08);     // corpo (mais escuro embaixo)
  layer(0.72, 0, '#4ea6ee', -0.1);  // água mais clara
  layer(0.38, 0, '#9ad8ff', -0.28); // reflexo
  // Espuma correndo por cima do corpo
  ctx.fillStyle = '#eefaff';
  for (let i = 0; i < n; i += 2) {
    const r = radius(i);
    if (r < 2) continue;
    const x = pts[i * 2], y = pts[i * 2 + 1] - r * 0.75 + Math.sin(b.spin + i) * 0.8;
    ctx.fillRect(Math.round(x - 1), Math.round(y), 3, 1);
    if ((i + Math.floor(b.spin)) % 3 === 0) ctx.fillRect(Math.round(x), Math.round(y - 1), 1, 1);
  }
  drawWaterRibbon(ctx, b.trail, b.spin, R * 0.55, 0.9, true);
  // Onda de proa espumando na frente da cabeça
  ctx.save();
  ctx.translate(b.x, b.y); ctx.rotate(b.ang);
  ctx.fillStyle = '#f4fcff';
  for (let k = -3; k <= 3; k++) {
    const a = (k / 3) * 1.2, rr = R + 1 + Math.sin(b.spin * 1.3 + k * 2) * 1.2;
    ctx.fillRect(Math.round(Math.cos(a) * rr) - 1, Math.round(Math.sin(a) * rr) - 1, 2 + (k & 1), 2);
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(Math.round(R * 0.2), Math.round(-R * 0.45), 3, 2);
  ctx.restore();
  // Halo bem fraco, só para destacar do fundo
  ctx.globalCompositeOperation = 'lighter';
  const hr = R * 2.6, gr = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, hr);
  gr.addColorStop(0, 'rgba(90,170,255,0.22)'); gr.addColorStop(1, 'rgba(40,120,255,0)');
  ctx.fillStyle = gr; ctx.fillRect(b.x - hr, b.y - hr, hr * 2, hr * 2);
  ctx.globalCompositeOperation = 'source-over';
}

// Fitas em espiral sobre o rastro (trail = x, y, x, y, ... do mais novo para o mais velho).
// strandsOnly = só as fitas claras (o corpo de água já foi desenhado por baixo)
function drawWaterRibbon(ctx, trail, spin, width, alpha, strandsOnly = false) {
  const n = trail.length / 2;
  if (n < 2) return;
  ctx.lineCap = 'round';
  if (!strandsOnly) {
    for (let i = 1; i < n; i++) {
      const u = i / n;
      ctx.globalAlpha = alpha * (1 - u) * 0.6;
      ctx.strokeStyle = '#3f9be8';
      ctx.lineWidth = width * 1.9 * (1 - u * 0.8);
      ctx.beginPath(); ctx.moveTo(trail[i * 2 - 2], trail[i * 2 - 1]); ctx.lineTo(trail[i * 2], trail[i * 2 + 1]); ctx.stroke();
    }
  }
  for (let k = 0; k < 2; k++) {
    let px = 0, py = 0;
    for (let i = 0; i < n; i++) {
      const j = Math.min(i, n - 2), x = trail[i * 2], y = trail[i * 2 + 1];
      const dx = trail[j * 2] - trail[j * 2 + 2], dy = trail[j * 2 + 1] - trail[j * 2 + 3], d = Math.hypot(dx, dy) || 1;
      const u = i / n, ph = spin - i * 0.75 + k * Math.PI, front = Math.cos(ph) > 0;
      const off = Math.sin(ph) * width * (1 - u * 0.5), qx = x - (dy / d) * off, qy = y + (dx / d) * off;
      if (i > 0) {
        ctx.globalAlpha = alpha * (1 - u) * (front ? 0.95 : 0.4);
        ctx.strokeStyle = front ? '#d9f4ff' : '#7cc4f5';
        ctx.lineWidth = Math.max(1, (front ? 1.8 : 1.2) * (1 - u * 0.6));
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(qx, qy); ctx.stroke();
      }
      px = qx; py = qy;
    }
  }
  ctx.globalAlpha = 1;
}

function drawThrownTrident(ctx, tr) {
  drawWaterRibbon(ctx, tr.trail, tr.t * 20, 3.5, 0.8);
  if (tr.state !== 'stuck') {
    ctx.globalCompositeOperation = 'lighter';
    const r = 14, gr = ctx.createRadialGradient(tr.x, tr.y, 0, tr.x, tr.y, r);
    gr.addColorStop(0, 'rgba(120,210,255,0.35)'); gr.addColorStop(1, 'rgba(40,120,255,0)');
    ctx.fillStyle = gr; ctx.fillRect(tr.x - r, tr.y - r, r * 2, r * 2);
    ctx.globalCompositeOperation = 'source-over';
  }
  // Cravado: treme um pouco antes de soltar (a ponta fica dentro do bloco)
  const shake = tr.state === 'stuck' ? Math.sin(tr.t * 60) * (tr.t / TRIDENT.arremesso.cravado) * 0.08 : 0;
  drawTridentAt(ctx, tr.x, tr.y, tr.ang + shake, TRIDENT_SPR_W - 1);
}

// Ondinha achatada espalhando pela superfície atingida
function drawRipple(ctx, e, k) {
  const r = lerp(e.r0, e.r1, easeOutCubic(k));
  ctx.save();
  ctx.translate(e.x, e.y); ctx.rotate(e.ang + Math.PI / 2);
  ctx.globalAlpha = (1 - k) * 0.85;
  ctx.strokeStyle = '#dff5ff'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(0, 0, r, Math.max(1, r * 0.22), 0, Math.PI, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = (1 - k) * 0.4;
  ctx.beginPath(); ctx.ellipse(0, 0, r, Math.max(1, r * 0.22), 0, 0, Math.PI); ctx.stroke();
  ctx.restore();
}

// Poça rasa: faixa azul translúcida com borda clara e brilho, encolhendo quando seca
function drawPuddle(ctx, q) {
  const k = q.t / q.life, grow = Math.min(1, q.t / 0.25), dry = k > 0.55 ? 1 - (k - 0.55) / 0.45 : 1;
  const w = Math.round(q.w * grow * (0.6 + 0.4 * dry)), x = Math.round(q.x - w / 2), y = q.y;
  if (w < 3) return;
  ctx.globalAlpha = 0.7 * dry;
  ctx.fillStyle = '#3d8fd6'; ctx.fillRect(x + 1, y - 1, w - 2, 1);
  ctx.fillStyle = '#7cc3f2'; ctx.fillRect(x, y - 2, w, 1);
  const glint = Math.floor(((performance.now() / 1000) * 10 + q.x) % Math.max(1, w - 3));
  ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 1 + glint, y - 2, 2, 1);
  ctx.globalAlpha = 1;
}

// Gota: rápida vira um risquinho na direção do movimento; devagar, um pontinho com brilho
function drawDrop(ctx, e, k) {
  ctx.globalAlpha = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
  const sp = Math.hypot(e.vx, e.vy);
  if (sp > 140) {
    const len = Math.min(5, sp * 0.012) + e.size;
    ctx.strokeStyle = e.size > 1 ? '#8fd0f7' : '#bfe6fb'; ctx.lineWidth = e.size;
    ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.lineTo(e.x - (e.vx / sp) * len, e.y - (e.vy / sp) * len); ctx.stroke();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(Math.round(e.x), Math.round(e.y), 1, 1);
  } else {
    const x = Math.round(e.x), y = Math.round(e.y);
    ctx.fillStyle = e.size > 1 ? '#6fb9ef' : '#bfe6fb'; ctx.fillRect(x, y, e.size, e.size);
    if (e.size > 1) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, 1, 1); }
  }
}

// Tudo que o tridente solta: por cima da luz
function drawTridentEffects(ctx, g) {
  const s = g.trident;
  if (!s) return;
  ctx.save();
  ctx.lineCap = 'round';
  for (const q of s.puddles) if (q.t >= 0 && q.t < q.life) drawPuddle(ctx, q);
  if (s.thrown) drawThrownTrident(ctx, s.thrown);
  for (const b of s.bolts) drawWaterBolt(ctx, b);
  for (const e of s.fx) {
    // A previsão remota pode ultrapassar a duração entre dois pacotes.
    // Alpha negativo é ignorado pelo canvas e faria a névoa ficar opaca.
    if (!(e.life > 0) || e.t < 0 || e.t >= e.life) continue;
    const k = e.t / e.life;
    if (e.type === 'drop') drawDrop(ctx, e, k);
    else if (e.type === 'ripple') drawRipple(ctx, e, k);
    else if (e.type === 'mist') {
      ctx.globalAlpha = (1 - k) * 0.15;
      ctx.fillStyle = '#d8f0ff';
      ctx.beginPath(); ctx.arc(e.x, e.y, lerp(e.r0, e.r1, easeOutCubic(k)), 0, Math.PI * 2); ctx.fill();
    } else if (e.type === 'ring') {
      const r = lerp(e.r0, e.r1, easeOutCubic(k));
      ctx.globalAlpha = (1 - k) * 0.8;
      ctx.strokeStyle = '#d8f4ff';
      ctx.lineWidth = e.w * (1 - k * 0.6);
      ctx.beginPath(); ctx.ellipse(e.x, e.y, r * 0.35, r, e.ang, 0, Math.PI * 2); ctx.stroke();
    } else if (e.type === 'flash') {
      ctx.globalCompositeOperation = 'lighter';
      const r = lerp(e.r0, e.r1, easeOutCubic(k)), gr = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, r);
      gr.addColorStop(0, `rgba(200,240,255,${0.35 * (1 - k)})`); gr.addColorStop(1, 'rgba(80,170,255,0)');
      ctx.globalAlpha = 1;
      ctx.fillStyle = gr; ctx.fillRect(e.x - r, e.y - r, r * 2, r * 2);
      ctx.globalCompositeOperation = 'source-over';
    }
  }
  ctx.restore();
}
