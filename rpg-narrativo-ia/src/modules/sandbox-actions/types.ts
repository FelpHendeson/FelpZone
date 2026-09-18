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
import type { CombatResolution } from '../combat';
import type { MasteryResult } from '../mastery';
import type { EquipmentSlot } from '../items';
import type { GardenPlan } from '../garden';
import type { InteractableActionPlan } from '../interactables';
import type { BondActionPlan } from '../bonds';
import type { RegistryPatentPlan } from '../registry';
import type { OrganizationActionPlan } from '../organizations';
import type { FamilyActionPlan } from '../family';
import type { CivicActionPlan } from '../civic';
import type { EconomyActionPlan } from '../economy';
import type { SettlementActionPlan } from '../settlements';
import type { PoliticsActionPlan } from '../politics';
import type { EquipmentChangeResult } from '../equipment';
import type { PreparationChangeResult } from '../preparation';

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
    }
  | {
      type: 'combat.resolve';
      resolution: CombatResolution;
    }
  | {
      type: 'equipment.equip';
      itemId: string;
    }
  | {
      type: 'equipment.unequip';
      slot: EquipmentSlot;
    }
  | {
      type: 'preparation.assign';
      slot: number;
      itemId: string;
    }
  | {
      type: 'preparation.clear';
      slot: number;
    }
  | {
      type: 'garden.cultivate';
      recipeId: string;
    }
  | {
      type: 'interactable.interact';
      interactableId: string;
      actionId: string;
    }
  | {
      type: 'bond.act';
      actionId: string;
    }
  | {
      type: 'registry.claim';
      patentId: string;
    }
  | {
      type: 'organization.act';
      actionId: string;
    }
  | {
      type: 'family.act';
      actionId: string;
    }
  | {
      type: 'civic.act';
      actionId: string;
    }
  | {
      type: 'economy.act';
      actionId: string;
    }
  | {
      type: 'settlement.act';
      actionId: string;
    }
  | {
      type: 'politics.act';
      actionId: string;
    };

export type SandboxActionDetail =
  | { type: 'navigation.move'; result: NavigationMoveResult }
  | { type: 'exploration.explore'; result: ExplorationResult }
  | { type: 'resource.collect'; result: ResourceCollectionResult }
  | { type: 'crafting.craft'; result: CraftingResult }
  | { type: 'presence.interact'; plan: PresenceInteractionPlan }
  | { type: 'needs.consume'; plan: NeedsConsumptionPlan }
  | { type: 'needs.rest'; plan: NeedsRestPlan }
  | { type: 'training.train'; plan: TrainingPlan }
  | { type: 'combat.resolve'; resolution: CombatResolution }
  | { type: 'equipment.equip'; result: EquipmentChangeResult }
  | { type: 'equipment.unequip'; result: EquipmentChangeResult }
  | { type: 'preparation.assign'; result: PreparationChangeResult }
  | { type: 'preparation.clear'; result: PreparationChangeResult }
  | { type: 'garden.cultivate'; plan: GardenPlan }
  | { type: 'interactable.interact'; plan: InteractableActionPlan }
  | { type: 'bond.act'; plan: BondActionPlan }
  | { type: 'registry.claim'; plan: RegistryPatentPlan }
  | { type: 'organization.act'; plan: OrganizationActionPlan }
  | { type: 'family.act'; plan: FamilyActionPlan }
  | { type: 'civic.act'; plan: CivicActionPlan }
  | { type: 'economy.act'; plan: EconomyActionPlan }
  | { type: 'settlement.act'; plan: SettlementActionPlan }
  | { type: 'politics.act'; plan: PoliticsActionPlan };

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
  mastery?: MasteryResult;
}

export interface SandboxActionOptions {
  context?: SandboxContext;
  now?: () => string;
  campaign?: Campaign;
  objectives?: IndexedObjectives;
}
