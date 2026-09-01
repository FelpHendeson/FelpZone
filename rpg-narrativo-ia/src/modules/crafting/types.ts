import type { GameCondition } from '../../core/events';
import type { GameState, InventoryItem } from '../../core/state';
import type { NavigationState } from '../navigation';
import type { TimeCost } from '../time';

export class CraftingError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'CraftingError';
  }
}

export const RECIPE_KINDS = ['item', 'structure', 'cooking'] as const;

export type RecipeKind = (typeof RECIPE_KINDS)[number];

export interface RecipeIngredient {
  itemId: string;
  quantity: number;
}

export type RecipeDiscovery = { type: 'known' } | { type: 'flag'; flag: string };

export interface RecipeDefinition {
  id: string;
  name: string;
  kind: RecipeKind;
  inputs: RecipeIngredient[];
  outputs?: RecipeIngredient[];
  createsStructureId?: string;
  requiredStationTags?: string[];
  timeCost: TimeCost;
  conditions?: GameCondition[];
  discovery: RecipeDiscovery;
}

export interface StructureDefinition {
  id: string;
  name: string;
  tags: string[];
  uniquePerLocation: boolean;
  activeByDefault: boolean;
  initialFuel?: number;
}

export interface WorldStructureState {
  structureId: string;
  locationId: string;
  active: boolean;
  fuel?: number;
}

export interface CraftingState {
  knownRecipeIds: string[];
  structures: WorldStructureState[];
}

export interface CraftingAccess {
  craftable: boolean;
  blockedReason?: string;
  missingInputs: RecipeIngredient[];
  missingStationTags: string[];
  timeCost: TimeCost;
}

export interface CraftingResult {
  previous: CraftingState;
  current: CraftingState;
  inventory: {
    previous: InventoryItem[];
    current: InventoryItem[];
  };
  recipe: RecipeDefinition;
  consumed: RecipeIngredient[];
  produced: RecipeIngredient[];
  structure?: WorldStructureState;
  locationId: string;
  timeCost: TimeCost;
}

export interface IndexedCrafting {
  readonly recipes: readonly RecipeDefinition[];
  readonly structures: readonly StructureDefinition[];
  readonly byRecipe: ReadonlyMap<string, RecipeDefinition>;
  readonly byStructure: ReadonlyMap<string, StructureDefinition>;
}

export type CraftingConditionEvaluator = (conditions: readonly GameCondition[] | undefined) => boolean;

export type CraftingConditionSource = CraftingConditionEvaluator | GameState;

export type CraftingInspection<T> =
  | { ok: true; value: T }
  | { ok: false; reason: string };

export type { InventoryItem, NavigationState, TimeCost };
