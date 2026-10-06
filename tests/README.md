# Testes de Valdoria

Execute os comandos a partir da raiz do projeto. Instale as dependências com `npm install`.

## Verificação rápida

```sh
npm run check
```

Esse comando verifica a sintaxe dos scripts e os arquivos referenciados pelo jogo, sem iniciar um navegador nem alterar mundos salvos.

## Testes no navegador

Os cenários existentes usam Playwright e, em sua maioria, Microsoft Edge em modo headless. Instale o Edge para reproduzir esses cenários. `PLAYWRIGHT_PATH` pode apontar para uma instalação alternativa do Playwright.

Alguns testes usam a instalação local em `http://localhost/jogo-teste/`, PHP em `C:/xampp/php/php.exe` e a pasta de mundos configurada para o usuário `bagre`. Ajuste esses endereços e caminhos no cenário antes de executar em outro computador. As páginas HTML nesta pasta são ferramentas de inspeção visual.

| Cenário | Comando | Requisitos |
| --- | --- | --- |
| Física de areia e neve | `node tests/falling-blocks.cjs` | Edge e endereço local do jogo |
| Pesca | `node tests/fishing.cjs` | Edge e endereço local do jogo |
| Equilíbrio da pesca | `node tests/fishing-balance.cjs` | Edge e endereço local do jogo |
| Pesca multijogador | `node tests/fishing-network.cjs` | Edge, Node e endereço local do jogo |
| Salvamento, recuperação e migração | `node tests/world-saves.cjs` | Edge e PHP local; cria arquivos temporários isolados |
| Desempenho durante o salvamento | `node tests/world-saves-performance.cjs` | Edge e PHP local; cria arquivos temporários isolados |
| Menu de salvar e continuar | `node tests/world-saves-menu.cjs` | XAMPP; cria e remove um mundo de teste na pasta definitiva |
| Leitura de mundos já migrados | `node tests/world-saves-existing.cjs` | XAMPP e mundos existentes; não grava alterações nesses mundos |

Os testes de salvamento usam servidores locais temporários, portas próprias e validação antes de remover as pastas criadas pelo cenário. O teste do menu também aciona a migração automática dos mundos antigos, como ocorre ao abrir o jogo.

Imagens, relatórios e outros resultados gerados durante as verificações não entram no Git. `bear-sheet-data.json` é mantido como dado de apoio dos testes de arte.
