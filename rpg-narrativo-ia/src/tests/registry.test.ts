import { describe, expect, it } from 'vitest';
import { parseGameState, serializeGameState } from '../infrastructure/persistence';
import { SCHEMA_VERSION, type GameState } from '../core/state';
import {
  INITIAL_COMBAT,
  buildCombatResolution,
  createCombat,
  getEncounter,
  resolveTurn,
  type CombatState,
} from '../modules/combat';
import {
  INITIAL_REGISTRY,
  INITIAL_REGISTRY_CATALOG,
  RegistryError,
  createInitialRegistryState,
  indexRegistryCatalog,
  inspectRegistryCatalog,
  listVisibleRankings,
  planPatentClaim,
} from '../modules/registry';
import { executeSandboxAction } from '../modules/sandbox-actions';
import { buildSystemStatus } from '../modules/system-interface';
import { asV13, freshState } from './helpers';

function exploringState(): GameState {
  return { ...freshState(), narrativeSession: null };
}

function exploreTimes(state: GameState, times: number): GameState {
  let current = state;
  for (let index = 0; index < times; index += 1) {
    current = executeSandboxAction(current, { type: 'exploration.explore' }).current;
  }
  return current;
}

function fightToVictory(state: GameState): CombatState {
  let combat = createCombat(INITIAL_COMBAT, 'clearing-predator', {
    playerMaxHealth: state.attributes.saude,
    knownSkillIds: state.system.entries.map((entry) => entry.skillId),
  });
  let safety = 0;
  while (combat.outcome === 'ongoing' && safety < 50) {
    combat = resolveTurn(INITIAL_COMBAT, combat, 'focus-strike');
    safety += 1;
  }
  return combat;
}

function catalogWithPolicy(kind: 'universal' | 'awakening' | 'selection' | 'inheritance' | 'grant' | 'restriction') {
  const catalog = structuredClone(INITIAL_REGISTRY_CATALOG);
  catalog.policy.kind = kind;
  return catalog;
}

describe('Sistema 20 — Registro, patentes e rankings', () => {
  it('rejeita política, métrica e ranking inválidos e preserva índice imutável', () => {
    expect(
      inspectRegistryCatalog({
        policy: { kind: 'lottery', eligibleSpecies: ['human'] },
        rankings: [],
        patents: [],
      }).ok,
    ).toBe(false);
    expect(
      inspectRegistryCatalog({
        ...INITIAL_REGISTRY_CATALOG,
        rankings: [
          {
            ...INITIAL_REGISTRY_CATALOG.rankings[0],
            metric: { type: 'hp.max' },
          },
        ],
      }).ok,
    ).toBe(false);
    expect(
      inspectRegistryCatalog({
        ...INITIAL_REGISTRY_CATALOG,
        rankings: [INITIAL_REGISTRY_CATALOG.rankings[0], INITIAL_REGISTRY_CATALOG.rankings[0]],
      }).ok,
    ).toBe(false);
    expect(() =>
      (INITIAL_REGISTRY.rankingById as Map<string, never>).set('local-exploration', {} as never),
    ).toThrow(RegistryError);
  });

  it('troca a política do pack sem editar o motor', () => {
    for (const kind of ['universal', 'awakening', 'selection', 'inheritance', 'grant', 'restriction'] as const) {
      const inspected = inspectRegistryCatalog(catalogWithPolicy(kind));
      expect(inspected.ok).toBe(true);
    }
    expect(createInitialRegistryState(indexRegistryCatalog(catalogWithPolicy('restriction'))).accessGranted).toBe(false);
    expect(createInitialRegistryState(indexRegistryCatalog(catalogWithPolicy('selection'))).accessGranted).toBe(false);
    expect(createInitialRegistryState(indexRegistryCatalog(catalogWithPolicy('universal'))).accessGranted).toBe(true);
  });

  it('não vaza ranking oculto nem concede patente só porque a métrica avançou', () => {
    const initial = exploringState();
    const serialized = JSON.stringify(buildSystemStatus(initial));
    expect(initial.registry.accessGranted).toBe(true);
    expect(initial.registry.patentIds).toEqual([]);
    expect(listVisibleRankings(INITIAL_REGISTRY, initial.registry, initial)).toEqual([]);
    expect(serialized).not.toContain('Ameaça da Clareira');
    expect(serialized).not.toContain('local-combat');
    expect(serialized).not.toContain('Rastros cautelosos');
    expect(serialized).not.toContain('Trilha apagada');

    const explored = exploreTimes(initial, 3);
    expect(explored.registry.recognizedRankingIds).toContain('local-exploration');
    expect(explored.registry.patentIds).toEqual([]);
    expect(explored.system.level).toBe(initial.system.level);
    expect(explored.progression.titleIds).toEqual(initial.progression.titleIds);
    const visible = listVisibleRankings(INITIAL_REGISTRY, explored.registry, explored);
    expect(visible.map((entry) => entry.rankingId)).toEqual(['local-exploration']);
    expect(visible[0]?.playerPosition).toBe(2);
    expect(visible[0]?.standings.map((entry) => entry.actorId)).toEqual(['old-marks', 'player', 'faded-trail']);
    expect(JSON.stringify(buildSystemStatus(explored))).not.toContain('Ameaça da Clareira');
  });

  it('resolve empate de forma determinística e só concede patente por reivindicação', () => {
    const tied = exploreTimes(exploringState(), 2);
    const ranking = listVisibleRankings(INITIAL_REGISTRY, tied.registry, tied)[0];
    expect(ranking?.standings.filter((entry) => entry.score === 20).map((entry) => entry.actorId)).toEqual([
      'player',
      'faded-trail',
    ]);
    expect(ranking?.playerPosition).toBe(2);
    expect(() => planPatentClaim(INITIAL_REGISTRY, tied.registry, tied, 'clearing-scout')).toThrow(RegistryError);

    const ready = exploreTimes(tied, 1);
    expect(ready.registry.patentIds).toEqual([]);
    const claimed = executeSandboxAction(ready, { type: 'registry.claim', patentId: 'clearing-scout' });
    expect(claimed.action).toEqual({ type: 'registry.claim', patentId: 'clearing-scout' });
    expect(claimed.action).not.toHaveProperty('position');
    expect(claimed.action).not.toHaveProperty('score');
    expect(claimed.timeCost.periods).toBe(0);
    expect(claimed.current.registry.patentIds).toEqual(['clearing-scout']);
    expect(claimed.current.system.level).toBe(ready.system.level);
    expect(claimed.current.progression.titleIds).toEqual(ready.progression.titleIds);
    expect(buildSystemStatus(claimed.current).registry.patents).toEqual([
      expect.objectContaining({ id: 'clearing-scout', granted: true, claimable: false }),
    ]);

    const raw = serializeGameState(claimed.current);
    expect(raw).not.toContain('faded-trail');
    expect(raw).not.toContain('old-marks');
    const loaded = parseGameState(raw);
    expect(loaded.status).toBe('ok');
    if (loaded.status === 'ok') {
      expect(loaded.state.schemaVersion).toBe(SCHEMA_VERSION);
      expect(loaded.state.registry).toEqual(claimed.current.registry);
      expect(loaded.state.registry).toEqual({
        accessGranted: true,
        patentIds: ['clearing-scout'],
        recognizedRankingIds: ['local-exploration'],
      });
    }
  });

  it('ação inválida é atômica e o ranking de combate não depende da Mira nem da Grande Árvore', () => {
    const initial = exploringState();
    const previous = structuredClone(initial);
    expect(() => executeSandboxAction(initial, { type: 'registry.claim', patentId: 'clearing-scout' })).toThrow();
    expect(initial).toEqual(previous);

    const explored = exploreTimes(initial, 3);
    const combat = fightToVictory(explored);
    expect(combat.outcome).toBe('victory');
    const afterCombat = executeSandboxAction(explored, {
      type: 'combat.resolve',
      resolution: buildCombatResolution(combat, getEncounter(INITIAL_COMBAT, 'clearing-predator')),
    }).current;

    expect(afterCombat.flags['mira.promise.made']).toBeUndefined();
    expect(afterCombat.sandbox.navigation.currentLocationId).toBe('awakening-clearing');
    expect(afterCombat.registry.recognizedRankingIds).toEqual(expect.arrayContaining(['local-exploration', 'local-combat']));
    const combatRanking = listVisibleRankings(INITIAL_REGISTRY, afterCombat.registry, afterCombat).find(
      (entry) => entry.rankingId === 'local-combat',
    );
    expect(combatRanking?.playerPosition).toBe(1);
    expect(combatRanking?.standings.map((entry) => entry.actorId)).toEqual(['player', 'wary-tracks']);
    expect(afterCombat.registry.patentIds).toEqual([]);
  });

  it('migra schema 13 sem conceder patente, ranking reconhecido ou catálogo no save', () => {
    const loaded = parseGameState(JSON.stringify(asV13(freshState())));
    expect(loaded.status).toBe('ok');
    if (loaded.status === 'ok') {
      expect(loaded.state.schemaVersion).toBe(SCHEMA_VERSION);
      expect(loaded.state.registry).toEqual({
        accessGranted: true,
        patentIds: [],
        recognizedRankingIds: [],
      });
      expect(JSON.stringify(loaded.state.registry)).not.toContain('clearing-scout');
      expect(JSON.stringify(loaded.state.registry)).not.toContain('local-exploration');
    }
    const raw = JSON.parse(serializeGameState(freshState())) as Record<string, unknown>;
    delete raw.registry;
    expect(parseGameState(JSON.stringify(raw)).status).toBe('corrupt');
  });

  it('o motor aceita outro ranking sem código da Clareira', () => {
    const inspected = inspectRegistryCatalog({
      policy: { kind: 'grant', eligibleSpecies: ['human'] },
      rankings: [
        {
          id: 'local-level',
          name: 'Marca interna',
          description: 'Ordenação por nível, sem misturar patente.',
          category: 'exploration',
          scope: 'personal',
          metric: { type: 'system.level' },
          visibility: 'public',
          competitors: [{ actorId: 'echo', name: 'Eco', score: 3 }],
        },
      ],
      patents: [
        {
          id: 'marked-scout',
          name: 'Marcado',
          description: 'Patente local distinta do nível.',
          requirements: [{ type: 'ranking.position.max', rankingId: 'local-level', position: 1 }],
        },
      ],
    });
    expect(inspected.ok).toBe(true);
  });
});
