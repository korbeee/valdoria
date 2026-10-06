'use strict';
// =====================================================================================
//  FAUNA NOVA, PARTE 4: gaivota, tucano, cascavel, jacaré, cogumelo-andante, lesma luminosa e bulbo-esporo
// =====================================================================================
// Aves usam o voo de js/wildlife.js (updateBird); cobra e jacaré são correntes de segmentos que ondulam; o bosque luminoso
// ganha três bichos brilhantes. Carrega depois de fauna-species3.js.

// ---------------------------------------------------------------- aves: asa que bate em 8 quadros
// P = { body: pal, wingIn: pal, tip: cor, beak: (s, x, y, f) => void, tail: [cores], belly, head: pal, rump }
function frBird(s, f, P) {
  const I = frInfo(f), ph = I.walk ? I.ph : f * 0.6, cx = 17, cy = 12 - (Math.sin(ph) > 0 ? 1 : 0);
  const flap = Math.sin(ph);
  const wing = (far) => {
    const root = [cx + 1.5 - (far ? 2 : 0), cy - 2.5], ang = -Math.PI / 2 - 0.35 + (1 - flap) / 2 * Math.PI * 0.95, L = (P.wingLen ?? 14) * (0.62 + 0.38 * Math.abs(flap));
    const dir = [Math.cos(ang), Math.sin(ang)], perp = [-dir[1], dir[0]];
    for (let i = 0; i <= L; i++) {
      const t = i / L, hw = (1 - t * 0.55) * (P.wingW ?? 3.4) * (0.7 + 0.3 * Math.abs(flap) + 0.3), px = root[0] + dir[0] * i, py = root[1] + dir[1] * i;
      for (let k = -hw; k <= hw; k += 0.5) {
        const x = px + perp[0] * k, y = py + perp[1] * k, shadeI = far ? 0 : clamp(Math.floor((1 - t) * P.wingIn.length * 0.95 + (k < 0 ? 0.4 : 0)), 0, P.wingIn.length - 1);
        s.set(Math.round(x), Math.round(y), t > 0.78 ? (far ? shade(P.tip, 0.8) : P.tip) : (far ? shade(P.wingIn[0], 0.85) : P.wingIn[shadeI]));
      }
    }
  };
  wing(true);
  frPoly(s, [[cx - 6, cy - 1], [cx - 14, cy + 0.5 + flap * 0.5], [cx - 14, cy + 3], [cx - 6, cy + 3]], (x, y) => P.tail[clamp(Math.floor((x - cx + 14) / 5), 0, P.tail.length - 1)]);
  frFur(s, cx, cy, 7.4, 3.8, { pal: P.body, seed: P.seed || 4, belly: P.belly ?? 0.14, fur: 0.4, pattern: P.pattern });
  if (P.rump) frFur(s, cx - 6.4, cy, 2.2, 2.6, { pal: P.rump, seed: 9, fur: 0 });
  wing(false);
  // pés recolhidos
  seg(s, cx - 1, cy + 4, cx - 3, cy + 5.5, 1, P.leg || [220, 150, 60]); seg(s, cx + 1, cy + 4, cx - 1, cy + 5.5, 1, P.leg || [220, 150, 60]);
  const hx = cx + 8, hy = cy - 2.4 + (flap > 0.3 ? 0.6 : 0);
  frFur(s, cx + 5.2, cy - 1.2, 3, 3, { pal: P.head || P.body, seed: 7, fur: 0.3 });
  frFur(s, hx, hy, 3.2, 3, { pal: P.head || P.body, seed: 8, fur: 0.3 });
  P.beak(s, hx + 2.4, hy + 0.6, f);
  frEye(s, Math.round(hx + 1), Math.round(hy - 0.8), { iris: P.eyeIris });
}
const birdHook = (paint) => ({
  paint, outline: [24, 22, 28],
  setup(m) { m.flap = Math.random() * 8; m.dir = Math.random() < 0.5 ? -1 : 1; },
  frame(m) { return Math.floor(m.flap || 0) % 8; },
  update(m, dt, w, p) { Wildlife.prototype.updateBird.call(m, dt, w, p); },
});

// ---------------------------------------------------------------- Gaivota (praia)
{
  const body = [[162, 176, 194], [204, 216, 230], [236, 242, 250], [255, 255, 255]];
  const P = { body, wingIn: [[96, 110, 130], [136, 152, 172], [176, 190, 208], [214, 224, 236]], tip: [18, 22, 30], tail: [[220, 228, 238], [244, 248, 252], [255, 255, 255]], head: body, wingLen: 15, wingW: 3.6, eyeIris: [30, 24, 20], leg: [240, 150, 60],
    beak: (s, x, y) => { frPoly(s, [[x - 1, y - 1.2], [x + 4.5, y + 0.2], [x - 1, y + 1.4]], (px) => (px > x + 3 ? [214, 60, 50] : [250, 206, 60])); s.set(Math.round(x + 1.5), Math.round(y + 0.8), [214, 60, 50]); } };
  frSpecies('gaivota', { name: 'Gaivota', biome: BIOME.OCEAN, hp: 6, speed: 52, w: 14, h: 10, drops: [[ITEM.FEATHER, 1, 2], [ITEM.EGG, 0, 1]], color: '#eef2f8' }, birdHook((s, p, f) => frBird(s, f, P)), [34, 24], body, 'bird');
}
// ---------------------------------------------------------------- Tucano (selva)
{
  const body = [[10, 10, 16], [30, 32, 44], [58, 62, 84], [96, 104, 132]];
  const P = { body, wingIn: [[14, 18, 30], [30, 38, 60], [56, 68, 100], [90, 108, 150]], tip: [8, 10, 18], tail: [[16, 18, 28], [30, 34, 48], [50, 56, 80]], head: [[20, 20, 28], [44, 44, 58], [86, 86, 108]], rump: [[130, 20, 24], [200, 44, 44], [250, 100, 80]], wingLen: 12, wingW: 3.1, eyeIris: [60, 190, 230], leg: [90, 120, 190],
    pattern: (dx, dy, nx, ny) => (nx > 0.35 && ny > -0.2 && ny < 0.8 ? [[250, 244, 220], [255, 252, 240]][ny > 0.4 ? 0 : 1] : null),
    beak: (s, x, y) => { frPoly(s, [[x - 1, y - 2.4], [x + 8.5, y + 1.6], [x + 8, y + 3.4], [x - 1, y + 2.4]], (px, py) => (px > x + 6.4 ? [210, 36, 34] : py - y < 0.4 ? [255, 214, 70] : py - y < 1.6 ? [255, 150, 40] : [214, 100, 30])); seg(s, x - 0.5, y - 2.4, x + 7.5, y + 1.2, 0.8, [40, 24, 16]); } };
  frSpecies('tucano', { name: 'Tucano', biome: BIOME.JUNGLE, hp: 8, speed: 46, w: 14, h: 11, drops: [[ITEM.FEATHER, 1, 2], [ITEM.EGG, 0, 1]], color: '#2a2e40' }, birdHook((s, p, f) => frBird(s, f, P)), [38, 26], body, 'bird');
}

// ---------------------------------------------------------------- bichos brilhantes do bosque
const FUNGAL_CAP = [[40, 22, 92], [84, 46, 150], [138, 86, 206], [190, 140, 250], [236, 210, 255]];
const FUNGAL_STEM = [[110, 100, 130], [180, 170, 198], [226, 220, 238], [250, 246, 255]];
// ---- Cogumelo-andante: chapéu cheio de pintas luminosas sobre um caule com perninhas
{
  const paint = (s, p, f) => {
    const I = frInfo(f), ph = I.ph, g = 29, cx = 12, bob = I.walk ? Math.round(Math.abs(Math.sin(ph * 2)) * 1.2) : (I.idle === 1 ? 1 : 0), tilt = I.idle === 2 ? 1.2 : I.idle === 3 ? -1.2 : (I.walk ? Math.sin(ph) * 0.8 : 0);
    for (const [hx, k, far] of [[cx - 2.6, 1, true], [cx + 2.6, 0, false]]) {
      const foot = I.walk ? frFoot(ph / FR_TAU + k * 0.5, hx, g, 5, 2.4) : [hx, g];
      frLeg(s, hx, g - 8 - bob, foot[0], foot[1], { L1: 3.2, L2: 3.2, w1: 3, w2: 2.4, pal: FUNGAL_STEM, hoof: [90, 70, 110], paw: 2 }, far);
    }
    frFur(s, cx, g - 12 - bob, 4.6, 6.2, { pal: FUNGAL_STEM, seed: 5, fur: 0.3, belly: 0.1 });
    // rostinho no caule: olhos grandes e boquinha
    frEye(s, cx + 1, g - 14 - bob, { big: true }); frEye(s, cx + 4, g - 14 - bob, { big: true, closed: f === 11 });
    seg(s, cx + 1.5, g - 10.4 - bob, cx + 3.5, g - 10.4 - bob, 1, [90, 50, 90]);
    // chapéu
    const ccy = g - 19 - bob, rx = 10.6, ry = 6.2;
    for (let y = Math.floor(ccy - ry - 1); y <= ccy + 3; y++) for (let x = Math.floor(cx - rx - 1 + tilt); x <= Math.ceil(cx + rx + 1 + tilt); x++) {
      const nx = (x + 0.5 - cx - tilt) / rx, ny = (y + 0.5 - ccy) / ry;
      if (ny > 0.42 || nx * nx + Math.min(ny, 0) ** 2 > 1) continue;
      if (ny > 0) { s.set(x, y, ny > 0.28 ? FUNGAL_CAP[0] : shade([200, 190, 230], 0.7)); continue; }
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)), l = clamp(-nx * 0.45 - ny * 0.6 + nz * 0.5, 0, 1);
      s.set(x, y, FUNGAL_CAP[clamp(Math.floor(l * 5.2 + (BAYER4[(y & 3) * 4 + (x & 3)] / 16 - 0.5) * 0.7), 0, 4)]);
    }
    for (const [sx, sy, r] of [[-5, -3, 1.6], [-1, -5, 1.2], [3, -3.6, 1.7], [6, -1.6, 1.1], [-7, -0.8, 1], [1, -1.4, 1]]) { shadeBall(s, cx + sx + tilt, ccy + sy, r, r, (l) => [[60, 200, 170], [120, 255, 220], [210, 255, 244]][clamp(Math.floor(l * 3), 0, 2)]); }
    if (f === 14) for (let i = 0; i < 4; i++) s.set(cx - 7 + i * 5, g - 27 - bob - (i & 1) * 2, [200, 255, 240]);
  };
  frSpecies('cogumelito', { name: 'Cogumelo-andante', biome: BIOME.FUNGAL, hp: 10, speed: 30, w: 14, h: 22, drops: [[ITEM.GLOW_CAP, 1, 2], [ITEM.FIELD_MUSHROOM, 0, 1]], color: '#8a56ce', glow: [120, 255, 214] },
    faunaHook({ paint, scare: 4, flee: 2, gaitDiv: 3, idleChance: 0.55, frames: { idle: (m, f) => (f === 10 && Math.floor(m.clock * 1.4) % 3 === 0 ? 14 : f) } }), [24, 30], FUNGAL_CAP, 'slime');
}
// ---- Lesma luminosa: corpo translúcido com pintas que acendem, deixa um rastro brilhante
{
  const pal = [[22, 58, 84], [40, 112, 132], [84, 178, 172], [148, 230, 208], [222, 255, 242]];
  const paint = (s, p, f) => {
    const I = frInfo(f), ph = I.ph, g = 17, N = 14;
    const pts = [];
    for (let i = 0; i <= N; i++) { const t = i / N, x = 6 + t * 18, wave = I.walk ? Math.sin(t * 6 - ph) * 0.9 * (0.4 + t * 0.6) : Math.sin(f * 0.5 + t * 2) * 0.3, rise = Math.pow(Math.max(0, t - 0.62) / 0.38, 1.7) * (6 + (I.idle === 2 ? 3 : 0)); pts.push([x, g - 3 - Math.sin(t * Math.PI) * 3 - rise + wave * 0.6, t]); }
    pts.forEach(([x, y, t], i) => { const r = 3.5 - t * 1.4 + (t < 0.1 ? -1.4 : 0) + Math.sin(t * Math.PI) * 1.4; frFur(s, x, y, r * 1.2, r, { pal, seed: 5 + i, fur: 0.1, belly: 0.12, pattern: (dx, dy, nx, ny) => (hash2(i, Math.round(dx), 4) > 0.86 && ny < 0.3 ? [[255, 130, 220], [255, 180, 240]][dx & 1] : null) }); });
    // pé achatado e brilhante
    for (let i = 0; i <= 18; i++) { const t = i / 18; seg(s, 5 + t * 21, g - 0.5, 5 + t * 21, g - 0.5, 1.6, t > 0.6 ? pal[2] : pal[1]); }
    // concha de muco ondulada nas costas
    const [mx, my] = pts[6]; frFur(s, mx, my - 2.4, 4.4, 3.2, { pal: [[60, 40, 120], [110, 80, 190], [170, 130, 250], [222, 196, 255]], seed: 31, fur: 0, pattern: (dx, dy, nx, ny) => (Math.abs(Math.hypot(nx, ny) * 3 - Math.floor(Math.hypot(nx, ny) * 3) - 0.5) < 0.16 ? [70, 46, 140] : null) });
    // cabeça com tentáculos oculares que balançam
    const [hx, hy] = pts[N]; frFur(s, hx + 0.5, hy + 0.5, 3, 2.8, { pal, seed: 90, fur: 0 });
    for (const [dx, lean] of [[-0.5, -1], [2, 1]]) { const sw = Math.sin(f * 1.3 + dx) * 0.8; seg(s, hx + dx, hy - 2, hx + dx + lean * 1.2 + sw, hy - 6.5, 1, pal[1]); shadeBall(s, hx + dx + lean * 1.3 + sw, hy - 7.2, 1.5, 1.5, (l) => [[255, 120, 210], [255, 190, 240], [255, 240, 252]][clamp(Math.floor(l * 3), 0, 2)]); }
    s.set(Math.round(hx + 2.4), Math.round(hy + 1), [20, 30, 50]);
  };
  frSpecies('lesma', { name: 'Lesma luminosa', biomes: [BIOME.FUNGAL, BIOME.SWAMP], hp: 8, speed: 14, w: 24, h: 10, drops: [[ITEM.GEL, 1, 2], [ITEM.GLOW_CAP, 0, 1]], color: '#58c8b4', glow: [140, 255, 220] },
    faunaHook({ paint, scare: 2.5, flee: 2, gaitDiv: 4, alwaysWalk: true, idleChance: 0.35, onUpdate: (m, dt) => { m.trailT = (m.trailT ?? 0) - dt; if (Math.abs(m.vx) > 1 && m.onGround && m.trailT <= 0 && game.particles.length < 380) { m.trailT = 0.28; game.particles.push({ x: m.cx - m.facing * 8, y: m.y + m.h - 2, vx: 0, vy: -3, life: 3.6, maxLife: 3.6, color: 'rgb(150,255,224)', w: 2, h: 1, gravity: 0 }); } } }), [36, 20], pal, 'slime');
}
// ---- Bulbo-esporo (hostil): fungo desengonçado que infla a cabeça e solta uma nuvem de esporos
{
  const paint = (s, p, f) => {
    const I = frInfo(f), ph = I.ph, g = 37, cx = 14, bob = I.walk ? Math.round(Math.abs(Math.sin(ph * 2)) * 1.4) : (I.idle === 1 ? 1 : 0), windup = f === 14, burst = f === 15;
    const swell = windup ? 1.28 : burst ? 0.84 : 1, sway = I.walk ? Math.sin(ph) * 1.2 : 0;
    // pernas curtas e troncudas
    for (const [hx, k, far] of [[cx - 3, 1, true], [cx + 3, 0, false]]) { const foot = I.walk ? frFoot(ph / FR_TAU + k * 0.5, hx, g, 5, 2.6) : [hx, g]; frLeg(s, hx, g - 11 - bob, foot[0], foot[1], { L1: 5, L2: 5, w1: 3.8, w2: 3, pal: FUNGAL_STEM, hoof: [80, 60, 100], paw: 3 }, far); }
    // braços moles balançando
    for (const [side, far] of [[-1, true], [1, false]]) { const sw = I.walk ? Math.sin(ph + (side > 0 ? 0 : Math.PI)) * 3 : (windup ? -2 : 0); seg(s, cx + side * 3.8, g - 18 - bob, cx + side * 6.5 + sw, g - 13 - bob, 2.2, far ? FUNGAL_STEM[0] : FUNGAL_STEM[1]); frFur(s, cx + side * 7 + sw, g - 12 - bob, 1.8, 1.8, { pal: FUNGAL_STEM, seed: 9, fur: 0 }); }
    // caule corcunda manchado de esporos e rosto de olhos acesos
    frFur(s, cx, g - 17 - bob, 5.8, 8, { pal: FUNGAL_STEM, seed: 6, fur: 0.5, belly: -0.06, pattern: (dx, dy) => (hash2(dx, dy, 5) > 0.9 ? [160, 120, 180] : null) });
    // cabeça-chapéu inchada
    const ccy = g - 26 - bob + (burst ? 2 : 0), rx = 11.6 * swell, ry = 8 * swell;
    for (let y = Math.floor(ccy - ry - 1); y <= ccy + 4; y++) for (let x = Math.floor(cx - rx - 1 + sway); x <= Math.ceil(cx + rx + 1 + sway); x++) {
      const nx = (x + 0.5 - cx - sway) / rx, ny = (y + 0.5 - ccy) / ry;
      if (ny > 0.5 || nx * nx + Math.min(ny, 0) ** 2 > 1) continue;
      if (ny > 0) { s.set(x, y, hash2(x, y, 7) > 0.6 ? [150, 110, 190] : [96, 60, 140]); continue; }
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)), l = clamp(-nx * 0.45 - ny * 0.62 + nz * 0.5, 0, 1);
      let c = FUNGAL_CAP[clamp(Math.floor(l * 5.1 + (BAYER4[(y & 3) * 4 + (x & 3)] / 16 - 0.5) * 0.7), 0, 4)];
      if (hash2(Math.round(nx * 9), Math.round(ny * 7), 4) > 0.9) c = [90, 230, 200];
      s.set(x, y, c);
    }
    for (const ex of [cx + 1.2, cx + 5]) { s.set(Math.round(ex + sway), g - 20 - bob, windup || burst ? [255, 120, 160] : [150, 255, 220]); s.set(Math.round(ex + sway), g - 19 - bob, windup || burst ? [255, 60, 110] : [60, 220, 190]); }
    if (burst) for (let i = 0; i < 34; i++) { const a = hash2(i, 3, 5) * FR_TAU, d = 6 + hash2(i, 4, 6) * 12; s.set(Math.round(cx + Math.cos(a) * d * 1.3), Math.round(ccy - 4 + Math.sin(a) * d * 0.8), i % 3 ? [150, 255, 224] : [230, 190, 255]); }
  };
  frSpecies('bulboesporo', { name: 'Bulbo-esporo', biome: BIOME.FUNGAL, hostile: true, monstro: true, hp: 28, speed: 26, damage: 6, w: 18, h: 30, drops: [[ITEM.GLOW_CAP, 1, 3], [ITEM.GEL, 0, 1], [ITEM.FIBER, 0, 2]], color: '#8a56ce', glow: [150, 255, 224] },
    faunaHook({ paint, sight: 10, chase: 1.2, gaitDiv: 3.6, heavy: true, atk: { kind: 'puff', reach: 4.2 * T, windup: 0.7, recover: 0.7, cd: 2.4, windFrame: 14, strikeFrame: 15 },
      puff: (m, p) => {
        const g = game;
        playSfx('slimeLand', m.cx, m.cy);
        for (let i = 0; i < 36 && g.particles.length < 420; i++) { const a = Math.random() * FR_TAU, v = 30 + Math.random() * 70; g.particles.push({ x: m.cx, y: m.cy - 8, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.6 - 20, life: 0.9 + Math.random() * 0.8, maxLife: 1.6, color: i & 1 ? 'rgb(150,255,224)' : 'rgb(230,190,255)', w: 2, h: 2, gravity: -10 }); }
        if (p.invulnerable <= 0 && Math.hypot(p.cx - m.cx, p.cy - m.cy) < 4.4 * T) damageMonsterPlayer(g, 9, m.cx);
      } }), [32, 38], FUNGAL_CAP, 'slime');
}

// ---------------------------------------------------------------- texto do bestiário
Object.assign(BESTIARY_LORE, {
  esquilo: 'Corre pelos galhos e pelo chão da floresta carregando bolotas. Quando para, levanta nas patas de trás e rói a sua com as mãozinhas.',
  raposaartico: 'Branca como a neve, só se denuncia pelo focinho escuro. Trota na tundra com o rabo enorme balançando.',
  zebra: 'As listras de cada uma são diferentes. Pastam em bando na savana e saem em disparada ao menor susto.',
  texugo: 'Parece mansinho, mas cava toca e briga por ela. Abaixa a cabeça, mostra os dentes e salta em quem chega perto.',
  fenec: 'A menor raposa do deserto, com orelhas gigantes que ouvem o que anda debaixo da areia.',
  suricato: 'Fica de pé, sentinela, vigiando o horizonte. Qualquer sombra grande o manda correndo para a toca.',
  coiote: 'Caça sozinho nos cânions e planaltos, rosnando antes de saltar. Magro, rápido e muito esperto.',
  jaguar: 'Pintas em forma de rosetas, mordida que quebra casco. Espera sobre os cipós e salta de surpresa.',
  macaco: 'Anda pelas copas e pelo chão da selva. Quando se acalma, senta e coça a cabeça.',
  caranguejo: 'Anda de lado pela areia da praia com as pinças erguidas e se enfia nas ondas quando se assusta.',
  sapo: 'Coaxa estufando a garganta nos brejos e salta para longe, fora do alcance. Estica a língua em qualquer inseto.',
  garca: 'Alta e paciente, pesca de pé em um pé só nos alagados. Seu bico é uma adaga.',
  lagarto: 'Ao se ver ameaçado abre uma gola enorme, cheia de listras vermelhas, para parecer maior.',
  tatu: 'Quando algo se aproxima, se enrola numa bola de placas e espera passar o perigo.',
  gaivota: 'Voa raso sobre as ondas gritando. Vem à praia procurar o que o mar deixou.',
  tucano: 'Bico enorme e colorido, penas negras e uma mancha vermelha na cauda. Voa de galho em galho.',
  cascavel: 'Chocalha o guizo antes de dar o bote. Ergue o pescoço em S e dispara a cabeça: afaste-se.',
  jacare: 'Imóvel como um tronco nas lagoas do pântano. Quando abre a boca, é tarde.',
  cogumelito: 'Um cogumelo que descobriu que tinha perninhas. Brilha de leve e foge dos curiosos.',
  lesma: 'Desliza devagar deixando um rastro luminoso. Os olhos acendem quando algo passa por perto.',
  bulboesporo: 'Um fungo que se levantou. Estufa o chapéu e solta uma nuvem de esporos que queima a pele.',
});
