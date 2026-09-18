import type { EnergyKind } from '../energetics';

export const EXECUTION_MODIFIER_FIELDS = [
  'phases.prepare',
  'phases.execute',
  'phases.recover',
  'cost.amount',
  'cooldown',
  'speed',
] as const;

export type ExecutionModifierField = (typeof EXECUTION_MODIFIER_FIELDS)[number];

export interface ActionPhases {
  prepare: number;
  execute: number;
  recover: number;
}

export interface ActionCost {
  energyId: EnergyKind;
  amount: number;
}

export interface ExecutionModifiers {
  prepare: number;
  execute: number;
  recover: number;
  cost: number;
  cooldown: number;
  speed: number;
}

export interface PhaseLimits {
  minPrepare: number;
  minExecute: number;
  minRecover: number;
  minTotal: number;
}

export interface ReserveDefinition {
  energyId: EnergyKind;
  max: number;
  name: string;
  description: string;
}

export interface SkillExecutionModifier {
  skillId: string;
  prepare?: number;
  execute?: number;
  recover?: number;
  cost?: number;
  cooldown?: number;
  speed?: number;
}

export interface ExecutionCatalog {
  reserves: readonly ReserveDefinition[];
  limits: PhaseLimits;
  modifierFields: readonly ExecutionModifierField[];
  skillModifiers: readonly SkillExecutionModifier[];
}

export interface IndexedExecution {
  readonly reserves: readonly ReserveDefinition[];
  readonly limits: PhaseLimits;
  readonly modifierFields: readonly ExecutionModifierField[];
  readonly skillModifiers: readonly SkillExecutionModifier[];
  readonly reserveByEnergyId: ReadonlyMap<EnergyKind, ReserveDefinition>;
  readonly skillModifierBySkillId: ReadonlyMap<string, SkillExecutionModifier>;
}

export interface ReserveAmount {
  energyId: EnergyKind;
  current: number;
}

export interface CooldownEntry {
  actionId: string;
  remaining: number;
}

export interface ExecutionState {
  reserves: ReserveAmount[];
  cooldowns: CooldownEntry[];
}

export type ExecutionInspection<T> = { ok: true; value: T } | { ok: false; reason: string };

export interface ResolvedActionTiming {
  phases: ActionPhases;
  readyTick: number;
  speed: number;
  cost?: ActionCost;
  cooldown: number;
}
