export type PartyRequirement = { type: 'flag.is'; flag: string; value: boolean };

export interface PartyTacticDefinition {
  id: string;
  name: string;
  description: string;
}

export interface CompanionOrderDefinition {
  id: string;
  npcId: string;
  label: string;
  hint: string;
  actionId: string;
  requirements: readonly PartyRequirement[];
}

export interface CompanionTemplate {
  npcId: string;
  name: string;
  maxHealth: number;
  actionIds: readonly string[];
}

export interface PartyCatalog {
  tactics: readonly PartyTacticDefinition[];
  companionOrders: readonly CompanionOrderDefinition[];
  companions: readonly CompanionTemplate[];
}

export interface IndexedParty {
  readonly tactics: readonly PartyTacticDefinition[];
  readonly companionOrders: readonly CompanionOrderDefinition[];
  readonly companions: readonly CompanionTemplate[];
  readonly tacticById: ReadonlyMap<string, PartyTacticDefinition>;
  readonly orderById: ReadonlyMap<string, CompanionOrderDefinition>;
  readonly companionByNpcId: ReadonlyMap<string, CompanionTemplate>;
}

export interface PartyVital {
  actorId: string;
  health: number;
}

export interface PartyState {
  tacticId: string | null;
  vitals: PartyVital[];
}

export interface PartyMemberView {
  actorId: string;
  name: string;
  roleName: string;
  health: number;
  maxHealth: number;
  isPlayer: boolean;
}

export interface CompanionOrderView {
  order: CompanionOrderDefinition;
  available: boolean;
  blockedReason?: string;
}

export type PartyInspection<T> = { ok: true; value: T } | { ok: false; reason: string };
