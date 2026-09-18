import { describe, expect, it } from 'vitest';
import { INITIAL_SKILLS } from '../modules/skills';
import {
  chooseOpponentAction,
  emptyCombatLoadout,
  indexCombatCatalog,
  type CombatState,
  type IndexedCombat,
} from '../modules/combat';
import { createInitialExecutionState } from '../modules/execution';

function catalog(): IndexedCombat {
  return indexCombatCatalog(
    {
      actions: [
        { id: 'bite', name: 'Mordida', description: 'd', speed: 10, target: 'opponent', effects: [{ type: 'damage', amount: 4 }] },
        { id: 'maul', name: 'Dilacerar', description: 'd', speed: 8, target: 'opponent', effects: [{ type: 'damage', amount: 7 }] },
        { id: 'lick-wounds', name: 'Lamber feridas', description: 'd', speed: 12, target: 'self', effects: [{ type: 'heal', amount: 5 }] },
        { id: 'brace', name: 'Firmar', description: 'd', speed: 14, target: 'self', effects: [{ type: 'guard', amount: 5 }] },
      ],
      combatants: [{ id: 'beast', name: 'Fera', maxHealth: 20, actionIds: ['bite'] }],
      encounters: [
        { id: 'enc', locationId: 'l', opponentId: 'beast', name: 'Fera', description: 'd', timeCost: { periods: 1 }, requiredDiscoveryIds: [] },
      ],
    },
    INITIAL_SKILLS,
  );
}

function state(opponentActionIds: string[], health: number, maxHealth = 20): CombatState {
  const execution = createInitialExecutionState();
  return {
    encounterId: 'enc',
    turn: 0,
    player: {
      id: 'player',
      name: 'Ana',
      maxHealth: 20,
      health: 20,
      guard: 0,
      actionIds: ['attack'],
      conditions: [],
      execution,
    },
    opponent: {
      id: 'beast',
      name: 'Fera',
      maxHealth,
      health,
      guard: 0,
      actionIds: opponentActionIds,
      conditions: [],
      execution: createInitialExecutionState(),
    },
    log: [],
    outcome: 'ongoing',
    loadout: emptyCombatLoadout(),
    prepared: [],
    usedPrepared: [],
    entryExecution: execution,
    knownSkillIds: [],
    allies: [],
    foes: [],
    companionOrderLog: [],
  };
}

describe('Fatia 12.3 — IA determinística do oponente', () => {
  it('escolhe o maior dano com vida saudável', () => {
    expect(chooseOpponentAction(catalog(), state(['bite', 'maul', 'brace'], 20))).toBe('maul');
  });

  it('cura-se quando muito ferido e há cura disponível', () => {
    expect(chooseOpponentAction(catalog(), state(['maul', 'lick-wounds'], 6))).toBe('lick-wounds');
  });

  it('ataca mesmo ferido quando não há cura', () => {
    expect(chooseOpponentAction(catalog(), state(['bite', 'maul'], 4))).toBe('maul');
  });

  it('recorre à defesa quando não há dano nem cura', () => {
    expect(chooseOpponentAction(catalog(), state(['brace'], 20))).toBe('brace');
  });

  it('é determinística para a mesma entrada', () => {
    const s = state(['bite', 'maul', 'lick-wounds'], 5);
    expect(chooseOpponentAction(catalog(), s)).toBe(chooseOpponentAction(catalog(), s));
  });
});
