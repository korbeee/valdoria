'use strict';

// =====================================================================================
//  ÁGUA: escorre e se nivela, dá para nadar (e se afogar) e é desenhada por cima de tudo
// =====================================================================================
// world.water guarda o nível de cada célula: 0 = seca, 1..WATER_MAX = quanto da altura do tile
// está cheio, WATER_FALL = cachoeira (cheia e permanente: não escorre, não seca e não vaza).
// Só as células em world.waterActive são simuladas; água parada não custa nada. Quem acorda a
// água é o World.setTile (quebrar ou colocar bloco do lado dela).

const WATER_MAX = 16, WATER_FALL = 17;
const WATER_STEP = 1 / 30;   // a água anda 30 vezes por segundo
const WATER_BUDGET = 6000;   // células simuladas por passo (o resto fica para o próximo)
const BREATH_MAX = 10;       // segundos de fôlego embaixo d'água
const DROWN_DAMAGE = 8;      // vida perdida a cada segundo sem ar
// Nado: velocidade = fração da caminhada; up/dive/sink em px/s; leap = pulo para sair da água;
// current = empurrão para baixo dentro da cachoeira
const SWIM = { speed: 0.55, up: 150, dive: 170, float: 28, leap: 400, current: 700 };

// ---------- Consulta ----------
World.prototype.waterLevel = function (x, y) {
  if (!this.inBounds(x, y)) return 0;
  const v = this.water[y * this.w + x];
  return v > WATER_MAX ? WATER_MAX : v;
};
World.prototype.hasWater = function (x, y) { return this.inBounds(x, y) && this.water[y * this.w + x] > 0; };
World.prototype.isWaterfall = function (x, y) { return this.inBounds(x, y) && this.water[y * this.w + x] === WATER_FALL; };

// O ponto (px do mundo) está embaixo da superfície da água?
World.prototype.waterAtPx = function (px, py) {
  const tx = Math.floor(px / T), ty = Math.floor(py / T), L = this.waterLevel(tx, ty);
  return L > 0 && py >= (ty + 1) * T - (L * T) / WATER_MAX;
};

// Altura (px) da superfície da água da coluna acima da célula (tx, ty), ou null se não tem água ali
World.prototype.waterSurfacePx = function (tx, ty) {
  if (!this.hasWater(tx, ty)) return null;
  while (ty > 0 && this.hasWater(tx, ty - 1)) ty--;
  return (ty + 1) * T - (this.waterLevel(tx, ty) * T) / WATER_MAX;
};

// Parte do corpo (0..1) que está dentro da água, medida na coluna do centro
function bodySubmersion(world, b) {
  const tx = Math.floor(b.cx / T), y0 = b.y, y1 = b.y + b.h;
  let wet = 0;
  for (let ty = Math.floor(y0 / T); ty <= Math.floor((y1 - 0.001) / T); ty++) {
    const L = world.waterLevel(tx, ty);
    if (!L) continue;
    const top = (ty + 1) * T - (L * T) / WATER_MAX, bottom = (ty + 1) * T;
    wet += Math.max(0, Math.min(bottom, y1) - Math.max(top, y0));
  }
  return wet / b.h;
}

// ---------- Simulação ----------
World.prototype.wakeWater = function (x, y) {
  const { w, water, waterActive } = this;
  for (let k = 0; k < 5; k++) {
    const nx = x + (k === 1 ? -1 : k === 2 ? 1 : 0), ny = y + (k === 3 ? -1 : k === 4 ? 1 : 0);
    if (!this.inBounds(nx, ny)) continue;
    const i = ny * w + nx, v = water[i];
    if (v > 0 && v <= WATER_MAX) waterActive.add(i);
  }
};

World.prototype.clearWater = function (x, y) {
  const { w, water } = this;
  let i = y * w + x;
  const fall = water[i] === WATER_FALL;
  water[i] = 0;
  // Cachoeira cortada por um bloco: o resto dela, para baixo, some junto
  if (fall) for (i += w; i < water.length && water[i] === WATER_FALL; i += w) water[i] = 0;
  this.waterLightDirty = true;
};

// Um passo. Cada célula ativa:
//   1. cai o que couber na de baixo;
//   2. se está apoiada (chão ou água cheia embaixo), junta o trecho apoiado da fileira em volta
//      e divide a água igualmente entre todos: a superfície fica plana de verdade, sem degraus.
//      A frente molhada avança uma célula seca por passo (~30 blocos/s);
//   3. na ponta do trecho, se o vizinho está sobre um vão, a água derrama por ali (vertedouro).
// O quanto passa de uma célula para a outra vira correnteza (waterFlow) que empurra quem nada.
const WATER_RUN = 96;        // alcance do nivelamento para cada lado, em células
const WATER_PUDDLE = 2;      // espessura mínima de uma poça que ainda se espalha (níveis)
const WATER_FRONT = 8;       // o máximo que uma célula seca recebe no passo em que a água chega
const WATER_WEIR = 1.5;      // vazão da borda por nível de profundidade da lâmina (níveis por passo)
const WATER_JUMP = 6;        // lâmina mais funda que isso sai da borda com impulso (cai mais longe)

World.prototype.stepWater = function (fluid = null) {
  const { w, h, tiles } = this;
  const water=fluid?.levels||this.water,waterActive=fluid?.active||this.waterActive;
  const flow = fluid?.flow||(this.waterFlow ??= new Map());
  const blocked = fluid?.blocked||((j)=>SOLID[tiles[j]]||tiles[j]===TILE.LAVA);
  for (const [i, f] of flow) { const v = f * 0.7; if (Math.abs(v) < 0.05) flow.delete(i); else flow.set(i, v); }
  if (!waterActive.size) return;
  const list = [...waterActive];
  waterActive.clear();
  // De baixo para cima: a água de cima encontra o espaço já livre
  list.sort((a, b) => b - a);
  if (list.length > WATER_BUDGET) {
    for (let k = WATER_BUDGET; k < list.length; k++) waterActive.add(list[k]);
    list.length = WATER_BUDGET;
  }
  const wake = (i) => { const v = water[i]; if (v > 0 && v <= WATER_MAX) waterActive.add(i); };
  const wakeAround = (i) => {
    const x = i % w;
    wake(i); if (i >= w) wake(i - w); if (i + w < water.length) wake(i + w);
    if (x > 0) wake(i - 1); if (x < w - 1) wake(i + 1);
  };
  const changed = (i, v) => {
    if (water[i] === v) return;
    water[i] = v; this.waterLightDirty = true; wakeAround(i);
    fluid?.changed(i,v);
    if (!fluid && v === 0 && tiles[i] === TILE.LILYPAD) this.onLilypadDry?.(i % w, (i / w) | 0);
  };
  const open = (j) => !blocked(j) && water[j] <= WATER_MAX;
  const resting = (j) => j + w >= water.length || blocked(j + w) || water[j + w] >= WATER_MAX;
  const push = (i, f) => flow.set(i, (flow.get(i) || 0) + f);
  const done = new Set(), run = [];

  for (const i of list) {
    if (done.has(i)) continue;
    let L = water[i];
    if (L === 0 || L > WATER_MAX) continue;
    if (blocked(i)) { changed(i,0); continue; }
    const x = i % w, below = i + w;
    // 1. Cai
    if (below < water.length && !blocked(below) && water[below] < WATER_MAX) {
      const m = Math.min(L, WATER_MAX - water[below]);
      changed(below, water[below] + m); L -= m;
      changed(i, L);
      if (L === 0) continue;
    }
    // 2. Trecho apoiado da fileira: para cada lado até parede, vão ou (incluindo) a 1ª célula seca
    run.length = 0;
    let l = i, r = i, drainL = -1, drainR = -1;
    for (let n = 1; n <= WATER_RUN && x - n >= 0; n++) {
      const j = i - n;
      if (!open(j)) break;
      if (!resting(j)) { drainL = j; break; }
      l = j;
      if (water[j] === 0) break;
    }
    for (let n = 1; n <= WATER_RUN && x + n < w; n++) {
      const j = i + n;
      if (!open(j)) break;
      if (!resting(j)) { drainR = j; break; }
      r = j;
      if (water[j] === 0) break;
    }
    let total = 0;
    for (let j = l; j <= r; j++) total += water[j];
    // Pouca água não cobre as células secas das pontas: a poça para de se espalhar
    if (water[l] === 0 && l !== i && total < (r - l + 1) * WATER_PUDDLE) l++;
    if (water[r] === 0 && r !== i && total < (r - l + 1) * WATER_PUDDLE) r--;
    for (let j = l; j <= r; j++) { run.push(j); done.add(j); }
    const n = run.length;
    const onGround = (j) => j + w >= water.length || blocked(j + w);
    if (!fluid && n === 1 && total === 1 && drainL < 0 && drainR < 0 && onGround(i)) { changed(i, 0); continue; } // película no chão evapora
    // 3. Vertedouro: a lâmina inteira alimenta a borda, e passa mais água quanto mais funda ela é.
    //    Com muita vazão a água sai com impulso e cai também nas colunas seguintes (cortina larga).
    const pour = [];
    const sides = [[l, drainL, -1], [r, drainR, 1]].filter(([, d]) => d >= 0);
    let poured = 0, pouredL = 0;
    for (const [, d, dir] of sides) {
      let want = Math.min(total - poured, Math.max(1, Math.round((total / n) * WATER_WEIR / sides.length)));
      for (let k = 0, c = d; k < 3 && want > 0; k++, c += dir) {
        const cx = c % w;
        if (k && (cx < 0 || cx >= w || Math.abs(cx - (d % w)) !== k || !open(c) || resting(c))) break;
        const m = Math.min(want, WATER_MAX - water[c] - (pour.find((q) => q[0] === c)?.[1] || 0));
        if (m > 0) { pour.push([c, m]); want -= m; poured += m; if (dir < 0) pouredL += m; }
        if (k === 0 && total / n < WATER_JUMP) break;        // pouca água só escorre pela borda
      }
    }
    total -= poured;
    // A célula seca da frente que corre sobre o chão recebe no máximo meio bloco: é a língua fina
    // na frente da água. A fileira de cima só avança quando a de baixo enche, então a frente sai
    // em rampa (e não como uma parede de água andando)
    const dry = run.filter((j) => water[j] === 0 && onGround(j));
    const front = dry.length ? Math.min(WATER_FRONT, Math.floor(total / n)) : 0;
    const wet = n - dry.length, left = total - front * dry.length, base = Math.floor(left / wet);
    // O resto vai para quem já tem mais (fica parado de um passo para o outro, sem tremer)
    const rest = left - base * wet;
    const extra = rest ? run.filter((j) => !dry.includes(j)).sort((a, b) => water[b] - water[a] || a - b).slice(0, rest) : [];
    let carry = -pouredL;                              // água que atravessa a borda direita de cada célula
    for (const j of run) {
      const v = dry.includes(j) ? front : base + (extra.includes(j) ? 1 : 0);
      carry += water[j] - v;
      if (carry) push(j, carry);
      changed(j, v);
    }
    for (const [c, m] of pour) changed(c, water[c] + m);
    // Lâmina fina sobre o chão vira poça que seca devagar (dryPuddles)
    if (!fluid && base <= WATER_PUDDLE) for (const j of run) if (water[j] && onGround(j)) (this.puddles ??= new Set()).add(j);
  }
};

// Poças finas (até WATER_PUDDLE níveis) no chão, sem água em cima, perdem um nível de vez em
// quando: o rastro que a água deixa nos degraus some em uns 10 s
World.prototype.dryPuddles = function () {
  const { w, water, tiles, puddles } = this;
  if (!puddles?.size) return;
  for (const j of puddles) {
    const v = water[j], ground = j + w >= water.length || SOLID[tiles[j + w]];
    if (!v || v > WATER_PUDDLE || !ground || (j >= w && water[j - w])) { puddles.delete(j); continue; }
    if (Math.random() > 0.2) continue;
    water[j] = v - 1;
    this.waterLightDirty = true;
    this.wakeWater(j % w, (j / w) | 0);
    if (!water[j]) { puddles.delete(j); if (tiles[j] === TILE.LILYPAD) this.onLilypadDry?.(j % w, (j / w) | 0); }
  }
};

// Planta aquática só pode ir para dentro da água: vitória-régia na superfície,
// alga e coral no fundo (alga também em cima de outra alga)
function canPlaceAquatic(world, tx, ty, tile) {
  if (!world.hasWater(tx, ty) || world.isWaterfall(tx, ty)) return false;
  if (TILE_DEFS[tile].aquatico === 'superficie') return !world.hasWater(tx, ty - 1);
  const below = world.getTile(tx, ty + 1);
  return world.isSolid(tx, ty + 1) || (tile === TILE.SEAWEED && below === TILE.SEAWEED);
}

// Tirou o apoio de uma alga: a coluna inteira acima dela sai junto
function breakSeaweedAbove(game, tx, ty) {
  const w = game.world;
  if (w.isSolid(tx, ty) || w.getTile(tx, ty) === TILE.SEAWEED) return;
  for (let y = ty - 1; w.getTile(tx, y) === TILE.SEAWEED; y--) {
    spawnBreakBurst(tx, y, TILE.SEAWEED, 0.5);
    giveItem(ITEM.SEAWEED);
    w.setTile(tx, y, TILE.AIR);
  }
}

// Vitória-régia que ficou sem água solta o item no chão
World.prototype.onLilypadDry = function (x, y) {
  this.setTile(x, y, TILE.AIR);
  if (typeof game !== 'undefined' && game.world === this) dropItem(game, ITEM.LILYPAD, 1, (x + 0.5) * T, (y + 0.5) * T);
};

// Garrafa de ar (botão direito): fôlego cheio de novo
function useAirBottle(game) {
  const p = game.player;
  if ((p.breath ?? BREATH_MAX) >= BREATH_MAX) { toast('Seu fôlego já está cheio.'); return; }
  p.breath = BREATH_MAX;
  game.inventory.takeFromSlot(game.selected);
  for (let i = 0; i < 6; i++) bubble(game, p.cx + (Math.random() - 0.5) * 8, p.y + 8);
  playSfx('bubble', p.cx, p.y + 8);
  toast('Fôlego renovado!');
}

// ---------- Nado ----------
// Chamado pelo Player.update. Devolve true quando o jogador está nadando (e já se moveu).
function updateSwimming(p, dt, input, world) {
  const lavaSub=typeof lavaSubmersion==='function'?lavaSubmersion(world,p):0;
  p.inLavaSwimming=lavaSub>bodySubmersion(world,p)&&lavaSub>0;
  if(p.inLavaSwimming)world=lavaWaterView(world);
  const sub = bodySubmersion(world, p), was = !!p.swimming;
  p.submersion = sub;
  p.swimming = !game.adminFly && (sub > 0.42 || (was && sub > 0.25));
  if (!p.swimming) return false;
  p.setCrouch(false, world);

  const held = game.inventory.slots[game.selected], boost = ITEM_DEFS[held?.item]?.natacao || 1;
  const left = input.down('KeyA') || input.down('ArrowLeft'), right = input.down('KeyD') || input.down('ArrowRight');
  const jump = input.down('Space') || input.down('KeyW') || input.down('ArrowUp');
  const down = input.down('KeyS') || input.down('ArrowDown');
  const dir = (right ? 1 : 0) - (left ? 1 : 0);

  const top = WALK_SPEED * SWIM.speed * boost;
  if (dir) {
    p.vx = clamp(p.vx + dir * 900 * dt, -Math.max(top, Math.abs(p.vx)), Math.max(top, Math.abs(p.vx)));
    if (!p.lockFacing) p.facing = dir;
  } else p.vx *= Math.exp(-4 * dt);
  if (Math.abs(p.vx) > top) p.vx = Math.sign(p.vx) * Math.max(top, Math.abs(p.vx) * Math.exp(-6 * dt)); // entrou correndo: freia

  // Cabeça fora d'água + pulo = salta para fora (dá para subir na margem)
  const headOut = !world.waterAtPx(p.cx, p.y + 4);
  const k = (rate) => Math.min(1, dt * rate);
  if (p.vy > 200) p.vy *= Math.exp(-10 * dt); // mergulho de cima freia na água
  if (jump && headOut) { p.vy = -SWIM.leap; p.jumpAge = 0; }
  else if (jump) p.vy += (-SWIM.up * boost - p.vy) * k(5);
  else if (down) p.vy += (SWIM.dive * boost - p.vy) * k(5);
  else {
    // Parado, o corpo boia: com a cabeça de fora fica balançando na linha d'água; mais fundo, sobe devagar
    const sub = p.submersion, bob = Math.sin((game.clock || 0) * 2.4) * 10;
    const target = headOut ? (sub > 0.66 ? -30 : sub < 0.5 ? 45 : 0) + bob : -SWIM.float;
    p.vy += (target - p.vy) * k(2.5);
  }
  if (world.isWaterfall(Math.floor(p.cx / T), Math.floor(p.cy / T))) p.vy = Math.min(p.vy + SWIM.current * dt, 320);

  const oldX = p.x;
  p.moveX(p.vx * dt, world);
  p.moveY(p.vy * dt, world);
  if (p.onGround) p.anim += (Math.abs(p.x - oldX) * 12) / 30;
  p.swimStroking = !!(dir || jump || down);
  // Braçada mais rápida quanto mais rápido nada (o tridente acelera o ritmo junto)
  p.swimAnim = (p.swimAnim || 0) + dt * (p.swimStroking ? 7 + Math.hypot(p.vx, p.vy) * 0.03 : 3);
  return true;
}

// Bichos (menos o jogador) boiam: afundam só até a metade e saltam para a margem quando esbarram nela
const bodyGravity = Body.prototype.applyGravity;
Body.prototype.applyGravity = function (dt, g = GRAVITY) {
  const world = typeof game !== 'undefined' ? game.world : null;
  if (this instanceof Player || !world) return bodyGravity.call(this, dt, g);
  const sub = Math.max(bodySubmersion(world, this),typeof lavaSubmersion==='function'?lavaSubmersion(world,this):0);
  if (sub <= 0.2) return bodyGravity.call(this, dt, g);
  this.vy += (g * 0.25 - sub * 900) * dt;
  this.vy = clamp(this.vy * Math.exp(-3 * dt), -140, 120);
  if (this.vx && this.collides(world, this.x + Math.sign(this.vx) * 2, this.y)) this.vy = -280;
};

// ---------- Fôlego, respingos e bolhas ----------
function updateWater(game, dt) {
  const world = game.world, p = game.player;
  game.waterAcc = Math.min(0.2, (game.waterAcc || 0) + dt);
  while (game.waterAcc >= WATER_STEP) { game.waterAcc -= WATER_STEP; world.stepWater(); }
  if ((game.puddleTimer = (game.puddleTimer ?? 1) - dt) <= 0) { game.puddleTimer = 1; world.dryPuddles(); }
  // A luz acompanha a água que escorre, mas no máximo 3 vezes por segundo
  game.waterLightTimer = Math.max(0, (game.waterLightTimer || 0) - dt);
  if (world.waterLightDirty && game.waterLightTimer <= 0) { world.lightDirty = true; world.waterLightDirty = false; game.waterLightTimer = 0.3; }

  // Respingo ao cair na água (e uma nuvem de bolhas quando mergulha de cima)
  const inWater = bodySubmersion(world, p) > 0.15;
  if (inWater && !game.wasInWater && Math.abs(p.vy) > 140) {
    splashAt(game, p.cx, Math.floor(p.cy / T), Math.min(1.8, Math.abs(p.vy) / 420));
    for (let i = 0; i < 8; i++) bubble(game, p.cx + (Math.random() - 0.5) * 12, p.y + p.h * (0.4 + Math.random() * 0.6));
  }
  // Saiu da água: pinga por um tempo e deixa uma ondinha na superfície
  if (!inWater && game.wasInWater) {
    p.dripTimer = 1.4;
    const s = world.waterSurfacePx(Math.floor(p.cx / T), Math.floor((p.y + p.h + 4) / T));
    if (s != null) addRipple(game, p.cx, s, 18);
  }
  game.wasInWater = inWater;
  updateSwimPose(game, dt);

  // Fôlego: acaba em BREATH_MAX segundos com a cabeça embaixo d'água, depois a vida vai caindo
  p.breath ??= BREATH_MAX;
  p.underwater = !game.adminFly && world.waterAtPx(p.cx, p.y + 6);
  if (p.underwater) {
    p.breath = Math.max(0, p.breath - dt);
    if ((game.bubbleTimer = (game.bubbleTimer ?? 0) - dt) <= 0) {
      game.bubbleTimer = 0.35 + Math.random() * 0.5;
      bubble(game, p.cx + p.facing * 4, p.y + 8);
      if (Math.random() < 0.3) playSfx('bubble', p.cx, p.y + 8);
    }
    if (p.breath <= 0 && (p.drownTimer = (p.drownTimer ?? 1) - dt) <= 0) {
      p.drownTimer = 1;
      toast('Sem ar! Suba para respirar.');
      damageMonsterPlayer(game, DROWN_DAMAGE, p.cx, { pierce: true, death: 'Você se afogou! Voltou ao início.' });
    }
    if (p.swimming && Math.abs(p.vx) + Math.abs(p.vy) > 60 && (game.strokeTimer = (game.strokeTimer ?? 0) - dt) <= 0) {
      game.strokeTimer = 0.55;
      playSfx('swim', p.cx, p.cy, { vol: 0.6 });
    }
  } else {
    p.breath = Math.min(BREATH_MAX, p.breath + dt * 4);
    p.drownTimer = 1;
    // Nadando na superfície: marolinha e som de braçada
    if (p.swimming && Math.abs(p.vx) > 40 && (game.strokeTimer = (game.strokeTimer ?? 0) - dt) <= 0) {
      game.strokeTimer = 0.45;
      playSfx('swim', p.cx, p.cy, { vol: 0.8 });
      const s = world.waterSurfacePx(Math.floor(p.cx / T), Math.floor(p.cy / T));
      if (s != null) for (let i = 0; i < 3; i++) waterParticle(game, p.cx - p.facing * 6, s, -p.facing * (20 + Math.random() * 40), -40 - Math.random() * 60, 0.4);
    }
  }
  // Bolhas estouram na superfície
  for (const q of game.particles) if (q.bubble && !world.waterAtPx(q.x, q.y)) q.life = 0;
  updateWaterCurrents(game, dt);
  updateWaterWaves(game, dt); // molas da superfície, chuva e bichos caindo (js/water-waves.js)
  updateWaterfallFoam(game, dt);
}

// ---------- Correnteza ----------
// stepWater anota em world.waterFlow quanto passou de cada célula para a da direita (níveis por
// passo; negativo = para a esquerda). Água escorrendo arrasta quem está dentro dela.
function waterCurrentAt(world, px, py0, py1) {
  const flow = world.waterFlow;
  if (!flow?.size) return 0;
  const tx = Math.floor(px / T);
  let f = 0;
  for (let ty = Math.floor(py0 / T); ty <= Math.floor(py1 / T); ty++) for (let dx = -1; dx <= 1; dx++) {
    const v = flow.get(ty * world.w + tx + dx);
    if (v && Math.abs(v) > Math.abs(f)) f = v;
  }
  return clamp(f * 18, -160, 160);          // px/s
}
function updateWaterCurrents(game, dt) {
  const world = game.world;
  if (!world.waterFlow?.size) return;
  const drag = (b, sub) => {
    const c = waterCurrentAt(world, b.cx, b.y, b.y + b.h);
    if (c) b.moveX(c * dt * clamp(sub * 1.4, 0, 1), world);
  };
  const p = game.player;
  if (!game.adminFly && p.submersion > 0.2) drag(p, p.submersion);
  for (const m of game.mobs) if (!m.dead && !m.def?.aquatic) { const sub = bodySubmersion(world, m); if (sub > 0.2) drag(m, sub); }
}

function waterParticle(game, x, y, vx, vy, life) {
  game.particles.push({ x, y, vx, vy, life, maxLife: life, color: game.lavaFluid?(Math.random()<.5?'#fff18a':'#ff7026'):(Math.random() < 0.5 ? '#dff4ff' : '#9fd4f2'), w: Math.random() < 0.5 ? 1 : 2, h: 1 + (Math.random() * 2 | 0) });
}

function bubble(game, x, y) {
  const life = 1.5 + Math.random();
  game.particles.push({ x, y, vx: (Math.random() - 0.5) * 12, vy: -25 - Math.random() * 15, gravity: -30, life, maxLife: life, bubble: true, color: 'rgba(220,245,255,0.85)', w: Math.random() < 0.6 ? 2 : 1, h: 2 });
}

// Inclinação do corpo nadando (0 = em pé, PI/2 = deitado na direção do nado, até ~135° mergulhando).
// Segue a direção que o jogador quer nadar; parado, golpeando ou usando ferramenta, fica em pé.
// Muda suave, então entrar, boiar, nadar e sair da água viram uma transição contínua.
function updateSwimPose(game, dt) {
  const p = game.player;
  const busy = game.sword?.active || game.trident?.anim || game.toolAction || game.bow?.charging;
  let target = 0;
  if (p.swimming && !p.onGround && !busy && p.swimStroking) {
    const ix = (input.down('KeyD') || input.down('ArrowRight') ? 1 : 0) - (input.down('KeyA') || input.down('ArrowLeft') ? 1 : 0);
    const iy = (input.down('KeyS') || input.down('ArrowDown') ? 1 : 0) - (input.down('Space') || input.down('KeyW') || input.down('ArrowUp') ? 1 : 0);
    target = clamp(Math.atan2(Math.abs(ix), -iy), 0, 2.35);
  }
  p.swimTilt = (p.swimTilt || 0) + (target - (p.swimTilt || 0)) * Math.min(1, dt * (target ? 7 : 9));
  if (Math.abs(p.swimTilt) < 0.005) p.swimTilt = 0;
  // Pingando depois de sair da água
  if (p.dripTimer > 0) {
    p.dripTimer -= dt;
    if (!p.swimming && Math.random() < dt * 14 * p.dripTimer) {
      const life = 0.4 + Math.random() * 0.3;
      game.particles.push({ x: p.x + Math.random() * p.w, y: p.y + 8 + Math.random() * (p.h - 12), vx: p.vx * 0.2, vy: 10, life, maxLife: life, color: '#9fd4f2', w: 1, h: 2 });
    }
  }
  // Boiando com a cabeça de fora: ondinhas em volta
  if (p.swimming && !p.underwater && (game.treadRipple = (game.treadRipple ?? 0) - dt) <= 0) {
    game.treadRipple = p.swimStroking ? 0.35 : 0.8;
    const s = game.world.waterSurfacePx(Math.floor(p.cx / T), Math.floor((p.y + 14) / T));
    if (s != null) addRipple(game, p.cx - p.vx * 0.05, s, p.swimStroking ? 14 : 10);
  }
}

// Ondinhas achatadas na superfície (jogador boiando, saindo da água, pé das cachoeiras)
function addRipple(game, x, y, r) {
  const list = (game.ripples ??= []);
  list.push({ x, y, r, t: 0, life: 0.9 });
  if (list.length > 30) list.shift();
}

// Respingo na superfície da coluna (tx, perto da linha ty)
function splashAt(game, x, ty, power = 1) {
  const s = game.world.waterSurfacePx(Math.floor(x / T), ty) ?? game.world.waterSurfacePx(Math.floor(x / T), ty + 1);
  if (s == null) return;
  waterImpact(game, x, s, power); // onda, coroa, coluna e som (js/water-waves.js)
}

// Espuma, névoa, ondinhas e barulho no pé das cachoeiras que estão na tela
function updateWaterfallFoam(game, dt) {
  const world = game.world, { vw, vh } = viewSize();
  const x0 = Math.max(0, Math.floor(game.cam.x / T) - 2), x1 = Math.min(world.w - 1, Math.ceil((game.cam.x + vw) / T) + 2);
  const y0 = Math.max(0, Math.floor(game.cam.y / T) - 2), y1 = Math.min(world.h - 2, Math.ceil((game.cam.y + vh) / T) + 2);
  const mist = (game.fallMist ??= []);
  game.fallSoundTimer = (game.fallSoundTimer ?? 0) - dt;
  let loudest = null;
  for (let x = x0; x <= x1; x++)
    for (let y = y0; y <= y1; y++) {
      const i = y * world.w + x, v = world.water[i];
      // Começo de uma queda: a água sai da borda e cai em arco (js/water-waves.js)
      if (v > 0 && v <= WATER_MAX && waterFalling(world, i) && !(i >= world.w && waterFalling(world, i - world.w))) pourWater(game, world, x, y, dt);
      if (v > 0 && v <= WATER_MAX && waterFalling(world, i) && !waterFalling(world, i + world.w)) {
        // Pé da queda (a água despejada cuida das ondinhas quando chega): só bolhas e o som
        const b = i + world.w, into = world.water[b] > 0 && !SOLID[world.tiles[b]];
        if (!into && !SOLID[world.tiles[b]]) continue;                    // falha no meio da coluna
        const fx = (x + 0.2 + Math.random() * 0.6) * T, fy = into ? (y + 2) * T - (world.water[b] * T) / WATER_MAX : (y + 1) * T;
        const k = v / WATER_MAX;
        if (into && Math.random() < dt * 4 * k) bubble(game, fx, fy + 4 + Math.random() * 8);
        const d = Math.abs(fx - game.player.cx) + Math.abs(fy - game.player.cy) + (k < 0.4 ? 60 : 0);
        if (!loudest || d < loudest.d) loudest = { x: fx, y: fy, d };
        continue;
      }
      if (v !== WATER_FALL || world.water[i + world.w] === WATER_FALL) continue;
      // (x, y) é o pé da cachoeira: a água dela bate na superfície logo abaixo
      const fx = (x + Math.random()) * T, fy = (y + 1) * T;
      if (Math.random() < dt * 22) waterParticle(game, fx, fy - 1, (Math.random() - 0.5) * 80, -50 - Math.random() * 90, 0.3 + Math.random() * 0.3);
      if (Math.random() < dt * 4) bubble(game, fx, fy + 6 + Math.random() * 10);
      if (Math.random() < dt * 6 && mist.length < 60)
        mist.push({ x: fx, y: fy - 3, vx: (Math.random() - 0.5) * 16, vy: -6 - Math.random() * 10, r: 3 + Math.random() * 3, grow: 9 + Math.random() * 8, t: 0, life: 1.3 + Math.random() * 0.8 });
      if (Math.random() < dt * 2.2) addRipple(game, (x + 0.5) * T + (Math.random() - 0.5) * 10, fy, 12 + Math.random() * 8);
      const d = Math.abs(fx - game.player.cx) + Math.abs(fy - game.player.cy);
      if (!loudest || d < loudest.d) loudest = { x: fx, y: fy, d };
    }
  if (loudest && game.fallSoundTimer <= 0) { game.fallSoundTimer = 0.42; playSfx('waterfall', loudest.x, loudest.y); }
  for (let i = mist.length - 1; i >= 0; i--) {
    const m = mist[i];
    if ((m.t += dt) >= m.life) { mist.splice(i, 1); continue; }
    m.x += m.vx * dt; m.y += m.vy * dt; m.vx *= Math.exp(-dt);
  }
  const ripples = game.ripples || [];
  for (let i = ripples.length - 1; i >= 0; i--) if ((ripples[i].t += dt) >= ripples[i].life) ripples.splice(i, 1);
  if (game.particles.length > 400) game.particles.splice(0, game.particles.length - 400);
}

// ---------- Desenho ----------
// Cores por profundidade (quantas células de água há acima), prontas como texto de fillStyle
const WATER_SHADES = { river: [], ocean: [] };
for (let d = 0; d < 32; d++) {
  const k = d / 31, a = Math.min(0.78, 0.4 + d * 0.016).toFixed(3);
  const mix = (a0, b0) => a0.map((v, i) => Math.round(lerp(v, b0[i], k)));
  WATER_SHADES.river.push(`rgba(${mix([64, 150, 214], [18, 60, 120]).join(',')},${a})`);
  WATER_SHADES.ocean.push(`rgba(${mix([52, 160, 200], [10, 48, 104]).join(',')},${a})`);
}

// Algas e corais: atrás do jogador (chamado logo depois dos blocos)
function drawAquaticFlora(ctx, game, vx, vy, vw, vh) {
  const world = game.world, { w, h, tiles } = world;
  const x0 = Math.max(0, Math.floor(vx / T) - 1), x1 = Math.min(w - 1, Math.floor((vx + vw) / T) + 1);
  const y0 = Math.max(0, Math.floor(vy / T) - 1), y1 = Math.min(h - 1, Math.floor((vy + vh) / T) + 1);
  const now = performance.now() / 1000;
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const t = tiles[y * w + x];
      if (t === TILE.SEAWEED) drawSeaweed(ctx, world, x, y, now);
      else if (t >= TILE.CORAL_BRANCH && t <= TILE.CORAL_BRAIN) ctx.drawImage(coralSprite(t, Math.floor(hash2(x, y, 321) * CORAL_PALETTES.length)), x * T, y * T);
    }
}

// Alga: duas fitas que balançam mais quanto mais longe do pé da coluna
function drawSeaweed(ctx, world, x, y, now) {
  let base = y;
  while (base - y < 12 && world.getTile(x, base + 1) === TILE.SEAWEED) base++;
  const top = world.getTile(x, y - 1) !== TILE.SEAWEED, kelp = world.biomeAt(x) === BIOME.OCEAN;
  const cols = kelp ? ['#3f6e2e', '#77a846', '#2f5a2a'] : ['#2f7d45', '#5fbf6a', '#25603a'];
  for (let py = 0; py < T; py += 2) {
    const gy = y * T + py, lift = (base + 1) * T - gy, amp = Math.min(3.5, lift * 0.06);
    const o1 = Math.round(Math.sin(now * 1.7 + gy * 0.11 + x * 1.3) * amp);
    const o2 = Math.round(Math.sin(now * 1.5 + gy * 0.13 + x * 2.1 + 1.7) * amp);
    if (!top || py >= 2) {
      ctx.fillStyle = cols[0]; ctx.fillRect(x * T + 4 + o1, gy, 2, 2);
      ctx.fillStyle = cols[1]; ctx.fillRect(x * T + 5 + o1, gy, 1, 2);
      if ((py + x * 2) % 6 === 0) { ctx.fillStyle = cols[1]; ctx.fillRect(x * T + 2 + o1, gy, 2, 1); }
    }
    if (!top || py >= 6) {
      ctx.fillStyle = cols[2]; ctx.fillRect(x * T + 10 + o2, gy, 2, 2);
      ctx.fillStyle = cols[1]; ctx.fillRect(x * T + 10 + o2, gy, 1, 2);
      if ((py + x * 2) % 6 === 2) { ctx.fillStyle = cols[0]; ctx.fillRect(x * T + 12 + o2, gy, 2, 1); }
    }
  }
}

const coralSprites = new Map();
function coralSprite(tile, pal) {
  const key = tile * 16 + pal;
  let c = coralSprites.get(key);
  if (c) return c;
  const tex = paintArt(new Tex(T, T), CORAL_PALETTES[pal], CORAL_PIXELS[tile], T, T, TILE_DEFS[tile].name);
  const img = new ImageData(tex.d, T, T);
  outlinePass(img, [30, 22, 40]);
  c = makeCanvas(T, T);
  c.getContext('2d').putImageData(img, 0, 0);
  coralSprites.set(key, c);
  return c;
}

let lilypadSprites = null;
function lilypadSprite(flower) {
  if (!lilypadSprites) {
    const cores = { g: [34, 96, 44], G: [80, 168, 70], L: [120, 200, 96], p: [240, 150, 190], P: [255, 214, 232], y: [255, 220, 90] };
    const pad = ['...gggggggggg...', '.ggGGLGGGGGGGgg.', 'gGGGGGGGGG.GGGGg', '.ggGGGGGGG..Ggg.', '...gggggggg.gg..'];
    const flower = ['......pPp.......', '.....pPyPp......', '......pPp.......'];
    lilypadSprites = [false, true].map((f) => {
      const tex = new Tex(T, 8);
      paintArt(tex, cores, [...(f ? flower : ['................', '................', '................']), ...pad], T, 8, 'Vitória-régia');
      return tex.toCanvas();
    });
  }
  return lilypadSprites[flower ? 1 : 0];
}

// Cor da lâmina da cachoeira: o mesmo azul da água rasa, só um pouco mais opaco e claro
const FALL_SHEET = 'rgba(92,170,226,0.74)';

// Cachoeira na mesma linha, até 4 células para o lado: { dir, dist } (dir = para onde a água corre)
function fallNear(water, i, x, w) {
  for (let k = 1; k <= 4; k++) {
    if (x + k < w && water[i + k] === WATER_FALL) return { dir: 1, dist: k };
    if (x - k >= 0 && water[i - k] === WATER_FALL) return { dir: -1, dist: k };
  }
  return null;
}

// A água desta célula está caindo solta? Só para o desenho. Precisa ter embaixo espaço aberto quase
// vazio e, além disso, ar de um dos lados, nada em cima (começo da queda) ou outra queda em cima
// (o filete continuando). Assim uma fileira meio vazia no meio de um lago escoando não vira filete.
function waterDropping(world, i) {
  const { w, water, tiles } = world, b = i + w;
  return b < water.length && water[i] > 0 && water[i] <= WATER_MAX && !SOLID[tiles[b]] && water[b] < WATER_MAX / 2;
}
function waterFalling(world, i) {
  if (!waterDropping(world, i)) return false;
  const { w, water, tiles } = world, x = i % w, air = (j) => !SOLID[tiles[j]] && !water[j];
  if ((x > 0 && air(i - 1)) || (x < w - 1 && air(i + 1))) return true;
  return i < w || !water[i - w] || waterDropping(world, i - w);
}
// Filete na mesma fileira, até 3 células para o lado: a superfície corre para a borda dele
function streamNear(world, i, x) {
  for (let k = 1; k <= 3; k++) {
    if (x + k < world.w && waterFalling(world, i + k) && !waterFalling(world, i + k - world.w)) return { dir: 1, dist: k };
    if (x - k >= 0 && waterFalling(world, i - k) && !waterFalling(world, i - k - world.w)) return { dir: -1, dist: k };
    if (SOLID[world.tiles[i + k]] && SOLID[world.tiles[i - k]]) break;
  }
  return null;
}

// Topo da superfície em fatias (altura em px a partir do fundo da célula), inclinado até a
// média com cada vizinho: a lâmina afina onde acaba e desce suave de um degrau para o outro.
// null = plano (desenha num retângulo só).
const _slope = [];
function waterSlopeSlices(world, x, y, v) {
  const { w, water, tiles } = world, i = y * w + x, hC = (v * T) / WATER_MAX;
  const edgeH = (s) => {
    const nx = x + s;
    if (nx < 0 || nx >= w) return hC;
    const j = i + s;
    if (SOLID[tiles[j]] || water[j] === WATER_FALL) return hC;          // parede: encosta reto
    if (!water[j]) return 0;                                             // seco: a lâmina acaba fina
    if (waterFalling(world, j)) return hC;                               // borda de onde sai o filete
    const above = j - w;
    if (above >= 0 && water[above] && !waterFalling(world, above)) return T; // vizinho mais fundo
    return (water[j] * T) / WATER_MAX;
  };
  const hl = (hC + edgeH(-1)) / 2, hr = (hC + edgeH(1)) / 2;
  if (Math.abs(hl - hC) < 0.75 && Math.abs(hr - hC) < 0.75) return null;
  for (let k = 0; k < WAVE.per; k++) {
    const u = (k + 0.5) / WAVE.per;
    _slope[k] = Math.round(u < 0.5 ? lerp(hl, hC, u * 2) : lerp(hC, hr, (u - 0.5) * 2));
  }
  return _slope;
}

// Água por cima do jogador e dos bichos (translúcida), cachoeiras, vitórias-régias, névoa e ondinhas
function drawWater(ctx, game, vx, vy, vw, vh) {
  const world = game.world, { w, h, water, tiles } = world;
  const x0 = Math.max(0, Math.floor(vx / T) - 1), x1 = Math.min(w - 1, Math.floor((vx + vw) / T) + 1);
  const y0 = Math.max(0, Math.floor(vy / T) - 1), y1 = Math.min(h - 1, Math.floor((vy + vh) / T) + 1);
  const now = performance.now() / 1000;
  const pads = [];
  for (let x = x0; x <= x1; x++) {
    const shades = world.biomeAt(x) === BIOME.OCEAN ? WATER_SHADES.ocean : WATER_SHADES.river;
    // Profundidade = células de água acima (um bloco no meio, como o convés de um navio, não zera)
    let depth = 0;
    for (let y = y0 - 1, n = 0; y >= 0 && n < 40; y--, n++) {
      const j = y * w + x;
      if (water[j]) depth++;
      else if (!SOLID[tiles[j]]) break;
    }
    for (let y = y0; y <= y1; y++) {
      const i = y * w + x, v = water[i];
      if (!v) { if (!SOLID[tiles[i]]) depth = 0; continue; }
      if (v === WATER_FALL) { drawFallCell(ctx, world, x, y, now, shades); depth = 0; continue; }
      // Água em queda livre: um filete contínuo, não uma caixa pela metade
      // Água em queda livre não vira bloco: quem aparece é a água despejada em arco
      // (porções de água voando, js/water-waves.js)
      if (waterFalling(world, i)) { depth = 0; continue; }
      // (com um filete caindo em cima ela continua sendo superfície: a célula não está cheia)
      const surface = y === 0 || ((!water[i - w] || waterFalling(world, i - w)) && !SOLID[tiles[i - w]]);
      const flow = surface ? fallNear(water, i, x, w) || streamNear(world, i, x) : null;
      // Com água em cima a célula é desenhada cheia: o corpo d'água fica contínuo, sem frestas
      let top = surface ? (y + 1) * T - Math.round((v * T) / WATER_MAX) : y * T;
      let wob = 0;
      // Ondas na superfície; perto da borda da cachoeira a água fica lisa e corre para ela
      if (surface && v === WATER_MAX) {
        const calm = flow ? (flow.dist - 1) / 4 : 1;
        wob = Math.round((Math.sin(now * 2.2 + x * 0.8) * 0.9 + Math.sin(now * 1.3 + x * 0.35)) * calm);
        top += wob;
      }
      ctx.fillStyle = shades[Math.min(31, depth)];
      // Superfície em fatias de 2 px: a onda de cada mola (js/water-waves.js) e o topo inclinado
      // entre vizinhos de nível diferente (a lâmina afina na ponta em vez de acabar num degrau)
      const waves = surface ? waterWaveSlices(game, x, y) : null;
      const slope = surface ? waterSlopeSlices(world, x, y, v) : null;
      const sliced = waves || slope, sw = T / WAVE.per;
      const sliceTop = (k) => (slope ? (y + 1) * T - slope[k] + wob : top) + (waves ? waves[k] : 0);
      if (sliced) for (let k = 0; k < WAVE.per; k++) { const t = sliceTop(k); if (t < (y + 1) * T) ctx.fillRect(x * T + k * sw, t, sw, (y + 1) * T - t); }
      else ctx.fillRect(x * T, top, T, (y + 1) * T - top);
      if (surface) {
        const sun = GAME_OPTIONS.shaders && !game.adminNightVision
          ? shaderExposureAt(renderer,x,y) * game.daylight * (1-(game.weather?.rain||0)*.8) : 0;
        const edge = lerpColor([214,240,255], RENDER_STYLE.sun.color, sun*.65);
        ctx.fillStyle = `rgba(${edge.join(",")},0.6)`;
        if (sliced) for (let k = 0; k < WAVE.per; k++) { const t = sliceTop(k); if (t < (y + 1) * T) ctx.fillRect(x * T + k * sw, t, sw, 1); }
        else ctx.fillRect(x * T, top, T, 1);
        if (flow) {
          // Correnteza puxando para a queda: traços claros andando na direção dela, mais fortes perto
          const a = 0.6 * (1 - (flow.dist - 1) / 4);
          ctx.fillStyle = `rgba(232,248,255,${a.toFixed(2)})`;
          for (let j = 0; j < 3; j++) {
            let pos = (now * (26 + j * 9) + j * 5.3 + x * 7) % T;
            if (flow.dir < 0) pos = T - 1 - pos;
            ctx.fillRect(Math.round(x * T + pos - (flow.dir > 0 ? 3 : 0)), top + 1 + j * 2, 3 + (j === 0 ? 1 : 0), 1);
          }
        } else {
          // Brilhos que correm pela superfície
          const glint = hash2(x, Math.floor(now * 1.5 + x * 0.37), 97);
          if (glint < 0.18) { ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fillRect(x * T + Math.floor(glint * 60), top + 2, 3, 1); }
        }
        if (tiles[i] === TILE.LILYPAD) pads.push([x, top]);
      }
      depth++;
    }
  }
  for (const [x, top] of pads) {
    const bob = Math.round(Math.sin(now * 1.8 + x) * 0.6);
    ctx.drawImage(lilypadSprite(hash2(x, 0, 555) < 0.35), x * T, top - 5 + bob);
  }
  // Ondinhas achatadas na superfície
  ctx.strokeStyle = '#e4f6ff'; ctx.lineWidth = 1;
  for (const r of game.ripples || []) {
    const k = r.t / r.life, rad = r.r * (0.3 + 0.7 * easeOutCubic(k));
    ctx.globalAlpha = (1 - k) * 0.7;
    ctx.beginPath(); ctx.ellipse(r.x, r.y, rad, Math.max(1, rad * 0.18), 0, 0, Math.PI * 2); ctx.stroke();
  }
  drawRainRings(ctx, game);     // gotas de chuva na água
  drawSplashColumns(ctx, game); // coluna do tchibum
  // Névoa subindo do pé das cachoeiras
  ctx.fillStyle = '#e8f6ff';
  for (const m of game.fallMist || []) {
    const k = m.t / m.life;
    ctx.globalAlpha = Math.sin(k * Math.PI) * 0.14;
    ctx.beginPath(); ctx.arc(m.x, m.y, m.r + m.grow * k, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// Cachoeira: lâmina de água com faixas descendo em velocidades diferentes (contínuas de uma célula
// para a outra, sem repetir por bloco), bordas levemente mais escuras e, no pé, espuma se agitando.
// No topo ela continua a água de onde vem: mesma cor no alto, a superfície dobra numa curva na borda
// de fora e a correnteza horizontal vira queda.
function drawFallCell(ctx, world, x, y, now, shades) {
  const px = x * T, py = y * T;
  const topCell = !world.isWaterfall(x, y - 1), foot = !world.isWaterfall(x, y + 1);
  const srcL = world.hasWater(x - 1, y) && !world.isWaterfall(x - 1, y), srcR = world.hasWater(x + 1, y) && !world.isWaterfall(x + 1, y);
  const src = topCell ? (srcL ? -1 : srcR ? 1 : 0) : 0; // lado de onde vem a água
  let streakTop = py;
  if (topCell && src) {
    const inner = src < 0 ? px : px + T, outer = src < 0 ? px + T : px, dir = -src;
    const g = ctx.createLinearGradient(0, py, 0, py + T);
    g.addColorStop(0, shades[0]); g.addColorStop(1, FALL_SHEET);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(inner, py);
    ctx.lineTo(outer - dir * 7, py);
    ctx.quadraticCurveTo(outer, py, outer, py + 8);
    ctx.lineTo(outer, py + T); ctx.lineTo(inner, py + T);
    ctx.closePath(); ctx.fill();
    // A linha clara da superfície continua e dobra junto com a água
    ctx.strokeStyle = 'rgba(214,240,255,0.65)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(inner, py + 0.5); ctx.lineTo(outer - dir * 7, py + 0.5);
    ctx.quadraticCurveTo(outer - dir * 0.5, py + 0.5, outer - dir * 0.5, py + 8); ctx.stroke();
    // Correnteza passando pela dobra: traços andando para a borda e virando para baixo
    ctx.fillStyle = 'rgba(236,249,255,0.75)';
    for (let j = 0; j < 3; j++) {
      const u = (now * 1.6 + j / 3) % 1;
      const qx = u < 0.6 ? lerp(inner, outer - dir * 5, u / 0.6) : outer - dir * lerp(5, 2, (u - 0.6) / 0.4);
      const qy = u < 0.6 ? py + 2 + j : py + 2 + j + ((u - 0.6) / 0.4) * 9;
      ctx.fillRect(Math.round(qx) - (u < 0.6 ? 1 : 0), Math.round(qy), u < 0.6 ? 3 : 1, u < 0.6 ? 1 : 3);
    }
    streakTop = py + 6;
  } else {
    ctx.fillStyle = FALL_SHEET;
    ctx.fillRect(px, py, T, T);
  }
  // Bordas um pouco mais escuras (a lâmina é mais fina nos lados)
  ctx.fillStyle = 'rgba(40,112,184,0.4)';
  ctx.fillRect(px, streakTop, 1, py + T - streakTop); ctx.fillRect(px + T - 1, streakTop, 1, py + T - streakTop);
  ctx.fillStyle = 'rgba(200,232,252,0.22)';
  ctx.fillRect(px + 5, streakTop, 2, py + T - streakTop); // brilho contínuo no meio da lâmina
  // Faixas descendo: cada uma com período próprio em px do mundo, então não se repetem por bloco
  for (let k = 0; k < 5; k++) {
    const sx = px + 2 + k * 3 - (k > 2 ? 1 : 0), period = 21 + ((hash2(x, k, 7) * 17) | 0);
    const speed = 150 + hash2(x, k, 47) * 110, len = 4 + ((hash2(x, k, 3) * 6) | 0);
    const wob = Math.round(Math.sin(now * 3 + k * 1.7 + x) * 0.6);
    ctx.fillStyle = k & 1 ? 'rgba(236,249,255,0.8)' : 'rgba(176,220,250,0.75)';
    let s0 = ((now * speed + hash2(x, k, 59) * period) % period) + Math.floor((py - period) / period) * period;
    for (; s0 < py + T; s0 += period) {
      const a = Math.max(streakTop, s0), b = Math.min(py + T, s0 + len);
      if (b > a) ctx.fillRect(sx + wob, a, 1, b - a);
    }
  }
  // Pé: água branca se agitando onde a queda bate
  if (foot) {
    const by = py + T;
    ctx.fillStyle = 'rgba(236,248,255,0.55)';
    ctx.fillRect(px - 5, by - 2, T + 10, 3);
    ctx.fillStyle = 'rgba(248,253,255,0.9)';
    for (let k = 0; k < 8; k++) {
      const ph = now * (7 + k) + k * 2.3, fx = px - 6 + k * 3.8 + Math.sin(ph) * 1.5;
      const fy = by - 3 - Math.abs(Math.sin(ph * 0.7)) * 3, sz = 2 + ((k + Math.floor(now * 6)) % 2);
      ctx.fillRect(Math.round(fx), Math.round(fy), sz, 2);
    }
  }
}

// Tela azulada quando a cabeça está embaixo d'água
function drawUnderwaterTint(ctx, game, W, H) {
  if (!game.player.underwater) return;
  ctx.fillStyle = 'rgba(20,80,140,0.16)';
  ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.7);
  g.addColorStop(0, 'rgba(8,30,70,0)');
  g.addColorStop(1, 'rgba(8,30,70,0.3)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

// Bolhas de fôlego embaixo da barra de vida (só aparecem quando falta ar)
function drawBreathBubbles(ctx, player) {
  const breath = player.breath ?? BREATH_MAX;
  if (breath >= BREATH_MAX) return;
  const n = Math.ceil(BREATH_MAX), full = breath;
  for (let k = 0; k < n; k++) {
    const x = 6 + k * 10, y = 20, left = full - k; // left > 1: cheia; 0..1: estourando
    if (left <= 0) continue;
    const r = left >= 1 ? 1 : left;
    ctx.fillStyle = UIC.outline; ctx.fillRect(x, y + 1, 8, 6); ctx.fillRect(x + 1, y, 6, 8);
    ctx.fillStyle = r < 1 ? '#9fcbe6' : '#63b7ee';
    ctx.fillRect(x + 1, y + 2, 6, 4); ctx.fillRect(x + 2, y + 1, 4, 6);
    ctx.fillStyle = '#e8f7ff'; ctx.fillRect(x + 2, y + 2, 2, 1); ctx.fillRect(x + 2, y + 3, 1, 1);
    if (r < 1) { ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect(x - 1, y + 3, 1, 1); ctx.fillRect(x + 8, y + 3, 1, 1); }
  }
}
