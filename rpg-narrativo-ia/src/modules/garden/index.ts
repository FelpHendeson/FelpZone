import { getSkillProficiency, isSkillKnown, INITIAL_SKILLS, type IndexedSkills, type SkillsProgressState } from '../skills';
import { GardenError } from './errors';
import { INITIAL_GARDEN_CATALOG } from './initial-garden';
import type {
  GardenInspection,
  GardenPlan,
  GardenRecipeDefinition,
  GardenRecipeView,
  GardenRequirement,
  GardenState,
  GardenVisibility,
  IndexedGarden,
} from './types';

export { GardenError } from './errors';
export { INITIAL_GARDEN_CATALOG } from './initial-garden';
export type {
  GardenCost,
  GardenInspection,
  GardenPlan,
  GardenRecipeDefinition,
  GardenRecipeView,
  GardenRequirement,
  GardenState,
  GardenVisibility,
  IndexedGarden,
} from './types';

export const INITIAL_GARDEN = indexGardenCatalog(INITIAL_GARDEN_CATALOG, INITIAL_SKILLS);

export function inspectGardenCatalog(value: unknown, skills: IndexedSkills): GardenInspection<IndexedGarden> {
  if (!isRecord(value) || !Array.isArray(value.recipes)) {
    return fail('O catálogo do Jardim é inválido.');
  }
  const recipes: GardenRecipeDefinition[] = [];
  const ids = new Set<string>();
  for (const entry of value.recipes) {
    const inspected = inspectRecipe(entry, ids, skills);
    if (!inspected.ok) {
      return inspected;
    }
    ids.add(inspected.value.id);
    recipes.push(inspected.value);
  }
  return {
    ok: true,
    value: Object.freeze({
      recipes: Object.freeze(recipes.map(freezeRecipe)),
      recipeById: new Map(recipes.map((recipe) => [recipe.id, freezeRecipe(recipe)] as const)),
    }),
  };
}

export function indexGardenCatalog(value: unknown, skills: IndexedSkills): IndexedGarden {
  const inspected = inspectGardenCatalog(value, skills);
  if (!inspected.ok) {
    throw new GardenError(inspected.reason);
  }
  return inspected.value;
}

export function createInitialGardenState(): GardenState {
  return { cultivationPoints: 0, completedRecipeIds: [] };
}

export function inspectGardenState(value: unknown, catalog: IndexedGarden = INITIAL_GARDEN): GardenInspection<GardenState> {
  if (
    !isRecord(value) ||
    typeof value.cultivationPoints !== 'number' ||
    !Number.isSafeInteger(value.cultivationPoints) ||
    value.cultivationPoints < 0 ||
    !Array.isArray(value.completedRecipeIds)
  ) {
    return fail('O estado do Jardim é inválido.');
  }
  const completed: string[] = [];
  const seen = new Set<string>();
  for (const id of value.completedRecipeIds) {
    if (typeof id !== 'string' || seen.has(id) || !catalog.recipeById.has(id)) {
      return fail('O save referencia uma receita do Jardim inexistente.');
    }
    seen.add(id);
    completed.push(id);
  }
  return { ok: true, value: { cultivationPoints: value.cultivationPoints, completedRecipeIds: completed } };
}

export function copyGardenState(state: GardenState): GardenState {
  return { cultivationPoints: state.cultivationPoints, completedRecipeIds: [...state.completedRecipeIds] };
}

export function grantCultivationPoints(state: GardenState, amount: number): GardenState {
  if (!Number.isSafeInteger(amount) || amount < 0) {
    throw new GardenError('A concessão de pontos de cultivo é inválida.');
  }
  return { cultivationPoints: state.cultivationPoints + amount, completedRecipeIds: [...state.completedRecipeIds] };
}

export function deriveGardenRecipes(
  catalog: IndexedGarden,
  _skills: IndexedSkills,
  progress: SkillsProgressState,
  state: GardenState,
  reachedMilestoneIds: readonly string[] = [],
): GardenRecipeView[] {
  const views: GardenRecipeView[] = [];
  for (const recipe of catalog.recipes) {
    const visibility = visibilityFor(recipe, progress, state, reachedMilestoneIds);
    if (visibility === 'hidden') {
      continue;
    }
    const view: GardenRecipeView = {
      id: recipe.id,
      visibility,
      requirementsMet: recipe.requirements.every((requirement) => isGardenRequirementMet(requirement, progress, reachedMilestoneIds)),
    };
    if (visibility === 'available' || visibility === 'cultivated' || visibility === 'perceived') {
      if (recipe.sourceSkillIds.every((id) => isSkillKnown(progress, id))) {
        view.name = recipe.name;
        view.description = recipe.description;
        view.sourceSkillIds = [...recipe.sourceSkillIds];
        view.cost = { cultivationPoints: recipe.cost.cultivationPoints, timeCost: { ...recipe.cost.timeCost } };
      }
      if (visibility === 'available' || visibility === 'cultivated') {
        view.resultSkillId = recipe.resultSkillId;
      }
    }
    views.push(view);
  }
  return views;
}

export function planGardenCultivation(
  catalog: IndexedGarden,
  skills: IndexedSkills,
  progress: SkillsProgressState,
  state: GardenState,
  recipeId: string,
  reachedMilestoneIds: readonly string[] = [],
): GardenPlan {
  const recipe = catalog.recipeById.get(recipeId);
  if (!recipe) {
    throw new GardenError('A receita do Jardim não existe.');
  }
  if (state.completedRecipeIds.includes(recipeId)) {
    throw new GardenError('Esta integração já foi cultivada.');
  }
  if (!recipe.requirements.every((requirement) => isGardenRequirementMet(requirement, progress, reachedMilestoneIds))) {
    throw new GardenError('Os requisitos desta integração ainda não foram atendidos.');
  }
  if (state.cultivationPoints < recipe.cost.cultivationPoints) {
    throw new GardenError('Não há pontos de cultivo suficientes.');
  }
  if (!skills.skillById.has(recipe.resultSkillId)) {
    throw new GardenError('A habilidade resultante não existe.');
  }
  return {
    recipeId: recipe.id,
    resultSkillId: recipe.resultSkillId,
    initialProficiency: recipe.initialProficiency,
    cost: { cultivationPoints: recipe.cost.cultivationPoints, timeCost: { periods: recipe.cost.timeCost.periods } },
  };
}

export function applyGardenPlan(state: GardenState, plan: GardenPlan): GardenState {
  return {
    cultivationPoints: state.cultivationPoints - plan.cost.cultivationPoints,
    completedRecipeIds: [...state.completedRecipeIds, plan.recipeId],
  };
}

function visibilityFor(
  recipe: GardenRecipeDefinition,
  progress: SkillsProgressState,
  state: GardenState,
  reachedMilestoneIds: readonly string[],
): GardenVisibility {
  if (state.completedRecipeIds.includes(recipe.id)) {
    return 'cultivated';
  }
  if (recipe.visibility.type === 'always-hidden') {
    return 'hidden';
  }
  const sourcesKnown = recipe.sourceSkillIds.every((id) => isSkillKnown(progress, id));
  const requirementsMet = recipe.requirements.every((requirement) => isGardenRequirementMet(requirement, progress, reachedMilestoneIds));
  if (requirementsMet && sourcesKnown) {
    return 'available';
  }
  if (recipe.visibility.type === 'perceived-when-sources-known' && sourcesKnown) {
    return 'perceived';
  }
  return 'hidden';
}

function isGardenRequirementMet(
  requirement: GardenRequirement,
  progress: SkillsProgressState,
  reachedMilestoneIds: readonly string[],
): boolean {
  if (requirement.type === 'level.minimum') {
    return progress.level >= requirement.level;
  }
  if (requirement.type === 'skill.known') {
    return isSkillKnown(progress, requirement.skillId);
  }
  if (requirement.type === 'milestone.reached') {
    return reachedMilestoneIds.includes(requirement.milestoneId);
  }
  return isSkillKnown(progress, requirement.skillId) && getSkillProficiency(progress, requirement.skillId) >= requirement.minimum;
}

function inspectRecipe(
  value: unknown,
  existing: ReadonlySet<string>,
  skills: IndexedSkills,
): GardenInspection<GardenRecipeDefinition> {
  if (!isRecord(value) || !nonEmpty(value.id) || existing.has(value.id) || !nonEmpty(value.name) || !nonEmpty(value.description)) {
    return fail('A receita do Jardim é inválida.');
  }
  if (!Array.isArray(value.sourceSkillIds) || value.sourceSkillIds.length < 2) {
    return fail('A receita do Jardim precisa de ao menos duas habilidades de origem.');
  }
  const sourceSkillIds: string[] = [];
  for (const id of value.sourceSkillIds) {
    if (typeof id !== 'string' || !skills.skillById.has(id)) {
      return fail('A receita do Jardim referencia uma habilidade inexistente.');
    }
    sourceSkillIds.push(id);
  }
  if (typeof value.resultSkillId !== 'string' || !skills.skillById.has(value.resultSkillId)) {
    return fail('A habilidade resultante do Jardim não existe.');
  }
  if (
    !isRecord(value.cost) ||
    !positiveSafeInteger(value.cost.cultivationPoints) ||
    !isRecord(value.cost.timeCost) ||
    !positiveSafeInteger(value.cost.timeCost.periods)
  ) {
    return fail('O custo do Jardim é inválido.');
  }
  if (!positiveSafeInteger(value.initialProficiency)) {
    return fail('A proficiência inicial do Jardim é inválida.');
  }
  return {
    ok: true,
    value: {
      id: value.id,
      name: value.name,
      description: value.description,
      sourceSkillIds,
      requirements: Array.isArray(value.requirements) ? (value.requirements as GardenRequirement[]) : [],
      cost: { cultivationPoints: value.cost.cultivationPoints, timeCost: { periods: value.cost.timeCost.periods } },
      resultSkillId: value.resultSkillId,
      initialProficiency: value.initialProficiency,
      visibility: isRecord(value.visibility) ? (value.visibility as GardenRecipeDefinition['visibility']) : { type: 'available-when-requirements-met' },
    },
  };
}

function freezeRecipe(recipe: GardenRecipeDefinition): GardenRecipeDefinition {
  return Object.freeze({
    ...recipe,
    sourceSkillIds: Object.freeze([...recipe.sourceSkillIds]),
    requirements: Object.freeze(recipe.requirements.map((requirement) => Object.freeze({ ...requirement }))),
    cost: Object.freeze({ ...recipe.cost, timeCost: Object.freeze({ ...recipe.cost.timeCost }) }),
    visibility: Object.freeze({ ...recipe.visibility }),
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function positiveSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function fail<T>(reason: string): GardenInspection<T> {
  return { ok: false, reason };
}
