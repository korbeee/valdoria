const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'playwright');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
 const p=await b.newPage({viewport:{width:1200,height:850}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>{requestAnimationFrame=()=>0;localStorage.setItem('valdoria.autoconnect','0');});
 await p.goto('http://localhost/jogo-teste/',{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>typeof GAME_REFERENCE_ITEMS!=='undefined'&&typeof game!=='undefined');
 const n=await p.evaluate(()=>{
  let n=0;const check=(v,s)=>{if(!v)throw Error(s);n++;};
  check(GAME_REFERENCE_ITEMS.length===20,'coleção com 20 itens e variantes');const index=guideBuildIndex();
  for(const id of GAME_REFERENCE_ITEMS){
   const d=ITEM_DEFS[id],art=ITEM_ART[id],r=recipesMaking(id)[0];
   check(!!r&&r.items.length<=5&&r.items.every(i=>ITEM_DEFS[i.item]),'receita válida: '+d.name);
   const slots=r.items.map(i=>({...i}));check(craftTimes(slots,r)===1,'ingredientes suficientes: '+d.name);takeIngredients(slots,r);check(slots.every(s=>!s),'consumo exato: '+d.name);
   check(!stationRecipeAllowed(r,null)&&stationRecipeAllowed(r,r.station),'estação obrigatória: '+d.name);
   check(art.pixels.length===16&&art.pixels.every(row=>row.length===16&&[...row].every(c=>c==='.'||art.cores[c])),'ícone íntegro: '+d.name);
   check(index.byId.get(id).category==='Itens de brincadeira'&&index.byId.get(id).recipes.length===1,'guia catalogado: '+d.name);
   check(index.byId.get(id).search.includes(guideFold(d.referenceGame)),'busca por inspiração: '+d.name);
  }
  const outfit=game.outfit,accessories=game.accessories,look=PLAYER_OUTFIT;
  game.outfit=ITEM.REF_SCOUT_ARMOR;game.accessories=[];check(Math.abs(playerDefense(game)-.22)<1e-8,'defesa do manto');
  setOutfitItem(game,ITEM.REF_ASH_ARMOR);check(PLAYER_OUTFIT==='referenceAsh'&&OUTFIT_JACKETS[PLAYER_OUTFIT].length===4,'paleta equipada');game.outfit=outfit;game.accessories=accessories;setPlayerOutfit(look);
  const old=game.inventory.slots[game.selected],hp=player.hp;game.inventory.slots[game.selected]={item:ITEM.REF_HEARTH_TONIC,count:2};player.hp=20;eatHeld(ITEM_DEFS[ITEM.REF_HEARTH_TONIC]);check(player.hp===40&&game.inventory.slots[game.selected].count===1,'tônico cura e consome');game.inventory.slots[game.selected]=old;player.hp=hp;
  check(bowSprite(ITEM.REF_FOREST_BOW)!==bowSprite(ITEM.BOW)&&bowSprite(ITEM.REF_FOREST_BOW)===bowSprite(ITEM.REF_FOREST_BOW),'arco com arte própria em cache');
  check(ITEM_DEFS[ITEM.REF_TRAIL_SPADE].referencePassive==='cloud','nuvem equipada');
  check(swordTrailStyle(ITEM.REF_DUEL_BLADE).band==='#c786d7','rastro de combate da coleção');
  game.intro.active=false;Menu.close();ItemGuide.open(game);ItemGuide.category='Itens de brincadeira';ItemGuide.renderList();check(ItemGuide.visible.length===20,'aba mostra apenas coleção');return n;
 });
 await p.screenshot({path:'tests/game-references-guide.png'});
 await p.getByRole('button',{name:'Itens de brincadeira',exact:false}).click();await p.keyboard.press('KeyE');if(await p.evaluate(()=>ItemGuide.category)!=='Todos')throw Error('Navegação E não retorna à primeira aba');
 await p.evaluate(()=>ItemGuide.close());await p.locator('#admin-toggle').click();await p.locator('[data-cat="references"]').click();
 const shown=await p.locator('.adm-slot:visible').count();if(shown!==20)throw Error('Filtro admin: '+shown);await p.screenshot({path:'tests/game-references-admin.png'});
 if(errors.length)throw Error(errors.join('\n'));console.log((n+2)+' verificações passaram: receitas, efeitos, arte e filtros.');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1);});
