import { describe, expect, it } from 'vitest';
import { firstDayCampaign } from '../campaigns/first-day';
import { applyChoice, bindSavedState, startGame } from '../core/engine';
import {
  createInitialState,
  inspectGameState,
  SCHEMA_VERSION,
  type GameState,
} from '../core/state';
import {
  createMemoryPersistence,
  createPersistence,
  parseGameState,
  serializeGameState,
} from '../infrastructure/persistence';
import { indexCraftingDefinitions, type RecipeDefinition, type StructureDefinition } from '../modules/crafting';
import { indexExplorationDefinitions, type LocationExplorationDefinition } from '../modules/exploration';
import { DEFAULT_STARTING_LOCATION_ID, indexNavigationMap, type LocationNode } from '../modules/navigation';
import {
  indexResourceDefinitions,
  type PopulationDefinition,
  type ResourceNodeDefinition,
} from '../modules/resources';
import {
  createSandboxContext,
  inspectSandboxContext,
  type SandboxContext,
} from '../modules/sandbox';
import {
  executeSandboxAction,
  SandboxActionError,
  type SandboxAction,
} from '../modules/sandbox-actions';
import { freshState, now } from './helpers';

const CAMP = 'test-camp';
const REGION = 'test-region';
const HIDEOUT = 'test-hideout';
const TRAIL = 'test-trail';
const MARATHON = 'test-marathon';
const START = DEFAULT_STARTING_LOCATION_ID;
const STAMP = '2026-09-01T12:00:00.000Z';

const CUSTOM_MAP: LocationNode = {
  id: REGION,
  name: 'Região de teste',
  travelCost: { periods: 1 },
  children: [
    {
      id: CAMP,
      name: 'Acampamento de teste',
      children: [
        {
          id: HIDEOUT,
          name: 'Esconderijo de teste',
          visibility: 'hidden',
          travelCost: { periods: 1 },
        },
      ],
    },
    {
      id: TRAIL,
      name: 'Trilha longa',
      travelCost: { periods: 5 },
    },
    {
      id: MARATHON,
      name: 'Marcha de dois dias',
      travelCost: { periods: 12 },
    },
  ],
};

const CUSTOM_EXPLORATION: LocationExplorationDefinition[] = [
  {
    locationId: CAMP,
    progressPerAction: 10,
    timeCost: { periods: 1 },
    discoveries: [
      {
        id: 'camp-mark',
        kind: 'landmark',
        revealAt: 10,
        completionWeight: 1,
        once: true,
      },
      {
        id: 'short-find',
        kind: 'resourceNode',
        revealAt: 10,
        completionWeight: 1,
        once: true,
      },
      {
        id: 'long-find',
        kind: 'resourceNode',
        revealAt: 10,
        completionWeight: 1,
        once: true,
      },
      {
        id: 'none-find',
        kind: 'resourceNode',
        revealAt: 10,
        completionWeight: 1,
        once: true,
      },
      {
        id: 'pop-find',
        kind: 'creatureHabitat',
        revealAt: 10,
        completionWeight: 1,
        once: true,
      },
      {
        id: HIDEOUT,
        kind: 'subarea',
        revealAt: 10,
        completionWeight: 1,
        targetId: HIDEOUT,
        unlockTarget: true,
        once: true,
      },
      {
        id: 'secret-cache',
        kind: 'landmark',
        revealAt: 10,
        completionWeight: 1,
        conditions: [{ type: 'flag.is', flag: 'ready', value: true }],
        once: true,
      },
    ],
  },
  {
    locationId: REGION,
    progressPerAction: 10,
    timeCost: { periods: 1 },
    discoveries: [],
  },
];

const CUSTOM_NODES: ResourceNodeDefinition[] = [
  {
    id: 'short-node',
    discoveryId: 'short-find',
    locationId: CAMP,
    name: 'Folhas curtas',
    capacity: 2,
    collectionCost: { periods: 1 },
    renewal: { type: 'short', periods: 2 },
    yields: [{ itemId: 'test-leaf', quantityPerUnit: 1 }],
  },
  {
    id: 'long-node',
    discoveryId: 'long-find',
    locationId: CAMP,
    name: 'Raiz longa',
    capacity: 1,
    collectionCost: { periods: 1 },
    renewal: { type: 'long', days: 1 },
    yields: [{ itemId: 'test-root', quantityPerUnit: 1 }],
  },
  {
    id: 'none-node',
    discoveryId: 'none-find',
    locationId: CAMP,
    name: 'Pedra única',
    capacity: 2,
    collectionCost: { periods: 1 },
    renewal: { type: 'none' },
    yields: [{ itemId: 'test-stone', quantityPerUnit: 1 }],
  },
  {
    id: 'pop-node',
    discoveryId: 'pop-find',
    locationId: CAMP,
    name: 'Manada de teste',
    capacity: 8,
    collectionCost: { periods: 1 },
    renewal: { type: 'population', populationId: 'test-herd' },
    yields: [{ itemId: 'test-hide', quantityPerUnit: 1 }],
  },
];

const CUSTOM_POPULATIONS: PopulationDefinition[] = [
  {
    id: 'test-herd',
    speciesId: 'test-beast',
    carryingCapacity: 8,
    recoveryPerDay: 2,
    warningThreshold: 4,
    criticalThreshold: 2,
  },
];

const CUSTOM_STRUCTURES: StructureDefinition[] = [
  {
    id: 'test-fire',
    name: 'Fogueira de teste',
    tags: ['heat'],
    uniquePerLocation: true,
    activeByDefault: true,
  },
];

const CUSTOM_RECIPES: RecipeDefinition[] = [
  {
    id: 'craft-test-cord',
    name: 'Corda de teste',
    kind: 'item',
    inputs: [{ itemId: 'test-leaf', quantity: 1 }],
    outputs: [{ itemId: 'test-cord', quantity: 1 }],
    timeCost: { periods: 1 },
    discovery: { type: 'known' },
  },
  {
    id: 'build-test-fire',
    name: 'Construir fogueira de teste',
    kind: 'structure',
    inputs: [{ itemId: 'test-leaf', quantity: 1 }],
    createsStructureId: 'test-fire',
    timeCost: { periods: 1 },
    discovery: { type: 'known' },
  },
  {
    id: 'flag-weave',
    name: 'Trança secreta',
    kind: 'item',
    inputs: [{ itemId: 'test-cord', quantity: 1 }],
    outputs: [{ itemId: 'test-rope', quantity: 1 }],
    timeCost: { periods: 1 },
    discovery: { type: 'flag', flag: 'recipe.ready' },
  },
];

function customContext(): SandboxContext {
  const map = indexNavigationMap(CUSTOM_MAP, CAMP);
  const exploration = indexExplorationDefinitions(CUSTOM_EXPLORATION, map);
  const resources = indexResourceDefinitions(CUSTOM_NODES, CUSTOM_POPULATIONS, map, exploration);
  const crafting = indexCraftingDefinitions(CUSTOM_RECIPES, CUSTOM_STRUCTURES);
  return {
    startingLocationId: CAMP,
    map,
    exploration,
    resources,
    crafting,
  };
}

function playing(context: SandboxContext = customContext(), clock = () => STAMP): GameState {
  return createInitialState({ firstName: 'Lia', lastName: 'Nunes' }, 'awakening', clock, context);
}

function inspectOrThrow(state: GameState, context?: SandboxContext): GameState {
  const inspected = inspectGameState(state, context);
  expect(inspected.ok).toBe(true);
  if (!inspected.ok) {
    throw new Error(inspected.reason);
  }

  return inspected.state;
}

function withState(state: GameState, patch: Partial<GameState>, context?: SandboxContext): GameState {
  return inspectOrThrow({ ...state, ...patch }, context);
}

function withSandbox(state: GameState, sandbox: Partial<GameState['sandbox']>, context?: SandboxContext): GameState {
  return inspectOrThrow(
    {
      ...state,
      sandbox: {
        ...state.sandbox,
        ...sandbox,
      },
    },
    context,
  );
}

function discoverAroundCamp(state: GameState, context?: SandboxContext): GameState {
  return withSandbox(
    state,
    {
      navigation: {
        ...state.sandbox.navigation,
        discoveredLocationIds: [CAMP, REGION, TRAIL, MARATHON],
        unlockedLocationIds: [CAMP, REGION, TRAIL, MARATHON],
      },
    },
    context,
  );
}

function revealCampFinds(state: GameState, extra: string[] = [], context?: SandboxContext): GameState {
  return withSandbox(
    state,
    {
      exploration: {
        locations: [
          {
            locationId: CAMP,
            progress: 10,
            revealedDiscoveryIds: ['camp-mark', 'short-find', 'long-find', 'none-find', 'pop-find', HIDEOUT, ...extra],
            explorationCount: 1,
          },
        ],
      },
    },
    context,
  );
}

function completeCamp(state: GameState, revealed: string[], context?: SandboxContext): GameState {
  return withSandbox(
    state,
    {
      exploration: {
        locations: [
          {
            locationId: CAMP,
            progress: 100,
            revealedDiscoveryIds: revealed,
            explorationCount: 10,
          },
        ],
      },
    },
    context,
  );
}

function snapshot(state: GameState): GameState {
  return structuredClone(state);
}

function freezeAction<T extends SandboxAction>(action: T): T {
  return Object.freeze({ ...action }) as T;
}

function freezeState(state: GameState): GameState {
  return Object.freeze({
    ...state,
    character: Object.freeze({ ...state.character }),
    attributes: Object.freeze({ ...state.attributes }),
    inventory: Object.freeze(state.inventory.map((item) => Object.freeze({ ...item }))),
    relationships: Object.freeze(state.relationships.map((entry) => Object.freeze({ ...entry }))),
    flags: Object.freeze({ ...state.flags }),
    history: Object.freeze(state.history.map((entry) => Object.freeze({ ...entry }))),
    world: Object.freeze({ ...state.world }),
    progression: Object.freeze({
      abilityIds: Object.freeze([...state.progression.abilityIds]),
      titleIds: Object.freeze([...state.progression.titleIds]),
    }),
    sandbox: Object.freeze({
      navigation: Object.freeze({
        currentLocationId: state.sandbox.navigation.currentLocationId,
        discoveredLocationIds: Object.freeze([...state.sandbox.navigation.discoveredLocationIds]),
        unlockedLocationIds: Object.freeze([...state.sandbox.navigation.unlockedLocationIds]),
        visitedLocationIds: Object.freeze([...state.sandbox.navigation.visitedLocationIds]),
      }),
      exploration: Object.freeze({
        locations: Object.freeze(
          state.sandbox.exploration.locations.map((location) =>
            Object.freeze({
              ...location,
              revealedDiscoveryIds: Object.freeze([...location.revealedDiscoveryIds]),
            }),
          ),
        ),
      }),
      resources: Object.freeze({
        nodes: Object.freeze(state.sandbox.resources.nodes.map((node) => Object.freeze({ ...node }))),
        populations: Object.freeze(state.sandbox.resources.populations.map((entry) => Object.freeze({ ...entry }))),
      }),
      crafting: Object.freeze({
        knownRecipeIds: Object.freeze([...state.sandbox.crafting.knownRecipeIds]),
        structures: Object.freeze(state.sandbox.crafting.structures.map((entry) => Object.freeze({ ...entry }))),
      }),
    }),
  }) as GameState;
}

function node(state: GameState, nodeId: string) {
  const found = state.sandbox.resources.nodes.find((entry) => entry.nodeId === nodeId);
  expect(found).toBeDefined();
  return found!;
}

function population(state: GameState, populationId: string) {
  const found = state.sandbox.resources.populations.find((entry) => entry.populationId === populationId);
  expect(found).toBeDefined();
  return found!;
}

describe('orquestrador de ações do sandbox', () => {
  const context = customContext();

  describe('movimento', () => {
    it('altera a localização, visita o destino e aplica o custo uma vez', () => {
      const state = discoverAroundCamp(playing(context), context);
      const inventory = snapshot(state).inventory;
      const exploration = snapshot(state).sandbox.exploration;
      const crafting = snapshot(state).sandbox.crafting;
      const result = executeSandboxAction(state, { type: 'navigation.move', locationId: REGION }, { context, now: () => STAMP });

      expect(result.current.sandbox.navigation.currentLocationId).toBe(REGION);
      expect(result.current.sandbox.navigation.visitedLocationIds).toContain(REGION);
      expect(result.current.world).toEqual({ day: 1, period: 'manha' });
      expect(result.timeCost).toEqual({ periods: 1 });
      expect(result.dayCycle.time.current).toEqual({ day: 1, periodId: 'manha' });
      expect(result.current.inventory).toEqual(inventory);
      expect(result.current.sandbox.exploration).toEqual(exploration);
      expect(result.current.sandbox.crafting).toEqual(crafting);
      expect(result.detail.type).toBe('navigation.move');
    });
  });

  describe('exploração', () => {
    it('aumenta o progresso, aplica descobertas à navegação e cobra o custo uma vez', () => {
      const state = playing(context);
      const result = executeSandboxAction(state, { type: 'exploration.explore' }, { context, now: () => STAMP });

      expect(result.current.sandbox.exploration.locations[0]?.progress).toBe(10);
      expect(result.current.sandbox.navigation.discoveredLocationIds).toContain(HIDEOUT);
      expect(result.current.sandbox.navigation.unlockedLocationIds).toContain(HIDEOUT);
      expect(result.current.world).toEqual({ day: 1, period: 'manha' });
      expect(result.timeCost).toEqual({ periods: 1 });
      expect(result.synchronization.revealedDiscoveryIds).toEqual(
        expect.arrayContaining(['camp-mark', 'short-find', HIDEOUT]),
      );
    });

    it('exploração completa com custo zero não avança o relógio', () => {
      const state = completeCamp(playing(context), ['camp-mark', 'short-find', 'long-find', 'none-find', 'pop-find', HIDEOUT], context);
      const result = executeSandboxAction(state, { type: 'exploration.explore' }, { context, now: () => STAMP });

      expect(result.timeCost).toEqual({ periods: 0 });
      expect(result.current.world).toEqual(state.world);
      expect(result.dayCycle.events).toEqual([]);
      expect(result.current.sandbox.resources).toEqual(state.sandbox.resources);
    });
  });

  describe('coleta', () => {
    it('altera recursos, adiciona yields e usa o horário inicial como collectedAt', () => {
      const state = revealCampFinds(playing(context), [], context);
      const result = executeSandboxAction(
        state,
        { type: 'resource.collect', nodeId: 'short-node', units: 1 },
        { context, now: () => STAMP },
      );

      expect(node(result.current, 'short-node').availableUnits).toBe(1);
      expect(result.current.inventory).toEqual([{ itemId: 'test-leaf', quantity: 1 }]);
      expect(result.detail.type).toBe('resource.collect');
      if (result.detail.type !== 'resource.collect') {
        return;
      }

      expect(result.detail.result.collectedAt).toEqual({ day: 1, periodId: 'alvorecer' });
      expect(node(result.current, 'short-node').lastCollectedAt).toEqual({ day: 1, periodId: 'alvorecer' });
      expect(result.current.world).toEqual({ day: 1, period: 'manha' });
      expect(result.timeCost).toEqual({ periods: 1 });
    });
  });

  describe('crafting', () => {
    it('consome e produz no inventário canônico', () => {
      const state = withState(playing(context), { inventory: [{ itemId: 'test-leaf', quantity: 2 }] }, context);
      const result = executeSandboxAction(state, { type: 'crafting.craft', recipeId: 'craft-test-cord' }, { context, now: () => STAMP });

      expect(result.current.inventory).toEqual([
        { itemId: 'test-leaf', quantity: 1 },
        { itemId: 'test-cord', quantity: 1 },
      ]);
      expect(result.current.world).toEqual({ day: 1, period: 'manha' });
      expect(result.timeCost).toEqual({ periods: 1 });
    });

    it('construir fogueira cria estrutura no local atual', () => {
      const state = withState(freshState(), { inventory: [{ itemId: 'fallen-branch', quantity: 3 }] });
      const result = executeSandboxAction(state, { type: 'crafting.craft', recipeId: 'build-campfire' }, { now: () => STAMP });

      expect(result.current.sandbox.crafting.structures).toEqual([
        { structureId: 'campfire', locationId: START, active: true },
      ]);
      expect(result.current.inventory).toEqual([]);
      expect(result.current.world).toEqual({ day: 1, period: 'manha' });
    });
  });

  describe('aplicação única do tempo', () => {
    it('não chama advanceTime além do avanço interno de advanceDayCycle', () => {
      const state = discoverAroundCamp(playing(context), context);
      const result = executeSandboxAction(state, { type: 'navigation.move', locationId: REGION }, { context, now: () => STAMP });

      expect(state.world).toEqual({ day: 1, period: 'alvorecer' });
      expect(result.current.world).toEqual({ day: 1, period: 'manha' });
      expect(result.current.world.period).not.toBe('meio-dia');
      expect(result.dayCycle.time.daysAdvanced).toBe(0);
      expect(result.dayCycle.events).toEqual([
        { type: 'period.ended', day: 1, periodId: 'alvorecer' },
        { type: 'period.started', day: 1, periodId: 'manha' },
      ]);
    });

    it('travessia de período e virada de dia produzem eventos na ordem correta', () => {
      const state = discoverAroundCamp(
        withState(playing(context), { world: { day: 1, period: 'noite' } }, context),
        context,
      );
      const result = executeSandboxAction(state, { type: 'navigation.move', locationId: REGION }, { context, now: () => STAMP });

      expect(result.current.world).toEqual({ day: 2, period: 'alvorecer' });
      expect(result.dayCycle.time.daysAdvanced).toBe(1);
      expect(result.dayCycle.events.filter((event) => event.type === 'day.started')).toEqual([
        { type: 'day.started', day: 2 },
      ]);
      expect(result.dayCycle.events).toEqual([
        { type: 'period.ended', day: 1, periodId: 'noite' },
        { type: 'day.ended', day: 1 },
        { type: 'period.started', day: 2, periodId: 'alvorecer' },
        { type: 'day.started', day: 2 },
      ]);
    });
  });

  describe('recuperação populacional e renovação', () => {
    it('virada de dia recupera população uma vez e custo sem virada não recupera', () => {
      const reduced = withSandbox(
        discoverAroundCamp(playing(context), context),
        {
          resources: {
            nodes: playing(context).sandbox.resources.nodes,
            populations: [
              {
                populationId: 'test-herd',
                current: 4,
                pressure: 4,
                locallyExtinct: false,
                lastRecoveredDay: 1,
              },
            ],
          },
        },
        context,
      );
      const overnight = withState(reduced, { world: { day: 1, period: 'noite' } }, context);
      const recovered = executeSandboxAction(overnight, { type: 'navigation.move', locationId: REGION }, { context, now: () => STAMP });
      const daytime = executeSandboxAction(reduced, { type: 'navigation.move', locationId: REGION }, { context, now: () => STAMP });

      expect(population(recovered.current, 'test-herd').current).toBe(6);
      expect(population(recovered.current, 'test-herd').lastRecoveredDay).toBe(2);
      expect(recovered.synchronization.recoveredPopulationIds).toEqual(['test-herd']);
      expect(population(daytime.current, 'test-herd').current).toBe(4);
      expect(daytime.synchronization.recoveredPopulationIds).toEqual([]);
    });

    it('custo zero não recupera população', () => {
      const state = completeCamp(
        withSandbox(
          playing(context),
          {
            resources: {
              nodes: playing(context).sandbox.resources.nodes,
              populations: [
                {
                  populationId: 'test-herd',
                  current: 4,
                  pressure: 4,
                  locallyExtinct: false,
                  lastRecoveredDay: 1,
                },
              ],
            },
          },
          context,
        ),
        ['camp-mark', 'short-find', 'long-find', 'none-find', 'pop-find', HIDEOUT],
        context,
      );
      const result = executeSandboxAction(state, { type: 'exploration.explore' }, { context, now: () => STAMP });

      expect(result.timeCost.periods).toBe(0);
      expect(population(result.current, 'test-herd').current).toBe(4);
      expect(result.synchronization.recoveredPopulationIds).toEqual([]);
    });

    it('salto de vários dias recupera de forma idempotente', () => {
      const state = discoverAroundCamp(
        withSandbox(
          playing(context),
          {
            resources: {
              nodes: playing(context).sandbox.resources.nodes,
              populations: [
                {
                  populationId: 'test-herd',
                  current: 4,
                  pressure: 4,
                  locallyExtinct: false,
                  lastRecoveredDay: 1,
                },
              ],
            },
          },
          context,
        ),
        context,
      );
      const toRegion = executeSandboxAction(state, { type: 'navigation.move', locationId: REGION }, { context, now: () => STAMP });
      const result = executeSandboxAction(
        toRegion.current,
        { type: 'navigation.move', locationId: MARATHON },
        { context, now: () => STAMP },
      );

      expect(result.current.world.day).toBe(3);
      expect(result.dayCycle.events.filter((event) => event.type === 'day.started')).toHaveLength(2);
      expect(population(result.current, 'test-herd').current).toBe(8);
      expect(population(result.current, 'test-herd').lastRecoveredDay).toBe(3);
      const again = executeSandboxAction(
        withState(result.current, { world: { day: 3, period: 'noite' } }, context),
        { type: 'navigation.move', locationId: REGION },
        { context, now: () => STAMP },
      );
      expect(population(again.current, 'test-herd').current).toBe(8);
    });

    it('população localmente extinta não retorna', () => {
      const state = discoverAroundCamp(
        withSandbox(
          playing(context),
          {
            resources: {
              nodes: playing(context).sandbox.resources.nodes.map((entry) =>
                entry.nodeId === 'pop-node' ? { ...entry, exhausted: true } : entry,
              ),
              populations: [
                {
                  populationId: 'test-herd',
                  current: 0,
                  pressure: 8,
                  locallyExtinct: true,
                  lastRecoveredDay: 1,
                },
              ],
            },
          },
          context,
        ),
        context,
      );
      const overnight = withState(state, { world: { day: 1, period: 'noite' } }, context);
      const result = executeSandboxAction(overnight, { type: 'navigation.move', locationId: REGION }, { context, now: () => STAMP });

      expect(population(result.current, 'test-herd').current).toBe(0);
      expect(population(result.current, 'test-herd').locallyExtinct).toBe(true);
      expect(result.synchronization.recoveredPopulationIds).toEqual([]);
    });

    it('recurso short e long renovam no prazo e não antes', () => {
      const revealed = revealCampFinds(discoverAroundCamp(playing(context), context), [], context);
      const shortCollect = executeSandboxAction(
        revealed,
        { type: 'resource.collect', nodeId: 'short-node', units: 1 },
        { context, now: () => STAMP },
      );
      expect(node(shortCollect.current, 'short-node').availableUnits).toBe(1);
      expect(shortCollect.current.world).toEqual({ day: 1, period: 'manha' });
      expect(shortCollect.synchronization.renewedNodeIds).toEqual([]);

      const tooEarly = executeSandboxAction(
        completeCamp(shortCollect.current, ['camp-mark', 'short-find', 'long-find', 'none-find', 'pop-find', HIDEOUT], context),
        { type: 'exploration.explore' },
        { context, now: () => STAMP },
      );
      expect(tooEarly.current.world).toEqual({ day: 1, period: 'manha' });
      expect(node(tooEarly.current, 'short-node').availableUnits).toBe(1);

      const onTime = executeSandboxAction(
        discoverAroundCamp(tooEarly.current, context),
        { type: 'navigation.move', locationId: REGION },
        { context, now: () => STAMP },
      );
      expect(onTime.current.world).toEqual({ day: 1, period: 'meio-dia' });
      expect(node(onTime.current, 'short-node').availableUnits).toBe(2);
      expect(onTime.synchronization.renewedNodeIds).toEqual(['short-node']);

      const longCollect = executeSandboxAction(
        revealCampFinds(discoverAroundCamp(playing(context), context), [], context),
        { type: 'resource.collect', nodeId: 'long-node', units: 1 },
        { context, now: () => STAMP },
      );
      expect(node(longCollect.current, 'long-node').availableUnits).toBe(0);
      const beforeLong = executeSandboxAction(
        discoverAroundCamp(longCollect.current, context),
        { type: 'navigation.move', locationId: REGION },
        { context, now: () => STAMP },
      );
      expect(node(beforeLong.current, 'long-node').availableUnits).toBe(0);
      const afterLong = executeSandboxAction(beforeLong.current, { type: 'navigation.move', locationId: TRAIL }, { context, now: () => STAMP });
      expect(afterLong.current.world).toEqual({ day: 2, period: 'manha' });
      expect(node(afterLong.current, 'long-node').availableUnits).toBe(1);
      expect(afterLong.synchronization.renewedNodeIds).toEqual(['long-node']);
    });

    it('custo zero, política none e population não renovam por horário', () => {
      const revealed = revealCampFinds(playing(context), [], context);
      const noneCollect = executeSandboxAction(
        revealed,
        { type: 'resource.collect', nodeId: 'none-node', units: 1 },
        { context, now: () => STAMP },
      );
      const popCollect = executeSandboxAction(
        revealCampFinds(playing(context), [], context),
        { type: 'resource.collect', nodeId: 'pop-node', units: 1 },
        { context, now: () => STAMP },
      );
      const zero = executeSandboxAction(
        completeCamp(noneCollect.current, ['camp-mark', 'short-find', 'long-find', 'none-find', 'pop-find', HIDEOUT], context),
        { type: 'exploration.explore' },
        { context, now: () => STAMP },
      );
      const laterNone = executeSandboxAction(
        discoverAroundCamp(noneCollect.current, context),
        { type: 'navigation.move', locationId: REGION },
        { context, now: () => STAMP },
      );
      const laterPop = executeSandboxAction(
        discoverAroundCamp(
          withState(popCollect.current, { world: { day: 1, period: 'noite' } }, context),
          context,
        ),
        { type: 'navigation.move', locationId: REGION },
        { context, now: () => STAMP },
      );

      expect(zero.timeCost.periods).toBe(0);
      expect(zero.synchronization.renewedNodeIds).toEqual([]);
      expect(node(laterNone.current, 'none-node').availableUnits).toBe(1);
      expect(laterNone.synchronization.renewedNodeIds).toEqual([]);
      expect(node(laterPop.current, 'pop-node').availableUnits).toBe(8);
      expect(laterPop.synchronization.renewedNodeIds).not.toContain('pop-node');
      expect(laterPop.synchronization.recoveredPopulationIds).toEqual(['test-herd']);
    });
  });

  describe('reavaliações gratuitas', () => {
    it('libera descoberta condicional e receita por flag sem custo extra nem avanço extra', () => {
      const blocked = completeCamp(
        playing(context),
        ['camp-mark', 'short-find', 'long-find', 'none-find', 'pop-find', HIDEOUT],
        context,
      );
      const closed = executeSandboxAction(blocked, { type: 'exploration.explore' }, { context, now: () => STAMP });
      expect(closed.synchronization.revealedDiscoveryIds).toEqual([]);
      expect(closed.synchronization.learnedRecipeIds).toEqual([]);
      expect(closed.current.world).toEqual(blocked.world);

      const opened = withState(closed.current, { flags: { ready: true, 'recipe.ready': true } }, context);
      const result = executeSandboxAction(opened, { type: 'exploration.explore' }, { context, now: () => STAMP });

      expect(result.timeCost).toEqual({ periods: 0 });
      expect(result.current.world).toEqual(opened.world);
      expect(result.synchronization.revealedDiscoveryIds).toEqual(['secret-cache']);
      expect(result.synchronization.learnedRecipeIds).toEqual(['flag-weave']);
      expect(result.current.sandbox.crafting.knownRecipeIds).toContain('flag-weave');
    });
  });

  describe('falhas e atomicidade', () => {
    it('falhas de navegação, exploração, coleta e crafting não alteram o estado', () => {
      const state = freezeState(playing(context));
      const before = snapshot(state);

      expect(() => executeSandboxAction(state, { type: 'navigation.move', locationId: REGION }, { context })).toThrow(
        SandboxActionError,
      );
      expect(() =>
        executeSandboxAction(
          withSandbox(
            state,
            {
              navigation: {
                currentLocationId: TRAIL,
                discoveredLocationIds: [CAMP, REGION, TRAIL],
                unlockedLocationIds: [CAMP, REGION, TRAIL],
                visitedLocationIds: [CAMP, TRAIL],
              },
            },
            context,
          ),
          { type: 'exploration.explore' },
          { context },
        ),
      ).toThrow(SandboxActionError);
      expect(() =>
        executeSandboxAction(state, { type: 'resource.collect', nodeId: 'short-node', units: 1 }, { context }),
      ).toThrow(SandboxActionError);
      expect(() => executeSandboxAction(state, { type: 'crafting.craft', recipeId: 'craft-test-cord' }, { context })).toThrow(
        SandboxActionError,
      );
      expect(state).toEqual(before);
    });

    it('overflow temporal desfaz logicamente toda a ação', () => {
      const state = discoverAroundCamp(
        withState(playing(context), { world: { day: Number.MAX_SAFE_INTEGER, period: 'noite' } }, context),
        context,
      );
      const before = snapshot(state);

      expect(() => executeSandboxAction(state, { type: 'navigation.move', locationId: REGION }, { context })).toThrow(
        SandboxActionError,
      );
      expect(() => executeSandboxAction(state, { type: 'navigation.move', locationId: REGION }, { context })).toThrow(
        'O avanço ultrapassa o dia máximo permitido.',
      );
      expect(state).toEqual(before);
    });

    it('estado concluído, ação malformada, quantidade inválida e IDs vazios são rejeitados', () => {
      const state = playing(context);
      const completed = withState(state, { status: 'completed' }, context);
      const before = snapshot(state);

      expect(() => executeSandboxAction(completed, { type: 'exploration.explore' }, { context })).toThrow(
        'A partida já foi concluída e não aceita novas ações.',
      );
      expect(() => executeSandboxAction(state, { type: 'rest' } as unknown as SandboxAction, { context })).toThrow(
        'A ação do sandbox é desconhecida.',
      );
      expect(() =>
        executeSandboxAction(state, { type: 'resource.collect', nodeId: 'short-node', units: 0 }, { context }),
      ).toThrow('A quantidade solicitada precisa ser um inteiro positivo.');
      expect(() => executeSandboxAction(state, { type: 'navigation.move', locationId: '   ' }, { context })).toThrow(
        'O destino é inválido.',
      );
      expect(() => executeSandboxAction(state, { type: 'resource.collect', nodeId: '', units: 1 }, { context })).toThrow(
        'O ponto de recurso é inválido.',
      );
      expect(() => executeSandboxAction(state, { type: 'crafting.craft', recipeId: '' }, { context })).toThrow(
        'A receita é inválida.',
      );
      expect(state).toEqual(before);
    });
  });

  describe('contexto, updatedAt e imutabilidade', () => {
    it('contexto customizado funciona e contexto incompatível rejeita o estado', () => {
      const custom = executeSandboxAction(playing(context), { type: 'exploration.explore' }, { context, now: () => STAMP });
      expect(custom.current.sandbox.navigation.currentLocationId).toBe(CAMP);

      expect(() =>
        executeSandboxAction(freshState(), { type: 'exploration.explore' }, { context }),
      ).toThrow(SandboxActionError);
    });

    it('updatedAt muda só no sucesso e é calculado uma única vez', () => {
      let calls = 0;
      const timedNow = () => {
        calls += 1;
        return `2026-09-01T12:00:0${calls}.000Z`;
      };
      const state = playing(context);
      const success = executeSandboxAction(state, { type: 'exploration.explore' }, { context, now: timedNow });
      expect(calls).toBe(1);
      expect(success.current.updatedAt).toBe('2026-09-01T12:00:01.000Z');
      expect(success.previous.updatedAt).toBe(STAMP);

      let failedCalls = 0;
      const before = snapshot(state);
      expect(() =>
        executeSandboxAction(state, { type: 'navigation.move', locationId: REGION }, {
          context,
          now: () => {
            failedCalls += 1;
            return STAMP;
          },
        }),
      ).toThrow(SandboxActionError);
      expect(failedCalls).toBe(0);
      expect(state.updatedAt).toBe(before.updatedAt);
    });

    it('estado e ação congelados funcionam sem mutação e previous/current não compartilham referências', () => {
      const state = freezeState(playing(context));
      const action = freezeAction({ type: 'exploration.explore' as const });
      const before = snapshot(state);
      const result = executeSandboxAction(state, action, { context, now: () => STAMP });

      expect(state).toEqual(before);
      expect(action).toEqual({ type: 'exploration.explore' });
      expect(result.previous).not.toBe(result.current);
      expect(result.previous.inventory).not.toBe(result.current.inventory);
      expect(result.previous.sandbox).not.toBe(result.current.sandbox);
      expect(result.previous.sandbox.navigation).not.toBe(result.current.sandbox.navigation);
      result.current.inventory.push({ itemId: 'hacked', quantity: 1 });
      result.current.sandbox.navigation.visitedLocationIds.push('hacked');
      expect(result.previous.inventory).toEqual([]);
      expect(result.previous.sandbox.navigation.visitedLocationIds).toEqual([CAMP]);
    });
  });

  describe('persistência e narrativa', () => {
    it('o orquestrador não persiste e o fluxo narrativo permanece intacto', () => {
      const memory = new Map<string, string>();
      createPersistence(
        {
          getItem: (key) => memory.get(key) ?? null,
          setItem: (key, value) => {
            memory.set(key, value);
          },
          removeItem: (key) => {
            memory.delete(key);
          },
        },
        context,
      );
      const persistence = createMemoryPersistence(undefined, context);
      const state = playing(context);
      const result = executeSandboxAction(state, { type: 'exploration.explore' }, { context, now: () => STAMP });

      expect(memory.size).toBe(0);
      persistence.save(result.current);
      expect(persistence.load()).toEqual({ status: 'ok', state: result.current });
      expect(parseGameState(serializeGameState(result.current, context), context)).toEqual({
        status: 'ok',
        state: result.current,
      });
      expect(result.current.currentEventId).toBe('awakening');
      expect(result.current.schemaVersion).toBe(SCHEMA_VERSION);

      const ended = [
        'awake-calm',
        'system-touch',
        'ability-perception',
        'seek-water',
        'alert-hide',
        'meet-open',
        'share-fruit',
        'accept-shelter',
        'together-summary',
      ].reduce(
        (current, choiceId) => applyChoice(current, firstDayCampaign, choiceId, now),
        startGame({ firstName: 'Ana', lastName: 'Cruz' }, firstDayCampaign, now),
      );

      expect(ended.status).toBe('completed');
      expect(bindSavedState(ended, firstDayCampaign).ok).toBe(true);
      expect(ended.sandbox.navigation.currentLocationId).toBe(START);
      expect(inspectSandboxContext(createSandboxContext()).ok).toBe(true);
    });
  });
});
