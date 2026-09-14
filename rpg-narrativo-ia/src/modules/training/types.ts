export const TRAINING_TARGET_TYPES = ['path', 'skill'] as const;

export type TrainingTargetType = (typeof TRAINING_TARGET_TYPES)[number];

export interface TrainingTarget {
  type: TrainingTargetType;
  id: string;
}

export interface TrainingCost {
  periods: number;
}

export interface TrainingMethodDefinition {
  id: string;
  name: string;
  description: string;
  target: TrainingTarget;
  cost: TrainingCost;
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
