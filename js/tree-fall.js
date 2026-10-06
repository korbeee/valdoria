'use strict';

// Árvore cortada: o tronco acima do corte tomba para o lado oposto ao jogador, girando na base
// e acelerando como uma árvore de verdade, para ao bater no chão e solta a madeira como itens.
const isWoodColumn = (t) => t === TILE.TRUNK || t === TILE.STUMP;

// Cores das folhas tiradas da própria arte da copa: cada espécie solta a folha dela
// (pinheiro escuro, bordo alaranjado, cerejeira rosa...), sem precisar de tabela nova.
const canopyLeafCache = new WeakMap();
function canopyLeafColors(canopy) {
  if (canopyLeafCache.has(canopy)) return canopyLeafCache.get(canopy);
  const c = canopy.leafCanvas||canopy.canvas, out = [];
  try {
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    for (let i = 0; i < d.length && out.length < 200; i += 4 * 11) {
      if (d[i + 3] < 220) continue;
      if (d[i] + d[i + 1] + d[i + 2] < 110) continue; // contorno quase preto não vira folha
      out.push(`rgb(${d[i]},${d[i + 1]},${d[i + 2]})`);
    }
  } catch (_) {}
  const colors = out.length ? out : ['#4c8a34'];
  canopyLeafCache.set(canopy, colors);
  return colors;
}

// Copa da árvore que passa por (tx, ty), com a posição do sprite na tela. null se for só toco.
function treeCanopyAt(w, tx, ty) {
  if (!isWoodColumn(w.getTile(tx, ty))) return null;
  let top = ty;
  while (isWoodColumn(w.getTile(tx, top - 1))) top--;
  if (w.getTile(tx, top) !== TILE.TRUNK) return null; // toco não tem folhas
  const canopy = canopyFor(tx, w.biomeAt(tx),w.seed);
  const cv = canopy.canvas;
  return { canopy, x: tx * T + T / 2, y: top * T + canopy.overlap - cv.height, w: cv.width, h: cv.height };
}

// Uma folha solta: plana devagar, gira no ar e vai de um lado para o outro (js/game.js)
function pushLeaf(g, x, y, color, extra) {
  const life = 3 + Math.random() * 3.5;
  g.particles.push({
    x, y, vx: (Math.random() - 0.5) * 14, vy: 4 + Math.random() * 10, gravity: 8,
    life, maxLife: life, color,
    leaf: Math.random() * Math.PI * 2,          // fase do giro
    spin: 2.6 + Math.random() * 3.4,            // velocidade do giro
    sway: 14 + Math.random() * 26,              // largura do vaivém
    fall: 20 + Math.random() * 22,              // velocidade máxima de queda
    ...extra,
  });
}

// Folhas soltas caindo da copa (machadada, tombo ou galho batendo no chão)
function shedLeaves(g, tx, ty, n, spread = 1) {
  const c = treeCanopyAt(g.world, tx, ty);
  if (!c) return;
  const colors = canopyLeafColors(c.canopy);
  for (let i = 0; i < n && g.particles.length < 420; i++)
    pushLeaf(g, c.x + (Math.random() - 0.5) * c.w * 0.82 * spread, c.y + c.h * (0.15 + Math.random() * 0.7),
      colors[(Math.random() * colors.length) | 0]);
}

// ---------- Folhas caindo sozinhas ----------
// De vez em quando uma árvore na tela solta uma folha; com chuva e vento caem mais.
let ambientLeafTimer = 0;
function updateAmbientLeaves(g, dt) {
  if (g.particles.length > 300) return;
  const wind = 1 + (g.weather?.rain || 0) * 1.5 + Math.abs(g.weather?.wind || 0) / 24;
  if ((ambientLeafTimer -= dt * wind) > 0) return;
  ambientLeafTimer = 0.16 + Math.random() * 0.34;
  const w = g.world;
  const viewW = Math.max(canvas.width / g.zoom, 12 * T); // janela minúscula (ou aba escondida): ainda sorteia uma faixa
  const x0 = Math.floor(g.cam.x / T), x1 = Math.ceil((g.cam.x + viewW) / T);
  for (let tries = 0; tries < 8; tries++) {
    const tx = x0 + Math.floor(Math.random() * Math.max(1, x1 - x0));
    if (tx < 1 || tx >= w.w - 1) continue;
    const sy = w.surface[tx];
    let trunk = -1;
    for (let y = sy - 1; y >= sy - 3 && trunk < 0; y--) if (w.getTile(tx, y) === TILE.TRUNK) trunk = y;
    if (trunk < 0) continue;
    const c = treeCanopyAt(w, tx, trunk);
    if (!c) continue;
    const colors = canopyLeafColors(c.canopy);
    // Sai da borda de baixo da copa, como uma folha que se soltou do galho
    for (let i = 0; i < 1 + (Math.random() < 0.45 ? 1 : 0); i++)
      pushLeaf(g, c.x + (Math.random() - 0.5) * c.w * 0.85, c.y + c.h * (0.6 + Math.random() * 0.35),
        colors[(Math.random() * colors.length) | 0], { vy: 2 + Math.random() * 6, surfaceDebris:true });
    return;
  }
}

// A árvore só tomba inteira. Depois da primeira machadada sobra um toco no topo do que ficou
// em pé: dali em diante aquilo é madeira comum e sai bloco a bloco, sem tombar de novo.
function treeIsWhole(w, tx, ty) {
  if (!isWoodColumn(w.getTile(tx, ty))) return true; // cacto e outras colunas mantêm o tombo
  let top = ty;
  while (isWoodColumn(w.getTile(tx, top - 1))) top--;
  return w.getTile(tx, top) === TILE.TRUNK; // topo com toco = árvore já cortada
}

// Tirou madeira de uma árvore já cortada: o tronco que sobrou embaixo vira toco. Sem isso o
// topo voltava a ser tronco inteiro, a copa nascia de novo e a madeira tombava outra vez.
function capCutWood(w, tx, ty) {
  if (w.getTile(tx, ty + 1) === TILE.TRUNK) w.setTile(tx, ty + 1, TILE.STUMP);
}

// Madeira já cortada que ficou sem apoio: desce virando item no lugar, sem animação de tombo.
function collapseCutWood(g, tx, ty) {
  let top = ty;
  while (isWoodColumn(g.world.getTile(tx, top - 1))) top--;
  for (let y = top; y <= ty; y++) if (isWoodColumn(g.world.getTile(tx, y))) removeTile(tx, y);
  capCutWood(g.world, tx, ty);
}

function startTreeFall(g, tx, ty) {
  const w = g.world, cut = w.getTile(tx, ty), wood = isWoodColumn(cut);
  const same = (t) => (wood ? isWoodColumn(t) : t === cut);
  let top = ty;
  while (same(w.getTile(tx, top - 1))) top--;
  const n = ty - top + 1, pivotX = tx * T + T / 2, pivotY = (ty + 1) * T;
  // A espécie decide a casca mesmo quando o pedaço que cai já não tem copa (cortar de novo
  // um toco derruba casca de árvore, não o bloco de tronco antigo). Copa só se o topo ainda
  // é tronco inteiro: toco não tem folhas.
  const species = wood ? canopyFor(tx, w.biomeAt(tx), w.seed) : null;
  const canopy = species && w.getTile(tx, top) === TILE.TRUNK ? species : null;
  let trunkArt=null;
  if(species?.organic){let bottom=ty;while(isWoodColumn(w.getTile(tx,bottom+1)))bottom++;trunkArt=organicTrunkFor(species,(bottom-top+1)*T,!canopy);}
  const tile = wood ? TILE.TRUNK : cut; // o pedaço que cai é desenhado com a casca do tronco
  if (canopy) shedLeaves(g, tx, ty, 40); // chuva de folhas no momento do corte
  for (let y = top; y <= ty; y++) w.setTile(tx, y, TILE.AIR);
  // Tocha pregada no tronco cai junto com ele
  for (let y = top; y <= ty; y++)
    for (const x of [tx - 1, tx + 1]) if (w.getTile(x, y) === TILE.TORCH && !torchSupported(x, y)) removeTile(x, y);
  // Cortou no meio: o que ficou em pé vira toco, com o corte à mostra e sem copa
  if (wood && w.getTile(tx, ty + 1) === TILE.TRUNK) w.setTile(tx, ty + 1, TILE.STUMP);
  spawnParticles(tx, ty, cut, 8);
  (g.fallingTrees ??= []).push({ tx, ty, tile, n, pivotX, pivotY, canopy, trunkArt, dir: g.player.cx < pivotX ? 1 : -1, angle: 0.02, omega: 0.2, landed: false, t: 0 });
  playSfx('treeFall', pivotX, pivotY - (n * T) / 2);
}

function updateFallingTrees(g, dt) {
  const list = g.fallingTrees;
  if (!list?.length) return;
  const w = g.world;
  for (let i = list.length - 1; i >= 0; i--) {
    const f = list[i];
    if (f.landed) { if ((f.t += dt) > 0.7) list.splice(i, 1); continue; }
    // Começa devagar e acelera conforme inclina (a gravidade puxa mais o topo)
    f.omega += (0.8 + Math.sin(f.angle) * 9) * dt;
    f.angle += f.omega * dt;
    let hit = f.angle >= Math.PI / 2;
    if (!hit && f.angle > 0.35)
      for (let k = 1; k <= f.n && !hit; k++) {
        const d = k * T, px = f.pivotX + f.dir * Math.sin(f.angle) * d, py = f.pivotY - Math.cos(f.angle) * d;
        if (w.isSolid(Math.floor(px / T), Math.floor(py / T))) hit = true;
      }
    if (hit) landTree(g, f);
  }
}

function landTree(g, f) {
  f.landed = true; f.t = 0;
  const s = Math.sin(f.angle), c = Math.cos(f.angle), item = f.tile === TILE.CACTUS ? ITEM.CACTUS : ITEM.WOOD;
  for (let k = 0; k < f.n; k++) {
    const d = (k + 0.5) * T;
    dropItem(g, item, 1, f.pivotX + f.dir * s * d, f.pivotY - c * d - 6, (Math.random() - 0.5) * 0.5);
  }
  const tipX = f.pivotX + f.dir * s * f.n * T, tipY = f.pivotY - c * f.n * T;
  if (f.canopy) {
    dropItem(g, ITEM.STICK, 1 + Math.floor(Math.random() * 3), tipX, tipY - 10, 0);
    // Folhas da própria copa: o bordo solta laranja, a cerejeira rosa, o pinheiro verde-escuro.
    // O baque espalha elas para cima e para os lados antes de começarem a planar.
    const colors = canopyLeafColors(f.canopy);
    for (let i = 0; i < 55 && g.particles.length < 420; i++)
      pushLeaf(g, tipX + (Math.random() - 0.5) * 52, tipY - Math.random() * 38,
        colors[(Math.random() * colors.length) | 0],
        { vx: (Math.random() - 0.5) * 150, vy: -30 - Math.random() * 130, gravity: 90 });
  }
  g.shake = Math.max(g.shake || 0, 1 + f.n * 0.25);
  playSfx('treeLand', tipX, tipY, { size: Math.min(1.5, f.n / 6) });
}

function drawFallingTrees(ctx, g, tex) {
  const list = g.fallingTrees;
  if (!list?.length) return;
  for (const f of list) {
    ctx.save();
    ctx.globalAlpha = f.landed ? Math.max(0, 1 - f.t / 0.7) : 1;
    ctx.translate(f.pivotX, f.pivotY);
    ctx.rotate(f.dir * f.angle);
    if(f.trunkArt)ctx.drawImage(f.trunkArt,0,0,f.trunkArt.width,f.n*T,-f.trunkArt.width/2,-f.n*T,f.trunkArt.width,f.n*T);
    else for (let k = 0; k < f.n; k++) ctx.drawImage(f.canopy?.trunk || tex.flat[f.tile], 0, ((f.ty - k) & 3) * T, T, T, -T / 2, -(k + 1) * T, T, T);
    if (f.canopy) { const cv = f.canopy.canvas; ctx.drawImage(cv, -cv.width / 2, -f.n * T + f.canopy.overlap - cv.height); }
    ctx.restore();
  }
}
