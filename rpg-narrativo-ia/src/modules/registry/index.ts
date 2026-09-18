import { combatEncounterResolvedFlag } from '../combat';
import { getLocationExploration } from '../exploration';
import type { GameState } from '../../core/state/types';
import { RegistryError } from './errors';
import { ImmutableIndex } from './immutable-index';
import { INITIAL_REGISTRY_CATALOG } from './initial-registry';
import type {
  IndexedRegistry,
  RegistryInspection,
  RegistryMetric,
  RegistryPatentDefinition,
  RegistryPatentPlan,
  RegistryPatentRequirement,
  RegistryPolicy,
  RegistryPolicyKind,
  RegistryRankingDefinition,
  RegistryRankingView,
  RegistryStanding,
  RegistryState,
} from './types';

export { RegistryError } from './errors';
export { INITIAL_REGISTRY_CATALOG } from './initial-registry';
export type {
  IndexedRegistry,
  RegistryCatalog,
  RegistryInspection,
  RegistryPatentPlan,
  RegistryRankingView,
  RegistryStanding,
  RegistryState,
} from './types';

export const PLAYER_SPECIES = 'human';
export const PLAYER_ACTOR_ID = 'player';
const POLICY_KINDS: readonly RegistryPolicyKind[] = [
  'universal',
  'awakening',
  'selection',
  'inheritance',
  'grant',
  'restriction',
];

export function inspectRegistryCatalog(value: unknown): RegistryInspection<IndexedRegistry> {
  if (!isRecord(value) || !isRecord(value.policy) || !Array.isArray(value.rankings) || !Array.isArray(value.patents)) {
    return fail('O catálogo do Registro é inválido.');
  }
  const policy = inspectPolicy(value.policy);
  if (!policy.ok) {
    return policy;
  }
  const rankings: RegistryRankingDefinition[] = [];
  const rankingById = new Map<string, RegistryRankingDefinition>();
  for (const entry of value.rankings) {
    const inspected = inspectRanking(entry, rankingById);
    if (!inspected.ok) {
      return inspected;
    }
    rankingById.set(inspected.value.id, inspected.value);
    rankings.push(inspected.value);
  }
  const patents: RegistryPatentDefinition[] = [];
  const patentById = new Map<string, RegistryPatentDefinition>();
  for (const entry of value.patents) {
    const inspected = inspectPatent(entry, patentById, rankingById);
    if (!inspected.ok) {
      return inspected;
    }
    patentById.set(inspected.value.id, inspected.value);
    patents.push(inspected.value);
  }
  return {
    ok: true,
    value: Object.freeze({
      policy: Object.freeze({
        kind: policy.value.kind,
        eligibleSpecies: Object.freeze([...policy.value.eligibleSpecies]),
      }),
      rankings: Object.freeze(rankings),
      patents: Object.freeze(patents),
      rankingById: new ImmutableIndex(rankings.map((ranking) => [ranking.id, ranking] as const)),
      patentById: new ImmutableIndex(patents.map((patent) => [patent.id, patent] as const)),
    }),
  };
}

export function indexRegistryCatalog(value: unknown = INITIAL_REGISTRY_CATALOG): IndexedRegistry {
  const inspected = inspectRegistryCatalog(value);
  if (!inspected.ok) {
    throw new RegistryError(inspected.reason);
  }
  return inspected.value;
}

export const INITIAL_REGISTRY = indexRegistryCatalog();

export function createInitialRegistryState(catalog: IndexedRegistry = INITIAL_REGISTRY): RegistryState {
  return {
    accessGranted: policyGrantsAccess(catalog.policy),
    patentIds: [],
    recognizedRankingIds: [],
  };
}

export function inspectRegistryState(
  value: unknown,
  catalog: IndexedRegistry = INITIAL_REGISTRY,
): RegistryInspection<RegistryState> {
  if (!isRecord(value) || typeof value.accessGranted !== 'boolean' || !Array.isArray(value.patentIds) || !Array.isArray(value.recognizedRankingIds)) {
    return fail('O estado do Registro é inválido.');
  }
  const patentIds = inspectIdList(value.patentIds, (id) => catalog.patentById.has(id));
  if (!patentIds.ok) {
    return patentIds;
  }
  const recognized = inspectIdList(value.recognizedRankingIds, (id) => catalog.rankingById.has(id));
  if (!recognized.ok) {
    return recognized;
  }
  return {
    ok: true,
    value: {
      accessGranted: value.accessGranted,
      patentIds: patentIds.value,
      recognizedRankingIds: recognized.value,
    },
  };
}

export function copyRegistryState(state: RegistryState): RegistryState {
  return {
    accessGranted: state.accessGranted,
    patentIds: [...state.patentIds],
    recognizedRankingIds: [...state.recognizedRankingIds],
  };
}

export function synchronizeRegistry(
  catalog: IndexedRegistry,
  state: RegistryState,
  gameState: GameState,
): RegistryState {
  const current = copyRegistryState(state);
  current.accessGranted = current.accessGranted || policyGrantsAccess(catalog.policy);
  for (const ranking of catalog.rankings) {
    if (current.recognizedRankingIds.includes(ranking.id)) {
      continue;
    }
    if (playerMetric(gameState, ranking.metric) > 0) {
      current.recognizedRankingIds.push(ranking.id);
    }
  }
  return current;
}

export function listVisibleRankings(
  catalog: IndexedRegistry,
  state: RegistryState,
  gameState: GameState,
): RegistryRankingView[] {
  if (!state.accessGranted) {
    return [];
  }
  return catalog.rankings.flatMap((ranking) => {
    if (ranking.visibility === 'known' && !state.recognizedRankingIds.includes(ranking.id)) {
      return [];
    }
    return [buildRankingView(catalog, ranking, gameState)];
  });
}

export function listGrantedPatents(catalog: IndexedRegistry, state: RegistryState): RegistryPatentDefinition[] {
  return state.patentIds.flatMap((id) => {
    const patent = catalog.patentById.get(id);
    return patent ? [patent] : [];
  });
}

export function planPatentClaim(
  catalog: IndexedRegistry,
  state: RegistryState,
  gameState: GameState,
  patentId: string,
): RegistryPatentPlan {
  if (!state.accessGranted) {
    throw new RegistryError('O Registro não está acessível.');
  }
  const patent = catalog.patentById.get(patentId);
  if (!patent) {
    throw new RegistryError('A patente não existe.');
  }
  if (state.patentIds.includes(patentId)) {
    throw new RegistryError('Esta patente já foi concedida.');
  }
  if (!patent.requirements.every((requirement) => patentRequirementMet(requirement, catalog, state, gameState))) {
    throw new RegistryError('Os requisitos desta patente não foram atendidos.');
  }
  return { patentId };
}

export function applyPatentClaim(state: RegistryState, plan: RegistryPatentPlan): RegistryState {
  const current = copyRegistryState(state);
  if (!current.patentIds.includes(plan.patentId)) {
    current.patentIds.push(plan.patentId);
  }
  return current;
}

export function playerRankingPosition(
  catalog: IndexedRegistry,
  rankingId: string,
  gameState: GameState,
): number | null {
  const ranking = catalog.rankingById.get(rankingId);
  if (!ranking) {
    return null;
  }
  return buildRankingView(catalog, ranking, gameState).playerPosition;
}

function buildRankingView(
  catalog: IndexedRegistry,
  ranking: RegistryRankingDefinition,
  gameState: GameState,
): RegistryRankingView {
  void catalog;
  const playerScore = playerMetric(gameState, ranking.metric);
  const entries = [
    ...ranking.competitors.map((competitor) => ({
      actorId: competitor.actorId,
      name: competitor.name,
      score: competitor.score,
      isPlayer: false,
    })),
    {
      actorId: PLAYER_ACTOR_ID,
      name: `${gameState.character.firstName} ${gameState.character.lastName}`.trim(),
      score: playerScore,
      isPlayer: true,
    },
  ].sort(compareStandings);
  const standings: RegistryStanding[] = entries.map((entry, index) => ({
    ...entry,
    position: index + 1,
  }));
  const player = standings.find((entry) => entry.isPlayer);
  return {
    rankingId: ranking.id,
    name: ranking.name,
    description: ranking.description,
    category: ranking.category,
    scope: ranking.scope,
    metricLabel: metricLabel(ranking.metric),
    standings,
    playerPosition: player?.position ?? null,
  };
}

function compareStandings(
  left: { score: number; name: string; actorId: string },
  right: { score: number; name: string; actorId: string },
): number {
  if (right.score !== left.score) {
    return right.score - left.score;
  }
  const byName = left.name.localeCompare(right.name, 'pt-BR');
  if (byName !== 0) {
    return byName;
  }
  return left.actorId.localeCompare(right.actorId, 'pt-BR');
}

function playerMetric(state: GameState, metric: RegistryMetric): number {
  if (metric.type === 'exploration.progress') {
    return getLocationExploration(state.sandbox.exploration, metric.locationId).progress;
  }
  if (metric.type === 'combat.victory') {
    return state.flags[combatEncounterResolvedFlag(metric.encounterId)] === true ? 1 : 0;
  }
  return state.system.level;
}

function patentRequirementMet(
  requirement: RegistryPatentRequirement,
  catalog: IndexedRegistry,
  state: RegistryState,
  gameState: GameState,
): boolean {
  if (requirement.type === 'flag.is') {
    return (gameState.flags[requirement.flag] ?? false) === requirement.value;
  }
  if (requirement.type === 'exploration.progress.min') {
    return playerMetric(gameState, { type: 'exploration.progress', locationId: requirement.locationId }) >= requirement.amount;
  }
  if (requirement.type === 'combat.victory') {
    return playerMetric(gameState, { type: 'combat.victory', encounterId: requirement.encounterId }) >= 1;
  }
  const position = playerRankingPosition(catalog, requirement.rankingId, gameState);
  return position !== null && position <= requirement.position && state.recognizedRankingIds.includes(requirement.rankingId);
}

function policyGrantsAccess(policy: RegistryPolicy): boolean {
  if (!policy.eligibleSpecies.includes(PLAYER_SPECIES)) {
    return false;
  }
  return policy.kind === 'universal' || policy.kind === 'awakening' || policy.kind === 'grant';
}

function inspectPolicy(value: Record<string, unknown>): RegistryInspection<RegistryPolicy> {
  if (
    typeof value.kind !== 'string' ||
    !POLICY_KINDS.includes(value.kind as RegistryPolicyKind) ||
    !Array.isArray(value.eligibleSpecies) ||
    value.eligibleSpecies.length === 0 ||
    value.eligibleSpecies.some((entry) => !nonEmpty(entry))
  ) {
    return fail('A política de acesso do Registro é inválida.');
  }
  return {
    ok: true,
    value: { kind: value.kind as RegistryPolicyKind, eligibleSpecies: value.eligibleSpecies as string[] },
  };
}

function inspectRanking(
  value: unknown,
  rankingById: ReadonlyMap<string, RegistryRankingDefinition>,
): RegistryInspection<RegistryRankingDefinition> {
  if (
    !isRecord(value) ||
    !nonEmpty(value.id) ||
    rankingById.has(value.id) ||
    !nonEmpty(value.name) ||
    !nonEmpty(value.description) ||
    (value.category !== 'exploration' && value.category !== 'combat') ||
    !nonEmpty(value.scope) ||
    (value.visibility !== 'public' && value.visibility !== 'known') ||
    !Array.isArray(value.competitors)
  ) {
    return fail('O ranking declarado é inválido.');
  }
  const metric = inspectMetric(value.metric);
  if (!metric.ok) {
    return metric;
  }
  const competitors = [];
  const seen = new Set<string>();
  for (const entry of value.competitors) {
    if (!isRecord(entry) || !nonEmpty(entry.actorId) || seen.has(entry.actorId) || !nonEmpty(entry.name) || !Number.isInteger(entry.score) || (entry.score as number) < 0) {
      return fail('O ranking declarado é inválido.');
    }
    seen.add(entry.actorId);
    competitors.push({ actorId: entry.actorId, name: entry.name, score: entry.score as number });
  }
  return {
    ok: true,
    value: {
      id: value.id,
      name: value.name,
      description: value.description,
      category: value.category,
      scope: value.scope,
      metric: metric.value,
      visibility: value.visibility,
      competitors,
    },
  };
}

function inspectPatent(
  value: unknown,
  patentById: ReadonlyMap<string, RegistryPatentDefinition>,
  rankings: ReadonlyMap<string, RegistryRankingDefinition>,
): RegistryInspection<RegistryPatentDefinition> {
  if (!isRecord(value) || !nonEmpty(value.id) || patentById.has(value.id) || !nonEmpty(value.name) || !nonEmpty(value.description) || !Array.isArray(value.requirements) || value.requirements.length === 0) {
    return fail('A patente declarada é inválida.');
  }
  const requirements: RegistryPatentRequirement[] = [];
  for (const entry of value.requirements) {
    const inspected = inspectPatentRequirement(entry, rankings);
    if (!inspected.ok) {
      return inspected;
    }
    requirements.push(inspected.value);
  }
  return { ok: true, value: { id: value.id, name: value.name, description: value.description, requirements } };
}

function inspectPatentRequirement(
  value: unknown,
  rankings: ReadonlyMap<string, RegistryRankingDefinition>,
): RegistryInspection<RegistryPatentRequirement> {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return fail('O requisito da patente é inválido.');
  }
  if (value.type === 'ranking.position.max') {
    if (!nonEmpty(value.rankingId) || !rankings.has(value.rankingId) || !Number.isInteger(value.position) || (value.position as number) <= 0) {
      return fail('O requisito da patente é inválido.');
    }
    return { ok: true, value: { type: 'ranking.position.max', rankingId: value.rankingId, position: value.position as number } };
  }
  if (value.type === 'flag.is') {
    if (!nonEmpty(value.flag) || typeof value.value !== 'boolean') {
      return fail('O requisito da patente é inválido.');
    }
    return { ok: true, value: { type: 'flag.is', flag: value.flag, value: value.value } };
  }
  if (value.type === 'exploration.progress.min') {
    if (!nonEmpty(value.locationId) || !Number.isInteger(value.amount) || (value.amount as number) < 0) {
      return fail('O requisito da patente é inválido.');
    }
    return { ok: true, value: { type: 'exploration.progress.min', locationId: value.locationId, amount: value.amount as number } };
  }
  if (value.type === 'combat.victory') {
    if (!nonEmpty(value.encounterId)) {
      return fail('O requisito da patente é inválido.');
    }
    return { ok: true, value: { type: 'combat.victory', encounterId: value.encounterId } };
  }
  return fail('O requisito da patente é inválido.');
}

function inspectMetric(value: unknown): RegistryInspection<RegistryMetric> {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return fail('A métrica do ranking é inválida.');
  }
  if (value.type === 'exploration.progress') {
    if (!nonEmpty(value.locationId)) {
      return fail('A métrica do ranking é inválida.');
    }
    return { ok: true, value: { type: 'exploration.progress', locationId: value.locationId } };
  }
  if (value.type === 'combat.victory') {
    if (!nonEmpty(value.encounterId)) {
      return fail('A métrica do ranking é inválida.');
    }
    return { ok: true, value: { type: 'combat.victory', encounterId: value.encounterId } };
  }
  if (value.type === 'system.level') {
    return { ok: true, value: { type: 'system.level' } };
  }
  return fail('A métrica do ranking é inválida.');
}

function metricLabel(metric: RegistryMetric): string {
  if (metric.type === 'exploration.progress') {
    return 'Progresso de exploração';
  }
  if (metric.type === 'combat.victory') {
    return 'Vitória verificada';
  }
  return 'Nível do Sistema';
}

function inspectIdList(value: unknown, exists: (id: string) => boolean): RegistryInspection<string[]> {
  if (!Array.isArray(value)) {
    return fail('O estado do Registro é inválido.');
  }
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (!nonEmpty(entry) || seen.has(entry) || !exists(entry)) {
      return fail('O estado do Registro é inválido.');
    }
    seen.add(entry);
    ids.push(entry);
  }
  return { ok: true, value: ids };
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fail(reason: string): RegistryInspection<never> {
  return { ok: false, reason };
}
