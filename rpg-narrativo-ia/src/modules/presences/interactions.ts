import {
  getEventById,
  type Campaign,
  type GameCondition,
  type GameEffect,
} from '../../core/events';
import { isAttributeId, isDayPeriod } from '../../core/state/types';
import { inspectTimeCost } from '../time';
import { PresenceError } from './errors';
import { ImmutableIndex } from './immutable-index';
import { INITIAL_PRESENCE_INTERACTIONS } from './initial-presences';
import {
  PRESENCE_INTERACTION_KINDS,
  type IndexedPresenceInteractions,
  type IndexedPresences,
  type PresenceInspection,
  type PresenceInteractionDefinition,
  type PresenceInteractionKind,
  type PresenceInteractionPlan,
  type PresenceNarrativeReference,
} from './types';

export function inspectPresenceInteractionCatalog(
  value: unknown,
  catalog: IndexedPresences,
  campaign?: Campaign,
): PresenceInspection<IndexedPresenceInteractions> {
  if (!isRecord(value) || !Array.isArray(value.interactions)) {
    return fail('O catálogo de interações é inválido.');
  }

  const interactions: PresenceInteractionDefinition[] = [];
  const byId = new Map<string, PresenceInteractionDefinition>();

  for (const entry of value.interactions) {
    const inspected = inspectInteraction(entry, catalog, byId, campaign);
    if (!inspected.ok) {
      return inspected;
    }

    const frozen = freezeInteraction(inspected.value);
    byId.set(frozen.id, frozen);
    interactions.push(frozen);
  }

  return {
    ok: true,
    value: freezeIndexedInteractions(interactions),
  };
}

export function indexPresenceInteractionCatalog(
  value: unknown,
  catalog: IndexedPresences,
  campaign?: Campaign,
): IndexedPresenceInteractions {
  const inspected = inspectPresenceInteractionCatalog(value, catalog, campaign);
  if (!inspected.ok) {
    throw new PresenceError(inspected.reason);
  }

  return inspected.value;
}

export function inspectIndexedPresenceInteractions(
  value: unknown,
  catalog: IndexedPresences,
): PresenceInspection<IndexedPresenceInteractions> {
  if (
    !isRecord(value) ||
    !Array.isArray(value.interactions) ||
    !isMapLike(value.byId) ||
    !isMapLike(value.byPresence)
  ) {
    return fail('O catálogo de interações indexado é inválido.');
  }

  const interactions: PresenceInteractionDefinition[] = [];
  const byId = new Map<string, PresenceInteractionDefinition>();

  for (const entry of value.interactions) {
    const inspected = inspectIndexedInteraction(entry, catalog, byId);
    if (!inspected.ok) {
      return inspected;
    }

    const frozen = freezeInteraction(inspected.value);
    byId.set(frozen.id, frozen);
    interactions.push(frozen);
  }

  const idIndex = inspectConsistentInteractionIdIndex(interactions, value.byId);
  if (!idIndex.ok) {
    return idIndex;
  }

  const presenceIndex = inspectConsistentInteractionPresenceIndex(interactions, value.byPresence);
  if (!presenceIndex.ok) {
    return presenceIndex;
  }

  return {
    ok: true,
    value: freezeIndexedInteractions(interactions),
  };
}

export function requireIndexedPresenceInteractions(
  value: IndexedPresenceInteractions,
  catalog: IndexedPresences,
): IndexedPresenceInteractions {
  const inspected = inspectIndexedPresenceInteractions(value, catalog);
  if (!inspected.ok) {
    throw new PresenceError(inspected.reason);
  }

  return inspected.value;
}

export function copyInteraction(interaction: PresenceInteractionDefinition): PresenceInteractionDefinition {
  const copied: PresenceInteractionDefinition = {
    id: interaction.id,
    presenceId: interaction.presenceId,
    kind: interaction.kind,
    label: interaction.label,
    timeCost: copyTimeCost(interaction.timeCost),
    resolvesPresence: interaction.resolvesPresence,
  };

  if (interaction.hint !== undefined) {
    copied.hint = interaction.hint;
  }

  if (interaction.conditions) {
    copied.conditions = copyConditions(interaction.conditions);
  }

  if (interaction.effects) {
    copied.effects = copyEffects(interaction.effects);
  }

  if (interaction.feedback !== undefined) {
    copied.feedback = interaction.feedback;
  }

  if (interaction.narrative) {
    copied.narrative = copyNarrative(interaction.narrative);
  }

  return copied;
}

export function createInteractionPlan(interaction: PresenceInteractionDefinition): PresenceInteractionPlan {
  const plan: PresenceInteractionPlan = {
    interactionId: interaction.id,
    presenceId: interaction.presenceId,
    timeCost: copyTimeCost(interaction.timeCost),
    effects: interaction.effects ? copyEffects(interaction.effects) : [],
    resolvesPresence: interaction.resolvesPresence,
  };

  if (interaction.feedback !== undefined) {
    plan.feedback = interaction.feedback;
  }

  if (interaction.narrative) {
    plan.narrative = copyNarrative(interaction.narrative);
  }

  return plan;
}

export { INITIAL_PRESENCE_INTERACTIONS };

function inspectInteraction(
  value: unknown,
  catalog: IndexedPresences,
  byId: ReadonlyMap<string, PresenceInteractionDefinition>,
  campaign: Campaign | undefined,
): PresenceInspection<PresenceInteractionDefinition> {
  const inspected = inspectInteractionShape(value, catalog, byId);
  if (!inspected.ok) {
    return inspected;
  }

  if (!isRecord(value)) {
    return fail('O catálogo de interações é inválido.');
  }

  const narrative = inspectNarrativeReference(value, inspected.value, campaign);
  if (!narrative.ok) {
    return narrative;
  }

  return {
    ok: true,
    value: {
      ...inspected.value,
      narrative: narrative.value,
    },
  };
}

function inspectIndexedInteraction(
  value: unknown,
  catalog: IndexedPresences,
  byId: ReadonlyMap<string, PresenceInteractionDefinition>,
): PresenceInspection<PresenceInteractionDefinition> {
  const inspected = inspectInteractionShape(value, catalog, byId);
  if (!inspected.ok) {
    return inspected;
  }

  if (!isRecord(value)) {
    return fail('O catálogo de interações é inválido.');
  }

  const narrative = inspectNarrativeShape(value.narrative, inspected.value.id);
  if (!narrative.ok) {
    return narrative;
  }

  return {
    ok: true,
    value: {
      ...inspected.value,
      narrative: narrative.value,
    },
  };
}

function inspectInteractionShape(
  value: unknown,
  catalog: IndexedPresences,
  byId: ReadonlyMap<string, PresenceInteractionDefinition>,
): PresenceInspection<PresenceInteractionDefinition> {
  if (!isRecord(value)) {
    return fail('O catálogo de interações é inválido.');
  }

  if (typeof value.id !== 'string' || value.id.trim() === '') {
    return fail('O identificador da interação é inválido.');
  }

  if (byId.has(value.id)) {
    return fail(`A interação ${value.id} está duplicada.`);
  }

  if (!isInteractionKind(value.kind)) {
    return fail(`O tipo da interação ${value.id} é desconhecido.`);
  }

  if (typeof value.presenceId !== 'string' || value.presenceId.trim() === '') {
    return fail(`A presença da interação ${value.id} não existe.`);
  }

  const presence = catalog.byPresence.get(value.presenceId);
  if (!presence) {
    return fail(`A presença da interação ${value.id} não existe.`);
  }

  if (typeof value.label !== 'string' || value.label.trim() === '') {
    return fail(`O rótulo da interação ${value.id} é inválido.`);
  }

  const hint = inspectOptionalText(value.hint, `A dica da interação ${value.id} é inválida.`);
  if (!hint.ok) {
    return hint;
  }

  const timeCost = inspectTimeCost(value.timeCost);
  if (!timeCost.ok) {
    return fail(`O custo de tempo da interação ${value.id} é inválido.`);
  }

  const conditions = inspectOptionalConditions(
    value.conditions,
    `A interação ${value.id} possui condições malformadas.`,
  );
  if (!conditions.ok) {
    return conditions;
  }

  const effects = inspectOptionalEffects(value.effects, `A interação ${value.id} possui efeitos malformados.`);
  if (!effects.ok) {
    return effects;
  }

  const feedback = inspectOptionalText(value.feedback, `O feedback da interação ${value.id} é inválido.`);
  if (!feedback.ok) {
    return feedback;
  }

  if (typeof value.resolvesPresence !== 'boolean') {
    return fail(`A interação ${value.id} possui intenção de resolução inválida.`);
  }

  if (value.resolvesPresence && !presence.resolvable) {
    return fail(`A interação ${value.id} não pode resolver a presença ${presence.id}.`);
  }

  return {
    ok: true,
    value: copyInteraction({
      id: value.id,
      presenceId: value.presenceId,
      kind: value.kind,
      label: value.label,
      hint: hint.value,
      timeCost: timeCost.value,
      conditions: conditions.value,
      effects: effects.value,
      feedback: feedback.value,
      resolvesPresence: value.resolvesPresence,
    }),
  };
}

function inspectNarrativeReference(
  value: Record<string, unknown>,
  interaction: PresenceInteractionDefinition,
  campaign: Campaign | undefined,
): PresenceInspection<PresenceNarrativeReference | undefined> {
  const shape = inspectNarrativeShape(value.narrative, interaction.id);
  if (!shape.ok) {
    return shape;
  }

  if (shape.value === undefined) {
    return { ok: true, value: undefined };
  }

  if (!campaign || typeof campaign.id !== 'string' || campaign.id.trim() === '') {
    return fail(`A campanha da interação ${interaction.id} não existe.`);
  }

  if (shape.value.campaignId !== campaign.id) {
    return fail(`A interação ${interaction.id} não pertence à campanha ${campaign.id}.`);
  }

  const event = getEventById(campaign, shape.value.eventId);
  if (!event) {
    return fail(`O evento ${shape.value.eventId} da interação ${interaction.id} não existe.`);
  }

  if (event.canStartSession !== true) {
    return fail(`O evento ${shape.value.eventId} não pode iniciar uma sessão narrativa.`);
  }

  return { ok: true, value: shape.value };
}

function inspectNarrativeShape(
  value: unknown,
  interactionId: string,
): PresenceInspection<PresenceNarrativeReference | undefined> {
  if (value === undefined) {
    return { ok: true, value: undefined };
  }

  if (
    !isRecord(value) ||
    typeof value.campaignId !== 'string' ||
    value.campaignId.trim() === '' ||
    typeof value.eventId !== 'string' ||
    value.eventId.trim() === ''
  ) {
    return fail(`A referência narrativa da interação ${interactionId} é inválida.`);
  }

  return {
    ok: true,
    value: copyNarrative({ campaignId: value.campaignId, eventId: value.eventId }),
  };
}

function inspectOptionalText(value: unknown, reason: string): PresenceInspection<string | undefined> {
  if (value === undefined) {
    return { ok: true, value: undefined };
  }

  if (typeof value !== 'string' || value.trim() === '') {
    return fail(reason);
  }

  return { ok: true, value };
}

function inspectOptionalConditions(
  value: unknown,
  reason: string,
): PresenceInspection<GameCondition[] | undefined> {
  if (value === undefined) {
    return { ok: true, value: undefined };
  }

  const inspected = inspectConditions(value, reason);
  if (!inspected.ok) {
    return inspected;
  }

  return { ok: true, value: inspected.value };
}

function inspectConditions(value: unknown, reason: string): PresenceInspection<GameCondition[]> {
  if (!Array.isArray(value)) {
    return fail(reason);
  }

  const conditions: GameCondition[] = [];
  for (const entry of value) {
    const condition = inspectCondition(entry, reason);
    if (!condition.ok) {
      return condition;
    }

    conditions.push(condition.value);
  }

  return { ok: true, value: conditions };
}

function inspectCondition(value: unknown, reason: string): PresenceInspection<GameCondition> {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return fail(reason);
  }

  switch (value.type) {
    case 'flag.is':
      if (typeof value.flag !== 'string' || value.flag.trim() === '' || typeof value.value !== 'boolean') {
        return fail(reason);
      }
      return { ok: true, value: { type: 'flag.is', flag: value.flag, value: value.value } };
    case 'attribute.min':
    case 'attribute.max':
      if (!isAttributeId(value.attribute) || !isFiniteNumber(value.amount)) {
        return fail(reason);
      }
      return {
        ok: true,
        value: { type: value.type, attribute: value.attribute, amount: value.amount },
      };
    case 'inventory.has':
      if (typeof value.itemId !== 'string' || value.itemId.trim() === '') {
        return fail(reason);
      }
      if (value.quantity !== undefined && !isPositiveInteger(value.quantity)) {
        return fail(reason);
      }
      return {
        ok: true,
        value:
          value.quantity === undefined
            ? { type: 'inventory.has', itemId: value.itemId }
            : { type: 'inventory.has', itemId: value.itemId, quantity: value.quantity },
      };
    case 'relationship.min':
      if (typeof value.characterId !== 'string' || value.characterId.trim() === '' || !isFiniteNumber(value.amount)) {
        return fail(reason);
      }
      return {
        ok: true,
        value: { type: 'relationship.min', characterId: value.characterId, amount: value.amount },
      };
    default:
      return fail(reason);
  }
}

function inspectOptionalEffects(value: unknown, reason: string): PresenceInspection<GameEffect[] | undefined> {
  if (value === undefined) {
    return { ok: true, value: undefined };
  }

  if (!Array.isArray(value)) {
    return fail(reason);
  }

  const effects: GameEffect[] = [];
  for (const entry of value) {
    const effect = inspectEffect(entry, reason);
    if (!effect.ok) {
      return effect;
    }

    effects.push(effect.value);
  }

  return { ok: true, value: effects };
}

function inspectEffect(value: unknown, reason: string): PresenceInspection<GameEffect> {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return fail(reason);
  }

  switch (value.type) {
    case 'attribute.change':
      if (!isAttributeId(value.attribute) || !isFiniteNumber(value.amount)) {
        return fail(reason);
      }
      return {
        ok: true,
        value: { type: 'attribute.change', attribute: value.attribute, amount: value.amount },
      };
    case 'inventory.add':
    case 'inventory.remove':
      if (typeof value.itemId !== 'string' || value.itemId.trim() === '' || !isPositiveInteger(value.quantity)) {
        return fail(reason);
      }
      return {
        ok: true,
        value: { type: value.type, itemId: value.itemId, quantity: value.quantity },
      };
    case 'relationship.change':
      if (
        typeof value.characterId !== 'string' ||
        value.characterId.trim() === '' ||
        !isFiniteNumber(value.amount)
      ) {
        return fail(reason);
      }
      return {
        ok: true,
        value: { type: 'relationship.change', characterId: value.characterId, amount: value.amount },
      };
    case 'flag.set':
      if (typeof value.flag !== 'string' || value.flag.trim() === '' || typeof value.value !== 'boolean') {
        return fail(reason);
      }
      return { ok: true, value: { type: 'flag.set', flag: value.flag, value: value.value } };
    case 'world.period':
      if (!isDayPeriod(value.period)) {
        return fail(reason);
      }
      return { ok: true, value: { type: 'world.period', period: value.period } };
    case 'progression.ability':
      if (typeof value.abilityId !== 'string' || value.abilityId.trim() === '') {
        return fail(reason);
      }
      return { ok: true, value: { type: 'progression.ability', abilityId: value.abilityId } };
    case 'progression.title':
      if (typeof value.titleId !== 'string' || value.titleId.trim() === '') {
        return fail(reason);
      }
      return { ok: true, value: { type: 'progression.title', titleId: value.titleId } };
    case 'game.complete':
      return { ok: true, value: { type: 'game.complete' } };
    default:
      return fail(reason);
  }
}

function freezeIndexedInteractions(
  interactions: readonly PresenceInteractionDefinition[],
): IndexedPresenceInteractions {
  const byPresence = new Map<string, PresenceInteractionDefinition[]>();
  for (const interaction of interactions) {
    const linked = byPresence.get(interaction.presenceId) ?? [];
    linked.push(interaction);
    byPresence.set(interaction.presenceId, linked);
  }

  return Object.freeze({
    interactions: Object.freeze([...interactions]),
    byId: new ImmutableIndex(interactions.map((interaction) => [interaction.id, interaction] as const)),
    byPresence: new ImmutableIndex(
      [...byPresence].map(
        ([presenceId, linked]) => [presenceId, Object.freeze([...linked])] as const,
      ),
    ),
  });
}

function inspectConsistentInteractionIdIndex(
  interactions: readonly PresenceInteractionDefinition[],
  index: ReadonlyMap<unknown, unknown>,
): PresenceInspection<void> {
  const entries = readMapEntries(index);
  if (!entries.ok) {
    return entries;
  }

  if (entries.value.length !== interactions.length) {
    return fail('O índice de interações é inconsistente.');
  }

  const seen = new Set<string>();
  for (const [key, value] of entries.value) {
    if (typeof key !== 'string' || !isRecord(value) || value.id !== key) {
      return fail('O índice de interações é inconsistente.');
    }

    if (seen.has(key)) {
      return fail('O índice de interações é inconsistente.');
    }

    seen.add(key);
  }

  for (const interaction of interactions) {
    const indexed = index.get(interaction.id);
    if (!sameInteraction(interaction, indexed)) {
      return fail('O índice de interações é inconsistente.');
    }
  }

  return { ok: true, value: undefined };
}

function inspectConsistentInteractionPresenceIndex(
  interactions: readonly PresenceInteractionDefinition[],
  index: ReadonlyMap<unknown, unknown>,
): PresenceInspection<void> {
  const expected = new Map<string, string[]>();
  for (const interaction of interactions) {
    const linked = expected.get(interaction.presenceId) ?? [];
    linked.push(interaction.id);
    expected.set(interaction.presenceId, linked);
  }

  const entries = readMapEntries(index);
  if (!entries.ok) {
    return entries;
  }

  if (entries.value.length !== expected.size) {
    return fail('O índice de interações por presença é inconsistente.');
  }

  const seenPresences = new Set<string>();
  for (const [presenceId, linked] of entries.value) {
    if (typeof presenceId !== 'string' || !Array.isArray(linked) || seenPresences.has(presenceId)) {
      return fail('O índice de interações por presença é inconsistente.');
    }

    seenPresences.add(presenceId);

    const expectedIds = expected.get(presenceId);
    if (!expectedIds || expectedIds.length !== linked.length) {
      return fail('O índice de interações por presença é inconsistente.');
    }

    for (let position = 0; position < expectedIds.length; position += 1) {
      const entry = linked[position];
      if (!isRecord(entry) || entry.id !== expectedIds[position] || entry.presenceId !== presenceId) {
        return fail('O índice de interações por presença é inconsistente.');
      }
    }
  }

  for (const presenceId of expected.keys()) {
    if (!index.has(presenceId)) {
      return fail('O índice de interações por presença é inconsistente.');
    }
  }

  return { ok: true, value: undefined };
}

function freezeInteraction(interaction: PresenceInteractionDefinition): PresenceInteractionDefinition {
  const frozen: PresenceInteractionDefinition = {
    id: interaction.id,
    presenceId: interaction.presenceId,
    kind: interaction.kind,
    label: interaction.label,
    timeCost: Object.freeze(copyTimeCost(interaction.timeCost)),
    resolvesPresence: interaction.resolvesPresence,
  };

  if (interaction.hint !== undefined) {
    frozen.hint = interaction.hint;
  }

  if (interaction.conditions) {
    frozen.conditions = Object.freeze(
      interaction.conditions.map((condition) => Object.freeze(copyCondition(condition))),
    ) as GameCondition[];
  }

  if (interaction.effects) {
    frozen.effects = Object.freeze(
      interaction.effects.map((effect) => Object.freeze(copyEffect(effect))),
    ) as GameEffect[];
  }

  if (interaction.feedback !== undefined) {
    frozen.feedback = interaction.feedback;
  }

  if (interaction.narrative) {
    frozen.narrative = Object.freeze(copyNarrative(interaction.narrative));
  }

  return Object.freeze(frozen);
}

function copyTimeCost(cost: PresenceInteractionDefinition['timeCost']): PresenceInteractionDefinition['timeCost'] {
  return { periods: cost.periods };
}

function copyNarrative(narrative: PresenceNarrativeReference): PresenceNarrativeReference {
  return { campaignId: narrative.campaignId, eventId: narrative.eventId };
}

function copyEffects(effects: readonly GameEffect[]): GameEffect[] {
  return effects.map(copyEffect);
}

function copyEffect(effect: GameEffect): GameEffect {
  switch (effect.type) {
    case 'attribute.change':
      return { type: 'attribute.change', attribute: effect.attribute, amount: effect.amount };
    case 'inventory.add':
    case 'inventory.remove':
      return { type: effect.type, itemId: effect.itemId, quantity: effect.quantity };
    case 'relationship.change':
      return { type: 'relationship.change', characterId: effect.characterId, amount: effect.amount };
    case 'flag.set':
      return { type: 'flag.set', flag: effect.flag, value: effect.value };
    case 'world.period':
      return { type: 'world.period', period: effect.period };
    case 'progression.ability':
      return { type: 'progression.ability', abilityId: effect.abilityId };
    case 'progression.title':
      return { type: 'progression.title', titleId: effect.titleId };
    case 'game.complete':
      return { type: 'game.complete' };
  }
}

function copyConditions(conditions: readonly GameCondition[]): GameCondition[] {
  return conditions.map(copyCondition);
}

function copyCondition(condition: GameCondition): GameCondition {
  switch (condition.type) {
    case 'flag.is':
      return { type: 'flag.is', flag: condition.flag, value: condition.value };
    case 'attribute.min':
    case 'attribute.max':
      return { type: condition.type, attribute: condition.attribute, amount: condition.amount };
    case 'inventory.has':
      return condition.quantity === undefined
        ? { type: 'inventory.has', itemId: condition.itemId }
        : { type: 'inventory.has', itemId: condition.itemId, quantity: condition.quantity };
    case 'relationship.min':
      return { type: 'relationship.min', characterId: condition.characterId, amount: condition.amount };
  }
}

function sameInteraction(left: PresenceInteractionDefinition, right: unknown): boolean {
  if (!isRecord(right)) {
    return false;
  }

  return (
    right.id === left.id &&
    right.presenceId === left.presenceId &&
    right.kind === left.kind &&
    right.label === left.label &&
    right.hint === left.hint &&
    isRecord(right.timeCost) &&
    right.timeCost.periods === left.timeCost.periods &&
    right.feedback === left.feedback &&
    right.resolvesPresence === left.resolvesPresence &&
    sameConditions(left.conditions, right.conditions) &&
    sameEffects(left.effects, right.effects) &&
    sameNarrative(left.narrative, right.narrative)
  );
}

function sameConditions(left: readonly GameCondition[] | undefined, right: unknown): boolean {
  if (left === undefined) {
    return right === undefined;
  }

  if (!Array.isArray(right) || right.length !== left.length) {
    return false;
  }

  return left.every((condition, index) => sameCondition(condition, right[index]));
}

function sameCondition(left: GameCondition, right: unknown): boolean {
  if (!isRecord(right) || right.type !== left.type) {
    return false;
  }

  switch (left.type) {
    case 'flag.is':
      return right.flag === left.flag && right.value === left.value;
    case 'attribute.min':
    case 'attribute.max':
      return right.attribute === left.attribute && right.amount === left.amount;
    case 'inventory.has':
      return right.itemId === left.itemId && right.quantity === left.quantity;
    case 'relationship.min':
      return right.characterId === left.characterId && right.amount === left.amount;
  }
}

function sameEffects(left: readonly GameEffect[] | undefined, right: unknown): boolean {
  if (left === undefined) {
    return right === undefined;
  }

  if (!Array.isArray(right) || right.length !== left.length) {
    return false;
  }

  return left.every((effect, index) => sameEffect(effect, right[index]));
}

function sameEffect(left: GameEffect, right: unknown): boolean {
  if (!isRecord(right) || right.type !== left.type) {
    return false;
  }

  switch (left.type) {
    case 'attribute.change':
      return right.attribute === left.attribute && right.amount === left.amount;
    case 'inventory.add':
    case 'inventory.remove':
      return right.itemId === left.itemId && right.quantity === left.quantity;
    case 'relationship.change':
      return right.characterId === left.characterId && right.amount === left.amount;
    case 'flag.set':
      return right.flag === left.flag && right.value === left.value;
    case 'world.period':
      return right.period === left.period;
    case 'progression.ability':
      return right.abilityId === left.abilityId;
    case 'progression.title':
      return right.titleId === left.titleId;
    case 'game.complete':
      return true;
  }
}

function sameNarrative(left: PresenceNarrativeReference | undefined, right: unknown): boolean {
  if (left === undefined) {
    return right === undefined;
  }

  if (!isRecord(right)) {
    return false;
  }

  return right.campaignId === left.campaignId && right.eventId === left.eventId;
}

function isInteractionKind(value: unknown): value is PresenceInteractionKind {
  return typeof value === 'string' && (PRESENCE_INTERACTION_KINDS as readonly string[]).includes(value);
}

function isMapLike(value: unknown): value is ReadonlyMap<unknown, unknown> {
  if (!isRecord(value)) {
    return false;
  }

  const candidate = value as {
    size?: unknown;
    get?: unknown;
    has?: unknown;
    entries?: unknown;
  };

  return (
    typeof candidate.size === 'number' &&
    Number.isInteger(candidate.size) &&
    candidate.size >= 0 &&
    typeof candidate.get === 'function' &&
    typeof candidate.has === 'function' &&
    typeof candidate.entries === 'function'
  );
}

function readMapEntries(map: ReadonlyMap<unknown, unknown>): PresenceInspection<readonly [unknown, unknown][]> {
  try {
    return { ok: true, value: [...map.entries()] };
  } catch {
    return fail('O catálogo de interações indexado é inválido.');
  }
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fail(reason: string): PresenceInspection<never> {
  return { ok: false, reason };
}
