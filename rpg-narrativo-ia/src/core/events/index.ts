import type { GameState } from '../state/types';
import { evaluateConditions } from './conditions';
import type { Campaign, ScriptLine, StoryChoice, StoryEvent } from './types';

export function getEventById(campaign: Campaign, eventId: string): StoryEvent | undefined {
  return campaign.events.find((event) => event.id === eventId);
}

export function getVisibleChoices(event: StoryEvent, isAvailable: (choice: StoryChoice) => boolean): StoryChoice[] {
  return event.choices.filter(isAvailable);
}

/** Linhas do roteiro que este estado pode ver (condições por linha, ordem declarada). */
export function getVisibleScript(event: StoryEvent, state: GameState): ScriptLine[] {
  return (event.script ?? []).filter((line) => evaluateConditions(line.conditions, state));
}

export { evaluateCondition, evaluateConditions } from './conditions';
export { inspectImageReference, isLocalImagePath } from './image';
export type {
  AbilityDefinition,
  AttributeId,
  Campaign,
  EventTransition,
  GameCondition,
  GameEffect,
  ImageKind,
  ImageReference,
  ItemDefinition,
  NpcDefinition,
  ScriptLine,
  StoryChoice,
  StoryEvent,
  TitleDefinition,
} from './types';
