'use strict';

// =====================================================================================
//  VIDA AQUÁTICA: peixes de várias espécies, águas-vivas, tubarões e baiacus
// =====================================================================================
// Cada espécie é um bicho de WILDLIFE com `aquatic: true`: o Wildlife.update chama updateAquatic e o
// drawWildlife chama drawAquatic. Todos nadam só dentro da água (a caixa inteira precisa estar
// embaixo da superfície e fora dos blocos); fora dela se debatem e morrem aos poucos.
// Quem cria esses bichos é o updateAquaticSpawns, perto do jogador, só em água com espaço para eles.

// kind: nome, habitat ('mar' | 'rio' | 'caverna'), tamanho (w, h), vida, velocidade (px/s),
// jeito de nadar e aparência. peso = chance relativa entre as espécies do mesmo lugar.
const AQUATIC = {
  sardine:   { name: 'Sardinha', habitat: 'mar', w: 9, h: 4, hp: 2, speed: 62, style: 'school', group: [4, 7], peso: 3,
    look: { shape: 'slim', back: [58, 92, 128], body: [150, 176, 196], belly: [232, 238, 242], fin: [96, 124, 150], stripe: [210, 222, 232] } },
  clownfish: { name: 'Peixe-palhaço', habitat: 'mar', w: 9, h: 6, hp: 3, speed: 30, style: 'hover', peso: 2, perto: 'coral',
    look: { shape: 'round', back: [236, 88, 6], body: [255, 126, 18], belly: [255, 168, 70], fin: [36, 20, 14], bands: [255, 252, 246] } },
  tang:      { name: 'Cirurgião-azul', habitat: 'mar', w: 11, h: 8, hp: 4, speed: 44, style: 'wander', peso: 2,
    look: { shape: 'tall', back: [26, 60, 150], body: [54, 110, 214], belly: [110, 160, 236], fin: [20, 36, 90], tail: [250, 214, 60], mark: [16, 26, 60] } },
  angelfish: { name: 'Peixe-anjo', habitat: 'mar', w: 10, h: 12, hp: 4, speed: 22, style: 'glide', peso: 1.4,
    look: { shape: 'angel', back: [216, 190, 60], body: [246, 222, 96], belly: [252, 240, 170], fin: [230, 170, 40], vbands: [40, 36, 44] } },
  puffer:    { name: 'Baiacu', habitat: 'mar', w: 10, h: 8, hp: 5, speed: 22, style: 'puffer', peso: 1.2, dano: 3 },
  jellyfish: { name: 'Água-viva', habitat: 'mar', w: 10, h: 10, hp: 3, speed: 14, style: 'jelly', peso: 1.2, dano: 4, fundo: 5 },
  shark:     { name: 'Tubarão', habitat: 'mar', w: 44, h: 14, hp: 70, speed: 72, style: 'shark', peso: 0.35, dano: 14, fundo: 9, largura: 28, max: 1,
    drops: [[ITEM.RAW_FISH, 3, 5], [ITEM.LEATHER, 1, 2]] },
  trout:     { name: 'Truta', habitat: 'rio', w: 13, h: 5, hp: 4, speed: 46, style: 'wander', peso: 3,
    look: { shape: 'slim', back: [74, 96, 60], body: [134, 150, 104], belly: [220, 214, 176], fin: [90, 110, 70], spots: [60, 44, 36], stripe: [214, 128, 128] } },
  minnow:    { name: 'Lambari', habitat: 'rio', w: 7, h: 3, hp: 2, speed: 58, style: 'school', group: [3, 6], peso: 2.2,
    look: { shape: 'slim', back: [96, 110, 90], body: [190, 196, 180], belly: [238, 238, 226], fin: [220, 150, 60], stripe: [236, 236, 220] } },
  cavefish:  { name: 'Peixe-cego', habitat: 'caverna', w: 9, h: 4, hp: 3, speed: 26, style: 'wander', peso: 3, blind: true,
    look: { shape: 'slim', back: [200, 160, 170], body: [236, 200, 206], belly: [248, 232, 234], fin: [214, 170, 182] } },
  perch: { name: 'Perca', habitat: 'rio', w: 11, h: 7, hp: 4, speed: 35, style: 'hover', peso: 2, fishingBehavior: 'steady',
    look: { shape: 'round', back: [87, 112, 47], body: [172, 184, 79], belly: [236, 224, 137], fin: [208, 115, 52], vbands: [68, 87, 46] } },
  carp: { name: 'Carpa', habitat: 'rio', w: 18, h: 10, hp: 7, speed: 25, style: 'glide', peso: 1.4, fishingBehavior: 'heavy',
    look: { shape: 'round', back: [117, 85, 51], body: [184, 140, 78], belly: [237, 207, 144], fin: [139, 95, 57], spots: [134, 102, 61] } },
  catfish: { name: 'Bagre', habitat: 'rio', w: 20, h: 7, hp: 8, speed: 28, style: 'wander', peso: 1.2, fundo: 5, fishingBehavior: 'heavy',
    look: { shape: 'slim', back: [52, 68, 69], body: [104, 125, 116], belly: [194, 211, 175], fin: [69, 87, 82], whiskers: [207, 216, 178] } },
  salmon: { name: 'Salmão', habitat: 'rio', w: 18, h: 6, hp: 6, speed: 64, style: 'wander', peso: 1.3, fishingBehavior: 'dart',
    look: { shape: 'slim', back: [63, 111, 108], body: [137, 179, 162], belly: [231, 224, 196], fin: [126, 94, 86], stripe: [217, 118, 118], spots: [49, 72, 68] } },
  mackerel: { name: 'Cavala', habitat: 'mar', w: 16, h: 5, hp: 4, speed: 76, style: 'school', group: [2, 4], peso: 1.8, fishingBehavior: 'dart',
    look: { shape: 'slim', back: [30, 98, 132], body: [90, 159, 183], belly: [211, 234, 234], fin: [56, 114, 145], vbands: [35, 92, 119] } },
  snapper: { name: 'Pargo', habitat: 'mar', w: 16, h: 9, hp: 6, speed: 40, style: 'wander', peso: 1.5, fishingBehavior: 'heavy',
    look: { shape: 'round', back: [162, 51, 54], body: [223, 101, 91], belly: [255, 192, 151], fin: [184, 70, 67], stripe: [241, 151, 117] } },
  caveeel: { name: 'Enguia de caverna', habitat: 'caverna', w: 24, h: 4, hp: 6, speed: 46, style: 'glide', peso: 1.1, fishingBehavior: 'dart',
    look: { shape: 'slim', back: [70, 52, 99], body: [129, 97, 157], belly: [209, 189, 223], fin: [102, 76, 133], stripe: [167, 137, 192] } },
  glowtetra: { name: 'Tetra-luminoso', habitat: 'caverna', w: 8, h: 5, hp: 3, speed: 37, style: 'school', group: [2, 4], peso: 1.5, fishingBehavior: 'steady',
    look: { shape: 'slim', back: [36, 96, 98], body: [70, 171, 165], belly: [164, 239, 204], fin: [74, 136, 136], stripe: [208, 255, 152] } },
};
for (const [kind, a] of Object.entries(AQUATIC)) {
  WILDLIFE[kind] = {
    name: a.name, biome: a.habitat === 'mar' ? BIOME.OCEAN : BIOME.FOREST, hp: a.hp, speed: a.speed, w: a.w, h: a.h,
    drop: ITEM.RAW_FISH, drops: a.drops, color: '#4f8fc6', shape: 'aquatic', aquatic: true, spec: a,
  };
}
const AQUATIC_MAX = 12;      // bichos aquáticos perto do jogador ao mesmo tempo
const AQUATIC_RANGE = 70;    // tiles: mais longe que isso eles somem (e nascem outros)

// ---------- Onde dá para nadar ----------
// A caixa (x, y, w, h) inteira está embaixo da superfície e fora dos blocos?
function boxInWater(w, x, y, bw, bh) {
  const pts = [[x, y], [x + bw, y], [x, y + bh], [x + bw, y + bh], [x + bw / 2, y], [x + bw / 2, y + bh]];
  for (const [px, py] of pts) {
    if (!w.waterAtPx(px, py) || w.isSolid(Math.floor(px / T), Math.floor(py / T))) return false;
  }
  if (bw > T) for (let px = x + T; px < x + bw; px += T) if (!w.waterAtPx(px, y) || !w.waterAtPx(px, y + bh)) return false;
  return true;
}

// Anda (dx, dy) só se continuar inteiro na água; devolve quais eixos bateram
function swimStep(m, w, dx, dy) {
  let hitX = false, hitY = false;
  if (dx && boxInWater(w, m.x + dx, m.y, m.w, m.h)) m.x += dx; else if (dx) hitX = true;
  if (dy && boxInWater(w, m.x, m.y + dy, m.w, m.h)) m.y += dy; else if (dy) hitY = true;
  return { hitX, hitY };
}

// Fora d'água: cai, se debate no chão e, depois de um tempo, morre (vira peixe cru)
function flopOnLand(m, dt, w) {
  m.dryTime = (m.dryTime || 0) + dt;
  m.vy = Math.min(m.vy + GRAVITY * dt, MAX_FALL);
  if (m.onGround) {
    m.vx *= Math.exp(-5 * dt);
    if (Math.random() < dt * 2.5) { m.vy = -150 - Math.random() * 60; m.vx = (Math.random() - 0.5) * 90; playSfx('fishStep', m.cx, m.cy); }
  }
  m.moveX(m.vx * dt, w);
  m.moveY(m.vy * dt, w);
  if (m.dryTime > 12) { m.dryTime = 9; if (--m.hp <= 0) m.dead = true; }
  m.pitch = Math.sin(m.clock * 9) * 0.45;
}

// Encosta no jogador: machuca (água-viva queima, tubarão morde, baiacu espeta)
function touchPlayer(m, p, dmg) {
  if (p.invulnerable > 0 || !dmg) return false;
  if (p.x >= m.x + m.w || p.x + p.w <= m.x || p.y >= m.y + m.h || p.y + p.h <= m.y) return false;
  damageMonsterPlayer(game, dmg, m.cx);
  return true;
}

// ---------- Comportamento ----------
function updateAquatic(m, dt, w, p) {
  const a = m.def.spec;
  m.clock += dt; m.hurtTimer = Math.max(0, m.hurtTimer - dt); m.fleeTimer = Math.max(0, m.fleeTimer - dt); m.thinkTimer -= dt;
  m.home ??= { x: m.cx, y: m.cy };
  if (a.style === 'puffer') updatePuff(m, dt, w, p);
  if (!boxInWater(w, m.x, m.y, m.w, m.h) && !w.waterAtPx(m.cx, m.cy)) { flopOnLand(m, dt, w); return; }
  m.dryTime = 0;
  const dx = p.cx - m.cx, dy = p.cy - m.cy, dist = Math.hypot(dx, dy);
  const playerWet = w.waterAtPx(p.cx, p.cy);
  let tvx = 0, tvy = 0, turn = 3;

  if (a.style === 'jelly') {
    // Pulsa: o sino fecha e empurra para cima; entre um pulso e outro afunda devagar e deriva
    const period = 1.8, ph = (m.clock + (m.phase ??= Math.random() * period)) % period;
    if (ph < dt) { m.vy -= 34; m.vx += (Math.random() - 0.5) * 12; }
    m.vy = Math.min(m.vy + 16 * dt, 10);
    m.vx *= Math.exp(-0.8 * dt);
    m.pulse = ph / period;
    const hit = swimStep(m, w, m.vx * dt, m.vy * dt);
    if (hit.hitX) m.vx = -m.vx * 0.5;
    if (hit.hitY) m.vy = m.vy < 0 ? 12 : -18;
    touchPlayer(m, p, a.dano);
    return;
  }

  if (a.style === 'shark') {
    // Patrulha de um lado para o outro; vê o jogador na água por perto, persegue e morde, depois se afasta
    m.aggro = Math.max(0, (m.aggro || 0) - dt);
    if (m.hurtTimer > 0) m.aggro = 6; // apanhou: fica bravo em vez de fugir
    m.retreat = Math.max(0, (m.retreat || 0) - dt);
    const hunting = playerWet && dist < (m.aggro > 0 ? 18 : 11) * T && m.retreat <= 0;
    if (hunting) {
      const d = dist || 1;
      tvx = (dx / d) * a.speed * 1.35; tvy = (dy / d) * a.speed * 1.1;
      if (touchPlayer(m, p, a.dano)) { m.retreat = 1.6; m.dir = -Math.sign(dx) || 1; playSfx('sharkBite', m.cx, m.cy); }
    } else {
      if (m.thinkTimer <= 0 || !m.dir) { m.dir = m.dir ? (Math.random() < 0.25 ? -m.dir : m.dir) : (Math.random() < 0.5 ? -1 : 1); m.swimY = (Math.random() - 0.5) * 16; m.thinkTimer = 3 + Math.random() * 4; }
      tvx = m.dir * a.speed * (m.retreat > 0 ? 1.4 : 0.8); tvy = m.swimY || 0;
    }
    turn = 1.4; // pesado: muda de rumo devagar, sem trancos
  } else {
    // Peixes: fogem do jogador, e cada espécie tem seu jeito de nadar
    if (dist < 3.5 * T && m.fleeTimer <= 0 && a.style !== 'puffer') m.fleeTimer = 1 + Math.random() * 0.6;
    if (m.fleeTimer > 0) {
      m.dir = dx > 0 ? -1 : 1;
      tvx = m.dir * a.speed * 2.4; tvy = (dy > 0 ? -1 : 1) * a.speed * 0.5; turn = 6;
    } else if (a.style === 'school') {
      // Cardume: segue a direção média dos vizinhos da mesma espécie e não se afasta do grupo
      let n = 0, sx = 0, sy = 0, avx = 0, avy = 0;
      for (const o of game.mobs) {
        if (o === m || o.kind !== m.kind || Math.abs(o.cx - m.cx) > 48 || Math.abs(o.cy - m.cy) > 32) continue;
        n++; sx += o.cx; sy += o.cy; avx += o.vx; avy += o.vy;
      }
      if (m.thinkTimer <= 0) { m.dir = Math.random() < 0.5 ? -1 : 1; m.swimY = (Math.random() - 0.5) * 20; m.thinkTimer = 2 + Math.random() * 3; }
      tvx = m.dir * a.speed; tvy = m.swimY || 0;
      if (n) {
        tvx = lerp(tvx, avx / n, 0.6) + (sx / n - m.cx) * 0.8;
        tvy = lerp(tvy, avy / n, 0.6) + (sy / n - m.cy) * 0.8;
        if (Math.abs(tvx) < a.speed * 0.5) tvx = Math.sign(tvx || m.dir) * a.speed * 0.5;
      }
      // Arrancadas rápidas de vez em quando
      if (Math.random() < dt * 0.4) { m.vx += Math.sign(tvx || 1) * a.speed; }
    } else if (a.style === 'hover') {
      // Fica rondando a casa (o coral onde nasceu), em voltinhas
      const t = m.clock * 0.8;
      tvx = (m.home.x + Math.cos(t) * 14 - m.cx) * 1.5; tvy = (m.home.y + Math.sin(t * 1.3) * 6 - m.cy) * 1.5;
    } else if (a.style === 'glide') {
      // Plana devagar, subindo e descendo com calma
      if (m.thinkTimer <= 0) { m.dir = Math.random() < 0.5 ? -1 : 1; m.thinkTimer = 4 + Math.random() * 4; }
      tvx = m.dir * a.speed; tvy = Math.sin(m.clock * 0.9) * 8;
      turn = 1.5;
    } else {
      if (m.thinkTimer <= 0) {
        m.dir = Math.random() < 0.2 ? 0 : Math.random() < 0.5 ? -1 : 1;
        m.swimY = (Math.random() - 0.5) * a.speed * 0.6;
        m.thinkTimer = 1.5 + Math.random() * 3;
      }
      tvx = (m.dir || 0) * a.speed * (m.puff > 0.3 ? 0.2 : 1); tvy = (m.swimY || 0) + Math.sin(m.clock * 3) * 5;
    }
  }

  if (m.hurtTimer > 0) { m.vx *= Math.exp(-4 * dt); m.vy *= Math.exp(-4 * dt); }
  else { m.vx += (tvx - m.vx) * Math.min(1, dt * turn); m.vy += (tvy - m.vy) * Math.min(1, dt * turn); }
  const hit = swimStep(m, w, m.vx * dt, m.vy * dt);
  if (hit.hitX) { m.vx = -m.vx * 0.3; m.dir = -(m.dir || 1); m.home.x = m.cx; }
  if (hit.hitY) { m.vy = 0; m.swimY = -(m.swimY || 0); }
  if (Math.abs(m.vx) > 3) m.facing = m.vx > 0 ? 1 : -1;
  // Inclina o corpo um pouco na direção do movimento (subindo ou descendo)
  const pitch = clamp(Math.atan2(m.vy, Math.abs(m.vx) + 20), -0.5, 0.5);
  m.pitch = (m.pitch || 0) + (pitch - (m.pitch || 0)) * Math.min(1, dt * 5);
  m.tail = (m.tail || 0) + dt * (4 + Math.hypot(m.vx, m.vy) * 0.18);
  if (a.style === 'puffer' && m.puff > 0.5) touchPlayer(m, p, a.dano);
}

// Baiacu: incha quando o jogador chega perto (a caixa cresce em volta do centro) e desincha devagar
function updatePuff(m, dt, w, p) {
  const near = Math.hypot(p.cx - m.cx, p.cy - m.cy) < 3.5 * T;
  m.calm = near ? 1.6 : Math.max(0, (m.calm || 0) - dt);
  const want = m.calm > 0 ? 1 : 0, before = m.puff || 0;
  let puff = before + Math.sign(want - before) * dt * (want ? 3 : 0.9);
  puff = clamp(puff, 0, 1);
  if (puff === before) return;
  if (puff > before && before < 0.05) playSfx('bubble', m.cx, m.cy);
  const cx = m.cx, cy = m.cy, nw = Math.round(lerp(10, 16, puff)), nh = Math.round(lerp(8, 16, puff));
  // Só incha se couber na água
  if (puff > before && !boxInWater(w, cx - nw / 2, cy - nh / 2, nw, nh)) return;
  m.puff = puff; m.w = nw; m.h = nh; m.x = cx - nw / 2; m.y = cy - nh / 2;
}

// ---------- Nascimento ----------
// Mede a água em volta de (tx, ty): largura na linha, fundura da coluna e onde fica (mar, rio, caverna)
function waterRoom(w, tx, ty) {
  let l = tx, r = tx, top = ty, bot = ty;
  while (tx - l < 60 && w.hasWater(l - 1, ty) && !w.isWaterfall(l - 1, ty)) l--;
  while (r - tx < 60 && w.hasWater(r + 1, ty) && !w.isWaterfall(r + 1, ty)) r++;
  while (ty - top < 60 && w.hasWater(tx, top - 1)) top--;
  while (bot - ty < 60 && w.hasWater(tx, bot + 1)) bot++;
  const cave = top > w.surface[clamp(tx, 0, w.w - 1)] + 6 && !w.isSkyExposed(tx, top);
  const habitat = cave ? 'caverna' : w.biomeAt(tx) === BIOME.OCEAN ? 'mar' : 'rio';
  return { width: r - l + 1, depth: bot - top + 1, habitat, below: bot - ty, above: ty - top };
}

const coralNear = (w, tx, ty) => {
  for (let y = ty - 2; y <= ty + 6; y++) for (let x = tx - 5; x <= tx + 5; x++) { const t = w.getTile(x, y); if (t >= TILE.CORAL_BRANCH && t <= TILE.CORAL_BRAIN) return true; }
  return false;
};

function pickAquatic(w, tx, ty, room) {
  const options = [];
  for (const [kind, a] of Object.entries(AQUATIC)) {
    if(a.fishingTier)continue; // raros só são atraídos pelas iscas de pesca
    if (a.habitat !== room.habitat) continue;
    if (room.depth < (a.fundo || Math.ceil(a.h / T) + 2) || room.width < (a.largura || Math.ceil(a.w / T) + 4)) continue;
    if (a.max && game.mobs.filter((o) => o.kind === kind && !o.dead).length >= a.max) continue;
    let weight = a.peso;
    if (a.perto === 'coral') weight *= coralNear(w, tx, ty) ? 2 : 0.1;
    options.push([kind, weight]);
  }
  let total = options.reduce((s, o) => s + o[1], 0), r = Math.random() * total;
  for (const [kind, weight] of options) if ((r -= weight) <= 0) return kind;
  return null;
}

// A cada pouco, tenta pôr um bicho (ou um cardume) numa água perto do jogador, fora da tela
function updateAquaticSpawns(game, dt) {
  const w = game.world, p = game.player;
  // Os que ficaram longe somem, para nascerem outros perto de onde o jogador está
  game.mobs = game.mobs.filter((m) => m.carcass || !m.def?.aquatic || Math.hypot(m.cx - p.cx, m.cy - p.cy) < AQUATIC_RANGE * T);
  if ((game.aquaticTimer = (game.aquaticTimer ?? 1) - dt) > 0) return;
  game.aquaticTimer = 1.2 + Math.random();
  const count = game.mobs.filter((m) => m.def?.aquatic && !m.dead).length;
  if (count >= AQUATIC_MAX) return;
  const ptx = Math.floor(p.cx / T), pty = Math.floor(p.cy / T);
  for (let attempt = 0; attempt < 14; attempt++) {
    const tx = ptx + Math.round((Math.random() - 0.5) * 2 * 44), ty = pty + Math.round((Math.random() - 0.5) * 2 * 26);
    if (!w.inBounds(tx, ty) || w.waterLevel(tx, ty) < WATER_MAX || w.isWaterfall(tx, ty)) continue;
    const room = waterRoom(w, tx, ty), kind = pickAquatic(w, tx, ty, room);
    if (!kind) continue;
    const a = AQUATIC[kind], n = a.group ? a.group[0] + Math.floor(Math.random() * (a.group[1] - a.group[0] + 1)) : 1;
    let made = 0;
    for (let k = 0; k < n && count + made < AQUATIC_MAX; k++) {
      const m = new Wildlife(kind, 0, 0);
      m.x = tx * T + T / 2 - a.w / 2 + (k ? (Math.random() - 0.5) * 24 : 0);
      m.y = ty * T + T / 2 - a.h / 2 + (k ? (Math.random() - 0.5) * 12 : 0);
      if (!boxInWater(w, m.x, m.y, m.w, m.h) || !mobOffScreen(game, m, 1)) continue;
      m.variant = Math.floor(Math.random() * 3);
      m.dir = Math.random() < 0.5 ? -1 : 1; m.facing = m.dir;
      m.home = { x: m.cx, y: m.cy };
      game.mobs.push(m);
      made++;
    }
    if (made) return;
  }
}

// ---------- Desenho ----------
const aquaticSprites = new Map();

// Peixe em pixel art olhando para a direita. Quadros 0–3 = rabo balançando.
// shape: slim (comprido), round (redondo), tall (alto), angel (losango com nadadeiras longas)
function paintFish(a, frame) {
  const L = a.look, W = a.w + 6, H = a.h + (L.shape === 'angel' ? 8 : 4), s = new Sprite(W, H);
  const cx = 2 + a.w * 0.55, cy = H / 2, rx = a.w * 0.42, ry = a.h / 2;
  const sway = [0, 1, 0, -1][frame];
  const shade = (y) => { const v = (y - (cy - ry)) / (ry * 2); return v < 0.34 ? L.back : v < 0.7 ? L.body : L.belly; };
  // Rabo (antes do corpo, para o corpo cobrir a junta)
  const tx = cx - rx - 1;
  for (let k = 0; k < 3; k++) for (let y = -k - 1; y <= k + 1; y++) s.set(Math.round(tx - k), Math.round(cy + y + sway * (k / 2)), L.tail || L.fin);
  // Nadadeiras de cima e de baixo
  if (L.shape === 'angel') {
    for (let k = 0; k < 5; k++) { s.set(Math.round(cx - k), Math.round(cy - ry - 1 - k), L.fin); s.set(Math.round(cx - k), Math.round(cy + ry + k), L.fin); }
  } else {
    for (let k = 0; k < Math.max(2, rx * 0.8); k++) s.set(Math.round(cx - k), Math.round(cy - ry - (k < rx * 0.5 ? 1 : 0)), L.fin);
  }
  // Corpo
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx + 1); x++) {
      let nx = (x - cx) / rx, ny = (y + 0.5 - cy) / ry;
      if (L.shape === 'slim') nx = x > cx ? nx * 1.1 : nx * 0.95;
      if (L.shape === 'angel') { if (Math.abs(nx) * 0.8 + Math.abs(ny) > 1.05) continue; }
      else if (nx * nx + ny * ny > 1.02) continue;
      let c = shade(y);
      if (L.bands && (Math.abs(x - Math.round(cx + rx * 0.35)) < 1 || Math.abs(x - Math.round(cx - rx * 0.35)) < 1)) c = L.bands;
      if (L.vbands && (x - Math.round(cx)) % 3 === 0 && x < cx + rx * 0.5) c = L.vbands;
      if (L.stripe && y === Math.round(cy) && x < cx + rx * 0.6) c = L.stripe;
      if (L.spots && (x * 7 + y * 3) % 5 === 0 && y < cy) c = L.spots;
      if (L.mark && x > cx - rx * 0.6 && x < cx + rx * 0.3 && Math.abs(y - (cy - ry * 0.2)) < 1) c = L.mark;
      s.set(x, y, c);
    }
  // Olho (o peixe-cego não tem)
  if (!a.blind) { s.set(Math.round(cx + rx * 0.6), Math.round(cy - ry * 0.25), [18, 18, 26]); }
  s.set(Math.round(cx + rx * 0.2), Math.round(cy - ry * 0.55), shade(cy - ry).map((v) => Math.min(255, v + 60))); // brilho
  if (L.whiskers) for (let k = 0; k < 4; k++) {
    s.set(Math.round(cx + rx - 1 + k), Math.round(cy + 1 + k / 2), L.whiskers);
    s.set(Math.round(cx + rx - 1 + k), Math.round(cy - 1 - k / 2), L.whiskers);
  }
  return s.finish([20, 24, 34]);
}

// Tubarão: silhueta recortada, dorso azul e nadadeiras com volume.
function paintShark(frame) {
  const s = new Sprite(52, 28), sway = [0, 1, 0, -1][frame];
  const dark = [44, 66, 82], back = [65, 94, 113], side = [107, 142, 160];
  const light = [146, 178, 188], belly = [222, 235, 228];
  // Preenche polígonos em pixels inteiros; a borda final acompanha cada barbatana.
  const polygon = (points, color, bend = false) => {
    const minY = Math.min(...points.map(pt => pt[1])), maxY = Math.max(...points.map(pt => pt[1]));
    for (let y = minY; y <= maxY; y++) {
      const cuts = [];
      for (let i = 0; i < points.length; i++) {
        const a = points[i], b = points[(i + 1) % points.length];
        if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y))
          cuts.push(a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
      }
      cuts.sort((a, b) => a - b);
      for (let i = 0; i + 1 < cuts.length; i += 2) {
        for (let x = Math.ceil(cuts[i]); x <= Math.floor(cuts[i + 1]); x++) {
          const offset = bend ? Math.round(Math.pow(Math.max(0, (23 - x) / 23), 2) * sway) : 0;
          s.set(x, y + offset, typeof color === 'function' ? color(x, y) : color);
        }
      }
    }
  };
  // Cauda assimétrica com lobo superior longo e junta flexível.
  polygon([[2, 4 + sway], [5, 7 + sway], [7, 12], [10, 14], [7, 17], [3, 23 + sway], [3, 19 + sway], [5, 15], [3, 11 + sway]],
    (x, y) => x < 4 ? light : y < 14 ? back : side);
  polygon([[21, 10], [27, 2], [28, 6], [34, 11]], (x, y) => x < 27 ? side : dark);
  polygon([[14, 12], [17, 8], [20, 11]], back, true);
  polygon([[18, 18], [15, 22], [23, 20]], dark, true);
  // Corpo fusiforme, focinho projetado e barriga com sombra suave.
  polygon([[7, 13], [13, 11], [21, 9], [30, 9], [38, 11], [44, 13], [49, 15],
    [49, 17], [43, 19], [32, 21], [22, 20], [13, 17], [7, 16]], (x, y) => {
    const boundary = 15 + (x < 19 ? -1 : x > 39 ? 1 : 0);
    if (y >= boundary + 3) return [174, 204, 207];
    if (y >= boundary) return belly;
    if (y === boundary - 1) return light;
    return y < 12 ? back : side;
  }, true);
  // Reflexo estreito no dorso, sem ruído na barriga.
  for (let x = 18; x <= 34; x++) s.set(x, x < 22 || x > 30 ? 11 : 10, [119, 157, 176]);
  // Guelras curvas, separadas do olho e da nadadeira peitoral.
  for (let k = 0; k < 3; k++) {
    const x = 34 + k * 2;
    for (let y = 13; y <= 16; y++) s.set(x + (y === 16 ? -1 : 0), y, dark);
    s.set(x + 1, 14, light);
  }
  // Nadadeira próxima cobre a barriga e balança junto à cauda.
  const fin = frame === 1 ? 1 : frame === 3 ? -1 : 0;
  polygon([[30, 16], [35, 17], [29, 24 + fin], [27, 24 + fin]], (x, y) => x > 30 ? side : back);
  s.set(30, 20, light); s.set(29, 21, light);
  // Olho escuro com brilho e sobrancelha; narina no focinho.
  s.set(42, 12, dark); s.set(43, 12, dark);
  s.set(42, 13, [11, 24, 31]); s.set(43, 13, [11, 24, 31]);
  s.set(42, 13, [231, 239, 217]); s.set(43, 14, dark);
  s.set(47, 15, dark);
  // Linha da mandíbula e três dentes discretos, legíveis no tamanho do jogo.
  for (let x = 40; x <= 47; x++) s.set(x, x < 43 ? 18 : 17, [39, 48, 55]);
  for (const x of [42, 44, 46]) s.set(x, 18, [250, 246, 221]);
  return s.finish([20, 36, 46]);
}

function paintCatfish(frame) {
  const s=new Sprite(32,16),sway=[0,1,0,-1][frame&3];
  const pal=[[37,53,55],[58,78,77],[82,105,99],[118,141,127],[159,177,151],[209,219,184]];
  const polygon=(points,pick)=>{
    for(let y=Math.min(...points.map(p=>p[1]));y<=Math.max(...points.map(p=>p[1]));y++)for(let x=Math.min(...points.map(p=>p[0]));x<=Math.max(...points.map(p=>p[0]));x++){
      let inside=false;for(let i=0,j=points.length-1;i<points.length;j=i++){
        const [ax,ay]=points[i],[bx,by]=points[j];if((ay>y+.5)!==(by>y+.5)&&x+.5<(bx-ax)*(y+.5-ay)/(by-ay)+ax)inside=!inside;
      }
      if(inside)s.set(x,y,typeof pick==='function'?pick(x,y):pick);
    }
  };
  // Cauda bifurcada, barbatana dorsal e longa barbatana anal.
  polygon([[1,3+sway],[5,6],[9,7],[9,9],[5,10],[1,13+sway],[2,8+sway]],(x,y)=>pal[x<3?3:1]);
  polygon([[10,5],[13,1],[15,1],[17,5]],(x,y)=>pal[x<14?3:1]);
  polygon([[9,10],[20,10],[17,13],[11,12]],(x,y)=>pal[y===11?3:1]);
  // Pele lisa, dorso mosqueado discreto e cabeça larga característica do bagre.
  polygon([[5,7],[10,5],[17,4],[23,5],[27,6],[28,9],[26,11],[21,12],[13,11],[6,9]],(x,y)=>{
    if(y>=10)return pal[5];if(y===9)return pal[4];
    if(y<=6)return pal[y===5&&x<21?3:1];
    return (x*7+y*11)%13===0&&x<22?pal[2]:pal[3];
  });
  seg(s,12,6,20,6,1,pal[4]);seg(s,21,7,22,9,1,pal[1]);s.set(23,9,pal[4]);
  polygon([[21,9],[24,10],[20,14],[18,13]],(x,y)=>pal[x>20?2:1]);s.set(20,12,pal[3]);
  s.set(25,7,[181,176,117]);s.set(26,7,[18,30,30]);s.set(26,8,pal[1]);
  seg(s,26,10,28,9,1,pal[0]);
  // Bigodes separados da boca e curvados nas pontas, sem virarem parte do corpo.
  seg(s,27,8,30,6,1,pal[4]);s.set(30,5,pal[4]);
  seg(s,27,10,30,12,1,pal[5]);s.set(31,12,pal[4]);
  seg(s,25,11,27,13,1,pal[3]);s.set(27,14,pal[3]);
  return s.finish([25,40,43]);
}

function aquaticSprite(kind, frame) {
  const key = kind + ':' + frame;
  let c = aquaticSprites.get(key);
  if (c) return c;
  const normal = kind === 'shark' ? paintShark(frame) : kind === 'catfish' ? paintCatfish(frame) : paintFish(AQUATIC[kind], frame);
  c = { normal, hurt: hurtFlash(normal) };
  aquaticSprites.set(key, c);
  return c;
}

// Água-viva: sino translúcido que fecha e abre, franja na borda e tentáculos ondulando
const JELLY_COLORS = [['rgba(236,140,200,', '#ffd6ef'], ['rgba(170,140,240,', '#e6dcff'], ['rgba(120,200,240,', '#dcf4ff']];
function drawJelly(ctx, m) {
  const [base, light] = JELLY_COLORS[m.variant % JELLY_COLORS.length], now = m.clock;
  const squeeze = m.pulse < 0.18 ? Math.sin((m.pulse / 0.18) * Math.PI) : 0; // o sino fecha rápido e abre devagar
  const bw = 6 - squeeze * 1.6, bh = 5 + squeeze * 1.2, x = m.cx, y = m.y + 5;
  // Brilho fraco (brilham no escuro das profundezas)
  ctx.globalCompositeOperation = 'lighter';
  const gr = ctx.createRadialGradient(x, y, 0, x, y, 14);
  gr.addColorStop(0, base + '0.25)'); gr.addColorStop(1, base + '0)');
  ctx.fillStyle = gr; ctx.fillRect(x - 14, y - 14, 28, 28);
  ctx.globalCompositeOperation = 'source-over';
  // Tentáculos
  ctx.fillStyle = base + '0.55)';
  for (let k = 0; k < 4; k++) {
    const tx0 = x - bw + 1.5 + k * ((bw * 2 - 3) / 3);
    for (let j = 0; j < 9; j++) ctx.fillRect(Math.round(tx0 + Math.sin(now * 3 + j * 0.7 + k) * (j * 0.25)), Math.round(y + 1 + j * (1.1 - squeeze * 0.2)), 1, 1);
  }
  ctx.fillStyle = light;
  for (let k = 0; k < 2; k++) for (let j = 0; j < 5; j++) ctx.fillRect(Math.round(x - 1 + k * 2 + Math.sin(now * 2 + j) * 0.6), Math.round(y + 1 + j), 1, 1);
  // Sino
  ctx.fillStyle = base + '0.65)';
  ctx.beginPath(); ctx.ellipse(x, y, bw, bh, 0, Math.PI, Math.PI * 2); ctx.fill();
  ctx.fillRect(Math.round(x - bw), Math.round(y) - 1, Math.round(bw * 2), 2);
  ctx.fillStyle = light;
  ctx.beginPath(); ctx.ellipse(x - bw * 0.25, y - bh * 0.45, bw * 0.45, bh * 0.3, 0, 0, Math.PI * 2); ctx.fill();
  if (m.hurtTimer > 0) { ctx.fillStyle = 'rgba(255,120,110,0.5)'; ctx.beginPath(); ctx.ellipse(x, y, bw, bh, 0, Math.PI, Math.PI * 2); ctx.fill(); }
}

// Baiacu em pixels inteiros: contorno, espinhos afilados e nadadeiras animadas.
// As poses ficam em cache, como as demais skins aquáticas.
function pufferSprite(puff, frame) {
  const step = Math.round(clamp(puff, 0, 1) * 16), key = 'puffer:' + step + ':' + frame;
  let sprite = aquaticSprites.get(key);
  if (sprite) return sprite;
  const p = step / 16, rx = lerp(4.6, 7.6, p), ry = lerp(3.3, 7.6, p);
  const canvas = makeCanvas(27, 27), c = canvas.getContext('2d');
  c.translate(13, 13);
  const pixel = (x, y, color, w = 1, h = 1) => {
    c.fillStyle = color; c.fillRect(Math.round(x), Math.round(y), w, h);
  };
  const wag = [0, 1, 0, -1][frame];
  // Cauda em leque: continua visível quando o corpo está inflado.
  const tailX = -Math.round(rx) - 3;
  pixel(tailX, -2 + wag, '#70502e', 2, 5);
  pixel(tailX, -1 + wag, '#e9a843', 2, 3);
  pixel(tailX + 2, wag, '#ffd56d', 2, 1);
  // Espinhos unidos ao contorno, com pontas claras e bases sombreadas.
  if (p > 0.2) {
    const length = Math.round(lerp(1, 3, (p - 0.2) / 0.8));
    for (let k = 0; k < 12; k++) {
      const angle = (k + 0.5) * Math.PI / 6;
      if (Math.cos(angle) > 0.8 && Math.abs(Math.sin(angle)) < 0.6) continue;
      for (let j = length; j >= 0; j--) {
        const x = Math.cos(angle) * (rx + j), y = Math.sin(angle) * (ry + j);
        pixel(x, y, j === length ? '#ffe5a0' : '#9c7135');
        if (j === 0) pixel(x - Math.sin(angle), y + Math.cos(angle), '#77532f');
      }
    }
  }
  // Rasterização sem suavização: luz no dorso e sombra na borda inferior.
  for (let y = -Math.ceil(ry); y <= Math.ceil(ry); y++) {
    for (let x = -Math.ceil(rx); x <= Math.ceil(rx); x++) {
      const d = x * x / (rx * rx) + y * y / (ry * ry);
      if (d > 1) continue;
      let color = '#e9ba4d';
      const edge = (x - 1) * (x - 1) / (rx * rx) + (y - 1) * (y - 1) / (ry * ry) > 1 ||
        (x + 1) * (x + 1) / (rx * rx) + (y + 1) * (y + 1) / (ry * ry) > 1;
      if (edge) color = y < 0 ? '#8c632f' : '#654a2b';
      else if (y > ry * 0.1 + x * 0.12) color = d > 0.65 ? '#dcb96c' : y > ry * 0.58 ? '#f1dca0' : '#fff0be';
      else if (x < 0 && y < -ry * 0.3) color = '#ffdc78';
      else if (x > rx * 0.55) color = '#ca963c';
      pixel(x, y, color);
    }
  }
  // Pintas em pequenos grupos, preservando a área do olho.
  for (const [sx, sy] of [[-0.55, -0.28], [-0.25, -0.63], [0.13, -0.51], [-0.16, -0.08]]) {
    pixel(sx * rx, sy * ry, '#a97b33');
    if (p > 0.5) pixel(sx * rx, sy * ry + 1, '#d5a340');
  }
  const eyeX = Math.round(rx * 0.4), eyeY = -Math.round(ry * 0.4);
  pixel(eyeX, eyeY, '#714c2e', 3, 3);
  pixel(eyeX, eyeY, '#fff9db', 2, 2);
  pixel(eyeX + 1, eyeY + 1, '#252b2c', 2, 2);
  pixel(eyeX + 1, eyeY, '#ffffff');
  // Boca pequena e bochecha quente deixam o perfil legível.
  pixel(rx - 1, 1, '#704329');
  pixel(rx - 2, 2, '#f3ce81');
  pixel(eyeX, eyeY + 4, '#e7a05a');
  const finX = -Math.round(rx * 0.35), finY = 1 + (wag > 0 ? 1 : 0);
  pixel(finX - 1, finY, '#b98237', 3, 2);
  pixel(finX - 2, finY + 1, '#f2ca67', 3, 1);
  pixel(finX - 1, finY + 2, '#d99e42', 2, 1);
  sprite = { normal: canvas, hurt: hurtFlash(canvas) };
  aquaticSprites.set(key, sprite);
  return sprite;
}

function drawPuffer(ctx, m) {
  const frame = Math.floor((m.clock || 0) * 8) % 4, sprite = pufferSprite(m.puff || 0, frame);
  ctx.save();
  ctx.translate(Math.round(m.cx), Math.round(m.cy));
  ctx.scale(m.facing < 0 ? -1 : 1, 1);
  ctx.drawImage(m.hurtTimer > 0 ? sprite.hurt : sprite.normal, -13, -13);
  ctx.restore();
}

function drawAquatic(ctx, m) {
  if (m.carcass) { drawSharkCarcass(ctx, m); return; }
  const a = m.def.spec;
  if (a.style === 'jelly') { drawJelly(ctx, m); return; }
  if (a.style === 'puffer') { drawPuffer(ctx, m); return; }
  const frame = Math.floor(m.tail || 0) % 4, spr = aquaticSprite(m.kind, frame), img = m.hurtTimer > 0 ? spr.hurt : spr.normal;
  ctx.save();
  ctx.translate(Math.round(m.cx), Math.round(m.cy));
  ctx.scale(m.facing < 0 ? -1 : 1, 1);
  ctx.rotate(m.pitch || 0);
  ctx.drawImage(img, -Math.round(img.width / 2), -Math.round(img.height / 2));
  ctx.restore();
}
