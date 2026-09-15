import type { TimeCost } from '../time';
import type { MasteryRequirement } from '../mastery';

export const TRAINING_TARGET_TYPES = ['path', 'skill'] as const;

export type TrainingTargetType = (typeof TRAINING_TARGET_TYPES)[number];

export interface TrainingTarget {
  type: TrainingTargetType;
  id: string;
}

export interface TrainingCost {
  periods: number;
}

export const TRAINING_EFFECT_TYPES = ['skill.proficiency.increase', 'skill.learn'] as const;

export type TrainingEffect =
  | { type: 'skill.proficiency.increase'; skillId: string; amount: number }
  | { type: 'skill.learn'; skillId: string };

export interface TrainingMethodDefinition {
  id: string;
  name: string;
  description: string;
  target: TrainingTarget;
  cost: TrainingCost;
  effects: TrainingEffect[];
  requirements: MasteryRequirement[];
}

export interface TrainingPlan {
  methodId: string;
  timeCost: TimeCost;
  effects: TrainingEffect[];
}

export interface TrainingCatalog {
  methods: readonly TrainingMethodDefinition[];
}

export interface IndexedTraining {
  readonly methods: readonly TrainingMethodDefinition[];
  readonly byId: ReadonlyMap<string, TrainingMethodDefinition>;
}

export type TrainingInspection<T> =
  | { ok: true; value: T }
  | { ok: false; reason: string };
