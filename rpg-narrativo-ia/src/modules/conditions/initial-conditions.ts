import raw from '../../../content/first-day/system/conditions.json' with { type: 'json' };
import type { ConditionsCatalog } from './types';

export const INITIAL_CONDITIONS_CATALOG = raw as ConditionsCatalog;
