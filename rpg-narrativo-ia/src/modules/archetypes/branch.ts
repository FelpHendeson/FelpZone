import type { CharacterSex } from '../../core/state/types';
import type { TimeCost } from '../time';
import { ArchetypeError } from './errors';
import type { BranchRequirementSet, IndexedArchetypes } from './index';

/**
 * Galho do arquétipo: técnicas aprendidas por treino, liberadas pelo hábito de combate, e a
 * evolução de Aprendiz para Iniciado. Tudo é derivado do pack e de quatro contadores no save.
 */
export interface ArchetypeProgressState {
  /** Técnicas de galho aprendidas (ids de ação de combate), em ordem de aprendizado. */
  techniqueIds: string[];
  /** Vezes que a técnica de assinatura entrou numa sequência de combate do mundo. */
  signatureUses: number;
  /** Vitórias em confrontos do mundo. */
  victories: number;
  /** Vitórias sobre ameaças de elite. */
  eliteVictories: number;
}

export function createInitialArchetypeProgress(): ArchetypeProgressState {
  return { techniqueIds: [], signatureUses: 0, victories: 0, eliteVictories: 0 };
}

export function copyArchetypeProgress(state: ArchetypeProgressState): ArchetypeProgressState {
  return {
    techniqueIds: [...state.techniqueIds],
    signatureUses: state.signatureUses,
    victories: state.victories,
    eliteVictories: state.eliteVictories,
  };
}

const COUNTER_LIMIT = 1_000_000;

export function inspectArchetypeProgress(
  value: unknown,
  catalog: IndexedArchetypes,
): { ok: true; value: ArchetypeProgressState } | { ok: false; reason: string } {
  const fail = { ok: false as const, reason: 'O progresso do galho do arquétipo é inválido.' };
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return fail;
  const record = value as Record<string, unknown>;
  const counter = (entry: unknown) => Number.isSafeInteger(entry) && (entry as number) >= 0 && (entry as number) <= COUNTER_LIMIT;
  if (!counter(record.signatureUses) || !counter(record.victories) || !counter(record.eliteVictories)) return fail;
  if ((record.eliteVictories as number) > (record.victories as number)) return fail;
  if (!Array.isArray(record.techniqueIds) || record.techniqueIds.length > catalog.techniqueByActionId.size) return fail;
  const seen = new Set<string>();
  for (const id of record.techniqueIds) {
    if (typeof id !== 'string' || seen.has(id) || !catalog.techniqueByActionId.has(id)) return fail;
    seen.add(id);
  }
  return {
    ok: true,
    value: {
      techniqueIds: [...seen],
      signatureUses: record.signatureUses as number,
      victories: record.victories as number,
      eliteVictories: record.eliteVictories as number,
    },
  };
}

/** Relação do Desperto com um galho: o próprio, aberto (sem caminho definido) ou distante. */
export type BranchAccess = 'own' | 'open' | 'distant';

export function branchAccess(catalog: IndexedArchetypes, characterArchetypeId: string | undefined, branchArchetypeId: string): BranchAccess {
  if (characterArchetypeId === branchArchetypeId) return 'own';
  const mine = characterArchetypeId ? catalog.byId.get(characterArchetypeId) : undefined;
  // Quem não tem galho próprio (sem caminho definido, ou saves anteriores aos arquétipos) mistura livremente.
  return mine?.branch ? 'distant' : 'open';
}

export interface TechniqueRequirement {
  kind: 'previous' | 'signatureUses' | 'victories' | 'level';
  label: string;
  met: boolean;
}

export interface TechniqueStatus {
  actionId: string;
  archetypeId: string;
  tier: number;
  access: BranchAccess;
  known: boolean;
  minutes: number;
  requirements: TechniqueRequirement[];
  canTrain: boolean;
}

export interface BranchContext {
  archetypeId: string | undefined;
  level: number;
  progress: ArchetypeProgressState;
  /** Nome legível de uma ação (para descrever o requisito da técnica anterior). */
  actionName?: (actionId: string) => string;
}

export function techniqueStatus(catalog: IndexedArchetypes, context: BranchContext, actionId: string): TechniqueStatus {
  const technique = catalog.techniqueByActionId.get(actionId);
  if (!technique) throw new ArchetypeError('A técnica não pertence a nenhum galho.');
  const access = branchAccess(catalog, context.archetypeId, technique.archetypeId);
  const tierRule = catalog.rules.tiers[technique.tier - 1];
  if (!tierRule) throw new ArchetypeError('O nível da técnica não existe nas regras.');
  const base: BranchRequirementSet = access === 'own' ? tierRule.own : tierRule.open;
  const level = (base.level ?? 1) + (access === 'distant' ? catalog.rules.distant.levelBonus : 0);
  const minutes = tierRule.minutes * (access === 'distant' ? catalog.rules.distant.minutesMultiplier : 1);
  const requirements: TechniqueRequirement[] = [];
  const branch = catalog.byId.get(technique.archetypeId)?.branch;
  const previous = branch?.techniques.find((entry) => entry.tier === technique.tier - 1);
  if (previous) {
    requirements.push({
      kind: 'previous',
      label: `Conhecer ${context.actionName?.(previous.actionId) ?? previous.actionId}`,
      met: context.progress.techniqueIds.includes(previous.actionId),
    });
  }
  if (base.signatureUses !== undefined) {
    requirements.push({
      kind: 'signatureUses',
      label: `Usar a técnica de assinatura em combate ${base.signatureUses} vezes (${Math.min(context.progress.signatureUses, base.signatureUses)}/${base.signatureUses})`,
      met: context.progress.signatureUses >= base.signatureUses,
    });
  }
  if (base.victories !== undefined) {
    requirements.push({
      kind: 'victories',
      label: `Vencer ${base.victories} confrontos (${Math.min(context.progress.victories, base.victories)}/${base.victories})`,
      met: context.progress.victories >= base.victories,
    });
  }
  if (level > 1) {
    requirements.push({ kind: 'level', label: `Nível ${level}`, met: context.level >= level });
  }
  const known = context.progress.techniqueIds.includes(actionId);
  return {
    actionId,
    archetypeId: technique.archetypeId,
    tier: technique.tier,
    access,
    known,
    minutes,
    requirements,
    canTrain: !known && requirements.every((entry) => entry.met),
  };
}

export interface ArchetypeTrainingPlan {
  actionId: string;
  timeCost: TimeCost;
  /** O treino completa a evolução para Iniciado. */
  initiated: boolean;
}

export function planArchetypeTraining(
  catalog: IndexedArchetypes,
  context: BranchContext & { sex: CharacterSex },
  actionId: string,
): ArchetypeTrainingPlan {
  const status = techniqueStatus(catalog, context, actionId);
  if (status.known) throw new ArchetypeError('Esta técnica já foi aprendida.');
  const missing = status.requirements.find((entry) => !entry.met);
  if (missing) throw new ArchetypeError(`Ainda falta: ${missing.label}.`);
  const before = archetypeRank(catalog, context);
  const after = archetypeRank(catalog, { ...context, progress: applyArchetypeTraining(context.progress, actionId) });
  return {
    actionId,
    timeCost: { periods: 0, minutes: status.minutes },
    initiated: before.rank === 'apprentice' && after.rank === 'initiate',
  };
}

export function applyArchetypeTraining(progress: ArchetypeProgressState, actionId: string): ArchetypeProgressState {
  const next = copyArchetypeProgress(progress);
  if (!next.techniqueIds.includes(actionId)) next.techniqueIds.push(actionId);
  return next;
}

/** Registra um confronto do mundo: usos da técnica de assinatura, vitórias e vitórias de elite. */
export function recordArchetypeCombat(
  catalog: IndexedArchetypes,
  archetypeId: string | undefined,
  progress: ArchetypeProgressState,
  combat: { playerActionIds: readonly string[]; outcome: string; elite: boolean },
): ArchetypeProgressState {
  const signature = new Set(archetypeId ? (catalog.byId.get(archetypeId)?.signatureActionIds ?? []) : []);
  const next = copyArchetypeProgress(progress);
  next.signatureUses = Math.min(COUNTER_LIMIT, next.signatureUses + combat.playerActionIds.filter((id) => signature.has(id)).length);
  if (combat.outcome === 'victory') {
    next.victories = Math.min(COUNTER_LIMIT, next.victories + 1);
    if (combat.elite) next.eliteVictories = Math.min(next.victories, next.eliteVictories + 1);
  }
  return next;
}

export type ArchetypeRank = 'apprentice' | 'initiate';

export interface ArchetypeRankView {
  rank: ArchetypeRank;
  /** Galho em que o Desperto se tornou Iniciado. */
  branchArchetypeId?: string;
  title: string;
  roundTicks?: number;
  /** Progresso até Iniciado no galho mais avançado que conta. */
  next?: { branchArchetypeId: string; techniques: number; techniquesNeeded: number; eliteVictories: number; eliteNeeded: number };
}

/** Patente derivada: Iniciado quando domina técnicas suficientes de um galho que conta e venceu uma elite. */
export function archetypeRank(
  catalog: IndexedArchetypes,
  context: { archetypeId: string | undefined; progress: ArchetypeProgressState; sex?: CharacterSex },
): ArchetypeRankView {
  const own = context.archetypeId ? catalog.byId.get(context.archetypeId) : undefined;
  const rule = catalog.rules.initiate;
  const counting = catalog.archetypes.filter(
    (entry) => entry.branch && (entry.id === context.archetypeId || !own?.branch),
  );
  let best: ArchetypeRankView['next'];
  for (const entry of counting) {
    const learned = entry.branch!.techniques.filter((technique) => context.progress.techniqueIds.includes(technique.actionId)).length;
    const candidate = {
      branchArchetypeId: entry.id,
      techniques: learned,
      techniquesNeeded: rule.techniques,
      eliteVictories: context.progress.eliteVictories,
      eliteNeeded: rule.eliteVictories,
    };
    if (learned >= rule.techniques && context.progress.eliteVictories >= rule.eliteVictories) {
      const titles = entry.initiateTitle!;
      return {
        rank: 'initiate',
        branchArchetypeId: entry.id,
        title: context.sex === 'female' ? titles.female : titles.male,
        roundTicks: rule.roundTicks,
      };
    }
    if (!best || learned > best.techniques) best = candidate;
  }
  return { rank: 'apprentice', title: own?.name ?? 'Sobrevivente', ...(best ? { next: best } : {}) };
}

/** O que o galho muda no combate: técnicas aprendidas no banco e tempos por rodada. */
export function archetypeCombatBonus(
  catalog: IndexedArchetypes,
  context: { archetypeId: string | undefined; progress: ArchetypeProgressState | undefined },
): { grantedActionIds: string[]; roundTicks?: number } {
  const progress = context.progress;
  if (!progress) return { grantedActionIds: [] };
  const rank = archetypeRank(catalog, { archetypeId: context.archetypeId, progress });
  return { grantedActionIds: [...progress.techniqueIds], ...(rank.roundTicks ? { roundTicks: rank.roundTicks } : {}) };
}
