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
import {
  INITIAL_GARDEN,
  deriveGardenRecipes,
} from '../garden';
import {
  INITIAL_REGISTRY,
  listVisibleRankings,
  planPatentClaim,
  type IndexedRegistry,
} from '../registry';
import { INITIAL_ORGANIZATIONS, listKnownOrganizationActions, listOrganizationViews } from '../organizations';
import { INITIAL_PARTY, listPartyViews } from '../party';
import {
  INITIAL_CALENDAR,
  PLAYER_CALENDAR_ACTOR_ID,
  deriveActorAge,
  describeCalendarDate,
  listUpcomingCalendarEvents,
  type IndexedCalendar,
} from '../calendar';
import { INITIAL_FAMILY, listFamilyViews, listKnownFamilyActions } from '../family';
import { INITIAL_CIVIC, listCivicViews, listKnownCivicActions } from '../civic';
import { INITIAL_ECONOMY, createInitialEconomyState, listEconomyViews, listKnownEconomyActions } from '../economy';
import {
  INITIAL_SETTLEMENTS,
  createInitialSettlementsState,
  listKnownSettlementActions,
  listSettlementViews,
} from '../settlements';
import {
  INITIAL_POLITICS,
  createInitialPoliticsState,
  listKnownPoliticsActions,
  listPoliticsViews,
} from '../politics';
import { INITIAL_EXECUTION } from '../execution';
import type { SandboxContext } from '../sandbox';
import type {
  SystemMilestoneView,
  SystemSkillView,
  SystemStatusView,
  SystemTrainingView,
} from './types';

export function buildSystemStatus(state: GameState, context?: SandboxContext): SystemStatusView {
  const progress = state.system;
  const registryCatalog = context?.registry ?? INITIAL_REGISTRY;
  const organizationCatalog = context?.organizations ?? INITIAL_ORGANIZATIONS;
  const partyCatalog = context?.party ?? INITIAL_PARTY;
  const calendarCatalog = context?.calendar ?? INITIAL_CALENDAR;
  const familyCatalog = context?.family ?? INITIAL_FAMILY;
  const civicCatalog = context?.civic ?? INITIAL_CIVIC;
  const economyCatalog = context?.economy ?? INITIAL_ECONOMY;
  const settlementsCatalog = context?.settlements ?? INITIAL_SETTLEMENTS;
  const politicsCatalog = context?.politics ?? INITIAL_POLITICS;
  const executionCatalog = context?.execution ?? INITIAL_EXECUTION;

  return {
    characterName: `${state.character.firstName} ${state.character.lastName}`.trim(),
    level: progress.level,
    energies: INITIAL_ENERGETICS.energies.map((energy) => ({ ...energy })),
    fields: INITIAL_ENERGETICS.fields.map((field) => ({ ...field })),
    knownSkills: buildKnownSkills(progress),
    tree: deriveSkillTree(INITIAL_SKILLS, progress),
    trainings: buildTrainings(progress),
    nextMilestone: buildNextMilestone(progress),
    garden: {
      cultivationPoints: state.garden.cultivationPoints,
      recipes: deriveGardenRecipes(INITIAL_GARDEN, INITIAL_SKILLS, progress, state.garden),
    },
    registry: buildRegistryView(state, registryCatalog),
    organizations: listOrganizationViews(organizationCatalog, state.organizations ?? { entries: [], consumedActionIds: [] }),
    party: listPartyViews(
      partyCatalog,
      organizationCatalog,
      state.organizations ?? { entries: [], consumedActionIds: [] },
      state.party ?? { tacticId: null, vitals: [] },
    ),
    calendar: buildCalendarView(state, calendarCatalog),
    family: listFamilyViews(
      familyCatalog,
      state.family ?? { ties: [], households: [], stageMarks: [], consumedActionIds: [] },
      calendarCatalog,
      state.world.day,
      (actorId) => (actorId === 'player' ? statusName(state) : actorId === 'mira-vale' ? 'Mira Vale' : actorId === 'rowan-vale' ? 'Rowan Vale' : actorId),
    ),
    familyActions: listKnownFamilyActions(
      familyCatalog,
      state.family ?? { ties: [], households: [], stageMarks: [], consumedActionIds: [] },
      state,
    )
      .filter((entry) => !entry.action.npcId)
      .map((entry) => ({
        actionId: entry.action.id,
        label: entry.action.label,
        hint: entry.action.hint,
        costPeriods: entry.action.timeCost.periods,
        available: entry.available,
        ...(entry.blockedReason ? { blockedReason: entry.blockedReason } : {}),
      })),
    civic: listCivicViews(civicCatalog, state.civic ?? { grants: [], progress: [], usedPermissionIds: [], consumedActionIds: [] }),
    civicActions: listKnownCivicActions(
      civicCatalog,
      state.civic ?? { grants: [], progress: [], usedPermissionIds: [], consumedActionIds: [] },
      state,
    )
      .filter((entry) => !entry.action.npcId)
      .map((entry) => ({
        actionId: entry.action.id,
        label: entry.action.label,
        hint: entry.action.hint,
        costPeriods: entry.action.timeCost.periods,
        available: entry.available,
        ...(entry.blockedReason ? { blockedReason: entry.blockedReason } : {}),
      })),
    economy: listEconomyViews(economyCatalog, state.economy ?? createInitialEconomyState(economyCatalog)),
    economyActions: listKnownEconomyActions(
      economyCatalog,
      state.economy ?? createInitialEconomyState(economyCatalog),
      state,
    )
      .filter((entry) => !entry.action.npcId)
      .map((entry) => ({
        actionId: entry.action.id,
        label: entry.action.label,
        hint: entry.action.hint,
        costPeriods: entry.action.timeCost.periods,
        available: entry.available,
        ...(entry.blockedReason ? { blockedReason: entry.blockedReason } : {}),
      })),
    settlements: listSettlementViews(settlementsCatalog, state.settlements ?? createInitialSettlementsState()),
    settlementActions: listKnownSettlementActions(
      settlementsCatalog,
      state.settlements ?? createInitialSettlementsState(),
      state,
    )
      .filter((entry) => !entry.action.npcId)
      .map((entry) => ({
        actionId: entry.action.id,
        label: entry.action.label,
        hint: entry.action.hint,
        costPeriods: entry.action.timeCost.periods,
        available: entry.available,
        ...(entry.blockedReason ? { blockedReason: entry.blockedReason } : {}),
      })),
    politics: listPoliticsViews(politicsCatalog, state.politics ?? createInitialPoliticsState()),
    politicsActions: listKnownPoliticsActions(
      politicsCatalog,
      state.politics ?? createInitialPoliticsState(),
      state,
    )
      .filter((entry) => !entry.action.npcId)
      .map((entry) => ({
        actionId: entry.action.id,
        label: entry.action.label,
        hint: entry.action.hint,
        costPeriods: entry.action.timeCost.periods,
        available: entry.available,
        ...(entry.blockedReason ? { blockedReason: entry.blockedReason } : {}),
      })),
    execution: {
      reserves: executionCatalog.reserves.map((entry) => ({
        energyId: entry.energyId,
        name: entry.name,
        current: state.execution?.reserves.find((reserve) => reserve.energyId === entry.energyId)?.current ?? entry.max,
        max: entry.max,
      })),
    },
    organizationActions: listKnownOrganizationActions(
      organizationCatalog,
      state.organizations ?? { entries: [], consumedActionIds: [] },
      state,
    )
      .filter((entry) => !entry.action.npcId)
      .map((entry) => ({
        actionId: entry.action.id,
        label: entry.action.label,
        hint: entry.action.hint,
        costPeriods: entry.action.timeCost.periods,
        available: entry.available,
        ...(entry.blockedReason ? { blockedReason: entry.blockedReason } : {}),
      })),
  };
}

function buildRegistryView(state: GameState, catalog: IndexedRegistry): SystemStatusView['registry'] {
  const registry = state.registry ?? { accessGranted: false, patentIds: [], recognizedRankingIds: [] };
  if (!registry.accessGranted) {
    return { accessGranted: false, patents: [], rankings: [] };
  }
  return {
    accessGranted: true,
    patents: catalog.patents.map((patent) => {
      const granted = registry.patentIds.includes(patent.id);
      let claimable = false;
      if (!granted) {
        try {
          planPatentClaim(catalog, registry, state, patent.id);
          claimable = true;
        } catch {
          claimable = false;
        }
      }
      return {
        id: patent.id,
        name: patent.name,
        description: patent.description,
        granted,
        claimable,
      };
    }),
    rankings: listVisibleRankings(catalog, registry, state),
  };
}

function statusName(state: GameState): string {
  return `${state.character.firstName} ${state.character.lastName}`.trim();
}

function buildCalendarView(state: GameState, catalog: IndexedCalendar): SystemStatusView['calendar'] {
  const calendar = state.calendar ?? { consumedEventIds: [] };
  const life = deriveActorAge(catalog, PLAYER_CALENDAR_ACTOR_ID, state.world.day);
  return {
    dateLabel: describeCalendarDate(catalog, state.world.day),
    ageYears: life.ageYears,
    stageName: life.stageName,
    upcoming: listUpcomingCalendarEvents(catalog, state.world.day, calendar),
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
  if (result.grantedCultivationPoints > 0) {
    parts.push(`O Jardim recebeu ${result.grantedCultivationPoints} ponto${result.grantedCultivationPoints === 1 ? '' : 's'} de cultivo.`);
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
