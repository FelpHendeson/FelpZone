import catalog from '../../../content/first-day/world/bonds.json' with { type: 'json' };
import type { BondCatalog } from './types';

export const INITIAL_BOND_CATALOG = catalog as BondCatalog;
