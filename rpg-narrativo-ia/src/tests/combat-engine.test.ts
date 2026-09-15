import { describe, expect, it } from 'vitest';
import { INITIAL_SKILLS } from '../modules/skills';
import {
  CombatError,
  FLEE_ACTION_ID,
  createCombat,
  indexCombatCatalog,
  listPlayerActions,
  resolveTurn,
  type CombatCatalog,
  type CombatState,
  type IndexedCombat,
} from '../modules/combat';

function catalog(): IndexedCombat {
  const data: CombatCatalog = {
    actions: [
      { id: 'attack', name: 'Golpe', description: 'd', speed: 10, target: 'opponent', effects: [{ type: 'damage', amount: 5 }] },
      { id: 'guard', name: 'Defesa', description: 'd', speed: 14, target: 'self', effects: [{ type: 'guard', amount: 6 }] },
      { id: 'precise', name: 'Preciso', description: 'd', speed: 8, target: 'opponent', effects: [{ type: 'damage', amount: 9 }], skillId: 'sharpened-senses' },
    ],
    combatants: [{ id: 'beast', name: 'Fera', maxHealth: 12, actionIds: ['attack'] }],
    encounters: [
      { id: 'enc', locationId: 'clearing', opponentId: 'beast', name: 'Fera', description: 'd', timeCost: { periods: 1 }, requiredDiscoveryIds: [] },
    ],
  };
  return indexCombatCatalog(data, INITIAL_SKILLS);
}

function start(overrides: { knownSkillIds?: string[] } = {}): CombatState {
  return createCombat(catalog(), 'enc', { playerName: 'Ana', playerMaxHealth: 20, knownSkillIds: overrides.knownSkillIds ?? [] });
}

describe('Fatia 12.2 — motor de combate', () => {
  it('rejeita vitalidade inicial inválida', () => {
    expect(() => createCombat(catalog(), 'enc', { playerMaxHealth: 0 })).toThrow(CombatError);
    expect(() => createCombat(catalog(), 'enc', { playerMaxHealth: Number.NaN })).toThrow(CombatError);
  });

  it('cria o estado inicial com vida cheia e ações base', () => {
    const state = start();
    expect(state.outcome).toBe('ongoing');
    expect(state.player.health).toBe(20);
    expect(state.opponent.health).toBe(12);
    expect(listPlayerActions(catalog(), state).map((a) => a.id)).toEqual(['attack', 'guard']);
  });

  it('libera ações ligadas a habilidades conhecidas do Sistema 11', () => {
    const withSkill = createCombat(catalog(), 'enc', { knownSkillIds: ['sharpened-senses'], playerMaxHealth: 20 });
    expect(withSkill.player.actionIds).toContain('precise');
    const withoutSkill = start();
    expect(withoutSkill.player.actionIds).not.toContain('precise');
  });

  it('resolve o turno por velocidade e aplica dano, sem mutar o estado anterior', () => {
    const before = start();
    const after = resolveTurn(catalog(), before, 'attack');

    // guarda do oponente (speed 14) não existe; oponente só tem attack (speed 10) vs jogador attack (speed 10) -> empate, jogador primeiro
    expect(after.turn).toBe(1);
    expect(after.opponent.health).toBe(7); // 12 - 5
    expect(after.player.health).toBe(15); // 20 - 5
    expect(before.opponent.health).toBe(12);
    expect(after.log.length).toBeGreaterThanOrEqual(2);
  });

  it('o escudo absorve dano recebido', () => {
    const before = start();
    const guarded = resolveTurn(catalog(), before, 'guard');
    // jogador defende (escudo 6, speed 14 primeiro), oponente ataca 5 -> absorvido, vida intacta
    expect(guarded.player.health).toBe(20);
    expect(guarded.player.guard).toBe(1); // 6 - 5 absorvido
  });

  it('permite fugir encerrando o combate', () => {
    const fled = resolveTurn(catalog(), start(), FLEE_ACTION_ID);
    expect(fled.outcome).toBe('fled');
    expect(fled.opponent.health).toBe(12);
  });

  it('conduz até a vitória quando o oponente cai', () => {
    let state = start();
    let guardTurns = 0;
    while (state.outcome === 'ongoing' && guardTurns < 10) {
      state = resolveTurn(catalog(), state, 'attack');
      guardTurns += 1;
    }
    expect(state.outcome).toBe('victory');
    expect(state.opponent.health).toBe(0);
  });

  it('rejeita ação indisponível e turno após o fim', () => {
    const state = start();
    expect(() => resolveTurn(catalog(), state, 'precise')).toThrow(CombatError);
    const fled = resolveTurn(catalog(), state, FLEE_ACTION_ID);
    expect(() => resolveTurn(catalog(), fled, 'attack')).toThrow(CombatError);
  });

  it('é determinístico: mesma entrada, mesmo resultado', () => {
    const a = resolveTurn(catalog(), start(), 'attack');
    const b = resolveTurn(catalog(), start(), 'attack');
    expect(a).toEqual(b);
  });
});
