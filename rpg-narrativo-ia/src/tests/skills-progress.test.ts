import { describe, expect, it } from 'vitest';
import {
  INITIAL_SKILLS,
  SkillError,
  createInitialSkillsProgress,
  getSkillProficiency,
  indexSkillsCatalog,
  inspectSkillsProgress,
  isSkillKnown,
  listKnownSkills,
  type IndexedSkills,
  type SkillsCatalog,
  type SkillsProgressState,
} from '../modules/skills';

function catalog(): SkillsCatalog {
  return {
    paths: [{ id: 'body', name: 'Corpo', description: 'Caminho do corpo.', field: 'corpo' }],
    skills: [
      { id: 'sense', name: 'Sentidos', description: 'Percepção.', pathId: 'body', requires: [] },
      { id: 'steady', name: 'Firmeza', description: 'Resistência.', pathId: 'body', requires: [] },
    ],
  };
}

function indexed(): IndexedSkills {
  return indexSkillsCatalog(catalog());
}

describe('Fatia 11.2 — estado de progressão do Sistema', () => {
  it('cria um estado inicial com nível 1 e a primeira habilidade conhecida em proficiência 0', () => {
    const value = indexed();
    const progress = createInitialSkillsProgress(value);

    expect(progress).toEqual({ level: 1, entries: [{ skillId: 'sense', proficiency: 0 }] });
    expect(isSkillKnown(progress, 'sense')).toBe(true);
    expect(isSkillKnown(progress, 'steady')).toBe(false);
    expect(getSkillProficiency(progress, 'sense')).toBe(0);
    expect(listKnownSkills(value, progress).map((entry) => entry.skill.id)).toEqual(['sense']);
  });

  it('cria estado sem habilidades quando o catálogo é vazio', () => {
    const empty = indexSkillsCatalog({ paths: [], skills: [] });
    expect(createInitialSkillsProgress(empty)).toEqual({ level: 1, entries: [] });
  });

  it('aceita um estado válido com múltiplas habilidades na ordem do catálogo', () => {
    const value = indexed();
    const inspected = inspectSkillsProgress(
      { level: 2, entries: [{ skillId: 'sense', proficiency: 3 }, { skillId: 'steady', proficiency: 0 }] },
      value,
    );

    expect(inspected.ok).toBe(true);
  });

  it.each([
    null,
    {},
    { level: 0, entries: [] },
    { level: 1.5, entries: [] },
    { level: 1, entries: 'invalid' },
    { level: 1, entries: [{ skillId: 'sense', proficiency: -1 }] },
    { level: 1, entries: [{ skillId: 'sense', proficiency: 1.5 }] },
    { level: 1, entries: [{ skillId: 'missing', proficiency: 0 }] },
    { level: 1, entries: [{ skillId: 'sense', proficiency: 0 }, { skillId: 'sense', proficiency: 1 }] },
    { level: 1, entries: [{ skillId: 'steady', proficiency: 0 }, { skillId: 'sense', proficiency: 0 }] },
  ])('rejeita estado de progressão inválido %#', (value) => {
    expect(inspectSkillsProgress(value, indexed()).ok).toBe(false);
  });

  it('falha de forma controlada ao consultar proficiência de habilidade desconhecida', () => {
    const value = indexed();
    const progress = createInitialSkillsProgress(value);
    expect(() => getSkillProficiency(progress, 'steady')).toThrow(SkillError);
  });

  it('valida o estado inicial derivado do catálogo versionado', () => {
    const progress: SkillsProgressState = createInitialSkillsProgress(INITIAL_SKILLS);
    expect(inspectSkillsProgress(progress, INITIAL_SKILLS).ok).toBe(true);
    expect(progress.level).toBe(1);
  });
});
