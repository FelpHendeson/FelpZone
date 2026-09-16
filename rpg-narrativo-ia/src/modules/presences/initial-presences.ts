import catalog from '../../../content/first-day/world/presences.json' with { type: 'json' };
import interactions from '../../../content/first-day/world/presence-interactions.json' with { type: 'json' };
import type { PresenceCatalog, PresenceInteractionCatalog } from './types';

export const INITIAL_PRESENCE_CATALOG = catalog as PresenceCatalog;
export const INITIAL_PRESENCE_INTERACTIONS = interactions as PresenceInteractionCatalog;
