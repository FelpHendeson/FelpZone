import raw from '../../../content/first-day/system/mastery.json' with { type: 'json' };
import type { MasteryCatalog } from './types';

export const INITIAL_MASTERY_CATALOG = raw as MasteryCatalog;
