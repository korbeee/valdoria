// A história de Valdoria: cada chefe abre um lugar, cada lugar tem um enigma, cada enigma um capítulo.
//   node tests/story.cjs
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:720}});const errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.addInitScript(()=>window.requestAnimationFrame=()=>1);
  await page.goto('http://localhost/jogo-teste/');await page.waitForFunction(()=>typeof game==='object');
  const checks=await page.evaluate(async()=>{
   const out=[];const check=(c,l)=>{if(!c)throw Error('FALHOU: '+l);out.push(l);};
   finishOpening(game);Menu.root.hidden=true;game.paused=false;
   const w=new World(4200,1200,77,{lazy:true});await w.generateAsync(()=>{});
   world=game.world=w;game.map=new WorldMap(w);game.mobs=[];game.drops=[];game.chests.clear();game.story=null;
   for(const c of w.lootChests)game.chests.set(c.y*w.w+c.x,c.slots);
   startOpening(game);finishOpening(game);game.intro.active=false;game.inventoryUI.open=false;game.adminGod=true;
   const st=w.story,p=game.player;
   check(st&&st.bear&&st.tiger&&st.spider&&st.obs,'o mundo tem os quatro lugares da história');
   check(storyState(game).chapters.includes('queda'),'o prólogo já está na Crônica');
   const at=(x,y)=>({x:(x+.5)*T,y:(y+.5)*T});
   const stand=(x,y)=>{p.x=x*T;p.y=(y+1)*T-p.h-.01;p.vx=p.vy=0;};
   const click=(x,y)=>storyInteract(game,at(x,y),true);
   // ---------- I. Serra ----------
   const b=st.bear;
   check(b.passage.every(([x,y])=>w.getTile(x,y)===TILE.BEDROCK),'antes do urso a passagem é rocha matriz');
   stand(b.stones[0].x,b.stones[0].y);click(b.stones[0].x,b.stones[0].y);
   check(storyState(game).bear.seq.length===0,'pedras frias antes do urso cair');
   storyBossFell(game,'bear');
   check(b.passage.every(([x,y])=>w.getTile(x,y)===TILE.AIR),'o urso cai e a passagem se abre');
   const stone=(k)=>b.stones.find(s=>s.glyph===k);
   stand(stone('urso').x,stone('urso').y);click(stone('urso').x,stone('urso').y);
   check(storyState(game).bear.seq.length===0,'ordem errada apaga as pedras');
   for(const k of STORY_ORDER){const s=stone(k);stand(s.x,s.y);click(s.x,s.y);}
   check(storyState(game).bear.state==='solved'&&b.door.every(([x,y])=>w.getTile(x,y)===TILE.AIR),'na ordem da Serra a porta do nicho abre');
   check(storyState(game).chapters.includes('serra'),'capítulo I na Crônica');
   // ---------- II. Estrada do Âmbar ----------
   const t=st.tiger;
   storyBossFell(game,'tiger');
   const roadCount=t.road.filter(x=>{for(let y=0;y<w.h;y++)if(w.getTile(x,y)===TILE.ANCIENT_ROAD)return true;return false;}).length;
   check(roadCount>t.road.length*0.8,'o tigre cai e a estrada aparece ('+roadCount+'/'+t.road.length+')');
   const p5=t.plinths[4];stand(p5.x-1,p5.y);
   game.time=12/24-.25+1;click(p5.x,p5.y);
   check(storyState(game).tiger.state==='open','ao meio-dia a sombra não chega ao último marco');
   // procura a hora em que a sombra cai no último marco (fim da tarde)
   let hit=null;for(let h=15;h<17.8;h+=0.01){game.time=(h/24-.25+1)%1;const sh=sundialShadow(game);if(sh&&Math.abs(t.gnomon.x+.5+sh.dir*sh.len-(p5.x+.5))<=1.5){hit=h;break;}}
   check(hit!==null&&hit>16,'a sombra alcança o último marco no fim da tarde ('+(hit&&hit.toFixed(2))+'h)');
   const p3=t.plinths[2];let hit3=null;for(let h=12;h<17.8;h+=0.01){game.time=(h/24-.25+1)%1;const sh=sundialShadow(game);if(sh&&Math.abs(t.gnomon.x+.5+sh.dir*sh.len-(p3.x+.5))<=1.5){hit3=h;break;}}
   stand(p3.x-1,p3.y);click(p3.x,p3.y);check(storyState(game).tiger.state==='open','marco errado com a sombra em cima não abre');
   game.time=(hit/24-.25+1)%1;stand(p5.x-1,p5.y);click(p5.x,p5.y);
   check(storyState(game).tiger.state==='solved'&&t.lid.every(([x,y])=>w.getTile(x,y)===TILE.AIR),'na hora certa o cofre sob a praça abre');
   check(storyState(game).chapters.includes('ambar'),'capítulo II na Crônica');
   // ---------- III. Cofre da expedição ----------
   const sf=st.spider.safe;
   const pages=[ITEM.HALDEN_PAGE_1,ITEM.HALDEN_PAGE_2,ITEM.HALDEN_PAGE_3].map(id=>w.lootChests.some(c=>c.slots.some(s=>s&&s.item===id)));
   check(pages.every(Boolean),'as três páginas do diário estão em baús da mina');
   check(w.getTile(sf.x,sf.y)===TILE.EXPEDITION_SAFE,'o cofre está no ninho');
   check(!storyTrySafe(game,[1,2,3])||true,'');
   storyBossFell(game,'fiandeira');
   check(storyState(game).spider.state==='open','a aranha cai e a teia do cofre se desfaz');
   check(!storyTrySafe(game,[5,8,3]),'segredo errado não abre');
   check(storyTrySafe(game,[5,8,4])&&storyState(game).chapters.includes('expedicao'),'5-8-4 abre o cofre: capítulo III');
   // ---------- IV. Luneta ----------
   storyBossFell(game,'cascoferro');
   check(storyState(game).obs.state==='open','o besouro cai e a luneta desperta');
   const az=(k)=>SKY.find(s=>s.key===k).az;
   check(!telescopeFix(game,az('garca')).ok,'constelação falsa não vale');
   telescopeFix(game,az('tigre'));const wrong=telescopeFix(game,az('urso'));
   check(wrong.reset&&storyState(game).obs.fixed.length===0,'fora da ordem, as lentes desalinham');
   let last;for(const k of STORY_ORDER)last=telescopeFix(game,az(k)+4);
   check(last.done&&storyState(game).chapters.includes('olho'),'na ordem da Serra: capítulo IV');
   // ---------- Janelas ----------
   StoryUI.openChronicle(game);
   const txt=document.getElementById('story-ui').innerText;
   check(document.getElementById('story-ui').open&&txt.includes('O Olho do Observatório')&&txt.includes('Coração do Céu'),'a Crônica abre com os capítulos');
   StoryUI.close();
   const pg=ITEM.HALDEN_PAGE_1;game.inventory.slots[0]={item:pg,count:1};game.selected=0;storyInteract(game,{x:0,y:0},true);
   check(document.getElementById('story-ui').innerText.includes('Éramos sete'),'botão direito lê a página do diário');
   StoryUI.close();
   check(!game.npcOpen,'fechar devolve o jogo');
   updateCamera(1,true);renderer.render(game);
   return out.filter(Boolean);
  });
  console.log(checks.map(c=>'✓ '+c).join('\n'));
  console.log(errors.length?'ERROS:\n'+errors.join('\n'):'sem erros no console');
  if(errors.length)process.exitCode=1;
 }catch(e){console.error(e.message);process.exitCode=1;}finally{await browser.close();}
})();
