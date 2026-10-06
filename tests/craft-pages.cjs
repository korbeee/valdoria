const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
  const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>window.requestAnimationFrame=()=>0);
  await page.goto('http://localhost/jogo-teste/');await page.waitForFunction(()=>typeof game==='object');
  const result=await page.evaluate(()=>{
    const ui=game.inventoryUI,w=game.world;ui.open=ui.craftOpen=true;ui.inv.slots.fill(null);
    for(let x=100;x<103;x++){for(let y=20;y<25;y++)w.setTile(x,y,TILE.AIR);w.setTile(x,25,TILE.STONE);}
    placeFurniture(w,TILE.WORKBENCH,100,24);ui.station={kind:'workbench',x:100,y:24};game.player.x=101*T;game.player.y=25*T-game.player.h;
    ui.bench=[ITEM.WOOD,ITEM.PLANKS,ITEM.STONE,ITEM.METAL_BAR,ITEM.STICK].map(item=>({item,count:99}));
    const check=(ok,msg)=>{if(!ok)throw Error(msg);};
    const list=ui.benchResults();check(list.length>CRAFT.MAKE_COLS,'Madeira deve ter receitas fora da primeira página');
    const click=(rect,button=0)=>{const p=ui.sidePanel(),[x,y,w,h]=rect;return ui.onMouseDown(button,p.ox+(x+w/2)*p.s,p.oy+(y+h/2)*p.s,false);};
    const picture=()=>{const c=makeCanvas(CRAFT.W*3,CRAFT.H*3),ctx=c.getContext('2d');ctx.scale(3,3);ui.drawCraftPanel(ctx,null);return c.toDataURL();};
    const first=picture();
    click(ui.makePrevRect);check(ui.makePage===0,'Anterior não ultrapassa primeira página');
    click(ui.makeNextRect,2);check(ui.makePage===0,'Botão direito não troca página');
    click(ui.makeNextRect);check(ui.makePage===1,'Seta próxima muda página');
    check(ui.benchResult(0)===list[5],'Primeiro slot aponta para a sexta receita');
    const second=picture();
    const expected=ui.benchResult(0),before=ui.inv.count(expected.result.item);
    click(ui.makeSlotRect(0));check(ui.inv.count(expected.result.item)===before+expected.result.count,'Clique fabrica o item mostrado na página seguinte');
    ui.bench.fill(null);ui.benchResults();check(ui.makePage===0,'Bancada vazia redefine página');
    ui.bench[0]={item:ITEM.WOOD,count:12};ui.turnMakePage(1);ui.emptyBench();check(ui.makePage===0,'Limpar bancada redefine página');
    const p=ui.sidePanel(),r=ui.makeNextRect;check(ui.hitTest(p.ox+(r[0]+6)*p.s,p.oy+(r[1]+10)*p.s)?.type!=='makeNext','Sem receitas extras as setas não capturam cliques');
    return {first,second,total:list.length};
  });
  assert.deepEqual(errors,[]);
  for(const k of ['first','second'])fs.writeFileSync(`tests/craft-page-${k}.png`,Buffer.from(result[k].split(',')[1],'base64'));
  console.log(`Paginação de ${result.total} receitas, setas, limites, clique no resultado correto e reset da bancada verificados.`);
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
