'use strict';

const GRAVITY = 1500;
const MAX_FALL = 900; // < 60 * T para não atravessar tiles
const WALK_SPEED = 170;          // velocidade de corrida (Shift) e base de várias mecânicas
const WALK_FRACTION = 0.62;      // andando (sem Shift): ~105 px/s, abaixo do limite em que o jogo troca para a animação de corrida
const JUMP_SPEED = 520;
const CLIMB_SPEED = 110; // px/s subindo ou descendo uma escada
const PLAYER_H = 42;     // altura em pé
// Engatinhando cabe num vão de 2 blocos (32px); em pé (42px) precisa de 3. É essa a diferença
// de "um bloco" que interessa — e 29px é a altura do boneco de quatro (topo da cabeça até o chão).
const CROUCH_H = 29;
// Sentado: quanto o centro do corpo fica à frente do meio da cadeira (o quadril cai na almofada)
const SEAT_OFFSET = 3;

// Corpo com física e colisão com os tiles (usado pelo jogador e pelos bichos)
class Body {
  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
    this.facing = 1;
    this.stepOffset = 0; // suaviza visualmente a subida automática de degrau
  }

  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }

  applyGravity(dt, g = GRAVITY) {
    this.vy = Math.min(this.vy + g * dt, MAX_FALL);
  }

  settleStep(dt) {
    this.stepOffset *= Math.pow(0.0005, dt);
    if (this.stepOffset < 0.1) this.stepOffset = 0;
  }

  collides(world, x, y) {
    const x0 = Math.floor(x / T), x1 = Math.floor((x + this.w - 0.001) / T);
    const y0 = Math.floor(y / T), y1 = Math.floor((y + this.h - 0.001) / T);
    for (let ty = y0; ty <= y1; ty++)
      for (let tx = x0; tx <= x1; tx++)
        if (world.isSolid(tx, ty)) return true;
    return false;
  }

  moveX(dx, world) {
    if (dx === 0) return;
    const nx = this.x + dx;
    if (!this.collides(world, nx, this.y)) { this.x = nx; return; }

    // Sobe automaticamente degraus de 1 bloco
    if (this.onGround && !this.collides(world, nx, this.y - T)) {
      this.x = nx;
      this.y -= T;
      this.stepOffset += T;
      return;
    }

    if (dx > 0) this.x = Math.floor((nx + this.w) / T) * T - this.w - 0.01;
    else this.x = (Math.floor(nx / T) + 1) * T + 0.01;
    this.vx = 0;
  }

  moveY(dy, world) {
    const ny = this.y + dy;
    // Plataforma (js/furniture.js): segura só quem cai de cima dela; descendo com S (dropTimer) passa
    if (dy > 0 && !(this.dropTimer > 0)) {
      const before = this.y + this.h, after = ny + this.h;
      const x0 = Math.floor(this.x / T), x1 = Math.floor((this.x + this.w - 0.001) / T);
      for (let ty = Math.ceil(before / T - 0.001); ty * T < after; ty++) {
        let hit = false;
        for (let tx = x0; tx <= x1; tx++) if (TILE_DEFS[world.getTile(tx, ty)].plataforma) hit = true;
        if (hit && !this.collides(world, this.x, ty * T - this.h - 0.01)) {
          this.y = ty * T - this.h - 0.01;
          this.onGround = true;
          this.vy = 0;
          return;
        }
      }
    }
    if (!this.collides(world, this.x, ny)) {
      this.y = ny;
      this.onGround = false;
      return;
    }
    if (dy > 0) {
      this.y = Math.floor((ny + this.h) / T) * T - this.h - 0.01;
      this.onGround = true;
    } else {
      this.y = (Math.floor(ny / T) + 1) * T + 0.01;
    }
    this.vy = 0;
  }

  overlapsTile(tx, ty) {
    return this.x < (tx + 1) * T && this.x + this.w > tx * T &&
           this.y < (ty + 1) * T && this.y + this.h > ty * T;
  }

  containsPoint(px, py, margin = 0) {
    return px >= this.x - margin && px <= this.x + this.w + margin &&
           py >= this.y - margin && py <= this.y + this.h + margin;
  }
}

class Player extends Body {
  constructor(x, y) {
    super(x, y, 14, PLAYER_H);
    this.anim = 0;
    this.visualTime = 0; this.jumpAge = 1; this.landTimer = 0;
    this.hp = 100; this.maxHp = 100;
    this.crouching = false;
  }

  // Encostando numa escada (no peito ou nos pés)
  onLadder(world) {
    const tx = Math.floor(this.cx / T);
    return world.getTile(tx, Math.floor(this.cy / T)) === TILE.LADDER ||
           world.getTile(tx, Math.floor((this.y + this.h - 2) / T)) === TILE.LADDER;
  }

  // A escada pode terminar um bloco abaixo da borda (como nos poços já gerados).
  // Apoia o pé nessa borda ao sair para o lado, sem exigir onGround na escada.
  stepOffLadder(dx, world) {
    if (!dx || !this.collides(world, this.x + dx, this.y)) return false;
    const nx = this.x + dx, feet = this.y + this.h;
    const tx = Math.floor((dx > 0 ? nx + this.w - 0.001 : nx) / T);
    const footRow = Math.floor((feet - 0.001) / T);
    for (let ty = footRow; ty >= footRow - 1; ty--) {
      if (!world.isSolid(tx, ty) || world.isSolid(tx, ty - 1)) continue;
      const ny = ty * T - this.h - 0.01, lift = this.y - ny;
      // Margem pequena para a oscilação dos pés no último degrau da escada.
      if (lift <= 0 || lift > T + 4) continue;
      if (this.collides(world, this.x, ny) || this.collides(world, nx, ny)) continue;
      this.x = nx; this.y = ny;
      this.stepOffset += lift;
      this.vy = 0; this.onGround = true; this.climbing = false;
      return true;
    }
    return false;
  }

  // Agacha/levanta mantendo os pés no lugar. Só levanta se tiver espaço em cima.
  setCrouch(on, world) {
    if (on === this.crouching) return true;
    const dh = PLAYER_H - CROUCH_H;
    if (on) { this.y += dh; this.h = CROUCH_H; this.crouching = true; this.crouchAge = 0; return true; }
    const ny = this.y - dh;
    this.h = PLAYER_H;
    if (this.collides(world, this.x, ny)) { this.h = CROUCH_H; return false; } // teto baixo: continua agachado
    this.y = ny; this.crouching = false; this.crouchAge = 0;
    return true;
  }

  // Senta na cadeira (tx, ty) virado para `facing`; o quadril fica em cima da almofada
  sitOn(world, tx, ty, facing) {
    if (this.crouching && !this.setCrouch(false, world)) return;
    this.seat = { tx, ty, facing };
    this.vx = this.vy = 0;
    this.gag = null;
  }

  // Enquanto sentado: preso na cadeira. Levanta ao andar/pular/S ou se a cadeira sumir (e no
  // quadro seguinte volta a andar normalmente).
  updateSeat(dt, world, leave) {
    const s = this.seat;
    if (leave || !TILE_DEFS[world.getTile(s.tx, s.ty)].sentar) {
      this.seat = null;
      this.ignoreDown = true;
      return;
    }
    this.facing = s.facing;
    this.x = s.tx * T + T / 2 + (s.facing > 0 ? SEAT_OFFSET : -SEAT_OFFSET) - this.w / 2;
    this.y = (s.ty + 1) * T - this.h - 0.01;
    this.vx = this.vy = 0;
    this.onGround = true;
    this.settleStep(dt);
  }

  update(dt, input, world) {
    try {
    const wasGround = this.onGround, oldX = this.x;
    this.flying=false;
    this.flightGliding=false;
    this.flightSide=false;
    if(wasGround){this.flightUsed=0;this.flightSpent=false;}
    this.visualTime += dt; this.jumpAge += dt; this.landTimer = Math.max(0,this.landTimer-dt);
    this.crouchAge = (this.crouchAge ?? 1) + dt; // tempo desde que agachou ou levantou (quadro de transição)
    const left = input.down('KeyA') || input.down('ArrowLeft');
    const right = input.down('KeyD') || input.down('ArrowRight');
    const jump = input.down('Space') || input.down('KeyW') || input.down('ArrowUp');
    const dir = (right ? 1 : 0) - (left ? 1 : 0);
    const downKey = input.down('KeyS') || input.down('ArrowDown');
    if (!downKey) this.ignoreDown = false;
    const wantsDown = downKey && !this.ignoreDown; // levantou da cadeira com S: não engatinha até soltar

    // Sentado numa cadeira: fica parado até andar, pular ou apertar S
    if (this.seat) { this.updateSeat(dt, world, dir !== 0 || jump || wantsDown); return; }
    // Gancho do Carretel puxando ou pendurado (js/gear-movement.js)
    if (gearOverride(this, dt, input, world)) { this.settleStep(dt); return; }

    // Agachar: S/↓ quando não está numa escada (na escada S desce). Ctrl é o cursor inteligente.
    const ladder = this.onLadder(world);
    // Dentro d'água o jogador nada (js/water.js)
    if (!ladder && updateSwimming(this, dt, input, world)) { this.settleStep(dt); return; }
    // Em cima de uma plataforma, S desce por ela em vez de engatinhar (js/furniture.js)
    if (wantsDown && this.onGround && !ladder && !this.crouching && standingOnPlatform(world, this)) this.dropTimer = 0.25;
    this.dropTimer = Math.max(0, (this.dropTimer || 0) - dt);
    this.setCrouch(wantsDown && !ladder && !this.dropTimer, world);

    const candidate=!this.onGround&&!this.crouching&&(input.down('ShiftLeft')||input.down('ShiftRight'))?equippedFlight(game):null;
    const flightGear=candidate&&(candidate.rule.jet?(this.jetFuel>0||game.inventory.count(ITEM.FLIGHT_FUEL)>0):candidate.rule.time>(this.flightUsed||0))?candidate:null;
    const topSpeed = flightGear?Math.max(WALK_SPEED,flightGear.rule.horizontal*1.22):WALK_SPEED * (this.crouching ? 0.35 : this.onGround&&referenceHas(game,'sprint')?1.25:1); // engatinhando é devagar
    // Anda por padrão; Shift corre (a velocidade de corrida é a de antes). No ar mantém o embalo que já tinha.
    const running = input.down('ShiftLeft') || input.down('ShiftRight') || !!flightGear;
    const gait = this.crouching || running ? 1 : WALK_FRACTION;
    const cap = Math.max(topSpeed * gait, this.onGround ? 0 : Math.abs(this.vx));
    if (dir !== 0) {
      const accel = this.onGround ? 1400 : 900;
      const limit = this.onGround ? Math.max(cap, Math.abs(this.vx) - 450 * dt) : cap;   // soltou o Shift correndo: desacelera até o passo, sem tranco
      this.vx = clamp(this.vx + dir * accel * dt, -limit, limit);
      if (!this.lockFacing) this.facing = dir; // durante um golpe a direção fica travada
    } else if(!flightGear) {
      const friction = (this.onGround ? 1600 : 400) * dt;
      this.vx = Math.abs(this.vx) <= friction ? 0 : this.vx - Math.sign(this.vx) * friction;
    }
    if (this.crouching && Math.abs(this.vx) > topSpeed) this.vx = Math.sign(this.vx) * topSpeed;
    referenceMovement(this,dt,input,dir,jump);
    gearVelocity(this, dt, input, world, dir, jump); // esquiva, salto da parede e teia (js/gear-movement.js)

    // Escada: sobe/desce sem gravidade e fica pendurado parado (sair é só andar para o lado)
    const down = wantsDown;
    if (ladder && dir && !down && this.stepOffLadder(this.vx * 0.6 * dt, world)) {
      this.settleStep(dt);
      return;
    }
    this.climbing = ladder && (!this.onGround || jump || down);
    if (this.climbing) {
      this.vy = jump ? -CLIMB_SPEED : down ? CLIMB_SPEED : 0;
      this.climbAnim = (this.climbAnim || 0) + Math.abs(this.vy) * dt * 0.06;
      this.climbPhase = (this.climbPhase || 0) + Math.abs(this.vy) * dt * 0.2;   // um ciclo de 8 quadros a cada ~40 px: as mãos acompanham os degraus
      this.moveX(this.vx * 0.6 * dt, world);
      this.moveY(this.vy * dt, world);
      this.settleStep(dt);
      return;
    }

    if (jump && this.onGround && !this.crouching) { // agachado não pula
      this.vy = -JUMP_SPEED * gearJumpScale(this);
      this.jumpAge = 0;
      this.onGround = false;
    }

    // Soltar o pulo cedo = pulo mais baixo
    // Luvas de Seda: agarrado na parede não cai
    if (!flightControl(this,dt,input,world,dir) && !gearWallGrab(this, dt, input, world, dir)) this.applyGravity(dt, !jump && this.vy < 0 ? GRAVITY * 2.2 : GRAVITY);

    this.moveX(this.vx * dt, world);
    const fallingSpeed = this.vy;
    this.moveY(this.vy * dt, world);

    if (!wasGround && this.onGround && fallingSpeed > 120) this.landTimer = 0.10;
    // 12 quadros por ciclo; a distância do ciclo acompanha o tamanho da passada para os pés não deslizarem
    if (this.onGround) this.anim += Math.abs(this.x-oldX) * 12 / (Math.abs(this.vx) > 110 ? 40 : 30);

    this.updateCrawlFun(dt);
    this.updateIdleGag(dt, dir !== 0 || jump || input.down('KeyS') || input.down('ArrowDown'));
    this.settleStep(dt);
    } finally { referenceAfterMovement(this);updateFlightPose(this,dt); }
  }
}

// ---------- Engatinhando: o lado bobo ----------
// Parado um tempinho ele rebola, engatinhando pela poeira às vezes espirra (e o espirro empurra
// para trás) e cada passo levanta uma poeirinha dos joelhos. Sons em js/sfx.js.
Player.prototype.updateCrawlFun = function (dt) {
  this.wiggleT = Math.max(0, (this.wiggleT || 0) - dt);
  this.sneezeT = Math.max(0, (this.sneezeT || 0) - dt);
  if (!this.crouching || !this.onGround) { this.crawlIdle = 0; this.wiggleT = 0; this.sneezeT = 0; return; }
  const moving = Math.abs(this.vx) > 5;
  this.crawlIdle = moving ? 0 : (this.crawlIdle || 0) + dt;
  if (moving) this.wiggleT = 0;
  if (!moving && this.crawlIdle > 2.2 && this.wiggleT <= 0 && this.sneezeT <= 0) {
    this.wiggleT = 1.3;
    this.crawlIdle = -2 - Math.random() * 4; // o próximo rebolado demora um pouco
    playSfx('buttWiggle', this.cx - this.facing * 8, this.y + 10);
  }
  if (moving && this.sneezeT <= 0 && Math.random() < dt / 12) {
    this.sneezeT = 0.55; this.sneezed = false;
    playSfx('sneezeIn', this.cx, this.y + 8);
  }
  if (this.sneezeT > 0) {
    this.vx *= Math.exp(-12 * dt); // para para espirrar
    if (!this.sneezed && this.sneezeT <= 0.22) { this.sneezed = true; sneezePuff(this); }
  }
  const step = Math.floor(this.anim / 2.5) % 6;
  if (moving && step !== this.crawlStep && (step === 0 || step === 3)) crawlDust(this);
  this.crawlStep = step;
};

// "ATCHIM!": nuvem de poeira saindo do nariz, o corpo vai um pouco para trás e a tela treme de leve
function sneezePuff(p) {
  const fx = p.cx + p.facing * 14, fy = p.y + 12;
  for (let i = 0; i < 14; i++) {
    const life = 0.4 + Math.random() * 0.4;
    game.particles.push({ x: fx, y: fy + (Math.random() - 0.5) * 4, vx: p.facing * (60 + Math.random() * 140), vy: (Math.random() - 0.6) * 70,
      gravity: 40, life, maxLife: life, color: i % 3 ? '#cdbb9a' : '#efe6d2', w: 2, h: 2, grow: 5, alpha: 0.8 });
  }
  p.vx = -p.facing * 70;
  game.shake = Math.max(game.shake, 1.5);
  playSfx('sneeze', fx, fy);
}

// Poeirinha que sobe do joelho de trás a cada passo engatinhando
function crawlDust(p) {
  const kx = p.cx - p.facing * 10, ky = p.y + p.h - 1;
  for (let i = 0; i < 2; i++) {
    const life = 0.3 + Math.random() * 0.2;
    game.particles.push({ x: kx + (Math.random() - 0.5) * 6, y: ky, vx: -p.facing * (10 + Math.random() * 20), vy: -10 - Math.random() * 15,
      gravity: 20, life, maxLife: life, color: '#b8a888', w: 2, h: 2, grow: 3, alpha: 0.6 });
  }
}

// ---------- Parado em pé: gags bobas ----------
// Depois de uns segundos sem fazer nada, o personagem faz uma gracinha sorteada (nunca a mesma duas
// vezes seguidas): dancinha com notas musicais, bocejo com espreguiçada, coçada no bumbum ou cochilo
// em pé com "Zzz" que termina num susto. Qualquer movimento, clique ou dano interrompe na hora.
const IDLE_GAGS = { dance: 3.4, yawn: 2.3, scratch: 2.1, doze: 6 }; // duração de cada uma (s)
const IDLE_GAG_WAIT = [5, 9];                                         // espera parado até a próxima (s)

Player.prototype.updateIdleGag = function (dt, pressing) {
  const busy = pressing || this.crouching || this.swimming || this.climbing || !this.onGround || Math.abs(this.vx) > 5 ||
    this.invulnerable > 0 || input.mouse.left || input.mouse.right || game.sword?.active || game.toolAction ||
    game.trident?.anim || game.bow?.charging || game.mount || game.inventoryUI?.open;
  if (busy) { this.gag = null; this.gagWait = IDLE_GAG_WAIT[0]; return; }
  if (this.gag) {
    const g = this.gag;
    g.t += dt;
    idleGagEffects(this, g, dt);
    if (g.t >= g.dur) { this.gag = null; this.gagWait = IDLE_GAG_WAIT[0] + Math.random() * (IDLE_GAG_WAIT[1] - IDLE_GAG_WAIT[0]); }
    return;
  }
  this.gagWait = (this.gagWait ?? IDLE_GAG_WAIT[0]) - dt;
  if (this.gagWait > 0) return;
  const kinds = Object.keys(IDLE_GAGS).filter((k) => k !== this.lastGag);
  const kind = kinds[Math.floor(Math.random() * kinds.length)];
  this.gag = { kind, t: 0, dur: IDLE_GAGS[kind], fx: 0, done: false };
  this.lastGag = kind;
  if (kind === 'yawn') playSfx('yawn', this.cx, this.y + 8);
  if (kind === 'scratch') playSfx('scratch', this.cx - this.facing * 6, this.y + 30);
};

// Partículas e sons que acompanham cada gag
function idleGagEffects(p, g, dt) {
  const head = { x: p.cx + p.facing * 4, y: p.y + 2 };
  g.fx -= dt;
  if (g.kind === 'dance' && g.fx <= 0) {
    g.fx = 0.38;
    glyphParticle('note', head.x + p.facing * 6 + (Math.random() - 0.5) * 10, head.y, ['#ffd86a', '#8fe0ff', '#ff9ec7'][Math.floor(Math.random() * 3)]);
    playSfx('danceNote', p.cx, p.cy);
  } else if (g.kind === 'scratch' && g.fx <= 0) {
    g.fx = 0.5;
    playSfx('scratch', p.cx - p.facing * 6, p.y + 30);
  } else if (g.kind === 'doze') {
    const waking = g.t / g.dur > 0.88;
    if (!waking && g.fx <= 0) {
      g.fx = 1.1;
      glyphParticle('z', head.x + p.facing * 5, head.y - 2, '#e8f0ff');
      playSfx('snore', p.cx, p.cy);
    } else if (waking && !g.done) {
      g.done = true;
      glyphParticle('!', head.x, head.y - 6, '#ffe07a', 0.9);
      playSfx('snort', p.cx, p.cy);
    }
  }
}

// Partícula com desenho em pixel (nota musical, Z de sono, ponto de exclamação) que sobe balançando
function glyphParticle(glyph, x, y, color, life = 1.4) {
  game.particles.push({ glyph, x, y, vx: (Math.random() - 0.5) * 14, vy: -22 - Math.random() * 10, gravity: 0, life, maxLife: life, color, wobble: Math.random() * 6 });
}
