'use strict';

// =====================================================================================
//  ARQUIPÉLAGO DOS VIGIAS — o que acontece lá em cima
// =====================================================================================
//   • Correntes de vento: da Pedra dos Ventos (no chão) e das pedras menores nas ilhas sobe
//     uma coluna de ar que leva o jogador para cima e, no fim, empurra para a ilha. S desce.
//   • Asa-delta (segure o pulo no ar) e nuvem engarrafada (pulo extra no ar)
//   • Árvores-do-vento, mato celeste e cipós pendurados embaixo das ilhas
//   • Cachoeiras que caem da beira das ilhas e se desfazem em névoa
//   • Paisagem: lá do alto o chão some atrás de um mar de nuvens e outras ilhas aparecem longe

const SKY_LIFE = {
  lift: 330, liftTall: 470, sink: 70, push: 120, hover: 2.4, gust: 8,
  glideFall: 74, extraJump: 0.92,
};

Object.assign(SFX, {
  skyWhoosh(A, o) { N(A, o, { type: 'bandpass', freq: 500, freqEnd: 1400, q: 0.7, dur: 0.9, gain: 0.35, attack: 0.15 }); },
  skyPuff(A, o) { N(A, o, { type: 'lowpass', freq: 1800, freqEnd: 500, dur: 0.35, gain: 0.45 }); Tn(A, o, { freq: 420, freqEnd: 700, dur: 0.12, gain: 0.08 }); },
  skyChime(A, o) { Tn(A, o, { freq: 1320, dur: 0.6, gain: 0.08 }); Tn(A, o, { freq: 1980, dur: 0.5, gain: 0.05 }); Tn(A, o, { freq: 990, dur: 0.8, gain: 0.05 }); },
});

const skyWorld = () => (typeof world !== 'undefined' ? world : null);
function skyParticle(g, p) { if (g.particles.length < 460) g.particles.push(p); }

// ---------- Árvores-do-vento ----------
// Mesmo desenho das árvores orgânicas do chão, com folhas próprias: salgueiro verde-água (galhos
// caídos balançando na beira da ilha) ou flor-do-céu lilás e branca.
ORGANIC_LEAVES.skyWillow = [[16, 42, 52], [26, 72, 82], [42, 112, 114], [74, 160, 150], [128, 206, 188], [206, 248, 232]];
ORGANIC_LEAVES.skyBlossom = [[42, 30, 72], [66, 52, 112], [104, 88, 160], [152, 138, 210], [200, 192, 240], [250, 246, 255]];
const skyTreeCache = new Map();
function skyCanopyFor(x, worldSeed) {
  const key = worldSeed + ':' + x;
  if (skyTreeCache.has(key)) return skyTreeCache.get(key);
  const seed = Math.floor(hash2(x + 7919, worldSeed & 0xffff) * 0x7fffffff), willow = hash2(x + 811, 3) < 0.6;
  // a geração orgânica pega a paleta pelo nome do tipo: troca por um instante
  const kind = willow ? 'willow' : 'blossom', save = ORGANIC_LEAVES[kind];
  ORGANIC_LEAVES[kind] = willow ? ORGANIC_LEAVES.skyWillow : ORGANIC_LEAVES.skyBlossom;
  let tree;
  try { tree = generateOrganicCanopy(seed, kind); } finally { ORGANIC_LEAVES[kind] = save; }
  skyTreeCache.set(key, tree);
  if (skyTreeCache.size > 96) skyTreeCache.delete(skyTreeCache.keys().next().value);
  return tree;
}
{
  const baseCanopy = canopyFor;
  canopyFor = (x, biome, worldSeed = 0) => (skyWorld()?.skyTreeCols?.has(x) ? skyCanopyFor(x, worldSeed) : baseCanopy(x, biome, worldSeed));
}

// ---------- Mato celeste e cipós ----------
const SKY_DECOR = (() => {
  const grass = [1, 2, 3, 4].map((i) => genGrassTuft(2300 + i * 17, [[60, 150, 130], [110, 210, 176], [196, 250, 222]]));
  // cipó pendurado: fio verde-água com folhinhas e, no fim, um botão que brilha à noite
  const vine = [0, 1, 2, 3].map((v) => {
    const rnd = mulberry32(2400 + v * 31), H = 18 + Math.floor(rnd() * 18), c = makeCanvas(T, H), p = c.getContext('2d');
    const dot = (x, y, col) => { p.fillStyle = col; p.fillRect(Math.round(x), Math.round(y), 1, 1); };
    for (let j = 0; j < 2; j++) {
      let x = 4 + j * 7 + rnd() * 2;
      const len = H * (0.6 + rnd() * 0.4) - 3;
      for (let y = 0; y < len; y++) {
        x += Math.sin(y * 0.35 + j * 2 + v) * 0.25;
        dot(x, y, '#3f7a70');
        if (y % 4 === 2) { dot(x - 1, y, '#78c8a8'); dot(x - 2, y + 1, '#5aa890'); }
        if (y % 4 === 0) { dot(x + 1, y, '#9ce0c0'); dot(x + 2, y + 1, '#78c8a8'); }
      }
      dot(x, len, '#bff6ff'); dot(x, len + 1, '#7fe0f0'); dot(x - 1, len + 1, '#4fb0c8'); dot(x + 1, len + 1, '#4fb0c8'); dot(x, len + 2, '#4fb0c8');
    }
    c.envHang = true; c.envFlex = 1;
    return c;
  });
  return { grass, vine };
})();
for (const s of SKY_DECOR.grass) envSpriteKind.set(s, 'skyGrass');
for (const s of SKY_DECOR.vine) envSpriteKind.set(s, 'skyVine');
ENV_HARVEST.skyGrass = { item: ITEM.FIBER, lamina: true, volta: 160, bicho: 0.08 };
ENV_HARVEST.skyVine = { item: ITEM.FIBER, count: 2, lamina: true, volta: 240 };
{
  const base = generateEnvironmentDecoration;
  generateEnvironmentDecoration = (world, x, y, ceiling = false) => {
    const t = world.getTile(x, y);
    if (t !== TILE.SKY_GRASS && t !== TILE.SKYSTONE && t !== TILE.SKY_SOIL) return base(world, x, y, ceiling);
    const ay = y + (ceiling ? 1 : -1);
    if (world.getTile(x, ay) !== TILE.AIR || world.hasWater(x, ay)) return null;
    const touched = world.touched;
    if (touched?.size && (touched.has(y * world.w + x) || touched.has(ay * world.w + x))) return null;
    const h = skyHash(x, y, ceiling ? 61 : 62);
    if (ceiling) {
      if (h > 0.32 || world.getTile(x, y + 2) !== TILE.AIR || world.getTile(x, y + 3) !== TILE.AIR) return null;
      return SKY_DECOR.vine[Math.floor(skyHash(x, y, 63) * 4)];
    }
    if (t !== TILE.SKY_GRASS || h > 0.5) return null;
    return SKY_DECOR.grass[Math.floor(skyHash(x, y, 64) * 4)];
  };
}

// ---------- Correntes de vento ----------
// Corrente em que o corpo está (3 blocos de largura, do chão ou da pedra até um pouco acima da ilha)
function skyWindAt(w, b) {
  if (!w.skyWinds) return null;
  const cx = b.x + b.w / 2, bottom = b.y + b.h;
  for (const wd of w.skyWinds) {
    const offset = cx - (wd.x + 0.5) * T, dx = offset * wd.push; // > 0 = já indo para o lado da ilha
    const column = Math.abs(offset) <= 1.5 * T + b.w * 0.3 && bottom >= (wd.yTop - 3) * T && b.y <= (wd.yBottom + 1) * T;
    // no alto a corrente faz a curva e vira uma rajada que leva até em cima da ilha
    const gust = wd.push !== 0 && dx >= 0 && dx <= SKY_LIFE.gust * T && bottom >= (wd.yTop - 3) * T && bottom <= (wd.yTop + 7) * T;
    if (column || gust) return wd;
  }
  return null;
}
function skyWindPush(g, b, wd, dt, isPlayer) {
  const lift = wd.tall ? SKY_LIFE.liftTall : SKY_LIFE.lift, topPx = wd.yTop * T;
  const sinking = isPlayer && (input.down('KeyS') || input.down('ArrowDown'));
  // na coluna sobe e para no alto; já na rajada (a curva para o lado da ilha) desce devagar até pousar
  const inColumn = Math.abs(b.x + b.w / 2 - (wd.x + 0.5) * T) <= 1.5 * T + b.w * 0.3 && b.y + b.h > (wd.yTop - 1) * T;
  // pousou na ilha dentro da rajada: o vento só empurra de leve, sem tirar o pé do chão
  if (!inColumn && b.onGround) { if (!sinking) b.moveX(wd.push * SKY_LIFE.push * 0.4 * dt, g.world); b.windV = undefined; return true; }
  const target = sinking ? SKY_LIFE.sink : inColumn ? clamp((topPx - b.y) * SKY_LIFE.hover, -lift, 60) : 90;
  // A velocidade da corrente fica guardada à parte: no quadro seguinte o corpo ainda soma a
  // gravidade (o jogador subindo sem segurar o pulo soma 2,2x, o "pulo curto"), então ela já
  // sai descontada aqui para o corpo andar exatamente na velocidade da corrente.
  b.windV = b.windV ?? b.vy;
  b.windV += (target - b.windV) * Math.min(1, dt * 5);
  const jumpHeld = isPlayer && (input.down('Space') || input.down('KeyW') || input.down('ArrowUp'));
  const gNext = isPlayer && b.windV < 0 && !jumpHeld ? GRAVITY * 2.2 : GRAVITY;
  b.vy = b.windV - gNext * dt;
  if (b.windV < 0) b.onGround = false; // subindo: tira do chão (descendo, quem pousa fica em pé)
  // no alto da corrente o vento vira e empurra para cima da ilha
  if (b.y < topPx + 6 * T && !sinking) b.moveX(wd.push * SKY_LIFE.push * dt, g.world);
  return true;
}

// ---------- Asa-delta, nuvem engarrafada (e as asas do chefe, js/sky-boss.js) ----------
function skyGear(g) {
  let glide = null, jumps = 0;
  for (const s of playerAccessories(g)) {
    const d = s && ITEM_DEFS[s.item];
    if (!d) continue;
    if (d.acessorio?.planar && (!glide || d.planar.velocidade > glide.velocidade)) glide = d.planar;
    if (d.pulos) jumps += d.pulos;
  }
  return { glide, jumps };
}
function updateSkyMovement(g, dt) {
  const p = g.player, w = g.world;
  if(p.flying||p.flightGliding){p.gliding=!!p.flightGliding;return;}
  if (g.mount || p.climbing || p.swimming || p.seat) { p.gliding = false; return; }
  const gear = skyGear(g);
  const jump = input.down('Space') || input.down('KeyW') || input.down('ArrowUp');
  if (p.onGround) p.skyJumps = gear.jumps;
  // pulo extra no ar: um sopro de nuvem embaixo dos pés
  if (p.jumpEdge && !p.onGround && p.jumpAge > 0.05 && (p.skyJumps ?? 0) > 0) {
    p.skyJumps--; p.vy = -JUMP_SPEED * SKY_LIFE.extraJump; p.jumpAge = 0; p.gliding = false;
    for (let i = 0; i < 12; i++) skyParticle(g, { x: p.cx + (Math.random() - 0.5) * 16, y: p.y + p.h, vx: (Math.random() - 0.5) * 90, vy: 20 + Math.random() * 40,
      life: 0.5 + Math.random() * 0.3, maxLife: 0.8, color: Math.random() < 0.5 ? 'rgba(255,255,255,0.9)' : 'rgba(214,226,250,0.85)', w: 3, h: 3, gravity: -20, grow: 3 });
    playSfx('skyPuff', p.cx, p.y + p.h);
  }
  // planando: segura o pulo caindo
  p.gliding = !!(gear.glide && jump && !p.onGround && p.vy > 0 && !skyWindAt(w, p));
  if (p.gliding) {
    p.vy = Math.min(p.vy, gear.glide.queda);
    const dir = (input.down('KeyD') || input.down('ArrowRight') ? 1 : 0) - (input.down('KeyA') || input.down('ArrowLeft') ? 1 : 0);
    if (dir) {
      p.facing = dir;
      // o jogador anda no máximo a 170 px/s; o resto da velocidade da asa vai direto
      p.moveX(dir * Math.max(0, gear.glide.velocidade - WALK_SPEED) * dt, w);
    }
    if (Math.random() < dt * 10) skyParticle(g, { x: p.cx - p.facing * 14, y: p.y + 4 + Math.random() * 6, vx: -p.facing * 60, vy: 0, life: 0.35, maxLife: 0.35, color: 'rgba(255,255,255,0.7)', w: 4, h: 1, gravity: 0 });
    if (!g.glideHint) { g.glideHint = true; toast('Planando! Solte o pulo para cair, ou segure para ir longe.'); }
  }
}

// ---------- Atualização (js/game.js) ----------
const skyScan = { t: 0, falls: [] };
function updateSky(g, dt) {
  const w = g.world, p = g.player;
  if (!w.skyFloor || g.intro?.active) return;
  updateSkyMovement(g, dt);
  // correntes: jogador, itens no chão e bichos que não voam sozinhos
  const wd = skyWindAt(w, p);
  if (wd && !g.adminFly && !p.climbing) {
    skyWindPush(g, p, wd, dt, true);
    p.inWind = (p.inWind ?? 0) + dt;
    if (p.inWind - dt <= 0) playSfx('skyWhoosh', p.cx, p.cy);
    if (!g.windHint) { g.windHint = true; toast('A corrente dos Vigias te leva para o céu! Segure S para descer devagar.'); }
    if (Math.random() < dt * 18) skyParticle(g, { x: p.cx + (Math.random() - 0.5) * 30, y: p.y + p.h + 10, vx: (Math.random() - 0.5) * 20, vy: -200 - Math.random() * 120,
      life: 0.5, maxLife: 0.5, color: 'rgba(220,250,255,0.75)', w: 1, h: 4, gravity: 0 });
  } else { p.inWind = 0; p.windV = undefined; }
  for (const d of g.drops || []) {
    const b = { x: d.x - 4, y: d.y - 4, w: 8, h: 8 }, dw = skyWindAt(w, b);
    if (dw && d.y > dw.yTop * T) { d.vy = Math.min(d.vy ?? 0, -140); d.y += d.vy * dt * 0.5; }
  }
  for (const m of g.mobs) {
    if (m.boss || m.def?.voa || m.dead || Math.abs(m.cx - p.cx) > 60 * T) continue;
    const mw = skyWindAt(w, m);
    if (mw) skyWindPush(g, m, mw, dt, false); else m.windV = undefined;
  }
  // nomes dos trechos
  const tx = clamp(Math.floor(p.cx / T), 0, w.w - 1), ty = Math.floor(p.cy / T);
  if (ty <= w.skyFloor[tx] - 2 && !g.adminFly) {
    if (!g.skyEntered) { g.skyEntered = true; g.skyZoneSeen = skyZoneAt(w, tx); toast('Você chegou ao ARQUIPÉLAGO DOS VIGIAS.'); playSfx('skyChime', p.cx, p.cy); }
    else {
      const z = skyZoneAt(w, tx), nest = w.skyNest && Math.abs(tx - w.skyNest.cx) < w.skyNest.R + 10 && ty < w.skyNest.floor + 6;
      const key = nest ? 'nest' : z;
      if (g.skyZoneSeen !== key) { g.skyZoneSeen = key; toast(nest ? 'O Ninho da Tempestade' : SKY_ZONE_NAMES[z]); }
    }
  }
  // ambiente: gotas das nuvens de chuva, sementes voando no jardim e luzinhas à noite
  updateSkyWisps(g, dt);
  if ((skyScan.t -= dt) <= 0) { skyScan.t = 0.5; scanSky(g); }
  if (skyScan.rain.length && Math.random() < dt * 20) {
    const [x, y] = skyScan.rain[Math.floor(Math.random() * skyScan.rain.length)];
    skyParticle(g, { x: (x + Math.random()) * T, y: (y + 1) * T, vx: 0, vy: 220, life: 0.9, maxLife: 0.9, color: 'rgba(170,200,240,0.8)', w: 1, h: 3, gravity: 200 });
  }
  if (skyScan.grass.length && Math.random() < dt * 3) {
    const [x, y] = skyScan.grass[Math.floor(Math.random() * skyScan.grass.length)];
    skyParticle(g, { x: (x + Math.random()) * T, y: y * T - 2, vx: 20 + Math.random() * 25, vy: -10 - Math.random() * 14, life: 4, maxLife: 4, color: 'rgba(250,252,255,0.9)', w: 1, h: 1, gravity: -2 });
  }
}
// Fiapos de vento (luzinhas da noite): vagam em volta do jogador quando ele está no céu
const skyWisps = [];
function updateSkyWisps(g, dt) {
  const w = g.world, p = g.player, inSky = Math.floor(p.cy / T) <= w.skyFloor[clamp(Math.floor(p.cx / T), 0, w.w - 1)] + 10;
  const night = 1 - clamp(g.daylight ?? 1, 0, 1);
  if (!inSky || night < 0.3) { skyWisps.length = 0; return; }
  while (skyWisps.length < 26) skyWisps.push({ x: p.cx + (Math.random() - 0.5) * 900, y: p.cy + (Math.random() - 0.5) * 500, vx: 0, vy: 0,
    a: 0.4 + Math.random() * 0.5, f: 1 + Math.random() * 2, p: Math.random() * 6, c: Math.random() < 0.7 ? '#dffcff' : '#fff6d0' });
  for (const s of skyWisps) {
    s.vx += (Math.random() - 0.5) * 30 * dt + 6 * dt; s.vy += (Math.random() - 0.5) * 30 * dt;
    s.vx *= 0.98; s.vy *= 0.98; s.x += s.vx * dt; s.y += s.vy * dt;
    if (Math.abs(s.x - p.cx) > 520 || Math.abs(s.y - p.cy) > 320) { s.x = p.cx + (Math.random() - 0.5) * 900; s.y = p.cy + (Math.random() - 0.5) * 500; }
  }
}

// A cada meio segundo: nuvens de chuva e grama celeste perto do jogador
function scanSky(g) {
  const w = g.world, p = g.player, px = Math.floor(p.cx / T), py = Math.floor(p.cy / T);
  skyScan.rain = []; skyScan.grass = [];
  if (py > w.skyFloor[clamp(px, 0, w.w - 1)] + 30) return;
  for (let y = Math.max(1, py - 24); y <= py + 24; y += 1) for (let x = Math.max(1, px - 40); x <= Math.min(w.w - 2, px + 40); x += 2) {
    const t = w.tiles[y * w.w + x];
    if (t === TILE.RAIN_CLOUD && w.tiles[(y + 1) * w.w + x] === TILE.AIR) skyScan.rain.push([x, y]);
    else if (t === TILE.SKY_GRASS && w.tiles[(y - 1) * w.w + x] === TILE.AIR) skyScan.grass.push([x, y]);
  }
}
skyScan.rain = []; skyScan.grass = [];

// =====================================================================================
//  DESENHO
// =====================================================================================
// ---------- Cachoeiras (no fundo, atrás dos blocos) ----------
// Fita de água caindo da beira da ilha: listras andando para baixo, espuma na boca, e
// lá embaixo ela abre e se desfaz em névoa (no céu não tem onde bater).
const SKY_FALL_TEX = (() => {
  const c = makeCanvas(12, 64), p = c.getContext('2d'), rnd = mulberry32(2501);
  const cols = ['#9fd4f0', '#c6e8fa', '#e8f8ff', '#7cbce4', '#ffffff'];
  for (let x = 0; x < 12; x++) for (let y = 0; y < 64; y++) {
    const band = Math.sin(x * 1.7 + Math.sin(y * 0.2 + x) * 0.8);
    p.fillStyle = cols[band > 0.75 ? 2 : band > 0.2 ? 1 : band < -0.75 ? 3 : 0];
    p.fillRect(x, y, 1, 1);
  }
  for (let i = 0; i < 26; i++) { p.fillStyle = cols[4]; p.fillRect(Math.floor(rnd() * 12), Math.floor(rnd() * 64), 1, 2 + Math.floor(rnd() * 3)); }
  return c;
})();
function drawSkyFalls(ctx, g, vx, vy, vw, vh) {
  const w = g.world, t = performance.now() / 1000;
  for (const f of w.skyFalls || []) {
    const x0 = f.x * T + (f.side < 0 ? T - 6 : 0), y0 = f.y * T, len = f.len * T;
    if (x0 > vx + vw + 60 || x0 < vx - 80 || y0 > vy + vh || y0 + len < vy) continue;
    const base = 8 + f.wide * 5;
    for (let d = 0; d < len; d += 8) {
      const k = d / len, wid = Math.round(base + k * k * 10), a = k < 0.6 ? 0.92 : 0.92 * (1 - (k - 0.6) / 0.4);
      // a fita curva para fora no começo (sai do lado da ilha) e balança com o vento
      const drift = f.side * Math.min(6, d * 0.12) + Math.sin(t * 1.3 + d * 0.03 + f.seed) * k * 4;
      ctx.globalAlpha = Math.max(0, a);
      const sy = Math.floor(((t * 140 - d) % 64 + 64) % 64);
      ctx.drawImage(SKY_FALL_TEX, 0, sy, 12, Math.min(8, 64 - sy), Math.round(x0 + drift - wid / 2 + 3), Math.round(y0 + d), wid, Math.min(8, 64 - sy));
      if (64 - sy < 8) ctx.drawImage(SKY_FALL_TEX, 0, 0, 12, 8 - (64 - sy), Math.round(x0 + drift - wid / 2 + 3), Math.round(y0 + d + 64 - sy), wid, 8 - (64 - sy));
    }
    // espuma na boca e névoa no fim
    ctx.globalAlpha = 1; ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 4; i++) ctx.fillRect(Math.round(x0 + 1 + Math.sin(t * 7 + i * 2) * 2 + i * 2), y0 + 1 + ((i * 3) & 3), 2, 1);
    for (let i = 0; i < 7; i++) {
      const ph = (t * 0.35 + i / 7) % 1, mx = x0 + 3 + f.side * 6 + Math.sin(i * 2.3 + t) * 12 * ph, my = y0 + len * (0.7 + ph * 0.35);
      ctx.globalAlpha = 0.28 * (1 - ph); ctx.fillStyle = '#eef8ff';
      ctx.fillRect(Math.round(mx - 3 - ph * 6), Math.round(my), Math.round(6 + ph * 12), 3);
    }
    ctx.globalAlpha = 1;
  }
}

// ---------- No espaço do mundo, depois da luz: correntes e o planador ----------
function drawSkyWorld(ctx, g) {
  const w = g.world;
  if (!w.skyFloor) return;
  const vw = canvas.width / g.zoom, vh = canvas.height / g.zoom, vx = g.cam.x, vy = g.cam.y, t = performance.now() / 1000;
  // fitas de vento subindo pelas correntes (só o trecho na tela)
  for (const wd of w.skyWinds) {
    const cx = (wd.x + 0.5) * T;
    if (cx < vx - 40 || cx > vx + vw + 40) continue;
    const y0 = Math.max(wd.yTop * T, vy - 20), y1 = Math.min((wd.yBottom + 1) * T, vy + vh + 20);
    if (y1 <= y0) continue;
    for (let k = 0; k < 4; k++) {
      const speed = wd.tall ? 300 : 220, ph = (t * speed + k * 97) % 160;
      for (let y = y1 - ph; y > y0; y -= 160) {
        const len = 34 + k * 6, xx = cx + Math.sin(y * 0.03 + k * 1.7 + t * 2) * (8 + k * 2);
        const a = 0.16 + 0.08 * Math.sin(t * 3 + k);
        ctx.fillStyle = `rgba(220,248,255,${a})`;
        for (let s = 0; s < len; s += 2) ctx.fillRect(Math.round(xx + Math.sin((y - s) * 0.08 + k) * 2), Math.round(y - s), 1, 2);
      }
    }
  }
  // asa-delta por cima da cabeça de quem está planando
  const p = g.player;
  if (p.gliding&&!p.flightGliding) drawGliderWing(ctx, p, t);
}
const GLIDER_ART = (() => {
  const s = new Sprite(44, 16), W = [[40, 44, 70], [252, 252, 255], [214, 226, 248], [150, 186, 230], [110, 150, 210]];
  for (let x = 0; x < 44; x++) {
    const e = Math.abs(x - 21.5) / 21.5, top = Math.round(2 + e * 6), bottom = Math.round(8 + e * 2);
    for (let y = top; y <= bottom; y++) {
      const edge = y === top || y === bottom || x === 0 || x === 43;
      const stripe = Math.floor((x + 2) / 6) % 2 === 0;
      s.set(x, y, edge ? W[0] : y < top + 2 ? W[1] : stripe ? W[3] : W[2]);
    }
  }
  // armação de graveto e as alças
  for (let x = 6; x < 38; x++) s.set(x, 9, [120, 80, 44]);
  for (const [x0, x1] of [[16, 19], [27, 24]]) { s.set(x0, 10, [120, 80, 44]); s.set((x0 + x1) >> 1, 12, [120, 80, 44]); s.set(x1, 14, [170, 120, 70]); }
  return s.finish(null);
})();
function drawGliderWing(ctx, p, t) {
  const tilt = Math.sin(t * 2.2) * 0.05 + (p.vx / 600) * p.facing;
  ctx.save();
  ctx.translate(Math.round(p.cx), Math.round(p.y - 6));
  ctx.rotate(tilt * p.facing);
  ctx.drawImage(GLIDER_ART, -22, -10);
  ctx.restore();
}

// ---------- Depois da luz, em pixels da tela: brilhos que o escuro não apaga ----------
const SKY_GLOW = (() => {
  const c = makeCanvas(64, 64), g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(140,240,255,0.5)'); gr.addColorStop(0.4, 'rgba(90,200,240,0.16)'); gr.addColorStop(1, 'rgba(60,160,220,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return c;
})();
function drawSkyAccents(ctx, g, ox, oy, z) {
  const w = g.world;
  if (!w.skyFloor || g.intro?.active) return;
  const W = ctx.canvas.width, H = ctx.canvas.height, t = performance.now() / 1000, night = 1 - clamp(g.daylight ?? 1, 0, 1);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.globalCompositeOperation = 'lighter';
  // feixe da Pedra dos Ventos: à noite se vê de longe, de dia é só um brilho fraco
  for (const s of w.skyStones || []) {
    const sx = (s.x + 0.5) * T * z - ox;
    if (sx < -80 || sx > W + 80) continue;
    const wd = w.skyWinds.find((o) => o.ground && o.x === s.x), topY = (wd ? wd.yTop : s.y - 60) * T * z - oy, baseY = s.y * T * z - oy;
    if (baseY < -40 || topY > H + 40) continue;
    const a = (0.05 + night * 0.12) * (0.85 + Math.sin(t * 1.6 + s.x) * 0.15);
    // feixe macio: faixas encaixadas, cada uma mais larga e mais fraca, apagando para cima
    const gr = ctx.createLinearGradient(0, baseY, 0, Math.max(topY, -2000));
    gr.addColorStop(0, 'rgba(120,230,255,1)'); gr.addColorStop(0.25, 'rgba(100,210,255,0.6)'); gr.addColorStop(1, 'rgba(100,210,255,0)');
    ctx.fillStyle = gr;
    for (const [wd2, k] of [[0.5, 0.9], [1.1, 0.55], [1.9, 0.35], [3, 0.2], [4.4, 0.12]]) {
      ctx.globalAlpha = a * k * 1.4;
      ctx.fillRect(sx - wd2 * T * z / 2, Math.max(topY, -10), wd2 * T * z, baseY - Math.max(topY, -10));
    }
    ctx.globalAlpha = 1;
    ctx.globalAlpha = 0.6 + night * 0.4;
    ctx.drawImage(SKY_GLOW, sx - 48 * z, baseY - 52 * z, 96 * z, 96 * z);
    ctx.globalAlpha = 1;
  }
  // flor-do-vento e cristal-de-vento acesos à noite
  if (night > 0.2) {
    const x0 = Math.max(0, Math.floor(ox / z / T)), x1 = Math.min(w.w - 1, Math.ceil((ox + W) / z / T));
    const y0 = Math.max(0, Math.floor(oy / z / T)), y1 = Math.min(w.h - 1, Math.ceil((oy + H) / z / T));
    if (y0 < Math.max(...[w.skyFloor[x0], w.skyFloor[x1]]) + 2) {
      ctx.globalAlpha = night * 0.9;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const tt = w.tiles[y * w.w + x];
        if (tt !== TILE.SKY_FLOWER && !(tt === TILE.WIND_CRYSTAL && !SOLID[w.tiles[(y - 1) * w.w + x]])) continue;
        const f = 0.8 + Math.sin(t * 2 + x * 1.3) * 0.2, sz = (tt === TILE.SKY_FLOWER ? 34 : 44) * z * f;
        ctx.drawImage(SKY_GLOW, (x + 0.5) * T * z - ox - sz / 2, (y + (tt === TILE.SKY_FLOWER ? 0.35 : 0)) * T * z - oy - sz / 2, sz, sz);
      }
      ctx.globalAlpha = 1;
    }
  }
  // fiapos de vento: à noite, luzinhas que vagam em volta das ilhas
  if (night > 0.3) for (const s of skyWisps) {
    const sx = s.x * z - ox, sy = s.y * z - oy;
    if (sx < -20 || sy < -20 || sx > W + 20 || sy > H + 20) continue;
    const a = (night - 0.3) / 0.7 * s.a * (0.6 + Math.sin(t * s.f + s.p) * 0.4);
    ctx.globalAlpha = a; const sz = 18 * z;
    ctx.drawImage(SKY_GLOW, sx - sz / 2, sy - sz / 2, sz, sz);
    ctx.fillStyle = s.c; ctx.fillRect(Math.round(sx), Math.round(sy), Math.max(1, Math.round(z)), Math.max(1, Math.round(z)));
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  // névoa passando na frente quando se está bem alto (nuvens finas cruzando a tela)
  const alt = skyAltitude(g, H / z);
  const bg = typeof renderer !== 'undefined' ? renderer.bg : null;
  if (alt > 0.35 && bg?.clouds?.length) {
    // (depois da camada de luz: à noite ela não escureceria, então some junto com o dia)
    const k = smoothstep(clamp((alt - 0.35) / 0.4, 0, 1)) * (1 - (g.weather?.rain || 0) * 0.5) * clamp(g.daylight ?? 1, 0, 1);
    for (let i = 0; i < 3; i++) {
      const spr = bg.clouds[(i * 3 + 1) % bg.clouds.length], sc = 2.2 + i * 0.6, cw = spr.width * sc;
      const x = wrap(i * 977 - g.cam.x * z * (1.25 + i * 0.15) + t * (14 + i * 6), W + cw) - cw;
      const y = H * (0.18 + i * 0.27) - oy * 0.04 % 40;
      ctx.globalAlpha = 0.1 * k;
      ctx.drawImage(spr, x, y, cw, spr.height * sc);
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

// Quão alto a câmera está: 0 no chão, 1 no meio do arquipélago
function skyAltitude(g, vh) {
  const w = g.world;
  if (!w.skyFloor) return 0;
  const camTile = (g.cam.y + vh / 2) / T, ground = w.h * 0.32 - 20, high = w.skyTop0 + 70;
  return clamp((ground - camTile) / (ground - high), 0, 1);
}

// =====================================================================================
//  PAISAGEM LÁ DE CIMA (atrás de tudo, junto com o céu de js/background.js)
// =====================================================================================
// Mar de nuvens: três fileiras de calombos fofos (o fundo azulado, a da frente com topo
// iluminado). Ilhas distantes: silhuetas com arvorezinhas e fios de cachoeira, na névoa.
function paintSkyCloudSea(s, lightSide) {
  const W = BG_LAYER_W, H = 300, c = makeCanvas(Math.ceil(W * s), Math.ceil(H * s)), g = c.getContext('2d'), rnd = mulberry32(2601);
  g.filter = `blur(${Math.max(0.6, 2.4 * s)}px)`;
  const rows = [[60, [176, 190, 222], [214, 224, 244], 46], [110, [196, 208, 236], [236, 242, 252], 58], [170, [214, 224, 244], [255, 255, 255], 70]];
  for (const [base, body, top, r] of rows) {
    const puffs = [];
    for (let x = -r; x < W + r; x += r * (0.55 + rnd() * 0.35)) puffs.push([x, base + (rnd() - 0.5) * 22, r * (0.6 + rnd() * 0.6)]);
    // os calombos das pontas se repetem do outro lado, para a faixa emendar sem corte
    const wrapPuffs = puffs.concat(puffs.filter(([x]) => x < r * 2).map(([x, y, rr]) => [x + W, y, rr]), puffs.filter(([x]) => x > W - r * 2).map(([x, y, rr]) => [x - W, y, rr]));
    g.fillStyle = cssC(body); g.beginPath();
    for (const [x, y, rr] of wrapPuffs) disk(g, x * s, y * s, rr * s);
    g.fill();
    g.fillRect(0, (base + 10) * s, W * s, (H - base) * s);
    g.fillStyle = cssC(top); g.beginPath();
    for (const [x, y, rr] of wrapPuffs) disk(g, (x + lightSide * rr * 0.12) * s, (y - rr * 0.22) * s, rr * 0.78 * s);
    g.fill();
  }
  g.filter = 'none';
  return c;
}
function paintSkyFarIslands(s) {
  const W = BG_LAYER_W, H = 260, c = makeCanvas(Math.ceil(W * s), Math.ceil(H * s)), g = c.getContext('2d'), rnd = mulberry32(2611);
  const body = [150, 156, 196], rim = [206, 214, 240], dark = [118, 122, 168];
  for (let i = 0; i < 9; i++) {
    const cx = (i + 0.3 + rnd() * 0.4) * (W / 9), cy = 60 + rnd() * 130, R = 26 + rnd() * 70, far = rnd();
    const sc = 0.55 + far * 0.45;
    g.save(); g.translate(cx * s, cy * s); g.scale(sc, sc);
    // barriga em cone com pontas
    g.fillStyle = cssC(dark); g.beginPath(); g.moveTo(-R * s, 0);
    for (let k = 0; k <= 12; k++) {
      const u = k / 12, x = (-R + u * R * 2) * s, depth = (R * 0.9) * Math.pow(1 - Math.abs(u - 0.5) * 2, 0.8) * (0.8 + rnd() * 0.3);
      g.lineTo(x, depth * s);
    }
    g.lineTo(R * s, 0); g.closePath(); g.fill();
    // corpo e topo iluminado
    g.fillStyle = cssC(body); g.beginPath(); g.ellipse(0, 0, R * s, R * 0.16 * s, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = cssC(rim); g.beginPath(); g.ellipse(0, -R * 0.05 * s, R * 0.96 * s, R * 0.1 * s, 0, Math.PI, Math.PI * 2); g.fill();
    // arvorezinhas
    for (let k = 0; k < Math.floor(R / 16); k++) {
      const tx = (rnd() - 0.5) * R * 1.4, th = 10 + rnd() * 16;
      g.fillStyle = cssC(dark); g.fillRect((tx - 1) * s, -th * s, 2 * s, th * s);
      g.fillStyle = cssC(body); g.beginPath(); disk(g, tx * s, (-th - 4) * s, (6 + rnd() * 5) * s); g.fill();
    }
    // fio de cachoeira
    if (rnd() < 0.6) {
      const fx = (rnd() < 0.5 ? -1 : 1) * R * 0.8, gr = g.createLinearGradient(0, 0, 0, R * 1.4 * s);
      gr.addColorStop(0, 'rgba(240,248,255,0.9)'); gr.addColorStop(1, 'rgba(240,248,255,0)');
      g.fillStyle = gr; g.fillRect(fx * s, 0, 2.2 * s, R * 1.4 * s);
    }
    g.restore();
  }
  return c;
}
const skyScenery = { scale: 0, light: 0, sea: null, far: null, tinted: new Map() };
function skySceneryTinted(key, src, fog, fogA) {
  const id = `${key}|${fog.map((v) => v | 0).join(',')}|${fogA.toFixed(2)}`;
  let e = skyScenery.tinted.get(key);
  if (e?.id === id) return e.canvas;
  if (!e) skyScenery.tinted.set(key, e = { id: null, canvas: makeCanvas(src.width, src.height) });
  e.id = id;
  const c = e.canvas.getContext('2d');
  c.globalCompositeOperation = 'copy'; c.drawImage(src, 0, 0);
  c.globalCompositeOperation = 'source-atop'; c.fillStyle = cssC(fog, fogA); c.fillRect(0, 0, src.width, src.height);
  c.globalCompositeOperation = 'source-over';
  return e.canvas;
}
function drawSkyScenery(bg, ctx, game, W, H, z) {
  const w = game.world;
  if (!w.skyFloor || !W || !H) return;
  const alt = skyAltitude(game, H / z);
  if (alt <= 0.01) return;
  const s = bg.scale, light = bg.lightSide ?? -1;
  if (skyScenery.scale !== s || skyScenery.light !== light) {
    skyScenery.scale = s; skyScenery.light = light; skyScenery.tinted.clear();
    skyScenery.sea = paintSkyCloudSea(s, light); skyScenery.far = paintSkyFarIslands(s);
  }
  const hour = ((game.time + 0.25) % 1) * 24, rain = game.weather?.rain || 0;
  const mood = skyMood(hour, bg.activeBiome ?? 0, rain), k = smoothstep(alt);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = true;
  // lá em cima o zênite fica mais fundo (de dia; à noite as estrelas é que aparecem mais)
  const day = clamp(game.daylight ?? 1, 0, 1);
  const deep = ctx.createLinearGradient(0, 0, 0, H * 0.7);
  deep.addColorStop(0, cssC(mixC(mood.top, [12, 40, 110], 0.5), 0.45 * k * day)); deep.addColorStop(1, cssC(mood.top, 0));
  ctx.fillStyle = deep; ctx.fillRect(0, 0, W, H * 0.7);
  if (day < 0.6 && bg.stars) { ctx.globalAlpha = k * (0.6 - day) * 0.9 * (1 - rain); ctx.drawImage(bg.stars, 0, 0); ctx.globalAlpha = 1; }
  // ilhas distantes
  const far = skySceneryTinted('far', skyScenery.far, mixC(mood.fog, mood.mid, 0.4), 0.45 + (1 - (game.daylight ?? 1)) * 0.3);
  ctx.globalAlpha = k * 0.9;
  const fy = H * (0.48 - 0.1 * k) - far.height * 0.5, fx = -wrap(Math.round(game.cam.x * z * 0.03), far.width);
  for (let x = fx; x < W; x += far.width) ctx.drawImage(far, x, fy);
  // mar de nuvens subindo para cobrir o chão
  const sea = skySceneryTinted('sea', skyScenery.sea, mixC(mood.cloud, mood.fog, 0.5), clamp(mood.cloudA * 0.9 + (1 - (game.daylight ?? 1)) * 0.25, 0, 0.85));
  ctx.globalAlpha = Math.min(1, k * 1.4);
  const sy = H * (1.04 - 0.46 * k), sx = -wrap(Math.round(game.cam.x * z * 0.07 + performance.now() / 1000 * 3 * s), sea.width);
  for (let x = sx; x < W; x += sea.width) ctx.drawImage(sea, x, sy);
  if (sy + sea.height < H) {
    ctx.fillStyle = cssC(mixC([214, 224, 244], mood.fog, clamp(mood.cloudA * 0.9 + (1 - (game.daylight ?? 1)) * 0.25, 0, 0.85)));
    ctx.fillRect(0, sy + sea.height - 1, W, H - sy - sea.height + 1);
  }
  ctx.restore();
  ctx.imageSmoothingEnabled = false;
}
{
  const baseDraw = Background.prototype.draw;
  Background.prototype.draw = function (ctx, game, W, H, z) {
    baseDraw.call(this, ctx, game, W, H, z);
    drawSkyScenery(this, ctx, game, W, H, z);
  };
}
