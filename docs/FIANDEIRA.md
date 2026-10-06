# Fiandeira, a Matriarca do Poço — e o espólio do Tigre

## A mina abandonada

`buildSpiderMine` (em `js/spider-boss.js`) escolhe uma selva larga (se não houver, deserto,
tundra, cerejeiras, floresta ou savana), longe do nascimento, do covil do urso e da arena do
tigre. Na superfície fica a boca da mina: dois pilares e uma trave. Dali um poço com escada
desce ~40 blocos até um túnel escorado, que termina na galeria.

A galeria tem 45×13 blocos e fica dentro de uma casca de **rocha matriz**. A altura é baixa de
propósito: o teto cabe na tela, e durante a luta a câmera sobe um pouco para enquadrá-lo
(`spiderCameraY`). Lá dentro há pilares de madeira, lampiões e tochas, duas plataformas baixas
e uma alta. No canto oposto à entrada fica o **ninho**: uma prateleira de tábuas coberta de
teia, com **dois baús da expedição sumida** (corda, tochas, kits médicos, picareta de metal,
barras, arco...). No fim da geração, `reopenSpiderShafts` desentope o poço, porque as poças de
caverna às vezes o fechavam.

## O casulo: a ordem dos chefes

Enquanto o **Tigre da Savana** estiver vivo, a Fiandeira dorme presa num **casulo** no teto do
ninho. Ela não acorda, não leva dano e a entrada não fecha. Quem entra na galeria só vê o casulo
pulsando, com a sombra da aranha lá dentro. Quando o tigre cai (`spiderTigerSlain`, chamado de
`bossDefeated` em `js/savanna.js`), o casulo treme, rasga e ela volta a dormir no teto, pronta
para a luta. Morrer ou se afastar reinicia a luta, mas não fecha o casulo de novo.

## A luta

| Fase | O que ela faz | Como jogar |
|---|---|---|
| **No teto** | Anda pelo teto atrás de você e cospe bolas de seda que viram **teia no chão e nas plataformas** | Teia deixa lento; a bola de seda prende de vez por 0,6 s |
| **Bote** | Para em cima de você, um **fio de seda desce** (é o aviso) e ela despenca (22) | Saia de baixo quando o fio aparecer |
| **Zonza** | Depois do bote fica atordoada 1,35 s e leva **1,5× de dano** | É a brecha |
| **No chão** | Anda atrás de você, **morde** de perto (18), cospe seda de longe e sobe de volta pelo fio | Se você subir numa plataforma, ela volta para o teto |
| **Laço de seda** | No chão, de média distância: o abdome brilha e um fio sai reto em você. Se pegar, ela **puxa** você até a boca e emenda a mordida | Pular ou esquivar quando a seda brilhar |
| **Mordida** | Presas cruzadas em verde: 18 de dano e **veneno** (3 por segundo, por 3 s) | Recuar quando ela armar as presas |
| **Chuva de seda** | Do teto, solta 5 fios em leque (7 furiosa) que viram teia onde caem | Sair de baixo do leque |

Abaixo de 40% ela fica **FURIOSA**: **empina e grita** (ondas de som e tremor), os olhos ficam
vermelhos e o veneno pinga das presas. Fica mais rápida, cospe três bolas de uma vez e **bota
ovos** a cada 11 s: eles caem, pulsam e chocam **filhotes** (até três vivos). Antes do bote
de cima, além do fio, um **alvo vermelho** marca o chão e encolhe até ela cair; a queda solta
uma onda de choque. Entrar na galeria acorda a aranha e fecha a
entrada com **teia grossa**, que não quebra. Morrer ou se afastar reinicia a luta. Quando a
Fiandeira cai, a teia se desfaz e os filhotes vão embora. Tem 300 de vida, barra própria e
ficha no bestiário ("Mina abandonada").

A arte é procedural, como a do resto da fauna: 17 quadros (andar, parada, bote, cuspe, zonza,
pendurada e dormindo). Ela é desenhada de ponta-cabeça no teto, com oito patas de joelho alto,
caveira de osso no abdome e olhos âmbar que brilham no escuro.

## Espólio da Fiandeira (`js/spider-loot.js`) — tudo garantido

| Peça | O que faz |
|---|---|
| **Carretel da Matriarca** | Clique: gancho de seda (15 blocos) que prende em parede e teto e puxa você. Pendurado, A/D balança; pular ou S solta |
| **Agulha da Fiandeira** | Lança fina (10 de dano, alcance 48). O 2º golpe seguido no mesmo bicho **envenena** (3/s por 5 s) |
| **Luvas de Seda** | No ar, empurrando uma parede, **agarra por 2 s**; pular salta para longe. Recarrega ao tocar o chão |
| **Casulo de Caça** | Botão direito arma uma teia no chão. **Prende por 4 s** um inimigo pequeno; chefe ou bicho grande só fica **lento** 1,5 s. Recarga de 8 s |
| **Aranhinha Tecelã** | Mascote (acessório): anda com você e, quando você para sob um teto, **desce por um fio** até a altura da cabeça |

## Espólio do Tigre (`js/tiger-loot.js`) — tudo garantido, somado aos drops antigos

| Peça | O que faz |
|---|---|
| **Presas Gêmeas** | Arma rápida (9, ritmo 1,75). Os golpes **alternam** o arco; **4 acertos seguidos** armam uma **estocada** que avança o corpo (23 de dano, alcance 46). Errar reinicia a sequência |
| **Passo do Predador** | Acessório: **Shift** no chão dá uma esquiva curta com proteção. Recarga de 1,1 s |
| **Olho de Âmbar** | Acessório: inimigos feridos num raio de 26 blocos ganham cantos e barra de vida âmbar, **visíveis no escuro**, e levam **+15%** de dano |
| **Manto Listrado** | Capa (18% de defesa): **correr 2,5 s** sem parar fortalece o próximo golpe corpo a corpo em **+60%**; o bônus some no golpe |
| **Instinto da Caçada** | Botão direito: por 8 s aparecem **pegadas** até as quatro criaturas mais próximas. Chefes e criaturas únicas contam como mais perto e ganham um anel vermelho. Recarga de 20 s |

As esquivas, as luvas, o gancho e a lentidão da teia ficam em `js/gear-movement.js`, chamado de
`Player.update`. Os bônus de dano passam por `gearMeleeDamage` (em `js/combat.js`).

## Verificação

- `node tests/boss-gear.cjs`: 24 verificações (inclui o casulo, o laço, o veneno e os ovos). A mina existe e tem escada até a galeria, com
  dois baús no ninho. Entrar acorda a aranha e fecha a teia. Ela usa o repertório inteiro
  (teto, mira, bote, zonza, chão, mordida e subida) e a teia cai no chão. Zonza, leva 1,5×.
  Furiosa, chama filhotes. Ao morrer, as cinco peças caem, a teia se desfaz e os filhotes
  somem. O tigre tem as cinco peças novas garantidas.
- `node tests/boss-gear-items.cjs`: 36 verificações, uma ou mais para cada efeito dos dez itens.
- Continuam passando: `bear-boss`, `tiger-boss`, `boss-respawn`, `bestiary`, `predator-art`,
  `tiger-art-offline`. A geração de 4200×1200 continua em ~1,3–1,5 s.

## Física da água (`js/water-waves.js`)

A superfície virou uma fileira de molas (4 por bloco). Cair na água afunda o ponto do impacto,
a água volta, passa do ponto e a onda corre para os lados (~6 blocos por segundo) até morrer.
Quedas fortes fazem o **tchibum**: uma coluna d'água sobe e desaba, uma coroa de gotas se abre,
ficam duas ondinhas, e o som tem o chiado agudo da entrada seguido do baque grave (`plunge`).
Bichos que caem ou se mexem na água também fazem onda. Na **chuva**, cada gota que cai na água
abre uma ondinha e mexe a superfície. `drawWater` desenha a superfície em quatro fatias por
bloco, cada uma na altura da sua mola.

Verificação: `node tests/water-waves.cjs` (8 verificações: ondas, coluna, gotas, propagação, a
onda some sozinha, lobo caindo, chuva e fatias de desenho).
