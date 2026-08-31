import type { GameEffect } from '../events/types';
import type { GameState } from '../state/types';
import { EngineError } from '../engine/errors';
import { changeAttribute } from '../../modules/character';
import { addItem, canRemoveItem, removeItem } from '../../modules/inventory';
import { grantAbility, grantTitle } from '../../modules/progression';
import { changeRelationship } from '../../modules/relationships';
import { setPeriod } from '../../modules/world';

export function applyEffects(state: GameState, effects: GameEffect[]): GameState {
  return effects.reduce(applyEffect, state);
}

export function applyEffect(state: GameState, effect: GameEffect): GameState {
  switch (effect.type) {
    case 'attribute.change':
      assertFinite(effect.amount, `Variação inválida para o atributo ${effect.attribute}.`);
      return {
        ...state,
        attributes: changeAttribute(state.attributes, effect.attribute, effect.amount),
      };
    case 'inventory.add':
      assertPositiveInteger(effect.quantity, `Quantidade inválida para adicionar ${effect.itemId}.`);
      return {
        ...state,
        inventory: addItem(state.inventory, effect.itemId, effect.quantity),
      };
    case 'inventory.remove':
      assertPositiveInteger(effect.quantity, `Quantidade inválida para remover ${effect.itemId}.`);
      if (!canRemoveItem(state.inventory, effect.itemId, effect.quantity)) {
        throw new EngineError(`Não há ${effect.itemId} suficiente para remover ${effect.quantity}.`);
      }
      return {
        ...state,
        inventory: removeItem(state.inventory, effect.itemId, effect.quantity),
      };
    case 'relationship.change':
      assertFinite(effect.amount, `Variação inválida para a relação ${effect.characterId}.`);
      return {
        ...state,
        relationships: changeRelationship(state.relationships, effect.characterId, effect.amount),
      };
    case 'flag.set':
      if (typeof effect.value !== 'boolean') {
        throw new EngineError(`A flag ${effect.flag} precisa ser booleana.`);
      }
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

function assertFinite(value: number, message: string): void {
  if (!Number.isFinite(value)) {
    throw new EngineError(message);
  }
}

function assertPositiveInteger(value: number, message: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new EngineError(message);
  }
}
