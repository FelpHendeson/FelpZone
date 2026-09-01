import type { CraftingState, IndexedCrafting } from '../crafting/types';
import type { ExplorationState, IndexedExploration } from '../exploration/types';
import type { IndexedMap, NavigationState } from '../navigation/types';
import type { IndexedResources, ResourcesState } from '../resources/types';

export interface SandboxState {
  navigation: NavigationState;
  exploration: ExplorationState;
  resources: ResourcesState;
  crafting: CraftingState;
}

export interface SandboxContext {
  map: IndexedMap;
  exploration: IndexedExploration;
  resources: IndexedResources;
  crafting: IndexedCrafting;
}

export type SandboxInspection =
  | { ok: true; value: SandboxState }
  | { ok: false; reason: string };
