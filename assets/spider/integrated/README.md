# Fiandeira — Sprite Fusion

Arte de origem: `../spritefusion/base/7-image.png`.
O histórico de cada geração (prompt, identificador, URL e pedido) está em
`../spritefusion/<sequência>/request.json`. Nenhuma chave é necessária em execução.

O jogo carrega `js/spider-art.js` antes de `js/spider-boss.js`. Os pixels estão
embutidos, sem carregamento assíncrono ou retorno ao desenho procedural antigo.

- Caminhada: 16 quadros, utilizados no chão e espelhados verticalmente no teto.
- Repouso, sono, mordida, seda, atordoamento, suspensão e grito: 8 quadros por sequência.
- Sono e atordoamento compartilham a nova pose baixa de `rest-loop`, com ritmos distintos.
- `cast` atende cuspe, laço, chuva de seda e canalização.
- `hang` atende subida, mira e queda. O casulo mantém seu desenho próprio.
- Escala nativa constante, sem redimensionamento individual das poses.
- Ponto de contato com chão/teto ajustado por translação vertical. Margens transparentes
  verificadas na origem e no destino; o brilho dos olhos acompanha os pixels de cada quadro.

Reconstruir: `node tests/build-spider-runtime.cjs`.
Validar o desenho real e todos os estados: `node tests/spider-runtime-browser.cjs`.
Validar combate, progressão e drops: `node tests/boss-gear.cjs`.
`atlas.png` contém 72 posições de animação; `manifest.json` documenta os clips.
