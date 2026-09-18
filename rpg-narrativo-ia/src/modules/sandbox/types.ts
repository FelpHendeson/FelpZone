import type { Campaign } from '../../core/events';
import type { CraftingState, IndexedCrafting } from '../crafting/types';
import type { ExplorationState, IndexedExploration } from '../exploration/types';
import type { IndexedBonds } from '../bonds/types';
import type { IndexedOrganizations } from '../organizations/types';
import type { IndexedCalendar } from '../calendar/types';
import type { IndexedFamily } from '../family/types';
import type { IndexedCivic } from '../civic/types';
import type { IndexedEconomy } from '../economy/types';
import type { IndexedSettlements } from '../settlements/types';
import type { IndexedPolitics } from '../politics/types';
import type { IndexedRegistry } from '../registry/types';
import type { IndexedExecution } from '../execution/types';
import type { IndexedParty } from '../party/types';
import type { IndexedInteractables, InteractablesState } from '../interactables/types';
import type { IndexedItems } from '../items/types';
import type { IndexedMap, NavigationState } from '../navigation/types';
import type { IndexedNpcs, NPCsState } from '../npcs/types';
import type { IndexedObjectives } from '../objectives/types';
import type {
  IndexedPresenceInteractions,
  IndexedPresences,
  PresenceState,
} from '../presences/types';
import type { IndexedResources, ResourcesState } from '../resources/types';
import type { IndexedWorldTriggers } from '../world-events/types';

export class SandboxError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'SandboxError';
  }
}

export interface SandboxCoreState {
  navigation: NavigationState;
  exploration: ExplorationState;
  resources: ResourcesState;
  crafting: CraftingState;
}

export interface SandboxState extends SandboxCoreState {
  presences: PresenceState;
  npcs?: NPCsState;
  interactables?: InteractablesState;
}

export interface SandboxContext {
  startingLocationId: string;
  map: IndexedMap;
  exploration: IndexedExploration;
  resources: IndexedResources;
  crafting: IndexedCrafting;
  presences: IndexedPresences;
  presenceInteractions: IndexedPresenceInteractions;
  interactables?: IndexedInteractables;
  bonds?: IndexedBonds;
  organizations?: IndexedOrganizations;
  calendar?: IndexedCalendar;
  family?: IndexedFamily;
  civic?: IndexedCivic;
  economy?: IndexedEconomy;
  settlements?: IndexedSettlements;
  politics?: IndexedPolitics;
  registry?: IndexedRegistry;
  execution?: IndexedExecution;
  party?: IndexedParty;
  campaign?: Campaign;
  npcs?: IndexedNpcs;
  items?: IndexedItems;
  objectives?: IndexedObjectives;
  worldTriggers?: IndexedWorldTriggers;
  stationLabels?: Readonly<Record<string, string>>;
}

export type SandboxInspection =
  | { ok: true; value: SandboxState }
  | { ok: false; reason: string };

export type SandboxContextInspection =
  | { ok: true; value: SandboxContext }
  | { ok: false; reason: string };
