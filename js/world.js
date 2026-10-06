'use strict';

const OPACITY = new Uint8Array(256), LIGHT_EMIT = new Uint8Array(256);
TILE_DEFS.forEach((d, t) => { if (d) { OPACITY[t] = d.opacity; LIGHT_EMIT[t] = d.light; } });
// 256 casas: blocos definidos depois (teia grossa, rocha endurecida, portão...) entram por buildFlatTiles
const SOLID = new Uint8Array(256);
TILE_DEFS.forEach((d, t) => { SOLID[t] = d && d.solid ? 1 : 0; });

const BIOME = { FOREST: 0, DESERT: 1, SNOW: 2, JUNGLE: 3, SAVANNA: 4, OCEAN: 5, SAKURA: 6, SWAMP: 7, MESA: 8, FUNGAL: 9 };
const BIOME_NAMES = ['Floresta', 'Deserto', 'Tundra', 'Selva', 'Savana', 'Oceano', 'Vale das Cerejeiras', 'Pântano', 'Mesa Vermelha', 'Bosque Luminoso'];
// amp = altura dos morros; freq = largura deles
const BIOME_TERRAIN = [{ amp: 7, freq: 0.03 }, { amp: 4, freq: 0.018 }, { amp: 14, freq: 0.035 }, { amp: 10, freq: 0.045 }, { amp: 5, freq: 0.02 }, { amp: 3, freq: 0.02 }, {amp:5,freq:.023}, { amp: 3.5, freq: 0.026 }, { amp: 9, freq: 0.014 }, { amp: 6, freq: 0.028 }];
// Cordilheiras: por cima dos morros de sempre entra um ruído de crista numa escala bem
// maior, que de vez em quando levanta uma serra de verdade. `alt` é a altura do cume em
// blocos e `chance` é quanto do bioma vira montanha (o mar não tem nenhuma).
const BIOME_MOUNTAIN = [
  { alt: 30, chance: .58 },  // floresta
  { alt: 12, chance: .3 },   // deserto
  { alt: 44, chance: .8 },   // neve
  { alt: 26, chance: .5 },   // selva
  { alt: 16, chance: .35 },  // savana
  { alt: 0, chance: 0 },     // oceano
  { alt: 22, chance: .45 },  // cerejeiras
  { alt: 7, chance: .25 },   // pântano (só colinas baixas)
  { alt: 0, chance: 0 },     // mesa: os degraus do próprio relevo já são a serra
  { alt: 20, chance: .4 },   // bosque luminoso
];
// Biomas novos (js/biomes-plus.js preenche): solo, camadas, relevo e árvores de cada um.
//   top/fill = bloco de cima e de baixo; soil = [mín, variação] de espessura; layer(depth, x, seed) = bloco por profundidade;
//   shape(s, x, world) = ajusta a altura do relevo; treeGap = [mín, variação] entre árvores; treeGround = quem aceita árvore
const BIOME_EXTRA = {};
// Pântano, mesa, bosque luminoso, lagoas, pedras e a mistura nas divisas só entram em mundos de verdade (as predefinições
// pequeno/médio/grande têm 4200+ de largura); mundinhos de teste e de menu continuam idênticos ao que sempre foram.
const NEW_BIOMES_MIN_W = 3000;
// Perfil do solo de um bioma numa coluna: espessura da terra, bloco de enchimento, crosta de gelo e arenito.
const BIOME_BLEND_R = 28;
function soilProfile(world, x, b, r, rocky) {
  const ex = BIOME_EXTRA[b], sandy = b === BIOME.DESERT || b === BIOME.OCEAN;
  const soil = rocky ? 1 + Math.floor(r * 2)
    : ex ? ex.soil[0] + Math.floor(r * ex.soil[1])
    : sandy ? 10 + Math.floor(r * 6) : b === BIOME.JUNGLE ? 14 + Math.floor(r * 8) : b === BIOME.SNOW ? 6 + Math.floor(r * 4) : 5 + Math.floor((noise1(x * 0.2, world.seed + 3) + 1) * 2);
  const fill = ex ? ex.fill : sandy ? TILE.SAND : b === BIOME.SNOW ? TILE.SNOW : b === BIOME.JUNGLE ? TILE.MUD : TILE.DIRT;
  // A neve repousa numa crosta estável de gelo, como areia sobre arenito.
  return { soil, fill, ex, sandstone: b === BIOME.DESERT ? 25 + Math.floor(r * 15) : b === BIOME.OCEAN ? 8 + Math.floor(r * 6) : 0, iceCrust: b === BIOME.SNOW ? 12 + Math.floor(r * 8) : 0 };
}
// Bioma diferente mais próximo (e a distância em colunas), ou null se não há nenhum dentro do raio
function nearestOtherBiome(world, x, R) {
  const b = world.biome[x];
  for (let d = 1; d <= R; d++) for (const nx of [x - d, x + d]) { if (nx < 0 || nx >= world.w) continue; const nb = world.biome[nx]; if (nb !== b && nb !== BIOME.OCEAN) return { b: nb, d }; }
  return null;
}
// Bloco de cima de cada bioma e a mistura nas divisas: perto do vizinho, parte dos blocos de superfície já usa a
// cobertura dele (grama virando grama seca, terra virando areia...), então a mudança de bioma não é uma linha reta.
function biomeTop(b) {
  if (BIOME_EXTRA[b]) return BIOME_EXTRA[b].top;
  return b === BIOME.DESERT || b === BIOME.OCEAN ? TILE.SAND : b === BIOME.SNOW ? TILE.SNOW : b === BIOME.JUNGLE ? TILE.JUNGLE_GRASS
    : b === BIOME.SAVANNA ? TILE.DRY_GRASS : b === BIOME.SAKURA ? TILE.SAKURA_GRASS : TILE.GRASS;
}
function ecotoneTop(world, x) {
  const b = world.biome[x], own = biomeTop(b);
  if (b === BIOME.OCEAN || b === BIOME.SNOW || world.w < NEW_BIOMES_MIN_W) return own;
  for (let d = 1; d <= 9; d++)
    for (const nx of [x - d, x + d]) {
      if (nx < 0 || nx >= world.w) continue;
      const nb = world.biome[nx];
      if (nb === b) continue;
      if (nb === BIOME.OCEAN || nb === BIOME.SNOW) return own;
      return hash2(x, 3, world.seed + 4401) < 0.55 * (1 - (d - 1) / 9) ? biomeTop(nb) : own;
    }
  return own;
}
// Altura da serra na coluna x, em blocos acima do relevo normal. O pico fica onde o
// ruído de crista passa por zero; a máscara de região decide quais trechos viram serra.
function mountainAt(world, x) {
  let m = BIOME_MOUNTAIN[world.biome[x]] || BIOME_MOUNTAIN[0];
  if (world.w >= NEW_BIOMES_MIN_W) {                                      // a serra sobe e desce aos poucos na divisa, sem paredão
    let alt = 0, chance = 0, n = 0;
    for (let k = -32; k <= 32; k += 4) { const e = BIOME_MOUNTAIN[world.biome[clamp(x + k, 0, world.w - 1)]] || BIOME_MOUNTAIN[0]; alt += e.alt; chance += e.chance; n++; }
    m = { alt: alt / n, chance: chance / n };
    if (world.biome[x] === BIOME.OCEAN) return 0;                        // o mar nunca tem serra
    if (BIOME_MOUNTAIN[world.biome[x]]?.alt === 0) m = { alt: m.alt * 0.5, chance: m.chance };   // mesa: só a ponta da serra do vizinho chega
  }
  if (!m.alt) return 0;
  const region = noise1(x * 0.0026, world.seed + 421) * .5 + .5;
  const mask = smoothstep(clamp((region - (1 - m.chance)) * 3.4, 0, 1));
  if (mask <= 0) return 0;
  const ridge = 1 - Math.abs(noise1(x * 0.0072, world.seed + 611));
  const peak = Math.pow(Math.max(0, ridge - .34) / .66, 1.5);
  return peak * m.alt * mask + (peak > .12 ? noise1(x * .09, world.seed + 77) * 2 * peak : 0);
}

// A luz só é calculada numa janela em volta da câmera (mundos gigantes não cabem inteiros)
const LIGHT_W = 256, LIGHT_H = 160;
// Luz mínima dentro das ilhas do céu (js/sky-world.js): a pedra fica na penumbra, não no breu
const SKY_BAND_GLOW = 14;

class World {
  // lazy = true: não gera agora (use generateAsync para mostrar o progresso)
  constructor(w, h, seed, { lazy = false } = {}) {
    this.w = w;
    this.h = h;
    this.seed = seed;
    const n = w * h;
    this.tiles = new Uint8Array(n);
    this.walls = new Uint8Array(n);
    this.surface = new Int16Array(w);
    this.biome = new Uint8Array(w);
    this.skyTop = new Int32Array(w); // primeira linha de cada coluna que bloqueia o céu
    // Arquipélago (js/sky-world.js): embaixo de uma ilha flutuante o sol volta a bater. skyFloor é a
    // última linha da faixa do céu em cada coluna (null = mundo sem ilhas); o vão iluminado vai de
    // skyGapTop (logo abaixo da ilha) até skyGapBottom (o chão de verdade).
    this.skyFloor = null;
    this.skyGapTop = new Int32Array(w);
    this.skyGapBottom = new Int32Array(w);
    // Água numa camada própria (0 = seca, 1..WATER_MAX = nível, WATER_FALL = cachoeira), js/water.js
    this.water = new Uint8Array(n);
    this.waterActive = new Set(); // células que ainda podem escorrer
    this.rivers = [];
    this.oceanStart = w; this.seaLevel = 0;
    this.skyLight = new Uint8Array(LIGHT_W * LIGHT_H);
    this.blockLight = new Uint8Array(LIGHT_W * LIGHT_H);
    this.lx = 0; this.ly = 0; this.lcx = w / 2; this.lcy = h * 0.32;
    this.lightDirty = true;
    this.lightRevision = 0;
    this.treeRevision = 0; // só muda quando tronco/toco muda: a sombra das copas depende disso
    this.decorCut = new Map();   // enfeite colhido -> quando volta a nascer (js/environment.js)
    this.decorCache = new Map(); // sorteio do enfeite por célula, refeito quando a luz muda
    this.decorRevision = -1;
    this.touched = new Set();    // células que o jogador (ou o jogo) mudou depois de gerar o mundo

    // 1 pixel por tile da janela de luz; desenhado ampliado com suavização
    this.lightCanvas = makeCanvas(LIGHT_W, LIGHT_H);
    this.lightCtx = this.lightCanvas.getContext('2d');
    this.lightImage = this.lightCtx.createImageData(LIGHT_W, LIGHT_H);

    if (!lazy) this.generate();
  }

  inBounds(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }

  getTile(x, y) {
    if (y < 0) return TILE.AIR;
    if (x < 0 || x >= this.w || y >= this.h) return TILE.BEDROCK;
    return this.tiles[y * this.w + x];
  }

  getWall(x, y) {
    if (!this.inBounds(x, y)) return WALL.NONE;
    return this.walls[y * this.w + x];
  }

  setTile(x, y, t) {
    if (!this.inBounds(x, y)) return;
    const before = this.tiles[y * this.w + x];
    // Só a troca de madeira muda a sombra das copas (js/shaders.js); minerar terra não.
    if (before !== t && (before === TILE.TRUNK || before === TILE.STUMP || t === TILE.TRUNK || t === TILE.STUMP)) this.treeRevision++;
    this.tiles[y * this.w + x] = t;
    // Célula mexida depois da geração: enfeite (cristal, cogumelo, mato...) não nasce mais nela
    // nem em cima dela (js/environment.js). A geração só acontece uma vez.
    if (this.generated && before !== t) this.touched.add(y * this.w + x);
    if (SOLID[t] && this.water[y * this.w + x]) this.clearWater(x, y); // bloco colocado na água a empurra para fora
    this.wakeWater(x, y); // um vizinho abriu ou fechou: a água em volta volta a escorrer
    this.skyChanged(x, y);
    this.lightDirty = true;
    if (this.generated && before !== t && typeof wakeFallingBlocks === 'function') wakeFallingBlocks(this, x, y);
    if (this.onTileChange) this.onTileChange(x, y);
  }

  // Camada de fundo: tapa o céu dentro da casa e serve de apoio para tochas e blocos
  setWall(x, y, wall) {
    if (!this.inBounds(x, y)) return;
    this.walls[y * this.w + x] = wall;
    this.skyChanged(x, y);
    this.lightDirty = true;
    if (this.onTileChange) this.onTileChange(x, y);
  }

  isSolid(x, y) { return SOLID[this.getTile(x, y)] === 1; }
  biomeAt(x) { return this.biome[clamp(x | 0, 0, this.w - 1)]; }
  isSkyExposed(x, y) { return x >= 0 && x < this.w && (y < this.skyTop[x] || (y >= this.skyGapTop[x] && y < this.skyGapBottom[x])); }
  // Céu aberto de verdade, sem contar o vão embaixo das ilhas flutuantes (chuva, por exemplo)
  isOpenSky(x, y) { return x >= 0 && x < this.w && y < this.skyTop[x]; }
  // Primeira linha que segura a luz no chão: embaixo de uma ilha, é o fim do vão iluminado
  groundTop(x) { x = clamp(x | 0, 0, this.w - 1); return this.skyGapBottom[x] > this.skyGapTop[x] ? this.skyGapBottom[x] : this.skyTop[x]; }

  // Um bloco ou parede mudou em (x, y): refaz o topo do céu e o vão embaixo da ilha se precisar
  skyChanged(x, y) {
    if (y <= this.skyTop[x]) this.computeSkyTop(x, Math.min(y, this.skyTop[x]));
    else if (this.skyFloor && y <= Math.max(this.skyFloor[x], this.skyGapBottom[x])) this.computeSkyGap(x);
  }

  // Tudo acima de `from` já é conhecido como céu aberto
  computeSkyTop(x, from = 0) {
    const { w, h, tiles, walls } = this;
    let y = from;
    while (y < h && walls[y * w + x] === WALL.NONE && OPACITY[tiles[y * w + x]] <= 1) y++;
    this.skyTop[x] = y;
    this.computeSkyGap(x);
  }

  // Coluna tapada por uma ilha do céu: acha o vão aberto que vai da barriga da ilha até o chão
  computeSkyGap(x) {
    const { w, h, tiles, walls, skyFloor } = this;
    const open = (y) => walls[y * w + x] === WALL.NONE && OPACITY[tiles[y * w + x]] <= 1;
    this.skyGapTop[x] = this.skyGapBottom[x] = 0;
    if (!skyFloor) return;
    const f = skyFloor[x];
    if (this.skyTop[x] > f || !open(f)) return;
    let top = f, bottom = f;
    while (top - 1 > this.skyTop[x] && open(top - 1)) top--;
    while (bottom < h && open(bottom)) bottom++;
    this.skyGapTop[x] = top; this.skyGapBottom[x] = bottom;
  }

  // ---------- Geração do mundo ----------
  generate() { for (const _ of this.generateSteps()); }

  // Gera em pedaços, devolvendo o controle ao navegador para a tela de progresso ser desenhada
  async generateAsync(onProgress) {
    let t0 = performance.now();
    for (const [p, label] of this.generateSteps()) {
      if (performance.now() - t0 < 40) continue;
      onProgress?.(p, label);
      await new Promise((r) => setTimeout(r, 0));
      t0 = performance.now();
    }
    onProgress?.(1, 'Pronto');
  }

  *generateSteps() {
    const { w, h, seed, tiles, walls, surface, biome } = this;
    const rnd = mulberry32(seed);
    const baseY = Math.floor(h * 0.32);
    const set = (x, y, t) => { if (this.inBounds(x, y)) tiles[y * w + x] = t; };

    // 1. Biomas em faixas; a faixa do meio (onde o avião cai) é sempre floresta
    const zones = [];
    for (let x = 0; x < w;) {
      const width = Math.round(Math.max(60, w * (0.05 + rnd() * 0.07)));
      zones.push([x, Math.min(w, x + width)]);
      x += width;
    }
    let prev = -1;
    // O canto direito do mapa é sempre oceano (menos no mundinho do menu)
    const oceanStart = w >= 1000 ? w - Math.max(240, Math.floor(w * 0.1)) : w;
    for (const [a, b] of zones) {
      let kind = BIOME.FOREST;
      if (!(a <= w / 2 + 40 && b >= w / 2 - 40)) {
        const options = [BIOME.FOREST, BIOME.DESERT, BIOME.SNOW, BIOME.JUNGLE, BIOME.SAVANNA, BIOME.SAKURA, ...(NEW_BIOMES_MIN_W <= w ? [BIOME.SWAMP, BIOME.MESA, BIOME.FUNGAL] : [])].filter((k) => k !== prev);
        kind = options[Math.floor(rnd() * options.length)];
      }
      biome.fill(kind, a, b);
      prev = kind;
    }
    biome.fill(BIOME.OCEAN, oceanStart, w);
    this.oceanStart = oceanStart;
    this.seaLevel = baseY + 2;
    // Sempre existe pelo menos uma savana (é onde mora o Tigre da Savana)
    if (!biome.includes(BIOME.SAVANNA)) {
      const far = zones.filter(([a, b]) => !(a <= w / 2 + 40 && b >= w / 2 - 40) && b <= oceanStart);
      if(far.length){const [a,b]=far[Math.floor(rnd()*far.length)];biome.fill(BIOME.SAVANNA,a,b);}
    }
    // Reserve a grove without replacing the starting forest, ocean or required savanna.
    if(!biome.includes(BIOME.SAKURA)){
      const far=zones.filter(([a,b])=>!(a<=w/2+40&&b>=w/2-40)&&b<=oceanStart&&biome[a]!==BIOME.SAVANNA);
      if(far.length){const [a,b]=far[Math.floor(rnd()*far.length)];biome.fill(BIOME.SAKURA,a,b);}
    }
    // Pântano, mesa e bosque luminoso: cada mundo grande tem pelo menos um de cada, sem tomar o lugar dos outros reservados
    for (const kind of NEW_BIOMES_MIN_W <= w ? [BIOME.SWAMP, BIOME.MESA, BIOME.FUNGAL] : []) {
      if (biome.includes(kind)) continue;
      const keep = [BIOME.SAVANNA, BIOME.SAKURA, BIOME.SWAMP, BIOME.MESA, BIOME.FUNGAL];
      const far = zones.filter(([a, b]) => !(a <= w / 2 + 40 && b >= w / 2 - 40) && b <= oceanStart && !keep.includes(biome[a]));
      if (far.length) { const [a, b] = far[Math.floor(rnd() * far.length)]; biome.fill(kind, a, b); }
    }
    yield [0.02, 'Separando os biomas'];

    // 2. Relevo (altura e largura dos morros suavizadas entre biomas) e camadas
    let amp = BIOME_TERRAIN[biome[0]].amp, freq = BIOME_TERRAIN[biome[0]].freq, phase = 0;
    for (let x = 0; x < w; x++) {
      const bt = BIOME_TERRAIN[biome[x]];
      amp += (bt.amp - amp) * 0.04; freq += (bt.freq - freq) * 0.04; phase += freq;
      let s = Math.floor(baseY + noise1(phase, seed) * amp + noise1(x * 0.11, seed + 7) * 2.5 * (amp / 7));
      // A serra sobe por cima do relevo do bioma; o cume nunca encosta no teto do mundo
      const peak = mountainAt(this, x);
      if (peak > 0) s = Math.max(5, s - Math.round(peak));
      const ex = BIOME_EXTRA[biome[x]];
      if (this.w < NEW_BIOMES_MIN_W) { if (ex?.shape) s = ex.shape(s, x, this); }
      else {                                                                  // os degraus da mesa entram aos poucos, sem paredão na divisa
        let near = 0, shapeFn = null;
        for (let k = -14; k <= 14; k++) { const e2 = BIOME_EXTRA[biome[clamp(x + k, 0, w - 1)]]; if (e2?.shape) { near++; shapeFn ??= e2.shape; } }
        if (near) s = Math.round(lerp(s, shapeFn(s, x, this), near / 29));
      }
      if (biome[x] === BIOME.OCEAN) s = oceanFloorAt(this, x, s); // praia descendo até o fundo do mar (js/water-gen.js)
      surface[x] = s;
      const b = biome[x], r = hash2(x, 0, seed);
      // Em cima da serra a terra é fina e a rocha aparece; do meio para cima já é pedra nua
      const rocky = peak > 11 && b !== BIOME.SNOW && b !== BIOME.OCEAN;
      const own = soilProfile(this, x, b, r, rocky), top = rocky ? TILE.STONE : ecotoneTop(this, x);
      // Perto da divisa de um bioma o subsolo mistura a camada do vizinho em manchas (ruído), cada vez mais raras com a
      // distância: em vez de um corte vertical reto, a argila, a areia ou o gelo "entram" na terra e na pedra do outro lado.
      const other = this.w >= NEW_BIOMES_MIN_W && b !== BIOME.OCEAN ? nearestOtherBiome(this, x, BIOME_BLEND_R) : null;
      const alt = other ? soilProfile(this, x, other.b, r, rocky) : null, pAlt = other ? 0.5 * Math.pow(1 - other.d / BIOME_BLEND_R, 1.2) : 0;
      for (let y = s; y < h; y++) {
        const i = y * w + x;
        const pr = alt && y > s && fbm2(x * 0.1, y * 0.13, seed + 909, 2) < 0.5 + (pAlt - 0.5) * 0.5 ? alt : own;
        tiles[i] = y === s ? top : y < s + pr.soil ? pr.fill
          : y < s + pr.soil + pr.iceCrust ? TILE.ICE
          : y < s + pr.soil + pr.sandstone ? TILE.SANDSTONE : TILE.STONE;
        if (pr.ex?.layer && y > s) { const L = pr.ex.layer(y - s, x, seed, pr.soil, y); if (L) tiles[i] = L; }
        if (y > s) walls[i] = y < s + pr.soil ? WALL.DIRT : WALL.STONE;
      }
      if ((x & 255) === 0) yield [0.02 + 0.13 * (x / w), 'Erguendo montanhas'];
    }

    // 3. Bolsões (terra, gelo, lama, areia) e cavernas, mais largas no fundo
    for (let y = 0; y < h - 3; y++) {
      const deep = y / h;
      for (let x = 0; x < w; x++) {
        const s = surface[x];
        if (y <= s + 2) continue;
        const i = y * w + x, t = tiles[i], b = biome[x];
        if (b === BIOME.OCEAN && y < s + 18) continue; // fundo do mar grosso: caverna ali vazaria a água
        if (y > s + 8) {
          const worm = Math.abs(fbm2(x * 0.035, y * 0.05, seed + 80, 2) - 0.5);
          // Túnel, veia larga, ou um SALÃO do fundo (js/underground.js): quanto mais fundo,
          // menos corredor e mais caverna aberta.
          if (worm < 0.03 || fbm2(x * 0.07, y * 0.09, seed + 50, 3) > 0.64 - deep * 0.06 || undergroundHall(this, x, y)) { tiles[i] = TILE.AIR; continue; }
        }
        if ((t === TILE.STONE || t === TILE.SANDSTONE) && fbm2(x * 0.15, y * 0.15, seed + 20, 2) > 0.68)
          tiles[i] = b === BIOME.SNOW ? TILE.ICE : b === BIOME.JUNGLE ? TILE.MUD : b === BIOME.DESERT ? TILE.SAND : TILE.DIRT;
        else if (t === TILE.DIRT && fbm2(x * 0.2, y * 0.2, seed + 40, 2) > 0.72) tiles[i] = TILE.SAND;
      }
      if ((y & 15) === 0) yield [0.15 + 0.7 * (y / h), 'Cavando cavernas'];
    }

    // 3a. Bocas de caverna: caminho aberto da superfície até o subsolo (js/underground.js)
    carveCaveEntrances(this, rnd);
    yield [0.86, 'Abrindo as grutas'];

    const get = (x, y) => this.getTile(x, y);

    // 3b. Regiões de caverna: rocha, drusa, cogumelo e gelo de cada mancha (js/underground.js)
    yield* paintUnderground(this, rnd);

    // 4. Minérios, cada um na sua faixa de profundidade (js/underground.js)
    yield* spreadOres(this, rnd);

    // 5. Rocha matriz
    for (let x = 0; x < w; x++) {
      const depth = 2 + Math.floor(rnd() * 2);
      for (let y = h - depth; y < h; y++) set(x, y, TILE.BEDROCK);
    }

    // 5b. Oceano, rios, cachoeiras e as plantas da água (js/water-gen.js)
    yield* generateWater(this, rnd);

    // 6. Árvores conforme o bioma; cactos no deserto
    for (let x = 3; x < w - 3;) {
      const b = biome[x], s = surface[x];
      const xt = BIOME_EXTRA[b];
      x += xt?.treeGap ? xt.treeGap[0] + Math.floor(rnd() * xt.treeGap[1]) : xt ? 40 : b === BIOME.JUNGLE ? 3 + Math.floor(rnd() * 4) : b === BIOME.DESERT ? 8 + Math.floor(rnd() * 14) : b === BIOME.SAVANNA ? 12 + Math.floor(rnd() * 16) : 5 + Math.floor(rnd() * 7);
      if (x >= w - 3) break;
      const ground = get(x, surface[x]);
      if (BIOME_EXTRA[biome[x]]) {
        const e2 = BIOME_EXTRA[biome[x]];
        if (!e2.treeGap || !e2.treeGround.includes(ground) || this.water[(surface[x] - 1) * w + x]) continue;
        const height = e2.treeHeight[0] + Math.floor(rnd() * e2.treeHeight[1]);
        for (let i = 1; i <= height; i++) set(x, surface[x] - i, TILE.TRUNK);
        continue;
      }
      if (biome[x] === BIOME.DESERT) {
        if (ground !== TILE.SAND) continue;
        const height = 2 + Math.floor(rnd() * 4);
        for (let i = 1; i <= height; i++) set(x, surface[x] - i, TILE.CACTUS);
        continue;
      }
      // Coqueiros na areia seca da praia
      if (biome[x] === BIOME.OCEAN) {
        if (ground !== TILE.SAND || surface[x] >= this.seaLevel || this.water[(surface[x] - 1) * w + x] || rnd() < 0.4) continue;
        const height = 5 + Math.floor(rnd() * 4);
        for (let i = 1; i <= height; i++) set(x, surface[x] - i, TILE.TRUNK);
        continue;
      }
      if (ground !== TILE.GRASS && ground !== TILE.JUNGLE_GRASS && ground !== TILE.SNOW && ground !== TILE.DRY_GRASS && ground!==TILE.SAKURA_GRASS) continue;
      const height = biome[x] === BIOME.SAVANNA ? 4 + Math.floor(rnd() * 3) : biome[x] === BIOME.JUNGLE ? 8 + Math.floor(rnd() * 7) : 5 + Math.floor(rnd() * 5);
      // A copa é um sprite desenhado pelo renderer em cima do último tronco
      for (let i = 1; i <= height; i++) set(x, surface[x] - i, TILE.TRUNK);
    }
    yield [0.97, 'Plantando árvores'];
    // Pedras, troncos caídos, pilares e outros detalhes de cada bioma (js/biomes-plus.js)
    if (typeof generateBiomeFeatures === 'function' && this.w >= NEW_BIOMES_MIN_W) yield* generateBiomeFeatures(this, rnd);


    // 7. Estruturas: vilas, cabanas abandonadas, minas, ruínas e acampamentos (js/structures.js)
    this.lootChests = [];
    this.npcSpawns = [];
    this.tigerDens = [];
    this.tigerArena = null; // a única arena do tigre (js/structures.js)
    this.bearLairs = []; // covis selados do Patriarca (js/bear.js)
    this.spiderNests = []; // mina abandonada da Fiandeira (js/spider-boss.js)
    this.beetleLairs = []; // covil do Casco de Ferro (js/beetle-boss.js)
    // Coração da Ilha: a faixa do fundo do mundo, de ponta a ponta (js/core-world.js)
    yield* generateCore(this, rnd);
    // Arquipélago dos Vigias: ilhas flutuando no alto, de ponta a ponta (js/sky-world.js)
    yield* generateSky(this);
    yield* generateStructures(this, rnd);
    yield* generateCavePools(this, rnd); // poças e lagos nas cavernas (js/water-gen.js)
    sealWater(this); // tapa qualquer furo por onde rios e mar escorreriam
    reopenBearShafts(this); // o poço do covil do urso não pode ficar entupido (js/structures.js)
    reopenSpiderShafts(this); // nem o poço da mina da Fiandeira (js/spider-boss.js)
    reopenBeetleStairs(this); // e a escadaria do covil do deserto (js/beetle-boss.js)
    sealHardCaverns(this, rnd); // cavernas fechadas por rocha endurecida (js/beetle-loot.js)
    finalizeCore(this); // nada de água parada no Coração (js/core-world.js)
    finalizeSky(this); // limpeza final das ilhas; vento depende de construção (js/wind-altars.js)
    this.freezeSnowBase(); // mantém uma crosta sob as bordas de neve recortadas pelas grutas

    for (let x = 0; x < w; x++) this.computeSkyTop(x);
    this.lightDirty = true;
    this.generated = true; // daqui em diante setTile anota o que o jogador mexeu (touched)
    yield [1, 'Pronto'];
  }

  // Depois dos recortes da geração, cobre o fundo natural de cada coluna de neve.
  // Peças de estruturas são preservadas; essa etapa nunca roda durante a construção.
  freezeSnowBase() {
    const { w, h, tiles, biome, water } = this;
    for (let x = 0; x < w; x++) {
      if (biome[x] !== BIOME.SNOW) continue;
      for (let y = 0; y < h - 1; y++) {
        const i = y * w + x;
        if (tiles[i] !== TILE.SNOW) continue;
        const below = i + w, tile = tiles[below];
        if (tile === TILE.AIR || tile === TILE.STONE || tile === TILE.DIRT) {
          tiles[below] = TILE.ICE;
          water[below] = 0;
        }
      }
    }
  }

  // ---------- Grama ----------
  // Chamado 1x por segundo perto do jogador: terra/lama descoberta vira grama aos poucos
  // (mais rápido ao lado de grama) e grama coberta por um bloco volta a ser terra/lama.
  // Terra e grama têm a mesma opacidade, então a luz não precisa ser recalculada.
  growGrass(cx, cy, rx = 90, ry = 90) {
    const { w, h, tiles } = this;
    const GROW = { [TILE.DIRT]: TILE.GRASS, [TILE.MUD]: TILE.JUNGLE_GRASS, [TILE.PEAT]: TILE.BOG_GRASS };
    const BARE = { [TILE.GRASS]: TILE.DIRT, [TILE.JUNGLE_GRASS]: TILE.MUD, [TILE.DRY_GRASS]: TILE.DIRT, [TILE.SAKURA_GRASS]:TILE.DIRT, [TILE.BOG_GRASS]: TILE.PEAT, [TILE.SPORE_GRASS]: TILE.DIRT };
    for (let y = Math.max(1, cy - ry); y < Math.min(h, cy + ry); y++)
      for (let x = Math.max(1, cx - rx); x < Math.min(w - 1, cx + rx); x++) {
        const i = y * w + x, t = tiles[i];
        const grown = t===TILE.DIRT&&this.biome[x]===BIOME.FUNGAL?TILE.SPORE_GRASS:t===TILE.DIRT&&this.biome[x]===BIOME.SAKURA?TILE.SAKURA_GRASS:t === TILE.DIRT && this.biome[x] === BIOME.SAVANNA ? TILE.DRY_GRASS : GROW[t], bare = BARE[t];
        if (!grown && !bare) continue;
        const above = tiles[i - w], open = !SOLID[above] && above !== TILE.DOOR_OPEN;
        let next = t;
        if (bare && !open) { if (Math.random() < 1 / 20) next = bare; }
        else if (grown && open && (this.isSkyExposed(x, y - 1) || this.lightAt(x, y - 1) >= 9)) {
          let near = false;
          for (let dy = -1; dy <= 1 && !near; dy++)
            for (let dx = -1; dx <= 1; dx++) if (this.getTile(x + dx, y + dy) === grown) { near = true; break; }
          if (Math.random() < (near ? 1 / 15 : 1 / 60)) next = grown;
        }
        if (next !== t) { tiles[i] = next; if (this.onTileChange) this.onTileChange(x, y); }
      }
  }

  // ---------- Iluminação (flood fill por níveis, 0..15, só na janela em volta de cx, cy) ----------
  computeLight(cx = this.lcx, cy = this.lcy) {
    this.lightRevision++;
    this.lcx = cx; this.lcy = cy;
    const { w, h, tiles, skyLight, blockLight, skyTop, skyGapTop, skyGapBottom, skyFloor } = this;
    const lx = (this.lx = clamp(Math.round(cx - LIGHT_W / 2), 0, Math.max(0, w - LIGHT_W)));
    const ly = (this.ly = clamp(Math.round(cy - LIGHT_H / 2), 0, Math.max(0, h - LIGHT_H)));
    const RW = (this.rw = Math.min(LIGHT_W, w - lx)), RH = (this.rh = Math.min(LIGHT_H, h - ly));
    skyLight.fill(0);
    blockLight.fill(0);
    this.environmentLight ??= [0,1,2].map(() => new Uint8Array(LIGHT_W*LIGHT_H));
    for (const channel of this.environmentLight) channel.fill(0);
    const environmentBuckets = [0,1,2].map(() => Array.from({length:16},()=>[]));
    const skyBuckets = Array.from({ length: 16 }, () => []);
    const blockBuckets = Array.from({ length: 16 }, () => []);
    const water = this.water, surface = this.surface;
    // A luz de enfeite só existe em ar subterrâneo com chão natural embaixo. Testar isso
    // aqui evita ~28 mil chamadas por recálculo (o teste de dentro era o mesmo).
    const emissionAt = typeof environmentEmissionAt === 'function' ? environmentEmissionAt : null;
    for (let rx = 0; rx < RW; rx++) {
      const x = lx + rx, floor = surface[x] + 4;
      // Embaixo d'água o sol vai sumindo: conta quantas células de água há acima (também acima da janela)
      let depth = 0;
      for (let y = ly - 1; y >= 0 && depth < 60 && water[y * w + x]; y--) depth++;
      for (let ry = 0; ry < RH; ry++) {
        const r = ry * LIGHT_W + rx, y = ly + ry, i = y * w + x, t = tiles[i];
        depth = water[i] ? depth + 1 : 0;
        if (y < skyTop[x]) {
          const v = depth ? Math.max(7, 15 - ((depth - 1) / 5 | 0)) : 15;
          skyLight[r] = v; skyBuckets[v].push(r);
        } else if (y >= skyGapTop[x] && y < skyGapBottom[x]) {
          // embaixo de uma ilha do céu: sombra suave logo abaixo dela, sol cheio mais para baixo
          const v = Math.min(15, 13 + ((y - skyGapTop[x]) / 4 | 0), depth ? Math.max(7, 15 - ((depth - 1) / 5 | 0)) : 15);
          skyLight[r] = v; skyBuckets[v].push(r);
        } else if (skyFloor && y <= skyFloor[x]) {
          // na faixa do céu: o ar livre entre duas ilhas é céu aberto; dentro da pedra (ou de uma
          // gruta com parede de fundo) fica uma penumbra clara, nunca o breu
          const v = OPACITY[t] <= 1 && this.walls[i] === WALL.NONE ? 15 : SKY_BAND_GLOW;
          skyLight[r] = v; skyBuckets[v].push(r);
        }
        const e = LIGHT_EMIT[t];
        if (e > 0) { blockLight[r] = e; blockBuckets[e].push(r); }
        if (!emissionAt || t !== TILE.AIR || y <= floor) continue;
        const emission = emissionAt(this, x, y);
        if (emission) for (let c = 0; c < 3; c++) {
          const value = Math.round(emission.level * emission.color[c] / 255);
          if (value > 0) { this.environmentLight[c][r] = value; environmentBuckets[c][value].push(r); }
        }
      }
    }
    // Plataformas e telhados GRANDES (20+ blocos de largura, bem acima do chÃ£o): o ar embaixo ganha uma penumbra de
    // luz (nÃ­vel 9) em vez de escuridÃ£o total, jÃ¡ que o sol "vaza" pelas bordas de longe. Casas pequenas continuam escuras por dentro.
    {
      let runStart = -1;
      const roofed = (rx) => { const x = lx + rx; return skyTop[x] < surface[x] - 3 && skyTop[x] < ly + RH; };
      for (let rx = 0; rx <= RW; rx++) {
        const on = rx < RW && roofed(rx);
        if (on && runStart < 0) runStart = rx;
        if ((!on || rx === RW) && runStart >= 0) {
          if (rx - runStart >= 20) for (let k = runStart; k < rx; k++) {
            const x = lx + k, endY = Math.min(surface[x] + 1, ly + RH - 1);
            for (let y = Math.max(skyTop[x] + 1, ly); y <= endY; y++) {
              const i = y * w + x, r = (y - ly) * LIGHT_W + k;
              if (OPACITY[tiles[i]] > 1 || this.walls[i] !== WALL.NONE) break;
              if (skyLight[r] < 9) { skyLight[r] = 9; skyBuckets[9].push(r); }
            }
          }
          runStart = -1;
        }
      }
    }
    this.spreadLight(skyLight, skyBuckets);
    this.spreadLight(blockLight, blockBuckets);
    for (let c=0;c<3;c++) this.spreadLight(this.environmentLight[c],environmentBuckets[c]);
  }

  spreadLight(light, buckets) {
    const { w, tiles, lx, ly, rw, rh } = this;
    const tryN = (n, v) => {
      const nv = v - OPACITY[tiles[(ly + ((n / LIGHT_W) | 0)) * w + lx + (n % LIGHT_W)]];
      if (nv > light[n]) { light[n] = nv; buckets[nv].push(n); }
    };
    for (let v = 15; v > 1; v--) {
      const list = buckets[v];
      for (let k = 0; k < list.length; k++) {
        const r = list[k];
        if (light[r] !== v) continue;
        const x = r % LIGHT_W, y = (r / LIGHT_W) | 0;
        if (x > 0) tryN(r - 1, v);
        if (x < rw - 1) tryN(r + 1, v);
        if (y > 0) tryN(r - LIGHT_W, v);
        if (y < rh - 1) tryN(r + LIGHT_W, v);
      }
    }
  }

  // Luz de tochas/fogueiras num tile (0 fora da janela de luz)
  lightAt(x, y) {
    const rx = x - this.lx, ry = y - this.ly;
    return rx >= 0 && ry >= 0 && rx < LIGHT_W && ry < LIGHT_H ? this.blockLight[ry * LIGHT_W + rx] : 0;
  }

  // Combina luz do céu (multiplicada pela luz do dia) e luz de blocos
  composeLight(daylight) {
    const { skyLight, blockLight, skyTop, skyGapTop, skyGapBottom, skyFloor, tiles, walls, lx, ly, rw, rh, water, w } = this;
    const data = this.lightImage.data;
    // Ar livre por onde se vê o fundo pintado: a noite dele já vem do fundo (js/background.js),
    // então não escurece aqui. Vale para o céu aberto, para o vão embaixo das ilhas do céu e para
    // o ar entre elas (senão, sem shader, ficam colunas escuras embaixo das ilhas à noite).
    const openAir = (x, y, i) => y < skyTop[x] || (skyFloor && ((y >= skyGapTop[x] && y < skyGapBottom[x]) ||
      (y <= skyFloor[x] && walls[i] === WALL.NONE && OPACITY[tiles[i]] <= 1)));
    const sun = Math.max(daylight, 0.3);
    // Canais de luz colorida dos enfeites (computeLight); sem eles valem 0
    const env = this.environmentLight, e0 = env?.[0], e1 = env?.[1], e2 = env?.[2];
    for (let ry = 0, r = 0, p = 3; ry < LIGHT_H; ry++) {
      const y = ly + ry, row = y * w + lx;
      for (let rx = 0; rx < LIGHT_W; rx++, r++, p += 4) {
        if (rx >= rw || ry >= rh) { data[p] = 255; continue; }
        if (openAir(lx + rx, y, row + rx) && !water[row + rx]) { data[p] = 0; continue; }
        const s = skyLight[r] * sun, b = Math.max(blockLight[r], e0 ? e0[r] : 0, e1 ? e1[r] : 0, e2 ? e2[r] : 0);
        data[p] = (1 - (s > b ? s : b) / 15) * 255;
      }
    }
    this.lightCtx.putImageData(this.lightImage, 0, 0);
  }
}
