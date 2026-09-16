import { describe, expect, it } from 'vitest';
import {
  createCombat,
  resolveTurn,
  INITIAL_COMBAT,
} from '../modules/combat';
import { INITIAL_ITEMS, createInitialItemsState } from '../modules/items';
import { assignPreparation } from '../modules/preparation';
import { buildCombatLoadout, equipItem } from '../modules/equipment';

describe('Fatias 15.4 a 15.6 — combate com condições e itens', () => {
  it('o predador aplica sangramento de forma determinística', () => {
    const first = createCombat(INITIAL_COMBAT, 'clearing-predator', { playerMaxHealth: 20, playerName: 'Ana' });
    const after = resolveTurn(INITIAL_COMBAT, first, 'attack');
    expect(after.player.conditions.some((entry) => entry.conditionId === 'bleeding')).toBe(true);
    expect(after.log.some((entry) => entry.text.includes('Sangramento') || entry.text.includes('eficaz') || entry.text.includes('Brasa'))).toBe(true);
    expect(resolveTurn(INITIAL_COMBAT, first, 'attack')).toEqual(after);
  });

  it('água é eficaz contra brasas e o loadout altera o dano', () => {
    const equipped = equipItem(INITIAL_ITEMS, createInitialItemsState(), [{ itemId: 'improvised-tool', quantity: 1 }], 'improvised-tool');
    const portrait = buildCombatLoadout(INITIAL_ITEMS, equipped.current);
    expect(portrait.loadout.modifiers.damage).toBe(2);

    const withTool = createCombat(INITIAL_COMBAT, 'clearing-predator', {
      playerMaxHealth: 20,
      loadout: portrait.loadout,
    });
    const without = createCombat(INITIAL_COMBAT, 'clearing-predator', { playerMaxHealth: 20 });
    const hitWithTool = resolveTurn(INITIAL_COMBAT, withTool, 'attack');
    const hitWithout = resolveTurn(INITIAL_COMBAT, without, 'attack');
    expect(hitWithTool.opponent.health).toBeLessThan(hitWithout.opponent.health);
  });

  it('consumível preparado cura e some da reserva do retrato', () => {
    const prepared = assignPreparation(
      INITIAL_ITEMS,
      createInitialItemsState(),
      [{ itemId: 'improvised-salve', quantity: 1 }],
      0,
      'improvised-salve',
    );
    const portrait = buildCombatLoadout(INITIAL_ITEMS, prepared.current);
    const combat = createCombat(INITIAL_COMBAT, 'clearing-predator', {
      playerMaxHealth: 12,
      prepared: portrait.prepared,
      loadout: portrait.loadout,
    });
    const after = resolveTurn(INITIAL_COMBAT, combat, 'prepared:0');
    expect(after.usedPrepared).toEqual([{ slot: 0, itemId: 'improvised-salve' }]);
    expect(after.prepared).toEqual([]);
    expect(after.player.actionIds).not.toContain('prepared:0');
  });
});
