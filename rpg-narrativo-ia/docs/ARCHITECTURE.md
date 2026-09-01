# Arquitetura

## Abordagem

Usar um **monólito modular**: uma única aplicação estática, dividida internamente em módulos. Não usar microserviços.

React apresenta o estado e envia ações. O motor em TypeScript decide regras e retorna um novo estado. Componentes não devem modificar diretamente atributos, inventário ou relações.

```text
Interface → ação → motor → módulos/regras → novo estado → persistência → interface
```

Na evolução sandbox, a aplicação alternará entre modos explícitos:

```ts
type GameMode =
  | 'introduction'
  | 'exploration'
  | 'narrative'
  | 'dialogue'
  | 'interaction'
  | 'summary';
```

O motor narrativo deixa de ser o loop externo da aplicação. Exploração passa a ser o modo padrão após a introdução. Eventos e diálogos são sessões temporárias iniciadas por gatilhos do mundo e normalmente terminam devolvendo o controle à exploração.

```text
Exploração → ação → tempo/navegação → gatilhos → narrativa/diálogo → efeitos → exploração
```

## Estrutura sugerida

```text
src/
├── core/
│   ├── engine/
│   ├── events/
│   ├── effects/
│   └── state/
├── modules/
│   ├── character/
│   ├── progression/
│   ├── inventory/
│   ├── relationships/
│   ├── world/
│   ├── time/
│   ├── day-cycle/
│   ├── navigation/
│   ├── exploration/
│   ├── resources/
│   ├── crafting/
│   ├── sandbox/
│   └── narrative/
├── campaigns/
│   └── first-day/
├── infrastructure/
│   └── persistence/
├── ui/
│   ├── components/
│   ├── screens/
│   └── styles/
└── tests/
```

A estrutura é uma direção, não uma obrigação de criar pastas vazias. `modules/time/`, `modules/day-cycle/`, `modules/navigation/`, `modules/exploration/`, `modules/resources/`, `modules/crafting/` e `modules/sandbox/` estão implementados.

## Responsabilidades

- `core`: estado global, execução de escolhas, condições e efeitos compartilhados.
- `character`: identidade, atributos e condições pessoais.
- `progression`: capacidades, recompensas e títulos.
- `inventory`: itens, recursos e consumo.
- `relationships`: confiança e estado de vínculos.
- `world`: estado persistido do mundo, incluindo dia e período; delega o relógio a `time`.
- `time`: relógio determinístico por períodos, avanço de data e validação do horário.
- `day-cycle`: interpreta o avanço do relógio e produz eventos de ciclo e fase visual.
- `navigation`: mapa hierárquico, posição, descoberta e deslocamento entre pai, filhos diretos e irmãos.
- `exploration`: progresso percentual por local, revelação determinística de conteúdo e conclusão derivada de zona.
- `resources`: pontos de coleta com capacidade limitada, renovação e populações ecológicas.
- `crafting`: receitas, consumo atômico, estruturas locais e cozinha.
- `sandbox`: composição do estado integrado e validação conjunta dos sistemas 3 a 6.
- `narrative`: resolução do evento atual e transições.
- `campaigns`: dados específicos de cada campanha.
- `persistence`: adaptação entre o estado e armazenamento do navegador.
- `ui`: apresentação e captura de ações.

## Comunicação

Os módulos compartilham tipos públicos e recebem dados por parâmetros. Um módulo não importa arquivos internos de outro. Efeitos são descritos como dados e aplicados pelo motor.

Exemplo conceitual:

```ts
type GameEffect =
  | { type: 'attribute.change'; attribute: 'energy' | 'humanity'; amount: number }
  | { type: 'inventory.add'; itemId: string; quantity: number }
  | { type: 'relationship.change'; characterId: string; amount: number }
  | { type: 'flag.set'; flag: string; value: boolean };
```

Novos efeitos podem ser acrescentados sem alterar componentes React ou reescrever campanhas existentes.

## Estado e persistência

O estado salvo deve conter no mínimo:

- `schemaVersion`;
- personagem;
- evento atual;
- atributos;
- inventário;
- relações;
- flags narrativas;
- histórico;
- mundo (`day` e `period`);
- progressão;
- sandbox (navegação, exploração, recursos e crafting);
- data da última atualização.

A leitura do salvamento valida profundamente cada um desses campos. Um objeto com `schemaVersion` atual e estrutura interna incompleta ou malformada retorna `status: 'corrupt'`. Versões diferentes de `1` e `2` retornam `status: 'incompatible'`. Saves v1 válidos são migrados para v2 na leitura. O parser não lança exceção.

Antes de o estado chegar à interface, `bindSavedState` confere o `currentEventId` contra a campanha: o evento precisa existir e cumprir as próprias condições. Falhas viram `corrupt` e a UI não tenta renderizar o evento.

Use uma interface de persistência para permitir trocar `localStorage` por IndexedDB futuramente. O MVP pode começar com `localStorage`. A chave `reset.mvp.save` permanece.

`schemaVersion` é `2`. O formato persistido de `world` continua `{ day, period }`, em que `period` é o identificador do período. Não há segundo relógio no sandbox. `DaylightPhase`, mapa e definições não são persistidos. A leitura não regrava o armazenamento; o estado migrado é gravado no próximo `save`.

## Contrato de horário e data

O módulo `modules/time` é a única fonte de verdade para ordem, rótulos e avanço de períodos. O tempo não corre em tempo real: só avança quando uma operação recebe um custo em períodos.

O estado de domínio é:

```ts
interface TimeState {
  day: number;
  periodId: string;
}
```

O estado persistido em `WorldState` permanece `{ day, period }` para não quebrar saves. `period` guarda o mesmo identificador que `periodId`. O índice do período nunca é armazenado; a posição é resolvida pela configuração ordenada.

A lista padrão, com IDs preservados do MVP, vive em `modules/time/periods.ts` e está separada da lógica:

`alvorecer`, `manha`, `meio-dia`, `tarde`, `entardecer`, `noite`.

Operações públicas:

- `createInitialTime`: dia 1 no primeiro período da configuração;
- `getPeriod`: consulta o período atual;
- `formatTime`: `Dia N · Rótulo` em português, igual ao cabeçalho atual do MVP;
- `advanceTime`: avanço imutável por zero ou mais períodos, devolvendo estado anterior, estado atual, períodos atravessados e dias avançados;
- `inspectTimeConfig`, `inspectTimeState` e `inspectTimeCost`: validação sem exceção.

Dias são inteiros positivos seguros (`Number.isSafeInteger`). Custos são inteiros não negativos seguros. Uma chamada de `advanceTime` aceita no máximo `MAX_ADVANCE_PERIODS` (`10_000`) períodos; acima disso, `inspectTimeCost` rejeita o valor antes de qualquer loop ou alocação proporcional ao custo. O dia resultante também não pode ultrapassar `Number.MAX_SAFE_INTEGER`.

Configuração vazia, IDs repetidos ou vazios, período inexistente e custos fracionários ou não finitos são rejeitados.

O efeito de campanha `world.period` continua definindo o período sem avançar o dia. Condições e efeitos `time.*`, temas visuais e sobrevivência não fazem parte deste contrato.

## Contrato de ciclo diário

O módulo `modules/day-cycle` não é um segundo relógio. Ele interpreta um `TimeAdvanceResult` e produz sinais cronológicos para o mundo. A ordem dos períodos, a validação do horário e o cálculo do avanço permanecem em `time`.

O estado persistido não ganha fase visual. `DaylightPhase` é derivada do período final e fica disponível para a UI futura, sem ser armazenada em `GameState`.

```ts
type DayCycleEvent =
  | { type: 'period.ended'; day: number; periodId: string }
  | { type: 'period.started'; day: number; periodId: string }
  | { type: 'day.ended'; day: number }
  | { type: 'day.started'; day: number };

type DaylightPhase = 'daylight' | 'twilight' | 'night';

interface DayCycleResult {
  time: TimeAdvanceResult;
  events: DayCycleEvent[];
  phase: DaylightPhase;
}
```

A associação período → fase vive em `modules/day-cycle/phases.ts`, separada da lógica:

`alvorecer` → `twilight`; `manha` → `daylight`; `meio-dia` → `daylight`; `tarde` → `daylight`; `entardecer` → `twilight`; `noite` → `night`.

Operações públicas:

- `advanceDayCycle`: chama `advanceTime` e interpreta o resultado;
- `interpretDayCycle`: deriva eventos exclusivamente de um `TimeAdvanceResult`;
- `getDaylightPhase`: consulta a fase visual de um período;
- `inspectDaylightPhaseConfig`: validação sem exceção.

Custo zero produz lista vazia de eventos. Cada fronteira atravessada aparece uma vez, em ordem cronológica. Na virada do último período, a ordem é `period.ended`, `day.ended`, `period.started`, `day.started`. Erros de `advanceTime` são relançados como `DayCycleError`, com a mensagem original e a causa preservada. O limite operacional continua sendo `MAX_ADVANCE_PERIODS` do relógio.

Agenda de NPC, clima, encontros, sobrevivência, bloqueios por horário e tema visual da interface ficam fora deste contrato.

## Contrato de navegação hierárquica

O módulo `modules/navigation` carrega um mapa JSON aninhado, indexa pais e filhos internamente e controla posição, descoberta, desbloqueio e movimento. Não altera `GameState`, `schemaVersion` nem a interface nesta etapa.

O formato de autoria permanece aninhado. A indexação constrói `id → local`, `id → pai` e `id → filhos` sem mutar o JSON original. O mapa inicial descreve o Novo Mundo, com a Clareira do Despertar como ponto de partida e uma caverna oculta sob a Mata Densa.

```ts
interface NavigationState {
  currentLocationId: string;
  discoveredLocationIds: string[];
  unlockedLocationIds: string[];
  visitedLocationIds: string[];
}

interface NavigationDestination {
  location: LocationNode;
  relation: 'parent' | 'child' | 'sibling';
  accessible: boolean;
  blockedReason?: string;
  travelCost: { periods: number };
}
```

Movimento válido ocorre somente para pai direto, filho direto ou irmão. Saltos entre ramos são rejeitados. Descobrir e desbloquear são operações independentes e idempotentes. Locais `hidden` só entram na lista de destinos depois de descobertos.

O módulo reutiliza `GameCondition` e `inspectTimeCost`. Condições de desbloqueio não satisfeitas bloqueiam o destino mesmo se o ID estiver em `unlockedLocationIds`. O movimento devolve o custo em períodos e não chama `advanceTime`.

Operações públicas:

- `inspectNavigationMap` e `indexNavigationMap`;
- `createInitialNavigation` e `inspectNavigationState`;
- consulta de local, pai, filhos, irmãos, caminho e relação;
- `listVisibleDestinations` e `inspectLocationAccess`;
- `discoverLocation`, `unlockLocation`, `moveToLocation` e `getTravelCost`.

Exploração percentual, recursos, crafting, NPCs, viagem rápida e a tela de mapa ficam fora deste contrato.

## Contrato de exploração e descobertas

O módulo `modules/exploration` aumenta o conhecimento do local atual e revela conteúdo dirigido por dados. Não altera `GameState`, `schemaVersion` nem a interface nesta etapa. Explorar não move o jogador, não coleta recursos, não adiciona itens ao inventário e não aplica o custo no relógio.

```ts
interface LocationExplorationState {
  locationId: string;
  progress: number;
  revealedDiscoveryIds: string[];
  explorationCount: number;
}

interface ExplorationState {
  locations: LocationExplorationState[];
}

interface ZoneCompletion {
  zoneId: string;
  completedPoints: number;
  totalPoints: number;
  percentage: number;
}
```

Cada local possui progresso inteiro independente entre `0` e `100`. Locais ainda não explorados podem não ter entrada. Uma descoberta persistida só é válida se o progresso for maior ou igual ao seu `revealAt`. A conclusão da zona é derivada: soma `completionWeight` do local e de todos os descendentes, incluindo conteúdo secreto e condicionado, rejeita total acima de `Number.MAX_SAFE_INTEGER` na indexação e usa `Math.round((completedPoints / totalPoints) * 100)`. Progresso local não substitui essa métrica agregada.

Descobertas são reveladas uma vez, na ordem da definição, quando o progresso atinge `revealAt` e as `GameCondition` forem satisfeitas. O avaliador recebe uma cópia defensiva das condições. `reevaluateDiscoveries` libera descobertas condicionais pendentes sem consumir tempo. `subarea` e `passage` reutilizam `discoverLocation` e, se `unlockTarget` for verdadeiro, `unlockLocation`, sem alterar a posição atual.

A Caverna Oculta é revelada por uma descoberta em `dense-woods` perto de `90%`. O conteúdo inicial cobre Clareira do Despertar, Grande Árvore, Nascente e Pequeno Lago e Mata Densa.

Operações públicas:

- `inspectExplorationDefinitions` e `indexExplorationDefinitions`;
- `createInitialExploration` e `inspectExplorationState`;
- `getLocationExploration` e `canExploreLocation`;
- `exploreCurrentLocation` e `reevaluateDiscoveries`;
- `getRevealedDiscoveries` e `calculateZoneCompletion`;
- `applyDiscoveryNavigationEffects` e `createDiscoveryEvaluator`.

Coleta, crafting, encontros, aplicação do custo no relógio, save principal e UI de exploração ficam fora deste contrato.

## Contrato de recursos e ecologia

O módulo `modules/resources` modela pontos de coleta já revelados pela exploração. Não altera `GameState`, `schemaVersion` nem a interface nesta etapa. Coletar não explora, não move o jogador e não aplica o custo no relógio.

```ts
type RenewalPolicy =
  | { type: 'none' }
  | { type: 'short'; periods: number }
  | { type: 'long'; days: number }
  | { type: 'population'; populationId: string };

interface ResourcesState {
  nodes: ResourceNodeState[];
  populations: PopulationState[];
}

type PopulationStatus =
  | 'abundant'
  | 'stable'
  | 'declining'
  | 'threatened'
  | 'exhausted';
```

Um ponto só pode ser usado no `locationId` atual e depois que `discoveryId` tiver sido revelado. O tipo da descoberta precisa ser `resourceNode` ou `creatureHabitat`. A coleta é atômica: valida localização, descoberta, condições, disponibilidade, quantidade, limites populacionais, yields e overflow do inventário antes de alterar qualquer estado. O inventário recebido é um array independente; o save principal não é tocado.

Renovação curta e longa usam o relógio do jogo. `synchronizeResourceRenewal` restaura a capacidade completa somente quando o horário informado alcança ou ultrapassa `nextRenewalAt`. Políticas `none` e `population` não agendam essa data. Populações recuperam apenas em `day.started`, com `lastRecoveredDay` garantindo idempotência. População localmente extinta não se recupera espontaneamente.

O conteúdo inicial cobre gravetos na Clareira do Despertar, água bruta na Nascente e a toca de coelhos chifrudos na Mata Densa. Os valores de capacidade e recuperação são provisórios.

Operações públicas:

- `inspectResourceDefinitions` e `indexResourceDefinitions`;
- `createInitialResources` e `inspectResourcesState`;
- `getResourceNode`, `getPopulation`, `getEffectiveAvailability` e `getMaxCollectable`;
- `inspectResourceAccess` e `canCollectResource`;
- `getPopulationStatus` e `derivePopulationStatus`;
- `collectResource`, `synchronizeResourceRenewal` e `applyPopulationDayCycle`;
- `getResourceYields`, `getCollectionCost` e `createResourceEvaluator`.

Crafting, cozinha, combate, ferramentas, aplicação do custo no relógio, save principal e UI de coleta ficam fora deste contrato.

## Contrato de crafting, estruturas e cozinha

O módulo `modules/crafting` declara receitas, consome materiais atomicamente e constrói estruturas no local atual. Não altera `GameState`, `schemaVersion` nem a interface nesta etapa. Crafting não explora, não move o jogador, não coleta recursos e não aplica o custo no relógio.

```ts
type RecipeKind = 'item' | 'structure' | 'cooking';

interface CraftingState {
  knownRecipeIds: string[];
  structures: WorldStructureState[];
}

interface WorldStructureState {
  structureId: string;
  locationId: string;
  active: boolean;
  fuel?: number;
}
```

Receitas `known` entram no estado inicial. Receitas por `flag` só entram via `synchronizeKnownRecipes` quando a flag está ativa. A execução valida inventário, conhecimento, condições, estações do `currentLocationId`, materiais e overflow antes de gerar um estado novo. Falha não consome, não produz e não cria estrutura. Estações vêm só de estruturas ativas no local atual. `uniquePerLocation` bloqueia duplicata no mesmo sítio antes do consumo. O módulo devolve `TimeCost` validado e não chama `advanceTime`.

Combustível é campo opcional validado. Nesta etapa a fogueira permanece ativa após a construção: não há consumo, extinção nem reabastecimento. Cozinha exige a tag `cooking`; a fogueira declara `heat` e `cooking`.

O conteúdo inicial cobre `campfire`, `build-campfire` (3 `fallen-branch`) e `cook-horned-rabbit-meat`. Receitas extras existem só em testes.

Operações públicas:

- `inspectCraftingDefinitions` e `indexCraftingDefinitions`;
- `createInitialCrafting` e `inspectCraftingState`;
- `serializeCraftingState` e `restoreCraftingState`;
- `inspectRecipeAccess` e `canCraftRecipe`;
- `craftRecipe` e `synchronizeKnownRecipes`;
- `getRecipe`, `getStructureDefinition` e `createCraftingEvaluator`.

Interface, aplicação do custo no relógio e o loop completo do jogo ficam fora do contrato isolado de crafting. A Fatia 7.1 passou a persistir o `CraftingState` dentro de `GameState.sandbox.crafting`.

## Contrato de estado integrado

O módulo `modules/sandbox` reúne mapa e definições iniciais, cria o `SandboxState` e valida o conjunto. Não altera a interface nesta fatia e não aplica tempo.

```ts
interface SandboxState {
  navigation: NavigationState;
  exploration: ExplorationState;
  resources: ResourcesState;
  crafting: CraftingState;
}
```

Fontes canônicas: `world` para o relógio, `inventory` para itens, `flags` para flags, `sandbox.*` para os quatro sistemas de mundo. Adaptadores `worldToTimeState` e `timeStateToWorld` convertem o relógio persistido sem mutação.

Operações públicas:

- `createSandboxContext` e `createInitialSandboxState`;
- `inspectSandboxState`.

A persistência serializa somente o schema 2 validado. `inspectGameState` delega aos validadores dos Sistemas 3 a 6. Orquestrador de ações, exploração livre e menus visuais pertencem às Fatias 7.2 a 7.4.

## Contratos do motor

- `applyChoice` só age com `status: 'playing'`.
- O evento atual e a escolha precisam existir e cumprir suas condições.
- `inventory.remove` falha de forma controlada se a quantidade for insuficiente; o estado anterior permanece intacto.
- Quantidades de item são inteiros positivos; variações numéricas precisam ser finitas.
- Relações, capacidades e títulos não são duplicados.
- `validateCampaign` devolve diagnósticos semânticos (IDs, referências, transições, interpolação, consumo protegido, conectividade estrutural e alcançabilidade semântica).
- Conectividade estrutural segue as transições; alcançabilidade semântica considera condições e efeitos.
- `walkCampaignTrajectories` percorre a árvore de escolhas válidas e identifica estados pelo evento, flags, inventário, atributos, relações, mundo e progressão.

O retorno de uma escolha continua sendo o novo `GameState`. Um `ChoiceOutcome` com estado anterior e efeitos aplicados não foi introduzido: a interface só precisa do estado seguinte, e o extra seria abstração prematura.

## Evolução do estado narrativo

O MVP exige `currentEventId` porque sempre está dentro de uma cena. No sandbox, o estado precisará distinguir uma sessão narrativa ativa da posição normal no mundo. O formato final deve permitir ausência de evento ativo durante exploração, sem usar IDs fictícios.

Uma direção conceitual é:

```ts
interface NarrativeSession {
  eventId: string;
  returnMode: 'exploration' | 'interaction';
}
```

A mudança provavelmente exigirá nova versão do schema e migração ou rejeição controlada de saves. A Fatia 7.1 introduziu o schema 2 com sandbox persistido, mas manteve `currentEventId` obrigatório para não quebrar a interface atual. A sessão narrativa opcional fica para as Fatias 7.2/7.3.

## Testes prioritários

- condições habilitam e bloqueiam eventos corretamente;
- efeitos produzem um novo estado sem mutar o anterior;
- recursos não ficam negativos quando isso for proibido;
- remoção insuficiente de item falha sem alterar o estado;
- escolhas levam ao próximo evento correto;
- partida concluída rejeita novas escolhas;
- salvar e carregar preserva o estado;
- cada estrutura interna malformada retorna `corrupt`;
- partidas com versão incompatível falham de forma controlada;
- a campanha atual passa na validação ampliada e todas as trajetórias válidas terminam;
- eventos só são semanticamente alcançáveis quando condições e efeitos permitem;
- o evento salvo é conferido contra a campanha antes de chegar à UI;
- o relógio inicia no dia 1 ao alvorecer e avança de forma imutável por períodos;
- virada de dia, custo zero, configuração inválida e estado persistido inválido são rejeitados ou calculados de forma determinística;
- dia e custo fora de `Number.isSafeInteger`, custo acima de `MAX_ADVANCE_PERIODS` e overflow de dia são rejeitados antes do loop;
- o ciclo diário deriva eventos do avanço do relógio, respeita a virada de dia e rejeita configuração de fase inválida;
- o mapa hierárquico é indexado sem mutação, o movimento só ocorre entre pai, filhos e irmãos, e o estado de navegação persiste isoladamente;
- explorar aumenta o progresso local sem mutação, revela descobertas no limiar, reavalia condições pendentes e deriva a conclusão da zona sem armazená-la;
- pontos de recurso têm capacidade limitada, coleta atômica e renovação pelo relógio do jogo;
- populações compartilham estoque, emitem estado qualitativo e podem ser extintas localmente sem recuperação espontânea;
- crafting consome materiais atomicamente, constrói estruturas no local atual e apenas devolve o custo temporal;
- o save principal no schema 2 persiste o sandbox integrado e migra partidas v1 válidas sem executar gameplay.
