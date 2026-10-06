'use strict';

// Gerador pseudo-aleatório com semente (determinístico)
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Hash 2D -> [0, 1)
function hash2(x, y, seed) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (t) => t * t * (3 - 2 * t);

// Value noise 1D -> [-1, 1]
function noise1(x, seed) {
  const i = Math.floor(x);
  const f = x - i;
  return lerp(hash2(i, 0, seed), hash2(i + 1, 0, seed), smoothstep(f)) * 2 - 1;
}

// Value noise 2D -> [0, 1]
function noise2(x, y, seed) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = smoothstep(x - ix), fy = smoothstep(y - iy);
  const a = hash2(ix, iy, seed), b = hash2(ix + 1, iy, seed);
  const c = hash2(ix, iy + 1, seed), d = hash2(ix + 1, iy + 1, seed);
  return lerp(lerp(a, b, fx), lerp(c, d, fx), fy);
}

// Ruído fractal 2D -> [0, 1]
function fbm2(x, y, seed, octaves) {
  let sum = 0, amp = 0.5, freq = 1, norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += noise2(x * freq, y * freq, seed + i * 101) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

const wrap = (v, p) => ((v % p) + p) % p;

// Ruído 2D periódico (repete a cada `period` unidades) -> [0, 1]
function pnoise2(x, y, period, seed) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = smoothstep(x - ix), fy = smoothstep(y - iy);
  const x0 = wrap(ix, period), x1 = wrap(ix + 1, period);
  const y0 = wrap(iy, period), y1 = wrap(iy + 1, period);
  const a = hash2(x0, y0, seed), b = hash2(x1, y0, seed);
  const c = hash2(x0, y1, seed), d = hash2(x1, y1, seed);
  return lerp(lerp(a, b, fx), lerp(c, d, fx), fy);
}

function pfbm2(x, y, period, seed, octaves) {
  let sum = 0, amp = 0.5, freq = 1, norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += pnoise2(x * freq, y * freq, period * freq, seed + i * 101) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

// Ruído 1D periódico -> [0, 1]
function pnoise1(x, period, seed) {
  const i = Math.floor(x);
  return lerp(hash2(wrap(i, period), 0, seed), hash2(wrap(i + 1, period), 0, seed), smoothstep(x - i));
}

const shade = (c, k) => [c[0] * k, c[1] * k, c[2] * k];

function lerpColor(a, b, t) {
  return [lerp(a[0], b[0], t) | 0, lerp(a[1], b[1], t) | 0, lerp(a[2], b[2], t) | 0];
}

const rgb = (c) => `rgb(${c[0]},${c[1]},${c[2]})`;
