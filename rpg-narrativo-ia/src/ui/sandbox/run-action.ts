import { EngineError } from '../../core/engine';
import type { Campaign } from '../../core/events';
import type { GameState } from '../../core/state';
import { INITIAL_OBJECTIVES, type IndexedObjectives } from '../../modules/objectives';
import { PresenceError, resolvePresencesRevealedByDiscovery } from '../../modules/presences';
import type { SandboxContext } from '../../modules/sandbox';
import {
  SandboxActionError,
  executeSandboxAction,
  type SandboxAction,
  type SandboxActionResult,
} from '../../modules/sandbox-actions';
import {
  WorldEventError,
  applyWorldNarrativeTrigger,
  consumeWorldTriggersMatchingNarrative,
  indexWorldTriggerCatalog,
  resolveEligibleWorldTrigger,
  type WorldNarrativeTriggerDefinition,
} from '../../modules/world-events';
import { describeSandboxFeedback } from './feedback';

export const WORLD_TRIGGER_ATTENTION = 'Algo exige a sua atenção.';

export type SandboxActionAttempt =
  | {
      ok: true;
      previous: GameState;
      result: SandboxActionResult;
      current: GameState;
      feedback: string;
      openedTrigger?: WorldNarrativeTriggerDefinition;
    }
  | {
      ok: false;
      previous: GameState;
      error: string;
    };

export interface CommitSandboxActionOptions {
  campaign: Campaign;
  catalog: readonly WorldNarrativeTriggerDefinition[];
  persist: (next: GameState) => void;
  objectiveCatalog?: IndexedObjectives;
}

export function attemptSandboxAction(
  state: GameState,
  action: SandboxAction,
  context: SandboxContext,
  campaign: Campaign,
  catalog: readonly WorldNarrativeTriggerDefinition[],
  objectiveCatalog: IndexedObjectives = INITIAL_OBJECTIVES,
): SandboxActionAttempt {
  try {
    const result = executeSandboxAction(state, action, { context, campaign, objectives: objectiveCatalog });
    const indexed = indexWorldTriggerCatalog(catalog, {
      campaign,
      exploration: context.exploration,
    });
    const afterMatchingSession = consumeWorldTriggersMatchingNarrative(indexed, result.current);
    const trigger = resolveEligibleWorldTrigger(indexed, afterMatchingSession);
    const current = trigger
      ? resolvePresencesForWorldTrigger(
          applyWorldNarrativeTrigger(afterMatchingSession, campaign, trigger),
          context,
          trigger,
        )
      : afterMatchingSession;
    const feedback = trigger
      ? [describeSandboxFeedback(result, context), WORLD_TRIGGER_ATTENTION].filter(Boolean).join(' ')
      : describeSandboxFeedback(result, context);

    return {
      ok: true,
      previous: state,
      result,
      current,
      feedback,
      openedTrigger: trigger,
    };
  } catch (caught) {
    const error =
      caught instanceof SandboxActionError ||
      caught instanceof WorldEventError ||
      caught instanceof PresenceError ||
      caught instanceof EngineError
        ? caught.message
        : caught instanceof Error
          ? caught.message
          : 'Não foi possível executar a ação.';

    return {
      ok: false,
      previous: state,
      error,
    };
  }
}

function resolvePresencesForWorldTrigger(
  state: GameState,
  context: SandboxContext,
  trigger: WorldNarrativeTriggerDefinition,
): GameState {
  if (trigger.source.type !== 'discovery.revealed') {
    return state;
  }

  return {
    ...state,
    sandbox: {
      navigation: state.sandbox.navigation,
      exploration: state.sandbox.exploration,
      resources: state.sandbox.resources,
      crafting: state.sandbox.crafting,
      presences: resolvePresencesRevealedByDiscovery(
        context.presences,
        state.sandbox.presences,
        trigger.source.discoveryId,
      ),
    },
  };
}

export function commitSandboxAction(
  state: GameState,
  action: SandboxAction,
  context: SandboxContext,
  options: CommitSandboxActionOptions,
): SandboxActionAttempt {
  const attempt = attemptSandboxAction(
    state,
    action,
    context,
    options.campaign,
    options.catalog,
    options.objectiveCatalog,
  );
  if (attempt.ok) {
    options.persist(attempt.current);
  }

  return attempt;
}
