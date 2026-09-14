import { describe, expect, it } from 'vitest';
import {
  INITIAL_SKILLS,
  INITIAL_SKILLS_CATALOG,
  SkillError,
  getPath,
  getSkill,
  hasPath,
  hasSkill,
  indexSkillsCatalog,
  inspectSkillsCatalog,
  listSkillsByPath,
  type IndexedSkills,
  type PathDefinition,
  type SkillDefinition,
  type SkillsCatalog,
} from '../modules/skills';

function path(overrides: Partial<PathDefinition> = {}): PathDefinition {
  return { id: 'body', name: 'Corpo', description: 'Caminho do corpo.', field: 'corpo', ...overrides };
}

function skill(overrides: Partial<SkillDefinition> = {}): SkillDefinition {
  return { id: 'sense', name: 'Sentidos', description: 'Percepção reforçada.', pathId: 'body', ...overrides };
}

function catalog(): SkillsCatalog {
  return {
    paths: [
      path(),
      path({ id: 'power', name: 'Poder', description: 'Caminho do poder.', field: 'poder' }),
    ],
    skills: [
      skill(),
      skill({ id: 'steady', name: 'Firmeza', description: 'Resistência.', pathId: 'body' }),
      skill({ id: 'spark', name: 'Fagulha', description: 'Centelha.', pathId: 'power' }),
    ],
  };
}

function indexed(): IndexedSkills {
  return indexSkillsCatalog(catalog());
}

describe('Fatia 11.1 — catálogo de habilidades', () => {
  it('indexa caminhos e habilidades preservando a ordem e agrupando por caminho', () => {
    const value = indexed();

    expect(value.paths.map((entry) => entry.id)).toEqual(['body', 'power']);
    expect(value.skills.map((entry) => entry.id)).toEqual(['sense', 'steady', 'spark']);
    expect(listSkillsByPath(value, 'body').map((entry) => entry.id)).toEqual(['sense', 'steady']);
    expect(listSkillsByPath(value, 'power').map((entry) => entry.id)).toEqual(['spark']);
    expect(getPath(value, 'power').field).toBe('poder');
    expect(getSkill(value, 'spark').pathId).toBe('power');
  });

  it.each([
    null,
    {},
    { paths: 'invalid', skills: [] },
    { paths: catalog().paths, skills: 'invalid' },
    { paths: [path({ id: '' })], skills: [] },
    { paths: [path({ name: ' ' })], skills: [] },
    { paths: [path({ field: 'mente' as PathDefinition['field'] })], skills: [] },
    { paths: [path(), path()], skills: [] },
    { paths: catalog().paths, skills: [skill({ id: '' })] },
    { paths: catalog().paths, skills: [skill(), skill()] },
    { paths: catalog().paths, skills: [skill({ pathId: 'missing' })] },
    { paths: catalog().paths, skills: [skill({ pathId: '' })] },
  ])('rejeita forma de catálogo inválida %#', (value) => {
    expect(inspectSkillsCatalog(value).ok).toBe(false);
  });

  it('congela definições e devolve cópias defensivas nas consultas', () => {
    const source = catalog();
    const value = indexSkillsCatalog(source);

    source.paths[0].name = 'Alterado fora';
    source.skills[0].name = 'Alterada fora';
    expect(value.paths[0].name).toBe('Corpo');
    expect(value.skills[0].name).toBe('Sentidos');
    expect(() => (value.paths as PathDefinition[]).push(path())).toThrow();
    expect(() => ((value.skills as SkillDefinition[])[0].name = 'x')).toThrow();

    const copiedPath = getPath(value, 'body');
    copiedPath.name = 'mutado';
    const copiedSkill = getSkill(value, 'sense');
    copiedSkill.name = 'mutada';
    listSkillsByPath(value, 'body')[0].name = 'mutada';
    expect(getPath(value, 'body').name).toBe('Corpo');
    expect(getSkill(value, 'sense').name).toBe('Sentidos');
  });

  it('protege os índices contra set, delete e clear', () => {
    const value = indexed();
    const mutable = value.pathById as Map<string, PathDefinition>;

    expect(() => mutable.set('forged', path({ id: 'forged' }))).toThrow(SkillError);
    expect(() => mutable.delete('body')).toThrow(SkillError);
    expect(() => mutable.clear()).toThrow(SkillError);
    expect(() => (value.skillById as Map<string, SkillDefinition>).set('x', skill({ id: 'x' }))).toThrow(SkillError);
  });

  it('resolve consultas e falha de forma controlada para IDs inexistentes', () => {
    const value = indexed();

    expect(hasPath(value, 'body')).toBe(true);
    expect(hasPath(value, 'missing')).toBe(false);
    expect(hasSkill(value, 'spark')).toBe(true);
    expect(hasSkill(value, 'missing')).toBe(false);
    expect(() => getPath(value, 'missing')).toThrow(SkillError);
    expect(() => getSkill(value, 'missing')).toThrow(SkillError);
    expect(() => listSkillsByPath(value, 'missing')).toThrow(SkillError);
    expect(() => getPath({} as IndexedSkills, 'body')).toThrow(SkillError);
  });

  it('valida o catálogo inicial versionado', () => {
    expect(inspectSkillsCatalog(INITIAL_SKILLS_CATALOG).ok).toBe(true);
    expect(INITIAL_SKILLS.skills.every((entry) => INITIAL_SKILLS.pathById.has(entry.pathId))).toBe(true);
  });
});
