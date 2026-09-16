import raw from '../../../content/first-day/campaign/objectives.json' with { type: 'json' };
import type { ObjectiveCatalog } from './types';

export const INITIAL_OBJECTIVE_CATALOG = raw as ObjectiveCatalog;
