export type FamilyIntent = 'partner' | 'household' | 'ward';
export type HouseholdRole = 'resident' | 'responsible';

export type FamilyRequirement = { type: 'flag.is'; flag: string; value: boolean };

export type FamilyEffect =
  | { type: 'kinship.form'; fromId: string; toId: string; kinshipTypeId: string }
  | { type: 'household.found'; householdId: string; residentIds: readonly string[] }
  | { type: 'household.assign'; householdId: string; actorId: string; role: HouseholdRole }
  | { type: 'flag.set'; flag: string; value: boolean };

export interface KinshipTypeDefinition {
  id: string;
  name: string;
  exclusive: boolean;
  symmetric: boolean;
}

export interface HouseholdDefinition {
  id: string;
  name: string;
  locationId: string;
  description: string;
}

export interface FamilyNpcDecision {
  npcId: string;
  intent: FamilyIntent;
  requirements: readonly FamilyRequirement[];
}

export interface FamilyActionDefinition {
  id: string;
  label: string;
  hint: string;
  npcId?: string;
  timeCost: { periods: number };
  once: boolean;
  requirements: readonly FamilyRequirement[];
  effects: readonly FamilyEffect[];
  feedback: string;
}

export interface FamilyCatalog {
  kinshipTypes: readonly KinshipTypeDefinition[];
  households: readonly HouseholdDefinition[];
  npcDecisions: readonly FamilyNpcDecision[];
  actions: readonly FamilyActionDefinition[];
}

export interface IndexedFamily {
  readonly kinshipTypes: readonly KinshipTypeDefinition[];
  readonly households: readonly HouseholdDefinition[];
  readonly npcDecisions: readonly FamilyNpcDecision[];
  readonly actions: readonly FamilyActionDefinition[];
  readonly kinshipById: ReadonlyMap<string, KinshipTypeDefinition>;
  readonly householdById: ReadonlyMap<string, HouseholdDefinition>;
  readonly actionById: ReadonlyMap<string, FamilyActionDefinition>;
}

export interface KinshipTie {
  fromId: string;
  toId: string;
  kinshipTypeId: string;
}

export interface HouseholdState {
  id: string;
  residentIds: string[];
  responsibleIds: string[];
}

export interface FamilyStageMark {
  actorId: string;
  stageId: string;
}

export interface FamilyState {
  ties: KinshipTie[];
  households: HouseholdState[];
  stageMarks: FamilyStageMark[];
  consumedActionIds: string[];
}

export interface FamilyActionPlan {
  actionId: string;
  timeCost: { periods: number };
  feedback: string;
  effects: readonly FamilyEffect[];
}

export interface FamilyMemberView {
  actorId: string;
  name: string;
  kinshipName?: string;
  householdName?: string;
  ageYears?: number;
  stageName?: string;
  isPlayer: boolean;
}

export interface FamilyKnownActionView {
  action: FamilyActionDefinition;
  available: boolean;
  blockedReason?: string;
}

export type FamilyInspection<T> = { ok: true; value: T } | { ok: false; reason: string };
