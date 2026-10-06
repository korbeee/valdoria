# O Arquipélago dos Vigias (o céu)

Uma faixa de ilhas flutuantes no alto de todo mundo (médio, pequeno e grande; o mundinho do
menu não tem). É o espelho do Coração da Ilha: lá embaixo é lava e pressão, aqui em cima é
vento, nuvem e luz.

## Arquivos

| Arquivo | O que tem |
|---|---|
| `js/sky-tiles.js` | blocos 130–142, itens 225–243, paredes 18–19, texturas, nuvens fofas, colunas, ícones e receitas |
| `js/sky-world.js` | geração (`generateSky` logo depois do Coração, `finalizeSky` no fim) com sorteio próprio: o resto do mundo continua igual para a mesma semente |
| `js/sky-life.js` | correntes de vento, asa-delta, nuvem engarrafada, árvores-do-vento, mato e cipós, cachoeiras, luzinhas da noite e a paisagem vista do alto (mar de nuvens e ilhas distantes) |
| `js/sky-fauna.js` | arraia-do-céu, gavião-de-tempestade e medusa-de-vento |
| `js/sky-boss.js` | o Olho da Tempestade, a Lança-Trovão, as Asas da Tempestade, o mural e as inscrições |
| `tests/sky.cjs` | 44 verificações: `node tests/sky.cjs [semente] [tamanho]` |

## Os trechos

- **Jardim Suspenso**: grama celeste, árvores-do-vento (salgueiro verde-água ou flor lilás), flor-do-vento que brilha de noite, lagoas e cachoeiras que caem da beira e viram névoa.
- **Ruínas dos Vigias**: mármore, colunatas, templos com vitral e o **observatório** (cúpula de vitral, luneta, mural lido com o botão direito).
- **Ninhal das Tempestades**: pedra nua, ninhos de gravetos com o que as aves roubaram, nuvens de chuva.
- **Ninho da Tempestade**: a ilha mais alta, arena do chefe.

## Como subir

- **Pedras dos Ventos construídas**: fabrique três na bancada e coloque lado a lado sobre apoio sólido. Cada bloco custa 8 pedras, 3 obsidianas, 4 barras de ferro e 1 Núcleo de Vendaval; o Casco de Ferro entrega três núcleos. Não existem pedras ou correntes naturais. O feixe sobe pelo espaço livre e faz a curva para uma ilha próxima. **S** desce devagar. Quebrar uma pedra desativa a estrutura.
- Entre as ilhas, novas estruturas de três pedras podem levar aos andares de cima; pontes de nuvem ligam ilhas vizinhas.
- **Nuvem** segura quem pisa (como plataforma; S desce por ela).
- **Asa-delta de penas** (12 penas + 4 gravetos + 3 tecido): segure o pulo no ar para planar.
- **Nuvem engarrafada** (6 essências de nuvem + vidro + cristal-de-vento): um pulo extra no ar.
- Não existe dano de queda: cair do céu só leva de volta ao chão.

## Bichos

- **Arraia-do-céu** (mansa) plana em ondas; deixa essência de nuvem.
- **Gavião-de-tempestade** grita, mergulha e joga longe (cuidado com a beirada); deixa penas.
- **Medusa-de-vento** vaga, dá choque em quem encosta e acende à noite.

## O Olho da Tempestade

Dorme no ninho e acorda quando alguém pisa nele. **Raios** (colunas piscando no chão),
**Ventania** (agache para resistir; solta penas afiadas) e **Rasante** (grita, mostra a linha e
mergulha; errando, o bico crava no chão e ela fica **PRESA**: é a hora de bater, o golpe entra
quase dobrado; no ar entra pela metade). Abaixo de metade da vida a tempestade fecha e dois
gaviões descem. Deixa o **Olho da Tempestade** (+20 de vida máxima), as **Asas da Tempestade**
(30 segundos de voo real) e a **Lança-Trovão** (o terceiro golpe seguido chama um raio).

## Luz

Embaixo de uma ilha o sol volta a bater (`World.skyFloor`, `skyGapTop`, `skyGapBottom` em
`js/world.js`): o chão não fica no escuro, só com uma sombra suave logo abaixo, e não chove ali.
Dentro das ilhas a pedra fica numa penumbra clara (`SKY_BAND_GLOW`).

## Para testar

Painel de admin (F2): **Ir ao céu (observatório)**, **Ninho da Tempestade** e **Pedra dos Ventos**.
