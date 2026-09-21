import { EngineError } from '../../core/engine';
import type { Campaign } from '../../core/events';
import type { GameState } from '../../core/state';
import { INITIAL_OBJECTIVES, type IndexedObjectives } from '../../modules/objectives';
import { PresenceError, resolvePresencesRevealedByDiscovery } from '../../modules/presences';
import { InteractableError } from '../../modules/interactables';
import { BondError } from '../../modules/bonds';
import { RegistryError } from '../../modules/registry';
import { OrganizationError } from '../../modules/organizations';
import { FamilyError } from '../../modules/family';
import { CivicError } from '../../modules/civic';
import { EconomyError } from '../../modules/economy';
import { SettlementError } from '../../modules/settlements';
import { PoliticsError } from '../../modules/politics';
import { PartyError } from '../../modules/party';
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
import { describeSandboxFeedback, mergeFeedback, type WorldFeedbackView } from './feedback';
import { describeObjectiveFeedback } from '../journal/feedback';

export const WORLD_TRIGGER_ATTENTION = 'Algo exige a sua atenção.';

export type SandboxActionAttempt =
  | {
      ok: true;
      previous: GameState;
      result: SandboxActionResult;
      current: GameState;
      feedback: string;
      feedbackView: WorldFeedbackView;
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
    const resolved = resolveWorldNarrativeState(result.current, context, campaign, catalog);
    const trigger = resolved.openedTrigger;
    const current = resolved.current;
    const sandboxFeedback = describeSandboxFeedback(result, context);
    const objectiveFeedback = describeObjectiveFeedback(result.objectives, objectiveCatalog);
    const feedbackView = mergeFeedback([
      { kind: sandboxFeedback.kind, message: sandboxFeedback.message },
      ...(trigger ? [{ kind: 'info' as const, message: WORLD_TRIGGER_ATTENTION }] : []),
      ...(objectiveFeedback ? [objectiveFeedback] : []),
    ]) ?? sandboxFeedback;

    return {
      ok: true,
      previous: state,
      result,
      current,
      feedback: feedbackView.message,
      feedbackView,
      openedTrigger: trigger,
    };
  } catch (caught) {
    const error =
      caught instanceof SandboxActionError ||
      caught instanceof WorldEventError ||
      caught instanceof PresenceError ||
      caught instanceof InteractableError ||
      caught instanceof BondError ||
      caught instanceof RegistryError ||
      caught instanceof OrganizationError ||
      caught instanceof FamilyError ||
      caught instanceof CivicError ||
      caught instanceof EconomyError ||
      caught instanceof SettlementError ||
      caught instanceof PoliticsError ||
      caught instanceof PartyError ||
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

export interface WorldNarrativeStateResolution {
  current: GameState;
  openedTrigger?: WorldNarrativeTriggerDefinition;
}

export function resolveWorldNarrativeState(
  state: GameState,
  context: SandboxContext,
  campaign: Campaign,
  catalog: readonly WorldNarrativeTriggerDefinition[],
): WorldNarrativeStateResolution {
  if (!context.skills) {
    throw new WorldEventError('O catálogo de habilidades do pack ativo não está disponível.');
  }

  const indexed = indexWorldTriggerCatalog(catalog, {
    campaign,
    exploration: context.exploration,
    skills: context.skills,
  });
  const afterMatchingSession = consumeWorldTriggersMatchingNarrative(indexed, state);
  const trigger = resolveEligibleWorldTrigger(indexed, afterMatchingSession);
  if (!trigger) {
    return { current: afterMatchingSession };
  }

  return {
    current: resolvePresencesForWorldTrigger(
      applyWorldNarrativeTrigger(afterMatchingSession, campaign, trigger),
      context,
      trigger,
    ),
    openedTrigger: trigger,
  };
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
      npcs: state.sandbox.npcs,
      interactables: state.sandbox.interactables,
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
