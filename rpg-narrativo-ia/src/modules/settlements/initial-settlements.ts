import catalog from '../../../content/first-day/world/settlements.json' with { type: 'json' };
import type { SettlementCatalog } from './types';

export const INITIAL_SETTLEMENTS_CATALOG = catalog as SettlementCatalog;
