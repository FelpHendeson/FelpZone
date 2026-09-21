import type { Campaign } from '../../core/events';
import type { IndexedExecution } from '../execution/types';
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
import type { IndexedBonds } from '../bonds/types';
import type { IndexedOrganizations } from '../organizations/types';
import type { IndexedParty } from '../party/types';
import type { IndexedCalendar } from '../calendar/types';
import type { IndexedFamily } from '../family/types';
import type { IndexedCivic } from '../civic/types';
import type { IndexedEconomy } from '../economy/types';
import type { IndexedSettlements } from '../settlements/types';
import type { IndexedPolitics } from '../politics/types';
import type { IndexedRegistry } from '../registry/types';
import type { IndexedInteractables } from '../interactables/types';
import type { IndexedPresenceInteractions, IndexedPresences } from '../presences/types';
import type { IndexedResources } from '../resources/types';
import type { IndexedSkills } from '../skills/types';
import type { IndexedTraining } from '../training/types';
import type { IndexedWorldTriggers, WorldNarrativeTriggerDefinition } from '../world-events/types';
import type { IndexedGuidance } from '../guidance/types';

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
  readonly interactables: IndexedInteractables;
  readonly bonds: IndexedBonds;
  readonly organizations: IndexedOrganizations;
  readonly party: IndexedParty;
  readonly calendar: IndexedCalendar;
  readonly family: IndexedFamily;
  readonly civic: IndexedCivic;
  readonly economy: IndexedEconomy;
  readonly settlements: IndexedSettlements;
  readonly politics: IndexedPolitics;
  readonly registry: IndexedRegistry;
  readonly combat: IndexedCombat;
  readonly mastery: IndexedMastery;
  readonly skills: IndexedSkills;
  readonly training: IndexedTraining;
  readonly energetics: IndexedEnergetics;
  readonly garden: IndexedGarden;
  readonly items: IndexedItems;
  readonly conditions: IndexedConditions;
  readonly execution: IndexedExecution;
  readonly npcs: IndexedNpcs;
  readonly objectives: IndexedObjectives;
  readonly worldTriggers: IndexedWorldTriggers;
  readonly firstPriorityTrigger: WorldNarrativeTriggerDefinition;
  readonly stationLabels: Readonly<Record<string, string>>;
  readonly guidance: IndexedGuidance;
}

export const PACK_FILE_KEYS = [
  'map',
  'exploration',
  'populations',
  'resourceNodes',
  'presences',
  'presenceInteractions',
  'interactables',
  'bonds',
  'organizations',
  'party',
  'calendar',
  'family',
  'civic',
  'economy',
  'settlements',
  'politics',
  'registry',
  'npcs',
  'energetics',
  'skills',
  'training',
  'mastery',
  'garden',
  'items',
  'conditions',
  'execution',
  'combat',
  'craftingRecipes',
  'craftingStructures',
  'objectives',
  'campaign',
  'events',
  'worldTriggers',
  'firstPriorityTrigger',
  'labels',
  'guidance',
] as const;

export type PackFileKey = (typeof PACK_FILE_KEYS)[number];
