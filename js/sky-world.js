'use strict';

// =====================================================================================
//  ARQUIPÉLAGO DOS VIGIAS — geração
// =====================================================================================
// Uma faixa no alto do mundo, de ponta a ponta, com ilhas flutuando em três alturas. Os trechos
// se alternam ao longo do mapa:
//   JARDIM   grama celeste, árvores-do-vento, flor-do-vento, lagoas e cachoeiras que viram névoa
//   RUÍNAS   mármore dos Vigias: colunatas, templos com vitral e o observatório com o mural
//   NINHAL   pedra nua e ninhos de gravetos das aves da tempestade, cheios de coisas brilhantes
// Por cima de tudo, no trecho mais alto, fica o NINHO DA TEMPESTADE (js/sky-boss.js).
//
// Como subir: o jogador fabrica três Pedras dos Ventos e as coloca lado a lado.
// A estrutura construída cria uma corrente pelo espaço livre acima
// (js/sky-life.js). Nuvens servem de ponte (seguram quem vem de cima, como plataforma).
//
// A geração usa um sorteio PRÓPRIO (semente do mundo misturada), para não mexer no resto do
// mundo: com a mesma semente, chão, cavernas e estruturas continuam idênticos a antes.

const SKY = {
  top: 0.06,          // fração da altura onde a faixa começa
  bottom: 0.235,      // ...e onde termina (nunca mais perto do chão que `clearance`)
  clearance: 30,      // blocos livres entre a barriga da ilha mais baixa e o chão
  edge: 70,           // longe das bordas do mapa
  centerGap: 46,      // nada bem em cima de onde o avião cai (a abertura passa por ali)
};
const SKY_ZONE = { JARDIM: 0, RUINAS: 1, NINHAL: 2 };
const SKY_ZONE_NAMES = ['O Jardim Suspenso', 'As Ruínas dos Vigias', 'O Ninhal das Tempestades'];

LOOT_TABLES.celeste = [[ITEM.WIND_CRYSTAL, 2, 5, 0.75], [ITEM.FEATHER, 4, 10, 0.7], [ITEM.CLOUD_ESSENCE, 2, 5, 0.6], [ITEM.GOLD, 2, 5, 0.5],
  [ITEM.GLASS, 3, 8, 0.4], [ITEM.SKY_OMELET, 1, 2, 0.4], [ITEM.MEDKIT, 1, 1, 0.3], [ITEM.CLOUD_BOTTLE, 1, 1, 0.12], [ITEM.GLIDER, 1, 1, 0.08], [ITEM.VITRAL, 4, 8, 0.3]];
// Aves da tempestade juntam tudo o que brilha no ninho
LOOT_TABLES.ninho = [[ITEM.SKY_EGG, 2, 4, 0.9], [ITEM.FEATHER, 5, 12, 0.9], [ITEM.GOLD, 1, 4, 0.5], [ITEM.PEARL, 1, 3, 0.4],
  [ITEM.GLASS, 1, 4, 0.3], [ITEM.AMETHYST, 1, 3, 0.3], [ITEM.CLOUD_ESSENCE, 1, 3, 0.45], [ITEM.BOLTS, 2, 5, 0.3]];

const skyZoneAt = (w, x) => w.skyZone ? w.skyZone[clamp(x | 0, 0, w.w - 1)] : SKY_ZONE.JARDIM;
const inSkyBand = (w, x, y) => !!w.skyFloor && y <= w.skyFloor[clamp(x | 0, 0, w.w - 1)] && y >= 0;
// Ruído com deslocamento por semente (o hash2 global ignora a semente)
const skyNoise = (w, x, k) => noise1(x + (w.seed % 997) * 3.71 + k * 131.7, 0);

function* generateSky(w) {
  if (w.w < 1000 || w.h < 600) return; // o mundinho do menu não tem céu
  const W = w.w, H = w.h, rnd = mulberry32((w.seed ^ 0x5ca1ab1e) >>> 0);
  const bandTop = w.skyTop0 = Math.floor(H * SKY.top);
  const floor = w.skyFloor = new Int16Array(W);
  for (let x = 0; x < W; x++) floor[x] = Math.min(Math.floor(H * SKY.bottom), w.surface[x] - SKY.clearance);
  w.skyIslands = []; w.skyWinds = []; w.skyFalls = []; w.skyTreeCols = new Set(); w.skyRuins = []; w.skyNests = []; w.skyStones = [];

  // ---------- 1. Trechos ----------
  const zone = w.skyZone = new Uint8Array(W);
  let prev = -1;
  for (let x = 0; x < W;) {
    const len = 180 + Math.floor(rnd() * 160);
    let z; do z = Math.floor(rnd() * 3); while (z === prev);
    zone.fill(z, x, Math.min(W, x + len));
    prev = z; x += len;
  }
  yield [0.9802, 'Erguendo as ilhas do céu'];

  // ---------- 2. O Ninho da Tempestade (o mais alto) e as ilhas ----------
  const nestX = Math.floor(W * (0.22 + rnd() * 0.08));
  zone.fill(SKY_ZONE.NINHAL, nestX - 110, nestX + 110);
  buildStormNest(w, rnd, nestX, bandTop + 10);
  const mid = W >> 1, nearCenter = (x0, x1) => x1 > mid - SKY.centerGap && x0 < mid + SKY.centerGap;
  for (let cx = SKY.edge + Math.floor(rnd() * 40); cx < W - SKY.edge;) {
    const span = 70 + Math.floor(rnd() * 90);       // um arquipélago (grupo de ilhas)
    const n = 3 + Math.floor(rnd() * 4);
    for (let k = 0; k < n * 4 && w.skyIslands.filter((i) => i.group === cx).length < n; k++) {
      const z = zone[clamp(cx, 0, W - 1)];
      const big = rnd() < 0.3, R = big ? 16 + Math.floor(rnd() * 12) : 6 + Math.floor(rnd() * 10);
      const x = cx + Math.floor((rnd() - 0.5) * span);
      if (x - R < SKY.edge || x + R > W - SKY.edge || nearCenter(x - R, x + R)) continue;
      const tryIsland = skyIsland(w, rnd, x, R, z, { group: cx });
      if (tryIsland) w.skyIslands.push(tryIsland);
    }
    cx += span + 30 + Math.floor(rnd() * 90);
  }
  yield [0.9815, 'Soprando as nuvens'];

  // ---------- 3. Pedriscos flutuando em volta das ilhas ----------
  for (const isl of w.skyIslands) {
    if (isl.nest) continue;
    for (let k = 0; k < 2 + Math.floor(rnd() * 3); k++) {
      const side = rnd() < 0.5 ? -1 : 1, x = Math.round(isl.cx + side * (isl.R + 3 + rnd() * 8)), y = Math.round(isl.y0 + rnd() * isl.depth * 0.8);
      const s = 1 + Math.floor(rnd() * 2);
      if (!skyClear(w, x - s - 2, y - s - 2, x + s + 2, y + s + 3)) continue;
      for (let dy = 0; dy <= s; dy++) for (let dx = -s; dx <= s; dx++) {
        if (Math.abs(dx) + dy > s + (dy === 0 ? 1 : 0)) continue;
        sSet(w, x + dx, y + dy, dy === 0 && rnd() < 0.6 ? TILE.SKY_GRASS : rnd() < 0.08 ? TILE.WIND_CRYSTAL : TILE.SKYSTONE);
      }
    }
  }

  // ---------- 4. Nuvens: bancos soltos, anéis em volta das ilhas e pontes ----------
  for (let t = 0; t < Math.floor(W / 26); t++) {
    const x = SKY.edge + Math.floor(rnd() * (W - SKY.edge * 2)), y = bandTop + Math.floor(rnd() * Math.max(1, floor[x] - bandTop - 6));
    if (nearCenter(x - 30, x + 30)) continue;
    skyCloudBank(w, rnd, x, y, 10 + Math.floor(rnd() * 30), 1.4 + rnd() * 1.6, rnd() < (zone[x] === SKY_ZONE.NINHAL ? 0.45 : 0.12));
  }
  for (const isl of w.skyIslands) {
    if (isl.nest || rnd() < 0.35) continue;
    const y = Math.round(isl.y0 + isl.depth * (0.3 + rnd() * 0.3));
    for (const side of [-1, 1]) if (rnd() < 0.75) {
      // a nuvem encosta na barriga da ilha e se estende para fora, como uma saia
      let ex = Math.round(isl.cx + side * isl.R * 0.6);
      while (Math.abs(ex - isl.cx) < isl.R + 6 && w.getTile(ex, y) !== TILE.AIR) ex += side;
      skyCloudBank(w, rnd, ex + side * (4 + Math.floor(rnd() * 6)), y, 8 + Math.floor(rnd() * 12), 1.2 + rnd(), false);
    }
  }
  // pontes de nuvem entre ilhas vizinhas de altura parecida
  const sorted = [...w.skyIslands].sort((a, b) => a.cx - b.cx);
  for (let i = 0; i + 1 < sorted.length; i++) {
    const a = sorted[i], b = sorted[i + 1], gap = b.x0 - a.x1;
    if (gap < 4 || gap > 26 || Math.abs(a.y0 - b.y0) > 5 || a.nest || b.nest) continue;
    const y = Math.max(a.y0, b.y0) + 1;
    let ok = true;
    for (let x = a.x1 + 1; x < b.x0 && ok; x++) ok = w.getTile(x, y) === TILE.AIR && w.getTile(x, y - 1) === TILE.AIR && w.getTile(x, y - 2) === TILE.AIR;
    if (!ok) continue;
    for (let x = a.x1 - 1; x <= b.x0 + 1; x++) {
      const sag = Math.round(Math.sin(((x - a.x1) / Math.max(1, gap)) * Math.PI) * Math.min(2, gap / 8));
      for (const yy of [y + sag, y + sag + 1]) if (w.getTile(x, yy) === TILE.AIR) sSet(w, x, yy, TILE.CLOUD);
      if (rnd() < 0.35 && w.getTile(x, y + sag + 2) === TILE.AIR) sSet(w, x, y + sag + 2, TILE.CLOUD);
    }
  }
  yield [0.983, 'Plantando o jardim suspenso'];


}

// ---------- Ilha ----------
// Topo levemente abaulado, borda que desce arredondando, barriga em cone invertido com pontas
// penduradas. Camadas: grama celeste, terra celeste e pedra-celeste com veios de cristal.
function skyIsland(w, rnd, cx, R, z, opts = {}) {
  const depth = Math.round(R * (opts.depthK ?? (0.9 + rnd() * 0.5))) + 3;
  const fx0 = cx - R, fx1 = cx + R;
  let fl = Infinity;
  for (let x = fx0; x <= fx1; x++) fl = Math.min(fl, w.skyFloor[x]);
  const lo = w.skyTop0 + 8, hi = fl - depth - 4;
  if (hi <= lo && opts.y0 == null) return null;
  const y0 = opts.y0 ?? (lo + Math.floor(rnd() * (hi - lo)));
  if (!skyClear(w, fx0 - 7, y0 - 14, fx1 + 7, y0 + depth + 6)) return null;
  const ruin = z === SKY_ZONE.RUINAS, nest = z === SKY_ZONE.NINHAL;
  const dome = opts.flat ? 0.5 : ruin ? R * 0.05 : R * (0.1 + rnd() * 0.06), k = rnd() * 50;
  const surf = new Int16Array(R * 2 + 1), bot = new Int16Array(R * 2 + 1);
  for (let dx = -R; dx <= R; dx++) {
    const e = Math.abs(dx / (R + 0.5)), x = cx + dx;
    let top = y0 - Math.round((1 - e * e) * dome) + Math.round(skyNoise(w, x * 0.18, k) * (ruin ? 0.4 : 1.1));
    if (e > 0.82) top += Math.round(((e - 0.82) / 0.18) ** 2 * 3);
    let d = Math.round(depth * Math.pow(Math.max(0, 1 - e), 0.85) * (0.78 + 0.22 * skyNoise(w, x * 0.21, k + 1)) + 2);
    if (rnd() < 0.18 && e < 0.8) d += 2 + Math.floor(rnd() * 4);              // ponta pendurada
    surf[dx + R] = top; bot[dx + R] = Math.max(top + 2, y0 + d);
  }
  for (let dx = -R; dx <= R; dx++) {
    const x = cx + dx, top = surf[dx + R], b = bot[dx + R], e = Math.abs(dx / R);
    const soil = Math.max(1, Math.round(2.6 + skyNoise(w, x * 0.3, k + 2) * 1.4 - e * 1.5));
    for (let y = top; y <= b; y++) {
      let t;
      if (y === top) t = nest && rnd() < 0.45 ? TILE.SKYSTONE : TILE.SKY_GRASS;
      else if (y <= top + soil) t = TILE.SKY_SOIL;
      else t = TILE.SKYSTONE;
      sSet(w, x, y, t, y > top + 1 ? WALL.SKYSTONE : WALL.NONE);
    }
  }
  // veios de cristal-de-vento dentro da pedra
  for (let k2 = 0; k2 < 1 + R / 8; k2++) {
    if (rnd() > 0.55) continue;
    const vx = cx + Math.floor((rnd() - 0.5) * R), vy = y0 + 3 + Math.floor(rnd() * depth * 0.6);
    for (let i = 0; i < 3 + rnd() * 4; i++) {
      const x = vx + Math.floor((rnd() - 0.5) * 4), y = vy + Math.floor((rnd() - 0.5) * 3);
      if (w.getTile(x, y) === TILE.SKYSTONE && w.getTile(x, y - 1) !== TILE.AIR && w.getTile(x, y + 1) !== TILE.AIR) sSet(w, x, y, TILE.WIND_CRYSTAL);
    }
  }
  const isl = { cx, R, x0: fx0, x1: fx1, y0, depth, top: Math.min(...surf), bottom: Math.max(...bot), zone: z, group: opts.group, surf };
  if (opts.nest) return isl;
  if (z === SKY_ZONE.JARDIM) skyGarden(w, rnd, isl);
  else if (z === SKY_ZONE.RUINAS) skyRuin(w, rnd, isl);
  else skyNestIsland(w, rnd, isl);
  return isl;
}

const skyTopAt = (isl, x) => isl.surf[clamp(x - isl.x0, 0, isl.surf.length - 1)];
// Área toda vazia (e dentro da faixa)?
function skyClear(w, x0, y0, x1, y1) {
  if (x0 < 2 || x1 >= w.w - 2 || y0 < 2) return false;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (y > w.skyFloor[x]) return false;
    if (w.tiles[y * w.w + x] !== TILE.AIR) return false;
  }
  return true;
}
// Coluna sem nada sólido (nuvem e enfeite não contam)
function skyColumnClear(w, x, y0, y1) {
  for (let y = y0; y <= y1; y++) if (SOLID[w.getTile(x, y)] || w.getTile(x, y) === TILE.TRUNK) return false;
  return true;
}
// Primeiro bloco sólido descendo de y (-1 se não achar perto)
function skySurfaceY(w, x, y) {
  for (let k = 0; k < 40; k++) if (SOLID[w.getTile(x, y + k)]) return y + k;
  return -1;
}

// ---------- Nuvem ----------
// Banco de nuvem: vários calombos (elipses) enfileirados, mais grosso no meio
function skyCloudBank(w, rnd, cx, cy, len, thick, rain) {
  // Banco de nuvem como cúmulo: barriga quase reta e topo em cúpula com calombos que mudam
  // devagar de uma coluna para a outra (degrau de no máximo um bloco: nada de caixote), e as
  // pontas afinando até um bloco só.
  const t = rain ? TILE.RAIN_CLOUD : TILE.CLOUD, k = rnd() * 100;
  const H = Math.max(1.6, thick * 1.4), base = Math.round(cy), x0 = Math.floor(cx - len / 2), x1 = Math.ceil(cx + len / 2), n = x1 - x0 + 1;
  const tops = [];
  for (let i = 0; i < n; i++) {
    const x = x0 + i, e = Math.min(1, Math.abs(x - cx) / (len / 2));
    tops.push(base - Math.round(H * Math.sqrt(1 - e * e) * (0.75 + 0.35 * Math.sin(x * 0.55 + k) * Math.sin(x * 0.21 + k * 0.7))));
  }
  // degrau de um bloco no máximo, de fora para dentro dos dois lados
  for (let i = 0; i < n; i++) tops[i] = Math.max(tops[i], base - i, i ? tops[i - 1] - 1 : base);
  for (let i = n - 1; i >= 0; i--) tops[i] = Math.max(tops[i], base - (n - 1 - i), i < n - 1 ? tops[i + 1] - 1 : base);
  for (let i = 0; i < n; i++) {
    const x = x0 + i, e = Math.abs(x - cx) / (len / 2);
    const bottom = base + (e < 0.7 ? 1 : 0) + (e < 0.35 && thick > 2 ? 1 : 0);
    for (let y = tops[i]; y <= bottom; y++) {
      if (!w.inBounds(x, y) || y > w.skyFloor[clamp(x, 0, w.w - 1)] || w.getTile(x, y) !== TILE.AIR) continue;
      // não encosta na grama de cima de uma ilha (senão tapa o caminho)
      if (SOLID[w.getTile(x, y + 1)] && w.getTile(x, y + 1) !== TILE.SKYSTONE) continue;
      sSet(w, x, y, t);
    }
  }
}

// ---------- Jardim ----------
function skyGarden(w, rnd, isl) {
  const { cx, R } = isl;
  // lagoa rasa no meio de ilhas grandes
  if (R >= 13 && rnd() < 0.55) {
    const pw = 3 + Math.floor(rnd() * 4), px = cx + Math.floor((rnd() - 0.5) * R * 0.5), d = 2;
    const rim = Math.max(skyTopAt(isl, px - pw - 1), skyTopAt(isl, px + pw + 1)); // a borda mais baixa segura a água
    for (let x = px - pw; x <= px + pw; x++) {
      const top = skyTopAt(isl, x), bottom = rim + d - (Math.abs(x - px) === pw ? 1 : 0);
      for (let y = top; y < bottom; y++) { sSet(w, x, y, TILE.AIR, WALL.NONE); if (y >= rim) w.water[y * w.w + x] = WATER_MAX; }
      sSet(w, x, bottom, TILE.SKY_SOIL);
    }
    isl.pond = { x0: px - pw, x1: px + pw, y: rim };
  }
  // cachoeira saindo da lateral da ilha e virando névoa no vento
  if (R >= 10 && rnd() < 0.6) {
    const side = rnd() < 0.5 ? -1 : 1, x = cx + side * Math.round(R * 0.9);
    const y = skyTopAt(isl, x) + 1;
    w.skyFalls.push({ x: x + side, y, side, len: 26 + Math.floor(rnd() * 40), wide: 1 + (R > 18 ? 1 : 0), seed: Math.floor(rnd() * 1e6) });
  }
  // árvores-do-vento (copa própria em js/sky-life.js), flores e moitas
  let last = -99;
  for (let x = isl.x0 + 3; x <= isl.x1 - 3; x++) {
    const top = skyTopAt(isl, x);
    if (w.getTile(x, top) !== TILE.SKY_GRASS || w.getTile(x, top - 1) !== TILE.AIR || w.water[(top - 1) * w.w + x]) continue;
    if (x - last >= 8 && rnd() < 0.22 && w.getTile(x, w.surface[x] - 1) !== TILE.TRUNK && !w.skyTreeCols.has(x - 1) && !w.skyTreeCols.has(x + 1)) {
      const h = 4 + Math.floor(rnd() * 4);
      let room = true;
      for (let i = 1; i <= h + 2 && room; i++) room = w.getTile(x, top - i) === TILE.AIR;
      if (room) { for (let i = 1; i <= h; i++) sSet(w, x, top - i, TILE.TRUNK); w.skyTreeCols.add(x); last = x; continue; }
    }
    if (rnd() < 0.09) sSet(w, x, top - 1, TILE.SKY_FLOWER);
  }
  if (R >= 12 && rnd() < 0.35) skyChestOn(w, rnd, isl, 'celeste');
}

// Baú em cima da ilha, num trecho de grama plano e livre
function skyChestOn(w, rnd, isl, table) {
  for (let k = 0; k < 12; k++) {
    const x = isl.cx + Math.floor((rnd() - 0.5) * isl.R), top = skyTopAt(isl, x);
    if (!SOLID[w.getTile(x, top)] || w.getTile(x, top - 1) !== TILE.AIR || w.getTile(x, top - 2) !== TILE.AIR || w.water[(top - 1) * w.w + x]) continue;
    addLootChest(w, x, top - 1, table, rnd);
    return;
  }
}

// ---------- Ninhal ----------
// Pedra nua com ninhos de gravetos em forma de tigela; cada um guarda o que as aves roubaram
function skyNestIsland(w, rnd, isl) {
  const { cx, R } = isl;
  const n = R >= 14 ? 2 : R >= 8 ? 1 : 0;
  for (let k = 0; k < n; k++) {
    const nx = cx + (n === 1 ? 0 : (k ? 1 : -1) * Math.round(R * 0.45)), half = 3 + Math.floor(rnd() * 2);
    skyNestBowl(w, rnd, nx, skyTopAt(isl, nx), half, true);
    w.skyNests.push({ x: nx, y: skyTopAt(isl, nx) - 1 });
  }
  for (let x = isl.x0 + 2; x <= isl.x1 - 2; x++) {
    const top = skyTopAt(isl, x);
    if (w.getTile(x, top - 1) === TILE.AIR && SOLID[w.getTile(x, top)] && rnd() < 0.05) sSet(w, x, top - 1, TILE.SKY_FLOWER);
    // pedras pontudas sobem da ilha
    if (rnd() < 0.05 && w.getTile(x, top - 1) === TILE.AIR) for (let i = 1; i <= 1 + Math.floor(rnd() * 3); i++) if (w.getTile(x, top - i) === TILE.AIR) sSet(w, x, top - i, TILE.SKYSTONE);
  }
}
function skyNestBowl(w, rnd, nx, top, half, chest) {
  for (let dx = -half - 1; dx <= half + 1; dx++) {
    const e = Math.abs(dx) / (half + 1), rimH = Math.round(e * e * 3);
    for (let i = 0; i <= rimH; i++) {
      const y = top - 1 - i;
      if (w.getTile(nx + dx, y) === TILE.AIR) sSet(w, nx + dx, y, TILE.TWIG_NEST);
    }
    if (Math.abs(dx) <= half && w.getTile(nx + dx, top) !== TILE.AIR) sSet(w, nx + dx, top, TILE.TWIG_NEST);
  }
  if (chest && w.getTile(nx, top - 2) === TILE.AIR) addLootChest(w, nx, top - 2, 'ninho', rnd);
}

// ---------- Ruínas dos Vigias ----------
function skyRuin(w, rnd, isl) {
  const { cx, R } = isl;
  // piso de mármore onde as ruínas estão
  const px0 = cx - Math.round(R * 0.75), px1 = cx + Math.round(R * 0.75);
  for (let x = px0; x <= px1; x++) { const t = skyTopAt(isl, x); if (rnd() < 0.85) sSet(w, x, t, TILE.MARBLE); }
  const kind = R >= 16 && !w.skyObservatory ? 'observatory' : R >= 12 ? (rnd() < 0.5 ? 'temple' : 'colonnade') : 'colonnade';
  if (kind === 'observatory') skyObservatory(w, rnd, isl);
  else if (kind === 'temple') skyTemple(w, rnd, isl, cx);
  else skyColonnade(w, rnd, isl, cx - Math.floor(R * 0.5), cx + Math.floor(R * 0.5));
  w.skyRuins.push({ x0: isl.x0, x1: isl.x1, floor: isl.y0, cx });
}
// Base nivelada de mármore (de x0 a x1 na altura y), enchendo de pedra embaixo se faltar
function skyLevel(w, x0, x1, y) {
  for (let x = x0; x <= x1; x++) {
    sSet(w, x, y, TILE.MARBLE, WALL.NONE);
    for (let yy = y - 1; yy > y - 14; yy--) if (w.getTile(x, yy) !== TILE.AIR && w.getTile(x, yy) !== TILE.TRUNK) sSet(w, x, yy, TILE.AIR, WALL.NONE);
    for (let yy = y + 1; yy < y + 6 && w.getTile(x, yy) === TILE.AIR; yy++) sSet(w, x, yy, TILE.SKYSTONE, WALL.SKYSTONE);
  }
}
function skyColonnade(w, rnd, isl, x0, x1) {
  const y = isl.y0;
  skyLevel(w, x0 - 1, x1 + 1, y);
  const h = 5 + Math.floor(rnd() * 2), broken = rnd() < 0.7;
  for (let x = x0; x <= x1; x += 3) {
    const hh = broken && rnd() < 0.35 ? 2 + Math.floor(rnd() * (h - 2)) : h;
    for (let i = 1; i <= hh; i++) sSet(w, x, y - i, TILE.MARBLE_PILLAR);
    if (hh === h) for (const dx of [-1, 0, 1]) sSet(w, x + dx, y - h - 1, TILE.MARBLE_GOLD);
  }
  // lintel corrido por cima (com um trecho caído)
  const gap0 = broken ? x0 + Math.floor(rnd() * (x1 - x0)) : -1;
  for (let x = x0 - 1; x <= x1 + 1; x++) if (Math.abs(x - gap0) > 2 && w.getTile(x, y - h - 2) === TILE.AIR) sSet(w, x, y - h - 2, TILE.MARBLE);
  // parede de fundo com buracos em manchas (desmoronou mais em cima)
  for (let x = x0; x <= x1; x++) for (let i = 1; i <= h; i++)
    if (w.getTile(x, y - i) === TILE.AIR && fbm2(x * 0.3 + 50, (y - i) * 0.3 + 20, 0, 2) < 0.62 - (i / h) * 0.18) w.walls[(y - i) * w.w + x] = WALL.MARBLE;
  if (rnd() < 0.5) addLootChest(w, x0 + 1, y - 1, 'celeste', rnd);
}
function skyTemple(w, rnd, isl, cx) {
  const half = 6 + Math.floor(rnd() * 2), y = isl.y0, H = 7, x0 = cx - half, x1 = cx + half;
  skyLevel(w, x0 - 2, x1 + 2, y);
  for (let yy = y - H; yy < y; yy++) for (let x = x0; x <= x1; x++) {
    const edge = x === x0 || x === x1, door = edge && yy >= y - 3;
    const win = edge && (yy === y - 5 || yy === y - 4);
    sSet(w, x, yy, door ? TILE.AIR : win ? TILE.VITRAL : edge ? TILE.MARBLE : TILE.AIR, WALL.MARBLE);
  }
  for (let x = x0; x <= x1; x++) sSet(w, x, y - H, TILE.MARBLE_GOLD, WALL.MARBLE);
  // frontão: degraus de mármore subindo até o meio
  for (let k = 1; k <= half; k++) for (let x = x0 - 1 + k; x <= x1 + 1 - k; x++) if (w.getTile(x, y - H - k) === TILE.AIR) sSet(w, x, y - H - k, k === half ? TILE.MARBLE_GOLD : TILE.MARBLE);
  // vitral redondo no meio do frontão e colunas na fachada
  sSet(w, cx, y - H - 2, TILE.VITRAL); sSet(w, cx - 1, y - H - 2, TILE.VITRAL); sSet(w, cx + 1, y - H - 2, TILE.VITRAL);
  for (const x of [x0 + 3, x1 - 3]) for (let i = 1; i < H; i++) sSet(w, x, y - i, TILE.MARBLE_PILLAR, WALL.MARBLE);
  // ruína: um canto do telhado caiu
  if (rnd() < 0.6) { const side = rnd() < 0.5 ? -1 : 1; for (let k = 0; k < 9; k++) { const x = cx + side * (2 + Math.floor(rnd() * half)), yy = y - H - Math.floor(rnd() * half); if (w.getTile(x, yy) === TILE.MARBLE) sSet(w, x, yy, TILE.AIR); } }
  addLootChest(w, cx, y - 1, 'celeste', rnd);
}
// Observatório: torre redonda com cúpula de vitral, a luneta dos Vigias saindo pela fresta e
// o mural na parede de dentro (lido com o botão direito, js/sky-boss.js)
function skyObservatory(w, rnd, isl) {
  const cx = isl.cx, y = isl.y0, half = 5, H = 11;
  skyLevel(w, cx - half - 5, cx + half + 5, y);
  for (let yy = y - H; yy < y; yy++) for (let x = cx - half; x <= cx + half; x++) {
    const edge = Math.abs(x - cx) === half, door = edge && yy >= y - 3 && x > cx;
    sSet(w, x, yy, door ? TILE.AIR : edge ? ((yy - y) % 4 === 0 ? TILE.MARBLE_GOLD : (yy === y - 7 || yy === y - 8) ? TILE.VITRAL : TILE.MARBLE) : TILE.AIR, WALL.MARBLE);
  }
  // piso de cima (o salão da luneta) com alçapão e escada
  for (let x = cx - half + 1; x < cx + half; x++) sSet(w, x, y - 6, x === cx - half + 2 ? TILE.PLATFORM : TILE.MARBLE, WALL.MARBLE);
  for (let yy = y - 5; yy < y; yy++) sSet(w, cx - half + 2, yy, TILE.LADDER, WALL.MARBLE);
  // cúpula de vitral
  for (let k = 0; k <= half + 1; k++) {
    const r = Math.round(Math.sqrt(Math.max(0, (half + 1) ** 2 - k * k)));
    for (let x = cx - r; x <= cx + r; x++) {
      const yy = y - H - k, shell = Math.abs(x - cx) >= r - 1 || k >= half;
      if (shell) sSet(w, x, yy, k >= half ? TILE.MARBLE_GOLD : TILE.VITRAL, WALL.MARBLE);
      else sSet(w, x, yy, TILE.AIR, WALL.MARBLE);
    }
  }
  // fresta da luneta na cúpula
  for (let k = 1; k < half; k++) sSet(w, cx + 1 + Math.floor(k * 0.8), y - H - k, TILE.AIR, WALL.NONE);
  w.skyObservatory = { cx, floor: y - 7, scope: { x: cx * T + T / 2, y: (y - H + 1) * T }, mural: { x: cx - 2, y: y - 2 } };
  addLootChest(w, cx + 2, y - 7, 'celeste', rnd);
  addLootChest(w, cx - 3, y - 1, 'celeste', rnd);
  // colunatas dos dois lados
  skyColonnade(w, rnd, isl, cx - half - 8, cx - half - 3);
  skyColonnade(w, rnd, isl, cx + half + 3, cx + half + 8);
}

// ---------- Ninho da Tempestade ----------
// A ilha mais alta e larga do céu: um anel de rochas pontudas em volta de um ninho enorme,
// nuvens de chuva em volta. É a arena do Olho da Tempestade.
function buildStormNest(w, rnd, cx, y0) {
  const R = 34;
  const isl = skyIsland(w, rnd, cx, R, SKY_ZONE.NINHAL, { nest: true, y0, depthK: 0.8, flat: true });
  if (!isl) return;
  isl.nest = true;
  w.skyIslands.push(isl);
  // piso plano no meio, picos nas bordas
  const floor = y0;
  for (let x = cx - R + 3; x <= cx + R - 3; x++) {
    for (let y = floor - 12; y < floor; y++) if (w.getTile(x, y) !== TILE.AIR) sSet(w, x, y, TILE.AIR, WALL.NONE);
    sSet(w, x, floor, Math.abs(x - cx) < 14 ? TILE.TWIG_NEST : TILE.SKY_GRASS);
  }
  for (const side of [-1, 1]) for (let k = 0; k < 3; k++) {
    const x = cx + side * (R - 3 - k * 2), h = 6 + (2 - k) * 4 + Math.floor(rnd() * 3);
    // pico de pedra: largo embaixo, afinando até a ponta, torto para fora
    for (let i = 1; i <= h; i++) {
      const half = Math.round(2.2 * (1 - i / (h + 1)) ** 0.8), lean = Math.round(side * (i / h) ** 2 * 2);
      for (let dx = -half; dx <= half; dx++) sSet(w, x + dx + lean, floor - i, TILE.SKYSTONE);
    }
  }
  // o ninho: tigela larga de gravetos no meio
  skyNestBowl(w, rnd, cx, floor, 11, false);
  // plataformas de nuvem por cima da arena
  for (const [dx, dy, len] of [[-18, 9, 9], [18, 9, 9], [0, 15, 11], [-27, 15, 5], [27, 15, 5]])
    for (let x = cx + dx - (len >> 1); x <= cx + dx + (len >> 1); x++) for (const yy of [floor - dy, floor - dy + 1]) if (w.getTile(x, yy) === TILE.AIR) sSet(w, x, yy, yy === floor - dy ? TILE.RAIN_CLOUD : TILE.CLOUD);
  // nuvens de chuva em volta
  for (let k = 0; k < 7; k++) skyCloudBank(w, rnd, cx + Math.floor((rnd() - 0.5) * 2 * (R + 30)), floor + 4 + Math.floor(rnd() * 16), 12 + Math.floor(rnd() * 16), 1.6 + rnd(), true);
  w.skyNest = { cx, floor, x0: cx - R + 3, x1: cx + R - 3, R, top: floor - 26 };
}

// ---------- Limpeza final das ilhas; correntes só existem após construção ----------
function finalizeSky(w) {
  if (!w.skyFloor) return;
  w.skyWinds = []; w.skyStones = [];
  // árvores do céu que perderam o tronco (uma estrutura passou por ali) saem da lista
  for (const x of [...w.skyTreeCols]) { let y = 0; while (y < w.skyFloor[x] && w.getTile(x, y) !== TILE.TRUNK) y++; if (y >= w.skyFloor[x]) w.skyTreeCols.delete(x); }
  // a lagoa do jardim não pode vazar: o fundo e os lados são de terra
  for (const isl of w.skyIslands) if (isl.pond) {
    const { x0, x1, y } = isl.pond;
    for (let x = x0 - 1; x <= x1 + 1; x++) for (let yy = y; yy < y + 4; yy++) if (!w.water[yy * w.w + x] && w.getTile(x, yy) === TILE.AIR && (x < x0 || x > x1 || yy > y + 1)) sSet(w, x, yy, TILE.SKY_SOIL);
  }
}
