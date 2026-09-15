import { describe, expect, it } from 'vitest';
import { type GameState } from '../core/state';
import { parseGameState, serializeGameState } from '../infrastructure/persistence';
import { getSkillProficiency, isSkillKnown } from '../modules/skills';
import { executeSandboxAction } from '../modules/sandbox-actions';
import { buildSystemStatus } from '../modules/system-interface';
import { freshState, now } from './helpers';

function exploring(): GameState {
  return { ...freshState(), narrativeSession: null };
}

describe('Fatia 11.6 — ciclo de fortalecimento ponta a ponta', () => {
  it('consulta o Sistema, treina, avança o tempo, evolui e persiste a consequência', () => {
    const start = exploring();

    // 1. Consultar o Sistema
    const statusBefore = buildSystemStatus(start);
    expect(statusBefore.knownSkills[0].proficiency).toBe(0);
    const drill = statusBefore.trainings.find((training) => training.methodId === 'focused-perception-drill');
    expect(drill?.canTrain).toBe(true);

    // 2. Treinar (o custo temporal é cobrado uma vez)
    const trained = executeSandboxAction(
      start,
      { type: 'training.train', methodId: 'focused-perception-drill' },
      { now },
    );
    expect(trained.timeCost.periods).toBe(1);
    expect(trained.needsWear.periodsApplied).toBe(1);
    expect(trained.current.world).not.toEqual(start.world);
    expect(getSkillProficiency(trained.current.system, 'sharpened-senses')).toBe(1);

    // 3. Persistir e recarregar mantém o progresso
    const reloaded = parseGameState(serializeGameState(trained.current));
    expect(reloaded.status).toBe('ok');
    if (reloaded.status !== 'ok') {
      return;
    }
    expect(getSkillProficiency(reloaded.state.system, 'sharpened-senses')).toBe(1);

    // 4. Treinar até proficiência 3 alcança o nível 2 (marco)
    let leveled = reloaded.state;
    for (let i = 0; i < 2; i += 1) {
      leveled = executeSandboxAction(leveled, { type: 'training.train', methodId: 'focused-perception-drill' }, { now }).current;
    }
    expect(getSkillProficiency(leveled.system, 'sharpened-senses')).toBe(3);
    expect(leveled.system.level).toBe(2);

    // 5. Com o nível 2, a Rotina de Reforço revela uma habilidade e um caminho antes ocultos
    const revealed = executeSandboxAction(
      leveled,
      { type: 'training.train', methodId: 'body-reinforcement-routine' },
      { now },
    ).current;
    expect(isSkillKnown(revealed.system, 'steady-body')).toBe(true);

    const statusAfter = buildSystemStatus(revealed);
    expect(statusAfter.tree.paths.map((path) => path.pathId)).toContain('numen-manifestation');
    expect(statusBefore.tree.paths.map((path) => path.pathId)).not.toContain('numen-manifestation');
  });
});
