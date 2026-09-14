import type { Campaign } from '../../core/events';
import type { GameState } from '../../core/state/types';
import type { CraftingResult } from '../crafting/types';
import type { DayCycleResult } from '../day-cycle';
import type { ExplorationResult } from '../exploration/types';
import type { NavigationMoveResult } from '../navigation/types';
import type {
  NeedsConsumptionPlan,
  NeedsRestPlan,
  NeedsWearSummary,
  RestMode,
} from '../needs';
import type { PresenceInteractionPlan } from '../presences';
import type { IndexedObjectives, ObjectivesSynchronizationResult } from '../objectives';
import type { ResourceCollectionResult } from '../resources/types';
import type { SandboxContext } from '../sandbox';
import type { TimeCost } from '../time';
import type { TrainingPlan } from '../training';

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
    }
  | {
      type: 'presence.interact';
      presenceId: string;
      interactionId: string;
    }
  | {
      type: 'needs.consume';
      itemId: string;
    }
  | {
      type: 'needs.rest';
      mode: RestMode;
    }
  | {
      type: 'training.train';
      methodId: string;
    };

export type SandboxActionDetail =
  | { type: 'navigation.move'; result: NavigationMoveResult }
  | { type: 'exploration.explore'; result: ExplorationResult }
  | { type: 'resource.collect'; result: ResourceCollectionResult }
  | { type: 'crafting.craft'; result: CraftingResult }
  | { type: 'presence.interact'; plan: PresenceInteractionPlan }
  | { type: 'needs.consume'; plan: NeedsConsumptionPlan }
  | { type: 'needs.rest'; plan: NeedsRestPlan }
  | { type: 'training.train'; plan: TrainingPlan };

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
  needsWear: NeedsWearSummary;
  detail: SandboxActionDetail;
  synchronization: SandboxSynchronizationSummary;
  objectives: ObjectivesSynchronizationResult;
  feedback?: string;
}

export interface SandboxActionOptions {
  context?: SandboxContext;
  now?: () => string;
  campaign?: Campaign;
  objectives?: IndexedObjectives;
}
