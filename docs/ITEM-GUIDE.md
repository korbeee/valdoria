# Guia da ilha

O botão de livro com lupa fica abaixo do minimapa, junto ao bestiário,
diário e receitas. Atalho: G. Escape ou Fechar devolve o controle ao jogo.
O mundo fica pausado durante a consulta.

Todos os itens com nome entram no catálogo. A busca ignora acentos e aceita
nomes de itens, criaturas e fontes; resultados com o nome exato vêm primeiro.
Categorias: materiais, construção, equipamentos e alimentos/cura.
As categorias são abas e os itens aparecem em cartões, seguindo a moldura,
paleta e tipografia do bestiário. A página à direita tem uma prévia ampliada.
Q/E trocam a aba; as setas escolhem itens na grade. A busca mantém a digitação
normal, sem acionar os atalhos. No celular, o painel fica abaixo da grade.

As páginas mostram descrição, fontes de coleta e mineração, drops e chances,
baús, destroços do avião, trocas e missões dos moradores, captura com puçá,
receitas com estação e quantidades, e produtos que usam o item.
Ingredientes e produtos são links para suas páginas.

Receitas e drops vêm das tabelas atuais do jogo, inclusive os Núcleos de
Vendaval e as novas estações. Há descrições de localização para blocos naturais.
Itens sem fonte conhecida mostram essa ausência, sem inventar uma origem.

Código: `js/item-guide.js`. Interface integrada em `js/inventory-ui.js`.
Validação: `tests/item-guide.cjs`, incluindo busca, navegação, tela pequena,
botão, atalho, pausa e fechamento.
