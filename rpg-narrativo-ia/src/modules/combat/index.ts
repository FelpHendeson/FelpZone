import { INITIAL_SKILLS, hasSkill, type IndexedSkills } from '../skills';
import { INITIAL_CONDITIONS } from '../conditions';
import { INITIAL_ITEMS, type IndexedItems } from '../items';
import { CombatError } from './errors';
import { ImmutableIndex } from './immutable-index';
import { INITIAL_COMBAT_CATALOG } from './initial-combat';
import {
  COMBAT_EFFECT_TYPES,
  COMBAT_TARGETS,
  type CombatActionDefinition,
  type CombatantTemplate,
  type CombatEffect,
  type CombatInspection,
  type EncounterDefinition,
  type IndexedCombat,
} from './types';

export { CombatError } from './errors';
export {
  chooseOpponentAction,
  createCombat,
  emptyCombatLoadout,
  listPlayerActions,
  resolveTurn,
  type CreateCombatOptions,
} from './engine';
export {
  buildCombatResolution,
  combatEncounterResolvedFlag,
  combatResolutionEffects,
  listAvailableEncounters,
  terminalHealthFor,
  validateEncounterDiscoveries,
  verifyCombatResolution,
  type VerifyCombatResolutionOptions,
} from './integration';

export const INITIAL_COMBAT = indexCombatCatalog(INITIAL_COMBAT_CATALOG, INITIAL_SKILLS, INITIAL_ITEMS);

export function inspectCombatCatalog(
  value: unknown,
  skills: IndexedSkills,
  items: IndexedItems = INITIAL_ITEMS,
): CombatInspection<IndexedCombat> {
  if (
    !isRecord(value) ||
    !Array.isArray(value.actions) ||
    !Array.isArray(value.combatants) ||
    !Array.isArray(value.encounters)
  ) {
    return fail('O catálogo de combate é inválido.');
  }

  const actions: CombatActionDefinition[] = [];
  const actionIds = new Set<string>();
  for (const entry of value.actions) {
    const inspected = inspectAction(entry, actionIds, skills);
    if (!inspected.ok) {
      return inspected;
    }
    actionIds.add(inspected.value.id);
    actions.push(inspected.value);
  }

  const combatants: CombatantTemplate[] = [];
  const combatantIds = new Set<string>();
  for (const entry of value.combatants) {
    const inspected = inspectCombatant(entry, combatantIds, actionIds);
    if (!inspected.ok) {
      return inspected;
    }
    combatantIds.add(inspected.value.id);
    combatants.push(inspected.value);
  }

  const encounters: EncounterDefinition[] = [];
  const encounterIds = new Set<string>();
  for (const entry of value.encounters) {
    const inspected = inspectEncounter(entry, encounterIds, combatantIds, items);
    if (!inspected.ok) {
      return inspected;
    }
    encounterIds.add(inspected.value.id);
    encounters.push(inspected.value);
  }

  return { ok: true, value: freezeCatalog(actions, combatants, encounters) };
}

export function indexCombatCatalog(
  value: unknown,
  skills: IndexedSkills,
  items: IndexedItems = INITIAL_ITEMS,
): IndexedCombat {
  const inspected = inspectCombatCatalog(value, skills, items);
  if (!inspected.ok) {
    throw new CombatError(inspected.reason);
  }
  return inspected.value;
}

export function getCombatAction(catalog: IndexedCombat, actionId: string): CombatActionDefinition {
  const action = requireIndexed(catalog).actionById.get(actionId);
  if (!action) {
    throw new CombatError('A ação de combate não existe.');
  }
  return copyAction(action);
}

export function getCombatant(catalog: IndexedCombat, combatantId: string): CombatantTemplate {
  const combatant = requireIndexed(catalog).combatantById.get(combatantId);
  if (!combatant) {
    throw new CombatError('O combatente não existe.');
  }
  return copyCombatant(combatant);
}

export function getEncounter(catalog: IndexedCombat, encounterId: string): EncounterDefinition {
  const encounter = requireIndexed(catalog).encounterById.get(encounterId);
  if (!encounter) {
    throw new CombatError('O encontro não existe.');
  }
  return copyEncounter(encounter);
}

export function listEncountersByLocation(catalog: IndexedCombat, locationId: string): EncounterDefinition[] {
  return requireIndexed(catalog)
    .encounters.filter((encounter) => encounter.locationId === locationId)
    .map(copyEncounter);
}

function copyEncounter(encounter: EncounterDefinition): EncounterDefinition {
  return {
    ...encounter,
    timeCost: { ...encounter.timeCost },
    requiredDiscoveryIds: [...encounter.requiredDiscoveryIds],
    ...(encounter.reward ? { reward: { ...encounter.reward } } : {}),
  };
}

function inspectAction(
  value: unknown,
  existing: ReadonlySet<string>,
  skills: IndexedSkills,
): CombatInspection<CombatActionDefinition> {
  if (!isRecord(value) || !nonEmpty(value.id) || !nonEmpty(value.name) || !nonEmpty(value.description)) {
    return fail('A ação de combate é inválida.');
  }
  if (existing.has(value.id)) {
    return fail('Os IDs de ação de combate precisam ser únicos.');
  }
  if (!positiveSafeInteger(value.speed)) {
    return fail('A velocidade da ação de combate é inválida.');
  }
  if (!includes(COMBAT_TARGETS, value.target)) {
    return fail('O alvo da ação de combate é inválido.');
  }
  if (!Array.isArray(value.effects) || value.effects.length === 0) {
    return fail('A ação de combate precisa declarar ao menos um efeito.');
  }
  const effects: CombatEffect[] = [];
  for (const entry of value.effects) {
    const inspected = inspectEffect(entry);
    if (!inspected.ok) {
      return inspected;
    }
    effects.push(inspected.value);
  }
  if (value.skillId !== undefined && (!nonEmpty(value.skillId) || !hasSkill(skills, value.skillId))) {
    return fail('A ação de combate referencia uma habilidade inexistente.');
  }
  if (value.elementId !== undefined && (!nonEmpty(value.elementId) || !INITIAL_CONDITIONS.elementById.has(value.elementId))) {
    return fail('A ação de combate referencia um elemento inexistente.');
  }

  return {
    ok: true,
    value: {
      id: value.id,
      name: value.name,
      description: value.description,
      speed: value.speed,
      target: value.target,
      effects,
      ...(value.skillId === undefined ? {} : { skillId: value.skillId }),
      ...(nonEmpty(value.elementId) ? { elementId: value.elementId } : {}),
    },
  };
}

function inspectEffect(value: unknown): CombatInspection<CombatEffect> {
  if (!isRecord(value) || !includes(COMBAT_EFFECT_TYPES, value.type)) {
    return fail('O efeito da ação de combate é inválido.');
  }
  if (value.type === 'condition.apply') {
    if (
      !nonEmpty(value.conditionId) ||
      !INITIAL_CONDITIONS.conditionById.has(value.conditionId) ||
      !positiveSafeInteger(value.duration) ||
      !positiveSafeInteger(value.potency)
    ) {
      return fail('A aplicação de condição é inválida.');
    }
    return { ok: true, value: { type: 'condition.apply', conditionId: value.conditionId, duration: value.duration, potency: value.potency } };
  }
  if (value.type === 'condition.cleanse') {
    if (!positiveSafeInteger(value.count)) {
      return fail('A limpeza de condição é inválida.');
    }
    return {
      ok: true,
      value: {
        type: 'condition.cleanse',
        count: value.count,
        ...(nonEmpty(value.conditionId) ? { conditionId: value.conditionId } : {}),
      },
    };
  }
  if (!positiveSafeInteger(value.amount)) {
    return fail('O efeito da ação de combate é inválido.');
  }
  return { ok: true, value: { type: value.type, amount: value.amount } };
}

function inspectCombatant(
  value: unknown,
  existing: ReadonlySet<string>,
  actionIds: ReadonlySet<string>,
): CombatInspection<CombatantTemplate> {
  if (!isRecord(value) || !nonEmpty(value.id) || !nonEmpty(value.name)) {
    return fail('O combatente é inválido.');
  }
  if (existing.has(value.id)) {
    return fail('Os IDs de combatente precisam ser únicos.');
  }
  if (!positiveSafeInteger(value.maxHealth)) {
    return fail('A vida máxima do combatente é inválida.');
  }
  if (!Array.isArray(value.actionIds) || value.actionIds.length === 0) {
    return fail('O combatente precisa declarar ao menos uma ação.');
  }
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const id of value.actionIds) {
    if (!nonEmpty(id) || seen.has(id) || !actionIds.has(id)) {
      return fail('O combatente referencia uma ação inexistente ou repetida.');
    }
    seen.add(id);
    ids.push(id);
  }

  if (value.defenseElementId !== undefined && (!nonEmpty(value.defenseElementId) || !INITIAL_CONDITIONS.elementById.has(value.defenseElementId))) {
    return fail('O combatente referencia um elemento de defesa inexistente.');
  }

  return {
    ok: true,
    value: {
      id: value.id,
      name: value.name,
      maxHealth: value.maxHealth,
      actionIds: ids,
      ...(value.defenseElementId ? { defenseElementId: value.defenseElementId } : {}),
    },
  };
}

function inspectEncounter(
  value: unknown,
  existing: ReadonlySet<string>,
  combatantIds: ReadonlySet<string>,
  items: IndexedItems,
): CombatInspection<EncounterDefinition> {
  if (
    !isRecord(value) ||
    !nonEmpty(value.id) ||
    !nonEmpty(value.locationId) ||
    !nonEmpty(value.name) ||
    !nonEmpty(value.description)
  ) {
    return fail('O encontro é inválido.');
  }
  if (existing.has(value.id)) {
    return fail('Os IDs de encontro precisam ser únicos.');
  }
  if (!nonEmpty(value.opponentId) || !combatantIds.has(value.opponentId)) {
    return fail('O encontro referencia um combatente inexistente.');
  }
  if (!isRecord(value.timeCost) || !positiveSafeInteger(value.timeCost.periods)) {
    return fail('O custo temporal do encontro é inválido.');
  }
  const requirements = inspectRequiredDiscoveries(value.requiredDiscoveryIds);
  if (!requirements.ok) {
    return requirements;
  }
  const reward = inspectReward(value.reward, items);
  if (!reward.ok) {
    return reward;
  }

  return {
    ok: true,
    value: {
      id: value.id,
      locationId: value.locationId,
      opponentId: value.opponentId,
      name: value.name,
      description: value.description,
      timeCost: { periods: value.timeCost.periods },
      requiredDiscoveryIds: requirements.value,
      ...(reward.value ? { reward: reward.value } : {}),
    },
  };
}

function inspectReward(
  value: unknown,
  items: IndexedItems,
): CombatInspection<{ itemId: string; quantity: number } | undefined> {
  if (value === undefined) {
    return { ok: true, value: undefined };
  }
  if (!isRecord(value) || !nonEmpty(value.itemId) || !positiveSafeInteger(value.quantity)) {
    return fail('A recompensa do encontro é inválida.');
  }
  const item = items.byId.get(value.itemId);
  if (!item || value.quantity > item.stackLimit) {
    return fail('A recompensa do encontro referencia um item inexistente ou excede seu limite de pilha.');
  }
  return { ok: true, value: { itemId: value.itemId, quantity: value.quantity } };
}

function inspectRequiredDiscoveries(value: unknown): CombatInspection<string[]> {
  if (value === undefined) {
    return { ok: true, value: [] };
  }
  if (!Array.isArray(value)) {
    return fail('Os requisitos de descoberta do encontro são inválidos.');
  }
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const entry of value) {
    if (!nonEmpty(entry) || seen.has(entry)) {
      return fail('Os requisitos de descoberta do encontro são inválidos.');
    }
    seen.add(entry);
    ids.push(entry);
  }
  return { ok: true, value: ids };
}

function freezeCatalog(
  actions: CombatActionDefinition[],
  combatants: CombatantTemplate[],
  encounters: EncounterDefinition[],
): IndexedCombat {
  const frozenActions = Object.freeze(actions.map(freezeAction));
  const frozenCombatants = Object.freeze(
    combatants.map((combatant) =>
      Object.freeze({ ...combatant, actionIds: Object.freeze([...combatant.actionIds]) as unknown as string[] }),
    ),
  );
  const frozenEncounters = Object.freeze(
    encounters.map((encounter) =>
      Object.freeze({
        ...encounter,
        timeCost: Object.freeze({ ...encounter.timeCost }),
        requiredDiscoveryIds: Object.freeze([...encounter.requiredDiscoveryIds]) as unknown as string[],
        ...(encounter.reward ? { reward: Object.freeze({ ...encounter.reward }) } : {}),
      }),
    ),
  );

  return Object.freeze({
    actions: frozenActions,
    combatants: frozenCombatants,
    encounters: frozenEncounters,
    actionById: new ImmutableIndex(frozenActions.map((action) => [action.id, action] as const)),
    combatantById: new ImmutableIndex(frozenCombatants.map((combatant) => [combatant.id, combatant] as const)),
    encounterById: new ImmutableIndex(frozenEncounters.map((encounter) => [encounter.id, encounter] as const)),
  });
}

function freezeAction(action: CombatActionDefinition): CombatActionDefinition {
  return Object.freeze({
    ...action,
    effects: Object.freeze(action.effects.map((effect) => Object.freeze({ ...effect }))) as unknown as CombatEffect[],
  });
}

function copyAction(action: CombatActionDefinition): CombatActionDefinition {
  return {
    ...action,
    effects: action.effects.map((effect) => ({ ...effect })),
  };
}

function copyCombatant(combatant: CombatantTemplate): CombatantTemplate {
  return { ...combatant, actionIds: [...combatant.actionIds] };
}

function requireIndexed(catalog: IndexedCombat): IndexedCombat {
  if (
    !isRecord(catalog) ||
    !Array.isArray(catalog.actions) ||
    !isReadonlyMap(catalog.actionById) ||
    !isReadonlyMap(catalog.combatantById) ||
    !isReadonlyMap(catalog.encounterById)
  ) {
    throw new CombatError('O catálogo indexado de combate é inválido.');
  }
  return catalog;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isReadonlyMap(value: unknown): value is ReadonlyMap<unknown, unknown> {
  return isRecord(value) && typeof value.get === 'function' && typeof value.keys === 'function' && typeof value.size === 'number';
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function positiveSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function includes<const T extends readonly string[]>(values: T, value: unknown): value is T[number] {
  return typeof value === 'string' && values.includes(value);
}

function fail<T>(reason: string): CombatInspection<T> {
  return { ok: false, reason };
}

export {
  COMBAT_EFFECT_TYPES,
  COMBAT_OUTCOMES,
  COMBAT_TARGETS,
  FLEE_ACTION_ID,
  PREPARED_ACTION_PREFIX,
} from './types';

export { INITIAL_COMBAT_CATALOG, PLAYER_COMBAT_MAX_HEALTH } from './initial-combat';

export type {
  CombatActionDefinition,
  CombatantState,
  CombatantTemplate,
  CombatCatalog,
  CombatEffect,
  CombatEffectType,
  CombatInspection,
  CombatLogEntry,
  CombatOutcome,
  CombatResolution,
  CombatState,
  CombatTarget,
  EncounterDefinition,
  IndexedCombat,
  CombatLoadoutSnapshot,
  PreparedConsumableState,
} from './types';
