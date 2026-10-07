'use strict';

const guideFold=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const guideEsc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function guideCategory(d){return d.fishingRod||d.fishingBait||d.fishingCatch?'Pesca':d.referenceGame?'Itens de brincadeira':d.ferramenta||d.dano||d.arco||d.tridente||d.acessorio||d.roupa?'Equipamentos':d.cura?'Alimentos e cura':d.place!=null||d.parede!=null?'Construção':'Materiais';}
function guideBuildIndex(){
 const entries=ITEM_DEFS.map((d,id)=>d?.name?{id,name:d.name,def:d,category:guideCategory(d),sources:[],recipes:[],uses:[]}:null).filter(Boolean),byId=new Map(entries.map(e=>[e.id,e]));
 const add=(id,kind,title,text)=>{const e=byId.get(id);if(e&&!e.sources.some(s=>s.title===title&&s.text===text))e.sources.push({kind,title,text});};
 const lootNames={village:'aldeias',cabin:'cabanas',mine:'minas antigas',dungeon:'masmorras',camp:'acampamentos subterrâneos',tower:'torres',well:'poços',pyramid:'pirâmides do deserto',igloo:'iglus da tundra',temple:'templos',hunter:'abrigos de caçadores',ruin:'ruínas e bunkers',tribe:'ruínas tribais',ocean:'ruínas do oceano',shipwreck:'navios naufragados',vigia:'ruínas dos Vigias nas profundezas',ossario:'ossários das profundezas',celeste:'ruínas das ilhas celestes',ninho:'ninhos das ilhas celestes',expedicao:'expedição no ninho da Fiandeira',observatorio:'observatório enterrado do Casco de Ferro',geodo:'cavernas de geodo seladas'};
 const amount=(lo,hi)=>lo===hi?String(lo):lo+'–'+hi;
 for(const [kind,d] of Object.entries(WILDLIFE))for(const [id,lo,hi,chance=1] of d.drops||[])add(id,'drop',d.name,`${d.where||BIOME_NAMES[d.biome]||'Explore os habitats desta criatura'}. ${kind==='shark'?'Carregue o corpo com F, arremesse com Q para fora da água e limpe com o botão direito usando a faca do tigre:':'Ao derrotar:'} ${amount(lo,hi)} unidade(s) · ${Math.round(chance*100)}% de chance.`);
 for(const d of Object.values(WILDLIFE))if(d.drop!=null)add(d.drop,'drop',d.name,`${d.where||BIOME_NAMES[d.biome]||'Habitat desta criatura'}. Obtido ao derrotar esta criatura.`);
 for(const d of Object.values(MONSTERS))if(d.drop!=null)add(d.drop,'drop',d.name,'Obtido ao derrotar esta criatura.');
 for(const [key,table] of Object.entries(LOOT_TABLES))for(const [id,lo,hi,chance=1] of table)add(id,'chest','Baús de '+(lootNames[key]||key),`${amount(lo,hi)} unidade(s) · ${Math.round(chance*100)}% de chance por sorteio do baú. O conteúdo varia.`);
 for(const part of WRECK_LAYOUT)for(const [id,count] of part.loot)add(id,'chest','Destroços do avião: '+part.name,`Vasculhe com o botão direito. ${count} unidade(s) no saque inicial; recolhido apenas uma vez.`);
 for(const npc of NPC_PROFESSIONS)for(const [kind,rows] of [['Troca',npc.trades||[]],['Missão',npc.quests||[]]])for(const r of rows)for(const [id,count] of r.reward||[])add(id,'npc',`${kind} com ${npc.name}: ${r.name||r.title}`,`${count} unidade(s). Entregue ${(r.cost||[]).map(([i,n])=>n+' '+ITEM_DEFS[i].name).join(', ')}.${r.level?' Exige patente '+(NPC_RANKS[r.level]?.name||r.level)+'.':''}`);
 const natural={
  DIRT:'Solo abaixo da grama em vários biomas.',GRASS:'Superfície das florestas e campos.',STONE:'Subsolo e cavernas em toda a ilha.',TRUNK:'Troncos das árvores na superfície.',SAND:'Praias e deserto.',MUD:'Margens de água e selva.',SNOW:'Superfície da tundra.',ICE:'Regiões geladas.',CACTUS:'Superfície do deserto.',SANDSTONE:'Camadas de arenito sob o solo e deserto.',
  COAL_ORE:'Veios subterrâneos em várias profundidades.',COPPER_ORE:'Veios no subsolo, principalmente antes das camadas mais profundas.',IRON_ORE:'Veios a partir de cerca de 45% da altura do mundo; maiores concentrações nas profundezas.',SILVER_ORE:'Veios abaixo de cerca de 55% da altura do mundo.',GOLD_ORE:'Veios raros nas profundezas, abaixo de cerca de 78% da altura do mundo.',AMETHYST_ORE:'Cavernas de cristal, abaixo de cerca de 40% da altura do mundo.',SULFUR_ORE:'Cavernas de magma nas camadas profundas.',
  MOSS_STONE:'Grutas úmidas subterrâneas.',MYCELIUM_STONE:'Cavernas de micélio.',FROZEN_STONE:'Cavernas sob a tundra.',MAGMA_STONE:'Cavernas profundas de magma.',CRYSTAL:'Cavernas de cristal.',GLOW_CAP:'Grutas úmidas e cavernas de micélio.',NEST_GLOW_CAP:'Ninho da Fiandeira.',
  DEEPSTONE:'Faixa mais profunda do mundo.',BASALT:'Região profunda do Coração da Ilha.',MAGNETITE:'Região magnética das profundezas.',AMBER:'Depósitos nas profundezas.',FOSSIL:'Ossários e rochas fossilizadas nas profundezas.',OBSIDIAN:'Região de magma; também é formada quando água encontra lava.',
  SKY_GRASS:'Superfície das ilhas celestes.',SKY_SOIL:'Solo das ilhas celestes.',SKYSTONE:'Rocha das ilhas celestes.',CLOUD:'Bancos e pontes de nuvem no céu.',RAIN_CLOUD:'Nuvens de chuva no céu.',WIND_CRYSTAL:'Cristais das ilhas celestes.',SKY_FLOWER:'Jardins das ilhas celestes.',
  COBWEB:'Teias em cavernas e no ninho da Fiandeira.',CORAL_BRANCH:'Recifes do oceano.',CORAL_FAN:'Recifes do oceano.',CORAL_BRAIN:'Recifes do oceano.',LILYPAD:'Superfície de lagoas e rios.',SEAWEED:'Fundo de rios e oceano.',MARBLE:'Ruínas dos Vigias nas ilhas celestes.',MARBLE_GOLD:'Ruínas dos Vigias nas ilhas celestes.',MARBLE_PILLAR:'Ruínas dos Vigias nas ilhas celestes.',TWIG_NEST:'Ninhos das aves nas ilhas celestes.',EMBER_LILY:'Margens de lava na faixa profunda do mundo.',STEAM_VENT:'Gêiseres na região profunda do mundo.'
 };
 const tools={picareta:'picareta',pa:'pá',machado:'machado',broca:'Broca de Quitina'};
 for(const [key,where] of Object.entries(natural)){const d=TILE_DEFS[TILE[key]];if(d?.drop!=null)add(d.drop,'gather',d.name,where+(d.ferramenta?' Quebre com '+(tools[d.ferramenta]||d.ferramenta)+'.':' Quebre ou recolha o bloco.'));}
 const harvestNames={grass:'capim',fern:'samambaias',vine:'cipós',skyGrass:'mato das ilhas celestes',skyVine:'cipós das ilhas celestes',coreGrass:'filamentos minerais do Coração',coreHang:'raízes luminosas do Coração',coreFungus:'fungos do Coração',coreCrystal:'cristais do Coração'};
 for(const [key,d] of Object.entries(ENV_HARVEST))if(d.item!=null)add(d.item,'gather',d.direito?'Achados do chão':'Coleta de '+(harvestNames[key]||(key.startsWith('reef')?'corais e conchas do recife':'vegetação')),`${d.direito?'Passe o cursor sobre o item no chão (brilha de leve) e use o botão direito.':d.lamina?'Corte com uma lâmina ou clique para colher.':'Clique para colher.'} ${d.count||1}${d.countMax?'-'+d.countMax:''} unidade(s) por coleta.`);
 for(const [kind,id] of Object.entries(NET_CATCH)){const d=WILDLIFE[kind]||AQUATIC[kind];add(id,'gather','Captura com puçá',`Capture ${d?.name||'peixes pequenos e mansos'} em ${d?.where||BIOME_NAMES[d?.biome]||'águas da ilha'}. Use a puçá perto da criatura.`);}
 add(ITEM.INSECT,'gather','Insetos na vegetação','Podem sair ao cortar vegetação. Capture com a puçá.');
 for(const d of Object.values(AQUATIC))if(d.fishingItem!=null)add(d.fishingItem,'gather','Pesca: '+d.name,`Vive em ${d.habitat==='mar'?'oceanos':d.habitat==='rio'?'rios e lagos':'lagos subterrâneos'}. Use ${d.fishingTier===3?'isca luminosa':d.fishingTier>=2?'isca aromática ou luminosa':'qualquer isca'}. Clique na água para lançar. Aguarde a boia mergulhar e clique para fisgar. Segure para puxar, solte nas arrancadas e aproveite a recuperação. A barra mostra captura e tensão; uma linha frouxa também deixa o peixe escapar.`);
 add(ITEM.CRITTER_DRAGONFLY,'gather','Libélulas','Capture com a puçá perto de água durante o dia.');
 for(const r of craftRecipes()){
  for(const id of r.result.variants||[r.result.item])byId.get(id)?.recipes.push(r);
  for(const n of r.items)byId.get(n.item)?.uses.push(r);
 }
 const manual={EMERGENCY_AXE:'Encontrado na fuselagem do avião no início da aventura.',WATER:'Encha recipientes em água; há também receitas com neve, gelo e cacto.',BUCKET_WATER:'Use um balde vazio em uma fonte de água.',IRON_BUCKET_WATER:'Use um balde de ferro vazio em uma fonte de água.',BUCKET_LAVA:'Use um balde de ferro vazio em lava.',SILK:'Recolha teias e seda no ninho da Fiandeira.'};
 for(const [key,text] of Object.entries(manual))if(ITEM[key]!=null)add(ITEM[key],'gather','Exploração e uso',text);
 for(const e of entries)e.search=guideFold(e.name+' '+e.category+' '+(e.def.referenceGame||'')+' '+(e.def.descricao||'')+' '+e.sources.map(s=>s.title).join(' '));
 return {entries,byId};
}

const GUIDE_CATEGORIES=['Todos','Materiais','Construção','Equipamentos','Pesca','Alimentos e cura','Itens de brincadeira'];
// Compartilha moldura, paleta, tipografia, abas e cartões do bestiário.
const ITEM_GUIDE_CSS=BESTIARY_CSS.replaceAll('#bestiary','#item-guide').replaceAll('bx-','ig-')+`
#item-guide:not([open]){display:none}
#item-guide .ig-top{flex-wrap:nowrap;gap:16px}#item-guide h2{font-size:20px}#item-guide .ig-sub{max-width:260px}
#item-guide .ig-searchbox{flex:1;min-width:170px}#item-guide label{font-size:9px;letter-spacing:1px;color:#e0a44a}#item-guide input{display:block;width:100%;margin:5px 0 0;padding:9px 10px;border:0;box-shadow:0 0 0 2px #0a0c0f,inset 0 2px 0 #10151a;background:#151b22;color:#efe6d2;font:13px monospace}#item-guide input:focus{outline:2px solid #e0a44a;outline-offset:1px}#item-guide .ig-count{margin:4px 0 0;color:#8b96a0;font:11px monospace}
#item-guide .ig-tabs button{font-size:9px}#item-guide .ig-grid{grid-template-columns:repeat(auto-fill,minmax(108px,1fr))}
#item-guide .ig-row{min-width:0;min-height:104px}#item-guide .ig-card .ig-icon{margin:14px 0;transform:scale(1.5)}#item-guide .ig-card .nm{display:block;width:100%;text-align:center}#item-guide .ig-card .ct{font-size:8px}
#item-guide .ig-icon{display:inline-block;flex-shrink:0;width:32px;height:32px;background-image:var(--atlas);background-size:var(--atlas-w) 32px;background-position:calc(var(--i) * -32px) 0;image-rendering:pixelated}
#item-guide .ig-stage{height:200px;display:grid;place-items:center;background:radial-gradient(ellipse at 50% 80%,#3a4450,#262d35 70%);border:3px solid #20252e;box-shadow:0 0 0 3px #0a0c0f,0 0 0 6px #3a434c,0 0 0 9px #0a0c0f}
#item-guide .ig-stage{flex-shrink:0;min-height:200px}#item-guide .ig-info{flex-shrink:0}#item-guide .ig-stage>.ig-icon{transform:scale(4)}#item-guide .ig-stage .tag{color:#ffd27a}
#item-guide .ig-title{margin:0 0 14px}#item-guide .ig-tag{font:12px monospace;color:#9aa3a9;margin:4px 0}#item-guide .ig-description{font:13px/1.5 monospace;color:#c9c1ad;margin:0 0 14px}#item-guide h4{font:10px Silkscreen,monospace;letter-spacing:2px;color:#e0a44a;margin:22px 0 9px}
#item-guide .ig-source,#item-guide .ig-recipe{padding:9px 10px;margin:0 0 10px;background:#1f252c;box-shadow:0 0 0 2px #0a0c0f;font:12px/1.5 monospace}#item-guide .ig-source strong,#item-guide .ig-recipe strong{font-weight:400;color:#e7d5aa}#item-guide .ig-source p{margin:5px 0 0;color:#9daab1}#item-guide .ig-links{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0}#item-guide .ig-link{display:flex;align-items:center;gap:6px;padding:4px 8px 4px 4px;font:12px monospace;text-align:left;background:#1f252c}#item-guide .ig-link .ig-icon{zoom:.75}#item-guide .ig-empty{color:#8b96a0;font:13px/1.5 monospace}#item-guide .ig-stats span{padding:7px 9px;background:#1f252c;box-shadow:0 0 0 2px #0a0c0f;font:11px monospace;color:#c9c1ad}
@media(max-width:760px){#item-guide .ig-top{flex-wrap:wrap;gap:10px}#item-guide .ig-top>div:first-child{flex:1}#item-guide .ig-searchbox{order:3;flex-basis:100%}#item-guide .ig-tabs{padding:0 6px;overflow-x:auto;flex-shrink:0}#item-guide .ig-tabs button{flex:0 0 auto;min-width:125px;font-size:8px;white-space:nowrap}#item-guide .ig-main{display:flex;flex-direction:column;overflow:auto}#item-guide .ig-grid{flex-shrink:0;max-height:250px;overflow:auto;grid-template-columns:repeat(auto-fill,minmax(95px,1fr))}#item-guide .ig-side{flex-shrink:0}#item-guide .ig-stage{height:170px;min-height:170px}#item-guide .ig-foot{font-size:10px}}
`;
const ItemGuide={
 init(){
  if(this.dialog)return;
  const style=document.createElement('style');style.textContent=ITEM_GUIDE_CSS;document.head.append(style);
  this.dialog=document.createElement('dialog');this.dialog.id='item-guide';this.dialog.setAttribute('aria-labelledby','ig-title');
  this.category='Todos';
  this.dialog.innerHTML=`<header class="ig-top"><div><h2 id="ig-title">Guia da ilha</h2><p class="ig-sub">Tudo que você pode encontrar em Valdoria.</p></div><div class="ig-searchbox"><label for="ig-search">Pesquisar item ou criatura</label><input id="ig-search" type="search" placeholder="Ex.: ferro, vendaval, tigre…" autocomplete="off"><p class="ig-count" aria-live="polite"></p></div><button class="ig-close" aria-label="Fechar guia">Fechar <kbd>G</kbd></button></header><nav class="ig-tabs" aria-label="Categorias"></nav><div class="ig-main"><div class="ig-grid ig-list" aria-label="Itens"></div><article class="ig-side ig-detail" aria-live="polite"></article></div><footer class="ig-foot"><kbd>Q</kbd><kbd>E</kbd> trocar de aba · <kbd>←</kbd><kbd>→</kbd> escolher · clique nos ingredientes para consultar</footer>`;
  document.body.append(this.dialog);
  this.dialog.addEventListener('cancel',e=>{e.preventDefault();this.close();});
  this.dialog.querySelector('.ig-close').onclick=()=>this.close();
  this.dialog.querySelector('input').oninput=()=>this.renderList();
  this.dialog.addEventListener('click',e=>{const b=e.target.closest('[data-item]'),tab=e.target.closest('[data-category]');if(b)this.select(Number(b.dataset.item));else if(tab){this.category=tab.dataset.category;this.renderList();this.dialog.querySelector('.ig-tabs .on')?.focus();}});
  this.dialog.addEventListener('keydown',e=>{
   const editing=e.target.matches('input');
   if(e.code==='Escape'||(!editing&&e.code==='KeyG')){e.preventDefault();this.close();}
   else if(!editing&&['KeyQ','KeyE'].includes(e.code)){e.preventDefault();const i=GUIDE_CATEGORIES.indexOf(this.category),n=GUIDE_CATEGORIES.length;this.category=GUIDE_CATEGORIES[(i+(e.code==='KeyQ'?n-1:1))%n];this.renderList();this.dialog.querySelector('.ig-tabs .on')?.focus();}
   else if(!editing&&e.code.startsWith('Arrow')){
    e.preventDefault();const grid=this.dialog.querySelector('.ig-grid'),cols=getComputedStyle(grid).gridTemplateColumns.split(' ').length,i=this.visible.findIndex(e=>e.id===this.sel),step={ArrowLeft:-1,ArrowRight:1,ArrowUp:-cols,ArrowDown:cols}[e.code],next=this.visible[clamp(i+step,0,this.visible.length-1)];
    if(next){this.select(next.id);grid.querySelector(`[data-item="${next.id}"]`)?.scrollIntoView({block:'nearest'});}
   }
   e.stopPropagation();
  });
 },
 open(g){
  this.init();this.g=g;this.index=guideBuildIndex();g.inventoryUI.close();g.mapUI.open=false;g.npcOpen=true;
  input.keys.clear();input.mouse.left=input.mouse.right=input.mouse.rawLeft=false;cancelTool(g);
  this.dialog.style.setProperty('--atlas',`url(${NpcServices.atlasUrl()})`);this.dialog.style.setProperty('--atlas-w',`${ITEM_DEFS.length*32}px`);
  if(!this.dialog.open)this.dialog.showModal();this.renderList();this.dialog.querySelector('input').focus();
 },
 close(){this.dialog?.close();if(this.g)this.g.npcOpen=false;input.keys.clear();input.mouse.left=input.mouse.right=input.mouse.rawLeft=false;},
 icon(id){return `<i class="ig-icon" style="--i:${id}" aria-hidden="true"></i>`;},
 link(id,count=''){const e=this.index.byId.get(id);return e?`<button class="ig-link" data-item="${id}">${this.icon(id)}${guideEsc(e.name)}${count?' ×'+count:''}</button>`:'';},
 renderList(){
  const q=guideFold(this.dialog.querySelector('input').value),category=this.category;
  const rank=e=>guideFold(e.name)===q?0:guideFold(e.name).startsWith(q)?1:2;
  const list=this.index.entries.filter(e=>(category==='Todos'||e.category===category)&&q.split(/\s+/).every(word=>e.search.includes(word))).sort((a,b)=>rank(a)-rank(b)||a.name.localeCompare(b.name,'pt-BR'));
  this.visible=list;this.dialog.querySelector('.ig-count').textContent=`${list.length} de ${this.index.entries.length} itens`;
  this.dialog.querySelector('.ig-tabs').innerHTML=GUIDE_CATEGORIES.map(c=>`<button data-category="${c}" class="${c===category?'on':''}" aria-pressed="${c===category}">${c==='Alimentos e cura'?'Comida e cura':c}<span>${this.index.entries.filter(e=>c==='Todos'||e.category===c).length}</span></button>`).join('');
  this.dialog.querySelector('.ig-list').innerHTML=list.length?list.map(e=>`<button class="ig-card ig-row ${e.id===this.sel?'on':''}" data-item="${e.id}" aria-pressed="${e.id===this.sel}" title="${guideEsc(e.name)}">${this.icon(e.id)}<span class="nm">${guideEsc(e.name)}</span>${e.recipes.length?'<span class="ct">'+e.recipes.length+' receita'+(e.recipes.length>1?'s':'')+'</span>':''}</button>`).join(''):'<p class="ig-empty">Nenhum item encontrado. Tente outro nome.</p>';
  if(!list.length){this.dialog.querySelector('.ig-detail').innerHTML='<p class="ig-empty">Sua busca não encontrou itens.</p>';return;}
  if(!list.some(e=>e.id===this.sel))this.sel=list[0].id;this.renderDetail();this.mark();
 },
 mark(){this.dialog.querySelectorAll('.ig-row').forEach(b=>{const on=Number(b.dataset.item)===this.sel;b.setAttribute('aria-pressed',String(on));b.classList.toggle('on',on);});},
 select(id){if(!this.index.byId.has(id))return;this.sel=id;this.renderDetail();this.mark();this.dialog.querySelector('.ig-detail').scrollTop=0;},
 renderDetail(){
  const e=this.index.byId.get(this.sel),d=e.def,stats=[];
  if(d.dano)stats.push('Dano: '+d.dano);if(d.cura)stats.push('Cura: '+d.cura);if(d.ferramenta)stats.push('Ferramenta: '+({pa:'pá',broca:'broca',picareta:'picareta',machado:'machado',martelo:'martelo'}[d.ferramenta]||d.ferramenta));if(d.acessorio)stats.push('Acessório equipado');if(d.roupa)stats.push('Roupa / armadura');
  const recipe=r=>`<div class="ig-recipe"><strong>${guideEsc(r.name)}</strong><div class="ig-tag">${guideEsc(recipeStationName(r))} · produz ${r.result.count} unidade(s)</div><div class="ig-links">${r.items.map(n=>this.link(n.item,n.count)).join('')}</div></div>`;
  this.dialog.querySelector('.ig-detail').innerHTML=`<div class="ig-stage"><span class="tag">${e.category}</span>${this.icon(e.id)}</div><div class="ig-info"><div class="ig-title"><div><h3>${guideEsc(e.name)}</h3><span class="ig-tag">${e.category}</span></div></div><p class="ig-description">${guideEsc(d.descricao||'Consulte as fontes e receitas abaixo para obter este item.')}</p>${d.referenceGame?`<p class="ig-description">Inspiração: ${guideEsc(d.referenceGame)} · Nome e arte originais de Valdoria.</p>`:''}<div class="ig-stats">${stats.map(s=>`<span>${guideEsc(s)}</span>`).join('')}</div><h4>Onde encontrar</h4>${e.sources.length?e.sources.map(s=>`<div class="ig-source"><strong>${guideEsc(s.title)}</strong><p>${guideEsc(s.text)}</p></div>`).join(''):`<p class="ig-empty">${e.recipes.length?'Obtido por fabricação. Veja as receitas abaixo.':'Não há uma fonte de coleta, drop ou baú registrada para este item.'}</p>`}<h4>Como fabricar</h4>${e.recipes.length?e.recipes.map(recipe).join(''):'<p class="ig-empty">Este item não possui receita de fabricação.</p>'}${e.uses.length?'<h4>Usado para fabricar</h4><div class="ig-links">'+[...new Set(e.uses.map(r=>r.result.item))].map(id=>this.link(id)).join('')+'</div>':''}</div>`;
 }
};
