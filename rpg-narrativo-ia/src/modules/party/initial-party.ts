import catalog from '../../../content/first-day/world/party.json' with { type: 'json' };
import type { PartyCatalog } from './types';

export const INITIAL_PARTY_CATALOG = catalog as PartyCatalog;
