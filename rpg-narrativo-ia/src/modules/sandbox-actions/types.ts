import type { GameState } from '../../core/state/types';
import type { CraftingResult } from '../crafting/types';
import type { DayCycleResult } from '../day-cycle';
import type { ExplorationResult } from '../exploration/types';
import type { NavigationMoveResult } from '../navigation/types';
import type { ResourceCollectionResult } from '../resources/types';
import type { SandboxContext } from '../sandbox';
import type { TimeCost } from '../time';

export type SandboxAction =
  | {
      type: 'navigation.move';
      locationId: string;
    }
  | {
      type: 'exploration.explore';
    }
  | {
      type: 'resource.collect';
      nodeId: string;
      units: number;
    }
  | {
      type: 'crafting.craft';
      recipeId: string;
    };

export type SandboxActionDetail =
  | { type: 'navigation.move'; result: NavigationMoveResult }
  | { type: 'exploration.explore'; result: ExplorationResult }
  | { type: 'resource.collect'; result: ResourceCollectionResult }
  | { type: 'crafting.craft'; result: CraftingResult };

export interface SandboxSynchronizationSummary {
  renewedNodeIds: string[];
  recoveredPopulationIds: string[];
  revealedDiscoveryIds: string[];
  learnedRecipeIds: string[];
}

export interface SandboxActionResult {
  previous: GameState;
  current: GameState;
  action: SandboxAction;
  timeCost: TimeCost;
  dayCycle: DayCycleResult;
  detail: SandboxActionDetail;
  synchronization: SandboxSynchronizationSummary;
}

export interface SandboxActionOptions {
  context?: SandboxContext;
  now?: () => string;
}
