'use strict';

// =====================================================================================
//  MOVIMENTOS DE EQUIPAMENTO  —  chamados de Player.update (js/player.js)
// =====================================================================================
//   Passo do Predador (js/tiger-loot.js)  Shift no chão: esquiva curta com proteção
//   Luvas de Seda (js/spider-loot.js)     no ar, empurrando a parede: agarra e salta dela
//   Carretel da Matriarca (idem)          o gancho puxa o jogador até onde prendeu
//   Teia (js/spider-boss.js)              pisar na teia ou levar uma bola de seda deixa lento

// Gancho puxando ou pendurado: toma conta do movimento inteiro. true = já moveu o jogador.
function gearOverride(p, dt, input, world) {
  // Laço da Fiandeira puxando o jogador (js/spider-boss.js): o controle não vale
  if (p.pullT > 0) {
    p.pullT -= dt;
    p.vx = p.pullVx || 0; p.applyGravity(dt);
    p.moveX(p.vx * dt, world); p.moveY(p.vy * dt, world);
    p.visualTime += dt;
    return true;
  }
  const gr = game.grapple;
  if (!gr || (gr.phase !== 'pull' && gr.phase !== 'hang')) return false;
  const jump = input.down('Space') || input.down('KeyW') || input.down('ArrowUp');
  const jumpEdge = jump && !p._jumpHeld;
  p._jumpHeld = jump;
  const down = input.down('KeyS') || input.down('ArrowDown');
  if (jumpEdge || down) { // solta: pula um pouco para cima, ou só cai com S
    releaseGrapple(game);
    p.vy = down ? 60 : -380; p.jumpAge = 0;
    return false;
  }
  if (p.crouching) p.setCrouch(false, world);
  const ax = gr.x, ay = gr.y + 4; // a mão fica logo abaixo do gancho
  const dx = ax - p.cx, dy = ay - p.y, dist = Math.hypot(dx, dy);
  if (gr.phase === 'pull') {
    const speed = ITEM_DEFS[ITEM.MATRIARCH_SPOOL].carretel.puxada;
    p.vx = (dx / (dist || 1)) * speed; p.vy = (dy / (dist || 1)) * speed;
    const ox = p.x, oy = p.y;
    p.moveX(p.vx * dt, world); p.moveY(p.vy * dt, world);
    const moved = Math.hypot(p.x - ox, p.y - oy);
    gr.stuck = moved < speed * dt * 0.25 ? (gr.stuck || 0) + dt : 0;
    if (dist < 14 || gr.stuck > 0.2) { gr.phase = 'hang'; p.vx = p.vy = 0; }
    if (dx) p.facing = Math.sign(dx);
  } else {
    // Pendurado: balança de leve com A/D, sem cair
    const dir = (input.down('KeyD') || input.down('ArrowRight') ? 1 : 0) - (input.down('KeyA') || input.down('ArrowLeft') ? 1 : 0);
    gr.swing = (gr.swing || 0) + dir * dt * 3;
    gr.swing *= Math.exp(-2 * dt);
    const tx = ax + Math.sin(gr.swing) * 12 - p.w / 2, ty = ay + Math.cos(gr.swing) * 2;
    p.vx = (tx - p.x) * 10; p.vy = (ty - p.y) * 10;
    p.moveX(p.vx * dt, world); p.moveY(p.vy * dt, world);
    if (dir) p.facing = dir;
  }
  p.onGround = false; p.climbing = false;
  p.visualTime += dt; p.jumpAge = 1;
  return true;
}

// Mexe na velocidade horizontal depois do controle normal: esquiva, chute da parede e teia
function gearVelocity(p, dt, input, world, dir, jump) {
  const g = game;
  p.jumpEdge = jump && !p._jumpHeld;
  p._jumpHeld = jump;
  if (p.onGround) g.gloveReady = true; // as luvas recarregam ao tocar o chão

  // --- Passo do Predador ---
  const shift = input.down('ShiftLeft') || input.down('ShiftRight');
  const shiftEdge = shift && !p._shiftHeld;
  p._shiftHeld = shift;
  const rule = ITEM_DEFS[ITEM.PREDATOR_STEP].esquiva;
  if (shiftEdge && !g.mount && hasAccessory(g, ITEM.PREDATOR_STEP) && p.onGround && !p.crouching && !p.swimming &&
      !(p.webbed > 0.3) && (g.clock || 0) >= (g.dashReady || 0)) {
    p.dash = { t: rule.tempo, dir: dir || p.facing };
    p.invulnerable = Math.max(p.invulnerable || 0, rule.protecao);
    g.dashReady = (g.clock || 0) + rule.espera;
    p.facing = p.dash.dir;
    playSfx('swing', p.cx, p.cy);
    for (let i = 0; i < 5; i++) bfx(g, 'dust', p.cx - p.dash.dir * 4, p.y + p.h - 2, { vx: -p.dash.dir * (40 + Math.random() * 60), vy: -8 - Math.random() * 16, drag: 3, r0: 2, r1: 7, life: .5, color: [190, 160, 120] });
    bfx(g, 'ring', p.cx, p.y + p.h - 1, { r0: 3, r1: 18, flat: .3, life: .3, color: [255, 190, 110] });
  }
  if (p.dash) {
    p.dash.t -= dt;
    p.vx = p.dash.dir * rule.velocidade;
    // rastro de listras de tigre e brasas (js/boss-fx.js)
    for (let i = 0; i < 2; i++) bfx(g, 'streak', p.cx - p.dash.dir * 5, p.y + 6 + Math.random() * (p.h - 10), { vx: p.dash.dir, len: 14 + Math.random() * 12, h: 1 + (Math.random() < .3 ? 1 : 0), life: .2, cols: [[236, 150, 60], [236, 150, 60], [40, 24, 20]] });
    if (Math.random() < .5) bfx(g, 'ember', p.cx - p.dash.dir * 6, p.y + 8 + Math.random() * (p.h - 12), { vx: -p.dash.dir * 30, vy: -20, life: .4, size: 1, color: [255, 170, 60] });
    if (p.dash.t <= 0) { p.dash = null; p.vx *= 0.35; }
  }

  // --- Luvas de Seda: logo depois do salto da parede o controle não puxa de volta ---
  if (p.wallKick > 0) { p.wallKick -= dt; p.vx = p.kickVx; }

  // --- Areia fofa, vento de tempestade e escudo erguido (js/beetle-loot.js) ---
  sandMovement(g, p, dt);
  if (g.block) p.vx = clamp(p.vx, -WALK_SPEED * 0.5, WALK_SPEED * 0.5);

  // --- Teia: lenta enquanto estiver grudada ---
  if (typeof spiderWebTouch === 'function') spiderWebTouch(g, p);
  if (p.webbed > 0) {
    p.webbed -= dt;
    p.webRootT = Math.max(0, (p.webRootT || 0) - dt); // bola de seda: preso de vez no começo
    const cap = WALK_SPEED * (p.webRootT > 0 ? 0.05 : 0.32);
    p.vx = clamp(p.vx, -cap, cap);
    if (p.dash) p.dash = null;
  }
}

// Luvas de Seda: agarra a parede no ar e salta dela. true = a gravidade já foi tratada.
function gearWallGrab(p, dt, input, world, dir) {
  const g = game, rule = ITEM_DEFS[ITEM.SILK_GLOVES]?.escalar;
  if (!rule || !hasAccessory(g, ITEM.SILK_GLOVES) || p.climbing || p.swimming) { p.wallGrab = null; return false; }
  const touching = (side) => p.collides(world, p.x + side * 1.5, p.y + 2) && p.collides(world, p.x + side * 1.5, p.y + p.h - 6);
  if (p.wallGrab) {
    const wg = p.wallGrab;
    wg.t -= dt;
    if (p.jumpEdge) { // salta para longe da parede
      p.wallGrab = null;
      p.vy = -JUMP_SPEED * 0.92; p.jumpAge = 0;
      p.kickVx = -wg.side * 250; p.vx = p.kickVx; p.wallKick = 0.16;
      p.facing = -wg.side;
      silkPuff(g, p.cx + wg.side * 7, p.cy, 5);
      playSfx('swing', p.cx, p.cy, { vol: 0.6 });
      return false;
    }
    if (p.onGround || wg.t <= 0 || dir === -wg.side || !touching(wg.side)) { p.wallGrab = null; return false; }
    // Nos últimos instantes a mão escorrega devagar
    p.vy = wg.t < 0.4 ? 40 : 0; p.vx = 0; p.facing = wg.side;
    return true;
  }
  if (!p.onGround && g.gloveReady && dir && p.vy > -140 && touching(dir)) {
    g.gloveReady = false;
    p.wallGrab = { t: rule.tempo, side: dir };
    p.vy = 0; p.vx = 0;
    silkPuff(g, p.cx + dir * 7, p.cy, 4);
    return true;
  }
  return false;
}

function silkPuff(g, x, y, n) {
  // fiapos de seda soprados e um brilho (js/boss-fx.js)
  for (let i = 0; i < n; i++) bfx(g, 'wisp', x + (Math.random() - 0.5) * 6, y + (Math.random() - 0.5) * 8, { vx: (Math.random() - 0.5) * 60, vy: -10 - Math.random() * 30, drag: 3, r0: 1.5, r1: 4 + Math.random() * 3, life: 0.6, a: 0.7, color: [236, 232, 248] });
  bfx(g, 'glint', x, y, { size: 4, life: 0.3 });
}

// Pulo mais curto preso na teia
const gearJumpScale = (p) => (p.webbed > 0 ? 0.55 : 1)*(referenceState(game).springUntil>(game.clock||0)?1.25:1);
