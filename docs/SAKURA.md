# Vale das Cerejeiras

Bioma de inspiração japonesa com cerejeiras naturais de flores rosa-claro, grama verde-água, pétalas sobre o chão exposto e quatro camadas de paisagem com montanhas, colinas e bosques floridos. Usa os sistemas existentes de vento, queda de folhas, chuva, som ambiente e fauna da floresta.

## Geração e compatibilidade

- `BIOME.SAKURA` usa o ID 6. Mundos gerados a partir desta versão podem conter o vale; a geração reserva uma faixa quando há espaço fora da floresta inicial, sem substituir o oceano ou a savana necessária ao chefe.
- `TILE.SAKURA_GRASS` usa o ID 78, acrescentado após os blocos existentes. Tem colisão de terreno, som de grama e solta terra ao minerar. Terra exposta neste bioma cresce como grama verde-água; quando coberta, volta a ser terra.
- As árvores usam o mesmo gerador procedural e cache das outras espécies, com paleta própria. Mantêm corte, madeira, vento e sombras.
- Pétalas de chão são decoração visual estável, determinada pela semente e posição. Só aparecem neste bioma, sobre sua grama e ao ar livre, sem água ou objetos ocupando o espaço. Não criam colisões nem partículas por bloco.
- A mudança não converte mapas antigos armazenados. IDs anteriores permanecem intactos.

## Arquivos e ajustes

`js/sakura-biome.js` registra o terreno, as cores da cerejeira, os tufos verde-água e as 16 pequenas texturas reutilizadas de pétalas. `SAKURA.petalDensity` controla a cobertura (padrão 0,86, modulada por grupos naturais).

`js/world.js` controla distribuição, relevo, árvores e crescimento da grama. `js/background.js` contém o céu e as quatro camadas de paisagem. A integração também passa por `index.html`, `js/organic-trees.js`, `js/decor.js`, `js/environment.js`, `js/renderer.js`, `js/water-gen.js`, `js/structures.js`, `js/sfx.js` e `js/wildlife.js`. O mapa usa o nome em `BIOME_NAMES` e a cor registrada do bloco.

## Verificação

`node tests/sakura-biome.cjs` usa um contexto novo do navegador e não altera saves. Passaram 16 verificações: distribuição em 24 sementes, repetibilidade de um mundo completo, geração natural das cerejeiras e grama, pétalas, colisão/mineração, configuração de paisagem/mapa, restrição ao bioma, abrigo, água, objetos no chão, crescimento/cobertura da grama, ausência de areia de tempestade, fauna, câmera e renderização com shaders ligados/desligados.

`tests/sakura-biome.png` é uma captura inspecionada de um mundo gerado normalmente (semente 75413). `tests/sakura-biome-report.json` registra os resultados. Não foi feito benchmark de FPS.
