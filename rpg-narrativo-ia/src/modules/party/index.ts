import type { GameState } from '../../core/state/types';
import { PLAYER_ACTOR_ID, type IndexedOrganizations, type OrganizationsState } from '../organizations';
import { PartyError } from './errors';
import { ImmutableIndex } from './immutable-index';
import { INITIAL_PARTY_CATALOG } from './initial-party';
import type {
  CompanionOrderDefinition,
  CompanionOrderView,
  CompanionTemplate,
  IndexedParty,
  PartyInspection,
  PartyMemberView,
  PartyRequirement,
  PartyState,
  PartyTacticDefinition,
  PartyVital,
} from './types';

export { PartyError } from './errors';
export { INITIAL_PARTY_CATALOG } from './initial-party';
export type {
  CompanionOrderView,
  IndexedParty,
  PartyCatalog,
  PartyInspection,
  PartyMemberView,
  PartyState,
} from './types';

const PARTY_TYPE_ID = 'party';
const ACTIVE_MEMBERSHIP = 'active';

export function inspectPartyCatalog(value: unknown): PartyInspection<IndexedParty> {
  if (
    !isRecord(value) ||
    !Array.isArray(value.tactics) ||
    !Array.isArray(value.companionOrders) ||
    !Array.isArray(value.companions)
  ) {
    return fail('O catálogo de party é inválido.');
  }

  const tactics: PartyTacticDefinition[] = [];
  const tacticById = new Map<string, PartyTacticDefinition>();
  for (const entry of value.tactics) {
    if (!isRecord(entry) || !nonEmpty(entry.id) || tacticById.has(entry.id) || !nonEmpty(entry.name) || !nonEmpty(entry.description)) {
      return fail('A tática de party é inválida.');
    }
    const tactic = { id: entry.id, name: entry.name, description: entry.description };
    tacticById.set(tactic.id, tactic);
    tactics.push(tactic);
  }

  const companions: CompanionTemplate[] = [];
  const companionByNpcId = new Map<string, CompanionTemplate>();
  for (const entry of value.companions) {
    if (
      !isRecord(entry) ||
      !nonEmpty(entry.npcId) ||
      companionByNpcId.has(entry.npcId) ||
      !nonEmpty(entry.name) ||
      !positiveSafeInteger(entry.maxHealth) ||
      !Array.isArray(entry.actionIds) ||
      entry.actionIds.length === 0 ||
      entry.actionIds.some((id) => !nonEmpty(id)) ||
      new Set(entry.actionIds).size !== entry.actionIds.length
    ) {
      return fail('O companheiro da party é inválido.');
    }
    const companion = {
      npcId: entry.npcId,
      name: entry.name,
      maxHealth: entry.maxHealth,
      actionIds: Object.freeze([...entry.actionIds]) as readonly string[],
    };
    companionByNpcId.set(companion.npcId, companion);
    companions.push(companion);
  }

  const companionOrders: CompanionOrderDefinition[] = [];
  const orderById = new Map<string, CompanionOrderDefinition>();
  for (const entry of value.companionOrders) {
    const inspected = inspectOrder(entry, orderById, companionByNpcId);
    if (!inspected.ok) {
      return inspected;
    }
    orderById.set(inspected.value.id, inspected.value);
    companionOrders.push(inspected.value);
  }

  return {
    ok: true,
    value: Object.freeze({
      tactics: Object.freeze(tactics.map((entry) => Object.freeze({ ...entry }))),
      companionOrders: Object.freeze(companionOrders.map((entry) => Object.freeze({ ...entry, requirements: Object.freeze([...entry.requirements]) }))),
      companions: Object.freeze(companions.map((entry) => Object.freeze({ ...entry }))),
      tacticById: new ImmutableIndex(tacticById),
      orderById: new ImmutableIndex(orderById),
      companionByNpcId: new ImmutableIndex(companionByNpcId),
    }),
  };
}

export function indexPartyCatalog(value: unknown = INITIAL_PARTY_CATALOG): IndexedParty {
  const inspected = inspectPartyCatalog(value);
  if (!inspected.ok) {
    throw new PartyError(inspected.reason);
  }
  return inspected.value;
}

export const INITIAL_PARTY = indexPartyCatalog();

export function createInitialPartyState(): PartyState {
  return { tacticId: null, vitals: [] };
}

export function inspectPartyState(value: unknown, catalog: IndexedParty = INITIAL_PARTY): PartyInspection<PartyState> {
  if (!isRecord(value) || !Array.isArray(value.vitals)) {
    return fail('O estado da party é inválido.');
  }
  if (value.tacticId !== null && (typeof value.tacticId !== 'string' || !catalog.tacticById.has(value.tacticId))) {
    return fail('A tática persistida é inválida.');
  }
  const vitals: PartyVital[] = [];
  const seen = new Set<string>();
  for (const entry of value.vitals) {
    if (!isRecord(entry) || !nonEmpty(entry.actorId) || seen.has(entry.actorId) || !nonNegativeSafeInteger(entry.health)) {
      return fail('A vitalidade persistida da party é inválida.');
    }
    seen.add(entry.actorId);
    vitals.push({ actorId: entry.actorId, health: entry.health });
  }
  return { ok: true, value: { tacticId: value.tacticId, vitals } };
}

export function copyPartyState(state: PartyState): PartyState {
  return {
    tacticId: state.tacticId,
    vitals: state.vitals.map((entry) => ({ ...entry })),
  };
}

export function activePartyMembers(
  organizations: OrganizationsState,
  catalog: IndexedOrganizations,
): { actorId: string; roleId: string; roleName: string }[] {
  const members: { actorId: string; roleId: string; roleName: string }[] = [];
  for (const instance of organizations.entries) {
    const definition = catalog.organizationById.get(instance.id);
    const type = definition ? catalog.typeById.get(instance.typeId) : undefined;
    if (!definition || !type || type.id !== PARTY_TYPE_ID) {
      continue;
    }
    for (const member of instance.members) {
      if (member.membershipId !== ACTIVE_MEMBERSHIP) {
        continue;
      }
      const role = type.roles.find((entry) => entry.id === member.roleId);
      members.push({
        actorId: member.actorId,
        roleId: member.roleId,
        roleName: role?.name ?? member.roleId,
      });
    }
  }
  return members;
}

export function listPartyViews(
  partyCatalog: IndexedParty,
  organizationCatalog: IndexedOrganizations,
  organizations: OrganizationsState,
  party: PartyState,
): PartyMemberView[] {
  return activePartyMembers(organizations, organizationCatalog).map((member) => {
    const companion = partyCatalog.companionByNpcId.get(member.actorId);
    const maxHealth = member.actorId === PLAYER_ACTOR_ID ? 0 : companion?.maxHealth ?? 0;
    const stored = party.vitals.find((entry) => entry.actorId === member.actorId)?.health;
    return {
      actorId: member.actorId,
      name: member.actorId === PLAYER_ACTOR_ID ? 'Você' : companion?.name ?? member.actorId,
      roleName: member.roleName,
      health: stored ?? (maxHealth || 0),
      maxHealth,
      isPlayer: member.actorId === PLAYER_ACTOR_ID,
    };
  });
}

export function listCompanionOrderViews(
  catalog: IndexedParty,
  organizationCatalog: IndexedOrganizations,
  organizations: OrganizationsState,
  gameState: GameState,
): CompanionOrderView[] {
  const members = new Set(activePartyMembers(organizations, organizationCatalog).map((entry) => entry.actorId));
  return catalog.companionOrders.map((order) => {
    const blocked = describeBlockedOrder(order, members, gameState);
    return {
      order,
      available: blocked === undefined,
      ...(blocked ? { blockedReason: blocked } : {}),
    };
  });
}

export function planCompanionOrder(
  catalog: IndexedParty,
  organizationCatalog: IndexedOrganizations,
  organizations: OrganizationsState,
  orderId: string,
  gameState: GameState,
): CompanionOrderDefinition {
  const order = catalog.orderById.get(orderId);
  if (!order) {
    throw new PartyError('A orientação de companheiro não existe.');
  }
  const members = new Set(activePartyMembers(organizations, organizationCatalog).map((entry) => entry.actorId));
  const blocked = describeBlockedOrder(order, members, gameState);
  if (blocked) {
    throw new PartyError(blocked);
  }
  return order;
}

export function applyPartyVitals(state: PartyState, vitals: readonly PartyVital[]): PartyState {
  const next = copyPartyState(state);
  for (const vital of vitals) {
    const existing = next.vitals.find((entry) => entry.actorId === vital.actorId);
    if (existing) {
      existing.health = vital.health;
    } else {
      next.vitals.push({ ...vital });
    }
  }
  return next;
}

export function allySnapshots(
  catalog: IndexedParty,
  organizationCatalog: IndexedOrganizations,
  organizations: OrganizationsState,
  party: PartyState,
): { id: string; name: string; maxHealth: number; health: number; actionIds: string[] }[] {
  return activePartyMembers(organizations, organizationCatalog)
    .filter((member) => member.actorId !== PLAYER_ACTOR_ID)
    .flatMap((member) => {
      const companion = catalog.companionByNpcId.get(member.actorId);
      if (!companion) {
        return [];
      }
      const stored = party.vitals.find((entry) => entry.actorId === member.actorId)?.health;
      const health = stored === undefined ? companion.maxHealth : Math.min(companion.maxHealth, Math.max(1, stored));
      return [
        {
          id: companion.npcId,
          name: companion.name,
          maxHealth: companion.maxHealth,
          health,
          actionIds: [...companion.actionIds],
        },
      ];
    });
}

function describeBlockedOrder(
  order: CompanionOrderDefinition,
  members: ReadonlySet<string>,
  gameState: GameState,
): string | undefined {
  if (!members.has(order.npcId)) {
    return 'Este companheiro não está ativo no grupo.';
  }
  if (!order.requirements.every((requirement) => requirementMet(requirement, gameState))) {
    return 'O companheiro recusa esta orientação.';
  }
  return undefined;
}

function inspectOrder(
  value: unknown,
  existing: ReadonlyMap<string, CompanionOrderDefinition>,
  companions: ReadonlyMap<string, CompanionTemplate>,
): PartyInspection<CompanionOrderDefinition> {
  if (
    !isRecord(value) ||
    !nonEmpty(value.id) ||
    existing.has(value.id) ||
    !nonEmpty(value.npcId) ||
    !companions.has(value.npcId) ||
    !nonEmpty(value.label) ||
    !nonEmpty(value.hint) ||
    !nonEmpty(value.actionId) ||
    !companions.get(value.npcId)?.actionIds.includes(value.actionId) ||
    !Array.isArray(value.requirements)
  ) {
    return fail('A orientação de companheiro é inválida.');
  }
  const requirements: PartyRequirement[] = [];
  for (const entry of value.requirements) {
    if (!isRecord(entry) || entry.type !== 'flag.is' || !nonEmpty(entry.flag) || typeof entry.value !== 'boolean') {
      return fail('O requisito da orientação de companheiro é inválido.');
    }
    requirements.push({ type: 'flag.is', flag: entry.flag, value: entry.value });
  }
  return {
    ok: true,
    value: {
      id: value.id,
      npcId: value.npcId,
      label: value.label,
      hint: value.hint,
      actionId: value.actionId,
      requirements,
    },
  };
}

function requirementMet(requirement: PartyRequirement, gameState: GameState): boolean {
  return gameState.flags[requirement.flag] === requirement.value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function positiveSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function nonNegativeSafeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function fail<T>(reason: string): PartyInspection<T> {
  return { ok: false, reason };
}
