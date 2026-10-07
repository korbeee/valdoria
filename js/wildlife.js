'use strict';

// Cada bioma tem uma espécie tranquila e um predador; os limites são compartilhados.
// Tamanhos (w, h) em px do mundo, comparados com o porco (20 x 15).
const WILDLIFE = {
  rabbit: {name:'Coelho', biome:BIOME.FOREST, hp:6, speed:38, w:12, h:10, drop:ITEM.MEAT, color:'#bda486', shape:'rabbit'},
  wolf: {name:'Lobo', biome:BIOME.FOREST, hostile:true, hp:18, speed:82, damage:7, w:28, h:18, drop:ITEM.LEATHER, color:'#777f87', shape:'wolf'},
  tortoise: {name:'Jabuti', biome:BIOME.DESERT, hp:16, speed:18, w:18, h:11, drop:ITEM.LEATHER, color:'#bd9758', shape:'tortoise'},
  scorpion: {name:'Escorpião', biome:BIOME.DESERT, hostile:true, hp:12, speed:48, damage:6, w:20, h:10, drop:ITEM.STINGER, color:'#ba7747', shape:'scorpion'},
  snowhare: {name:'Lebre da neve', biome:BIOME.SNOW, hp:8, speed:46, w:13, h:11, drop:ITEM.MEAT, color:'#e2e9eb', shape:'rabbit'},
  frostwolf: {name:'Lobo da tundra', biome:BIOME.SNOW, hostile:true, hp:22, speed:75, damage:8, w:30, h:19, drop:ITEM.LEATHER, color:'#b2c7d2', shape:'wolf'},
  bird: {name:'Ave da selva', biome:BIOME.JUNGLE, hp:7, speed:42, w:12, h:10, drop:ITEM.EGG, color:'#64b46d', shape:'bird'},
  spider: {name:'Aranha da selva', biome:BIOME.JUNGLE, hostile:true, hp:14, speed:65, damage:6, w:20, h:10, drop:ITEM.SILK, color:'#885275', shape:'spider'},
  // Savana (js/savanna.js): elefante dá para selar e montar; o tigre é um chefe único que dorme no covil
  elephant: {name:'Elefante', biome:BIOME.SAVANNA, hp:90, speed:30, w:64, h:46, drops:[[ITEM.LEATHER,4,7],[ITEM.MEAT,3,5],[ITEM.IVORY,1,2]], color:'#8e9098', shape:'elephant', heavy:true},
  hyena: {name:'Hiena', biome:BIOME.SAVANNA, hostile:true, hp:16, speed:88, damage:7, w:26, h:17, drop:ITEM.BONE, color:'#b09a6e', shape:'wolf'},
  tiger: {name:'Tigre da Savana, Dente de Âmbar', biome:BIOME.SAVANNA, hostile:true, unique:true, hp:220, speed:110, damage:12, w:64, h:38, drops:[[ITEM.TIGER_TOOTH,1,2],[ITEM.TIGER_CLAW,3,5],[ITEM.TIGER_HEART,1,1],[ITEM.MEAT,3,5]], color:'#e08a2c', shape:'tiger'},
};

// Ganchos por forma de bicho (criaturas e chefes novos se registram aqui, em vez de mais um "if"):
// setup(m), update(m, dt, w, p), hit(m, dano, deX), paint(s, pal, quadro), outline (null = sem
// contorno automático), frame(m), draw(ctx, m), defeated(g, m), goHome(g, m)
const SHAPE_HOOKS = {};

const WOLF_SIGHT = 7;   // blocos: a partir daqui o lobo percebe o jogador
const WOLF_FORGET = 20; // blocos: longe assim ele desiste e volta a ficar distraído
const DROP_WANDER = 3;  // blocos de queda que o bicho encara passeando
const DROP_CHASE = 8;   // ...e caçando o jogador (senão ele trava na beirada do morro)

// Quantos blocos de queda tem logo à frente: 0 = chão no mesmo nível, 99 = abismo
function dropAhead(w, m, dir) {
  const ahead = Math.floor((m.cx + dir * (m.w / 2 + 8)) / T);
  const feet = Math.floor((m.y + m.h - 0.5) / T); // linha de tiles onde os pés estão
  for (let d = 1; d <= DROP_CHASE + 1; d++) if (w.isSolid(ahead, feet + d)) return d - 1;
  return 99;
}

// true quando dá para seguir em frente sem cair num buraco fundo demais
function safeStep(w, m, dir, chasing) {
  return dropAhead(w, m, dir) <= (chasing ? DROP_CHASE : DROP_WANDER);
}

function wildlifePool(w, tx, hostile) {
  // O Vale das Cerejeiras tem fauna própria (js/sakura-fauna.js), não a da floresta
  const biome = w.biomeAt(tx);
  // `biomes: [..]` deixa a mesma espécie morar em mais de um bioma (js/fauna-species.js)
  const pool = Object.keys(WILDLIFE).filter(k => (WILDLIFE[k].biome === biome || WILDLIFE[k].biomes?.includes(biome)) && !!WILDLIFE[k].hostile === hostile && !WILDLIFE[k].unique);
  if (!hostile && biome === BIOME.FOREST) pool.push('pig');
  return pool;
}

// Ave nova: às vezes dorme num ninho no alto de uma árvore; senão já nasce voando
function placeBird(w, b, x) {
  if (Math.random() < 0.45) {
    for (let dx = 0; dx < 24; dx++) for (const tx of [x + dx, x - dx]) {
      if (tx < 1 || tx >= w.w - 1) continue;
      const s = w.surface[tx];
      if (w.getTile(tx, s - 1) !== TILE.TRUNK) continue;
      let top = s - 1;
      while (w.getTile(tx, top - 1) === TILE.TRUNK) top--;
      if (w.getTile(tx, top - 1) === TILE.STUMP) continue; // toco não tem galho para ninho
      b.nest = { x: tx * T + T / 2, y: top * T - 8 };
      b.sleeping = true;
      b.x = b.nest.x - b.w / 2; b.y = b.nest.y - b.h + 1;
      return;
    }
  }
  b.alt = 5 + Math.random() * 5;
  b.y = (w.groundTop(x) - b.alt) * T;
}

class Wildlife extends Pig {
  constructor(kind,x,y) {
    super(x,y); this.kind=kind; this.def=WILDLIFE[kind];
    Object.assign(this,{w:this.def.w,h:this.def.h,hp:this.def.hp,hostile:!!this.def.hostile,clock:Math.random()*5,gait:0,jumpWait:0,flap:Math.random()*8});
    if (this.def.shape === 'wolf') { this.aware = false; this.pose = null; this.poseTimer = 0; }
    if (this.def.shape === 'tiger') setupTiger(this);
    if (this.def.shape === 'bear') setupBear(this);
    SHAPE_HOOKS[this.def.shape]?.setup?.(this);
  }

  hit(damage, fromX) {
    if (this.carcass) return;
    if (this.def.shape === 'tiger') { tigerHit(this, damage, fromX); return; }
    if (this.def.shape === 'bear') { bearHit(this, damage, fromX); return; }
    if (this.def.shape === 'fiandeira') { fiandeiraHit(this, damage, fromX); return; }
    if (this.def.shape === 'cascoferro') { cascoFerroHit(this, damage, fromX); return; }
    if (SHAPE_HOOKS[this.def.shape]?.hit) { SHAPE_HOOKS[this.def.shape].hit(this, damage, fromX); return; }
    super.hit(damage, fromX);
    if (this.def.heavy) { this.vx = Math.sign(this.vx) * 50; this.vy = -60; } // bicho pesado quase não é empurrado
    if (this.saddled) this.fleeTimer = 0; // domado não foge
  }

  update(dt,w,p) {
    if (this.def.aquatic) { updateAquatic(this, dt, w, p); return; } // peixes, águas-vivas, tubarões (js/aquatic.js)
    if (this.def.shape === 'tiger') { updateTiger(this, dt, w, p); return; }
    if (this.def.shape === 'bear') { updateBear(this, dt, w, p); return; }
    if (this.def.shape === 'fiandeira') { updateFiandeira(this, dt, w, p); return; }
    if (this.def.shape === 'cascoferro') { updateCascoFerro(this, dt, w, p); return; }
    if (SHAPE_HOOKS[this.def.shape]?.update) { SHAPE_HOOKS[this.def.shape].update(this, dt, w, p); return; }
    if (this.def.shape === 'elephant' && updateElephant(this, dt, w, p)) return;
    if (this.def.shape === 'bird') { this.updateBird(dt, w, p); return; }
    if (this.def.shape === 'wolf') { this.updateWolf(dt, w, p); return; }
    this.clock+=dt; this.hurtTimer=Math.max(0,this.hurtTimer-dt); this.fleeTimer=Math.max(0,this.fleeTimer-dt);
    this.thinkTimer-=dt; this.jumpWait-=dt;
    const dx=p.cx-this.cx, dy=p.cy-this.cy;
    const chasing = this.hostile && Math.hypot(dx,dy)<18*T;
    // Grito de quando avista o jogador — só quem tem um som 'Alert' próprio (raposa-kitsune)
    if(chasing!==!!this.aware){this.aware=chasing;if(chasing&&SFX[MOB_SFX[this.kind]+'Alert'])mobSfx(this,'Alert');}
    if(chasing) this.dir=Math.sign(dx);
    else if(this.fleeTimer>0) this.dir=-Math.sign(dx);
    else if(this.thinkTimer<=0) {this.dir=Math.random()<.4?0:Math.random()<.5?-1:1;this.thinkTimer=1+Math.random()*3;}
    // Evita abismo, mas caçando (ou fugindo) desce morros bem mais fundos
    if(this.onGround && this.dir && !safeStep(w,this,this.dir,chasing||this.fleeTimer>0)) this.dir=0;
    if(this.hurtTimer<=0) this.vx=this.dir*this.def.speed*(this.fleeTimer>0?1.8:1);
    if(this.dir) this.facing=this.dir;
    // Coelhos e lebres andam aos pulinhos
    if(this.def.shape==='rabbit' && this.dir && this.onGround && this.jumpWait<=0) {this.vy=-190;this.jumpWait=.55;}
    const oldX=this.x, wanted=this.vx;
    this.applyGravity(dt); this.moveX(this.vx*dt,w);
    if(wanted && this.vx===0 && this.onGround) this.vy=-300;
    this.moveY(this.vy*dt,w); this.gait+=Math.abs(this.x-oldX)/(this.def.shape==='wolf'?4:3);this.anim=this.gait;this.settleStep(dt);
  }

  // Lobo: distraído até o jogador chegar perto (passeia devagar, senta e uiva); ao ver, rosna e ataca.
  updateWolf(dt, w, p) {
    this.clock += dt; this.hurtTimer = Math.max(0, this.hurtTimer - dt); this.thinkTimer -= dt;
    const dx = p.cx - this.cx, dist = Math.hypot(dx, p.cy - this.cy);
    if (!this.aware && (dist < WOLF_SIGHT * T || this.hurtTimer > 0)) {
      this.aware = true; this.pose = null;
      playSfx('wolfAlert', this.cx, this.cy);
    } else if (this.aware && dist > WOLF_FORGET * T) this.aware = false;

    if (this.aware) this.dir = Math.sign(dx);
    else if (this.pose) {
      this.dir = 0;
      if ((this.poseTimer -= dt) <= 0) { this.pose = null; this.thinkTimer = 0.5; }
    } else if (this.thinkTimer <= 0) {
      const r = Math.random();
      if (r < 0.2) { this.pose = 'howl'; this.poseTimer = 2.6; this.dir = 0; playSfx('wolfHowl', this.cx, this.cy); }
      else if (r < 0.45) { this.pose = 'sit'; this.poseTimer = 3 + Math.random() * 4; this.dir = 0; }
      else this.dir = r < 0.6 ? 0 : Math.random() < 0.5 ? -1 : 1;
      this.thinkTimer = 2 + Math.random() * 3;
    }
    // Caçando ele desce o morro atrás do jogador; distraído só anda em chão seguro
    if (this.onGround && this.dir && !safeStep(w, this, this.dir, this.aware)) this.dir = 0;
    if (this.hurtTimer <= 0) this.vx = this.dir * this.def.speed * (this.aware ? 1 : 0.3);
    if (this.dir) this.facing = this.dir;
    const oldX = this.x, wanted = this.vx;
    this.applyGravity(dt); this.moveX(this.vx * dt, w);
    if (wanted && this.vx === 0 && this.onGround) this.vy = -300;
    this.moveY(this.vy * dt, w); this.gait += Math.abs(this.x - oldX) / 4; this.anim = this.gait; this.settleStep(dt);
  }

  // Voa numa altura em volta de 4–10 blocos acima do chão, foge do jogador e desvia de paredes
  updateBird(dt, w, p) {
    this.clock += dt; this.hurtTimer = Math.max(0, this.hurtTimer - dt); this.fleeTimer = Math.max(0, this.fleeTimer - dt); this.thinkTimer -= dt;
    const dx = p.cx - this.cx, dist = Math.hypot(dx, p.cy - this.cy);
    if (this.sleeping) {
      if (dist < 3.5 * T || this.hurtTimer > 0) { this.sleeping = false; this.fleeTimer = 5; this.vy = -150; this.dir = dx > 0 ? -1 : 1; }
      else { this.vx = this.vy = 0; return; }
    }
    if (this.fleeTimer > 0) this.dir = dx > 0 ? -1 : 1;
    else if (this.thinkTimer <= 0 || !this.dir) { this.dir = Math.random() < 0.5 ? -1 : 1; this.alt = 4 + Math.random() * 6; this.thinkTimer = 2 + Math.random() * 4; }
    const tx = clamp(Math.floor(this.cx / T), 0, w.w - 1);
    const targetY = (w.groundTop(tx) - (this.alt ?? 6) - (this.fleeTimer > 0 ? 4 : 0)) * T;
    if (this.hurtTimer <= 0) {
      const speed = this.def.speed * (this.fleeTimer > 0 ? 2.4 : 1.4);
      this.vx += (this.dir * speed - this.vx) * Math.min(1, dt * 3);
      this.vy += (clamp((targetY - this.y) * 1.2, -90, 90) + Math.sin(this.clock * 4) * 14 - this.vy) * Math.min(1, dt * 2.5);
    } else this.vy += 300 * dt; // atingido: perde altura
    const oldX = this.x;
    this.moveX(this.vx * dt, w);
    if (Math.abs(this.x - oldX) < Math.abs(this.vx * dt) * 0.5) { this.dir = -this.dir; this.vx = 0; }
    this.moveY(this.vy * dt, w);
    if (this.onGround) this.vy = -120; // encostou no chão: decola de novo
    if (Math.abs(this.vx) > 2) this.facing = this.vx > 0 ? 1 : -1;
    this.flap += dt * (this.vy < -10 ? 18 : 11);
    this.anim = this.flap;
  }
}
