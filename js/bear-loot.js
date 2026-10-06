'use strict';

// =====================================================================================
//  ESPÓLIO DO PATRIARCA  —  o que cai de Bramido (js/bear.js)
// =====================================================================================
// Nove peças, cada uma com um jeito próprio de jogar: duas armas, uma capa, dois
// acessórios de equipar, dois consumíveis, um item reutilizável e um troféu de parede.

Object.assign(ITEM, {
  ALPHA_CLAWS: 162, PATRIARCH_HIDE: 163, BROKEN_FANG: 164, WILD_HEART: 165,
  SEISMIC_PAW: 166, BOTTLED_ROAR: 167, ANCIENT_HONEY: 168, CUB_SPIRIT: 169, ALPHA_TROPHY: 170,
  SUCCULENT_MEAT: 189,
});
Object.assign(TILE, { ALPHA_TROPHY: 92 });
defItem(ITEM.SUCCULENT_MEAT, {
  name: 'Carne Suculenta', bossItem: true, maxStack: 20,
  descricao: 'Obtida de Bramido, o Patriarca. Solte uma unidade (Q) no chão perto do Tigre da Savana adormecido para acordá-lo. A isca é devolvida se a luta reiniciar.',
  bossHelp: ['Obtida ao derrotar Bramido, o Patriarca.', 'Na savana, encontre o tigre adormecido.', 'Selecione a carne e solte uma unidade (Q) perto dele.', 'A isca volta se você morrer ou abandonar a luta.'],
});
ITEM_ART[ITEM.SUCCULENT_MEAT] = {
  cores: { k:[49,22,32], d:[111,36,45], r:[183,62,65], h:[236,111,102], f:[255,212,165], w:[255,241,207], g:[199,145,65] },
  pixels: ['................','.....kkkkkk.....','...kkffffffk....','..kffhhrrrffk...','.kfhrrddrrrhfk..','.khrddrrddrrhfk.','.khrdrrhrrdrrfk.','.kfrrrhfhrrdrfk.','..kfrrhwhrrrhfk.','..kdffhhhrrhfk..','...kddfffffdk...','....kkddddkk....','......kkkk......','...g........g...','..gwg......gwg..','...g........g...'],
};

// `sangra` = a cada três golpes seguidos no mesmo bicho, ele sai sangrando
defItem(ITEM.ALPHA_CLAWS, {
  name: 'Garras do Alfa', dano: 11, rapidez: 1.55, alcance: 24, maxStack: 1,
  sangra: { golpes: 3, dano: 4, tempo: 4 },
  descricao: 'Golpes rápidos. O terceiro seguido no mesmo bicho abre um corte que sangra.',
});
defItem(ITEM.PATRIARCH_HIDE, {
  name: 'Pele do Patriarca', roupa: { defesa: 0.32, visual: 'bear', empurrao: 0.35 }, maxStack: 1,
  descricao: 'Capa pesada: segura 32% do dano e quase todo o empurrão.',
});
defItem(ITEM.BROKEN_FANG, {
  name: 'Presa Partida', acessorio: { cheio: 1.45 }, maxStack: 1,
  descricao: 'No cinto: +45% de dano em bicho com a vida cheia. Bom para abrir a briga.',
});
defItem(ITEM.WILD_HEART, { name: 'Coração Selvagem', vidaMaxima: 25, maxStack: 1,
  descricao: 'Comer aumenta a vida máxima, como o coração do tigre.' });
defItem(ITEM.SEISMIC_PAW, {
  name: 'Pata Sísmica', dano: 18, rapidez: 0.55, alcance: 30, maxStack: 1, sismica: true,
  descricao: 'Lenta e pesada. Cada golpe bate no chão e manda uma onda curta para a frente.',
});
defItem(ITEM.BOTTLED_ROAR, {
  name: 'Rugido Engarrafado', acessorio: { rugido: true }, rugido: { raio: 9, empurrao: 420, espera: 30 }, maxStack: 1,
  descricao: 'Equipado: ao receber dano, empurra os bichos próximos. Recarga de 30 s. Chefes resistem.',
});
defItem(ITEM.ANCIENT_HONEY, {
  name: 'Mel Ancestral', mel: { total: 30, porSegundo: 3 },
  descricao: 'Recupera vida aos poucos. Levar pancada corta o efeito.',
});
defItem(ITEM.CUB_SPIRIT, {
  name: 'Espírito do Filhote', acessorio: { filhote: true }, maxStack: 1,
  descricao: 'No cinto: um ursinho de fumaça anda com você. Só enfeite.',
});
defItem(ITEM.ALPHA_TROPHY, { name: 'Troféu do Alfa', place: TILE.ALPHA_TROPHY, maxStack: 1,
  descricao: 'A cabeça do Patriarca para pendurar na parede.' });

defTile(TILE.ALPHA_TROPHY, {
  name: 'Troféu do Alfa', solid: false, hardness: 0.6, drop: ITEM.ALPHA_TROPHY,
  ferramenta: 'machado', opacity: 1, apoio: 'parede', color: [110, 78, 56],
});
buildFlatTiles();

// ---------- Ícones ----------
ITEM_ART[ITEM.ALPHA_CLAWS] = { cores: {"d":[39,34,43],"s":[77,79,92],"S":[123,139,151],"l":[180,196,193],"w":[245,235,204],"g":[193,129,55],"G":[255,204,102],"b":[93,53,37],"B":[146,88,47],"c":[69,123,137],"C":[126,208,219]}, pixels: ["................","..........w.....","......w..wl.....",".....wl..wS..w..",".....wS..lS.wl..","....wl..lS..wS..","....wS..lS.lS...","....lS..sS.lS...","...gGGggGGggGg..","...gBBSBBSBBBg..","...dbBBbBBbBd...","....dbBBBBbd....",".....dbBBbd.....","......dddd......","................","................"] };
ITEM_ART[ITEM.PATRIARCH_HIDE] = { // a pele esticada: cabeça em cima, quatro patas abertas
  cores: { d: [50, 34, 24], D: [110, 78, 52], L: [148, 110, 74], k: [228, 206, 152] },
  pixels: [
    '................', '......ddd.......', '.....dDDDd......', '.....dDkDd......',
    '......dDd.......', '..dd..DLD..dd...', '.dDDddDLDddDDd..', '.dDDDDDLDDDDDd..',
    '..dDDDDLDDDDd...', '..dDDDDLDDDDd...', '.dDDddDLDddDDd..', '.dDDd.DLD.dDDd..',
    '..dd..DLD..dd...', '......ddd.......', '................', '................',
  ],
};
ITEM_ART[ITEM.BROKEN_FANG] = { // presa quebrada no meio, pendurada num cordão
  cores: { c: [112, 84, 56], f: [222, 216, 196], F: [252, 250, 242] },
  pixels: [
    '................', '...ccccccccc....', '...c.......c....', '....c.....c.....',
    '.....c...c......', '......fff.......', '.....ffFff......', '.....ffFff......',
    '.....ffFff......', '......fFf.......', '......fFf.......', '.......ff.......',
    '......f.f.......', '.....f...f......', '................', '................',
  ],
};
ITEM_ART[ITEM.WILD_HEART] = { // coração grande e vermelho-escuro, batendo
  cores: { h: [112, 24, 28], H: [186, 48, 44], L: [238, 122, 96] },
  pixels: [
    '................', '..hh......hh....', '.hHHh....hHHh...', 'hHHHHh..hHHHHh..',
    'hHHLHHhhHHHHHh..', 'hHHLHHHHHHHHHh..', 'hHHHHHHHHHHHHh..', '.hHHHHHHHHHHh...',
    '..hHHHHHHHHh....', '...hHHHHHHh.....', '....hHHHHh......', '.....hHHh.......',
    '......hh........', '................', '................', '................',
  ],
};
ITEM_ART[ITEM.SEISMIC_PAW] = { cores: {"d":[39,34,43],"s":[77,79,92],"S":[123,139,151],"l":[180,196,193],"w":[245,235,204],"g":[193,129,55],"G":[255,204,102],"b":[93,53,37],"B":[146,88,47],"c":[69,123,137],"C":[126,208,219]}, pixels: ["................","...ss..ss..ss...","..sllssllsslls..","..slwSSlwSSlws..",".sSSSGSSGSSSSs..",".sSGGSddSGGSSs..",".sSSGdGGdGSSSs..","..sSSdGGdSSSs...","...ssSGGSsss....",".....gGGg.......","......bB........","......gG........","......bB........","......gG........",".....dBBd.......","................"] };
ITEM_ART[ITEM.BOTTLED_ROAR] = { cores: {"d":[39,34,43],"s":[77,79,92],"S":[123,139,151],"l":[180,196,193],"w":[245,235,204],"g":[193,129,55],"G":[255,204,102],"b":[93,53,37],"B":[146,88,47],"c":[69,123,137],"C":[126,208,219]}, pixels: ["................","......bBBb......","......gGGg......","......cCCc......",".....cCwwCc.....","....cCSggSCc....","...cCSgGGgSCc...","...cwSGlSGSCc...","...cwSGSGGSCc...","...cCSGGgSSCc...","...cCSSggSSCc...","....cCSSSSCc....","....gcCCCCcg....",".....gGGGg......","......ddd.......","................"] };
ITEM_ART[ITEM.ANCIENT_HONEY] = { // pote de mel com tampa de pano
  cores: { c: [190, 164, 112], g: [150, 110, 52], m: [230, 168, 44], M: [252, 218, 122] },
  pixels: [
    '................', '.....ccccc......', '....cccccccc....', '.....ggggg......',
    '....gmmmmmg.....', '...gmmmmmmmg....', '...gmMmmmMmg....', '...gmmmmmmmg....',
    '...gmmMmmmmg....', '...gmmmmmmmg....', '...gmmmmMmmg....', '...gmmmmmmmg....',
    '....gmmmmmg.....', '.....ggggg......', '................', '................',
  ],
};
ITEM_ART[ITEM.CUB_SPIRIT] = { // ursinho de fumaça, barriga clara e patas se esvaindo
  cores: { s: [86, 72, 116], S: [146, 128, 188], m: [196, 184, 236], w: [240, 234, 255] },
  pixels: [
    '................', '....ss....ss....', '....sSs..sSs....', '...sSSssssSSs...',
    '...sSSSSSSSSs...', '...sSwSSSSwSs...', '...sSSSmmSSSs...', '....sSSSSSSs....',
    '.....sSSSSs.....', '...sSSSSSSSSs...', '..sSSmmmmmmSSs..', '..sSSmmmmmmSSs..',
    '..sSSSmmmmSSSs..', '...sSs.ss.sSs...', '....s..ss..s....', '................',
  ],
};
ITEM_ART[ITEM.ALPHA_TROPHY] = { // a cabeça do Patriarca pregada numa placa de madeira
  cores: { p: [78, 52, 30], P: [136, 96, 58], b: [52, 36, 26], B: [104, 72, 48],
    w: [242, 202, 92], m: [180, 152, 122] },
  pixels: [
    '................', '..ppppppppppppp.', '..pPPPPPPPPPPPp.', '..pPP.bb.bb.PPp.',
    '..pPbbBBBBbbPPp.', '..pPbBBBBBBbPPp.', '..pPbBwBBwBbPPp.', '..pPbBBBBBBbPPp.',
    '..pPbBBmmBBbPPp.', '..pPPbBmmBbPPPp.', '..pPPPbbbbPPPPp.', '..pPPPPPPPPPPPp.',
    '..ppppppppppppp.', '................', '................', '................',
  ],
};
MATERIAL_TEX[TILE.ALPHA_TROPHY] = flatFromArt(ITEM_ART[ITEM.ALPHA_TROPHY]);

// Troféu de parede com escala própria: placa em escudo e a cabeça real do chefe.
// A âncora 2×2 usa o mesmo posicionamento, apoio e remoção dos quadros da casa.
const ALPHA_TROPHY_SPRITE = (() => {
  const c=makeCanvas(32,32),ctx=c.getContext('2d');
  const dot=(x,y,color)=>{ctx.fillStyle=rgb(color);ctx.fillRect(x,y,1,1);};
  const edge=[48,29,25],rim=[145,101,55],light=[192,146,80],wood=[94,57,35];
  for(let y=3;y<=29;y++) {
    const inset=y<21?0:Math.floor((y-20)*1.2),left=3+inset,right=28-inset;
    for(let x=left;x<=right;x++){
      const border=x===left||x===right||y===3||y===29;
      const bevel=x===left+1||x===right-1||y===4;
      dot(x,y,border?edge:bevel?(x<16||y===4?light:rim):((x+y*2)%7===0?[109,67,39]:wood));
    }
  }
  // Recorte em pixels da cabeça, com pescoço curto e sombreado sobre a madeira.
  const a=BEAR_SHEET_FRAMES[0];
  for(let y=10;y<=32;y++)for(let x=53;x<a.w;x++){
    if(x<56&&y<14)continue;
    const n=parseInt(a.rows[y][x],16);if(!n)continue;
    dot(x-49+1,y-6+1,edge);
  }
  for(let y=10;y<=32;y++)for(let x=53;x<a.w;x++){
    if(x<56&&y<14)continue;
    const n=parseInt(a.rows[y][x],16);if(n)dot(x-49,y-6,BEAR_SHEET_PALETTE[n]);
  }
  for(const x of [6,25]){dot(x,6,light);dot(x,7,edge);}
  return c;
})();
FURNITURE[TILE.ALPHA_TROPHY]={w:2,h:2,sprite:()=>ALPHA_TROPHY_SPRITE};
TILE_DRAW[TILE.ALPHA_TROPHY]=(ctx,world,x,y)=>drawFurnitureCell(ctx,world,x,y);
iconFromSprite(TILE.ALPHA_TROPHY,ALPHA_TROPHY_SPRITE);
delete ITEM_ART[ITEM.ALPHA_TROPHY]; // inventário e item no chão usam a miniatura da placa nova

// Chances de cada peça. A lista vira os drops do chefe em js/bear.js.
const BEAR_LOOT = [
  { item: ITEM.SUCCULENT_MEAT, chance: 1, min: 1, max: 1 },
  { item: ITEM.PATRIARCH_HIDE, chance: 1, min: 1, max: 1 },
  { item: ITEM.BROKEN_FANG, chance: 1, min: 1, max: 1 },
  { item: ITEM.WILD_HEART, chance: 1, min: 1, max: 1 },
  { item: ITEM.ANCIENT_HONEY, chance: 1, min: 15, max: 15 },
  { item: ITEM.ALPHA_TROPHY, chance: 1, min: 1, max: 1 },
  { item: ITEM.ALPHA_CLAWS, chance: 0.5, min: 1, max: 1 },
  { item: ITEM.BOTTLED_ROAR, chance: 0.5, min: 1, max: 1 },
  { item: ITEM.SEISMIC_PAW, chance: 0.1, min: 1, max: 1 },
  { item: ITEM.CUB_SPIRIT, chance: 0.1, min: 1, max: 1 },
];

// ---------- Acessórios ----------
// Cinco acessórios no painel de equipamento (js/inventory-ui.js).
const ACCESSORY_SLOTS = 5;
function playerAccessories(g) {
  g.accessories ??= Array(ACCESSORY_SLOTS).fill(null);
  while(g.accessories.length<ACCESSORY_SLOTS)g.accessories.push(null);
  return g.accessories;
}
const hasAccessory = (g, item) => playerAccessories(g).some((s) => s && s.item === item);
function accessoryPower(g, key) {
  let best = 0;
  for (const s of playerAccessories(g)) {
    const v = s && ITEM_DEFS[s.item]?.acessorio?.[key];
    if (typeof v === 'number' && v > best) best = v;
    else if (v === true) best = Math.max(best, 1);
  }
  return best;
}

// A defesa exibida e aplicada usa a mesma composição de reduções.
function playerDefense(g) {
  let remaining=1-clamp(ITEM_DEFS[g.outfit]?.roupa?.defesa||0,0,.85);
  const seen=new Set();
  for(const slot of playerAccessories(g)) {
    if(!slot||seen.has(slot.item))continue;seen.add(slot.item);
    remaining*=1-clamp(ITEM_DEFS[slot.item]?.acessorio?.defesa||0,0,.85);
  }
  return Math.min(.85,1-remaining);
}

// ---------- Presa Partida: mais dano em quem ainda está inteiro ----------
function bearDamageBonus(g, mob, damage) {
  const full = accessoryPower(g, 'cheio');
  if (!full || !mob?.def || mob.hp < (mob.def.hp || 1) * 0.98) return damage;
  return Math.round(damage * full);
}

// ---------- Garras do Alfa: sangramento no terceiro golpe ----------
function bearOnPlayerHit(g, mob, item) {
  const rule = ITEM_DEFS[item]?.sangra;
  if (!rule || !mob || mob.dead) return;
  bfx(g, 'claw', mob.cx, mob.cy, { ang: g.player.facing > 0 ? 0.9 : Math.PI - 0.9, len: 14 + Math.random() * 4, life: .32, color: [255, 190, 170] });
  if (mob.comboFrom !== item || performance.now() - (mob.comboT || 0) > 2200) mob.combo = 0;
  mob.comboFrom = item; mob.comboT = performance.now();
  if (++mob.combo < rule.golpes) return;
  mob.combo = 0;
  mob.bleed = { t: rule.tempo, dps: rule.dano, tick: 0 };
  mobParticles(g, mob, 8, 'rgb(190,36,40)');
  bfx(g, 'claw', mob.cx, mob.cy, { ang: g.player.facing > 0 ? 0.7 : Math.PI - 0.7, len: 22, life: .45, color: [255, 80, 70] });
  for (let i = 0; i < 8; i++) bfx(g, 'drop', mob.cx, mob.cy, { vx: (Math.random() - .5) * 120, vy: -60 - Math.random() * 90, grav: 700, size: 1 + (Math.random() < .5 ? 1 : 0), life: .8, pal: BFX_PAL.blood });
  toast('Corte aberto: o bicho está sangrando.');
}

// ---------- Pata Sísmica: onda rasteira a cada golpe ----------
const seismicWaves = [];
const bottledRoarWaves = [];
function bearSeismicSwing(g, def) {
  if (!def?.sismica) return;
  const p = g.player;
  if (!p.onGround) return;               // no ar não há chão para bater
  seismicWaves.push({ x: p.cx + p.facing * 10, y: p.y + p.h - 3, dir: p.facing, life: .75, hit: new Set() });
  bfxImpact(g, p.cx + p.facing * 10, p.y + p.h, { pal: BFX_PAL.earth, shards: 7, dust: 5, dir: p.facing });
  bfx(g, 'ring', p.cx + p.facing * 10, p.y + p.h - 1, { r0: 3, r1: 16, flat: 0.25, life: 0.3, w: 2, color: [230, 190, 130] });
  g.shake = Math.max(g.shake, 3);
  playSfx('break', p.cx, p.cy, { tile: TILE.STONE, vol: .7 });
}

function updateSeismicWaves(g, dt) {
  const w = g.world;
  for (let i = seismicWaves.length - 1; i >= 0; i--) {
    const v = seismicWaves[i];
    v.life -= dt;
    v.x += v.dir * 240 * dt;
    const tx = Math.floor(v.x / T), ty = Math.floor(v.y / T);
    if (v.life <= 0 || w.isSolid(tx, ty) || !w.isSolid(tx, ty + 1)) { seismicWaves.splice(i, 1); continue; }
    // a crista vai cuspindo lascas de terra e poeira (js/boss-fx.js)
    if (Math.random() < dt * 22) bfx(g, 'shard', v.x + (Math.random() - .5) * 6, v.y, { vx: v.dir * (20 + Math.random() * 60), vy: -120 - Math.random() * 140, grav: 900, spin: (Math.random() - .5) * 16, size: 1.4 + Math.random() * 1.8, life: .6, pal: Math.random() < .3 ? BFX_PAL.stone : BFX_PAL.earth });
    if (Math.random() < dt * 14) bfx(g, 'dust', v.x - v.dir * 6, v.y + 1, { vx: -v.dir * 20, vy: -12, r0: 2, r1: 7, life: .6, color: BFX_PAL.earth[1] });
    for (const m of g.mobs) {
      if (m.dead || m === g.mount || v.hit.has(m) || !m.onGround) continue; // só pega quem está no chão
      if (Math.abs(m.cx - v.x) > m.w / 2 + 12 || Math.abs(m.cy - v.y) > 3 * T) continue;
      v.hit.add(m);
      m.hit(Math.round(ITEM_DEFS[ITEM.SEISMIC_PAW].dano * .7), v.x - v.dir * 20);
      mobParticles(g, m, 5, 'rgb(180,150,110)');
      bfxImpact(g, m.cx, m.y + m.h, { shards: 4, dust: 2, dir: v.dir, power: .8 });
    }
  }
}



// ---------- Rugido Engarrafado ----------
function useBottledRoar(g) {
  const def = ITEM_DEFS[ITEM.BOTTLED_ROAR].rugido, p = g.player;
  if(!hasAccessory(g,ITEM.BOTTLED_ROAR)||(g.clock||0)<(g.roarReady||0))return false;
  g.roarReady = g.clock + def.espera;
  bottledRoarWaves.push({x:p.cx,y:p.cy,age:0,radius:def.raio*T});
  if(bottledRoarWaves.length>4)bottledRoarWaves.shift();
  g.placeCooldown = .6;
  g.shake = 5;
  playSfx('tigerRoar', p.cx, p.cy);
  // poeira varrida pelos pés e faíscas douradas saindo para todo lado (js/boss-fx.js)
  for (let i = 0; i < 14; i++) { const d = i % 2 ? 1 : -1; bfx(g, 'dust', p.cx + d * (4 + Math.random() * 8), p.y + p.h - 2, { vx: d * (90 + Math.random() * 90), vy: -8 - Math.random() * 20, drag: 3, r0: 3, r1: 9, life: .7, color: [196, 170, 128] }); }
  for (let i = 0; i < 20; i++) { const a = Math.random() * Math.PI * 2, v = 180 + Math.random() * 160; bfx(g, 'spark', p.cx, p.cy, { vx: Math.cos(a) * v, vy: Math.sin(a) * v * .7, drag: 2, life: .35 + Math.random() * .2, color: [255, 214, 120] }); }
  let pushed = 0, resisted = 0;
  for (const m of g.mobs) {
    if (m.dead || m === g.mount) continue;
    const dx = m.cx - p.cx, dy = m.cy - p.cy;
    if (Math.hypot(dx, dy) > def.raio * T) continue;
    if (m.boss) { resisted++; mobParticles(g, m, 4, 'rgb(200,190,170)'); continue; } // chefe aguenta
    m.vx = Math.sign(dx || 1) * def.empurrao;
    m.vy = -190;
    m.roarKnockback = .48;
    m.onGround = false;
    if (m.fleeTimer !== undefined) m.fleeTimer = 3;
    mobParticles(g, m, 5, 'rgb(226,200,150)');
    pushed++;
  }
  toast(pushed ? `O rugido varreu ${pushed} bicho${pushed > 1 ? 's' : ''}!`
    : resisted ? 'O chefe nem se mexeu com o rugido.' : 'O rugido ecoou no vazio.');
}

// Suspende o controle da IA durante o impulso, sem causar dano ou flash de ferimento.
function updateRoarKnockback(m,dt,w) {
  if(!(m.roarKnockback>0)||m.dead||m.boss)return false;
  const n=Math.max(1,Math.ceil(dt/(1/120))),h=dt/n;
  for(let i=0;i<n;i++) {
    m.applyGravity(h);m.moveX(m.vx*h,w);m.moveY(m.vy*h,w);
    m.vx*=Math.exp(-1.8*h);
  }
  m.roarKnockback=Math.max(0,m.roarKnockback-dt);
  m.clock=(m.clock||0)+dt;m.settleStep(dt);return true;
}

// ---------- Mel Ancestral ----------
function drinkAncientHoney(g) {
  const rule = ITEM_DEFS[ITEM.ANCIENT_HONEY].mel, p = g.player;
  if (p.hp >= p.maxHp) { toast('Vida cheia: guarde o mel para depois.'); return; }
  g.inventory.takeFromSlot(g.selected);
  g.placeCooldown = .5;
  g.honey = { left: rule.total, rate: rule.porSegundo, tick: 0 };
  playSfx('eat', p.cx, p.cy);
  toast('Mel Ancestral: a vida volta aos poucos — mas some se você apanhar.');
}

function updateAncientHoney(g, dt) {
  const h = g.honey, p = g.player;
  if (!h) return;
  if (p.hp >= p.maxHp || h.left <= 0) { g.honey = null; return; }
  h.tick += dt;
  if (h.tick < 1 / h.rate) return;
  h.tick = 0;
  h.left--;
  p.hp = Math.min(p.maxHp, p.hp + 1);
  bfx(g, 'ember', p.cx + (Math.random() - .5) * 12, p.y + p.h - 6, { vy: -30 - Math.random() * 20, life: .9, size: 2, color: BFX_PAL.honey[1] });
  if (Math.random() < .5) bfx(g, 'glint', p.cx + (Math.random() - .5) * 16, p.y + Math.random() * p.h, { size: 3, life: .4, color: [255, 236, 170] });
}

// Levou pancada: o mel se perde (chamado de js/monsters.js)
function breakAncientHoney(g) {
  if (!g.honey) return;
  g.honey = null;
  toast('A pancada cortou o efeito do mel.');
}

// ---------- Espírito do Filhote (pet só de enfeite) ----------
// Procura chão livre perto do dono; nunca reaparece dentro de um bloco.
function placeCubNearPlayer(c,g) {
  const p=g.player,w=g.world,base=Math.floor((p.cx-p.facing*28)/T),feet=Math.floor((p.y+p.h)/T);
  for(let r=0;r<=6;r++)for(const tx of r?[base-r,base+r]:[base])for(let dy=0;dy<=6;dy++)for(const ty of dy?[feet+dy,feet-dy]:[feet]) {
    const x=tx*T+(T-c.w)/2,y=ty*T-c.h-.01;
    if(!c.collides(w,x,y)&&w.isSolid(Math.floor(x/T),ty)&&w.isSolid(Math.floor((x+c.w-.001)/T),ty)) {
      c.x=x;c.y=y;c.vx=c.vy=0;c.onGround=true;c.stepOffset=0;return true;
    }
  }
  return false;
}
function updateCubSpirit(g,dt) {
  if(!accessoryPower(g,'filhote')){g.cub=null;return;}
  if(!(g.cub instanceof Body)) {
    const c=new Body(0,0,20,19);c.clock=0;c.gait=0;c.facing=g.player.facing;
    if(!placeCubNearPlayer(c,g)){g.cub=null;return;}g.cub=c;
  }
  const c=g.cub,p=g.player,w=g.world;
  if(Math.hypot(p.cx-c.cx,p.cy-c.cy)>90*T)placeCubNearPlayer(c,g);
  // Passos curtos impedem atravessar paredes mesmo com quadros demorados.
  const steps=Math.max(1,Math.ceil(dt/(1/120))),h=dt/steps;
  for(let i=0;i<steps;i++) {
    c.clock+=h;const dx=p.cx-p.facing*28-c.cx;
    c.vx=Math.abs(dx)>8?Math.sign(dx)*Math.min(185,45+Math.abs(dx)*1.5):0;
    if(c.vx)c.facing=Math.sign(c.vx);
    const old=c.x;
    let floor=null;
    for(let ty=Math.floor((c.y+c.h)/T);ty<=Math.floor((c.y+c.h)/T)+3;ty++) {
      if(w.isSolid(Math.floor(c.cx/T),ty)){floor=ty*T;break;}
    }
    const ground=c.onGround||(floor!==null&&floor-(c.y+c.h)<9);
    c.onGround=ground;
    // A subida de degrau também exige espaço sobre o corpo atual.
    if(ground&&c.collides(w,c.x,c.y-T))c.onGround=false;
    c.moveX(c.vx*h,w);c.onGround=ground;
    const target=floor===null?null:floor-c.h-5+Math.sin(c.clock*3)*1.5;
    if(target!==null)c.vy=clamp((target-c.y)*9,-65,100);
    else c.applyGravity(h);
    c.moveY(c.vy*h,w);
    c.gait+=Math.abs(c.x-old)/4;c.settleStep(h);
  }
  if(Math.random()<dt*14)bfx(g,'wisp',c.cx-c.facing*8+(Math.random()-.5)*8,c.y+c.h-4,{vx:-c.facing*10,vy:-14-Math.random()*10,r0:2,r1:5,life:.9,a:.35,color:[150,112,220]});
  if(Math.random()<dt*2)bfx(g,'glint',c.cx+(Math.random()-.5)*20,c.y+Math.random()*c.h,{size:2.5,life:.5,color:[220,190,255]});
}

const cubSpiritSprites=new Map();
function cubSpiritSprite(frame) {
  if(cubSpiritSprites.has(frame))return cubSpiritSprites.get(frame);
  const s=new Sprite(26,24),C={d:[51,39,51],s:[85,64,75],m:[129,97,105],l:[170,135,135],c:[209,177,158],w:[238,219,188],k:[29,26,35]};
  const rows=[
    [14,'ss....ss'],[13,'scls..scls'],[13,'smlssssmls'],
    [12,'smmllllmmms'],[7,'ssssssmlllllmmms'],[5,'smllllmmmllllllmms'],
    [4,'smmlllllmmmmlkmlkss'],[3,'smmlllllmmmmmmcccwcs'],
    [3,'smmllllmmmmmmlcckkcs'],[3,'smmmmmmmmmmmmlccwcs'],
    [3,'smmmmmmmmmmmmmlccss'],[4,'smmmmmmmmmmmmmmss'],
    [4,'ssmmmmmmmmmmmss'],[5,'sssssssssssss']
  ];
  const phase=frame*Math.PI/4;
  // A cabeça e o dorso permanecem iguais; a barriga se dissolve em uma franja espectral.
  rows.slice(0,12).forEach(([x,line],y)=>[...line].forEach((v,i)=>{
    if(C[v])s.set(x+i,y+3,C[v]);
  }));
  for(let x=4;x<=22;x++) {
    const edge=Math.round(18+Math.sin(x*.62+phase)*2);
    for(let y=15;y<=edge;y++)s.set(x,y,y===edge?[169,135,225]:y>17?[128,94,184]:[101,74,132]);
  }
  for(let j=0;j<3;j++) {
    const x=6+j*6+Math.round(Math.sin(phase+j)),y=21+(frame+j)%2;
    s.set(x,y,[161,124,223],150);
  }
  if(frame===6){s.set(17,9,C.m);s.set(20,9,C.m);}
  const img=s.finish([35,29,41]);cubSpiritSprites.set(frame,img);return img;
}
function drawCubSpirit(ctx,g) {
  const c=g.cub;if(!c)return;
  const frame=Math.floor((c.clock||0)*7)%8;
  ctx.save();ctx.imageSmoothingEnabled=false;
  ctx.translate(Math.round(c.cx??c.x),Math.round(c.y+(c.h??0)));ctx.scale(c.facing,1);
  const glow=ctx.createRadialGradient(0,-10,2,0,-10,23);
  glow.addColorStop(0,'rgba(182,107,255,.32)');glow.addColorStop(.5,'rgba(139,72,238,.16)');glow.addColorStop(1,'rgba(119,58,227,0)');
  ctx.fillStyle=glow;ctx.fillRect(-24,-34,48,48);
  ctx.shadowColor='#b37aff';ctx.shadowBlur=7;
  ctx.drawImage(cubSpiritSprite(frame),-13,-23);ctx.restore();
}

let alphaClawsHeldSprite=null;
function drawAlphaClawsHeld(ctx) {
  if(!alphaClawsHeldSprite) {
    const s=new Sprite(19,13),C={d:[49,36,33],b:[107,70,43],l:[155,106,61],s:[141,137,119],c:[199,190,158],w:[234,224,188]};
    const rows=['..............ww...','..........wwwcc....','..dddd...wccss.....','..dbbldddsss.......','..dbblb......ww....','..dblld..wwwcc.....','..dbblddwccss......','..dbbldddss........','..dblld......ww....','..dddd...wwwcc.....','.........ccss......','.........sss.......'];
    rows.forEach((row,y)=>[...row].forEach((v,x)=>{if(C[v])s.set(x,y,C[v]);}));alphaClawsHeldSprite=s.finish(null);
  }
  ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(alphaClawsHeldSprite,-6,-6);ctx.restore();
}

// ---------- Sangramento ----------
function updateBleeding(g, dt) {
  for (const m of g.mobs) {
    const b = m.bleed;
    if (!b || m.dead) continue;
    b.t -= dt; b.tick += dt;
    if (Math.random() < dt * 5) bfx(g, 'drop', m.x + Math.random() * m.w, m.y + m.h * (.3 + Math.random() * .4), { vy: 10, grav: 600, size: 1, life: .9, pal: BFX_PAL.blood });
    if (b.tick >= 1) {
      b.tick = 0;
      m.hit(b.dps, m.cx);
      mobParticles(g, m, 3, 'rgb(170,30,34)');
    }
    if (b.t <= 0) m.bleed = null;
  }
}

// Um passo só, chamado de update() em js/game.js
function updateBearLoot(g, dt) {
  if(g.bearFalls)g.bearFalls=g.bearFalls.filter(fall=>(fall.t+=dt)<1.25);
  for(let i=bottledRoarWaves.length-1;i>=0;i--) {
    bottledRoarWaves[i].age+=dt;if(bottledRoarWaves[i].age>.9)bottledRoarWaves.splice(i,1);
  }
  updateBleeding(g, dt);
  updateSeismicWaves(g, dt);
  updateAncientHoney(g, dt);
  updateCubSpirit(g, dt);
}
