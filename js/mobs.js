'use strict';

// =====================================================================================
//  BICHOS (mobs)
// =====================================================================================

// Chance de um porco nascer quadrado: 0,5% (1 em 200)
const CUBE_PIG_CHANCE = 0.005;
const PIG = {
  vida: 10,               // a mão tira 1, a espada de madeira tira 4
  velocidade: 40,         // andando à toa (px/s)
  velocidadeFuga: 110,    // correndo depois de apanhar
  maximoNoMundo: 6,
  iniciais: 4,            // quantos já existem quando o mundo é criado
  drop: { item: ITEM.MEAT, min: 1, max: 2 },
};

class Pig extends Body {
  constructor(x, y) {
    super(x, y, 20, 15);
    this.hp = PIG.vida;
    this.dir = 0;
    this.thinkTimer = Math.random() * 2;
    this.fleeTimer = 0;
    this.hurtTimer = 0;
    this.skin = 0;               // 1 = porco quadrado (raríssimo)
    this.anim = 0;
    this.dead = false;
  }

  update(dt, world, player) {
    this.clock = (this.clock || 0) + dt;
    this.hurtTimer = Math.max(0, this.hurtTimer - dt);
    this.fleeTimer = Math.max(0, this.fleeTimer - dt);
    this.thinkTimer -= dt;

    if (this.fleeTimer > 0) {
      this.dir = this.cx < player.cx ? -1 : 1; // foge para longe do jogador
    } else if (this.thinkTimer <= 0) {
      const r = Math.random();
      this.dir = r < 0.3 ? -1 : r < 0.6 ? 1 : 0;
      this.thinkTimer = 1.5 + Math.random() * 3;
    }

    // Durante o empurrão do golpe o porco não controla o próprio movimento
    if (this.hurtTimer <= 0) {
      const speed = this.fleeTimer > 0 ? PIG.velocidadeFuga : PIG.velocidade;
      this.vx += (this.dir * speed - this.vx) * (1 - Math.exp(-8 * dt));
      if (this.dir) this.facing = this.dir;
    }

    this.applyGravity(dt);
    const wanted = this.vx;
    this.moveX(this.vx * dt, world);
    // Bateu numa parede alta: pula
    if (wanted !== 0 && this.vx === 0 && this.onGround && this.hurtTimer <= 0) this.vy = -380;
    this.moveY(this.vy * dt, world);

    if (this.onGround && Math.abs(this.vx) > 5) this.anim += Math.abs(this.vx) * dt * 0.12;
    else this.anim = 0;
    this.settleStep(dt);
  }

  hit(damage, fromX) {
    this.hp -= damage;
    const away = this.cx < fromX ? -1 : 1;
    this.vx = away * 160;
    this.vy = -220;
    this.onGround = false;
    this.hurtTimer = 0.3;
    this.fleeTimer = 4;
    if (this.hp <= 0) this.dead = true;
    else mobSfx(this, 'Hurt');
  }
}

// ---------- Nascimento, atualização e morte ----------
function surfaceY(world, x) {
  // as ilhas do céu (js/sky-world.js) não contam como chão: começa embaixo da faixa delas
  for (let y = world.skyFloor ? world.skyFloor[clamp(x, 0, world.w - 1)] + 1 : 0; y < world.h; y++) if (world.isSolid(x, y)) return y;
  return -1;
}

// Retângulo do bicho fora da câmera (com margem em tiles): ninguém nasce ou some na frente do jogador
function mobPlayers(g) { return typeof netWorldPlayers === 'function' ? netWorldPlayers(g) : [g.player]; }
function mobNearPlayer(g,m,range) { return mobPlayers(g).some(p => Math.hypot(m.cx-p.cx,m.cy-p.cy)<range); }
function mobOffScreen(game, m, margin = 2) {
  const vw = (game.netSpawnContext&&game.cam.w)||canvas.width / game.zoom, vh = (game.netSpawnContext&&game.cam.h)||canvas.height / game.zoom, pad = margin * T;
  if (typeof NET !== 'undefined' && NET.room && NET.isHost && !game.netSpawnContext) {
    return mobPlayers(game).every(p => {
      const c = p === game.player ? {...game.cam,w:vw,h:vh} : p.view || {x:p.cx-vw/2,y:p.cy-vh/2,w:vw,h:vh};
      return m.x+m.w<c.x-pad || m.x>c.x+(c.w||vw)+pad || m.y+m.h<c.y-pad || m.y>c.y+(c.h||vh)+pad;
    });
  }
  return m.x + m.w < game.cam.x - pad || m.x > game.cam.x + vw + pad ||
         m.y + m.h < game.cam.y - pad || m.y > game.cam.y + vh + pad;
}

// Coluna de tile logo depois da borda esquerda (side < 0) ou direita da tela
function offScreenColumn(game, side, extra) {
  const vw = (game.netSpawnContext&&game.cam.w)||canvas.width / game.zoom;
  return side < 0 ? Math.floor(game.cam.x / T) - 3 - extra : Math.ceil((game.cam.x + vw) / T) + 3 + extra;
}

// Tenta colocar um porco em cima de grama, a pelo menos `minDist` tiles do jogador
function trySpawnPig(game, minDist, offScreen = false) {
  const { world, player } = game;
  if (game.mobs.filter(m => !m.hostile && !m.def?.aquatic).length >= PIG.maximoNoMundo) return false;
  for (let attempt = 0; attempt < 30; attempt++) {
    // Perto do jogador (mundos gigantes): entre minDist e minDist + 100 tiles de distância
    const x = clamp(Math.floor(player.cx / T) + (Math.random() < 0.5 ? -1 : 1) * (minDist + Math.floor(Math.random() * 100)), 3, world.w - 4);
    if (Math.abs(x - player.cx / T) < minDist) continue;
    const y = surfaceY(world, x);
    if (y < 3) continue;
    // Com água em cima do chão (rio ou mar) não nasce bicho de terra; os aquáticos vêm do js/aquatic.js
    if (world.hasWater(x, y - 1)) continue;
    const pool = wildlifePool(world, x, false).filter((k) => !WILDLIFE[k]?.aquatic);
    if (!pool.length) continue;
    const kind = pool[Math.floor(Math.random() * pool.length)];
    const pig = kind === 'pig' ? new Pig(x * T - 2, 0) : new Wildlife(kind, x * T - 2, 0);
    if (kind === 'pig' && Math.random() < CUBE_PIG_CHANCE) pig.skin = 1;
    pig.y = y * T - pig.h - .01;
    if (kind === 'bird') placeBird(world, pig, x); // voando ou dormindo num ninho
    if (game.mobs.some(m => Math.hypot(m.cx-pig.cx,m.cy-pig.cy)<3*T)) continue;
    if (pig.collides(world, pig.x, pig.y) || (offScreen && !mobOffScreen(game, pig, 3))) continue;
    game.mobs.push(pig);
    return true;
  }
  return false;
}

function mobAt(game, wx, wy) {
  for (const m of game.mobs) if (!m.dead && m !== game.mount && m.containsPoint(wx, wy, 3)) return m;
  return null;
}

function mobParticles(game, mob, n, color) {
  for (let i = 0; i < n; i++) {
    game.particles.push({
      x: mob.x + Math.random() * mob.w,
      y: mob.y + Math.random() * mob.h,
      vx: (Math.random() - 0.5) * 140,
      vy: -Math.random() * 160,
      life: 0.3 + Math.random() * 0.4,
      color,
    });
  }
}

function killMob(game, mob) {
  if (mob.carcass) return;
  Bestiary.recordKill(mob); // js/bestiary.js
  mobParticles(game, mob, 16, 'rgb(200,60,70)');
  mobSfx(mob, 'Death');
  if (mob.kind === 'shark') { makeSharkCarcass(game, mob); return; }
  // drops: [[item, mínimo, máximo], ...]; cai no chão e o jogador pega passando por cima
  const drops = mob.def?.drops || [mob.def ? [mob.def.drop, 1, 1] : [PIG.drop.item, PIG.drop.min, PIG.drop.max]];
  // O quarto número é a chance de sair aquela peça (1 = sempre), usado pelo espólio do urso
  drops.forEach(([item, min, max, chance], i) => {
    if (chance !== undefined && Math.random() >= chance) return;
    dropItem(game, item, min + Math.floor(Math.random() * (max - min + 1)), mob.cx, mob.cy, i - (drops.length - 1) / 2);
  });
  if (mob.kind === 'elephant') spillElephantGear(game, mob); // sela e carga caem junto
  if (game.mount === mob) dismountElephant(game);
  if (mob.boss) bossDefeated(game, mob);
}

function resetBossEncounter(g, m) {
  if (m.kind === 'bear') bearGoHome(g, m);
  else if (m.kind === 'tiger') tigerGoHome(g, m);
  else if (m.kind === 'fiandeira') fiandeiraGoHome(g, m);
  else if (m.kind === 'cascoferro') cascoFerroGoHome(g, m);
  else SHAPE_HOOKS[m.def?.shape]?.goHome?.(g, m);
  if(m.summonerCreated)m.despawn=true;
}

function updateMobs(game, dt) {
  game.mobSpawnTimer -= dt;
  if (game.mobSpawnTimer <= 0) {
    game.mobSpawnTimer = 10 + Math.random() * 10;
    if (game.mobs.filter(m=>!m.hostile&&!m.def?.aquatic).length < PIG.maximoNoMundo * Math.max(1,mobPlayers(game).length)) trySpawnPig(game, 20, true);
  }
  // Bichos passivos muito longe somem, para poderem nascer de novo perto do jogador
  game.mobs = game.mobs.filter((m) => m.hostile || m.keep || mobNearPlayer(game,m,160*T));
  updateHostiles(game, dt);
  for (let i = game.mobs.length - 1; i >= 0; i--) {
    const m = game.mobs[i];
    if (m.despawn) continue;
    if (m.kind === 'shark' && m.dead && !m.carcass) killMob(game, m);
    if (m.carcass) { updateSharkCarcass(game, m, dt); continue; }
    if(game.boss?.summonerCreated&&game.boss!==m&&m.boss&&m.sleeping)continue;
    // O chefe fica parado no covil enquanto o jogador está longe (se estava lutando, volta a dormir).
    // Preso no casulo ('cocoon') ou enterrado ('buried') ele já descansa em casa: o reset vale uma
    // vez e não se repete enquanto o estado não muda. Repetir a cada quadro reescrevia a porta do
    // covil e recalculava a luz do mundo inteira todo quadro.
    if (m.boss && !m.dead && !mobNearPlayer(game,m,120*T)) {
      if (m.state !== 'sleep' && m.state !== m.restState) { resetBossEncounter(game, m); m.restState = m.state; }
      continue;
    }
    m.restState = null;
    // Casulo de Caça: preso não se mexe; lento anda menos (js/spider-loot.js)
    if (!updateRoarKnockback(m, dt, game.world) && !cocoonHold(m, dt) && !stunHold(m, dt)) { const ox = m.x; m.update(dt, game.world, game.player); cocoonSlowAfter(m, ox, dt); }
    if(m.summonerCreated&&m.sleeping)m.despawn=true;
    maulWallCheck(game, m, dt); // Marreta de Carapaça: bateu na parede, atordoa (js/beetle-loot.js)
    if (m.dead) {
      killMob(game, m);
      if (!m.carcass) game.mobs.splice(i, 1);
    }
  }
  game.mobs = game.mobs.filter(m => !m.despawn);
}
