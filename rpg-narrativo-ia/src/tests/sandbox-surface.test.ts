import { describe, expect, it } from 'vitest';
import { firstDayCampaign } from '../campaigns/first-day';
import { FIRST_DAY_WORLD_TRIGGERS } from '../campaigns/first-day/world-triggers';
import { bindSavedState } from '../core/engine';
import { MISSING_MATERIALS_REASON } from '../modules/crafting';
import { itemQuantity } from '../modules/inventory';
import { getResourceNode } from '../modules/resources';
import { createSandboxContext } from '../modules/sandbox';
import { executeSandboxAction, type SandboxAction } from '../modules/sandbox-actions';
import { worldTriggerConsumedFlag } from '../modules/world-events';
import { createMemoryPersistence } from '../infrastructure/persistence';
import { buildExplorationView, commitSandboxAction, sandboxItemName } from '../ui/sandbox';
import { hasActiveNarrativeSession, resolvePlayScreen, toAppScreen } from '../ui/routing';
import { playFirstDay } from './helpers';

const context = createSandboxContext();

function enterExploration() {
  return playFirstDay(['awake-calm', 'system-touch', 'ability-perception']);
}

function viewOf(state: ReturnType<typeof enterExploration>) {
  return buildExplorationView(state, firstDayCampaign, context);
}

function destinationIds(state: ReturnType<typeof enterExploration>) {
  return viewOf(state).destinations.map((destination) => destination.locationId);
}

function resourceIds(state: ReturnType<typeof enterExploration>) {
  return viewOf(state).resources.map((resource) => resource.nodeId);
}

function commit(
  state: ReturnType<typeof enterExploration>,
  action: SandboxAction,
  persist?: (next: ReturnType<typeof enterExploration>) => void,
) {
  return commitSandboxAction(state, action, context, {
    campaign: firstDayCampaign,
    catalog: FIRST_DAY_WORLD_TRIGGERS,
    persist: persist ?? (() => undefined),
  });
}

function mustCommit(
  state: ReturnType<typeof enterExploration>,
  action: SandboxAction,
  persist?: (next: ReturnType<typeof enterExploration>) => void,
) {
  const attempt = commit(state, action, persist);
  expect(attempt.ok).toBe(true);
  if (!attempt.ok) {
    throw new Error(attempt.error);
  }

  return attempt;
}

function exploreTimes(state: ReturnType<typeof enterExploration>, times: number) {
  let current = state;
  for (let index = 0; index < times; index += 1) {
    current = executeSandboxAction(current, { type: 'exploration.explore' }, { context }).current;
  }

  return current;
}

describe('superfície mobile do sandbox', () => {
  it('revela progressivamente os três destinos da clareira', () => {
    const start = enterExploration();
    expect(destinationIds(start)).toEqual([]);

    const afterOne = exploreTimes(start, 1);
    expect(destinationIds(afterOne)).toEqual([]);

    const afterTwo = exploreTimes(start, 2);
    expect(destinationIds(afterTwo)).toEqual(['great-tree']);

    const afterFour = exploreTimes(start, 4);
    expect(destinationIds(afterFour)).toEqual(['great-tree', 'spring-lake']);

    const afterSix = exploreTimes(start, 6);
    expect(destinationIds(afterSix)).toEqual(['great-tree', 'spring-lake', 'dense-woods']);
  });

  it('não mostra destinos ocultos antes da descoberta', () => {
    const start = enterExploration();
    expect(destinationIds(start)).not.toContain('hidden-cave');
    expect(destinationIds(start)).not.toContain('horned-rabbit-forest');

    const afterTwo = exploreTimes(start, 2);
    expect(destinationIds(afterTwo)).toEqual(['great-tree']);
    expect(destinationIds(afterTwo)).not.toContain('spring-lake');
    expect(destinationIds(afterTwo)).not.toContain('dense-woods');
    expect(destinationIds(afterTwo)).not.toContain('hidden-cave');

    const woods = mustCommit(exploreTimes(start, 6), {
      type: 'navigation.move',
      locationId: 'dense-woods',
    }).current;
    expect(destinationIds(woods)).not.toContain('hidden-cave');
  });

  it('persiste o estado composto da ação, incluindo gatilho quando houver', () => {
    const exploring = enterExploration();
    const persistence = createMemoryPersistence(undefined, context);
    persistence.save(exploring);

    const attempt = mustCommit(exploring, { type: 'exploration.explore' }, (next) => persistence.save(next));
    const loaded = persistence.load();

    expect(attempt.current.sandbox).toEqual(attempt.result.current.sandbox);
    expect(attempt.current.narrativeSession).toEqual({ campaignId: 'first-day', eventId: 'first-priority' });
    expect(loaded).toEqual({ status: 'ok', state: attempt.current });
    expect(loaded.status === 'ok' && loaded.state).not.toEqual(exploring);
  });

  it('persiste somente result.current quando o gatilho já foi consumido', () => {
    const exploring = {
      ...enterExploration(),
      flags: {
        ...enterExploration().flags,
        [worldTriggerConsumedFlag('first-priority')]: true,
      },
    };
    const persistence = createMemoryPersistence(undefined, context);
    const attempt = mustCommit(exploring, { type: 'exploration.explore' }, (next) => persistence.save(next));
    const loaded = persistence.load();

    expect(attempt.current).toBe(attempt.result.current);
    expect(attempt.openedTrigger).toBeUndefined();
    expect(loaded).toEqual({ status: 'ok', state: attempt.result.current });
  });

  it('navega alterando local e relógio somente uma vez', () => {
    const ready = exploreTimes(enterExploration(), 2);
    const worldBefore = { ...ready.world };
    const attempt = mustCommit(ready, { type: 'navigation.move', locationId: 'great-tree' });

    expect(attempt.result.timeCost).toEqual({ periods: 1 });
    expect(attempt.result.dayCycle.time.crossedPeriods).toHaveLength(1);
    expect(attempt.current.sandbox.navigation.currentLocationId).toBe('great-tree');
    expect(attempt.previous.sandbox.navigation.currentLocationId).toBe('awakening-clearing');
    expect(attempt.current.world).not.toEqual(worldBefore);
    expect(attempt.previous.world).toEqual(worldBefore);
  });

  it('explora alterando progresso e relógio somente uma vez', () => {
    const exploring = enterExploration();
    const worldBefore = { ...exploring.world };
    const attempt = mustCommit(exploring, { type: 'exploration.explore' });
    const location = attempt.current.sandbox.exploration.locations.find(
      (entry) => entry.locationId === 'awakening-clearing',
    );

    expect(attempt.result.timeCost).toEqual({ periods: 1 });
    expect(attempt.result.dayCycle.time.crossedPeriods).toHaveLength(1);
    expect(location?.progress).toBe(10);
    expect(location?.explorationCount).toBe(1);
    expect(attempt.current.world).not.toEqual(worldBefore);
    expect(attempt.previous.world).toEqual(worldBefore);
    expect(attempt.current.inventory).toEqual(exploring.inventory);
  });

  it('mostra recursos somente depois da descoberta correspondente', () => {
    const start = enterExploration();
    expect(resourceIds(start)).toEqual([]);
    expect(resourceIds(exploreTimes(start, 2))).toEqual([]);

    const revealed = exploreTimes(start, 3);
    expect(resourceIds(revealed)).toEqual(['fallen-sticks']);
    expect(viewOf(revealed).resources[0]?.name).toBe('Gravetos caídos');
    expect(sandboxItemName('fallen-branch')).toBe('Graveto');
    expect(sandboxItemName('item-desconhecido')).toBe('item-desconhecido');
  });

  it('coleta atualiza inventário, disponibilidade e relógio', () => {
    const ready = exploreTimes(enterExploration(), 3);
    const worldBefore = { ...ready.world };
    const availableBefore = getResourceNode(ready.sandbox.resources, 'fallen-sticks').availableUnits;
    const attempt = mustCommit(ready, { type: 'resource.collect', nodeId: 'fallen-sticks', units: 1 });

    expect(attempt.result.timeCost).toEqual({ periods: 1 });
    expect(itemQuantity(attempt.current.inventory, 'fallen-branch')).toBe(1);
    expect(getResourceNode(attempt.current.sandbox.resources, 'fallen-sticks').availableUnits).toBe(
      availableBefore - 1,
    );
    expect(viewOf(attempt.current).inventory.some((item) => item.name === 'Graveto' && item.quantity === 1)).toBe(
      true,
    );
    expect(attempt.current.world).not.toEqual(worldBefore);
    expect(attempt.feedback).toMatch(/Graveto/);
  });

  it('mostra as receitas conhecidas', () => {
    const recipes = viewOf(enterExploration()).recipes.map((recipe) => recipe.recipeId);
    expect(recipes).toEqual(['build-campfire', 'cook-horned-rabbit-meat']);
    expect(viewOf(enterExploration()).recipes[0]?.name).toBe('Construir fogueira');
  });

  it('informa bloqueio de crafting indisponível e não executa', () => {
    const exploring = enterExploration();
    const campfire = viewOf(exploring).recipes.find((recipe) => recipe.recipeId === 'build-campfire');
    const attempt = commit(
      exploring,
      { type: 'crafting.craft', recipeId: 'build-campfire' },
      () => {
        throw new Error('não deveria persistir');
      },
    );

    expect(campfire?.craftable).toBe(false);
    expect(campfire?.blockedReason).toBe(MISSING_MATERIALS_REASON);
    expect(attempt.ok).toBe(false);
    if (attempt.ok) {
      throw new Error('esperava falha');
    }

    expect(attempt.error).toBe(MISSING_MATERIALS_REASON);
    expect(attempt.previous).toBe(exploring);
    expect(exploring.sandbox.crafting.structures).toEqual([]);
  });

  it('crafting válido atualiza inventário, estrutura e relógio', () => {
    let current = exploreTimes(enterExploration(), 3);
    current = mustCommit(current, { type: 'resource.collect', nodeId: 'fallen-sticks', units: 1 }).current;
    current = mustCommit(current, { type: 'resource.collect', nodeId: 'fallen-sticks', units: 1 }).current;
    current = mustCommit(current, { type: 'resource.collect', nodeId: 'fallen-sticks', units: 1 }).current;

    const worldBefore = { ...current.world };
    const recipe = viewOf(current).recipes.find((entry) => entry.recipeId === 'build-campfire');
    expect(recipe?.craftable).toBe(true);

    const attempt = mustCommit(current, { type: 'crafting.craft', recipeId: 'build-campfire' });
    expect(attempt.result.timeCost).toEqual({ periods: 1 });
    expect(itemQuantity(attempt.current.inventory, 'fallen-branch')).toBe(0);
    expect(attempt.current.sandbox.crafting.structures).toEqual([
      expect.objectContaining({
        structureId: 'campfire',
        locationId: 'awakening-clearing',
        active: true,
      }),
    ]);
    expect(attempt.current.world).not.toEqual(worldBefore);
    expect(attempt.feedback).toMatch(/Fogueira/);
  });

  it('não persiste estado parcial quando a ação falha', () => {
    const exploring = enterExploration();
    const persistence = createMemoryPersistence(undefined, context);
    persistence.save(exploring);
    const before = persistence.load();

    const attempt = commit(
      exploring,
      { type: 'navigation.move', locationId: 'hidden-cave' },
      (next) => persistence.save(next),
    );

    expect(attempt.ok).toBe(false);
    expect(persistence.load()).toEqual(before);
    expect(exploring.sandbox.navigation.currentLocationId).toBe('awakening-clearing');
  });

  it('continuar um save em exploração reabre a superfície mobile', () => {
    const exploring = {
      ...enterExploration(),
      flags: {
        ...enterExploration().flags,
        [worldTriggerConsumedFlag('first-priority')]: true,
      },
    };
    const progressed = mustCommit(exploreTimes(exploring, 3), {
      type: 'resource.collect',
      nodeId: 'fallen-sticks',
      units: 1,
    }).current;
    const persistence = createMemoryPersistence(undefined, context);
    persistence.save(progressed);

    const loaded = persistence.load();
    expect(loaded.status).toBe('ok');
    if (loaded.status !== 'ok') {
      throw new Error('save inválido');
    }

    const bound = bindSavedState(loaded.state, firstDayCampaign);
    expect(bound.ok).toBe(true);
    if (!bound.ok) {
      throw new Error(bound.reason);
    }

    expect(toAppScreen(bound.state)).toBe('exploration');
    expect(bound.state.world).toEqual(progressed.world);
    expect(bound.state.inventory).toEqual(progressed.inventory);
    expect(bound.state.sandbox.exploration).toEqual(progressed.sandbox.exploration);
    expect(bound.state.sandbox.navigation.currentLocationId).toBe('awakening-clearing');
    expect(resourceIds(bound.state)).toEqual(['fallen-sticks']);
    expect(viewOf(bound.state).location.progress).toBe(30);
  });

  it('narrativa e resumo continuam roteando para as telas corretas', () => {
    const narrative = playFirstDay([]);
    const exploring = enterExploration();
    const completed = {
      ...exploring,
      status: 'completed' as const,
      narrativeSession: null,
    };

    expect(resolvePlayScreen(narrative)).toBe('narrative');
    expect(toAppScreen(narrative)).toBe('game');
    expect(hasActiveNarrativeSession(narrative)).toBe(true);
    expect(resolvePlayScreen(exploring)).toBe('exploration');
    expect(toAppScreen(exploring)).toBe('exploration');
    expect(resolvePlayScreen(completed)).toBe('summary');
    expect(toAppScreen(completed)).toBe('summary');
  });
});
