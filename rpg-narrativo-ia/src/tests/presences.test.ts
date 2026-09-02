import { describe, expect, it } from 'vitest';
import {
  INITIAL_EXPLORATION_DEFINITIONS,
  indexExplorationDefinitions,
  type IndexedExploration,
} from '../modules/exploration';
import {
  DEFAULT_STARTING_LOCATION_ID,
  INITIAL_WORLD_MAP,
  indexNavigationMap,
  type IndexedMap,
} from '../modules/navigation';
import {
  INITIAL_PRESENCE_CATALOG,
  createInitialPresenceState,
  createPresenceEvaluator,
  discoverPresence,
  getEntity,
  getPresence,
  getPresenceStatus,
  indexPresenceCatalog,
  inspectPresenceCatalog,
  inspectPresenceState,
  listDiscoveredPresencesAtLocation,
  resolvePresence,
  PresenceError,
  type PresenceCatalog,
  type PresenceState,
  type WorldEntityDefinition,
  type WorldPresenceDefinition,
} from '../modules/presences';
import { freshState } from './helpers';

const START = DEFAULT_STARTING_LOCATION_ID;

function worldMap(): IndexedMap {
  return indexNavigationMap(INITIAL_WORLD_MAP, START);
}

function worldExploration(map: IndexedMap = worldMap()): IndexedExploration {
  return indexExplorationDefinitions(INITIAL_EXPLORATION_DEFINITIONS, map);
}

function worldCatalog(
  map: IndexedMap = worldMap(),
  exploration: IndexedExploration = worldExploration(map),
) {
  return indexPresenceCatalog(INITIAL_PRESENCE_CATALOG, map, exploration);
}

function catalogFrom(overrides: Partial<PresenceCatalog>) {
  return {
    entities: overrides.entities ?? INITIAL_PRESENCE_CATALOG.entities,
    presences: overrides.presences ?? INITIAL_PRESENCE_CATALOG.presences,
  };
}

function inspectFrom(overrides: Partial<PresenceCatalog>) {
  const map = worldMap();
  return inspectPresenceCatalog(catalogFrom(overrides), map, worldExploration(map));
}

function rejected(overrides: Partial<PresenceCatalog>): string {
  const inspected = inspectFrom(overrides);
  expect(inspected.ok).toBe(false);
  if (inspected.ok) {
    throw new Error('O catálogo deveria ter sido rejeitado.');
  }

  return inspected.reason;
}

function entity(overrides: Partial<WorldEntityDefinition> & Pick<WorldEntityDefinition, 'id'>): WorldEntityDefinition {
  return {
    kind: 'npc',
    name: overrides.name ?? 'Entidade de teste',
    description: overrides.description ?? 'Descrição de teste.',
    ...overrides,
  };
}

function presence(
  overrides: Partial<WorldPresenceDefinition> & Pick<WorldPresenceDefinition, 'id'>,
): WorldPresenceDefinition {
  return {
    entityId: 'mira-vale',
    locationId: START,
    discoveryId: 'first-priority-event',
    resolvable: true,
    ...overrides,
  };
}

function rejectedState(state: unknown, catalog: ReturnType<typeof worldCatalog>): string {
  const inspected = inspectPresenceState(state, catalog);
  expect(inspected.ok).toBe(false);
  if (inspected.ok) {
    throw new Error('O estado deveria ter sido rejeitado.');
  }

  return inspected.reason;
}

function freezeState(state: PresenceState): PresenceState {
  return Object.freeze({
    discoveredPresenceIds: Object.freeze([...state.discoveredPresenceIds]) as string[],
    resolvedPresenceIds: Object.freeze([...state.resolvedPresenceIds]) as string[],
  });
}

describe('catálogo de presenças', () => {
  it('indexa um catálogo válido com Mira e coelho chifrudo', () => {
    const map = worldMap();
    const exploration = worldExploration(map);
    const inspected = inspectPresenceCatalog(INITIAL_PRESENCE_CATALOG, map, exploration);

    expect(inspected.ok).toBe(true);
    if (!inspected.ok) {
      throw new Error(inspected.reason);
    }

    expect(inspected.value.byEntity.get('mira-vale')?.kind).toBe('npc');
    expect(inspected.value.byEntity.get('horned-rabbit')?.kind).toBe('animal');
    expect(inspected.value.byPresence.get('mira-awakening-clearing')).toMatchObject({
      entityId: 'mira-vale',
      locationId: START,
      discoveryId: 'first-priority-event',
      resolvable: true,
    });
    expect(inspected.value.byPresence.get('horned-rabbit-dense-woods')).toMatchObject({
      entityId: 'horned-rabbit',
      locationId: 'dense-woods',
      discoveryId: 'horned-rabbit-tracks',
      resolvable: false,
    });
    expect(inspected.value.presenceIdsByLocation.get(START)).toEqual(['mira-awakening-clearing']);
  });

  it('rejeita IDs vazios e duplicados', () => {
    expect(inspectFrom({ entities: [entity({ id: '' })] }).ok).toBe(false);
    expect(inspectFrom({ presences: [presence({ id: '   ' })] }).ok).toBe(false);
    expect(
      rejected({
        entities: [entity({ id: 'mira-vale' }), entity({ id: 'mira-vale', name: 'Outra' })],
      }),
    ).toMatch(/duplicada/);
    expect(
      rejected({
        presences: [presence({ id: 'mira-awakening-clearing' }), presence({ id: 'mira-awakening-clearing' })],
      }),
    ).toMatch(/duplicada/);
  });

  it('rejeita tipo de entidade desconhecido', () => {
    expect(
      rejected({
        entities: [{ ...entity({ id: 'shade' }), kind: 'spirit' as WorldEntityDefinition['kind'] }],
      }),
    ).toMatch(/desconhecido/);
  });

  it('rejeita entidade, localização ou descoberta inexistente', () => {
    expect(rejected({ presences: [presence({ id: 'ghost', entityId: 'missing-npc' })] })).toMatch(/entidade/);
    expect(rejected({ presences: [presence({ id: 'ghost', locationId: 'missing-place' })] })).toMatch(/localização/);
    expect(rejected({ presences: [presence({ id: 'ghost', discoveryId: 'missing-discovery' })] })).toMatch(
      /descoberta/,
    );
  });

  it('rejeita divergência entre o local da presença e da descoberta', () => {
    expect(
      rejected({
        presences: [
          presence({
            id: 'misplaced-rabbit',
            entityId: 'horned-rabbit',
            locationId: START,
            discoveryId: 'horned-rabbit-tracks',
          }),
        ],
      }),
    ).toMatch(/locais diferentes/);
  });

  it('rejeita imagem e condições malformadas', () => {
    expect(
      rejected({
        entities: [entity({ id: 'broken', image: { kind: 'banner' as 'scene', label: 'X' } })],
      }),
    ).toMatch(/imagem malformada/);
    expect(
      rejected({
        presences: [presence({ id: 'broken-presence', availabilityConditions: [{ type: 'unknown' } as never] })],
      }),
    ).toMatch(/condições malformadas/);
  });

  it('aceita o tipo creature em um catálogo de teste', () => {
    const inspected = inspectFrom({
      entities: [
        ...INITIAL_PRESENCE_CATALOG.entities,
        entity({
          id: 'reset-beast',
          kind: 'creature',
          name: 'Besta do Reset',
          description: 'Uma presença hostil ainda sem combate.',
        }),
      ],
      presences: [
        ...INITIAL_PRESENCE_CATALOG.presences,
        presence({
          id: 'beast-clearing',
          entityId: 'reset-beast',
          discoveryId: 'awakening-site',
          resolvable: true,
        }),
      ],
    });

    expect(inspected.ok).toBe(true);
    if (!inspected.ok) {
      throw new Error(inspected.reason);
    }
    expect(inspected.value.byEntity.get('reset-beast')?.kind).toBe('creature');
  });
});

describe('estado isolado de presenças', () => {
  it('cria estado inicial vazio e serializável', () => {
    const catalog = worldCatalog();
    const state = createInitialPresenceState(catalog);
    const roundtrip = JSON.parse(JSON.stringify(state)) as PresenceState;

    expect(state).toEqual({ discoveredPresenceIds: [], resolvedPresenceIds: [] });
    expect(inspectPresenceState(roundtrip, catalog)).toEqual({ ok: true, value: state });
  });

  it('descobre uma presença exatamente uma vez sem mutar o estado recebido', () => {
    const catalog = worldCatalog();
    const previous = freezeState(createInitialPresenceState(catalog));
    const current = discoverPresence(catalog, previous, 'mira-awakening-clearing');

    expect(previous).toEqual({ discoveredPresenceIds: [], resolvedPresenceIds: [] });
    expect(current.discoveredPresenceIds).toEqual(['mira-awakening-clearing']);
    expect(current).not.toBe(previous);
  });

  it('descoberta repetida é idempotente', () => {
    const catalog = worldCatalog();
    const first = discoverPresence(catalog, createInitialPresenceState(catalog), 'mira-awakening-clearing');
    const frozen = freezeState(first);
    const second = discoverPresence(catalog, frozen, 'mira-awakening-clearing');

    expect(second).toEqual(first);
    expect(second).not.toBe(frozen);
    expect(frozen.discoveredPresenceIds).toEqual(['mira-awakening-clearing']);
  });

  it('resolução exige presença descoberta e resolvível', () => {
    const catalog = worldCatalog();
    const start = freezeState(createInitialPresenceState(catalog));

    expect(() => resolvePresence(catalog, start, 'mira-awakening-clearing')).toThrow(PresenceError);
    expect(() => resolvePresence(catalog, start, 'mira-awakening-clearing')).toThrow(/não está descoberta/);

    const rabbit = freezeState(discoverPresence(catalog, start, 'horned-rabbit-dense-woods'));
    expect(() => resolvePresence(catalog, rabbit, 'horned-rabbit-dense-woods')).toThrow(/não pode ser resolvida/);
    expect(rabbit.resolvedPresenceIds).toEqual([]);
  });

  it('resolução repetida é idempotente e não muta o anterior', () => {
    const catalog = worldCatalog();
    const discovered = discoverPresence(catalog, createInitialPresenceState(catalog), 'mira-awakening-clearing');
    const resolved = resolvePresence(catalog, freezeState(discovered), 'mira-awakening-clearing');
    const frozen = freezeState(resolved);
    const again = resolvePresence(catalog, frozen, 'mira-awakening-clearing');

    expect(discovered.resolvedPresenceIds).toEqual([]);
    expect(resolved.resolvedPresenceIds).toEqual(['mira-awakening-clearing']);
    expect(again).toEqual(resolved);
    expect(frozen.resolvedPresenceIds).toEqual(['mira-awakening-clearing']);
  });

  it('rejeita estado restaurado malformado', () => {
    const catalog = worldCatalog();

    expect(inspectPresenceState(null, catalog).ok).toBe(false);
    expect(inspectPresenceState({ discoveredPresenceIds: ['mira-awakening-clearing'] }, catalog).ok).toBe(false);
    expect(
      rejectedState(
        { discoveredPresenceIds: ['mira-awakening-clearing', 'mira-awakening-clearing'], resolvedPresenceIds: [] },
        catalog,
      ),
    ).toMatch(/duplicados/);
    expect(
      rejectedState({ discoveredPresenceIds: ['missing-presence'], resolvedPresenceIds: [] }, catalog),
    ).toMatch(/inexistentes/);
    expect(
      rejectedState({ discoveredPresenceIds: [], resolvedPresenceIds: ['mira-awakening-clearing'] }, catalog),
    ).toMatch(/descoberta/);
    expect(
      rejectedState(
        {
          discoveredPresenceIds: ['horned-rabbit-dense-woods'],
          resolvedPresenceIds: ['horned-rabbit-dense-woods'],
        },
        catalog,
      ),
    ).toMatch(/não pode ser resolvida/);
  });
});

describe('consultas e status derivado', () => {
  it('consulta por local retorna somente presenças descobertas daquele local', () => {
    const catalog = worldCatalog();
    let state = createInitialPresenceState(catalog);
    state = discoverPresence(catalog, state, 'mira-awakening-clearing');
    state = discoverPresence(catalog, freezeState(state), 'horned-rabbit-dense-woods');

    expect(listDiscoveredPresencesAtLocation(catalog, freezeState(state), START).map((entry) => entry.id)).toEqual([
      'mira-awakening-clearing',
    ]);
    expect(listDiscoveredPresencesAtLocation(catalog, freezeState(state), 'dense-woods').map((entry) => entry.id)).toEqual(
      ['horned-rabbit-dense-woods'],
    );
    expect(listDiscoveredPresencesAtLocation(catalog, freezeState(state), 'great-tree')).toEqual([]);
  });

  it('não expõe presença oculta na consulta comum', () => {
    const catalog = worldCatalog();
    const state = freezeState(createInitialPresenceState(catalog));

    expect(listDiscoveredPresencesAtLocation(catalog, state, START)).toEqual([]);
    expect(getPresenceStatus(catalog, state, 'mira-awakening-clearing', START)).toBe('hidden');
  });

  it('deriva status hidden, available, unavailable e resolved', () => {
    const map = worldMap();
    const exploration = worldExploration(map);
    const catalog = indexPresenceCatalog(
      {
        entities: INITIAL_PRESENCE_CATALOG.entities,
        presences: [
          presence({
            id: 'mira-conditional',
            availabilityConditions: [{ type: 'flag.is', flag: 'met.mira', value: true }],
          }),
          presence({
            id: 'horned-rabbit-dense-woods',
            entityId: 'horned-rabbit',
            locationId: 'dense-woods',
            discoveryId: 'horned-rabbit-tracks',
            resolvable: false,
          }),
        ],
      },
      map,
      exploration,
    );

    const hidden = freezeState(createInitialPresenceState(catalog));
    expect(getPresenceStatus(catalog, hidden, 'mira-conditional', START)).toBe('hidden');

    const discovered = freezeState(discoverPresence(catalog, hidden, 'mira-conditional'));
    expect(getPresenceStatus(catalog, discovered, 'mira-conditional', START)).toBe('unavailable');
    expect(getPresenceStatus(catalog, discovered, 'mira-conditional', 'dense-woods')).toBe('unavailable');

    const available = getPresenceStatus(
      catalog,
      discovered,
      'mira-conditional',
      START,
      createPresenceEvaluator({ ...freshState(), flags: { ...freshState().flags, 'met.mira': true } }),
    );
    expect(available).toBe('available');

    const resolved = freezeState(resolvePresence(catalog, discovered, 'mira-conditional'));
    expect(getPresenceStatus(catalog, resolved, 'mira-conditional', START, createPresenceEvaluator(freshState()))).toBe(
      'resolved',
    );
  });

  it('arrays e objetos devolvidos não alteram os índices internos', () => {
    const catalog = worldCatalog();
    const discovered = freezeState(
      discoverPresence(catalog, createInitialPresenceState(catalog), 'mira-awakening-clearing'),
    );

    const entityCopy = getEntity(catalog, 'mira-vale');
    entityCopy.name = 'hacked';
    if (entityCopy.image) {
      entityCopy.image.label = 'hacked';
    }
    expect(getEntity(catalog, 'mira-vale').name).toBe('Mira Vale');
    expect(getEntity(catalog, 'mira-vale').image?.label).toBe('Mira Vale');

    const presenceCopy = getPresence(catalog, 'mira-awakening-clearing');
    presenceCopy.id = 'hacked';
    presenceCopy.locationId = 'hacked';
    expect(getPresence(catalog, 'mira-awakening-clearing').id).toBe('mira-awakening-clearing');
    expect(catalog.byPresence.get('mira-awakening-clearing')?.id).toBe('mira-awakening-clearing');

    const listed = listDiscoveredPresencesAtLocation(catalog, discovered, START);
    listed.push(getPresence(catalog, 'horned-rabbit-dense-woods'));
    listed[0].id = 'hacked';
    expect(listDiscoveredPresencesAtLocation(catalog, discovered, START).map((entry) => entry.id)).toEqual([
      'mira-awakening-clearing',
    ]);

    const locationIndex = catalog.presenceIdsByLocation.get(START);
    expect(locationIndex).toEqual(['mira-awakening-clearing']);
    expect(() => (locationIndex as string[]).push('hacked')).toThrow();
    expect(catalog.presenceIdsByLocation.get(START)).toEqual(['mira-awakening-clearing']);
  });

  it('consulta de entidade ou presença inexistente falha de forma controlada', () => {
    const catalog = worldCatalog();
    expect(() => getEntity(catalog, 'missing')).toThrow(PresenceError);
    expect(() => getPresence(catalog, 'missing')).toThrow(PresenceError);
    expect(() => indexPresenceCatalog({ entities: [], presences: [] }, worldMap(), worldExploration())).not.toThrow();
  });
});

describe('imutabilidade do catálogo recebido', () => {
  it('não muta as definições originais ao indexar', () => {
    const source: PresenceCatalog = {
      entities: INITIAL_PRESENCE_CATALOG.entities.map((entry) => ({ ...entry })),
      presences: INITIAL_PRESENCE_CATALOG.presences.map((entry) => ({ ...entry })),
    };
    const snapshot = structuredClone(source);
    const indexed = indexPresenceCatalog(source, worldMap(), worldExploration());

    expect(source).toEqual(snapshot);
    expect(getEntity(indexed, 'mira-vale').name).toBe('Mira Vale');
    expect(indexed.entities).not.toBe(source.entities);
    expect(indexed.presences).not.toBe(source.presences);
  });
});
