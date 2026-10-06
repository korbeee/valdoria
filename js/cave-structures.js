'use strict';

// =====================================================================================
//  ESTRUTURAS DAS CAVERNAS
// =====================================================================================
// Coisas que só fazem sentido debaixo da terra e que se ENCAIXAM na caverna que já existe
// (nada de caixa enfiada no meio da rocha):
//   • PONTE DE TÁBUAS — atravessa um vão da caverna de uma borda à outra, com esteios até o
//     fundo quando ele é raso e um lampião em cada cabeceira.
//   • ANDAIME DOS MINEIROS — torre de vigas encostada numa parede alta, com pisos, escada,
//     roldana, lampiões e o baú que os mineiros deixaram lá em cima.
//   • BUNKER SOTERRADO — abrigo de concreto do tempo de antes (combina com as ruínas da
//     superfície): teto cedido, vergalhão pendurado, entulho e um baú de sucata.
//   • CRIPTA DA TRIBO — salão de pedra com abóbada, totens, nichos com teia, altar com velas
//     e o baú das oferendas. Nas grutas de cristal ela vira santuário iluminado por ametista.
// Cada uma escolhe o lugar olhando a forma da caverna (chão, vão ou parede alta), evita água,
// os covis dos chefes e as outras estruturas, e ganha o "acabamento" da região onde caiu.

Object.assign(BP_LEGEND, {
  'S': [TILE.STONE_BRICK, 'back'], 'M': [TILE.MOSS_BRICK, WALL.NONE], 'A': [TILE.LANTERN, 'back'],
  'V': [TILE.CANDLE, 'back'], 'G': [TILE.GLOW_CAP, 'back'],
  ';': [TILE.REBAR, 'back'],
  ':': [TILE.AIR, WALL.STONE], // buraco que dá para a rocha (debaixo da terra não existe céu atrás)
});

const CAVE_BLUEPRINTS = {
  // Bunker: duas salas de concreto, a da direita com o teto cedido (entulho e vergalhão),
  // porta aberta dos dois lados para a caverna
  bunker: { back: WALL.CONCRETE, loot: 'ruin', rows: [
    '###############::::#######',
    '#,,,A,,,,,#,,,;,::,;,A,,w#',
    '#w,,,,,,,,#,,,,,,,,,,,,,,#',
    '#,,,,,,,,,,,,,,,,,,,,,,,,#',
    ',,,,,,,,,,,,,,,,,,,,,,,,,,',
    ',,,,,,,,,,,,,,,,,,,,,,,,,,',
    ',z,c,,,,,,,,TC,,qqq,,,z,,,',
    '##########################',
  ] },
  // Cripta: abóbada de tijolo de pedra, lampião no alto, totens, nichos e altar no meio
  crypt: { back: WALL.STONE_BRICK, loot: 'tribe', rows: [
    '    SSSSSSSSSSSSS    ',
    '  SSS,,,,,,,,,,,SSS  ',
    ' SS,,,,,,,A,,,,,,,SS ',
    ' S,w,,,,,,,,,,,,,w,S ',
    'SS,t,,,,,,,,,,,,,t,SS',
    ',,,t,,,,,,,,,,,,,t,,,',
    ',,,t,,,,V,c,V,,,,t,,,',
    ',k,t,G,,SSSSS,,G,t,k,',
    'MSSSSSSSSSSSSSSSSSSSM',
  ] },
};
for (const [name, bp] of Object.entries(CAVE_BLUEPRINTS)) {
  const wdt = bp.rows[0].length;
  bp.rows.forEach((r, i) => { if (r.length !== wdt) console.warn(`Planta ${name}: linha ${i} tem ${r.length} (esperado ${wdt})`); });
}

// ---------- Leitura da caverna ----------
const caveAir = (w, x, y) => w.inBounds(x, y) && w.getTile(x, y) === TILE.AIR && !w.water[y * w.w + x];
const caveSolid = (w, x, y) => w.inBounds(x, y) && SOLID[w.getTile(x, y)] === 1;
// Fundo o bastante para ser caverna (e não um buraco na encosta)
const caveDepthOk = (w, x, y) => x > 8 && x < w.w - 8 && y > w.surface[x] + 22 && y < w.h - 8 && !w.isSkyExposed(x, y);
function boxHasWater(w, x0, y0, x1, y1) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (w.inBounds(x, y) && w.water[y * w.w + x]) return true;
  return false;
}
// Sorteia um ponto e desce até o primeiro chão de caverna (ar em cima, sólido embaixo)
function randomCaveFloor(w, rnd) {
  const x = 12 + Math.floor(rnd() * (w.w - 24));
  let y = w.surface[x] + 24 + Math.floor(rnd() * Math.max(1, w.h * 0.82 - w.surface[x] - 24));
  for (let n = 0; n < 60 && y < w.h - 8; n++, y++)
    if (caveAir(w, x, y - 1) && caveAir(w, x, y - 2) && caveSolid(w, x, y)) return caveDepthOk(w, x, y) ? { x, y } : null;
  return null;
}
// Fração de ar numa caixa: diz se a estrutura está "dentro" da caverna
function airShare(w, x0, y0, x1, y1) {
  let air = 0, n = 0;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { n++; if (caveAir(w, x, y)) air++; }
  return air / Math.max(1, n);
}

// Túnel baixo saindo da porta até achar caverna aberta (como as ruínas de pedra)
function tunnelOut(w, x, floor, dir, max = 26) {
  for (let n = 0; n < max; n++, x += dir) {
    if (x < 3 || x >= w.w - 3) return;
    const open = n > 1 && caveAir(w, x, floor - 1) && caveAir(w, x, floor - 2) && caveAir(w, x, floor - 3);
    if (open) return;
    for (let k = 1; k <= 3; k++) if (w.getTile(x, floor - k) !== TILE.BEDROCK) sSet(w, x, floor - k, TILE.AIR);
    if (!caveSolid(w, x, floor)) sSet(w, x, floor, TILE.STONE);
  }
}

// Acabamento conforme a região: musgo e cogumelo-lanterna nas grutas úmidas, gelo na
// caverna gelada, teia em todo canto escuro
function caveFinish(w, rnd, x0, y0, x1, y1) {
  const region = undergroundRegion(w, (x0 + x1) >> 1, (y0 + y1) >> 1);
  const wet = region === UNDER.GROTTO || region === UNDER.MYCELIUM;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const t = w.getTile(x, y);
    if (wet && OVERGROW_MOSS[t] && pnoise2(x / 4, y / 4, 64, 57) + rnd() * 0.3 > 0.72) sSet(w, x, y, OVERGROW_MOSS[t]);
    if (t !== TILE.AIR) continue;
    const below = w.getTile(x, y + 1), above = w.getTile(x, y - 1);
    if (SOLID[above] && (SOLID[w.getTile(x - 1, y)] || SOLID[w.getTile(x + 1, y)]) && rnd() < 0.35) sSet(w, x, y, TILE.COBWEB);
    else if (region === UNDER.MYCELIUM && SOLID[below] && rnd() < 0.12) sSet(w, x, y, TILE.GLOW_CAP);
    else if (region === UNDER.FROZEN && SOLID[above] && rnd() < 0.1) sSet(w, x, y, TILE.ICE);
  }
}

// ---------- Ponte de tábuas ----------
function tryCaveBridge(w, rnd, ok) {
  const s = randomCaveFloor(w, rnd);
  if (!s) return null;
  const dir = rnd() < 0.5 ? -1 : 1;
  let { x, y } = s;
  // anda pelo chão até a beirada do vão
  let n = 0;
  while (n++ < 40 && caveSolid(w, x + dir, y) && caveAir(w, x + dir, y - 1)) x += dir;
  if (caveSolid(w, x + dir, y) || !caveAir(w, x + dir, y - 1)) return null;
  // mede o vão: a beirada do outro lado pode estar um bloco acima ou dois abaixo do tabuleiro
  let gap = 0, depth = 99;
  for (let k = 1; k <= 26; k++) {
    const gx = x + dir * k;
    if (caveSolid(w, gx, y - 1)) { if (!caveAir(w, gx, y - 2) || !caveAir(w, gx, y - 3)) return null; gap = k - 1; break; }
    if (caveSolid(w, gx, y)) { if (!caveAir(w, gx, y - 1) || !caveAir(w, gx, y - 2)) return null; gap = k - 1; break; }
    if (!caveAir(w, gx, y) || !caveAir(w, gx, y - 1) || !caveAir(w, gx, y - 2) || !caveAir(w, gx, y - 3)) return null;
    let d = 0; while (d < 12 && caveAir(w, gx, y + 1 + d)) d++;
    if (d <= 1 && k > 5) { gap = k - 1; break; } // o chão do outro lado logo abaixo: termina ali
    depth = Math.min(depth, d);
  }
  if (gap < 5 || depth < 3) return null; // vão de verdade, não um degrau
  const a = Math.min(x, x + dir * (gap + 1)), b = Math.max(x, x + dir * (gap + 1));
  if (!ok(a - 2, y - 5, b + 2, y + 12) || boxHasWater(w, a, y - 4, b, y)) return null;
  for (let gx = a + 1; gx < b; gx++) sSet(w, gx, y, TILE.PLATFORM);
  // esteios descendo até o fundo quando ele não é muito fundo
  for (let gx = a + 3; gx < b - 1; gx += 4) {
    let d = 1;
    while (d < 10 && caveAir(w, gx, y + d)) d++;
    if (d < 10 && caveSolid(w, gx, y + d)) for (let k = 1; k < d; k++) sSet(w, gx, y + k, TILE.CARVED_BEAM);
  }
  // cabeceiras: poste, travessa e lampião
  for (const [px, side] of [[a, 1], [b, -1]]) {
    if (!caveAir(w, px, y - 1)) continue;
    sSet(w, px, y - 1, TILE.CARVED_BEAM); sSet(w, px, y - 2, TILE.CARVED_BEAM);
    if (caveAir(w, px, y - 3)) sSet(w, px, y - 3, TILE.LANTERN);
    if (caveAir(w, px + side, y - 1) && rnd() < 0.5) sSet(w, px + side, y - 1, TILE.BARREL);
  }
  return [a - 2, y - 5, b + 2, y + 12];
}

// ---------- Andaime dos mineiros ----------
function tryMinerScaffold(w, rnd, ok) {
  const s = randomCaveFloor(w, rnd);
  if (!s || undergroundRegion(w, s.x, s.y) === UNDER.MAGMA) return null;
  // anda pelo chão até a parede (ou o degrau) da caverna e monta o andaime ali, onde o teto é alto
  const W = 6, floor = s.y, dir = rnd() < 0.5 ? -1 : 1;
  let x = s.x, n = 0;
  while (n++ < 40 && caveSolid(w, x + dir, floor) && caveAir(w, x + dir, floor - 1)) x += dir;
  const x0 = dir < 0 ? x : x - W + 1, wallSide = dir < 0 ? -1 : W;
  let H = 0; // altura livre comum às colunas
  for (H = 0; H < 22; H++) {
    let free = true;
    for (let i = 0; i < W && free; i++) free = caveAir(w, x0 + i, floor - 1 - H);
    if (!free) break;
  }
  if (H < 10) return null;
  // os esteios descem até achar chão firme (o chão da caverna é torto)
  const legs = [];
  for (const px of [x0, x0 + W - 1]) {
    let d = 0;
    while (d < 5 && !caveSolid(w, px, floor + d)) d++;
    if (d >= 5) return null;
    legs.push([px, d]);
  }
  const top = floor - Math.min(H - 1, 16);
  if (!ok(x0 - 2, top - 2, x0 + W + 2, floor + 1) || boxHasWater(w, x0, top, x0 + W, floor)) return null;
  const levels = [];
  for (let y = floor - 5; y > top + 2; y -= 5) levels.push(y);
  if (!levels.length) return null;
  const ladder = wallSide < 0 ? x0 + 1 : x0 + W - 2;
  for (let y = floor - 1; y >= top; y--) for (let i = 0; i < W; i++) {
    const x = x0 + i;
    if (!caveAir(w, x, y)) continue;
    const post = i === 0 || i === W - 1;
    if (levels.includes(y)) sSet(w, x, y, x === ladder ? TILE.LADDER : TILE.PLATFORM, WALL.PLANKS);
    else if (post) sSet(w, x, y, TILE.CARVED_BEAM, WALL.PLANKS);
    else if (x === ladder && y > levels[levels.length - 1]) sSet(w, x, y, TILE.LADDER, WALL.PLANKS);
    else sSet(w, x, y, TILE.AIR, (y + i) % 7 === 0 ? undefined : WALL.PLANKS); // tábua faltando: aparece a rocha de trás
  }
  // travessa com roldana no alto, lampiões e o que os mineiros largaram em cada piso
  for (let i = 0; i < W; i++) sSet(w, x0 + i, top, TILE.BEAM_H, WALL.PLANKS);
  sSet(w, x0 + 2, top + 1, TILE.LANTERN, WALL.PLANKS);
  const lvl = [floor, ...levels];
  lvl.forEach((y, k) => {
    const spot = wallSide < 0 ? x0 + W - 2 : x0 + 1;
    if (k === 0 && !caveSolid(w, spot, y)) return; // chão torto: nada flutuando
    if (k === lvl.length - 1) addLootChest(w, spot, y - 1, 'mine', rnd);
    else if (rnd() < 0.6) sSet(w, spot, y - 1, rnd() < 0.5 ? TILE.BARREL : TILE.TORCH, WALL.PLANKS);
  });
  for (const [px, d] of legs) for (let k = 0; k < d; k++) sSet(w, px, floor + k, TILE.CARVED_BEAM);
  if (caveAir(w, x0 + 2, floor - 1) && caveSolid(w, x0 + 2, floor)) sSet(w, x0 + 2, floor - 1, TILE.CAMPFIRE, WALL.PLANKS);
  caveFinish(w, rnd, x0 - 1, top, x0 + W, floor);
  return [x0 - 2, top - 2, x0 + W + 2, floor + 1];
}

// ---------- Bunker e cripta (plantas carimbadas no chão da caverna) ----------
function tryCaveStamp(w, rnd, ok, bp, { minAir, finish }) {
  const s = randomCaveFloor(w, rnd);
  if (!s) return null;
  const W = bp.rows[0].length, H = bp.rows.length, x0 = s.x - (W >> 1), floor = s.y;
  const top = floor - H + 1;
  if (x0 < 6 || x0 + W > w.w - 6) return null;
  // o miolo tem que ser caverna de verdade, com chão firme embaixo de quase toda a planta
  const share = airShare(w, x0 + 2, top + 1, x0 + W - 3, floor - 2);
  if (share < minAir) return null;
  let ground = 0;
  for (let i = 0; i < W; i++) if (caveSolid(w, x0 + i, floor) || caveSolid(w, x0 + i, floor + 1)) ground++;
  if (ground < W * 0.6) return null;
  if (!ok(x0 - 3, top - 2, x0 + W + 3, floor + 2) || boxHasWater(w, x0 - 2, top - 1, x0 + W + 1, floor + 1)) return null;
  const box = stampBlueprint(w, rnd, bp, x0, floor, { mirror: rnd() < 0.5 });
  for (let i = 0; i < W; i++) if (!caveSolid(w, x0 + i, floor + 1)) sSet(w, x0 + i, floor + 1, TILE.STONE);
  tunnelOut(w, x0 - 1, floor, -1);
  tunnelOut(w, x0 + W, floor, 1);
  finish?.(box);
  caveFinish(w, rnd, x0, top, x0 + W - 1, floor);
  return [x0 - 3, top - 2, x0 + W + 3, floor + 2];
}

function generateCaveStructures(w, rnd, clear) {
  const boxes = [];
  const ok = (x0, y0, x1, y1) => clear(x0, y0, x1, y1) && boxes.every(([a, b, c, d]) => x1 < a - 6 || x0 > c + 6 || y1 < b - 4 || y0 > d + 4);
  const spawn = (want, tries, attempt) => {
    let made = 0;
    for (let i = 0; i < tries && made < want; i++) { const box = attempt(); if (box) { boxes.push(box); made++; } }
    return made;
  };
  const per = (n) => Math.max(1, Math.floor(w.w / n));
  w.caveSites = [];
  const log = (kind) => (box) => { if (box) w.caveSites.push({ kind, x: (box[0] + box[2]) >> 1, y: box[3] - 3 }); return box; };
  spawn(per(500), per(500) * 200, () => log('ponte')(tryCaveBridge(w, rnd, ok)));
  spawn(per(900), per(900) * 200, () => log('andaime')(tryMinerScaffold(w, rnd, ok)));
  spawn(per(1400), per(1400) * 80, () => log('bunker')(tryCaveStamp(w, rnd, ok, CAVE_BLUEPRINTS.bunker, { minAir: 0.35 })));
  spawn(per(1400), per(1400) * 80, () => log('cripta')(tryCaveStamp(w, rnd, ok, CAVE_BLUEPRINTS.crypt, {
    minAir: 0.4,
    // Nas grutas de cristal a cripta vira santuário: lâmpadas de ametista e drusas no altar
    finish: (b) => {
      if (undergroundRegion(w, (b.x0 + b.x1) >> 1, b.floor) !== UNDER.CRYSTAL) return;
      for (let y = b.top; y <= b.floor; y++) for (let x = b.x0; x <= b.x1; x++) {
        const t = w.getTile(x, y);
        if (t === TILE.LANTERN || t === TILE.GLOW_CAP || t === TILE.CANDLE) sSet(w, x, y, TILE.CRYSTAL);
        else if (y === b.top && t === TILE.STONE_BRICK && (x - b.x0) % 4 === 2) sSet(w, x, y, TILE.AMETHYST_LAMP);
      }
    },
  })));
}
