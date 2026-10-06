'use strict';
// =====================================================================================
//  MULTIJOGADOR (cliente)  —  servidor em server/server.js
// =====================================================================================
// Quem hospeda é a autoridade do mundo: monstros e bichos, clima, hora do dia e quem pega
// cada item do chão. Quem entra gera o mesmo mundo pela semente (a geração é determinística)
// e recebe só o que mudou desde então. Daí em diante cada um manda o que faz:
//   • o próprio boneco (20×/s): posição, quadro da animação, item na mão, vida
//   • blocos colocados/quebrados (todo mundo, em lotes), árvores tombando, mudas
//   • itens soltos (com id) — pegar passa pelo anfitrião, para dois não pegarem o mesmo
//   • baús (o conteúdo que mudou)
//   • o anfitrião manda os bichos (10×/s) e o clima/hora (2×/s); quem entra só desenha os
//     bichos (interpolados) e manda as pancadas que deu neles
// O inventário é de cada um. Chefes e encontros também pertencem ao anfitrião.

const NET_VERSION = 'valdoria-mp-5';
const NET_RATE = { state: 1 / 20, tiles: 1 / 15, mobs: 1 / 10, env: 1 / 2, chests: 1 / 2 };
const NET_INTERP = 0.12; // atraso de interpolação dos outros (s)

const NET = {
  ws: null, connected: false, connecting: false, server: '', pid: '', cid: 0, code: '', ip: '',
  friends: [], rooms: [], room: null, isHost: false, hostCid: 0,
  peers: new Map(),         // cid -> jogador remoto
  applying: false,          // aplicando algo que veio da rede (não reenviar)
  pendTiles: new Map(), pendWalls: new Map(), pendEx: {},
  timers: { state: 0, tiles: 0, mobs: 0, env: 0, chests: 0 },
  dropSeq: 0, mobSeq: 0, chestJson: new Map(), chat: [], joining: null, lastError: '',
  visualSeq:0,worldPaused:false,localMenu:null,
  get active() { return !!this.room; },
  get guest() { return !!this.room && !this.isHost; },
};

// ---------------------------------------------------------------- identidade e servidor
function netStore(k, v) { try { if (v === undefined) return localStorage.getItem('valdoria.' + k); localStorage.setItem('valdoria.' + k, v); } catch (_) { return null; } }
NET.pid = netStore('pid') || (() => { const id = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, '0')).join(''); netStore('pid', id); return id; })();
NET.server = netStore('server') || `ws://${location.hostname || 'localhost'}:8787/ws`;
const netName = () => (typeof PLAYER_LOOK !== 'undefined' && PLAYER_LOOK?.name) || 'Jogador';

function netConnect(force) {
  if (NET.connecting || (NET.connected && !force)) return;
  // socket antigo (troca de servidor / tentar de novo): solta os eventos dele, senão o fechamento dele
  // chega depois e derruba a conexão nova
  const old = NET.ws;
  if (old) { old.onopen = old.onclose = old.onmessage = old.onerror = null; try { old.close(); } catch (_) {} NET.ws = null; NET.connected = false; }
  NET.connecting = true; NET.lastError = '';
  let ws;
  try { ws = new WebSocket(NET.server); } catch (e) { NET.connecting = false; NET.lastError = 'Endereço inválido.'; netUi.refresh(); return; }
  NET.ws = ws;
  ws.onopen = () => { NET.connected = true; netStore('autoconnect', '1'); NET.connecting = false; NET.sentName = null; netSyncName(); netSend({ t: 'list' }); netUi.refresh(); };
  ws.onclose = () => {
    const was = NET.connected; NET.connected = false; NET.connecting = false; NET.ws = null;
    if (NET.room) { netEndSession(was ? 'A conexão com o servidor caiu.' : ''); }
    if (!was) NET.lastError = 'Não consegui falar com o servidor em ' + NET.server + '. Ele está rodando (node server/server.js)?';
    netUi.refresh();
  };
  ws.onmessage = (e) => { let m; try { m = JSON.parse(e.data); } catch (_) { return; } netOnServer(m); };
}
// o nome do personagem pode mudar depois de conectar: o servidor (amigos, salas) fica sabendo
function netSyncName() { if (NET.connected && NET.sentName !== netName()) { NET.sentName = netName(); netSend({ t: 'hello', pid: NET.pid, name: NET.sentName }); } }
// Liga o servidor do próprio PC (server/iniciar-servidor.php dispara o .bat) e espera a porta abrir.
// Só vale quando o endereço do servidor é esta máquina; um servidor remoto não dá para ligar daqui.
const netServerIsLocal = () => { try { const h = new URL(NET.server).hostname; return ['localhost', '127.0.0.1', '[::1]', location.hostname].includes(h); } catch (_) { return false; } };
async function netWaitConnected(ms) {
  const end = performance.now() + ms;
  while (!NET.connected && performance.now() < end) { if (!NET.connecting) netConnect(); await new Promise((r) => setTimeout(r, 300)); }
  return NET.connected;
}
let netStarting = null;
function netEnsureServer(say = () => {}) {
  if (NET.connected) return Promise.resolve(true);
  if (netStarting) return netStarting;
  netStarting = (async () => {
    try {
      say('Procurando o servidor…');
      if (await netWaitConnected(1500)) return true; // já estava ligado
      if (!netServerIsLocal()) { say('O servidor ' + NET.server + ' não responde. Ele fica em outro computador: peça para ligarem.'); return false; }
      say('Ligando o servidor…');
      try {
        const r = await fetch(new URL('server/iniciar-servidor.php', document.baseURI), { method: 'POST', headers: { 'X-Requested-With': 'Valdoria' } });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || !j.ok) throw new Error(j.error || 'Não foi possível ligar o servidor.');
      } catch (e) { say(e.message + ' Ligue na mão: server/iniciar-servidor.bat.'); return false; }
      say('Esperando o servidor ficar pronto…');
      if (await netWaitConnected(15000)) { say('Servidor ligado.'); return true; }
      say('O servidor foi iniciado mas não respondeu. Veja a janela preta que abriu (falta o Node.js?).');
      return false;
    } finally { netStarting = null; }
  })();
  return netStarting;
}
function netSend(m) {
  if (m.t !== 'hello' && NET.connected && NET.sentName !== netName()) netSyncName(); if (NET.ws?.readyState === 1) NET.ws.send(JSON.stringify(m)); }
function netRelay(data, to) { netSend(to != null ? { t: 'relay', to, data } : { t: 'relay', data }); }

// ---------------------------------------------------------------- mensagens do servidor
function netOnServer(m) {
  switch (m.t) {
    case 'welcome': NET.cid = m.cid; NET.code = m.code; NET.ip = m.ip; NET.friends = m.friends || []; break;
    case 'rooms': NET.rooms = m.rooms || []; break;
    case 'friends': NET.friends = m.friends || []; break;
    case 'friendAdded': netToast(m.byOther ? `${m.name} adicionou você como amigo.` : `${m.name} agora é seu amigo.`); break;
    case 'friendError': NET.lastError = m.error; break;
    case 'invite': netUi.invite(m); break;
    case 'hosted':
      NET.room = m.room; NET.isHost = true; NET.hostCid = NET.cid; NET.peers.clear();
      netSessionStart();
      netToast(`Mundo aberto! Código de convite: ${m.room.code}`);
      break;
    case 'joined':
      NET.room = m.room; NET.isHost = false; NET.hostCid = m.host.cid; NET.peers.clear();
      for (const p of [m.host, ...m.peers]) netPeer(p.cid, p.name);
      netBeginJoin(m.room);
      break;
    case 'joinFailed': NET.lastError = m.error; NET.joining = null; netUi.loadingDone?.(m.error); break;
    case 'peerJoin': netPeer(m.cid, m.name); netChatLine(`${m.name} entrou no mundo.`, '#9fd3ff'); break;
    case 'peerLeave': NET.peers.delete(m.cid); netChatLine(`${m.name} saiu do mundo.`, '#9fd3ff'); break;
    case 'roomClosed': netEndSession(m.reason); break;
    case 'left': break;
    case 'relay': netOnRelay(m.from, m.data); break;
  }
  netUi.refresh();
}

// ---------------------------------------------------------------- jogadores remotos
class NetPeer {
  constructor(cid, name) {
    this.cid = cid; this.name = name || 'Jogador'; this.look = null; this.atlas = null;
    this.x = 0; this.y = 0; this.w = 14; this.h = 42; this.vx = 0; this.vy = 0; this.facing = 1;
    this.frame = 0; this.item = null; this.hp = 100; this.tilt = 0; this.buf = []; this.seen = false; this.bubble = null;
    this.onGround = true; this.dead = false;
    this.anim = 0; this.visualTime = 0; this.jumpAge = 1; this.landTimer = 0; this.stepOffset = 0;
  }
  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }
  collides(w,x,y) { return Body.prototype.collides.call(this,w,x,y); }
  moveX(dx,w) { Body.prototype.moveX.call(this,dx,w); if(NET.isHost)netRelay({k:'push',dx},this.cid); }
  moveY(dy,w) { Body.prototype.moveY.call(this,dy,w); if(NET.isHost)netRelay({k:'push',dy},this.cid); }
}
function netPeer(cid, name) {
  if (cid === NET.cid) return null;
  let p = NET.peers.get(cid);
  if (!p) { p = new NetPeer(cid, name); NET.peers.set(cid, p); }
  if (name) p.name = name;
  return p;
}
// O atlas do boneco de outro jogador: a mesma folha de quadros, com a paleta da aparência dele
function netPeerAtlas(p) {
  if (p.atlas) return p.atlas;
  // O construtor do sprite lê a aparência GLOBAL (forma do cabelo, óculos, roupa) além da paleta.
  // Por isso troca a aparência inteira por um instante (não só as cores), e devolve tudo depois.
  const outfit = PLAYER_OUTFIT, mine = PLAYER_LOOK, preview = PLAYER_LOOK_PREVIEW;
  try {
    PLAYER_OUTFIT = p.outfitVisual || null;
    PLAYER_LOOK_PREVIEW = null;
    PLAYER_LOOK = sanitizeLook(p.look || mine);
    applyLookToPalette(PLAYER_LOOK);
    p.atlas = buildPlayerSprite();
  } finally {
    PLAYER_OUTFIT = outfit; PLAYER_LOOK = mine; PLAYER_LOOK_PREVIEW = preview;
    applyLookToPalette(preview || mine); // também limpa o cache da cabeça do jogador local
  }
  return p.atlas;
}

// ---------------------------------------------------------------- começar / terminar
function netSessionStart() {
  resetFishing(game);
  NET.worldPaused=false;NET.localMenu=null;
  NET.pendTiles.clear(); NET.pendWalls.clear(); NET.pendEx = {}; NET.chestJson.clear();
  for (const [k, slots] of game.chests) NET.chestJson.set(k, JSON.stringify(slots));
  for (const d of game.drops || []) d.n ??= netDropId();
}
function netEndSession(reason) {
  const wasGuest = NET.guest;
  NET.room = null; NET.isHost = false; NET.peers.clear(); NET.joining = null;
  resetFishing(game);
  NET.worldPaused=false;NET.localMenu=null;
  if (wasGuest) {
    game.adminFreezeWeather = false; game.monsterTimer = MONSTER_GRACE; game.mobSpawnTimer = 10;
    // Ao sair da sala, o retrato vira uma simulação local, inclusive os chefes.
    for (const m of game.mobs) if (m.netMirror) {
      delete m.netMirror; delete m.netBuf; delete m.netId;
      m.hit = m.constructor.prototype.hit;
    }
  }
  if (reason) { netToast(reason); netChatLine(reason, '#ffb3a0'); }
  netUi.refresh();
}
function netHost(visibility, name) {
  if (!world?.generated) return;
  netSend({ t: 'host', visibility, name, seed: world.seed, size: game.worldSize || 'pequeno', version: NET_VERSION, max: 6 });
}
function netLeave() { netSend({ t: 'leave' }); netEndSession(''); }
async function netJoin(target) {
  if (!NET.connected) return;
  try { if (!NET.guest && WorldSaves.active) await WorldSaves.save(false); }
  catch(e) { NET.lastError='Salve seu mundo antes de entrar: '+e.message;netUi.refresh();return; }
  NET.joining = { started: performance.now() }; NET.lastError = '';
  netSend({ t: 'join', ...target, version: NET_VERSION });
}

// Entrando: gera o mesmo mundo pela semente e pede ao anfitrião o que mudou
async function netBeginJoin(room) {
  const g = game;
  WorldSaves.active=null;WorldSaves.activeWorld=null;
  NET.joining = { room, snap: null, generated: false };
  netUi.showLoading(room);
  try {
    await newWorld(room.size || 'pequeno', (p, label) => netUi.loadingProgress(p, label), room.seed);
  } catch (e) { netEndSession('Falha ao gerar o mundo: ' + e.message); return; }
  if (!NET.room) return;
  finishOpening(g); applyOptions(g);
  g.mobs = []; g.boss = null; // inclusive os chefes vêm do anfitrião
  g.adminFreezeWeather = true;
  NET.joining.generated = true;
  netSessionStart();
  netRelay({ k: 'hello', name: netName(), look: PLAYER_LOOK });
  if (NET.joining.snap) netApplySnapshot(NET.joining.snap);
  else netUi.loadingProgress(1, 'Recebendo o mundo do anfitrião');
}

// ---------------------------------------------------------------- retrato do mundo (anfitrião -> quem entra)
function netRuns(indices, arr) {
  const sorted = [...indices].sort((a, b) => a - b), out = [];
  let run = null;
  for (const i of sorted) {
    if (run && i === run[0] + run.length - 1) run.push(arr[i]);
    else { run = [i, arr[i]]; out.push(run); }
  }
  return out;
}
function netSnapshot() {
  const w = world;
  const touched = w.touched || new Set(), walls = w.touchedWalls || new Set();
  for (const d of game.drops || []) d.n ??= netDropId();
  return {
    k: 'snap',
    tiles: netRuns(touched, w.tiles), walls: netRuns(walls, w.walls), water: netRuns(touched, w.water),
    species: [...(w.treeSpecies || [])], saplings: [...(w.saplings?.values() || [])],
    chests: [...game.chests].map(([k, s]) => [k, s]), pairs: [...game.chestPairs],
    drops: (game.drops || []).map(netDropView), time: game.time, day: game.day, clock: game.clock,
    fallingBlocks: fallingBlocksView(w),
    env: netEnvView(), host: { x: player.x, y: player.y },
    m: game.mobs.filter(netMirrorable).map(netMobView), encounter: netEncounterView(),
  };
}
function netApplyRuns(runs, arr, setter) {
  for (const run of runs || []) for (let j = 1; j < run.length; j++) setter(run[0] + j - 1, run[j], arr);
}
function netApplySnapshot(s) {
  const w = world;
  NET.applying = true;
  try {
    netApplyRuns(s.tiles, w.tiles, (i, v) => w.setTile(i % w.w, (i / w.w) | 0, v));
    netApplyRuns(s.walls, w.walls, (i, v) => w.setWall(i % w.w, (i / w.w) | 0, v));
    netApplyRuns(s.water, w.water, (i, v) => { w.water[i] = v; w.wakeWater?.(i % w.w, (i / w.w) | 0); });
    w.treeSpecies = new Map(s.species || []);
    w.saplings = new Map((s.saplings || []).map((r) => [r.y * w.w + r.x, r]));
    game.chests.clear(); for (const [k, slots] of s.chests || []) game.chests.set(k, slots);
    game.chestPairs.clear(); for (const [a, b] of s.pairs || []) game.chestPairs.set(a, b);
    game.drops = (s.drops || []).map((d) => ({ ...d, age: 0 }));
    applyFallingBlocksView(game, s.fallingBlocks || []);
    game.time = s.time; game.day = s.day; game.clock = s.clock;
    netApplyEnv(s.env);
    netApplyMobs(s);
    for (let x = 0; x < w.w; x++) w.computeSkyTop?.(x);
    w.lightDirty = true;
  } finally { NET.applying = false; }
  NET.chestJson.clear(); for (const [k, slots] of game.chests) NET.chestJson.set(k, JSON.stringify(slots));
  // aparece do lado do anfitrião
  player.x = s.host.x + 20; player.y = s.host.y - 4; player.vx = player.vy = 0;
  updateCamera(0, true);
  NET.joining = null;
  netUi.loadingDone();
  netToast('Você entrou no mundo de ' + (NET.peers.get(NET.hostCid)?.name || 'alguém') + '. Enter abre o chat.');
}

// ---------------------------------------------------------------- mensagens do jogo
function netOnRelay(from, d) {
  if (!d || !NET.room) return;
  const p = netPeer(from);
  switch (d.k) {
    case 'hello':
      if (p) netSetPeerLook(p, d);
      if (NET.isHost) netRelay(netSnapshot(), from);
      // quem já está no mundo se apresenta para o novato
      netRelay({ k: 'look', name: netName(), look: currentLook() }, from);
      break;
    case 'look': if (p) netSetPeerLook(p, d); break;
    case 'snap':
      if (NET.joining && !NET.joining.generated) NET.joining.snap = d;
      else netApplySnapshot(d);
      break;
    case 'st': if (p) netPeerState(p, d); break;
    case 'pause': if(NET.guest&&from===NET.hostCid)NET.worldPaused=!!d.paused;break;
    case 'tiles': netApplyTiles(d); break;
    case 'fallingBlocks': if (NET.guest && from === NET.hostCid) applyFallingBlocksView(game, d.bodies || []); break;
    case 'tree': netApplyTree(d); break;
    case 'dropAdd': netApplyDrop(d); break;
    case 'claim': if (NET.isHost) netHostClaim(d.n, from); break;
    case 'dropTake': netApplyTake(d); break;
    case 'mobs': if (NET.guest) netApplyMobs(d); break;
    case 'mobHit': if (NET.isHost) netHostMobHit(d, from); break;
    case 'mobGone': if (NET.isHost) { const m = game.mobs.find((x) => x.netId === d.id); if (m) m.despawn = true; } break;
    case 'env': if (NET.guest) netApplyEnv(d.env, d); break;
    case 'chest': netApplyChest(d); break;
    case 'chat': netChatLine(`${p?.name || '?'}: ${d.text}`); if (p) p.bubble = { text: d.text, t: 6 }; break;
  }
}

// ---------------------------------------------------------------- boneco
function netMyState() {
  const p = player, slot = game.inventory.slots[game.selected];
  return { k: 'st', x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10, vx: Math.round(p.vx), vy: Math.round(p.vy), f: p.facing,
    action: netActionView(), h:p.h, crouching:!!p.crouching, onGround:!!p.onGround, god:!!game.adminGod,
    motion:netPlayerMotion(p), equipment:netEquipmentView(),
    menu:netCurrentMenu(),pauseVote:netPauseVote(),
    view:{x:game.cam.x,y:game.cam.y,w:canvas.width/game.zoom,h:canvas.height/game.zoom},
    fr: NET.myFrame ?? 0, it: slot?.item ?? null, hp: Math.round(p.hp ?? 100), tl: Math.round((p.swimTilt || 0) * 100) / 100, s: (p.stepOffset || 0) | 0 };
}
function netPeerState(p, d) {
  const t = performance.now() / 1000;
  p.buf.push({ ...d, t });
  if (p.buf.length > 8) p.buf.shift();
  if (!p.seen) { p.x = d.x; p.y = d.y; p.seen = true; }
  p.vx = d.vx; p.vy = d.vy; p.facing = d.f; p.frame = d.fr; p.item = d.it; p.hp = d.hp; p.tilt = d.tl; p.step = d.s;
  p.h = d.h || 42; p.crouching = !!d.crouching; p.onGround = !!d.onGround; p.stepOffset = d.s || 0;
  p.action = d.action; p.actionAt=t; p.view = d.view; p.god = !!d.god; p.invulnerable ??= 0;
  p.menu=d.menu||null;p.pauseVote=!!d.pauseVote;
  p.renderAction=p.renderEquipment=p.renderPair=undefined;p.actionElapsed=undefined;
  Object.assign(p,d.motion || {}); p.swimTilt=p.tilt||0;
  const equipment=d.equipment || {};
  if(p.outfitVisual!==equipment.outfitVisual)p.atlas=null;
  p.outfitVisual=equipment.outfitVisual||null;p.equipment=equipment;
}
function netInterpPeers() {
  const now = performance.now() / 1000 - NET_INTERP;
  for (const p of NET.peers.values()) {
    netSamplePeer(p,now);
    if (p.bubble && (p.bubble.t -= 1 / 60) <= 0) p.bubble = null;
  }
}

// ---------------------------------------------------------------- blocos
{
  const baseSet = World.prototype.setTile, baseWall = World.prototype.setWall;
  World.prototype.setTile = function (x, y, t) {
    baseSet.call(this, x, y, t);
    if (this === world && NET.room && !NET.applying && this.inBounds(x, y)) NET.pendTiles.set(y * this.w + x, t);
  };
  World.prototype.setWall = function (x, y, wall) {
    baseWall.call(this, x, y, wall);
    if (!this.inBounds(x, y)) return;
    if (this.generated) (this.touchedWalls ??= new Set()).add(y * this.w + x);
    if (this === world && NET.room && !NET.applying) NET.pendWalls.set(y * this.w + x, wall);
  };
}
function netFlushTiles() {
  if (!NET.pendTiles.size && !NET.pendWalls.size) return;
  const w = world, c = [], wl = [], sp = {}, tr = {};
  for (const [i, t] of NET.pendTiles) {
    c.push(i, t);
    if (t === TILE.SAPLING) { const r = w.saplings?.get(i); if (r) sp[i] = r.species; }
    if (t === TILE.TRUNK) { const s = w.treeSpecies?.get(i % w.w); if (s) tr[i % w.w] = s; }
  }
  for (const [i, v] of NET.pendWalls) wl.push(i, v);
  NET.pendTiles.clear(); NET.pendWalls.clear();
  netRelay({ k: 'tiles', c, w: wl, sp, tr });
}
function netApplyTiles(d) {
  const w = world;
  NET.applying = true;
  try {
    for (const [x, s] of Object.entries(d.tr || {})) (w.treeSpecies ??= new Map()).set(+x, s);
    for (let j = 0; j < d.c.length; j += 2) {
      const i = d.c[j], t = d.c[j + 1], x = i % w.w, y = (i / w.w) | 0;
      if (w.tiles[i] === t) continue;
      w.setTile(x, y, t);
      if (t === TILE.SAPLING && d.sp?.[i]) (w.saplings ??= new Map()).set(i, { x, y, species: d.sp[i], age: 0, grow: SAPLING.cresce[0] + Math.random() * (SAPLING.cresce[1] - SAPLING.cresce[0]) });
      if (t === TILE.CHEST && !game.chests.has(i)) {
        const slots = new Array(CHEST_SLOTS).fill(null);
        game.chests.set(i, slots); NET.chestJson.set(i, JSON.stringify(slots));
      }
    }
    for (let j = 0; j < d.w.length; j += 2) { const i = d.w[j]; w.setWall(i % w.w, (i / w.w) | 0, d.w[j + 1]); }
  } finally { NET.applying = false; }
}

// ---------------------------------------------------------------- árvores tombando
function netApplyTree(d) {
  const w = world;
  if (!isWoodColumn(w.getTile(d.tx, d.ty)) && w.getTile(d.tx, d.ty) !== TILE.CACTUS) return;
  const before = (game.fallingTrees ??= []).length;
  NET.applying = true;
  try { startTreeFall(game, d.tx, d.ty); } finally { NET.applying = false; }
  const f = game.fallingTrees[before];
  if (f) { f.remote = true; f.dir = d.dir; }
}

// ---------------------------------------------------------------- itens no chão
const netDropId = () => NET.cid + ':' + (++NET.dropSeq);
const netDropView = (d) => ({ n: d.n, item: d.item, count: d.count, x: Math.round(d.x), y: Math.round(d.y), vx: d.vx, vy: d.vy, delay: d.delay });
function netApplyDrop(d) {
  if ((game.drops ||= []).some((x) => x.n === d.n)) return;
  game.drops.push({ ...d, age: 0 });
}
// chamado por updateDrops (js/item-actions.js) quando o jogador encosta num item: em rede,
// quem decide é o anfitrião. true = não pegue agora (pedido enviado ou já pedido).
function netClaimDrop(g, d) {
  if (!NET.room) return false;
  d.n ??= netDropId();
  if (NET.isHost) { netHostClaim(d.n, NET.cid); return true; }
  if (d.claimT > 0) return true;
  d.claimT = 0.6; // reenviar se o anfitrião não responder
  netRelay({ k: 'claim', n: d.n }, NET.hostCid);
  return true;
}
function netHostClaim(n, by) {
  const d = (game.drops || []).find((x) => x.n === n);
  if (!d || d.taken) return;
  d.taken = true;
  const msg = { k: 'dropTake', n, by, item: d.item, count: d.count };
  netRelay(msg);
  netApplyTake(msg);
}
function netApplyTake(m) {
  const list = game.drops || [], i = list.findIndex((x) => x.n === m.n);
  const d = i >= 0 ? list[i] : null;
  if (i >= 0) list.splice(i, 1);
  if (m.by !== NET.cid) return;
  const left = game.inventory.add(m.item, m.count);
  if (left < m.count) { playSfx('pickup'); toast(`+${m.count - left} ${ITEM_DEFS[m.item].name}`); }
  if (left > 0) dropItem(game, m.item, left, d ? d.x : player.cx, d ? d.y : player.cy, 0); // não coube: volta para o chão
}

// ---------------------------------------------------------------- baús
function netFlushChests() {
  for (const [k, slots] of game.chests) {
    const j = JSON.stringify(slots);
    if (NET.chestJson.get(k) === j) continue;
    NET.chestJson.set(k, j);
    netRelay({ k: 'chest', key: k, slots });
  }
}
function netApplyChest(d) {
  let a = game.chests.get(d.key);
  if (!a) { game.chests.set(d.key, a = []); }
  a.length = 0; a.push(...d.slots);
  NET.chestJson.set(d.key, JSON.stringify(a));
  // baú aberto na tela: a interface mostra o que mudou
  const ui = game.inventoryUI, src = ui.container?.source;
  if (src?.keys?.includes(d.key)) { const i = src.keys.indexOf(d.key); for (let j = 0; j < CHEST_SLOTS; j++) ui.container.slots[i * CHEST_SLOTS + j] = a[j] ?? null; }
}

// ---------------------------------------------------------------- bichos (anfitrião manda)
const NET_MOB_CLASS = () => ({ M: Monster, W: Wildlife, P: Pig });
const netMobCode = (m) => (m.constructor === Monster ? 'M' : m.constructor === Wildlife ? 'W' : m.constructor === Pig ? 'P' : null);
const netMirrorable = (m) => !m.dead && !m.despawn && netMobCode(m);
function netMobView(m) {
  m.netId ??= ++NET.mobSeq;
  const v = {};
  for (const key of Object.keys(m)) {
    const val = m[key];
    if (['netId','netBuf','def','rider','path','pathPoint','pathState'].includes(key) || key[0] === '_') continue;
    if (typeof val === 'number') v[key] = Number.isFinite(val) ? Math.round(val * 100) / 100 : 0;
    else if (typeof val === 'boolean' || typeof val === 'string') v[key] = val;
    else if (val === null) v[key] = null;
    else if (typeof val === 'object') { const copy = netPlain(val); if (copy !== undefined) v[key] = copy; }
  }
  return { id: m.netId, c: netMobCode(m), k: m.kind, v };
}
function netSendMobs() {
  const list = [];
  for (const m of game.mobs) if (netMirrorable(m)) list.push(netMobView(m));
  netRelay({ k: 'mobs', m: list, encounter: netEncounterView() });
}
function netApplyMobs(d) {
  const now = performance.now() / 1000, seen = new Set(), C = NET_MOB_CLASS();
  const byId = new Map(game.mobs.filter((m) => m.netMirror).map((m) => [m.netId, m]));
  for (const s of d.m || []) {
    seen.add(s.id);
    let m = byId.get(s.id);
    if (!m) {
      const K = C[s.c];
      if (!K || (s.c !== 'P' && !(s.c === 'M' ? MONSTERS : WILDLIFE)[s.k])) continue;
      m = s.c === 'P' ? new Pig(s.v.x, s.v.y) : new K(s.k, s.v.x, s.v.y);
      m.netMirror = true; m.netId = s.id; m.netBuf = [];
      Object.assign(m, s.v);
      m.hit = netMirrorHit;
      game.mobs.push(m);
    }
    m.netBuf.push({ t: now, v: s.v });
    if (m.netBuf.length > 4) m.netBuf.shift();
  }
  game.mobs = game.mobs.filter((m) => !m.netMirror || seen.has(m.netId));
  netApplyEncounter(d);
}
function netMirrorHit(damage, fromX) {
  this.hurtTimer = 0.3; // pisca já, o resto vem do anfitrião
  netRelay({ k: 'mobHit', id: this.netId, dmg: damage, fx: fromX }, NET.hostCid);
}
function netHostMobHit(d, from) {
  const m = game.mobs.find((x) => x.netId === d.id);
  const p = NET.peers.get(from);
  if (m && !m.dead && p && Number.isFinite(d.dmg) && d.dmg>0) netWithPlayer(game,p,()=>m.hit(d.dmg,d.fx));
}
// Quem entra: os espelhos andam entre os dois últimos retratos (números interpolados)
function netInterpMobs() {
  const now = performance.now() / 1000 - NET_INTERP;
  for (const m of game.mobs) {
    if (!m.netMirror || !m.netBuf.length) continue;
    const b = m.netBuf;
    let a = b[0], c = b[b.length - 1];
    for (let i = 0; i < b.length - 1; i++) if (b[i].t <= now && b[i + 1].t >= now) { a = b[i]; c = b[i + 1]; break; }
    const k = c.t > a.t ? clamp((now - a.t) / (c.t - a.t), 0, 1.5) : 1;
    for (const key in c.v) {
      const v1 = c.v[key], v0 = a.v[key];
      m[key] = ['x','y','vx','vy','gait','clock'].includes(key) && typeof v1 === 'number' && typeof v0 === 'number' && Math.abs(v1 - v0) < 400 ? v0 + (v1 - v0) * k : v1;
    }
  }
}
function netGuestMobs(g, dt) {
  g.monsterTimer = 1e9; g.mobSpawnTimer = 1e9;
  netInterpMobs();
  g.player.invulnerable = Math.max(0,(g.player.invulnerable || 0)-dt);
  g.mobs = g.mobs.filter(m => m.netMirror && !m.despawn);
}
// Anfitrião: monstros perseguem o jogador mais perto, não só ele
function netNearestPlayer(m, p) {
  if (!NET.isHost || !NET.room) return p;
  let best = p, bd = Infinity;
  for (const o of mobPlayers(game)) {
    const d = Math.hypot(o.cx - m.cx, o.cy - m.cy);
    if (d < bd) { bd = d; best = o; }
  }
  return best;
}
for (const K of [Monster, Wildlife, Pig]) {
  const base = K.prototype.update;
  K.prototype.update = function (dt, w, p) {
    const target = netNearestPlayer(this,p);
    return NET.isHost && NET.room ? netWithPlayer(game,target,() => base.call(this,dt,w,target)) : base.call(this,dt,w,target);
  };
}

// ---------------------------------------------------------------- clima e hora
function netEnvView() {
  const w = game.weather || {}, f = w.funnel;
  const keys = ['event', 'rain', 'sand', 'wind', 'targetWind', 'intensity', 'timer', 'lightning', 'hail', 'fog', 'tornadoLevel'];
  const o = {}; for (const k of keys) o[k] = w[k];
  o.mix = w.mix; o.funnel = f ? { x: f.x, y: f.y, strength: f.strength, age: f.age, vx: f.vx, seed: f.seed, height: f.height, radius: f.radius } : null;
  return o;
}
function netApplyEnv(env, d) {
  if (d) { if (Math.abs(game.time - d.time) > 0.003) game.time = d.time; game.day = d.day; }
  if (!env) return;
  const w = game.weather ??= createWeather();
  const { funnel, ...rest } = env;
  Object.assign(w, rest);
  if (!funnel) w.funnel = null;
  else if (!w.funnel) w.funnel = { ...funnel };
  else { w.funnel.x = lerp(w.funnel.x, funnel.x, 0.5); Object.assign(w.funnel, { ...funnel, x: w.funnel.x }); w.funnel.tx = funnel.x; }
}

// ---------------------------------------------------------------- chat
function netChatLine(text, color) {
  NET.chat.push({ text, color, t: performance.now() });
  if (NET.chat.length > 40) NET.chat.shift();
  netUi.drawChat();
}
function netSendChat(text) {
  text = String(text).trim().slice(0, 160);
  if (!text || !NET.room) return;
  netRelay({ k: 'chat', text });
  netChatLine(`${netName()}: ${text}`, '#ffe9a8');
  (NET.selfBubble = { text, t: 6 });
}
function netToast(text) { try { toast(text); } catch (_) {} }

// ---------------------------------------------------------------- ganchos no jogo
window.addEventListener('DOMContentLoaded', () => {
  // laço principal: em rede o mundo não pausa com o menu aberto
  const baseUpdate = update;
  update = function (dt) {
    netUpdateWorld(baseUpdate,dt);
    if (NET.room) netTick(dt);
  };
  const baseMobs = updateMobs;
  updateMobs = function (g, dt) { if (NET.guest) netGuestMobs(g, dt); else baseMobs(g, dt); };
  // pavio estourou aqui: o anfitrião tira o dele
  const baseExplode = explodeMonster;
  explodeMonster = function (g, m) { if (NET.guest && m.netMirror) return; return baseExplode(g, m); };
  // itens soltos ganham id e vão para os outros
  const baseDrop = dropItem;
  dropItem = function (g, item, count, x, y, dir) {
    const before = (g.drops ||= []).length;
    baseDrop(g, item, count, x, y, dir);
    const d = g.drops[before];
    if (d && NET.room) { d.n = netDropId(); if (!NET.applying) netRelay({ k: 'dropAdd', ...netDropView(d) }); }
  };
  // árvore tombando: os outros veem cair (e só quem derrubou solta a madeira)
  const baseFall = startTreeFall;
  startTreeFall = function (g, tx, ty) {
    const before = (g.fallingTrees ??= []).length;
    baseFall(g, tx, ty);
    const f = g.fallingTrees[before];
    if (NET.room && !NET.applying && f) netRelay({ k: 'tree', tx, ty, dir: f.dir });
  };
  const baseLand = landTree;
  landTree = function (g, f) {
    if (!f.remote) return baseLand(g, f);
    const keep = dropItem; dropItem = () => {};
    try { baseLand(g, f); } finally { dropItem = keep; }
  };
  // quadro do boneco que está na tela (para mandar igualzinho aos outros)
  const baseDrawPlayer = renderer.drawPlayer;
  renderer.drawPlayer = function (p, pose, sword, g) {
    if (p === game.player) {
      const fishingFrame=typeof fishingBodyFrame==='function'?fishingBodyFrame(g):null;
      NET.myFrame = pose ? playerAttackFrame(p, sword) : fishingFrame!=null?fishingFrame : g.trident?.anim ? tridentBodyFrame(g) : g.toolAction ? toolBodyFrame(g)
        : g.bow?.charging ? (p.crouching ? PLAYER_ANIMS.crawlAttack : PLAYER_ANIMS.attack + 2) : playerFrame(p);
    }
    return baseDrawPlayer.call(this, p, pose, sword, g);
  };
  const baseDrawMobs = renderer.drawMobs;
  renderer.drawMobs = function (...a) { baseDrawMobs.apply(this, a); if (NET.room) netDrawPeers(this.ctx); };
  netUi.install();
  // só reconecta sozinho quem já usou o multijogador (senão o servidor desligado vira erro no console à toa)
  if (netStore('autoconnect') === '1') netConnect();
});

function netTick(dt) {
  if (NET.joining) return;
  const T_ = NET.timers;
  const menu=netCurrentMenu();if(menu!==NET.localMenu){NET.localMenu=menu;T_.state=0;}
  netInterpPeers();
  for (const d of game.drops || []) if (d.claimT > 0) d.claimT -= dt;
  if ((T_.state -= dt) <= 0) { T_.state = NET_RATE.state; netRelay(netMyState()); }
  if ((T_.tiles -= dt) <= 0) {
    T_.tiles = NET_RATE.tiles; netFlushTiles();
    if (NET.isHost && NET.peers.size) {
      const bodies = fallingBlocksView(world);
      if (bodies.length || NET.hadFallingBlocks) netRelay({ k: 'fallingBlocks', bodies });
      NET.hadFallingBlocks = bodies.length > 0;
    }
  }
  if ((T_.chests -= dt) <= 0) { T_.chests = NET_RATE.chests; netFlushChests(); }
  if (NET.isHost && NET.peers.size) {
    if ((T_.mobs -= dt) <= 0) { T_.mobs = NET_RATE.mobs; netSendMobs(); }
    if ((T_.env -= dt) <= 0) { T_.env = NET_RATE.env; netRelay({ k: 'env', env: netEnvView(), time: game.time, day: game.day }); }
  }
  if (NET.selfBubble && (NET.selfBubble.t -= dt) <= 0) NET.selfBubble = null;
}

// ---------------------------------------------------------------- desenho dos outros
function netDrawPeers(ctx) {
  for (const p of NET.peers.values()) {
    if (!p.seen) continue;
    netDrawPeer(ctx,p);
    netDrawTag(ctx, p.cx, p.y - 6, p.name, p.hp, p.bubble);
    netDrawMenuBadge(ctx,p,p.menu);
  }
  if (NET.selfBubble) netDrawTag(ctx, player.cx, player.y - 6, '', null, NET.selfBubble);
}
function netDrawTag(ctx, x, y, name, hp, bubble) {
  ctx.save();
  ctx.font = '5px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  if (name) {
    const w = Math.ceil(ctx.measureText(name).width) + 4;
    ctx.fillStyle = 'rgba(10,12,20,0.6)'; ctx.fillRect(Math.round(x - w / 2), Math.round(y - 7), w, 7);
    ctx.fillStyle = '#ffffff'; ctx.fillText(name, Math.round(x), Math.round(y - 1));
    if (hp != null && hp < 100) { ctx.fillStyle = '#3a1418'; ctx.fillRect(Math.round(x - 8), Math.round(y), 16, 2); ctx.fillStyle = '#e04848'; ctx.fillRect(Math.round(x - 8), Math.round(y), Math.round(16 * clamp(hp / 100, 0, 1)), 2); }
  }
  if (bubble) {
    const lines = netWrap(ctx, bubble.text, 70).slice(0, 3), lh = 6, bw = Math.min(76, Math.max(...lines.map((l) => ctx.measureText(l).width)) + 6), bh = lines.length * lh + 3;
    const by = Math.round(y - (name ? 9 : 2) - bh), bx = Math.round(x - bw / 2);
    ctx.globalAlpha = Math.min(1, bubble.t);
    ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.fillRect(bx, by, Math.ceil(bw), bh); ctx.fillRect(Math.round(x - 1), by + bh, 2, 2);
    ctx.fillStyle = '#1b1b24'; lines.forEach((l, i) => ctx.fillText(l, Math.round(x), by + 2 + (i + 1) * lh));
  }
  ctx.restore();
}
function netWrap(ctx, text, max) {
  const out = []; let line = '';
  for (const word of text.split(/\s+/)) { const t = line ? line + ' ' + word : word; if (ctx.measureText(t).width > max && line) { out.push(line); line = word; } else line = t; }
  if (line) out.push(line);
  return out;
}

// =====================================================================================
//  INTERFACE: tela "Multijogador", convites, chat
// =====================================================================================
const NET_CSS = `
#net-chat{position:fixed;left:14px;bottom:150px;width:min(420px,60vw);font:13px/1.35 system-ui,sans-serif;color:#fff;pointer-events:none;z-index:40;text-shadow:0 1px 2px #000}
#net-chat .ln{background:rgba(12,14,22,.55);padding:2px 8px;border-radius:4px;margin-top:2px;width:fit-content;max-width:100%;transition:opacity .6s}
#net-chat input{pointer-events:auto;width:100%;box-sizing:border-box;margin-top:4px;padding:6px 8px;border:1px solid #c9a24a;background:rgba(12,14,22,.9);color:#fff;font:inherit;border-radius:4px;outline:none}
#net-invite{position:fixed;right:16px;top:120px;z-index:60;background:#1d1a24;border:2px solid #c9a24a;border-radius:8px;padding:12px 14px;color:#fff;font:14px system-ui,sans-serif;box-shadow:0 8px 30px #0008;max-width:300px}
#net-invite button{margin:8px 6px 0 0}
.net-top{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:10px 18px;border-bottom:1px solid #ffffff14;font-size:13px}
.net-pill{display:inline-flex;gap:6px;align-items:center;padding:2px 10px;border-radius:99px;background:#ffffff12;font-size:12px}
.net-pill i{width:8px;height:8px;border-radius:50%;background:#888;display:inline-block}
.net-pill.on i{background:#6fe08a;box-shadow:0 0 6px #6fe08a}.net-pill.off i{background:#ff7a66}
.net-me{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.net-me .net-code{font-size:16px}
.net-tabs{display:flex;gap:6px;padding:12px 18px 0}
.net-tab{flex:1;padding:9px 6px;border:1px solid #3b3446;border-bottom:none;border-radius:8px 8px 0 0;background:#0005;color:#c9bfa8;cursor:pointer;font:inherit;text-transform:uppercase;letter-spacing:.05em}
.net-tab:hover{background:#ffffff10}.net-tab[aria-selected=true]{background:#8a6a24;color:#fff;border-color:#e7c879}
.net-tab small{display:inline-block;min-width:16px;margin-left:5px;padding:0 5px;border-radius:9px;background:#0007;font-size:11px}
.net-wrap{display:grid;gap:12px;max-height:56vh;overflow:auto;padding:14px 18px 16px;align-content:start}
.net-wrap[hidden],.net-wrap section[hidden],.net-tabs[hidden],[data-net-hide]{display:none!important}
.net-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.net-row>input{flex:1;min-width:140px}
.net-wrap input[type=text],.net-wrap select{padding:9px 11px;border-radius:6px;border:1px solid #6b5a3a;background:#14121a;color:#fff;font:inherit;outline:none}
.net-wrap input[type=text]:focus{border-color:#e7c879;box-shadow:0 0 0 2px #e7c87933}
.net-box{border:1px solid #3b3446;border-radius:8px;padding:12px 14px;background:#0006}
.net-box h3{margin:0 0 4px;font-size:14px;letter-spacing:.04em;text-transform:uppercase;color:#e7c879}
.net-box>p{margin:0 0 10px}
.net-list{display:grid;gap:6px;margin-top:8px}
.net-item{display:flex;gap:10px;align-items:center;justify-content:space-between;padding:8px 10px;border-radius:6px;background:#ffffff0d}
.net-item small{opacity:.7;display:block}
.net-item b{font-weight:600}
.net-tag{font-size:11px;padding:1px 7px;border-radius:9px;background:#c9a24a33;color:#f1d58e;margin-left:6px;white-space:nowrap}
.net-code{font:700 18px monospace;letter-spacing:.15em;color:#f1d58e;user-select:all}
.net-banner{margin:10px 18px 0;padding:9px 12px;border-radius:6px;background:#ff7a6622;border:1px solid #ff7a6666;color:#ffc2b8;font-size:13px;display:flex;gap:10px;justify-content:space-between;align-items:center}
.net-banner[hidden]{display:none}
.net-small{font-size:12px;opacity:.75;line-height:1.45}
.net-btn{padding:8px 14px;border-radius:6px;border:1px solid #c9a24a;background:#2a2433;color:#fff;cursor:pointer;font:inherit}
.net-btn:hover{background:#3a3146}.net-btn.primary{background:#8a6a24;border-color:#e7c879}.net-btn.primary:hover{background:#a47e2c}
.net-btn.warn{background:#7a2c2c;border-color:#ff9f8f}.net-btn.sm{padding:3px 9px;font-size:12px}.net-btn:disabled{opacity:.4;cursor:default}
.net-vis{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:8px 0 12px}
.net-vis label{display:flex;gap:9px;align-items:flex-start;padding:9px 10px;border:1px solid #3b3446;border-radius:8px;cursor:pointer;background:#ffffff08}
.net-vis label:hover{background:#ffffff12}
.net-vis input{margin-top:3px;accent-color:#e7c879}
.net-vis label:has(input:checked){border-color:#e7c879;background:#8a6a2433}
.net-vis b{display:block;font-weight:600}.net-vis span{font-size:12px;opacity:.75;line-height:1.35}
.net-empty{padding:12px;text-align:center;opacity:.7;font-size:13px}
.net-room{border-color:#6fe08a88;background:#12301c66}
.net-steps{margin:8px 0 12px;padding-left:20px;line-height:1.7}
.net-adv{border:1px dashed #3b3446;border-radius:8px;padding:8px 12px}.net-adv summary{cursor:pointer;opacity:.8}
@media (max-width:640px){.net-vis{grid-template-columns:1fr}.net-tab{font-size:12px}}
`;
const netUi = {
  root: null, el: null, chatEl: null, chatOpen: false, tab: null, armed: null, cache: {},
  esc: (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
  $(s) { return this.el.querySelector(s); },
  install() {
    const st = document.createElement('style'); st.textContent = NET_CSS; document.head.append(st);
    const mroot = Menu.root;
    // Esqueleto fixo: os campos NUNCA são recriados (assim não perdem foco nem texto);
    // só as listas e os textos de status são atualizados (refresh).
    const sec = document.createElement('section');
    sec.className = 'screen dim'; sec.dataset.screen = 'multi'; sec.hidden = true;
    sec.innerHTML = `<div class="panel" role="dialog" aria-labelledby="net-title" style="width:min(780px,95vw)">
      <header class="panel-head"><div><h2 id="net-title">Multijogador</h2><p>Jogue o mesmo mundo com outras pessoas.</p></div></header>
      <div class="net-top"><span class="net-pill" id="net-conn"><i></i><span></span></span>
        <span class="net-me">Você: <b id="net-myname"></b> · seu código de amigo: <span class="net-code" id="net-mycode">------</span><button class="net-btn sm" data-net="copy-mine">Copiar</button></span></div>
      <div class="net-banner" id="net-banner" hidden><span></span><button class="net-btn sm" data-net="dismiss">OK</button></div>
      <div id="net-body">
        <div class="net-wrap" id="net-offline" hidden>
          <div class="net-box"><h3>Sem conexão com o servidor</h3><p class="net-small">Para entrar no mundo de alguém, o servidor dele precisa estar ligado e o endereço certo (veja em “Configurações do servidor”).<br>Quer jogar com os outros no seu PC? Vá na aba <b>Hospedar</b>: o servidor é ligado sozinho.</p>
            <div class="net-row"><button class="net-btn primary" data-net="tab" data-tab="host">Ir para Hospedar</button><button class="net-btn" data-net="reconnect">Tentar de novo</button></div></div>
        </div>
        <div class="net-wrap" id="net-room-wrap" hidden>
          <div class="net-box net-room"><h3 id="net-room-title"></h3><div id="net-room-info"></div></div>
        </div>
        <div class="net-tabs" id="net-tabs" role="tablist">
          <button class="net-tab" role="tab" data-net="tab" data-tab="join">Entrar<small id="net-n-rooms">0</small></button>
          <button class="net-tab" role="tab" data-net="tab" data-tab="host">Hospedar</button>
          <button class="net-tab" role="tab" data-net="tab" data-tab="friends">Amigos<small id="net-n-friends">0</small></button>
        </div>
        <div class="net-wrap" id="net-pages">
          <section data-page="join">
            <div class="net-box"><h3>Entrar com um código</h3><p class="net-small">Peça ao anfitrião o código de 5 letras do mundo dele.</p>
              <div class="net-row" data-enter="join-code"><input type="text" id="net-join-code" maxlength="5" placeholder="Ex.: K7Q2M" autocomplete="off" spellcheck="false"><button class="net-btn primary" data-net="join-code" id="net-join-btn" disabled>Entrar</button></div></div>
            <div class="net-box" style="margin-top:12px"><div class="net-row" style="justify-content:space-between"><h3 style="margin:0">Mundos abertos agora</h3><button class="net-btn sm" data-net="refresh">Atualizar</button></div>
              <p class="net-small" style="margin:4px 0 0">Aparecem aqui os mundos públicos, os de amigos e os da sua rede.</p><div class="net-list" id="net-rooms"></div></div>
          </section>
          <section data-page="host" hidden>
            <div class="net-box" id="net-host-form"><h3>Abrir um mundo para outras pessoas</h3>
              <p class="net-small" id="net-host-note"></p>
              <div class="net-row"><input type="text" id="net-room-name" maxlength="40" placeholder="Nome do mundo" autocomplete="off"></div>
              <div class="net-small" style="margin-top:10px">Quem pode entrar?</div>
              <div class="net-vis" id="net-vis">
                <label><input type="radio" name="net-vis" value="friends" checked><div><b>Só amigos</b><span>Quem está na sua lista de amigos.</span></div></label>
                <label><input type="radio" name="net-vis" value="lan"><div><b>Mesma rede</b><span>Quem está no mesmo Wi-Fi ou rede que você.</span></div></label>
                <label><input type="radio" name="net-vis" value="public"><div><b>Pública</b><span>Aparece na lista para qualquer jogador.</span></div></label>
                <label><input type="radio" name="net-vis" value="private"><div><b>Só com código</b><span>Não aparece na lista; entra quem tiver o código.</span></div></label>
              </div>
              <button class="net-btn primary" data-net="host" id="net-host-btn">Abrir meu mundo</button>
              <p class="net-small" id="net-host-status" role="status" style="margin:10px 0 0"></p></div>
          </section>
          <section data-page="friends" hidden>
            <div class="net-box"><h3>Adicionar um amigo</h3><p class="net-small">Cada jogador tem um código de 6 letras (está no topo desta tela). Troquem os códigos para virarem amigos.</p>
              <div class="net-row" data-enter="add-friend"><input type="text" id="net-friend-code" maxlength="6" placeholder="Código de 6 letras" autocomplete="off" spellcheck="false"><button class="net-btn primary" data-net="add-friend" id="net-friend-btn" disabled>Adicionar</button></div></div>
            <div class="net-box" style="margin-top:12px"><h3>Seus amigos</h3><div class="net-list" id="net-friends"></div></div>
          </section>
        </div>
      </div>
      <div class="net-wrap" style="padding-top:0"><details class="net-adv" id="net-adv"><summary>Configurações do servidor (avançado)</summary>
        <div class="net-row" style="margin-top:8px" data-enter="server"><input type="text" id="net-server" autocomplete="off" spellcheck="false"><button class="net-btn" data-net="server">Conectar</button></div>
        <p class="net-small" style="margin:8px 0 0">Mesma rede: quem hospeda liga o servidor e os outros abrem o jogo pelo IP dele (ex.: http://192.168.0.10/jogo-teste/). Pela internet: use o endereço de um servidor publicado (wss://…).</p></details></div>
      <nav class="menu-list pad"><button class="btn" data-action="back">Voltar</button></nav></div>`;
    mroot.append(sec);
    this.el = sec;
    this.$('#net-server').value = NET.server;
    // botões no menu principal e na pausa
    mroot.querySelector('.main-nav [data-go="howto"]')?.insertAdjacentHTML('beforebegin', '<button class="btn" data-go="multi"><span>Multijogador</span><i>Hospedar, entrar e amigos</i></button>');
    mroot.querySelector('[data-screen="pause"] [data-go="howto"]')?.insertAdjacentHTML('beforebegin', '<button class="btn" data-go="multi">Multijogador</button>');
    sec.addEventListener('click', (e) => this.onClick(e));
    // O menu engole as teclas (keydown); Enter nos campos é tratado no keyup
    sec.addEventListener('keyup', (e) => {
      if (e.code !== 'Enter' && e.code !== 'NumpadEnter') return;
      const row = e.target.closest?.('[data-enter]');
      const btn = row?.querySelector('.net-btn:not(:disabled)');
      if (btn) btn.click();
    });
    sec.addEventListener('input', (e) => {
      const t = e.target;
      if (t.id === 'net-join-code' || t.id === 'net-friend-code') {
        const at = t.selectionStart; t.value = t.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); t.setSelectionRange(at, at);
        this.$('#net-join-btn').disabled = this.$('#net-join-code').value.length < 5;
        this.$('#net-friend-btn').disabled = this.$('#net-friend-code').value.length < 6;
      }
    });
    // abandonou o fluxo de "criar mundo para hospedar" (voltou/cancelou): esquece o pedido
    const baseRender = Menu.render.bind(Menu);
    Menu.render = () => { if (NET.pendingHost && !['world', 'creator', 'loading'].includes(Menu.current())) NET.pendingHost = null; baseRender(); };
    const baseGo = Menu.go.bind(Menu);
    Menu.go = (id, reset) => {
      baseGo(id, reset);
      if (id !== 'multi') return;
      this.armed = null;
      if (!NET.connected) netConnect();
      netSend({ t: 'list' }); netSend({ t: 'friends' });
      const inGame = this.inGame();
      this.tab = NET.room ? 'friends' : (inGame && !this.tab ? 'host' : this.tab || 'join');
      if (!this.$('#net-room-name').value) this.$('#net-room-name').value = 'Mundo de ' + netName();
      this.refresh();
      // foco no campo certo (só aqui, ao abrir a tela — nunca durante as atualizações)
      setTimeout(() => this.$(this.tab === 'host' ? '#net-room-name' : this.tab === 'join' ? '#net-join-code' : '#net-friend-code')?.focus(), 30);
    };
    // "Hospedar" no menu principal: cria o mundo e abre assim que ele ficar pronto
    const baseNewWorld = newWorld;
    newWorld = async function (...a) {
      const r = await baseNewWorld.apply(this, a);
      const p = NET.pendingHost;
      if (p) { NET.pendingHost = null; netEnsureServer().then((ok) => { if (ok) setTimeout(() => netHost(p.visibility, p.name), 300); else netToast('O servidor não está ligado: o mundo não foi aberto para os outros.'); }); }
      return r;
    };
    // chat
    this.chatEl = document.createElement('div'); this.chatEl.id = 'net-chat'; document.body.append(this.chatEl);
    window.addEventListener('keydown', (e) => {
      if (!NET.room || this.chatOpen || !Menu.root.hidden || game.inventoryUI?.open || e.repeat || e.target instanceof HTMLInputElement || game.adminOpen || game.npcOpen) return;
      if (e.code === 'Enter' || e.code === 'NumpadEnter') { e.preventDefault(); e.stopImmediatePropagation(); this.openChat(); }
    }, true);
    setInterval(() => { this.drawChat(); if (this.current() && NET.connected) netSend({ t: 'list' }); }, 3000);
  },
  current: () => !!Menu.root && !Menu.root.hidden && Menu.current() === 'multi',
  inGame: () => !!world?.generated && game.openingComplete !== false && !Menu.stack.includes('main'),
  // Só mexe no que mudou: listas e textos. Nunca recria campos.
  setHtml(sel, html) { if (this.cache[sel] !== html) { this.cache[sel] = html; this.$(sel).innerHTML = html; } },
  setText(sel, text) { const el = this.$(sel); if (el.textContent !== text) el.textContent = text; },
  refresh() {
    if (!this.el || !this.current()) return;
    const e = this.esc, inGame = this.inGame(), inRoom = !!NET.room;
    const conn = this.$('#net-conn'); conn.className = 'net-pill ' + (NET.connected ? 'on' : 'off');
    this.setText('#net-conn span', NET.connected ? 'Conectado ao servidor' : NET.connecting ? 'Conectando…' : 'Sem conexão');
    this.setText('#net-myname', netName()); this.setText('#net-mycode', NET.code || '------');
    this.$('#net-mycode').nextElementSibling.hidden = !NET.code;
    const banner = this.$('#net-banner'), msg = NET.lastError;
    banner.hidden = !msg; if (msg) banner.firstElementChild.textContent = msg;
    // abas sempre visíveis (menos dentro de uma sala, onde só sobra a de amigos para convidar).
    // Sem servidor, só a aba Hospedar funciona: ela liga o servidor sozinha.
    const online = NET.connected;
    this.$('#net-tabs').hidden = inRoom;
    if (!['join', 'host', 'friends'].includes(this.tab)) this.tab = 'join';
    if (inRoom && this.tab !== 'friends') this.tab = 'friends';
    for (const t of this.el.querySelectorAll('.net-tab')) t.setAttribute('aria-selected', t.dataset.tab === this.tab);
    this.$('#net-offline').hidden = online || this.tab === 'host';
    this.$('#net-pages').hidden = !online && this.tab !== 'host';
    this.$('#net-room-wrap').hidden = !(online && inRoom);
    for (const p of this.el.querySelectorAll('[data-page]')) p.hidden = p.dataset.page !== this.tab;
    this.$('#net-host-form').hidden = inRoom;
    if (!this.$('#net-host-btn').disabled || online) this.setText('#net-host-btn', (online ? '' : 'Ligar o servidor e ') + (inGame ? 'abrir meu mundo agora' : 'criar um mundo e abrir'));
    this.setText('#net-host-note', (online ? '' : 'O servidor do jogo não está ligado: ele é ligado automaticamente quando você clicar. ')
      + (inGame ? 'Seu mundo atual fica aberto e você continua jogando normalmente; os outros entram nele.'
        : 'Você ainda não está em um mundo: depois do servidor, escolhemos o tamanho e o personagem como num jogo novo, e o mundo é aberto assim que ficar pronto.'));
    if (!online) return;
    const vis = { public: 'Pública', lan: 'Mesma rede', friends: 'Só amigos', private: 'Só com código' };
    // abas: dentro de uma sala só faz sentido a de amigos (convidar)
    const tabs = this.el.querySelectorAll('.net-tab');
    for (const t of tabs) { t.hidden = inRoom && t.dataset.tab !== 'friends'; t.setAttribute('aria-selected', t.dataset.tab === this.tab); }
    if (inRoom && this.tab !== 'friends') this.tab = 'friends';
    if (!inRoom && !['join', 'host', 'friends'].includes(this.tab)) this.tab = 'join';
    for (const p of this.el.querySelectorAll('[data-page]')) p.hidden = p.dataset.page !== this.tab;
    // sala atual
    if (inRoom) {
      const peers = [...NET.peers.values()], hostName = NET.peers.get(NET.hostCid)?.name || '';
      this.setText('#net-room-title', NET.isHost ? 'Você está hospedando este mundo' : 'Você está no mundo de ' + hostName);
      this.setHtml('#net-room-info', `<div class="net-row"><b>${e(NET.room.name)}</b><span class="net-tag">${vis[NET.room.visibility] || ''}</span></div>
        ${NET.room.code ? `<div class="net-row" style="margin:8px 0">Código para entrar: <span class="net-code">${e(NET.room.code)}</span><button class="net-btn sm" data-net="copy" data-text="${e(NET.room.code)}">Copiar</button></div>` : ''}
        <div class="net-small" style="margin-bottom:10px">No mundo agora: ${[netName() + ' (você)', ...peers.map((p) => p.name)].map(e).join(', ')}</div>
        <button class="net-btn warn" data-net="leave">${NET.isHost ? 'Fechar o mundo para os outros' : 'Sair deste mundo'}</button>`);
    }
    // aba Entrar
    const rooms = NET.rooms.filter((r) => r.id !== NET.room?.id);
    this.setText('#net-n-rooms', String(rooms.length));
    const lose = inGame && !inRoom;
    const joinBtn = (id, code) => this.armed === id
      ? `<button class="net-btn warn" data-net="join" data-id="${e(id)}">Sair do meu mundo e entrar</button>`
      : `<button class="net-btn primary" data-net="join" data-id="${e(id)}">Entrar</button>`;
    this.setHtml('#net-rooms', rooms.length ? rooms.map((r) => `<div class="net-item"><div><b>${e(r.name)}</b>${r.friend ? '<span class="net-tag">amigo</span>' : ''}${r.lan ? '<span class="net-tag">sua rede</span>' : ''}${r.visibility === 'public' ? '<span class="net-tag">pública</span>' : ''}<small>anfitrião ${e(r.host)} · ${r.players}/${r.max} jogadores</small></div>${joinBtn(r.id)}</div>`).join('')
      : '<div class="net-empty">Nenhum mundo aberto no momento.<br>Peça para alguém abrir um, ou use um código acima.</div>');
    // aba Hospedar
    // aba Amigos
    this.setText('#net-n-friends', String(NET.friends.length));
    this.setHtml('#net-friends', NET.friends.length ? NET.friends.map((f) => `<div class="net-item"><div><b>${e(f.name)}</b><small>${f.online ? (f.room ? 'jogando em “' + e(f.room.name) + '”' : 'online') : 'offline'}</small></div>
      <div class="net-row">${inRoom && NET.isHost && f.online && !f.room ? `<button class="net-btn sm primary" data-net="invite" data-pid="${e(f.pid)}">Convidar</button>` : ''}${!inRoom && f.room ? joinBtn(f.room.id) : ''}<button class="net-btn sm" data-net="unfriend" data-pid="${e(f.pid)}" title="Remover amigo">Remover</button></div></div>`).join('')
      : '<div class="net-empty">Você ainda não tem amigos adicionados.<br>Passe o seu código para alguém, ou digite o dele acima.</div>');
    this.$('#net-server').placeholder = NET.server;
    this.setText('[data-net="server"]', NET.connected ? 'Trocar' : 'Conectar');
  },
  onClick(ev) {
    const b = ev.target.closest('[data-net]');
    if (!b) return;
    const v = (s) => this.$(s).value.trim();
    NET.lastError = '';
    switch (b.dataset.net) {
      case 'tab': this.tab = b.dataset.tab; break;
      case 'dismiss': break;
      case 'reconnect': netConnect(true); break;
      case 'refresh': netSend({ t: 'list' }); netSend({ t: 'friends' }); break;
      case 'host': {
        const visibility = this.$('input[name="net-vis"]:checked').value, name = v('#net-room-name') || 'Mundo de ' + netName();
        const btn = this.$('#net-host-btn'), say = (t) => { this.$('#net-host-status').textContent = t; };
        btn.disabled = true;
        // liga o servidor se precisar, e só então abre o mundo (ou vai criar um)
        netEnsureServer(say).then((ok) => {
          btn.disabled = false;
          if (!ok) { this.refresh(); return; }
          say('');
          if (this.inGame()) netHost(visibility, name);
          else { NET.pendingHost = { visibility, name }; Menu.go('world'); }
        });
        return;
      }
      case 'leave': netLeave(); break;
      case 'join': case 'join-code': {
        const target = b.dataset.net === 'join' ? { id: b.dataset.id } : { code: v('#net-join-code') };
        const key = target.id || target.code;
        this.armed = null; netJoin(target);
        break;
      }
      case 'add-friend': netSend({ t: 'addFriend', code: v('#net-friend-code') }); this.$('#net-friend-code').value = ''; this.$('#net-friend-btn').disabled = true; break;
      case 'unfriend': netSend({ t: 'removeFriend', pid: b.dataset.pid }); break;
      case 'invite': netSend({ t: 'invite', pid: b.dataset.pid }); netToast('Convite enviado.'); break;
      case 'server': NET.server = v('#net-server'); netStore('server', NET.server); netConnect(true); break;
      case 'copy': case 'copy-mine': {
        const text = b.dataset.net === 'copy' ? b.dataset.text : NET.code;
        navigator.clipboard?.writeText(text).catch(() => {});
        const old = b.textContent; b.textContent = 'Copiado!'; setTimeout(() => { b.textContent = old; }, 1200);
        return;
      }
    }
    this.cache['#net-rooms'] = this.cache['#net-friends'] = null;
    this.refresh();
  },
  invite(m) {
    document.getElementById('net-invite')?.remove();
    const d = document.createElement('div'); d.id = 'net-invite';
    d.innerHTML = `<b>${this.esc(m.from)}</b> convidou você para <b>${this.esc(m.room.name)}</b>.<div><button class="net-btn primary">Entrar</button><button class="net-btn">Agora não</button></div>`;
    document.body.append(d);
    const [yes, no] = d.querySelectorAll('button');
    yes.onclick = () => { d.remove(); netJoin({ code: m.room.code }); };
    no.onclick = () => d.remove();
    setTimeout(() => d.remove(), 30000);
  },
  // carregando o mundo de outra pessoa: usa a tela de carregamento do menu
  showLoading(room) {
    Menu.go('loading', true);
    Menu.atlas = renderer.playerAtlas;
    const t0 = performance.now();
    cancelAnimationFrame(Menu.raf);
    const loop = (now) => { Menu.drawLoading(now, now - t0); Menu.raf = requestAnimationFrame(loop); };
    Menu.raf = requestAnimationFrame(loop);
    this.loadingProgress(0, 'Entrando em ' + room.name);
  },
  loadingProgress(p, label) { Menu.setLoading(p, label); },
  loadingDone(error) {
    cancelAnimationFrame(Menu.raf);
    if (error) { if (Menu.current() === 'loading') Menu.go('multi', true); return; }
    Menu.close(); game.paused = false;
  },
  openChat() {
    this.chatOpen = true;
    const inp = document.createElement('input'); inp.maxLength = 160; inp.placeholder = 'Mensagem (Enter envia, Esc cancela)';
    this.chatEl.append(inp); inp.focus();
    input.keys.clear();
    const close = () => { this.chatOpen = false; inp.remove(); this.drawChat(); };
    inp.addEventListener('keydown', (e) => {
      e.stopPropagation(); e.stopImmediatePropagation();
      if (e.code === 'Enter' || e.code === 'NumpadEnter') { netSendChat(inp.value); close(); }
      else if (e.code === 'Escape') close();
    });
    inp.addEventListener('keyup', (e) => e.stopPropagation());
    inp.addEventListener('blur', close);
    this.drawChat();
  },
  drawChat() {
    if (!this.chatEl) return;
    const now = performance.now(), inp = this.chatEl.querySelector('input');
    const lines = NET.chat.filter((l) => this.chatOpen || now - l.t < 12000).slice(-8);
    this.chatEl.querySelectorAll('.ln').forEach((n) => n.remove());
    for (const l of lines) {
      const d = document.createElement('div'); d.className = 'ln'; d.textContent = l.text;
      if (l.color) d.style.color = l.color;
      if (!this.chatOpen && now - l.t > 9000) d.style.opacity = '0.4';
      this.chatEl.insertBefore(d, inp || null);
    }
  },
};


// ---------------------------------------------------------------- aparência em tempo real
// Quem muda o visual (no criador de personagem, ao escolher ou ao confirmar/cancelar) aparece
// já diferente para os outros: o boneco só é refeito quando a aparência realmente mudou.
function netSetPeerLook(p, d) {
  const key = JSON.stringify(d.look || null);
  if (p.lookKey !== key) { p.lookKey = key; p.look = d.look; p.atlas = null; }
  if (d.name) p.name = d.name;
}
function netSyncLook() {
  if (!NET.room || NET.joining) return;
  const look = currentLook(), key = JSON.stringify(look) + '|' + netName();
  if (key === NET.sentLookKey) return;
  NET.sentLookKey = key;
  netRelay({ k: 'look', name: netName(), look });
}
setInterval(netSyncLook, 300);
