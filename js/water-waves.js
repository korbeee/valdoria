'use strict';

// =====================================================================================
//  FÍSICA DA SUPERFÍCIE DA ÁGUA
// =====================================================================================
// A superfície vira uma fileira de molas (4 por bloco): quem cai afunda a água no ponto do
// impacto, ela volta, passa do ponto e a onda corre para os lados até morrer. Cair de alto
// faz o "tchibum": a água sobe numa coluna com uma coroa de gotas, e o som tem o chiado agudo
// da entrada e o baque grave logo depois. Na chuva, cada gota deixa uma ondinha.
// Chamado de updateWater e drawWater (js/water.js).

const WAVE = {
  per: 8,           // amostras por bloco (fatias de 2 px)
  speed: 7,         // velocidade da onda, em blocos por segundo
  restore: 7,       // mola fraca de volta ao nível: onda longa não fica pendurada para sempre
  damp: 1.6,        // atrito da água
  max: 10,          // deslocamento máximo desenhado (px)
  keep: 70,         // blocos em volta do jogador que continuam simulando
};

// Amostras vivas: chave = coluna da amostra; guarda a linha da superfície daquele trecho e se
// cada lado é margem (parede ou terra seca: a onda bate e volta) ou água ainda parada
function waveField(g) { return (g.waves ??= new Map()); }
function waveSample(g, s, ty) {
  const w = g.world, per = WAVE.per, tx = Math.floor(s / per);
  const sameSurface = (x) => { const v = w.waterSurfacePx(x, ty); return v != null && Math.floor((v + 1) / T) === ty; };
  const edgeL = s % per === 0 && !sameSurface(tx - 1), edgeR = s % per === per - 1 && !sameSurface(tx + 1);
  return { h: 0, v: 0, a: 0, ty, edgeL, edgeR };
}

// Empurra a água para baixo (força > 0) em volta de x, na superfície de y (px)
function waveImpulse(g, x, y, force, radius = 10) {
  const w = g.world, field = waveField(g), ty = Math.floor((y + 1) / T);
  const s0 = Math.floor((x - radius * 2.2) / T * WAVE.per), s1 = Math.ceil((x + radius * 2.2) / T * WAVE.per);
  for (let s = s0; s <= s1; s++) {
    const tx = Math.floor(s / WAVE.per), surf = w.waterSurfacePx(tx, ty) ?? w.waterSurfacePx(tx, ty + 1);
    if (surf == null || Math.abs(surf - y) > T) continue;
    const sx = (s + 0.5) / WAVE.per * T, d = (sx - x) / radius;
    let q = field.get(s);
    if (!q) { q = waveSample(g, s, Math.floor((surf + 1) / T)); field.set(s, q); }
    q.v += force * (1 - 4 * d * d) * Math.exp(-d * d * 2); // afunda no meio, a água deslocada sobe em volta
  }
}

// Equação da onda nas amostras: cada uma é puxada pela média das vizinhas. Na margem a vizinha
// "espelha" a própria amostra (a onda reflete); em água parada ainda não simulada ela vale 0.
function updateWaterWaves(g, dt) {
  const field = waveField(g), p = g.player;
  const c2 = (WAVE.speed * WAVE.per) ** 2;            // em amostras²/s²
  const n = Math.max(1, Math.ceil(dt / (1 / 120))), h = dt / n;
  for (let k = 0; k < n; k++) {
    for (const [s, q] of field) {
      const L = field.get(s - 1), R = field.get(s + 1);
      const hl = q.edgeL ? q.h : L && L.ty === q.ty ? L.h : 0, hr = q.edgeR ? q.h : R && R.ty === q.ty ? R.h : 0;
      q.a = c2 * (hl + hr - 2 * q.h) - WAVE.restore * q.h - WAVE.damp * q.v;
    }
    for (const [s, q] of field) {
      q.v += q.a * h; q.h += q.v * h;
      // A onda se espalha: cria a vizinha quando ela ainda não existe e a água continua
      if (Math.abs(q.h) > 0.15) for (const [nb, edge] of [[s - 1, q.edgeL], [s + 1, q.edgeR]]) if (!edge && !field.has(nb)) {
        const tx = Math.floor(nb / WAVE.per), surf = g.world.waterSurfacePx(tx, q.ty);
        if (surf != null && Math.floor((surf + 1) / T) === q.ty) field.set(nb, waveSample(g, nb, q.ty));
      }
    }
  }
  for (const [s, q] of field) {
    const far = Math.abs(s / WAVE.per * T - p.cx) > WAVE.keep * T;
    if (far || (Math.abs(q.h) < 0.04 && Math.abs(q.v) < 0.25) || !g.world.hasWater(Math.floor(s / WAVE.per), q.ty)) field.delete(s);
  }
  updateBodySplashes(g);
  if(!g.lavaFluid)updateRainRipples(g, dt);
  updateSplashColumns(g, dt);
}

// Deslocamento (px, positivo = mais baixo) de cada fatia de 2 px de um bloco de superfície
const _waveSlices = new Array(WAVE.per).fill(0);
function waterWaveSlices(g, tx, ty) {
  const field = g.waves;
  if (!field || !field.size) return null;
  let any = false;
  for (let k = 0; k < WAVE.per; k++) {
    const q = field.get(tx * WAVE.per + k);
    const v = q && q.ty === ty ? WAVE.max * Math.tanh(q.h / WAVE.max) : 0;
    _waveSlices[k] = Math.round(v);
    if (_waveSlices[k]) any = true;
  }
  return any ? _waveSlices : null;
}

// ---------- Tchibum ----------
// power 0..1.6: 1 é uma queda comum; acima disso sobe a coluna d'água
function waterImpact(g, x, y, power) {
  power = clamp(power, 0.2, 1.8);
  waveImpulse(g, x, y, 170 * power, 6 + power * 7);
  // A própria água sobe: uma coluna no meio e uma coroa abrindo para os lados (splashColumns
  // solta as porções de água durante um instante; waterBlobs cuida do voo delas)
  (g.splashColumns ??= []).push({ x, y, t: 0, power, emit: 0.1 + power * 0.06 });
  for (let i = 0; i < 4 + power * 6; i++) {
    const side = Math.random() < 0.5 ? -1 : 1;
    waterParticle(g, x + side * (2 + Math.random() * 6), y, side * (40 + Math.random() * 120 * power), -100 - Math.random() * 200 * power, 0.35 + Math.random() * 0.4);
  }
  addRipple(g, x, y, 14 + power * 16);
  addRipple(g, x, y, 8 + power * 8);
  if (g.particles.length > 420) g.particles.splice(0, g.particles.length - 420);
  playSfx(power > 0.7 ? 'plunge' : 'splash', x, y, { power });
  g.shake = Math.max(g.shake || 0, power > 1 ? 2 : 0);
}

// Porção de água em voo: bola que cai com gravidade e volta para a água de onde saiu
function waterBlob(g, x, y, vx, vy, r, home = Infinity) {
  const list = (g.waterBlobs ??= []);
  if (list.length < 900) list.push({ x, y, vx, vy, r, home, t: 0 });
}

// ---------- Água despejada ----------
// Onde a água começa a cair (a borda de uma lâmina, um furo no fundo), ela sai com impulso e cai
// em arco, como porções de água de verdade. As células em queda da simulação não são desenhadas:
// é este despejo que mostra a queda. Uma borda com várias fileiras vazando (a face de uma represa
// aberta) despeja por toda a altura dela.
function pourWater(g, world, x, y, dt) {
  const { w, water, tiles } = world;
  const resting = (j) => water[j] > 0 && water[j] <= WATER_MAX && !waterFalling(world, j);
  const ledge = (j) => !SOLID[tiles[j]] && j + w < water.length && (SOLID[tiles[j + w]] || water[j + w] >= WATER_MAX);
  const acc = (g.pourAcc ??= new Map()), key = y * w + x;
  // fileiras desta coluna que estão vazando pela lateral
  let rows = 0, flow = 0, side = 0;
  for (let yy = y; yy < world.h - 1 && rows < 12; yy++) {
    const i = yy * w + x;
    if (!waterFalling(world, i)) break;
    const l = x > 0 && resting(i - 1), r = x < w - 1 && resting(i + 1);
    let s = l && !r ? -1 : r && !l ? 1 : l && r ? (water[i - 1] >= water[i + 1] ? -1 : 1) : 0;
    // lâmina fina: a célula da borda pode estar vazia neste quadro; o lado é o do degrau
    if (!s && yy === y) { const L = x > 0 && ledge(i - 1), R = x < w - 1 && ledge(i + 1); s = L && !R ? -1 : R && !L ? 1 : 0; }
    if (yy > y && !s) break;
    if (!rows) side = s;
    rows++; flow += water[i];
  }
  if (!rows) return;
  // A borda pode estar uma fileira acima (a célula dela esvaziou neste passo e a queda já
  // começa embaixo, colada na parede): a água sai de lá
  let ly = y;
  if (!side && y > 0) {
    const i = (y - 1) * w + x, L = x > 0 && (resting(i - 1) || ledge(i - 1)), R = x < w - 1 && (resting(i + 1) || ledge(i + 1));
    if (!SOLID[tiles[i]] && L !== R) { side = L ? -1 : 1; ly = y - 1; rows++; }
  }
  const k = Math.min(1, flow / (WATER_MAX * rows));
  const lipTop = side ? (ly + 1) * T - Math.max(1, (water[ly * w + x + side] * T) / WATER_MAX) : y * T;
  let n = (acc.get(key) || 0) + dt * (26 + 70 * k) * rows;
  acc.set(key, n % 1);
  for (; n >= 1; n--) {
    const u = Math.random(), yy = lipTop + 1 + u * ((y + rows) * T - lipTop - 2) * (side ? 1 : 0.2);
    const bx = side < 0 ? x * T + 1 : side > 0 ? (x + 1) * T - 1 : (x + 0.35 + Math.random() * 0.3) * T;
    // mais fundo na face = mais pressão = sai mais rápido e cai mais longe
    const push = side ? (70 + 100 * k + 50 * u * (rows > 1 ? 1 : 0)) * (0.95 + Math.random() * 0.1) : 0; // jato coeso
    waterBlob(g, bx, yy, -side * push + (side ? 0 : (Math.random() - 0.5) * 6), 20 + Math.random() * 8, 1.6 + k * 2.6 + Math.random() * 0.4);
  }
  if (acc.size > 400) acc.clear();
}

function updateSplashColumns(g, dt) {
  const list = g.splashColumns;
  if (list) for (let i = list.length - 1; i >= 0; i--) {
    const c = list[i], p = c.power, before = c.t;
    c.t += dt;
    if (before < c.emit) {
      // Coluna: sai do meio com cada vez menos força, então ela se estica, sobe e desaba
      const steps = Math.max(1, Math.round(dt * 240));
      for (let s = 0; s < steps; s++) {
        const k = Math.min(1, (before + (dt * s) / steps) / c.emit), up = (1 - k * 0.75) * (190 + 120 * p);
        // a primeira porção (a mais rápida) é a gota que se solta na ponta; as últimas, mais
        // lentas, ficam embaixo e são as mais grossas: a coluna afina para cima
        const lead = before === 0 && s === 0, rad = lead ? 2 + p * 0.8 : 1 + k * (1.5 + p * 1.1) + Math.random() * 0.5;
        waterBlob(g, c.x + (Math.random() - 0.5) * 2, c.y - 1, (Math.random() - 0.5) * 14, -up * (lead ? 1.1 : 0.92 + Math.random() * 0.1), rad, c.y);
      }
      // Coroa: duas cortinas abrindo em leque, só no começo
      if (before === 0) for (let n = 0; n < 14 + p * 16; n++) {
        const side = n % 2 ? 1 : -1, a = 0.25 + Math.random() * 0.55, sp = (110 + Math.random() * 90) * (0.6 + p * 0.5);
        waterBlob(g, c.x + side * (3 + p * 3), c.y - 1, side * Math.sin(a) * sp, -Math.cos(a) * sp, 0.7 + Math.random() * (0.6 + p * 0.5), c.y);
      }
    }
    if (c.t > 1.6) list.splice(i, 1);
  }
  const blobs = g.waterBlobs;
  if (!blobs?.length) return;
  const w = g.world;
  for (let i = blobs.length - 1; i >= 0; i--) {
    const b = blobs[i];
    b.t += dt; b.vy += GRAVITY * 0.9 * dt;
    b.vx *= Math.exp(-0.8 * dt);
    // parede do lado: escorre por ela em vez de atravessar
    const nx = b.x + b.vx * dt;
    if (w.isSolid(Math.floor(nx / T), Math.floor(b.y / T))) b.vx = 0; else b.x = nx;
    b.y += b.vy * dt;
    const tx = Math.floor(b.x / T), ty = Math.floor(b.y / T), cell = ty * w.w + tx;
    // Entrou em água parada (a da queda não conta), bateu no chão ou voltou ao nível de onde
    // saiu: some e deixa ondinha ou respingo
    const inPool = w.waterAtPx(b.x, b.y) && !waterFalling(w, cell);
    if (b.vy > 0 && (inPool || w.isSolid(tx, ty) || b.y > b.home + 2)) {
      if ((inPool && !w.hasWater(tx, ty - 1)) || (!inPool && b.y > b.home + 2)) {   // só na superfície de verdade
        const s = inPool ? (ty + 1) * T - (w.waterLevel(tx, ty) * T) / WATER_MAX : b.y;
        if (Math.random() < 0.1) addRipple(g, b.x, s, 4 + b.r * 2);
        if (Math.random() < 0.3) waveImpulse(g, b.x, s, 6 + b.r * 6, 3);
        if (Math.random() < 0.06) waterParticle(g, b.x, s - 1, (Math.random() - 0.5) * 50, -40 - Math.random() * 60, 0.3);
      } else if (Math.random() < 0.35) waterParticle(g, b.x, ty * T - 1, (Math.random() - 0.5) * 50, -20 - Math.random() * 40, 0.3);
      blobs.splice(i, 1);
      continue;
    }
    if (b.t > 3) blobs.splice(i, 1);
  }
}

// As porções voando são desenhadas juntas, como uma massa só: primeiro a silhueta de todas numa
// camada à parte, depois essa camada vai para a tela na cor da água rasa do jogo, com a linha
// clara da superfície por cima (o mesmo tom da borda de cima da água, js/water.js). Onde as
// bolas se encostam elas viram uma coluna ou uma cortina contínua, sem emenda.
let _blobMask = null, _blobRim = null;
function drawSplashColumns(ctx, g) {
  const blobs = g.waterBlobs;
  if (!blobs?.length) return;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const b of blobs) { x0 = Math.min(x0, b.x - b.r - 4); y0 = Math.min(y0, b.y - b.r - 6); x1 = Math.max(x1, b.x + b.r + 4); y1 = Math.max(y1, b.y + b.r + 6); }
  x0 = Math.floor(x0); y0 = Math.floor(y0);
  const W = Math.min(1024, Math.ceil(x1 - x0) + 2), H = Math.min(768, Math.ceil(y1 - y0) + 2);
  if (!_blobMask || _blobMask.width < W || _blobMask.height < H) {
    _blobMask = makeCanvas(Math.max(W, _blobMask?.width || 0), Math.max(H, _blobMask?.height || 0));
    _blobRim = makeCanvas(_blobMask.width, _blobMask.height);
  }
  const m = _blobMask.getContext('2d'), r = _blobRim.getContext('2d');
  m.globalCompositeOperation = 'source-over'; m.clearRect(0, 0, W, H);
  m.fillStyle = g.lavaFluid?'#ff7026':'#5aa6dc';
  // disco em pixel (sem borrão), com um rastro curto na direção do voo: a gota se alonga
  const disc = (cx, cy, rad) => {
    const R = Math.max(0.6, rad), n = Math.ceil(R);
    for (let dy = -n; dy <= n; dy++) { const half = Math.floor(Math.sqrt(Math.max(0, R * R - dy * dy)) + 0.5); if (half > 0 || Math.abs(dy) < R) m.fillRect(Math.round(cx - half), Math.round(cy + dy), half * 2 + 1, 1); }
  };
  for (const b of blobs) {
    // o rastro cobre o caminho dos últimos ~35 ms: gotas seguidas se emendam num fio contínuo
    const bx = b.x - x0, by = b.y - y0, sp = Math.hypot(b.vx, b.vy), trail = Math.min(18, sp * 0.035, b.t * sp);
    disc(bx, by, b.r);
    if (trail > 1) { const ux = -b.vx / sp, uy = -b.vy / sp; for (let k = 1; k <= trail; k++) disc(bx + ux * k, by + uy * k, b.r * (1 - (k / trail) * 0.3)); }
  }
  // borda de cima: a silhueta clara menos ela mesma descida 1 px
  r.globalCompositeOperation = 'source-over'; r.clearRect(0, 0, W, H);
  r.drawImage(_blobMask, 0, 0, W, H, 0, 0, W, H);
  r.globalCompositeOperation = 'source-in'; r.fillStyle = g.lavaFluid?'#fff18a':'#e4f6ff'; r.fillRect(0, 0, W, H);
  r.globalCompositeOperation = 'destination-out'; r.drawImage(_blobMask, 0, 0, W, H, 0, 1, W, H);
  ctx.save();
  ctx.globalAlpha = g.lavaFluid?1:0.62; ctx.drawImage(_blobMask, 0, 0, W, H, x0, y0, W, H);
  ctx.globalAlpha = 0.8; ctx.drawImage(_blobRim, 0, 0, W, H, x0, y0, W, H);
  ctx.restore();
}

// ---------- Itens soltos: caem com respingo, boiam e dançam com as ondas ----------
// Altura da onda num ponto (px, positiva = mais baixa)
function waveHeightAt(g, x, ty) {
  const q = g.waves?.get(Math.floor(x / T * WAVE.per));
  return q && q.ty === ty ? WAVE.max * Math.tanh(q.h / WAVE.max) : 0;
}
// true = a água cuidou do item neste quadro (chamado de updateDrops, js/item-actions.js)
function dropWaterPhysics(g, d, dt) {
  const w = g.world, tx = Math.floor(d.x / T);
  let ty = Math.floor((d.y + 4) / T);
  const wet = w.hasWater(tx, ty) || (d.floating && w.hasWater(tx, ty + 1));
  if (!wet) { d.floating = false; return false; }
  if (!w.hasWater(tx, ty)) ty++;
  while (ty > 0 && w.hasWater(tx, ty - 1)) ty--;          // sobe até a superfície da coluna
  const surf = w.waterSurfacePx(tx, ty);
  if (surf == null || w.isWaterfall?.(tx, ty)) { d.floating = false; return false; }
  // Entrou caindo: respingo pequeno e onda (sem coluna, é só um item)
  if (!d.floating) {
    d.floating = true;
    if (d.vy > 120) waterImpact(g, d.x, surf, Math.min(0.5, d.vy / 900), true);
    else waveImpulse(g, d.x, surf, 25, 5);
  }
  // Boia: metade do ícone para fora, subindo e descendo com a onda e com um balanço próprio
  const target = surf - 1 + waveHeightAt(g, d.x, Math.floor((surf + 1) / T)) + Math.sin(d.age * 2.2 + d.x * 0.1) * 1.2;
  const rise = target - d.y;
  if (rise < -3) {
    // abaixo da superfície: sobe boiando devagar (no máximo ~22 px/s, mais lento ainda ao chegar), em vez de ser puxado de volta
    const want = -Math.min(22, 5 + (-rise) * 0.22);
    d.vy += (want - d.vy) * Math.min(1, dt * (d.vy > want ? 5 : 2.2));
  } else d.vy += (rise * 40 - d.vy * 6) * dt;       // na linha d'água: mola mansa, balançando com a onda
  const cur = waterCurrentAt(w, d.x, d.y - 2, d.y + 2);   // a correnteza leva o item junto
  d.vx += (cur - d.vx) * Math.min(1, dt * (cur ? 2.5 : 1.2));
  const nx = d.x + d.vx * dt;
  if (w.isSolid(Math.floor(nx / T), Math.floor(d.y / T))) d.vx = -d.vx * 0.3; else d.x = nx;
  d.y += d.vy * dt;
  // Item andando na água deixa marola
  if (Math.abs(d.vx) > 12 && Math.random() < dt * 8) waveImpulse(g, d.x, surf, 10, 4);
  return true;
}

// ---------- Bichos e itens que caem na água também fazem onda ----------
function updateBodySplashes(g) {
  const w = g.world;
  const wetKey=g.lavaFluid?'wasInLava':'wasInWater';
  for (const m of g.mobs) {
    if (m.dead || m.def?.aquatic) continue;
    const inside = bodySubmersion(w, m) > 0.2;
    if (inside && !m[wetKey] && Math.abs(m.vy) > 120) {
      const s = w.waterSurfacePx(Math.floor(m.cx / T), Math.floor(m.cy / T)) ?? w.waterSurfacePx(Math.floor(m.cx / T), Math.floor((m.y + m.h) / T));
      if (s != null) waterImpact(g, m.cx, s, Math.min(1.6, Math.abs(m.vy) / 500) * clamp(m.w / 24, 0.6, 1.6));
    }
    // quem se mexe na água deixa marola
    if (inside && Math.abs(m.vx) > 30 && Math.random() < 0.08) {
      const s = w.waterSurfacePx(Math.floor(m.cx / T), Math.floor(m.cy / T));
      if (s != null) waveImpulse(g, m.cx, s, 14, 6);
    }
    m[wetKey] = inside;
  }
  const p = g.player;
  if (p.swimming && !p.underwater && Math.abs(p.vx) > 40 && Math.random() < 0.25) {
    const s = w.waterSurfacePx(Math.floor(p.cx / T), Math.floor((p.y + 14) / T));
    if (s != null) waveImpulse(g, p.cx - p.facing * 4, s, 22, 6);
  }
}

// ---------- Chuva na água: cada gota abre uma ondinha ----------
function updateRainRipples(g, dt) {
  const rain = g.weather?.rain || 0;
  if (rain < 0.05) return;
  const w = g.world, { vw } = viewSize();
  const x0 = Math.max(1, Math.floor(g.cam.x / T)), x1 = Math.min(w.w - 2, Math.ceil((g.cam.x + vw) / T));
  const tries = rain * dt * 90;
  for (let n = Math.floor(tries + Math.random()); n > 0; n--) {
    const tx = x0 + Math.floor(Math.random() * (x1 - x0 + 1));
    // skyTop ignora a água (aponta para o fundo): sobe pela coluna até a superfície
    let y = w.skyTop[tx] - 1;
    if (!w.hasWater(tx, y)) continue;
    while (y > 0 && w.hasWater(tx, y - 1)) y--;
    const surf = w.waterSurfacePx(tx, y);
    if (surf == null) continue;
    const x = (tx + Math.random()) * T;
    if (!weatherRainAt(g, x, surf - 2)) continue;
    const list = (g.rainRings ??= []);
    list.push({ x, y: surf, t: 0, life: 0.5 + Math.random() * 0.3, r: 3 + Math.random() * 4 });
    if (list.length > 70) list.shift();
    waveImpulse(g, x, surf, 6 + rain * 8, 3);
    if (Math.random() < 0.35) waterParticle(g, x, surf, (Math.random() - 0.5) * 30, -30 - Math.random() * 40, 0.25);
  }
  const list = (g.rainRings ??= []);
  for (let i = list.length - 1; i >= 0; i--) if ((list[i].t += dt) >= list[i].life) list.splice(i, 1);
}

function drawRainRings(ctx, g) {
  const list = g.rainRings;
  if (!list?.length) return;
  ctx.strokeStyle = '#e8f7ff'; ctx.lineWidth = 1;
  for (const r of list) {
    const k = r.t / r.life, rad = 1 + r.r * k;
    ctx.globalAlpha = (1 - k) * 0.75;
    ctx.beginPath(); ctx.ellipse(r.x, r.y + 0.5, rad, Math.max(0.6, rad * 0.25), 0, 0, Math.PI * 2); ctx.stroke();
    // anel de dentro, mais novo
    if (k < 0.5) { ctx.globalAlpha = (0.5 - k) * 0.9; ctx.beginPath(); ctx.ellipse(r.x, r.y + 0.5, rad * 0.45, Math.max(0.5, rad * 0.12), 0, 0, Math.PI * 2); ctx.stroke(); }
  }
  ctx.globalAlpha = 1;
}

// "Tiii... BUM": o chiado agudo da entrada e o baque grave da água fechando
Object.assign(SFX, {
  plunge(A, o, { power = 1 } = {}) {
    N(A, o, { type: 'bandpass', freq: 6200, freqEnd: 2400, q: 3, dur: 0.16, gain: 0.3 * power, attack: 0.005 });
    Tn(A, o, { freq: 1900, freqEnd: 900, dur: 0.12, gain: 0.08 * power });
    Tn(A, o, { freq: 120, freqEnd: 42, dur: 0.55, gain: 0.55 * power, delay: 0.09 });
    N(A, o, { freq: 900, freqEnd: 180, dur: 0.7, gain: 0.6 * power, brown: true, delay: 0.08 });
    grains(A, o, 18, 1200, 5000, 0.6, 0.1 * power, 0.12);
  },
});
