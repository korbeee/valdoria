'use strict';

// Perigos dos novos guardiões: aviso fixo, janela ativa e fim definidos.
// Cada encontro atualiza apenas seus próprios perigos e os apaga ao reiniciar.
function guardianClear(g, kind) {
  g.guardianHazards = (g.guardianHazards || []).filter(h => h.owner !== kind);
  for (const m of g.mobs || []) if (m.kind === kind) { m.powerCd = 7; m.powerTurn = 0; }
}
function guardianHazard(g, m, type, x, y, options = {}) {
  const list = g.guardianHazards ??= [];
  if (list.filter(h => h.owner === m.kind).length >= 24) return;
  list.push({ owner: m.kind, type, x, y, age: 0, warn: .85, life: 1.1,
    radius: 20, height: 28, damage: 10, vx: 0, ...options });
}
function guardianFloor(w, x, start, fallback) {
  const tx = Math.floor(x / T);
  for (let ty = Math.floor(start / T); ty < Math.floor(fallback / T) + 2; ty++) {
    if (w.isSolid(tx, ty) || TILE_DEFS[w.getTile(tx, ty)]?.plataforma) return ty * T;
  }
  return fallback;
}
function guardianUpdateHazards(g, m, dt, w, p) {
  const list = g.guardianHazards ??= [];
  for (let i = list.length - 1; i >= 0; i--) {
    const h = list[i]; if (h.owner !== m.kind) continue;
    h.age += dt;
    if (m.dead || m.sleeping || g.respawnPending || h.age >= h.warn + h.life) { list.splice(i, 1); continue; }
    if (h.age < h.warn) continue;
    if (!h.started) {
      h.started = true;
      if (m.kind === 'fiandeira') spiderFx(g, 'burst', h.x, h.y - 3, { r: h.radius, color: h.type === 'venom' ? '#b7ef79' : '#eee0ff' });
      else { beetleDust(g, h.x, h.y, 12, 150); beetleFx(g, 'ring', h.x, h.y, { r: h.radius * 2 }); }
      g.shake = Math.max(g.shake || 0, h.type === 'pillar' ? 4 : 2);
    }
    if (h.vx) {
      const nx = h.x + h.vx * dt;
      if (w.isSolid(Math.floor(nx / T), Math.floor((h.y - 8) / T))) { list.splice(i, 1); continue; }
      h.x = nx;
    }
    const hit = p.x + p.w > h.x - h.radius && p.x < h.x + h.radius && p.y + p.h > h.y - h.height && p.y < h.y + 3;
    if (hit && p.invulnerable <= 0 && !g.respawnPending) {
      damageMonsterPlayer(g, h.damage, h.x);
      if (!g.respawnPending && h.type === 'silk') p.webbed = Math.max(p.webbed || 0, .65);
    }
  }
}

function guardianBeginPower(g, m, w, p) {
  const spider = m.kind === 'fiandeira', turn = m.powerTurn || 0;
  m.powerTurn = turn + 1; m.powerCd = m.phase === 2 ? 7 : 10;
  m.state = 'channel'; m.stateT = 0; m.vx = 0; m.damage = 0;
  const bounds = spider ? m.nest?.bounds : m.lair?.bounds;
  const lo = bounds ? (bounds[0] + 2) * T : m.cx - 260;
  const hi = bounds ? (bounds[2] - 1) * T : m.cx + 260;
  const base = spider ? m.nest?.floorY ?? p.y + p.h : beetleFloorAt(m);
  const target = clamp(p.cx, lo, hi);
  if (spider) {
    m.powerStyle = turn % 2 ? 'silk' : 'venom';
    // Alvos congelados ao iniciar: sair da marca sempre permite escapar.
    for (const offset of [-76, 0, 76]) {
      const x = clamp(target + offset, lo, hi), y = guardianFloor(w, x, p.y + p.h - 2, base);
      guardianHazard(g, m, m.powerStyle, x, y, m.powerStyle === 'venom'
        ? { warn: 1.05, life: 3.2, radius: 23, height: 9, damage: 7 }
        : { warn: 1.15, life: .55, radius: 16, height: 70, damage: 12 });
    }
    spiderFx(g, 'screech', m.cx, m.cy, { life: 1 });
    playSfx('spiderHiss', m.cx, m.cy);
  } else {
    m.powerStyle = turn % 2 ? 'vortex' : 'pillar';
    if (m.powerStyle === 'pillar') {
      for (let k = -2; k <= 2; k++) {
        const x = clamp(target + k * 58, lo, hi);
        guardianHazard(g, m, 'pillar', x, guardianFloor(w, x, p.y + p.h - 2, base),
          { warn: .95 + Math.abs(k) * .18, life: .6, radius: 13, height: 38, damage: 13 });
      }
    } else {
      for (const dir of [-1, 1]) guardianHazard(g, m, 'vortex', m.cx + dir * 44, base,
        { warn: 1.15, life: 2.4, radius: 17, height: 48, vx: dir * 95, damage: 10 });
    }
    beetleFx(g, 'ring', m.cx, base, { r: 100, life: 1 });
    playSfx('beetleRumble', m.cx, m.cy);
  }
}

// Retorna true durante o preparo: não deixa outro ataque cancelar o aviso.
function guardianUpdatePower(g, m, dt, w, p) {
  guardianUpdateHazards(g, m, dt, w, p);
  if (m.dead || m.sleeping || g.respawnPending) return false;
  if (m.state === 'channel') {
    m.damage = 0; m.vx = 0;
    if (m.stateT >= 1.75) {
      m.state = m.kind === 'fiandeira' ? (m.mode === 'ceiling' ? 'stalk' : 'hunt') : 'walk';
      m.stateT = 0;
    }
    return true;
  }
  m.powerCd = (m.powerCd ?? 7) - dt;
  const ready = m.kind === 'fiandeira' ? (m.state === 'stalk' || m.state === 'hunt' && m.onGround) : m.state === 'walk' && m.onGround;
  if (ready && m.powerCd <= 0 && Math.abs(p.cx - m.cx) < 24 * T) { guardianBeginPower(g, m, w, p); return true; }
  return false;
}

// O desenho dos avisos e dos golpes fica em js/boss-fx.js (drawGuardianPowers).
