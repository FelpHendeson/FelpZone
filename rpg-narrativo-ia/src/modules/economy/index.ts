import type { GameState } from '../../core/state/types';
import { itemQuantity } from '../inventory';
import { EconomyError } from './errors';
import { ImmutableIndex } from './immutable-index';
import { INITIAL_ECONOMY_CATALOG } from './initial-economy';
import type {
  EconomyActionDefinition,
  EconomyActionPlan,
  EconomyCurrencyDefinition,
  EconomyEffect,
  EconomyInspection,
  EconomyIntent,
  EconomyKnownActionView,
  EconomyNpcDecision,
  EconomyOfferDefinition,
  EconomyOfferKind,
  EconomyPropertyDefinition,
  EconomyPropertyHolding,
  EconomyRequirement,
  EconomyState,
  EconomyStock,
  EconomyView,
  EconomyWallet,
  IndexedEconomy,
} from './types';

export { EconomyError } from './errors';
export { INITIAL_ECONOMY_CATALOG } from './initial-economy';
export type {
  EconomyActionPlan,
  EconomyCatalog,
  EconomyInspection,
  EconomyKnownActionView,
  EconomyState,
  EconomyView,
  IndexedEconomy,
} from './types';

export const PLAYER_ECONOMY_ACTOR_ID = 'player';
const INTENTS: readonly EconomyIntent[] = ['trade', 'grant-property'];
const OFFER_KINDS: readonly EconomyOfferKind[] = ['buy', 'sell'];

export function inspectEconomyCatalog(value: unknown): EconomyInspection<IndexedEconomy> {
  if (
    !isRecord(value) ||
    !Array.isArray(value.currencies) ||
    value.currencies.length === 0 ||
    !Array.isArray(value.properties) ||
    !Array.isArray(value.offers) ||
    !Array.isArray(value.npcDecisions) ||
    !Array.isArray(value.actions)
  ) {
    return fail('O catálogo econômico é inválido.');
  }

  const currencies: EconomyCurrencyDefinition[] = [];
  const currencyById = new Map<string, EconomyCurrencyDefinition>();
  for (const entry of value.currencies) {
    if (!isRecord(entry) || !nonEmpty(entry.id) || currencyById.has(entry.id) || !nonEmpty(entry.name)) {
      return fail('A moeda declarada é inválida.');
    }
    const currency = { id: entry.id, name: entry.name };
    currencyById.set(currency.id, currency);
    currencies.push(currency);
  }

  const properties: EconomyPropertyDefinition[] = [];
  const propertyById = new Map<string, EconomyPropertyDefinition>();
  for (const entry of value.properties) {
    if (
      !isRecord(entry) ||
      !nonEmpty(entry.id) ||
      propertyById.has(entry.id) ||
      !nonEmpty(entry.name) ||
      !nonEmpty(entry.locationId) ||
      !nonEmpty(entry.description)
    ) {
      return fail('A propriedade declarada é inválida.');
    }
    const property = { id: entry.id, name: entry.name, locationId: entry.locationId, description: entry.description };
    propertyById.set(property.id, property);
    properties.push(property);
  }

  const offers: EconomyOfferDefinition[] = [];
  const offerById = new Map<string, EconomyOfferDefinition>();
  for (const entry of value.offers) {
    if (
      !isRecord(entry) ||
      !nonEmpty(entry.id) ||
      offerById.has(entry.id) ||
      !isOfferKind(entry.kind) ||
      !nonEmpty(entry.itemId) ||
      !positiveInt(entry.quantity) ||
      !nonEmpty(entry.currencyId) ||
      !currencyById.has(entry.currencyId) ||
      !positiveInt(entry.price) ||
      !(entry.stock === null || positiveInt(entry.stock))
    ) {
      return fail('A oferta econômica é inválida.');
    }
    const offer = {
      id: entry.id,
      kind: entry.kind,
      itemId: entry.itemId,
      quantity: entry.quantity,
      currencyId: entry.currencyId,
      price: entry.price,
      stock: entry.stock,
    };
    offerById.set(offer.id, offer);
    offers.push(offer);
  }

  const npcDecisions: EconomyNpcDecision[] = [];
  for (const entry of value.npcDecisions) {
    const inspected = inspectNpcDecision(entry);
    if (!inspected.ok) {
      return inspected;
    }
    npcDecisions.push(inspected.value);
  }

  const actions: EconomyActionDefinition[] = [];
  const actionById = new Map<string, EconomyActionDefinition>();
  for (const entry of value.actions) {
    const inspected = inspectAction(entry, actionById, currencyById, propertyById, offerById, npcDecisions);
    if (!inspected.ok) {
      return inspected;
    }
    actionById.set(inspected.value.id, inspected.value);
    actions.push(inspected.value);
  }

  return {
    ok: true,
    value: Object.freeze({
      currencies: Object.freeze(currencies),
      properties: Object.freeze(properties),
      offers: Object.freeze(offers),
      npcDecisions: Object.freeze(npcDecisions),
      actions: Object.freeze(actions),
      currencyById: new ImmutableIndex(currencies.map((entry) => [entry.id, entry] as const)),
      propertyById: new ImmutableIndex(properties.map((entry) => [entry.id, entry] as const)),
      offerById: new ImmutableIndex(offers.map((entry) => [entry.id, entry] as const)),
      actionById: new ImmutableIndex(actions.map((entry) => [entry.id, entry] as const)),
    }),
  };
}

export function indexEconomyCatalog(value: unknown = INITIAL_ECONOMY_CATALOG): IndexedEconomy {
  const inspected = inspectEconomyCatalog(value);
  if (!inspected.ok) {
    throw new EconomyError(inspected.reason);
  }
  return inspected.value;
}

export const INITIAL_ECONOMY = indexEconomyCatalog();

export function createInitialEconomyState(catalog: IndexedEconomy = INITIAL_ECONOMY): EconomyState {
  return {
    wallets: [],
    stocks: catalog.offers
      .filter((offer) => offer.stock !== null)
      .map((offer) => ({ offerId: offer.id, remaining: offer.stock ?? 0 })),
    properties: [],
    consumedActionIds: [],
  };
}

export function inspectEconomyState(value: unknown, catalog: IndexedEconomy = INITIAL_ECONOMY): EconomyInspection<EconomyState> {
  if (
    !isRecord(value) ||
    !Array.isArray(value.wallets) ||
    !Array.isArray(value.stocks) ||
    !Array.isArray(value.properties) ||
    !Array.isArray(value.consumedActionIds)
  ) {
    return fail('O estado econômico é inválido.');
  }
  const wallets: EconomyWallet[] = [];
  const seenWallets = new Set<string>();
  for (const entry of value.wallets) {
    if (
      !isRecord(entry) ||
      !nonEmpty(entry.currencyId) ||
      !catalog.currencyById.has(entry.currencyId) ||
      seenWallets.has(entry.currencyId) ||
      !nonNegativeInt(entry.amount)
    ) {
      return fail('A carteira persistida é inválida.');
    }
    seenWallets.add(entry.currencyId);
    wallets.push({ currencyId: entry.currencyId, amount: entry.amount });
  }
  const stocks: EconomyStock[] = [];
  const seenStocks = new Set<string>();
  for (const entry of value.stocks) {
    if (
      !isRecord(entry) ||
      !nonEmpty(entry.offerId) ||
      seenStocks.has(entry.offerId) ||
      !nonNegativeInt(entry.remaining)
    ) {
      return fail('O estoque persistido é inválido.');
    }
    const offer = catalog.offerById.get(entry.offerId);
    if (!offer || offer.stock === null || entry.remaining > offer.stock) {
      return fail('O estoque persistido é inválido.');
    }
    seenStocks.add(entry.offerId);
    stocks.push({ offerId: entry.offerId, remaining: entry.remaining });
  }
  const properties: EconomyPropertyHolding[] = [];
  const seenProperties = new Set<string>();
  for (const entry of value.properties) {
    if (
      !isRecord(entry) ||
      !nonEmpty(entry.propertyId) ||
      !catalog.propertyById.has(entry.propertyId) ||
      seenProperties.has(entry.propertyId) ||
      !nonEmpty(entry.ownerId)
    ) {
      return fail('A propriedade persistida é inválida.');
    }
    seenProperties.add(entry.propertyId);
    properties.push({ propertyId: entry.propertyId, ownerId: entry.ownerId });
  }
  const consumedActionIds: string[] = [];
  const seenActions = new Set<string>();
  for (const entry of value.consumedActionIds) {
    if (!nonEmpty(entry) || seenActions.has(entry)) {
      return fail('O estado econômico é inválido.');
    }
    seenActions.add(entry);
    consumedActionIds.push(entry);
  }
  return { ok: true, value: { wallets, stocks, properties, consumedActionIds } };
}

export function copyEconomyState(state: EconomyState): EconomyState {
  return {
    wallets: state.wallets.map((entry) => ({ ...entry })),
    stocks: state.stocks.map((entry) => ({ ...entry })),
    properties: state.properties.map((entry) => ({ ...entry })),
    consumedActionIds: [...state.consumedActionIds],
  };
}

export function planEconomyAction(
  catalog: IndexedEconomy,
  state: EconomyState,
  actionId: string,
  gameState: GameState,
): EconomyActionPlan {
  const action = catalog.actionById.get(actionId);
  if (!action) {
    throw new EconomyError('A ação econômica não existe.');
  }
  if (action.once && state.consumedActionIds.includes(action.id)) {
    throw new EconomyError('Esta ação econômica já foi usada.');
  }
  if (!action.requirements.every((requirement) => requirementMet(requirement, state, gameState))) {
    throw new EconomyError('Os requisitos desta ação econômica não foram atendidos.');
  }
  if (action.npcId && !npcAllows(catalog, action, state, gameState)) {
    throw new EconomyError('O comerciante não consente esta transação.');
  }
  assertEffectsExecutable(catalog, state, action.effects, gameState);
  return {
    actionId: action.id,
    timeCost: { periods: action.timeCost.periods },
    feedback: action.feedback,
    effects: action.effects,
  };
}

export function applyEconomyActionPlan(catalog: IndexedEconomy, state: EconomyState, plan: EconomyActionPlan): EconomyState {
  let current = copyEconomyState(state);
  const action = catalog.actionById.get(plan.actionId);
  if (action?.once && !current.consumedActionIds.includes(action.id)) {
    current.consumedActionIds.push(action.id);
  }
  for (const effect of plan.effects) {
    current = applyEconomyEffect(current, effect);
  }
  return current;
}

export function listKnownEconomyActions(
  catalog: IndexedEconomy,
  state: EconomyState,
  gameState: GameState,
  npcId?: string,
): EconomyKnownActionView[] {
  return catalog.actions
    .filter((action) => !npcId || action.npcId === npcId)
    .map((action) => {
      try {
        planEconomyAction(catalog, state, action.id, gameState);
        return { action, available: true };
      } catch (error) {
        return {
          action,
          available: false,
          blockedReason: error instanceof EconomyError ? error.message : 'A ação econômica não está disponível.',
        };
      }
    });
}

export function listEconomyViews(catalog: IndexedEconomy, state: EconomyState): EconomyView {
  return {
    wallets: state.wallets.map((wallet) => ({
      currencyId: wallet.currencyId,
      name: catalog.currencyById.get(wallet.currencyId)?.name ?? wallet.currencyId,
      amount: wallet.amount,
    })),
    properties: state.properties.map((holding) => {
      const property = catalog.propertyById.get(holding.propertyId);
      return {
        propertyId: holding.propertyId,
        name: property?.name ?? holding.propertyId,
        locationId: property?.locationId ?? '',
      };
    }),
  };
}

function inspectNpcDecision(value: unknown): EconomyInspection<EconomyNpcDecision> {
  if (!isRecord(value) || !nonEmpty(value.npcId) || !isIntent(value.intent) || !Array.isArray(value.requirements)) {
    return fail('A decisão econômica do NPC é inválida.');
  }
  const requirements: EconomyRequirement[] = [];
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
  seen: Map<string, EconomyActionDefinition>,
  currencyById: Map<string, EconomyCurrencyDefinition>,
  propertyById: Map<string, EconomyPropertyDefinition>,
  offerById: Map<string, EconomyOfferDefinition>,
  npcDecisions: readonly EconomyNpcDecision[],
): EconomyInspection<EconomyActionDefinition> {
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
    return fail('A ação econômica é inválida.');
  }
  if (value.npcId !== undefined && !nonEmpty(value.npcId)) {
    return fail('A ação econômica é inválida.');
  }
  const requirements: EconomyRequirement[] = [];
  for (const entry of value.requirements) {
    const inspected = inspectRequirement(entry);
    if (!inspected.ok) {
      return inspected;
    }
    requirements.push(inspected.value);
  }
  const effects: EconomyEffect[] = [];
  for (const entry of value.effects) {
    const inspected = inspectEffect(entry, currencyById, propertyById, offerById);
    if (!inspected.ok) {
      return inspected;
    }
    effects.push(inspected.value);
  }
  if (value.npcId) {
    const intent = inferIntent(effects);
    if (!npcDecisions.some((decision) => decision.npcId === value.npcId && decision.intent === intent)) {
      return fail('A ação econômica referencia uma decisão de NPC inexistente.');
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

function inspectRequirement(value: unknown): EconomyInspection<EconomyRequirement> {
  if (!isRecord(value) || !nonEmpty(value.type)) {
    return fail('O requisito econômico é inválido.');
  }
  if (value.type === 'flag.is') {
    if (!nonEmpty(value.flag) || typeof value.value !== 'boolean') {
      return fail('O requisito econômico é inválido.');
    }
    return { ok: true, value: { type: 'flag.is', flag: value.flag, value: value.value } };
  }
  if (value.type === 'economy.has-item') {
    if (!nonEmpty(value.itemId) || !positiveInt(value.quantity)) {
      return fail('O requisito econômico é inválido.');
    }
    return { ok: true, value: { type: 'economy.has-item', itemId: value.itemId, quantity: value.quantity } };
  }
  if (value.type === 'economy.has-balance') {
    if (!nonEmpty(value.currencyId) || !positiveInt(value.amount)) {
      return fail('O requisito econômico é inválido.');
    }
    return { ok: true, value: { type: 'economy.has-balance', currencyId: value.currencyId, amount: value.amount } };
  }
  return fail('O requisito econômico é inválido.');
}

function inspectEffect(
  value: unknown,
  currencyById: Map<string, EconomyCurrencyDefinition>,
  propertyById: Map<string, EconomyPropertyDefinition>,
  offerById: Map<string, EconomyOfferDefinition>,
): EconomyInspection<EconomyEffect> {
  if (!isRecord(value) || !nonEmpty(value.type)) {
    return fail('O efeito econômico é inválido.');
  }
  if (value.type === 'flag.set') {
    if (!nonEmpty(value.flag) || typeof value.value !== 'boolean') {
      return fail('O efeito econômico é inválido.');
    }
    return { ok: true, value: { type: 'flag.set', flag: value.flag, value: value.value } };
  }
  if (value.type === 'economy.credit' || value.type === 'economy.debit') {
    if (!nonEmpty(value.currencyId) || !currencyById.has(value.currencyId) || !positiveInt(value.amount)) {
      return fail('O efeito de carteira é inválido.');
    }
    return { ok: true, value: { type: value.type, currencyId: value.currencyId, amount: value.amount } };
  }
  if (value.type === 'economy.add-item' || value.type === 'economy.remove-item') {
    if (!nonEmpty(value.itemId) || !positiveInt(value.quantity)) {
      return fail('O efeito de item é inválido.');
    }
    return { ok: true, value: { type: value.type, itemId: value.itemId, quantity: value.quantity } };
  }
  if (value.type === 'economy.consume-stock') {
    if (!nonEmpty(value.offerId) || !offerById.has(value.offerId) || !positiveInt(value.amount)) {
      return fail('O efeito de estoque é inválido.');
    }
    return { ok: true, value: { type: 'economy.consume-stock', offerId: value.offerId, amount: value.amount } };
  }
  if (value.type === 'economy.grant-property') {
    if (!nonEmpty(value.propertyId) || !propertyById.has(value.propertyId) || !nonEmpty(value.ownerId)) {
      return fail('O efeito de propriedade é inválido.');
    }
    return { ok: true, value: { type: 'economy.grant-property', propertyId: value.propertyId, ownerId: value.ownerId } };
  }
  return fail('O efeito econômico é inválido.');
}

function assertEffectsExecutable(
  catalog: IndexedEconomy,
  state: EconomyState,
  effects: readonly EconomyEffect[],
  gameState: GameState,
): void {
  let current = copyEconomyState(state);
  for (const effect of effects) {
    if (effect.type === 'economy.debit' && walletAmount(current, effect.currencyId) < effect.amount) {
      throw new EconomyError('O saldo é insuficiente.');
    }
    if (effect.type === 'economy.remove-item' && itemQuantity(gameState.inventory, effect.itemId) < effect.quantity) {
      throw new EconomyError('O inventário não possui o item da oferta.');
    }
    if (effect.type === 'economy.consume-stock') {
      const stock = current.stocks.find((entry) => entry.offerId === effect.offerId);
      if (!stock || stock.remaining < effect.amount) {
        throw new EconomyError('O estoque desta oferta acabou.');
      }
    }
    if (effect.type === 'economy.grant-property' && current.properties.some((entry) => entry.propertyId === effect.propertyId)) {
      throw new EconomyError('Esta propriedade já possui um titular.');
    }
    current = applyEconomyEffect(current, effect);
  }
  void catalog;
}

function applyEconomyEffect(state: EconomyState, effect: EconomyEffect): EconomyState {
  if (effect.type === 'flag.set' || effect.type === 'economy.add-item' || effect.type === 'economy.remove-item') {
    return state;
  }
  const current = copyEconomyState(state);
  if (effect.type === 'economy.credit') {
    const wallet = current.wallets.find((entry) => entry.currencyId === effect.currencyId);
    if (wallet) {
      wallet.amount += effect.amount;
    } else {
      current.wallets.push({ currencyId: effect.currencyId, amount: effect.amount });
    }
    return current;
  }
  if (effect.type === 'economy.debit') {
    const wallet = current.wallets.find((entry) => entry.currencyId === effect.currencyId);
    if (!wallet || wallet.amount < effect.amount) {
      throw new EconomyError('O saldo é insuficiente.');
    }
    wallet.amount -= effect.amount;
    return current;
  }
  if (effect.type === 'economy.consume-stock') {
    const stock = current.stocks.find((entry) => entry.offerId === effect.offerId);
    if (!stock || stock.remaining < effect.amount) {
      throw new EconomyError('O estoque desta oferta acabou.');
    }
    stock.remaining -= effect.amount;
    return current;
  }
  current.properties.push({ propertyId: effect.propertyId, ownerId: effect.ownerId });
  return current;
}

function requirementMet(requirement: EconomyRequirement, state: EconomyState, gameState: GameState): boolean {
  if (requirement.type === 'flag.is') {
    return gameState.flags[requirement.flag] === requirement.value;
  }
  if (requirement.type === 'economy.has-item') {
    return itemQuantity(gameState.inventory, requirement.itemId) >= requirement.quantity;
  }
  return walletAmount(state, requirement.currencyId) >= requirement.amount;
}

function npcAllows(
  catalog: IndexedEconomy,
  action: EconomyActionDefinition,
  state: EconomyState,
  gameState: GameState,
): boolean {
  const intent = inferIntent(action.effects);
  const decision = catalog.npcDecisions.find((entry) => entry.npcId === action.npcId && entry.intent === intent);
  if (!decision) {
    return false;
  }
  return decision.requirements.every((requirement) => requirementMet(requirement, state, gameState));
}

function inferIntent(effects: readonly EconomyEffect[]): EconomyIntent {
  return effects.some((effect) => effect.type === 'economy.grant-property') ? 'grant-property' : 'trade';
}

function walletAmount(state: EconomyState, currencyId: string): number {
  return state.wallets.find((entry) => entry.currencyId === currencyId)?.amount ?? 0;
}

function isIntent(value: unknown): value is EconomyIntent {
  return typeof value === 'string' && INTENTS.includes(value as EconomyIntent);
}

function isOfferKind(value: unknown): value is EconomyOfferKind {
  return typeof value === 'string' && OFFER_KINDS.includes(value as EconomyOfferKind);
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

function positiveInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function nonNegativeInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}
