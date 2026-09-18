export type PoliticsIntent = 'accept-agreement' | 'refuse-agreement';
export type PoliticsAgreementStatus = 'proposed' | 'active' | 'refused';

export type PoliticsRequirement =
  | { type: 'flag.is'; flag: string; value: boolean }
  | { type: 'politics.has-mandate'; factionId: string; officeId: string }
  | { type: 'politics.agreement-status'; agreementId: string; status: PoliticsAgreementStatus };

export type PoliticsEffect =
  | { type: 'politics.grant-mandate'; actorId: string; factionId: string; officeId: string }
  | { type: 'politics.propose-agreement'; agreementId: string }
  | { type: 'politics.accept-agreement'; agreementId: string }
  | { type: 'politics.refuse-agreement'; agreementId: string }
  | { type: 'politics.set-stance'; fromFactionId: string; toFactionId: string; stanceId: string }
  | { type: 'politics.enact-law'; lawId: string }
  | { type: 'politics.add-influence'; factionId: string; amount: number }
  | { type: 'flag.set'; flag: string; value: boolean };

export interface PoliticsFactionDefinition {
  id: string;
  name: string;
  description: string;
}

export interface PoliticsStanceDefinition {
  id: string;
  name: string;
}

export interface PoliticsOfficeDefinition {
  id: string;
  name: string;
  factionId: string;
  description: string;
}

export interface PoliticsAgreementDefinition {
  id: string;
  name: string;
  fromFactionId: string;
  toFactionId: string;
  description: string;
}

export interface PoliticsLawDefinition {
  id: string;
  name: string;
  jurisdictionLocationId: string;
  description: string;
}

export interface PoliticsNpcDecision {
  npcId: string;
  intent: PoliticsIntent;
  requirements: readonly PoliticsRequirement[];
}

export interface PoliticsActionDefinition {
  id: string;
  label: string;
  hint: string;
  npcId?: string;
  timeCost: { periods: number };
  once: boolean;
  requirements: readonly PoliticsRequirement[];
  effects: readonly PoliticsEffect[];
  feedback: string;
}

export interface PoliticsCatalog {
  factions: readonly PoliticsFactionDefinition[];
  stances: readonly PoliticsStanceDefinition[];
  offices: readonly PoliticsOfficeDefinition[];
  agreements: readonly PoliticsAgreementDefinition[];
  laws: readonly PoliticsLawDefinition[];
  npcDecisions: readonly PoliticsNpcDecision[];
  actions: readonly PoliticsActionDefinition[];
}

export interface IndexedPolitics {
  readonly factions: readonly PoliticsFactionDefinition[];
  readonly stances: readonly PoliticsStanceDefinition[];
  readonly offices: readonly PoliticsOfficeDefinition[];
  readonly agreements: readonly PoliticsAgreementDefinition[];
  readonly laws: readonly PoliticsLawDefinition[];
  readonly npcDecisions: readonly PoliticsNpcDecision[];
  readonly actions: readonly PoliticsActionDefinition[];
  readonly factionById: ReadonlyMap<string, PoliticsFactionDefinition>;
  readonly stanceById: ReadonlyMap<string, PoliticsStanceDefinition>;
  readonly officeById: ReadonlyMap<string, PoliticsOfficeDefinition>;
  readonly agreementById: ReadonlyMap<string, PoliticsAgreementDefinition>;
  readonly lawById: ReadonlyMap<string, PoliticsLawDefinition>;
  readonly actionById: ReadonlyMap<string, PoliticsActionDefinition>;
}

export interface PoliticsMandate {
  actorId: string;
  factionId: string;
  officeId: string;
}

export interface PoliticsRelation {
  fromFactionId: string;
  toFactionId: string;
  stanceId: string;
}

export interface PoliticsAgreementRecord {
  agreementId: string;
  status: PoliticsAgreementStatus;
}

export interface PoliticsLawRecord {
  lawId: string;
}

export interface PoliticsInfluence {
  factionId: string;
  amount: number;
}

export interface PoliticsState {
  mandates: PoliticsMandate[];
  relations: PoliticsRelation[];
  agreements: PoliticsAgreementRecord[];
  laws: PoliticsLawRecord[];
  influence: PoliticsInfluence[];
  consumedActionIds: string[];
}

export interface PoliticsActionPlan {
  actionId: string;
  timeCost: { periods: number };
  feedback: string;
  effects: readonly PoliticsEffect[];
}

export interface PoliticsView {
  mandates: { factionName: string; officeName: string }[];
  relations: { fromName: string; toName: string; stanceName: string }[];
  agreements: { agreementId: string; name: string; status: PoliticsAgreementStatus }[];
  laws: { lawId: string; name: string; jurisdictionLocationId: string }[];
  influence: { factionName: string; amount: number }[];
}

export interface PoliticsKnownActionView {
  action: PoliticsActionDefinition;
  available: boolean;
  blockedReason?: string;
}

export type PoliticsInspection<T> = { ok: true; value: T } | { ok: false; reason: string };
