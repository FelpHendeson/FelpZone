import { describe, expect, it } from 'vitest';
import {
  GardenError,
  INITIAL_GARDEN,
  INITIAL_GARDEN_CATALOG,
  applyGardenPlan,
  createInitialGardenState,
  deriveGardenRecipes,
  grantCultivationPoints,
  inspectGardenCatalog,
  planGardenCultivation,
} from '../modules/garden';
import { INITIAL_SKILLS, createInitialSkillsProgress, deriveSkillTree, learnSkill } from '../modules/skills';

describe('Fatias 16.1 a 16.5 — Jardim de habilidades', () => {
  it('esconde o resultado até as fontes serem conhecidas e não vaza na árvore', () => {
    const progress = createInitialSkillsProgress(INITIAL_SKILLS);
    const hidden = deriveGardenRecipes(INITIAL_GARDEN, INITIAL_SKILLS, progress, createInitialGardenState());
    expect(hidden).toEqual([]);
    expect(JSON.stringify(deriveSkillTree(INITIAL_SKILLS, progress))).not.toContain('Sentinela Interior');
  });

  it('percebe a receita quando as fontes existem e cultiva de forma atômica', () => {
    let progress = createInitialSkillsProgress(INITIAL_SKILLS);
    progress = learnSkill(INITIAL_SKILLS, progress, 'steady-body');
    progress = { ...progress, level: 2, entries: progress.entries.map((entry) => (
      entry.skillId === 'sharpened-senses' ? { ...entry, proficiency: 3 } : entry
    )) };
    const garden = grantCultivationPoints(createInitialGardenState(), 1);
    const views = deriveGardenRecipes(INITIAL_GARDEN, INITIAL_SKILLS, progress, garden);
    expect(views[0]).toMatchObject({ id: 'inner-sentinel', visibility: 'available', resultSkillId: 'sensing-guard' });

    const plan = planGardenCultivation(INITIAL_GARDEN, INITIAL_SKILLS, progress, garden, 'inner-sentinel');
    const next = applyGardenPlan(garden, plan);
    expect(garden.cultivationPoints).toBe(1);
    expect(next.cultivationPoints).toBe(0);
    expect(next.completedRecipeIds).toEqual(['inner-sentinel']);
    expect(() => planGardenCultivation(INITIAL_GARDEN, INITIAL_SKILLS, progress, next, 'inner-sentinel')).toThrow(GardenError);
  });

  it('rejeita contratos hostis e protege o índice contra mutação', () => {
    const invalidRequirement = structuredClone(INITIAL_GARDEN_CATALOG);
    invalidRequirement.recipes[0].requirements = [{ type: 'skill.proficiency', skillId: 'ghost', minimum: -1 }];
    expect(inspectGardenCatalog(invalidRequirement, INITIAL_SKILLS).ok).toBe(false);

    const invalidVisibility = structuredClone(INITIAL_GARDEN_CATALOG) as unknown as { recipes: { visibility: { type: string } }[] };
    invalidVisibility.recipes[0].visibility = { type: 'revealed-by-magic' };
    expect(inspectGardenCatalog(invalidVisibility, INITIAL_SKILLS).ok).toBe(false);

    const duplicateSources = structuredClone(INITIAL_GARDEN_CATALOG);
    duplicateSources.recipes[0].sourceSkillIds = ['steady-body', 'steady-body'];
    expect(inspectGardenCatalog(duplicateSources, INITIAL_SKILLS).ok).toBe(false);

    const unknownMilestone = structuredClone(INITIAL_GARDEN_CATALOG) as unknown as {
      recipes: { requirements: unknown[] }[];
    };
    unknownMilestone.recipes[0].requirements = [{ type: 'milestone.reached', milestoneId: 'ghost-milestone' }];
    expect(inspectGardenCatalog(unknownMilestone, INITIAL_SKILLS, new Set()).ok).toBe(false);

    expect(() => (INITIAL_GARDEN.recipeById as Map<string, never>).clear()).toThrow(GardenError);
  });

  it('não entrega um oráculo de IDs ocultos e impede overflow de cultivo', () => {
    const progress = createInitialSkillsProgress(INITIAL_SKILLS);
    const garden = createInitialGardenState();
    const message = 'Esta integração ainda não está disponível.';
    expect(() => planGardenCultivation(INITIAL_GARDEN, INITIAL_SKILLS, progress, garden, 'inner-sentinel')).toThrow(message);
    expect(() => planGardenCultivation(INITIAL_GARDEN, INITIAL_SKILLS, progress, garden, 'ghost-recipe')).toThrow(message);
    expect(() => grantCultivationPoints({ ...garden, cultivationPoints: Number.MAX_SAFE_INTEGER }, 1)).toThrow(GardenError);
  });
});
