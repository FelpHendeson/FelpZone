# Mesa Online

Hub de jogos de tabuleiro para jogar com família e amigos pelo navegador do celular, sem instalar nada. Dá para jogar como convidado ou com uma conta (fichas virtuais, apostas, vitórias, selos e lista de quem está online). Quem cria a sala recebe um código de 5 letras; os outros entram com esse código, pelo link compartilhado ou por um convite no menu.

**Versão publicada:** [felp-zone.vercel.app](https://felp-zone.vercel.app/)

Jogos:

- **Magnata:** compra e venda de imóveis no estilo dos clássicos de banco imobiliário, com tabuleiro, nomes e cartas próprios.
- **Dominó:** duplo-seis em quatro modalidades: Bloqueio, Compra, Pontos (5 em 5) e Duplas (2 contra 2, com batida de carroça, lá-e-lô e cruzada).

## Problema e hipótese

Nem todo mundo tem notebook e nem sempre dá para reunir as pessoas em volta de um tabuleiro. A hipótese é que um site leve, que funcione bem no Safari do iPhone e em qualquer celular, basta para uma partida divertida a distância.

**Sucesso:** uma família consegue começar, jogar e concluir uma partida em aparelhos diferentes sem ajuda técnica.

## O que já funciona

- **Perfil de visitante:** nome, retrato (24 opções) e preferências salvos no navegador. "Continuar partida" leva de volta à última sala.
- **Contas (opcionais):**
  - e-mail em formato válido e único, apelido único (sem diferenciar maiúsculas nem acentos) e senha;
  - **fichas virtuais**, sem valor real: 1.000 ao criar a conta e bônus diário de 100;
  - **aposta por partida** em qualquer jogo (50 a 1.000 fichas por pessoa): quem vence leva o pote, e robôs apostam com fichas da casa;
  - **vitórias** (no total, por jogo e em sequência) e **13 selos de conquista**, que aparecem no menu, no lobby e na mesa.
- **Online e praça no menu:** quem está online e onde (no menu, esperando no lobby ou jogando), conversa geral, aceno 👋, convite para a sua sala e perfil público de cada jogador.
- **Hub:**
  - escolha do jogo (e, no dominó, da modalidade);
  - "Jogar com amigos" cria a sala;
  - "Jogar contra robôs" monta a mesa com robôs e começa (3 no Magnata e nas Duplas; 2 no dominó individual);
  - também dá para entrar por código ou link, e o convite é compartilhado pelo menu nativo do celular.
- **Lobby:**
  - jogadores com retrato e chat;
  - o anfitrião completa a mesa com robôs (Investidor, Conservador, Colecionador) e configura a **Mesa**:
    - **tema** do tabuleiro: Clássico, Maceió, São Paulo, Brasil ou Vila Ninja (só nomes e cores, regras iguais);
    - **duração**: até restar um jogador, ou 30/60/100 rodadas com vitória por patrimônio;
    - **prazo por jogada**: depois dele, o piloto automático joga por quem sumiu, até a pessoa voltar;
    - **ritmo dos robôs**: 1 s, 2,5 s (padrão) ou 4 s entre uma ação e outra;
    - **leilão ao recusar uma compra**: ligado por padrão;
    - **empréstimos do banco**: regra opcional, marcada como variante.
- **Janelas de acontecimento:**
  - cada jogada é narrada numa janela: dados, para onde foi, o que aconteceu (compra, aluguel com o motivo do valor, cartas, prisão, construções, dívidas, empréstimos, ausência…) e quanto o saldo de cada um mudou;
  - na sua vez, os botões da decisão ficam dentro da janela, e ela só bloqueia a tela nesse momento;
  - as jogadas dos outros fecham sozinhas (com barra de tempo, em ritmo rápido, normal ou devagar, à escolha de cada pessoa), com "Próximo" e "Pular para agora";
  - o histórico completo fica numa aba, e quem recarrega não recebe a fila antiga de novo.
- **Onde cada um está:**
  - faixa fixa com todos os jogadores, saldo e variação (+/−) a cada mudança;
  - peões com o retrato de cada um, andando casa a casa;
  - câmera de cada pessoa: 🎯 seguir a vez, 🙋 eu, ✋ livre ou 🗺️ tabuleiro inteiro; tocar num jogador da faixa foca nele; zoom de 1,6× a 3×.
- **Dominó:**
  - cada pessoa vê só a própria mão; compra do monte e passe automáticos quando não há jogada;
  - pedras desenhadas para o toque no celular, pontas em destaque e escolha do lado quando a pedra serve nas duas;
  - resultado de cada mão com as pedras de todos à mostra, placar das duplas e metas configuráveis (ou mão única);
  - robôs Fácil, Médio e Difícil.
- **Magnata:**
  - dados, duplas (três seguidas levam à prisão) e salário de $200 ao passar pela Partida;
  - compra de ruas, estações e companhias;
  - aluguel dobrado com a cor completa e tabela de aluguel por casas e hotel;
  - construção e venda uniformes;
  - hipoteca e quitação com 10% de juros;
  - prisão com fiança, carta de liberdade ou três tentativas;
  - cartas de Sorte e Surpresa e impostos;
  - dívidas que travam o turno até serem pagas;
  - **leilão** de lances secretos quando alguém recusa uma compra (todos participam, inclusive robôs);
  - **trocas** de propriedades e dinheiro entre jogadores, propostas na própria vez e revalidadas no aceite;
  - falência (os bens vão para o credor ou para o banco), desistência, vitória e revanche na mesma sala (qualquer pessoa da mesa pode pedir).
- **No celular:**
  - cartão legível da casa onde está quem joga;
  - retrato do dono em cada casa, para não depender só da cor;
  - menu ⋯ com "Continuar em outro aparelho" (link pessoal de retomada), regras e preferências (avisos, animações, som).
- **Confiabilidade:**
  - a ordem das cartas nunca sai do servidor;
  - comandos repetidos não têm efeito duplo;
  - há limite de frequência contra abuso;
  - a sessão continua jogável mesmo se o navegador bloquear o armazenamento;
  - indicador "Reconectando…".

Ainda não existe: limite de casas do banco.

## Tecnologias e arquitetura

- **Next.js 16 + React 19 + TypeScript:** front e API no mesmo projeto e no mesmo deploy da Vercel.
- **Upstash Redis (plano gratuito):** guarda as salas, contas, sessões, presença e praça em produção. Sem configuração, o app usa memória, o que basta para desenvolvimento local; em produção, sem Redis, a API responde com erro claro.
- **Vitest:** testes do motor, temas, textos, robôs e salas.
- **Playwright:** testes de navegador (iPhone simulado no Chromium) contra a versão de produção, no CI a cada push.

```text
src/
├── games/
│   ├── registry.ts          # catálogo de jogos do hub
│   ├── modules.ts           # adaptador: liga cada motor à sala (começar, jogar, visão de cada um, vencedores)
│   ├── domino/              # motor puro do dominó, robôs e textos da narração
│   └── magnata/             # motor puro (sem React, sem HTTP)
│       ├── engine.ts        #   regras, rodadas, empréstimos e acontecimentos estruturados
│       ├── describe.ts      #   acontecimento → texto, no tema da partida
│       ├── beats.ts         #   acontecimentos → lances narrados (com mudança de saldo)
│       └── themes.ts        #   temas visuais (nomes e cores por casa)
├── accounts/                # regras puras das contas: validação, carteira, liquidação e selos
├── bots/                    # estratégias dos robôs do Magnata, lances de leilão e propostas de troca
├── rooms/
│   ├── room.ts              # modelo puro da sala: lobby, opções, chat, ausência, revanche
│   └── public.ts            # o que o navegador pode ver (sem segredos)
├── server/                  # casos de uso (salas, contas, apostas, praça), limites e armazenamento (memória/Redis)
├── app/api/...              # rotas HTTP finas: rooms, conta, praca, jogadores
├── client/                  # API, sincronização, avisos, perfil e identidade no aparelho
└── components/              # telas: início (conta, escolha de jogo, praça), lobby, chat,
                             #   magnata/ (tabuleiro, câmera, janelas, leilão e trocas…) e domino/ (mesa e pedras)
e2e/                         # testes de navegador (Playwright)
```

A arquitetura segue os princípios do RPG Narrativo: regras em TypeScript puro e testável, dados separados da interface e componentes React que apenas exibem o estado e disparam ações. O código não é compartilhado entre os dois projetos, porque cada experimento do FelpZone é independente. O que foi reaproveitado é a forma de organizar.

Decisões importantes:

- **O servidor é a autoridade.** Os dados são rolados no servidor, com aleatoriedade criptográfica, e toda ação passa pelo motor antes de ser gravada. Assim, ninguém trapaceia pelo navegador.
- **Visão de cada um.** Toda resposta passa por `publicRoom`, que remove a ordem dos baralhos, o monte e os dados internos e, no dominó, mostra só a mão de quem consulta (identificado pelo token do assento).
- **Acontecimentos estruturados.** O motor emite eventos com significado (`buy`, `rent`, `debt`…) e o cliente monta o texto com o tema. Estado e eventos são gravados juntos, na mesma escrita com versão.
- **Identidade sem cadastro.**
  - Ao entrar numa sala, o aparelho recebe um token secreto. O servidor guarda somente o hash desse token.
  - Se o navegador não guardar dados, o token fica em memória e a sala avisa.
  - O link de retomada (`#retomar=…`) leva o lugar para outro aparelho, e o fragmento `#` nunca vai ao servidor.
- **Contas e fichas.**
  - Senha só como hash `scrypt` com sal; sessão num cookie `httpOnly`, com só o hash do token no servidor.
  - A entrada de cada partida vira uma retenção ligada a ela: o pote é pago uma vez só, logo ao fim e de novo sempre que a conta é lida (idempotente), e a entrada volta se a sala expirar.
  - Fichas são virtuais de propósito: apostar dinheiro de verdade exigiria licença, meios de pagamento e verificação de identidade.
- **Concorrência otimista e comandos idempotentes.** Cada sala tem uma versão, e a escrita só acontece se ela não mudou desde a leitura (script Lua no Redis). Cada comando leva um `commandId`; um reenvio não repete o efeito.
- **Consulta periódica em vez de WebSocket.**
  - As funções da Vercel não mantêm conexões abertas. Num jogo por turnos, consultar a cada 1–4 s é suficiente, gratuito e simples.
  - Quando nada mudou, a consulta lê só uma chave curta, com a versão e o horário da próxima jogada automática.
  - É essa consulta que faz robôs e o piloto automático jogarem. Por isso eles pausam quando ninguém está com a sala aberta, e a mesa avisa isso.
- **Limites de frequência:**
  - criar sala: 12 a cada 10 min por IP;
  - entrar: 30 a cada 10 min por IP;
  - comandos: 90 por minuto por jogador;
  - chat: 15 por minuto;
  - cadastro: 10 por hora por IP; login: 10 tentativas a cada 10 min por IP e por e-mail;
  - praça: 10 mensagens por minuto; acenos e convites: 20 a cada 10 min.
  - As consultas não são limitadas, porque a família costuma compartilhar a mesma rede.
- **Salas temporárias.** Uma sala expira depois de 48 h sem alterações.

As decisões, com a análise que as motivou, estão em [`docs/ESPECIFICACAO-EVOLUCAO-1.md`](docs/ESPECIFICACAO-EVOLUCAO-1.md) para as janelas de acontecimento e a câmera, em [`docs/ESPECIFICACAO-EVOLUCAO-2.md`](docs/ESPECIFICACAO-EVOLUCAO-2.md), para leilão, trocas e testes de navegador, em [`docs/ESPECIFICACAO-EVOLUCAO-3.md`](docs/ESPECIFICACAO-EVOLUCAO-3.md), e para dominó, contas, fichas, apostas, selos e praça, em [`docs/ESPECIFICACAO-EVOLUCAO-4.md`](docs/ESPECIFICACAO-EVOLUCAO-4.md).

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
npm run e2e       # navegador: precisa do build; sobe `next start` na porta 3100
```

Na primeira vez, instale o navegador dos testes com `npx playwright install chromium`.

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

Publicado na Vercel (projeto `felp-zone`, com Upstash Redis conectado). Inclui as Evoluções 1 a 4, cobertas por testes automatizados (motores, robôs, salas, contas, apostas e praça) e por testes de navegador no CI. Também foi validado no navegador, com aparelhos iPhone simulados:

- dois aparelhos receberam os mesmos avisos, sem repetição;
- armazenamento bloqueado;
- link de retomada;
- temas;
- empréstimo;
- partida solo contra robôs.

## Robôs

Os robôs jogam na mesa com pessoas (estratégias em `src/bots/`) e também servem de piloto automático para quem fica ausente. Eles jogam quando os aparelhos na sala consultam o servidor, uma ação por vez, sem processo extra nem custo. O anfitrião escolhe o ritmo no lobby: rápido (1 s entre ações), normal (2,5 s, padrão) ou lento (4 s). A especificação completa, incluindo o que ainda falta (torneio em memória e robôs via HTTP), está em [`docs/ROBOS.md`](docs/ROBOS.md).

## Próximos passos

1. Jogar dominó em duplas com a família e ajustar o ritmo dos robôs e o tempo da tela de fim de mão.
2. Confirmação de e-mail e recuperação de senha, se valer o custo de um provedor de e-mail.
3. Ranking entre amigos e histórico das últimas partidas no perfil.
4. PWA (ícone na tela inicial) e um terceiro jogo do hub (Damas ou Lig-4).
