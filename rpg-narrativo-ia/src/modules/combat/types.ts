import type { ApplicationField, EnergyKind } from '../energetics';
import type { ActionCost, ActionPhases, ExecutionModifiers, ExecutionState } from '../execution';
import type { TimeCost } from '../time';
import type { EquipmentState } from '../items';

export const COMBAT_EFFECT_TYPES = [
  'damage',
  'heal',
  'guard',
  'condition.apply',
  'condition.cleanse',
  'interrupt',
  'evade',
  'move',
] as const;

/** Distância entre os dois lados de um confronto planejado por rodadas. */
export const COMBAT_DISTANCES = ['near', 'far'] as const;

export type CombatDistance = (typeof COMBAT_DISTANCES)[number];

export type CombatEffectType = (typeof COMBAT_EFFECT_TYPES)[number];

export type CombatEffect =
  | { type: 'damage'; amount: number }
  | { type: 'heal'; amount: number }
  | { type: 'guard'; amount: number }
  | { type: 'condition.apply'; conditionId: string; duration: number; potency: number }
  | { type: 'condition.cleanse'; count: number; conditionId?: string }
  | { type: 'interrupt' }
  /** Esquiva: golpes que caem nos próximos `ticks` tempos (contando o próprio) erram. */
  | { type: 'evade'; ticks: number }
  /** Movimento: muda a distância do confronto no tempo em que a ação acontece. */
  | { type: 'move'; to: CombatDistance };

export const COMBAT_TARGETS = ['opponent', 'self'] as const;

export type CombatTarget = (typeof COMBAT_TARGETS)[number];

export const COMBAT_RANGES = ['self', 'melee', 'reach'] as const;

export type CombatRange = (typeof COMBAT_RANGES)[number];

export interface CombatActionDefinition {
  id: string;
  name: string;
  description: string;
  speed: number;
  target: CombatTarget;
  effects: CombatEffect[];
  skillId?: string;
  elementId?: string;
  classification?: ApplicationField;
  originEnergyId?: EnergyKind;
  range?: CombatRange;
  phases?: ActionPhases;
  cost?: ActionCost;
  cooldown?: number;
  interruptible?: boolean;
  /** `false` para ações exclusivas de criaturas (garras, mordidas): não entram no banco do jogador. */
  playerUsable?: boolean;
  /** Só entra no banco quando um equipamento a concede (técnicas de assinatura dos arquétipos). */
  equipmentOnly?: boolean;
  /** Pose da silhueta que ilustra a técnica na carta. */
  pose?: ActionPose;
}

export const ACTION_POSES = [
  'strike', 'slash', 'stab', 'shoot', 'cast', 'guard', 'dodge', 'advance', 'retreat', 'lunge', 'throw', 'feint', 'heal', 'stand',
] as const;

export type ActionPose = (typeof ACTION_POSES)[number];

export interface CombatantTemplate {
  id: string;
  name: string;
  maxHealth: number;
  actionIds: string[];
  defenseElementId?: string;
}

export interface EncounterDefinition {
  id: string;
  locationId: string;
  opponentId: string;
  additionalOpponentIds?: string[];
  requiredOrganizationId?: string;
  name: string;
  description: string;
  timeCost: TimeCost;
  requiredDiscoveryIds: string[];
  reward?: { itemId: string; quantity: number };
  /** Distância inicial do confronto (padrão: longe). */
  startDistance?: CombatDistance;
}

export const PREPARED_ACTION_PREFIX = 'prepared:';

export interface CombatLoadoutSnapshot {
  equipment: EquipmentState;
  prepared: readonly { index: number; itemId: string }[];
  modifiers: { damage: number; guard: number; healing: number };
  executionModifiers: ExecutionModifiers;
  grantedActionIds: readonly string[];
}

export interface PreparedConsumableState {
  index: number;
  itemId: string;
  name: string;
  heal: number;
}

export interface CombatCatalog {
  actions: readonly CombatActionDefinition[];
  combatants: readonly CombatantTemplate[];
  encounters: readonly EncounterDefinition[];
}

export interface IndexedCombat {
  readonly actions: readonly CombatActionDefinition[];
  readonly combatants: readonly CombatantTemplate[];
  readonly encounters: readonly EncounterDefinition[];
  readonly actionById: ReadonlyMap<string, CombatActionDefinition>;
  readonly combatantById: ReadonlyMap<string, CombatantTemplate>;
  readonly encounterById: ReadonlyMap<string, EncounterDefinition>;
}

export const COMBAT_OUTCOMES = ['ongoing', 'victory', 'defeat', 'fled'] as const;

export type CombatOutcome = (typeof COMBAT_OUTCOMES)[number];

export interface CombatantState {
  id: string;
  name: string;
  maxHealth: number;
  health: number;
  guard: number;
  actionIds: string[];
  conditions: import('../conditions').ActiveCondition[];
  defenseElementId?: string;
  execution: ExecutionState;
}

export interface CombatLogEntry {
  turn: number;
  actorId: string;
  actionId: string;
  text: string;
}

export interface CombatState {
  encounterId: string;
  turn: number;
  player: CombatantState;
  opponent: CombatantState;
  log: CombatLogEntry[];
  outcome: CombatOutcome;
  loadout: CombatLoadoutSnapshot;
  prepared: PreparedConsumableState[];
  usedPrepared: { slot: number; itemId: string }[];
  entryExecution: ExecutionState;
  knownSkillIds: string[];
  allies: CombatantState[];
  foes: CombatantState[];
  companionOrderLog: { actorId: string; actionId: string }[][];
  /** Distância atual (combate por rodadas). */
  distance?: CombatDistance;
  /** Sequências declaradas em cada rodada, na ordem. */
  rounds?: CombatRoundRecord[];
  /** Linha do tempo da última rodada resolvida, para a reprodução na interface. */
  lastRound?: RoundEvent[];
}

/** Sequências que cada lado declarou antes de "Pronto". */
export interface CombatRoundRecord {
  player: string[];
  opponent: string[];
}

export type RoundEventKind = 'hit' | 'self' | 'miss' | 'evaded' | 'out-of-range' | 'interrupted' | 'move' | 'skipped';

/** Um acontecimento da linha do tempo de uma rodada. */
export interface RoundEvent {
  tick: number;
  actorId: string;
  actionId: string;
  kind: RoundEventKind;
  text: string;
}

/** Posição de uma ação na trilha de tempos da rodada. */
export interface PlannedSlot {
  actionId: string;
  start: number;
  lands: number;
  duration: number;
}

export interface CombatResolution {
  encounterId: string;
  outcome: Exclude<CombatOutcome, 'ongoing'>;
  turns: number;
  entryHealth: number;
  remainingHealth: number;
  playerActionIds: string[];
  usedPrepared: { slot: number; itemId: string }[];
  equipment: EquipmentState;
  entryExecution: ExecutionState;
  remainingExecution: ExecutionState;
  companionOrders: { actorId: string; actionId: string }[][];
  allyVitals: { actorId: string; health: number }[];
  /** Sequências do jogador por rodada (combate planejado). Ausente no combate legado de uma ação por turno. */
  playerPlans?: string[][];
}

export interface CombatActionView {
  action: CombatActionDefinition;
  available: boolean;
  blockedReason?: string;
  phases: ActionPhases;
  readyTick: number;
  cost?: ActionCost;
  cooldown: number;
}

export const FLEE_ACTION_ID = 'flee';

export type CombatInspection<T> =
  | { ok: true; value: T }
  | { ok: false; reason: string };
