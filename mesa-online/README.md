# Mesa Online

Hub de jogos de tabuleiro para jogar com família e amigos pelo navegador do celular, sem cadastro e sem instalar nada. Quem cria a sala recebe um código de 5 letras; os outros entram com esse código ou pelo link compartilhado.

**Versão publicada:** [felp-zone.vercel.app](https://felp-zone.vercel.app/)

O primeiro jogo é o **Magnata**, um jogo de compra e venda de imóveis no estilo dos clássicos de banco imobiliário, com tabuleiro, nomes e cartas próprios.

## Problema e hipótese

Nem todo mundo tem notebook e nem sempre dá para reunir as pessoas em volta de um tabuleiro. A hipótese é que um site leve, que funcione bem no Safari do iPhone e em qualquer celular, basta para uma partida divertida a distância.

**Sucesso:** uma família consegue começar, jogar e concluir uma partida em aparelhos diferentes sem ajuda técnica.

## O que já funciona

- **Perfil de visitante:** nome, retrato (24 opções) e preferências salvos no navegador. "Continuar partida" leva de volta à última sala.
- **Hub:**
  - "Jogar com amigos" cria a sala;
  - "Jogar contra robôs" monta uma mesa com 3 robôs e começa;
  - também dá para entrar por código ou link, e o convite é compartilhado pelo menu nativo do celular.
- **Lobby:**
  - jogadores com retrato e chat;
  - o anfitrião completa a mesa com robôs (Investidor, Conservador, Colecionador) e configura a **Mesa**:
    - **tema** do tabuleiro: Clássico, Maceió, São Paulo, Brasil ou Vila Ninja (só nomes e cores, regras iguais);
    - **duração**: até restar um jogador, ou 30/60/100 rodadas com vitória por patrimônio;
    - **prazo por jogada**: depois dele, o piloto automático joga por quem sumiu, até a pessoa voltar;
    - **empréstimos do banco**: regra opcional, marcada como variante.
- **Acontecimentos da mesa:**
  - toda jogada vira um aviso para todos: compra, aluguel (com o motivo do valor), cartas, prisão, construções, hipotecas, dívidas, falências, empréstimos e ausência;
  - avisos rápidos e cartões não bloqueiam ninguém;
  - o histórico completo fica numa aba, e quem recarrega não recebe a fila antiga de novo.
- **Magnata:**
  - dados, duplas (três seguidas levam à prisão) e salário de $200 ao passar pela Partida;
  - compra de ruas, estações e companhias;
  - aluguel dobrado com a cor completa e tabela de aluguel por casas e hotel;
  - construção e venda uniformes;
  - hipoteca e quitação com 10% de juros;
  - prisão com fiança, carta de liberdade ou três tentativas;
  - cartas de Sorte e Surpresa e impostos;
  - dívidas que travam o turno até serem pagas;
  - falência (os bens vão para o credor ou para o banco), desistência, vitória e revanche na mesma sala (qualquer pessoa da mesa pode pedir).
- **No celular:**
  - cartão legível da casa onde está quem joga;
  - modo "Ampliar tabuleiro";
  - retrato do dono em cada casa, para não depender só da cor;
  - menu ⋯ com "Continuar em outro aparelho" (link pessoal de retomada), regras e preferências (avisos, animações, som).
- **Confiabilidade:**
  - a ordem das cartas nunca sai do servidor;
  - comandos repetidos não têm efeito duplo;
  - há limite de frequência contra abuso;
  - a sessão continua jogável mesmo se o navegador bloquear o armazenamento;
  - indicador "Reconectando…".

Ainda não existem: leilão de propriedade recusada, troca de propriedades entre jogadores e limite de casas do banco.

## Tecnologias e arquitetura

- **Next.js 16 + React 19 + TypeScript:** front e API no mesmo projeto e no mesmo deploy da Vercel.
- **Upstash Redis (plano gratuito):** guarda as salas em produção. Sem configuração, o app usa memória, o que basta para desenvolvimento local; em produção, sem Redis, a API responde com erro claro.
- **Vitest:** testes do motor, temas, textos, robôs e salas.

```text
src/
├── games/
│   ├── registry.ts          # catálogo de jogos do hub
│   └── magnata/             # motor puro (sem React, sem HTTP)
│       ├── engine.ts        #   regras, rodadas, empréstimos e acontecimentos estruturados
│       ├── describe.ts      #   acontecimento → texto, no tema da partida
│       └── themes.ts        #   temas visuais (nomes e cores por casa)
├── bots/                    # estratégias dos robôs e do piloto automático
├── rooms/
│   ├── room.ts              # modelo puro da sala: lobby, opções, chat, ausência, revanche
│   └── public.ts            # o que o navegador pode ver (sem segredos)
├── server/                  # casos de uso, identidade, limites e armazenamento (memória/Redis)
├── app/api/rooms/...        # rotas HTTP finas que chamam src/server
├── client/                  # API, sincronização, avisos, perfil e identidade no aparelho
└── components/              # telas: início, lobby, chat, avisos e mesa do Magnata
```

A arquitetura segue os princípios do RPG Narrativo: regras em TypeScript puro e testável, dados separados da interface e componentes React que apenas exibem o estado e disparam ações. O código não é compartilhado entre os dois projetos, porque cada experimento do FelpZone é independente. O que foi reaproveitado é a forma de organizar.

Decisões importantes:

- **O servidor é a autoridade.** Os dados são rolados no servidor, com aleatoriedade criptográfica, e toda ação passa pelo motor antes de ser gravada. Assim, ninguém trapaceia pelo navegador.
- **Visão pública.** Toda resposta passa por `publicRoom`, que remove a ordem dos baralhos e os dados internos.
- **Acontecimentos estruturados.** O motor emite eventos com significado (`buy`, `rent`, `debt`…) e o cliente monta o texto com o tema. Estado e eventos são gravados juntos, na mesma escrita com versão.
- **Identidade sem cadastro.**
  - Ao entrar numa sala, o aparelho recebe um token secreto. O servidor guarda somente o hash desse token.
  - Se o navegador não guardar dados, o token fica em memória e a sala avisa.
  - O link de retomada (`#retomar=…`) leva o lugar para outro aparelho, e o fragmento `#` nunca vai ao servidor.
- **Concorrência otimista e comandos idempotentes.** Cada sala tem uma versão, e a escrita só acontece se ela não mudou desde a leitura (script Lua no Redis). Cada comando leva um `commandId`; um reenvio não repete o efeito.
- **Consulta periódica em vez de WebSocket.**
  - As funções da Vercel não mantêm conexões abertas. Num jogo por turnos, consultar a cada 1–4 s é suficiente, gratuito e simples.
  - Quando nada mudou, a consulta lê só uma chave curta, com a versão e o horário da próxima jogada automática.
  - É essa consulta que faz robôs e o piloto automático jogarem. Por isso eles pausam quando ninguém está com a sala aberta, e a mesa avisa isso.
- **Limites de frequência:**
  - criar sala: 12 a cada 10 min por IP;
  - entrar: 30 a cada 10 min por IP;
  - comandos: 90 por minuto por jogador;
  - chat: 15 por minuto.
  - As consultas não são limitadas, porque a família costuma compartilhar a mesma rede.
- **Salas temporárias.** Uma sala expira depois de 48 h sem alterações.

As decisões desta versão, com a análise que as motivou, estão em [`docs/ESPECIFICACAO-EVOLUCAO-1.md`](docs/ESPECIFICACAO-EVOLUCAO-1.md).

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
npm test          # motor, temas, textos, robôs e salas
npm run lint
npm run typecheck
npm run build
```

## Publicação na Vercel (custo zero)

1. Na Vercel, importe o repositório `FelpZone` e defina **Root Directory** como `mesa-online`.
2. Em **Storage** (ou no Marketplace), adicione **Upstash for Redis** no plano gratuito e conecte-o ao projeto. A integração cria as variáveis automaticamente.
3. Faça um novo deploy.

Sem o Redis, a API de produção responde 503 com "O servidor está sem banco de dados configurado". As variáveis aceitas estão em [`.env.example`](.env.example).

**Consumo (estimativa, não medição):**

- cada consulta periódica custa 1 comando Redis quando nada mudou, e 2 a 3 quando há novidade;
- cada jogada custa cerca de 2 a 3;
- com 4 aparelhos consultando a cada segundo, a ordem de grandeza é de 15 mil comandos por hora de jogo.

O plano gratuito do Upstash tem limite mensal de comandos. Confira o valor atual no painel antes de decisões de capacidade e acompanhe o consumo real em **Usage**.

## Estado atual

Publicado na Vercel (projeto `felp-zone`, com Upstash Redis conectado). Inclui as correções e funções da Evolução 1, cobertas por 70 testes automatizados. Também foi validado no navegador, com aparelhos iPhone simulados:

- dois aparelhos receberam os mesmos avisos, sem repetição;
- armazenamento bloqueado;
- link de retomada;
- temas;
- empréstimo;
- partida solo contra robôs.

## Robôs

Os robôs jogam na mesa com pessoas (estratégias em `src/bots/`) e também servem de piloto automático para quem fica ausente. Eles jogam quando os aparelhos na sala consultam o servidor, uma jogada a cada ~1 s, sem processo extra nem custo. A especificação completa, incluindo o que ainda falta (torneio em memória e robôs via HTTP), está em [`docs/ROBOS.md`](docs/ROBOS.md).

## Próximos passos

1. Jogar uma partida real com a família e anotar o que confundiu ou travou (seção 14 da análise sugere o que medir).
2. Trocas de propriedades entre jogadores (é o que mais muda a estratégia), com os mesmos avisos e confirmações.
3. Leilão quando alguém recusa a compra.
4. Conta opcional para recuperar o perfil em outro aparelho, PWA e segundo jogo do hub (Lig-4 ou Damas).
