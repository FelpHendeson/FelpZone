import type { GameState } from '../../core/state/types';
import { INITIAL_ENERGETICS } from '../energetics';
import {
  INITIAL_SKILLS,
  deriveSkillTree,
  getPath,
  getSkill,
  isSkillKnown,
  listKnownSkills,
  type SkillsProgressState,
} from '../skills';
import {
  INITIAL_TRAINING,
  planTraining,
  TrainingError,
  type TrainingEffect,
  type TrainingMethodDefinition,
} from '../training';
import {
  INITIAL_MASTERY,
  areMasteryRequirementsMet,
  describeMasteryRequirement,
  isRequirementMet,
  type MasteryRequirement,
  type MasteryResult,
} from '../mastery';
import type {
  SystemMilestoneView,
  SystemSkillView,
  SystemStatusView,
  SystemTrainingView,
} from './types';

export function buildSystemStatus(state: GameState): SystemStatusView {
  const progress = state.system;

  return {
    characterName: `${state.character.firstName} ${state.character.lastName}`.trim(),
    level: progress.level,
    energies: INITIAL_ENERGETICS.energies.map((energy) => ({ ...energy })),
    fields: INITIAL_ENERGETICS.fields.map((field) => ({ ...field })),
    knownSkills: buildKnownSkills(progress),
    tree: deriveSkillTree(INITIAL_SKILLS, progress),
    trainings: buildTrainings(progress),
    nextMilestone: buildNextMilestone(progress),
  };
}

function resolveSkillName(skillId: string): string {
  return getSkill(INITIAL_SKILLS, skillId).name;
}

function buildNextMilestone(progress: SkillsProgressState): SystemMilestoneView | null {
  const candidates = INITIAL_MASTERY.milestones
    .filter((milestone) => milestone.level > progress.level)
    .filter((milestone) => milestone.requirements.every((requirement) => isRequirementComprehensible(requirement, progress)))
    .sort((left, right) => left.level - right.level);
  const milestone = candidates[0];
  if (!milestone) {
    return null;
  }
  return {
    level: milestone.level,
    requirements: milestone.requirements.map((requirement) => ({
      text: describeMasteryRequirement(requirement, resolveSkillName),
      met: isRequirementMet(requirement, progress),
    })),
  };
}

function isRequirementComprehensible(requirement: MasteryRequirement, progress: SkillsProgressState): boolean {
  if (requirement.type === 'level.minimum') {
    return true;
  }
  return isSkillKnown(progress, requirement.skillId);
}

export function describeMasteryProgress(result: MasteryResult): string {
  const parts: string[] = [];
  for (const gain of result.proficiencyGains) {
    parts.push(`Você praticou ${resolveSkillName(gain.skillId)} (+${gain.amount}).`);
  }
  for (const milestoneId of result.reachedMilestoneIds) {
    const milestone = INITIAL_MASTERY.milestoneById.get(milestoneId);
    if (milestone) {
      parts.push(`Nível ${milestone.level} alcançado.`);
    }
  }
  for (const methodId of result.revealedTrainingIds) {
    const method = INITIAL_TRAINING.byId.get(methodId);
    if (method) {
      parts.push(`Nova orientação do Sistema: ${method.name}.`);
    }
  }
  return parts.join(' ');
}

function buildKnownSkills(progress: SkillsProgressState): SystemSkillView[] {
  return listKnownSkills(INITIAL_SKILLS, progress).map(({ skill, proficiency }) => {
    const path = getPath(INITIAL_SKILLS, skill.pathId);
    return {
      skillId: skill.id,
      name: skill.name,
      description: skill.description,
      pathId: path.id,
      pathName: path.name,
      field: path.field,
      proficiency,
    };
  });
}

function buildTrainings(progress: SkillsProgressState): SystemTrainingView[] {
  const views: SystemTrainingView[] = [];

  for (const method of INITIAL_TRAINING.methods) {
    if (!isTargetKnown(progress, method) || !areMasteryRequirementsMet(method.requirements, progress)) {
      continue;
    }

    let canTrain = true;
    let blockedReason: string | undefined;
    try {
      planTraining(INITIAL_TRAINING, INITIAL_SKILLS, progress, method.id);
    } catch (error) {
      canTrain = false;
      blockedReason = error instanceof TrainingError ? error.message : 'O treino não está disponível agora.';
    }

    views.push({
      methodId: method.id,
      name: method.name,
      description: method.description,
      targetLabel: describeTarget(method),
      costPeriods: method.cost.periods,
      effectsSummary: method.effects.map(describeEffect),
      requirementsSummary: method.requirements.map((requirement) => describeMasteryRequirement(requirement, resolveSkillName)),
      canTrain,
      ...(blockedReason ? { blockedReason } : {}),
    });
  }

  return views;
}

function isTargetKnown(progress: SkillsProgressState, method: TrainingMethodDefinition): boolean {
  if (method.target.type === 'skill') {
    return isSkillKnown(progress, method.target.id);
  }
  return listKnownSkills(INITIAL_SKILLS, progress).some(({ skill }) => skill.pathId === method.target.id);
}

function describeTarget(method: TrainingMethodDefinition): string {
  if (method.target.type === 'skill') {
    return `Habilidade: ${getSkill(INITIAL_SKILLS, method.target.id).name}`;
  }
  return `Caminho: ${getPath(INITIAL_SKILLS, method.target.id).name}`;
}

function describeEffect(effect: TrainingEffect): string {
  const skillName = getSkill(INITIAL_SKILLS, effect.skillId).name;
  if (effect.type === 'skill.proficiency.increase') {
    return `Aprofunda ${skillName} (+${effect.amount})`;
  }
  return `Revela a habilidade ${skillName}`;
}

export type {
  SystemEnergyView,
  SystemFieldView,
  SystemMilestoneRequirementView,
  SystemMilestoneView,
  SystemSkillView,
  SystemStatusView,
  SystemTrainingView,
} from './types';
