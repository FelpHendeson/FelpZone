import { describe, expect, it } from 'vitest';
import { firstDayCampaign } from '../campaigns/first-day';
import type { GameState } from '../core/state';
import { createSandboxContext } from '../modules/sandbox';
import { executeSandboxAction } from '../modules/sandbox-actions';
import { buildNeedsPresentation, formatNeedDelta } from '../ui/needs/presentation';
import { buildExplorationView, describeSandboxFeedback } from '../ui/sandbox';
import { playFirstDay } from './helpers';

const context = createSandboxContext();

function enterExploration(): GameState {
  return playFirstDay(['awake-calm', 'system-touch', 'ability-perception']);
}

function withState(overrides: Partial<GameState>): GameState {
  const initial = enterExploration();
  return {
    ...initial,
    ...overrides,
    attributes: overrides.attributes ?? initial.attributes,
    sandbox: overrides.sandbox ?? initial.sandbox,
  };
}

describe('Fatia 9.4 — superfície de necessidades', () => {
  it('apresenta as quatro necessidades com faixa textual e polaridade', () => {
    const state = withState({
      attributes: {
        ...enterExploration().attributes,
        saude: 0,
        energia: 24,
        fome: 75,
        sede: 100,
      },
    });

    expect(buildNeedsPresentation(state.attributes)).toEqual([
      expect.objectContaining({ id: 'saude', band: 'critical', bandLabel: 'Crítico', higherIsBetter: true }),
      expect.objectContaining({ id: 'energia', band: 'urgent', bandLabel: 'Urgente', higherIsBetter: true }),
      expect.objectContaining({ id: 'fome', band: 'urgent', bandLabel: 'Urgente', higherIsBetter: false }),
      expect.objectContaining({ id: 'sede', band: 'critical', bandLabel: 'Crítico', higherIsBetter: false }),
    ]);
    expect(formatNeedDelta('fome', -36)).toBe('Fome −36');
    expect(formatNeedDelta('sede', 5)).toBe('Sede +5');
  });

  it('marca somente itens aprovados como consumíveis e mostra o efeito limitado atual', () => {
    const state = withState({
      inventory: [
        { itemId: 'raw-water', quantity: 1 },
        { itemId: 'raw-horned-rabbit-meat', quantity: 1 },
        { itemId: 'cooked-horned-rabbit-meat', quantity: 1 },
      ],
      attributes: { ...enterExploration().attributes, sede: 20, fome: 20, energia: 98 },
    });
    const inventory = buildExplorationView(state, firstDayCampaign, context).inventory;

    expect(inventory.find((item) => item.itemId === 'raw-water')).toMatchObject({
      consumable: true,
      effects: [{ needId: 'sede', amount: -20, limited: true }],
    });
    expect(inventory.find((item) => item.itemId === 'raw-horned-rabbit-meat')).toMatchObject({
      consumable: false,
      effects: [],
    });
    expect(inventory.find((item) => item.itemId === 'cooked-horned-rabbit-meat')).toMatchObject({
      consumable: true,
      effects: [
        { needId: 'fome', amount: -20, limited: true },
        { needId: 'energia', amount: 2, limited: true },
      ],
    });
  });

  it('oferece repouso simples e troca para a melhoria quando há fogueira ativa no local', () => {
    const tired = withState({
      attributes: { ...enterExploration().attributes, energia: 20 },
    });
    const simple = buildExplorationView(tired, firstDayCampaign, context).rest;

    expect(simple).toMatchObject({
      mode: 'simple',
      label: 'Repousar',
      costPeriods: 2,
      recommended: true,
    });

    const byFire: GameState = {
      ...tired,
      sandbox: {
        ...tired.sandbox,
        crafting: {
          ...tired.sandbox.crafting,
          structures: [
            {
              structureId: 'campfire',
              locationId: tired.sandbox.navigation.currentLocationId,
              active: true,
            },
          ],
        },
      },
    };
    expect(buildExplorationView(byFire, firstDayCampaign, context).rest).toMatchObject({
      mode: 'campfire',
      label: 'Repousar junto à fogueira',
      effects: [
        { needId: 'energia', amount: 40, limited: false },
        { needId: 'saude', amount: 6, limited: false },
      ],
    });
  });

  it('descreve consumo e desgaste com sinais compreensíveis', () => {
    const state = withState({
      inventory: [{ itemId: 'raw-water', quantity: 1 }],
      attributes: { ...enterExploration().attributes, sede: 70 },
    });
    const consumed = executeSandboxAction(state, { type: 'needs.consume', itemId: 'raw-water' }, { context });
    const rested = executeSandboxAction(state, { type: 'needs.rest', mode: 'simple' }, { context });

    expect(describeSandboxFeedback(consumed, context)).toContain('Consumiu Água bruta. Sede −45.');
    expect(describeSandboxFeedback(consumed, context)).not.toContain('Desgaste:');
    expect(describeSandboxFeedback(rested, context)).toContain('Energia +24.');
    expect(describeSandboxFeedback(rested, context)).toContain('Desgaste: Energia −4, Fome +6, Sede +10.');
  });

  it('mantém recuperação disponível e comunica condição crítica sem modal', () => {
    const state = withState({
      attributes: { ...enterExploration().attributes, sede: 95 },
    });
    const result = executeSandboxAction(state, { type: 'needs.rest', mode: 'simple' }, { context });
    const feedback = describeSandboxFeedback(result, context);

    expect(result.current.attributes.sede).toBe(100);
    expect(feedback).toContain('Condição crítica: Sede. Ações de recuperação continuam disponíveis.');
    expect(buildExplorationView(result.current, firstDayCampaign, context).rest.mode).toBe('simple');
  });
});
