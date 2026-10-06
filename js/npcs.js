'use strict';

// Moradores das vilas: passeiam no quintal, param para olhar em volta e conversam (botão direito).
// Na primeira conversa cada um dá um presentinho (cai no chão aos seus pés).
const VILLAGER_NAMES = ['Ana', 'Bento', 'Cida', 'Dito', 'Elza', 'Fábio', 'Gina', 'Hugo', 'Iara', 'João', 'Lia', 'Mauro', 'Nina', 'Otávio', 'Rosa', 'Tião'];
const VILLAGER_LINES = [
  'Vimos a fumaça do avião lá do alto do morro. Você teve sorte, hein?',
  'À noite, feche a porta. Os errantes não sabem abrir.',
  'Dizem que tem uma mina velha debaixo da terra, cheia de carvão e baú esquecido.',
  'Se ouvir um uivo, fica longe. Lobo distraído só te vê quando você chega perto.',
  'Madeira sai de árvore, ferro sai de pedra funda. O resto é paciência.',
  'Tem ruína de pedra lá embaixo, bem fundo. Quem desceu voltou com baú cheio... ou não voltou.',
  'Uma fogueira acesa espanta o frio e o medo.',
  'Aqui é tranquilo. Só não mexe no baú dos outros, viu?',
  'Viu um bicho inchado? Corre. Não pergunta, só corre.',
  'Às vezes aparece um acampamento abandonado nas cavernas. A fogueira ainda fica acesa, vai entender.',
  'Cabana caindo aos pedaços costuma ter coisa boa. Cuidado com as teias.',
  'O tigre da savana só acorda com Carne Suculenta. Vença Bramido e solte essa isca perto do tigre.',
  'Quem vence o Tigre da Savana volta com o dente e a pelagem. Dá uma faca rapidinha e um casaco que aguenta pancada.',
  'Elefante é manso. Com uma sela de couro dá até para montar nele.',
];
const VILLAGER_GIFTS = [[ITEM.COOKED_MEAT, 2], [ITEM.TORCH, 4], [ITEM.BANDAGE, 1], [ITEM.ARROW, 6], [ITEM.WATER, 2]];
const villagerAtlases = new Map();

class Villager extends Body {
  constructor(spawn) {
    super(spawn.x, spawn.y - 42 - 0.01, 14, 42);
    const r = mulberry32(Math.floor(spawn.seed * 1e9));
    const pick = (n) => Math.floor(r() * n);
    // Cabelo azul (índice 5) fica só para o jogador
    this.look = { name: 'Morador', skin: pick(5), hair: pick(5), hairStyle: pick(4), eyes: pick(4), jacket: pick(6), shirt: pick(5), pants: pick(5), boots: pick(4) };
    this.name = VILLAGER_NAMES[pick(VILLAGER_NAMES.length)];
    this.profession = spawn.profession ?? pick(NPC_PROFESSIONS.length);
    this.minX = spawn.minX * T; this.maxX = (spawn.maxX + 1) * T;
    this.dir = 0; this.think = r() * 3; this.anim = 0; this.clock = r() * 5;
    this.line = pick(VILLAGER_LINES.length); this.gift = VILLAGER_GIFTS[pick(VILLAGER_GIFTS.length)]; this.bubble = null;
  }

  update(dt, w, p) {
    this.clock += dt; this.think -= dt;
    if (this.bubble && (this.bubble.t -= dt) <= 0) this.bubble = null;
    if (this.bubble) { this.dir = 0; this.facing = p.cx < this.cx ? -1 : 1; } // conversando: para e olha para o jogador
    else if (this.think <= 0) { this.dir = Math.random() < 0.45 ? 0 : Math.random() < 0.5 ? -1 : 1; this.think = 1.5 + Math.random() * 3; }
    if ((this.dir < 0 && this.x < this.minX) || (this.dir > 0 && this.x + this.w > this.maxX)) this.dir = -this.dir;
    this.vx = this.dir * 38;
    if (this.dir) this.facing = this.dir;
    const oldX = this.x;
    this.applyGravity(dt); this.moveX(this.vx * dt, w);
    if (this.dir && Math.abs(this.x - oldX) < 0.01) this.dir = -this.dir; // bateu na parede da casa: volta
    this.moveY(this.vy * dt, w);
    this.anim += (Math.abs(this.x - oldX) * 12) / 30;
    this.settleStep(dt);
  }
}

function villagerAtlas(v) {
  const key = JSON.stringify(v.look);
  if (!villagerAtlases.has(key)) villagerAtlases.set(key, cabinAtlas(v.look));
  return villagerAtlases.get(key);
}

// Só os moradores perto do jogador se mexem (o mundo é enorme)
function updateNpcs(g, dt) {
  for (const v of g.npcs || []) if (Math.abs(v.cx - g.player.cx) < 120 * T) v.update(dt, g.world, g.player);
}

function drawNpcs(ctx, g) {
  const x0 = g.cam.x - 40, x1 = g.cam.x + canvas.width / g.zoom + 40;
  for (const v of g.npcs || []) {
    if (v.cx < x0 || v.cx > x1) continue;
    const atlas = villagerAtlas(v);
    const frame = Math.abs(v.vx) > 3 ? PLAYER_ANIMS.walk + (Math.floor(v.anim) % 12) : PLAYER_ANIMS.idle + (Math.floor(v.clock * 1.4) % 3);
    const dx = Math.round(v.x + v.w / 2 - PLAYER_SPR_W / 2), dy = Math.round(v.y + v.stepOffset + v.h - PLAYER_SPR_H);
    ctx.save();
    if (v.facing < 0) { ctx.translate(dx + PLAYER_SPR_W, dy); ctx.scale(-1, 1); ctx.drawImage(atlas, frame * PLAYER_SPR_W, 0, PLAYER_SPR_W, PLAYER_SPR_H, 0, 0, PLAYER_SPR_W, PLAYER_SPR_H); }
    else ctx.drawImage(atlas, frame * PLAYER_SPR_W, 0, PLAYER_SPR_W, PLAYER_SPR_H, dx, dy, PLAYER_SPR_W, PLAYER_SPR_H);
    ctx.restore();
  }
}

// Botão direito sobre um morador: fala e, na primeira vez, dá um presente
function tryTalkNpc(g, wx, wy) {
  const p = g.player, v = (g.npcs || []).find((n) => n.containsPoint(wx, wy, 4));
  if (!v) return false;
  if (Math.hypot(v.cx - p.cx, v.cy - p.cy) > 5 * T) { toast('Chegue mais perto para conversar.'); return true; }
  const lines = v.tribal ? TRIBE_LINES : VILLAGER_LINES; // o povo isolado tem as falas dele (js/ruins.js)
  let text = lines[v.line % lines.length];
  v.line++;
  if (v.gift) {
    const [item, n] = v.gift;
    dropItem(g, item, n, v.cx, v.y + 24, Math.sign(p.cx - v.cx));
    text += ` Toma, leva isso: ${n}× ${ITEM_DEFS[item].name}.`;
    v.gift = null;
  }
  v.bubble = { text, t: 6 };
  playSfx('invOpen', v.cx, v.cy);
  NpcServices.open(g, v, text); // a fala do encontro aparece dentro da janela
  return true;
}

// Balão de fala acima do morador (px da tela)
function drawNpcBubbles(ctx, g) {
  const z = g.zoom;
  if(g.npcOpen)return;
  for(const v of g.npcs||[]) {
    if(v.pilot||Math.hypot(v.cx-g.player.cx,v.cy-g.player.cy)>9*T)continue;
    const state=npcPeek(v),job=NPC_PROFESSIONS[state.profession],quest=job.quests[state.stage];
    const ready=quest&&state.accepted&&quest.cost.every(([id,n])=>g.inventory.count(id)>=n);
    // Plaquinha acima da cabeça: ! missão nova (balança), … em andamento, ✓ pronta, ↔ só trocas
    const novo=quest&&!state.accepted;
    const marker=quest?(state.accepted?(ready?'✓':'…'):'!'):'↔';
    const color=ready?'#bde591':novo?'#ff9d5c':quest?'#ffd082':'#9fb4c4';
    const x=Math.round((v.cx-g.cam.x)*z);
    const y=Math.round((v.y-g.cam.y)*z-14)+(novo?Math.round(Math.sin(performance.now()/280)*2):0);
    ctx.save();ctx.textAlign='center';ctx.textBaseline='alphabetic';
    ctx.fillStyle='#0a0c0f';ctx.fillRect(x-11,y-21,22,24);
    ctx.fillStyle='rgba(24,32,40,0.95)';ctx.fillRect(x-10,y-20,20,22);
    ctx.fillStyle=color;ctx.fillRect(x-10,y-20,20,2);
    ctx.beginPath();ctx.moveTo(x-4,y+3);ctx.lineTo(x+4,y+3);ctx.lineTo(x,y+8);ctx.fillStyle='#0a0c0f';ctx.fill();
    ctx.font='bold 14px monospace';ctx.fillStyle=color;ctx.fillText(marker,x,y-4);
    ctx.restore();
  }
  for (const v of g.npcs || []) {
    if (!v.bubble) continue;
    const sx = (v.cx - g.cam.x) * z, sy = (v.y - g.cam.y) * z - 10;
    if (sx < -200 || sx > canvas.width + 200) continue;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.font = '13px monospace';
    const rows = wrapText(ctx, v.bubble.text, 250), w = Math.max(...rows.map((r) => ctx.measureText(r).width), 60) + 20, h = rows.length * 17 + 30;
    const bx = Math.round(clamp(sx - w / 2, 8, canvas.width - w - 8)), by = Math.round(sy - h - 8);
    ctx.globalAlpha = Math.min(1, v.bubble.t * 2);
    ctx.fillStyle = '#0a0c0f'; ctx.fillRect(bx - 2, by - 2, w + 4, h + 4);
    ctx.fillStyle = 'rgba(24,28,34,0.96)'; ctx.fillRect(bx, by, w, h);
    ctx.fillStyle = '#e0a44a'; ctx.fillRect(bx, by, 3, h);
    ctx.beginPath(); ctx.moveTo(sx - 6, by + h + 2); ctx.lineTo(sx + 6, by + h + 2); ctx.lineTo(sx, by + h + 9); ctx.fillStyle = '#0a0c0f'; ctx.fill();
    ctx.textAlign = 'left'; ctx.font = '10px Silkscreen, monospace'; ctx.fillStyle = '#ffd27a'; ctx.fillText(v.name.toUpperCase(), bx + 12, by + 15);
    ctx.font = '13px monospace'; ctx.fillStyle = '#efe6d2';
    rows.forEach((r, i) => ctx.fillText(r, bx + 12, by + 32 + i * 17));
    ctx.restore();
  }
}
