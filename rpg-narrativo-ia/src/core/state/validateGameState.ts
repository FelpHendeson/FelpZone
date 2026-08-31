import { ATTRIBUTE_IDS, DAY_PERIODS, SCHEMA_VERSION, type GameState } from './types';

export type GameStateInspection =
  | { ok: true; state: GameState }
  | { ok: false; reason: string };

export function inspectGameState(value: unknown): GameStateInspection {
  try {
    return inspect(value);
  } catch {
    return { ok: false, reason: 'O salvamento está corrompido.' };
  }
}

function inspect(value: unknown): GameStateInspection {
  if (!isRecord(value)) {
    return fail('O salvamento não contém um objeto válido.');
  }

  if (value.schemaVersion !== SCHEMA_VERSION) {
    return fail('O salvamento está incompleto.');
  }

  if (value.status !== 'playing' && value.status !== 'completed') {
    return fail('O estado da partida é inválido.');
  }

  if (typeof value.currentEventId !== 'string' || value.currentEventId.trim() === '') {
    return fail('O evento atual é inválido.');
  }

  if (typeof value.updatedAt !== 'string' || Number.isNaN(Date.parse(value.updatedAt))) {
    return fail('A data de atualização é inválida.');
  }

  const character = readCharacter(value.character);
  if (!character) {
    return fail('A identidade do personagem é inválida.');
  }

  const attributes = readAttributes(value.attributes);
  if (!attributes) {
    return fail('Os atributos da partida são inválidos.');
  }

  const inventory = readInventory(value.inventory);
  if (!inventory) {
    return fail('O inventário da partida é inválido.');
  }

  const relationships = readRelationships(value.relationships);
  if (!relationships) {
    return fail('As relações da partida são inválidas.');
  }

  const flags = readFlags(value.flags);
  if (!flags) {
    return fail('As flags narrativas são inválidas.');
  }

  const history = readHistory(value.history);
  if (!history) {
    return fail('O histórico da partida é inválido.');
  }

  const world = readWorld(value.world);
  if (!world) {
    return fail('O período da partida é inválido.');
  }

  const progression = readProgression(value.progression);
  if (!progression) {
    return fail('A progressão da partida é inválida.');
  }

  return {
    ok: true,
    state: {
      schemaVersion: SCHEMA_VERSION,
      status: value.status,
      character,
      currentEventId: value.currentEventId,
      attributes,
      inventory,
      relationships,
      flags,
      history,
      world,
      progression,
      updatedAt: value.updatedAt,
    },
  };
}

function readCharacter(value: unknown): GameState['character'] | undefined {
  if (!isRecord(value) || typeof value.firstName !== 'string' || typeof value.lastName !== 'string') {
    return undefined;
  }

  if (value.firstName.trim() === '' || value.lastName.trim() === '') {
    return undefined;
  }

  return {
    firstName: value.firstName,
    lastName: value.lastName,
  };
}

function readAttributes(value: unknown): GameState['attributes'] | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const keys = Object.keys(value);
  if (keys.length !== ATTRIBUTE_IDS.length || ATTRIBUTE_IDS.some((id) => !keys.includes(id))) {
    return undefined;
  }

  const attributes = {} as GameState['attributes'];
  for (const id of ATTRIBUTE_IDS) {
    if (!isBoundedNumber(value[id], 0, 100)) {
      return undefined;
    }
    attributes[id] = value[id];
  }

  return attributes;
}

function readInventory(value: unknown): GameState['inventory'] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const seen = new Set<string>();
  const items: GameState['inventory'] = [];

  for (const entry of value) {
    if (!isRecord(entry) || typeof entry.itemId !== 'string' || entry.itemId.trim() === '') {
      return undefined;
    }

    if (!isPositiveInteger(entry.quantity) || seen.has(entry.itemId)) {
      return undefined;
    }

    seen.add(entry.itemId);
    items.push({ itemId: entry.itemId, quantity: entry.quantity });
  }

  return items;
}

function readRelationships(value: unknown): GameState['relationships'] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const seen = new Set<string>();
  const relationships: GameState['relationships'] = [];

  for (const entry of value) {
    if (!isRecord(entry) || typeof entry.characterId !== 'string' || entry.characterId.trim() === '') {
      return undefined;
    }

    if (!isBoundedNumber(entry.trust, 0, 100) || seen.has(entry.characterId)) {
      return undefined;
    }

    seen.add(entry.characterId);
    relationships.push({ characterId: entry.characterId, trust: entry.trust });
  }

  return relationships;
}

function readFlags(value: unknown): Record<string, boolean> | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const flags: Record<string, boolean> = {};
  for (const [key, flag] of Object.entries(value)) {
    if (key.trim() === '' || typeof flag !== 'boolean') {
      return undefined;
    }
    flags[key] = flag;
  }

  return flags;
}

function readHistory(value: unknown): GameState['history'] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const history: GameState['history'] = [];
  for (const entry of value) {
    if (!isRecord(entry)) {
      return undefined;
    }

    if (
      typeof entry.eventId !== 'string' ||
      entry.eventId.trim() === '' ||
      typeof entry.eventTitle !== 'string' ||
      typeof entry.choiceId !== 'string' ||
      entry.choiceId.trim() === '' ||
      typeof entry.choiceLabel !== 'string' ||
      typeof entry.notable !== 'boolean'
    ) {
      return undefined;
    }

    history.push({
      eventId: entry.eventId,
      eventTitle: entry.eventTitle,
      choiceId: entry.choiceId,
      choiceLabel: entry.choiceLabel,
      notable: entry.notable,
    });
  }

  return history;
}

function readWorld(value: unknown): GameState['world'] | undefined {
  if (!isRecord(value) || !isPositiveInteger(value.day)) {
    return undefined;
  }

  if (!(DAY_PERIODS as readonly string[]).includes(value.period as string)) {
    return undefined;
  }

  return {
    day: value.day,
    period: value.period as GameState['world']['period'],
  };
}

function readProgression(value: unknown): GameState['progression'] | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const abilityIds = readUniqueStrings(value.abilityIds);
  const titleIds = readUniqueStrings(value.titleIds);
  if (!abilityIds || !titleIds) {
    return undefined;
  }

  return { abilityIds, titleIds };
}

function readUniqueStrings(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const seen = new Set<string>();
  const result: string[] = [];
  for (const entry of value) {
    if (typeof entry !== 'string' || entry.trim() === '' || seen.has(entry)) {
      return undefined;
    }
    seen.add(entry);
    result.push(entry);
  }

  return result;
}

function isBoundedNumber(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fail(reason: string): GameStateInspection {
  return { ok: false, reason };
}
