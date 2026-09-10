import { describe, expect, it } from 'vitest';
import { inspectGameState, type Attributes, type GameState } from '../core/state';
import { executeSandboxAction, SandboxActionError } from '../modules/sandbox-actions';
import { freshState } from './helpers';

const STAMP = '2026-09-10T15:00:00.000Z';

function valid(state: GameState): GameState {
  const inspected = inspectGameState(state);
  expect(inspected.ok).toBe(true);
  if (!inspected.ok) {
    throw new Error(inspected.reason);
  }
  return inspected.state;
}

function withAttributes(state: GameState, attributes: Partial<Attributes>): GameState {
  return valid({
    ...state,
    attributes: { ...state.attributes, ...attributes },
  });
}

function withInventory(state: GameState, inventory: GameState['inventory']): GameState {
  return valid({ ...state, inventory });
}

function withCampfire(
  state: GameState,
  active = true,
  locationId = state.sandbox.navigation.currentLocationId,
): GameState {
  return valid({
    ...state,
    sandbox: {
      ...state.sandbox,
      crafting: {
        ...state.sandbox.crafting,
        structures: [{ structureId: 'campfire', locationId, active }],
      },
    },
  });
}

describe('Fatia 9.3 — ações e passagem do tempo', () => {
  it('aplica desgaste uma vez para cada período cobrado por uma ação existente', () => {
    const state = freshState();
    const snapshot = structuredClone(state);

    const result = executeSandboxAction(
      state,
      { type: 'exploration.explore' },
      { now: () => STAMP },
    );

    expect(result.timeCost).toEqual({ periods: 1 });
    expect(result.current.world).toEqual({ day: 1, period: 'manha' });
    expect(result.current.attributes).toEqual({
      saude: 80,
      energia: 68,
      fome: 33,
      sede: 30,
      humanidade: 50,
      cautela: 40,
    });
    expect(result.needsWear).toEqual({
      periodsApplied: 1,
      changes: { saude: 0, energia: -2, fome: 3, sede: 5 },
      criticalPeriods: { fome: 0, sede: 0, energia: 0 },
      requestedHealthDamage: 0,
      appliedHealthDamage: 0,
    });
    expect(state).toEqual(snapshot);
  });

  it('aplica primeiro o efeito do repouso e depois exatamente dois períodos de desgaste', () => {
    const state = withAttributes(freshState(), {
      saude: 60,
      energia: 30,
      fome: 20,
      sede: 10,
    });

    const result = executeSandboxAction(
      state,
      { type: 'needs.rest', mode: 'simple' },
      { now: () => STAMP },
    );

    expect(result.detail.type).toBe('needs.rest');
    if (result.detail.type !== 'needs.rest') {
      return;
    }
    expect(result.detail.plan.current.energia).toBe(54);
    expect(result.timeCost).toEqual({ periods: 2 });
    expect(result.needsWear.periodsApplied).toBe(2);
    expect(result.needsWear.changes).toEqual({ saude: 0, energia: -4, fome: 6, sede: 10 });
    expect(result.current.attributes).toEqual({
      saude: 60,
      energia: 50,
      fome: 26,
      sede: 20,
      humanidade: 50,
      cautela: 40,
    });
    expect(result.current.world).toEqual({ day: 1, period: 'meio-dia' });
  });

  it('mantém o piso de saúde quando necessidades críticas atravessam vários períodos', () => {
    const state = withAttributes(freshState(), {
      saude: 2,
      energia: 0,
      fome: 100,
      sede: 100,
    });

    const result = executeSandboxAction(
      state,
      { type: 'needs.rest', mode: 'simple' },
      { now: () => STAMP },
    );

    expect(result.current.attributes.saude).toBe(1);
    expect(result.current.attributes.energia).toBe(20);
    expect(result.needsWear.criticalPeriods).toEqual({ fome: 2, sede: 2, energia: 0 });
    expect(result.needsWear.requestedHealthDamage).toBe(10);
    expect(result.needsWear.appliedHealthDamage).toBe(1);
  });

  it('consome exatamente uma unidade sem cobrar tempo ou desgaste', () => {
    const state = withAttributes(
      withInventory(freshState(), [
        { itemId: 'raw-water', quantity: 2 },
        { itemId: 'fallen-branch', quantity: 1 },
      ]),
      { sede: 70 },
    );

    const result = executeSandboxAction(
      state,
      { type: 'needs.consume', itemId: 'raw-water' },
      { now: () => STAMP },
    );

    expect(result.detail.type).toBe('needs.consume');
    if (result.detail.type !== 'needs.consume') {
      return;
    }
    expect(result.detail.plan.appliedEffects).toEqual([
      { needId: 'sede', requestedAmount: -45, amount: -45, limited: false },
    ]);
    expect(result.current.inventory).toEqual([
      { itemId: 'raw-water', quantity: 1 },
      { itemId: 'fallen-branch', quantity: 1 },
    ]);
    expect(result.current.attributes.sede).toBe(25);
    expect(result.current.world).toEqual(state.world);
    expect(result.needsWear.periodsApplied).toBe(0);
    expect(result.needsWear.changes).toEqual({ saude: 0, energia: 0, fome: 0, sede: 0 });
  });

  it('informa recuperação limitada no consumo e remove a última unidade', () => {
    const state = withAttributes(
      withInventory(freshState(), [{ itemId: 'raw-water', quantity: 1 }]),
      { sede: 20 },
    );
    const result = executeSandboxAction(state, { type: 'needs.consume', itemId: 'raw-water' });

    expect(result.current.inventory).toEqual([]);
    expect(result.current.attributes.sede).toBe(0);
    expect(result.detail.type).toBe('needs.consume');
    if (result.detail.type === 'needs.consume') {
      expect(result.detail.plan.appliedEffects[0]).toEqual({
        needId: 'sede',
        requestedAmount: -45,
        amount: -20,
        limited: true,
      });
    }
  });

  it('exige uma fogueira ativa no local somente para o repouso aprimorado', () => {
    const state = withAttributes(freshState(), { saude: 50, energia: 20 });
    const before = structuredClone(state);

    expect(() => executeSandboxAction(state, { type: 'needs.rest', mode: 'campfire' })).toThrow(
      'É necessária uma fogueira ativa neste local para esse repouso.',
    );
    expect(state).toEqual(before);

    const inactive = withCampfire(state, false);
    expect(() => executeSandboxAction(inactive, { type: 'needs.rest', mode: 'campfire' })).toThrow(
      SandboxActionError,
    );

    const elsewhere = withCampfire(state, true, 'great-tree');
    expect(() => executeSandboxAction(elsewhere, { type: 'needs.rest', mode: 'campfire' })).toThrow(
      SandboxActionError,
    );

    const result = executeSandboxAction(
      withCampfire(state),
      { type: 'needs.rest', mode: 'campfire' },
      { now: () => STAMP },
    );
    expect(result.current.attributes.saude).toBe(56);
    expect(result.current.attributes.energia).toBe(56);
    expect(result.current.attributes.fome).toBe(36);
    expect(result.current.attributes.sede).toBe(35);
    expect(result.timeCost.periods).toBe(2);
  });

  it('falha atomicamente para item ausente, não consumível e ações malformadas', () => {
    const state = withInventory(freshState(), [{ itemId: 'raw-horned-rabbit-meat', quantity: 1 }]);
    const snapshot = structuredClone(state);

    expect(() => executeSandboxAction(state, { type: 'needs.consume', itemId: 'raw-water' })).toThrow(
      'O item consumível não está disponível no inventário.',
    );
    expect(() =>
      executeSandboxAction(state, { type: 'needs.consume', itemId: 'raw-horned-rabbit-meat' }),
    ).toThrow('Este item não é consumível.');
    expect(() =>
      executeSandboxAction(state, { type: 'needs.consume', itemId: '' }),
    ).toThrow('O item consumível é inválido.');
    expect(() =>
      executeSandboxAction(state, { type: 'needs.rest', mode: 'invalid' } as never),
    ).toThrow('A modalidade de repouso é inválida.');
    expect(state).toEqual(snapshot);
  });

  it('preserva humanidade, cautela, sandbox e persistibilidade nas novas ações', () => {
    const state = withInventory(freshState(), [{ itemId: 'cooked-horned-rabbit-meat', quantity: 1 }]);
    const consumed = executeSandboxAction(
      state,
      { type: 'needs.consume', itemId: 'cooked-horned-rabbit-meat' },
      { now: () => STAMP },
    );

    expect(consumed.current.attributes.humanidade).toBe(state.attributes.humanidade);
    expect(consumed.current.attributes.cautela).toBe(state.attributes.cautela);
    expect(consumed.current.sandbox).toEqual(state.sandbox);
    expect(inspectGameState(consumed.current).ok).toBe(true);
    expect(consumed.current.updatedAt).toBe(STAMP);
  });
});
