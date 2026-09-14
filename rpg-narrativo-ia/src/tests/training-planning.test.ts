import { describe, expect, it } from 'vitest';
import {
  createInitialSkillsProgress,
  getSkillProficiency,
  indexSkillsCatalog,
  isSkillKnown,
  type IndexedSkills,
  type SkillsProgressState,
} from '../modules/skills';
import {
  TrainingError,
  applyTrainingPlan,
  indexTrainingCatalog,
  planTraining,
  type IndexedTraining,
} from '../modules/training';

function skills(): IndexedSkills {
  return indexSkillsCatalog({
    paths: [
      { id: 'body', name: 'Corpo', description: 'Caminho do corpo.', field: 'corpo' },
      { id: 'power', name: 'Poder', description: 'Caminho do poder.', field: 'poder' },
    ],
    skills: [
      { id: 'sense', name: 'Sentidos', description: 'Percepção.', pathId: 'body' },
      { id: 'steady', name: 'Firmeza', description: 'Resistência.', pathId: 'body' },
      { id: 'spark', name: 'Fagulha', description: 'Centelha.', pathId: 'power' },
    ],
  });
}

function training(catalog: IndexedSkills): IndexedTraining {
  return indexTrainingCatalog(
    {
      methods: [
        {
          id: 'drill',
          name: 'Treino',
          description: 'Assenta os Sentidos.',
          target: { type: 'skill', id: 'sense' },
          cost: { periods: 1 },
          effects: [{ type: 'skill.proficiency.increase', skillId: 'sense', amount: 2 }],
        },
        {
          id: 'learn-steady',
          name: 'Rotina do corpo',
          description: 'Revela a Firmeza.',
          target: { type: 'path', id: 'body' },
          cost: { periods: 2 },
          effects: [{ type: 'skill.learn', skillId: 'steady' }],
        },
        {
          id: 'spark-drill',
          name: 'Treino de fagulha',
          description: 'Assenta a Fagulha.',
          target: { type: 'skill', id: 'spark' },
          cost: { periods: 1 },
          effects: [{ type: 'skill.proficiency.increase', skillId: 'spark', amount: 1 }],
        },
        {
          id: 'power-routine',
          name: 'Rotina de poder',
          description: 'Revela a Fagulha.',
          target: { type: 'path', id: 'power' },
          cost: { periods: 3 },
          effects: [{ type: 'skill.learn', skillId: 'spark' }],
        },
      ],
    },
    catalog,
  );
}

function baseline(catalog: IndexedSkills): SkillsProgressState {
  return createInitialSkillsProgress(catalog);
}

describe('Fatia 11.3 — planejamento de treino', () => {
  it('planeja um treino de habilidade conhecida devolvendo custo e efeitos sem aplicar', () => {
    const s = skills();
    const plan = planTraining(training(s), s, baseline(s), 'drill');

    expect(plan).toEqual({
      methodId: 'drill',
      timeCost: { periods: 1 },
      effects: [{ type: 'skill.proficiency.increase', skillId: 'sense', amount: 2 }],
    });
    expect(baseline(s).entries).toEqual([{ skillId: 'sense', proficiency: 0 }]);
  });

  it('aplica o plano aumentando a proficiência sem mutar o estado anterior', () => {
    const s = skills();
    const before = baseline(s);
    const plan = planTraining(training(s), s, before, 'drill');
    const after = applyTrainingPlan(s, before, plan);

    expect(getSkillProficiency(after, 'sense')).toBe(2);
    expect(getSkillProficiency(before, 'sense')).toBe(0);
  });

  it('revela uma habilidade nova ao treinar um caminho conhecido', () => {
    const s = skills();
    const before = baseline(s);
    const plan = planTraining(training(s), s, before, 'learn-steady');
    const after = applyTrainingPlan(s, before, plan);

    expect(isSkillKnown(after, 'steady')).toBe(true);
    expect(after.entries.map((entry) => entry.skillId)).toEqual(['sense', 'steady']);
    expect(isSkillKnown(before, 'steady')).toBe(false);
  });

  it('recusa treinar uma habilidade ainda não conhecida', () => {
    const s = skills();
    expect(() => planTraining(training(s), s, baseline(s), 'spark-drill')).toThrow(TrainingError);
  });

  it('recusa treinar um caminho ainda não conhecido', () => {
    const s = skills();
    expect(() => planTraining(training(s), s, baseline(s), 'power-routine')).toThrow(TrainingError);
  });

  it('falha de forma controlada para método inexistente', () => {
    const s = skills();
    expect(() => planTraining(training(s), s, baseline(s), 'missing')).toThrow(TrainingError);
  });
});
