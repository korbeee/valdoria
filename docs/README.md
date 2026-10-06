# Documentação de Valdoria

Os documentos desta pasta descrevem os sistemas do jogo e registram decisões de desenvolvimento. Alguns são auditorias históricas; o [README principal](../README.md) contém as instruções atuais para jogar e salvar mundos.

## Mundo e natureza

- [Ilhas e estruturas do céu](CEU.md)
- [Árvores](TREES.md)
- [Bioma de cerejeiras](SAKURA.md)
- [Ambiente, vegetação e recursos naturais](ENVIRONMENT.md)
- [Lava](LAVA.md)
- [Altares do vento](WIND-ALTARS.md)

## Criaturas e chefes

- [Urso](URSO.md)
- [Habitat do tigre](TIGER-HABITAT.md)
- [Habitat da aranha](SPIDER-HABITAT.md)
- [Fiandeira](FIANDEIRA.md)
- [Yeti](YETI.md)
- [Revisão de tigre e aranha](TIGER-SPIDER-REVISION.md)
- [Arte dos chefes](BOSS-ART-DETAIL.md)
- [Visual do guardião](GUARDIAN-VISUALS.md)

## História, itens e apresentação

- [História](HISTORIA.md)
- [Abertura e voo](FLIGHT.md)
- [Guia de itens](ITEM-GUIDE.md)
- [Estações de criação](CRAFT-STATIONS.md)
- [Renderização e iluminação](RENDERING.md)
- [Auditoria histórica da versão desktop](DESKTOP-READINESS.md)

## Sistemas atuais de salvamento

O fluxo de salvamento é implementado por `js/world-saves.js`, `js/world-save-worker.js`, `server/world-saves.php` e `server/world-save-storage.php`.

O cliente captura um estado consistente, prepara e compacta o arquivo em um Web Worker e o envia à API local. A API separa o mundo em arquivos por categoria e publica o índice somente depois de concluir todas as partes. Cada parte tem um hash SHA-256 para detectar corrupção. A versão anterior e os arquivos legados são preservados em `Backups`.

O formato de transporte mantém as referências compartilhadas entre mundo, personagem, criaturas e itens. Ao carregar, a API recompõe as partes na ordem original e o cliente restaura os objetos do jogo.

O salvamento automático ocorre a cada cinco minutos, com um indicador discreto. O salvamento manual e a saída pelo menu exibem uma tela de progresso. Veja os [testes de salvamento](../tests/README.md).
