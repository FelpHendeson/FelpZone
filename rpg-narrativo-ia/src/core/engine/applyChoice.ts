import { evaluateConditions, getEventById } from '../events';
import type { Campaign, StoryChoice, StoryEvent } from '../events/types';
import { applyEffects } from '../effects';
import { appendHistory } from '../../modules/narrative';
import { createInitialState, defaultNow } from '../state';
import type { CharacterIdentity, GameState } from '../state/types';
import { EngineError } from './errors';
import { requireEvent, resolveTransition } from './resolveTransition';

export function startGame(character: CharacterIdentity, campaign: Campaign, now = defaultNow): GameState {
  return createInitialState(character, campaign, now);
}

export function getCurrentEvent(state: GameState, campaign: Campaign): StoryEvent {
  const session = requireNarrativeSession(state, campaign);
  return requireEvent(campaign, session.eventId);
}

export function getAvailableChoices(state: GameState, campaign: Campaign): StoryChoice[] {
  if (state.status !== 'playing' || !state.narrativeSession) {
    return [];
  }

  if (state.narrativeSession.campaignId !== campaign.id) {
    return [];
  }

  const event = getEventById(campaign, state.narrativeSession.eventId);
  if (!event || !evaluateConditions(event.conditions, state)) {
    return [];
  }

  return event.choices.filter((choice) => evaluateConditions(choice.conditions, state));
}

export function applyChoice(
  state: GameState,
  campaign: Campaign,
  choiceId: string,
  now = defaultNow,
): GameState {
  if (state.status !== 'playing') {
    throw new EngineError('A partida já foi concluída e não aceita novas escolhas.');
  }

  const session = requireNarrativeSession(state, campaign);
  const event = requireEvent(campaign, session.eventId);
  if (!evaluateConditions(event.conditions, state)) {
    throw new EngineError(`O evento ${event.id} não está disponível neste estado.`);
  }

  const choice = event.choices.find((entry) => entry.id === choiceId);

  if (!choice) {
    throw new EngineError(`Escolha não encontrada no evento ${event.id}: ${choiceId}.`);
  }

  if (!evaluateConditions(choice.conditions, state)) {
    throw new EngineError(`A escolha ${choiceId} não está disponível no estado atual.`);
  }

  const withEffects = applyEffects(state, choice.effects);
  const withHistory: GameState = {
    ...withEffects,
    history: appendHistory(withEffects.history, {
      eventId: event.id,
      eventTitle: event.title,
      choiceId: choice.id,
      choiceLabel: choice.label,
      notable: choice.notable === true,
    }),
    updatedAt: now(),
  };

  return resolveTransition(withHistory, campaign, choice.transition);
}

function requireNarrativeSession(state: GameState, campaign: Campaign) {
  if (!state.narrativeSession) {
    throw new EngineError('Não há uma sessão narrativa ativa.');
  }

  if (state.narrativeSession.campaignId !== campaign.id) {
    throw new EngineError('A campanha da sessão não corresponde à campanha atual.');
  }

  return state.narrativeSession;
}
