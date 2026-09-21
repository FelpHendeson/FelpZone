import { describe, expect, it } from 'vitest';
import { firstDayCampaign } from '../campaigns/first-day';
import { applyChoice } from '../core/engine';
import { createMemoryPersistence, parseGameState, serializeGameState } from '../infrastructure/persistence';
import {
  INITIAL_OBJECTIVES,
  getObjectiveStatus,
  indexObjectiveCatalog,
  listKnownObjectives,
} from '../modules/objectives';
import { createSandboxContext } from '../modules/sandbox';
import { executeSandboxAction, type SandboxAction } from '../modules/sandbox-actions';
import { buildJournalView } from '../ui/journal';
import { freshState, playFirstDay } from './helpers';

const context = createSandboxContext();

function progressFor(state: ReturnType<typeof freshState>) {
  return state.objectives.entries.find((entry) => entry.objectiveId === 'first-steps');
}

describe('Fatia E — jornada principal do primeiro dia', () => {
  it.each(['ability-perception', 'ability-resilience', 'ability-empathy'])(
    'ativa a mesma jornada ao escolher %s',
    (abilityChoice) => {
      let state = freshState();
      state = applyChoice(state, firstDayCampaign, 'awake-calm');
      state = applyChoice(state, firstDayCampaign, 'system-touch');

      expect(state.objectives.entries).toEqual([]);

      state = applyChoice(state, firstDayCampaign, abilityChoice);

      expect(listKnownObjectives(INITIAL_OBJECTIVES, state.objectives)).toHaveLength(1);
      expect(progressFor(state)).toEqual({
        objectiveId: 'first-steps',
        completedStepIds: ['choose-ability'],
        completed: false,
      });
    },
  );

  it('conclui a jornada com treino, água e sinais sem exigir fogo, refeição ou Mira', () => {
    const persistence = createMemoryPersistence(undefined, context);
    let state = playFirstDay(['awake-calm', 'system-touch', 'ability-perception']);

    function act(action: SandboxAction): ReturnType<typeof executeSandboxAction> {
      const result = executeSandboxAction(state, action, { context, campaign: firstDayCampaign });
      persistence.save(result.current);
      const loaded = persistence.load();
      expect(loaded.status).toBe('ok');
      if (loaded.status !== 'ok') {
        throw new Error('A jornada não foi persistida corretamente.');
      }
      state = loaded.state;
      return result;
    }

    expect(progressFor(state)?.completedStepIds).toEqual(['choose-ability']);

    act({ type: 'training.train', methodId: 'focused-perception-drill' });
    expect(progressFor(state)?.completedStepIds).toEqual([
      'choose-ability',
      'first-numen-practice',
    ]);

    act({ type: 'exploration.explore' });
    act({ type: 'exploration.explore' });
    expect(progressFor(state)?.completedStepIds).toEqual([
      'choose-ability',
      'first-numen-practice',
      'explore-awakening-clearing',
    ]);

    act({ type: 'navigation.move', locationId: 'spring-lake' });
    act({ type: 'exploration.explore' });

    expect(progressFor(state)?.completedStepIds).toEqual([
      'choose-ability',
      'first-numen-practice',
      'explore-awakening-clearing',
      'secure-water',
      'investigate-signs',
    ]);
    expect(getObjectiveStatus(INITIAL_OBJECTIVES, state.objectives, 'first-steps')).toBe('completed');
    expect(state.sandbox.presences.discoveredPresenceIds).not.toContain('mira-awakening-clearing');
    expect(state.sandbox.crafting.activeStructures).toEqual([]);
    expect(state.inventory.some((entry) => entry.itemId === 'cooked-horned-rabbit-meat')).toBe(false);

    const journal = buildJournalView(state, context);
    const main = journal.journeys.find((journey) => journey.id === 'first-steps');
    expect(main?.title).toBe('Primeiro dia');
    expect(main?.status).toBe('completed');
    expect(() => executeSandboxAction(state, { type: 'exploration.explore' }, { context })).not.toThrow();
  });

  it('mantém fogueira e refeição em uma jornada lateral separada', () => {
    let state = playFirstDay(['awake-calm', 'system-touch', 'ability-perception']);
    state = executeSandboxAction(
      state,
      { type: 'training.train', methodId: 'focused-perception-drill' },
      { context, campaign: firstDayCampaign },
    ).current;

    for (let count = 0; count < 3; count += 1) {
      state = executeSandboxAction(
        state,
        { type: 'exploration.explore' },
        { context, campaign: firstDayCampaign },
      ).current;
    }

    expect(listKnownObjectives(INITIAL_OBJECTIVES, state.objectives).map((objective) => objective.id)).toContain(
      'camp-comfort',
    );
    expect(getObjectiveStatus(INITIAL_OBJECTIVES, state.objectives, 'camp-comfort')).toBe('active');
    expect(progressFor(state)?.completedStepIds).not.toContain('build-campfire');
    expect(progressFor(state)?.completedStepIds).not.toContain('prepare-meal');
  });

  it('reconcilia um save schema 6 criado quando o catálogo inicial estava vazio', () => {
    const emptyCatalog = indexObjectiveCatalog({ objectives: [] });
    const legacyContentState = playFirstDay(['awake-calm', 'system-touch', 'ability-resilience']);
    const withoutJourney = { ...legacyContentState, objectives: { entries: [] } };
    const raw = serializeGameState(withoutJourney, context, emptyCatalog);

    const loaded = parseGameState(raw, context);

    expect(loaded.status).toBe('ok');
    if (loaded.status === 'ok') {
      expect(progressFor(loaded.state)).toEqual({
        objectiveId: 'first-steps',
        completedStepIds: ['choose-ability'],
        completed: false,
      });
    }
  });

  it('mantém sincronizações repetidas idempotentes depois da conclusão', () => {
    const completed = {
      ...playFirstDay(['awake-calm', 'system-touch', 'ability-empathy']),
      objectives: {
        entries: [{
          objectiveId: 'first-steps',
          completedStepIds: INITIAL_OBJECTIVES.objectives[0].steps.map((step) => step.id),
          completed: true,
        }],
      },
    };

    const firstLoad = parseGameState(serializeGameState(completed, context), context);
    expect(firstLoad).toEqual({ status: 'ok', state: completed });
    if (firstLoad.status === 'ok') {
      expect(parseGameState(serializeGameState(firstLoad.state, context), context)).toEqual(firstLoad);
    }
  });
});
