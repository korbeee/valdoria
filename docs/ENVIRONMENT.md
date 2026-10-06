# Ambiente, vegetação e clima

Implementação integrada ao Canvas 2D existente. Não altera colisões, inventário, recursos, sementes ou o formato dos mundos salvos. A decoração é calculada sobre as superfícies naturais do mundo atual, incluindo mundos antigos e terreno editado.

## Resultado

- Quatro habitats subterrâneos: vegetação úmida, micélio luminoso, cristais e pedra seca. Regiões determinísticas têm paletas interpoladas e mistura de espécies nas transições. Água próxima favorece vegetação úmida.
- Samambaias, flores, juncos, cobertura seca, galhos, pedras, raízes, musgo, cogumelos, cristais e formações pendentes usam pequenos sprites procedurais com variantes. A colocação verifica teto/piso natural, espaço livre e água. Objetos ocupados não recebem decoração.
- Vento compartilhado com rajadas espaciais move copas, plantas flexíveis, folhas e partículas. Cada planta tem fase e flexibilidade próprias; pedras permanecem rígidas. A base das plantas fica presa ao terreno.
- Brisa, vento forte, garoa, chuva, tempestade elétrica, tempestade de areia e tornado. Eventos têm duração variável, entrada/saída gradual e períodos de calmaria. Areia só aparece dentro do deserto, com borda suavizada. A chuva também se atenua ao chegar a biomas secos.
- Telhados e terreno bloqueiam precipitação usando a exposição ao céu existente. Trajetos de chuva e areia são amostrados entre posições para evitar atravessar blocos. Folhas ambientais e pólen desaparecem ao entrar em abrigo. Cavernas recebem vento residual conforme a luz natural alcança sua entrada.
- Chuva inclinada pelo vento, respingos e pequenas ondulações em água exposta. Relâmpago visual e trovão agendado com atraso. Tornado com funil contínuo, detritos orbitais e vento local rotacional.
- Ambiência sintetizada reutiliza o áudio existente: vento, ruído subterrâneo, gotas com eco, acentos de cristal, pássaros e costa. Volume e filtro da chuva diminuem em abrigo. Luz colorida de plantas/cristais usa canais próprios, preservando a cor das tochas.

## Ajustes

Edite `ENVIRONMENT` no início de `js/environment.js`. Os valores também podem ser alterados na sessão pelo console do navegador.

| Controle | Padrão | Uso |
|---|---:|---|
| decorationDensity | 0.62 | Densidade máxima modulada por agrupamentos |
| vegetationMotion | 1 | Amplitude das plantas; 0 imobiliza |
| particleLimit | 150 | Limite de partículas ambientais |
| caveGlow | 0.16 | Halo visual de flora luminosa |
| ambienceVolume | 0.55 | Volume da ambiência adicional |
| weather.calmMin / calmMax | 65 / 150 | Intervalos de calmaria, segundos |
| weather.durationMin / durationMax | 45 / 130 | Duração normal de eventos, segundos |
| weather.transition | 12 | Escala de transição gradual |
| weather.extremeCooldown | 720 | Intervalo mínimo entre inícios de eventos extremos |
| weather.tornadoChance | 0.012 | Chance por seleção elegível, não por quadro |
| weather.dropLimit / sandLimit | 520 / 190 | Limites de chuva e areia |

As probabilidades por bioma ficam em `chooseWeather`, em `js/weather.js`. Perfis de chuva/vento ficam em `WEATHER_TYPES`. O primeiro aguaceiro da abertura continua integrado ao evento existente.

Para experimentar no console após entrar no jogo:

```js
setWeatherEvent(game, 'storm', 90, 0.8);
setWeatherEvent(game, 'sandstorm', 90); // areia continua restrita ao deserto
setWeatherEvent(game, 'tornado', 45);
setWeatherEvent(game, 'calm', 120);
```

## Arquivos

- `js/environment.js`: habitats, sprites, colocação, vento compartilhado, partículas, luz e ambiência.
- `js/weather.js`: seleção, transições, precipitação, abrigo, trovões e tornado.
- `js/renderer.js`, `js/shaders.js`, `js/world.js`: desenho integrado e propagação das luzes ambientais.
- `js/game.js`, `js/tree-fall.js`: atualização ambiental e reação das folhas.
- `js/crash-audio.js`, `js/crash-site.js`: chuva abafada em interiores e extinção de fogo somente exposto.
- `index.html`: carregamento do módulo ambiental.
- `tests/environment.cjs`, `tests/environment-live.cjs`: testes e capturas.

## Verificação e limites

Testes executados no Edge headless com o jogo local. `environment.cjs` usa cenário controlado com superfície, casa, árvore, fronteira de deserto e duas câmaras. Verifica abrigo, restrições por bioma, transições, calmaria/cooldown, trovão atrasado, rotação do vento, resposta das plantas, partículas, habitats, iluminação colorida e filtragem. Capturas `tests/environment-*.png` foram inspecionadas. As galerias de cavernas incluem uma tocha de teste para tornar a decoração visível; sem fonte local, câmaras secas permanecem escuras.

`environment-live.cjs` executa o ciclo real com tempestade e movimento; `ladder-exit.cjs`, `building-shaders.cjs` e `world-services.cjs` também passaram. Não equivale a uma sessão prolongada de exploração. O roteiro geral antigo `game-updates.cjs` tem uma falha anterior relacionada a `journalBtn`; não foi considerado uma regressão validada por esta entrega.

O tempo de desenho ficou aproximadamente entre 16 e 19 ms nos cenários subterrâneos medidos a 1100×760, zoom 2, nesta máquina. É uma medição curta de renderização, não uma garantia de FPS em outros dispositivos. Sprites/habitats têm cache limitado, decoração é descartada fora da vista e partículas têm limites; a animação usa faixas maiores em zoom distante. Não há novo desfoque de tela inteira e o HUD permanece fora dos efeitos de mundo.

O áudio foi verificado por chamadas, níveis de abrigo e agendamento; não houve avaliação auditiva. Os sons são sintetizados, sem novas gravações. Água aproveita os respingos existentes e o teste automatizado não cobre todas as configurações de cachoeiras.

Os habitats decoram a geometria existente e não escavam novas câmaras; desde a colheita (abaixo), os enfeites dão itens, mas continuam sendo enfeite, não veio de minério. Uma identidade ainda mais próxima das referências exigiria fundos subterrâneos e grandes formações desenhados à mão. O tornado é visual/ambiental, sem destruir blocos ou deslocar personagens. Não existe simulação meteorológica global de frentes: há eventos com evolução temporal e filtragem espacial por bioma. Abrigo usa a aproximação conservadora de céu visível; chuva não é transportada profundamente para dentro de entradas laterais.

## Enfeites colhíveis

O sorteio continua procedural e com a mesma cara: a semente do mundo decide o que nasce
em cada célula. O que mudou é que o resultado agora é uma coisa do mundo, não só um
desenho — dá para colher, vira item e o lugar fica vazio.

- **Colher com o clique**: enfeite embaixo do cursor, num espaço vazio ao alcance, sai com
  um clique esquerdo (mão ou ferramenta). O martelo é a exceção: ele continua mirando a
  parede de fundo atrás do enfeite.
- **Ceifar com a lâmina**: espada, faca e machado cortam de passagem todo mato que o arco
  do golpe atravessa. Cristal, pedrinha e formações de rocha não saem assim — precisam do
  clique.
- **Insetos**: cortar mato às vezes solta um bicho, que pula ou voa, foge de quem chega
  perto e some sozinho depois de alguns segundos.
- **O que volta a crescer**: mato, flor, junco, musgo, trepadeira, galho e pedrinha voltam
  no mesmo lugar depois de 2 a 7 minutos (com variação). **Cristal, cogumelo e formações
  de rocha (estalactite/estalagmite) não voltam**: uma vez colhidos, aquele ponto fica
  vazio para sempre.
- Colher um cogumelo ou musgo luminoso apaga a luz dele: o mundo recalcula a iluminação.

### O que cai

| Enfeite | Item | Volta a nascer |
|---|---|---|
| Flor | Flor do campo | sim |
| Samambaia, junco, mato seco, grama de cerejeira, musgo, trepadeira | Fibra vegetal | sim |
| Raiz, folhiço | Graveto | sim |
| Tora caída | Madeira ×2 | sim |
| Pedrinhas | Pedra | sim |
| Estalagmite, estalactite | Pedra | **não** |
| Drusa de cristal | Cristal | **não** |
| Cogumelo luminoso | Cogumelo-lanterna | **não** |

Itens novos: **Fibra vegetal**, **Flor do campo** e **Inseto** (petisco, cura 4). Cristal e
Cogumelo-lanterna são os mesmos itens que os blocos de caverna já soltavam. Receitas novas:
corda com 4 fibras, emplastro de ervas (3 fibras + 2 flores) e vaso de flores do campo.

### Ajustar

A tabela `ENV_HARVEST`, no começo da parte de colheita de `js/environment.js`, tem uma
linha por espécie: `item`/`count` (o que cai), `lamina` (se a espada ceifa), `volta`
(segundos até renascer; `0` = nunca) e `bicho` (chance de soltar inseto). Mudar de ideia
sobre estalagmite, por exemplo, é trocar `volta: 0` por um número de segundos.

O estado fica em `world.decorCut` (célula colhida -> quando volta). `world.decorCache`
guarda o sorteio por célula e é descartado quando a luz é recalculada, que é justamente
quando o mundo mudou — antes esse sorteio era refeito a cada quadro, para cada célula.

### Verificação

`node tests/env-harvest.cjs`: 18 verificações — toda espécie tem regra, colher solta item
e esvazia o lugar, o mato volta no tempo certo, cristal/cogumelo não voltam, a lâmina não
leva mineral, o golpe de espada ceifa o mato, o inseto nasce e some, e colher luminoso
manda recalcular a luz. Capturas em `tests/env-harvest-before.png`/`-after.png` e os
ícones novos em `tests/env-item-icons.png`.

Custo medido do sorteio por quadro (1280×720, zoom 2): caverna 0,19 ms -> 0,045 ms,
superfície 0,037 ms -> 0,013 ms. Era pouco antes e continua pouco: o peso do quadro estava
na quantidade de chamadas de desenho do Canvas 2D, não aqui (veja RENDERING.md).

## Puçá

Rede de cabo comprido (`js/bug-net.js`) para apanhar bicho pequeno e manso, como as de
jogos de aventura 2D. Sai da bancada com 3 gravetos e 6 fibras (ou 4 teias).

- **Botão esquerdo** dá o golpe de rede, com animação própria (veja abaixo): alcance de
  46 px contra 28 da espada, que é o cabo, e apanha o primeiro bichinho que a malha
  encostar. A puçá não machuca ninguém e não ceifa mato.
- **Botão direito** com o bicho na mão solta ele vivo de volta, onde o cursor apontar.
- **Entra na rede**: inseto do mato, libélula, coelho, lebre da neve, ave da selva, jabuti
  e peixe pequeno e manso (sardinha, lambari, truta, peixe-palhaço, cirurgião, peixe-anjo,
  peixe-cego).
- **Não entra**: qualquer bicho bravo (lobo, escorpião, aranha, hiena, raposa-kitsune),
  os grandes (elefante, cervo, grou), o porco, o tubarão, o baiacu, a água-viva e os
  chefes. A rede passa por eles sem dano e o jogo avisa por quê.
- O peixinho é um item só para todas as espécies pequenas: soltar dentro d'água escolhe a
  espécie que combina com aquela água (mar, rio ou caverna). Fora d'água ele não sai da mão.

Os ícones dos bichos apanhados não são desenhados à mão: saem da arte do próprio bicho,
encolhida para 16×16 ao montar o atlas (`js/tiles.js`, campo `criatura` do item). Assim
um bicho novo ganha ícone sozinho.

Para mudar quem entra na rede, edite `NET_CATCH` em `js/bug-net.js`: é uma linha por
espécie, ligando o bicho ao item que fica na mão.

`node tests/bug-net.cjs`: 19 verificações — apanha inseto, libélula e coelho; recusa o
lobo sem causar dano e explica; porco, elefante, tubarão, baiacu e água-viva ficam fora;
soltar devolve o bicho e gasta o item; peixinho só volta dentro d'água; todo item de bicho
tem ícone; e nenhuma receita ficou com item indefinido. Cena em `tests/bug-net-scene.png`.

### A animação da puçá

A rede não usa o golpe da espada. Ela tem perfil próprio (`SWING_NET`, em `js/bug-net.js`,
escolhido pelo campo `perfilGolpe` do item):

| | Espada | Puçá |
|---|---:|---:|
| Preparação | 0,05 s | 0,11 s |
| Varrida | 0,11 s | 0,19 s |
| Recuperação | 0,12 s | 0,17 s |
| Arco atrás / à frente | 115° / 70° | 150° / 48° |
| Depois do golpe | cai mais 8° | **sobe 26°** |

O braço arma bem atrás, a varrida é larga e quase o dobro mais demorada, e no fim a rede
**volta a subir** em vez de cair — é como se carrega uma rede depois de peneirar o ar. Esse
último detalhe entrou em `js/combat.js` como o campo opcional `assenta` do perfil, que a
espada continua usando com o valor de antes.

A puçá também não é um ícone girando como lâmina: `paintNetInHand` desenha na hora o cabo
escuro com o risco de luz e a cabeça da rede como uma massa de malha só — boca arredondada
na frente, saco afinando atrás, contorno fino e sombra por dentro, nas mesmas cores do
ícone. O saco **arrasta contra o movimento** enquanto
a rede corta o ar e **pendura para baixo** assim que ela assenta — a direção é interpolada
entre as duas conforme a velocidade da varrida. Quando algo é apanhado, a malha estufa por
um instante. O rastro de lâmina foi trocado por um sopro de ar bem fraco só na altura do
aro, e o som é o de vento, não o de aço.

O ícone de 16 px segue o estilo clássico de puçá de jogos 2D: cabo fino na diagonal com pixels de luz
alternados e a malha em xadrez de cinzas só na faixa iluminada, ficando chapada e escura
do lado da sombra. É o xadrez localizado, e não um tom chapado, que faz o olho ler "rede"
num ícone desse tamanho — xadrez na peça inteira vira padrão de transparência.

Filmstrip do golpe em `tests/bug-net-swing.png` (oito instantes do mesmo golpe) e
comparação do ícone com a referência em `tests/net-compare.png`.
