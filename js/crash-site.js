'use strict';

// Destroços do avião espalhados pelo mapa: terreno, fogo, fumaça, brilho e saque.
// dx em tiles a partir do ponto onde o jogador nasce; fogos em px relativos à base do destroço.
// loot: o que dá para vasculhar com o botão direito (cabine de passageiros, cozinha de bordo, cockpit…)
const WRECK_LAYOUT = [
  { kind: 'fuselage', name: 'fuselagem', dx: -3, fires: [[-40, -56, 1.1], [30, -58, 0.9], [88, -24, 1.4]],
    loot: [[ITEM.EMERGENCY_AXE, 1], [ITEM.SNACK, 4], [ITEM.WATER, 3], [ITEM.BLANKET, 2], [ITEM.SEATBELT, 3], [ITEM.CLOTH, 2]] },
  { kind: 'engine', name: 'turbina', dx: -24, fires: [[8, -38, 1.1]], loot: [[ITEM.BOLTS, 6], [ITEM.WIRE, 2], [ITEM.IRON, 2]] },
  { kind: 'wing', name: 'asa', dx: -50, fires: [[-64, -26, 1.2], [-14, -34, 0.7], [50, -30, 0.5]], loot: [[ITEM.BOLTS, 4], [ITEM.WIRE, 2], [ITEM.SCRAP, 3]] },
  { kind: 'tail', name: 'cauda', dx: 33, fires: [[-56, -42, 1.3], [-10, -30, 0.7]],
    loot: [[ITEM.WATER, 4], [ITEM.SNACK, 5], [ITEM.COOKED_MEAT, 2], [ITEM.BLANKET, 1], [ITEM.TORCH, 2]] },
  { kind: 'nose', name: 'cabine', dx: 66, fires: [[-50, -50, 1.2], [26, -22, 0.9]],
    loot: [[ITEM.MEDKIT, 2], [ITEM.WIRE, 4], [ITEM.BOLTS, 2], [ITEM.TORCH, 3], [ITEM.SEATBELT, 1]] },
];
const FIRE_HEAR = 28 * T;       // distância máxima em que o fogo é ouvido
const BAG_SLOTS = 10;

// Nivela o chão sob um destroço, com rampas suaves nas bordas
function levelGround(w, x0, x1, floor) {
  for (let tx = x0 - 5; tx <= x1 + 5; tx++) {
    if (tx < 1 || tx >= w.w - 1) continue;
    const orig = w.surface[tx], k = tx < x0 ? (x0 - tx) / 6 : tx > x1 ? (tx - x1) / 6 : 0;
    const h = Math.round(lerp(floor, orig, k));
    for (let ty = Math.max(0, Math.min(h, orig) - 14); ty <= Math.max(h, orig) + 3; ty++) {
      w.setTile(tx, ty, ty < h ? TILE.AIR : ty === h ? TILE.GRASS : TILE.DIRT);
      w.walls[ty * w.w + tx] = ty <= h ? WALL.NONE : WALL.DIRT;
    }
    w.surface[tx] = h;
  }
}

// REGRA: nenhum destroço flutua. A base do sprite assenta no ponto MAIS ALTO do chão sob a largura inteira dele, e toda coluna mais
// baixa ganha terra até essa altura (nunca se escava o relevo). Vale para os destroços grandes e para as peças soltas.
// Primeira linha sólida da coluna (confere os blocos de verdade: uma boca de gruta pode ter deixado `surface` apontando para o ar)
function groundRow(w, tx) {
  for (let ty = Math.max(0, w.surface[tx] - 12); ty < w.h - 1; ty++) if (SOLID[w.getTile(tx, ty)]) return ty;
  return w.surface[tx];
}
function groundPiece(w, piece) {
  const b = pieceBox(piece), x0 = clamp(Math.floor(b.x0 / T), 1, w.w - 2), x1 = clamp(Math.floor((b.x0 + b.img.width - 1) / T), 1, w.w - 2);
  let top = Infinity;
  for (let tx = x0; tx <= x1; tx++) top = Math.min(top, groundRow(w, tx));
  if (!Number.isFinite(top)) return;
  piece.y = top * T;
  for (let tx = x0; tx <= x1; tx++) {
    const old = groundRow(w, tx);                                              // calculado antes: o laço muda o chão da coluna
    for (let ty = top; ty < old; ty++) { w.setTile(tx, ty, TILE.DIRT); w.walls[ty * w.w + tx] = ty === top ? WALL.NONE : WALL.DIRT; }
    w.surface[tx] = top;
  }
}

// Chão queimado: a grama vira terra (sem flores nem tufos)
function scorch(w, x0, x1, chance) {
  for (let tx = Math.max(0, x0); tx <= Math.min(w.w - 1, x1); tx++)
    if (w.getTile(tx, w.surface[tx]) === TILE.GRASS && hash2(tx, 3, w.seed) < chance) w.setTile(tx, w.surface[tx], TILE.DIRT);
}

function buildCrashSite(g, spawnX) {
  const w = g.world, rnd = mulberry32(w.seed ^ 0x51c3), wrecks = [], debris = [], fires = [];
  for (const L of WRECK_LAYOUT) {
    const art = WRECK_ART[L.kind], cx = clamp(spawnX + L.dx, 12, w.w - 12);
    const half = Math.ceil(art.canvas.width / 2 / T), x0 = cx - half, x1 = cx + half;
    const heights = []; for (let tx = x0; tx <= x1; tx++) heights.push(w.surface[tx]);
    heights.sort((a, b) => a - b);
    levelGround(w, x0, x1, heights[heights.length >> 1]);
    scorch(w, x0 - 3, x1 + 3, 0.85);
    const wreck = { ...L, art, x: cx * T, y: w.surface[cx] * T, searched: false, slots: Array.from({ length: BAG_SLOTS }, (_, i) => (L.loot[i] ? { item: L.loot[i][0], count: L.loot[i][1] } : null)) };
    wrecks.push(wreck);
  }
  scorch(w, spawnX - 22, spawnX - 10, 0.75); // rastro do avião arrastando no chão

  const kinds = Object.keys(WRECK_ART.debris);
  for (let i = 0; i < 34; i++) {
    const near = i < 24 ? wrecks[i % wrecks.length] : null;
    const tx = near ? Math.round(near.x / T + (rnd() < 0.5 ? -1 : 1) * (6 + rnd() * 9)) : spawnX + Math.round((rnd() * 2 - 1) * 90);
    if (tx < 4 || tx > w.w - 4 || (tx >= spawnX - 1 && tx <= spawnX + 5)) continue;
    const list = WRECK_ART.debris[kinds[Math.floor(rnd() * kinds.length)]];
    const d = { img: list[Math.floor(rnd() * list.length)], x: tx * T + rnd() * 8, y: w.surface[tx] * T, flip: rnd() < 0.5 };
    d.hasFire = rnd() < 0.3;
    debris.push(d);
  }
  // Assenta tudo no chão (REGRA: nenhum destroço flutua). Uma peça que sobe o terreno pode enterrar a vizinha: repete até estabilizar.
  const pieces = wrecks.concat(debris);
  for (let pass = 0; pass < 8; pass++) {
    let moved = false;
    for (const p of pieces) { const y0 = p.y; groundPiece(w, p); if (p.y !== y0) moved = true; }
    if (!moved) break;
  }
  // Só depois de assentadas ganham fogo (as chamas nascem relativas à base de cada peça)
  for (const wreck of wrecks) {
    const L = WRECK_LAYOUT.find((l) => l.kind === wreck.kind), art = wreck.art;
    wreck.fires = L.fires.map(([fx, fy, s]) => ({ x: wreck.x + fx, y: wreck.y + fy, s, seed: rnd() * 10, ...fireLook(rnd, s, L.kind === 'engine' && 'tall') }));
    if (L.kind === 'engine') wreck.fires[0].pal = 'fuel'; // querosene vazando da turbina
    else wreck.fires.push({ x: wreck.x + (rnd() - 0.5) * art.canvas.width * 0.7, y: wreck.y + 1, s: 0.7 + rnd() * 0.4, seed: rnd() * 10, ...fireLook(rnd, 1, 'pool') }); // poça de combustível
    integratePieceFires(wreck, wreck.fires.filter((f) => f.style !== 'pool'), rnd); // fogo saindo do metal (js/wreck-fire.js)
    fires.push(...wreck.fires);
  }
  for (const d of debris) if (d.hasFire) {
    fires.push((d.fire = { x: d.x, y: d.y - 4, s: 0.45 + rnd() * 0.3, seed: rnd() * 10, ...fireLook(rnd, 0.6, rnd() < 0.35 ? 'pool' : 'lick') }));
    if (d.fire.style !== 'pool') integratePieceFires(d, [d.fire], rnd);
  }
  for (const f of fires) { f.heat = 1; f.smolder = 0; }
  return { wrecks, debris, fires, smoke: [], embers: [], firesOut: false, rainDousing: false };
}

const firesLit = (g) => !g.intro?.active || g.intro.t >= INTRO_IMPACT;

function updateCrashLoot(g) {
  const ui = g.inventoryUI; if (!g.crashSite) return;
  // Destroço aberto: fecha longe dele; destroço esvaziado conta como vasculhado
  const src = ui.container?.source;
  if (src?.art && !wreckInReach(g, src)) ui.closeContainer();
  for (const w of g.crashSite.wrecks) if (!w.searched && !w.slots.some(Boolean)) {
    w.searched = true;
    const remaining = g.crashSite.wrecks.filter((v) => !v.searched).length;
    toast('Você vasculhou a ' + w.name + '.');
    g.objective = remaining ? `Vasculhe os destroços espalhados (${remaining} restantes).` : 'Todos os destroços vasculhados. Prepare um abrigo antes de anoitecer.';
  }
}

// ---------- Fogo ----------
// A primeira chuva inicia o fim do incêndio do avião, mesmo sob ilhas ou abrigo.
// Cada foco perde calor aos poucos e depois solta vapor; o processo termina mesmo
// se a chuva acabar antes. A exposição à chuva dos outros elementos não muda.
function douseFires(g, dt) {
  const c = g.crashSite; if (!c?.fires || c.firesOut) return;
  c.rainDousing = true;
  let burning = 0;
  for (const f of c.fires) {
    if (f.heat <= 0) continue;
    f.douse ??= Math.random() * 12;
    if ((f.douse -= dt) > 0) { burning++; continue; }
    f.heat -= dt / (5 + f.s * 5);
    if (f.heat > 0) { burning++; continue; }
    f.heat = 0; f.smolder = 12 + Math.random() * 8;
    const near = clamp(1 - Math.hypot(f.x - g.player.cx, f.y - g.player.cy) / FIRE_HEAR, 0, 1);
    if (near > 0) g.crashAudio?.hiss(near);
  }
  if (!burning) { c.firesOut = true; toast('A chuva apagou o fogo dos destroços.'); }
}

function updateCrashSite(g, dt) {
  const c = g.crashSite; if (!c?.fires) return;
  const lit = firesLit(g), p = g.player;
  for (const piece of c.wrecks.concat(c.debris)) if (piece.bar > 0) { piece.bar -= dt; piece.shake = Math.max(0, (piece.shake || 0) - dt); }
  const left = g.cam.x - 300, right = g.cam.x + canvas.width / g.zoom + 300;
  let hear = 0;
  if (lit) for (const f of c.fires) {
    const burning = f.heat > 0;
    if (!burning) { if (f.smolder <= 0) continue; f.smolder -= dt; }
    if (burning) hear = Math.max(hear, clamp(1 - Math.hypot(f.x - p.cx, f.y - p.cy) / FIRE_HEAR, 0, 1) ** 1.6 * f.heat);
    if (f.x < left || f.x > right) continue;
    const steam = f.heat < 1, rate = burning ? 7 * f.s * (steam ? 1.5 : 1) : 4 * f.s * Math.min(1, f.smolder / 6);
    if (c.smoke.length < 320 && Math.random() < dt * rate) {
      const life = 3 + Math.random() * 4;
      c.smoke.push({ x: f.x + (Math.random() - 0.5) * 12 * f.s, y: f.y - 16 * f.s * (burning ? f.heat : 0.3), vx: (Math.random() - 0.5) * 8, vy: -(22 + Math.random() * 18) * (0.7 + f.s * 0.4), r: 3 + Math.random() * 4 * f.s, life, max: life, tone: Math.random(), steam: steam && Math.random() < 0.7 });
    }
    if (burning && f.heat > 0.3 && c.embers.length < 140 && Math.random() < dt * 5 * f.s * f.heat) {
      const life = 0.8 + Math.random() * 1.4;
      c.embers.push({ x: f.x + (Math.random() - 0.5) * 16 * f.s, y: f.y - 10 * f.s, vx: (Math.random() - 0.5) * 30, vy: -40 - Math.random() * 60, life, max: life });
    }
  }
  for (let i = c.smoke.length - 1; i >= 0; i--) {
    const s = c.smoke[i];
    s.x += (s.vx + 10) * dt; s.y += s.vy * dt; s.r = Math.min(s.r + dt * 3.2, 22); s.life -= dt;
    if (s.life <= 0) c.smoke.splice(i, 1);
  }
  for (let i = c.embers.length - 1; i >= 0; i--) {
    const e = c.embers[i];
    e.vx += (Math.random() - 0.5) * 120 * dt; e.x += e.vx * dt; e.y += e.vy * dt; e.vy += 18 * dt; e.life -= dt;
    if (e.life <= 0) c.embers.splice(i, 1);
  }
  if (!g.intro?.active) updateCrashLoot(g);
  if (g.crashAudio) g.crashAudio.tick(dt, lit && !(g.intro?.active && g.intro.t < INTRO_BLACK_END - 1) ? hear : 0);
}

// Bola de fumaça em pixel: quatro retângulos montam um octógono.
// Com dois retângulos em cruz a nuvem virava um quadradão com cantos duros.
function puffBlob(ctx, x, y, r) {
  const a = Math.max(1, Math.round(r));
  const b = Math.max(1, Math.round(r * 0.78));
  const c = Math.max(1, Math.round(r * 0.52));
  const d = Math.max(1, Math.round(r * 0.26));
  ctx.fillRect(x - a, y - d, a * 2, d * 2);
  ctx.fillRect(x - b, y - c, b * 2, c * 2);
  ctx.fillRect(x - c, y - b, c * 2, b * 2);
  ctx.fillRect(x - d, y - a, d * 2, a * 2);
}

function drawSmoke(ctx, list, left = -Infinity, right = Infinity) {
  for (const s of list) {
    if (s.x < left || s.x > right) continue; // fora da tela (a margem de quem chama cobre o raio)
    const age = 1 - s.life / s.max;
    // Quanto maior a nuvem, mais transparente: assim ela some em vez de virar um borrão sólido
    const fade = 1 - clamp((s.r - 12) / 18, 0, 0.55);
    ctx.globalAlpha = Math.min(1, age * 6) * (1 - age) * (s.steam ? 0.4 : 0.55) * fade;
    const v = s.steam ? Math.round(lerp(150, 205, age)) : Math.round(lerp(34, 92, age * 0.7 + s.tone * 0.3));
    ctx.fillStyle = `rgb(${v},${v + (s.steam ? 4 : -3)},${v + (s.steam ? 10 : -6)})`;
    puffBlob(ctx, Math.round(s.x), Math.round(s.y), s.r);
  }
  ctx.globalAlpha = 1;
}

// Chamado no espaço do mundo, antes do jogador (os destroços ficam ao fundo)
function drawCrashSite(ctx, g) {
  const c = g.crashSite; if (!c?.fires || !firesLit(g)) return;
  const left = g.cam.x - 220, right = g.cam.x + canvas.width / g.zoom + 220, t = performance.now() / 1000;
  const inView = (x) => x > left && x < right;
  const flicker = (f) => f.heat < 0.15 && Math.sin(t * 23 + f.seed * 7) < -0.1; // tremula antes de apagar
  // a chama grande sai de dentro do metal: desenhada antes do destroço, a base some atrás da borda
  for (const f of c.fires) if (f.behind && f.heat > 0 && inView(f.x) && !flicker(f)) drawFire(ctx, f, f.s * (0.3 + 0.7 * f.heat), t);
  for (const piece of c.wrecks.concat(c.debris)) {
    const b = pieceBox(piece);
    if (!inView(b.x0 + b.img.width / 2)) continue;
    // Tremida curta enquanto apanha
    const x = Math.round(b.x0) + (piece.shake > 0 ? (Math.random() < 0.5 ? -1 : 1) : 0), y = Math.round(b.y0);
    if (b.flip) { ctx.save(); ctx.translate(x + b.img.width, y); ctx.scale(-1, 1); ctx.drawImage(b.img, 0, 0); ctx.restore(); }
    else ctx.drawImage(b.img, x, y);
  }
  drawSmoke(ctx, c.smoke, left, right);
  for (const f of c.fires) {
    if (f.heat <= 0 || !inView(f.x) || flicker(f)) continue;
    if (!f.behind) { drawFire(ctx, f, f.s * (0.3 + 0.7 * f.heat), t); continue; }
    // na frente: linguinhas lambendo a borda do casco
    for (const l of f.licks || []) if (f.heat > 0.25) drawFire(ctx, { ...l, x: f.x + l.dx, y: f.y - 1 }, f.s * l.k * (0.4 + 0.6 * f.heat), t);
  }
  // Barra de desmontagem acima do destroço que está sendo quebrado
  for (const piece of c.wrecks.concat(c.debris)) {
    if (!(piece.bar > 0) || !piece.maxHp) continue;
    const b = pieceBox(piece), bw = Math.round(clamp(b.img.width * 0.4, 16, 40));
    const bx = Math.round(b.x0 + b.img.width / 2 - bw / 2), by = Math.round(b.y0 - 8);
    ctx.globalAlpha = Math.min(1, piece.bar * 2);
    ctx.fillStyle = '#141414'; ctx.fillRect(bx - 1, by - 1, bw + 2, 5);
    ctx.fillStyle = '#5b5f63'; ctx.fillRect(bx, by, bw, 3);
    ctx.fillStyle = '#e0a44a'; ctx.fillRect(bx, by, Math.round(bw * (1 - clamp(piece.hp / piece.maxHp, 0, 1))), 3);
    ctx.globalAlpha = 1;
  }
  for (const e of c.embers) {
    if (!inView(e.x)) continue;
    ctx.globalAlpha = e.life / e.max;
    ctx.fillStyle = Math.sin(t * 20 + e.x) > 0 ? '#ffd36a' : '#ff7a2a';
    ctx.fillRect(Math.round(e.x), Math.round(e.y), 1, 1);
  }
  ctx.globalAlpha = 1;
}

// Depois da camada de luz: o fogo ilumina o entorno, principalmente à noite
function drawCrashGlow(ctx, g, ox, oy, z) {
  const c = g.crashSite; if (!c?.fires || !firesLit(g) || c.firesOut) return;
  const t = performance.now() / 1000, strength = 1 - g.daylight * 0.65, W = canvas.width;
  ctx.globalCompositeOperation = 'lighter';
  drawPieceFireLights(ctx, g, c, ox, oy, z, t); // casco aceso pelo fogo (js/wreck-fire.js)
  for (const f of c.fires) {
    if (f.heat <= 0) continue;
    const sx = f.x * z - ox, sy = (f.y - 10 * f.s) * z - oy;
    const r = (46 + Math.sin(t * 8 + f.seed) * 4 + Math.sin(t * 13 + f.seed * 3) * 2) * f.s * (0.5 + 0.5 * f.heat) * z;
    if (sx + r < 0 || sx - r > W) continue;
    const a = strength * f.heat, grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
    grad.addColorStop(0, `rgba(255,150,60,${0.34 * a})`);
    grad.addColorStop(0.45, `rgba(255,100,30,${0.12 * a})`);
    grad.addColorStop(1, 'rgba(255,80,20,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(sx - r, sy - r, r * 2, r * 2);
  }
  ctx.globalCompositeOperation = 'source-over';
}

// ---------- Desmontar os destroços ----------
// Segundos segurando o botão com a mão; a picareta multiplica pela velocidade dela
const WRECK_HP = { fuselage: 7, nose: 5.5, tail: 5.5, wing: 4.5, engine: 3.5 };
const WRECK_SCRAP = { fuselage: 14, nose: 9, tail: 9, wing: 7, engine: 6 };
const DEBRIS_HP = 0.9;
const WRECK_HIT_INTERVAL = 0.28; // ritmo das faíscas e do som de metal

// Onde o sprite do destroço (grande ou pequeno) está no mundo
function pieceBox(piece) {
  if (piece.art) { const img = piece.art.canvas; return { img, x0: piece.x - img.width / 2, y0: piece.y - img.height + piece.art.sink, flip: false }; }
  return { img: piece.img, x0: piece.x - piece.img.width / 2, y0: piece.y - piece.img.height + 2, flip: piece.flip };
}

// Teste por pixel: só conta clique em parte visível do sprite
function opaqueAt(img, x, y) {
  if (!img._mask) {
    const d = img.getContext('2d').getImageData(0, 0, img.width, img.height).data, m = new Uint8Array(img.width * img.height);
    for (let i = 0; i < m.length; i++) m[i] = d[i * 4 + 3] > 0 ? 1 : 0;
    img._mask = m;
  }
  x = Math.floor(x); y = Math.floor(y);
  return x >= 0 && y >= 0 && x < img.width && y < img.height && img._mask[y * img.width + x] === 1;
}

function pieceAt(g, wx, wy) {
  const c = g.crashSite; if (!c?.wrecks) return null;
  const hit = (piece) => { const b = pieceBox(piece); const lx = wx - b.x0; return opaqueAt(b.img, b.flip ? b.img.width - 1 - lx : lx, wy - b.y0); };
  for (let i = c.debris.length - 1; i >= 0; i--) if (hit(c.debris[i])) return c.debris[i]; // pequenos ficam por cima
  for (let i = c.wrecks.length - 1; i >= 0; i--) if (hit(c.wrecks[i])) return c.wrecks[i];
  return null;
}

// Botão esquerdo segurado sobre um destroço. Retorna true se o clique foi usado pelo destroço.
function hitCrashPiece(g, dt, wx, wy, heldDef) {
  const piece = pieceAt(g, wx, wy), p = g.player;
  if (!piece) { g.wreckHit = null; return false; }
  if (Math.hypot(wx - p.cx, wy - (p.y + 25)) > REACH * T) return true; // longe demais, mas não mina o bloco atrás
  // O metal do avião só cede a uma picareta de ferro
  if (heldDef !== ITEM_DEFS[ITEM.METAL_PICKAXE]) {
    if (g.toast.t <= 0) toast('Esse metal é duro demais: você precisa de uma picareta de ferro.');
    g.wreckHit = null;
    return true;
  }
  if (!piece.maxHp) piece.hp = piece.maxHp = piece.art ? WRECK_HP[piece.kind] : DEBRIS_HP;
  if (!g.wreckHit || g.wreckHit.piece !== piece) g.wreckHit = { piece, t: WRECK_HIT_INTERVAL };
  const speed = heldDef?.ferramenta === 'picareta' ? heldDef.velocidade || 1 : heldDef?.ferramenta === 'machado' ? 1.5 : 1;
  piece.hp -= dt * speed; piece.bar = 1.5; piece.shake = 0.1;
  p.facing = wx < p.cx ? -1 : 1;

  const s = g.wreckHit;
  if ((s.t += dt) >= WRECK_HIT_INTERVAL) {
    s.t = 0;
    for (let i = 0; i < 7 && g.particles.length < 400; i++) {
      const life = 0.15 + Math.random() * 0.25;
      g.particles.push({ x: wx, y: wy, vx: (Math.random() - 0.5) * 160, vy: -40 - Math.random() * 120, life, maxLife: life, color: i < 3 ? '#ffe7a0' : '#aeb5b8', w: 1 + (i % 2), h: 1 });
    }
    g.crashAudio?.clank();
    g.shake = Math.max(g.shake || 0, 0.6);
  }

  if (piece.hp <= 0) {
    const scrap = piece.art ? WRECK_SCRAP[piece.kind] : 1 + (Math.random() < 0.5 ? 1 : 0);
    if (!g.inventory.canAdd(ITEM.SCRAP, scrap)) { piece.hp = 0.01; if (g.toast.t <= 0) toast('Inventário cheio!'); return true; }
    breakCrashPiece(g, piece, scrap);
  }
  return true;
}

// O destroço some, solta pedaços de metal e entrega a sucata (e o saque que ainda estava nele)
function breakCrashPiece(g, piece, scrap) {
  const c = g.crashSite, isWreck = !!piece.art, b = pieceBox(piece);
  (isWreck ? c.wrecks : c.debris).splice((isWreck ? c.wrecks : c.debris).indexOf(piece), 1);
  const gone = isWreck ? piece.fires : piece.fire ? [piece.fire] : [];
  c.fires = c.fires.filter((f) => !gone.includes(f));

  const colors = ['#d2d7d4', '#9aa2a6', '#5f676c', '#2e2a2a', '#3a5a8a'];
  for (let i = 0; i < (isWreck ? 70 : 14) && g.particles.length < 400; i++) {
    const life = 0.5 + Math.random() * 0.8;
    g.particles.push({ x: b.x0 + Math.random() * b.img.width, y: b.y0 + Math.random() * b.img.height, vx: (Math.random() - 0.5) * 240, vy: -60 - Math.random() * 240, life, maxLife: life, color: colors[i % colors.length], w: 2 + (i % 3), h: 1 + (i % 2) });
  }
  for (let i = 0; i < (isWreck ? 18 : 4) && c.smoke.length < 320; i++) {
    const life = 1.5 + Math.random() * 2;
    c.smoke.push({ x: b.x0 + Math.random() * b.img.width, y: b.y0 + b.img.height * (0.3 + Math.random() * 0.7), vx: (Math.random() - 0.5) * 30, vy: -10 - Math.random() * 20, r: 4 + Math.random() * 6, life, max: life, tone: 0.8, steam: false });
  }

  g.inventory.add(ITEM.SCRAP, scrap);
  let left = 0;
  if (isWreck) {
    if (g.inventoryUI.container?.source === piece) g.inventoryUI.closeContainer();
    for (const s of piece.slots) if (s) left += g.inventory.add(s.item, s.count);
  }
  toast(`+${scrap} Sucata de metal` + (left ? ' (sem espaço para o resto)' : ''));
  g.crashAudio?.breakMetal(isWreck ? 1 : 0.3);
  g.shake = Math.max(g.shake || 0, isWreck ? 3 : 1);
  g.wreckHit = null;

  if (isWreck) {
    const remaining = c.wrecks.filter((w) => !w.searched).length;
    g.objective = remaining ? `Vasculhe os destroços espalhados (${remaining} restantes).` : 'Destroços desmontados. Guarde a sucata para criar itens.';
  }
}

// ---------- Saque dos destroços ----------
// Perto o bastante: dentro da largura do destroço mais o alcance, e mais ou menos na mesma altura
function wreckInReach(g, w) {
  const p = g.player;
  return Math.abs(p.cx - w.x) < w.art.canvas.width / 2 + REACH * T && Math.abs(p.y + p.h - w.y) < 80;
}

function openWreck(g, w) {
  const title = w.name.charAt(0).toUpperCase() + w.name.slice(1);
  g.inventoryUI.openContainer({ title, subtitle: 'Destroço do voo 237', slots: w.slots, source: w, icon: w.art.canvas });
  g.crashAudio?.metal(0, 0.03);
}

// Botão direito sobre um destroço grande: abre a janela com o que dá para aproveitar
function tryOpenWreck(g, wx, wy) {
  const piece = pieceAt(g, wx, wy);
  if (!piece?.art) return false;
  if (!wreckInReach(g, piece)) toast('Chegue mais perto dos destroços.');
  else openWreck(g, piece);
  return true;
}

function crashPrompt(g) {
  if (!g.crashSite) return '';
  const m = screenToWorld(input.mouse.x, input.mouse.y);
  const piece = pieceAt(g, m.x, m.y);
  if (!piece) return '';
  if (piece.art && piece.slots.some(Boolean)) return '[Botão dir.] Vasculhar ' + piece.name;
  const held = g.inventory.slots[g.selected];
  return held?.item === ITEM.METAL_PICKAXE ? '[Botão esq.] Segure para desmontar (sucata de metal)' : 'Desmontar destroços exige picareta de ferro';
}
