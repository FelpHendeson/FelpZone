import { isApplicationField } from '../energetics';
import { SkillError } from './errors';
import { ImmutableIndex } from './immutable-index';
import { INITIAL_SKILLS_CATALOG } from './initial-skills';
import {
  type IndexedSkills,
  type PathDefinition,
  type SkillDefinition,
  type SkillProgressEntry,
  type SkillsInspection,
  type SkillsProgressState,
} from './types';

export { SkillError } from './errors';

export const INITIAL_SKILLS = indexSkillsCatalog(INITIAL_SKILLS_CATALOG);

export function inspectSkillsCatalog(value: unknown): SkillsInspection<IndexedSkills> {
  if (!isRecord(value) || !Array.isArray(value.paths) || !Array.isArray(value.skills)) {
    return fail('O catálogo de habilidades é inválido.');
  }

  const paths: PathDefinition[] = [];
  const pathIds = new Set<string>();
  for (const entry of value.paths) {
    const inspected = inspectPath(entry, pathIds);
    if (!inspected.ok) {
      return inspected;
    }
    pathIds.add(inspected.value.id);
    paths.push(inspected.value);
  }

  const skills: SkillDefinition[] = [];
  const skillIds = new Set<string>();
  for (const entry of value.skills) {
    const inspected = inspectSkill(entry, skillIds, pathIds);
    if (!inspected.ok) {
      return inspected;
    }
    skillIds.add(inspected.value.id);
    skills.push(inspected.value);
  }

  return { ok: true, value: freezeCatalog(paths, skills) };
}

export function indexSkillsCatalog(value: unknown): IndexedSkills {
  const inspected = inspectSkillsCatalog(value);
  if (!inspected.ok) {
    throw new SkillError(inspected.reason);
  }
  return inspected.value;
}

export function getPath(catalog: IndexedSkills, pathId: string): PathDefinition {
  const path = requireIndexed(catalog).pathById.get(pathId);
  if (!path) {
    throw new SkillError('O caminho não existe.');
  }
  return { ...path };
}

export function getSkill(catalog: IndexedSkills, skillId: string): SkillDefinition {
  const skill = requireIndexed(catalog).skillById.get(skillId);
  if (!skill) {
    throw new SkillError('A habilidade não existe.');
  }
  return { ...skill };
}

export function hasPath(catalog: IndexedSkills, pathId: unknown): pathId is string {
  return nonEmpty(pathId) && requireIndexed(catalog).pathById.has(pathId);
}

export function hasSkill(catalog: IndexedSkills, skillId: unknown): skillId is string {
  return nonEmpty(skillId) && requireIndexed(catalog).skillById.has(skillId);
}

export function listSkillsByPath(catalog: IndexedSkills, pathId: string): SkillDefinition[] {
  const indexed = requireIndexed(catalog);
  if (!indexed.pathById.has(pathId)) {
    throw new SkillError('O caminho não existe.');
  }
  const ids = indexed.skillIdsByPath.get(pathId) ?? [];
  return ids.map((id) => ({ ...(indexed.skillById.get(id) as SkillDefinition) }));
}

export function createInitialSkillsProgress(catalog: IndexedSkills): SkillsProgressState {
  const indexed = requireIndexed(catalog);
  const first = indexed.skills[0];
  return {
    level: 1,
    entries: first ? [{ skillId: first.id, proficiency: 0 }] : [],
  };
}

export function inspectSkillsProgress(
  value: unknown,
  catalog: IndexedSkills,
): SkillsInspection<SkillsProgressState> {
  const indexed = requireIndexed(catalog);
  if (!isRecord(value) || !positiveSafeInteger(value.level) || !Array.isArray(value.entries)) {
    return fail('O estado de progresso de habilidades é inválido.');
  }

  const entries: SkillProgressEntry[] = [];
  const seen = new Set<string>();
  let previousIndex = -1;
  for (const entry of value.entries) {
    if (!isRecord(entry) || !nonEmpty(entry.skillId) || !nonNegativeSafeInteger(entry.proficiency)) {
      return fail('O progresso de uma habilidade é inválido.');
    }
    const skillIndex = indexed.skills.findIndex((skill) => skill.id === entry.skillId);
    if (skillIndex < 0) {
      return fail('O progresso referencia uma habilidade inexistente.');
    }
    if (seen.has(entry.skillId)) {
      return fail('Uma habilidade aparece mais de uma vez no progresso.');
    }
    if (skillIndex <= previousIndex) {
      return fail('A ordem das habilidades no progresso é inválida.');
    }
    seen.add(entry.skillId);
    previousIndex = skillIndex;
    entries.push({ skillId: entry.skillId, proficiency: entry.proficiency });
  }

  return { ok: true, value: { level: value.level, entries } };
}

export function isSkillKnown(state: SkillsProgressState, skillId: string): boolean {
  return state.entries.some((entry) => entry.skillId === skillId);
}

export function getSkillProficiency(state: SkillsProgressState, skillId: string): number {
  const entry = state.entries.find((item) => item.skillId === skillId);
  if (!entry) {
    throw new SkillError('A habilidade não é conhecida.');
  }
  return entry.proficiency;
}

export function listKnownSkills(
  catalog: IndexedSkills,
  state: SkillsProgressState,
): { skill: SkillDefinition; proficiency: number }[] {
  const indexed = requireIndexed(catalog);
  return indexed.skills
    .filter((skill) => isSkillKnown(state, skill.id))
    .map((skill) => ({ skill: { ...skill }, proficiency: getSkillProficiency(state, skill.id) }));
}

export function increaseSkillProficiency(
  catalog: IndexedSkills,
  state: SkillsProgressState,
  skillId: string,
  amount: number,
): SkillsProgressState {
  requireIndexed(catalog);
  if (!positiveSafeInteger(amount)) {
    throw new SkillError('O incremento de proficiência é inválido.');
  }
  if (!isSkillKnown(state, skillId)) {
    throw new SkillError('A habilidade não é conhecida.');
  }
  return {
    level: state.level,
    entries: state.entries.map((entry) =>
      entry.skillId === skillId ? { skillId, proficiency: entry.proficiency + amount } : { ...entry },
    ),
  };
}

export function learnSkill(
  catalog: IndexedSkills,
  state: SkillsProgressState,
  skillId: string,
): SkillsProgressState {
  const indexed = requireIndexed(catalog);
  if (!indexed.skillById.has(skillId)) {
    throw new SkillError('A habilidade não existe.');
  }
  if (isSkillKnown(state, skillId)) {
    return copySkillsProgress(state);
  }
  const entries = [...state.entries, { skillId, proficiency: 0 }].sort(
    (left, right) => skillOrder(indexed, left.skillId) - skillOrder(indexed, right.skillId),
  );
  return { level: state.level, entries };
}

function copySkillsProgress(state: SkillsProgressState): SkillsProgressState {
  return { level: state.level, entries: state.entries.map((entry) => ({ ...entry })) };
}

function skillOrder(catalog: IndexedSkills, skillId: string): number {
  return catalog.skills.findIndex((skill) => skill.id === skillId);
}

function inspectPath(value: unknown, existing: ReadonlySet<string>): SkillsInspection<PathDefinition> {
  if (!isRecord(value) || !nonEmpty(value.id) || !nonEmpty(value.name) || !nonEmpty(value.description)) {
    return fail('A definição de caminho é inválida.');
  }
  if (existing.has(value.id)) {
    return fail('Os IDs de caminho precisam ser únicos.');
  }
  if (!isApplicationField(value.field)) {
    return fail('O caminho referencia um campo de aplicação inválido.');
  }
  return {
    ok: true,
    value: { id: value.id, name: value.name, description: value.description, field: value.field },
  };
}

function inspectSkill(
  value: unknown,
  existing: ReadonlySet<string>,
  pathIds: ReadonlySet<string>,
): SkillsInspection<SkillDefinition> {
  if (!isRecord(value) || !nonEmpty(value.id) || !nonEmpty(value.name) || !nonEmpty(value.description)) {
    return fail('A definição de habilidade é inválida.');
  }
  if (existing.has(value.id)) {
    return fail('Os IDs de habilidade precisam ser únicos.');
  }
  if (!nonEmpty(value.pathId) || !pathIds.has(value.pathId)) {
    return fail('A habilidade referencia um caminho inexistente.');
  }
  return {
    ok: true,
    value: { id: value.id, name: value.name, description: value.description, pathId: value.pathId },
  };
}

function freezeCatalog(paths: PathDefinition[], skills: SkillDefinition[]): IndexedSkills {
  const frozenPaths = Object.freeze(paths.map((path) => Object.freeze({ ...path })));
  const frozenSkills = Object.freeze(skills.map((skill) => Object.freeze({ ...skill })));

  const skillIdsByPath = new Map<string, string[]>();
  for (const path of frozenPaths) {
    skillIdsByPath.set(path.id, []);
  }
  for (const skill of frozenSkills) {
    (skillIdsByPath.get(skill.pathId) as string[]).push(skill.id);
  }

  return Object.freeze({
    paths: frozenPaths,
    skills: frozenSkills,
    pathById: new ImmutableIndex(frozenPaths.map((path) => [path.id, path] as const)),
    skillById: new ImmutableIndex(frozenSkills.map((skill) => [skill.id, skill] as const)),
    skillIdsByPath: new ImmutableIndex(
      [...skillIdsByPath].map(([pathId, ids]) => [pathId, Object.freeze([...ids])] as const),
    ),
  });
}

function requireIndexed(catalog: IndexedSkills): IndexedSkills {
  if (
    !isRecord(catalog) ||
    !Array.isArray(catalog.paths) ||
    !Array.isArray(catalog.skills) ||
    !isReadonlyMap(catalog.pathById) ||
    !isReadonlyMap(catalog.skillById) ||
    !isReadonlyMap(catalog.skillIdsByPath)
  ) {
    throw new SkillError('O catálogo indexado de habilidades é inválido.');
  }
  return catalog;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isReadonlyMap(value: unknown): value is ReadonlyMap<unknown, unknown> {
  return isRecord(value) && typeof value.get === 'function' && typeof value.keys === 'function' && typeof value.size === 'number';
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function positiveSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function nonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function fail<T>(reason: string): SkillsInspection<T> {
  return { ok: false, reason };
}

export {
  type IndexedSkills,
  type PathDefinition,
  type SkillDefinition,
  type SkillProgressEntry,
  type SkillsCatalog,
  type SkillsInspection,
  type SkillsProgressState,
} from './types';

export { INITIAL_SKILLS_CATALOG } from './initial-skills';
