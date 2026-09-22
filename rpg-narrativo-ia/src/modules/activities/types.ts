import type { GameState } from '../../core/state/types';
import type { TimeCost } from '../time';
import type { IndexedNpcs, NPCsState } from '../npcs/types';
import type { IndexedMap } from '../navigation/types';
import type { IndexedGuidance, GuidanceState } from '../guidance/types';
import type { Campaign } from '../../core/events';

export type ContextualActivityRequirement =
  | { type: 'flag.is'; flag: string; value: boolean }
  | { type: 'inventory.has'; itemId: string; quantity?: number }
  | { type: 'relationship.min'; characterId: string; amount: number }
  | { type: 'location.is'; locationId: string }
  | { type: 'world.day.min'; day: number }
  | { type: 'npc.known'; npcId: string }
  | { type: 'npc.present'; npcId: string }
  | { type: 'npc.available'; npcId: string };

export type ContextualActivityEffect =
  | { type: 'flag.set'; flag: string; value: boolean }
  | { type: 'relationship.change'; characterId: string; amount: number }
  | { type: 'npc.rememberFact'; npcId: string; factId: string }
  | { type: 'npc.relocate'; npcId: string; locationId: string }
  | { type: 'guidance.unlock'; topicId: string };

export interface ContextualActivityParticipants {
  requiredNpcIds: readonly string[];
  optionalNpcIds: readonly string[];
  minOptional: number;
  maxOptional: number;
}

export interface ContextualActivityNarrative {
  campaignId: string;
  eventId: string;
}

export interface ContextualActivityDefinition {
  id: string;
  label: string;
  description: string;
  locationId: string;
  timeCost: TimeCost;
  repeatable: boolean;
  requirements: readonly ContextualActivityRequirement[];
  participants?: ContextualActivityParticipants;
  effects: readonly ContextualActivityEffect[];
  narrative?: ContextualActivityNarrative;
  feedback?: string;
}

export interface IndexedActivities {
  readonly activities: readonly ContextualActivityDefinition[];
  readonly byId: ReadonlyMap<string, ContextualActivityDefinition>;
}

export interface ContextualActivitiesState {
  consumedActivityIds: string[];
}

export interface ContextualActivityPlan {
  activityId: string;
  participantNpcIds: readonly string[];
  timeCost: TimeCost;
  effects: readonly ContextualActivityEffect[];
  narrative?: ContextualActivityNarrative;
  feedback?: string;
}

export interface ContextualActivityKnownView {
  activity: ContextualActivityDefinition;
  available: boolean;
  blockedReason?: string;
  eligibleOptionalNpcIds: readonly string[];
}

export interface ActivityWorldContext {
  map: IndexedMap;
  npcs: IndexedNpcs;
  guidance: IndexedGuidance;
  campaign: Campaign;
}

export interface ContextualActivityApplied {
  activities: ContextualActivitiesState;
  npcs: NPCsState;
  flags: Record<string, boolean>;
  relationships: GameState['relationships'];
  guidance: GuidanceState;
}

export type ContextualActivityInspection<T> =
  | { ok: true; value: T }
  | { ok: false; reason: string };
