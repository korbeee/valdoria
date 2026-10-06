# Estações de criação

Todas as estações são criadas no inventário, colocadas sobre chão firme e abertas com
o botão direito. O livro geral mostra a estação exigida por cada receita; a busca também
aceita nomes de estações. No mundo, cada estação mostra seu próprio conjunto de receitas.

| Estação | Custo | Uso |
| --- | --- | --- |
| Fornalha | 8 pedras + 4 madeiras | Fundir minérios, sucata e parafusos; vidro, tijolos e carvão |
| Forno | 6 pedras + 4 terras + 2 madeiras | Assar carnes e peixe, cozinhar ovos e preparar comidas |
| Bancada de trabalho | 8 tábuas + 4 gravetos | Blocos trabalhados, paredes, telhados, móveis e materiais compostos |
| Bigorna (sucata de metal) | 8 pedras + 4 sucatas de metal | Ferramentas, armas, arcos, flechas e equipamento |
| Bigorna (barras de ferro) | 8 pedras + 4 barras de ferro | Mesma bigorna, com uma receita alternativa |

A bigorna pode ser feita no inventário com sucata dos destroços ou barras de ferro.
A opção de sucata permite produzi-la antes das barras e ferramentas de ferro. Tábuas, gravetos e outros crafts simples
continuam no inventário. Cada receita aquecida inclui seu combustível no custo.

Fornalhas gastam 4 segundos por execução; fornos, 3 segundos. Shift prepara um lote.
O trabalho pertence à estação e continua com o painel fechado. Os produtos prontos são
coletados quando a estação é aberta e há espaço na mochila. Se estiver cheia, a estação
guarda o resultado. Quebrar uma estação devolve os ingredientes de um trabalho incompleto
ou solta o resultado pronto. Afastar-se fecha o painel e devolve ingredientes não usados.

Código: `js/craft-stations.js`, `js/crafting.js`, `js/inventory-ui.js`, `js/game.js`.
Verificação: `tests/craft-stations.cjs` e `tests/craft-pages.cjs`.
