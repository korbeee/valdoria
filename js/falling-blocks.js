'use strict';

// O mundo guarda os corpos em movimento: trocar de mundo também limpa a física.
function fallingBlockState(w) {
  return w.fallingBlocks ??= { pending: new Set(), bodies: [], sequence: 0 };
}

function wakeFallingBlocks(w, x, y) {
  const state = fallingBlockState(w);
  // Apenas uma alteração no bloco ou nos vizinhos acorda o terreno natural.
  for (const [dx, dy] of [[0, 0], [0, -1], [0, 1], [-1, 0], [1, 0]]) {
    const tx = x + dx, ty = y + dy;
    if (w.inBounds(tx, ty) && TILE_DEFS[w.getTile(tx, ty)]?.gravity)
      state.pending.add(ty * w.w + tx);
  }
}

function fallingBlockSupports(w, x, y) {
  const tile = w.getTile(x, y);
  return w.isSolid(x, y) || !!TILE_DEFS[tile]?.plataforma;
}

function fallingBlockDust(g, f, landing) {
  const snow = f.tile === TILE.SNOW;
  const count = landing ? Math.min(16, 5 + Math.floor(f.vy / 65)) : 1;
  for (let i = 0; i < count && g.particles.length < 400; i++) {
    const life = landing ? .28 + Math.random() * .28 : .18 + Math.random() * .2;
    g.particles.push({ x: (f.tx + Math.random()) * T, y: f.y + T - 1,
      vx: (Math.random() - .5) * (landing ? 95 : 18),
      vy: landing ? -12 - Math.random() * 48 : -8,
      gravity: snow ? 65 : 180, life, maxLife: life,
      color: snow ? '#e4eff9' : (i & 1 ? '#d6bc80' : '#b99b62'),
      alpha: landing ? .65 : .5, w: 1, h: 1, grow: landing ? (snow ? 4 : 2) : 0 });
  }
}

function landFallingBlock(g, f, row) {
  const w = g.world;
  f.y = row * T;
  // Uma peça, planta ou jogador no destino recebe um item, sem ser sobrescrito.
  if (w.inBounds(f.tx, row) && w.getTile(f.tx, row) === TILE.AIR &&
      !g.player.overlapsTile(f.tx, row)) w.setTile(f.tx, row, f.tile);
  else dropItem(g, TILE_DEFS[f.tile].drop, 1, (f.tx + .5) * T, f.y + T / 2, 0);
  fallingBlockDust(g, f, true);
}

function updateFallingBlocks(g, dt) {
  if (dt <= 0) return;
  const w = g.world, state = fallingBlockState(w);
  // No cooperativo só o anfitrião altera o terreno. Os convidados interpolam os corpos.
  if (typeof NET !== 'undefined' && NET.guest) {
    for (const f of state.bodies) {
      f.y += (f.targetY - f.y) * (1 - Math.exp(-22 * dt));
      if ((f.dust -= dt) <= 0) { f.dust = .08; fallingBlockDust(g, f, false); }
    }
    return;
  }

  // A retirada do bloco acorda o de cima; o orçamento limita avalanches por quadro.
  let budget = 512;
  for (const i of state.pending) {
    if (budget-- <= 0) break;
    state.pending.delete(i);
    const tx = i % w.w, ty = Math.floor(i / w.w), tile = w.getTile(tx, ty);
    if (!TILE_DEFS[tile]?.gravity || fallingBlockSupports(w, tx, ty + 1)) continue;
    state.bodies.push({ id: ++state.sequence, tx, ty, tile, y: ty * T, vy: 0, dust: .06 });
    w.setTile(tx, ty, TILE.AIR);
  }

  state.bodies.sort((a, b) => b.y - a.y);
  const below = new Map(), kept = [];
  for (const f of state.bodies) {
    const tileRow = Math.floor(f.y / T);
    // Bloco colocado durante a queda: para acima dele, mesmo se cruzar vários tiles.
    let obstacle = -1;
    f.vy = Math.min(560, f.vy + 980 * dt);
    let next = f.y + f.vy * dt;
    for (let row = tileRow; row <= Math.floor((next + T) / T); row++) {
      if (fallingBlockSupports(w, f.tx, row)) { obstacle = row; break; }
    }
    const lower = below.get(f.tx);
    const floor = obstacle >= 0 ? (obstacle - 1) * T : Infinity;
    const movingFloor = lower ? lower.y - T : Infinity;
    if (floor <= next && floor <= movingFloor) {
      landFallingBlock(g, f, obstacle - 1);
      continue;
    }
    if (movingFloor <= next) { next = movingFloor; f.vy = Math.min(f.vy, lower.vy); }
    f.y = next;
    if ((f.dust -= dt) <= 0) { f.dust = .07 + Math.random() * .05; fallingBlockDust(g, f, false); }
    below.set(f.tx, f);
    kept.push(f);
  }
  state.bodies = kept;
}

function fallingBlocksView(w) {
  return (w.fallingBlocks?.bodies || []).map(({ id, tx, ty, tile, y, vy }) => ({ id, tx, ty, tile, y, vy }));
}

function applyFallingBlocksView(g, bodies) {
  const state = fallingBlockState(g.world), previous = new Map(state.bodies.map(f => [f.id, f]));
  const ids = new Set(bodies.map(f => f.id));
  for (const f of state.bodies) if (!ids.has(f.id)) fallingBlockDust(g, f, true);
  state.bodies = bodies.map(f => ({ ...f, y: previous.get(f.id)?.y ?? f.y, targetY: f.y,
    dust: previous.get(f.id)?.dust ?? .08 }));
  state.pending.clear();
}

function drawFallingBlocks(ctx, g, tex) {
  const bodies = g.world.fallingBlocks?.bodies;
  if (!bodies?.length) return;
  const vw = canvas.width / g.zoom, vh = canvas.height / g.zoom;
  for (const f of bodies) {
    const x = f.tx * T;
    if (x + T < g.cam.x || x > g.cam.x + vw || f.y + T < g.cam.y || f.y > g.cam.y + vh) continue;
    // Mesma textura do terreno, com as quatro bordas expostas e um leve balanço.
    const atlas = tex.blocks[f.tile], col = (f.ty & 3) * 4 + (f.tx & 3);
    const tilt = Math.sin(f.y / T * .85 + f.id) * .035 * Math.min(1, f.vy / 180);
    ctx.save();
    ctx.translate(x + T / 2, f.y + T / 2);
    ctx.rotate(tilt);
    ctx.drawImage(atlas, col * SPR, 15 * SPR, SPR, SPR, -T / 2 - MARGIN, -T / 2 - MARGIN, SPR, SPR);
    ctx.restore();
  }
}
