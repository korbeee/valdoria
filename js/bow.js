'use strict';

// Arco e flecha: segure o botão esquerdo para puxar (a força cresce), solte para atirar em arco.
// A flecha acerta bichos no caminho (inclusive voando) e crava em blocos; cravada, dá para pegar de volta.
const BOW = {
  charge: 0.9,      // segundos para puxar até o máximo
  minSpeed: 260,    // px/s com a corda quase solta
  maxSpeed: 720,    // px/s puxado ao máximo
  gravity: 520,
  minDamage: 3,
  maxDamage: 9,
  cooldown: 0.25,
  stuckTime: 20,    // segundos que a flecha fica cravada
  armLength: 10,    // px do ombro até a mão que segura o arco
};

// Ombro da frente, empunhadura e ângulo de mira (tudo em px do mundo)
function bowAim(p, mouse) {
  const sh = shoulderPos(p, 0), sx = sh.x, sy = sh.y, ang = Math.atan2(mouse.y - sy, mouse.x - sx);
  return { sx, sy, ang, gx: sx + Math.cos(ang) * BOW.armLength, gy: sy + Math.sin(ang) * BOW.armLength };
}

// Chamado pelo handleInteraction quando o item na mão é um arco
function updateBowInput(g, dt, mouse) {
  const b = (g.bow ??= { charging: false, charge: 0, cooldown: 0 }), p = g.player;
  b.cooldown -= dt;
  if (input.mouse.left && b.cooldown <= 0) {
    if (!b.charging) {
      if (!g.inventory.count(ITEM.ARROW)) { if (g.toast.t <= 0) toast('Sem flechas. Faça algumas com graveto e pedra.'); return; }
      b.charging = true; b.charge = 0;
      playSfx('bowDraw', p.cx, p.cy);
    }
    b.charge = Math.min(1, b.charge + dt / BOW.charge);
    p.facing = mouse.x < p.cx ? -1 : 1;
    p.lockFacing = true;
  } else if (b.charging) {
    fireArrow(g, mouse, b.charge);
    b.charging = false; b.cooldown = BOW.cooldown; b.item = g.inventory.slots[g.selected]?.item; p.lockFacing = false;
  }
}

function fireArrow(g, mouse, k) {
  const p = g.player;
  if (!g.inventory.removeItem(ITEM.ARROW, 1)) return;
  const a = bowAim(p, mouse), sp = lerp(BOW.minSpeed, BOW.maxSpeed, k);
  (g.arrows ??= []).push({
    x: a.gx, y: a.gy, vx: Math.cos(a.ang) * sp, vy: Math.sin(a.ang) * sp,
    damage: Math.round(lerp(BOW.minDamage, BOW.maxDamage, k)), life: 6, stuck: false, ang: a.ang,
  });
  playSfx('bowRelease', p.cx, p.cy, { power: 0.4 + k * 0.6 });
}

function updateArrows(g, dt) {
  // Trocou de item no meio da puxada: solta a corda sem atirar
  const b = g.bow;
  if (b?.charging && !ITEM_DEFS[g.inventory.slots[g.selected]?.item]?.arco) { b.charging = false; g.player.lockFacing = false; }
  const list = g.arrows;
  if (!list?.length) return;
  const w = g.world, p = g.player;
  for (let i = list.length - 1; i >= 0; i--) {
    const a = list[i];
    if (a.stuck) {
      a.life -= dt;
      if (Math.hypot(p.cx - a.x, p.y + p.h * 0.6 - a.y) < 18 && g.inventory.add(ITEM.ARROW, 1) === 0) { playSfx('pickup'); list.splice(i, 1); continue; }
      if (a.life <= 0) list.splice(i, 1);
      continue;
    }
    a.vy += BOW.gravity * dt; a.life -= dt;
    a.ang = Math.atan2(a.vy, a.vx);
    const steps = Math.max(1, Math.ceil((Math.hypot(a.vx, a.vy) * dt) / 4));
    let done = false;
    for (let k = 0; k < steps && !done; k++) {
      a.x += (a.vx * dt) / steps; a.y += (a.vy * dt) / steps;
      const mob = g.mobs.find((m) => !m.dead && m !== g.mount && m.containsPoint(a.x, a.y, 1));
      if (mob) {
        mob.hit(a.damage, a.x - Math.sign(a.vx) * 10);
        mobParticles(g, mob, 6, 'rgb(230,70,80)');
        playSfx('arrowHit', a.x, a.y);
        list.splice(i, 1); done = true; break;
      }
      const tx = Math.floor(a.x / T), ty = Math.floor(a.y / T);
      if (!w.inBounds(tx, ty)) { list.splice(i, 1); done = true; break; }
      if (w.isSolid(tx, ty)) {
        a.stuck = true; a.life = BOW.stuckTime;
        playSfx('arrowHit', a.x, a.y, { tile: w.getTile(tx, ty) });
        done = true;
      }
    }
    if (!done && a.life <= 0) list.splice(i, 1);
  }
}

// ---------- Desenho ----------
// Flecha apontando para +x com a ponta em (tipX, y)
function drawArrowShape(ctx, tipX, y) {
  ctx.fillStyle = '#8a5a32'; ctx.fillRect(tipX - 11, y, 10, 1);
  ctx.fillStyle = '#c3c7cc'; ctx.fillRect(tipX - 2, y - 1, 2, 3); ctx.fillRect(tipX, y, 1, 1);
  ctx.fillStyle = '#eeeae0'; ctx.fillRect(tipX - 12, y - 1, 3, 1); ctx.fillRect(tipX - 12, y + 1, 3, 1);
}

function drawArrows(ctx, g) {
  const list = g.arrows;
  if (!list?.length) return;
  for (const a of list) {
    ctx.save();
    ctx.globalAlpha = a.stuck && a.life < 2 ? a.life / 2 : 1;
    ctx.translate(Math.round(a.x), Math.round(a.y)); ctx.rotate(a.ang);
    drawArrowShape(ctx, a.stuck ? 3 : 0, 0); // cravada: a ponta some dentro do bloco
    ctx.restore();
  }
}

// Arco de lado em pixel art (7x21): barriga para +x, empunhadura de couro no meio, pontas escuras
const bowSpriteCache = new Map();
function bowSprite(item=ITEM.BOW) {
  if (bowSpriteCache.has(item)) return bowSpriteCache.get(item);
  const s = new Sprite(7, 21), wood = ITEM_DEFS[item]?.bowPalette || [[74, 44, 24], [128, 84, 46], [176, 124, 72], [218, 172, 112]], wrap = [[70, 42, 28], [156, 104, 62]];
  for (let k = -10; k <= 10; k++) {
    const x = Math.round(3.2 - (2.6 * k * k) / 100), y = k + 10, grip = Math.abs(k) <= 2;
    s.set(x, y, grip ? wrap[1] : wood[2]);
    s.set(x + 1, y, grip ? wrap[0] : wood[1]);
    if (!grip && Math.abs(k) < 8 && x > 0) s.set(x - 1, y, wood[3]); // brilho na madeira
  }
  s.set(0, 0, wood[0]); s.set(0, 20, wood[0]);
  const img=s.finish([30, 20, 16]);bowSpriteCache.set(item,img);return img;
}

// Corda (em coordenadas do arco): das pontas até o ponto puxado
function drawBowString(ctx, pullX) {
  ctx.fillStyle = '#ece8da';
  for (let k = -9; k <= 9; k++) ctx.fillRect(Math.round(lerp(-2.4, pullX, 1 - Math.abs(k) / 9.5)), k, 1, 1);
}

// Braço no mesmo estilo do golpe de espada: contorno, manga e mão
function drawArm(ctx, x0, y0, x1, y1, back) {
  const len = Math.hypot(x1 - x0, y1 - y0), a = Math.atan2(y1 - y0, x1 - x0);
  ctx.save(); ctx.translate(Math.round(x0), Math.round(y0)); ctx.rotate(a);
  ctx.fillStyle = rgb(PLAYER_OUTLINE); ctx.fillRect(-1.5, -2.5, len + 3, 5);
  ctx.fillStyle = rgb(back ? PLAYER_PALETTE.j : PLAYER_PALETTE.J); ctx.fillRect(-0.5, -1.5, Math.max(1, len - 2.5), 3);
  ctx.fillStyle = rgb(PLAYER_PALETTE.j); ctx.fillRect(-0.5, 0.5, Math.max(1, len - 2.5), 1);
  ctx.fillStyle = playerHandRgb(); ctx.fillRect(len - 2.5, -1.5, 3, 3);
  ctx.restore();
}

// Pontinhos da trajetória: visíveis, com sombrinha, sumindo aos poucos e parando no primeiro bloco
function drawAimDots(ctx, g, x0, y0, ang, k) {
  const sp = lerp(BOW.minSpeed, BOW.maxSpeed, k);
  let x = x0, y = y0, vx = Math.cos(ang) * sp, vy = Math.sin(ang) * sp;
  const dt = 22 / sp; // um ponto a cada ~22 px de voo, com qualquer força
  for (let i = 0; i < 16; i++) {
    for (let s = 0; s < 2; s++) { vy += BOW.gravity * dt / 2; x += (vx * dt) / 2; y += (vy * dt) / 2; }
    if (g.world.isSolid(Math.floor(x / T), Math.floor(y / T))) break;
    const a = 0.9 - i * 0.045, px = Math.round(x), py = Math.round(y);
    // Contorno escuro fino em volta: o ponto aparece em grama, céu ou pedra sem ficar grande
    ctx.fillStyle = `rgba(20,16,12,${(a * 0.55).toFixed(2)})`; ctx.fillRect(px - 1, py - 1, 4, 4);
    ctx.fillStyle = `rgba(255,246,214,${a.toFixed(2)})`; ctx.fillRect(px, py, 2, 2);
  }
}

// Arco na mão. Parado: abaixado na mão. Puxando: braço da frente esticado segurando o arco,
// braço de trás puxando a corda com a flecha encaixada (o corpo usa o quadro sem o braço da frente).
function drawBowHeld(ctx, g) {
  const p = g.player, b = g.bow || {}, img = bowSprite(g.inventory.slots[g.selected]?.item);
  if (!b.charging) {
    const sx = Math.round(p.x + p.w / 2 - PLAYER_SPR_W / 2), sy = Math.round(p.y + (p.stepOffset || 0) + p.h - PLAYER_SPR_H);
    const pose = PLAYER_POSES[playerFrame(p)], hx = pose.hands[1];
    const handX = p.facing > 0 ? sx + hx : sx + PLAYER_SPR_W - hx, handY = sy + pose.sy + 10 + pose.bob - pose.handLift[1];
    // Engatinhando: o arco deita para a frente, rente ao chão, longe do rosto
    ctx.save(); ctx.translate(handX, handY - (p.crouching ? 3 : 0)); ctx.scale(p.facing, 1); ctx.rotate(p.crouching ? 1.3 : -0.2);
    if (p.crouching) ctx.translate(0, -7); // agachado: o arco sai para a frente da mão, sem cruzar as pernas
    ctx.drawImage(img, -3, -10); drawBowString(ctx, 0);
    ctx.restore();
    return;
  }
  const a = bowAim(p, g.netAim || screenToWorld(input.mouse.x, input.mouse.y)), pull = -(3 + b.charge * 7);
  const nockX = a.gx + Math.cos(a.ang) * pull, nockY = a.gy + Math.sin(a.ang) * pull;
  drawAimDots(ctx, g, a.gx, a.gy, a.ang, b.charge);
  drawArm(ctx, a.sx - p.facing * 3, a.sy + 1, nockX, nockY, true); // braço que puxa
  ctx.save(); ctx.translate(Math.round(a.gx), Math.round(a.gy)); ctx.rotate(a.ang);
  if (g.inventory.count(ITEM.ARROW)) drawArrowShape(ctx, pull + 12, 0);
  ctx.drawImage(img, -3, -10);
  drawBowString(ctx, pull);
  ctx.restore();
  drawArm(ctx, a.sx, a.sy, a.gx, a.gy, false); // braço da frente segurando o arco
}
