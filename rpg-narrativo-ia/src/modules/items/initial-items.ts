import raw from '../../../content/first-day/system/items.json' with { type: 'json' };
import type { ItemsCatalog } from './types';

export const INITIAL_ITEMS_CATALOG = raw as ItemsCatalog;
