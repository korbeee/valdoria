# Viabilidade de versão Windows — Valdoria

> Registro histórico anterior à implementação do multijogador e do salvamento completo. O projeto atual usa PHP para guardar mundos e Node.js para multijogador. Consulte o [README atual](../README.md) para executar esta versão.

Conclusão: a arquitetura atual permite empacotar o jogo como aplicativo Windows,
sem reescrever suas mecânicas. Não foi gerado nem executado um instalador/EXE nesta
auditoria. A validação confirma viabilidade técnica, não compatibilidade com todos os PCs.

## Inspeção

- 80 scripts de produção referenciados no index.html: existentes e sintaticamente válidos.
- HTML e JavaScript, Canvas 2D, WebGL e Web Audio; nenhum backend PHP/SQL encontrado.
- Não há chamadas de rede de gameplay ou dependência do XAMPP nos scripts de produção.
- A referência externa de produção encontrada é a fonte Silkscreen do Google Fonts.
- Sprites dos bosses são embutidos em JavaScript. Os 14 cursores carregam PNGs locais.
- Sprite Fusion é uma ferramenta de desenvolvimento, sem necessidade de chave para jogar.
- Opções, aparência e bestiário usam localStorage. Não há salvamento completo do mundo,
  inventário e progresso da partida. O menu já avisa que sair perde o progresso.
- Ainda não existe configuração de empacotamento Electron/Tauri no projeto.

## Testes executados

`node tests/desktop-readiness.cjs` abriu o HTML local no Edge/Chromium com HTTP(S)
bloqueado. Menu, geração de mundo, atualizações, renderização, sprites de quatro bosses,
áudio sintetizado, contexto WebGL e persistência das opções após recarregar funcionaram.
Os cursores recuaram ao padrão devido à restrição de leitura de canvas em file://.

`node tests/desktop-readiness.cjs --http` repetiu a verificação numa origem local
isolada, servida pelo próprio teste em 127.0.0.1, com rede externa bloqueada. Não usa
Apache/XAMPP. Os 14 cursores carregaram corretamente. Nenhuma exceção JavaScript
foi capturada; só avisos de otimização de leitura do Canvas. Foi gerado um mundo
de 4200 × 1200 blocos e executadas 180 atualizações com renderizações intercaladas.

Registros: tests/desktop-readiness.json e tests/desktop-readiness-http.json.
Imagem: tests/desktop-readiness.png. Não foram testados nesta auditoria todos os
combates, todos os tamanhos de mundo, controles de janela nativa, instalação,
atualização, sessões longas ou desempenho em outras GPUs. Áudio foi inicializado,
mas sua qualidade sonora não foi avaliada por escuta.

## Preparação para distribuição

1. Criar o aplicativo e instalador. Electron é um caminho compatível com a arquitetura
   observada: carrega páginas locais e fornece o ambiente Chromium.
2. Usar uma origem local estável: preferencialmente protocolo próprio registrado como
   standard/secure no Electron. Validar cursores e armazenamento nessa implementação;
   não desativar a segurança do navegador para contornar o problema de file://.
3. Incluir a fonte no pacote para manter a tipografia sem internet.
4. Implementar salvamento completo se o jogador deve retomar partidas. Definir local
   persistente por usuário, migração e comportamento ao atualizar o aplicativo.
   Os dados atuais do navegador não migram automaticamente ao novo aplicativo.
5. Adaptar fechamento, tela cheia e perda de foco e validar teclado/mouse na janela.
6. Empacotar somente recursos de produção; excluir tests, históricos de geração e
   ferramentas de API. Manter qualquer credencial fora do pacote.
7. Testar o EXE/instalador em outro Windows, offline e sem ambiente de desenvolvimento,
   incluindo áudio, GPU, salvamento, atualização e desempenho em sessões prolongadas.

Referências oficiais consultadas:
- https://www.electronjs.org/docs/latest/tutorial/tutorial-first-app
- https://www.electronjs.org/docs/latest/tutorial/tutorial-packaging
- https://www.electronjs.org/docs/latest/api/protocol
