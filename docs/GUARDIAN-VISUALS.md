# Fiandeira e Casco de Ferro — revisão visual e poderes

Sprites procedurais em pixel art, mantendo o desenho nativo do projeto. Fiandeira: quitina violeta, cerdas na silhueta, presas com veneno e marcas que acendem durante o preparo. Casco de Ferro: élitros segmentados, bordas de bronze, antenas, chifre e sulcos luminosos no preparo. Caminhadas ampliadas para 16 e 12 poses, respectivamente; quatro poses de canalização para cada chefe.

Novos ataques alternam com os anteriores:

- Fiandeira: três poças de veneno (aviso de 1,05 s, duração de 3,2 s) e erupções de seda (aviso de 1,15 s, duração de 0,55 s, lentidão breve).
- Casco de Ferro: cinco espinhos de pedra em sequência, com espaços para esquiva; dois redemoinhos de areia que se afastam em direções opostas, bloqueados por paredes.
- Alvos são fixados durante o aviso. Sem dano antes da ativação. Intervalo entre poderes: 10 s, reduzido para 7 s na segunda fase.
- Partículas, ondas de impacto, rastros de areia e marcações de queda de pedras reforçam os golpes anteriores. Máximo de 24 perigos por tipo de chefe; efeitos somem ao morrer, reiniciar encontro ou criar mundo.

Implementação em `js/guardian-powers.js`, integrada aos dois chefes, renderizador e reinício do mundo. Arte nos arquivos originais dos chefes. Nenhum drop ou evento da história foi modificado.

Validação: `node tests/guardian-powers-offline.cjs` verifica 71 sprites, determinismo, quadros de movimento/preparo, quatro poderes, aviso sem dano, dano após ativação, esquiva, expiração, deslocamento, limite, reset e desenho dos efeitos. Prévia em `tests/guardian-animation.html`. Validação dentro do jogo no navegador ainda pendente.
