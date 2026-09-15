import { describe, expect, it } from 'vitest';
import { buildSystemStatus } from '../modules/system-interface';
import { executeSandboxAction } from '../modules/sandbox-actions';
import { type GameState } from '../core/state';
import { freshState, now } from './helpers';

function exploring(): GameState {
  return { ...freshState(), narrativeSession: null };
}

describe('Fatia 11.5 — Status diegético derivado', () => {
  it('deriva nível, fundamentos, habilidades, árvore e treinos conhecidos', () => {
    const status = buildSystemStatus(exploring());

    expect(status.level).toBe(1);
    expect(status.energies.map((energy) => energy.id)).toEqual(['eteris', 'numen']);
    expect(status.fields.map((field) => field.id)).toEqual(['corpo', 'poder']);

    expect(status.knownSkills).toEqual([
      expect.objectContaining({
        skillId: 'sharpened-senses',
        proficiency: 0,
        pathName: 'Reforço do Corpo',
        field: 'corpo',
      }),
    ]);

    expect(status.tree.paths.map((path) => path.pathId)).toEqual(['body-reinforcement']);

    const methods = status.trainings.map((training) => training.methodId);
    expect(methods).toContain('focused-perception-drill');
    // A Rotina de Reforço exige nível 2 (marco) e permanece oculta no início.
    expect(methods).not.toContain('body-reinforcement-routine');
    const drill = status.trainings.find((training) => training.methodId === 'focused-perception-drill');
    expect(drill?.canTrain).toBe(true);
    expect(drill?.costPeriods).toBe(1);
    expect(drill?.effectsSummary).toEqual(['Aprofunda Sentidos Aguçados (+1)']);
  });

  it('revela e conclui a Rotina após o marco de nível 2, revelando novos caminhos', () => {
    let state = exploring();
    for (let i = 0; i < 3; i += 1) {
      state = executeSandboxAction(state, { type: 'training.train', methodId: 'focused-perception-drill' }, { now }).current;
    }
    // Com nível 2, a Rotina fica visível e treinável.
    const revealedStatus = buildSystemStatus(state);
    expect(revealedStatus.level).toBe(2);
    expect(revealedStatus.trainings.find((training) => training.methodId === 'body-reinforcement-routine')?.canTrain).toBe(true);

    const trained = executeSandboxAction(
      state,
      { type: 'training.train', methodId: 'body-reinforcement-routine' },
      { now },
    ).current;
    const status = buildSystemStatus(trained);

    expect(status.knownSkills.map((skill) => skill.skillId)).toContain('steady-body');
    expect(status.trainings.find((training) => training.methodId === 'body-reinforcement-routine')).toEqual(
      expect.objectContaining({
        canTrain: false,
        blockedReason: 'Este método de treinamento já foi concluído.',
      }),
    );
    // aprender Corpo Firme cumpre o requisito da Fagulha Condutora, revelando o caminho de Númen
    expect(status.tree.paths.map((path) => path.pathId)).toContain('numen-manifestation');
  });

  it('não vaza habilidades ainda ocultas no Status inicial', () => {
    const serialized = JSON.stringify(buildSystemStatus(exploring()));
    expect(serialized).not.toContain('Fagulha Condutora');
  });
});
