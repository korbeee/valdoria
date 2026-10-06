'use strict';

// =====================================================================================
//  BESTIÁRIO
// =====================================================================================
// Registra cada bicho e monstro que o jogador derrota (fica salvo no navegador, vale para
// todos os mundos) e mostra uma ficha com a animação do próprio sprite do jogo rodando:
// os bichos são desenhados pelas mesmas funções do mundo (drawWildlife, sprites dos
// monstros e do porco), só que num "espécime" de mentira que anda parado no lugar.
// Abre pelo botão embaixo do minimapa ou pela tecla B. O painel admin (F2) libera tudo.
// =====================================================================================

const BESTIARY_KEY = 'voo237.bestiario';

const BESTIARY_GROUPS = [
  ['todos', 'Todos'], ['chefe', 'Chefes'], ['monstro', 'Monstros'], ['fauna', 'Fauna'], ['agua', 'Aquáticos'],
];

// Um pouco de história de cada bicho (o resto da ficha sai das definições do jogo)
const BESTIARY_LORE = {
  bear: 'O senhor da serra. Dorme no covil selado em rocha matriz e só acorda quando alguém invade a sala.',
  tiger: 'Dente de Âmbar. Só existe um: dorme numa cama de folhas sob uma rocha inclinada, no bosque junto ao riacho. Um pedaço de âmbar brilha no seu dente. Errar o bote contra as rochas o deixa zonzo.',
  forest_deer: 'Passeia nas clareiras e bebe na lagoa do bosque. Seus rastros se cruzam com os caminhos do tigre.',
  forest_boar: 'Procura raízes no chão da floresta. O corpo robusto e as presas brancas aparecem entre o capim alto.',
  fiandeira: 'Transformou uma galeria subterrânea em um ninho de seda: teias nas rochas, casulos suspensos e ovos guardados em prateleiras tecidas. Cogumelos iluminam os vestígios da expedição sumida. Anda pelo teto e despenca por um fio sobre quem invade o berçário.',
  cascoferro: 'Um besouro do tamanho de uma carroça, blindado de ferro, que nada na areia sob o deserto. Guarda o portão de um observatório enterrado; só a barriga é macia. Sua carapaça guarda três Núcleos de Vendaval, usados para fabricar as Pedras dos Ventos e construir o acesso ao céu.',
  slime: 'Uma gota de gosma com fome. Pula atrás de qualquer coisa que se mexa.',
  undead: 'Nativo da ilha, curvado e à espreita. Aparece à noite e nas cavernas com o tacape em punho.',
  bat: 'Voa em zigue-zague pelas cavernas escuras. Pequeno, rápido e irritante.',
  bomber: 'Goblin mineiro com um barril de pólvora nas costas. Chega perto, acende o pavio e sai rindo: corra antes de ele estourar e abrir uma cratera.',
  pig: 'Manso e curioso. Foge quando apanha — e rende boa carne.',
  rabbit: 'Pula pelos campos da floresta e some no mato ao menor barulho.',
  wolf: 'Anda em alcateia pela floresta. Uiva sentado quando está tranquilo.',
  tortoise: 'Devagar e sempre pelas dunas. O casco duro rende couro.',
  scorpion: 'Esconde-se na areia quente do deserto. O ferrão é valioso.',
  snowhare: 'A pelagem branca some na neve da tundra.',
  frostwolf: 'Primo gelado do lobo, mais forte e mais resistente ao frio.',
  bird: 'Colorida e barulhenta, dorme num ninho de gravetos nas árvores da selva.',
  spider: 'Tece teias na selva fechada e ataca quem passa perto.',
  elephant: 'Gigante gentil da savana. Com uma sela, vira montaria e carrega carga.',
  hyena: 'Ronda a savana em busca de restos. Ri enquanto caça.',
  sika: 'O cervo de Nara, de pintas brancas, passeia sob as cerejeiras.',
  tanuki: 'Baixinho, gordo e mascarado. Dizem que muda de forma à noite.',
  tsuru: 'O grou de coroa vermelha dança nos lagos do vale.',
  kitsune: 'Ruiva de rabo enorme, a única caçadora do Vale das Cerejeiras.',
  sardine: 'Nada em cardumes prateados no mar aberto.',
  clownfish: 'Não sai de perto dos corais.',
  tang: 'Azul-vivo com cauda amarela. Vive vagando pelo recife.',
  angelfish: 'Desliza devagar, listrado como um vitral.',
  puffer: 'Incha feito uma bola de espinhos quando se sente ameaçado.',
  jellyfish: 'Brilha nas profundezas. Os tentáculos queimam.',
  shark: 'O terror do mar fundo. Dá voltas antes de atacar.',
  trout: 'Pintada e ágil, sobe a correnteza dos rios.',
  minnow: 'Peixinho de rio que anda em bando.',
  cavefish: 'Nunca viu a luz: não tem olhos e é quase transparente.',
};

// Todas as criaturas do jogo, na ordem da lista
function bestiaryEntries() {
  if (Bestiary._entries) return Bestiary._entries;
  const list = [];
  const add = (kind, group, e) => list.push({ kind, group, ...e });
  const wildDrops = (def) => (def.drops || (def.drop != null ? [[def.drop, 1, 1]] : [])).map((d) => d[0]);
  const BOSSES = ['bear', 'tiger', 'fiandeira', 'cascoferro', ...(WILDLIFE.thunderbird ? ['thunderbird'] : []), ...(WILDLIFE.nucleo ? ['nucleo'] : []), ...(WILDLIFE.yeti ? ['yeti'] : [])];
  for (const kind of BOSSES) {
    const d = WILDLIFE[kind];
    add(kind, 'chefe', { name: d.name, where: d.where || BIOME_NAMES[d.biome], hostile: true, hp: d.hp, damage: kind === 'bear' ? 26 : d.attackDamage || d.damage, speed: d.speed, drops: wildDrops(d) });
  }
  for (const kind of ['slime', 'undead', 'bat', 'bomber']) {
    const d = MONSTERS[kind];
    add(kind, 'monstro', { name: d.name, where: kind === 'slime' ? 'Em todo lugar' : 'Cavernas e noite', hostile: true, hp: d.hp, damage: d.damage || 'explode', speed: d.speed, drops: [d.drop] });
  }
  add('pig', 'fauna', { name: 'Porco', where: 'Campos', hostile: false, hp: PIG.vida, damage: 0, speed: PIG.velocidade, drops: [PIG.drop.item] });
  add('cubepig', 'fauna', { name: 'Porco Quadradão', where: 'Campos (raro: 0,5%)', hostile: false, hp: PIG.vida, damage: 0, speed: PIG.velocidade, drops: [PIG.drop.item, ITEM.DIAMOND_PICK] });
  const WATERS = { mar: 'Mar', rio: 'Rios e lagos', caverna: 'Lagos de caverna' };
  for (const [kind, d] of Object.entries(WILDLIFE)) {
    if (BOSSES.includes(kind)) continue;
    add(kind, d.aquatic ? 'agua' : d.monstro ? 'monstro' : 'fauna', {
      name: d.name, where: d.aquatic ? WATERS[d.spec.habitat] : d.where || BIOME_NAMES[d.biome], hostile: !!(d.hostile || d.spec?.dano),
      hp: d.hp, damage: d.damage || d.spec?.dano || 0, speed: d.speed, drops: wildDrops(d),
    });
  }
  return (Bestiary._entries = list);
}

// ---------- Espécime: um bicho de mentira que anda parado para a foto animada ----------
function bestiarySpecimen(kind) {
  const isPig = kind === 'pig' || kind === 'cubepig', def = WILDLIFE[kind] || (isPig ? null : MONSTERS[kind]);
  const w = def?.w ?? (isPig ? 20 : kind === 'undead' ? 14 : 20);
  const h = def?.h ?? (isPig ? 15 : kind === 'undead' ? 42 : kind === 'bomber' ? 24 : 14);
  return {
    kind, def, w, h, x: 0, y: 0, cx: 0, cy: 0, facing: 1, hostile: !isPig && !WILDLIFE[kind] ? true : !!def?.hostile,
    clock: 0, gait: 0, anim: 0, vx: 30, vy: 0, onGround: true, hurtTimer: 0, stepOffset: 0, sleeping: false,
    state: 'hunt', stateT: 0, tail: 0, flap: 0, puff: 0, pulse: 0.5, variant: 0, skin: kind === 'cubepig' ? 1 : 0, pitch: 0, fuse: 0, landTimer: 0, jumpWait: 1,
  };
}

// Tamanho do quadro (px do mundo) que cabe o bicho com folga
function bestiaryBox(kind) {
  const d = WILDLIFE[kind];
  if (d && !d.aquatic) {
    const img = wildlifeSprite(kind, 0).normal, k = kind === 'bear' ? BEAR_RENDER_SCALE : 1;
    return [Math.ceil(img.width * k) + 10, Math.ceil(img.height * k) + 8];
  }
  if (d?.aquatic) return [Math.max(d.w + 14, 26), Math.max(d.h + 16, 22)];
  const s = kind === 'cubepig' ? renderer.pigSprites.cube : kind === 'pig' ? renderer.pigSprites : renderer.monsterSprites[kind];
  const img = s.frames[0];
  return [img.width + 10, img.height + 8];
}

// Desenha o quadro `t` (segundos) da animação no contexto, com os pés em `ground`
function drawBestiarySpecimen(ctx, m, t, W, H) {
  const d = m.def;
  m.clock = t; m.gait = t * 8; m.anim = t * 3.2; m.tail = t * 8; m.flap = t * 10;
  m.pulse = (t * 0.7) % 1; m.puff = 0.5 + 0.5 * Math.sin(t * 1.6);
  if (m.kind === 'slime') { // pulinhos: agacha, sobe, cai
    const ph = (t * 1.1) % 1;
    m.onGround = ph < 0.55; m.landTimer = ph < 0.08 ? 1 : 0; m.jumpWait = 0.55 - ph; m.vy = ph < 0.78 ? -1 : 1;
  }
  const air = m.kind === 'slime' && !m.onGround ? Math.round(Math.sin(((t * 1.1) % 1 - 0.55) / 0.45 * Math.PI) * 8) : 0;
  m.x = W / 2 - m.w / 2; m.cx = W / 2;
  if (d?.aquatic) { m.cy = H / 2; m.y = m.cy - m.h / 2; }
  else if (m.kind === 'bat') { m.y = H / 2 - m.h / 2 + Math.round(Math.sin(t * 5) * 2); m.cy = m.y + m.h / 2; }
  else { m.y = H - 3 - m.h - air; m.cy = m.y + m.h / 2; }
  if (WILDLIFE[m.kind]) { drawWildlife(ctx, m); return; }
  const pigLike = m.kind === 'pig' || m.kind === 'cubepig', frame = pigLike ? pigFrame(m) : monsterFrame(m);
  const img = (m.kind === 'cubepig' ? renderer.pigSprites.cube : m.kind === 'pig' ? renderer.pigSprites : renderer.monsterSprites[m.kind]).frames[frame];
  ctx.drawImage(img, Math.round(m.cx - img.width / 2), Math.round(m.y + m.h - img.height));
}

const BESTIARY_CSS = `
#bestiary{display:flex;flex-direction:column;box-sizing:border-box;width:min(1040px,96vw);height:min(720px,92vh);padding:0;border:0;overflow:hidden;color:#efe6d2;background:#1b2027;font:400 13px/1.5 Silkscreen,monospace;box-shadow:0 0 0 3px #0a0c0f,0 0 0 6px #56616b,0 0 0 9px #0a0c0f,0 28px 70px rgba(0,0,0,.6)}
#bestiary::backdrop{background:rgba(6,10,15,.8)}
#bestiary *{box-sizing:border-box}
#bestiary .bx-top{display:flex;flex-wrap:wrap;align-items:center;gap:12px 22px;padding:14px 18px;background:linear-gradient(180deg,#29313b,#222931);border-bottom:3px solid #0a0c0f;box-shadow:inset 0 3px 0 #343d48}
#bestiary h2{margin:0;font-weight:400;font-size:22px;letter-spacing:1px;color:#ffd27a;text-shadow:0 3px 0 #0a0c0f}
#bestiary .bx-sub{margin:2px 0 0;font:13px monospace;color:#b0a992}
#bestiary .bx-prog{flex:1;min-width:200px;display:flex;flex-direction:column;gap:6px;font-size:11px;color:#c9c1ad}
#bestiary .bx-prog b{font-weight:400;color:#ffd27a}
#bestiary .bx-bar{height:12px;background:#101318;box-shadow:0 0 0 2px #0a0c0f}
#bestiary .bx-bar i{display:block;height:100%;background:#c7812f;box-shadow:inset 0 2px 0 #f0b25e,inset 0 -2px 0 #8a5220}
#bestiary button{font:400 11px Silkscreen,monospace;color:#efe6d2;background:#343c45;border:0;cursor:pointer;box-shadow:0 0 0 2px #0a0c0f,inset 0 2px 0 #4f5a64,inset 0 -2px 0 #232930}
#bestiary button:hover,#bestiary button:focus-visible{background:#434d57;color:#ffd27a;outline:none}
#bestiary .bx-close{padding:9px 12px}
#bestiary .bx-tabs{display:flex;gap:0;padding:0 14px;background:#20262e;border-bottom:3px solid #0a0c0f}
#bestiary .bx-tabs button{position:relative;flex:1;padding:12px 6px 11px;background:none;box-shadow:none;color:#8b96a0;font-size:11px;letter-spacing:1px}
#bestiary .bx-tabs button.on{color:#ffd27a}
#bestiary .bx-tabs button.on::after{content:'';position:absolute;left:8px;right:8px;bottom:-3px;height:4px;background:#e0a44a}
#bestiary .bx-tabs span{margin-left:6px;padding:1px 5px;font-size:9px;background:#141920;color:#8b96a0}
#bestiary .bx-tabs button.on span{background:#c7812f;color:#1a130b}
#bestiary .bx-main{flex:1;min-height:0;display:grid;grid-template-columns:minmax(0,1fr) 360px}
#bestiary .bx-grid{overflow:auto;padding:16px;display:grid;grid-template-columns:repeat(auto-fill,minmax(118px,1fr));gap:12px;align-content:start;scrollbar-width:thin;scrollbar-color:#56616b #101318}
#bestiary .bx-card{position:relative;display:flex;flex-direction:column;align-items:center;gap:6px;margin:2px;padding:8px 6px 8px;background:#232931;box-shadow:0 0 0 2px #0a0c0f,inset 0 -3px 0 #191d23;color:#c9c1ad;font-size:9px}
#bestiary .bx-card canvas{display:block;width:100%;height:72px;object-fit:contain;image-rendering:pixelated;background:radial-gradient(ellipse at 50% 80%,#3a4450,#262d35 70%)}
#bestiary .bx-card .nm{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#bestiary .bx-card .ct{position:absolute;top:6px;right:6px;padding:1px 5px;font-size:9px;color:#1a130b;background:#e0a44a;box-shadow:0 0 0 2px #0a0c0f}
#bestiary .bx-card.locked{color:#5d6770}
#bestiary .bx-card.locked canvas{background:#1a1f25}
#bestiary .bx-card.on{background:#2e2b25;color:#ffd27a;box-shadow:0 0 0 2px #0a0c0f,0 0 0 5px #e0a44a}
#bestiary .bx-card.boss:not(.locked) .nm{color:#ff9a6a}
#bestiary .bx-side{display:flex;flex-direction:column;min-height:0;overflow:auto;background:#161a20;border-left:3px solid #0a0c0f}
#bestiary .bx-stage{position:relative;margin:16px 16px 0;box-shadow:0 0 0 3px #0a0c0f,0 0 0 6px #3a434c,0 0 0 9px #0a0c0f}
#bestiary .bx-stage canvas{display:block;width:100%;aspect-ratio:3/2;image-rendering:pixelated}
#bestiary .bx-stage .tag{position:absolute;left:8px;top:8px;padding:3px 7px;font-size:9px;letter-spacing:1px;background:rgba(10,12,15,.8);box-shadow:0 0 0 2px #0a0c0f}
#bestiary .bx-stage .tag.hostil{color:#ff9a6a}#bestiary .bx-stage .tag.passivo{color:#9fdc8a}
#bestiary .bx-info{padding:18px 18px 16px}
#bestiary .bx-info h3{margin:0;font-weight:400;font-size:17px;color:#ffd27a}
#bestiary .bx-info .where{margin:2px 0 12px;font:12px monospace;color:#9aa3a9}
#bestiary .bx-info .lore{margin:0 0 14px;font:13px/1.5 monospace;color:#c9c1ad}
#bestiary .bx-stats{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px}
#bestiary .bx-stats div{padding:7px 9px;background:#1f252c;box-shadow:0 0 0 2px #0a0c0f;font-size:9px;color:#8b96a0;letter-spacing:1px}
#bestiary .bx-stats b{display:block;font-weight:400;font-size:14px;color:#efe6d2;letter-spacing:0}
#bestiary .bx-drops{display:flex;flex-wrap:wrap;gap:8px}
#bestiary .bx-drops span{display:flex;align-items:center;gap:6px;padding:4px 8px 4px 4px;font:12px monospace;color:#c9c1ad;background:#1f252c;box-shadow:0 0 0 2px #0a0c0f}
#bestiary .bx-drops i{width:24px;height:24px;background-image:var(--atlas);background-size:var(--atlas-w) 24px;background-position:calc(var(--i) * -24px) 0;image-rendering:pixelated}
#bestiary .bx-label{margin:0 0 8px;font-size:10px;letter-spacing:2px;color:#e0a44a}
#bestiary .bx-locked{margin:0;font:13px/1.5 monospace;color:#8b96a0}
#bestiary .bx-foot{padding:10px 18px;font:12px monospace;color:#7d858b;background:#20262e;border-top:3px solid #0a0c0f}
#bestiary kbd{font:400 9px Silkscreen,monospace;color:#1a130b;background:#d9cfb8;padding:3px 5px 4px;box-shadow:0 0 0 2px #0a0c0f;margin:0 2px}
@media (max-width:760px){#bestiary .bx-main{grid-template-columns:1fr;overflow:auto}#bestiary .bx-side{border-left:0;border-top:3px solid #0a0c0f;overflow:visible}#bestiary .bx-grid{overflow:visible}}
`;

const Bestiary = {
  data: null, filter: 'todos', sel: null, raf: 0,

  load() {
    if (this.data) return this.data;
    try { this.data = JSON.parse(localStorage.getItem(BESTIARY_KEY) || '{}'); } catch (_) { this.data = {}; }
    this.data.kills ??= {}; this.data.first ??= {}; this.data.unlocked ??= {};
    return this.data;
  },
  save() { try { localStorage.setItem(BESTIARY_KEY, JSON.stringify(this.data)); } catch (_) {} },
  kindOf(mob) { return mob.skin === 1 ? 'cubepig' : (mob.kind || 'pig'); },
  known(kind) { const d = this.load(); return (d.kills[kind] || 0) > 0 || !!d.unlocked[kind]; },

  // Chamado por killMob (js/mobs.js) sempre que um bicho morre
  recordKill(mob) {
    if (mob.kind === 'bomber' && mob.hp > 0) return; // estourou sozinho, ninguém derrotou
    const kind = this.kindOf(mob), d = this.load(), fresh = !this.known(kind);
    d.kills[kind] = (d.kills[kind] || 0) + 1;
    d.first[kind] ??= Date.now();
    this.save();
    if (fresh && bestiaryEntries().some((e) => e.kind === kind)) {
      const e = bestiaryEntries().find((x) => x.kind === kind);
      toast(`Bestiário: ${e.name} registrado!  [B]`);
      this.newCount = (this.newCount || 0) + 1;
    }
  },

  // Painel admin: libera todas as fichas (sem mexer nas contagens de abates)
  unlockAll() {
    const d = this.load();
    for (const e of bestiaryEntries()) d.unlocked[e.kind] = true;
    this.save();
    if (this.dialog?.open) this.render();
  },
  reset() {
    this.data = { kills: {}, first: {}, unlocked: {} };
    this.save();
    if (this.dialog?.open) this.render();
  },
  progress() {
    const list = bestiaryEntries();
    return [list.filter((e) => this.known(e.kind)).length, list.length];
  },

  init() {
    if (this.dialog) return;
    const style = document.createElement('style');
    style.textContent = BESTIARY_CSS;
    document.head.append(style);
    this.dialog = document.createElement('dialog');
    this.dialog.id = 'bestiary';
    this.dialog.setAttribute('aria-labelledby', 'bx-title');
    document.body.append(this.dialog);
    this.dialog.addEventListener('cancel', (e) => { e.preventDefault(); this.close(); });
    this.dialog.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.action === 'close') this.close();
      else if (b.dataset.action === 'tab') { this.filter = b.dataset.tab; this.render(); }
      else if (b.dataset.kind) { this.sel = b.dataset.kind; this.renderSide(); this.markCards(); }
    });
    window.addEventListener('keydown', (e) => {
      if (!this.dialog.open) return;
      if (e.code === 'Escape' || e.code === 'KeyB') { e.preventDefault(); this.close(); }
      else if (e.code === 'Tab' || e.code === 'KeyQ' || e.code === 'KeyE') {
        e.preventDefault();
        const ids = BESTIARY_GROUPS.map((g) => g[0]), i = ids.indexOf(this.filter);
        this.filter = ids[(i + (e.code === 'KeyQ' || e.shiftKey ? ids.length - 1 : 1)) % ids.length];
        this.render();
      } else if (e.code.startsWith('Arrow')) {
        e.preventDefault();
        const list = this.visible(), i = list.findIndex((x) => x.kind === this.sel);
        const cols = Math.max(1, Math.round(this.dialog.querySelector('.bx-grid').clientWidth / 130));
        const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -cols, ArrowDown: cols }[e.code];
        const next = list[clamp(i + step, 0, list.length - 1)];
        if (next) { this.sel = next.kind; this.renderSide(); this.markCards(); this.dialog.querySelector('.bx-card.on')?.scrollIntoView({ block: 'nearest' }); }
      }
      e.stopImmediatePropagation();
    }, true);
  },

  open(g) {
    this.init();
    this.g = g;
    g.inventoryUI.close();
    g.mapUI.open = false;
    g.npcOpen = true; // o jogo não recebe teclado nem clique enquanto o livro está aberto
    input.keys.clear();
    input.mouse.left = input.mouse.right = input.mouse.rawLeft = false;
    cancelTool(g);
    this.newCount = 0;
    this.dialog.style.setProperty('--atlas', `url(${NpcServices.atlasUrl()})`);
    this.dialog.style.setProperty('--atlas-w', `${ITEM_DEFS.length * 24}px`);
    if (!this.sel) this.sel = (bestiaryEntries().find((e) => this.known(e.kind)) || bestiaryEntries()[0]).kind;
    this.render();
    if (!this.dialog.open) this.dialog.showModal();
    cancelAnimationFrame(this.raf);
    const loop = (now) => { this.animate(now / 1000); this.raf = requestAnimationFrame(loop); };
    this.raf = requestAnimationFrame(loop);
  },

  close() {
    cancelAnimationFrame(this.raf);
    if (this.dialog?.open) this.dialog.close();
    if (this.g) this.g.npcOpen = false;
    input.keys.clear();
    input.mouse.left = input.mouse.right = input.mouse.rawLeft = false;
  },

  toggle(g) { if (this.dialog?.open) this.close(); else this.open(g); },

  visible() {
    return bestiaryEntries().filter((e) => this.filter === 'todos' || e.group === this.filter);
  },

  render() {
    const [have, total] = this.progress(), list = this.visible();
    if (!list.some((e) => e.kind === this.sel)) this.sel = list[0]?.kind;
    const d = this.load();
    this.dialog.innerHTML = `
      <header class="bx-top">
        <div><h2 id="bx-title">Bestiário</h2><p class="bx-sub">Tudo o que você já enfrentou em Valdoria.</p></div>
        <div class="bx-prog"><span>Registrados <b>${have} de ${total}</b></span><div class="bx-bar"><i style="width:${Math.round(have / total * 100)}%"></i></div></div>
        <button class="bx-close" data-action="close">Fechar <kbd>B</kbd></button>
      </header>
      <nav class="bx-tabs">${BESTIARY_GROUPS.map(([id, label]) => {
        const all = bestiaryEntries().filter((e) => id === 'todos' || e.group === id);
        return `<button data-action="tab" data-tab="${id}" class="${id === this.filter ? 'on' : ''}">${label}<span>${all.filter((e) => this.known(e.kind)).length}/${all.length}</span></button>`;
      }).join('')}</nav>
      <div class="bx-main">
        <div class="bx-grid">${list.map((e) => {
          const known = this.known(e.kind), n = d.kills[e.kind] || 0;
          return `<button class="bx-card${known ? '' : ' locked'}${e.group === 'chefe' ? ' boss' : ''}" data-kind="${e.kind}" aria-label="${known ? e.name : 'Desconhecido'}">
            <canvas data-thumb="${e.kind}"></canvas><span class="nm">${known ? e.name : '???'}</span>${n ? `<span class="ct">×${n}</span>` : ''}</button>`;
        }).join('')}</div>
        <aside class="bx-side" id="bx-side"></aside>
      </div>
      <footer class="bx-foot"><kbd>Q</kbd><kbd>E</kbd> trocar de aba · <kbd>←</kbd><kbd>→</kbd> escolher · derrote um bicho para registrá-lo</footer>`;
    this.specimens = new Map();
    for (const cv of this.dialog.querySelectorAll('canvas[data-thumb]')) this.setupCanvas(cv, cv.dataset.thumb, 1);
    this.markCards();
    this.renderSide();
  },

  markCards() {
    for (const c of this.dialog.querySelectorAll('.bx-card')) c.classList.toggle('on', c.dataset.kind === this.sel);
  },

  // Canvas no tamanho do bicho (px do mundo); o CSS amplia sem suavizar
  setupCanvas(cv, kind, pad) {
    const [w, h] = bestiaryBox(kind);
    cv.width = Math.ceil(w * pad); cv.height = Math.ceil(h * pad);
    this.specimens.set(cv, bestiarySpecimen(kind));
  },

  renderSide() {
    const e = bestiaryEntries().find((x) => x.kind === this.sel), side = this.dialog.querySelector('#bx-side');
    if (!e) { side.innerHTML = ''; return; }
    const known = this.known(e.kind), d = this.load(), n = d.kills[e.kind] || 0;
    const first = d.first[e.kind] ? new Date(d.first[e.kind]).toLocaleDateString('pt-BR') : '—';
    const drops = [...new Set(e.drops.filter((i) => ITEM_DEFS[i]))];
    side.innerHTML = `
      <div class="bx-stage"><canvas id="bx-big"></canvas>${known ? `<span class="tag ${e.hostile ? 'hostil' : 'passivo'}">${e.group === 'chefe' ? 'Chefe' : e.hostile ? 'Hostil' : 'Passivo'}</span>` : ''}</div>
      <div class="bx-info">${known ? `
        <h3>${e.name}</h3><p class="where">${e.where}</p>
        <p class="lore">${BESTIARY_LORE[e.kind] || ''}</p>
        <div class="bx-stats">
          <div>Vida<b>${e.hp}</b></div><div>Dano<b>${e.damage || '—'}</b></div>
          <div>Abatidos<b>${n}</b></div><div>Primeiro abate<b>${first}</b></div>
        </div>
        ${drops.length ? `<p class="bx-label">DEIXA CAIR</p><div class="bx-drops">${drops.map((i) => `<span><i style="--i:${i}"></i>${ITEM_DEFS[i].name}</span>`).join('')}</div>` : ''}`
      : `<h3>???</h3><p class="where">${e.group === 'agua' ? 'Vive na água' : e.group === 'chefe' ? 'Um chefe à espera' : 'Ainda não encontrado'}</p>
         <p class="bx-locked">Derrote esta criatura para registrar a ficha completa, com a animação, o que ela deixa cair e onde vive.</p>`}
      </div>`;
    // Palco maior: o bicho com folga para o chão e o céu
    const big = side.querySelector('#bx-big'), [w, h] = bestiaryBox(e.kind);
    const W = Math.max(w + 24, Math.ceil((h + 20) * 1.5)), H = Math.ceil(W / 1.5);
    big.width = W; big.height = H;
    this.bigSpecimen = { cv: big, m: bestiarySpecimen(e.kind), known, entry: e };
  },

  // Anima as miniaturas e o palco (as fichas bloqueadas viram silhueta)
  animate(t) {
    for (const [cv, m] of this.specimens || []) this.paint(cv, m, t, this.known(m.kind), false);
    const b = this.bigSpecimen;
    if (b?.cv.isConnected) this.paint(b.cv, b.m, t, b.known, true);
  },

  paint(cv, m, t, known, stage) {
    const c = cv.getContext('2d'), W = cv.width, H = cv.height;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, W, H);
    c.imageSmoothingEnabled = false;
    const water = m.def?.aquatic;
    if (stage) { // fundo do palco: céu ou água, com chão
      const g = c.createLinearGradient(0, 0, 0, H);
      if (water) { g.addColorStop(0, '#1d4a6e'); g.addColorStop(1, '#0c2236'); }
      else if (m.kind === 'bat' || m.kind === 'undead' || m.kind === 'bomber' || m.kind === 'bear') { g.addColorStop(0, '#1c1a24'); g.addColorStop(1, '#2c2632'); }
      else { g.addColorStop(0, '#3a5a86'); g.addColorStop(0.7, '#9fb4c8'); g.addColorStop(1, '#d6c49a'); }
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      if (water) {
        c.fillStyle = 'rgba(180,220,255,0.18)';
        for (let i = 0; i < 6; i++) { const y = Math.round(((t * 6 + i * 17) % (H + 10)) - 5); c.fillRect(Math.round((i * 29 + Math.sin(t + i) * 3) % W), H - y, 1, 1); }
      } else {
        c.fillStyle = m.kind === 'bat' || m.kind === 'undead' || m.kind === 'bomber' || m.kind === 'bear' ? '#4a4450' : '#5a8a3c';
        c.fillRect(0, H - 4, W, 4);
        c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(0, H - 2, W, 2);
      }
    }
    if (!stage && !known) c.globalAlpha = 1;
    // O espécime em si
    const off = this._off || (this._off = makeCanvas(1, 1)), oc = off.getContext('2d');
    if (off.width !== W || off.height !== H) { off.width = W; off.height = H; }
    oc.setTransform(1, 0, 0, 1, 0, 0);
    oc.clearRect(0, 0, W, H);
    oc.imageSmoothingEnabled = false;
    if (!water && stage) oc.translate(0, -1);
    try { drawBestiarySpecimen(oc, m, t, W, H - (stage && !water ? 3 : 0)); } catch (_) { /* bicho sem arte ainda */ }
    if (!known) { // silhueta escura
      oc.setTransform(1, 0, 0, 1, 0, 0);
      oc.globalCompositeOperation = 'source-in';
      oc.fillStyle = stage ? '#0d1014' : '#39414b';
      oc.fillRect(0, 0, W, H);
      oc.globalCompositeOperation = 'source-over';
    }
    c.drawImage(off, 0, 0);
  },
};
