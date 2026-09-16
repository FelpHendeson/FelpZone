import { describe, expect, it } from 'vitest';
import {
  GardenError,
  INITIAL_GARDEN,
  applyGardenPlan,
  createInitialGardenState,
  deriveGardenRecipes,
  grantCultivationPoints,
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
});
