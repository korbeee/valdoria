'use strict';

// Registrado após os demais itens para preservar os IDs dos mundos existentes.
ITEM.SHARK_FIN = Math.max(...Object.values(ITEM)) + 1;
ITEM.SHARK_TOOTH = ITEM.SHARK_FIN + 1;
defItem(ITEM.SHARK_FIN, { name: 'Barbatana de tubarão', maxStack: 99,
  descricao: 'Obtida ao limpar um tubarão fora da água. Chance independente de 50% por animal.' });
defItem(ITEM.SHARK_TOOTH, { name: 'Dente de tubarão', maxStack: 99,
  descricao: 'Obtido ao limpar um tubarão fora da água. Chance independente de 25% por animal.' });
ITEM_ART[ITEM.SHARK_FIN] = {
  cores: { k: [24, 40, 49], d: [48, 72, 87], m: [76, 110, 131], l: [130, 164, 181], b: [185, 203, 204] },
  pixels: ['................', '.........kk.....', '........klk.....', '.......klmk.....',
    '......klmdk.....', '.....klmmdk.....', '....klmmmdk.....', '...klmmmmdk.....',
    '..klmmmmmdk.....', '..kmmmmmmddk....', '.klmmmmmmmddk...', '.kmmmmmmmmmddk..',
    '.kbbbmmmmmmmddk.', '..kkkkkkkkkkkk..', '................', '................'],
};
ITEM_ART[ITEM.SHARK_TOOTH] = {
  cores: { k: [62, 61, 54], r: [153, 133, 98], s: [191, 180, 145], m: [230, 224, 193], l: [255, 251, 227] },
  pixels: ['................', '................', '...kkk....kkk...', '..krrrkkkkrrrk..',
    '..kssssssssssk..', '...kkmllllmkk...', '....kmmllmmk....', '.....kmllmk.....',
    '.....kmllmk.....', '......kmmk......', '......kmlk......', '.......kk.......',
    '.......lk.......', '................', '................', '................'],
};

// Consulta a caixa inteira: uma ponta ainda submersa impede a limpeza.
function sharkBodyWet(w, m) {
  for (let ty = Math.floor(m.y / T); ty <= Math.floor((m.y + m.h - 0.001) / T); ty++) {
    for (let tx = Math.floor(m.x / T); tx <= Math.floor((m.x + m.w - 0.001) / T); tx++) {
      if (w.waterAtPx(Math.max(m.x, tx * T) + 0.001, Math.min(m.y + m.h, (ty + 1) * T) - 0.001)) return true;
    }
  }
  return false;
}

function sharkReach(p, m) {
  const dx = Math.max(m.x - p.cx, 0, p.cx - m.x - m.w);
  const dy = Math.max(m.y - p.cy, 0, p.cy - m.y - m.h);
  return Math.hypot(dx, dy) <= 2 * T;
}

const SHARK_CLEAN_SECONDS = 2.4;
const SHARK_STROKE_SOUND = 0.3, SHARK_STROKES = new WeakMap();
const SHARK_DROPS = [[ITEM.SHARK_FIN, 1, 1, 0.5], [ITEM.SHARK_TOOTH, 1, 1, 0.25]];
AQUATIC.shark.drops = WILDLIFE.shark.drops = SHARK_DROPS;
WILDLIFE.shark.drop = null;

function sharkPlayerKey(p) {
  return typeof NET !== 'undefined' && NET.room ? 'net:' + (p.cid ?? NET.cid) : 'local';
}
function sharkOwner(g, key) {
  if (key === sharkPlayerKey(g.player)) return g.player;
  if (typeof NET !== 'undefined' && NET.room) return [...NET.peers.values()].find(p => key === 'net:' + p.cid && p.seen);
  return null;
}
function carriedShark(g, p = g.player) {
  return (g.mobs || []).find(m => m.carcass && !m.despawn && m.sharkCarrier === sharkPlayerKey(p));
}
function cleaningShark(g, p = g.player) {
  return (g.mobs || []).find(m => m.carcass && !m.despawn && m.sharkCleaner === sharkPlayerKey(p));
}
function nearbySharkBody(g, p = g.player) {
  return g.mobs.filter(m => m.carcass && !m.despawn && !m.sharkCarrier && sharkReach(p, m))
    .sort((a, b) => Math.hypot(a.cx - p.cx, a.cy - p.cy) - Math.hypot(b.cx - p.cx, b.cy - p.cy))[0];
}
function sharkNotice(g, p, message) {
  if (p === g.player) toast(message);
  else if (typeof NET !== 'undefined' && NET.isHost) netRelay({ k: 'sharkNotice', text: message }, p.cid);
}
function makeSharkCarcass(g, m) {
  Object.assign(m, { carcass: true, dead: true, keep: true, hp: 0, hurtTimer: 0,
    vx: m.vx * 0.2, vy: 0, tail: 0, pitch: 0, sharkCarrier: null, sharkCleaner: null, sharkCleanTime: 0 });
  sharkNotice(g, g.player, 'Tubarão abatido: aproxime-se e use F para carregar. Limpe fora da água com a faca do tigre.');
}
function cancelSharkCleaning(m) {
  m.sharkCleaner = null; m.sharkCleanTime = 0; m.sharkCleanStart = null;
}
function sharkHeldItem(g, p) {
  return p === g.player ? g.inventory.slots[g.selected]?.item : p.item;
}
function sharkCarryPosition(p, m) {
  return { x: p.cx + p.facing * 5 - m.w / 2, y: p.y + p.h * 0.6 - m.h / 2 };
}
function throwShark(g, p, m, force = false) {
  // Procura espaço livre próximo ao colo antes de iniciar o arremesso.
  const origin = sharkCarryPosition(p, m);
  let place = null;
  for (const dy of [0, -8, -16, 8]) {
    for (const dx of [0, 8, 16, -8, -16]) {
      const x = origin.x + dx * p.facing, y = origin.y + dy;
      if (x >= 0 && x + m.w <= g.world.w * T && y >= 0 && y + m.h <= g.world.h * T && !m.collides(g.world, x, y)) {
        place = { x, y }; break;
      }
    }
    if (place) break;
  }
  if (!place && !force) { sharkNotice(g, p, 'Sem espaço para soltar o tubarão. Afaste-se da parede.'); return false; }
  Object.assign(m, place || origin);
  m.sharkCarrier = null; m.facing = p.facing; m.onGround = false;
  m.vx = force ? 0 : p.facing * 210; m.vy = force ? 0 : -165;
  if (!force) playSfx('place', m.cx, m.cy);
  return true;
}
function sharkAction(g, p, action, m) {
  if (!m?.carcass || m.despawn || p.dead || p.hp <= 0) return false;
  const key = sharkPlayerKey(p);
  if (action === 'throw') return m.sharkCarrier === key && throwShark(g, p, m);
  if (action === 'stop') { if (m.sharkCleaner === key) cancelSharkCleaning(m); return true; }   // soltou o botão: a limpeza para (parceiro no co-op)
  if (!sharkReach(p, m) || m.sharkCarrier || m.sharkCleaner) return false;
  if (action === 'carry') {
    if (carriedShark(g, p) || cleaningShark(g, p) || (p === g.player && g.mount) || p.equipment?.mounted) return false;
    m.sharkCarrier = key; m.vx = m.vy = 0; m.facing = p.facing;
    Object.assign(m, sharkCarryPosition(p, m));
    if (p === g.player) { cancelTool(g); g.sword.active = false; g.swinging = false; g.bow = null; if (g.trident) g.trident.anim = null; }
    sharkNotice(g, p, 'Carregando tubarão. Q arremessa à frente; leve o corpo até a margem.');
    return true;
  }
  if (action !== 'clean' || carriedShark(g, p) || cleaningShark(g, p)) return false;
  if ((p === g.player && g.mount) || p.equipment?.mounted) { sharkNotice(g, p, 'Desmonte antes de limpar o tubarão.'); return false; }
  if (sharkHeldItem(g, p) !== ITEM.TIGER_KNIFE) { sharkNotice(g, p, 'Equipe a faca de dente de tigre para limpar o tubarão.'); return false; }
  if (sharkBodyWet(g.world, m)) { sharkNotice(g, p, 'Retire o corpo inteiro da água antes de limpar.'); return false; }
  if (!m.onGround || Math.abs(m.vx) > 10 || Math.abs(m.vy) > 10 || p.swimming) {
    sharkNotice(g, p, 'Deixe o tubarão repousar em terra firme antes de limpar.'); return false;
  }
  m.sharkCleaner = key; m.sharkCleanTime = 0;
  if (p === g.player) p.facing = Math.sign(m.cx - p.cx) || p.facing;   // vira de frente para o corpo
  m.sharkCleanStart = { x: p.x, y: p.y, hp: p.hp, invulnerable: p.invulnerable || 0 };
  if (p === g.player) { cancelTool(g); g.sword.active = false; g.swinging = false; }
  return true;
}
function requestSharkAction(g, action, m) {
  if (typeof NET !== 'undefined' && NET.guest) {
    if (m?.netId != null) netRelay({ k: 'sharkAction', action, id: m.netId }, NET.hostCid);
    return true;
  }
  return sharkAction(g, g.player, action, m);
}
function sharkKeyAction(g, code) {
  if (g.inventoryUI.open || g.mapUI.open) return false;
  if (code === 'KeyQ') {
    const body = carriedShark(g);
    if (!body) return false;
    requestSharkAction(g, 'throw', body); return true;
  }
  if (code !== 'KeyF') return false;
  const body = nearbySharkBody(g);
  if (!body || carriedShark(g) || cleaningShark(g)) return false;
  g._shieldF = true; // a interação contextual usa F antes do aparo do escudo.
  requestSharkAction(g, 'carry', body); return true;
}
function sharkMouseAction(g, aim, rightPressed) {
  if (g.inventoryUI.open || g.mapUI.open) return false;
  const cleaning = cleaningShark(g);
  if (cleaning && !input.mouse.right && !g._sharkStopSent) { g._sharkStopSent = true; if (typeof NET !== 'undefined' && NET.guest) requestSharkAction(g, 'stop', cleaning); }   // no co-op o anfitrião não vê o mouse do parceiro
  if (!cleaning) g._sharkStopSent = false;
  if (carriedShark(g) || cleaning) return true;
  if (!rightPressed) return false;
  const body = g.mobs.find(m => m.carcass && !m.despawn && !m.sharkCarrier && m.containsPoint(aim.x, aim.y, 5) && sharkReach(g.player, m));
  if (!body) return false;
  requestSharkAction(g, 'clean', body); return true;
}
function updateSharkCarcass(g, m, dt) {
  if (m.sharkCarrier) {
    const p = sharkOwner(g, m.sharkCarrier);
    if (p && !p.dead && p.hp > 0) {
      Object.assign(m, sharkCarryPosition(p, m)); m.facing = p.facing; return;
    }
    if (p) throwShark(g, p, m, true);
    else { m.sharkCarrier = null; m.vx = m.vy = 0; }
  }
  const wet = sharkBodyWet(g.world, m);
  // Na água o corpo afunda devagar, sem nadar, fugir ou atacar.
  m.vx *= Math.exp(-(wet ? 3 : m.onGround ? 9 : 0.3) * dt);
  // Subpassos evitam atravessar o chão ou uma parede durante o arremesso.
  const gravity = wet ? 55 : GRAVITY, maxFall = wet ? 22 : MAX_FALL;
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(m.vx), Math.min(Math.abs(m.vy) + gravity * dt, MAX_FALL)) * dt / 4));
  for (let i = 0; i < steps; i++) {
    // O corpo morto não usa o impulso de flutuação dos animais vivos.
    m.vy = Math.min(m.vy + gravity * dt / steps, maxFall);
    m.moveX(m.vx * dt / steps, g.world); m.moveY(m.vy * dt / steps, g.world);
  }
  m.x = clamp(m.x, 0, g.world.w * T - m.w); m.y = clamp(m.y, 0, g.world.h * T - m.h - 0.01);
  if (!m.sharkCleaner) return;
  const p = sharkOwner(g, m.sharkCleaner), start = m.sharkCleanStart;
  if (!p || p.dead || p.hp <= 0 || !start || !sharkReach(p, m) || sharkBodyWet(g.world, m) || !m.onGround ||
    p.swimming || Math.hypot(p.x - start.x, p.y - start.y) > 3 || p.hp < start.hp ||
    (p.invulnerable || 0) > start.invulnerable + 0.05 || sharkHeldItem(g, p) !== ITEM.TIGER_KNIFE ||
    (p === g.player && (g.inventoryUI.open || g.mapUI.open))) {
    cancelSharkCleaning(m); if (p) sharkNotice(g, p, 'Limpeza interrompida. Segure o botão direito para recomeçar.'); return;
  }
  if (p === g.player && !input.mouse.right) {                                   // limpar é segurar o botão direito, como minerar
    cancelSharkCleaning(m);
    if (!g._sharkHoldHint) { g._sharkHoldHint = true; sharkNotice(g, p, 'Segure o botão direito até terminar de limpar.'); }
    return;
  }
  if (p === g.player) p.facing = Math.sign(m.cx - p.cx) || p.facing;
  m.sharkCleanTime += dt;
  const stroke = Math.floor(m.sharkCleanTime / SHARK_STROKE_SOUND);                 // um som de corte a cada golpe da faca
  if (SHARK_STROKES.get(m) !== stroke) { SHARK_STROKES.set(m, stroke); playSfx('flesh', m.cx, m.cy); }
  if (m.sharkCleanTime < SHARK_CLEAN_SECONDS) return;
  // Marca antes de gerar itens: nenhum segundo clique ou save pode repetir o saque.
  m.sharkHarvested = true; m.despawn = true;
  let pieces = 0;
  for (const [item, count, , chance] of SHARK_DROPS) {
    if (Math.random() < chance) { dropItem(g, item, count, m.cx, m.cy, pieces - 0.5); pieces++; }
  }
  mobParticles(g, m, 18, 'rgb(184,66,79)');                                        // estouro final de sangue e lascas (depois do sorteio dos drops)
  cancelSharkCleaning(m);
  sharkNotice(g, p, pieces ? 'Tubarão limpo. Recolha as peças no chão.' : 'Tubarão limpo. Nenhuma peça aproveitável desta vez.');
}

// ---------------------------------------------------------------------------
// Animação de limpeza (tudo calculado de m.sharkCleanTime: vale igual para quem só espelha o corpo no co-op)
//   0,00-0,90  abre a barriga: a faca serra da cabeça até a cauda e o talho vai se abrindo
//   0,90-1,65  três talhos na base da barbatana dorsal
//   1,65-2,40  alavanca a boca para soltar os dentes
// Coordenadas "do corpo": origem no centro do sprite, cabeça em +x, barriga em +y (o corpo espelha com m.facing).
// ---------------------------------------------------------------------------
const SHARK_CUT_A = 0.9, SHARK_CUT_B = 1.65;
const sharkSmooth = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const sharkHash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
function sharkKnifeTip(t) {
  const a = [17 - 31 * sharkSmooth(t / SHARK_CUT_A) + Math.sin(t * 38) * 1.6, 4 + Math.sin(t * 38 + 1) * 1.1];
  if (t < SHARK_CUT_A) return a;
  const lb = clamp((t - SHARK_CUT_A) / (SHARK_CUT_B - SHARK_CUT_A), 0, 1), chop = Math.abs(Math.sin(lb * Math.PI * 3));
  const b = [-2 + Math.sin(t * 30) * 0.8, -9.5 + chop * 6];
  if (t < SHARK_CUT_B) { const k = sharkSmooth((t - SHARK_CUT_A) / 0.16); return [lerp(-14, b[0], k), lerp(4, b[1], k)]; }
  const c = [21 + Math.sin((t - SHARK_CUT_B) * 20) * 1.4, 1 + Math.sin((t - SHARK_CUT_B) * 22) * 2.4], k = sharkSmooth((t - SHARK_CUT_B) / 0.16);
  return [lerp(-2, c[0], k), lerp(-9.5, c[1], k)];
}
// Quadro do jogador ajoelhado (PLAYER_ANIMS.kneel): inclina para serrar a barriga e afunda a cada talho na barbatana
function sharkCleanFrame(g, p = g.player) {
  const m = cleaningShark(g, p);
  if (!m) return PLAYER_ANIMS.kneel;
  const t = m.sharkCleanTime || 0;
  return PLAYER_ANIMS.kneel + (t < SHARK_CUT_A ? 1 : t < SHARK_CUT_B ? (sharkCleanState(m).squash < 0.97 ? 2 : 0) : 1);
}
function sharkCleanState(m) {
  const t = clamp(m.sharkCleanTime || 0, 0, SHARK_CLEAN_SECONDS);
  const lb = clamp((t - SHARK_CUT_A) / (SHARK_CUT_B - SHARK_CUT_A), 0, 1), hit = t >= SHARK_CUT_A && t < SHARK_CUT_B ? Math.pow(Math.abs(Math.sin(lb * Math.PI * 3)), 8) : 0;
  const tremor = t < SHARK_CUT_A ? 0.5 : t < SHARK_CUT_B ? 0.35 : 1.1;
  return {
    t, tip: sharkKnifeTip(t),
    cutA: sharkSmooth(t / SHARK_CUT_A), cutB: clamp((t - SHARK_CUT_A) / (SHARK_CUT_B - SHARK_CUT_A) * 1.15, 0, 1), cutC: clamp((t - SHARK_CUT_B) / 0.3, 0, 1),
    shakeX: Math.sin(t * 57) * tremor, shakeY: -hit * 1.2, squash: 1 - hit * 0.07,
  };
}
// Talhos que vão se abrindo no corpo (já no espaço espelhado do sprite)
function drawSharkCuts(ctx, s) {
  const gash = (x0, x1, y, dark = '#4a1520', red = '#b8424f') => {
    const a = Math.round(Math.min(x0, x1)), w = Math.round(Math.abs(x1 - x0));
    if (w < 1) return;
    ctx.fillStyle = dark; ctx.fillRect(a, y, w, 1);
    ctx.fillStyle = red; ctx.fillRect(a, y + 1, w, 1);
    ctx.fillStyle = '#e9a2a6'; for (let x = a + 1; x < a + w; x += 3) ctx.fillRect(x, y + 2, 1, 1);   // lábios da carne aberta
  };
  gash(17 - 31 * s.cutA, 17, 4);                                       // barriga
  gash(-6, -6 + 10 * s.cutB, -6);                                      // base da barbatana
  if (s.cutC > 0) { ctx.fillStyle = '#b8424f'; ctx.fillRect(21, 2, 2, Math.round(3 * s.cutC)); ctx.fillStyle = '#4a1520'; ctx.fillRect(20, 2, 1, Math.round(3 * s.cutC)); }   // canto da boca
}
// Gotas e lascas lançadas a cada golpe: posição recalculada do tempo, sem lista de partículas
function drawSharkSpatter(ctx, m, s) {
  const f = m.facing < 0 ? -1 : 1, per = 0.07, k1 = Math.floor(s.t / per);
  for (let k = k1; k > k1 - 9 && k >= 0; k--) {
    const t0 = k * per, age = s.t - t0;
    if (age > 0.55) break;
    const tip = sharkKnifeTip(t0), wx = m.cx + f * tip[0], wy = m.cy + tip[1];
    for (let j = 0; j < 2; j++) {
      const r1 = sharkHash(k * 7 + j), r2 = sharkHash(k * 13 + j + 5);
      const x = wx + (r1 - 0.5) * 50 * age * 2, y = wy + (-14 - r2 * 40) * age + 120 * age * age * 2;
      ctx.globalAlpha = 1 - age / 0.55;
      ctx.fillStyle = t0 >= SHARK_CUT_B && j ? '#f2ecd2' : t0 >= SHARK_CUT_A && t0 < SHARK_CUT_B && j ? '#9fb2bd' : (j ? '#7a2231' : '#c0505c');
      ctx.fillRect(Math.round(x), Math.round(y), r1 > 0.7 ? 2 : 1, 1);
    }
  }
  ctx.globalAlpha = 1;
}
// Tudo em pixels inteiros, como o resto do personagem (nada de curva suavizada nem traço girado)
function sharkPxLine(ctx, x0, y0, x1, y1, w, col) {
  ctx.fillStyle = col;
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1), o = Math.floor(w / 2);
  for (let j = 0; j <= n; j++) ctx.fillRect(Math.round(x0 + (x1 - x0) * j / n) - o, Math.round(y0 + (y1 - y0) * j / n) - o, w, w);
}
// Faca de dente de tigre: cabo enrolado, guarda e lâmina que afina em curva; (hx,hy) = mão, (ux,uy) = direção da ponta
function drawSharkKnifePx(ctx, hx, hy, ux, uy, len) {
  const nx = -uy, ny = ux, at = (d, s) => [Math.round(hx + ux * d + nx * s), Math.round(hy + uy * d + ny * s)];
  const px = (d, s, col) => { const [x, y] = at(d, s); ctx.fillStyle = col; ctx.fillRect(x, y, 1, 1); };
  const bend = (d) => -Math.sin(d / len * Math.PI) * 1.2;               // a lâmina curva para o lado do fio
  const width = (d) => (d < 0.55 * len ? 3 : d < 0.82 * len ? 2 : 1);
  for (let d = -4; d <= len + 1; d += 0.5) {                           // contorno
    const r = d < 2 ? 2 : (width(d) + 1) / 2 + 0.5, c = d < 2 ? 0 : bend(d);
    for (let s = -Math.floor(r); s <= Math.floor(r); s++) px(d, c + s, '#2a2418');
  }
  for (let d = -3; d < 2; d += 0.5) for (let s = -1; s <= 1; s++) px(d, s, d % 2 === 0 || d === -3 ? '#a8854f' : '#7a5a36');   // cabo enrolado
  for (let s = -2; s <= 2; s++) px(2, s, '#d9c7a0');                   // guarda
  for (let d = 3; d <= len; d += 0.5) {                                // lâmina
    const w = width(d), c = bend(d);
    for (let s = 0; s < w; s++) px(d, c + s - (w - 1) / 2, '#efe9d2');
    if (w > 1) px(d, c - (w - 1) / 2, '#fffdf0');                      // fio iluminado
  }
}
// Braço, mão e a faca seguindo a ponta (em coordenadas do mundo)
function drawSharkKnifeArm(ctx, p, tipWorld, pose) {
  // ombro da frente tirado da própria pose ajoelhada (o sprite tem 32x48, centrado em p.cx e com o pé em p.y + p.h)
  const sx = Math.round(p.cx + p.facing * (pose.shoulders[1] + pose.lean - 16)), sy = Math.round(p.y + p.h - 48 + pose.sy + pose.bob);
  const dx = tipWorld[0] - sx, dy = tipWorld[1] - sy, d = Math.hypot(dx, dy) || 1, BL = 11, ux = dx / d, uy = dy / d;
  const hd = clamp(d - BL, 3, 13), hx = Math.round(sx + ux * hd), hy = Math.round(sy + uy * hd);
  const ex = Math.round((sx + hx) / 2), ey = Math.round((sy + hy) / 2 - 1);                // cotovelo
  const outline = rgb(PLAYER_OUTLINE);
  sharkPxLine(ctx, sx, sy, ex, ey, 5, outline); sharkPxLine(ctx, ex, ey, hx, hy, 4, outline);
  sharkPxLine(ctx, sx, sy, ex, ey, 3, rgb(PLAYER_PALETTE.J)); sharkPxLine(ctx, ex, ey, hx, hy, 2, rgb(PLAYER_PALETTE.j));
  drawSharkKnifePx(ctx, hx, hy, ux, uy, BL);
  ctx.fillStyle = outline; ctx.fillRect(hx - 2, hy - 2, 4, 4);
  ctx.fillStyle = playerHandRgb(); ctx.fillRect(hx - 1, hy - 1, 2, 2);
}

let SHARK_CARCASS_SPRITE = null;
function sharkCarcassSprite() {
  if (SHARK_CARCASS_SPRITE) return SHARK_CARCASS_SPRITE;
  const source = aquaticSprite('shark', 0).normal, c = makeCanvas(source.width, source.height), ctx = c.getContext('2d');
  ctx.drawImage(source, 0, 0);
  const image = ctx.getImageData(0, 0, c.width, c.height);
  for (let i = 0; i < image.data.length; i += 4) {
    if (!image.data[i + 3]) continue;
    const gray = (image.data[i] + image.data[i + 1] + image.data[i + 2]) / 3;
    for (let j = 0; j < 3; j++) image.data[i + j] = (image.data[i + j] * 0.65 + gray * 0.35) * 0.85;
  }
  ctx.putImageData(image, 0, 0);
  ctx.fillStyle = '#657f8b'; ctx.fillRect(42, 12, 2, 3);
  ctx.fillStyle = '#192c36'; ctx.fillRect(42, 13, 2, 1);
  return SHARK_CARCASS_SPRITE = c;
}
function drawSharkCarcass(ctx, m) {
  const img = sharkCarcassSprite(), s = m.sharkCleaner ? sharkCleanState(m) : null;   // limpando: o corpo treme e os talhos se abrem
  ctx.save(); ctx.translate(Math.round(m.cx + (s ? s.shakeX : 0)), Math.round(m.cy + (s ? s.shakeY : 0))); ctx.scale(m.facing < 0 ? -1 : 1, s ? s.squash : 1);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);
  if (s) drawSharkCuts(ctx, s);
  ctx.restore();
}
function drawSharkHandling(ctx, g) {
  for (const m of g.mobs) {
    if (!m.carcass || m.despawn || !m.sharkCarrier) continue;
    const p = sharkOwner(g, m.sharkCarrier);
    if (!p) continue;
    // Corpo diante do tronco; as mãos apoiam a parte inferior do animal.
    drawSharkCarcass(ctx, m);
    ctx.save(); ctx.translate(Math.round(p.cx), Math.round(p.y + p.h * 0.6));
    ctx.fillStyle = rgb(PLAYER_OUTLINE); ctx.fillRect(-9, 4, 5, 4); ctx.fillRect(4, 4, 5, 4);
    ctx.fillStyle = playerHandRgb(); ctx.fillRect(-8, 4, 3, 2); ctx.fillRect(5, 4, 3, 2); ctx.restore();
  }
  for (const m of g.mobs) {
    if (!m.carcass || m.despawn || !m.sharkCleaner) continue;
    const p = sharkOwner(g, m.sharkCleaner);
    if (!p) continue;
    const s = sharkCleanState(m), f = m.facing < 0 ? -1 : 1;
    drawSharkKnifeArm(ctx, p, [m.cx + s.shakeX + f * s.tip[0], m.cy + s.shakeY + s.tip[1]], PLAYER_POSES[sharkCleanFrame(g, p)]);
    drawSharkSpatter(ctx, m, s);
  }
}
let sharkPickupPromptCanvas = null;
function sharkPickupPromptSprite() {
  if (sharkPickupPromptCanvas) return sharkPickupPromptCanvas;
  const canvas=makeCanvas(21,17),c=canvas.getContext('2d'),pixels=[];
  const glyphs=[
    [0,['###','#..','#..','#..','#..','#..','###']],
    [7,['#####','#....','#....','####.','#....','#....','#....']],
    [16,['###','..#','..#','..#','..#','..#','###']],
  ];
  for(const [offset,rows]of glyphs)for(let y=0;y<rows.length;y++)for(let x=0;x<rows[y].length;x++)if(rows[y][x]==='#')pixels.push([1+offset+x,1+y]);
  // Seta em degraus, desenhada no mesmo tamanho de pixel das letras.
  for(let y=0;y<4;y++)for(let x=y;x<7-y;x++)pixels.push([7+x,12+y]);
  c.fillStyle='#17202b';for(const [x,y]of pixels)c.fillRect(x-1,y-1,3,3);
  c.fillStyle='#ffdc55';for(const [x,y]of pixels)c.fillRect(x,y,1,1);
  return (sharkPickupPromptCanvas=canvas);
}
// ---------------------------------------------------------------------------
// Dica de ação: plaquinha na moldura de metal do inventário, flutuando sobre o corpo (ou sobre quem o carrega).
// Fonte pixel e paleta da interface (UIC); tecla desenhada como botão; a limpeza mostra a faca e uma barra em blocos.
// Tudo é desenhado em pixels de 1x e ampliado pela escala da interface, então fica nítido como o resto.
// ---------------------------------------------------------------------------
const SHARK_HINT_SECONDS = 1.6, SHARK_HINT_FADE = 1.0;   // aviso do Q: fica inteiro por 1,6 s e some em 1 s
function sharkKeycap(ctx, x, y, key, dim) {
  rrect(ctx, x, y, 11, 11, UIC.outline);
  rrect(ctx, x + 1, y + 1, 9, 9, dim ? UIC.slotBorder : UIC.slot);
  ctx.fillStyle = dim ? UIC.frameDark : UIC.slotHover; ctx.fillRect(x + 2, y + 1, 7, 1);
  ctx.fillStyle = UIC.frameDark; ctx.fillRect(x + 2, y + 9, 7, 1);
  ctx.fillStyle = UIC.outline; ctx.fillRect(x + 1, y + 10, 9, 1);
  ctx.fillStyle = dim ? UIC.textDim : UIC.limeBright; ctx.textAlign = 'center'; ctx.fillText(key, x + 5.5, y + 8);
}
function sharkMouseIcon(ctx, x, y, dim) {
  rrect(ctx, x, y, 9, 11, UIC.outline);
  rrect(ctx, x + 1, y + 1, 7, 9, dim ? UIC.slotBorder : UIC.slot);
  ctx.fillStyle = dim ? UIC.textDim : UIC.limeBright; ctx.fillRect(x + 5, y + 1, 3, 4);     // botão direito aceso
  ctx.fillStyle = UIC.outline; ctx.fillRect(x + 4, y + 1, 1, 4); ctx.fillRect(x + 1, y + 5, 7, 1);
}
function sharkPrompt(ctx, sx, sy, s, rows, now) {
  ctx.save(); ctx.font = UI_FONT; ctx.textBaseline = 'alphabetic';
  let tw = 0;
  for (const r of rows) { r.w = Math.ceil(ctx.measureText(r.label).width); tw = Math.max(tw, r.w + (r.bar ? 4 : 0)); }
  const RH = 14, lead = 15, w = 8 + lead + tw + 2, h = 8 + rows.length * RH - 3, bob = Math.round(Math.sin(now * 3) * 0.6);
  const px = Math.round(clamp(sx, (w / 2 + 4) * s, ctx.canvas.width - (w / 2 + 4) * s)), py = Math.round(Math.max((h + 10) * s, sy));
  ctx.translate(px, py); ctx.scale(s, s); ctx.translate(-Math.round(w / 2), -h - 5 + bob);
  // moldura: contorno, chapa clara em cima e escura embaixo, miolo escuro, rebites
  rrect(ctx, 0, 0, w, h, UIC.outline); rrect(ctx, 1, 1, w - 2, h - 2, UIC.frame);
  ctx.fillStyle = UIC.frameLight; ctx.fillRect(2, 1, w - 4, 1); ctx.fillRect(1, 2, 1, h - 4);
  ctx.fillStyle = UIC.frameDark; ctx.fillRect(2, h - 2, w - 4, 1); ctx.fillRect(w - 2, 2, 1, h - 4);
  ctx.fillStyle = UIC.outline; ctx.fillRect(3, 3, w - 6, h - 6); ctx.fillStyle = UIC.body; ctx.fillRect(4, 4, w - 8, h - 8);
  ctx.fillStyle = UIC.rivet; ctx.fillRect(1, 1, 1, 1); ctx.fillRect(w - 2, 1, 1, 1);
  // rabinho apontando para o corpo
  const cx = Math.round(w / 2);
  for (let i = 0; i < 4; i++) { ctx.fillStyle = UIC.outline; ctx.fillRect(cx - 3 + i, h + i, 7 - i * 2, 1); }
  for (let i = 0; i < 3; i++) { ctx.fillStyle = UIC.frame; ctx.fillRect(cx - 2 + i, h + i - 1, 5 - i * 2, 1); }
  rows.forEach((r, i) => {
    const y = 4 + i * RH;
    if (r.icon != null) ctx.drawImage(renderer.tex.itemAtlas, r.icon * T, 0, T, T, 4, y - 3, T, T);
    else if (r.key === 'mouse') sharkMouseIcon(ctx, 5, y, r.dim);
    else sharkKeycap(ctx, 4, y, r.key, r.dim);
    ctx.textAlign = 'left';
    ctx.fillStyle = UIC.outline; ctx.fillText(r.label, 4 + lead + 1, y + 8 + 1);
    ctx.fillStyle = r.dim ? UIC.textDim : UIC.text; ctx.fillText(r.label, 4 + lead, y + 8);
    if (r.bar != null) {                                    // barra em blocos de 3 px
      const bx = 4 + lead, by = y + 10, n = Math.floor(tw / 3);
      ctx.fillStyle = UIC.outline; ctx.fillRect(bx - 1, by - 1, n * 3 + 2, 5);
      ctx.fillStyle = UIC.well; ctx.fillRect(bx, by, n * 3, 3);
      const on = Math.floor(clamp(r.bar, 0, 1) * n);
      for (let k = 0; k < on; k++) { ctx.fillStyle = k < on - 1 ? UIC.lime : UIC.limeBright; ctx.fillRect(bx + k * 3, by, 2, 3); }
    }
  });
  ctx.restore();
}
function drawSharkHarvestHUD(ctx, g, W, H, ox = 0, oy = 0) {
  if (g.intro?.active || g.paused || g.inventoryUI.open || g.mapUI.open || g.npcOpen) return;
  const cleaning = cleaningShark(g), carrying = carriedShark(g), nearby = nearbySharkBody(g);
  if (!cleaning && !carrying && !nearby) return;
  const z = g.zoom, s = Math.max(1, Math.round(g.inventoryUI.scale() * 100) / 100), p = g.player, now = performance.now() / 1000;
  const at = (x, y) => [x * z - ox, y * z - oy];
  let rows, pos, alpha = 1;
  if (!carrying) g._sharkCarryHint = null;      // soltou o corpo: o próximo que pegar mostra o aviso de novo
  if (cleaning) {
    rows = [{ icon: ITEM.TIGER_KNIFE, label: 'Segure p/ limpar', bar: cleaning.sharkCleanTime / SHARK_CLEAN_SECONDS }];
    pos = at(cleaning.cx, cleaning.y - 6);
  } else if (carrying) {
    // o aviso do Q aparece ao pegar o tubarão e vai sumindo aos poucos (vale também para quem acabou de carregar um save)
    const hint = g._sharkCarryHint;
    if (hint?.m !== carrying) g._sharkCarryHint = { m: carrying, t0: now };
    const age = now - g._sharkCarryHint.t0;
    alpha = clamp((SHARK_HINT_SECONDS + SHARK_HINT_FADE - age) / SHARK_HINT_FADE, 0, 1);
    if (alpha <= 0) return;
    rows = [{ key: 'Q', label: 'Arremessar' }];
    pos = at(p.cx, p.y - 6);
  } else {
    if(nearby.sharkCleaner||g.mount)return;
    const [x,top]=at(nearby.cx,nearby.cy-sharkCarcassSprite().height/2);
    if(x<0||x>W||top<0||top>H)return;
    const prompt=sharkPickupPromptSprite();ctx.save();ctx.imageSmoothingEnabled=false;
    ctx.drawImage(prompt,Math.round(x-29/2),Math.round(top-23-5),29,23);
    ctx.restore();return;
  }
  ctx.save(); ctx.globalAlpha *= alpha;
  sharkPrompt(ctx, pos[0], pos[1], s, rows, now);
  ctx.restore();
}
