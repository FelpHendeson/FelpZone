import { firstDayCampaign } from '../campaigns/first-day';
import { applyChoice, startGame } from '../core/engine';
import { serializeGameState } from '../infrastructure/persistence';
import {
  SCHEMA_VERSION_V1,
  SCHEMA_VERSION_V2,
  SCHEMA_VERSION_V3,
  SCHEMA_VERSION_V4,
  SCHEMA_VERSION_V5,
  SCHEMA_VERSION_V6,
  SCHEMA_VERSION_V7,
  SCHEMA_VERSION_V8,
  SCHEMA_VERSION_V9,
  SCHEMA_VERSION_V10,
  type GameState,
} from '../core/state';
import type { Campaign, StoryEvent } from '../core/events';
import type { IndexedObjectives } from '../modules/objectives';

export const now = () => '2026-08-31T12:00:00.000Z';

export function freshState(): GameState {
  return startGame({ firstName: 'Ana', lastName: 'Cruz' }, firstDayCampaign, now);
}

export function serializedState(): Record<string, unknown> {
  return JSON.parse(serializeGameState(freshState())) as Record<string, unknown>;
}

export function asV1(state: GameState, objectiveCatalog?: IndexedObjectives): Record<string, unknown> {
  const raw = JSON.parse(serializeGameState(state, undefined, objectiveCatalog)) as Record<string, unknown>;
  stripCurrentContracts(raw);
  removeThirst(raw);
  delete raw.objectives;
  delete raw.sandbox;
  delete raw.narrativeSession;
  raw.schemaVersion = SCHEMA_VERSION_V1;
  raw.currentEventId = state.narrativeSession?.eventId ?? 'awakening';
  return raw;
}

export function asV2(state: GameState, objectiveCatalog?: IndexedObjectives): Record<string, unknown> {
  const raw = JSON.parse(serializeGameState(state, undefined, objectiveCatalog)) as Record<string, unknown>;
  stripCurrentContracts(raw);
  removeThirst(raw);
  delete raw.objectives;
  delete raw.narrativeSession;
  raw.schemaVersion = SCHEMA_VERSION_V2;
  raw.currentEventId = state.narrativeSession?.eventId ?? 'awakening';
  return raw;
}

export function asV3(state: GameState, objectiveCatalog?: IndexedObjectives): Record<string, unknown> {
  const raw = JSON.parse(serializeGameState(state, undefined, objectiveCatalog)) as Record<string, unknown>;
  stripCurrentContracts(raw);
  removeThirst(raw);
  delete raw.objectives;
  raw.schemaVersion = SCHEMA_VERSION_V3;
  if (isRecord(raw.sandbox)) {
    delete raw.sandbox.presences;
  }
  return raw;
}

export function asV4(state: GameState, objectiveCatalog?: IndexedObjectives): Record<string, unknown> {
  const raw = JSON.parse(serializeGameState(state, undefined, objectiveCatalog)) as Record<string, unknown>;
  stripCurrentContracts(raw);
  removeThirst(raw);
  delete raw.objectives;
  raw.schemaVersion = SCHEMA_VERSION_V4;
  return raw;
}

export function asV5(state: GameState, objectiveCatalog?: IndexedObjectives): Record<string, unknown> {
  const raw = JSON.parse(serializeGameState(state, undefined, objectiveCatalog)) as Record<string, unknown>;
  stripCurrentContracts(raw);
  delete raw.objectives;
  raw.schemaVersion = SCHEMA_VERSION_V5;
  return raw;
}

export function asV6(state: GameState, objectiveCatalog?: IndexedObjectives): Record<string, unknown> {
  const raw = JSON.parse(serializeGameState(state, undefined, objectiveCatalog)) as Record<string, unknown>;
  stripCurrentContracts(raw);
  raw.schemaVersion = SCHEMA_VERSION_V6;
  return raw;
}

export function asV7(state: GameState, objectiveCatalog?: IndexedObjectives): Record<string, unknown> {
  const raw = JSON.parse(serializeGameState(state, undefined, objectiveCatalog)) as Record<string, unknown>;
  delete raw.items;
  delete raw.lingering;
  delete raw.garden;
  if (isRecord(raw.sandbox)) {
    delete raw.sandbox.npcs;
  }
  raw.schemaVersion = SCHEMA_VERSION_V7;
  return raw;
}

export function asV8(state: GameState, objectiveCatalog?: IndexedObjectives): Record<string, unknown> {
  const raw = JSON.parse(serializeGameState(state, undefined, objectiveCatalog)) as Record<string, unknown>;
  delete raw.lingering;
  delete raw.garden;
  if (isRecord(raw.sandbox)) {
    delete raw.sandbox.npcs;
  }
  raw.schemaVersion = SCHEMA_VERSION_V8;
  return raw;
}

export function asV9(state: GameState, objectiveCatalog?: IndexedObjectives): Record<string, unknown> {
  const raw = JSON.parse(serializeGameState(state, undefined, objectiveCatalog)) as Record<string, unknown>;
  delete raw.garden;
  if (isRecord(raw.sandbox)) {
    delete raw.sandbox.npcs;
  }
  raw.schemaVersion = SCHEMA_VERSION_V9;
  return raw;
}

export function asV10(state: GameState, objectiveCatalog?: IndexedObjectives): Record<string, unknown> {
  const raw = JSON.parse(serializeGameState(state, undefined, objectiveCatalog)) as Record<string, unknown>;
  if (isRecord(raw.sandbox)) {
    delete raw.sandbox.npcs;
  }
  raw.schemaVersion = SCHEMA_VERSION_V10;
  return raw;
}

function stripCurrentContracts(raw: Record<string, unknown>): void {
  delete raw.system;
  delete raw.items;
  delete raw.lingering;
  delete raw.garden;
  if (isRecord(raw.sandbox)) {
    delete raw.sandbox.npcs;
  }
}

function removeThirst(raw: Record<string, unknown>): void {
  if (isRecord(raw.attributes)) {
    delete raw.attributes.sede;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function reopenNarrativeSession(
  state: GameState,
  eventId: string,
  campaignId = firstDayCampaign.id,
): GameState {
  return {
    ...state,
    status: 'playing',
    narrativeSession: {
      campaignId,
      eventId,
    },
  };
}

export function playChoices(
  start: GameState,
  choiceIds: string[],
  campaign: Campaign = firstDayCampaign,
  clock = now,
  objectiveCatalog?: IndexedObjectives,
): GameState {
  return choiceIds.reduce(
    (state, choiceId) => applyChoice(state, campaign, choiceId, clock, objectiveCatalog),
    start,
  );
}

export function playFirstDay(choiceIds: string[]): GameState {
  return playChoices(freshState(), choiceIds);
}

export function continueAfterIntro(introChoices: string[], restChoices: string[]): GameState {
  return playChoices(reopenNarrativeSession(playFirstDay(introChoices), 'first-priority'), restChoices);
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
