import catalog from '../../../content/first-day/system/execution.json' with { type: 'json' };
import type { ExecutionCatalog } from './types';

export const INITIAL_EXECUTION_CATALOG = catalog as ExecutionCatalog;
