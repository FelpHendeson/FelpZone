import { describe, expect, it } from 'vitest';
import { buildSystemStatus } from '../modules/system-interface';
import { executeSandboxAction } from '../modules/sandbox-actions';
import { type GameState } from '../core/state';
import { startGame } from '../core/engine';
import { loadFirstDayWorld } from '../modules/content';
import { createSandboxContextFromWorld } from '../modules/sandbox';
import { indexExecutionCatalog } from '../modules/execution';
import { indexRegistryCatalog } from '../modules/registry';
import { indexEconomyCatalog } from '../modules/economy';
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

  it('inicializa e exibe os catálogos do pack ativo, sem recorrer ao first-day global', () => {
    const world = loadFirstDayWorld();
    const execution = indexExecutionCatalog({
      reserves: world.execution.reserves.map((reserve) => ({ ...reserve, max: 37 })),
      limits: { ...world.execution.limits },
      modifierFields: [...world.execution.modifierFields],
      skillModifiers: world.execution.skillModifiers.map((modifier) => ({ ...modifier })),
    });
    const registry = indexRegistryCatalog({
      policy: { kind: 'restriction', eligibleSpecies: ['human'] },
      rankings: world.registry.rankings,
      patents: world.registry.patents,
    });
    const economy = indexEconomyCatalog({
      currencies: world.economy.currencies,
      properties: world.economy.properties,
      offers: world.economy.offers.map((offer) =>
        offer.id === 'buy-improvised-tool' ? { ...offer, stock: 4 } : offer,
      ),
      npcDecisions: world.economy.npcDecisions,
      actions: world.economy.actions,
    });
    const customWorld = { ...world, execution, registry, economy };
    const context = createSandboxContextFromWorld(customWorld);
    const state = startGame(
      { firstName: 'Lia', lastName: 'Nunes' },
      customWorld.campaign,
      now,
      context,
      customWorld.objectives,
    );
    const status = buildSystemStatus(state, context);

    expect(state.execution.reserves).toEqual([{ energyId: 'numen', current: 37 }]);
    expect(state.registry.accessGranted).toBe(false);
    expect(state.economy.stocks.find((stock) => stock.offerId === 'buy-improvised-tool')?.remaining).toBe(4);
    expect(status.execution.reserves).toEqual([
      expect.objectContaining({ energyId: 'numen', current: 37, max: 37 }),
    ]);
    expect(status.registry.accessGranted).toBe(false);
  });
});
