'use strict';
// =====================================================================================
//  SERVIDOR MULTIJOGADOR DE VALDORIA
// =====================================================================================
// Sem dependências: só o Node (18+).   node server/server.js   (porta 8787, ou PORT=xxxx)
//
// Faz três coisas:
//   • Salas: quem hospeda abre o mundo dele numa sala (pública, só a mesma rede, só amigos
//     ou privada com código). O servidor só repassa as mensagens; quem manda no mundo é o
//     anfitrião (o jogo dele).
//   • Lista: GET /api/rooms ou a mensagem 'list' devolvem as salas públicas, as da mesma rede
//     (mesmo IP de saída = mesma internet) e as dos amigos.
//   • Amigos: cada jogador tem um código de amigo; adicionar é mútuo, convites chegam na hora
//     para quem estiver com o jogo aberto. Fica salvo em server/data/friends.json.
//
// WebSocket implementado aqui mesmo (RFC 6455: handshake, quadros com máscara, 64 bits de
// tamanho, ping/pong, fechamento) para não precisar de "npm install".

const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const PORT = +process.env.PORT || 8787;
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const FRIENDS_FILE = path.join(DATA_DIR, 'friends.json');
const MAX_MESSAGE = 64 * 1024 * 1024; // o retrato do mundo para quem entra pode ser grande
const PROTOCOL = 1;

// ---------------------------------------------------------------- persistência dos amigos
let store = { players: {}, codes: {} }; // players[pid] = { name, code, friends: [pid] }; codes[code] = pid
try { store = JSON.parse(fs.readFileSync(FRIENDS_FILE, 'utf8')); } catch (_) {}
let saveTimer = null;
function saveStore() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(FRIENDS_FILE + '.tmp', JSON.stringify(store, null, 1));
    fs.renameSync(FRIENDS_FILE + '.tmp', FRIENDS_FILE);
  }, 300);
}
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const randomCode = (n) => Array.from(crypto.randomBytes(n), (b) => CODE_CHARS[b % CODE_CHARS.length]).join('');
function playerRecord(pid, name) {
  let p = store.players[pid];
  if (!p) {
    let code; do code = randomCode(6); while (store.codes[code]);
    p = store.players[pid] = { name, code, friends: [] };
    store.codes[code] = pid;
  }
  if (name && p.name !== name) p.name = name;
  saveStore();
  return p;
}

// ---------------------------------------------------------------- estado em memória
const clients = new Set();           // conexões abertas
const byPid = new Map();             // pid -> Set de conexões (o mesmo jogador em duas abas)
const rooms = new Map();             // id -> sala
const roomCodes = new Map();         // código de convite -> id

const ipOf = (req) => {
  const fwd = req.headers['x-forwarded-for'];
  let ip = (fwd ? String(fwd).split(',')[0] : req.socket.remoteAddress || '').trim();
  if (ip.startsWith('::ffff:')) ip = ip.slice(7);
  return ip;
};
// Mesma rede: mesmo IP de saída. Endereços locais/privados contam todos como a mesma rede
// (servidor rodando dentro da própria casa, todo mundo chega com IP 192.168.x.x).
const isPrivate = (ip) => ip === '::1' || ip === '127.0.0.1' || /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|fe80:|fc|fd)/i.test(ip);
const sameNetwork = (a, b) => a === b || (isPrivate(a) && isPrivate(b));

function roomView(r, forClient) {
  return {
    id: r.id, name: r.name, host: r.hostName, visibility: r.visibility, players: r.members.size, max: r.max,
    size: r.size, seed: r.seed, version: r.version, code: forClient && (forClient.pid === r.hostPid || r.visibility !== 'private') ? r.code : undefined,
    friend: !!(forClient && store.players[forClient.pid]?.friends.includes(r.hostPid)),
    lan: !!(forClient && sameNetwork(forClient.ip, r.hostIp)),
  };
}
function visibleRooms(c) {
  const out = [];
  for (const r of rooms.values()) {
    if (r.members.size >= r.max) continue;
    const v = roomView(r, c);
    if (r.visibility === 'public' || (r.visibility === 'lan' && v.lan) || (r.visibility === 'friends' && v.friend) || (c && r.hostPid === c.pid)) out.push(v);
  }
  return out.sort((a, b) => (b.friend - a.friend) || (b.lan - a.lan) || b.players - a.players);
}

// ---------------------------------------------------------------- WebSocket mínimo
function sendRaw(c, buf, opcode = 1) {
  if (c.closed) return;
  const len = buf.length;
  const head = len < 126 ? Buffer.from([0x80 | opcode, len])
    : len < 65536 ? Buffer.from([0x80 | opcode, 126, len >> 8, len & 255])
    : (() => { const h = Buffer.alloc(10); h[0] = 0x80 | opcode; h[1] = 127; h.writeBigUInt64BE(BigInt(len), 2); return h; })();
  c.socket.write(Buffer.concat([head, buf]));
}
const send = (c, msg) => sendRaw(c, Buffer.from(typeof msg === 'string' ? msg : JSON.stringify(msg)));

function onFrameData(c, chunk) {
  c.buf = c.buf.length ? Buffer.concat([c.buf, chunk]) : chunk;
  for (;;) {
    const b = c.buf;
    if (b.length < 2) return;
    const fin = b[0] & 0x80, op = b[0] & 0x0f, masked = b[1] & 0x80;
    let len = b[1] & 0x7f, off = 2;
    if (len === 126) { if (b.length < 4) return; len = b.readUInt16BE(2); off = 4; }
    else if (len === 127) { if (b.length < 10) return; len = Number(b.readBigUInt64BE(2)); off = 10; }
    if (len > MAX_MESSAGE) return closeClient(c, 1009);
    const maskOff = off; if (masked) off += 4;
    if (b.length < off + len) return;
    let payload = b.subarray(off, off + len);
    if (masked) { const m = b.subarray(maskOff, maskOff + 4); payload = Buffer.from(payload); for (let i = 0; i < payload.length; i++) payload[i] ^= m[i & 3]; }
    c.buf = b.subarray(off + len);
    if (op === 8) return closeClient(c, 1000);
    if (op === 9) { sendRaw(c, payload, 10); continue; }
    if (op === 10) { c.alive = true; continue; }
    if (op === 0 || op === 1 || op === 2) {
      c.parts.push(payload);
      if (!fin) continue;
      const text = Buffer.concat(c.parts).toString('utf8'); c.parts = [];
      let msg; try { msg = JSON.parse(text); } catch (_) { continue; }
      try { onMessage(c, msg, text); } catch (e) { console.error('erro na mensagem', msg?.t, e); }
    }
  }
}

function closeClient(c, code = 1000) {
  if (c.closed) return;
  c.closed = true;
  try { c.socket.end(Buffer.from([0x88, 2, code >> 8, code & 255])); } catch (_) {}
  clients.delete(c);
  if (c.pid) { const set = byPid.get(c.pid); set?.delete(c); if (set && !set.size) byPid.delete(c.pid); }
  leaveRoom(c, 'saiu');
  if (c.pid) notifyFriendsPresence(c.pid);
}

// ---------------------------------------------------------------- salas
function leaveRoom(c, why) {
  const r = c.room && rooms.get(c.room);
  c.room = null;
  if (!r) return;
  r.members.delete(c);
  if (c === r.host) {
    for (const m of r.members) { send(m, { t: 'roomClosed', reason: 'O anfitrião fechou o mundo.' }); m.room = null; }
    rooms.delete(r.id); roomCodes.delete(r.code);
    console.log(`sala fechada: ${r.name}`);
  } else {
    send(r.host, { t: 'peerLeave', pid: c.pid, cid: c.id, name: c.name, why });
    for (const m of r.members) if (m !== r.host) send(m, { t: 'peerLeave', pid: c.pid, cid: c.id, name: c.name, why });
  }
}

function friendsOf(pid) {
  const me = store.players[pid];
  return (me?.friends || []).map((f) => {
    const p = store.players[f], conns = byPid.get(f), room = conns && [...conns].map((x) => x.room && rooms.get(x.room)).find(Boolean);
    return { pid: f, name: p?.name || '?', code: p?.code, online: !!conns?.size, room: room ? roomView(room, { pid, ip: '' }) : null };
  });
}
function notifyFriendsPresence(pid) {
  for (const f of store.players[pid]?.friends || []) for (const c of byPid.get(f) || []) send(c, { t: 'friends', friends: friendsOf(f) });
}

let nextCid = 1;
function onMessage(c, msg, text) {
  switch (msg.t) {
    case 'hello': {
      const pid = String(msg.pid || '').slice(0, 64), name = String(msg.name || 'Jogador').slice(0, 24);
      if (!/^[\w-]{8,64}$/.test(pid)) return send(c, { t: 'error', error: 'id inválido' });
      c.pid = pid; c.name = name;
      if (!byPid.has(pid)) byPid.set(pid, new Set());
      byPid.get(pid).add(c);
      const rec = playerRecord(pid, name);
      send(c, { t: 'welcome', cid: c.id, code: rec.code, ip: c.ip, protocol: PROTOCOL, friends: friendsOf(pid) });
      notifyFriendsPresence(pid);
      return;
    }
    case 'list': return send(c, { t: 'rooms', rooms: visibleRooms(c) });
    case 'host': {
      if (!c.pid) return;
      leaveRoom(c, 'trocou de sala');
      const id = crypto.randomBytes(6).toString('hex');
      let code; do code = randomCode(5); while (roomCodes.has(code));
      const vis = ['public', 'lan', 'friends', 'private'].includes(msg.visibility) ? msg.visibility : 'friends';
      const r = { id, code, name: String(msg.name || `Mundo de ${c.name}`).slice(0, 40), visibility: vis, host: c, hostPid: c.pid, hostName: c.name, hostIp: c.ip,
        members: new Set([c]), max: Math.min(8, Math.max(2, +msg.max || 6)), seed: msg.seed, size: msg.size, version: msg.version };
      rooms.set(id, r); roomCodes.set(code, id); c.room = id;
      console.log(`sala aberta: ${r.name} (${vis}, código ${code}) por ${c.name}`);
      send(c, { t: 'hosted', room: roomView(r, c) });
      notifyFriendsPresence(c.pid);
      return;
    }
    case 'join': {
      if (!c.pid) return;
      const id = msg.id || roomCodes.get(String(msg.code || '').toUpperCase().trim());
      const r = id && rooms.get(id);
      if (!r) return send(c, { t: 'joinFailed', error: 'Sala não encontrada (o código está certo? o anfitrião ainda está jogando?)' });
      if (r.members.size >= r.max) return send(c, { t: 'joinFailed', error: 'A sala está cheia.' });
      const v = roomView(r, c);
      const allowed = r.visibility === 'public' || msg.code || (r.visibility === 'lan' && v.lan) || (r.visibility === 'friends' && v.friend);
      if (!allowed) return send(c, { t: 'joinFailed', error: 'Essa sala é só para convidados.' });
      if (msg.version && r.version && msg.version !== r.version) return send(c, { t: 'joinFailed', error: 'Versões diferentes do jogo: atualize a página (Ctrl+F5) dos dois lados.' });
      leaveRoom(c, 'trocou de sala');
      r.members.add(c); c.room = r.id;
      send(c, { t: 'joined', room: roomView(r, c), host: { pid: r.hostPid, cid: r.host.id, name: r.hostName }, peers: [...r.members].filter((m) => m !== c).map((m) => ({ pid: m.pid, cid: m.id, name: m.name })) });
      for (const m of r.members) if (m !== c) send(m, { t: 'peerJoin', pid: c.pid, cid: c.id, name: c.name });
      notifyFriendsPresence(c.pid);
      return;
    }
    case 'leave': leaveRoom(c, 'saiu'); notifyFriendsPresence(c.pid); return send(c, { t: 'left' });
    case 'relay': {
      // repassa sem mexer: o servidor não entende o jogo, só a sala
      const r = c.room && rooms.get(c.room);
      if (!r) return;
      const out = '{"t":"relay","from":' + c.id + ',"data":' + JSON.stringify(msg.data) + '}';
      if (msg.to != null) { for (const m of r.members) if (m.id === msg.to) sendRaw(m, Buffer.from(out)); }
      else for (const m of r.members) if (m !== c) sendRaw(m, Buffer.from(out));
      return;
    }
    case 'addFriend': {
      const other = store.codes[String(msg.code || '').toUpperCase().trim()];
      if (!c.pid || !other) return send(c, { t: 'friendError', error: 'Código de amigo não encontrado.' });
      if (other === c.pid) return send(c, { t: 'friendError', error: 'Esse é o seu próprio código.' });
      const me = store.players[c.pid], them = store.players[other];
      if (!me.friends.includes(other)) me.friends.push(other);
      if (!them.friends.includes(c.pid)) them.friends.push(c.pid);
      saveStore();
      send(c, { t: 'friendAdded', name: them.name });
      for (const o of byPid.get(other) || []) send(o, { t: 'friendAdded', name: me.name, byOther: true });
      notifyFriendsPresence(c.pid); notifyFriendsPresence(other);
      send(c, { t: 'friends', friends: friendsOf(c.pid) });
      return;
    }
    case 'removeFriend': {
      const me = store.players[c.pid], them = store.players[msg.pid];
      if (me) me.friends = me.friends.filter((f) => f !== msg.pid);
      if (them) them.friends = them.friends.filter((f) => f !== c.pid);
      saveStore();
      send(c, { t: 'friends', friends: friendsOf(c.pid) });
      return;
    }
    case 'friends': return send(c, { t: 'friends', friends: friendsOf(c.pid) });
    case 'invite': {
      const r = c.room && rooms.get(c.room);
      if (!r || !store.players[c.pid]?.friends.includes(msg.pid)) return;
      for (const o of byPid.get(msg.pid) || []) send(o, { t: 'invite', from: c.name, room: { ...roomView(r, { pid: msg.pid, ip: '' }), code: r.code } });
      return;
    }
  }
}

// ---------------------------------------------------------------- HTTP + upgrade
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/api/rooms') {
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ rooms: visibleRooms({ ip: ipOf(req), pid: url.searchParams.get('pid') || '' }) }));
  }
  if (url.pathname === '/' || url.pathname === '/api/status') {
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ ok: true, name: 'Valdoria', protocol: PROTOCOL, players: clients.size, rooms: rooms.size }));
  }
  res.statusCode = 404; res.end('não encontrado');
});
server.on('upgrade', (req, socket) => {
  const key = req.headers['sec-websocket-key'];
  if (!key || (req.headers.upgrade || '').toLowerCase() !== 'websocket') return socket.destroy();
  const accept = crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
  socket.setNoDelay(true);
  const c = { id: nextCid++, socket, buf: Buffer.alloc(0), parts: [], ip: ipOf(req), alive: true, room: null, closed: false };
  clients.add(c);
  socket.on('data', (d) => onFrameData(c, d));
  socket.on('close', () => closeClient(c));
  socket.on('error', () => closeClient(c));
});
// derruba conexões mortas (Wi-Fi caiu, aba congelada) para a sala não ficar presa
setInterval(() => {
  for (const c of clients) {
    if (!c.alive) { closeClient(c, 1001); continue; }
    c.alive = false; sendRaw(c, Buffer.alloc(0), 9);
  }
}, 20000);

server.listen(PORT, '0.0.0.0', () => {
  const nets = Object.values(require('node:os').networkInterfaces()).flat().filter((n) => n && n.family === 'IPv4' && !n.internal).map((n) => n.address);
  console.log(`Servidor de Valdoria na porta ${PORT}`);
  console.log(`  neste PC:        ws://localhost:${PORT}/ws`);
  for (const ip of nets) console.log(`  na rede (LAN):   ws://${ip}:${PORT}/ws`);
});
