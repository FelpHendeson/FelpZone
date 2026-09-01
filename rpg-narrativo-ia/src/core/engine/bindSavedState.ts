import { evaluateConditions, getEventById } from '../events';
import type { Campaign } from '../events/types';
import type { GameState } from '../state/types';

export type SavedStateBinding =
  | { ok: true; state: GameState }
  | { ok: false; reason: string };

export function bindSavedState(state: GameState, campaign: Campaign): SavedStateBinding {
  if (state.status === 'completed') {
    if (state.narrativeSession !== null) {
      return {
        ok: false,
        reason: 'Uma partida concluída não pode ter sessão narrativa ativa.',
      };
    }

    return { ok: true, state };
  }

  if (state.narrativeSession === null) {
    return { ok: true, state };
  }

  if (state.narrativeSession.campaignId !== campaign.id) {
    return {
      ok: false,
      reason: 'A campanha da sessão não corresponde à campanha atual.',
    };
  }

  const event = getEventById(campaign, state.narrativeSession.eventId);
  if (!event) {
    return {
      ok: false,
      reason: `O evento salvo ${state.narrativeSession.eventId} não existe na campanha.`,
    };
  }

  if (!evaluateConditions(event.conditions, state)) {
    return {
      ok: false,
      reason: `O evento salvo ${event.id} não é compatível com o estado da partida.`,
    };
  }

  return { ok: true, state };
}
