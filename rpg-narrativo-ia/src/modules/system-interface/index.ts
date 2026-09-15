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
import type { SystemSkillView, SystemStatusView, SystemTrainingView } from './types';

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
  };
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
    if (!isTargetKnown(progress, method)) {
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
  SystemSkillView,
  SystemStatusView,
  SystemTrainingView,
} from './types';
