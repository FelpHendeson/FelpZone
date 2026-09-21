import { describe, expect, it } from 'vitest';
import { SCHEMA_VERSION, type GameState } from '../core/state';
import { parseGameState, serializeGameState } from '../infrastructure/persistence';
import {
  CombatError,
  INITIAL_COMBAT,
  createCombat,
  getCombatAction,
  inspectCombatCatalog,
  listPlayerActionViews,
  resolveTurn,
} from '../modules/combat';
import {
  DEFAULT_ACTION_PHASES,
  ExecutionError,
  INITIAL_EXECUTION,
  clampPhases,
  collectExecutionModifiers,
  createInitialExecutionState,
  emptyExecutionModifiers,
  inspectExecutionCatalog,
  inspectExecutionState,
  resolveActionTiming,
} from '../modules/execution';
import { INITIAL_SKILLS } from '../modules/skills';
import { asV16, freshState } from './helpers';

function sparkDuel(knownSkillIds: string[] = []) {
  return createCombat(INITIAL_COMBAT, 'clearing-predator', {
    playerName: 'Ana',
    knownSkillIds,
    playerMaxHealth: 40,
    execution: createInitialExecutionState(),
  });
}

describe('Sistema 22 — Númen avançado e execução', () => {
  it('valida o catálogo de execução e rejeita conteúdo hostil', () => {
    expect(inspectExecutionCatalog(INITIAL_EXECUTION).ok).toBe(true);
    expect(INITIAL_EXECUTION.reserveByEnergyId.get('numen')?.max).toBe(10);
    expect(inspectExecutionCatalog({ reserves: [], limits: {}, modifierFields: [], skillModifiers: [] }).ok).toBe(false);
    expect(() => {
      throw new ExecutionError('x');
    }).toThrow(ExecutionError);
  });

  it('clampa fases para nunca produzir duração negativa ou ação gratuita', () => {
    const reduced = clampPhases(
      { prepare: 2, execute: 1, recover: 1 },
      { ...emptyExecutionModifiers(), prepare: -1 },
      INITIAL_EXECUTION.limits,
    );
    expect(reduced).toEqual({ prepare: 1, execute: 1, recover: 1 });

    const extreme = clampPhases(
      { prepare: 2, execute: 1, recover: 0 },
      { ...emptyExecutionModifiers(), prepare: -8, execute: -8, recover: -8 },
      INITIAL_EXECUTION.limits,
    );
    expect(extreme.prepare).toBe(0);
    expect(extreme.execute).toBeGreaterThanOrEqual(1);
    expect(extreme.prepare + extreme.execute + extreme.recover).toBeGreaterThanOrEqual(1);
  });

  it('Corpo Firme reduz a preparação declarada sem o React calcular o valor', () => {
    const spark = getCombatAction(INITIAL_COMBAT, 'numen-spark');
    const declared = { phases: spark.phases ?? DEFAULT_ACTION_PHASES, speed: spark.speed, cost: spark.cost, cooldown: spark.cooldown };
    const base = resolveActionTiming(declared, emptyExecutionModifiers(), INITIAL_EXECUTION.limits);
    const improved = resolveActionTiming(
      declared,
      collectExecutionModifiers(INITIAL_EXECUTION, ['steady-body']),
      INITIAL_EXECUTION.limits,
    );
    expect(base.phases.prepare).toBe(2);
    expect(improved.phases.prepare).toBe(1);
    expect(improved.readyTick).toBe(1);
  });

  it('ação física rápida resolve, enquanto a técnica de Númen pode ser interrompida na preparação', () => {
    const physical = resolveTurn(INITIAL_COMBAT, sparkDuel(), 'attack');
    expect(physical.log.some((entry) => entry.actorId === 'player' && entry.actionId === 'attack')).toBe(true);
    expect(physical.log.some((entry) => entry.text.includes('interrompida'))).toBe(false);

    const interrupted = resolveTurn(INITIAL_COMBAT, sparkDuel(), 'numen-spark');
    expect(interrupted.log.some((entry) => entry.text.includes('interrompida na preparação'))).toBe(true);
    expect(interrupted.opponent.health).toBe(interrupted.opponent.maxHealth);
    expect(interrupted.player.execution.reserves.find((entry) => entry.energyId === 'numen')?.current).toBe(6);
  });

  it('ação impossível não consome reserva nem altera o combate', () => {
    const before = sparkDuel();
    before.player.execution.reserves = [{ energyId: 'numen', current: 1 }];
    expect(() => resolveTurn(INITIAL_COMBAT, before, 'numen-spark')).toThrow(CombatError);
    expect(before.player.execution.reserves[0].current).toBe(1);
    expect(before.turn).toBe(0);
    expect(before.opponent.health).toBe(before.opponent.maxHealth);
  });

  it('é determinística e recarrega a técnica no turno seguinte', () => {
    const first = resolveTurn(INITIAL_COMBAT, sparkDuel(['steady-body']), 'numen-spark');
    const second = resolveTurn(INITIAL_COMBAT, sparkDuel(['steady-body']), 'numen-spark');
    expect(first).toEqual(second);

    const views = listPlayerActionViews(INITIAL_COMBAT, first);
    const spark = views.find((entry) => entry.action.id === 'numen-spark');
    expect(spark?.available).toBe(false);
    expect(spark?.blockedReason).toBe('A ação ainda está em recarga.');
  });

  it('a IA só escolhe ações realmente disponíveis e pessoas e criaturas usam o mesmo executor', () => {
    const catalog = inspectCombatCatalog(
      {
        actions: [
          { id: 'spark', name: 'Centelha', description: 'd', speed: 6, target: 'opponent', interruptible: true, phases: { prepare: 2, execute: 1, recover: 0 }, cost: { energyId: 'numen', amount: 4 }, effects: [{ type: 'damage', amount: 12 }] },
          { id: 'jab', name: 'Golpe', description: 'd', speed: 10, target: 'opponent', effects: [{ type: 'damage', amount: 3 }] },
        ],
        combatants: [{ id: 'rival', name: 'Rival', maxHealth: 20, actionIds: ['spark', 'jab'] }],
        encounters: [{ id: 'duel', locationId: 'awakening-clearing', opponentId: 'rival', name: 'Duelo', description: 'd', timeCost: { periods: 1 }, requiredDiscoveryIds: [] }],
      },
      INITIAL_SKILLS,
    );
    expect(catalog.ok).toBe(true);
    if (!catalog.ok) {
      return;
    }
    const combat = createCombat(catalog.value, 'duel', { playerMaxHealth: 20, playerName: 'Ana' });
    combat.opponent.execution.reserves = [{ energyId: 'numen', current: 0 }];
    const after = resolveTurn(catalog.value, combat, 'jab');
    expect(after.log.some((entry) => entry.actionId === 'spark')).toBe(false);
    expect(after.log.some((entry) => entry.actionId === 'jab')).toBe(true);
  });

  it('persiste reservas no schema 19 e migra saves v16 sem conceder party', () => {
    expect(SCHEMA_VERSION).toBe(25);
    const spent: GameState = {
      ...freshState(),
      execution: { reserves: [{ energyId: 'numen', current: 6 }], cooldowns: [{ actionId: 'numen-spark', remaining: 1 }] },
    };
    expect(inspectExecutionState(spent.execution).ok).toBe(true);
    const loaded = parseGameState(serializeGameState(spent));
    expect(loaded.status).toBe('ok');
    if (loaded.status !== 'ok') {
      return;
    }
    expect(loaded.state.schemaVersion).toBe(SCHEMA_VERSION);
    expect(loaded.state.execution.reserves[0].current).toBe(6);
    expect(loaded.state.party).toEqual({ tacticId: null, vitals: [] });

    const migrated = parseGameState(JSON.stringify(asV16(freshState())));
    expect(migrated.status).toBe('ok');
    if (migrated.status !== 'ok') {
      return;
    }
    expect(migrated.state.schemaVersion).toBe(SCHEMA_VERSION);
    expect(migrated.state.execution.reserves[0].current).toBe(10);
    expect(migrated.state.party).toEqual({ tacticId: null, vitals: [] });
  });
});
