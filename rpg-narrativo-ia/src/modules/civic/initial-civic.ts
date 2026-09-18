import catalog from '../../../content/first-day/world/civic.json' with { type: 'json' };
import type { CivicCatalog } from './types';

export const INITIAL_CIVIC_CATALOG = catalog as CivicCatalog;
