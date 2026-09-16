import raw from '../../../content/first-day/world/npcs.json' with { type: 'json' };
import type { NpcCatalog } from './types';

export const INITIAL_NPC_CATALOG = raw as NpcCatalog;
