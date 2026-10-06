# Pedras dos Ventos construídas

As Pedras dos Ventos e as correntes deixam de ser geradas naturalmente, tanto
no chão quanto nas ilhas. O jogador monta exatamente três blocos lado a lado,
na mesma altura, com apoio sólido abaixo e espaço livre acima.

Cada bloco é fabricado na bancada de trabalho com 8 pedras, 3 obsidianas,
4 barras de ferro e 1 Núcleo de Vendaval. O Casco de Ferro entrega três núcleos
garantidos, suficientes para um conjunto. Não é preciso material do céu para
fabricar o acesso ao céu. As pedras podem ser mineradas e reaproveitadas.

A corrente sobe até o céu ou até encontrar um obstáculo. Quando há uma ilha
próxima ao lado da coluna, a corrente faz a curva final para ela. Funciona
fora dos pontos antigos de geração e em qualquer bioma. S continua permitindo
descer. Retirar uma pedra ou seu apoio desliga a corrente; reconstruir reativa.

Código: `js/wind-altars.js`. Verificação de geração, receita, drop, formato,
apoio, obstáculos, reconstrução e movimento: `tests/wind-altars.cjs`.
Integração com as ilhas, voo, fauna e chefe: `tests/sky.cjs`.
