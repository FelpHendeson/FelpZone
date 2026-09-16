import type { Campaign } from '../../core/events';
import type { IndexedCombat } from '../combat/types';
import type { IndexedConditions } from '../conditions/types';
import type { IndexedCrafting } from '../crafting/types';
import type { IndexedEnergetics } from '../energetics/types';
import type { IndexedExploration } from '../exploration/types';
import type { IndexedGarden } from '../garden/types';
import type { IndexedItems } from '../items/types';
import type { IndexedMastery } from '../mastery/types';
import type { IndexedMap } from '../navigation/types';
import type { IndexedNpcs } from '../npcs/types';
import type { IndexedObjectives } from '../objectives/types';
import type { IndexedPresenceInteractions, IndexedPresences } from '../presences/types';
import type { IndexedResources } from '../resources/types';
import type { IndexedSkills } from '../skills/types';
import type { IndexedTraining } from '../training/types';
import type { IndexedWorldTriggers, WorldNarrativeTriggerDefinition } from '../world-events/types';

export interface ContentSource {
  readonly id: string;
  loadRaw(): unknown | Promise<unknown>;
}

export interface IndexedWorld {
  readonly id: string;
  readonly sourceId: string;
  readonly startingLocationId: string;
  readonly campaign: Campaign;
  readonly map: IndexedMap;
  readonly exploration: IndexedExploration;
  readonly resources: IndexedResources;
  readonly crafting: IndexedCrafting;
  readonly presences: IndexedPresences;
  readonly presenceInteractions: IndexedPresenceInteractions;
  readonly combat: IndexedCombat;
  readonly mastery: IndexedMastery;
  readonly skills: IndexedSkills;
  readonly training: IndexedTraining;
  readonly energetics: IndexedEnergetics;
  readonly garden: IndexedGarden;
  readonly items: IndexedItems;
  readonly conditions: IndexedConditions;
  readonly npcs: IndexedNpcs;
  readonly objectives: IndexedObjectives;
  readonly worldTriggers: IndexedWorldTriggers;
  readonly firstPriorityTrigger: WorldNarrativeTriggerDefinition;
  readonly stationLabels: Readonly<Record<string, string>>;
}

export const PACK_FILE_KEYS = [
  'map',
  'exploration',
  'populations',
  'resourceNodes',
  'presences',
  'presenceInteractions',
  'npcs',
  'energetics',
  'skills',
  'training',
  'mastery',
  'garden',
  'items',
  'conditions',
  'combat',
  'craftingRecipes',
  'craftingStructures',
  'objectives',
  'campaign',
  'events',
  'worldTriggers',
  'firstPriorityTrigger',
  'labels',
] as const;

export type PackFileKey = (typeof PACK_FILE_KEYS)[number];
