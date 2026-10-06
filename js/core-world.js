'use strict';

// =====================================================================================
//  CORAÇÃO DA ILHA — geração
// =====================================================================================
// Uma faixa contínua no fundo do mundo, de ponta a ponta. A base é sempre a mesma (rocha
// profunda escura, salões enormes, um mar de lava lá embaixo); por cima dela os trechos se
// alternam ao longo do mapa:
//   FORJA        lagos de lava mais altos, colunas de basalto, gêiseres, lírios de brasa
//   MAGNÉTICO    rochas de magnetita flutuando no meio dos salões, veios de magnetita
//   MAQUINÁRIO   salões de bronze dos Vigias, engrenagens girando, canos e runas acesas
//   OSSÁRIO      costelas fósseis de bichos gigantes formando arcos, bolsões de âmbar
// No meio do mapa, embaixo de onde o avião caiu, fica a CÂMARA DO CORAÇÃO (js/core-boss.js),
// e um Poço dos Vigias desce até ela. Mais dois poços abrem caminho para a faixa.

const CORE = {
  top: 0.8,          // fração da altura do mundo onde a faixa começa (com ondulação)
  crust: 12,          // linhas de transição: basalto e rocha quente misturados com a caverna de cima
  seaFromBottom: 16, // nível do mar de lava, contado de baixo
  zones: ['forja', 'magnetico', 'maquinario', 'ossario'],
  heart: { A: 46, B: 22, below: 64 },  // semi-eixos da câmara e quão abaixo do topo ela fica
};
const CORE_ZONE = { FORJA: 0, MAGNETICO: 1, MAQUINARIO: 2, OSSARIO: 3 };

function coreTopAt(w, x) {
  return Math.floor(w.h * CORE.top + noise1(x * 0.012, w.seed + 1207) * 14 + noise1(x * 0.05, w.seed + 1208) * 4);
}
// Trecho do Coração na coluna x (w.coreZone é preenchido na geração)
const coreZoneAt = (w, x) => w.coreZone ? w.coreZone[clamp(x | 0, 0, w.w - 1)] : CORE_ZONE.FORJA;
const inCoreBand = (w, x, y) => !!w.coreTop && y >= w.coreTop[clamp(x | 0, 0, w.w - 1)];

LOOT_TABLES.vigia = [[ITEM.BRONZE, 4, 10, 0.9], [ITEM.GOLD, 2, 6, 0.6], [ITEM.RUNE_STONE, 2, 6, 0.5], [ITEM.MAGNETITE, 3, 8, 0.5],
  [ITEM.GEAR, 1, 2, 0.35], [ITEM.MEDKIT, 1, 2, 0.5], [ITEM.AMBER, 2, 5, 0.4], [ITEM.PIPE, 4, 8, 0.3], [ITEM.METAL_BAR, 3, 7, 0.5]];
LOOT_TABLES.ossario = [[ITEM.FOSSIL, 6, 14, 0.8], [ITEM.AMBER, 3, 8, 0.7], [ITEM.BONE, 4, 10, 0.7], [ITEM.IVORY, 1, 3, 0.4], [ITEM.GOLD, 2, 5, 0.4], [ITEM.MEDKIT, 1, 1, 0.3]];

function* generateCore(w, rnd) {
  const { w: W, h: H, tiles, walls, water, seed } = w;
  const top = w.coreTop = new Int16Array(W);
  for (let x = 0; x < W; x++) top[x] = coreTopAt(w, x);
  w.coreTopMin = Math.min(...top);

  // ---------- 1. Trechos ao longo do mapa ----------
  const zone = w.coreZone = new Uint8Array(W);
  w.coreSegments = [];
  let prev = -1;
  for (let x = 0; x < W;) {
    const len = 110 + Math.floor(rnd() * 90);
    let z;
    do z = Math.floor(rnd() * 4); while (z === prev);
    zone.fill(z, x, Math.min(W, x + len));
    w.coreSegments.push({ zone: z, x0: x, x1: Math.min(W, x + len) - 1 });
    prev = z; x += len;
  }
  // embaixo do meio do mapa o trecho é sempre de máquinas: é ali que os Vigias construíram o Coração
  const mid = W >> 1;
  for (const s of w.coreSegments) if (s.x1 >= mid - 80 && s.x0 <= mid + 80) s.zone = CORE_ZONE.MAQUINARIO;
  for (const s of w.coreSegments) zone.fill(s.zone, s.x0, s.x1 + 1);
  yield [0.9705, 'Descendo ao Coração'];

  // ---------- 2. Rocha e salões ----------
  const bottom = H - 1; // até a rocha matriz (ela fica como está)
  for (let x = 0; x < W; x++) {
    const z = zone[x];
    for (let y = top[x]; y < bottom; y++) {
      const i = y * W + x, crust = y < top[x] + CORE.crust;
      if (tiles[i] === TILE.BEDROCK) continue;
      const deep = (y - top[x]) / Math.max(1, bottom - top[x]);
      // salões grandes + galerias compridas na horizontal + bolhas pequenas
      const hall = fbm2(x * 0.016, y * 0.028, seed + 1201, 3) > 0.6 - deep * 0.05;
      const gallery = Math.abs(fbm2(x * 0.009, y * 0.045, seed + 1203, 2) - 0.5) < 0.028;
      const pocket = fbm2(x * 0.06, y * 0.08, seed + 1205, 2) > 0.76;
      let open = hall || gallery || pocket;
      if (crust) { const k = (y - top[x]) / CORE.crust; open = (tiles[i] === TILE.AIR && hash2(x >> 1, y >> 1, seed + 1218) > k * 0.6) || (open && hash2(x, y, seed + 1206) < k); }
      water[i] = 0;
      if (open) { tiles[i] = TILE.AIR; walls[i] = z === CORE_ZONE.FORJA && hash2(x >> 2, y >> 2, seed + 1209) < 0.5 ? WALL.BASALT : WALL.DEEPSTONE; continue; }
      let t = TILE.DEEPSTONE;
      if (crust) t = hash2(x, y, seed + 1210) < 0.45 ? TILE.BASALT : hash2(x, y, seed + 1211) < 0.25 ? TILE.MAGMA_STONE : TILE.DEEPSTONE;
      else if (z === CORE_ZONE.FORJA && fbm2(x * 0.22, y * 0.025, seed + 1212, 2) > 0.56) t = TILE.BASALT;          // colunas
      else if (z === CORE_ZONE.MAGNETICO && fbm2(x * 0.09, y * 0.09, seed + 1213, 2) > 0.66) t = TILE.MAGNETITE;
      else if (z === CORE_ZONE.OSSARIO && fbm2(x * 0.09, y * 0.09, seed + 1214, 2) > 0.74 + (hash2(x, y, seed + 1219) - 0.5) * 0.05) t = TILE.AMBER;
      else if (z === CORE_ZONE.OSSARIO && fbm2(x * 0.07, y * 0.07, seed + 1215, 2) > 0.77 + (hash2(x, y, seed + 1220) - 0.5) * 0.05) t = TILE.FOSSIL;
      else if (hash2(x, y, seed + 1216) < 0.004) t = TILE.GOLD_ORE;
      else if (hash2(x, y, seed + 1217) < 0.006) t = TILE.OBSIDIAN;
      tiles[i] = t; walls[i] = z === CORE_ZONE.FORJA ? WALL.BASALT : WALL.DEEPSTONE;
    }
    if ((x & 511) === 0) yield [0.9705 + 0.003 * (x / W), 'Descendo ao Coração'];
  }

  // ---------- 3. Lava ----------
  // Todo vão abaixo do nível do mar de lava enche (um lago parado não tem lado aberto: o que
  // está abaixo do nível e ligado a ele também está abaixo). Na Forja, cada trecho tem um
  // nível mais alto, mas só enche o lago que cabe inteiro dentro do trecho.
  const sea = H - CORE.seaFromBottom;
  for (let y = sea; y < bottom; y++) for (let x = 0; x < W; x++) { const i = y * W + x; if (tiles[i] === TILE.AIR) tiles[i] = TILE.LAVA; }
  // Lagoas: a partir de um ponto do chão, sobe o nível um bloco de cada vez enquanto o lago
  // continuar fechado (sem escorrer para longe) e enche o último nível que coube.
  const basin = (x, y, L, cap) => {
    const comp = [], queue = [y * W + x], mark = new Set(queue);
    while (queue.length) {
      const i = queue.pop(); comp.push(i);
      if (comp.length > cap) return null;
      for (const j of [i - 1, i + 1, i - W, i + W]) {
        if ((j / W | 0) < L || mark.has(j) || tiles[j] !== TILE.AIR) continue;
        mark.add(j); queue.push(j);
      }
    }
    return comp;
  };
  for (const s of w.coreSegments) {
    const forge = s.zone === CORE_ZONE.FORJA, tries = forge ? 90 : 12;
    for (let t = 0; t < tries; t++) {
      const x = s.x0 + 3 + Math.floor(rnd() * Math.max(1, s.x1 - s.x0 - 6));
      let y = top[x] + CORE.crust + Math.floor(rnd() * Math.max(1, sea - top[x] - CORE.crust - 4));
      while (y < sea - 1 && tiles[y * W + x] !== TILE.AIR) y++;
      while (y < sea - 1 && tiles[(y + 1) * W + x] === TILE.AIR) y++;
      if (tiles[y * W + x] !== TILE.AIR || tiles[(y + 1) * W + x] === TILE.LAVA) continue;
      let best = null;
      for (let d = 0; d < (forge ? 9 : 4); d++) {
        const comp = basin(x, y, y - d, forge ? 900 : 160);
        if (!comp) break;
        best = comp;
      }
      if (best && best.length >= 3) for (const i of best) tiles[i] = TILE.LAVA;
    }
  }
  // Margem da lava: a rocha encostada vira rocha quente, que brilha
  for (let y = w.coreTopMin; y < bottom; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x, t = tiles[i];
    if (t !== TILE.DEEPSTONE && t !== TILE.BASALT) continue;
    if ((tiles[i - 1] === TILE.LAVA || tiles[i + 1] === TILE.LAVA || tiles[i - W] === TILE.LAVA || tiles[i + W] === TILE.LAVA) && hash2(x, y, seed + 1220) < 0.65) tiles[i] = TILE.MAGMA_STONE;
  }
  yield [0.974, 'Acendendo a lava'];

  // ---------- 4. Enfeites de cada trecho ----------
  const air = (x, y) => w.inBounds(x, y) && tiles[y * W + x] === TILE.AIR;
  const solid = (x, y) => w.inBounds(x, y) && SOLID[tiles[y * W + x]] === 1;
  const set = (x, y, t, wall) => sSet(w, x, y, t, wall);
  for (let x = 2; x < W - 2; x++) {
    const z = zone[x];
    for (let y = top[x] + 2; y < sea - 1; y++) {
      if (!air(x, y) || !solid(x, y + 1) || tiles[(y + 1) * W + x] === TILE.CORE_WALL) continue;
      const k = hash2(x, y, seed + 1230);
      if (z === CORE_ZONE.FORJA) {
        if (k < 0.018 && air(x, y - 1) && air(x, y - 2) && air(x, y - 3)) set(x, y + 1, TILE.STEAM_VENT);
        else if (k < 0.06) set(x, y, TILE.EMBER_LILY);
        else if (k < 0.075) { const hgt = 2 + Math.floor(hash2(x, y, seed + 1231) * 5); for (let d = 0; d < hgt && air(x, y - d); d++) set(x, y - d, TILE.BASALT); }
      } else if (z === CORE_ZONE.MAGNETICO) {
        if (k < 0.03) set(x, y, TILE.EMBER_LILY);
      } else if (z === CORE_ZONE.OSSARIO) {
        if (k < 0.025) set(x, y, TILE.EMBER_LILY);
        else if (k < 0.05 && SOLID[tiles[(y + 1) * W + x]]) set(x, y, TILE.SKULL_STAKE);
      } else if (k < 0.012 && air(x, y - 1)) set(x, y, TILE.PIPE);
    }
  }
  // Rochas de magnetita flutuando no meio dos salões do trecho magnético
  for (const s of w.coreSegments) {
    if (s.zone !== CORE_ZONE.MAGNETICO) continue;
    let made = 0;
    for (let t = 0; t < 400 && made < 10; t++) {
      const cx = s.x0 + 6 + Math.floor(rnd() * Math.max(1, s.x1 - s.x0 - 12));
      const cy = top[cx] + 10 + Math.floor(rnd() * Math.max(1, sea - top[cx] - 24));
      let clearBox = true;
      for (let dy = -8; dy <= 9 && clearBox; dy++) for (let dx = -9; dx <= 9 && clearBox; dx++) clearBox = air(cx + dx, cy + dy);
      if (!clearBox) continue;
      // rocha flutuando: topo achatado, miolo de rocha e a parte de baixo afinando numa ponta
      const rx = 3.5 + rnd() * 2.5, ry = 2 + rnd() * 1.2, tip = 3 + Math.floor(rnd() * 3);
      for (let dy = -4; dy <= 3 + tip; dy++) for (let dx = -7; dx <= 7; dx++) {
        const narrow = dy > 0 ? Math.max(0.15, 1 - dy / (ry + tip)) : 1;
        const d = (dx / (rx * narrow)) ** 2 + (Math.min(dy, 0) / ry) ** 2;
        if (d <= 1 && !(dy > 0 && Math.abs(dx) > rx * narrow)) set(cx + dx, cy + dy, d < 0.3 && dy < 1 ? TILE.DEEPSTONE : TILE.MAGNETITE);
      }
      if (rnd() < 0.5 && air(cx, cy - ry - 1)) set(cx, Math.round(cy - ry - 1), TILE.EMBER_LILY);
      (w.coreMagnets ??= []).push({ x: cx, y: cy });
      made++;
    }
  }
  yield [0.976, 'Erguendo as costelas'];
  // Esqueletos de bichos gigantes no Ossário, deitados no chão de um salão grande
  for (const s of w.coreSegments) {
    if (s.zone !== CORE_ZONE.OSSARIO) continue;
    let made = 0;
    for (let t = 0; t < 300 && made < 2; t++) {
      const x0 = s.x0 + 8 + Math.floor(rnd() * Math.max(1, s.x1 - s.x0 - 50)), len = 28 + Math.floor(rnd() * 10);
      let floor = -1;
      for (let y = top[x0] + 14; y < sea - 2; y++) if (air(x0, y) && solid(x0, y + 1)) { floor = y + 1; break; }
      if (floor < 0) continue;
      if ((w.coreRibs || []).some((r) => x0 < r.x1 + 12 && x0 + len + 18 > r.x0)) continue; // um esqueleto por salão
      let room = 0;
      for (let x = x0; x < x0 + len; x += 3) for (let y = floor - 14; y < floor; y += 2) if (air(x, y)) room++;
      if (room < (len / 3) * 7 * 0.8) continue;
      // o esqueleto em si é um desenho grande atrás de tudo (js/core-life.js: drawCoreBackdrop)
      if (air(x0 + (len >> 1), floor - 1)) addLootChest(w, x0 + (len >> 1), floor - 1, 'ossario', rnd);
      (w.coreRibs ??= []).push({ x0, x1: x0 + len + 5, floor, len, flip: rnd() < 0.5, seed: Math.floor(rnd() * 1e6), kind: Math.floor(rnd() * 4) });
      made++;
    }
  }
  // Pontes de bronze por cima dos lagos de lava (de margem a margem)
  for (let y = w.coreTopMin + 4; y < sea; y++) {
    for (let x = 2; x < W - 2; x++) {
      if (tiles[y * W + x] !== TILE.LAVA || tiles[(y - 1) * W + x] === TILE.LAVA || tiles[y * W + x - 1] === TILE.LAVA) continue;
      let x1 = x; while (x1 < W - 2 && tiles[y * W + x1 + 1] === TILE.LAVA && tiles[(y - 1) * W + x1 + 1] !== TILE.LAVA) x1++;
      const len = x1 - x + 1, deck = y - 3;
      if (len < 6 || len > 34 || rnd() > 0.6) { x = x1; continue; }
      const shoreL = solid(x - 1, deck + 1) || solid(x - 1, deck) ? 1 : 0, shoreR = solid(x1 + 1, deck + 1) || solid(x1 + 1, deck) ? 1 : 0;
      let clear = true;
      for (let k = x; k <= x1 && clear; k++) clear = air(k, deck) && air(k, deck - 1) && air(k, deck - 2);
      if (shoreL && shoreR && clear) {
        for (let k = x; k <= x1; k++) set(k, deck, TILE.PLATFORM);
        for (let k = x + 3; k < x1 - 1; k += 5) for (let d = 1; d < 3; d++) if (air(k, deck + d)) set(k, deck + d, TILE.PIPE); // esteios até a lava
      }
      x = x1;
    }
  }
  yield [0.978, 'Montando as máquinas dos Vigias'];

  // ---------- 5. Câmara do Coração e os poços ----------
  buildHeartChamber(w, rnd);
  buildVigiaShaft(w, rnd, w.coreHeart.shaftX, Math.floor(H * 0.42), w.coreHeart.gateTop - 1, true);
  for (const fx of [0.2, 0.8]) {
    const sx = Math.floor(W * fx) + Math.floor(rnd() * 40) - 20;
    buildVigiaShaft(w, rnd, sx, Math.floor(H * 0.55), top[sx] + 12, false);
  }
  // ---------- 6. Salões de máquinas no trecho dos Vigias ----------
  for (const s of w.coreSegments) {
    if (s.zone !== CORE_ZONE.MAQUINARIO) continue;
    let made = 0;
    for (let t = 0; t < 200 && made < 2; t++) {
      const x0 = s.x0 + 4 + Math.floor(rnd() * Math.max(1, s.x1 - s.x0 - 40));
      if (w.coreHeart && x0 + 36 > w.coreHeart.x0 - 6 && x0 < w.coreHeart.x1 + 6) continue;
      if (buildVigiaHall(w, rnd, x0)) made++;
    }
  }
  yield [0.98, 'Despertando o Coração'];
}

// ---------- Salão de máquinas dos Vigias ----------
// Piso de bronze, pilares de tijolo com runa acesa, engrenagens girando no fundo entre os
// pilares, canos e um baú. Metade do teto às vezes cedeu.
function buildVigiaHall(w, rnd, x0) {
  const W = 26 + Math.floor(rnd() * 10), H = 9;
  // um salão aberto da caverna com chão embaixo
  let floor = -1;
  for (let y = w.coreTop[x0] + 8; y < w.h - CORE.seaFromBottom - 6; y++) {
    let air = 0;
    for (let x = x0; x < x0 + W; x += 2) if (w.getTile(x, y) === TILE.AIR) air++;
    let ground = 0;
    for (let x = x0; x < x0 + W; x += 2) if (SOLID[w.getTile(x, y + 1)]) ground++;
    if (air > W / 4 && ground > W / 5) { floor = y + 1; break; }
  }
  if (floor < 0) return false;
  // longe de outro salão e dos poços (o túnel de um apagaria o baú do outro)
  if ((w.coreHalls || []).some((o) => x0 + W + 30 > o.x0 && x0 - 30 < o.x1 && Math.abs(o.floor - floor) < 16)) return false;
  if ((w.coreShafts || []).some((sh) => sh.x > x0 - 30 && sh.x < x0 + W + 30 && floor > sh.yTop - 10 && floor - H < sh.yBottom + 4)) return false;
  for (let y = floor - H; y <= floor; y++) for (let x = x0; x <= x0 + W; x++) if (w.getTile(x, y) === TILE.LAVA || w.getTile(x, y) === TILE.CORE_WALL) return false;
  const x1 = x0 + W, top = floor - H, broken = rnd() < 0.5;
  for (let y = top; y <= floor; y++) for (let x = x0; x <= x1; x++) {
    const edge = x === x0 || x === x1;
    if (y === floor) sSet(w, x, y, TILE.BRONZE_PLATE, WALL.VIGIA);
    else if (y === top) sSet(w, x, y, broken && x > x0 + W * 0.55 && rnd() < 0.7 ? TILE.AIR : TILE.VIGIA_BRICK, WALL.VIGIA);
    else if (edge && y < floor - 3) sSet(w, x, y, TILE.VIGIA_BRICK, WALL.VIGIA);
    else sSet(w, x, y, TILE.AIR, WALL.VIGIA);
  }
  for (let x = x0 + 6; x < x1 - 2; x += 7) {
    for (let y = top + 1; y < floor; y++) sSet(w, x, y, y === top + 3 ? TILE.RUNE_STONE : TILE.VIGIA_BRICK, WALL.VIGIA);
    if (x + 3 < x1) sSet(w, x + 3, top + 4, TILE.GEAR, WALL.VIGIA);
  }
  for (let x = x0 + 2; x < x1 - 1; x += 11) for (let y = top + 1; y < floor - 1; y++) if (w.getTile(x, y) === TILE.AIR) sSet(w, x, y, TILE.PIPE, WALL.VIGIA);
  addLootChest(w, x0 + 4, floor - 1, 'vigia', rnd);
  if (rnd() < 0.5) addLootChest(w, x1 - 3, floor - 1, 'vigia', rnd);
  tunnelOut(w, x0 - 1, floor, -1); tunnelOut(w, x1 + 1, floor, 1);
  (w.coreHalls ??= []).push({ x0, x1, floor, top });
  return true;
}

// ---------- Poço dos Vigias ----------
// Um poço reto de 3 de largura, forrado de tijolo, com escada no meio, patamares a cada 14
// blocos, runas acesas e janelas para as cavernas que ele atravessa. Lá em cima, um pequeno
// portal de pedra rúnica marca a entrada.
function buildVigiaShaft(w, rnd, x, yTop, yBottom, main) {
  if (yBottom <= yTop + 10) return;
  const set = (xx, yy, t, wall = WALL.VIGIA) => { if (w.getTile(xx, yy) !== TILE.BEDROCK && w.getTile(xx, yy) !== TILE.CORE_WALL) sSet(w, xx, yy, t, wall); };
  // portal no alto
  for (let y = yTop - 6; y <= yTop; y++) for (let dx = -5; dx <= 5; dx++) {
    const edge = Math.abs(dx) === 5 || y === yTop - 6;
    set(x + dx, y, edge ? (Math.abs(dx) === 5 && y === yTop - 3 ? TILE.RUNE_STONE : TILE.VIGIA_BRICK) : TILE.AIR);
  }
  for (let dx = -4; dx <= 4; dx++) if (Math.abs(dx) > 1) set(x + dx, yTop, TILE.VIGIA_BRICK);
  set(x - 3, yTop - 1, TILE.GEAR); set(x + 3, yTop - 1, TILE.GEAR);
  tunnelOut(w, x - 6, yTop, -1, 40); tunnelOut(w, x + 6, yTop, 1, 40);
  for (let y = yTop; y <= yBottom; y++) {
    for (const dx of [-2, 2]) set(x + dx, y, (y - yTop) % 9 === 4 ? TILE.RUNE_STONE : TILE.VIGIA_BRICK);
    for (const dx of [-1, 0, 1]) set(x + dx, y, dx === 0 ? TILE.LADDER : TILE.AIR);
    if ((y - yTop) % 14 === 13) { set(x - 1, y, TILE.PLATFORM); set(x + 1, y, TILE.PLATFORM); }
    // janela para a caverna que o poço corta
    if ((y - yTop) % 22 === 10) for (const dx of [-2, 2]) for (let k = 0; k < 3; k++) { set(x + dx, y + k, TILE.AIR); tunnelOut(w, x + dx * 2, y + 2, Math.sign(dx), 10); }
  }
  (w.coreShafts ??= []).push({ x, yTop, yBottom, main });
}

// ---------- Câmara do Coração ----------
// Elipse enorme fechada em casca que não quebra. Piso de tijolo dos Vigias com dois fossos de
// lava, plataformas em três alturas, engrenagens e canos no fundo e runas nas bordas. O poço
// principal entra pelo teto; a abertura dele vira casca durante a luta.
function buildHeartChamber(w, rnd) {
  const { A, B, below } = CORE.heart, cx = w.w >> 1, cy = Math.min(w.h - CORE.seaFromBottom - B - 8, w.coreTop[cx] + below);
  const x0 = cx - A - 4, x1 = cx + A + 4, y0 = cy - B - 4, y1 = cy + B + 4;
  const floor = cy + B - 6;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const d = ((x - cx) / A) ** 2 + ((y - cy) / B) ** 2;
    if (d > 1.32) continue;
    w.water[y * w.w + x] = 0;
    if (d > 1) sSet(w, x, y, TILE.CORE_WALL, WALL.VIGIA);
    else if (y >= floor) sSet(w, x, y, y === floor ? TILE.VIGIA_BRICK : TILE.CORE_WALL, WALL.VIGIA);
    else sSet(w, x, y, TILE.AIR, WALL.VIGIA);
  }
  // fossos de lava nos dois lados do piso
  for (const side of [-1, 1]) for (let k = 23; k <= 29; k++) for (let y = floor; y <= floor + 2; y++) sSet(w, cx + side * k, y, TILE.LAVA, WALL.VIGIA);
  // plataformas: baixas nas pontas, médias e uma alta no meio
  const plats = [];
  for (const [a, b, h] of [[18, 26, 6], [8, 14, 11]]) for (const side of [-1, 1]) {
    const xa = cx + side * a, xb = cx + side * b;
    for (let x = Math.min(xa, xb); x <= Math.max(xa, xb); x++) sSet(w, x, floor - h, TILE.PLATFORM, WALL.VIGIA);
    plats.push([Math.min(xa, xb), Math.max(xa, xb), floor - h]);
  }
  for (let x = cx - 4; x <= cx + 4; x++) sSet(w, x, floor - 16, TILE.PLATFORM, WALL.VIGIA);
  plats.push([cx - 4, cx + 4, floor - 16]);
  // engrenagens, canos e runas no fundo
  for (const [dx, dy] of [[-30, -12], [-20, -17], [20, -17], [30, -12], [-38, -6], [38, -6], [0, -24]]) {
    const gx = cx + dx, gy = floor + dy;
    if (w.getTile(gx, gy) === TILE.AIR) sSet(w, gx, gy, TILE.GEAR, WALL.VIGIA);
  }
  for (const dx of [-36, -12, 12, 36]) for (let y = floor - 1; y > floor - 5; y--) if (w.getTile(cx + dx, y) === TILE.AIR) sSet(w, cx + dx, y, TILE.PIPE, WALL.VIGIA);
  for (const dx of [-15, 15]) for (const dy of [1, 2]) sSet(w, cx + dx, floor - dy, TILE.RUNE_STONE, WALL.VIGIA); // marcos acesos no chão
  for (const side of [-1, 1]) for (let y = floor - 2; y > floor - 14; y -= 4) {
    let x = cx + side * A;
    while (w.getTile(x, y) === TILE.CORE_WALL && Math.abs(x - cx) > 4) x -= side;
    sSet(w, x + side, y, TILE.RUNE_STONE, WALL.VIGIA);
  }
  // o poço principal desce pelo teto, um pouco à esquerda do meio
  const shaftX = cx - 19, gate = [];
  let yy = y0;
  while (yy < cy && w.getTile(shaftX, yy) !== TILE.CORE_WALL) yy++;
  for (let y = yy; y < cy && w.getTile(shaftX, y) === TILE.CORE_WALL; y++) for (const dx of [-1, 0, 1]) { sSet(w, shaftX + dx, y, TILE.AIR, WALL.VIGIA); gate.push([shaftX + dx, y]); }
  for (let y = yy; y < floor; y++) if (w.getTile(shaftX, y) === TILE.AIR) sSet(w, shaftX, y, TILE.LADDER, WALL.VIGIA);
  w.coreHeart = { cx, cy, x0, x1, y0, y1, A, B, floor, gate, gateTop: yy, shaftX, plats, core: { x: cx * T + T / 2, y: (floor - 11) * T } };
}

// Lava que ficou encostada no vazio (um túnel passou embaixo ou do lado de uma lagoa) esfria e
// vira obsidiana: lava parada nunca fica pendurada no ar.
function coolExposedLava(w) {
  const { tiles, w: W } = w;
  for (let y = w.coreTopMin - 2; y < w.h - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x;
    if (tiles[i] === TILE.LAVA && (tiles[i - 1] === TILE.AIR || tiles[i + 1] === TILE.AIR || tiles[i + W] === TILE.AIR)) tiles[i] = TILE.OBSIDIAN;
  }
}

// Chamado no fim da geração (js/world.js), depois das poças de caverna: nada de água parada
// na faixa do Coração (ela viraria obsidiana na primeira vez que o jogador chegasse perto)
function finalizeCore(w) {
  if (!w.coreTop) return;
  coolExposedLava(w);
  for (let x = 0; x < w.w; x++) for (let y = w.coreTop[x] - 1; y < w.h; y++) w.water[y * w.w + x] = 0;
  // a abertura do teto da câmara e o poço não podem ter ficado entupidos
  for (const [x, y] of w.coreHeart?.gate || []) w.tiles[y * w.w + x] = TILE.AIR;
}
