import catalog from '../../../content/first-day/world/economy.json' with { type: 'json' };
import type { EconomyCatalog } from './types';

export const INITIAL_ECONOMY_CATALOG = catalog as EconomyCatalog;
