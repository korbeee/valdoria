'use strict';

initializeBearBoss(); // dependências de equipamento e barras já carregadas
initializeBossGear(); // espólios do tigre e da Fiandeira (js/spider-loot.js)

// Tamanhos de mundo escolhidos no início do jogo (em tiles)
const WORLD_SIZES = {
  pequeno: { w: 4200, h: 1200 },
  medio: { w: 6400, h: 1800 },
  grande: { w: 8400, h: 2400 },
};
// Mundo pequenininho só para o fundo do menu; o de verdade é gerado ao começar a viagem
const WORLD_W = 240;
const WORLD_H = 120;
const DAY_LENGTH = 780; // segundos por ciclo dia/noite (~5 min de dia, ~5 de noite e 1 de virada em cada ponta)
const REACH = 6; // alcance em tiles
const STEP = 1 / 60;

const canvas = document.getElementById('game');
const input = new Input(canvas);
const renderer = new Renderer(canvas, buildTextures());

let world = new World(WORLD_W, WORLD_H, (Math.random() * 1e9) | 0);
const spawnX = Math.floor(WORLD_W / 2);
const player = new Player(spawnX * T + 1, 0);
player.y = world.surface[spawnX] * T - player.h - 0.01;

const game = {
  world,
  player,
  zoom: 2,
  cam: { x: 0, y: 0 },
  time: 0.08,
  daylight: 1,
  lastDaylight: -1,
  inventory: new Inventory(INV_COLS * INV_ROWS),
  selected: 0,
  mining: { tx: 0, ty: 0, progress: 0 },
  target: { tx: 0, ty: 0, inRange: false, visible: false },
  placeCooldown: 0,
  attackCooldown: 0,
  swinging: false,   // botão esquerdo segurado (ferramenta balançando na mão)
  swingTime: 0,
  mobs: [],
  mobSpawnTimer: 8,
  sword: createSwordState(), // golpe de espada em andamento (js/combat.js)
  hitStop: 0,                // congelamento curto no impacto
  shake: 0,                  // tremida da câmera (px)
  particles: [],
  chests: new Map(),         // posição do baú -> espaços
  chestPairs: new Map(),     // posição do baú -> posição do vizinho no baú grande
  autoDoors: new Set(),      // portas abertas automaticamente (tile de baixo)
  toast: { text: '', t: 0 },
  day: 1,                    // dia do mundo: vira quando o relógio dá a volta e renova o estoque dos moradores
  debug: false,
  showHelp: true,
  fps: 0,
};

// Suprimentos e a ferramenta de emergência ficam nos destroços da abertura.
for (let i = 0; i < PIG.iniciais; i++) trySpawnPig(game, 10);
game.inventoryUI = new InventoryUI(game, input, renderer);
game.map = new WorldMap(world);
game.mapUI = new MapUI(game, input, renderer);
game.onToolImpact = (e) => playSfx('hit', e.x, e.y, { tile: e.tile });

// Gera um mundo novo do tamanho escolhido e prepara a abertura nele
// onProgress(0..1, etapa) acompanha a geração, que roda em pedaços para a tela não travar
// seed: número da semente escolhida no menu (null = aleatória)
async function newWorld(size, onProgress, seed = null) {
  NpcServices.close();
  const S = WORLD_SIZES[size] || WORLD_SIZES.pequeno;
  const next = new World(S.w, S.h, seed ?? ((Math.random() * 1e9) | 0), { lazy: true });
  await next.generateAsync(onProgress);
  world = game.world = next;
  game.lavaEffects=null;game.wasInLava=false;game.lavaAcc=0;game.lavaContactTimer=0;
  player.flightUsed=0;player.jetFuel=0;player.flying=false;player.flightGliding=false;player.flightItem=null;
  game.map = new WorldMap(world);
  renderer.bg = null;
  game.worldSize = size;
  game.day = 1; game.time = 0.08;
  game.mobs = []; game.particles.length = 0; game.explosions = []; game.drops = []; game.arrows = []; game.fallingTrees = []; game.trident = null; game.chests.clear(); game.chestPairs.clear(); game.autoDoors.clear();
  for (let i = 0; i < 8; i++) trySpawnPig(game, 10);
  // Baús das estruturas já vêm cheios; moradores nascem nas vilas
  for (const c of world.lootChests || []) game.chests.set(c.y * world.w + c.x, c.slots);
  game.npcs = (world.npcSpawns || []).map((s) => new Villager(s));
  // Um tigre dormindo sob as rochas de seu bosque
  game.mount = null; game.boss = null;
  game.guardianHazards = [];
  game.story = null; game.storyBubbles = []; game.tigerSlain = game.spiderSlain = false; // a história e a ordem dos chefes recomeçam
  for (const lair of world.bearLairs || []) spawnBearBoss(game, lair); // js/bear.js
  for (const nest of world.spiderNests || []) spawnFiandeira(game, nest); // js/spider-boss.js
  for (const lair of world.beetleLairs || []) spawnCascoFerro(game, lair); // js/beetle-boss.js
  for (const d of world.tigerDens || []) {
    const tiger = new Wildlife('tiger', d.x - WILDLIFE.tiger.w / 2, d.y - WILDLIFE.tiger.h - 0.01);
    setupTiger(tiger, d);
    game.mobs.push(tiger);
  }
  spawnTigerHabitatPrey(game);
  game.zoom = Math.max(game.zoom, minZoom());
  startOpening(game);
}

input.onMouseDown = (button, x, y, shift, mods) =>
  game.mapUI.onMouseDown(button, x, y) || game.inventoryUI.onMouseDown(button, x, y, shift, mods);

// Curva do sol: o trecho reto no topo e no fundo é o dia cheio e a noite cheia;
// a rampa entre eles é o amanhecer/entardecer, que ocupa ~9% do ciclo de cada lado.
function daylightAt(t) {
  return clamp(Math.sin(t * Math.PI * 2) * 1.7 + 0.42, 0, 1);
}

function toast(text) {
  game.toast.text = text;
  game.toast.t = 2;
}

// ---------- Câmera ----------
function viewSize() {
  return { vw: canvas.width / game.zoom, vh: canvas.height / game.zoom };
}

function clampCamera() {
  const { vw, vh } = viewSize();
  game.cam.x = clamp(game.cam.x, 0, Math.max(0, world.w * T - vw));
  game.cam.y = clamp(game.cam.y, 0, Math.max(0, world.h * T - vh));
}

function updateCamera(dt, snap) {
  const { vw, vh } = viewSize();
  const tx = player.cx - vw / 2;
  // Na luta da Fiandeira a câmera sobe para o teto da galeria aparecer (js/spider-boss.js)
  const ty = beetleCameraY(spiderCameraY(player.cy + player.stepOffset - vh / 2, vh), vh);
  const k = snap ? 1 : 1 - Math.exp(-12 * dt);
  game.cam.x += (tx - game.cam.x) * k;
  game.cam.y += (ty - game.cam.y) * k;
  clampCamera();
}

function minZoom() {
  return Math.max(1, Math.ceil(Math.max(canvas.width / (world.w * T), canvas.height / (world.h * T))));
}

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  game.zoom = Math.max(game.zoom, minZoom());
  updateCamera(0, true);
}
window.addEventListener('resize', resize);

// ---------- Interação com o mundo ----------
function screenToWorld(mx, my) {
  const z = game.zoom;
  return { x: (mx + Math.round(game.cam.x * z)) / z, y: (my + Math.round(game.cam.y * z)) / z };
}

function spawnParticles(tx, ty, tile, n) {
  const c = TILE_DEFS[tile].color;
  const color = rgb(c);
  for (let i = 0; i < n; i++) {
    game.particles.push({
      x: (tx + Math.random()) * T,
      y: (ty + Math.random()) * T,
      vx: (Math.random() - 0.5) * 120,
      vy: -Math.random() * 150,
      life: 0.3 + Math.random() * 0.4,
      color,
    });
  }
  if (game.particles.length > 400) game.particles.splice(0, game.particles.length - 400);
}

function giveItem(item, count = 1) {
  if (game.inventory.add(item, count) > 0) toast('Inventário cheio!');
  else if (performance.now() - (game.lastPickup || 0) > 70) { game.lastPickup = performance.now(); playSfx('pickup'); }
}

function giveDrop(tile) {
  const drop = TILE_DEFS[tile].drop;
  if (drop === null) return;
  giveItem(drop);
}

function removeTile(tx, ty) {
  const t = world.getTile(tx, ty);
  giveDrop(t);
  spawnBreakBurst(tx, ty, t);
  world.setTile(tx, ty, TILE.AIR);
}

// Móvel de vários blocos (estante, cama, relógio...): sai inteiro e devolve um item só
function breakFurniture(tx, ty) {
  const t = world.getTile(tx, ty);
  spawnBreakBurst(tx, ty, t);
  giveDrop(removeFurniture(world, tx, ty));
}

// Tronco, toco e viga não são "sólidos", mas seguram uma tocha do mesmo jeito
const TORCH_HOLDS = new Set([TILE.TRUNK, TILE.STUMP, TILE.BEAM]);
const torchHolder = (w, x, y) => w.isSolid(x, y) || TORCH_HOLDS.has(w.getTile(x, y));

// Onde a tocha se apoia: 0 = chão ou parede de fundo (em pé),
// -1 = parede à esquerda, 1 = parede à direita (inclinada), null = sem apoio nenhum
function torchSupport(w, tx, ty) {
  if (torchHolder(w, tx, ty + 1)) return 0;
  if (torchHolder(w, tx - 1, ty)) return -1;
  if (torchHolder(w, tx + 1, ty)) return 1;
  return w.getWall(tx, ty) !== WALL.NONE ? 0 : null;
}

function torchSupported(tx, ty) {
  return torchSupport(world, tx, ty) !== null;
}

// ---------- Paredes de fundo ----------
// Ficam atrás de tudo: o jogador atravessa, mas elas tapam o céu e seguram tochas e blocos.
// A parede é pintada num pincel de 2x2 centrado no mouse: devolve o canto de cima/esquerda
function wallBrushOrigin() {
  const m = screenToWorld(input.mouse.x, input.mouse.y);
  return [Math.floor(m.x / T - 0.5), Math.floor(m.y / T - 0.5)];
}

// Coloca parede nas casas vazias do pincel 2x2 (1 item por casa). Pelo menos uma casa precisa
// encostar em outra parede ou num bloco — não dá para colar parede no vazio. Devolve quantas pôs.
function tryPlaceWall(wall) {
  const [bx, by] = wallBrushOrigin(), item = WALL_ITEM[wall];
  const reach = (x, y) => ((x + 0.5) * T - player.cx) ** 2 + ((y + 0.5) * T - player.cy) ** 2 <= (REACH * T) ** 2;
  const cells = [[bx, by], [bx + 1, by], [bx, by + 1], [bx + 1, by + 1]]
    .filter(([x, y]) => world.inBounds(x, y) && reach(x, y) && world.getWall(x, y) === WALL.NONE);
  const touching = ([x, y]) => SOLID[world.getTile(x, y)] ||
    [[0, -1], [0, 1], [-1, 0], [1, 0]].some(([dx, dy]) => world.getWall(x + dx, y + dy) !== WALL.NONE || SOLID[world.getTile(x + dx, y + dy)]);
  if (!cells.length || !cells.some(touching)) return 0;
  let placed = 0;
  for (const [x, y] of cells) {
    const slot = game.inventory.slots[game.selected];
    if (!slot || WALL_ITEM[ITEM_DEFS[slot.item].parede] !== item) break; // acabaram as paredes na mão
    world.setWall(x, y, wall);
    game.inventory.takeFromSlot(game.selected);
    placed++;
  }
  if (placed) playSfx('place', (bx + 1) * T, (by + 1) * T, { tile: WALL_SOURCE[wall] });
  return placed;
}

// A parede sai do mesmo jeito que entra: em pedaços de 2x2. Só conta a parte à mostra
// (atrás de um bloco sólido ela fica). Casas do pincel que têm parede para derrubar:
function wallBrushCells(bx, by) {
  return [[bx, by], [bx + 1, by], [bx, by + 1], [bx + 1, by + 1]]
    .filter(([x, y]) => world.inBounds(x, y) && world.getWall(x, y) !== WALL.NONE && !SOLID[world.getTile(x, y)]);
}

// Pincel do martelo: segue o mouse; com o cursor inteligente, encosta no canto da casa
// escolhida que fica mais perto do mouse
function hammerBrushOrigin(m, smart) {
  if (!smart) return wallBrushOrigin();
  if (smart.brush) return smart.brush;
  return [m.x / T < smart.tx + 0.5 ? smart.tx - 1 : smart.tx, m.y / T < smart.ty + 0.5 ? smart.ty - 1 : smart.ty];
}

function breakWallBrush(bx, by) {
  const cells = wallBrushCells(bx, by);
  if (!cells.length) return;
  const source = WALL_SOURCE[world.getWall(cells[0][0], cells[0][1])];
  for (const [x, y] of cells) {
    const wall = world.getWall(x, y);
    giveItem(WALL_ITEM[wall]);
    spawnBreakBurst(x, y, WALL_SOURCE[wall], .5);
    world.setWall(x, y, WALL.NONE);
    if (world.getTile(x, y) === TILE.TORCH && !torchSupported(x, y)) removeTile(x, y); // tocha presa só na parede cai junto
  }
  playSfx('break', (bx + 1) * T, (by + 1) * T, { tile: source });
}

// ---------- Portas (3 tiles na vertical) ----------
const isDoor = (t) => t === TILE.DOOR || t === TILE.DOOR_OPEN;

// Linha do tile de baixo da porta que contém (tx, ty)
function doorBottom(tx, ty) {
  let y = ty;
  while (y - ty < 2 && isDoor(world.getTile(tx, y + 1))) y++;
  return y;
}

function breakDoor(tx, ty) {
  const bottom = doorBottom(tx, ty);
  const t = world.getTile(tx, bottom);
  for (let k = 0; k < 3; k++) {
    if (!isDoor(world.getTile(tx, bottom - k))) break;
    spawnParticles(tx, bottom - k, t, 6);
    world.setTile(tx, bottom - k, TILE.AIR);
  }
  giveDrop(t); // a porta inteira devolve 1 item
}

function toggleDoor(tx, ty) {
  const bottom = doorBottom(tx, ty);
  const closing = world.getTile(tx, bottom) === TILE.DOOR_OPEN;
  if (closing) {
    for (let k = 0; k < 3; k++) if (player.overlapsTile(tx, bottom - k)) return false; // não fecha em cima do jogador
  }
  for (let k = 0; k < 3; k++) {
    if (isDoor(world.getTile(tx, bottom - k))) world.setTile(tx, bottom - k, closing ? TILE.DOOR : TILE.DOOR_OPEN);
  }
  playSfx('door', (tx + 0.5) * T, (bottom - 1) * T, { open: !closing });
  return true;
}

// O clique pode ser em qualquer um dos 3 espaços; a porta é apoiada no primeiro chão abaixo
function tryPlaceDoor(tx, ty) {
  for (let bottom = ty; bottom <= ty + 2; bottom++) {
    const ground = world.getTile(tx, bottom + 1);
    if (!SOLID[ground] || isDoor(ground)) continue;
    if (!world.inBounds(tx, bottom - 2)) return false;
    for (let k = 0; k < 3; k++) {
      if (world.getTile(tx, bottom - k) !== TILE.AIR || player.overlapsTile(tx, bottom - k)) return false;
    }
    for (let k = 0; k < 3; k++) world.setTile(tx, bottom - k, TILE.DOOR);
    return true;
  }
  return false;
}

// ---------- Baús (10 espaços, guardados por posição) ----------
const CHEST_SLOTS = 10;
let chestIcon = null;

// Dois baús lado a lado viram um baú grande (20 espaços). O par é feito ao colocar:
// um terceiro baú encostado num par já formado continua pequeno.
function pairChest(tx, ty) {
  const key = ty * world.w + tx;
  for (const nx of [tx - 1, tx + 1]) {
    const nk = ty * world.w + nx;
    if (world.getTile(nx, ty) === TILE.CHEST && !game.chestPairs.has(nk)) {
      game.chestPairs.set(key, nk); game.chestPairs.set(nk, key);
      return;
    }
  }
}

function openChest(tx, ty) {
  const key = ty * world.w + tx, pk = game.chestPairs.get(key);
  const keys = pk == null ? [key] : [Math.min(key, pk), Math.max(key, pk)]; // esquerda primeiro
  for (const k of keys) if (!game.chests.has(k)) game.chests.set(k, Array(CHEST_SLOTS).fill(null));
  if (!chestIcon) {
    chestIcon = makeCanvas(T, T);
    chestIcon.getContext('2d').drawImage(renderer.tex.itemAtlas, ITEM.CHEST * T, 0, T, T, 0, 0, T, T);
  }
  // Baú grande: a janela usa uma lista com os dois baús juntos, copiada de volta a cada quadro
  const slots = keys.length === 1 ? game.chests.get(key) : keys.flatMap((k) => game.chests.get(k));
  const big = keys.length > 1;
  game.inventoryUI.openContainer({ title: big ? 'Baú grande' : 'Baú', subtitle: `${slots.length} espaços`, slots, source: { chest: key, keys, tx, ty }, icon: chestIcon });
  playSfx('chest', (tx + 0.5) * T, (ty + 0.5) * T);
}

// Copia o baú grande de volta e fecha a janela quando o jogador se afasta ou o baú some
function updateChestUI() {
  const ui = game.inventoryUI, src = ui.container?.source;
  // Bolsa do elefante: fecha quando ele morre ou o jogador se afasta
  if (src?.mount) {
    const e = src.mount;
    if (e.dead || !game.mobs.includes(e) || Math.hypot(e.cx - player.cx, e.cy - player.cy) > (REACH + 2) * T) ui.closeContainer();
    return;
  }
  if (src?.chest == null) return;
  if (src.keys.length > 1) src.keys.forEach((k, i) => { const a = game.chests.get(k); for (let j = 0; j < CHEST_SLOTS; j++) a[j] = ui.container.slots[i * CHEST_SLOTS + j]; });
  const far = Math.hypot((src.tx + 0.5) * T - player.cx, (src.ty + 0.5) * T - player.cy) > (REACH + 1) * T;
  const gone = src.keys.some((k) => world.getTile(k % world.w, Math.floor(k / world.w)) !== TILE.CHEST);
  if (far || gone || (src.keys.length > 1) !== game.chestPairs.has(src.chest)) ui.closeContainer();
}

// ---------- Portas automáticas ----------
// Abrem quando o jogador anda em direção a elas e fecham sozinhas quando ele se afasta
function updateAutoDoors() {
  const px = player.cx / T, feet = Math.floor((player.y + player.h - 1) / T);
  for (let y = feet - 2; y <= feet; y++)
    for (let x = Math.floor(px) - 2; x <= Math.floor(px) + 2; x++) {
      if (world.getTile(x, y) !== TILE.DOOR) continue;
      const dx = x + 0.5 - px;
      if (Math.abs(dx) < 2.2 && Math.abs(player.vx) > 10 && Math.sign(dx) === Math.sign(player.vx) && toggleDoor(x, y))
        game.autoDoors.add(doorBottom(x, y) * world.w + x);
    }
  for (const key of game.autoDoors) {
    const x = key % world.w, y = Math.floor(key / world.w);
    if (world.getTile(x, y) !== TILE.DOOR_OPEN) game.autoDoors.delete(key);
    else if (Math.abs(x + 0.5 - px) > 2.6 && toggleDoor(x, y)) game.autoDoors.delete(key);
  }
}

// Comer: botão direito com comida na mão
function eatHeld(def) {
  if(consumeReferenceFood(game,def))return;
  game.placeCooldown = 0.6;
  if (player.hp >= player.maxHp) { toast('Você está sem fome.'); return; }
  player.hp = Math.min(player.maxHp, player.hp + def.cura);
  game.inventory.takeFromSlot(game.selected);
  toast(`+${def.cura} de vida`);
  playSfx('eat', player.cx, player.y + 10);
}

function breakTile(tx, ty) {
  const t = world.getTile(tx, ty);
  if (t === TILE.CHEST) {
    // O conteúdo vai para o inventário; se não couber, o baú fica
    const key = ty * world.w + tx, slots = game.chests.get(key);
    if (slots) {
      for (let i = 0; i < slots.length; i++) if (slots[i]) {
        const left = game.inventory.add(slots[i].item, slots[i].count);
        slots[i] = left > 0 ? { item: slots[i].item, count: left } : null;
      }
      if (slots.some(Boolean)) { toast('Inventário cheio: esvazie o baú primeiro.'); return; }
      game.chests.delete(key);
    }
    game.chestPairs.delete(game.chestPairs.get(key));
    game.chestPairs.delete(key);
  }
  playSfx('break', (tx + 0.5) * T, (ty + 0.5) * T, { tile: t });
  if (isDoor(t)) {
    breakDoor(tx, ty);
    return;
  }
  if (t === TILE.TRUNK || t === TILE.STUMP || t === TILE.CACTUS) {
    // Árvore inteira tomba para o lado e solta a madeira ao cair; madeira já cortada
    // (sobrou toco) sai bloco a bloco, como qualquer outro bloco (js/tree-fall.js)
    if (treeIsWhole(world, tx, ty)) startTreeFall(game, tx, ty);
    else { removeTile(tx, ty); capCutWood(world, tx, ty); } // o tronco de baixo continua toco
  } else if (FURNITURE[t]) {
    breakFurniture(tx, ty);
  } else {
    removeTile(tx, ty);
  }

  // Tirou o chão de uma porta: ela cai
  if (isDoor(world.getTile(tx, ty - 1))) breakDoor(tx, ty - 1);
  dropUnsupported(tx, ty);
}

// Tochas, móveis e enfeites que se apoiavam no bloco removido caem junto
function dropUnsupported(tx, ty) {
  // Tirou o chão de baixo de uma árvore (ou cacto): ela tomba inteira
  const above = world.getTile(tx, ty - 1);
  if ((above === TILE.TRUNK || above === TILE.STUMP || above === TILE.CACTUS) && !world.isSolid(tx, ty)) {
    if (treeIsWhole(world, tx, ty - 1)) startTreeFall(game, tx, ty - 1);
    else collapseCutWood(game, tx, ty - 1); // toco/tronco já cortado: desce sem tombar
  }
  breakSeaweedAbove(game, tx, ty); // alga sem apoio: a coluna inteira sai (js/water.js)
  for (const [x, y] of [[tx, ty - 1], [tx, ty + 1], [tx - 1, ty], [tx + 1, ty]]) {
    const t = world.getTile(x, y);
    if (t === TILE.AIR || isDoor(t)) continue;
    if (t === TILE.TORCH) { if (!torchSupported(x, y)) removeTile(x, y); continue; }
    if (!tileUnsupported(world, x, y)) continue; // chão, mesa, teto ou parede de fundo (js/furniture.js)
    if (t === TILE.CHEST) breakTile(x, y);
    else if (FURNITURE[t]) breakFurniture(x, y);
    else removeTile(x, y);
  }
}

function tryPlace(tx, ty) {
  const slot = game.inventory.slots[game.selected];
  if (!slot) return false;
  const def = ITEM_DEFS[slot.item];

  // Parede de fundo: vai na camada de trás, mesmo com o jogador em cima
  if (def.parede != null) return tryPlaceWall(def.parede) > 0;

  const place = def.place;
  if (place === null || !world.inBounds(tx, ty) || world.getTile(tx, ty) !== TILE.AIR) return false;

  if (place === TILE.DOOR) {
    if (!tryPlaceDoor(tx, ty)) return false;
    game.inventory.takeFromSlot(game.selected);
    return true;
  }

  // Móveis (mesa, cadeira, estante, cama, lustre...): procura onde o móvel inteiro cabe e se apoia
  if (FURNITURE[place]) {
    const spot = findFurnitureSpot(world, place, tx, ty);
    if (!spot) return false;
    placeFurniture(world, place, spot.ax, spot.ay);
    if (place === TILE.CHAIR) (world.chairFacing ??= new Map()).set(spot.ay * world.w + spot.ax, player.facing);
    game.inventory.takeFromSlot(game.selected);
    playSfx('place', (tx + 0.5) * T, (ty + 0.5) * T, { tile: place });
    return true;
  }

  if (place === TILE.TORCH) {
    if (!torchSupported(tx, ty)) return false;
  } else if (place === TILE.LADDER) {
    // Escada: encaixa em outra escada (acima ou abaixo), num bloco vizinho ou numa parede
    // de fundo; o jogador pode estar em cima dela sem problema
    const anchored = [[0, -1], [0, 1], [-1, 0], [1, 0]].some(([dx, dy]) =>
      world.isSolid(tx + dx, ty + dy) || world.getTile(tx + dx, ty + dy) === TILE.LADDER);
    if (!anchored && world.getWall(tx, ty) === WALL.NONE) return false;
  } else if (TILE_DEFS[place].aquatico) {
    if (!canPlaceAquatic(world, tx, ty, place)) return false; // alga, coral e vitória-régia só na água
  } else if (place === TILE.CHEST || place === TILE.CAMPFIRE) {
    if (!world.isSolid(tx, ty + 1)) return false; // precisa de chão
  } else {
    // Móveis e enfeites: `apoio` diz se a peça precisa de piso embaixo ou de teto em cima
    const tdef = TILE_DEFS[place];
    if (tdef.apoio === 'chao' && !floorSupports(world, tx, ty + 1)) return false; // chão ou mesa
    if (tdef.apoio === 'teto' && !world.isSolid(tx, ty - 1)) return false;
    if (tdef.apoio === 'parede' && world.getWall(tx, ty) === WALL.NONE) return false;
    if (tdef.solid && player.overlapsTile(tx, ty)) return false; // só bloco cheio empurra o jogador
    const anchored =
      world.getTile(tx + 1, ty) !== TILE.AIR || world.getTile(tx - 1, ty) !== TILE.AIR ||
      world.getTile(tx, ty + 1) !== TILE.AIR || world.getTile(tx, ty - 1) !== TILE.AIR ||
      world.getWall(tx, ty) !== WALL.NONE;
    if (!anchored) return false;
  }

  world.setTile(tx, ty, place);
  if (place === TILE.CHEST) pairChest(tx, ty);
  game.inventory.takeFromSlot(game.selected);
  playSfx('place', (tx + 0.5) * T, (ty + 0.5) * T, { tile: place });
  return true;
}

// Quanto de um bloco (de dureza 1) cada batida tira: a força do nível da ferramenta, e só um
// terço dela quando é a ferramenta errada para o bloco (picareta na madeira, pá na pedra...)
function miningSpeed(tile, heldDef) {
  if (hardRockBlocked(tile, heldDef)) return 0; // rocha endurecida: só a Broca de Quitina (js/beetle-loot.js)
  const needed = TILE_DEFS[tile].ferramenta, force = heldDef?.forca ?? 0.2;
  return needed && toolSupports(heldDef,needed) ? force : force * 0.35;
}

// Alcance da ferramenta em px, da mão até o ponto do bloco mais perto dela
const toolReachPx = (def) => (def?.alcanceFerramenta ?? TOOL_REACH_BASE) * T;
function toolCanReach(def, tx, ty, size = 1) {
  const c = toolContact(player, tx, ty, world.getTile(tx, ty), size);
  return Math.hypot(c.x - player.cx, c.y - (player.y + player.h * 0.6)) <= toolReachPx(def);
}

// ---------- Cursor inteligente (Ctrl liga/desliga) ----------
// Marca sozinho, dentro do alcance, o bloco mais perto do mouse que dá para usar, e põe na mão
// num "11º espaço" temporário a ferramenta certa: machado na árvore, picareta na pedra, pá na
// terra, martelo (segurando o botão esquerdo) ou tocha na parede de fundo, e a melhor arma
// quando o mouse está num monstro. Quando não há mais alvo, volta o item que estava na mão.
const SMART_SKIP = new Set([TILE.DOOR, TILE.DOOR_OPEN, TILE.CHEST, TILE.LADDER, TILE.CAMPFIRE, TILE.TORCH, TILE.BEDROCK]);
const RIGHT_CLICK_USE = (d) => d && (d.place != null || d.parede != null || d.cura || d.roupa || d.vidaMaxima || d.chamado || d.folego || d.balde || d.bossSummon);

// Melhor espaço do inventário que passa no teste (maior pontuação); -1 se não tiver
function bestSlot(test, score) {
  let best = -1, bestScore = -Infinity;
  game.inventory.slots.forEach((s, i) => {
    if (!s || !test(ITEM_DEFS[s.item], s)) return;
    const sc = score(ITEM_DEFS[s.item]);
    if (sc > bestScore) { bestScore = sc; best = i; }
  });
  return best;
}

// Alvo do cursor inteligente. Se o mouse está em cima de algo usável, é ele. Senão vale o que
// estiver mais perto do jogador na direção do mouse (mouse lá embaixo = bloco do lado do pé,
// não um bloco perdido perto do mouse) e que a ferramenta alcança de verdade.
// lock: alvo do golpe em andamento (botão esquerdo segurado) — continua nele até acabar e, depois,
// prefere outro alvo da MESMA ferramenta antes de trocar (termina as paredes antes da madeira).
function smartCursorPick(m, lock) {
  const tools = {};
  for (const kind of ["picareta", "machado", "pa", "martelo", "broca"]) tools[kind] = bestSlot((d) => toolSupports(d,kind), (d) => (d.forca || 0) * 1000 + (d.alcanceFerramenta || 0));
  const torch = bestSlot((d, s) => s.item === ITEM.TORCH, () => 0);

  // Monstro perto do mouse: a arma que mais bate
  const foe = game.mobs.find((o) => o.hostile && !o.dead && Math.hypot(o.cx - m.x, o.cy - m.y) < 1.5 * T &&
    Math.hypot(o.cx - player.cx, o.cy - player.cy) < (REACH + 2) * T);
  if (foe) {
    const weapon = bestSlot((d) => d.dano > 0, (d) => d.dano);
    if (weapon >= 0) return { slot: weapon, tx: Math.floor(m.x / T), ty: Math.floor(m.y / T), mob: true };
  }

  const pcx = player.cx / T, pcy = player.cy / T, mx = m.x / T, my = m.y / T;
  // Ferramenta só bate no que a mão alcança (alcance do nível dela, veja TOOL_TIERS)
  const reachable = (tx, ty, size, slot) => toolCanReach(ITEM_DEFS[game.inventory.slots[slot]?.item], tx, ty, size);
  // Pincel 2x2 do martelo: encosta no canto da casa mais perto do mouse
  const brushFor = (tx, ty) => [mx < tx + 0.5 ? tx - 1 : tx, my < ty + 0.5 ? ty - 1 : ty];
  // Espaço certo para a casa (ou -1), e o pincel quando é parede com martelo
  const need = (tx, ty, onMouse) => {
    const t = world.getTile(tx, ty);
    if (t !== TILE.AIR) {
      const def = TILE_DEFS[t];
      if (SMART_SKIP.has(t) || def.apoio || !def.ferramenta || !isFinite(def.hardness)) return null;
      // Bloco enterrado (sem nenhum lado livre) não conta
      if (SOLID[t] && [[0, -1], [0, 1], [-1, 0], [1, 0]].every(([dx, dy]) => SOLID[world.getTile(tx + dx, ty + dy)])) return null;
      const slot = tools[def.ferramenta] ?? -1;
      return slot >= 0 && reachable(tx, ty, 1, slot) ? { slot, tx, ty } : null;
    }
    if (world.getWall(tx, ty) === WALL.NONE) return null;
    if (input.mouse.left && tools.martelo >= 0) {
      const brush = brushFor(tx, ty);
      return reachable(brush[0], brush[1], 2, tools.martelo) ? { slot: tools.martelo, tx, ty, brush } : null;
    }
    // Tocha só quando o mouse está bem em cima da parede (senão viveria trocando para tocha)
    if (onMouse && torch >= 0) return { slot: torch, tx, ty, torch: true };
    return null;
  };

  // Golpe em andamento: fica no mesmo alvo enquanto ele ainda existir
  if (lock) {
    if (lock.brush) {
      if (wallBrushCells(lock.brush[0], lock.brush[1]).length && reachable(lock.brush[0], lock.brush[1], 2, lock.slot)) return lock;
    } else {
      const again = need(lock.tx, lock.ty, false);
      if (again && again.slot === lock.slot) return lock;
    }
  }

  let dirx = mx - pcx, diry = my - pcy;
  const len = Math.hypot(dirx, diry) || 1; dirx /= len; diry /= len;
  let best = null, bestScore = Infinity;
  for (let ty = Math.floor(pcy - REACH); ty <= Math.ceil(pcy + REACH); ty++)
    for (let tx = Math.floor(pcx - REACH); tx <= Math.ceil(pcx + REACH); tx++) {
      const cx = tx + 0.5, cy = ty + 0.5, rx = cx - pcx, ry = cy - pcy;
      if (!world.inBounds(tx, ty) || rx * rx + ry * ry > REACH * REACH) continue;
      const toMouse = Math.hypot(cx - mx, cy - my), onMouse = toMouse <= 0.71;
      let score;
      if (onMouse) score = -100 + toMouse;
      else {
        const along = rx * dirx + ry * diry, perp = Math.abs(rx * diry - ry * dirx);
        if (along < -0.6 || perp > 2.6) continue; // atrás do jogador ou fora do rumo do mouse
        score = Math.hypot(rx, ry) + perp * 1.5;
      }
      if (!lock && score >= bestScore) continue; // (com lock a penalidade vem depois)
      const pick = need(tx, ty, onMouse);
      if (!pick) continue;
      if (lock && pick.slot !== lock.slot) score += 1000; // termina o serviço da ferramenta atual primeiro
      if (score < bestScore) { bestScore = score; best = pick; }
    }
  return best;
}

// Põe o item do alvo na mão (lembrando o que estava lá) ou devolve o item original
function applySmart(pick) {
  if (!pick) { endSmart(); return; }
  if (game.smartPrev == null) game.smartPrev = game.selected;
  game.selected = pick.slot;
  game.smartSlot = pick.slot;
}

function endSmart() {
  if (game.smartPrev != null) game.selected = game.smartPrev;
  game.smartPrev = null;
  game.smartSlot = null;
}

// Clique direito em porta, baú ou cadeira. Armas, tridente, arco e puçá saem de handleInteraction antes do
// trecho que trata essas peças, então chamam isto por conta própria. Devolve true se tratou o clique.
function rightClickFurniture(tx, ty, rightPressed, inRange) {
  if (!rightPressed || !inRange) return false;
  const tile = world.getTile(tx, ty);
  if (isDoor(tile)) toggleDoor(tx, ty);
  else if (tile === TILE.CHEST) openChest(tx, ty);
  else if (TILE_DEFS[tile].sentar) player.sitOn(world, tx, ty, chairFacing(world, tx, ty));
  else return false;
  return true;
}

function handleInteraction(dt) {
  game.smartCursor = input.down('ControlLeft') || input.down('ControlRight'); // só enquanto segura o Ctrl
  const m = screenToWorld(input.mouse.x, input.mouse.y);
  let tx = Math.floor(m.x / T), ty = Math.floor(m.y / T);
  const mining = game.mining;
  // Clique direito "novo" (não segurado), para abrir/fechar porta uma vez por clique
  const rightPressed = input.mouse.right && !game.rightWasDown;
  game.rightWasDown = input.mouse.right;

  if (game.mapUI.capturesMouse(input.mouse.x, input.mouse.y) || game.inventoryUI.capturesMouse(input.mouse.x, input.mouse.y)) {
    endSmart();
    game.target = { tx, ty, inRange: false, visible: false };
    mining.progress = 0;
    game.swinging = false;
    return;
  }

  if (sharkMouseAction(game, m, rightPressed)) {
    endSmart(); mining.progress = 0; game.swinging = false; game.target.visible = false; return;
  }

  // Cursor inteligente: não mexe quando o jogador está usando o item da mão com o botão direito
  // (colocando bloco, comendo...), mirando uma porta/baú, com arco ou com o inventário aberto
  let smart = null;
  if (game.smartCursor && !game.inventoryUI.open) {
    const manual = ITEM_DEFS[game.inventory.slots[game.smartPrev ?? game.selected]?.item];
    const mouseTile = world.getTile(tx, ty);
    const busy = manual?.arco || (input.mouse.right && RIGHT_CLICK_USE(manual) && manual.place !== TILE.TORCH) ||
      isDoor(mouseTile) || mouseTile === TILE.CHEST;
    if (!busy) smart = smartCursorPick(m, input.mouse.left ? game.smartLock : null);
  }
  applySmart(smart);
  // Segurando o botão esquerdo o alvo fica travado até terminar (veja smartCursorPick)
  game.smartLock = input.mouse.left && smart && !smart.mob && !smart.torch ? smart : null;
  if (smart && !smart.mob) { tx = smart.tx; ty = smart.ty; }

  const dx = (tx + 0.5) * T - player.cx, dy = (ty + 0.5) * T - player.cy;
  const inRange = dx * dx + dy * dy <= (REACH * T) * (REACH * T);
  game.target = { tx, ty, inRange, visible: true, smart: !!smart && !smart.mob };
  if (rightPressed && tryOpenCraftStation(game, tx, ty)) { game.target.visible = false; return; }
  // Achados do chão (pedrinha, graveto, concha...): o botão direito pega, se o cursor está em cima e ao alcance (js/surface-life.js)
  if (rightPressed && inRange && pickupGround(game, tx, ty)) { game.target.visible = false; game.harvestCooldown = 0.18; return; }

  // Enigmas e inscrições da história: pedras-glifo, relógio de sol, cofre, luneta, páginas (js/story.js)
  if (storyInteract(game, m, rightPressed)) { game.target.visible = false; return; }

  // Botão direito sobre um destroço: abre a janela com os itens
  if (rightPressed && (tryTalkNpc(game, m.x, m.y) || tryElephantClick(game, m.x, m.y) || tryOpenWreck(game, m.x, m.y))) {
    game.target.visible = false;
    return;
  }

  const held = game.inventory.slots[game.selected];
  const heldDef = held ? ITEM_DEFS[held.item] : null;
  if(fishingInput(game,heldDef,m,rightPressed))return;
  game.attackCooldown -= dt;
  game.harvestCooldown = (game.harvestCooldown || 0) - dt;

  // Roupa na mão (pelagem, peitoral): botão direito veste
  if(rightPressed&&heldDef?.bossSummon){useBossSummoner(game);game.target.visible=false;return;}
  if (rightPressed && heldDef?.roupa) {
    wearHeldOutfit(game);
    game.target.visible = false;
    return;
  }

  // Balde: pega água do lago (vazio) ou despeja onde o mouse está (cheio) (js/bucket.js)
  if (rightPressed && heldDef?.balde) {
    useBucket(game, tx, ty, inRange);
    game.target.visible = false;
    return;
  }

  // Garrafa de ar: enche o fôlego (js/water.js)
  if (rightPressed && heldDef?.folego) {
    useAirBottle(game);
    game.target.visible = false;
    return;
  }

  // Coração do tigre (vida máxima) e berrante de marfim (chama o elefante)
  if (rightPressed && game.placeCooldown <= 0 && (heldDef?.vidaMaxima || heldDef?.chamado)) {
    if (heldDef.vidaMaxima) eatTigerHeart(game); else blowIvoryHorn(game);
    game.target.visible = false;
    return;
  }

  // Espólio do Patriarca: o frasco de rugido e o mel ancestral (js/bear-loot.js)
  if (rightPressed && game.placeCooldown <= 0 && heldDef?.mel) {
    drinkAncientHoney(game);
    game.target.visible = false;
    return;
  }

  // Instinto da Caçada, Carretel e Casulo (js/tiger-loot.js, js/spider-loot.js)
  if (bossGearUse(game, heldDef, m, rightPressed)) {
    game.swinging = false;
    game.target.visible = false;
    mining.progress = 0;
    return;
  }

  // Tridente: esquerdo estoca e solta a lança d'água, direito arremessa (js/trident.js)
  if (heldDef?.tridente) {
    game.swinging = false;
    game.target.visible = false;
    mining.progress = 0;
    if (!rightClickFurniture(tx, ty, rightPressed, inRange)) updateTridentInput(game, dt, m, rightPressed);
    return;
  }

  // Arco na mão: segura para puxar, solta para atirar (js/bow.js)
  if (heldDef?.arco) {
    game.swinging = false;
    game.target.visible = false;
    mining.progress = 0;
    rightClickFurniture(tx, ty, rightPressed, inRange);
    updateBowInput(game, dt, m);
    return;
  }

  // Puçá na mão: o botão esquerdo dá a rede e o direito solta o bicho (js/bug-net.js)
  if (heldDef?.puca) {
    game.swinging = false;
    game.target.visible = false;
    mining.progress = 0;
    if (input.mouse.left) startSwordSwing(game, heldDef, m.x, m.y);
    rightClickFurniture(tx, ty, rightPressed, inRange);
    return;
  }
  if (rightPressed && inRange && game.placeCooldown <= 0 && heldDef?.criatura) {
    if (tryReleaseCritter(game, tx, ty)) game.placeCooldown = 0.25;
    game.target.visible = false;
    return;
  }

  // Arma na mão: golpe em arco com hitbox própria (js/combat.js); espada não minera
  if (heldDef && heldDef.dano) {
    game.swinging = false;
    game.target.visible = false;
    mining.progress = 0;
    if (input.mouse.left) startSwordSwing(game, heldDef, m.x, m.y);
    rightClickFurniture(tx, ty, rightPressed, inRange);
    return;
  }

  game.swinging = input.mouse.left;

  // Mão ou ferramenta com bicho embaixo do cursor: soco simples.
  // Ferramenta que também é arma (machado de emergência) não soca: cai no golpe em arco lá embaixo.
  const mob = mobAt(game, m.x, m.y);
  if (mob && !heldDef?.danoCorpo) {
    game.target.visible = false;
    mining.progress = 0;
    const mdx = mob.cx - player.cx, mdy = mob.cy - player.cy;
    const mobInRange = mdx * mdx + mdy * mdy <= (REACH * T) * (REACH * T);
    if (input.mouse.left && mobInRange && game.attackCooldown <= 0) {
      mob.hit((heldDef && heldDef.dano) || 1, player.cx);
      mobParticles(game, mob, 5, 'rgb(230,70,80)');
      game.attackCooldown = 0.4;
      game.attackCooldownItem = null;
    }
    return;
  }

  // Destroços do avião ficam na frente dos blocos: o botão esquerdo desmonta eles primeiro
  if (input.mouse.left && hitCrashPiece(game, dt, m.x, m.y, heldDef)) {
    game.target.visible = false;
    mining.progress = 0;
    cancelTool(game);
    return;
  }
  if (!input.mouse.left) game.wreckHit = null;

  const tile = world.getTile(tx, ty);
  // Enfeite no vazio (mato, flor, pedrinha, cristal, cogumelo): o clique colhe e vira
  // item, e o lugar fica vazio até nascer de novo (js/environment.js). O martelo não,
  // que ele está mirando a parede de fundo atrás do enfeite.
  if (input.mouse.left && inRange && tile === TILE.AIR && game.harvestCooldown <= 0 && heldDef?.ferramenta !== 'martelo') {
    const found = environmentDecorationAt(world, tx, ty);
    if (found && environmentHarvest(game, found.x, found.y, found.ceiling)) {
      game.harvestCooldown = 0.22;
      mining.progress = 0;
      cancelTool(game);
      return;
    }
  }
  // Martelo na mão: mira um pincel 2x2 de parede (a posição do golpe é o canto de cima/esquerda)
  // Ferramenta na mão: o alcance é o do nível dela (madeira 2 blocos, pedra/ferro 4), não o de construir
  let mtx = tx, mty = ty, mInRange = heldDef?.ferramenta ? toolCanReach(heldDef, tx, ty) : inRange, brush = null;
  if (heldDef?.ferramenta === 'martelo') {
    const [bx, by] = hammerBrushOrigin(m, smart && !smart.mob ? smart : null);
    game.target.brush = [bx, by];
    mInRange = toolCanReach(heldDef, bx, by, 2);
    const cells = wallBrushCells(bx, by);
    if (cells.length) {
      brush = cells; mtx = bx; mty = by;
    }
  }
  if (heldDef?.ferramenta) game.target.inRange = mInRange; // cursor vermelho fora do alcance da ferramenta
  const wall = brush ? world.getWall(brush[0][0], brush[0][1]) : world.getWall(tx, ty);
  // Espaço vazio com parede de fundo: só o martelo derruba a parede
  const wallMode = !!brush || (tile === TILE.AIR && wall !== WALL.NONE);
  const mtile = brush ? TILE.AIR : tile;
  const finishing=game.toolAction;
  if(finishing && finishing.hit && mtile===TILE.AIR && input.mouse.left && mInRange && held && held.item===finishing.item && game.selected===finishing.slot && mtx===finishing.tx && mty===finishing.ty){
    game.toolTicked=true;
    tickTool(game,dt,mtx,mty,finishing.tile,held,heldDef,finishing.wall);
    return;
  }
  if (input.mouse.left && mInRange && world.inBounds(mtx, mty) && (wallMode || (tile !== TILE.AIR && isFinite(TILE_DEFS[tile].hardness)))) {
    const tx = mtx, ty = mty;
    if (mining.tx !== tx || mining.ty !== ty || mining.wall !== wallMode) {
      mining.tx = tx;
      mining.ty = ty;
      mining.wall = wallMode;
      mining.progress = 0;
    }
    const kind = heldDef?.ferramenta;
    // Parede de fundo só sai com martelo; e o martelo não quebra bloco nenhum
    if (kind && wallMode !== (kind === 'martelo')) {
      mining.progress = 0;
      game.target.visible = false;
      if (!wallMode && game.toast.t <= 0) toast('O martelo só derruba paredes de fundo.');
    } else if(heldDef && ['picareta','machado','pa','martelo'].includes(kind)) {
      game.toolTicked = true;
      tickTool(game,dt,tx,ty,wallMode?WALL_SOURCE[wall]:tile,held,heldDef,wallMode?wall:0);
    } else {
      // Com a mão não quebra nada
      mining.progress = 0;
      game.target.visible = false;
      if (game.toast.t <= 0) toast('Com a mão não dá: use picareta, pá ou machado.');
    }
  } else {
    mining.progress = 0;
    // Ferramenta que também é arma batendo no vazio (nenhum bloco mirado, ou longe demais):
    // vira golpe em arco de arma, com hitbox própria (js/combat.js)
    if (heldDef?.danoCorpo && input.mouse.left) {
      cancelTool(game);
      game.swinging = false;
      game.target.visible = false;
      startSwordSwing(game, heldDef, m.x, m.y);
    }
  }

  game.placeCooldown -= dt;
  if (isDoor(tile)) {
    if (rightPressed && inRange) toggleDoor(tx, ty);
  } else if (TILE_DEFS[tile].sentar) {
    if (rightPressed && inRange) player.sitOn(world, tx, ty, chairFacing(world, tx, ty)); // cadeira: senta
  } else if (tile === TILE.CHEST) {
    if (rightPressed && inRange) openChest(tx, ty);
  } else if (input.mouse.right && heldDef?.cura && game.placeCooldown <= 0) {
    eatHeld(heldDef);
  } else if (input.mouse.right && inRange && game.placeCooldown <= 0) {
    if (tryPlace(tx, ty)) game.placeCooldown = 0.25; // evita abrir a porta recém-colocada no mesmo clique
  }
}

input.onKeyDown = (e, repeat) => {
  if(game.intro?.active||game.paused||game.npcOpen)return;
  if(game.inventoryUI.typeKey(e))return; // busca do livro de receitas: a tecla vira texto
  if(repeat)return;                      // os atalhos do jogo não repetem enquanto a tecla fica presa
  if (sharkKeyAction(game, e.code)) { e.preventDefault(); return; }
  if(e.code==='KeyJ'){NpcServices.open(game);return;}
  if(e.code==='KeyB'){Bestiary.open(game);return;} // js/bestiary.js
  if(e.code==='KeyG'){ItemGuide.open(game);return;}
  // Montado no elefante: E abre a bolsa dele (sela + carga), em vez do inventário
  if(e.code==='KeyE'&&!game.inventoryUI.open&&!game.mapUI.open&&game.mount&&openElephantBags(game))return;
  // Trocar ou soltar item cancela a escolha automática do cursor inteligente
  if (e.code === 'KeyQ' || e.code === 'KeyE' || e.code.startsWith('Digit')) endSmart();
  if (e.code === 'ControlLeft' || e.code === 'ControlRight') return; // cursor inteligente: vale enquanto Ctrl está segurado
  if (e.code === 'KeyQ' && !game.mapUI.open) { dropSelected(game, e.shiftKey); return; }
  if (e.code.startsWith('Digit')) {
    const n = parseInt(e.code.slice(5), 10);
    game.selected = n === 0 ? 9 : n - 1;
    playSfx('select');
    return;
  }
  switch (e.code) {
    case 'KeyE':
      if (game.mapUI.open) game.mapUI.close();
      game.inventoryUI.toggle();
      playSfx(game.inventoryUI.open ? 'invOpen' : 'invClose');
      break;
    case 'KeyC': // criação: bancada e livro de receitas (o mesmo botão embaixo do minimapa)
      if (game.mapUI.open) game.mapUI.close();
      game.inventoryUI.toggleBook();
      break;
    case 'KeyM': game.mapUI.toggle(); break;
    case 'KeyP': Menu.openPause(); break; // alternativa ao Esc (em tela cheia o navegador usa o Esc)
    case 'Escape':
      // Fecha uma camada por vez: mapa -> janela lateral -> inventário -> pausa
      if (game.mapUI.open) game.mapUI.close();
      else if (game.inventoryUI.open && !game.inventoryUI.held && game.inventoryUI.closeSide()) playSfx('invClose');
      else if (game.inventoryUI.open) game.inventoryUI.close();
      else Menu.openPause();
      break;
    case 'ShiftLeft': case 'ShiftRight': if (game.mount) dismountElephant(game); break;
    case 'KeyV': takeOffOutfit(game); break;
    case 'KeyH': game.showHelp = !game.showHelp; break;
    case 'F3': game.debug = !game.debug; break;
    case 'Equal': case 'NumpadAdd': game.zoom = Math.min(4, game.zoom + 1); clampCamera(); break;
    case 'Minus': case 'NumpadSubtract': game.zoom = Math.max(minZoom(), game.zoom - 1); clampCamera(); break;
  }
};

input.onWheel = (dir) => {
  if (game.mapUI.open) {
    game.mapUI.zoomAt(dir);
    return;
  }
  // Roda do mouse sobre o livro de receitas: rola a lista
  const ui = game.inventoryUI;
  if (ui.open && ui.craftOpen && ui.hitTest(input.mouse.x, input.mouse.y)) { ui.scrollBook(dir); return; }
  endSmart();
  game.selected = (game.selected + dir + HOTBAR_SIZE) % HOTBAR_SIZE;
  playSfx('select');
};

// ---------- Partículas soltas (poeira, faíscas, sangue, folhas...) ----------
// Cada uma anda sozinha; as que acabaram saem da lista sem mudar a ordem das outras.
function updateParticles(dt) {
  const list = game.particles;
  let kept = 0;
  for (let i = 0; i < list.length; i++) {
    const p = list[i];
    p.vy += (p.gravity ?? 600) * dt;
    // Folha: plana devagar, roda no ar, vaivém para os lados e pousa no chão
    if (p.leaf !== undefined) {
      p.leaf += dt * (p.spin || 4);
      if (p.rest) { p.vx = 0; p.vy = 0; }
      else {
        p.vy = Math.min(p.vy, p.fall || 32);
        p.vx *= Math.pow(0.25, dt); // o empurrão inicial some e ela passa a só planar
        const air = environmentWind(game, p.x, p.y);
        p.vx += air.x * dt * .65;
        p.vy += air.y * dt * .25;
        p.x += Math.sin(p.leaf) * (p.sway || 22) * dt;
        const below = Math.floor((p.y + 3) / T);
        if (p.vy > 0 && world.isSolid(Math.floor(p.x / T), below)) {
          p.rest = true; p.gravity = 0; p.spin = 0;
          p.y = below * T - 2;
          if (p.life > 1.4) { p.life = 1.4; p.maxLife = 1.4; } // descansa um instante e some
        }
      }
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.surfaceDebris && !weatherLit(world, p.x, p.y)) p.life = 0;
    p.life -= dt;
    if (p.life > 0) list[kept++] = p;
  }
  list.length = kept;
}

// ---------- Loop principal ----------
function update(dt) {
  if(game.intro?.active){updateOpening(game,dt);return;}
  if(game.adminOpen||game.paused||game.npcOpen)return;
  game.clock = (game.clock || 0) + dt; // segundos de jogo; o mato usa para voltar a crescer
  if (game.shake > 0) game.shake = Math.max(0, game.shake - dt * 30);
  // Impacto: congela o jogo por alguns frames (a tela continua sendo desenhada)
  if (game.hitStop > 0) {
    game.hitStop -= dt;
    return;
  }
  if (!game.adminFreezeTime) {
    const t = game.time + dt * (game.adminTimeScale || 1) / DAY_LENGTH; // painel admin: 5x
    if (t >= 1) { game.day++; toast(`Amanheceu · dia ${game.day}. Os moradores repuseram o estoque.`); }
    game.time = t % 1;
  }
  if (game.adminFly) {
    const dx = Number(input.down('KeyD') || input.down('ArrowRight')) - Number(input.down('KeyA') || input.down('ArrowLeft'));
    const dy = Number(input.down('KeyS') || input.down('ArrowDown')) - Number(input.down('KeyW') || input.down('ArrowUp') || input.down('Space'));
    const speed = input.down('ShiftLeft') ? 520 : 260, length = Math.hypot(dx, dy) || 1;
    player.vx = dx * speed / length; player.vy = dy * speed / length;
    player.moveX(player.vx * dt, world); player.moveY(player.vy * dt, world);
    player.x = clamp(player.x, 0, world.w * T - player.w);
    player.y = clamp(player.y, 0, world.h * T - player.h);
    if (dx) player.facing = dx;
    player.stepOffset = 0; player.visualTime += dt;
  } else if (!updateRiding(game, dt, input)) player.update(dt, input, world); // montado: o elefante anda (js/savanna.js)
  game.map.reveal(Math.floor(player.cx / T), Math.floor(player.cy / T), MAP_REVEAL_RADIUS);
  updateCamera(dt, false);
  const toolBefore = game.toolAction;
  game.toolTicked = false;
  updateChestUI(); // antes da interação: quebrar um baú lê o conteúdo já sincronizado
  updateAutoDoors();
  handleInteraction(dt);
  if(!game.toolTicked && toolBefore) cancelTool(game);
  updateCombat(game, dt);
  updateTrident(game, dt);
  updateToolEffects(dt);
  updateMobs(game, dt);
  game.swingTime = game.swinging ? game.swingTime + dt : 0;
  updateParticles(dt);
  updateCrashSite(game, dt);
  updateLavatory(game, dt);
  updateDrops(game, dt);
  updateCraftStations(game, dt);
  updateArrows(game, dt);
  updateFallingTrees(game, dt);
  updateFallingBlocks(game, dt);
  updateAmbientLeaves(game, dt); // folhas que caem das árvores por conta própria
  updateNpcs(game, dt);
  updateWater(game, dt);        // escorre, fôlego, respingos (js/water.js)
  updateLava(game, dt);         // mesmo fluxo e ondas, com magma e calor
  updateDragonflies(game, dt);
  updateEnvCritters(game, dt); // insetos que saíram do mato cortado (js/environment.js)
  updateBearLoot(game, dt);    // sangramento, onda sísmica, mel e o filhote (js/bear-loot.js)
  updateReferences(game,dt);
  updateFishing(game,dt);
  updateStory(game, dt);       // a piloto, os enigmas e o resgate (js/story.js)
  updateBossGear(game, dt);    // espólios do tigre e da Fiandeira (js/tiger-loot.js, js/spider-loot.js)
  updateBossFx(game, dt);      // efeitos soltos dos poderes de chefe (js/boss-fx.js)
  updateBeetleLoot(game, dt);  // escudo e mandíbula farejadora (js/beetle-loot.js)
  updateAquaticSpawns(game, dt); // peixes, águas-vivas, tubarões e baiacus (js/aquatic.js)
  updateCore(game, dt);        // lava, calor, gêiseres, magnetita e o Núcleo (js/core-life.js)
  updateSky(game, dt);         // correntes de vento, asa-delta e o céu (js/sky-life.js)
  updateGameSfx(game, dt);
  if (game.respawnPending) respawnPlayer(game);
  if ((game.grassTimer = (game.grassTimer ?? 1) - dt) <= 0) { game.grassTimer = 1; world.growGrass(Math.floor(player.cx / T), Math.floor(player.cy / T)); }
  if (game.toast.t > 0) game.toast.t -= dt;

  // Luz recalculada quando algo muda ou quando a câmera se afasta do centro da janela de luz
  const lcx = (game.cam.x + canvas.width / game.zoom / 2) / T, lcy = (game.cam.y + canvas.height / game.zoom / 2) / T;
  if (world.lightDirty || Math.abs(lcx - world.lcx) > 40 || Math.abs(lcy - world.lcy) > 24) {
    world.computeLight(lcx, lcy);
    world.lightDirty = false;
    game.lastDaylight = -1;
  }
  updateWeather(game, dt);
  updateSnowWeather(game,dt);
  updateYetiEvent(game,dt);
  updateEnvironment(game, dt);
  game.daylight = daylightAt(game.time) * (1 - 0.35 * game.weather.rain);
  if (Math.abs(game.daylight - game.lastDaylight) > 0.005) {
    world.composeLight(game.daylight);
    game.lastDaylight = game.daylight;
  }
}

let last = performance.now();
let acc = 0;
let fpsFrames = 0, fpsTime = 0;

function frame(now) {
  let dt = (now - last) / 1000;
  last = now;
  if (dt > 0.25) dt = 0.25;

  acc += dt;
  while (acc >= STEP) {
    update(STEP);
    acc -= STEP;
  }

  fpsFrames++;
  fpsTime += dt;
  if (fpsTime >= 0.5) {
    game.fps = Math.round(fpsFrames / fpsTime);
    fpsFrames = 0;
    fpsTime = 0;
  }

  try {
    renderer.render(game);
    GameCursor.update(game, input, canvas);
  } catch (e) {
    // Um erro de desenho num quadro não pode parar o jogo inteiro
    if (!frame.lastError || frame.lastError !== e.message) { frame.lastError = e.message; console.error('[quadro]', e); }
  }
  try { Music.update(game); } catch (e) { if (!frame.musicError) { frame.musicError = true; console.error('[música]', e); } }
  scheduleFrame();
}

// ---------- Taxa de quadros (Opções > Vídeo) ----------
// V-Sync: requestAnimationFrame (acompanha o monitor: 60, 75, 144, 165 Hz...)
// Sem limite: MessageChannel, desenha assim que o quadro anterior termina
// Limitado: espera com setTimeout e acerta o final com MessageChannel para não passar do alvo
const frameChannel = new MessageChannel();
let nextFrameDue = 0;
frameChannel.port1.onmessage = () => pumpFrame();

function pumpFrame() {
  const mode = GAME_OPTIONS.fpsMode;
  if (mode === 'vsync') { requestAnimationFrame(frame); return; }
  if (document.hidden) { setTimeout(() => frame(performance.now()), 100); return; } // aba escondida: devagar
  const now = performance.now();
  if (mode === 'limit') {
    const wait = nextFrameDue - now;
    if (wait > 2) { setTimeout(pumpFrame, wait - 1.5); return; }
    if (wait > 0) { frameChannel.port2.postMessage(0); return; }
    const interval = 1000 / clamp(GAME_OPTIONS.fpsLimit || 60, 15, 1000);
    nextFrameDue = nextFrameDue + interval < now ? now + interval : nextFrameDue + interval;
  }
  frame(now);
}

function scheduleFrame() {
  if (GAME_OPTIONS.fpsMode === 'vsync') requestAnimationFrame(frame);
  else frameChannel.port2.postMessage(0);
}

// Contador de FPS abaixo do minimapa (Opções > Vídeo > Mostrar FPS)
function drawFpsCounter(ctx, W) {
  if (!GAME_OPTIONS.showFps) return;
  const text = `${game.fps} FPS`;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.font = '11px Silkscreen, monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  // Abaixo do minimapa e do botão do livro
  const mm = game.mapUI.minimapRect(), book = game.inventoryUI.bookBtnRect();
  const w = Math.ceil(ctx.measureText(text).width) + 16, x = W - 12 - w;
  const y = Math.max(mm[1] + mm[3], book[1] + book[3]) + 10;
  ctx.fillStyle = 'rgba(10,12,15,0.82)'; ctx.fillRect(x, y, w, 20);
  ctx.fillStyle = UIC.lime; ctx.fillRect(x, y, 3, 20);
  ctx.fillStyle = game.fps >= 55 ? '#b8f07a' : game.fps >= 30 ? '#ffd27a' : '#ff8a70';
  ctx.fillText(text, W - 20, y + 14);
}

resize();
startOpening(game);
Menu.init(game); // menu principal -> criador de personagem -> abertura
update(0);
scheduleFrame();
