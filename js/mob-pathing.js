'use strict';
// =====================================================================================
//  CAMINHO DOS MONSTROS — em vez de andar reto até o jogador e empacar na primeira parede,
//  o monstro hostil procura um caminho pelos tiles (A*) e segue o próximo ponto dele:
//  contorna por cima, desce no buraco e sobe do outro lado, entra pela caverna...
//
//  • Quem anda (slime, canibal, dinamiteiro, lobos, hienas, aranhas, escorpiões...):
//    andar, subir degrau de 1 bloco, pular paredes de até MOB_PATH.salto blocos e descer
//    quedas de até DROP_CHASE blocos (o mesmo limite com que já desciam morros caçando).
//  • Quem voa (morcego): caminho pelo ar em 8 direções, cortando caminho quando há linha reta.
//
//  Não muda o resto da IA: o update original continua mandando, só que "caçando" o próximo
//  ponto do caminho no lugar do jogador. Sem saída alcançável, aguarda e procura de novo.
// =====================================================================================
const MOB_PATH = {
  alcance: 34,          // blocos: além disso nem procura caminho (vai reto, como antes)
  janelaX: 44, janelaY: 28, // área (blocos para cada lado) em que a busca anda
  nos: 2600,            // limite de nós por busca
  refazer: [0.45, 0.7], // segundos entre buscas (sorteado, para não juntar todos no mesmo quadro)
  salto: 3,             // parede mais alta que o bicho do chão vence pulando (blocos)
};

const mobPathKey = (x, y) => (y << 13) | x;

// O corpo do bicho em tiles: largura em colunas e altura em linhas
function mobFoot(m) {
  const wT = Math.max(1, Math.ceil(m.w / T)), hT = Math.max(1, Math.ceil(m.h / T));
  return { wT, hT, pad: (wT * T - m.w) / 2 };
}
// O "nó" de um bicho do chão: coluna da esquerda do corpo e a linha do bloco sob os pés
function mobNode(m, f) { return { x: Math.round((m.x - f.pad) / T), y: Math.floor((m.y + m.h + 1) / T) }; }

function mobCellFree(w, x, y) {
  if (!w.inBounds(x, y)) return false;
  if (w.isSolid(x, y)) return false;
  return !(w.hasLava && w.hasLava(x, y));
}
function mobCellFloor(w, x, y) {
  if (!w.inBounds(x, y)) return false;
  return w.isSolid(x, y) || !!TILE_DEFS[w.getTile(x, y)]?.plataforma;
}
// Cabe o corpo com os pés sobre a linha y? (rows y-hT .. y-1 livres; algum chão embaixo)
function mobFits(w, x, y, f) {
  for (let c = 0; c < f.wT; c++) for (let r = 1; r <= f.hT; r++) if (!mobCellFree(w, x + c, y - r)) return false;
  return true;
}
function mobStand(w, x, y, f) {
  if (!mobFits(w, x, y, f)) return false;
  for (let c = 0; c < f.wT; c++) if (mobCellFloor(w, x + c, y)) return true;
  return false;
}

// Fila de prioridade mínima (heap binário) para o A*
class MobHeap {
  constructor() { this.k = []; this.v = []; }
  push(key, val) {
    const k = this.k, v = this.v; let i = k.length; k.push(key); v.push(val);
    while (i > 0) { const p = (i - 1) >> 1; if (k[p] <= key) break; k[i] = k[p]; v[i] = v[p]; i = p; }
    k[i] = key; v[i] = val;
  }
  pop() {
    const k = this.k, v = this.v, top = v[0], lk = k.pop(), lv = v.pop(), n = k.length;
    if (n) {
      let i = 0;
      for (;;) {
        let c = 2 * i + 1; if (c >= n) break;
        if (c + 1 < n && k[c + 1] < k[c]) c++;
        if (k[c] >= lk) break;
        k[i] = k[c]; v[i] = v[c]; i = c;
      }
      k[i] = lk; v[i] = lv;
    }
    return top;
  }
  get size() { return this.k.length; }
}

// A* genérico: neighbors(x, y, out) empurra [nx, ny, custo, tipo]; devolve a lista de nós
// até o objetivo ou, se não alcançar, até o nó explorado mais perto dele.
function mobAStar(start, goal, neighbors, isGoal, box) {
  const open = new MobHeap(), came = new Map(), cost = new Map(), kind = new Map();
  const h = (x, y) => Math.abs(x - goal.x) + Math.abs(y - goal.y) * 0.8;
  const sk = mobPathKey(start.x, start.y);
  cost.set(sk, 0); open.push(h(start.x, start.y), sk);
  let best = sk, bestH = h(start.x, start.y), seen = 0, found = -1;
  const out = [];
  while (open.size && seen < MOB_PATH.nos) {
    const cur = open.pop(), cx = cur & 8191, cy = cur >> 13, c0 = cost.get(cur);
    seen++;
    if (isGoal(cx, cy)) { found = cur; break; }
    const hh = h(cx, cy);
    if (hh < bestH) { bestH = hh; best = cur; }
    out.length = 0; neighbors(cx, cy, out);
    for (const [nx, ny, step, type] of out) {
      if (nx < box.x0 || nx > box.x1 || ny < box.y0 || ny > box.y1) continue;
      const nk = mobPathKey(nx, ny), nc = c0 + step;
      if (nc >= (cost.get(nk) ?? Infinity)) continue;
      cost.set(nk, nc); came.set(nk, cur); kind.set(nk, type);
      open.push(nc + h(nx, ny), nk);
    }
  }
  let k = found >= 0 ? found : best;
  const path = [];
  while (k != null) { path.push({ x: k & 8191, y: k >> 13, type: kind.get(k) || 'walk' }); k = came.get(k); }
  path.reverse();
  return { path, reached: found >= 0 };
}

// ---------- quem anda ----------
function mobGroundNeighbors(w, f, maxJump, maxDrop) {
  return (x, y, out) => {
    for (const d of [-1, 1]) {
      const nx = x + d;
      // Bosses também saltam para uma plataforma acima mesmo havendo chão à frente.
      if(maxJump>MOB_PATH.salto)for(let k=2;k<=maxJump;k++){
        if(!mobFits(w,x,y-k,f))break;
        if(mobStand(w,nx,y-k,f))out.push([nx,y-k,2+k,'jump']);
      }
      // mesmo nível ou degrau de 1 (o corpo sobe sozinho)
      if (mobStand(w, nx, y, f)) out.push([nx, y, 1, 'walk']);
      else if (mobStand(w, nx, y - 1, f) && mobFits(w, x, y - 1, f)) out.push([nx, y - 1, 1.4, 'walk']);
      else {
        // pulo: precisa de vão livre em cima de onde está
        const canRise = mobFits(w, x, y - 1, f);
        for (let k = 2; canRise && k <= maxJump; k++) {
          if (!mobFits(w, x, y - k, f)) break;
          if (mobStand(w, nx, y - k, f)) { out.push([nx, y - k, 2 + k, 'jump']); break; }
        }
      }
      // queda: a coluna da frente está livre na altura do corpo -> cai até achar chão
      if (mobFits(w, nx, y, f) && !mobStand(w, nx, y, f)) {
        for (let k = 1; k <= maxDrop; k++) {
          if (!mobFits(w, nx, y + k, f)) break;
          if (mobStand(w, nx, y + k, f)) { out.push([nx, y + k, 1 + k * 0.4, 'drop']); break; }
        }
      }
    }
  };
}

// ---------- quem voa ----------
function mobAirFits(w, x, y, f) {
  for (let c = 0; c < f.wT; c++) for (let r = 0; r < f.hT; r++) if (!mobCellFree(w, x + c, y + r)) return false;
  return true;
}
function mobAirNeighbors(w, f) {
  return (x, y, out) => {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      if (!mobAirFits(w, x + dx, y + dy, f)) continue;
      if (dx && dy && (!mobAirFits(w, x + dx, y, f) || !mobAirFits(w, x, y + dy, f))) continue; // sem cortar quina
      out.push([x + dx, y + dy, dx && dy ? 1.41 : 1, 'fly']);
    }
  };
}
// Linha livre entre dois pontos (amostras a cada meio bloco, com a caixa do bicho)
function mobLineClear(w, m, x0, y0, x1, y1) {
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / (T / 2));
  for (let i = 1; i <= n; i++) {
    const x = lerp(x0, x1, i / n) - m.w / 2, y = lerp(y0, y1, i / n) - m.h / 2;
    if (m.collides(w, x, y)) return false;
  }
  return true;
}

// Onde o jogador "pisa": a linha do chão embaixo dele (procura até 12 blocos para baixo)
function mobGoalFor(w, target) {
  const tx = Math.floor(target.cx / T);
  let ty = Math.floor(((target.y != null && target.h != null) ? target.y + target.h + 1 : target.cy + T) / T);
  for (let k = 0; k < 12 && w.inBounds(tx, ty) && !mobCellFloor(w, tx, ty); k++) ty++;
  return { x: tx, y: ty };
}

// Em que ponto do caminho o bicho está: o mais adiantado que bate exatamente com a posição dele
// (senão o vizinho de 1 bloco). Pegar o primeiro fazia o bicho voltar para trás na beira de buracos.
function mobPathIndex(path, here, flyer) {
  if (!path) return -1;
  const dy = flyer ? 1 : 0;
  for (let tol = 0; tol <= 1; tol++)
    for (let i = path.length - 1; i >= 0; i--) if (Math.abs(path[i].x - here.x) <= tol && Math.abs(path[i].y - here.y) <= dy) return i;
  return -1;
}
// Calcula (ou reaproveita) o ponto que o bicho deve perseguir. Devolve null para ir direto.
function mobWaypoint(m, w, target, dt, flyer) {
  const dist = Math.hypot(target.cx - m.cx, target.cy - m.cy);
  if (dist > MOB_PATH.alcance * T || m.hurtTimer > 0) { m.path = null; return null; }
  const f = mobFoot(m), st = m.pathState ??= { t: Math.random() * 0.3 };
  st.t -= dt;
  const here = flyer ? { x: Math.floor((m.cx - f.wT * T / 2 + T / 2) / T), y: Math.floor((m.cy - f.hT * T / 2 + T / 2) / T) } : mobNode(m, f);
  // perdeu o caminho (caiu, foi empurrado) ou deu a hora: busca de novo
  const onPath = mobPathIndex(m.path, here, flyer);
  if (st.t <= 0 || onPath < 0) {
    st.t = MOB_PATH.refazer[0] + Math.random() * (MOB_PATH.refazer[1] - MOB_PATH.refazer[0]);
    if (!flyer && !m.onGround && m.path) return m.pathPoint ?? null; // no ar: termina o salto antes de recalcular
    const box = { x0: Math.max(1, here.x - MOB_PATH.janelaX), x1: Math.min(w.w - 2, here.x + MOB_PATH.janelaX), y0: Math.max(1, here.y - MOB_PATH.janelaY), y1: Math.min(w.h - 2, here.y + MOB_PATH.janelaY) };
    let res;
    if (flyer) {
      const goal = { x: Math.floor(target.cx / T), y: Math.floor(target.cy / T) };
      if (!mobAirFits(w, here.x, here.y, f)) { m.path = null; return null; }
      res = mobAStar(here, goal, mobAirNeighbors(w, f), (x, y) => Math.abs(x - goal.x) <= 1 && Math.abs(y - goal.y) <= 1, box);
    } else {
      if (!mobStand(w, here.x, here.y, f)) { m.path = null; return null; }
      const goal = mobGoalFor(w, target), jump = m.boss ? 12 : m.kind === 'slime' ? 2 : MOB_PATH.salto;
      res = mobAStar(here, goal, mobGroundNeighbors(w, f, jump, DROP_CHASE), (x, y) => y === goal.y && goal.x >= x - 1 && goal.x <= x + f.wT, box);
    }
    m.path = res.path; m.pathReached = res.reached;
    return mobPickPoint(m, w, f, here, flyer, 0);
  }
  return mobPickPoint(m, w, f, here, flyer, Math.max(0, onPath));
}

function mobPickPoint(m, w, f, here, flyer, i) {
  const path = m.path;
  if (!path || path.length < 2 || i === path.length - 1) {
    m.pathPoint = null; m.pathNext = null;
    m.pathWaiting = !!path && !m.pathReached;
    return null;
  }
  m.pathWaiting = false;
  const px = (n) => n.x * T + f.wT * T / 2;
  let j = Math.min(i + 1, path.length - 1);
  if (flyer) {
    // corta caminho: o ponto mais adiante que dá para ver em linha reta
    for (let k = path.length - 1; k > j; k--) {
      const n = path[k];
      if (mobLineClear(w, m, m.cx, m.cy, px(n), n.y * T + f.hT * T / 2)) { j = k; break; }
    }
    const n = path[j];
    m.pathNext = n;
    return (m.pathPoint = { cx: px(n), cy: n.y * T + f.hT * T / 2 });
  }
  // no chão: segue a corrida de passos simples no mesmo sentido até a próxima mudança
  const dir = Math.sign(path[j].x - path[i].x);
  // (no máximo 8 blocos adiante: o update original "esquece" o alvo se ele estiver longe demais)
  while (j + 1 < path.length && j - i < 8 && path[j + 1].type === 'walk' && Math.sign(path[j + 1].x - path[j].x) === dir && Math.abs(path[j + 1].y - path[j].y) <= 1) j++;
  const n = path[j];
  m.pathNext = path[Math.min(i + 1, path.length - 1)];
  return (m.pathPoint = { cx: px(n), cy: n.y * T - m.h / 2, x: n.x * T + f.pad, y: n.y * T - m.h, h: m.h, w: m.w });
}

// Antes do update original: se o próximo passo é um pulo, pula com a força certa
function mobPathJump(m, w) {
  const n = m.pathNext, f = mobFoot(m);
  if (!n || n.type !== 'jump' || !m.onGround || m.hurtTimer > 0) return;
  const here = mobNode(m, f), k = here.y - n.y;
  if (k < 2 || Math.abs(n.x - here.x) > 1) return;
  m.vy = -Math.sqrt(2 * GRAVITY * (k * T + 10));
  m.onGround = false;
  if (m.kind === 'slime') { m.hopDir = Math.sign(n.x - here.x) || m.hopDir; m.jumpWait = 0.9; m.jumpAge = 0; }
}

// Alvo trocado: mesmo objeto que o update espera, apontando para o ponto do caminho
function mobPathTarget(m, w, p, dt, flyer) {
  m.pathWaiting = false;
  const pt = mobWaypoint(m, w, p, dt, flyer);
  if (!pt) return m.pathWaiting ? {cx:m.cx,cy:m.cy,x:m.x,y:m.y,w:m.w,h:m.h} : p;
  // O último trecho também precisa ser executado: pode exigir um salto ou contornar a quina.
  if (!flyer) mobPathJump(m, w);
  return pt;
}

// ---------- ligação com os monstros e os bichos hostis ----------
{
  const baseMonster = Monster.prototype.update;
  Monster.prototype.update = function (dt, w, p) {
    if (this.boss || this.dead || !p) return baseMonster.call(this, dt, w, p);
    return baseMonster.call(this, dt, w, mobPathTarget(this, w, p, dt, this.kind === 'bat'));
  };

  // Bichos hostis comuns: os que usam o update genérico ou o do lobo
  const SPECIAL = new Set(['tiger', 'bear', 'fiandeira', 'cascoferro', 'bird', 'elephant']);
  const baseWild = Wildlife.prototype.update;
  Wildlife.prototype.update = function (dt, w, p) {
    const d = this.def;
    if(this.boss&&!this.dead&&!this.sleeping&&p){
      if(this.manualArena){
        const a=this.manualArena,floor=mobGoalFor(w,p).y,shift=(floor-a.floor)*(1-Math.exp(-3*dt));
        a.floor+=shift;
        if(a.core){a.core.y+=shift*T;a.cy+=shift;}
        const desired=p.cx/T-(this.kind==='thunderbird'?6:0);
        if(Math.abs(desired-a.cx)>12){const dx=(desired-a.cx)*(1-Math.exp(-dt));a.cx+=dx;if(a.core)a.core.x+=dx*T;}
      }
      const ground=['bear','tiger','yeti','cascoferro','fiandeira'].includes(this.kind);
      const walking=['hunt','walk','stalk'].includes(this.state)&&!(this.kind==='fiandeira'&&this.mode!=='floor');
      this.dropTimer=Math.max(0,(this.dropTimer||0)-dt);
      if(ground&&this.onGround&&this.mode!=='ceiling'&&!this.under&&p.y+p.h>this.y+this.h+2*T){
        const row=Math.round((this.y+this.h)/T);
        let platform=false,solid=false;
        for(let x=Math.floor(this.x/T);x<=Math.floor((this.x+this.w-.01)/T);x++){
          platform ||= !!TILE_DEFS[w.getTile(x,row)]?.plataforma;solid ||= w.isSolid(x,row);
        }
        if(platform&&!solid){this.dropTimer=.3;this.onGround=false;this.vy=Math.max(60,this.vy);this.path=null;}
      }
      if(ground&&walking){
        const point=this.onGround?mobWaypoint(this,w,p,dt,false):null;
        mobPathJump(this,w);
        const move=this.moveX,timers={};
        if(Math.abs(p.y+p.h-this.y-this.h)>2*T)for(const key of ['swipeCd','slamCd','chargeCd','pounceCd','roarT','snapCd','burrowCd','sprayCd','cooldown','biteCd','spitCd','lassoCd']){
          if(Number.isFinite(this[key])){timers[key]=this[key];this[key]=1000;}
        }
        if(point){
          const dir=Math.sign(point.cx-this.cx);
          this.moveX=function(dx,world){
            if(!['hunt','walk','stalk'].includes(this.state))return move.call(this,dx,world);
            const speed=Math.max(Math.abs(this.vx),(d.speed||72)*(this.kind==='yeti'&&this.outsideIce?1.45:1));
            this.vx=dir*speed;this.facing=dir||this.facing;return move.call(this,this.vx*dt,world);
          };
        }
        try{return baseWild.call(this,dt,w,p);}finally{this.moveX=move;Object.assign(this,timers);}
      }
    }
    if (!this.hostile || this.boss || this.dead || d.aquatic || d.unique || SPECIAL.has(d.shape) || SHAPE_HOOKS[d.shape]?.update || !p)
      return baseWild.call(this, dt, w, p);
    const dist = Math.hypot(p.cx - this.cx, p.cy - this.cy);
    // dando a volta ele se afasta do jogador: com caminho em andamento desiste só bem mais longe
    const giveUp = (d.shape === 'wolf' ? WOLF_FORGET : 18) * (this.path ? 1.6 : 1) * T;
    const chasing = d.shape === 'wolf' ? this.aware && dist < giveUp : dist < giveUp;
    if (chasing && d.shape === 'wolf') this.aware = true;
    if (!chasing) { this.path = null; return baseWild.call(this, dt, w, p); }
    return baseWild.call(this, dt, w, mobPathTarget(this, w, p, dt, false));
  };
}
