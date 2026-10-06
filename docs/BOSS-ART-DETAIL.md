# Revisão do acabamento dos quatro bosses

Referências visuais fornecidas pelo usuário em 28/09/2026: sprites em pixel art com volumes distintos, contornos legíveis, materiais separados e detalhes anatômicos. Revisão feita nos assets nativos do projeto, mantendo a grade, escala, poses, colisões e seleção de animações.

- Bramido: paleta de pelagem com mais separação entre sombras, meios-tons e áreas iluminadas; focinho em marfim e olhos em âmbar. Folha e geometria preservadas.
- Tigre: focinho com nariz escuro, pontos dos bigodes e sombras no branco; tufos do dorso e agrupamentos de cor nos músculos, acompanhando as poses existentes.
- Fiandeira: pernas mais segmentadas, joelheiras e esporões, placas arqueadas no abdome, marca craniana redesenhada, tórax com divisões e presas curvas.
- Casco de Ferro: élitros com sulcos curvos e sombra nas bordas, arranhões agrupados por placa, bordas de bronze, cabeça segmentada, chifre curvo e mandíbulas mais espessas.

Verificações locais: `node tests/boss-detail-preview.cjs` (143 quadros, dimensões, cores e transparência); `node tests/guardian-powers-offline.cjs` (arte determinística, caminhada, poderes e resets); `node tests/tiger-art-offline.cjs` (poses, seleção de estados e apoio das patas). Sintaxe dos quatro arquivos verificada. Lutas completas no navegador não verificadas nesta revisão.

Comparação: `tests/boss-detail-comparison.html`. Prévia animada: `tests/boss-detail-animation.html`. Imagem anterior preservada em `tests/boss-detail-before.png`.
