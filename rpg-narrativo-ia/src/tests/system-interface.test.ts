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
    expect(methods).toContain('body-reinforcement-routine');
    const drill = status.trainings.find((training) => training.methodId === 'focused-perception-drill');
    expect(drill?.canTrain).toBe(true);
    expect(drill?.costPeriods).toBe(1);
    expect(drill?.effectsSummary).toEqual(['Aprofunda Sentidos Aguçados (+1)']);
  });

  it('reflete o progresso do treino, revelando novos caminhos e proficiência', () => {
    const trained = executeSandboxAction(
      exploring(),
      { type: 'training.train', methodId: 'body-reinforcement-routine' },
      { now },
    ).current;
    const status = buildSystemStatus(trained);

    expect(status.knownSkills.map((skill) => skill.skillId)).toContain('steady-body');
    // aprender Corpo Firme cumpre o requisito da Fagulha Condutora, revelando o caminho de Númen
    expect(status.tree.paths.map((path) => path.pathId)).toContain('numen-manifestation');
  });

  it('não vaza habilidades ainda ocultas no Status inicial', () => {
    const serialized = JSON.stringify(buildSystemStatus(exploring()));
    expect(serialized).not.toContain('Fagulha Condutora');
  });
});
