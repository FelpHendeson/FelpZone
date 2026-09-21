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
  SCHEMA_VERSION_V11,
  SCHEMA_VERSION_V12,
  SCHEMA_VERSION_V13,
  SCHEMA_VERSION_V14,
  SCHEMA_VERSION_V15,
  SCHEMA_VERSION_V16,
  SCHEMA_VERSION_V17,
  SCHEMA_VERSION_V18,
  SCHEMA_VERSION_V19,
  SCHEMA_VERSION_V20,
  SCHEMA_VERSION_V21,
  SCHEMA_VERSION_V22,
  type GameState,
} from '../core/state';
import type { Campaign, StoryEvent } from '../core/events';
import type { IndexedObjectives } from '../modules/objectives';

export const now = () => '2026-08-31T12:00:00.000Z';

export function freshState(): GameState {
  return startGame({ firstName: 'Ana', lastName: 'Cruz' }, firstDayCampaign, now);
}

export function keepNpcAtCurrentLocation(state: GameState, npcId: string): GameState {
  const entries = (state.sandbox.npcs?.entries ?? []).map((entry) =>
    entry.npcId === npcId
      ? { ...entry, locationOverrideId: state.sandbox.navigation.currentLocationId }
      : { ...entry },
  );
  return {
    ...state,
    sandbox: {
      ...state.sandbox,
      npcs: { entries },
    },
  };
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
  delete raw.bonds;
  delete raw.registry;
  delete raw.organizations;
  delete raw.execution;
  delete raw.party;
  delete raw.calendar;
  delete raw.family;
  delete raw.civic;
  delete raw.economy;
  delete raw.settlements;
  delete raw.politics;
  if (isRecord(raw.sandbox)) {
    delete raw.sandbox.npcs;
    delete raw.sandbox.interactables;
  }
  raw.schemaVersion = SCHEMA_VERSION_V7;
  return raw;
}

export function asV8(state: GameState, objectiveCatalog?: IndexedObjectives): Record<string, unknown> {
  const raw = JSON.parse(serializeGameState(state, undefined, objectiveCatalog)) as Record<string, unknown>;
  delete raw.lingering;
  delete raw.garden;
  delete raw.bonds;
  delete raw.registry;
  delete raw.organizations;
  delete raw.execution;
  delete raw.party;
  delete raw.calendar;
  delete raw.family;
  delete raw.civic;
  delete raw.economy;
  delete raw.settlements;
  delete raw.politics;
  if (isRecord(raw.sandbox)) {
    delete raw.sandbox.npcs;
    delete raw.sandbox.interactables;
  }
  raw.schemaVersion = SCHEMA_VERSION_V8;
  return raw;
}

export function asV9(state: GameState, objectiveCatalog?: IndexedObjectives): Record<string, unknown> {
  const raw = JSON.parse(serializeGameState(state, undefined, objectiveCatalog)) as Record<string, unknown>;
  delete raw.garden;
  delete raw.bonds;
  delete raw.registry;
  delete raw.organizations;
  delete raw.execution;
  delete raw.party;
  delete raw.calendar;
  delete raw.family;
  delete raw.civic;
  delete raw.economy;
  delete raw.settlements;
  delete raw.politics;
  if (isRecord(raw.sandbox)) {
    delete raw.sandbox.npcs;
    delete raw.sandbox.interactables;
  }
  raw.schemaVersion = SCHEMA_VERSION_V9;
  return raw;
}

export function asV10(state: GameState, objectiveCatalog?: IndexedObjectives): Record<string, unknown> {
  const raw = JSON.parse(serializeGameState(state, undefined, objectiveCatalog)) as Record<string, unknown>;
  delete raw.bonds;
  delete raw.registry;
  delete raw.organizations;
  delete raw.execution;
  delete raw.party;
  delete raw.calendar;
  delete raw.family;
  delete raw.civic;
  delete raw.economy;
  delete raw.settlements;
  delete raw.politics;
  if (isRecord(raw.sandbox)) {
    delete raw.sandbox.npcs;
    delete raw.sandbox.interactables;
  }
  raw.schemaVersion = SCHEMA_VERSION_V10;
  return raw;
}

export function asV11(state: GameState, objectiveCatalog?: IndexedObjectives): Record<string, unknown> {
  const raw = JSON.parse(serializeGameState(state, undefined, objectiveCatalog)) as Record<string, unknown>;
  delete raw.bonds;
  delete raw.registry;
  delete raw.organizations;
  delete raw.execution;
  delete raw.party;
  delete raw.calendar;
  delete raw.family;
  delete raw.civic;
  delete raw.economy;
  delete raw.settlements;
  delete raw.politics;
  if (isRecord(raw.sandbox)) {
    delete raw.sandbox.interactables;
  }
  raw.schemaVersion = SCHEMA_VERSION_V11;
  return raw;
}

export function asV12(state: GameState, objectiveCatalog?: IndexedObjectives): Record<string, unknown> {
  const raw = JSON.parse(serializeGameState(state, undefined, objectiveCatalog)) as Record<string, unknown>;
  delete raw.bonds;
  delete raw.registry;
  delete raw.organizations;
  delete raw.execution;
  delete raw.party;
  delete raw.calendar;
  delete raw.family;
  delete raw.civic;
  delete raw.economy;
  delete raw.settlements;
  delete raw.politics;
  raw.schemaVersion = SCHEMA_VERSION_V12;
  return raw;
}

export function asV13(state: GameState, objectiveCatalog?: IndexedObjectives): Record<string, unknown> {
  const raw = JSON.parse(serializeGameState(state, undefined, objectiveCatalog)) as Record<string, unknown>;
  delete raw.registry;
  delete raw.organizations;
  delete raw.execution;
  delete raw.party;
  delete raw.calendar;
  delete raw.family;
  delete raw.civic;
  delete raw.economy;
  delete raw.settlements;
  delete raw.politics;
  raw.schemaVersion = SCHEMA_VERSION_V13;
  return raw;
}

export function asV14(state: GameState, objectiveCatalog?: IndexedObjectives): Record<string, unknown> {
  const raw = JSON.parse(serializeGameState(state, undefined, objectiveCatalog)) as Record<string, unknown>;
  delete raw.organizations;
  delete raw.execution;
  delete raw.party;
  delete raw.calendar;
  delete raw.family;
  delete raw.civic;
  delete raw.economy;
  delete raw.settlements;
  delete raw.politics;
  raw.schemaVersion = SCHEMA_VERSION_V14;
  return raw;
}

export function asV15(state: GameState, objectiveCatalog?: IndexedObjectives): Record<string, unknown> {
  const raw = JSON.parse(serializeGameState(state, undefined, objectiveCatalog)) as Record<string, unknown>;
  delete raw.execution;
  delete raw.party;
  delete raw.calendar;
  delete raw.family;
  delete raw.civic;
  delete raw.economy;
  delete raw.settlements;
  delete raw.politics;
  raw.schemaVersion = SCHEMA_VERSION_V15;
  return raw;
}

export function asV16(state: GameState, objectiveCatalog?: IndexedObjectives): Record<string, unknown> {
  const raw = JSON.parse(serializeGameState(state, undefined, objectiveCatalog)) as Record<string, unknown>;
  delete raw.party;
  delete raw.calendar;
  delete raw.family;
  delete raw.civic;
  delete raw.economy;
  delete raw.settlements;
  delete raw.politics;
  raw.schemaVersion = SCHEMA_VERSION_V16;
  return raw;
}

export function asV17(state: GameState, objectiveCatalog?: IndexedObjectives): Record<string, unknown> {
  const raw = JSON.parse(serializeGameState(state, undefined, objectiveCatalog)) as Record<string, unknown>;
  delete raw.calendar;
  delete raw.family;
  delete raw.civic;
  delete raw.economy;
  delete raw.settlements;
  delete raw.politics;
  raw.schemaVersion = SCHEMA_VERSION_V17;
  return raw;
}

export function asV18(state: GameState, objectiveCatalog?: IndexedObjectives): Record<string, unknown> {
  const raw = JSON.parse(serializeGameState(state, undefined, objectiveCatalog)) as Record<string, unknown>;
  delete raw.family;
  delete raw.civic;
  delete raw.economy;
  delete raw.settlements;
  delete raw.politics;
  raw.schemaVersion = SCHEMA_VERSION_V18;
  return raw;
}

export function asV19(state: GameState, objectiveCatalog?: IndexedObjectives): Record<string, unknown> {
  const raw = JSON.parse(serializeGameState(state, undefined, objectiveCatalog)) as Record<string, unknown>;
  delete raw.civic;
  delete raw.economy;
  delete raw.settlements;
  delete raw.politics;
  raw.schemaVersion = SCHEMA_VERSION_V19;
  return raw;
}

export function asV20(state: GameState, objectiveCatalog?: IndexedObjectives): Record<string, unknown> {
  const raw = JSON.parse(serializeGameState(state, undefined, objectiveCatalog)) as Record<string, unknown>;
  delete raw.economy;
  delete raw.settlements;
  delete raw.politics;
  raw.schemaVersion = SCHEMA_VERSION_V20;
  return raw;
}

export function asV21(state: GameState, objectiveCatalog?: IndexedObjectives): Record<string, unknown> {
  const raw = JSON.parse(serializeGameState(state, undefined, objectiveCatalog)) as Record<string, unknown>;
  delete raw.settlements;
  delete raw.politics;
  raw.schemaVersion = SCHEMA_VERSION_V21;
  return raw;
}

export function asV22(state: GameState, objectiveCatalog?: IndexedObjectives): Record<string, unknown> {
  const raw = JSON.parse(serializeGameState(state, undefined, objectiveCatalog)) as Record<string, unknown>;
  delete raw.politics;
  raw.schemaVersion = SCHEMA_VERSION_V22;
  return raw;
}

function stripCurrentContracts(raw: Record<string, unknown>): void {
  delete raw.system;
  delete raw.items;
  delete raw.lingering;
  delete raw.garden;
  if (isRecord(raw.sandbox)) {
    delete raw.sandbox.npcs;
    delete raw.sandbox.interactables;
  }
  delete raw.bonds;
  delete raw.registry;
  delete raw.organizations;
  delete raw.execution;
  delete raw.party;
  delete raw.calendar;
  delete raw.family;
  delete raw.civic;
  delete raw.economy;
  delete raw.settlements;
  delete raw.politics;
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
  let state = playChoices(freshState(), choiceIds);
  if (state.narrativeSession?.eventId === 'eteris-introduction') {
    state = applyChoice(state, firstDayCampaign, 'eteris-pressure', now);
  }
  if (state.narrativeSession?.eventId === 'numen-introduction') {
    state = applyChoice(state, firstDayCampaign, 'numen-follow-guidance', now);
  }
  return state;
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
