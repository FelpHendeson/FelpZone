import {
  getSkillProficiency,
  increaseSkillProficiency,
  isSkillKnown,
  raiseSkillsLevel,
  type IndexedSkills,
  type SkillsProgressState,
} from '../skills';
import type {
  IndexedMastery,
  MasteryEvidence,
  MasteryRequirement,
  MasteryResult,
  ProficiencyGain,
} from './types';

export function areMasteryRequirementsMet(
  requirements: readonly MasteryRequirement[],
  progress: SkillsProgressState,
): boolean {
  return requirements.every((requirement) => isRequirementMet(requirement, progress));
}

export function isRequirementMet(requirement: MasteryRequirement, progress: SkillsProgressState): boolean {
  if (requirement.type === 'level.minimum') {
    return progress.level >= requirement.level;
  }
  if (requirement.type === 'skill.known') {
    return isSkillKnown(progress, requirement.skillId);
  }
  return isSkillKnown(progress, requirement.skillId) && getSkillProficiency(progress, requirement.skillId) >= requirement.minimum;
}

export function applyMastery(
  catalog: IndexedMastery,
  skills: IndexedSkills,
  progress: SkillsProgressState,
  evidence: MasteryEvidence,
): MasteryResult {
  const previous = copyProgress(progress);
  let current = copyProgress(progress);
  const proficiencyGains: ProficiencyGain[] = [];

  if (evidence.type === 'combat.victory') {
    const rule = catalog.practiceRuleByEncounter.get(evidence.encounterId);
    if (rule) {
      const seen = new Set<string>();
      for (const skillId of evidence.usedSkillIds) {
        if (seen.has(skillId) || !isSkillKnown(current, skillId)) {
          continue;
        }
        seen.add(skillId);
        const amount = Math.min(rule.reward.amount, rule.reward.maximumPerSkill);
        current = increaseSkillProficiency(skills, current, skillId, amount);
        proficiencyGains.push({ skillId, amount, source: 'combat' });
      }
    }
  }

  const reachedMilestoneIds: string[] = [];
  const revealedTrainingIds: string[] = [];
  const ordered = [...catalog.milestones].sort((left, right) => left.level - right.level);
  let progressed = true;
  while (progressed) {
    progressed = false;
    for (const milestone of ordered) {
      if (milestone.level > current.level && areMasteryRequirementsMet(milestone.requirements, current)) {
        current = raiseSkillsLevel(current, milestone.level);
        reachedMilestoneIds.push(milestone.id);
        for (const reveal of milestone.reveals) {
          revealedTrainingIds.push(reveal.methodId);
        }
        progressed = true;
      }
    }
  }

  return {
    previous,
    current: copyProgress(current),
    proficiencyGains,
    reachedMilestoneIds,
    revealedTrainingIds,
  };
}

function copyProgress(progress: SkillsProgressState): SkillsProgressState {
  return { level: progress.level, entries: progress.entries.map((entry) => ({ ...entry })) };
}
