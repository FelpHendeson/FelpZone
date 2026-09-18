export type OrganizationPermission = 'invite' | 'assign-role' | 'remove-member' | 'disband' | 'leave';
export type OrganizationIntent = 'join' | 'leave';

export type OrganizationRequirement = { type: 'flag.is'; flag: string; value: boolean };

export type OrganizationEffect =
  | { type: 'organization.create'; organizationId: string }
  | { type: 'organization.join'; organizationId: string; actorId: string; roleId: string; membershipId: string }
  | { type: 'organization.assign'; organizationId: string; actorId: string; roleId: string }
  | { type: 'organization.leave'; organizationId: string; actorId: string }
  | { type: 'organization.disband'; organizationId: string }
  | { type: 'flag.set'; flag: string; value: boolean };

export interface OrganizationMembershipStateDefinition {
  id: string;
  name: string;
}

export interface OrganizationRoleDefinition {
  id: string;
  name: string;
  permissions: readonly OrganizationPermission[];
}

export interface OrganizationTypeDefinition {
  id: string;
  name: string;
  description: string;
  roles: readonly OrganizationRoleDefinition[];
}

export interface OrganizationDefinition {
  id: string;
  typeId: string;
  name: string;
  description: string;
}

export interface OrganizationNpcDecision {
  npcId: string;
  intent: OrganizationIntent;
  requirements: readonly OrganizationRequirement[];
}

export interface OrganizationActionDefinition {
  id: string;
  label: string;
  hint: string;
  npcId?: string;
  timeCost: { periods: number };
  once: boolean;
  requirements: readonly OrganizationRequirement[];
  effects: readonly OrganizationEffect[];
  feedback: string;
}

export interface OrganizationCatalog {
  membershipStates: readonly OrganizationMembershipStateDefinition[];
  types: readonly OrganizationTypeDefinition[];
  organizations: readonly OrganizationDefinition[];
  npcDecisions: readonly OrganizationNpcDecision[];
  actions: readonly OrganizationActionDefinition[];
}

export interface OrganizationMemberState {
  actorId: string;
  roleId: string;
  membershipId: string;
}

export interface OrganizationInstanceState {
  id: string;
  typeId: string;
  members: OrganizationMemberState[];
}

export interface OrganizationsState {
  entries: OrganizationInstanceState[];
  consumedActionIds: string[];
}

export interface IndexedOrganizations {
  readonly membershipStates: readonly OrganizationMembershipStateDefinition[];
  readonly types: readonly OrganizationTypeDefinition[];
  readonly organizations: readonly OrganizationDefinition[];
  readonly npcDecisions: readonly OrganizationNpcDecision[];
  readonly actions: readonly OrganizationActionDefinition[];
  readonly membershipById: ReadonlyMap<string, OrganizationMembershipStateDefinition>;
  readonly typeById: ReadonlyMap<string, OrganizationTypeDefinition>;
  readonly organizationById: ReadonlyMap<string, OrganizationDefinition>;
  readonly actionById: ReadonlyMap<string, OrganizationActionDefinition>;
}

export type OrganizationInspection<T> = { ok: true; value: T } | { ok: false; reason: string };

export interface OrganizationActionPlan {
  actionId: string;
  timeCost: { periods: number };
  feedback: string;
  effects: readonly OrganizationEffect[];
}

export interface OrganizationView {
  id: string;
  name: string;
  description: string;
  typeName: string;
  members: {
    actorId: string;
    roleName: string;
    membershipName: string;
    isPlayer: boolean;
  }[];
}

export interface OrganizationKnownActionView {
  action: OrganizationActionDefinition;
  available: boolean;
  blockedReason?: string;
}
