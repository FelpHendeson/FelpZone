import type { TimeCost } from '../time';

export class NeedsError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'NeedsError';
  }
}

export const NEED_IDS = ['saude', 'energia', 'fome', 'sede'] as const;

export type NeedId = (typeof NEED_IDS)[number];

export const NEED_BANDS = ['stable', 'attention', 'urgent', 'critical'] as const;

export type NeedBand = (typeof NEED_BANDS)[number];

export interface NeedsSnapshot {
  saude: number;
  energia: number;
  fome: number;
  sede: number;
}

export interface NeedsDecayConfig {
  hungerPerPeriod: number;
  thirstPerPeriod: number;
  energyLossPerPeriod: number;
  healthLossAtMaxHunger: number;
  healthLossAtMaxThirst: number;
  healthLossAtZeroEnergy: number;
  minimumHealthFromNeeds: number;
}

export interface NeedsDelta {
  saude: number;
  energia: number;
  fome: number;
  sede: number;
}

export interface NeedsWearSummary {
  periodsApplied: number;
  changes: NeedsDelta;
  criticalPeriods: {
    fome: number;
    sede: number;
    energia: number;
  };
  requestedHealthDamage: number;
  appliedHealthDamage: number;
}

export interface NeedsWearResult {
  previous: NeedsSnapshot;
  current: NeedsSnapshot;
  summary: NeedsWearSummary;
}

export interface NeedEffect {
  needId: NeedId;
  amount: number;
}

export interface AppliedNeedEffect extends NeedEffect {
  requestedAmount: number;
  limited: boolean;
}

export interface ConsumableDefinition {
  itemId: string;
  effects: readonly Readonly<NeedEffect>[];
}

export interface IndexedConsumables {
  readonly consumables: readonly Readonly<ConsumableDefinition>[];
  readonly byItemId: ReadonlyMap<string, Readonly<ConsumableDefinition>>;
}

export const REST_MODES = ['simple', 'campfire'] as const;

export type RestMode = (typeof REST_MODES)[number];

export interface RestDefinition {
  id: RestMode;
  effects: readonly Readonly<NeedEffect>[];
  timeCost: Readonly<TimeCost>;
}

export interface IndexedRestModes {
  readonly restModes: readonly Readonly<RestDefinition>[];
  readonly byId: ReadonlyMap<RestMode, Readonly<RestDefinition>>;
}

export interface NeedsConsumptionPlan {
  previous: NeedsSnapshot;
  current: NeedsSnapshot;
  itemId: string;
  quantity: 1;
  effects: NeedEffect[];
  appliedEffects: AppliedNeedEffect[];
  timeCost: TimeCost;
}

export interface NeedsRestPlan {
  previous: NeedsSnapshot;
  current: NeedsSnapshot;
  mode: RestMode;
  effects: NeedEffect[];
  appliedEffects: AppliedNeedEffect[];
  timeCost: TimeCost;
}

export type NeedsInspection<T> =
  | { ok: true; value: T }
  | { ok: false; reason: string };
