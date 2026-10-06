# Tigre da savana — arte atual

Silhueta baseada na referência do usuário (`user-reference.png`): corpo comprido, fundo e musculoso, cabeça baixa na linha do dorso, patas grossas com patas grandes, listras densas e onduladas (algumas bifurcadas) no corpo, nas patas e na cauda, e cauda longa que pende e enrola a ponta perto do chão.

O tigre é desenhado por código em `js/tiger-art.js`, no mesmo padrão da fauna do jogo:
1 px da arte = 1 px do mundo (sem a escala 0,6 do urso), contorno escuro por fora e paleta curta
com luz de cima/esquerda. Nenhuma imagem é carregada.

- **Esqueleto**: tronco com perfil fixo (`TIGER_BODY`), patas com juntas resolvidas por IK,
  cauda em curva e cabeça pixel a pixel (`TIGER_HEAD`, 19×17). As listras ficam presas ao
  corpo, então não tremem de um quadro para o outro.
- **Caminhada** (quadros 0–23): andar lateral dos felinos (traseira, dianteira do mesmo lado,
  depois o outro lado). A pata apoiada fica parada no chão: um ciclo cobre `TIGER_ART.STRIDE`
  px, e `tigerFrame` (em `js/savanna-art.js`) converte a distância andada no quadro. A escápula
  sobe quando a pata da frente sustenta o peso.
- **Poses** (`TIGER_FRAME`): repouso (4), salto, pouso, preparo do bote, sono (2), rugido,
  patada (2) e atordoamento (4).

Validar: `node tests/tiger-art-offline.cjs` (limites, chão, patas que não escorregam, seleção de
estados; gera `tests/tiger-art-refined.png` e a prévia animada `tests/tiger-refined-animation.html`).
No jogo: `tests/tiger-art-preview.cjs`, `tests/tiger-zoom.cjs`, `tests/predator-art.cjs`, `tests/tiger-boss.cjs`.

A versão anterior (folhas geradas por IA e o importador) está em `legacy/`.
