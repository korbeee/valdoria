'use strict';
// =====================================================================================
//  FAUNA NOVA, PARTE 5: esquilo, zebra, jaguar, sapo, dragão-de-komodo, cascavel e jacaré (versões refeitas)
// =====================================================================================
// Redesenhos depois do primeiro teste no jogo: proporções mais fiéis, pelagem/escamas mais legíveis, rabos e patas inteiros
// (frSpecies agora dá margem em volta do quadro). Carrega depois de fauna-species4.js.

// ---------------------------------------------------------------- Esquilo (floresta e cerejeiras)
{
  const pal = [[62, 30, 16], [120, 62, 32], [172, 100, 50], [218, 148, 84], [246, 204, 146]];
  const cream = [[150, 118, 90], [206, 176, 138], [240, 220, 184], [252, 244, 222]];
  const legs = { fore: { L1: 3.2, L2: 3, w1: 2.2, w2: 1.7, pal, paw: 2 }, hind: { L1: 4.6, L2: 4.2, w1: 3.4, w2: 2.2, pal, paw: 3 } };
  const cheeks = (dx, dy, nx, ny) => (ny > 0.15 && nx > -0.1 ? cream[1 + (ny > 0.5 ? 1 : 0)] : null);
  const head = { style: 'rodent', skull: [4.5, 4.1], snout: { len: 2.4, h: 1.9, tipH: 1.2, drop: 0.7 }, ears: { style: 'point', h: 5, w: 3.2, dx: -0.4, lean: -0.4, inner: [236, 168, 150] }, eye: { big: true, dx: 2.1, dy: -0.6 }, nose: [70, 34, 34], whisk: true, pattern: cheeks };
  const bands = (dx, dy, nx, ny, idx) => ((Math.floor((dx + dy + 40) / 3) % 3 === 0) ? pal[Math.max(0, idx - 1)] : (hash2(dx, dy, 7) > 0.88 ? pal[Math.min(4, idx + 1)] : null));
  // rabo-pluma: curva de Bézier que sobe atrás do corpo e se enrola para a frente, mais grosso no meio e com a ponta clara
  const plume = (x, y, sway, high = 1) => (s) => {
    const P = [[x, y], [x - 8, y - 5 * high], [x - 7, y - 19 * high], [x + 3 + sway, y - 15 * high]];
    for (let i = 0; i <= 20; i++) {
      const t = i / 20, u = 1 - t, px = u * u * u * P[0][0] + 3 * u * u * t * P[1][0] + 3 * u * t * t * P[2][0] + t * t * t * P[3][0], py = u * u * u * P[0][1] + 3 * u * u * t * P[1][1] + 3 * u * t * t * P[2][1] + t * t * t * P[3][1];
      const r = 2.2 + Math.pow(Math.sin(Math.min(1, t * 1.05) * Math.PI), 0.7) * 3.4;
      frFur(s, px, py, r * 1.05, r, { pal, seed: 80 + i, fur: 1.4, pattern: bands });
    }
    frFur(s, P[3][0] + 0.5, P[3][1] - 0.5, 2.6, 2.6, { pal: cream, seed: 5, fur: 0.8 });
  };
  const P = () => ({
    ground: 29, cx: 14, cy: 20.5, rx: 6.4, ry: 4.3, pal, seed: 11, belly: 0.16, hipK: 0.55, shK: 0.62, legs, stride: 5, lift: 2.4, gait: 'trot', bob: 1,
    head, neck: [3.6, -3.2], neckThick: 0.8,
    tail: (s, x, y, f, I) => plume(x + 1, y - 1, I.walk ? Math.sin(I.ph + 1.2) * 2 : I.idle === 3 ? 2.5 : 0)(s),
    pose: (I) => (I.idle === 2 ? { headDy: 1.5, tilt: 0.3 } : I.idle === 3 ? { earTwitch: true, eyeClosed: true } : {}),
  });
  // Em pé (14/15): roendo uma bolota com as mãozinhas
  const sit = (s, f) => {
    const nib = f === 15, ph = nib ? 1 : 0, cx = 12, g = 29;
    const T0 = [[cx - 3, g - 6], [cx - 13, g - 11], [cx - 11, g - 27], [cx - 1, g - 25]];
    for (let i = 0; i <= 22; i++) { const t = i / 22, u = 1 - t, px = u * u * u * T0[0][0] + 3 * u * u * t * T0[1][0] + 3 * u * t * t * T0[2][0] + t * t * t * T0[3][0], py = u * u * u * T0[0][1] + 3 * u * u * t * T0[1][1] + 3 * u * t * t * T0[2][1] + t * t * t * T0[3][1], r = 2.4 + Math.pow(Math.sin(Math.min(1, t * 1.05) * Math.PI), 0.7) * 3.6; frFur(s, px, py, r * 1.05, r, { pal, seed: 90 + i, fur: 1.4, pattern: bands }); }
    frLeg(s, cx - 2, g - 5, cx - 5, g, { L1: 4, L2: 3.5, w1: 3.4, w2: 2, pal, paw: 4 }, true);
    frFur(s, cx, g - 9, 5.4, 7.4, { pal, seed: 12, belly: 0.18 });
    frFur(s, cx + 1.6, g - 8, 3.2, 4.8, { pal: cream, seed: 3, fur: 0.5 });
    frLeg(s, cx + 1, g - 5, cx + 1, g, { L1: 4, L2: 3.5, w1: 3.4, w2: 2, pal, paw: 4 }, false);
    frHead(s, cx + 2, g - 19 + ph, { ...head, pal, tilt: nib ? 0.35 : 0.1 });
    frFur(s, cx + 6.5, g - 12 + ph, 2.4, 2.6, { pal: [[60, 36, 14], [120, 78, 30], [172, 122, 52], [214, 168, 86]], seed: 8, fur: 0 });
    seg(s, cx + 6.5, g - 15 + ph, cx + 6.5, g - 15 + ph, 1.4, [70, 46, 20]);
    seg(s, cx + 3.5, g - 12 + ph, cx + 4.5, g - 11.5 + ph, 2, pal[2]); seg(s, cx + 4, g - 14 + ph, cx + 5, g - 12 + ph, 2, pal[3]);
  };
  frSpecies('esquilo', { name: 'Esquilo', biomes: [BIOME.FOREST, BIOME.SAKURA], hp: 5, speed: 52, w: 12, h: 11, drops: [[ITEM.MEAT, 1, 1], [ITEM.FIBER, 0, 1]], color: '#b8683a', pad: 12 },
    faunaHook({ paint: (s, p, f) => (f === 14 || f === 15 ? sit(s, f) : frQuad(s, f, P())), scare: 5, flee: 2.1, hop: { vy: 200, wait: 0.42 }, gaitDiv: 2.4, idleChance: 0.5, frames: { idle: (m, f) => (f === 10 ? (Math.floor(m.clock * 2) % 2 ? 14 : 15) : f) } }),
    [32, 31], pal, 'rabbit');
}

// ---------------------------------------------------------------- Zebra (savana)
{
  const base = [[133,141,145],[183,190,192],[222,229,226],[250,251,241]];
  const ink = [[24,29,32],[46,52,54]];
  // listras curvas que acompanham a barriga e somem perto dela; faixas finas nas patas e cabeça listrada
  const stripes = (dx,dy,nx,ny,idx) => ny<.72&&Math.sin(dx*.78+dy*.18+nx*ny*.9)>.05?ink[idx<2?0:1]:null;
  const faceStripes = (dx,dy,nx,ny) => nx>.55&&ny>.05?[73,78,78]:ny<.5&&Math.sin(dx*1.25+dy*.5)>.5?ink[1]:null;
  // Patas afiladas; as faixas são recortadas dentro da pele, sem barras nas laterais.
  const zebraLeg=(s,hx,hy,fx,fy,o,far)=>{
    const [kx,ky]=ik(hx,hy,fx,fy,o.L1,o.L2,o.kneeDir);
    const segment=(ax,ay,bx,by,startWidth,endWidth,phase)=>{
      const dx=bx-ax,dy=by-ay,length=Math.max(.01,Math.hypot(dx,dy)),nx=-dy/length,ny=dx/length;
      frPoly(s,[[ax+nx*startWidth/2,ay+ny*startWidth/2],[bx+nx*endWidth/2,by+ny*endWidth/2],[bx-nx*endWidth/2,by-ny*endWidth/2],[ax-nx*startWidth/2,ay-ny*startWidth/2]],(x,y)=>{
        const along=((x+.5-ax)*dx+(y+.5-ay)*dy)/length,across=(x+.5-ax)*nx+(y+.5-ay)*ny;
        if(along>1&&along<length-1&&(Math.round(along)+phase)%4===1)return far?ink[1]:ink[0];
        return base[far?0:across>.3?1:across<-.3?3:2];
      });
    };
    const mx=lerp(hx,kx,.55),my=lerp(hy,ky,.55);
    segment(hx,hy,mx,my,o.w1,o.w1*.78,0);
    segment(mx,my,kx,ky,o.w1*.78,2.5,2);
    shadeBall(s,kx,ky,1.4,1.4,()=>base[far?0:2]);
    segment(kx,ky,fx,fy-1,2.4,1.7,2);
    frPoly(s,[[fx-1,fy-2],[fx+1,fy-2],[fx+2,fy],[fx-1,fy]],()=>ink[far?0:1]);
    s.set(Math.round(fx),Math.round(fy-2),base[far?0:1]);
  };
  const legs = { fore: { L1: 10.2, L2: 10, w1: 5.4, w2: 2.4, pal: base, hoof: ink[0], paw: 2, kneeDir: 1, paint:zebraLeg }, hind: { L1: 10.5, L2: 10.2, w1: 7.4, w2: 2.4, pal: base, hoof: ink[0], paw: 2, kneeDir: -1, paint:zebraLeg } };
  const head = { style: 'hoofed', skull: [5.2,4.7], snout: { len: 7.2, h: 3, tipH: 2.4, drop: 2, dy: .4 }, ears: { style: 'point', h: 5.4, w: 4.2, dx: .2, gap:2, inner:[103,111,110], pal:[ink[0],base[1],base[3]] }, eye: { dx: 2.6, dy: -.4 }, nose: ink[0], pattern: faceStripes, pal: base };
  const mane = (s,r) => {for(let i=0;i<11;i++){const t=i/10,x=lerp(r.hx-3,r.sh[0]-3,t),y=lerp(r.hy-4.7,r.sh[1]-5.6,t);seg(s,x,y,x-1,y-2,1,ink[0]);if(i%3===0)s.set(Math.round(x),Math.round(y-1),base[1]);}};
  const P = () => ({
    ground: 51, cx: 28, cy: 27.5, rx: 15.8, ry: 8.6, pal: base, seed: 31, belly: 0.14, legs, stride: 12, lift: 4.4, gait: 'walk', bob: 1, pattern: stripes,
    head, neck: [7.2, -8.5], neckThick: .75, neckPattern: stripes,
    tail: frTail('thin', [[26, 26, 32], [70, 68, 78], [140, 140, 150]], { len: 15, w: 2.4, drop: 8, swing: 3.5, tip: [20, 18, 24], rings: [236, 236, 244] }),
    pose: (I) => (I.idle === 2 ? { headDy: 18, headDx: 5, tilt: 0.95 } : I.idle === 3 ? { earTwitch: true, eyeClosed: true } : I.idle === 1 ? { headDy: -1 } : {}),
  });
  frSpecies('zebra', { name: 'Zebra', biome: BIOME.SAVANNA, hp: 34, speed: 58, w: 40, h: 36, drops: [[ITEM.LEATHER, 2, 3], [ITEM.MEAT, 2, 3]], color: '#e8e8ec', pad: 12 },
    faunaHook({ paint: (s, p, f) => { const r = frQuad(s, f, P()); mane(s, r); }, scare: 7, flee: 1.9, gaitDiv: 4.6, idleChance: 0.55 }), [60, 54], base, 'sika');
}

// ---------------------------------------------------------------- Jaguar (selva, hostil)
{
  const pal = [[104,72,38],[155,110,51],[196,148,72],[222,183,109],[242,218,167]];
  const dark = [49,35,23],cream=[[169,144,103],[208,189,145],[240,223,184],[255,242,209]];
  // rosetas grandes: anel escuro (quebrado aqui e ali) em volta de um miolo mais fechado; barriga lisa e clara
  const rosette = (dx, dy, nx, ny, idx) => {
    if(ny>.55)return cream[clamp(idx-1,0,3)];
    const gx=Math.floor((dx+60)/6),gy=Math.floor((dy+40)/5),jx=(hash2(gx,gy,9)-.5)*1.5,jy=(hash2(gy,gx,8)-.5);
    const d=Math.hypot(dx-(gx*6-60+3+jx),(dy-(gy*5-40+2.5+jy))*1.15);
    if(hash2(gx,gy,5)<.12)return null;
    if(d>1.25&&d<2.1)return dark;
    return d<.55?dark:d<=1.25?pal[2]:null;
  };
  const legSpots=(x,y,far)=>!far&&y<6&&(Math.round(x)+Math.round(y)*3+30)%7===0?dark:null;
  const legs = { fore: { L1: 5.2, L2: 5.2, w1: 3.6, w2: 2.4, pal, hoof:cream[1], paw: 3, kneeDir:1, paint:frPawLeg,legPattern:legSpots }, hind: { L1: 5.7, L2: 5.3, w1: 4.2, w2: 2.5, pal, hoof:cream[1], paw: 3, kneeDir:-1, paint:frPawLeg,legPattern:legSpots } };
  const head = { style: 'feline', skull: [5.4,4.7], snout: { len: 2.2, h: 2.5, tipH: 1.9, wide: 1.15, drop: 1 }, ears: { style: 'round', h: 3, w: 3.6, dx: -.8, gap:2, inner:[185,155,112], pal:[dark,pal[2],cream[2]] }, eye: { dx: 2.8, dy: -.5, iris:[37,44,27] }, nose: [66,41,30], whisk: true, mouth: [166,68,72], pattern:(dx,dy,nx,ny)=>ny>.3?cream[2]:ny<.05&&(dx*3+dy+30)%7===0?dark:null };
  const P = () => ({
    ground: 35, cx: 29, cy: 23, rx: 14, ry: 6, pal, seed: 81, belly: .2, fur:.3, legs, stride: 10, lift: 3.6, gait: 'trot', bob: 1, pattern: rosette, sq: 2.2,
    head, neck: [4.2, -2.4], neckThick: .85, neckPattern: rosette, tail: frTail('thin', pal, { len: 15, w: 2.4, drop: 5, swing: 2.8, tip: dark, rings: dark }),
    pose: (I, f) => (f === 14 ? { bodyDy: 3, headDx: -1, headDy: 3, open: 2.4 } : f === 15 ? { bodyDy: -1, headDx: 3, open: 4.2, tilt: -0.12 } : I.idle === 2 ? { headDy: 3, headDx: 3, tilt: 0.5 } : I.idle === 3 ? { earTwitch: true, eyeClosed: true } : {}),
  });
  frSpecies('jaguar', { name: 'Jaguar', biome: BIOME.JUNGLE, hostile: true, hp: 30, speed: 70, damage: 9, w: 30, h: 17, drops: [[ITEM.LEATHER, 2, 3], [ITEM.MEAT, 1, 3], [ITEM.TIGER_CLAW, 0, 1, 0.2]], color: '#d49430', pad: 12 },
    faunaHook({ paint: (s,p,f)=>{const r=frQuad(s,f,P(),f===15?12:f===14?8:f);if(r.I.idle!==3){seg(s,Math.round(r.hx+1),Math.round(r.hy-1),Math.round(r.hx+3),Math.round(r.hy-1),1,dark);s.set(Math.round(r.hx+3),Math.round(r.hy),[37,44,27]);}}, outline:[48,34,24], sight: 12, chase: 1.25, gaitDiv: 3.6, atk: { kind: 'lunge', reach: 6.5 * T, windup: 0.45, recover: 0.55, cd: 2, windFrame: 14, strikeFrame: 15, dash: 3.5, hop: 210 } }), [60, 38], pal, 'tiger');
}

// ---------------------------------------------------------------- Sapo (pântano)
{
  const pal = [[16, 52, 28], [36, 104, 46], [78, 158, 56], [140, 208, 84], [204, 240, 150]];
  const belly = [[150, 160, 90], [204, 208, 120], [238, 238, 160], [252, 250, 200]];
  const spots = (dx, dy, nx, ny, idx) => { const c = hash2(Math.floor((dx + 30) / 3), Math.floor((dy + 30) / 3), 7); return ny < 0.25 && c > 0.78 && idx > 0 ? pal[0] : (ny < -0.45 && Math.abs(nx) < 0.18 ? pal[4] : null); };
  const paint = (s, p, f) => {
    const I = frInfo(f), g = 23, ph = I.ph;
    const e = I.walk ? (Math.sin(ph) + 1) / 2 : I.air ? (I.up ? 1 : 0.4) : 0, up = I.up ? 4 : I.air ? 2 : 0;
    const cx = 12 + (I.air ? 1 : 0), by = g - 8.5 - up - (I.walk ? Math.round(e * 1.4) : 0), tilt = I.up ? -2 : I.air ? 1.5 : 0;
    // pata traseira: coxa em oval, canela e pé comprido de membrana; esticada no salto
    const hipX = cx - 5, hipY = by + 2.5;
    const kneeX = cx - 5 - e * 4 - (I.up ? 4 : 0), kneeY = by + 2 + (1 - e) * 2 - (I.up ? 0 : 0);
    const footX = I.up ? cx - 20 : I.air ? cx - 13 : cx - 8 - e * 5, footY = I.up ? by + 7 : I.air ? by + 8 : g;
    seg(s, kneeX, kneeY, footX + 2, footY - 1, 2.8, pal[0]);
    seg(s, footX + 1, footY, footX + 8, footY - (I.air ? 0.5 : 0), 2, pal[0]);
    for (let k = 0; k < 3; k++) seg(s, footX + 7 + k, footY, footX + 9 + k, footY + (I.air ? 0 : 0), 1, pal[1]);
    frFur(s, hipX + 0.5, hipY - 0.5, 5.2, 4.2, { pal, seed: 11, pattern: spots, fur: 0.2 });
    seg(s, hipX - 1, hipY + 1.5, kneeX, kneeY, 3.6, pal[1]);
    // corpo, barriga clara e faixa clara no dorso
    frFur(s, cx, by, 8.8, 6, { pal, seed: 7, belly: 0.08, pattern: spots, fur: 0.2 });
    frFur(s, cx - 0.5, by + 3.4, 6, 2.6, { pal: belly, seed: 3, fur: 0, sq: 2 });
    // patas dianteiras
    const fx = cx + 6 + (I.air ? (I.up ? 6 : 3) : 0), fy = I.air ? by + (I.up ? 6 : 9) : g;
    seg(s, cx + 4, by + 3.5, fx, fy - 1, 2.4, pal[1]); seg(s, fx, fy, fx + 3, fy, 1.8, pal[0]); for (let k = 0; k < 3; k++) s.set(Math.round(fx + 3 + k * 0.6), Math.round(fy + (k - 1) * 0.6), pal[1]);
    // cabeça larga com os olhos saltados em cima
    const hx = cx + 8, hy = by - 3 + tilt * 0.4;
    frFur(s, hx, hy, 5.6, 3.7, { pal, seed: 9, pattern: spots, fur: 0.2 });
    seg(s, hx - 2, hy + 1.8, hx + 6, hy + 1.8, 1, pal[0]);
    s.set(Math.round(hx + 5.4), Math.round(hy - 0.8), pal[0]);
    for (const [ex, ey] of [[hx - 1.6, hy - 4.2], [hx + 2.6, hy - 4.6]]) {
      shadeBall(s, ex, ey, 2.5, 2.4, (l) => pal[clamp(Math.floor(l * 4.2), 1, 4)]);
      shadeBall(s, ex + 0.4, ey + 0.2, 1.6, 1.5, (l) => [[220, 150, 20], [248, 196, 46], [255, 230, 120]][clamp(Math.floor(l * 3.2), 0, 2)]);
      if (I.idle === 2) seg(s, ex - 1.4, ey + 0.4, ex + 1.8, ey + 0.4, 1.6, pal[1]); else { s.set(Math.round(ex + 0.6), Math.round(ey + 0.2), [14, 10, 10]); s.set(Math.round(ex + 0.6), Math.round(ey + 1.2), [14, 10, 10]); }
    }
    frFur(s, hx - 3.4, hy - 0.6, 1.8, 1.8, { pal: [pal[1], pal[2], pal[3]], seed: 12, fur: 0 });            // tímpano atrás do olho
    const sac = I.idle === 1 ? 2.4 : f === 15 ? 4.6 : f === 14 ? 1.2 : 0;                                      // saco vocal
    if (sac > 0) frFur(s, hx + 1.8, hy + 3.6, 2.2 + sac * 0.6, 1.6 + sac * 0.7, { pal: belly, seed: 8, fur: 0, belly: 0.1 });
    else frFur(s, hx + 1.4, hy + 3, 2.6, 1.2, { pal: belly, seed: 8, fur: 0 });
    if (f === 14) for (let i = 0; i < 10; i++) seg(s, hx + 5.5 + i, hy + 1.8 - i * 0.2, hx + 6.5 + i, hy + 1.8 - i * 0.2, 1.4, i > 7 ? [255, 160, 170] : [226, 108, 128]);
  };
  frSpecies('sapo', { name: 'Sapo', biome: BIOME.SWAMP, hp: 6, speed: 40, w: 14, h: 11, drops: [[ITEM.MEAT, 1, 1], [ITEM.EGG, 0, 1]], color: '#4a8c3a', pad: 12 },
    faunaHook({ paint, scare: 4, flee: 1.8, hop: { vy: 235, wait: 0.7 }, gaitDiv: 2, idleChance: 0.6, frames: { idle: (m, f) => (f === 9 ? 9 : f === 10 ? (Math.floor(m.clock * 1.5) % 3 === 0 ? 14 : 8) : f === 11 ? (Math.floor(m.clock * 0.6) % 2 ? 15 : 11) : f) } }), [28, 26], pal, 'slime');
}

// ---------------------------------------------------------------- Dragão-de-komodo (mesa e deserto, hostil)
{
  const pal = [[34, 30, 26], [74, 66, 56], [118, 106, 88], [164, 150, 120], [208, 194, 158]];
  // escamas: grade de pontinhos claros e faixas sujas nas costas
  const scales = (dx, dy, nx, ny, idx) => (((dx + dy * 2 + 400) % 4 === 0) && hash2(dx, dy, 3) > 0.3 ? pal[Math.min(4, idx + 1)] : (ny < -0.1 && Math.floor((dx + 60) / 4) % 3 === 0 ? pal[Math.max(0, idx - 1)] : null));
  const legs = { fore: { L1: 4.2, L2: 4.4, w1: 4, w2: 3.2, pal, hoof: [20, 18, 16], paw: 4, kneeDir: -1 }, hind: { L1: 4.6, L2: 4.6, w1: 4.6, w2: 3.4, pal, hoof: [20, 18, 16], paw: 4, kneeDir: 1 } };
  const head = { style: 'reptile', skull: [4.6, 3.8], snout: { len: 9.5, h: 2.5, tipH: 1.6, drop: 0.2, wide: 1 }, ears: { style: 'none' }, eye: { dx: 2.2, dy: -0.8, iris: [226, 168, 30] }, nose: [18, 16, 14], pattern: scales, mouth: [170, 60, 70] };
  const P = () => ({
    ground: 35, cx: 25, cy: 24, rx: 13.5, ry: 5.8, pal, seed: 61, belly: 0.1, legs, stride: 9, lift: 3.2, gait: 'walk', bob: 0.5, pattern: scales, sq: 2.2, hipK: 0.7, shK: 0.62,
    head, neck: [9, -2.4], neckThick: 0.85, neckPattern: scales, noHeadBob: false,
    tail: frTail('lizard', pal, { len: 24, w: 4.6, drop: 6, seed: 33 }),
    pose: (I, f) => (f === 14 ? { bodyDy: 1.5, headDx: -2, headDy: -4, open: 2.8, tilt: -0.35 } : f === 15 ? { bodyDy: 0, headDx: 5, headDy: 1, open: 4, tilt: 0.1 } : I.idle === 2 ? { headDy: 2, headDx: 1, tilt: 0.25 } : I.idle === 3 ? { eyeClosed: true } : {}),
  });
  // língua amarela bifurcada que sai e entra
  const tongue = (s, r, f) => {
    const out = f === 15 ? 0 : (f === 11 ? 9 : f === 9 ? 5 : 0);
    if (!out) return;
    const x = r.hx + 14, y = r.hy + 1.6;
    seg(s, x, y, x + out, y, 1, [236, 190, 40]); s.set(Math.round(x + out + 1), Math.round(y - 1), [236, 190, 40]); s.set(Math.round(x + out + 1), Math.round(y + 1), [236, 190, 40]);
  };
  frSpecies('komodo', { name: 'Dragão-de-komodo', biomes: [BIOME.MESA, BIOME.DESERT], hostile: true, hp: 46, speed: 38, damage: 11, w: 40, h: 22, drops: [[ITEM.LEATHER, 2, 3], [ITEM.MEAT, 2, 3], [ITEM.BONE, 1, 2], [ITEM.STINGER, 0, 1, 0.3]], color: '#6e6250', pad: 14 },
    faunaHook({ paint: (s, p, f) => { const r = frQuad(s, f, P(), f === 15 ? 8 : f === 14 ? 8 : f); tongue(s, r, f); }, sight: 10, chase: 1.45, gaitDiv: 4.4, heavy: true, idleChance: 0.6, atk: { kind: 'bite', reach: 4.6 * T, windup: 0.55, recover: 0.6, cd: 1.9, windFrame: 14, strikeFrame: 15, dmg: 13 } }), [58, 38], pal, 'tiger');
}

// ---------------------------------------------------------------- Cascavel (deserto e mesa, hostil)
{
  const pal = [[44, 30, 16], [102, 76, 40], [158, 126, 66], [204, 174, 100], [238, 218, 156]];
  const paint = (s, p, f) => {
    const I = frInfo(f), ph = I.ph, g = 21, N = 24, windup = f === 14, strike = f === 15, idle = I.idle;
    const hx0 = 38 + (strike ? 7 : 0), amp = windup ? 3.6 : 3.7, lift = windup ? 12 : strike ? 4 : idle === 2 ? 3.5 : 0;
    const pts = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N, wave = Math.sin(i * 0.78 - (I.walk ? ph : windup ? 0 : f * 0.4)) * amp * (0.35 + t * 0.65);
      let x = hx0 - i * (windup ? 1.3 : 1.75), y = g - 3.4 + wave * 0.9;
      if (windup || lift) { const k = Math.max(0, 1 - t * 3.2); y -= lift * k * k; }
      pts.push([x, y]);
    }
    // corpo: grosso no meio, afinando; escamas com fosca e barriga clara
    for (let i = N; i >= 0; i--) {
      const t = i / N, [x, y] = pts[i], r = i < 2 ? 2.9 : (3.1 - Math.pow(t, 1.5) * 2 + Math.sin(t * Math.PI) * 0.6);
      frFur(s, x, y, r * 1.12, r, { pal, seed: 5 + i, belly: 0.22, fur: 0.5, sq: 2.1 });
    }
    // losangos escuros com contorno claro e pontos de escama
    for (let i = 4; i < N - 2; i += 3) {
      const [x, y] = pts[i], r = 2.9 - (i / N) * 1.4;
      frPoly(s, [[x - r * 0.8, y - 0.6], [x, y - r * 0.9], [x + r * 0.8, y - 0.6], [x, y + r * 0.4]], [48, 30, 16]);
      frPoly(s, [[x - r * 0.4, y - 0.6], [x, y - r * 0.5], [x + r * 0.4, y - 0.6], [x, y + 0.1]], [96, 62, 30]);
      s.set(Math.round(x - r * 0.9), Math.round(y - 0.6), [240, 218, 150]); s.set(Math.round(x + r * 0.9), Math.round(y - 0.6), [240, 218, 150]); s.set(Math.round(x), Math.round(y - r), [226, 196, 124]);
    }
    // guizo: anéis de queratina que tremem
    const [tx, ty] = pts[N], sh = windup || strike || idle === 1 ? ((f * 3) % 2 ? 1 : -1) : 0;
    for (let k = 0; k < 5; k++) frFur(s, tx - 1.5 - k * 2 + sh * 0.3, ty - 0.5 + sh * (k % 2 ? 0.6 : -0.6) - (k > 1 ? 1 : 0), 1.9 - k * 0.12, 1.7 + k * 0.1, { pal: [[116, 100, 66], [170, 150, 100], [216, 198, 150], [240, 228, 190]], seed: 70 + k, fur: 0 });
    // cabeça triangular, olho de fenda, narinas e língua bífida
    const [hx, hy] = pts[0], open = strike ? 3.4 : windup ? 1.8 : 0;
    frFur(s, hx + 2.6, hy - 0.4, 4.8, 3.4, { pal, seed: 90, fur: 0.3 });
    frPoly(s, [[hx + 3, hy - 2.6], [hx + 8.2, hy - 0.4 - open * 0.2], [hx + 7.8, hy + 1], [hx + 3, hy + 2]], (x, y) => pal[clamp(Math.floor((1.6 - (y - hy)) * 1.2), 0, 4)]);
    frPoly(s, [[hx + 1, hy - 2.6], [hx + 5, hy - 3.2], [hx + 4, hy - 1.2]], pal[1]);                                  // sobrancelha/escama acima do olho
    if (open) { frPoly(s, [[hx + 4, hy + 1.4], [hx + 8, hy + 1 + open], [hx + 3, hy + 2.8 + open * 0.4]], [212, 92, 104]); s.set(Math.round(hx + 6.4), Math.round(hy + 1.6), [252, 250, 240]); s.set(Math.round(hx + 4.8), Math.round(hy + 1.6), [252, 250, 240]); s.set(Math.round(hx + 6.4), Math.round(hy + 2 + open * 0.7), [252, 250, 240]); }
    s.set(Math.round(hx + 4.2), Math.round(hy - 1.2), [236, 190, 40]); s.set(Math.round(hx + 4.2), Math.round(hy - 0.4), [20, 12, 8]); s.set(Math.round(hx + 3.6), Math.round(hy - 1.2), [236, 190, 40]);
    s.set(Math.round(hx + 7.6), Math.round(hy - 0.8), [30, 20, 14]);
    if (!open && (idle === 3 || (I.walk && f % 4 === 0) || f === 9)) { seg(s, hx + 8.2, hy + 0.4, hx + 12, hy + 0.4, 0.8, [226, 66, 90]); s.set(Math.round(hx + 12.6), Math.round(hy - 0.5), [226, 66, 90]); s.set(Math.round(hx + 12.6), Math.round(hy + 1.3), [226, 66, 90]); }
  };
  frSpecies('cascavel', { name: 'Cascavel', biomes: [BIOME.DESERT, BIOME.MESA], hostile: true, hp: 14, speed: 40, damage: 8, w: 30, h: 8, drops: [[ITEM.STINGER, 0, 1], [ITEM.LEATHER, 0, 1], [ITEM.MEAT, 1, 1]], color: '#b08a48', pad: 10 },
    faunaHook({ paint, sight: 9, chase: 1.3, gaitDiv: 3, alwaysWalk: true, atk: { kind: 'bite', reach: 4.5 * T, windup: 0.55, recover: 0.5, cd: 1.5, windFrame: 14, strikeFrame: 15, dmg: 9 } }), [52, 24], pal, 'bug');
}

// ---------------------------------------------------------------- Jacaré (pântano, hostil)
{
  const pal = [[12, 30, 20], [30, 62, 32], [60, 100, 44], [102, 142, 62], [158, 188, 98]];
  const belly = [[112, 122, 70], [170, 176, 100], [216, 218, 140], [242, 240, 184]];
  // placas córneas: grade em losango escura sobre o verde, com o centro de cada placa mais claro
  const scutes = (dx, dy, nx, ny, idx) => { if (ny > 0.35) return null; const u = (dx * 0.5 + dy * 0.75 + 200) % 3, v = (dx * 0.5 - dy * 0.75 + 200) % 3; return u < 0.55 || v < 0.55 ? pal[Math.max(0, idx - 1)] : (hash2(dx, dy, 3) > 0.92 ? pal[Math.min(4, idx + 1)] : null); };
  const paint = (s, p, f) => {
    const I = frInfo(f), ph = I.ph, g = 29, open = f === 14 ? 6 : f === 15 ? 0.4 : I.idle === 3 ? 2.2 : 0, lunge = f === 15 ? 5 : 0, cy = 20 - (I.walk ? Math.round(Math.abs(Math.sin(ph * 2)) * 0.7) : 0);
    // rabo comprido com crista de placas; ondula
    for (let i = 0; i <= 20; i++) { const t = i / 20, x = 20 - i * 2, y = cy + 2 + t * 3 + Math.sin(ph + t * 4.5) * (I.walk ? 2 : 1) * t + (I.idle === 1 ? 0.5 * t : 0), r = 4.8 * (1 - t * 0.8) + 0.7; frFur(s, x, y, r * 1.15, r, { pal, seed: 5 + i, belly: 0.1, fur: 0.4, pattern: scutes }); if (i % 2 === 0 && t < 0.85) frPoly(s, [[x - 1.2, y - r + 1], [x, y - r - 2.2 + t * 1.2], [x + 1.2, y - r + 1]], pal[3]); }
    // patas abertas para os lados (cotovelo para cima), com garras
    for (const [hx, k, far] of [[16, 2, true], [30 + lunge, 3, true], [14, 0, false], [31 + lunge, 1, false]]) {
      const foot = I.walk ? frFoot(ph / FR_TAU + [0, 0.25, 0.5, 0.75][k], hx, g, 7, 3.4) : [hx + (far ? -1.5 : 1.5), g];
      frLeg(s, hx, cy + 3, foot[0] + (far ? -1 : 2), foot[1], { L1: 3.6, L2: 4, w1: 3.8, w2: 2.8, pal, hoof: [22, 36, 24], paw: 3, kneeDir: far ? 1 : -1 }, far);
      for (let c = 0; c < 3; c++) s.set(Math.round(foot[0] + 3 + c * 0.8), Math.round(foot[1] + (c - 1) * 0.5), [236, 232, 214]);
    }
    frFur(s, 24 + lunge * 0.6, cy, 13, 5.6, { pal, seed: 62, belly: 0.1, pattern: scutes, fur: 0.4 });
    frFur(s, 24 + lunge * 0.6, cy + 3.8, 10.5, 2.4, { pal: belly, seed: 3, fur: 0, sq: 2 });
    for (let i = 0; i < 10; i++) { const x = 12.5 + i * 2.5 + lunge * 0.4, y = cy - 5.2 + Math.abs(i - 4.5) * 0.25; frPoly(s, [[x - 1.3, y + 1.2], [x, y - 2], [x + 1.3, y + 1.2]], i % 2 ? pal[3] : pal[4]); }
    // cabeça: crânio, focinho longo com ressalto das narinas, mandíbula que abre, dentes irregulares e olho com sobrancelha
    const hx = 38 + lunge, hy = cy - 1.2, len = 14;
    frFur(s, hx, hy, 5.4, 4, { pal, seed: 90, fur: 0.4, pattern: scutes });
    frPoly(s, [[hx + 3, hy - 2.8], [hx + len + 3, hy - 1], [hx + len + 3.8, hy + 0.9], [hx + 3, hy + 1.5]], (x, y) => pal[clamp(Math.floor((1.6 - (y - hy)) * 1.15 + (hash2(x, y, 8) - 0.5) * 0.9), 0, 4)]);
    frFur(s, hx + len + 2, hy - 1.4, 1.8, 1.4, { pal, seed: 33, fur: 0 });                                          // ressalto das narinas
    frPoly(s, [[hx + 3, hy + 1.5], [hx + len + 3, hy + 1 + open], [hx + len + 2, hy + 3 + open], [hx + 3, hy + 3.6 + open * 0.5]], (x, y) => belly[clamp(Math.floor((3.6 - (y - hy - open * 0.5)) * 0.8), 0, 3)]);
    if (open > 1) frPoly(s, [[hx + 4, hy + 1.5], [hx + len + 2, hy + 1.2 + open * 0.3], [hx + len + 2, hy + open + 1], [hx + 4, hy + open * 0.5 + 1.9]], [172, 56, 62]);
    for (let i = 0; i < 7; i++) { const x = hx + 4.5 + i * 1.7, jag = (i % 3 === 0 ? 0.8 : 0); s.set(Math.round(x), Math.round(hy + 1.3 + (open > 1 ? 0.3 : 0)), [250, 248, 232]); if (jag) s.set(Math.round(x), Math.round(hy + 2.3), [250, 248, 232]); if (open > 1) { s.set(Math.round(x + 0.6), Math.round(hy + 1.3 + open * 0.5 + 0.8), [250, 248, 232]); } }
    s.set(Math.round(hx + len + 2.6), Math.round(hy - 1.6), [22, 38, 26]); s.set(Math.round(hx + len + 3.4), Math.round(hy - 1.6), [22, 38, 26]);
    shadeBall(s, hx + 1.2, hy - 3.6, 2.2, 1.9, (l) => pal[clamp(Math.floor(l * 5), 1, 4)]);
    s.set(Math.round(hx + 1.6), Math.round(hy - 3.6), [240, 204, 44]); s.set(Math.round(hx + 1.6), Math.round(hy - 3.1), [14, 12, 10]);
    if (f === 11) { s.set(Math.round(hx + 1.6), Math.round(hy - 3.6), pal[1]); s.set(Math.round(hx + 0.6), Math.round(hy - 3.6), pal[1]); }
    seg(s, hx - 0.8, hy - 4.6, hx + 2.8, hy - 4.3, 1, pal[1]);                                                       // sobrancelha
  };
  frSpecies('jacare', { name: 'Jacaré', biome: BIOME.SWAMP, hostile: true, hp: 52, speed: 30, damage: 11, w: 52, h: 14, drops: [[ITEM.LEATHER, 2, 4], [ITEM.MEAT, 2, 3], [ITEM.BONE, 1, 2]], color: '#3a6234', pad: 20 },
    faunaHook({ paint, sight: 9, chase: 1.5, gaitDiv: 4.4, heavy: true, idleChance: 0.7, atk: { kind: 'bite', reach: 6 * T, windup: 0.55, recover: 0.55, cd: 1.8, windFrame: 14, strikeFrame: 15, dmg: 14 } }), [70, 32], pal, 'tiger');
}
Object.assign(BESTIARY_LORE, {
  komodo: 'O maior lagarto da mesa: escamas de pedra, língua amarela farejando o vento e uma mordida cheia de bactérias. Lento, mas não perdoa quem chega perto.',
});
delete BESTIARY_LORE.lagarto;
