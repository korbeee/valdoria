'use strict';

// Ajuda do canto de baixo (tecla H): duas colunas de [teclas, o que faz]
const HELP_ROWS = [
  [['A', 'D'], 'andar'],
  [['Espaço'], 'pular'],
  [['S'], 'agachar'],
  [['Ctrl'], 'cursor inteligente'],
  [['Esq.'], 'minerar / atacar'],
  [['Dir.'], 'colocar / interagir'],
  [['1-0'], 'trocar de item'],
  [['E'], 'inventário'],
  [['C'], 'receitas'],
  [['J'], 'missões'],
  [['M'], 'mapa'],
  [['Q'], 'soltar item'],
  [['V'], 'tirar a roupa'],
  [['R'], 'poder de referência'],
  [['Esc'], 'pausa e opções'],
];

// Miolo das variações de bloco sem lado exposto (linha mask 0 do atlas), repacotado com
// passo T em vez de SPR. Serve para desenhar faixas horizontais de blocos iguais numa
// chamada só. A tira só é criada quando a moldura de 4px daquele atlas está mesmo vazia,
// então o resultado é pixel a pixel igual ao atlas original.
const blockRunStrips = new WeakMap();
function blockRunStrip(atlas) {
  if (blockRunStrips.has(atlas)) return blockRunStrips.get(atlas);
  let strip = null;
  try {
    const data = atlas.getContext('2d').getImageData(0, 0, atlas.width, SPR).data;
    let clean = true;
    for (let col = 0; col < 16 && clean; col++)
      for (let y = 0; y < SPR && clean; y++)
        for (let x = 0; x < SPR; x++) {
          if (x >= MARGIN && x < MARGIN + T && y >= MARGIN && y < MARGIN + T) continue;
          if (data[(y * atlas.width + col * SPR + x) * 4 + 3]) { clean = false; break; }
        }
    if (clean) {
      strip = makeCanvas(16 * T, T);
      const c = strip.getContext('2d');
      c.imageSmoothingEnabled = false;
      for (let col = 0; col < 16; col++) c.drawImage(atlas, col * SPR + MARGIN, MARGIN, T, T, col * T, 0, T, T);
    }
  } catch (_) { strip = null; }
  blockRunStrips.set(atlas, strip);
  return strip;
}

// Bicho fora da tela não desenha nenhum pixel visível. A margem cobre com folga o maior
// sprite (urso, 208x160, centrado no bicho) e os extras desenhados longe da caixa dele:
// fio e casulo da Fiandeira (a partir de anchorY), areia do Casco-Ferro e o ninho do pássaro.
// Sem o corte, o casulo da Fiandeira do outro lado do mapa custava ~1500 fillRect por quadro.
const MOB_DRAW_MARGIN = 256;
function mobNearView(m, vx, vy, vw, vh) {
  let x0 = m.x, x1 = m.x + m.w, y0 = Math.min(m.y, m.anchorY || m.y), y1 = m.y + m.h;
  if (m.nest && Number.isFinite(m.nest.y)) { // ninho de pássaro (o "ninho" da Fiandeira não tem y)
    x0 = Math.min(x0, m.nest.x); x1 = Math.max(x1, m.nest.x);
    y0 = Math.min(y0, m.nest.y); y1 = Math.max(y1, m.nest.y);
  }
  return x1 > vx - MOB_DRAW_MARGIN && x0 < vx + vw + MOB_DRAW_MARGIN &&
    y1 > vy - MOB_DRAW_MARGIN && y0 < vy + vh + MOB_DRAW_MARGIN;
}

class Renderer {
  constructor(canvas, textures) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.tex = textures;
    this.playerAtlas = buildPlayerSprite();
    this.pigSprites = buildPigArt();
    this.monsterSprites = buildMonsterSprites();
    this.bg = null;
    this.torches = [];
  }

  render(game) {
    const { ctx, canvas } = this;
    const W = canvas.width, H = canvas.height;
    if (typeof menuRelease === 'function' && game.intro?.started) menuRelease(); // o jogo começou: solta o mundo do menu
    // Menu principal: um pedaço real do jogo no fundo (js/menu-world.js); se falhar, cai na cena antiga
    if (!this._menuPass && game.intro?.active && !game.intro.started && typeof renderLiveMenu === 'function' && renderLiveMenu(this, game)) return;
    if(game.intro?.active && game.intro.cabin?.active){drawPlaneCabin(ctx,game,this,W,H);return;}
    const z = game.zoom;
    const shake = GAME_OPTIONS.shake ? game.shake || 0 : 0;
    const ox = Math.round(game.cam.x * z + (shake ? (Math.random() * 2 - 1) * shake * z : 0));
    const oy = Math.round(game.cam.y * z + (shake ? (Math.random() * 2 - 1) * shake * z : 0));
    const vx = ox / z, vy = oy / z, vw = W / z, vh = H / z;

    if (!this.bg) this.bg = new Background(game.world.seed);

    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.filter = 'none';
    if (GAME_OPTIONS.shaders && !game.adminNightVision) prepareShaderFrame(this, game, W, H, ox, oy, z);
    this.bg.draw(ctx, game, W, H, z);
    if (GAME_OPTIONS.shaders) drawShaderSky(ctx, game, W, H, this);
    // Fundo de caverna: fundo do cÃ©u (estrelas, montanhas e Ã¡rvores distantes) nÃ£o aparece embaixo da terra.
    // Quanto mais fundo a cÃ¢mera, mais o fundo vira parede escura lisa.
    {
      const wd = game.world, cxT = clamp(Math.floor((vx + vw / 2) / T), 0, wd.w - 1), depthT = (vy + vh / 2) / T - (wd.surface?.[cxT] ?? 0), a = clamp((depthT - 5) / 10, 0, 1);
      if (a > 0) { ctx.fillStyle = `rgba(20,15,26,${a})`; ctx.fillRect(0, 0, W, H); }
    }
    drawWeatherFunnel(ctx, game, ox, oy, z);

    ctx.setTransform(z, 0, 0, z, -ox, -oy);
    this.drawWorld(game, vx, vy, vw, vh);
    drawAquaticFlora(ctx, game, vx, vy, vw, vh); // algas e corais (js/water.js)
    drawFallingTrees(ctx, game, this.tex);
    drawFallingBlocks(ctx, game, this.tex);
    drawCrashScenery(ctx,game);
    drawDrops(ctx, game, this.tex.itemAtlas);
    if(!game.intro?.active)this.drawMobs(game.mobs, vx, vy, vw, vh);
    if(!game.intro?.active)drawNpcs(ctx, game);
    drawDragonflies(ctx, game);
    drawEnvCritters(ctx, game); // insetos soltos pelo mato cortado (js/environment.js)
    drawCubSpirit(ctx, game);   // o filhote de fumaça anda junto (js/bear-loot.js)
    drawBossGearWorld(ctx, game); // teias, casulo, aranhinha e gancho (js/spider-loot.js)
    const pose = swordPose(game);
    drawFlightEquipment(ctx,game);
    if(game.intro?.active)drawOpeningPlayer(ctx,game,this);
    else this.drawPlayer(game.player, pose, game.sword, game);
    if (pose) this.drawSwordArm(pose);
    else if(game.toolAction&&!ITEM_DEFS[game.inventory.slots[game.selected]?.item]?.fishingRod)drawToolAction(ctx,game,this.tex.itemAtlas);   // a vara nunca some atrás de uma ação de ferramenta esquecida
    else if(!game.intro?.active&&Math.abs(game.player.swimTilt||0)<0.3&&Math.abs(game.player.flightTilt||0)<.3&&!game.player.gag)this.drawHeldItem(game); // deitado: item guardado
    if (game.mount && !game.intro?.active) drawWildlife(ctx, game.mount); // montado: o elefante cobre as pernas
    this.drawParticles(game.particles);
    drawArrows(ctx, game);
    drawWater(ctx, game, vx, vy, vw, vh); // por cima de quem está dentro dela
    drawLavaSplashes(ctx,game);
    drawTigerHabitatDetails(ctx,game);

    // Camada de luz (1px = 1 tile, ampliada com suavização)
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = true;
    if (!game.adminNightVision) {
      if (GAME_OPTIONS.shaders) drawShaderLighting(this, game, W, H, ox, oy, z);
      else ctx.drawImage(game.world.lightCanvas, vx / T - game.world.lx, vy / T - game.world.ly, vw / T, vh / T, 0, 0, W, H);
    }
    ctx.imageSmoothingEnabled = false;
    this.drawTorchGlow(game, ox, oy, z);
    drawCrashGlow(ctx, game, ox, oy, z);
    drawEnvironmentAccents(ctx, game, ox, oy, z);
    drawCoreAccents(ctx, game, ox, oy, z); // brilho da lava e névoa do Coração (js/core-life.js)
    drawSkyAccents(ctx, game, ox, oy, z);  // feixe das Pedras dos Ventos, flores acesas, névoa do alto (js/sky-life.js)
    drawWeather(ctx, game, W, H, ox, oy, z);
    drawSnowWeather(ctx,game,ox,oy,z);
    drawUnderwaterTint(ctx, game, W, H);

    ctx.setTransform(z, 0, 0, z, -ox, -oy);
    drawCombatEffects(ctx, game); // depois da luz: o corte brilha também no escuro
    drawTridentEffects(ctx, game); // jatos e respingos do tridente (js/trident.js)
    drawExplosions(ctx, game);
    drawBearEffects(ctx, game);  // onda do pisão e pedras do covil (js/bear.js)
    drawReferences(ctx,game);
    drawBossBattleVfx(ctx,game);
    drawBottledRoar(ctx);
    drawSeismicWaves(ctx);       // onda da Pata Sísmica (js/bear-loot.js)
    drawBossGearOverlay(ctx, game); // pegadas, Olho de Âmbar e olhos da Fiandeira brilham no escuro
    drawToolEffects(ctx,game);
    drawGuardianPowers(ctx, game);
    drawBossFx(ctx, game);       // lascas, faíscas, brasas e auras dos poderes de chefe (js/boss-fx.js)
    drawFishing(ctx,game);
    drawCoreWorld(ctx, game);    // brasas, anéis e arcos de magnetita (js/core-life.js)
    drawSkyWorld(ctx, game);     // correntes de vento e a asa-delta (js/sky-life.js)
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (GAME_OPTIONS.shaders) drawWorldShaders(this, game, W, H, ox, oy, z);
    ctx.setTransform(z, 0, 0, z, -ox, -oy);
    if(!game.intro?.active&&!this._menuPass)this.drawCursor(game, z);
    if (this._menuPass) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; return; } // fundo do menu: sem interface

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = introHudAlpha(game);
    game.inventoryUI.drawVitals(ctx, game.player); // antes do inventário, que cobre a barra quando abre
    this.drawUI(game, W, H);
    drawFlightHud(ctx,game);
    drawFishingHud(ctx,game,W,H);
    ctx.globalAlpha = 1;
    if (!game.intro?.active && game.objective && !game.mapUI.open) this.drawObjective(game, W, H);
    drawLavatoryCaption(ctx, game, W, H);
    if (!game.intro?.active) { drawNpcBubbles(ctx, game); drawStoryHud(ctx, game); }
    drawBossBar(ctx, game, W, H);
    drawFpsCounter(ctx, W);
    drawOpeningOverlay(ctx,game,W,H);
  }

  drawWorld(game, vx, vy, vw, vh) {
    const { ctx } = this;
    const world = game.world;
    const { blocks, flat } = this.tex;
    const walls = GAME_OPTIONS.shaders && !game.adminNightVision ? shaderWalls(this) : this.tex.walls;
    const { tiles, w, h } = world;
    const x0 = Math.max(0, Math.floor(vx / T) - 1), x1 = Math.min(w - 1, Math.floor((vx + vw) / T) + 1);
    const y0 = Math.max(0, Math.floor(vy / T) - 1), y1 = Math.min(h - 1, Math.floor((vy + vh) / T) + 1);
    // Portas não contam como bloco para as bordas irregulares dos vizinhos
    const solid = (x, y) => {
      const t = world.getTile(x, y);
      return SOLID[t] === 1 && t !== TILE.DOOR;
    };

    // Paredes de fundo, com sombra embaixo dos blocos. Os sprites saem num lote só, depois
    // a tinta de gruta e por fim as sombras: cada tile pinta apenas dentro do próprio
    // quadrado, então o resultado é o mesmo de desenhar as três coisas tile a tile.
    const shadows = this.wallShadows ??= [];
    shadows.length = 0;
    resetEnvironmentWallQueue();
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const i = y * w + x;
        const wall = world.walls[i];
        if (wall === WALL.NONE || SOLID[tiles[i]]) continue;
        // As quatro variações da parede ficam lado a lado no atlas, e paredes não se
        // sobrepõem: uma faixa de até quatro tiles iguais sai num drawImage só, com
        // exatamente os mesmos pixels que quatro chamadas separadas.
        const v = x & 3, limit = Math.min(4 - v, x1 - x + 1);
        let run = 1;
        while (run < limit && world.walls[i + run] === wall && !SOLID[tiles[i + run]]) run++;
        ctx.drawImage(walls[wall], v * T, (y & 3) * T, run * T, T, x * T, y * T, run * T, T);
        for (let k = 0; k < run; k++) {
          environmentWallCell(game, x + k, y, wall);
          if (solid(x + k, y - 1)) shadows.push(x + k, y);
        }
        x += run - 1;
      }
    drawEnvironmentWallQueue(ctx);
    if (shadows.length) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      for (let i = 0; i < shadows.length; i += 2) ctx.fillRect(shadows[i] * T, shadows[i + 1] * T, T, 4);
    }

    drawBearHabitatBackdrop(ctx, game, vx, vy, vw, vh);
    drawTigerHabitatBackdrop(ctx,game,vx,vy,vw,vh);
    drawSpiderHabitatBackdrop(ctx,game,vx,vy,vw,vh);
    if(typeof drawBeetleLairBackdrop==='function')drawBeetleLairBackdrop(ctx,game,vx,vy,vw,vh); // câmara do Escavador (js/beetle-lair.js)
    drawCoreBackdrop(ctx, game, vx, vy, vw, vh); // esqueletos gigantes do Ossário (js/core-life.js)
    drawSkyFalls(ctx, game, vx, vy, vw, vh);    // cachoeiras das ilhas do céu (js/sky-life.js)

    // Troncos e copas (a copa pode aparecer mesmo com o tronco fora da tela)
    const canopies = [],drawnTreeBottom=new Map();
    for (let y = Math.max(0, y0 - 1); y <= Math.min(h - 1, y1 + 6); y++)
      for (let x = Math.max(0, x0 - 6); x <= Math.min(w - 1, x1 + 6); x++) {
        const t0 = tiles[y * w + x];
        if (t0 !== TILE.TRUNK && t0 !== TILE.STUMP) continue;
        if(y<=(drawnTreeBottom.get(x)??-1))continue;
        const tree=canopyFor(x, world.biomeAt(x),world.seed);
        if(tree.organic){
          // A coluna de madeira inteira vira um sprite só de casca, inclusive quando sobrou
          // um toco em cima: senão a parte cortada voltava a ser o bloco de tronco antigo.
          let top=y;while(top>0&&isWoodColumn(world.getTile(x,top-1)))top--;
          let bottom=y;while(bottom+1<h&&isWoodColumn(world.getTile(x,bottom+1)))bottom++;
          drawnTreeBottom.set(x,bottom);
          const inteira=world.getTile(x,top)===TILE.TRUNK;
          const trunk=organicTrunkFor(tree,(bottom-top+1)*T,!inteira);
          ctx.drawImage(trunk,Math.round(x*T+T/2-trunk.width/2),top*T);
          if(inteira&&typeof drawTrunkMarks==='function')drawTrunkMarks(ctx,world,x,top,bottom,tree); // marcas de garra do tigre (js/tiger-habitat.js)
          if(inteira)canopies.push([x,top]); // toco não ganha copa
          continue;
        }
        if (t0 !== TILE.TRUNK) continue; // espécie antiga: o toco sai no passe normal de tiles
        const trunk = tree.trunk || flat[TILE.TRUNK];
        if (y >= y0 && y <= y1 && x >= x0 && x <= x1) ctx.drawImage(trunk, 0, (y & 3) * T, T, T, x * T, y * T, T, T);
        const above = world.getTile(x, y - 1); // topo da árvore; embaixo de um toco não nasce copa
        if (above !== TILE.TRUNK && above !== TILE.STUMP) canopies.push([x, y]);
      }
    for (const [x, y] of canopies) {
      const c = canopyFor(x, world.biomeAt(x),world.seed),cx=Math.round(x*T+T/2-c.canvas.width/2),cy=Math.round(y*T+c.overlap-c.canvas.height);
      if(c.woodCanvas)ctx.drawImage(c.woodCanvas,cx,cy);
      drawEnvironmentPlant(this, game, c.leafCanvas||c.canvas, cx,cy,x,y+(c.overlap-c.canvas.height)/T,true);
    }

    // Decorações (grama, flores, raízes...) e tochas
    this.torches.length = 0;
    const lavaFrame=Math.floor(performance.now()/150)%LAVA_FRAMES;
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const t = tiles[y * w + x];
        if (t === TILE.TORCH) {
          // Presa numa parede lateral (ou num tronco): a tocha inclina para fora em vez de flutuar.
          // A casca da árvore é 4px mais estreita que o tile, então ali a tocha chega mais perto.
          const side = torchSupport(world, x, y);
          const hug = side ? side * (TORCH_HOLDS.has(world.getTile(x + side, y)) ? 5 : 0) : 0;
          if (side === -1) ctx.drawImage(this.tex.torchWall, x * T + hug, y * T);
          else if (side === 1) { ctx.save(); ctx.translate(x * T + T + hug, y * T); ctx.scale(-1, 1); ctx.drawImage(this.tex.torchWall, 0, 0); ctx.restore(); }
          else ctx.drawImage(flat[TILE.TORCH], 0, 0, T, T, x * T, y * T, T, T);
          this.torches.push([x, y]);
          continue;
        }
        if (t === TILE.CHEST) {
          // Baú grande: a metade da esquerda desenha o sprite largo, a da direita não desenha nada
          const key = y * w + x, pk = game.chestPairs.get(key);
          if (pk === key + 1) ctx.drawImage(this.tex.bigChest, x * T, y * T);
          else if (pk !== key - 1) ctx.drawImage(flat[t], 0, 0, T, T, x * T, y * T, T, T);
          continue;
        }
        if(t===TILE.LAVA){x+=drawLavaRun(ctx,world,x,y,x1,lavaFrame)-1;continue;}
        // Móveis de vários blocos e peças que emendam com a vizinha (js/furniture.js)
        if (TILE_DRAW[t]) {
          TILE_DRAW[t](ctx, world, x, y);
          if (TILE_DEFS[t].light > 0 && !TILE_DEFS[t].semBrilho) this.torches.push([x, y]); // lava tem brilho próprio (js/core-life.js)
          continue;
        }
        // Toco de árvore nova: a casca dele já saiu junto com a coluna, lá em cima
        if (t === TILE.STUMP && canopyFor(x, world.biomeAt(x), world.seed).organic) continue;
        // Enfeites e peças não sólidas (cerca, lampião, escada, teia...)
        if (FLAT_TILES[t]) {
          ctx.drawImage(flat[t], 0, FLAT_VERTICAL[t] ? (y & 3) * T : 0, T, T, x * T, y * T, T, T);
          if (TILE_DEFS[t].light > 0) this.torches.push([x, y]);
          continue;
        }
        if (t === TILE.CAMPFIRE) {
          ctx.drawImage(flat[t], 0, 0, T, T, x * T, y * T, T, T);
          drawFire(ctx, { x: x * T + 8, y: y * T + 12, style: 'blaze', pal: 'warm', variant: (x * 7 + y) & 3, tempo: 1, seed: x * 0.37 }, 0.55, performance.now() / 1000);
          this.torches.push([x, y]);
          continue;
        }
        if (!SOLID[t]) continue;
        if (world.getTile(x, y - 1) === TILE.AIR && !world.water[(y - 1) * w + x]) { // embaixo d'água: nada de mato
          // Enfeite só onde o mundo nasceu assim: vão cavado pelo jogador fica limpo (world.touched)
          const fresh = !world.touched?.size || (!world.touched.has(y * w + x) && !world.touched.has((y - 1) * w + x));
          const d = environmentDecoration(world,x,y) || (fresh ? decorAbove(t, x, y, y > world.surface[x] + 3, undergroundDeep(world, x, y)) : null);
          if (d) {
            drawEnvironmentPlant(this,game,d,x*T-(d.envKind?(d.envOx??4):0),y*T-d.height+2,x,y-1);
          }
        }
        if (world.getTile(x, y + 1) === TILE.AIR && y + 1 < h) {
          const fresh = !world.touched?.size || (!world.touched.has(y * w + x) && !world.touched.has((y + 1) * w + x));
          const d = environmentDecoration(world,x,y,true) || (fresh ? decorBelow(t, x, y) : null);
          if (d) drawEnvironmentPlant(this,game,d,x*T-(d.envKind?4:0),(y+1)*T-2,x,y+1,false,true);
        }
      }

    // Portas: desenha o sprite de 3 blocos a partir da parte de baixo
    for (let y = y0; y <= Math.min(h - 1, y1 + 2); y++)
      for (let x = x0; x <= x1; x++) {
        const t = tiles[y * w + x];
        if (t !== TILE.DOOR && t !== TILE.DOOR_OPEN) continue;
        const below = world.getTile(x, y + 1);
        if (below === TILE.DOOR || below === TILE.DOOR_OPEN) continue;
        const sprite = t === TILE.DOOR ? this.tex.doors.closed : this.tex.doors.open;
        ctx.drawImage(sprite, x * T, (y - 2) * T);
      }

    // Blocos: o sprite escolhido depende de quais lados estão expostos. O lado que recebe
    // a borda de sol é o mesmo para a tela toda, então sai do laço.
    const rimSides = 1 | (shaderSunStep(game.time) <= 0 ? 2 : 8);
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const t = tiles[y * w + x];
        if (!SOLID[t] || t === TILE.DOOR) continue;
        const material = spiderHabitatMaterial(world,x,y,bearHabitatMaterial(world, x, y, t)), tileArt = blocks[material];
        const mask = (solid(x, y - 1) ? 0 : 1) | (solid(x + 1, y) ? 0 : 2) | (solid(x, y + 1) ? 0 : 4) | (solid(x - 1, y) ? 0 : 8);
        const col = (y & 3) * 4 + (x & 3);
        // Bloco sem nenhum lado exposto: a moldura de 4px do sprite é vazia, então o miolo
        // vai pela tira de passo T e até quatro blocos iguais saem juntos. Sem borda de sol
        // (mask 0) e sem pétalas de sakura, o desenho é idêntico ao caminho normal.
        if (mask === 0 && t !== TILE.SAKURA_GRASS) {
          const strip = blockRunStrip(tileArt);
          if (strip) {
            const v = x & 3, limit = Math.min(4 - v, x1 - x + 1);
            let run = 1;
            while (run < limit && tiles[y * w + x + run] === t &&
              spiderHabitatMaterial(world,x+run,y,bearHabitatMaterial(world, x + run, y, t)) === material &&
              solid(x + run, y - 1) && solid(x + run + 1, y) && solid(x + run, y + 1)) run++;
            ctx.drawImage(strip, col * T, 0, run * T, T, x * T, y * T, run * T, T);
            x += run - 1;
            continue;
          }
        }
        ctx.drawImage(tileArt, col * SPR, mask * SPR, SPR, SPR, x * T - MARGIN, y * T - MARGIN, SPR, SPR);
        if (mask & rimSides) drawShaderRim(this, game, tileArt, col*SPR, mask*SPR, SPR, SPR,
          x*T-MARGIN, y*T-MARGIN, SPR, SPR, x, y, false, true);
        if(t===TILE.SAKURA_GRASS){const petals=sakuraGroundPetals(world,x,y);if(petals)ctx.drawImage(petals,x*T,y*T-4);}
      }
  }

  drawTorchGlow(game, ox, oy, z) {
    const { ctx } = this;
    if (!this.torches.length) return;
    const now = performance.now() / 1000;
    ctx.globalCompositeOperation = 'lighter';
    for (const [x, y] of this.torches) {
      const flicker = Math.sin(now * 9 + x * 3.1) * 0.5 + Math.sin(now * 13.7 + y) * 0.5;
      const sx = (x + 0.5) * T * z - ox, sy = (y + 0.3) * T * z - oy;
      const r = (T * 3.2 + flicker * 3) * z;
      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
      g.addColorStop(0, 'rgba(255,170,70,0.28)');
      g.addColorStop(0.4, 'rgba(255,120,40,0.1)');
      g.addColorStop(1, 'rgba(255,100,30,0)');
      ctx.fillStyle = g;
      ctx.fillRect(sx - r, sy - r, r * 2, r * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  // pose: golpe de espada em andamento (quadro sem braço da frente + avanço do corpo)
  drawPlayer(p, pose, sword, game) {
    const { ctx } = this;
    // Puxando o arco: quadro de golpe sem o braço da frente (os braços são desenhados pelo arco)
    const fishingFrame=typeof fishingBodyFrame==='function'?fishingBodyFrame(game):null;
    const frame = pose ? playerAttackFrame(p, sword) : fishingFrame!=null?fishingFrame : game.trident?.anim ? tridentBodyFrame(game) : game.toolAction ? toolBodyFrame(game) : game.bow?.charging ? (p.crouching ? PLAYER_ANIMS.crawlAttack : PLAYER_ANIMS.attack + 2) : Math.abs(p.flightTilt||0)>.02 ? PLAYER_ANIMS.flightSide+Math.floor((p.visualTime||0)*8)%8 : playerFrame(p);
    const dx = Math.round(p.x + p.w / 2 - PLAYER_SPR_W / 2) + (pose ? pose.lunge : tridentLunge(game));
    const dy = Math.round(p.y + (p.stepOffset || 0) + p.h - PLAYER_SPR_H);
    const sx = frame * PLAYER_SPR_W;
    // Nadando: o corpo inteiro gira em volta do meio, deitando na direção do nado (js/water.js)
    const tilt = p.flightTilt || p.swimTilt || 0;
    if (tilt) {
      const cx = p.x + p.w / 2, cy = p.y + (p.stepOffset || 0) + p.h / 2;
      ctx.save();
      ctx.translate(Math.round(cx), Math.round(cy));
      ctx.rotate(tilt * p.facing);
      ctx.scale(p.facing < 0 ? -1 : 1, 1);
      ctx.drawImage(this.playerAtlas, sx, 0, PLAYER_SPR_W, PLAYER_SPR_H, -PLAYER_SPR_W / 2, Math.round(dy - cy), PLAYER_SPR_W, PLAYER_SPR_H);
      if(frame>=PLAYER_ANIMS.flightSide&&frame<PLAYER_ANIMS.flightSide+8){
        // Corpo horizontal, rosto olhando para a frente: cabeça acompanha o pescoço.
        ctx.translate(0,Math.round(dy-cy)+22);ctx.rotate(-tilt);
        ctx.drawImage(this.playerAtlas,PLAYER_ANIMS.idle*PLAYER_SPR_W,0,PLAYER_SPR_W,22,-PLAYER_SPR_W/2,-22,PLAYER_SPR_W,22);
      }
      ctx.restore();
      return;
    }
    if (p.facing < 0) {
      ctx.save();
      ctx.translate(dx + PLAYER_SPR_W, dy);
      ctx.scale(-1, 1);
      ctx.drawImage(this.playerAtlas, sx, 0, PLAYER_SPR_W, PLAYER_SPR_H, 0, 0, PLAYER_SPR_W, PLAYER_SPR_H);
      ctx.restore();
    } else {
      ctx.drawImage(this.playerAtlas, sx, 0, PLAYER_SPR_W, PLAYER_SPR_H, dx, dy, PLAYER_SPR_W, PLAYER_SPR_H);
    }
  }

  // Braço da frente + espada girando a partir do ombro durante o golpe
  drawSwordArm(pose, sword = game.sword, ctx = this.ctx) {
    if (!this.armColors) {
      this.armColors = {
        outline: rgb(PLAYER_OUTLINE), sleeve: rgb(PLAYER_PALETTE.J),
        sleeveShade: rgb(PLAYER_PALETTE.j), hand: playerHandRgb(),
      };
    }
    const c = this.armColors;
    ctx.save();
    ctx.translate(pose.x, pose.y);
    ctx.rotate(pose.angle);

    // Espada primeiro (o cabo fica por baixo da mão). O ícone aponta a 45°; gira para seguir o braço.
    ctx.save();
    ctx.translate(SWORD.maoRaio, 0);
    if (ITEM_DEFS[pose.item]?.nailSkin!=null) {
      drawEssenceNailHeld(ctx,pose.item,true);
    } else if (pose.item === ITEM.BUG_NET && typeof paintNetInHand === 'function') {
      paintNetInHand(ctx, sword); // aro e saco de malha desenhados na hora (js/bug-net.js)
    } else if (pose.item === ITEM.ALPHA_CLAWS) {
      drawAlphaClawsHeld(ctx);
    } else if (pose.item === ITEM.EMERGENCY_AXE) {
      // Machadada: o fio de aço vai na frente, igual ao golpe no tronco (js/tool-action.js)
      const [tx, ty] = EMERGENCY_AXE_TIPS.machado;
      ctx.scale(1, -1);
      ctx.rotate(-Math.atan2(ty - TOOL_ICON_GRIP[1], tx - TOOL_ICON_GRIP[0]));
      ctx.scale(1.25, 1.25); // mesmo tamanho das espadas (20px para um ícone de 16)
      ctx.drawImage(this.tex.itemAtlas, pose.item * T, 0, T, T, -TOOL_ICON_GRIP[0], -TOOL_ICON_GRIP[1], T, T);
    } else {
      ctx.rotate(Math.PI / 4);
      ctx.drawImage(this.tex.itemAtlas, pose.item * T, 0, T, T, -2, -15.5, 20, 20); // espada um pouco maior que o ícone
    }
    ctx.restore();

    ctx.fillStyle = c.outline;
    ctx.fillRect(-2, -2.5, 13, 5);
    ctx.fillStyle = c.sleeve;
    ctx.fillRect(-1, -1.5, 8, 3);
    ctx.fillStyle = c.sleeveShade;
    ctx.fillRect(-1, 0.5, 8, 1);
    ctx.fillStyle = c.hand;
    ctx.fillRect(7, -1.5, 3, 3);
    ctx.restore();
  }

  drawMobs(mobs, vx, vy, vw, vh) {
    const { ctx } = this;
    for (const m of mobs) {
      if (m === game.mount) continue; // desenhado depois do jogador
      if (!mobNearView(m, vx, vy, vw, vh)) continue; // chefes e bichos longe: nada apareceria na tela
      if (WILDLIFE[m.kind]) { drawWildlife(ctx, m); continue; }
      const frame = m.hostile ? monsterFrame(m) : pigFrame(m);
      const sprites=m.hostile?this.monsterSprites[m.kind]:(m.skin===1?this.pigSprites.cube:this.pigSprites);
      const img = (m.hurtTimer > 0 || (m.fuse>0&&Math.sin(m.clock*(8+m.fuse*5))>0) ? sprites.hurt : sprites.frames)[frame];
      if(m.fuse>0){ctx.font='9px monospace';ctx.fillStyle='#ffe1a0';ctx.fillText(Math.max(1,Math.ceil(BOMBER_FUSE-m.fuse))+'s',Math.round(m.cx-6),Math.round(m.y-5));}
      const dx = Math.round(m.x + m.w / 2 - img.width / 2);
      const dy = Math.round(m.y + m.stepOffset + m.h - img.height);
      if (m.facing < 0) {
        ctx.save();
        ctx.translate(dx + img.width, dy);
        ctx.scale(-1, 1);
        ctx.drawImage(img, 0, 0);
        ctx.restore();
      } else {
        ctx.drawImage(img, dx, dy);
      }
    }
  }

  // Ferramentas e armas aparecem na mão; balançam enquanto o botão esquerdo está segurado
  drawHeldItem(game) {
    const slot = game.inventory.slots[game.selected];
    if (!slot) return;
    const def = ITEM_DEFS[slot.item];
    if (def.arco) { drawBowHeld(this.ctx, game); return; }
    if (def.tridente) { drawTridentHeld(this.ctx, game); return; }
    if (def.fishingRod) { drawFishingRod(this.ctx,game); return; }
    if (def.fishingCatch) { drawFishingCatch(this.ctx,game); return; }
    if (!def.ferramenta && !def.dano) return;
    const { ctx } = this;
    const p = game.player;
    const f = p.facing;
    const sx = Math.round(p.x + p.w / 2 - PLAYER_SPR_W / 2);
    const sy = Math.round(p.y + p.stepOffset + p.h - PLAYER_SPR_H);
    const bodyPose = PLAYER_POSES[playerFrame(p)];
    const hx = bodyPose.hands[1];
    const handX = f > 0 ? sx + hx : sx + PLAYER_SPR_W - hx;
    const handY = sy + bodyPose.sy + 10 + bodyPose.bob - bodyPose.handLift[1];
    const swing = 0.5 + 0.5 * Math.sin(game.swingTime * 14 - Math.PI / 2);
    // Engatinhando: a mão está no chão; o item fica deitado para a frente, rente ao chão (não cobre o
    // rosto nem cruza o corpo) e balança pouco
    const low = p.crouching;
    const angle = game.swinging ? lerp(low ? -0.35 : -1.3, low ? 0.55 : 1.1, swing) : low ? 0.4 : 0.2;
    ctx.save();
    ctx.translate(handX, handY - (low ? 3 : 0));
    ctx.scale(f, 1);
    ctx.rotate(angle);
    if (def.nailSkin!=null)drawEssenceNailHeld(ctx,slot.item);
    else if (slot.item === ITEM.ALPHA_CLAWS) drawAlphaClawsHeld(ctx);
    else if (def.dano) ctx.drawImage(this.tex.itemAtlas, slot.item * T, 0, T, T, -1.5, -15, 20, 20); // espadas um pouco maiores
    else {
      // Machado de emergência: espelhado no eixo do cabo (que no ícone está a 45°, e aqui
      // passa pelo punho em x=2.5), para andar com o fio virado para baixo e não para cima.
      if (slot.item === ITEM.EMERGENCY_AXE) {
        ctx.translate(2.5, 0);
        ctx.rotate(-Math.PI / 4); ctx.scale(1, -1); ctx.rotate(Math.PI / 4);
        ctx.translate(-2.5, 0);
      }
      ctx.drawImage(this.tex.itemAtlas, slot.item * T, 0, T, T, -1, -12, T, T);
    }
    ctx.restore();
  }

  drawParticles(particles) {
    const { ctx } = this;
    for (const p of particles) {
      if (p.glyph) { drawGlyph(ctx, p); continue; } // nota musical, Z de sono, "!" (gags de quem fica parado)
      ctx.fillStyle = p.color;
      ctx.globalAlpha = (p.maxLife ? Math.min(1,p.life/p.maxLife*2) : 1) * (p.alpha ?? 1);
      // Folha girando: o retângulo fica largo de perfil e estreito de lado, como uma folha rodando
      if (p.leaf !== undefined) {
        const face = Math.abs(Math.sin(p.leaf));
        const lw = 1 + Math.round(face * 2), lh = 1 + Math.round(1 - face);
        ctx.fillRect(Math.round(p.x), Math.round(p.y), lw, lh);
        ctx.globalAlpha = 1;
        continue;
      }
      const grow = p.grow ? Math.round(p.grow * (1 - p.life / p.maxLife)) : 0; // poeira abre enquanto some
      ctx.fillRect(Math.round(p.x - grow / 2), Math.round(p.y - grow / 2), (p.w || 2) + grow, (p.h || 2) + grow);
      ctx.globalAlpha = 1;
    }
  }

  drawCursor(game, z) {
    const { ctx } = this;
    const { tx, ty, inRange, visible } = game.target;
    if (!visible) return;
    const m = game.mining;
    if (m.progress > 0) drawTileCracks(ctx, m.tx, m.ty, m.wall ? 2 : 1, m.progress); // parede: o pincel 2x2 racha inteiro
    // Parede na mão: o cursor mostra o pincel de 2x2 que vai ser pintado
    const held = game.inventory.slots[game.selected];
    if (held && ITEM_DEFS[held.item].parede != null) {
      const [bx, by] = wallBrushOrigin();
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 1 / z;
      ctx.strokeRect(bx * T + 0.5 / z, by * T + 0.5 / z, 2 * T - 1 / z, 2 * T - 1 / z);
      return;
    }
    // Martelo na mão: pincel 2x2 da parede que vai sair (âmbar com o cursor inteligente)
    if (game.target.brush) {
      const [bx, by] = game.target.brush;
      ctx.strokeStyle = game.target.smart ? 'rgba(255,200,90,0.95)' : inRange ? 'rgba(255,255,255,0.8)' : 'rgba(255,80,80,0.6)';
      ctx.lineWidth = (game.target.smart ? 2 : 1) / z;
      const i = ctx.lineWidth / 2;
      ctx.strokeRect(bx * T + i, by * T + i, 2 * T - 2 * i, 2 * T - 2 * i);
      return;
    }
    // Cursor inteligente (Ctrl): moldura âmbar mais grossa no bloco escolhido sozinho
    if (game.target.smart) {
      ctx.strokeStyle = 'rgba(255,200,90,0.95)';
      ctx.lineWidth = 2 / z;
      ctx.strokeRect(tx * T + 1 / z, ty * T + 1 / z, T - 2 / z, T - 2 / z);
      ctx.fillStyle = 'rgba(255,200,90,0.12)';
      ctx.fillRect(tx * T, ty * T, T, T);
      return;
    }
    ctx.strokeStyle = inRange ? 'rgba(255,255,255,0.8)' : 'rgba(255,80,80,0.6)';
    ctx.lineWidth = 1 / z;
    ctx.strokeRect(tx * T + 0.5 / z, ty * T + 0.5 / z, T - 1 / z, T - 1 / z);
  }

  drawUI(game, W, H) {
    const { ctx } = this;
    // Interface em pixels da tela, independente da escala de outros medidores.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const pad = 12;
    ctx.textBaseline = 'alphabetic';

    // Aviso rápido: placa escura com bordas âmbar, abaixo da barra rápida e da vida
    if (game.toast.t > 0) {
      const a0 = ctx.globalAlpha, s = game.inventoryUI.scale();
      ctx.globalAlpha = a0 * Math.min(1, game.toast.t);
      ctx.font = '12px Silkscreen, monospace';
      const maxText=Math.max(1,Math.min(560,W-56));
      let lines=wrapTooltipText(ctx,game.toast.text,maxText);
      const maxLines=Math.max(1,Math.floor((H-24)/17));
      if(lines.length>maxLines)lines=lines.slice(0,maxLines-1).concat(game.inventoryUI.fitText(ctx,'Mais detalhes no guia [G]',maxText));
      const tw=Math.ceil(Math.max(...lines.map(t=>ctx.measureText(t).width)))+32,tx=Math.round((W-tw)/2),th=24+(lines.length-1)*17;
      const ty=Math.max(6,Math.min(UI.ORIGIN+(UI.HOTBAR_H+38)*s,H-th-6));
      ctx.fillStyle = UIC.outline; ctx.fillRect(tx - 3, ty - 3, tw + 6, th+6);
      ctx.fillStyle = 'rgba(27,32,39,0.95)'; ctx.fillRect(tx, ty, tw, th);
      ctx.fillStyle = UIC.lime; ctx.fillRect(tx, ty, 4, th); ctx.fillRect(tx + tw - 4, ty, 4, th);
      ctx.textAlign = 'center';
      lines.forEach((text,i)=>this.shadowText(text,W/2,ty+16+i*17,UIC.text));
      ctx.globalAlpha = a0;
    }

    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    this.helpTop = H - pad;
    if (game.showHelp) this.drawHelpPanel(W, H, pad);

    if (game.debug) {
      const p = game.player;
      const hours = Math.floor(((game.time + 0.25) % 1) * 24);
      const info = [
        `FPS: ${game.fps}`,
        `Pos: ${Math.floor(p.cx / T)}, ${Math.floor(p.cy / T)}`,
        `Seed: ${game.world.seed}`,
        `Hora: ${String(hours).padStart(2, '0')}h  Luz do dia: ${game.daylight.toFixed(2)}`,
        `Mundo: ${game.world.w}x${game.world.h}  Zoom: ${game.zoom}x`,
      ];
      ctx.textAlign = 'right';
      const top = pad + game.mapUI.minimapRect()[3] + 12;
      info.forEach((l, i) => this.shadowText(l, W - pad, top + 12 + i * 16));
    }

    // Hotbar / inventário e mapa por último, para ficar por cima de tudo
    game.inventoryUI.draw(ctx);
    game.mapUI.draw(ctx);
  }

  // Painel de controles no canto de baixo: teclas em "teclinhas" e o que cada uma faz.
  // Guarda em this.helpTop onde ele começa, para o objetivo ficar logo acima.
  drawHelpPanel(W, H, pad) {
    const { ctx } = this;
    const nCols = W < 760 ? 2 : 3; // tela estreita: duas colunas mais altas
    const perCol = Math.ceil(HELP_ROWS.length / nCols);
    const cols = Array.from({ length: nCols }, (_, i) => HELP_ROWS.slice(i * perCol, (i + 1) * perCol)).filter((c) => c.length);
    ctx.font = '11px monospace';
    const chipW = (k) => Math.ceil(ctx.measureText(k).width) + 9;
    const rowW = ([keys, what]) => keys.reduce((a, k) => a + chipW(k) + 3, 0) + 5 + Math.ceil(ctx.measureText(what).width);
    const colW = cols.map((c) => Math.max(...c.map(rowW)));
    const rowH = 16, padX = 11, padY = 9, headH = 15, gap = 20;
    const bw = padX * 2 + colW.reduce((a, w) => a + w, 0) + gap * (cols.length - 1);
    const bh = headH + padY + Math.max(...cols.map((c) => c.length)) * rowH;
    const x0 = pad, y0 = H - pad - bh;
    this.helpTop = y0;

    ctx.fillStyle = 'rgba(10,12,15,0.9)';
    ctx.fillRect(x0 - 2, y0 - 2, bw + 4, bh + 4);
    ctx.fillStyle = 'rgba(27,32,39,0.9)';
    ctx.fillRect(x0, y0, bw, bh);
    ctx.fillStyle = UIC.lime;
    ctx.fillRect(x0, y0, 3, bh);
    ctx.fillStyle = 'rgba(86,97,107,0.5)';
    ctx.fillRect(x0 + 3, y0 + headH - 3, bw - 6, 1);

    ctx.textAlign = 'left';
    ctx.font = '9px Silkscreen, monospace';
    this.shadowText('CONTROLES', x0 + padX, y0 + 11, UIC.limeBright);
    ctx.textAlign = 'right';
    this.shadowText('H ESCONDE', x0 + bw - padX, y0 + 11, UIC.textDim);

    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    cols.forEach((col, ci) => {
      const cx = x0 + padX + colW.slice(0, ci).reduce((a, w) => a + w + gap, 0);
      col.forEach(([keys, what], ri) => {
        let kx = cx;
        const ky = y0 + headH + padY + ri * rowH;
        for (const k of keys) {
          const w = chipW(k);
          ctx.fillStyle = '#0a0c0f';
          ctx.fillRect(kx - 1, ky - 10, w + 2, 15);
          ctx.fillStyle = '#d9cfb8';
          ctx.fillRect(kx, ky - 9, w, 12);
          ctx.fillStyle = '#9d9278';
          ctx.fillRect(kx, ky + 1, w, 2);
          ctx.fillStyle = '#1a130b';
          ctx.fillText(k, kx + 5, ky);
          kx += w + 3;
        }
        this.shadowText(what, kx + 5, ky, UIC.textSoft);
      });
    });
  }

  shadowText(text, x, y, color = '#fff') {
    const { ctx } = this;
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillText(text, x + 1, y + 1);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }

  // Objetivo atual e dica de interação, acima da ajuda de controles
  drawObjective(game, W, H) {
    const { ctx } = this;
    const base = (this.helpTop ?? H - 12) - 12; // logo acima do painel de controles
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = UIC.outline; ctx.fillRect(13, base - 25, 7, 7);
    ctx.fillStyle = UIC.lime; ctx.fillRect(14, base - 24, 5, 5);
    ctx.font = '10px Silkscreen, monospace';
    this.shadowText('OBJETIVO', 25, base - 18, UIC.lime);
    ctx.font = '12px monospace';
    this.shadowText(game.objective, 14, base, UIC.text);

    const prompt = crashPrompt(game);
    if (!prompt) return;
    ctx.font = '10px Silkscreen, monospace';
    const tw = Math.ceil(ctx.measureText(prompt).width);
    ctx.fillStyle = 'rgba(10,12,15,0.82)'; ctx.fillRect(12, base - 56, tw + 20, 20);
    ctx.fillStyle = UIC.lime; ctx.fillRect(12, base - 56, 3, 20);
    ctx.fillStyle = UIC.limeBright; ctx.fillText(prompt, 22, base - 42);
  }
}

// Desenhinhos em pixel para partículas (com sombra escura para aparecer em qualquer fundo)
const GLYPHS = {
  note: ['..##.', '..#.#', '..#..', '###..', '##...'],
  z: ['####', '..#.', '.#..', '####'],
  '!': ['#', '#', '#', '.', '#'],
};
function drawGlyph(ctx, p) {
  const rows = GLYPHS[p.glyph], k = p.life / p.maxLife;
  const x = Math.round(p.x + Math.sin(p.life * 5 + (p.wobble || 0)) * 2), y = Math.round(p.y);
  ctx.globalAlpha = Math.min(1, k * 2.5);
  for (const [color, d] of [['rgba(20,16,24,0.7)', 1], [p.color, 0]])
    rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) if (row[i] === '#') { ctx.fillStyle = color; ctx.fillRect(x + i + d, y + j + d, 1, 1); }
    });
  ctx.globalAlpha = 1;
}
