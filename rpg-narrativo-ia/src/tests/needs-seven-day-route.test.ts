import { describe, expect, it } from 'vitest';
import { createMemoryPersistence } from '../infrastructure/persistence';
import { itemQuantity } from '../modules/inventory';
import { getPopulation } from '../modules/resources';
import { createSandboxContext } from '../modules/sandbox';
import { executeSandboxAction, type SandboxAction } from '../modules/sandbox-actions';
import { playFirstDay } from './helpers';

const context = createSandboxContext();

describe('Fatia 9.5 — sobrevivência ponta a ponta', () => {
  it('sustenta sete dias somente com os sistemas e o conteúdo já existentes', () => {
    const persistence = createMemoryPersistence(undefined, context);
    let current = playFirstDay(['awake-calm', 'system-touch', 'ability-perception']);
    const executedActions: SandboxAction[] = [];

    function act(action: SandboxAction): void {
      const result = executeSandboxAction(current, action, { context });
      persistence.save(result.current);
      const loaded = persistence.load();
      expect(loaded.status).toBe('ok');
      if (loaded.status !== 'ok') {
        throw new Error('A ação não foi persistida corretamente.');
      }

      current = loaded.state;
      executedActions.push(action);
    }

    for (let count = 0; count < 6; count += 1) {
      act({ type: 'exploration.explore' });
    }

    act({ type: 'resource.collect', nodeId: 'fallen-sticks', units: 2 });
    act({ type: 'resource.collect', nodeId: 'fallen-sticks', units: 1 });
    act({ type: 'crafting.craft', recipeId: 'build-campfire' });

    act({ type: 'navigation.move', locationId: 'spring-lake' });
    for (let count = 0; count < 3; count += 1) {
      act({ type: 'exploration.explore' });
    }

    act({ type: 'navigation.move', locationId: 'dense-woods' });
    for (let count = 0; count < 4; count += 1) {
      act({ type: 'exploration.explore' });
    }

    act({ type: 'navigation.move', locationId: 'awakening-clearing' });
    const survivalStartDay = current.world.day;
    let rabbitsCollected = 0;

    for (let cycle = 0; cycle < 7; cycle += 1) {
      act({ type: 'navigation.move', locationId: 'spring-lake' });
      act({ type: 'resource.collect', nodeId: 'spring', units: 1 });
      act({ type: 'needs.consume', itemId: 'raw-water' });

      act({ type: 'navigation.move', locationId: 'dense-woods' });
      act({ type: 'resource.collect', nodeId: 'horned-rabbit-warren', units: 1 });
      rabbitsCollected += 1;

      act({ type: 'navigation.move', locationId: 'awakening-clearing' });
      act({ type: 'crafting.craft', recipeId: 'cook-horned-rabbit-meat' });
      act({ type: 'needs.consume', itemId: 'cooked-horned-rabbit-meat' });
      act({ type: 'needs.rest', mode: 'campfire' });

      const population = getPopulation(current.sandbox.resources, 'horned-rabbits');
      expect(population.locallyExtinct).toBe(false);
      expect(population.current).toBeGreaterThan(0);
      expect(current.attributes.saude).toBeGreaterThan(1);
    }

    const daysSurvived = current.world.day - survivalStartDay;
    const finalPopulation = getPopulation(current.sandbox.resources, 'horned-rabbits');

    expect(daysSurvived).toBe(7);
    expect(rabbitsCollected / daysSurvived).toBeLessThanOrEqual(2);
    expect(finalPopulation.locallyExtinct).toBe(false);
    expect(current.attributes).toMatchObject({ saude: 100, energia: 96, fome: 6, sede: 25 });
    expect(current.attributes.saude).toBeGreaterThan(1);
    expect(current.attributes.fome).toBeLessThan(100);
    expect(current.attributes.sede).toBeLessThan(100);
    expect(itemQuantity(current.inventory, 'raw-water')).toBe(0);
    expect(itemQuantity(current.inventory, 'raw-horned-rabbit-meat')).toBe(0);
    expect(itemQuantity(current.inventory, 'cooked-horned-rabbit-meat')).toBe(0);
    expect(executedActions.some((action) => action.type === 'presence.interact')).toBe(false);

    expect(() => executeSandboxAction(current, { type: 'needs.rest', mode: 'simple' }, { context })).not.toThrow();
  }, 15_000);
});
