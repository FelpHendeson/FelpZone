import { describe, expect, it } from 'vitest';
import {
  createInitialSkillsProgress,
  deriveSkillTree,
  indexSkillsCatalog,
  learnSkill,
  type IndexedSkills,
  type SkillsCatalog,
} from '../modules/skills';

function catalog(): SkillsCatalog {
  return {
    paths: [
      { id: 'body', name: 'Corpo', description: 'Caminho do corpo.', field: 'corpo' },
      { id: 'power', name: 'Poder', description: 'Caminho do poder.', field: 'poder' },
    ],
    skills: [
      { id: 'sense', name: 'Sentidos', description: 'Percepção.', pathId: 'body', requires: [] },
      { id: 'steady', name: 'Firmeza', description: 'Resistência.', pathId: 'body', requires: ['sense'] },
      { id: 'mastery', name: 'Maestria Oculta', description: 'Segredo profundo.', pathId: 'body', requires: ['spark'] },
      { id: 'spark', name: 'Fagulha', description: 'Centelha.', pathId: 'power', requires: ['steady'] },
    ],
  };
}

function indexed(): IndexedSkills {
  return indexSkillsCatalog(catalog());
}

describe('Fatia 11.4 — árvore de habilidades', () => {
  it('deriva conhecido, disponível e conta o oculto sem vazar conteúdo bloqueado', () => {
    const value = indexed();
    const tree = deriveSkillTree(value, createInitialSkillsProgress(value));

    expect(tree.level).toBe(1);
    expect(tree.paths.map((path) => path.pathId)).toEqual(['body']);

    const body = tree.paths[0];
    expect(body.known).toBe(true);
    expect(body.nodes).toEqual([
      { skillId: 'sense', name: 'Sentidos', description: 'Percepção.', status: 'known', proficiency: 0, requires: [] },
      {
        skillId: 'steady',
        name: 'Firmeza',
        description: 'Resistência.',
        status: 'available',
        proficiency: null,
        requires: ['sense'],
      },
    ]);
    expect(body.hiddenCount).toBe(1);

    const serialized = JSON.stringify(tree);
    expect(serialized).not.toContain('Maestria Oculta');
    expect(serialized).not.toContain('Fagulha');
  });

  it('revela um caminho novo apenas quando os requisitos são cumpridos', () => {
    const value = indexed();
    const progress = learnSkill(value, createInitialSkillsProgress(value), 'steady');
    const tree = deriveSkillTree(value, progress);

    expect(tree.paths.map((path) => path.pathId)).toEqual(['body', 'power']);
    const power = tree.paths.find((path) => path.pathId === 'power');
    expect(power?.known).toBe(false);
    expect(power?.nodes).toEqual([
      {
        skillId: 'spark',
        name: 'Fagulha',
        description: 'Centelha.',
        status: 'available',
        proficiency: null,
        requires: ['steady'],
      },
    ]);
  });

  it('não muta o estado e é estável em consultas repetidas', () => {
    const value = indexed();
    const progress = createInitialSkillsProgress(value);
    const first = deriveSkillTree(value, progress);
    const second = deriveSkillTree(value, progress);

    expect(second).toEqual(first);
    expect(progress.entries).toEqual([{ skillId: 'sense', proficiency: 0 }]);
    expect(() => first.paths.push(first.paths[0])).not.toThrow();
    expect(deriveSkillTree(value, progress).paths).toHaveLength(1);
  });
});
