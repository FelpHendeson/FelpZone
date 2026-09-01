import type { GameState } from '../../core/state';
import type { IndexedWorldTriggers, WorldNarrativeTriggerDefinition } from './types';

export const WORLD_TRIGGER_FLAG_PREFIX = 'world.trigger.';
export const WORLD_TRIGGER_FLAG_SUFFIX = '.consumed';

export function worldTriggerConsumedFlag(triggerId: string): string {
  return `${WORLD_TRIGGER_FLAG_PREFIX}${triggerId}${WORLD_TRIGGER_FLAG_SUFFIX}`;
}

export function isWorldTriggerConsumed(state: GameState, triggerId: string): boolean {
  return state.flags[worldTriggerConsumedFlag(triggerId)] === true;
}

export function isDiscoveryRevealedInWorld(state: GameState, discoveryId: string): boolean {
  return state.sandbox.exploration.locations.some((location) =>
    location.revealedDiscoveryIds.includes(discoveryId),
  );
}

export function listEligibleWorldTriggers(
  catalog: IndexedWorldTriggers,
  state: GameState,
): WorldNarrativeTriggerDefinition[] {
  if (state.status !== 'playing' || state.narrativeSession !== null) {
    return [];
  }

  const eligible: WorldNarrativeTriggerDefinition[] = [];
  for (const trigger of catalog.definitions) {
    if (isWorldTriggerConsumed(state, trigger.id)) {
      continue;
    }

    if (trigger.source.type !== 'discovery.revealed') {
      continue;
    }

    if (!isDiscoveryRevealedInWorld(state, trigger.source.discoveryId)) {
      continue;
    }

    eligible.push(trigger);
  }

  return eligible;
}

export function resolveEligibleWorldTrigger(
  catalog: IndexedWorldTriggers,
  state: GameState,
): WorldNarrativeTriggerDefinition | undefined {
  return listEligibleWorldTriggers(catalog, state)[0];
}
