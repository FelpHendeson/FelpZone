import { describe, expect, it } from 'vitest';
import { INITIAL_SKILLS, indexSkillsCatalog, type IndexedSkills, type SkillsCatalog } from '../modules/skills';
import {
  INITIAL_TRAINING,
  INITIAL_TRAINING_CATALOG,
  TrainingError,
  getTrainingMethod,
  hasTrainingMethod,
  indexTrainingCatalog,
  inspectTrainingCatalog,
  type IndexedTraining,
  type TrainingCatalog,
  type TrainingMethodDefinition,
} from '../modules/training';

function skillsCatalog(): SkillsCatalog {
  return {
    paths: [{ id: 'body', name: 'Corpo', description: 'Caminho do corpo.', field: 'corpo' }],
    skills: [{ id: 'sense', name: 'Sentidos', description: 'Percepção.', pathId: 'body', requires: [] }],
  };
}

function skills(): IndexedSkills {
  return indexSkillsCatalog(skillsCatalog());
}

function method(overrides: Partial<TrainingMethodDefinition> = {}): TrainingMethodDefinition {
  return {
    id: 'perception-drill',
    name: 'Treino de percepção',
    description: 'Assenta os Sentidos.',
    target: { type: 'skill', id: 'sense' },
    cost: { periods: 1 },
    effects: [{ type: 'skill.proficiency.increase', skillId: 'sense', amount: 1 }],
    ...overrides,
  };
}

function catalog(): TrainingCatalog {
  return {
    methods: [
      method(),
      method({ id: 'body-routine', name: 'Rotina do corpo', target: { type: 'path', id: 'body' }, cost: { periods: 2 } }),
    ],
  };
}

function indexed(): IndexedTraining {
  return indexTrainingCatalog(catalog(), skills());
}

describe('Fatia 11.1 — catálogo de treinamentos', () => {
  it('indexa métodos válidos preservando a ordem e resolvendo alvos', () => {
    const value = indexed();

    expect(value.methods.map((entry) => entry.id)).toEqual(['perception-drill', 'body-routine']);
    expect(getTrainingMethod(value, 'perception-drill').target).toEqual({ type: 'skill', id: 'sense' });
    expect(getTrainingMethod(value, 'body-routine').cost.periods).toBe(2);
  });

  it.each([
    null,
    {},
    { methods: 'invalid' },
    { methods: [method({ id: '' })] },
    { methods: [method({ name: ' ' })] },
    { methods: [method(), method()] },
    { methods: [method({ target: { type: 'skill', id: 'missing' } })] },
    { methods: [method({ target: { type: 'path', id: 'missing' } })] },
    { methods: [method({ target: { type: 'guild' as never, id: 'sense' } })] },
    { methods: [method({ target: { type: 'skill', id: '' } })] },
    { methods: [method({ cost: { periods: 0 } })] },
    { methods: [method({ cost: { periods: 1.5 } })] },
    { methods: [method({ cost: { periods: -1 } })] },
    { methods: [method({ cost: {} as TrainingMethodDefinition['cost'] })] },
    { methods: [method({ effects: [] })] },
    { methods: [method({ effects: [{ type: 'skill.proficiency.increase', skillId: 'missing', amount: 1 }] })] },
    { methods: [method({ effects: [{ type: 'skill.proficiency.increase', skillId: 'sense', amount: 0 }] })] },
    { methods: [method({ effects: [{ type: 'skill.learn', skillId: 'missing' }] })] },
    { methods: [method({ effects: [{ type: 'unknown' as never, skillId: 'sense' }] })] },
  ])('rejeita forma de catálogo inválida %#', (value) => {
    expect(inspectTrainingCatalog(value, skills()).ok).toBe(false);
  });

  it('congela métodos e devolve cópias defensivas nas consultas', () => {
    const source = catalog();
    const value = indexTrainingCatalog(source, skills());

    source.methods[0].name = 'Alterado fora';
    expect(value.methods[0].name).toBe('Treino de percepção');
    expect(() => (value.methods as TrainingMethodDefinition[]).push(method())).toThrow();
    expect(() => ((value.methods as TrainingMethodDefinition[])[0].cost.periods = 9)).toThrow();

    const copied = getTrainingMethod(value, 'perception-drill');
    copied.cost.periods = 99;
    copied.target.id = 'mutado';
    expect(getTrainingMethod(value, 'perception-drill').cost.periods).toBe(1);
    expect(getTrainingMethod(value, 'perception-drill').target.id).toBe('sense');
  });

  it('protege o índice contra set, delete e clear', () => {
    const value = indexed();
    const mutable = value.byId as Map<string, TrainingMethodDefinition>;

    expect(() => mutable.set('forged', method({ id: 'forged' }))).toThrow(TrainingError);
    expect(() => mutable.delete('perception-drill')).toThrow(TrainingError);
    expect(() => mutable.clear()).toThrow(TrainingError);
  });

  it('resolve consultas e falha de forma controlada para IDs inexistentes', () => {
    const value = indexed();

    expect(hasTrainingMethod(value, 'perception-drill')).toBe(true);
    expect(hasTrainingMethod(value, 'missing')).toBe(false);
    expect(() => getTrainingMethod(value, 'missing')).toThrow(TrainingError);
    expect(() => getTrainingMethod({} as IndexedTraining, 'perception-drill')).toThrow(TrainingError);
    expect(() => indexTrainingCatalog({}, skills())).toThrow(TrainingError);
  });

  it('valida o catálogo inicial versionado contra as habilidades iniciais', () => {
    expect(inspectTrainingCatalog(INITIAL_TRAINING_CATALOG, INITIAL_SKILLS).ok).toBe(true);
    expect(INITIAL_TRAINING.methods.length).toBeGreaterThan(0);
  });
});
