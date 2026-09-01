import type { WorldNarrativeTriggerDefinition } from '../../modules/world-events';

export const FIRST_DAY_WORLD_TRIGGERS: readonly WorldNarrativeTriggerDefinition[] = [
  {
    id: 'first-priority',
    source: {
      type: 'discovery.revealed',
      discoveryId: 'first-priority-event',
    },
    campaignId: 'first-day',
    eventId: 'first-priority',
  },
];
