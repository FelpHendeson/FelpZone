export type SettlementIntent = 'assign-role';

export type SettlementRequirement =
  | { type: 'flag.is'; flag: string; value: boolean }
  | { type: 'location.is'; locationId: string }
  | { type: 'settlement.owns-property'; propertyId: string }
  | { type: 'settlement.has-authority'; territoryId: string }
  | { type: 'settlement.has-item'; itemId: string; quantity: number }
  | { type: 'settlement.project-active'; projectId: string }
  | { type: 'settlement.structure-complete'; territoryId: string; structureTypeId: string }
  | { type: 'settlement.storage-has'; territoryId: string; itemId: string; quantity: number };

export type SettlementEffect =
  | { type: 'settlement.claim'; territoryId: string; claimantId: string }
  | { type: 'settlement.start-project'; projectId: string }
  | { type: 'settlement.supply-project'; projectId: string; itemId: string; quantity: number }
  | { type: 'settlement.cancel-project'; projectId: string }
  | { type: 'settlement.assign-role'; territoryId: string; npcId: string; roleId: string }
  | { type: 'settlement.withdraw-item'; territoryId: string; itemId: string; quantity: number }
  | { type: 'flag.set'; flag: string; value: boolean };

export interface SettlementItemQuantity {
  itemId: string;
  quantity: number;
}

export interface SettlementTerritoryDefinition {
  id: string;
  name: string;
  locationId: string;
  requiredPropertyId: string;
  description: string;
}

export interface SettlementStructureTypeDefinition {
  id: string;
  name: string;
  storageCapacity: number;
  description: string;
}

export interface SettlementProjectDefinition {
  id: string;
  label: string;
  territoryId: string;
  structureTypeId: string;
  durationPeriods: number;
  costs: readonly SettlementItemQuantity[];
}

export interface SettlementRoleDefinition {
  id: string;
  name: string;
  exclusive: boolean;
}

export interface SettlementRecipeDefinition {
  id: string;
  structureTypeId: string;
  roleId: string;
  intervalPeriods: number;
  inputs: readonly SettlementItemQuantity[];
  outputs: readonly SettlementItemQuantity[];
}

export interface SettlementNpcDecision {
  npcId: string;
  intent: SettlementIntent;
  requirements: readonly SettlementRequirement[];
}

export interface SettlementActionDefinition {
  id: string;
  label: string;
  hint: string;
  npcId?: string;
  timeCost: { periods: number };
  once: boolean;
  requirements: readonly SettlementRequirement[];
  effects: readonly SettlementEffect[];
  feedback: string;
}

export interface SettlementCatalog {
  territories: readonly SettlementTerritoryDefinition[];
  structureTypes: readonly SettlementStructureTypeDefinition[];
  projects: readonly SettlementProjectDefinition[];
  roles: readonly SettlementRoleDefinition[];
  recipes: readonly SettlementRecipeDefinition[];
  npcDecisions: readonly SettlementNpcDecision[];
  actions: readonly SettlementActionDefinition[];
}

export interface IndexedSettlements {
  readonly territories: readonly SettlementTerritoryDefinition[];
  readonly structureTypes: readonly SettlementStructureTypeDefinition[];
  readonly projects: readonly SettlementProjectDefinition[];
  readonly roles: readonly SettlementRoleDefinition[];
  readonly recipes: readonly SettlementRecipeDefinition[];
  readonly npcDecisions: readonly SettlementNpcDecision[];
  readonly actions: readonly SettlementActionDefinition[];
  readonly territoryById: ReadonlyMap<string, SettlementTerritoryDefinition>;
  readonly structureTypeById: ReadonlyMap<string, SettlementStructureTypeDefinition>;
  readonly projectById: ReadonlyMap<string, SettlementProjectDefinition>;
  readonly roleById: ReadonlyMap<string, SettlementRoleDefinition>;
  readonly recipeById: ReadonlyMap<string, SettlementRecipeDefinition>;
  readonly actionById: ReadonlyMap<string, SettlementActionDefinition>;
}

export interface SettlementClaim {
  territoryId: string;
  claimantId: string;
}

export interface SettlementStructure {
  territoryId: string;
  structureTypeId: string;
}

export interface SettlementProjectProgress {
  projectId: string;
  remainingPeriods: number;
  supplied: SettlementItemQuantity[];
}

export interface SettlementStorageEntry {
  territoryId: string;
  itemId: string;
  quantity: number;
}

export interface SettlementAssignment {
  territoryId: string;
  npcId: string;
  roleId: string;
}

export interface SettlementsState {
  claims: SettlementClaim[];
  structures: SettlementStructure[];
  projects: SettlementProjectProgress[];
  storage: SettlementStorageEntry[];
  assignments: SettlementAssignment[];
  consumedActionIds: string[];
}

export interface SettlementActionPlan {
  actionId: string;
  timeCost: { periods: number };
  feedback: string;
  effects: readonly SettlementEffect[];
}

export interface SettlementView {
  claims: { territoryId: string; name: string }[];
  structures: { structureTypeId: string; name: string; territoryName: string }[];
  projects: { projectId: string; label: string; remainingPeriods: number; supplied: SettlementItemQuantity[] }[];
  storage: { territoryId: string; itemId: string; quantity: number; capacity: number }[];
  assignments: { npcId: string; roleName: string; territoryName: string }[];
}

export interface SettlementKnownActionView {
  action: SettlementActionDefinition;
  available: boolean;
  blockedReason?: string;
}

export type SettlementInspection<T> = { ok: true; value: T } | { ok: false; reason: string };
