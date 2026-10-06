'use strict';

// Pixel art pré-carregada uma vez; o cursor nativo continua independente do FPS.
const GameCursor = (() => {
  const names = ['default','aim','pointer','grab','picareta','machado','pa','martelo','attack','build','net','use','blocked','text'];
  const sprites = {};
  const size = 32;
  const fallback = name => ({ aim:'crosshair', pointer:'pointer', grab:'grabbing', text:'text', blocked:'not-allowed' }[name] || 'default');
  for (const name of names) sprites[name] = { css: fallback(name), image: null };
  const style = document.createElement('style');
  document.head.appendChild(style);
  function applyStyles() {
    style.textContent = `body { cursor: ${sprites.default.css}; }
      :is(#menu-root,#admin-panel,#bestiary,#npc-services) :is(button,select,label,input[type=range]), #admin-toggle,
      #menu-root button canvas { cursor: ${sprites.pointer.css} !important; }
      :is(#menu-root,#admin-panel,#bestiary,#npc-services) :is(input:not([type=range]):not([type=checkbox]),textarea) { cursor: ${sprites.text.css} !important; }
      :is(#menu-root,#admin-panel,#bestiary,#npc-services) :disabled { cursor: ${sprites.blocked.css} !important; }`;
  }
  function hotspot(ctx, name) {
    if (['aim','grab','build','use','blocked','text'].includes(name)) return [size/2,size/2];
    // Ponta visível do sprite, alinhada à grade de pixels.
    const rgba = ctx.getImageData(0,0,size,size).data;
    for (let y=0;y<size;y++) {
      let sum=0, count=0;
      for (let x=0;x<size;x++) if (rgba[(y*size+x)*4+3]>160) {sum+=x;count++;}
      if(count) return [Math.round(sum/count),y];
    }
    return [size/2,size/2];
  }
  const ready = Promise.all(names.map(async name => {
    const source = new Image();
    source.src = `assets/cursors/pixel/${name}.png?v=3`;
    try {
      await source.decode();
      const image = document.createElement('canvas'); image.width=image.height=size;
      const ctx=image.getContext('2d');
      ctx.imageSmoothingEnabled=false;
      ctx.drawImage(source,0,0,size,size);
      const [hx,hy]=hotspot(ctx,name);
      sprites[name]={image,source,hotspot:[hx,hy],css:`url("${image.toDataURL()}") ${hx} ${hy}, ${fallback(name)}`};
    } catch (error) {
      console.warn(`[cursor] Arte indisponível: ${name}`,error);
    }
  })).then(() => {
    applyStyles();
    const surface=document.getElementById('game');
    // Invalida o cache mesmo quando o mouse ficou parado durante a carga.
    if(surface) { surface.dataset.cursor=''; surface.style.cursor=sprites.default.css; }
  });
  applyStyles();

  function choose(g, input) {
    if (g.paused || g.intro?.active || g.npcOpen || g.adminOpen) return 'default';
    const {x,y} = input.mouse, ui = g.inventoryUI;
    if (ui.held) return 'grab';
    const hit = ui.hitTest(x,y);
    if (hit) return hit.type === 'search' ? 'text' : hit.type === 'panel' || hit.type === 'roarStatus' ? 'default' : 'pointer';
    if (g.mapUI.capturesMouse(x,y)) return g.mapUI.open ? (g.mapUI.drag ? 'grab' : 'pointer') : 'pointer';
    const d = ITEM_DEFS[g.inventory.slots[g.selected]?.item];
    if (d?.arco || d?.tridente) return 'aim';
    if (d?.puca) return 'net';
    if (d?.dano) return 'attack';
    if (d?.cura || d?.folego || d?.vidaMaxima || d?.mel || d?.chamado || d?.roupa || d?.criatura || d?.bossSummon) return 'use';
    const m = screenToWorld(x,y), tx = Math.floor(m.x/T), ty = Math.floor(m.y/T);
    const tile = g.world.getTile(tx,ty);
    const inReach = Math.hypot((tx+.5)*T-g.player.cx,(ty+.5)*T-g.player.cy) <= REACH*T;
    if (isDoor(tile) || tile === TILE.CHEST) return inReach ? 'pointer' : 'blocked';
    if (d?.ferramenta) {
      if (g.target.visible && !g.target.inRange) return 'blocked';
      return sprites[d.ferramenta] ? d.ferramenta : 'default';
    }
    if (d?.place != null || d?.parede != null) return inReach ? 'build' : 'blocked';
    return 'default';
  }
  function update(g,input,canvas) {
    const name = choose(g,input);
    if (canvas.dataset.cursor === name) return;
    canvas.dataset.cursor = name;
    canvas.style.cursor = sprites[name].css;
  }
  return { sprites, choose, update, ready };
})();
