export const COMBAT_EFFECT_TYPES = ['damage', 'heal', 'guard'] as const;

export type CombatEffectType = (typeof COMBAT_EFFECT_TYPES)[number];

export type CombatEffect =
  | { type: 'damage'; amount: number }
  | { type: 'heal'; amount: number }
  | { type: 'guard'; amount: number };

export const COMBAT_TARGETS = ['opponent', 'self'] as const;

export type CombatTarget = (typeof COMBAT_TARGETS)[number];

export interface CombatActionDefinition {
  id: string;
  name: string;
  description: string;
  speed: number;
  target: CombatTarget;
  effects: CombatEffect[];
  skillId?: string;
}

export interface CombatantTemplate {
  id: string;
  name: string;
  maxHealth: number;
  actionIds: string[];
}

export interface EncounterDefinition {
  id: string;
  locationId: string;
  opponentId: string;
  name: string;
  description: string;
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
}

export const FLEE_ACTION_ID = 'flee';

export type CombatInspection<T> =
  | { ok: true; value: T }
  | { ok: false; reason: string };
