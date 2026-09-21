import type { Campaign } from '../../core/events';
import type { IndexedExploration } from '../exploration';
import type { IndexedSkills } from '../skills';
import type { DayPeriod } from '../../core/state/types';

export const WORLD_TRIGGER_SOURCE_TYPES = ['discovery.revealed', 'system.skill.proficiency.min', 'world.day.min', 'world.time.reached'] as const;

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

export type WorldTriggerSource =
  | WorldTriggerDiscoverySource
  | WorldTriggerSkillProficiencySource
  | WorldTriggerDaySource
  | WorldTriggerTimeReachedSource;

export interface WorldNarrativeTriggerDefinition {
  id: string;
  source: WorldTriggerSource;
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
