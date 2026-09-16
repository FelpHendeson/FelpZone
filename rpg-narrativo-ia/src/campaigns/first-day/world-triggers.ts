import type { WorldNarrativeTriggerDefinition } from '../../modules/world-events';
import firstPriority from '../../../content/first-day/campaign/first-priority-trigger.json' with { type: 'json' };
import triggers from '../../../content/first-day/campaign/world-triggers.json' with { type: 'json' };

export const FIRST_PRIORITY_WORLD_TRIGGER = firstPriority as WorldNarrativeTriggerDefinition;

export const FIRST_PRIORITY_DISCOVERY_ID = FIRST_PRIORITY_WORLD_TRIGGER.source.discoveryId;

export const FIRST_DAY_WORLD_TRIGGERS = triggers as readonly WorldNarrativeTriggerDefinition[];
