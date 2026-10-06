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
  /**
   * Só entra no banco quando concedida: pelo equipamento (técnicas de assinatura) ou pelo galho
   * do arquétipo (técnicas aprendidas).
   */
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
  /** Forma da silhueta no palco da rodada; sem ela, a criatura aparece como figura humana. */
  shape?: CombatantShape;
}

export const COMBATANT_SHAPES = ['humanoid', 'beast', 'bird', 'serpent', 'boar'] as const;
export type CombatantShape = (typeof COMBATANT_SHAPES)[number];

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
  /** Ameaça de elite: conta para marcos como a evolução de Aprendiz para Iniciado. */
  elite?: boolean;
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

/**
 * Efeito de campo (clima e hora do dia) sobre o combate. `side` diz a quem vale; `match`, a quais
 * ações. Os números são somados: dano ao primeiro golpe (mínimo 1), tempos de preparação, custo de
 * energia, velocidade e quantas ações a leitura de intenção mostra.
 */
export interface CombatFieldEffect {
  id: string;
  label: string;
  side: 'player' | 'foes' | 'all';
  match?: { ranges?: CombatRange[]; poses?: ActionPose[]; classification?: ApplicationField };
  damage?: number;
  prepare?: number;
  cost?: number;
  speed?: number;
  intent?: number;
}

/** Ambiente do confronto: o rótulo (clima e período) e os efeitos que valem nele. */
export interface CombatEnvironment {
  label: string;
  effects: CombatFieldEffect[];
}

/** Efeito extra de um combo, aplicado quando a segunda ação acerta. */
export const COMBO_BONUS_TYPES = ['damage', 'critical', 'ignore-guard', 'uninterruptible'] as const;

export type ComboBonus =
  | { type: 'damage'; amount: number }
  /** Dano dobrado. */
  | { type: 'critical' }
  /** O golpe atravessa a Postura Defensiva do alvo. */
  | { type: 'ignore-guard' }
  /** A segunda ação não pode ser interrompida durante a preparação. */
  | { type: 'uninterruptible' };

/**
 * Combo: duas ações seguidas do mesmo lado, na mesma rodada. Vale quando a primeira aconteceu
 * (não foi interrompida nem errou o alcance) e a segunda chega ao alvo.
 */
export interface ComboDefinition {
  id: string;
  name: string;
  description: string;
  first: string;
  second: string;
  bonus: ComboBonus;
  /** Só vale se a esquiva de quem faz o combo evitou um golpe nesta rodada. */
  requiresEvade?: boolean;
}

export interface IndexedCombat {
  readonly combos: readonly ComboDefinition[];
  /** Combo pela dupla `primeira>segunda`. */
  readonly comboByPair: ReadonlyMap<string, ComboDefinition>;
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
  /** Tempos por rodada deste combatente (padrão `ROUND_TICKS`; Iniciados têm um a mais). */
  roundTicks?: number;
  /** Estilo tático da IA (companheiros como o Eco aliado). */
  style?: 'balanced' | 'aggressive' | 'defensive';
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
  /** Combos que o jogador acionou neste combate, sem repetição, na ordem em que aconteceram. */
  triggeredCombos?: string[];
  /** Clima e hora do dia (ausente em duelos de Ecos: campo neutro). */
  environment?: CombatEnvironment;
}

/** Sequências que cada lado declarou antes de "Pronto". */
export interface CombatRoundRecord {
  player: string[];
  opponent: string[];
}

export type RoundEventKind = 'hit' | 'self' | 'miss' | 'evaded' | 'out-of-range' | 'interrupted' | 'move' | 'skipped' | 'combo';

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
  /** Combos que o jogador acionou (derivados do replay; nunca aceitos do cliente). */
  combos?: string[];
  /** Ações que o oponente principal mostrou (derivadas do replay; alimentam o Bestiário). */
  foeActionIds?: string[];
  /** Selo (código) do Eco aliado chamado para este confronto. */
  echoAlly?: string;
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
