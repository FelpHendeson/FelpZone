import { evaluateConditions } from '../events';
import type { Campaign } from '../events/types';
import type { GameState } from '../state/types';
import { EngineError } from './errors';
import { requireEvent } from './resolveTransition';

export function startNarrativeSession(
  state: GameState,
  campaign: Campaign,
  eventId: string,
): GameState {
  if (state.status !== 'playing') {
    throw new EngineError('A partida já foi concluída e não aceita uma nova sessão narrativa.');
  }

  if (state.narrativeSession !== null) {
    throw new EngineError('Já existe uma sessão narrativa ativa.');
  }

  if (typeof campaign.id !== 'string' || campaign.id.trim() === '') {
    throw new EngineError('A campanha é inválida.');
  }

  if (typeof eventId !== 'string' || eventId.trim() === '') {
    throw new EngineError('O evento da sessão é inválido.');
  }

  const event = requireEvent(campaign, eventId);
  if (event.canStartSession !== true) {
    throw new EngineError(`O evento ${event.id} não pode iniciar uma sessão pelo mundo.`);
  }

  if (!evaluateConditions(event.conditions, state)) {
    throw new EngineError(`O evento ${event.id} não está disponível neste estado.`);
  }

  return {
    ...state,
    narrativeSession: {
      campaignId: campaign.id,
      eventId: event.id,
    },
  };
}
