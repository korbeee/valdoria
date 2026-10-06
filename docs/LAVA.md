# Lava e baldes

A lava usa o mesmo passo de simulação da água: cai, escorre por bordas, forma poças,
nivela o volume e produz correnteza. Mantém uma camada de níveis própria, sem evaporar.
Abrir ou fechar um caminho acorda o líquido próximo. Água em contato forma obsidiana.

O jogador nada e boia com os mesmos controles da água; a lava continua causando dano.
Entrar rapidamente produz o tibum, com a mesma coluna, ondas e gotas da água, em cores
de magma. Salamandras acompanham o nível real da superfície.

O balde de ferro é criado na bigorna com 3 barras de ferro. Botão direito coleta um
bloco de água ou lava; outro clique despeja no espaço indicado e deixa o líquido fluir.
Falta de volume, obstáculos e alcance inválido preservam o conteúdo do balde.
O balde de madeira continua transportando água.

## Textura e desempenho

A animação usa o mesmo quadro em toda a tela, com ruído periódico nos dois eixos.
O campo do miolo tem 16 × 16 blocos, evitando as antigas faixas de quatro blocos.
A borda quente é desenhada sobre o miolo, sem reiniciar sua textura a cada superfície.
O fundo cheio é desenhado em faixas de até 16 blocos; apenas superfícies com ondas
ou inclinação usam recorte. A altura real, a física e o tibum continuam iguais.

`tests/lava-rendering.cjs` compara as faixas pixel a pixel e mede um rio com 2.400
blocos: 180 desenhos, contra 19.200 do desenho por oito fatias. Os tempos medidos
estão em `tests/lava-rendering-results.json`; representam só o desenho da lava,
não o FPS total de uma partida.

Verificação: `tests/lava-physics.cjs`, `tests/bucket.cjs`, `tests/water-waves.cjs`
e `tests/core.cjs`.
