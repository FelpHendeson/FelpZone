import type { TimeCost } from '../time';
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
  cost: TimeCost;
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

export interface SystemTreeRequirementView {
  skillId: string;
  name: string;
  pathName: string;
  /** Requisito em outro caminho: a conexão entre ramos que a Árvore deve desenhar. */
  crossPath: boolean;
  known: boolean;
}

/** Como uma habilidade possível pode ser desenvolvida, sem revelar o que o Sistema ainda não mostrou. */
export type SystemTreeDevelopView =
  | { kind: 'known' }
  | { kind: 'training'; methodId: string; methodName: string; canTrain: boolean; blockedReason?: string }
  | { kind: 'milestone'; level: number }
  | { kind: 'garden' }
  | { kind: 'unrevealed' };

export interface SystemTreeNodeView {
  skillId: string;
  name: string;
  description: string;
  status: 'known' | 'available';
  proficiency: number | null;
  /** `garden` quando a habilidade nasceu de uma integração cultivada. */
  origin: 'path' | 'garden';
  requirements: SystemTreeRequirementView[];
  develop: SystemTreeDevelopView;
}

export interface SystemTreePathView {
  pathId: string;
  name: string;
  description: string;
  field: ApplicationField;
  fieldName: string;
  known: boolean;
  nodes: SystemTreeNodeView[];
  hasHiddenSkills: boolean;
}

export interface SystemGardenRequirementView {
  text: string;
  met: boolean;
}

export interface SystemGardenIntegrationView {
  recipeId: string;
  visibility: 'perceived' | 'available' | 'cultivated';
  name: string | null;
  description: string | null;
  sourceNames: string[];
  resultName: string | null;
  requirements: SystemGardenRequirementView[];
  requirementsMet: boolean;
  cost: { cultivationPoints: number; timeCost: TimeCost } | null;
  canCultivate: boolean;
  blockedReason?: string;
}

export interface SystemStatusView {
  characterName: string;
  level: number;
  energies: SystemEnergyView[];
  fields: SystemFieldView[];
  knownSkills: SystemSkillView[];
  tree: SkillTree;
  skillTree: { paths: SystemTreePathView[]; hasHiddenPaths: boolean };
  trainings: SystemTrainingView[];
  nextMilestone: SystemMilestoneView | null;
  garden: {
    cultivationPoints: number;
    recipes: GardenRecipeView[];
    integrations: SystemGardenIntegrationView[];
    /** Nível do próximo marco compreensível que concede ponto de cultivo, se houver. */
    nextPointLevel: number | null;
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
    cost: TimeCost;
    available: boolean;
    blockedReason?: string;
  }[];
  civic: CivicStandingView[];
  civicActions: {
    actionId: string;
    label: string;
    hint: string;
    cost: TimeCost;
    available: boolean;
    blockedReason?: string;
  }[];
  economy: EconomyView;
  economyActions: {
    actionId: string;
    label: string;
    hint: string;
    cost: TimeCost;
    available: boolean;
    blockedReason?: string;
  }[];
  settlements: SettlementView;
  settlementActions: {
    actionId: string;
    label: string;
    hint: string;
    cost: TimeCost;
    available: boolean;
    blockedReason?: string;
  }[];
  politics: PoliticsView;
  politicsActions: {
    actionId: string;
    label: string;
    hint: string;
    cost: TimeCost;
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
    cost: TimeCost;
    available: boolean;
    blockedReason?: string;
  }[];
}
