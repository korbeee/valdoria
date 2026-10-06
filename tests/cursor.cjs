const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({viewport:{width:1280,height:720}});
    const errors=[]; page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(()=>{ window.requestAnimationFrame=()=>1; });
    await page.goto('http://localhost/jogo-teste/');
    await page.waitForFunction(()=>typeof game==='object');
    await page.evaluate(()=>GameCursor.ready);
    const result=await page.evaluate(()=>{
      const checks=[];
      const expect=(name)=>{ const actual=GameCursor.choose(game,input); if(actual!==name) throw Error(`${name}: ${actual}`); checks.push(name); };
      game.paused=true; expect('default');
      game.paused=false; game.intro.active=false; Menu.root.hidden=true;
      input.mouse.x=640; input.mouse.y=360;
      game.cam.x=game.player.cx-640/game.zoom; game.cam.y=game.player.cy-360/game.zoom;
      game.target={visible:true,inRange:true};
      const equip=(predicate)=>{const entry=Object.entries(ITEM_DEFS).find(([,d])=>predicate(d)); if(!entry)throw Error('Item ausente');game.inventory.slots[game.selected]={item:Number(entry[0]),count:1};};
      for(const type of ['picareta','machado','pa','martelo']) {equip(d=>d.ferramenta===type&&!d.dano);expect(type);}
      game.target.inRange=false;expect('blocked');game.target.inRange=true;
      equip(d=>d.arco);expect('aim'); equip(d=>d.tridente);expect('aim');
      equip(d=>d.puca);expect('net');equip(d=>d.dano&&!d.arco&&!d.tridente&&!d.puca);expect('attack');
      equip(d=>d.cura);expect('use');equip(d=>d.place!=null);expect('build');
      game.inventoryUI.held={item:ITEM.STONE,count:1};expect('grab');game.inventoryUI.held=null;
      game.mapUI.open=true;expect('pointer');game.mapUI.drag={mx:0,my:0};expect('grab');game.mapUI.open=false;game.mapUI.drag=null;
      game.inventoryUI.open=true;
      const s=game.inventoryUI.scale(),r=game.inventoryUI.slotRect(0);
      input.mouse.x=UI.ORIGIN+(r[0]+2)*s;input.mouse.y=UI.ORIGIN+(r[1]+2)*s;expect('pointer');
      GameCursor.update(game,input,canvas);
      if(!canvas.style.cursor.includes('data:image/png'))throw Error('Cursor não aplicado');
      const sheet=document.createElement('canvas');sheet.width=1120;sheet.height=400;const ctx=sheet.getContext('2d');
      ctx.fillStyle='#202c30';ctx.fillRect(0,0,sheet.width,sheet.height);ctx.imageSmoothingEnabled=false;
      const labels={default:'Explorar',aim:'Mirar',pointer:'Interagir',grab:'Arrastar',picareta:'Minerar',machado:'Cortar',pa:'Cavar',martelo:'Martelo',attack:'Atacar',build:'Construir',net:'Capturar',use:'Usar',blocked:'Sem alcance',text:'Escrever'};
      Object.entries(GameCursor.sprites).forEach(([name,sprite],i)=>{
        if(!sprite.source || sprite.source.naturalWidth!==32)throw Error(`Pixel art ausente: ${name}`);
        if(sprite.image.width!==32 || sprite.hotspot.some(n=>n<0||n>=32))throw Error(`Dimensões ou ponto de clique inválido: ${name}`);
        if(sprite.image.getContext('2d').imageSmoothingEnabled)throw Error(`Suavização indevida: ${name}`);
        const alpha=sprite.image.getContext('2d').getImageData(0,0,32,32).data;
        if(alpha[3]!==0 || !alpha.some((v,j)=>j%4===3&&v>160))throw Error(`Transparência inválida: ${name}`);
        checks.push('Pixel '+name);
        const x=(i%7)*160,y=Math.floor(i/7)*200;
        ctx.drawImage(sprite.source,x+32,y+12,96,96);ctx.fillStyle='#fff0ce';ctx.font='14px monospace';ctx.textAlign='center';ctx.fillText(labels[name],x+80,y+144);
        ctx.drawImage(sprite.image,x+64,y+158);
      });
      return {checks,sheet:sheet.toDataURL().split(',')[1]};
    });
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(__dirname,'cursor-sprites-pixel.png'),Buffer.from(result.sheet,'base64'));
    console.log(`${result.checks.length} verificações passaram; 14 sprites em pixel art carregados.`);
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
