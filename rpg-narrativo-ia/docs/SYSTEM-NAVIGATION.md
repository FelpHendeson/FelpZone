# Sistema 3 — Navegação hierárquica

## Dependências

Horário/data e ciclo diário já estão implementados, testados e consolidados.

## Objetivo

Permitir que o jogador ocupe, descubra e percorra locais definidos em um mapa JSON aninhado. A navegação padrão ocorre somente entre pai, filhos diretos e irmãos. O módulo é determinístico, independente e ainda não altera o save principal nem a interface.

## Modelo de autoria

O arquivo de conteúdo mantém a hierarquia visível. O mapa inicial vive em `src/modules/navigation/initial-map.ts` e descreve o Novo Mundo:

- `new-world` — Novo Mundo
  - `horned-rabbit-forest` — Floresta dos Coelhos Chifrudos
    - `awakening-clearing` — Clareira do Despertar (localização inicial)
    - `great-tree` — Grande Árvore
    - `spring-lake` — Nascente e Pequeno Lago
    - `dense-woods` — Mata Densa
      - `hidden-cave` — Caverna Oculta (`visibility: "hidden"`)

Na carga, o mapa é indexado internamente em `id → local`, `id → pai` e `id → filhos`. O JSON original não é mutado. O formato de autoria continua aninhado.

## Regras de movimento

Do local atual, o destino padrão é válido quando for:

- pai direto;
- filho direto;
- irmão com o mesmo pai.

Não é permitido saltar para outro ramo da árvore. Atalhos, portais, estradas especiais e viagem rápida ficam para outra etapa.

Mover devolve o custo da viagem sem aplicá-lo. Consultar o mapa, caminhos ou destinos não consome tempo.

## Estado

```ts
interface NavigationState {
  currentLocationId: string;
  discoveredLocationIds: string[];
  unlockedLocationIds: string[];
  visitedLocationIds: string[];
}
```

- `discovered`: o jogador sabe que existe;
- `unlocked`: a entrada foi liberada no estado;
- `visited`: o jogador já esteve no local;
- `current`: posição atual.

Invariantes:

- o local atual precisa existir, estar descoberto, desbloqueado e visitado;
- listas não contêm duplicatas;
- todos os IDs armazenados existem no mapa;
- um local visitado precisa estar descoberto e desbloqueado;
- um local pode estar descoberto e bloqueado;
- um local pode estar desbloqueado antes de ser descoberto;
- desbloquear não revela automaticamente;
- descobrir não desbloqueia automaticamente;
- descoberta e desbloqueio são idempotentes.

`NavigationState` é serializável por `JSON.stringify`/`JSON.parse` e validado isoladamente. Ainda não entra em `GameState`.

## Definição de local

```ts
interface LocationNode {
  id: string;
  name: string;
  description?: string;
  image?: ImageReference;
  travelCost?: { periods: number };
  unlockConditions?: GameCondition[];
  lockedReason?: string;
  visibility?: 'known' | 'hidden';
  children?: LocationNode[];
}
```

Subáreas bônus, como a caverna, continuam definidas como filhos no JSON, mas podem começar com `visibility: 'hidden'`. Elas não aparecem na lista de destinos até o ID ser descoberto. Depois disso, seguem as mesmas regras de pai, filhos e irmãos.

Navegação controla onde é possível ir. Percentual de exploração, descobertas internas e pontos de coleta pertencem aos sistemas posteriores.

## Destinos visíveis

```ts
interface NavigationDestination {
  location: LocationNode;
  relation: 'parent' | 'child' | 'sibling';
  accessible: boolean;
  blockedReason?: string;
  travelCost: { periods: number };
}
```

Ao listar destinos a partir da localização atual:

- considere somente pai, filhos diretos e irmãos;
- não inclua a própria localização;
- não inclua locais desconhecidos;
- locais descobertos e desbloqueados aparecem como acessíveis quando as condições também passam;
- locais descobertos e bloqueados aparecem com motivo;
- locais `hidden` não aparecem enquanto não estiverem descobertos.

## Condições e bloqueios

O módulo reutiliza `GameCondition` e `evaluateConditions`. A composição recebe `GameState` ou uma função avaliadora injetada via `createUnlockEvaluator`.

Um destino só é acessível quando:

1. está descoberto;
2. seu ID está em `unlockedLocationIds`;
3. `unlockConditions`, se existirem, são satisfeitas.

Se as condições não forem satisfeitas, o destino permanece bloqueado mesmo que o ID esteja em `unlockedLocationIds`. O motivo usa `lockedReason` do conteúdo ou a mensagem estável `Este local está bloqueado.`

## Custos de viagem

O custo pertence ao destino e reutiliza `inspectTimeCost` do módulo de horário. Ausência equivale a `{ periods: 0 }`. Custo inválido ou acima de `MAX_ADVANCE_PERIODS` invalida o mapa. `moveToLocation` devolve o custo e não chama `advanceTime` nem `advanceDayCycle`.

## Operações públicas

- `inspectNavigationMap`: valida e indexa o JSON aninhado sem exceção;
- `indexNavigationMap`: indexa ou lança `NavigationError`;
- `createInitialNavigation`: posiciona o jogador na Clareira do Despertar, descoberta, desbloqueada e visitada;
- `inspectNavigationState`: valida estado persistido isoladamente;
- `getLocation`, `getCurrentLocation`, `getParentLocation`, `getChildLocations`, `getSiblingLocations`, `getLocationPath`;
- `getLocationRelation`: classifica origem e destino como `parent`, `child`, `sibling` ou ausência de adjacência;
- `listVisibleDestinations`: lista destinos visíveis a partir do local atual;
- `inspectLocationAccess`: consulta acessibilidade, motivo e custo;
- `discoverLocation` e `unlockLocation`: operações imutáveis e idempotentes;
- `moveToLocation`: movimento imutável com custo exposto;
- `getTravelCost`: consulta o custo do destino;
- `createUnlockEvaluator`: adapta `GameState` à avaliação de `GameCondition`.

## Validação do mapa

Rejeite de forma controlada:

- raiz ausente ou inválida;
- mais de uma raiz no contrato recebido;
- ID ou nome vazio;
- IDs duplicados;
- mesmo objeto de nó inserido em mais de um ponto;
- ciclos em estruturas recebidas em memória;
- filhos duplicados;
- visibilidade desconhecida;
- custo inválido;
- condições malformadas;
- localização inicial inexistente;
- imagem malformada.

Trate o JSON e estados restaurados como entradas não confiáveis.

## Integração inicial

- o fluxo narrativo atual permanece intacto;
- não há tela de mapa ou exploração em produção;
- o custo ainda não é aplicado ao relógio;
- a API já fornece localização atual, breadcrumb, pai, filhos, irmãos, destinos bloqueados e custo para a UI futura.

## Fora da etapa

- NPCs e criaturas posicionados no mapa;
- gatilhos narrativos completos;
- percentual de exploração e ação de explorar;
- recursos, coleta, crafting ou cozinha;
- atalhos e viagem rápida;
- fog of war gráfico;
- minimapa ilustrado;
- geração procedural;
- movimentação em tempo real;
- alteração de `schemaVersion` ou do save principal.

## Critérios de aceite

- mapa autorado em JSON hierárquico;
- regras pai, filho e irmão aplicadas pelo motor;
- navegação não depende da UI;
- bloqueios possuem motivo consultável;
- estado é persistível e validado isoladamente;
- testes, lint, tipos e build passam;
- fluxo narrativo atual permanece funcional até a etapa de integração.
