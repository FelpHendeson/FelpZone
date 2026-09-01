import type { Campaign } from '../../core/events';
import type { IndexedExploration } from '../exploration';

export const WORLD_TRIGGER_SOURCE_TYPES = ['discovery.revealed'] as const;

export type WorldTriggerSourceType = (typeof WORLD_TRIGGER_SOURCE_TYPES)[number];

export interface WorldTriggerDiscoverySource {
  type: 'discovery.revealed';
  discoveryId: string;
}

export type WorldTriggerSource = WorldTriggerDiscoverySource;

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
}
