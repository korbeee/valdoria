'use strict';

// =====================================================================================
//  ESPÓLIO DO TIGRE  —  o que cai do Tigre da Savana (js/savanna.js)
// =====================================================================================
// Quatro peças, todas garantidas (o chefe não volta depois de cair):
//   Passo do Predador  acessório: esquiva curta no chão (Shift), com recarga
//   Olho de Âmbar      acessório: marca inimigos feridos por perto, até no escuro, e bate mais neles
//   Manto Listrado     capa: correr alguns segundos fortalece o próximo golpe corpo a corpo
//   Instinto da Caçada reutilizável: pegadas até as criaturas próximas por alguns segundos
// A esquiva fica em js/gear-movement.js, junto dos outros movimentos de equipamento.

// O id 171 era das Presas Gêmeas, removidas: fica vago.
Object.assign(ITEM, { PREDATOR_STEP: 172, AMBER_EYE: 173, STRIPED_CLOAK: 174, HUNT_INSTINCT: 175 });

defItem(ITEM.PREDATOR_STEP, {
  name: 'Passo do Predador', acessorio: { esquiva: true }, esquiva: { velocidade: 430, tempo: 0.18, protecao: 0.3, espera: 1.1 },
  maxStack: 1, descricao: 'Equipado: Shift dá uma esquiva curta no chão. Recarga de 1,1 s.',
});
defItem(ITEM.AMBER_EYE, {
  name: 'Olho de Âmbar', acessorio: { ambar: 1.15 }, maxStack: 1,
  descricao: 'Equipado: inimigos feridos por perto brilham, até no escuro, e levam +15% de dano.',
});
defItem(ITEM.STRIPED_CLOAK, {
  name: 'Manto Listrado', roupa: { defesa: 0.18, visual: 'tiger' }, manto: { tempo: 2.5, bonus: 1.6 }, maxStack: 1,
  descricao: 'Capa: correr 2,5 s seguidos fortalece o próximo golpe corpo a corpo em 60%.',
});
defItem(ITEM.HUNT_INSTINCT, {
  name: 'Instinto da Caçada', instinto: { duracao: 8, espera: 20, raio: 150, alvos: 4 }, maxStack: 1,
  descricao: 'Botão direito: revela por 8 s as pegadas até as criaturas próximas. Recarga de 20 s.',
});

// ---------- Dano extra dos equipamentos ----------
// Junta tudo o que mexe no dano de um golpe corpo a corpo (js/combat.js)
function gearMeleeDamage(g, mob, s) {
  let dmg = bearDamageBonus(g, mob, s.damage); // Presa Partida (js/bear-loot.js)
  const amber = accessoryPower(g, 'ambar');
  if (amber && mob?.def && mob.hp < (mob.def.hp || 1)) dmg = Math.round(dmg * amber);
  if (g.parryBoost) { // Escudo do Escavador: o golpe depois do aparo sai mais forte (js/beetle-loot.js)
    g.parryBoost = 0;
    dmg = Math.round(dmg * ITEM_DEFS[ITEM.DIGGER_SHIELD].escudo.bonus);
    mobParticles(g, mob, 6, "rgb(255,240,170)");
    bfx(g, 'flash', mob.cx, mob.cy, { r0: 4, r1: 26, life: .25, color: [255, 236, 170], a: .6 });
    for (let i = 0; i < 4; i++) bfx(g, 'star', mob.cx + (Math.random() - .5) * 14, mob.cy + (Math.random() - .5) * 10, { vy: -30, size: 3, life: .45, spin: 6 });
  }
  if (g.cloakCharged) {
    g.cloakCharged = false; g.cloakRun = 0;
    dmg = Math.round(dmg * ITEM_DEFS[ITEM.STRIPED_CLOAK].manto.bonus);
    mobParticles(g, mob, 8, 'rgb(255,190,80)');
    g.shake = Math.max(g.shake, 3);
    bfx(g, 'flash', mob.cx, mob.cy, { r0: 6, r1: 34, life: .3, color: [255, 170, 60], a: .7 });
    bfx(g, 'ring', mob.cx, mob.cy, { r0: 4, r1: 30, life: .4, color: [255, 160, 60], w: 3 });
    for (let i = 0; i < 14; i++) { const a = Math.random() * 6.28, v = 150 + Math.random() * 180; bfx(g, 'spark', mob.cx, mob.cy, { vx: Math.cos(a) * v, vy: Math.sin(a) * v, drag: 2.5, life: .35, color: [255, 190, 90] }); }
    for (let i = 0; i < 8; i++) bfx(g, 'ember', mob.cx + (Math.random() - .5) * 12, mob.cy, { vx: (Math.random() - .5) * 60, vy: -30 - Math.random() * 60, life: .8, size: 2, color: [255, 150, 40] });
  }
  return dmg;
}

// ---------- Manto Listrado: correr carrega o próximo golpe ----------
function updateStripedCloak(g, dt) {
  const rule = ITEM_DEFS[g.outfit]?.manto, p = g.player;
  if (!rule) { g.cloakRun = 0; g.cloakCharged = false; return; }
  if (g.cloakCharged) {
    if (Math.random() < dt * 16) bfx(g, 'ember', p.cx - p.facing * 6 + (Math.random() - 0.5) * 8, p.y + 8 + Math.random() * 20, { vx: -p.facing * 25, vy: -40 - Math.random() * 30, life: .6, size: Math.random() < .3 ? 2 : 1, color: [255, 160, 50] });
    return;
  }
  const running = p.onGround && Math.abs(p.vx) > WALK_SPEED * 0.85 && !p.crouching;
  if (running) {
    g.cloakRun = (g.cloakRun || 0) + dt; g.cloakIdle = 0;
    // o embalo aparece: listras de tigre saindo das costas, cada vez mais
    if (Math.random() < dt * 20 * (g.cloakRun / rule.tempo)) bfx(g, 'streak', p.cx - p.facing * 7, p.y + 8 + Math.random() * (p.h - 14), { vx: p.facing, len: 8 + Math.random() * 10, life: .25, cols: [[236, 150, 60], [236, 150, 60], [40, 24, 20]] });
  }
  else if ((g.cloakIdle = (g.cloakIdle || 0) + dt) > 0.35) g.cloakRun = 0; // parou: perde o embalo
  if (g.cloakRun >= rule.tempo) {
    g.cloakCharged = true;
    playSfx('tigerGrowl', p.cx, p.cy, { vol: 0.35 });
    toast('Manto Listrado: o próximo golpe vai com tudo.');
  }
}

// ---------- Instinto da Caçada ----------
function useHuntInstinct(g) {
  const rule = ITEM_DEFS[ITEM.HUNT_INSTINCT].instinto, p = g.player;
  if ((g.clock || 0) < (g.instinctReady || 0)) {
    toast(`O instinto ainda descansa: ${Math.ceil(g.instinctReady - g.clock)} s.`);
    return;
  }
  const found = huntTargets(g, rule);
  g.instinctReady = (g.clock || 0) + rule.espera;
  g.placeCooldown = 0.5;
  playSfx('tigerGrowl', p.cx, p.cy, { vol: 0.5 });
  if (!found.length) { g.hunt = null; toast('Nenhum rastro por perto.'); return; }
  g.hunt = { t: rule.duracao, max: rule.duracao, targets: found, trails: [], refresh: 0 };
  buildHuntTrails(g);
  const rare = found.filter((m) => m.boss || m.def?.unique).length;
  toast(`Você sente ${found.length} rastro${found.length > 1 ? 's' : ''}` + (rare ? ' — um deles é de algo raro.' : '.'));
}

// Os mais perto; chefes e criaturas únicas contam como se estivessem bem mais perto
function huntTargets(g, rule) {
  const p = g.player, list = [];
  for (const m of g.mobs) {
    if (m.dead || m === g.mount || m.def?.aquatic) continue;
    const d = Math.hypot(m.cx - p.cx, m.cy - p.cy) / T;
    if (d > rule.raio || d < 2) continue;
    list.push({ m, score: d * (m.boss || m.def?.unique ? 0.2 : 1) });
  }
  return list.sort((a, b) => a.score - b.score).slice(0, rule.alvos).map((e) => e.m);
}

// Pegadas no chão entre o jogador e cada alvo, a cada 1,5 bloco, pousadas no primeiro chão
function buildHuntTrails(g) {
  const h = g.hunt, p = g.player, w = g.world;
  h.trails = [];
  for (const m of h.targets) {
    if (m.dead) continue;
    const pts = [], dist = Math.hypot(m.cx - p.cx, m.cy - p.cy), n = Math.max(2, Math.floor(dist / (1.5 * T)));
    for (let i = 1; i < n; i++) {
      const k = i / n, x = lerp(p.cx, m.cx, k), y = lerp(p.y + p.h, m.y + m.h, k), tx = Math.floor(x / T);
      let ty = Math.floor(y / T), ok = false;
      // procura o chão perto da linha: primeiro desce, depois sobe
      for (let d = 0; d < 6 && !ok; d++) for (const yy of [ty + d, ty - d]) {
        if (w.isSolid(tx, yy) && !w.isSolid(tx, yy - 1)) { ty = yy; ok = true; break; }
      }
      if (ok) pts.push({ x, y: ty * T, side: i % 2 });
    }
    h.trails.push({ mob: m, pts });
  }
}

function updateHuntInstinct(g, dt) {
  const h = g.hunt;
  if (!h) return;
  h.t -= dt;
  if (h.t <= 0) { g.hunt = null; return; }
  if ((h.refresh -= dt) <= 0) { h.refresh = 0.8; buildHuntTrails(g); } // os bichos andam
}


// Pegadas do instinto e marcas do Olho de Âmbar são desenhadas em js/boss-fx.js.

// ---------- Ciclo ----------
function updateTigerLoot(g, dt) {
  updateStripedCloak(g, dt);
  updateHuntInstinct(g, dt);
}

// Botão direito com o Instinto na mão (chamado de handleInteraction em js/game.js)
function tigerLootUse(g, heldDef, rightPressed) {
  if (rightPressed && heldDef?.instinto && g.placeCooldown <= 0) { useHuntInstinct(g); return true; }
  return false;
}
