import type { GameState } from '../../core/state/types';
import { PoliticsError } from './errors';
import { ImmutableIndex } from './immutable-index';
import { INITIAL_POLITICS_CATALOG } from './initial-politics';
import type {
  IndexedPolitics,
  PoliticsActionDefinition,
  PoliticsActionPlan,
  PoliticsAgreementDefinition,
  PoliticsAgreementRecord,
  PoliticsAgreementStatus,
  PoliticsEffect,
  PoliticsFactionDefinition,
  PoliticsInfluence,
  PoliticsInspection,
  PoliticsIntent,
  PoliticsKnownActionView,
  PoliticsLawDefinition,
  PoliticsLawRecord,
  PoliticsMandate,
  PoliticsNpcDecision,
  PoliticsOfficeDefinition,
  PoliticsRelation,
  PoliticsRequirement,
  PoliticsStanceDefinition,
  PoliticsState,
  PoliticsView,
} from './types';

export { PoliticsError } from './errors';
export { INITIAL_POLITICS_CATALOG } from './initial-politics';
export type {
  IndexedPolitics,
  PoliticsActionPlan,
  PoliticsCatalog,
  PoliticsInspection,
  PoliticsKnownActionView,
  PoliticsState,
  PoliticsView,
} from './types';

export const PLAYER_POLITICS_ACTOR_ID = 'player';
const INTENTS: readonly PoliticsIntent[] = ['accept-agreement', 'refuse-agreement'];
const STATUSES: readonly PoliticsAgreementStatus[] = ['proposed', 'active', 'refused'];

export function inspectPoliticsCatalog(value: unknown): PoliticsInspection<IndexedPolitics> {
  if (
    !isRecord(value) ||
    !Array.isArray(value.factions) ||
    value.factions.length < 2 ||
    !Array.isArray(value.stances) ||
    value.stances.length === 0 ||
    !Array.isArray(value.offices) ||
    !Array.isArray(value.agreements) ||
    !Array.isArray(value.laws) ||
    !Array.isArray(value.npcDecisions) ||
    !Array.isArray(value.actions)
  ) {
    return fail('O catálogo político é inválido.');
  }

  const factions: PoliticsFactionDefinition[] = [];
  const factionById = new Map<string, PoliticsFactionDefinition>();
  for (const entry of value.factions) {
    if (!isRecord(entry) || !nonEmpty(entry.id) || factionById.has(entry.id) || !nonEmpty(entry.name) || !nonEmpty(entry.description)) {
      return fail('A facção declarada é inválida.');
    }
    const faction = { id: entry.id, name: entry.name, description: entry.description };
    factionById.set(faction.id, faction);
    factions.push(faction);
  }

  const stances: PoliticsStanceDefinition[] = [];
  const stanceById = new Map<string, PoliticsStanceDefinition>();
  for (const entry of value.stances) {
    if (!isRecord(entry) || !nonEmpty(entry.id) || stanceById.has(entry.id) || !nonEmpty(entry.name)) {
      return fail('A postura diplomática é inválida.');
    }
    const stance = { id: entry.id, name: entry.name };
    stanceById.set(stance.id, stance);
    stances.push(stance);
  }

  const offices: PoliticsOfficeDefinition[] = [];
  const officeById = new Map<string, PoliticsOfficeDefinition>();
  for (const entry of value.offices) {
    if (
      !isRecord(entry) ||
      !nonEmpty(entry.id) ||
      officeById.has(entry.id) ||
      !nonEmpty(entry.name) ||
      !nonEmpty(entry.factionId) ||
      !factionById.has(entry.factionId) ||
      !nonEmpty(entry.description)
    ) {
      return fail('O cargo político é inválido.');
    }
    const office = { id: entry.id, name: entry.name, factionId: entry.factionId, description: entry.description };
    officeById.set(office.id, office);
    offices.push(office);
  }

  const agreements: PoliticsAgreementDefinition[] = [];
  const agreementById = new Map<string, PoliticsAgreementDefinition>();
  for (const entry of value.agreements) {
    if (
      !isRecord(entry) ||
      !nonEmpty(entry.id) ||
      agreementById.has(entry.id) ||
      !nonEmpty(entry.name) ||
      !nonEmpty(entry.fromFactionId) ||
      !factionById.has(entry.fromFactionId) ||
      !nonEmpty(entry.toFactionId) ||
      !factionById.has(entry.toFactionId) ||
      entry.fromFactionId === entry.toFactionId ||
      !nonEmpty(entry.description)
    ) {
      return fail('O acordo declarado é inválido.');
    }
    const agreement = {
      id: entry.id,
      name: entry.name,
      fromFactionId: entry.fromFactionId,
      toFactionId: entry.toFactionId,
      description: entry.description,
    };
    agreementById.set(agreement.id, agreement);
    agreements.push(agreement);
  }

  const laws: PoliticsLawDefinition[] = [];
  const lawById = new Map<string, PoliticsLawDefinition>();
  for (const entry of value.laws) {
    if (
      !isRecord(entry) ||
      !nonEmpty(entry.id) ||
      lawById.has(entry.id) ||
      !nonEmpty(entry.name) ||
      !nonEmpty(entry.jurisdictionLocationId) ||
      !nonEmpty(entry.description)
    ) {
      return fail('A lei declarada é inválida.');
    }
    const law = {
      id: entry.id,
      name: entry.name,
      jurisdictionLocationId: entry.jurisdictionLocationId,
      description: entry.description,
    };
    lawById.set(law.id, law);
    laws.push(law);
  }

  const npcDecisions: PoliticsNpcDecision[] = [];
  for (const entry of value.npcDecisions) {
    const inspected = inspectNpcDecision(entry);
    if (!inspected.ok) {
      return inspected;
    }
    npcDecisions.push(inspected.value);
  }

  const actions: PoliticsActionDefinition[] = [];
  const actionById = new Map<string, PoliticsActionDefinition>();
  for (const entry of value.actions) {
    const inspected = inspectAction(entry, actionById, factionById, stanceById, officeById, agreementById, lawById, npcDecisions);
    if (!inspected.ok) {
      return inspected;
    }
    actionById.set(inspected.value.id, inspected.value);
    actions.push(inspected.value);
  }

  return {
    ok: true,
    value: Object.freeze({
      factions: Object.freeze(factions),
      stances: Object.freeze(stances),
      offices: Object.freeze(offices),
      agreements: Object.freeze(agreements),
      laws: Object.freeze(laws),
      npcDecisions: Object.freeze(npcDecisions),
      actions: Object.freeze(actions),
      factionById: new ImmutableIndex(factions.map((entry) => [entry.id, entry] as const)),
      stanceById: new ImmutableIndex(stances.map((entry) => [entry.id, entry] as const)),
      officeById: new ImmutableIndex(offices.map((entry) => [entry.id, entry] as const)),
      agreementById: new ImmutableIndex(agreements.map((entry) => [entry.id, entry] as const)),
      lawById: new ImmutableIndex(laws.map((entry) => [entry.id, entry] as const)),
      actionById: new ImmutableIndex(actions.map((entry) => [entry.id, entry] as const)),
    }),
  };
}

export function indexPoliticsCatalog(value: unknown = INITIAL_POLITICS_CATALOG): IndexedPolitics {
  const inspected = inspectPoliticsCatalog(value);
  if (!inspected.ok) {
    throw new PoliticsError(inspected.reason);
  }
  return inspected.value;
}

export const INITIAL_POLITICS = indexPoliticsCatalog();

export function createInitialPoliticsState(): PoliticsState {
  return {
    mandates: [],
    relations: [],
    agreements: [],
    laws: [],
    influence: [],
    consumedActionIds: [],
  };
}

export function inspectPoliticsState(
  value: unknown,
  catalog: IndexedPolitics = INITIAL_POLITICS,
): PoliticsInspection<PoliticsState> {
  if (
    !isRecord(value) ||
    !Array.isArray(value.mandates) ||
    !Array.isArray(value.relations) ||
    !Array.isArray(value.agreements) ||
    !Array.isArray(value.laws) ||
    !Array.isArray(value.influence) ||
    !Array.isArray(value.consumedActionIds)
  ) {
    return fail('O estado político é inválido.');
  }
  const mandates: PoliticsMandate[] = [];
  const seenMandates = new Set<string>();
  for (const entry of value.mandates) {
    if (
      !isRecord(entry) ||
      !nonEmpty(entry.actorId) ||
      !nonEmpty(entry.factionId) ||
      !catalog.factionById.has(entry.factionId) ||
      !nonEmpty(entry.officeId) ||
      !catalog.officeById.has(entry.officeId)
    ) {
      return fail('O mandato persistido é inválido.');
    }
    const key = `${entry.actorId}:${entry.factionId}:${entry.officeId}`;
    if (seenMandates.has(key)) {
      return fail('O mandato persistido é inválido.');
    }
    seenMandates.add(key);
    mandates.push({ actorId: entry.actorId, factionId: entry.factionId, officeId: entry.officeId });
  }
  const relations: PoliticsRelation[] = [];
  const seenRelations = new Set<string>();
  for (const entry of value.relations) {
    if (
      !isRecord(entry) ||
      !nonEmpty(entry.fromFactionId) ||
      !catalog.factionById.has(entry.fromFactionId) ||
      !nonEmpty(entry.toFactionId) ||
      !catalog.factionById.has(entry.toFactionId) ||
      !nonEmpty(entry.stanceId) ||
      !catalog.stanceById.has(entry.stanceId)
    ) {
      return fail('A relação diplomática persistida é inválida.');
    }
    const key = `${entry.fromFactionId}:${entry.toFactionId}`;
    if (seenRelations.has(key)) {
      return fail('A relação diplomática persistida é inválida.');
    }
    seenRelations.add(key);
    relations.push({ fromFactionId: entry.fromFactionId, toFactionId: entry.toFactionId, stanceId: entry.stanceId });
  }
  const agreements: PoliticsAgreementRecord[] = [];
  const seenAgreements = new Set<string>();
  for (const entry of value.agreements) {
    if (
      !isRecord(entry) ||
      !nonEmpty(entry.agreementId) ||
      !catalog.agreementById.has(entry.agreementId) ||
      seenAgreements.has(entry.agreementId) ||
      !isStatus(entry.status)
    ) {
      return fail('O acordo persistido é inválido.');
    }
    seenAgreements.add(entry.agreementId);
    agreements.push({ agreementId: entry.agreementId, status: entry.status });
  }
  const laws: PoliticsLawRecord[] = [];
  const seenLaws = new Set<string>();
  for (const entry of value.laws) {
    if (!isRecord(entry) || !nonEmpty(entry.lawId) || !catalog.lawById.has(entry.lawId) || seenLaws.has(entry.lawId)) {
      return fail('A lei persistida é inválida.');
    }
    seenLaws.add(entry.lawId);
    laws.push({ lawId: entry.lawId });
  }
  const influence: PoliticsInfluence[] = [];
  const seenInfluence = new Set<string>();
  for (const entry of value.influence) {
    if (
      !isRecord(entry) ||
      !nonEmpty(entry.factionId) ||
      !catalog.factionById.has(entry.factionId) ||
      seenInfluence.has(entry.factionId) ||
      !nonNegativeInt(entry.amount)
    ) {
      return fail('A influência persistida é inválida.');
    }
    seenInfluence.add(entry.factionId);
    influence.push({ factionId: entry.factionId, amount: entry.amount });
  }
  const consumedActionIds: string[] = [];
  const seenActions = new Set<string>();
  for (const entry of value.consumedActionIds) {
    if (!nonEmpty(entry) || seenActions.has(entry)) {
      return fail('O estado político é inválido.');
    }
    seenActions.add(entry);
    consumedActionIds.push(entry);
  }
  return { ok: true, value: { mandates, relations, agreements, laws, influence, consumedActionIds } };
}

export function copyPoliticsState(state: PoliticsState): PoliticsState {
  return {
    mandates: state.mandates.map((entry) => ({ ...entry })),
    relations: state.relations.map((entry) => ({ ...entry })),
    agreements: state.agreements.map((entry) => ({ ...entry })),
    laws: state.laws.map((entry) => ({ ...entry })),
    influence: state.influence.map((entry) => ({ ...entry })),
    consumedActionIds: [...state.consumedActionIds],
  };
}

export function planPoliticsAction(
  catalog: IndexedPolitics,
  state: PoliticsState,
  actionId: string,
  gameState: GameState,
): PoliticsActionPlan {
  const action = catalog.actionById.get(actionId);
  if (!action) {
    throw new PoliticsError('A ação política não existe.');
  }
  if (action.once && state.consumedActionIds.includes(action.id)) {
    throw new PoliticsError('Esta ação política já foi usada.');
  }
  if (!action.requirements.every((requirement) => requirementMet(requirement, state, gameState))) {
    throw new PoliticsError('Os requisitos desta ação política não foram atendidos.');
  }
  if (action.npcId && !npcAllows(catalog, action, state, gameState)) {
    throw new PoliticsError('O representante não consente esta decisão.');
  }
  assertEffectsExecutable(catalog, state, action.effects);
  return {
    actionId: action.id,
    timeCost: { periods: action.timeCost.periods },
    feedback: action.feedback,
    effects: action.effects,
  };
}

export function applyPoliticsActionPlan(
  catalog: IndexedPolitics,
  state: PoliticsState,
  plan: PoliticsActionPlan,
): PoliticsState {
  let current = copyPoliticsState(state);
  const action = catalog.actionById.get(plan.actionId);
  if (action?.once && !current.consumedActionIds.includes(action.id)) {
    current.consumedActionIds.push(action.id);
  }
  for (const effect of plan.effects) {
    current = applyPoliticsEffect(current, effect);
  }
  return current;
}

export function listKnownPoliticsActions(
  catalog: IndexedPolitics,
  state: PoliticsState,
  gameState: GameState,
  npcId?: string,
): PoliticsKnownActionView[] {
  return catalog.actions
    .filter((action) => !npcId || action.npcId === npcId)
    .map((action) => {
      try {
        planPoliticsAction(catalog, state, action.id, gameState);
        return { action, available: true };
      } catch (error) {
        return {
          action,
          available: false,
          blockedReason: error instanceof PoliticsError ? error.message : 'A ação política não está disponível.',
        };
      }
    });
}

export function listPoliticsViews(catalog: IndexedPolitics, state: PoliticsState): PoliticsView {
  return {
    mandates: state.mandates.map((mandate) => ({
      factionName: catalog.factionById.get(mandate.factionId)?.name ?? mandate.factionId,
      officeName: catalog.officeById.get(mandate.officeId)?.name ?? mandate.officeId,
    })),
    relations: state.relations.map((relation) => ({
      fromName: catalog.factionById.get(relation.fromFactionId)?.name ?? relation.fromFactionId,
      toName: catalog.factionById.get(relation.toFactionId)?.name ?? relation.toFactionId,
      stanceName: catalog.stanceById.get(relation.stanceId)?.name ?? relation.stanceId,
    })),
    agreements: state.agreements.map((agreement) => ({
      agreementId: agreement.agreementId,
      name: catalog.agreementById.get(agreement.agreementId)?.name ?? agreement.agreementId,
      status: agreement.status,
    })),
    laws: state.laws.map((law) => {
      const definition = catalog.lawById.get(law.lawId);
      return {
        lawId: law.lawId,
        name: definition?.name ?? law.lawId,
        jurisdictionLocationId: definition?.jurisdictionLocationId ?? '',
      };
    }),
    influence: state.influence.map((entry) => ({
      factionName: catalog.factionById.get(entry.factionId)?.name ?? entry.factionId,
      amount: entry.amount,
    })),
  };
}

function inspectNpcDecision(value: unknown): PoliticsInspection<PoliticsNpcDecision> {
  if (!isRecord(value) || !nonEmpty(value.npcId) || !isIntent(value.intent) || !Array.isArray(value.requirements)) {
    return fail('A decisão política do NPC é inválida.');
  }
  const requirements: PoliticsRequirement[] = [];
  for (const entry of value.requirements) {
    const inspected = inspectRequirement(entry);
    if (!inspected.ok) {
      return inspected;
    }
    requirements.push(inspected.value);
  }
  return { ok: true, value: { npcId: value.npcId, intent: value.intent, requirements: Object.freeze(requirements) } };
}

function inspectAction(
  value: unknown,
  seen: Map<string, PoliticsActionDefinition>,
  factionById: Map<string, PoliticsFactionDefinition>,
  stanceById: Map<string, PoliticsStanceDefinition>,
  officeById: Map<string, PoliticsOfficeDefinition>,
  agreementById: Map<string, PoliticsAgreementDefinition>,
  lawById: Map<string, PoliticsLawDefinition>,
  npcDecisions: readonly PoliticsNpcDecision[],
): PoliticsInspection<PoliticsActionDefinition> {
  if (
    !isRecord(value) ||
    !nonEmpty(value.id) ||
    seen.has(value.id) ||
    !nonEmpty(value.label) ||
    !nonEmpty(value.hint) ||
    !isRecord(value.timeCost) ||
    typeof value.timeCost.periods !== 'number' ||
    !Number.isSafeInteger(value.timeCost.periods) ||
    value.timeCost.periods < 0 ||
    typeof value.once !== 'boolean' ||
    !Array.isArray(value.requirements) ||
    !Array.isArray(value.effects) ||
    value.effects.length === 0 ||
    !nonEmpty(value.feedback)
  ) {
    return fail('A ação política é inválida.');
  }
  if (value.npcId !== undefined && !nonEmpty(value.npcId)) {
    return fail('A ação política é inválida.');
  }
  const requirements: PoliticsRequirement[] = [];
  for (const entry of value.requirements) {
    const inspected = inspectRequirement(entry);
    if (!inspected.ok) {
      return inspected;
    }
    requirements.push(inspected.value);
  }
  const effects: PoliticsEffect[] = [];
  for (const entry of value.effects) {
    const inspected = inspectEffect(entry, factionById, stanceById, officeById, agreementById, lawById);
    if (!inspected.ok) {
      return inspected;
    }
    effects.push(inspected.value);
  }
  if (value.npcId) {
    const intent = inferIntent(effects);
    if (!intent || !npcDecisions.some((decision) => decision.npcId === value.npcId && decision.intent === intent)) {
      return fail('A ação política referencia uma decisão de NPC inexistente.');
    }
  }
  return {
    ok: true,
    value: {
      id: value.id,
      label: value.label,
      hint: value.hint,
      ...(value.npcId ? { npcId: value.npcId } : {}),
      timeCost: { periods: value.timeCost.periods },
      once: value.once,
      requirements: Object.freeze(requirements),
      effects: Object.freeze(effects),
      feedback: value.feedback,
    },
  };
}

function inspectRequirement(value: unknown): PoliticsInspection<PoliticsRequirement> {
  if (!isRecord(value) || !nonEmpty(value.type)) {
    return fail('O requisito político é inválido.');
  }
  if (value.type === 'flag.is') {
    if (!nonEmpty(value.flag) || typeof value.value !== 'boolean') {
      return fail('O requisito político é inválido.');
    }
    return { ok: true, value: { type: 'flag.is', flag: value.flag, value: value.value } };
  }
  if (value.type === 'politics.has-mandate') {
    if (!nonEmpty(value.factionId) || !nonEmpty(value.officeId)) {
      return fail('O requisito político é inválido.');
    }
    return { ok: true, value: { type: 'politics.has-mandate', factionId: value.factionId, officeId: value.officeId } };
  }
  if (value.type === 'politics.agreement-status') {
    if (!nonEmpty(value.agreementId) || !isStatus(value.status)) {
      return fail('O requisito político é inválido.');
    }
    return { ok: true, value: { type: 'politics.agreement-status', agreementId: value.agreementId, status: value.status } };
  }
  return fail('O requisito político é inválido.');
}

function inspectEffect(
  value: unknown,
  factionById: Map<string, PoliticsFactionDefinition>,
  stanceById: Map<string, PoliticsStanceDefinition>,
  officeById: Map<string, PoliticsOfficeDefinition>,
  agreementById: Map<string, PoliticsAgreementDefinition>,
  lawById: Map<string, PoliticsLawDefinition>,
): PoliticsInspection<PoliticsEffect> {
  if (!isRecord(value) || !nonEmpty(value.type)) {
    return fail('O efeito político é inválido.');
  }
  if (value.type === 'flag.set') {
    if (!nonEmpty(value.flag) || typeof value.value !== 'boolean') {
      return fail('O efeito político é inválido.');
    }
    return { ok: true, value: { type: 'flag.set', flag: value.flag, value: value.value } };
  }
  if (value.type === 'politics.grant-mandate') {
    if (
      !nonEmpty(value.actorId) ||
      !nonEmpty(value.factionId) ||
      !factionById.has(value.factionId) ||
      !nonEmpty(value.officeId) ||
      !officeById.has(value.officeId)
    ) {
      return fail('O efeito de mandato é inválido.');
    }
    return {
      ok: true,
      value: { type: 'politics.grant-mandate', actorId: value.actorId, factionId: value.factionId, officeId: value.officeId },
    };
  }
  if (value.type === 'politics.propose-agreement' || value.type === 'politics.accept-agreement' || value.type === 'politics.refuse-agreement') {
    if (!nonEmpty(value.agreementId) || !agreementById.has(value.agreementId)) {
      return fail('O efeito de acordo é inválido.');
    }
    return { ok: true, value: { type: value.type, agreementId: value.agreementId } };
  }
  if (value.type === 'politics.set-stance') {
    if (
      !nonEmpty(value.fromFactionId) ||
      !factionById.has(value.fromFactionId) ||
      !nonEmpty(value.toFactionId) ||
      !factionById.has(value.toFactionId) ||
      value.fromFactionId === value.toFactionId ||
      !nonEmpty(value.stanceId) ||
      !stanceById.has(value.stanceId)
    ) {
      return fail('O efeito diplomático é inválido.');
    }
    return {
      ok: true,
      value: {
        type: 'politics.set-stance',
        fromFactionId: value.fromFactionId,
        toFactionId: value.toFactionId,
        stanceId: value.stanceId,
      },
    };
  }
  if (value.type === 'politics.enact-law') {
    if (!nonEmpty(value.lawId) || !lawById.has(value.lawId)) {
      return fail('O efeito de lei é inválido.');
    }
    return { ok: true, value: { type: 'politics.enact-law', lawId: value.lawId } };
  }
  if (value.type === 'politics.add-influence') {
    if (!nonEmpty(value.factionId) || !factionById.has(value.factionId) || !positiveInt(value.amount)) {
      return fail('O efeito de influência é inválido.');
    }
    return { ok: true, value: { type: 'politics.add-influence', factionId: value.factionId, amount: value.amount } };
  }
  return fail('O efeito político é inválido.');
}

function assertEffectsExecutable(
  catalog: IndexedPolitics,
  state: PoliticsState,
  effects: readonly PoliticsEffect[],
): void {
  let current = copyPoliticsState(state);
  for (const effect of effects) {
    if (effect.type === 'politics.grant-mandate') {
      const office = catalog.officeById.get(effect.officeId);
      if (!office || office.factionId !== effect.factionId) {
        throw new PoliticsError('O cargo não pertence a esta facção.');
      }
      if (current.mandates.some((entry) => entry.actorId === effect.actorId && entry.factionId === effect.factionId && entry.officeId === effect.officeId)) {
        throw new PoliticsError('Este mandato já foi concedido.');
      }
    }
    if (effect.type === 'politics.propose-agreement' && current.agreements.some((entry) => entry.agreementId === effect.agreementId)) {
      throw new PoliticsError('Este acordo já foi proposto.');
    }
    if (effect.type === 'politics.accept-agreement' || effect.type === 'politics.refuse-agreement') {
      const record = current.agreements.find((entry) => entry.agreementId === effect.agreementId);
      if (!record || record.status !== 'proposed') {
        throw new PoliticsError('Não há proposta ativa para esta decisão.');
      }
    }
    if (effect.type === 'politics.enact-law' && current.laws.some((entry) => entry.lawId === effect.lawId)) {
      throw new PoliticsError('Esta lei já está em vigor.');
    }
    current = applyPoliticsEffect(current, effect);
  }
}

function applyPoliticsEffect(state: PoliticsState, effect: PoliticsEffect): PoliticsState {
  if (effect.type === 'flag.set') {
    return state;
  }
  const current = copyPoliticsState(state);
  if (effect.type === 'politics.grant-mandate') {
    current.mandates.push({ actorId: effect.actorId, factionId: effect.factionId, officeId: effect.officeId });
    return current;
  }
  if (effect.type === 'politics.propose-agreement') {
    current.agreements.push({ agreementId: effect.agreementId, status: 'proposed' });
    return current;
  }
  if (effect.type === 'politics.accept-agreement' || effect.type === 'politics.refuse-agreement') {
    const record = current.agreements.find((entry) => entry.agreementId === effect.agreementId);
    if (!record) {
      throw new PoliticsError('Não há proposta ativa para esta decisão.');
    }
    record.status = effect.type === 'politics.accept-agreement' ? 'active' : 'refused';
    return current;
  }
  if (effect.type === 'politics.set-stance') {
    const existing = current.relations.find(
      (entry) => entry.fromFactionId === effect.fromFactionId && entry.toFactionId === effect.toFactionId,
    );
    if (existing) {
      existing.stanceId = effect.stanceId;
    } else {
      current.relations.push({
        fromFactionId: effect.fromFactionId,
        toFactionId: effect.toFactionId,
        stanceId: effect.stanceId,
      });
    }
    return current;
  }
  if (effect.type === 'politics.enact-law') {
    current.laws.push({ lawId: effect.lawId });
    return current;
  }
  const influence = current.influence.find((entry) => entry.factionId === effect.factionId);
  if (influence) {
    influence.amount += effect.amount;
  } else {
    current.influence.push({ factionId: effect.factionId, amount: effect.amount });
  }
  return current;
}

function requirementMet(requirement: PoliticsRequirement, state: PoliticsState, gameState: GameState): boolean {
  if (requirement.type === 'flag.is') {
    return gameState.flags[requirement.flag] === requirement.value;
  }
  if (requirement.type === 'politics.has-mandate') {
    return state.mandates.some(
      (entry) =>
        entry.actorId === PLAYER_POLITICS_ACTOR_ID &&
        entry.factionId === requirement.factionId &&
        entry.officeId === requirement.officeId,
    );
  }
  return state.agreements.some((entry) => entry.agreementId === requirement.agreementId && entry.status === requirement.status);
}

function npcAllows(
  catalog: IndexedPolitics,
  action: PoliticsActionDefinition,
  state: PoliticsState,
  gameState: GameState,
): boolean {
  const intent = inferIntent(action.effects);
  const decision = catalog.npcDecisions.find((entry) => entry.npcId === action.npcId && entry.intent === intent);
  if (!decision) {
    return false;
  }
  return decision.requirements.every((requirement) => requirementMet(requirement, state, gameState));
}

function inferIntent(effects: readonly PoliticsEffect[]): PoliticsIntent | undefined {
  if (effects.some((effect) => effect.type === 'politics.accept-agreement')) {
    return 'accept-agreement';
  }
  if (effects.some((effect) => effect.type === 'politics.refuse-agreement')) {
    return 'refuse-agreement';
  }
  return undefined;
}

function isIntent(value: unknown): value is PoliticsIntent {
  return typeof value === 'string' && INTENTS.includes(value as PoliticsIntent);
}

function isStatus(value: unknown): value is PoliticsAgreementStatus {
  return typeof value === 'string' && STATUSES.includes(value as PoliticsAgreementStatus);
}

function fail(reason: string): { ok: false; reason: string } {
  return { ok: false, reason };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function positiveInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function nonNegativeInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}
