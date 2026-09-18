import type { GameState } from '../../core/state/types';
import { OrganizationError } from './errors';
import { ImmutableIndex } from './immutable-index';
import { INITIAL_ORGANIZATION_CATALOG } from './initial-organizations';
import type {
  IndexedOrganizations,
  OrganizationActionDefinition,
  OrganizationActionPlan,
  OrganizationCatalog,
  OrganizationDefinition,
  OrganizationEffect,
  OrganizationInspection,
  OrganizationInstanceState,
  OrganizationIntent,
  OrganizationKnownActionView,
  OrganizationMemberState,
  OrganizationMembershipStateDefinition,
  OrganizationNpcDecision,
  OrganizationPermission,
  OrganizationRequirement,
  OrganizationRoleDefinition,
  OrganizationTypeDefinition,
  OrganizationView,
  OrganizationsState,
} from './types';

export { OrganizationError } from './errors';
export { INITIAL_ORGANIZATION_CATALOG } from './initial-organizations';
export type {
  IndexedOrganizations,
  OrganizationActionPlan,
  OrganizationInspection,
  OrganizationKnownActionView,
  OrganizationView,
  OrganizationsState,
} from './types';

export const PLAYER_ACTOR_ID = 'player';
const PERMISSIONS: readonly OrganizationPermission[] = ['invite', 'assign-role', 'remove-member', 'disband', 'leave'];
const INTENTS: readonly OrganizationIntent[] = ['join', 'leave'];

export function inspectOrganizationCatalog(value: unknown): OrganizationInspection<IndexedOrganizations> {
  if (
    !isRecord(value) ||
    !Array.isArray(value.membershipStates) ||
    !Array.isArray(value.types) ||
    !Array.isArray(value.organizations) ||
    !Array.isArray(value.npcDecisions) ||
    !Array.isArray(value.actions)
  ) {
    return fail('O catálogo de organizações é inválido.');
  }
  const membershipStates: OrganizationMembershipStateDefinition[] = [];
  const membershipById = new Map<string, OrganizationMembershipStateDefinition>();
  for (const entry of value.membershipStates) {
    if (!isRecord(entry) || !nonEmpty(entry.id) || membershipById.has(entry.id) || !nonEmpty(entry.name)) {
      return fail('O estado de filiação declarado é inválido.');
    }
    const state = { id: entry.id, name: entry.name };
    membershipById.set(state.id, state);
    membershipStates.push(state);
  }
  const types: OrganizationTypeDefinition[] = [];
  const typeById = new Map<string, OrganizationTypeDefinition>();
  for (const entry of value.types) {
    const inspected = inspectType(entry, typeById);
    if (!inspected.ok) {
      return inspected;
    }
    typeById.set(inspected.value.id, inspected.value);
    types.push(inspected.value);
  }
  const organizations: OrganizationDefinition[] = [];
  const organizationById = new Map<string, OrganizationDefinition>();
  for (const entry of value.organizations) {
    if (
      !isRecord(entry) ||
      !nonEmpty(entry.id) ||
      organizationById.has(entry.id) ||
      !nonEmpty(entry.typeId) ||
      !typeById.has(entry.typeId) ||
      !nonEmpty(entry.name) ||
      !nonEmpty(entry.description)
    ) {
      return fail('A organização declarada é inválida.');
    }
    const organization = {
      id: entry.id,
      typeId: entry.typeId,
      name: entry.name,
      description: entry.description,
    };
    organizationById.set(organization.id, organization);
    organizations.push(organization);
  }
  const npcDecisions: OrganizationNpcDecision[] = [];
  for (const entry of value.npcDecisions) {
    const inspected = inspectNpcDecision(entry);
    if (!inspected.ok) {
      return inspected;
    }
    npcDecisions.push(inspected.value);
  }
  const actions: OrganizationActionDefinition[] = [];
  const actionById = new Map<string, OrganizationActionDefinition>();
  for (const entry of value.actions) {
    const inspected = inspectAction(entry, actionById, organizationById, typeById, membershipById, npcDecisions);
    if (!inspected.ok) {
      return inspected;
    }
    actionById.set(inspected.value.id, inspected.value);
    actions.push(inspected.value);
  }
  return {
    ok: true,
    value: Object.freeze({
      membershipStates: Object.freeze(membershipStates),
      types: Object.freeze(types),
      organizations: Object.freeze(organizations),
      npcDecisions: Object.freeze(npcDecisions),
      actions: Object.freeze(actions),
      membershipById: new ImmutableIndex(membershipStates.map((entry) => [entry.id, entry] as const)),
      typeById: new ImmutableIndex(types.map((entry) => [entry.id, entry] as const)),
      organizationById: new ImmutableIndex(organizations.map((entry) => [entry.id, entry] as const)),
      actionById: new ImmutableIndex(actions.map((entry) => [entry.id, entry] as const)),
    }),
  };
}

export function indexOrganizationCatalog(value: unknown = INITIAL_ORGANIZATION_CATALOG): IndexedOrganizations {
  const inspected = inspectOrganizationCatalog(value);
  if (!inspected.ok) {
    throw new OrganizationError(inspected.reason);
  }
  return inspected.value;
}

export const INITIAL_ORGANIZATIONS = indexOrganizationCatalog();

export function createInitialOrganizationsState(): OrganizationsState {
  return { entries: [], consumedActionIds: [] };
}

export function inspectOrganizationsState(
  value: unknown,
  catalog: IndexedOrganizations = INITIAL_ORGANIZATIONS,
): OrganizationInspection<OrganizationsState> {
  if (!isRecord(value) || !Array.isArray(value.entries) || !Array.isArray(value.consumedActionIds)) {
    return fail('O estado das organizações é inválido.');
  }
  const consumed = inspectIdList(value.consumedActionIds, (id) => catalog.actionById.has(id));
  if (!consumed.ok) {
    return consumed;
  }
  const entries: OrganizationInstanceState[] = [];
  const seen = new Set<string>();
  for (const entry of value.entries) {
    const inspected = inspectInstance(entry, catalog, seen);
    if (!inspected.ok) {
      return inspected;
    }
    seen.add(inspected.value.id);
    entries.push(inspected.value);
  }
  return { ok: true, value: { entries, consumedActionIds: consumed.value } };
}

export function copyOrganizationsState(state: OrganizationsState): OrganizationsState {
  return {
    entries: state.entries.map((entry) => ({
      id: entry.id,
      typeId: entry.typeId,
      members: entry.members.map((member) => ({ ...member })),
    })),
    consumedActionIds: [...state.consumedActionIds],
  };
}

export function planOrganizationAction(
  catalog: IndexedOrganizations,
  state: OrganizationsState,
  actionId: string,
  gameState: GameState,
): OrganizationActionPlan {
  const action = catalog.actionById.get(actionId);
  if (!action) {
    throw new OrganizationError('A ação de organização não existe.');
  }
  if (action.once && state.consumedActionIds.includes(action.id)) {
    throw new OrganizationError('Esta ação de organização já foi usada.');
  }
  if (!action.requirements.every((requirement) => requirementMet(requirement, gameState))) {
    throw new OrganizationError('Os requisitos desta ação de organização não foram atendidos.');
  }
  assertEffectsExecutable(catalog, state, action.effects, gameState);
  return {
    actionId: action.id,
    timeCost: { periods: action.timeCost.periods },
    feedback: action.feedback,
    effects: action.effects,
  };
}

export function applyOrganizationActionPlan(
  catalog: IndexedOrganizations,
  state: OrganizationsState,
  plan: OrganizationActionPlan,
): OrganizationsState {
  let current = copyOrganizationsState(state);
  const action = catalog.actionById.get(plan.actionId);
  if (action?.once && !current.consumedActionIds.includes(action.id)) {
    current.consumedActionIds.push(action.id);
  }
  for (const effect of plan.effects) {
    current = applyOrganizationEffect(catalog, current, effect);
  }
  return current;
}

export function applyOrganizationDomainEffects(
  catalog: IndexedOrganizations,
  state: OrganizationsState,
  effects: readonly OrganizationEffect[],
): OrganizationsState {
  return effects.reduce((current, effect) => applyOrganizationEffect(catalog, current, effect), copyOrganizationsState(state));
}

export function listKnownOrganizationActions(
  catalog: IndexedOrganizations,
  state: OrganizationsState,
  gameState: GameState,
  npcId?: string,
): OrganizationKnownActionView[] {
  return catalog.actions
    .filter((action) => !npcId || action.npcId === npcId)
    .map((action) => {
      try {
        planOrganizationAction(catalog, state, action.id, gameState);
        return { action, available: true };
      } catch (error) {
        return {
          action,
          available: false,
          blockedReason: error instanceof OrganizationError ? error.message : 'A ação de organização não está disponível.',
        };
      }
    });
}

export function listOrganizationViews(catalog: IndexedOrganizations, state: OrganizationsState): OrganizationView[] {
  return state.entries.map((entry) => {
    const definition = catalog.organizationById.get(entry.id);
    const type = catalog.typeById.get(entry.typeId);
    return {
      id: entry.id,
      name: definition?.name ?? entry.id,
      description: definition?.description ?? '',
      typeName: type?.name ?? entry.typeId,
      members: entry.members.map((member) => ({
        actorId: member.actorId,
        roleName: type?.roles.find((role) => role.id === member.roleId)?.name ?? member.roleId,
        membershipName: catalog.membershipById.get(member.membershipId)?.name ?? member.membershipId,
        isPlayer: member.actorId === PLAYER_ACTOR_ID,
      })),
    };
  });
}

function applyOrganizationEffect(
  catalog: IndexedOrganizations,
  state: OrganizationsState,
  effect: OrganizationEffect,
): OrganizationsState {
  if (effect.type === 'flag.set') {
    return state;
  }
  if (effect.type === 'organization.create') {
    const definition = catalog.organizationById.get(effect.organizationId);
    if (!definition || state.entries.some((entry) => entry.id === effect.organizationId)) {
      throw new OrganizationError('Não foi possível criar a organização.');
    }
    return {
      ...state,
      entries: [...state.entries, { id: definition.id, typeId: definition.typeId, members: [] }],
    };
  }
  if (effect.type === 'organization.disband') {
    return { ...state, entries: state.entries.filter((entry) => entry.id !== effect.organizationId) };
  }
  const entries = state.entries.map((entry) => {
    if (entry.id !== effect.organizationId) {
      return entry;
    }
    if (effect.type === 'organization.join') {
      if (entry.members.some((member) => member.actorId === effect.actorId)) {
        throw new OrganizationError('Esta filiação já existe.');
      }
      return {
        ...entry,
        members: [...entry.members, { actorId: effect.actorId, roleId: effect.roleId, membershipId: effect.membershipId }],
      };
    }
    if (effect.type === 'organization.assign') {
      return {
        ...entry,
        members: entry.members.map((member) =>
          member.actorId === effect.actorId ? { ...member, roleId: effect.roleId } : member,
        ),
      };
    }
    return {
      ...entry,
      members: entry.members.map((member) =>
        member.actorId === effect.actorId ? { ...member, membershipId: 'left' } : member,
      ),
    };
  });
  return { ...state, entries };
}

function assertEffectsExecutable(
  catalog: IndexedOrganizations,
  state: OrganizationsState,
  effects: readonly OrganizationEffect[],
  gameState: GameState,
): void {
  let projected = copyOrganizationsState(state);
  for (const effect of effects) {
    if (effect.type === 'flag.set') {
      continue;
    }
    if (effect.type === 'organization.create') {
      projected = applyOrganizationEffect(catalog, projected, effect);
      continue;
    }
    const instance = projected.entries.find((entry) => entry.id === effect.organizationId);
    if (!instance) {
      throw new OrganizationError('A organização não existe.');
    }
    const type = catalog.typeById.get(instance.typeId);
    if (!type) {
      throw new OrganizationError('O tipo da organização não existe.');
    }
    if (effect.type === 'organization.join') {
      assertRole(type, effect.roleId);
      if (!catalog.membershipById.has(effect.membershipId)) {
        throw new OrganizationError('O estado de filiação não existe.');
      }
      if (effect.actorId !== PLAYER_ACTOR_ID) {
        assertNpcDecision(catalog, effect.actorId, 'join', gameState);
      }
      projected = applyOrganizationEffect(catalog, projected, effect);
      continue;
    }
    const actor = instance.members.find((member) => member.actorId === PLAYER_ACTOR_ID);
    if (effect.type === 'organization.assign') {
      assertPermission(type, actor, 'assign-role');
      assertRole(type, effect.roleId);
      if (!instance.members.some((member) => member.actorId === effect.actorId)) {
        throw new OrganizationError('O membro não pertence a esta organização.');
      }
      projected = applyOrganizationEffect(catalog, projected, effect);
      continue;
    }
    if (effect.type === 'organization.leave') {
      if (effect.actorId === PLAYER_ACTOR_ID) {
        assertPermission(type, actor, 'leave');
      } else {
        assertNpcDecision(catalog, effect.actorId, 'leave', gameState);
      }
      projected = applyOrganizationEffect(catalog, projected, effect);
      continue;
    }
    assertPermission(type, actor, 'disband');
    projected = applyOrganizationEffect(catalog, projected, effect);
  }
}

function assertPermission(
  type: OrganizationTypeDefinition,
  member: OrganizationMemberState | undefined,
  permission: OrganizationPermission,
): void {
  const role = type.roles.find((entry) => entry.id === member?.roleId);
  if (!member || member.membershipId !== 'active' || !role?.permissions.includes(permission)) {
    throw new OrganizationError('Esta ação exige uma permissão que você não possui.');
  }
}

function assertRole(type: OrganizationTypeDefinition, roleId: string): void {
  if (!type.roles.some((role) => role.id === roleId)) {
    throw new OrganizationError('O cargo declarado não existe neste tipo de organização.');
  }
}

function assertNpcDecision(
  catalog: IndexedOrganizations,
  npcId: string,
  intent: OrganizationIntent,
  gameState: GameState,
): void {
  const decision = catalog.npcDecisions.find((entry) => entry.npcId === npcId && entry.intent === intent);
  if (!decision || !decision.requirements.every((requirement) => requirementMet(requirement, gameState))) {
    throw new OrganizationError('Este personagem não aceitou a decisão.');
  }
}

function requirementMet(requirement: OrganizationRequirement, gameState: GameState): boolean {
  return (gameState.flags[requirement.flag] ?? false) === requirement.value;
}

function inspectType(
  value: unknown,
  typeById: ReadonlyMap<string, OrganizationTypeDefinition>,
): OrganizationInspection<OrganizationTypeDefinition> {
  if (!isRecord(value) || !nonEmpty(value.id) || typeById.has(value.id) || !nonEmpty(value.name) || !nonEmpty(value.description) || !Array.isArray(value.roles) || value.roles.length === 0) {
    return fail('O tipo de organização declarado é inválido.');
  }
  const roles: OrganizationRoleDefinition[] = [];
  const seen = new Set<string>();
  for (const entry of value.roles) {
    if (
      !isRecord(entry) ||
      !nonEmpty(entry.id) ||
      seen.has(entry.id) ||
      !nonEmpty(entry.name) ||
      !Array.isArray(entry.permissions) ||
      entry.permissions.length === 0 ||
      entry.permissions.some((permission) => !PERMISSIONS.includes(permission as OrganizationPermission))
    ) {
      return fail('O cargo declarado é inválido.');
    }
    seen.add(entry.id);
    roles.push({
      id: entry.id,
      name: entry.name,
      permissions: entry.permissions as OrganizationPermission[],
    });
  }
  return { ok: true, value: { id: value.id, name: value.name, description: value.description, roles } };
}

function inspectNpcDecision(value: unknown): OrganizationInspection<OrganizationNpcDecision> {
  if (
    !isRecord(value) ||
    !nonEmpty(value.npcId) ||
    !INTENTS.includes(value.intent as OrganizationIntent) ||
    !Array.isArray(value.requirements) ||
    value.requirements.length === 0
  ) {
    return fail('A decisão de NPC da organização é inválida.');
  }
  const requirements: OrganizationRequirement[] = [];
  for (const entry of value.requirements) {
    const inspected = inspectRequirement(entry);
    if (!inspected.ok) {
      return inspected;
    }
    requirements.push(inspected.value);
  }
  return {
    ok: true,
    value: { npcId: value.npcId, intent: value.intent as OrganizationIntent, requirements },
  };
}

function inspectAction(
  value: unknown,
  actionById: ReadonlyMap<string, OrganizationActionDefinition>,
  organizations: ReadonlyMap<string, OrganizationDefinition>,
  types: ReadonlyMap<string, OrganizationTypeDefinition>,
  memberships: ReadonlyMap<string, OrganizationMembershipStateDefinition>,
  npcDecisions: readonly OrganizationNpcDecision[],
): OrganizationInspection<OrganizationActionDefinition> {
  if (
    !isRecord(value) ||
    !nonEmpty(value.id) ||
    actionById.has(value.id) ||
    !nonEmpty(value.label) ||
    !nonEmpty(value.hint) ||
    (value.npcId !== undefined && !nonEmpty(value.npcId)) ||
    !isRecord(value.timeCost) ||
    !Number.isInteger(value.timeCost.periods) ||
    (value.timeCost.periods as number) < 0 ||
    typeof value.once !== 'boolean' ||
    !Array.isArray(value.requirements) ||
    !Array.isArray(value.effects) ||
    value.effects.length === 0 ||
    !nonEmpty(value.feedback)
  ) {
    return fail('A ação de organização é inválida.');
  }
  const requirements: OrganizationRequirement[] = [];
  for (const entry of value.requirements) {
    const inspected = inspectRequirement(entry);
    if (!inspected.ok) {
      return inspected;
    }
    requirements.push(inspected.value);
  }
  const effects: OrganizationEffect[] = [];
  for (const entry of value.effects) {
    const inspected = inspectEffect(entry, organizations, types, memberships, npcDecisions);
    if (!inspected.ok) {
      return inspected;
    }
    effects.push(inspected.value);
  }
  return {
    ok: true,
    value: {
      id: value.id,
      label: value.label,
      hint: value.hint,
      ...(typeof value.npcId === 'string' ? { npcId: value.npcId } : {}),
      timeCost: { periods: value.timeCost.periods as number },
      once: value.once,
      requirements,
      effects,
      feedback: value.feedback,
    },
  };
}

function inspectEffect(
  value: unknown,
  organizations: ReadonlyMap<string, OrganizationDefinition>,
  types: ReadonlyMap<string, OrganizationTypeDefinition>,
  memberships: ReadonlyMap<string, OrganizationMembershipStateDefinition>,
  npcDecisions: readonly OrganizationNpcDecision[],
): OrganizationInspection<OrganizationEffect> {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return fail('O efeito de organização é inválido.');
  }
  if (value.type === 'flag.set') {
    if (!nonEmpty(value.flag) || typeof value.value !== 'boolean') {
      return fail('O efeito de organização é inválido.');
    }
    return { ok: true, value: { type: 'flag.set', flag: value.flag, value: value.value } };
  }
  if (value.type === 'organization.create' || value.type === 'organization.disband') {
    if (!nonEmpty(value.organizationId) || !organizations.has(value.organizationId)) {
      return fail('O efeito de organização é inválido.');
    }
    return { ok: true, value: { type: value.type, organizationId: value.organizationId } };
  }
  if (value.type === 'organization.leave') {
    if (!nonEmpty(value.organizationId) || !organizations.has(value.organizationId) || !nonEmpty(value.actorId)) {
      return fail('O efeito de organização é inválido.');
    }
    return { ok: true, value: { type: 'organization.leave', organizationId: value.organizationId, actorId: value.actorId } };
  }
  if (value.type === 'organization.assign') {
    if (!nonEmpty(value.organizationId) || !organizations.has(value.organizationId) || !nonEmpty(value.actorId) || !nonEmpty(value.roleId)) {
      return fail('O efeito de organização é inválido.');
    }
    const type = types.get(organizations.get(value.organizationId)!.typeId);
    if (!type?.roles.some((role) => role.id === value.roleId)) {
      return fail('O efeito de organização é inválido.');
    }
    return {
      ok: true,
      value: { type: 'organization.assign', organizationId: value.organizationId, actorId: value.actorId, roleId: value.roleId },
    };
  }
  if (value.type === 'organization.join') {
    if (
      !nonEmpty(value.organizationId) ||
      !organizations.has(value.organizationId) ||
      !nonEmpty(value.actorId) ||
      !nonEmpty(value.roleId) ||
      !nonEmpty(value.membershipId) ||
      !memberships.has(value.membershipId)
    ) {
      return fail('O efeito de organização é inválido.');
    }
    const type = types.get(organizations.get(value.organizationId)!.typeId);
    if (!type?.roles.some((role) => role.id === value.roleId)) {
      return fail('O efeito de organização é inválido.');
    }
    if (value.actorId !== PLAYER_ACTOR_ID && !npcDecisions.some((decision) => decision.npcId === value.actorId && decision.intent === 'join')) {
      return fail('A filiação de NPC exige uma decisão declarada.');
    }
    return {
      ok: true,
      value: {
        type: 'organization.join',
        organizationId: value.organizationId,
        actorId: value.actorId,
        roleId: value.roleId,
        membershipId: value.membershipId,
      },
    };
  }
  return fail('O efeito de organização é inválido.');
}

function inspectRequirement(value: unknown): OrganizationInspection<OrganizationRequirement> {
  if (!isRecord(value) || value.type !== 'flag.is' || !nonEmpty(value.flag) || typeof value.value !== 'boolean') {
    return fail('O requisito de organização é inválido.');
  }
  return { ok: true, value: { type: 'flag.is', flag: value.flag, value: value.value } };
}

function inspectInstance(
  value: unknown,
  catalog: IndexedOrganizations,
  seen: ReadonlySet<string>,
): OrganizationInspection<OrganizationInstanceState> {
  if (!isRecord(value) || !nonEmpty(value.id) || seen.has(value.id) || !catalog.organizationById.has(value.id) || !nonEmpty(value.typeId) || !catalog.typeById.has(value.typeId) || !Array.isArray(value.members)) {
    return fail('O estado das organizações é inválido.');
  }
  const definition = catalog.organizationById.get(value.id);
  if (definition && definition.typeId !== value.typeId) {
    return fail('O estado das organizações é inválido.');
  }
  const type = catalog.typeById.get(value.typeId);
  const members: OrganizationMemberState[] = [];
  const memberIds = new Set<string>();
  for (const entry of value.members) {
    if (
      !isRecord(entry) ||
      !nonEmpty(entry.actorId) ||
      memberIds.has(entry.actorId) ||
      !nonEmpty(entry.roleId) ||
      !type?.roles.some((role) => role.id === entry.roleId) ||
      !nonEmpty(entry.membershipId) ||
      !catalog.membershipById.has(entry.membershipId)
    ) {
      return fail('O estado das organizações é inválido.');
    }
    memberIds.add(entry.actorId);
    members.push({ actorId: entry.actorId, roleId: entry.roleId, membershipId: entry.membershipId });
  }
  return { ok: true, value: { id: value.id, typeId: value.typeId, members } };
}

function inspectIdList(value: unknown, exists: (id: string) => boolean): OrganizationInspection<string[]> {
  if (!Array.isArray(value)) {
    return fail('O estado das organizações é inválido.');
  }
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (!nonEmpty(entry) || seen.has(entry) || !exists(entry)) {
      return fail('O estado das organizações é inválido.');
    }
    seen.add(entry);
    ids.push(entry);
  }
  return { ok: true, value: ids };
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fail(reason: string): OrganizationInspection<never> {
  return { ok: false, reason };
}

export type { OrganizationCatalog };
