import { describe, expect, it } from 'vitest';
import { evaluateConditions } from '../core/events';
import type { GameCondition } from '../core/events';
import { addItem, itemQuantity } from '../modules/inventory';
import {
  ExplorationError,
  INITIAL_EXPLORATION_DEFINITIONS,
  applyDiscoveryNavigationEffects,
  calculateZoneCompletion,
  canExploreLocation,
  createDiscoveryEvaluator,
  createInitialExploration,
  exploreCurrentLocation,
  getLocationExploration,
  getRevealedDiscoveries,
  indexExplorationDefinitions,
  inspectExplorationDefinitions,
  inspectExplorationState,
  reevaluateDiscoveries,
  type DiscoveryConditionEvaluator,
  type DiscoveryDefinition,
  type ExplorationState,
  type IndexedExploration,
  type LocationExplorationDefinition,
  type LocationExplorationState,
} from '../modules/exploration';
import {
  DEFAULT_STARTING_LOCATION_ID,
  INITIAL_WORLD_MAP,
  createInitialNavigation,
  discoverLocation,
  indexNavigationMap,
  listVisibleDestinations,
  moveToLocation,
  unlockLocation,
  type IndexedMap,
  type LocationNode,
  type NavigationState,
} from '../modules/navigation';
import { createInitialTime, MAX_ADVANCE_PERIODS } from '../modules/time';
import { freshState } from './helpers';

const START = DEFAULT_STARTING_LOCATION_ID;

function worldMap(): IndexedMap {
  return indexNavigationMap(INITIAL_WORLD_MAP, START);
}

function worldDefinitions(map: IndexedMap = worldMap()): IndexedExploration {
  return indexExplorationDefinitions(INITIAL_EXPLORATION_DEFINITIONS, map);
}

function freezeDiscovery(discovery: DiscoveryDefinition): DiscoveryDefinition {
  if (discovery.conditions) {
    Object.freeze(discovery.conditions);
  }

  return Object.freeze(discovery);
}

function freezeDefinition(definition: LocationExplorationDefinition): LocationExplorationDefinition {
  for (const discovery of definition.discoveries) {
    freezeDiscovery(discovery);
  }

  Object.freeze(definition.discoveries);
  Object.freeze(definition.timeCost);
  return Object.freeze(definition);
}

function freezeDefinitions(definitions: readonly LocationExplorationDefinition[]): LocationExplorationDefinition[] {
  return Object.freeze(definitions.map(freezeDefinition)) as LocationExplorationDefinition[];
}

function freezeExploration(state: ExplorationState): ExplorationState {
  return Object.freeze({
    locations: Object.freeze(
      state.locations.map((entry) =>
        Object.freeze({
          locationId: entry.locationId,
          progress: entry.progress,
          revealedDiscoveryIds: Object.freeze([...entry.revealedDiscoveryIds]) as string[],
          explorationCount: entry.explorationCount,
        }),
      ),
    ) as LocationExplorationState[],
  });
}

function freezeNavigation(state: NavigationState): NavigationState {
  return Object.freeze({
    currentLocationId: state.currentLocationId,
    discoveredLocationIds: Object.freeze([...state.discoveredLocationIds]) as string[],
    unlockedLocationIds: Object.freeze([...state.unlockedLocationIds]) as string[],
    visitedLocationIds: Object.freeze([...state.visitedLocationIds]) as string[],
  });
}

function freezeLocation(node: LocationNode): LocationNode {
  if (node.children) {
    for (const child of node.children) {
      freezeLocation(child);
    }
    Object.freeze(node.children);
  }

  if (node.travelCost) {
    Object.freeze(node.travelCost);
  }

  if (node.unlockConditions) {
    Object.freeze(node.unlockConditions);
  }

  if (node.image) {
    Object.freeze(node.image);
  }

  return Object.freeze(node);
}

function reveal(map: IndexedMap, state: NavigationState, locationIds: readonly string[]): NavigationState {
  let next = state;
  for (const locationId of locationIds) {
    next = discoverLocation(map, next, locationId);
    next = unlockLocation(map, next, locationId);
  }
  return next;
}

function destinationIds(map: IndexedMap, state: NavigationState) {
  return listVisibleDestinations(map, state).map((destination) => destination.location.id);
}

function moveToDenseWoods(map: IndexedMap, navigation: NavigationState): NavigationState {
  const prepared = reveal(map, navigation, ['horned-rabbit-forest', 'dense-woods']);
  const inForest = moveToLocation(map, prepared, 'horned-rabbit-forest').current;
  return moveToLocation(map, inForest, 'dense-woods').current;
}

function definition(overrides: Partial<LocationExplorationDefinition> = {}): LocationExplorationDefinition {
  return {
    locationId: START,
    progressPerAction: 10,
    timeCost: { periods: 1 },
    discoveries: [],
    ...overrides,
  };
}

function discovery(overrides: Partial<DiscoveryDefinition> & Pick<DiscoveryDefinition, 'id'>): DiscoveryDefinition {
  return {
    kind: 'landmark',
    revealAt: 10,
    completionWeight: 1,
    once: true,
    ...overrides,
  };
}

function defs(
  map: IndexedMap,
  ...locations: LocationExplorationDefinition[]
): IndexedExploration {
  return indexExplorationDefinitions(locations, map);
}

describe('exploração e descobertas', () => {
  it('cria o estado inicial vazio', () => {
    const state = createInitialExploration();

    expect(state).toEqual({ locations: [] });
    expect(getLocationExploration(state, START)).toEqual({
      locationId: START,
      progress: 0,
      revealedDiscoveryIds: [],
      explorationCount: 0,
    });
  });

  it('mantém progresso independente por local', () => {
    const map = worldMap();
    const definitions = worldDefinitions(map);
    const first = exploreCurrentLocation(map, createInitialNavigation(), definitions, createInitialExploration());
    const atTree = moveToLocation(map, reveal(map, first.navigation.current, ['great-tree']), 'great-tree').current;
    const second = exploreCurrentLocation(map, atTree, definitions, first.current);

    expect(getLocationExploration(second.current, START).progress).toBe(10);
    expect(getLocationExploration(second.current, 'great-tree').progress).toBe(10);
    expect(getLocationExploration(second.current, START).explorationCount).toBe(1);
    expect(getLocationExploration(second.current, 'great-tree').explorationCount).toBe(1);
  });

  it('cria o estado local na primeira exploração', () => {
    const map = worldMap();
    const definitions = worldDefinitions(map);
    const previous = createInitialExploration();
    const result = exploreCurrentLocation(map, createInitialNavigation(), definitions, previous);

    expect(previous.locations).toEqual([]);
    expect(result.location.previous).toEqual({
      locationId: START,
      progress: 0,
      revealedDiscoveryIds: [],
      explorationCount: 0,
    });
    expect(result.current.locations).toEqual([
      {
        locationId: START,
        progress: 10,
        revealedDiscoveryIds: ['awakening-site', 'first-priority-event'],
        explorationCount: 1,
      },
    ]);
  });

  it('aplica o ganho normal de progresso', () => {
    const map = worldMap();
    const definitions = worldDefinitions(map);
    const result = exploreCurrentLocation(map, createInitialNavigation(), definitions, createInitialExploration());

    expect(result.progressGained).toBe(10);
    expect(result.location.current.progress).toBe(10);
    expect(result.timeCost).toEqual({ periods: 1 });
    expect(canExploreLocation(map, createInitialNavigation(), definitions, START)).toBe(true);
    expect(canExploreLocation(map, createInitialNavigation(), definitions, 'great-tree')).toBe(false);
  });

  it('limita o progresso a 100', () => {
    const map = worldMap();
    const definitions = defs(map, definition({ progressPerAction: 60, discoveries: [discovery({ id: 'mark' })] }));
    const first = exploreCurrentLocation(map, createInitialNavigation(), definitions, createInitialExploration());
    const second = exploreCurrentLocation(map, createInitialNavigation(), definitions, first.current);

    expect(first.location.current.progress).toBe(60);
    expect(second.progressGained).toBe(40);
    expect(second.location.current.progress).toBe(100);
  });

  it('concede ganho final menor que progressPerAction', () => {
    const map = worldMap();
    const definitions = worldDefinitions(map);
    const restored = inspectExplorationState(
      {
        locations: [
          {
            locationId: START,
            progress: 95,
            revealedDiscoveryIds: ['awakening-site', 'fallen-sticks', 'torn-cloth'],
            explorationCount: 10,
          },
        ],
      },
      definitions,
      map,
    );

    expect(restored.ok).toBe(true);
    if (!restored.ok) {
      return;
    }

    const result = exploreCurrentLocation(map, createInitialNavigation(), definitions, restored.value);
    expect(result.progressGained).toBe(5);
    expect(result.location.current.progress).toBe(100);
    expect(result.location.current.explorationCount).toBe(11);
  });

  it('não muta o estado de exploração', () => {
    const map = worldMap();
    const definitions = worldDefinitions(map);
    const previous = freezeExploration(createInitialExploration());
    const snapshot = structuredClone(previous);
    const result = exploreCurrentLocation(map, createInitialNavigation(), definitions, previous);

    expect(previous).toEqual(snapshot);
    expect(result.previous).not.toBe(previous);
    expect(result.current).not.toBe(previous);
    result.current.locations.push({
      locationId: 'great-tree',
      progress: 1,
      revealedDiscoveryIds: [],
      explorationCount: 1,
    });
    result.location.current.revealedDiscoveryIds.push('alterado');
    expect(previous).toEqual(snapshot);
    expect(getLocationExploration(previous, START).progress).toBe(0);
  });

  it('não muta as definições', () => {
    const map = worldMap();
    const raw = freezeDefinitions(structuredClone(INITIAL_EXPLORATION_DEFINITIONS));
    const snapshot = structuredClone(raw);
    const definitions = indexExplorationDefinitions(raw, map);
    const result = exploreCurrentLocation(map, createInitialNavigation(), definitions, createInitialExploration());

    expect(raw).toEqual(snapshot);
    result.discoveries[0].revealAt = 0;
    result.discoveries.push(discovery({ id: 'extra' }));
    expect(raw).toEqual(snapshot);
    expect(definitions.byLocation.get(START)?.discoveries.map((item) => item.id)).toEqual([
      'awakening-site',
      'first-priority-event',
      'path-great-tree',
      'fallen-sticks',
      'path-spring-lake',
      'torn-cloth',
      'path-dense-woods',
    ]);
  });

  it('não muta o mapa nem a navegação', () => {
    const raw = freezeLocation(structuredClone(INITIAL_WORLD_MAP));
    const map = indexNavigationMap(raw, START);
    const definitions = worldDefinitions(map);
    const navigation = freezeNavigation(createInitialNavigation(raw, START));
    const mapSnapshot = structuredClone(raw);
    const navSnapshot = structuredClone(navigation);
    const result = exploreCurrentLocation(map, navigation, definitions, createInitialExploration());

    expect(raw).toEqual(mapSnapshot);
    expect(navigation).toEqual(navSnapshot);
    expect(result.navigation.previous).not.toBe(navigation);
    expect(result.navigation.current).not.toBe(navigation);
    result.navigation.current.discoveredLocationIds.push('alterado');
    expect(navigation).toEqual(navSnapshot);
    expect(result.navigation.current.currentLocationId).toBe(START);
  });

  it('não revela descoberta antes do limiar', () => {
    const map = worldMap();
    const definitions = defs(
      map,
      definition({
        progressPerAction: 10,
        discoveries: [discovery({ id: 'later', revealAt: 20 })],
      }),
    );
    const result = exploreCurrentLocation(map, createInitialNavigation(), definitions, createInitialExploration());

    expect(result.location.current.progress).toBe(10);
    expect(result.discoveries).toEqual([]);
    expect(result.location.current.revealedDiscoveryIds).toEqual([]);
    expect(getRevealedDiscoveries(definitions, result.current, START)).toEqual([]);
  });

  it('revela a descoberta exatamente no limiar', () => {
    const map = worldMap();
    const definitions = defs(
      map,
      definition({
        progressPerAction: 10,
        discoveries: [discovery({ id: 'threshold', revealAt: 10 })],
      }),
    );
    const result = exploreCurrentLocation(map, createInitialNavigation(), definitions, createInitialExploration());

    expect(result.location.current.progress).toBe(10);
    expect(result.discoveries.map((item) => item.id)).toEqual(['threshold']);
  });

  it('revela todos os limiares atravessados em um salto de progresso', () => {
    const map = worldMap();
    const definitions = defs(
      map,
      definition({
        progressPerAction: 100,
        discoveries: [
          discovery({ id: 'first', revealAt: 10 }),
          discovery({ id: 'second', revealAt: 50 }),
          discovery({ id: 'third', revealAt: 90 }),
        ],
      }),
    );
    const result = exploreCurrentLocation(map, createInitialNavigation(), definitions, createInitialExploration());

    expect(result.progressGained).toBe(100);
    expect(result.discoveries.map((item) => item.id)).toEqual(['first', 'second', 'third']);
  });

  it('devolve descobertas em ordem determinística da definição', () => {
    const map = worldMap();
    const definitions = defs(
      map,
      definition({
        progressPerAction: 50,
        discoveries: [
          discovery({ id: 'c-late', revealAt: 40 }),
          discovery({ id: 'a-early', revealAt: 10 }),
          discovery({ id: 'b-mid', revealAt: 20 }),
        ],
      }),
    );
    const result = exploreCurrentLocation(map, createInitialNavigation(), definitions, createInitialExploration());

    expect(result.discoveries.map((item) => item.id)).toEqual(['c-late', 'a-early', 'b-mid']);
  });

  it('não registra a mesma descoberta duas vezes', () => {
    const map = worldMap();
    const definitions = defs(
      map,
      definition({
        progressPerAction: 20,
        discoveries: [discovery({ id: 'once-only', revealAt: 10 })],
      }),
    );
    const first = exploreCurrentLocation(map, createInitialNavigation(), definitions, createInitialExploration());
    const second = exploreCurrentLocation(map, createInitialNavigation(), definitions, first.current);

    expect(first.discoveries.map((item) => item.id)).toEqual(['once-only']);
    expect(second.discoveries).toEqual([]);
    expect(second.location.current.revealedDiscoveryIds).toEqual(['once-only']);
    expect(second.location.current.revealedDiscoveryIds.filter((id) => id === 'once-only')).toHaveLength(1);
  });

  it('mantém descoberta condicionada pendente sem revelar sua identidade', () => {
    const map = worldMap();
    const definitions = defs(
      map,
      definition({
        progressPerAction: 50,
        discoveries: [
          discovery({ id: 'visible', revealAt: 10 }),
          discovery({
            id: 'secret-gate',
            revealAt: 10,
            completionWeight: 4,
            conditions: [{ type: 'flag.is', flag: 'ready', value: true }],
          }),
        ],
      }),
    );
    const closed = createDiscoveryEvaluator(freshState());
    const result = exploreCurrentLocation(map, createInitialNavigation(), definitions, createInitialExploration(), closed);

    expect(result.discoveries.map((item) => item.id)).toEqual(['visible']);
    expect(result.location.current.revealedDiscoveryIds).not.toContain('secret-gate');
    expect(getRevealedDiscoveries(definitions, result.current, START).map((item) => item.id)).toEqual(['visible']);
    expect(JSON.stringify(result.discoveries)).not.toContain('secret-gate');
  });

  it('libera descoberta condicionada na reavaliação posterior', () => {
    const map = worldMap();
    const definitions = defs(
      map,
      definition({
        progressPerAction: 50,
        discoveries: [
          discovery({
            id: 'secret-gate',
            revealAt: 10,
            conditions: [{ type: 'flag.is', flag: 'ready', value: true }],
          }),
        ],
      }),
    );
    const closed = createDiscoveryEvaluator(freshState());
    const blocked = exploreCurrentLocation(map, createInitialNavigation(), definitions, createInitialExploration(), closed);
    const open = createDiscoveryEvaluator({ ...freshState(), flags: { ready: true } });
    const released = reevaluateDiscoveries(map, createInitialNavigation(), definitions, blocked.current, open);

    expect(blocked.discoveries).toEqual([]);
    expect(released.discoveries.map((item) => item.id)).toEqual(['secret-gate']);
    expect(released.location.current.progress).toBe(50);
    expect(released.location.current.explorationCount).toBe(1);
  });

  it('não consome tempo ao reavaliar descobertas', () => {
    const map = worldMap();
    const definitions = defs(
      map,
      definition({
        progressPerAction: 50,
        timeCost: { periods: 3 },
        discoveries: [
          discovery({
            id: 'secret-gate',
            revealAt: 10,
            conditions: [{ type: 'flag.is', flag: 'ready', value: true }],
          }),
        ],
      }),
    );
    const time = createInitialTime();
    const snapshot = structuredClone(time);
    const blocked = exploreCurrentLocation(
      map,
      createInitialNavigation(),
      definitions,
      createInitialExploration(),
      createDiscoveryEvaluator(freshState()),
    );
    const released = reevaluateDiscoveries(
      map,
      createInitialNavigation(),
      definitions,
      blocked.current,
      { ...freshState(), flags: { ready: true } },
    );

    expect(time).toEqual(snapshot);
    expect(blocked.timeCost).toEqual({ periods: 3 });
    expect(released.timeCost).toEqual({ periods: 0 });
    expect(released.progressGained).toBe(0);
  });

  it('não gera progresso infinito com o local em 100%', () => {
    const map = worldMap();
    const definitions = defs(map, definition({ progressPerAction: 100, discoveries: [discovery({ id: 'done' })] }));
    const complete = exploreCurrentLocation(map, createInitialNavigation(), definitions, createInitialExploration());
    const again = exploreCurrentLocation(map, createInitialNavigation(), definitions, complete.current);

    expect(complete.location.current.progress).toBe(100);
    expect(again.progressGained).toBe(0);
    expect(again.location.current.progress).toBe(100);
    expect(again.discoveries).toEqual([]);
  });

  it('não incrementa a contagem nem cobra tempo sem ação em 100%', () => {
    const map = worldMap();
    const definitions = defs(
      map,
      definition({
        progressPerAction: 100,
        timeCost: { periods: 2 },
        discoveries: [
          discovery({ id: 'done' }),
          discovery({
            id: 'later-flag',
            revealAt: 10,
            conditions: [{ type: 'flag.is', flag: 'ready', value: true }],
          }),
        ],
      }),
    );
    const complete = exploreCurrentLocation(
      map,
      createInitialNavigation(),
      definitions,
      createInitialExploration(),
      createDiscoveryEvaluator(freshState()),
    );
    const idle = exploreCurrentLocation(map, createInitialNavigation(), definitions, complete.current, {
      ...freshState(),
      flags: { ready: true },
    });
    const released = reevaluateDiscoveries(map, createInitialNavigation(), definitions, idle.current, {
      ...freshState(),
      flags: { ready: true },
    });

    expect(complete.location.current.explorationCount).toBe(1);
    expect(idle.location.current.explorationCount).toBe(1);
    expect(idle.timeCost).toEqual({ periods: 0 });
    expect(idle.discoveries).toEqual([]);
    expect(released.discoveries.map((item) => item.id)).toEqual(['later-flag']);
    expect(released.location.current.explorationCount).toBe(1);
    expect(released.timeCost).toEqual({ periods: 0 });
  });

  it('mantém a caverna invisível antes do limiar', () => {
    const map = worldMap();
    const definitions = worldDefinitions(map);
    const inWoods = moveToDenseWoods(map, createInitialNavigation());
    const first = exploreCurrentLocation(map, inWoods, definitions, createInitialExploration());

    expect(first.location.current.progress).toBe(10);
    expect(first.discoveries.map((item) => item.id)).not.toContain('hidden-cave');
    expect(destinationIds(map, first.navigation.current)).not.toContain('hidden-cave');
    expect(first.navigation.current.discoveredLocationIds).not.toContain('hidden-cave');
  });

  it('descobre a caverna depois do limiar', () => {
    const map = worldMap();
    const definitions = worldDefinitions(map);
    const inWoods = moveToDenseWoods(map, createInitialNavigation());
    let exploration = createInitialExploration();
    let navigation = inWoods;
    let result = exploreCurrentLocation(map, navigation, definitions, exploration);

    for (let step = 0; step < 8; step += 1) {
      exploration = result.current;
      navigation = result.navigation.current;
      result = exploreCurrentLocation(map, navigation, definitions, exploration);
    }

    expect(result.location.current.progress).toBe(90);
    expect(result.discoveries.map((item) => item.id)).toContain('hidden-cave');
    expect(result.navigation.current.discoveredLocationIds).toContain('hidden-cave');
  });

  it('desbloqueia a caverna conforme unlockTarget', () => {
    const map = worldMap();
    const inWoods = moveToDenseWoods(map, createInitialNavigation());
    const jump = defs(map, {
      ...INITIAL_EXPLORATION_DEFINITIONS.find((entry) => entry.locationId === 'dense-woods')!,
      progressPerAction: 90,
    });
    const result = exploreCurrentLocation(map, inWoods, jump, createInitialExploration());

    expect(result.navigation.current.unlockedLocationIds).toContain('hidden-cave');
    expect(destinationIds(map, result.navigation.current)).toContain('hidden-cave');
    expect(listVisibleDestinations(map, result.navigation.current).find((item) => item.location.id === 'hidden-cave')).toMatchObject({
      relation: 'child',
      accessible: true,
    });
  });

  it('não move o jogador para a caverna ao descobri-la', () => {
    const map = worldMap();
    const inWoods = moveToDenseWoods(map, createInitialNavigation());
    const jump = defs(map, {
      ...INITIAL_EXPLORATION_DEFINITIONS.find((entry) => entry.locationId === 'dense-woods')!,
      progressPerAction: 90,
    });
    const result = exploreCurrentLocation(map, inWoods, jump, createInitialExploration());

    expect(result.navigation.current.currentLocationId).toBe('dense-woods');
    expect(result.navigation.previous.currentLocationId).toBe('dense-woods');
  });

  it('não marca a caverna como visitada ao descobri-la', () => {
    const map = worldMap();
    const inWoods = moveToDenseWoods(map, createInitialNavigation());
    const jump = defs(map, {
      ...INITIAL_EXPLORATION_DEFINITIONS.find((entry) => entry.locationId === 'dense-woods')!,
      progressPerAction: 90,
    });
    const result = exploreCurrentLocation(map, inWoods, jump, createInitialExploration());

    expect(result.navigation.current.visitedLocationIds).not.toContain('hidden-cave');
    expect(moveToLocation(map, result.navigation.current, 'hidden-cave').current.currentLocationId).toBe('hidden-cave');
  });

  it('não altera o inventário ao revelar um item', () => {
    const map = worldMap();
    const definitions = worldDefinitions(map);
    const game = {
      ...freshState(),
      inventory: addItem(freshState().inventory, 'agua-limpa', 1),
    };
    const inventorySnapshot = structuredClone(game.inventory);
    const result = exploreCurrentLocation(
      map,
      createInitialNavigation(),
      defs(map, definition({ progressPerAction: 50, discoveries: [discovery({ id: 'torn-cloth', kind: 'item', revealAt: 50 })] })),
      createInitialExploration(),
    );

    expect(result.discoveries).toEqual([
      expect.objectContaining({ id: 'torn-cloth', kind: 'item' }),
    ]);
    expect(game.inventory).toEqual(inventorySnapshot);
    expect(itemQuantity(game.inventory, 'torn-cloth')).toBe(0);
    expect(itemQuantity(game.inventory, 'agua-limpa')).toBe(1);
    expect(definitions.byDiscovery.get('torn-cloth')?.kind).toBe('item');
  });

  it('não executa coleta ao revelar um ponto de recurso', () => {
    const map = worldMap();
    const game = freshState();
    const snapshot = structuredClone(game);
    const result = exploreCurrentLocation(
      map,
      createInitialNavigation(),
      defs(
        map,
        definition({
          progressPerAction: 25,
          discoveries: [discovery({ id: 'fallen-sticks', kind: 'resourceNode', revealAt: 25 })],
        }),
      ),
      createInitialExploration(),
    );

    expect(result.discoveries).toEqual([
      expect.objectContaining({ id: 'fallen-sticks', kind: 'resourceNode' }),
    ]);
    expect(game).toEqual(snapshot);
    expect(game.inventory).toEqual([]);
    expect('collected' in result).toBe(false);
  });

  it('não cria encontro ao revelar habitat de criatura', () => {
    const map = worldMap();
    const game = freshState();
    const snapshot = structuredClone(game);
    const inWoods = moveToDenseWoods(map, createInitialNavigation());
    const result = exploreCurrentLocation(
      map,
      inWoods,
      defs(
        map,
        definition({
          locationId: 'dense-woods',
          progressPerAction: 40,
          discoveries: [discovery({ id: 'horned-rabbit-tracks', kind: 'creatureHabitat', revealAt: 40 })],
        }),
      ),
      createInitialExploration(),
    );

    expect(result.discoveries).toEqual([
      expect.objectContaining({ id: 'horned-rabbit-tracks', kind: 'creatureHabitat' }),
    ]);
    expect(game).toEqual(snapshot);
    expect('encounter' in result).toBe(false);
    expect(result.navigation.current.currentLocationId).toBe('dense-woods');
  });

  it('devolve o custo de tempo sem chamar o relógio', () => {
    const map = worldMap();
    const definitions = worldDefinitions(map);
    const time = createInitialTime();
    const snapshot = structuredClone(time);
    const result = exploreCurrentLocation(map, createInitialNavigation(), definitions, createInitialExploration());

    expect(time).toEqual(snapshot);
    expect(result.timeCost).toEqual({ periods: 1 });
  });

  it('rejeita definição inválida', () => {
    const map = worldMap();

    expect(inspectExplorationDefinitions(null, map).ok).toBe(false);
    expect(inspectExplorationDefinitions([definition({ locationId: 'missing' })], map)).toMatchObject({
      ok: false,
      reason: 'A localização não existe.',
    });
    expect(
      inspectExplorationDefinitions([definition(), definition({ discoveries: [discovery({ id: 'dup' })] })], map),
    ).toMatchObject({
      ok: false,
      reason: 'A definição de exploração para a localização está duplicada.',
    });
    expect(inspectExplorationDefinitions([definition({ discoveries: [discovery({ id: '' })] })], map)).toMatchObject({
      ok: false,
      reason: 'A descoberta possui identificador vazio.',
    });
    expect(
      inspectExplorationDefinitions(
        [
          definition({ discoveries: [discovery({ id: 'same' })] }),
          {
            locationId: 'great-tree',
            progressPerAction: 10,
            timeCost: { periods: 1 },
            discoveries: [discovery({ id: 'same' })],
          },
        ],
        map,
      ),
    ).toMatchObject({
      ok: false,
      reason: 'As definições possuem identificadores de descoberta duplicados.',
    });
    expect(
      inspectExplorationDefinitions(
        [definition({ discoveries: [{ ...discovery({ id: 'bad-kind' }), kind: 'treasure' as DiscoveryDefinition['kind'] }] })],
        map,
      ),
    ).toMatchObject({
      ok: false,
      reason: 'O tipo de descoberta é desconhecido.',
    });
    expect(
      inspectExplorationDefinitions([definition({ discoveries: [discovery({ id: 'late', revealAt: 101 })] })], map),
    ).toMatchObject({
      ok: false,
      reason: 'O limiar de revelação precisa ser um inteiro entre 0 e 100.',
    });
    expect(
      inspectExplorationDefinitions([definition({ discoveries: [discovery({ id: 'weight', completionWeight: 0 })] })], map),
    ).toMatchObject({
      ok: false,
      reason: 'O peso de conclusão precisa ser um inteiro positivo.',
    });
    expect(inspectExplorationDefinitions([definition({ progressPerAction: 1.5 })], map)).toMatchObject({
      ok: false,
      reason: 'O ganho de progresso precisa ser um inteiro positivo.',
    });
    expect(inspectExplorationDefinitions([definition({ timeCost: { periods: -1 } })], map).ok).toBe(false);
    expect(
      inspectExplorationDefinitions([definition({ timeCost: { periods: MAX_ADVANCE_PERIODS + 1 } })], map).ok,
    ).toBe(false);
    expect(
      inspectExplorationDefinitions(
        [definition({ discoveries: [discovery({ id: 'bad-cond', conditions: [{ type: 'unknown.flag' } as unknown as GameCondition] })] })],
        map,
      ),
    ).toMatchObject({
      ok: false,
      reason: 'A descoberta possui condições malformadas.',
    });
    expect(
      inspectExplorationDefinitions(
        [definition({ discoveries: [discovery({ id: 'cave', kind: 'subarea', revealAt: 90 })] })],
        map,
      ),
    ).toMatchObject({
      ok: false,
      reason: 'A subárea ou passagem precisa de um destino.',
    });
    expect(
      inspectExplorationDefinitions(
        [definition({ discoveries: [discovery({ id: 'cave', kind: 'subarea', targetId: 'missing', revealAt: 90 })] })],
        map,
      ),
    ).toMatchObject({
      ok: false,
      reason: 'O destino da subárea não existe.',
    });
    expect(
      inspectExplorationDefinitions(
        [definition({ discoveries: [discovery({ id: 'loop', kind: 'passage', targetId: START })] })],
        map,
      ),
    ).toMatchObject({
      ok: false,
      reason: 'O destino da descoberta não pode ser o próprio local.',
    });
    expect(
      inspectExplorationDefinitions(
        [
          definition({
            discoveries: [
              {
                ...discovery({ id: 'unlock', kind: 'subarea', targetId: 'hidden-cave' }),
                unlockTarget: 'yes' as unknown as boolean,
              },
            ],
          }),
        ],
        map,
      ),
    ).toMatchObject({
      ok: false,
      reason: 'O desbloqueio do destino é inválido.',
    });
    expect(
      inspectExplorationDefinitions(
        [definition({ discoveries: [{ ...discovery({ id: 'repeatable' }), once: false as unknown as true }] })],
        map,
      ),
    ).toMatchObject({
      ok: false,
      reason: 'A descoberta precisa ser única (once: true).',
    });
    expect(() => indexExplorationDefinitions([definition({ locationId: 'missing' })], map)).toThrow(ExplorationError);
    expect(
      inspectExplorationDefinitions(
        [
          definition({
            discoveries: [
              discovery({ id: 'huge-a', completionWeight: Number.MAX_SAFE_INTEGER }),
              discovery({ id: 'huge-b', completionWeight: 1 }),
            ],
          }),
        ],
        map,
      ),
    ).toMatchObject({
      ok: false,
      reason: 'A soma dos pesos de conclusão ultrapassa o inteiro seguro.',
    });
    expect(
      inspectExplorationDefinitions(
        [definition({ discoveries: [discovery({ id: 'max-safe', completionWeight: Number.MAX_SAFE_INTEGER })] })],
        map,
      ).ok,
    ).toBe(true);
    expect(() =>
      indexExplorationDefinitions(
        [
          {
            locationId: START,
            progressPerAction: 10,
            timeCost: { periods: 1 },
            discoveries: [discovery({ id: 'overflow-a', completionWeight: Number.MAX_SAFE_INTEGER })],
          },
          {
            locationId: 'great-tree',
            progressPerAction: 10,
            timeCost: { periods: 1 },
            discoveries: [discovery({ id: 'overflow-b', completionWeight: 1 })],
          },
        ],
        map,
      ),
    ).toThrow(ExplorationError);
  });

  it('rejeita estado inválido', () => {
    const map = worldMap();
    const definitions = worldDefinitions(map);

    expect(inspectExplorationState(null, definitions, map).ok).toBe(false);
    expect(
      inspectExplorationState(
        {
          locations: [
            { locationId: START, progress: 10, revealedDiscoveryIds: [], explorationCount: 1 },
            { locationId: START, progress: 20, revealedDiscoveryIds: [], explorationCount: 2 },
          ],
        },
        definitions,
        map,
      ),
    ).toMatchObject({
      ok: false,
      reason: 'O estado de exploração possui localização duplicada.',
    });
    expect(
      inspectExplorationState(
        { locations: [{ locationId: START, progress: 101, revealedDiscoveryIds: [], explorationCount: 1 }] },
        definitions,
        map,
      ),
    ).toMatchObject({
      ok: false,
      reason: 'O progresso de exploração é inválido.',
    });
    expect(
      inspectExplorationState(
        { locations: [{ locationId: START, progress: 10, revealedDiscoveryIds: [], explorationCount: -1 }] },
        definitions,
        map,
      ),
    ).toMatchObject({
      ok: false,
      reason: 'A contagem de exploração é inválida.',
    });
    expect(
      inspectExplorationState(
        {
          locations: [{ locationId: START, progress: 10, revealedDiscoveryIds: ['missing-discovery'], explorationCount: 1 }],
        },
        definitions,
        map,
      ),
    ).toMatchObject({
      ok: false,
      reason: 'O estado de exploração possui descoberta inexistente.',
    });
    expect(
      inspectExplorationState(
        {
          locations: [{ locationId: START, progress: 10, revealedDiscoveryIds: ['great-tree-trunk'], explorationCount: 1 }],
        },
        definitions,
        map,
      ),
    ).toMatchObject({
      ok: false,
      reason: 'A descoberta foi registrada no local errado.',
    });
    expect(
      inspectExplorationState(
        {
          locations: [
            {
              locationId: START,
              progress: 10,
              revealedDiscoveryIds: ['awakening-site', 'awakening-site'],
              explorationCount: 1,
            },
          ],
        },
        definitions,
        map,
      ),
    ).toMatchObject({
      ok: false,
      reason: 'O estado de exploração possui descobertas duplicadas.',
    });
    expect(
      inspectExplorationState(
        { locations: [{ locationId: 'new-world', progress: 0, revealedDiscoveryIds: [], explorationCount: 0 }] },
        definitions,
        map,
      ),
    ).toMatchObject({
      ok: false,
      reason: 'A localização da exploração não existe nas definições.',
    });
    expect(() =>
      exploreCurrentLocation(map, createInitialNavigation(), definitions, {
        locations: [{ locationId: START, progress: 10.5, revealedDiscoveryIds: [], explorationCount: 1 }],
      }),
    ).toThrow(ExplorationError);
  });

  it('rejeita descoberta persistida abaixo do limiar e aceita no limiar ou acima', () => {
    const map = worldMap();
    const definitions = worldDefinitions(map);

    const woods = (progress: number, revealedDiscoveryIds: string[]) => ({
      locations: [
        {
          locationId: 'dense-woods',
          progress,
          revealedDiscoveryIds,
          explorationCount: 1,
        },
      ],
    });

    expect(inspectExplorationState(woods(0, ['hidden-cave']), definitions, map)).toMatchObject({
      ok: false,
      reason: 'A descoberta foi registrada antes do limiar de revelação.',
    });
    expect(inspectExplorationState(woods(89, ['hidden-cave']), definitions, map)).toMatchObject({
      ok: false,
      reason: 'A descoberta foi registrada antes do limiar de revelação.',
    });
    expect(inspectExplorationState(woods(90, ['hidden-cave']), definitions, map).ok).toBe(true);
    expect(inspectExplorationState(woods(100, ['hidden-cave']), definitions, map).ok).toBe(true);
    expect(
      inspectExplorationState(
        {
          locations: [
            {
              locationId: START,
              progress: 10,
              revealedDiscoveryIds: ['awakening-site'],
              explorationCount: 1,
            },
          ],
        },
        definitions,
        map,
      ).ok,
    ).toBe(true);
    expect(
      inspectExplorationState(woods(90, ['hidden-cave', 'great-tree-trunk']), definitions, map),
    ).toMatchObject({
      ok: false,
      reason: 'A descoberta foi registrada no local errado.',
    });
    expect(
      inspectExplorationState(woods(90, ['hidden-cave', 'hidden-cave']), definitions, map),
    ).toMatchObject({
      ok: false,
      reason: 'O estado de exploração possui descobertas duplicadas.',
    });
  });

  it('preserva o estado no roundtrip JSON e rejeita restauração inválida', () => {
    const map = worldMap();
    const definitions = worldDefinitions(map);
    const first = exploreCurrentLocation(map, createInitialNavigation(), definitions, createInitialExploration());
    const second = exploreCurrentLocation(map, createInitialNavigation(), definitions, first.current);
    const serialized = JSON.stringify(second.current);
    const restored = JSON.parse(serialized) as ExplorationState;
    const inspected = inspectExplorationState(restored, definitions, map);

    expect(serialized).toEqual(JSON.stringify(JSON.parse(serialized)));
    expect(inspected.ok).toBe(true);
    if (inspected.ok) {
      expect(inspected.value).toEqual(second.current);
      expect(inspected.value.locations[0]?.progress).toBe(20);
      expect(inspected.value.locations[0]?.revealedDiscoveryIds).toEqual([
        'awakening-site',
        'first-priority-event',
        'path-great-tree',
      ]);
      expect(inspected.value.locations[0]?.explorationCount).toBe(2);
    }

    expect(
      inspectExplorationState(JSON.parse(JSON.stringify({ locations: [{ ...second.current.locations[0], locationId: 'missing' }] })), definitions, map)
        .ok,
    ).toBe(false);
    expect(
      inspectExplorationState(
        JSON.parse(
          JSON.stringify({
            locations: [
              {
                ...second.current.locations[0],
                revealedDiscoveryIds: [...second.current.locations[0].revealedDiscoveryIds, 'awakening-site'],
              },
            ],
          }),
        ),
        definitions,
        map,
      ).ok,
    ).toBe(false);
    expect(
      inspectExplorationState(
        JSON.parse(JSON.stringify({ locations: [{ ...second.current.locations[0], progress: 101 }] })),
        definitions,
        map,
      ).ok,
    ).toBe(false);
    expect(
      inspectExplorationState(
        JSON.parse(JSON.stringify({ locations: [{ ...second.current.locations[0], explorationCount: 1.2 }] })),
        definitions,
        map,
      ).ok,
    ).toBe(false);
  });

  it('calcula a conclusão da zona com descendentes', () => {
    const map = worldMap();
    const definitions = worldDefinitions(map);
    const start = exploreCurrentLocation(map, createInitialNavigation(), definitions, createInitialExploration());
    const forest = calculateZoneCompletion(map, definitions, start.current, 'horned-rabbit-forest');
    const clearing = calculateZoneCompletion(map, definitions, start.current, START);

    expect(forest.zoneId).toBe('horned-rabbit-forest');
    expect(forest.totalPoints).toBe(15);
    expect(forest.completedPoints).toBe(2);
    expect(clearing.totalPoints).toBe(7);
    expect(clearing.completedPoints).toBe(2);
    expect(forest).not.toHaveProperty('discoveryIds');
  });

  it('considera os pesos na conclusão da zona', () => {
    const map = worldMap();
    const definitions = defs(
      map,
      definition({
        discoveries: [
          discovery({ id: 'light', completionWeight: 1, revealAt: 10 }),
          discovery({ id: 'heavy', completionWeight: 3, revealAt: 20 }),
        ],
      }),
    );
    const first = exploreCurrentLocation(map, createInitialNavigation(), definitions, createInitialExploration());

    expect(calculateZoneCompletion(map, definitions, first.current, START)).toEqual({
      zoneId: START,
      completedPoints: 1,
      totalPoints: 4,
      percentage: 25,
    });
  });

  it('inclui conteúdo secreto no total desde o início', () => {
    const map = worldMap();
    const definitions = worldDefinitions(map);
    const empty = calculateZoneCompletion(map, definitions, createInitialExploration(), 'dense-woods');
    const forest = calculateZoneCompletion(map, definitions, createInitialExploration(), 'horned-rabbit-forest');

    expect(empty).toEqual({
      zoneId: 'dense-woods',
      completedPoints: 0,
      totalPoints: 4,
      percentage: 0,
    });
    expect(forest.totalPoints).toBe(15);
    expect(JSON.stringify(empty)).not.toContain('hidden-cave');
    expect(empty).not.toHaveProperty('revealedDiscoveryIds');
  });

  it('não deixa o progresso local sobrescrever a conclusão agregada', () => {
    const map = worldMap();
    const definitions = defs(
      map,
      definition({
        progressPerAction: 100,
        discoveries: [
          discovery({ id: 'visible', revealAt: 10, completionWeight: 1 }),
          discovery({
            id: 'secret-gate',
            revealAt: 10,
            completionWeight: 1,
            conditions: [{ type: 'flag.is', flag: 'ready', value: true }],
          }),
        ],
      }),
      {
        locationId: 'great-tree',
        progressPerAction: 10,
        timeCost: { periods: 1 },
        discoveries: [discovery({ id: 'tree-mark', revealAt: 10, completionWeight: 2 })],
      },
    );
    const complete = exploreCurrentLocation(
      map,
      createInitialNavigation(),
      definitions,
      createInitialExploration(),
      createDiscoveryEvaluator(freshState()),
    );
    const local = getLocationExploration(complete.current, START);
    const zone = calculateZoneCompletion(map, definitions, complete.current, START);
    const forest = calculateZoneCompletion(map, definitions, complete.current, 'horned-rabbit-forest');

    expect(local.progress).toBe(100);
    expect(zone).toEqual({
      zoneId: START,
      completedPoints: 1,
      totalPoints: 2,
      percentage: 50,
    });
    expect(forest.percentage).toBe(25);
    expect(forest.completedPoints).toBe(1);
    expect(forest.totalPoints).toBe(4);
  });

  it('considera zona sem pontos como 100% concluída', () => {
    const map = worldMap();
    const definitions = defs(map, definition({ discoveries: [] }));

    expect(calculateZoneCompletion(map, definitions, createInitialExploration(), 'hidden-cave')).toEqual({
      zoneId: 'hidden-cave',
      completedPoints: 0,
      totalPoints: 0,
      percentage: 100,
    });
    expect(calculateZoneCompletion(map, definitions, createInitialExploration(), START)).toEqual({
      zoneId: START,
      completedPoints: 0,
      totalPoints: 0,
      percentage: 100,
    });
  });

  it('indexa definições iniciais e aplica efeitos de subárea pela API pública', () => {
    const map = worldMap();
    const indexed = inspectExplorationDefinitions(INITIAL_EXPLORATION_DEFINITIONS, map);
    const navigation = moveToDenseWoods(map, createInitialNavigation());
    const cave = INITIAL_EXPLORATION_DEFINITIONS.flatMap((entry) => entry.discoveries).find((item) => item.id === 'hidden-cave');

    expect(indexed.ok).toBe(true);
    if (indexed.ok) {
      expect(indexed.value.byLocation.get('dense-woods')?.discoveries.map((item) => item.id)).toContain('hidden-cave');
      expect(indexed.value.byDiscovery.get('hidden-cave')?.kind).toBe('subarea');
      expect(indexed.value.locationByDiscovery.get('awakening-site')).toBe(START);
    }

    expect(cave).toMatchObject({ targetId: 'hidden-cave', unlockTarget: true, revealAt: 90 });
    const applied = applyDiscoveryNavigationEffects(map, navigation, cave ? [cave] : []);
    expect(applied.currentLocationId).toBe('dense-woods');
    expect(applied.discoveredLocationIds).toContain('hidden-cave');
    expect(applied.unlockedLocationIds).toContain('hidden-cave');
    expect(applied.visitedLocationIds).not.toContain('hidden-cave');
    expect(() =>
      exploreCurrentLocation(map, createInitialNavigation(), worldDefinitions(map), createInitialExploration(), (conditions) =>
        evaluateConditions(conditions ? [...conditions] : undefined, freshState()),
      ),
    ).not.toThrow();
  });

  it('não deixa o avaliador mutar as condições indexadas', () => {
    const map = worldMap();
    const definitions = defs(
      map,
      definition({
        progressPerAction: 50,
        discoveries: [
          discovery({
            id: 'gated',
            revealAt: 10,
            conditions: [
              { type: 'flag.is', flag: 'ready', value: true },
              { type: 'attribute.min', attribute: 'cautela', amount: 1 },
              { type: 'inventory.has', itemId: 'chave', quantity: 1 },
              { type: 'relationship.min', characterId: 'mira-vale', amount: 0 },
            ],
          }),
        ],
      }),
    );
    const indexedConditions = definitions.byLocation.get(START)?.discoveries[0]?.conditions;
    const snapshot = structuredClone(indexedConditions);
    const adversarial: DiscoveryConditionEvaluator = (conditions) => {
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

    const blocked = exploreCurrentLocation(
      map,
      createInitialNavigation(),
      definitions,
      createInitialExploration(),
      adversarial,
    );
    const open = createDiscoveryEvaluator({
      ...freshState(),
      flags: { ready: true },
      inventory: [{ itemId: 'chave', quantity: 1 }],
    });
    const released = reevaluateDiscoveries(map, createInitialNavigation(), definitions, blocked.current, open);

    expect(indexedConditions).toEqual(snapshot);
    expect(definitions.byLocation.get(START)?.discoveries[0]?.conditions).toEqual([
      { type: 'flag.is', flag: 'ready', value: true },
      { type: 'attribute.min', attribute: 'cautela', amount: 1 },
      { type: 'inventory.has', itemId: 'chave', quantity: 1 },
      { type: 'relationship.min', characterId: 'mira-vale', amount: 0 },
    ]);
    expect(blocked.discoveries).toEqual([]);
    expect(released.discoveries.map((item) => item.id)).toEqual(['gated']);
  });
});
