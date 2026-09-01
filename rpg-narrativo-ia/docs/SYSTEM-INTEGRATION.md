# Sistema 7 — Integração explorável

O Sistema 7 conecta horário, ciclo diário, navegação, exploração, recursos e crafting ao estado principal, à persistência e, depois, à interface. Ele é fatiado. **Esta pasta documenta o andamento; o sistema inteiro ainda não está concluído.**

## Fatia 7.1 — Estado integrado e persistência principal

**Implementada.** O `GameState` passa a carregar um `SandboxState` e o save usa `schemaVersion: 2`. A interface narrativa do MVP permanece a mesma.

## Fatia 7.2 — Orquestrador de ações e tempo

**Implementada.** `executeSandboxAction` executa exatamente uma ação primária sobre o `GameState`, aplica o `TimeCost` uma única vez via `advanceDayCycle`, recupera populações, sincroniza renovação, reavalia descobertas e receitas sem custo extra e devolve um estado novo. Não persiste e não altera a interface.

## Fatia 7.3 — Da introdução à exploração livre

**Implementada.** Depois da capacidade inicial, a partida permanece `playing` com `narrativeSession: null`. O jogador está na Clareira do Despertar, o estado aceita `executeSandboxAction` e a interface mostra só uma tela mínima de transição. Os menus reais pertencem à Fatia 7.4.

## Fatia 7.4 — Superfície mobile

Ainda não implementada. Destinos, explorar, coletar e fabricar entram na interface sem minijogos nem mapa complexo.

## Estado integrado

```ts
interface SandboxContext {
  startingLocationId: string;
  map: IndexedMap;
  exploration: IndexedExploration;
  resources: IndexedResources;
  crafting: IndexedCrafting;
}

interface SandboxState {
  navigation: NavigationState;
  exploration: ExplorationState;
  resources: ResourcesState;
  crafting: CraftingState;
}

interface GameState {
  schemaVersion: 3;
  status: GameStatus;
  character: CharacterIdentity;
  narrativeSession: NarrativeSession | null;
  attributes: Attributes;
  inventory: InventoryItem[];
  relationships: Relationship[];
  flags: Record<string, boolean>;
  history: HistoryEntry[];
  world: WorldState;
  progression: ProgressionState;
  sandbox: SandboxState;
  updatedAt: string;
}

interface NarrativeSession {
  campaignId: string;
  eventId: string;
}
```

O módulo `modules/sandbox` indexa o mapa e as definições iniciais, cria o estado integrado e valida o conjunto. O `SandboxContext` inclui `startingLocationId`, mapa e índices. Antes de qualquer uso, `inspectSandboxContext` reconstrói o contexto na ordem mapa → exploração → recursos → crafting a partir das definições declarativas; os Maps recebidos nunca são devolvidos. Persistência e migração podem receber esse contexto; omitido, a aplicação usa o contexto padrão. As definições, o mapa, o local inicial do contexto e os índices (`Map`) não entram no JSON. Um save é validado contra o contexto normalizado usado para carregá-lo.

## Fontes canônicas

- `GameState.world.day` e `GameState.world.period`: único relógio persistido;
- `GameState.inventory`: inventário de coleta e crafting;
- `GameState.flags`: flags de condições e descobertas;
- `GameState.sandbox.navigation`: posição e conhecimento do mapa;
- `GameState.sandbox.exploration`: progresso e descobertas;
- `GameState.sandbox.resources`: pontos e populações;
- `GameState.sandbox.crafting`: receitas conhecidas e estruturas.

Não existe `sandbox.time`, segundo inventário, flags duplicadas nem `DaylightPhase` persistida. A fase visual continua derivada do período.

`world` permanece `{ day, period }`. Adaptadores puros `worldToTimeState` e `timeStateToWorld` convertem para o contrato de `modules/time` sem mutar as entradas.

## Schema e migração

`SCHEMA_VERSION` é `3`. O schema 3 exige `narrativeSession` (o valor pode ser `null`) e `sandbox`. Não persiste `currentEventId`.

Um save v2 válido é inspecionado por `inspectGameStateV2` e copiado campo a campo. Partidas `playing` recebem:

```ts
narrativeSession: { campaignId: 'first-day', eventId: old.currentEventId }
```

Partidas `completed` recebem `narrativeSession: null`. A migração não transforma automaticamente um save no meio da campanha em exploração.

Um save v1 válido percorre a cadeia segura `v1 → v2 → v3`: recebe o sandbox inicial do contexto e depois a sessão narrativa. Em ambos os casos a migração:

- preserva personagem, status, atributos, inventário, relações, flags, histórico, dia, período, progressão, sandbox (quando já existia) e `updatedAt`;
- não é uma ação de jogo;
- não avança o relógio;
- não adiciona itens, estruturas nem progresso de exploração;
- não muta o objeto antigo.

Saves v1, v2 e v3 malformados retornam `corrupt`. Versões diferentes de 1, 2 e 3 retornam `incompatible`. JSON inválido continua `corrupt`; string vazia continua `empty`.

A leitura **não** regrava o `localStorage`. O estado migrado só é persistido na próxima chamada de `save`. A chave `reset.mvp.save` foi preservada.

Carregar não aplica tempo, não renova recursos e não recupera populações.

## Validação

`inspectSandboxContext` é a fronteira do contexto: falha com `{ ok: false, reason }` se o conjunto for incoerente. `createInitialSandboxState` inspeciona o contexto por completo e só então cria o estado com os índices normalizados; contexto inválido lança `SandboxError`. `inspectGameState` valida o schema 3, exige `narrativeSession`, rejeita `currentEventId` e delega a `inspectNavigationState`, `inspectExplorationState`, `inspectResourcesState` e `inspectCraftingState`. Quantidades de inventário precisam ser inteiras, positivas, `Number.isSafeInteger` e únicas por `itemId`. O resultado é um objeto novo, sem reutilizar referências do JSON.

`serializeGameState` só grava um estado válido do schema atual. `serializeGameState`, `parseGameState`, `createPersistence` e `createMemoryPersistence` aceitam um `SandboxContext` opcional. `save` e `load` da mesma persistência usam o mesmo contexto. Sem argumento, o contexto padrão da Clareira do Despertar continua em vigor.

## Orquestrador de ações

O módulo `modules/sandbox-actions` é a fronteira pura da Fatia 7.2. Ele não vive em componentes React nem na persistência.

```ts
type SandboxAction =
  | { type: 'navigation.move'; locationId: string }
  | { type: 'exploration.explore' }
  | { type: 'resource.collect'; nodeId: string; units: number }
  | { type: 'crafting.craft'; recipeId: string };

function executeSandboxAction(
  state: GameState,
  action: SandboxAction,
  options?: { context?: SandboxContext; now?: () => string },
): SandboxActionResult;
```

`now` só preenche `updatedAt`. Não é o relógio do jogo. Sem contexto, usa o contexto padrão. A ação só corre com `status: 'playing'`. `narrativeSession` é copiada e não é recriada.

Antes de executar, o orquestrador normaliza o contexto, valida o `GameState` contra ele e rejeita ação malformada. Falhas lançam `SandboxActionError`, preservam a mensagem do módulo e o `cause` quando encapsulam erros de domínio, e não entregam estado parcial.

### Ordem da transação

1. ação primária (movimento, exploração, coleta ou crafting);
2. `advanceDayCycle` com o `TimeCost` devolvido — nunca `advanceTime` direto;
3. se o custo for maior que zero: `applyPopulationDayCycle` só com os eventos dessa ação;
4. se o custo for maior que zero: `synchronizeResourceRenewal` com o horário final;
5. `reevaluateDiscoveries` no local atual, sem custo;
6. `synchronizeKnownRecipes`, sem custo;
7. montar e validar o `GameState` final.

Custo zero mantém o relógio, não emite eventos de ciclo, não recupera população e não renova recursos. As reavaliações gratuitas ainda podem ocorrer. Recuperação só em `day.started`. Renovação temporal só quando o relógio avançou.

A operação é atômica: se qualquer etapa falhar, o `GameState` recebido permanece intacto. O orquestrador não chama `serializeGameState`, `save` nem `localStorage`.

## Sessão narrativa e retorno ao mundo

`startGame` abre `narrativeSession: { campaignId, eventId: campaign.firstEventId }`. Depois de `choose-ability`, as três capacidades usam `{ type: 'returnToExploration' }`: o jogador permanece `playing`, a sessão vira `null` e os efeitos da capacidade ficam no estado.

`first-priority` e os eventos posteriores não são apagados. `first-priority` está marcado com `canStartSession: true` para ser acionado no futuro por descoberta, encontro, NPC ou evento de mundo. Esta fatia não cria esse gatilho.

A interface deriva a tela do estado: narrativa com sessão, exploração mínima sem sessão, resumo quando `completed`. A tela mínima mostra nome, local, dia/período, capacidade e uma frase curta; o único botão extra é voltar ao início.

## Fora desta fatia

- botões de navegação, explorar, coletar e fabricar;
- mapa visual, menu de crafting ou inventário visual novo;
- renovação ou recuperação no carregamento;
- gatilho automático de `first-priority`;
- encontros, NPCs no mapa, combate, sobrevivência, clima, agenda, ferramentas, combustível, schema 4, backend e IA em runtime.
