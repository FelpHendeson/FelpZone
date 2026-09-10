# Sistema 7 — Integração explorável

O Sistema 7 conecta horário, ciclo diário, navegação, exploração, recursos e crafting ao estado principal, à persistência e, depois, à interface. Ele é fatiado. **O marco mínimo foi atingido na Fatia 7.5:** o jogador encontra a criatura e Mira por uma ação no mundo e retorna ao sandbox. A próxima etapa não foi escolhida; consulte `PROJECT-STATUS.md` para separar metas confirmadas de hipóteses ainda não discutidas.

## Fatia 7.1 — Estado integrado e persistência principal

**Implementada.** O `GameState` passa a carregar um `SandboxState` e o save usa `schemaVersion: 2`. A interface narrativa do MVP permanece a mesma.

## Fatia 7.2 — Orquestrador de ações e tempo

**Implementada.** `executeSandboxAction` executa exatamente uma ação primária sobre o `GameState`, aplica o `TimeCost` uma única vez via `advanceDayCycle`, recupera populações, sincroniza renovação, reavalia descobertas e receitas sem custo extra e devolve um estado novo. Não persiste e não altera a interface.

## Fatia 7.3 — Da introdução à exploração livre

**Implementada.** Depois da capacidade inicial, a partida permanece `playing` com `narrativeSession: null`. O jogador está na Clareira do Despertar, o estado aceita `executeSandboxAction` e a interface deriva a tela de exploração.

## Fatia 7.4 — Superfície mobile

**Implementada.** A tela de exploração é um loop jogável mobile-first: destinos visíveis, explorar, coletar e fabricar. Toda mutação passa por `executeSandboxAction`; a interface persiste somente `result.current` com o mesmo `SandboxContext` da persistência. A Fatia 8.5 acrescenta presenças conhecidas no painel Mundo, sem alterar esse contrato.

## Fatia 7.5 — Gatilho de mundo e primeiro encontro

**Implementada.** Explorar a Clareira do Despertar revela a descoberta `first-priority-event` (`kind: 'event'`, `revealAt: 10`). O módulo `modules/world-events` continua oferecendo um catálogo declarativo que pode associar descobertas a sessões. A superfície executa a ação sandbox, resolve no máximo um gatilho elegível na ordem do catálogo ativo, marca `world.trigger.<id>.consumed` em `GameState.flags` quando um gatilho dispara, abre a sessão e persiste uma única vez o estado composto. A Fatia 8.6 deixou `FIRST_DAY_WORLD_TRIGGERS` vazio: a Clareira revela Mira e a narrativa começa só por `presence.interact`. A cadeia noturna devolve o jogador à exploração. O marco mínimo do Sistema 7 foi atingido.

## Estado integrado

```ts
interface SandboxContext {
  startingLocationId: string;
  map: IndexedMap;
  exploration: IndexedExploration;
  resources: IndexedResources;
  crafting: IndexedCrafting;
  presences: IndexedPresences;
  presenceInteractions: IndexedPresenceInteractions;
}

interface SandboxState {
  navigation: NavigationState;
  exploration: ExplorationState;
  resources: ResourcesState;
  crafting: CraftingState;
  presences: PresenceState;
}

interface GameState {
  schemaVersion: 5;
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

O módulo `modules/sandbox` indexa o mapa e as definições iniciais, cria o estado integrado e valida o conjunto. O `SandboxContext` inclui `startingLocationId`, mapa, índices e os catálogos de presenças e interações. Antes de qualquer uso, `inspectSandboxContext` reconstrói o contexto na ordem mapa → exploração → recursos → crafting → presenças → interações a partir das definições declarativas; os Maps recebidos nunca são devolvidos. Persistência e migração podem receber esse contexto; omitido, a aplicação usa o contexto padrão. As definições, o mapa, o local inicial do contexto e os índices (`Map`) não entram no JSON. Um save é validado contra o contexto normalizado usado para carregá-lo.

## Fontes canônicas

- `GameState.world.day` e `GameState.world.period`: único relógio persistido;
- `GameState.inventory`: inventário de coleta e crafting;
- `GameState.flags`: flags de condições e descobertas;
- `GameState.sandbox.navigation`: posição e conhecimento do mapa;
- `GameState.sandbox.exploration`: progresso e descobertas;
- `GameState.sandbox.resources`: pontos e populações;
- `GameState.sandbox.crafting`: receitas conhecidas e estruturas;
- `GameState.sandbox.presences`: presenças descobertas e resolvidas.

Não existe `sandbox.time`, segundo inventário, flags duplicadas nem `DaylightPhase` persistida. A fase visual continua derivada do período.

`world` permanece `{ day, period }`. Adaptadores puros `worldToTimeState` e `timeStateToWorld` convertem para o contrato de `modules/time` sem mutar as entradas.

## Schema e migração

`SCHEMA_VERSION` é `5`. O schema 5 exige `sede` em `attributes`, `narrativeSession` (o valor pode ser `null`), `sandbox` e `sandbox.presences`. Não persiste `currentEventId`. Saves v4 válidos recebem `sede: 25`; saves v3 recebem primeiro o estado de presenças e sincronizam descobertas já reveladas. Saves v2 e v1 atravessam toda a cadeia `v1 → v2 → v3 → v4 → v5`.

Um save v2 válido é inspecionado por `inspectGameStateV2` e copiado campo a campo. Partidas `playing` recebem:

```ts
narrativeSession: { campaignId: 'first-day', eventId: old.currentEventId }
```

Partidas `completed` recebem `narrativeSession: null`. A migração não transforma automaticamente um save no meio da campanha em exploração.

Um save v1 válido percorre a cadeia segura `v1 → v2 → v3 → v4 → v5`: recebe o sandbox inicial do contexto, depois a sessão narrativa, o estado de presenças sincronizado com as descobertas e, por fim, `sede: 25`. Em todos os casos a migração:

- preserva personagem, status, atributos, inventário, relações, flags, histórico, dia, período, progressão, sandbox (quando já existia) e `updatedAt`;
- não é uma ação de jogo;
- não avança o relógio;
- não adiciona itens, estruturas nem progresso de exploração;
- não muta o objeto antigo.

Saves v1, v2, v3, v4 e v5 malformados retornam `corrupt`. Versões diferentes de 1, 2, 3, 4 e 5 retornam `incompatible`. JSON inválido continua `corrupt`; string vazia continua `empty`.

A leitura **não** regrava o `localStorage`. O estado migrado só é persistido na próxima chamada de `save`. A chave `reset.mvp.save` foi preservada.

Carregar não aplica tempo, não renova recursos e não recupera populações.

## Validação

`inspectSandboxContext` é a fronteira do contexto: falha com `{ ok: false, reason }` se o conjunto for incoerente. `createInitialSandboxState` inspeciona o contexto por completo e só então cria o estado com os índices normalizados; contexto inválido lança `SandboxError`. `inspectGameState` valida o schema 5, exige `sede`, `narrativeSession`, rejeita `currentEventId` e delega a `inspectNavigationState`, `inspectExplorationState`, `inspectResourcesState`, `inspectCraftingState` e `inspectPresenceState`. Quantidades de inventário precisam ser inteiras, positivas, `Number.isSafeInteger` e únicas por `itemId`. O resultado é um objeto novo, sem reutilizar referências do JSON.

`serializeGameState` só grava um estado válido do schema atual. `serializeGameState`, `parseGameState`, `createPersistence` e `createMemoryPersistence` aceitam um `SandboxContext` opcional. `save` e `load` da mesma persistência usam o mesmo contexto. Sem argumento, o contexto padrão da Clareira do Despertar continua em vigor.

## Orquestrador de ações

O módulo `modules/sandbox-actions` é a fronteira pura da Fatia 7.2. Ele não vive em componentes React nem na persistência.

```ts
type SandboxAction =
  | { type: 'navigation.move'; locationId: string }
  | { type: 'exploration.explore' }
  | { type: 'resource.collect'; nodeId: string; units: number }
  | { type: 'crafting.craft'; recipeId: string }
  | { type: 'presence.interact'; presenceId: string; interactionId: string }
  | { type: 'needs.consume'; itemId: string }
  | { type: 'needs.rest'; mode: 'simple' | 'campfire' };

function executeSandboxAction(
  state: GameState,
  action: SandboxAction,
  options?: { context?: SandboxContext; now?: () => string; campaign?: Campaign },
): SandboxActionResult;
```

`now` só preenche `updatedAt`. Não é o relógio do jogo. Sem contexto, usa o contexto padrão. A ação só corre com `status: 'playing'`. `narrativeSession` é copiada; `presence.interact` pode abri-la quando o plano declarar uma referência válida e `canStartSession` permitir. `campaign` é obrigatória nessas interações narrativas.

Antes de executar, o orquestrador normaliza o contexto, valida o `GameState` contra ele e rejeita ação malformada. Falhas lançam `SandboxActionError`, preservam a mensagem do módulo e o `cause` quando encapsulam erros de domínio, e não entregam estado parcial.

### Ordem da transação

1. ação primária (movimento, exploração, coleta, crafting, interação de presença, consumo ou repouso), incluindo seus efeitos declarativos;
2. `advanceDayCycle` a partir do mundo resultante, com o `TimeCost` devolvido — nunca `advanceTime` direto;
3. `applyNeedsWear` para exatamente a quantidade de períodos cobrados;
4. se o custo for maior que zero: `applyPopulationDayCycle` só com os eventos dessa ação;
5. se o custo for maior que zero: `synchronizeResourceRenewal` com o horário final;
6. `reevaluateDiscoveries` no local atual, sem custo;
7. `synchronizeKnownRecipes`, sem custo;
8. `synchronizeDiscoveredPresences`, sem custo;
9. se a interação declarar narrativa válida: `startNarrativeSession`;
10. montar e validar o `GameState` final.

Custo zero não acrescenta avanço nem desgaste, não emite eventos de ciclo, não recupera população e não renova recursos; um efeito declarativo válido ainda pode alinhar o período. As reavaliações gratuitas ainda podem ocorrer. Recuperação só em `day.started`. Renovação temporal só quando o `TimeCost` avançou o relógio.

A operação é atômica: se qualquer etapa falhar, o `GameState` recebido permanece intacto. O orquestrador não chama `serializeGameState`, `save` nem `localStorage`.

## Sessão narrativa e retorno ao mundo

`startGame` abre `narrativeSession: { campaignId, eventId: campaign.firstEventId }`. Depois de `choose-ability`, as três capacidades usam `{ type: 'returnToExploration' }`: o jogador permanece `playing`, a sessão vira `null` e os efeitos da capacidade ficam no estado.

`first-priority` e os eventos posteriores não são apagados. `first-priority` está marcado com `canStartSession: true` e passa a ser aberto pela interação `talk` da presença de Mira. Seus efeitos de período só avançam dentro do mesmo dia e nunca fazem o relógio retroceder. O mecanismo genérico de gatilhos permanece no adaptador, mas o catálogo da campanha `first-day` está vazio. Saves que já possuem `world.trigger.first-priority.consumed` sincronizam a presença revelada por `first-priority-event` e a reconciliam como resolvida, para não repetir o encontro.

A interface deriva a tela do estado: narrativa com sessão, exploração sem sessão, resumo quando `completed`. Um único `SandboxContext` alimenta persistência, leitura da interface e `executeSandboxAction`. Depois de uma ação sandbox, a integração consome gatilhos cujo evento já foi aberto, resolve gatilhos elegíveis sobre o estado seguinte, abre no máximo uma sessão, consome só o gatilho escolhido, resolve presenças resolvíveis da descoberta correspondente e grava uma vez o estado final. Carregar um save não dispara narrativa nem regrava o armazenamento.

Explorar a Clareira do Despertar revela e desbloqueia progressivamente passagens para a Grande Árvore, a Nascente e a Mata Densa. `hidden-cave` permanece descoberta tardia da Mata Densa. Nomes de itens na interface usam uma camada de apresentação; os IDs do domínio não mudam.

`night-together` e `night-alone` usam `returnToExploration`. Saves antigos com `status: 'completed'` continuam abrindo o resumo.

### Catálogo e consumo

```ts
interface WorldNarrativeTriggerDefinition {
  id: string;
  source: { type: 'discovery.revealed'; discoveryId: string };
  campaignId: string;
  eventId: string;
}

function startNarrativeSession(state: GameState, campaign: Campaign, eventId: string): GameState;
```

A abertura da sessão não avança o relógio, não altera sandbox, inventário, atributos, histórico nem `updatedAt`. O consumo de um gatilho ativo fica em `flags['world.trigger.<triggerId>.consumed']`. Com o catálogo da campanha vazio, explorar não dispara narrativa. Falha no gatilho ou na sessão não persiste estado parcial.

Prioridade: ordem declarada do catálogo.

## Fora desta fatia

- mapa visual complexo ou minijogos;
- renovação ou recuperação no carregamento;
- presença e interação genéricas de NPCs ou criaturas fora do encontro atual;
- persistência própria, agenda ou deslocamento de NPCs — ainda não discutidos;
- diálogo livre, comportamento de criatura, combate, caça detalhada e clima — ainda não discutidos; necessidades e sobrevivência leve pertencem ao Sistema 9 separado;
- sistemas jogáveis de facções ou assentamentos — somente o papel narrativo no universo está definido;
- backend e IA em runtime.
