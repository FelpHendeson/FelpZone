import type { GameCondition, ImageReference } from '../../core/events';
import type { GameState } from '../../core/state/types';
import type { TimeCost } from '../time';

export type LocationVisibility = 'known' | 'hidden';

export type LocationRelation = 'parent' | 'child' | 'sibling';

export interface LocationNode {
  id: string;
  name: string;
  description?: string;
  image?: ImageReference;
  travelCost?: TimeCost;
  unlockConditions?: GameCondition[];
  lockedReason?: string;
  visibility?: LocationVisibility;
  children?: LocationNode[];
}

export interface NavigationState {
  currentLocationId: string;
  discoveredLocationIds: string[];
  unlockedLocationIds: string[];
  visitedLocationIds: string[];
}

export interface NavigationDestination {
  location: LocationNode;
  relation: LocationRelation;
  accessible: boolean;
  blockedReason?: string;
  travelCost: TimeCost;
}

export interface LocationAccess {
  accessible: boolean;
  blockedReason?: string;
  travelCost: TimeCost;
}

export interface NavigationMoveResult {
  previous: NavigationState;
  current: NavigationState;
  fromLocationId: string;
  toLocationId: string;
  relation: LocationRelation;
  travelCost: TimeCost;
}

export interface IndexedMap {
  readonly root: LocationNode;
  readonly locations: ReadonlyMap<string, LocationNode>;
  readonly parents: ReadonlyMap<string, string>;
  readonly children: ReadonlyMap<string, readonly string[]>;
}

export type UnlockConditionEvaluator = (conditions: GameCondition[] | undefined) => boolean;

export type NavigationConditionSource = UnlockConditionEvaluator | GameState;

export type NavigationInspection<T> =
  | { ok: true; value: T }
  | { ok: false; reason: string };
