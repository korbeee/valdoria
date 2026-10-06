# A história de Valdoria

Código em `js/story.js`. Cada chefe derrotado abre um lugar novo; cada lugar tem um enigma;
cada enigma resolvido grava um capítulo na **Crônica de Valdoria** (tecla **L**).

## O fio

Há muito tempo, os **Vigias do Céu** viram uma estrela cair e se enterrar na ilha: o
**Coração do Céu**, que puxa para si tudo o que voa. Para calá-lo, eles prenderam quatro feras a
quatro selos: o Urso da Serra, o Tigre de Âmbar, a Tecelã do Poço e o Escavador da Areia. Cada
guardião que cai abre um selo. É esse puxão que derrubou o avião do jogador e, em 1974, o da
Expedição Halden.

## Chefes, lugares e enigmas

| Chefe cai | O que se abre | Enigma | Capítulo |
|---|---|---|---|
| **Bramido, o Patriarca** | A rocha matriz atrás do covil racha: câmara dos Vigias com um mural do céu e quatro **pedras-glifo** | Tocar os guardiões **do mais alto ao mais baixo** no mural: Tigre, Escavador, Urso, Tecelã. Errar apaga as pedras. Acertar abre o nicho do fundo, com um baú | I · Os Vigias do Céu |
| **Tigre da Savana, Dente de Âmbar** | O chão da arena vira lajes: é a **Estrada do Âmbar**, que segue até uma praça com um **relógio de sol** (um pilar e cinco marcos) | O gnômon diz: "quando o sol morder o horizonte, a sombra aponta o cofre". A sombra só alcança o **último marco** no fim da tarde (~16h50). Tocar nele nessa hora abre um cofre sob a praça | II · A Estrada do Âmbar |
| **Fiandeira, a Matriarca do Poço** | A teia grossa do **cofre da Expedição Halden**, no ninho, se desfaz | Três páginas do diário estão pela mina: na mochila caída no túnel e nos dois baús do ninho. Elas dão o segredo **5-8-4**: sete pessoas menos duas, as oito patas, os quatro guardiões | III · O Diário de Irene Halden |
| **Casco de Ferro, o Escavador** | O portão do observatório abre e a **luneta** desperta | A placa diz: "fixe os guardiões na ordem da Serra", a mesma ordem do primeiro enigma. Na luneta (A/D gira, Espaço fixa), duas constelações falsas enganam e errar desalinha tudo | IV · O Olho do Observatório |

O último capítulo termina num gancho: o Coração acordou sob o fundo do mar ("Quem calar os
quatro terá de ouvir o quinto"). O objetivo fica "Continua...".

As páginas do diário podem ser lidas a qualquer hora com o botão direito. O mural, o gnômon e a
placa do observatório também se leem com o botão direito. Antes de o chefe cair, os lugares
ficam fechados ou dormentes: pedras frias, estrada enterrada, cofre na teia, luneta emperrada.

## Mudanças ligadas a isso

- O tigre passou a se chamar **Tigre da Savana, Dente de Âmbar** (nome, barra e bestiário).
- Estruturas sorteadas (poços, torres, minas) não furam mais o covil do urso nem a câmara nova.
- Os blocos novos: pedra-glifo, pedra da estrada antiga e cofre da expedição.

## Verificação

`node tests/story.cjs` joga a história inteira em 26 verificações: os quatro lugares existem;
cada um fica fechado antes do chefe e abre depois; cada enigma rejeita a resposta errada e
aceita a certa; os quatro capítulos entram na Crônica; a Crônica abre; a página se lê com o
botão direito.
