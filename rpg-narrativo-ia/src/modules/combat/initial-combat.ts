import raw from '../../../content/first-day/system/combat.json' with { type: 'json' };
import type { CombatCatalog } from './types';

export const PLAYER_COMBAT_MAX_HEALTH = 20;

export const INITIAL_COMBAT_CATALOG = raw as CombatCatalog;
