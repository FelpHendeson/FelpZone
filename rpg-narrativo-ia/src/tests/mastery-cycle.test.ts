import { describe, expect, it } from 'vitest';
import { type GameState } from '../core/state';
import { parseGameState, serializeGameState } from '../infrastructure/persistence';
import {
  INITIAL_COMBAT,
  buildCombatResolution,
  createCombat,
  getEncounter,
  listPlayerActions,
  resolveTurn,
  type CombatState,
} from '../modules/combat';
import { getSkillProficiency, isSkillKnown } from '../modules/skills';
import { buildSystemStatus } from '../modules/system-interface';
import { executeSandboxAction, type SandboxAction } from '../modules/sandbox-actions';
import { freshState, now } from './helpers';

function exploring(): GameState {
  return { ...freshState(), narrativeSession: null };
}

function reload(state: GameState): GameState {
  const loaded = parseGameState(serializeGameState(state));
  if (loaded.status !== 'ok') {
    throw new Error(`save inválido: ${loaded.status}`);
  }
  return loaded.state;
}

function winWithFocusStrike(state: GameState): SandboxAction {
  let combat: CombatState = createCombat(INITIAL_COMBAT, 'clearing-predator', {
    knownSkillIds: state.system.entries.map((entry) => entry.skillId),
    playerMaxHealth: state.attributes.saude,
  });
  let safety = 0;
  while (combat.outcome === 'ongoing' && safety < 60) {
    combat = resolveTurn(INITIAL_COMBAT, combat, 'focus-strike');
    safety += 1;
  }
  return { type: 'combat.resolve', resolution: buildCombatResolution(combat, getEncounter(INITIAL_COMBAT, 'clearing-predator')) };
}

describe('Fatia 13.6 — ciclo jogável de progressão ponta a ponta', () => {
  it('prática + treino → proficiência → nível → método → habilidade → nova ação, com save/reload', () => {
    let state = exploring();

    // Explorar até revelar a ameaça.
    for (let i = 0; i < 3; i += 1) {
      state = executeSandboxAction(state, { type: 'exploration.explore' }, { now }).current;
    }

    // Vencer o confronto praticando Sentidos Aguçados (+1) e recarregar.
    const win = executeSandboxAction(state, winWithFocusStrike(state), { now });
    state = reload(win.current);
    expect(getSkillProficiency(state.system, 'sharpened-senses')).toBe(1);

    // Treinar até proficiência 3 → nível 2 (marco), com save/reload.
    for (let i = 0; i < 2; i += 1) {
      state = reload(executeSandboxAction(state, { type: 'training.train', methodId: 'focused-perception-drill' }, { now }).current);
    }
    expect(getSkillProficiency(state.system, 'sharpened-senses')).toBe(3);
    expect(state.system.level).toBe(2);
    expect(buildSystemStatus(state).nextMilestone).toBeNull();

    // O nível 2 revela a Rotina de Reforço; treiná-la ensina Corpo Firme.
    const routine = buildSystemStatus(state).trainings.find((training) => training.methodId === 'body-reinforcement-routine');
    expect(routine?.canTrain).toBe(true);
    state = reload(executeSandboxAction(state, { type: 'training.train', methodId: 'body-reinforcement-routine' }, { now }).current);
    expect(isSkillKnown(state.system, 'steady-body')).toBe(true);

    // Conhecer Corpo Firme libera a ação de combate Estancar Ferida (skillId steady-body).
    const combat = createCombat(INITIAL_COMBAT, 'clearing-predator', {
      knownSkillIds: state.system.entries.map((entry) => entry.skillId),
      playerMaxHealth: state.attributes.saude,
    });
    expect(listPlayerActions(INITIAL_COMBAT, combat).map((action) => action.id)).toContain('mend');

    // O schema não muda em todo o ciclo.
    expect(state.schemaVersion).toBe(7);
  });
});
