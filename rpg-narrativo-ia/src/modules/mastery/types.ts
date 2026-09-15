import type { SkillsProgressState } from '../skills';

export type MasteryEvidence =
  | { type: 'training.completed'; methodId: string }
  | { type: 'combat.victory'; encounterId: string; usedSkillIds: readonly string[] };

export interface PracticeRuleDefinition {
  id: string;
  source: { type: 'combat.victory'; encounterId: string };
  reward: { type: 'used-skill.proficiency.increase'; amount: number; maximumPerSkill: number };
}

export type MasteryRequirement =
  | { type: 'skill.proficiency'; skillId: string; minimum: number }
  | { type: 'skill.known'; skillId: string }
  | { type: 'level.minimum'; level: number };

export type MasteryReveal = { type: 'training.available'; methodId: string };

export interface MasteryMilestoneDefinition {
  id: string;
  level: number;
  requirements: MasteryRequirement[];
  reveals: MasteryReveal[];
}

export interface MasteryCatalog {
  practiceRules: readonly PracticeRuleDefinition[];
  milestones: readonly MasteryMilestoneDefinition[];
}

export interface IndexedMastery {
  readonly practiceRules: readonly PracticeRuleDefinition[];
  readonly milestones: readonly MasteryMilestoneDefinition[];
  readonly practiceRuleByEncounter: ReadonlyMap<string, PracticeRuleDefinition>;
  readonly milestoneById: ReadonlyMap<string, MasteryMilestoneDefinition>;
}

export interface ProficiencyGain {
  skillId: string;
  amount: number;
  source: 'training' | 'combat';
}

export interface MasteryResult {
  previous: SkillsProgressState;
  current: SkillsProgressState;
  proficiencyGains: ProficiencyGain[];
  reachedMilestoneIds: string[];
  revealedTrainingIds: string[];
}

export type MasteryInspection<T> =
  | { ok: true; value: T }
  | { ok: false; reason: string };
