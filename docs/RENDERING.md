# Valdoria rendering: natural light and GPU post-processing

The preset is enabled by the existing **Opções → Vídeo → Shaders** checkbox.
Edit `js/render-style.js` for persistent defaults, or change `window.RENDER_STYLE`
in the browser console to preview values live. No world regeneration is needed.

| Control | Meaning |
| --- | --- |
| `sun.color`, `sun.intensity` | RGB sunlight and its contribution to exposed surfaces |
| `sun.direction` | Direction light travels; default `{-1.12, 1}` means down and left |
| `sun.followTime` | Optional moving sun direction; false keeps the reference's composition while day/night still controls light strength |
| `sun.edgeIntensity` | Thin, sprite-alpha-derived foliage, grass and roof highlights |
| `ambient.intensity`, `ambient.color`, `ambient.shadowTint` | Diffuse exposure light and low-light color |
| `rays.intensity`, `rays.softness`, `rays.scale` | Strength, feathering and world-space size/spacing of background shafts |
| `rays.animation` | Very slow intensity breathing; set to 0 for static rays |
| `bloom.threshold`, `bloom.knee` | Normalized luminance threshold and soft transition |
| `bloom.intensity`, `bloom.radius` | Glow strength and blur radius in world pixels |
| `bloom.downsample` | Screen reduction factor for the highlight buffer; default 4 |
| `grade.exposure`, `grade.contrast`, `grade.saturation` | World-only color adjustments; neutral value is 1 |
| `haze.strength`, `haze.color` | Depth-dependent background palette blending |
| `haze.cloudOpacity` | Distant daytime cloud opacity; storms/night retain original density |
| `cave.darkness`, `cave.sunlightPenetration` | Dark-floor strength and falloff of diffuse skylight around openings |

## Pass order

1. Prepare directional sunlight, sprite-canopy transmission, and propagated sky/local-light masks.
2. Draw sky and the four cached parallax scenery layers. Composite haze into each layer's alpha according to its known depth; background artwork alone uses smooth sampling.
3. Draw broad, irregular Gaussian light shafts through exposed air, behind gameplay.
4. Draw original nearest-neighbor terrain, vegetation, sprites and transparent water. Add thin golden edge accents using actual artwork alpha.
5. Multiply the scene by the RGB light mask. Draw existing local glows, weather, water tint and combat effects.
6. Upload the composed world directly to WebGL, without reading its pixels back to JavaScript. Extract bright regions into a reduced-resolution, world-aligned buffer; blur horizontally and vertically with two five-sample passes.
7. Apply the exposure/local-light mask to bloom and combine it with the sharp original scene in one GPU pass. Exposure/contrast/saturation are adjustable here and neutral by default. Canvas 2D fallback remains available if WebGL is unavailable or lost.
8. Draw cursor, vitals, inventory, map, captions and other UI at their original colors.

Light masks use one sample per tile and smooth interpolation. Bloom uses a reduced
buffer padded for its blur; its sampling origin follows the snapped world camera.
The base scene is never blurred. There is no height-based darkness or haze band.
World light revisions invalidate solar occlusion after mining/building and light updates.
Lighting masks are reused while exposure, world data and their tile window stay
unchanged; sub-tile camera movement only repositions them. There is no periodic
solar-cache rebuild for an unchanged scene. Daylight/weather changes are quantized
below a visible brightness step; ray animation remains very slow.
Shader-off and administrator night-vision modes bypass the new styling.

## Limits of the assets and technique

- This engine has no surface normals or HDR. Solar transmission is a soft tile-grid
  approximation, with cached sprite-alpha canopy coverage. Tiny holes and thin
  roof details cannot cast exact pixel shadows. Glass and leaves partially transmit.
- The solar window includes 64 upstream tile rows and at least 106 columns on each side
  (expanded for tall viewports and oblique angles);
  its boundary is seeded from the world's sky-exposure map. Very tall/distant
  occluders outside this window use that conservative vertical-exposure approximation.
- Bloom extracts the composed LDR world, including bright water and emissives;
  the high threshold and low intensity keep these restrained rather than using a
  separate per-material HDR emission channel.
- The reference contains hand-authored massive diagonal branches, dense irregular
  foliage, detailed multilevel timber houses and carefully composed openings.
  The existing mountains, forest layers and houses/trees provide depth, but
  reproducing those exact silhouettes and proportions requires new artwork and
  scene composition. Lighting cannot supply missing architectural detail.

## Verification

Run `node tests/golden-rendering.cjs` with Playwright available (or set
`PLAYWRIGHT_PATH` to its installed module). It starts a fresh headless Edge context
at `http://localhost/jogo-teste/`, builds a deterministic isolated scene, and saves
`tests/golden-after.png`, `tests/golden-disabled.png`, and `tests/golden-report.json`.
The fixture includes existing house/tree assets, elevation changes, a cave opening,
a torch chamber and transparent water. It does not modify a player's saved world.
The report records the checks actually run and measured render cost. Headless
measurements are not a guarantee of frame rate on other hardware.

### Yellow cast, terrain seams and performance correction

The previous preset over-tinted the entire background and used overly strong
golden edge accents. The default now keeps a blue/neutral sky, natural greens,
neutral overall grading and a small warm contribution on exposed surfaces.
Haze strength is 0.22, rim intensity 0.32, and bloom intensity 0.18.

The pale vertical soil lines came from treating transparent padding inside the
block atlas as exposed geometry. Terrain rim extraction now uses each atlas row's
neighbour mask. Connected sides are treated as opaque; only genuinely exposed
top/side contours receive highlights. Plant sprites retain their separate alpha
contour treatment.

`js/gpu-postprocess.js` implements extraction, separable bloom and final grading
in WebGL. Its scene texture uses nearest-neighbour sampling and high-precision
coordinates; only the small bloom textures use linear sampling. Padding and a
camera-dependent sampling phase keep bloom aligned with the world. It handles
resize, context loss and restoration, and falls back to the previous Canvas path.
The HUD never enters the uploaded world texture.

Verification performed in local headless Edge with an NVIDIA GeForce RTX 4060:

- `node tests/gpu-postprocess.cjs`: 11 checks passed, including actual WebGL use,
  unchanged midtones, cave masking, 2048-pixel alternating-column sharpness,
  no internal tile rims, remaining exposed contours and context recovery.
- `node tests/render-math.cjs`: eight checks passed.
- `node tests/golden-rendering.cjs --software`: all 31 visual checks passed,
  including UI, transparency, sunlight occlusion, camera round-trip and resize.
  This readback-heavy suite forces consistent Canvas software sampling to avoid
  Chromium changing its readback backend mid-comparison. Its frame timings are
  NOT used as gameplay performance measurements.
- `node tests/shader-performance.cjs`: at 1600×900, isolated drawing decreased
  from 15.79 to 8.92 ms stationary and 16.86 to 11.02 ms moving. These short CPU
  submission timings do not directly imply an FPS guarantee.
- `node tests/shader-live.cjs`: actual update/render loop with movement averaged
  89.4 rendered frames/s over 5.08 seconds, with no runtime errors. Results vary
  with scene complexity, resolution, browser, active applications and settings.

Before/after images were inspected: `tests/shader-performance-before.png` and
`tests/shader-performance-after.png`. The latter shows the corrected soil and
reduced yellow cast. Machine-readable timings are saved next to the captures;
the live run is recorded in `tests/shader-live-report.json`.

## Otimização de desempenho (2026-09-22)

Nenhuma destas mudanças altera um pixel: as dez capturas de `tests/perf-shots.cjs`
(superfície, caverna, chuva, noite, crepúsculo, com e sem shaders) são idênticas às
de antes, e as 31 verificações de `golden-rendering.cjs` continuam passando.

### O que estava custando caro

Medido com `tests/perf-bench.cjs` em Edge headless, 1600×900, RTX 4060. O gargalo
não era o pós-processamento na GPU (as passadas de bloom custam ~0,1 ms de GPU; o
tempo que aparecia nelas é a CPU esperando o Canvas 2D terminar) e sim a quantidade
de chamadas de desenho no Canvas 2D: cada `drawImage` de tile custa ~3 µs, e um
quadro numa caverna fazia ~1800 delas mais ~900 `fillRect` com `save`/`restore`.

### O que mudou

- `js/environment.js`: a tinta de gruta e o musgo das paredes de fundo entram numa
  fila e saem em dois lotes (`environmentWallCell` / `drawEnvironmentWallQueue`), com
  um `save`/`restore` por quadro em vez de um por tile, sem `[...].includes` nem
  `rgb()` por célula. Cada tile só pinta dentro do próprio quadrado, então a ordem
  tinta → musgo → sombra de cada tile é preservada.
- `js/renderer.js`: paredes de fundo iguais na mesma linha saem em faixas de até
  quatro tiles num `drawImage` só (as quatro variações são vizinhas no atlas e
  paredes não se sobrepõem). Blocos sem nenhum lado exposto usam `blockRunStrip`,
  uma tira com o miolo das variações em passo `T`, criada apenas quando a moldura de
  4 px daquele atlas está comprovadamente vazia. O lado que recebe a borda de sol
  saiu do laço de tiles.
- `js/shaders.js`: a propagação do sol só recebe margem no lado de onde a luz vem
  (`shaderSunPads`), o que corta ~40% das colunas sem mudar valor nenhum dentro da
  janela; os dois buffers de linha são reaproveitados; a sombra das copas só é
  refeita quando `world.treeRevision` muda, e não a cada bloco cavado; a máscara de
  exposição ganhou um número de revisão. `drawShaderRim` troca `save`/`restore` por
  guardar só `globalAlpha` e `globalCompositeOperation`.
- `js/gpu-postprocess.js`: a textura da cena é realocada só quando a resolução muda
  (`texSubImage2D` nos demais quadros), a máscara só sobe quando sua revisão muda, e
  as posições dos uniformes de sampler são resolvidas uma vez na inicialização.
- `js/world.js`: `computeLight` testa ar subterrâneo antes de chamar
  `environmentEmissionAt`, evitando ~28 mil chamadas por recálculo;
  `world.treeRevision` conta apenas trocas de tronco/toco.

### Antes e depois

Comparação A/B no mesmo processo, alternando as duas versões (`--ab`), mediana de
três passadas, Edge headless 1600×900, RTX 4060. O laço vivo é o próprio loop do
jogo; sem vsync no headless, é vazão, não taxa de tela.

| Cenário (ms por quadro, CPU) | Antes | Depois |
| --- | --- | --- |
| Caverna com tochas | 16,07 | 7,82 |
| Caverna andando | 15,46 | 8,53 |
| Água | 9,27 | 6,18 |
| Chuva | 8,10 | 7,10 |
| Superfície parado | 6,31 | 5,74 |
| Superfície andando | 6,14 | 5,56 |
| Noite | 5,62 | 4,24 |
| Minerando (invalida a luz) | 8,17 | 7,60 |
| Caverna, shaders desligados | 15,27 | 8,04 |

| Loop vivo (quadros/s e intervalo) | Antes | Depois |
| --- | --- | --- |
| Parado | 122,3 fps · p95 11,6 ms · p99 15,1 ms | 154,6 fps · p95 9,0 ms · p99 11,4 ms |
| Andando | 97,3 fps · p95 15,3 ms · p99 19,9 ms | 124,2 fps · p95 11,9 ms · p99 15,4 ms |

### Ferramentas de medição

- `node tests/perf-bench.cjs --label=x` mede oito cenários (superfície parada e em
  movimento, caverna, água, chuva, noite, mineração) com e sem shaders, mais o loop
  vivo; registra média/p95/p99, custo por fase e tempo real de GPU do
  pós-processamento (`EXT_disjoint_timer_query`). Com `--ab` compara duas versões
  alternando passadas, o que anula a variação de carga da máquina.
- `node tests/perf-shots.cjs --label=x [--compare=y] [--url=...]` grava dez capturas
  determinísticas e compara pixel a pixel com outra rodada.
- `node tests/perf-regressions.cjs` confere que as tiras de bloco e parede pintam o
  mesmo que o caminho tile a tile, que o corte de árvore refaz a sombra das copas,
  que cavar terra não a refaz e que a máscara de bloom sobe só quando muda.
- A cópia congelada em `http://localhost/jogo-teste-base/` é a versão anterior,
  usada como lado "antes" do `--ab`. Pode ser apagada sem afetar o jogo.

### Não medido

O painel de navegador embutido não roda `requestAnimationFrame`, e o headless não
tem vsync: não há aqui medida de quadros realmente apresentados num monitor. Os
números acima são vazão do loop e tempo de submissão; a taxa percebida depende do
monitor, do driver e do modo de FPS escolhido nas opções.
