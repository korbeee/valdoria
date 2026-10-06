# Tigre em pixel art — 32 quadros

Nova folha `pixel-atlas.png`, criada com a ferramenta integrada image_gen (skill imagegen). `user-reference.png` foi usada apenas para anatomia. A folha anterior `reference-atlas.png` foi preservada.

A arte foi gerada com áreas de cor chapadas, listras largas e rosto simplificado em pixel art. O importador converte a folha transparente para a paleta do jogo, mantém escala comum, alinha os pés e espelha os quadros para a orientação esperada pelo renderizador. Dados em `js/tiger-sprites.js`; desenho em `js/tiger-art.js`; seleção das animações em `js/savanna-art.js`.

Quadros: 0–15 caminhada; 16–19 repouso; 20–21 salto/pouso; 22 preparo; 23–24 sono; 25 rugido; 26–27 patada; 28–31 atordoamento. A caminhada avança pela distância percorrida, com duas fases por passo anterior; o atordoamento alterna quatro poses próprias a 6 quadros por segundo. Grade 104×64, paleta compartilhada, ampliação sem suavização.

Validação local: `node tests/import-tiger-reference.cjs` e `node tests/tiger-art-offline.cjs tiger-pixel-integrated`. Verifica 32 quadros, limites, cores, base no chão, 16 passos distintos, 4 poses de atordoamento distintas e seleção de todos os estados. Prévia animada: `tests/tiger-refined-animation.html`. Integração no navegador ainda não verificada nesta revisão.

## Prompt completo

Create a production pixel-art sprite atlas for a side-scrolling game. TRANSPARENT BACKGROUND. Exactly 32 separate complete tiger sprites in a strict 4 columns x 8 rows grid, read left to right top to bottom. No text, no grid lines, no shadows beneath sprites. Generous empty separation. All face LEFT. Reference image is ANATOMY ONLY: long horizontal muscular tiger body, proportionate small low head, long curved tail, four strong paws. Translate it into charming HAND-PLACED LOW RESOLUTION PIXEL ART, like a polished 16-bit boss. NOT realistic fur or filtered illustration. Each sprite designed on approximately 96x56 logical pixels, enlarged with perfectly crisp nearest-neighbor square pixels. Chunky clean color clusters, one-pixel dark outline, only 12-16 flat colors: warm orange, ochre highlights, dark brown shadows, near-black bold widely spaced stripes, cream muzzle belly cheeks. NO tiny fur marks, NO dithering, NO gradients, NO antialiasing, NO realistic texture. Face clearly designed with cream chunky muzzle, small black triangular nose, angular eye and rounded small ear, expressive readable at game size. Keep tiger identity scale proportions stripes and facial design CONSISTENT.
Rows 1-4: 16 successive DISTINCT WALK animation frames through one complete slow quadruped gait. Smooth small intermediate changes, alternating near and far legs, paws lift and plant, shoulders subtly rise and fall, tail sways. Feet stay on common baseline.
Row5: four quiet idle breathing poses.
Row6: frame20 airborne leap extended; frame21 landing knees bent; frame22 low pre-pounce crouch; frame23 curled asleep head on front paws.
Row7: frame24 sleeping alternate breathing; frame25 roaring; frame26 forepaw attack windup; frame27 forepaw swipe extended.
Row8: FOUR dedicated STUN poses after hitting a wall: tiger crouched on ground, hindquarters lowered, forelegs buckled with paws planted, head droops down, eyes squint dazed. Small head rocking between the four poses. NO floating, NO stars or disconnected effects. These must visibly differ from standing idle.
Output whole atlas as native-looking pixel art with simple bold shapes, not a realistic tiger reduced to pixels.
