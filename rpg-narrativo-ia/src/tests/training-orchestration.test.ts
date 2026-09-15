import { describe, expect, it } from 'vitest';
import { type GameState } from '../core/state';
import { parseGameState, serializeGameState } from '../infrastructure/persistence';
import { getSkillProficiency, isSkillKnown } from '../modules/skills';
import { executeSandboxAction, SandboxActionError } from '../modules/sandbox-actions';
import { freshState, now } from './helpers';

function exploring(): GameState {
  return { ...freshState(), narrativeSession: null };
}

describe('Fatia 11.3 — ação integrada de treino', () => {
  it('treina uma habilidade conhecida aplicando o custo temporal uma única vez', () => {
    const before = exploring();
    const result = executeSandboxAction(
      before,
      { type: 'training.train', methodId: 'focused-perception-drill' },
      { now },
    );

    expect(result.detail.type).toBe('training.train');
    expect(result.timeCost.periods).toBe(1);
    expect(result.needsWear.periodsApplied).toBe(1);
    expect(getSkillProficiency(result.current.system, 'sharpened-senses')).toBe(1);
    expect(getSkillProficiency(before.system, 'sharpened-senses')).toBe(0);
    expect(result.current.world).not.toEqual(before.world);
  });

  it('treina um caminho conhecido revelando uma nova habilidade e cobrando os períodos declarados', () => {
    const before = exploring();
    const result = executeSandboxAction(
      before,
      { type: 'training.train', methodId: 'body-reinforcement-routine' },
      { now },
    );

    expect(result.timeCost.periods).toBe(2);
    expect(result.needsWear.periodsApplied).toBe(2);
    expect(isSkillKnown(result.current.system, 'steady-body')).toBe(true);
    expect(isSkillKnown(before.system, 'steady-body')).toBe(false);
  });

  it('recusa repetir um treino de revelação sem cobrar tempo nem desgastar necessidades', () => {
    const learned = executeSandboxAction(
      exploring(),
      { type: 'training.train', methodId: 'body-reinforcement-routine' },
      { now },
    ).current;
    const snapshot = JSON.stringify(learned);

    expect(() =>
      executeSandboxAction(
        learned,
        { type: 'training.train', methodId: 'body-reinforcement-routine' },
        { now },
      ),
    ).toThrow(SandboxActionError);
    expect(JSON.stringify(learned)).toBe(snapshot);
  });

  it('persiste o progresso obtido no treino', () => {
    const before = exploring();
    const trained = executeSandboxAction(
      before,
      { type: 'training.train', methodId: 'focused-perception-drill' },
      { now },
    ).current;

    const loaded = parseGameState(serializeGameState(trained));
    expect(loaded.status).toBe('ok');
    if (loaded.status === 'ok') {
      expect(getSkillProficiency(loaded.state.system, 'sharpened-senses')).toBe(1);
    }
  });

  it('recusa um método de treino inexistente', () => {
    expect(() =>
      executeSandboxAction(exploring(), { type: 'training.train', methodId: 'missing-method' }, { now }),
    ).toThrow(SandboxActionError);
  });
});
