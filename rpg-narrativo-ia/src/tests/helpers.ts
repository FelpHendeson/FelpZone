import { firstDayCampaign } from '../campaigns/first-day';
import { startGame } from '../core/engine';
import { serializeGameState } from '../infrastructure/persistence';
import type { GameState } from '../core/state';
import type { Campaign, StoryEvent } from '../core/events';

export const now = () => '2026-08-31T12:00:00.000Z';

export function freshState(): GameState {
  return startGame({ firstName: 'Ana', lastName: 'Cruz' }, firstDayCampaign, now);
}

export function serializedState(): Record<string, unknown> {
  return JSON.parse(serializeGameState(freshState())) as Record<string, unknown>;
}

export function stubCampaign(overrides: Partial<Campaign> = {}): Campaign {
  const start: StoryEvent = {
    id: 'start',
    title: 'Começo de {{nome}}',
    body: 'Texto de {{nomeCompleto}}.',
    image: { kind: 'scene', label: 'Início' },
    choices: [
      {
        id: 'end',
        label: 'Terminar',
        effects: [{ type: 'game.complete' }],
        transition: { type: 'complete' },
      },
    ],
    isEnding: true,
  };

  return {
    id: 'stub',
    title: 'Campanha de teste',
    firstEventId: 'start',
    events: [start],
    items: [],
    abilities: [],
    npcs: [],
    titles: [],
    ...overrides,
  };
}
