import { describe, expect, it } from 'vitest';
import { firstDayCampaign } from '../campaigns/first-day';
import {
  SCHEMA_VERSION,
  SCHEMA_VERSION_V5,
  createInitialState,
  inspectGameState,
  inspectGameStateV5,
  type GameState,
} from '../core/state';
import {
  SAVE_KEY,
  createPersistence,
  parseGameState,
  serializeGameState,
} from '../infrastructure/persistence';
import {
  createInitialObjectivesState,
  evaluateObjectiveCriterion,
  indexObjectiveCatalog,
  synchronizeObjectives,
  type ObjectiveCatalog,
  type ObjectiveCriterion,
} from '../modules/objectives';
import { asV1, asV2, asV3, asV4, asV5, asV10, freshState, now } from './helpers';

const OBJECTIVES: ObjectiveCatalog = {
  objectives: [
    {
      id: 'sequential',
      title: 'Caminho inicial',
      description: 'Aprenda e explore.',
      kind: 'main',
      stepMode: 'sequential',
      activation: { type: 'automatic' },
      steps: [
        {
          id: 'ability',
          title: 'Escolha uma capacidade',
          criteria: [{ type: 'progression.ability.has', abilityId: 'olhar-atento' }],
        },
        {
          id: 'visit',
          title: 'Visite a nascente',
          criteria: [{ type: 'navigation.location.visited', locationId: 'spring-lake' }],
        },
      ],
    },
    {
      id: 'hidden',
      title: 'Sinais humanos',
      description: 'Investigue outra pessoa.',
      kind: 'hidden',
      stepMode: 'parallel',
      activation: { type: 'criteria', criteria: [{ type: 'flag.is', flag: 'other.human', value: true }] },
      steps: [
        {
          id: 'discover',
          title: 'Encontre Mira',
          criteria: [{ type: 'presence.discovered', presenceId: 'mira-awakening-clearing' }],
        },
        {
          id: 'resolve',
          title: 'Converse com Mira',
          criteria: [{ type: 'presence.resolved', presenceId: 'mira-awakening-clearing' }],
        },
      ],
    },
  ],
};

const catalog = indexObjectiveCatalog(OBJECTIVES);

function stateWithCatalog(): GameState {
  return createInitialState({ firstName: 'Ana', lastName: 'Cruz' }, firstDayCampaign, now, undefined, catalog);
}

function freezeGame(state: GameState): GameState {
  return Object.freeze(structuredClone(state));
}

describe('Fatia 10.2 — critérios e sincronização', () => {
  it.each<[ObjectiveCriterion, (state: GameState) => GameState]>([
    [
      { type: 'progression.ability.has', abilityId: 'olhar-atento' },
      (state) => ({ ...state, progression: { ...state.progression, abilityIds: ['olhar-atento'] } }),
    ],
    [
      { type: 'navigation.location.visited', locationId: 'spring-lake' },
      (state) => ({
        ...state,
        sandbox: {
          ...state.sandbox,
          navigation: {
            ...state.sandbox.navigation,
            discoveredLocationIds: ['awakening-clearing', 'spring-lake'],
            unlockedLocationIds: ['awakening-clearing', 'spring-lake'],
            visitedLocationIds: ['awakening-clearing', 'spring-lake'],
          },
        },
      }),
    ],
    [
      { type: 'exploration.discovery.revealed', discoveryId: 'spring-water' },
      (state) => ({
        ...state,
        sandbox: {
          ...state.sandbox,
          exploration: {
            locations: [
              {
                locationId: 'spring-lake',
                progress: 40,
                explorationCount: 1,
                revealedDiscoveryIds: ['spring-water'],
              },
            ],
          },
        },
      }),
    ],
    [
      { type: 'inventory.item.quantity', itemId: 'raw-water', quantity: 2 },
      (state) => ({ ...state, inventory: [{ itemId: 'raw-water', quantity: 2 }] }),
    ],
    [
      { type: 'crafting.structure.active', structureId: 'campfire', locationId: 'awakening-clearing' },
      (state) => ({
        ...state,
        sandbox: {
          ...state.sandbox,
          crafting: {
            ...state.sandbox.crafting,
            structures: [{ structureId: 'campfire', locationId: 'awakening-clearing', active: true }],
          },
        },
      }),
    ],
    [
      { type: 'presence.discovered', presenceId: 'mira-awakening-clearing' },
      (state) => ({
        ...state,
        sandbox: {
          ...state.sandbox,
          presences: { discoveredPresenceIds: ['mira-awakening-clearing'], resolvedPresenceIds: [] },
        },
      }),
    ],
    [
      { type: 'presence.resolved', presenceId: 'mira-awakening-clearing' },
      (state) => ({
        ...state,
        sandbox: {
          ...state.sandbox,
          presences: {
            discoveredPresenceIds: ['mira-awakening-clearing'],
            resolvedPresenceIds: ['mira-awakening-clearing'],
          },
        },
      }),
    ],
    [{ type: 'flag.is', flag: 'known', value: true }, (state) => ({ ...state, flags: { known: true } })],
    [{ type: 'world.day.min', day: 3 }, (state) => ({ ...state, world: { ...state.world, day: 3 } })],
  ])('avalia o critério $type somente quando sua fonte canônica satisfaz o contrato', (criterion, satisfy) => {
    const initial = stateWithCatalog();
    expect(evaluateObjectiveCriterion(criterion, initial)).toBe(false);
    expect(evaluateObjectiveCriterion(criterion, satisfy(initial))).toBe(true);
  });

  it('ativa, progride e conclui objetivos em uma sincronização determinística', () => {
    const initial = stateWithCatalog();
    const facts = freezeGame({
      ...initial,
      progression: { ...initial.progression, abilityIds: ['olhar-atento'] },
      flags: { 'other.human': true },
      sandbox: {
        ...initial.sandbox,
        navigation: {
          ...initial.sandbox.navigation,
          discoveredLocationIds: ['awakening-clearing', 'spring-lake'],
          unlockedLocationIds: ['awakening-clearing', 'spring-lake'],
          visitedLocationIds: ['awakening-clearing', 'spring-lake'],
        },
        presences: {
          discoveredPresenceIds: ['mira-awakening-clearing'],
          resolvedPresenceIds: ['mira-awakening-clearing'],
        },
      },
    });
    const previous = freezeGame(initial).objectives;
    const result = synchronizeObjectives(catalog, previous, facts);

    expect(result.activatedObjectiveIds).toEqual(['hidden']);
    expect(result.completedSteps).toEqual([
      { objectiveId: 'sequential', stepId: 'ability' },
      { objectiveId: 'sequential', stepId: 'visit' },
      { objectiveId: 'hidden', stepId: 'discover' },
      { objectiveId: 'hidden', stepId: 'resolve' },
    ]);
    expect(result.completedObjectiveIds).toEqual(['sequential', 'hidden']);
    expect(result.current.entries.every((entry) => entry.completed)).toBe(true);
    expect(previous.entries).toEqual([{ objectiveId: 'sequential', completedStepIds: [], completed: false }]);

    const repeated = synchronizeObjectives(catalog, freezeGame({ ...facts, objectives: result.current }).objectives, facts);
    expect(repeated.activatedObjectiveIds).toEqual([]);
    expect(repeated.completedSteps).toEqual([]);
    expect(repeated.completedObjectiveIds).toEqual([]);
    expect(repeated.current).toEqual(result.current);
  });

  it('para um objetivo sequencial na primeira etapa não satisfeita', () => {
    const initial = stateWithCatalog();
    const onlyLaterFact = freezeGame({
      ...initial,
      sandbox: {
        ...initial.sandbox,
        navigation: {
          ...initial.sandbox.navigation,
          discoveredLocationIds: ['awakening-clearing', 'spring-lake'],
          unlockedLocationIds: ['awakening-clearing', 'spring-lake'],
          visitedLocationIds: ['awakening-clearing', 'spring-lake'],
        },
      },
    });
    const result = synchronizeObjectives(catalog, initial.objectives, onlyLaterFact);

    expect(result.completedSteps).toEqual([]);
    expect(result.current.entries[0].completedStepIds).toEqual([]);
  });
});

describe('Fatia 10.2 — schema 6 e migração', () => {
  it('cria e persiste o estado de objetivos no schema atual', () => {
    const state = stateWithCatalog();
    expect(SCHEMA_VERSION).toBe(23);
    expect(state.schemaVersion).toBe(SCHEMA_VERSION);
    expect(state.objectives).toEqual(createInitialObjectivesState(catalog));
    expect(parseGameState(serializeGameState(state, undefined, catalog), undefined, catalog)).toEqual({
      status: 'ok',
      state,
    });
  });

  it('migração v10 para v11 não progride objetivos apenas por carregar o save', () => {
    const initial = stateWithCatalog();
    const raw = asV10({ ...initial, flags: { 'other.human': true } }, catalog);
    const loaded = parseGameState(JSON.stringify(raw), undefined, catalog);

    expect(loaded.status).toBe('ok');
    if (loaded.status === 'ok') {
      expect(loaded.state.objectives).toEqual(initial.objectives);
    }
  });

  it('rejeita schema atual sem objetivos ou com progresso malformado', () => {
    const raw = JSON.parse(serializeGameState(stateWithCatalog(), undefined, catalog)) as Record<string, unknown>;
    const missing = structuredClone(raw);
    delete missing.objectives;
    expect(parseGameState(JSON.stringify(missing), undefined, catalog).status).toBe('corrupt');

    const malformed = structuredClone(raw);
    malformed.objectives = { entries: [{ objectiveId: 'sequential', completedStepIds: ['visit'], completed: false }] };
    expect(parseGameState(JSON.stringify(malformed), undefined, catalog).status).toBe('corrupt');
  });

  it('mantém o catálogo inicial vazio até a Fatia 10.5', () => {
    expect(freshState().objectives).toEqual({ entries: [] });
    expect(inspectGameState(freshState()).ok).toBe(true);
  });

  it.each([
    ['v1', asV1, ['ability']],
    ['v2', asV2, ['ability', 'visit']],
    ['v3', asV3, ['ability', 'visit']],
    ['v4', asV4, ['ability', 'visit']],
    ['v5', asV5, ['ability', 'visit']],
  ] as const)(
    'migra save %s, preserva os dados e sincroniza fatos já alcançados',
    (_label, toLegacy, expectedStepIds) => {
      const initial = stateWithCatalog();
      const source = {
        ...initial,
        progression: { abilityIds: ['olhar-atento'], titleIds: [] },
        sandbox: {
          ...initial.sandbox,
          navigation: {
            ...initial.sandbox.navigation,
            discoveredLocationIds: ['awakening-clearing', 'spring-lake'],
            unlockedLocationIds: ['awakening-clearing', 'spring-lake'],
            visitedLocationIds: ['awakening-clearing', 'spring-lake'],
          },
        },
        updatedAt: '2026-09-11T12:00:00.000Z',
      };
      const legacy = toLegacy(source, catalog);
      const snapshot = structuredClone(legacy);
      const parsed = parseGameState(JSON.stringify(legacy), undefined, catalog);

      expect(parsed.status).toBe('ok');
      if (parsed.status !== 'ok') {
        return;
      }
      expect(parsed.state.schemaVersion).toBe(SCHEMA_VERSION);
      expect(parsed.state.progression).toEqual(source.progression);
      expect(parsed.state.world).toEqual(source.world);
      expect(parsed.state.updatedAt).toBe(source.updatedAt);
      expect(parsed.state.objectives.entries[0]).toEqual({
        objectiveId: 'sequential',
        completedStepIds: [...expectedStepIds],
        completed: expectedStepIds.length === 2,
      });
      expect(legacy).toEqual(snapshot);
    },
  );

  it('preserva a sede existente ao migrar v5 para v6', () => {
    const source = { ...stateWithCatalog(), attributes: { ...stateWithCatalog().attributes, sede: 83 } };
    const raw = asV5(source, catalog);
    expect(raw.schemaVersion).toBe(SCHEMA_VERSION_V5);
    expect(inspectGameStateV5(raw).ok).toBe(true);

    const parsed = parseGameState(JSON.stringify(raw), undefined, catalog);
    expect(parsed.status).toBe('ok');
    if (parsed.status === 'ok') {
      expect(parsed.state.attributes.sede).toBe(83);
    }
  });

  it('carrega v5 sem regravar, avançar tempo ou alterar a entrada', () => {
    const source = {
      ...stateWithCatalog(),
      progression: { abilityIds: ['olhar-atento'], titleIds: [] },
      world: { day: 4, period: 'tarde' as const },
    };
    const legacy = asV5(source, catalog);
    const raw = JSON.stringify(legacy);
    const memory = new Map<string, string>([[SAVE_KEY, raw]]);
    const writes: string[] = [];
    const persistence = createPersistence(
      {
        getItem: (key) => memory.get(key) ?? null,
        setItem: (key, value) => {
          writes.push(key);
          memory.set(key, value);
        },
        removeItem: (key) => memory.delete(key),
      },
      undefined,
      catalog,
    );

    const loaded = persistence.load();
    expect(loaded.status).toBe('ok');
    if (loaded.status === 'ok') {
      expect(loaded.state.world).toEqual(source.world);
      expect(loaded.state.objectives.entries[0].completedStepIds).toEqual(['ability']);
    }
    expect(writes).toEqual([]);
    expect(memory.get(SAVE_KEY)).toBe(raw);
    expect(JSON.stringify(legacy)).toBe(raw);
  });
});
