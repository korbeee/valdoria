'use strict';

// =====================================================================================
//  ÍCONES DOS ITENS DE CHEFE (e das comidas da caverna)
// =====================================================================================
// Pixel art 16x16 desenhada à mão, pixel a pixel. Todos usam a mesma paleta (ICON_PAL), com
// rampas de 4 tons por material: luz vindo de cima à esquerda, sombras puxando para o frio e
// luzes para o quente. O contorno escuro de 1px vem depois, na montagem do atlas (js/tiles.js),
// por isso o desenho fica dentro das colunas e linhas 1..14.

const ICON_PAL = {
  // osso / dente / garra (escuro -> brilho)
  a: [112, 88, 72], b: [176, 154, 122], c: [226, 210, 174], d: [252, 246, 226],
  // ouro
  g: [116, 66, 26], h: [186, 120, 38], i: [234, 178, 62], j: [255, 230, 136],
  // couro
  l: [72, 40, 28], m: [124, 72, 42], n: [174, 112, 64],
  // pelo marrom
  p: [58, 36, 32], q: [98, 64, 44], r: [140, 96, 62], s: [184, 138, 92],
  // vermelho (carne, coração)
  R: [94, 20, 38], S: [156, 34, 48], U: [210, 60, 62], V: [244, 122, 108], '4': [250, 186, 160],
  // aço
  A: [58, 64, 86], B: [106, 116, 138], C: [166, 176, 194], D: [230, 236, 244],
  // laranja / âmbar
  E: [126, 50, 24], F: [198, 94, 32], G: [240, 146, 44], H: [255, 204, 100],
  // vidro
  I: [56, 92, 128], J: [102, 158, 198], K: [166, 214, 236], L: [230, 248, 255],
  // seda
  M: [108, 100, 140], N: [164, 158, 192], O: [212, 208, 232], P: [248, 246, 254],
  // quitina azul
  W: [28, 34, 60], X: [50, 68, 108], Y: [84, 114, 160], Z: [144, 178, 218],
  // roxo
  5: [54, 30, 72], 6: [96, 58, 120], 7: [146, 100, 170], 8: [204, 166, 224],
  // madeira
  w: [80, 50, 30], x: [130, 86, 50], y: [180, 130, 76],
  // verde de veneno
  t: [52, 108, 42], u: [120, 198, 72], v: [204, 248, 150],
  // pedra
  '!': [66, 62, 64], '@': [110, 104, 100], '$': [156, 148, 138], '%': [204, 196, 182],
  // argila
  Q: [96, 46, 30], '#': [156, 82, 46], '&': [206, 128, 74],
  // areia
  T: [150, 116, 70], z: [204, 170, 110], '9': [240, 220, 168],
  // fantasma
  0: [74, 62, 140], 1: [116, 104, 196], 2: [168, 158, 234], 3: [220, 214, 252],
  // fixos: linha interna escura, brilho branco, brilho quente, brasa
  k: [30, 22, 28], '*': [255, 255, 248], e: [255, 238, 176], o: [255, 142, 52],
};
const bossArt = (pixels) => ({ cores: ICON_PAL, pixels });

// ---------- Urso ----------
ITEM_ART[ITEM.SUCCULENT_MEAT] = bossArt([ // pernil suculento com o osso para fora
  '................', '...........dd...', '..........dccd..', '...........cb...', '.....SSSS.cb....', '...SUVVUUSb.....',
  '..SUV**VUUSR....', '..UVVVUUUUUSR...', '.SUVUUUURUUUSR..', '.SUUUURUUUURUSR.', '.SUUURUUUURUUSR.', '..SUUUUUURUUSR..',
  '..4SUUUUUUUSRR..', '...44SSSSSSRR...', '.....4444RR.....', '................',
]);
ITEM_ART[ITEM.ALPHA_CLAWS] = bossArt([ // luva de couro com três garras de osso
  '................', '........d.......', '.......db...d...', '......cb...db...', '......cb..cb....', '.....cb..cb...d.',
  '.....ca.cb...db.', '..srrr.ca...cb..', '.srrrrrr..ccb...', '.srrrqrrqca.....', '.srqrrrqrq......', '.srrrrqrrq......',
  '..srrrrrq.......', '..ihhhhhg.......', '..qrqrqrq.......', '................',
]);
ITEM_ART[ITEM.PATRIARCH_HIDE] = bossArt([ // pele estendida do urso, cabeça em cima e patas abertas
  '................', '.....p....p.....', '....pqp..pqp....', '....qrrrrrrq....', '....rkrssrkr....', '.....rssssr.....',
  '......rkkr......', '.cqrqrrrrrrqrqc.', '..pqrrrsrrrrqp..', '...qrrsrqrrrq...', '...qrsrrqrrrq...', '...qrrsrqrrrq...',
  '..qrrrsrqrrrrq..', '.cqrrqrrrrqrrqc.', '.c.qq..rq..qq.c.', '................',
]);
ITEM_ART[ITEM.BROKEN_FANG] = bossArt([ // presa quebrada num cordão, com capa de ouro
  '................', '..n..........n..', '...m........m...', '....m......m....', '.....mm..mm.....', '......ihhg......',
  '.....ijiihg.....', '.....dccccb.....', '.....dcccbb.....', '......dccba.....', '......dcbba.....', '.......cba......',
  '.......cab......', '.......b.a......', '................', '................',
]);
ITEM_ART[ITEM.WILD_HEART] = bossArt([ // coração ainda pulsando, com as veias de cima
  '.....US..SU.....', '.....US..SU.....', '...SSUSS.SUSS...', '..SUVVUUSUUUUR..', '..UV**VUUUUUUR..', '..UVVUUUUUUURR..',
  '..SUUUUUUURURR..', '...SUUUUUURURR..', '...SUUUUUUURR...', '....SUUUUURR....', '.....SUUURR.....', '......SURR......',
  '.......RR.......', '................', '................', '................',
]);
ITEM_ART[ITEM.SEISMIC_PAW] = bossArt([ // pata de pedra com garras e rachaduras em brasa, num cabo curto
  '...d..d..d..d...', '...c..c..c..c...', '..%$.%$.%$.%$...', '..$@.$@.$@.$@...', '.%$$o$$$$$$$$@..', '.$$$$eo$$$$$$@..',
  '.$$$$$$o$$$$@!..', '..@$$$$$eo$$@!..', '...!@@@@@@@!!...', '......gihg......', '.......yx.......', '.......yx.......',
  '.......nm.......', '.......yx.......', '......gihg......', '................',
]);
ITEM_ART[ITEM.BOTTLED_ROAR] = bossArt([ // frasco com o rugido rodando lá dentro, rolha de madeira
  '................', '......xyyx......', '......wxxw......', '......KLJI......', '......KLJI......', '.....KLKKJI.....',
  '....JLKKKKKJ....', '...JL*KKKKKKI...', '...JLGGGGGGGI...', '...JGHFFHFFGI...', '...JGFHFFHFGI...', '...JGHFFHFFGI...',
  '....IGGFFGGI....', '.....IIIIII.....', '................', '................',
]);
ITEM_ART[ITEM.ANCIENT_HONEY] = bossArt([ // pote de barro tampado com pano, mel escorrendo
  '................', '....OPPOOOOO....', '...OPPOOOOONN...', '...NOOOOOONNM...', '....mnmmmmmm....', '....&######Q....',
  '...&ij######Q...', '..&#i&#######Q..', '..&#j########Q..', '..&##########Q..', '..&#hhhhhhhh#Q..', '..&##########Q..',
  '...&########Q...', '....QQQQQQQQ....', '................', '................',
]);
ITEM_ART[ITEM.CUB_SPIRIT] = bossArt([ // ursinho de fumaça, translúcido
  '................', '...12......12...', '...2332222221...', '..233222222221..', '..23k*2222k*21..', '..222223322221..',
  '..12222kk22211..', '...1222222221...', '....12333221....', '...1223333221...', '...1223333221...', '...1222222221...',
  '....12.22.21....', '.....1..2..1....', '........1.......', '................',
]);
ITEM_ART[ITEM.ALPHA_TROPHY] = bossArt([ // cabeça do Patriarca numa placa de madeira
  '................', '..yyyyyyyyyyyx..', '.yxxqrxxxxrqxxw.', '.yxqsrrrrrrrqxw.', '.yxrsrrrrrrrrxw.', '.yxrkerrrrkerxw.',
  '.yxrrrrssrrrrxw.', '.yxqrrsssssrqxw.', '.yxqrssskssrqxw.', '.yxxqrdkkkdqxxw.', '.yxxxqrRRRrqxxw.', '..xxxxqqqqqxxw..',
  '...wxxxxxxxxw...', '.....wwwwww.....', '................', '................',
]);

// ---------- Tigre ----------
ITEM_ART[ITEM.PREDATOR_STEP] = bossArt([ // tornozeleira de pelo listrado com uma garra pendurada
  '................', '................', '....EFGHHGFE....', '..FGHkGGGkGHGF..', '.FGk........kGF.', '.Gk..........kF.',
  '.FGk........kGE.', '..EFkGGGkGGkFE..', '....EEFihFEE....', '.......ih.......', '......dcb.......', '......ccb.......',
  '.......cb.......', '.......cba......', '........ba......', '................',
]);
ITEM_ART[ITEM.AMBER_EYE] = bossArt([ // olho de âmbar com pupila de gato num aro de ouro
  '................', '.....giiiig.....', '...giHHHHGGig...', '..giH*HGkGGFig..', '.giHHHGGkkGFFig.', '.iHHHGGGkkGFFEg.',
  '.iHHGGGGkkGFFEg.', '.iHGGGGGkkGFEEg.', '.gHGGGGGkkFFEEg.', '.giGGGGGkkFEEgg.', '..giGFFFkFEEgg..', '...ggFFFFEEgg...',
  '.....ggggggg....', '................', '................', '................',
]);
ITEM_ART[ITEM.STRIPED_CLOAK] = bossArt([ // capa de pelo de tigre com gola clara e fecho de ouro
  '................', '.....dccccb.....', '....dcciicbb....', '....GHGkkGGF....', '...GkHGGGGGkF...', '...HGkGGkGkGF...',
  '..GHGGGGkGGGGF..', '..kkHGGGGGGFkk..', '..HGkkGGGGkkGF..', '.GHGGGkGGkGGGFE.', '.HGGkGGGGGGkGFE.', '.kkGHGGkkGGFGkk.',
  '.HGkkGGGGGGkkFE.', '.FFFFkFFFFkFFFE.', '.E.EE.EE.EE.EE..', '................',
]);
ITEM_ART[ITEM.HUNT_INSTINCT] = bossArt([ // medalhão de ouro com a pegada do tigre acesa
  '................', '.....hiiiih.....', '...hijjiiiihg...', '..hjmmmmmmmmhg..', '..immmHmmHmmmg..', '.himHmGmmGmHmmg.',
  '.himGmmmmmmGmmg.', '.immmmmmmmmmmmg.', '.immmmHHHHmmmmg.', '.immmHHHGGGmmmg.', '.himmHHGGGGmmhg.', '..immmGGGGmmmg..',
  '..hhmmmmmmmmgg..', '...hhhhhhhggg...', '.....hhgggg.....', '................',
]);

// ---------- Fiandeira ----------
ITEM_ART[ITEM.MATRIARCH_SPOOL] = bossArt([ // carretel de seda com o gancho de aço na ponta do fio
  '..........DC....', '.........C..B...', '.........C......', '..........CB....', '...........P....', '..........P.....',
  '.yyyyyyyyxP.....', '.xwwwwwwwwww....', '..OPPOPPOPN.....', '..NOONOONOM.....', '..OPPOPPOPN.....', '..NOONOONOM.....',
  '.yyyyyyyyyx.....', '.xwwwwwwwwww....', '................', '................',
]);
ITEM_ART[ITEM.SPINNER_NEEDLE] = bossArt([ // lança-agulha com a ponta pingando veneno
  '................', '..............D.', '.............DB.', '............DCu.', '...........CB.v.', '.........hih....',
  '.........ig.....', '........76......', '.......76.......', '......76........', '.....75.........', '....86..........',
  '...nm...........', '..nl............', '.hg.............', '................',
]);
ITEM_ART[ITEM.SILK_GLOVES] = bossArt([ // par de luvas de seda, com um fio grudento
  '................', '.N.N............', '.N.N.....PN.....', '.NNNN.PN.ON.PN..', '.NNNM.ON.ON.ON..', '.MNNM.ON.ON.ON..',
  '..MM..POOOOOON..', '..66PPOOOOOOON..', '..65NOOOOOOOON..', '.....NOOOOOONM..', '......NOOOONM...', '......7888876...',
  '......6777765...', '.........P......', '.........P......', '................',
]);
ITEM_ART[ITEM.HUNT_COCOON] = bossArt([ // casulo pendurado, enrolado em espiral
  '.......N........', '.......N........', '.......N........', '.....PPOMM......', '....PPONOOM.....', '....POOOOOM.....',
  '...OPOOONNNM....', '...PPONOONNM....', '...PNOOONMNM....', '...POOONNNMM....', '...OONONNNMM....', '....OOONMMM.....',
  '....OOMNNMM.....', '.....ONNMM......', '.....N...N......', '................',
]);
ITEM_ART[ITEM.WEAVER_SPIDERLING] = bossArt([ // aranhinha roxa descendo pelo fio
  '.......P........', '.......O........', '.......O........', '.......O........', '...5...O....5...', '..5.5.6776.5.5..',
  '.....6PkPk6.....', '..55.567765.55..', '.5...567765...5.', '.....678876.....', '...5678887765...', '..5.67877766.5..',
  '.5..67777665..5.', '....56776655....', '...5..5665..5...', '................',
]);

// ---------- Casco de Ferro ----------
ITEM_ART[ITEM.CHITIN_DRILL] = bossArt([ // broca espiral de quitina com cabo de madeira
  '................', '.............Z..', '...........ZZY..', '..........ZYYX..', '.........ZYXYXW.', '........ZYXYXW..',
  '.......ZYXYXW...', '......ijYXW.....', '.....ihhgW......', '....yxg.........', '...yxw..........', '..nm............',
  '.yxw............', '.xw.............', '................', '................',
]);
ITEM_ART[ITEM.CARAPACE_MAUL] = bossArt([ // marreta com cabeça de carapaça e rebites de ouro
  '................', '.XZZZZZZZZZZZYX.', '.YZYYXYYYYXYYXW.', '.YYiYXYYYYXYiXW.', '.XYYYXYYYYXYYXW.', '.WXXXXXXXXXXXXW.',
  '..WWWWhihgWWWW..', '.......yx.......', '.......yx.......', '.......nm.......', '.......mn.......', '.......nm.......',
  '.......yx.......', '.......yw.......', '......hihg......', '................',
]);
ITEM_ART[ITEM.DIGGER_SHIELD] = bossArt([ // escudo de quitina com aro de ouro e emblema
  '................', '..hiiiiiiiiiig..', '..iZZZZZZZZYXg..', '..iZYYYjjYYXXg..', '..iZYYjiijYXXg..', '..iZYjiYYijXXg..',
  '..iYYYjiijYXWg..', '..iYYYYjjYXXWg..', '...iYYYYYXXWg...', '...iYYYYXXWWg...', '....iYYXXXWg....', '....iYXXXWgg....',
  '.....iXXWgg.....', '......iWg.......', '.......g........', '................',
]);
ITEM_ART[ITEM.SAND_BOOTS] = bossArt([ // par de botas de couro com pelo cor de areia
  '................', '..9z9z..........', '..nmml..........', '..nmml.9z9z9....', '..nmml.nmmml....', '..nmml.nmmml....',
  '..nmmm.nmmml....', '..nmmml.nmmml...', '..wwwww.nmmmml..', '.......nmmmmmml.', '.......nmmmmmml.', '.......wwwwwwww.',
  '................', '................', '................', '................',
]);
ITEM_ART[ITEM.SNIFFER_MANDIBLE] = bossArt([ // par de mandíbulas num amuleto, faiscando quando há minério
  '................', '..ZY........YZ..', '..YYX......XYY..', '...YYX....XYY...', '...XYYX..XYYX...', '....XYYhiYYX....',
  '.....XhGHhX.....', '.....hGH*Gg.....', '.....hFGGFg.....', '......gFFg......', '.......gg.......', '................',
  '..e.........e...', '.e*e.......e*e..', '..e.........e...', '................',
]);

// ---------- Comidas da caverna (js/environment.js) ----------
ITEM_ART[ITEM.MUSHROOM_STEW] = bossArt([ // tigela de madeira com cogumelo-lanterna e vapor
  '................', '......N...N.....', '.....O...O......', '......O...O.....', '.......N...N....', '...yyyyyyyyyy...',
  '..yqKLKqrqJKqx..', '.yxqJKJrKqqJqxw.', '.yxxxxxxxxxxxxw.', '..yxxwxxxxwxxw..', '...yxxxxxxxxw...', '....wxxxxxxw....',
  '.....wwwwww.....', '....wwwwwwww....', '................', '................',
]);
ITEM_ART[ITEM.INSECT_SKEWER] = bossArt([ // graveto atravessando três besouros tostados
  '................', '..............y.', '..........qrqyx.', '.........qeerq..', '.........qrkrp..', '.........qrrqp..',
  '......qrqyqpq...', '.....qeerq......', '.....qrkrp......', '.....qrrqp......', '..qrqyqpq.......', '.qeerq..........',
  '.qrkrp..........', '.qrrqp..........', '.wqpq...........', '................',
]);
