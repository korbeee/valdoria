'use strict';

// Append after furniture IDs (120–140); existing item/save IDs are unchanged.
ITEM.EMERGENCY_AXE=141;
// `ferramentaOutros`: com que ponta ele bate em bloco que pede ferramenta que ele não tem
// (terra, areia e afins pedem pá) — o lado pontudo, que é o que cava esse tipo de bloco.
// `danoCorpo`: batendo sem mirar bloco ele vira arma (js/game.js, js/combat.js); machado
// de resgate corta bem, mas fica abaixo da espada de ferro (9).
defItem(ITEM.EMERGENCY_AXE,{
  name:'Machado de emergência',ferramenta:'machado',ferramentas:['machado','picareta'],
  ferramentaOutros:'picareta',danoCorpo:6,
  nivel:0,velocidade:1.4,forca:.16,golpe:.65,alcanceFerramenta:2,maxStack:1,
  descricao:'Machado e picareta de emergência — mais lento e fraco que madeira',
});
function toolSupports(def,kind){return !!def&&(def.ferramenta===kind||!!def.ferramentas?.includes(kind));}
function toolKindFor(def,tile){const kind=TILE_DEFS[tile]?.ferramenta;return toolSupports(def,kind)?kind:(def.ferramentaOutros||def.ferramenta);}

// Machado de resgate de avião, copiado da foto: cabeça laranja em gancho, furo
// triangular no meio, fio de aço grosso na curva de corte, virola de metal e cabo de
// borracha preta com o quadriculado antiderrapante.
// Desenhado na mesma diagonal das outras ferramentas (cabo embaixo à esquerda, cabeça
// em cima à direita), então ele fica na mão e gira no golpe igual machado/picareta.
ITEM_ART[ITEM.EMERGENCY_AXE]={
  cores:{
    O:[255,152,112], // brilho da cabeça
    o:[246,104,64],  // laranja claro
    r:[222,66,36],   // laranja
    R:[150,38,22],   // laranja escuro
    D:[96,24,16],    // sombra da cabeça
    h:[52,22,16],    // furo triangular
    e:[238,244,248], // fio de aço
    E:[176,184,192], // aço médio
    S:[108,116,126], // virola
    W:[70,76,84],    // virola escura
    l:[96,100,108],  // relevo do cabo (quadriculado)
    g:[60,62,68],    // cabo
    k:[30,31,35],    // cabo escuro
    n:[18,18,22],    // sombra do cabo
  },
  pixels:[
    '......eEOor.....',
    '.....eEoorhr....',
    '.....eErrrhhro..',
    '......eERrrrrro.',
    '........RRD..Rr.',
    '.......ESW......',
    '......gkn.......',
    '.....lgk........',
    '....gkn.........',
    '...lgk..........',
    '..gkn...........',
    '.lgk............',
    '.gk.............',
    '................',
    '................',
    '................',
  ],
};

// Ele bate com duas pontas: o fio de aço corta madeira, o bico laranja fura pedra.
// [x, y, espelhar]: ponto do ícone (em pixels) que drawToolAction (js/tool-action.js)
// leva até o bloco, conforme a ferramenta que aquele bloco pede. O fio fica do lado de
// cima do cabo, então o machado entra espelhado — assim a cabeça sobe e o fio desce no
// bloco; o bico laranja já segue a linha do cabo e a picareta não espelha.
const EMERGENCY_AXE_TIPS={machado:[5.5,1.5,true],picareta:[14.5,3.5,false]};
