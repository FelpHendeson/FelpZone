import catalog from '../../../content/first-day/world/organizations.json' with { type: 'json' };
import type { OrganizationCatalog } from './types';

export const INITIAL_ORGANIZATION_CATALOG = catalog as OrganizationCatalog;
