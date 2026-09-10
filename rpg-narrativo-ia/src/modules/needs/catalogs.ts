import type { ConsumableDefinition, NeedsDecayConfig, NeedsSnapshot, RestDefinition } from './types';

export const INITIAL_NEEDS_SNAPSHOT = Object.freeze({
  saude: 80,
  energia: 70,
  fome: 30,
  sede: 25,
}) satisfies Readonly<NeedsSnapshot>;

export const DEFAULT_NEEDS_DECAY = Object.freeze({
  hungerPerPeriod: 3,
  thirstPerPeriod: 5,
  energyLossPerPeriod: 2,
  healthLossAtMaxHunger: 2,
  healthLossAtMaxThirst: 3,
  healthLossAtZeroEnergy: 1,
  minimumHealthFromNeeds: 1,
}) satisfies Readonly<NeedsDecayConfig>;

export const DEFAULT_CONSUMABLES = Object.freeze([
  Object.freeze({
    itemId: 'raw-water',
    effects: Object.freeze([Object.freeze({ needId: 'sede', amount: -45 })]),
  }),
  Object.freeze({
    itemId: 'agua-limpa',
    effects: Object.freeze([Object.freeze({ needId: 'sede', amount: -45 })]),
  }),
  Object.freeze({
    itemId: 'cooked-horned-rabbit-meat',
    effects: Object.freeze([
      Object.freeze({ needId: 'fome', amount: -36 }),
      Object.freeze({ needId: 'energia', amount: 6 }),
    ]),
  }),
  Object.freeze({
    itemId: 'fruto-desconhecido',
    effects: Object.freeze([Object.freeze({ needId: 'fome', amount: -12 })]),
  }),
]) satisfies readonly Readonly<ConsumableDefinition>[];

export const DEFAULT_REST_MODES = Object.freeze([
  Object.freeze({
    id: 'simple',
    effects: Object.freeze([Object.freeze({ needId: 'energia', amount: 24 })]),
    timeCost: Object.freeze({ periods: 2 }),
  }),
  Object.freeze({
    id: 'campfire',
    effects: Object.freeze([
      Object.freeze({ needId: 'energia', amount: 40 }),
      Object.freeze({ needId: 'saude', amount: 6 }),
    ]),
    timeCost: Object.freeze({ periods: 2 }),
  }),
]) satisfies readonly Readonly<RestDefinition>[];
