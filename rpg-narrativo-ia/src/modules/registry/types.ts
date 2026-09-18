export type RegistryPolicyKind = 'universal' | 'awakening' | 'selection' | 'inheritance' | 'grant' | 'restriction';

export type RegistryMetric =
  | { type: 'exploration.progress'; locationId: string }
  | { type: 'combat.victory'; encounterId: string }
  | { type: 'system.level' };

export type RegistryPatentRequirement =
  | { type: 'ranking.position.max'; rankingId: string; position: number }
  | { type: 'flag.is'; flag: string; value: boolean }
  | { type: 'exploration.progress.min'; locationId: string; amount: number }
  | { type: 'combat.victory'; encounterId: string };

export interface RegistryPolicy {
  kind: RegistryPolicyKind;
  eligibleSpecies: readonly string[];
}

export interface RegistryCompetitorDefinition {
  actorId: string;
  name: string;
  score: number;
}

export interface RegistryRankingDefinition {
  id: string;
  name: string;
  description: string;
  category: 'exploration' | 'combat';
  scope: string;
  metric: RegistryMetric;
  visibility: 'public' | 'known';
  competitors: readonly RegistryCompetitorDefinition[];
}

export interface RegistryPatentDefinition {
  id: string;
  name: string;
  description: string;
  requirements: readonly RegistryPatentRequirement[];
}

export interface RegistryCatalog {
  policy: RegistryPolicy;
  rankings: readonly RegistryRankingDefinition[];
  patents: readonly RegistryPatentDefinition[];
}

export interface RegistryState {
  accessGranted: boolean;
  patentIds: string[];
  recognizedRankingIds: string[];
}

export interface IndexedRegistry {
  readonly policy: RegistryPolicy;
  readonly rankings: readonly RegistryRankingDefinition[];
  readonly patents: readonly RegistryPatentDefinition[];
  readonly rankingById: ReadonlyMap<string, RegistryRankingDefinition>;
  readonly patentById: ReadonlyMap<string, RegistryPatentDefinition>;
}

export type RegistryInspection<T> = { ok: true; value: T } | { ok: false; reason: string };

export interface RegistryStanding {
  actorId: string;
  name: string;
  score: number;
  position: number;
  isPlayer: boolean;
}

export interface RegistryRankingView {
  rankingId: string;
  name: string;
  description: string;
  category: 'exploration' | 'combat';
  scope: string;
  metricLabel: string;
  standings: readonly RegistryStanding[];
  playerPosition: number | null;
}

export interface RegistryPatentPlan {
  patentId: string;
}
