import type { GameState } from '../../core/state';
import type { SandboxContext } from '../../modules/sandbox';
import {
  SandboxActionError,
  executeSandboxAction,
  type SandboxAction,
  type SandboxActionResult,
} from '../../modules/sandbox-actions';
import { describeSandboxFeedback } from './feedback';

export type SandboxActionAttempt =
  | {
      ok: true;
      previous: GameState;
      result: SandboxActionResult;
      current: GameState;
      feedback: string;
    }
  | {
      ok: false;
      previous: GameState;
      error: string;
    };

export function attemptSandboxAction(
  state: GameState,
  action: SandboxAction,
  context: SandboxContext,
): SandboxActionAttempt {
  try {
    const result = executeSandboxAction(state, action, { context });
    return {
      ok: true,
      previous: state,
      result,
      current: result.current,
      feedback: describeSandboxFeedback(result, context),
    };
  } catch (caught) {
    const error =
      caught instanceof SandboxActionError
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
  persist: (next: GameState) => void,
): SandboxActionAttempt {
  const attempt = attemptSandboxAction(state, action, context);
  if (attempt.ok) {
    persist(attempt.current);
  }

  return attempt;
}
