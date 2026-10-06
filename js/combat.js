'use strict';

// =====================================================================================
//  COMBATE CORPO A CORPO — ESPADA
// =====================================================================================
//  Golpe em 3 fases:  preparação (recua) → corte (muito rápido, causa dano) → recuperação
//
//  • O dano segue o ARCO REAL da lâmina: a cada frame são testados pontos ao longo da
//    espada entre o ângulo anterior e o atual, então só acerta o que ela atravessa.
//  • Cada inimigo leva no máximo 1 acerto por golpe (conjunto `hit`).
//  • Direção vem do mouse (igual a minerar): lado do cursor = direita/esquerda;
//    cursor bem acima/abaixo do personagem = golpe para cima/baixo.
//  • Efeitos (rastro, vento, faíscas, impacto) usam uma lista fixa de objetos reaproveitados.
//
//  Itens com `dano` no defItem usam este sistema. Opcional no defItem: `alcance` (px).
// =====================================================================================

const SWORD = {
  preparacao: 0.05,        // s — recua a espada
  corte: 0.11,             // s — o golpe em si
  recuperacao: 0.12,       // s — espada assenta e os efeitos somem
  intervalo: 0.03,         // s de espera extra antes do próximo golpe
  arcoAntes: 115,          // graus antes da direção mirada (onde a espada começa)
  arcoDepois: 70,          // graus depois (onde termina)
  recuo: 14,               // graus que a espada recua na preparação
  maoRaio: 9,              // px do ombro até a mão
  alcance: 28,             // px do ombro até a ponta da lâmina
  janelaDano: [0.15, 0.9], // trecho do corte que causa dano (0 = começo, 1 = fim)
  rastro: 0.07,            // s de "memória" do rastro atrás da lâmina
  hitStop: 0.05,           // congelamento no impacto (s)
  tremor: 2.2,             // tremida da câmera no impacto (px)
  empurrao: 1.25,          // multiplicador do knockback
};

// Ferramenta usada como arma (machado de emergência): golpe pesado, com animação própria —
// levanta bem mais atrás, desce devagar, para curto na frente e demora para assentar.
// Os campos que faltam aqui vêm de SWORD, que é o perfil da espada.
const SWING_HEAVY = {
  preparacao: 0.13,        // s — ergue o machado por cima do ombro
  corte: 0.15,             // s — a machadada
  recuperacao: 0.22,       // s — o peso puxa e ele assenta devagar
  arcoAntes: 155,          // graus — começa quase nas costas
  arcoDepois: 40,          // graus — para logo depois do alvo, não varre até embaixo
  recuo: 26,               // graus de armação a mais
  espera: 0.14,            // s de espera extra entre golpes
};

const DEG = Math.PI / 180;
const easeOutCubic = (p) => 1 - (1 - p) ** 3;
const easeInOutCubic = (p) => (p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2);

function createSwordState() {
  return {
    active: false, t: 0, item: 0, damage: 1, reach: SWORD.alcance, speed: 1, prof: SWORD,
    facing: 1, aim: 0, start: 0, end: 0, prevCut: -1, prevAngle: 0,
    hit: new Set(),
  };
}

// Ângulo da lâmina no "espaço local" (personagem olhando para a direita; y para baixo)
function swordLocalAngle(s, t) {
  const P = s.prof.preparacao, C = s.prof.corte;
  const back = s.start - s.prof.recuo * DEG;
  if (t < P) return lerp(s.start, back, easeOutCubic(t / P));
  if (t < P + C) return lerp(back, s.end, easeInOutCubic((t - P) / C));
  // `assenta` = quanto o braço ainda anda depois do golpe. A espada cai mais um pouco;
  // a puçá faz o contrário e volta a subir, que é como se carrega uma rede (js/bug-net.js).
  return lerp(s.end, s.end + (s.prof.assenta ?? 8) * DEG, easeOutCubic(Math.min(1, (t - P - C) / s.prof.recuperacao)));
}

const swordWorldAngle = (s, a) => (s.facing > 0 ? a : Math.PI - a);

// Avanço do corpo: puxa 1px para trás na preparação e avança no corte
function swordLunge(s) {
  if (!s.active) return 0;
  const P = s.prof.preparacao, C = s.prof.corte;
  if (s.t < P) return -s.facing;
  const c = (s.t - P) / C;
  if (c >= 1) return 0;
  return Math.round(s.facing * (s.aim === 0 ? 2 : 1) * Math.sin(Math.PI * c));
}

// Ombro do braço da frente, em px do mundo (objeto reaproveitado: copie os valores)
const _shoulder = { x: 0, y: 0 };
function shoulderPos(p, lunge = 0) {
  const sx = Math.round(p.x + p.w / 2 - PLAYER_SPR_W / 2) + lunge;
  const sy = Math.round(p.y + p.stepOffset + p.h - PLAYER_SPR_H);
  const sh = p.crouching ? 18.5 : 14.5; // engatinhando o ombro fica mais à frente
  _shoulder.x = p.facing > 0 ? sx + sh : sx + PLAYER_SPR_W - sh;
  _shoulder.y = sy + (PLAYER_POSES[playerFrame(p)].sy || 26) + 0.5 + (p.onGround ? 1 : 0); // agachado o ombro desce junto
  return _shoulder;
}

// ---------- Início do golpe ----------
function startSwordSwing(game, def, mx, my) {
  const s = game.sword;
  if (s.active || game.attackCooldown > 0) return false;
  const p = game.player;
  const slot = game.inventory.slots[game.selected];

  const dx = mx - p.cx, dy = my - (p.y + 20);
  const facing = Math.abs(dx) < 1 ? p.facing : Math.sign(dx);
  let aim = 0;
  if (Math.abs(dy) > Math.abs(dx) * 1.3) aim = dy < 0 ? -90 * DEG : 90 * DEG;

  s.active = true;
  s.t = 0;
  s.item = slot.item;
  // `perfilGolpe` = item com animação própria (puçá, js/bug-net.js);
  // `danoCorpo` = ferramenta batendo como arma: golpe pesado, com o perfil próprio dela
  s.prof = def.perfilGolpe || (def.danoCorpo ? SWING_HEAVY : SWORD);
  s.damage = def.dano || def.danoCorpo;
  s.reach = def.alcance || SWORD.alcance;
  s.speed = def.rapidez || 1; // faca: golpe inteiro mais rápido
  s.facing = facing;
  s.aim = aim;
  s.start = aim - s.prof.arcoAntes * DEG;
  s.end = aim + s.prof.arcoDepois * DEG;
  if(def.nailSkin!=null){p.nailCombo=(p.nailCombo||0)+1;if(p.nailCombo%2===0){s.start=aim+s.prof.arcoAntes*DEG;s.end=aim-s.prof.arcoDepois*DEG;}}
  s.prevCut = -1;
  s.prevAngle = s.start;
  s.net = !!def.puca; // puçá: o mesmo arco, mas apanhando em vez de golpear (js/bug-net.js)
  s.seismic = !!def.sismica; s.seismicDone = false; // Pata Sísmica (js/bear-loot.js)
  s.caught = false;
  s.hit.clear();

  p.facing = facing;
  p.lockFacing = true;
  playSfx(def.danoCorpo || def.puca ? 'swing' : 'sword', p.cx, p.cy); // rede não tem gume: só o vento
  return true;
}

// ---------- Atualização (chamada a cada passo fixo do jogo) ----------
function updateCombat(game, dt) {
  updateFx(dt);
  const s = game.sword;
  if (!s.active) return;

  s.t += dt * (s.speed || 1);
  const P = s.prof.preparacao, C = s.prof.corte;
  const angle = swordLocalAngle(s, s.t);
  const cut = (s.t - P) / C;

  if (cut > 0 && s.prevCut < 1) {
    const [w0, w1] = SWORD.janelaDano;
    if (cut >= w0 && s.prevCut <= w1) {
      const a0 = s.prevCut < w0 ? swordLocalAngle(s, P + w0 * C) : s.prevAngle;
      const a1 = cut > w1 ? swordLocalAngle(s, P + w1 * C) : angle;
      sweepSwordHits(game, s, a0, a1);
    }
    if (!s.net) emitSwingFx(game, s, s.prevCut, Math.min(cut, 1), angle); // puçá não risca lâmina no ar
  }

  s.prevCut = cut;
  s.prevAngle = angle;

  if (s.t >= P + C + s.prof.recuperacao) {
    s.active = false;
    game.player.lockFacing = false;
    game.attackCooldown = SWORD.intervalo + (s.prof.espera || 0);
    game.attackCooldownItem = s.item;
  }
}

// ---------- Hitbox que acompanha o arco ----------
const SWEEP_RADII = [0.2, 0.45, 0.7, 0.88, 1.05]; // frações do alcance testadas ao longo da lâmina

function sweepSwordHits(game, s, a0, a1) {
  if(ITEM_DEFS[s.item]?.nailSkin!=null){sweepEssenceNailHits(game,s);return;}
  const p = game.player;
  const { x: ox, y: oy } = shoulderPos(p, swordLunge(s));
  const maxR = s.reach * SWEEP_RADII[SWEEP_RADII.length - 1] + 2;
  const steps = Math.max(1, Math.ceil(Math.abs(a1 - a0) / (8 * DEG)));

  // Pata Sísmica: o golpe bate no chão e solta a onda para a frente (js/bear-loot.js)
  if (s.seismic && !s.seismicDone) { s.seismicDone = true; bearSeismicSwing(game, ITEM_DEFS[s.item]); }
  // Puçá: a malha apanha bichinho em vez de machucar, e não ceifa mato (js/bug-net.js)
  if (s.net) { netSweep(game, s, ox, oy, a0, a1, steps, SWEEP_RADII); return; }
  // A lâmina também ceifa o mato que ela atravessa (js/environment.js)
  if (typeof cutEnvironmentSweep === 'function') cutEnvironmentSweep(game, s, ox, oy, a0, a1, steps, SWEEP_RADII);
  if (!game.mobs.length) return;

  for (const mob of game.mobs) {
    if (mob.dead || mob === game.mount || s.hit.has(mob)) continue;
    // descarte rápido: o ponto do inimigo mais perto do ombro está fora do alcance
    const nx = clamp(ox, mob.x, mob.x + mob.w) - ox, ny = clamp(oy, mob.y, mob.y + mob.h) - oy;
    if (nx * nx + ny * ny > maxR * maxR) continue;

    search: for (let i = 0; i <= steps; i++) {
      const wa = swordWorldAngle(s, lerp(a0, a1, i / steps));
      const c = Math.cos(wa), sn = Math.sin(wa);
      for (const k of SWEEP_RADII) {
        const hx = ox + c * s.reach * k, hy = oy + sn * s.reach * k;
        if (mob.containsPoint(hx, hy, 2)) {
          applySwordHit(game, s, mob, hx, hy, wa);
          break search;
        }
      }
    }
  }
}

function applySwordHit(game, s, mob, hx, hy, wa) {
  s.hit.add(mob);
  // Presa Partida soma dano em bicho inteiro; Garras do Alfa contam o combo (js/bear-loot.js)
  // Olho de Âmbar e Manto Listrado também entram aqui (js/tiger-loot.js)
  mob.hit(gearMeleeDamage(game, mob, s), game.player.cx);
  bearOnPlayerHit(game, mob, s.item);
  referenceOnStrike(game,mob,s.item);
  spiderOnSwordHit(game, s, mob);  // veneno da Agulha da Fiandeira (js/spider-loot.js)
  beetleOnSwordHit(game, s, mob);  // Marreta de Carapaça (js/beetle-loot.js)
  mob.vx *= SWORD.empurrao;
  if (s.aim < 0) mob.vy = -340;                       // golpe para cima joga o inimigo para o alto
  else if (s.aim > 0 && !mob.onGround) mob.vy = 220;  // golpe para baixo derruba quem está no ar

  const tangent = wa + s.facing * Math.PI / 2;
  spawnFx(FX.IMPACT, hx, hy, 0, 0, tangent, 0, 0, 1, 0.14, false);
  mobParticles(game, mob, 4, 'rgb(230,70,80)');
  game.hitStop = SWORD.hitStop;
  game.shake = SWORD.tremor;
}

// ---------- Efeitos (lista fixa, sem criar objetos durante o jogo) ----------
const FX = { NONE: 0, MOTE: 1, GUST: 2, STREAK: 3, IMPACT: 4 };
const FX_POOL_SIZE = 64;
const fxPool = Array.from({ length: FX_POOL_SIZE }, () => ({
  type: FX.NONE, x: 0, y: 0, vx: 0, vy: 0, ang: 0, span: 0, rad: 0, size: 0, life: 0, t: 0, follow: false,
}));
let fxCursor = 0;

function spawnFx(type, x, y, vx, vy, ang, span, rad, size, life, follow) {
  let e = null;
  for (let i = 0; i < FX_POOL_SIZE; i++) {
    const idx = (fxCursor + i) % FX_POOL_SIZE;
    if (fxPool[idx].type === FX.NONE) {
      e = fxPool[idx];
      fxCursor = (idx + 1) % FX_POOL_SIZE;
      break;
    }
  }
  if (!e) { // lista cheia: recicla o mais antigo
    e = fxPool[fxCursor];
    fxCursor = (fxCursor + 1) % FX_POOL_SIZE;
  }
  e.type = type; e.x = x; e.y = y; e.vx = vx; e.vy = vy;
  e.ang = ang; e.span = span; e.rad = rad; e.size = size;
  e.life = life; e.t = 0; e.follow = follow;
}

function updateFx(dt) {
  const drag = Math.exp(-7 * dt);
  for (const e of fxPool) {
    if (e.type === FX.NONE) continue;
    e.t += dt;
    if (e.t >= e.life) { e.type = FX.NONE; continue; }
    if (e.type === FX.GUST) {
      e.ang += e.vx * dt; // vx = velocidade angular da rajada
    } else if (e.type === FX.MOTE || e.type === FX.STREAK) {
      e.vx *= drag;
      e.vy *= drag;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
    }
  }
}

const crossed = (c0, c1, mark) => c0 < mark && c1 >= mark;

// Solta os efeitos sincronizados com o trecho do corte percorrido neste passo (c0 → c1)
function emitSwingFx(game, s, c0, c1, localAngle) {
  const { x: ox, y: oy } = shoulderPos(game.player, swordLunge(s));
  const wa = swordWorldAngle(s, localAngle);
  const dir = s.facing;                  // +1 = horário na tela, -1 = anti-horário
  const tan = wa + dir * Math.PI / 2;    // direção em que a ponta está se movendo
  const tipX = ox + Math.cos(wa) * s.reach, tipY = oy + Math.sin(wa) * s.reach;

  // Fragmentos de vento saindo da ponta, só na parte rápida
  if (c1 >= 0.2 && c0 <= 0.8) {
    const sp = 90 + Math.random() * 70, out = 30 + Math.random() * 40;
    spawnFx(FX.MOTE,
      tipX + (Math.random() - 0.5) * 4, tipY + (Math.random() - 0.5) * 4,
      Math.cos(tan) * sp + Math.cos(wa) * out, Math.sin(tan) * sp + Math.sin(wa) * out,
      0, 0, 0, Math.random() < 0.4 ? 2 : 1, 0.18 + Math.random() * 0.1, false);
  }

  // Rajadas que contornam o personagem, nascendo logo atrás da lâmina
  if (crossed(c0, c1, 0.32)) {
    spawnFx(FX.GUST, ox, oy, dir * 7, 0, wa - dir * 0.9, 1.0, s.reach + 7, 2.2, 0.2, true);
  }
  if (crossed(c0, c1, 0.5)) {
    spawnFx(FX.GUST, ox, oy, dir * 9, 0, wa - dir * 1.3, 1.3, s.reach + 14, 1.6, 0.22, true);
    spawnFx(FX.STREAK, tipX, tipY,
      Math.cos(tan) * 160 + Math.cos(wa) * 60, Math.sin(tan) * 160 + Math.sin(wa) * 60,
      0, 0, 0, 9, 0.12, false);
  }
  if (crossed(c0, c1, 0.62)) {
    spawnFx(FX.GUST, ox, oy, dir * 6, 0, wa - dir * 1.6, 1.1, 17, 1.4, 0.18, true); // colada ao corpo
    const t2 = tan + dir * 0.35;
    spawnFx(FX.STREAK, tipX, tipY, Math.cos(t2) * 190, Math.sin(t2) * 190, 0, 0, 0, 7, 0.1, false);
  }
}

// ---------- Desenho ----------
const _pose = { x: 0, y: 0, angle: 0, lunge: 0, item: 0 };

// Pose do braço/espada para o renderer (null quando não está golpeando)
function swordPose(game) {
  const s = game.sword;
  if (!s.active) return null;
  const lunge = swordLunge(s);
  const sh = shoulderPos(game.player, lunge);
  _pose.x = sh.x;
  _pose.y = sh.y;
  _pose.lunge = lunge;
  _pose.item = s.item;
  _pose.angle = swordWorldAngle(s, swordLocalAngle(s, s.t));
  return _pose;
}

function arcQuad(ctx, cx, cy, a0, a1, r0, r1) {
  const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
  ctx.beginPath();
  ctx.moveTo(cx + c0 * r0, cy + s0 * r0);
  ctx.lineTo(cx + c0 * r1, cy + s0 * r1);
  ctx.lineTo(cx + c1 * r1, cy + s1 * r1);
  ctx.lineTo(cx + c1 * r0, cy + s1 * r0);
  ctx.closePath();
  ctx.fill();
}

const TRAIL_SEG = 14;
const _trailAngles = new Float32Array(TRAIL_SEG + 1);

// Rastro: faixa entre o ângulo de ~70ms atrás e o atual, calculada pela própria curva do golpe
function drawSwordTrail(ctx, s, p) {
  if(ITEM_DEFS[s.item]?.nailSkin!=null){drawEssenceNailSlash(ctx,s,p);return;}
  const P = s.prof.preparacao, C = s.prof.corte;
  if (s.t <= P) return;
  const cutEnd = P + C;
  const head = Math.min(s.t, cutEnd);
  const tail = Math.max(P, s.t - SWORD.rastro);
  if (head - tail < 0.004) return;
  const fade = s.t <= cutEnd ? 1 : Math.max(0, 1 - (s.t - cutEnd) / (s.prof.recuperacao * 0.5));
  if (fade <= 0) return;

  const { x: ox, y: oy } = shoulderPos(p, swordLunge(s));
  for (let i = 0; i <= TRAIL_SEG; i++) {
    _trailAngles[i] = swordWorldAngle(s, swordLocalAngle(s, lerp(tail, head, i / TRAIL_SEG)));
  }
  const rOut = s.reach, rIn = SWORD.maoRaio + 1;

  // Puçá: só o ar deslocado pelo aro, bem de leve. Nada de fio de lâmina (js/bug-net.js)
  if (s.net) {
    ctx.fillStyle = '#eef6ff';
    for (let i = 0; i < TRAIL_SEG; i++) {
      const k = (i + 1) / TRAIL_SEG;
      ctx.globalAlpha = 0.1 * k * fade;
      arcQuad(ctx, ox, oy, _trailAngles[i], _trailAngles[i + 1], rOut - 10, rOut + 2);
    }
    ctx.globalAlpha = 1;
    return;
  }

  // Armas de chefe pintam o próprio rastro (cor da faixa, cor do fio e fios extras)
  const style = swordTrailStyle(s.item);
  // Faixa suave (ar deslocado), mais forte perto da lâmina. Mistura normal: fica branca em qualquer fundo
  ctx.fillStyle = style.band;
  for (let i = 0; i < TRAIL_SEG; i++) {
    const k = (i + 1) / TRAIL_SEG;
    ctx.globalAlpha = style.bandA * k * fade;
    arcQuad(ctx, ox, oy, _trailAngles[i], _trailAngles[i + 1], rIn + (1 - k) * 9, rOut);
  }
  // Fio brilhante na borda do corte (soma luz, brilha também no escuro); alguns têm mais de um
  ctx.globalCompositeOperation = 'lighter';
  for (const [off, col, w] of style.edges) {
    ctx.fillStyle = col;
    for (let i = 0; i < TRAIL_SEG; i++) {
      const k = (i + 1) / TRAIL_SEG;
      ctx.globalAlpha = 0.9 * k * k * fade;
      arcQuad(ctx, ox, oy, _trailAngles[i], _trailAngles[i + 1], rOut - off - w - 2 * k, rOut - off + 1);
    }
  }
  ctx.globalCompositeOperation = 'source-over';
}
// Rastro de cada arma de chefe: faixa, transparência e fios [recuo da borda, cor, espessura]
const SWORD_TRAIL_DEFAULT = { band: '#eef6ff', bandA: 0.26, edges: [[0, '#ffffff', 1]] };
function swordTrailStyle(item) {
  if(ITEM_DEFS[item]?.trailStyle)return ITEM_DEFS[item].trailStyle;
  switch (item) {
    case ITEM.ALPHA_CLAWS: return { band: '#ffb0a0', bandA: 0.22, edges: [[0, '#fff0e8', 0.6], [4, '#ff8a70', 0.4], [8, '#ffd0c4', 0.4]] }; // três garras
    case ITEM.SPINNER_NEEDLE: return { band: '#c8f0a0', bandA: 0.28, edges: [[0, '#f0ffd8', 1]] };
    case ITEM.SEISMIC_PAW: return { band: '#e6c490', bandA: 0.34, edges: [[0, '#fff0cc', 2]] };
    case ITEM.CARAPACE_MAUL: return { band: '#b8cce8', bandA: 0.34, edges: [[0, '#f0f6ff', 2]] };
    default: return SWORD_TRAIL_DEFAULT;
  }
}

// Desenhado depois da camada de luz, com a mesma transformação do mundo
function drawCombatEffects(ctx, game) {
  const s = game.sword;
  let anyFx = false;
  for (const e of fxPool) if (e.type !== FX.NONE) { anyFx = true; break; }
  if (!s.active && !anyFx) return;

  ctx.save();
  ctx.lineCap = 'round';
  if (s.active) drawSwordTrail(ctx, s, game.player);

  const { x: ox, y: oy } = shoulderPos(game.player, swordLunge(s));
  for (const e of fxPool) {
    if (e.type === FX.NONE) continue;
    const k = e.t / e.life;

    if (e.type === FX.MOTE) {
      ctx.globalAlpha = (1 - k) * 0.9;
      ctx.fillStyle = '#eef6ff';
      ctx.fillRect(e.x - e.size / 2, e.y - e.size / 2, e.size, e.size);
    } else if (e.type === FX.STREAK) {
      const sp = Math.hypot(e.vx, e.vy) || 1;
      const len = e.size * (1 - k * 0.6);
      ctx.globalAlpha = (1 - k) * 0.8;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(e.x, e.y);
      ctx.lineTo(e.x - (e.vx / sp) * len, e.y - (e.vy / sp) * len);
      ctx.stroke();
    } else if (e.type === FX.GUST) {
      const cx = e.follow ? ox : e.x, cy = e.follow ? oy : e.y;
      const a = k < 0.2 ? k / 0.2 : 1 - (k - 0.2) / 0.8; // entra rápido e some logo
      const r = e.rad + k * 5;
      const dir = e.vx >= 0 ? 1 : -1;
      const span = e.span * (0.7 + 0.3 * a);
      const a0 = e.ang, a1 = e.ang + span * dir;
      ctx.strokeStyle = '#dcebff';
      ctx.globalAlpha = a * 0.35;
      ctx.lineWidth = e.size * 1.6;
      ctx.beginPath();
      ctx.arc(cx, cy, r, a0, a1, dir < 0);
      ctx.stroke();
      ctx.strokeStyle = '#ffffff';
      ctx.globalAlpha = a * 0.85;
      ctx.lineWidth = e.size * 0.5;
      ctx.beginPath();
      ctx.arc(cx, cy, r, a0 + span * dir * 0.45, a1, dir < 0);
      ctx.stroke();
    } else if (e.type === FX.IMPACT) {
      const ease = easeOutCubic(k);
      ctx.globalCompositeOperation = 'lighter'; // flash de impacto soma luz
      ctx.globalAlpha = 1 - k;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5 * (1 - k) + 0.5;
      ctx.beginPath();
      ctx.arc(e.x, e.y, 2 + ease * 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const ra = e.ang + (i / 6) * Math.PI * 2;
        const r0 = 3 + ease * 6, r1 = r0 + (i % 3 === 0 ? 8 : 4) * (1 - k * 0.5); // raios longos na direção do corte
        ctx.moveTo(e.x + Math.cos(ra) * r0, e.y + Math.sin(ra) * r0);
        ctx.lineTo(e.x + Math.cos(ra) * r1, e.y + Math.sin(ra) * r1);
      }
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    }
  }
  ctx.restore();
}
