# Ninho da Fiandeira

A antiga galeria agora é uma caverna tomada pela aranha. Teias radiais cobrem
as rochas, casulos ficam suspensos no teto e o canto distante da entrada guarda
um berçário de ovos. As plataformas de madeira viraram prateleiras tecidas,
com a mesma colisão de mão única das plataformas anteriores.

Cogumelos do ninho iluminam o centro e o berçário. Teias que prendem o jogador
ficam principalmente nas bordas; o centro conserva espaço para esquivar.
A casca protegida continua intacta, com aparência de pedra e manchas de musgo.

O poço de acesso, baús, gaiola e três fios da expedição foram preservados.
A ordem dos chefes e o comportamento da Fiandeira continuam os mesmos.
O novo habitat é aplicado em mundos novos.

Código: `js/spider-habitat.js`. Validação: `tests/spider-habitat.cjs`
(três sementes, acesso, plataformas, história e movimentação em combate) e
`tests/boss-rest.cjs` (descanso e progressão dos chefes).
Prévia: `tests/spider-habitat-preview.html`.

## Revisão visual (2026-10-04)

O fundo chapado pré-pintado e as "teias adesivo" nas paredes saíram. A parede é a de pedra
real; por cima ficam camadas transparentes feitas pixel a pixel (`js/lair-art.js` tem os
pincéis): teto de caverna irregular, estalactites, teias com buracos e fios soltos, casulos
que balançam, ovos que pulsam, micélio que brilha, escoras caídas, vagonete e o esqueleto
de um mineiro. Teias que prendem (`TILE.COBWEB`) agora desenham o leque junto da parede onde
grudam. A câmara do Casco de Ferro foi refeita do mesmo jeito em `js/beetle-lair.js`
(estratos, veios e cristais de ferro, bocas de túnel, carapaça fóssil, runas do portão,
feixes de luz, areia escorrendo, ruínas). A área jogável dos dois não mudou.
