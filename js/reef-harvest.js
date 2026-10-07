'use strict';
// =====================================================================================
//  CORAIS QUEBRÁVEIS: o recife do fundo do mar entra no sistema de colheita de enfeites
// =====================================================================================
// Os corais, anêmonas, mariscos e capim-marinho do fundo (js/ocean-art.js) são desenhos sorteados pela semente,
// não blocos. Para quebrá-los sem criar tiles novos, eles se passam por "enfeite do chão" do js/environment.js:
//   - environmentDecoration devolve o sprite do recife sobre a areia do fundo, ou null se já foi colhido;
//   - o clique esquerdo (mão ou ferramenta) colhe, solta o item do coral, estilhaça na cor dele e o lugar fica vazio
//     (world.decorCut, que vai junto no save); depois de alguns minutos o coral cresce de novo;
//   - environmentDecorationAt também acha o coral pelos blocos vizinhos, porque o sprite é mais largo que um bloco.
// Carrega depois de environment.js e ocean-art.js.

Object.assign(ENV_HARVEST, {
  reefBranch:   { item: ITEM.CORAL_BRANCH, volta: 480 },
  reefTube:     { item: ITEM.CORAL_BRANCH, volta: 480 },
  reefFan:      { item: ITEM.CORAL_FAN, volta: 480 },
  reefBrain:    { item: ITEM.CORAL_BRAIN, volta: 540 },
  reefTable:    { item: ITEM.CORAL_BRAIN, count: 1, countMax: 2, volta: 600 },
  reefAnemone:  { item: ITEM.SEAWEED, count: 1, countMax: 2, lamina: true, volta: 360 },
  reefSeagrass: { item: ITEM.SEAWEED, count: 1, countMax: 3, lamina: true, volta: 240 },
  reefUrchin:   { item: ITEM.SHELL, volta: 420 },
  reefStarfish: { item: ITEM.STARFISH, volta: 600 },
  reefShell:    { item: ITEM.SHELL, volta: 600 },
  reefClam:     { item: ITEM.SHELL, extra: [[ITEM.PEARL, 0.45, 1]], volta: 720 },
});
for (const k of ['reefBranch', 'reefTube', 'reefFan', 'reefBrain', 'reefTable', 'reefUrchin', 'reefShell', 'reefClam']) ENV_STONEY.add(k);   // quebram com som de pedra

{
  const baseDecoration = environmentDecoration;
  environmentDecoration = function (world, x, y, ceiling = false) {
    if (!ceiling && world.oceanStart < world.w && x >= world.oceanStart && y === world.surface[x]) {
      const reef = oaReefAt(world, x, y);
      if (reef !== undefined) return reef;
    }
    return baseDecoration(world, x, y, ceiling);
  };
  const baseAt = environmentDecorationAt;
  environmentDecorationAt = function (world, cx, cy) {
    const hit = baseAt(world, cx, cy);
    if (hit || world.oceanStart >= world.w || cx < world.oceanStart - 3) return hit;
    // o coral tem 2 a 3 blocos de largura: clicar em qualquer parte dele vale, mesmo ancorado na coluna do lado
    for (const dx of [-1, 1, -2, 2]) {
      const ax = cx + dx;
      if (ax < world.oceanStart || ax >= world.w) continue;
      const s = world.surface[ax], sprite = oaReefAt(world, ax, s);
      if (!sprite) continue;
      const left = ax * T + T / 2 - sprite.width / 2, top = s * T - sprite.height + 2;
      if (left + sprite.width > cx * T + 2 && left < cx * T + T - 2 && cy * T + T - 2 > top && cy * T + 2 < s * T + 2) return { x: ax, y: s, ceiling: false, sprite };
    }
    return null;
  };
}
