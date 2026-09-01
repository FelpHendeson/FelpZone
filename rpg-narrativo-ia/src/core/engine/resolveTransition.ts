import type { Campaign, EventTransition, StoryEvent } from '../events/types';
import { evaluateConditions, getEventById } from '../events';
import { EngineError } from './errors';
import type { GameState, NarrativeSession } from '../state/types';

export function resolveTransition(
  state: GameState,
  campaign: Campaign,
  transition: EventTransition,
): GameState {
  switch (transition.type) {
    case 'complete':
      return {
        ...state,
        status: 'completed',
        narrativeSession: null,
      };
    case 'returnToExploration':
      return {
        ...state,
        status: 'playing',
        narrativeSession: null,
      };
    case 'event':
      return moveToEvent(state, campaign, transition.eventId);
    case 'firstMatch':
      return moveToFirstMatch(state, campaign, transition.eventIds);
  }
}

function moveToEvent(state: GameState, campaign: Campaign, eventId: string): GameState {
  const session = requireActiveSession(state);
  const event = requireEvent(campaign, eventId);
  if (!evaluateConditions(event.conditions, state)) {
    throw new EngineError(`O evento ${eventId} não cumpre suas condições.`);
  }

  return {
    ...state,
    narrativeSession: copySession(session, event.id),
  };
}

function moveToFirstMatch(state: GameState, campaign: Campaign, eventIds: string[]): GameState {
  const session = requireActiveSession(state);
  const match = eventIds
    .map((eventId) => requireEvent(campaign, eventId))
    .find((event) => evaluateConditions(event.conditions, state));

  if (!match) {
    throw new EngineError(`Nenhum evento candidato pôde ser resolvido: ${eventIds.join(', ')}.`);
  }

  return {
    ...state,
    narrativeSession: copySession(session, match.id),
  };
}

function requireActiveSession(state: GameState): NarrativeSession {
  if (!state.narrativeSession) {
    throw new EngineError('Não há uma sessão narrativa ativa.');
  }

  return state.narrativeSession;
}

function copySession(session: NarrativeSession, eventId: string): NarrativeSession {
  return {
    campaignId: session.campaignId,
    eventId,
  };
}

export function requireEvent(campaign: Campaign, eventId: string): StoryEvent {
  const event = getEventById(campaign, eventId);
  if (!event) {
    throw new EngineError(`Evento não encontrado: ${eventId}.`);
  }

  return event;
}
