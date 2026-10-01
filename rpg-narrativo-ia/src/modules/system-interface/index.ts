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
  GardenError,
  INITIAL_GARDEN,
  deriveGardenRecipes,
  planGardenCultivation,
  type GardenRecipeView,
  type GardenRequirement,
  type GardenState,
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
  SystemGardenIntegrationView,
  SystemMilestoneView,
  SystemSkillView,
  SystemStatusView,
  SystemTrainingView,
  SystemTreeDevelopView,
  SystemTreeNodeView,
  SystemTreePathView,
} from './types';

export function buildSystemStatus(state: GameState, context?: SandboxContext): SystemStatusView {
  const progress = state.system;
  const catalogs = systemCatalogs(context);
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
    energies: catalogs.energetics.energies.map((energy) => ({ ...energy })),
    fields: catalogs.energetics.fields.map((field) => ({ ...field })),
    knownSkills: buildKnownSkills(progress, catalogs),
    tree: deriveSkillTree(catalogs.skills, progress),
    skillTree: buildSkillTreeView(progress, state.garden, catalogs),
    trainings: buildTrainings(progress, catalogs),
    nextMilestone: buildNextMilestone(progress, catalogs),
    garden: {
      cultivationPoints: state.garden.cultivationPoints,
      recipes: deriveGardenRecipes(catalogs.garden, catalogs.skills, progress, state.garden),
      integrations: buildGardenIntegrations(progress, state.garden, catalogs),
      nextPointLevel: nextCultivationPointLevel(progress, catalogs),
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

function systemCatalogs(context?: SandboxContext) {
  if (!context) {
    return {
      skills: INITIAL_SKILLS,
      training: INITIAL_TRAINING,
      mastery: INITIAL_MASTERY,
      energetics: INITIAL_ENERGETICS,
      garden: INITIAL_GARDEN,
    };
  }

  return {
    skills: requireSystemCatalog(context.skills, 'habilidades'),
    training: requireSystemCatalog(context.training, 'treinamentos'),
    mastery: requireSystemCatalog(context.mastery, 'maestria'),
    energetics: requireSystemCatalog(context.energetics, 'energia'),
    garden: requireSystemCatalog(context.garden, 'Jardim'),
  };
}

function requireSystemCatalog<T>(value: T | undefined, label: string): T {
  if (value === undefined) {
    throw new Error(`O catálogo de ${label} do pack ativo não está disponível.`);
  }
  return value;
}

function resolveSkillName(skillId: string, catalogs: ReturnType<typeof systemCatalogs>): string {
  return getSkill(catalogs.skills, skillId).name;
}

function buildNextMilestone(
  progress: SkillsProgressState,
  catalogs: ReturnType<typeof systemCatalogs>,
): SystemMilestoneView | null {
  const candidates = catalogs.mastery.milestones
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
      text: describeMasteryRequirement(requirement, (skillId) => resolveSkillName(skillId, catalogs)),
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

export function describeMasteryProgress(result: MasteryResult, context?: SandboxContext): string {
  const catalogs = systemCatalogs(context);
  const parts: string[] = [];
  for (const gain of result.proficiencyGains) {
    parts.push(`Você praticou ${resolveSkillName(gain.skillId, catalogs)} (+${gain.amount}).`);
  }
  for (const milestoneId of result.reachedMilestoneIds) {
    const milestone = catalogs.mastery.milestoneById.get(milestoneId);
    if (milestone) {
      parts.push(`Nível ${milestone.level} alcançado.`);
    }
  }
  for (const methodId of result.revealedTrainingIds) {
    const method = catalogs.training.byId.get(methodId);
    if (method) {
      parts.push(`Nova orientação do Sistema: ${method.name}.`);
    }
  }
  if (result.grantedCultivationPoints > 0) {
    parts.push(`O Jardim recebeu ${result.grantedCultivationPoints} ponto${result.grantedCultivationPoints === 1 ? '' : 's'} de cultivo.`);
  }
  return parts.join(' ');
}

function buildKnownSkills(
  progress: SkillsProgressState,
  catalogs: ReturnType<typeof systemCatalogs>,
): SystemSkillView[] {
  return listKnownSkills(catalogs.skills, progress).map(({ skill, proficiency }) => {
    const path = getPath(catalogs.skills, skill.pathId);
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

function buildTrainings(
  progress: SkillsProgressState,
  catalogs: ReturnType<typeof systemCatalogs>,
): SystemTrainingView[] {
  const views: SystemTrainingView[] = [];

  for (const method of catalogs.training.methods) {
    if (!isTargetKnown(progress, method, catalogs) || !areMasteryRequirementsMet(method.requirements, progress)) {
      continue;
    }

    let canTrain = true;
    let blockedReason: string | undefined;
    try {
      planTraining(catalogs.training, catalogs.skills, progress, method.id);
    } catch (error) {
      canTrain = false;
      blockedReason = error instanceof TrainingError ? error.message : 'O treino não está disponível agora.';
    }

    views.push({
      methodId: method.id,
      name: method.name,
      description: method.description,
      targetLabel: describeTarget(method, catalogs),
      costPeriods: method.cost.periods,
      effectsSummary: method.effects.map((effect) => describeEffect(effect, catalogs)),
      requirementsSummary: method.requirements.map((requirement) =>
        describeMasteryRequirement(requirement, (skillId) => resolveSkillName(skillId, catalogs)),
      ),
      canTrain,
      ...(blockedReason ? { blockedReason } : {}),
    });
  }

  return views;
}

function isTargetKnown(
  progress: SkillsProgressState,
  method: TrainingMethodDefinition,
  catalogs: ReturnType<typeof systemCatalogs>,
): boolean {
  if (method.target.type === 'skill') {
    return isSkillKnown(progress, method.target.id);
  }
  return listKnownSkills(catalogs.skills, progress).some(({ skill }) => skill.pathId === method.target.id);
}

function describeTarget(method: TrainingMethodDefinition, catalogs: ReturnType<typeof systemCatalogs>): string {
  if (method.target.type === 'skill') {
    return `Habilidade: ${getSkill(catalogs.skills, method.target.id).name}`;
  }
  return `Caminho: ${getPath(catalogs.skills, method.target.id).name}`;
}

const FIELD_NAMES: Record<string, string> = { corpo: 'Corpo', poder: 'Poder' };

/**
 * Árvore enriquecida (Sistema 11): requisitos nomeados, conexões entre caminhos,
 * origem no Jardim e como desenvolver cada possibilidade — sem revelar treino,
 * marco ou receita que o Sistema ainda não mostrou.
 */
function buildSkillTreeView(
  progress: SkillsProgressState,
  garden: GardenState,
  catalogs: ReturnType<typeof systemCatalogs>,
): { paths: SystemTreePathView[]; hasHiddenPaths: boolean } {
  const tree = deriveSkillTree(catalogs.skills, progress);
  const trainings = buildTrainings(progress, catalogs);
  const gardenResults = new Set(
    catalogs.garden.recipes.filter((recipe) => garden.completedRecipeIds.includes(recipe.id)).map((recipe) => recipe.resultSkillId),
  );
  const paths = tree.paths.map((path): SystemTreePathView => {
    const definition = getPath(catalogs.skills, path.pathId);
    return {
      pathId: path.pathId,
      name: path.name,
      description: definition.description,
      field: path.field,
      fieldName: FIELD_NAMES[path.field] ?? path.field,
      known: path.known,
      hasHiddenSkills: path.hasHiddenSkills,
      nodes: path.nodes.map((node): SystemTreeNodeView => ({
        skillId: node.skillId,
        name: node.name,
        description: node.description,
        status: node.status,
        proficiency: node.proficiency,
        origin: gardenResults.has(node.skillId) ? 'garden' : 'path',
        requirements: node.requires.map((requirementId) => {
          const requirement = getSkill(catalogs.skills, requirementId);
          return {
            skillId: requirementId,
            name: requirement.name,
            pathName: getPath(catalogs.skills, requirement.pathId).name,
            crossPath: requirement.pathId !== path.pathId,
            known: isSkillKnown(progress, requirementId),
          };
        }),
        develop: node.status === 'known' ? { kind: 'known' } : developPathFor(node.skillId, progress, trainings, catalogs),
      })),
    };
  });
  return { paths, hasHiddenPaths: paths.length < catalogs.skills.paths.length };
}

function developPathFor(
  skillId: string,
  progress: SkillsProgressState,
  trainings: SystemTrainingView[],
  catalogs: ReturnType<typeof systemCatalogs>,
): SystemTreeDevelopView {
  const teaches = (methodId: string) =>
    catalogs.training.methods
      .find((method) => method.id === methodId)
      ?.effects.some((effect) => effect.type === 'skill.learn' && effect.skillId === skillId) ?? false;

  const training = trainings.find((entry) => teaches(entry.methodId));
  if (training) {
    return {
      kind: 'training',
      methodId: training.methodId,
      methodName: training.name,
      canTrain: training.canTrain,
      ...(training.blockedReason ? { blockedReason: training.blockedReason } : {}),
    };
  }
  const milestone = comprehensibleFutureMilestones(progress, catalogs).find((entry) =>
    entry.reveals.some((reveal) => reveal.type === 'training.available' && teaches(reveal.methodId)),
  );
  if (milestone) {
    return { kind: 'milestone', level: milestone.level };
  }
  if (catalogs.garden.recipes.some((recipe) => recipe.resultSkillId === skillId && recipe.visibility.type !== 'always-hidden')) {
    return { kind: 'garden' };
  }
  return { kind: 'unrevealed' };
}

function comprehensibleFutureMilestones(progress: SkillsProgressState, catalogs: ReturnType<typeof systemCatalogs>) {
  return catalogs.mastery.milestones
    .filter((milestone) => milestone.level > progress.level)
    .filter((milestone) => milestone.requirements.every((requirement) => isRequirementComprehensible(requirement, progress)))
    .sort((left, right) => left.level - right.level);
}

function nextCultivationPointLevel(progress: SkillsProgressState, catalogs: ReturnType<typeof systemCatalogs>): number | null {
  return (
    comprehensibleFutureMilestones(progress, catalogs).find((milestone) =>
      milestone.reveals.some((reveal) => reveal.type === 'garden.cultivation-points'),
    )?.level ?? null
  );
}

/** Jardim (Sistema 16): requisitos conhecidos com estado, fontes → resultado e motivo de bloqueio. */
function buildGardenIntegrations(
  progress: SkillsProgressState,
  garden: GardenState,
  catalogs: ReturnType<typeof systemCatalogs>,
): SystemGardenIntegrationView[] {
  return deriveGardenRecipes(catalogs.garden, catalogs.skills, progress, garden)
    .filter((recipe): recipe is GardenRecipeView & { visibility: 'perceived' | 'available' | 'cultivated' } => recipe.visibility !== 'hidden')
    .map((recipe) => {
      let canCultivate = false;
      let blockedReason: string | undefined;
      if (recipe.visibility === 'cultivated') {
        blockedReason = 'Integração já cultivada.';
      } else {
        try {
          planGardenCultivation(catalogs.garden, catalogs.skills, progress, garden, recipe.id);
          canCultivate = true;
        } catch (error) {
          blockedReason = error instanceof GardenError ? error.message : 'A integração não está disponível.';
        }
      }
      return {
        recipeId: recipe.id,
        visibility: recipe.visibility,
        name: recipe.name ?? null,
        description: recipe.description ?? null,
        sourceNames: (recipe.sourceSkillIds ?? []).map((id) => resolveSkillName(id, catalogs)),
        resultName: recipe.resultSkillId ? resolveSkillName(recipe.resultSkillId, catalogs) : null,
        requirements: (recipe.requirements ?? []).map((requirement) => ({
          text: describeGardenRequirement(requirement, progress, catalogs),
          met: requirement.met,
        })),
        requirementsMet: recipe.requirementsMet ?? false,
        cost: recipe.cost ? { cultivationPoints: recipe.cost.cultivationPoints, periods: recipe.cost.timeCost.periods } : null,
        canCultivate,
        ...(blockedReason ? { blockedReason } : {}),
      };
    });
}

function describeGardenRequirement(
  requirement: GardenRequirement,
  progress: SkillsProgressState,
  catalogs: ReturnType<typeof systemCatalogs>,
): string {
  switch (requirement.type) {
    case 'level.minimum':
      return `Nível ${requirement.level} (atual ${progress.level})`;
    case 'milestone.reached':
      return 'Um marco do Sistema ainda não alcançado';
    case 'skill.known':
      return isSkillKnown(progress, requirement.skillId)
        ? `Conhecer ${resolveSkillName(requirement.skillId, catalogs)}`
        : 'Uma habilidade ainda não compreendida';
    case 'skill.proficiency':
      return isSkillKnown(progress, requirement.skillId)
        ? `${resolveSkillName(requirement.skillId, catalogs)} em proficiência ${requirement.minimum} (atual ${getSkillProficiencyOf(progress, requirement.skillId)})`
        : 'Uma habilidade ainda não compreendida';
  }
}

function getSkillProficiencyOf(progress: SkillsProgressState, skillId: string): number {
  return progress.entries.find((entry) => entry.skillId === skillId)?.proficiency ?? 0;
}

function describeEffect(effect: TrainingEffect, catalogs: ReturnType<typeof systemCatalogs>): string {
  const skillName = getSkill(catalogs.skills, effect.skillId).name;
  if (effect.type === 'skill.proficiency.increase') {
    return `Aprofunda ${skillName} (+${effect.amount})`;
  }
  return `Revela a habilidade ${skillName}`;
}

export type {
  SystemEnergyView,
  SystemFieldView,
  SystemGardenIntegrationView,
  SystemGardenRequirementView,
  SystemTreeDevelopView,
  SystemTreeNodeView,
  SystemTreePathView,
  SystemTreeRequirementView,
  SystemMilestoneRequirementView,
  SystemMilestoneView,
  SystemSkillView,
  SystemStatusView,
  SystemTrainingView,
} from './types';
