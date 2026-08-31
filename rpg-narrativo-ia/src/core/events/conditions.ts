import type { GameCondition } from '../events/types';
import type { GameState } from '../state/types';

export function evaluateCondition(condition: GameCondition, state: GameState): boolean {
  switch (condition.type) {
    case 'flag.is':
      return (state.flags[condition.flag] ?? false) === condition.value;
    case 'attribute.min':
      return state.attributes[condition.attribute] >= condition.amount;
    case 'attribute.max':
      return state.attributes[condition.attribute] <= condition.amount;
    case 'inventory.has': {
      const needed = condition.quantity ?? 1;
      const item = state.inventory.find((entry) => entry.itemId === condition.itemId);
      return (item?.quantity ?? 0) >= needed;
    }
    case 'relationship.min': {
      const relation = state.relationships.find((entry) => entry.characterId === condition.characterId);
      return (relation?.trust ?? 0) >= condition.amount;
    }
  }
}

export function evaluateConditions(conditions: GameCondition[] | undefined, state: GameState): boolean {
  if (!conditions || conditions.length === 0) {
    return true;
  }

  return conditions.every((condition) => evaluateCondition(condition, state));
}
