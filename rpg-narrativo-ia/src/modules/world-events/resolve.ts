import type { GameState } from '../../core/state';
import { DEFAULT_PERIODS } from '../time';
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

    if (!isWorldTriggerSourceSatisfied(trigger, state)) {
      continue;
    }
    if (trigger.conditions?.some((condition) => state.flags[condition.flag] !== condition.value)) {
      continue;
    }

    eligible.push(trigger);
  }

  return eligible;
}

function isWorldTriggerSourceSatisfied(
  trigger: WorldNarrativeTriggerDefinition,
  state: GameState,
): boolean {
  const source = trigger.source;
  switch (source.type) {
    case 'discovery.revealed':
      return isDiscoveryRevealedInWorld(state, source.discoveryId);
    case 'system.skill.proficiency.min':
      return (
        (state.system.entries.find((entry) => entry.skillId === source.skillId)?.proficiency ?? -1) >=
        source.amount
      );
    case 'world.day.min':
      return state.world.day >= source.day;
    case 'world.time.reached': {
      if (state.world.day > source.day) {
        return true;
      }
      if (state.world.day < source.day) {
        return false;
      }
      const currentIndex = DEFAULT_PERIODS.findIndex((entry) => entry.id === state.world.period);
      const targetIndex = DEFAULT_PERIODS.findIndex((entry) => entry.id === source.period);
      return currentIndex >= targetIndex;
    }
  }
}

export function resolveEligibleWorldTrigger(
  catalog: IndexedWorldTriggers,
  state: GameState,
): WorldNarrativeTriggerDefinition | undefined {
  return listEligibleWorldTriggers(catalog, state)[0];
}

export function consumeWorldTriggersMatchingNarrative(
  catalog: IndexedWorldTriggers,
  state: GameState,
): GameState {
  if (state.status !== 'playing' || state.narrativeSession === null) {
    return state;
  }

  const session = state.narrativeSession;
  const flags = { ...state.flags };
  let changed = false;

  for (const trigger of catalog.definitions) {
    if (trigger.campaignId !== session.campaignId || trigger.eventId !== session.eventId) {
      continue;
    }

    const flag = worldTriggerConsumedFlag(trigger.id);
    if (flags[flag] === true) {
      continue;
    }

    flags[flag] = true;
    changed = true;
  }

  if (!changed) {
    return state;
  }

  return {
    ...state,
    flags,
  };
}
