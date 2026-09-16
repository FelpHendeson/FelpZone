import type { ApplicationField } from '../energetics';

export interface PathDefinition {
  id: string;
  name: string;
  description: string;
  field: ApplicationField;
}

export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  pathId: string;
  requires: string[];
  hiddenUntilKnown?: boolean;
}

export interface SkillsCatalog {
  paths: readonly PathDefinition[];
  skills: readonly SkillDefinition[];
}

export interface IndexedSkills {
  readonly paths: readonly PathDefinition[];
  readonly skills: readonly SkillDefinition[];
  readonly pathById: ReadonlyMap<string, PathDefinition>;
  readonly skillById: ReadonlyMap<string, SkillDefinition>;
  readonly skillIdsByPath: ReadonlyMap<string, readonly string[]>;
}

export interface SkillProgressEntry {
  skillId: string;
  proficiency: number;
}

export interface SkillsProgressState {
  level: number;
  entries: SkillProgressEntry[];
}

export type SkillTreeNodeStatus = 'known' | 'available';

export interface SkillTreeNode {
  skillId: string;
  name: string;
  description: string;
  status: SkillTreeNodeStatus;
  proficiency: number | null;
  requires: string[];
}

export interface SkillTreePath {
  pathId: string;
  name: string;
  field: ApplicationField;
  known: boolean;
  nodes: SkillTreeNode[];
  hasHiddenSkills: boolean;
}

export interface SkillTree {
  level: number;
  paths: SkillTreePath[];
}

export type SkillsInspection<T> =
  | { ok: true; value: T }
  | { ok: false; reason: string };
