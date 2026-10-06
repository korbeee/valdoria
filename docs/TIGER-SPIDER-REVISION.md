# Tigre, pernas da Fiandeira e Carne Suculenta

- Tigre: corpo e espáduas mais robustos, nova cabeça pixel a pixel, paleta terrosa, focinho com volumes separados e oito grupos principais de listras. Preservados o esqueleto, a trajetória das patas, o ciclo de 24 passos e todas as poses de repouso, salto, preparo, sono, rugido, patada e atordoamento (40 quadros ao todo).
- Fiandeira: 24 passos em lugar de 16, oito pernas com fases defasadas, apoio prolongado, retorno em arco com joelhos acompanhando a elevação. Quatro novos quadros de repouso, 51 quadros totais. Mantida a duração do ciclo em relação à distância percorrida.
- Carne Suculenta (ID 189): drop garantido de Bramido, categoria `bossItem`, rótulo **Item de boss**, ícone próprio e instruções no inventário. Não é comida nem ingrediente. Soltar uma unidade com Q perto do Tigre da Savana adormecido inicia o encontro. Carne comum, carne assada e osso não servem mais.
- Ao reiniciar a luta do tigre, a unidade usada volta à mochila; se estiver cheia, cai aos pés do jogador. Itens de boss não expiram no chão. Moradores e avisos do tigre explicam a nova isca; painel de itens possui categoria própria.

Validação local: `node tests/succulent-meat.cjs`, `node tests/tiger-art-offline.cjs tiger-reformulated`, `node tests/guardian-powers-offline.cjs`, `node tests/boss-detail-preview.cjs tiger-spider-revision`. Verificam isca/drop/categoria/descrição/devolução, cores e limites de 155 quadros, 24 passos distintos da Fiandeira e apoio das patas/seleção das animações do tigre. Sintaxe dos arquivos alterados verificada. Teste completo no navegador não realizado nesta revisão.

Prévias: `tests/tiger-refined-animation.html`, `tests/guardian-animation.html` e `tests/boss-detail-animation.html`.
