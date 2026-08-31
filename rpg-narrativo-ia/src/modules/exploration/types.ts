import type { GameCondition } from '../../core/events';
import type { GameState } from '../../core/state';
import type { NavigationState } from '../navigation';
import type { TimeCost } from '../time';

export const DISCOVERY_KINDS = [
  'landmark',
  'item',
  'resourceNode',
  'passage',
  'subarea',
  'npc',
  'creatureHabitat',
  'event',
] as const;

export type DiscoveryKind = (typeof DISCOVERY_KINDS)[number];

export interface DiscoveryDefinition {
  id: string;
  kind: DiscoveryKind;
  revealAt: number;
  completionWeight: number;
  conditions?: GameCondition[];
  targetId?: string;
  unlockTarget?: boolean;
  once: true;
}

export interface LocationExplorationDefinition {
  locationId: string;
  progressPerAction: number;
  timeCost: TimeCost;
  discoveries: DiscoveryDefinition[];
}

export interface LocationExplorationState {
  locationId: string;
  progress: number;
  revealedDiscoveryIds: string[];
  explorationCount: number;
}

export interface ExplorationState {
  locations: LocationExplorationState[];
}

export interface ZoneCompletion {
  zoneId: string;
  completedPoints: number;
  totalPoints: number;
  percentage: number;
}

export interface ExplorationResult {
  previous: ExplorationState;
  current: ExplorationState;
  location: {
    previous: LocationExplorationState;
    current: LocationExplorationState;
  };
  progressGained: number;
  discoveries: DiscoveryDefinition[];
  timeCost: TimeCost;
  navigation: {
    previous: NavigationState;
    current: NavigationState;
  };
}

export interface IndexedExploration {
  readonly definitions: readonly LocationExplorationDefinition[];
  readonly byLocation: ReadonlyMap<string, LocationExplorationDefinition>;
  readonly byDiscovery: ReadonlyMap<string, DiscoveryDefinition>;
  readonly locationByDiscovery: ReadonlyMap<string, string>;
}

export type DiscoveryConditionEvaluator = (conditions: readonly GameCondition[] | undefined) => boolean;

export type ExplorationConditionSource = DiscoveryConditionEvaluator | GameState;

export type ExplorationInspection<T> =
  | { ok: true; value: T }
  | { ok: false; reason: string };
