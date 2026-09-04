import { describe, expect, it } from 'vitest';
import { firstDayCampaign } from '../campaigns/first-day';
import type { Campaign } from '../core/events';
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
  INITIAL_PRESENCE_INTERACTIONS,
  PRESENCE_INTERACTION_KINDS,
  PresenceError,
  createInitialPresenceState,
  createPresenceEvaluator,
  discoverPresence,
  indexPresenceCatalog,
  indexPresenceInteractionCatalog,
  inspectPresenceInteractionCatalog,
  listKnownPresenceInteractions,
  planPresenceInteraction,
  resolvePresence,
  type IndexedPresenceInteractions,
  type IndexedPresences,
  type PresenceInteractionCatalog,
  type PresenceInteractionDefinition,
  type PresenceState,
} from '../modules/presences';
import { freshState, stubCampaign } from './helpers';

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
): IndexedPresences {
  return indexPresenceCatalog(INITIAL_PRESENCE_CATALOG, map, exploration);
}

function worldInteractions(catalog: IndexedPresences = worldCatalog()): IndexedPresenceInteractions {
  return indexPresenceInteractionCatalog(INITIAL_PRESENCE_INTERACTIONS, catalog, firstDayCampaign);
}

function freezeState(state: PresenceState): PresenceState {
  return Object.freeze({
    discoveredPresenceIds: Object.freeze([...state.discoveredPresenceIds]) as string[],
    resolvedPresenceIds: Object.freeze([...state.resolvedPresenceIds]) as string[],
  });
}

function discoveredMira(catalog: IndexedPresences = worldCatalog()): PresenceState {
  return freezeState(discoverPresence(catalog, createInitialPresenceState(catalog), 'mira-awakening-clearing'));
}

function discoveredRabbit(catalog: IndexedPresences = worldCatalog()): PresenceState {
  return freezeState(discoverPresence(catalog, createInitialPresenceState(catalog), 'horned-rabbit-dense-woods'));
}

function interaction(
  overrides: Partial<PresenceInteractionDefinition> & Pick<PresenceInteractionDefinition, 'id'>,
): PresenceInteractionDefinition {
  return {
    presenceId: 'mira-awakening-clearing',
    kind: 'talk',
    label: overrides.label ?? 'Interação de teste',
    timeCost: { periods: 1 },
    resolvesPresence: false,
    ...overrides,
  };
}

function catalogFrom(overrides: Partial<PresenceInteractionCatalog>): PresenceInteractionCatalog {
  return {
    interactions: overrides.interactions ?? INITIAL_PRESENCE_INTERACTIONS.interactions,
  };
}

function inspectFrom(
  overrides: Partial<PresenceInteractionCatalog>,
  catalog: IndexedPresences = worldCatalog(),
  campaign?: Campaign,
) {
  return inspectPresenceInteractionCatalog(catalogFrom(overrides), catalog, campaign);
}

function rejected(
  overrides: Partial<PresenceInteractionCatalog>,
  catalog: IndexedPresences = worldCatalog(),
  campaign?: Campaign,
): string {
  const inspected = inspectFrom(overrides, catalog, campaign);
  expect(inspected.ok).toBe(false);
  if (inspected.ok) {
    throw new Error('O catálogo de interações deveria ter sido rejeitado.');
  }

  return inspected.reason;
}

function sessionCampaign(eventId = 'open-talk'): Campaign {
  const base = stubCampaign();
  return stubCampaign({
    events: [
      ...base.events,
      {
        id: eventId,
        title: 'Conversa de teste',
        body: 'Um diálogo possível.',
        image: { kind: 'scene', label: 'Conversa' },
        canStartSession: true,
        choices: [
          {
            id: 'leave',
            label: 'Encerrar',
            effects: [],
            transition: { type: 'returnToExploration' },
          },
        ],
      },
    ],
  });
}

function asMutableMap<K, V>(value: ReadonlyMap<K, V>): Map<K, V> {
  return value as unknown as Map<K, V>;
}

function forgeInteractions(
  interactions: IndexedPresenceInteractions,
  overrides: {
    interactions?: PresenceInteractionDefinition[];
    byId?: Map<string, PresenceInteractionDefinition>;
    byPresence?: Map<string, readonly PresenceInteractionDefinition[]>;
  },
): IndexedPresenceInteractions {
  return {
    interactions: overrides.interactions ?? [...interactions.interactions],
    byId: overrides.byId ?? new Map(interactions.byId),
    byPresence: overrides.byPresence ?? new Map(interactions.byPresence),
  };
}

describe('catálogo de interações', () => {
  it('indexa um catálogo válido por ID e por presença', () => {
    const catalog = worldCatalog();
    const inspected = inspectPresenceInteractionCatalog(
      INITIAL_PRESENCE_INTERACTIONS,
      catalog,
      firstDayCampaign,
    );

    expect(inspected.ok).toBe(true);
    if (!inspected.ok) {
      throw new Error(inspected.reason);
    }

    expect(inspected.value.byId.get('talk-mira-awakening-clearing')).toMatchObject({
      presenceId: 'mira-awakening-clearing',
      kind: 'talk',
      resolvesPresence: true,
      narrative: { campaignId: 'first-day', eventId: 'first-priority' },
    });
    expect(inspected.value.byId.get('observe-horned-rabbit-dense-woods')).toMatchObject({
      presenceId: 'horned-rabbit-dense-woods',
      kind: 'observe',
      resolvesPresence: false,
    });
    expect(inspected.value.byId.get('observe-horned-rabbit-dense-woods')?.narrative).toBeUndefined();
    expect(inspected.value.byPresence.get('mira-awakening-clearing')?.map((entry) => entry.id)).toEqual([
      'talk-mira-awakening-clearing',
    ]);
    expect(inspected.value.byPresence.get('horned-rabbit-dense-woods')?.map((entry) => entry.id)).toEqual([
      'observe-horned-rabbit-dense-woods',
    ]);
  });

  it('aceita todos os tipos aprovados', () => {
    const catalog = worldCatalog();
    const inspected = inspectPresenceInteractionCatalog(
      {
        interactions: PRESENCE_INTERACTION_KINDS.map((kind, index) =>
          interaction({
            id: `${kind}-mira`,
            kind,
            label: kind,
            timeCost: { periods: index },
            resolvesPresence: false,
          }),
        ),
      },
      catalog,
    );

    expect(inspected.ok).toBe(true);
    if (!inspected.ok) {
      throw new Error(inspected.reason);
    }

    expect([...inspected.value.byId.keys()]).toEqual(PRESENCE_INTERACTION_KINDS.map((kind) => `${kind}-mira`));
  });

  it('rejeita ID, tipo, presença, custo, condição, efeito e narrativa inválidos', () => {
    expect(rejected({ interactions: [interaction({ id: '' })] })).toMatch(/identificador/);
    expect(rejected({ interactions: [interaction({ id: 'dup' }), interaction({ id: 'dup' })] })).toMatch(/duplicada/);
    expect(
      rejected({
        interactions: [interaction({ id: 'attack-mira', kind: 'attack' as PresenceInteractionDefinition['kind'] })],
      }),
    ).toMatch(/desconhecido/);
    expect(rejected({ interactions: [interaction({ id: 'ghost', presenceId: 'missing-presence' })] })).toMatch(
      /presença/,
    );
    expect(rejected({ interactions: [interaction({ id: 'blank', label: '   ' })] })).toMatch(/rótulo/);
    expect(rejected({ interactions: [interaction({ id: 'bad-hint', hint: '   ' })] })).toMatch(/dica/);
    expect(
      rejected({ interactions: [interaction({ id: 'bad-cost', timeCost: { periods: -1 } })] }),
    ).toMatch(/custo de tempo/);
    expect(
      rejected({
        interactions: [interaction({ id: 'bad-condition', conditions: [{ type: 'unknown' } as never] })],
      }),
    ).toMatch(/condições malformadas/);
    expect(
      rejected({
        interactions: [interaction({ id: 'bad-effect', effects: [{ type: 'unknown' } as never] })],
      }),
    ).toMatch(/efeitos malformados/);
    expect(
      rejected({
        interactions: [interaction({ id: 'bad-feedback', feedback: '   ' })],
      }),
    ).toMatch(/feedback/);
    expect(
      rejected({
        interactions: [
          interaction({
            id: 'missing-event',
            narrative: { campaignId: 'first-day', eventId: 'evento-fantasma' },
          }),
        ],
      }, worldCatalog(), firstDayCampaign),
    ).toMatch(/não existe/);
    expect(
      rejected({
        interactions: [
          interaction({
            id: 'closed-event',
            narrative: { campaignId: 'first-day', eventId: 'awakening' },
          }),
        ],
      }, worldCatalog(), firstDayCampaign),
    ).toMatch(/sessão narrativa/);
    expect(
      rejected(
        {
          interactions: [
            interaction({
              id: 'orphan-narrative',
              narrative: { campaignId: 'first-day', eventId: 'first-priority' },
            }),
          ],
        },
        worldCatalog(),
      ),
    ).toMatch(/campanha/);
    expect(
      rejected({
        interactions: [
          interaction({
            id: 'resolve-rabbit',
            presenceId: 'horned-rabbit-dense-woods',
            kind: 'observe',
            resolvesPresence: true,
          }),
        ],
      }),
    ).toMatch(/não pode resolver/);
  });

  it('não muta o conteúdo original ao indexar', () => {
    const source: PresenceInteractionCatalog = {
      interactions: INITIAL_PRESENCE_INTERACTIONS.interactions.map((entry) => ({
        ...entry,
        timeCost: { ...entry.timeCost },
        narrative: entry.narrative ? { ...entry.narrative } : undefined,
      })),
    };
    const snapshot = structuredClone(source);
    const indexed = indexPresenceInteractionCatalog(source, worldCatalog(), firstDayCampaign);

    expect(source).toEqual(snapshot);
    expect(indexed.interactions).not.toBe(source.interactions);
    source.interactions[0].id = 'mutated';
    expect(indexed.byId.has('talk-mira-awakening-clearing')).toBe(true);
  });
});

describe('consulta de interações conhecidas', () => {
  it('não expõe interações de presença oculta', () => {
    const catalog = worldCatalog();
    const interactions = worldInteractions(catalog);
    const hidden = freezeState(createInitialPresenceState(catalog));

    expect(listKnownPresenceInteractions(catalog, interactions, hidden, 'mira-awakening-clearing', START)).toEqual([]);
    expect(
      listKnownPresenceInteractions(catalog, interactions, hidden, 'horned-rabbit-dense-woods', 'dense-woods'),
    ).toEqual([]);
  });

  it('bloqueia presença indisponível ou resolvida com motivo seguro', () => {
    const map = worldMap();
    const catalog = indexPresenceCatalog(
      {
        entities: INITIAL_PRESENCE_CATALOG.entities,
        presences: [
          {
            id: 'mira-awakening-clearing',
            entityId: 'mira-vale',
            locationId: START,
            discoveryId: 'first-priority-event',
            availabilityConditions: [{ type: 'flag.is', flag: 'met.mira', value: true }],
            resolvable: true,
          },
        ],
      },
      map,
      worldExploration(map),
    );
    const interactions = indexPresenceInteractionCatalog(
      {
        interactions: [interaction({ id: 'talk-mira-awakening-clearing', kind: 'talk', resolvesPresence: true })],
      },
      catalog,
    );
    const discovered = freezeState(discoverPresence(catalog, createInitialPresenceState(catalog), 'mira-awakening-clearing'));

    expect(
      listKnownPresenceInteractions(catalog, interactions, discovered, 'mira-awakening-clearing', START).map(
        (entry) => ({
          id: entry.interaction.id,
          available: entry.available,
          blockedReason: entry.blockedReason,
        }),
      ),
    ).toEqual([
      {
        id: 'talk-mira-awakening-clearing',
        available: false,
        blockedReason: 'A presença não está disponível.',
      },
    ]);

    const resolved = freezeState(resolvePresence(catalog, discovered, 'mira-awakening-clearing'));
    expect(
      listKnownPresenceInteractions(catalog, interactions, resolved, 'mira-awakening-clearing', START)[0],
    ).toMatchObject({
      available: false,
      blockedReason: 'A presença já foi resolvida.',
    });
  });

  it('mostra interação conhecida bloqueada por condição da própria interação', () => {
    const catalog = worldCatalog();
    const interactions = indexPresenceInteractionCatalog(
      {
        interactions: [
          interaction({
            id: 'talk-if-ready',
            conditions: [{ type: 'flag.is', flag: 'ready.to.talk', value: true }],
          }),
        ],
      },
      catalog,
    );
    const discovered = discoveredMira(catalog);

    expect(
      listKnownPresenceInteractions(catalog, interactions, discovered, 'mira-awakening-clearing', START),
    ).toEqual([
      expect.objectContaining({
        available: false,
        blockedReason: 'As condições da interação não foram satisfeitas.',
      }),
    ]);

    expect(
      listKnownPresenceInteractions(
        catalog,
        interactions,
        discovered,
        'mira-awakening-clearing',
        START,
        createPresenceEvaluator({ ...freshState(), flags: { ...freshState().flags, 'ready.to.talk': true } }),
      ).map((entry) => ({ id: entry.interaction.id, available: entry.available })),
    ).toEqual([{ id: 'talk-if-ready', available: true }]);
  });
});

describe('planejamento puro de interação', () => {
  it('planeja interação narrativa sem abrir sessão nem resolver presença', () => {
    const catalog = worldCatalog();
    const interactions = worldInteractions(catalog);
    const state = discoveredMira(catalog);
    const game = freshState();
    const snapshot = structuredClone(game);
    const plan = planPresenceInteraction(
      catalog,
      interactions,
      state,
      'mira-awakening-clearing',
      'talk-mira-awakening-clearing',
      START,
      game,
    );

    expect(plan).toEqual({
      interactionId: 'talk-mira-awakening-clearing',
      presenceId: 'mira-awakening-clearing',
      timeCost: { periods: 1 },
      effects: [],
      narrative: { campaignId: 'first-day', eventId: 'first-priority' },
      resolvesPresence: true,
    });
    expect(state.resolvedPresenceIds).toEqual([]);
    expect(game).toEqual(snapshot);
    expect(game.narrativeSession).toEqual(snapshot.narrativeSession);
  });

  it('planeja interação sem narrativa e devolve cópias defensivas', () => {
    const catalog = worldCatalog();
    const interactions = indexPresenceInteractionCatalog(
      {
        interactions: [
          interaction({
            id: 'observe-horned-rabbit-dense-woods',
            presenceId: 'horned-rabbit-dense-woods',
            kind: 'observe',
            label: 'Observar',
            timeCost: { periods: 1 },
            effects: [{ type: 'flag.set', flag: 'saw.horned.rabbit', value: true }],
            feedback: 'O animal permanece à distância.',
            resolvesPresence: false,
          }),
        ],
      },
      catalog,
    );
    const state = discoveredRabbit(catalog);
    const plan = planPresenceInteraction(
      catalog,
      interactions,
      state,
      'horned-rabbit-dense-woods',
      'observe-horned-rabbit-dense-woods',
      'dense-woods',
    );

    expect(plan.narrative).toBeUndefined();
    expect(plan.feedback).toBe('O animal permanece à distância.');
    expect(plan.effects).toEqual([{ type: 'flag.set', flag: 'saw.horned.rabbit', value: true }]);

    plan.timeCost.periods = 99;
    plan.effects[0] = { type: 'flag.set', flag: 'hacked', value: false };
    if (plan.narrative) {
      plan.narrative.eventId = 'hacked';
    }

    const again = planPresenceInteraction(
      catalog,
      interactions,
      state,
      'horned-rabbit-dense-woods',
      'observe-horned-rabbit-dense-woods',
      'dense-woods',
    );
    expect(again.timeCost).toEqual({ periods: 1 });
    expect(again.effects).toEqual([{ type: 'flag.set', flag: 'saw.horned.rabbit', value: true }]);
    expect(interactions.byId.get('observe-horned-rabbit-dense-woods')?.effects).toEqual([
      { type: 'flag.set', flag: 'saw.horned.rabbit', value: true },
    ]);
  });

  it('não aceita presença oculta, indisponível ou resolvida', () => {
    const catalog = worldCatalog();
    const interactions = worldInteractions(catalog);
    const hidden = freezeState(createInitialPresenceState(catalog));

    expect(() =>
      planPresenceInteraction(
        catalog,
        interactions,
        hidden,
        'mira-awakening-clearing',
        'talk-mira-awakening-clearing',
        START,
      ),
    ).toThrow(/oculta/);

    const discovered = discoveredMira(catalog);
    expect(() =>
      planPresenceInteraction(
        catalog,
        interactions,
        discovered,
        'mira-awakening-clearing',
        'talk-mira-awakening-clearing',
        'dense-woods',
      ),
    ).toThrow(/não está disponível/);

    const resolved = freezeState(resolvePresence(catalog, discovered, 'mira-awakening-clearing'));
    expect(() =>
      planPresenceInteraction(
        catalog,
        interactions,
        resolved,
        'mira-awakening-clearing',
        'talk-mira-awakening-clearing',
        START,
      ),
    ).toThrow(/já foi resolvida/);
    expect(resolved.resolvedPresenceIds).toEqual(['mira-awakening-clearing']);
  });

  it('rejeita interação de outra presença ou bloqueada por condição', () => {
    const catalog = worldCatalog();
    const interactions = worldInteractions(catalog);
    const mira = discoveredMira(catalog);

    expect(() =>
      planPresenceInteraction(
        catalog,
        interactions,
        mira,
        'mira-awakening-clearing',
        'observe-horned-rabbit-dense-woods',
        START,
      ),
    ).toThrow(/não pertence/);

    const gated = indexPresenceInteractionCatalog(
      {
        interactions: [
          interaction({
            id: 'talk-if-ready',
            conditions: [{ type: 'flag.is', flag: 'ready.to.talk', value: true }],
            effects: [{ type: 'attribute.change', attribute: 'cautela', amount: 1 }],
          }),
        ],
      },
      catalog,
    );

    expect(() =>
      planPresenceInteraction(catalog, gated, mira, 'mira-awakening-clearing', 'talk-if-ready', START),
    ).toThrow(/condições da interação/);
  });

  it('não altera PresenceState, GameState ou catálogo e o erro não deixa alteração parcial', () => {
    const catalog = worldCatalog();
    const interactions = worldInteractions(catalog);
    const state = discoveredMira(catalog);
    const game = Object.freeze({ ...freshState(), flags: Object.freeze({ ...freshState().flags }) });
    const stateSnapshot = structuredClone(state);
    const gameSnapshot = structuredClone(game);
    const catalogSnapshot = catalog.presences.map((entry) => entry.id);

    const plan = planPresenceInteraction(
      catalog,
      interactions,
      state,
      'mira-awakening-clearing',
      'talk-mira-awakening-clearing',
      START,
      game,
    );
    expect(plan.resolvesPresence).toBe(true);
    expect(state).toEqual(stateSnapshot);
    expect(game).toEqual(gameSnapshot);
    expect(catalog.presences.map((entry) => entry.id)).toEqual(catalogSnapshot);
    expect(game.narrativeSession?.eventId).not.toBe('first-priority');

    try {
      planPresenceInteraction(
        catalog,
        interactions,
        freezeState(createInitialPresenceState(catalog)),
        'mira-awakening-clearing',
        'talk-mira-awakening-clearing',
        START,
        game,
      );
      throw new Error('O planejamento deveria ter falhado.');
    } catch (error) {
      expect(error).toBeInstanceOf(PresenceError);
      expect(state).toEqual(stateSnapshot);
      expect(game).toEqual(gameSnapshot);
    }
  });

  it('preserva entradas congeladas', () => {
    const catalog = worldCatalog();
    const source = Object.freeze({
      interactions: Object.freeze(
        INITIAL_PRESENCE_INTERACTIONS.interactions.map((entry) =>
          Object.freeze({
            ...entry,
            timeCost: Object.freeze({ ...entry.timeCost }),
            narrative: entry.narrative ? Object.freeze({ ...entry.narrative }) : undefined,
          }),
        ),
      ) as PresenceInteractionDefinition[],
    });
    const interactions = indexPresenceInteractionCatalog(source, catalog, firstDayCampaign);
    const state = discoveredMira(catalog);
    const plan = planPresenceInteraction(
      catalog,
      interactions,
      state,
      'mira-awakening-clearing',
      'talk-mira-awakening-clearing',
      START,
    );

    expect(source.interactions[0]?.id).toBe('talk-mira-awakening-clearing');
    expect(plan.interactionId).toBe('talk-mira-awakening-clearing');
    expect(() => asMutableMap(interactions.byId).set('hacked', interaction({ id: 'hacked' }))).toThrow(PresenceError);
    expect(() => asMutableMap(interactions.byPresence).clear()).toThrow(PresenceError);
  });

  it('rejeita catálogo indexado inconsistente sem produzir plano', () => {
    const catalog = worldCatalog();
    const interactions = worldInteractions(catalog);
    const extra = new Map(interactions.byId);
    extra.set('forged-talk', interaction({ id: 'forged-talk' }));
    const forged = forgeInteractions(interactions, { byId: extra });
    const state = discoveredMira(catalog);

    expect(() =>
      planPresenceInteraction(
        catalog,
        forged,
        state,
        'mira-awakening-clearing',
        'talk-mira-awakening-clearing',
        START,
      ),
    ).toThrow(/inconsistente/);
    expect(state.discoveredPresenceIds).toEqual(['mira-awakening-clearing']);
  });
});

describe('campanha de sessão compatível', () => {
  it('aceita evento de teste com canStartSession sem usar o primeiro evento da campanha', () => {
    const catalog = worldCatalog();
    const campaign = sessionCampaign('open-talk');
    const inspected = inspectPresenceInteractionCatalog(
      {
        interactions: [
          interaction({
            id: 'talk-open',
            narrative: { campaignId: 'stub', eventId: 'open-talk' },
          }),
        ],
      },
      catalog,
      campaign,
    );

    expect(inspected.ok).toBe(true);
  });
});
