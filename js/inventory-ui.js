'use strict';

const HOTBAR_SIZE = 10;
const INV_COLS = 10;
const INV_ROWS = 5;
const UI_FONT = '8px Silkscreen, monospace';
const TOOLTIP_TEXT_W = 176; // largura máxima de uma linha de descrição no balão (unidades de UI)

// Quebra o texto em linhas que cabem em `maxW` com a fonte atual do ctx
function wrapTooltipText(ctx, text, maxW) {
  const out = [];
  maxW=Math.max(1,maxW);
  for(const paragraph of String(text??'').split(/\r?\n/)) {
    let line='';
    for(const word of paragraph.trim().split(/\s+/).filter(Boolean)) {
      const next=line?line+' '+word:word;
      if(ctx.measureText(next).width<=maxW){line=next;continue;}
      if(line){out.push(line);line='';}
      // Names, keyboard shortcuts and unbroken strings must also fit.
      for(const char of word){if(line&&ctx.measureText(line+char).width>maxW){out.push(line);line='';}line+=char;}
    }
    if(line)out.push(line);
    else if(!paragraph.trim())out.push('');
  }
  return out;
}

// Medidas em "pixels de UI" (multiplicados pela escala da tela)
const UI = {
  ORIGIN: 12,       // posição na tela (px reais)
  W: 232,
  PAD: 7,
  SLOT: 20,
  GAP: 2,
  HEADER_H: 26,
  BAR_Y: 28,
  GRID_Y: 43,       // linha da barra rápida
  MAIN_Y: 68,       // demais linhas
  BOTTOM_Y: 157,
  H: 187,
  HOTBAR_H: 33,
};

// Janela de criação (coordenadas relativas ao canto da janela).
// De cima para baixo: bancada de ingredientes → o que dá para fazer → livro de receitas.
const CRAFT = {
  W: 150,
  H: 256,
  BENCH_X: 8,
  BENCH_Y: 44,      // fileira dos ingredientes
  CLEAR_X: 120,     // botão de devolver tudo
  MAKE_BAR: 70,
  MAKE_Y: 86,       // fileira dos resultados possíveis
  MAKE_COLS: 5,
  BOOK_BAR: 112,
  FILTER_Y: 128,    // fileira do filtro: caixinha do item + busca por nome + "só o que dá"
  LIST_Y: 152,      // lista de receitas
  ROW_H: 20,
  ROWS: 4,
  BOTTOM_Y: 234,
};

// Janela de um contêiner do mundo (maleta, baú, bolsa do elefante).
// O rodapé tem duas fileiras: "pegar tudo" + organizar, e "guardar mochila".
const CHEST = { W: 122, COLS: 5, GRID_X: 7, GRID_Y: 44, BOTTOM_Y: 92, H: 134 };

// Tema "kit de sobrevivência": alumínio rebitado do avião, couro da maleta, madeira da criação e âmbar do fogo.
// lime/limeBright mantêm o nome antigo (o mapa também usa), mas agora são o âmbar de destaque.
const UIC = {
  outline: '#0a0c0f',
  frame: '#56616b',
  frameLight: '#95a2ab',
  frameDark: '#343b43',
  rivet: '#dfe5e8',
  body: '#1b2027',
  bodyGrain: '#1f252d',
  header: '#252c35',
  headerLight: '#323a44',
  bar: '#13171d',
  well: '#14181d',
  hotbarWell: '#271f15',
  slotBorder: '#0b0e12',
  slot: '#2f3740',
  slotHover: '#3f4953',
  selected: '#ffc861',
  lime: '#e0a44a',
  limeBright: '#ffd27a',
  text: '#efe6d2',
  textDim: '#8d959b',
  textSoft: '#c9c1ad',
};

function rrect(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x + 1, y, w - 2, h);
  ctx.fillRect(x, y + 1, w, h - 2);
}

// Moldura padrão das janelas: chapa de alumínio com rebites e miolo escuro escovado
let uiGrain = null;
function uiFrame(ctx, x, y, w, h) {
  rrect(ctx, x, y, w, h, UIC.outline);
  rrect(ctx, x + 1, y + 1, w - 2, h - 2, UIC.frame);
  ctx.fillStyle = UIC.frameLight;
  ctx.fillRect(x + 2, y + 1, w - 4, 1);
  ctx.fillRect(x + 1, y + 2, 1, h - 4);
  ctx.fillStyle = UIC.frameDark;
  ctx.fillRect(x + 2, y + h - 2, w - 4, 1);
  ctx.fillRect(x + w - 2, y + 2, 1, h - 4);
  ctx.fillStyle = UIC.outline;
  ctx.fillRect(x + 3, y + 3, w - 6, h - 6);

  if (!uiGrain) {
    const c = makeCanvas(6, 6), g = c.getContext('2d');
    g.fillStyle = UIC.body; g.fillRect(0, 0, 6, 6);
    g.fillStyle = UIC.bodyGrain;
    for (let i = 0; i < 6; i++) g.fillRect(i, 5 - i, 1, 1);
    uiGrain = ctx.createPattern(c, 'repeat');
  }
  ctx.fillStyle = uiGrain;
  ctx.fillRect(x + 4, y + 4, w - 8, h - 8);

  const rivet = (rx, ry) => {
    ctx.fillStyle = UIC.rivet; ctx.fillRect(rx, ry, 1, 1);
    ctx.fillStyle = UIC.frameDark; ctx.fillRect(rx + 1, ry, 1, 1);
  };
  rivet(x + 1, y + 1); rivet(x + w - 3, y + 1); rivet(x + 1, y + h - 2); rivet(x + w - 3, y + h - 2);
  for (let rx = x + 26; rx < x + w - 26; rx += 30) rivet(rx, y + 1);
}

// Faixa de cabeçalho: 'metal' (inventário), 'leather' (maleta) ou 'wood' (criação)
function uiHeaderFill(ctx, x, y, w, h, style) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (style === 'leather') {
    ctx.fillStyle = '#6b4226'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#85552f'; ctx.fillRect(x, y, w, 1);
    ctx.fillStyle = '#5a371f';
    for (let i = 0; i < w; i += 5) ctx.fillRect(x + i + ((i * 7) % 3), y + 4 + ((i * 13) % (h - 8)), 2, 1);
    ctx.fillStyle = '#d8b07a'; // costura
    for (let i = 4; i < w - 4; i += 4) { ctx.fillRect(x + i, y + 2, 2, 1); ctx.fillRect(x + i, y + h - 3, 2, 1); }
    ctx.fillStyle = '#e2b75a'; // cantoneiras de latão
    ctx.fillRect(x, y, 3, 3); ctx.fillRect(x + w - 3, y, 3, 3);
    ctx.fillStyle = '#9c7430';
    ctx.fillRect(x + 2, y + 2, 1, 1); ctx.fillRect(x + w - 3, y + 2, 1, 1);
  } else if (style === 'wood') {
    const planks = ['#6a4a2c', '#76532f', '#6e4d2d'];
    for (let py = 0, k = 0; py < h; py += 7, k++) {
      ctx.fillStyle = planks[k % 3]; ctx.fillRect(x, y + py, w, 7);
      ctx.fillStyle = '#8a6440'; ctx.fillRect(x, y + py, w, 1);
      ctx.fillStyle = '#3d2a19'; ctx.fillRect(x, y + py + 6, w, 1);
      ctx.fillStyle = '#5a3d24';
      for (let i = (k * 11) % 9; i < w; i += 13) ctx.fillRect(x + i, y + py + 3, 5, 1); // veios
      ctx.fillStyle = '#c9b89a'; // pregos
      ctx.fillRect(x + 3, y + py + 3, 1, 1); ctx.fillRect(x + w - 4, y + py + 3, 1, 1);
    }
  } else {
    ctx.fillStyle = UIC.header; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = UIC.headerLight; ctx.fillRect(x, y, w, 1);
  }
  ctx.restore();
}

function inRect(u, v, r) {
  return u >= r[0] && v >= r[1] && u < r[0] + r[2] && v < r[1] + r[3];
}

// Busca sem frescura: sem maiúsculas e sem acentos ("tabua" acha "Tábuas")
function foldText(s) {
  return String(s).trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Nome da receita + resultado + ingredientes, guardado na própria receita
function recipeSearchText(r) {
  if (!r.searchText) r.searchText = foldText(`${r.name} ${recipeStationName(r)} ${ITEM_DEFS[r.result.item].name} ${r.items.map((n) => ITEM_DEFS[n.item].name).join(' ')}`);
  return r.searchText;
}

class InventoryUI {
  constructor(game, input, renderer) {
    this.game = game;
    this.inv = game.inventory;
    this.input = input;
    this.renderer = renderer;
    this.open = false;
    this.held = null;  // pilha "no cursor"
    this.trash = null; // último item jogado no lixo (recuperável)
    this.craftOpen = false;
    this.makePage = 0;
    this.station = null;
    this.bench = Array(BENCH_SLOTS).fill(null); // ingredientes em cima da bancada
    this.filter = null;   // item na caixinha do livro (mostra só o que mexe com ele)
    this.onlyCraftable = false; // livro: esconder receitas sem material
    this.search = '';       // texto digitado na busca do livro
    this.searchFocus = false; // com o cursor na busca, as teclas viram texto
    this.bookScroll = 0;  // primeira linha visível da lista de receitas
    this.container = null; // { title, subtitle, slots, source, icon }
    this.lastClick = null; // clique duplo num espaço: junta todas as pilhas iguais
  }

  // ---------- Janela lateral (criação ou contêiner) ----------
  // Tem posição e escala próprias, para caber na tela mesmo quando o inventário é grande
  sidePanel() {
    const c = this.renderer.canvas, s0 = this.scale();
    const w = this.container ? CHEST.W : CRAFT.W;
    const h = this.container ? this.chestH : CRAFT.H;
    let s = s0;
    while (s > 1 && (h * s > c.height - UI.ORIGIN * 2 || w * s > c.width - UI.ORIGIN * 2)) s--;
    let ox = UI.ORIGIN + UI.W * s0 + 6, oy = UI.ORIGIN;
    if (ox + w * s > c.width - UI.ORIGIN) { ox = UI.ORIGIN; oy = UI.ORIGIN + UI.H * s0 + 6; } // não cabe ao lado
    oy = Math.min(oy, Math.max(UI.ORIGIN, c.height - UI.ORIGIN - h * s));
    ox = Math.min(ox, Math.max(UI.ORIGIN, c.width - UI.ORIGIN - w * s));
    return { ox, oy, s, w, h };
  }

  toPanel(mx, my) {
    const p = this.sidePanel();
    return { u: (mx - p.ox) / p.s, v: (my - p.oy) / p.s, p };
  }

  // Baú grande tem mais linhas: a janela cresce para baixo
  get chestExtra() { return this.container ? Math.max(0, Math.ceil(this.container.slots.length / CHEST.COLS) - 2) * (UI.SLOT + UI.GAP) : 0; }
  // Contêiner com espaço de equipamento (a sela do elefante) ganha uma linha própria em cima
  get equipH() { return this.container?.equip ? UI.SLOT + 6 : 0; }
  get chestGridY() { return CHEST.GRID_Y + this.equipH; }
  get chestBottom() { return CHEST.BOTTOM_Y + this.chestExtra + this.equipH; }
  get chestH() { return CHEST.H + this.chestExtra + this.equipH; }

  chestSlotRect(i) {
    return [CHEST.GRID_X + (i % CHEST.COLS) * (UI.SLOT + UI.GAP), this.chestGridY + Math.floor(i / CHEST.COLS) * (UI.SLOT + UI.GAP), UI.SLOT, UI.SLOT];
  }

  get equipSlotRect() { return [CHEST.GRID_X, CHEST.GRID_Y, UI.SLOT, UI.SLOT]; }
  get chestCloseRect() { return [CHEST.W - 17, 6, 12, 12]; }
  get chestTakeRect() { return [7, this.chestBottom + 4, CHEST.W - 36, 14]; }
  get chestSortRect() { return [CHEST.W - 25, this.chestBottom + 2, 18, 18]; }
  get chestStoreRect() { return [7, this.chestBottom + 22, CHEST.W - 14, 14]; }

  openContainer(c) {
    this.closeCraft();
    this.container = c;
    this.open = true;
  }

  closeContainer() {
    this.container = null;
  }

  // Move tudo que couber do contêiner para o inventário
  takeAll() {
    const slots = this.container.slots;
    for (let i = 0; i < slots.length; i++) this.returnToInventory(slots, i);
    if (slots.some(Boolean)) toast('Inventário cheio!');
    else playSfx('pickup');
  }

  // Manda a mochila (tudo fora da barra rápida) para o contêiner: a barra de ferramentas fica intacta
  storeAll() {
    const slots = this.container.slots;
    let moved = 0, left = 0, kept = 0;
    for (let i = HOTBAR_SIZE; i < this.inv.slots.length; i++) {
      const s = this.inv.slots[i];
      if (!s) continue;
      if (s.fav) { kept++; continue; } // favoritos ficam na mochila
      this.inv.slots[i] = null;
      const rest = Inventory.prototype.addRange.call({ slots }, s.item, s.count, 0, slots.length);
      if (rest > 0) { this.inv.slots[i] = { item: s.item, count: rest }; left++; }
      if (rest < s.count) moved++;
    }
    const favs = kept ? (kept > 1 ? `  favoritos ficaram na mochila.` : ' 1 favorito ficou na mochila.') : '';
    if (!moved) toast(left ? 'Não coube nada: o contêiner está cheio.' : kept ? `Nada para guardar:${favs}` : 'A mochila já está vazia.');
    else { playSfx('chest'); toast((left ? 'Guardado o que coube.' : 'Mochila guardada.') + favs); }
  }

  // Junta todas as pilhas iguais no cursor (clique duplo), começando pelas menores
  collectAll() {
    const h = this.held;
    if (!h) return;
    const max = maxStackOf(h.item);
    const pools = [this.inv.slots];
    if (this.container) pools.push(this.container.slots);
    else if (this.craftOpen) pools.push(this.bench);
    for (const slots of pools) {
      const ordered = slots.map((s, i) => [s, i]).filter(([s]) => s && s.item === h.item).sort((a, b) => a[0].count - b[0].count);
      for (const [s, i] of ordered) {
        if (h.count >= max) return;
        const n = Math.min(max - h.count, s.count);
        h.count += n;
        s.count -= n;
        if (s.count === 0) slots[i] = null;
      }
    }
  }

  get closeRect() { return [UI.W - 17, 6, 12, 12]; }
  equipmentPanel() {
    const c=this.renderer.canvas,s=Math.max(1,Math.min(this.scale(),2,Math.floor((c.height-12-345)/240*2)/2));
    return {s,x:c.width-112*s-12,y:c.height-240*s-12,w:112,h:240};
  }
  get armorRect(){return [8,54,UI.SLOT,UI.SLOT];}
  get hatRect(){return [8,31,UI.SLOT,UI.SLOT];}
  get bootsRect(){return [8,77,UI.SLOT,UI.SLOT];}
  get accessoryRects(){return Array.from({length:ACCESSORY_SLOTS},(_,i)=>[8,107+i*23,UI.SLOT,UI.SLOT]);}
  cooldownState(item) {
    const g=this.game,def=ITEM_DEFS[item];
    if(!def)return null;
    if(def.referencePower&&REFERENCE_COOLDOWNS[def.referencePower])return {item,total:REFERENCE_COOLDOWNS[def.referencePower],left:Math.max(0,(referenceState(g).ready[def.referencePower]||0)-(g.clock||0)),ability:!!def.acessorio};
    const powers=[['rugido','roarReady'],['esquiva','dashReady'],['escudo','blockReady'],['instinto','instinctReady'],['casulo','cocoonReady']];
    for(const [power,timer] of powers)if(def[power]?.espera) {
      return {item,total:def[power].espera,left:Math.max(0,(g[timer]||0)-(g.clock||0)),ability:true};
    }
    // Intervalos de armas também usam seus temporizadores existentes.
    if(def.arco&&g.bow?.item===item&&g.bow.cooldown>0)
      return {item,total:BOW.cooldown,left:g.bow.cooldown};
    if(def.tridente&&g.trident?.item===item&&g.trident.cooldown>0)
      return {item,total:g.trident.cooldownTotal||.1,left:g.trident.cooldown};
    if(g.attackCooldownItem===item&&g.sword?.item===item&&!g.sword.active&&g.attackCooldown>0)
      return {item,total:SWORD.intervalo+(g.sword.prof?.espera||0),left:g.attackCooldown};
    return null;
  }
  cooldownText(state) {
    return state.left>0?(state.total<2?(Math.ceil(state.left*10)/10).toFixed(1):Math.ceil(state.left))+'s':'PRONTO';
  }
  cooldownIndicators() {
    const g=this.game,items=new Set();
    playerAccessories(g).forEach(slot=>{if(slot)items.add(slot.item);});
    if(g.outfit)items.add(g.outfit);
    if(g.hat)items.add(g.hat);if(g.boots)items.add(g.boots);
    // A bebida reutilizável pode aparecer na mochila; outros equipamentos exigem estar vestidos.
    this.inv.slots.forEach(slot=>{if(slot&&ITEM_DEFS[slot.item]?.rugido)items.add(slot.item);});
    // Ordem fixa: retirar ou reorganizar um item não duplica o indicador.
    return [...items].sort((a,b)=>a-b).map(item=>this.cooldownState(item)).filter(state=>state?.ability);
  }
  cooldownIndicatorRect(index) {
    const s=this.scale(),start=UI.W+12+(this.game.smartCursor?34:0);
    const width=(this.renderer.canvas.width-UI.ORIGIN*2)/s;
    const side=Math.max(0,Math.floor((width-start+6)/42));
    if(index<side)return [start+index*42,0,30,UI.HOTBAR_H];
    const columns=Math.max(1,Math.floor(width/42)),i=index-side;
    return [6+(i%columns)*42,UI.HOTBAR_H+21+Math.floor(i/columns)*51,30,UI.HOTBAR_H];
  }
  get trashRect() { return [UI.W - UI.PAD - UI.SLOT, UI.BOTTOM_Y + 4, UI.SLOT, UI.SLOT]; }
  get sortRect() { return [UI.W - UI.PAD - UI.SLOT - 22, UI.BOTTOM_Y + 5, 18, 18]; }
  get craftBtnRect() { return [UI.W - UI.PAD - UI.SLOT - 44, UI.BOTTOM_Y + 5, 18, 18]; }
  get salvageRect() { return [UI.W - UI.PAD - UI.SLOT - 66, UI.BOTTOM_Y + 5, 18, 18]; }

  // ---------- Bancada e livro de receitas (coordenadas dentro da janela de criação) ----------
  benchSlotRect(i) { return [CRAFT.BENCH_X + i * (UI.SLOT + UI.GAP), CRAFT.BENCH_Y, UI.SLOT, UI.SLOT]; }
  makeSlotRect(i) { return [CRAFT.BENCH_X + i * (UI.SLOT + UI.GAP), CRAFT.MAKE_Y, UI.SLOT, UI.SLOT]; }
  get makePrevRect() { return [120, CRAFT.MAKE_Y, 12, UI.SLOT]; }
  get makeNextRect() { return [134, CRAFT.MAKE_Y, 12, UI.SLOT]; }
  benchResults() {
    const list = benchRecipes(this.bench, this.station?.kind);
    this.makePage = clamp(this.makePage, 0, Math.max(0, Math.ceil(list.length / CRAFT.MAKE_COLS) - 1));
    return list;
  }
  benchResult(i) { return this.benchResults()[this.makePage * CRAFT.MAKE_COLS + i]; }
  turnMakePage(dir) {
    const list = this.benchResults();
    this.makePage = clamp(this.makePage + dir, 0, Math.max(0, Math.ceil(list.length / CRAFT.MAKE_COLS) - 1));
  }
  get benchClearRect() { return [CRAFT.CLEAR_X, CRAFT.BENCH_Y + 1, 18, 18]; }
  get filterRect() { return [CRAFT.BENCH_X, CRAFT.FILTER_Y, UI.SLOT, UI.SLOT]; }
  get searchRect() { return [CRAFT.BENCH_X + 24, CRAFT.FILTER_Y + 1, CRAFT.W - CRAFT.BENCH_X - 54, 18]; }
  get onlyCraftableRect() { return [CRAFT.W - 26, CRAFT.FILTER_Y + 1, 18, 18]; }
  listRowRect(i) { return [6, CRAFT.LIST_Y + i * CRAFT.ROW_H, CRAFT.W - 24, CRAFT.ROW_H - 1]; }
  get scrollUpRect() { return [CRAFT.W - 16, CRAFT.LIST_Y, 10, 10]; }
  get scrollDownRect() { return [CRAFT.W - 16, CRAFT.LIST_Y + CRAFT.ROWS * CRAFT.ROW_H - 11, 10, 10]; }
  get craftCloseRect() { return [CRAFT.W - 17, 6, 12, 12]; }

  // Botão do livro na tela, logo abaixo do minimapa (px reais)
  bookBtnRect() {
    const s = this.scale(), m = this.game.mapUI.minimapRect();
    const size = 22 * s;
    return [m[0] + m[2] - size, m[1] + m[3] + 6 * s, size, size];
  }

  // Botão do diário de missões, ao lado do livro
  journalBtnRect() {
    const s = this.scale(), b = this.bookBtnRect();
    return [b[0] - b[2] - 4 * s, b[1], b[2], b[3]];
  }

  // Botão do bestiário, ao lado do diário
  bestiaryBtnRect() {
    const s = this.scale(), b = this.journalBtnRect();
    return [b[0] - b[2] - 4 * s, b[1], b[2], b[3]];
  }
  guideBtnRect() {
    const s=this.scale(),b=this.bestiaryBtnRect();
    return [b[0]-b[2]-4*s,b[1],b[2],b[3]];
  }

  bookBtnVisible() {
    return !this.game.intro?.active && !this.game.mapUI.open;
  }

  // Receitas mostradas no livro: todas, ou só as que mexem com o item do filtro.
  // Com o botão do "✓" ligado some tudo que falta material; a busca corta por nome.
  bookList() {
    let list = craftRecipes();
    if (this.filter) {
      const faz = recipesMaking(this.filter);
      list = [...faz, ...recipesUsing(this.filter).filter((r) => !faz.includes(r))];
    }
    if (this.station) list = list.filter((r) => r.station === this.station.kind);
    if (this.onlyCraftable) list = list.filter((r) => this.canCraft(r));
    const q = foldText(this.search);
    if (q) list = list.filter((r) => recipeSearchText(r).includes(q));
    return list;
  }

  canCraft(r) { return stationRecipeAllowed(r, this.station?.kind) && r.items.every((n) => this.inv.count(n.item) >= n.count); }

  // ---------- Busca do livro ----------
  // Enquanto a caixa está com o cursor, as teclas escrevem em vez de mexer no jogador
  setSearchFocus(on) {
    if (this.searchFocus === on) return;
    this.searchFocus = on;
    input.textMode = on;
    if (on) input.keys.clear();
  }

  setSearch(text) {
    this.search = text;
    this.bookScroll = 0;
  }

  searchClick(button) {
    if (button === 2) { this.setSearch(''); this.setSearchFocus(false); playSfx('invClose'); return; }
    if (button !== 0) return;
    this.setSearchFocus(true);
    playSfx('select');
  }

  // Chamada antes dos atalhos do jogo (js/game.js): devolve true quando engole a tecla
  typeKey(e) {
    if (!this.searchFocus) return false;
    if (!this.open || !this.craftOpen) { this.setSearchFocus(false); return false; }
    if (e.code === 'Escape' || e.code === 'Enter' || e.code === 'NumpadEnter') { this.setSearchFocus(false); playSfx('invClose'); return true; }
    if (e.code === 'Backspace') { this.setSearch(e.ctrlKey ? '' : this.search.slice(0, -1)); return true; }
    if (e.key && [...e.key].length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (this.search.length < 22) this.setSearch(this.search + e.key);
      return true;
    }
    return false; // F3, setas, F2 do admin... continuam valendo
  }

  bookMaxScroll() { return Math.max(0, this.bookList().length - CRAFT.ROWS); }

  scrollBook(d) {
    this.bookScroll = clamp(this.bookScroll + d, 0, this.bookMaxScroll());
  }

  // Tamanho da interface: automático pela tela, ou o que estiver escolhido nas opções
  // (sempre limitado ao que cabe, para as janelas não vazarem em telas pequenas)
  scale() {
    const c = this.renderer.canvas;
    const fits = Math.max(1, Math.floor(Math.min(c.width / (UI.W + 24), c.height / (UI.H + 24))));
    const auto = clamp(Math.floor(Math.min(c.width / 250, c.height / 200)), 1, 3);
    const opt = typeof GAME_OPTIONS !== 'undefined' ? GAME_OPTIONS.uiScale : 'auto';
    return opt && opt !== 'auto' ? clamp(+opt, 1, Math.min(4, fits)) : auto;
  }

  toUnits(mx, my) {
    const s = this.scale();
    return { u: (mx - UI.ORIGIN) / s, v: (my - UI.ORIGIN) / s };
  }

  // Área ocupada na tela (px) pelas janelas abertas
  screenBounds() {
    const s = this.scale();
    let x1 = UI.ORIGIN + UI.W * s, y1 = UI.ORIGIN + (this.open ? UI.H : UI.HOTBAR_H + 14) * s;
    if (this.open && (this.craftOpen || this.container)) {
      const p = this.sidePanel();
      x1 = Math.max(x1, p.ox + p.w * p.s);
      y1 = Math.max(y1, p.oy + p.h * p.s);
    }
    return [UI.ORIGIN, UI.ORIGIN, x1 - UI.ORIGIN, y1 - UI.ORIGIN];
  }

  slotRect(i) {
    const c = i % INV_COLS, r = Math.floor(i / INV_COLS);
    const x = UI.PAD + c * (UI.SLOT + UI.GAP);
    if (!this.open) return [x, 6, UI.SLOT, UI.SLOT];
    const y = r === 0 ? UI.GRID_Y : UI.MAIN_Y + (r - 1) * (UI.SLOT + UI.GAP);
    return [x, y, UI.SLOT, UI.SLOT];
  }

  hitTest(mx, my) {
    const eq=this.equipmentPanel(),ex=(mx-eq.x)/eq.s,ey=(my-eq.y)/eq.s;
    if(this.open && inRect(ex,ey,[0,0,eq.w,eq.h])) {
      if(inRect(ex,ey,this.armorRect))return {type:'armor'};
      if(inRect(ex,ey,this.hatRect))return {type:'hat'};
      if(inRect(ex,ey,this.bootsRect))return {type:'boots'};
      for(let i=0;i<ACCESSORY_SLOTS;i++)if(inRect(ex,ey,this.accessoryRects[i]))return {type:'accessory',index:i};
      return {type:'panel'};
    }
    if(!this.open) {
      const {u,v}=this.toUnits(mx,my),states=this.cooldownIndicators();
      for(let i=0;i<states.length;i++) {
        const [x,y,w,h]=this.cooldownIndicatorRect(i);
        if(inRect(u,v,[x,y,w,h+12]))return {type:'cooldownStatus',state:states[i]};
      }
    }
    if (this.bookBtnVisible() && inRect(mx, my, this.bookBtnRect())) return { type: 'bookBtn' };
    if (this.bookBtnVisible() && inRect(mx, my, this.journalBtnRect())) return { type: 'journalBtn' };
    if (this.bookBtnVisible() && inRect(mx, my, this.bestiaryBtnRect())) return { type: 'bestiaryBtn' };
    if (this.bookBtnVisible() && inRect(mx, my, this.guideBtnRect())) return { type: 'guideBtn' };

    // Janela lateral: tem transformação própria (px de tela -> unidades da janela)
    if (this.open && (this.container || this.craftOpen)) {
      const { u, v, p } = this.toPanel(mx, my);
      if (u >= 0 && v >= 0 && u < p.w && v < p.h) {
        if (this.container) {
          if (inRect(u, v, this.chestCloseRect)) return { type: 'chestClose' };
          if (inRect(u, v, this.chestTakeRect)) return { type: 'chestTake' };
          if (inRect(u, v, this.chestStoreRect)) return { type: 'chestStore' };
          if (inRect(u, v, this.chestSortRect)) return { type: 'chestSort' };
          if (this.container.equip && inRect(u, v, this.equipSlotRect)) return { type: 'equipSlot' };
          for (let i = 0; i < this.container.slots.length; i++) if (inRect(u, v, this.chestSlotRect(i))) return { type: 'chestSlot', i };
          return { type: 'panel' };
        }
        if (inRect(u, v, this.craftCloseRect)) return { type: 'craftClose' };
        if (inRect(u, v, this.benchClearRect)) return { type: 'benchClear' };
        if (inRect(u, v, this.filterRect)) return { type: 'filter' };
        if (inRect(u, v, this.searchRect)) return { type: 'search' };
        if (inRect(u, v, this.onlyCraftableRect)) return { type: 'onlyCraftable' };
        if (inRect(u, v, this.scrollUpRect)) return { type: 'scrollUp' };
        if (inRect(u, v, this.scrollDownRect)) return { type: 'scrollDown' };
        if (this.benchResults().length > CRAFT.MAKE_COLS) {
          if (inRect(u, v, this.makePrevRect)) return { type: 'makePrev' };
          if (inRect(u, v, this.makeNextRect)) return { type: 'makeNext' };
        }
        for (let i = 0; i < BENCH_SLOTS; i++) if (inRect(u, v, this.benchSlotRect(i))) return { type: 'benchSlot', i };
        for (let i = 0; i < CRAFT.MAKE_COLS; i++) if (inRect(u, v, this.makeSlotRect(i))) return { type: 'benchResult', i };
        for (let i = 0; i < CRAFT.ROWS; i++) {
          if (!inRect(u, v, this.listRowRect(i))) continue;
          const r = this.bookList()[this.bookScroll + i];
          if (r) return { type: 'bookRow', i, recipe: r };
        }
        return { type: 'panel' };
      }
    }

    const { u, v } = this.toUnits(mx, my);
    const count = this.open ? this.inv.slots.length : HOTBAR_SIZE;
    const height = this.open ? UI.H : UI.HOTBAR_H;
    if (u < 0 || v < 0 || u >= UI.W || v >= height) return null;
    if (this.open) {
      if (inRect(u, v, this.closeRect)) return { type: 'close' };
      if (inRect(u, v, this.sortRect)) return { type: 'sort' };
      if (inRect(u, v, this.craftBtnRect)) return { type: 'craftBtn' };
      if (inRect(u, v, this.salvageRect)) return { type: 'salvage' };

      if (inRect(u, v, this.trashRect)) return { type: 'trash' };
    }
    for (let i = 0; i < count; i++) if (inRect(u, v, this.slotRect(i))) return { type: 'slot', i };
    return { type: 'panel' };
  }

  // O mundo não deve reagir ao mouse quando ele está sobre a UI ou segurando um item
  capturesMouse(mx, my) {
    return this.held !== null || this.hitTest(mx, my) !== null;
  }

  toggle() {
    if (this.open) this.close();
    else this.open = true;
  }

  close() {
    this.closeCraft();
    this.closeContainer();
    if (this.held) {
      const left = this.inv.add(this.held.item, this.held.count);
      if (left > 0) {
        this.held.count = left;
        toast('Libere espaço ou coloque o item na lixeira antes de fechar.');
        return;
      }
      this.held = null;
    }
    this.open = false;
  }

  // Esc fecha primeiro a janela lateral (bancada ou baú) e só depois o inventário
  closeSide() {
    if (this.container) { this.closeContainer(); return true; }
    if (this.craftOpen) { this.closeCraft(); return true; }
    return false;
  }

  toggleCraft() {
    if (this.craftOpen) this.closeCraft();
    else {
      this.closeContainer();
      this.craftOpen = true;
    }
  }

  // Fechar a janela devolve os ingredientes da bancada para o inventário
  closeCraft() {
    this.emptyBench();
    this.station = null;
    this.setSearchFocus(false);
    this.craftOpen = false;
  }

  // O livro (botão embaixo do minimapa ou tecla C) abre o inventário já na criação
  toggleBook() {
    if (this.open && this.craftOpen) { this.close(); return; }
    this.closeContainer();
    this.open = true;
    this.craftOpen = true;
    playSfx('invOpen');
  }

  emptyBench() {
    this.makePage = 0;
    for (let i = 0; i < this.bench.length; i++) this.returnToInventory(this.bench, i);
    for (let i = 0; i < this.bench.length; i++) {
      if (!this.bench[i]) continue;
      dropFromPlayer(this.game, this.bench[i].item, this.bench[i].count);
      this.bench[i] = null;
    }
  }

  // ---------- Criação ----------
  // Clique num resultado: monta uma vez (Shift: quantas vezes der).
  craftFromBench(i, all) {
    const r = this.benchResult(i);
    if (!r) return;
    if (this.station && !stationReachable(this.game, this.station)) { this.closeCraft(); return; }
    if (CRAFT_STATIONS[r.station]?.heat) { startStationHeat(this, r, all); return; }
    let resta = all ? craftTimes(this.bench, r) : 1;
    let feitos = 0;
    let resultItem=r.result.item;
    while (resta > 0) {
      resultItem=craftResultItem(r);
      if(!this.inv.canAdd(resultItem,r.result.count))break;
      takeIngredients(this.bench, r, 1);
      this.inv.add(resultItem, r.result.count);
      feitos++; resta--;
    }
    if (!feitos) { toast('Inventário cheio!'); return; }
    playSfx('craft');
    toast(`+${feitos * r.result.count} ${r.result.variants?.length?'Agulhão da Alma Teimosa (aparência sorteada)':ITEM_DEFS[resultItem].name}`);
  }

  // Clique numa receita do livro: os ingredientes saem do inventário e vão para a bancada
  sendToBench(recipe) {
    if (!recipe) return;
    if (!stationRecipeAllowed(recipe, this.station?.kind)) { toast(`${recipe.name}: use ${recipeStationName(recipe)} no mundo (botão direito).`); return; }
    if (this.station && !stationReachable(this.game, this.station)) { this.closeCraft(); return; }
    this.emptyBench();
    const falta = recipe.items.filter((n) => this.inv.count(n.item) < n.count);
    if (falta.length) {
      toast('Falta ' + falta.map((n) => `${n.count - this.inv.count(n.item)}× ${ITEM_DEFS[n.item].name}`).join(' e '));
      playSfx('invClose');
      return;
    }
    recipe.items.forEach((n, i) => {
      this.inv.removeItem(n.item, n.count);
      this.bench[i] = { item: n.item, count: n.count };
    });
    playSfx('select');
    toast(`${recipe.name}: pronto na bancada, clique no resultado.`);
  }

  // Caixinha do filtro: o item não é gasto, só serve de exemplo para a busca
  filterClick(button) {
    if (button === 2 || !this.held) {
      if (!this.filter) { toast('Segure um item e clique aqui para ver o que dá para fazer com ele.'); return; }
      this.filter = null;
      this.bookScroll = 0;
      playSfx('invClose');
      return;
    }
    this.filter = this.held.item;
    this.bookScroll = 0;
    playSfx('select');
    toast(`Livro: receitas com ${ITEM_DEFS[this.filter].name}`);
  }

  onMouseDown(button, mx, my, shift, mods = {}) {
    const hit = this.hitTest(mx, my);
    if (hit?.type !== 'search') this.setSearchFocus(false); // clicou em outro lugar: larga a busca
    if (!hit) {
      // Clicou fora da janela segurando um item: ele cai no chão
      if (this.held && this.open) { dropFromPlayer(this.game, this.held.item, this.held.count); this.held = null; return true; }
      return this.held !== null;
    }

    if (hit.type === 'bookBtn') {
      if (button === 0) this.toggleBook();
      return true;
    }
    if (hit.type === 'journalBtn') {
      if (button === 0) NpcServices.open(this.game);
      return true;
    }
    if (hit.type === 'bestiaryBtn') {
      if (button === 0) Bestiary.open(this.game); // js/bestiary.js
      return true;
    }
    if(hit.type==='guideBtn'){if(button===0)ItemGuide.open(this.game);return true;}

    if (!this.open) {
      if (hit.type === 'slot' && button === 0) this.game.selected = hit.i;
      return true;
    }

    // Clique duplo num espaço com item na mão: recolhe todas as pilhas iguais
    if (button === 0 && !shift && !mods.ctrl && !mods.alt && (hit.type === 'slot' || hit.type === 'chestSlot')) {
      const now = performance.now();
      const same = this.lastClick && this.lastClick.key === hit.type + hit.i && now - this.lastClick.t < 350;
      this.lastClick = { key: hit.type + hit.i, t: now };
      if (same && this.held) { this.collectAll(); playSfx('pickup'); return true; }
    } else this.lastClick = null;

    switch (hit.type) {
      case 'close': if (button === 0) this.close(); break;
      case 'sort': if (button === 0) this.inv.sortRange(HOTBAR_SIZE, this.inv.slots.length); break;
      case 'trash':
        if (button === 0) {
          if (this.held) { this.trash = this.held; this.held = null; }
          else { this.held = this.trash; this.trash = null; }
        }
        break;
      case 'craftBtn': if (button === 0) this.toggleCraft(); break;
      case 'salvage': if (button === 0) this.salvageHeld(shift); break;
      case 'craftClose': if (button === 0) this.closeCraft(); break;
      case 'benchClear': if (button === 0) { this.emptyBench(); playSfx('invClose'); } break;
      case 'benchResult': if (button === 0) this.craftFromBench(hit.i, shift); break;
      case 'makePrev': if (button === 0) this.turnMakePage(-1); break;
      case 'makeNext': if (button === 0) this.turnMakePage(1); break;
      case 'filter': this.filterClick(button); break;
      case 'search': this.searchClick(button); break;
      case 'onlyCraftable':
        if (button === 0) {
          this.onlyCraftable = !this.onlyCraftable;
          this.bookScroll = 0;
          playSfx('select');
          toast(this.onlyCraftable ? 'Livro: só o que dá para fazer agora' : 'Livro: todas as receitas');
        }
        break;
      case 'scrollUp': if (button === 0) this.scrollBook(-1); break;
      case 'scrollDown': if (button === 0) this.scrollBook(1); break;
      case 'bookRow': if (button === 0) this.sendToBench(hit.recipe); break;
      case 'benchSlot':
        if (button === 0 && shift) this.returnToInventory(this.bench, hit.i);
        else if (button === 0) this.leftClickSlot(this.bench, hit.i);
        else if (button === 2) this.rightClickSlot(this.bench, hit.i);
        break;
      case 'armor': this.armorClick(button); break;
      case 'accessory': this.accessoryClick(button, hit.index); break;
      case 'hat': this.gearClick(button, 'hat', 'chapeu', 'um chapéu'); break;
      case 'boots': this.gearClick(button, 'boots', 'bota', 'botas'); break;
      case 'equipSlot': this.equipClick(button); break;
      case 'chestClose': if (button === 0) this.closeContainer(); break;
      case 'chestTake': if (button === 0) this.takeAll(); break;
      case 'chestStore': if (button === 0) this.storeAll(); break;
      case 'chestSort':
        if (button === 0) {
          Inventory.prototype.sortRange.call({ slots: this.container.slots }, 0, this.container.slots.length);
          playSfx('select');
        }
        break;
      case 'chestSlot':
        if (button === 0 && mods.ctrl) this.quickDelete(this.container.slots, hit.i);
        else if (button === 0 && mods.alt) toast('Favoritos ficam só na mochila.');
        else if (button === 0 && shift) this.returnToInventory(this.container.slots, hit.i);
        else if (button === 0) this.leftClickSlot(this.container.slots, hit.i);
        else if (button === 2) this.rightClickSlot(this.container.slots, hit.i);
        break;
      case 'slot':
        if (button === 0 && mods.ctrl) this.quickDelete(this.inv.slots, hit.i);
        else if (button === 0 && mods.alt) this.toggleFavorite(hit.i);
        else if (button === 0 && shift) this.quickMove(hit.i);
        else if (button === 0) this.leftClickSlot(this.inv.slots, hit.i);
        else if (button === 2) this.rightClickSlot(this.inv.slots, hit.i);
        break;
    }
    return true;
  }

  // ---------- Espaço de roupa (armadura vestida) ----------
  // Clique com uma roupa na mão veste; clique com a mão vazia tira a peça.
  armorClick(button) {
    const g = this.game;
    const worn = g.outfit ? { item: g.outfit, count: 1 } : null;
    if (button === 2) { // botão direito: só tira
      if (!worn || this.held) return;
      this.held = worn; setOutfitItem(g, null); playSfx('invClose');
      return;
    }
    if (button !== 0) return;
    const held = this.held;
    if (held && !ITEM_DEFS[held.item].roupa) { toast(`${ITEM_DEFS[held.item].name} não é uma roupa.`); return; }
    if (held && held.count > 1) { toast('Vista uma peça de cada vez.'); return; }
    if (!held && !worn) { toast('Coloque aqui uma pelagem ou um peitoral.'); return; }
    setOutfitItem(g, held ? held.item : null);
    this.held = worn;
    playSfx(held ? 'invOpen' : 'invClose');
    if (held) toast(`Vestiu: ${ITEM_DEFS[held.item].name} (−${outfitDefense(held.item)}% de dano)`);
  }

  // ---------- Chapéu e botas ----------
  gearClick(button, key, prop, noun) {
    const g = this.game, worn = g[key] ? { item: g[key], count: 1 } : null;
    if (button === 2) { if (!worn || this.held) return; this.held = worn; setGearItem(g, key, null); playSfx('invClose'); return; }
    if (button !== 0) return;
    const held = this.held;
    if (held && !ITEM_DEFS[held.item]?.[prop]) { toast(ITEM_DEFS[held.item].name + ' não é ' + noun + '.'); return; }
    if (held && held.count > 1) { toast('Uma peça de cada vez.'); return; }
    if (!held && !worn) { toast('Coloque aqui ' + noun + '.'); return; }
    setGearItem(g, key, held ? held.item : null);
    this.held = worn;
    playSfx(held ? 'invOpen' : 'invClose');
    if (held) toast('Equipou: ' + ITEM_DEFS[held.item].name);
  }

  // ---------- Casas de acessório ----------
  // Cinco espaços que só aceitam item com `acessorio` (js/bear-loot.js)
  accessoryClick(button, index) {
    const g = this.game, list = playerAccessories(g), worn = list[index];
    if (button === 2) { // botão direito: só tira
      if (!worn || this.held) return;
      this.held = worn; list[index] = null; playSfx('invClose');
      return;
    }
    if (button !== 0) return;
    const held = this.held;
    if (held && !ITEM_DEFS[held.item]?.acessorio) { toast(`${ITEM_DEFS[held.item].name} não é um acessório.`); return; }
    if (held && held.count > 1) { toast('Um acessório de cada vez.'); return; }
    if (!held && !worn) { toast('Aqui entra acessório: presa, espírito...'); return; }
    if (held && list.some((s, i) => i !== index && s && s.item === held.item)) { toast('Esse acessório já está no cinto.'); return; }
    list[index] = held;
    this.held = worn;
    playSfx(held ? 'invOpen' : 'invClose');
    if (held) toast(`Equipou: ${ITEM_DEFS[held.item].name}`);
  }

  // ---------- Espaço de equipamento de um contêiner (a sela do elefante) ----------
  equipClick(button) {
    const eq = this.container.equip, cur = eq.slots[0];
    if (button === 2) { // botão direito: tira a peça para a mão
      if (!cur || this.held) return;
      eq.slots[0] = null; this.held = cur; eq.onChange?.();
      return;
    }
    if (button !== 0) return;
    const held = this.held;
    if (held && !eq.accept(held.item)) { toast(`Aqui só entra: ${eq.label.toLowerCase()}.`); return; }
    if (held && held.count > 1) { toast('Uma peça de cada vez.'); return; }
    if (!held && !cur) { toast(`Coloque aqui a ${eq.label.toLowerCase()}.`); return; }
    eq.slots[0] = held;
    this.held = cur;
    eq.onChange?.();
  }

  // Desmonta o item que está no cursor (Shift: a pilha inteira). O que não couber cai no chão.
  salvageHeld(all) {
    const h = this.held;
    if (!h) { toast('Pegue um item e clique no martelo para desmontar.'); return; }
    const out = SALVAGE[h.item];
    if (!out) { toast(`${ITEM_DEFS[h.item].name}: não dá para desmontar.`); return; }
    const times = all ? h.count : 1;
    for (const [item, n] of out) {
      const left = this.inv.add(item, n * times);
      if (left) dropFromPlayer(this.game, item, left);
    }
    h.count -= times;
    if (h.count <= 0) this.held = null;
    toast('Desmontado: ' + out.map(([i, n]) => `${n * times}× ${ITEM_DEFS[i].name}`).join(', '));
    playSfx('break', undefined, undefined, { tile: TILE.PLANKS });
  }

  leftClickSlot(slots, i) {
    const s = slots[i];
    const held = this.held;
    if (held && slots !== this.inv.slots) delete held.fav; // favorito só vale dentro da mochila
    if (!held) {
      this.held = s;
      slots[i] = null;
    } else if (!s) {
      slots[i] = held;
      this.held = null;
    } else if (s.item === held.item && s.count < maxStackOf(s.item)) {
      const n = Math.min(maxStackOf(s.item) - s.count, held.count);
      s.count += n;
      held.count -= n;
      if (held.count === 0) this.held = null;
    } else {
      slots[i] = held;
      this.held = s;
    }
  }

  // Ctrl+clique: manda a pilha direto para a lixeira (dá para recuperar até o próximo descarte)
  quickDelete(slots, i) {
    const s = slots[i];
    if (!s || this.held) return;
    if (s.fav) { toast('Item favorito: Alt+clique para desfavoritar antes de excluir.'); return; }
    this.trash = s;
    slots[i] = null;
    playSfx('invClose');
    toast(`Excluído: ${ITEM_DEFS[s.item].name}${s.count > 1 ? ' ×' + s.count : ''} (recupere na lixeira)`);
  }

  // Alt+clique: favorita/desfavorita. Favorito não vai para o baú no "Guardar mochila",
  // não se mexe ao organizar e não é excluído no Ctrl+clique.
  toggleFavorite(i) {
    const s = this.inv.slots[i];
    if (!s) return;
    s.fav = !s.fav;
    if (!s.fav) delete s.fav;
    playSfx('select');
    toast(s.fav ? `${ITEM_DEFS[s.item].name}: favorito` : `${ITEM_DEFS[s.item].name}: não é mais favorito`);
  }

  // Sem item na mão: pega metade. Com item na mão: coloca 1.
  rightClickSlot(slots, i) {
    const s = slots[i];
    if (!this.held) {
      if (!s) return;
      const n = Math.ceil(s.count / 2);
      this.held = { item: s.item, count: n };
      s.count -= n;
      if (s.count === 0) slots[i] = null;
    } else if (!s || (s.item === this.held.item && s.count < maxStackOf(s.item))) {
      if (!s) slots[i] = { item: this.held.item, count: 1 };
      else s.count++;
      if (--this.held.count === 0) this.held = null;
    }
  }

  // Shift+clique: move entre a barra rápida e o resto do inventário
  quickMove(i) {
    const s = this.inv.slots[i];
    if (!s || this.held) return;
    if (!this.container && this.quickEquip(i)) return;
    // Com a maleta aberta, Shift+clique guarda o item nela
    if (this.container) {
      const slots = this.container.slots;
      this.inv.slots[i] = null;
      const left = Inventory.prototype.addRange.call({ slots }, s.item, s.count, 0, slots.length);
      if (left > 0) this.inv.slots[i] = { item: s.item, count: left };
      return;
    }
    const len = this.inv.slots.length;
    const [start, end] = i < HOTBAR_SIZE ? [HOTBAR_SIZE, len] : [0, HOTBAR_SIZE];
    this.inv.slots[i] = null;
    const left = this.inv.addRange(s.item, s.count, start, end);
    if (left > 0) this.inv.slots[i] = { item: s.item, count: left };
  }

  // Shift+clique num equipamento: veste/equipa direto (roupa troca a atual; acessório e pet vão para o primeiro espaço livre)
  quickEquip(i) {
    const g = this.game, s = this.inv.slots[i], def = ITEM_DEFS[s.item];
    const take = (rest) => { this.inv.slots[i] = rest; };
    const rest = s.count > 1 ? { item: s.item, count: s.count - 1 } : null;
    if (def?.roupa) {
      const worn = g.outfit ? { item: g.outfit, count: 1 } : null;
      setOutfitItem(g, s.item); take(rest);
      if (worn) { const left = this.inv.add(worn.item, 1); if (left > 0) dropFromPlayer(g, worn.item, left); }
      playSfx('invOpen'); toast(`Vestiu: `+def.name+` (−`+outfitDefense(s.item)+`% de dano)`);
      return true;
    }
    for (const [key, prop] of [['hat', 'chapeu'], ['boots', 'bota']]) if (def?.[prop]) {
      const old = g[key]; setGearItem(g, key, s.item); take(rest);
      if (old) { const left = this.inv.add(old, 1); if (left > 0) dropFromPlayer(g, old, 1); }
      playSfx('invOpen'); toast('Equipou: ' + def.name);
      return true;
    }
    if (def?.acessorio) {
      const list = playerAccessories(g);
      if (list.some((a) => a && a.item === s.item)) { toast('Esse acessório já está no cinto.'); return true; }
      const free = list.findIndex((a) => !a);
      if (free < 0) { toast('Os cinco espaços de acessório estão cheios.'); return true; }
      list[free] = { item: s.item, count: 1 }; take(rest);
      playSfx('invOpen'); toast(`Equipou: `+def.name);
      return true;
    }
    return false;
  }

  returnToInventory(slots, i) {
    const s = slots[i];
    if (!s) return;
    const left = this.inv.add(s.item, s.count);
    slots[i] = left > 0 ? { item: s.item, count: left } : null;
  }


  // ---------- Desenho ----------
  draw(ctx) {
    const s = this.scale();
    ctx.setTransform(s, 0, 0, s, UI.ORIGIN, UI.ORIGIN);
    ctx.imageSmoothingEnabled = false;
    ctx.font = UI_FONT;
    ctx.textBaseline = 'alphabetic';

    const { x: mx, y: my } = this.input.mouse;
    const hover = this.hitTest(mx, my);

    if (this.open) this.drawPanel(ctx, hover);
    else this.drawHotbar(ctx, hover);

    // Janela lateral: escala e posição próprias
    if (this.open && (this.craftOpen || this.container)) {
      const p = this.sidePanel();
      ctx.setTransform(p.s, 0, 0, p.s, p.ox, p.oy);
      if (this.container) this.drawChestPanel(ctx, hover);
      else this.drawCraftPanel(ctx, hover);
      ctx.setTransform(s, 0, 0, s, UI.ORIGIN, UI.ORIGIN);
    }

    if (this.open) this.drawEquipmentPanel(ctx,hover);
    ctx.setTransform(s,0,0,s,UI.ORIGIN,UI.ORIGIN);
    const { u, v } = this.toUnits(mx, my);
    const tu = Math.round(u), tv = Math.round(v);
    if (this.held) {
      this.drawItem(ctx, this.held, tu - 6, tv - 6);
      if (hover?.type === 'salvage') this.drawTooltipBox(ctx, 'Desmontar', salvageText(this.held.item), tu, tv, s);
      else if (hover?.type === 'filter') this.drawTooltipBox(ctx, 'Filtro do livro', `Ver receitas com ${ITEM_DEFS[this.held.item].name}`, tu, tv, s);
    } else if (hover) {
      let stack = null;
      if (hover.type === 'cooldownStatus') {
        const state=hover.state,def=ITEM_DEFS[state.item];
        this.drawTooltipBox(ctx,def.name,[state.left>0?'Recarga: '+this.cooldownText(state):'Pronto para usar',...wrapTooltipText(ctx,def.descricao||'',TOOLTIP_TEXT_W)],tu,tv,s);
      }
      if (hover.type === 'slot') stack = this.inv.slots[hover.i];
      else if (hover.type === 'trash') stack = this.trash;
      else if (hover.type === 'benchSlot') stack = this.bench[hover.i];
      else if (hover.type === 'chestSlot') stack = this.container.slots[hover.i];
      else if (hover.type === 'equipSlot') stack = this.container.equip.slots[0];
      else if (hover.type === 'armor') stack = this.game.outfit ? { item: this.game.outfit, count: 1 } : null;
      else if (hover.type === 'hat' || hover.type === 'boots') stack = this.game[hover.type] ? { item: this.game[hover.type], count: 1 } : null;
      else if (hover.type === 'accessory') stack = playerAccessories(this.game)[hover.index];
      else if (hover.type === 'filter') stack = this.filter ? { item: this.filter, count: 1 } : null;
      else if (hover.type === 'benchResult') {
        const r = this.benchResult(hover.i);
        if (r) { this.drawTooltipBox(ctx, r.name, `${recipeStationName(r)} · ${recipeCostText(r)}`, tu, tv, s); stack = null; hover = { type: 'feito' }; }
      }
      if (hover.type === 'trash') this.drawTooltipBox(ctx, stack ? ITEM_DEFS[stack.item].name+' ×'+stack.count : 'Lixeira', stack ? 'Clique para recuperar. Novo descarte apaga este.' : 'Guarda o último item descartado.', tu, tv, s);
      else if (hover.type === 'armor' && !stack) this.drawTooltipBox(ctx, 'Roupa', 'Pelagem ou peitoral: segura parte do dano', tu, tv, s);
      else if (hover.type === 'hat' && !stack) this.drawTooltipBox(ctx, 'Chapéu', 'Coloque aqui um chapéu', tu, tv, s);
      else if (hover.type === 'boots' && !stack) this.drawTooltipBox(ctx, 'Botas', 'Coloque aqui um par de botas', tu, tv, s);
      else if (hover.type === 'equipSlot' && !stack) this.drawTooltipBox(ctx, this.container.equip.label, 'Sem ela o elefante não anda', tu, tv, s);
      else if (hover.type === 'filter' && !stack) this.drawTooltipBox(ctx, 'Filtro do livro', 'Segure um item e clique aqui', tu, tv, s);
      else if (hover.type === 'bookRow') this.drawTooltipBox(ctx, hover.recipe.name, `${recipeStationName(hover.recipe)} · ${recipeCostText(hover.recipe)}`, tu, tv, s);
      else if (stack) this.drawTooltip(ctx, stack, tu, tv, s, hover.type === 'slot' || hover.type === 'chestSlot');
      else if (hover.type === 'craftBtn') this.drawTooltipBox(ctx, 'Criação', this.craftOpen ? 'Fechar a bancada' : 'Bancada e livro de receitas', tu, tv, s);
      else if (hover.type === 'makePrev' || hover.type === 'makeNext') {
        const pages = Math.ceil(this.benchResults().length / CRAFT.MAKE_COLS);
        this.drawTooltipBox(ctx, hover.type === 'makePrev' ? 'Crafts anteriores' : 'Mais crafts', `Página ${this.makePage + 1} de ${pages}`, tu, tv, s);
      }
      else if (hover.type === 'bookBtn') this.drawTooltipBox(ctx, 'Livro de receitas', 'Tudo que dá para fazer  [C]', tu, tv, s);
      else if (hover.type === 'guideBtn') this.drawTooltipBox(ctx, 'Guia de itens', 'Onde encontrar, drops e receitas  [G]', tu, tv, s);
      else if (hover.type === 'journalBtn') {
        const { active, ready } = npcQuestSummary(this.game);
        this.drawTooltipBox(ctx, 'Diário de missões', [
          active ? `${active} em andamento · ${ready} pronta(s)` : 'Nenhuma missão aceita ainda',
          ['Pedidos e moradores conhecidos  [J]', UIC.textDim],
        ], tu, tv, s);
      }
      else if (hover.type === 'bestiaryBtn') {
        const [have, total] = Bestiary.progress();
        this.drawTooltipBox(ctx, 'Bestiário', [`${have} de ${total} criaturas registradas`, ['Tudo o que você já derrotou  [B]', UIC.textDim]], tu, tv, s);
      }
      else if (hover.type === 'benchClear') this.drawTooltipBox(ctx, 'Limpar bancada', 'Devolve os ingredientes', tu, tv, s);
      else if (hover.type === 'sort') this.drawTooltipBox(ctx, 'Organizar', 'Junta e ordena a mochila', tu, tv, s);
      else if (hover.type === 'chestSort') this.drawTooltipBox(ctx, 'Organizar', 'Junta e ordena este contêiner', tu, tv, s);
      else if (hover.type === 'chestTake') this.drawTooltipBox(ctx, 'Pegar tudo', 'Traz o que couber para a mochila', tu, tv, s);
      else if (hover.type === 'chestStore') this.drawTooltipBox(ctx, 'Guardar mochila', ['Manda para cá tudo fora da barra rápida', ['A barra de ferramentas fica intacta', UIC.textDim]], tu, tv, s);
      else if (hover.type === 'onlyCraftable') this.drawTooltipBox(ctx, this.onlyCraftable ? 'Mostrando só o possível' : 'Só o que dá para fazer', 'Esconde as receitas sem material', tu, tv, s);
      else if (hover.type === 'search') this.drawTooltipBox(ctx, 'Buscar receita', ['Clique e digite o nome ou o ingrediente', ['Esc sai da busca · botão direito limpa', UIC.textDim]], tu, tv, s);
      else if (hover.type === 'salvage') this.drawTooltipBox(ctx, 'Desmontar', 'Pegue um item e clique aqui (Shift: pilha toda)', tu, tv, s);
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (this.bookBtnVisible()) {
      this.drawBookButton(ctx, hover?.type === 'bookBtn');
      this.drawJournalButton(ctx, hover?.type === 'journalBtn');
      this.drawBestiaryButton(ctx, hover?.type === 'bestiaryBtn');
      this.drawHudButton(ctx,this.guideBtnRect(),hover?.type==='guideBtn','G',c=>{
        this.drawBookIcon(c,3,4,hover?.type==='guideBtn');
        c.strokeStyle='#91dae0';c.lineWidth=2;c.beginPath();c.arc(14,10,4,0,Math.PI*2);c.stroke();c.fillStyle='#91dae0';c.fillRect(17,13,2,5);
      });
    }
  }

  // Barra de vida logo abaixo da barra rápida
  drawVitals(ctx, player) {
    const s = this.scale(), maxHp = player.maxHp || 100;
    const hp = clamp(Math.round(player.hp ?? maxHp), 0, maxHp), now = performance.now();
    ctx.setTransform(s, 0, 0, s, UI.ORIGIN, UI.ORIGIN + (UI.HOTBAR_H + 16) * s);
    ctx.imageSmoothingEnabled = false;
    ctx.font = UI_FONT;
    ctx.textBaseline = 'alphabetic';
    const w = 112;
    uiFrame(ctx, 0, 0, w, 16);

    // Coração (pulsa com pouca vida)
    const heart = ['.XX.XX.', 'XRrXrrX', 'XrRrrrX', 'XrrrrrX', '.XrrrX.', '..XrX..', '...X...'];
    const beat = hp < 30 && Math.floor(now / 260) % 2 ? 1 : 0;
    heart.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        if (row[i] === '.') continue;
        ctx.fillStyle = row[i] === 'X' ? UIC.outline : row[i] === 'R' ? '#ffb3a8' : '#d9473f';
        ctx.fillRect(6 + i, 4 + j + beat, 1, 1);
      }
    });

    const bx = 16, bw = 66, by = 6;
    ctx.fillStyle = UIC.outline; ctx.fillRect(bx - 1, by - 1, bw + 2, 6);
    ctx.fillStyle = '#3a1618'; ctx.fillRect(bx, by, bw, 4);
    const fill = Math.round((bw * hp) / maxHp);
    ctx.fillStyle = player.invulnerable > 0 && Math.floor(now / 120) % 2 ? '#f3c089' : '#d2463f';
    ctx.fillRect(bx, by, fill, 4);
    ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(bx, by, fill, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    for (let k = 1; k < 4; k++) ctx.fillRect(bx + Math.round((bw * k) / 4), by, 1, 4);
    ctx.textAlign = 'right';
    this.shadowText(ctx, maxHp > 100 ? `${hp}/${maxHp}` : String(hp), w - 6, 11, UIC.text);
    drawBreathBubbles(ctx, player); // fôlego embaixo d'água (js/water.js)
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  drawHeader(ctx, w, style = 'metal') {
    uiHeaderFill(ctx, 4, 4, w - 8, UI.HEADER_H - 4, style);
    ctx.fillStyle = UIC.outline;
    ctx.fillRect(4, UI.HEADER_H, w - 8, 1);
  }

  drawTitle(ctx, title, subtitle, key, x = 29) {
    ctx.textAlign = 'left';
    this.shadowText(ctx, title, x, 14, UIC.text);
    ctx.fillStyle = UIC.limeBright;
    ctx.fillText(subtitle, x, 23);
    if (key) {
      ctx.fillStyle = UIC.text;
      ctx.fillText(key, x + ctx.measureText(subtitle).width, 23);
    }
  }

  // Quadro do ícone no canto do cabeçalho; o desenho fica em (7, 6) com 17x17
  drawIconBox(ctx) {
    rrect(ctx, 5, 4, 21, 21, UIC.outline);
    rrect(ctx, 6, 5, 19, 19, '#4a5560');
    ctx.fillStyle = '#26303a';
    ctx.fillRect(7, 6, 17, 17);
  }

  drawCloseButton(ctx, x, y, hover) {
    rrect(ctx, x, y, 12, 12, UIC.outline);
    rrect(ctx, x + 1, y + 1, 10, 10, hover ? '#8a3a2c' : '#3a434c');
    ctx.fillStyle = hover ? '#ffe2c8' : UIC.textSoft;
    for (let k = 0; k < 6; k++) {
      ctx.fillRect(x + 3 + k, y + 3 + k, 1, 1);
      ctx.fillRect(x + 8 - k, y + 3 + k, 1, 1);
    }
  }

  drawSectionBar(ctx, w, label, y = UI.BAR_Y) {
    ctx.fillStyle = UIC.bar;
    ctx.fillRect(4, y, w - 8, 11);
    ctx.fillStyle = UIC.outline;
    ctx.fillRect(4, y - 1, w - 8, 1);
    ctx.fillStyle = '#2c333c';
    ctx.fillRect(4, y + 11, w - 8, 1);
    ctx.textAlign = 'center';
    ctx.fillStyle = UIC.textSoft;
    ctx.fillText(label, w / 2, y + 8);
    // Losangos âmbar e linhas finas até as bordas
    const half = Math.ceil(ctx.measureText(label).width / 2) + 5;
    ctx.fillStyle = UIC.lime;
    for (const sx of [Math.round(w / 2 - half - 3), Math.round(w / 2 + half)]) {
      ctx.fillRect(sx + 1, y + 3, 1, 5);
      ctx.fillRect(sx, y + 4, 3, 3);
    }
    const line = Math.round(w / 2 - half - 12);
    if (line > 2) {
      ctx.fillStyle = '#39414a';
      ctx.fillRect(8, y + 5, line, 1);
      ctx.fillRect(w - 8 - line, y + 5, line, 1);
    }
  }

  // Área rebaixada onde ficam os slots
  drawWell(ctx, x, y, w, h, color = UIC.well) {
    rrect(ctx, x, y, w, h, color);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(x + 1, y, w - 2, 1);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fillRect(x + 1, y + h - 1, w - 2, 1);
  }

  drawFooter(ctx, w, h, top) {
    ctx.fillStyle = UIC.header;
    ctx.fillRect(4, top, w - 8, h - top - 4);
    ctx.fillStyle = UIC.outline;
    ctx.fillRect(4, top - 1, w - 8, 1);
    ctx.fillStyle = UIC.headerLight;
    ctx.fillRect(4, top, w - 8, 1);
  }

  // Botão quadrado de metal; deixa fillStyle pronto para o ícone
  drawPlate(ctx, x, y, hover, active) {
    rrect(ctx, x, y, 18, 18, active ? UIC.lime : UIC.outline);
    rrect(ctx, x + 1, y + 1, 16, 16, hover ? '#4a5560' : active ? '#4a3a22' : '#343c45');
    ctx.fillStyle = 'rgba(255,255,255,0.13)';
    ctx.fillRect(x + 2, y + 1, 14, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.fillRect(x + 2, y + 16, 14, 1);
    ctx.fillStyle = hover || active ? UIC.limeBright : UIC.text;
  }

  drawWideButton(ctx, x, y, w, h, label, { hover = false, disabled = false } = {}) {
    rrect(ctx, x, y, w, h, UIC.outline);
    rrect(ctx, x + 1, y + 1, w - 2, h - 2, disabled ? '#262b31' : hover ? '#dc9540' : '#c07a2c');
    if (!disabled) {
      ctx.fillStyle = hover ? '#f5c06e' : '#e8a650';
      ctx.fillRect(x + 2, y + 1, w - 4, 1);
      ctx.fillStyle = '#8a5220';
      ctx.fillRect(x + 2, y + h - 2, w - 4, 1);
    }
    ctx.textAlign = 'center';
    ctx.fillStyle = disabled ? UIC.textDim : '#1a130b';
    ctx.fillText(label, x + w / 2, y + Math.round(h / 2) + 3);
  }

  drawEquipmentLabel(ctx, text, y, color) {
    ctx.save();
    ctx.textAlign='left';ctx.textBaseline='alphabetic';
    // Duas linhas completas nos espaços de equipamentos, sem recortar o nome.
    let lines;
    for(let size=8;size>=6;size--){
      ctx.font=size+'px Silkscreen, monospace';
      lines=wrapTooltipText(ctx,String(text).toUpperCase(),69);
      if(lines.length<=2)break;
    }
    if(lines.length>2)lines=[lines[0],this.fitText(ctx,lines.slice(1).join(' '),69)];
    lines.forEach((line,i)=>this.shadowText(ctx,line,34,y+(lines.length===1?12:8+i*9),color));
    ctx.restore();
  }

  drawEquipmentPanel(ctx,hover) {
    const p=this.equipmentPanel(),g=this.game;
    ctx.setTransform(p.s,0,0,p.s,p.x,p.y);ctx.font=UI_FONT;ctx.textAlign='left';
    uiFrame(ctx,0,0,p.w,p.h);this.shadowText(ctx,'EQUIPAMENTO',8,13,UIC.text);
    this.shadowText(ctx,'DEFESA '+Math.round(playerDefense(g)*100)+'%',8,25,UIC.limeBright);
    const worn=g.outfit?{item:g.outfit,count:1}:null;
    this.drawSlot(ctx,this.armorRect,worn,{hover:hover?.type==='armor',ready:!!worn});
    if(!worn)this.drawGearIcon(ctx,8,54,'armor');
    this.shadowText(ctx,'ARMADURA',34,65,UIC.textSoft);
    for(const [key,rect,label,tip] of [['hat',this.hatRect,'CHAPÉU','hat'],['boots',this.bootsRect,'BOTAS','boots']]){
      const it=g[key]?{item:g[key],count:1}:null;
      this.drawSlot(ctx,rect,it,{hover:hover?.type===key,ready:!!it,cooldown:true});
      if(!it)this.drawGearIcon(ctx,rect[0],rect[1],key);
      this.drawEquipmentLabel(ctx,it?ITEM_DEFS[it.item].name:label,rect[1],it?UIC.text:UIC.textSoft);
    }
    ctx.fillStyle=UIC.textDim;ctx.fillRect(8,101,96,1);
    playerAccessories(g).slice(0,5).forEach((slot,i)=>{
      const r=this.accessoryRects[i];this.drawSlot(ctx,r,slot,{hover:hover?.type==='accessory'&&hover.index===i,ready:!!slot,cooldown:true});
      if(!slot)this.drawAccessoryIcon(ctx,r[0],r[1]);
      const names={[ITEM.BOTTLED_ROAR]:'RUGIDO',[ITEM.CUB_SPIRIT]:'FILHOTE',[ITEM.BROKEN_FANG]:'PRESA'};
      this.drawEquipmentLabel(ctx,slot?(names[slot.item]||ITEM_DEFS[slot.item].name):'ACESSÓRIO '+(i+1),r[1],slot?UIC.text:UIC.textDim);
    });
    this.shadowText(ctx,'ARRASTE ITENS',8,233,UIC.textDim);
  }

  drawHotbar(ctx, hover) {
    const w = UI.W, h = UI.HOTBAR_H;
    uiFrame(ctx, 0, 0, w, h);
    this.drawWell(ctx, 5, 5, w - 10, 23, UIC.hotbarWell);
    const g = this.game, manual = g.smartPrev ?? g.selected;
    for (let i = 0; i < HOTBAR_SIZE; i++) {
      const isHover = hover && hover.type === 'slot' && hover.i === i;
      this.drawSlot(ctx, this.slotRect(i), this.inv.slots[i], { hover: isHover, selected: i === manual, number: (i + 1) % 10, cooldown:true });
    }
    if (g.smartCursor) this.drawSmartSlot(ctx, w + 3, h);
    this.cooldownIndicators().forEach((state,i)=>{
      const [x,y,rw,rh]=this.cooldownIndicatorRect(i),{item,left,total}=state;
      uiFrame(ctx,x,y,rw,rh);this.drawSlot(ctx,[x+5,y+6],{item,count:1},{ready:left===0,hover:hover?.type==='cooldownStatus'&&hover.state.item===item});
      if(left>0){ctx.fillStyle='rgba(10,15,23,.7)';ctx.fillRect(x+6,y+7,18,Math.ceil(18*clamp(left/total,0,1)));}
      ctx.textAlign='center';this.shadowText(ctx,this.cooldownText(state),x+15,y+rh+10,left>0?UIC.text:UIC.limeBright);
    });
    const sel = this.inv.slots[g.selected];
    ctx.textAlign = 'left';
    const label = sel ? ITEM_DEFS[sel.item].name + (sel.count > 1 ? ` ×${sel.count}` : '') : '';
    this.shadowText(ctx, label, 3, h + 11, g.smartSlot != null ? UIC.limeBright : UIC.text);
  }

  // 11º espaço do cursor inteligente (Ctrl): mostra a ferramenta escolhida sozinha para o alvo
  drawSmartSlot(ctx, x, h) {
    const g = this.game, active = g.smartSlot != null;
    uiFrame(ctx, x, 0, 30, h);
    this.drawWell(ctx, x + 5, 5, 20, 23, active ? '#3a2c16' : UIC.well);
    this.drawSlot(ctx, [x + 5, 6], active ? this.inv.slots[g.smartSlot] : null, { selected: active });
    if (!active) { // raiozinho de "automático"
      ctx.fillStyle = '#5a646e';
      for (const [px, py] of [[16, 9], [15, 10], [14, 11], [13, 12], [14, 12], [15, 12], [16, 12], [15, 13], [14, 14], [13, 15]]) ctx.fillRect(x + px, py + 1, 2, 1);
    }
    ctx.textAlign = 'center';
    this.shadowText(ctx, 'CTRL', x + 15, h + 11, active ? UIC.limeBright : UIC.textDim);
  }

  drawPanel(ctx, hover) {
    const w = UI.W, h = UI.H;
    uiFrame(ctx, 0, 0, w, h);
    this.drawHeader(ctx, w, 'metal');

    // Retrato: cabeça e ombros do quadro parado
    this.drawIconBox(ctx);
    ctx.drawImage(this.renderer.playerAtlas, 6, 5, 17, 17, 7, 6, 17, 17);
    this.drawTitle(ctx, typeof PLAYER_LOOK !== 'undefined' ? PLAYER_LOOK.name : 'Jogador', 'Seu inventário ', '[E]');
    this.drawCloseButton(ctx, this.closeRect[0], this.closeRect[1], hover && hover.type === 'close');
    this.drawSectionBar(ctx, w, 'INVENTÁRIO');

    // Barra rápida num fundo quente; o resto da mochila em cinza
    this.drawWell(ctx, 5, UI.GRID_Y - 2, w - 10, UI.SLOT + 4, UIC.hotbarWell);
    this.drawWell(ctx, 5, UI.MAIN_Y - 2, w - 10, (INV_ROWS - 1) * (UI.SLOT + UI.GAP) - UI.GAP + 4);

    for (let i = 0; i < this.inv.slots.length; i++) {
      const isHover = hover && hover.type === 'slot' && hover.i === i;
      this.drawSlot(ctx, this.slotRect(i), this.inv.slots[i], {
        hover: isHover,
        selected: i === this.game.selected,
        cooldown: true,
        number: i < HOTBAR_SIZE ? (i + 1) % 10 : null,
      });
    }

    this.drawFooter(ctx, w, h, UI.BOTTOM_Y);
    this.drawBagIcon(ctx, 8, UI.BOTTOM_Y + 7);
    ctx.textAlign = 'left';
    ctx.fillStyle = UIC.textSoft;
    ctx.fillText(`${this.inv.usedSlots()}/${this.inv.slots.length}`, 21, UI.BOTTOM_Y + 16);

    this.drawCraftButton(ctx, this.craftBtnRect, hover && hover.type === 'craftBtn', this.craftOpen);
    this.drawSalvageButton(ctx, this.salvageRect, hover && hover.type === 'salvage', !!(this.held && SALVAGE[this.held.item]));
    this.drawSortButton(ctx, this.sortRect, hover && hover.type === 'sort');
    this.drawSlot(ctx, this.trashRect, this.trash, { hover: hover && hover.type === 'trash', trash: true });

  }

  // ---------- Janela de criação: bancada + livro de receitas ----------
  drawCraftPanel(ctx, hover) {
    const w = CRAFT.W, h = CRAFT.H;
    const is = (type) => hover && hover.type === type;
    const list = this.benchResults(), start = this.makePage * CRAFT.MAKE_COLS;
    const job = this.station && this.game.world.stationJobs?.get(this.station.y * this.game.world.w + this.station.x);

    uiFrame(ctx, 0, 0, w, h);
    this.drawHeader(ctx, w, 'wood');
    this.drawIconBox(ctx);
    const station = CRAFT_STATIONS[this.station?.kind];
    if (station) this.drawItem(ctx, { item: station.item, count: 1 }, 8, 7);
    else this.drawBookIcon(ctx, 8, 7, false);
    const title = station?.kind === 'workbench' ? 'Bancada' : station?.name || 'Criação';
    this.drawTitle(ctx, this.fitText(ctx, title, w - 48), this.fitText(ctx, station?.subtitle || 'Livro de receitas', w - 37), null);
    this.drawCloseButton(ctx, w - 17, 6, is('craftClose'));

    // --- Bancada: joga os ingredientes aqui, a posição não importa ---
    this.drawSectionBar(ctx, w, station ? 'INGREDIENTES' : 'BANCADA');
    this.drawWell(ctx, CRAFT.BENCH_X - 3, CRAFT.BENCH_Y - 3, BENCH_SLOTS * (UI.SLOT + UI.GAP) + 4, UI.SLOT + 6, '#221a10');
    for (let i = 0; i < BENCH_SLOTS; i++)
      this.drawSlot(ctx, this.benchSlotRect(i), this.bench[i], { hover: is('benchSlot') && hover.i === i });
    this.drawPlate(ctx, CRAFT.CLEAR_X, CRAFT.BENCH_Y + 1, is('benchClear'), false);
    for (let k = 0; k < 5; k++) ctx.fillRect(CRAFT.CLEAR_X + 5 + k, CRAFT.BENCH_Y + 6 + k, 1, 1); // setinha de devolver
    for (let k = 0; k < 5; k++) ctx.fillRect(CRAFT.CLEAR_X + 5 + k, CRAFT.BENCH_Y + 14 - k, 1, 1);
    ctx.fillRect(CRAFT.CLEAR_X + 4, CRAFT.BENCH_Y + 9, 9, 3);

    // --- O que dá para montar com o que está na bancada ---
    this.drawSectionBar(ctx, w, job ? job.remaining > 0 ? 'AQUECENDO' : 'PRONTO' : list.length ? 'DÁ PARA FAZER' : 'BANCADA VAZIA', CRAFT.MAKE_BAR);
    this.drawWell(ctx, CRAFT.BENCH_X - 3, CRAFT.MAKE_Y - 3, CRAFT.MAKE_COLS * (UI.SLOT + UI.GAP) + 4, UI.SLOT + 6, list.length ? '#1b2416' : UIC.well);
    for (let i = 0; i < CRAFT.MAKE_COLS; i++) {
      const r = list[start + i];
      const output = r ? { item: r.result.item, count: r.result.count } : job && !list.length && i === 0 ? { item: job.recipe.result.item, count: job.recipe.result.count * job.times } : null;
      this.drawSlot(ctx, this.makeSlotRect(i), output,
        { hover: is('benchResult') && hover.i === i, ready: !!r });
    }
    if (list.length > CRAFT.MAKE_COLS) {
      for (const [type, rect, dir, enabled] of [
        ['makePrev', this.makePrevRect, -1, this.makePage > 0],
        ['makeNext', this.makeNextRect, 1, start + CRAFT.MAKE_COLS < list.length],
      ]) {
        const [x, y, rw, rh] = rect;
        rrect(ctx, x, y, rw, rh, UIC.slotBorder);
        rrect(ctx, x + 1, y + 1, rw - 2, rh - 2, enabled && is(type) ? UIC.slotHover : UIC.slot);
        ctx.fillStyle = enabled ? UIC.limeBright : UIC.frame;
        for (let k = 0; k < 4; k++) ctx.fillRect(x + 5 + dir * (k - 1), y + 6 + k, 1, 7 - k * 2);
      }
    }

    // --- Livro: filtro + lista desenhada ---
    this.drawSectionBar(ctx, w, 'RECEITAS', CRAFT.BOOK_BAR);
    this.drawSlot(ctx, this.filterRect, this.filter ? { item: this.filter, count: 1 } : null,
      { hover: is('filter'), ready: !!this.filter });
    if (!this.filter) this.drawFilterIcon(ctx, this.filterRect[0], this.filterRect[1]);
    const rows = this.bookList();
    this.drawSearchBox(ctx, is('search'), rows.length);
    this.drawCraftableButton(ctx, this.onlyCraftableRect, is('onlyCraftable'), this.onlyCraftable);

    this.bookScroll = clamp(this.bookScroll, 0, this.bookMaxScroll());
    this.drawWell(ctx, 5, CRAFT.LIST_Y - 3, w - 10, CRAFT.ROWS * CRAFT.ROW_H + 4, '#171b12');
    for (let i = 0; i < CRAFT.ROWS; i++) {
      const r = rows[this.bookScroll + i];
      if (!r) break;
      this.drawRecipeRow(ctx, this.listRowRect(i), r, is('bookRow') && hover.i === i);
    }
    if (!rows.length) {
      ctx.textAlign = 'center';
      ctx.fillStyle = UIC.textDim;
      const vazio = this.search ? 'Nada com esse nome' : this.onlyCraftable ? 'Falta material para tudo' : 'Nada usa esse item ainda';
      ctx.fillText(vazio, w / 2, CRAFT.LIST_Y + 24);
    }
    this.drawScrollArrows(ctx, is('scrollUp'), is('scrollDown'), rows.length);

    // Rodapé: nome da receita apontada, ou a dica de uso
    this.drawFooter(ctx, w, h, CRAFT.BOTTOM_Y);
    ctx.textAlign = 'center';
    const apontada = is('bookRow') ? hover.recipe : is('benchResult') ? list[start + hover.i] : null;
    ctx.fillStyle = apontada ? UIC.limeBright : UIC.textSoft;
    const texto = job ? job.remaining > 0 ? `Aquecendo ${Math.round((1 - job.remaining / job.duration) * 100)}%` : 'Pronto · libere espaço' : apontada ? `${apontada.name} · ${recipeStationName(apontada)}` : 'Clique = vai p/ bancada';
    ctx.fillText(this.fitText(ctx, texto, w - 14), w / 2, CRAFT.BOTTOM_Y + 12);
    if (job) { ctx.fillStyle = UIC.lime; ctx.fillRect(7, CRAFT.BOTTOM_Y + 16, (w - 14) * (1 - job.remaining / job.duration), 2); }
  }

  // Uma linha do livro: [resultado] ← [ingredientes], em vermelho o que falta
  drawRecipeRow(ctx, rect, r, hover) {
    const [x, y, rw, rh] = rect;
    const pode = this.canCraft(r);
    rrect(ctx, x, y, rw, rh, hover ? '#3c4a2c' : pode ? '#232c1c' : '#20242a');
    if (pode) { ctx.fillStyle = '#4a6a34'; ctx.fillRect(x, y, 2, rh); }

    ctx.globalAlpha = pode ? 1 : 0.55;
    // Resultado
    ctx.drawImage(this.renderer.tex.itemAtlas, r.result.item * T, 0, T, T, x + 4, y + 2, 16, 16);
    if (r.result.count > 1) {
      ctx.textAlign = 'right';
      this.shadowText(ctx, r.result.count, x + 21, y + 17, '#fff');
    }
    // Seta apontando do custo para o resultado
    ctx.fillStyle = pode ? UIC.limeBright : UIC.textDim;
    ctx.fillRect(x + 27, y + 9, 7, 2);
    for (let k = 0; k < 4; k++) ctx.fillRect(x + 26 + k, y + 7 + k, 1, 6 - k * 2);
    // Ingredientes
    r.items.slice(0, 4).forEach((n, i) => {
      const ix = x + 38 + i * 22;
      ctx.drawImage(this.renderer.tex.itemAtlas, n.item * T, 0, T, T, ix, y + 2, 16, 16);
      ctx.textAlign = 'right';
      this.shadowText(ctx, n.count, ix + 17, y + 17, this.inv.count(n.item) >= n.count ? '#fff' : '#ff8a7a');
    });
    ctx.globalAlpha = 1;
  }

  drawScrollArrows(ctx, hoverUp, hoverDown, total) {
    const up = this.scrollUpRect, down = this.scrollDownRect;
    const draw = (r, dir, hover, on) => {
      rrect(ctx, r[0], r[1], r[2], r[3], UIC.outline);
      rrect(ctx, r[0] + 1, r[1] + 1, r[2] - 2, r[3] - 2, !on ? '#242a31' : hover ? '#5a6672' : '#3a434c');
      ctx.fillStyle = on ? UIC.limeBright : '#4c545c';
      for (let k = 0; k < 3; k++) ctx.fillRect(r[0] + 3 + k, r[1] + (dir < 0 ? 6 - k : 3 + k), 4 - k * 2 + 1, 1);
    };
    draw(up, -1, hoverUp, this.bookScroll > 0);
    draw(down, 1, hoverDown, this.bookScroll < this.bookMaxScroll());
    // Barrinha de posição entre as setas
    const x = up[0] + 3, y0 = up[1] + 12, hgt = down[1] - y0 - 2;
    if (hgt > 6 && total > CRAFT.ROWS) {
      ctx.fillStyle = '#13171d'; ctx.fillRect(x, y0, 4, hgt);
      const bh = Math.max(4, Math.round((hgt * CRAFT.ROWS) / total));
      const by = y0 + Math.round(((hgt - bh) * this.bookScroll) / this.bookMaxScroll());
      ctx.fillStyle = UIC.lime; ctx.fillRect(x, by, 4, bh);
    }
  }

  // Livrinho aberto, usado no cabeçalho e no botão embaixo do minimapa
  drawBookIcon(ctx, x, y, hover) {
    ctx.fillStyle = UIC.outline;
    ctx.fillRect(x, y, 16, 13);
    ctx.fillStyle = hover ? '#b4763a' : '#8a5a2c';
    ctx.fillRect(x + 1, y + 1, 6, 11); ctx.fillRect(x + 9, y + 1, 6, 11);
    ctx.fillStyle = hover ? '#f3ead2' : '#ded2b4';
    ctx.fillRect(x + 2, y + 2, 5, 9); ctx.fillRect(x + 9, y + 2, 5, 9);
    ctx.fillStyle = UIC.outline;
    ctx.fillRect(x + 7, y + 1, 2, 11);
    ctx.fillStyle = '#9a8f74';
    for (let k = 0; k < 3; k++) { ctx.fillRect(x + 3, y + 4 + k * 2, 3, 1); ctx.fillRect(x + 10, y + 4 + k * 2, 3, 1); }
  }

  // Caixa de busca do livro: lupa, o que foi digitado, cursor piscando e quantas receitas sobraram
  drawSearchBox(ctx, hover, count) {
    const [x, y, w, h] = this.searchRect, on = this.searchFocus;
    rrect(ctx, x, y, w, h, on ? UIC.limeBright : UIC.slotBorder);
    rrect(ctx, x + 1, y + 1, w - 2, h - 2, on ? '#20262e' : hover ? '#1b2129' : UIC.well);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(x + 2, y + 2, w - 4, 1);

    const gx = x + 4, gy = y + 5; // lupinha
    ctx.fillStyle = on ? UIC.limeBright : UIC.textDim;
    ctx.fillRect(gx + 1, gy, 4, 1); ctx.fillRect(gx + 1, gy + 5, 4, 1);
    ctx.fillRect(gx, gy + 1, 1, 4); ctx.fillRect(gx + 5, gy + 1, 1, 4);
    ctx.fillRect(gx + 5, gy + 6, 2, 2);

    ctx.textAlign = 'right';
    const label = String(count);
    const cw = Math.ceil(ctx.measureText(label).width);
    ctx.fillStyle = this.search || this.filter || this.onlyCraftable ? UIC.limeBright : UIC.textDim;
    ctx.fillText(label, x + w - 4, y + 12);

    ctx.textAlign = 'left';
    const tx = x + 13, max = w - 17 - cw - 5;
    const shown = this.fitTextEnd(ctx, this.search, max);
    ctx.fillStyle = this.search ? UIC.text : UIC.textDim;
    ctx.fillText(this.search ? shown : on ? '' : 'buscar…', tx, y + 12);
    if (on && Math.floor(performance.now() / 420) % 2 === 0) {
      ctx.fillStyle = UIC.limeBright;
      ctx.fillRect(Math.min(tx + Math.ceil(ctx.measureText(shown).width) + 1, x + w - 6 - cw), y + 4, 1, 10);
    }
  }

  // "✓": mostra no livro só as receitas com material na mochila
  drawCraftableButton(ctx, r, hover, active) {
    const [x, y] = r;
    this.drawPlate(ctx, x, y, hover, active);
    for (let k = 0; k < 3; k++) ctx.fillRect(x + 4 + k, y + 9 + k, 2, 2);
    for (let k = 0; k < 5; k++) ctx.fillRect(x + 7 + k, y + 11 - k, 2, 2);
  }

  drawFilterIcon(ctx, x, y) {
    ctx.fillStyle = '#4b555f';
    ctx.fillRect(x + 4, y + 5, 12, 2);
    for (let k = 0; k < 4; k++) ctx.fillRect(x + 5 + k, y + 7 + k, 10 - k * 2, 1);
    ctx.fillRect(x + 8, y + 11, 4, 4);
  }

  // Botão do livro na tela (px reais), logo abaixo do minimapa
  drawBookButton(ctx, hover) {
    this.drawHudButton(ctx, this.bookBtnRect(), hover, 'C', (c) => this.drawBookIcon(c, 3, 4, hover));
  }

  // Botão do diário, ao lado do livro; acende quando há missão pronta para entregar
  drawJournalButton(ctx, hover) {
    const { active, ready } = npcQuestSummary(this.game);
    this.drawHudButton(ctx, this.journalBtnRect(), hover, 'J', (c) => {
      this.drawQuestBoardIcon(c, 3, 5, hover || ready > 0);
      if (!active) return;
      // Selo com quantas missões estão anotadas (verde quando dá para entregar)
      c.fillStyle = UIC.outline; c.fillRect(12, 1, 9, 8);
      c.fillStyle = ready ? '#6f9c45' : '#b0762c'; c.fillRect(13, 2, 7, 6);
      c.fillStyle = '#12160f'; c.font = UI_FONT; c.textAlign = 'center';
      c.fillText(Math.min(active, 9), 16.5, 8);
    });
  }

  // Botão do bestiário: pegada de pata; um selo avisa quando entrou bicho novo
  drawBestiaryButton(ctx, hover) {
    this.drawHudButton(ctx, this.bestiaryBtnRect(), hover, 'B', (c) => {
      this.drawPawIcon(c, 4, 3, hover);
      const fresh = Bestiary.newCount || 0;
      if (!fresh) return;
      c.fillStyle = UIC.outline; c.fillRect(12, 1, 9, 8);
      c.fillStyle = '#6f9c45'; c.fillRect(13, 2, 7, 6);
      c.fillStyle = '#12160f'; c.font = UI_FONT; c.textAlign = 'center';
      c.fillText(Math.min(fresh, 9), 16.5, 8);
    });
  }

  // Pegada: almofada grande e quatro dedos, com contorno
  drawPawIcon(ctx, x, y, bright) {
    const pad = bright ? '#f0c27a' : '#c99a58', dark = bright ? '#b07a38' : '#8a6232';
    const blob = (bx, by, w, h) => { ctx.fillStyle = UIC.outline; ctx.fillRect(x + bx - 1, y + by, w + 2, h); ctx.fillRect(x + bx, y + by - 1, w, h + 2); ctx.fillStyle = pad; ctx.fillRect(x + bx, y + by, w, h); ctx.fillStyle = dark; ctx.fillRect(x + bx, y + by + h - 1, w, 1); };
    blob(1, 3, 2, 3); blob(4, 1, 2, 3); blob(8, 1, 2, 3); blob(11, 3, 2, 3);
    blob(3, 7, 8, 5); ctx.fillStyle = pad; ctx.fillRect(x + 4, y + 12, 6, 1);
  }

  // Moldura comum dos botões da tela: placa de metal, ícone e a letra do atalho
  drawHudButton(ctx, rect, hover, key, icon) {
    const [x, y] = rect, s = this.scale();
    ctx.save();
    ctx.setTransform(s, 0, 0, s, x, y);
    ctx.imageSmoothingEnabled = false;
    ctx.font = UI_FONT;
    rrect(ctx, 0, 0, 22, 22, UIC.outline);
    rrect(ctx, 1, 1, 20, 20, hover ? '#5a6672' : '#3a434c');
    ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fillRect(2, 1, 18, 1);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(2, 20, 18, 1);
    icon(ctx);
    ctx.fillStyle = hover ? UIC.limeBright : UIC.textDim;
    ctx.font = UI_FONT; ctx.textAlign = 'right';
    ctx.fillText(key, 20, 21);
    ctx.restore();
  }

  // Prancheta de pedidos: silhueta com clipe em cima e vistos verdes.
  // Bem diferente do livro de receitas (que é marrom e tem duas páginas).
  drawQuestBoardIcon(ctx, x, y, bright) {
    ctx.fillStyle = UIC.outline;
    ctx.fillRect(x + 1, y + 1, 12, 12);
    ctx.fillStyle = bright ? '#7d8a96' : '#5c6874'; // prancheta de metal
    ctx.fillRect(x + 2, y + 2, 10, 10);
    ctx.fillStyle = bright ? '#f3ead2' : '#ded2b4'; // papel
    ctx.fillRect(x + 3, y + 4, 8, 7);
    ctx.fillStyle = UIC.outline; // clipe
    ctx.fillRect(x + 5, y - 1, 4, 4);
    ctx.fillStyle = bright ? '#ffd27a' : '#c9a25a';
    ctx.fillRect(x + 6, y, 2, 3);
    ctx.fillStyle = '#9a8f74'; // linhas do pedido
    ctx.fillRect(x + 6, y + 5, 4, 1);
    ctx.fillRect(x + 6, y + 7, 4, 1);
    ctx.fillRect(x + 6, y + 9, 3, 1);
    ctx.fillStyle = bright ? '#8fd45c' : '#6f9c45'; // vistinhos
    for (let k = 0; k < 3; k++) ctx.fillRect(x + 4, y + 5 + k * 2, 1, 1);
  }

  drawChestPanel(ctx, hover) {
    const c = this.container, w = CHEST.W, h = this.chestH;
    const is = (type) => hover && hover.type === type;

    uiFrame(ctx, 0, 0, w, h);
    this.drawHeader(ctx, w, 'leather');
    this.drawIconBox(ctx);
    if (c.icon) {
      const iw = 15, ih = Math.round((iw * c.icon.height) / c.icon.width);
      ctx.drawImage(c.icon, 8, 6 + Math.floor((17 - ih) / 2), iw, ih);
    }
    this.drawTitle(ctx, c.title, c.subtitle, null);
    this.drawCloseButton(ctx, w - 17, 6, is('chestClose'));
    this.drawSectionBar(ctx, w, c.equip ? 'EQUIPAMENTO' : 'CONTEÚDO');

    // Linha do equipamento (sela): espaço destacado com o nome ao lado
    if (c.equip) {
      const eq = c.equip.slots[0];
      this.drawWell(ctx, CHEST.GRID_X - 3, CHEST.GRID_Y - 3, UI.SLOT + 6, UI.SLOT + 6, '#1d1812');
      this.drawSlot(ctx, [CHEST.GRID_X, CHEST.GRID_Y], eq, { hover: is('equipSlot'), ready: !!eq });
      ctx.textAlign = 'left';
      this.shadowText(ctx, c.equip.label, CHEST.GRID_X + UI.SLOT + 7, CHEST.GRID_Y + 9, eq ? UIC.text : UIC.textDim);
      ctx.fillStyle = eq ? UIC.limeBright : '#c07a5a';
      ctx.fillText(eq ? 'pronto' : 'sem sela', CHEST.GRID_X + UI.SLOT + 7, CHEST.GRID_Y + 18);
    }

    const rows = Math.ceil(c.slots.length / CHEST.COLS);
    this.drawWell(ctx, CHEST.GRID_X - 3, this.chestGridY - 3, CHEST.COLS * (UI.SLOT + UI.GAP) - UI.GAP + 6, rows * (UI.SLOT + UI.GAP) - UI.GAP + 6, '#1d1812');
    for (let i = 0; i < c.slots.length; i++) {
      const x = CHEST.GRID_X + (i % CHEST.COLS) * (UI.SLOT + UI.GAP);
      const y = this.chestGridY + Math.floor(i / CHEST.COLS) * (UI.SLOT + UI.GAP);
      this.drawSlot(ctx, [x, y], c.slots[i], { hover: hover && hover.type === 'chestSlot' && hover.i === i });
    }

    this.drawFooter(ctx, w, h, this.chestBottom);
    const empty = !c.slots.some(Boolean);
    const bagEmpty = !this.inv.slots.slice(HOTBAR_SIZE).some(Boolean);
    const take = this.chestTakeRect, store = this.chestStoreRect;
    this.drawWideButton(ctx, take[0], take[1], take[2], take[3], empty ? 'Vazio' : 'Pegar tudo', { hover: is('chestTake'), disabled: empty });
    this.drawSortButton(ctx, this.chestSortRect, is('chestSort'));
    this.drawWideButton(ctx, store[0], store[1], store[2], store[3], 'Guardar mochila', { hover: is('chestStore'), disabled: bagEmpty });
  }

  drawSlot(ctx, r, stack, opts) {
    const [x, y] = r;
    const border = opts.selected ? UIC.selected : opts.ready ? UIC.limeBright : opts.trash ? '#7c2e22' : UIC.slotBorder;
    rrect(ctx, x, y, 20, 20, border);
    const fill = opts.trash ? (opts.hover ? '#5a2c24' : '#40231e') : opts.hover ? UIC.slotHover : UIC.slot;
    rrect(ctx, x + 1, y + 1, 18, 18, fill);
    // Encaixe afundado: sombra em cima e à esquerda, luz embaixo e à direita
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(x + 2, y + 1, 16, 2);
    ctx.fillRect(x + 1, y + 3, 1, 14);
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.fillRect(x + 2, y + 18, 16, 1);
    ctx.fillRect(x + 18, y + 3, 1, 14);

    if (opts.selected) {
      ctx.fillStyle = 'rgba(255,200,97,0.14)';
      ctx.fillRect(x + 1, y + 1, 18, 18);
      ctx.fillStyle = UIC.selected;
      // Cantoneiras por fora do slot selecionado
      for (const [cx, cy, sx, sy] of [[x - 1, y - 1, 1, 1], [x + 20, y - 1, -1, 1], [x - 1, y + 20, 1, -1], [x + 20, y + 20, -1, -1]]) {
        ctx.fillRect(Math.min(cx, cx + sx * 2), cy, 3, 1);
        ctx.fillRect(cx, Math.min(cy, cy + sy * 2), 1, 3);
      }
    }

    if (opts.number != null) {
      ctx.textAlign = 'left';
      ctx.fillStyle = opts.selected ? UIC.selected : UIC.textDim;
      ctx.fillText(opts.number, x + 2, y + 7);
    }

    if (stack) this.drawItem(ctx, stack, x + 2, y + 2);
    if(stack&&opts.cooldown) {
      const state=this.cooldownState(stack.item);
      if(state?.left>0){ctx.fillStyle='rgba(10,15,23,.7)';ctx.fillRect(x+1,y+1,18,Math.ceil(18*clamp(state.left/state.total,0,1)));}
    }
    if (stack?.fav) this.drawFavStar(ctx, x + 14, y + 1);
    else if (opts.trash) this.drawTrashIcon(ctx, x, y);
  }

  // Estrelinha dourada no canto do espaço de um item favorito
  drawFavStar(ctx, x, y) {
    ctx.fillStyle = UIC.outline;
    ctx.fillRect(x + 1, y, 3, 1); ctx.fillRect(x - 1, y + 1, 7, 3); ctx.fillRect(x, y + 4, 5, 2);
    ctx.fillStyle = '#ffd45a';
    ctx.fillRect(x + 2, y + 1, 1, 1); ctx.fillRect(x, y + 2, 5, 1); ctx.fillRect(x + 1, y + 3, 3, 1); ctx.fillRect(x + 1, y + 4, 1, 1); ctx.fillRect(x + 3, y + 4, 1, 1);
  }

  drawItem(ctx, stack, x, y) {
    ctx.drawImage(this.renderer.tex.itemAtlas, stack.item * T, 0, T, T, x, y, 16, 16);
    if (stack.count > 1) {
      ctx.textAlign = 'right';
      this.shadowText(ctx, stack.count, x + 17, y + 17, '#fff');
    }
  }

  // Silhueta de colete no espaço de roupa vazio
  drawArmorIcon(ctx, x, y) {
    ctx.fillStyle = '#4b555f';
    ctx.fillRect(x + 5, y + 4, 3, 2); ctx.fillRect(x + 12, y + 4, 3, 2);
    ctx.fillRect(x + 4, y + 6, 12, 9);
    ctx.fillStyle = UIC.slot;
    ctx.fillRect(x + 8, y + 6, 4, 3);
    ctx.fillStyle = '#39424b';
    ctx.fillRect(x + 6, y + 9, 8, 1); ctx.fillRect(x + 6, y + 12, 8, 1);
  }

  // Casa vazia de chapéu (boné) ou botas
  drawGearIcon(ctx, x, y, key) {
    // Silhuetas pintadas em pixel (contorno, sombra, tom mÃ©dio e luz) para os espaÃ§os vazios de chapÃ©u, armadura e botas
    const ART = {
      hat: ['....aaaaaa....', '...abccbbba...', '..abcbbbbbba..', '..abbbbbbbba..', '..abbbbbbbda..', 'aaabbbbbbddaaa', 'abbbbbbbbbbbba', '.addddddddddda.', '..aaaaaaaaaa..'],
      armor: ['.aa........aa.', 'abba..aa..abba', 'abbbaabbaabbba', 'abcbbbbbbbbcba', '.abbbbccbbbba.', '.abbbbcbbbbba.', '..abbbbbbbbda.', '..abbbbbbbdda.', '..adbbbbbbdda.', '..addddddddda.', '...aaaaaaaaa..'],
      boots: ['.aaa....aaa...', '.abca...abca..', '.abba...abba..', '.abba...abba..', '.abba...abba..', '.abbaa..abbaa.', '.abbbba.abbbba', '.abbbbbaabbbbb', '.addddddaadddd', '..aaaaaa..aaaa'],
    }[key], C = { a: '#2e353e', b: '#58626f', c: '#8693a3', d: '#424b57' };
    const ox = x + Math.floor((UI.SLOT - ART[0].length) / 2), oy = y + Math.floor((UI.SLOT - ART.length) / 2);
    ART.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] !== '.') { ctx.fillStyle = C[row[i]]; ctx.fillRect(ox + i, oy + j, 1, 1); } });
  }

  // Casa de acessório vazia: um pingente pendurado num cordão
  drawAccessoryIcon(ctx, x, y) {
    ctx.fillStyle = '#4b555f';
    ctx.fillRect(x + 5, y + 5, 10, 1);
    ctx.fillRect(x + 5, y + 5, 1, 3); ctx.fillRect(x + 14, y + 5, 1, 3);
    ctx.fillRect(x + 8, y + 8, 4, 5); ctx.fillRect(x + 9, y + 13, 2, 1);
    ctx.fillStyle = UIC.slot;
    ctx.fillRect(x + 9, y + 9, 2, 2);
  }

  drawTrashIcon(ctx, x, y) {
    ctx.fillStyle = '#c9b0a8';
    ctx.fillRect(x + 8, y + 4, 4, 1);
    ctx.fillRect(x + 5, y + 5, 10, 1);
    ctx.fillRect(x + 6, y + 7, 1, 8);
    ctx.fillRect(x + 13, y + 7, 1, 8);
    ctx.fillRect(x + 6, y + 15, 8, 1);
    ctx.fillRect(x + 8, y + 8, 1, 6);
    ctx.fillRect(x + 11, y + 8, 1, 6);
  }

  drawSortButton(ctx, r, hover) {
    const [x, y] = r;
    this.drawPlate(ctx, x, y, hover, false);
    // seta para cima
    ctx.fillRect(x + 5, y + 4, 1, 10);
    ctx.fillRect(x + 4, y + 5, 3, 1);
    ctx.fillRect(x + 3, y + 6, 5, 1);
    // seta para baixo
    ctx.fillRect(x + 12, y + 4, 1, 10);
    ctx.fillRect(x + 11, y + 12, 3, 1);
    ctx.fillRect(x + 10, y + 11, 5, 1);
  }

  // Martelo: desmontar o item do cursor (acende quando o item pode ser desmontado)
  drawSalvageButton(ctx, r, hover, ready) {
    const [x, y] = r;
    this.drawPlate(ctx, x, y, hover, ready);
    ctx.fillRect(x + 3, y + 4, 9, 3);
    ctx.fillRect(x + 10, y + 3, 3, 5);
    for (let k = 0; k < 7; k++) ctx.fillRect(x + 6 + k, y + 7 + k, 2, 1);
  }

  // Botão que abre a bancada/livro (o mesmo livrinho do botão do minimapa)
  drawCraftButton(ctx, r, hover, active) {
    const [x, y] = r;
    this.drawPlate(ctx, x, y, hover, active);
    this.drawBookIcon(ctx, x + 1, y + 3, hover || active);
  }

  // Mochila pequena ao lado da contagem de espaços usados
  drawBagIcon(ctx, x, y) {
    ctx.fillStyle = UIC.outline;
    ctx.fillRect(x + 2, y, 6, 3);
    ctx.fillRect(x, y + 2, 10, 9);
    ctx.fillStyle = UIC.header;
    ctx.fillRect(x + 3, y + 1, 4, 1);
    ctx.fillStyle = '#9a6a3a';
    ctx.fillRect(x + 1, y + 3, 8, 7);
    ctx.fillStyle = '#b98450';
    ctx.fillRect(x + 1, y + 3, 8, 1);
    ctx.fillStyle = '#6e4826';
    ctx.fillRect(x + 1, y + 6, 8, 1);
    ctx.fillStyle = '#e2b75a';
    ctx.fillRect(x + 4, y + 6, 2, 2);
  }

  // slotHint: mostra os atalhos de excluir/favoritar (espaços da mochila e do baú)
  // A descrição longa quebra em linhas de até TOOLTIP_TEXT_W unidades, para o balão não
  // atravessar a tela.
  drawTooltip(ctx, stack, u, v, s, slotHint = false) {
    const def = ITEM_DEFS[stack.item];
    const cooldown=this.cooldownState(stack.item);
    let desc = def.place === TILE.TORCH ? 'Fonte de luz' : def.place !== null ? 'Bloco' : 'Material';
    if (def.ferramenta) desc = def.descricao || `Ferramenta de ${TOOL_TIERS[def.nivel]?.nome ?? '?'} - alcance ${def.alcanceFerramenta} blocos`;
    else if (def.dano) desc = `Arma - dano ${def.dano}${def.rapidez && def.rapidez !== 1 ? ` - ritmo ${def.rapidez}x` : ''}${def.alcance ? ` - alcance ${def.alcance}` : ''}`;
    else if (def.arco) desc = 'Arma à distância: segure e solte';
    else if (def.roupa) desc = `Roupa - segura ${outfitDefense(stack.item)}% do dano`;
    else if (def.parede) desc = 'Parede de fundo (botão direito)';
    else if (def.vidaMaxima) desc = `Come e ganha +${def.vidaMaxima} de vida máxima`;
    else if (def.sela) desc = 'Vai no lombo do elefante';
    else if (def.chamado) desc = 'Chama seu elefante de longe';
    else if (def.bossSummon) desc = 'Invocador de chefe · consumível';
    else if (def.place === TILE.LADDER) desc = 'Sobe e desce nela (W / S)';
    else if (def.acessorio) desc = 'Acessório: equipe num espaço de acessório';
    else if (def.descricao && desc === 'Material') desc = 'Item especial';
    const lines = [desc];
    if (def.bossItem) { lines[0] = 'Item de boss'; lines.push(...(def.bossHelp || [def.descricao]).filter(Boolean)); }
    // O que o item faz de diferente (poderes dos espólios, comidas, ferramentas especiais...).
    // Ferramenta já usa a descrição na primeira linha, e o item de boss tem a ajuda própria.
    else if (def.descricao && desc !== def.descricao)
      lines.push(...wrapTooltipText(ctx, def.descricao, TOOLTIP_TEXT_W).map((t) => [t, UIC.textSoft]));
    if (def.cura) lines.push([`Comida - recupera ${def.cura} de vida`, UIC.limeBright]);
    if(cooldown?.left>0)lines.push(['Recarga: '+this.cooldownText(cooldown),UIC.text]);
    const total = this.inv.count(stack.item);
    if (total) lines.push([`Na mochila: ${total}${maxStackOf(stack.item) === 1 ? '' : ` · pilha até ${maxStackOf(stack.item)}`}`, UIC.textDim]);
    if (SALVAGE[stack.item]) lines.push(['Dá para desmontar no martelo', UIC.textDim]);
    if (stack.fav) lines.push(['Favorito: fica na mochila ao guardar', UIC.selected]);
    if (slotHint) lines.push([stack.fav ? 'Alt+clique: desfavoritar' : 'Ctrl+clique: excluir · Alt+clique: favoritar', UIC.textDim]);
    this.drawTooltipBox(ctx, def.name, lines, u, v, s);
  }

  // `desc` aceita texto, lista de linhas ou pares [texto, cor]
  drawTooltipBox(ctx, title, desc, u, v, s) {
    ctx.save();
    ctx.font=UI_FONT;
    ctx.textAlign = 'left';
    const c = this.renderer.canvas;
    const textWidth=Math.max(40,Math.min(TOOLTIP_TEXT_W,Math.floor((c.width-UI.ORIGIN)/s)-16));
    let rows = (Array.isArray(desc) ? desc : [desc]).filter(Boolean).flatMap(l=>{
      const [value,color]=Array.isArray(l)?l:[l,UIC.lime];
      return wrapTooltipText(ctx,value,textWidth).map(text=>[text,color]);
    });
    const titles=wrapTooltipText(ctx,title,textWidth);
    const extraTitle=(titles.length-1)*9;
    const availableH=Math.floor((c.height-UI.ORIGIN)/s)-4;
    const maxRows=Math.max(0,Math.floor((availableH-16-extraTitle)/9));
    if(rows.length>maxRows){rows=rows.slice(0,maxRows);if(maxRows)rows[maxRows-1]=[this.fitText(ctx,'Mais detalhes no guia [G]',textWidth),UIC.textDim];}
    const tw = Math.ceil(Math.max(0,...titles.map(t=>ctx.measureText(t).width), ...rows.map((l) => ctx.measureText(l[0]).width))) + 12;
    const th = 16 + extraTitle + rows.length * 9;
    const maxU = Math.floor((c.width - UI.ORIGIN) / s) - tw - 2;
    const maxV = Math.floor((c.height - UI.ORIGIN) / s) - th - 2;
    const x = Math.max(0,Math.min(u + 10, maxU));
    const y = Math.max(0,Math.min(v + 10, maxV)); // perto do rodapé o balão sobe
    rrect(ctx, x, y, tw, th, UIC.outline);
    rrect(ctx, x + 1, y + 1, tw - 2, th - 2, '#6b5230');
    ctx.fillStyle = '#15191e';
    ctx.fillRect(x + 2, y + 2, tw - 4, th - 4);
    ctx.fillStyle = UIC.lime;
    ctx.fillRect(x + 2, y + 2, 2, th - 4);
    ctx.fillStyle = UIC.text;
    titles.forEach((text,i)=>ctx.fillText(text,x+7,y+11+i*9));
    rows.forEach((l, i) => { ctx.fillStyle = l[1]; ctx.fillText(l[0], x + 7, y + 20 + extraTitle + i * 9); });
    ctx.restore();
  }

  // Campo de texto: quando não cabe, mostra o fim (onde está o cursor)
  fitTextEnd(ctx, text, max) {
    let s = text;
    while (s.length > 1 && ctx.measureText(s).width > max) s = s.slice(1);
    return s;
  }

  // Corta o texto com "…" quando ele não cabe na largura pedida
  fitText(ctx, text, max) {
    if (ctx.measureText(text).width <= max) return text;
    let s = text;
    while (s.length > 1 && ctx.measureText(s + '…').width > max) s = s.slice(0, -1);
    return s + '…';
  }

  shadowText(ctx, text, x, y, color) {
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillText(text, x + 1, y + 1);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }
}
