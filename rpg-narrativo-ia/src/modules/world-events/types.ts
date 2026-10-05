import type { Campaign } from '../../core/events';
import type { IndexedExploration } from '../exploration';
import type { IndexedSkills } from '../skills';
import type { DayPeriod } from '../../core/state/types';

export const WORLD_TRIGGER_SOURCE_TYPES = ['discovery.revealed', 'system.skill.proficiency.min', 'world.day.min', 'world.time.reached', 'story.chapter'] as const;

export type WorldTriggerSourceType = (typeof WORLD_TRIGGER_SOURCE_TYPES)[number];

export interface WorldTriggerDiscoverySource {
  type: 'discovery.revealed';
  discoveryId: string;
}

export interface WorldTriggerSkillProficiencySource {
  type: 'system.skill.proficiency.min';
  skillId: string;
  amount: number;
}

export interface WorldTriggerDaySource {
  type: 'world.day.min';
  day: number;
}

export interface WorldTriggerTimeReachedSource {
  type: 'world.time.reached';
  day: number;
  period: DayPeriod;
}

/**
 * Capítulo dirigido por eventos. Abre quando **algum** grupo de `anyOf` está todo satisfeito
 * (eventos já vistos e flags deixadas pelas escolhas), no amanhecer seguinte ao capítulo `after`
 * (`minDaysAfter`, padrão 1). O dia do mundo só entra como trava opcional: `notBeforeDay`
 * ("isto só acontece depois do dia tal"). `fallbackDaysAfter` é a saída de segurança para rotas
 * que nunca passam pela cena-chave.
 */
export interface WorldTriggerChapterSource {
  type: 'story.chapter';
  notBeforeDay?: number;
  anyOf: readonly (readonly WorldTriggerCondition[])[];
  after?: string;
  minDaysAfter?: number;
  fallbackDaysAfter?: number;
}

export interface WorldTriggerFlagCondition {
  type: 'flag.is';
  flag: string;
  value: boolean;
}

/** Um evento da campanha já foi vivido (está no histórico de escolhas). */
export interface WorldTriggerEventSeenCondition {
  type: 'event.seen';
  eventId: string;
}

export type WorldTriggerCondition = WorldTriggerFlagCondition | WorldTriggerEventSeenCondition;

export type WorldTriggerSource =
  | WorldTriggerDiscoverySource
  | WorldTriggerSkillProficiencySource
  | WorldTriggerDaySource
  | WorldTriggerTimeReachedSource
  | WorldTriggerChapterSource;

export interface WorldNarrativeTriggerDefinition {
  id: string;
  source: WorldTriggerSource;
  conditions?: readonly WorldTriggerCondition[];
  campaignId: string;
  eventId: string;
}

export interface IndexedWorldTriggers {
  readonly definitions: readonly WorldNarrativeTriggerDefinition[];
  readonly byId: ReadonlyMap<string, WorldNarrativeTriggerDefinition>;
  readonly byDiscoveryId: ReadonlyMap<string, WorldNarrativeTriggerDefinition>;
}

export type WorldTriggerInspection<T> =
  | { ok: true; value: T }
  | { ok: false; reason: string };

export interface WorldTriggerCatalogContext {
  campaign: Campaign;
  exploration: IndexedExploration;
  skills: IndexedSkills;
}
