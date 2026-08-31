import type { Campaign, EventTransition, StoryEvent } from '../events/types';
import { evaluateConditions, getEventById } from '../events';
import { EngineError } from './errors';
import type { GameState } from '../state/types';

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
      };
    case 'event':
      return moveToEvent(state, campaign, transition.eventId);
    case 'firstMatch':
      return moveToFirstMatch(state, campaign, transition.eventIds);
  }
}

function moveToEvent(state: GameState, campaign: Campaign, eventId: string): GameState {
  const event = requireEvent(campaign, eventId);
  return {
    ...state,
    currentEventId: event.id,
  };
}

function moveToFirstMatch(state: GameState, campaign: Campaign, eventIds: string[]): GameState {
  const match = eventIds
    .map((eventId) => requireEvent(campaign, eventId))
    .find((event) => evaluateConditions(event.conditions, state));

  if (!match) {
    throw new EngineError(`Nenhum evento candidato pôde ser resolvido: ${eventIds.join(', ')}.`);
  }

  return {
    ...state,
    currentEventId: match.id,
  };
}

export function requireEvent(campaign: Campaign, eventId: string): StoryEvent {
  const event = getEventById(campaign, eventId);
  if (!event) {
    throw new EngineError(`Evento não encontrado: ${eventId}.`);
  }

  return event;
}
