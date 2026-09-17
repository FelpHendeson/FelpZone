# Arquitetura

Esta especificação descreve contratos existentes e possibilidades de integração. Ela não aprova sistemas futuros. A classificação de decisões de produto está em [Estado, metas e horizonte](PROJECT-STATUS.md).

## Abordagem

Usar um **monólito modular**: uma única aplicação estática, dividida internamente em módulos. Não usar microserviços.

React apresenta o estado e envia ações. O motor em TypeScript decide regras e retorna um novo estado. Componentes não devem modificar diretamente atributos, inventário ou relações.

```text
Interface → ação → motor → módulos/regras → novo estado → persistência → interface
```

O projeto segue a arquitetura descrita em [Visão do motor de mundo](WORLD-ENGINE-VISION.md):

```text
leis reutilizáveis do motor
            ↓
pack validado configura o mundo
            ↓
campanha referencia o pack e conta histórias
            ↓
save registra somente a partida do jogador
            ↓
interface apresenta ações e resultados
```

Uma regra reutilizável pertence a um módulo. Uma criatura, profissão, moeda, organização ou cena pertence ao pack. Um acontecimento específico pertence à campanha. O save guarda IDs e estado mutável, nunca uma cópia do catálogo.

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
│   ├── world-events/
│   ├── presences/
│   ├── objectives/
│   ├── system-interface/   # Sistema 11: deriva a visão segura de Status
│   ├── energetics/         # Sistema 11: vocabulário de Eteris/Númen e campos
│   ├── skills/             # Sistema 11: catálogos, progressão e Árvore de habilidades
│   ├── training/           # Sistema 11: métodos, planejamento e efeitos de treino
│   ├── combat/             # Sistema 12: ações, combatentes, encontros e turno determinístico
│   ├── mastery/            # Sistema 13: prática verificada, marcos de nível e revelações
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

A estrutura é uma direção, não uma obrigação de criar pastas vazias. Os módulos dos Sistemas 1 a 17 estão implementados. Os Sistemas 18 a 29 possuem especificações, mas suas pastas só devem nascer na respectiva implementação autorizada.

## Responsabilidades

- `core`: estado global, execução de escolhas, condições e efeitos compartilhados.
- `character`: identidade, atributos e condições pessoais.
- `progression`: capacidades, recompensas e títulos.
- `inventory`: itens, recursos e consumo.
- `relationships`: confiança e estado de vínculos.
- `world`: estado persistido do mundo, incluindo dia e período; delega o relógio a `time`.
- `needs`: regras puras de necessidades, desgaste, consumo e repouso; na Fatia 9.2 somente `sede` integra o estado principal.
- `time`: relógio determinístico por períodos, avanço de data e validação do horário.
- `day-cycle`: interpreta o avanço do relógio e produz eventos de ciclo e fase visual.
- `navigation`: mapa hierárquico, posição, descoberta e deslocamento entre pai, filhos diretos e irmãos.
- `exploration`: progresso percentual por local, revelação determinística de conteúdo e conclusão derivada de zona.
- `resources`: pontos de coleta com capacidade limitada, renovação e populações ecológicas.
- `crafting`: receitas, consumo atômico, estruturas locais e cozinha.
- `sandbox`: composição do estado integrado e validação conjunta dos sistemas 3 a 6.
- `world-events`: catálogo de gatilhos declarativos que associam descobertas reveladas a sessões narrativas.
- `presences`: catálogo de entidades e ocorrências por local, estado mínimo de descoberta/resolução e status derivado.
- `objectives`: catálogo de jornadas, etapas, critérios e progresso monotônico; integra o estado principal e a persistência, e é sincronizado no fim de cada ação sandbox.
- `system-interface`: deriva a visão segura de Status (nível, Eteris/Númen, habilidades, Árvore e treinos conhecidos) a partir dos catálogos e do estado; não calcula progressão nem contém componentes React.
- `energetics`: representa o vocabulário de Eteris, Númen e campos de aplicação (Corpo, Poder) como catálogo validado; ainda sem reserva, controle, potência ou fórmulas.
- `skills`: valida caminhos e habilidades com requisitos, mantém o estado de progressão (nível e proficiências) e deriva a Árvore de habilidades sem vazar nós ocultos; não contém componentes React.
- `training`: valida métodos, planeja um treino (alvo, custo em períodos e efeitos declarativos) e aplica seus efeitos à progressão; devolve `TimeCost` sem avançar o relógio.
- `combat`: cataloga ações, combatentes e encontros; cria o estado de combate; resolve turnos por velocidade com efeitos declarativos (dano, cura, escudo); decide a ação do oponente por regras determinísticas; deriva o desfecho e seus efeitos para o `GameState`. Funções puras, sem componentes React.
- `mastery`: cataloga regras de prática e marcos de nível; transforma evidências verificadas (treino concluído, vitória de combate) em incrementos de proficiência; avalia marcos de forma pura e idempotente e produz um `MasteryResult`. Não acessa React, relógio, persistência nem internos de combate/treino.
- `narrative`: resolução do evento atual e transições.
- `content`: fontes de pack (`JsonPackSource`, `MemorySource`, `RemoteSource`) e `composeWorld`.
- `campaigns`: adapters da campanha `first-day` sobre o pack JSON.
- `content`: `ContentSource`, `composeWorld` e o pack empacotado; não executa código do arquivo.
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

## Arquitetura do Sistema 11 — implementado

O [Sistema 11](SYSTEM-ETERIS-NUMEN-PROGRESSION.md) está implementado nas Fatias 11.1 a 11.7: catálogos de energéticos, habilidades e treino; o estado `system` no `GameState` sob o schema 7; a ação `training.train` pelo orquestrador; a Árvore de habilidades derivada; e a aba diegética `Sistema`. Ele introduz uma regra de apresentação importante: a interface do Sistema é diegética. Status, habilidades, caminhos, treinos, jornadas, receitas e registros podem ser informações que o próprio personagem consulta dentro do mundo.

Essa decisão não transforma componentes React em regras de domínio. O fluxo continua:

```text
personagem consulta o Sistema
          ↓
UI deriva somente conhecimento permitido
          ↓
jogador envia uma intenção
          ↓
motor valida catálogo, estado e condições
          ↓
orquestrador aplica efeitos e tempo uma vez
          ↓
novo estado validado retorna à interface
```

### Separação entre definição e estado

Habilidades, caminhos, métodos, personagens e campanhas devem ser conteúdo validado, preferencialmente em JSON ou estruturas de dados equivalentes. O save não deve copiar nomes, descrições, topologia ou fórmulas.

```text
catálogos versionados                    estado mínimo persistido
├── definições de habilidades            ├── IDs conhecidos
├── relações entre caminhos              ├── progresso aprovado
├── métodos de treinamento               ├── proficiências aprovadas
├── personagens e entidades              └── fatos necessários
└── campanhas e eventos
```

Arquivos de autoria não podem executar código arbitrário. Condições, custos e efeitos usam uniões declarativas fechadas e validação profunda. Toda referência entre catálogos deve ser resolvida antes de uma ação chegar ao motor.

### Eteris e Númen

- Eteris é energia ambiental;
- Númen é Eteris interiorizado e individualizado por um ser vivo;
- Númen alimenta aplicações conceituais de Corpo e Poder;
- reserva, controle, potência, absorção, regeneração e conversão ainda não possuem campos ou fórmulas aprovados.

A Fatia 11.2 adicionou `system: { level, entries: [{ skillId, proficiency }] }` ao `GameState` sob o `schemaVersion: 7`. Valores derivados (Árvore, Status e treinos disponíveis) continuam fora do save e são recompostos a partir dos catálogos.

### Treinamento e tempo

O módulo proposto de treinamento planeja a ação e devolve condições, efeitos e um `TimeCost` validado. Ele não chama `advanceTime`. A integração futura deve reutilizar o orquestrador consolidado, com validação anterior à transação, custo único, desgaste das necessidades pelo mesmo avanço e sincronizações posteriores.

Falha de requisito, referência ou efeito não pode conceder progresso parcial nem consumir tempo. Abrir Status, Árvore ou outro menu do Sistema não cobra períodos.

### Árvore e Jardim

A Árvore será uma visão derivada de habilidades, caminhos, requisitos conhecidos e proficiências. Conteúdo oculto não pode vazar por contagens, IDs, rótulos ou motivos de bloqueio.

O Jardim integrará caminhos por receitas curadas, não destrutivas e determinísticas, conforme [Sistema 16](SYSTEM-SKILL-GARDEN.md). O núcleo usa IDs e referências; combinações arbitrárias, geração procedural e grafos redundantes permanecem proibidos.

### Ponte para banco de ações e combate

Combate não pertence ao Sistema 11. Um sistema futuro consumirá contratos públicos de habilidade para formar ações declarativas com condições de ativação, custos, tempo de execução, efeitos e encadeamentos.

Velocidade de conjuração ou execução deverá ter consequência observável, mas sua fórmula e a conversão entre relógio sandbox e turno ainda não estão definidas. O contrato futuro de combatente precisa representar jogador, pessoas e criaturas sem assumir que todo oponente é monstro. Comportamento, seleção de ações, dano e consequências de derrota permanecem fora desta arquitetura aprovada.

### Compatibilidade com módulos atuais

- `progression` hoje persiste apenas `abilityIds` e `titleIds`; isso é um protótipo anterior, não o modelo completo do Sistema 11;
- `character` e `needs` continuam donos dos atributos atuais de sobrevivência;
- `crafting` continua dono da execução de receitas; o Sistema apenas registra e apresenta conhecimento;
- `objectives` continua dono do progresso de jornadas; a interface diegética não duplica seu estado;
- `presences` continua dono da descoberta e disponibilidade de entidades no mundo;
- `campaigns` podem conceder conhecimento por efeitos declarativos, sem conter as fórmulas de progressão;
- `ui` apresenta view-models derivados e não acessa arquivos internos dos novos módulos.

Uma nova versão de schema só será criada quando um campo persistente aprovado realmente entrar no estado. Migração não pode simular treino, conceder nível ou proficiência por suposição, avançar tempo, executar crafting ou regravar o armazenamento durante a leitura.

## Estado e persistência

O estado salvo deve conter no mínimo:

- `schemaVersion`;
- personagem;
- sessão narrativa (`narrativeSession`, obrigatória no JSON e nula durante exploração);
- atributos;
- inventário;
- relações;
- flags narrativas;
- histórico;
- mundo (`day` e `period`);
- progressão;
- sandbox (navegação, exploração, recursos, crafting e presenças);
- progresso mínimo de objetivos (`objectives`);
- data da última atualização.

A leitura do salvamento valida profundamente cada um desses campos. Um objeto com `schemaVersion` atual e estrutura interna incompleta ou malformada retorna `status: 'corrupt'`. Versões diferentes de `1` a `6` retornam `status: 'incompatible'`. Saves v1 a v5 válidos são migrados para v6 na leitura. O parser não lança exceção.

Antes de o estado chegar à interface, `bindSavedState` confere a sessão narrativa, quando ela existe, contra a campanha: o evento precisa existir e cumprir as próprias condições. Partidas em exploração (`narrativeSession === null`) e partidas concluídas com sessão nula são aceitas. Falhas viram `corrupt` e a UI não tenta renderizar um evento inexistente.

Use uma interface de persistência para permitir trocar `localStorage` por IndexedDB futuramente. O MVP pode começar com `localStorage`. A chave `reset.mvp.save` permanece.

`schemaVersion` é `6`. O schema atual inclui `sede` nos atributos e `ObjectivesState`, preservando `world` como `{ day, period }`. Não há segundo relógio no sandbox. `DaylightPhase`, mapa, local inicial, catálogos, textos, critérios e índices não são persistidos. Contextos recebidos são reconstruídos e normalizados antes da validação. A leitura não regrava o armazenamento; o estado migrado é gravado no próximo `save`. Persistências podem receber `SandboxContext` e catálogo de objetivos; a aplicação continua usando os padrões. O schema atual não persiste `currentEventId`.

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

O módulo `modules/sandbox` reúne mapa e definições iniciais, cria o `SandboxState` e valida o conjunto. O orquestrador em `modules/sandbox-actions` aplica ações e tempo sobre o `GameState` integrado, sem alterar a interface.

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
```

Fontes canônicas: `world` para o relógio, `inventory` para itens, `flags` para flags, `sandbox.*` para os quatro sistemas de mundo. Adaptadores `worldToTimeState` e `timeStateToWorld` convertem o relógio persistido sem mutação. O local inicial vive no contexto, não no save. Todo `SandboxContext` consumido pela aplicação é reconstruído e normalizado antes do uso; os Maps originais não sobrevivem à inspeção.

Operações públicas do sandbox:

- `createSandboxContext` e `createInitialSandboxState`;
- `inspectSandboxContext` e `inspectSandboxState`.

Operação pública do orquestrador:

- `executeSandboxAction`.

Operações públicas dos gatilhos de mundo:

- `inspectWorldTriggerCatalog` e `indexWorldTriggerCatalog`;
- `resolveEligibleWorldTrigger` e `consumeWorldTriggersMatchingNarrative`;
- `applyWorldNarrativeTrigger`.

A persistência serializa somente o schema 7 validado e pode receber o mesmo `SandboxContext` e catálogo de objetivos em `serializeGameState`, `parseGameState`, `createPersistence` e `createMemoryPersistence`. Sem argumentos, a aplicação usa as definições padrão e o catálogo inicial com `Primeiros passos`. A validação não grava índices nem definições. `inspectGameState` delega aos validadores dos Sistemas 3 a 6, 8, 10 e 11, valida a sede persistida e o estado de progressão do Sistema, e migra saves v1–v6.

O módulo `modules/sandbox-actions` executa uma ação sandbox sobre o `GameState`: movimento, exploração, coleta, crafting, interação de presença, consumo ou repouso. A transação aplica primeiro os efeitos declarativos da ação, depois o `TimeCost` uma vez por `advanceDayCycle` e então o desgaste das necessidades para a mesma quantidade de períodos. Em seguida recupera populações pelos eventos `day.started`, sincroniza renovação com o horário final e reavalia descobertas, receitas e presenças sem custo extra. Preserva `narrativeSession`, salvo quando `presence.interact` abre uma sessão declarada pelo plano. Não persiste.

Na Fatia 10.3, o mesmo orquestrador sincroniza objetivos depois de compor o estado final da ação e devolve o resumo das mudanças de jornada. Essa etapa não cobra tempo nem modifica outros domínios. `ui/journal/model.ts` deriva um diário não persistido com jornadas e fatos conhecidos; o modelo omite objetivos ocultos não ativados e etapas sequenciais ainda futuras.

Na Fatia 10.4, `ui/components/JournalPanel.tsx` apresenta esse modelo na quinta aba da exploração. O ID acompanhado vive somente no estado local de `ExplorationScreen`: não altera o domínio nem o save. O painel Mundo recebe apenas a jornada ativa derivada e sua próxima etapa; feedback de progresso é textual e não modal.

Na Fatia 10.5, o critério `progression.ability.selected` representa qualquer capacidade já escolhida sem curinga. `applyChoice` sincroniza objetivos depois da transição narrativa, assim como o orquestrador faz após ações do sandbox. A leitura de um save schema 6 também sincroniza o catálogo atual, o que permite introduzir conteúdo dirigido por dados sem elevar o schema nem invalidar um save criado com catálogo vazio.

Na Fatia 9.3, `needs.consume` remove uma unidade do inventário e custa zero; `needs.rest` custa dois períodos. O repouso aprimorado exige uma fogueira ativa no local atual. `SandboxActionResult.needsWear` expõe o resumo do desgaste aplicado sem persistir dados derivados.

Na Fatia 9.4, `ui/needs/presentation.ts` traduz valores e faixas para o HUD, resumos, efeitos e feedback. `ui/sandbox/model.ts` oferece à tela apenas consumíveis aprovados e o repouso válido para o local, enquanto a regra continua nos módulos de domínio. A superfície bloqueia novos despachos durante a janela de uma ação para evitar duplo toque.

A Fatia 7.5 compõe a ação com o catálogo de gatilhos: a superfície executa `executeSandboxAction`, consome gatilhos cujo evento já foi aberto pela ação, resolve no máximo um gatilho elegível sobre o estado seguinte (ordem declarada do catálogo), marca `world.trigger.<id>.consumed` em `flags`, abre a sessão com `startNarrativeSession`, resolve presenças resolvíveis da descoberta correspondente e persiste uma única vez o estado composto. O módulo de gatilhos é puro: sem React, sem `localStorage` e sem avanço de tempo. A Fatia 8.6 deixou o catálogo da campanha `first-day` vazio; a definição antiga permanece apenas para testes do mecanismo.

## Contrato de presenças

O módulo `modules/presences` descreve NPCs, animais e criaturas como entidades e as associa a locais por descobertas existentes. O planejamento puro não abre narrativa e não avança o relógio. A sincronização lê `ExplorationState` sem mutá-lo. A Fatia 8.4 persiste `PresenceState` em `sandbox.presences` e executa o plano por `presence.interact`. A Fatia 8.5 deriva a apresentação em `buildExplorationView` e dispara somente essa ação na interface. A Fatia 8.6 valida Mira (observar/conversar) e o coelho chifrudo (observar/evitar) e reconcilia saves que já consumiram o gatilho da Clareira.

```ts
type WorldEntityKind = 'npc' | 'animal' | 'creature';

interface PresenceState {
  discoveredPresenceIds: string[];
  resolvedPresenceIds: string[];
}

type PresenceStatus = 'hidden' | 'available' | 'unavailable' | 'resolved';
```

O catálogo inicial valida Mira na Clareira (`first-priority-event`) e o coelho chifrudo na Mata Densa (`horned-rabbit-tracks`). Consultas comuns omitem presenças ocultas. `available` e `unavailable` são derivados; só descoberta e resolução entram no estado.

Operações públicas:

- `inspectPresenceCatalog` e `indexPresenceCatalog`;
- `createInitialPresenceState` e `inspectPresenceState`;
- `discoverPresence` e `resolvePresence`;
- `getPresence`, `getEntity` e `listDiscoveredPresencesAtLocation`;
- `synchronizeDiscoveredPresences` e `listKnownPresencesAtLocation`;
- `inspectPresenceInteractionCatalog` e `indexPresenceInteractionCatalog`;
- `listKnownPresenceInteractions` e `planPresenceInteraction`;
- `getPresenceStatus` e `createPresenceEvaluator`.

Agenda e movimento ficam fora deste contrato. A Fatia 8.5 apresenta o estado derivado na superfície mobile sem copiar regras para o React. A Fatia 8.6 usa essa superfície para Mira e o coelho.

## Contratos do motor

- `applyChoice` só age com `status: 'playing'` e sessão narrativa ativa da mesma campanha.
- `world.period` alinha a narrativa a um período posterior do mesmo dia, mas nunca faz o relógio retroceder; passagem de dia pertence ao ciclo temporal das ações.
- `startNarrativeSession` só age com `status: 'playing'`, `narrativeSession === null` e um evento com `canStartSession: true` cujas condições estão satisfeitas. Não avança o relógio, não altera sandbox, inventário, atributos, histórico nem `updatedAt`.
- Exploração livre (`narrativeSession === null`) não aceita `applyChoice`; `getAvailableChoices` devolve `[]` e `getCurrentEvent` lança.
- O evento da sessão e a escolha precisam existir e cumprir suas condições.
- `inventory.remove` falha de forma controlada se a quantidade for insuficiente; o estado anterior permanece intacto.
- Quantidades de item são inteiros positivos; variações numéricas precisam ser finitas.
- Relações, capacidades e títulos não são duplicados.
- `validateCampaign` devolve diagnósticos semânticos (IDs, referências, transições, interpolação, consumo protegido, conectividade estrutural e alcançabilidade semântica).
- Conectividade estrutural parte de `campaign.firstEventId` e dos eventos com `canStartSession: true`.
- Alcançabilidade semântica completa percorre só o fluxo inicial. Entradas acionáveis pelo mundo recebem validação estrutural no walker da introdução; o catálogo de gatilhos valida a associação descoberta → evento.
- O fluxo inicial é válido se alguma trajetória retorna à exploração ou conclui a partida.
- `walkCampaignTrajectories` percorre a árvore de escolhas válidas, identifica estados pela sessão narrativa, flags, inventário, atributos, relações, mundo e progressão, e conta retornos à exploração sem classificá-los como dead end.

O retorno de uma escolha continua sendo o novo `GameState`. Um `ChoiceOutcome` com estado anterior e efeitos aplicados não foi introduzido: a interface só precisa do estado seguinte, e o extra seria abstração prematura.

## Evolução do estado narrativo

A narrativa deixou de ser o loop permanente. O schema atual persiste uma sessão opcional:

```ts
interface NarrativeSession {
  campaignId: string;
  eventId: string;
}

interface GameState {
  schemaVersion: 6;
  status: GameStatus;
  narrativeSession: NarrativeSession | null;
  // demais campos
}
```

Na Fatia 9.2, `Attributes` passa a conter `sede`. Saves v1 a v4 mantêm contratos legados próprios, sem esse campo, e recebem `sede: 25` na migração. Essa migração não aplica desgaste nem executa ações.

A presença da sessão é a fonte canônica:

- `status: 'playing'` e `narrativeSession !== null`: narrativa ativa;
- `status: 'playing'` e `narrativeSession === null`: exploração livre;
- `status: 'completed'`: encerramento definitivo, com sessão nula.

Não há `currentEventId`, `mode` nem `isExploring` no schema atual. Depois da capacidade inicial, a transição `returnToExploration` encerra a sessão sem concluir a partida. `first-priority` é uma entrada com `canStartSession: true`, aberta pela interação `talk` da presença de Mira. `night-together` e `night-alone` também devolvem à exploração. Saves `completed` legados continuam válidos.

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
