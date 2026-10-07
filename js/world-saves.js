'use strict';

// Os arquivos guardam o terreno completo: carregar nunca depende de gerar outra semente.
const SAVE_RUNTIME_KEYS=new Set(['lightCanvas','lightCtx','lightImage','skyLight','blockLight','decorCache','atlas','trunkArt','netBuf','netMirror','netId','_lavaView']);
const SAVE_GAME_RUNTIME=new Set(['world','player','inventory','map','mapUI','inventoryUI','intro','crashAudio','lavaEffects','fishing','fishingLeft','fishingWasPulling','fishingPullSync','fishingCharges','particles','toast','toolAction','toolEffects','fps','paused','adminOpen','npcOpen','adminGod','adminFly','adminFreezeTime','adminFreezeWeather','adminTimeScale','adminNightVision','adminShowCoords','shake','hitStop','target','mining','clockFrame','rightWasDown']);
// Enfeites e partículas são reconstruídos pelo cenário; ler seus sprites força uma espera da GPU.
SAVE_GAME_RUNTIME.add('environment');

function saveBytes(array){
 const bytes=new Uint8Array(array.buffer,array.byteOffset,array.byteLength),parts=[];
 for(let i=0;i<bytes.length;i+=32768)parts.push(String.fromCharCode(...bytes.subarray(i,i+32768)));
 return btoa(parts.join(''));
}
function saveGraph(root,transport=null){
 const seen=new Map();let sequence=0;
 const encode=value=>{
  if(typeof value==='number'&&!Number.isFinite(value))return {$number:String(value)};
  if(value===null||typeof value==='string'||typeof value==='boolean'||typeof value==='number')return value;
  if(typeof value!=='object'||(value instanceof Node&&!(value instanceof HTMLCanvasElement))||value instanceof CanvasRenderingContext2D||value instanceof ImageBitmap||value instanceof ImageData)return undefined;
  if(seen.has(value))return {$ref:seen.get(value)};
  const $id=++sequence;seen.set(value,$id);
  if(value instanceof HTMLCanvasElement){
   const pixels=value.getContext('2d').getImageData(0,0,value.width,value.height).data;
   if(transport)transport.push(pixels.buffer);
   return {$id,type:'canvas',w:value.width,h:value.height,data:transport?pixels:saveBytes(pixels)};
  }
  if(ArrayBuffer.isView(value)){
   // Cópia nativa única: preserva o instante do save e nunca transfere o terreno em uso.
   let copy=null;
   if(transport){
    const pool=transport.pool?.get(value.byteLength),buffer=pool?.pop()||new ArrayBuffer(value.byteLength);
    copy=new Uint8Array(buffer);copy.set(new Uint8Array(value.buffer,value.byteOffset,value.byteLength));
   }
   if(copy)transport.push(copy.buffer);
   return {$id,type:'bytes',ctor:value.constructor.name,data:copy||saveBytes(value)};
  }
  if(value instanceof Map)return {$id,type:'map',entries:[...value].map(([k,v])=>[encode(k),encode(v)]).filter(([k,v])=>k!==undefined&&v!==undefined)};
  if(value instanceof Set)return {$id,type:'set',values:[...value].map(encode).filter(v=>v!==undefined)};
  if(Array.isArray(value))return {$id,type:'array',values:value.map(v=>encode(v)??null)};
  const props={},actor=value instanceof Wildlife||value instanceof Monster;
  for(const [key,item]of Object.entries(value)){
   if(SAVE_RUNTIME_KEYS.has(key)||['__proto__','constructor','prototype'].includes(key)||(actor&&key==='def'))continue;
   const packed=encode(item);if(packed!==undefined)props[key]=packed;
  }
  return {$id,type:'object',class:value.constructor?.name||'Object',props};
 };
 return encode(root);
}
function loadGraph(root){
 const seen=new Map(),classes={World,Player,Inventory,Body,Pig,Wildlife,Monster,Villager};
 const arrays={Uint8Array,Uint16Array,Uint32Array,Int8Array,Int16Array,Int32Array,Float32Array,Float64Array,Uint8ClampedArray};
 let count=0;
 const decode=node=>{
  if(++count>4000000)throw Error('O arquivo contém dados demais para ser carregado.');
  if(node===null||typeof node!=='object')return node;
  if('$number'in node){const number=Number(node.$number);if(!['Infinity','-Infinity','NaN'].includes(node.$number))throw Error('Número inválido no mundo.');return number;}
  if('$ref'in node){if(!seen.has(node.$ref))throw Error('Referência inválida no mundo.');return seen.get(node.$ref);}
  if(!Number.isSafeInteger(node.$id)||seen.has(node.$id))throw Error('Estrutura de mundo inválida.');
  let value;
  if(node.type==='canvas'){
   if(!Number.isSafeInteger(node.w)||!Number.isSafeInteger(node.h)||node.w<1||node.h<1||node.w*node.h>16777216)throw Error('Imagem de mundo inválida.');
   const raw=atob(node.data);if(raw.length!==node.w*node.h*4)throw Error('Imagem de mundo incompleta.');
   const pixels=new Uint8ClampedArray(raw.length);for(let i=0;i<raw.length;i++)pixels[i]=raw.charCodeAt(i);
   value=makeCanvas(node.w,node.h);value.getContext('2d').putImageData(new ImageData(pixels,node.w,node.h),0,0);seen.set(node.$id,value);return value;
  }
  if(node.type==='bytes'){
   const ctor=arrays[node.ctor];if(!ctor||typeof node.data!=='string')throw Error('Camada de mundo inválida.');
   const raw=atob(node.data),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
   if(bytes.length%ctor.BYTES_PER_ELEMENT)throw Error('Camada de mundo incompleta.');
   value=new ctor(bytes.buffer);seen.set(node.$id,value);return value;
  }
  if(node.type==='array')value=[];
  else if(node.type==='map')value=new Map();
  else if(node.type==='set')value=new Set();
  else if(node.type==='object')value=classes[node.class]?Object.create(classes[node.class].prototype):{};
  else throw Error('Tipo de dado desconhecido no mundo.');
  seen.set(node.$id,value);
  if(node.type==='array')for(const v of node.values)value.push(decode(v));
  else if(node.type==='map')for(const [k,v]of node.entries)value.set(decode(k),decode(v));
  else if(node.type==='set')for(const v of node.values)value.add(decode(v));
  else{
   for(const [k,v]of Object.entries(node.props))if(!['__proto__','constructor','prototype'].includes(k))value[k]=decode(v);
   if(value instanceof Wildlife)value.def=WILDLIFE[value.kind];
   else if(value instanceof Monster)value.def=MONSTERS[value.kind];
  }
  return value;
 };
 return decode(root);
}
function rebindSave(root,from,to,seen=new Set()){
 if(root===from)return to;
 if(!root||typeof root!=='object'||ArrayBuffer.isView(root)||root instanceof Node||root instanceof CanvasRenderingContext2D||root instanceof ImageData||root instanceof ImageBitmap||seen.has(root))return root;
 seen.add(root);
 if(root instanceof Map){const entries=[...root];root.clear();for(const [k,v]of entries)root.set(rebindSave(k,from,to,seen),rebindSave(v,from,to,seen));}
 else if(root instanceof Set){const values=[...root];root.clear();for(const v of values)root.add(rebindSave(v,from,to,seen));}
 else for(const key of Object.keys(root))root[key]=rebindSave(root[key],from,to,seen);
 return root;
}

const WorldSaves={
 autosaveInterval:300000,worker:null,workerSequence:0,workerJobs:new Map(),bufferPool:new Map(),bufferWorld:null,
 endpoint:'server/world-saves.php',active:null,activeWorld:null,pending:null,loading:false,worlds:[],lastSaved:0,directory:'C:\\Users\\bagre\\Documents\\My Games\\Valdoria',error:'',
 init(g){
  this.game=g;
  this.migration=this.request('?action=migrate',{method:'POST',headers:{'X-Valdoria-Save':'1'}}).then(r=>r.json()).catch(e=>{this.migrationError=e.message;});
  this.refresh();
  this.timer=setInterval(()=>{if(this.active&&this.activeWorld===g.world&&!this.loading&&!this.pending&&!this.editingWorld&&!(typeof NET!=='undefined'&&NET.guest))this.save(false).catch(()=>{});},this.autosaveInterval);
  window.addEventListener('beforeunload',e=>{if(this.active&&this.activeWorld===g.world&&Date.now()-this.lastSaved>10000){e.preventDefault();e.returnValue='';}});
  this.ensureWorker();
  this.createSaveUI();
 },
 ensureWorker(){
  if(this.worker)return this.worker;
  const worker=this.worker=new Worker('js/world-save-worker.js?v=save-perf1');
  worker.onmessage=({data})=>{
   const job=this.workerJobs.get(data.id);if(!job)return;
   if(data.type==='recycle'){
    if(job.world===this.game.world)for(const buffer of data.buffers){let pool=this.bufferPool.get(buffer.byteLength);if(!pool)this.bufferPool.set(buffer.byteLength,pool=[]);pool.push(buffer);}
   }
   else if(data.type==='progress')job.progress(data.progress,data.label);
   else{this.workerJobs.delete(data.id);if(data.type==='error')job.reject(Error(data.error));else job.resolve(data.bytes);}
  };
  worker.onerror=event=>{event.preventDefault();for(const job of this.workerJobs.values())job.reject(Error('Não foi possível preparar o arquivo de mundo. Tente salvar novamente.'));this.workerJobs.clear();worker.terminate();this.worker=null;};
  return worker;
 },
 prepare(save,transfers,progress){
  return new Promise((resolve,reject)=>{
   const id=++this.workerSequence;
   this.workerJobs.set(id,{resolve,reject,progress,world:this.game.world});
   try{this.ensureWorker().postMessage({id,save},transfers);}catch(e){this.workerJobs.delete(id);reject(e);}
  });
 },
 async warmBuffers(){
  const g=this.game,w=g.world;
  if(this.bufferWorld!==w){this.bufferPool.clear();this.bufferWorld=w;}
  const sizes=new Map();
  for(const view of [w.tiles,w.walls,w.water,w.lava,g.map.revealed])if(view?.byteLength>=1048576)sizes.set(view.byteLength,(sizes.get(view.byteLength)||0)+1);
  const yieldTask=()=>globalThis.scheduler?.yield?globalThis.scheduler.yield():new Promise(resolve=>setTimeout(resolve,0));
  // Prepara as páginas de memória em pequenos intervalos; o primeiro save também evita
  // uma alocação grande de uma só vez na thread do jogo.
  let sliceStart=performance.now();
  for(const [size,count]of sizes){
   let pool=this.bufferPool.get(size);if(!pool)this.bufferPool.set(size,pool=[]);
   while(pool.length<count){
    const buffer=new ArrayBuffer(size),bytes=new Uint8Array(buffer);
    for(let offset=0;offset<size;offset+=262144){
     bytes.fill(0,offset,Math.min(size,offset+262144));
     if(performance.now()-sliceStart>=2){await yieldTask();sliceStart=performance.now();if(this.bufferWorld!==w)return;}
    }
    pool.push(buffer);
   }
  }
 },
 createSaveUI(){
  const style=document.createElement('style');style.textContent=`
   #world-save-overlay[hidden],#world-save-indicator[hidden]{display:none}
   #world-save-overlay{position:fixed;inset:0;z-index:10000;background:rgba(6,8,11,.88);display:grid;place-items:center;padding:24px;color:#f0ddb6;font:12px Silkscreen,monospace}
   .world-save-panel{width:min(440px,100%);box-sizing:border-box;padding:28px;background:#222b35;border:3px solid #64727e;box-shadow:0 0 0 5px #10161c}
   .world-save-panel h2{font-size:18px;color:#f0c978;margin:0 0 20px}.world-save-panel p{line-height:1.8}
   .world-save-track{height:12px;background:#10161c;border:2px solid #56616b;overflow:hidden;margin:18px 0 12px}.world-save-track span{display:block;width:0;height:100%;background:#e0a44a}
   #world-save-indicator{position:fixed;right:16px;bottom:16px;z-index:10001;max-width:calc(100vw - 32px);box-sizing:border-box;padding:12px 16px;background:rgba(19,26,34,.92);border:2px solid #9c763e;color:#f0c978;font:11px Silkscreen,monospace;pointer-events:none}
   #world-save-indicator::before{content:'';display:inline-block;width:8px;height:8px;background:#e0a44a;margin-right:10px;animation:save-pulse 1s steps(2) infinite}@keyframes save-pulse{50%{opacity:.3}}
  `;document.head.append(style);
  const overlay=this.overlay=document.createElement('div');overlay.id='world-save-overlay';overlay.hidden=true;overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-labelledby','world-save-title');
  overlay.innerHTML='<div class="world-save-panel"><h2 id="world-save-title">Salvando mundo</h2><p data-save-label>Preparando sua aventura…</p><div class="world-save-track"><span></span></div><small data-save-percent>0%</small><p>Seu progresso está sendo guardado.</p></div>';
  for(const event of ['keydown','keyup','pointerdown','pointerup','mousedown','mouseup','wheel'])overlay.addEventListener(event,e=>{e.stopPropagation();if(event!=='wheel')e.preventDefault();});
  const indicator=this.indicator=document.createElement('div');indicator.id='world-save-indicator';indicator.hidden=true;indicator.setAttribute('role','status');indicator.setAttribute('aria-live','polite');
  document.body.append(overlay,indicator);
 },
 saveProgress(progress,label){
  const percent=Math.round(progress*100);
  this.overlay.querySelector('[data-save-label]').textContent=label;
  this.overlay.querySelector('[data-save-percent]').textContent=percent+'%';this.overlay.querySelector('.world-save-track span').style.width=percent+'%';
  this.indicator.textContent=label+' · '+percent+'%';
 },
 async saveWithScreen(){
  if(this.screenSaving)return false;
  this.screenSaving=true;const paused=this.game.paused,focus=document.activeElement;this.game.paused=true;this.overlay.hidden=false;this.indicator.hidden=true;this.overlay.tabIndex=-1;this.overlay.focus();
  try{return await this.save(true);}finally{this.overlay.hidden=true;this.game.paused=paused;this.screenSaving=false;focus?.focus?.({preventScroll:true});}
 },
 status(text,error=false){
  for(const el of document.querySelectorAll('[data-save-status]')){el.textContent=text;el.classList.toggle('save-error',error);}
 },
 async request(url,options){
  const response=await fetch(this.endpoint+url,{cache:'no-store',...options});
  if(!response.ok){let message='Não foi possível acessar os mundos salvos.';try{message=(await response.json()).error||message;}catch{}throw Error(message);}
  return response;
 },
 async refresh(){
  if(this.migration)await this.migration;
  const button=Menu.root?.querySelector('[data-action="continue-worlds"]');
  try{
   const data=await(await this.request('?action=list')).json();this.worlds=data.worlds;this.directory=data.directory;this.error='';
   if(button){button.disabled=!this.worlds.length;button.querySelector('i').textContent=this.worlds.length?`${this.worlds.length} ${this.worlds.length===1?'mundo salvo':'mundos salvos'}`:'Nenhum mundo salvo';}
  }catch(e){this.error=e.message;if(button){button.disabled=true;button.querySelector('i').textContent='Salvamento indisponível';button.title=e.message;}}
  if(Menu.current()==='saved-worlds')this.renderList();
  return this.worlds;
 },
 async showList(){Menu.go('saved-worlds');this.status('Carregando seus mundos…');await this.refresh();this.renderList();},
 renderList(){
  const list=Menu.root.querySelector('#saved-world-list');if(!list||this.editingWorld&&list.querySelector('.saved-world-editor'))return;list.replaceChildren();
  for(const meta of this.worlds){
   const row=document.createElement('article');row.className='saved-world-row';row.dataset.worldId=meta.id;
   const card=document.createElement('button');card.className='btn saved-world';card.dataset.action='load-world';card.dataset.worldId=meta.id;
   const name=document.createElement('strong');name.textContent=meta.name;card.append(name);
   const detail=document.createElement('small');detail.textContent=`${({pequeno:'Pequeno',medio:'Médio',grande:'Grande'})[meta.size]||meta.w+' × '+meta.h} · Dia ${meta.day||1} · ${meta.playerName||'Aventureiro'}`;card.append(detail);
   const date=document.createElement('small');date.className='save-date';date.textContent='Último salvamento: '+new Date(meta.savedAt).toLocaleString('pt-BR');card.append(date);row.append(card);
   const actions=document.createElement('div');actions.className='saved-world-actions';
   for(const [action,label]of [['rename-world','Renomear'],['delete-world','Excluir']]){
    const button=document.createElement('button');button.type='button';button.className='btn world-tool'+(action==='delete-world'?' world-danger':'');button.dataset.action=action;button.dataset.worldId=meta.id;button.title=label;button.setAttribute('aria-label',label+' '+meta.name);
    const pixels=action==='rename-world'?['........##..','.......####.','......##+##.','.....##+##..','....##+##...','...##+##....','..##+##.....','.##+##......','.####.......','.###........','.##.........','............']:['....####....','....#..#....','.##########.','............','..#......#..','..#.#..#.#..','..#.#..#.#..','..#.#..#.#..','..#.#..#.#..','..#......#..','..########..','............'];
    button.innerHTML='<svg viewBox="0 0 12 12" width="24" height="24" fill="currentColor" shape-rendering="crispEdges" aria-hidden="true">'+pixels.flatMap((line,y)=>[...line].map((pixel,x)=>pixel==='.'?'':`<rect x="${x}" y="${y}" width="1" height="1"${pixel==='+'?' opacity=".4"':''}/>`)).join('')+'</svg>';actions.append(button);
   }
   row.append(actions);list.append(row);
  }
  this.status(this.error||(!this.worlds.length?'Nenhum mundo salvo ainda. Comece uma nova aventura.':'Escolha um mundo para continuar.'),!!this.error);
  Menu.root.querySelector('#saved-world-folder').textContent=this.directory;
 },
 async editWorld(id,kind){
  if(this.loading)return;if(this.pending)await this.pending.catch(()=>{});
  const meta=this.worlds.find(w=>w.id===id),row=[...Menu.root.querySelectorAll('.saved-world-row')].find(r=>r.dataset.worldId===id);
  if(!meta||!row)return;
  this.editingWorld=id;
  Menu.root.querySelectorAll('.saved-world-editor,.world-edit-backdrop').forEach(e=>e.remove());
  const backdrop=document.createElement('div');backdrop.className='world-edit-backdrop';row.append(backdrop);
  const form=document.createElement('form');form.className='panel saved-world-editor';form.setAttribute('role','dialog');form.setAttribute('aria-modal','true');form.setAttribute('aria-labelledby','world-edit-title');
  const head=document.createElement('header');head.className='panel-head';const heading=document.createElement('div');head.append(heading);form.append(head);
  const title=document.createElement('h2');title.id='world-edit-title';title.textContent=kind==='rename'?'Renomear mundo':'Excluir mundo?';heading.append(title);
  const caption=document.createElement('p');caption.className='world-edit-name';caption.textContent=meta.name;heading.append(caption);
  const body=document.createElement('div');body.className='world-edit-body';form.append(body);
  const label=document.createElement('label');label.htmlFor='world-edit-name';label.textContent=kind==='rename'?'Nome do mundo':'';if(kind==='rename')body.append(label);
  let field=null;
  if(kind==='rename'){
   field=document.createElement('input');field.id='world-edit-name';field.type='text';field.maxLength=48;field.required=true;field.value=meta.name;field.setAttribute('aria-label','Novo nome do mundo');body.append(field);
  }else{
   const warning=document.createElement('p');warning.textContent='O mundo e todo o progresso salvo serão apagados. Esta ação não pode ser desfeita.';body.append(warning);
  }
  const error=document.createElement('p');error.className='save-error';error.setAttribute('role','alert');error.hidden=true;body.append(error);
  const actions=document.createElement('footer');actions.className='panel-foot saved-world-actions';
  const confirm=document.createElement('button');confirm.type='submit';confirm.className='btn'+(kind==='delete'?' world-danger':'');confirm.textContent=kind==='rename'?'Salvar nome':'Excluir mundo';
  const cancel=document.createElement('button');cancel.type='button';cancel.className='btn world-edit-cancel';cancel.textContent='Cancelar';cancel.onclick=()=>{if(this.loading)return;this.editingWorld=null;form.remove();backdrop.remove();row.querySelector('[data-action="'+(kind==='rename'?'rename-world':'delete-world')+'"]').focus();};backdrop.onclick=()=>cancel.click();
  confirm.classList.add('world-edit-confirm');actions.append(cancel,confirm);form.append(actions);row.append(form);
  form.onkeydown=e=>{if(e.code==='Escape'){e.preventDefault();e.stopPropagation();cancel.click();}};
  form.onsubmit=async e=>{
   e.preventDefault();if(this.loading)return;
   const name=field?.value.trim();if(kind==='rename'&&!name){error.textContent='Digite um nome para o mundo.';error.hidden=false;field.focus();return;}
   this.loading=true;error.hidden=true;confirm.disabled=cancel.disabled=true;if(field)field.disabled=true;
   try{
    if(this.pending)await this.pending;
    const response=await this.request('?action='+kind+'&id='+encodeURIComponent(id),{method:kind==='rename'?'POST':'DELETE',headers:{'Content-Type':'application/json','X-Valdoria-Save':'1'},...(kind==='rename'?{body:JSON.stringify({name})}:{})});
    const data=await response.json();
    if(this.active?.id===id){if(kind==='rename')this.active={...this.active,...data.meta};else{this.active=null;this.activeWorld=null;this.lastSaved=0;}}
    this.editingWorld=null;await this.refresh();this.status(kind==='rename'?'Nome do mundo atualizado.':'Mundo excluído.');
    const next=Menu.root.querySelector('[data-action="'+(kind==='rename'?'rename-world':'load-world')+'"]')||Menu.root.querySelector('[data-screen="saved-worlds"] [data-action="back"]');next?.focus({preventScroll:true});
   }catch(e){error.textContent=e.message;error.hidden=false;}
   finally{this.loading=false;confirm.disabled=cancel.disabled=false;if(field)field.disabled=false;}
  };
  if(field){field.focus();field.select();}else cancel.focus();
 },
 async begin(name){
  if(this.pending)await this.pending.catch(()=>{});
  const now=new Date().toISOString();this.active={id:crypto.randomUUID(),name:(name||`Aventura de ${PLAYER_LOOK.name}`).trim().slice(0,48),createdAt:now,savedAt:now};
  this.activeWorld=this.game.world;this.lastSaved=0;
  return this.save(false);
 },
 snapshot(transport=null){
  const g=this.game,state={};
  for(const [key,value]of Object.entries(g))if(!SAVE_GAME_RUNTIME.has(key)&&typeof value!=='function')state[key]=value;
  // A primeira gravação já permite continuar direto nos destroços, sem repetir o filme.
  const p=g.player;
  const stateGraph=saveGraph({world:g.world,player:p,game:state,inventory:g.inventory,held:g.inventoryUI.held,bench:g.inventoryUI.bench,trash:g.inventoryUI.trash,mapRevealed:g.map.revealed,mapAllExplored:g.map.allExplored,look:{...PLAYER_LOOK},bestiary:Bestiary.load(),fishing:[...fishingSessions.values()].filter(s=>s.owner===fishingOwner())},transport);
  if(g.intro?.active&&g.crashSite){const props=stateGraph.props.player.props;props.x=g.crashSite.x-p.w/2;props.y=g.crashSite.y-p.h-.01;props.vx=props.vy=0;props.lockFacing=false;stateGraph.props.game.props.openingComplete=true;stateGraph.props.game.props.objective='Vasculhe a fuselagem próxima para encontrar uma ferramenta e suprimentos.';}
  const meta={...this.active,savedAt:new Date().toISOString(),w:g.world.w,h:g.world.h,seed:g.world.seed,size:g.worldSize||'pequeno',day:g.day||1,playerName:PLAYER_LOOK.name,playSeconds:Math.floor(g.clock||0)};
  return {format:'valdoria-world',version:1,meta,state:stateGraph};
 },
 async save(manual=true){
  if(!this.active||this.activeWorld!==this.game.world||(typeof NET!=='undefined'&&NET.guest))return false;
  if(this.pending){if(!manual)return this.pending;await this.pending.catch(()=>{});return this.save(manual);}
  this.pending=(async()=>{
   const activeId=this.active.id,capturedWorld=this.game.world;
   this.status('Salvando mundo…');
   this.indicator.hidden=this.screenSaving;this.saveProgress(.01,'Preparando mundo');
   // Dá tempo para pintar o indicador antes de capturar o estado.
   await new Promise(resolve=>setTimeout(resolve,32));
   await this.warmBuffers();
   if(this.active?.id!==activeId||this.game.world!==capturedWorld)return false;
   const transfers=[];transfers.pool=this.bufferPool;
   const started=performance.now(),save=this.snapshot(transfers);
   this.captureMs=performance.now()-started;
   const compressed=await this.prepare(save,transfers,(p,label)=>this.saveProgress(p,label));
   this.saveProgress(.9,'Gravando mundo');
   const response=await this.request('?action=save&id='+encodeURIComponent(save.meta.id),{method:'PUT',headers:{'Content-Type':'application/gzip','X-Valdoria-Save':'1'},body:compressed});
   const result=await response.json();if(this.active?.id!==save.meta.id)return true;
   this.active=result.meta;this.lastSaved=Date.now();this.error='';
   this.saveProgress(1,'Mundo salvo');
   this.status('Mundo salvo · '+new Date(this.lastSaved).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}));
   if(manual)toast('Mundo salvo em My Games\\Valdoria.');
   this.refresh();
   return true;
  })();
  try{return await this.pending;}catch(e){this.error=e.message;this.status('Não foi possível salvar: '+e.message,true);toast('Falha ao salvar. Seu mundo continua aberto.');throw e;}finally{this.pending=null;this.indicator.hidden=true;}
 },
 validate(data,meta){
  const w=data?.world,n=meta.w*meta.h;
  if(!(w instanceof World)||w.w!==meta.w||w.h!==meta.h||w.w<1||w.h<1||w.w>8400||w.h>2400)throw Error('Dimensões do mundo inválidas.');
  for(const key of ['tiles','walls','water'])if(!(w[key]instanceof Uint8Array)||w[key].length!==n)throw Error('O terreno salvo está incompleto.');
  if(!(w.surface instanceof Int16Array)||w.surface.length!==w.w||!(w.biome instanceof Uint8Array)||w.biome.length!==w.w)throw Error('O relevo salvo está incompleto.');
  for(const key of ['skyTop','skyGapTop','skyGapBottom'])if(!(w[key] instanceof Int32Array)||w[key].length!==w.w)throw Error('Dados de iluminação incompletos.');
  if(w.lava&&(!(w.lava instanceof Uint8Array)||w.lava.length!==n))throw Error('A camada de lava está incompleta.');
  if(!(w.waterActive instanceof Set)||!(w.touched instanceof Set)||!(w.decorCut instanceof Map)||!(data.game?.chests instanceof Map)||!(data.game?.chestPairs instanceof Map)||!(data.game?.autoDoors instanceof Set)||!data.game?.sword||!Array.isArray(data.game.mobs)||!Array.isArray(data.game.npcs))throw Error('Dados do mundo incompletos.');
  if(!(data.mapRevealed instanceof Uint8Array)||data.mapRevealed.length!==n||!(data.inventory instanceof Inventory)||!Array.isArray(data.inventory.slots))throw Error('Dados do personagem ou mapa incompletos.');
  const p=data.player;if(!(p instanceof Player)||!Number.isFinite(p.x)||!Number.isFinite(p.y))throw Error('Posição do personagem inválida.');
  for(const m of data.game.mobs||[])if((m instanceof Wildlife||m instanceof Monster)&&!m.def)throw Error('Este mundo contém uma criatura não disponível nesta versão.');
 },
 restore(data,meta){
  const g=this.game,next=data.world;
  NpcServices.close();Bestiary.close?.();resetFishing(g);g.inventoryUI.open=false;g.inventoryUI.held=null;g.inventoryUI.bench.fill(null);g.inventoryUI.closeCraft();g.inventoryUI.closeContainer();g.mapUI.open=false;
  next.skyLight=new Uint8Array(LIGHT_W*LIGHT_H);next.blockLight=new Uint8Array(LIGHT_W*LIGHT_H);next.lightCanvas=makeCanvas(LIGHT_W,LIGHT_H);next.lightCtx=next.lightCanvas.getContext('2d');next.lightImage=next.lightCtx.createImageData(LIGHT_W,LIGHT_H);
  next.decorCache=new Map();next.decorRevision=-1;next.lightDirty=true;next.lightRevision=0;next.generated=true;
  delete next._lavaView;
  const originalPlayer=data.player;Object.assign(player,originalPlayer);data=rebindSave(data,originalPlayer,player);
  for(const key of Object.keys(g))if(!SAVE_GAME_RUNTIME.has(key)&&typeof g[key]!=='function'&&!(key in data.game))delete g[key];
  Object.assign(g,data.game);g.environment=null;world=g.world=next;g.player=player;Object.assign(g.inventory,data.inventory);
  g.map=new WorldMap(next);g.map.revealed=data.mapRevealed;g.map.allExplored=data.mapAllExplored;
  renderer.bg=null;g.intro={active:false,started:true};g.openingComplete=true;g.paused=false;g.adminOpen=false;g.npcOpen=false;g.adminFly=false;g.adminGod=false;g.shake=0;g.hitStop=0;g.particles=[];g.lavaEffects=null;g.crashAudio?.stopSustained?.(.1);g.crashAudio=null;
  g.sword.active=false;g.mining.progress=0;g.target.visible=false;g.toolAction=null;g.swinging=false;g.rightWasDown=false;
  applyLook(data.look,renderer);saveLook(data.look);Bestiary.data=data.bestiary;Bestiary.save();
  g.inventoryUI.trash=data.trash||null;
  for(const stack of [data.held,...(data.bench||[])])if(stack){const left=g.inventory.add(stack.item,stack.count);if(left)dropItem(g,stack.item,left,player.cx,player.cy,0);}
  for(const m of g.mobs||[]){
   m.fishingOwner=null;delete m.netId;delete m.netMirror;delete m.netBuf;
   if(m.carcass){cancelSharkCleaning(m);if(m.sharkCarrier!=='local')m.sharkCarrier=null;}
  }
  for(const f of g.fallingTrees||[])if(f.canopy){f.canopy=canopyFor(f.tx,next.biomeAt(f.tx),next.seed);if(f.canopy.organic)f.trunkArt=organicTrunkFor(f.canopy,f.n*T,false);}
  fishingWorld=next;
  for(const s of data.fishing||[]){s.owner=fishingOwner();s.pullUntil=-1;if(s.fish)s.fish.fishingOwner=s.owner;fishingSessions.set(s.owner,s);fishingPublish(s);}
  input.keys.clear();input.mouse.left=input.mouse.right=input.mouse.rawLeft=false;
  this.active=meta;this.activeWorld=next;this.lastSaved=Date.now();applyOptions(g);updateCamera(0,true);
 },
 async load(id){
  if(this.loading)return;
  this.loading=true;Menu.go('loading');Menu.root.querySelector('#loading-title').textContent='Carregando mundo';Menu.setLoading(.05,'Lendo o mundo salvo');
  try{
   const response=await this.request('?action=load&id='+encodeURIComponent(id)),recovered=response.headers.get('X-Valdoria-Recovered')==='1';
   const json=await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).text(),save=JSON.parse(json);
   if(save.format!=='valdoria-world'||save.version!==1||save.meta.id!==id)throw Error('Versão ou formato do mundo não reconhecido.');
   Menu.setLoading(.4,'Restaurando terreno e personagem');await new Promise(resolve=>setTimeout(resolve,0));
   const data=loadGraph(save.state);this.validate(data,save.meta);this.restore(data,save.meta);Menu.setLoading(1,'Pronto');Menu.close();
   this.status('Mundo carregado.');if(recovered)toast('Mundo recuperado da cópia de segurança.');
  }catch(e){this.error=e.message;Menu.back();this.status('Não foi possível carregar: '+e.message,true);throw e;}
  finally{this.loading=false;}
 },
 async quit(){
  if(this.loading)return;
  this.loading=true;
  try{if(this.active&&this.activeWorld===this.game.world)await this.saveWithScreen();if(typeof NET!=='undefined'&&NET.room)netLeave();location.reload();}
  catch(e){this.status('Não foi possível sair com segurança: '+e.message,true);}
  finally{this.loading=false;}
 }
};
