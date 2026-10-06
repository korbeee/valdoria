'use strict';

// =====================================================================================
//  ARTE DO DINAMITEIRO (monstro 'bomber')
// =====================================================================================
// Um goblin mineiro das cavernas: pele pálida de quem nunca viu o sol, nariz comprido,
// orelha pontuda, capacete amassado com lanterna, cartucheira de dinamite no peito e um
// BARRIL DE PÓLVORA amarrado nas costas, com o pavio para cima. Anda curvado, na ponta dos
// pés. Quando chega perto ele acende o pavio, levanta os braços e sai correndo e rindo.
// Quadros (os mesmos que monsterFrame usa):
//   0–7   andar curvado: passo alternado, barril sacolejando atrasado, braços balançando
//   8–15  pavio aceso, 4 estágios × 2 pulsos: o pavio encurta, a faísca sobe e crepita,
//         ele corre de braços para cima gargalhando, olho vermelho; no fim o barril esquenta
//   16–19 parado: respira (16), olha para trás com a lanterna apagando (17), coça o
//         capacete (18) e pisca (19)
// =====================================================================================

const DYNAMITER = {
  skin: [[64, 58, 74], [102, 94, 112], [146, 138, 152], [188, 182, 190]],
  shirt: [[56, 46, 42], [90, 74, 58], [128, 108, 80], [164, 144, 108]],
  pants: [[34, 38, 64], [54, 62, 98], [82, 94, 134]],   // calça de brim azul, com remendo
  glove: [[62, 36, 22], [104, 64, 36], [150, 100, 56]], // luvas de couro
  boot: [[26, 20, 22], [46, 36, 34], [70, 58, 50]],
  wood: [[60, 32, 22], [100, 56, 32], [142, 84, 44], [180, 118, 64]],
  iron: [[32, 30, 36], [68, 66, 74], [110, 108, 116]],
  helmet: [[90, 62, 26], [148, 108, 40], [202, 158, 60], [236, 204, 112]],
  tnt: [[92, 18, 24], [158, 34, 34], [212, 72, 60]],
  line: [24, 18, 24],
};

function buildBomberSprites() {
  const out = { frames: [], hurt: [] };
  for (let f = 0; f < 20; f++) {
    const canvas = paintDynamiter(f);
    out.frames.push(canvas);
    out.hurt.push(hurtFlash(canvas));
  }
  return out;
}

function paintDynamiter(f) {
  const D = DYNAMITER, s = new Sprite(40, 48);
  const walk = f < 8, armed = f >= 8 && f < 16, idle = f >= 16;
  const L = armed ? (f - 8) >> 1 : -1, P = armed ? (f - 8) & 1 : 0;
  // Andando: ciclo de 8 quadros. Pavio aceso: corre (o ciclo avança um quarto a cada quadro)
  const ph = walk ? (f / 8) * Math.PI * 2 : armed ? (f - 8) * Math.PI / 2 : 0;
  const moving = walk || armed, stride = armed ? 3.8 : 3;
  const bob = moving ? Math.round(Math.abs(Math.sin(ph))) : idle && f === 16 ? 1 : 0;
  const lean = armed ? 2.5 : 1.2;

  // O desenho é pensado numa grade pequena e ampliado K vezes a partir dos pés (TX/TY), para o
  // goblin ficar do porte dos outros monstros sem perder os detalhes de 1 pixel.
  const K = 1.3, OX = 19, OY = 46.5, TX = (x) => OX + (x - OX) * K, TY = (y) => OY + (y - OY) * K;
  const rect = (x, y, w, h, c) => {
    for (let Y = Math.round(TY(y)); Y < Math.max(Math.round(TY(y)) + 1, Math.round(TY(y + h))); Y++)
      for (let X = Math.round(TX(x)); X < Math.max(Math.round(TX(x)) + 1, Math.round(TX(x + w))); X++) s.set(X, Y, c);
  };
  const put = (x, y, c) => rect(Math.round(x), Math.round(y), 1, 1, c);
  // Traço grosso de A até B (em pixels já ampliados)
  const line = (ax, ay, bx, by, wd, c) => {
    const x0 = TX(ax), y0 = TY(ay), x1 = TX(bx), y1 = TY(by), w = wd * K, n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2));
    for (let i = 0; i <= n; i++) {
      const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n;
      for (let yy = -w / 2; yy < w / 2; yy++) for (let xx = -w / 2; xx < w / 2; xx++) s.set(Math.round(x + xx + 0.25), Math.round(y + yy + 0.25), c);
    }
  };
  // Elipse sombreada: luz de cima e da esquerda (keep recebe a linha já ampliada)
  const blob = (cx0, cy0, rx0, ry0, ramp, keep = () => true) => {
    const cx = TX(cx0), cy = TY(cy0), rx = rx0 * K, ry = ry0 * K;
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy > 1 || !keep(x, y, dx, dy)) continue;
        const v = 0.55 - dx * 0.32 - dy * 0.42 + (BAYER4[(y & 3) * 4 + (x & 3)] / 16 - 0.5) * 0.12;
        s.set(x, y, ramp[clamp(Math.floor(v * ramp.length), 0, ramp.length - 1)]);
      }
  };

  // ---- Esqueleto do quadro ----
  const hip = [16.5 + (armed ? 1 : 0), 37.5 - bob];
  const sh = [hip[0] + 2.5 + lean, hip[1] - 8.5];
  const head = [sh[0] + 3.2, sh[1] - 4.2 + (idle && f === 18 ? 0.5 : 0)];
  const kegLag = moving ? Math.round(Math.sin(ph - 1.1)) : 0;
  const keg = [sh[0] - 5.8, sh[1] + 2.5 + kegLag * 0.8];

  // ---- Perna ----
  const leg = (near) => {
    const q = ph + (near ? 0 : Math.PI), fx = hip[0] + (moving ? Math.cos(q) * stride : near ? 1.5 : -1.5);
    const lift = moving ? Math.max(0, -Math.sin(q)) * (armed ? 3 : 2.2) : 0, fy = 44.5 - lift;
    const knee = [(hip[0] + fx) / 2 + 2, (hip[1] + fy) / 2 - 0.5];
    const c = near ? D.pants : D.pants.map((x) => x.map((v) => v * 0.78));
    line(hip[0], hip[1], knee[0], knee[1], 3, c[1]); line(knee[0], knee[1], fx, fy - 1, 2.5, c[near ? 2 : 1]);
    if (near) put(knee[0] - 0.5, knee[1] - 0.5, D.shirt[2]); // remendo no joelho
    rect(fx - 1.5, fy - 1, 4.5, 2, D.boot[near ? 1 : 0]); put(fx + 2.5, fy, D.boot[0]); put(fx - 1, fy - 1, D.boot[2]);
  };
  // ---- Braço (manga de camisa e antebraço de pele) ----
  const arm = (near) => {
    const q = ph + (near ? Math.PI : 0), up = armed && L >= 1;
    let hand;
    if (up) hand = [sh[0] + (near ? 7 + P : -4.5 - P), sh[1] - 9.5 + (P ? 1 : 0)];          // braços para cima: pânico feliz
    else if (idle && f === 18 && near) hand = [head[0] - 1, head[1] - 5];                 // coçando o capacete
    else hand = [sh[0] + (near ? 2 : -1) + (moving ? Math.cos(q) * 2.6 : 0), sh[1] + 6.5 - (moving ? Math.max(0, Math.sin(q)) : 0)];
    const elbow = [(sh[0] + hand[0]) / 2 + (up ? (near ? 1 : -1) : -0.5), (sh[1] + hand[1]) / 2 + (up ? 0 : 0.5)];
    line(sh[0], sh[1], elbow[0], elbow[1], 2.5, near ? D.shirt[2] : D.shirt[1]);
    line(elbow[0], elbow[1], hand[0], hand[1], 2, near ? D.skin[2] : D.skin[1]);
    rect(hand[0] - 1.2, hand[1] - 1.2, 2.4, 2.4, near ? D.glove[1] : D.glove[0]);      // luva de couro (lê bem na frente do rosto)
    put(hand[0] - 1, hand[1] - 1, near ? D.glove[2] : D.glove[1]);
  };

  leg(false); arm(false);

  // ---- Barril de pólvora nas costas ----
  const [kx, ky] = keg, hot = armed ? Math.max(0, (L - 1) / 2) + P * 0.1 : 0;
  for (let y = -5; y <= 5; y++) {
    const half = y === -5 || y === 5 ? 3 : y === -4 || y === 4 ? 4 : 4.5; // aduelas abauladas
    for (let x = -Math.floor(half); x < half; x++) {
      const t = clamp(Math.floor(2.6 - (x + half) / (half * 2) * 1.2 + (y < -2 ? 0.6 : 0) + (x % 2 === 0 ? 0 : 0.35)), 0, 3);
      let c = D.wood[3 - t];
      if (Math.abs(y) === 3) c = hot ? lerpColor(D.iron[1], [255, 140, 60], Math.min(1, hot)) : D.iron[x < 0 ? 2 : 1]; // aros de ferro
      put(kx + x, ky + y, c);
    }
  }
  if (hot > 0.4) for (const [x, y] of [[-1, -1], [0, 0], [1, 1], [0, 2], [2, -2]]) put(kx + x, ky + y, [255, 190, 90]); // aduela rachando de calor
  put(kx - 1, ky - 5, D.wood[0]); put(kx, ky - 5, D.iron[0]);                               // tampa com o furo do pavio
  // Pavio: curva para cima e para trás; com fogo ele encurta a cada estágio
  const fuseLen = armed ? Math.max(1.5, 7 - L * 1.8 - P * 0.6) : 7;
  const fuse = [];
  for (let i = 0; i <= Math.ceil(fuseLen); i++) {
    const k = Math.min(i, fuseLen);
    fuse.push([kx - 0.5 - Math.sin(k * 0.45) * 2.2, ky - 6 - k]);
  }
  for (const [x, y] of fuse) put(x, y, D.iron[0]);
  const tip = fuse[fuse.length - 1];
  if (armed) { // faísca crepitando e fumacinha
    const spark = P ? [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1], [2, 0], [0, -2]] : [[0, 0], [1, 0], [0, -1], [-1, 1]];
    for (const [dx, dy] of spark) put(tip[0] + dx, tip[1] + dy, dx === 0 && dy === 0 ? [255, 255, 220] : Math.abs(dx) + Math.abs(dy) > 1 ? [255, 150, 50] : [255, 220, 110]);
    for (const [dx, dy, c] of [[-1, -3, [150, 146, 140]], [0, -4 - P, [120, 116, 112]], [-2, -5, [100, 96, 94]]]) put(tip[0] + dx, tip[1] + dy, c);
  }
  // Correia do barril passando pelo ombro
  line(kx + 2, ky - 4, sh[0] + 1, sh[1] + 1, 1, D.boot[1]);

  // ---- Tronco curvado para a frente ----
  const torsoN = 8;
  for (let i = 0; i <= torsoN; i++) {
    const k = i / torsoN, x = lerp(hip[0], sh[0], k), y = lerp(hip[1], sh[1], k), r = lerp(3.4, 3.1, k);
    blob(x, y, r, r, D.shirt);
  }
  rect(hip[0] - 3, hip[1] - 1, 7, 1.5, D.boot[1]); put(hip[0] + 1, hip[1] - 1, D.helmet[3]);  // cinto e fivela
  // Cartucheira de dinamite no peito: três bananas vermelhas presas na alça
  line(sh[0] - 2, sh[1] - 0.5, hip[0] + 2.5, hip[1] - 1.5, 1, D.boot[0]);
  for (let k = 0; k < 3; k++) {
    const x = sh[0] + 0.5 - k * 1.1, y = sh[1] + 1.2 + k * 2.2;
    rect(x, y, 2, 2.6, D.tnt[1]); put(x, y, D.tnt[2]); put(x + 1, y + 1.6, D.tnt[0]);
  }

  leg(true);
  const armsUp = armed && L >= 1;
  if (armsUp) arm(true); // braço erguido passa atrás da cabeça: o rosto continua à mostra

  // ---- Cabeça: crânio pálido, orelha pontuda para trás, nariz comprido, capacete ----
  const [hx, hy] = head;
  line(hx - 2.5, hy + 0.5, hx - 7, hy - 2.5 + (moving ? Math.round(Math.sin(ph * 2)) * 0.5 : 0), 2, D.skin[1]); // orelha
  put(hx - 6.5, hy - 2.5, D.skin[2]);
  blob(hx, hy + 0.3, 4.4, 4, D.skin);
  line(hx + 3.5, hy + 0.2, hx + 7, hy + 1.8, 2, D.skin[2]);                        // nariz de goblin
  put(hx + 7, hy + 1.5, D.skin[3]); put(hx + 6, hy + 2.5, D.skin[0]);
  // Olho: amarelo e desconfiado; vermelho e arregalado com o pavio aceso
  const ex = hx + 2, ey = hy - 0.3;
  if (f === 19) { put(ex, ey, D.skin[0]); put(ex + 1, ey, D.skin[0]); }
  else if (idle && f === 17) { put(ex - 1, ey, [236, 220, 120]); put(ex - 2, ey, [20, 14, 16]); } // olhando para trás
  else if (armed) { put(ex, ey - 1, [255, 230, 200]); put(ex + 1, ey - 1, [255, 230, 200]); put(ex, ey, [255, 70, 50]); put(ex + 1, ey, [255, 150, 110]); }
  else { put(ex, ey, [236, 220, 120]); put(ex + 1, ey, [20, 14, 16]); put(ex, ey - 1, D.skin[0]); put(ex + 1, ey - 1, D.skin[0]); }
  // Boca: sorriso torto; gargalhada aberta com o pavio aceso
  const mx = hx + 1.5, my = hy + 2.6, dark = [40, 18, 26];
  if (armed && L >= 1) {
    rect(mx, my, 4, 2 + (P ? 1 : 0), dark); put(mx + 1, my + 1 + P, [196, 70, 84]);
    put(mx, my, [236, 230, 210]); put(mx + 2, my, [236, 230, 210]);             // dentinhos
  } else {
    for (let x = 0; x < 4; x++) put(mx + x, my + (x === 3 ? -1 : 0), dark);
    put(mx + 1, my + 1, [226, 222, 200]);
  }
  // Capacete de mineiro: cúpula amassada, aba e a lanterna na frente
  blob(hx - 0.3, hy - 1.6, 5, 3.6, D.helmet, (x, y) => y <= Math.round(TY(hy - 1.6)));
  line(hx - 5.2, hy - 1.2, hx + 4.2, hy - 1.2, 1, D.helmet[0]);                      // aba
  put(hx - 2, hy - 4, D.helmet[1]); put(hx - 1, hy - 4.5, D.helmet[0]);              // amassado
  const lampOn = !(idle && f === 17);                                                 // olhando para trás, a lanterna apaga
  rect(hx + 3, hy - 4, 2, 2.5, D.iron[1]);
  put(hx + 4.2, hy - 3.4, lampOn ? [255, 244, 180] : [120, 110, 80]); put(hx + 4.2, hy - 2.4, lampOn ? [240, 210, 120] : [90, 84, 70]);
  if (lampOn) { put(hx + 6, hy - 3.5, [255, 236, 170]); put(hx + 7, hy - 4, [220, 190, 120]); }

  if (!armsUp) arm(true);
  return s.finish(D.line);
}
