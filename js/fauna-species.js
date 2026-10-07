'use strict';
// =====================================================================================
//  FAUNA NOVA, PARTE 1: mamíferos de quatro patas (esquilo, raposa-do-ártico, zebra, texugo, fenec, suricato, coiote, jaguar)
// =====================================================================================
// Cada espécie é um frQuad (js/fauna-rig.js) com paleta, padrão de pelagem, cabeça e rabo próprios, mais os quadros
// especiais dela. Biomas: veja `biome`/`biomes` em cada definição (wildlifePool em js/wildlife.js).
// Carrega depois de fauna-rig.js.

// ---------------------------------------------------------------- Raposa-do-ártico (tundra)
{
  const pal = [[116, 130, 150], [176, 190, 206], [216, 226, 236], [240, 246, 252], [255, 255, 255]];
  const legs = { fore: { L1: 5, L2: 5, w1: 2.6, w2: 1.9, pal, hoof: [60, 66, 80], paw: 2 }, hind: { L1: 5.5, L2: 5.5, w1: 3, w2: 2, pal, hoof: [60, 66, 80], paw: 2 } };
  const head = { style: 'canine', skull: [4.6, 4.1], snout: { len: 6, h: 2.2, tipH: 1.3 }, ears: { style: 'point', h: 5, w: 4.2, dx: 0, inner: [232, 190, 200], pal: [[120, 134, 154], [182, 196, 212], [232, 240, 248]] }, eye: { dx: 2.1, dy: -0.4 }, nose: [30, 28, 36], whisk: true };
  const P = (f) => ({
    ground: 31, cx: 22, cy: 21, rx: 10, ry: 5.4, pal, seed: 21, belly: 0.1, legs, stride: 8.5, lift: 3.2, gait: 'trot', bob: 1,
    head, neck: [6, -3.5], tail: frTail('bushy', pal, { len: 13, w: 4, rise: 3, swing: 2.4, tip: [[170, 184, 200], [214, 224, 234], [246, 250, 254]] }),
    pose: (I) => (I.idle === 2 ? { headDy: 6, headDx: 3, tilt: 0.55, bodyDy: 0 } : I.idle === 3 ? { earTwitch: true, eyeClosed: true } : I.idle === 1 ? { headDy: -1 } : {}),
  });
  frSpecies('raposaartico', { name: 'Raposa-do-ártico', biome: BIOME.SNOW, hp: 9, speed: 62, w: 24, h: 13, drops: [[ITEM.LEATHER, 1, 1], [ITEM.MEAT, 1, 1]], color: '#e8eef4' },
    faunaHook({ paint: (s, p, f) => frQuad(s, f, P(f)), scare: 6, flee: 1.9, gaitDiv: 3.2 }), [46, 32], pal, 'kitsune');
}

// ---------------------------------------------------------------- Texugo (floresta, hostil)
{
  const pal = [[27,28,31],[57,59,63],[94,97,100],[137,141,143],[181,185,185]];
  // rosto: faixa branca no meio da testa até o focinho e máscara escura em volta dos olhos
  const face = (dx,dy,nx,ny) => nx>.05&&nx<.7&&ny>-.8&&ny<.4?[29,29,32]:ny>.55?[195,198,192]:[243,244,230];
  const legs = { fore: { L1: 4, L2: 3.6, w1: 3.4, w2: 2.6, pal, hoof: [20, 18, 22], paw: 3 }, hind: { L1: 4.2, L2: 3.8, w1: 3.6, w2: 2.6, pal, hoof: [20, 18, 22], paw: 3 } };
  const head = { style: 'canine', skull: [4.8,4.2], snout: { len: 4, h: 2.3, tipH: 1.2, wide: 1.1, drop: 1.2 }, ears: { style: 'round', h: 2.8, w: 3.4, dx: -.4, inner:[80,79,75], pal:[[45,46,48],[153,156,155],[242,242,227]] }, eye: { dx: 2, dy: -.4, big:true }, nose: [22,23,25], pattern: face, pal };
  const P = (f) => ({
    ground: 27, cx: 19, cy: 17.5, rx: 11, ry: 6.5, pal, seed: 41, belly: -.2, fur:.5, legs, stride: 6, lift: 2.4, gait: 'trot', bob: 1, sq: 2.2,
    pattern:(dx,dy,nx,ny,idx)=>ny<.15&&(dx*2+dy+60)%6===0?pal[clamp(idx+1,0,4)]:ny>.55?pal[1]:null,
    head, neck: [4.6, 1], neckThick: .9, tail: frTail('stub', pal, { w: 2.2 }),
    pose: (I, f) => (f === 14 ? { bodyDy: 3, headDx: -1, headDy: 3, open: 2.2 } : f === 15 ? { bodyDy: -1, headDx: 3, open: 3.4, tilt: -0.1 } : I.idle === 2 ? { headDy: 3, headDx: 3, tilt: 0.5 } : I.idle === 3 ? { earTwitch: true } : {}),
  });
  frSpecies('texugo', { name: 'Texugo', biome: BIOME.FOREST, hostile: true, hp: 22, speed: 46, damage: 7, w: 26, h: 15, drops: [[ITEM.LEATHER, 1, 2], [ITEM.MEAT, 1, 2]], color: '#6a6874' },
    faunaHook({ paint: (s, p, f) => frQuad(s, f, P(f), f === 15 ? 12 : f === 14 ? 8 : f), sight: 11, heavy: false, gaitDiv: 3, atk: { kind: 'lunge', reach: 5 * T, windup: 0.4, recover: 0.5, cd: 1.8, windFrame: 14, strikeFrame: 15, dash: 3.2, hop: 170 } }), [44, 30], pal, 'wolf');
}
