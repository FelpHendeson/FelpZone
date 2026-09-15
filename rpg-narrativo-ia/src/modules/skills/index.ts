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
  type SkillTree,
  type SkillTreeNode,
  type SkillTreePath,
} from './types';

export { SkillError } from './errors';

const MAX_PATHS = 128;
const MAX_SKILLS = 2_048;
const MAX_REQUIREMENTS_PER_SKILL = 32;
const MAX_ID_LENGTH = 128;
const MAX_TEXT_LENGTH = 2_000;

export const INITIAL_SKILLS = indexSkillsCatalog(INITIAL_SKILLS_CATALOG);

export function inspectSkillsCatalog(value: unknown): SkillsInspection<IndexedSkills> {
  if (!isRecord(value) || !Array.isArray(value.paths) || !Array.isArray(value.skills)) {
    return fail('O catálogo de habilidades é inválido.');
  }
  if (value.paths.length > MAX_PATHS || value.skills.length > MAX_SKILLS) {
    return fail('O catálogo de habilidades excede os limites permitidos.');
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

  for (const skill of skills) {
    for (const requirement of skill.requires) {
      if (!skillIds.has(requirement)) {
        return fail('Uma habilidade referencia um requisito inexistente.');
      }
    }
  }

  if (hasRequirementCycle(skills)) {
    return fail('Os requisitos de habilidade formam um ciclo.');
  }
  if (skills[0] && skills[0].requires.length > 0) {
    return fail('A habilidade inicial precisa ser uma raiz sem requisitos.');
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
  return copySkill(skill);
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
  return ids.map((id) => copySkill(indexed.skillById.get(id) as SkillDefinition));
}

function copySkill(skill: SkillDefinition): SkillDefinition {
  return {
    id: skill.id,
    name: skill.name,
    description: skill.description,
    pathId: skill.pathId,
    requires: [...skill.requires],
  };
}

export function createInitialSkillsProgress(catalog: IndexedSkills): SkillsProgressState {
  const indexed = requireIndexed(catalog);
  const first = indexed.skills[0];
  if (first && first.requires.length > 0) {
    throw new SkillError('A habilidade inicial precisa ser uma raiz sem requisitos.');
  }
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
    .map((skill) => ({ skill: copySkill(skill), proficiency: getSkillProficiency(state, skill.id) }));
}

export function areSkillRequirementsMet(
  catalog: IndexedSkills,
  state: SkillsProgressState,
  skillId: string,
): boolean {
  const skill = requireIndexed(catalog).skillById.get(skillId);
  if (!skill) {
    throw new SkillError('A habilidade não existe.');
  }
  return skill.requires.every((requirement) => isSkillKnown(state, requirement));
}

export function deriveSkillTree(catalog: IndexedSkills, state: SkillsProgressState): SkillTree {
  const indexed = requireIndexed(catalog);
  const paths: SkillTreePath[] = [];

  for (const path of indexed.paths) {
    const skillIds = indexed.skillIdsByPath.get(path.id) ?? [];
    const nodes: SkillTreeNode[] = [];
    let hasHiddenSkills = false;

    for (const skillId of skillIds) {
      const skill = indexed.skillById.get(skillId) as SkillDefinition;
      if (isSkillKnown(state, skill.id)) {
        nodes.push(treeNode(skill, 'known', getSkillProficiency(state, skill.id)));
      } else if (areSkillRequirementsMet(indexed, state, skill.id)) {
        nodes.push(treeNode(skill, 'available', null));
      } else {
        hasHiddenSkills = true;
      }
    }

    if (nodes.length === 0) {
      continue;
    }

    paths.push({
      pathId: path.id,
      name: path.name,
      field: path.field,
      known: nodes.some((node) => node.status === 'known'),
      nodes,
      hasHiddenSkills,
    });
  }

  return { level: state.level, paths };
}

function treeNode(
  skill: SkillDefinition,
  status: SkillTreeNode['status'],
  proficiency: number | null,
): SkillTreeNode {
  return {
    skillId: skill.id,
    name: skill.name,
    description: skill.description,
    status,
    proficiency,
    requires: [...skill.requires],
  };
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

export function raiseSkillsLevel(state: SkillsProgressState, level: number): SkillsProgressState {
  if (!Number.isSafeInteger(level) || level < 1) {
    throw new SkillError('O nível é inválido.');
  }
  return { level: Math.max(state.level, level), entries: state.entries.map((entry) => ({ ...entry })) };
}

function copySkillsProgress(state: SkillsProgressState): SkillsProgressState {
  return { level: state.level, entries: state.entries.map((entry) => ({ ...entry })) };
}

function skillOrder(catalog: IndexedSkills, skillId: string): number {
  return catalog.skills.findIndex((skill) => skill.id === skillId);
}

function inspectPath(value: unknown, existing: ReadonlySet<string>): SkillsInspection<PathDefinition> {
  if (!isRecord(value) || !validId(value.id) || !validText(value.name) || !validText(value.description)) {
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
  if (!isRecord(value) || !validId(value.id) || !validText(value.name) || !validText(value.description)) {
    return fail('A definição de habilidade é inválida.');
  }
  if (existing.has(value.id)) {
    return fail('Os IDs de habilidade precisam ser únicos.');
  }
  if (!validId(value.pathId) || !pathIds.has(value.pathId)) {
    return fail('A habilidade referencia um caminho inexistente.');
  }
  const requires = inspectRequires(value.requires, value.id);
  if (!requires.ok) {
    return requires;
  }
  return {
    ok: true,
    value: {
      id: value.id,
      name: value.name,
      description: value.description,
      pathId: value.pathId,
      requires: requires.value,
    },
  };
}

function inspectRequires(value: unknown, ownId: string): SkillsInspection<string[]> {
  if (value === undefined) {
    return { ok: true, value: [] };
  }
  if (!Array.isArray(value)) {
    return fail('Os requisitos da habilidade são inválidos.');
  }
  if (value.length > MAX_REQUIREMENTS_PER_SKILL) {
    return fail('A habilidade excede o limite de requisitos permitido.');
  }
  const requires: string[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (!validId(entry) || seen.has(entry) || entry === ownId) {
      return fail('Os requisitos da habilidade são inválidos.');
    }
    seen.add(entry);
    requires.push(entry);
  }
  return { ok: true, value: requires };
}

function hasRequirementCycle(skills: readonly SkillDefinition[]): boolean {
  const pendingRequirements = new Map(skills.map((skill) => [skill.id, skill.requires.length]));
  const dependents = new Map<string, string[]>();
  for (const skill of skills) {
    for (const requirement of skill.requires) {
      const entries = dependents.get(requirement) ?? [];
      entries.push(skill.id);
      dependents.set(requirement, entries);
    }
  }

  const ready = skills.filter((skill) => skill.requires.length === 0).map((skill) => skill.id);
  let processed = 0;
  for (let index = 0; index < ready.length; index += 1) {
    const current = ready[index];
    processed += 1;
    for (const dependent of dependents.get(current) ?? []) {
      const remaining = (pendingRequirements.get(dependent) as number) - 1;
      pendingRequirements.set(dependent, remaining);
      if (remaining === 0) {
        ready.push(dependent);
      }
    }
  }

  return processed !== skills.length;
}

function freezeCatalog(paths: PathDefinition[], skills: SkillDefinition[]): IndexedSkills {
  const frozenPaths = Object.freeze(paths.map((path) => Object.freeze({ ...path })));
  const frozenSkills = Object.freeze(
    skills.map((skill) =>
      Object.freeze({ ...skill, requires: Object.freeze([...skill.requires]) as unknown as string[] }),
    ),
  );

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

function validId(value: unknown): value is string {
  return nonEmpty(value) && value.length <= MAX_ID_LENGTH;
}

function validText(value: unknown): value is string {
  return nonEmpty(value) && value.length <= MAX_TEXT_LENGTH;
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
  type SkillTree,
  type SkillTreeNode,
  type SkillTreeNodeStatus,
  type SkillTreePath,
} from './types';

export { INITIAL_SKILLS_CATALOG } from './initial-skills';
