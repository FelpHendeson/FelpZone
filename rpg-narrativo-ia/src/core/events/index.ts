import type { Campaign, StoryChoice, StoryEvent } from './types';

export function getEventById(campaign: Campaign, eventId: string): StoryEvent | undefined {
  return campaign.events.find((event) => event.id === eventId);
}

export function getVisibleChoices(event: StoryEvent, isAvailable: (choice: StoryChoice) => boolean): StoryChoice[] {
  return event.choices.filter(isAvailable);
}

export { evaluateCondition, evaluateConditions } from './conditions';
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
  StoryChoice,
  StoryEvent,
  TitleDefinition,
} from './types';
