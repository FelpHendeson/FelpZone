import catalog from '../../../content/first-day/system/registry.json' with { type: 'json' };
import type { RegistryCatalog } from './types';

export const INITIAL_REGISTRY_CATALOG = catalog as RegistryCatalog;
