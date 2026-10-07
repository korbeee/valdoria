'use strict';
// Painel local de desenvolvimento. Atalho: F2. Não é autenticação de servidor.
function adminClearMobs(g) {
 const count=g.mobs.length;
 if(g.inventoryUI.container?.source?.mount)g.inventoryUI.closeContainer();
 if(g.mount)dismountElephant(g);
 resetFishing(g);
 for(const m of [...g.mobs])if(m.boss&&!m.dead)resetBossEncounter(g,m);
 g.mobs=[];g.boss=null;g.spiderLasso=null;g.player.pullT=0;
 if(typeof NET!=='undefined'&&NET.room&&NET.isHost){netFlushTiles();netSendMobs();netRelay({k:'adminMobsCleared',count});}
 return count;
}

function initAdmin(){
 const style=document.createElement('style');style.textContent=`
 #admin-toggle,#admin-panel button,#admin-panel select{font:400 11px Silkscreen,monospace;color:#efe6d2;background:#343c45;border:0;padding:9px;cursor:pointer;box-shadow:0 0 0 2px #0a0c0f,inset 0 2px 0 #4f5a64,inset 0 -2px 0 #232930}
 #admin-toggle{position:fixed;right:14px;bottom:14px;z-index:20}
 #admin-toggle:hover,#admin-panel button:hover{background:#434d57;color:#ffd27a}
 #admin-panel button:disabled,#admin-panel select:disabled{opacity:.45;cursor:default}
 #admin-overlay{position:fixed;inset:0;background:#06080bbb;z-index:30;display:grid;place-items:center}
 #admin-overlay[hidden]{display:none}
 #admin-panel{box-sizing:border-box;width:min(480px,94vw);max-height:88vh;overflow:auto;background:#1b2027;box-shadow:0 0 0 3px #0a0c0f,0 0 0 6px #56616b,0 0 0 9px #0a0c0f,0 24px 60px #0009;padding:20px;color:#efe6d2;font:12px monospace}
 #admin-panel h2{font:400 18px Silkscreen,monospace;margin:0 0 8px}#admin-panel p{color:#9aa3a9;line-height:1.5}#admin-panel .row{display:flex;gap:10px;margin:12px 0;flex-wrap:wrap}#admin-panel .row>*{flex:1}#admin-panel label{display:block;margin:14px 0;color:#c9c1ad}#admin-panel select{width:100%;margin-top:6px;background:#101318}#admin-status{min-height:36px;color:#e0a44a!important}
 #admin-panel .adm-items{margin:16px 0;padding:14px;background:#14181e;box-shadow:inset 0 0 0 2px #0a0c0f,inset 0 0 0 4px #262d35}
 #admin-panel .adm-head{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:10px}
 #admin-panel .adm-head h3{font:400 13px Silkscreen,monospace;margin:0;letter-spacing:.04em}
 #admin-item-count{color:#7d868d;font-size:11px}
 #admin-panel .adm-search{position:relative;display:flex;align-items:center}
 #admin-panel .adm-search svg{position:absolute;left:11px;width:14px;height:14px;fill:none;stroke:#7d868d;stroke-width:2;pointer-events:none}
 #admin-item-search{box-sizing:border-box;width:100%;padding:10px 36px 10px 34px;background:#0c0f13;color:#efe6d2;border:0;border-radius:0;box-shadow:inset 0 0 0 2px #2c343c;font:14px monospace;outline:none}
 #admin-item-search::placeholder{color:#58616a}
 #admin-item-search:focus{box-shadow:inset 0 0 0 2px #ffd27a}
 #admin-item-search:focus+svg{stroke:#ffd27a}
 #admin-panel .adm-clear{position:absolute;right:5px;padding:4px 8px;background:none;box-shadow:none;color:#7d868d;font:14px monospace}
 #admin-panel .adm-clear:hover{background:none;color:#ffd27a}
 #admin-panel .adm-cats{display:flex;flex-wrap:wrap;gap:5px;margin:10px 0}
 #admin-panel .adm-cats button{flex:auto;padding:5px 6px;font-size:9px;color:#9aa3a9;background:#1f252c;box-shadow:0 0 0 2px #0a0c0f}
 #admin-panel .adm-cats button[aria-pressed="true"]{color:#ffd27a;background:#3a3222;box-shadow:0 0 0 2px #0a0c0f,inset 0 0 0 1px #ffd27a80}
 #admin-item-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(40px,1fr));gap:4px;height:178px;overflow-y:auto;align-content:start;padding:5px;background:#0c0f13;box-shadow:inset 0 0 0 2px #0a0c0f;scrollbar-width:thin;scrollbar-color:#56616b #0c0f13}
 #admin-panel .adm-slot{aspect-ratio:1;padding:0;display:grid;place-items:center;background:#1f252c;box-shadow:inset 0 2px 0 #2c343c,inset 0 -2px 0 #15191e}
 #admin-panel .adm-slot[hidden],#admin-panel .adm-empty[hidden]{display:none}
 #admin-panel .adm-slot:hover{background:#2b333c}
 #admin-panel .adm-slot[aria-selected="true"]{background:#3a3222;box-shadow:inset 0 0 0 2px #ffd27a}
 #admin-panel .adm-slot:focus-visible{outline:2px solid #efe6d2;outline-offset:1px}
 #admin-panel .adm-slot i{width:32px;height:32px;background:var(--atlas) no-repeat;background-size:var(--atlas-w) 32px;image-rendering:pixelated;pointer-events:none}
 #admin-panel .adm-empty{grid-column:1/-1;align-self:center;text-align:center;margin:60px 0}
 #admin-panel .adm-detail{display:flex;gap:12px;align-items:center;margin:12px 0}
 #admin-panel .adm-detail canvas{width:48px;height:48px;flex:none;image-rendering:pixelated;background:#0c0f13;box-shadow:inset 0 0 0 2px #2c343c}
 #admin-panel .adm-detail strong{display:block;font:400 12px Silkscreen,monospace;color:#ffd27a;margin-bottom:3px}
 #admin-panel .adm-detail span{color:#9aa3a9;font-size:11px;line-height:1.4}
 #admin-panel .adm-qty{display:flex;gap:6px;flex-wrap:wrap}
 #admin-panel .adm-qty button{padding:7px 9px}
 #admin-amount{box-sizing:border-box;width:64px;text-align:center;background:#0c0f13;color:#efe6d2;border:0;border-radius:0;box-shadow:inset 0 0 0 2px #2c343c;font:14px monospace;outline:none;-moz-appearance:textfield}
 #admin-amount:focus{box-shadow:inset 0 0 0 2px #ffd27a}
 #admin-amount::-webkit-inner-spin-button,#admin-amount::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
 #admin-panel .adm-qty .adm-sep{flex:1}
 #admin-panel .adm-give{display:block;width:100%;margin-top:12px;padding:11px;background:#4b6a34;box-shadow:0 0 0 2px #0a0c0f,inset 0 2px 0 #6b8d4c,inset 0 -2px 0 #34491f}
 #admin-panel .adm-give:hover:not(:disabled){background:#587c3e;color:#fff4c8}
 `;document.head.append(style);
 const toggle=document.createElement('button');toggle.id='admin-toggle';toggle.textContent='ADMIN · F2';document.body.append(toggle);
 const overlay=document.createElement('div');overlay.id='admin-overlay';overlay.hidden=true;
 overlay.innerHTML=`<section id="admin-panel" role="dialog" aria-modal="true" aria-labelledby="admin-title"><h2 id="admin-title">Painel de administrador</h2><p>O jogo fica pausado enquanto este painel está aberto.</p><div class="row"><button data-action="day">☀ Dia</button><button data-action="night">☾ Noite</button><button data-action="dusk">Entardecer</button></div><label><input id="admin-freeze" type="checkbox"> Congelar horário</label><div class="row"><button id="admin-fast" type="button" aria-pressed="false">⏩ Tempo 5x: desligado</button></div><label><input id="admin-god" type="checkbox"> Invencibilidade</label><div class="row"><button data-action="heal">Curar</button><button data-action="kit">Kit de ferramentas</button></div><section class="adm-items" aria-labelledby="adm-items-title"><div class="adm-head"><h3 id="adm-items-title">Itens</h3><span id="admin-item-count" role="status"></span></div><div class="adm-search"><input id="admin-item-search" type="text" placeholder="Buscar item…" aria-label="Buscar item" autocomplete="off" spellcheck="false" aria-controls="admin-item-grid"><svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="6.5" cy="6.5" r="4.5"/><path d="M10 10l4 4"/></svg><button type="button" class="adm-clear" aria-label="Limpar busca" hidden>✕</button></div><div class="adm-cats" role="group" aria-label="Categoria"></div><div id="admin-item-grid" role="listbox" aria-label="Itens"></div><div class="adm-detail" id="admin-item-detail"><canvas width="48" height="48"></canvas><div><strong></strong><span></span></div></div><div class="adm-qty" role="group" aria-label="Quantidade"><button type="button" data-step="-1" aria-label="Menos um">−</button><input id="admin-amount" type="number" min="1" max="999" step="1" value="1" inputmode="numeric" aria-label="Quantidade (1 a 999)"><button type="button" data-step="1" aria-label="Mais um">+</button><span class="adm-sep"></span><button type="button" data-qty="10">10</button><button type="button" data-qty="99">99</button><button type="button" data-qty="999">999</button></div><button data-action="item" class="adm-give">Receber</button></section><label>Criatura<select id="admin-mob"><option value="slime">Slime</option><option value="undead">Canibal</option><option value="bat">Morcego</option><option value="bomber">Dinamiteiro</option><option value="pig">Porco</option></select></label><div class="row"><button data-action="spawn">Criar próximo</button><button data-action="clear" title="Remove monstros, animais, chefes e corpos, sem gerar drops.">Remover criaturas</button></div><p id="admin-status" role="status">Pronto para testar.</p><button data-action="close">Voltar ao jogo · F2 / Esc</button></section>`;
 document.body.append(overlay);
 overlay.querySelector('#admin-god').closest('label').insertAdjacentHTML('afterend', `<label><input id="admin-fly" type="checkbox"> Voar · WASD / setas · Shift acelera</label><label><input id="admin-vision" type="checkbox"> Visão noturna</label><label><input id="admin-maptp" type="checkbox"> Teleportar clicando no mapa (abra com M)</label><div class="row"><button data-action="reveal">Explorar mapa inteiro</button><button data-action="home">Voltar ao acidente</button></div><div class="row"><button data-action="sky">Ir ao céu (observatório)</button><button data-action="skynest">Ninho da Tempestade</button><button data-action="skystone">Pedra dos Ventos</button></div>`);
 const mobSelect=overlay.querySelector('#admin-mob');
 for(const [kind,def] of Object.entries(WILDLIFE)) {const option=document.createElement('option');option.value=kind;option.textContent=def.name+' · '+(BIOME_NAMES[def.biome]??def.where??'')+' · '+(def.hostile?'hostil':'passivo');mobSelect.append(option);}
 {const o=document.createElement('option');o.value='cubepig';o.textContent='Porco Quadradão · Campos · passivo (raro)';mobSelect.append(o);}
 const status=text=>overlay.querySelector("#admin-status").textContent=text;
 overlay.querySelector('#admin-status').insertAdjacentHTML('beforebegin',`<section class="adm-items" aria-labelledby="adm-arena-title"><div class="adm-head"><h3 id="adm-arena-title">Arena de batalha</h3></div><p>Área grande e plana, com piso de pedra e iluminação. A criação substitui os blocos da área escolhida no alto do mapa.</p><div class="row"><button data-action="arena-create">Criar arena</button><button data-action="arena-enter">Ir para a arena</button></div><div class="row"><button data-action="arena-summoners">Receber invocadores</button></div></section>`);
 // Fenômenos naturais: dispara na hora chuva, tempestade, vendaval, areia e tornado, para
 // não ter que esperar o sorteio do clima (js/weather.js).
 const weatherOptions=Object.keys(WEATHER_TYPES).map(k=>`<option value="${k}"${k==='rain'?' selected':''}>${WEATHER_NAMES[k]||k}</option>`).join('');
 overlay.querySelector('#admin-status').insertAdjacentHTML('beforebegin',`<section class="adm-items" aria-labelledby="adm-weather-title"><div class="adm-head"><h3 id="adm-weather-title">Fenômenos naturais</h3><span id="admin-weather-now" role="status"></span></div><label>Fenômeno<select id="admin-weather">${weatherOptions}</select></label><div class="row"><label style="margin:0">Força<select id="admin-weather-power"><option value="0.35">Fraco</option><option value="0.7">Médio</option><option value="1" selected>Forte</option></select></label><label style="margin:0">Duração<select id="admin-weather-time"><option value="30">30 s</option><option value="90" selected>1,5 min</option><option value="240">4 min</option><option value="99999">Até eu trocar</option></select></label></div><label><input id="admin-weather-lock" type="checkbox"> Travar: o clima não muda sozinho</label><div class="row"><button data-action="weather">Acionar</button><button data-action="weather-add" title="Junta este fenômeno ao clima que já está no céu (ex.: vendaval + chuva + raios + tornado)">Somar ao clima atual</button><button data-action="weather-calm">Acalmar</button><button data-action="thunder">Relâmpago</button></div></section>`);
 // Bestiário (js/bestiary.js): libera todas as fichas de uma vez ou apaga os registros
 overlay.querySelector('#admin-status').insertAdjacentHTML('beforebegin',`<section class="adm-items" aria-labelledby="adm-bestiary-title"><div class="adm-head"><h3 id="adm-bestiary-title">Bestiário</h3><span id="admin-bestiary-count"></span></div><div class="row"><button data-action="bestiary-all">Liberar todos os bichos</button><button data-action="bestiary-open">Abrir bestiário</button></div><div class="row"><button data-action="bestiary-reset">Zerar registros</button></div></section>`);
 const showBestiary=()=>{const [have,total]=Bestiary.progress();overlay.querySelector('#admin-bestiary-count').textContent=have+' de '+total;};
 showBestiary();
 overlay.addEventListener('click',e=>{
  const action=e.target.dataset.action;
  if(action==='bestiary-all'){Bestiary.unlockAll();showBestiary();status('Bestiário liberado: todos os bichos e monstros estão visíveis. Abra com B.');}
  if(action==='bestiary-reset'){
   if(!e.target.dataset.armed){e.target.dataset.armed='1';e.target.textContent='Clique de novo para zerar';setTimeout(()=>{delete e.target.dataset.armed;e.target.textContent='Zerar registros';},2500);return;}
   Bestiary.reset();showBestiary();status('Bestiário zerado.');
  }
  if(action==='bestiary-open'){show(false);Bestiary.open(game);}
 });
 const weatherSelect=overlay.querySelector('#admin-weather');
 function showWeather(){
  const w=game.weather;
  overlay.querySelector('#admin-weather-now').textContent=w?`agora: ${weatherLabel(w)}${w.timer<9000?` · ${Math.max(0,Math.ceil(w.timer))}s`:''}`:'';
 }
 overlay.querySelector('#admin-weather-lock').onchange=e=>{game.adminFreezeWeather=e.target.checked;status(game.adminFreezeWeather?'Clima travado: o fenômeno só muda se você mandar.':'Clima solto: volta a mudar sozinho.');};
 // Seletor de itens: busca + categorias + grade de ícones (setas navegam, Enter entrega).
 const grid=overlay.querySelector('#admin-item-grid'),search=overlay.querySelector('#admin-item-search'),clearSearch=overlay.querySelector('.adm-clear');
 const count=overlay.querySelector('#admin-item-count'),amount=overlay.querySelector('#admin-amount'),itemButton=overlay.querySelector('[data-action="item"]');
 const detail=overlay.querySelector('#admin-item-detail'),icon=detail.querySelector('canvas'),cats=overlay.querySelector('.adm-cats');
 const itemAmount=()=>{const n=Number(amount.value);return clamp(Number.isFinite(n)?Math.floor(n):1,1,999);};
 const normalizeName=text=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
 const categoryOf=def=>def.fishingRod||def.fishingBait||def.fishingCatch?'pesca':def.referenceGame?'references':def.bossItem?'boss':def.dano||def.arco?'armas':def.ferramenta?'ferramentas':def.cura||def.vidaMaxima?'comida':def.place!=null||def.parede!=null?'blocos':'outros';
 const CATEGORIES=[['todos','Todos'],['blocos','Blocos'],['ferramentas','Ferramentas'],['armas','Armas'],['pesca','Pesca'],['comida','Comida'],['boss','Item de boss'],['references','Itens de brincadeira'],['outros','Outros']];
 const describe=id=>{
  const def=ITEM_DEFS[id],bits=[];
  if(def.bossItem)bits.push('Item de boss',def.descricao);
  else if(def.dano)bits.push('Arma · Dano '+def.dano+(def.rapidez&&def.rapidez!==1?' · Ritmo '+def.rapidez+'x':''));
  else if(def.arco)bits.push('Arma à distância');
  else if(def.ferramenta)bits.push('Ferramenta de '+TOOL_TIERS[def.nivel].nome+' · Alcance '+def.alcanceFerramenta);
  else if(def.cura)bits.push('Comida · Cura '+def.cura);
  else if(def.roupa)bits.push('Roupa · Defesa '+outfitDefense(id)+'%');
  else if(def.acessorio)bits.push('Acessório',def.descricao);
  else if(def.parede!=null)bits.push('Parede de fundo');
  else if(def.place!=null)bits.push(def.place===TILE.TORCH?'Fonte de luz':'Bloco');
  else bits.push('Material');
  bits.push(maxStackOf(id)===1?'Não empilha':'Pilha até '+maxStackOf(id));
  if(def.referenceGame)bits.push('Inspiração: '+def.referenceGame);
  return bits.join(' · ');
 };
 const allItems=ITEM_DEFS.flatMap((def,id)=>def?.name?[{id,def,name:def.name,search:normalizeName(def.name+' '+(def.referenceGame||'')),cat:categoryOf(def)}]:[]);
 const atlas=renderer.tex.itemAtlas;
 grid.style.setProperty('--atlas',`url(${atlas.toDataURL()})`);grid.style.setProperty('--atlas-w',atlas.width*2+'px');
 for(const item of allItems){
  const slot=document.createElement('button');slot.type='button';slot.className='adm-slot';slot.dataset.id=item.id;
  slot.setAttribute('role','option');slot.setAttribute('aria-label',item.name);slot.title=item.name;slot.tabIndex=-1;
  const i=document.createElement('i');i.style.backgroundPosition=`${-item.id*32}px 0`;slot.append(i);item.slot=slot;grid.append(slot);
 }
 const empty=document.createElement('div');empty.className='adm-empty';empty.textContent='Nenhum item encontrado.';grid.append(empty);
 let category='todos',selectedId=allItems[0]?.id,visible=allItems;
 for(const [key,label] of CATEGORIES){const b=document.createElement('button');b.type='button';b.dataset.cat=key;b.textContent=label;b.setAttribute('aria-pressed',key===category);cats.append(b);}
 function selectItem(id,focus){
  selectedId=id;
  for(const item of allItems){const on=item.id===id;item.slot.setAttribute('aria-selected',on);item.slot.tabIndex=on?0:-1;}
  const item=allItems.find(it=>it.id===id);
  if(item){item.slot.scrollIntoView({block:'nearest'});if(focus)item.slot.focus();}
  updateDetail();
 }
 function updateDetail(){
  const def=ITEM_DEFS[selectedId],ctx=icon.getContext('2d'),ok=!!def&&visible.some(it=>it.id===selectedId);
  ctx.clearRect(0,0,48,48);itemButton.disabled=!ok;
  detail.querySelector('strong').textContent=ok?def.name:'—';
  detail.querySelector('span').textContent=ok?describe(selectedId):'Escolha um item na grade.';
  if(ok){ctx.imageSmoothingEnabled=false;ctx.drawImage(atlas,selectedId*T,0,T,T,0,0,48,48);}
  itemButton.textContent=ok?`Receber ${itemAmount()} × ${def.name}`:'Receber';
 }
 function filterItems(){
  const terms=normalizeName(search.value).trim().split(/\s+/).filter(Boolean);
  visible=allItems.filter(item=>(category==='todos'||item.cat===category)&&terms.every(term=>item.search.includes(term)));
  const shown=new Set(visible);for(const item of allItems)item.slot.hidden=!shown.has(item);
  empty.hidden=visible.length>0;clearSearch.hidden=!search.value;
  count.textContent=visible.length===allItems.length?`${allItems.length} itens`:`${visible.length} de ${allItems.length}`;
  if(visible.length&&!visible.some(it=>it.id===selectedId))selectItem(visible[0].id);else updateDetail();
 }
 search.addEventListener('input',filterItems);
 clearSearch.onclick=()=>{search.value='';filterItems();search.focus();};
 cats.onclick=e=>{const key=e.target.dataset.cat;if(!key)return;category=key;for(const b of cats.children)b.setAttribute('aria-pressed',b.dataset.cat===key);filterItems();};
 grid.onclick=e=>{const id=Number(e.target.dataset.id);if(e.target.dataset.id)selectItem(id);};
 grid.ondblclick=e=>{if(e.target.dataset.id)itemButton.click();};
 amount.addEventListener('input',updateDetail);
 amount.addEventListener('change',()=>{amount.value=String(itemAmount());updateDetail();});
 overlay.querySelector('.adm-qty').onclick=e=>{
  const {step,qty}=e.target.dataset;if(!step&&!qty)return;
  amount.value=String(clamp(qty?Number(qty):itemAmount()+Number(step),1,999));updateDetail();
 };
 // Chamado pelo keydown do painel (o painel intercepta o teclado antes do jogo).
 function itemKeys(e){
  if(e.target===search){
   if(e.key==='Enter'&&!itemButton.disabled){e.preventDefault();itemButton.click();}
   if(e.key==='ArrowDown'&&visible.length){e.preventDefault();selectItem(selectedId,true);}
   return;
  }
  if(!e.target.classList?.contains('adm-slot'))return;
  const cols=getComputedStyle(grid).gridTemplateColumns.split(' ').length;
  const move={ArrowLeft:-1,ArrowRight:1,ArrowUp:-cols,ArrowDown:cols,Home:-Infinity,End:Infinity}[e.key];
  if(move===undefined)return;
  e.preventDefault();
  const at=visible.findIndex(it=>it.id===selectedId),next=clamp(at+move,0,visible.length-1);
  if(e.key==='ArrowUp'&&at<cols){search.focus();return;}
  selectItem(visible[next].id,true);
 }
 filterItems();
 overlay.querySelector('#admin-fly').onchange=e=>{game.adminFly=e.target.checked;player.vx=player.vy=0;status(game.adminFly?'Voo ativado. W sobe, S desce; Shift acelera.':'Voo desativado.');};
 overlay.querySelector('#admin-vision').onchange=e=>{game.adminNightVision=e.target.checked;status(game.adminNightVision?'Visão noturna ativada.':'Visão noturna desativada.');};
 overlay.querySelector('#admin-maptp').onchange=e=>{game.adminMapTeleport=e.target.checked;status(game.adminMapTeleport?'Teleporte ativado: abra o mapa (M) e clique onde quer ir.':'Teleporte pelo mapa desativado.');};
 function show(open){if(game.npcOpen||game.intro?.active||(open&&game.paused))return;if(open){showWeather();showBestiary();}game.adminOpen=open;overlay.hidden=!open;input.keys.clear();input.mouse.left=input.mouse.right=input.mouse.rawLeft=false;cancelTool(game);game.mining.progress=0;game.swinging=false;if(open)overlay.querySelector('button').focus();else{toggle.blur();document.activeElement?.blur();}}
 toggle.onclick=()=>show(!game.adminOpen);
 window.addEventListener('keydown',e=>{
  if(e.code==='F2'||(game.adminOpen&&e.code==='Escape')){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)show(!game.adminOpen);return;}
  if(game.adminOpen){itemKeys(e);e.stopImmediatePropagation();}
 },true);
 overlay.querySelector('#admin-god').onchange=e=>{game.adminGod=e.target.checked;status(game.adminGod?'Invencibilidade ativada.':'Invencibilidade desativada.');};
 overlay.querySelector('#admin-freeze').onchange=e=>{game.adminFreezeTime=e.target.checked;};
 const fastBtn=overlay.querySelector('#admin-fast');
 const syncFast=()=>{const on=(game.adminTimeScale||1)>1;fastBtn.textContent='⏩ Tempo 5x: '+(on?'LIGADO':'desligado');fastBtn.setAttribute('aria-pressed',on);fastBtn.style.outline=on?'2px solid #7bd88f':'';};
 fastBtn.onclick=()=>{game.adminTimeScale=(game.adminTimeScale||1)>1?1:5;syncFast();status(game.adminTimeScale>1?'Tempo 5x mais rápido: feche o painel e o dia e a noite passam voando.':'Tempo normal.');};
 new MutationObserver(syncFast).observe(overlay,{attributes:true,attributeFilter:['hidden','class','style']});syncFast();
 function time(t){game.time=t;game.daylight=daylightAt(t);world.computeLight();world.composeLight(game.daylight);game.lastDaylight=game.daylight;status('Horário alterado.');}
 function give(id,n){const left=game.inventory.add(id,n);updateDetail();status('Recebido: '+(n-left)+' × '+ITEM_DEFS[id].name+(ITEM_DEFS[id].dano?' · Dano: '+ITEM_DEFS[id].dano:'')+(left?' · Inventário sem espaço para o restante.':''));}
 overlay.addEventListener('click',e=>{
  const action=e.target.dataset.action;if(!action)return;
  if(action==='arena-create'){
   if(typeof NET!=='undefined'&&NET.guest){netRelay({k:'adminArenaBuild'},NET.hostCid);status('Criando arena compartilhada…');}
   else{const a=adminBuildArena(game);status(a?'Arena criada: '+a.width+' blocos de largura. Você está no centro.':'Este mundo não tem espaço suficiente para a arena.');}
  }
  if(action==='arena-enter')status(adminEnterArena(game)?'Você está no centro da arena.':'Crie uma arena primeiro.');
  if(action==='arena-summoners'){let left=0;for(const id of BOSS_SUMMONERS.keys())left+=game.inventory.add(id,5);status(left?'Invocadores entregues; parte não coube no inventário.':'5 invocadores de cada boss recebidos. Use com botão direito.');}
  if(action==='close')show(false);
  if(action==='reveal'){game.map.revealAll();status('Mapa inteiro explorado. Abra com M.');}
  if(action==='home'){const tx=Math.floor(game.crashSite.x/T),sy=surfaceY(world,tx);player.x=tx*T;player.y=sy*T-player.h-.01;player.vx=player.vy=player.stepOffset=0;player.invulnerable=3;updateCamera(0,true);status('Você voltou ao local do acidente.');}
  // Arquipélago dos Vigias (js/sky-world.js): observatório, ninho do chefe e a Pedra dos Ventos mais perto
  if(action==='sky'||action==='skynest'||action==='skystone'){const w=world,o=w.skyObservatory,n=w.skyNest,ps=w.skyStones||[];
   const near=ps.slice().sort((a,b)=>Math.abs(a.x*T-player.cx)-Math.abs(b.x*T-player.cx))[0];
   const spot=action==='sky'?(o&&[o.cx+8,o.floor+7]):action==='skynest'?(n&&[n.cx-n.R+6,n.floor]):(near&&[near.x+6,near.y]);
   if(!spot){status(action==='skystone'?'Construa três Pedras dos Ventos lado a lado para ativar uma corrente.':'Este mundo não tem céu (é pequeno demais).');return;}
   player.x=spot[0]*T;player.y=spot[1]*T-player.h-.01;player.vx=player.vy=player.stepOffset=0;player.invulnerable=3;updateCamera(0,true);
   status(action==='sky'?'Você está no observatório dos Vigias.':action==='skynest'?'Você está na beira do Ninho da Tempestade.':'Você está ao lado de uma Pedra dos Ventos.');}
  if(action==='day')time(.20);if(action==='night')time(.70);if(action==='dusk')time(.48);
  if(action==='heal'){player.hp=100;status('Vida restaurada.');}
  if(action==='weather'){
   const type=weatherSelect.value,power=+overlay.querySelector('#admin-weather-power').value,secs=+overlay.querySelector('#admin-weather-time').value;
   setWeatherEvent(game,type,secs,power);
   const biome=world.biomeAt(Math.floor(player.cx/T));
   if(type==='sandstorm'&&biome!==BIOME.DESERT)status('Tempestade de areia acionada, mas a areia no ar só aparece no deserto.');
   else if(type==='tornado')status('Tornado acionado do lado do jogador. Feche o painel para ver.');
   else status((WEATHER_NAMES[type]||type)+' acionado.');
   showWeather();
  }
  if(action==='weather-add'){
   const type=weatherSelect.value,power=+overlay.querySelector('#admin-weather-power').value,secs=+overlay.querySelector('#admin-weather-time').value;
   addWeatherLayers(game,type,secs,power);
   status('Somado: '+weatherLabel(game.weather)+'.');
   showWeather();
  }
  if(action==='weather-calm'){setWeatherEvent(game,'calm',99999);status('Tempo limpo. O clima fica assim até você mandar outro.');showWeather();}
  if(action==='thunder'){const w=game.weather??=createWeather();w.flash=1;game.crashAudio?.thunder(.3,.75);status('Relâmpago!');}
  if(action==='item'&&!itemButton.disabled&&ITEM_DEFS[selectedId]){const n=itemAmount();amount.value=String(n);give(selectedId,n);}
  if(action==='kit'){let missing=0;for(const id of [ITEM.WOOD_SWORD,ITEM.WOOD_PICKAXE,ITEM.WOOD_AXE,ITEM.WOOD_SHOVEL,ITEM.WOOD_HAMMER])missing+=game.inventory.add(id,1);status(missing?'Inventário cheio: parte do kit não coube.':'Espada, picareta, machado, pá e martelo recebidos.');}
  if(action==='clear'){
   if(typeof NET!=='undefined'&&NET.guest){netRelay({k:'adminClearMobs'},NET.hostCid);status('Removendo todas as criaturas…');}
   else{const n=adminClearMobs(game);status(n+' criaturas removidas, sem gerar drops.');}
  }
  if(action==='spawn'){
   const kind=overlay.querySelector('#admin-mob').value;
   const hostile=WILDLIFE[kind]?!!WILDLIFE[kind].hostile:kind!=='pig'&&kind!=='cubepig';
   if(game.mobs.filter(m=>!!m.hostile===hostile).length>=(hostile?MONSTER_LIMIT:PIG.maximoNoMundo)){status('Limite de criaturas atingido.');return;}
   let placed=false;
   for(const d of [5,-5,7,-7,9,-9]){
    const tx=Math.floor(player.cx/T)+d;if(tx<1||tx>=world.w-2)continue;
    for(let ty=Math.floor((player.y+player.h)/T)-4;ty<Math.floor((player.y+player.h)/T)+7;ty++){
     if(!world.inBounds(tx,ty)||!world.isSolid(tx,ty))continue;
     const m=WILDLIFE[kind]?new Wildlife(kind,tx*T,0):kind==='pig'||kind==='cubepig'?new Pig(tx*T,0):new Monster(kind,tx*T,0);m.y=ty*T-m.h-.01;if(kind==='cubepig')m.skin=1;
     if(m.collides(world,m.x,m.y)||game.mobs.some(o=>Math.abs(o.cx-m.cx)<24&&Math.abs(o.cy-m.cy)<40))continue;
     if(hostile&&!monsterAllowed(game,m.cx,m.cy,kind))continue;
     game.mobs.push(m);placed=true;break;
    }if(placed)break;
   }
   status(placed?'Criatura criada próximo ao jogador.':'Sem local válido. Canibal, morcego e dinamiteiro precisam de noite ou caverna.');
  }
 });
}
initAdmin();

function adminEnterArena(g){
 const a=g.adminArena;if(!a||a.worldSeed!==g.world.seed)return false;
 const p=g.player;if(g.mount)dismountElephant(g);p.crouching=false;p.h=PLAYER_H;p.seat=null;
 p.x=(a.x0+a.width/2)*T-p.w/2;p.y=a.floor*T-p.h-.01;p.vx=p.vy=p.stepOffset=0;p.onGround=true;p.invulnerable=Math.max(3,p.invulnerable||0);
 p.dropTimer=0;p.climbing=false;p.wallGrab=null;cancelTool(g);g.mining.progress=0;updateCamera(0,true);
 g.map?.reveal(Math.floor(p.cx/T),a.floor,MAP_REVEAL_RADIUS);return true;
}
function adminBuildArena(g,origin=g.player,enter=true){
 const w=g.world,width=Math.min(192,w.w-12),height=48;if(width<80||w.h<80)return null;
 const x0=clamp(Math.floor(origin.cx/T)-Math.floor(width/2),6,w.w-width-6),x1=x0+width-1;
 let surface=w.h-10;for(let x=x0;x<=x1;x++)surface=Math.min(surface,w.surface[x]||w.h-10);
 const floor=clamp(Math.min(Math.floor((origin.y+origin.h)/T)-30,surface-18),height+8,w.h-12),top=floor-height;
 for(let x=x0;x<=x1;x++)for(let y=top;y<=floor+8;y++){
  const i=y*w.w+x;
  if(w.water[i]){w.water[i]=0;w.wakeWater?.(x,y);}if(w.hasLava?.(x,y))w.setLavaLevel(x,y,0);
  w.setWall(x,y,WALL.NONE);w.setTile(x,y,y>=floor&&y<floor+3?TILE.STONE_BRICK:TILE.AIR);
 }
 // Pilares curtos nas extremidades; o centro fica totalmente livre para os chefes voadores.
 for(const x of [x0,x1])for(let y=floor-7;y<floor;y++)w.setTile(x,y,TILE.STONE_BRICK);
 for(let x=x0+8;x<x1-4;x+=16)w.setTile(x,floor-1,TILE.TORCH);
 g.mobs=g.mobs.filter(m=>m.cx<x0*T||m.cx>(x1+1)*T||m.cy<top*T||m.cy>(floor+8)*T);
 if(g.boss&&!g.mobs.includes(g.boss))g.boss=null;
 g.adminArena={x0,x1,width,top,floor,worldSeed:w.seed};w.lightDirty=w.waterLightDirty=true;
 if(enter)adminEnterArena(g);
 if(enter&&typeof NET!=='undefined'&&NET.isHost){netFlushTiles();netSendMobs();netRelay({k:'adminArenaReady',arena:g.adminArena,owner:NET.cid});}
 return g.adminArena;
}
window.addEventListener('DOMContentLoaded',()=>{
 const relay=netOnRelay;netOnRelay=function(from,d){
  if(NET.isHost&&d?.k==='adminClearMobs'){
   if(!NET.peers.get(from)?.seen)return;
   adminClearMobs(game);return;
  }
  if(NET.guest&&from===NET.hostCid&&d?.k==='adminMobsCleared'){
   if(game.mount)dismountElephant(game);
   if(game.inventoryUI.container?.source?.mount)game.inventoryUI.closeContainer();
   resetFishing(game);game.mobs=[];game.boss=null;game.spiderLasso=null;game.player.pullT=0;
   const status=document.querySelector('#admin-status');if(status)status.textContent=d.count+' criaturas removidas, sem gerar drops.';return;
  }
  if(NET.isHost&&d?.k==='adminArenaBuild'){
   const p=NET.peers.get(from);if(!p?.seen)return;
   if(performance.now()-(p.arenaRequestAt||-10000)<3000)return;p.arenaRequestAt=performance.now();
   const arena=adminBuildArena(game,p,false);netFlushTiles();netSendMobs();netRelay({k:'adminArenaReady',arena,owner:from});return;
  }
  if(NET.guest&&from===NET.hostCid&&d?.k==='adminArenaReady'){
   game.adminArena=d.arena;
   if(d.arena){const a=d.arena,w=game.world;for(let x=a.x0;x<=a.x1;x++)for(let y=a.top;y<=a.floor+8;y++){const i=y*w.w+x;w.water[i]=0;if(w.lava)w.lava[i]=0;}w.waterLightDirty=w.lightDirty=true;}
   if(d.owner===NET.cid){if(d.arena)adminEnterArena(game);const status=document.querySelector('#admin-status');if(status)status.textContent=d.arena?'Arena compartilhada criada. Você está no centro.':'Sem espaço para a arena.';}return;
  }
  return relay(from,d);
 };
});

// Teleporte do admin: leva o jogador ao tile clicado no mapa. Procura, perto do ponto, um lugar
// onde o corpo caiba com chão embaixo (acima primeiro, depois abaixo); se não achar, vai para a
// superfície daquela coluna. Devolve false se o ponto está fora do mundo.
function adminTeleport(g, tx, ty) {
  const w = g.world, p = g.player;
  if (tx < 1 || tx >= w.w - 1 || ty < 0 || ty >= w.h) return false;
  if (g.mount) dismountElephant(g);
  if (p.crouching) { p.crouching = false; p.h = PLAYER_H; }
  const x = tx * T + (T - p.w) / 2;
  const fits = (y) => y > 2 && y < w.h - 2 && w.isSolid(tx, y + 1) && !p.collides(w, x, (y + 1) * T - p.h - 0.01);
  let floor = -1;
  for (let d = 0; d <= 60 && floor < 0; d++) {
    if (fits(ty - d)) floor = ty - d;
    else if (fits(ty + d)) floor = ty + d;
  }
  if (floor < 0) floor = w.surface[tx] - 1;
  p.x = x; p.y = (floor + 1) * T - p.h - 0.01;
  p.vx = p.vy = 0; p.stepOffset = 0; p.invulnerable = Math.max(p.invulnerable || 0, 1);
  cancelTool(g); g.mining.progress = 0;
  g.map.reveal(tx, floor, MAP_REVEAL_RADIUS);
  updateCamera(0, true);
  w.lightDirty = true;
  toast(`Teleportado para X ${tx}  Y ${floor}`);
  return true;
}
