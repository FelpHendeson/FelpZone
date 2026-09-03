import { describe, expect, it } from 'vitest';
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
  listKnownPresencesAtLocation,
  resolvePresence,
  synchronizeDiscoveredPresences,
  PresenceError,
  type IndexedPresences,
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

function asMutableMap<K, V>(value: ReadonlyMap<K, V>): Map<K, V> {
  return value as unknown as Map<K, V>;
}

function conditionalCatalog() {
  const map = worldMap();
  return indexPresenceCatalog(
    {
      entities: INITIAL_PRESENCE_CATALOG.entities,
      presences: [
        presence({
          id: 'mira-conditional',
          availabilityConditions: [{ type: 'flag.is', flag: 'met.mira', value: true }],
        }),
      ],
    },
    map,
    worldExploration(map),
  );
}

function forgeCatalog(
  catalog: IndexedPresences,
  overrides: {
    entities?: WorldEntityDefinition[];
    presences?: WorldPresenceDefinition[];
    byEntity?: Map<string, WorldEntityDefinition>;
    byPresence?: Map<string, WorldPresenceDefinition>;
    presenceIdsByLocation?: Map<string, readonly string[]>;
  },
): IndexedPresences {
  return {
    entities: overrides.entities ?? [...catalog.entities],
    presences: overrides.presences ?? [...catalog.presences],
    byEntity: overrides.byEntity ?? new Map(catalog.byEntity),
    byPresence: overrides.byPresence ?? new Map(catalog.byPresence),
    presenceIdsByLocation: overrides.presenceIdsByLocation ?? new Map(catalog.presenceIdsByLocation),
  };
}

function locationExploration(
  locationId: string,
  revealedDiscoveryIds: string[],
  progress: number,
): ExplorationState['locations'][number] {
  return {
    locationId,
    progress,
    revealedDiscoveryIds,
    explorationCount: 1,
  };
}

function explorationState(locations: ExplorationState['locations']): ExplorationState {
  return { locations };
}

function explorationAt(locationId: string, revealedDiscoveryIds: string[], progress: number): ExplorationState {
  return explorationState([locationExploration(locationId, revealedDiscoveryIds, progress)]);
}

function freezeExploration(state: ExplorationState): ExplorationState {
  return Object.freeze({
    locations: Object.freeze(
      state.locations.map((entry) =>
        Object.freeze({
          ...entry,
          revealedDiscoveryIds: Object.freeze([...entry.revealedDiscoveryIds]) as string[],
        }),
      ),
    ) as ExplorationState['locations'],
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

describe('sincronização com descobertas', () => {
  it('não revela presença quando a exploração não tem descobertas', () => {
    const catalog = worldCatalog();
    const previous = freezeState(createInitialPresenceState(catalog));
    const exploration = freezeExploration(createInitialExploration());
    const result = synchronizeDiscoveredPresences(catalog, previous, exploration);

    expect(result.newlyDiscoveredPresenceIds).toEqual([]);
    expect(result.current).toEqual(previous);
    expect(result.current).not.toBe(previous);
    expect(listKnownPresencesAtLocation(catalog, result.current, START)).toEqual([]);
  });

  it('revela Mira na Clareira quando first-priority-event está registrado', () => {
    const catalog = worldCatalog();
    const result = synchronizeDiscoveredPresences(
      catalog,
      freezeState(createInitialPresenceState(catalog)),
      freezeExploration(explorationAt(START, ['awakening-site', 'first-priority-event'], 10)),
    );

    expect(result.newlyDiscoveredPresenceIds).toEqual(['mira-awakening-clearing']);
    expect(result.current.discoveredPresenceIds).toEqual(['mira-awakening-clearing']);
    expect(result.current.resolvedPresenceIds).toEqual([]);
    expect(listKnownPresencesAtLocation(catalog, result.current, START).map((entry) => entry.presence.id)).toEqual([
      'mira-awakening-clearing',
    ]);
  });

  it('revela o coelho na Mata Densa quando horned-rabbit-tracks está registrado', () => {
    const catalog = worldCatalog();
    const result = synchronizeDiscoveredPresences(
      catalog,
      freezeState(createInitialPresenceState(catalog)),
      freezeExploration(explorationAt('dense-woods', ['horned-rabbit-tracks'], 40)),
    );

    expect(result.newlyDiscoveredPresenceIds).toEqual(['horned-rabbit-dense-woods']);
    expect(listKnownPresencesAtLocation(catalog, result.current, 'dense-woods').map((entry) => entry.entity.id)).toEqual(
      ['horned-rabbit'],
    );
    expect(listKnownPresencesAtLocation(catalog, result.current, START)).toEqual([]);
  });

  it('não revela presença de outro local', () => {
    const catalog = worldCatalog();
    const result = synchronizeDiscoveredPresences(
      catalog,
      freezeState(createInitialPresenceState(catalog)),
      freezeExploration(explorationAt('dense-woods', ['horned-rabbit-tracks'], 40)),
    );

    expect(result.newlyDiscoveredPresenceIds).not.toContain('mira-awakening-clearing');
    expect(getPresenceStatus(catalog, result.current, 'mira-awakening-clearing', START)).toBe('hidden');
  });

  it('sincroniza duas presenças da mesma descoberta na ordem do catálogo', () => {
    const map = worldMap();
    const catalog = indexPresenceCatalog(
      {
        entities: [
          ...INITIAL_PRESENCE_CATALOG.entities,
          entity({ id: 'mira-echo', name: 'Eco de Mira', description: 'Uma segunda ocorrência de teste.' }),
        ],
        presences: [
          presence({ id: 'mira-first' }),
          presence({ id: 'mira-second', entityId: 'mira-echo' }),
        ],
      },
      map,
      worldExploration(map),
    );

    const result = synchronizeDiscoveredPresences(
      catalog,
      freezeState(createInitialPresenceState(catalog)),
      freezeExploration(explorationAt(START, ['first-priority-event'], 10)),
    );

    expect(result.newlyDiscoveredPresenceIds).toEqual(['mira-first', 'mira-second']);
    expect(result.current.discoveredPresenceIds).toEqual(['mira-first', 'mira-second']);
  });

  it('sincronização repetida é idempotente e não relata IDs antigos como novos', () => {
    const catalog = worldCatalog();
    const exploration = freezeExploration(
      explorationState([
        locationExploration(START, ['first-priority-event'], 10),
        locationExploration('dense-woods', ['horned-rabbit-tracks'], 40),
      ]),
    );
    const first = synchronizeDiscoveredPresences(catalog, freezeState(createInitialPresenceState(catalog)), exploration);
    const second = synchronizeDiscoveredPresences(catalog, freezeState(first.current), exploration);

    expect(first.newlyDiscoveredPresenceIds).toEqual(['mira-awakening-clearing', 'horned-rabbit-dense-woods']);
    expect(second.newlyDiscoveredPresenceIds).toEqual([]);
    expect(second.current).toEqual(first.current);
    expect(second.current.discoveredPresenceIds).toEqual(['mira-awakening-clearing', 'horned-rabbit-dense-woods']);
  });

  it('preserva presença já resolvida e não resolve automaticamente', () => {
    const catalog = worldCatalog();
    const discovered = discoverPresence(catalog, createInitialPresenceState(catalog), 'mira-awakening-clearing');
    const resolved = freezeState(resolvePresence(catalog, freezeState(discovered), 'mira-awakening-clearing'));
    const result = synchronizeDiscoveredPresences(
      catalog,
      resolved,
      freezeExploration(explorationAt(START, ['first-priority-event'], 10)),
    );

    expect(result.newlyDiscoveredPresenceIds).toEqual([]);
    expect(result.current.resolvedPresenceIds).toEqual(['mira-awakening-clearing']);
    expect(result.current.discoveredPresenceIds).toEqual(['mira-awakening-clearing']);
  });

  it('rejeita estado de exploração malformado', () => {
    const catalog = worldCatalog();
    const previous = freezeState(createInitialPresenceState(catalog));

    expect(() => synchronizeDiscoveredPresences(catalog, previous, null as unknown as ExplorationState)).toThrow(
      PresenceError,
    );
    expect(() => synchronizeDiscoveredPresences(catalog, previous, { locations: 'broken' } as unknown as ExplorationState)).toThrow(
      /inválido/,
    );
    expect(() =>
      synchronizeDiscoveredPresences(
        catalog,
        previous,
        explorationState([
          locationExploration(START, ['first-priority-event'], 10),
          locationExploration(START, ['awakening-site'], 10),
        ]),
      ),
    ).toThrow(/duplicada/);
  });

  it('não muta catálogo, PresenceState nem ExplorationState recebidos', () => {
    const catalog = worldCatalog();
    const previous = freezeState(createInitialPresenceState(catalog));
    const exploration = freezeExploration(explorationAt(START, ['first-priority-event'], 10));
    const result = synchronizeDiscoveredPresences(catalog, previous, exploration);

    expect(previous).toEqual({ discoveredPresenceIds: [], resolvedPresenceIds: [] });
    expect(exploration.locations[0]?.revealedDiscoveryIds).toEqual(['first-priority-event']);
    expect(result.previous).not.toBe(previous);
    expect(result.current).not.toBe(previous);
    expect(() => result.newlyDiscoveredPresenceIds.push('hacked')).not.toThrow();
    expect(result.current.discoveredPresenceIds).toEqual(['mira-awakening-clearing']);
  });

  it('consulta exclui ocultas e deriva disponível, indisponível e resolvida', () => {
    const map = worldMap();
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
      worldExploration(map),
    );

    const hidden = freezeState(createInitialPresenceState(catalog));
    expect(listKnownPresencesAtLocation(catalog, hidden, START)).toEqual([]);

    const synced = synchronizeDiscoveredPresences(
      catalog,
      hidden,
      freezeExploration(
        explorationState([
          locationExploration(START, ['first-priority-event'], 10),
          locationExploration('dense-woods', ['horned-rabbit-tracks'], 40),
        ]),
      ),
    );

    expect(listKnownPresencesAtLocation(catalog, synced.current, START).map((entry) => entry.status)).toEqual([
      'unavailable',
    ]);
    expect(
      listKnownPresencesAtLocation(
        catalog,
        synced.current,
        START,
        createPresenceEvaluator({ ...freshState(), flags: { ...freshState().flags, 'met.mira': true } }),
      ).map((entry) => ({ id: entry.presence.id, status: entry.status, name: entry.entity.name })),
    ).toEqual([{ id: 'mira-conditional', status: 'available', name: 'Mira Vale' }]);

    const resolved = freezeState(resolvePresence(catalog, freezeState(synced.current), 'mira-conditional'));
    expect(listKnownPresencesAtLocation(catalog, resolved, START).map((entry) => entry.status)).toEqual(['resolved']);
    expect(listKnownPresencesAtLocation(catalog, synced.current, START).map((entry) => entry.presence.id)).not.toContain(
      'horned-rabbit-dense-woods',
    );
  });

  it('condições de disponibilidade não impedem a descoberta', () => {
    const map = worldMap();
    const catalog = indexPresenceCatalog(
      {
        entities: INITIAL_PRESENCE_CATALOG.entities,
        presences: [
          presence({
            id: 'mira-conditional',
            availabilityConditions: [{ type: 'flag.is', flag: 'met.mira', value: true }],
          }),
        ],
      },
      map,
      worldExploration(map),
    );

    const result = synchronizeDiscoveredPresences(
      catalog,
      freezeState(createInitialPresenceState(catalog)),
      freezeExploration(explorationAt(START, ['first-priority-event'], 10)),
    );

    expect(result.newlyDiscoveredPresenceIds).toEqual(['mira-conditional']);
    expect(getPresenceStatus(catalog, result.current, 'mira-conditional', START)).toBe('unavailable');
  });
});

describe('imutabilidade profunda e índices adversariais', () => {
  it('protege condições em profundidade e não altera o status derivado', () => {
    const catalog = conditionalCatalog();
    const discovered = freezeState(discoverPresence(catalog, createInitialPresenceState(catalog), 'mira-conditional'));
    const stored = catalog.byPresence.get('mira-conditional');
    expect(stored?.availabilityConditions).toHaveLength(1);

    const condition = stored?.availabilityConditions?.[0] as { flag: string; value: boolean };
    expect(() => {
      condition.flag = 'hacked';
    }).toThrow();
    expect(() => {
      condition.value = false;
    }).toThrow();
    expect(() => {
      (stored?.availabilityConditions as { type: string; flag: string; value: boolean }[]).push({
        type: 'flag.is',
        flag: 'always',
        value: true,
      });
    }).toThrow();
    expect(() => {
      (stored?.availabilityConditions as unknown[]).splice(0, 1);
    }).toThrow();

    expect(getPresenceStatus(catalog, discovered, 'mira-conditional', START)).toBe('unavailable');
    expect(
      getPresenceStatus(
        catalog,
        discovered,
        'mira-conditional',
        START,
        createPresenceEvaluator({ ...freshState(), flags: { ...freshState().flags, 'met.mira': true } }),
      ),
    ).toBe('available');
    expect(catalog.byPresence.get('mira-conditional')?.availabilityConditions).toEqual([
      { type: 'flag.is', flag: 'met.mira', value: true },
    ]);
  });

  it('rejeita mutação dos índices e não aceita presenças forjadas', () => {
    const catalog = worldCatalog();
    const byPresence = asMutableMap(catalog.byPresence);
    const byEntity = asMutableMap(catalog.byEntity);
    const byLocation = asMutableMap(catalog.presenceIdsByLocation);
    const fakePresence = presence({ id: 'forged-presence', entityId: 'mira-vale' });

    expect(() => byPresence.set('forged-presence', fakePresence)).toThrow(PresenceError);
    expect(() => byPresence.delete('mira-awakening-clearing')).toThrow(PresenceError);
    expect(() => byPresence.clear()).toThrow(PresenceError);
    expect(() => byEntity.set('forged-entity', entity({ id: 'forged-entity' }))).toThrow(PresenceError);
    expect(() => byEntity.delete('mira-vale')).toThrow(PresenceError);
    expect(() => byLocation.set('hacked-clearing', ['mira-awakening-clearing'])).toThrow(PresenceError);
    expect(() => byLocation.delete(START)).toThrow(PresenceError);

    expect(getPresence(catalog, 'mira-awakening-clearing').id).toBe('mira-awakening-clearing');
    expect(getEntity(catalog, 'mira-vale').id).toBe('mira-vale');
    expect(() => getPresence(catalog, 'forged-presence')).toThrow(PresenceError);
    expect(catalog.presenceIdsByLocation.get(START)).toEqual(['mira-awakening-clearing']);
  });

  it('rejeita catálogo indexado com arrays e mapas inconsistentes', () => {
    const catalog = worldCatalog();
    const fakePresence = presence({ id: 'forged-presence', entityId: 'mira-vale' });
    const extraPresence = new Map(catalog.byPresence);
    extraPresence.set('forged-presence', fakePresence);
    const extraEntity = new Map(catalog.byEntity);
    extraEntity.set('forged-entity', entity({ id: 'forged-entity' }));
    const extraLocation = new Map(catalog.presenceIdsByLocation);
    extraLocation.set('ghost-clearing', ['mira-awakening-clearing']);

    expect(() => getPresence(forgeCatalog(catalog, { byPresence: extraPresence }), 'mira-awakening-clearing')).toThrow(
      /inconsistente/,
    );
    expect(() => getEntity(forgeCatalog(catalog, { byEntity: extraEntity }), 'mira-vale')).toThrow(/inconsistente/);
    expect(() =>
      listDiscoveredPresencesAtLocation(
        forgeCatalog(catalog, { presenceIdsByLocation: extraLocation }),
        createInitialPresenceState(catalog),
        START,
      ),
    ).toThrow(/inconsistente/);
    expect(() =>
      discoverPresence(
        forgeCatalog(catalog, { byPresence: extraPresence }),
        createInitialPresenceState(catalog),
        'mira-awakening-clearing',
      ),
    ).toThrow(/inconsistente/);
    expect(inspectPresenceState(createInitialPresenceState(catalog), forgeCatalog(catalog, { byPresence: extraPresence })).ok).toBe(
      false,
    );
  });

  it('rejeita presença indexada em localização diferente do locationId', () => {
    const catalog = worldCatalog();
    const misplaced = new Map(catalog.presenceIdsByLocation);
    misplaced.set(START, ['horned-rabbit-dense-woods']);
    misplaced.set('dense-woods', ['mira-awakening-clearing']);

    const forged = forgeCatalog(catalog, { presenceIdsByLocation: misplaced });
    expect(() => getPresence(forged, 'mira-awakening-clearing')).toThrow(/localização diferente/);
    expect(() => listDiscoveredPresencesAtLocation(forged, createInitialPresenceState(catalog), START)).toThrow(
      /localização diferente/,
    );
  });

  it('rejeita estado cujo ID existe só em um índice adulterado', () => {
    const catalog = worldCatalog();
    const fakePresence = presence({ id: 'ghost-presence', entityId: 'mira-vale' });
    const adulterated = new Map(catalog.byPresence);
    adulterated.set('ghost-presence', fakePresence);

    const forged = forgeCatalog(catalog, { byPresence: adulterated });
    const inspected = inspectPresenceState(
      { discoveredPresenceIds: ['ghost-presence'], resolvedPresenceIds: [] },
      forged,
    );

    expect(inspected.ok).toBe(false);
    if (inspected.ok) {
      throw new Error('O estado com índice adulterado deveria ter sido rejeitado.');
    }
    expect(inspected.reason).toMatch(/inconsistente/);
    expect(() => resolvePresence(forged, createInitialPresenceState(catalog), 'ghost-presence')).toThrow(/inconsistente/);
  });

  it('preserva descoberta, resolução, consultas e status atuais', () => {
    const catalog = worldCatalog();
    const start = freezeState(createInitialPresenceState(catalog));
    const discovered = freezeState(discoverPresence(catalog, start, 'mira-awakening-clearing'));
    const resolved = freezeState(resolvePresence(catalog, discovered, 'mira-awakening-clearing'));
    const both = freezeState(discoverPresence(catalog, resolved, 'horned-rabbit-dense-woods'));

    expect(discovered.discoveredPresenceIds).toEqual(['mira-awakening-clearing']);
    expect(resolved.resolvedPresenceIds).toEqual(['mira-awakening-clearing']);
    expect(listDiscoveredPresencesAtLocation(catalog, both, START).map((entry) => entry.id)).toEqual([
      'mira-awakening-clearing',
    ]);
    expect(listDiscoveredPresencesAtLocation(catalog, both, 'dense-woods').map((entry) => entry.id)).toEqual([
      'horned-rabbit-dense-woods',
    ]);
    expect(getPresenceStatus(catalog, start, 'mira-awakening-clearing', START)).toBe('hidden');
    expect(getPresenceStatus(catalog, discovered, 'mira-awakening-clearing', START)).toBe('available');
    expect(getPresenceStatus(catalog, resolved, 'mira-awakening-clearing', START)).toBe('resolved');
    expect(getPresenceStatus(catalog, both, 'horned-rabbit-dense-woods', 'dense-woods')).toBe('available');
  });

  it('não reutiliza referências do catálogo original, inclusive condições', () => {
    const condition: { type: 'flag.is'; flag: string; value: boolean } = {
      type: 'flag.is',
      flag: 'met.mira',
      value: true,
    };
    const source: PresenceCatalog = {
      entities: INITIAL_PRESENCE_CATALOG.entities.map((entry) => ({ ...entry })),
      presences: [
        presence({
          id: 'mira-conditional',
          availabilityConditions: [condition],
        }),
      ],
    };
    const snapshot = structuredClone(source);
    const catalog = indexPresenceCatalog(source, worldMap(), worldExploration());

    condition.flag = 'hacked';
    condition.value = false;
    source.presences[0].id = 'mutated-source';
    source.presences[0].availabilityConditions = [{ type: 'flag.is', flag: 'always', value: true }];

    const discovered = freezeState(discoverPresence(catalog, createInitialPresenceState(catalog), 'mira-conditional'));
    expect(source.presences[0].id).toBe('mutated-source');
    expect(catalog.presences[0].id).toBe('mira-conditional');
    expect(catalog.byPresence.get('mira-conditional')?.availabilityConditions).toEqual([
      { type: 'flag.is', flag: 'met.mira', value: true },
    ]);
    expect(
      getPresenceStatus(
        catalog,
        discovered,
        'mira-conditional',
        START,
        createPresenceEvaluator({ ...freshState(), flags: { ...freshState().flags, 'met.mira': true } }),
      ),
    ).toBe('available');
    expect(source.entities).toEqual(snapshot.entities);
    expect(source.presences[0].availabilityConditions).toEqual([{ type: 'flag.is', flag: 'always', value: true }]);
  });
});
