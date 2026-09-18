import type { GameCondition, GameEffect } from '../../core/events';
import type { TimeCost } from '../time';

export interface BondDimensionDefinition {
  id: string;
  name: string;
  minimum: number;
  maximum: number;
}

export interface BondDefinition {
  id: string;
  name: string;
  description: string;
  requirements: readonly BondRequirement[];
}

export type BondRequirement =
  | { type: 'dimension.min'; actorId: string | 'player'; targetId: string; dimensionId: string; amount: number }
  | { type: 'flag.is'; flag: string; value: boolean };

export type BondActionRequirement = GameCondition | BondRequirement;

export type BondDomainEffect =
  | { type: 'bond.shift'; fromId: string; toId: string; dimensionId: string; delta: number }
  | { type: 'bond.form'; bondId: string; fromId: string; toId: string };

export type BondActionEffect = BondDomainEffect | GameEffect;

export interface BondActionDefinition {
  id: string;
  npcId: string;
  label: string;
  hint?: string;
  timeCost: TimeCost;
  once?: boolean;
  requirements?: readonly BondActionRequirement[];
  effects: readonly BondActionEffect[];
  feedback?: string;
}

export interface BondCatalog {
  dimensions: readonly BondDimensionDefinition[];
  bonds: readonly BondDefinition[];
  actions?: readonly BondActionDefinition[];
}

export interface BondEdgeState {
  fromId: string;
  toId: string;
  values: Record<string, number>;
  bondIds: string[];
  consumedMilestoneIds: string[];
}

export interface BondsState {
  edges: BondEdgeState[];
  consumedActionIds: string[];
}

export interface IndexedBonds {
  readonly dimensions: readonly BondDimensionDefinition[];
  readonly bonds: readonly BondDefinition[];
  readonly actions: readonly BondActionDefinition[];
  readonly dimensionById: ReadonlyMap<string, BondDimensionDefinition>;
  readonly bondById: ReadonlyMap<string, BondDefinition>;
  readonly actionById: ReadonlyMap<string, BondActionDefinition>;
}

export type BondInspection<T> = { ok: true; value: T } | { ok: false; reason: string };

export interface BondDimensionChange {
  fromId: string;
  toId: string;
  dimensionId: string;
  delta: number;
}

export interface BondTransitionPlan {
  bondId: string;
  fromId: string;
  toId: string;
}

export interface BondActionPlan {
  actionId: string;
  npcId: string;
  timeCost: TimeCost;
  effects: readonly BondActionEffect[];
  feedback?: string;
}

export interface KnownBondAction {
  action: BondActionDefinition;
  available: boolean;
  blockedReason?: string;
}

export interface VisibleBondDimension {
  dimensionId: string;
  name: string;
  value: number;
}

export interface VisibleNamedBond {
  bondId: string;
  name: string;
  description: string;
}
