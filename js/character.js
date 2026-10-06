'use strict';

// Aparência do personagem: escolhida no criador, salva no navegador e aplicada na paleta do sprite.
// As listas só crescem no fim: os índices antigos continuam valendo para saves e para os passageiros
// da abertura (js/plane-cabin.js).
const LOOK_KEY = 'voo237.personagem';

// Cada cor lista os tons do escuro para o claro, na ordem das letras da PLAYER_PALETTE
const SKIN_TONES = [ // K s S L
  { name: 'Clara', c: [[170, 112, 92], [222, 160, 128], [244, 202, 166], [255, 228, 200]] },
  { name: 'Pêssego', c: [[150, 96, 76], [204, 142, 108], [236, 184, 144], [252, 214, 180]] },
  { name: 'Morena', c: [[112, 70, 48], [168, 112, 78], [198, 142, 100], [222, 172, 128]] },
  { name: 'Parda', c: [[88, 52, 36], [134, 86, 58], [162, 110, 74], [190, 138, 98]] },
  { name: 'Negra', c: [[52, 32, 26], [88, 56, 42], [112, 74, 54], [140, 98, 72]] },
  { name: 'Porcelana', c: [[178, 128, 118], [228, 180, 164], [248, 218, 200], [255, 238, 226]] },
  { name: 'Oliva', c: [[118, 88, 52], [170, 130, 84], [204, 166, 114], [226, 194, 146]] },
  { name: 'Dourada', c: [[132, 82, 42], [188, 128, 72], [220, 162, 100], [240, 192, 134]] },
  { name: 'Canela', c: [[98, 58, 34], [150, 94, 58], [180, 122, 80], [206, 152, 108]] },
  { name: 'Ébano', c: [[34, 22, 20], [62, 40, 32], [84, 56, 42], [110, 78, 60]] },
];
const HAIR_COLORS = [ // H h r R
  { name: 'Ruivo', c: [[92, 28, 32], [150, 44, 40], [196, 72, 52], [232, 118, 78]] },
  { name: 'Castanho', c: [[48, 30, 22], [84, 54, 36], [120, 80, 50], [156, 110, 70]] },
  { name: 'Preto', c: [[18, 16, 22], [34, 32, 42], [56, 54, 68], [84, 82, 100]] },
  { name: 'Loiro', c: [[140, 100, 40], [196, 150, 70], [230, 196, 110], [250, 228, 160]] },
  { name: 'Grisalho', c: [[92, 92, 100], [140, 140, 150], [186, 186, 194], [224, 224, 230]] },
  { name: 'Azul', c: [[26, 40, 90], [44, 70, 140], [70, 110, 196], [120, 160, 230]] },
  { name: 'Mel', c: [[96, 58, 26], [150, 96, 44], [196, 138, 68], [226, 178, 104]] },
  { name: 'Acaju', c: [[62, 20, 26], [102, 34, 38], [140, 52, 50], [176, 82, 70]] },
  { name: 'Platinado', c: [[150, 140, 120], [204, 196, 176], [236, 230, 212], [252, 250, 240]] },
  { name: 'Branco', c: [[120, 124, 136], [178, 182, 194], [220, 222, 230], [248, 248, 252]] },
  { name: 'Rosa', c: [[120, 40, 78], [184, 72, 120], [232, 116, 160], [250, 170, 200]] },
  { name: 'Roxo', c: [[52, 26, 84], [86, 44, 136], [126, 72, 184], [170, 120, 222]] },
  { name: 'Verde', c: [[22, 70, 52], [36, 110, 78], [60, 156, 106], [110, 204, 148]] },
  { name: 'Laranja', c: [[124, 54, 14], [188, 90, 24], [234, 134, 40], [252, 180, 90]] },
];
const EYE_COLORS = [ // P
  { name: 'Escuros', c: [40, 40, 70] },
  { name: 'Castanhos', c: [92, 58, 34] },
  { name: 'Verdes', c: [46, 110, 70] },
  { name: 'Azuis', c: [46, 96, 170] },
  { name: 'Mel', c: [150, 104, 40] },
  { name: 'Cinzentos', c: [104, 116, 130] },
  { name: 'Âmbar', c: [196, 130, 30] },
  { name: 'Violeta', c: [110, 64, 160] },
];
const JACKET_COLORS = [ // k j J G
  { name: 'Azul', c: [[40, 50, 80], [64, 82, 122], [92, 116, 160], [130, 156, 196]] },
  { name: 'Verde', c: [[34, 56, 40], [56, 88, 60], [82, 120, 80], [118, 156, 106]] },
  { name: 'Vinho', c: [[64, 26, 34], [102, 40, 50], [140, 60, 70], [178, 94, 100]] },
  { name: 'Couro', c: [[56, 36, 24], [92, 60, 38], [128, 86, 54], [166, 120, 80]] },
  { name: 'Cinza', c: [[44, 46, 52], [72, 76, 84], [104, 108, 118], [144, 148, 158]] },
  { name: 'Laranja', c: [[98, 44, 18], [156, 76, 30], [206, 112, 44], [240, 154, 80]] },
  { name: 'Preta', c: [[20, 20, 26], [36, 36, 44], [54, 54, 64], [82, 82, 96]] },
  { name: 'Branca', c: [[120, 122, 130], [176, 178, 184], [214, 214, 218], [242, 242, 244]] },
  { name: 'Amarela', c: [[122, 88, 18], [184, 140, 34], [226, 186, 58], [248, 222, 110]] },
  { name: 'Vermelha', c: [[92, 20, 22], [150, 34, 34], [196, 56, 50], [232, 100, 86]] },
  { name: 'Oliva', c: [[54, 56, 28], [86, 90, 44], [118, 122, 64], [154, 158, 96]] },
  { name: 'Turquesa', c: [[18, 74, 78], [30, 116, 118], [52, 160, 156], [110, 206, 196]] },
  { name: 'Roxa', c: [[46, 28, 70], [74, 46, 110], [104, 70, 150], [144, 110, 190]] },
  { name: 'Rosa', c: [[120, 50, 76], [180, 84, 118], [222, 124, 158], [246, 172, 196]] },
];
const SHIRT_COLORS = [ // o O
  { name: 'Laranja', c: [[160, 96, 48], [214, 140, 70]] },
  { name: 'Branca', c: [[176, 176, 168], [232, 230, 220]] },
  { name: 'Amarela', c: [[172, 136, 40], [230, 196, 80]] },
  { name: 'Vermelha', c: [[130, 40, 40], [196, 70, 62]] },
  { name: 'Preta', c: [[28, 28, 34], [56, 56, 66]] },
  { name: 'Azul', c: [[48, 78, 138], [84, 126, 196]] },
  { name: 'Verde', c: [[54, 110, 64], [94, 160, 96]] },
  { name: 'Rosa', c: [[176, 86, 118], [232, 138, 170]] },
  { name: 'Lilás', c: [[110, 82, 150], [160, 130, 200]] },
  { name: 'Cinza', c: [[96, 100, 108], [146, 150, 158]] },
  { name: 'Creme', c: [[176, 150, 110], [228, 208, 164]] },
];
const PANTS_COLORS = [ // n N v
  { name: 'Grafite', c: [[44, 40, 58], [66, 60, 84], [92, 84, 112]] },
  { name: 'Jeans', c: [[34, 48, 80], [52, 72, 116], [80, 104, 150]] },
  { name: 'Cáqui', c: [[96, 82, 54], [132, 114, 78], [166, 148, 106]] },
  { name: 'Preta', c: [[24, 24, 28], [40, 40, 46], [62, 62, 70]] },
  { name: 'Verde', c: [[40, 52, 36], [60, 76, 52], [86, 104, 74]] },
  { name: 'Jeans claro', c: [[70, 96, 136], [104, 136, 176], [146, 176, 210]] },
  { name: 'Marrom', c: [[58, 38, 26], [88, 60, 40], [120, 86, 60]] },
  { name: 'Vinho', c: [[62, 24, 34], [94, 38, 50], [128, 58, 70]] },
  { name: 'Branca', c: [[150, 150, 146], [198, 198, 192], [232, 232, 226]] },
  { name: 'Areia', c: [[128, 110, 78], [172, 152, 112], [206, 190, 150]] },
];
const BOOT_COLORS = [ // x X z (+ q = sola)
  { name: 'Marrom', c: [[60, 36, 24], [94, 58, 38], [132, 86, 56]] },
  { name: 'Pretas', c: [[26, 24, 26], [44, 42, 46], [70, 68, 74]] },
  { name: 'Caramelo', c: [[112, 70, 30], [160, 104, 48], [204, 146, 80]] },
  { name: 'Cinza', c: [[64, 66, 70], [98, 100, 106], [140, 142, 148]] },
  { name: 'Tênis branco', c: [[150, 152, 158], [212, 214, 218], [246, 246, 248]], q: [196, 60, 52] },
  { name: 'Tênis vermelho', c: [[110, 26, 28], [178, 44, 42], [226, 82, 70]], q: [236, 234, 228] },
  { name: 'Tênis azul', c: [[30, 50, 110], [50, 84, 170], [90, 130, 214]], q: [236, 234, 228] },
  { name: 'Galocha', c: [[150, 110, 10], [214, 170, 30], [246, 214, 80]], q: [70, 54, 20] },
  { name: 'Verde-musgo', c: [[38, 50, 30], [62, 80, 46], [94, 114, 68]] },
];
const HAT_COLORS = [ // A B C D
  { name: 'Vermelho', c: [[70, 18, 22], [130, 34, 36], [184, 56, 50], [226, 100, 84]] },
  { name: 'Azul', c: [[20, 30, 64], [36, 56, 110], [58, 88, 160], [104, 136, 204]] },
  { name: 'Preto', c: [[14, 14, 18], [30, 30, 36], [50, 50, 60], [80, 80, 94]] },
  { name: 'Verde', c: [[24, 50, 30], [40, 84, 48], [64, 124, 70], [106, 166, 104]] },
  { name: 'Palha', c: [[118, 88, 40], [176, 138, 70], [218, 184, 106], [244, 220, 150]] },
  { name: 'Marrom', c: [[44, 28, 20], [78, 52, 34], [114, 78, 50], [150, 110, 74]] },
  { name: 'Branco', c: [[120, 122, 130], [180, 182, 188], [220, 220, 224], [248, 248, 250]] },
  { name: 'Amarelo', c: [[120, 86, 14], [186, 140, 30], [230, 190, 56], [250, 226, 110]] },
  { name: 'Rosa', c: [[112, 44, 72], [174, 78, 114], [220, 120, 156], [246, 170, 196]] },
  { name: 'Roxo', c: [[42, 24, 66], [70, 42, 106], [102, 66, 150], [142, 106, 192]] },
];

// ---------- Cabeças ----------
// 16 colunas, olhando para a direita. `ox`/`oy` = colunas/linhas extras à esquerda/acima da cabeça base
// (a do rabo de cavalo tem 3 colunas a mais atrás da nuca; o black power sobe 3 linhas).
// O olho é sempre 'WP' (piscar troca por 'Ks') e a boca, 'm'.
const BALD_FACE = [ // rosto e nuca sem cabelo, a partir da linha 6
  '..KsSSSSSSSSSs..',
  '..KsSSSSSSSSSs..',
  '..KssSSSSSHHSS..',
  '..KsKsSSSSWPSS..',
  '..KKsKSSSSWPSSL.',
  '..KKssSSSSSSSSs.',
  '...KssSSSSSmSs..',
  '...KKsSSSSSSs...',
  '....KKssSSss....',
  '......Ksss......',
  '.......ss.......',
];
const HAIR_STYLES = [
  { name: 'Curto', rows: HEAD },
  { name: 'Espetado', rows: ['...h..h..h......', '...hh.hh.hh.....', '..hhrhhrhhrhh...', ...HEAD.slice(3)] },
  { name: 'Longo', rows: [
    ...HEAD.slice(0, 4),
    'HHhrrrrrrrhhh...',
    'HHhhrrhhrrrhhh..',
    'HHhhhLSSSShhhh..',
    'HHhhSSLLSSShhh..',
    'HHhhSsSSSSHHSS..',
    'HHhKsSSSSSWPSS..',
    'HHhKSSSSSSWPSSL.',
    'HhhKsSSSSSSSSSs.',
    'HhHhssSSSSSmSs..',
    'HhhHhsSSSSSSs...',
    'HhhhHhssSSss....',
    '.HhhhhKsss......',
    '..HHH..ss.......',
  ] },
  { name: 'Rabo de cavalo', ox: 3, rows: [
    ...HEAD.slice(0, 4).map((r) => '...' + r),
    '..hyHhrrrrrrrhhh...',
    '.hryHhhrrhhrrrhhh..',
    'hrrhHhhhLSSSShhhh..',
    'hRrhHhhSSLLSSShhh..',
    'hrh.HhhSsSSSSHHSS..',
    'hrh.HhKsSSSSSWPSS..',
    '.hh.HhKSSSSSSWPSSL.',
    '.h...hKsSSSSSSSSSs.',
    ...HEAD.slice(12).map((r) => '...' + r),
  ] },
  { name: 'Careca', rows: [
    '................',
    '................',
    '.....KKssK......',
    '...KKsSLLSsK....',
    '..KsSSSLLSSSK...',
    '..KsSSSSSSSSSK..',
    ...BALD_FACE,
  ] },
  { name: 'Raspado', rows: [
    '................',
    '................',
    '.....HHhhH......',
    '...HHhhhhhhH....',
    '..HhhhhhrhhhH...',
    '..HhhhhhhhhhSK..',
    '..HhhSSSSSSSSs..',
    '..HhsSSSSSSSSs..',
    ...BALD_FACE.slice(2),
  ] },
  { name: 'Moicano', oy: 1, rows: [
    '.....h..h.......',
    '....hrhhrh.h....',
    '...hrRrrRrhrh...',
    '...hrrRrrrRrrh..',
    '..KHhrrrrrrrhsK.',
    '..KsShhhhhhhSK..',
    '..KsSSSSSSSSSK..',
    ...BALD_FACE,
  ] },
  { name: 'Black power', ox: 2, oy: 3, rows: [
    '.......hhhhhh.......',
    '.....hhrrRrrrhh.....',
    '....hrrRRrrrRrrhh...',
    '...hrrRrrrhrrrRrrh..',
    '..hrrrrrhrrrrrrrrrh.',
    '.hrrhrrrrrrRrrrhrrh.',
    '.hrrrrrrRrrrrrrrrrh.',
    'hrrRrrhrrrrrhrrrrrh.',
    'hrrrrrrrrrrrrrrrhhh.',
    'hrhrrrrhhLSSSSrrhh..',
    'hrrrrhhhSSLLSSShrh..',
    'hrrrhrhhSsSSSSHHSS..',
    '.hrrrrhKsSSSSSWPSS..',
    '.hrhrrhKSSSSSSWPSSL.',
    '..hhrrhKsSSSSSSSSSs.',
    '...hhhHhssSSSSSmSs..',
    '.....HhHhsSSSSSSs...',
    '......HhHhssSSss....',
    '........HKKsss......',
    '.........Ksss.......',
    '..........ss........',
  ] },
  { name: 'Coque', oy: 3, rows: [
    '..hhh...........',
    '.hrRrh..........',
    '.hrrrh..........',
    '..hyhhhh........',
    '..HhhrrrRh......',
    '..HhrrRRrrhhh...',
    '.HhrrrrrrrrrhK..',
    '.HhhrrrrrrrhhSK.',
    '.HhhhrrhhhhhSSs.',
    ...HEAD.slice(6),
  ] },
  { name: 'Cacheado', rows: [
    '....hh.hh.......',
    '..hhrrhrrhhh....',
    '.hrrRrrrRrrrh...',
    'hrRrrrhrrrRrrh..',
    'hrrrhrrrrrrhrrh.',
    'hrhrrrRrrrhrrh..',
    'hrrrhhLSSSShrrh.',
    'hrRrhSSLLSSShh..',
    'hrrhSsSSSSHHSS..',
    'hrrhKsSSSSWPSS..',
    'hRrhKSSSSSWPSSL.',
    'hrrhKsSSSSSSSSs.',
    'hrhHhssSSSSmSs..',
    '.hrrHhsSSSSSs...',
    '.hhrhHhssSSss...',
    '..hh...Ksss.....',
    '.......ss.......',
  ] },
  { name: 'Tigela', rows: [
    '.....hhhhh......',
    '...hhrrrrrhh....',
    '..hrrRRRrrrrh...',
    '.hrrRRRrrrrrrh..',
    '.hrrrrrrrrrrrrh.',
    '.Hhrrrrrrrrrrrh.',
    '.Hhhrrrrrrrrrrh.',
    '.HhhhhhhhhhhhhH.',
    '.HhhSsSSSSHHSS..',
    ...HEAD.slice(9),
  ] },
  { name: 'Chanel', rows: [
    '......hh........',
    '....hhrrrh......',
    '..hhrrRRrrhhh...',
    '.HhrrRRRrrrrhh..',
    '.HhrrrrrrrrrrRh.',
    '.HhrrrrrrrrrrrRh',
    '.HhhrrhLSSSSrrhh',
    '.HhhhhSSLLSSShh.',
    '.HhhhSsSSSSHHSS.',
    '.HhhhKsSSSSWPSS.',
    '.HhhhKSSSSSWPSSL',
    '.HhhhKsSSSSSSSSs',
    '.HhhhhssSSSSmSs.',
    '.HhhhhhsSSSSSs..',
    '..HHhhHhssSSss..',
    '.......Ksss.....',
    '........ss......',
  ].map((r) => r.slice(0, 16)) },
  { name: 'Trança', ox: 3, rows: [
    ...HEAD.slice(0, 4).map((r) => '...' + r),
    '...Hhrrrrrrrhhh...',
    '..hHhhrrhhrrrhhh..',
    '.hryHhhLSSSShhhh..',
    '.hrrHhSSLLSSShhh..',
    '.rhhHhSsSSSSHHSS..',
    '.hrr.HKsSSSSSWPSS.',
    '.rhh.HKSSSSSSWPSSL',
    '.hrr.hKsSSSSSSSSSs',
    '.rhh.HhssSSSSSmSs.',
    '.hrr..HhsSSSSSSs..',
    '.rhh...HhssSSss...',
    '.hrr.....Ksss.....',
    '..y.......ss......',
    '.hrh..............',
    '..h...............',
  ] },
  { name: 'Topete', oy: 2, rows: [
    '........hhh.....',
    '......hhrRRh....',
    '.....hrrRRRrh...',
    '....hrrRrrrrrh..',
    '...Hhrrrrrrrrrh.',
    '..HHhrrrrrrrhhh.',
    '.HhhhhhhrrhhSK..',
    '.HhhhhhhhhhSSK..',
    '.HhhSSSSSSSSSs..',
    '.HhsSSSSSSSSSs..',
    '.HhhSsSSSSHHSS..',
    ...HEAD.slice(9),
  ] },
];

// Barba e bigode: sobrepostos à cabeça (mesmas coordenadas da cabeça base), na cor do cabelo
const BEARDS = [
  { name: 'Nenhuma' },
  { name: 'Bigode', at: [9, 11], rows: ['.hHHh'] },
  { name: 'Cavanhaque', at: [9, 11], rows: ['.hHHh', '..h.h', '.hHh.', '..h..'] },
  { name: 'Barba curta', at: [3, 9], rows: ['h.........', 'h.........', 'hh....hHHh', '.hh...h.h.', '.hhhhhhhh.', '..hhhhhh..'] },
  { name: 'Barba cheia', at: [2, 8], rows: ['.h..........', 'hh..........', 'hhh.........', 'hhhh...hHHHh', '.hhhhhhhHhh.', '.hHhhhhhhhh.', '..hhHhhhhh..', '....hhhhh...', '.....hhh....'] },
  { name: 'Costeletas', at: [3, 8], rows: ['h..', 'hh.', 'hh.', 'hh.', '.h.'] },
];
// Óculos: armação 'f', lente escura 'E' e reflexo 'e'
const GLASSES = [
  { name: 'Nenhum' },
  { name: 'Óculos', at: [5, 8], rows: ['....ffff', 'fffff..f', '....f..f', '....ffff'] },
  { name: 'Escuros', at: [5, 9], rows: ['ffffEEEEf', '....EeEE.'] },
  { name: 'Redondos', at: [5, 8], rows: ['.....ff.', 'fffff..f', '....f..f', '.....ff.'] },
  { name: 'Tapa-olho', at: [3, 6], rows: ['f.......', '.f......', '..f.....', '...fffffff', '.......EEf', '.......EEf', '........E'] },
];
// Chapéus: 'A' contorno escuro … 'D' brilho, 'u' = fita. `clip` apaga o cabelo acima dessa linha.
const HATS = [
  { name: 'Nenhum' },
  { name: 'Boné', clip: 4, at: [1, -1], rows: [
    '...ABBBBA.......',
    '..ABCCDDCA......',
    '.ABCCCCDDCA.....',
    '.ABCCCCCCCBA....',
    'ABBCCCCCCCCBAAAA',
    'AAAAAAAAAAAAAAA.',
  ] },
  { name: 'Gorro', clip: 5, at: [0, -3], rows: [
    '.....AA.........',
    '....ADDA........',
    '....ACCA........',
    '...ABCCCBA......',
    '..ABCCCDCCBA....',
    '.ABCCCCCDCCBA...',
    '.ABCCCCCCCCCBA..',
    'ABCCCCCCCCCCCBA.',
    'ABABABABABABABA.',
    'ABBBBBBBBBBBBBA.',
  ] },
  { name: 'Bandana', clip: 3, at: [-1, 3], rows: [
    '...ABBBBBBBBBA...',
    '..ABCCDCCDCCCBA..',
    'AAABBBBBBBBBBBA..',
    'ABA..............',
    '.AA..............',
  ] },
  { name: 'Chapéu', clip: 4, at: [-2, -3], rows: [
    '......ABBBBA........',
    '.....ABCCDDCA.......',
    '.....ABCCCCDA.......',
    '.....ABCCCCCBA......',
    '.....ABCCCCCBA......',
    '.....AuuuuuuuA......',
    '..AABBBBBBBBBBBBAA..',
    '...AAAAAAAAAAAAAA...',
  ] },
  { name: 'Boina', clip: 4, at: [0, -1], rows: [
    '......AA........',
    '...AABBBBAA.....',
    '.AABCCCCDDCBA...',
    'ABCCCCCCCCDDCBA.',
    '.ABBBBBBBBBBBBA.',
  ] },
  { name: 'Coroa de flores', at: [1, 0], rows: [
    '..DC...CD...DC.',
    '.iCBllBCBllCBi.',
    '..ll.i..il..l..',
  ] },
];

// ---------- Roupas ----------
// Estilo da parte de cima: troca pixels do tronco (camisa por jaqueta etc.)
const TOP_STYLES = [
  { name: 'Jaqueta aberta' },
  { name: 'Jaqueta fechada', remap: { O: 'J', o: 'j' } },
  { name: 'Camisa', remap: { O: 'J', o: 'j' }, shirt: true }, // a jaqueta some: mangas e corpo na cor da camisa
  { name: 'Sobretudo', remap: { O: 'J', o: 'j', t: 'k', y: 'G' }, coat: true },
  { name: 'Moletom', remap: { O: 'J', o: 'j' }, hood: true },
];
const PATTERNS = [
  { name: 'Lisa' }, { name: 'Listrada' }, { name: 'Xadrez' }, { name: 'Camuflada' }, { name: 'Bolinhas' },
];
const LEG_STYLES = [{ name: 'Calça' }, { name: 'Bermuda' }];

const LOOK_LISTS = {
  skin: SKIN_TONES, hair: HAIR_COLORS, hairStyle: HAIR_STYLES, eyes: EYE_COLORS, jacket: JACKET_COLORS,
  shirt: SHIRT_COLORS, pants: PANTS_COLORS, boots: BOOT_COLORS,
  beard: BEARDS, glasses: GLASSES, hat: HATS, hatColor: HAT_COLORS, top: TOP_STYLES, pattern: PATTERNS, legs: LEG_STYLES,
};
const DEFAULT_LOOK = {
  name: 'Sobrevivente', skin: 1, hair: 0, hairStyle: 0, eyes: 0, jacket: 0, shirt: 0, pants: 0, boots: 0,
  beard: 0, glasses: 0, hat: 0, hatColor: 0, top: 0, pattern: 0, legs: 0,
};
// Acessórios aparecem de vez em quando no aleatório (senão todo mundo sai de chapéu e óculos)
const RANDOM_RARE = { beard: 0.3, glasses: 0.25, hat: 0.3, pattern: 0.35, legs: 0.25 };

const cleanName = (s) => String(s || '').replace(/[<>]/g, '').trim().slice(0, 14) || 'Sobrevivente';

function sanitizeLook(look) {
  const out = { ...DEFAULT_LOOK, ...look, name: cleanName(look?.name) };
  for (const [key, list] of Object.entries(LOOK_LISTS)) out[key] = clamp(Math.floor(+out[key]) || 0, 0, list.length - 1);
  return out;
}

function loadLook() {
  try { return sanitizeLook(JSON.parse(localStorage.getItem(LOOK_KEY) || '{}')); }
  catch (_) { return { ...DEFAULT_LOOK }; }
}

function saveLook(look) {
  try { localStorage.setItem(LOOK_KEY, JSON.stringify(look)); } catch (_) {}
}

function randomLookValue(key) {
  const n = LOOK_LISTS[key].length;
  if (key in RANDOM_RARE && Math.random() > RANDOM_RARE[key]) return 0;
  return key in RANDOM_RARE ? 1 + Math.floor(Math.random() * (n - 1)) : Math.floor(Math.random() * n);
}

// keys: só sorteia essas (o resto fica como em `base`)
function randomLook(base = PLAYER_LOOK, keys = Object.keys(LOOK_LISTS)) {
  const look = { ...DEFAULT_LOOK, ...base, name: base.name };
  for (const key of keys) look[key] = randomLookValue(key);
  return look;
}

let PLAYER_LOOK = loadLook();
let PLAYER_OUTFIT = null; // roupa vestida por cima da jaqueta, veja js/savanna.js
// Cada roupa troca as 4 cores da jaqueta (contorno, sombra, base, brilho)
const OUTFIT_JACKETS = {
  tiger: [[120, 52, 18], [186, 88, 28], [226, 128, 44], [246, 172, 86]],
  leather: [[52, 32, 18], [92, 58, 32], [138, 92, 50], [178, 126, 72]],
  iron: [[36, 40, 48], [72, 80, 92], [124, 134, 148], [186, 196, 208]],
  bear: [[38, 26, 22], [72, 50, 38], [116, 84, 60], [162, 124, 88]],
};
let playerHeadCache = null;

const currentLook = () => PLAYER_LOOK_PREVIEW || PLAYER_LOOK;
const toneShift = (c, k, add = 0) => c.map((v) => clamp(Math.round(v * k + add), 0, 255));

function applyLookToPalette(look) {
  const P = PLAYER_PALETTE;
  [P.K, P.s, P.S, P.L] = SKIN_TONES[look.skin].c;
  [P.H, P.h, P.r, P.R] = HAIR_COLORS[look.hair].c;
  P.P = EYE_COLORS[look.eyes].c;
  [P.o, P.O] = SHIRT_COLORS[look.shirt].c;
  const outfit = !PLAYER_LOOK_PREVIEW && OUTFIT_JACKETS[PLAYER_OUTFIT];
  // Só de camisa: as 4 cores da "jaqueta" saem da camisa (mangas, corpo e braços das ferramentas)
  const shirtJacket = TOP_STYLES[look.top].shirt && [toneShift(P.o, 0.62), P.o, P.O, toneShift(P.O, 1.08, 18)];
  [P.k, P.j, P.J, P.G] = outfit || shirtJacket || JACKET_COLORS[look.jacket].c;
  [P.n, P.N, P.v] = PANTS_COLORS[look.pants].c;
  const boots = BOOT_COLORS[look.boots];
  [P.x, P.X, P.z] = boots.c;
  P.q = boots.q || [34, 26, 26];
  [P.A, P.B, P.C, P.D] = HAT_COLORS[look.hatColor].c;
  P.m = [P.S[0] * 0.75, P.S[1] * 0.52, P.S[2] * 0.61]; // boca acompanha o tom da pele
  playerHeadCache = null;
}

// Monta a cabeça: cabelo + barba + óculos + chapéu numa grade só, com a cabeça base em (0, 0).
// Devolve as linhas e quanto a grade passa da cabeça base à esquerda (ox) e acima (oy).
function composeHead(look) {
  const style = HAIR_STYLES[look.hairStyle], hat = HATS[look.hat];
  const cells = new Map(), key = (x, y) => x + ',' + y;
  const put = (rows, dx, dy) => rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (row[x] !== '.') cells.set(key(x + dx, y + dy), row[x]);
  });
  put(style.rows, -(style.ox || 0), -(style.oy || 0));
  // Debaixo do chapéu o cabelo não passa da aba
  if (hat.rows && hat.clip) for (const [k, ch] of cells) if ('HhrRy'.includes(ch) && +k.split(',')[1] < hat.clip) cells.delete(k);
  for (const layer of [BEARDS[look.beard], GLASSES[look.glasses], hat]) if (layer.rows) put(layer.rows, ...layer.at);
  let x0 = 0, y0 = 0, x1 = 15, y1 = 16;
  for (const k of cells.keys()) {
    const [x, y] = k.split(',').map(Number);
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  const rows = [];
  for (let y = y0; y <= y1; y++) {
    let row = '';
    for (let x = x0; x <= x1; x++) row += cells.get(key(x, y)) || '.';
    rows.push(row);
  }
  return { rows, ox: -x0, oy: -y0, hat: !!hat.rows };
}

// Cabeça (olhos abertos e piscando) com o cabelo e os acessórios atuais
function playerHeadParts() {
  if (!playerHeadCache) {
    const { rows, ox, oy, hat } = composeHead(currentLook());
    const my = rows.findIndex((r) => r.includes('m')); // boca (para a língua de fora engatinhando)
    // Mecha que balança: o primeiro fio no alto da cabeça (sem chapéu)
    let tuft = null;
    if (!hat) {
      const ty = rows.findIndex((r) => /[rR]/.test(r));
      if (ty >= 0) tuft = [rows[ty].search(/[hrR]/), ty + 1];
    }
    playerHeadCache = { open: pixelPart(rows), blink: pixelPart(rows.map((r) => r.replace('WP', 'Ks'))), ox, oy, tuft,
      mouth: my >= 0 ? [rows[my].indexOf('m'), my] : null };
  }
  return playerHeadCache;
}

// Tronco com o estilo da parte de cima (jaqueta aberta, fechada, camisa…)
function playerTorsoPart(rows) {
  return pixelPart(rows, TOP_STYLES[currentLook().top].remap);
}

// Roupa de tigre: listras diagonais escuras sobre os pixels da jaqueta e das mangas
function paintOutfitStripes(atlas) {
  const c = atlas.getContext('2d'), img = c.getImageData(0, 0, atlas.width, atlas.height), d = img.data, P = PLAYER_PALETTE;
  const keys = new Set([P.k, P.j, P.J, P.G].map((col) => (col[0] << 16) | (col[1] << 8) | col[2]));
  for (let y = 0; y < atlas.height; y++)
    for (let x = 0; x < atlas.width; x++) {
      const i = (y * atlas.width + x) * 4;
      if (!d[i + 3] || !keys.has((d[i] << 16) | (d[i + 1] << 8) | d[i + 2])) continue;
      if (((x % PLAYER_SPR_W) + Math.floor(y * 0.7)) % 5 === 0) { d[i] = 40; d[i + 1] = 24; d[i + 2] = 16; }
    }
  c.putImageData(img, 0, 0);
}

// Estampa da jaqueta/camisa: desloca o tom de cada pixel de jaqueta um degrau para baixo (ou para cima)
function paintJacketPattern(atlas, kind) {
  if (!kind) return;
  const c = atlas.getContext('2d'), img = c.getImageData(0, 0, atlas.width, atlas.height), d = img.data, P = PLAYER_PALETTE;
  const tones = [P.k, P.j, P.J, P.G], index = new Map(tones.map((col, i) => [(col[0] << 16) | (col[1] << 8) | col[2], i]));
  for (let y = 0; y < atlas.height; y++)
    for (let x = 0; x < atlas.width; x++) {
      const i = (y * atlas.width + x) * 4;
      if (!d[i + 3]) continue;
      const t = index.get((d[i] << 16) | (d[i + 1] << 8) | d[i + 2]);
      if (t === undefined || t === 0) continue; // o contorno da jaqueta fica
      const lx = x % PLAYER_SPR_W;
      let step = 0;
      if (kind === 1) step = y % 3 === 0 ? -1 : 0;
      else if (kind === 2) step = (lx % 4 === 0 ? -1 : 0) + (y % 4 === 0 ? -1 : 0);
      else if (kind === 3) { const n = hash2(lx >> 1, y >> 1); step = n < 0.28 ? -1 : n > 0.8 ? 1 : 0; }
      else if (kind === 4) step = (lx + (y >> 2) * 2) % 4 === 1 && y % 4 === 1 ? 2 : 0;
      if (!step) continue;
      const col = tones[clamp(t + step, 1, 3)];
      d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2];
    }
  c.putImageData(img, 0, 0);
}
function hash2(x, y) {
  let h = Math.imul(x * 374761393 + y * 668265263, 1274126177) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1103515245) >>> 0;
  return ((h ^ (h >>> 16)) & 0xffff) / 0xffff;
}

// Prévia do criador: muda a paleta sem trocar o personagem salvo
let PLAYER_LOOK_PREVIEW = null;
function previewLook(look) {
  PLAYER_LOOK_PREVIEW = sanitizeLook(look);
  applyLookToPalette(PLAYER_LOOK_PREVIEW);
}

function applyLook(look, rend) {
  PLAYER_LOOK = sanitizeLook(look);
  PLAYER_LOOK_PREVIEW = null;
  applyLookToPalette(PLAYER_LOOK);
  if (rend) { rend.playerAtlas = buildPlayerSprite(); rend.armColors = null; rend.wakeParts = null; }
}

applyLookToPalette(PLAYER_LOOK);
