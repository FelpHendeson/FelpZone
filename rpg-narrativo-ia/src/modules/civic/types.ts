export type CivicGrantKind = 'citizenship' | 'profession' | 'title' | 'office';
export type CivicIntent = 'grant-citizenship' | 'revoke-citizenship' | 'grant-profession';
export type CivicAuthorityPermission =
  | 'grant-citizenship'
  | 'revoke-citizenship'
  | 'grant-profession'
  | 'revoke-profession'
  | 'grant-title'
  | 'grant-office';

export type CivicRequirement =
  | { type: 'flag.is'; flag: string; value: boolean }
  | { type: 'civic.has-grant'; kind: CivicGrantKind; definitionId: string; active: boolean }
  | { type: 'civic.has-permission'; permissionId: string; scopeId: string }
  | { type: 'location.is'; locationId: string };

export type CivicEffect =
  | {
      type: 'civic.grant';
      kind: CivicGrantKind;
      definitionId: string;
      actorId: string;
      scopeId: string;
      authorityId: string;
    }
  | { type: 'civic.revoke'; kind: CivicGrantKind; definitionId: string; actorId: string; authorityId: string }
  | { type: 'civic.practice'; professionId: string; amount: number; source: string }
  | { type: 'civic.use-permission'; permissionId: string; scopeId: string }
  | { type: 'flag.set'; flag: string; value: boolean };

export interface CivicScopeDefinition {
  id: string;
  name: string;
}

export interface CivicAuthorityDefinition {
  id: string;
  name: string;
  scopeIds: readonly string[];
  permissions: readonly CivicAuthorityPermission[];
}

export interface CivicCitizenshipDefinition {
  id: string;
  name: string;
  scopeId: string;
  permissions: readonly string[];
}

export interface CivicProfessionDefinition {
  id: string;
  name: string;
  incompatibleProfessionIds: readonly string[];
}

export interface CivicTitleDefinition {
  id: string;
  name: string;
  scopeId: string;
}

export interface CivicOfficeDefinition {
  id: string;
  name: string;
  scopeId: string;
}

export interface CivicNpcDecision {
  npcId: string;
  intent: CivicIntent;
  requirements: readonly CivicRequirement[];
}

export interface CivicActionDefinition {
  id: string;
  label: string;
  hint: string;
  npcId?: string;
  timeCost: { periods: number };
  once: boolean;
  requirements: readonly CivicRequirement[];
  effects: readonly CivicEffect[];
  feedback: string;
}

export interface CivicCatalog {
  scopes: readonly CivicScopeDefinition[];
  authorities: readonly CivicAuthorityDefinition[];
  citizenships: readonly CivicCitizenshipDefinition[];
  professions: readonly CivicProfessionDefinition[];
  titles: readonly CivicTitleDefinition[];
  offices: readonly CivicOfficeDefinition[];
  npcDecisions: readonly CivicNpcDecision[];
  actions: readonly CivicActionDefinition[];
}

export interface IndexedCivic {
  readonly scopes: readonly CivicScopeDefinition[];
  readonly authorities: readonly CivicAuthorityDefinition[];
  readonly citizenships: readonly CivicCitizenshipDefinition[];
  readonly professions: readonly CivicProfessionDefinition[];
  readonly titles: readonly CivicTitleDefinition[];
  readonly offices: readonly CivicOfficeDefinition[];
  readonly npcDecisions: readonly CivicNpcDecision[];
  readonly actions: readonly CivicActionDefinition[];
  readonly scopeById: ReadonlyMap<string, CivicScopeDefinition>;
  readonly authorityById: ReadonlyMap<string, CivicAuthorityDefinition>;
  readonly citizenshipById: ReadonlyMap<string, CivicCitizenshipDefinition>;
  readonly professionById: ReadonlyMap<string, CivicProfessionDefinition>;
  readonly titleById: ReadonlyMap<string, CivicTitleDefinition>;
  readonly officeById: ReadonlyMap<string, CivicOfficeDefinition>;
  readonly actionById: ReadonlyMap<string, CivicActionDefinition>;
}

export interface CivicGrant {
  kind: CivicGrantKind;
  definitionId: string;
  actorId: string;
  scopeId: string;
  authorityId: string;
  active: boolean;
}

export interface CivicProgress {
  professionId: string;
  value: number;
  sources: string[];
}

export interface CivicState {
  grants: CivicGrant[];
  progress: CivicProgress[];
  usedPermissionIds: string[];
  consumedActionIds: string[];
}

export interface CivicActionPlan {
  actionId: string;
  timeCost: { periods: number };
  feedback: string;
  effects: readonly CivicEffect[];
}

export interface CivicStandingView {
  kind: CivicGrantKind;
  definitionId: string;
  name: string;
  scopeName: string;
  authorityName: string;
  active: boolean;
  progress?: number;
}

export interface CivicKnownActionView {
  action: CivicActionDefinition;
  available: boolean;
  blockedReason?: string;
}

export type CivicInspection<T> = { ok: true; value: T } | { ok: false; reason: string };
