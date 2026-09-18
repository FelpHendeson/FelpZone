import catalog from '../../../content/first-day/world/family.json' with { type: 'json' };
import type { FamilyCatalog } from './types';

export const INITIAL_FAMILY_CATALOG = catalog as FamilyCatalog;
