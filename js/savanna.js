'use strict';

// Savana: elefante que dá para selar e montar, o Tigre da Savana (chefe que dorme no covil de pedra)
// e a pelagem de tigre que o jogador pode vestir.

// ---------- Elefante ----------
const ELEPHANT_RIDE_SPEED = 150;
const ELEPHANT_BAGS = 8; // espaços de carga nos alforjes

// Cada elefante carrega o próprio par (sela + alforjes), guardado no bicho
function elephantGear(e) {
  e.saddleSlot ??= [null];
  e.bags ??= Array(ELEPHANT_BAGS).fill(null);
  e.saddled = !!e.saddleSlot[0];
  return e;
}

// A sela pode entrar e sair a qualquer momento: sem ela o elefante não anda
function syncElephantSaddle(g, e) {
  const on = !!e.saddleSlot[0];
  if (on === !!e.saddled) return;
  e.saddled = on;
  e.fleeTimer = 0;
  if (on) { toast('Sela colocada! O elefante já pode andar.'); playSfx('elephantIdle', e.cx, e.cy); }
  else { toast('Sela retirada: sem ela o elefante não sai do lugar.'); playSfx('invClose'); }
}

// Botão direito num elefante: selar (com a sela na mão), montar ou descer
function tryElephantClick(g, wx, wy) {
  const e = g.mobs.find((m) => m.kind === 'elephant' && !m.dead && m.containsPoint(wx, wy, 4));
  if (!e) return false;
  const p = g.player, held = g.inventory.slots[g.selected];
  if (g.mount === e) { dismountElephant(g); return true; }
  if (Math.hypot(e.cx - p.cx, e.cy - p.cy) > 6 * T) { toast('Chegue mais perto do elefante.'); return true; }
  elephantGear(e);
  // Sela na mão e lombo vazio: sela na hora, sem precisar abrir a bolsa
  if (!e.saddled && held?.item === ITEM.SADDLE) {
    g.inventory.takeFromSlot(g.selected);
    e.saddleSlot[0] = { item: ITEM.SADDLE, count: 1 };
    e.keep = true;
    syncElephantSaddle(g, e);
    return true;
  }
  mountElephant(g, e);
  return true;
}

function mountElephant(g, e) {
  elephantGear(e);
  g.mount = e; e.rider = g.player; e.vx = 0; e.keep = true; e.fleeTimer = 0;
  g.sword.active = false; g.player.lockFacing = false;
  toast(e.saddled ? 'Montado! A/D anda, Espaço pula, Shift desce, E abre a bolsa.'
                  : 'Montado sem sela: ele não anda assim. Aperte E e ponha uma sela.');
  playSfx('elephantIdle', e.cx, e.cy);
}

// ---------- Bolsa do elefante (E enquanto está montado) ----------
let elephantIcon = null;
function openElephantBags(g) {
  const e = g.mount;
  if (!e || e.dead) return false;
  elephantGear(e);
  e.keep = true;
  if (!elephantIcon) {
    elephantIcon = makeCanvas(T, T);
    elephantIcon.getContext('2d').drawImage(renderer.tex.itemAtlas, ITEM.SADDLE * T, 0, T, T, 0, 0, T, T);
  }
  g.inventoryUI.openContainer({
    title: 'Elefante',
    subtitle: `${ELEPHANT_BAGS} espaços`,
    slots: e.bags,
    source: { mount: e },
    icon: elephantIcon,
    // Espaço só para a sela: tirar a sela daqui deixa o elefante parado
    equip: {
      slots: e.saddleSlot,
      label: 'Sela',
      accept: (item) => !!ITEM_DEFS[item]?.sela,
      onChange: () => syncElephantSaddle(g, e),
    },
  });
  playSfx('invOpen');
  return true;
}

// Elefante morto: sela e carga caem no chão, em vez de sumir com tudo
function spillElephantGear(g, e) {
  for (const list of [e.saddleSlot, e.bags]) {
    if (!list) continue;
    for (let i = 0; i < list.length; i++) {
      if (list[i]) dropItem(g, list[i].item, list[i].count, e.cx, e.cy, (Math.random() - 0.5) * 2);
      list[i] = null;
    }
  }
}

function dismountElephant(g) {
  const e = g.mount, p = g.player;
  if (!e) return;
  g.mount = null; e.rider = null; e.vx = 0;
  for (const side of [-e.facing, e.facing]) {
    const x = e.cx + side * (e.w / 2 + p.w / 2 + 2) - p.w / 2, y = e.y + e.h - p.h - 0.01;
    if (!p.collides(g.world, x, y)) { p.x = x; p.y = y; break; }
  }
  p.vx = 0; p.vy = -120; p.stepOffset = 0;
}

function elephantPhysics(m, dt, w, pushing) {
  const oldX = m.x, wanted = m.vx;
  m.applyGravity(dt); m.moveX(m.vx * dt, w);
  if (pushing && wanted && m.vx === 0 && m.onGround) m.vy = -380;
  m.moveY(m.vy * dt, w);
  m.gait += Math.abs(m.x - oldX) / 3.5; m.anim = m.gait; m.settleStep(dt);
}

// Chamado pela IA do bicho: true quando o elefante já foi atualizado aqui
function updateElephant(m, dt, w, p) {
  if (m.rider) return true; // quem move é updateRiding
  if (!m.saddled) return false; // sem sela: passeia como um bicho selvagem qualquer
  // Domado: fica perto e segue o jogador devagar quando ele se afasta
  m.clock += dt; m.hurtTimer = Math.max(0, m.hurtTimer - dt);
  const dx = p.cx - m.cx, dir = Math.abs(dx) > 6 * T && Math.abs(dx) < 40 * T ? Math.sign(dx) : 0;
  if (m.hurtTimer <= 0) m.vx += (dir * 60 - m.vx) * (1 - Math.exp(-5 * dt));
  if (dir) m.facing = dir;
  elephantPhysics(m, dt, w, dir !== 0);
  return true;
}

// Montado: o teclado controla o elefante e o jogador fica sentado na sela.
// Sem sela dá para subir nele, mas ele não anda nem pula.
function updateRiding(g, dt, input) {
  const e = g.mount, p = g.player, w = g.world;
  if (!e) return false;
  if (e.dead || !g.mobs.includes(e)) { g.mount = null; e.rider = null; return false; }
  if (p.crouching) { p.crouching = false; p.h = PLAYER_H; } // em cima do elefante ninguém fica agachado
  const wants = (input.down('KeyD') || input.down('ArrowRight') ? 1 : 0) - (input.down('KeyA') || input.down('ArrowLeft') ? 1 : 0);
  const dir = e.saddled ? wants : 0;
  if (wants && !e.saddled && (e.nagT = (e.nagT ?? 0) - dt) <= 0) {
    e.nagT = 6;
    toast('Ele nem se mexe sem sela. Aperte E e coloque uma no lombo.');
    playSfx('elephantIdle', e.cx, e.cy, { vol: 0.5 });
  }
  e.vx += (dir * ELEPHANT_RIDE_SPEED - e.vx) * (1 - Math.exp(-(dir ? 5 : 7) * dt));
  if (dir) e.facing = dir;
  if (e.saddled && (input.down('Space') || input.down('KeyW') || input.down('ArrowUp')) && e.onGround) { e.vy = -430; e.onGround = false; }
  e.clock += dt; e.hurtTimer = Math.max(0, e.hurtTimer - dt);
  elephantPhysics(e, dt, w, false);
  if (!p.lockFacing) p.facing = e.facing;
  // Sentado na sela: o assento fica no topo do lombo do sprite (js/savanna-art.js)
  p.x = e.cx - 6 * e.facing - p.w / 2;
  p.y = e.y + e.h - (ELE_GROUND - ELE_BACK) - p.h + 2; // sentado na almofada da manta
  p.vx = 0; p.vy = 0; p.onGround = true; p.stepOffset = e.stepOffset; p.visualTime += dt;
  return true;
}

// Berrante de marfim: chama o elefante selado mais próximo para o lado do jogador
function blowIvoryHorn(g) {
  const p = g.player;
  g.placeCooldown = 1.2;
  playSfx('elephantIdle', p.cx, p.cy);
  const tame = g.mobs.filter((m) => m.kind === 'elephant' && !m.dead && (m.saddled || m.keep));
  if (!tame.length) { toast('O berrante ecoa pela savana... nenhum elefante seu respondeu.'); return; }
  const e = tame.reduce((a, b) => (Math.hypot(a.cx - p.cx, a.cy - p.cy) < Math.hypot(b.cx - p.cx, b.cy - p.cy) ? a : b));
  if (Math.hypot(e.cx - p.cx, e.cy - p.cy) < 8 * T) { toast('Ele já está aqui do lado.'); return; }
  // Aparece num chão livre ao lado do jogador
  for (const side of [p.facing, -p.facing]) {
    const tx = clamp(Math.floor(p.cx / T) + side * 4, 2, g.world.w - 3);
    const ty = surfaceY(g.world, tx);
    if (ty < 3) continue;
    const x = tx * T - e.w / 2, y = ty * T - e.h - 0.01;
    if (e.collides(g.world, x, y)) continue;
    e.x = x; e.y = y; e.vx = e.vy = 0; e.fleeTimer = 0;
    mobParticles(g, e, 12, 'rgb(212,196,150)');
    toast('O elefante atendeu ao berrante!');
    return;
  }
  toast('Sem espaço aqui para ele chegar.');
}

// ---------- Tigre da Savana (chefe) ----------
// A luta tem duas fases. Enquanto tem vida, ele alterna perseguir, rugir, dar botes
// (o agachar é a deixa para desviar) e uma patada rápida de perto. Errar o bote numa
// parede o deixa zonzo: é a janela para bater à vontade. Abaixo de 40% ele fica
// FURIOSO: mais rápido, com onda de choque ao cair e chamando hienas no rugido.
const TIGER = {
  leash: 45, contact: 12, pounce: 24, swipe: 20, crouch: 0.5, recover: 0.7,
  pounceRange: [3, 10], swipeRange: 3.2, stun: 1.9, stunTaken: 1.7, shock: 40,
};

function setupTiger(m, den) {
  Object.assign(m, {
    boss: true, keep: true, sleeping: true, aware: false, state: 'sleep', stateT: 0,
    pounceCd: 2, swipeCd: 3, roarT: 9, damage: 0, hintT: 0, snoreT: 1 + Math.random(), phase: 1,
  });
  m.den = den ? { x: den.x, y: den.y } : { x: m.cx, y: m.y + m.h };
}

function tigerState(m, state) { m.state = state; m.stateT = 0; }
const tigerEnraged = (m) => m.hp < m.def.hp * 0.4;

// Volta para o covil, cura tudo e dorme de novo (jogador fugiu ou morreu longe)
function tigerGoHome(g, m) {
  if (m.baitSpent) {
    m.baitSpent = false;
    const left = g.inventory.add(ITEM.SUCCULENT_MEAT, 1);
    if (left) {
      dropItem(g, ITEM.SUCCULENT_MEAT, left, g.player.cx, g.player.y);
    }
  }
  m.x = m.den.x - m.w / 2; m.y = m.den.y - m.h - 0.01; m.vx = m.vy = 0;
  m.hp = m.def.hp; m.sleeping = true; m.aware = false; m.damage = 0; m.roared = false;
  m.phase = 1; m.pounceCd = 2; m.swipeCd = 3; m.roarT = 9;
  m.bleed=null;m.hurtTimer=0;m.stepOffset=0;m.swiped=false;m.pounceSpeed=0;m.onGround=false;
  tigerState(m, 'sleep');
  // As hienas chamadas por ele vão embora junto
  for(const o of g.mobs)if(o.tigerPack)o.despawn=true;
  if (g.boss === m) g.boss = null;
}

// Poeira sob as patas (bote, queda e patada)
function tigerDust(g, m, n, up = 80) {
  for (let i = 0; i < n && g.particles.length < 400; i++) {
    const life = 0.3 + Math.random() * 0.4;
    g.particles.push({
      x: m.cx + (Math.random() - 0.5) * m.w, y: m.y + m.h - 2,
      vx: (Math.random() - 0.5) * 180, vy: -Math.random() * up,
      life, maxLife: life, color: i % 3 ? 'rgb(206,186,142)' : 'rgb(172,150,108)', w: 2, h: 2, gravity: 320,
    });
  }
}

// Rugido furioso: chama hienas das beiradas do covil para atrapalhar
function tigerCallPack(g, m) {
  const pack = g.mobs.filter((o) => o.tigerPack && !o.dead).length;
  if (pack >= 3) return;
  for (const side of [-1, 1]) {
    if (g.mobs.filter((o) => o.tigerPack && !o.dead).length >= 3) break;
    // Dentro da arena as hienas entram pelos portões, no chão da arena (e não em cima do morro)
    const A = g.world.tigerArena, inArena = A && m.cx / T > A.x0 && m.cx / T < A.x1 + 1;
    const tx = inArena ? (side < 0 ? A.x0 + 1 : A.x1 - 2)
      : clamp(Math.floor(m.cx / T) + side * (9 + Math.floor(Math.random() * 4)), 2, g.world.w - 3);
    const ty = inArena ? A.floor : surfaceY(g.world, tx);
    if (ty < 3) continue;
    const h = new Wildlife('hyena', tx * T, ty * T - 20);
    h.y = ty * T - h.h - 0.01;
    if (h.collides(g.world, h.x, h.y)) continue;
    h.tigerPack = true;
    g.mobs.push(h);
    mobParticles(g, h, 8, 'rgb(206,186,142)');
  }
  toast('O rugido chamou as hienas!');
}

// A Carne Suculenta de Bramido é a única isca aceita pelo tigre.
function checkTigerBait(g, m) {
  const near = (g.drops || []).filter((d) => d.age > 0.4 && Math.abs(d.x - m.cx) < 6 * T && Math.abs(d.y - (m.y + m.h)) < 3 * T);
  const meat = near.find((d) => d.item === ITEM.SUCCULENT_MEAT && d.count > 0);
  if (!meat) return false;
  if (--meat.count <= 0) g.drops.splice(g.drops.indexOf(meat), 1);
  m.baitSpent = true;
  mobParticles(g, m, 10, 'rgb(236,220,190)');
  playSfx('eat', m.cx, m.cy);
  return true;
}

function updateTiger(m, dt, w, p) {
  const g = game;
  m.clock += dt; m.stateT += dt; m.hurtTimer = Math.max(0, m.hurtTimer - dt);
  const dx = p.cx - m.cx, dist = Math.hypot(dx, p.cy - m.cy), enraged = tigerEnraged(m);
  let target = 0, speed = m.def.speed * (enraged ? 1.35 : 1);

  // Entrada na segunda fase: ruge, sacode a tela e chama o bando
  if (enraged && m.phase === 1 && m.state !== 'sleep') {
    m.phase = 2;
    tigerState(m, 'roar'); m.roarT = 7;
    playSfx('tigerRoar', m.cx, m.cy); g.shake = 6;
    tigerDust(g, m, 20, 140);
    tigerCallPack(g, m);
    toast('O TIGRE FICOU FURIOSO!');
  }
  // Ferido de morte: vai pingando sangue enquanto luta
  if (enraged && Math.random() < dt * 8) mobParticles(g, m, 1, 'rgb(170,40,44)');

  switch (m.state) {
    case 'sleep':
      m.damage = 0; m.aware = false; m.sleeping = true;
      if ((m.snoreT -= dt) <= 0) { m.snoreT = 2.8; playSfx('tigerSnore', m.cx, m.cy, { vol: 0.8 }); }
      if (dist < 10 * T && (m.hintT -= dt) <= 0) { m.hintT = 10; toast('Zzz... Solte Carne Suculenta (Q) perto do tigre. Bramido deixa essa isca.'); }
      if (checkTigerBait(g, m)) { m.sleeping = false; tigerState(m, 'wake'); g.boss = m; playSfx('tigerGrowl', m.cx, m.cy); }
      break;
    case 'wake':
      m.facing = Math.sign(dx) || m.facing;
      if (m.stateT > 0.9 && !m.roared) { m.roared = true; playSfx('tigerRoar', m.cx, m.cy); g.shake = 5; tigerDust(g, m, 14); toast('O TIGRE DA SAVANA ACORDOU!'); }
      if (m.stateT > 2.2) { m.roared = false; m.aware = true; tigerState(m, 'hunt'); }
      break;
    case 'hunt':
      m.aware = true; m.damage = TIGER.contact;
      if (dist > TIGER.leash * T) { m.aware = false; tigerState(m, 'return'); break; }
      m.facing = Math.sign(dx) || m.facing;
      m.pounceCd -= dt; m.swipeCd -= dt; m.roarT -= dt;
      if (m.roarT <= 0 && m.onGround) {
        m.roarT = (enraged ? 7 : 11) + Math.random() * 5;
        tigerState(m, 'roar'); playSfx('tigerRoar', m.cx, m.cy); g.shake = 3;
        break;
      }
      // Perto demais para o bote: patada rápida, que dói mais que o encontrão
      if (m.onGround && m.swipeCd <= 0 && Math.abs(dx) < TIGER.swipeRange * T && Math.abs(p.cy - m.cy) < 2.5 * T) {
        tigerState(m, 'swipe'); playSfx('tigerGrowl', m.cx, m.cy, { vol: 0.7 });
        break;
      }
      if (m.onGround && m.pounceCd <= 0 && Math.abs(dx) > TIGER.pounceRange[0] * T && Math.abs(dx) < TIGER.pounceRange[1] * T && Math.abs(p.cy - m.cy) < 4 * T) {
        tigerState(m, 'crouch'); playSfx('tigerGrowl', m.cx, m.cy); break;
      }
      target = Math.abs(dx) < 6 ? 0 : Math.sign(dx);
      break;
    case 'crouch': // abaixa antes do bote: é a deixa para desviar
      m.damage = TIGER.contact;
      if (m.stateT >= TIGER.crouch * (enraged ? 0.7 : 1)) {
        tigerState(m, 'pounce');
        m.vx = m.facing * Math.min(480, 160 + Math.abs(dx) * 2.2); m.vy = -330; m.onGround = false;
        m.pounceSpeed = Math.abs(m.vx);
        tigerDust(g, m, 10);
        playSfx('tigerPounce', m.cx, m.cy);
      }
      break;
    case 'pounce':
      m.damage = TIGER.pounce;
      // Bateu com tudo numa parede: fica zonzo e leva mais dano por um tempo
      if (!m.onGround && m.vx === 0 && m.pounceSpeed > 200 && m.stateT > 0.06) {
        tigerState(m, 'stun'); m.damage = 0; m.vy = Math.max(m.vy, 0);
        playSfx('tigerHurt', m.cx, m.cy); g.shake = 4;
        tigerDust(g, m, 16, 140);
        break;
      }
      if (m.onGround && m.stateT > 0.12) {
        tigerState(m, 'recover');
        m.pounceCd = (enraged ? 1.4 : 2.2) + Math.random() * 1.3;
        tigerDust(g, m, enraged ? 18 : 10, 120);
        g.shake = Math.max(g.shake, 2);
        // Furioso: a queda levanta uma onda de choque rasteira
        if (enraged && Math.abs(p.cx - m.cx) < TIGER.shock && Math.abs(p.cy - m.cy) < 2.5 * T && p.invulnerable <= 0) {
          damageMonsterPlayer(g, 14, m.cx);
        }
      }
      break;
    case 'swipe': { // arma a pata (0.3s) e desce a patada num arco curto à frente
      const windup = 0.3;
      m.damage = 0;
      if (m.stateT >= windup && !m.swiped) {
        m.swiped = true;
        m.vx = m.facing * 150;
        playSfx('tigerPounce', m.cx, m.cy, { vol: 0.8 });
        tigerDust(g, m, 8, 60);
        const reach = 26;
        if (p.invulnerable <= 0 && Math.abs(p.cy - m.cy) < 2.4 * T &&
            (p.cx - m.cx) * m.facing > -8 && Math.abs(p.cx - m.cx) < m.w / 2 + reach) {
          damageMonsterPlayer(g, TIGER.swipe, m.cx);
          g.shake = 3;
        }
      }
      if (m.stateT >= windup + 0.35) {
        m.swiped = false;
        m.swipeCd = (enraged ? 1.6 : 2.8) + Math.random();
        m.damage = TIGER.contact;
        tigerState(m, 'hunt');
      }
      break;
    }
    case 'stun': // zonzo: parado, sem dano de encontrão e levando mais pancada
      m.damage = 0; m.aware = true;
      if (m.stateT === 0 || Math.random() < dt * 6) mobParticles(g, m, 1, 'rgb(240,220,140)');
      if (m.stateT >= TIGER.stun) { m.pounceCd = 1.2; m.swipeCd = 0.8; tigerState(m, 'hunt'); }
      break;
    case 'recover': // cansado depois do bote: hora de bater
      m.damage = TIGER.contact;
      if (m.stateT >= TIGER.recover * (enraged ? 0.7 : 1)) tigerState(m, 'hunt');
      break;
    case 'roar':
      m.damage = TIGER.contact;
      // O berro empurra quem estiver perto
      if (m.stateT < 0.1 && dist < 5 * T) { p.vx = Math.sign(dx || 1) * 230; p.vy = -150; }
      if (m.stateT >= 1.2) tigerState(m, 'hunt');
      break;
    case 'return': {
      m.damage = 0; m.aware = false;
      if (dist < 12 * T) { m.aware = true; tigerState(m, 'hunt'); break; }
      const ddx = m.den.x - m.cx;
      target = Math.abs(ddx) < 8 ? 0 : Math.sign(ddx); speed = m.def.speed * 0.5;
      if (!target) tigerGoHome(g, m);
      break;
    }
  }
  const moving = m.state === 'hunt' || m.state === 'return';
  if (moving && m.hurtTimer <= 0) { m.vx += (target * speed - m.vx) * (1 - Math.exp(-7 * dt)); if (target) m.facing = target; }
  else if (m.state === 'stun') m.vx *= Math.exp(-14 * dt);
  else if (m.state !== 'pounce' && m.state !== 'swipe' && m.onGround) m.vx *= Math.exp(-12 * dt);
  const oldX = m.x, wanted = m.vx;
  m.applyGravity(dt); m.moveX(m.vx * dt, w);
  if (moving && wanted && m.vx === 0 && m.onGround) m.vy = -400;
  m.moveY(m.vy * dt, w);
  m.gait += Math.abs(m.x - oldX) / 5; m.anim = m.gait; m.settleStep(dt);
}

function tigerHit(m, damage, fromX) {
  if (m.sleeping) {
    if (performance.now() - (m.hitHint || 0) > 1500) { m.hitHint = performance.now(); toast('Ele só acorda com Carne Suculenta, obtida de Bramido. Solte-a perto dele (Q).'); }
    return;
  }
  const weak = m.state === 'stun'; // zonzo: é a hora de descontar
  m.hp -= weak ? Math.round(damage * TIGER.stunTaken) : damage;
  m.hurtTimer = weak ? 0.2 : 0.12;
  if (weak) { mobParticles(game, m, 6, 'rgb(240,120,90)'); game.shake = Math.max(game.shake, 2); }
  if (m.state !== 'pounce' && m.state !== 'swipe') m.vx = (m.cx < fromX ? -1 : 1) * (weak ? 110 : 60);
  if (m.state === 'return') { m.aware = true; tigerState(m, 'hunt'); }
  if (m.hp <= 0) m.dead = true;
  else if (performance.now() - (m.voiceT || 0) > 400) { m.voiceT = performance.now(); mobSfx(m, 'Hurt'); }
}

function bossDefeated(g, m) {
  if (g.boss === m) g.boss = null;
  g.shake = 6;
  // Cada chefe cuida do próprio fim de luta; o urso está em js/bear.js
  if (typeof bossDefeatedHook === 'function' && bossDefeatedHook(g, m)) return;
  spiderTigerSlain(g); // o casulo da Fiandeira começa a rasgar (js/spider-boss.js)
  storyBossFell(g, "tiger"); // a arena vira a Estrada do Âmbar (js/story.js)
  // As hienas do bando perdem a graça e vão embora
  for (const o of g.mobs) if (o.tigerPack) o.tigerPack = false;
  toast('Você derrotou o Dente de Âmbar, o Tigre da Savana! Pegue o dente, as garras, a pelagem e o coração.');
  Music.victory();
}

// Cada chefe descreve a própria barra: kind -> rótulo, cores e a marca da segunda fase.
// O tigre está aqui; o urso se registra em js/bear.js.
const BOSS_BARS = {};
BOSS_BARS.tiger = (m) => {
  const furious = tigerEnraged(m), dazed = m.state === 'stun';
  return {
    label: 'DENTE DE ÂMBAR' + (dazed ? ' · ZONZO!' : furious ? ' · FURIOSO' : ''),
    text: dazed ? '#ffe28a' : furious ? '#ff9a6a' : UIC.text,
    fill: m.hurtTimer > 0 ? '#ffe0a0' : dazed ? '#ffc23c' : '#e0782c',
    back: '#2a1410', mark: furious ? '#ff9a6a' : '#7a3a20',
  };
};

// Barra de vida do chefe, embaixo no meio da tela
function drawBossBar(ctx, g, W, H) {
  const m = g.boss;
  if (!m || m.dead || g.intro?.active || m.state === 'sleep') return;
  const s = g.inventoryUI.scale(), bw = 200, bh = 24;
  ctx.save();
  ctx.setTransform(s, 0, 0, s, Math.round(W / 2 - (bw * s) / 2), Math.round(H - (bh + 30) * s));
  ctx.imageSmoothingEnabled = false;
  uiFrame(ctx, 0, 0, bw, bh);
  ctx.font = UI_FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  const bar = (BOSS_BARS[m.kind] || BOSS_BARS.tiger)(m);
  g.inventoryUI.shadowText(ctx, bar.label, bw / 2, 10, bar.text);
  const bx = 8, by = 14, width = bw - 16, fill = Math.round(width * clamp(m.hp / m.def.hp, 0, 1));
  ctx.fillStyle = UIC.outline; ctx.fillRect(bx - 1, by - 1, width + 2, 7);
  ctx.fillStyle = bar.back; ctx.fillRect(bx, by, width, 5);
  ctx.fillStyle = bar.fill; ctx.fillRect(bx, by, fill, 5);
  ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(bx, by, fill, 1);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  for (let k = 1; k < 10; k++) ctx.fillRect(bx + Math.round((width * k) / 10), by, 1, 5);
  // Marca dos 40%: dali em diante ele entra na segunda fase
  ctx.fillStyle = bar.mark; ctx.fillRect(bx + Math.round(width * 0.4), by - 1, 1, 7);
  ctx.restore();
}

// ---------- Roupas / armaduras ----------
// A peça vestida fica em g.outfit e aparece no espaço de roupa do inventário (js/inventory-ui.js).
function setPlayerOutfit(kind) {
  PLAYER_OUTFIT = kind;
  applyLook(PLAYER_LOOK, renderer);
}

// Troca a peça vestida sem mexer no inventário (devolve a que estava, ou null)
function setOutfitItem(g, item) {
  const old = g.outfit || null;
  g.outfit = item || null;
  setPlayerOutfit(item ? ITEM_DEFS[item].roupa?.visual || 'tiger' : null);
  return old;
}

const outfitDefense = (item) => Math.round((ITEM_DEFS[item]?.roupa?.defesa || 0) * 100);

// Botão direito com uma roupa na mão: veste (a roupa anterior volta para o inventário)
function wearHeldOutfit(g) {
  const slot = g.inventory.slots[g.selected];
  if (!slot) return;
  const item = slot.item;
  g.inventory.takeFromSlot(g.selected);
  const old = setOutfitItem(g, item);
  if (old && g.inventory.add(old, 1) > 0) dropFromPlayer(g, old, 1);
  toast(`Vestiu: ${ITEM_DEFS[item].name} (−${outfitDefense(item)}% de dano). V tira.`);
  playSfx('invOpen');
}

function takeOffOutfit(g) {
  if (!g.outfit) return;
  if (g.inventory.add(g.outfit, 1) > 0) { toast('Inventário cheio.'); return; }
  toast(`Tirou: ${ITEM_DEFS[g.outfit].name}`);
  setOutfitItem(g, null);
  playSfx('invClose');
}

// Coração do tigre: aumenta a vida máxima de uma vez por todas
function eatTigerHeart(g) {
  const p = g.player, def = ITEM_DEFS[g.inventory.slots[g.selected]?.item]?.vidaMaxima ? ITEM_DEFS[g.inventory.slots[g.selected].item] : ITEM_DEFS[ITEM.TIGER_HEART]; // coração do tigre ou dos Vigias
  p.maxHp = Math.min(200, (p.maxHp || 100) + def.vidaMaxima);
  p.hp = p.maxHp;
  g.inventory.takeFromSlot(g.selected);
  g.placeCooldown = 1;
  g.shake = 3;
  mobParticles(g, p, 18, 'rgb(220,70,70)');
  toast(`Vida máxima agora é ${p.maxHp}!`);
  playSfx('eat', p.cx, p.cy);
}

// ---------- Sons ----------
Object.assign(SFX, {
  elephantIdle(A, o) { // barrido
    voice(A, o, { type: 'sawtooth', f0: 380, f1: 560, dur: 0.95, gain: 0.5, formants: [[900, 5], [1900, 7]], attack: 0.08, vib: 24, vibRate: 11 });
    N(A, o, { type: 'bandpass', freq: 1200, q: 1, dur: 0.9, gain: 0.12, attack: 0.1 });
  },
  elephantStep(A, o) { N(A, o, { freq: 180, dur: 0.22, gain: 0.5, brown: true }); Tn(A, o, { freq: 70, freqEnd: 38, dur: 0.2, gain: 0.3 }); },
  elephantHurt(A, o) { voice(A, o, { f0: 520, f1: 340, dur: 0.4, gain: 0.5, formants: [[1000, 5]], vib: 30, vibRate: 14 }); SFX.flesh(A, o); },
  elephantDeath(A, o) {
    voice(A, o, { f0: 460, f1: 150, dur: 1.2, gain: 0.5, formants: [[800, 4], [1600, 6]], vib: 18, vibRate: 7 });
    N(A, o, { freq: 140, dur: 0.6, gain: 0.7, brown: true, delay: 0.9 });
  },
  tigerStep(A, o) { N(A, o, { freq: 300, dur: 0.07, gain: 0.18, brown: true }); },
  tigerSnore(A, o) {
    N(A, o, { type: 'bandpass', freq: 240, q: 2, dur: 1.1, gain: 0.35, attack: 0.5, brown: true });
    voice(A, o, { f0: 62, f1: 55, dur: 1.0, gain: 0.25, formants: [[300, 3]], attack: 0.45 });
  },
  tigerGrowl(A, o) { voice(A, o, { f0: 95, f1: 80, dur: 0.7, gain: 0.8, formants: [[380, 3], [800, 4]], attack: 0.08, vib: 22, vibRate: 28 }); },
  tigerRoar(A, o) {
    voice(A, o, { f0: 150, f1: 90, dur: 1.4, gain: 1.0, formants: [[420, 3], [900, 4], [2200, 6]], attack: 0.06, vib: 16, vibRate: 22 });
    N(A, o, { type: 'bandpass', freq: 700, q: 0.8, dur: 1.3, gain: 0.45, attack: 0.05 });
  },
  tigerPounce(A, o) {
    N(A, o, { type: 'bandpass', freq: 900, freqEnd: 300, q: 0.7, dur: 0.35, gain: 0.35 });
    voice(A, o, { f0: 190, f1: 120, dur: 0.35, gain: 0.7, formants: [[600, 3]] });
  },
  tigerHurt(A, o) { voice(A, o, { f0: 220, f1: 150, dur: 0.3, gain: 0.8, formants: [[500, 3], [1100, 5]], vib: 20, vibRate: 25 }); SFX.flesh(A, o); },
  tigerDeath(A, o) { voice(A, o, { f0: 180, f1: 60, dur: 1.6, gain: 0.9, formants: [[450, 3], [1000, 5]], vib: 10, vibRate: 8 }); },
});
