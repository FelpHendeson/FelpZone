import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CONSUMABLES,
  DEFAULT_NEEDS_DECAY,
  DEFAULT_REST_MODES,
  MAX_NEEDS_PERIODS,
  NeedsError,
  applyNeedsWear,
  createInitialNeedsSnapshot,
  deriveNeedBand,
  deriveNeedsBands,
  indexConsumableCatalog,
  indexRestCatalog,
  inspectConsumableCatalog,
  inspectNeedsDecayConfig,
  inspectNeedsPeriods,
  inspectNeedsSnapshot,
  inspectRestCatalog,
  planNeedsConsumption,
  planNeedsRest,
  type NeedsSnapshot,
} from '../modules/needs';
import { ImmutableIndex } from '../modules/needs/immutable-index';

describe('necessidades e sobrevivência leve — modelo puro', () => {
  it('cria e valida o snapshot inicial isolado', () => {
    const first = createInitialNeedsSnapshot();
    const second = createInitialNeedsSnapshot();

    expect(first).toEqual({ saude: 80, energia: 70, fome: 30, sede: 25 });
    expect(inspectNeedsSnapshot(first)).toEqual({ ok: true, value: first });
    expect(first).not.toBe(second);
    first.fome = 99;
    expect(second.fome).toBe(30);
  });

  it('rejeita snapshot e configuração fora dos limites inteiros', () => {
    for (const invalid of [-1, 101, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(inspectNeedsSnapshot({ saude: 80, energia: 70, fome: invalid, sede: 25 }).ok).toBe(false);
    }

    expect(inspectNeedsSnapshot({ saude: 80, energia: 70, fome: 30 }).ok).toBe(false);
    expect(inspectNeedsDecayConfig(DEFAULT_NEEDS_DECAY).ok).toBe(true);
    expect(inspectNeedsDecayConfig({ ...DEFAULT_NEEDS_DECAY, thirstPerPeriod: -1 }).ok).toBe(false);
    expect(inspectNeedsDecayConfig({ ...DEFAULT_NEEDS_DECAY, energyLossPerPeriod: 1.5 }).ok).toBe(false);
    expect(inspectNeedsDecayConfig({ ...DEFAULT_NEEDS_DECAY, minimumHealthFromNeeds: 0 }).ok).toBe(false);
  });

  it('mantém os valores de desgaste aprovados', () => {
    expect(DEFAULT_NEEDS_DECAY).toEqual({
      hungerPerPeriod: 3,
      thirstPerPeriod: 5,
      energyLossPerPeriod: 2,
      healthLossAtMaxHunger: 2,
      healthLossAtMaxThirst: 3,
      healthLossAtZeroEnergy: 1,
      minimumHealthFromNeeds: 1,
    });
  });

  it('valida o limite operacional de períodos', () => {
    expect(inspectNeedsPeriods(0)).toEqual({ ok: true, value: 0 });
    expect(inspectNeedsPeriods(MAX_NEEDS_PERIODS)).toEqual({ ok: true, value: MAX_NEEDS_PERIODS });
    expect(inspectNeedsPeriods(-1).ok).toBe(false);
    expect(inspectNeedsPeriods(1.2).ok).toBe(false);
    expect(inspectNeedsPeriods(MAX_NEEDS_PERIODS + 1).ok).toBe(false);
    expect(() => applyNeedsWear(createInitialNeedsSnapshot(), MAX_NEEDS_PERIODS + 1)).toThrow(NeedsError);
  });

  it('zero períodos não altera valores nem reutiliza as referências', () => {
    const previous = Object.freeze(createInitialNeedsSnapshot());
    const result = applyNeedsWear(previous, 0);

    expect(result.previous).toEqual(previous);
    expect(result.current).toEqual(previous);
    expect(result.summary).toEqual({
      periodsApplied: 0,
      changes: { saude: 0, energia: 0, fome: 0, sede: 0 },
      criticalPeriods: { fome: 0, sede: 0, energia: 0 },
      requestedHealthDamage: 0,
      appliedHealthDamage: 0,
    });
    expect(result.previous).not.toBe(previous);
    expect(result.current).not.toBe(previous);
  });

  it('aplica um e vários períodos exatamente uma vez', () => {
    const start = createInitialNeedsSnapshot();
    const one = applyNeedsWear(start, 1);
    const four = applyNeedsWear(start, 4);

    expect(one.current).toEqual({ saude: 80, energia: 68, fome: 33, sede: 30 });
    expect(one.summary.changes).toEqual({ saude: 0, energia: -2, fome: 3, sede: 5 });
    expect(four.current).toEqual({ saude: 80, energia: 62, fome: 42, sede: 45 });
    expect(start).toEqual({ saude: 80, energia: 70, fome: 30, sede: 25 });
  });

  it('acumula penalidades críticas e preserva o piso de saúde', () => {
    const critical: NeedsSnapshot = { saude: 20, energia: 0, fome: 100, sede: 100 };
    const result = applyNeedsWear(critical, 5);

    expect(result.current).toEqual({ saude: 1, energia: 0, fome: 100, sede: 100 });
    expect(result.summary.criticalPeriods).toEqual({ fome: 5, sede: 5, energia: 5 });
    expect(result.summary.requestedHealthDamage).toBe(30);
    expect(result.summary.appliedHealthDamage).toBe(19);
  });

  it('mantém todos os valores entre 0 e 100 mesmo no limite operacional', () => {
    const result = applyNeedsWear({ saude: 100, energia: 100, fome: 0, sede: 0 }, MAX_NEEDS_PERIODS);
    for (const value of Object.values(result.current)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    }
    expect(result.current.saude).toBe(1);
  });

  it('valida os catálogos e rejeita IDs duplicados ou efeitos inválidos', () => {
    expect(inspectConsumableCatalog(DEFAULT_CONSUMABLES).ok).toBe(true);
    expect(() => indexConsumableCatalog([
      { itemId: 'agua', effects: [{ needId: 'sede', amount: -10 }] },
      { itemId: 'agua', effects: [{ needId: 'sede', amount: -20 }] },
    ])).toThrow(NeedsError);
    expect(inspectConsumableCatalog([
      { itemId: 'agua', effects: [{ needId: 'sede', amount: -101 }] },
    ]).ok).toBe(false);

    expect(inspectRestCatalog(DEFAULT_REST_MODES).ok).toBe(true);
    expect(() => indexRestCatalog([
      { id: 'simple', effects: [{ needId: 'energia', amount: 24 }], timeCost: { periods: 2 } },
      { id: 'simple', effects: [{ needId: 'energia', amount: 40 }], timeCost: { periods: 2 } },
    ])).toThrow(NeedsError);
    expect(inspectRestCatalog([
      { id: 'simple', effects: [{ needId: 'energia', amount: 24 }], timeCost: { periods: 0 } },
      { id: 'campfire', effects: [{ needId: 'energia', amount: 40 }], timeCost: { periods: 2 } },
    ]).ok).toBe(false);
  });

  it('planeja uma unidade de cada consumível aprovado sem inventário', () => {
    const start: NeedsSnapshot = { saude: 80, energia: 96, fome: 50, sede: 60 };

    expect(planNeedsConsumption(start, 'raw-water')).toMatchObject({
      current: { saude: 80, energia: 96, fome: 50, sede: 15 },
      itemId: 'raw-water',
      quantity: 1,
      timeCost: { periods: 0 },
    });
    expect(planNeedsConsumption(start, 'agua-limpa').current.sede).toBe(15);
    expect(planNeedsConsumption(start, 'cooked-horned-rabbit-meat')).toMatchObject({
      current: { saude: 80, energia: 100, fome: 14, sede: 60 },
      appliedEffects: [
        { needId: 'fome', amount: -36, requestedAmount: -36, limited: false },
        { needId: 'energia', amount: 4, requestedAmount: 6, limited: true },
      ],
    });
    expect(planNeedsConsumption(start, 'fruto-desconhecido').current.fome).toBe(38);
    expect(start).toEqual({ saude: 80, energia: 96, fome: 50, sede: 60 });
  });

  it('falha de forma controlada para item desconhecido ou não consumível', () => {
    const start = Object.freeze(createInitialNeedsSnapshot());
    const snapshot = structuredClone(start);

    expect(() => planNeedsConsumption(start, 'item-inexistente')).toThrow('Este item não é consumível.');
    expect(() => planNeedsConsumption(start, 'raw-horned-rabbit-meat')).toThrow('Este item não é consumível.');
    expect(start).toEqual(snapshot);
  });

  it('planeja repouso simples e junto à fogueira antes do desgaste do custo', () => {
    const start: NeedsSnapshot = { saude: 70, energia: 50, fome: 30, sede: 25 };
    const simple = planNeedsRest(start, 'simple');
    const campfire = planNeedsRest(start, 'campfire');

    expect(simple).toMatchObject({
      current: { saude: 70, energia: 74, fome: 30, sede: 25 },
      mode: 'simple',
      effects: [{ needId: 'energia', amount: 24 }],
      timeCost: { periods: 2 },
    });
    expect(campfire).toMatchObject({
      current: { saude: 76, energia: 90, fome: 30, sede: 25 },
      mode: 'campfire',
      effects: [
        { needId: 'energia', amount: 40 },
        { needId: 'saude', amount: 6 },
      ],
      timeCost: { periods: 2 },
    });
    expect(start).toEqual({ saude: 70, energia: 50, fome: 30, sede: 25 });
  });

  it('deriva as faixas documentadas sem persistir rótulos', () => {
    expect([0, 1, 24, 25, 49, 50, 100].map((value) => deriveNeedBand('saude', value))).toEqual([
      'critical', 'urgent', 'urgent', 'attention', 'attention', 'stable', 'stable',
    ]);
    expect([0, 49, 50, 74, 75, 99, 100].map((value) => deriveNeedBand('sede', value))).toEqual([
      'stable', 'stable', 'attention', 'attention', 'urgent', 'urgent', 'critical',
    ]);
    expect(deriveNeedsBands({ saude: 0, energia: 24, fome: 74, sede: 100 })).toEqual({
      saude: 'critical', energia: 'urgent', fome: 'attention', sede: 'critical',
    });
  });

  it('não muta entradas congeladas e protege profundamente os catálogos indexados', () => {
    const input = Object.freeze([
      Object.freeze({
        itemId: 'teste',
        effects: Object.freeze([Object.freeze({ needId: 'sede' as const, amount: -10 })]),
      }),
    ]);
    const indexed = indexConsumableCatalog(input);
    const definition = indexed.byItemId.get('teste');

    expect(input[0].effects[0].amount).toBe(-10);
    expect(Object.isFrozen(indexed)).toBe(true);
    expect(Object.isFrozen(indexed.consumables)).toBe(true);
    expect(Object.isFrozen(definition)).toBe(true);
    expect(Object.isFrozen(definition?.effects)).toBe(true);
    expect(Object.isFrozen(definition?.effects[0])).toBe(true);
    expect('set' in indexed.byItemId).toBe(false);

    const rest = indexRestCatalog(DEFAULT_REST_MODES);
    const campfire = rest.byId.get('campfire');
    expect(Object.isFrozen(rest)).toBe(true);
    expect(Object.isFrozen(rest.restModes)).toBe(true);
    expect(Object.isFrozen(campfire)).toBe(true);
    expect(Object.isFrozen(campfire?.effects)).toBe(true);
    expect(Object.isFrozen(campfire?.timeCost)).toBe(true);
    expect('set' in rest.byId).toBe(false);

    const start = Object.freeze(createInitialNeedsSnapshot());
    const decay = Object.freeze({ ...DEFAULT_NEEDS_DECAY });
    applyNeedsWear(start, 2, decay);
    expect(start).toEqual({ saude: 80, energia: 70, fome: 30, sede: 25 });
    expect(decay).toEqual(DEFAULT_NEEDS_DECAY);
  });

  it('rejeita índices redundantes ausentes, extras, fora de ordem ou divergentes', () => {
    const consumables = indexConsumableCatalog(DEFAULT_CONSUMABLES);
    const consumableEntries = [...consumables.byItemId.entries()];
    const missingConsumable = {
      consumables: consumables.consumables,
      byItemId: new ImmutableIndex(consumableEntries.slice(1)),
    };
    const extraConsumable = {
      consumables: consumables.consumables,
      byItemId: new ImmutableIndex([
        ...consumableEntries,
        ['extra', { itemId: 'extra', effects: [{ needId: 'sede' as const, amount: -1 }] }] as const,
      ]),
    };
    const reversedConsumables = {
      consumables: consumables.consumables,
      byItemId: new ImmutableIndex([...consumableEntries].reverse()),
    };
    const divergentConsumable = {
      consumables: consumables.consumables,
      byItemId: new ImmutableIndex(
        consumableEntries.map(([key, value], index) => [
          key,
          index === 0 ? { ...value, effects: [{ needId: 'sede' as const, amount: -1 }] } : value,
        ] as const),
      ),
    };

    for (const forged of [missingConsumable, extraConsumable, reversedConsumables, divergentConsumable]) {
      expect(() => planNeedsConsumption(createInitialNeedsSnapshot(), 'raw-water', forged)).toThrow(/inconsistente/);
    }

    const rests = indexRestCatalog(DEFAULT_REST_MODES);
    const restEntries = [...rests.byId.entries()];
    const divergentRest = {
      restModes: rests.restModes,
      byId: new ImmutableIndex(
        restEntries.map(([key, value], index) => [
          key,
          index === 0 ? { ...value, timeCost: { periods: 3 } } : value,
        ] as const),
      ),
    };

    expect(() => planNeedsRest(createInitialNeedsSnapshot(), 'simple', divergentRest)).toThrow(/inconsistente/);
  });

  it('prova sete dias sustentáveis com uma água, uma carne e um repouso simples por dia', () => {
    let needs = createInitialNeedsSnapshot();
    let waterUsed = 0;
    let meatUsed = 0;
    let rests = 0;

    for (let day = 1; day <= 7; day += 1) {
      needs = applyNeedsWear(needs, 4).current;
      needs = planNeedsConsumption(needs, 'raw-water').current;
      waterUsed += 1;
      needs = planNeedsConsumption(needs, 'cooked-horned-rabbit-meat').current;
      meatUsed += 1;

      const rest = planNeedsRest(needs, 'simple');
      needs = applyNeedsWear(rest.current, rest.timeCost.periods).current;
      rests += 1;
    }

    expect(waterUsed / 7).toBeLessThanOrEqual(1);
    expect(meatUsed / 7).toBeLessThanOrEqual(1);
    expect(rests).toBe(7);
    expect(needs).toEqual({ saude: 80, energia: 96, fome: 6, sede: 10 });
    expect(needs.saude).toBeGreaterThan(1);
    expect(needs.energia).toBeGreaterThan(0);
  });
});
