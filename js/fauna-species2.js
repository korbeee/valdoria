'use strict';
// =====================================================================================
//  FAUNA NOVA, PARTE 2: fenec, suricato, coiote, jaguar e macaco
// =====================================================================================
// Mesma receita de js/fauna-species.js (frQuad + paleta + padrão de pelagem + cabeça + rabo + poses próprias).
// Carrega depois de fauna-species.js.

// ---------------------------------------------------------------- Fenec (deserto e mesa)
{
  const pal = [[116, 82, 50], [168, 126, 80], [212, 176, 120], [238, 212, 162], [252, 240, 206]];
  const legs = { fore: { L1: 4, L2: 4, w1: 2.2, w2: 1.6, pal, hoof: [70, 52, 38], paw: 2 }, hind: { L1: 4.2, L2: 4.2, w1: 2.6, w2: 1.8, pal, hoof: [70, 52, 38], paw: 2 } };
  const head = { style: 'canine', skull: [4.2, 3.8], snout: { len: 4.2, h: 1.9, tipH: 1.1 }, ears: { style: 'point', h: 9, w: 5, dx: -0.2, lean: 1.2, inner: [236, 168, 170], pal: [[120, 86, 56], [186, 146, 98], [236, 208, 160]] }, eye: { dx: 1.9, dy: -0.4, big: true }, nose: [30, 24, 26], whisk: true };
  const P = () => ({
    ground: 27, cx: 15, cy: 18.5, rx: 7.6, ry: 4.5, pal, seed: 51, belly: 0.12, legs, stride: 6.5, lift: 2.8, gait: 'trot', bob: 1,
    head, neck: [4.6, -2.5], tail: frTail('bushy', pal, { len: 11, w: 3.2, rise: 2, swing: 2, tip: [[28, 22, 22], [60, 48, 44], [92, 74, 66]] }),
    pose: (I) => (I.idle === 2 ? { headDy: 3, headDx: 2, tilt: 0.45 } : I.idle === 3 ? { earTwitch: true, eyeClosed: true } : I.idle === 1 ? { headDy: -1 } : {}),
  });
  frSpecies('fenec', { name: 'Fenec', biomes: [BIOME.DESERT, BIOME.MESA], hp: 8, speed: 66, w: 20, h: 12, drops: [[ITEM.LEATHER, 1, 1], [ITEM.MEAT, 1, 1]], color: '#dcb98a' },
    faunaHook({ paint: (s, p, f) => frQuad(s, f, P()), scare: 6, flee: 2, gaitDiv: 3, hop: { vy: 120, wait: 0.9 } }), [34, 28], pal, 'kitsune');
}

// ---------------------------------------------------------------- Suricato (savana): vigia em pé
{
  const pal = [[88, 62, 42], [140, 104, 68], [190, 154, 106], [224, 196, 148], [246, 230, 192]];
  const belly = [[60, 44, 34], [112, 84, 60], [172, 140, 100], [214, 190, 146]];
  const legs = { fore: { L1: 3, L2: 3, w1: 2, w2: 1.5, pal, paw: 2 }, hind: { L1: 3.4, L2: 3.4, w1: 2.4, w2: 1.7, pal, paw: 3 } };
  const rings = (dx, dy, nx, ny) => (nx > 0.1 && ny > -0.5 && ny < 0.3 && Math.hypot(nx - 0.45, ny + 0.1) < 0.5 ? [58, 40, 34] : null);
  const headPal = [[170, 136, 96], [208, 176, 128], [236, 214, 170], [250, 240, 208]];
  const head = { style: 'rodent', skull: [3.6, 3.4], snout: { len: 4, h: 1.5, tipH: 0.9, drop: 0.8 }, ears: { style: 'round', h: 2.4, w: 2.4, dx: -0.2, pal: belly }, eye: { dx: 1.7, dy: -0.3, big: true }, nose: [24, 20, 22], pattern: rings, pal: headPal };
  const P = () => ({
    ground: 33, cx: 14, cy: 24, rx: 7, ry: 3.8, pal, seed: 61, belly: 0.1, legs, stride: 5.5, lift: 2.4, gait: 'trot', bob: 1,
    head, neck: [4.4, -2], tail: frTail('thin', pal, { len: 11, w: 1.8, drop: 3, swing: 2.6, tip: [60, 44, 36] }),
    pose: (I) => (I.idle === 2 ? { headDy: 2, headDx: 1.5, tilt: 0.3 } : I.idle === 3 ? { eyeClosed: true } : {}),
  });
  // Em pé (14/15): braços dobrados no peito e a cabeça girando para vigiar
  const stand = (s, f) => {
    const cx = 13, g = 33, look = f === 15 ? 1 : 0;
    for (let i = 0; i <= 11; i++) { const t = i / 11, y = g - 2 - Math.sin(t * 2.2) * 3 + t * 2; seg(s, cx - 4 - t * 9, y, cx - 5 - t * 9, y, 2 - t * 0.7, pal[1]); }
    frLeg(s, cx - 2, g - 6, cx - 4, g, { L1: 4, L2: 3.6, w1: 3, w2: 2, pal, paw: 4 }, true);
    frFur(s, cx, g - 11, 4.8, 8.4, { pal, seed: 62, belly: 0.1 });
    frFur(s, cx + 1.6, g - 10, 3, 5.8, { pal: belly, seed: 5, fur: 0.5, pattern: (dx, dy, nx, ny) => (ny > -0.2 && ny < 0.5 && (dx + dy) % 3 === 0 ? [74, 54, 44] : null) });
    frLeg(s, cx + 1, g - 6, cx + 1, g, { L1: 4, L2: 3.6, w1: 3, w2: 2, pal, paw: 4 }, false);
    seg(s, cx + 2, g - 14, cx + 3.5, g - 11, 1.8, pal[2]); seg(s, cx + 3.5, g - 11, cx + 2, g - 10, 1.8, pal[1]);
    frHead(s, cx + 1.5 + look, g - 22, { ...head, tilt: look ? -0.2 : 0.05 });
  };
  frSpecies('suricato', { name: 'Suricato', biome: BIOME.SAVANNA, hp: 7, speed: 60, w: 14, h: 13, drops: [[ITEM.MEAT, 1, 1], [ITEM.LEATHER, 0, 1]], color: '#c8a46c' },
    faunaHook({ paint: (s, p, f) => (f >= 14 ? stand(s, f) : frQuad(s, f, P())), scare: 5, flee: 2, gaitDiv: 2.6, idleChance: 0.75, idleRate: 1.2, frames: { idle: (m, f) => (f === 8 || f === 10 ? (Math.floor(m.clock * 0.9) % 2 ? 14 : 15) : f) } }), [28, 36], pal, 'rabbit');
}

// ---------------------------------------------------------------- Coiote (mesa e deserto, hostil)
{
  const pal = [[46, 36, 32], [96, 80, 64], [148, 126, 96], [194, 172, 134], [232, 214, 176]];
  const legs = { fore: { L1: 6, L2: 6, w1: 2.8, w2: 2, pal, hoof: [34, 28, 26], paw: 2 }, hind: { L1: 6.5, L2: 6, w1: 3.2, w2: 2.2, pal, hoof: [34, 28, 26], paw: 2 } };
  const head = { style: 'canine', skull: [4.8, 4.2], snout: { len: 7, h: 2.2, tipH: 1.2 }, ears: { style: 'point', h: 6.5, w: 4.6, dx: 0, inner: [222, 170, 160], pal: [[52, 40, 34], [128, 108, 84], [212, 190, 150]] }, eye: { dx: 2.2, dy: -0.4, iris: [210, 160, 30] }, nose: [22, 18, 20], whisk: true };
  const saddle = (dx, dy, nx, ny, idx) => (ny < -0.15 && ny > -0.95 ? pal[Math.max(0, idx - 1)] : null);
  const P = () => ({
    ground: 33, cx: 23, cy: 22, rx: 11, ry: 5.6, pal, seed: 71, belly: 0.14, legs, stride: 10, lift: 3.6, gait: 'trot', bob: 1, pattern: saddle,
    head, neck: [6.5, -3.5], tail: frTail('bushy', pal, { len: 13, w: 3.6, rise: 5, swing: 2.4, tip: [[24, 20, 20], [60, 48, 44], [100, 82, 72]] }),
    pose: (I, f) => (f === 14 ? { bodyDy: 2.5, headDx: -2, headDy: 3, open: 1.8, tilt: 0.1 } : f === 15 ? { bodyDy: -1, headDx: 3, open: 3.4, tilt: -0.12 } : I.idle === 2 ? { headDy: 5, headDx: 3, tilt: 0.5 } : I.idle === 3 ? { earTwitch: true } : {}),
  });
  frSpecies('coiote', { name: 'Coiote', biomes: [BIOME.MESA, BIOME.DESERT], hostile: true, hp: 20, speed: 78, damage: 7, w: 28, h: 17, drops: [[ITEM.LEATHER, 1, 2], [ITEM.MEAT, 1, 2], [ITEM.BONE, 0, 1]], color: '#a08a68' },
    faunaHook({ paint: (s, p, f) => frQuad(s, f, P(), f === 15 ? 12 : f === 14 ? 8 : f), sight: 13, chase: 1.2, gaitDiv: 3.4, atk: { kind: 'lunge', reach: 6 * T, windup: 0.38, recover: 0.5, cd: 1.7, windFrame: 14, strikeFrame: 15, dash: 3.1, hop: 190 } }), [48, 34], pal, 'wolf');
}

// ---------------------------------------------------------------- Macaco (selva)
{
  const pal = [[40, 28, 22], [82, 54, 34], [128, 88, 52], [176, 132, 82], [218, 178, 126]];
  const skin = [[128, 88, 70], [176, 126, 100], [214, 164, 132], [240, 200, 168]];
  const mask = (dx, dy, nx, ny) => (nx > 0.05 && ny > -0.4 && ny < 0.85 && Math.hypot(nx * 0.9, ny * 0.8) < 1.15 ? skin[Math.min(3, 1 + Math.floor((0.5 - ny * 0.4) * 2))] : null);
  const legs = { fore: { L1: 6, L2: 6, w1: 2.6, w2: 2, pal, hoof: skin[0], paw: 3, kneeDir: -1 }, hind: { L1: 5, L2: 4.6, w1: 3, w2: 2.2, pal, hoof: skin[0], paw: 3 } };
  const head = { style: 'primate', skull: [4.8, 4.4], snout: { len: 2.4, h: 2.4, tipH: 1.9, drop: 1.4, wide: 1 }, ears: { style: 'round', h: 3.6, w: 3.6, dx: -0.5, inner: skin[2], pal: [[60, 40, 30], [150, 106, 70], [200, 150, 110]] }, eye: { dx: 2.2, dy: -0.4, big: true }, nose: [60, 40, 38], pattern: mask, pal };
  const P = () => ({
    ground: 38, cx: 17, cy: 25, rx: 7.6, ry: 5.6, pal, seed: 91, belly: 0.1, legs, stride: 8, lift: 3, gait: 'trot', bob: 1, shK: 0.6,
    head, neck: [5, -4], neckThick: 0.8, tail: frTail('whip', pal, { swing: 2.4, up: 1.1 }),
    pose: (I) => (I.idle === 2 ? { headDy: 3, headDx: 2, tilt: 0.4 } : I.idle === 3 ? { eyeClosed: true } : {}),
  });
  // Sentado coçando a cabeça (14/15)
  const sit = (s, f) => {
    const cx = 14, g = 39, scratch = f === 15;
    for (let i = 0; i <= 16; i++) { const t = i / 16, y = g - 2 - Math.sin(t * 3) * 6 + t * 2; seg(s, cx - 5 - t * 7, y, cx - 5 - t * 7, y, 2 - t * 0.5, pal[1]); }
    frLeg(s, cx - 3, g - 6, cx - 5, g, { L1: 4, L2: 3.5, w1: 3.4, w2: 2.4, pal, hoof: skin[0], paw: 4 }, true);
    frFur(s, cx, g - 11, 6, 8.4, { pal, seed: 92, belly: 0.06 });
    frFur(s, cx + 2.4, g - 10, 3.4, 5.6, { pal: skin, seed: 6, fur: 0.3 });
    frLeg(s, cx + 3, g - 5, cx + 6, g - 1, { L1: 4, L2: 3.5, w1: 3.2, w2: 2.2, pal, hoof: skin[0], paw: 4 }, false);
    frHead(s, cx + 2, g - 23, { ...head, tilt: scratch ? -0.2 : 0.05 });
    const ax = cx + 5, ay = g - 14;
    if (scratch) { seg(s, ax, ay, ax + 3, g - 24, 2.4, pal[2]); seg(s, ax + 3, g - 24, ax + 1, g - 27, 2.4, pal[3]); }
    else { seg(s, ax, ay, ax + 3, g - 11, 2.4, pal[2]); seg(s, ax + 3, g - 11, ax + 5, g - 9, 2.4, pal[3]); }
  };
  frSpecies('macaco', { name: 'Macaco', biome: BIOME.JUNGLE, hp: 14, speed: 54, w: 20, h: 21, drops: [[ITEM.MEAT, 1, 2], [ITEM.FIBER, 0, 2]], color: '#8a5c38' },
    faunaHook({ paint: (s, p, f) => (f >= 14 ? sit(s, f) : frQuad(s, f, P())), scare: 6, flee: 2, gaitDiv: 3, hop: { vy: 230, wait: 1 }, idleChance: 0.55, frames: { idle: (m, f) => (f === 10 ? (Math.floor(m.clock * 4) % 2 ? 14 : 15) : f) } }), [34, 40], pal, 'tanuki');
}
