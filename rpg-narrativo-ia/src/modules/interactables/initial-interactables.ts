import catalog from '../../../content/first-day/world/interactables.json' with { type: 'json' };
import type { InteractableCatalog } from './types';

export const INITIAL_INTERACTABLE_CATALOG = catalog as InteractableCatalog;
