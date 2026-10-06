'use strict';

// Fogo em pixel art pré-renderizado. Cada estilo tem forma e ritmo próprios, cada paleta um tom,
// e cada variação um ruído diferente: dois focos quase nunca ficam iguais.
// As animações dão a volta sem emenda e ficam em cache (estilo/paleta/variação/tamanho).
const FIRE_STYLES = {
  blaze: { w: 26, h: 34, spread: 0.55, grain: 7, bite: 1.05, fps: 13 },            // labareda larga e cheia
  tall:  { w: 16, h: 38, spread: 0.35, grain: 5, bite: 0.9, fps: 15 },             // chama alta e estreita (vazamento)
  lick:  { w: 14, h: 18, spread: 0.6, grain: 5, bite: 1.1, fps: 16 },              // foguinho baixo e nervoso
  pool:  { w: 40, h: 15, spread: 0.2, grain: 6, bite: 1.2, fps: 12, flat: true },  // poça de combustível
};
const FIRE_PALETTES = {
  warm: [[96, 22, 16], [170, 42, 20], [226, 88, 26], [255, 150, 44], [255, 214, 104], [255, 248, 212]],
  deep: [[66, 14, 20], [128, 26, 26], [192, 50, 28], [236, 104, 36], [255, 170, 70], [255, 226, 150]],
  hot:  [[124, 36, 18], [212, 82, 24], [255, 146, 40], [255, 204, 82], [255, 240, 164], [255, 255, 238]],
  fuel: [[96, 22, 16], [180, 50, 22], [236, 108, 30], [255, 170, 56], [255, 228, 130], [226, 242, 255]],
};
const FIRE_SIZES = [0.45, 0.6, 0.8, 1, 1.25, 1.55, 2, 2.5];
const FIRE_FRAMES = 12;
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const fireCache = new Map();

function fireFrames(style, pal, variant, size) {
  const key = `${style}|${pal}|${variant}|${size}`;
  if (fireCache.has(key)) return fireCache.get(key);
  const S = FIRE_STYLES[style], P = FIRE_PALETTES[pal], k = FIRE_SIZES[size];
  const W = Math.max(6, Math.round(S.w * k)), H = Math.max(7, Math.round(S.h * k));
  const seed = 7301 + variant * 131 + style.length * 17, PER = 8; // PER: o ruído sobe um período inteiro por volta
  const rnd = mulberry32(seed);
  // Línguas de fogo: cada uma nasce num ponto da base, tem altura e largura próprias e pulsa e
  // balança no seu ritmo (frequência inteira: a animação fecha a volta sem emenda). A do meio é
  // a mais alta. Juntas formam a chama; o ruído subindo rói as bordas e solta labaredinhas.
  const n = S.flat ? 7 : style === 'blaze' ? 5 : 3, mid = (n - 1) / 2;
  const tongues = Array.from({ length: n }, (_, i) => ({
    bx: (n === 1 ? 0 : (i / (n - 1)) * 2 - 1) * (S.flat ? 0.8 : style === 'tall' ? 0.3 : 0.5) + (rnd() - 0.5) * 0.12,
    h: S.flat ? 0.5 + rnd() * 0.5 : 1 - Math.abs(i - mid) / Math.max(1, mid) * (0.38 + rnd() * 0.12),
    w: (S.flat ? 0.24 : style === 'tall' ? 0.5 : 0.44) + rnd() * 0.12,
    ph: rnd(), sp: 1 + Math.floor(rnd() * 2), sw: (rnd() < 0.5 ? -1 : 1) * (0.12 + rnd() * 0.1),
  }));
  const frames = [];
  for (let f = 0; f < FIRE_FRAMES; f++) {
    const ph = f / FIRE_FRAMES, s = new Sprite(W, H);
    for (let y = 0; y < H; y++) {
      const v = (H - y - 0.5) / H; // 0 na base, 1 no topo
      for (let x = 0; x < W; x++) {
        const u = ((x + 0.5) / W - 0.5) * 2;
        let I = 0;
        for (const t of tongues) {
          const a = (ph * t.sp + t.ph) * Math.PI * 2, h = t.h * (0.8 + 0.2 * Math.sin(a));
          if (v > h * 1.1) continue;
          const q = Math.min(1, v / h);
          const xc = t.bx * (1 - q * 0.4) + Math.sin(a + q * 3.6) * t.sw * q * q * (S.flat ? 0.5 : 1);
          const half = t.w * Math.pow(1 - q, 0.7) + 0.02;
          const d = Math.abs(u - xc) / half;
          if (d > 1.2) continue;
          I = Math.max(I, (1.15 - d) * (1 - q * 0.45));
        }
        // ruído subindo: rói as bordas e abre buracos; labaredinhas soltas acima das línguas
        const nz = pfbm2((x + 0.5) / k / S.grain, (y + 0.5) / k / S.grain + ph * PER, PER, seed, 3);
        I -= (nz - 0.5) * S.bite * (0.35 + v * 0.9);
        if (I < 0.1 && v > 0.45 && !S.flat) {
          const fl = pfbm2((x + 0.5) / k / (S.grain * 0.7) + 3.1, (y + 0.5) / k / (S.grain * 0.7) + ph * PER * 2, PER, seed + 9, 2);
          const lane = Math.max(0, 1 - Math.abs(u) * 1.6);
          if (fl > 0.8 - lane * 0.05) I = 0.42 + (fl - 0.8) * 3; // labaredinha solta: pequena e acesa
        }
        I += (BAYER4[(y & 3) * 4 + (x & 3)] / 16 - 0.5) * 0.08;
        if (I < 0.12 + Math.max(0, v - 0.4) * 0.45) continue; // lá em cima só sobra o que ainda está aceso
        let lvl = Math.min(4, Math.floor((I - 0.12) * 4.4));
        if (v > 0.7 && lvl > 1) lvl--;                                     // pontas mais vermelhas
        if ((u / 0.28) ** 2 + (v / 0.24) ** 2 < 1 && I > 0.92) lvl = 5;     // miolo quase branco, só na base
        let c = P[lvl];
        if (pal === 'fuel' && v < 0.18 && I > 0.62) c = v < 0.08 && I > 0.85 ? [170, 220, 255] : [92, 140, 236]; // base azulada do querosene
        s.set(x, y, c);
      }
    }
    frames.push(s.finish(null));
  }
  fireCache.set(key, frames);
  return frames;
}

function fireSize(scale) {
  let best = 0;
  for (let i = 1; i < FIRE_SIZES.length; i++) if (Math.abs(FIRE_SIZES[i] - scale) < Math.abs(FIRE_SIZES[best] - scale)) best = i;
  return best;
}

// Chama com a base em (f.x, f.y). f: { style, pal, variant, tempo, seed, flip }
function drawFire(ctx, f, scale, t) {
  const img = fireFrames(f.style, f.pal, f.variant, fireSize(scale))[Math.floor(t * FIRE_STYLES[f.style].fps * f.tempo + f.seed * 5) % FIRE_FRAMES];
  const x = Math.round(f.x - img.width / 2), y = Math.round(f.y - img.height + 2);
  if (!f.flip) { ctx.drawImage(img, x, y); return; }
  ctx.save(); ctx.translate(x + img.width, y); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0); ctx.restore();
}

// Aparência sorteada para um foco de fogo (prefer força o estilo)
function fireLook(rnd, s, prefer) {
  const style = prefer || (s >= 1.1 ? 'blaze' : s < 0.75 ? (rnd() < 0.55 ? 'lick' : 'tall') : ['blaze', 'tall', 'lick'][Math.floor(rnd() * 3)]);
  const pals = ['warm', 'warm', 'deep', 'hot'];
  return { style, pal: pals[Math.floor(rnd() * pals.length)], variant: Math.floor(rnd() * 4), tempo: 0.85 + rnd() * 0.35, flip: rnd() < 0.5 };
}
