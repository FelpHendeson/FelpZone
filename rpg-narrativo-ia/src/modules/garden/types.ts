import type { TimeCost } from '../time';

export type GardenRequirement =
  | { type: 'skill.known'; skillId: string }
  | { type: 'skill.proficiency'; skillId: string; minimum: number }
  | { type: 'level.minimum'; level: number }
  | { type: 'milestone.reached'; milestoneId: string };

export type GardenVisibility = 'hidden' | 'perceived' | 'available' | 'cultivated';

export type GardenVisibilityRule =
  | { type: 'always-hidden' }
  | { type: 'perceived-when-sources-known' }
  | { type: 'available-when-requirements-met' };

export interface GardenCost {
  cultivationPoints: number;
  timeCost: TimeCost;
}

export interface GardenRecipeDefinition {
  id: string;
  name: string;
  description: string;
  sourceSkillIds: readonly string[];
  requirements: readonly GardenRequirement[];
  cost: GardenCost;
  resultSkillId: string;
  initialProficiency: number;
  visibility: GardenVisibilityRule;
}

export interface GardenCatalog {
  recipes: readonly GardenRecipeDefinition[];
}

export interface GardenState {
  cultivationPoints: number;
  completedRecipeIds: readonly string[];
}

export interface IndexedGarden {
  readonly recipes: readonly GardenRecipeDefinition[];
  readonly recipeById: ReadonlyMap<string, GardenRecipeDefinition>;
}

export interface GardenRecipeView {
  id: string;
  visibility: GardenVisibility;
  name?: string;
  description?: string;
  sourceSkillIds?: readonly string[];
  cost?: GardenCost;
  resultSkillId?: string;
  requirementsMet?: boolean;
}

export interface GardenPlan {
  recipeId: string;
  resultSkillId: string;
  initialProficiency: number;
  cost: GardenCost;
}

export type GardenInspection<T> =
  | { ok: true; value: T }
  | { ok: false; reason: string };
