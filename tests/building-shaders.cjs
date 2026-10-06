const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
  const browser = await chromium.launch({channel:'msedge',headless:true});
  try {
    const page = await browser.newPage({viewport:{width:1280,height:800}});
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://localhost/jogo-teste/');
    await page.waitForFunction(() => typeof game === 'object');
    const result = await page.evaluate(() => {
      finishOpening(game); Menu.root.hidden = true; game.paused = true;
      const parts = BUILDING_PARTS.map(([key]) => {
        const tile = TILE[key], item = ITEM[key];
        if (!MATERIAL_TEX[tile] || TILE_DEFS[tile].drop !== item || ITEM_DEFS[item].place !== tile || !RECIPES.some(r=>r.resultado.item===item)) throw Error('Incomplete part: '+key);
        if (SOLID[tile] !== +TILE_DEFS[tile].solid) throw Error('Collision: '+key);
        const recipe=recipesMaking(item)[0];
        const slots=recipe.items.map(s=>({...s}));
        if(craftTimes(slots,recipe)!==1)throw Error('Uncraftable: '+key);
        takeIngredients(slots,recipe);
        if(slots.some(Boolean))throw Error('Ingredients not consumed: '+key);
        const tx=Math.floor(game.player.x/T)+8,ty=10;
        world.setTile(tx,ty,TILE.AIR);world.setTile(tx,ty+1,TILE.STONE);
        game.selected=0;game.inventory.slots[0]={item,count:2};
        if(!tryPlace(tx,ty)||world.getTile(tx,ty)!==tile||game.inventory.slots[0].count!==1)throw Error('Placement failed: '+key);
        world.setTile(tx,ty,TILE.AIR);
        return key;
      });
      const px = Math.floor(game.player.x / T), ground = game.world.surface[px];
      const x0=px-25, y0=ground-28;
      // A repeatable house assembled exclusively from available building pieces.
      for(let y=y0-8;y<ground+8;y++)for(let x=x0-5;x<x0+54;x++) {
        world.setTile(x,y,y>=ground?TILE.DIRT:TILE.AIR); world.setWall(x,y,WALL.NONE);
      }
      const put=(x,y,t)=>world.setTile(x0+x,y0+y,t);
      for(let x=0;x<49;x++)put(x,28,TILE.GRASS);
      for(let y=10;y<28;y++)for(let x=13;x<34;x++)world.setWall(x0+x,y0+y,y<20?WALL.TIMBER:WALL.PLASTER);
      for(let y=1;y<10;y++)for(let x=24-y;x<=23+y;x++)world.setWall(x0+x,y0+y,WALL.TIMBER);
      for(let x=12;x<=34;x++)for(const y of [19,27])put(x,y,TILE.EAVES);
      for(let y=10;y<28;y++)for(const x of [12,23,34])put(x,y,TILE.CARVED_BEAM);
      for(let k=0;k<13;k++){
        put(11+k,12-k,TILE.ROOF_LEFT);put(24+k,k,TILE.ROOF_RIGHT);
        put(11+k,13-k,TILE.SLATE);put(24+k,k+1,TILE.SLATE);
      }
      for(const left of [15,26])for(let y=13;y<17;y++)for(let x=left;x<left+5;x++)put(x,y,TILE.LATTICE_WINDOW);
      for(let x=14;x<33;x++)put(x,18,TILE.BALUSTRADE);
      for(const x of [16,27]){put(x,17,TILE.FLOWER_BOX);put(x,21,TILE.PENDANT);put(x,11,TILE.PENDANT);}
      put(23,5,TILE.PENDANT);
      for(let y=18;y<27;y++)put(35,y,TILE.IVY);
      for(let x=12;x<35;x++)put(x,28,TILE.MOSS_BRICK);
      put(19,26,TILE.TABLE);put(18,26,TILE.CHAIR);put(30,26,TILE.BOOKSHELF);
      game.cam.x=(x0-10)*T;game.cam.y=(y0-8)*T;game.zoom=1.2;
      game.time=.2;game.daylight=1;game.weather=createWeather();
      world.computeLight(x0+25,y0+16);world.composeLight(1);
      GAME_OPTIONS.shaders=false;renderer.render(game);
      const off=renderer.canvas.toDataURL();
      GAME_OPTIONS.shaders=true;renderer.render(game);
      const on=renderer.canvas.toDataURL();
      // Night/rain and a fully dark skylight mask must not create sun rays.
      world.skyLight.fill(0);game.daylight=0;
      renderer.render(game);
      const mask=renderer.shaderSurface.getContext('2d').getImageData(0,0,renderer.shaderSurface.width,renderer.shaderSurface.height).data;
      for(let i=3;i<mask.length;i+=4)if(mask[i]!==0)throw Error('Sunlight leaked underground/night');
      // This legacy assertion exercises moving sunlight; the reference preset fixes its direction.
      RENDER_STYLE.sun.followTime=true;
      const mock={isSkyExposed:(x,y)=>y<5,getWall:()=>WALL.NONE,getTile:(x,y)=>y===5&&x>=5&&x<15?TILE.STONE:TILE.AIR};
      const field=shaderSunField(mock,0,0,20,15,.25);
      if(field[8*20+10]>.01||field[8*20+2]<.99)throw Error('Roof does not cast a shadow');
      const angled=shaderSunField(mock,0,0,20,15,.08);
      if(angled[10*20+17]>=field[10*20+17])throw Error('Shadow does not follow the sun');
      mock.getTile=(x,y)=>y===5&&x>=5&&x<15?TILE.LEAVES:TILE.AIR;
      const leaves=shaderSunField(mock,0,0,20,15,.25);
      if(leaves[8*20+10]<=.1||leaves[8*20+10]>=.99)throw Error('Leaves do not filter sunlight');
      RENDER_STYLE.sun.followTime=false;
      game.daylight=0;game.weather.rain=1;renderer.render(game);
      game.daylight=1;game.weather.rain=0;world.computeLight(x0+25,y0+16);world.composeLight(1);
      if(off===on)throw Error('Shader had no effect');
      const toggle=Menu.root.querySelector('#opt-shaders');toggle.checked=false;
      toggle.dispatchEvent(new Event('change'));
      if(GAME_OPTIONS.shaders!==false || JSON.parse(localStorage.getItem(OPTIONS_KEY)).shaders!==false)throw Error('Toggle did not persist');
      const original=renderer.shaderSurface.getContext('2d').getImageData(0,0,1,1).data.join();
      renderer.render(game);
      if(renderer.shaderSurface.getContext('2d').getImageData(0,0,1,1).data.join()!==original)throw Error('Disabled shader performed work');
      GAME_OPTIONS.shaders=true;
      const start=performance.now();
      for(let frame=0;frame<20;frame++)drawShaderLighting(renderer,game,1280,800,game.cam.x*game.zoom,game.cam.y*game.zoom,game.zoom);
      const lightingMs=(performance.now()-start)/20;
      drawShaderLighting(renderer,game,900,600,game.cam.x*game.zoom,game.cam.y*game.zoom,1.7);
      if(renderer.shaderLight.width!==Math.ceil(900/1.7/T)+5)throw Error('Resize did not rebuild buffers');
      return {parts:parts.length,on,off,lightingMs};
    });
    fs.writeFileSync('tests/building-shaders-on.png',Buffer.from(result.on.split(',')[1],'base64'));
    fs.writeFileSync('tests/building-shaders-off.png',Buffer.from(result.off.split(',')[1],'base64'));
    await page.reload();await page.waitForFunction(()=>typeof game==='object');
    assert.equal(await page.evaluate(()=>GAME_OPTIONS.shaders),false);
    assert.deepEqual(errors,[]);console.log(JSON.stringify({parts:result.parts,persistence:true,lightingMs:result.lightingMs,errors}));
  } finally { await browser.close(); }
})();
