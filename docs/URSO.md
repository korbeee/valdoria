# Serras, grutas e o Patriarca da Mata

## Revisão visual — tigre e urso atordoado

O rosto do tigre agora é desenhado pixel a pixel com paleta própria, orelha arredondada,
crânio largo, focinho curto, marcas sob o olho, bochechas e expressões de repouso,
sono, rugido e atordoamento. A caminhada usa apoio de 64% do ciclo antes de levantar
cada pata; ombros e quadril alternam um balanço pequeno, e a cauda segue com atraso.
`tests/tiger-art-offline.cjs` renderiza e confere os 20 quadros sem navegador, incluindo
limites, cores, oito passos distintos e pelo menos duas patas apoiadas em cada passo.
Prévia atual: `tests/tiger-art-refined.png`; animações: `tests/tiger-refined-animation.html`.
A revisão mais recente teve verificação local e de sintaxe; a rodada final no navegador
ficou pendente porque a revisão automática de permissões atingiu o limite de uso.

A pose atordoada foi ajustada para sentar com garupa e patas apoiadas na última linha
do sprite, eliminando a silhueta de queda suspensa. O Troféu do Alfa agora usa uma placa
de madeira em escudo de 2×2 blocos, com um recorte da cabeça do urso e apoio de parede
nas quatro células. Colocação, alinhamento e remoção são verificados em `tests/bear-wall-art.cjs`.

Morrer agenda o renascimento no fim da atualização: o jogador volta ao nascimento
registrado na abertura, com vida cheia e proteção temporária; urso e tigre vivos voltam
ao próprio covil, curados, sem sangramento nem ataques pendentes. A porta do urso reabre
e as hienas convocadas são removidas fora da iteração de criaturas. A rotina de chefes
distantes agora distingue urso de tigre (antes tentava ler o covil de tigre no urso e
interrompia o jogo). Regressão em `tests/boss-respawn.cjs`, incluindo contato letal,
mortes repetidas, continuação da atualização e nascimento obstruído.

O tigre mantém os 20 quadros e o desenho em pixels, com listras curvas mais largas,
bifurcações, mechas de pelo ancoradas no tronco, paleta âmbar com sombras vinho,
costeletas, focinho mais compacto e detalhes nas patas. Implementação em `js/tiger-art.js`.

O urso agora usa quatro quadros próprios de atordoamento (28–31), derivados da pose
sentada da folha original. A cabeça pende, o tronco balança sem levantar as patas,
a pálpebra substitui o olho vermelho e três estrelas orbitam acima da cabeça. O ciclo
começa no momento do impacto. Os 28 quadros originais, a duração de atordoamento e
o multiplicador de dano permanecem iguais.

Verificação: `tests/predator-art.cjs` renderiza os 52 quadros, confere variantes de dano,
quatro fases distintas, apoio constante das patas e pixels originais do urso.
`tests/bear-sheet-preview.cjs` confere a folha e a cobertura dos 32 quadros nas animações.
Prévia: `tests/predator-art.png`; ciclo animado: `tests/bear-stun-animation.html`.

O mundo deixou de ser plano, ganhou caminho para o subsolo e um chefe novo no fundo da
serra. O Vigia do Bosque saiu do jogo.

## Serras

`mountainAt` (em `js/world.js`) soma um ruído de crista por cima do relevo de sempre: o
cume nasce onde o ruído passa por zero, e uma máscara de escala bem maior decide quais
trechos viram serra. Cada bioma tem altura e frequência próprias em `BIOME_MOUNTAIN`:

| Bioma | Altura do cume | Quanto do bioma vira serra |
|---|---:|---:|
| Neve | 44 blocos | 80% |
| Floresta | 30 | 58% |
| Selva | 26 | 50% |
| Cerejeiras | 22 | 45% |
| Savana | 16 | 35% |
| Deserto | 12 | 30% |
| Oceano | — | nenhuma |

Acima de 11 blocos de cume a terra fica fina e a **rocha aparece na superfície**; o cume
nunca encosta no teto do mundo. Num mundo de teste de 1600 colunas o desnível entre o
ponto mais baixo e o mais alto passou de ~30 para **86 blocos**, com 271 colunas de serra.

## Bocas de caverna

Os túneis de ruído quase nunca encostavam na superfície: só se chegava ao subsolo cavando.
`carveCaveEntrances` (em `js/underground.js`) abre uma boca a cada ~140 colunas, escolhendo
o lugar por **altura de serra e inclinação do terreno** — encosta de montanha tem muito
mais chance. De cada boca desce um poço em ziguezague, com raio variando entre 1,5 e 2,6
blocos, até encontrar o primeiro vazio do subsolo ou uns 40 blocos de profundidade. A
entrada fica aberta para o céu e só o miolo ganha parede de fundo.

No mundo de teste: 11 bocas, 6 delas chegando a mais de 25 blocos de profundidade, e a
altura média de serra onde elas nascem é 13,2 contra 5,2 do mundo inteiro.

## O covil selado

### Gruta da montanha — revisão de 03/10/2026

O habitat agora nasce antes das aldeias e reservas de estruturas, em uma montanha de pedra
na floresta. A entrada fica na encosta e conduz por uma galeria horizontal à câmara com
teto irregular. Uma rampa liga a boca ao terreno; não é preciso descer um poço. A região
inteira fica reservada para impedir que casas, minas ou masmorras atravessem o habitat.
O interior usa planos de rocha, raízes, estalactites, musgo, marcas de garras, pegadas e
uma cama de folhas. A casca mantém a resistência da rocha matriz com aparência de pedra.

Bramido hiberna sobre a cama, respira lentamente e ronca. Entrar completamente na câmara
desperta o chefe; a animação de despertar dá tempo antes dos ataques. A passagem só fecha
quando o personagem já saiu do vão, abre após a derrota e reabre ao reiniciar a luta.
O cenário estático é armazenado em cache e recebe a iluminação normal do jogo.

Verificação: `tests/bear-habitat.cjs` cobre acesso a pé, hibernação, despertar, entrada segura,
reinício, terreno seco e múltiplas sementes. Prévia em `tests/bear-habitat-preview.html`.
O novo relevo aparece nos mundos gerados após a atualização; o texto abaixo descreve a versão anterior.

`buildBearLair` (em `js/structures.js`) escava uma sala de 39×17 embaixo da serra mais alta
da floresta e a envolve numa casca de três blocos de **rocha matriz** (`TILE.BEDROCK`,
dureza infinita: não quebra com ferramenta nenhuma). Dentro há tochas nas paredes, teias e
um baú. Um poço em degraus liga a porta até a superfície — é o único caminho.

A porta é um vão de 4 blocos de altura, guardado em `lair.door`. Ela fica **aberta** até o
jogador entrar na sala; aí o urso acorda e ela se fecha com rocha matriz. Cair o chefe, ela
abre de novo.

## Bramido, o Patriarca

`js/bear.js`. 260 de vida, dorme no covil e acorda quando alguém pisa na arena.

| Golpe | O que faz | Como escapar |
|---|---|---|
| **Investida** | Raspa o chão e atropela a 300 px/s (380 enfurecido) | Sair da frente na hora do raspado. Se ele bate na parede fica **zonzo 2,2 s levando 1,8× de dano** |
| **Patada dupla** | Dois golpes de perto: o primeiro rápido (16), o segundo pesado (24) | Recuar entre os dois |
| **Pisão** | Levanta nas patas traseiras e desce (26), soltando **duas ondas rasteiras** (15) | Pular: a onda só pega quem está com os pés no chão |
| **Bramido** | Empurra quem está perto | Ficar longe |

Abaixo de 40% ele fica **ENFURECIDO**: mais rápido, investida mais longa, bramido mais
frequente e o **teto começa a cair** (pedras de 14 de dano na arena inteira).

A arte é procedural como a dos outros bichos (`paintBear`): 8 quadros de caminhada, parado,
no ar, dormindo, bramindo, patada, de pé, zonzo e raspando o chão. A barra do chefe muda de
cor e de nome na segunda fase.

## O espólio

`js/bear-loot.js`. Nove peças, com as chances pedidas:

| Peça | O que faz | Chance |
|---|---|---:|
| **Pele do Patriarca** | Capa: −32% de dano e **−35% de empurrão** | 100% |
| **Presa Partida** | Acessório: **+45% de dano em bicho com a vida cheia** | 100% |
| **Coração Selvagem** | Consumível: +25 de vida máxima | 100% |
| **Mel Ancestral** ×15 | Consumível: cura 30 aos poucos e **some ao levar pancada** | 100% |
| **Troféu do Alfa** | Decoração de parede com a cabeça do chefe | 100% |
| **Garras do Alfa** | Arma rápida (11 de dano, ritmo 1,55). **O terceiro golpe seguido no mesmo bicho abre sangramento** de 4/s por 4 s | 50% |
| **Rugido Engarrafado** | Reutilizável: empurra tudo num raio de 9 blocos. **Chefe resiste.** Recarrega em 12 s | 50% |
| **Pata Sísmica** | Arma lenta e pesada (18, ritmo 0,55). Cada golpe manda uma **onda rasteira** que só pega quem está no chão | 10% |
| **Espírito do Filhote** | Acessório: um ursinho de fumaça anda com você, só enfeite | 10% |

O quarto número de `drops` (em `js/mobs.js`) passou a ser a chance daquela peça, então
qualquer bicho pode ter drop sorteado agora.

### Acessórios

Duas casas novas no rodapé do inventário, ao lado da roupa. Só aceitam item com `acessorio`,
uma peça por casa e sem repetir. Clique com item na mão equipa, clique vazio tira.

## O que saiu

`js/forest-boss.js` foi apagado por inteiro, junto com o Vigia do Bosque, o templo dele em
`js/structures.js`, o item Olho do Bosque e a arte `paintGuardian`. O Tigre da Savana
continua igual: ele já acordava com osso + carne, e esse continua sendo o caminho (antes o
Olho também servia).

## Verificação

`node tests/bear-boss.cjs`: 36 verificações — o Vigia sumiu de vez; o mundo tem serra e
bocas de caverna que de fato descem e nascem mais na montanha; o covil está fechado em
rocha matriz e é alcançável da superfície; entrar acorda o urso e sela a porta; ele usa o
repertório inteiro, vira de fase, morre e a porta reabre; o espólio garantido cai com 15
méis; e cada uma das nove peças faz o que promete (sangramento, bônus em vida cheia, corte
de empurrão, cura que quebra com dano, rugido que poupa chefe, onda sísmica, pet e troféu
que só entra em parede).

Capturas em `tests/bear-montanha.png`, `tests/bear-covil.png`, `tests/bear-luta.png` e
`tests/bear-sprites.png`. A geração do mundo não ficou mais lenta: 4200×1200 continua em
~1,0–1,1 s, igual à versão anterior.


## Folha original do urso

O chefe usa os 28 quadros (26 desenhos distintos) da folha enviada pelo usuário, preservada em `assets/bear-reference.png`. Os créditos estão na própria folha e em `assets/bear-reference.txt`. `js/bear.js` contém os recortes com a paleta original, transparência e ampliação inteira 2×, sem contorno adicional ou suavização.

`bearFrame` seleciona sequências de descanso, caminhada, preparação/investida, patada, pisão, despertar, reação e recuperação. A derrota toca a queda sem atrasar os drops ou a abertura do covil. A colisão do chefe mede 84×64 pixels; as poses usam uma tela de 208×160, desenhada a 75% (25% menor) com amostragem sem suavização.

Prévia animada: `tests/bear-reference-animation.html`. Galeria: `tests/bear-reference-poses.png`. Verificação: `node tests/bear-sheet-preview.cjs` confere os pixels, a transparência e o uso dos 28 quadros; `node tests/bear-boss.cjs` valida o combate.


## Arquivo unificado

`js/bear.js` reúne a arte compartilhada da fauna, os 28 quadros do urso e a configuração, combate e animações do chefe. É carregado antes das extensões de fauna. `initializeBearBoss()` registra os drops e a barra do chefe no início de `game.js`, quando as dependências já estão disponíveis. O pet e os itens continuam em `js/bear-loot.js`.
