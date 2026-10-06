# Especificação — Robôs do Magnata

Quatro robôs jogam uma partida de Magnata entre si até que um deles vença. A especificação define o que construir, em que ordem e como verificar. O motor atual (`src/games/magnata/engine.ts`) é a fonte de verdade das regras: os robôs **nunca** reimplementam regra, apenas escolhem entre ações que o motor aceita.

## Estado da implementação

| Parte | Estado | Onde |
| --- | --- | --- |
| `legalActions`, `netWorth`, `turnLimit`, `endReason` (seção 4) | ✅ feito | `src/games/magnata/engine.ts` |
| Contrato do robô (seção 5) | ✅ feito | `src/bots/types.ts` |
| Investidor, Conservador e Colecionador (seção 6) | ✅ feito, num esqueleto comum | `src/bots/profile.ts`, `src/bots/strategies.ts` |
| Ação de segurança e validação contra `legal` | ✅ feito (`botAction`, `safeAction`) | `src/bots/strategies.ts` |
| Robôs na mesa humana (seção 13) | ✅ feito | `src/rooms/room.ts`, `src/server/rooms.ts`, lobby |
| Robô Aleatório (6.4) | ⏳ a fazer | — |
| `runMatch` e torneio (seções 7 e 8) | ⏳ a fazer | — |
| Executor via HTTP (seção 9) | ⏳ a fazer | — |

Medição com as estratégias implementadas: em 300 partidas de 4 robôs com limite de 60 rodadas (240 turnos), o **Investidor venceu 43%**, o **Colecionador 34%** e o **Conservador 23%**. Só 54 das 300 terminaram por falência; as demais foram decididas por patrimônio. Os testes em `src/bots/bots.test.ts` verificam `legalActions` contra o motor, as invariantes da seção 4.3 e zero ações ilegais.

## 1. Objetivos

1. **Jogar sozinho:** 4 robôs completam uma partida sem intervenção humana e sempre terminam com um vencedor.
2. **Comparar estratégias:** rodar centenas de partidas para medir qual estilo de jogo vence mais.
3. **Testar o sistema:** rodar robôs contra o servidor real (API HTTP) e assistir pelo navegador como espectador.
4. **Achar bugs no motor:** milhares de partidas aleatórias não podem lançar erro inesperado nem quebrar invariantes.

Fora do escopo: inteligência artificial com modelo de linguagem, aprendizado de máquina, robôs jogando contra humanos em salas reais e troca de propriedades (o motor ainda não tem).

## 2. Problema medido: partidas que não acabam

Simulação feita no motor atual, com 4 robôs gulosos (compram, constroem, hipotecam para pagar dívidas) e 100 partidas por cenário:

| Reserva mínima de caixa | Terminaram por falência em até 3000 turnos | Mediana de turnos das que terminaram | p90 |
| --- | --- | --- | --- |
| $0 | 30 de 100 | 385 | 1136 |
| $150 | 24 de 100 | 235 | 346 |

Um **turno** é a vez de um jogador (`turnNumber` no estado), então 3000 turnos equivalem a 750 rodadas.

Sem troca de propriedades, monopólios de cor são raros, os aluguéis ficam baixos e o salário de $200 por volta sustenta todos indefinidamente. Por isso **"até um deles ganhar" exige uma regra de encerramento por limite**, descrita na seção 4.2. Ela também resolve o mesmo problema nas partidas entre pessoas.

## 3. Arquitetura

```text
mesa-online/
├── src/games/magnata/
│   ├── engine.ts            # + legalActions, netWorth, limite de turnos (seção 4)
│   └── engine.test.ts
├── src/bots/                # TypeScript puro, sem I/O
│   ├── types.ts             # contrato Bot, BotContext
│   ├── strategies/          # uma estratégia por arquivo
│   │   ├── investidor.ts
│   │   ├── conservador.ts
│   │   ├── colecionador.ts
│   │   └── aleatorio.ts
│   ├── match.ts             # runMatch: partida em memória
│   ├── tournament.ts        # runTournament: várias partidas e estatísticas
│   └── *.test.ts
└── scripts/
    ├── bots-local.ts        # CLI: torneio em memória
    └── bots-http.ts         # CLI: 4 robôs contra o servidor via HTTP
```

Princípios, os mesmos do resto do projeto:

- Estratégias são **funções puras**: recebem o estado e devolvem uma ação. Não fazem `fetch`, não leem relógio e não usam `Math.random`.
- Toda aleatoriedade vem de um **PRNG com semente**, para que qualquer partida possa ser reproduzida.
- O motor continua sendo a autoridade. Uma ação inválida do robô é bug do robô, não algo a contornar.

Os scripts rodam com `tsx` (dependência de desenvolvimento, gratuita), que respeita o alias `@/` do `tsconfig.json`:

```json
"scripts": {
  "bots": "tsx scripts/bots-local.ts",
  "bots:http": "tsx scripts/bots-http.ts"
}
```

## 4. Mudanças no motor (pré-requisito)

### 4.1 `legalActions(state, playerId): MagnataAction[]`

Lista **todas** as ações que o motor aceitaria agora daquele jogador. Para cada ação devolvida, `applyMagnataAction` não pode lançar `GameRuleError`. Para cada ação omitida, deve lançar.

| Fase | Ações possíveis (se as condições do motor permitirem) |
| --- | --- |
| `roll` | `roll`; `pay-jail-fine` e `use-jail-card` se preso; `build`, `unmortgage`, `sell-building`, `mortgage` por casa |
| `buy` | `buy` (se tiver dinheiro), `decline`; `sell-building` e `mortgage` |
| `debt` | `pay-debt` (se tiver dinheiro), `declare-bankruptcy`; `sell-building` e `mortgage` |
| `end` | `end-turn`; `build`, `unmortgage`, `sell-building`, `mortgage` |
| qualquer, exceto `finished` | `resign` |
| `finished` ou jogador fora da vez | apenas `resign`, ou nada se já faliu ou a partida acabou |

As ações por casa reutilizam `tileActionError` (ação válida quando o erro é `null`). O robô aleatório e os testes de propriedade dependem disso.

### 4.2 Limite de turnos e vitória por patrimônio

`createMagnataGame(seats, rng, options?)` passa a aceitar `options.turnLimit?: number` (sem limite quando ausente, o que mantém o comportamento atual).

- Quando `advanceTurn` faria `turnNumber` ultrapassar `turnLimit`, a partida termina: `phase = "finished"`, `winnerId` recebe o maior patrimônio e uma entrada vai para o histórico ("Limite de turnos atingido. X vence por patrimônio.").
- Novo campo `endReason: "bankruptcy" | "turn-limit" | null` no estado.
- O limite é verificado **somente na troca de turno**, nunca no meio de uma dívida ou compra.

`netWorth(state, playerId): number`, exportada:

```text
patrimônio = dinheiro
           + soma do preço das propriedades não hipotecadas
           + soma de (preço − custo de quitação) das hipotecadas
           + soma do custo das construções (casa = houseCost; hotel = 5 × houseCost)
```

Desempate: maior dinheiro em caixa e, em seguida, quem joga primeiro na ordem da mesa.

**Exposição na sala (implementado):** o anfitrião escolhe a duração no lobby com o comando `{ kind: "set-options", roundLimit }`, em que `roundLimit` é `null` (até alguém falir), `30`, `60` ou `100` rodadas. Ao iniciar, o servidor converte para `turnLimit = roundLimit × jogadores`.

### 4.3 Testes do motor

- `legalActions` × `applyMagnataAction`: em 200 partidas com semente, a cada passo, toda ação listada é aplicável e uma amostra de ações não listadas lança `GameRuleError`.
- Limite: com `turnLimit: 8`, a partida termina no 9º turno com `endReason = "turn-limit"` e `winnerId` = maior `netWorth`.
- `netWorth`: casos com hipoteca, casas e hotel.
- Invariantes, verificados a cada passo das partidas aleatórias:
  - dinheiro de jogador ativo nunca negativo fora da fase `debt`;
  - casas entre 0 e 5;
  - propriedade hipotecada sem construções;
  - diferença de casas dentro de uma cor ≤ 1;
  - jogador falido sem propriedades;
  - exatamente um vencedor quando `phase = "finished"`.

## 5. Contrato do robô

```ts
// src/bots/types.ts
import type { MagnataAction, MagnataState, Rng } from "@/games/magnata/engine";

export interface BotContext {
  state: MagnataState;              // estado completo (o jogo não tem informação oculta)
  me: string;                       // playerId do robô
  legal: MagnataAction[];           // resultado de legalActions(state, me)
  rng: Rng;                         // PRNG exclusivo deste robô
}

export interface Bot {
  id: string;                       // "investidor", "conservador", ...
  name: string;                     // nome exibido na mesa, ex.: "Robô Investidor"
  decide(ctx: BotContext): MagnataAction;
}
```

Regras do contrato:

1. `decide` só é chamado quando o robô tem algo a fazer, ou seja, quando é a vez dele e `legal` contém algo além de `resign`.
2. A ação devolvida **deve** estar em `legal` (comparação por `type` e `tile`). Se não estiver, o executor registra `illegal-action`, aplica a ação de segurança (seção 6.3) e a partida segue. O teste do robô falha.
3. Robôs **nunca** devolvem `resign`.
4. Gerenciamento antes de agir: numa mesma vez o robô pode devolver várias ações seguidas (construir, construir, depois `end-turn`). O executor chama `decide` de novo após cada ação até a vez passar. Para evitar laço infinito, há um limite de 50 ações por vez; ao estourar, o executor força a ação de segurança.

## 6. As quatro estratégias

Todas compartilham utilitários em `src/bots/strategies/shared.ts`: `myProperties`, `groupProgress`, `cheapestMortgageable`, `raiseCash(ctx, amount)` (vende construções da cor menos valiosa e depois hipoteca, sempre respeitando `legal`).

### 6.1 Investidor — agressivo

- **Compra:** sempre que puder pagar.
- **Construção:** em toda cor completa, enquanto sobrar ≥ $50 depois de construir; prioriza a cor com melhor aluguel por custo (laranja e vermelho primeiro).
- **Prisão:** paga a fiança logo, ou usa a carta, para continuar comprando nas primeiras 60 rodadas; depois disso tenta a dupla.
- **Hipoteca:** quita assim que sobrar caixa de $300.

### 6.2 Conservador — guarda caixa

- **Compra:** só se sobrar ≥ $300 depois; estações sempre que sobrar ≥ $150.
- **Construção:** só com cor completa e caixa ≥ $500 depois de construir; para em 3 casas por rua (o melhor custo-benefício).
- **Prisão:** tenta a dupla enquanto puder; usa a carta, se tiver, só na 3ª tentativa.
- **Hipoteca:** quita quando o caixa passa de $800.

### 6.3 Colecionador de cores — foco em monopólio

- **Compra:**
  - sempre, quando a rua completa uma cor ou impede outro jogador de completar a dele;
  - quando já tem uma rua da mesma cor, se sobrar ≥ $100;
  - uma rua de cor nova só se nenhum adversário tiver duas ruas dela e sobrar ≥ $200;
  - companhias nunca, salvo para bloquear a segunda;
  - estações se sobrar ≥ $200.
- **Construção:** concentra tudo na cor completa mais barata de construir até chegar a hotel e só então passa para a próxima.
- **Dívida:** hipoteca primeiro o que não pertence a cor promissora (estações, companhias, ruas avulsas).

### 6.4 Aleatório — linha de base

- Escolhe uniformemente entre as ações de `legal`, excluindo `resign` e `declare-bankruptcy` sempre que houver alternativa.
- Na fase `buy`, compra com 50% de chance.
- Serve de controle: qualquer estratégia que não vença o Aleatório com folga está mal implementada.

**Ação de segurança**, usada pelo executor em erros e no estouro do limite por vez, nesta ordem de preferência: `pay-debt` › `declare-bankruptcy` › `decline` › `roll` › `end-turn`, considerando apenas as que estiverem em `legal`.

**Dívida, comum a todos:** quando `phase === "debt"`, o robô chama `raiseCash` até ter `debt.amount` e devolve `pay-debt`. Se nem vendendo e hipotecando tudo dá para pagar, devolve `declare-bankruptcy`. Nunca declara falência se ainda puder levantar o valor.

## 7. Executor em memória — `runMatch`

```ts
interface MatchOptions {
  bots: [Bot, Bot, Bot, Bot];
  seed: number;                 // semente da partida (dados e cartas)
  turnLimit?: number;           // padrão 400
  onAction?: (event: MatchEvent) => void;   // para log e replay
}

interface MatchResult {
  seed: number;
  winnerBotId: string;
  endReason: "bankruptcy" | "turn-limit";
  turns: number;
  actions: number;
  ranking: { botId: string; netWorth: number; bankruptAtTurn: number | null }[];
  illegalActions: number;       // deve ser 0
}
```

Fluxo:

1. `rng = seeded(seed)`. Cada robô recebe o próprio `seeded(seed * 31 + índice)`, para que mudar um robô não altere os dados.
2. `state = createMagnataGame(assentos, rng, { turnLimit })`. Como `createMagnataGame` embaralha a ordem, o `ranking` é sempre reportado por `botId`, e não por posição.
3. Laço: enquanto `phase !== "finished"`, pega o jogador da vez, calcula `legal`, pede `decide`, valida e aplica com `applyMagnataAction(state, me, ação, rng)`.
4. Teto de segurança: 20 000 ações. Ao atingi-lo, a partida aborta com erro, o que indica bug no motor ou no limite de turnos.
5. Devolve `MatchResult`.

Determinismo: a mesma `seed` com os mesmos robôs produz **exatamente** o mesmo `MatchResult`. Isso precisa de um teste.

O PRNG sugerido é o mulberry32. Não use `Math.random`.

## 8. Torneio — `runTournament` e `npm run bots`

```bash
npm run bots -- --partidas 200 --semente 1 --limite 400
npm run bots -- --replay 137          # reexibe a partida da semente 137, ação por ação
```

- **Rodízio de assentos:** em cada bloco de 4 partidas, as estratégias trocam de assento (ordem de entrada) para neutralizar a vantagem de quem joga primeiro. A ordem final ainda é embaralhada pelo motor, mas a semente é a mesma no bloco.
- **Saída no terminal** (formato; os números abaixo são ilustrativos, não medidos):

```text
Partidas: 200 · semente inicial 1 · limite 400 turnos
Estratégia     Vitórias   %     Por falência   Por patrimônio   Patrimônio médio
Investidor        71     35,5%       40               31             2.940
Colecionador      64     32,0%       45               19             2.610
Conservador       48     24,0%       12               36             2.470
Aleatório         17      8,5%        6               11             1.120
Terminaram por falência: 103/200 · turnos (mediana/p90): 212/398 · ações ilegais: 0
```

- Também grava `bots-resultados.json` (ignorado no git) com todos os `MatchResult`.
- **Desempenho esperado:** o motor atual faz cerca de 8 mil ações por segundo; 200 partidas de até 400 turnos levam menos de 1 minuto.

## 9. Executor via HTTP — `npm run bots:http`

Mesmo `decide`, mas agindo pela API pública, como quatro celulares. Serve para testar servidor, armazenamento, concorrência e interface.

```bash
npm run dev                                   # outro terminal
npm run bots:http -- --url http://localhost:3000 --atraso 500 --limite 200
```

Fluxo:

1. O robô 1 chama `POST /api/rooms` com `{ name, gameId: "magnata" }`, guarda `{ code, playerId, token }` e envia `{ kind: "set-options", roundLimit }`.
2. Os robôs 2 a 4 chamam `POST /api/rooms/{code}/join` com `{ name }`.
3. O script imprime `Assista em: {url}/sala/{code}`. Quem abrir esse link entra como espectador, porque não tem assento.
4. O robô 1 envia `POST /api/rooms/{code}/commands` com `{ kind: "start" }` e o cabeçalho `x-player-token`.
5. Cada robô roda um laço independente (4 laços concorrentes no mesmo processo):
   - `GET /api/rooms/{code}?v={versão}`; se vier `unchanged`, espera e repete;
   - se for a vez dele, espera `--atraso` ms (para dar para assistir), calcula `legalActions` sobre `room.game`, decide e envia `{ kind: "game", action }`;
   - usa o `room` devolvido pelo comando como novo estado.
6. Termina quando `room.status === "finished"`, imprimindo vencedor, motivo e número de turnos.

Tratamento de respostas:

| Status | Significado | Ação do robô |
| --- | --- | --- |
| 200 / 201 | ok | segue com o `room` devolvido |
| 409 | regra violada ou estado desatualizado | recarrega a sala e decide de novo; após 3 seguidos, aborta com o erro |
| 503 | sala movimentada ou Redis indisponível | tenta de novo com espera exponencial: 250 ms, 500 ms, 1 s, 2 s; depois aborta |
| 401 / 403 / 404 | token ou sala inválidos | aborta imediatamente com mensagem clara |
| falha de rede | — | mesma espera do 503 |

Consulta: a cada 300 ms quando é a vez do robô, a cada 1 s quando não é. Os robôs não usam o chat.

### 9.1 Produção e cota gratuita

Uma partida via HTTP com 4 robôs gera milhares de comandos no Redis (cada ação ≈ 3 comandos, cada consulta ≈ 1, e são quatro robôs consultando). O plano gratuito do Upstash tem 500 mil comandos por mês.

- Por padrão o script **recusa** URLs que não sejam `localhost` ou `127.0.0.1`.
- `--permitir-producao` libera, mas impõe `--limite` ≤ 120 turnos, `--atraso` ≥ 800 ms e uma única partida, e exibe antes de começar uma estimativa de comandos consumidos.
- Torneios são sempre em memória (seção 8), nunca via HTTP.

## 10. Ordem de implementação

Cada fatia termina com `npm test`, `npm run lint` e `npm run typecheck` verdes e um commit.

1. **Fatia R1 — Motor:**
   - `legalActions`, `netWorth`, `turnLimit`, `endReason` e os testes da seção 4.3;
   - duração da sala (`set-options`) repassada a `createMagnataGame` em `runCommand("start")`, com teste no `rooms.test.ts`.
2. **Fatia R2 — Contrato e Aleatório:** `types.ts`, PRNG, `runMatch` e o robô Aleatório. Testes: determinismo, zero ações ilegais em 500 partidas, toda partida termina com vencedor.
3. **Fatia R3 — Estratégias:** Investidor, Conservador e Colecionador, com testes unitários de decisão em estados montados à mão, por exemplo:
   - o Colecionador compra a rua que completa a cor mesmo com pouco caixa;
   - o Conservador recusa uma compra que deixaria menos de $300;
   - todos pagam a dívida em vez de falir quando hipotecar resolve.
4. **Fatia R4 — Torneio:** `runTournament`, rodízio de assentos, `npm run bots` e `--replay`.
5. **Fatia R5 — HTTP:** `npm run bots:http`, tratamento de erros e proteção de produção. Teste de integração com `createMemoryStore` chamando as funções de `src/server/rooms.ts` diretamente, sem subir servidor.

## 11. Critérios de aceite

- [ ] `npm run bots -- --partidas 200 --semente 1` termina em menos de 1 minuto, com **200 vencedores** e **0 ações ilegais**.
- [ ] Rodar duas vezes com a mesma semente produz o mesmo `bots-resultados.json`.
- [ ] Cada estratégia não aleatória vence o Aleatório em pelo menos 70% dos confrontos 1×1 (100 partidas, sem limite de turnos ou com limite 400).
- [ ] As invariantes da seção 4.3 são verificadas a cada passo de 1000 partidas, sem violação.
- [ ] `npm run bots:http` contra `npm run dev` completa uma partida, e ela pode ser assistida pelo link impresso.
- [ ] Sem `turnLimit`, o comportamento das salas humanas não muda (testes atuais seguem verdes).
- [ ] README do Mesa Online atualizado com a seção "Robôs".

## 12. Decisões em aberto

- **Limite padrão nas salas humanas:** os dados da seção 2 sugerem oferecer "partida curta (100 rodadas)" no lobby. Fica para depois dos robôs.
- **Leilão e trocas:** devem aumentar muito a taxa de partidas que terminam por falência. Quando entrarem no motor, rodar o torneio de novo e atualizar a tabela da seção 2 serve como medida do efeito.
- **Nível de dificuldade:** hoje o estilo é a única escolha. Um "fácil" poderia ser o Aleatório com compra a 50%.

## 13. Robôs na mesa humana (implementado)

O anfitrião pode completar a mesa com robôs para jogar sozinho ou com menos gente.

- **Lobby:** o anfitrião escolhe o estilo e toca em **+ Robô**, e pode remover robôs antes de começar. Os robôs ganham nome ("Robô Investidor", "Robô Investidor 2"…) e cor livre. O assento de robô é um `RoomPlayer` com `bot: BotKind` e não tem token.
- **Atalho:** "Jogar sozinho contra 3 robôs" na tela inicial cria a sala, adiciona um robô de cada estilo, define 60 rodadas e começa.
- **Comandos novos** (só o anfitrião, só no lobby): `add-bot { strategy }`, `remove-bot { playerId }` e `set-options { roundLimit }`.
- **Quem faz o robô jogar:** a Vercel não mantém processos rodando, então são as consultas periódicas (`GET /api/rooms/{code}`) que fazem o robô jogar.
  - Quando é a vez de um robô e já passaram 900 ms (`BOT_DELAY_MS`) desde a última alteração, a consulta aplica **uma** jogada dele e grava com a mesma escrita otimista por versão. Se duas consultas tentarem ao mesmo tempo, só uma vence e a outra devolve o estado novo.
  - Quando a jogada seguinte do robô seria apenas passar a vez, ela vai junto, para economizar uma espera.
- **Consulta barata:** a chave curta da sala no Redis guarda `versão` ou `versão:b`. O `:b` indica que a vez é de um robô; só nesse caso a consulta lê a sala inteira mesmo sem mudança de versão.
- **Sem ninguém olhando, ninguém joga:** se todas as pessoas fecharem a página, os robôs param e retomam quando alguém voltar à sala.
- **Saída do anfitrião:** o comando passa para outra pessoa, nunca para um robô. Uma sala só com robôs não pode ficar sem humano no lobby.

Ritmo medido no navegador: com 1 pessoa e 3 robôs, uma rodada completa leva cerca de 8 s.
