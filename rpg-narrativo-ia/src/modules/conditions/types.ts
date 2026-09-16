export const ELEMENT_IDS = ['physical', 'embers', 'water'] as const;

export type ElementId = (typeof ELEMENT_IDS)[number];

export interface ElementDefinition {
  id: string;
  name: string;
  description: string;
}

export const AFFINITY_LABELS = ['resisted', 'neutral', 'effective'] as const;

export type AffinityLabel = (typeof AFFINITY_LABELS)[number];

export interface ElementInteractionDefinition {
  sourceElementId: string;
  targetElementId: string;
  multiplier: number;
  label: AffinityLabel;
}

export const CONDITION_STACKING = ['refresh', 'replace-stronger', 'none'] as const;

export type ConditionStacking = (typeof CONDITION_STACKING)[number];

export const CONDITION_TIMING = ['turn-start', 'turn-end', 'on-action'] as const;

export type ConditionTiming = (typeof CONDITION_TIMING)[number];

export type ConditionEffect =
  | { type: 'damage'; amount: number }
  | { type: 'combat.value.modify'; target: 'damage' | 'guard' | 'healing'; amount: number }
  | { type: 'action.block'; category: 'heal' | 'damage' | 'guard' };

export interface ConditionDefinition {
  id: string;
  name: string;
  description: string;
  stacking: ConditionStacking;
  timing: ConditionTiming;
  lingering: boolean;
  effects: readonly ConditionEffect[];
}

export interface ActiveCondition {
  conditionId: string;
  remainingTurns: number;
  potency: number;
  sourceCombatantId: string;
}

export interface PersistentConditionEntry {
  conditionId: string;
  remainingPeriods: number;
  potency: number;
}

export interface PersistentConditionState {
  entries: readonly PersistentConditionEntry[];
}

export interface ConditionsCatalog {
  elements: readonly ElementDefinition[];
  interactions: readonly ElementInteractionDefinition[];
  conditions: readonly ConditionDefinition[];
}

export interface IndexedConditions {
  readonly elements: readonly ElementDefinition[];
  readonly interactions: readonly ElementInteractionDefinition[];
  readonly conditions: readonly ConditionDefinition[];
  readonly elementById: ReadonlyMap<string, ElementDefinition>;
  readonly conditionById: ReadonlyMap<string, ConditionDefinition>;
  readonly interactionByPair: ReadonlyMap<string, ElementInteractionDefinition>;
}

export type ConditionsInspection<T> =
  | { ok: true; value: T }
  | { ok: false; reason: string };
