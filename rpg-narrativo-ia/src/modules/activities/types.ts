import type { DayPeriod, GameState } from '../../core/state/types';
import type { TimeCost } from '../time';
import type { IndexedNpcs, NPCsState } from '../npcs/types';
import type { IndexedMap } from '../navigation/types';
import type { IndexedGuidance, GuidanceState } from '../guidance/types';
import type { Campaign } from '../../core/events';
import type { ChanceBand, ChanceState } from '../chance/types';

export type ContextualActivityRequirement =
  | { type: 'flag.is'; flag: string; value: boolean }
  | { type: 'inventory.has'; itemId: string; quantity?: number }
  | { type: 'relationship.min'; characterId: string; amount: number }
  | { type: 'location.is'; locationId: string }
  | { type: 'world.day.min'; day: number }
  | { type: 'npc.known'; npcId: string }
  | { type: 'npc.present'; npcId: string }
  | { type: 'npc.available'; npcId: string }
  | { type: 'ability.has'; abilityId: string };

export type ContextualActivityEffect =
  | { type: 'flag.set'; flag: string; value: boolean }
  | { type: 'relationship.change'; characterId: string; amount: number }
  | { type: 'npc.rememberFact'; npcId: string; factId: string }
  | { type: 'npc.relocate'; npcId: string; locationId: string }
  | { type: 'guidance.unlock'; topicId: string };

export interface ContextualActivityParticipants {
  requiredNpcIds: readonly string[];
  optionalNpcIds: readonly string[];
  minOptional: number;
  maxOptional: number;
}

export interface ContextualActivityNarrative {
  campaignId: string;
  eventId: string;
}

/** Ajuste de peso de um desfecho quando todas as condições valem (ex.: aptidão, relação). */
export interface ContextualActivityOutcomeModifier {
  requirements: readonly ContextualActivityRequirement[];
  delta: number;
}

export interface ContextualActivityOutcome {
  id: string;
  label: string;
  /** Desfecho favorável conta para a faixa de chance mostrada antes da escolha. */
  favorable: boolean;
  weight: number;
  modifiers?: readonly ContextualActivityOutcomeModifier[];
  effects: readonly ContextualActivityEffect[];
  feedback?: string;
}

/** Desfechos sorteados no motor com a semente persistida; 2 a 3 opções, ao menos uma favorável. */
export interface ContextualActivityRisk {
  outcomes: readonly ContextualActivityOutcome[];
}

export interface PlannedActivityOutcome {
  id: string;
  label: string;
  favorable: boolean;
  /** Peso efetivo já ajustado pelos modificadores no estado atual. */
  weight: number;
  effects: readonly ContextualActivityEffect[];
  feedback?: string;
}

/** Prazo da oportunidade: disponível até o fim do dia (ou até o período) indicado, inclusive. */
export interface ContextualActivityDeadline {
  day: number;
  period?: DayPeriod;
}

export interface ContextualActivityDefinition {
  id: string;
  label: string;
  description: string;
  locationId: string;
  timeCost: TimeCost;
  repeatable: boolean;
  requirements: readonly ContextualActivityRequirement[];
  participants?: ContextualActivityParticipants;
  effects: readonly ContextualActivityEffect[];
  narrative?: ContextualActivityNarrative;
  feedback?: string;
  availableUntil?: ContextualActivityDeadline;
  risk?: ContextualActivityRisk;
  /**
   * Conversa ou oportunidade que só aparece quando está pronta: some da lista enquanto um
   * requisito de história (flag, dia, confiança, item, aptidão) não foi atendido e depois de
   * concluída. Presença e disponibilidade do NPC continuam aparecendo como bloqueio comum.
   */
  hideUntilReady?: boolean;
}

export interface IndexedActivities {
  readonly activities: readonly ContextualActivityDefinition[];
  readonly byId: ReadonlyMap<string, ContextualActivityDefinition>;
}

export interface ContextualActivitiesState {
  consumedActivityIds: string[];
}

export interface ContextualActivityPlan {
  activityId: string;
  participantNpcIds: readonly string[];
  timeCost: TimeCost;
  effects: readonly ContextualActivityEffect[];
  narrative?: ContextualActivityNarrative;
  feedback?: string;
  outcomes?: readonly PlannedActivityOutcome[];
}

export interface ContextualActivityKnownView {
  activity: ContextualActivityDefinition;
  available: boolean;
  blockedReason?: string;
  eligibleOptionalNpcIds: readonly string[];
  /** Dias inteiros restantes até o prazo (0 = último dia). Ausente quando não há prazo. */
  daysLeft?: number;
  /** Verdadeiro quando o prazo termina no período atual. */
  lastPeriod?: boolean;
  /** Faixa e porcentagem do desfecho favorável, quando a atividade tem risco. */
  chance?: { band: ChanceBand; favorablePercent: number };
}

export interface ActivityWorldContext {
  map: IndexedMap;
  npcs: IndexedNpcs;
  guidance: IndexedGuidance;
  campaign: Campaign;
}

export interface ContextualActivityApplied {
  activities: ContextualActivitiesState;
  npcs: NPCsState;
  flags: Record<string, boolean>;
  relationships: GameState['relationships'];
  guidance: GuidanceState;
  rng: ChanceState;
  outcome?: { id: string; label: string; favorable: boolean; feedback?: string };
}

export type ContextualActivityInspection<T> =
  | { ok: true; value: T }
  | { ok: false; reason: string };
