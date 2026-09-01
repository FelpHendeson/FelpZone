import { describe, expect, it } from 'vitest';
import type { GameCondition } from '../core/events';
import { itemQuantity } from '../modules/inventory';
import {
  INITIAL_EXPLORATION_DEFINITIONS,
  createInitialExploration,
  indexExplorationDefinitions,
  type ExplorationState,
  type IndexedExploration,
} from '../modules/exploration';
import {
  DEFAULT_STARTING_LOCATION_ID,
  INITIAL_WORLD_MAP,
  createInitialNavigation,
  discoverLocation,
  indexNavigationMap,
  moveToLocation,
  unlockLocation,
  type IndexedMap,
  type NavigationState,
} from '../modules/navigation';
import {
  COLLECTION_IN_THE_PAST_REASON,
  DEFAULT_RESOURCE_BLOCKED_REASON,
  EXHAUSTED_RESOURCE_REASON,
  EXTINCT_POPULATION_REASON,
  INITIAL_POPULATIONS,
  INITIAL_RESOURCE_NODES,
  UNREVEALED_RESOURCE_REASON,
  WRONG_LOCATION_REASON,
  applyPopulationDayCycle,
  canCollectResource,
  collectResource,
  createInitialResources,
  createResourceEvaluator,
  derivePopulationStatus,
  getCollectionCost,
  getEffectiveAvailability,
  getMaxCollectable,
  getPopulation,
  getPopulationStatus,
  getResourceNode,
  getResourceYields,
  indexResourceDefinitions,
  inspectResourceAccess,
  inspectResourceDefinitions,
  inspectResourcesState,
  synchronizeResourceRenewal,
  ResourceError,
  type IndexedResources,
  type PopulationDefinition,
  type ResourceConditionEvaluator,
  type ResourceNodeDefinition,
  type ResourcesState,
} from '../modules/resources';
import { DEFAULT_PERIODS, MAX_ADVANCE_PERIODS, advanceTime, createInitialTime } from '../modules/time';
import { freshState } from './helpers';

const START = DEFAULT_STARTING_LOCATION_ID;

function worldMap(): IndexedMap {
  return indexNavigationMap(INITIAL_WORLD_MAP, START);
}

function worldExploration(map: IndexedMap = worldMap()): IndexedExploration {
  return indexExplorationDefinitions(INITIAL_EXPLORATION_DEFINITIONS, map);
}

function worldResources(
  map: IndexedMap = worldMap(),
  exploration: IndexedExploration = worldExploration(map),
): IndexedResources {
  return indexResourceDefinitions(INITIAL_RESOURCE_NODES, INITIAL_POPULATIONS, map, exploration);
}

function reveal(map: IndexedMap, state: NavigationState, locationIds: readonly string[]): NavigationState {
  let next = state;
  for (const locationId of locationIds) {
    next = discoverLocation(map, next, locationId);
    next = unlockLocation(map, next, locationId);
  }
  return next;
}

function moveTo(map: IndexedMap, locationId: string, navigation = createInitialNavigation()): NavigationState {
  if (locationId === START) {
    return navigation;
  }

  const prepared = reveal(map, navigation, ['horned-rabbit-forest', locationId]);
  const inForest = moveToLocation(map, prepared, 'horned-rabbit-forest').current;
  return moveToLocation(map, inForest, locationId).current;
}

function revealed(
  locationId: string,
  discoveryIds: readonly string[],
  progress = 100,
): ExplorationState {
  return {
    locations: [
      {
        locationId,
        progress,
        revealedDiscoveryIds: [...discoveryIds],
        explorationCount: 1,
      },
    ],
  };
}

function node(overrides: Partial<ResourceNodeDefinition> & Pick<ResourceNodeDefinition, 'id'>): ResourceNodeDefinition {
  return {
    discoveryId: 'fallen-sticks',
    locationId: START,
    name: overrides.name ?? 'Ponto de teste',
    capacity: 4,
    collectionCost: { periods: 1 },
    renewal: { type: 'none' },
    yields: [{ itemId: 'test-item', quantityPerUnit: 1 }],
    ...overrides,
  };
}

function population(overrides: Partial<PopulationDefinition> = {}): PopulationDefinition {
  return {
    id: 'test-animals',
    speciesId: 'test-animal',
    carryingCapacity: 6,
    recoveryPerDay: 2,
    warningThreshold: 3,
    criticalThreshold: 1,
    ...overrides,
  };
}

function freezeState(state: ResourcesState): ResourcesState {
  return Object.freeze({
    nodes: Object.freeze(
      state.nodes.map((entry) =>
        Object.freeze({
          ...entry,
          lastCollectedAt: entry.lastCollectedAt ? Object.freeze({ ...entry.lastCollectedAt }) : undefined,
          nextRenewalAt: entry.nextRenewalAt ? Object.freeze({ ...entry.nextRenewalAt }) : undefined,
        }),
      ),
    ) as ResourcesState['nodes'],
    populations: Object.freeze(state.populations.map((entry) => Object.freeze({ ...entry }))) as ResourcesState['populations'],
  });
}

function patchNode(state: ResourcesState, nodeId: string, patch: Partial<ResourcesState['nodes'][number]>): ResourcesState {
  return {
    ...state,
    nodes: state.nodes.map((entry) => (entry.nodeId === nodeId ? { ...entry, ...patch } : entry)),
  };
}

const CUSTOM_PERIODS = [
  ...DEFAULT_PERIODS,
  { id: 'madrugada', label: 'Madrugada' },
];

describe('recursos e ecologia', () => {
  it('indexa as definições iniciais', () => {
    const map = worldMap();
    const exploration = worldExploration(map);
    const inspected = inspectResourceDefinitions(
      INITIAL_RESOURCE_NODES,
      INITIAL_POPULATIONS,
      map,
      exploration,
    );

    expect(inspected.ok).toBe(true);
    if (!inspected.ok) {
      return;
    }

    expect(inspected.value.byNode.get('fallen-sticks')?.renewal).toEqual({ type: 'short', periods: 2 });
    expect(inspected.value.byNode.get('spring')?.yields).toEqual([{ itemId: 'raw-water', quantityPerUnit: 1 }]);
    expect(inspected.value.byNode.get('horned-rabbit-warren')?.renewal).toEqual({
      type: 'population',
      populationId: 'horned-rabbits',
    });
    expect(inspected.value.byPopulation.get('horned-rabbits')?.speciesId).toBe('horned-rabbit');
    expect(inspected.value.nodesByPopulation.get('horned-rabbits')).toEqual(['horned-rabbit-warren']);
  });

  it('cria o estado inicial com todos os pontos e populações', () => {
    const definitions = worldResources();
    const state = createInitialResources(definitions);

    expect(state.nodes.map((entry) => entry.nodeId)).toEqual([
      'fallen-sticks',
      'spring',
      'horned-rabbit-warren',
    ]);
    expect(state.nodes.every((entry) => entry.exhausted === false)).toBe(true);
    expect(getResourceNode(state, 'fallen-sticks').availableUnits).toBe(4);
    expect(getPopulation(state, 'horned-rabbits')).toEqual({
      populationId: 'horned-rabbits',
      current: 8,
      pressure: 0,
      locallyExtinct: false,
      lastRecoveredDay: 1,
    });
    expect(getPopulationStatus(definitions, state, 'horned-rabbits')).toBe('abundant');
  });

  it('mantém o ponto indisponível antes da descoberta', () => {
    const map = worldMap();
    const exploration = worldExploration(map);
    const definitions = worldResources(map, exploration);
    const state = createInitialResources(definitions);
    const access = inspectResourceAccess(
      map,
      createInitialNavigation(),
      exploration,
      createInitialExploration(),
      definitions,
      state,
      'fallen-sticks',
    );

    expect(access.collectable).toBe(false);
    expect(access.blockedReason).toBe(UNREVEALED_RESOURCE_REASON);
    expect(
      canCollectResource(
        map,
        createInitialNavigation(),
        exploration,
        createInitialExploration(),
        definitions,
        state,
        'fallen-sticks',
      ),
    ).toBe(false);
  });

  it('libera o ponto depois que a descoberta é revelada', () => {
    const map = worldMap();
    const exploration = worldExploration(map);
    const definitions = worldResources(map, exploration);
    const state = createInitialResources(definitions);
    const explorationState = revealed(START, ['fallen-sticks'], 25);

    expect(
      canCollectResource(
        map,
        createInitialNavigation(),
        exploration,
        explorationState,
        definitions,
        state,
        'fallen-sticks',
      ),
    ).toBe(true);
    expect(
      inspectResourceAccess(
        map,
        createInitialNavigation(),
        exploration,
        explorationState,
        definitions,
        state,
        'fallen-sticks',
      ).maxCollectable,
    ).toBe(2);
  });

  it('só coleta no local atual', () => {
    const map = worldMap();
    const exploration = worldExploration(map);
    const definitions = worldResources(map, exploration);
    const state = createInitialResources(definitions);
    const atWoods = moveTo(map, 'dense-woods');
    const explorationState = revealed(START, ['fallen-sticks'], 25);

    expect(() =>
      collectResource(
        map,
        atWoods,
        exploration,
        explorationState,
        definitions,
        state,
        [],
        'fallen-sticks',
        1,
        createInitialTime(),
      ),
    ).toThrow(WRONG_LOCATION_REASON);
    expect(state).toEqual(createInitialResources(definitions));
  });

  it('respeita a quantidade solicitada, a capacidade, as unidades e o limite por ação', () => {
    const map = worldMap();
    const exploration = worldExploration(map);
    const definitions = worldResources(map, exploration);
    const explorationState = revealed(START, ['fallen-sticks'], 25);
    const requested = collectResource(
      map,
      createInitialNavigation(),
      exploration,
      explorationState,
      definitions,
      createInitialResources(definitions),
      [],
      'fallen-sticks',
      1,
      createInitialTime(),
    );
    const limited = collectResource(
      map,
      createInitialNavigation(),
      exploration,
      explorationState,
      definitions,
      createInitialResources(definitions),
      [],
      'fallen-sticks',
      8,
      createInitialTime(),
    );

    expect(requested.collectedUnits).toBe(1);
    expect(limited.collectedUnits).toBe(2);
    expect(getResourceNode(limited.current, 'fallen-sticks').availableUnits).toBe(2);
    expect(getMaxCollectable(definitions, limited.current, 'fallen-sticks')).toBe(2);
    expect(getEffectiveAvailability(definitions, limited.current, 'fallen-sticks')).toBe(2);

    const emptied = collectResource(
      map,
      createInitialNavigation(),
      exploration,
      explorationState,
      definitions,
      limited.current,
      limited.inventory.current,
      'fallen-sticks',
      2,
      createInitialTime(),
    );
    expect(emptied.collectedUnits).toBe(2);
    expect(getResourceNode(emptied.current, 'fallen-sticks')).toMatchObject({
      availableUnits: 0,
      exhausted: true,
    });
  });

  it('multiplica yields e adiciona vários materiais atomicamente', () => {
    const map = worldMap();
    const exploration = worldExploration(map);
    const definitions = indexResourceDefinitions(
      [
        node({
          id: 'multi-yield',
          capacity: 3,
          maxCollectionPerAction: 2,
          yields: [
            { itemId: 'alpha', quantityPerUnit: 2 },
            { itemId: 'beta', quantityPerUnit: 3 },
          ],
        }),
      ],
      [],
      map,
      exploration,
    );
    const result = collectResource(
      map,
      createInitialNavigation(),
      exploration,
      revealed(START, ['fallen-sticks'], 25),
      definitions,
      createInitialResources(definitions),
      [{ itemId: 'alpha', quantity: 1 }],
      'multi-yield',
      2,
      createInitialTime(),
    );

    expect(result.yields).toEqual([
      { itemId: 'alpha', quantity: 4 },
      { itemId: 'beta', quantity: 6 },
    ]);
    expect(itemQuantity(result.inventory.current, 'alpha')).toBe(5);
    expect(itemQuantity(result.inventory.current, 'beta')).toBe(6);
    expect(result.inventory.previous).toEqual([{ itemId: 'alpha', quantity: 1 }]);
  });

  it('rejeita overflow do inventário e não altera nada na falha', () => {
    const map = worldMap();
    const exploration = worldExploration(map);
    const definitions = worldResources(map, exploration);
    const state = freezeState(createInitialResources(definitions));
    const inventory = Object.freeze([{ itemId: 'fallen-branch', quantity: Number.MAX_SAFE_INTEGER }]);

    expect(() =>
      collectResource(
        map,
        createInitialNavigation(),
        exploration,
        revealed(START, ['fallen-sticks'], 25),
        definitions,
        state,
        inventory,
        'fallen-sticks',
        1,
        createInitialTime(),
      ),
    ).toThrow(ResourceError);
    expect(state.nodes[0]?.availableUnits).toBe(4);
    expect(inventory[0]?.quantity).toBe(Number.MAX_SAFE_INTEGER);
  });

  it('devolve o custo sem avançar o relógio', () => {
    const map = worldMap();
    const exploration = worldExploration(map);
    const definitions = worldResources(map, exploration);
    const collectedAt = Object.freeze(createInitialTime());
    const result = collectResource(
      map,
      createInitialNavigation(),
      exploration,
      revealed(START, ['fallen-sticks'], 25),
      definitions,
      createInitialResources(definitions),
      [],
      'fallen-sticks',
      1,
      collectedAt,
    );

    expect(result.timeCost).toEqual(getCollectionCost(definitions, 'fallen-sticks'));
    expect(result.collectedAt).toEqual(collectedAt);
    expect(collectedAt).toEqual(createInitialTime());
    expect(result.timeCost).toEqual({ periods: 1 });
  });

  it('nunca renova a política none', () => {
    const map = worldMap();
    const exploration = worldExploration(map);
    const definitions = indexResourceDefinitions(
      [node({ id: 'ore', capacity: 1, maxCollectionPerAction: 1 })],
      [],
      map,
      exploration,
    );
    const collected = collectResource(
      map,
      createInitialNavigation(),
      exploration,
      revealed(START, ['fallen-sticks'], 25),
      definitions,
      createInitialResources(definitions),
      [],
      'ore',
      1,
      createInitialTime(),
    );
    const later = advanceTime(createInitialTime(), { periods: 20 }).current;
    const synced = synchronizeResourceRenewal(definitions, collected.current, later);

    expect(getResourceNode(collected.current, 'ore')).toMatchObject({
      availableUnits: 0,
      exhausted: true,
    });
    expect(getResourceNode(collected.current, 'ore').nextRenewalAt).toBeUndefined();
    expect(getResourceNode(synced, 'ore')).toMatchObject({ availableUnits: 0, exhausted: true });
  });

  it('renova no curto prazo antes, exatamente no limite e depois', () => {
    const map = worldMap();
    const exploration = worldExploration(map);
    const definitions = worldResources(map, exploration);
    const collectedAt = createInitialTime();
    const collected = collectResource(
      map,
      createInitialNavigation(),
      exploration,
      revealed(START, ['fallen-sticks'], 25),
      definitions,
      createInitialResources(definitions),
      [],
      'fallen-sticks',
      2,
      collectedAt,
    );
    const due = collected.node.current.nextRenewalAt;
    expect(due).toEqual(advanceTime(collectedAt, { periods: 2 }).current);

    const before = synchronizeResourceRenewal(
      definitions,
      collected.current,
      advanceTime(collectedAt, { periods: 1 }).current,
    );
    const exact = synchronizeResourceRenewal(definitions, collected.current, due!);
    const after = synchronizeResourceRenewal(
      definitions,
      collected.current,
      advanceTime(collectedAt, { periods: 3 }).current,
    );

    expect(getResourceNode(before, 'fallen-sticks').availableUnits).toBe(2);
    expect(getResourceNode(exact, 'fallen-sticks')).toMatchObject({
      availableUnits: 4,
      exhausted: false,
    });
    expect(getResourceNode(exact, 'fallen-sticks').nextRenewalAt).toBeUndefined();
    expect(getResourceNode(after, 'fallen-sticks').availableUnits).toBe(4);
  });

  it('renova no longo prazo antes, exatamente no limite e depois', () => {
    const map = worldMap();
    const exploration = worldExploration(map);
    const definitions = indexResourceDefinitions(
      [
        node({
          id: 'rare-fungus',
          discoveryId: 'spring-water',
          locationId: 'spring-lake',
          capacity: 2,
          maxCollectionPerAction: 2,
          renewal: { type: 'long', days: 3 },
          yields: [{ itemId: 'rare-fungus', quantityPerUnit: 1 }],
        }),
      ],
      [],
      map,
      exploration,
    );
    const navigation = moveTo(map, 'spring-lake');
    const collectedAt = { day: 1, periodId: 'manha' };
    const collected = collectResource(
      map,
      navigation,
      exploration,
      revealed('spring-lake', ['spring-water'], 30),
      definitions,
      createInitialResources(definitions),
      [],
      'rare-fungus',
      2,
      collectedAt,
    );

    expect(collected.node.current.nextRenewalAt).toEqual({ day: 4, periodId: 'manha' });
    expect(
      getResourceNode(
        synchronizeResourceRenewal(definitions, collected.current, { day: 4, periodId: 'alvorecer' }),
        'rare-fungus',
      ).availableUnits,
    ).toBe(0);
    expect(
      getResourceNode(
        synchronizeResourceRenewal(definitions, collected.current, { day: 4, periodId: 'manha' }),
        'rare-fungus',
      ).availableUnits,
    ).toBe(2);
    expect(
      getResourceNode(
        synchronizeResourceRenewal(definitions, collected.current, { day: 4, periodId: 'tarde' }),
        'rare-fungus',
      ).availableUnits,
    ).toBe(2);
  });

  it('torna a sincronização repetida e o roundtrip idempotentes', () => {
    const map = worldMap();
    const exploration = worldExploration(map);
    const definitions = worldResources(map, exploration);
    const collectedAt = createInitialTime();
    const collected = collectResource(
      map,
      createInitialNavigation(),
      exploration,
      revealed(START, ['fallen-sticks'], 25),
      definitions,
      createInitialResources(definitions),
      [],
      'fallen-sticks',
      2,
      collectedAt,
    );
    const restored = inspectResourcesState(
      JSON.parse(JSON.stringify(collected.current)) as ResourcesState,
      definitions,
    );
    expect(restored.ok).toBe(true);
    if (!restored.ok) {
      return;
    }

    const now = collected.node.current.nextRenewalAt!;
    const first = synchronizeResourceRenewal(definitions, restored.value, now);
    const second = synchronizeResourceRenewal(definitions, first, now);
    const sameInstant = synchronizeResourceRenewal(definitions, restored.value, collectedAt);

    expect(first).toEqual(second);
    expect(getResourceNode(sameInstant, 'fallen-sticks').availableUnits).toBe(2);
    expect(getResourceNode(sameInstant, 'fallen-sticks').nextRenewalAt).toEqual(now);
  });

  it('reduz a população correta, aumenta a pressão e compartilha o mesmo estoque', () => {
    const map = worldMap();
    const exploration = worldExploration(map);
    const definitions = indexResourceDefinitions(
      [
        node({
          id: 'warren-a',
          discoveryId: 'horned-rabbit-tracks',
          locationId: 'dense-woods',
          capacity: 4,
          maxCollectionPerAction: 2,
          renewal: { type: 'population', populationId: 'horned-rabbits' },
          yields: [{ itemId: 'raw-horned-rabbit-meat', quantityPerUnit: 1 }],
        }),
        node({
          id: 'warren-b',
          discoveryId: 'horned-rabbit-tracks',
          locationId: 'dense-woods',
          capacity: 4,
          maxCollectionPerAction: 2,
          renewal: { type: 'population', populationId: 'horned-rabbits' },
          yields: [{ itemId: 'horned-rabbit-hide', quantityPerUnit: 1 }],
        }),
      ],
      [...INITIAL_POPULATIONS],
      map,
      exploration,
    );
    const navigation = moveTo(map, 'dense-woods');
    const explorationState = revealed('dense-woods', ['horned-rabbit-tracks'], 40);
    const result = collectResource(
      map,
      navigation,
      exploration,
      explorationState,
      definitions,
      createInitialResources(definitions),
      [],
      'warren-a',
      2,
      createInitialTime(),
    );

    expect(result.population?.current.current).toBe(6);
    expect(result.population?.current.pressure).toBe(2);
    expect(getEffectiveAvailability(definitions, result.current, 'warren-b')).toBe(4);
    expect(getPopulation(result.current, 'horned-rabbits').current).toBe(6);
    expect(getPopulationStatus(definitions, result.current, 'horned-rabbits')).toBe('stable');
  });

  it('deriva os estados qualitativos na ordem correta', () => {
    const definition = INITIAL_POPULATIONS[0];

    expect(derivePopulationStatus(definition, { current: 8, locallyExtinct: false })).toBe('abundant');
    expect(derivePopulationStatus(definition, { current: 6, locallyExtinct: false })).toBe('stable');
    expect(derivePopulationStatus(definition, { current: 4, locallyExtinct: false })).toBe('declining');
    expect(derivePopulationStatus(definition, { current: 2, locallyExtinct: false })).toBe('threatened');
    expect(derivePopulationStatus(definition, { current: 0, locallyExtinct: true })).toBe('exhausted');
  });

  it('reduz a coleta no alerta, permite extinção por insistência e bloqueia depois', () => {
    const map = worldMap();
    const exploration = worldExploration(map);
    const definitions = worldResources(map, exploration);
    const navigation = moveTo(map, 'dense-woods');
    const explorationState = revealed('dense-woods', ['horned-rabbit-tracks'], 40);
    let state = createInitialResources(definitions);
    let inventory: { itemId: string; quantity: number }[] = [];
    const collect = (units: number) => {
      const result = collectResource(
        map,
        navigation,
        exploration,
        explorationState,
        definitions,
        state,
        inventory,
        'horned-rabbit-warren',
        units,
        createInitialTime(),
      );
      state = result.current;
      inventory = result.inventory.current;
      return result;
    };

    expect(collect(2).collectedUnits).toBe(2);
    expect(getPopulationStatus(definitions, state, 'horned-rabbits')).toBe('stable');
    expect(collect(2).collectedUnits).toBe(2);
    expect(getPopulationStatus(definitions, state, 'horned-rabbits')).toBe('declining');
    expect(getMaxCollectable(definitions, state, 'horned-rabbit-warren')).toBe(1);
    expect(collect(2).collectedUnits).toBe(1);
    expect(collect(1).collectedUnits).toBe(1);
    expect(getPopulationStatus(definitions, state, 'horned-rabbits')).toBe('threatened');
    expect(collect(1).collectedUnits).toBe(1);
    expect(collect(1).collectedUnits).toBe(1);
    expect(getPopulation(state, 'horned-rabbits')).toMatchObject({ current: 0, locallyExtinct: true });
    expect(getPopulationStatus(definitions, state, 'horned-rabbits')).toBe('exhausted');
    expect(() => collect(1)).toThrow(EXTINCT_POPULATION_REASON);
    expect(
      getResourceNode(
        applyPopulationDayCycle(state, definitions, [{ type: 'day.started', day: 2 }]),
        'horned-rabbit-warren',
      ).availableUnits,
    ).toBe(0);
    expect(getPopulation(applyPopulationDayCycle(state, definitions, [{ type: 'day.started', day: 2 }]), 'horned-rabbits')).toMatchObject({
      current: 0,
      locallyExtinct: true,
      lastRecoveredDay: 2,
    });
  });

  it('recupera população só com day.started, de forma idempotente e com salto de dias', () => {
    const map = worldMap();
    const exploration = worldExploration(map);
    const definitions = worldResources(map, exploration);
    const navigation = moveTo(map, 'dense-woods');
    const collected = collectResource(
      map,
      navigation,
      exploration,
      revealed('dense-woods', ['horned-rabbit-tracks'], 40),
      definitions,
      createInitialResources(definitions),
      [],
      'horned-rabbit-warren',
      2,
      createInitialTime(),
    );

    const ignored = applyPopulationDayCycle(collected.current, definitions, [
      { type: 'period.ended', day: 1, periodId: 'alvorecer' },
      { type: 'period.started', day: 1, periodId: 'manha' },
      { type: 'day.ended', day: 1 },
    ]);
    const recovered = applyPopulationDayCycle(collected.current, definitions, [{ type: 'day.started', day: 2 }]);
    const repeated = applyPopulationDayCycle(recovered, definitions, [{ type: 'day.started', day: 2 }]);
    const jumped = applyPopulationDayCycle(collected.current, definitions, [{ type: 'day.started', day: 4 }]);

    expect(getPopulation(ignored, 'horned-rabbits').current).toBe(6);
    expect(getPopulation(recovered, 'horned-rabbits').current).toBe(8);
    expect(getResourceNode(recovered, 'horned-rabbit-warren').availableUnits).toBe(8);
    expect(repeated).toEqual(recovered);
    expect(getPopulation(jumped, 'horned-rabbits').current).toBe(8);
    expect(getPopulation(jumped, 'horned-rabbits').pressure).toBe(0);
  });

  it('reduz a recuperação crítica, respeita a capacidade e não deixa a pressão negativa', () => {
    const map = worldMap();
    const exploration = worldExploration(map);
    const definitions = worldResources(map, exploration);
    const threatened: ResourcesState = {
      nodes: createInitialResources(definitions).nodes.map((entry) =>
        entry.nodeId === 'horned-rabbit-warren'
          ? { ...entry, availableUnits: 1, exhausted: false }
          : entry,
      ),
      populations: [
        {
          populationId: 'horned-rabbits',
          current: 2,
          pressure: 1,
          locallyExtinct: false,
          lastRecoveredDay: 1,
        },
      ],
    };

    const recovered = applyPopulationDayCycle(threatened, definitions, [{ type: 'day.started', day: 2 }]);
    expect(getPopulation(recovered, 'horned-rabbits')).toMatchObject({
      current: 3,
      pressure: 0,
      locallyExtinct: false,
    });

    const capped = applyPopulationDayCycle(
      {
        ...createInitialResources(definitions),
        populations: [
          {
            populationId: 'horned-rabbits',
            current: 7,
            pressure: 0,
            locallyExtinct: false,
            lastRecoveredDay: 1,
          },
        ],
      },
      definitions,
      [{ type: 'day.started', day: 5 }],
    );
    expect(getPopulation(capped, 'horned-rabbits').current).toBe(8);
    expect(getPopulation(capped, 'horned-rabbits').pressure).toBe(0);
  });

  it('não altera caverna, navegação nem exploração e só produz carne crua', () => {
    const map = worldMap();
    const exploration = worldExploration(map);
    const definitions = worldResources(map, exploration);
    const navigation = Object.freeze(moveTo(map, 'dense-woods'));
    const explorationState = Object.freeze(revealed('dense-woods', ['horned-rabbit-tracks'], 40));
    const navigationSnapshot = structuredClone(navigation);
    const explorationSnapshot = structuredClone(explorationState);
    const result = collectResource(
      map,
      navigation,
      exploration,
      explorationState,
      definitions,
      createInitialResources(definitions),
      [],
      'horned-rabbit-warren',
      1,
      createInitialTime(),
    );

    expect(navigation).toEqual(navigationSnapshot);
    expect(explorationState).toEqual(explorationSnapshot);
    expect(navigation.visitedLocationIds).not.toContain('hidden-cave');
    expect(result.yields.map((entry) => entry.itemId)).toEqual([
      'raw-horned-rabbit-meat',
      'horned-rabbit-hide',
      'horned-rabbit-horn',
      'horned-rabbit-bones',
    ]);
    expect(result.yields.some((entry) => entry.itemId.includes('cooked'))).toBe(false);
    expect(JSON.stringify(result.inventory.current)).not.toContain('cooked');
    expect(JSON.stringify(result.inventory.current)).not.toContain('refeicao');
    expect(itemQuantity(result.inventory.current, 'raw-horned-rabbit-meat')).toBe(1);
  });

  it('bloqueia coleta por condições e impede o avaliador de mutar definições', () => {
    const map = worldMap();
    const exploration = worldExploration(map);
    const definitions = indexResourceDefinitions(
      [
        node({
          id: 'gated',
          conditions: [
            { type: 'flag.is', flag: 'ready', value: true },
            { type: 'attribute.min', attribute: 'cautela', amount: 1 },
            { type: 'inventory.has', itemId: 'chave', quantity: 1 },
            { type: 'relationship.min', characterId: 'mira-vale', amount: 0 },
          ],
          blockedReason: 'Ainda não é seguro coletar aqui.',
        }),
      ],
      [],
      map,
      exploration,
    );
    const indexedConditions = definitions.byNode.get('gated')?.conditions;
    const snapshot = structuredClone(indexedConditions);
    const adversarial: ResourceConditionEvaluator = (conditions) => {
      if (!conditions) {
        return false;
      }

      const mutable = conditions as GameCondition[];
      mutable.push({ type: 'flag.is', flag: 'hacked', value: true });
      const first = mutable[0];
      if (first?.type === 'flag.is') {
        first.flag = 'mutated';
        first.value = false;
      }

      return false;
    };

    expect(() =>
      collectResource(
        map,
        createInitialNavigation(),
        exploration,
        revealed(START, ['fallen-sticks'], 25),
        definitions,
        createInitialResources(definitions),
        [],
        'gated',
        1,
        createInitialTime(),
        adversarial,
      ),
    ).toThrow('Ainda não é seguro coletar aqui.');
    expect(indexedConditions).toEqual(snapshot);

    const open = collectResource(
      map,
      createInitialNavigation(),
      exploration,
      revealed(START, ['fallen-sticks'], 25),
      definitions,
      createInitialResources(definitions),
      [{ itemId: 'chave', quantity: 1 }],
      'gated',
      1,
      createInitialTime(),
      createResourceEvaluator({
        ...freshState(),
        flags: { ready: true },
        inventory: [{ itemId: 'chave', quantity: 1 }],
      }),
    );
    expect(open.collectedUnits).toBe(1);
    expect(DEFAULT_RESOURCE_BLOCKED_REASON).toBe('Este ponto de recurso está bloqueado.');
  });

  it('rejeita definições inválidas', () => {
    const map = worldMap();
    const exploration = worldExploration(map);

    expect(inspectResourceDefinitions(null, [], map, exploration).ok).toBe(false);
    expect(
      inspectResourceDefinitions([node({ id: '' })], [], map, exploration),
    ).toMatchObject({ ok: false, reason: 'O ponto de recurso possui identificador vazio.' });
    expect(
      inspectResourceDefinitions([node({ id: 'a' }), node({ id: 'a', name: 'Outro' })], [], map, exploration),
    ).toMatchObject({ ok: false, reason: 'As definições possuem identificadores de ponto duplicados.' });
    expect(
      inspectResourceDefinitions([node({ id: 'missing-loc', locationId: 'nope' })], [], map, exploration),
    ).toMatchObject({ ok: false, reason: 'A localização não existe.' });
    expect(
      inspectResourceDefinitions([node({ id: 'missing-disc', discoveryId: 'nope' })], [], map, exploration),
    ).toMatchObject({ ok: false, reason: 'A descoberta não existe.' });
    expect(
      inspectResourceDefinitions(
        [node({ id: 'landmark', discoveryId: 'awakening-site' })],
        [],
        map,
        exploration,
      ),
    ).toMatchObject({ ok: false, reason: 'O tipo de descoberta é incompatível com o ponto de recurso.' });
    expect(
      inspectResourceDefinitions(
        [node({ id: 'wrong-place', discoveryId: 'spring-water', locationId: START })],
        [],
        map,
        exploration,
      ),
    ).toMatchObject({ ok: false, reason: 'A descoberta não pertence à localização do ponto.' });
    expect(
      inspectResourceDefinitions([node({ id: 'cap', capacity: 0 })], [], map, exploration),
    ).toMatchObject({ ok: false, reason: 'A capacidade precisa ser um inteiro positivo.' });
    expect(
      inspectResourceDefinitions([node({ id: 'cost', collectionCost: { periods: 1.5 } })], [], map, exploration),
    ).toMatchObject({ ok: false, reason: 'O custo de tempo precisa ser um inteiro não negativo.' });
    expect(
      inspectResourceDefinitions([node({ id: 'policy', renewal: { type: 'mystery' } as never })], [], map, exploration),
    ).toMatchObject({ ok: false, reason: 'A política de renovação é desconhecida.' });
    expect(
      inspectResourceDefinitions(
        [node({ id: 'short-zero', renewal: { type: 'short', periods: 0 } })],
        [],
        map,
        exploration,
      ),
    ).toMatchObject({ ok: false, reason: 'Os períodos de renovação precisam ser um inteiro positivo.' });
    expect(
      inspectResourceDefinitions(
        [node({ id: 'short-max', renewal: { type: 'short', periods: MAX_ADVANCE_PERIODS + 1 } })],
        [],
        map,
        exploration,
      ).ok,
    ).toBe(false);
    expect(
      inspectResourceDefinitions(
        [node({ id: 'long-zero', renewal: { type: 'long', days: 0 } })],
        [],
        map,
        exploration,
      ),
    ).toMatchObject({ ok: false, reason: 'Os dias de renovação precisam ser um inteiro positivo.' });
    expect(
      inspectResourceDefinitions(
        [node({ id: 'ghost-pop', renewal: { type: 'population', populationId: 'missing' } })],
        [],
        map,
        exploration,
      ),
    ).toMatchObject({ ok: false, reason: 'A população referenciada não existe.' });
    expect(
      inspectResourceDefinitions([node({ id: 'empty-yields', yields: [] })], [], map, exploration),
    ).toMatchObject({ ok: false, reason: 'Os rendimentos do ponto não podem estar vazios.' });
    expect(
      inspectResourceDefinitions(
        [
          node({
            id: 'dup-yield',
            yields: [
              { itemId: 'a', quantityPerUnit: 1 },
              { itemId: 'a', quantityPerUnit: 2 },
            ],
          }),
        ],
        [],
        map,
        exploration,
      ),
    ).toMatchObject({ ok: false, reason: 'O ponto possui rendimentos duplicados.' });
    expect(
      inspectResourceDefinitions(
        [node({ id: 'qty', yields: [{ itemId: 'a', quantityPerUnit: 0 }] })],
        [],
        map,
        exploration,
      ),
    ).toMatchObject({ ok: false, reason: 'A quantidade por unidade precisa ser um inteiro positivo.' });
    expect(
      inspectResourceDefinitions([], [population({ id: '' })], map, exploration),
    ).toMatchObject({ ok: false, reason: 'A população possui identificador vazio.' });
    expect(
      inspectResourceDefinitions([], [population({ id: 'p' }), population({ id: 'p' })], map, exploration),
    ).toMatchObject({ ok: false, reason: 'As definições possuem identificadores de população duplicados.' });
    expect(
      inspectResourceDefinitions([], [population({ recoveryPerDay: -1 })], map, exploration),
    ).toMatchObject({ ok: false, reason: 'A recuperação diária precisa ser um inteiro não negativo.' });
    expect(
      inspectResourceDefinitions(
        [],
        [population({ criticalThreshold: 3, warningThreshold: 3, carryingCapacity: 6 })],
        map,
        exploration,
      ),
    ).toMatchObject({ ok: false, reason: 'Os limiares da população são incoerentes.' });
    expect(() =>
      indexResourceDefinitions([node({ id: 'boom', capacity: 1.2 })], [], map, exploration),
    ).toThrow(ResourceError);
  });

  it('rejeita estado inválido', () => {
    const map = worldMap();
    const exploration = worldExploration(map);
    const definitions = worldResources(map, exploration);
    const valid = createInitialResources(definitions);

    expect(inspectResourcesState(null, definitions).ok).toBe(false);
    expect(
      inspectResourcesState({ ...valid, nodes: valid.nodes.slice(1) }, definitions),
    ).toMatchObject({ ok: false, reason: 'O estado de recursos omite pontos obrigatórios.' });
    expect(
      inspectResourcesState(
        { ...valid, nodes: [...valid.nodes, { ...valid.nodes[0], nodeId: 'ghost' }] },
        definitions,
      ),
    ).toMatchObject({ ok: false, reason: 'O estado de recursos possui pontos extras.' });
    expect(
      inspectResourcesState({ ...valid, nodes: [...valid.nodes, valid.nodes[0]] }, definitions),
    ).toMatchObject({ ok: false, reason: 'O estado de recursos possui pontos extras.' });
    expect(
      inspectResourcesState(
        {
          ...valid,
          nodes: valid.nodes.map((entry, index) => (index === 0 ? { ...entry, nodeId: 'fallen-sticks' } : { ...entry, nodeId: 'fallen-sticks' })),
        },
        definitions,
      ),
    ).toMatchObject({ ok: false, reason: 'O estado de recursos possui identificadores duplicados.' });
    expect(
      inspectResourcesState(
        {
          ...valid,
          nodes: valid.nodes.map((entry) =>
            entry.nodeId === 'fallen-sticks' ? { ...entry, availableUnits: 99 } : entry,
          ),
        },
        definitions,
      ),
    ).toMatchObject({ ok: false, reason: 'A disponibilidade do ponto é inválida.' });
    expect(
      inspectResourcesState(
        {
          ...valid,
          nodes: valid.nodes.map((entry) =>
            entry.nodeId === 'fallen-sticks' ? { ...entry, exhausted: true } : entry,
          ),
        },
        definitions,
      ),
    ).toMatchObject({ ok: false, reason: 'O esgotamento do ponto é inconsistente.' });
    expect(
      inspectResourcesState(
        {
          ...valid,
          populations: valid.populations.map((entry) => ({ ...entry, locallyExtinct: true })),
        },
        definitions,
      ),
    ).toMatchObject({ ok: false, reason: 'A extinção local é inconsistente.' });
    expect(
      inspectResourcesState(
        {
          ...valid,
          populations: valid.populations.map((entry) => ({ ...entry, lastRecoveredDay: 0 })),
        },
        definitions,
      ),
    ).toMatchObject({ ok: false, reason: 'O dia de recuperação é inválido.' });
    expect(
      inspectResourcesState(
        {
          ...valid,
          nodes: valid.nodes.map((entry) =>
            entry.nodeId === 'fallen-sticks'
              ? { ...entry, lastCollectedAt: { day: 1, periodId: 'nunca' } }
              : entry,
          ),
        },
        definitions,
      ),
    ).toMatchObject({ ok: false, reason: 'A data do ponto é inválida.' });
    expect(() =>
      collectResource(
        map,
        createInitialNavigation(),
        exploration,
        revealed(START, ['fallen-sticks'], 25),
        definitions,
        valid,
        [],
        'fallen-sticks',
        0,
        createInitialTime(),
      ),
    ).toThrow('A quantidade solicitada precisa ser um inteiro positivo.');
    expect(EXHAUSTED_RESOURCE_REASON).toBe('Este ponto está esgotado.');
  });

  it('preserva o estado no roundtrip JSON', () => {
    const map = worldMap();
    const exploration = worldExploration(map);
    const definitions = worldResources(map, exploration);
    const collected = collectResource(
      map,
      createInitialNavigation(),
      exploration,
      revealed(START, ['fallen-sticks'], 25),
      definitions,
      createInitialResources(definitions),
      [],
      'fallen-sticks',
      2,
      { day: 2, periodId: 'tarde' },
    );
    const serialized = JSON.stringify(collected.current);
    const restored = inspectResourcesState(JSON.parse(serialized) as ResourcesState, definitions);

    expect(restored.ok).toBe(true);
    if (!restored.ok) {
      return;
    }

    expect(restored.value).toEqual(collected.current);
    expect(serialized).toEqual(JSON.stringify(JSON.parse(serialized)));
    expect(getResourceNode(restored.value, 'fallen-sticks').lastCollectedAt).toEqual({
      day: 2,
      periodId: 'tarde',
    });
    expect(getResourceNode(restored.value, 'fallen-sticks').nextRenewalAt).toEqual(
      advanceTime({ day: 2, periodId: 'tarde' }, { periods: 2 }).current,
    );

    const hunted = collectResource(
      map,
      moveTo(map, 'dense-woods'),
      exploration,
      revealed('dense-woods', ['horned-rabbit-tracks'], 40),
      definitions,
      restored.value,
      [],
      'horned-rabbit-warren',
      2,
      { day: 3, periodId: 'noite' },
    );
    const extinct = {
      ...hunted.current,
      populations: hunted.current.populations.map((entry) => ({
        ...entry,
        current: 0,
        pressure: 8,
        locallyExtinct: true,
        lastRecoveredDay: 4,
      })),
      nodes: hunted.current.nodes.map((entry) =>
        entry.nodeId === 'horned-rabbit-warren' ? { ...entry, availableUnits: 0, exhausted: true } : entry,
      ),
    };
    const populationRoundtrip = inspectResourcesState(JSON.parse(JSON.stringify(extinct)) as ResourcesState, definitions);
    expect(populationRoundtrip.ok).toBe(true);
    if (populationRoundtrip.ok) {
      expect(getPopulation(populationRoundtrip.value, 'horned-rabbits')).toEqual({
        populationId: 'horned-rabbits',
        current: 0,
        pressure: 8,
        locallyExtinct: true,
        lastRecoveredDay: 4,
      });
    }
  });

  it('é imutável e determinística', () => {
    const map = worldMap();
    const exploration = worldExploration(map);
    const definitions = worldResources(map, exploration);
    const state = freezeState(createInitialResources(definitions));
    const inventory = Object.freeze([] as { itemId: string; quantity: number }[]);
    const collectedAt = Object.freeze(createInitialTime());
    const first = collectResource(
      map,
      createInitialNavigation(),
      exploration,
      revealed(START, ['fallen-sticks'], 25),
      definitions,
      state,
      inventory,
      'fallen-sticks',
      1,
      collectedAt,
    );
    const second = collectResource(
      map,
      createInitialNavigation(),
      exploration,
      revealed(START, ['fallen-sticks'], 25),
      definitions,
      state,
      inventory,
      'fallen-sticks',
      1,
      collectedAt,
    );

    expect(first).toEqual(second);
    expect(state.nodes[0]?.availableUnits).toBe(4);
    expect(getResourceYields(definitions, 'spring')).toEqual([{ itemId: 'raw-water', quantityPerUnit: 1 }]);
  });

  it('rejeita ponto parcial sem lastCollectedAt ou nextRenewalAt', () => {
    const definitions = worldResources();
    const valid = createInitialResources(definitions);
    const lastCollectedAt = createInitialTime();
    const nextRenewalAt = advanceTime(lastCollectedAt, { periods: 2 }).current;

    expect(
      inspectResourcesState(
        patchNode(valid, 'fallen-sticks', { availableUnits: 2, nextRenewalAt, exhausted: false }),
        definitions,
      ),
    ).toMatchObject({ ok: false, reason: 'A data do ponto é inválida.' });
    expect(
      inspectResourcesState(
        patchNode(valid, 'fallen-sticks', { availableUnits: 2, lastCollectedAt, exhausted: false }),
        definitions,
      ),
    ).toMatchObject({ ok: false, reason: 'A renovação agendada é inválida.' });
  });

  it('só aceita o prazo de renovação exatamente calculado na política curta e longa', () => {
    const map = worldMap();
    const exploration = worldExploration(map);
    const shortDefinitions = worldResources(map, exploration);
    const shortValid = createInitialResources(shortDefinitions);
    const shortCollectedAt = createInitialTime();
    const shortExact = advanceTime(shortCollectedAt, { periods: 2 }).current;
    const shortBefore = advanceTime(shortCollectedAt, { periods: 1 }).current;
    const shortAfter = advanceTime(shortCollectedAt, { periods: 3 }).current;

    expect(
      inspectResourcesState(
        patchNode(shortValid, 'fallen-sticks', {
          availableUnits: 2,
          lastCollectedAt: shortCollectedAt,
          nextRenewalAt: shortBefore,
          exhausted: false,
        }),
        shortDefinitions,
      ),
    ).toMatchObject({ ok: false, reason: 'A renovação agendada é inválida.' });
    expect(
      inspectResourcesState(
        patchNode(shortValid, 'fallen-sticks', {
          availableUnits: 2,
          lastCollectedAt: shortCollectedAt,
          nextRenewalAt: shortAfter,
          exhausted: false,
        }),
        shortDefinitions,
      ),
    ).toMatchObject({ ok: false, reason: 'A renovação agendada é inválida.' });
    expect(
      inspectResourcesState(
        patchNode(shortValid, 'fallen-sticks', {
          availableUnits: 2,
          lastCollectedAt: shortCollectedAt,
          nextRenewalAt: shortExact,
          exhausted: false,
        }),
        shortDefinitions,
      ).ok,
    ).toBe(true);

    const longDefinitions = indexResourceDefinitions(
      [
        node({
          id: 'rare-fungus',
          discoveryId: 'spring-water',
          locationId: 'spring-lake',
          capacity: 2,
          maxCollectionPerAction: 2,
          renewal: { type: 'long', days: 3 },
          yields: [{ itemId: 'rare-fungus', quantityPerUnit: 1 }],
        }),
      ],
      [],
      map,
      exploration,
    );
    const longValid = createInitialResources(longDefinitions);
    const longCollectedAt = { day: 1, periodId: 'manha' };
    const longExact = { day: 4, periodId: 'manha' };

    expect(
      inspectResourcesState(
        patchNode(longValid, 'rare-fungus', {
          availableUnits: 1,
          lastCollectedAt: longCollectedAt,
          nextRenewalAt: { day: 1, periodId: 'alvorecer' },
          exhausted: false,
        }),
        longDefinitions,
      ),
    ).toMatchObject({ ok: false, reason: 'A renovação agendada é inválida.' });
    expect(
      inspectResourcesState(
        patchNode(longValid, 'rare-fungus', {
          availableUnits: 1,
          lastCollectedAt: longCollectedAt,
          nextRenewalAt: { day: 5, periodId: 'manha' },
          exhausted: false,
        }),
        longDefinitions,
      ),
    ).toMatchObject({ ok: false, reason: 'A renovação agendada é inválida.' });
    expect(
      inspectResourcesState(
        patchNode(longValid, 'rare-fungus', {
          availableUnits: 1,
          lastCollectedAt: longCollectedAt,
          nextRenewalAt: longExact,
          exhausted: false,
        }),
        longDefinitions,
      ).ok,
    ).toBe(true);
  });

  it('rejeita coleta no passado de forma atômica e permite o mesmo horário', () => {
    const map = worldMap();
    const exploration = worldExploration(map);
    const definitions = worldResources(map, exploration);
    const explorationState = revealed(START, ['fallen-sticks'], 25);
    const first = collectResource(
      map,
      createInitialNavigation(),
      exploration,
      explorationState,
      definitions,
      createInitialResources(definitions),
      [],
      'fallen-sticks',
      1,
      { day: 1, periodId: 'manha' },
    );
    const frozen = freezeState(first.current);
    const inventory = Object.freeze(first.inventory.current.map((item) => ({ ...item })));

    expect(() =>
      collectResource(
        map,
        createInitialNavigation(),
        exploration,
        explorationState,
        definitions,
        frozen,
        inventory,
        'fallen-sticks',
        1,
        { day: 1, periodId: 'alvorecer' },
      ),
    ).toThrow(COLLECTION_IN_THE_PAST_REASON);
    expect(frozen).toEqual(first.current);
    expect(inventory).toEqual(first.inventory.current);

    const sameTime = collectResource(
      map,
      createInitialNavigation(),
      exploration,
      explorationState,
      definitions,
      first.current,
      first.inventory.current,
      'fallen-sticks',
      1,
      { day: 1, periodId: 'manha' },
    );
    expect(sameTime.collectedUnits).toBe(1);
    expect(sameTime.node.current.lastCollectedAt).toEqual({ day: 1, periodId: 'manha' });
    expect(sameTime.node.current.nextRenewalAt).toEqual(advanceTime({ day: 1, periodId: 'manha' }, { periods: 2 }).current);
  });

  it('recalcula o prazo na nova coleta e não acelera renovação no roundtrip', () => {
    const map = worldMap();
    const exploration = worldExploration(map);
    const definitions = worldResources(map, exploration);
    const explorationState = revealed(START, ['fallen-sticks'], 25);
    const first = collectResource(
      map,
      createInitialNavigation(),
      exploration,
      explorationState,
      definitions,
      createInitialResources(definitions),
      [],
      'fallen-sticks',
      1,
      createInitialTime(),
    );
    const second = collectResource(
      map,
      createInitialNavigation(),
      exploration,
      explorationState,
      definitions,
      first.current,
      first.inventory.current,
      'fallen-sticks',
      1,
      { day: 1, periodId: 'manha' },
    );
    const restored = inspectResourcesState(JSON.parse(JSON.stringify(second.current)) as ResourcesState, definitions);

    expect(first.node.current.nextRenewalAt).toEqual(advanceTime(createInitialTime(), { periods: 2 }).current);
    expect(second.node.current.lastCollectedAt).toEqual({ day: 1, periodId: 'manha' });
    expect(second.node.current.nextRenewalAt).toEqual(advanceTime({ day: 1, periodId: 'manha' }, { periods: 2 }).current);
    expect(second.node.current.nextRenewalAt).not.toEqual(first.node.current.nextRenewalAt);
    expect(restored.ok).toBe(true);
    if (!restored.ok) {
      return;
    }

    expect(restored.value).toEqual(second.current);
    expect(getResourceNode(synchronizeResourceRenewal(definitions, restored.value, { day: 1, periodId: 'manha' }), 'fallen-sticks').availableUnits).toBe(2);
    expect(getResourceNode(synchronizeResourceRenewal(definitions, restored.value, { day: 1, periodId: 'manha' }), 'fallen-sticks').nextRenewalAt).toEqual(
      second.node.current.nextRenewalAt,
    );
  });

  it('propaga timeConfig personalizado na coleta, consulta e sincronização', () => {
    const map = worldMap();
    const exploration = worldExploration(map);
    const definitions = worldResources(map, exploration);
    const explorationState = revealed(START, ['fallen-sticks'], 25);
    const collectedAt = { day: 1, periodId: 'madrugada' };
    const first = collectResource(
      map,
      createInitialNavigation(),
      exploration,
      explorationState,
      definitions,
      createInitialResources(definitions),
      [],
      'fallen-sticks',
      1,
      collectedAt,
      undefined,
      CUSTOM_PERIODS,
    );
    const due = advanceTime(collectedAt, { periods: 2 }, CUSTOM_PERIODS).current;

    expect(first.node.current.lastCollectedAt).toEqual(collectedAt);
    expect(first.node.current.nextRenewalAt).toEqual(due);
    expect(
      inspectResourceAccess(
        map,
        createInitialNavigation(),
        exploration,
        explorationState,
        definitions,
        first.current,
        'fallen-sticks',
        undefined,
        CUSTOM_PERIODS,
      ).collectable,
    ).toBe(true);
    expect(
      canCollectResource(
        map,
        createInitialNavigation(),
        exploration,
        explorationState,
        definitions,
        first.current,
        'fallen-sticks',
        undefined,
        CUSTOM_PERIODS,
      ),
    ).toBe(true);

    const second = collectResource(
      map,
      createInitialNavigation(),
      exploration,
      explorationState,
      definitions,
      first.current,
      first.inventory.current,
      'fallen-sticks',
      1,
      collectedAt,
      undefined,
      CUSTOM_PERIODS,
    );
    expect(second.collectedUnits).toBe(1);
    expect(second.node.current.nextRenewalAt).toEqual(due);

    const synced = synchronizeResourceRenewal(definitions, second.current, due, CUSTOM_PERIODS);
    expect(getResourceNode(synced, 'fallen-sticks')).toMatchObject({
      availableUnits: 4,
      exhausted: false,
    });
    expect(getResourceNode(synced, 'fallen-sticks').nextRenewalAt).toBeUndefined();
    expect(inspectResourcesState(first.current, definitions, CUSTOM_PERIODS).ok).toBe(true);
    expect(inspectResourcesState(first.current, definitions).ok).toBe(false);
    expect(() =>
      inspectResourceAccess(
        map,
        createInitialNavigation(),
        exploration,
        explorationState,
        definitions,
        first.current,
        'fallen-sticks',
      ),
    ).toThrow(ResourceError);
  });
});
