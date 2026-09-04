import type { Campaign, GameCondition, GameEffect, ImageReference } from '../../core/events';
import type { GameState } from '../../core/state/types';
import type { IndexedExploration } from '../exploration';
import type { IndexedMap } from '../navigation';
import type { TimeCost } from '../time';

export const WORLD_ENTITY_KINDS = ['npc', 'animal', 'creature'] as const;

export type WorldEntityKind = (typeof WORLD_ENTITY_KINDS)[number];

export const PRESENCE_STATUSES = ['hidden', 'available', 'unavailable', 'resolved'] as const;

export type PresenceStatus = (typeof PRESENCE_STATUSES)[number];

export type VisiblePresenceStatus = Exclude<PresenceStatus, 'hidden'>;

export interface WorldEntityDefinition {
  id: string;
  kind: WorldEntityKind;
  name: string;
  description: string;
  image?: ImageReference;
}

export interface WorldPresenceDefinition {
  id: string;
  entityId: string;
  locationId: string;
  discoveryId: string;
  availabilityConditions?: GameCondition[];
  resolvable: boolean;
}

export interface PresenceCatalog {
  entities: readonly WorldEntityDefinition[];
  presences: readonly WorldPresenceDefinition[];
}

export interface PresenceState {
  discoveredPresenceIds: string[];
  resolvedPresenceIds: string[];
}

export interface PresenceSynchronizationResult {
  previous: PresenceState;
  current: PresenceState;
  newlyDiscoveredPresenceIds: string[];
}

export interface KnownPresence {
  presence: WorldPresenceDefinition;
  entity: WorldEntityDefinition;
  status: VisiblePresenceStatus;
}

export interface IndexedPresences {
  readonly entities: readonly WorldEntityDefinition[];
  readonly presences: readonly WorldPresenceDefinition[];
  readonly byEntity: ReadonlyMap<string, WorldEntityDefinition>;
  readonly byPresence: ReadonlyMap<string, WorldPresenceDefinition>;
  readonly presenceIdsByLocation: ReadonlyMap<string, readonly string[]>;
}

export type PresenceConditionEvaluator = (conditions: readonly GameCondition[] | undefined) => boolean;

export type PresenceConditionSource = PresenceConditionEvaluator | GameState;

export type PresenceInspection<T> =
  | { ok: true; value: T }
  | { ok: false; reason: string };

export interface PresenceCatalogContext {
  map: IndexedMap;
  exploration: IndexedExploration;
}

export const PRESENCE_INTERACTION_KINDS = ['observe', 'investigate', 'approach', 'talk', 'avoid'] as const;

export type PresenceInteractionKind = (typeof PRESENCE_INTERACTION_KINDS)[number];

export interface PresenceNarrativeReference {
  campaignId: string;
  eventId: string;
}

export interface PresenceInteractionDefinition {
  id: string;
  presenceId: string;
  kind: PresenceInteractionKind;
  label: string;
  hint?: string;
  timeCost: TimeCost;
  conditions?: GameCondition[];
  effects?: GameEffect[];
  feedback?: string;
  narrative?: PresenceNarrativeReference;
  resolvesPresence: boolean;
}

export interface PresenceInteractionCatalog {
  interactions: readonly PresenceInteractionDefinition[];
}

export interface PresenceInteractionPlan {
  interactionId: string;
  presenceId: string;
  timeCost: TimeCost;
  effects: GameEffect[];
  feedback?: string;
  narrative?: PresenceNarrativeReference;
  resolvesPresence: boolean;
}

export interface KnownPresenceInteraction {
  interaction: PresenceInteractionDefinition;
  available: boolean;
  blockedReason?: string;
}

export interface IndexedPresenceInteractions {
  readonly interactions: readonly PresenceInteractionDefinition[];
  readonly byId: ReadonlyMap<string, PresenceInteractionDefinition>;
  readonly byPresence: ReadonlyMap<string, readonly PresenceInteractionDefinition[]>;
}

export interface PresenceInteractionCatalogContext {
  catalog: IndexedPresences;
  campaign?: Campaign;
}
