'use strict';

// =====================================================================================
//  A HISTÓRIA: SAIR DA ILHA
// =====================================================================================
// A piloto do voo, a Capitã Helena Duarte, sobreviveu e está numa vila com o tornozelo
// torcido. O rádio do avião não passa do horizonte, mas um FAROL DE RÁDIO montado na vila
// alcança os navios. Faltam quatro peças, e cada chefe guarda o caminho de uma:
//
//   Bramido (serra)      → atrás do covil, um avião de carga caído há anos. GERADOR.
//                          Enigma: empurrar as caixas do porão até as duas placas.
//   Dente de Âmbar       → a arena vira estrada até uma estação de rádio velha. ANTENA.
//                          Enigma: girar espelhos para levar o raio de sol até a fechadura.
//   Fiandeira (mina)     → a gaiola da expedição sumida, pendurada sobre um poço. TRANSMISSOR.
//                          Enigma: cortar os três fios numa ordem que não a jogue no poço.
//   Casco de Ferro       → o observatório enterrado. MAPA DE FREQUÊNCIAS.
//                          Enigma: engrenagens acopladas; deixar as quatro marcas para cima.
//
// Tudo é contado no mundo, em balões: a piloto, o rádio e os objetos falam. Só as peças
// ficam num painel pequeno. Com as quatro, a piloto monta o farol, você chama o resgate e
// um barco chega à praia leste.

Object.assign(TILE, { ANCIENT_ROAD: 97, CRATE: 99, PRESSURE_PLATE: 100, CARGO_DOOR: 101 });
// 96 e 98 eram da história antiga; ficam registrados porque as tabelas não aceitam buracos
defTile(96, { name: 'Pedra velha', hardness: Infinity, color: [128, 112, 96] });
defTile(98, { name: 'Caixote velho', hardness: Infinity, color: [70, 84, 72] });
defTile(TILE.ANCIENT_ROAD, { name: 'Pedra da estrada antiga', hardness: Infinity, color: [176, 140, 92] });
defTile(TILE.CRATE, { name: 'Caixa de carga', hardness: Infinity, color: [150, 106, 58] });
defTile(TILE.PRESSURE_PLATE, { name: 'Placa de pressão', hardness: Infinity, color: [120, 124, 130] });
defTile(TILE.CARGO_DOOR, { name: 'Porta do porão', hardness: Infinity, color: [110, 118, 110] });
{
  const art = (cores, pixels) => flatFromArt({ cores, pixels });
  MATERIAL_TEX[96] = new Tex(); MATERIAL_TEX[98] = new Tex();
  MATERIAL_TEX[TILE.ANCIENT_ROAD] = art({ a: [110, 84, 52], b: [160, 124, 80], c: [196, 160, 104], d: [226, 196, 140], k: [70, 52, 34] }, [
    'kkkkkkkkkkkkkkkk', 'kddccccckdcccccb', 'kdcccbcckdccbccb', 'kcccccbbkcccccbb', 'kbbbbbbbkbbbbbbb', 'kkkkkkkkkkkkkkkk',
    'kcccckdcccccckdd', 'kccbckcccbccckdc', 'kccccbkcccccbkcc', 'kbbbbbkbbbbbbkbb', 'kkkkkkkkkkkkkkkk', 'kddcccccckdcccck',
    'kdcccbcccckccbck', 'kccccccbbbkccccb', 'kbbbbbbbbbkbbbbb', 'kkkkkkkkkkkkkkkk',
  ]);
  MATERIAL_TEX[TILE.CRATE] = art({ k: [58, 36, 20], a: [120, 80, 40], b: [168, 116, 62], c: [204, 150, 88], m: [110, 110, 104] }, [
    'kkkkkkkkkkkkkkkk', 'kmcccccccccccmck', 'kcbbbbbbbbbbbbck', 'kcbkbbbbbbbbkbck', 'kcbbkbbbbbbkbbck', 'kcbbbkbbbbkbbbck',
    'kcbbbbkbbkbbbbck', 'kcbbbbbkkbbbbbck', 'kcbbbbbkkbbbbbck', 'kcbbbbkbbkbbbbck', 'kcbbbkbbbbkbbbck', 'kcbbkbbbbbbkbbck',
    'kcbkbbbbbbbbkbck', 'kcbbbbbbbbbbbbck', 'kmaaaaaaaaaaaamak', 'kkkkkkkkkkkkkkkk',
  ]);
  MATERIAL_TEX[TILE.PRESSURE_PLATE] = art({ k: [30, 32, 36], a: [80, 84, 90], b: [130, 134, 140], c: [180, 184, 190], y: [220, 180, 60] }, [
    'kkkkkkkkkkkkkkkk', 'kycycycycycycycy', 'kccccccccccccccc', 'kbbbbbbbbbbbbbbb', 'kbabbbbbbbbbbabb', 'kbbbbbbbbbbbbbbb',
    'kaaaaaaaaaaaaaaa', 'kkkkkkkkkkkkkkkk', 'kbbbkbbbbbbkbbbk', 'kbbbkbbbbbbkbbbk', 'kaaakaaaaaakaaak', 'kkkkkkkkkkkkkkkk',
    'kbbbbbbkbbbbbbbk', 'kbbbbbbkbbbbbbbk', 'kaaaaaakaaaaaaak', 'kkkkkkkkkkkkkkkk',
  ]);
  MATERIAL_TEX[TILE.CARGO_DOOR] = art({ k: [24, 28, 26], a: [70, 78, 72], b: [110, 118, 110], c: [150, 160, 150], r: [180, 80, 50] }, [
    'kkkkkkkkkkkkkkkk', 'kcbbbbbbbbbbbbak', 'kbbbbbbbbbbbbbak', 'kbbcbbbbbbbbcbak', 'kbbbbbbbbbbbbbak', 'kbbbbbrrrrbbbbak',
    'kbbbbbrbbrbbbbak', 'kbbbbbrrrrbbbbak', 'kbbbbbbbbbbbbbak', 'kbbcbbbbbbbbcbak', 'kbbbbbbbbbbbbbak', 'kbbbbbbbbbbbbbak',
    'kbbbbbbbbbbbbbak', 'kbbcbbbbbbbbcbak', 'kaaaaaaaaaaaaaak', 'kkkkkkkkkkkkkkkk',
  ]);
}
buildFlatTiles();

const STORY_PARTS = [
  { id: 'gerador', name: 'Gerador', where: 'no avião de carga atrás do covil do urso, na serra' },
  { id: 'antena', name: 'Antena', where: 'na estação de rádio depois da arena do tigre' },
  { id: 'transmissor', name: 'Transmissor', where: 'na gaiola da expedição, dentro da mina abandonada' },
  { id: 'mapa', name: 'Mapa de frequências', where: 'no observatório enterrado no deserto' },
];
const PILOT_NAME = 'Capitã Helena';

// ==================== GERAÇÃO (chamada pelos construtores dos covis) ====================
// 1. Porão do avião de carga atrás do covil do urso, do lado oposto à porta, fechado em
//    rocha matriz. Duas caixas, duas placas; a porta do fundo guarda o gerador.
function storyBearChamber(w, rnd, x0, x1, y1, doorSide) {
  const os = -doorSide, wallX = os > 0 ? x1 : x0;
  const cell = (i) => wallX + os * (4 + i);                    // i = 0..17 dentro do porão
  const xs = (a, b) => { const r = []; for (let x = Math.min(a, b); x <= Math.max(a, b); x++) r.push(x); return r; };
  for (let y = y1 - 9; y <= y1 + 2; y++) for (const x of xs(cell(-1), cell(19))) sSet(w, x, y, TILE.BEDROCK, WALL.PLANKS);
  for (let y = y1 - 6; y < y1; y++) for (const x of xs(cell(0), cell(17))) sSet(w, x, y, TILE.AIR, WALL.PLANKS);
  for (const x of xs(cell(0), cell(17))) sSet(w, x, y1, TILE.PLANKS, WALL.PLANKS);
  const passage = [];
  for (const x of xs(wallX + os, cell(-1))) for (let y = y1 - 4; y < y1; y++) { sSet(w, x, y, TILE.BEDROCK, WALL.PLANKS); passage.push([x, y]); }
  // Prateleira de carga no meio (duas fileiras de altura)
  for (let i = 5; i <= 8; i++) for (const y of [y1 - 1, y1 - 2]) sSet(w, cell(i), y, TILE.PLANKS, WALL.PLANKS);
  // Uma caixa em cima da prateleira, outra no chão; as placas ficam no piso
  const crates = [{ x: cell(7), y: y1 - 3 }, { x: cell(3), y: y1 - 1 }];
  const plates = [{ x: cell(10), y: y1 }, { x: cell(1), y: y1 }];
  for (const c of crates) sSet(w, c.x, c.y, TILE.CRATE, WALL.PLANKS);
  for (const p of plates) sSet(w, p.x, p.y, TILE.PRESSURE_PLATE, WALL.PLANKS);
  const door = [];
  for (let y = y1 - 6; y < y1; y++) { sSet(w, cell(15), y, TILE.CARGO_DOOR, WALL.PLANKS); door.push([cell(15), y]); }
  for (const i of [2, 9, 13, 16]) sSet(w, cell(i), y1 - 5, TILE.LANTERN, WALL.PLANKS);
  const a = Math.min(cell(0), cell(17)), b = Math.max(cell(0), cell(17));
  (w.story ??= {}).bear = {
    passage, crates, plates, door, os, generator: { x: cell(17), y: y1 - 1 }, lever: { x: cell(12), y: y1 - 1 },
    skeleton: { x: cell(0), y: y1 - 1 }, hold: { x0: a * T, x1: (b + 1) * T, y0: (y1 - 6) * T, y1: y1 * T },
  };
}

// 2. Estrada da arena até a estação de rádio. Devolve o trecho ocupado.
//    Raio de sol: lente → espelho baixo → espelho alto → (espelho de enfeite) → espelho alto → fechadura.
function storyTigerRoad(w, rnd, arenaX0, arenaW, arena) {
  const right = arenaX0 + arenaW + 7 + 64 < w.w - 20, dir = right ? 1 : -1;
  const gateOut = right ? arenaX0 + arenaW + 7 : arenaX0 - 7;
  const px0 = right ? gateOut + 20 : gateOut - 20 - 26, px1 = px0 + 26;
  if (px0 < 6 || px1 > w.w - 6) return null;
  const floorP = flattenSurface(w, px0, px1);
  const road = [];
  for (let x = gateOut + dir; right ? x < px0 : x > px1; x += dir) road.push(x);
  for (let x = px0; x <= px1; x++) road.push(x);
  for (let x = arena.x0; x <= arena.x1; x++) road.push(x);
  for (let y = floorP - 12; y < floorP; y++) for (let x = px0; x <= px1; x++) if (w.getTile(x, y) !== TILE.AIR) sSet(w, x, y, TILE.AIR);
  const y0 = floorP - 3, yTop = floorP - 8;
  const post = (x, top) => { for (let y = top + 1; y < floorP; y++) sSet(w, x, y, TILE.STONE_BRICK, WALL.NONE); };
  const lens = { x: px0 + 1, y: y0 }, lock = { x: px0 + 16, y: y0 };
  // Os espelhos altos ficam pendurados numa viga (só desenho): o raio sobe por baixo deles
  const mirrors = [
    { x: px0 + 6, y: y0, want: '/' }, { x: px0 + 6, y: yTop, want: '/' },
    { x: px0 + 11, y: yTop, want: '|' }, { x: px0 + 16, y: yTop, want: '\\' },
  ];
  post(lens.x, lens.y); post(lock.x, lock.y); post(mirrors[0].x, mirrors[0].y);
  const states = ['/', '\\', '|'];
  for (const m of mirrors) { let s; do s = states[Math.floor(rnd() * 3)]; while (s === m.want); m.state = s; }
  (w.story ??= {}).tiger = { road, arenaFloor: arena.floor, lens, lock, mirrors, beam: { x0: px0 + 5, x1: px0 + 17, y: yTop - 1 }, tower: { x: px0 + 21, floor: floorP }, plaza: [px0, px1] };
  return [Math.min(px0, gateOut) - 4, Math.max(px1, gateOut) + 4];
}

// 3. Gaiola da expedição pendurada por três fios sobre um poço, no chão da galeria da aranha
function storySpiderCage(w, rnd, x0, x1, y0, y1, side) {
  const pitX = side < 0 ? x0 + 14 : x1 - 14;                    // lado da entrada, entre as plataformas
  for (let y = y1; y <= y1 + 6; y++) for (let x = pitX - 2; x <= pitX + 2; x++) sSet(w, x, y, TILE.BEDROCK, WALL.STONE);
  for (let y = y1; y <= y1 + 4; y++) for (let x = pitX - 1; x <= pitX + 1; x++) sSet(w, x, y, TILE.AIR, WALL.STONE);
  for (let y = y1; y <= y1 + 4; y++) sSet(w, pitX + 1, y, TILE.LADDER, WALL.STONE);
  sSet(w, pitX - 1, y1 + 4, TILE.COBWEB, WALL.STONE);
  const threads = [{ ax: pitX - 6, cut: false }, { ax: pitX, cut: false }, { ax: pitX + 3, cut: false }];
  const wx = pitX + 4 * (side < 0 ? 1 : -1);
  (w.story ??= {}).spider = { pitX, ceil: y0, floor: y1, threads, winch: { x: wx, y: y1 - 1 } };
}

// 4. Painel de engrenagens e gaveta de mapas no observatório
function storyObservatory(w, lair) {
  const [ox0, , ox1, oy1] = lair.observatory, mid = Math.round((ox0 + ox1) / 2);
  const r = mulberry32((w.seed | 0) + 77), gears = [0, 0, 0, 0];
  // embaralhado a partir do resolvido: sempre tem solução
  for (let k = 0; k < 6; k++) gearTurn(gears, Math.floor(r() * 4));
  if (gears.every((v) => v === 0)) gearTurn(gears, 1);
  (w.story ??= {}).obs = { panel: { x: (mid - 7) * T, y: (oy1 - 5) * T }, gears, cabinet: { x: mid + 4, y: oy1 + 1 } };
}
function gearTurn(G, i) { G[i] = (G[i] + 1) % 4; if (i > 0) G[i - 1] = (G[i - 1] + 3) % 4; if (i < 3) G[i + 1] = (G[i + 1] + 3) % 4; }

// ==================== ESTADO ====================
function storyState(g) {
  g.story ??= { step: 'start', parts: {}, delivered: {}, bear: 'locked', tiger: 'locked', spider: 'locked', obs: 'locked', talk: 0 };
  return g.story;
}
function pilotOf(g) { return (g.npcs || []).find((v) => v.pilot); }

// A piloto: uma moradora especial, sentada perto de uma fogueira na vila mais próxima do centro
function spawnPilot(g) {
  const w = g.world, spawns = w.npcSpawns || [];
  if (!spawns.length) return null;
  const mid = w.w / 2 * T, s = spawns.slice().sort((a, b) => Math.abs(a.x - mid) - Math.abs(b.x - mid))[0];
  const v = new Villager({ ...s, tribal: false, seed: 0.314159, minX: s.x / T, maxX: s.x / T });
  Object.assign(v, { pilot: true, name: PILOT_NAME, gift: null });
  Object.assign(v.look, { name: PILOT_NAME, skin: 2, hair: 3, hairStyle: 2, eyes: 1, jacket: 0, shirt: 1, pants: 0, boots: 2 });
  v.update = function (dt, world, p) {              // não anda: o tornozelo está torcido
    this.clock += dt;
    if (this.bubble && (this.bubble.t -= dt) <= 0) this.bubble = null;
    this.facing = p.cx < this.cx ? -1 : 1; this.vx = 0;
    this.applyGravity(dt); this.moveY(this.vy * dt, world); this.settleStep(dt);
  };
  (g.npcs ??= []).push(v);
  return v;
}

// Balão de fala solto no mundo (objetos, rádio); some sozinho
function storySay(g, x, y, name, text, t = 5.5) {
  (g.storyBubbles ??= []).push({ x, y, name, text, t });
  if (g.storyBubbles.length > 3) g.storyBubbles.shift();
}
function pilotSay(g, text, t = 7) {
  const v = pilotOf(g); if (!v) return;
  v.bubble = { text, t };
  playSfx('invOpen', v.cx, v.cy);
}

// ---------- O que a piloto diz ----------
const PILOT_INTRO = [
  'Você... você estava no voo! Achei que só eu tinha saído inteira daquela lata.',
  'Helena Duarte, fui eu que pilotei. Torci o tornozelo no pouso e não consigo andar longe.',
  'O rádio do avião não passa do horizonte. Mas um farol de rádio, montado aqui no alto, alcança os navios.',
  'Faltam quatro coisas: um gerador, uma antena, um transmissor e a frequência certa para chamar.',
  'Os moradores falam de um avião de carga que caiu na serra há anos, dentro da caverna de um urso enorme. Deve ter um gerador no porão. Comece por lá.',
];
const PILOT_HINTS = {
  gerador: 'O avião de carga fica atrás da caverna do urso, na serra. Cuidado com o bicho.',
  antena: 'Depois do bosque do tigre, na floresta, tem uma estação de rádio velha. A antena ainda deve estar lá.',
  transmissor: 'Uma expedição sumiu numa mina abandonada. Levavam um transmissor de campanha, dizem os moradores.',
  mapa: 'Sem a frequência certa é gritar no escuro. Um observatório enterrado no deserto guardava os canais dos navios.',
};
const PILOT_THANKS = {
  gerador: 'Um gerador! E ainda gira, olha só.',
  antena: 'A antena da estação! Vai lá no alto do mastro.',
  transmissor: 'O transmissor da expedição... tem até os nomes deles riscados. Vamos usar bem.',
  mapa: 'Os canais dos navios! Agora sei para onde chamar.',
};
const STORY_ORDER = ['gerador', 'antena', 'transmissor', 'mapa'];

function storyNextObjective(g) {
  const s = storyState(g);
  if (s.step !== 'parts') return;
  const need = STORY_PARTS.find((p) => !s.parts[p.id]);
  const carry = STORY_PARTS.some((p) => s.parts[p.id] && !s.delivered[p.id]);
  if (!need) g.objective = `Leve as peças para a ${PILOT_NAME} na vila.`;
  else g.objective = `Peça do farol: ${need.name.toLowerCase()}, ${need.where}.` + (carry ? ` Leve o que já achou para a ${PILOT_NAME}.` : '');
}

// Falar com a piloto (botão direito nela)
function talkToPilot(g) {
  const s = storyState(g);
  if (s.step === 'start' || s.step === 'smoke') { s.step = 'intro'; s.talk = 0; }
  if (s.step === 'intro') {
    pilotSay(g, PILOT_INTRO[s.talk]);
    s.talk++;
    if (s.talk >= PILOT_INTRO.length) { s.step = 'parts'; storyNextObjective(g); }
    else g.objective = `Converse com a ${PILOT_NAME} (botão direito nela).`;
    return;
  }
  if (s.step === 'parts') {
    const fresh = STORY_PARTS.filter((p) => s.parts[p.id] && !s.delivered[p.id]);
    if (fresh.length) {
      for (const p of fresh) s.delivered[p.id] = true;
      const all = STORY_PARTS.every((p) => s.delivered[p.id]);
      const thanks = fresh.map((p) => PILOT_THANKS[p.id]).join(' ');
      const next = STORY_PARTS.find((p) => !s.delivered[p.id]);
      pilotSay(g, thanks + (all ? ' É tudo! Me dá uma mão aqui... pronto, o farol está de pé. Liga a chave quando quiser.' : ' ' + PILOT_HINTS[next.id]), 9);
      playSfx('craft');
      if (all) { s.step = 'beacon'; g.objective = `Ligue o farol de rádio ao lado da ${PILOT_NAME} (botão direito nele).`; }
      else storyNextObjective(g);
      return;
    }
    const need = STORY_PARTS.find((p) => !s.parts[p.id]);
    pilotSay(g, need ? PILOT_HINTS[need.id] : 'Traz as peças para cá, eu monto.');
    return;
  }
  if (s.step === 'beacon') pilotSay(g, 'O farol está pronto. É só ligar a chave ali do lado.');
  else if (s.step === 'calling') pilotSay(g, 'Shh, escuta o rádio!');
  else pilotSay(g, 'Vai para a praia leste! Eu vou logo atrás de você.');
}

// ==================== ENIGMAS ====================
// ---------- 1. Porão do avião: empurrar caixas até as duas placas ----------
function bearPlatesPressed(w, b) { return b.plates.map((p) => w.getTile(p.x, p.y - 1) === TILE.CRATE); }
function updateCratePush(g, dt) {
  const s = storyState(g), b = g.world.story?.bear, p = g.player, w = g.world;
  if (!b || s.bear !== 'open') return;
  if (p.x + p.w < b.hold.x0 - T || p.x > b.hold.x1 + T || p.y > b.hold.y1 || p.y + p.h < b.hold.y0) return;
  const dir = (input.down('KeyD') || input.down('ArrowRight') ? 1 : 0) - (input.down('KeyA') || input.down('ArrowLeft') ? 1 : 0);
  const feet = Math.floor((p.y + p.h - 2) / T), front = Math.floor((dir > 0 ? p.x + p.w + 1 : p.x - 1) / T);
  if (!dir || !p.onGround || w.getTile(front, feet) !== TILE.CRATE) { g.pushT = 0; return; }
  g.pushT = (g.pushT || 0) + dt;
  if (g.pushT < 0.22) return;
  g.pushT = 0;
  storyPushCrate(g, front, feet, dir);
}
// Empurra a caixa em (x, y) um bloco para dir; ela cai se ficar sem chão. Devolve se moveu.
function storyPushCrate(g, x, y, dir) {
  const s = storyState(g), b = g.world.story.bear, w = g.world, to = x + dir;
  if (w.getTile(to, y) !== TILE.AIR || w.getTile(x, y - 1) === TILE.CRATE) { playSfx('hit', x * T, y * T, { tile: TILE.PLANKS, vol: 0.5 }); return false; }
  w.setTile(x, y, TILE.AIR);
  let yy = y;
  while (yy + 1 < w.h && w.getTile(to, yy + 1) === TILE.AIR) yy++;           // cai da prateleira
  w.setTile(to, yy, TILE.CRATE);
  playSfx(yy > y ? 'break' : 'place', to * T, yy * T, { tile: TILE.PLANKS, vol: 0.6 });
  if (yy > y) g.shake = Math.max(g.shake, 2);
  if (s.bear === 'open' && bearPlatesPressed(w, b).every(Boolean)) {
    s.bear = 'solved';
    for (const [dx, dy] of b.door) w.setTile(dx, dy, TILE.AIR);
    w.lightDirty = true; g.shake = Math.max(g.shake, 4);
    playSfx('door', b.door[0][0] * T, b.door[0][1] * T);
    storySay(g, b.door[0][0] * T + 8, b.door[0][1] * T, 'Porão', 'CLANC! As duas placas afundam e a porta do porão destrava.');
  }
  return true;
}
function resetCrates(g) {
  const b = g.world.story.bear, w = g.world;
  const x0 = Math.floor(b.hold.x0 / T), x1 = Math.floor(b.hold.x1 / T);
  for (let y = Math.floor(b.hold.y0 / T); y < Math.floor(b.hold.y1 / T); y++) for (let x = x0; x <= x1; x++) if (w.getTile(x, y) === TILE.CRATE) w.setTile(x, y, TILE.AIR);
  for (const c of b.crates) w.setTile(c.x, c.y, TILE.CRATE);
  playSfx('break', b.lever.x * T, b.lever.y * T, { tile: TILE.PLANKS, vol: 0.5 });
  storySay(g, (b.lever.x + 0.5) * T, b.lever.y * T, 'Guincho', 'O guincho range e arrasta as caixas de volta para o lugar.');
}

// ---------- 2. Espelhos: o raio de sol da lente até a fechadura ----------
function sunUp(g) { const h = hourOf(g.time); return h >= 7 && h <= 17.5; }
// Traça o raio de célula em célula. Devolve o caminho e se chegou na fechadura.
function traceBeam(g) {
  const t = g.world.story?.tiger, w = g.world;
  if (!t) return { pts: [], hit: false };
  let x = t.lens.x, y = t.lens.y, dx = 1, dy = 0;
  const pts = [[x, y]];
  for (let n = 0; n < 40; n++) {
    x += dx; y += dy;
    if (x === t.lock.x && y === t.lock.y) { pts.push([x, y]); return { pts, hit: true }; }
    const m = t.mirrors.find((q) => q.x === x && q.y === y);
    if (m) {
      pts.push([x, y]);
      if (m.state === '/') [dx, dy] = [-dy, -dx];          // direita→cima, cima→direita
      else if (m.state === '\\') [dx, dy] = [dy, dx];      // direita→baixo, baixo→direita
      continue;
    }
    if (w.isSolid(x, y)) break;
  }
  pts.push([x, y]);
  return { pts, hit: false };
}
function rotateMirror(g, m) {
  const s = storyState(g), t = g.world.story.tiger;
  if (s.tiger === 'locked') { storySay(g, (m.x + 0.5) * T, m.y * T, 'Espelho', 'Um espelho velho, emperrado de terra.'); return; }
  if (s.tiger !== 'open') return;
  m.state = { '/': '\\', '\\': '|', '|': '/' }[m.state];
  playSfx('select', m.x * T, m.y * T);
  checkBeam(g);
}
function checkBeam(g) {
  const s = storyState(g), t = g.world.story.tiger;
  if (s.tiger !== 'open' || !sunUp(g) || !traceBeam(g).hit) return;
  s.tiger = 'solved';
  g.shake = Math.max(g.shake, 3);
  playSfx('door', t.lock.x * T, t.lock.y * T);
  storySay(g, (t.lock.x + 0.5) * T, t.lock.y * T, 'Estação de rádio', 'A luz acende a célula da fechadura e o armário da estação abre com um estalo.');
}

// ---------- 3. Gaiola: cortar os fios sem jogá-la no poço ----------
// A gaiola fica na média dos ganchos que ainda a seguram. Se, depois de um corte, ela parar
// sobre o poço, o que sobrou não aguenta o tranco e ela despenca.
function cageX(sp) {
  const on = sp.threads.filter((t) => !t.cut);
  return on.length ? on.reduce((a, t) => a + t.ax, 0) / on.length : sp.lastX;
}
const overPit = (sp, x) => Math.abs(x - sp.pitX) <= 1.6;
function cutThread(g, th) {
  const s = storyState(g), sp = g.world.story.spider;
  if (s.spider === 'locked') { storySay(g, (th.ax + 0.5) * T, (sp.ceil + 3) * T, 'Fio de seda', 'Duro como aço. Enquanto a Matriarca viver, ninguém corta isso.'); return; }
  if (s.spider !== 'open' || th.cut) return;
  th.cut = true;
  playSfx('bowRelease', th.ax * T, (sp.ceil + 2) * T);
  const left = sp.threads.filter((t) => !t.cut).length, x = cageX(sp), cy = (sp.ceil + 5) * T;
  sp.swing = 1;
  if (left && overPit(sp, x)) {
    for (const t of sp.threads) t.cut = true;
    s.spider = 'fell'; sp.fallX = x; sp.fallT = 0;
    storySay(g, x * T, cy, 'Gaiola', 'A gaiola balança para cima do poço, o fio não aguenta o tranco e ela despenca lá embaixo!');
    return;
  }
  if (!left) {
    sp.fallX = sp.lastX; sp.fallT = 0;
    if (overPit(sp, sp.lastX)) { s.spider = 'fell'; storySay(g, sp.lastX * T, cy, 'Gaiola', 'A gaiola cai direto no poço!'); }
    else { s.spider = 'landed'; g.shake = Math.max(g.shake, 3); storySay(g, sp.lastX * T, cy, 'Gaiola', 'A gaiola bate no chão e a portinhola abre. O transmissor está inteiro!'); }
    return;
  }
  sp.lastX = x;
}
function winchReset(g) {
  const s = storyState(g), sp = g.world.story.spider;
  if (s.spider !== 'fell') { storySay(g, (sp.winch.x + 0.5) * T, sp.winch.y * T, 'Guincho da expedição', 'Um guincho com corda enrolada, para puxar coisas do poço.'); return; }
  for (const t of sp.threads) t.cut = false;
  sp.lastX = cageX(sp); s.spider = 'open'; sp.swing = 0;
  playSfx('door', sp.winch.x * T, sp.winch.y * T);
  storySay(g, (sp.winch.x + 0.5) * T, sp.winch.y * T, 'Guincho da expedição', 'Você puxa a gaiola do poço e a pendura de novo nos três ganchos.');
}

// ---------- 4. Engrenagens acopladas ----------
function turnGear(g, i) {
  const s = storyState(g), ob = g.world.story.obs;
  if (s.obs === 'locked') { storySay(g, ob.panel.x + 48, ob.panel.y, 'Painel', 'Emperrado de areia. O tremor do besouro trava tudo aqui.'); return; }
  if (s.obs !== 'open') return;
  gearTurn(ob.gears, i);
  playSfx('select', ob.panel.x, ob.panel.y);
  if (ob.gears.every((v) => v === 0)) {
    s.obs = 'solved';
    g.shake = Math.max(g.shake, 3);
    playSfx('door', ob.cabinet.x * T, ob.cabinet.y * T);
    storySay(g, (ob.cabinet.x + 0.5) * T, (ob.cabinet.y - 2) * T, 'Observatório', 'As quatro marcas apontam para cima. A gaveta de mapas destrava.');
  }
}

// ---------- Pegar as peças ----------
function takePart(g, id, x, y) {
  const s = storyState(g);
  if (s.parts[id]) return;
  s.parts[id] = true;
  const part = STORY_PARTS.find((p) => p.id === id);
  playSfx('pickup', x, y);
  for (let i = 0; i < 14; i++) g.particles.push({ x, y, vx: (Math.random() - 0.5) * 120, vy: -40 - Math.random() * 100, life: 0.6, maxLife: 0.6, color: 'rgb(255,220,120)', gravity: 200 });
  storySay(g, x, y, 'Peça do farol', `${part.name}! Leve para a ${PILOT_NAME}.`);
  storyNextObjective(g);
}

// Cada chefe que cai abre o caminho da sua peça (chamado pelos fins de luta)
function storyBossFell(g, kind) {
  const s = storyState(g), w = g.world, st = w.story || {};
  const later = (fn) => setTimeout(fn, 2600);
  if (kind === 'bear' && s.bear === 'locked') {
    s.bear = 'open';
    const b = st.bear;
    for (const [x, y] of b?.passage || []) w.setTile(x, y, TILE.AIR);
    w.lightDirty = true; g.shake = Math.max(g.shake, 5);
    if (b) later(() => storySay(g, b.passage[0][0] * T, b.passage[0][1] * T, 'Covil', 'A parede do fundo desmorona. Atrás dela... a fuselagem de um avião!'));
  } else if (kind === 'tiger' && s.tiger === 'locked') {
    s.tiger = 'open';
    const t = st.tiger, A = w.tigerArena;
    if (t) for (const x of t.road) {
      const inArena = A && x >= A.x0 && x <= A.x1;
      if(inArena&&A.habitat)continue;
      let y = inArena ? t.arenaFloor : w.surface[x];
      if (!inArena) while (y < w.h - 1 && !w.isSolid(x, y)) y++;
      if (w.isSolid(x, y) && TILE_DEFS[w.getTile(x, y)].hardness !== Infinity) w.setTile(x, y, TILE.ANCIENT_ROAD);
    }
    w.lightDirty = true;
    if (t && A) later(() => storySay(g, A.mid * T, t.arenaFloor * T - 24, A.habitat?'Bosque do tigre':'Arena', A.habitat?'Entre as raízes, uma estrada antiga segue até uma torre de rádio enferrujada.':'O chão racha em lajes: era uma estrada. Ela segue até uma torre de rádio enferrujada.'));
  } else if (kind === 'fiandeira' && s.spider === 'locked') {
    s.spider = 'open';
    const sp = st.spider;
    if (sp) { sp.lastX = cageX(sp); later(() => storySay(g, sp.pitX * T, (sp.ceil + 4) * T, 'Galeria', 'Pendurada sobre o poço, uma gaiola com uma caixa de rádio. Os fios agora cedem.')); }
  } else if (kind === 'cascoferro' && s.obs === 'locked') {
    s.obs = 'open';
    const ob = st.obs;
    if (ob) later(() => storySay(g, ob.panel.x + 48, ob.panel.y, 'Observatório', 'Na parede, quatro engrenagens travam uma gaveta de mapas.'));
  }
  storyNextObjective(g);
}

// ---------- Farol e resgate ----------
function beaconSpot(g) { const v = pilotOf(g); return v ? { x: v.cx + 3 * T, y: v.y + v.h } : null; }
function useBeacon(g) {
  const s = storyState(g);
  if (s.step !== 'beacon') return;
  s.step = 'calling'; s.callT = 0;
  playSfx('door');
  g.objective = 'Chamando o resgate...';
}
const RADIO_CALL = [
  [0.3, PILOT_NAME, 'Mayday, mayday. Aqui é a tripulação do voo que caiu na ilha sem nome. Temos sobreviventes.'],
  [7, 'Rádio', '...chiado... Recebido, ilha. Estamos vendo o sinal do farol... chiado...'],
  [13, 'Rádio', 'Um barco de pesca está perto. Chega à praia leste. Aguentem firme.'],
  [19, PILOT_NAME, 'Eles vêm! Vai para a praia leste. Eu vou logo atrás de você.'],
];
function updateBeacon(g, dt) {
  const s = storyState(g);
  if (s.step !== 'calling') return;
  const b = beaconSpot(g); if (!b) return;
  const before = s.callT;
  s.callT += dt;
  for (const [t, who, text] of RADIO_CALL) if (before < t && s.callT >= t) {
    if (who === PILOT_NAME) pilotSay(g, text, 6.5); else storySay(g, b.x, b.y - 4 * T, who, text, 6.5);
  }
  if (s.callT >= 21) { s.step = 'boat'; spawnRescueBoat(g); g.objective = 'Vá até a praia leste: o barco de resgate chegou.'; }
}
function spawnRescueBoat(g) {
  const w = g.world;
  const x = clamp(Math.floor((w.oceanStart ?? w.w - 60) + 18), 8, w.w - 8);
  let y = w.skyFloor ? w.skyFloor[x] + 1 : 0; // por baixo das ilhas do céu
  while (y < w.h - 1 && !w.hasWater(x, y) && !w.isSolid(x, y)) y++;
  storyState(g).boat = { x: x * T, y: y * T };
  toast('Um barco de pesca aparece no horizonte, a leste.');
}
function updateBoat(g) {
  const s = storyState(g), bt = s.boat;
  if (!bt || s.step !== 'boat') return;
  const p = g.player;
  if (Math.abs(p.cx - bt.x) < 3 * T && Math.abs(p.y + p.h - bt.y) < 4 * T) { s.step = 'rescued'; StoryUI.openEnding(g); }
}

// ==================== ATUALIZAÇÃO (js/game.js) ====================
function updateStory(g, dt) {
  const s = storyState(g);
  if (g.intro?.active) return;
  if (!pilotOf(g) && g.world?.npcSpawns?.length) spawnPilot(g);
  // Depois dos destroços (ou de um tempo), a fumaça da fogueira dela chama atenção
  if (s.step === 'start' && (/^(Todos os destroços|Destroços desmontados)/.test(g.objective || '') || (g.clock || 0) > 300)) {
    const v = pilotOf(g);
    if (v) { s.step = 'smoke'; g.objective = `Tem fumaça de fogueira subindo ${v.cx > g.player.cx ? 'a leste' : 'a oeste'}. Pode haver mais sobreviventes.`; }
  }
  updateCratePush(g, dt);
  if (s.tiger === 'open' && (g.beamCheckT = (g.beamCheckT || 0) - dt) <= 0) { g.beamCheckT = 0.5; checkBeam(g); }
  const sp = g.world.story?.spider;
  if (sp) { sp.swing = Math.max(0, (sp.swing || 0) - dt * 0.8); if (s.spider === 'fell' || s.spider === 'landed') sp.fallT = (sp.fallT || 0) + dt; }
  updateBeacon(g, dt);
  updateBoat(g);
  const list = g.storyBubbles || [];
  for (let i = list.length - 1; i >= 0; i--) if ((list[i].t -= dt) <= 0) list.splice(i, 1);
}

// ==================== INTERAÇÃO (botão direito; js/game.js) ====================
function storyInteract(g, m, rightPressed) {
  if (!rightPressed) return false;
  const p = g.player, st = g.world.story || {}, s = storyState(g);
  const reach = (x, y, r = 6) => Math.hypot(x - p.cx, y - p.cy) < r * T;
  const hitBox = (x, y, rx = 0.8, ry = 0.8) => Math.abs(m.x - x) <= rx * T && Math.abs(m.y - y) <= ry * T && reach(x, y);
  const v = pilotOf(g);
  if (v && v.containsPoint(m.x, m.y, 4)) {
    if (!reach(v.cx, v.cy, 5)) { toast('Chegue mais perto para conversar.'); return true; }
    talkToPilot(g); return true;
  }
  const bs = beaconSpot(g);
  if (bs && s.step === 'beacon' && hitBox(bs.x, bs.y - 2 * T, 1.2, 2.5)) { useBeacon(g); return true; }
  // 1. Porão
  const b = st.bear;
  if (b && s.bear !== 'locked') {
    if (hitBox((b.lever.x + 0.5) * T, (b.lever.y + 0.5) * T)) { if (s.bear === 'open') resetCrates(g); return true; }
    if (hitBox((b.skeleton.x + 0.5) * T, (b.skeleton.y + 0.5) * T)) { storySay(g, (b.skeleton.x + 0.5) * T, b.skeleton.y * T, 'Crachá', '"Carga Aérea Norte, 1998." Ele não teve a mesma sorte que você.'); return true; }
    if (s.bear === 'solved' && !s.parts.gerador && hitBox((b.generator.x + 0.5) * T, (b.generator.y + 0.5) * T, 1.2, 1.2)) { takePart(g, 'gerador', (b.generator.x + 0.5) * T, b.generator.y * T); return true; }
  }
  // 2. Estação de rádio
  const t = st.tiger;
  if (t) {
    for (const mi of t.mirrors) if (hitBox((mi.x + 0.5) * T, (mi.y + 0.5) * T)) { rotateMirror(g, mi); return true; }
    if (hitBox((t.lens.x + 0.5) * T, (t.lens.y + 0.5) * T)) {
      storySay(g, (t.lens.x + 0.5) * T, t.lens.y * T, 'Lente', s.tiger === 'locked' ? 'Uma lente grossa, coberta de poeira.' : sunUp(g) ? 'A lente junta o sol num raio fino.' : 'Sem sol a lente não acende. Volte de dia.');
      return true;
    }
    if (hitBox((t.lock.x + 0.5) * T, (t.lock.y + 0.5) * T, 1.2, 1.2)) {
      if (s.tiger === 'solved' && !s.parts.antena) takePart(g, 'antena', (t.lock.x + 0.5) * T, t.lock.y * T);
      else storySay(g, (t.lock.x + 0.5) * T, t.lock.y * T, 'Estação costeira 7', s.parts.antena ? 'O armário está vazio.' : 'Um armário com fechadura de célula de luz. Gravado na porta: "abre com o sol".');
      return true;
    }
  }
  // 3. Gaiola
  const sp = st.spider;
  if (sp) {
    if (s.spider === 'landed' && !s.parts.transmissor && hitBox((sp.fallX + 0.5) * T, (sp.floor - 0.5) * T, 1.5, 1.5)) { takePart(g, 'transmissor', (sp.fallX + 0.5) * T, (sp.floor - 1) * T); return true; }
    if (hitBox((sp.winch.x + 0.5) * T, (sp.winch.y + 0.5) * T)) { winchReset(g); return true; }
    if (s.spider === 'open' || s.spider === 'locked') {
      const cx = (cageX(sp) ?? sp.pitX) + 0.5, cy = sp.ceil + 5;
      for (const th of sp.threads) {
        if (th.cut) continue;
        // distância do mouse ao fio (do gancho no teto até a gaiola)
        const ax = (th.ax + 0.5) * T, ay = sp.ceil * T, bx = cx * T, by = cy * T - 6;
        const L2 = (bx - ax) ** 2 + (by - ay) ** 2, u = clamp(((m.x - ax) * (bx - ax) + (m.y - ay) * (by - ay)) / L2, 0, 1);
        if (Math.hypot(m.x - (ax + (bx - ax) * u), m.y - (ay + (by - ay) * u)) < 6 && reach(m.x, m.y, 8)) { cutThread(g, th); return true; }
      }
    }
  }
  // 4. Engrenagens
  const ob = st.obs;
  if (ob) {
    for (let i = 0; i < 4; i++) if (hitBox(ob.panel.x + 18 + i * 20, ob.panel.y + 16, 0.7, 0.9)) { turnGear(g, i); return true; }
    if (hitBox((ob.cabinet.x + 0.5) * T, (ob.cabinet.y - 1) * T, 0.8, 1.2)) {
      if (s.obs === 'solved' && !s.parts.mapa) takePart(g, 'mapa', (ob.cabinet.x + 0.5) * T, (ob.cabinet.y - 1) * T);
      else storySay(g, (ob.cabinet.x + 0.5) * T, (ob.cabinet.y - 2) * T, 'Gaveta de mapas', s.parts.mapa ? 'Vazia.' : 'Trancada. Um eixo liga a gaveta às engrenagens da parede.');
      return true;
    }
  }
  return false;
}

// ==================== DESENHO ====================
// Antes da luz: fumaça, fogueira, farol, barco, avião, estação, gaiola e painel
function drawStoryWorld(ctx, g) {
  const st = g.world.story || {}, s = storyState(g), p = g.player, t = g.clock || 0;
  const close = (x) => Math.abs(x - p.cx) < 70 * T;
  const v = pilotOf(g);
  // Fumaça da fogueira dela, visível de longe, até vocês se encontrarem
  if (v && (s.step === 'start' || s.step === 'smoke') && Math.abs(v.cx - p.cx) < 150 * T) {
    for (let i = 0; i < 28; i++) {
      const k = (t * 0.1 + i / 28) % 1, x = v.cx - 20 + Math.sin(k * 7 + i) * (3 + k * 14) + k * 26, y = v.y + v.h - 8 - k * 34 * T;
      const r = Math.round(3 + k * 11);
      ctx.globalAlpha = (1 - k) * 0.5; ctx.fillStyle = i % 3 ? '#8a8a88' : '#b8b6b0';
      ctx.fillRect(Math.round(x - r), Math.round(y - r), r * 2, r * 2);
    }
    ctx.globalAlpha = 1;
  }
  if (v && close(v.cx)) {                                   // fogueira
    const fx = Math.round(v.cx - 20), fy = Math.round(v.y + v.h), f = Math.sin(t * 12) > 0 ? 1 : 0;
    ctx.fillStyle = '#4a3020'; ctx.fillRect(fx - 7, fy - 2, 14, 2); ctx.fillRect(fx - 5, fy - 3, 3, 1); ctx.fillRect(fx + 2, fy - 3, 3, 1);
    ctx.fillStyle = '#ff7a20'; ctx.fillRect(fx - 4, fy - 8 - f, 8, 6);
    ctx.fillStyle = '#ffb040'; ctx.fillRect(fx - 2, fy - 10 + f, 4, 7);
    ctx.fillStyle = '#ffe890'; ctx.fillRect(fx - 1, fy - 6, 2, 3);
  }
  // Farol montado ao lado da piloto
  const bs = beaconSpot(g);
  if (bs && ['beacon', 'interference', 'core', 'calling', 'boat', 'rescued'].includes(s.step) && close(bs.x)) {
    const x = Math.round(bs.x), y = Math.round(bs.y);
    ctx.fillStyle = '#3a3e44';
    for (let k = 0; k < 7; k++) { const yy = y - 14 - k * 8; ctx.fillRect(x - 3, yy, 1, 8); ctx.fillRect(x + 3, yy, 1, 8); ctx.fillRect(x - 3, yy, 7, 1); ctx.fillRect(x - 2 + (k % 2) * 4, yy + 4, 1, 1); }
    ctx.fillStyle = '#b0b8c0'; ctx.fillRect(x - 7, y - 64, 15, 2); ctx.fillRect(x - 4, y - 70, 9, 2); ctx.fillRect(x, y - 76, 1, 12);
    ctx.fillStyle = '#2a2a24'; ctx.fillRect(x - 10, y - 14, 20, 14);
    ctx.fillStyle = '#d8a830'; ctx.fillRect(x - 9, y - 13, 9, 12);
    ctx.fillStyle = '#5a6a54'; ctx.fillRect(x + 1, y - 13, 8, 12);
    ctx.fillStyle = s.step === 'beacon' ? '#602018' : '#40e060'; ctx.fillRect(x + 3, y - 11, 2, 2);
    const on = s.step !== 'beacon' && Math.sin(t * 6) > 0;
    ctx.fillStyle = on ? '#ff4030' : '#602018'; ctx.fillRect(x - 1, y - 79, 3, 3);
    if (s.step === 'beacon') { ctx.fillStyle = '#c8402c'; ctx.fillRect(x + 11, y - 12, 2, 8); ctx.fillRect(x + 10, y - 13, 4, 2); } // a chave
  }
  // Barco de resgate balançando na água
  const bt = s.boat;
  if (bt && close(bt.x)) {
    const x = Math.round(bt.x), y = Math.round(bt.y + Math.sin(t * 1.6) * 1.5);
    ctx.fillStyle = '#2a2420'; ctx.fillRect(x - 32, y - 6, 64, 8); ctx.fillRect(x - 27, y + 2, 54, 3);
    ctx.fillStyle = '#c8402c'; ctx.fillRect(x - 31, y - 5, 62, 4);
    ctx.fillStyle = '#e8e2d0'; ctx.fillRect(x - 14, y - 19, 22, 13);
    ctx.fillStyle = '#6a9ab8'; ctx.fillRect(x - 11, y - 16, 5, 4); ctx.fillRect(x - 3, y - 16, 5, 4);
    ctx.fillStyle = '#4a3a2a'; ctx.fillRect(x + 14, y - 34, 2, 28);
    ctx.fillStyle = '#e8e2d0'; ctx.fillRect(x + 16, y - 32, 11, 15);
  }
  // 1. Porão do avião: casco curvo ao fundo, janelinhas, esqueleto, guincho e gerador
  const b = st.bear;
  if (b && s.bear !== 'locked' && close(b.hold.x0)) {
    const { x0, x1, y0, y1 } = b.hold;
    ctx.fillStyle = 'rgba(150,158,150,0.5)';
    for (let x = x0 + 6; x < x1; x += 12) ctx.fillRect(x, y0, 2, y1 - y0);        // cavernas do casco
    ctx.fillStyle = 'rgba(110,116,110,0.6)'; ctx.fillRect(x0, y0 + 2, x1 - x0, 3); ctx.fillRect(x0, y1 - 22, x1 - x0, 2);
    for (let x = x0 + 20; x < x1 - 20; x += 36) { ctx.fillStyle = '#20262a'; ctx.fillRect(x, y0 + 11, 9, 8); ctx.fillStyle = '#4a5a64'; ctx.fillRect(x + 1, y0 + 12, 7, 6); }
    const sx = b.skeleton.x * T, sy = b.skeleton.y * T;
    ctx.fillStyle = '#d8d0b8'; ctx.fillRect(sx + 3, sy + 10, 9, 2); ctx.fillRect(sx + 2, sy + 6, 4, 4); ctx.fillRect(sx + 8, sy + 12, 7, 1); ctx.fillRect(sx + 5, sy + 13, 2, 3);
    ctx.fillStyle = '#20180e'; ctx.fillRect(sx + 3, sy + 7, 1, 1);
    ctx.fillStyle = '#4a70a0'; ctx.fillRect(sx + 7, sy + 9, 3, 2);                // o crachá
    if (!s.parts.gerador) {
      const gx = b.generator.x * T, gy = b.generator.y * T;
      ctx.fillStyle = '#2a2a24'; ctx.fillRect(gx, gy + 3, 16, 13);
      ctx.fillStyle = '#d8a830'; ctx.fillRect(gx + 1, gy + 4, 14, 11);
      ctx.fillStyle = '#6a5018'; ctx.fillRect(gx + 3, gy + 7, 10, 1); ctx.fillRect(gx + 3, gy + 10, 10, 1);
      ctx.fillStyle = '#e0e0d8'; ctx.fillRect(gx + 11, gy + 5, 3, 2);
    }
    const lx = b.lever.x * T, ly = b.lever.y * T;
    ctx.fillStyle = '#3a3a36'; ctx.fillRect(lx + 3, ly + 8, 10, 8);
    ctx.fillStyle = '#8a8a80'; ctx.fillRect(lx + 7, ly + 1, 2, 8); ctx.fillStyle = '#c8402c'; ctx.fillRect(lx + 6, ly, 4, 3);
  }
  // 2. Estação de rádio: torre treliçada, viga, lente, espelhos e fechadura
  const tg = st.tiger;
  if (tg && close(tg.lens.x * T)) {
    const tx = tg.tower.x * T, tf = tg.tower.floor * T;
    ctx.fillStyle = '#6a5a48';
    for (let k = 0; k < 11; k++) { const y = tf - 16 - k * 16, n = k * 0.45; ctx.fillRect(Math.round(tx - 7 + n), y, 1, 16); ctx.fillRect(Math.round(tx + 7 - n), y, 1, 16); ctx.fillRect(Math.round(tx - 7 + n), y, Math.round(15 - 2 * n), 1); }
    ctx.fillRect(tx, tf - 206, 1, 30);
    ctx.fillStyle = '#3a3e44'; ctx.fillRect(tx - 10, tf - 16, 20, 16); ctx.fillStyle = '#5a6068'; ctx.fillRect(tx - 9, tf - 15, 18, 5);
    if (!s.parts.antena) { ctx.fillStyle = '#b0b8c0'; ctx.fillRect(tx - 6, tf - 192, 13, 2); ctx.fillRect(tx - 4, tf - 198, 9, 2); }
    const bm = tg.beam;                                    // viga de madeira dos espelhos altos
    ctx.fillStyle = '#5a4028'; ctx.fillRect(bm.x0 * T, bm.y * T + 10, (bm.x1 - bm.x0 + 1) * T, 4);
    ctx.fillRect(bm.x0 * T, bm.y * T + 10, 3, tg.tower.floor * T - bm.y * T - 10);
    const lx = tg.lens.x * T, ly = tg.lens.y * T;
    ctx.fillStyle = '#4a3a24'; ctx.fillRect(lx + 2, ly + 8, 12, 8);
    ctx.fillStyle = sunUp(g) && s.tiger !== 'locked' ? '#ffe080' : '#8a8060'; ctx.beginPath(); ctx.arc(lx + 8, ly + 7, 5, 0, Math.PI * 2); ctx.fill();
    for (const mi of tg.mirrors) {
      const mx = mi.x * T, my = mi.y * T;
      if (mi.y !== tg.lens.y) { ctx.fillStyle = '#5a4028'; ctx.fillRect(mx + 7, bm.y * T + 12, 2, my - bm.y * T - 10); }
      ctx.fillStyle = '#2a2018'; ctx.beginPath(); ctx.arc(mx + 8, my + 8, 3, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = s.tiger === 'locked' ? '#8a8a80' : '#d8e4ec'; ctx.lineWidth = 3;
      ctx.beginPath();
      if (mi.state === '/') { ctx.moveTo(mx + 2, my + 14); ctx.lineTo(mx + 14, my + 2); }
      else if (mi.state === '\\') { ctx.moveTo(mx + 2, my + 2); ctx.lineTo(mx + 14, my + 14); }
      else { ctx.moveTo(mx + 8, my + 1); ctx.lineTo(mx + 8, my + 15); }
      ctx.stroke();
    }
    const kx = tg.lock.x * T, ky = tg.lock.y * T;
    ctx.fillStyle = '#2a2e30'; ctx.fillRect(kx, ky, 16, 16);
    ctx.fillStyle = s.tiger === 'solved' ? '#4a7a40' : '#6a7078'; ctx.fillRect(kx + 1, ky + 1, 14, 14);
    ctx.fillStyle = s.tiger === 'solved' ? '#a0e080' : '#303438'; ctx.fillRect(kx + 5, ky + 5, 6, 6);
    if (s.tiger === 'solved' && !s.parts.antena) { ctx.fillStyle = '#d0d8e0'; ctx.fillRect(kx + 3, ky + 3, 10, 1); ctx.fillRect(kx + 7, ky + 3, 1, 10); }
  }
  // 3. Gaiola pendurada sobre o poço
  const sp = st.spider;
  if (sp && close(sp.pitX * T)) {
    let cx, cy;
    const fall = (k) => Math.min(k, sp.ceil + 5 + (sp.fallT || 0) ** 2 * 30);
    if (s.spider === 'fell') { cx = sp.fallX + 0.5; cy = fall(sp.floor + 3.5); }
    else if (s.spider === 'landed') { cx = sp.fallX + 0.5; cy = fall(sp.floor - 0.5); }
    else { cx = (cageX(sp) ?? sp.pitX) + 0.5 + Math.sin(t * 3) * (sp.swing || 0) * 0.6; cy = sp.ceil + 5; }
    if (s.spider === 'open' || s.spider === 'locked') for (const th of sp.threads) {
      if (th.cut) continue;
      ctx.strokeStyle = 'rgba(236,232,246,0.9)'; ctx.lineWidth = s.spider === 'locked' ? 2 : 1;
      ctx.beginPath(); ctx.moveTo((th.ax + 0.5) * T, sp.ceil * T); ctx.lineTo(cx * T, cy * T - 7); ctx.stroke();
      ctx.fillStyle = '#6a6a66'; ctx.fillRect(th.ax * T + 5, sp.ceil * T, 6, 3);
    }
    const x = Math.round(cx * T), y = Math.round(cy * T);
    if (!(s.spider === 'landed' && s.parts.transmissor)) {
      ctx.fillStyle = '#5a6a54'; ctx.fillRect(x - 5, y - 1, 10, 7);
      ctx.fillStyle = '#c8a040'; ctx.fillRect(x - 3, y + 1, 2, 2); ctx.fillStyle = '#e04030'; ctx.fillRect(x + 2, y + 1, 1, 1);
    }
    ctx.fillStyle = '#8a8a86';
    for (let k = -7; k <= 7; k += 3.5) ctx.fillRect(Math.round(x + k), y - 7, 1, 15);
    ctx.fillRect(x - 7, y - 7, 15, 1); ctx.fillRect(x - 7, y + 7, 15, 1);
    if (s.spider === 'landed' && (sp.fallT || 0) > 0.6) { ctx.fillStyle = '#1a1a1a'; ctx.fillRect(x + 4, y - 6, 4, 13); } // portinhola aberta
    const wx = sp.winch.x * T, wy = sp.winch.y * T;
    ctx.fillStyle = '#4a3a24'; ctx.fillRect(wx + 2, wy + 9, 12, 7);
    ctx.fillStyle = '#8a7a5a'; ctx.beginPath(); ctx.arc(wx + 8, wy + 8, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c8b890'; ctx.fillRect(wx + 7, wy + 3, 2, 10);
  }
  // 4. Painel de engrenagens e gaveta de mapas
  const ob = st.obs;
  if (ob && close(ob.panel.x)) {
    const { x, y } = ob.panel;
    ctx.fillStyle = '#3a2a18'; ctx.fillRect(x - 2, y - 2, 100, 36);
    ctx.fillStyle = '#6a5030'; ctx.fillRect(x, y, 96, 32);
    ob.gears.forEach((r, i) => {
      const gx = x + 18 + i * 20, gy = y + 16, rot = r * Math.PI / 2 + (i % 2) * Math.PI / 8;
      ctx.fillStyle = '#a8864a';
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + rot; ctx.fillRect(Math.round(gx + Math.cos(a) * 8) - 2, Math.round(gy + Math.sin(a) * 8) - 2, 4, 4); }
      ctx.beginPath(); ctx.arc(gx, gy, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#4a3418'; ctx.beginPath(); ctx.arc(gx, gy, 2, 0, Math.PI * 2); ctx.fill();
      const a = -Math.PI / 2 + r * Math.PI / 2;           // a marca aponta para cima quando está certa
      ctx.fillStyle = r === 0 ? '#90e070' : '#e04a30'; ctx.fillRect(Math.round(gx + Math.cos(a) * 5) - 1, Math.round(gy + Math.sin(a) * 5) - 1, 3, 3);
    });
    ctx.fillStyle = '#e0c080'; ctx.fillRect(x + 3, y + 1, 90, 1);             // seta "para cima" pintada
    const cx = ob.cabinet.x * T, cy = (ob.cabinet.y - 2) * T;
    ctx.fillStyle = '#3a2a18'; ctx.fillRect(cx - 1, cy - 1, 18, 33);
    ctx.fillStyle = '#7a5a34'; ctx.fillRect(cx, cy, 16, 32);
    ctx.fillStyle = '#5a4024'; ctx.fillRect(cx + 2, cy + 3, 12, 7); ctx.fillRect(cx + 2, cy + 22, 12, 7);
    ctx.fillStyle = s.obs === 'solved' ? '#e8d8a0' : '#5a4024'; ctx.fillRect(cx + 2, cy + 12, 12, 7);
    if (s.obs === 'solved' && !s.parts.mapa) { ctx.fillStyle = '#f0e8c8'; ctx.fillRect(cx + 4, cy + 10, 8, 3); }
  }
}

// Depois da luz: o raio de sol (brilha por cima do escuro)
function drawStoryGlow(ctx, g) {
  const tg = g.world.story?.tiger, s = storyState(g);
  if (!tg || s.tiger !== 'open' || !sunUp(g) || Math.abs(tg.lens.x * T - g.player.cx) > 70 * T) return;
  const { pts } = traceBeam(g);
  ctx.beginPath(); pts.forEach(([x, y], i) => { const px = (x + 0.5) * T, py = (y + 0.5) * T; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
  ctx.strokeStyle = 'rgba(255,210,90,0.35)'; ctx.lineWidth = 5; ctx.stroke();
  ctx.strokeStyle = 'rgba(255,248,210,0.95)'; ctx.lineWidth = 1.5; ctx.stroke();
}

// Tela: balões dos objetos e o painel das peças (renderer.js, depois dos balões dos moradores)
function drawStoryHud(ctx, g) {
  const z = g.zoom, s = storyState(g);
  if (g.npcOpen) return;
  for (const b of g.storyBubbles || []) drawSpeechBubble(ctx, (b.x - g.cam.x) * z, (b.y - g.cam.y) * z - 10, b.name, b.text, b.t);
  if (!['parts', 'beacon'].includes(s.step)) return;
  const x = 12, y = 12, W = 4 * 34 + 8;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#0a0c0f'; ctx.fillRect(x - 2, y - 2, W + 4, 48);
  ctx.fillStyle = 'rgba(24,28,34,0.92)'; ctx.fillRect(x, y, W, 44);
  ctx.font = '9px Silkscreen, monospace'; ctx.textAlign = 'left'; ctx.fillStyle = '#ffd27a'; ctx.fillText('PEÇAS DO FAROL', x + 5, y + 11);
  STORY_PARTS.forEach((part, i) => {
    const px = x + 5 + i * 34, py = y + 16, got = s.parts[part.id], done = s.delivered[part.id];
    ctx.fillStyle = '#101318'; ctx.fillRect(px, py, 30, 24);
    ctx.fillStyle = got ? '#e0b060' : '#3a3e44';
    if (part.id === 'gerador') { ctx.fillRect(px + 7, py + 7, 16, 12); ctx.fillStyle = got ? '#8a5a20' : '#24282c'; ctx.fillRect(px + 9, py + 10, 12, 1); ctx.fillRect(px + 9, py + 14, 12, 1); }
    else if (part.id === 'antena') { ctx.fillRect(px + 14, py + 3, 2, 18); ctx.fillRect(px + 8, py + 6, 14, 2); ctx.fillRect(px + 10, py + 11, 10, 2); }
    else if (part.id === 'transmissor') { ctx.fillRect(px + 6, py + 9, 18, 11); ctx.fillRect(px + 20, py + 3, 1, 7); ctx.fillStyle = got ? '#e04030' : '#24282c'; ctx.fillRect(px + 9, py + 12, 2, 2); }
    else { ctx.fillRect(px + 7, py + 4, 16, 16); ctx.fillStyle = got ? '#8a5a20' : '#24282c'; ctx.fillRect(px + 10, py + 8, 10, 1); ctx.fillRect(px + 10, py + 12, 7, 1); ctx.fillRect(px + 10, py + 16, 9, 1); }
    if (done) { ctx.fillStyle = '#90e070'; ctx.fillRect(px + 23, py + 18, 6, 5); ctx.fillStyle = '#0a0c0f'; ctx.fillRect(px + 25, py + 20, 2, 1); }
  });
  ctx.restore();
}
function drawSpeechBubble(ctx, sx, sy, name, text, t) {
  if (sx < -300 || sx > canvas.width + 300) return;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.font = '13px monospace';
  const rows = wrapText(ctx, text, 260), w = Math.max(...rows.map((r) => ctx.measureText(r).width), 60) + 20, h = rows.length * 17 + 30;
  const bx = Math.round(clamp(sx - w / 2, 8, canvas.width - w - 8)), by = Math.round(clamp(sy - h - 8, 8, canvas.height - h - 8));
  ctx.globalAlpha = Math.min(1, t * 2);
  ctx.fillStyle = '#0a0c0f'; ctx.fillRect(bx - 2, by - 2, w + 4, h + 4);
  ctx.fillStyle = 'rgba(24,28,34,0.96)'; ctx.fillRect(bx, by, w, h);
  ctx.fillStyle = '#9fc4a0'; ctx.fillRect(bx, by, 3, h);
  ctx.textAlign = 'left'; ctx.font = '10px Silkscreen, monospace'; ctx.fillStyle = '#bde591'; ctx.fillText(name.toUpperCase(), bx + 12, by + 15);
  ctx.font = '13px monospace'; ctx.fillStyle = '#efe6d2';
  rows.forEach((r, i) => ctx.fillText(r, bx + 12, by + 32 + i * 17));
  ctx.restore();
}

// ==================== FINAL ====================
const StoryUI = {
  dialog: null, g: null,
  openEnding(g) {
    if (!this.dialog) {
      const st = document.createElement('style');
      st.textContent = `#story-end{border:0;padding:0;width:min(560px,92vw);color:#efe6d2;background:#1b2027;font:400 13px/1.7 Silkscreen,monospace;box-shadow:0 0 0 3px #0a0c0f,0 0 0 6px #7a5a30,0 0 0 9px #0a0c0f}
#story-end::backdrop{background:rgba(6,10,15,.85)}#story-end h2{margin:0;padding:14px 20px;font-weight:400;color:#ffd27a;background:#2a2418;font-size:20px}
#story-end .b{padding:16px 20px}#story-end p{margin:0 0 12px}#story-end button{font:400 12px Silkscreen,monospace;color:#1a130b;background:#e0b060;border:0;padding:8px 14px;box-shadow:0 0 0 2px #0a0c0f;cursor:pointer}`;
      document.head.append(st);
      this.dialog = document.createElement('dialog'); this.dialog.id = 'story-end'; document.body.append(this.dialog);
      this.dialog.addEventListener('click', (e) => { if (e.target.closest('button')) this.close(); });
      this.dialog.addEventListener('cancel', (e) => { e.preventDefault(); this.close(); });
    }
    this.g = g; g.npcOpen = true;
    input.keys.clear(); input.mouse.left = input.mouse.right = input.mouse.rawLeft = false;
    const d = g.day || 1;
    this.dialog.innerHTML = `<h2>Resgatados</h2><div class="b">
      <p>O barco encosta e um pescador joga a corda. A ${PILOT_NAME} chega mancando logo atrás, rindo e chorando ao mesmo tempo.</p>
      <p>Você olha para trás uma última vez: a serra do urso, o bosque do tigre, a mina, o deserto. ${d} dia${d > 1 ? 's' : ''} numa ilha que não estava em mapa nenhum.</p>
      <p>Obrigado por jogar.</p><button>Continuar na ilha</button></div>`;
    if (!this.dialog.open) this.dialog.showModal();
  },
  close() {
    if (this.dialog?.open) this.dialog.close();
    if (this.g) { this.g.npcOpen = false; storyState(this.g).step = 'done'; this.g.objective = 'Você foi resgatado. A ilha continua aí para explorar.'; }
    input.keys.clear();
  },
};
