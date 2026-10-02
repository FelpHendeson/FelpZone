import { recordChapterOpened } from '../story';
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
    case 'story.chapter': {
      const window = chapterWindow(source, state);
      if (!window || state.world.day < window.earliest) return false;
      return isChapterKeyResolved(source, state) || (window.fallback !== undefined && state.world.day >= window.fallback);
    }
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
  let story = state.story;
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
    if (trigger.source.type === 'story.chapter' && story) {
      story = recordChapterOpened(story, trigger.id, state.world.day);
    }
    changed = true;
  }

  if (!changed) {
    return state;
  }

  return {
    ...state,
    flags,
    ...(story ? { story } : {}),
  };
}

type ChapterSource = Extract<WorldNarrativeTriggerDefinition['source'], { type: 'story.chapter' }>;

/**
 * Janela do capítulo: dia mais cedo em que pode abrir e dia da saída de segurança.
 * Capítulo anterior consumido sem dia registrado (save migrado) conta como já cumprido.
 */
export function chapterWindow(source: ChapterSource, state: GameState): { earliest: number; fallback?: number } | null {
  if (source.after === undefined) return { earliest: source.minDay };
  const recorded = state.story?.chapterDays[source.after];
  const base = recorded ?? (isWorldTriggerConsumed(state, source.after) ? 0 : undefined);
  if (base === undefined) return null;
  return {
    earliest: Math.max(source.minDay, base + (source.minDaysAfter ?? 1)),
    ...(source.fallbackDaysAfter !== undefined ? { fallback: Math.max(source.minDay, base + source.fallbackDaysAfter) } : {}),
  };
}

/** A cena-chave que libera o capítulo foi resolvida (ou a rota não tem cena-chave). */
export function isChapterKeyResolved(source: ChapterSource, state: GameState): boolean {
  return source.anyOf.some((group) => group.every((condition) => (state.flags[condition.flag] ?? false) === condition.value));
}

/**
 * Capítulo pronto para virar: cena-chave resolvida, mas o dia mínimo ainda não chegou.
 * A interface oferece "dormir até o amanhecer" para abrir o capítulo logo após a cena-chave.
 */
export function findPendingChapterTrigger(
  catalog: IndexedWorldTriggers,
  state: GameState,
): WorldNarrativeTriggerDefinition | undefined {
  if (state.status !== 'playing' || state.narrativeSession !== null) return undefined;
  return catalog.definitions.find((trigger) => {
    if (trigger.source.type !== 'story.chapter' || isWorldTriggerConsumed(state, trigger.id)) return false;
    if (trigger.conditions?.some((condition) => state.flags[condition.flag] !== condition.value)) return false;
    const window = chapterWindow(trigger.source, state);
    return window !== null && state.world.day < window.earliest && isChapterKeyResolved(trigger.source, state);
  });
}
