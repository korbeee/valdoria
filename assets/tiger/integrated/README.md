# Tigre integrado — 30/09/2026

A arte em js/tiger-art.js contém os 49 quadros Sprite Fusion já preparados; não há carregamento assíncrono nem retorno à arte procedural antiga. O conjunto inclui quatro quadros de repouso antes ausentes e uma nova patada com margem ao redor da figura.

A fonte reproduzível é tests/build-tiger-runtime.cjs. As escalas e âncoras são fixas por sequência, calibradas pelo corpo, sem redimensionar cada quadro para preencher a caixa. O sono tem corpo recolhido menor e o salto mantém espaço para as patas. A caixa de desenho é 192×80; a colisão continua 64×38.

Validação:
- tests/tiger-art-offline.cjs compara cada pixel dos 49 quadros usados pelo jogo com o atlas dos PNGs, cobre todos os índices do seletor e verifica chão e margens.
- tests/tiger-runtime-browser.cjs executa wildlifeSprite/drawWildlife na página real, bloqueia downloads de imagens para confirmar disponibilidade imediata, verifica versões normais e de dano e desenha os dois sentidos.
- tests/boss-detail-preview.cjs inclui o novo tamanho do quadro e também confere a geometria compartilhada dos outros bosses.

Prévia visual: tests/tiger-runtime-browser.png e tests/tiger-integrated-review.png.
