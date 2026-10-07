'use strict';

// Sprites procedurais dos bichos (porco, canibal e morcego), com sombreamento por pixel e contorno.
// Tudo é desenhado olhando para a direita; o renderer espelha quando o bicho vira.

// ---------- Utilidades de desenho ----------
const tone = (pal, v) => pal[clamp(Math.floor(v * pal.length), 0, pal.length - 1)];
const ditherAt = (x, y, k = 0.14) => (BAYER4[(y & 3) * 4 + (x & 3)] / 16 - 0.5) * k;

// Elipse sombreada como esfera (luz de cima/esquerda). pick(luz, dx, dy, x, y) devolve a cor ou null.
function shadeBall(s, cx, cy, rx, ry, pick) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, d2 = dx * dx + dy * dy;
      if (d2 > 1) continue;
      const lam = Math.max(0, -0.45 * dx - 0.65 * dy + 0.61 * Math.sqrt(1 - d2));
      const c = pick(lam * 1.05 + 0.1 + ditherAt(x, y), dx, dy, x, y);
      if (c) s.set(x, y, c);
    }
}

// Segmento grosso (quadrados de lado w ao longo da linha)
function seg(s, x0, y0, x1, y1, w, c) {
  const n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1)), h = w / 2;
  for (let i = 0; i <= n; i++) {
    const x = lerp(x0, x1, i / n), y = lerp(y0, y1, i / n);
    for (let yy = Math.round(y - h); yy < Math.round(y + h); yy++)
      for (let xx = Math.round(x - h); xx < Math.round(x + h); xx++) s.set(xx, yy, c);
  }
}

// Membro com contorno escuro, cor base e brilho no lado da luz. pal: [contorno, base, brilho]
function limb(s, x0, y0, x1, y1, w, pal) {
  seg(s, x0, y0, x1, y1, w + 2, pal[0]);
  seg(s, x0, y0, x1, y1, w, pal[1]);
  if (w > 2) seg(s, x0 - 0.7, y0 - 0.7, x1 - 0.7, y1 - 0.7, w - 2, pal[2]);
}

// Cinemática inversa de 2 ossos: onde fica o joelho/cotovelo (fwd = 1 dobra para a frente)
function ik(hx, hy, ax, ay, L1, L2, fwd) {
  const dx = ax - hx, dy = ay - hy, d = Math.max(0.01, Math.min(Math.hypot(dx, dy), L1 + L2 - 0.01));
  const a = Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1)), k = Math.atan2(dy, dx) - a * fwd;
  return [hx + Math.cos(k) * L1, hy + Math.sin(k) * L1];
}

// ---------- Porco ----------
// Quadros 0-7: andando (patas em pares diagonais). 8-11: parado (respira, orelha, fareja). 12: no ar.
const PIG_PINK = [[128, 62, 76], [184, 100, 114], [228, 144, 154], [246, 182, 190], [255, 214, 218]];
const PIG_OUTLINE = [72, 40, 50];
function buildPigArt() {
  // Porco de fazenda: corpo comprido de cantos redondos, cabeça com focinho de disco, orelha em ponta, patinhas
  // curtas com casco escuro e rabo enrolado. Sombreamento em faixas limpas (sem ruído), uma luz só, de cima.
  const frames = [], HOOF = [[84, 54, 56], [52, 34, 38]];
  const squircle = (s, cx, cy, rx, ry, n, shade) => {                           // elipse "gordinha" (cantos mais cheios)
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x - cx) / rx, dy = (y - cy) / ry; if (Math.abs(dx) ** n + Math.abs(dy) ** n > 1) continue;
      s.set(x, y, shade(-dy * 0.7 - dx * 0.2 + 0.38, dx, dy));
    }
  };
  for (let f = 0; f < 13; f++) {
    const walk = f < 8, air = f === 12, ph = walk ? (f / 8) * Math.PI * 2 : 0;
    const bob = walk ? Math.round((1 + Math.cos(ph * 2)) / 2) : f === 9 ? 1 : 0;
    const sniff = f === 11 ? 2 : 0, earUp = f === 10, breathe = f === 9 ? 0.5 : 0;
    const s = new Sprite(34, 22), cy = 12 + bob, legTop = 16 + bob;
    for (const [lx, far, off] of [[8, true, 0], [20, true, Math.PI], [11, false, Math.PI], [23, false, 0]]) {   // patinhas
      const p = ph + off, dx = walk ? Math.round(Math.cos(p) * 1.5) : air ? (lx < 14 ? -2 : 2) : 0;
      const lift = walk ? Math.round(Math.max(0, -Math.sin(p)) * 1.5) : air ? 2 : 0, x = lx + dx, bottom = 21 - lift;
      for (let y = legTop; y <= bottom; y++) {
        const hoof = y >= bottom - 1, c = far ? [PIG_PINK[1], PIG_PINK[1], PIG_PINK[0]] : [PIG_PINK[3], PIG_PINK[2], PIG_PINK[1]];
        s.set(x, y, hoof ? HOOF[0] : c[0]); s.set(x + 1, y, hoof ? HOOF[0] : c[1]); s.set(x + 2, y, hoof ? HOOF[1] : c[2]);
      }
    }
    const tw = f % 4 < 2 ? 0 : 1;                                                // rabinho enrolado
    for (const [x, y] of [[5, 10], [4, 9], [3, 8 - tw], [4, 7 - tw], [5, 8 - tw]]) s.set(x, y + bob, PIG_PINK[2]);
    squircle(s, 15, cy, 10.8, 6.6 + breathe, 2.6, (v, dx, dy) => (dy > 0.45 ? tone(PIG_PINK, v + 0.4) : tone(PIG_PINK, v)));   // corpo
    const hx = 24, hy = 10 + bob + sniff;
    squircle(s, hx, hy, 5.8, 5.4, 2.3, (v) => tone(PIG_PINK, v + 0.1));            // cabeça
    squircle(s, hx + 5.2, hy + 2, 3, 2.8, 2.2, (v) => tone([[196, 104, 118], [236, 150, 162], [250, 188, 198], [255, 214, 220], [255, 232, 234]], v + 0.15));   // focinho de disco
    s.set(hx + 7, hy + 1, [120, 56, 68]); s.set(hx + 7, hy + 2, [120, 56, 68]); s.set(hx + 7, hy + 4, [120, 56, 68]); s.set(hx + 6, hy + 4, [120, 56, 68]);
    const e = earUp ? -2 : 0;                                                    // orelha triangular, de pé ou caída
    for (const [x, y] of [[hx - 3, hy - 6 + e], [hx - 3, hy - 5 + e], [hx - 2, hy - 5 + e], [hx - 4, hy - 4 + e], [hx - 3, hy - 4 + e], [hx - 2, hy - 4 + e], [hx - 1, hy - 4 + e], [hx - 3, hy - 3 + e], [hx - 2, hy - 3 + e], [hx - 1, hy - 3 + e], [hx, hy - 3 + e]]) s.set(x, y, PIG_PINK[1]);
    s.set(hx - 2, hy - 4 + e, PIG_PINK[3]); s.set(hx - 2, hy - 3 + e, PIG_PINK[3]);
    for (const [x, y] of [[hx + 1, hy - 2], [hx + 2, hy - 2], [hx + 1, hy - 1], [hx + 2, hy - 1]]) s.set(x, y, [30, 22, 30]);   // olho
    s.set(hx + 1, hy - 2, [255, 255, 255]);
    s.set(hx - 1, hy + 2, [255, 148, 162]); s.set(hx, hy + 2, [255, 148, 162]); s.set(hx + 3, hy + 4, PIG_PINK[0]);              // bochecha e boca
    frames.push(s.finish(PIG_OUTLINE));
  }
  // Porco quadrado: caixas em perspectiva, focinho frontal largo e patas em blocos.
  const cube = [];
  const pink = [224, 153, 151], light = [249, 185, 180], top = [255, 199, 192];
  const side = [177, 111, 110], shadow = [147, 88, 89], hoof = [107, 70, 70];
  for (let f = 0; f < 13; f++) {
    const walk = f < 8, air = f === 12, phase = walk ? f / 8 * Math.PI * 2 : 0;
    const bob = walk ? Math.round(Math.abs(Math.sin(phase))) : f === 9 ? 1 : 0;
    const s = new Sprite(46, 38), by = 12 + bob;
    const R = (x, y, w, h, c) => { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) s.set(xx, yy, c); };
    const leg = (x, far, offset) => {
      const q = phase + offset, shift = walk ? Math.round(Math.cos(q) * 1.5) : air ? (x < 15 ? -1 : 1) : 0;
      const lift = walk ? Math.round(Math.max(0, -Math.sin(q)) * 2) : air ? 2 : 0;
      const lx = x + shift, bottom = (far ? 33 : 36) - lift;
      R(lx, by + 12, 5, bottom - by - 11, far ? side : pink);
      R(lx + 4, by + 12, 2, bottom - by - 11, far ? shadow : side);
      R(lx + 1, by + 15, 2, 3, far ? [187, 122, 120] : [236, 165, 160]);
      R(lx, bottom - 1, 4, 2, hoof); R(lx + 4, bottom - 1, 2, 2, shadow);
      R(lx + 2, bottom, 1, 1, [83, 54, 57]);
    };
    leg(10, true, 0); leg(27, true, Math.PI);
    // Corpo retangular: topo claro, lateral rosa e plano traseiro sombreado.
    for (let y = 0; y < 4; y++) R(5 + 3 - y, by + y, 24, 1, y === 0 ? top : light);
    R(5, by + 4, 24, 11, pink); R(5, by + 14, 24, 1, [204, 132, 131]);
    R(29, by + 3, 3, 12, side);
    for (const [x,y,w,h,c] of [[8,5,6,2,[231,161,156]],[17,4,7,2,[239,169,164]],
      [6,10,5,2,[212,140,138]],[13,9,8,2,[233,161,157]],[22,11,5,2,[215,142,140]],
      [10,13,7,1,[224,150,146]]]) R(x,by+y,w,h,c);
    R(11,by+1,7,1,[255,207,198]); R(22,by+2,5,1,[243,178,172]);
    // Pequeno rabinho cúbico no plano traseiro.
    R(2,by+8,3,2,side); R(1,by+7,2,2,pink); R(2,by+6,2,1,light);
    leg(6, false, Math.PI); leg(23, false, 0);
    // Cabeça cúbica: plano lateral escuro e face clara voltada em três quartos.
    R(27,by+3,4,13,side); R(28,by+5,2,5,[189,120,118]);
    for (let y=0;y<3;y++) R(29+2-y,by+1+y,12,1,y===0?top:light);
    R(29,by+4,13,12,light); R(29,by+15,13,1,pink);
    R(29,by+5,2,9,[235,164,160]); R(39,by+11,3,3,[241,169,164]);
    R(31,by+12,4,2,[250,181,173]);
    // Olhos pequenos nas extremidades; focinho em bloco com duas narinas lado a lado.
    for(const x of [30,38]) { R(x,by+7,3,3,[248,235,219]);R(x+1,by+7,2,3,[39,32,32]); }
    R(33,by+10,10,2,[255,200,190]); R(32,by+12,11,5,[237,168,158]);
    R(32,by+12,1,5,[191,119,114]); R(33,by+16,10,1,[205,134,125]);
    R(34,by+13,2,2,[127,73,70]); R(39,by+13,2,2,[127,73,70]);
    // Coroa encaixada no cubo: aro lateral, topo aberto e pedras vermelhas/azuis.
    const gold=[232,185,39], shine=[255,230,113], goldSide=[161,116,26];
    R(30,by-2,12,2,goldSide);
    for(const x of [30,35,40]) {R(x,by-5,2,3,gold);R(x,by-5,1,1,shine);}
    R(27,by,3,5,goldSide); R(28,by,1,4,gold);
    R(29,by+2,14,3,gold); R(29,by+2,14,1,shine); R(29,by+5,14,1,[123,87,26]);
    for(const x of [29,33,38,42]) {R(x,by-1,1,3,gold);R(x,by-1,1,1,shine);}
    for(const [x,c,hi] of [[30,[43,89,169],[128,194,239]],[35,[170,42,40],[249,121,94]],[40,[43,89,169],[128,194,239]]]){
      R(x,by+3,2,2,c);s.set(x,by+3,hi);
    }
    cube.push(s.finish([105, 67, 66]));
  }
  return { frames, hurt: frames.map(hurtFlash), cube: { frames: cube, hurt: cube.map(hurtFlash) } };
}

function pigFrame(m) {
  if (!m.onGround) return 12;
  if (Math.abs(m.vx) > 5) return Math.floor(m.anim * 2.5) % 8;
  return 8 + [0, 1, 0, 1, 2, 0, 1, 3, 3, 0][Math.floor((m.clock || 0) * 1.6) % 10];
}

// ---------- Canibal (tipo 'undead') ----------
// Nativo da ilha: pele queimada de sol, pintura de cinza nos olhos e listras de urucum no peito,
// colar de ossos, tanga de couro e um tacape com lascas de osso. Anda curvado, à caça.
// Quadros 0-11: andar. 12: no ar (tacape erguido). 13-14: parado respirando.
const C_SKIN = [[58, 36, 26], [134, 86, 58], [172, 118, 84]];
const C_SKIN_BACK = [[48, 30, 22], [106, 68, 46], [130, 86, 60]];
const C_SKIN_TONES = [[92, 58, 40], [124, 80, 54], [150, 98, 68], [178, 124, 88]];
const C_HAIR = [[18, 14, 12], [40, 30, 24], [64, 48, 36]];
const C_HIDE = [[64, 44, 28], [108, 76, 46], [144, 106, 64]];
const C_WOOD = [[36, 24, 16], [86, 56, 34], [122, 86, 52]];
const C_BONE = [226, 214, 184], C_BONE_DARK = [168, 154, 124];
const C_RED = [146, 50, 34], C_ASH = [206, 200, 186];
function buildCannibalSprites() {
  const out = { frames: [], hurt: [] };
  for (let f = 0; f < 15; f++) {
    const walk = f < 12, air = f === 12, ph = walk ? (f / 12) * Math.PI * 2 : 0;
    const bob = walk ? (Math.abs(Math.cos(ph)) > 0.7 ? 1 : 0) : f === 14 ? 1 : 0;
    const s = new Sprite(40, 48), hipX = 18, hipY = 31 + bob;

    // Pernas descalças, com amarração de fibra no tornozelo
    const leg = (back) => {
      const p = ph + (back ? Math.PI : 0);
      let ax, lift;
      if (walk) { ax = hipX + Math.cos(p) * 5.5; lift = Math.max(0, -Math.sin(p)) * 3.5; }
      else if (air) { ax = hipX + (back ? -4 : 5); lift = back ? 2 : 5; }
      else { ax = hipX + (back ? -3 : 3); lift = 0; }
      const hx = hipX + (back ? -1 : 1), ay = 43 - lift, [kx, ky] = ik(hx, hipY, ax, ay, 7, 7, 1), pal = back ? C_SKIN_BACK : C_SKIN;
      limb(s, hx, hipY, kx, ky, 4, pal);
      limb(s, kx, ky, ax, ay, 3, pal);
      const x = Math.round(ax), fy = Math.round(ay);
      s.set(x - 1, fy - 1, [150, 128, 86]); s.set(x, fy - 1, [118, 98, 64]); s.set(x + 1, fy - 1, [150, 128, 86]);
      for (let xx = x - 2; xx <= x + 3; xx++) { s.set(xx, fy + 1, back ? C_SKIN_BACK[1] : C_SKIN[1]); s.set(xx, fy + 2, pal[0]); } // pé
      s.set(x + 3, fy, back ? C_SKIN_BACK[1] : C_SKIN[1]);
    };
    const sway = walk ? Math.round(Math.sin(ph) * 1.5) : air ? -3 : f === 14 ? 1 : 0;

    // Braço de trás balançando, mão fechada
    const armBack = () => {
      const sx = 17, sy = 21 + bob, hx = 16 - sway * 1.5, hy = sy + 10;
      const [ex, ey] = ik(sx, sy, hx, hy, 5.5, 5.5, -1);
      limb(s, sx, sy, ex, ey, 3, C_SKIN_BACK);
      limb(s, ex, ey, hx, hy, 3, C_SKIN_BACK);
    };
    leg(true);
    armBack();
    leg(false);

    // Tronco levemente curvado, com listras de urucum e colar de ossos
    const top = 18 + bob;
    for (let y = top; y < hipY; y++) {
      const lean = (hipY - y) * 0.15, t = (y - top) / (hipY - top);
      const xl = Math.round(13 + lean + t * 1), xr = Math.round(23 + lean - t * 1);
      for (let x = xl; x <= xr; x++) {
        const u = (x - xl) / Math.max(1, xr - xl);
        let c = tone(C_SKIN_TONES, 0.95 - u * 0.55 - t * 0.25 + ditherAt(x, y));
        const k = y - top - Math.round(u * 2);
        if ((k === 7 || k === 9) && u > 0.15 && u < 0.9) c = C_RED; // duas listras de urucum
        if (y === top + 8 + (x % 3 === 0 ? 1 : 0) && u > 0.55) c = shade(c, 0.85); // sombra do peito
        s.set(x, y, c);
      }
    }
    // Colar: contas de osso e um dente grande pendurado
    for (let x = 14; x <= 20; x++) { const y = top + 3 + (x > 15 && x < 19 ? 1 : 0); s.set(x, y, x % 2 ? C_BONE : C_BONE_DARK); }
    s.set(17, top + 5, C_BONE); s.set(17, top + 6, C_BONE_DARK);

    // Tanga de couro com franja
    for (let y = hipY - 2; y <= hipY + 5; y++)
      for (let x = 13; x <= 24; x++) {
        const fr = hipY + 2 + ((x * 7) % 4);
        if (y > fr && !(x >= 18 && x <= 22 && y <= hipY + 6)) continue; // aba da frente mais comprida
        const c = y === hipY - 2 ? [150, 128, 86] : tone(C_HIDE, 0.85 - (x - 13) / 16 + ditherAt(x, y));
        s.set(x, y, c);
      }

    // Cabeça: cabelo preto armado, faixa de cinza nos olhos, dentes à mostra
    const hx = 22, hy = 11 + bob + (walk ? Math.round(Math.sin(ph * 2 + 1) * 0.5) : 0);
    seg(s, 20, hy + 4, 21, top + 1, 3, C_SKIN[1]); // pescoço
    shadeBall(s, hx, hy, 5.2, 5.8, (v, dx, dy) => {
      if (dy < -0.2 && dx < 0.6 || dx < -0.45) return tone(C_HAIR, v);
      return tone(C_SKIN_TONES, v + 0.15);
    });
    for (let x = hx - 5; x <= hx + 2; x += 2) { s.set(x, hy - 6 - (x % 4 === 0 ? 1 : 0), C_HAIR[1]); s.set(x + 1, hy - 6, C_HAIR[0]); } // tufos
    seg(s, hx - 5, hy, hx - 6, hy + 5, 2, C_HAIR[0]); // cabelo caindo na nuca
    s.set(hx - 1, hy + 1, C_SKIN[0]); s.set(hx - 1, hy, C_SKIN[1]); // orelha
    for (let x = hx + 1; x <= hx + 5; x++) s.set(x, hy - 1, C_ASH); // faixa de cinza nos olhos
    s.set(hx + 2, hy - 2, C_ASH); s.set(hx + 3, hy, C_ASH);
    s.set(hx + 4, hy - 1, [28, 18, 16]); s.set(hx + 3, hy - 2, C_HAIR[0]); s.set(hx + 4, hy - 2, C_HAIR[0]); // olho e sobrancelha
    s.set(hx + 6, hy + 1, C_SKIN_TONES[2]); s.set(hx + 5, hy + 1, C_SKIN_TONES[1]); // nariz
    const mouth = hy + 3 + (walk && f % 6 < 3 ? 1 : 0);
    for (let x = hx + 2; x <= hx + 5; x++) s.set(x, mouth, [44, 20, 18]);
    s.set(hx + 3, mouth, C_BONE); s.set(hx + 5, mouth, C_BONE);
    s.set(hx + 1, hy + 2, C_RED); s.set(hx + 1, hy + 3, C_RED); // risco na bochecha

    // Braço da frente segurando o tacape
    const sx = 20, sy = 21 + bob;
    const hand = air ? [26, 15 + bob] : [28, sy + 9 + sway];
    const [ex, ey] = ik(sx, sy, hand[0], hand[1], 5.5, 5.5, air ? -1 : 1);
    limb(s, sx, sy, ex, ey, 3, C_SKIN);
    limb(s, ex, ey, hand[0], hand[1], 3, C_SKIN);
    const tip = air ? [21, 1 + bob] : [37, hand[1] - 13];
    const dx = tip[0] - hand[0], dy = tip[1] - hand[1], L = Math.hypot(dx, dy);
    const butt = [hand[0] - dx / L * 2, hand[1] - dy / L * 2], neck = [hand[0] + dx / L * (L - 5), hand[1] + dy / L * (L - 5)];
    limb(s, butt[0], butt[1], neck[0], neck[1], 1, C_WOOD);
    limb(s, neck[0], neck[1], tip[0], tip[1], 3, C_WOOD);
    const nx = -dy / L, ny = dx / L; // lascas de osso dos dois lados da cabeça do tacape
    for (const k of [0.3, 0.7]) {
      const px = lerp(neck[0], tip[0], k), py = lerp(neck[1], tip[1], k);
      s.set(Math.round(px + nx * 2.5), Math.round(py + ny * 2.5), C_BONE);
      s.set(Math.round(px - nx * 2.5), Math.round(py - ny * 2.5), C_BONE_DARK);
    }
    s.set(hand[0], hand[1], C_SKIN[2]); s.set(hand[0] + 1, hand[1], C_SKIN[1]); // dedos por cima do cabo

    const canvas = s.finish([20, 14, 12]);
    out.frames.push(canvas); out.hurt.push(hurtFlash(canvas));
  }
  return out;
}

// ---------- Morcego ----------
// 8 quadros de batida de asa: membrana entre 3 dedos com borda recortada, corpo sobe na batida para baixo.
const BAT_FUR = [[40, 30, 50], [74, 56, 90], [104, 82, 122], [140, 112, 156]];
const BAT_WING = [[56, 38, 70], [88, 62, 106], [118, 90, 136]];
function inTri(px, py, a, b, c) {
  const d = (p, q, r) => (p[0] - r[0]) * (q[1] - r[1]) - (q[0] - r[0]) * (p[1] - r[1]);
  const p = [px, py], d1 = d(p, a, b), d2 = d(p, b, c), d3 = d(p, c, a);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
}
function buildBatSprites() {
  const out = { frames: [], hurt: [] };
  for (let f = 0; f < 8; f++) {
    const ph = (f / 8) * Math.PI * 2, flap = Math.sin(ph) * 0.95, cy = 31 - Math.round(Math.cos(ph) * 1.2);
    const s = new Sprite(32, 40);
    for (const sgn of [-1, 1]) {
      const S = [16 + sgn * 3, cy - 1], hip = [16 + sgn * 1, cy + 4];
      const tips = [[12, -0.55], [13, 0], [10, 0.5]].map(([len, off]) => { const a = -flap + off; return [S[0] + sgn * Math.cos(a) * len, S[1] + Math.sin(a) * len]; });
      const tris = [[S, tips[0], tips[1]], [S, tips[1], tips[2]], [S, tips[2], hip]];
      const bites = [[tips[1], tips[2]], [tips[2], hip]].map(([p, q]) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]);
      const wingTone = flap > 0.3 ? 2 : flap < -0.3 ? 0 : 1; // asa levantada pega mais luz
      for (let y = 0; y < 40; y++)
        for (let x = 0; x < 32; x++) {
          const px = x + 0.5, py = y + 0.5;
          if (!tris.some(([a, b, c]) => inTri(px, py, a, b, c))) continue;
          if (bites.some(([bx, by]) => Math.hypot(px - bx, py - by) < 2.2)) continue; // recorte entre os dedos
          s.set(x, y, BAT_WING[clamp(wingTone + (Math.hypot(px - S[0], py - S[1]) < 5 ? 0 : -1) + 1, 0, 2)]);
        }
      for (const t of tips) seg(s, S[0], S[1], t[0], t[1], 1, [36, 24, 46]); // ossos dos dedos
    }
    // Corpo peludo, orelhas, olhos e presinhas
    shadeBall(s, 16, cy, 4, 5, (v, dx, dy) => tone(BAT_FUR, dy > 0.3 ? v + 0.2 : v));
    for (const [x, y] of [[13, cy - 7], [13, cy - 6], [14, cy - 5], [19, cy - 7], [19, cy - 6], [18, cy - 5]]) s.set(x, y, BAT_FUR[2]);
    s.set(14, cy - 2, [255, 222, 120]); s.set(18, cy - 2, [255, 222, 120]);
    s.set(15, cy + 1, [240, 236, 226]); s.set(17, cy + 1, [240, 236, 226]);
    s.set(15, cy + 5, BAT_FUR[0]); s.set(17, cy + 5, BAT_FUR[0]);
    const canvas = s.finish([20, 14, 26]);
    out.frames.push(canvas); out.hurt.push(hurtFlash(canvas));
  }
  return out;
}
