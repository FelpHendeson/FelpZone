import { describe, expect, it } from 'vitest';
import {
  ConditionError,
  INITIAL_CONDITIONS,
  applyCondition,
  cleanseConditions,
  indexConditionsCatalog,
  inspectConditionsCatalog,
  resolveElementInteraction,
  tickConditions,
} from '../modules/conditions';

describe('Fatias 15.1 a 15.3 — condições e elementos', () => {
  it('indexa a matriz elemental completa e o catálogo de condições', () => {
    expect(INITIAL_CONDITIONS.elements.map((entry) => entry.id)).toEqual(['physical', 'embers', 'water']);
    expect(resolveElementInteraction(INITIAL_CONDITIONS, 'water', 'embers')).toMatchObject({
      multiplier: 1.5,
      label: 'effective',
    });
    expect(INITIAL_CONDITIONS.conditionById.get('bleeding')?.lingering).toBe(false);
    expect(INITIAL_CONDITIONS.conditionById.get('lingering-wound')?.lingering).toBe(true);
  });

  it('mantém todos os índices realmente imutáveis', () => {
    expect(() => (INITIAL_CONDITIONS.elementById as Map<string, never>).clear()).toThrow(ConditionError);
    expect(() => (INITIAL_CONDITIONS.conditionById as Map<string, never>).clear()).toThrow(ConditionError);
    expect(() => (INITIAL_CONDITIONS.interactionByPair as Map<string, never>).clear()).toThrow(ConditionError);
  });

  it('rejeita catálogo sem relação explícita para cada par', () => {
    expect(
      inspectConditionsCatalog({
        elements: [{ id: 'a', name: 'A', description: 'd' }],
        interactions: [],
        conditions: [],
      }).ok,
    ).toBe(false);
    expect(() => indexConditionsCatalog(null)).toThrow(ConditionError);
  });

  it('rejeita relações elementais duplicadas ou com elementos desconhecidos', () => {
    const relation = { sourceElementId: 'a', targetElementId: 'a', multiplier: 1, label: 'neutral' } as const;
    expect(
      inspectConditionsCatalog({
        elements: [{ id: 'a', name: 'A', description: 'd' }],
        interactions: [relation, relation],
        conditions: [],
      }).ok,
    ).toBe(false);
    expect(
      inspectConditionsCatalog({
        elements: [{ id: 'a', name: 'A', description: 'd' }],
        interactions: [{ ...relation, targetElementId: 'ghost' }],
        conditions: [],
      }).ok,
    ).toBe(false);
  });

  it('aplica, renova e limpa condições sem mutar o estado anterior', () => {
    const first = applyCondition(INITIAL_CONDITIONS, [], {
      conditionId: 'bleeding',
      remainingTurns: 2,
      potency: 1,
      sourceCombatantId: 'player',
    });
    const refreshed = applyCondition(INITIAL_CONDITIONS, first, {
      conditionId: 'bleeding',
      remainingTurns: 3,
      potency: 1,
      sourceCombatantId: 'player',
    });
    expect(first[0].remainingTurns).toBe(2);
    expect(refreshed[0].remainingTurns).toBe(3);

    const ticked = tickConditions(INITIAL_CONDITIONS, refreshed, 'turn-end');
    expect(ticked.damage).toBe(2);
    expect(ticked.conditions[0].remainingTurns).toBe(2);
    expect(cleanseConditions(ticked.conditions, 'bleeding', 1)).toEqual([]);
  });
});
