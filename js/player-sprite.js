'use strict';

const PLAYER_SPR_W = 32;
const PLAYER_SPR_H = 48;

// Paleta com 4 tons por material (escuro → claro)
const PLAYER_PALETTE = {
  // cabelo
  H: [92, 28, 32], h: [150, 44, 40], r: [196, 72, 52], R: [232, 118, 78],
  // pele
  K: [150, 96, 76], s: [204, 142, 108], S: [236, 184, 144], L: [252, 214, 180],
  // olho e boca
  W: [245, 245, 250], P: [40, 40, 70], m: [176, 96, 88],
  // jaqueta
  k: [40, 50, 80], j: [64, 82, 122], J: [92, 116, 160], G: [130, 156, 196],
  // camisa
  O: [214, 140, 70], o: [160, 96, 48],
  // cinto
  t: [66, 44, 30], y: [236, 200, 96],
  // calça
  n: [44, 40, 58], N: [66, 60, 84], v: [92, 84, 112],
  // botas
  x: [60, 36, 24], X: [94, 58, 38], z: [132, 86, 56], q: [34, 26, 26],
  // chapéu (contorno, sombra, base, brilho) e fita
  A: [70, 18, 22], B: [130, 34, 36], C: [184, 56, 50], D: [226, 100, 84], u: [40, 28, 26],
  // óculos: armação, lente e reflexo
  f: [28, 26, 32], E: [22, 24, 34], e: [150, 190, 230],
  // folhas da coroa de flores
  l: [86, 150, 70], i: [44, 90, 44],
};

const PLAYER_OUTLINE = [30, 22, 30];

// ---------- Partes do corpo (olhando para a direita) ----------
const HEAD = [
  '......hh........',
  '....hhrrrh......',
  '..hhrrRRrrhhh...',
  '.HhrrRRRrrrrhh..',
  '.Hhrrrrrrrhhh...',
  '.Hhhrrhhrrrhhh..',
  '.HhhhLSSSShhhh..',
  '.HhhSSLLSSShhh..',
  '.HhhSsSSSSHHSS..',
  '.HhKsSSSSSWPSS..',
  '.HhKSSSSSSWPSSL.',
  '..hKsSSSSSSSSSs.',
  '..HhssSSSSSmSs..',
  '...HhsSSSSSSs...',
  '....HhssSSss....',
  '......Ksss......',
  '.......ss.......',
];

// Tronco de costas (escada): a mesma jaqueta vista por trás, com a costura no meio e o cinto
const TORSO_BACK = [
  '..kJJJJJJk..',
  '.kJJJJJJJJk.',
  'kJJJJjjJJJJk',
  'kJJJJjjJJJJk',
  'kJJJJjjJJJJk',
  'kjJJJjjJJJjk',
  'kjjJJjjJJjjk',
  'kjjjJjjJjjjk',
  '.kjjjjjjjjk.',
  '.kttttttttk.',
  '.kjjjjjjjjk.',
  '.kjjjkkjjjk.',
  '.kjjk..kjjk.',
];
const TORSO = [
  '......kJJk......',
  '.....kGJJLOk....',
  '....kGJJkLOOk...',
  '....kGJjkLOok...',
  '....kJJjkOOok...',
  '....kJJykOOok...',
  '....kJJjkOOok...',
  '....kJjjkOOok...',
  '....kjJjkOOok...',
  '....kjJjkooOk...',
  '....kjjjkOook...',
  '....kttttyttk...',
  '....kJjk.jjjk...',
];

// Tronco de quem está agachado: o mesmo casaco, 3 linhas mais curto e levemente inclinado
// para a frente. A gola cobre o pescoço, e o corpo inteiro cabe em 2 blocos.
const TORSO_CROUCH = [
  '.......kJJk.....',
  '......kGJJLOk...',
  '.....kGJJkLOOk..',
  '.....kGJjkLOok..',
  '....kJJJykOOok..',
  '....kJJjjkOOok..',
  '....kjJjjkooOk..',
  '....kjjjjkOook..',
  '....ktttttyttk..',
  '....kJjjk.jjjk..',
];

// Engatinhando: o mesmo casaco visto de lado com as costas para cima (olhando para a direita).
// Quadril e cinto à esquerda, ombros e gola à direita, e a camisa aparecendo embaixo do peito.
const TORSO_CRAWL = [
  '.kGGGGGGGGGGJk.',
  'kGJJJJJJJJJJJLk',
  'kJJJJJjJJJJJLOk',
  'tJJJjjjjJJJJOOk',
  'tjjjjjjjjjjjOOk',
  'yjjjjjjjjjjkOok',
  'tkjjjjjjjjjkook',
  '.kkkkkkkkkkkkk.',
];

// Converte a arte ASCII em canvas com 1px de contorno ao redor
function pixelPart(rows, remap) {
  const w = Math.max(...rows.map((r) => r.length));
  const s = new Sprite(w + 2, rows.length + 2);
  rows.forEach((row, y) => {
    if (row.length !== w) console.warn('Linha do sprite com largura diferente:', row);
    for (let x = 0; x < row.length; x++) {
      let ch = row[x];
      if (ch === '.') continue;
      if (remap && remap[ch]) ch = remap[ch];
      s.set(x + 1, y + 1, PLAYER_PALETTE[ch]);
    }
  });
  return s.finish(PLAYER_OUTLINE);
}


// Each frame is rasterized once. Articulated knees/elbows, integer pixels only.
const PLAYER_POSES = [];
const PLAYER_ANIMS = {};
function addPoses(name, poses) {
  PLAYER_ANIMS[name] = PLAYER_POSES.length;
  PLAYER_POSES.push(...poses);
}
// hy/ty/sy/hipY = alturas da cabeça, tronco, ombro e quadril dentro do sprite de 48px.
// Agachado elas descem todas de uma vez (veja squatPose), e as pernas dobram.
const basePose = (extra = {}) => Object.assign(
  {bob:0, lean:0, feet:[15,18], lift:[0,0], hands:[13,16], handLift:[0,0],
   hy:5, hx:6, ty:22, tx:6, sy:26, hipY:35, hips:[14,18], shoulders:[18,14]}, extra);
addPoses('idle', [basePose(),basePose({breath:1}),basePose({breath:1,hair:1}),basePose({blink:true})]);
// ---------- Gags de quem fica parado (js/player.js escolhe uma de vez em quando) ----------
// Dancinha de discoteca em 12 quadros (3 movimentos de 4 batidas): o corpo desce dobrando os joelhos na batida e sobe nas pontas, balança o
// quadril de um lado para o outro e os pés abrem e fecham. Movimentos: (1) dedo de discoteca com o braço da frente para o alto e a mão de trás na
// cintura; (2) troca: o braço de trás sobe e o da frente vai à cintura; (3) os dois braços abertos em V no alto, batendo no ritmo.
addPoses('gagDance', Array.from({ length: 12 }, (_, i) => {
  const move = Math.floor(i / 4), s = i % 4, down = s % 2 === 0;       // down = batida (agachadinha), senão ponta (esticado)
  const hands = move === 0 ? [11, 24] : move === 1 ? [5, 17] : [3, 25];
  const handLift = move === 0 ? [3, down ? 22 : 27] : move === 1 ? [down ? 18 : 23, 4] : [down ? 20 : 25, down ? 22 : 27];
  const elbowLift = move === 0 ? [-2, 13] : move === 1 ? [12, -1] : [10, 12];
  return basePose({
    ik: 5, bob: down ? 3 : 0, lean: [1, 0, -1, 0][s], hair: down ? 0 : 1, mouthOpen: s === 0 ? 1 : 0,
    hands, handLift, elbowLift,
    feet: down ? [12, 20] : [15, 18], lift: [s === 1 ? 3 : 0, s === 3 ? 3 : 0],
  });
}));
// Bocejo: braços subindo e espreguiçada nas pontas dos pés com a boca bem aberta. O braço da frente
// sobe por trás da cabeça e o de trás estica para a frente, então nenhum cobre o rosto.
addPoses('gagYawn', [
  basePose({ hands: [22, 9], handLift: [8, 8], elbowLift: [5, 5], mouthOpen: 1 }),
  basePose({ bob: -1, hands: [25, 5], handLift: [19, 19], elbowLift: [10, 10], lift: [1, 1], blink: true, mouthOpen: 2 }),
  basePose({ bob: -1, lean: 1, hands: [26, 4], handLift: [20, 19], elbowLift: [10, 10], lift: [1, 1], blink: true, mouthOpen: 2 }),
  basePose({ hands: [16, 14], handLift: [5, 5], blink: true }),
]);
// Coçando o bumbum: a mão de trás vai para trás do quadril e coça; a cara é de alívio
addPoses('gagScratch', [
  basePose({ hands: [10, 16], handLift: [4, 0], lean: -1 }),
  basePose({ hands: [9, 16], handLift: [2, 0], lean: -1, blink: true }),
  basePose({ hands: [10, 16], handLift: [5, 0], lean: -1, blink: true }),
  basePose({ hands: [9, 16], handLift: [3, 0], lean: -1 }),
]);
// Cochilando em pé: cabeça pendendo com olhos fechados (respira) e o susto ao acordar
addPoses('gagDoze', [
  basePose({ hy: 6, hx: 7, blink: true, hands: [14, 15] }),
  basePose({ hy: 7, hx: 7, lean: 1, blink: true, hands: [14, 15], bob: 1 }),
  basePose({ hy: 4, handLift: [4, 4], hands: [12, 18], mouthOpen: 1, hair: 1 }),
]);
// Ciclo de passada: o pé apoiado recua enquanto o corpo avança, e o outro volta pelo ar para frente.
// Pé de trás: x = 15 + cos(a)*passo -> recua quando sen(a) > 0, então só levanta quando sen(a) < 0.
function gait(run) {
  const stride = run ? 7 : 4, lift = run ? 5 : 3, swing = run ? 5 : 3;
  return Array.from({length:12}, (_,i) => {
    const a = i / 12 * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    return basePose({
      ik: run ? 5.6 : 5, // comprimento de coxa/canela para o joelho articulado
      feet: [15 + Math.round(c * stride), 17 - Math.round(c * stride)],
      lift: [Math.round(Math.max(0, -s) * lift), Math.round(Math.max(0, s) * lift)],
      // Braços opostos às pernas; correndo, o braço que vai à frente sobe mais
      hands: [14 - Math.round(c * swing), 15 + Math.round(c * swing)],
      handLift: run ? [2 + Math.round(Math.max(0, -c) * 2), 2 + Math.round(Math.max(0, c) * 2)] : [0, 0],
      // Mais baixo no contato (pés afastados), mais alto na passagem
      bob: Math.abs(c) > 0.7 ? 1 : run ? -1 : 0,
      lean: run ? 1 : 0, hair: i % 6 < 3 ? 1 : 0,
    });
  });
}
addPoses('walk',gait(false)); addPoses('run',gait(true));
addPoses('jump', [basePose({bob:2,feet:[12,21],handLift:[2,2]}),basePose({feet:[13,21],lift:[4,1],hands:[11,21],handLift:[4,4]}),basePose({feet:[12,20],lift:[5,2],hands:[11,20],handLift:[2,3]}),basePose({feet:[13,20],lift:[2,3],hands:[10,21],handLift:[3,3]})]);
addPoses('land',[basePose({bob:3,feet:[12,21],hands:[11,20],handLift:[2,2]}),basePose({bob:1,feet:[14,19]})]);
addPoses('attack',[basePose({feet:[12,21],hands:[11,16],bob:1,noFrontArm:true,lean:-1}),basePose({feet:[11,22],hands:[10,16],bob:1,noFrontArm:true,lean:1}),basePose({feet:[12,21],hands:[12,16],bob:1,noFrontArm:true}),basePose({feet:[12,21],lift:[4,2],noFrontArm:true})]);
for(const name of ['mine','chop'])addPoses(name,[
basePose({feet:[13,20],bob:0,lean:-1,noFrontArm:true,noBackArm:true}),
basePose({feet:[13,20],bob:1,lean:0,noFrontArm:true,noBackArm:true}),
basePose({feet:[13,20],bob:2,lean:1,noFrontArm:true,noBackArm:true}),
basePose({feet:[13,20],bob:1,lean:0,noFrontArm:true,noBackArm:true})]);
addPoses('dig',[
basePose({feet:[13,20],bob:1,lean:0,noFrontArm:true,noBackArm:true}),
basePose({feet:[13,20],bob:2,lean:1,noFrontArm:true,noBackArm:true}),
basePose({feet:[13,20],bob:3,lean:1,noFrontArm:true,noBackArm:true}),
basePose({feet:[13,20],bob:0,lean:-1,noFrontArm:true,noBackArm:true})]);
// Agachado de cócoras (olhando para a direita), usado na transição entre em pé e engatinhando:
// quadril baixo e recuado, joelhos dobrados apontando para a frente, tronco e cabeça inclinados e os
// dois pés inteiros no chão, com os cotovelos dobrados e as mãos perto dos joelhos.
// kneeF/kneeB = joelho da frente e de trás (x, y); feet/hips = x dos pés e do quadril (trás, frente);
// elbows = cotovelos [trás, frente] em posição fixa.
const squatPose = (extra = {}) => basePose(Object.assign({
  hy: 18, hx: 8, ty: 30, tx: 6, sy: 33, hipY: 40, hips: [10, 12], shoulders: [15, 18],
  kneeB: [17, 37], kneeF: [21, 36], feet: [14, 21],
  elbows: [[14, 37], [21, 37]], hands: [17, 24], handLift: [4, 6], squat: true,
}, extra));
// Engatinhando (é assim que o jogador fica com S apertado): de quatro, com as mãos e os joelhos no
// chão, o tronco deitado e a cabeça na frente, desenhada por cima dos braços, com o rosto livre.
// Cabe em CROUCH_H (passa em vãos de 2 blocos). Quadros: parado (respira e pisca) e 6 de engatinhar,
// em que a mão da frente anda junto com o joelho de trás (e vice-versa), como engatinhar de verdade.
// Por ser um jogo bobinho: língua de fora engatinhando, rebolado quando fica parado e espirro de poeira.
const crawlPose = (extra = {}) => basePose(Object.assign({
  crawl: true, hy: 19, hx: 14, ty: 31, tx: 4, sy: 34, hipY: 37, hips: [6, 8], shoulders: [16, 18],
  kneeB: [6, 44], kneeF: [10, 44], feet: [3, 7], hands: [18, 22], handLift: [-1, -1],
}, extra));
addPoses('crouch', [crawlPose(), crawlPose({ bob: 1, hair: 1 }), crawlPose({ blink: true })]);
addPoses('crawl', Array.from({ length: 6 }, (_, i) => {
  const a = (i / 6) * Math.PI * 2, s = Math.sin(a), c = Math.cos(a), st = (v) => Math.round(v * 2);
  return crawlPose({
    hands: [18 - st(s), 22 + st(s)], handLift: [-1 + (c < -0.4 ? 2 : 0), -1 + (c > 0.4 ? 2 : 0)],
    kneeB: [6 + st(s), 44], kneeF: [10 - st(s), 44], feet: [3 + Math.round(s), 7 - Math.round(s)],
    lift: [c > 0.4 ? 1 : 0, c < -0.4 ? 1 : 0], bob: Math.abs(s) > 0.7 ? 1 : 0, hair: i < 3 ? 1 : 0, tongue: 1 + (i % 2),
  });
}));
// Rebolado: parado por um tempo, ele balança o bumbum de um lado para o outro (a cabeça fica parada)
const wiggle = (dx, up) => crawlPose({ torsoDx: dx, hips: [6 + dx, 8 + dx], hipY: 37 - up, kneeB: [6 + dx, 44], kneeF: [10 + dx, 44], feet: [3 + dx, 7 + dx], tongue: 1 });
addPoses('crawlWiggle', [wiggle(0, 0), wiggle(-1, 1), wiggle(0, 0), wiggle(1, 1)]);
// Espirro: "aaah..." (cabeça para trás, olhos fechados) e "ATCHIM!" (cabeça joga para a frente)
addPoses('crawlSneeze', [crawlPose({ hx: 13, hy: 17, blink: true }), crawlPose({ hx: 14, hy: 22, blink: true, torsoDx: -1 })]);
// Golpe e arco engatinhando: o braço de trás apoiado no chão, o da frente desenhado pela arma
addPoses('crawlAttack', [crawlPose({ noFrontArm: true, hands: [19, 22] })]);
// Ajoelhado de lado (limpando a caça): joelho de trás no chão, pé da frente firme com o joelho erguido, tronco quase
// de pé e inclinado para a frente; o braço de trás descansa sobre o joelho e o da frente fica por conta de quem
// desenha a ação (js/shark-harvest.js). Quadros: 0 neutro, 1 inclinado (serrando), 2 afundando o golpe.
const kneelPose = (extra = {}) => squatPose(Object.assign({
  tallTorso: true, hy: 10, hx: 7, ty: 26, tx: 5, sy: 30, hipY: 39, hips: [9, 12], shoulders: [14, 17],
  kneeB: [9, 43], kneeF: [19, 35], feet: [3, 20], elbows: [[15, 36], [19, 37]], hands: [19, 22], handLift: [5, 5], noFrontArm: true,
}, extra));
addPoses('kneel', [kneelPose(), kneelPose({ lean: 1, hx: 8, hy: 11 }), kneelPose({ lean: 2, hx: 9, hy: 13, bob: 1 })]);
// Transição curta entre em pé e engatinhando (descendo: 0 → 1; levantando: 1 → 0): primeiro os
// joelhos dobram, depois ele agacha com as mãos indo para os joelhos, e aí apoia as mãos no chão.
// Os pés não saem do lugar.
addPoses('crouchIn', [
  squatPose({ tallTorso: true, hy: 8, hx: 7, ty: 25, tx: 6, sy: 29, hipY: 37, hips: [12, 15], shoulders: [17, 15],
    kneeB: [16, 40], kneeF: [19, 40], feet: [14, 19], elbows: null, hands: [16, 18], handLift: [2, 3] }),
  squatPose(),
]);
// Usando ferramenta engatinhando: os dois braços e a ferramenta são desenhados por js/tool-action.js
addPoses('crouchTool', [
  crawlPose({ lean: -1, noFrontArm: true, noBackArm: true }),
  crawlPose({ bob: 1, noFrontArm: true, noBackArm: true }),
  crawlPose({ bob: 1, lean: 1, noFrontArm: true, noBackArm: true }),
  crawlPose({ noFrontArm: true, noBackArm: true }),
]);
// Nado (crawl): desenhado em pé e girado pelo renderer na direção do nado (js/water.js), então
// "para cima" no sprite é "para a frente" na água e o peito (+x) fica virado para o fundo.
// Os braços alternam: esticado à frente → puxa por baixo do corpo → volta por fora, por cima das costas.
// As pernas batem em tesoura, duas batidas por braçada.
addPoses('swim', Array.from({ length: 8 }, (_, i) => {
  const a = (i / 8) * Math.PI * 2, arm = (k) => a + k * Math.PI;
  const kick = Math.round(Math.sin(a * 2) * 3);
  return basePose({
    hands: [18 + Math.round(Math.sin(arm(0)) * 4), 14 + Math.round(Math.sin(arm(1)) * 4)],
    handLift: [Math.round(13 + Math.cos(arm(0)) * 14), Math.round(13 + Math.cos(arm(1)) * 14)],
    elbowLift: [Math.round(6 + Math.cos(arm(0)) * 6), Math.round(6 + Math.cos(arm(1)) * 6)], // cotovelo acompanha: braço esticado à frente
    feet: [14 + kick, 18 - kick], lift: [2 + Math.max(0, kick), 2 + Math.max(0, -kick)],
    hair: i % 2,
  });
}));
// Boiando parado (de pé na água): braços remando para os lados na altura do peito, pernas pedalando
// devagar e o corpo subindo e descendo 1px no ritmo das remadas.
addPoses('tread', Array.from({ length: 6 }, (_, i) => {
  const a = (i / 6) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
  return basePose({
    hands: [10 + Math.round(c * 3), 22 - Math.round(c * 3)], handLift: [7 + Math.round(s), 7 - Math.round(s)],
    feet: [14 + Math.round(s * 2), 18 - Math.round(s * 2)], lift: [3 + Math.round(Math.max(0, s) * 3), 3 + Math.round(Math.max(0, -s) * 3)],
    ik: 5, bob: s > 0.5 ? -1 : 0, hair: i < 3 ? 1 : 0,
  });
}));
// Sentado na cadeira (js/player.js): quadril em cima da almofada, coxas para a frente, canelas
// descendo até o chão e as mãos no colo. O tronco é o de pé, só um pouco mais baixo.
const sitPose = (extra = {}) => squatPose(Object.assign({
  tallTorso: true, hy: 7, hx: 6, ty: 24, tx: 6, sy: 28, hipY: 37, hips: [12, 14], shoulders: [18, 14],
  kneeB: [19, 37], kneeF: [21, 37], feet: [19, 22], elbows: null, hands: [18, 20], handLift: [3, 3],
}, extra));
addPoses('sit', [sitPose(), sitPose({ breath: 1 }), sitPose({ blink: true })]);
// Braços recolhidos junto ao tronco e pés alongados; rosto composto à parte.
addPoses('flightSide',Array.from({length:8},(_,i)=>basePose({
 feet:[13,17],lift:[i===2||i===3?1:0,0],hips:[14,17],hands:[12,17],handLift:[0,1],
 elbows:[[11,31],[17,31]],noHead:true,
})));
// Escada (js/player.js: climbing): o personagem fica DE COSTAS, agarrado aos dois trilhos (flag `back`: tronco e cabeça traseiros,
// pernas lado a lado). Subindo: as mãos se alternam de degrau em degrau, os pés respondem em cruz e o corpo balança para o lado
// da mão que puxa. Descendo: mãos mais baixas, escorregando, pés tateando. Parado: pendurado, respirando.
// Quadros: climb 0-7 (subindo), climbDown 0-7 (descendo), climbHold 0-1 (pendurado).
const backPose = (extra = {}) => basePose(Object.assign({
  back: true, noBackArm: true, noFrontArm: true, tx: 9, hx: 7, hips: [12, 19],
}, extra));
// Tudo alinhado ao eixo do corpo (sem inclinar o tronco): só as mãos mudam de altura (poucos pixels, os dois braços sempre esticados
// para cima) e os pés sobem um de cada vez, com o joelho saindo um pixel para fora.
const backLegs = (f0, f1) => ({ lift: [f0, f1] });
addPoses('climb', Array.from({ length: 8 }, (_, i) => {
  const a = (i / 8) * Math.PI * 2, u0 = Math.sin(a), hl = [Math.round(21 + 4 * u0), Math.round(21 - 4 * u0)];
  return backPose(Object.assign({
    hair: i % 2, bob: Math.abs(Math.sin(a * 2)) > 0.7 ? 1 : 0,
    handLift: hl, elbowLift: [Math.round(hl[0] * 0.6), Math.round(hl[1] * 0.6)],
  }, backLegs(Math.round(Math.max(0, Math.sin(a + Math.PI / 2)) * 4), Math.round(Math.max(0, -Math.sin(a + Math.PI / 2)) * 4))));
}));
addPoses('climbDown', Array.from({ length: 8 }, (_, i) => {
  const a = -(i / 8) * Math.PI * 2, u0 = Math.sin(a), hl = [Math.round(18 + 3 * u0), Math.round(18 - 3 * u0)];
  return backPose(Object.assign({
    hair: i % 2, bob: i % 4 < 2 ? 0 : 1,
    handLift: hl, elbowLift: [Math.round(hl[0] * 0.55), Math.round(hl[1] * 0.55)],
  }, backLegs(Math.round(Math.max(0, Math.sin(a + Math.PI / 2)) * 3), Math.round(Math.max(0, -Math.sin(a + Math.PI / 2)) * 3))));
}));
addPoses('climbHold', [
  backPose(Object.assign({ handLift: [23, 21], elbowLift: [12, 11] }, backLegs(0, 0))),
  backPose(Object.assign({ bob: 1, handLift: [23, 21], elbowLift: [12, 11] }, backLegs(0, 0))),
]);
const CROUCH_BLEND = 0.14; // segundos da transição ao engatinhar/levantar (2 quadros de crouchIn)
const PLAYER_ATTACK_FRAME=PLAYER_ANIMS.attack;
const PLAYER_ATTACK_AIR_FRAME=PLAYER_ANIMS.attack+3;

// Aba do sobretudo (abaixo do cinto) e capuz do moletom (atrás da nuca)
const COAT_TAIL = ['kJJjkjjjk.', 'kJjjkjjjk.', 'kJjjk.jjjk', 'kjjk..jjjk'];
// Capa comprida de bainha rasgada, caída nas costas (Capa do Besourinho Misterioso)
// Capa comprida (Capa do Besourinho Misterioso): azul vivo com dobras, bainha rasgada e gola com fecho dourado.
// Tons a b c d = sombra → luz; as dobras descem em diagonal e a bainha tem dentes irregulares.
Object.assign(PLAYER_PALETTE, { a: [12, 14, 34], b: [28, 34, 78], c: [50, 62, 122], d: [92, 108, 172] });
const SCOUT_CAPE = Array.from({ length: 27 }, (_, y) => {
  let row = '';
  for (let x = 0; x < 15; x++) {
    const left = Math.round(10 - y * 0.42), hem = 24 + ((x * 7 + 3) % 5) - 2 - (x > 11 ? 3 : 0);
    if (x < left || y > hem || (y === 0 && x < 9)) { row += '.'; continue; }
    const ridge = (x + Math.floor(y * 0.5)) % 5 === 0, edge = x <= left + 1, shade = x >= 12 || y > hem - 2;
    row += shade ? 'a' : edge ? 'd' : ridge ? 'c' : (x + y) % 9 === 0 ? 'c' : 'b';
  }
  return row;
});
// Peitilho azul do macacÃ£o da Camisa Encanada (botÃµes dourados nas alÃ§as)
const PLUMBER_BIB = ['.gggg.', 'gyggyg', 'IggggU', 'IggggU', 'IggggU', 'IggggU', 'IggggU', 'IggggU', 'UggggU', 'UUUUUU'];
// Cor das mÃ£os: branca (luvas) com a Camisa Encanada, senÃ£o a pele
const playerGloves = () => PLAYER_OUTFIT === 'moustacheShirt' && !PLAYER_LOOK_PREVIEW;
const playerHandRgb = () => playerGloves() ? 'rgb(250,250,252)' : rgb(PLAYER_PALETTE.S);
// Manto de viajante: gola alta, pregas largas e três pontas de tecido.
const SCOUT_MANTLE = [
  '.....aaaaaaa.....',
  '....acddddcca....',
  '....abccccbba....',
  '...acbbbabbcca...',
  '...acccbabbcca...',
  '..accccbabbbca...',
  '..accccbaabbcca..',
  '..accccbaabbcca..',
  '.acccccbaabbbca..',
  '.accccbbaabbbcca.',
  '.accccbbaabbbcca.',
  'acccccbbaabbbbca.',
  'accccbbaaabbbbca.',
  'accccbbaaabbbbca.',
  'accccbbaaabbbbcca',
  'acccbbaaaabbbbcca',
  'acccbbaaaabbbbcca',
  'acccba...abbbbcca',
  '.acba.....abbcca.',
  '.aaa.......abca..',
  '..a.........aa...',
];
const SCOUT_COLORS={a:'#202330',b:'#414757',c:'#657180',d:'#9daeba'};
function drawScoutMantle(ctx, frameX, pose) {
  const compact=pose.squat||pose.crawl, height=compact?12:21;
  const anchorX=pose.tx+pose.lean-1, anchorY=pose.ty+pose.bob-1;
  const step=clamp((pose.feet[0]-pose.feet[1])/12,-1,1);
  for(let row=0;row<height;row++){
    const src=SCOUT_MANTLE[Math.floor(row*SCOUT_MANTLE.length/height)];
    const bend=Math.round(step*Math.pow(row/height,2)*2);
    for(let col=0;col<src.length;col++)if(src[col]!=='.'){
      ctx.fillStyle=SCOUT_COLORS[src[col]];
      ctx.fillRect(frameX+anchorX+col+bend,anchorY+row,1,1);
    }
  }
}
const HOOD = ['.kjj..', 'kjJJj.', 'kJGJj.', 'kJJJj.', 'kjJJjk', '.kjJJk', '..kkk.'];

// frames: quantos quadros gerar (a galeria do criador só precisa do primeiro)
function buildPlayerSprite(frames=PLAYER_POSES.length) {
  const atlas=makeCanvas(frames*32,48), c=atlas.getContext('2d');
  c.imageSmoothingEnabled=false;
  const look=currentLook(), look0=look, top=TOP_STYLES[look.top], shorts=look.legs===1; // roupa do criador (js/character.js)
  const head=playerHeadParts(), heads=[head.open,head.blink];
  // cabeça de costas: pega só o lado de trás da cabeça de perfil (cabelo, boné, chapéu) e espelha, então fica simétrica e a aba do
  // boné e o nariz não aparecem. O rosto vira cabelo com brilho no topo e uma leve textura; só a nuca (últimas linhas) mostra a pele.
  const hb=composeHead(look0), headBack=(()=>{
    const rows=hb.rows, cx=7+hb.ox, W=Math.max(...rows.map(r=>r.length),cx*2+1), hairTop=Math.max(0,rows.findIndex(r=>/[HhrR]/.test(r)));
    const out=rows.map((row,y)=>{
      let r='';
      for(let i=0;i<W;i++){
        const src=i<=cx?i:2*cx-i;
        let ch=src>=cx-5&&src<row.length?row[src]:'.';   // só 5 colunas de cada lado do centro: de costas a cabeça não pode ser mais larga que o tronco
        if('SsLKWPm'.includes(ch)&&y<rows.length-3){
          const edge=src<=cx-4;
          const d=Math.abs(src-cx);
          ch=y===hairTop+1&&d<=2?'R':y<hairTop+3?'r':edge||y>rows.length-7?'H':(d+y)%4===0?'r':(d<=1&&y<hairTop+7)?'R':'h'; // topo claro, miolo com textura, redemoinho no centro, laterais escuras
        }
        r+=ch;
      }
      return r;
    });
    return pixelPart(out);
  })();
  const torsoBack=pixelPart(TORSO_BACK,TOP_STYLES[look0.top].remap);
  const torso=playerTorsoPart(TORSO), torsoCrouch=playerTorsoPart(TORSO_CROUCH), torsoCrawl=playerTorsoPart(TORSO_CRAWL);
  const coat=top.coat&&pixelPart(COAT_TAIL), scout=PLAYER_OUTFIT==='referenceScout'&&!PLAYER_LOOK_PREVIEW, bib=PLAYER_OUTFIT==='moustacheShirt'&&!PLAYER_LOOK_PREVIEW&&pixelPart(PLUMBER_BIB), hood=top.hood&&pixelPart(HOOD);
  PLAYER_POSES.slice(0,frames).forEach((p,i)=>{
    const x=i*32;
    c.save();c.beginPath();c.rect(x,0,32,48);c.clip(); // cabelo volumoso e abas largas não vazam para o quadro vizinho
    function line(ax,ay,bx,by,width,color) {
      c.fillStyle=rgb(color);
      const n=Math.max(Math.abs(bx-ax),Math.abs(by-ay),1);
      for(let j=0;j<=n;j++)c.fillRect(x+Math.round(ax+(bx-ax)*j/n)-Math.floor(width/2),Math.round(ay+(by-ay)*j/n)-Math.floor(width/2),width,width);
    }
    function leg(back) {
      const k=back?0:1, foot=p.feet[k], floor=46-p.lift[k], hip=p.hips[k], hipY=p.hipY+p.bob;
      let knee=Math.round((hip+foot)/2), ky=p.hipY+5+p.bob-Math.round(p.lift[k]*0.5);
      if(p.knee){ // pose com joelho fixo (agachado): o de trás fica mais recuado
        knee=p.knee[0]+(back?-5:0); ky=p.knee[1]+p.bob+(back?1:0);
      } else if(p.ik){
        // Dois ossos iguais: o joelho sempre dobra para frente (direção em que o personagem olha)
        const L=p.ik, dx=foot-hip, dy=(floor-3)-hipY, d=Math.min(Math.hypot(dx,dy),L*2-0.01);
        const ang=Math.atan2(dy,dx)-Math.acos(d/(L*2));
        knee=Math.round(hip+Math.cos(ang)*L); ky=Math.round(hipY+Math.sin(ang)*L);
      }
      const shade=back?PLAYER_PALETTE.n:PLAYER_PALETTE.N;
      line(hip,hipY,knee,ky,5,PLAYER_OUTLINE);line(knee,ky,foot,floor-3,5,PLAYER_OUTLINE);
      line(hip,hipY,knee,ky,3,shade);line(knee,ky,foot,floor-3,3,shorts?(back?PLAYER_PALETTE.s:PLAYER_PALETTE.S):shade); // bermuda: canela de fora
      line(hip-1,hipY,knee-1,ky,1,back?PLAYER_PALETTE.N:PLAYER_PALETTE.v);
      c.fillStyle=rgb(PLAYER_OUTLINE);c.fillRect(x+foot-2,floor-3,7,4);
      c.fillStyle=rgb(back?PLAYER_PALETTE.x:PLAYER_PALETTE.X);c.fillRect(x+foot-1,floor-3,5,3);
      c.fillStyle=rgb(PLAYER_PALETTE.z);c.fillRect(x+foot-1,floor-3,3,1);
    }
    function arm(back) {
      const k=back?0:1, shoulder=p.shoulders[k], hx=p.hands[k], hy=p.sy+10+p.bob-p.handLift[k];
      let ex=Math.round((shoulder+hx)/2)+(back?1:-1), ey=p.sy+5+p.bob-(p.elbowLift?p.elbowLift[k]:p.handLift[k]);
      if(p.elbows){ex=p.elbows[k][0];ey=p.elbows[k][1]+p.bob;} // cotovelo em posição fixa (agachado: dobrado, perto do joelho)
      line(shoulder,p.sy+p.bob,ex,ey,5,PLAYER_OUTLINE);line(ex,ey,hx,hy-2,4,PLAYER_OUTLINE);
      line(shoulder,p.sy+p.bob,ex,ey,3,scout?(back?[47,53,66]:[101,113,128]):back?PLAYER_PALETTE.j:PLAYER_PALETTE.J);
      line(ex,ey,hx,hy-2,2,scout?[65,71,87]:back?PLAYER_PALETTE.k:PLAYER_PALETTE.j);
      line(hx,hy-1,hx,hy,3,playerGloves()?(back?[196,200,212]:[252,252,254]):back?PLAYER_PALETTE.s:PLAYER_PALETTE.S);
    }
    // Coxa + canela com contorno (mesma espessura das pernas em pé)
    function limb(pts,shade,hi,skin) {
      for(let j=1;j<pts.length;j++)line(pts[j-1][0],pts[j-1][1],pts[j][0],pts[j][1],5,PLAYER_OUTLINE);
      for(let j=1;j<pts.length;j++)line(pts[j-1][0],pts[j-1][1],pts[j][0],pts[j][1],3,j>1&&shorts?skin:shade);
      if(hi)line(pts[0][0],pts[0][1]-1,pts[1][0],pts[1][1]-1,1,hi);
    }
    function boot(bx,by,w,h,dark) {
      c.fillStyle=rgb(PLAYER_OUTLINE);c.fillRect(x+bx-1,by-1,w+2,h+2);
      c.fillStyle=rgb(dark?PLAYER_PALETTE.x:PLAYER_PALETTE.X);c.fillRect(x+bx,by,w,h);
      c.fillStyle=rgb(PLAYER_PALETTE.z);c.fillRect(x+bx,by,Math.max(1,w-2),1);
      c.fillStyle=rgb(PLAYER_PALETTE.q);c.fillRect(x+bx,by+h-1,w,1); // sola
    }
    // Perna de cócoras: coxa do quadril até o joelho (à frente), canela descendo até a bota no chão.
    function squatLeg(back) {
      const k=back?0:1, hipY=p.hipY+p.bob, [kx,ky]=back?p.kneeB:p.kneeF, foot=p.feet[k], floor=46-p.lift[k];
      limb([[p.hips[k],hipY],[kx,ky+p.bob],[foot+1,floor-3]],back?PLAYER_PALETTE.n:PLAYER_PALETTE.N,back?null:PLAYER_PALETTE.v,back?PLAYER_PALETTE.s:PLAYER_PALETTE.S);
      boot(foot-1,floor-3,5,3,back);
    }
    // Perna engatinhando: coxa descendo do quadril até o joelho no chão e canela deitada para trás,
    // com a bota de ponta no chão
    function crawlLeg(back) {
      const k=back?0:1, [kx,ky]=back?p.kneeB:p.kneeF, y=ky-p.lift[k], ank=p.feet[k];
      limb([[p.hips[k],p.hipY+p.bob],[kx,y],[ank+2,y]],back?PLAYER_PALETTE.n:PLAYER_PALETTE.N,back?null:PLAYER_PALETTE.v,back?PLAYER_PALETTE.s:PLAYER_PALETTE.S);
      boot(ank-1,y-2,3,3,back);
    }
    // Perna de costas: reta, 3 px de largura com contorno; levantada, o joelho sai um pouco para fora e a bota sobe. Bota centrada na perna.
    function backLeg(k) {
      const side=k?1:-1, hipX=p.hips[k], hipY=p.hipY+p.bob, lift=p.lift[k], fy=43-lift, fx=hipX+(lift>0?side:0);
      const ky=Math.round((hipY+fy)/2), kx=hipX+(lift>0?side*2:0), shade=k?PLAYER_PALETTE.N:PLAYER_PALETTE.n;
      line(hipX,hipY,kx,ky,5,PLAYER_OUTLINE);line(kx,ky,fx,fy,5,PLAYER_OUTLINE);
      line(hipX,hipY,kx,ky,3,shade);line(kx,ky,fx,fy,3,shade);
      c.fillStyle=rgb(PLAYER_OUTLINE);c.fillRect(x+fx-3,fy-1,7,6);
      c.fillStyle=rgb(k?PLAYER_PALETTE.X:PLAYER_PALETTE.x);c.fillRect(x+fx-2,fy,5,4);
      c.fillStyle=rgb(PLAYER_PALETTE.z);c.fillRect(x+fx-2,fy,5,1);
      c.fillStyle=rgb(PLAYER_PALETTE.q);c.fillRect(x+fx-2,fy+3,5,1);
    }
    // Braço de costas (desenhado antes do tronco e da cabeça): ombro → cotovelo aberto ao lado da cabeça → mão no degrau, acima da cabeça; mão de 3x3 com contorno
    function backArm(k) {
      const side=k?1:-1, sx=k?20:11, sy0=p.sy+2+p.bob, hx=k?22:9, hy=p.sy+10+p.bob-p.handLift[k], ex=Math.round((sx+hx)/2), ey=Math.round((sy0+hy)/2);   // braço curto e reto, quase vertical, rente à cabeça
      const up=k?PLAYER_PALETTE.J:PLAYER_PALETTE.j, fore=k?PLAYER_PALETTE.j:PLAYER_PALETTE.k;
      line(sx,sy0,ex,ey,5,PLAYER_OUTLINE);line(ex,ey,hx,hy,5,PLAYER_OUTLINE);
      line(sx,sy0,ex,ey,3,up);line(ex,ey,hx,hy,3,fore);
      c.fillStyle=rgb(PLAYER_OUTLINE);c.fillRect(x+hx-2,hy-4,5,5);
      c.fillStyle=playerHandRgb();c.fillRect(x+hx-1,hy-3,3,3);
    }
    if(!p.noBackArm)arm(true);
    if(p.back){ // de costas (escada): pernas retas lado a lado, tronco traseiro e braços esticados pelos trilhos
      backArm(0);backArm(1); // os braços esticam para a frente dele (para os degraus): de costas, ficam ATRÁS do tronco e da cabeça, só as pontas aparecem
      backLeg(0);backLeg(1);
      c.drawImage(torsoBack,x+p.tx+p.lean,p.ty+p.bob);
    } else if(p.crawl){
      crawlLeg(true);
      c.drawImage(torsoCrawl,x+p.tx+p.lean+(p.torsoDx||0),p.ty+p.bob); // torsoDx: o quadril rebola sem mexer a cabeça
      crawlLeg(false);
      if(!p.noFrontArm)arm(false); // de quatro, o braço da frente fica atrás da cabeça
    } else if(p.squat){
      squatLeg(true);
      c.drawImage(p.tallTorso?torso:torsoCrouch,x+p.tx+p.lean,p.ty+p.bob); // transição: tronco inteiro, ainda meio de pé
      squatLeg(false); // a coxa da frente passa por cima do quadril
    } else {
      leg(true);
      leg(false);
      c.drawImage(torso,x+p.tx+p.lean,p.ty+p.bob);

      if(bib)c.drawImage(bib,x+p.tx+p.lean+5,p.ty+p.bob+2);
      if(coat&&!scout)c.drawImage(coat,x+p.tx+p.lean+4,p.ty+p.bob+12);
    }
    if(scout)drawScoutMantle(c,x,p);
    // Breathing changes the collar/chest; feet and shoulders retain their anchors.
    if(hood&&!p.crawl&&!p.back)c.drawImage(hood,x+p.tx+p.lean-1,p.ty+p.bob-8); // capuz caído nas costas, atrás da cabeça
    if(p.breath&&!scout&&!p.back){c.fillStyle=rgb(PLAYER_PALETTE.L);c.fillRect(x+17,p.ty+2+p.bob,2,1);}
    if(!p.noHead)c.drawImage(p.back?headBack:heads[p.blink?1:0],x+p.hx+p.lean-head.ox,p.hy+p.bob-head.oy);
    if(p.hair&&head.tuft){c.fillStyle=rgb(PLAYER_PALETTE.r);c.fillRect(x+p.hx+p.lean-head.ox+head.tuft[0],p.hy+p.bob-head.oy+head.tuft[1],2,1);}
    // Língua de fora (engatinhando feito cachorrinho): sai da boca e balança
    // Boca aberta (cantando, bocejando, levando susto): 1 = pequena, 2 = bocejo bem aberto
    if(p.mouthOpen&&head.mouth){
      const mx=x+p.hx+p.lean-head.ox+head.mouth[0]+1, my=p.hy+p.bob-head.oy+head.mouth[1]+1, big=p.mouthOpen>1;
      c.fillStyle=rgb([70,26,34]);c.fillRect(mx-(big?1:0),my,big?3:2,big?3:2);
      if(big){c.fillStyle=rgb([214,96,110]);c.fillRect(mx,my+2,1,1);}
    }
    if(p.tongue&&head.mouth){
      const mx=x+p.hx+p.lean-head.ox+head.mouth[0]+1, my=p.hy+p.bob-head.oy+head.mouth[1]+2;
      c.fillStyle=rgb([226,98,112]);c.fillRect(mx,my,1,p.tongue);
      c.fillStyle=rgb([150,52,70]);c.fillRect(mx,my+p.tongue,1,1);
    }
    if(!p.noFrontArm&&!p.crawl)arm(false);
    c.restore();
  });
  if(PLAYER_OUTFIT==='tiger'&&!PLAYER_LOOK_PREVIEW)paintOutfitStripes(atlas); // listras da pelagem de tigre (js/character.js)
  else if(!(PLAYER_OUTFIT&&!PLAYER_LOOK_PREVIEW))paintJacketPattern(atlas,look.pattern); // estampa escolhida no criador
  return atlas;
}
function playerFrame(p) {
  if(p.seat){const t=(p.visualTime||0)%4.7;return PLAYER_ANIMS.sit+(t>3.9&&t<4.03?2:t%2.4<1.2?0:1);} // sentado na cadeira
  if(p.crouching){
    if((p.crouchAge??1)<CROUCH_BLEND)return PLAYER_ANIMS.crouchIn+(p.crouchAge<CROUCH_BLEND/2?0:1); // descendo: meio de pé, depois quase agachado
    if(p.sneezeT>0)return PLAYER_ANIMS.crawlSneeze+(p.sneezeT>0.22?0:1); // "aaah..." e "ATCHIM!"
    if(Math.abs(p.vx)<5){ // parado de quatro: balança a cabeça, pisca e, de vez em quando, rebola
      if(p.wiggleT>0)return PLAYER_ANIMS.crawlWiggle+Math.floor(p.wiggleT*12)%4;
      const t=(p.visualTime||0)%4.7;
      return PLAYER_ANIMS.crouch+(t>3.9&&t<4.05?2:t%2.4<1.2?0:1);
    }
    return PLAYER_ANIMS.crawl+Math.floor(p.anim/2.5)%6; // engatinhando: mão e joelho opostos juntos
  }
  if(p.climbing&&!p.swimming){ // na escada: sobe puxando, desce escorregando, parado fica pendurado
    if(Math.abs(p.vy)<5)return PLAYER_ANIMS.climbHold+(Math.floor((p.visualTime||0)*1.6)%2);
    return (p.vy<0?PLAYER_ANIMS.climb:PLAYER_ANIMS.climbDown)+(Math.floor(p.climbPhase||0)%8+8)%8;
  }
  // Nadando: braçada quando está indo para algum lado, boiando parado quando não (js/water.js)
  if(p.swimming&&!p.onGround)return p.swimStroking?PLAYER_ANIMS.swim+Math.floor(p.swimAnim||0)%8:PLAYER_ANIMS.tread+Math.floor((p.visualTime||0)*5)%6;
  if(p.onGround&&(p.crouchAge??1)<CROUCH_BLEND)return PLAYER_ANIMS.crouchIn+(p.crouchAge<CROUCH_BLEND/2?1:0); // levantando: o contrário
  if(!p.onGround){
    if(p.jumpAge<0.034)return PLAYER_ANIMS.jump;
    if(p.jumpAge<0.10&&p.vy<0)return PLAYER_ANIMS.jump+1;
    return PLAYER_ANIMS.jump+(p.vy < -60?2:3);
  }
  if(p.landTimer>0)return PLAYER_ANIMS.land+(p.landTimer>0.055?0:1);
  if(Math.abs(p.vx)>5)return (Math.abs(p.vx)>110?PLAYER_ANIMS.run:PLAYER_ANIMS.walk)+Math.floor(p.anim)%12;
  if(p.gag)return gagFrame(p); // parado há um tempo: dancinha, bocejo, coçadinha ou cochilo (js/player.js)
  const t=(p.visualTime||0)%4.7;
  if(t>3.9&&t<4.03)return PLAYER_ANIMS.idle+3;
  return PLAYER_ANIMS.idle+(t%2.4<0.8?0:t%2.4<1.6?1:2);
}
function playerAttackFrame(p,s) {
  if(p.crouching)return PLAYER_ANIMS.crawlAttack; // engatinhando: golpeia de quatro, sem levantar
  if(!p.onGround)return PLAYER_ATTACK_AIR_FRAME;
  return PLAYER_ATTACK_FRAME+(s.t<s.prof.preparacao?0:s.t<s.prof.preparacao+s.prof.corte?1:2);
}

// Quadro da gag em andamento (p.gag = { kind, t, dur }, controlada por js/player.js)
function gagFrame(p) {
  const g = p.gag, k = g.t / g.dur, A = PLAYER_ANIMS;
  if (g.kind === 'dance') return A.gagDance + Math.floor(g.t * 10) % 12;
  if (g.kind === 'yawn') return A.gagYawn + [0, 1, 1, 2, 2, 1, 3][Math.min(6, Math.floor(k * 7))];
  if (g.kind === 'scratch') return A.gagScratch + Math.floor(g.t * 10) % 4;
  return A.gagDoze + (k > 0.88 ? 2 : Math.floor(g.t * 0.8) % 2);
}
