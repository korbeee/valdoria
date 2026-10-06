'use strict';

// Trocas, missões e reputação dos moradores das vilas.
// Cada morador tem uma profissão, um estoque que se renova a cada dia e uma reputação
// que sobe com trocas e missões: quanto mais alta, mais barato e mais coisa desbloqueada.

// Patentes de reputação: pontos necessários e desconto no custo das trocas.
const NPC_RANKS = [
  { name: 'Desconhecido', need: 0, discount: 0 },
  { name: 'Conhecido', need: 4, discount: 0.1 },
  { name: 'Amigo da vila', need: 12, discount: 0.2 },
  { name: 'Companheiro', need: 24, discount: 0.3 },
];
const REP_PER_TRADE = 1;
const REP_PER_QUEST = 5;

// trade: { name, cost, reward, level (patente mínima), stock (por dia) }
const NPC_PROFESSIONS = [
  {
    name: 'Carpinteiro', icon: ITEM.WOOD_HAMMER,
    greeting: 'Vamos transformar estas vilas em um lugar para viver.',
    trades: [
      { name: 'Serraria', cost: [[ITEM.WOOD, 8]], reward: [[ITEM.TIMBER, 8]], stock: 8 },
      { name: 'Corte de ardósia', cost: [[ITEM.STONE, 10]], reward: [[ITEM.SLATE, 8]], stock: 8 },
      { name: 'Vidraça pronta', cost: [[ITEM.GLASS, 4], [ITEM.PLANKS, 4]], reward: [[ITEM.LATTICE_WINDOW, 6]], level: 1, stock: 5 },
      { name: 'Lampião de varanda', cost: [[ITEM.IRON, 4]], reward: [[ITEM.LANTERN, 3]], level: 1, stock: 4 },
      { name: 'Mobília da casa', cost: [[ITEM.PLANKS, 12], [ITEM.WOOD, 6]], reward: [[ITEM.TABLE, 1], [ITEM.CHAIR, 2], [ITEM.BOOKSHELF, 1]], level: 2, stock: 2 },
    ],
    quests: [
      { title: 'Uma oficina para a vila', text: 'Traga madeira e pedra para reforçar a oficina.', cost: [[ITEM.WOOD, 20], [ITEM.STONE, 12]], reward: [[ITEM.WOOD_HAMMER, 1], [ITEM.TIMBER, 12]] },
      { title: 'Janelas e varandas', text: 'Precisamos de vidro e tábuas para terminar as casas.', cost: [[ITEM.GLASS, 12], [ITEM.PLANKS, 20]], reward: [[ITEM.LATTICE_WINDOW, 12], [ITEM.FLOWER_BOX, 6], [ITEM.PENDANT, 4]] },
      { title: 'Telhado novo', text: 'Com ardósia e ferro eu cubro o resto da rua antes das chuvas.', cost: [[ITEM.SLATE, 16], [ITEM.IRON, 6]], reward: [[ITEM.ROOF_RED, 24], [ITEM.LANTERN, 4]] },
    ],
  },
  {
    name: 'Caçador', icon: ITEM.BOW,
    greeting: 'Uma boa expedição começa com provisões e equipamento.',
    trades: [
      { name: 'Flechas', cost: [[ITEM.WOOD, 6]], reward: [[ITEM.ARROW, 12]], stock: 10 },
      { name: 'Carne na brasa', cost: [[ITEM.MEAT, 3]], reward: [[ITEM.COOKED_MEAT, 4]], stock: 8 },
      { name: 'Corda trançada', cost: [[ITEM.SILK, 4]], reward: [[ITEM.ROPE, 3]], level: 1, stock: 5 },
      { name: 'Lança de osso', cost: [[ITEM.BONE, 4], [ITEM.STICK, 4]], reward: [[ITEM.SPEAR, 1]], level: 1, stock: 2 },
      { name: 'Sela de couro', cost: [[ITEM.LEATHER, 8]], reward: [[ITEM.SADDLE, 1]], level: 2, stock: 1 },
    ],
    quests: [
      { title: 'Provisões para a trilha', text: 'Reúna carne e couro para a próxima expedição.', cost: [[ITEM.MEAT, 6], [ITEM.LEATHER, 4]], reward: [[ITEM.BOW, 1], [ITEM.ARROW, 24]] },
      { title: 'Equipamento de explorador', text: 'Traga cordas e couro para preparar equipamento resistente.', cost: [[ITEM.ROPE, 4], [ITEM.LEATHER, 10]], reward: [[ITEM.LEATHER_ARMOR, 1], [ITEM.SADDLE, 1]] },
      { title: 'O dente do tigre', text: 'Ninguém aqui encarou o tigre da savana. Traga a prova.', cost: [[ITEM.TIGER_TOOTH, 1], [ITEM.TIGER_CLAW, 2]], reward: [[ITEM.TIGER_KNIFE, 1], [ITEM.ARROW, 40]] },
    ],
  },
  {
    name: 'Curandeira', icon: ITEM.MEDKIT,
    greeting: 'Posso cuidar de você. Também preciso de ajuda com os suprimentos.',
    trades: [
      { name: 'Ataduras', cost: [[ITEM.CLOTH, 3]], reward: [[ITEM.BANDAGE, 2]], stock: 10 },
      { name: 'Ovos cozidos', cost: [[ITEM.EGG, 3]], reward: [[ITEM.BOILED_EGG, 4]], stock: 8 },
      { name: 'Chá de cacto', cost: [[ITEM.CACTUS, 3]], reward: [[ITEM.WATER, 3]], stock: 6 },
      { name: 'Kit de primeiros socorros', cost: [[ITEM.SILK, 6], [ITEM.CLOTH, 4]], reward: [[ITEM.MEDKIT, 1]], level: 1, stock: 3 },
      { name: 'Reserva de inverno', cost: [[ITEM.COAL, 10], [ITEM.MEAT, 4]], reward: [[ITEM.MEDKIT, 2], [ITEM.COOKED_MEAT, 6]], level: 2, stock: 1 },
    ],
    quests: [
      { title: 'Primeiros socorros', text: 'Precisamos de tecido e água para atender os viajantes.', cost: [[ITEM.CLOTH, 6], [ITEM.WATER, 2]], reward: [[ITEM.MEDKIT, 2], [ITEM.BANDAGE, 4]] },
      { title: 'Reservas para o inverno', text: 'Reúna seda e carvão para renovar os suprimentos.', cost: [[ITEM.SILK, 8], [ITEM.COAL, 10]], reward: [[ITEM.MEDKIT, 3], [ITEM.COOKED_MEAT, 8]] },
      { title: 'Remédio forte', text: 'Gosma e ferrão viram o remédio que segura até mordida de lobo.', cost: [[ITEM.GEL, 6], [ITEM.STINGER, 3]], reward: [[ITEM.MEDKIT, 4], [ITEM.SNACK, 6]] },
    ],
  },
  {
    name: 'Ferreiro', icon: ITEM.METAL_BAR,
    greeting: 'A forja está quente. Traga minério que eu devolvo ferramenta.',
    trades: [
      { name: 'Fundição', cost: [[ITEM.IRON, 3], [ITEM.COAL, 2]], reward: [[ITEM.METAL_BAR, 2]], stock: 10 },
      { name: 'Parafusos e arame', cost: [[ITEM.SCRAP, 4]], reward: [[ITEM.BOLTS, 3], [ITEM.WIRE, 3]], stock: 8 },
      { name: 'Picareta de metal', cost: [[ITEM.METAL_BAR, 4], [ITEM.STICK, 3]], reward: [[ITEM.METAL_PICKAXE, 1]], level: 1, stock: 2 },
      { name: 'Martelo de metal', cost: [[ITEM.METAL_BAR, 3], [ITEM.STICK, 2]], reward: [[ITEM.METAL_HAMMER, 1]], level: 1, stock: 2 },
      { name: 'Peitoral de ferro', cost: [[ITEM.METAL_BAR, 10], [ITEM.LEATHER, 6]], reward: [[ITEM.IRON_ARMOR, 1]], level: 2, stock: 1 },
    ],
    quests: [
      { title: 'A forja acesa', text: 'Sem carvão e minério a bigorna esfria. Traga os dois.', cost: [[ITEM.COAL, 14], [ITEM.IRON, 10]], reward: [[ITEM.METAL_BAR, 8], [ITEM.METAL_HAMMER, 1]] },
      { title: 'Ferramentas de verdade', text: 'Barras e cabos: faço um jogo completo para você.', cost: [[ITEM.METAL_BAR, 8], [ITEM.STICK, 6]], reward: [[ITEM.METAL_PICKAXE, 1], [ITEM.METAL_AXE, 1], [ITEM.METAL_SHOVEL, 1]] },
      { title: 'Aço para a vila', text: 'Com barras e parafusos eu armo a guarda da vila.', cost: [[ITEM.METAL_BAR, 14], [ITEM.BOLTS, 6]], reward: [[ITEM.IRON_ARMOR, 1], [ITEM.METAL_SWORD, 1]] },
    ],
  },
];

// Criar o estado é o que marca o morador como "conhecido": só chame ao conversar de verdade.
function npcState(v) {
  if (!v.services) v.services = npcBlank(v);
  return v.services;
}

function npcBlank(v) {
  return { profession: (v.profession ?? 0) % NPC_PROFESSIONS.length, stage: 0, accepted: false, completed: 0, rep: 0, stock: {}, day: -1 };
}

// Leitura sem efeito colateral (marcadores na tela, listas): não marca como conhecido
function npcPeek(v) { return v.services || npcBlank(v); }

// Resumo das missões aceitas, para o botão do diário e o cabeçalho
function npcQuestSummary(g) {
  let active = 0, ready = 0;
  for (const v of g.npcs || []) {
    const s = v.services;
    if (!s || !s.accepted) continue;
    const q = NPC_PROFESSIONS[s.profession].quests[s.stage];
    if (!q) continue;
    active++;
    if (q.cost.every(([id, n]) => g.inventory.count(id) >= n)) ready++;
  }
  return { active, ready };
}

// Patente atual (índice em NPC_RANKS) a partir dos pontos de reputação
function npcRank(state) {
  let i = 0;
  while (i + 1 < NPC_RANKS.length && state.rep >= NPC_RANKS[i + 1].need) i++;
  return i;
}

// Custo já com o desconto da patente (nunca abaixo de 1 unidade)
function npcCost(trade, state) {
  const off = NPC_RANKS[npcRank(state)].discount;
  return trade.cost.map(([id, n]) => [id, Math.max(1, Math.round(n * (1 - off)))]);
}

// Estoque do dia: renova sozinho quando o dia do mundo vira
function npcStock(state, i, trade) {
  const today = game.day || 0;
  if (state.day !== today) { state.day = today; state.stock = {}; }
  if (state.stock[i] === undefined) state.stock[i] = trade.stock ?? 99;
  return state.stock[i];
}

// Simula a troca inteira antes de mexer na mochila: nada se perde com a bolsa cheia.
// `times` repete o mesmo negócio (custo e recompensa multiplicados).
function npcExchange(inventory, cost, reward, times = 1) {
  if (times < 1) return 'Escolha ao menos uma troca.';
  const next = new Inventory(inventory.slots.length);
  next.slots = inventory.slots.map((s) => (s ? { ...s } : null));
  for (const [item, n] of cost) if (!next.removeItem(item, n * times)) return 'Faltam materiais para esta entrega.';
  for (const [item, n] of reward) if (next.add(item, n * times) > 0) return 'Libere espaço no inventário para receber a recompensa.';
  inventory.slots.splice(0, inventory.slots.length, ...next.slots);
  return null;
}

// Quantas vezes dá para repetir a troca agora (materiais + espaço na mochila + estoque)
function npcMaxTimes(inventory, cost, reward, limit) {
  let max = limit;
  for (const [item, n] of cost) max = Math.min(max, Math.floor(inventory.count(item) / n));
  while (max > 0) {
    const test = new Inventory(inventory.slots.length);
    test.slots = inventory.slots.map((s) => (s ? { ...s } : null));
    if (npcExchange(test, cost, reward, max) === null) return max;
    max--;
  }
  return 0;
}

const NpcServices = {
  tab: 'trades',
  qty: {},
  message: '',
  messageKind: '',

  init() {
    if (this.dialog) return;
    const style = document.createElement('style');
    style.textContent = NPC_CSS;
    document.head.append(style);
    this.dialog = document.createElement('dialog');
    this.dialog.id = 'npc-services';
    this.dialog.setAttribute('aria-labelledby', 'npc-heading');
    document.body.append(this.dialog);
    this.dialog.addEventListener('cancel', (e) => { e.preventDefault(); this.close(); });
    this.dialog.addEventListener('click', (e) => {
      const button = e.target.closest('button');
      if (!button) return;
      const a = button.dataset.action;
      if (a === 'close') this.close();
      else if (a === 'tab') this.setTab(button.dataset.tab);
      else if (a === 'qty') this.bumpQty(+button.dataset.index, button.dataset.by);
      else this.act(a, +button.dataset.index);
    });
    window.addEventListener('keydown', (e) => {
      if (!this.dialog.open) return;
      const tabs = this.npc ? ['trades', 'quests'] : ['quests', 'people'];
      if (e.code === 'Escape') { e.preventDefault(); this.close(); }
      else if (e.code === 'Tab' || e.code === 'KeyQ') { e.preventDefault(); this.setTab(tabs[this.tab === tabs[0] ? 1 : 0]); }
      else if (e.code === 'Digit1') this.setTab(tabs[0]);
      else if (e.code === 'Digit2') this.setTab(tabs[1]);
      e.stopImmediatePropagation();
    }, true);
  },

  // Folha de sprites dos itens vira imagem de fundo: os ícones do jogo aparecem no HTML
  atlasUrl() {
    if (!this._atlas) this._atlas = renderer.tex.itemAtlas.toDataURL();
    return this._atlas;
  },

  // Retrato do morador (cabeça e ombros do quadro parado)
  portrait(v) {
    const c = makeCanvas(17, 17);
    c.getContext('2d').drawImage(villagerAtlas(v), PLAYER_ANIMS.idle * PLAYER_SPR_W + 7, 5, 17, 17, 0, 0, 17, 17);
    return c.toDataURL();
  },

  // `line` é a fala do morador naquele encontro; sem ela vale a saudação da profissão
  open(g, v = null, line = '') {
    this.init();
    this.g = g;
    this.npc = v;
    this.line = line;
    this.message = '';
    this.messageKind = '';
    this.tab = v ? 'trades' : 'quests';
    this.qty = {};
    g.inventoryUI.close();
    g.mapUI.open = false;
    g.npcOpen = true;
    input.keys.clear();
    input.mouse.left = input.mouse.right = input.mouse.rawLeft = false;
    cancelTool(g);
    this.dialog.style.setProperty('--atlas', `url(${this.atlasUrl()})`);
    this.dialog.style.setProperty('--atlas-w', `${ITEM_DEFS.length * 32}px`);
    // Abre direto na missão quando há uma por aceitar ou pronta para entregar
    if (v) {
      const state = npcState(v), q = NPC_PROFESSIONS[state.profession].quests[state.stage];
      if (q && (!state.accepted || this.enough(q.cost))) this.tab = 'quests';
    }
    this.render();
    if (!this.dialog.open) this.dialog.showModal();
  },

  close() {
    if (this.dialog?.open) this.dialog.close();
    if (this.g) this.g.npcOpen = false;
    input.keys.clear();
    input.mouse.left = input.mouse.right = input.mouse.rawLeft = false;
    this.npc = null;
  },

  setTab(tab) {
    if (this.tab === tab) return;
    this.tab = tab;
    this.message = '';
    playSfx('select');
    this.render();
  },

  // ---------- Consultas ----------
  enough(cost) { return cost.every(([id, n]) => this.g.inventory.count(id) >= n); },
  qtyOf(i) { return Math.max(1, this.qty[i] || 1); },

  // Lista de itens em texto puro (usada pelas mensagens e por quem chama de fora)
  items(list, progress = false) {
    return list.map(([id, n]) => `${progress ? Math.min(n, this.g.inventory.count(id)) + '/' : ''}${n} × ${ITEM_DEFS[id].name}`).join(' · ');
  },

  bumpQty(i, by) {
    const state = npcState(this.npc), trade = NPC_PROFESSIONS[state.profession].trades[i];
    const max = Math.max(1, npcMaxTimes(this.g.inventory, npcCost(trade, state), trade.reward, npcStock(state, i, trade)));
    this.qty[i] = by === 'max' ? max : clamp(this.qtyOf(i) + Number(by), 1, max);
    playSfx('select');
    this.render();
  },

  // Quanto falta de cada material, em texto curto
  missingText(cost) {
    const falta = cost.filter(([id, n]) => this.g.inventory.count(id) < n)
      .map(([id, n]) => `${n - this.g.inventory.count(id)}× ${ITEM_DEFS[id].name}`);
    return falta.length ? 'Falta ' + falta.join(' e ') : '';
  },

  // ---------- Pedaços de HTML ----------
  ico(id) { return `<i class="ico" style="--i:${id}" title="${ITEM_DEFS[id].name}"></i>`; },

  // Lista de itens com ícone. mode 'have' mostra quanto você já tem de cada um.
  chips(list, times = 1, mode = null) {
    return `<span class="chips">${list.map(([id, n]) => {
      const need = n * times;
      const have = mode ? this.g.inventory.count(id) : 0;
      const ok = have >= need;
      return `<span class="chip ${mode ? (ok ? 'ok' : 'low') : ''}">${this.ico(id)}<b>${mode ? `${Math.min(have, need)}/${need}` : `×${need}`}</b><span class="chip-name">${ITEM_DEFS[id].name}</span></span>`;
    }).join('')}</span>`;
  },

  rankBar(state) {
    const lvl = npcRank(state), rank = NPC_RANKS[lvl], next = NPC_RANKS[lvl + 1];
    const to = next ? next.need : rank.need + 1;
    const pct = next ? clamp((state.rep - rank.need) / (to - rank.need), 0, 1) * 100 : 100;
    return `<div class="rank">
      <span class="rank-name">${rank.name}${rank.discount ? ` · −${Math.round(rank.discount * 100)}% no custo` : ''}</span>
      <span class="bar"><span style="width:${pct}%"></span></span>
      <span class="rank-next">${next ? `${state.rep}/${to} para ${next.name}` : 'Confiança máxima'}</span>
    </div>`;
  },

  // ---------- Desenho ----------
  render() {
    this.dialog.innerHTML = this.npc ? this.npcHtml() : this.journalHtml();
    const msg = this.dialog.querySelector('#npc-message');
    if (msg) { msg.textContent = this.message; msg.className = this.messageKind || ''; }
  },

  npcHtml() {
    const v = this.npc, state = npcState(v), job = NPC_PROFESSIONS[state.profession];
    const q = job.quests[state.stage];
    const pending = q ? (state.accepted ? (this.enough(q.cost) ? 'ready' : 'doing') : 'new') : null;
    const mark = pending === 'ready' ? '<b class="pin ok">✓</b>' : pending === 'new' ? '<b class="pin new">!</b>' : pending === 'doing' ? '<b class="pin">…</b>' : '';
    return `
    <header class="npc-top">
      <img class="face" src="${this.portrait(v)}" alt="">
      <div class="who">
        <h2 id="npc-heading">${v.name}</h2>
        <p class="job">${this.ico(job.icon)} ${job.name} · missões concluídas: ${state.completed}</p>
        ${this.rankBar(state)}
      </div>
      <button class="ghost" data-action="close" title="Fechar (Esc)">Fechar <kbd>Esc</kbd></button>
    </header>
    <p class="speech">${this.line || job.greeting}</p>
    <p id="npc-message" role="status"></p>
    <nav class="tabs" role="tablist">
      <button data-action="tab" data-tab="trades" class="${this.tab === 'trades' ? 'on' : ''}" role="tab"><kbd>1</kbd> Trocas</button>
      <button data-action="tab" data-tab="quests" class="${this.tab === 'quests' ? 'on' : ''}" role="tab"><kbd>2</kbd> Missões ${mark}</button>
    </nav>
    <div class="body">${this.tab === 'trades' ? this.tradesHtml(state, job) : this.questsHtml(state, job)}</div>
    <footer class="npc-foot">O jogo fica pausado durante a conversa · <kbd>Tab</kbd> troca de aba · <kbd>J</kbd> abre o diário</footer>`;
  },

  tradesHtml(state, job) {
    const lvl = npcRank(state), inv = this.g.inventory;
    const cards = job.trades.map((trade, i) => {
      const need = trade.level || 0;
      if (need > lvl) {
        return `<section class="card locked">
          <div class="card-head"><b>${trade.name}</b><span class="tag lock">Precisa ser ${NPC_RANKS[need].name}</span></div>
          <p class="hint">Cada troca vale +${REP_PER_TRADE} de reputação e cada missão +${REP_PER_QUEST}.</p>
        </section>`;
      }
      const cost = npcCost(trade, state);
      const left = npcStock(state, i, trade);
      const max = npcMaxTimes(inv, cost, trade.reward, left);
      const n = clamp(this.qtyOf(i), 1, Math.max(1, max));
      const can = max >= n && left > 0;
      const falta = this.missingText(cost.map(([id, c]) => [id, c * n]));
      const cut = cost.some(([, c], k) => c < trade.cost[k][1]);
      return `<section class="card ${can ? 'can' : ''}">
        <div class="card-head">
          <b>${trade.name}</b>
          <span class="tag ${left ? '' : 'out'}">Estoque hoje ${left}/${trade.stock ?? 99}</span>
        </div>
        <div class="deal">
          <div class="side"><span class="lbl">Você dá${cut ? ' <em>· com desconto</em>' : ''}</span>${this.chips(cost, n, 'have')}</div>
          <span class="arrow">➜</span>
          <div class="side"><span class="lbl">Você recebe</span>${this.chips(trade.reward, n)}</div>
        </div>
        <div class="card-foot">
          <div class="stepper" role="group" aria-label="Quantidade">
            <button data-action="qty" data-index="${i}" data-by="-1" ${n <= 1 ? 'disabled' : ''} aria-label="Menos um">−</button>
            <span>×${n}</span>
            <button data-action="qty" data-index="${i}" data-by="1" ${n >= max ? 'disabled' : ''} aria-label="Mais um">+</button>
            <button data-action="qty" data-index="${i}" data-by="max" class="wide" ${max <= 1 ? 'disabled' : ''}>Máx ${max}</button>
          </div>
          <button class="primary" data-action="trade" data-index="${i}" ${can ? '' : 'disabled'}>${left ? `Trocar ×${n}` : 'Esgotado hoje'}</button>
        </div>
        ${falta && left ? `<p class="hint low">${falta}</p>` : ''}
      </section>`;
    }).join('');
    return cards + '<p class="hint">O estoque de cada morador se renova a cada novo dia no mundo.</p>';
  },

  questsHtml(state, job) {
    const q = job.quests[state.stage];
    let html = '';
    if (q) {
      const done = q.cost.reduce((a, [id, n]) => a + Math.min(n, this.g.inventory.count(id)), 0);
      const total = q.cost.reduce((a, [, n]) => a + n, 0);
      const ready = this.enough(q.cost);
      html += `<section class="card quest ${ready ? 'can' : ''}">
        <div class="card-head"><b>${q.title}</b><span class="tag">Missão ${state.stage + 1}/${job.quests.length}</span></div>
        <p class="speech small">${q.text}</p>
        <div class="side"><span class="lbl">Entregar</span>${this.chips(q.cost, 1, 'have')}</div>
        <span class="bar big"><span style="width:${Math.round((done / total) * 100)}%"></span></span>
        <div class="side"><span class="lbl">Recompensa</span>${this.chips(q.reward)}</div>
        <div class="card-foot">
          <span class="hint">${state.accepted ? (ready ? 'Tudo na mochila: pode entregar.' : this.missingText(q.cost)) : `Entregar dá +${REP_PER_QUEST} de reputação`}</span>
          <button class="primary" data-action="${state.accepted ? 'complete' : 'accept'}" ${state.accepted && !ready ? 'disabled' : ''}>${state.accepted ? 'Entregar e receber' : 'Aceitar missão'}</button>
        </div>
      </section>`;
    } else {
      html += '<section class="card"><p class="hint">Você concluiu todos os pedidos deste morador. As trocas continuam abertas.</p></section>';
    }
    const feitas = job.quests.slice(0, state.stage);
    html += '<h3>Já feitas</h3>';
    html += feitas.length
      ? `<ul class="done-list">${feitas.map((d) => `<li>✓ ${d.title}</li>`).join('')}</ul>`
      : '<p class="hint">Nenhuma ainda. Aceite a primeira aí em cima.</p>';
    return html;
  },

  // Onde o morador está em relação ao jogador, em blocos
  whereIs(v) {
    const dx = Math.round((v.cx - this.g.player.cx) / T);
    if (Math.abs(dx) < 6) return 'bem aqui';
    return dx > 0 ? `${dx} blocos a leste ▶` : `◀ ${-dx} blocos a oeste`;
  },

  journalHtml() {
    const known = (this.g.npcs || []).filter((v) => v.services);
    const { active, ready } = npcQuestSummary(this.g);
    const tab = this.tab === 'people' ? 'people' : 'quests';
    return `
    <header class="npc-top plain">
      <div class="who">
        <h2 id="npc-heading">Diário de missões</h2>
        <p class="job">
          <span class="stat">${active} em andamento</span>
          <span class="stat ${ready ? 'ok' : ''}">${ready} pronta${ready === 1 ? '' : 's'} para entregar</span>
          <span class="stat">${known.length} morador${known.length === 1 ? '' : 'es'} conhecido${known.length === 1 ? '' : 's'}</span>
        </p>
      </div>
      <button class="ghost" data-action="close" title="Fechar (Esc)">Fechar <kbd>Esc</kbd></button>
    </header>
    <p id="npc-message" role="status"></p>
    <nav class="tabs" role="tablist">
      <button data-action="tab" data-tab="quests" class="${tab === 'quests' ? 'on' : ''}" role="tab"><kbd>1</kbd> Missões ${active ? `<b class="pin ${ready ? 'ok' : ''}">${active}</b>` : ''}</button>
      <button data-action="tab" data-tab="people" class="${tab === 'people' ? 'on' : ''}" role="tab"><kbd>2</kbd> Moradores ${known.length ? `<b class="pin">${known.length}</b>` : ''}</button>
    </nav>
    <div class="body">${tab === 'quests' ? this.journalQuestsHtml() : this.journalPeopleHtml(known)}</div>
    <footer class="npc-foot">Atalho <kbd>J</kbd> · <kbd>Tab</kbd> troca de aba · <kbd>Esc</kbd> fecha</footer>`;
  },

  journalQuestsHtml() {
    const rows = [];
    for (const v of this.g.npcs || []) {
      const state = v.services;
      if (!state || !state.accepted) continue;
      const job = NPC_PROFESSIONS[state.profession], q = job.quests[state.stage];
      if (!q) continue;
      const done = q.cost.reduce((a, [id, n]) => a + Math.min(n, this.g.inventory.count(id)), 0);
      const total = q.cost.reduce((a, [, n]) => a + n, 0);
      const ready = this.enough(q.cost);
      rows.push({ ready, dist: Math.abs(v.cx - this.g.player.cx), html: `<section class="card ${ready ? 'can' : ''}">
        <div class="card-head"><b>${q.title}</b><span class="tag ${ready ? 'ok' : ''}">${ready ? 'Pronta para entregar' : `${Math.round((done / total) * 100)}%`}</span></div>
        <p class="hint">${this.ico(job.icon)} ${v.name} · ${job.name} · X ${Math.floor(v.cx / T)} · ${this.whereIs(v)}</p>
        <div class="side"><span class="lbl">Entregar</span>${this.chips(q.cost, 1, 'have')}</div>
        <span class="bar big"><span style="width:${Math.round((done / total) * 100)}%"></span></span>
        <div class="side"><span class="lbl">Recompensa</span>${this.chips(q.reward)}</div>
      </section>` });
    }
    // As prontas primeiro; depois as mais perto
    rows.sort((a, b) => (b.ready - a.ready) || (a.dist - b.dist));
    return rows.map((r) => r.html).join('')
      || '<section class="card"><p class="hint">Nenhuma missão aceita. Chegue perto de um morador e clique com o botão direito: o <b>!</b> acima da cabeça quer dizer que ele tem um pedido.</p></section>';
  },

  journalPeopleHtml(known) {
    if (!known.length) return '<section class="card"><p class="hint">Você ainda não conversou com ninguém. As vilas ficam na superfície: procure as casas com telhado e jardim.</p></section>';
    const rows = known.map((v) => {
      const s = v.services, job = NPC_PROFESSIONS[s.profession], q = job.quests[s.stage];
      const mark = !q ? ['done', 'Tudo entregue'] : s.accepted ? (this.enough(q.cost) ? ['ok', 'Pronta para entregar'] : ['doing', 'Missão em andamento']) : ['new', 'Tem um pedido novo'];
      return { dist: Math.abs(v.cx - this.g.player.cx), html: `<li class="person ${mark[0]}">
        <span class="p-ico">${this.ico(job.icon)}</span>
        <span class="p-main"><b>${v.name}</b><small>${job.name} · ${NPC_RANKS[npcRank(s)].name}${s.completed ? ` · ${s.completed} missão(ões) feita(s)` : ''}</small></span>
        <span class="p-where">X ${Math.floor(v.cx / T)}<small>${this.whereIs(v)}</small></span>
        <span class="p-tag">${mark[1]}</span>
      </li>` };
    });
    rows.sort((a, b) => a.dist - b.dist);
    return `<ul class="people">${rows.map((r) => r.html).join('')}</ul>
      <p class="hint">Ordenados pelo mais perto de você. Cada morador tem estoque e reputação próprios.</p>`;
  },

  say(text, kind) { this.message = text; this.messageKind = kind || ''; },

  // ---------- Ações ----------
  act(action, index) {
    const v = this.npc, g = this.g;
    if (!v || !this.dialog.open) return;
    if (!(g.npcs || []).includes(v) || Math.hypot(v.cx - g.player.cx, v.cy - g.player.cy) > 5 * T) {
      this.say('Chegue mais perto deste morador.', 'bad');
      this.render();
      return;
    }
    const state = npcState(v), job = NPC_PROFESSIONS[state.profession], q = job.quests[state.stage];
    if (action === 'accept' && q && !state.accepted) {
      state.accepted = true;
      this.say('Missão aceita! Acompanhe pelo diário (J).', 'good');
      playSfx('select');
    }
    if (action === 'complete' && q && state.accepted) {
      const error = npcExchange(g.inventory, q.cost, q.reward);
      if (error) { this.say(error, 'bad'); playSfx('invClose'); }
      else {
        const before = npcRank(state);
        state.stage++; state.completed++; state.accepted = false; state.rep += REP_PER_QUEST;
        const after = npcRank(state);
        this.say(`Missão concluída! +${REP_PER_QUEST} de reputação${after > before ? ` · agora você é ${NPC_RANKS[after].name}` : ''}.`, 'good');
        playSfx('craft');
        v.bubble = { text: 'Obrigado! Isso ajuda a vila inteira.', t: 6 };
      }
    }
    if (action === 'trade') {
      const trade = job.trades[index];
      if (!trade || (trade.level || 0) > npcRank(state)) this.say('Ele ainda não confia em você para esta troca.', 'bad');
      else {
        const cost = npcCost(trade, state), left = npcStock(state, index, trade);
        const n = Math.min(this.qtyOf(index), left);
        if (left <= 0) this.say('O estoque de hoje acabou. Volte amanhã.', 'bad');
        else {
          const before = npcRank(state);
          const error = npcExchange(g.inventory, cost, trade.reward, n);
          if (error) { this.say(error, 'bad'); playSfx('invClose'); }
          else {
            state.stock[index] = left - n;
            state.rep += REP_PER_TRADE;
            this.qty[index] = 1;
            const after = npcRank(state);
            this.say(`Troca feita: ${this.items(trade.reward.map(([id, c]) => [id, c * n]))}.${after > before ? ` Agora você é ${NPC_RANKS[after].name}!` : ''}`, 'good');
            playSfx('chest');
          }
        }
      }
    }
    this.render();
  },
};

const NPC_CSS = `
#npc-services{display:flex;flex-direction:column;box-sizing:border-box;width:min(880px,95vw);max-height:90vh;padding:0;border:0;overflow:hidden;color:#efe6d2;background:#1b2027;font:400 13px/1.5 Silkscreen,monospace;box-shadow:0 0 0 3px #0a0c0f,0 0 0 6px #56616b,0 0 0 9px #0a0c0f,0 28px 70px rgba(0,0,0,.6)}
#npc-services::backdrop{background:rgba(6,10,15,.78)}
#npc-services *{box-sizing:border-box}
#npc-services h2{margin:0;font-weight:400;font-size:21px;letter-spacing:1px;color:#ffd27a}
#npc-services h3{margin:14px 20px 4px;font-weight:400;font-size:12px;color:#e0a44a;text-transform:uppercase;letter-spacing:2px}
#npc-services p{margin:0}
#npc-services kbd{font:400 9px Silkscreen,monospace;color:#1a130b;background:#d9cfb8;padding:3px 5px 4px;box-shadow:0 0 0 2px #0a0c0f}

#npc-services .npc-top{display:flex;align-items:center;gap:16px;padding:14px 18px;background:#252c35;border-bottom:3px solid #0a0c0f;box-shadow:inset 0 3px 0 #323a44}
#npc-services .npc-top .face{width:64px;height:64px;image-rendering:pixelated;background:#26303a;margin:9px;box-shadow:0 0 0 3px #0a0c0f,0 0 0 6px #4a5560,0 0 0 9px #0a0c0f}
#npc-services .npc-top .who{flex:1;min-width:0}
#npc-services .job{display:flex;align-items:center;gap:6px;margin-top:6px;font:12px monospace;color:#c9c1ad}
#npc-services .ghost{align-self:flex-start;display:flex;align-items:center;gap:8px;font:400 11px Silkscreen,monospace;color:#efe6d2;background:#343c45;border:0;padding:9px 12px;cursor:pointer;box-shadow:0 0 0 3px #0a0c0f,inset 0 3px 0 #4f5a64,inset 0 -3px 0 #232930}
#npc-services .ghost:hover{background:#434d57;color:#ffd27a}

#npc-services .rank{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:10px;margin-top:8px}
#npc-services .rank-name{font-size:11px;color:#ffd27a}
#npc-services .rank-next{font:11px monospace;color:#9aa3a9}
#npc-services .bar{height:10px;background:#101318;overflow:hidden;box-shadow:0 0 0 2px #0a0c0f}
#npc-services .bar>span{display:block;height:100%;background:#c7812f;box-shadow:inset 0 3px 0 #f0b25e,inset 0 -3px 0 #8a5220}
#npc-services .bar.big{display:block;height:8px;margin:10px 0}
#npc-services .can .bar.big>span{background:#6f9c45;box-shadow:inset 0 3px 0 #9fce70,inset 0 -3px 0 #486a2a}

#npc-services .speech{margin:14px 20px 0;padding:10px 14px;font:13px monospace;color:#d8cfb8;background:#151a20;border-left:3px solid #e0a44a}
#npc-services .speech.small{margin:0 0 10px;font-size:12px}
#npc-services #npc-message{margin:0 20px;font:12px monospace;color:#ffe2a6}
#npc-services #npc-message:not(:empty){margin-top:12px;padding:9px 12px;background:#20262e;box-shadow:0 0 0 2px #0a0c0f}
#npc-services #npc-message.good{color:#bde591;box-shadow:0 0 0 2px #0a0c0f,inset 3px 0 0 #6f9c45}
#npc-services #npc-message.bad{color:#ffb9a2;box-shadow:0 0 0 2px #0a0c0f,inset 3px 0 0 #a4503c}

#npc-services .tabs{display:flex;margin:14px 20px 0;box-shadow:0 0 0 3px #0a0c0f}
#npc-services .tabs button{flex:1;display:flex;align-items:center;justify-content:center;gap:8px;font:400 12px Silkscreen,monospace;color:#b9c0c5;background:#262c33;border:0;padding:11px 8px;cursor:pointer;box-shadow:inset -3px 0 0 #0a0c0f}
#npc-services .tabs button:last-child{box-shadow:none}
#npc-services .tabs button:hover{color:#ffd27a}
#npc-services .tabs button.on{background:#c7812f;color:#1a130b}
#npc-services .tabs button.on kbd{color:#f0b25e;background:#1a130b;box-shadow:none}
#npc-services .pin{display:grid;place-items:center;width:18px;height:18px;font-size:11px;color:#ffd082;background:#0a0c0f}
#npc-services .pin.ok{color:#bde591}
#npc-services .pin.new{color:#ff9d5c}

#npc-services .body{flex:1;display:flex;flex-direction:column;gap:12px;overflow:auto;padding:14px 20px 4px;scrollbar-color:#56616b #101318}
#npc-services .card{padding:12px 14px;background:#232a32;box-shadow:0 0 0 2px #0a0c0f,inset 3px 0 0 #56616b}
#npc-services .card.can{background:#25302a;box-shadow:0 0 0 2px #0a0c0f,inset 3px 0 0 #6f9c45}
#npc-services .card.locked{opacity:.55;background:#1e222a}
#npc-services .card-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px}
#npc-services .card-head b{font-weight:400;font-size:14px;color:#efe6d2}
#npc-services .tag{padding:4px 8px;font:11px monospace;color:#9aa3a9;background:#101318;white-space:nowrap}
#npc-services .tag.ok{color:#bde591}
#npc-services .tag.out{color:#ffb9a2}
#npc-services .tag.lock{color:#e0a44a}

#npc-services .deal{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:12px}
#npc-services .arrow{font-size:18px;color:#e0a44a}
#npc-services .side{min-width:0}
#npc-services .lbl{display:block;margin-bottom:6px;font-size:10px;letter-spacing:1px;color:#8d959b;text-transform:uppercase}
#npc-services .lbl em{font-style:normal;color:#bde591}
#npc-services .chips{display:flex;flex-wrap:wrap;gap:6px}
#npc-services .chip{display:flex;align-items:center;gap:6px;padding:5px 9px 5px 5px;background:#171c22;box-shadow:0 0 0 2px #0a0c0f}
#npc-services .chip b{font:400 12px Silkscreen,monospace;color:#efe6d2}
#npc-services .chip.ok b{color:#bde591}
#npc-services .chip.low b{color:#ff9d8a}
#npc-services .chip-name{max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:11px monospace;color:#9aa3a9}
#npc-services .ico{display:inline-block;flex:none;width:32px;height:32px;vertical-align:middle;background-image:var(--atlas);background-size:var(--atlas-w) 32px;background-position:calc(var(--i) * -32px) 0;image-rendering:pixelated}

#npc-services .card-foot{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:14px;margin-top:12px}
#npc-services .stepper{display:flex;align-items:center;box-shadow:0 0 0 2px #0a0c0f}
#npc-services .stepper button{font:400 13px Silkscreen,monospace;color:#efe6d2;background:#343c45;border:0;padding:8px 12px;cursor:pointer;box-shadow:inset 0 3px 0 #4f5a64,inset 0 -3px 0 #232930}
#npc-services .stepper button.wide{padding:8px 10px;font-size:11px}
#npc-services .stepper button:hover:not(:disabled){background:#434d57;color:#ffd27a}
#npc-services .stepper span{min-width:54px;padding:8px 6px;text-align:center;font-size:12px;color:#ffd27a;background:#101318}
#npc-services button.primary{padding:11px 18px;font:400 12px Silkscreen,monospace;text-transform:uppercase;letter-spacing:1px;color:#1a130b;background:#c7812f;border:0;cursor:pointer;box-shadow:0 0 0 3px #0a0c0f,inset 0 3px 0 #f0b25e,inset 0 -3px 0 #8a5220}
#npc-services button.primary:hover:not(:disabled){background:#dc9540}
#npc-services button.primary:active:not(:disabled){transform:translateY(1px);box-shadow:0 0 0 3px #0a0c0f,inset 0 3px 0 #8a5220,inset 0 -3px 0 #f0b25e}
#npc-services button:disabled{opacity:.4;cursor:not-allowed}
#npc-services button:focus-visible{outline:3px solid #ffd27a;outline-offset:3px}

#npc-services .hint{font:12px monospace;color:#9aa3a9}
#npc-services .body>.hint{padding:0 2px 10px}
#npc-services .hint.low{margin-top:10px;color:#ff9d8a}
#npc-services .done-list{margin:0 20px 8px;padding:0;list-style:none;font:12px monospace;color:#9aa3a9}
#npc-services .done-list li{padding:5px 0;color:#bde591}

#npc-services .stat{display:inline-block;margin-right:10px;padding:3px 8px;background:#101318;color:#c9c1ad}
#npc-services .stat.ok{color:#bde591}
#npc-services .job{flex-wrap:wrap}

#npc-services .people{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:6px}
#npc-services .person{display:grid;grid-template-columns:auto 1fr auto auto;align-items:center;gap:12px;padding:9px 12px;background:#232a32;box-shadow:0 0 0 2px #0a0c0f,inset 3px 0 0 #56616b}
#npc-services .person.new{box-shadow:0 0 0 2px #0a0c0f,inset 3px 0 0 #ff9d5c}
#npc-services .person.ok{background:#25302a;box-shadow:0 0 0 2px #0a0c0f,inset 3px 0 0 #6f9c45}
#npc-services .person.doing{box-shadow:0 0 0 2px #0a0c0f,inset 3px 0 0 #ffd082}
#npc-services .person.done{opacity:.7}
#npc-services .p-main{display:flex;flex-direction:column;min-width:0}
#npc-services .p-main b{font-weight:400;font-size:13px;color:#efe6d2}
#npc-services .p-main small,#npc-services .p-where small{font:11px monospace;color:#9aa3a9}
#npc-services .p-where{display:flex;flex-direction:column;text-align:right;font-size:11px;color:#c9c1ad;white-space:nowrap}
#npc-services .p-tag{min-width:130px;padding:5px 8px;text-align:center;font:11px monospace;color:#9aa3a9;background:#101318}
#npc-services .person.new .p-tag{color:#ff9d5c}
#npc-services .person.ok .p-tag{color:#bde591}
#npc-services .person.doing .p-tag{color:#ffd082}
#npc-services .pin b,#npc-services .tabs .pin{font-weight:400}
#npc-services .npc-foot{margin-top:10px;padding:11px 20px;font:11px monospace;color:#7d858b;background:#20262e;border-top:3px solid #0a0c0f}

@media (max-width:640px){
  #npc-services .deal{grid-template-columns:1fr;gap:8px}
  #npc-services .arrow{justify-self:center;transform:rotate(90deg)}
  #npc-services .chip-name{display:none}
  #npc-services .person{grid-template-columns:auto 1fr;gap:8px}
  #npc-services .p-where,#npc-services .p-tag{grid-column:2;text-align:left;min-width:0}
}
`;
