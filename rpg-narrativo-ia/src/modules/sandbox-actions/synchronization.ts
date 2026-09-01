import type { CraftingState } from '../crafting/types';
import type { ExplorationState } from '../exploration/types';
import type { ResourcesState } from '../resources/types';
import type { SandboxSynchronizationSummary } from './types';

export function summarizeSynchronization(input: {
  previousExploration: ExplorationState;
  currentExploration: ExplorationState;
  previousCrafting: CraftingState;
  currentCrafting: CraftingState;
  resourcesBeforeRecovery: ResourcesState;
  resourcesAfterRecovery: ResourcesState;
  resourcesAfterRenewal: ResourcesState;
}): SandboxSynchronizationSummary {
  return {
    renewedNodeIds: renewedNodeIds(input.resourcesAfterRecovery, input.resourcesAfterRenewal),
    recoveredPopulationIds: recoveredPopulationIds(input.resourcesBeforeRecovery, input.resourcesAfterRecovery),
    revealedDiscoveryIds: revealedDiscoveryIds(input.previousExploration, input.currentExploration),
    learnedRecipeIds: addedIds(input.previousCrafting.knownRecipeIds, input.currentCrafting.knownRecipeIds),
  };
}

function revealedDiscoveryIds(previous: ExplorationState, current: ExplorationState): string[] {
  const seen = new Set(previous.locations.flatMap((location) => location.revealedDiscoveryIds));
  const revealed: string[] = [];

  for (const location of current.locations) {
    for (const discoveryId of location.revealedDiscoveryIds) {
      if (seen.has(discoveryId)) {
        continue;
      }

      seen.add(discoveryId);
      revealed.push(discoveryId);
    }
  }

  return revealed;
}

function recoveredPopulationIds(previous: ResourcesState, current: ResourcesState): string[] {
  const before = new Map(previous.populations.map((entry) => [entry.populationId, entry]));
  return current.populations
    .filter((entry) => {
      const original = before.get(entry.populationId);
      return original !== undefined && entry.current > original.current;
    })
    .map((entry) => entry.populationId);
}

function renewedNodeIds(previous: ResourcesState, current: ResourcesState): string[] {
  const before = new Map(previous.nodes.map((entry) => [entry.nodeId, entry]));
  return current.nodes
    .filter((entry) => {
      const original = before.get(entry.nodeId);
      if (!original) {
        return false;
      }

      return entry.availableUnits > original.availableUnits || (original.exhausted && !entry.exhausted);
    })
    .map((entry) => entry.nodeId);
}

function addedIds(previous: readonly string[], current: readonly string[]): string[] {
  const seen = new Set(previous);
  return current.filter((id) => !seen.has(id));
}
