import type { ApplicationField, EnergyKind } from '../energetics';
import type { SkillTree } from '../skills';
import type { GardenRecipeView } from '../garden';
import type { RegistryRankingView } from '../registry';
import type { OrganizationView } from '../organizations';
import type { PartyMemberView } from '../party';
import type { CalendarUpcomingView } from '../calendar';
import type { FamilyMemberView } from '../family';
import type { CivicStandingView } from '../civic';
import type { EconomyView } from '../economy';
import type { SettlementView } from '../settlements';
import type { PoliticsView } from '../politics';

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
  registry: {
    accessGranted: boolean;
    patents: {
      id: string;
      name: string;
      description: string;
      granted: boolean;
      claimable: boolean;
    }[];
    rankings: RegistryRankingView[];
  };
  organizations: OrganizationView[];
  party: PartyMemberView[];
  calendar: {
    dateLabel: string;
    ageYears: number;
    stageName: string;
    upcoming: CalendarUpcomingView[];
  };
  family: FamilyMemberView[];
  familyActions: {
    actionId: string;
    label: string;
    hint: string;
    costPeriods: number;
    available: boolean;
    blockedReason?: string;
  }[];
  civic: CivicStandingView[];
  civicActions: {
    actionId: string;
    label: string;
    hint: string;
    costPeriods: number;
    available: boolean;
    blockedReason?: string;
  }[];
  economy: EconomyView;
  economyActions: {
    actionId: string;
    label: string;
    hint: string;
    costPeriods: number;
    available: boolean;
    blockedReason?: string;
  }[];
  settlements: SettlementView;
  settlementActions: {
    actionId: string;
    label: string;
    hint: string;
    costPeriods: number;
    available: boolean;
    blockedReason?: string;
  }[];
  politics: PoliticsView;
  politicsActions: {
    actionId: string;
    label: string;
    hint: string;
    costPeriods: number;
    available: boolean;
    blockedReason?: string;
  }[];
  execution: {
    reserves: {
      energyId: string;
      name: string;
      current: number;
      max: number;
    }[];
  };
  organizationActions: {
    actionId: string;
    label: string;
    hint: string;
    costPeriods: number;
    available: boolean;
    blockedReason?: string;
  }[];
}
