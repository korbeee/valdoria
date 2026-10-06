# Valdoria

**Explore as profundezas. Construa seu refúgio. Encontre seu lugar na natureza.**

Valdoria é um jogo de aventura e sobrevivência em mundo aberto 2D, com visual pixel art. Explore biomas e cavernas, construa seu refúgio, crie equipamentos, pesque e enfrente criaturas e chefes. Jogue sozinho ou com amigos e salve seus mundos para continuar sua jornada.

## O que você encontra no jogo

- Mundos gerados por semente, com três tamanhos e diferentes biomas.
- Construção, mineração, equipamentos, criação de itens e armazenamento em baús.
- Criaturas, chefes, habitantes, missões e uma história de sobrevivência.
- Pesca com diferentes espécies, iscas, varas e disputa para recolher o peixe.
- Ciclo de dia e noite, clima, iluminação, água, lava e blocos sujeitos à gravidade.
- Multijogador com servidor próprio e partidas em rede local.
- Lista de mundos na tela **Continuar**, salvamento manual e automático a cada **5 minutos**.

## Rodar no Windows com XAMPP

1. Instale o XAMPP com PHP 8.1 ou superior e inicie o Apache.
2. Baixe ou clone este repositório para `C:\xampp\htdocs\valdoria`:

   ```sh
   git clone https://github.com/korbeee/valdoria.git C:/xampp/htdocs/valdoria
   ```

3. Abra **http://localhost/valdoria/** no navegador.
4. Escolha **Novo jogo**, configure o mundo e crie seu personagem.

O jogo usa HTML, JavaScript, Canvas 2D, WebGL e Web Audio. Não é necessário compilar o jogo nem instalar dependências para jogar sozinho. A fonte Silkscreen é carregada pelo Google Fonts. O PHP permite guardar os mundos no computador; para usar o salvamento, abra o jogo pelo endereço local do Apache.

## Multijogador

Instale Node.js 18 ou superior. Na pasta do projeto, execute:

```sh
node server/server.js
```

No Windows, também é possível abrir `server/iniciar-servidor.bat`. O servidor usa a porta **8787** e não precisa de dependências npm. A tela **Multijogador** permite hospedar e entrar nas partidas. Para jogar pela rede local, use o endereço indicado pelo servidor e permita a conexão no firewall.

A porta pode ser configurada pela variável `PORT`; a pasta dos dados do servidor, por `DATA_DIR`.

## Mundos salvos

A configuração atual grava em:

```text
C:\Users\bagre\Documents\My Games\Valdoria
```

Para usar outra pasta, configure a variável de ambiente `VALDORIA_SAVE_DIR` no processo do PHP/Apache. Reinicie o Apache depois de configurar a variável. Os mundos só podem ser acessados pela API a partir do próprio computador.

Cada mundo tem uma pasta com seu nome e estas áreas:

```text
Nome do mundo/
├── Personagem/
├── Itens/
├── Terreno/
├── Criaturas/
├── Mapa/
├── Progresso/
├── Backups/
├── Sistema/
└── mundo.json
```

Os arquivos antigos são migrados automaticamente e preservados em `Backups/Legado`. O salvamento automático ocorre em segundo plano. Salvar manualmente ou sair pelo menu exibe uma tela de progresso.

## Organização do projeto

| Pasta ou arquivo | Conteúdo |
| --- | --- |
| `index.html` | Entrada do jogo e carregamento dos scripts |
| `js/` | Mundo, física, personagens, renderização, interfaces e mecânicas |
| `assets/` | Recursos visuais, cursores, sprites e arquivos de criação dos recursos |
| `server/` | Servidor multijogador e API local de salvamento em PHP |
| `docs/` | Documentação dos sistemas e registros de desenvolvimento |
| `tests/` | Verificações e páginas de inspeção visual |

Veja o [índice da documentação](docs/README.md) e as [instruções de testes](tests/README.md).

## Desenvolvimento

Com Node.js instalado:

```sh
npm install
npm run check
```

`npm run check` verifica a sintaxe dos scripts e as referências locais do jogo. Os testes de navegador usam Playwright; consulte `tests/README.md` para executar os cenários específicos.

O projeto está em desenvolvimento. Os mundos dos jogadores, dados pessoais do servidor, dependências instaladas e resultados temporários dos testes são mantidos fora do controle de versão.
