import raw from '../../../content/first-day/system/garden.json' with { type: 'json' };
import type { GardenCatalog } from './types';

export const INITIAL_GARDEN_CATALOG = raw as GardenCatalog;
