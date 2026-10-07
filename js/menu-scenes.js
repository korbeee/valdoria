'use strict';
// =====================================================================================
//  CENAS DO MENU INICIAL  —  o jogo de verdade como pano de fundo
// =====================================================================================
// O fundo do menu é uma sequência de "cinemáticas" feitas com o próprio motor do jogo
// (Renderer.render): cada cena escolhe um lugar, a hora do dia, o clima, os bichos, o que o
// personagem faz e o movimento da câmera. A cada ~26 s uma fade leva para a próxima.
//
//   mundo "cab"   o mundinho da cabana (js/menu-world.js), pronto na hora
//   mundo "real"  um mundo de verdade (semente fixa), gerado aos poucos em segundo plano,
//                 alguns milissegundos por quadro, para não engasgar o menu. As cenas que
//                 dependem dele só entram na rodada quando ele fica pronto.
//
// Por cima de tudo passa o shader cinematográfico (js/menu-fx.js). Tudo é desligado quando o
// jogo começa; o estado do jogo é trocado só durante o desenho do menu e devolvido em seguida.

const MENU = {
  seed: 104, cab: null, real: null, realGen: null, realW: null, realFail: false, bgs: new Map(), fx: null,
  scene: null, sc: null, sceneT: 0, history: [], last: 0, born: 0, mobs: [], particles: [], npcs: [], player: null, weather: null, inp: null,
  pilot: null, day: -1, failed: false, dev: null, gulls: [], fireflies: [], t: 0, lightFor: null,
};

class MenuInput { constructor() { this.k = new Set(); this.mouse = { left: false, right: false, x: 0, y: 0 }; } down(c) { return this.k.has(c); } }

// valores-base do shader (cada cena sobrescreve o que precisar)
const MENU_FX_BASE = { thresh: 0.8, bloom: 0.5, rayAmt: 0.3, exposure: 1.0, contrast: 1.24, sat: 1.38, filmic: 0.3, vig: 0.5, ab: 0.0012, tilt: 0.5, grain: 0.04, haze: 0 };

// ---------------------------------------------------------------- mundos
function menuInferno() { return (MENU.inf ??= buildInfernoWorld()); }
function menuCab() {
  if (!MENU.cab) { MENU.cab = buildMenuWorld(); }
  return MENU.cab;
}
// Gera o mundo real em fatias (orçamento por quadro), só quando o menu principal está parado
function menuRealStep(ms) {
  if (MENU.real || MENU.realFail) return;
  try {
    if (!MENU.realGen) { const S = WORLD_SIZES.pequeno; MENU.realW = new World(S.w, S.h, MENU.seed, { lazy: true }); MENU.realGen = MENU.realW.generateSteps(); }
    const end = performance.now() + ms;
    for (;;) {
      const r = MENU.realGen.next();
      if (r.done) { MENU.real = MENU.realW; MENU.realGen = null; MENU.real.generated = true; MENU.real.lootChests ??= []; break; }
      if (performance.now() > end) break;
    }
  } catch (e) { console.warn('[menu] mundo real indisponível:', e); MENU.realFail = true; MENU.realGen = null; MENU.realW = null; }
}
function menuRelease() { // o jogo começou: solta tudo que era só do menu
  if (!MENU.cab && !MENU.realW && !MENU.real) return;
  MENU.still = null; MENU.cab = MENU.inf = MENU.real = MENU.realW = MENU.realGen = null; MENU.bgs.clear(); MENU.scene = null; MENU.mobs = []; MENU.particles = []; MENU.npcs = [];
  if (MENU.fx?.canvas) { MENU.fx.canvas.width = MENU.fx.canvas.height = 1; }
}

// ---------------------------------------------------------------- utilidades de cena
const menuSolid = (w, x, y) => SOLID[w.getTile(x, y)] === 1;
// primeira linha sólida com ar livre em cima, a partir de y0
function menuGroundBelow(w, x, y0, room = 3) {
  for (let y = y0; y < w.h - 2; y++) if (menuSolid(w, x, y) && !menuSolid(w, x, y - 1) && !w.hasWater(x, y - 1) && [...Array(room)].every((_, k) => !menuSolid(w, x, y - 1 - k))) return y;
  return -1;
}
function menuPlacePlayer(M, w, tx, ty) { const p = M.player; p.x = tx * T + (T - p.w) / 2; p.y = ty * T - p.h - 0.01; p.vx = p.vy = 0; p.seat = null; p.swimming = false; p.onGround = true; }
function menuSit(M, w, tx, ty, facing) {
  const spot = findFurnitureSpot(w, TILE.CHAIR, tx, ty);
  if (!spot) return false;
  placeFurniture(w, TILE.CHAIR, spot.ax, spot.ay); (w.chairFacing ??= new Map()).set(spot.ay * w.w + spot.ax, facing);
  M.player.seat = null; M.player.sitOn(w, spot.ax, spot.ay, facing); M.player.updateSeat(0, w, false);
  return true;
}
function menuMob(M, w, kind, tx, ty, opt = {}) {
  const m = new Wildlife(kind, tx * T, ty * T); m.keep = true;
  if (!m.def.aquatic) m.y = ty * T - m.h - 0.01;
  else { m.x = tx * T + T / 2 - m.w / 2; m.y = ty * T + T / 2 - m.h / 2; m.variant = Math.floor(Math.random() * 3); m.dir = Math.random() < 0.5 ? -1 : 1; m.facing = m.dir; m.home = { x: m.cx, y: m.cy }; }
  Object.assign(m, opt); M.mobs.push(m); return m;
}
// chão plano (±room colunas) e livre por cima, o mais perto possível de x; devolve a linha do chão
function menuFlatSpot(w, x, room = 3, free = 7) {
  for (let d = 0; d < 60; d++) for (const s of d ? [-1, 1] : [1]) {
    const tx = x + d * s, y = menuGroundBelow(w, tx, Math.max(2, w.surface[tx] - 30), free); if (y < 0) continue;
    let ok = true; for (let k = -room; k <= room && ok; k++) { const yy = menuGroundBelow(w, tx + k, Math.max(2, w.surface[tx + k] - 30), free); ok = yy >= 0 && Math.abs(yy - y) <= 1; }
    if (ok) return { x: tx, y };
  }
  return { x, y: w.surface[x] };
}
function menuPark(M) { return { cx: -99999, cy: -99999, x: -99999, y: -99999, w: 14, h: 42, hp: 100 }; }

// pequenos sprites desenhados à mão (pixel inteiro), por cima da cena
function menuGull(ctx, x, y, ph) {
  const up = Math.sin(ph * 6) > 0;
  ctx.fillStyle = '#f4f2ea'; x = Math.round(x); y = Math.round(y);
  if (up) { ctx.fillRect(x - 4, y - 2, 2, 1); ctx.fillRect(x - 2, y - 1, 2, 1); ctx.fillRect(x, y, 1, 1); ctx.fillRect(x + 1, y - 1, 2, 1); ctx.fillRect(x + 3, y - 2, 2, 1); }
  else { ctx.fillRect(x - 4, y, 2, 1); ctx.fillRect(x - 2, y - 1, 2, 1); ctx.fillRect(x, y - 1, 1, 1); ctx.fillRect(x + 1, y - 1, 2, 1); ctx.fillRect(x + 3, y, 2, 1); }
  ctx.fillStyle = '#c9c4b6'; ctx.fillRect(x, y + 1, 1, 1);
}
function menuSailboat(ctx, x, wy, t, lit) {
  x = Math.round(x); const bob = Math.round(Math.sin(t * 0.9 + x) * 0.8), y = Math.round(wy) + bob, sail = lit ? ['#f6dcae', '#e7b878', '#c58a54'] : ['#d9d2c2', '#b7ac98', '#8e8470'];
  for (let i = 0; i < 12; i++) { ctx.fillStyle = sail[0]; ctx.fillRect(x - 2 + Math.floor(i * 0.55), y - 24 + i, 8 - Math.floor(i * 0.45), 1); }   // vela grande
  for (let i = 0; i < 9; i++) { ctx.fillStyle = sail[1]; ctx.fillRect(x - 12 + Math.floor(i * 1.1), y - 16 + i, 9 - Math.floor(i * 0.95), 1); } // vela menor
  ctx.fillStyle = '#4a3320'; ctx.fillRect(x + 2, y - 26, 1, 24); ctx.fillStyle = sail[2]; ctx.fillRect(x - 1, y - 12, 8, 1);
  for (let i = 0; i < 7; i++) { ctx.fillStyle = i < 2 ? '#7a5532' : '#4d3420'; ctx.fillRect(x - 14 + i, y - 3 + (i > 4 ? 1 : 0), 30 - i * 2, 1 + (i > 1 ? 1 : 0)); }         // casco
  ctx.fillStyle = '#ffd98a'; ctx.fillRect(x + 12, y - 8, 1, 2);                                                                                      // lanterna
  ctx.fillStyle = 'rgba(255,200,120,.22)'; ctx.fillRect(x + 10, y - 10, 5, 6);
  ctx.fillStyle = 'rgba(255,220,160,.18)'; ctx.fillRect(x - 12, y + 2, 28, 1);                                                                        // reflexo
}
function menuRod(ctx, hx, hy, dir, t, bite, wy) {
  const tipX = hx + dir * 16, tipY = hy - 22 + (bite > 0 ? Math.sin(t * 28) * 0.8 : 0), bx = tipX + dir * 24, by = wy + (bite > 0 ? 3 * bite : Math.sin(t * 1.7) * 0.6);
  const line = (x0, y0, x1, y1, col) => { x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1); const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy; ctx.fillStyle = col; for (let n = 0; n < 300; n++) { ctx.fillRect(x0, y0, 1, 1); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } } };
  line(hx, hy, tipX, tipY, '#5a3d22'); line(hx + dir, hy - 1, tipX, tipY - 1, '#8a6238');
  // linha frouxa em curva até a boia
  const mx = (tipX + bx) / 2, my = Math.max(tipY, by) - 3 + (bite > 0 ? 3 : 0);
  line(tipX, tipY, mx, my, 'rgba(235,240,240,.75)'); line(mx, my, bx, by - 1, 'rgba(235,240,240,.75)');
  ctx.fillStyle = '#f5f5f0'; ctx.fillRect(Math.round(bx) - 1, Math.round(by) - 2, 3, 2); ctx.fillStyle = '#e24a3a'; ctx.fillRect(Math.round(bx) - 1, Math.round(by), 3, 1);
  ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(Math.round(bx) - 3 - Math.floor((t * 3) % 3), Math.round(wy), 7 + 2 * Math.floor((t * 3) % 3), 1);
  return { bx, by };
}

// ---------------------------------------------------------------- cenas
const MENU_SCENES = [];
const menuScene = (s) => MENU_SCENES.push(s);

menuScene({
  id: 'cabana', name: 'Cabana ao entardecer', world: 'cab', dur: 28,
  time: (u) => 0.43 + 0.075 * u, weather: { fog: 0.16, wind: 10 },
  fx: { sun: [0.94, 0.88], rayAmt: 0.5, rayLen: 0.92, bloom: 0.55, thresh: 0.7, exposure: 1.04, sat: 1.4, sunGlow: 0.3, rayCol: [1, .72, .42], shadow: [.82, .88, 1.15], high: [1.2, 1.0, .78] },
  setup(M, w) {
    M.sc = { cam: { fx: MW.house + 5.5, fy: MW.plateau, sx: 0.56, sy: 0.66, tiles: 62, drift: [12, 0] } };
    const p = M.player; if (w.menuSeat) { p.seat = null; p.sitOn(w, w.menuSeat.ax, w.menuSeat.ay, 1); p.updateSeat(0, w, false); }
    M.npcs = [new Villager({ x: (MW.oak - 4) * T, y: w.surface[MW.oak - 4] * T, minX: MW.oak - 8, maxX: MW.oak - 2, seed: 0.37, profession: 0 })];
    const mob = (kind, tx, dy = 0) => menuMob(M, w, kind, tx, w.surface[tx] - 1 + 1 + dy);
    mob('forest_deer', MW.cliff + 58); mob('forest_deer', MW.cliff + 63); mob('rabbit', 88); mob('rabbit', 98);
    const b1 = menuMob(M, w, 'bird', 100, 40); b1.y = 40 * T; const b2 = menuMob(M, w, 'bird', 118, 36); b2.y = 36 * T;
    M.fireflies = Array.from({ length: 26 }, () => ({ x: 60 + Math.random() * 90, y: 45 + Math.random() * 13, ph: Math.random() * 6.28, sp: 0.3 + Math.random() * 0.6 }));
    M.sc.smoke = { x: (MW.house + 8) * T + 6, y: 41 * T + 8 }; M.sc.fire = { x: MW.fire * T + 8, y: (MW.plateau - 1) * T + 6 };
  },
  update(M, w, dt) {
    if (Math.random() < dt * 5) M.particles.push({ x: M.sc.smoke.x + Math.random() * 6, y: M.sc.smoke.y, vx: 6 + Math.random() * 8, vy: -14 - Math.random() * 10, life: 4, maxLife: 4, color: 'rgba(190,190,196,.5)', w: 3, h: 3, gravity: -4 });
    if (Math.random() < dt * 14) M.particles.push({ x: M.sc.fire.x + (Math.random() - .5) * 4, y: M.sc.fire.y, vx: (Math.random() - .5) * 18, vy: -30 - Math.random() * 30, life: 1.2, maxLife: 1.2, color: Math.random() < .5 ? '#ffb347' : '#ff7a2a', w: 1, h: 1, gravity: -10 });
    for (const f of M.fireflies) { f.x += Math.sin(M.t * f.sp + f.ph) * dt * 1.4; f.y += Math.cos(M.t * f.sp * 1.3 + f.ph) * dt * 0.8; }
  },
});

menuScene({
  id: 'riacho', name: 'Brincando na água', world: 'real', dur: 30,
  time: (u) => 0.285 + 0.04 * u, weather: { fog: 0.0, wind: 16 },
  fx: { sun: [0.62, 1.03], rayAmt: 0.5, rayLen: 0.92, sunGlow: 0.28, bloom: 0.5, exposure: 1.05, sat: 1.45, rayCol: [1, .95, .76], shadow: [.8, .94, 1.14], high: [1.1, 1.02, .86] },
  ready: (M) => !!M.real,
  setup(M, w) {
    const sea = w.seaLevel, oc = w.oceanStart; let shore = oc;
    for (let x = oc - 12; x < oc + 90; x++) if (w.surface[x] > sea + 1) { shore = x; break; }
    // limpa o trecho (sem mato e sem o cais da outra cena), para a areia ficar livre
    M.sc = { cam: { fx: shore, fy: sea - 1, sx: 0.55, sy: 0.6, tiles: 46, drift: [0, 0] }, shore, sea, mode: 'wade', hop: 1.2, dir: 1, t: 0 };
    for (let x = shore - 24; x <= shore + 40; x++) for (let y = sea - 16; y < sea; y++) if (!w.hasWater(x, y) && (w.tiles[y * w.w + x] === TILE.TRUNK || w.tiles[y * w.w + x] === TILE.LEAVES)) w.tiles[y * w.w + x] = TILE.AIR;
    // começa na areia seca, uns passos antes da água
    let lx = shore - 10, g = -1; for (let x = shore - 4; x > shore - 60 && g < 0; x--) { const gy = menuGroundBelow(w, x, sea - 24, 3); if (gy > 0 && gy <= sea - 1) { lx = x - 6; g = menuGroundBelow(w, lx, sea - 24, 3); } }
    M.sc.landX = lx; menuPlacePlayer(M, w, lx, g > 0 ? g : sea - 2);
    ['sardine', 'sardine', 'sardine', 'sardine', 'clownfish', 'clownfish', 'tang', 'angelfish', 'puffer'].forEach((k, i) => menuMob(M, w, k, shore + 8 + i * 3, sea + 3 + (i % 3) * 2));
    M.gulls = Array.from({ length: 7 }, (_, i) => ({ x: (shore - 6 + i * 6) * T, y: (sea - 9 - (i % 3) * 4 - Math.random() * 3) * T, ph: Math.random() * 6, sp: 0.18 + Math.random() * 0.2 }));
  },
  update(M, w, dt) {
    const S = M.sc, p = M.player, k = M.inp.k; S.t += dt; S.hop -= dt; k.clear();
    S.camX = (S.camX ?? p.cx / T) + (p.cx / T - (S.camX ?? p.cx / T)) * Math.min(1, dt * 1.2); S.cam.fx = S.camX + 3;
    // entra correndo na água, pula nas ondas, volta para a areia e repete
    const surfY = S.sea * T, deep = p.y + p.h * 0.5 > surfY + 4;
    if (S.dir > 0 && p.cx > (S.shore + 9) * T) S.dir = -1; else if (S.dir < 0 && p.cx < (S.landX + 2) * T) S.dir = 1;
    k.add(S.dir > 0 ? 'KeyD' : 'KeyA');
    if (S.hop <= 0) { k.add('Space'); if (S.hop < -0.2) S.hop = 0.8 + Math.random() * 1.4; }
    if (deep && p.y + p.h * 0.3 > surfY) k.add('Space');
    if (p.vx < -1) p.facing = -1; else if (p.vx > 1) p.facing = 1;
    for (const g of M.gulls) { g.ph += dt * 1.2; g.x += Math.cos(g.ph * g.sp * 5) * dt * 14 + 3 * dt; g.y += Math.sin(g.ph * 0.9) * dt * 3; }
  },
  after(ctx, M) { for (const gl of M.gulls) menuGull(ctx, gl.x, gl.y, gl.ph); },
});

menuScene({
  id: 'mar', name: 'Pesca ao pôr do sol', world: 'real', dur: 30,
  time: (u) => 0.465 + 0.05 * u, weather: { fog: 0.06, wind: 22 },
  fx: { sun: [0.7, 0.53], rayAmt: 0.4, rayLen: 0.95, bloom: 0.6, exposure: 1.04, sat: 1.4, sunGlow: 0.25, rayCol: [1, .62, .34], haze: 0.04, hazeCol: [1, .66, .44], shadow: [.74, .84, 1.16], high: [1.22, 1.0, .74] },
  ready: (M) => !!M.real,
  setup(M, w) {
    const sea = w.seaLevel, oc = w.oceanStart; let shore = oc;
    for (let x = oc - 12; x < oc + 90; x++) if (w.surface[x] > sea + 1) { shore = x; break; }
    const deck = sea - 1, x0 = shore - 5, x1 = shore + 22;
    { const sx0 = x0 - 8, sx1 = x1 + 8, sy0 = deck - 16, sy1 = Math.min(w.h - 1, sea + 60), n = (sx1 - sx0 + 1) * (sy1 - sy0 + 1), tl = new Uint8Array(n), wl = new Uint8Array(n); let q = 0; for (let y = sy0; y <= sy1; y++) for (let x = sx0; x <= sx1; x++, q++) { tl[q] = w.tiles[y * w.w + x]; wl[q] = w.walls[y * w.w + x]; } w.menuUndo = { sx0, sx1, sy0, sy1, tl, wl }; }
    for (let x = x0 - 6; x <= x1 + 6; x++) for (let y = deck - 14; y < deck; y++) if (!w.hasWater(x, y)) w.tiles[y * w.w + x] = TILE.AIR;   // limpa árvores e mato
    for (let x = x0; x <= x1; x++) sSet(w, x, deck, TILE.PLANKS);
    for (let x = x0 + 2; x <= x1; x += 5) for (let y = deck + 1; y < w.h && !menuSolid(w, x, y); y++) sSet(w, x, y, TILE.BEAM);
    for (const lx of [x0 + 6, x1 - 1]) { for (let k = 1; k <= 3; k++) sSet(w, lx, deck - k, TILE.CARVED_BEAM); sSet(w, lx, deck - 4, TILE.LANTERN); }
    sSet(w, x0 + 12, deck - 1, TILE.BARREL ?? TILE.PLANKS);
    const cx = x1 - 4; menuSit(M, w, cx, deck - 1, 1);
    M.sc = { cam: { fx: x1 - 6, fy: deck - 1, sx: 0.58, sy: 0.62, tiles: 60, drift: [8, -1] }, deck, wy: sea * T, x1, rod: null, bite: 0, nextBite: 6 };
    const fish = ['sardine', 'sardine', 'sardine', 'sardine', 'sardine', 'clownfish', 'clownfish', 'tang', 'angelfish', 'puffer', 'jellyfish', 'jellyfish'];
    fish.forEach((k, i) => menuMob(M, w, k, x1 + 4 + i * 3 + (i % 4), sea + 4 + (i % 5) * 2));
    M.gulls = Array.from({ length: 6 }, (_, i) => ({ x: (x1 - 6 + i * 6) * T, y: (deck - 6 - (i % 3) * 4 - Math.random() * 3) * T, ph: Math.random() * 6, r: 40 + Math.random() * 40, sp: 0.18 + Math.random() * 0.2 }));
    M.sc.boat = { x: (x1 + 20) * T, v: 3.2 };
  },
  update(M, w, dt) {
    const S = M.sc; S.nextBite -= dt; if (S.nextBite <= 0) { S.bite = 1.6; S.nextBite = 8 + Math.random() * 5; }
    if (S.bite > 0) { S.bite -= dt; if (S.bite < 1.45 && S.bite + dt >= 1.45) for (let i = 0; i < 10; i++) M.particles.push({ x: S.lastBx ?? 0, y: S.wy, vx: (Math.random() - .5) * 60, vy: -60 - Math.random() * 60, life: .6, maxLife: .6, color: '#d8f1ff', w: 1, h: 1, gravity: 300 }); }
    S.boat.x += S.boat.v * dt;
    for (const g of M.gulls) { g.ph += dt * 1.2; g.x += Math.cos(g.ph * g.sp * 5) * dt * 14 + 3 * dt; g.y += Math.sin(g.ph * 0.9) * dt * 3; }
  },
  after(ctx, M, g, t) {
    const S = M.sc, p = M.player;
    const r = menuRod(ctx, p.cx + p.facing * 4, p.y + 24, 1, t, S.bite, S.wy); S.lastBx = r.bx;
    for (const gl of M.gulls) menuGull(ctx, gl.x, gl.y, gl.ph);
    menuSailboat(ctx, S.boat.x, S.wy - 1, t, true);
    // reflexo do sol na água: tracinhos brilhantes que piscam, mais largos perto de quem olha
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); const W = ctx.canvas.width, H = ctx.canvas.height;
    for (let i = 0; i < 70; i++) { const k = i / 70, y = H * (0.5 + k * 0.17), wd = 6 + k * 70, x = W * 0.7 + Math.sin(t * 1.3 + i * 2.1) * wd * 0.5 + (hash2(i, 3, 5) - .5) * wd; const a = 0.5 * (0.35 + 0.65 * Math.max(0, Math.sin(t * 2.4 + i * 1.7))) * (1 - k * 0.5); ctx.fillStyle = `rgba(255,214,150,${a})`; ctx.fillRect(Math.round(x), Math.round(y), 4 + Math.round(k * 12), 2); }
    ctx.restore();
  },
});


// ---------------------------------------------------------------- mais cenas (mundo real)
// Passeio lento do personagem, sem a física completa: segue o chão, vira nas beiradas, faz pausas
function menuStroll(M, w, dt, x0, x1, spd = 38) {
  const p = M.player, S = M.sc; S.manual = true; S.dir ??= 1; S.pause = (S.pause ?? 0) - dt;
  if (S.pause > 0) { p.vx = 0; return; }
  if (Math.random() < dt * 0.12) { S.pause = 1.6 + Math.random() * 2.6; p.vx = 0; return; }
  if (p.cx < x0 * T) S.dir = 1; else if (p.cx > x1 * T) S.dir = -1;
  const nx = p.x + S.dir * spd * dt, tx = Math.floor((nx + p.w / 2) / T), gy = menuGroundBelow(w, tx, Math.floor(p.y / T) - 4, 4);
  if (gy < 0 || Math.abs(gy * T - (p.y + p.h)) > T * 2.5) { S.dir = -S.dir; p.vx = 0; return; }
  p.x = nx; p.y = gy * T - p.h - 0.01; p.vx = S.dir * spd; p.facing = S.dir; p.anim += spd * dt * 0.1; p.onGround = true;
}
const menuRuns = (arr, k, min = 40) => { const out = []; let a = -1; for (let x = 0; x <= arr.length; x++) { const inside = x < arr.length && arr[x] === k; if (inside && a < 0) a = x; else if (!inside && a >= 0) { out.push([a, x - 1]); a = -1; } } return out.filter(([a, b]) => b - a > min); };
function menuBiomeCenter(w, biome, pick = 0) { const r = biomeRuns(w, biome).filter(([a, b]) => b - a > 60).sort((p, q) => (q[1] - q[0]) - (p[1] - p[0]))[pick] || biomeRuns(w, biome)[0]; return r ? Math.round((r[0] + r[1]) / 2) : -1; }
const menuFlora = (w, x0, x1) => { for (let x = x0; x <= x1; x++) for (let y = w.surface[x] - 1; y > w.surface[x] - 4; y--) w.tiles[y * w.w + x] === TILE.TRUNK; };
// acampamento: fogueira + cadeira virada para ela, num trecho de chão plano (limpa o mato em volta)
function menuCamp(M, w, cx, facing = 1) {
  const g = w.surface[cx]; for (let x = cx - 6; x <= cx + 6; x++) for (let y = g - 8; y < g; y++) if (w.tiles[y * w.w + x] === TILE.TRUNK || w.tiles[y * w.w + x] === TILE.LEAVES) w.tiles[y * w.w + x] = TILE.AIR;
  sSet(w, cx + facing * 3, w.surface[cx + facing * 3] - 1, TILE.CAMPFIRE);
  return menuSit(M, w, cx, w.surface[cx] - 1, facing);
}

// ilha do jardim suspenso mais comprida (chão contínuo), perto do meio do primeiro trecho largo
function menuSkyIsland(w) {
  if (w.menuIsland !== undefined) return w.menuIsland;
  let best = null;
  for (const [a, b] of menuRuns(w.skyZone || [], SKY_ZONE.JARDIM, 80)) {
    let run = null;
    for (let x = a + 10; x <= b - 10; x++) {
      let y = -1;
      for (let yy = 8; yy < (w.skyFloor?.[x] ?? 0) - 2; yy++) if (menuSolid(w, x, yy) && !menuSolid(w, x, yy - 1) && w.getTile(x, yy) !== TILE.CLOUD && !menuSolid(w, x, yy - 2) && !menuSolid(w, x, yy - 3)) { y = yy; break; }
      if (y > 0 && run && Math.abs(y - run.y) <= 2) { run.x1 = x; run.y = y; } else { if (run && run.x1 - run.x0 >= 14 && (!best || run.x1 - run.x0 > best.x1 - best.x0)) best = run; run = y > 0 ? { x0: x, x1: x, y } : null; }
    }
    if (run && run.x1 - run.x0 >= 14 && (!best || run.x1 - run.x0 > best.x1 - best.x0)) best = run;
    if (best && best.x1 - best.x0 >= 18) break;
  }
  return (w.menuIsland = best);
}

menuScene({
  id: 'ceu', name: 'Acima das nuvens', world: 'real', dur: 30,
  time: (u) => (0.968 + 0.075 * u) % 1, weather: { fog: 0.0, wind: 30 },
  fx: { sun: [0.22, 0.5], rayAmt: 0.5, rayLen: 0.95, sunGlow: 0.32, bloom: 0.55, exposure: 1.05, sat: 1.42, rayCol: [1, .74, .52], shadow: [.8, .86, 1.16], high: [1.22, 1.0, .78], haze: 0.05, hazeCol: [1, .7, .6] },
  ready: (M) => !!menuSkyIsland(M.real),
  setup(M, w) {
    const I = menuSkyIsland(w), cx = Math.round((I.x0 + I.x1) / 2), y = I.y;
    M.sc = { cam: { fx: cx + 2, fy: y, sx: 0.58, sy: 0.6, tiles: 66, drift: [10, -2] }, x0: I.x0 + 3, x1: I.x1 - 3 };
    menuPlacePlayer(M, w, cx, y);
    menuMob(M, w, 'skyray', cx + 14, y - 9); menuMob(M, w, 'skyray', cx - 18, y - 14); menuMob(M, w, 'windjelly', cx + 6, y - 12); menuMob(M, w, 'windjelly', cx - 8, y - 7);
  },
  update(M, w, dt) { menuStroll(M, w, dt, M.sc.x0, M.sc.x1, 30); },
});

menuScene({
  id: 'inferno', name: 'Ossário do Coração', world: 'inf', dur: 30,
  time: () => 0.3, weather: { fog: 0.0, wind: 0 },
  fx: { rayAmt: 0, sunGlow: 0, bloom: 0.85, thresh: 0.5, exposure: 1.5, contrast: 1.18, sat: 1.4, vig: 0.58, shadow: [1.1, .78, .72], high: [1.3, .95, .62], tilt: 0.45 },
  setup(M, w) {
    const [a, b, f] = MI.ledgeA;
    M.sc = { cam: { fx: 84, fy: f - 3, sx: 0.58, sy: 0.54, tiles: 70, drift: [-14, 0] }, x0: 66, x1: 88 };
    menuPlacePlayer(M, w, 72, f);
    menuMob(M, w, 'salamandra', 150, MI.ledgeB[2]);
  },
  update(M, w, dt) { menuStroll(M, w, dt, M.sc.x0, M.sc.x1, 26); updateCore(game, dt); },
});

menuScene({
  id: 'sakura', name: 'Vale das Cerejeiras', world: 'real', dur: 30,
  time: (u) => 0.42 + 0.05 * u, weather: { fog: 0.1, wind: 18 },
  fx: { sun: [0.9, 0.82], rayAmt: 0.45, sunGlow: 0.3, bloom: 0.6, sat: 1.4, rayCol: [1, .72, .66], shadow: [.88, .82, 1.14], high: [1.2, .98, .88], haze: 0.05, hazeCol: [1, .75, .8] },
  ready: (M) => menuBiomeCenter(M.real, BIOME.SAKURA) > 0,
  setup(M, w) {
    const cx = menuBiomeCenter(w, BIOME.SAKURA), g = w.surface[cx];
    M.sc = { cam: { fx: cx + 3, fy: g, sx: 0.58, sy: 0.64, tiles: 60, drift: [12, 0] }, x0: cx - 10, x1: cx + 10 };
    menuPlacePlayer(M, w, cx, g);
    for (const [k, dx] of [['sika', 12], ['sika', 17], ['tsuru', -14], ['tanuki', 6], ['kitsune', -22]]) { const s = menuFlatSpot(w, cx + dx, 2); menuMob(M, w, k, s.x, s.y); }
  },
  update(M, w, dt) { menuStroll(M, w, dt, M.sc.x0, M.sc.x1, 34); },
});

menuScene({
  id: 'neve', name: 'Noite na tundra', world: 'real', dur: 30, wx: ['snow', 0.9], moon: 0.34,
  time: (u) => 0.7 + 0.03 * u, weather: { wind: 14 },
  fx: { rayAmt: 0, sunGlow: 0, bloom: 0.7, thresh: 0.6, exposure: 1.12, sat: 1.25, vig: 0.58, shadow: [.7, .84, 1.3], high: [1.2, 1.0, .82] },
  ready: (M) => menuBiomeCenter(M.real, BIOME.SNOW) > 0,
  setup(M, w) {
    const cx = menuBiomeCenter(w, BIOME.SNOW), g = w.surface[cx];
    M.sc = { cam: { fx: cx + 3, fy: g, sx: 0.58, sy: 0.64, tiles: 54, drift: [-6, 0] } };
    menuCamp(M, w, cx, 1);
    for (const [k, dx] of [['snowhare', 14], ['snowhare', -12], ['frostwolf', 30]]) { const s = menuFlatSpot(w, cx + dx, 2); menuMob(M, w, k, s.x, s.y); }
    w.lightDirty = true;
  },
  update(M, w, dt) { if (Math.random() < dt * 12) M.particles.push({ x: M.player.cx + 3 * T + (Math.random() - .5) * 4, y: (w.surface[Math.floor(M.player.cx / T) + 3] - 1) * T + 6, vx: (Math.random() - .5) * 16, vy: -30 - Math.random() * 30, life: 1.2, maxLife: 1.2, color: Math.random() < .5 ? '#ffb347' : '#ff7a2a', w: 1, h: 1, gravity: -10 }); },
});

menuScene({
  id: 'savana', name: 'Savana ao pôr do sol', world: 'real', dur: 30,
  time: (u) => 0.455 + 0.05 * u, weather: { fog: 0.05, wind: 12 },
  fx: { sun: [0.3, 0.52], rayAmt: 0.5, sunGlow: 0.4, bloom: 0.6, sat: 1.45, rayCol: [1, .6, .3], shadow: [.78, .82, 1.1], high: [1.26, 1.0, .72], haze: 0.07, hazeCol: [1, .6, .35] },
  ready: (M) => menuBiomeCenter(M.real, BIOME.SAVANNA) > 0,
  setup(M, w) {
    const cx = menuBiomeCenter(w, BIOME.SAVANNA), g = w.surface[cx];
    M.sc = { cam: { fx: cx + 3, fy: g, sx: 0.55, sy: 0.66, tiles: 66, drift: [14, 0] } };
    menuPlacePlayer(M, w, cx - 3, w.surface[cx - 3]); M.player.facing = 1;
    for (const [dx, k] of [[12, 'elephant'], [24, 'elephant'], [36, 'elephant']]) { const s = menuFlatSpot(w, cx + dx, 5, 8); menuMob(M, w, k, s.x, s.y); }
    menuMob(M, w, 'bird', cx + 12, w.surface[cx + 12] - 12);
  },
  update(M, w, dt) { M.sc.manual = false; M.inp.k.clear(); },
});

menuScene({
  id: 'selva', name: 'Tempestade na selva', world: 'real', dur: 30, wx: ['storm', 0.75],
  time: (u) => 0.36 + 0.03 * u, weather: { wind: 26 },
  fx: { rayAmt: 0, sunGlow: 0, bloom: 0.55, thresh: 0.7, exposure: 1.08, contrast: 1.2, sat: 1.35, vig: 0.58, shadow: [.74, .95, 1.0], high: [.95, 1.08, .95] },
  ready: (M) => menuBiomeCenter(M.real, BIOME.JUNGLE) > 0,
  setup(M, w) {
    const cx = menuBiomeCenter(w, BIOME.JUNGLE), g = w.surface[cx];
    M.sc = { cam: { fx: cx + 3, fy: g, sx: 0.58, sy: 0.64, tiles: 56, drift: [-10, 0] }, x0: cx - 8, x1: cx + 8 };
    menuPlacePlayer(M, w, cx, g);
    menuMob(M, w, 'bird', cx + 10, g - 10); menuMob(M, w, 'bird', cx - 14, g - 14);
  },
  update(M, w, dt) { menuStroll(M, w, dt, M.sc.x0, M.sc.x1, 30); },
});

menuScene({
  id: 'deserto', name: 'Noite no deserto', world: 'real', dur: 30, moon: 0.3,
  time: (u) => 0.74 + 0.03 * u, weather: { fog: 0.0, wind: 8 },
  fx: { rayAmt: 0, sunGlow: 0, bloom: 0.75, thresh: 0.58, exposure: 1.14, sat: 1.3, vig: 0.58, shadow: [.7, .8, 1.3], high: [1.25, 1.0, .75] },
  ready: (M) => menuBiomeCenter(M.real, BIOME.DESERT) > 0,
  setup(M, w) {
    const cx = menuBiomeCenter(w, BIOME.DESERT), g = w.surface[cx];
    M.sc = { cam: { fx: cx + 3, fy: g, sx: 0.58, sy: 0.64, tiles: 56, drift: [8, 0] } };
    menuCamp(M, w, cx, 1);
    for (const [k, dx] of [['tortoise', 12], ['scorpion', -14]]) { const s = menuFlatSpot(w, cx + dx, 2); menuMob(M, w, k, s.x, s.y); }
    w.lightDirty = true;
  },
  update(M, w, dt) { if (Math.random() < dt * 12) M.particles.push({ x: M.player.cx + 3 * T + (Math.random() - .5) * 4, y: (w.surface[Math.floor(M.player.cx / T) + 3] - 1) * T + 6, vx: (Math.random() - .5) * 16, vy: -30 - Math.random() * 30, life: 1.2, maxLife: 1.2, color: Math.random() < .5 ? '#ffb347' : '#ff7a2a', w: 1, h: 1, gravity: -10 }); },
});

// ---------------------------------------------------------------- sorteio e roteiro
function menuPickScene(M) {
  const ready = MENU_SCENES.filter((s) => (s.world !== 'real' || M.real) && (!s.ready || s.ready(M)) && !(M.dev?.only && s.id !== M.dev.only));
  if (!ready.length) return MENU_SCENES[0];
  const pool = ready.filter((s) => !M.history.slice(-Math.max(1, Math.min(4, ready.length - 1))).includes(s.id));
  const list = pool.length ? pool : ready;
  return M.history.length === 0 ? list.find((s) => s.id === 'cabana') || list[0] : list[Math.floor(Math.random() * list.length)];
}

function menuUndoWorld(w) { // devolve o trecho que uma cena reformou (cais, etc.) ao que era
  const u = w?.menuUndo; if (!u) return; let q = 0;
  for (let y = u.sy0; y <= u.sy1; y++) for (let x = u.sx0; x <= u.sx1; x++, q++) { w.tiles[y * w.w + x] = u.tl[q]; w.walls[y * w.w + x] = u.wl[q]; }
  w.menuUndo = null; w.lightDirty = true;
}
function menuBegin(M, g, scene) {
  if (M.w && M.w.menuUndo) menuUndoWorld(M.w);
  M.scene = scene; M.sceneT = 0; M.history.push(scene.id);
  const w = scene.world === 'real' ? M.real : scene.world === 'inf' ? menuInferno() : menuCab();
  M.w = w; M.mobs = []; M.particles = []; M.npcs = []; M.gulls = []; M.fireflies = []; M.day = -1; M.lightFor = null;
  M.player = new Player(0, 0); M.inp = new MenuInput();
  if (!M.bgs.has(w)) M.bgs.set(w, new Background(w.seed));
  M.weather = createWeather();
  { const wx = scene.wx || ['calm', 1], mix = weatherMixOf(wx[0], wx[1]), tw = scene.weather || {}; if (tw.fog != null) mix.fog = tw.fog; if (tw.wind != null) mix.wind = tw.wind;
    Object.assign(M.weather, { event: wx[0], mix, intensity: wx[1], rain: mix.rain || 0, sand: mix.sand || 0, lightning: mix.lightning || 0, hail: mix.hail || 0, fog: mix.fog || 0, wind: mix.wind * (Math.random() < .5 ? -1 : 1), timer: 1e9 }); M.weather.targetWind = M.weather.wind; }
  scene.setup(M, w);
  M.player.invulnerable = 1e9;
  w.lightDirty = true;
}

// ---------------------------------------------------------------- desenho
// Fundo PARADO: uma única imagem (a cabana ao entardecer), montada uma vez pelo motor e guardada em
// um canvas; depois disso o menu só repinta essa figura, sem custo nenhum de simulação.
// Para voltar às cinemáticas que se alternam, é só trocar MENU_STILL.on para false.
// `diorama`: pintura de pixel art de js/menu-scene.js, com algumas peças animadas (false = a cena `scene` do motor, parada);
// anchorX/Y: que parte da arte fica à mostra quando a janela não é 16:9.
const MENU_STILL = { on: true, diorama: true, anchorX: 0.74, anchorY: 0.6, scene: 'cabana', u: 0.52, warm: 90 };

// guarda o estado do jogo, deixa `fn` mexer à vontade e devolve tudo no final
function menuWithGameState(rend, g, fn) {
  const keep = { fz: g.adminFreezeWeather, oc: g.openingComplete, god: g.adminGod, toast, crash: g.crashSite, npcs: g.npcs, world: g.world, gworld: world, cam: g.cam, zoom: g.zoom, time: g.time, daylight: g.daylight, weather: g.weather, intro: g.intro, mobs: g.mobs, particles: g.particles, player: g.player, bg: rend.bg, shake: g.shake, lastDaylight: g.lastDaylight, drops: g.drops, fall: g.fallingTrees, nv: g.adminNightVision, sfx: playSfx };
  try {
    playSfx = () => {}; toast = () => {};                  // o menu é mudo: nada de passos, respingos e avisos
    return fn();
  } finally {
    rend._menuPass = false;
    playSfx = keep.sfx; toast = keep.toast; g.adminFreezeWeather = keep.fz; g.openingComplete = keep.oc; g.adminGod = keep.god;
    g.crashSite = keep.crash; g.npcs = keep.npcs; g.world = keep.world; world = keep.gworld; g.cam = keep.cam; g.zoom = keep.zoom; g.time = keep.time; g.daylight = keep.daylight; g.weather = keep.weather; g.intro = keep.intro;
    g.mobs = keep.mobs; g.particles = keep.particles; g.player = keep.player; rend.bg = keep.bg; g.shake = keep.shake; g.lastDaylight = keep.lastDaylight; g.drops = keep.drops; g.fallingTrees = keep.fall; g.adminNightVision = keep.nv;
  }
}

// Um quadro da cena S no instante u (0..1): simula `dt` e, se `draw`, pinta no canvas já com o shader.
// Precisa rodar dentro de menuWithGameState.
function menuStepFrame(rend, g, M, S, u, dt, fade, draw) {
  const W = rend.canvas.width, H = rend.canvas.height, w = M.w;
  g.world = world = w; g.intro = null; g.shake = 0; g.adminNightVision = false; g.drops = []; g.fallingTrees = []; g.crashSite = null;
  g.npcs = M.npcs; g.mobs = M.mobs; g.particles = M.particles; g.player = M.player; g.weather = M.weather; rend.bg = M.bgs.get(w);
  // clima da cena (suave)
  g.adminFreezeWeather = true; g.openingComplete = true; g.adminGod = true;
  // hora do dia
  g.time = S.time(u); g.daylight = Math.max(daylightAt(g.time), S.moon || 0);
  // câmera
  const C = M.sc.cam, tiles = C.tiles ?? 60;
  g.zoom = clamp(Math.round(W / (tiles * T) * 4) / 4, 1.25, 4);
  const vw = W / g.zoom, vh = H / g.zoom, e = u * u * (3 - 2 * u);
  g.cam = { x: (C.fx + (C.drift?.[0] || 0) * (e - 0.5)) * T - vw * C.sx, y: (C.fy + (C.drift?.[1] || 0) * (e - 0.5)) * T - vh * C.sy };
  // luz
  const lcx = Math.floor((g.cam.x + vw / 2) / T), lcy = Math.floor((g.cam.y + vh / 2) / T);
  if (w.lightDirty || Math.abs(lcx - (M.lightFor?.[0] ?? -1e9)) > 36 || Math.abs(lcy - (M.lightFor?.[1] ?? -1e9)) > 20) { w.computeLight(lcx, lcy); w.lightDirty = false; M.lightFor = [lcx, lcy]; M.day = -1; }
  if (Math.abs(g.daylight - M.day) > 0.004) { w.composeLight(g.daylight); M.day = g.daylight; }
  g.lastDaylight = g.daylight;
  // vida
  const far = menuPark(M);
  for (const m of M.mobs) if (!m.dead) m.update(dt, w, far);
  for (const v of M.npcs) v.update(dt, w, far);
  S.update?.(M, w, dt, u);
  M.player.visualTime += dt;
  if (M.player.seat) M.player.updateSeat(dt, w, false); else if (!M.sc.manual && S.id !== 'cabana' && !(S.id === 'savana')) M.player.update(dt, M.inp, w);
  updateWeather(g, dt); updateSnowWeather(g, dt);
  updateAmbientLeaves(g, dt); updateParticles(dt);
  if (!draw) return;
  // desenho pelo motor do jogo (sem a interface)
  rend._menuPass = true; rend.render(g); rend._menuPass = false;
  const ctx = rend.ctx, z = g.zoom, ox = Math.round(g.cam.x * z), oy = Math.round(g.cam.y * z);
  ctx.setTransform(z, 0, 0, z, -ox, -oy);
  if (S.id === 'cabana') {                               // vagalumes (depois da luz: brilham no escuro)
    const dark = clamp(1 - g.daylight * 1.1, 0.15, 1);
    for (const f of M.fireflies) { const a = (0.5 + 0.5 * Math.sin(M.t * 2.2 + f.ph * 3)) * dark; if (a < 0.08) continue; ctx.fillStyle = `rgba(210,255,140,${a * 0.22})`; ctx.fillRect(Math.round(f.x * T) - 2, Math.round(f.y * T) - 2, 5, 5); ctx.fillStyle = `rgba(240,255,190,${a})`; ctx.fillRect(Math.round(f.x * T), Math.round(f.y * T), 1, 1); }
  }
  S.after?.(ctx, M, g, M.t);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // legibilidade do texto do menu (lado esquerdo)
  const gl = ctx.createLinearGradient(0, 0, W * 0.5, 0); gl.addColorStop(0, 'rgba(5,9,14,.74)'); gl.addColorStop(1, 'rgba(5,9,14,0)'); ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H);
  // shader cinematográfico
  const out = M.fx.process(rend.canvas, { ...MENU_FX_BASE, ...S.fx, ...(M.dev?.fx || {}), fade });
  if (out) ctx.drawImage(out, 0, 0);
  else if (fade < 1) { ctx.fillStyle = `rgba(0,0,0,${1 - fade})`; ctx.fillRect(0, 0, W, H); }
}

// Imagem parada: aquece a cena (fumaça, fogueira, bichos se acomodam), tira UMA foto e a guarda
function menuRenderStill(rend, g, W, H) {
  const M = MENU;
  if (M.still && M.still.width === W && M.still.height === H) { rend.ctx.setTransform(1, 0, 0, 1, 0, 0); rend.ctx.drawImage(M.still, 0, 0); return true; }
  // Pintura de pixel art montada com a arte do jogo (js/menu-scene.js: árvores, a casa das vilas, fogueira, queda d'água...),
  // em 640x360 e ampliada em pixels inteiros. Não é o mundo rodando: nada simula, só algumas peças se mexem
  // (nuvens, queda d'água, pingos nas estalactites, fogueira, fumaça, vaga-lumes...).
  if (MENU_STILL.diorama && !M.dioramaFail) {
    try {
      const ctx = rend.ctx;
      if (M.dioLast && typeof Menu !== 'undefined' && Menu.current?.() === 'loading') return true;   // gerando o mundo: deixa o último quadro e poupa CPU
      const base = M.dioBase ??= makeCanvas(MENU_W, MENU_H + MENU_PAD);
      drawBravoraMenu(base.getContext('2d'), MENU_W, MENU_H + MENU_PAD);
      const k = Math.max(1, Math.ceil(Math.max(W / MENU_W, H / (MENU_H + MENU_PAD)))), dw = MENU_W * k, dh = (MENU_H + MENU_PAD) * k;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false;
      ctx.drawImage(base, Math.round(-(dw - W) * MENU_STILL.anchorX), Math.round(-(dh - H) * MENU_STILL.anchorY), dw, dh);
      if (M.dioGradW !== W) { M.dioGradW = W; M.dioGrad = ctx.createLinearGradient(0, 0, W * 0.52, 0); M.dioGrad.addColorStop(0, 'rgba(8,10,24,.66)'); M.dioGrad.addColorStop(1, 'rgba(8,10,24,0)'); }
      ctx.fillStyle = M.dioGrad; ctx.fillRect(0, 0, W, H);                                            // legibilidade do texto
      M.dioLast = true;
      return true;
    } catch (e) { console.warn('[menu] diorama indisponível, usando a cena do motor:', e); M.dioramaFail = true; }
  }
  if (!M.fx) M.fx = new MenuFX();
  const scene = MENU_SCENES.find((s) => s.id === MENU_STILL.scene && s.world === 'cab') || MENU_SCENES[0];
  const u = MENU_STILL.u;
  try {
    menuBegin(M, g, scene);
    M.sceneT = u * scene.dur;
    menuWithGameState(rend, g, () => {
      for (let i = 0; i < MENU_STILL.warm; i++) { M.t += 0.05; menuStepFrame(rend, g, M, scene, u, 0.05, 1, i === MENU_STILL.warm - 1); }
    });
  } catch (e) { console.warn('[menu] erro na imagem do menu, voltando à antiga:', e); M.failed = true; return false; }
  const still = makeCanvas(W, H); still.getContext('2d').drawImage(rend.canvas, 0, 0);
  M.still = still;
  return true;
}

function renderLiveMenu(rend, g) {
  const M = MENU;
  if (M.failed || g.intro?.started) return false;
  const W = rend.canvas.width, H = rend.canvas.height;
  if (W < 2 || H < 2) return false;
  if (MENU_STILL.on) return menuRenderStill(rend, g, W, H);
  const loading = typeof Menu !== 'undefined' && Menu.current?.() === 'loading';
  if (loading && M.scene) return true;                     // gerando o mundo de verdade: deixa o último quadro parado e poupa CPU
  const now = performance.now(), dt = Math.min(0.05, M.last ? (now - M.last) / 1000 : 0.016); M.last = now; M.t += dt;
  if (!M.born) M.born = now;
  if (!M.fx) M.fx = new MenuFX();
  // mundo real em segundo plano: começa alguns segundos depois do menu aparecer e só com o menu principal parado
  if (!M.real && !M.realFail && now - M.born > 4000 && (typeof Menu === 'undefined' || Menu.current?.() === 'main')) menuRealStep(5);
  if (!M.scene) menuBegin(M, g, menuPickScene(M));
  M.sceneT += dt;
  const sc = M.scene, dur = M.dev?.freeze ? 1e9 : sc.dur;
  if (M.sceneT >= dur + 1.0 || (M.dev?.next)) { M.dev && (M.dev.next = false); menuBegin(M, g, menuPickScene(M)); }
  const S = M.scene, u = clamp(M.sceneT / S.dur, 0, 1);
  const fade = clamp(Math.min(M.sceneT / 1.4, (S.dur + 1.0 - M.sceneT) / 1.0), 0, 1);
  try {
    menuWithGameState(rend, g, () => menuStepFrame(rend, g, M, S, u, dt, fade, true));
    const ctx = rend.ctx;
    // legenda da cena
    const ca = clamp(Math.min(M.sceneT - 1.2, S.dur - 1 - M.sceneT) / 1.0, 0, 1) * 0.85;
    if (ca > 0.01) {
      ctx.save(); ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic'; ctx.font = '13px Silkscreen, monospace';
      ctx.fillStyle = `rgba(0,0,0,${ca * 0.5})`; ctx.fillText(S.name.toUpperCase(), W - 41, H - 79); ctx.fillStyle = `rgba(255,236,200,${ca})`; ctx.fillText(S.name.toUpperCase(), W - 40, H - 80);
      ctx.fillStyle = `rgba(255,190,110,${ca})`; ctx.fillRect(W - 40 - 18, H - 72, 18, 2); ctx.restore();
    }
    return true;
  } catch (e) {
    if (!M.failed) console.warn('[menu] erro na cena viva, voltando à antiga:', e);
    M.failed = true;
    return false;
  }
}
