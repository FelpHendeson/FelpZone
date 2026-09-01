import type { DayPeriod } from '../state/types';

export type AttributeId = 'saude' | 'energia' | 'fome' | 'humanidade' | 'cautela';

export type GameEffect =
  | { type: 'attribute.change'; attribute: AttributeId; amount: number }
  | { type: 'inventory.add'; itemId: string; quantity: number }
  | { type: 'inventory.remove'; itemId: string; quantity: number }
  | { type: 'relationship.change'; characterId: string; amount: number }
  | { type: 'flag.set'; flag: string; value: boolean }
  | { type: 'world.period'; period: DayPeriod }
  | { type: 'progression.ability'; abilityId: string }
  | { type: 'progression.title'; titleId: string }
  | { type: 'game.complete' };

export type GameCondition =
  | { type: 'flag.is'; flag: string; value: boolean }
  | { type: 'attribute.min'; attribute: AttributeId; amount: number }
  | { type: 'attribute.max'; attribute: AttributeId; amount: number }
  | { type: 'inventory.has'; itemId: string; quantity?: number }
  | { type: 'relationship.min'; characterId: string; amount: number };

export type ImageKind = 'scene' | 'portrait' | 'icon';

export interface ImageReference {
  kind: ImageKind;
  label: string;
}

export type EventTransition =
  | { type: 'event'; eventId: string }
  | { type: 'firstMatch'; eventIds: string[] }
  | { type: 'returnToExploration' }
  | { type: 'complete' };

export interface StoryChoice {
  id: string;
  label: string;
  hint?: string;
  effects: GameEffect[];
  transition: EventTransition;
  conditions?: GameCondition[];
  notable?: boolean;
}

export interface StoryEvent {
  id: string;
  title: string;
  body: string;
  image: ImageReference;
  portrait?: ImageReference;
  conditions?: GameCondition[];
  choices: StoryChoice[];
  isEnding?: boolean;
  canStartSession?: boolean;
}

export interface ItemDefinition {
  id: string;
  name: string;
  description: string;
}

export interface AbilityDefinition {
  id: string;
  name: string;
  description: string;
}

export interface NpcDefinition {
  id: string;
  name: string;
}

export interface TitleDefinition {
  id: string;
  name: string;
  description: string;
  conditions: GameCondition[];
}

export interface Campaign {
  id: string;
  title: string;
  firstEventId: string;
  events: StoryEvent[];
  items: ItemDefinition[];
  abilities: AbilityDefinition[];
  npcs: NpcDefinition[];
  titles: TitleDefinition[];
}
