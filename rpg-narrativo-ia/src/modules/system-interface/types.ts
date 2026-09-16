import type { ApplicationField, EnergyKind } from '../energetics';
import type { SkillTree } from '../skills';
import type { GardenRecipeView } from '../garden';

export interface SystemEnergyView {
  id: EnergyKind;
  name: string;
  description: string;
}

export interface SystemFieldView {
  id: ApplicationField;
  name: string;
  description: string;
}

export interface SystemSkillView {
  skillId: string;
  name: string;
  description: string;
  pathId: string;
  pathName: string;
  field: ApplicationField;
  proficiency: number;
}

export interface SystemTrainingView {
  methodId: string;
  name: string;
  description: string;
  targetLabel: string;
  costPeriods: number;
  effectsSummary: string[];
  requirementsSummary: string[];
  canTrain: boolean;
  blockedReason?: string;
}

export interface SystemMilestoneRequirementView {
  text: string;
  met: boolean;
}

export interface SystemMilestoneView {
  level: number;
  requirements: SystemMilestoneRequirementView[];
}

export interface SystemStatusView {
  characterName: string;
  level: number;
  energies: SystemEnergyView[];
  fields: SystemFieldView[];
  knownSkills: SystemSkillView[];
  tree: SkillTree;
  trainings: SystemTrainingView[];
  nextMilestone: SystemMilestoneView | null;
  garden: {
    cultivationPoints: number;
    recipes: GardenRecipeView[];
  };
}
