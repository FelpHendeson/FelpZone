import raw from '../../../content/first-day/system/energetics.json' with { type: 'json' };
import type { EnergeticsCatalog } from './types';

export const INITIAL_ENERGETICS_CATALOG = raw as EnergeticsCatalog;
