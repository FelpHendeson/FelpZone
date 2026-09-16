import recipes from '../../../content/first-day/system/recipes.json' with { type: 'json' };
import structures from '../../../content/first-day/system/structures.json' with { type: 'json' };
import type { RecipeDefinition, StructureDefinition } from './types';

export const INITIAL_STRUCTURES = structures as readonly StructureDefinition[];
export const INITIAL_RECIPES = recipes as readonly RecipeDefinition[];
