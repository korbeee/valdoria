'use strict';

// Bichos da savana no mesmo estilo dos outros (js/bear.js): elefante, tigre (chefe) e hiena.
// Elefante — quadros 0–7 andando, 8–11 parado (orelha abana, tromba balança/levanta), 12–13 no ar.
// Tigre    — quadros e desenho em js/tiger-art.js; tigerFrame (no fim) escolhe o quadro.
// Paleta do elefante: definida por ELE_SKIN_STYLES, mais abaixo
WILD_PALETTES.tiger = [[92, 40, 16], [168, 76, 24], [218, 118, 38], [242, 158, 68], [252, 200, 124]];
WILD_PALETTES.hyena = [[58, 46, 34], [104, 86, 58], [150, 128, 88], [192, 170, 122], [224, 206, 160]];
WILD_SIZES.elephant = [92, 66];
WILD_SIZES.tiger = [TIGER_ART.W, TIGER_ART.H]; // js/tiger-art.js, 1 px da arte = 1 px do mundo, como a fauna

function savannaFill(s, pts, fn) {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++)
    for (let x = Math.floor(Math.min(...xs)); x <= Math.ceil(Math.max(...xs)); x++) {
      let inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const a = pts[i], b = pts[j];
        if ((a[1] > y + 0.5) !== (b[1] > y + 0.5) && x + 0.5 < ((b[0] - a[0]) * (y + 0.5 - a[1])) / (b[1] - a[1]) + a[0]) inside = !inside;
      }
      if (inside) { const c = fn(x, y); if (c) s.set(x, y, c); }
    }
}

// ---------- Elefante ----------
// Estilo da referência (sprite de RPG): cinza-azulado escuro, corpo em barril com lombo alto,
// patas curtas e grossas com unhas claras, cabeção de testa abaulada, orelha grande
// pendurada, tromba grossa e presas curtas. A pele tem manchas grandes e suaves e rugas
// que seguem a forma de cada parte (anéis nas patas e na tromba, pregas no corpo).
const ELE_GROUND = 61;          // linha dos pés dentro do sprite
const ELE_BACK = 16;            // altura do lombo (usada pela sela e pelo lugar do jogador)
const ELE_IVORY = [[168, 152, 112], [226, 214, 176], [250, 244, 222]];
const ELE_NAIL = [[170, 160, 128], [224, 214, 180]];

// Estilos de pele (troque ELE_SKIN_STYLE ou chame setElephantSkin no console):
//  'natural' — cinza amarronzado, manchas largas e rugas em tracinhos curtos e quebrados
//  'liso'    — cinza neutro, sombreado limpo em faixas, sem textura nenhuma
//  'pintado' — cinza-azulado com sombras em blocos, inspirado no sprite de RPG da referência
const ELE_SKIN_STYLES = {
  natural: [[48, 44, 42], [82, 76, 72], [114, 106, 100], [144, 136, 128], [176, 168, 158]],
  liso: [[50, 50, 58], [86, 86, 96], [120, 120, 130], [152, 152, 160], [186, 186, 192]],
  pintado: [[43, 57, 63], [64, 79, 86], [91, 108, 118], [125, 140, 150], [158, 170, 177]],
};
let ELE_SKIN_STYLE = 'pintado';
WILD_PALETTES.elephant = ELE_SKIN_STYLES[ELE_SKIN_STYLE];

// kind: 'pata'/'tromba' têm rugas mais juntas que o resto do corpo
function eleSkin(pal, v, x, y, kind = 'corpo') {
  let t = v;
  if (ELE_SKIN_STYLE === 'pintado') {
    // Textura em pequenos grupos, sem pontilhado sobre toda a pele.
    const h = hash2(x >> 1, y >> 1, 911);
    if (h < 0.16) t -= 0.10; else if (h > 0.93) t += 0.07;
  } else if (ELE_SKIN_STYLE === 'natural') {
    t += (fbm2(x * 0.11, y * 0.11, 77, 2) - 0.5) * 0.16; // manchas largas
    // Um tracinho de ruga por célula, em posição sorteada: nunca vira listra contínua
    const tight = kind === 'pata' || kind === 'tromba', cw = tight ? 5 : 6, ch = tight ? 3 : 4;
    const cx = Math.floor(x / cw), cy = Math.floor(y / ch), h = hash2(cx, cy, 313);
    if (h > 0.45 && wrap(y, ch) === 1) {
      const start = Math.floor(hash2(cx, cy, 71) * (cw - 2)), len = h > 0.8 ? 3 : 2, lx = x - cx * cw;
      if (lx >= start && lx < start + len) t -= 0.11;
    }
    t += ditherAt(x, y, 0.03);
  }
  return tone(pal, t);
}

// Troca o estilo da pele na hora (refaz os sprites do elefante e da manta)
function setElephantSkin(style) {
  if (!ELE_SKIN_STYLES[style]) return;
  ELE_SKIN_STYLE = style;
  WILD_PALETTES.elephant = ELE_SKIN_STYLES[style];
  for (const key of [...wildlifeSprites.keys()]) if (key.startsWith('elephant:')) wildlifeSprites.delete(key);
  elephantSaddleCache.clear();
}

const eleBob = (f) => (f < 8 ? Math.round(Math.abs(Math.sin((f / 8) * Math.PI * 4))) : 0);

function paintElephant(s, pal, f) {
  const { walk, air, idle, ph } = frameInfo(f), bob = eleBob(f);
  // Áreas de luz e silhueta angular desenhadas como no sprite de referência.
  const poly = (pts, value, kind = 'corpo') => savannaFill(s,
    pts.map(([x, y]) => [x, y + bob]),
    (x, y) => eleSkin(pal, value, x, y - bob, kind));
  const line = (pts, color, width = 1) => {
    for (let i = 1; i < pts.length; i++)
      seg(s, pts[i-1][0], pts[i-1][1]+bob, pts[i][0], pts[i][1]+bob, width, color);
  };
  const leg = (x, phase, far) => {
    const q = ph + phase, swing = walk ? Math.round(Math.sin(q)*3) : air ? (x > 40 ? 3 : -3) : 0;
    const lift = walk ? Math.round(Math.max(0, Math.cos(q))*3) : air ? 4 : 0;
    const foot = ELE_GROUND-lift-bob, dx = x+swing;
    poly([[x-7,36],[x+7,37],[x+6,46],[dx+4,foot-5],[dx+7,foot-2],
      [dx+7,foot+1],[dx-7,foot+1],[dx-8,foot-2],[dx-5,foot-9],[x-7,45]], far ? 0.25 : 0.46, 'pata');
    if (!far) {
      poly([[x-5,39],[x,41],[x+1,47],[dx-2,foot-5],[dx+1,foot-2],
        [dx-5,foot-2],[dx-5,foot-7],[x-5,47]], 0.64, 'pata');
      line([[x+3,45],[x+1,48],[dx+2,foot-5]], pal[1]);
    }
    for (const n of [-4,0,4]) {
      s.set(dx+n,foot+bob-1,ELE_NAIL[0]);
      s.set(dx+n,foot+bob,far ? ELE_NAIL[0] : ELE_NAIL[1]);
      s.set(dx+n+1,foot+bob,ELE_NAIL[0]);
    }
  };
  leg(20, Math.PI, true); leg(51, 0, true);
  const tail = walk ? Math.round(Math.sin(ph)) : idle === 3 ? -1 : 0;
  line([[13,27],[9,33],[8+tail,45]],pal[1],2);
  line([[8+tail,43],[7+tail,48]],pal[0],3);
  poly([[11,31],[13,23],[19,18],[28,16],[42,16],[51,18],[59,23],
    [62,37],[57,46],[49,49],[34,48],[24,45],[16,43],[12,38]],0.47);
  poly([[14,29],[16,23],[21,19],[32,18],[43,18],[49,20],[53,25],
    [48,28],[43,27],[42,32],[36,34],[29,32],[26,29],[21,30]],0.66);
  poly([[15,33],[21,35],[25,39],[32,40],[39,38],[46,37],[54,32],
    [58,37],[55,44],[47,48],[33,46],[25,43],[17,42]],0.28);
  poly([[16,25],[20,21],[29,19],[38,19],[40,21],[27,21],[21,24]],0.79);
  line([[16,30],[15,35],[18,40],[21,42]],pal[1]);
  line([[26,32],[28,35],[32,36]],pal[2]);
  leg(24,0,false); leg(55,Math.PI,false);

  // Testa alta e orelha distante.
  poly([[65,17],[67,12],[72,11],[76,14],[77,26],[72,30]],0.27);
  poly([[55,18],[60,13],[66,14],[69,17],[74,18],[78,24],[78,33],
    [73,41],[66,43],[58,37],[53,27]],0.61,'cabeca');
  poly([[59,17],[62,15],[65,16],[68,20],[73,22],[75,28],
    [71,29],[66,24],[61,23]],0.81,'cabeca');
  poly([[72,27],[77,26],[78,33],[74,40],[68,43],[64,37]],0.43,'cabeca');
  line([[66,16],[69,20],[73,21]],pal[2],2);

  // Tromba afunilada com a ponta voltada para dentro.
  const sway = walk ? Math.round(Math.sin(ph)) : idle === 2 ? 1 : 0;
  if (idle === 3) {
    poly([[73,29],[79,28],[81,22],[81,14],[78,10],[80,8],[84,11],
      [86,17],[85,25],[81,35],[76,40],[72,37]],0.45,'tromba');
    line([[77,31],[81,26],[83,19],[82,13]],pal[3],2);
    line([[81,10],[82,11]],pal[0],2);
  } else {
    poly([[73,27],[79,28],[81,36],[81+sway,44],[83+sway,52],
      [82+sway,55],[77+sway,56],[73+sway,53],[73+sway,49],
      [76+sway,51],[77+sway,51],[76+sway,44],[73,38]],0.43,'tromba');
    line([[77,31],[78,37],[78+sway,43],[80+sway,51],[79+sway,53]],pal[3],2);
    line([[74+sway,51],[76+sway,53]],pal[0],2);
    for (const y of [38,43,47]) line([[77+sway,y],[79+sway,y+1]],pal[1]);
  }
  savannaFill(s,[[70,38+bob],[73,39+bob],[75,44+bob],[79,47+bob],
    [75,47+bob],[72,44+bob],[69,41+bob]],(x,y)=>y<43+bob ? ELE_IVORY[0] : ELE_IVORY[1]);
  line([[71,39],[73,43],[76,45]],ELE_IVORY[2]);

  // Orelha grande rebatida sobre o ombro, com borda escura e pregas.
  const flap = idle === 1 ? -2 : walk ? Math.round(Math.sin(ph*2)) : 0;
  const ear = pts => pts.map(([x,y])=>[x+(x<58 ? flap : 0),y]);
  poly(ear([[59,15],[54,13],[49,15],[46,20],[46,29],[49,35],
    [54,39],[58,36],[61,30],[64,23],[63,18]]),0.23,'orelha');
  poly(ear([[58,16],[54,15],[50,17],[48,21],[49,28],[52,33],
    [55,35],[58,31],[61,24],[61,19]]),0.64,'orelha');
  poly(ear([[53,17],[50,20],[50,25],[52,28],[55,27],[57,22],[59,19]]),0.81,'orelha');
  poly(ear([[60,21],[57,26],[53,29],[53,32],[56,33],[59,29],[62,23]]),0.43,'orelha');
  line(ear([[49,20],[49,26],[51,29]]),pal[2]);
  // Olho pequeno e parcialmente coberto pela sobrancelha.
  line([[69,28],[71,29],[73,29]],pal[1]);
  s.set(71,30+bob,pal[0]); s.set(72,30+bob,pal[0]);
  if (idle !== 2) s.set(71,29+bob,[194,198,181]);
  line([[67,34],[69,36],[71,36]],pal[1]);
}

// ---------- Sela de pano (manta bordada, estilo elefante enfeitado da Índia) ----------
// A manta cai por cima do lombo acompanhando o contorno do corpo (usa o próprio sprite
// do elefante como molde), com barra dourada bordada, trama de losangos e
// franja de borlas coloridas. Em cima vai uma almofada onde o jogador senta.
// Um sprite por quadro, guardado em cache.
const CLOTH_RED = [[92, 20, 30], [152, 36, 42], [198, 60, 54]];
const CLOTH_GOLD = [[146, 96, 26], [214, 160, 46], [250, 216, 108]];
const CLOTH_TEAL = [[22, 84, 92], [40, 146, 142]];
const CLOTH_ORANGE = [[156, 66, 20], [222, 118, 38], [250, 178, 82]];
const elephantSaddleCache = new Map();

function elephantSaddleSprite(frame) {
  if (elephantSaddleCache.has(frame)) return elephantSaddleCache.get(frame);
  const [W, H] = WILD_SIZES.elephant, s = new Sprite(W, H);
  const body = wildlifeSprite('elephant', frame).normal;
  const mask = body.getContext('2d').getImageData(0, 0, W, H).data;
  const solid = (x, y) => x >= 0 && y >= 0 && x < W && y < H && mask[(y * W + x) * 4 + 3] > 0;
  const bob = eleBob(frame);
  const x0 = 17, x1 = 49;

  // Topo do lombo em cada coluna e a barra de baixo, que cai um pouco mais no meio
  const top = [], bottom = [];
  for (let x = x0; x <= x1; x++) {
    let y = 0;
    while (y < H && !solid(x, y)) y++;
    top[x] = y;
    bottom[x] = 40 + bob + Math.round(Math.sin(((x - x0) / (x1 - x0)) * Math.PI) * 3);
  }

  // Manta
  for (let x = x0; x <= x1; x++)
    for (let y = top[x]; y <= bottom[x]; y++) {
      if (!solid(x, y)) continue;
      const d = bottom[x] - y, side = Math.min(x - x0, x1 - x), fromTop = y - top[x];
      let c;
      if (d === 0 || d === 4) c = CLOTH_GOLD[0];
      else if (d <= 3) c = d === 2 && x % 4 === 0 ? CLOTH_TEAL[1] : (x + d) % 4 < 2 ? CLOTH_GOLD[2] : CLOTH_GOLD[1];
      else if (side === 0) c = CLOTH_GOLD[0];
      else if (side <= 2) c = CLOTH_GOLD[1 + (y % 3 === 0 ? 1 : 0)];
      else {
        if (wrap(x + y, 8) === 4 && wrap(x - y, 8) === 4) c = CLOTH_GOLD[2];        // pontinho no losango
        else if (wrap(x + y, 8) === 0 || wrap(x - y, 8) === 0) c = CLOTH_RED[0];         // trama de losangos
        else c = fromTop <= 1 ? CLOTH_RED[2] : CLOTH_RED[1];
        if ((x === 24 || x === 42) && fromTop > 3 && c === CLOTH_RED[1]) c = CLOTH_RED[0]; // dobra do pano
      }
      s.set(x, y, c);
    }

  // Franja de borlas pendurada na barra
  for (let x = x0 + 1, i = 0; x <= x1 - 1; x += 3, i++)
    for (let k = 1; k <= 3; k++) {
      if (!solid(x, bottom[x] + k)) break;
      s.set(x, bottom[x] + k, k === 3 ? CLOTH_GOLD[2] : i % 2 ? CLOTH_TEAL[1] : CLOTH_RED[2]);
    }

  // Almofada do assento, com friso dourado e borlinhas nas pontas
  const a0 = 32, a1 = 47;
  for (let x = a0; x <= a1; x++) {
    const end = x === a0 || x === a1, ty = top[x];
    for (let y = ty - 3 + (end ? 1 : 0); y <= ty; y++) {
      const k = y - (ty - 3);
      s.set(x, y, k === 0 ? CLOTH_ORANGE[2] : k === 2 ? CLOTH_GOLD[1] : k === 3 ? CLOTH_ORANGE[0] : CLOTH_ORANGE[1]);
    }
  }
  for (const x of [a0, a1]) { s.set(x, top[x] + 1, CLOTH_GOLD[2]); s.set(x, top[x] + 2, CLOTH_GOLD[0]); }

  const out = s.finish([28, 14, 18]);
  elephantSaddleCache.set(frame, out);
  return out;
}

function drawSaddle(ctx, frame) {
  const img = elephantSaddleSprite(frame);
  ctx.drawImage(img, -Math.round(img.width / 2), -img.height);
}

// A arte do tigre fica em js/tiger-art.js (49 quadros Sprite Fusion, escala e chão calibrados).

function tigerFrame(m) {
  const F = TIGER_FRAME;
  if (m.sleeping) return F.sleep + (Math.floor(m.clock * 1.4) % 8);
  if (m.state === 'wake') return m.stateT < 0.9 ? F.sleep : F.roar;
  if (m.state === 'stun') return F.stun + (Math.floor(m.stateT * 6) % 4);
  if (m.state === 'swipe') return F.swipe + Math.min(7, Math.floor(m.stateT * 12));
  if (m.state === 'roar') return F.roar;
  if (m.state === 'crouch') return F.crouch + Math.min(2, Math.floor(m.stateT * 6));
  if (!m.onGround) return m.vy < 0 ? F.leap + Math.min(2, Math.floor(m.stateT * 8)) : F.land + Math.min(1, Math.floor(m.stateT * 8));
  if (Math.abs(m.vx) > 3) {
    // Sincroniza a velocidade do ciclo de caminhada com a distância percorrida.
    const { WALK, STRIDE } = TIGER_ART;
    return Math.floor((m.gait * 5 / STRIDE) * WALK) % WALK;
  }
  return F.idle + [0, 1, 0, 2, 0, 1, 0, 3][Math.floor(m.clock * 1.5) % 8];
}
