import { describe, expect, it } from 'vitest';
import { firstDayCampaign } from '../campaigns/first-day';
import { createInitialState, inspectGameState, type GameState } from '../core/state';
import {
  indexObjectiveCatalog,
  type IndexedObjectives,
  type ObjectiveCriterion,
} from '../modules/objectives';
import { createSandboxContext } from '../modules/sandbox';
import { executeSandboxAction, SandboxActionError, type SandboxAction } from '../modules/sandbox-actions';
import { playChoices } from './helpers';

const context = createSandboxContext();
const STAMP = '2026-09-11T15:00:00.000Z';

function objectiveCatalog(criterion: ObjectiveCriterion): IndexedObjectives {
  return indexObjectiveCatalog({
    objectives: [
      {
        id: 'action-proof',
        title: 'Prova da ação',
        description: 'Confirma a integração do orquestrador.',
        kind: 'main',
        stepMode: 'sequential',
        activation: { type: 'automatic' },
        steps: [{ id: 'proof', title: 'Concluir ação', criteria: [criterion] }],
      },
    ],
  });
}

function exploring(catalog: IndexedObjectives): GameState {
  const initial = createInitialState(
    { firstName: 'Ana', lastName: 'Cruz' },
    firstDayCampaign,
    () => STAMP,
    context,
    catalog,
  );
  return playChoices(
    initial,
    ['awake-calm', 'system-touch', 'ability-perception'],
    firstDayCampaign,
    () => STAMP,
    catalog,
  );
}

function valid(state: GameState, catalog: IndexedObjectives): GameState {
  const inspected = inspectGameState(state, context, catalog);
  expect(inspected.ok).toBe(true);
  if (!inspected.ok) {
    throw new Error(inspected.reason);
  }
  return inspected.state;
}

function run(state: GameState, action: SandboxAction, catalog: IndexedObjectives) {
  return executeSandboxAction(state, action, {
    context,
    campaign: firstDayCampaign,
    objectives: catalog,
    now: () => STAMP,
  });
}

function expectCompleted(result: ReturnType<typeof run>): void {
  expect(result.objectives.completedSteps).toEqual([{ objectiveId: 'action-proof', stepId: 'proof' }]);
  expect(result.objectives.completedObjectiveIds).toEqual(['action-proof']);
  expect(result.current.objectives.entries[0]).toEqual({
    objectiveId: 'action-proof',
    completedStepIds: ['proof'],
    completed: true,
  });
}

describe('Fatia 10.3 — objetivos no orquestrador de ações', () => {
  it('sincroniza uma descoberta depois da exploração e não cobra tempo adicional', () => {
    const catalog = objectiveCatalog({ type: 'exploration.discovery.revealed', discoveryId: 'awakening-site' });
    const state = exploring(catalog);
    const result = run(state, { type: 'exploration.explore' }, catalog);

    expectCompleted(result);
    expect(result.timeCost.periods).toBe(1);
    expect(result.dayCycle.time.crossedPeriods).toHaveLength(1);
    expect(result.current.updatedAt).toBe(STAMP);

    const repeated = run(result.current, { type: 'exploration.explore' }, catalog);
    expect(repeated.objectives.completedSteps).toEqual([]);
    expect(repeated.objectives.completedObjectiveIds).toEqual([]);
  });

  it('sincroniza movimento, coleta e crafting contra o estado final de cada transação', () => {
    const moveCatalog = objectiveCatalog({ type: 'navigation.location.visited', locationId: 'great-tree' });
    const movable = valid(
      {
        ...exploring(moveCatalog),
        sandbox: {
          ...exploring(moveCatalog).sandbox,
          navigation: {
            ...exploring(moveCatalog).sandbox.navigation,
            discoveredLocationIds: [
              ...exploring(moveCatalog).sandbox.navigation.discoveredLocationIds,
              'great-tree',
            ],
            unlockedLocationIds: [
              ...exploring(moveCatalog).sandbox.navigation.unlockedLocationIds,
              'great-tree',
            ],
          },
        },
      },
      moveCatalog,
    );
    expectCompleted(run(movable, { type: 'navigation.move', locationId: 'great-tree' }, moveCatalog));

    const collectCatalog = objectiveCatalog({ type: 'inventory.item.quantity', itemId: 'fallen-branch', quantity: 1 });
    let collectable = exploring(collectCatalog);
    collectable = run(collectable, { type: 'exploration.explore' }, collectCatalog).current;
    collectable = run(collectable, { type: 'exploration.explore' }, collectCatalog).current;
    collectable = run(collectable, { type: 'exploration.explore' }, collectCatalog).current;
    expectCompleted(run(collectable, { type: 'resource.collect', nodeId: 'fallen-sticks', units: 1 }, collectCatalog));

    const craftCatalog = objectiveCatalog({
      type: 'crafting.structure.active',
      structureId: 'campfire',
      locationId: 'awakening-clearing',
    });
    const craftable = valid(
      { ...exploring(craftCatalog), inventory: [{ itemId: 'fallen-branch', quantity: 3 }] },
      craftCatalog,
    );
    expectCompleted(run(craftable, { type: 'crafting.craft', recipeId: 'build-campfire' }, craftCatalog));
  });

  it('sincroniza interação, consumo e repouso sem duplicar efeitos', () => {
    const presenceCatalog = objectiveCatalog({ type: 'presence.resolved', presenceId: 'mira-awakening-clearing' });
    const withMira = run(exploring(presenceCatalog), { type: 'exploration.explore' }, presenceCatalog).current;
    const talked = run(
      withMira,
      {
        type: 'presence.interact',
        presenceId: 'mira-awakening-clearing',
        interactionId: 'talk-mira-awakening-clearing',
      },
      presenceCatalog,
    );
    expectCompleted(talked);
    expect(talked.current.narrativeSession?.eventId).toBe('first-priority');

    const consumeCatalog = objectiveCatalog({ type: 'inventory.item.quantity', itemId: 'raw-water', quantity: 1 });
    const withWater = valid(
      { ...exploring(consumeCatalog), inventory: [{ itemId: 'raw-water', quantity: 2 }] },
      consumeCatalog,
    );
    const consumed = run(withWater, { type: 'needs.consume', itemId: 'raw-water' }, consumeCatalog);
    expectCompleted(consumed);
    expect(consumed.timeCost.periods).toBe(0);
    expect(consumed.current.inventory).toEqual([{ itemId: 'raw-water', quantity: 1 }]);

    const restCatalog = objectiveCatalog({ type: 'world.day.min', day: 2 });
    const atNight = valid(
      { ...exploring(restCatalog), world: { day: 1, period: 'noite' } },
      restCatalog,
    );
    const rested = run(atNight, { type: 'needs.rest', mode: 'simple' }, restCatalog);
    expectCompleted(rested);
    expect(rested.timeCost.periods).toBe(2);
    expect(rested.dayCycle.time.crossedPeriods).toHaveLength(2);
    expect(rested.current.world.day).toBe(2);
  });

  it('mantém a ação atômica quando o catálogo de objetivos é inválido', () => {
    const validCatalog = objectiveCatalog({ type: 'flag.is', flag: 'never', value: true });
    const state = exploring(validCatalog);
    const snapshot = structuredClone(state);
    const forged = {
      objectives: validCatalog.objectives,
      byId: new Map(),
    } as IndexedObjectives;

    expect(() => run(state, { type: 'exploration.explore' }, forged)).toThrow(SandboxActionError);
    expect(state).toEqual(snapshot);
  });
});
