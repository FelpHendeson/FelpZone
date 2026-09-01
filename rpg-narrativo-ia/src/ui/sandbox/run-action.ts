import { EngineError } from '../../core/engine';
import type { Campaign } from '../../core/events';
import type { GameState } from '../../core/state';
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
}

export function attemptSandboxAction(
  state: GameState,
  action: SandboxAction,
  context: SandboxContext,
  campaign: Campaign,
  catalog: readonly WorldNarrativeTriggerDefinition[],
): SandboxActionAttempt {
  try {
    const result = executeSandboxAction(state, action, { context });
    const indexed = indexWorldTriggerCatalog(catalog, {
      campaign,
      exploration: context.exploration,
    });
    const trigger = resolveEligibleWorldTrigger(indexed, result.current);
    const current = trigger
      ? applyWorldNarrativeTrigger(result.current, campaign, trigger)
      : result.current;
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

export function commitSandboxAction(
  state: GameState,
  action: SandboxAction,
  context: SandboxContext,
  options: CommitSandboxActionOptions,
): SandboxActionAttempt {
  const attempt = attemptSandboxAction(state, action, context, options.campaign, options.catalog);
  if (attempt.ok) {
    options.persist(attempt.current);
  }

  return attempt;
}
