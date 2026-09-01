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
  createPersistence,
  parseGameState,
  serializeGameState,
} from '../infrastructure/persistence';
import { createInitialCrafting, INITIAL_RECIPES, INITIAL_STRUCTURES } from '../modules/crafting';
import { createInitialExploration } from '../modules/exploration';
import { DEFAULT_STARTING_LOCATION_ID, createInitialNavigation } from '../modules/navigation';
import { createInitialResources, INITIAL_POPULATIONS, INITIAL_RESOURCE_NODES } from '../modules/resources';
import {
  createInitialSandboxState,
  createSandboxContext,
  inspectSandboxState,
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
