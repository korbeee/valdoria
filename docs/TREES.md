# Árvores de Valdoria

As árvores de folhas largas têm troncos curvos com raízes, bifurcações e copas assimétricas. A folhagem usa folhas afiladas desenhadas em pares nos ramos, com sombras internas e aberturas entre galhos. Cerejeiras e salgueiros incluem folhas pendentes. Pinheiros têm ramos de agulhas sobrepostos; a versão nevada acumula pequenos montes de neve nos ramos. Acácias têm bifurcações abertas e copas baixas divididas. Palmeiras mantêm sua arte anterior. As espécies continuam associadas aos seus biomas.

## Variação e integração

- A semente do mundo, o bioma e a coluna da árvore determinam espécie, tamanho da copa, inclinação, galhos e textura. A mesma árvore mantém a aparência após sair e voltar; outro mundo produz outras árvores.
- A geração do terreno e as colunas de tronco permanecem intactas. Mundos existentes recebem a nova aparência sem conversão de saves. A largura visual dos galhos e raízes não adiciona colisões.
- O tronco e os galhos são desenhados separadamente das folhas, que usam o vento existente. A iluminação consulta a copa gerada para calcular sua cobertura.
- Ao cortar, a animação reutiliza a mesma copa e o trecho correto do tronco. Tocos e quantidade de madeira seguem as regras anteriores.
- Só a árvore inteira tomba para o lado (a que ainda mostra copa, com tronco no topo da coluna). Depois do primeiro corte o topo vira toco: dali em diante a madeira que ficou em pé sai bloco a bloco, e se perder o apoio desce no lugar em vez de tombar de novo. Tirar o toco não desfaz o corte: o tronco que fica embaixo vira toco na hora, então a copa não volta a nascer nem a árvore volta a tombar.
- Os sprites são gerados sob demanda e reutilizados. O cache de copas mantém até 192 árvores; os troncos têm até oito alturas por copa. Sombras e outras imagens derivadas usam referências fracas. A geração inicial ainda tem custo de CPU; não foi medido FPS no navegador nesta alteração.

## Ajustes

Em `js/organic-trees.js`, `ORGANIC_LEAVES` define as paletas, `generateOrganicCanopy` define dimensões, bifurcações e densidade, `organicCanopyFor` define as proporções por espécie e bioma, e `ORGANIC_TREES.cacheLimit` limita o cache. Alterações na forma exigem recarregar a página ou limpar os caches.

`treeLeaf` e `treeLeafCluster` definem as folhas e sua organização; `generateOrganicPine` e `generateOrganicAcacia` definem os modelos específicos. O menu usa o mesmo gerador de árvores e recebe as alterações automaticamente.

Integração: `index.html`, `js/decor.js`, `js/renderer.js`, `js/shaders.js` e `js/tree-fall.js`.

## Verificação

`node tests/organic-trees.cjs` executa o código de produção com Canvas nativo, sem navegador. Confere variação, repetibilidade, cache, semente, biomas, arte durante o corte, toco e quantidade de madeira. Gera `tests/organic-trees-gallery.png` e `tests/organic-trees-report.json`. A galeria foi inspecionada visualmente e usada para ajustar volume da copa e espessura dos troncos. `node tests/render-math.cjs` verifica as oito regressões matemáticas de iluminação.

`node tests/tree-foliage-preview.cjs` abre o jogo local em um contexto novo do Edge, sem alterar saves. Uma cena controlada usa árvores de selva, pinheiros, pinheiros nevados e acácias, com shaders ativos. Verifica cache estável durante movimento da câmera e mudança do vento, corte das quatro espécies com a mesma arte e ausência de erros de quadro. As capturas `tests/tree-foliage-world.png` e `tests/menu-new-trees.png` foram inspecionadas. As dez verificações locais e três verificações no navegador passaram na revisão da folhagem. Não foi feito benchmark de FPS.
