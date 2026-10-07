'use strict';

// Menus em HTML sobre o canvas: principal, criador de personagem, pausa, opções e controles.
// Visual igual ao da interface do jogo: moldura de alumínio rebitada, botões âmbar e fonte Silkscreen.

const OPTIONS_KEY = 'voo237.opcoes';
// fpsMode: 'vsync' (taxa do monitor), 'unlimited' ou 'limit' (usa fpsLimit)
const OPTION_DEFAULTS = {
  volume: 80, help: true, shake: true, shaders: true,
  fpsMode: 'vsync', fpsLimit: 165, showFps: false,
  musicVolume: 60, calmMusic: true, battleMusic: true,
  uiScale: 'auto', // tamanho do inventário/mapa: 'auto' ou 1..4
  skipIntro: false, // pula a cutscene inicial ao começar um mundo
};
const FPS_PRESETS = [30, 60, 75, 90, 120, 144, 165, 240, 360];
const GAME_OPTIONS = (() => {
  try { return { ...OPTION_DEFAULTS, ...JSON.parse(localStorage.getItem(OPTIONS_KEY) || '{}') }; }
  catch (_) { return { ...OPTION_DEFAULTS }; }
})();

function saveOptions() {
  try { localStorage.setItem(OPTIONS_KEY, JSON.stringify(GAME_OPTIONS)); } catch (_) {}
}

function applyOptions(g) {
  if (g.crashAudio) g.crashAudio.master.gain.value = 0.8 * GAME_OPTIONS.volume / 100;
  g.showHelp = GAME_OPTIONS.help;
}

const CONTROLS = [
  ['Movimento', [
    [['A', 'D'], 'Andar'],
    [['Espaço', 'W'], 'Pular'],
    [['W', 'S'], 'Subir e descer pelas escadas'],
    [['S', '↓'], 'Agachar (passa em vãos de 2 blocos)'],
  ]],
  ['Mãos e ferramentas', [
    [['Segure Ctrl'], 'Cursor inteligente: marca o bloco sozinho e troca a ferramenta'],
    [['Mouse esq.'], 'Minerar, atacar e desmontar destroços'],
    [['Mouse esq.'], 'Com martelo no vazio: derruba a parede de fundo'],
    [['Mouse dir.'], 'Colocar bloco, abrir porta e vasculhar destroços'],
    [['1-0', 'Roda'], 'Trocar item da barra'],
    [['Q'], 'Soltar item no chão (Shift: pilha toda)'],
  ]],
  ['Construção', [
    [['Mouse dir.'], 'Parede de fundo: pinta 2x2 e tapa o céu dentro da casa'],
    [['C'], 'Peças de construção: ardósia, enxaimel, janelas e floreiras'],
    [['Telhado'], 'Acabamentos / e \\ são decorativos: apoie em telhas sólidas'],
  ]],
  ['Inventário e criação', [
    [['E'], 'Inventário (tem o espaço de roupa no rodapé)'],
    [['C'], 'Livro de receitas (botão embaixo do minimapa)'],
    [['Clique'], 'Livro: caixa de busca — digite o nome ou o ingrediente'],
    [['Clique'], 'Livro: manda os ingredientes para a bancada'],
    [['Shift', 'Clique'], 'Mover item entre janelas'],
    [['Clique duplo'], 'Com item na mão: junta todas as pilhas iguais'],
    [['Ctrl', 'Clique'], 'Exclui o item na hora (vai para a lixeira)'],
    [['Alt', 'Clique'], 'Favorita o item: não vai para o baú ao guardar a mochila'],
    [['Esc'], 'Fecha uma janela por vez (bancada, baú, inventário)'],
    [['Mouse dir.', 'V'], 'Vestir uma roupa / tirar a roupa'],
  ]],
  ['Vila e montaria', [
    [['Mouse dir.'], 'Morador próximo: conversar, trocar e aceitar missões'],
    [['J'], 'Diário: missões aceitas e moradores conhecidos'],
    [['B'], 'Bestiário: bichos e monstros que você já derrotou'],
    [['1', '2', 'Tab'], 'Conversa e diário: alternar entre as abas'],
    [['Mouse dir.'], 'Elefante: selar (sela na mão), montar e descer'],
    [['E'], 'Montado: bolsa do elefante (sela + carga)'],
    [['Shift'], 'Descer do elefante'],
  ]],
  ['Tela e jogo', [
    [['M'], 'Mapa do mundo'],
    [['+', '-'], 'Zoom'],
    [['H'], 'Mostrar ou ocultar a ajuda'],
    [['Esc', 'P'], 'Pausar o jogo'],
    [['Segure Espaço'], 'Pular a abertura'],
  ]],
];

// Abas do criador. `thumb` = galeria com miniaturas (recorte do sprite parado); `color` = amostras de cor;
// `off(draft)` devolve o motivo quando a opção não se aplica ao visual atual.
const CREATOR_TABS = [
  { id: 'body', label: 'Corpo', rows: [
    { key: 'skin', label: 'Tom de pele', list: SKIN_TONES, color: (e) => e.c[2] },
    { key: 'eyes', label: 'Olhos', list: EYE_COLORS, color: (e) => e.c },
  ] },
  { id: 'hair', label: 'Cabelo', rows: [
    { key: 'hairStyle', label: 'Corte', list: HAIR_STYLES, thumb: 'head' },
    { key: 'hair', label: 'Cor do cabelo', list: HAIR_COLORS, color: (e) => e.c[2] },
    { key: 'beard', label: 'Barba e bigode', list: BEARDS, thumb: 'face' },
  ] },
  { id: 'clothes', label: 'Roupas', rows: [
    { key: 'top', label: 'Parte de cima', list: TOP_STYLES, thumb: 'body' },
    { key: 'jacket', label: 'Cor da jaqueta', list: JACKET_COLORS, color: (e) => e.c[2], off: (d) => TOP_STYLES[d.top].shirt && 'Só de camisa — a cor vem da camisa.' },
    { key: 'shirt', label: 'Camisa', list: SHIRT_COLORS, color: (e) => e.c[1] },
    { key: 'pattern', label: 'Estampa', list: PATTERNS, thumb: 'body' },
    { key: 'legs', label: 'Pernas', list: LEG_STYLES, thumb: 'legs' },
    { key: 'pants', label: 'Cor da calça', list: PANTS_COLORS, color: (e) => e.c[1] },
    { key: 'boots', label: 'Calçado', list: BOOT_COLORS, color: (e) => e.c[1], sole: (e) => e.q },
  ] },
  { id: 'extras', label: 'Acessórios', rows: [
    { key: 'hat', label: 'Chapéu', list: HATS, thumb: 'head' },
    { key: 'hatColor', label: 'Cor do chapéu', list: HAT_COLORS, color: (e) => e.c[2], off: (d) => !d.hat && 'Escolha um chapéu para pintar.' },
    { key: 'glasses', label: 'Óculos', list: GLASSES, thumb: 'face' },
  ] },
];
const CREATOR_ROWS = CREATOR_TABS.flatMap((t) => t.rows);
// Recortes do quadro parado (x, y, largura, altura) usados nas miniaturas
const THUMB_CROPS = { head: [3, 0, 26, 25], face: [9, 9, 18, 16], body: [4, 1, 24, 47], legs: [8, 32, 16, 16] };
const RANDOM_NAMES = ['Ana', 'Bento', 'Caio', 'Duda', 'Enzo', 'Flora', 'Gabi', 'Heitor', 'Iara', 'Joca', 'Kira', 'Lia', 'Maya',
  'Nina', 'Otto', 'Pietra', 'Rafa', 'Sofia', 'Théo', 'Vitória', 'Yuri', 'Zeca', 'Luna', 'Davi', 'Cecília', 'Aurora', 'Tainá',
  'Bia', 'Chico', 'Dora', 'Nando', 'Juju', 'Tito', 'Lupe', 'Marcola'];

// Cartões do mundo: tamanho real (js/game.js) e barras de extensão/profundidade/variedade (1 a 3)
const WORLD_CARDS = [
  { size: 'pequeno', name: 'Pequeno', dims: '4200 × 1200', time: 'Aventura curta', bars: [1, 1, 1],
    desc: 'Tudo por perto: ótimo para uma primeira jornada.' },
  { size: 'medio', name: 'Médio', dims: '6400 × 1800', time: 'Aventura equilibrada', bars: [2, 2, 2],
    desc: 'Mais biomas, vilas e cavernas para descobrir.' },
  { size: 'grande', name: 'Grande', dims: '8400 × 2400', time: 'Aventura longa', bars: [3, 3, 3],
    desc: 'Horizontes enormes e profundezas sem fim.' },
];
const LOADING_TIPS = [
  'Segure Ctrl para o cursor inteligente escolher a ferramenta certa.',
  'Paredes de fundo tapam o céu: dentro de casa os monstros não aparecem.',
  'Vasculhe os destroços do avião com o botão direito.',
  'O livro de receitas (C) aceita busca por ingrediente.',
  'Moradores das vilas trocam itens e dão missões — aperte J para o diário.',
  'Engatinhe (S) para passar em vãos de dois blocos.',
  'Um elefante selado carrega carga extra na bolsa.',
];

// Transforma a semente digitada num número (texto vira hash; número vale como está)
function worldSeedFrom(text) {
  const s = String(text || '').trim();
  if (!s) return null;
  if (/^-?\d{1,9}$/.test(s)) return Math.abs(+s);
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.codePointAt(0), 16777619);
  return (h >>> 0) % 1e9;
}

// ---------- Cenas pintadas do menu (pixels 1:1, ampliadas pelo CSS) ----------
// Palco do criador e da tela de carregamento: céu de fim de tarde, montanhas em paralaxe, pinheiros,
// vaga-lumes e o chão rolando conforme a animação. speed = pixels por segundo; facing = ±1.
function drawStageScene(c, W, H, t, speed, facing, groundY) {
  c.imageSmoothingEnabled = false;
  const sky = c.createLinearGradient(0, 0, 0, groundY);
  sky.addColorStop(0, '#131a2b'); sky.addColorStop(0.5, '#33294a'); sky.addColorStop(0.85, '#7c4652'); sky.addColorStop(1, '#c0694a');
  c.fillStyle = sky; c.fillRect(0, 0, W, groundY);
  for (let i = 0; i < 22; i++) { // estrelas piscando
    c.globalAlpha = 0.25 + 0.3 * (1 + Math.sin(t * 1.6 + i * 2.3));
    c.fillStyle = '#fff2d6'; c.fillRect((i * 37 + 11) % W, (i * 23 + 5) % Math.floor(groundY * 0.5), 1, 1);
  }
  // Sol baixo com halo
  const sx = Math.round(W * 0.7), sy = Math.round(groundY * 0.66);
  for (const [r, col] of [[12, 'rgba(255,170,100,0.12)'], [8, 'rgba(255,190,120,0.25)'], [5, '#ffcf8a']]) {
    c.fillStyle = col;
    for (let dy = -r; dy <= r; dy++) { const w = Math.round(Math.sqrt(r * r - dy * dy)); c.fillRect(sx - w, sy + dy, w * 2 + 1, 1); }
  }
  c.globalAlpha = 1;
  const dist = t * speed * facing;
  const ridge = (off, col, base, amp, f1, f2) => {
    c.fillStyle = col;
    for (let x = 0; x < W; x++) {
      const u = x + off, h = Math.round(base - amp * (0.6 * Math.sin(u * f1) + 0.4 * Math.sin(u * f2 + 1.3)));
      c.fillRect(x, h, 1, groundY - h);
    }
  };
  ridge(dist * 0.1, '#4a3552', groundY - 26, 9, 0.041, 0.097);
  ridge(dist * 0.25, '#33293f', groundY - 15, 7, 0.066, 0.17);
  // Pinheiros escuros na linha do horizonte
  const treeOff = dist * 0.5;
  c.fillStyle = '#1d2130';
  for (let k = 0; k < 14; k++) {
    const tx = Math.round(wrap(k * 19 + (k * 7) % 5 - treeOff, W + 24) - 12), th = 7 + (k * 5) % 6;
    for (let r = 0; r < th; r++) { const w = Math.floor(r / 2); c.fillRect(tx - w, groundY - th + r, w * 2 + 1, 1); }
  }
  // Chão: grama, terra e tufos rolando com os pés
  const off = -Math.floor(dist);
  c.fillStyle = '#4a2f20'; c.fillRect(0, groundY, W, H - groundY);
  c.fillStyle = '#3f8a3a'; c.fillRect(0, groundY, W, 3);
  c.fillStyle = '#62b04a'; c.fillRect(0, groundY, W, 1);
  for (let i = 0; i < Math.ceil(W / 9) + 2; i++) {
    const x = wrap(i * 9 + off, W + 18) - 9;
    c.fillStyle = '#5a3a26'; c.fillRect(x, groundY + 6 + ((i * 5) & 7), 3, 2);
    c.fillStyle = '#62b04a'; c.fillRect(x + 4, groundY - 2, 1, 2); c.fillRect(x + 6, groundY - 1, 1, 1);
    if (i % 4 === 1) { c.fillStyle = i % 8 === 1 ? '#f2d36b' : '#e98aa8'; c.fillRect(x + 1, groundY - 2, 1, 1); } // florzinhas
  }
  // Vaga-lumes
  for (let i = 0; i < 6; i++) {
    const p = (t * 0.18 + i / 6) % 1;
    c.globalAlpha = Math.sin(p * Math.PI) * (0.6 + 0.4 * Math.sin(t * 5 + i));
    c.fillStyle = '#e8ff9a';
    c.fillRect(Math.round(wrap(i * 29 + Math.sin(t + i) * 6 - dist * 0.3, W)), Math.round(groundY - 6 - p * 26), 1, 1);
  }
  c.globalAlpha = 1;
}

// Personagem em pé no chão do palco, com sombra
function drawStageHero(c, atlas, frame, cx, groundY, facing) {
  const x = Math.round(cx - PLAYER_SPR_W / 2), y = groundY - 45;
  c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(Math.round(cx) - 8, groundY, 16, 2);
  c.save();
  if (facing < 0) { c.translate(x * 2 + PLAYER_SPR_W, 0); c.scale(-1, 1); }
  c.drawImage(atlas, frame * PLAYER_SPR_W, 0, PLAYER_SPR_W, PLAYER_SPR_H, x, y, PLAYER_SPR_W, PLAYER_SPR_H);
  c.restore();
}

// Corte do mundo para os cartões: superfície com biomas, camadas de pedra, cavernas e minérios.
// Mundos maiores aparecem "de mais longe" (mais biomas, mais fundo e mais cavernas no quadro).
function drawWorldArt(cv, idx, seed) {
  const c = cv.getContext('2d'), W = cv.width, H = cv.height;
  let s = (Math.imul(seed + 1, 2654435761) ^ Math.imul(idx + 1, 97531)) >>> 0;
  const rnd = () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
  const zoom = [1, 1.7, 2.6][idx], horizon = [44, 38, 32][idx];
  c.imageSmoothingEnabled = false;
  const sky = c.createLinearGradient(0, 0, 0, horizon + 6);
  sky.addColorStop(0, '#2c4474'); sky.addColorStop(0.6, '#6b8fc2'); sky.addColorStop(1, '#e9b77e');
  c.fillStyle = sky; c.fillRect(0, 0, W, H);
  c.fillStyle = 'rgba(255,255,255,0.75)';
  for (let i = 0; i < 4; i++) { const cx = Math.floor(rnd() * W), cy = 5 + Math.floor(rnd() * (horizon - 20)); c.fillRect(cx, cy, 10, 2); c.fillRect(cx + 3, cy - 2, 5, 2); }
  // Biomas em faixas: floresta, savana, cerejeiras e neve
  const BIOMES = [
    { grass: '#4f9a3c', top: '#78c257', tree: 'pine' }, { grass: '#b39b45', top: '#d8c068', tree: 'acacia' },
    { grass: '#5aa04c', top: '#86c86a', tree: 'sakura' }, { grass: '#dfe8ee', top: '#ffffff', tree: 'snowpine' },
  ];
  const nSeg = [2, 3, 5][idx], cuts = [0];
  for (let i = 1; i < nSeg; i++) cuts.push(Math.round((i / nSeg + (rnd() - 0.5) * 0.12) * W));
  cuts.push(W);
  const first = Math.floor(rnd() * 4), order = cuts.map((_, i) => (first + i) % 4);
  const biomeAt = (x) => { let i = 0; while (x >= cuts[i + 1]) i++; return BIOMES[order[i]]; };
  const p1 = rnd() * 9, p2 = rnd() * 9, f = 0.045 * zoom;
  const surf = new Array(W);
  for (let x = 0; x < W; x++) surf[x] = Math.round(horizon - 5 * Math.sin(x * f + p1) - 3 * Math.sin(x * f * 2.3 + p2) - (biomeAt(x).tree === 'snowpine' ? 5 : 0));
  // Camadas pela profundidade "real" (em blocos): mais zoom, mais camadas aparecem
  const layer = (d) => d < 5 ? '#6b4a30' : d < 30 ? '#5d606c' : d < 62 ? '#474a5c' : d < 95 ? '#35364a' : '#2a2438';
  for (let x = 0; x < W; x++) {
    const y0 = surf[x], b = biomeAt(x);
    for (let y = y0; y < H; y++) { c.fillStyle = layer((y - y0) * zoom); c.fillRect(x, y, 1, 1); }
    c.fillStyle = b.grass; c.fillRect(x, y0, 1, 2);
    c.fillStyle = b.top; c.fillRect(x, y0, 1, 1);
  }
  // Cavernas (com água em algumas) e veios de minério
  for (let i = 0, n = [4, 8, 13][idx]; i < n; i++) {
    const cx = rnd() * W, cy = horizon + 12 + rnd() * (H - horizon - 16), rx = 3 + rnd() * 7, ry = 1.5 + rnd() * 2.5, wet = rnd() < 0.3;
    for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
      for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
        const k = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
        if (k > 1 || y < surf[clamp(x, 0, W - 1)] + 4) continue;
        c.fillStyle = wet && y > cy ? '#2f6aa0' : k > 0.6 ? '#20212c' : '#15161e';
        c.fillRect(x, y, 1, 1);
      }
  }
  const ORES = ['#d88a4a', '#d7dde4', '#f2cf5a', '#6fe0e0', '#c06ae0'];
  for (let i = 0, n = [16, 28, 44][idx]; i < n; i++) {
    const x = Math.floor(rnd() * W), y = Math.floor(surf[x] + 8 + rnd() * (H - surf[x] - 8)), deep = (y - surf[x]) * zoom;
    c.fillStyle = ORES[Math.min(4, Math.floor(deep / 25 + rnd()))];
    c.fillRect(x, y, 1, 1);
    if (rnd() < 0.5) c.fillRect(x + 1, y, 1, 1);
  }
  // Árvores de cada bioma, menores nos mundos vistos de longe
  const scale = idx === 2 ? 0.75 : 1;
  for (let x = 2; x < W - 2; x += Math.max(4, Math.round((5 + rnd() * 6) / zoom * 1.6))) {
    const b = biomeAt(x), y = surf[x], h = Math.max(3, Math.round((5 + rnd() * 3) * scale));
    if (b.tree === 'pine' || b.tree === 'snowpine') {
      c.fillStyle = b.tree === 'pine' ? '#23502e' : '#2f5a4a';
      for (let r = 0; r < h; r++) { const w = Math.floor(r / 2); c.fillRect(x - w, y - h + r, w * 2 + 1, 1); }
      if (b.tree === 'snowpine') { c.fillStyle = '#f4f8fb'; c.fillRect(x, y - h, 1, 1); c.fillRect(x - 1, y - h + 3, 3, 1); }
    } else if (b.tree === 'acacia') {
      if (rnd() < 0.5) continue;
      c.fillStyle = '#5b3d22'; c.fillRect(x, y - h + 2, 1, h - 2);
      c.fillStyle = '#6f8a36'; c.fillRect(x - 3, y - h, 7, 2);
    } else {
      c.fillStyle = '#5b3d22'; c.fillRect(x, y - h + 3, 1, h - 3);
      c.fillStyle = '#f0a3c0'; c.fillRect(x - 2, y - h, 5, 3);
      c.fillStyle = '#ffd0e0'; c.fillRect(x - 1, y - h, 2, 1);
    }
  }
  // Vilas nos mundos maiores
  for (let v = 0; v < idx; v++) {
    const vx = Math.floor(W * (0.55 + v * 0.22 + rnd() * 0.08)) % (W - 10);
    for (let k = 0; k < 2; k++) {
      const hx = vx + k * 6, hy = surf[hx + 2];
      c.fillStyle = '#e8d3a8'; c.fillRect(hx, hy - 3, 4, 3);
      c.fillStyle = '#b44a36'; c.fillRect(hx - 1, hy - 5, 6, 2); c.fillRect(hx, hy - 6, 4, 1);
    }
  }
  // Destroços do voo 237 com fumaça
  const px = Math.floor(W * 0.24), py = surf[px];
  c.fillStyle = '#c9ced4'; c.fillRect(px - 4, py - 3, 9, 3);
  c.fillStyle = '#8a9098'; c.fillRect(px - 4, py - 1, 9, 1); c.fillRect(px + 3, py - 6, 2, 3);
  c.fillStyle = '#e0763a'; c.fillRect(px - 2, py - 2, 1, 1);
  for (let i = 0; i < 6; i++) { c.fillStyle = `rgba(60,58,66,${0.7 - i * 0.1})`; c.fillRect(px + 1 + Math.round(Math.sin(i * 1.3) * 2) + i, py - 5 - i * 3, 2 + (i & 1), 2); }
}

const MENU_CSS = `
#menu-root{position:fixed;inset:0;z-index:50;font-family:Silkscreen,monospace;color:#efe6d2;user-select:none;-webkit-font-smoothing:none}
#menu-root[hidden],#menu-root .screen[hidden]{display:none}
#menu-root *{box-sizing:border-box}
#menu-root .btn:disabled{opacity:.35;filter:grayscale(1);cursor:not-allowed;pointer-events:none}
#menu-root .saved-world{display:flex;flex-direction:column;align-items:flex-start;gap:10px;white-space:normal;text-align:left;padding:18px}
#menu-root .saved-world strong{color:#f0c978;font-size:14px}
#menu-root .saved-world small{font-size:10px;line-height:1.7;color:#aab4c0}
#menu-root .saved-world-row{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;min-width:0;background:#293139;border:2px solid #53606b}
#menu-root .saved-world-row:hover,#menu-root .saved-world-row:focus-within{border-color:#bda16b;background:#303942}
#menu-root .saved-world-row .saved-world{width:100%;min-width:0;overflow-wrap:anywhere;background:transparent;border:0;box-shadow:none;margin:0;padding:20px;gap:8px}
#menu-root .menu-list .saved-world-row small{color:#aab4c0;float:none;font-size:10px}
#menu-root .menu-list .saved-world-row .save-date{color:#8e9ba8;font-size:9px}
#menu-root .menu-list .saved-world-row .btn::before{display:none}
#menu-root .saved-world-actions{display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap}
#menu-root .saved-world-actions .btn{font-size:10px;padding:10px 14px;min-width:0}
#menu-root .saved-world-row>.saved-world-actions{padding:14px;gap:6px}
#menu-root .saved-world-actions .world-tool{display:grid;place-items:center;width:36px;height:36px;padding:0;border:1px solid transparent;background:transparent;box-shadow:none;color:#abb7c1}
#menu-root .saved-world-actions .world-tool:hover{border-color:#70808d;background:#394650;color:#ffd27a}
#menu-root .world-danger{color:#f6aba0}
#menu-root .world-danger:hover,#menu-root .world-tool.world-danger:hover{color:#ffd4cc;background:#55333b;border-color:#a96562}
#menu-root .world-edit-backdrop{position:fixed;inset:0;background:rgba(5,9,14,.8);z-index:70}
#menu-root .panel.saved-world-editor{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:min(480px,calc(100vw - 48px));max-height:calc(100vh - 48px);z-index:71;box-shadow:0 0 0 3px #0a0c0f,0 0 0 6px #56616b,0 0 0 9px #0a0c0f}
#menu-root .saved-world-editor .panel-head{flex-shrink:0}
#menu-root .saved-world-editor h2{color:#f0c978;line-height:1.5}
#menu-root .saved-world-editor .world-edit-name{margin-top:8px;color:#e0a44a;font:11px/1.8 Silkscreen,monospace;overflow-wrap:anywhere}
#menu-root .saved-world-editor .world-edit-body{display:flex;flex-direction:column;gap:14px;padding:24px;overflow:auto;min-height:0}
#menu-root .saved-world-editor label{font:12px/1.8 Silkscreen,monospace;color:#b8c3cc;overflow-wrap:anywhere}
#menu-root .saved-world-editor input{width:100%;min-width:0;padding:12px;background:#121a21;color:#efe6d2;border:2px solid #72818e;font:14px/1.8 Silkscreen,monospace;user-select:text;border-radius:0}
#menu-root .saved-world-editor input:focus{outline:2px solid #ffd27a;outline-offset:2px}
#menu-root .saved-world-editor p{margin:0;font:12px/1.8 Silkscreen,monospace;color:#b8bec5}
#menu-root .saved-world-editor .saved-world-actions{gap:8px;flex-shrink:0}
#menu-root .saved-world-editor .world-edit-confirm{color:#ffd27a;border-color:#9e875e}
#menu-root .saved-world-editor .world-edit-confirm.world-danger{color:#ffb4a7;border-color:#a96562;background:#4b2e32}
@media(max-width:480px){#menu-root .saved-world-row{grid-template-columns:minmax(0,1fr)}#menu-root .saved-world-row>.saved-world-actions{padding:0 14px 12px}#menu-root .saved-world-row .saved-world{padding:16px}#menu-root .saved-world-editor .world-edit-body{padding:20px}#menu-root .saved-world-editor .panel-head h2{font-size:16px}}
#menu-root .saved-world-editor .save-error{color:#f59c8e}
#menu-root .save-error{color:#f59c8e}
#menu-root .screen{position:absolute;inset:0;display:grid;place-items:center;padding:24px;overflow:auto}
#menu-root .screen.dim{background:rgba(6,8,11,.74)}
#menu-root .screen.main{place-items:center start;padding-left:clamp(24px,7vw,112px);background:
 linear-gradient(90deg,rgba(5,8,11,.94) 0%,rgba(5,8,11,.82) 28%,rgba(5,8,11,.3) 54%,rgba(5,8,11,0) 74%),
 linear-gradient(0deg,rgba(5,8,11,.5),rgba(5,8,11,0) 38%)}
#menu-root .main-col{display:flex;flex-direction:column;gap:26px;width:min(400px,86vw)}
#menu-root .main-col>*{animation:menu-in .5s steps(7) both}
#menu-root .main-col>*:nth-child(2){animation-delay:.12s}
#menu-root .main-col>*:nth-child(3){animation-delay:.22s}
@keyframes menu-in{from{opacity:0;transform:translateX(-14px)}}
@keyframes menu-glow{50%{filter:drop-shadow(0 0 16px rgba(255,150,50,.3))}}
#menu-root .kicker{display:flex;align-items:center;gap:10px;font-size:11px;letter-spacing:3px;color:#e0a44a;text-transform:uppercase}
#menu-root .kicker::before{content:'';flex:none;width:20px;height:3px;background:#e0a44a}
#menu-root .wordmark{position:relative;margin:16px 0 12px;font-weight:400;font-size:clamp(48px,8.4vw,84px);line-height:.88;letter-spacing:2px;text-transform:uppercase;color:#ffc25c;animation:menu-glow 5s ease-in-out infinite;
 text-shadow:0 4px 0 #a75f1c,0 8px 0 #0a0c0f,4px 8px 0 #0a0c0f,-4px 8px 0 #0a0c0f,4px 0 0 #0a0c0f,-4px 0 0 #0a0c0f,0 -4px 0 #0a0c0f}
#menu-root .wordmark::after{content:attr(data-text);position:absolute;left:0;top:0;text-shadow:none;color:transparent;background:linear-gradient(180deg,#fff3d2 16%,#ffbe4c 58%,#e8801f);-webkit-background-clip:text;background-clip:text}
#menu-root .rule{display:flex;align-items:center;gap:8px;margin-bottom:14px}
#menu-root .rule b{flex:none;width:5px;height:5px;background:#e0a44a;box-shadow:8px 0 0 #46525d,16px 0 0 #303a43}
#menu-root .rule i{flex:1;height:2px;background:linear-gradient(90deg,#3d4852,rgba(61,72,82,0))}
#menu-root .tag{display:block;font-family:monospace;font-size:13.5px;line-height:1.6;color:#b0a992}
#menu-root .tag b{font-weight:400;color:#e0a44a}
#menu-root .main-nav{gap:10px}
#menu-root .main-nav .btn{display:flex;align-items:center;gap:12px;padding:14px 16px;font-size:15px;transition:transform .08s steps(2)}
#menu-root .main-nav .btn span{flex:1}
#menu-root .main-nav .btn i{font-style:normal;font-size:10px;letter-spacing:0;color:#8b96a0}
#menu-root .main-nav .btn.primary i{color:#7a4b16}
#menu-root .main-nav .btn:hover i,#menu-root .main-nav .btn:focus-visible i{color:#ffd27a}
#menu-root .main-nav .btn.primary:hover i,#menu-root .main-nav .btn.primary:focus-visible i{color:#5c3809}
#menu-root .main-nav .btn:hover,#menu-root .main-nav .btn:focus-visible{transform:translateX(7px)}
#menu-root .foot{margin:0;font-size:10px;line-height:1.8;color:#77808a;letter-spacing:1px}
#menu-root .foot b{font-weight:400;color:#a9793a}
@media (prefers-reduced-motion:reduce){#menu-root .main-col>*,#menu-root .wordmark{animation:none}#menu-root .main-nav .btn{transition:none}}
#menu-root .menu-list{display:flex;flex-direction:column;gap:12px}
#menu-root .menu-list.pad{padding:22px 24px 24px}
#menu-root .btn{--bg:#343c45;--hi:#4f5a64;--lo:#232930;position:relative;font:400 14px Silkscreen,monospace;letter-spacing:1px;text-transform:uppercase;color:#efe6d2;background:var(--bg);border:0;margin:3px;padding:12px 18px;text-align:left;cursor:pointer;box-shadow:0 0 0 3px #0a0c0f,inset 0 3px 0 var(--hi),inset 0 -3px 0 var(--lo)}
#menu-root .btn:hover,#menu-root .btn:focus-visible{--bg:#434d57;color:#ffd27a;outline:none}
#menu-root .btn:active{box-shadow:0 0 0 3px #0a0c0f,inset 0 3px 0 var(--lo),inset 0 -3px 0 var(--hi);transform:translateY(1px)}
#menu-root .menu-list .btn:hover::before,#menu-root .menu-list .btn:focus-visible::before{content:'';position:absolute;left:-17px;top:50%;margin-top:-6px;border:6px solid transparent;border-left:7px solid #ffd27a}
#menu-root .btn.primary{--bg:#c7812f;--hi:#f0b25e;--lo:#8a5220;color:#1a130b}
#menu-root .btn.primary:hover,#menu-root .btn.primary:focus-visible{--bg:#dc9540;color:#140e07}
#menu-root .btn.danger{--bg:#5a2a24;--hi:#7c3c32;--lo:#3a1a16}
#menu-root .btn.danger:hover{--bg:#6e342c;color:#ffd0c0}
#menu-root .btn.small{font-size:11px;padding:9px 10px;text-align:center}
#menu-root .menu-list .btn small{float:right;font-size:10px;color:#e0a44a;letter-spacing:0}
#menu-root .panel *{scrollbar-width:thin;scrollbar-color:#56616b #101318}
#menu-root .btn.tiny{font-size:13px;padding:5px 10px;margin:2px}
#menu-root .panel{position:relative;display:flex;flex-direction:column;width:min(560px,92vw);max-height:calc(100vh - 48px);background:#1b2027;box-shadow:0 0 0 3px #0a0c0f,0 0 0 6px #56616b,0 0 0 9px #0a0c0f,0 28px 70px rgba(0,0,0,.6)}
#menu-root .panel::before{content:'';position:absolute;inset:-6px;pointer-events:none;background:
 radial-gradient(circle,#dfe5e8 0 1.4px,#2a3036 1.5px 2.2px,transparent 2.4px) left top/6px 6px no-repeat,
 radial-gradient(circle,#dfe5e8 0 1.4px,#2a3036 1.5px 2.2px,transparent 2.4px) right top/6px 6px no-repeat,
 radial-gradient(circle,#dfe5e8 0 1.4px,#2a3036 1.5px 2.2px,transparent 2.4px) left bottom/6px 6px no-repeat,
 radial-gradient(circle,#dfe5e8 0 1.4px,#2a3036 1.5px 2.2px,transparent 2.4px) right bottom/6px 6px no-repeat}
#menu-root .panel.narrow{width:min(420px,92vw)}
#menu-root .panel.wide{width:min(760px,94vw)}
#menu-root .panel.creator{width:min(900px,96vw)}
#menu-root .panel-head{display:flex;align-items:center;gap:14px;padding:14px 20px;background:#252c35;border-bottom:3px solid #0a0c0f;box-shadow:inset 0 3px 0 #323a44}
#menu-root .panel-head h2{margin:0;font-weight:400;font-size:20px;letter-spacing:1px}
#menu-root .panel-head p{margin:6px 0 0;font-size:11px;color:#e0a44a}
#menu-root .panel-foot{display:flex;justify-content:space-between;gap:12px;padding:12px 20px;background:#20262e;border-top:3px solid #0a0c0f}
#menu-root .creator-body{display:grid;grid-template-columns:auto 1fr;gap:26px;padding:20px;overflow:auto}
@media (max-width:760px){#menu-root .creator-body{grid-template-columns:1fr}#menu-root .preview-col{justify-self:center}}
#menu-root .preview-box{position:relative;box-shadow:0 0 0 3px #0a0c0f,0 0 0 6px #3a434c,0 0 0 9px #0a0c0f;margin:9px}
#menu-root #cc-preview{display:block;width:288px;height:312px;image-rendering:pixelated}
#menu-root .nameplate{position:absolute;left:50%;top:16px;transform:translateX(-50%);padding:5px 10px;background:rgba(10,12,15,.8);font-size:12px;color:#ffd27a;white-space:nowrap}
#menu-root .seg{display:flex;margin:18px 9px 0;box-shadow:0 0 0 3px #0a0c0f}
#menu-root .seg button{flex:1;font:400 10px Silkscreen,monospace;color:#b9c0c5;background:#262c33;border:0;padding:9px 4px;cursor:pointer;box-shadow:inset -3px 0 0 #0a0c0f}
#menu-root .seg button:last-child{box-shadow:none}
#menu-root .seg button:hover{color:#ffd27a}
#menu-root .seg button.on{background:#c7812f;color:#1a130b}
#menu-root .row2{display:flex;gap:12px;margin:16px 6px 0}
#menu-root .row2 .btn{flex:1}
#menu-root .field{display:flex;flex-direction:column;gap:8px;font-size:12px;color:#c9c1ad;margin-bottom:10px}
#menu-root em{font-style:normal;color:#e0a44a;margin-left:8px}
#menu-root .field input[type=text]{font:400 16px Silkscreen,monospace;color:#efe6d2;background:#101318;border:0;margin:3px;padding:10px 12px;box-shadow:0 0 0 3px #0a0c0f,inset 0 3px 0 #07090b;outline:none;user-select:text}
#menu-root .field input[type=text]:focus{box-shadow:0 0 0 3px #e0a44a,inset 0 3px 0 #07090b}
#menu-root .opt-row{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:10px 0;border-bottom:2px dashed #2a3139}
#menu-root .opt-row:last-child{border-bottom:0}
#menu-root .opt-label{font-size:12px;color:#c9c1ad;min-width:140px}
#menu-root .swatches{display:flex;flex-wrap:wrap;gap:9px;justify-content:flex-end}
#menu-root .swatch{width:26px;height:26px;border:0;padding:0;cursor:pointer;box-shadow:0 0 0 2px #0a0c0f,inset 0 3px 0 rgba(255,255,255,.28),inset 0 -3px 0 rgba(0,0,0,.32)}
#menu-root .swatch:hover{transform:translateY(-2px)}
#menu-root .swatch:focus-visible{outline:2px solid #ffd27a;outline-offset:4px}
#menu-root .swatch.on{box-shadow:0 0 0 2px #0a0c0f,0 0 0 5px #ffd27a,inset 0 3px 0 rgba(255,255,255,.28),inset 0 -3px 0 rgba(0,0,0,.32)}
#menu-root .cycler{display:flex;align-items:center;gap:8px}
#menu-root .cycler span{min-width:150px;text-align:center;font-size:12px;padding:8px;background:#101318;box-shadow:0 0 0 2px #0a0c0f}
#menu-root .keys-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:0 28px;padding:16px 22px 12px;overflow:auto;max-height:44vh;align-content:start}
#menu-root .key-group{break-inside:avoid;margin-bottom:12px}
#menu-root .key-group h4{margin:0 0 4px;padding:6px 0;font-weight:400;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#e0a44a;border-bottom:2px solid #2a3139}
#menu-root .key-row{display:flex;align-items:center;gap:14px;padding:8px 0;font-size:11px;color:#c9c1ad;border-bottom:2px dashed #2a3139}
#menu-root .key-row:last-child{border-bottom:0}
#menu-root .keys{display:flex;flex-wrap:wrap;gap:6px;min-width:128px}
#menu-root kbd{font:400 10px Silkscreen,monospace;color:#1a130b;background:#d9cfb8;padding:5px 7px 6px;box-shadow:0 0 0 2px #0a0c0f,inset 0 -3px 0 #9d9278}
#menu-root .options{display:flex;flex-direction:column;gap:20px;padding:22px 24px 24px}
#menu-root input[type=range]{-webkit-appearance:none;appearance:none;height:12px;margin:8px 3px;background:#101318;box-shadow:0 0 0 3px #0a0c0f;cursor:pointer}
#menu-root input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:24px;border:0;background:#c7812f;box-shadow:0 0 0 3px #0a0c0f,inset 0 3px 0 #f0b25e,inset 0 -3px 0 #8a5220}
#menu-root input[type=range]::-moz-range-thumb{width:16px;height:24px;border:0;border-radius:0;background:#c7812f;box-shadow:0 0 0 3px #0a0c0f}
#menu-root input[type=range]:focus-visible{outline:2px solid #ffd27a;outline-offset:6px}
#menu-root .recipes-head{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;padding:12px 22px 0;border-top:3px solid #0a0c0f}
#menu-root .recipes-head h3{margin:0;font-weight:400;font-size:14px;color:#e0a44a}
#menu-root .recipes-head small{font:11px monospace;color:#7d858b}
#menu-root .search{display:flex;align-items:center;gap:10px}
#menu-root .search input{font:400 12px Silkscreen,monospace;color:#efe6d2;background:#101318;border:0;margin:3px;padding:9px 11px;width:min(280px,54vw);box-shadow:0 0 0 3px #0a0c0f,inset 0 3px 0 #07090b;outline:none;user-select:text}
#menu-root .search input:focus{box-shadow:0 0 0 3px #e0a44a,inset 0 3px 0 #07090b}
#menu-root .search em{margin:0;font:11px monospace;color:#9aa3a9;white-space:nowrap}
#menu-root .recipes{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:0 28px;padding:8px 22px 20px;overflow:auto;max-height:34vh;align-content:start}
#menu-root .recipe{display:flex;flex-direction:column;gap:4px;padding:8px 0;border-bottom:2px dashed #2a3139;font-size:11px}
#menu-root .recipe b{display:flex;align-items:center;font-weight:400}
#menu-root .recipe .ico{display:inline-block;flex:none;width:24px;height:24px;margin-right:9px;background-image:var(--atlas);background-size:var(--atlas-w) 24px;background-position:calc(var(--i) * -24px) 0;image-rendering:pixelated}
#menu-root .recipe span{padding-left:33px;font:12px monospace;color:#b9b2a0}
#menu-root .loadbar{height:18px;background:#101318;box-shadow:0 0 0 3px #0a0c0f;margin:3px}
#menu-root .loadbar span{display:block;height:100%;width:0;background:#c7812f;box-shadow:inset 0 3px 0 #f0b25e,inset 0 -3px 0 #8a5220}
#menu-root #loading-pct{margin:0;text-align:right}
#menu-root .sizes{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:18px;padding:22px}
#menu-root .size-card{display:flex;flex-direction:column;align-items:center;gap:8px;font:400 14px Silkscreen,monospace;color:#efe6d2;background:#262c33;border:0;margin:3px;padding:16px 12px 18px;cursor:pointer;box-shadow:0 0 0 3px #0a0c0f,inset 0 3px 0 #3a434c,inset 0 -3px 0 #1a1f25}
#menu-root .size-card:hover,#menu-root .size-card:focus-visible{background:#343c45;color:#ffd27a;outline:none;transform:translateY(-2px)}
#menu-root .size-card small{font-size:10px;color:#e0a44a}
#menu-root .size-card i{font:12px monospace;color:#9aa3a9;text-align:center}
#menu-root .size-art{display:block;height:54px;background:linear-gradient(#5b8fd0 0 40%,#62b04a 40% 46%,#6b4a30 46% 62%,#5c5f6b 62%);box-shadow:0 0 0 3px #0a0c0f}
#menu-root .size-art.s1{width:60px}#menu-root .size-art.s2{width:110px}#menu-root .size-art.s3{width:160px}
#menu-root .check{position:relative;display:flex;align-items:center;gap:14px;font-size:12px;color:#c9c1ad;cursor:pointer}
#menu-root .check input{position:absolute;opacity:0}
#menu-root .check .box{display:grid;place-items:center;width:18px;height:18px;margin:3px;background:#101318;box-shadow:0 0 0 3px #0a0c0f}
#menu-root .check input:checked+.box{background:#c7812f;box-shadow:0 0 0 3px #0a0c0f,inset 0 3px 0 #f0b25e}
#menu-root .check input:checked+.box::after{content:'';width:6px;height:6px;background:#1a130b}
#menu-root .check input:focus-visible+.box{box-shadow:0 0 0 3px #ffd27a}
#menu-root [hidden]{display:none!important}
#menu-root .options.scroll{max-height:64vh;overflow:auto;gap:16px}
#menu-root .opt-head{margin:4px 0 -4px;font-weight:400;font-size:13px;color:#e0a44a;padding-bottom:6px;border-bottom:2px dashed #2a3139}
#menu-root .opt-note{margin:-8px 0 0;font:12px monospace;color:#9aa3a9;line-height:1.4}
#menu-root .fps-limit{display:grid;grid-template-columns:1fr 1fr;gap:14px}
#menu-root .fps-limit .field{margin-bottom:0}
#menu-root select{font:400 12px Silkscreen,monospace;color:#efe6d2;background:#101318;border:0;margin:3px;padding:9px 10px;box-shadow:0 0 0 3px #0a0c0f,inset 0 3px 0 #07090b;outline:none;cursor:pointer}
#menu-root select:focus-visible{box-shadow:0 0 0 3px #e0a44a}
#menu-root .field input[type=number]{font:400 14px Silkscreen,monospace;color:#efe6d2;background:#101318;border:0;margin:3px;padding:8px 10px;box-shadow:0 0 0 3px #0a0c0f,inset 0 3px 0 #07090b;outline:none;width:auto}
#menu-root .field input[type=number]:focus{box-shadow:0 0 0 3px #e0a44a}

/* ---------- Novo jogo: mundo e personagem ---------- */
#menu-root .screen.studio{padding:16px;background:radial-gradient(ellipse 80% 70% at 50% 45%,rgba(6,8,11,.42),rgba(6,8,11,.88));backdrop-filter:blur(2px)}
#menu-root .shell{position:relative;display:flex;flex-direction:column;width:min(1120px,100%);max-height:calc(100vh - 32px);background:#1b2027;box-shadow:0 0 0 3px #0a0c0f,0 0 0 6px #56616b,0 0 0 9px #0a0c0f,0 30px 80px rgba(0,0,0,.65);animation:shell-in .35s steps(5) both}
#menu-root .shell.world-shell{width:min(1000px,100%)}
@keyframes shell-in{from{opacity:0;transform:translateY(12px)}}
#menu-root .shell-head{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px 24px;padding:16px 22px;background:linear-gradient(180deg,#29313b,#222931);border-bottom:3px solid #0a0c0f;box-shadow:inset 0 3px 0 #343d48}
#menu-root .shell-head h2{margin:0;font-weight:400;font-size:22px;letter-spacing:1px;color:#ffd27a;text-shadow:0 3px 0 #0a0c0f}
#menu-root .shell-head p{margin:6px 0 0;font:13px monospace;color:#b0a992}
#menu-root .steps{display:flex;align-items:center;gap:6px;margin:0;padding:0;list-style:none;font-size:10px;letter-spacing:1px;color:#6f7982}
#menu-root .steps li{display:flex;align-items:center;gap:8px}
#menu-root .steps li+li::before{content:'';width:22px;height:3px;margin-right:2px;background:#39424c}
#menu-root .steps li.done+li::before{background:#c7812f}
#menu-root .steps b{display:grid;place-items:center;width:22px;height:22px;font-weight:400;color:#8b96a0;background:#141920;box-shadow:0 0 0 2px #0a0c0f,inset 0 0 0 2px #39424c}
#menu-root .steps li.on{color:#ffd27a}
#menu-root .steps li.on b{color:#1a130b;background:#e0a44a;box-shadow:0 0 0 2px #0a0c0f,inset 0 -3px 0 #a86a24}
#menu-root .steps li.done{color:#c9a978}
#menu-root .steps li.done b{color:#e0a44a;box-shadow:0 0 0 2px #0a0c0f,inset 0 0 0 2px #c7812f}
#menu-root .shell-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 20px;background:#20262e;border-top:3px solid #0a0c0f}
#menu-root .shell-foot .hint{flex:1;text-align:center;font:12px monospace;color:#7d858b}
#menu-root .shell-foot .hint kbd{margin:0 3px}
#menu-root .btn.go{padding:13px 22px;font-size:15px}
#menu-root .btn.go::after{content:' ▶';font-size:11px}

/* Mundo */
#menu-root .world-body{display:flex;flex-direction:column;gap:20px;padding:22px;overflow:auto}
#menu-root .world-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
#menu-root .world-card{position:relative;display:flex;flex-direction:column;gap:10px;margin:3px;padding:0 0 14px;font:400 14px Silkscreen,monospace;color:#efe6d2;text-align:left;background:#232931;border:0;cursor:pointer;box-shadow:0 0 0 3px #0a0c0f,inset 0 -3px 0 #181c22;transition:transform .1s steps(2)}
#menu-root .world-card:hover{transform:translateY(-3px);background:#29303a}
#menu-root .world-card:focus-visible{outline:none;box-shadow:0 0 0 3px #0a0c0f,0 0 0 6px #ffd27a}
#menu-root .world-card.on{background:#2c2a26;box-shadow:0 0 0 3px #0a0c0f,0 0 0 6px #e0a44a,0 0 28px rgba(224,164,74,.25)}
#menu-root .world-card canvas{display:block;width:100%;aspect-ratio:16/9;image-rendering:pixelated;border-bottom:3px solid #0a0c0f}
#menu-root .world-card .wc-head{display:flex;align-items:baseline;justify-content:space-between;gap:8px;padding:0 14px}
#menu-root .world-card .wc-head b{font-weight:400;font-size:17px}
#menu-root .world-card.on .wc-head b{color:#ffd27a}
#menu-root .world-card .wc-head small{font-size:10px;color:#e0a44a;white-space:nowrap}
#menu-root .world-card p{margin:0;padding:0 14px;font:12px/1.45 monospace;color:#a9a391;min-height:34px}
#menu-root .world-card .badge{position:absolute;top:10px;right:10px;padding:5px 8px;font-size:9px;letter-spacing:1px;color:#1a130b;background:#e0a44a;box-shadow:0 0 0 2px #0a0c0f;opacity:0;transform:translateY(-4px);transition:.12s steps(2)}
#menu-root .world-card.on .badge{opacity:1;transform:none}
#menu-root .bars{display:grid;gap:6px;padding:0 14px}
#menu-root .bar{display:grid;grid-template-columns:92px 1fr;align-items:center;gap:8px;font-size:9px;color:#8b96a0;letter-spacing:1px}
#menu-root .bar span{display:flex;gap:3px}
#menu-root .bar i{flex:1;height:7px;background:#12161b;box-shadow:0 0 0 1px #0a0c0f}
#menu-root .bar i.f{background:#c7812f;box-shadow:0 0 0 1px #0a0c0f,inset 0 2px 0 #f0b25e}
#menu-root .world-card.on .bar i.f{background:#e0a44a}
#menu-root .seed-row{display:grid;grid-template-columns:1fr;align-items:end;gap:14px 22px;padding:16px 18px;background:#161a20;box-shadow:0 0 0 3px #0a0c0f}
#menu-root .seed-row .field{margin:0}
#menu-root .seed-row .field>span{display:flex;align-items:center;gap:10px}
#menu-root .seed-row .inline{display:flex;align-items:center;gap:6px}
#menu-root .seed-row .inline input{flex:1;min-width:0}
#menu-root .seed-row .opt-note{margin:0;grid-column:1/-1}
#menu-root .icon-btn{display:grid;place-items:center;flex:none;width:40px;height:40px;padding:0;font-size:18px;text-align:center}

/* Personagem */
#menu-root .cc-main{display:grid;grid-template-columns:minmax(280px,420px) minmax(0,1fr);min-height:0;flex:1}
#menu-root .cc-stage{display:flex;flex-direction:column;gap:14px;padding:20px;background:#161a20;border-right:3px solid #0a0c0f;overflow:auto}
#menu-root .stage-frame{position:relative;box-shadow:0 0 0 3px #0a0c0f,0 0 0 6px #3a434c,0 0 0 9px #0a0c0f;margin:9px}
#menu-root #cc-preview{display:block;width:100%;height:auto;aspect-ratio:96/86;image-rendering:pixelated}
#menu-root .stage-frame .nameplate{top:12px;font-size:13px;padding:6px 12px;background:rgba(10,12,15,.78);box-shadow:0 0 0 2px #0a0c0f}
#menu-root .stage-turn{position:absolute;bottom:10px;display:grid;place-items:center;width:34px;height:34px;padding:0;font-size:13px;text-align:center}
#menu-root .stage-turn.l{left:10px}#menu-root .stage-turn.r{right:10px}
#menu-root .cc-stage .seg{margin:0 6px}
#menu-root .name-row{display:flex;align-items:end;gap:8px;margin:0 6px}
#menu-root .name-row .field{flex:1;margin:0}
#menu-root .name-row .field input{width:100%;margin:3px 0}
#menu-root .cc-summary{margin:0 6px;font:12px/1.5 monospace;color:#8b96a0}
#menu-root .cc-summary b{font-weight:400;color:#c9c1ad}
#menu-root .cc-edit{display:flex;flex-direction:column;min-height:0;min-width:0}
#menu-root .tabs{display:flex;gap:0;padding:0 14px;background:#20262e;border-bottom:3px solid #0a0c0f}
#menu-root .tab{position:relative;flex:1;font:400 12px Silkscreen,monospace;letter-spacing:1px;color:#8b96a0;background:none;border:0;padding:15px 8px 13px;cursor:pointer}
#menu-root .tab:hover,#menu-root .tab:focus-visible{color:#efe6d2;outline:none}
#menu-root .tab.on{color:#ffd27a}
#menu-root .tab.on::after{content:'';position:absolute;left:8px;right:8px;bottom:-3px;height:4px;background:#e0a44a}
#menu-root .tab .n{display:inline-block;margin-left:6px;padding:2px 5px;font-size:9px;color:#8b96a0;background:#141920}
#menu-root .tab.on .n{color:#1a130b;background:#c7812f}
#menu-root .tab-body{flex:1;min-height:0;overflow:auto;padding:6px 22px 18px}
#menu-root .cc-sec{padding:16px 0;border-bottom:2px dashed #2a3139}
#menu-root .cc-sec:last-child{border-bottom:0}
#menu-root .cc-sec.off{opacity:.45}
#menu-root .cc-sec h4{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin:0 0 12px;font-weight:400;font-size:12px;color:#c9c1ad}
#menu-root .cc-sec h4 em{margin:0;font-size:11px;color:#e0a44a}
#menu-root .cc-sec .why{display:block;margin:-4px 0 10px;font:12px monospace;color:#8b96a0}
#menu-root .tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(84px,1fr));gap:10px}
#menu-root .tile{display:flex;flex-direction:column;align-items:center;gap:6px;margin:2px;padding:8px 4px 7px;font:400 9px Silkscreen,monospace;color:#9aa3a9;background:#232931;border:0;cursor:pointer;box-shadow:0 0 0 2px #0a0c0f,inset 0 -3px 0 #191d23}
#menu-root .tile canvas{display:block;height:56px;width:auto;image-rendering:pixelated;background:radial-gradient(circle at 50% 60%,#39434e,#262d35 70%)}
#menu-root .tile canvas.th-body{height:84px}
#menu-root .tile span{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#menu-root .tile:hover,#menu-root .tile:focus-visible{color:#efe6d2;background:#2c343e;outline:none;transform:translateY(-2px)}
#menu-root .tile.on{color:#ffd27a;background:#2e2b25;box-shadow:0 0 0 2px #0a0c0f,0 0 0 5px #e0a44a}
#menu-root .cc-sec .swatches{justify-content:flex-start;gap:10px}
#menu-root .cc-sec .swatch{width:30px;height:30px}
#menu-root .swatch.sole{background-image:linear-gradient(0deg,var(--sole) 0 7px,transparent 7px)!important}
#menu-root .tab-foot{display:flex;flex-wrap:wrap;gap:8px;padding:12px 18px;border-top:3px solid #0a0c0f;background:#1d232a}
#menu-root .tab-foot .btn{flex:1}
@media (max-width:860px){
 #menu-root .cc-main{grid-template-columns:1fr;flex:none}
 #menu-root .shell-foot .hint{display:none}
 #menu-root .shell-foot{position:sticky;bottom:0;z-index:2}
 #menu-root .steps li:not(.on) span{display:none}
 #menu-root .cc-stage{border-right:0;border-bottom:3px solid #0a0c0f;overflow:visible}
 #menu-root .stage-frame{width:min(300px,100%);align-self:center}
 #menu-root .cc-edit{min-height:auto}
 #menu-root .tab-body{overflow:visible}
 #menu-root .shell{overflow:auto}
 #menu-root .world-cards{grid-template-columns:1fr}
 #menu-root .world-card canvas{aspect-ratio:3/1}
}
#menu-root .loading-art{display:block;width:100%;aspect-ratio:3/1;image-rendering:pixelated;box-shadow:0 0 0 3px #0a0c0f}
#menu-root .tip{margin:0;min-height:36px;font:12px/1.5 monospace;color:#b0a992}
#menu-root .tip b{font-weight:400;color:#e0a44a}
@media (prefers-reduced-motion:reduce){#menu-root .shell{animation:none}#menu-root .world-card,#menu-root .tile{transition:none}}
`;

const MENU_HTML = `
<section class="screen main" data-screen="main">
  <div class="main-col">
    <div class="logo">
      <span class="kicker">Um mundo vivo para desbravar</span>
      <h1 class="wordmark" data-text="Valdoria">Valdoria</h1>
      <div class="rule"><b></b><i></i></div>
      <span class="tag">Explore as profundezas. Construa seu refúgio.<br>Encontre <b>seu lugar</b> na natureza.</span>
    </div>
    <nav class="menu-list main-nav" aria-label="Menu principal">
      <button class="btn primary" data-go="world"><span>Novo jogo</span><i>Enter</i></button>
      <button class="btn" data-action="continue-worlds" disabled><span>Continuar</span><i>Nenhum mundo salvo</i></button>
      <button class="btn" data-go="howto"><span>Como jogar</span><i>Controles e receitas</i></button>
      <button class="btn" data-go="options"><span>Opções</span><i>Vídeo e áudio</i></button>
    </nav>
    <p class="foot">Florestas, cavernas e novos horizontes.<br><b>Valdoria</b> · sua aventura começa aqui.</p>
  </div>
</section>

<section class="screen studio" data-screen="world" hidden>
  <div class="shell world-shell" role="dialog" aria-labelledby="world-title">
    <header class="shell-head">
      <div><h2 id="world-title">Escolha o seu mundo</h2><p>Cada mundo é gerado do zero — ninguém nunca pisou nele.</p></div>
      <ol class="steps" aria-label="Etapas"><li class="on"><b>1</b><span>Mundo</span></li><li><b>2</b><span>Personagem</span></li><li><b>3</b><span>Aventura</span></li></ol>
    </header>
    <div class="world-body">
      <div class="world-cards" role="radiogroup" aria-label="Tamanho do mundo">${WORLD_CARDS.map((w) => `
        <button class="world-card" role="radio" data-action="size" data-size="${w.size}">
          <canvas width="160" height="90" data-art="${w.size}"></canvas><span class="badge">Escolhido</span>
          <span class="wc-head"><b>${w.name}</b><small>${w.dims} blocos</small></span>
          <span class="bars">${[['Extensão', w.bars[0]], ['Profundidade', w.bars[1]], ['Variedade', w.bars[2]]].map(([k, v]) =>
            `<span class="bar">${k}<span>${[1, 2, 3].map((i) => `<i class="${i <= v ? 'f' : ''}"></i>`).join('')}</span></span>`).join('')}</span>
          <p><b style="font-weight:400;color:#e0a44a">${w.time}.</b> ${w.desc}</p>
        </button>`).join('')}
      </div>
      <div class="seed-row">
        <label class="field"><span>Nome do mundo</span><input id="world-name" type="text" maxlength="48" placeholder="Minha aventura" autocomplete="off"></label>
        <label class="field"><span>Semente do mundo <em>opcional</em></span>
          <span class="inline"><input id="world-seed" type="text" maxlength="24" placeholder="Aleatória" autocomplete="off" spellcheck="false"><button class="btn icon-btn" data-action="seed-dice" title="Sortear semente" aria-label="Sortear semente">⚄</button></span>
        </label>
        <p class="opt-note">A mesma semente e o mesmo tamanho geram sempre o mesmo mundo — compartilhe com os amigos. Deixe vazio para uma surpresa.</p>
        <label class="check"><input id="world-skip-intro" type="checkbox"><span class="box"></span>Pular cutscene inicial</label>
      </div>
    </div>
    <footer class="shell-foot"><button class="btn" data-action="back">Voltar</button><span class="hint"><kbd>←</kbd><kbd>→</kbd> escolher · <kbd>Enter</kbd> continuar</span><button class="btn primary go" data-action="world-next">Personagem</button></footer>
  </div>
</section>

<section class="screen studio" data-screen="loading" hidden>
  <div class="panel" role="dialog" aria-labelledby="loading-title">
    <header class="panel-head"><div><h2 id="loading-title">Gerando mundo</h2><p id="loading-label">Preparando…</p></div></header>
    <div class="options">
      <canvas class="loading-art" id="loading-art" width="160" height="54"></canvas>
      <div class="loadbar"><span id="loading-fill"></span></div>
      <em id="loading-pct">0%</em>
      <p class="tip" id="loading-tip"></p>
    </div>
  </div>
</section>

<section class="screen studio" data-screen="creator" hidden>
  <div class="shell" role="dialog" aria-labelledby="cc-title">
    <header class="shell-head">
      <div><h2 id="cc-title">Criar personagem</h2><p>Quem estava a bordo do voo 237?</p></div>
      <ol class="steps" id="cc-steps" aria-label="Etapas"><li class="done"><b>✓</b><span>Mundo</span></li><li class="on"><b>2</b><span>Personagem</span></li><li><b>3</b><span>Aventura</span></li></ol>
    </header>
    <div class="cc-main">
      <div class="cc-stage">
        <div class="stage-frame">
          <canvas id="cc-preview" width="96" height="86"></canvas>
          <div class="nameplate" id="cc-nameplate"></div>
          <button class="btn stage-turn l" data-action="turn" data-dir="-1" aria-label="Virar para a esquerda">◀</button>
          <button class="btn stage-turn r" data-action="turn" data-dir="1" aria-label="Virar para a direita">▶</button>
        </div>
        <div class="seg" role="group" aria-label="Animação da prévia">
          <button data-action="mode" data-mode="idle">Parado</button><button data-action="mode" data-mode="walk">Andar</button><button data-action="mode" data-mode="run">Correr</button><button data-action="mode" data-mode="dance">Dançar</button>
        </div>
        <div class="name-row">
          <label class="field"><span>Nome</span><input id="cc-name" type="text" maxlength="14" autocomplete="off" spellcheck="false"></label>
          <button class="btn icon-btn" data-action="name-dice" title="Sortear nome" aria-label="Sortear nome">⚄</button>
        </div>
        <p class="cc-summary" id="cc-summary"></p>
      </div>
      <div class="cc-edit">
        <nav class="tabs" role="tablist" aria-label="Categorias">${CREATOR_TABS.map((t) =>
          `<button class="tab" role="tab" data-action="tab" data-tab="${t.id}">${t.label}<span class="n">${t.rows.reduce((n, r) => n + r.list.length, 0)}</span></button>`).join('')}</nav>
        <div class="tab-body" id="cc-rows" role="tabpanel"></div>
        <div class="tab-foot">
          <button class="btn small" data-action="random-tab">⚄ Sortear esta aba</button>
          <button class="btn small" data-action="random">⚄ Sortear tudo</button>
          <button class="btn small" data-action="reset">↺ Desfazer tudo</button>
        </div>
      </div>
    </div>
    <footer class="shell-foot"><button class="btn" data-action="back">Voltar</button><span class="hint" id="cc-hint"><kbd>Q</kbd><kbd>E</kbd> trocar de aba · <kbd>R</kbd> sortear</span><button class="btn primary go" id="cc-confirm" data-action="confirm">Começar aventura</button></footer>
  </div>
</section>


<section class="screen dim" data-screen="howto" hidden>
  <div class="panel wide" role="dialog" aria-labelledby="howto-title">
    <header class="panel-head"><div><h2 id="howto-title">Como jogar</h2><p>Sobreviva, vasculhe os destroços e construa um abrigo.</p></div></header>
    <div class="keys-grid" id="controls-list"></div>
    <div class="recipes-head">
      <h3>Receitas <small>(crie a estação indicada e abra com o botão direito; a posição dos ingredientes não importa)</small></h3>
      <label class="search"><input id="recipe-search" type="search" placeholder="Buscar receita ou ingrediente" autocomplete="off" spellcheck="false"><em id="recipe-count"></em></label>
    </div>
    <div class="recipes" id="recipe-list"></div>
    <footer class="panel-foot"><button class="btn" data-action="back">Voltar</button></footer>
  </div>
</section>

<section class="screen dim" data-screen="options" hidden>
  <div class="panel narrow" role="dialog" aria-labelledby="options-title">
    <header class="panel-head"><div><h2 id="options-title">Opções</h2><p>Salvas neste navegador.</p></div></header>
    <div class="options scroll">
      <h3 class="opt-head">Vídeo</h3>
      <label class="field"><span>Taxa de quadros</span>
        <select id="opt-fps-mode">
          <option value="vsync">V-Sync (taxa do monitor)</option>
          <option value="unlimited">Sem limite</option>
          <option value="limit">Limitar FPS</option>
        </select>
      </label>
      <div class="fps-limit" id="opt-fps-limit-row">
        <label class="field"><span>Limite</span>
          <select id="opt-fps-limit">${FPS_PRESETS.map((v) => `<option value="${v}">${v} FPS · ${v} Hz</option>`).join('')}<option value="custom">Personalizado</option></select>
        </label>
        <label class="field"><span>Valor (15–1000)</span><input id="opt-fps-custom" type="number" min="15" max="1000" step="1"></label>
      </div>
      <p class="opt-note" id="opt-fps-note"></p>
      <label class="check"><input id="opt-showfps" type="checkbox"><span class="box"></span>Mostrar FPS na tela</label>
      <label class="check"><input id="opt-shake" type="checkbox"><span class="box"></span>Tremida da câmera</label>
      <label class="check"><input id="opt-shaders" type="checkbox"><span class="box"></span>Shaders · iluminação cinematográfica</label>
      <p class="opt-note">Luz direcional, sombras de telhados e árvores e interiores iluminados em tons quentes. Desative para melhorar o desempenho.</p>
      <button class="btn small" data-action="fullscreen">Alternar tela cheia</button>

      <h3 class="opt-head">Áudio</h3>
      <label class="field"><span>Volume geral <em id="opt-vol-val"></em></span><input id="opt-vol" type="range" min="0" max="100" step="5"></label>
      <label class="field"><span>Música <em id="opt-music-val"></em></span><input id="opt-music" type="range" min="0" max="100" step="5"></label>
      <label class="check"><input id="opt-calm" type="checkbox"><span class="box"></span>Música calma (explorando)</label>
      <label class="check"><input id="opt-battle" type="checkbox"><span class="box"></span>Música de batalha (chefes)</label>

      <h3 class="opt-head">Interface</h3>
      <label class="check"><input id="opt-help" type="checkbox"><span class="box"></span>Mostrar controles na tela</label>
      <label class="field"><span>Tamanho do inventário e do mapa</span>
        <select id="opt-uiscale">
          <option value="auto">Automático (pelo tamanho da tela)</option>
          <option value="1">1× · compacto</option>
          <option value="2">2× · médio</option>
          <option value="3">3× · grande</option>
          <option value="4">4× · muito grande</option>
        </select>
      </label>
      <p class="opt-note" id="opt-uiscale-note"></p>
    </div>
    <footer class="panel-foot"><button class="btn" data-action="back">Voltar</button></footer>
  </div>
</section>

<section class="screen dim" data-screen="saved-worlds" hidden>
  <div class="panel wide" role="dialog" aria-labelledby="saved-world-title">
    <header class="panel-head"><div><h2 id="saved-world-title">Seus mundos</h2><p data-save-status>Escolha uma aventura para continuar.</p></div></header>
    <div id="saved-world-list" class="menu-list pad" style="overflow:auto;min-height:0"></div>
    <footer class="panel-foot" style="flex-wrap:wrap"><button class="btn" data-action="back">Voltar</button><small id="saved-world-folder" style="overflow-wrap:anywhere;font-size:10px"></small></footer>
  </div>
</section>

<section class="screen dim" data-screen="pause" hidden>
  <div class="panel narrow" role="dialog" aria-labelledby="pause-title">
    <header class="panel-head"><div><h2 id="pause-title">Pausado</h2><p id="pause-name"></p></div></header>
    <nav class="menu-list pad" aria-label="Menu de pausa">
      <button class="btn primary" data-action="resume">Continuar</button>
      <button class="btn" data-action="save-world">Salvar mundo</button>
      <small data-save-status aria-live="polite">Salvamento automático a cada 5 minutos.</small>
      <button class="btn" data-action="journal">Diário de missões <small>J</small></button>
      <button class="btn" data-go="creator" data-for="edit">Personagem</button>
      <button class="btn" data-go="howto">Como jogar</button>
      <button class="btn" data-go="options">Opções</button>
      <button class="btn danger" data-action="quit">Menu principal</button>
    </nav>
  </div>
</section>`;

const Menu = {
  game: null, root: null, stack: [], draft: null, atlas: null,
  mode: 'walk', facing: 1, creatorFor: 'new', raf: 0,

  init(g) {
    this.game = g;
    const style = document.createElement('style');
    style.textContent = MENU_CSS;
    document.head.append(style);
    const root = (this.root = document.createElement('div'));
    root.id = 'menu-root';
    root.innerHTML = MENU_HTML;
    document.body.append(root);
    root.querySelector('#controls-list').innerHTML = CONTROLS.map(([group, rows]) =>
      `<section class="key-group"><h4>${group}</h4>${rows.map(([keys, what]) =>
        `<div class="key-row"><span class="keys">${keys.map((k) => `<kbd>${k}</kbd>`).join('')}</span><span>${what}</span></div>`).join('')}</section>`).join('');
    // Lista de receitas gerada do motor de criação (js/crafting.js), com busca por nome
    this.buildRecipeList();
    root.querySelector('#recipe-search').addEventListener('input', (e) => this.filterRecipes(e.target.value));
    root.addEventListener('click', (e) => this.onClick(e));
    this.bindWorld();
    this.bindCreator();
    this.bindOptions();
    // Com um menu aberto, o teclado não chega ao jogo (nem ao painel admin)
    window.addEventListener('keydown', (e) => {
      if(WorldSaves.screenSaving){e.preventDefault();e.stopImmediatePropagation();return;}
      if (root.hidden) return;
      const editor=root.querySelector('.saved-world-editor');
      if(editor&&e.code==='Tab'){
        const controls=[...editor.querySelectorAll('input,button')].filter(el=>!el.disabled),first=controls[0],last=controls.at(-1);
        if(e.shiftKey&&(e.target===first||!editor.contains(e.target))){e.preventDefault();last?.focus();}
        else if(!e.shiftKey&&(e.target===last||!editor.contains(e.target))){e.preventDefault();first?.focus();}
        e.stopImmediatePropagation();return;
      }
      if (e.code === 'Escape' && root.querySelector('.saved-world-editor')) {
        e.preventDefault();root.querySelector('.saved-world-editor .world-edit-cancel')?.click();
      }
      else if (e.code === 'Escape') { e.preventDefault(); this.escape(); }
      else if (e.code === 'KeyP' && this.current() === 'pause') this.resume();
      else if (e.code === 'Enter' && e.target.id === 'cc-name') e.target.blur();
      else this.screenKey(e);
      e.stopImmediatePropagation();
    }, true);
    this.go('main', true);
    WorldSaves.init(g);
  },

  // Atalhos das telas de novo jogo (fora das caixas de texto)
  screenKey(e) {
    const id = this.current(), typing = e.target.matches?.('input, select, textarea');
    if (id === 'world') {
      if (e.code === 'Enter' && e.target.id === 'world-seed') this.worldNext();
      else if (!typing && (e.code === 'ArrowLeft' || e.code === 'ArrowRight')) {
        e.preventDefault();
        const n = WORLD_CARDS.length, i = WORLD_CARDS.findIndex((w) => w.size === this.worldSize);
        this.selectWorld(WORLD_CARDS[(i + (e.code === 'ArrowRight' ? 1 : -1) + n) % n].size);
        this.root.querySelector('.world-card.on').focus({ preventScroll: true });
      }
    } else if (id === 'creator' && !typing && !e.repeat) {
      if (e.code === 'KeyQ') this.switchTab(-1);
      else if (e.code === 'KeyE') this.switchTab(1);
      else if (e.code === 'KeyR') this.root.querySelector('[data-action="random-tab"]').click();
    }
  },

  current() { return this.stack[this.stack.length - 1]; },

  go(id, reset = false) {
    if (reset) this.stack = [];
    this.stack.push(id);
    if (id === 'world') this.openWorld();
    if (id === 'creator') this.openCreator();
    this.render();
  },

  back() {
    if (this.current() === 'creator') this.leaveCreator(false);
    this.stack.pop();
    if (!this.stack.length) return this.close();
    this.render();
  },

  render() {
    const id = this.current();
    this.root.hidden = false;
    for (const el of this.root.querySelectorAll('.screen')) el.hidden = el.dataset.screen !== id;
    if (id === 'options') this.syncOptions();
    const screen = this.root.querySelector(`.screen[data-screen="${id}"]`);
    if (id === 'world') return screen.querySelector('.world-card.on')?.focus({ preventScroll: true });
    (screen.querySelector('.btn.primary') || screen.querySelector('.btn'))?.focus({ preventScroll: true });
  },

  close() {
    cancelAnimationFrame(this.raf);
    this.root.hidden = true;
    this.stack = [];
    document.activeElement?.blur();
  },

  escape() {
    const id = this.current();
    if (id === 'main' || id === 'loading') return;
    if (id === 'pause') return this.resume();
    this.back();
  },

  openPause() {
    const g = this.game;
    if (!g.openingComplete || g.adminOpen || g.npcOpen || !this.root.hidden) return;
    g.paused = true;
    input.keys.clear();
    input.mouse.left = input.mouse.right = input.mouse.rawLeft = false;
    cancelTool(g); g.mining.progress = 0; g.swinging = false; g.wreckHit = null;
    this.root.querySelector('#pause-name').textContent = PLAYER_LOOK.name + ' · Valdoria';
    this.go('pause', true);
  },

  resume() {
    this.game.paused = false;
    this.close();
  },

  onClick(e) {
    const btn = e.target.closest('button');
    if (!btn || !this.root.contains(btn)) return;
    if (btn.dataset.go) {
      if (btn.dataset.go === 'creator') this.creatorFor = btn.dataset.for || 'new';
      this.go(btn.dataset.go);
      return;
    }
    switch (btn.dataset.action) {
      case 'back': this.back(); break;
      case 'resume': this.resume(); break;
      case 'journal': this.resume(); NpcServices.open(this.game); break;
      case 'confirm': this.confirmCreator(); break;
      case 'size':
        this.selectWorld(btn.dataset.size);
        if (e.detail === 0) this.worldNext(); // Enter/Espaço no cartão já avança
        break;
      case 'world-next': this.worldNext(); break;
      case 'seed-dice':
        this.root.querySelector('#world-seed').value = String(Math.floor(Math.random() * 1e6)).padStart(6, '0');
        this.drawWorldArts();
        break;
      case 'tab': this.tab = btn.dataset.tab; this.renderTab(); break;
      case 'pick': this.draft[btn.dataset.key] = +btn.dataset.index; this.refreshCreator(); break;
      case 'random': this.draft = randomLook(this.draft); this.refreshCreator(); break;
      case 'random-tab':
        this.draft = randomLook(this.draft, CREATOR_TABS.find((t) => t.id === this.tab).rows.map((r) => r.key));
        this.refreshCreator();
        break;
      case 'reset': this.draft = { ...PLAYER_LOOK, name: this.draft.name }; this.refreshCreator(); break;
      case 'name-dice': {
        const pool = RANDOM_NAMES.filter((n) => n !== this.draft.name);
        this.draft.name = pool[Math.floor(Math.random() * pool.length)];
        this.root.querySelector('#cc-name').value = this.draft.name;
        this.updateNameplate();
        break;
      }
      case 'turn': this.facing = +btn.dataset.dir || -this.facing; break;
      case 'mode':
        this.mode = btn.dataset.mode;
        for (const b of this.root.querySelectorAll('[data-action="mode"]')) b.classList.toggle('on', b === btn);
        break;
      case 'fullscreen':
        if (document.fullscreenElement) document.exitFullscreen?.();
        else document.documentElement.requestFullscreen?.().catch(() => {});
        break;
      case 'quit':
        WorldSaves.quit();
        break;
      case 'continue-worlds': WorldSaves.showList(); break;
      case 'load-world': WorldSaves.load(btn.dataset.worldId).catch(() => {}); break;
      case 'rename-world': WorldSaves.editWorld(btn.dataset.worldId,'rename'); break;
      case 'delete-world': WorldSaves.editWorld(btn.dataset.worldId,'delete'); break;
      case 'save-world':
        btn.disabled=true;
        WorldSaves.saveWithScreen().catch(() => {}).finally(() => {btn.disabled=false;});
        break;
    }
  },

  // ---------- Livro de receitas do "Como jogar" ----------
  // Os ícones saem da mesma folha de sprites do jogo (via NpcServices.atlasUrl)
  buildRecipeList() {
    const list = this.root.querySelector('#recipe-list');
    list.style.setProperty('--atlas', `url(${NpcServices.atlasUrl()})`);
    list.style.setProperty('--atlas-w', `${ITEM_DEFS.length * 24}px`);
    list.innerHTML = craftRecipes().map((r) => {
      const cost = recipeCostText(r);
      const station = recipeStationName(r);
      return `<div class="recipe" data-name="${(r.name + ' ' + station + ' ' + cost).toLowerCase()}">
        <b><i class="ico" style="--i:${r.result.item}"></i>${r.result.count}× ${ITEM_DEFS[r.result.item].name}</b>
        <span>${station} · ${cost}</span></div>`;
    }).join('');
    this.filterRecipes('');
  },

  filterRecipes(q) {
    const term = q.trim().toLowerCase();
    let n = 0;
    for (const el of this.root.querySelectorAll('#recipe-list .recipe')) {
      const hit = !term || el.dataset.name.includes(term);
      el.hidden = !hit;
      if (hit) n++;
    }
    this.root.querySelector('#recipe-count').textContent = term ? `${n} de ${CRAFT_RECIPES.length}` : `${CRAFT_RECIPES.length} receitas`;
  },

  // ---------- Escolha do mundo ----------
  bindWorld() {
    const seed = this.root.querySelector('#world-seed');
    seed.addEventListener('input', () => this.drawWorldArts());
    const skip = this.root.querySelector('#world-skip-intro');
    skip.checked = GAME_OPTIONS.skipIntro;
    skip.addEventListener('change', () => { GAME_OPTIONS.skipIntro = skip.checked; saveOptions(); });
    this.root.querySelector('.world-cards').addEventListener('dblclick', (e) => {
      if (e.target.closest('.world-card')) this.worldNext();
    });
  },

  openWorld() {
    this.selectWorld(this.worldSize || 'pequeno');
    this.drawWorldArts();
  },

  selectWorld(size) {
    this.worldSize = size;
    for (const card of this.root.querySelectorAll('.world-card')) {
      const on = card.dataset.size === size;
      card.classList.toggle('on', on);
      card.setAttribute('aria-checked', on);
    }
  },

  worldNext() {
    this.worldName = this.root.querySelector('#world-name').value.trim();
    this.worldSeed = worldSeedFrom(this.root.querySelector('#world-seed').value);
    this.creatorFor = 'new';
    this.go('creator');
  },

  drawWorldArts() {
    const seed = worldSeedFrom(this.root.querySelector('#world-seed').value) ?? 237;
    this.root.querySelectorAll('.world-card canvas').forEach((cv, i) => drawWorldArt(cv, i, seed));
  },

  // ---------- Criador de personagem ----------
  bindCreator() {
    const name = this.root.querySelector('#cc-name');
    name.addEventListener('input', () => { this.draft.name = name.value; this.updateNameplate(); });
  },

  openCreator() {
    const edit = this.creatorFor === 'edit';
    this.draft = { ...PLAYER_LOOK };
    this.tab = this.tab || 'body';
    this.root.querySelector('#cc-title').textContent = edit ? 'Editar personagem' : 'Criar personagem';
    this.root.querySelector('#cc-confirm').textContent = edit ? 'Salvar' : 'Começar aventura';
    this.root.querySelector('#cc-steps').hidden = edit;
    this.root.querySelector('#cc-name').value = this.draft.name;
    this.renderTab();
    cancelAnimationFrame(this.raf);
    const loop = (now) => { this.drawPreview(now); this.raf = requestAnimationFrame(loop); };
    this.raf = requestAnimationFrame(loop);
  },

  // Monta a aba atual: galerias com miniaturas ou amostras de cor
  renderTab() {
    const tab = CREATOR_TABS.find((t) => t.id === this.tab);
    const body = this.root.querySelector('#cc-rows');
    body.innerHTML = tab.rows.map((row) => `
      <section class="cc-sec" data-sec="${row.key}">
        <h4>${row.label}<em data-name="${row.key}"></em></h4><span class="why" data-why="${row.key}" hidden></span>
        ${row.thumb
          ? `<div class="tiles">${row.list.map((e, i) => `<button class="tile" data-action="pick" data-key="${row.key}" data-index="${i}" aria-label="${row.label}: ${e.name}"><canvas class="th-${row.thumb}" data-thumb="${row.key}:${i}"></canvas><span>${e.name}</span></button>`).join('')}</div>`
          : `<div class="swatches">${row.list.map((e, i) => `<button class="swatch${row.sole?.(e) ? ' sole' : ''}" data-action="pick" data-key="${row.key}" data-index="${i}" title="${e.name}" aria-label="${row.label}: ${e.name}" style="background:${rgb(row.color(e))}${row.sole?.(e) ? `;--sole:${rgb(row.sole(e))}` : ''}"></button>`).join('')}</div>`}
      </section>`).join('');
    body.scrollTop = 0;
    this.refreshCreator();
  },

  switchTab(dir) {
    const i = CREATOR_TABS.findIndex((t) => t.id === this.tab), n = CREATOR_TABS.length;
    this.tab = CREATOR_TABS[(i + dir + n) % n].id;
    this.renderTab();
  },

  refreshCreator() {
    const d = this.draft;
    this.drawThumbs();
    previewLook(d);
    this.atlas = buildPlayerSprite();
    for (const t of this.root.querySelectorAll('.tab')) {
      const on = t.dataset.tab === this.tab;
      t.classList.toggle('on', on);
      t.setAttribute('aria-selected', on);
    }
    for (const row of CREATOR_ROWS) {
      const sec = this.root.querySelector(`[data-sec="${row.key}"]`);
      if (!sec) continue;
      const i = d[row.key], why = row.off?.(d);
      sec.querySelector(`[data-name="${row.key}"]`).textContent = row.list[i].name;
      sec.classList.toggle('off', !!why);
      const whyEl = sec.querySelector('.why');
      whyEl.hidden = !why; whyEl.textContent = why || '';
      for (const b of sec.querySelectorAll('[data-action="pick"]')) {
        const on = +b.dataset.index === i;
        b.classList.toggle('on', on);
        b.setAttribute('aria-pressed', on);
      }
    }
    for (const b of this.root.querySelectorAll('[data-action="mode"]')) b.classList.toggle('on', b.dataset.mode === this.mode);
    this.updateNameplate();
    this.updateSummary();
  },

  // Miniaturas da aba atual: o personagem de agora com cada opção aplicada (só redesenha o que mudou)
  drawThumbs() {
    for (const cv of this.root.querySelectorAll('#cc-rows canvas[data-thumb]')) {
      const [key, i] = cv.dataset.thumb.split(':'), row = CREATOR_ROWS.find((r) => r.key === key);
      const look = { ...this.draft, name: '', [key]: +i };
      if (key === 'hairStyle') look.hat = 0; // o corte aparece sem chapéu por cima
      const sig = JSON.stringify(look);
      if (cv.dataset.sig === sig) continue;
      cv.dataset.sig = sig;
      previewLook(look);
      const atlas = buildPlayerSprite(1), [sx, sy, w, h] = THUMB_CROPS[row.thumb];
      cv.width = w; cv.height = h;
      const c = cv.getContext('2d');
      c.imageSmoothingEnabled = false;
      c.drawImage(atlas, sx, sy, w, h, 0, 0, w, h);
    }
  },

  updateSummary() {
    const d = this.draft, n = (list, k) => list[d[k]].name.toLowerCase();
    const parts = [
      `<b>${HAIR_STYLES[d.hairStyle].name}</b> ${n(HAIR_COLORS, 'hair')}${d.beard ? ` · ${n(BEARDS, 'beard')}` : ''}`,
      `<b>${TOP_STYLES[d.top].name}</b> ${TOP_STYLES[d.top].shirt ? n(SHIRT_COLORS, 'shirt') : n(JACKET_COLORS, 'jacket')}${d.pattern ? ` ${n(PATTERNS, 'pattern')}` : ''}`,
      `<b>${LEG_STYLES[d.legs].name}</b> ${n(PANTS_COLORS, 'pants')} · ${n(BOOT_COLORS, 'boots')}`,
    ];
    const extras = [d.hat && `${n(HATS, 'hat')} ${n(HAT_COLORS, 'hatColor')}`, d.glasses && n(GLASSES, 'glasses')].filter(Boolean);
    if (extras.length) parts.push(`<b>Com</b> ${extras.join(' e ')}`);
    this.root.querySelector('#cc-summary').innerHTML = parts.join('<br>');
  },

  updateNameplate() {
    this.root.querySelector('#cc-nameplate').textContent = cleanName(this.draft.name);
  },

  // saved = false desfaz a prévia e volta para a aparência salva
  leaveCreator(saved) {
    cancelAnimationFrame(this.raf);
    if (!saved) applyLook(PLAYER_LOOK, renderer);
  },

  confirmCreator() {
    const look = { ...this.draft, name: cleanName(this.draft.name) };
    saveLook(look);
    applyLook(look, renderer);
    this.leaveCreator(true);
    if (this.creatorFor === 'edit') {
      this.stack.pop();
      this.root.querySelector('#pause-name').textContent = PLAYER_LOOK.name + ' · Valdoria';
      this.render();
      return;
    }
    this.go('loading');
    this.setLoading(0, 'Preparando…');
    this.atlas = renderer.playerAtlas;
    const t0 = performance.now();
    const loop = (now) => { this.drawLoading(now, now - t0); this.raf = requestAnimationFrame(loop); };
    this.raf = requestAnimationFrame(loop);
    newWorld(this.worldSize || 'pequeno', (p, label) => this.setLoading(p, label), this.worldSeed).then(() => {
      cancelAnimationFrame(this.raf);
      this.close();
      if (GAME_OPTIONS.skipIntro) finishOpening(this.game);
      else beginOpening(this.game);
      applyOptions(this.game);
      WorldSaves.begin(this.worldName).catch(() => {});
    });
  },

  setLoading(p, label) {
    this.root.querySelector('#loading-fill').style.width = `${Math.round(p * 100)}%`;
    this.root.querySelector('#loading-pct').textContent = `${Math.round(p * 100)}%`;
    if (label) this.root.querySelector('#loading-label').textContent = label + '…';
  },

  // Tela de carregamento: o personagem criado correndo pela paisagem, com dicas trocando
  drawLoading(now, elapsed) {
    const tip = LOADING_TIPS[Math.floor(elapsed / 3800) % LOADING_TIPS.length], el = this.root.querySelector('#loading-tip');
    if (el.dataset.tip !== tip) { el.dataset.tip = tip; el.innerHTML = `<b>Dica:</b> ${tip}`; }
    const cv = this.root.querySelector('#loading-art'), c = cv.getContext('2d'), t = now / 1000;
    const groundY = cv.height - 6;
    drawStageScene(c, cv.width, cv.height, t, 72, 1, groundY);
    drawStageHero(c, this.atlas, PLAYER_ANIMS.run + Math.floor(t * 14) % 12, cv.width / 2, groundY, 1);
  },

  drawPreview(now) {
    const cv = this.root.querySelector('#cc-preview'), c = cv.getContext('2d');
    const t = now / 1000, groundY = cv.height - 14;
    const speed = this.mode === 'run' ? 72 : this.mode === 'walk' ? 34 : 0;
    drawStageScene(c, cv.width, cv.height, t, speed, this.facing, groundY);
    const A = PLAYER_ANIMS;
    const frame = this.mode === 'run' ? A.run + Math.floor(t * 14) % 12
      : this.mode === 'walk' ? A.walk + Math.floor(t * 10) % 12
      : this.mode === 'dance' ? A.gagDance + Math.floor(t * 9) % 8
      : A.idle + [0, 1, 2, 1][Math.floor(t * 1.4) % 4];
    drawStageHero(c, this.atlas, frame, cv.width / 2, groundY, this.facing);
  },

  // ---------- Opções ----------
  bindOptions() {
    const $ = (id) => this.root.querySelector('#' + id);
    const save = () => { applyOptions(this.game); saveOptions(); this.syncOptions(); };
    const on = (id, ev, fn) => $(id).addEventListener(ev, (e) => { fn(e.target); save(); });
    on('opt-vol', 'input', (el) => { GAME_OPTIONS.volume = +el.value; });
    on('opt-music', 'input', (el) => { GAME_OPTIONS.musicVolume = +el.value; });
    on('opt-calm', 'change', (el) => { GAME_OPTIONS.calmMusic = el.checked; });
    on('opt-battle', 'change', (el) => { GAME_OPTIONS.battleMusic = el.checked; });
    on('opt-help', 'change', (el) => { GAME_OPTIONS.help = el.checked; });
    on('opt-shake', 'change', (el) => { GAME_OPTIONS.shake = el.checked; });
    on('opt-shaders', 'change', (el) => { GAME_OPTIONS.shaders = el.checked; });
    on('opt-showfps', 'change', (el) => { GAME_OPTIONS.showFps = el.checked; });
    on('opt-fps-mode', 'change', (el) => { GAME_OPTIONS.fpsMode = el.value; });
    on('opt-fps-limit', 'change', (el) => { if (el.value !== 'custom') GAME_OPTIONS.fpsLimit = +el.value; });
    on('opt-fps-custom', 'change', (el) => { GAME_OPTIONS.fpsLimit = clamp(Math.round(+el.value) || 60, 15, 1000); });
    on('opt-uiscale', 'change', (el) => { GAME_OPTIONS.uiScale = el.value; });
  },

  // Mede a taxa de atualização do monitor pela média dos intervalos do requestAnimationFrame
  probeRefresh() {
    this.probing = true;
    const times = [];
    let last = 0;
    const tick = (t) => {
      if (last) times.push(t - last);
      last = t;
      if (times.length < 40) { requestAnimationFrame(tick); return; }
      times.sort((a, b) => a - b);
      this.displayHz = Math.round(1000 / times[times.length >> 1]);
      this.probing = false;
      if (this.current() === 'options') this.syncOptions();
    };
    requestAnimationFrame(tick);
  },

  syncOptions() {
    const $ = (id) => this.root.querySelector('#' + id), o = GAME_OPTIONS;
    $('opt-vol').value = o.volume; $('opt-vol-val').textContent = o.volume + '%';
    $('opt-music').value = o.musicVolume; $('opt-music-val').textContent = o.musicVolume + '%';
    $('opt-calm').checked = o.calmMusic; $('opt-battle').checked = o.battleMusic;
    $('opt-help').checked = o.help; $('opt-shake').checked = o.shake; $('opt-showfps').checked = o.showFps;
    $('opt-shaders').checked = o.shaders;
    $('opt-uiscale').value = o.uiScale;
    const shown = this.game.inventoryUI.scale();
    $('opt-uiscale-note').textContent = o.uiScale === 'auto'
      ? `Nesta janela está em ${shown}×. Aumente se os espaços estiverem pequenos demais.`
      : `Fixo em ${shown}×${String(shown) !== String(o.uiScale) ? ' (o escolhido não cabe nesta tela)' : ''}.`;
    $('opt-fps-mode').value = o.fpsMode;
    $('opt-fps-limit-row').hidden = o.fpsMode !== 'limit';
    $('opt-fps-limit').value = FPS_PRESETS.includes(o.fpsLimit) ? String(o.fpsLimit) : 'custom';
    if (document.activeElement !== $('opt-fps-custom')) $('opt-fps-custom').value = o.fpsLimit;
    if (!this.displayHz && !this.probing) this.probeRefresh();
    const hz = this.displayHz ? `${this.displayHz} Hz` : '';
    $('opt-fps-note').textContent =
      o.fpsMode === 'vsync' ? `Acompanha o monitor${hz ? ` (o seu está em ~${hz})` : ''}. Mais estável e economiza energia.`
      : o.fpsMode === 'unlimited' ? `Desenha o máximo que o PC aguentar. A tela só mostra ${hz || 'a taxa do monitor'}; o que passar disso gasta mais CPU/GPU.`
      : `Trava em ${o.fpsLimit} FPS.${hz ? ` Para ficar liso, use o valor do seu monitor (${hz}).` : ''}`;
  },
};
