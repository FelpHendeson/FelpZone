import { inspectTimeCost } from '../time';
import { DEFAULT_CONSUMABLES, DEFAULT_NEEDS_DECAY, DEFAULT_REST_MODES, INITIAL_NEEDS_SNAPSHOT } from './catalogs';
import { ImmutableIndex } from './immutable-index';
import {
  NEED_IDS,
  REST_MODES,
  NeedsError,
  type AppliedNeedEffect,
  type ConsumableDefinition,
  type IndexedConsumables,
  type IndexedRestModes,
  type NeedBand,
  type NeedEffect,
  type NeedId,
  type NeedsConsumptionPlan,
  type NeedsDecayConfig,
  type NeedsDelta,
  type NeedsInspection,
  type NeedsRestPlan,
  type NeedsSnapshot,
  type NeedsWearResult,
  type RestDefinition,
  type RestMode,
} from './types';

export { DEFAULT_CONSUMABLES, DEFAULT_NEEDS_DECAY, DEFAULT_REST_MODES, INITIAL_NEEDS_SNAPSHOT, NeedsError };
export type {
  AppliedNeedEffect,
  ConsumableDefinition,
  IndexedConsumables,
  IndexedRestModes,
  NeedBand,
  NeedEffect,
  NeedId,
  NeedsConsumptionPlan,
  NeedsDecayConfig,
  NeedsDelta,
  NeedsInspection,
  NeedsRestPlan,
  NeedsSnapshot,
  NeedsWearResult,
  NeedsWearSummary,
  RestDefinition,
  RestMode,
} from './types';

export const MAX_NEEDS_PERIODS = 10_000;

export const INITIAL_CONSUMABLES = indexConsumableCatalog(DEFAULT_CONSUMABLES);
export const INITIAL_REST_MODES = indexRestCatalog(DEFAULT_REST_MODES);

export function createInitialNeedsSnapshot(): NeedsSnapshot {
  return copySnapshot(INITIAL_NEEDS_SNAPSHOT);
}

export function inspectNeedsSnapshot(value: unknown): NeedsInspection<NeedsSnapshot> {
  if (!isRecord(value)) {
    return fail('O estado de necessidades é inválido.');
  }

  for (const needId of NEED_IDS) {
    if (!isNeedValue(value[needId])) {
      return fail('Cada necessidade precisa ser um inteiro entre 0 e 100.');
    }
  }

  return {
    ok: true,
    value: {
      saude: value.saude as number,
      energia: value.energia as number,
      fome: value.fome as number,
      sede: value.sede as number,
    },
  };
}

export function inspectNeedsDecayConfig(value: unknown): NeedsInspection<NeedsDecayConfig> {
  if (!isRecord(value)) {
    return fail('A configuração de desgaste das necessidades é inválida.');
  }

  const fields = [
    value.hungerPerPeriod,
    value.thirstPerPeriod,
    value.energyLossPerPeriod,
    value.healthLossAtMaxHunger,
    value.healthLossAtMaxThirst,
    value.healthLossAtZeroEnergy,
  ];

  if (fields.some((entry) => !isNeedValue(entry))) {
    return fail('Os valores de desgaste precisam ser inteiros entre 0 e 100.');
  }

  if (!isNeedValue(value.minimumHealthFromNeeds) || value.minimumHealthFromNeeds < 1) {
    return fail('O piso de saúde das necessidades precisa ser um inteiro entre 1 e 100.');
  }

  return {
    ok: true,
    value: {
      hungerPerPeriod: value.hungerPerPeriod as number,
      thirstPerPeriod: value.thirstPerPeriod as number,
      energyLossPerPeriod: value.energyLossPerPeriod as number,
      healthLossAtMaxHunger: value.healthLossAtMaxHunger as number,
      healthLossAtMaxThirst: value.healthLossAtMaxThirst as number,
      healthLossAtZeroEnergy: value.healthLossAtZeroEnergy as number,
      minimumHealthFromNeeds: value.minimumHealthFromNeeds as number,
    },
  };
}

export function inspectNeedsPeriods(value: unknown): NeedsInspection<number> {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    return fail('A quantidade de períodos precisa ser um inteiro não negativo.');
  }

  if (value > MAX_NEEDS_PERIODS) {
    return fail(`A quantidade de períodos excede o limite de ${MAX_NEEDS_PERIODS}.`);
  }

  return { ok: true, value };
}

export function applyNeedsWear(
  snapshot: NeedsSnapshot,
  periods: number,
  config: NeedsDecayConfig = DEFAULT_NEEDS_DECAY,
): NeedsWearResult {
  const previous = requireSnapshot(snapshot);
  const resolvedPeriods = requirePeriods(periods);
  const resolvedConfig = requireDecayConfig(config);
  const current = copySnapshot(previous);
  const criticalPeriods = { fome: 0, sede: 0, energia: 0 };
  let requestedHealthDamage = 0;

  for (let period = 0; period < resolvedPeriods; period += 1) {
    current.fome = clampNeed(current.fome + resolvedConfig.hungerPerPeriod);
    current.sede = clampNeed(current.sede + resolvedConfig.thirstPerPeriod);
    current.energia = clampNeed(current.energia - resolvedConfig.energyLossPerPeriod);

    let periodDamage = 0;
    if (current.fome === 100) {
      criticalPeriods.fome += 1;
      periodDamage += resolvedConfig.healthLossAtMaxHunger;
    }
    if (current.sede === 100) {
      criticalPeriods.sede += 1;
      periodDamage += resolvedConfig.healthLossAtMaxThirst;
    }
    if (current.energia === 0) {
      criticalPeriods.energia += 1;
      periodDamage += resolvedConfig.healthLossAtZeroEnergy;
    }

    requestedHealthDamage += periodDamage;
    if (current.saude >= resolvedConfig.minimumHealthFromNeeds) {
      current.saude = Math.max(
        resolvedConfig.minimumHealthFromNeeds,
        current.saude - periodDamage,
      );
    }
  }

  return {
    previous: copySnapshot(previous),
    current,
    summary: {
      periodsApplied: resolvedPeriods,
      changes: getDelta(previous, current),
      criticalPeriods,
      requestedHealthDamage,
      appliedHealthDamage: Math.max(0, previous.saude - current.saude),
    },
  };
}

export function inspectConsumableCatalog(value: unknown): NeedsInspection<IndexedConsumables> {
  if (!Array.isArray(value)) {
    return fail('O catálogo de consumíveis é inválido.');
  }

  const consumables: Readonly<ConsumableDefinition>[] = [];
  const seen = new Set<string>();

  for (const entry of value) {
    if (!isRecord(entry) || typeof entry.itemId !== 'string' || entry.itemId.trim() === '') {
      return fail('O catálogo possui identificadores de item inválidos.');
    }
    if (seen.has(entry.itemId)) {
      return fail('O catálogo possui identificadores de item repetidos.');
    }

    const effects = inspectEffects(entry.effects, 'O consumível possui efeitos inválidos.');
    if (!effects.ok) {
      return effects;
    }

    seen.add(entry.itemId);
    consumables.push(freezeConsumable({ itemId: entry.itemId, effects: effects.value }));
  }

  return {
    ok: true,
    value: freezeConsumableIndex(consumables),
  };
}

export function indexConsumableCatalog(value: unknown): IndexedConsumables {
  const inspected = inspectConsumableCatalog(value);
  if (!inspected.ok) {
    throw new NeedsError(inspected.reason);
  }
  return inspected.value;
}

export function planNeedsConsumption(
  snapshot: NeedsSnapshot,
  itemId: string,
  catalog: IndexedConsumables = INITIAL_CONSUMABLES,
): NeedsConsumptionPlan {
  const previous = requireSnapshot(snapshot);
  const indexed = requireConsumableIndex(catalog);

  if (typeof itemId !== 'string' || itemId.trim() === '') {
    throw new NeedsError('O item informado é inválido.');
  }

  const consumable = indexed.byItemId.get(itemId);
  if (!consumable) {
    throw new NeedsError('Este item não é consumível.');
  }

  const applied = applyEffects(previous, consumable.effects);
  return {
    previous: copySnapshot(previous),
    current: applied.current,
    itemId: consumable.itemId,
    quantity: 1,
    effects: consumable.effects.map(copyEffect),
    appliedEffects: applied.appliedEffects,
    timeCost: { periods: 0 },
  };
}

export function inspectRestCatalog(value: unknown): NeedsInspection<IndexedRestModes> {
  if (!Array.isArray(value)) {
    return fail('O catálogo de repouso é inválido.');
  }

  const restModes: Readonly<RestDefinition>[] = [];
  const seen = new Set<RestMode>();

  for (const entry of value) {
    if (!isRecord(entry) || !isRestMode(entry.id)) {
      return fail('O catálogo de repouso possui modalidades inválidas.');
    }
    if (seen.has(entry.id)) {
      return fail('O catálogo de repouso possui modalidades repetidas.');
    }

    const effects = inspectEffects(entry.effects, 'A modalidade de repouso possui efeitos inválidos.');
    if (!effects.ok) {
      return effects;
    }

    const timeCost = inspectTimeCost(entry.timeCost);
    if (!timeCost.ok || timeCost.value.periods <= 0) {
      return fail('O custo do repouso precisa ser um inteiro positivo válido.');
    }

    seen.add(entry.id);
    restModes.push(freezeRestDefinition({
      id: entry.id,
      effects: effects.value,
      timeCost: { periods: timeCost.value.periods },
    }));
  }

  for (const mode of REST_MODES) {
    if (!seen.has(mode)) {
      return fail('O catálogo de repouso precisa conter todas as modalidades aprovadas.');
    }
  }

  return { ok: true, value: freezeRestIndex(restModes) };
}

export function indexRestCatalog(value: unknown): IndexedRestModes {
  const inspected = inspectRestCatalog(value);
  if (!inspected.ok) {
    throw new NeedsError(inspected.reason);
  }
  return inspected.value;
}

export function planNeedsRest(
  snapshot: NeedsSnapshot,
  mode: RestMode,
  catalog: IndexedRestModes = INITIAL_REST_MODES,
): NeedsRestPlan {
  const previous = requireSnapshot(snapshot);
  const indexed = requireRestIndex(catalog);

  if (!isRestMode(mode)) {
    throw new NeedsError('A modalidade de repouso é inválida.');
  }

  const rest = indexed.byId.get(mode);
  if (!rest) {
    throw new NeedsError('A modalidade de repouso não existe.');
  }

  const applied = applyEffects(previous, rest.effects);
  return {
    previous: copySnapshot(previous),
    current: applied.current,
    mode: rest.id,
    effects: rest.effects.map(copyEffect),
    appliedEffects: applied.appliedEffects,
    timeCost: { periods: rest.timeCost.periods },
  };
}

export function deriveNeedBand(needId: NeedId, value: number): NeedBand {
  if (!isNeedId(needId) || !isNeedValue(value)) {
    throw new NeedsError('A necessidade informada é inválida.');
  }

  if (needId === 'fome' || needId === 'sede') {
    if (value === 100) return 'critical';
    if (value >= 75) return 'urgent';
    if (value >= 50) return 'attention';
    return 'stable';
  }

  if (value === 0) return 'critical';
  if (value <= 24) return 'urgent';
  if (value <= 49) return 'attention';
  return 'stable';
}

export function deriveNeedsBands(snapshot: NeedsSnapshot): Record<NeedId, NeedBand> {
  const current = requireSnapshot(snapshot);
  return {
    saude: deriveNeedBand('saude', current.saude),
    energia: deriveNeedBand('energia', current.energia),
    fome: deriveNeedBand('fome', current.fome),
    sede: deriveNeedBand('sede', current.sede),
  };
}

function applyEffects(
  snapshot: NeedsSnapshot,
  effects: readonly NeedEffect[],
): { current: NeedsSnapshot; appliedEffects: AppliedNeedEffect[] } {
  const current = copySnapshot(snapshot);
  const appliedEffects: AppliedNeedEffect[] = [];

  for (const effect of effects) {
    const previousValue = current[effect.needId];
    const nextValue = clampNeed(previousValue + effect.amount);
    current[effect.needId] = nextValue;
    const amount = nextValue - previousValue;
    appliedEffects.push({
      needId: effect.needId,
      amount,
      requestedAmount: effect.amount,
      limited: amount !== effect.amount,
    });
  }

  return { current, appliedEffects };
}

function inspectEffects(value: unknown, reason: string): NeedsInspection<NeedEffect[]> {
  if (!Array.isArray(value) || value.length === 0) {
    return fail(reason);
  }

  const effects: NeedEffect[] = [];
  const seen = new Set<NeedId>();
  for (const entry of value) {
    if (!isRecord(entry) || !isNeedId(entry.needId) || !isEffectAmount(entry.amount)) {
      return fail(reason);
    }
    if (seen.has(entry.needId)) {
      return fail('Uma definição não pode repetir a mesma necessidade.');
    }

    seen.add(entry.needId);
    effects.push({ needId: entry.needId, amount: entry.amount });
  }
  return { ok: true, value: effects };
}

function requireSnapshot(value: NeedsSnapshot): NeedsSnapshot {
  const inspected = inspectNeedsSnapshot(value);
  if (!inspected.ok) throw new NeedsError(inspected.reason);
  return inspected.value;
}

function requireDecayConfig(value: NeedsDecayConfig): NeedsDecayConfig {
  const inspected = inspectNeedsDecayConfig(value);
  if (!inspected.ok) throw new NeedsError(inspected.reason);
  return inspected.value;
}

function requirePeriods(value: number): number {
  const inspected = inspectNeedsPeriods(value);
  if (!inspected.ok) throw new NeedsError(inspected.reason);
  return inspected.value;
}

function requireConsumableIndex(value: IndexedConsumables): IndexedConsumables {
  if (!isRecord(value) || !Array.isArray(value.consumables) || !(value.byItemId instanceof ImmutableIndex)) {
    throw new NeedsError('O catálogo indexado de consumíveis é inválido.');
  }

  const normalized = indexConsumableCatalog(value.consumables);
  const entries = [...value.byItemId.entries()];
  if (
    entries.length !== normalized.consumables.length ||
    !normalized.consumables.every((definition, index) => {
      const entry = entries[index];
      return entry?.[0] === definition.itemId && sameConsumable(definition, entry[1]);
    })
  ) {
    throw new NeedsError('O catálogo indexado de consumíveis é inconsistente.');
  }

  return normalized;
}

function requireRestIndex(value: IndexedRestModes): IndexedRestModes {
  if (!isRecord(value) || !Array.isArray(value.restModes) || !(value.byId instanceof ImmutableIndex)) {
    throw new NeedsError('O catálogo indexado de repouso é inválido.');
  }

  const normalized = indexRestCatalog(value.restModes);
  const entries = [...value.byId.entries()];
  if (
    entries.length !== normalized.restModes.length ||
    !normalized.restModes.every((definition, index) => {
      const entry = entries[index];
      return entry?.[0] === definition.id && sameRestDefinition(definition, entry[1]);
    })
  ) {
    throw new NeedsError('O catálogo indexado de repouso é inconsistente.');
  }

  return normalized;
}

function freezeConsumableIndex(consumables: readonly Readonly<ConsumableDefinition>[]): IndexedConsumables {
  return Object.freeze({
    consumables: Object.freeze([...consumables]),
    byItemId: new ImmutableIndex(consumables.map((entry) => [entry.itemId, entry] as const)),
  });
}

function freezeRestIndex(restModes: readonly Readonly<RestDefinition>[]): IndexedRestModes {
  return Object.freeze({
    restModes: Object.freeze([...restModes]),
    byId: new ImmutableIndex(restModes.map((entry) => [entry.id, entry] as const)),
  });
}

function freezeConsumable(definition: ConsumableDefinition): Readonly<ConsumableDefinition> {
  return Object.freeze({
    itemId: definition.itemId,
    effects: Object.freeze(definition.effects.map((effect) => Object.freeze(copyEffect(effect)))),
  });
}

function freezeRestDefinition(definition: RestDefinition): Readonly<RestDefinition> {
  return Object.freeze({
    id: definition.id,
    effects: Object.freeze(definition.effects.map((effect) => Object.freeze(copyEffect(effect)))),
    timeCost: Object.freeze({ periods: definition.timeCost.periods }),
  });
}

function getDelta(previous: NeedsSnapshot, current: NeedsSnapshot): NeedsDelta {
  return {
    saude: current.saude - previous.saude,
    energia: current.energia - previous.energia,
    fome: current.fome - previous.fome,
    sede: current.sede - previous.sede,
  };
}

function copySnapshot(snapshot: Readonly<NeedsSnapshot>): NeedsSnapshot {
  return {
    saude: snapshot.saude,
    energia: snapshot.energia,
    fome: snapshot.fome,
    sede: snapshot.sede,
  };
}

function copyEffect(effect: Readonly<NeedEffect>): NeedEffect {
  return { needId: effect.needId, amount: effect.amount };
}

function sameConsumable(left: Readonly<ConsumableDefinition>, right: unknown): boolean {
  return isRecord(right) && right.itemId === left.itemId && sameEffects(left.effects, right.effects);
}

function sameRestDefinition(left: Readonly<RestDefinition>, right: unknown): boolean {
  return (
    isRecord(right) &&
    right.id === left.id &&
    sameEffects(left.effects, right.effects) &&
    isRecord(right.timeCost) &&
    right.timeCost.periods === left.timeCost.periods
  );
}

function sameEffects(left: readonly Readonly<NeedEffect>[], right: unknown): boolean {
  return (
    Array.isArray(right) &&
    right.length === left.length &&
    left.every((effect, index) => {
      const candidate = right[index];
      return isRecord(candidate) && candidate.needId === effect.needId && candidate.amount === effect.amount;
    })
  );
}

function clampNeed(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function isNeedId(value: unknown): value is NeedId {
  return typeof value === 'string' && (NEED_IDS as readonly string[]).includes(value);
}

function isRestMode(value: unknown): value is RestMode {
  return typeof value === 'string' && (REST_MODES as readonly string[]).includes(value);
}

function isNeedValue(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= 100;
}

function isEffectAmount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value !== 0 && value >= -100 && value <= 100;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function fail(reason: string): NeedsInspection<never> {
  return { ok: false, reason };
}
