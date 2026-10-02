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
 * Capítulo dirigido por ação. Abre quando **algum** grupo de `anyOf` tem todas as flags
 * satisfeitas (a cena-chave do capítulo anterior foi resolvida, ou a rota não tem cena-chave)
 * e já se passaram `minDaysAfter` dias desde que o capítulo `after` abriu — nunca antes de
 * `minDay`. `fallbackDaysAfter` é a saída de segurança para rotas sem a cena-chave.
 */
export interface WorldTriggerChapterSource {
  type: 'story.chapter';
  minDay: number;
  anyOf: readonly (readonly WorldTriggerFlagCondition[])[];
  after?: string;
  minDaysAfter?: number;
  fallbackDaysAfter?: number;
}

export interface WorldTriggerFlagCondition {
  type: 'flag.is';
  flag: string;
  value: boolean;
}

export type WorldTriggerSource =
  | WorldTriggerDiscoverySource
  | WorldTriggerSkillProficiencySource
  | WorldTriggerDaySource
  | WorldTriggerTimeReachedSource
  | WorldTriggerChapterSource;

export interface WorldNarrativeTriggerDefinition {
  id: string;
  source: WorldTriggerSource;
  conditions?: readonly WorldTriggerFlagCondition[];
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
