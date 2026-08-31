import type { GameEffect } from '../events/types';
import type { GameState } from '../state/types';
import { changeAttribute } from '../../modules/character';
import { addItem, removeItem } from '../../modules/inventory';
import { grantAbility, grantTitle } from '../../modules/progression';
import { changeRelationship } from '../../modules/relationships';
import { setPeriod } from '../../modules/world';

export function applyEffects(state: GameState, effects: GameEffect[]): GameState {
  return effects.reduce(applyEffect, state);
}

export function applyEffect(state: GameState, effect: GameEffect): GameState {
  switch (effect.type) {
    case 'attribute.change':
      return {
        ...state,
        attributes: changeAttribute(state.attributes, effect.attribute, effect.amount),
      };
    case 'inventory.add':
      return {
        ...state,
        inventory: addItem(state.inventory, effect.itemId, effect.quantity),
      };
    case 'inventory.remove':
      return {
        ...state,
        inventory: removeItem(state.inventory, effect.itemId, effect.quantity),
      };
    case 'relationship.change':
      return {
        ...state,
        relationships: changeRelationship(state.relationships, effect.characterId, effect.amount),
      };
    case 'flag.set':
      return {
        ...state,
        flags: {
          ...state.flags,
          [effect.flag]: effect.value,
        },
      };
    case 'world.period':
      return {
        ...state,
        world: setPeriod(state.world, effect.period),
      };
    case 'progression.ability':
      return {
        ...state,
        progression: grantAbility(state.progression, effect.abilityId),
      };
    case 'progression.title':
      return {
        ...state,
        progression: grantTitle(state.progression, effect.titleId),
      };
    case 'game.complete':
      return {
        ...state,
        status: 'completed',
      };
  }
}
