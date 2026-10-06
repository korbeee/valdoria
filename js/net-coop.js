'use strict';
// A simulação pertence ao anfitrião; cada jogador abre uma área de atividade no mundo.
function netWorldPlayers(g) {
  const players = [NET.room && NET.isHost && !g.netSpawnContext ? player : g.player];
  if (NET.room && NET.isHost) for (const p of NET.peers.values())
    if (p.seen && p.hp > 0) players.push(p);
  return players.filter(p => (p.hp ?? 100) > 0);
}
function netWithPlayer(g, p, run) {
  const local = g.player, god = g.adminGod, pending = g.respawnPending;
  const remote=NET.room&&NET.isHost&&p instanceof NetPeer;
  const before={vx:p.vx,vy:p.vy,pullT:p.pullT,pullVx:p.pullVx,venom:JSON.stringify(p.venom)};
  g.player = p;
  if (remote) { g.adminGod = p.god; g.respawnPending = null; }
  try { return run(); } finally {
    g.player = local; g.adminGod = god;
    if(remote) {
      g.respawnPending = pending;
      if(NET.room&&NET.isHost) {
        const motion={};
        for(const key of ['vx','vy','pullT','pullVx'])if(p[key]!==before[key]&&Number.isFinite(p[key]))motion[key]=p[key];
        if(JSON.stringify(p.venom)!==before.venom)motion.venom=netPlain(p.venom)||null;
        if(Object.keys(motion).length)netRelay({k:'control',motion},p.cid);
      }
    }
  }
}
function netPlain(value, depth = 0) {
  if (value == null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (depth > 6 || typeof value !== 'object' || value instanceof Set || value instanceof Map) return undefined;
  if (Array.isArray(value)) return value.slice(0, 512).map(v => netPlain(v, depth + 1));
  if (Object.getPrototypeOf(value) !== Object.prototype) return undefined;
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (['habitat', 'm', 'mob', 'player', 'world', 'def', 'rider', 'hit'].includes(k)) continue;
    const copy = netPlain(v, depth + 1); if (copy !== undefined) out[k] = copy;
  }
  return out;
}
const NET_SHARED_FX = ['spiderShots','spiderWebs','spiderEggs','spiderFx','beetleShots','beetleRocks','beetleFx','aveStrikes','aveBolts','aveBlades','aveImpacts','nucleoShots','nucleoRain','coreShots','explosions','bearFalls'];
const NET_PROGRESS = ['tigerSlain','spiderSlain','beetleSlain','bearSlain','yetiSlain'];
function netEncounterView() {
  const progress = {}; for (const k of NET_PROGRESS) progress[k] = game[k];
  const lasso=game.spiderLasso?{...netPlain(game.spiderLasso),mid:game.spiderLasso.m.netId}:null;
  return { boss: game.boss?.netId ?? null, progress, story: netPlain(storyState(game)), lasso,
    fx: Object.fromEntries(NET_SHARED_FX.map(k => [k, netPlain(game[k] || [])])) };
}
function netApplyEncounter(d) {
  if (!d.encounter) return;
  const e = d.encounter;
  Object.assign(game, e.progress); Object.assign(storyState(game), e.story);
  for (const k of NET_SHARED_FX) game[k] = e.fx?.[k] || [];
  game.boss = game.mobs.find(m => m.netId === e.boss) || null;
  const owner=game.mobs.find(m=>m.netId===e.lasso?.mid);
  game.spiderLasso=e.lasso&&owner?{...e.lasso,m:owner}:null;
}
function netActionView() {
  netVisualIds();
  return { tool: netPlain(game.toolAction), sword: netPlain(game.sword), trident: netPlain(game.trident), bow: netPlain(game.bow),
    arrows:netPlain((game.arrows||[]).slice(-64)),aim:screenToWorld(input.mouse.x,input.mouse.y),ammo:game.inventory.count(ITEM.ARROW) };
}
function netPlayerMotion(p) {
  const out={};
  for(const key of ['anim','visualTime','jumpAge','landTimer','crouchAge','swimming','swimStroking','swimAnim','seat','gag','flying','flightGliding','flightSide','flightTilt','flightUsed','jetFuel','flightItem']) {
    const value=netPlain(p[key]); if(value!==undefined)out[key]=value;
  }
  return out;
}
function netEquipmentView() {
  return {outfit:game.outfit||null,outfitVisual:PLAYER_OUTFIT||null,accessories:netPlain(playerAccessories(game)),
    fuel:game.inventory.count(ITEM.FLIGHT_FUEL),mounted:!!game.mount,
    clock:game.clock,block:netPlain(game.block),parryFlash:game.parryFlash||0,cloakCharged:!!game.cloakCharged};
}
function netPeerAnimation(p) {
  const a=p.renderAction||p.action||{}, elapsed=NET.worldPaused?0:p.actionElapsed??Math.min(.1,Math.max(0,performance.now()/1000-(p.actionAt||0)));
  const equipment=p.renderEquipment||p.equipment;
  const tool=a.tool?{...a.tool,t:Math.min(a.tool.duration,a.tool.t+elapsed)}:null;
  const sword=a.sword?{...a.sword,t:a.sword.t+elapsed*(a.sword.speed||1)}:{active:false};
  const bow=a.bow?{...a.bow,charge:Math.min(1,a.bow.charge+(a.bow.charging?elapsed/BOW.charge:0))}:null;
  const pair=p.renderPair,next=pair?.b,k=pair?.k??0;
  let trident=null;
  if(a.trident){
    trident={...a.trident};
    if(trident.anim)trident.anim={...trident.anim,t:trident.anim.t+elapsed*(trident.anim.speed||1)};
    for(const key of ['bolts','fx','puddles'])trident[key]=netVisualList(a.trident[key],next?.trident?.[key],k,elapsed);
    if(trident.thrown)trident.thrown=netVisualList([trident.thrown],next?.trident?.thrown?[next.trident.thrown]:[],k,elapsed)[0];
  }
  const inventory={slots:[p.item!=null?{item:p.item,count:1}:null],count:id=>id===ITEM.ARROW?(a.ammo||0):id===ITEM.FLIGHT_FUEL?(equipment?.fuel||0):0};
  return {...equipment,clock:(equipment?.clock||0)+elapsed,player:p,toolAction:tool,sword,trident,bow,arrows:netVisualList(a.arrows,next?.arrows,k,elapsed),
    world:game.world,netAim:a.aim,inventory,inventoryUI:{inv:inventory},selected:0,swinging:false,swingTime:0,mount:equipment?.mounted?{}:null};
}
function netPeerFrame(p) {
  const g=netPeerAnimation(p);
  return g.toolAction?toolBodyFrame(g):g.sword.active?playerAttackFrame(p,g.sword):g.trident?.anim?tridentBodyFrame(g):p.frame;
}
function netDrawAction(ctx, p) {
  const a = p.action; if (!a) return false;
  const g = netPeerAnimation(p), look = PLAYER_LOOK, outfit=PLAYER_OUTFIT;
  PLAYER_OUTFIT=p.outfitVisual||null;
  if(p.look) applyLookToPalette(sanitizeLook(p.look));
  try {
  drawArrows(ctx,g); drawTridentEffects(ctx,g);
  if (g.toolAction) { drawToolAction(ctx, g, renderer.tex.itemAtlas); return true; }
  if (g.sword.active) {
    drawSwordTrail(ctx, g.sword, p);
    const pose = swordPose(g), colors = renderer.armColors;
    renderer.armColors = null;
    try { renderer.drawSwordArm(pose,g.sword,ctx); } finally { renderer.armColors = colors; }
    return true;
  }
  if (g.trident?.anim) { drawTridentHeld(ctx, g); return true; }
  if (g.bow?.charging) { drawBowHeld(ctx, g); return true; }
  return false;
  } finally { PLAYER_OUTFIT=outfit;applyLookToPalette(look); }
}
function netDrawPeer(ctx,p) {
  const g=netPeerAnimation(p), outfit=PLAYER_OUTFIT;
  const atlas=renderer.playerAtlas, colors=renderer.armColors, previousCtx=renderer.ctx;
  ctx.save();
  try {
    renderer.playerAtlas=netPeerAtlas(p);renderer.ctx=ctx;renderer.armColors=null;
    PLAYER_OUTFIT=p.outfitVisual||null;applyLookToPalette(sanitizeLook(p.look||PLAYER_LOOK));
    drawBossAurasBehind(ctx,g);drawShield(ctx,g);drawFlightEquipment(ctx,g);
    const pose=swordPose(g);
    renderer.drawPlayer(p,pose,g.sword,g);
    if(!netDrawAction(ctx,p)&&Math.abs(p.swimTilt||0)<.3&&Math.abs(p.flightTilt||0)<.3&&!p.gag)renderer.drawHeldItem(g);
  } finally {
    renderer.ctx=previousCtx;renderer.playerAtlas=atlas;renderer.armColors=colors;
    PLAYER_OUTFIT=outfit;applyLookToPalette(PLAYER_LOOK);ctx.restore();
  }
}
function netSpawnForPlayer(g, base, args, key) {
  if (NET.guest) return false;
  if (!NET.room || g.netSpawnContext) return base(g, ...args);
  const players = mobPlayers(g); if (!players.length) return false;
  g.netSpawnTurn ??= {};
  const p = players[(g.netSpawnTurn[key] = (g.netSpawnTurn[key] ?? -1) + 1) % players.length];
  const view = p.view || { x: p.cx - canvas.width / g.zoom / 2, y: p.cy - canvas.height / g.zoom / 2 };
  const context = Object.assign(Object.create(g), {player:p,cam:view,netSpawnContext:true,
    mobs:g.mobs.filter(m => m.boss || Math.hypot(m.cx-p.cx,m.cy-p.cy)<85*T)});
  const before = new Set(context.mobs), result = base(context, ...args);
  for (const m of context.mobs) if (!before.has(m)) g.mobs.push(m);
  return result;
}
window.addEventListener('DOMContentLoaded', () => {
  const damage = damageMonsterPlayer;
  damageMonsterPlayer = function(g, amount, x, opts = {}) {
    const p = g.player;
    if (NET.isHost && NET.room && p !== player) {
      if (!p.god && p.hp > 0 && p.invulnerable <= 0) {
        p.invulnerable = opts.pierce ? .3 : 1;
        netRelay({k:'hurt',damage:amount,x,opts}, p.cid);
      }
      return;
    }
    return damage(g, amount, x, opts);
  };
  const relay = netOnRelay;
  netOnRelay = function(from, d) {
    if (NET.room && d?.k === 'hurt' && NET.guest && from === NET.hostCid) {
      if (player.invulnerable <= 0) damage(game, d.damage, d.x, d.opts); return;
    }
    if (NET.room && d?.k === 'push' && NET.guest && from === NET.hostCid) {
      if(d.dx) player.moveX(d.dx,game.world); if(d.dy) player.moveY(d.dy,game.world); return;
    }
    if(NET.room&&d?.k==='control'&&NET.guest&&from===NET.hostCid) { Object.assign(player,d.motion); return; }
    if (NET.room && d?.k === 'fx') {
      NET.applying = true;
      try {
        if (d.type === 'tool' && TILE_DEFS[d.s.tile]) { toolDebris(game,d.s); toolImpactFlash(d.s); }
        if (d.type === 'break' && TILE_DEFS[d.tile]) spawnBreakBurst(d.tx,d.ty,d.tile,d.scale);
      } finally { NET.applying = false; }
      return;
    }
    return relay(from, d);
  };
  for (const key of ['trySpawnPig','trySpawnMonster','trySpawnSkyCreature','trySpawnCoreCreature']) {
    const base = window[key]; if (typeof base !== 'function') continue;
    window[key] = (g,...args) => netSpawnForPlayer(g,base,args,key);
  }
  for (const key of ['spawnAve','spawnNucleo','spawnYeti']) {
    const base = window[key]; if (typeof base === 'function') window[key] = (...args) => NET.guest ? false : base(...args);
  }
  const aquatic = updateAquaticSpawns;
  updateAquaticSpawns = function(g, dt) {
    if (!NET.room) return aquatic(g,dt);
    if (NET.guest) return;
    g.mobs = g.mobs.filter(m => !m.def?.aquatic || mobNearPlayer(g,m,AQUATIC_RANGE*T));
    if ((g.aquaticTimer = (g.aquaticTimer ?? 1)-dt)>0) return;
    g.aquaticTimer = 1.2+Math.random();
    netSpawnForPlayer(g, (context) => { context.aquaticTimer=0; return aquatic(context,0); }, [], 'aquatic');
  };
  const yeti = updateYetiEvent;
  updateYetiEvent = function(g, dt) {
    if (NET.guest) return;
    const p = mobPlayers(g).find(p => netWithPlayer(g,p,() => strongYetiWeather(g))) || g.player;
    return netWithPlayer(g,p,() => yeti(g,dt));
  };
  const impact = toolImpactFlash, burst = spawnBreakBurst;
  toolImpactFlash = function(s) { impact(s); if(NET.room&&!NET.applying) netRelay({k:'fx',type:'tool',s:netPlain(s)}); };
  spawnBreakBurst = function(tx,ty,tile,scale=1) { burst(tx,ty,tile,scale); if(NET.room&&!NET.applying) netRelay({k:'fx',type:'break',tx,ty,tile,scale}); };
});
