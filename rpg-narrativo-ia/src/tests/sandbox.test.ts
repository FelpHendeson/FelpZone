import { describe, expect, it } from 'vitest';
import { firstDayCampaign } from '../campaigns/first-day';
import { applyChoice, bindSavedState, startGame } from '../core/engine';
import {
  SCHEMA_VERSION,
  SCHEMA_VERSION_V1,
  createInitialState,
  inspectGameState,
  inspectGameStateV1,
  type GameState,
} from '../core/state';
import {
  PersistenceError,
  SAVE_KEY,
  createMemoryPersistence,
  createPersistence,
  parseGameState,
  serializeGameState,
} from '../infrastructure/persistence';
import { createInitialCrafting, INITIAL_RECIPES, INITIAL_STRUCTURES, indexCraftingDefinitions } from '../modules/crafting';
import type { RecipeDefinition, StructureDefinition } from '../modules/crafting';
import { createInitialExploration, indexExplorationDefinitions } from '../modules/exploration';
import type { LocationExplorationDefinition } from '../modules/exploration';
import {
  DEFAULT_STARTING_LOCATION_ID,
  createInitialNavigation,
  indexNavigationMap,
} from '../modules/navigation';
import type { LocationNode } from '../modules/navigation';
import { createInitialResources, INITIAL_POPULATIONS, INITIAL_RESOURCE_NODES, indexResourceDefinitions } from '../modules/resources';
import type { ResourceNodeDefinition } from '../modules/resources';
import {
  SandboxError,
  createInitialSandboxState,
  createSandboxContext,
  inspectSandboxContext,
  inspectSandboxState,
  type SandboxContext,
} from '../modules/sandbox';
import { timeStateToWorld, worldToTimeState, WorldError } from '../modules/world';
import { createInitialTime } from '../modules/time';
import { freshState, now } from './helpers';

const START = DEFAULT_STARTING_LOCATION_ID;

function asV1(state: GameState): Record<string, unknown> {
  const raw = JSON.parse(serializeGameState(state)) as Record<string, unknown>;
  delete raw.sandbox;
  raw.schemaVersion = SCHEMA_VERSION_V1;
  return raw;
}

function parsedJson(state: GameState): Record<string, unknown> {
  return JSON.parse(serializeGameState(state)) as Record<string, unknown>;
}

describe('estado integrado e persistência principal', () => {
  it('inicia uma nova partida no schema 2 com sandbox completo', () => {
    const state = startGame({ firstName: 'Ana', lastName: 'Cruz' }, firstDayCampaign, now);
    const context = createSandboxContext();

    expect(state.schemaVersion).toBe(2);
    expect(state.schemaVersion).toBe(SCHEMA_VERSION);
    expect(inspectGameState(state).ok).toBe(true);
    expect(state.sandbox).toEqual(createInitialSandboxState(context));
    expect(state.sandbox.navigation).toEqual(createInitialNavigation());
    expect(state.sandbox.navigation.currentLocationId).toBe(START);
    expect(state.sandbox.navigation.discoveredLocationIds).toEqual([START]);
    expect(state.sandbox.navigation.unlockedLocationIds).toEqual([START]);
    expect(state.sandbox.navigation.visitedLocationIds).toEqual([START]);
    expect(state.sandbox.exploration).toEqual(createInitialExploration());
    expect(state.sandbox.exploration.locations).toEqual([]);
    expect(state.sandbox.resources).toEqual(
      createInitialResources(context.resources),
    );
    expect(state.sandbox.resources.nodes.map((entry) => entry.nodeId)).toEqual(
      INITIAL_RESOURCE_NODES.map((node) => node.id),
    );
    expect(state.sandbox.resources.populations.map((entry) => entry.populationId)).toEqual(
      INITIAL_POPULATIONS.map((population) => population.id),
    );
    expect(state.sandbox.crafting).toEqual(createInitialCrafting(context.crafting));
    expect(state.sandbox.crafting.knownRecipeIds).toEqual(
      INITIAL_RECIPES.filter((recipe) => recipe.discovery.type === 'known').map((recipe) => recipe.id),
    );
    expect(state.sandbox.crafting.structures).toEqual([]);
    expect(INITIAL_STRUCTURES.map((entry) => entry.id)).toEqual(['campfire']);
  });

  it('mantém world e inventory como fontes canônicas e não persiste derivados', () => {
    const state = freshState();
    const raw = parsedJson(state);
    const sandbox = raw.sandbox as Record<string, unknown>;

    expect(raw.world).toEqual({ day: 1, period: 'alvorecer' });
    expect(raw.inventory).toEqual([]);
    expect(raw.flags).toEqual({});
    expect(sandbox).not.toHaveProperty('time');
    expect(sandbox).not.toHaveProperty('world');
    expect(sandbox).not.toHaveProperty('inventory');
    expect(sandbox).not.toHaveProperty('flags');
    expect(sandbox).not.toHaveProperty('phase');
    expect(raw).not.toHaveProperty('phase');
    expect(raw).not.toHaveProperty('map');
    expect(sandbox).not.toHaveProperty('map');
    expect(sandbox).not.toHaveProperty('definitions');
    expect(JSON.stringify(raw)).not.toContain('DaylightPhase');
    expect(Object.keys(sandbox).sort()).toEqual(['crafting', 'exploration', 'navigation', 'resources']);
    expect(state.world).toEqual(timeStateToWorld(createInitialTime()));
  });

  it('realiza roundtrip exato de um save v2 válido', () => {
    const state = freshState();
    const parsed = parseGameState(serializeGameState(state));

    expect(parsed).toEqual({ status: 'ok', state });
    expect(inspectSandboxState(state.sandbox).ok).toBe(true);
  });

  it('trata save v2 sem sandbox ou com sistemas inválidos como corrupt', () => {
    const raw = parsedJson(freshState());
    const withoutSandbox = structuredClone(raw);
    delete withoutSandbox.sandbox;
    expect(parseGameState(JSON.stringify(withoutSandbox)).status).toBe('corrupt');

    const invalidNavigation = structuredClone(raw);
    (invalidNavigation.sandbox as { navigation: { currentLocationId: string } }).navigation.currentLocationId = 'nope';
    expect(parseGameState(JSON.stringify(invalidNavigation)).status).toBe('corrupt');

    const invalidExploration = structuredClone(raw);
    (invalidExploration.sandbox as { exploration: { locations: unknown[] } }).exploration.locations = [
      {
        locationId: START,
        progress: 10,
        revealedDiscoveryIds: ['fallen-sticks'],
        explorationCount: 1,
      },
    ];
    expect(parseGameState(JSON.stringify(invalidExploration)).status).toBe('corrupt');

    const invalidResources = structuredClone(raw);
    (invalidResources.sandbox as { resources: { nodes: unknown[] } }).resources.nodes = [
      { nodeId: 'missing-node', availableUnits: 1, exhausted: false },
    ];
    expect(parseGameState(JSON.stringify(invalidResources)).status).toBe('corrupt');

    const invalidCrafting = structuredClone(raw);
    (invalidCrafting.sandbox as { crafting: { knownRecipeIds: string[] } }).crafting.knownRecipeIds = ['missing-recipe'];
    expect(parseGameState(JSON.stringify(invalidCrafting)).status).toBe('corrupt');
  });

  it('migra um save v1 válido para v2 sem alterar o objeto recebido nem o relógio', () => {
    const current = freshState();
    const v1 = asV1({
      ...current,
      inventory: [{ itemId: 'agua-limpa', quantity: 2 }],
      flags: { 'ability.olhar-atento': true },
      world: { day: 3, period: 'noite' },
      updatedAt: '2026-08-31T12:00:00.000Z',
      history: [
        {
          eventId: 'awakening',
          eventTitle: 'Despertar',
          choiceId: 'awake-calm',
          choiceLabel: 'Levantar com calma e observar',
          notable: true,
        },
      ],
    });
    const frozen = Object.freeze(structuredClone(v1));
    const snapshot = structuredClone(frozen);
    const inspectedV1 = inspectGameStateV1(frozen);
    expect(inspectedV1.ok).toBe(true);

    const parsed = parseGameState(JSON.stringify(frozen));
    expect(parsed.status).toBe('ok');
    if (parsed.status !== 'ok') {
      return;
    }

    expect(parsed.state.schemaVersion).toBe(SCHEMA_VERSION);
    expect(parsed.state.character).toEqual(current.character);
    expect(parsed.state.status).toBe('playing');
    expect(parsed.state.currentEventId).toBe(current.currentEventId);
    expect(parsed.state.attributes).toEqual(current.attributes);
    expect(parsed.state.inventory).toEqual([{ itemId: 'agua-limpa', quantity: 2 }]);
    expect(parsed.state.flags).toEqual({ 'ability.olhar-atento': true });
    expect(parsed.state.history).toHaveLength(1);
    expect(parsed.state.world).toEqual({ day: 3, period: 'noite' });
    expect(parsed.state.updatedAt).toBe('2026-08-31T12:00:00.000Z');
    expect(parsed.state.progression).toEqual(current.progression);
    expect(parsed.state.sandbox).toEqual(createInitialSandboxState());
    expect(parsed.state.sandbox.exploration.locations).toEqual([]);
    expect(parsed.state.sandbox.crafting.structures).toEqual([]);
    expect(parsed.state.inventory).toHaveLength(1);
    expect(frozen).toEqual(snapshot);
    expect(inspectGameStateV1(frozen).ok).toBe(true);
  });

  it('não regrava o localStorage durante a leitura de um save v1', () => {
    const writes: string[] = [];
    const v1 = JSON.stringify(asV1(freshState()));
    const memory = new Map<string, string>([[SAVE_KEY, v1]]);
    const persistence = createPersistence({
      getItem: (key) => memory.get(key) ?? null,
      setItem: (key, value) => {
        writes.push(key);
        memory.set(key, value);
      },
      removeItem: (key) => {
        memory.delete(key);
      },
    });

    expect(persistence.load().status).toBe('ok');
    expect(writes).toEqual([]);
    expect(memory.get(SAVE_KEY)).toBe(v1);
  });

  it('rejeita save v1 malformado, v2 malformado, versão desconhecida, JSON inválido e string vazia', () => {
    const v1Broken = asV1(freshState());
    v1Broken.character = { firstName: 'Ana' };
    expect(parseGameState(JSON.stringify(v1Broken)).status).toBe('corrupt');
    expect(inspectGameStateV1(v1Broken).ok).toBe(false);

    const v2Broken = parsedJson(freshState());
    (v2Broken.sandbox as { crafting: { structures: unknown[] } }).crafting.structures = [
      { structureId: 'campfire', locationId: 'nope', active: true },
    ];
    expect(parseGameState(JSON.stringify(v2Broken)).status).toBe('corrupt');

    expect(parseGameState(JSON.stringify({ schemaVersion: 99 })).status).toBe('incompatible');
    expect(parseGameState('{')).toEqual({ status: 'corrupt', reason: 'O salvamento não pôde ser lido.' });
    expect(parseGameState('')).toEqual({ status: 'empty' });
    expect(parseGameState('   ')).toEqual({ status: 'empty' });
  });

  it('restaura um estado sem compartilhar referências com o JSON analisado', () => {
    const source = JSON.parse(serializeGameState(freshState())) as {
      sandbox: { navigation: { currentLocationId: string }; crafting: { knownRecipeIds: string[] } };
      inventory: Array<{ itemId: string; quantity: number }>;
      flags: Record<string, boolean>;
    };
    source.inventory = [{ itemId: 'agua-limpa', quantity: 1 }];
    source.flags.ready = true;
    const parsed = parseGameState(JSON.stringify(source));
    expect(parsed.status).toBe('ok');
    if (parsed.status !== 'ok') {
      return;
    }

    source.sandbox.navigation.currentLocationId = 'mutated';
    source.sandbox.crafting.knownRecipeIds.push('hacked');
    source.inventory[0].quantity = 99;
    source.flags.ready = false;

    expect(parsed.state.sandbox.navigation.currentLocationId).toBe(START);
    expect(parsed.state.sandbox.crafting.knownRecipeIds).toEqual(['build-campfire', 'cook-horned-rabbit-meat']);
    expect(parsed.state.inventory).toEqual([{ itemId: 'agua-limpa', quantity: 1 }]);
    expect(parsed.state.flags.ready).toBe(true);
  });

  it('converte world e TimeState sem mutar as entradas', () => {
    const world = Object.freeze({ day: 2, period: 'tarde' as const });
    const time = Object.freeze({ day: 2, periodId: 'tarde' });

    expect(worldToTimeState(world)).toEqual({ day: 2, periodId: 'tarde' });
    expect(timeStateToWorld(time)).toEqual({ day: 2, period: 'tarde' });
    expect(world).toEqual({ day: 2, period: 'tarde' });
    expect(time).toEqual({ day: 2, periodId: 'tarde' });
    expect(timeStateToWorld(worldToTimeState(world))).toEqual(world);
    expect(() => worldToTimeState(Object.freeze({ day: 0, period: 'alvorecer' }))).toThrow(WorldError);
    expect(() => timeStateToWorld(Object.freeze({ day: 1, periodId: 'madrugada' }))).toThrow(WorldError);
  });

  it('preserva o fluxo narrativo completo e o contrato visual do evento atual', () => {
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
      (state, choiceId) => applyChoice(state, firstDayCampaign, choiceId, now),
      startGame({ firstName: 'Ana', lastName: 'Cruz' }, firstDayCampaign, now),
    );

    expect(ended.status).toBe('completed');
    expect(ended.schemaVersion).toBe(SCHEMA_VERSION);
    expect(ended.sandbox.navigation.currentLocationId).toBe(START);
    expect(ended.currentEventId).toBeTruthy();
    expect(bindSavedState(ended, firstDayCampaign).ok).toBe(true);
    expect(parseGameState(serializeGameState(ended))).toEqual({ status: 'ok', state: ended });
    expect(() => serializeGameState(ended)).not.toThrow(PersistenceError);
    expect(createInitialState({ firstName: 'Ana', lastName: 'Cruz' }, firstDayCampaign.firstEventId, now).currentEventId).toBe(
      firstDayCampaign.firstEventId,
    );
  });
});

const CUSTOM_START = 'test-camp';

const CUSTOM_MAP: LocationNode = {
  id: 'test-region',
  name: 'Região de teste',
  children: [
    {
      id: CUSTOM_START,
      name: 'Acampamento de teste',
    },
  ],
};

const CUSTOM_EXPLORATION: LocationExplorationDefinition[] = [
  {
    locationId: CUSTOM_START,
    progressPerAction: 10,
    timeCost: { periods: 1 },
    discoveries: [
      {
        id: 'test-herbs',
        kind: 'resourceNode',
        revealAt: 10,
        completionWeight: 1,
        once: true,
      },
    ],
  },
];

const CUSTOM_NODES: ResourceNodeDefinition[] = [
  {
    id: 'test-herbs',
    discoveryId: 'test-herbs',
    locationId: CUSTOM_START,
    name: 'Ervas de teste',
    capacity: 2,
    collectionCost: { periods: 1 },
    renewal: { type: 'none' },
    yields: [{ itemId: 'test-leaf', quantityPerUnit: 1 }],
  },
];

const CUSTOM_STRUCTURES: StructureDefinition[] = [
  {
    id: 'test-bench',
    name: 'Bancada de teste',
    tags: ['work'],
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
];

function customContext(): SandboxContext {
  const map = indexNavigationMap(CUSTOM_MAP, CUSTOM_START);
  const exploration = indexExplorationDefinitions(CUSTOM_EXPLORATION, map);
  const resources = indexResourceDefinitions(CUSTOM_NODES, [], map, exploration);
  const crafting = indexCraftingDefinitions(CUSTOM_RECIPES, CUSTOM_STRUCTURES);
  return {
    startingLocationId: CUSTOM_START,
    map,
    exploration,
    resources,
    crafting,
  };
}

function freezeContext(context: SandboxContext): SandboxContext {
  return Object.freeze({
    startingLocationId: context.startingLocationId,
    map: context.map,
    exploration: context.exploration,
    resources: context.resources,
    crafting: context.crafting,
  });
}

describe('contexto do sandbox na criação e persistência', () => {
  it('o contexto padrão mantém awakening-clearing', () => {
    const context = createSandboxContext();
    const state = createInitialSandboxState(context);

    expect(context.startingLocationId).toBe('awakening-clearing');
    expect(context.startingLocationId).toBe(DEFAULT_STARTING_LOCATION_ID);
    expect(state.navigation.currentLocationId).toBe('awakening-clearing');
  });

  it('createSandboxContext expõe o local inicial padrão', () => {
    expect(createSandboxContext().startingLocationId).toBe(DEFAULT_STARTING_LOCATION_ID);
    expect(createSandboxContext().map.locations.has(DEFAULT_STARTING_LOCATION_ID)).toBe(true);
  });

  it('createInitialSandboxState usa context.startingLocationId', () => {
    const context = freezeContext(customContext());
    const sandbox = createInitialSandboxState(context);

    expect(sandbox.navigation.currentLocationId).toBe(context.startingLocationId);
    expect(sandbox.navigation.currentLocationId).not.toBe(DEFAULT_STARTING_LOCATION_ID);
  });

  it('contexto com outro local inicial cria navegação nesse local', () => {
    const sandbox = createInitialSandboxState(customContext());
    expect(sandbox.navigation.currentLocationId).toBe(CUSTOM_START);
  });

  it('o novo local começa descoberto', () => {
    expect(createInitialSandboxState(customContext()).navigation.discoveredLocationIds).toEqual([CUSTOM_START]);
  });

  it('o novo local começa desbloqueado', () => {
    expect(createInitialSandboxState(customContext()).navigation.unlockedLocationIds).toEqual([CUSTOM_START]);
  });

  it('o novo local começa visitado', () => {
    expect(createInitialSandboxState(customContext()).navigation.visitedLocationIds).toEqual([CUSTOM_START]);
  });

  it('local inicial inexistente é rejeitado', () => {
    expect(() => createSandboxContext('lugar-fantasma')).toThrow(SandboxError);
    expect(() => createSandboxContext('')).toThrow('A localização inicial não existe.');

    const context = customContext();
    const invalid = { ...context, startingLocationId: 'lugar-fantasma' };
    expect(inspectSandboxContext(invalid).ok).toBe(false);
    expect(() => createInitialSandboxState(invalid)).toThrow('A localização inicial não existe.');
  });

  it('estado customizado serializa, restaura e preserva o roundtrip com o mesmo contexto', () => {
    const context = freezeContext(customContext());
    const snapshot = {
      startingLocationId: context.startingLocationId,
      locations: [...context.map.locations.keys()],
      recipes: [...context.crafting.byRecipe.keys()],
    };
    const state = createInitialState({ firstName: 'Lia', lastName: 'Nunes' }, 'awakening', now, context);
    const serialized = serializeGameState(state, context);
    const parsed = parseGameState(serialized, context);

    expect(parsed).toEqual({ status: 'ok', state });
    if (parsed.status !== 'ok') {
      return;
    }

    expect(parsed.state.sandbox.navigation.currentLocationId).toBe(CUSTOM_START);
    expect(parsed.state.sandbox.resources.nodes.map((entry) => entry.nodeId)).toEqual(['test-herbs']);
    expect(parsed.state.sandbox.crafting.knownRecipeIds).toEqual(['craft-test-cord']);
    expect(JSON.parse(serialized)).not.toHaveProperty('startingLocationId');
    expect((JSON.parse(serialized) as { sandbox: Record<string, unknown> }).sandbox).not.toHaveProperty('startingLocationId');
    expect((JSON.parse(serialized) as { sandbox: Record<string, unknown> }).sandbox).not.toHaveProperty('map');
    expect(JSON.stringify(JSON.parse(serialized))).not.toContain('"byRecipe"');
    expect(context.startingLocationId).toBe(snapshot.startingLocationId);
    expect([...context.map.locations.keys()]).toEqual(snapshot.locations);
    expect([...context.crafting.byRecipe.keys()]).toEqual(snapshot.recipes);
  });

  it('createPersistence usa o mesmo contexto em save e load', () => {
    const context = customContext();
    const state = createInitialState({ firstName: 'Ana', lastName: 'Cruz' }, 'awakening', now, context);
    const memory = new Map<string, string>();
    const persistence = createPersistence(
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

    persistence.save(state);
    expect(persistence.load()).toEqual({ status: 'ok', state });
    expect(parseGameState(memory.get(SAVE_KEY) ?? '', context)).toEqual({ status: 'ok', state });
  });

  it('createMemoryPersistence encaminha o contexto', () => {
    const context = customContext();
    const state = createInitialState({ firstName: 'Ana', lastName: 'Cruz' }, 'awakening', now, context);
    const persistence = createMemoryPersistence(undefined, context);

    persistence.save(state);
    expect(persistence.load()).toEqual({ status: 'ok', state });
  });

  it('save customizado carregado com contexto padrão é rejeitado', () => {
    const context = customContext();
    const state = createInitialState({ firstName: 'Ana', lastName: 'Cruz' }, 'awakening', now, context);
    const serialized = serializeGameState(state, context);

    expect(parseGameState(serialized).status).toBe('corrupt');
    expect(parseGameState(serialized, createSandboxContext()).status).toBe('corrupt');
  });

  it('save padrão carregado com contexto incompatível é rejeitado', () => {
    const serialized = serializeGameState(freshState());
    expect(parseGameState(serialized, customContext()).status).toBe('corrupt');
  });

  it('migração v1 com contexto customizado cria o sandbox customizado sem alterar dados narrativos', () => {
    const current = {
      ...freshState(),
      inventory: [{ itemId: 'agua-limpa', quantity: 2 }],
      flags: { 'ability.olhar-atento': true },
      world: { day: 3, period: 'noite' as const },
      updatedAt: '2026-08-31T12:00:00.000Z',
    };
    const v1 = Object.freeze(asV1(current));
    const snapshot = structuredClone(v1);
    const context = freezeContext(customContext());
    const parsed = parseGameState(JSON.stringify(v1), context);

    expect(parsed.status).toBe('ok');
    if (parsed.status !== 'ok') {
      return;
    }

    expect(parsed.state.character).toEqual(current.character);
    expect(parsed.state.inventory).toEqual([{ itemId: 'agua-limpa', quantity: 2 }]);
    expect(parsed.state.flags).toEqual({ 'ability.olhar-atento': true });
    expect(parsed.state.world).toEqual({ day: 3, period: 'noite' });
    expect(parsed.state.updatedAt).toBe('2026-08-31T12:00:00.000Z');
    expect(parsed.state.sandbox).toEqual(createInitialSandboxState(context));
    expect(parsed.state.sandbox.navigation.currentLocationId).toBe(CUSTOM_START);
    expect(parsed.state.sandbox.crafting.knownRecipeIds).toEqual(['craft-test-cord']);
    expect(v1).toEqual(snapshot);
  });

  it('chamadas antigas sem contexto continuam funcionando', () => {
    const state = startGame({ firstName: 'Ana', lastName: 'Cruz' }, firstDayCampaign, now);
    const persistence = createMemoryPersistence();

    persistence.save(state);
    expect(persistence.load()).toEqual({ status: 'ok', state });
    expect(parseGameState(serializeGameState(state))).toEqual({ status: 'ok', state });
    expect(createSandboxContext().startingLocationId).toBe(START);
  });
});

function copyContext(context: SandboxContext): SandboxContext {
  return {
    startingLocationId: context.startingLocationId,
    map: {
      root: context.map.root,
      locations: new Map(context.map.locations),
      parents: new Map(context.map.parents),
      children: new Map(context.map.children),
    },
    exploration: {
      definitions: context.exploration.definitions,
      byLocation: new Map(context.exploration.byLocation),
      byDiscovery: new Map(context.exploration.byDiscovery),
      locationByDiscovery: new Map(context.exploration.locationByDiscovery),
    },
    resources: {
      nodes: context.resources.nodes,
      populations: context.resources.populations,
      byNode: new Map(context.resources.byNode),
      byPopulation: new Map(context.resources.byPopulation),
      nodesByPopulation: new Map(context.resources.nodesByPopulation),
    },
    crafting: {
      recipes: context.crafting.recipes,
      structures: context.crafting.structures,
      byRecipe: new Map(context.crafting.byRecipe),
      byStructure: new Map(context.crafting.byStructure),
    },
  };
}

function mutableMap<K, V>(value: ReadonlyMap<K, V>): Map<K, V> {
  return value as Map<K, V>;
}

function expectInspected(value: unknown): SandboxContext {
  const inspected = inspectSandboxContext(value);
  expect(inspected.ok).toBe(true);
  if (!inspected.ok) {
    throw new Error(inspected.reason);
  }

  return inspected.value;
}

describe('reconstrução e normalização do SandboxContext', () => {
  it('o contexto padrão continua válido', () => {
    const context = createSandboxContext();
    const inspected = expectInspected(context);

    expect(inspectSandboxContext(context).ok).toBe(true);
    expect(inspected.startingLocationId).toBe(DEFAULT_STARTING_LOCATION_ID);
    expect(inspectSandboxState(createInitialSandboxState()).ok).toBe(true);
  });

  it('contexto customizado válido continua funcionando', () => {
    const context = freezeContext(customContext());
    const inspected = expectInspected(context);
    const sandbox = createInitialSandboxState(context);

    expect(inspected.startingLocationId).toBe(CUSTOM_START);
    expect(sandbox.navigation.currentLocationId).toBe(CUSTOM_START);
    expect(inspectSandboxState(sandbox, context).ok).toBe(true);
  });

  it('inspectSandboxContext devolve índices reconstruídos e preserva o local inicial', () => {
    const context = customContext();
    const inspected = expectInspected(context);

    expect(inspected.startingLocationId).toBe(context.startingLocationId);
    expect(inspected.map).not.toBe(context.map);
    expect(inspected.map.locations).not.toBe(context.map.locations);
    expect(inspected.map.parents).not.toBe(context.map.parents);
    expect(inspected.map.children).not.toBe(context.map.children);
    expect(inspected.exploration).not.toBe(context.exploration);
    expect(inspected.exploration.byLocation).not.toBe(context.exploration.byLocation);
    expect(inspected.resources).not.toBe(context.resources);
    expect(inspected.resources.byNode).not.toBe(context.resources.byNode);
    expect(inspected.crafting).not.toBe(context.crafting);
    expect(inspected.crafting.byRecipe).not.toBe(context.crafting.byRecipe);
    expect(inspected.map.locations.has(CUSTOM_START)).toBe(true);
    expect(inspected.exploration.byLocation.has(CUSTOM_START)).toBe(true);
    expect(inspected.resources.byNode.has('test-herbs')).toBe(true);
    expect(inspected.crafting.byRecipe.has('craft-test-cord')).toBe(true);
  });

  it('Map locations adulterado é reconstruído a partir da raiz', () => {
    const source = customContext();
    const adversarial = copyContext(source);
    mutableMap(adversarial.map.locations).clear();
    mutableMap(adversarial.map.locations).set('hacked', adversarial.map.root);

    const inspected = expectInspected(adversarial);
    expect(inspected.map).not.toBe(adversarial.map);
    expect(inspected.map.locations).not.toBe(adversarial.map.locations);
    expect(inspected.map.locations.has(CUSTOM_START)).toBe(true);
    expect(inspected.map.locations.has('test-region')).toBe(true);
    expect(inspected.map.locations.has('hacked')).toBe(false);
  });

  it('Maps parents e children adulterados não contaminam o resultado', () => {
    const adversarial = copyContext(customContext());
    mutableMap(adversarial.map.parents).clear();
    mutableMap(adversarial.map.parents).set('hacked', 'hacked-parent');
    mutableMap(adversarial.map.children).clear();
    mutableMap(adversarial.map.children).set('hacked', Object.freeze(['hacked-child']));

    const inspected = expectInspected(adversarial);
    expect(inspected.map.parents.has('hacked')).toBe(false);
    expect(inspected.map.children.has('hacked')).toBe(false);
    expect(inspected.map.parents.get(CUSTOM_START)).toBe('test-region');
    expect(inspected.map.children.get('test-region')).toEqual([CUSTOM_START]);
  });

  it('índices de exploração adulterados não contaminam o resultado', () => {
    const source = customContext();
    const adversarial = copyContext(source);
    const fakeExploration = source.exploration.byLocation.get(CUSTOM_START);
    if (!fakeExploration) {
      throw new Error('A fixture customizada precisa da exploração de teste.');
    }

    mutableMap(adversarial.exploration.byLocation).clear();
    mutableMap(adversarial.exploration.byLocation).set('hacked', fakeExploration);
    mutableMap(adversarial.exploration.byDiscovery).clear();
    mutableMap(adversarial.exploration.byDiscovery).set('hacked', fakeExploration.discoveries[0]);
    mutableMap(adversarial.exploration.locationByDiscovery).clear();
    mutableMap(adversarial.exploration.locationByDiscovery).set('hacked', 'hacked');

    const inspected = expectInspected(adversarial);
    expect(inspected.exploration).not.toBe(adversarial.exploration);
    expect(inspected.exploration.byLocation.has('hacked')).toBe(false);
    expect(inspected.exploration.byDiscovery.has('hacked')).toBe(false);
    expect(inspected.exploration.locationByDiscovery.has('hacked')).toBe(false);
    expect(inspected.exploration.byLocation.has(CUSTOM_START)).toBe(true);
    expect(inspected.exploration.byDiscovery.has('test-herbs')).toBe(true);
    expect(inspected.exploration.locationByDiscovery.get('test-herbs')).toBe(CUSTOM_START);
  });

  it('índices de recursos adulterados não contaminam o resultado', () => {
    const source = customContext();
    const adversarial = copyContext(source);
    const fakeNode = source.resources.byNode.get('test-herbs');
    if (!fakeNode) {
      throw new Error('A fixture customizada precisa do recurso de teste.');
    }

    mutableMap(adversarial.resources.byNode).clear();
    mutableMap(adversarial.resources.byNode).set('hacked', fakeNode);
    mutableMap(adversarial.resources.byPopulation).clear();
    mutableMap(adversarial.resources.byPopulation).set('hacked', {
      id: 'hacked',
      speciesId: 'hacked',
      carryingCapacity: 1,
      recoveryPerDay: 1,
      warningThreshold: 1,
      criticalThreshold: 1,
    });
    mutableMap(adversarial.resources.nodesByPopulation).clear();
    mutableMap(adversarial.resources.nodesByPopulation).set('hacked', Object.freeze(['hacked']));

    const inspected = expectInspected(adversarial);
    expect(inspected.resources).not.toBe(adversarial.resources);
    expect(inspected.resources.byNode.has('hacked')).toBe(false);
    expect(inspected.resources.byPopulation.has('hacked')).toBe(false);
    expect(inspected.resources.nodesByPopulation.has('hacked')).toBe(false);
    expect(inspected.resources.byNode.has('test-herbs')).toBe(true);
  });

  it('índices de crafting adulterados não contaminam o resultado', () => {
    const source = customContext();
    const adversarial = copyContext(source);
    const fakeRecipe = source.crafting.byRecipe.get('craft-test-cord');
    const fakeStructure = source.crafting.byStructure.get('test-bench');
    if (!fakeRecipe || !fakeStructure) {
      throw new Error('A fixture customizada precisa das definições de crafting de teste.');
    }

    mutableMap(adversarial.crafting.byRecipe).clear();
    mutableMap(adversarial.crafting.byRecipe).set('hacked', fakeRecipe);
    mutableMap(adversarial.crafting.byStructure).clear();
    mutableMap(adversarial.crafting.byStructure).set('hacked', fakeStructure);

    const inspected = expectInspected(adversarial);
    expect(inspected.crafting).not.toBe(adversarial.crafting);
    expect(inspected.crafting.byRecipe.has('hacked')).toBe(false);
    expect(inspected.crafting.byStructure.has('hacked')).toBe(false);
    expect(inspected.crafting.byRecipe.has('craft-test-cord')).toBe(true);
    expect(inspected.crafting.byStructure.has('test-bench')).toBe(true);
  });

  it('recursos são reconstruídos contra a exploração normalizada', () => {
    const adversarial = copyContext(customContext());
    mutableMap(adversarial.exploration.byDiscovery).clear();
    mutableMap(adversarial.exploration.locationByDiscovery).clear();

    const inspected = expectInspected(adversarial);
    expect(inspected.resources.byNode.has('test-herbs')).toBe(true);
    expect(inspected.exploration.byDiscovery.has('test-herbs')).toBe(true);
  });

  it('contexto com recurso incompatível com a exploração é rejeitado', () => {
    const source = customContext();
    const invalid: SandboxContext = {
      ...source,
      resources: {
        ...source.resources,
        nodes: [{ ...CUSTOM_NODES[0], discoveryId: 'descoberta-ausente' }],
      },
    };

    const inspected = inspectSandboxContext(invalid);
    expect(inspected).toEqual({ ok: false, reason: 'A descoberta não existe.' });
  });

  it('contexto com exploração incompatível com o mapa é rejeitado', () => {
    const source = customContext();
    const invalid: SandboxContext = {
      ...source,
      exploration: {
        ...source.exploration,
        definitions: [{ ...CUSTOM_EXPLORATION[0], locationId: 'lugar-inexistente' }],
      },
    };

    const inspected = inspectSandboxContext(invalid);
    expect(inspected).toEqual({ ok: false, reason: 'A localização não existe.' });
  });

  it('contexto com local inicial ausente na raiz é rejeitado', () => {
    const source = customContext();
    const invalid: SandboxContext = {
      ...source,
      startingLocationId: 'lugar-fantasma',
      map: {
        ...source.map,
        locations: new Map([...source.map.locations, ['lugar-fantasma', source.map.root]]),
      },
    };

    const inspected = inspectSandboxContext(invalid);
    expect(inspected.ok).toBe(false);
    if (inspected.ok) {
      return;
    }

    expect(inspected.reason).toBe('A localização inicial não existe.');
  });

  it('createInitialSandboxState rejeita contexto integralmente inválido', () => {
    const source = customContext();
    const invalid: SandboxContext = {
      ...source,
      exploration: {
        ...source.exploration,
        definitions: [{ ...CUSTOM_EXPLORATION[0], locationId: 'lugar-inexistente' }],
      },
    };

    expect(() => createInitialSandboxState(invalid)).toThrow(SandboxError);
    expect(() => createInitialSandboxState(invalid)).toThrow('A localização não existe.');
    expect(() => serializeGameState(freshState(), invalid)).toThrow(PersistenceError);
    expect(parseGameState(serializeGameState(freshState()), invalid).status).toBe('corrupt');
  });

  it('createInitialSandboxState usa o contexto normalizado', () => {
    const adversarial = copyContext(customContext());
    mutableMap(adversarial.map.locations).clear();
    mutableMap(adversarial.crafting.byRecipe).clear();

    const sandbox = createInitialSandboxState(adversarial);
    expect(sandbox.navigation.currentLocationId).toBe(CUSTOM_START);
    expect(sandbox.crafting.knownRecipeIds).toEqual(['craft-test-cord']);
    expect(sandbox.resources.nodes.map((entry) => entry.nodeId)).toEqual(['test-herbs']);
    expect(inspectSandboxState(sandbox, adversarial).ok).toBe(true);
  });

  it('estado criado com contexto válido serializa no mesmo contexto e não nasce inválido', () => {
    const context = freezeContext(customContext());
    const state = createInitialState({ firstName: 'Lia', lastName: 'Nunes' }, 'awakening', now, context);

    expect(inspectSandboxState(state.sandbox, context).ok).toBe(true);
    expect(inspectGameState(state, context).ok).toBe(true);
    expect(parseGameState(serializeGameState(state, context), context)).toEqual({ status: 'ok', state });
  });

  it('alterar os Maps originais depois da inspeção não altera o contexto normalizado', () => {
    const source = customContext();
    const inspected = expectInspected(source);

    mutableMap(source.map.locations).set('hacked', source.map.root);
    mutableMap(source.map.parents).set('hacked', 'hacked-parent');
    mutableMap(source.map.children).set('hacked', Object.freeze(['hacked-child']));
    mutableMap(source.exploration.byLocation).set('hacked', CUSTOM_EXPLORATION[0]);
    mutableMap(source.exploration.byDiscovery).set('hacked', CUSTOM_EXPLORATION[0].discoveries[0]);
    mutableMap(source.exploration.locationByDiscovery).set('hacked', 'hacked');
    mutableMap(source.resources.byNode).set('hacked', CUSTOM_NODES[0]);
    mutableMap(source.crafting.byRecipe).set('hacked', CUSTOM_RECIPES[0]);
    mutableMap(source.crafting.byStructure).set('hacked', CUSTOM_STRUCTURES[0]);

    expect(inspected.map.locations.has('hacked')).toBe(false);
    expect(inspected.map.parents.has('hacked')).toBe(false);
    expect(inspected.map.children.has('hacked')).toBe(false);
    expect(inspected.exploration.byLocation.has('hacked')).toBe(false);
    expect(inspected.exploration.byDiscovery.has('hacked')).toBe(false);
    expect(inspected.exploration.locationByDiscovery.has('hacked')).toBe(false);
    expect(inspected.resources.byNode.has('hacked')).toBe(false);
    expect(inspected.crafting.byRecipe.has('hacked')).toBe(false);
    expect(inspected.crafting.byStructure.has('hacked')).toBe(false);
  });

  it('contextos e definições originais permanecem imutáveis', () => {
    const context = freezeContext(customContext());
    const snapshot = {
      startingLocationId: context.startingLocationId,
      root: context.map.root,
      locations: [...context.map.locations.keys()],
      parents: [...context.map.parents.entries()],
      children: [...context.map.children.entries()],
      exploration: context.exploration.definitions,
      resources: context.resources.nodes,
      populations: context.resources.populations,
      recipes: context.crafting.recipes,
      structures: context.crafting.structures,
      byLocation: [...context.exploration.byLocation.keys()],
      byRecipe: [...context.crafting.byRecipe.keys()],
    };

    expectInspected(context);
    createInitialSandboxState(context);

    expect(context.startingLocationId).toBe(snapshot.startingLocationId);
    expect(context.map.root).toBe(snapshot.root);
    expect([...context.map.locations.keys()]).toEqual(snapshot.locations);
    expect([...context.map.parents.entries()]).toEqual(snapshot.parents);
    expect([...context.map.children.entries()]).toEqual(snapshot.children);
    expect(context.exploration.definitions).toBe(snapshot.exploration);
    expect(context.resources.nodes).toBe(snapshot.resources);
    expect(context.resources.populations).toBe(snapshot.populations);
    expect(context.crafting.recipes).toBe(snapshot.recipes);
    expect(context.crafting.structures).toBe(snapshot.structures);
    expect([...context.exploration.byLocation.keys()]).toEqual(snapshot.byLocation);
    expect([...context.crafting.byRecipe.keys()]).toEqual(snapshot.byRecipe);
  });

  it('chamadas sem contexto continuam funcionando', () => {
    const state = createInitialState({ firstName: 'Ana', lastName: 'Cruz' }, 'awakening', now);
    const persistence = createMemoryPersistence();

    expect(inspectSandboxContext(createSandboxContext()).ok).toBe(true);
    expect(inspectSandboxState(state.sandbox).ok).toBe(true);
    expect(inspectGameState(state).ok).toBe(true);
    expect(() => serializeGameState(state)).not.toThrow();
    expect(parseGameState(serializeGameState(state))).toEqual({ status: 'ok', state });
    persistence.save(state);
    expect(persistence.load()).toEqual({ status: 'ok', state });
  });
});

