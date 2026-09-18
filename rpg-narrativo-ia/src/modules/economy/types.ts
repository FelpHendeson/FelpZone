export type EconomyIntent = 'trade' | 'grant-property';
export type EconomyOfferKind = 'buy' | 'sell';

export type EconomyRequirement =
  | { type: 'flag.is'; flag: string; value: boolean }
  | { type: 'economy.has-item'; itemId: string; quantity: number }
  | { type: 'economy.has-balance'; currencyId: string; amount: number };

export type EconomyEffect =
  | { type: 'economy.credit'; currencyId: string; amount: number }
  | { type: 'economy.debit'; currencyId: string; amount: number }
  | { type: 'economy.add-item'; itemId: string; quantity: number }
  | { type: 'economy.remove-item'; itemId: string; quantity: number }
  | { type: 'economy.consume-stock'; offerId: string; amount: number }
  | { type: 'economy.grant-property'; propertyId: string; ownerId: string }
  | { type: 'flag.set'; flag: string; value: boolean };

export interface EconomyCurrencyDefinition {
  id: string;
  name: string;
}

export interface EconomyPropertyDefinition {
  id: string;
  name: string;
  locationId: string;
  description: string;
}

export interface EconomyOfferDefinition {
  id: string;
  kind: EconomyOfferKind;
  itemId: string;
  quantity: number;
  currencyId: string;
  price: number;
  stock: number | null;
}

export interface EconomyNpcDecision {
  npcId: string;
  intent: EconomyIntent;
  requirements: readonly EconomyRequirement[];
}

export interface EconomyActionDefinition {
  id: string;
  label: string;
  hint: string;
  npcId?: string;
  timeCost: { periods: number };
  once: boolean;
  requirements: readonly EconomyRequirement[];
  effects: readonly EconomyEffect[];
  feedback: string;
}

export interface EconomyCatalog {
  currencies: readonly EconomyCurrencyDefinition[];
  properties: readonly EconomyPropertyDefinition[];
  offers: readonly EconomyOfferDefinition[];
  npcDecisions: readonly EconomyNpcDecision[];
  actions: readonly EconomyActionDefinition[];
}

export interface IndexedEconomy {
  readonly currencies: readonly EconomyCurrencyDefinition[];
  readonly properties: readonly EconomyPropertyDefinition[];
  readonly offers: readonly EconomyOfferDefinition[];
  readonly npcDecisions: readonly EconomyNpcDecision[];
  readonly actions: readonly EconomyActionDefinition[];
  readonly currencyById: ReadonlyMap<string, EconomyCurrencyDefinition>;
  readonly propertyById: ReadonlyMap<string, EconomyPropertyDefinition>;
  readonly offerById: ReadonlyMap<string, EconomyOfferDefinition>;
  readonly actionById: ReadonlyMap<string, EconomyActionDefinition>;
}

export interface EconomyWallet {
  currencyId: string;
  amount: number;
}

export interface EconomyStock {
  offerId: string;
  remaining: number;
}

export interface EconomyPropertyHolding {
  propertyId: string;
  ownerId: string;
}

export interface EconomyState {
  wallets: EconomyWallet[];
  stocks: EconomyStock[];
  properties: EconomyPropertyHolding[];
  consumedActionIds: string[];
}

export interface EconomyActionPlan {
  actionId: string;
  timeCost: { periods: number };
  feedback: string;
  effects: readonly EconomyEffect[];
}

export interface EconomyView {
  wallets: { currencyId: string; name: string; amount: number }[];
  properties: { propertyId: string; name: string; locationId: string }[];
}

export interface EconomyKnownActionView {
  action: EconomyActionDefinition;
  available: boolean;
  blockedReason?: string;
}

export type EconomyInspection<T> = { ok: true; value: T } | { ok: false; reason: string };
