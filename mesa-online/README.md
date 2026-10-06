# Mesa Online

Hub de jogos de tabuleiro para jogar com família e amigos pelo navegador do celular, sem cadastro e sem instalar nada. Quem cria a sala recebe um código de 5 letras; os outros entram com esse código ou pelo link compartilhado.

**Versão publicada:** [felp-zone.vercel.app](https://felp-zone.vercel.app/)

O primeiro jogo é o **Magnata**, um jogo de compra e venda de imóveis no estilo dos clássicos de banco imobiliário, com tabuleiro, nomes e cartas próprios.

## Problema e hipótese

Nem todo mundo tem notebook e nem sempre dá para reunir as pessoas em volta de um tabuleiro. A hipótese é que um site leve, que funcione bem no Safari do iPhone e em qualquer celular, basta para uma partida divertida a distância.

**Sucesso:** uma partida completa de Magnata entre aparelhos diferentes, com todo mundo vendo o tabuleiro atualizar sozinho.

## O que já funciona

- **Hub:** criar sala, entrar por código ou link e compartilhar o convite pelo menu nativo do celular.
- **Lobby:** lista de jogadores com cores, anfitrião que inicia a partida (2 a 6 pessoas) e chat.
- **Magnata:**
  - dados, duplas (três seguidas levam à prisão) e salário de $200 ao passar pela Partida;
  - compra de ruas, estações e companhias;
  - aluguel dobrado com a cor completa e tabela de aluguel por casas e hotel;
  - construção e venda uniformes;
  - hipoteca e quitação com 10% de juros;
  - prisão com fiança, carta de liberdade ou três tentativas;
  - cartas de Sorte e Surpresa e impostos;
  - dívidas que travam o turno até serem pagas;
  - falência (os bens vão para o credor ou para o banco), desistência, vitória e revanche na mesma sala.
- **Sincronização:** cada aparelho consulta a sala periodicamente: a cada 1 s enquanto há movimento, espaçando até 4 s quando nada muda e 5 s com a aba em segundo plano.

Ficaram de fora nesta primeira versão: leilão de propriedade recusada, troca de propriedades entre jogadores, limite de casas do banco e tempo máximo por jogada.

## Tecnologias e arquitetura

- **Next.js 16 + React 19 + TypeScript:** front e API no mesmo projeto e no mesmo deploy da Vercel.
- **Upstash Redis (plano gratuito):** guarda as salas em produção. Sem configuração, o app usa memória, o que basta para desenvolvimento local.
- **Vitest:** testes do motor e das salas.

```text
src/
├── games/
│   ├── registry.ts          # catálogo de jogos do hub
│   └── magnata/             # motor puro: tabuleiro, cartas e regras (sem React, sem HTTP)
├── rooms/room.ts            # modelo puro da sala: lobby, chat, início, revanche
├── server/                  # casos de uso, identidade dos jogadores e armazenamento (memória/Redis)
├── app/api/rooms/...        # rotas HTTP finas que chamam src/server
├── client/                  # chamadas à API, sincronização e identidade salva no aparelho
└── components/              # telas: início, lobby, chat e mesa do Magnata
```

A arquitetura segue os princípios do RPG Narrativo: regras em TypeScript puro e testável, dados separados da interface e componentes React que apenas exibem o estado e disparam ações. O código não é compartilhado entre os dois projetos, porque cada experimento do FelpZone é independente. O que foi reaproveitado é a forma de organizar.

Decisões importantes:

- **O servidor é a autoridade.** Os dados são rolados no servidor, com aleatoriedade criptográfica, e toda ação passa pelo motor antes de ser gravada. Assim, ninguém trapaceia pelo navegador.
- **Identidade sem cadastro.** Ao entrar numa sala, o aparelho recebe um token secreto, guardado no `localStorage`. O servidor guarda somente o hash desse token, e o estado público da sala nunca o expõe.
- **Concorrência otimista.** Cada sala tem uma versão. A escrita só acontece se a versão não mudou desde a leitura (script Lua no Redis); caso contrário, a operação é refeita.
- **Consulta periódica em vez de WebSocket.** As funções da Vercel não mantêm conexões abertas. Num jogo por turnos, consultar a cada 1–4 s é suficiente, gratuito e simples. Quando nada mudou, a consulta lê apenas a versão da sala.
- **Salas temporárias.** Uma sala expira depois de 48 h sem alterações.

## Como executar

Requer Node.js 20.9 ou superior.

```bash
cd mesa-online
npm install
npm run dev
```

Abra `http://localhost:3000`. Para simular dois jogadores, use duas janelas anônimas ou outro aparelho na mesma rede (`http://<ip-do-computador>:3000`).

Verificações:

```bash
npm test          # motor do Magnata e salas
npm run lint
npm run typecheck
npm run build
```

## Publicação na Vercel (custo zero)

1. Na Vercel, importe o repositório `FelpZone` e defina **Root Directory** como `mesa-online`.
2. Em **Storage** (ou no Marketplace), adicione **Upstash for Redis** no plano gratuito e conecte-o ao projeto. A integração cria as variáveis automaticamente.
3. Faça um novo deploy.

Sem o Redis, o site abre, mas as salas não funcionam de forma confiável: cada instância da Vercel teria a própria memória. As variáveis aceitas estão em [`.env.example`](.env.example).

Consumo estimado: com 4 pessoas jogando, cada uma consulta a sala cerca de uma vez por segundo, o que dá algo como 15 mil comandos Redis por hora de jogo. Como o plano gratuito da Upstash cobre 500 mil comandos por mês, isso equivale a dezenas de horas de partida mensais, o bastante para família e amigos.

## Estado atual

Primeira versão jogável e publicada na Vercel (projeto `felp-zone`, com Upstash Redis conectado). O Magnata está completo para partidas casuais, com 26 testes automatizados, e foi validado ponta a ponta com dois navegadores simulando iPhones.

## Próximos passos

1. Jogar uma partida real com a família e anotar o que confundiu ou travou.
2. Trocas de propriedades entre jogadores (é o que mais muda a estratégia).
3. Leilão quando alguém recusa a compra.
4. Tempo máximo por jogada e ação do anfitrião para pular ou remover jogadores ausentes.
5. Segundo jogo do hub, de preferência um 1x1 rápido (Damas ou Lig-4), aproveitando a mesma camada de salas.
6. PWA (ícone na tela inicial do iPhone).
