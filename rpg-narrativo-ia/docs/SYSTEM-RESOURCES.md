# Sistema 5 — Pontos de recurso e ecologia

## Dependências

Horário/data, ciclo diário, navegação hierárquica e exploração e descobertas já estão implementados, testados e consolidados.

## Objetivo

Representar fontes locais de materiais com capacidade limitada, coleta explícita e recuperação baseada no tempo do jogo. O jogador precisa escolher quando e quanto extrair: alguns recursos voltam em poucos períodos, outros levam dias e populações podem ser esgotadas.

O módulo `modules/resources` é determinístico, independente e ainda não altera o save principal nem a interface. Coletar utiliza um ponto já revelado; não explora, não move o jogador, não cozinha, não inicia combate e não aplica o custo no relógio.

## Separação de responsabilidades

- **navegação:** onde o jogador está;
- **exploração:** revela o ponto de recurso;
- **recursos:** disponibilidade, coleta, renovação e populações;
- **inventário:** array independente recebido e devolvido pela coleta;
- **crafting futuro:** transformará os materiais brutos.

Nenhum ponto fornece recursos infinitos.

## Definições

```ts
interface ResourceYield {
  itemId: string;
  quantityPerUnit: number;
}

type RenewalPolicy =
  | { type: 'none' }
  | { type: 'short'; periods: number }
  | { type: 'long'; days: number }
  | { type: 'population'; populationId: string };

interface ResourceNodeDefinition {
  id: string;
  discoveryId: string;
  locationId: string;
  name: string;
  capacity: number;
  maxCollectionPerAction?: number;
  collectionCost: TimeCost;
  renewal: RenewalPolicy;
  yields: ResourceYield[];
  conditions?: GameCondition[];
  blockedReason?: string;
}
```

`discoveryId` liga o ponto à descoberta do Sistema 4. O tipo precisa ser `resourceNode` ou `creatureHabitat`. O ponto só pode ser usado depois que essa descoberta tiver sido revelada no local correspondente.

IDs de pontos são únicos. Capacidade, quantidade por unidade e limite por ação são inteiros seguros positivos. Yields não podem estar vazios nem repetir o mesmo `itemId`. O custo reutiliza `inspectTimeCost`. Definições são entradas não confiáveis e são copiadas defensivamente.

## Estado

```ts
interface ResourceNodeState {
  nodeId: string;
  availableUnits: number;
  lastCollectedAt?: TimeState;
  nextRenewalAt?: TimeState;
  exhausted: boolean;
}

interface PopulationDefinition {
  id: string;
  speciesId: string;
  carryingCapacity: number;
  recoveryPerDay: number;
  warningThreshold: number;
  criticalThreshold: number;
}

interface PopulationState {
  populationId: string;
  current: number;
  pressure: number;
  locallyExtinct: boolean;
  lastRecoveredDay: number;
}

interface ResourcesState {
  nodes: ResourceNodeState[];
  populations: PopulationState[];
}
```

O estado inicial contém todos os pontos e populações definidos. `availableUnits` fica entre zero e a capacidade. `exhausted` é coerente com a disponibilidade efetiva, incluindo extinção da população vinculada. Políticas `none` e `population` não usam `nextRenewalAt`. Estados restaurados precisam conter cada definição exatamente uma vez, sem IDs duplicados, inexistentes ou omitidos.

`ResourcesState` é serializável por `JSON.stringify`/`JSON.parse` e validado isoladamente. Ainda não entra em `GameState`.

## Coleta

`collectResource` valida todas as entradas antes de alterar qualquer coisa:

1. mapa, navegação, exploração, definições, estado, inventário e horário;
2. jogador no `locationId` do ponto;
3. `discoveryId` revelado naquele local;
4. condições;
5. disponibilidade;
6. quantidade solicitada, inteiro seguro positivo;
7. limites populacionais;
8. yields e overflow do inventário;
9. só então produz os novos estados.

A operação é atômica. A quantidade coletada respeita o pedido, a capacidade, `availableUnits`, `maxCollectionPerAction` e a população compartilhada. O resultado devolve `collectionCost` sem chamar `advanceTime`. O instante `collectedAt` representa o fim da coleta e é informado pelo integrador.

Materiais entram em um array de `InventoryItem` independente. Multiplicações e somas rejeitam valores acima de `Number.MAX_SAFE_INTEGER`.

## Renovação

`synchronizeResourceRenewal` atualiza somente pontos cuja data venceu. A comparação usa dia e índice de período do relógio existente. Não usa `Date`, `setTimeout` nem timestamp do sistema.

- `none`: disponibilidade removida não retorna; ao zerar, permanece esgotado;
- `short`: `periods` é inteiro seguro positivo e respeita `MAX_ADVANCE_PERIODS`; ao vencer, restaura a capacidade completa e limpa `nextRenewalAt`;
- `long`: agenda o mesmo período após a quantidade de dias, com proteção de overflow de `day`;
- `population`: não agenda `nextRenewalAt`; a disponibilidade depende do ponto e da população.

Sincronizar de novo no mesmo horário é idempotente. Recarregar a página não acelera a renovação.

Para políticas `short` e `long`, o estado restaurado precisa ser coerente com o prazo calculado:

- se `availableUnits < capacity`, `lastCollectedAt` e `nextRenewalAt` são obrigatórios, e `nextRenewalAt` deve ser exatamente o prazo derivado de `lastCollectedAt` e da política;
- prazo ausente, adulterado, anterior à coleta ou incompatível com a política invalida o estado;
- se `availableUnits === capacity`, `nextRenewalAt` deve estar ausente; `lastCollectedAt` pode permanecer só como histórico.

Cada nova coleta atualiza `lastCollectedAt` e recalcula `nextRenewalAt`. Um `collectedAt` anterior à última coleta é rejeitado de forma atômica; o mesmo horário continua permitido. A comparação usa a configuração de períodos recebida pela operação.

`collectResource`, `inspectResourceAccess` e `canCollectResource` aceitam `timeConfig` opcional e o encaminham à validação do estado. O padrão continua sendo `DEFAULT_PERIODS`.

## Populações

A ordem do estado qualitativo é:

1. `exhausted` — extinta ou atual igual a zero;
2. `threatened` — atual menor ou igual ao limite crítico;
3. `declining` — atual menor ou igual ao limite de alerta;
4. `abundant` — atual igual à capacidade;
5. `stable` — demais casos.

A API permite mostrar esse aviso sem números exatos na interface futura.

Disponibilidade efetiva de um ponto populacional nunca ultrapassa `availableUnits` nem `population.current`. Se o status for `declining` ou `threatened`, a coleta cai para no máximo uma unidade por ação. Ainda é possível zerar uma população ameaçada por insistência. Chegar a zero marca extinção local e bloqueia todos os pontos vinculados ao mesmo `populationId`.

`applyPopulationDayCycle` só recupera em `day.started`. Eventos repetidos não recuperam duas vezes. `lastRecoveredDay` garante idempotência. Salto de dias recupera os dias faltantes. A fórmula inicial, ainda provisória:

- acima do limite crítico: `recoveryPerDay`;
- no limite crítico ou abaixo: metade, arredondada para baixo, com mínimo de 1 quando `recoveryPerDay > 0`;
- população zero torna-se `locallyExtinct` e não recebe recuperação;
- a recuperação nunca ultrapassa `carryingCapacity`;
- a pressão diminui pelo total efetivamente recuperado, sem ficar negativa.

Ao recuperar, os pontos vinculados recebem gradualmente a quantidade recuperada, sem ultrapassar a capacidade de cada ponto. O mesmo `populationId` poderá ser reutilizado por criaturas futuras.

## Conteúdo inicial

Valores de capacidade, recuperação e limiares são provisórios.

População `horned-rabbits`, espécie `horned-rabbit`, capacidade `8`, recuperação `2`, alerta `4`, crítico `2`.

Pontos:

- `fallen-sticks` na Clareira do Despertar, descoberta `fallen-sticks`, renovação curta de 2 períodos, produz `fallen-branch`;
- `spring` na Nascente e Pequeno Lago, descoberta `spring-water`, renovação curta de 1 período, produz `raw-water`;
- `horned-rabbit-warren` na Mata Densa, descoberta `horned-rabbit-tracks`, política `population`, coleta máxima normal `2`, produz carne crua, pele, chifre e ossos.

A coleta da toca é uma captura abstrata, não um combate. Não produz carne cozida, refeição nem bônus de fome. Políticas `none` e `long` são demonstradas em definições de teste, sem alterar o conteúdo do Sistema 4.

## Condições

O módulo reutiliza `GameCondition` e `evaluateConditions`. O avaliador recebe `readonly GameCondition[]` e uma cópia defensiva. O callback não modifica as definições indexadas. O motivo de bloqueio usa `blockedReason` ou a mensagem estável `Este ponto de recurso está bloqueado.`

## Operações públicas

- `inspectResourceDefinitions` e `indexResourceDefinitions`;
- `createInitialResources` e `inspectResourcesState`;
- `getResourceNode` e `getPopulation`;
- `getEffectiveAvailability`, `getMaxCollectable`, `inspectResourceAccess` e `canCollectResource`;
- `getPopulationStatus` e `derivePopulationStatus`;
- `collectResource`;
- `synchronizeResourceRenewal`;
- `applyPopulationDayCycle`;
- `getResourceYields` e `getCollectionCost`;
- `createResourceEvaluator`.

## Integração inicial

- o fluxo narrativo atual permanece intacto;
- não há botão de coleta, painel ecológico, inventário visual novo nem combate;
- o custo ainda não é aplicado ao relógio;
- a demonstração do fluxo fica nos testes.

## Fora da etapa

- crafting, cozinha e fogueira;
- ferramentas e durabilidade;
- combate, criaturas ativas e encontros;
- agenda de NPC e mercado;
- estações do ano e ecossistema predador-presa;
- geração procedural;
- aplicação automática do custo no relógio;
- integração ao save principal;
- mudanças visuais.

## Critérios de aceite

- nenhum ponto fornece recursos infinitos;
- curto, longo, nenhum e populacional possuem comportamentos distintos;
- a toca de coelhos demonstra risco de sobre-exploração e extinção local;
- renovação depende exclusivamente do tempo do jogo;
- coleta permanece separada de exploração e crafting;
- testes, lint, tipos e build passam.
