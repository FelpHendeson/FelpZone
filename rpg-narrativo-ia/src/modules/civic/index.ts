import type { GameState } from '../../core/state/types';
import { CivicError } from './errors';
import { ImmutableIndex } from './immutable-index';
import { INITIAL_CIVIC_CATALOG } from './initial-civic';
import type {
  CivicActionDefinition,
  CivicActionPlan,
  CivicAuthorityDefinition,
  CivicAuthorityPermission,
  CivicCitizenshipDefinition,
  CivicEffect,
  CivicGrant,
  CivicGrantKind,
  CivicInspection,
  CivicIntent,
  CivicKnownActionView,
  CivicNpcDecision,
  CivicOfficeDefinition,
  CivicProfessionDefinition,
  CivicProgress,
  CivicRequirement,
  CivicScopeDefinition,
  CivicStandingView,
  CivicState,
  CivicTitleDefinition,
  IndexedCivic,
} from './types';

export { CivicError } from './errors';
export { INITIAL_CIVIC_CATALOG } from './initial-civic';
export type {
  CivicActionPlan,
  CivicCatalog,
  CivicInspection,
  CivicKnownActionView,
  CivicStandingView,
  CivicState,
  IndexedCivic,
} from './types';

export const PLAYER_CIVIC_ACTOR_ID = 'player';
const GRANT_KINDS: readonly CivicGrantKind[] = ['citizenship', 'profession', 'title', 'office'];
const INTENTS: readonly CivicIntent[] = ['grant-citizenship', 'revoke-citizenship', 'grant-profession'];
const AUTHORITY_PERMISSIONS: readonly CivicAuthorityPermission[] = [
  'grant-citizenship',
  'revoke-citizenship',
  'grant-profession',
  'revoke-profession',
  'grant-title',
  'grant-office',
];

export function inspectCivicCatalog(value: unknown): CivicInspection<IndexedCivic> {
  if (
    !isRecord(value) ||
    !Array.isArray(value.scopes) ||
    value.scopes.length === 0 ||
    !Array.isArray(value.authorities) ||
    !Array.isArray(value.citizenships) ||
    !Array.isArray(value.professions) ||
    !Array.isArray(value.titles) ||
    !Array.isArray(value.offices) ||
    !Array.isArray(value.npcDecisions) ||
    !Array.isArray(value.actions)
  ) {
    return fail('O catálogo cívico é inválido.');
  }

  const scopes: CivicScopeDefinition[] = [];
  const scopeById = new Map<string, CivicScopeDefinition>();
  for (const entry of value.scopes) {
    if (!isRecord(entry) || !nonEmpty(entry.id) || scopeById.has(entry.id) || !nonEmpty(entry.name)) {
      return fail('O escopo cívico é inválido.');
    }
    const scope = { id: entry.id, name: entry.name };
    scopeById.set(scope.id, scope);
    scopes.push(scope);
  }

  const authorities: CivicAuthorityDefinition[] = [];
  const authorityById = new Map<string, CivicAuthorityDefinition>();
  for (const entry of value.authorities) {
    const inspected = inspectAuthority(entry, authorityById, scopeById);
    if (!inspected.ok) {
      return inspected;
    }
    authorityById.set(inspected.value.id, inspected.value);
    authorities.push(inspected.value);
  }

  const citizenships: CivicCitizenshipDefinition[] = [];
  const citizenshipById = new Map<string, CivicCitizenshipDefinition>();
  for (const entry of value.citizenships) {
    if (
      !isRecord(entry) ||
      !nonEmpty(entry.id) ||
      citizenshipById.has(entry.id) ||
      !nonEmpty(entry.name) ||
      !nonEmpty(entry.scopeId) ||
      !scopeById.has(entry.scopeId) ||
      !Array.isArray(entry.permissions) ||
      entry.permissions.some((permission) => !nonEmpty(permission)) ||
      new Set(entry.permissions).size !== entry.permissions.length
    ) {
      return fail('A cidadania declarada é inválida.');
    }
    const citizenship = {
      id: entry.id,
      name: entry.name,
      scopeId: entry.scopeId,
      permissions: Object.freeze([...entry.permissions]),
    };
    citizenshipById.set(citizenship.id, citizenship);
    citizenships.push(citizenship);
  }

  const professions: CivicProfessionDefinition[] = [];
  const professionById = new Map<string, CivicProfessionDefinition>();
  for (const entry of value.professions) {
    if (
      !isRecord(entry) ||
      !nonEmpty(entry.id) ||
      professionById.has(entry.id) ||
      !nonEmpty(entry.name) ||
      !Array.isArray(entry.incompatibleProfessionIds) ||
      entry.incompatibleProfessionIds.some((id) => !nonEmpty(id)) ||
      new Set(entry.incompatibleProfessionIds).size !== entry.incompatibleProfessionIds.length
    ) {
      return fail('A profissão declarada é inválida.');
    }
    const profession = {
      id: entry.id,
      name: entry.name,
      incompatibleProfessionIds: Object.freeze([...entry.incompatibleProfessionIds]),
    };
    professionById.set(profession.id, profession);
    professions.push(profession);
  }
  for (const profession of professions) {
    if (profession.incompatibleProfessionIds.some((id) => !professionById.has(id))) {
      return fail('A profissão declara incompatibilidade inexistente.');
    }
  }

  const titles: CivicTitleDefinition[] = [];
  const titleById = new Map<string, CivicTitleDefinition>();
  for (const entry of value.titles) {
    if (
      !isRecord(entry) ||
      !nonEmpty(entry.id) ||
      titleById.has(entry.id) ||
      !nonEmpty(entry.name) ||
      !nonEmpty(entry.scopeId) ||
      !scopeById.has(entry.scopeId)
    ) {
      return fail('O título social declarado é inválido.');
    }
    const title = { id: entry.id, name: entry.name, scopeId: entry.scopeId };
    titleById.set(title.id, title);
    titles.push(title);
  }

  const offices: CivicOfficeDefinition[] = [];
  const officeById = new Map<string, CivicOfficeDefinition>();
  for (const entry of value.offices) {
    if (
      !isRecord(entry) ||
      !nonEmpty(entry.id) ||
      officeById.has(entry.id) ||
      !nonEmpty(entry.name) ||
      !nonEmpty(entry.scopeId) ||
      !scopeById.has(entry.scopeId)
    ) {
      return fail('O ofício declarado é inválido.');
    }
    const office = { id: entry.id, name: entry.name, scopeId: entry.scopeId };
    officeById.set(office.id, office);
    offices.push(office);
  }

  const npcDecisions: CivicNpcDecision[] = [];
  for (const entry of value.npcDecisions) {
    const inspected = inspectNpcDecision(entry);
    if (!inspected.ok) {
      return inspected;
    }
    npcDecisions.push(inspected.value);
  }

  const actions: CivicActionDefinition[] = [];
  const actionById = new Map<string, CivicActionDefinition>();
  for (const entry of value.actions) {
    const inspected = inspectAction(entry, actionById, {
      scopeById,
      authorityById,
      citizenshipById,
      professionById,
      titleById,
      officeById,
      npcDecisions,
    });
    if (!inspected.ok) {
      return inspected;
    }
    actionById.set(inspected.value.id, inspected.value);
    actions.push(inspected.value);
  }

  return {
    ok: true,
    value: Object.freeze({
      scopes: Object.freeze(scopes),
      authorities: Object.freeze(authorities),
      citizenships: Object.freeze(citizenships),
      professions: Object.freeze(professions),
      titles: Object.freeze(titles),
      offices: Object.freeze(offices),
      npcDecisions: Object.freeze(npcDecisions),
      actions: Object.freeze(actions),
      scopeById: new ImmutableIndex(scopes.map((entry) => [entry.id, entry] as const)),
      authorityById: new ImmutableIndex(authorities.map((entry) => [entry.id, entry] as const)),
      citizenshipById: new ImmutableIndex(citizenships.map((entry) => [entry.id, entry] as const)),
      professionById: new ImmutableIndex(professions.map((entry) => [entry.id, entry] as const)),
      titleById: new ImmutableIndex(titles.map((entry) => [entry.id, entry] as const)),
      officeById: new ImmutableIndex(offices.map((entry) => [entry.id, entry] as const)),
      actionById: new ImmutableIndex(actions.map((entry) => [entry.id, entry] as const)),
    }),
  };
}

export function indexCivicCatalog(value: unknown = INITIAL_CIVIC_CATALOG): IndexedCivic {
  const inspected = inspectCivicCatalog(value);
  if (!inspected.ok) {
    throw new CivicError(inspected.reason);
  }
  return inspected.value;
}

export const INITIAL_CIVIC = indexCivicCatalog();

export function createInitialCivicState(): CivicState {
  return { grants: [], progress: [], usedPermissionIds: [], consumedActionIds: [] };
}

export function inspectCivicState(value: unknown): CivicInspection<CivicState> {
  if (
    !isRecord(value) ||
    !Array.isArray(value.grants) ||
    !Array.isArray(value.progress) ||
    !Array.isArray(value.usedPermissionIds) ||
    !Array.isArray(value.consumedActionIds)
  ) {
    return fail('O estado cívico é inválido.');
  }

  const grants: CivicGrant[] = [];
  const seenGrants = new Set<string>();
  for (const entry of value.grants) {
    if (
      !isRecord(entry) ||
      !isGrantKind(entry.kind) ||
      !nonEmpty(entry.definitionId) ||
      !nonEmpty(entry.actorId) ||
      !nonEmpty(entry.scopeId) ||
      !nonEmpty(entry.authorityId) ||
      typeof entry.active !== 'boolean'
    ) {
      return fail('A concessão cívica persistida é inválida.');
    }
    const key = `${entry.kind}:${entry.definitionId}:${entry.actorId}:${entry.scopeId}:${entry.authorityId}:${entry.active}`;
    if (seenGrants.has(key)) {
      return fail('A concessão cívica persistida é inválida.');
    }
    seenGrants.add(key);
    grants.push({
      kind: entry.kind,
      definitionId: entry.definitionId,
      actorId: entry.actorId,
      scopeId: entry.scopeId,
      authorityId: entry.authorityId,
      active: entry.active,
    });
  }

  const progress: CivicProgress[] = [];
  const seenProgress = new Set<string>();
  for (const entry of value.progress) {
    if (
      !isRecord(entry) ||
      !nonEmpty(entry.professionId) ||
      seenProgress.has(entry.professionId) ||
      typeof entry.value !== 'number' ||
      !Number.isSafeInteger(entry.value) ||
      entry.value < 0 ||
      !Array.isArray(entry.sources) ||
      entry.sources.some((source) => !nonEmpty(source))
    ) {
      return fail('O progresso profissional persistido é inválido.');
    }
    seenProgress.add(entry.professionId);
    progress.push({ professionId: entry.professionId, value: entry.value, sources: [...entry.sources] });
  }

  const usedPermissionIds: string[] = [];
  const seenPermissions = new Set<string>();
  for (const entry of value.usedPermissionIds) {
    if (!nonEmpty(entry) || seenPermissions.has(entry)) {
      return fail('O estado cívico é inválido.');
    }
    seenPermissions.add(entry);
    usedPermissionIds.push(entry);
  }

  const consumedActionIds: string[] = [];
  const seenActions = new Set<string>();
  for (const entry of value.consumedActionIds) {
    if (!nonEmpty(entry) || seenActions.has(entry)) {
      return fail('O estado cívico é inválido.');
    }
    seenActions.add(entry);
    consumedActionIds.push(entry);
  }

  return { ok: true, value: { grants, progress, usedPermissionIds, consumedActionIds } };
}

export function copyCivicState(state: CivicState): CivicState {
  return {
    grants: state.grants.map((grant) => ({ ...grant })),
    progress: state.progress.map((entry) => ({
      professionId: entry.professionId,
      value: entry.value,
      sources: [...entry.sources],
    })),
    usedPermissionIds: [...state.usedPermissionIds],
    consumedActionIds: [...state.consumedActionIds],
  };
}

export function planCivicAction(
  catalog: IndexedCivic,
  state: CivicState,
  actionId: string,
  gameState: GameState,
): CivicActionPlan {
  const action = catalog.actionById.get(actionId);
  if (!action) {
    throw new CivicError('A ação cívica não existe.');
  }
  if (action.once && state.consumedActionIds.includes(action.id)) {
    throw new CivicError('Esta ação cívica já foi usada.');
  }
  if (!action.requirements.every((requirement) => requirementMet(requirement, catalog, state, gameState))) {
    throw new CivicError('Os requisitos desta ação cívica não foram atendidos.');
  }
  if (action.npcId && !npcAllows(catalog, action, state, gameState)) {
    throw new CivicError('A autoridade não consente esta transição cívica.');
  }
  assertEffectsExecutable(catalog, state, action.effects);
  return {
    actionId: action.id,
    timeCost: { periods: action.timeCost.periods },
    feedback: action.feedback,
    effects: action.effects,
  };
}

export function applyCivicActionPlan(catalog: IndexedCivic, state: CivicState, plan: CivicActionPlan): CivicState {
  let current = copyCivicState(state);
  const action = catalog.actionById.get(plan.actionId);
  if (action?.once && !current.consumedActionIds.includes(action.id)) {
    current.consumedActionIds.push(action.id);
  }
  for (const effect of plan.effects) {
    current = applyCivicEffect(catalog, current, effect);
  }
  return current;
}

export function listKnownCivicActions(
  catalog: IndexedCivic,
  state: CivicState,
  gameState: GameState,
  npcId?: string,
): CivicKnownActionView[] {
  return catalog.actions
    .filter((action) => !npcId || action.npcId === npcId)
    .map((action) => {
      try {
        planCivicAction(catalog, state, action.id, gameState);
        return { action, available: true };
      } catch (error) {
        return {
          action,
          available: false,
          blockedReason: error instanceof CivicError ? error.message : 'A ação cívica não está disponível.',
        };
      }
    });
}

export function listCivicViews(catalog: IndexedCivic, state: CivicState, actorId = PLAYER_CIVIC_ACTOR_ID): CivicStandingView[] {
  return state.grants
    .filter((grant) => grant.actorId === actorId)
    .map((grant) => ({
      kind: grant.kind,
      definitionId: grant.definitionId,
      name: grantName(catalog, grant),
      scopeName: catalog.scopeById.get(grant.scopeId)?.name ?? grant.scopeId,
      authorityName: catalog.authorityById.get(grant.authorityId)?.name ?? grant.authorityId,
      active: grant.active,
      ...(grant.kind === 'profession'
        ? { progress: state.progress.find((entry) => entry.professionId === grant.definitionId)?.value ?? 0 }
        : {}),
    }));
}

function inspectAuthority(
  value: unknown,
  seen: Map<string, CivicAuthorityDefinition>,
  scopeById: Map<string, CivicScopeDefinition>,
): CivicInspection<CivicAuthorityDefinition> {
  if (
    !isRecord(value) ||
    !nonEmpty(value.id) ||
    seen.has(value.id) ||
    !nonEmpty(value.name) ||
    !Array.isArray(value.scopeIds) ||
    value.scopeIds.length === 0 ||
    value.scopeIds.some((id) => !nonEmpty(id) || !scopeById.has(id)) ||
    new Set(value.scopeIds).size !== value.scopeIds.length ||
    !Array.isArray(value.permissions) ||
    value.permissions.length === 0 ||
    value.permissions.some((permission) => !isAuthorityPermission(permission)) ||
    new Set(value.permissions).size !== value.permissions.length
  ) {
    return fail('A autoridade cívica é inválida.');
  }
  return {
    ok: true,
    value: {
      id: value.id,
      name: value.name,
      scopeIds: Object.freeze([...value.scopeIds]),
      permissions: Object.freeze([...value.permissions]),
    },
  };
}

function inspectNpcDecision(value: unknown): CivicInspection<CivicNpcDecision> {
  if (!isRecord(value) || !nonEmpty(value.npcId) || !isIntent(value.intent) || !Array.isArray(value.requirements)) {
    return fail('A decisão cívica do NPC é inválida.');
  }
  const requirements: CivicRequirement[] = [];
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
  seen: Map<string, CivicActionDefinition>,
  catalogs: {
    scopeById: Map<string, CivicScopeDefinition>;
    authorityById: Map<string, CivicAuthorityDefinition>;
    citizenshipById: Map<string, CivicCitizenshipDefinition>;
    professionById: Map<string, CivicProfessionDefinition>;
    titleById: Map<string, CivicTitleDefinition>;
    officeById: Map<string, CivicOfficeDefinition>;
    npcDecisions: readonly CivicNpcDecision[];
  },
): CivicInspection<CivicActionDefinition> {
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
    return fail('A ação cívica é inválida.');
  }
  if (value.npcId !== undefined && !nonEmpty(value.npcId)) {
    return fail('A ação cívica é inválida.');
  }
  const requirements: CivicRequirement[] = [];
  for (const entry of value.requirements) {
    const inspected = inspectRequirement(entry);
    if (!inspected.ok) {
      return inspected;
    }
    requirements.push(inspected.value);
  }
  const effects: CivicEffect[] = [];
  for (const entry of value.effects) {
    const inspected = inspectEffect(entry, catalogs);
    if (!inspected.ok) {
      return inspected;
    }
    effects.push(inspected.value);
  }
  if (value.npcId) {
    const intent = inferIntent(effects);
    if (!catalogs.npcDecisions.some((decision) => decision.npcId === value.npcId && decision.intent === intent)) {
      return fail('A ação cívica referencia uma decisão de NPC inexistente.');
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

function inspectRequirement(value: unknown): CivicInspection<CivicRequirement> {
  if (!isRecord(value) || !nonEmpty(value.type)) {
    return fail('O requisito cívico é inválido.');
  }
  if (value.type === 'flag.is') {
    if (!nonEmpty(value.flag) || typeof value.value !== 'boolean') {
      return fail('O requisito cívico é inválido.');
    }
    return { ok: true, value: { type: 'flag.is', flag: value.flag, value: value.value } };
  }
  if (value.type === 'civic.has-grant') {
    if (!isGrantKind(value.kind) || !nonEmpty(value.definitionId) || typeof value.active !== 'boolean') {
      return fail('O requisito cívico é inválido.');
    }
    return {
      ok: true,
      value: { type: 'civic.has-grant', kind: value.kind, definitionId: value.definitionId, active: value.active },
    };
  }
  if (value.type === 'civic.has-permission') {
    if (!nonEmpty(value.permissionId) || !nonEmpty(value.scopeId)) {
      return fail('O requisito cívico é inválido.');
    }
    return {
      ok: true,
      value: { type: 'civic.has-permission', permissionId: value.permissionId, scopeId: value.scopeId },
    };
  }
  if (value.type === 'location.is') {
    if (!nonEmpty(value.locationId)) {
      return fail('O requisito cívico é inválido.');
    }
    return { ok: true, value: { type: 'location.is', locationId: value.locationId } };
  }
  return fail('O requisito cívico é inválido.');
}

function inspectEffect(
  value: unknown,
  catalogs: {
    scopeById: Map<string, CivicScopeDefinition>;
    authorityById: Map<string, CivicAuthorityDefinition>;
    citizenshipById: Map<string, CivicCitizenshipDefinition>;
    professionById: Map<string, CivicProfessionDefinition>;
    titleById: Map<string, CivicTitleDefinition>;
    officeById: Map<string, CivicOfficeDefinition>;
  },
): CivicInspection<CivicEffect> {
  if (!isRecord(value) || !nonEmpty(value.type)) {
    return fail('O efeito cívico é inválido.');
  }
  if (value.type === 'flag.set') {
    if (!nonEmpty(value.flag) || typeof value.value !== 'boolean') {
      return fail('O efeito cívico é inválido.');
    }
    return { ok: true, value: { type: 'flag.set', flag: value.flag, value: value.value } };
  }
  if (value.type === 'civic.grant') {
    if (
      !isGrantKind(value.kind) ||
      !nonEmpty(value.definitionId) ||
      !nonEmpty(value.actorId) ||
      !nonEmpty(value.scopeId) ||
      !catalogs.scopeById.has(value.scopeId) ||
      !nonEmpty(value.authorityId) ||
      !catalogs.authorityById.has(value.authorityId) ||
      !definitionExists(catalogs, value.kind, value.definitionId)
    ) {
      return fail('O efeito de concessão cívica é inválido.');
    }
    return {
      ok: true,
      value: {
        type: 'civic.grant',
        kind: value.kind,
        definitionId: value.definitionId,
        actorId: value.actorId,
        scopeId: value.scopeId,
        authorityId: value.authorityId,
      },
    };
  }
  if (value.type === 'civic.revoke') {
    if (
      !isGrantKind(value.kind) ||
      !nonEmpty(value.definitionId) ||
      !nonEmpty(value.actorId) ||
      !nonEmpty(value.authorityId) ||
      !catalogs.authorityById.has(value.authorityId)
    ) {
      return fail('O efeito de revogação cívica é inválido.');
    }
    return {
      ok: true,
      value: {
        type: 'civic.revoke',
        kind: value.kind,
        definitionId: value.definitionId,
        actorId: value.actorId,
        authorityId: value.authorityId,
      },
    };
  }
  if (value.type === 'civic.practice') {
    if (
      !nonEmpty(value.professionId) ||
      !catalogs.professionById.has(value.professionId) ||
      typeof value.amount !== 'number' ||
      !Number.isSafeInteger(value.amount) ||
      value.amount < 1 ||
      !nonEmpty(value.source)
    ) {
      return fail('O efeito de prática profissional é inválido.');
    }
    return {
      ok: true,
      value: { type: 'civic.practice', professionId: value.professionId, amount: value.amount, source: value.source },
    };
  }
  if (value.type === 'civic.use-permission') {
    if (!nonEmpty(value.permissionId) || !nonEmpty(value.scopeId) || !catalogs.scopeById.has(value.scopeId)) {
      return fail('O efeito de permissão cívica é inválido.');
    }
    return {
      ok: true,
      value: { type: 'civic.use-permission', permissionId: value.permissionId, scopeId: value.scopeId },
    };
  }
  return fail('O efeito cívico é inválido.');
}

function assertEffectsExecutable(catalog: IndexedCivic, state: CivicState, effects: readonly CivicEffect[]): void {
  let current = copyCivicState(state);
  for (const effect of effects) {
    if (effect.type === 'civic.grant') {
      assertGrantAllowed(catalog, current, effect);
    }
    if (effect.type === 'civic.revoke') {
      assertRevokeAllowed(catalog, current, effect);
    }
    if (effect.type === 'civic.practice' && !hasActiveGrant(current, 'profession', effect.professionId, PLAYER_CIVIC_ACTOR_ID)) {
      throw new CivicError('A prática profissional exige uma concessão ativa.');
    }
    if (effect.type === 'civic.use-permission' && !hasPermission(catalog, current, effect.permissionId, effect.scopeId)) {
      throw new CivicError('A permissão cívica não está disponível neste escopo.');
    }
    current = applyCivicEffect(catalog, current, effect);
  }
}

function applyCivicEffect(catalog: IndexedCivic, state: CivicState, effect: CivicEffect): CivicState {
  if (effect.type === 'flag.set') {
    return state;
  }
  const current = copyCivicState(state);
  if (effect.type === 'civic.grant') {
    current.grants.push({
      kind: effect.kind,
      definitionId: effect.definitionId,
      actorId: effect.actorId,
      scopeId: effect.scopeId,
      authorityId: effect.authorityId,
      active: true,
    });
    return current;
  }
  if (effect.type === 'civic.revoke') {
    return {
      ...current,
      grants: current.grants.map((grant) =>
        grant.kind === effect.kind &&
        grant.definitionId === effect.definitionId &&
        grant.actorId === effect.actorId &&
        grant.active
          ? { ...grant, active: false }
          : grant,
      ),
    };
  }
  if (effect.type === 'civic.practice') {
    const existing = current.progress.find((entry) => entry.professionId === effect.professionId);
    if (existing) {
      existing.value += effect.amount;
      existing.sources.push(effect.source);
    } else {
      current.progress.push({ professionId: effect.professionId, value: effect.amount, sources: [effect.source] });
    }
    return current;
  }
  if (!current.usedPermissionIds.includes(`${effect.permissionId}:${effect.scopeId}`)) {
    current.usedPermissionIds.push(`${effect.permissionId}:${effect.scopeId}`);
  }
  void catalog;
  return current;
}

function assertGrantAllowed(
  catalog: IndexedCivic,
  state: CivicState,
  effect: Extract<CivicEffect, { type: 'civic.grant' }>,
): void {
  const authority = catalog.authorityById.get(effect.authorityId);
  if (!authority) {
    throw new CivicError('A autoridade cívica não existe.');
  }
  const permission = grantPermission(effect.kind);
  if (!authority.permissions.includes(permission) || !authority.scopeIds.includes(effect.scopeId)) {
    throw new CivicError('A autoridade não pode conceder este estado neste escopo.');
  }
  if (state.grants.some((grant) => grant.kind === effect.kind && grant.definitionId === effect.definitionId && grant.actorId === effect.actorId && grant.active)) {
    throw new CivicError('Esta concessão cívica já está ativa.');
  }
  if (effect.kind === 'profession') {
    const profession = catalog.professionById.get(effect.definitionId);
    if (!profession) {
      throw new CivicError('A profissão não existe.');
    }
    const activeIds = state.grants
      .filter((grant) => grant.kind === 'profession' && grant.actorId === effect.actorId && grant.active)
      .map((grant) => grant.definitionId);
    if (activeIds.some((id) => profession.incompatibleProfessionIds.includes(id))) {
      throw new CivicError('Esta profissão é incompatível com um ofício já exercido.');
    }
  }
}

function assertRevokeAllowed(
  catalog: IndexedCivic,
  state: CivicState,
  effect: Extract<CivicEffect, { type: 'civic.revoke' }>,
): void {
  const authority = catalog.authorityById.get(effect.authorityId);
  if (!authority) {
    throw new CivicError('A autoridade cívica não existe.');
  }
  const permission = revokePermission(effect.kind);
  if (permission && !authority.permissions.includes(permission)) {
    throw new CivicError('A autoridade não pode revogar este estado.');
  }
  if (!state.grants.some((grant) => grant.kind === effect.kind && grant.definitionId === effect.definitionId && grant.actorId === effect.actorId && grant.active)) {
    throw new CivicError('Não há concessão ativa para revogar.');
  }
}

function requirementMet(
  requirement: CivicRequirement,
  catalog: IndexedCivic,
  state: CivicState,
  gameState: GameState,
): boolean {
  if (requirement.type === 'flag.is') {
    return gameState.flags[requirement.flag] === requirement.value;
  }
  if (requirement.type === 'civic.has-grant') {
    return hasActiveGrant(state, requirement.kind, requirement.definitionId, PLAYER_CIVIC_ACTOR_ID) === requirement.active;
  }
  if (requirement.type === 'civic.has-permission') {
    return hasPermission(catalog, state, requirement.permissionId, requirement.scopeId);
  }
  return gameState.sandbox.navigation.currentLocationId === requirement.locationId;
}

function hasActiveGrant(state: CivicState, kind: CivicGrantKind, definitionId: string, actorId: string): boolean {
  return state.grants.some((grant) => grant.kind === kind && grant.definitionId === definitionId && grant.actorId === actorId && grant.active);
}

function hasPermission(catalog: IndexedCivic, state: CivicState, permissionId: string, scopeId: string): boolean {
  return state.grants.some((grant) => {
    if (!grant.active || grant.scopeId !== scopeId) {
      return false;
    }
    if (grant.kind !== 'citizenship') {
      return false;
    }
    return catalog.citizenshipById.get(grant.definitionId)?.permissions.includes(permissionId) === true;
  });
}

function npcAllows(
  catalog: IndexedCivic,
  action: CivicActionDefinition,
  state: CivicState,
  gameState: GameState,
): boolean {
  const intent = inferIntent(action.effects);
  const decision = catalog.npcDecisions.find((entry) => entry.npcId === action.npcId && entry.intent === intent);
  if (!decision) {
    return false;
  }
  return decision.requirements.every((requirement) => requirementMet(requirement, catalog, state, gameState));
}

function inferIntent(effects: readonly CivicEffect[]): CivicIntent {
  if (effects.some((effect) => effect.type === 'civic.revoke' && effect.kind === 'citizenship')) {
    return 'revoke-citizenship';
  }
  if (effects.some((effect) => effect.type === 'civic.grant' && effect.kind === 'profession')) {
    return 'grant-profession';
  }
  return 'grant-citizenship';
}

function grantName(catalog: IndexedCivic, grant: CivicGrant): string {
  if (grant.kind === 'citizenship') {
    return catalog.citizenshipById.get(grant.definitionId)?.name ?? grant.definitionId;
  }
  if (grant.kind === 'profession') {
    return catalog.professionById.get(grant.definitionId)?.name ?? grant.definitionId;
  }
  if (grant.kind === 'title') {
    return catalog.titleById.get(grant.definitionId)?.name ?? grant.definitionId;
  }
  return catalog.officeById.get(grant.definitionId)?.name ?? grant.definitionId;
}

function definitionExists(
  catalogs: {
    citizenshipById: Map<string, CivicCitizenshipDefinition>;
    professionById: Map<string, CivicProfessionDefinition>;
    titleById: Map<string, CivicTitleDefinition>;
    officeById: Map<string, CivicOfficeDefinition>;
  },
  kind: CivicGrantKind,
  definitionId: string,
): boolean {
  if (kind === 'citizenship') {
    return catalogs.citizenshipById.has(definitionId);
  }
  if (kind === 'profession') {
    return catalogs.professionById.has(definitionId);
  }
  if (kind === 'title') {
    return catalogs.titleById.has(definitionId);
  }
  return catalogs.officeById.has(definitionId);
}

function grantPermission(kind: CivicGrantKind): CivicAuthorityPermission {
  if (kind === 'citizenship') {
    return 'grant-citizenship';
  }
  if (kind === 'profession') {
    return 'grant-profession';
  }
  if (kind === 'title') {
    return 'grant-title';
  }
  return 'grant-office';
}

function revokePermission(kind: CivicGrantKind): CivicAuthorityPermission | undefined {
  if (kind === 'citizenship') {
    return 'revoke-citizenship';
  }
  if (kind === 'profession') {
    return 'revoke-profession';
  }
  return undefined;
}

function isGrantKind(value: unknown): value is CivicGrantKind {
  return typeof value === 'string' && GRANT_KINDS.includes(value as CivicGrantKind);
}

function isIntent(value: unknown): value is CivicIntent {
  return typeof value === 'string' && INTENTS.includes(value as CivicIntent);
}

function isAuthorityPermission(value: unknown): value is CivicAuthorityPermission {
  return typeof value === 'string' && AUTHORITY_PERMISSIONS.includes(value as CivicAuthorityPermission);
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
