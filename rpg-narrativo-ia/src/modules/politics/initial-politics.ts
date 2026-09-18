import catalog from '../../../content/first-day/world/politics.json' with { type: 'json' };
import type { PoliticsCatalog } from './types';

export const INITIAL_POLITICS_CATALOG = catalog as PoliticsCatalog;
