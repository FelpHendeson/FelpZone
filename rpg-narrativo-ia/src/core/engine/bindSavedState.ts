import { evaluateConditions, getEventById } from '../events';
import type { Campaign } from '../events/types';
import type { GameState } from '../state/types';

export type SavedStateBinding =
  | { ok: true; state: GameState }
  | { ok: false; reason: string };

export function bindSavedState(state: GameState, campaign: Campaign): SavedStateBinding {
  const event = getEventById(campaign, state.currentEventId);
  if (!event) {
    return {
      ok: false,
      reason: `O evento salvo ${state.currentEventId} não existe na campanha.`,
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
