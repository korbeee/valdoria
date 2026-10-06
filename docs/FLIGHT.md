# Asas e jetpack

Equipe no cinto. Segure Espaço, W ou seta para cima para impulsionar o voo;
A/D ou setas direcionam. Ao esgotar o impulso das asas, manter o pulo permite
planar a 70 px/s de queda; soltar deixa cair normalmente. Jetpack sem combustível
não plana. O voo usa as colisões
normais do personagem e não ativa nadando, montado, agachado ou na escada.

| Asas | Impulso | Obtenção |
|---|---:|---|
| Tecido | 2 s | Bigorna: 10 tecido, 18 fibra, 6 couro |
| Osso e seda | 5 s | Bigorna: 20 osso, 12 seda, 10 couro, 4 bronze |
| Cristal do vento | 10 s | Bigorna: 10 cristal-de-vento, 12 essência de nuvem, 20 penas, 8 barras de ferro |
| Mecânicas dos Vigias | 18 s | Bigorna: 16 magnetita, 18 bronze, 8 engrenagens, 14 cristais-de-vento, 12 obsidianas |
| Tempestade | 30 s | Drop do Olho da Tempestade |
| Núcleo dos Vigias | Infinito | Drop garantido do Núcleo dos Vigias |

Pousar recupera o impulso das asas. Soltar o botão ou trocar asas no ar não
renova o tempo; várias asas equipadas não somam durações. O melhor equipamento
é escolhido automaticamente. As asas da Tempestade perderam os dois pulos
extras e o planar. A asa-delta existente mantém sua função separada.

Jetpack: bigorna com 24 barras de ferro, 20 bronze, 10 engrenagens, 18 magnetitas
e 16 cristais-de-vento. Célula de combustível: fornalha com 4 carvões,
2 enxofres e 1 vidro. Cada célula dá 20 s de impulso; o jetpack consome a próxima
automaticamente da mochila. Soltar poupa combustível. Pousar não repõe energia.

Todos aparecem no guia e livro de receitas. Um indicador sob o minimapa mostra
o impulso ou combustível restante. Asas têm desenhos de perfil com membranas,
penas, cristais e placas, batidas articuladas e poses de voo, planar e repouso.
O jetpack fica na lateral das costas e espelha com a direção do personagem.
Mundos novos zeram impulso e combustível residual.

Código: `js/flight-equipment.js`. Testes: `tests/flight-equipment.cjs` e
`tests/sky.cjs`.
