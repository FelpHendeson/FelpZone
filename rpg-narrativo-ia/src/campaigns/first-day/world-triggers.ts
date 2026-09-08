import type { WorldNarrativeTriggerDefinition } from '../../modules/world-events';

export const FIRST_PRIORITY_WORLD_TRIGGER: WorldNarrativeTriggerDefinition = {
  id: 'first-priority',
  source: {
    type: 'discovery.revealed',
    discoveryId: 'first-priority-event',
  },
  campaignId: 'first-day',
  eventId: 'first-priority',
};

export const FIRST_PRIORITY_DISCOVERY_ID = FIRST_PRIORITY_WORLD_TRIGGER.source.discoveryId;

export const FIRST_DAY_WORLD_TRIGGERS: readonly WorldNarrativeTriggerDefinition[] = [];
