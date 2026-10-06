'use strict';

// =====================================================================================
//  PUÇÁ
// =====================================================================================
// Rede de cabo comprido para apanhar bicho pequeno e manso: inseto, libélula, coelho,
// lebre, ave, jabuti e peixinho. Bicho bravo, grande ou chefe não entra na rede — a
// puçá passa por ele sem machucar e sem pegar. O bicho apanhado vira item e o botão
// direito solta ele vivo de volta no mundo.

Object.assign(ITEM, {
  BUG_NET: 155, CRITTER_DRAGONFLY: 156, CRITTER_RABBIT: 157, CRITTER_HARE: 158,
  CRITTER_BIRD: 159, CRITTER_TORTOISE: 160, CRITTER_FISH: 161,
});

// Golpe de rede: nada de estocada de espada. O braço arma bem atrás, a varrida é larga e
// mais demorada (a rede é leve mas volumosa) e o fim assenta devagar, com o saco de malha
// ainda balançando. Os campos que faltam vêm de SWORD (js/combat.js).
const SWING_NET = {
  preparacao: 0.11,        // s — leva a rede para trás do ombro
  corte: 0.19,             // s — a varrida em si, quase o dobro da espada
  recuperacao: 0.17,       // s — o cabo comprido custa a parar
  arcoAntes: 150,          // graus — começa quase nas costas
  arcoDepois: 48,          // graus — e termina à frente e um pouco abaixo, sem varrer o chão
  recuo: 8,                // graus de armação (a rede quase não recua)
  assenta: -26,            // graus — depois da varrida a rede volta a subir, em vez de cair
  espera: 0.05,            // s de espera extra entre golpes
};

defItem(ITEM.BUG_NET, { name: 'Puçá', puca: true, alcance: 46, perfilGolpe: SWING_NET }); // cabo comprido
// `criatura` faz duas coisas: dá o ícone (tirado da arte do próprio bicho, em js/tiles.js)
// e diz o que nasce quando o jogador solta o item de volta.
defItem(ITEM.CRITTER_DRAGONFLY, { name: 'Libélula', criatura: 'dragonfly' });
defItem(ITEM.CRITTER_RABBIT,    { name: 'Coelho', criatura: 'rabbit' });
defItem(ITEM.CRITTER_HARE,      { name: 'Lebre da neve', criatura: 'snowhare' });
defItem(ITEM.CRITTER_BIRD,      { name: 'Ave da selva', criatura: 'bird' });
defItem(ITEM.CRITTER_TORTOISE,  { name: 'Jabuti', criatura: 'tortoise' });
defItem(ITEM.CRITTER_FISH,      { name: 'Peixinho', criatura: 'minnow', peixe: true });

// Cabo fino na diagonal com um risco de luz, e a malha em xadrez de cinzas: é o xadrez,
// e não um tom chapado, que faz o olho ler "rede" num ícone de 16 px. O contorno escuro
// quem põe é o próprio atlas (js/tiles.js).
ITEM_ART[ITEM.BUG_NET] = {
  cores: { l: [222, 230, 238], m: [176, 186, 202], d: [124, 134, 152], D: [84, 92, 110],
    h: [52, 48, 62], H: [178, 186, 212] },
  pixels: [
    '................',
    '.......lmlml....',
    '.....lmlmlmmd...',
    '....lmlmlmmddD..',
    '....mlmlmdddDD..',
    '.....mmdddDDD...',
    '......mddDDh....',
    '.......Hhh......',
    '......hH........',
    '.....Hh.........',
    '....hH..........',
    '...Hh...........',
    '..hH............',
    '.Hh.............',
    '.h..............',
    '................',
  ],
};
ITEM_ART[ITEM.CRITTER_DRAGONFLY] = { // vista de cima: olhos, dois pares de asa e o abdome listrado
  cores: { w: [148, 186, 210], W: [230, 246, 252], b: [86, 176, 214], B: [28, 88, 126], k: [34, 40, 50], e: [64, 200, 208] },
  pixels: [
    '................', '.......kk.......', '......keek......', '.......bb.......',
    '.wwww..bb..wwww.', 'wWWWWw.bb.wWWWWw', '.wwww..bb..wwww.', '..www..bb..www..',
    '.wWWWw.bb.wWWWw.', '..www..bb..www..', '.......bb.......', '.......BB.......',
    '.......bb.......', '.......BB.......', '.......bb.......', '................',
  ],
};

// Espécie -> item que fica na mão. O peixinho é um item só para todos os peixes
// pequenos e mansos: soltar de volta escolhe a espécie que combina com aquela água.
const NET_CATCH = {
  rabbit: ITEM.CRITTER_RABBIT, snowhare: ITEM.CRITTER_HARE,
  bird: ITEM.CRITTER_BIRD, tortoise: ITEM.CRITTER_TORTOISE,
};
for (const [kind, a] of Object.entries(AQUATIC))
  if (!a.dano && a.w <= 13 && !a.max) NET_CATCH[kind] = ITEM.CRITTER_FISH;

// Aro de graveto e malha de fibra (ou de teia). A receita fica aqui porque
// js/recipes.js já rodou quando a puçá nasceu.
RECIPES.push(
  { nome: 'Puçá', ingredientes: [[ITEM.STICK, 3], [ITEM.FIBER, 6]], resultado: { item: ITEM.BUG_NET, quantidade: 1 } },
  { nome: 'Puçá (teia)', ingredientes: [[ITEM.STICK, 3], [ITEM.SILK, 4]], resultado: { item: ITEM.BUG_NET, quantidade: 1 } },
);

// Arte do bicho para o ícone do item (js/tiles.js, ao montar o atlas)
function critterIconSource(kind) {
  try {
    if (AQUATIC[kind]) return aquaticSprite(kind, 0).normal;
    if (WILDLIFE[kind]) return wildlifeSprite(kind, 0).normal;
  } catch (_) {}
  return null;
}

// ---------- A puçá na mão ----------
// Não é um ícone girando como lâmina: o cabo sai da mão, o aro vai na ponta e o saco de
// malha arrasta para trás do movimento, abrindo no meio da varrida e assentando no fim.
// Desenhado no espaço do braço (origem na mão, +x para a ponta) por js/renderer.js.
// Mesmas cores do ícone: cabo escuro com risco de luz, malha prateada com contorno
// escuro e um fio de sombra do lado de dentro.
const NET_LOOK = {
  cabo: '#34303f', caboClaro: '#b2b8d2', contorno: '#1e1c28',
  malha: '#e6ecf2', malhaSombra: '#9aa2b4', fio: '#6e7688', aroClaro: '#ced6e4',
};
function paintNetInHand(ctx, s) {
  const P = s.prof.preparacao, C = s.prof.corte;
  // 0 enquanto arma, cresce até o meio da varrida e cai na recuperação
  const cut = clamp((s.t - P) / C, 0, 1);
  const speed = s.t < P ? .12 : s.t < P + C ? Math.sin(Math.PI * cut)
    : Math.max(0, 1 - (s.t - P - C) / s.prof.recuperacao) * .3;
  // O saco arrasta contra o movimento enquanto a rede corta o ar e pendura para baixo
  // assim que ela assenta. `baixo` é o chão visto de dentro do braço girado.
  const arm = swordWorldAngle(s, swordLocalAngle(s, s.t));
  const back = -(s.facing > 0 ? 1 : -1);
  const dirX = lerp(Math.sin(arm) * .8, -.55, speed), dirY = lerp(Math.cos(arm) * .8, back, speed);
  const bulge = s.caught ? 1 + 1.5 * Math.max(0, 1 - (s.t - s.caughtAt) * 6) : 1; // bicho preso: a malha estufa
  const hoopX = 26, ry = 8.5 * bulge, rx = 4 + 1.6 * speed;
  const len = (9 + 8 * speed) * bulge;
  const tipX = hoopX + dirX * len, tipY = dirY * len;
  const cx = hoopX + dirX * len * .45, cy = dirY * len * .45;

  ctx.lineCap = 'round';
  // Cabo fino e escuro, com o risco de luz por cima
  ctx.strokeStyle = NET_LOOK.cabo; ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(-1, 0); ctx.lineTo(hoopX - 1, 0); ctx.stroke();
  ctx.strokeStyle = NET_LOOK.caboClaro; ctx.lineWidth = .9;
  ctx.beginPath(); ctx.moveTo(1, -.8); ctx.lineTo(hoopX - 3, -.8); ctx.stroke();

  // A cabeça da rede é uma massa só, como no ícone: a boca do aro arredondada na frente
  // e o saco afinando atrás. Uma silhueta fechada, contorno fino, e a sombra por dentro.
  const head = new Path2D();
  head.moveTo(hoopX, -ry);
  head.quadraticCurveTo(cx, cy - ry * .6, tipX, tipY);           // borda de trás do saco
  head.quadraticCurveTo(cx, cy + ry * .6, hoopX, ry);            // e de volta à boca
  head.quadraticCurveTo(hoopX + rx * 2.4, 0, hoopX, -ry);        // boca do aro, para a frente
  head.closePath();
  ctx.fillStyle = NET_LOOK.malha; ctx.fill(head);
  // Sombra e trama ficam presas dentro da silhueta
  ctx.save(); ctx.clip(head);
  ctx.strokeStyle = NET_LOOK.malhaSombra; ctx.lineWidth = 3.2;
  ctx.beginPath(); ctx.moveTo(hoopX, ry); ctx.quadraticCurveTo(cx, cy + ry * .6, tipX, tipY); ctx.stroke();
  ctx.strokeStyle = NET_LOOK.fio; ctx.lineWidth = .8;
  for (const k of [-.45, .45]) {
    ctx.beginPath();
    ctx.moveTo(hoopX + rx * .6, ry * k);
    ctx.quadraticCurveTo(cx, cy + ry * k * .6, tipX, tipY);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = NET_LOOK.contorno; ctx.lineWidth = 1.2; ctx.stroke(head);
  // Boca do aro: risco claro na frente, que é por onde o bicho entra
  ctx.strokeStyle = NET_LOOK.aroClaro; ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(hoopX, -ry + 1); ctx.quadraticCurveTo(hoopX + rx * 1.9, 0, hoopX, ry - 1);
  ctx.stroke();
}

const netCatchable = m => m && !m.dead && !m.hostile && m !== game.mount && NET_CATCH[m.kind];

function netCatch(g, item, name, x, y) {
  giveItem(item);
  toast('Na rede: ' + name);
  playSfx('pickup', x, y);
  for (let i = 0; i < 8 && g.particles.length < 420; i++) g.particles.push({
    x: x + (Math.random() - .5) * 12, y: y + (Math.random() - .5) * 12,
    vx: (Math.random() - .5) * 60, vy: -30 - Math.random() * 50,
    life: .4 + Math.random() * .3, maxLife: .7, color: 'rgb(226,236,244)',
  });
}

// Golpe com a puçá na mão: varre o mesmo arco da espada, mas em vez de machucar,
// apanha o primeiro bicho pequeno que a malha encostar (js/combat.js).
function netSweep(g, s, ox, oy, a0, a1, steps, radii) {
  if (s.caught) return;
  for (let i = 0; i <= steps; i++) {
    const wa = swordWorldAngle(s, lerp(a0, a1, i / steps)), c = Math.cos(wa), sn = Math.sin(wa);
    for (const k of radii) {
      const hx = ox + c * s.reach * k, hy = oy + sn * s.reach * k;
      // Insetos do mato e libélulas do rio: bichinhos soltos, não entram em game.mobs
      const bugs = g.critters || [];
      for (let b = 0; b < bugs.length; b++)
        if (Math.abs(bugs[b].x - hx) < 7 && Math.abs(bugs[b].y - hy) < 7) {
          bugs.splice(b, 1); s.caught = true; s.caughtAt = s.t;
          return netCatch(g, ITEM.INSECT, ITEM_DEFS[ITEM.INSECT].name, hx, hy);
        }
      const flies = g.dragonflies || [];
      for (let d = 0; d < flies.length; d++)
        if (Math.abs(flies[d].x - hx) < 10 && Math.abs(flies[d].y - hy) < 10) {
          flies.splice(d, 1); s.caught = true; s.caughtAt = s.t;
          return netCatch(g, ITEM.CRITTER_DRAGONFLY, 'Libélula', hx, hy);
        }
      for (const m of g.mobs) {
        if (m.dead || !m.containsPoint(hx, hy, 2)) continue;
        const item = netCatchable(m);
        if (!item) { // bravo, grande ou chefe: a rede não segura
          if (g.toast.t <= 0) toast('A puçá só pega bicho pequeno e manso.');
          continue;
        }
        m.dead = true;
        g.mobs.splice(g.mobs.indexOf(m), 1);
        s.caught = true; s.caughtAt = s.t;
        return netCatch(g, item, m.def?.name || 'Bicho', m.cx, m.cy);
      }
    }
  }
}

// ---------- Soltar de volta ----------
// Peixe pequeno escolhe a espécie pela água em que foi solto; os outros voltam a ser
// exatamente o que eram.
function releaseCritter(g, item, tx, ty) {
  const def = ITEM_DEFS[item], w = g.world;
  if (!def?.criatura) return false;
  if (item === ITEM.INSECT) {
    if (w.isSolid(tx, ty)) return false;
    spawnEnvCritter(g, tx * T + T / 2, ty * T + T / 2);
    return true;
  }
  if (item === ITEM.CRITTER_DRAGONFLY) {
    if (w.isSolid(tx, ty) || w.hasWater(tx, ty)) return false;
    (g.dragonflies ??= []).push({
      x: tx * T + T / 2, y: ty * T + T / 2, hx: tx * T + T / 2, water: (ty + 3) * T,
      tx: tx * T + T / 2, ty: ty * T + T / 2, wait: 0, phase: Math.random() * 10,
      color: DRAGONFLY_COLORS[Math.floor(Math.random() * DRAGONFLY_COLORS.length)],
      fade: 1, life: 25 + Math.random() * 30, facing: 1,
    });
    return true;
  }
  if (def.peixe) {
    if (w.waterLevel(tx, ty) < WATER_MAX || w.isWaterfall(tx, ty)) return false;
    const room = typeof waterRoom === 'function' ? waterRoom(w, tx, ty) : null;
    const kind = (typeof pickAquatic === 'function' && pickAquatic(w, tx, ty, room)) || def.criatura;
    const spec = AQUATIC[NET_CATCH[kind] ? kind : def.criatura] ? kind : def.criatura;
    const a = AQUATIC[spec];
    const m = new Wildlife(spec, 0, 0);
    m.x = tx * T + T / 2 - a.w / 2; m.y = ty * T + T / 2 - a.h / 2;
    if (!boxInWater(w, m.x, m.y, m.w, m.h)) return false;
    m.variant = Math.floor(Math.random() * 3);
    m.dir = Math.random() < .5 ? -1 : 1; m.facing = m.dir;
    m.home = { x: m.cx, y: m.cy };
    g.mobs.push(m);
    return true;
  }
  // Bicho de terra: precisa de chão firme embaixo e espaço para ele caber
  const animal = new Wildlife(def.criatura, tx * T + T / 2 - WILDLIFE[def.criatura].w / 2, ty * T);
  animal.y = (ty + 1) * T - animal.h - .01;
  if (animal.collides(w, animal.x, animal.y)) return false;
  if (!w.isSolid(tx, ty + 1) && def.criatura !== 'bird') return false;
  animal.facing = g.player.cx > animal.cx ? -1 : 1;
  g.mobs.push(animal);
  return true;
}

// Botão direito com o bicho na mão: solta vivo onde o cursor aponta
function tryReleaseCritter(g, tx, ty) {
  const held = g.inventory.slots[g.selected];
  const def = held && ITEM_DEFS[held.item];
  if (!def?.criatura) return false;
  if (!releaseCritter(g, held.item, tx, ty)) {
    if (g.toast.t <= 0) toast(def.peixe ? 'Solte o peixinho dentro da água.' : 'Não cabe um bicho aí.');
    return true; // consumiu o clique de qualquer jeito, para não colocar bloco sem querer
  }
  g.inventory.takeFromSlot(g.selected);
  playSfx('place', tx * T, ty * T, { tile: TILE.DIRT, vol: .4 });
  toast('Solto: ' + def.name);
  return true;
}
