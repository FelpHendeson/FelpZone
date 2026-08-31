import type { GameCondition } from '../../core/events';
import type { GameState, InventoryItem } from '../../core/state';
import type { TimeCost, TimeState } from '../time';

export class ResourceError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ResourceError';
  }
}

export interface ResourceYield {
  itemId: string;
  quantityPerUnit: number;
}

export type RenewalPolicy =
  | { type: 'none' }
  | { type: 'short'; periods: number }
  | { type: 'long'; days: number }
  | { type: 'population'; populationId: string };

export interface ResourceNodeDefinition {
  id: string;
  discoveryId: string;
  locationId: string;
  name: string;
  capacity: number;
  maxCollectionPerAction?: number;
  collectionCost: TimeCost;
  renewal: RenewalPolicy;
  yields: ResourceYield[];
  conditions?: GameCondition[];
  blockedReason?: string;
}

export interface ResourceNodeState {
  nodeId: string;
  availableUnits: number;
  lastCollectedAt?: TimeState;
  nextRenewalAt?: TimeState;
  exhausted: boolean;
}

export interface PopulationDefinition {
  id: string;
  speciesId: string;
  carryingCapacity: number;
  recoveryPerDay: number;
  warningThreshold: number;
  criticalThreshold: number;
}

export interface PopulationState {
  populationId: string;
  current: number;
  pressure: number;
  locallyExtinct: boolean;
  lastRecoveredDay: number;
}

export interface ResourcesState {
  nodes: ResourceNodeState[];
  populations: PopulationState[];
}

export type PopulationStatus = 'abundant' | 'stable' | 'declining' | 'threatened' | 'exhausted';

export interface ResourceCollectionResult {
  previous: ResourcesState;
  current: ResourcesState;
  inventory: {
    previous: InventoryItem[];
    current: InventoryItem[];
  };
  node: {
    previous: ResourceNodeState;
    current: ResourceNodeState;
  };
  population?: {
    previous: PopulationState;
    current: PopulationState;
    status: PopulationStatus;
  };
  collectedUnits: number;
  yields: Array<{ itemId: string; quantity: number }>;
  timeCost: TimeCost;
  collectedAt: TimeState;
}

export interface ResourceAccess {
  collectable: boolean;
  blockedReason?: string;
  availableUnits: number;
  maxCollectable: number;
}

export interface IndexedResources {
  readonly nodes: readonly ResourceNodeDefinition[];
  readonly populations: readonly PopulationDefinition[];
  readonly byNode: ReadonlyMap<string, ResourceNodeDefinition>;
  readonly byPopulation: ReadonlyMap<string, PopulationDefinition>;
  readonly nodesByPopulation: ReadonlyMap<string, readonly string[]>;
}

export type ResourceConditionEvaluator = (conditions: readonly GameCondition[] | undefined) => boolean;

export type ResourceConditionSource = ResourceConditionEvaluator | GameState;

export type ResourceInspection<T> =
  | { ok: true; value: T }
  | { ok: false; reason: string };
