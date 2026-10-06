# Yeti, o Abominável

Chefe de clima da tundra. Neve comum e a nevasca forte participam do sorteio natural
do bioma de gelo. A nevasca respeita o intervalo dos fenômenos extremos.

Condições de aparição: bioma de neve, céu aberto, jogador próximo do chão,
evento `blizzard` ou `storm`, intensidade ≥ 85%, precipitação ≥ 80% e vento
≥ 65 px/s. Após seis segundos nessas condições, procura chão livre a 18–38
blocos do jogador. Não altera terreno nem aparece em cavernas ou sob coberturas.
Só aparece uma vez por tempestade; outra tempestade pode gerar outro encontro.
Sair do gelo ou terminar a tempestade faz o chefe se dissolver sem contar como
derrota nem gerar itens. Morte do jogador e afastamento encerram o encontro.

720 de vida. Esmagamento (28 de dano) com aviso no chão e recuperação vulnerável
(1,5× de dano recebido); gelo balístico (18); sopro direcionado (10); contato
(12). Paredes param os projéteis, inclusive em passos longos. Abaixo de 40% de
vida, anda mais rápido e reduz as pausas. Derrota tem animação antes dos espólios.

Recompensas garantidas: Coração da Nevasca (+20 de vida máxima), Presa do
Abominável (8% de redução de dano no cinto), 6–10 cristais e 20–30 neve.
O bestiário classifica o Yeti como chefe. O guia deriva a origem dos itens
das mesmas definições de espólios.

Pixel art em 160×152, com pixels individuais e o mesmo tamanho no mundo. A silhueta
de perfil tem costas arqueadas, cabeça à frente dos ombros, braços longos e
pesados, mãos largas e pernas curtas flexionadas. Pelagem clara e sombras em
azul acinzentado usam 22 cores. A folha gerada por ImageGen fica em `assets/yeti`;
os prompts e o processamento estão em `assets/yeti/PROMPT.md`.
O refinamento do rosto mantém as proporções aprovadas, separa sobrancelhas,
olhos âmbar, nariz, focinho, boca e presas antes da redução sem suavização.
A grade tem quatro vezes mais pixels que a versão anterior (80×76), preservando
os detalhes faciais. A limpeza de franjas atua nas bordas, conservando as cores
dos olhos no interior do sprite.
128 novos quadros de arte cobrem caminhada, rugido, esmagamento, arremesso,
sopro, recuperação, aparição e derrota. Cada sequência usa 16 quadros,
preservando a base aprovada para o repouso. A importação
mantém a escala, alinha os pés e remove fragmentos das células vizinhas.
Os pixels são guardados em RLE e pintados uma vez no cache dos sprites.
O sopro sai da posição da nova boca.
Tem nove sequências de 16 quadros: repouso,
caminhada, rugido, esmagamento, arremesso, sopro, recuperação, aparição e derrota.
Os sprites normais e de dano são armazenados em cache. Neve limitada a 160
flocos, sem filtros ou novas varreduras do mapa inteiro a cada quadro.

Importação das animações: `node tests/build-yeti-animation.cjs`.
Revisão da caminhada: `assets/yeti/walk-16-v3.png` e sprites finais em
`assets/yeti/walk-game-v3.png`; detalhes em `assets/yeti/WALK-V3-PROMPT.md`.
Cada quadro usa o desenho completo, sem recortes de membros nem deformação
por regiões. Os cotovelos flexionados mantêm os punhos acima dos joelhos,
separando visualmente as mãos dos dois pés. O ciclo dura
96 pixels de deslocamento (1,33 s na velocidade normal), acelerando na fúria.
Os quadros de caminhada são ordenados pela fase de apoio e retorno: o pé
dianteiro recua em relação ao corpo durante o apoio, em vez de avançar sobre
o chão. A folha na ordem final está em `assets/yeti/walk-game-forward.png`.
Fontes: `assets/yeti/{walk,roar,slam,throw,breath,recover,appear,defeat}-16.png`.
O esmagamento chega ao quadro de contato em 0,82 s e o arremesso solta o gelo
em 0,8 s. Recuperação e derrota seguram o último quadro; o sopro só repete a
parte sustentada, conservando preparação e encerramento. A aparição inclui
o rugido dentro dos mesmos 1,8 s de entrada. O deslocamento controla a cadência
da caminhada, inclusive durante a fúria. As poses intermediárias do rugido
ajudam a levantar os punhos antes do esmagamento, sem troca súbita de posição.

Verificação: `node tests/yeti-boss.cjs`. Prévia: `tests/yeti-preview.html`.
