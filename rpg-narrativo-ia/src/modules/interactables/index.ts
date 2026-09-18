import { evaluateConditions, type GameCondition, type GameEffect, type ImageReference } from '../../core/events';
import { isAttributeId, isDayPeriod, type GameState } from '../../core/state/types';
import type { ExplorationState, IndexedExploration } from '../exploration';
import type { IndexedMap } from '../navigation';
import { INITIAL_ITEMS, type IndexedItems } from '../items';
import { isSkillKnown } from '../skills';
import { InteractableError } from './errors';
import { ImmutableIndex } from './immutable-index';
import type {
  InteractableActionDefinition,
  InteractableActionPlan,
  InteractableDefinition,
  InteractableEffect,
  InteractableFactDefinition,
  InteractableInspectionResult,
  InteractableObjectState,
  InteractableRequirement,
  InteractableStageDefinition,
  InteractableSynchronizationResult,
  InteractablesState,
  IndexedInteractables,
  KnownInteractable,
  KnownInteractableAction,
} from './types';

export { InteractableError } from './errors';
export { INITIAL_INTERACTABLE_CATALOG } from './initial-interactables';
export type {
  InteractableActionDefinition,
  InteractableActionPlan,
  InteractableCatalog,
  InteractableDefinition,
  InteractableEffect,
  InteractableFactDefinition,
  InteractableInspectionResult,
  InteractableObjectState,
  InteractableRequirement,
  InteractableStageDefinition,
  InteractableSynchronizationResult,
  InteractablesState,
  IndexedInteractables,
  KnownInteractable,
  KnownInteractableAction,
} from './types';

const IMAGE_KINDS = ['scene', 'portrait', 'icon'] as const;
const UNAVAILABLE_REASON = 'O ponto de interesse não está disponível.';

export function inspectInteractableCatalog(
  value: unknown,
  map: IndexedMap,
  exploration: IndexedExploration,
  items: IndexedItems = INITIAL_ITEMS,
): InteractableInspectionResult<IndexedInteractables> {
  if (!isRecord(value) || !Array.isArray(value.interactables) || !Array.isArray(value.actions)) {
    return fail('O catálogo de pontos de interesse é inválido.');
  }

  const interactables: InteractableDefinition[] = [];
  const byId = new Map<string, InteractableDefinition>();
  for (const entry of value.interactables) {
    const inspected = inspectDefinition(entry, byId, map, exploration);
    if (!inspected.ok) {
      return inspected;
    }
    const frozen = freezeDefinition(inspected.value);
    byId.set(frozen.id, frozen);
    interactables.push(frozen);
  }

  const actions: InteractableActionDefinition[] = [];
  const actionById = new Map<string, InteractableActionDefinition>();
  for (const entry of value.actions) {
    const inspected = inspectAction(entry, byId, actionById, map, items);
    if (!inspected.ok) {
      return inspected;
    }
    const frozen = freezeAction(inspected.value);
    actionById.set(frozen.id, frozen);
    actions.push(frozen);
  }

  return { ok: true, value: freezeCatalog(interactables, actions) };
}

export function indexInteractableCatalog(
  value: unknown,
  map: IndexedMap,
  exploration: IndexedExploration,
  items: IndexedItems = INITIAL_ITEMS,
): IndexedInteractables {
  const inspected = inspectInteractableCatalog(value, map, exploration, items);
  if (!inspected.ok) {
    throw new InteractableError(inspected.reason);
  }
  return inspected.value;
}

export function createInitialInteractablesState(): InteractablesState {
  return { objects: [] };
}

export function inspectInteractablesState(
  value: unknown,
  catalog: IndexedInteractables,
): InteractableInspectionResult<InteractablesState> {
  if (!isRecord(value) || !Array.isArray(value.objects)) {
    return fail('O estado de pontos de interesse é inválido.');
  }

  const objects: InteractableObjectState[] = [];
  const seen = new Set<string>();
  for (const entry of value.objects) {
    const inspected = inspectObjectState(entry, catalog, seen);
    if (!inspected.ok) {
      return inspected;
    }
    seen.add(inspected.value.interactableId);
    objects.push(inspected.value);
  }
  return { ok: true, value: { objects } };
}

export function copyInteractablesState(state: InteractablesState): InteractablesState {
  return {
    objects: state.objects.map((entry) => ({
      interactableId: entry.interactableId,
      stageId: entry.stageId,
      consumedActionIds: [...entry.consumedActionIds],
      revealedFactIds: [...entry.revealedFactIds],
    })),
  };
}

export function synchronizeDiscoveredInteractables(
  catalog: IndexedInteractables,
  state: InteractablesState,
  exploration: ExplorationState,
): InteractableSynchronizationResult {
  const previous = copyInteractablesState(state);
  const known = new Set(previous.objects.map((entry) => entry.interactableId));
  const revealed = revealedDiscoveries(exploration);
  const newlyDiscoveredIds: string[] = [];
  const objects = [...previous.objects];

  for (const definition of catalog.interactables) {
    if (known.has(definition.id)) {
      continue;
    }
    if (!revealed.has(definition.discoveryId)) {
      continue;
    }
    newlyDiscoveredIds.push(definition.id);
    objects.push({
      interactableId: definition.id,
      stageId: definition.initialStageId,
      consumedActionIds: [],
      revealedFactIds: [],
    });
  }

  return {
    previous,
    current: { objects },
    newlyDiscoveredIds,
  };
}

export function listKnownInteractablesAtLocation(
  catalog: IndexedInteractables,
  state: InteractablesState,
  locationId: string,
  gameState: GameState,
): KnownInteractable[] {
  if (typeof locationId !== 'string' || locationId.trim() === '') {
    throw new InteractableError(UNAVAILABLE_REASON);
  }

  const ids = catalog.idsByLocation.get(locationId) ?? [];
  const byId = new Map(state.objects.map((entry) => [entry.interactableId, entry]));
  const known: KnownInteractable[] = [];

  for (const id of ids) {
    const objectState = byId.get(id);
    const definition = catalog.byId.get(id);
    if (!objectState || !definition) {
      continue;
    }
    const stage = definition.stages.find((entry) => entry.id === objectState.stageId);
    if (!stage) {
      throw new InteractableError('O estágio do ponto de interesse é inválido.');
    }
    known.push({
      definition: copyDefinition(definition),
      stage: { ...stage },
      revealedFacts: definition.facts
        .filter((fact) => objectState.revealedFactIds.includes(fact.id))
        .map((fact) => ({ ...fact })),
      actions: listActionsFor(catalog, definition, objectState, gameState),
    });
  }

  return known;
}

export function planInteractableAction(
  catalog: IndexedInteractables,
  state: InteractablesState,
  interactableId: string,
  actionId: string,
  locationId: string,
  gameState: GameState,
): InteractableActionPlan {
  const objectState = requireDiscovered(state, interactableId);
  const definition = catalog.byId.get(interactableId);
  const action = catalog.actionById.get(actionId);
  if (!definition || !action || action.interactableId !== interactableId || definition.locationId !== locationId) {
    throw new InteractableError(UNAVAILABLE_REASON);
  }
  if (objectState.stageId !== action.stageId) {
    throw new InteractableError(UNAVAILABLE_REASON);
  }
  if (action.once && objectState.consumedActionIds.includes(action.id)) {
    throw new InteractableError('Esta ação já foi usada.');
  }
  const blocked = requirementBlock(action, gameState);
  if (blocked) {
    throw new InteractableError(blocked);
  }

  return {
    actionId: action.id,
    interactableId: action.interactableId,
    timeCost: { periods: action.timeCost.periods },
    effects: action.effects.map(copyEffect),
    feedback: action.feedback,
  };
}

export function applyInteractablePlan(
  catalog: IndexedInteractables,
  state: InteractablesState,
  plan: InteractableActionPlan,
): InteractablesState {
  const current = copyInteractablesState(state);
  const objectState = current.objects.find((entry) => entry.interactableId === plan.interactableId);
  const definition = catalog.byId.get(plan.interactableId);
  const action = catalog.actionById.get(plan.actionId);
  if (!objectState || !definition || !action) {
    throw new InteractableError(UNAVAILABLE_REASON);
  }

  for (const effect of plan.effects) {
    if (effect.type === 'interactable.setStage') {
      if (!definition.stages.some((stage) => stage.id === effect.stageId)) {
        throw new InteractableError('O estágio do ponto de interesse é inválido.');
      }
      objectState.stageId = effect.stageId;
    }
    if (effect.type === 'interactable.revealFact') {
      if (!definition.facts.some((fact) => fact.id === effect.factId)) {
        throw new InteractableError('O fato do ponto de interesse é inválido.');
      }
      if (!objectState.revealedFactIds.includes(effect.factId)) {
        objectState.revealedFactIds.push(effect.factId);
      }
    }
  }

  if (action.once && !objectState.consumedActionIds.includes(action.id)) {
    objectState.consumedActionIds.push(action.id);
  }

  return current;
}

export function hasRevealedInteractableFact(
  state: InteractablesState,
  interactableId: string,
  factId: string,
): boolean {
  return (
    state.objects.find((entry) => entry.interactableId === interactableId)?.revealedFactIds.includes(factId) ?? false
  );
}

function listActionsFor(
  catalog: IndexedInteractables,
  definition: InteractableDefinition,
  objectState: InteractableObjectState,
  gameState: GameState,
): KnownInteractableAction[] {
  return catalog.actions
    .filter((action) => action.interactableId === definition.id)
    .map((action) => {
      const copied = freezeAction(action);
      if (action.stageId !== objectState.stageId) {
        return { action: copied, available: false, blockedReason: UNAVAILABLE_REASON };
      }
      if (action.once && objectState.consumedActionIds.includes(action.id)) {
        return { action: copied, available: false, blockedReason: 'Esta ação já foi usada.' };
      }
      const blocked = requirementBlock(action, gameState);
      if (blocked) {
        return { action: copied, available: false, blockedReason: blocked };
      }
      return { action: copied, available: true };
    });
}

function requirementBlock(action: InteractableActionDefinition, gameState: GameState): string | undefined {
  if (!action.requirements || action.requirements.length === 0) {
    return undefined;
  }
  for (const requirement of action.requirements) {
    if (requirement.type === 'skill.known') {
      if (!isSkillKnown(gameState.system, requirement.skillId)) {
        return 'Os requisitos desta ação não foram atendidos.';
      }
      continue;
    }
    if (requirement.type === 'period.is') {
      if (gameState.world.period !== requirement.period) {
        return 'Os requisitos desta ação não foram atendidos.';
      }
      continue;
    }
    if (!evaluateConditions([requirement], gameState)) {
      return 'Os requisitos desta ação não foram atendidos.';
    }
  }
  return undefined;
}

function inspectDefinition(
  value: unknown,
  byId: ReadonlyMap<string, InteractableDefinition>,
  map: IndexedMap,
  exploration: IndexedExploration,
): InteractableInspectionResult<InteractableDefinition> {
  if (!isRecord(value)) {
    return fail('O catálogo de pontos de interesse é inválido.');
  }
  if (!nonEmpty(value.id) || byId.has(value.id)) {
    return fail('O identificador do ponto de interesse é inválido.');
  }
  if (!nonEmpty(value.locationId) || !map.locations.has(value.locationId)) {
    return fail(`A localização do ponto de interesse ${value.id} não existe.`);
  }
  if (!nonEmpty(value.discoveryId) || !exploration.byDiscovery.has(value.discoveryId)) {
    return fail(`A descoberta do ponto de interesse ${value.id} não existe nas definições de exploração.`);
  }
  if (exploration.locationByDiscovery.get(value.discoveryId) !== value.locationId) {
    return fail(`O ponto de interesse ${value.id} e a descoberta pertencem a locais diferentes.`);
  }
  if (!nonEmpty(value.name) || !nonEmpty(value.description) || !nonEmpty(value.initialStageId)) {
    return fail(`O ponto de interesse ${value.id} é inválido.`);
  }
  if (!Array.isArray(value.stages) || value.stages.length === 0 || !Array.isArray(value.facts)) {
    return fail(`O ponto de interesse ${value.id} é inválido.`);
  }

  const stages: InteractableStageDefinition[] = [];
  const stageIds = new Set<string>();
  for (const stage of value.stages) {
    if (!isRecord(stage) || !nonEmpty(stage.id) || stageIds.has(stage.id) || !nonEmpty(stage.name) || !nonEmpty(stage.description)) {
      return fail(`O estágio do ponto de interesse ${value.id} é inválido.`);
    }
    stageIds.add(stage.id);
    stages.push({ id: stage.id, name: stage.name, description: stage.description });
  }
  if (!stageIds.has(value.initialStageId)) {
    return fail(`O estágio inicial do ponto de interesse ${value.id} é inválido.`);
  }

  const facts: InteractableFactDefinition[] = [];
  const factIds = new Set<string>();
  for (const fact of value.facts) {
    if (!isRecord(fact) || !nonEmpty(fact.id) || factIds.has(fact.id) || !nonEmpty(fact.text)) {
      return fail(`O fato do ponto de interesse ${value.id} é inválido.`);
    }
    factIds.add(fact.id);
    facts.push({ id: fact.id, text: fact.text });
  }

  const image = inspectOptionalImage(value.image, `O ponto de interesse ${value.id} possui imagem malformada.`);
  if (!image.ok) {
    return image;
  }

  return {
    ok: true,
    value: {
      id: value.id,
      locationId: value.locationId,
      discoveryId: value.discoveryId,
      name: value.name,
      description: value.description,
      initialStageId: value.initialStageId,
      stages,
      facts,
      image: image.value,
    },
  };
}

function inspectAction(
  value: unknown,
  interactables: ReadonlyMap<string, InteractableDefinition>,
  actionById: ReadonlyMap<string, InteractableActionDefinition>,
  map: IndexedMap,
  items: IndexedItems,
): InteractableInspectionResult<InteractableActionDefinition> {
  if (!isRecord(value) || !nonEmpty(value.id) || actionById.has(value.id)) {
    return fail('A ação do ponto de interesse é inválida.');
  }
  const definition = nonEmpty(value.interactableId) ? interactables.get(value.interactableId) : undefined;
  if (!definition) {
    return fail(`A ação ${value.id} referencia um ponto de interesse inexistente.`);
  }
  if (!nonEmpty(value.stageId) || !definition.stages.some((stage) => stage.id === value.stageId)) {
    return fail(`A ação ${value.id} referencia um estágio inexistente.`);
  }
  if (!nonEmpty(value.label)) {
    return fail(`O rótulo da ação ${value.id} é inválido.`);
  }
  if (value.hint !== undefined && !nonEmpty(value.hint)) {
    return fail(`A dica da ação ${value.id} é inválida.`);
  }
  if (value.feedback !== undefined && !nonEmpty(value.feedback)) {
    return fail(`O retorno da ação ${value.id} é inválido.`);
  }
  if (value.once !== undefined && typeof value.once !== 'boolean') {
    return fail(`A ação ${value.id} possui consumo inválido.`);
  }
  if (!isRecord(value.timeCost) || !positiveSafeInteger(value.timeCost.periods)) {
    return fail(`O custo temporal da ação ${value.id} é inválido.`);
  }
  const requirements = inspectRequirements(value.requirements, value.id, items);
  if (!requirements.ok) {
    return requirements;
  }
  const effects = inspectEffects(value.effects, definition, map, value.id, items);
  if (!effects.ok) {
    return effects;
  }
  return {
    ok: true,
    value: {
      id: value.id,
      interactableId: definition.id,
      stageId: value.stageId,
      label: value.label,
      hint: value.hint,
      timeCost: { periods: value.timeCost.periods },
      once: value.once,
      requirements: requirements.value,
      effects: effects.value,
      feedback: value.feedback,
    },
  };
}

function inspectRequirements(
  value: unknown,
  actionId: string,
  items: IndexedItems,
): InteractableInspectionResult<InteractableRequirement[] | undefined> {
  if (value === undefined) {
    return { ok: true, value: undefined };
  }
  if (!Array.isArray(value)) {
    return fail(`Os requisitos da ação ${actionId} são inválidos.`);
  }
  const requirements: InteractableRequirement[] = [];
  for (const entry of value) {
    const inspected = inspectRequirement(entry, actionId, items);
    if (!inspected.ok) {
      return inspected;
    }
    requirements.push(inspected.value);
  }
  return { ok: true, value: requirements };
}

function inspectRequirement(
  value: unknown,
  actionId: string,
  items: IndexedItems,
): InteractableInspectionResult<InteractableRequirement> {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return fail(`Os requisitos da ação ${actionId} são inválidos.`);
  }
  if (value.type === 'skill.known') {
    if (!nonEmpty(value.skillId)) {
      return fail(`Os requisitos da ação ${actionId} são inválidos.`);
    }
    return { ok: true, value: { type: 'skill.known', skillId: value.skillId } };
  }
  if (value.type === 'period.is') {
    if (!isDayPeriod(value.period)) {
      return fail(`Os requisitos da ação ${actionId} são inválidos.`);
    }
    return { ok: true, value: { type: 'period.is', period: value.period } };
  }
  return inspectGameCondition(value, `Os requisitos da ação ${actionId} são inválidos.`, items);
}

function inspectEffects(
  value: unknown,
  definition: InteractableDefinition,
  map: IndexedMap,
  actionId: string,
  items: IndexedItems,
): InteractableInspectionResult<InteractableEffect[]> {
  if (!Array.isArray(value) || value.length === 0) {
    return fail(`Os efeitos da ação ${actionId} são inválidos.`);
  }
  const effects: InteractableEffect[] = [];
  for (const entry of value) {
    const inspected = inspectEffect(entry, definition, map, actionId, items);
    if (!inspected.ok) {
      return inspected;
    }
    effects.push(inspected.value);
  }
  return { ok: true, value: effects };
}

function inspectEffect(
  value: unknown,
  definition: InteractableDefinition,
  map: IndexedMap,
  actionId: string,
  items: IndexedItems,
): InteractableInspectionResult<InteractableEffect> {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return fail(`Os efeitos da ação ${actionId} são inválidos.`);
  }
  if (value.type === 'interactable.setStage') {
    if (!nonEmpty(value.stageId) || !definition.stages.some((stage) => stage.id === value.stageId)) {
      return fail(`A ação ${actionId} altera um estágio inexistente.`);
    }
    return { ok: true, value: { type: 'interactable.setStage', stageId: value.stageId } };
  }
  if (value.type === 'interactable.revealFact') {
    if (!nonEmpty(value.factId) || !definition.facts.some((fact) => fact.id === value.factId)) {
      return fail(`A ação ${actionId} revela um fato inexistente.`);
    }
    return { ok: true, value: { type: 'interactable.revealFact', factId: value.factId } };
  }
  if (value.type === 'navigation.unlock' || value.type === 'navigation.discover') {
    if (!nonEmpty(value.locationId) || !map.locations.has(value.locationId)) {
      return fail(`A ação ${actionId} referencia uma passagem inexistente.`);
    }
    return { ok: true, value: { type: value.type, locationId: value.locationId } };
  }
  return inspectGameEffect(value, `Os efeitos da ação ${actionId} são inválidos.`, items);
}

function inspectGameCondition(
  value: Record<string, unknown>,
  reason: string,
  items: IndexedItems,
): InteractableInspectionResult<GameCondition> {
  switch (value.type) {
    case 'flag.is':
      if (!nonEmpty(value.flag) || typeof value.value !== 'boolean') {
        return fail(reason);
      }
      return { ok: true, value: { type: 'flag.is', flag: value.flag, value: value.value } };
    case 'attribute.min':
    case 'attribute.max':
      if (!isAttributeId(value.attribute) || typeof value.amount !== 'number' || !Number.isFinite(value.amount)) {
        return fail(reason);
      }
      return { ok: true, value: { type: value.type, attribute: value.attribute, amount: value.amount } };
    case 'inventory.has':
      if (
        !nonEmpty(value.itemId) ||
        !items.byId.has(value.itemId) ||
        (value.quantity !== undefined && !positiveSafeInteger(value.quantity))
      ) {
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
      if (!nonEmpty(value.characterId) || typeof value.amount !== 'number' || !Number.isFinite(value.amount)) {
        return fail(reason);
      }
      return { ok: true, value: { type: 'relationship.min', characterId: value.characterId, amount: value.amount } };
    default:
      return fail(reason);
  }
}

function inspectGameEffect(
  value: Record<string, unknown>,
  reason: string,
  items: IndexedItems,
): InteractableInspectionResult<GameEffect> {
  switch (value.type) {
    case 'flag.set':
      if (!nonEmpty(value.flag) || typeof value.value !== 'boolean') {
        return fail(reason);
      }
      return { ok: true, value: { type: 'flag.set', flag: value.flag, value: value.value } };
    case 'inventory.add':
    case 'inventory.remove':
      if (!nonEmpty(value.itemId) || !items.byId.has(value.itemId) || !positiveSafeInteger(value.quantity)) {
        return fail(reason);
      }
      return { ok: true, value: { type: value.type, itemId: value.itemId, quantity: value.quantity } };
    default:
      return fail(reason);
  }
}

function inspectObjectState(
  value: unknown,
  catalog: IndexedInteractables,
  seen: ReadonlySet<string>,
): InteractableInspectionResult<InteractableObjectState> {
  if (!isRecord(value) || !nonEmpty(value.interactableId) || seen.has(value.interactableId)) {
    return fail('O estado de pontos de interesse é inválido.');
  }
  const definition = catalog.byId.get(value.interactableId);
  if (!definition) {
    return fail('O save referencia um ponto de interesse inexistente.');
  }
  if (!nonEmpty(value.stageId) || !definition.stages.some((stage) => stage.id === value.stageId)) {
    return fail('O estágio do ponto de interesse é inválido.');
  }
  const consumed = inspectIdList(value.consumedActionIds, (id) => catalog.actionById.get(id)?.interactableId === definition.id);
  if (!consumed.ok) {
    return consumed;
  }
  const facts = inspectIdList(value.revealedFactIds, (id) => definition.facts.some((fact) => fact.id === id));
  if (!facts.ok) {
    return facts;
  }
  return {
    ok: true,
    value: {
      interactableId: definition.id,
      stageId: value.stageId,
      consumedActionIds: consumed.value,
      revealedFactIds: facts.value,
    },
  };
}

function inspectIdList(
  value: unknown,
  exists: (id: string) => boolean,
): InteractableInspectionResult<string[]> {
  if (!Array.isArray(value)) {
    return fail('O estado de pontos de interesse é inválido.');
  }
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (!nonEmpty(entry) || seen.has(entry) || !exists(entry)) {
      return fail('O estado de pontos de interesse é inválido.');
    }
    seen.add(entry);
    ids.push(entry);
  }
  return { ok: true, value: ids };
}

function inspectOptionalImage(
  value: unknown,
  reason: string,
): InteractableInspectionResult<ImageReference | undefined> {
  if (value === undefined) {
    return { ok: true, value: undefined };
  }
  if (!isRecord(value) || !isImageKind(value.kind) || !nonEmpty(value.label)) {
    return fail(reason);
  }
  return { ok: true, value: { kind: value.kind, label: value.label } };
}

function freezeCatalog(
  interactables: readonly InteractableDefinition[],
  actions: readonly InteractableActionDefinition[],
): IndexedInteractables {
  const idsByLocation = new Map<string, string[]>();
  for (const definition of interactables) {
    const linked = idsByLocation.get(definition.locationId) ?? [];
    linked.push(definition.id);
    idsByLocation.set(definition.locationId, linked);
  }
  return Object.freeze({
    interactables: Object.freeze(interactables.map(freezeDefinition)),
    actions: Object.freeze(actions.map(freezeAction)),
    byId: new ImmutableIndex(interactables.map((definition) => [definition.id, freezeDefinition(definition)] as const)),
    actionById: new ImmutableIndex(actions.map((action) => [action.id, freezeAction(action)] as const)),
    idsByLocation: new ImmutableIndex(
      [...idsByLocation].map(([locationId, ids]) => [locationId, Object.freeze([...ids])] as const),
    ),
  });
}

function freezeDefinition(definition: InteractableDefinition): InteractableDefinition {
  return Object.freeze({
    ...copyDefinition(definition),
    stages: Object.freeze(definition.stages.map((stage) => Object.freeze({ ...stage }))),
    facts: Object.freeze(definition.facts.map((fact) => Object.freeze({ ...fact }))),
    image: definition.image ? Object.freeze({ ...definition.image }) : undefined,
  });
}

function freezeAction(action: InteractableActionDefinition): InteractableActionDefinition {
  return Object.freeze({
    ...action,
    timeCost: Object.freeze({ periods: action.timeCost.periods }),
    requirements: action.requirements
      ? Object.freeze(action.requirements.map((requirement) => Object.freeze({ ...requirement })))
      : undefined,
    effects: Object.freeze(action.effects.map((effect) => Object.freeze(copyEffect(effect)))),
  });
}

function copyDefinition(definition: InteractableDefinition): InteractableDefinition {
  return {
    id: definition.id,
    locationId: definition.locationId,
    discoveryId: definition.discoveryId,
    name: definition.name,
    description: definition.description,
    initialStageId: definition.initialStageId,
    stages: definition.stages.map((stage) => ({ ...stage })),
    facts: definition.facts.map((fact) => ({ ...fact })),
    image: definition.image ? { ...definition.image } : undefined,
  };
}

function copyEffect(effect: InteractableEffect): InteractableEffect {
  return { ...effect };
}

function requireDiscovered(state: InteractablesState, interactableId: string): InteractableObjectState {
  const objectState = state.objects.find((entry) => entry.interactableId === interactableId);
  if (!objectState) {
    throw new InteractableError(UNAVAILABLE_REASON);
  }
  return objectState;
}

function revealedDiscoveries(state: ExplorationState): Set<string> {
  const revealed = new Set<string>();
  for (const location of state.locations) {
    for (const discoveryId of location.revealedDiscoveryIds) {
      revealed.add(discoveryId);
    }
  }
  return revealed;
}

function isImageKind(value: unknown): value is ImageReference['kind'] {
  return typeof value === 'string' && (IMAGE_KINDS as readonly string[]).includes(value);
}

function positiveSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 && value <= Number.MAX_SAFE_INTEGER;
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fail(reason: string): InteractableInspectionResult<never> {
  return { ok: false, reason };
}
